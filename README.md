# CABkaro — Full-Stack Ride Booking System

A production-ready, full-stack ride-hailing application built with **Spring Boot 3** (backend) and **React + Vite** (frontend). Supports real-time ride booking, dynamic fare calculation with surge pricing, JWT + Google OAuth authentication, OTP verification, Razorpay payments, AI-powered support chat, and driver chat.

**Live demo:** [https://cabkaro.vercel.app](https://cabkaro.vercel.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Fare Calculation](#fare-calculation)
- [Authentication Flow](#authentication-flow)
- [Distance and Routing](#distance-and-routing)
- [Deployment](#deployment)
- [Database](#database)

---

## Features

### Ride Booking
- Book Bike, Auto, or Prime Cab rides
- Real-time fare estimation before booking
- Dynamic surge pricing during peak hours
- Route display on interactive map (Google Routes → OSRM → Haversine fallback)
- Nearby driver discovery within 1 km radius
- Active ride tracking with localStorage persistence across page refreshes
- Ride cancellation within 60 seconds of booking
- Ride OTP for trip start verification

### Authentication
- Phone + password login
- OTP-based login (Fast2SMS / console fallback in dev)
- Google OAuth sign-in via Google Identity Services
- Google account phone linking for new users
- JWT tokens with 24-hour expiry and auto-redirect on 401
- Signup OTP verification flow

### Payments
- Razorpay integration (UPI, Card, Wallet, Netbanking)
- Tip support on payment screen
- Payment verification via backend HMAC signature check
- Cash payment option

### Maps and Location
- Leaflet + OpenStreetMap (no paid tile subscription)
- Map-based pin drop for pickup and drop locations
- GPS auto-detect current location
- Nominatim reverse geocoding and forward place search (free, no key)
- POI-based quick search (hospital, market, school, etc.)
- Saved quick locations (Home, Work, Gym, School, Hospital, Market, Other) with map picker in Profile

### Driver Experience
- Driver details modal — name, vehicle number, rating, phone
- Driver chat with AI-powered replies via Groq LLM
- Driver rating (1–5 stars with optional comment)
- Problem reporting with categorized issue types

### Support Chat
- AI-powered support chat using Groq (compound model)
- Session-based chat with 3-second polling
- Quick reply chips for common issues
- Fallback static message when Groq is unavailable
- Direct call link to support phone number

### Profile
- View and edit name and email
- Phone verification badge
- Ride stats — total rides, completed, total spent, tips given
- Saved quick locations with interactive map picker
- Logout

### Ride History
- Full ride history with Completed, Cancelled, In Progress status
- Fare, distance, surge multiplier, and driver info per ride
- Resume in-progress rides directly from history
- Report problem on completed rides
- Stats card — total rides, total spent, completed count

---

## Tech Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Framework | Spring Boot 3.5.0 |
| Language | Java 17 |
| Security | Spring Security + JWT (JJWT 0.12.6) |
| Database | PostgreSQL (prod), H2 (dev fallback) |
| ORM | Spring Data JPA + Hibernate |
| HTTP Client | Spring WebFlux (WebClient) |
| Payments | Razorpay REST API |
| AI Chat | Groq API (compound model) |
| OTP Delivery | Fast2SMS REST API (console fallback in dev) |
| Build | Maven + frontend-maven-plugin |
| Deployment | Railway |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Routing | React Router v6 |
| Maps | Leaflet + React-Leaflet |
| HTTP | Axios |
| Animations | Framer Motion |
| Notifications | React Hot Toast |
| Deployment | Vercel |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                  │
│                                                                   │
│   React + Vite  (Vercel)                                         │
│   ├── pages/     LoginPage, SignupPage, HomePage,                │
│   │              BookingPage, RideHistoryPage,                   │
│   │              ProfilePage, SupportChatPage                    │
│   ├── components/ Navbar, Modals, PhoneInput, icons              │
│   └── services/api.js  Axios + JWT interceptor                   │
└───────────────────────┬──────────────────────────────────────────┘
                        │  HTTPS /api/*
                        │  Authorization: Bearer <JWT>
┌───────────────────────▼──────────────────────────────────────────┐
│               Spring Boot 3  (Railway)                            │
│                                                                   │
│  Controllers       Services              Security                 │
│  AuthController    BookingService        JwtUtil                  │
│  BookingController FareCalculatorService JwtAuthFilter            │
│  PaymentController DistanceService       SecurityConfig           │
│  ProfileController UserService           UserDetailsService       │
│  SupportChatCtrl   DriverService                                  │
│  RideReportCtrl    GroqService (AI)                               │
│                    SmsService (OTP)                               │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 PostgreSQL  (Railway)                       │  │
│  │  users  ride_history  bike_drivers  cab_drivers             │  │
│  │  three_wheeler_drivers  vehicles  chat_messages             │  │
│  │  quick_locations  ride_reports                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
          │                               │
     Groq API                       Razorpay API
  (AI support + driver chat)         (Payments)
```

---

## Project Structure

```
CabBookingSystem/
│
├── pom.xml                          Maven build — includes frontend-maven-plugin
├── nixpacks.toml                    Railway build config
├── railway.json                     Railway deploy settings
├── run-backend.bat                  Windows: start Spring Boot
├── run-frontend.bat                 Windows: start Vite dev server
│
├── src/main/java/com/TestSpringBoot/cbs/
│   │
│   ├── controller/
│   │   ├── AuthController.java          /api/auth/*  signup, login, OTP, Google OAuth
│   │   ├── BookingController.java       /api/ride/*  estimate, book, nearby, history, cancel
│   │   ├── PaymentController.java       /api/payment/* Razorpay order + verify
│   │   ├── ProfileController.java       /api/user/*  profile, quick-locations CRUD
│   │   ├── SupportChatController.java   /api/chat/*  session, messages, send, driver chat
│   │   ├── RideReportController.java    /api/ride/report, /api/ride/reports
│   │   └── SpaFallbackController.java   Serves React index.html for all non-API routes
│   │
│   ├── service/
│   │   ├── BookingService.java          Ride booking, driver matching, cancellation
│   │   ├── FareCalculatorService.java   Base fare + surge multiplier
│   │   ├── DistanceService.java         Google Routes API → OSRM → Haversine fallback
│   │   ├── UserService.java             Auth, OTP, Google OAuth, profile management
│   │   ├── DriverService.java           Nearby driver queries
│   │   ├── GroqService.java             Groq LLM for support + driver chat
│   │   └── SmsService.java              Fast2SMS OTP delivery
│   │
│   ├── security/
│   │   ├── JwtUtil.java                 Token generation and validation
│   │   ├── JwtAuthenticationFilter.java Per-request JWT extraction
│   │   ├── SecurityConfig.java          CORS, public routes, filter chain
│   │   └── UserDetailsServiceImpl.java
│   │
│   ├── model/
│   │   ├── entities/
│   │   │   ├── User.java
│   │   │   ├── RideHistory.java
│   │   │   ├── BikeDriver.java
│   │   │   ├── CabDriver.java
│   │   │   ├── ThreeWheelerDriver.java
│   │   │   ├── Vehicle.java
│   │   │   ├── ChatMessage.java
│   │   │   ├── QuickLocation.java
│   │   │   └── RideReport.java
│   │   ├── dto/
│   │   │   ├── AuthResponse.java
│   │   │   ├── SignupRequest.java
│   │   │   ├── LoginRequest.java
│   │   │   ├── BookRideRequest.java
│   │   │   ├── FareEstimateRequest.java / FareEstimateResponse.java
│   │   │   ├── RideBookingResponse.java
│   │   │   ├── Location.java
│   │   │   └── OtpVerificationRequest.java
│   │   └── enums/
│   │       ├── VehicleTypeEnum.java     BIKE, AUTO, CAB
│   │       └── FlagTypeEnum.java
│   │
│   ├── repository/                      Spring Data JPA repositories for all entities
│   │
│   └── config/
│       ├── DriverSeeder.java            Seeds sample drivers near Varanasi on startup
│       └── DataMigrationRunner.java
│
├── src/main/resources/
│   ├── application.properties           Dev config (PostgreSQL, JWT, API keys)
│   └── application-prod.properties      Production overrides
│
├── rapido-frontend/
│   ├── vite.config.js                   Dev proxy: /api → localhost:8080
│   ├── package.json
│   ├── vercel.json                      SPA routing config for Vercel
│   ├── .env.example                     Environment variable template
│   ├── public/
│   │   ├── logo.png
│   │   ├── login-bg-desktop.svg
│   │   └── login-bg-mobile.svg
│   └── src/
│       ├── App.jsx                      Routes + react-hot-toast Toaster
│       ├── main.jsx
│       ├── index.css                    Global styles + CSS design tokens
│       ├── pages/
│       │   ├── LoginPage.jsx            Password + OTP + Google sign-in
│       │   ├── SignupPage.jsx           Signup with OTP verify + Google signup
│       │   ├── HomePage.jsx             Dashboard, quick destinations, vehicle picker
│       │   ├── BookingPage.jsx          Full-screen map booking (core feature, ~83KB)
│       │   ├── RideHistoryPage.jsx      Ride list with stats and report flow
│       │   ├── ProfilePage.jsx          Profile edit + saved locations map picker
│       │   └── SupportChatPage.jsx      AI support chat with polling
│       ├── components/
│       │   ├── Navbar.jsx               Top nav + mobile bottom nav
│       │   ├── ProtectedRoute.jsx       JWT guard for protected routes
│       │   ├── PhoneInput.jsx           International phone input with country picker
│       │   ├── DriverDetailsModal.jsx   Driver info overlay
│       │   ├── DriverChatModal.jsx      In-ride driver chat
│       │   ├── RateDriverModal.jsx      Star rating + comment
│       │   ├── PaymentModal.jsx         Razorpay + tip UI
│       │   ├── ReportProblemModal.jsx   Categorized problem report form
│       │   └── icons.jsx               Inline SVG icon library (43+ icons)
│       └── services/
│           └── api.js                   Axios instance, JWT interceptor, all API methods
│
├── sql-script/ddl/                      Manual DDL reference scripts
├── low-level-design/                    C++ LLD reference design
└── .github/workflows/maven.yml          GitHub Actions CI
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.6+ (or use included `mvnw.cmd`) |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 13+ |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/Kenpacchi/CabBookingSystem.git
cd CabBookingSystem
```

### 2. Set up PostgreSQL

Make sure PostgreSQL is running. The default config connects to `postgres` database on localhost:5432.

Update credentials in `src/main/resources/application.properties` if yours differ:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=your_password
```

Hibernate auto-creates all tables on first run (`ddl-auto=update`).

### 3. Start the backend

```bash
# Windows — double-click or run in terminal
run-backend.bat

# Or manually
mvnw.cmd spring-boot:run
```

Backend starts at **http://localhost:8080**

On first startup `DriverSeeder` automatically populates sample bike, auto, and cab drivers near Varanasi (BHU area).

### 4. Set up the frontend environment

```bash
cd rapido-frontend
copy .env.example .env
# All values can be left empty for local dev — Vite proxies /api to :8080
```

### 5. Start the frontend

```bash
# Windows — double-click or run in terminal
run-frontend.bat

# Or manually
cd rapido-frontend
npm install
npm run dev
```

Frontend starts at **http://localhost:5173**

---

## Environment Variables

### Backend (`application.properties` / Railway environment variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/postgres` | PostgreSQL JDBC URL |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_PASSWORD` | — | Database password |
| `JWT_SECRET` | (base64 key) | 256-bit JWT signing secret |
| `JWT_EXPIRATION` | `86400000` | Token TTL in milliseconds (24 hours) |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Google Routes API key — falls back to OSRM if blank |
| `GOOGLE_OAUTH_CLIENT_ID` | — | Google OAuth client ID for sign-in |
| `RAZORPAY_KEY_ID` | `rzp_test_...` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | — | Razorpay key secret |
| `GROQ_API_KEY` | _(empty)_ | Groq API key for AI chat — falls back to static replies if blank |
| `FAST2SMS_API_KEY` | _(empty)_ | Fast2SMS key for real OTP SMS — uses console log if blank |
| `FRONTEND_URL` | `http://localhost:3000` | Your Vercel frontend URL (added to CORS allowed origins) |
| `SUPPORT_PHONE` | `7974843494` | Support phone number shown in the app |

### Frontend (`rapido-frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL for Vercel deployment (e.g. `https://your-app.up.railway.app`). Leave empty for local dev. |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID — enables the Google sign-in button |
| `VITE_GOOGLE_MAPS_KEY` | Google Routes API key — enables road-accurate distance on frontend |

---

## API Reference

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | No | Register user, triggers OTP send |
| POST | `/verify-signup-otp` | No | Verify OTP, returns JWT |
| POST | `/login` | No | Password login, returns JWT |
| POST | `/send-otp` | No | Send OTP to existing user's phone |
| POST | `/verify-otp` | No | Verify OTP login, returns JWT |
| POST | `/google-callback` | No | Google OAuth — returns JWT or `needsPhone` flag |
| POST | `/save-phone` | Temp JWT | Link phone number to Google account |

### Ride — `/api/ride`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/estimate` | JWT | Fare estimate for a pickup → drop route |
| POST | `/book` | JWT | Book a ride, returns driver info + fare |
| GET | `/nearby/{vehicleType}` | JWT | Available drivers near pickup (BIKE/AUTO/CAB) |
| GET | `/history` | JWT | Full ride history for the logged-in user |
| POST | `/cancel/{rideId}` | JWT | Cancel an active ride (within 60 seconds) |
| POST | `/report` | JWT | Submit a problem report for a completed ride |
| GET | `/reports` | JWT | All reports submitted by the logged-in user |

### Payment — `/api/payment`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-order` | JWT | Create a Razorpay payment order |
| POST | `/verify` | JWT | Verify Razorpay payment signature |

### Profile — `/api/user`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | JWT | Get profile details + ride stats |
| PUT | `/profile` | JWT | Update name and email |
| GET | `/quick-locations` | JWT | List all saved locations |
| POST | `/quick-locations` | JWT | Create or update a saved location |
| DELETE | `/quick-locations/{label}` | JWT | Remove a saved location |

### Chat — `/api/chat`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/session` | JWT | Create or retrieve support chat session |
| GET | `/messages/{sessionId}` | JWT | Fetch all messages in a session |
| POST | `/send` | JWT | Send a message (AI reply generated by Groq) |
| GET | `/driver/{rideId}` | JWT | Get driver chat messages for an active ride |
| POST | `/driver-message` | JWT | Send a message to the driver |

---

## Fare Calculation

### Rates by vehicle type

| Vehicle | Base Fare | Per KM Rate | Minimum Fare |
|---------|-----------|-------------|-------------|
| Bike | ₹20 | ₹9 / km | ₹30 |
| Auto | ₹30 | ₹13 / km | ₹40 |
| Cab | ₹50 | ₹18 / km | ₹70 |

### Formula

```
fare = max( (baseFare + distanceKm × perKmRate) × surgeMultiplier, minFare )
```

### Surge Multiplier Schedule

| Time Window | Multiplier |
|-------------|-----------|
| 8:00 AM – 10:00 AM | 1.5× |
| 5:00 PM – 9:00 PM | 1.5× |
| 11:00 PM – 5:00 AM | 1.3× |
| All other hours | 1.0× |

---

## Authentication Flow

```
Normal Signup
  POST /signup  →  OTP sent to phone
  POST /verify-signup-otp  →  JWT  →  stored in localStorage

Password Login
  POST /login  →  JWT  →  stored in localStorage

OTP Login
  POST /send-otp  →  OTP sent
  POST /verify-otp  →  JWT  →  stored in localStorage

Google Sign-In (existing user)
  Google Identity Services → credential JWT
  POST /google-callback  →  JWT returned  →  stored in localStorage

Google Sign-In (new user, needs phone)
  POST /google-callback  →  { needsPhone: true, tempToken }
  POST /save-phone (with tempToken)  →  full JWT

All protected API calls
  Header: Authorization: Bearer <token>
  On 401: clear localStorage  →  redirect to /login
```

---

## Distance and Routing

The app uses a three-tier fallback chain for road distance:

```
1.  Google Maps Routes API  (computeRoutes v2)
    Needs VITE_GOOGLE_MAPS_KEY + GOOGLE_MAPS_API_KEY
    Returns real road distance + encoded polyline for map display

        ↓ (if key missing or API fails)

2.  OSRM  (Open Source Routing Machine)
    Free, no key required
    Returns road distance + GeoJSON route geometry

        ↓ (if OSRM unreachable)

3.  Haversine × 1.3 road factor
    Always available, no network call
    Straight-line distance with road multiplier estimate
```

**Map tiles:** OpenStreetMap — free, no key  
**Geocoding:** Nominatim — free, no key (reverse geocode + place search)

---

## Deployment

### Backend on Railway

1. Push to GitHub
2. Connect Railway to the repository
3. Railway reads `nixpacks.toml` for the build
4. Set all backend environment variables in the Railway dashboard
5. The Maven build compiles the React frontend and embeds it in the Spring Boot JAR under `/static`
6. Spring Boot serves both the REST API (`/api/*`) and the React SPA from the same port

### Frontend on Vercel (standalone)

1. Connect Vercel to the `rapido-frontend` subdirectory
2. Set `VITE_API_URL` to your Railway backend URL
3. Set `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_MAPS_KEY`
4. `vercel.json` rewrites all routes to `index.html` for SPA navigation
5. Add your Vercel domain to `FRONTEND_URL` on the Railway backend (CORS)

---

## Database

All tables are auto-created by Hibernate on first startup (`ddl-auto=update`).

| Table | Description |
|-------|-------------|
| `users` | Registered users — phone, email, hashed password, latitude/longitude |
| `ride_history` | All bookings — pickup, drop, fare, driver, status, timestamps |
| `bike_drivers` | Bike driver pool — name, phone, vehicle number, location, availability |
| `cab_drivers` | Cab driver pool |
| `three_wheeler_drivers` | Auto-rickshaw driver pool |
| `vehicles` | Vehicle registry |
| `chat_messages` | Support chat messages keyed by session ID |
| `quick_locations` | User saved locations (HOME, WORK, GYM, SCHOOL, HOSPITAL, MARKET, OTHER) |
| `ride_reports` | Problem reports submitted by users on completed rides |

Sample driver data is seeded automatically by `DriverSeeder` on first startup. Drivers are placed around Varanasi / BHU (`~25.27°N, 82.99°E`).

---

## Sample API Calls

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phoneNumber":"9999999999","email":"test@test.com","password":"test123","latitude":25.2677,"longitude":82.9913}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","password":"test123"}'

# Get fare estimate (replace TOKEN with JWT from login)
curl -X POST http://localhost:8080/api/ride/estimate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickup":{"latitude":25.2677,"longitude":82.9913},"drop":{"latitude":25.3176,"longitude":82.9739}}'

# Book a ride
curl -X POST http://localhost:8080/api/ride/book \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLocation":{"latitude":25.2677,"longitude":82.9913},"dropLocation":{"latitude":25.3176,"longitude":82.9739},"vehicleType":"AUTO"}'
```
