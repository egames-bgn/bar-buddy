@echo off
echo ========================================
echo BUILDING BARBUDDY ANDROID APK WITH DOCKER (OPTIMIZED)
echo ========================================

echo Step 1: Building Docker image...
echo [INFO] This step will take several minutes. Please wait...
docker build -f Dockerfile.android.fixed-v2 -t bar-buddy-android-fixed-v2 .

if %errorlevel% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo [INFO] Docker build phase completed. Proceeding to next step...

echo Step 2: Extracting APK from Docker container...
if not exist "apk-output" mkdir "apk-output"

docker create --name temp-container bar-buddy-android-fixed-v2
docker cp temp-container:/app/android/app/build/outputs/apk/release/app-release.apk apk-output/bar-buddy-optimized.apk
docker rm temp-container

echo Step 3: Verifying APK...
if exist "apk-output\bar-buddy-optimized.apk" (
    echo SUCCESS: APK created successfully!
    dir "apk-output\bar-buddy-optimized.apk"
) else (
    echo ERROR: APK not found!
    exit /b 1
)

echo ========================================
echo BUILD COMPLETE!
echo.
echo The bar-buddy Android APK has been successfully built!
echo APK Location: apk-output\bar-buddy-optimized.apk
echo.
echo You can now install this APK on your Android device or emulator.
echo ========================================
pause
