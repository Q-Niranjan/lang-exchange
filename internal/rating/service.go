package rating

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"lang-exchange/internal/httputil"
	"lang-exchange/internal/practice"
)

type Service struct {
	repo     *Repository
	sessions *practice.Repository
}

func NewService(repo *Repository, sessions *practice.Repository) *Service {
	return &Service{repo: repo, sessions: sessions}
}

type RateInput struct {
	Score   int16   `json:"score" binding:"required"`
	Comment *string `json:"comment"`
}

func (s *Service) Rate(ctx context.Context, raterID, sessionID uuid.UUID, in RateInput) (Rating, error) {
	if in.Score < 1 || in.Score > 5 {
		return Rating{}, httputil.BadRequest("invalid_score", "score must be between 1 and 5")
	}
	sess, err := s.sessions.GetByID(ctx, sessionID)
	if errors.Is(err, practice.ErrNotFound) {
		return Rating{}, httputil.NotFound("session not found")
	}
	if err != nil {
		return Rating{}, err
	}
	if !sess.Involves(raterID) {
		return Rating{}, httputil.Forbidden("forbidden", "not a participant")
	}
	if sess.Status != "ended" {
		return Rating{}, httputil.BadRequest("session_active", "rate only after the session has ended")
	}
	out, err := s.repo.Create(ctx, sessionID, raterID, sess.PartnerID(raterID), in.Score, in.Comment)
	if errors.Is(err, ErrDuplicate) {
		return Rating{}, httputil.Conflict("already_rated", "you already rated this session")
	}
	return out, err
}

func (s *Service) Summary(ctx context.Context, userID uuid.UUID) (Summary, error) {
	return s.repo.Summary(ctx, userID)
}
