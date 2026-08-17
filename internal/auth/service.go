package auth

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/user"
)

type Service struct {
	users  *user.Repository
	otp    *OTPStore
	tokens *TokenStore
	jwt    *JWT
	sms    SMSSender
}

func NewService(users *user.Repository, otp *OTPStore, tokens *TokenStore, jwt *JWT, sms SMSSender) *Service {
	return &Service{users: users, otp: otp, tokens: tokens, jwt: jwt, sms: sms}
}

type RegisterInput struct {
	Username     string `json:"username" binding:"required"`
	MobileNumber string `json:"mobile_number" binding:"required"`
	Password     string `json:"password" binding:"required"`
	Gender       string `json:"gender" binding:"required"`
}

type LoginInput struct {
	MobileNumber string `json:"mobile_number" binding:"required"`
	Password     string `json:"password" binding:"required"`
}

type VerifyOTPInput struct {
	MobileNumber string `json:"mobile_number" binding:"required"`
	OTP          string `json:"otp" binding:"required"`
}

type RefreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (s *Service) Register(ctx context.Context, in RegisterInput) error {
	in.Username = strings.TrimSpace(in.Username)
	in.MobileNumber = strings.TrimSpace(in.MobileNumber)
	in.Gender = strings.ToLower(strings.TrimSpace(in.Gender))

	if err := user.ValidateUsername(in.Username); err != nil {
		return err
	}
	if err := user.ValidateMobile(in.MobileNumber); err != nil {
		return err
	}
	if err := user.ValidateGender(in.Gender); err != nil {
		return err
	}
	if err := ValidatePassword(in.Password); err != nil {
		return httputil.BadRequest("weak_password", err.Error())
	}

	hash, err := HashPassword(in.Password)
	if err != nil {
		return err
	}
	_, err = s.users.Create(ctx, user.User{
		Username:     in.Username,
		MobileNumber: in.MobileNumber,
		PasswordHash: hash,
		Gender:       in.Gender,
	})
	if errors.Is(err, user.ErrDuplicate) {
		return httputil.Conflict("user_exists", "username or mobile number already registered")
	}
	if err != nil {
		return err
	}

	otp, err := s.otp.Generate(ctx, in.MobileNumber)
	if err != nil {
		return err
	}
	return s.sms.SendOTP(in.MobileNumber, otp)
}

func (s *Service) VerifyOTP(ctx context.Context, in VerifyOTPInput) (TokenPair, error) {
	ok, err := s.otp.Verify(ctx, in.MobileNumber, in.OTP)
	if err != nil {
		return TokenPair{}, err
	}
	if !ok {
		return TokenPair{}, httputil.Unauthorized("invalid or expired otp")
	}
	u, err := s.users.GetByMobile(ctx, in.MobileNumber)
	if errors.Is(err, user.ErrNotFound) {
		return TokenPair{}, httputil.NotFound("user not found")
	}
	if err != nil {
		return TokenPair{}, err
	}
	if err := s.users.MarkVerified(ctx, u.ID); err != nil {
		return TokenPair{}, err
	}
	// Grant 7-day free trial for brand-new users.
	if !u.IsPremium {
		trial := time.Now().Add(7 * 24 * time.Hour)
		_ = s.users.SetPremium(ctx, u.ID, trial)
	}
	return s.issue(ctx, u.ID)
}

func (s *Service) Login(ctx context.Context, in LoginInput) (TokenPair, error) {
	u, err := s.users.GetByMobile(ctx, in.MobileNumber)
	if errors.Is(err, user.ErrNotFound) {
		return TokenPair{}, httputil.Unauthorized("invalid credentials")
	}
	if err != nil {
		return TokenPair{}, err
	}
	if !CheckPassword(u.PasswordHash, in.Password) {
		return TokenPair{}, httputil.Unauthorized("invalid credentials")
	}
	if !u.IsVerified {
		otp, err := s.otp.Generate(ctx, u.MobileNumber)
		if err != nil {
			return TokenPair{}, err
		}
		_ = s.sms.SendOTP(u.MobileNumber, otp)
		return TokenPair{}, httputil.Forbidden("unverified", "account not verified; otp resent")
	}
	return s.issue(ctx, u.ID)
}

func (s *Service) Refresh(ctx context.Context, in RefreshInput) (TokenPair, error) {
	claims, err := s.jwt.ParseRefresh(in.RefreshToken)
	if err != nil {
		return TokenPair{}, httputil.Unauthorized("invalid refresh token")
	}
	stored, err := s.tokens.GetRefresh(ctx, claims.ID)
	if err == redis.Nil || stored != claims.UserID.String() {
		return TokenPair{}, httputil.Unauthorized("refresh token revoked")
	}
	if err != nil {
		return TokenPair{}, err
	}
	_ = s.tokens.Revoke(ctx, claims.ID)
	return s.issue(ctx, claims.UserID)
}

func (s *Service) Logout(ctx context.Context, accessJTI string, accessTTLRemaining time.Duration, refreshJTI string) error {
	if accessJTI != "" {
		_ = s.tokens.BlacklistAccess(ctx, accessJTI, accessTTLRemaining)
	}
	if refreshJTI != "" {
		return s.tokens.Revoke(ctx, refreshJTI)
	}
	return nil
}

func (s *Service) issue(ctx context.Context, userID uuid.UUID) (TokenPair, error) {
	pair, _, refreshJTI, err := s.jwt.Issue(userID)
	if err != nil {
		return TokenPair{}, err
	}
	if err := s.tokens.SaveRefresh(ctx, refreshJTI, userID, s.jwt.RefreshTTL()); err != nil {
		return TokenPair{}, err
	}
	return pair, nil
}

func (s *Service) JWT() *JWT               { return s.jwt }
func (s *Service) Tokens() *TokenStore     { return s.tokens }
func (s *Service) Users() *user.Repository { return s.users }
