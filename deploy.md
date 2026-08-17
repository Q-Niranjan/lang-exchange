# Where to deploy this project

Short answer: **Railway is a good place to start** for the Go API. Put the Next.js UI on **Vercel**. Keep databases on managed hosts (Neon / Railway Postgres, Upstash or Railway Redis, MongoDB Atlas). Do not put the API on Vercel or any other serverless platform.

This app is not a single static site. It is two processes plus three data stores:

| Piece | What it is | Needs |
|---|---|---|
| `cmd/api` | Long-running Go server | HTTP, WebSockets, one replica for now |
| `web/` | Next.js 15 | Node build + `NEXT_PUBLIC_API_URL` |
| Postgres | Users, sessions, friends, payments | Managed Postgres |
| Redis | OTP, matchmaking, presence, tokens | Managed Redis (TLS URL is fine) |
| MongoDB | Chat messages | MongoDB Atlas (or any `mongodb+srv` URL) |

Voice calls are **browser WebRTC (peer-to-peer)**. The API only does signaling over `/api/v1/ws/practice`. There is no TURN server in this repo, so some mobile / strict-NAT networks may fail to connect audio.

Chat sockets (`/api/v1/ws/chat`) and in-memory hubs (incoming calls, WebRTC signals) live **inside the API process**. Run **one API instance**. Scaling to two replicas would drop calls/messages unless you add Redis pub/sub later.

---

## Recommendation

### For a first public demo / MVP: Railway + Vercel + Atlas

This is the least-friction split for this repo.

1. **API → Railway**  
   Root `Dockerfile` already builds `./cmd/api` and copies `migrations/`. Railway understands Docker. WebSockets work. Set env vars from `.env.example`. Keep replicas at **1**.

2. **UI → Vercel**  
   Next.js is native there. Set `NEXT_PUBLIC_API_URL` to the public Railway HTTPS URL (no trailing slash), e.g. `https://api-xxxx.up.railway.app`.

3. **Postgres → Railway plugin or Neon**  
   Either works. Point `POSTGRES_URL` at it (`sslmode=require` on hosted Postgres).

4. **Redis → Railway plugin or Upstash**  
   Matchmaking and presence need a real Redis, not a fake in-memory store. Use `rediss://…` for TLS (Upstash).

5. **MongoDB → Atlas (M0 free tier is enough to start)**  
   Railway can run a Mongo template, but Atlas is the usual choice. Use `mongodb+srv://…/chat`.

Why not “everything on Railway”? You can, including the Next.js app as a second Railway service (`web/` with `npm run build` / `npm start`). Vercel is simply easier for Next.js previews and CDN. Why not “everything on Vercel”? The Go API uses WebSockets and in-process state. Vercel functions will not run that correctly.

### When to pick something else

| Host | Use it if… | Avoid if… |
|---|---|---|
| **Railway** | You want one dashboard, Docker, Postgres + Redis plugins, fast first deploy | You need multi-region or very cheap always-on at scale |
| **Render** | You prefer a Railway-like PaaS with a Web Service + Postgres | Same as Railway; Mongo is still Atlas |
| **Fly.io** | You want a small always-on VM close to users, Docker, more control | You want the fewest clicks |
| **Vercel** | Frontend only | API, Redis, WebSockets |
| **DigitalOcean Droplet / Hetzner VPS** | You are fine running Docker Compose yourself (`docker compose up --build`) | You want zero server ops |
| **AWS / GCP / Azure** | Production scale, compliance, existing cloud account | First deploy of this repo |

**Render** is the closest alternative to Railway (same model: Git → Docker web service). **Fly.io** is the next step if Railway sleep/pricing or single-region latency bothers you. A **VPS + docker-compose** is the cheapest “run the whole stack myself” option; use it when you already know how to manage TLS (Caddy/Nginx) and backups.

---

## Suggested layout

```
Browser
  → Vercel  (Next.js UI)
       HTTP + WebSocket  →  Railway  (Go API, 1 replica)
                               → Neon / Railway Postgres
                               → Upstash / Railway Redis
                               → MongoDB Atlas
```

Cashfree webhooks must hit the **API** URL, not Vercel:

```
https://<your-api-host>/api/v1/webhooks/payments
```

---

## Railway notes (API)

1. New project → deploy from this GitHub repo (root directory, not `web/`).
2. Railway should detect the root `Dockerfile`. If it Nixpacks instead, set the builder to Dockerfile.
3. Add Postgres and Redis plugins **or** paste URLs from Neon / Upstash.
4. Create variables (see below). Railway injects `PORT`; this app listens on **`APP_PORT`**. Set:

   ```
   APP_PORT=${PORT}
   ```

   or hard-code `APP_PORT=8080` and map that port in the service settings. If you only set `PORT` and not `APP_PORT`, the process still binds `:8080` and health checks fail.

5. `MIGRATIONS_PATH` can stay unset; the image working directory is `/app` and migrations are copied to `/app/migrations`.
6. Generate a public HTTPS domain. Put that URL in `APP_BASE_URL`.
7. Do **not** scale replicas above 1.
8. Leave `OTP_MASTER` empty in any shared/production environment.

Frontend on Railway (optional): second service, root `web`, start command `npm run start`, env `NEXT_PUBLIC_API_URL=https://<api-domain>`. `NEXT_PUBLIC_*` is baked in at **build** time, so set it before the first successful build.

---

## Environment (API)

Copy from `.env.example`. Minimum for a live API:

```
APP_ENV=production
APP_PORT=8080
APP_BASE_URL=https://<api-host>

POSTGRES_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
REDIS_URL=rediss://default:TOKEN@HOST:6379
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/chat?retryWrites=true&w=majority

JWT_ACCESS_SECRET=<random 32+ chars>
JWT_REFRESH_SECRET=<different random 32+ chars>

SMS_PROVIDER=console
OTP_MASTER=
```

Then Cashfree keys when you take payments (`CASHFREE_ENV=production`, webhook secret, `PAYMENT_PLANS`).

`SMS_PROVIDER=console` logs OTP in Railway logs. For real SMS, wire a provider later. Never ship `OTP_MASTER` to production.

## Environment (UI)

```
NEXT_PUBLIC_API_URL=https://<api-host>
```

No trailing slash. CORS on the API currently allows `*`, so a separate Vercel origin is fine.

---

## What not to do

- Deploy the API as a serverless function (Vercel / Lambda / Cloud Functions).
- Run more than one API replica until hubs are shared via Redis.
- Point production at local Docker Postgres/Redis/Mongo.
- Put secrets in the Next.js `NEXT_PUBLIC_*` vars.
- Expect every NAT/firewall to complete WebRTC without a TURN server.

---

## Rough cost (hobby)

- Vercel Hobby: UI free for low traffic  
- Railway Hobby: API + maybe Postgres/Redis (usage-based; watch idle)  
- MongoDB Atlas M0: free  
- Neon / Upstash free tiers: often enough to try the app  

A single small VPS (DigitalOcean/Hetzner) running `docker compose` can be cheaper if you want API + Postgres + Redis + Mongo on one box. You then own backups, TLS, and upgrades.
