# 🚀 Deployment Guide — Rapido Cab Booking System

---

## 📍 Local Runnable URL (right now)

After starting the backend:

```
http://localhost:8080
```

This serves **both** the React frontend AND the Spring Boot API from a single port.

---

## Option A — Full-Stack on Railway (recommended, free tier)

Deploy the entire app (Spring Boot JAR + embedded React) as a single service.

### Steps

#### 1. Push to GitHub
```bash
cd C:\Users\91797\Desktop\SpringbootProject\CabBookingSystem
git init
git add .
git commit -m "feat: rapido cab booking system with JWT + frontend"
git remote add origin https://github.com/YOUR_USERNAME/rapido-cbs.git
git push -u origin main
```

#### 2. Create a free Railway account
Go to → https://railway.app → Sign up with GitHub

#### 3. Create a new project
- Click **New Project** → **Deploy from GitHub repo**
- Select your `rapido-cbs` repository
- Railway auto-detects it as a Java/Maven project

#### 4. Add a PostgreSQL database
- In your project dashboard → **New** → **Database** → **PostgreSQL**
- Railway provides `DATABASE_URL` automatically

#### 5. Set Environment Variables
In your service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | *(auto-set by Railway PostgreSQL plugin)* |
| `DB_USERNAME` | *(from Railway PostgreSQL)* |
| `DB_PASSWORD` | *(from Railway PostgreSQL)* |
| `JWT_SECRET` | `dGhpcyFpc0FTdXBlclNlY3JldEtleUZvckpXVEF1dGhlbnRpY2F0aW9u` |
| `JWT_EXPIRATION` | `86400000` |
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `PORT` | `8080` |
| `GOOGLE_MAPS_API_KEY` | *(optional — leave empty for Haversine)* |

#### 6. Set the start command
In Railway service settings → **Start Command**:
```
java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar
```

#### 7. Deploy
Railway builds with `mvn package -DskipTests` automatically, then runs the JAR.

**Your live URL:** `https://rapido-cbs.up.railway.app`

---

## Option B — Split Deployment (Frontend on Vercel + Backend on Railway)

Use this if you want the Rapido branding on a `vercel.app` domain.

### Deploy Backend (Railway)
Follow steps 1–7 from Option A above.
Note your backend URL: `https://rapido-backend.up.railway.app`

### Deploy Frontend (Vercel)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Configure the frontend API URL
Create `rapido-frontend/.env.production`:
```
VITE_API_URL=https://rapido-backend.up.railway.app
```

#### 3. Build and deploy
```bash
cd rapido-frontend
npm run build
vercel --prod
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → `rapido-cbs`
- **Directory?** → `./` (you're already in rapido-frontend)
- **Build command?** → `npm run build`
- **Output directory?** → `dist`
- **Override settings?** → No

#### 4. Set Vercel Environment Variable
In Vercel dashboard → your project → **Settings** → **Environment Variables**:
```
VITE_API_URL = https://rapido-backend.up.railway.app
```

Then trigger a redeploy.

#### 5. Update CORS on backend
In Railway environment variables, add:
```
FRONTEND_URL = https://rapido-cbs.vercel.app
cors.allowed-origins = https://rapido-cbs.vercel.app,http://localhost:5173
```

**Your live Vercel URL:** `https://rapido-cbs.vercel.app`

---

## Option C — Deploy to Render (alternative to Railway)

#### Backend
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Build command: `mvn package -DskipTests`
4. Start command: `java -Dspring.profiles.active=prod -jar target/CabBookingManagementSystem-0.0.1-SNAPSHOT.jar`
5. Add PostgreSQL from Render dashboard
6. Set same env variables as Railway (Option A, step 5)

---

## 🗄️ Database Migration on First Deploy

The app uses `spring.jpa.hibernate.ddl-auto=update` — Hibernate will:
- Create all tables automatically on first run
- Add missing columns on subsequent runs

No manual SQL needed.

---

## 🔑 Generating a Secure JWT Secret

Run this to generate a production-grade Base64 secret:

```bash
# PowerShell
$bytes = New-Object byte[] 64
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Paste the result as your `JWT_SECRET` environment variable.

---

## ✅ Quick Checklist

- [ ] PostgreSQL running locally
- [ ] `mvn package -DskipTests` → BUILD SUCCESS
- [ ] `http://localhost:8080` opens the Rapido login page
- [ ] Signup works → receives JWT token
- [ ] Login works → redirects to home
- [ ] Fare estimate works (Haversine or Google Maps)
- [ ] Pushed to GitHub
- [ ] Railway/Render backend deployed
- [ ] Environment variables set
- [ ] (Optional) Vercel frontend deployed with `VITE_API_URL`
