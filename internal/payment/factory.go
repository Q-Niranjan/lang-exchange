package payment

import "lang-exchange/config"

func NewGateway(cfg config.PaymentConfig) Gateway {
	return NewCashfree(cfg.Cashfree)
}
