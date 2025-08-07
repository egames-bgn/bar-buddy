@echo off
setlocal enabledelayedexpansion

:: ===========================================================================
:: bar-buddy Android Docker Build Script (Debug Mode)
:: ===========================================================================
:: This script builds the Android APK using Docker with enhanced debug logging.
:: All output is logged to C:\GitHub\bar-buddy\docker-build-debug.log

set "LOG_FILE=C:\GitHub\bar-buddy\docker-build-debug.log"

echo [%DATE% %TIME%] Starting bar-buddy Android Build (Debug Mode) > "%LOG_FILE%"
echo bar-buddy Android Docker Build Script (Debug Mode)
echo ===============================================
echo Debug logs will be saved to: %LOG_FILE%

:: Check if Docker is running
echo [%DATE% %TIME%] Checking Docker status... >> "%LOG_FILE%"
docker info >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [%DATE% %TIME%] ERROR: Docker is not running or not installed. >> "%LOG_FILE%"
    echo Error: Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

:: Create output directory if it doesn't exist
if not exist "apk-output" (
    mkdir apk-output
    echo [%DATE% %TIME%] Created apk-output directory. >> "%LOG_FILE%"
    echo Created apk-output directory.
)

:: Build the Docker image with debug flags
echo [%DATE% %TIME%] Starting Docker build with debug logging... >> "%LOG_FILE%"
echo Building Docker image with debug logging (this may take a while)...

docker build --progress=plain --no-cache --build-arg BUILDKIT_INLINE_CACHE=1 -t bar-buddy-android-fixed -f Dockerfile.android.fixed . >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Failed to build Docker image.
    exit /b %ERRORLEVEL%
)

REM Copy the APK from the container to the host
echo Copying APK from container to host...
docker run --rm -v "%cd%\apk-output:/output" bar-buddy-android-fixed /bin/bash -c "cp /app/android/app/build/outputs/apk/debug/app-debug.apk /output/bar-buddy-fixed-bundle.apk"

if %ERRORLEVEL% EQU 0 (
    echo Build process completed successfully!
    echo The APK is available at: %cd%\apk-output\bar-buddy-fixed-bundle.apk
) else (
    echo Build process failed with error code %ERRORLEVEL%
)

endlocal
