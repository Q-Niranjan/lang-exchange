package payment

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrOrderNotFound = errors.New("order not found")

type Order struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	Plan            string
	Gateway         string
	GatewayOrderID  *string
	AmountPaise     int
	Currency        string
	Status          string
	CheckoutPayload map[string]any
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Subscription struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Plan       string
	Gateway    string
	StartsAt   time.Time
	EndsAt     time.Time
	PaymentRef *string
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) CreateOrder(ctx context.Context, o Order) (Order, error) {
	payload, _ := json.Marshal(o.CheckoutPayload)
	const q = `
		INSERT INTO payment_orders (user_id, plan, gateway, gateway_order_id, amount_paise, currency, status, checkout_payload)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, plan, gateway, gateway_order_id, amount_paise, currency, status, checkout_payload, created_at, updated_at`
	return scanOrder(r.pool.QueryRow(ctx, q, o.UserID, o.Plan, o.Gateway, o.GatewayOrderID, o.AmountPaise, o.Currency, o.Status, payload))
}

func (r *Repository) UpdateGatewayOrder(ctx context.Context, id uuid.UUID, gatewayOrderID string, checkout map[string]any) error {
	payload, _ := json.Marshal(checkout)
	_, err := r.pool.Exec(ctx, `
		UPDATE payment_orders
		SET gateway_order_id = $2, checkout_payload = $3, updated_at = now()
		WHERE id = $1`, id, gatewayOrderID, payload)
	return err
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (Order, error) {
	const q = `
		SELECT id, user_id, plan, gateway, gateway_order_id, amount_paise, currency, status, checkout_payload, created_at, updated_at
		FROM payment_orders WHERE id = $1`
	o, err := scanOrder(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrOrderNotFound
	}
	return o, err
}

func (r *Repository) GetByGatewayOrderID(ctx context.Context, gateway, gatewayOrderID string) (Order, error) {
	const q = `
		SELECT id, user_id, plan, gateway, gateway_order_id, amount_paise, currency, status, checkout_payload, created_at, updated_at
		FROM payment_orders WHERE gateway = $1 AND gateway_order_id = $2
		ORDER BY created_at DESC LIMIT 1`
	o, err := scanOrder(r.pool.QueryRow(ctx, q, gateway, gatewayOrderID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrOrderNotFound
	}
	return o, err
}

func (r *Repository) MarkPaid(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE payment_orders SET status = 'paid', updated_at = now() WHERE id = $1 AND status <> 'paid'`, id)
	return err
}

func (r *Repository) MarkFailed(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE payment_orders SET status = 'failed', updated_at = now() WHERE id = $1 AND status = 'created'`, id)
	return err
}

func (r *Repository) CreateSubscription(ctx context.Context, userID uuid.UUID, plan, gateway string, endsAt time.Time, paymentRef string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO subscriptions (user_id, plan, gateway, ends_at, payment_ref)
		VALUES ($1, $2, $3, $4, $5)`, userID, plan, gateway, endsAt, paymentRef)
	return err
}

func (r *Repository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]Order, error) {
	const q = `
		SELECT id, user_id, plan, gateway, gateway_order_id, amount_paise, currency, status, checkout_payload, created_at, updated_at
		FROM payment_orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Order
	for rows.Next() {
		o, err := scanOrder(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	if out == nil {
		out = []Order{}
	}
	return out, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanOrder(row scanner) (Order, error) {
	var o Order
	var payload []byte
	err := row.Scan(&o.ID, &o.UserID, &o.Plan, &o.Gateway, &o.GatewayOrderID, &o.AmountPaise, &o.Currency, &o.Status, &payload, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return Order{}, err
	}
	if len(payload) > 0 {
		_ = json.Unmarshal(payload, &o.CheckoutPayload)
	}
	return o, nil
}
