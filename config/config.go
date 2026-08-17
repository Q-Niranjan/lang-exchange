package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Postgres PostgresConfig
	Mongo    MongoConfig
	Redis    RedisConfig
	JWT      JWTConfig
	OTP      OTPConfig
	Payment  PaymentConfig
}

type AppConfig struct {
	Env     string
	Port    string
	BaseURL string
}

type PostgresConfig struct {
	URL      string
	MaxConns int32
}

func (p PostgresConfig) DSN() string { return p.URL }

type MongoConfig struct {
	URL string
	DB  string
}

type RedisConfig struct {
	URL string
}

type JWTConfig struct {
	AccessSecret  string
	RefreshSecret string
	AccessTTL     time.Duration
	RefreshTTL    time.Duration
}

type OTPConfig struct {
	TTL         time.Duration
	Length      int
	SMSProvider string
	Master      string
	Twilio      TwilioConfig
}

type TwilioConfig struct {
	AccountSID string
	AuthToken  string
	From       string
}

type PaymentConfig struct {
	Currency string
	Plans    []Plan
	Cashfree CashfreeConfig
}

type Plan struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DurationDays int    `json:"duration_days"`
	AmountPaise  int    `json:"amount_paise"`
	Currency     string `json:"currency"`
}

type CashfreeConfig struct {
	AppID         string
	SecretKey     string
	WebhookSecret string
	Env           string // sandbox | production
}

func (c CashfreeConfig) BaseURL() string {
	if strings.EqualFold(c.Env, "production") {
		return "https://api.cashfree.com/pg"
	}
	return "https://sandbox.cashfree.com/pg"
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	missing := missingEnv("POSTGRES_URL", "REDIS_URL", "MONGO_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET")
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required env: %s", strings.Join(missing, ", "))
	}

	pgMax, err := strconv.Atoi(getEnv("POSTGRES_MAX_CONNS", "20"))
	if err != nil {
		return nil, fmt.Errorf("POSTGRES_MAX_CONNS: %w", err)
	}
	accessTTL, err := time.ParseDuration(getEnv("JWT_ACCESS_TTL", "15m"))
	if err != nil {
		return nil, fmt.Errorf("JWT_ACCESS_TTL: %w", err)
	}
	refreshTTL, err := time.ParseDuration(getEnv("JWT_REFRESH_TTL", "168h"))
	if err != nil {
		return nil, fmt.Errorf("JWT_REFRESH_TTL: %w", err)
	}
	otpTTL, err := time.ParseDuration(getEnv("OTP_TTL", "5m"))
	if err != nil {
		return nil, fmt.Errorf("OTP_TTL: %w", err)
	}
	otpLen, err := strconv.Atoi(getEnv("OTP_LENGTH", "6"))
	if err != nil {
		return nil, fmt.Errorf("OTP_LENGTH: %w", err)
	}
	plans, err := parsePlans(getEnv("PAYMENT_PLANS", "monthly,Monthly Premium,30,19900,INR;yearly,Yearly Premium,365,199900,INR"))
	if err != nil {
		return nil, fmt.Errorf("PAYMENT_PLANS: %w", err)
	}

	postgresURL := os.Getenv("POSTGRES_URL")
	if err := validateURL(postgresURL, "postgres", "postgresql"); err != nil {
		return nil, fmt.Errorf("POSTGRES_URL: %w", err)
	}
	redisURL := os.Getenv("REDIS_URL")
	if err := validateURL(redisURL, "redis", "rediss"); err != nil {
		return nil, fmt.Errorf("REDIS_URL: %w", err)
	}
	mongoURL := os.Getenv("MONGO_URL")
	if err := validateURL(mongoURL, "mongodb", "mongodb+srv"); err != nil {
		return nil, fmt.Errorf("MONGO_URL: %w", err)
	}

	return &Config{
		App: AppConfig{
			Env:     getEnv("APP_ENV", "development"),
			Port:    getEnv("APP_PORT", "8080"),
			BaseURL: getEnv("APP_BASE_URL", "http://localhost:8080"),
		},
		Postgres: PostgresConfig{
			URL:      postgresURL,
			MaxConns: int32(pgMax),
		},
		Mongo: MongoConfig{
			URL: mongoURL,
			DB:  mongoDBName(mongoURL, getEnv("MONGO_DB", "chat")),
		},
		Redis: RedisConfig{URL: redisURL},
		JWT: JWTConfig{
			AccessSecret:  os.Getenv("JWT_ACCESS_SECRET"),
			RefreshSecret: os.Getenv("JWT_REFRESH_SECRET"),
			AccessTTL:     accessTTL,
			RefreshTTL:    refreshTTL,
		},
		OTP: OTPConfig{
			TTL:         otpTTL,
			Length:      otpLen,
			SMSProvider: getEnv("SMS_PROVIDER", "console"),
			Master:      strings.TrimSpace(os.Getenv("OTP_MASTER")),
			Twilio: TwilioConfig{
				AccountSID: os.Getenv("TWILIO_ACCOUNT_SID"),
				AuthToken:  os.Getenv("TWILIO_AUTH_TOKEN"),
				From:       os.Getenv("TWILIO_FROM"),
			},
		},
		Payment: PaymentConfig{
			Currency: getEnv("PAYMENT_CURRENCY", "INR"),
			Plans:    plans,
			Cashfree: CashfreeConfig{
				AppID:         os.Getenv("CASHFREE_APP_ID"),
				SecretKey:     os.Getenv("CASHFREE_SECRET_KEY"),
				WebhookSecret: os.Getenv("CASHFREE_WEBHOOK_SECRET"),
				Env:           getEnv("CASHFREE_ENV", "sandbox"),
			},
		},
	}, nil
}

func (c *Config) FindPlan(id string) (Plan, bool) {
	for _, p := range c.Payment.Plans {
		if p.ID == id {
			return p, true
		}
	}
	return Plan{}, false
}

func parsePlans(raw string) ([]Plan, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, fmt.Errorf("at least one plan is required")
	}
	var plans []Plan
	for _, part := range strings.Split(raw, ";") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		fields := strings.Split(part, ",")
		if len(fields) != 5 {
			return nil, fmt.Errorf("expected id,name,days,amount_paise,currency got %q", part)
		}
		days, err := strconv.Atoi(strings.TrimSpace(fields[2]))
		if err != nil {
			return nil, fmt.Errorf("duration_days: %w", err)
		}
		amount, err := strconv.Atoi(strings.TrimSpace(fields[3]))
		if err != nil {
			return nil, fmt.Errorf("amount_paise: %w", err)
		}
		plans = append(plans, Plan{
			ID:           strings.TrimSpace(fields[0]),
			Name:         strings.TrimSpace(fields[1]),
			DurationDays: days,
			AmountPaise:  amount,
			Currency:     strings.TrimSpace(fields[4]),
		})
	}
	if len(plans) == 0 {
		return nil, fmt.Errorf("at least one plan is required")
	}
	return plans, nil
}

func validateURL(raw string, schemes ...string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("must be a full URL, e.g. %s://user:pass@host:port/db", schemes[0])
	}
	for _, s := range schemes {
		if strings.EqualFold(u.Scheme, s) {
			return nil
		}
	}
	return fmt.Errorf("scheme must be one of %s", strings.Join(schemes, ", "))
}

func mongoDBName(mongoURL, fallback string) string {
	u, err := url.Parse(mongoURL)
	if err != nil {
		return fallback
	}
	name := strings.Trim(u.Path, "/")
	if name == "" {
		return fallback
	}
	if i := strings.Index(name, "/"); i >= 0 {
		name = name[:i]
	}
	return name
}

func missingEnv(keys ...string) []string {
	var missing []string
	for _, k := range keys {
		if os.Getenv(k) == "" {
			missing = append(missing, k)
		}
	}
	return missing
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
