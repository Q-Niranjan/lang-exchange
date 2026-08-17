package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

type JWT struct {
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
}

func NewJWT(accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *JWT {
	return &JWT{
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

func (j *JWT) Issue(userID uuid.UUID) (TokenPair, string, string, error) {
	accessJTI := uuid.NewString()
	refreshJTI := uuid.NewString()
	now := time.Now()

	access, err := j.sign(j.accessSecret, userID, accessJTI, now, j.accessTTL)
	if err != nil {
		return TokenPair{}, "", "", err
	}
	refresh, err := j.sign(j.refreshSecret, userID, refreshJTI, now, j.refreshTTL)
	if err != nil {
		return TokenPair{}, "", "", err
	}
	return TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(j.accessTTL.Seconds()),
	}, accessJTI, refreshJTI, nil
}

func (j *JWT) ParseAccess(token string) (*Claims, error) {
	return j.parse(token, j.accessSecret)
}

func (j *JWT) ParseRefresh(token string) (*Claims, error) {
	return j.parse(token, j.refreshSecret)
}

func (j *JWT) AccessTTL() time.Duration  { return j.accessTTL }
func (j *JWT) RefreshTTL() time.Duration { return j.refreshTTL }

func (j *JWT) sign(secret []byte, userID uuid.UUID, jti string, now time.Time, ttl time.Duration) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(secret)
}

func (j *JWT) parse(token string, secret []byte) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}
