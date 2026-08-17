package friend

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Record struct {
	UserID        uuid.UUID
	FriendID      uuid.UUID
	Username      string
	Native        *string
	Learning      *string
	SessionCount  int64
	LastSessionAt *time.Time
	LastSessionID *uuid.UUID
	CreatedAt     time.Time
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Add(ctx context.Context, userID, friendID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO friendships (user_id, friend_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, friend_id) DO NOTHING`, userID, friendID)
	return err
}

func (r *Repository) Remove(ctx context.Context, userID, friendID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		DELETE FROM friendships WHERE user_id = $1 AND friend_id = $2`, userID, friendID)
	return err
}

func (r *Repository) IsFriend(ctx context.Context, userID, friendID uuid.UUID) (bool, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT 1 FROM friendships WHERE user_id = $1 AND friend_id = $2`, userID, friendID).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *Repository) List(ctx context.Context, userID uuid.UUID) ([]Record, error) {
	const q = `
		SELECT
			f.friend_id,
			u.username,
			p.native_language,
			p.learning_language,
			f.created_at,
			coalesce(s.session_count, 0),
			s.last_session_at,
			s.last_session_id
		FROM friendships f
		JOIN users u ON u.id = f.friend_id
		LEFT JOIN profiles p ON p.user_id = u.id
		LEFT JOIN LATERAL (
			SELECT
				count(*)::bigint AS session_count,
				max(started_at) AS last_session_at,
				(array_agg(id ORDER BY started_at DESC))[1] AS last_session_id
			FROM practice_sessions ps
			WHERE (ps.user_a_id = $1 AND ps.user_b_id = f.friend_id)
			   OR (ps.user_a_id = f.friend_id AND ps.user_b_id = $1)
		) s ON TRUE
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC`

	rows, err := r.pool.Query(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Record
	for rows.Next() {
		var rec Record
		rec.UserID = userID
		if err := rows.Scan(
			&rec.FriendID,
			&rec.Username,
			&rec.Native,
			&rec.Learning,
			&rec.CreatedAt,
			&rec.SessionCount,
			&rec.LastSessionAt,
			&rec.LastSessionID,
		); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	if out == nil {
		out = []Record{}
	}
	return out, rows.Err()
}
