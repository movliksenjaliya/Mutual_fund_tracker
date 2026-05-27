# Mutual Fund Tracker — PRD

## Overview
Personal mobile/web app to track Indian mutual funds with day-over-day drop alerts.
Single-user, no auth. NAV data sourced from public AMFI feed via mfapi.in (primary) and
AMFI's official NAVAll.txt (fallback).

## Core Features

### 1. Dashboard (Home tab) — Portfolio-first
- **Portfolio hero card** (largest): total current value, day-over-day P&L %, invested, holdings count.
  Green background when in profit, brick-red when in loss.
- **"Add your first holding" CTA** when portfolio empty.
- **Drop-alert banner** when unread alerts > 0.
- **Browser notifications banner** prompting permission (web only, dismissible).
- **Market Pulse — Nifty 50 Index** secondary card with NAV + 30-day sparkline.
- **Best buys today**: watchlist funds sorted by biggest day-over-day dips (top 5).
- **Tools**: quick links to SIP & Lumpsum calculators.

### 2. Watchlist tab
- Search any Indian MF via mfapi.in.
- Current NAV + day change pill per fund.
- Target buy price; pill turns green & shows "HIT" when NAV ≤ target.

### 3. Portfolio tab
- Summary card: total value, P&L, invested, returns %.
- Per-holding card: units, avg buy price, current NAV, invested, current, P&L.
- Pencil icon on each card → tap to open Edit screen.

### 4. Edit holding screen `/edit-holding/[id]`
- Header has back arrow + delete (trash icon).
- Live current-NAV card with day change pill.
- **"Bought more units?" section** (highlighted green): enter new units + price → backend
  recomputes weighted average automatically. Live preview of new totals before saving.
  "Use NAV" shortcut button populates current NAV as buy price.
- **Direct edit section**: total units, avg buy price, purchase date, notes.

### 5. Add holding `/add-holding`
- Pre-load current NAV (shown big with day change pill).
- "Use current NAV" shortcut populates avg buy price.
- Optional fields: purchase date, notes.
- Live preview: invested, current value, P&L pill (computed in real time as user types).

### 6. Alerts tab
- List of day-over-day drop notifications (>threshold %).
- Unread count badge on tab icon (terracotta accent).
- Mark all read; pull-to-refresh runs immediate check.

### 7. Fund Detail (`/fund/[code]`)
- 7D / 30D / 90D NAV line chart.
- Add to Watchlist + Add to Portfolio actions.

### 8. Tools
- SIP calculator (monthly amount, years, expected return → future value).
- Lumpsum calculator (one-time amount, years, return → future value).

### 9. Settings
- Configurable drop threshold (default 1%).

## Browser Notifications (Web)
- Permission banner on dashboard for unobtrusive prompt.
- Once granted, polling every 60s checks for new drop alerts and fires
  native `Notification` for each unseen one.
- Seen-ids cached in `localStorage` (keyed `mft_seen_alert_ids`, capped at 200) to avoid
  re-notifying after refresh.
- Native (iOS/Android) builds skip web notifications; the in-app alerts inbox is the
  primary surface.

## NAV Data Pipeline & Fallback
- **Primary**: mfapi.in (`https://api.mfapi.in/mf/{scheme_code}`). 3 retries with backoff.
- **Fallback**: AMFI's official daily NAV dump (`https://www.amfiindia.com/spages/NAVAll.txt`).
  Cached in-process for 1 hour. Returns latest NAV only (no history) — degrades
  gracefully when mfapi.in is offline.

## Buy-more endpoint (backend)
`POST /api/portfolio/{id}/buy-more` with `{units, price}`.
Computes new weighted avg: `(old_units * old_avg + new_units * new_price) / total_units`.

## Tech Stack
- Backend: FastAPI + Motor (MongoDB) + httpx (mfapi.in + AMFI).
- Frontend: Expo Router 6 (file-based routing), react-native-svg for charts.
- Design: Earthy forest-green palette (`#2C4C3B`), accent `#B94A3E`, light theme.

## Deployment
- Backend → Render (free tier, Python 3, root dir `backend/`, env: `MONGO_URL`, `DB_NAME`).
- Frontend → Vercel (Expo web export, root dir `frontend/`, env: `EXPO_PUBLIC_BACKEND_URL`).
- Database → MongoDB Atlas free tier (M0).
- See `/app/DEPLOY.md` for step-by-step instructions.
