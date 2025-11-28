# Pomodoro Tracker

Multi-profile focus timer with per-user session history, competition stats, and a responsive dashboard. Built with React, TypeScript, and Vite.

## Features

- Track Pomodoro sessions with goals, project tags, and auto-resizing inputs.
- Maintain multiple local profiles with isolated session storage and quick switching.
- Compare against a selected rival in the Compete panel (today vs. week totals and averages).
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
