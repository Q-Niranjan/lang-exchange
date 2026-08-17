package auth

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"

	"lang-exchange/config"
)

type SMSSender interface {
	SendOTP(mobile, otp string) error
}

// ConsoleSMS logs the OTP – for local development only.
type ConsoleSMS struct{}

func (ConsoleSMS) SendOTP(mobile, otp string) error {
	log.Printf("[sms/console] OTP for %s: %s", mobile, otp)
	return nil
}

// TwilioSMS sends OTPs via the Twilio Messages API.
type TwilioSMS struct {
	cfg config.TwilioConfig
}

func (t TwilioSMS) SendOTP(mobile, otp string) error {
	endpoint := fmt.Sprintf(
		"https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json",
		t.cfg.AccountSID,
	)
	body := url.Values{}
	body.Set("To", mobile)
	body.Set("From", t.cfg.From)
	body.Set("Body", fmt.Sprintf("Your LangExchange verification code is: %s. Valid for 5 minutes.", otp))

	req, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return fmt.Errorf("twilio: build request: %w", err)
	}
	req.SetBasicAuth(t.cfg.AccountSID, t.cfg.AuthToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("twilio: send: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("twilio: unexpected status %d", resp.StatusCode)
	}
	return nil
}

// NewSMSSender returns the appropriate sender based on SMS_PROVIDER env.
func NewSMSSender(cfg config.OTPConfig) SMSSender {
	if strings.EqualFold(cfg.SMSProvider, "twilio") {
		if cfg.Twilio.AccountSID != "" && cfg.Twilio.AuthToken != "" && cfg.Twilio.From != "" {
			return TwilioSMS{cfg: cfg.Twilio}
		}
		log.Println("[sms] SMS_PROVIDER=twilio but TWILIO_* vars are missing; falling back to console")
	}
	return ConsoleSMS{}
}
