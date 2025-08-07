@echo off
echo Building bar-buddy Android APK with enhanced tabs fix...

REM Build a new Docker image with our enhanced tab layout fix
docker build -t bar-buddy-enhanced-tabs-fix:latest -f Dockerfile.android.fixed-v2 .

REM Run the container to build the APK
docker run --name bar-buddy-enhanced-tabs-build bar-buddy-enhanced-tabs-fix:latest

REM Extract the APK from the container
docker cp bar-buddy-enhanced-tabs-build:/app/android/app/build/outputs/apk/release/app-release.apk app-release-enhanced-tabs.apk

REM Clean up
docker rm bar-buddy-enhanced-tabs-build

echo Build complete! APK saved as app-release-enhanced-tabs.apk
