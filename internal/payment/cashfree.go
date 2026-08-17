package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"lang-exchange/config"
)

type Cashfree struct {
	cfg config.CashfreeConfig
}

func NewCashfree(cfg config.CashfreeConfig) *Cashfree {
	return &Cashfree{cfg: cfg}
}

func (g *Cashfree) Name() string { return "cashfree" }

func (g *Cashfree) PublicConfig() map[string]any {
	return map[string]any{
		"gateway": "cashfree",
		"env":     g.cfg.Env,
		"app_id":  g.cfg.AppID,
	}
}

func (g *Cashfree) CreateOrder(ctx context.Context, in CreateOrderInput) (*GatewayOrder, error) {
	if g.cfg.AppID == "" || g.cfg.SecretKey == "" {
		return nil, fmt.Errorf("cashfree credentials are not configured")
	}
	amount := float64(in.AmountPaise) / 100.0
	payload, _ := json.Marshal(map[string]any{
		"order_id":       in.OrderID,
		"order_amount":   amount,
		"order_currency": in.Currency,
		"customer_details": map[string]any{
			"customer_id":    in.UserID,
			"customer_phone": in.Mobile,
			"customer_name":  in.CustomerName,
		},
		"order_meta": map[string]any{
			"notify_url": "",
		},
		"order_note": in.PlanName,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.cfg.BaseURL()+"/orders", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-client-id", g.cfg.AppID)
	req.Header.Set("x-client-secret", g.cfg.SecretKey)
	req.Header.Set("x-api-version", "2023-08-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("cashfree create order: %s", body)
	}
	var out struct {
		OrderID          string `json:"order_id"`
		PaymentSessionID string `json:"payment_session_id"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &GatewayOrder{
		GatewayOrderID: out.OrderID,
		CheckoutPayload: map[string]any{
			"payment_session_id": out.PaymentSessionID,
			"order_id":           out.OrderID,
			"mode":               g.cfg.Env,
		},
	}, nil
}

func (g *Cashfree) Verify(ctx context.Context, in VerifyInput) (*VerifyResult, error) {
	orderID := in.GatewayOrderID
	if orderID == "" {
		orderID = in.Params["order_id"]
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, g.cfg.BaseURL()+"/orders/"+orderID, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-client-id", g.cfg.AppID)
	req.Header.Set("x-client-secret", g.cfg.SecretKey)
	req.Header.Set("x-api-version", "2023-08-01")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("cashfree verify: %s", body)
	}
	var out struct {
		OrderStatus string `json:"order_status"`
		OrderID     string `json:"order_id"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &VerifyResult{
		OK:             out.OrderStatus == "PAID",
		GatewayOrderID: out.OrderID,
		PaymentRef:     in.PaymentID,
	}, nil
}

func (g *Cashfree) ParseWebhook(headers http.Header, body []byte) (*WebhookEvent, error) {
	ts := headers.Get("x-webhook-timestamp")
	sig := headers.Get("x-webhook-signature")
	secret := g.cfg.WebhookSecret
	if secret == "" {
		secret = g.cfg.SecretKey
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(ts))
	_, _ = mac.Write(body)
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if sig != "" && !hmac.Equal([]byte(expected), []byte(sig)) {
		return nil, fmt.Errorf("invalid cashfree webhook signature")
	}
	var payload struct {
		Type string `json:"type"`
		Data struct {
			Order struct {
				OrderID     string  `json:"order_id"`
				OrderStatus string  `json:"order_status"`
				OrderAmount float64 `json:"order_amount"`
			} `json:"order"`
			Payment struct {
				CfPaymentID json.Number `json:"cf_payment_id"`
			} `json:"payment"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	status := "failed"
	if payload.Data.Order.OrderStatus == "PAID" || payload.Type == "PAYMENT_SUCCESS_WEBHOOK" {
		status = "paid"
	}
	ref := payload.Data.Payment.CfPaymentID.String()
	return &WebhookEvent{
		OK:             true,
		GatewayOrderID: payload.Data.Order.OrderID,
		PaymentRef:     ref,
		Status:         status,
	}, nil
}
