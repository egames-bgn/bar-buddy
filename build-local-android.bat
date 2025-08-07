@echo off
echo Building bar-buddy Android app using Docker...
echo.

REM Check if Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
  echo Error: Docker is not running. Please start Docker Desktop and try again.
  exit /b 1
)

echo Building Docker container...
docker-compose build

echo.
echo Starting Docker container...
docker-compose run --rm bar-buddy-builder /app/build-android.sh

echo.
echo If the build was successful, you can find the APK at:
echo android/app/build/outputs/apk/debug/app-debug.apk
