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
		SELECT user_id, native_language, learning_language, bio, avatar_url
		FROM profiles WHERE user_id = ANY($1)`
	rows, err := r.pool.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var p Profile
		if err := rows.Scan(&p.UserID, &p.NativeLanguage, &p.LearningLanguage, &p.Bio, &p.AvatarURL); err != nil {
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
		SELECT user_id, native_language, learning_language, bio, avatar_url
		FROM profiles WHERE user_id = $1`
	var p Profile
	err := r.pool.QueryRow(ctx, q, userID).Scan(&p.UserID, &p.NativeLanguage, &p.LearningLanguage, &p.Bio, &p.AvatarURL)
	if errors.Is(err, pgx.ErrNoRows) {
		return Profile{}, ErrNotFound
	}
	return p, err
}

func (r *Repository) UpdateProfile(ctx context.Context, p Profile) error {
	const q = `
		INSERT INTO profiles (user_id, native_language, learning_language, bio, avatar_url)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id) DO UPDATE SET
			native_language = COALESCE(EXCLUDED.native_language, profiles.native_language),
			learning_language = COALESCE(EXCLUDED.learning_language, profiles.learning_language),
			bio = COALESCE(EXCLUDED.bio, profiles.bio),
			avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url)`
	_, err := r.pool.Exec(ctx, q, p.UserID, p.NativeLanguage, p.LearningLanguage, p.Bio, p.AvatarURL)
	return err
}

func (r *Repository) SetPremium(ctx context.Context, userID uuid.UUID, until time.Time) error {
	const q = `
		UPDATE users SET is_premium = TRUE, premium_until = $2, updated_at = now()
		WHERE id = $1`
	_, err := r.pool.Exec(ctx, q, userID, until)
	return err
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

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return strings.Contains(err.Error(), "duplicate key")
}
