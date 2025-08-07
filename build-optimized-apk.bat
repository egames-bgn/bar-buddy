@echo off
echo ===================================================
echo Building Optimized APK for bar-buddy
echo ===================================================

REM Clean up previous builds
echo Cleaning up previous builds...
if exist "android\app\build\outputs\apk\release" (
    rmdir /S /Q "android\app\build\outputs\apk\release"
)

REM Create output directory if it doesn't exist
if not exist "apk-output\optimized" (
    mkdir "apk-output\optimized"
)

REM Set environment variables for optimization
set EXPO_NO_DOTENV=1
set NODE_ENV=production
set BABEL_ENV=production
set EXPO_OPTIMIZATION=true

REM Use custom gradle.properties with optimization flags and reanimated disable
echo.
echo Using custom gradle properties...
copy /y android\gradle-custom.properties android\gradle.properties

REM Create local.properties with Android SDK path
echo.
echo Setting Android SDK path...
echo sdk.dir=C:/Users/Frank/AppData/Local/Android/Sdk>android\local.properties

REM Build the optimized APK
echo.
echo Building optimized APK...
cd android
call ./gradlew clean
call ./gradlew assembleRelease
cd ..

REM Copy the APKs to the output directory
echo.
echo Copying optimized APKs to output directory...
copy "android\app\build\outputs\apk\release\app-arm64-v8a-release.apk" "apk-output\optimized\bar-buddy-optimized-arm64-v8a.apk"
copy "android\app\build\outputs\apk\release\app-armeabi-v7a-release.apk" "apk-output\optimized\bar-buddy-optimized-armeabi-v7a.apk"
copy "android\app\build\outputs\apk\release\app-x86-release.apk" "apk-output\optimized\bar-buddy-optimized-x86.apk"

echo.
echo ===================================================
echo Build complete! Optimized APKs are in apk-output\optimized folder:
echo - bar-buddy-optimized-arm64-v8a.apk (for newer devices)
echo - bar-buddy-optimized-armeabi-v7a.apk (for older devices)
echo - bar-buddy-optimized-x86.apk (for emulators)
echo ===================================================

REM Display file sizes for comparison
echo.
echo APK Size Comparison:
echo ---------------------------------------------------
for %%F in ("apk-output\bar-buddy-fixed-bundle-v2.apk") do (
    echo Original APK: %%~zF bytes
)
for %%F in ("apk-output\optimized\bar-buddy-optimized-arm64-v8a.apk") do (
    echo Optimized APK (arm64-v8a): %%~zF bytes
)
for %%F in ("apk-output\optimized\bar-buddy-optimized-armeabi-v7a.apk") do (
    echo Optimized APK (armeabi-v7a): %%~zF bytes
)
for %%F in ("apk-output\optimized\bar-buddy-optimized-x86.apk") do (
    echo Optimized APK (x86): %%~zF bytes
)
echo ---------------------------------------------------

echo.
echo Installation commands:
echo For arm64-v8a devices: adb install -r "apk-output\optimized\bar-buddy-optimized-arm64-v8a.apk"
echo For armeabi-v7a devices: adb install -r "apk-output\optimized\bar-buddy-optimized-armeabi-v7a.apk"
echo For x86 emulators: adb install -r "apk-output\optimized\bar-buddy-optimized-x86.apk"
echo.
