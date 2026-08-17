package payment

import (
	"context"
	"net/http"
)

type CreateOrderInput struct {
	OrderID      string
	UserID       string
	PlanID       string
	PlanName     string
	AmountPaise  int
	Currency     string
	CustomerName string
	Mobile       string
	Email        string
}

type GatewayOrder struct {
	GatewayOrderID  string         `json:"gateway_order_id"`
	CheckoutPayload map[string]any `json:"checkout"`
}

type VerifyInput struct {
	GatewayOrderID string
	PaymentID      string
	Signature      string
	RawBody        []byte
	Params         map[string]string
}

type VerifyResult struct {
	OK             bool
	GatewayOrderID string
	PaymentRef     string
}

type WebhookEvent struct {
	OK             bool
	GatewayOrderID string
	PaymentRef     string
	Status         string // paid | failed
}

type Gateway interface {
	Name() string
	PublicConfig() map[string]any
	CreateOrder(ctx context.Context, in CreateOrderInput) (*GatewayOrder, error)
	Verify(ctx context.Context, in VerifyInput) (*VerifyResult, error)
	ParseWebhook(headers http.Header, body []byte) (*WebhookEvent, error)
}
