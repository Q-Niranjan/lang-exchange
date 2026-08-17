package payment

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"

	"lang-exchange/config"
	"lang-exchange/internal/httputil"
	"lang-exchange/internal/user"
)

type Service struct {
	cfg     config.PaymentConfig
	repo    *Repository
	users   *user.Repository
	gateway Gateway
}

func NewService(cfg config.PaymentConfig, repo *Repository, users *user.Repository, gateway Gateway) *Service {
	return &Service{cfg: cfg, repo: repo, users: users, gateway: gateway}
}

type CreateOrderRequest struct {
	PlanID string `json:"plan_id" binding:"required"`
}

type OrderResponse struct {
	ID             uuid.UUID      `json:"id"`
	Plan           string         `json:"plan"`
	Gateway        string         `json:"gateway"`
	AmountPaise    int            `json:"amount_paise"`
	Currency       string         `json:"currency"`
	Status         string         `json:"status"`
	GatewayOrderID *string        `json:"gateway_order_id,omitempty"`
	Checkout       map[string]any `json:"checkout"`
}

type VerifyRequest struct {
	OrderID        string            `json:"order_id"`
	GatewayOrderID string            `json:"gateway_order_id"`
	PaymentID      string            `json:"payment_id"`
	Signature      string            `json:"signature"`
	Params         map[string]string `json:"params"`
}

func (s *Service) Plans() []config.Plan {
	return s.cfg.Plans
}

func (s *Service) PublicConfig() map[string]any {
	out := s.gateway.PublicConfig()
	out["plans"] = s.cfg.Plans
	out["currency"] = s.cfg.Currency
	return out
}

func (s *Service) CreateOrder(ctx context.Context, userID uuid.UUID, in CreateOrderRequest) (OrderResponse, error) {
	plan, ok := findPlan(s.cfg.Plans, in.PlanID)
	if !ok {
		return OrderResponse{}, httputil.BadRequest("unknown_plan", "plan not found")
	}
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return OrderResponse{}, err
	}

	order, err := s.repo.CreateOrder(ctx, Order{
		UserID:      userID,
		Plan:        plan.ID,
		Gateway:     s.gateway.Name(),
		AmountPaise: plan.AmountPaise,
		Currency:    plan.Currency,
		Status:      "created",
	})
	if err != nil {
		return OrderResponse{}, err
	}

	gw, err := s.gateway.CreateOrder(ctx, CreateOrderInput{
		OrderID:      order.ID.String(),
		UserID:       userID.String(),
		PlanID:       plan.ID,
		PlanName:     plan.Name,
		AmountPaise:  plan.AmountPaise,
		Currency:     plan.Currency,
		CustomerName: u.Username,
		Mobile:       u.MobileNumber,
	})
	if err != nil {
		return OrderResponse{}, httputil.New(502, "gateway_error", err.Error())
	}
	if err := s.repo.UpdateGatewayOrder(ctx, order.ID, gw.GatewayOrderID, gw.CheckoutPayload); err != nil {
		return OrderResponse{}, err
	}
	order.GatewayOrderID = &gw.GatewayOrderID
	order.CheckoutPayload = gw.CheckoutPayload
	return toResponse(order), nil
}

func (s *Service) Verify(ctx context.Context, userID uuid.UUID, in VerifyRequest) (OrderResponse, error) {
	var order Order
	var err error
	if in.OrderID != "" {
		id, parseErr := uuid.Parse(in.OrderID)
		if parseErr != nil {
			return OrderResponse{}, httputil.BadRequest("invalid_id", "invalid order id")
		}
		order, err = s.repo.GetByID(ctx, id)
	} else if in.GatewayOrderID != "" {
		order, err = s.repo.GetByGatewayOrderID(ctx, s.gateway.Name(), in.GatewayOrderID)
	} else {
		return OrderResponse{}, httputil.BadRequest("missing_order", "order_id or gateway_order_id is required")
	}
	if errors.Is(err, ErrOrderNotFound) {
		return OrderResponse{}, httputil.NotFound("order not found")
	}
	if err != nil {
		return OrderResponse{}, err
	}
	if order.UserID != userID {
		return OrderResponse{}, httputil.Forbidden("forbidden", "not your order")
	}
	if order.Status == "paid" {
		return toResponse(order), nil
	}

	gwOrderID := in.GatewayOrderID
	if gwOrderID == "" && order.GatewayOrderID != nil {
		gwOrderID = *order.GatewayOrderID
	}
	res, err := s.gateway.Verify(ctx, VerifyInput{
		GatewayOrderID: gwOrderID,
		PaymentID:      in.PaymentID,
		Signature:      in.Signature,
		Params:         in.Params,
	})
	if err != nil {
		return OrderResponse{}, httputil.New(502, "gateway_error", err.Error())
	}
	if !res.OK {
		_ = s.repo.MarkFailed(ctx, order.ID)
		return OrderResponse{}, httputil.BadRequest("verification_failed", "payment could not be verified")
	}
	if err := s.activate(ctx, order, res.PaymentRef); err != nil {
		return OrderResponse{}, err
	}
	order.Status = "paid"
	return toResponse(order), nil
}

func (s *Service) HandleWebhook(ctx context.Context, headers map[string][]string, body []byte) error {
	event, err := s.gateway.ParseWebhook(headers, body)
	if err != nil {
		return httputil.Unauthorized("invalid webhook signature")
	}
	if event.GatewayOrderID == "" {
		return nil
	}
	order, err := s.repo.GetByGatewayOrderID(ctx, s.gateway.Name(), event.GatewayOrderID)
	if errors.Is(err, ErrOrderNotFound) {
		id, parseErr := uuid.Parse(event.GatewayOrderID)
		if parseErr != nil {
			return nil
		}
		order, err = s.repo.GetByID(ctx, id)
	}
	if err != nil {
		return err
	}
	if event.Status == "paid" {
		return s.activate(ctx, order, event.PaymentRef)
	}
	return s.repo.MarkFailed(ctx, order.ID)
}

func (s *Service) activate(ctx context.Context, order Order, paymentRef string) error {
	if order.Status == "paid" {
		return nil
	}
	plan, ok := findPlan(s.cfg.Plans, order.Plan)
	if !ok {
		plan = config.Plan{ID: order.Plan, DurationDays: 30}
	}
	u, err := s.users.GetByID(ctx, order.UserID)
	if err != nil {
		return err
	}
	start := time.Now()
	if u.PremiumUntil != nil && u.PremiumUntil.After(start) {
		start = *u.PremiumUntil
	}
	until := start.Add(time.Duration(plan.DurationDays) * 24 * time.Hour)
	if err := s.repo.MarkPaid(ctx, order.ID); err != nil {
		return err
	}
	if err := s.repo.CreateSubscription(ctx, order.UserID, order.Plan, s.gateway.Name(), until, paymentRef); err != nil {
		return err
	}
	return s.users.SetPremium(ctx, order.UserID, until)
}

func (s *Service) DummyActivate(ctx context.Context, userID uuid.UUID) error {
	until := time.Now().Add(30 * 24 * time.Hour)
	order, err := s.repo.CreateOrder(ctx, Order{
		UserID:      userID,
		Plan:        "pro_monthly",
		Gateway:     "dummy",
		AmountPaise: 29900,
		Currency:    "INR",
		Status:      "paid",
	})
	if err != nil {
		return err
	}
	_ = s.repo.CreateSubscription(ctx, userID, "pro_monthly", "dummy", until, "dummy_ref_"+order.ID.String())
	return s.users.SetPremium(ctx, userID, until)
}

func findPlan(plans []config.Plan, id string) (config.Plan, bool) {
	for _, p := range plans {
		if p.ID == id {
			return p, true
		}
	}
	return config.Plan{}, false
}

func toResponse(o Order) OrderResponse {
	return OrderResponse{
		ID:             o.ID,
		Plan:           o.Plan,
		Gateway:        o.Gateway,
		AmountPaise:    o.AmountPaise,
		Currency:       o.Currency,
		Status:         o.Status,
		GatewayOrderID: o.GatewayOrderID,
		Checkout:       o.CheckoutPayload,
	}
}
