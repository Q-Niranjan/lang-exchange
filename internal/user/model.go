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
	Country          *string   `json:"country,omitempty"`
	StreakDays       int       `json:"streak_days"`
	LastPracticeDate *string   `json:"last_practice_date,omitempty"`
	TotalTalkSeconds int64     `json:"total_talk_seconds"`
}

type PublicUser struct {
	User
	Profile     *Profile `json:"profile,omitempty"`
	AvgScore    *float64 `json:"avg_score,omitempty"`
	RatingCount int64    `json:"rating_count"`
}

// UserStats is returned by GET /users/me/stats.
type UserStats struct {
	TotalTalkSeconds int64   `json:"total_talk_seconds"`
	StreakDays       int     `json:"streak_days"`
	Level            string  `json:"level"`
	SessionCount     int64   `json:"session_count"`
	AvgScore         float64 `json:"avg_score"`
	RatingCount      int64   `json:"rating_count"`
}

// LevelFromSeconds derives a learning level from total talk time.
func LevelFromSeconds(s int64) string {
	hours := s / 3600
	switch {
	case hours < 2:
		return "Beginner"
	case hours < 10:
		return "Elementary"
	case hours < 30:
		return "Intermediate"
	case hours < 100:
		return "Upper-Intermediate"
	default:
		return "Advanced"
	}
}

// SessionHistoryItem is one row in the call history.
type SessionHistoryItem struct {
	ID          uuid.UUID  `json:"id"`
	PartnerID   uuid.UUID  `json:"partner_id"`
	Username    string     `json:"partner_username"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at,omitempty"`
	DurationSec int64      `json:"duration_seconds"`
}
