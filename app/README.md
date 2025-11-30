# Pomodoro Tracker

Multi-profile focus timer with per-user session history, competition stats, and a responsive dashboard. Built with React, TypeScript, and Vite.

## Features

- Track Pomodoro sessions with goals, project tags, and auto-resizing inputs.
- Maintain multiple local profiles with isolated session storage and quick switching.
- Log in with the new auth panel to sync sessions to the Express/Prisma backend (guest mode still works offline).
- Review focus insights in the Compete panel (friend slot placeholder until cloud sharing ships).
- Persist data in IndexedDB via localforage; works fully offline.

## Development

```bash
cd app
npm install
npm run dev
```

- `npm run test` – add if/when tests exist.
- `npm run build` – produces the production bundle in `app/dist`.

## Deploying to Netlify

This repo includes a `netlify.toml` at the root so Netlify knows to run `npm run build` inside the `app` directory and publish `dist`.

### 0. Prepare the repository

```bash
# from repo root
git init                    # skip if already a git repo
git remote add origin git@github.com:<user>/<repo>.git  # or https URL
git add .
git commit -m "Initial commit"
git push -u origin main      # or whichever default branch name you prefer
```

Make sure the pushed repo contains the root-level `netlify.toml` plus the `app` folder.

### 1. Publish via Netlify dashboard

1. Sign in at [Netlify](https://app.netlify.com/) → **Add new site → Import an existing project**.
2. Pick the Git provider (GitHub/GitLab/Bitbucket) and authorize access.
3. Choose this repository and keep the detected settings:
	- **Base directory**: `app`
	- **Build command**: `npm run build`
	- **Publish directory**: `dist`
4. Click **Deploy site**. Netlify installs dependencies, runs the build, and serves `dist` on a global CDN.
5. Every push to the tracked branch triggers an automatic rebuild + redeploy.

### Manual deploy (optional)

If you need to upload without connecting Git:

```bash
cd app
npm run build
netlify deploy --dir=dist        # requires Netlify CLI and auth
```

Use `netlify deploy --prod --dir=dist` once you confirm the draft preview.

## Connecting to the backend API

The repo now ships with a TypeScript Express API under `server/` for real authentication + synced session storage.

1. Follow `server/README.md` to copy `.env`, run Prisma migrations, and start the API (`npm run dev`).
2. The frontend already reads `VITE_API_URL` from `app/.env` (see `.env.example`). Adjust this to point at your deployed API when you leave localhost.
3. The header’s Profile area now includes login + signup. Once authenticated, all session mutations hit `/auth/*`, `/sessions`, and `/stats/summary` behind the scenes; guest mode falls back to a local IndexedDB cache.
4. Deploy the API (Render/Railway) before pointing Netlify at the hosted URL so the login endpoint is reachable.

Guest sessions remain fully usable offline, but they stay on the current device. Log in whenever you want those blocks synced to the backend.
