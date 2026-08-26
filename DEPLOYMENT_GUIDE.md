# 🚖 CABkaro — Complete Deployment Guide

> Spring Boot 3.5 + React (Vite) + PostgreSQL 17  
> Single JAR full-stack deployment or split frontend/backend

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Production Build](#2-production-build)
3. [Option A — Railway (Full-Stack, Recommended)](#3-option-a--railway-full-stack-recommended)
4. [Option B — Render (Full-Stack Alternative)](#4-option-b--render-full-stack-alternative)
5. [Option C — Split Deploy (Vercel + Railway)](#5-option-c--split-deploy-vercel--railway)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Database Notes](#7-database-notes)
8. [API Quick Test](#8-api-quick-test)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Local Development Setup

### Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Java (JDK) | 17+ | `java -version` |
| Maven | 3.6+ | `mvn --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 13+ | `psql --version` |

### Step 1 — Start PostgreSQL

Ensure PostgreSQL is running. On Windows:

```powershell
# Check service status
Get-Service -Name "*postgresql*"

# Start if stopped
Start-Service -Name "postgresql-x64-17"
```

Your local DB config (`application.properties`):
```
Host:     localhost
Port:     5432
Database: postgres
Username: postgres
Password: Ajay@2003
```

### Step 2 — Configure Environment

The app works out of the box with `application.properties`. Optionally add a Google Maps API key for real road distances:

```properties
# src/main/resources/application.properties
google.maps.api.key=YOUR_KEY_HERE   # Leave blank to use Haversine fallback
```

### Step 3 — Build & Run (Full Stack, Single Command)

```cmd
cd C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem
mvn package -DskipTests
java -jar target\CabBookingManagementSystem-0.0.1-SNAPSHOT.jar
```

App available at: **http://localhost:8080**

### Step 3 (Alternative) — Run Backend + Frontend Separately (Hot Reload)

**Terminal 1 — Backend:**
```cmd
cd C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem
mvn spring-boot:run
```
Backend at: **http://localhost:8080**

**Terminal 2 — Frontend (Vite hot reload):**
```cmd
cd C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem\rapido-frontend
npm install
npm run dev
```
Frontend at: **http://localhost:5173** (proxies `/api` → `:8080`)

---

## 2. Production Build

The Maven build automatically:
1. Installs Node v20.15.0 (if needed)
2. Runs `npm install` in `rapido-frontend/`
3. Runs `npm run build` → produces `rapido-frontend/dist/`
4. Copies `dist/` into Spring Boot's `static/` folder
5. Packages everything into a single fat JAR

```cmd
mvn package -DskipTests
```

Build output:
```
target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar   ← Deploy this
```

Expected output on success:
```
[INFO] ✓ built in 4.76s           ← React build
[INFO] BUILD SUCCESS               ← Maven build
```

---

## 3. Option A — Railway (Full-Stack, Recommended)

Deploy the entire app as **one service** — Spring Boot serves both the API and the React UI.

**Cost:** Free tier available (500 hrs/month)

### Step 1 — Push Code to GitHub

```bash
cd C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem
git init
git add .
git commit -m "feat: CABkaro cab booking system"
git remote add origin https://github.com/YOUR_USERNAME/cabkaro.git
git push -u origin main
```

> ⚠️ Before pushing, check `.gitignore` — make sure `application.properties` with your local password is excluded, or replace credentials with environment variable placeholders.

### Step 2 — Create a Railway Account

Go to → **https://railway.app** → Sign up with GitHub (free)

### Step 3 — Create New Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Choose your `cabkaro` repository
4. Railway auto-detects Java/Maven — no extra config needed

### Step 4 — Add PostgreSQL Database

1. In your project dashboard → **New** → **Database** → **Add PostgreSQL**
2. Railway creates the DB and sets `DATABASE_URL` automatically
3. Click on the PostgreSQL service → **Variables** tab → copy:
   - `PGHOST`
   - `PGPORT`
   - `PGDATABASE`
   - `PGUSER`
   - `PGPASSWORD`

### Step 5 — Set Environment Variables

In your **app service** → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `DATABASE_URL` | *(auto-injected by Railway PostgreSQL)* |
| `DB_USERNAME` | *(copy from Railway PostgreSQL → PGUSER)* |
| `DB_PASSWORD` | *(copy from Railway PostgreSQL → PGPASSWORD)* |
| `JWT_SECRET` | *(generate a secure value — see below)* |
| `JWT_EXPIRATION` | `86400000` |
| `PORT` | `8080` |
| `GOOGLE_MAPS_API_KEY` | *(optional — leave empty for Haversine)* |
| `GOOGLE_OAUTH_CLIENT_ID` | `958477394526-r2rrdejev42hpt3a9imi5a2fbfspfpsh.apps.googleusercontent.com` |

**Generate a secure JWT secret (PowerShell):**
```powershell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### Step 6 — Set Build & Start Commands

In your service → **Settings** tab:

- **Build Command:** `mvn package -DskipTests`
- **Start Command:** `java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar`

> Railway also reads the `Procfile` at the project root — it's already configured:
> ```
> web: java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar
> ```

### Step 7 — Deploy

Railway triggers a deploy automatically. Watch the **Deployments** tab for logs.

✅ **Your app URL:** `https://cabkaro-production.up.railway.app`

---

## 4. Option B — Render (Full-Stack Alternative)

**Cost:** Free tier available (spins down after 15 min inactivity)

### Steps

1. Go to **https://render.com** → New → **Web Service**
2. Connect your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Runtime** | Java |
| **Build Command** | `mvn package -DskipTests` |
| **Start Command** | `java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar` |
| **Instance Type** | Free |

4. Add a **PostgreSQL** database:
   - New → PostgreSQL
   - Copy the **Internal Database URL**

5. Set **Environment Variables** (same as Railway Option A Step 5)

6. Click **Create Web Service** → Deploy

✅ **Your app URL:** `https://cabkaro.onrender.com`

---

## 5. Option C — Split Deploy (Vercel + Railway)

Use this when you want:
- Frontend on `vercel.app` (CDN, fast global delivery)
- Backend on Railway (persistent server)

### Part 1 — Deploy Backend on Railway

Follow **Option A** steps 1–7 completely.

Note your backend URL: `https://cabkaro-backend.up.railway.app`

### Part 2 — Configure Frontend for Production

Create `rapido-frontend/.env.production`:
```env
VITE_API_URL=https://cabkaro-backend.up.railway.app
VITE_GOOGLE_CLIENT_ID=958477394526-r2rrdejev42hpt3a9imi5a2fbfspfpsh.apps.googleusercontent.com
```

### Part 3 — Deploy Frontend on Vercel

**Option A — Vercel Dashboard (recommended):**
1. Go to **https://vercel.com** → New Project
2. Import your GitHub repo
3. Set **Root Directory** to `rapido-frontend`
4. Build settings (auto-detected):
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Add **Environment Variables** in Vercel dashboard:
   - `VITE_API_URL` = `https://cabkaro-backend.up.railway.app`
   - `VITE_GOOGLE_CLIENT_ID` = your Google client ID
6. Click **Deploy**

**Option B — Vercel CLI:**
```bash
npm install -g vercel
cd rapido-frontend
vercel --prod
```

### Part 4 — Update CORS on Backend

In Railway environment variables, add:
```
FRONTEND_URL=https://cabkaro.vercel.app
```

This is already handled in `application-prod.properties`:
```properties
spring.web.cors.allowed-origins=${FRONTEND_URL:https://rapido-cbs.vercel.app}
```

✅ **Frontend URL:** `https://cabkaro.vercel.app`  
✅ **Backend URL:** `https://cabkaro-backend.up.railway.app`

---

## 6. Environment Variables Reference

### Backend (Spring Boot)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Prod | — | PostgreSQL JDBC URL |
| `DB_USERNAME` | ✅ Prod | — | DB username |
| `DB_PASSWORD` | ✅ Prod | — | DB password |
| `JWT_SECRET` | ✅ Prod | (local default) | Base64 256-bit secret |
| `JWT_EXPIRATION` | ❌ | `86400000` | Token TTL in ms (24h) |
| `PORT` | ❌ | `8080` | Server port |
| `SPRING_PROFILES_ACTIVE` | ✅ Prod | `default` | Set to `prod` |
| `GOOGLE_MAPS_API_KEY` | ❌ | (empty) | Leave empty for Haversine |
| `GOOGLE_OAUTH_CLIENT_ID` | ❌ | (configured) | Google sign-in |
| `FRONTEND_URL` | ❌ Prod | (vercel URL) | CORS allowed origin |

### Frontend (Vite / React)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ Split deploy | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |

> ⚠️ Vite env variables must be prefixed with `VITE_` to be exposed to the browser.

---

## 7. Database Notes

### Auto-Migration

The app uses `spring.jpa.hibernate.ddl-auto=update` — Hibernate automatically:
- Creates all tables on first run
- Adds new columns on schema changes
- **Never drops** existing data

No manual SQL migration needed.

### Tables Created

```
users                   ← registered customers
cab_drivers             ← cab driver profiles
bike_drivers            ← bike driver profiles
three_wheeler_drivers   ← auto-rickshaw driver profiles
ride_history            ← completed/cancelled rides
```

### Clean Database Reset (if needed)

```sql
-- Connect to PostgreSQL and run:
DROP TABLE IF EXISTS ride_history CASCADE;
DROP TABLE IF EXISTS cab_drivers CASCADE;
DROP TABLE IF EXISTS bike_drivers CASCADE;
DROP TABLE IF EXISTS three_wheeler_drivers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
-- Restart app — Hibernate recreates all tables
```

### SQL DDL Scripts

Pre-written DDL is available at:
```
sql-script/ddl/users.sql
sql-script/ddl/vehicles.sql
sql-script/ddl/cab_drivers.sql
sql-script/ddl/bike_drivers.sql
sql-script/ddl/three_wheeler_drivers.sql
```

---

## 8. API Quick Test

### Health Check
```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

### Signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ajay Gound",
    "phoneNumber": "9999999999",
    "email": "ajay@test.com",
    "password": "test123",
    "latitude": 25.3176,
    "longitude": 82.9739
  }'
# Returns: { "token": "eyJ..." }
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9999999999", "password": "test123"}'
# Returns: { "token": "eyJ..." }
```

### Fare Estimate (requires JWT)
```bash
curl -X POST http://localhost:8080/api/ride/estimate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup":  {"latitude": 25.3176, "longitude": 82.9739},
    "drop":    {"latitude": 25.4358, "longitude": 81.8463}
  }'
```

### Book a Ride (requires JWT)
```bash
curl -X POST http://localhost:8080/api/ride/book \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup":      {"latitude": 25.3176, "longitude": 82.9739},
    "drop":        {"latitude": 25.4358, "longitude": 81.8463},
    "vehicleType": "CAB"
  }'
```

---

## 9. Troubleshooting

### Backend won't start — DB connection refused
```
Unable to acquire JDBC Connection
```
**Fix:** Ensure PostgreSQL is running:
```powershell
Start-Service -Name "postgresql-x64-17"
```

---

### Port 8080 already in use
```
Web server failed to start. Port 8080 was already in use.
```
**Fix — Find and kill the process:**
```powershell
netstat -ano | findstr :8080
taskkill /PID <PID_NUMBER> /F
```

---

### Frontend shows blank page after Railway deploy
**Cause:** React Router needs the server to return `index.html` for all routes.  
**Fix:** Spring Boot serves `index.html` from `static/` for all non-API routes — this is already handled. If still blank, check browser console for `VITE_API_URL` errors.

---

### JWT token errors (401 Unauthorized)
- Token may be expired (24h default) → login again
- `Authorization: Bearer ` prefix missing in request header
- Wrong `JWT_SECRET` between environments → ensure same secret in prod env vars

---

### CORS error in browser (Split deploy only)
```
Access-Control-Allow-Origin missing
```
**Fix:** Set `FRONTEND_URL` environment variable on Railway to your exact Vercel URL:
```
FRONTEND_URL=https://your-app.vercel.app
```

---

### `mvnw.cmd` fails on Windows
The `mvnw.cmd` wrapper file may be empty. Use system Maven instead:
```cmd
mvn package -DskipTests
mvn spring-boot:run
```

---

## ✅ Deployment Checklist

### Local
- [ ] PostgreSQL running on port 5432
- [ ] `mvn package -DskipTests` → `BUILD SUCCESS`
- [ ] `http://localhost:8080` opens Rapido login page
- [ ] Signup → receives JWT token
- [ ] Login → redirects to home
- [ ] Fare estimate works
- [ ] Ride booking works

### Production (Railway/Render)
- [ ] Code pushed to GitHub
- [ ] PostgreSQL service added to Railway project
- [ ] All environment variables set (`DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `SPRING_PROFILES_ACTIVE=prod`)
- [ ] Build command: `mvn package -DskipTests`
- [ ] Start command uses `-Dspring.profiles.active=prod`
- [ ] Health check passes: `https://your-app.railway.app/actuator/health`
- [ ] Signup/Login works on live URL

### Optional
- [ ] Google Maps API key added for real road distances
- [ ] Twilio credentials added for OTP SMS delivery
- [ ] Razorpay live keys added for real payments
- [ ] Custom domain configured

---

*Generated for CABkaro — Spring Boot 3.5 + React 18 + PostgreSQL 17*
