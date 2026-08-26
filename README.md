# ⚡ Rapido Cab Booking System

A full-stack **Rapido-like ride-booking application** built with Spring Boot (backend) and React + Vite (frontend).

Features JWT authentication, Google Maps distance integration (with Haversine fallback), dynamic surge pricing, and a sleek dark-yellow UI.

---

## 🚀 Quick Start

### Prerequisites
| Tool | Required |
|------|----------|
| Java 17+ | ✅ |
| Maven 3.6+ (or use included `mvnw.cmd`) | ✅ |
| PostgreSQL 13+ | ✅ |
| Node.js 18+ | ✅ |
| npm 9+ | ✅ |

### 1. Start the Database

Make sure PostgreSQL is running and update `src/main/resources/application.properties` if your credentials differ:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=Ajay@2003
```

### 2. Start the Backend

Double-click `run-backend.bat` or run in a terminal:

```bash
cd CabBookingSystem
mvnw.cmd spring-boot:run
```

Backend runs at: **http://localhost:8080**

### 3. Start the Frontend

Double-click `run-frontend.bat` or run in a new terminal:

```bash
cd CabBookingSystem/rapido-frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Authentication Flow

The app uses **JWT (JSON Web Token)** — no sessions, no cookies.

1. User signs up → receives JWT token (valid 24 hours)
2. Token stored in `localStorage`
3. Every API request includes `Authorization: Bearer <token>`
4. Protected routes reject requests without a valid token
5. Token expiry → auto-redirect to login

### API Endpoints

```
POST /api/auth/signup   → Register, returns JWT
POST /api/auth/login    → Login, returns JWT

POST /api/ride/estimate → Fare estimate (JWT required)
POST /api/ride/book     → Book a ride (JWT required)
GET  /api/ride/nearby/{vehicleType} → Nearby drivers (JWT required)
GET  /api/ride/history  → Ride history (JWT required)
```

---

## 📍 Distance Calculation

### With Google Maps API Key
1. Get a free key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Distance Matrix API**
3. Add to `application.properties`:
   ```properties
   google.maps.api.key=YOUR_KEY_HERE
   ```
4. The app uses real road distances via the Distance Matrix API

### Without API Key (Default — Haversine)
The app automatically falls back to the **Haversine formula** (great-circle distance × 1.3 road factor). No setup needed.

---

## 💰 Fare Calculation

| Vehicle | Base Fare | Per KM | Min Fare |
|---------|-----------|--------|----------|
| 🏍️ Bike | ₹20 | ₹9/km | ₹30 |
| 🛺 Auto | ₹30 | ₹13/km | ₹40 |
| 🚕 Cab  | ₹50 | ₹18/km | ₹70 |

**Formula:** `Final Fare = max((BaseFare + Distance × PerKmRate) × Surge, MinFare)`

### Surge Multiplier
| Time Window | Multiplier |
|-------------|-----------|
| 8–10 AM (morning peak) | 1.5× |
| 5–9 PM (evening peak) | 1.5× |
| 11 PM – 5 AM (late night) | 1.3× |
| Other times | 1.0× |

---

## 🏗️ Architecture

```
rapido-frontend/        ← React + Vite (port 5173)
  src/
    pages/              ← LoginPage, SignupPage, HomePage, BookingPage, RideHistoryPage
    components/         ← Navbar, ProtectedRoute
    services/api.js     ← Axios + JWT interceptor

src/main/java/com/TestSpringBoot/cbs/
  controller/           ← AuthController, BookingController
  service/              ← UserService, BookingService, DistanceService, FareCalculatorService
  security/             ← JwtUtil, JwtAuthenticationFilter, SecurityConfig, UserDetailsServiceImpl
  model/
    entities/           ← User, CabDriver, BikeDriver, ThreeWheelerDriver, RideHistory
    dto/                ← AuthResponse, BookRideRequest, FareEstimateRequest/Response, Location
    enums/              ← VehicleTypeEnum, FlagTypeEnum
  repository/           ← UserRepository, RideHistoryRepository, driver repos
```

---

## 🔧 Configuration Reference

```properties
# JWT (application.properties)
jwt.secret=<base64-encoded 256-bit secret>
jwt.expiration=86400000  # 24 hours in ms

# Google Maps (optional)
google.maps.api.key=     # Leave blank for Haversine fallback

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=<your-password>
```

---

## 🗄️ Database Migration Note

The app uses `spring.jpa.hibernate.ddl-auto=update`. When you first run it after this upgrade:
- New columns (`latitude`, `longitude`) will be added to existing driver/user tables
- Old `x`, `y` integer columns will remain but are unused
- New `ride_history` table will be created automatically

If you want a clean start, run `DROP TABLE` for all tables and let Hibernate recreate them.

---

## 🧪 Testing the API

### Signup
```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phoneNumber":"9999999999","email":"test@test.com","password":"test123","latitude":12.9716,"longitude":77.5946}'
```

### Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","password":"test123"}'
```

### Get Fare Estimate (with JWT)
```bash
curl -X POST http://localhost:8080/api/ride/estimate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickup":{"latitude":12.9716,"longitude":77.5946},"drop":{"latitude":12.9352,"longitude":77.6245}}'
```

---

## 📁 File Structure

```
CabBookingSystem/
├── run-backend.bat          ← Start Spring Boot
├── run-frontend.bat         ← Start React dev server
├── pom.xml                  ← Maven with JWT + Security
├── rapido-frontend/         ← React app
│   ├── package.json
│   ├── vite.config.js       ← Proxy /api → :8080
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       ├── pages/
│       └── services/api.js
└── src/main/java/
    └── com/TestSpringBoot/cbs/
        ├── controller/
        ├── service/
        ├── security/
        ├── model/
        └── repository/
```
