package practice

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("session not found")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, a, b uuid.UUID) (Session, error) {
	const q = `
		INSERT INTO practice_sessions (user_a_id, user_b_id, status)
		VALUES ($1, $2, 'active')
		RETURNING id, user_a_id, user_b_id, status, started_at, ended_at`
	return scanSession(r.pool.QueryRow(ctx, q, a, b))
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (Session, error) {
	const q = `
		SELECT id, user_a_id, user_b_id, status, started_at, ended_at
		FROM practice_sessions WHERE id = $1`
	s, err := scanSession(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return s, err
}

func (r *Repository) End(ctx context.Context, id uuid.UUID) (Session, error) {
	const q = `
		UPDATE practice_sessions
		SET status = 'ended', ended_at = now()
		WHERE id = $1 AND status = 'active'
		RETURNING id, user_a_id, user_b_id, status, started_at, ended_at`
	s, err := scanSession(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return s, err
}

func (r *Repository) Stats(ctx context.Context, userID uuid.UUID) (Stats, error) {
	const q = `
		SELECT
			count(*)::bigint,
			coalesce(sum(
				extract(epoch from (coalesce(ended_at, now()) - started_at))
			) filter (where started_at > now() - interval '7 days'), 0)::bigint
		FROM practice_sessions
		WHERE user_a_id = $1 OR user_b_id = $1`
	var out Stats
	err := r.pool.QueryRow(ctx, q, userID).Scan(&out.SessionCount, &out.WeekSeconds)
	if err != nil {
		return Stats{}, err
	}
	out.WeekMinutes = out.WeekSeconds / 60
	return out, nil
}

func (r *Repository) HasSessionWith(ctx context.Context, a, b uuid.UUID) (bool, error) {
	const q = `
		SELECT 1
		FROM practice_sessions
		WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)
		LIMIT 1`
	var n int
	err := r.pool.QueryRow(ctx, q, a, b).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *Repository) ListPartners(ctx context.Context, userID uuid.UUID) ([]PartnerSummary, error) {
	const q = `
		SELECT
			CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END AS partner_id,
			MAX(started_at) AS last_session_at,
			COUNT(*)::bigint AS session_count,
			(ARRAY_AGG(id ORDER BY started_at DESC))[1] AS last_session_id
		FROM practice_sessions
		WHERE user_a_id = $1 OR user_b_id = $1
		GROUP BY 1
		ORDER BY last_session_at DESC
		LIMIT 100`
	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []PartnerSummary
	for rows.Next() {
		var p PartnerSummary
		if err := rows.Scan(&p.UserID, &p.LastSessionAt, &p.SessionCount, &p.LastSessionID); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	if out == nil {
		out = []PartnerSummary{}
	}
	return out, rows.Err()
}

func (r *Repository) ActiveForUser(ctx context.Context, userID uuid.UUID) (Session, error) {
	const q = `
		SELECT id, user_a_id, user_b_id, status, started_at, ended_at
		FROM practice_sessions
		WHERE status = 'active' AND (user_a_id = $1 OR user_b_id = $1)
		ORDER BY started_at DESC
		LIMIT 1`
	s, err := scanSession(r.pool.QueryRow(ctx, q, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Session{}, ErrNotFound
	}
	return s, err
}

type scanner interface {
	Scan(dest ...any) error
}

func scanSession(row scanner) (Session, error) {
	var s Session
	err := row.Scan(&s.ID, &s.UserAID, &s.UserBID, &s.Status, &s.StartedAt, &s.EndedAt)
	return s, err
}
