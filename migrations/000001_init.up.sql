CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(30)  NOT NULL UNIQUE,
    mobile_number   VARCHAR(15)  NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    gender          VARCHAR(10)  NOT NULL CHECK (gender IN ('male','female','other')),
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_premium      BOOLEAN      NOT NULL DEFAULT FALSE,
    premium_until   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
    user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    native_language   VARCHAR(10),
    learning_language VARCHAR(10),
    bio               TEXT,
    avatar_url        TEXT
);

CREATE TABLE practice_sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id    UUID NOT NULL REFERENCES users(id),
    user_b_id    UUID NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at     TIMESTAMPTZ,
    CHECK (user_a_id <> user_b_id),
    CHECK (status IN ('active','ended','cancelled'))
);

CREATE TABLE ratings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID NOT NULL REFERENCES practice_sessions(id),
    rater_id     UUID NOT NULL REFERENCES users(id),
    ratee_id     UUID NOT NULL REFERENCES users(id),
    score        SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, rater_id),
    CHECK (rater_id <> ratee_id)
);

CREATE TABLE subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id),
    plan         VARCHAR(20) NOT NULL,
    gateway      VARCHAR(20) NOT NULL DEFAULT '',
    starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ends_at      TIMESTAMPTZ NOT NULL,
    payment_ref  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_orders (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id),
    plan              VARCHAR(20) NOT NULL,
    gateway           VARCHAR(20) NOT NULL,
    gateway_order_id  TEXT,
    amount_paise      INTEGER NOT NULL,
    currency          VARCHAR(3) NOT NULL DEFAULT 'INR',
    status            VARCHAR(20) NOT NULL DEFAULT 'created',
    checkout_payload  JSONB,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (status IN ('created','paid','failed','expired'))
);

CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);
CREATE INDEX idx_practice_user_a ON practice_sessions(user_a_id);
CREATE INDEX idx_practice_user_b ON practice_sessions(user_b_id);
CREATE INDEX idx_practice_status ON practice_sessions(status);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_payment_orders_user ON payment_orders(user_id);
CREATE INDEX idx_payment_orders_gateway ON payment_orders(gateway, gateway_order_id);

CREATE MATERIALIZED VIEW user_ratings AS
SELECT ratee_id AS user_id, ROUND(AVG(score), 2) AS avg_score, COUNT(*) AS rating_count
FROM ratings
GROUP BY ratee_id;

CREATE UNIQUE INDEX idx_user_ratings_user ON user_ratings(user_id);
