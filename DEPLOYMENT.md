# Deployment Playbook

This project ships as two deployable units:

1. **Backend API (`server/`)** – Express + Prisma + JWT
2. **Frontend (`app/`)** – Vite/React static bundle

Follow the steps below to ship both pieces and keep them in sync.

## 1. Backend API (Render example)

1. **Provision Postgres**
   - Create a free Postgres instance (Render, Railway, Neon, Supabase…).
   - Grab the connection string → use it later for `DATABASE_URL`.
2. **Push the repo to GitHub** (already done) and connect Render → *New Web Service*.
3. **Configure build & runtime**
   - Root directory: `server`
   - Build command: `npm install && npx prisma migrate deploy && npm run build`
   - Start command: `npm run start`
   - Runtime: Node 20+
4. **Set environment variables**
   - `DATABASE_URL=postgresql://…`
   - `JWT_SECRET=<long random string>`
   - `CORS_ORIGIN=https://<your-netlify-site>.netlify.app`
   - `ACCESS_TOKEN_TTL=15m` (optional override)
   - `REFRESH_TOKEN_TTL=7d` (optional override)
5. **Deploy**
   - Render will build, run migrations, and expose `https://your-api.onrender.com`.
   - Hit `/health` to confirm.

> **Railway/Fly alternative:** same steps, but add a `railway.toml`/`fly.toml` if desired. Always run `prisma migrate deploy` before `npm run start`.

## 2. Frontend (Netlify example)

1. Connect the GitHub repo → *New Site from Git*.
2. Build settings:
   - Base directory: `app`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add `VITE_API_URL=https://your-api.onrender.com` to Netlify environment variables.
4. Deploy – Netlify installs dependencies, builds, and serves the static bundle.
5. Optional: set up a custom domain → point Netlify to your domain + update `CORS_ORIGIN` on the API.

## 3. Local verification before shipping

```bash
# Backend
cd server
npm install
cp .env.example .env  # fill secrets
npx prisma migrate dev
npm run dev           # verify http://localhost:4000

# Frontend
cd ../app
npm install
cp .env.example .env  # ensure VITE_API_URL points to backend
npm run dev           # verify login + logging
```

## 4. Post-deploy checklist

- ✅ `curl https://your-api/health`
- ✅ Netlify site loads + login works against hosted API
- ✅ Session actions persist (check Postgres tables)
- ✅ Update `VITE_API_URL` locally if you switch between dev/production APIs

With these steps you can redeploy by simply pushing to `main` – Render & Netlify will rebuild automatically.
