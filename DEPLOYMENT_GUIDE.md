# CABkaro — Free Deployment Guide
**Frontend → Vercel | Backend → Railway | Database → Railway PostgreSQL**

> Everything below is 100% free on the hobby/free tier.  
> Total time: ~30 minutes.

---

## Overview

```
Browser
  │
  ├── https://your-app.vercel.app          ← React frontend (Vercel, free)
  │         │
  │         └── /api/*  ──────────────────► https://your-backend.up.railway.app  (Spring Boot, Railway free)
  │                                                   │
  │                                                   └── PostgreSQL  (Railway free 1 GB)
```

---

## Prerequisites

- [Git](https://git-scm.com/) installed locally
- A [GitHub](https://github.com) account (both Vercel and Railway deploy from GitHub)
- Node.js 20+ installed (already have it — used for build)
- Java 17+ installed (already have it)

---

## Part 1 — Push Code to GitHub

### 1.1 Create a GitHub repository

1. Go to https://github.com/new
2. Repository name: `cab-booking-system` (or any name)
3. Set to **Public** or **Private** — both work
4. Do **NOT** check "Add README" (you already have code)
5. Click **Create repository**

### 1.2 Push your code

Open a terminal in `C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem` and run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cab-booking-system.git
git push -u origin main
```

> **Important:** Make sure your `.gitignore` excludes `.env` and `target/` (already configured).

---

## Part 2 — Deploy Backend on Railway (Free)

Railway gives you **$5 free credit/month** — enough to run the Spring Boot app + PostgreSQL.

### 2.1 Sign up for Railway

1. Go to https://railway.app
2. Click **Login** → **Login with GitHub**
3. Authorize Railway

### 2.2 Create a new project

1. Click **New Project**
2. Choose **Deploy from GitHub repo**
3. Connect your GitHub account if prompted
4. Select `cab-booking-system`
5. Railway will auto-detect the `Procfile` → it will use:
   ```
   web: java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar
   ```

### 2.3 Add PostgreSQL database

1. Inside your Railway project, click **+ New**
2. Choose **Database** → **Add PostgreSQL**
3. Railway creates a PostgreSQL instance automatically
4. Click on the PostgreSQL service → **Connect** tab
5. Copy these values (you'll need them in the next step):
   - `PGHOST` (host)
   - `PGPORT` (port, usually 5432)
   - `PGDATABASE` (database name)
   - `PGUSER` (username)
   - `PGPASSWORD` (password)

### 2.4 Set environment variables for the backend

1. Click on your **Spring Boot service** in Railway
2. Go to **Variables** tab
3. Add each variable one by one:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://PGHOST:PGPORT/PGDATABASE` (replace PGHOST/PGPORT/PGDATABASE with Railway values) |
| `DB_USERNAME` | Your Railway PostgreSQL `PGUSER` |
| `DB_PASSWORD` | Your Railway PostgreSQL `PGPASSWORD` |
| `JWT_SECRET` | Any long random string, e.g. `dGhpcyFpc0FTdXBlclNlY3JldEtleUZvckpXVEF1dGhlbnRpY2F0aW9u` |
| `JWT_EXPIRATION` | `86400000` |
| `GOOGLE_MAPS_API_KEY` | Your Google Maps key (or leave empty — OSRM fallback is built in) |
| `FRONTEND_URL` | `https://your-app.vercel.app` ← fill in after Vercel deploy |
| `PORT` | `8080` |

> **DATABASE_URL format example:**
> ```
> jdbc:postgresql://containers-us-west-999.railway.app:5432/railway
> ```

### 2.5 Deploy the backend

1. Railway will auto-build on every push to `main`
2. Click **Deploy** if it hasn't started yet
3. Wait ~3-4 minutes for Maven to build the JAR
4. Once deployed, go to **Settings** → **Networking** → click **Generate Domain**
5. Copy your backend URL, e.g. `https://cab-booking-system-production.up.railway.app`

### 2.6 Test the backend

Open your browser and go to:
```
https://your-backend.up.railway.app/actuator/health
```
You should see: `{"status":"UP"}`

---

## Part 3 — Deploy Frontend on Vercel (Free)

Vercel's Hobby plan is completely free with no time limits.

### 3.1 Sign up for Vercel

1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel

### 3.2 Import your project

1. Click **Add New** → **Project**
2. Find `cab-booking-system` in the list → click **Import**

### 3.3 Configure the build settings

Vercel needs to know the frontend is inside a subdirectory:

| Setting | Value |
|---|---|
| **Framework Preset** | `Vite` |
| **Root Directory** | `rapido-frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

> Click the **Root Directory** pencil icon and type `rapido-frontend` — this is critical.

### 3.4 Set environment variables

Still on the Vercel import screen, scroll down to **Environment Variables** and add:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app` (your Railway URL from step 2.5) |
| `VITE_GOOGLE_CLIENT_ID` | `958477394526-r2rrdejev42hpt3a9imi5a2fbfspfpsh.apps.googleusercontent.com` |
| `VITE_GOOGLE_MAPS_KEY` | Your Google Maps API key (optional — OSRM fallback works without it) |

### 3.5 Deploy

1. Click **Deploy**
2. Vercel builds and deploys in ~1-2 minutes
3. You'll get a URL like: `https://cab-booking-system.vercel.app`

---

## Part 4 — Post-Deployment Steps

### 4.1 Update FRONTEND_URL on Railway

Now that you have your Vercel URL:
1. Go to Railway → your Spring Boot service → **Variables**
2. Update `FRONTEND_URL` = `https://cab-booking-system.vercel.app`
3. Railway will redeploy automatically

### 4.2 Update Google OAuth authorized origins

Your Google login will fail unless you add Vercel to the allowed origins:

1. Go to https://console.cloud.google.com/
2. **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Under **Authorised JavaScript origins**, add:
   - `https://cab-booking-system.vercel.app`
5. Under **Authorised redirect URIs**, add:
   - `https://cab-booking-system.vercel.app`
6. Click **Save** (takes up to 5 minutes to propagate)

### 4.3 Verify the full flow

1. Open `https://cab-booking-system.vercel.app`
2. Sign up with phone number or Google
3. Book a ride — it should hit your Railway backend
4. Check Railway logs: **your-service** → **Deployments** → **View Logs**

---

## Part 5 — Run Locally (Quick Reminder)

### Frontend only (hot reload)
```bash
cd rapido-frontend
npm install
npm run dev
# Opens http://localhost:5173
# Vite proxy forwards /api → http://localhost:8080
```

### Backend only
```bash
# Option A: Maven wrapper
./mvnw spring-boot:run

# Option B: With IntelliJ — just Run the main class
```

### Full stack locally
Run both commands above in separate terminals. The frontend proxies API calls to the backend automatically via `vite.config.js`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Vercel shows blank page | Check Root Directory is set to `rapido-frontend` in Vercel settings |
| API calls return 404 | `VITE_API_URL` env var not set in Vercel — add it and redeploy |
| CORS error in browser | `FRONTEND_URL` on Railway doesn't match your exact Vercel URL |
| Google login fails | Add Vercel URL to Google OAuth authorised origins (step 4.2) |
| Railway build fails | Check Railway logs — usually a missing env var or Java version mismatch |
| DB connection error | Verify `DATABASE_URL` format: `jdbc:postgresql://HOST:PORT/DBNAME` |
| `/actuator/health` returns 503 | App started but DB unreachable — check DB env vars |
| `JWT_SECRET` error | Must be at least 32 characters (256 bits) |

---

## Environment Variables Summary

### Railway (Backend)
```
DATABASE_URL=jdbc:postgresql://HOST:PORT/DBNAME
DB_USERNAME=your_pg_user
DB_PASSWORD=your_pg_password
JWT_SECRET=any-long-random-string-minimum-32-chars
JWT_EXPIRATION=86400000
GOOGLE_MAPS_API_KEY=          # optional
FRONTEND_URL=https://your-app.vercel.app
PORT=8080
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-backend.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_GOOGLE_MAPS_KEY=         # optional, OSRM fallback built-in
```

---

## Free Tier Limits

| Service | Free Limit | Notes |
|---|---|---|
| **Vercel Hobby** | Unlimited deployments, 100 GB bandwidth/month | No sleep, instant CDN |
| **Railway** | $5 credit/month | App + DB together use ~$3-4/month |
| **Railway PostgreSQL** | 1 GB storage | Included in $5 credit |
| **Google OAuth** | Free | No billing needed for auth |
| **OSRM routing** | Free, unlimited | Used when no Google Maps key |
| **Google Maps Routes API** | 10,000 req/month free | Optional — OSRM is the fallback |

> Railway's $5/month free credit is enough to keep both the Spring Boot service and PostgreSQL running 24/7.

---

*Generated for CABkaro — Spring Boot 3.5 + React + Vite + PostgreSQL*
