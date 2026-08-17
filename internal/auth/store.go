package auth

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type OTPStore struct {
	rdb    *redis.Client
	ttl    time.Duration
	length int
	master string
}

func NewOTPStore(rdb *redis.Client, ttl time.Duration, length int, master string) *OTPStore {
	if length < 4 {
		length = 6
	}
	return &OTPStore{rdb: rdb, ttl: ttl, length: length, master: strings.TrimSpace(master)}
}

func (s *OTPStore) Generate(ctx context.Context, mobile string) (string, error) {
	otp, err := randomDigits(s.length)
	if err != nil {
		return "", err
	}
	if err := s.rdb.Set(ctx, "otp:"+mobile, otp, s.ttl).Err(); err != nil {
		return "", fmt.Errorf("store otp: %w", err)
	}
	return otp, nil
}

func (s *OTPStore) Verify(ctx context.Context, mobile, otp string) (bool, error) {
	otp = strings.TrimSpace(otp)
	if s.master != "" && subtle.ConstantTimeCompare([]byte(otp), []byte(s.master)) == 1 {
		_ = s.rdb.Del(ctx, "otp:"+mobile).Err()
		return true, nil
	}
	val, err := s.rdb.Get(ctx, "otp:"+mobile).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if subtle.ConstantTimeCompare([]byte(val), []byte(otp)) != 1 {
		return false, nil
	}
	_ = s.rdb.Del(ctx, "otp:"+mobile).Err()
	return true, nil
}

func randomDigits(n int) (string, error) {
	const digits = "0123456789"
	out := make([]byte, n)
	for i := range out {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		out[i] = digits[idx.Int64()]
	}
	return string(out), nil
}

type TokenStore struct {
	rdb *redis.Client
}

func NewTokenStore(rdb *redis.Client) *TokenStore {
	return &TokenStore{rdb: rdb}
}

func (s *TokenStore) SaveRefresh(ctx context.Context, jti string, userID uuid.UUID, ttl time.Duration) error {
	return s.rdb.Set(ctx, "session:"+jti, userID.String(), ttl).Err()
}

func (s *TokenStore) GetRefresh(ctx context.Context, jti string) (string, error) {
	return s.rdb.Get(ctx, "session:"+jti).Result()
}

func (s *TokenStore) Revoke(ctx context.Context, jti string) error {
	return s.rdb.Del(ctx, "session:"+jti).Err()
}

func (s *TokenStore) BlacklistAccess(ctx context.Context, jti string, ttl time.Duration) error {
	return s.rdb.Set(ctx, "session:bl:"+jti, "1", ttl).Err()
}

func (s *TokenStore) IsBlacklisted(ctx context.Context, jti string) (bool, error) {
	n, err := s.rdb.Exists(ctx, "session:bl:"+jti).Result()
	return n > 0, err
}
