package rating

import (
	"time"

	"github.com/google/uuid"
)

type Rating struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	RaterID   uuid.UUID `json:"rater_id"`
	RateeID   uuid.UUID `json:"ratee_id"`
	Score     int16     `json:"score"`
	Comment   *string   `json:"comment,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Summary struct {
	UserID      uuid.UUID `json:"user_id"`
	AvgScore    float64   `json:"avg_score"`
	RatingCount int64     `json:"rating_count"`
}
