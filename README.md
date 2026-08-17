# Language Exchange API

One-to-one language practice: free matching + ratings, premium messaging. Modular Go monolith with Postgres, MongoDB, and Redis. Checkout is Cashfree.

## Stack

| Layer | Choice |
|---|---|
| HTTP | Go 1.22 + gin |
| Auth | JWT + Redis refresh tokens / OTP |
| Postgres | users, profiles, practice sessions, ratings, subscriptions, payment orders |
| MongoDB | chat messages + conversations |
| Redis | OTP, sessions, presence, matchmaking queue, rate limit |
| Payments | Cashfree |
| Web | Next.js + TanStack Query |

Premium messaging is gated in **one** place: `internal/middleware/premium.go`. Chat, friends, and call-again routes sit behind that middleware; handlers never check `IsPremium`.

## Quick start

```bash
cp .env.example .env
# set POSTGRES_URL, REDIS_URL, MONGO_URL, JWT_* at minimum

docker compose up -d postgres mongo redis
go run ./cmd/api
```

UI (in another terminal):

```bash
cd web && npm install && npm run dev
```

API is `http://localhost:8080`. UI is `http://localhost:3000`. Migrations run on API boot.

Or run everything in Docker:

```bash
cp .env.example .env
docker compose up --build
```

## Environment

All connection and vendor secrets come from `.env` (see `.env.example`).

### Databases

The app does not hardcode hosts. Point these at local Docker, Atlas, Neon, Upstash, RDS, or anything else:

```
POSTGRES_URL=postgres://user:pass@host:5432/dbname?sslmode=disable
REDIS_URL=redis://localhost:6379/0
MONGO_URL=mongodb://localhost:27017/chat
```

TLS examples:

```
POSTGRES_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
REDIS_URL=rediss://default:TOKEN@HOST:6379
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/chat?retryWrites=true&w=majority
```

The Mongo database name is taken from the URL path (`/chat`). Override with `MONGO_DB` if the URL has no path.

### Cashfree

```
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_WEBHOOK_SECRET=
CASHFREE_ENV=sandbox   # or production
PAYMENT_PLANS=monthly,Monthly Premium,30,19900,INR;yearly,Yearly Premium,365,199900,INR
```

Plans format: `id,display_name,duration_days,amount_paise,currency` (semicolon-separated).

OTP in development uses `SMS_PROVIDER=console` (OTP is logged, not SMS'd). Set `OTP_MASTER` in `.env` for a testing code that verifies every account.

## API

### Auth

```
POST /api/v1/auth/register     { username, mobile_number, password, gender }
POST /api/v1/auth/verify-otp   { mobile_number, otp }
POST /api/v1/auth/login        { mobile_number, password }
POST /api/v1/auth/refresh      { refresh_token }
POST /api/v1/auth/logout
```

### Profile & ratings (free)

```
GET    /api/v1/users/me
PATCH  /api/v1/users/me
GET    /api/v1/users/:id/rating
```

### Practice (free)

```
POST /api/v1/practice/match          { native_language, learning_language }
GET  /api/v1/practice/match/status
GET  /api/v1/practice/:id
POST /api/v1/practice/:id/end
POST /api/v1/practice/:id/rate     { score, comment }
```

Matchmaking uses Redis sorted sets (`matchmaking:queue:{lang_pair}`). Complementary pairs (`en_fr` ↔ `fr_en`) are preferred.

### Chat, friends & call-again (premium)

```
GET    /api/v1/friends
GET    /api/v1/friends/:userID
POST   /api/v1/friends/:userID
DELETE /api/v1/friends/:userID
GET    /api/v1/chat
GET    /api/v1/chat/:conversationID
POST   /api/v1/chat/:conversationID/messages
POST   /api/v1/chat/from-session/:sessionID
POST   /api/v1/chat/with/:userID
GET    /api/v1/ws/chat?token=<access_token>
GET    /api/v1/notifications
POST   /api/v1/notifications/dismiss    { id }
POST   /api/v1/practice/direct          { partner_id }
POST   /api/v1/practice/:id/accept      # callee joins a call-again invite
```

Friends are saved explicitly with **Add friend** after you practice together. Premium users then open `/app/friends` to message or start another voice session. The header bell keeps incoming/missed calls and unread messages until you accept, open, or dismiss them — **Call again** stays available while the other person is still online.

### Payments

```
GET  /api/v1/payments/plans
GET  /api/v1/payments/config      # Cashfree public checkout config
POST /api/v1/payments/orders      { plan_id }
POST /api/v1/payments/verify      { order_id, payment_id, signature, params }
POST /api/v1/webhooks/payments    # gateway webhook (no JWT; signature verified)
```

A verified payment writes `subscriptions`, sets `users.is_premium` / `premium_until`.

## Layout

```
cmd/api/main.go
config/config.go
internal/
  auth/        JWT, OTP, password
  user/        registration profile
  practice/    matchmaking + sessions
  rating/
  chat/        mongo + websocket
  payment/     Cashfree checkout + webhooks
  middleware/  auth, premium gate, rate limit
  platform/    postgres, mongodb, redis
migrations/
web/           Next.js UI (home, register, login, practice, premium chat)
```

author-Niranjan