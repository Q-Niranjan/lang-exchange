package auth

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"

	"lang-exchange/config"
)

type SMSSender interface {
	SendOTP(mobile, otp string) error
	Name() string
}

// ConsoleSMS logs the OTP – for local development only.
type ConsoleSMS struct{}

func (ConsoleSMS) Name() string { return "console" }

func (ConsoleSMS) SendOTP(mobile, otp string) error {
	log.Printf("[sms/console] OTP for %s: %s", mobile, otp)
	return nil
}

// TwilioSMS sends OTPs via the Twilio Messages API.
type TwilioSMS struct {
	cfg config.TwilioConfig
}

func (TwilioSMS) Name() string { return "twilio" }

func (t TwilioSMS) SendOTP(mobile, otp string) error {
	to := normalizeE164(mobile)
	if to == "" {
		return fmt.Errorf("twilio: invalid mobile number %q", mobile)
	}

	endpoint := fmt.Sprintf(
		"https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json",
		t.cfg.AccountSID,
	)
	body := url.Values{}
	body.Set("To", to)
	body.Set("From", t.cfg.From)
	body.Set("Body", fmt.Sprintf("Your LangFluency verification code is: %s. Valid for 5 minutes.", otp))

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

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		log.Printf("[sms/twilio] failed to=%s from=%s status=%d body=%s", to, t.cfg.From, resp.StatusCode, string(respBody))
		return fmt.Errorf("twilio: status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	log.Printf("[sms/twilio] OTP sent to %s (sid response ok)", to)
	return nil
}

func normalizeE164(mobile string) string {
	s := strings.TrimSpace(mobile)
	if s == "" {
		return ""
	}
	if !strings.HasPrefix(s, "+") {
		s = "+" + strings.TrimLeft(s, "0")
	}
	digits := strings.Builder{}
	for i, r := range s {
		if r == '+' && i == 0 {
			digits.WriteRune(r)
			continue
		}
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	out := digits.String()
	if len(out) < 11 || len(out) > 16 {
		return ""
	}
	return out
}

// NewSMSSender returns the appropriate sender based on SMS_PROVIDER env.
func NewSMSSender(cfg config.OTPConfig) SMSSender {
	if strings.EqualFold(cfg.SMSProvider, "twilio") {
		if cfg.Twilio.AccountSID != "" && cfg.Twilio.AuthToken != "" && cfg.Twilio.From != "" {
			log.Printf("[sms] using Twilio (from %s)", cfg.Twilio.From)
			return TwilioSMS{cfg: cfg.Twilio}
		}
		log.Println("[sms] SMS_PROVIDER=twilio but TWILIO_* vars are missing; falling back to console")
	}
	log.Println("[sms] using console (OTP printed in API logs)")
	return ConsoleSMS{}
}
