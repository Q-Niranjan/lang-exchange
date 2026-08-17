package user

import (
	"context"
	"regexp"
	"strings"

	"github.com/google/uuid"

	"lang-exchange/internal/httputil"
)

var (
	usernameRe = regexp.MustCompile(`^[A-Za-z0-9_]{3,30}$`)
	mobileRe   = regexp.MustCompile(`^\+?[1-9]\d{9,14}$`)
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (User, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Me(ctx context.Context, id uuid.UUID) (PublicUser, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if err == ErrNotFound {
			return PublicUser{}, httputil.NotFound("user not found")
		}
		return PublicUser{}, err
	}
	p, err := s.repo.GetProfile(ctx, id)
	if err != nil && err != ErrNotFound {
		return PublicUser{}, err
	}
	out := PublicUser{User: u}
	if err == nil {
		out.Profile = &p
	}
	return out, nil
}

type UpdateMeInput struct {
	NativeLanguage   *string `json:"native_language"`
	LearningLanguage *string `json:"learning_language"`
	Bio              *string `json:"bio"`
	AvatarURL        *string `json:"avatar_url"`
}

func (s *Service) UpdateMe(ctx context.Context, id uuid.UUID, in UpdateMeInput) (PublicUser, error) {
	if err := s.repo.UpdateProfile(ctx, Profile{
		UserID:           id,
		NativeLanguage:   in.NativeLanguage,
		LearningLanguage: in.LearningLanguage,
		Bio:              in.Bio,
		AvatarURL:        in.AvatarURL,
	}); err != nil {
		return PublicUser{}, err
	}
	return s.Me(ctx, id)
}

func ValidateUsername(username string) error {
	if !usernameRe.MatchString(username) {
		return httputil.BadRequest("invalid_username", "username must be 3-30 alphanumeric or underscore characters")
	}
	return nil
}

func ValidateMobile(mobile string) error {
	if !mobileRe.MatchString(mobile) {
		return httputil.BadRequest("invalid_mobile", "mobile number must be 10-15 digits, optional leading +")
	}
	return nil
}

func ValidateGender(gender string) error {
	switch strings.ToLower(gender) {
	case "male", "female", "other":
		return nil
	default:
		return httputil.BadRequest("invalid_gender", "gender must be male, female, or other")
	}
}
