# Mutual Fund Tracker — PRD

## Overview
A personal mobile app to track Indian mutual funds with day-over-day drop alerts.
Built as a single-user app with no authentication. NAV data sourced from public AMFI feed via mfapi.in.

## Core Features

### 1. Dashboard (Home tab)
- Pinned Nifty 50 Index Fund card (UTI Nifty 50 Index Fund Direct Growth, scheme code 120716)
  with live NAV, day change %, and 30-day NAV mini-chart.
- Portfolio summary card showing total current value, P&L, invested, and holdings count.
- Drop-alert banner (shown only when unread alerts exist).
- "Best buys today" widget — watchlist funds sorted by biggest day-over-day dips (top 5).
- Quick-access SIP and Lumpsum calculators.

### 2. Watchlist tab
- Search/add any Indian MF via mfapi.in search.
- Current NAV + day change pill per fund.
- Target buy price per fund; pill turns green when NAV ≤ target ("HIT").
- Tap fund → fund detail; X → remove.

### 3. Portfolio tab
- Summary card: total current value, P&L (₹ + %), invested, returns %.
- Per-holding card: units, avg buy price, current NAV, invested, current, P&L.
- Add via search → add-holding modal (units + avg price).

### 4. Alerts tab
- List of day-over-day drop notifications (>threshold %).
- Unread count badge on tab icon (terracotta accent).
- Mark all read; pull to refresh triggers immediate re-check.

### 5. Fund Detail
- 7D / 30D / 90D NAV line chart.
- Add to Watchlist + Add to Portfolio actions.

### 6. Tools
- SIP calculator (monthly amount, years, expected return → future value).
- Lumpsum calculator (one-time amount, years, return → future value).

### 7. Settings
- Configurable drop threshold (default 1%).

## Notification Mechanism
- Background asyncio loop runs every 30 minutes and checks Nifty + all watchlist + portfolio
  fund codes for day-over-day NAV drops ≥ threshold.
- Alerts deduplicated by `(scheme_code, nav_date)`.
- WhatsApp/email integrations skipped per user choice — in-app inbox only.

## Tech Stack
- Backend: FastAPI + Motor (MongoDB) + httpx (mfapi.in).
- Frontend: Expo Router 6 (file-based), react-native-svg for charts.
- Design: Earthy forest-green palette (`#2C4C3B`), light theme.

## Limits
- mfapi.in has no API key but is rate-limited; we cache via per-request httpx calls.
- Background task runs in-process; restarts on server reload.
