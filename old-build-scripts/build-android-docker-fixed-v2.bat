@echo off
echo ========================================
echo BUILDING BARBUDDY ANDROID APK WITH DOCKER (V2)
echo ========================================

echo Step 1: Building Docker image with Java 17...
echo [INFO] This step will take several minutes. Please wait...
docker build -f Dockerfile.android.fixed-v2 -t bar-buddy-android-fixed-v2 .

if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo [INFO] Docker build phase completed. Proceeding to next step...

echo Step 2: Extracting APK from Docker container...
if not exist "apk-output" mkdir "apk-output"

docker create --name temp-container bar-buddy-android-fixed-v2
docker cp temp-container:/app/android/app/build/outputs/apk/release/app-release.apk apk-output/bar-buddy-fixed-bundle-v2.apk
docker rm temp-container

echo Step 3: Verifying APK...
if exist "apk-output\bar-buddy-fixed-bundle-v2.apk" (
    echo SUCCESS: APK created successfully!
    dir "apk-output\bar-buddy-fixed-bundle-v2.apk"
) else (
    echo ERROR: APK not found!
    exit /b 1
)

echo ========================================
echo BUILD COMPLETE!
echo APK: apk-output\bar-buddy-fixed-bundle-v2.apk
echo ========================================
pause
