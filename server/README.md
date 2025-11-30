# Pomodoro Tracker API

TypeScript Express API that powers authentication, synced sessions, and stats for the Pomodoro Tracker frontend.

## Stack

- Express + TypeScript
- Prisma ORM (SQLite locally, compatible with Postgres in production)
- JWT auth with bcrypt password hashing
- Zod input validation, date-fns analytics helpers

## Getting started

```bash
cd server
cp .env.example .env                 # update values as needed
npm install
npx prisma migrate dev --name init    # creates SQLite dev.db and Prisma Client
npm run dev                           # starts http://localhost:4000
```

Key env vars:

- `DATABASE_URL` – defaults to local SQLite file. Replace with your Postgres connection string before deploying (e.g. `postgresql://...`).
- `JWT_SECRET` – long random string for signing tokens.
- `CORS_ORIGIN` – origin allowed to call the API (use `http://localhost:5173` for Vite dev).
- `ACCESS_TOKEN_TTL` / `REFRESH_TOKEN_TTL` – token lifetimes (15m/7d by default).

## API overview

### Auth

- `POST /auth/signup` – `{ email, password, displayName }` → creates user, returns `{ user, accessToken, refreshToken }`.
- `POST /auth/login` – `{ email, password }` → same response as signup.
- `POST /auth/refresh` – `{ refreshToken }` → returns new `{ accessToken, refreshToken }` pair.
- `GET /auth/me` – bearer token required, returns profile.

### Sessions

All routes require `Authorization: Bearer <accessToken>`.

- `GET /sessions` – list user sessions (newest first).
- `POST /sessions` – create session body `{ goal?, project?, durationMinutes, startTime, endTime, progress?, focusScore?, comment? }`.
- `PUT /sessions/:id` – partial updates with same shape as POST.
- `DELETE /sessions/:id` – remove a session.

### Stats

- `GET /stats/summary` – aggregates today + week focus minutes, average progress, average focus score for the authenticated user.

## Deploying the API

1. Provision a Postgres database (Render, Railway, Supabase, etc.).
2. Push the repo to GitHub and create a new service (Render Web Service / Railway) pointing at `server`.
3. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `PORT` (Render injects), `CORS_ORIGIN` (site URL), token TTLs as needed.
4. Run `npx prisma migrate deploy` as a build command before `npm run build`/`npm run start`.
5. Update the frontend `.env` (e.g., `VITE_API_URL=https://your-api.onrender.com`) and wire fetch calls to the endpoints above.
