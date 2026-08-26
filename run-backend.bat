@echo off
title Rapido - Full Stack App (Backend + Frontend)
color 0A
echo.
echo  =========================================================
echo   RAPIDO CAB BOOKING SYSTEM - FULL STACK
echo  =========================================================
echo.
echo  This runs BOTH backend API and React frontend
echo  from a single Spring Boot server.
echo.
echo  App URL:     http://localhost:8080
echo  Health:      http://localhost:8080/actuator/health
echo  API Base:    http://localhost:8080/api
echo.
echo  Make sure PostgreSQL is running before starting!
echo  DB: postgresql://localhost:5432/postgres
echo.

cd /d "%~dp0"

REM Rebuild with frontend included
echo  Building project (includes React frontend)...
call mvnw.cmd package -DskipTests -q
if errorlevel 1 (
    echo  BUILD FAILED - check errors above
    pause
    exit /b 1
)

echo.
echo  Build successful! Starting server...
echo.
java -jar target\CabBookingManagementSystem-0.0.1-SNAPSHOT.jar

echo.
echo  Server stopped.
pause
