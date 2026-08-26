@echo off
title Rapido Frontend - Dev Mode (Vite HMR)
color 0E
echo.
echo  =========================================================
echo   RAPIDO FRONTEND - DEVELOPMENT MODE (Hot Reload)
echo  =========================================================
echo.
echo  Use this for fast frontend development with hot reload.
echo  The backend must already be running on http://localhost:8080
echo.
echo  Frontend URL:  http://localhost:5173
echo  API Proxy:     /api  ^>^>  http://localhost:8080
echo.

cd /d "%~dp0\rapido-frontend"

if not exist "node_modules" (
    echo  Installing npm dependencies...
    call npm install
    echo.
)

echo  Starting Vite dev server with hot reload...
call npm run dev

echo.
echo  Dev server stopped.
pause
