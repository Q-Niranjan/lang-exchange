package user

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("user not found")
var ErrDuplicate = errors.New("duplicate user")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, u User) (User, error) {
	const q = `
		INSERT INTO users (username, mobile_number, password_hash, gender)
		VALUES ($1, $2, $3, $4)
		RETURNING id, username, mobile_number, password_hash, gender, is_verified, is_premium, premium_until, created_at, updated_at`

	row := r.pool.QueryRow(ctx, q, u.Username, u.MobileNumber, u.PasswordHash, u.Gender)
	created, err := scanUser(row)
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, ErrDuplicate
		}
		return User{}, err
	}

	_, err = r.pool.Exec(ctx, `INSERT INTO profiles (user_id) VALUES ($1)`, created.ID)
	if err != nil {
		return User{}, fmt.Errorf("create profile: %w", err)
	}
	return created, nil
}

func (r *Repository) GetByID(ctx context.Context, id uuid.UUID) (User, error) {
	const q = `
		SELECT id, username, mobile_number, password_hash, gender, is_verified, is_premium, premium_until, created_at, updated_at
		FROM users WHERE id = $1`
	u, err := scanUser(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (r *Repository) GetByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]User, error) {
	out := make(map[uuid.UUID]User, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	const q = `
		SELECT id, username, mobile_number, password_hash, gender, is_verified, is_premium, premium_until, created_at, updated_at
		FROM users WHERE id = ANY($1)`
	rows, err := r.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out[u.ID] = u
	}
	return out, rows.Err()
}

func (r *Repository) GetProfilesByIDs(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]Profile, error) {
	out := make(map[uuid.UUID]Profile, len(ids))
	if len(ids) == 0 {
		return out, nil
	}
	const q = `
		SELECT user_id, native_language, learning_language, bio, avatar_url,
		       country, streak_days, last_practice_date::text, total_talk_seconds
		FROM profiles WHERE user_id = ANY($1)`
	rows, err := r.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		p, err := scanProfile(rows)
		if err != nil {
			return nil, err
		}
		out[p.UserID] = p
	}
	return out, rows.Err()
}

func (r *Repository) GetByMobile(ctx context.Context, mobile string) (User, error) {
	const q = `
		SELECT id, username, mobile_number, password_hash, gender, is_verified, is_premium, premium_until, created_at, updated_at
		FROM users WHERE mobile_number = $1`
	u, err := scanUser(r.pool.QueryRow(ctx, q, mobile))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

func (r *Repository) MarkVerified(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `UPDATE users SET is_verified = TRUE, updated_at = now() WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) GetProfile(ctx context.Context, userID uuid.UUID) (Profile, error) {
	const q = `
		SELECT user_id, native_language, learning_language, bio, avatar_url,
		       country, streak_days, last_practice_date::text, total_talk_seconds
		FROM profiles WHERE user_id = $1`
	p, err := scanProfile(r.pool.QueryRow(ctx, q, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	return p, err
}

func (r *Repository) UpdateProfile(ctx context.Context, p Profile) error {
	const q = `
		INSERT INTO profiles (user_id, native_language, learning_language, bio, avatar_url, country)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (user_id) DO UPDATE SET
			native_language   = COALESCE(EXCLUDED.native_language, profiles.native_language),
			learning_language = COALESCE(EXCLUDED.learning_language, profiles.learning_language),
			bio               = COALESCE(EXCLUDED.bio, profiles.bio),
			avatar_url        = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
			country           = COALESCE(EXCLUDED.country, profiles.country)`
	_, err := r.pool.Exec(ctx, q, p.UserID, p.NativeLanguage, p.LearningLanguage, p.Bio, p.AvatarURL, p.Country)
	return err
}

func (r *Repository) SetPremium(ctx context.Context, userID uuid.UUID, until time.Time) error {
	const q = `
		UPDATE users SET is_premium = TRUE, premium_until = $2, updated_at = now()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID, until)
	return err
}

// AddTalkSecondsAndStreak adds seconds to total_talk_seconds and updates the streak.
func (r *Repository) AddTalkSecondsAndStreak(ctx context.Context, userID uuid.UUID, seconds int64) error {
	if seconds <= 0 {
		return nil
	}
	const q = `
		UPDATE profiles SET
			total_talk_seconds = total_talk_seconds + $2,
			streak_days = CASE
				WHEN last_practice_date IS NULL          THEN 1
				WHEN last_practice_date = CURRENT_DATE   THEN streak_days
				WHEN last_practice_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
				ELSE 1
			END,
			last_practice_date = CURRENT_DATE
		WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, q, userID, seconds)
	return err
}

// GetStats returns aggregated stats for a user.
func (r *Repository) GetStats(ctx context.Context, userID uuid.UUID) (UserStats, error) {
	const q = `
		SELECT
			p.total_talk_seconds,
			p.streak_days,
			count(ps.id)::bigint,
			coalesce(ur.avg_score, 0),
			coalesce(ur.rating_count, 0)
		FROM profiles p
		LEFT JOIN practice_sessions ps ON (ps.user_a_id = $1 OR ps.user_b_id = $1)
		LEFT JOIN user_ratings ur ON ur.user_id = $1
		WHERE p.user_id = $1
		GROUP BY p.total_talk_seconds, p.streak_days, ur.avg_score, ur.rating_count`

	var s UserStats
	err := r.pool.QueryRow(ctx, q, userID).Scan(
		&s.TotalTalkSeconds, &s.StreakDays, &s.SessionCount, &s.AvgScore, &s.RatingCount,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return UserStats{}, nil
	}
	if err != nil {
		return UserStats{}, err
	}
	s.Level = LevelFromSeconds(s.TotalTalkSeconds)
	return s, nil
}

// ListSessions returns the call history for a user, most recent first.
func (r *Repository) ListSessions(ctx context.Context, userID uuid.UUID, limit int) ([]SessionHistoryItem, error) {
	if limit <= 0 {
		limit = 50
	}
	const q = `
		SELECT
			ps.id,
			CASE WHEN ps.user_a_id = $1 THEN ps.user_b_id ELSE ps.user_a_id END AS partner_id,
			u.username,
			ps.status,
			ps.started_at,
			ps.ended_at,
			COALESCE(
				EXTRACT(EPOCH FROM (ps.ended_at - ps.started_at))::BIGINT,
				0
			) AS duration_sec
		FROM practice_sessions ps
		JOIN users u ON u.id = (CASE WHEN ps.user_a_id = $1 THEN ps.user_b_id ELSE ps.user_a_id END)
		WHERE ps.user_a_id = $1 OR ps.user_b_id = $1
		ORDER BY ps.started_at DESC
		LIMIT $2`

	rows, err := r.pool.Query(ctx, q, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []SessionHistoryItem
	for rows.Next() {
		var item SessionHistoryItem
		if err := rows.Scan(
			&item.ID, &item.PartnerID, &item.Username,
			&item.Status, &item.StartedAt, &item.EndedAt, &item.DurationSec,
		); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if out == nil {
		out = []SessionHistoryItem{}
	}
	return out, rows.Err()
}

// ListLeaderboard returns top users ranked by total practice time.
func (r *Repository) ListLeaderboard(ctx context.Context, limit int) ([]LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	const q = `
		SELECT u.id, u.username, p.total_talk_seconds
		FROM profiles p
		JOIN users u ON u.id = p.user_id
		WHERE p.total_talk_seconds > 0
		ORDER BY p.total_talk_seconds DESC, u.username ASC
		LIMIT $1`

	rows, err := r.pool.Query(ctx, q, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []LeaderboardEntry
	rank := 1
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.UserID, &e.Username, &e.TotalTalkSeconds); err != nil {
			return nil, err
		}
		e.Rank = rank
		e.Level = LevelFromSeconds(e.TotalTalkSeconds)
		rank++
		out = append(out, e)
	}
	if out == nil {
		out = []LeaderboardEntry{}
	}
	return out, rows.Err()
}

// GetLeaderboardRank returns the rank and entry for a specific user.
func (r *Repository) GetLeaderboardRank(ctx context.Context, userID uuid.UUID) (int, LeaderboardEntry, error) {
	const q = `
		WITH ranked AS (
			SELECT
				u.id,
				u.username,
				p.total_talk_seconds,
				RANK() OVER (ORDER BY p.total_talk_seconds DESC, u.username ASC) AS rank
			FROM profiles p
			JOIN users u ON u.id = p.user_id
			WHERE p.total_talk_seconds > 0
		)
		SELECT rank, id, username, total_talk_seconds
		FROM ranked
		WHERE id = $1`

	var e LeaderboardEntry
	err := r.pool.QueryRow(ctx, q, userID).Scan(&e.Rank, &e.UserID, &e.Username, &e.TotalTalkSeconds)
	if errors.Is(err, pgx.ErrNoRows) {
		u, uerr := r.GetByID(ctx, userID)
		if uerr != nil {
			return 0, LeaderboardEntry{}, uerr
		}
		p, perr := r.GetProfile(ctx, userID)
		if perr != nil && perr != ErrNotFound {
			return 0, LeaderboardEntry{}, perr
		}
		return 0, LeaderboardEntry{
			UserID:           userID,
			Username:         u.Username,
			TotalTalkSeconds: p.TotalTalkSeconds,
			Level:            LevelFromSeconds(p.TotalTalkSeconds),
		}, nil
	}
	if err != nil {
		return 0, LeaderboardEntry{}, err
	}
	e.Level = LevelFromSeconds(e.TotalTalkSeconds)
	return e.Rank, e, nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanUser(row scanner) (User, error) {
	var u User
	err := row.Scan(
		&u.ID, &u.Username, &u.MobileNumber, &u.PasswordHash, &u.Gender,
		&u.IsVerified, &u.IsPremium, &u.PremiumUntil, &u.CreatedAt, &u.UpdatedAt,
	)
	return u, err
}

func scanProfile(row scanner) (Profile, error) {
	var p Profile
	err := row.Scan(
		&p.UserID, &p.NativeLanguage, &p.LearningLanguage, &p.Bio, &p.AvatarURL,
		&p.Country, &p.StreakDays, &p.LastPracticeDate, &p.TotalTalkSeconds,
	)
	return p, err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return strings.Contains(err.Error(), "duplicate key")
}
