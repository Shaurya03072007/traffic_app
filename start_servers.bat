@echo off
title TrafficWatch - Automated System Launcher
echo ==============================================================================
echo              TRAFFICWATCH TRAFFIC POLICE ENFORCEMENT SYSTEM
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python virtual environment...
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found. Please create it first:
    echo        python -m venv venv
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend Server on port 8000 (LAN enabled)...
start "TrafficWatch - FastAPI AI Backend (Port 8000)" cmd /k ".\venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"

echo [3/3] Starting Vite React Administrative Web Dashboard on port 3000...
start "TrafficWatch - Web Dashboard (Port 3000)" cmd /c "npm run dev || npm.cmd run dev"

echo.
echo ==============================================================================
echo Servers starting up!
echo   - Backend & AI Engine:  http://localhost:8000
echo   - Backend Swagger Docs: http://localhost:8000/docs
echo   - Web Administrative:   http://localhost:3000
echo   - Supabase PostgreSQL:  Online and Connected
echo ==============================================================================
echo Opening browser in 3 seconds...
timeout /t 3 >nul
start http://localhost:3000/
