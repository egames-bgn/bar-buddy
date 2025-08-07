@echo off
echo ========================================
echo BUILDING BARBUDDY ANDROID APK WITH DOCKER (V2)
echo Using pre-generated bundle approach
echo ========================================

echo Step 1: Ensure bundle exists...
if not exist "android\app\src\main\assets\index.android.bundle" (
    echo ERROR: Bundle not found! Run bundle generation first.
    echo Run: npx expo export --platform android --output-dir dist
    echo Then: copy "dist\_expo\static\js\android\*.hbc" "android\app\src\main\assets\index.android.bundle"
    pause
    exit /b 1
)

echo Bundle found: 
dir "android\app\src\main\assets\index.android.bundle"

echo Step 2: Building Docker image with Java 17...
docker build -f Dockerfile.android.fixed-v2 -t bar-buddy-android-fixed-v2 .

if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)

echo Step 3: Extracting APK from Docker container...
if not exist "apk-output" mkdir "apk-output"

docker create --name temp-container bar-buddy-android-fixed-v2
docker cp temp-container:/app/android/app/build/outputs/apk/release/app-release.apk apk-output/bar-buddy-fixed-bundle-v2.apk
docker rm temp-container

echo Step 4: Verifying APK...
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
