## PomodoroTracker – Goal Description

### Vision
Create a distraction-free, Notion-inspired Pomodoro web application that helps individuals capture every focus block, stay aware of progress across projects, and reflect through minimalist insights. The experience must feel elegant, intentional, and lightweight enough to run entirely on a user’s machine.

### Target Users
- Individual knowledge workers, students, or freelancers who rely on Pomodoro-based scheduling.
- People who prefer a self-hosted or local-only workflow with full control of their focus-history data.

### Core Experience
#### Smart Pomodoro Timer
- Default cycle: 25‑minute focus, 5‑minute short break, four rounds followed by a 20‑minute long break.
- Modes: Auto (continuous loop) or Manual (user starts each segment). Auto loops until the user stops it; users can pause or end any segment early and still log the elapsed duration.
- Mid-cycle flexibility: During a break users can edit the upcoming focus duration; during focus they can change the next break length.
- Notifications: Built-in browser notifications plus a curated set of elegant audio cues the user can choose from.

#### Goal & Session Tracker
- Every completed (or manually ended) segment auto-populates a table row with start time, end time, duration, project, goal, progress, focus level, and comment.
- `Project` uses a dropdown that remembers previously used entries; `Goal` remains free text.
- `Progress` is a user-entered percentage. `Focus level (1–10)` and `Comment` are optional but encouraged via inline prompts.
- Table should support quick filtering/sorting so users can zoom in on specific projects or days.

#### Insightful Statistics
- Present beautiful minimalist visualizations (e.g., sparkline trends, stacked bars, donut/area charts) for totals, per-week activity, project distribution, and time-of-day patterns.
- Allow drill-down from charts back to the underlying session rows for context.

#### Data Ownership
- All session data persists locally via a downloadable JSON file (default storage in IndexedDB or LocalStorage, with optional "Export/Import" controls).
- No backend services; the app runs entirely on the client.

### User Experience & UI Requirements
- Aesthetic direction: monochrome/neutral palette reminiscent of Notion, purposeful typography, spacious layout, soft micro-interactions.
- Provide both light and dark modes with a single toggle, ensuring charts and progress bars adapt gracefully.
- Responsive design optimized for desktop first, with usable mobile/tablet layouts.
- Accessibility considerations: keyboard-operable timer controls, sufficient contrast, polite notification sounds, and aria labels for charts/forms.

### Technical Preferences
- Pure web app (HTML/CSS/JS or a lightweight framework such as React, Svelte, or similar). Final stack can be decided during implementation planning.
- Modular architecture separating timer logic, data storage, analytics, and presentation, easing future enhancements like cloud sync or collaboration.

### Success Criteria
- Users can run continuous Pomodoro cycles with customizable durations, receive notifications, and log every block automatically.
- Goal tracker reflects accurate timestamps and user-supplied qualitative data without manual duplication.
- Statistics page offers at-a-glance insight while allowing deeper exploration.
- Data never leaves the user’s device unless they explicitly export it.
- Overall experience feels calm, elegant, and genuinely helpful for daily focus.

## Project Update 11/28/2025 3:17 pm

- Rebuilt the app shell (App.tsx, App.css) into a two-column dashboard with a Notion-inspired palette, plus light/dark theme tokens in src/styles/theme.css and simplified globals in index.css. Theme toggling is handled via src/hooks/useThemeMode.ts and components/Layout/PageHeader.tsx.
- Implemented the timer foundation: a reusable state machine in src/hooks/usePomodoroMachine.ts with configurable durations, auto-cycle support, pause/resume/skip/manual log actions, and lifecycle callbacks for future session logging. Supporting utilities live in src/lib/constants.ts, src/lib/types.ts, and src/lib/time.ts.
- Built a functional timer UI (components/Timer/TimerCard.tsx) with live clock, primary/secondary controls, auto-mode toggle, and editable focus/break settings that apply to upcoming segments.
- Added placeholders for the session log and stats panes (components/SessionTable/SessionTable.tsx, components/Stats/StatsPlaceholder.tsx) that already show captured segment summaries, ensuring the rest of the workflow has scaffolding.
  
### Tests

```
npm run build
```

### Next Steps

- Convert segment events into richer session records (project, goal, progress inputs) and persist to IndexedDB with month-based JSON export/import.
- Replace the placeholder table with editable rows, dropdown project memory, and contextual prompts for focus level/comments.
- Implement the minimalist insight visualizations and wire them to filters (by week, project, time-of-day), then add GH Pages deployment config/scripts.

## Project Update 11/28/2025 4:42 pm

- Introduced React Router with `BrowserRouter`, turning `App.tsx` into a shell that routes `/` to the rhythm dashboard and `/insights` to a dedicated analytics surface.
- Added `pages/Dashboard.tsx` and `pages/Insights.tsx`, keeping the timer + session list on the home view while moving the insights panel to its own page as requested.
- Upgraded `PageHeader` with minimalist navigation links (Rhythm / Insights) alongside the existing theme toggle, plus matching global styles so the header aligns with the Notion-inspired aesthetic.
- Confirmed the new layout builds cleanly with `npm run build`, so the project is ready for the next functional layers.

### Tests

```
npm run build
```

### Next Steps

- Flesh out session logging: convert segment events into full records (project dropdown, manual progress/focus/comment) and show them in the table.
- Add local persistence via IndexedDB with month-scoped JSON export/import controls.
- Replace the insights placeholder with minimalist charts (weekly cadence, project split, time-of-day) powered by stored sessions.
- Wire up a GitHub Pages deployment workflow for easy publishing once the core features land.

## Project Update 11/28/2025 6:08 pm

- Reimagined the session log to read like a comparison matrix: rows now group under day headers, cells keep a consistent vertical rhythm, textareas auto-grow, and each project chip inherits a deterministic accent color while the delete action shrank to an × icon for less visual noise.
- Introduced a reusable `CircleMeter` component (SVG-based ring + numeric input) and swapped both the Progress and Focus columns over to it, so users get matching circular indicators instead of misaligned bars.
- Updated the supporting CSS to accommodate the new grouping rows, colored project pills, and circular meters while maintaining the monochrome palette.
- Ran `npm run build` to ensure the new components compile cleanly (Vite still warns about bundle size; future code-splitting remains on the backlog).

### Tests

```
npm run build
```

### Next Steps

- Polish the Insights page (Recharts visuals) and prep the GitHub Pages deployment workflow once analytics feel stable.
- Consider code-splitting or raising the Vite chunk limit warning if bundle size continues to grow.

## Project Update 11/28/2025 6:32 pm

- Fine-tuned the comparison-style session matrix so every column now has an intentional width: date/phase/project columns stay compact, goal/comment cells stretch for free text, the circular meters remain balanced, and the × action column shrank to match the new icon button.
- Rebuilt after the CSS adjustments (`npm run build`) to verify the grid still compiles; only the existing Vite chunk-size warning persists.

### Tests

```
npm run build
```

## Project Update 11/28/2025 6:45 pm

- Made the comparison-style session table responsive: each column now uses CSS `clamp()` widths so it expands on wide viewports but contracts gracefully, and the table enforces a `min-width: 960px` so smaller screens trigger a horizontal scrollbar instead of causing the layout to spill offscreen.
- Enabled momentum scrolling on touch devices and re-ran `npm run build` to confirm nothing regressed (the Vite bundle-size warning still serves as a reminder to consider code-splitting later).

### Tests

```
npm run build
```

## Project Update 11/28/2025 7:02 pm

- Upgraded the Project column so it behaves like the other free-text areas: the field is now a multi-line textarea that auto-expands with content, inherits the project color accent, and shows quick suggestion chips pulled from past entries for one-click reuse.
- Cleaned up the redundant datalist markup, refreshed the associated CSS (flex stack + chips), and re-ran the build to ensure the new component wiring compiles (Vite still flags the large bundle for future splitting).

### Tests

```
npm run build
```

## Project Update 11/28/2025 7:30 pm

- Added a lightweight profile/login experience: the new `ProfileProvider` stores multiple teammates in local storage, exposes an active user + optional rival, and the header now includes a `ProfileSwitcher` for live context switching and quick teammate creation.
- Namespaced the IndexedDB session store by profile ID so each login sees an isolated log, plus exposed `loadSessionsForUser` to fetch a friend’s history without swapping accounts.
- Introduced a right-side “Compete” panel beside the timer that compares you and your selected friend across today’s focus minutes, week-to-date minutes, average progress, and average focus quality using the new `buildUserFocusSnapshot` helper. The layout adapts responsively and shows placeholders until a teammate is selected.
- Verified the full feature set with `npm run build`; the known Vite chunk warning remains.

### Tests

```
npm run build
```