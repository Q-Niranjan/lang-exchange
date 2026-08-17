package auth

import "log"

type SMSSender interface {
	SendOTP(mobile, otp string) error
}

type ConsoleSMS struct{}

func (ConsoleSMS) SendOTP(mobile, otp string) error {
	log.Printf("[sms/console] OTP for %s: %s", mobile, otp)
	return nil
}

func NewSMSSender(provider string) SMSSender {
	switch provider {
	default:
		return ConsoleSMS{}
	}
}
