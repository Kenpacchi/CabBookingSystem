# Cab Booking System

A Spring Boot backend for a simple cab booking system with PostgreSQL.  
Allows users to sign up, log in, view nearby vehicles (cab, bike, auto), book rides with nearest driver, and auto-mark driver availability after a simulated ride.

## Tech Stack
- Java 17+ / Spring Boot
- Spring Data JPA (Hibernate)
- PostgreSQL
- Lombok
- Jakarta Persistence (JPA)
- Maven

## Features
- **User** signup/login (phone number + password)
- **Vehicle** entity with types (CAB, BIKE, AUTO)
- **Driver** entities: CabDriver, BikeDriver, ThreeWheelerDriver
  - Fields: name, mobile number, vehicle reference, availability flag (`FlagTypeEnum` Y/N), accept flag, location (x, y)
- **Book Ride**: picks nearest available driver by Manhattan distance, marks unavailable, then auto-marks available after a delay
- **Endpoints**:
  - `POST /api/auth/signup` – register user
  - `POST /api/auth/login` – login user
  - `GET  /api/ride/show/{type}?phoneNumber=...` – list nearby drivers of type `cab|bike|auto`
  - `POST /api/ride/book` – book ride (body includes phoneNumber, drop location, vehicleType)
- Uses DTOs for requests/responses to avoid lazy-proxy serialization issues.

## Prerequisites
- JDK 17 or higher installed.
- Maven installed (`mvn` command available).
- PostgreSQL database up and running.
- IDE with Lombok plugin enabled (e.g., IntelliJ, Eclipse).
- `application.properties` or `application.yml` configured for your DB.

## Database Setup
1. Create a PostgreSQL database, e.g. `cab_booking_db`.
2. In `src/main/resources/application.properties`, set:
   ```properties
   spring.datasource.url=jdbc:postgresql://<host>:<port>/<dbname>
   spring.datasource.username=<db_user>
   spring.datasource.password=<db_password>
   spring.jpa.hibernate.ddl-auto=none
   spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
   spring.jackson.serialization.FAIL_ON_EMPTY_BEANS=false
