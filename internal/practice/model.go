package practice

import (
	"time"

	"github.com/google/uuid"
)

type Session struct {
	ID        uuid.UUID  `json:"id"`
	UserAID   uuid.UUID  `json:"user_a_id"`
	UserBID   uuid.UUID  `json:"user_b_id"`
	Status    string     `json:"status"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at,omitempty"`
}

type Partner struct {
	ID               uuid.UUID `json:"id"`
	Username         string    `json:"username"`
	NativeLanguage   *string   `json:"native_language,omitempty"`
	LearningLanguage *string   `json:"learning_language,omitempty"`
}

type Stats struct {
	SessionCount   int64 `json:"session_count"`
	WeekSeconds    int64 `json:"-"`
	WeekMinutes    int64 `json:"week_minutes"`
	OnlinePartners int64 `json:"online_partners"`
}

type IncomingCall struct {
	SessionID string   `json:"session_id"`
	Partner   *Partner `json:"partner,omitempty"`
}

type PartnerSummary struct {
	UserID        uuid.UUID
	LastSessionAt time.Time
	SessionCount  int64
	LastSessionID uuid.UUID
}

func (s Session) PartnerID(userID uuid.UUID) uuid.UUID {
	if s.UserAID == userID {
		return s.UserBID
	}
	return s.UserAID
}

func (s Session) Involves(userID uuid.UUID) bool {
	return s.UserAID == userID || s.UserBID == userID
}
