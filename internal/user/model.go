package user

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID  `json:"id"`
	Username     string     `json:"username"`
	MobileNumber string     `json:"mobile_number"`
	PasswordHash string     `json:"-"`
	Gender       string     `json:"gender"`
	IsVerified   bool       `json:"is_verified"`
	IsPremium    bool       `json:"is_premium"`
	PremiumUntil *time.Time `json:"premium_until,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func (u User) PremiumActive(now time.Time) bool {
	if !u.IsPremium {
		return false
	}
	if u.PremiumUntil == nil {
		return true
	}
	return u.PremiumUntil.After(now)
}

type Profile struct {
	UserID           uuid.UUID `json:"user_id"`
	NativeLanguage   *string   `json:"native_language,omitempty"`
	LearningLanguage *string   `json:"learning_language,omitempty"`
	Bio              *string   `json:"bio,omitempty"`
	AvatarURL        *string   `json:"avatar_url,omitempty"`
}

type PublicUser struct {
	User
	Profile     *Profile `json:"profile,omitempty"`
	AvgScore    *float64 `json:"avg_score,omitempty"`
	RatingCount int64    `json:"rating_count"`
}
