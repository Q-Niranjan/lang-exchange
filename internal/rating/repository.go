package rating

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("rating not found")
var ErrDuplicate = errors.New("already rated")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, sessionID, raterID, rateeID uuid.UUID, score int16, comment *string) (Rating, error) {
	const q = `
		INSERT INTO ratings (session_id, rater_id, ratee_id, score, comment)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, session_id, rater_id, ratee_id, score, comment, created_at`
	var out Rating
	err := r.pool.QueryRow(ctx, q, sessionID, raterID, rateeID, score, comment).
		Scan(&out.ID, &out.SessionID, &out.RaterID, &out.RateeID, &out.Score, &out.Comment, &out.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Rating{}, ErrDuplicate
		}
		return Rating{}, err
	}
	_, _ = r.pool.Exec(ctx, `REFRESH MATERIALIZED VIEW CONCURRENTLY user_ratings`)
	return out, nil
}

func (r *Repository) Summary(ctx context.Context, userID uuid.UUID) (Summary, error) {
	const q = `
		SELECT user_id, avg_score::float8, rating_count
		FROM user_ratings WHERE user_id = $1`
	var s Summary
	err := r.pool.QueryRow(ctx, q, userID).Scan(&s.UserID, &s.AvgScore, &s.RatingCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return Summary{UserID: userID, AvgScore: 0, RatingCount: 0}, nil
	}
	return s, err
}
