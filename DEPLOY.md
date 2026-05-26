# Free Deployment Guide — Mutual Fund Tracker

This guide walks you through hosting your app on the internet **for free**, with a permanent web link. No coding required — just clicking buttons in your browser.

You'll set up 3 things:

| Part | Where it lives (free) | Time |
|---|---|---|
| 1. **Database** — MongoDB Atlas | cloud.mongodb.com | 5 min |
| 2. **Backend** — Render | render.com | 10 min |
| 3. **Frontend** — Vercel | vercel.com | 5 min |

Total: ~20–30 min. You'll need a GitHub account, an email, and a phone number for verification on some sites.

---

## Step 0 — Push your code to GitHub

1. Open your Emergent project.
2. Click the **"Save to GitHub"** button (top of the screen).
3. Authorize Emergent to access GitHub if asked.
4. Pick a repository name like `mutual-fund-tracker` and click **Push**.
5. After it finishes, you should see your code at `https://github.com/YOUR_USERNAME/mutual-fund-tracker`.

---

## Step 1 — Create a free MongoDB database (Atlas)

1. Go to **https://cloud.mongodb.com** and sign up (free, email + password).
2. After signup, it asks "What kind of cluster?" → pick **M0 (FREE)** and click **Create**.
   - Provider: AWS (default is fine)
   - Region: any close to you
   - Cluster name: leave as default (`Cluster0`)
3. **Create a database user**:
   - Username: `mfuser`
   - Password: click **"Autogenerate Secure Password"** and **copy + save this password** somewhere — you'll need it.
   - Click **Create User**.
4. **Allow access from anywhere**:
   - Under "Network Access" → **Add IP Address** → click **"Allow Access from Anywhere"** (`0.0.0.0/0`) → **Confirm**.
5. **Get your connection string**:
   - Click **Connect** on your cluster → **Drivers** → copy the string. It looks like:
     ```
     mongodb+srv://mfuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password you saved.
   - **Save this full string** — you'll paste it into Render next.

---

## Step 2 — Deploy the backend on Render

1. Go to **https://render.com** and sign up (free, "Sign in with GitHub" is easiest).
2. On your dashboard, click **New +** → **Web Service**.
3. Connect your GitHub repo (`mutual-fund-tracker`) → **Connect**.
4. Fill in these settings:

   | Field | Value |
   |---|---|
   | **Name** | `mf-tracker-backend` (anything you like) |
   | **Region** | Singapore (closest to India) |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt` |
   | **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
   | **Instance Type** | **Free** |

5. Scroll down to **Environment Variables** → click **Add Environment Variable** twice:

   | Key | Value |
   |---|---|
   | `MONGO_URL` | (paste the Atlas connection string from Step 1) |
   | `DB_NAME` | `mf_tracker` |

6. Click **Create Web Service**. It will take 3–5 minutes to build.
7. When done, you'll see a green "Live" badge and a URL like:
   ```
   https://mf-tracker-backend.onrender.com
   ```
8. **Test it**: open `https://mf-tracker-backend.onrender.com/api/` in your browser. You should see:
   ```json
   {"message":"Mutual Fund Tracker API"}
   ```
   If yes — backend is live!  **Copy this URL**, you'll need it next.

> **Note on Render free tier:** the backend sleeps after 15 min of no traffic. The first request after sleeping takes ~30 sec to wake up. After that it's fast again. Totally fine for personal use.

---

## Step 3 — Deploy the frontend on Vercel

1. Go to **https://vercel.com** and sign up (free, "Continue with GitHub").
2. On the dashboard, click **Add New…** → **Project**.
3. Find your `mutual-fund-tracker` repo → **Import**.
4. Fill in these settings:

   | Field | Value |
   |---|---|
   | **Framework Preset** | Other |
   | **Root Directory** | `frontend` (click "Edit" to set this) |
   | **Build Command** | leave default (already set in vercel.json) |
   | **Output Directory** | leave default |

5. Expand **Environment Variables** and add ONE:

   | Key | Value |
   |---|---|
   | `EXPO_PUBLIC_BACKEND_URL` | (paste your Render URL from Step 2, e.g. `https://mf-tracker-backend.onrender.com`) |

   ⚠️ No trailing slash at the end!

6. Click **Deploy**. It will build for 2–4 minutes.
7. When done, you'll see confetti and a URL like:
   ```
   https://mutual-fund-tracker.vercel.app
   ```
8. **Open that URL on your phone or laptop browser** — your app is live and shareable! 🎉

---

## Step 4 — Bookmark and use

- Add the Vercel URL to your phone's home screen for app-like access:
  - **iPhone (Safari):** tap Share → "Add to Home Screen"
  - **Android (Chrome):** tap ⋮ → "Add to Home screen"
- It will open like a real app, fullscreen.

---

## Troubleshooting

**"Connection refused" or "Network error" in the app**
- Wait 30 seconds — Render free backend may be waking up. Refresh.
- Confirm `EXPO_PUBLIC_BACKEND_URL` in Vercel has no trailing slash and points to your Render URL.

**Backend deploy fails on Render with "module not found"**
- Make sure the **Root Directory** is set to `backend` (not blank).

**Frontend shows blank white screen**
- Open browser DevTools (F12) → Console tab → look for the API URL. If it says `undefined`, the env var didn't get set. Go to Vercel → your project → **Settings → Environment Variables** → add `EXPO_PUBLIC_BACKEND_URL`, then **Deployments** → click "Redeploy".

**MongoDB "authentication failed"**
- Double-check the password you put in `MONGO_URL` matches the user you created in Atlas. No `<` or `>` brackets.

**Alerts not appearing**
- The 30-minute background task only runs while the backend is awake. Open the Alerts tab and pull to refresh — that triggers an immediate check.

---

## Updating your app later

Whenever you change code in Emergent and push to GitHub again:
- **Vercel** auto-redeploys the frontend in ~2 min.
- **Render** auto-redeploys the backend in ~3 min.

No manual steps. ✨

---

## Free tier limits (good to know)

| Service | Free limit |
|---|---|
| MongoDB Atlas | 512 MB storage (enough for ~50,000 portfolio rows) |
| Render | 750 hours/month + sleeps after 15 min idle |
| Vercel | 100 GB bandwidth/month, unlimited static hosting |

For a personal mutual fund tracker, you'll never hit these.

---

**Done!** You have a permanent free link you can share, bookmark, and use from any phone or computer.
