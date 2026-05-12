@echo off
echo ======================================
echo O*NET Data Service - Quick Start
echo ======================================
echo.

REM Check if .env exists
if not exist .env (
    echo WARNING: .env file not found!
    echo.
    echo Creating .env from .env.example...
    copy .env.example .env
    echo Created .env file
    echo.
    echo Please edit .env and add your O*NET credentials:
    echo   1. Get credentials from: https://services.onetcenter.org/
    echo   2. Update ONET_USERNAME and ONET_PASSWORD in .env
    echo   3. Update MONGO_URI with your MongoDB connection
    echo.
    echo Then run this script again.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

echo What would you like to do?
echo.
echo 0. Test API connection - RECOMMENDED FIRST
echo 1. Test import (10 occupations)
echo 2. Import 2000 occupations (takes ~30-40 minutes)
echo 3. Import all occupations (~1000 total)
echo 4. Check database statistics
echo 5. Start API server
echo 6. Exit
echo.
set /p choice="Enter your choice (0-6): "

if "%choice%"=="0" (
    echo.
    echo Testing O*NET API connection...
    call npm test
) else if "%choice%"=="1" (
    echo.
    echo Starting test import (10 occupations)...
    call npm run import:test
) else if "%choice%"=="2" (
    echo.
    echo WARNING: This will import 2000 occupations and take 30-40 minutes.
    set /p confirm="Continue? (y/n): "
    if /i "%confirm%"=="y" (
        echo Starting import of 2000 occupations...
        call npm run import:2000
    )
) else if "%choice%"=="3" (
    echo.
    echo WARNING: This will import ALL occupations (~1000) and take 20-30 minutes.
    set /p confirm="Continue? (y/n): "
    if /i "%confirm%"=="y" (
        echo Starting full import...
        call npm run import:all
    )
) else if "%choice%"=="4" (
    echo.
    echo Checking database statistics...
    call npm run stats
) else if "%choice%"=="5" (
    echo.
    echo Starting API server...
    echo Server will run on: http://localhost:3002
    echo.
    call npm start
) else if "%choice%"=="6" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice!
    exit /b 1
)

echo.
echo ======================================
echo Done!
echo ======================================
pause
