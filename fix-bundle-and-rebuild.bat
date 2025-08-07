@echo off
echo ========================================
echo FIXING BUNDLE AND REBUILDING APK
echo ========================================

echo Step 1: Stopping Docker build if running...
docker stop $(docker ps -q --filter ancestor=bar-buddy-android-fixed-debug) 2>nul

echo Step 2: Ensuring assets directory exists...
if not exist "android\app\src\main\assets" mkdir "android\app\src\main\assets"

echo Step 3: Generating bundle with correct entry point...
echo Using custom-entry.js as entry point...
npx expo export --platform android --output-dir dist --entry-file ./custom-entry.js

echo Step 4: Checking export results...
dir dist /s

echo Step 5: Finding and copying bundle...
if exist "dist\_expo\static\js\android\*.js" (
    echo Found bundle in _expo/static/js/android/
    copy "dist\_expo\static\js\android\*.js" "android\app\src\main\assets\index.android.bundle"
) else if exist "dist\bundles\android-*.js" (
    echo Found bundle in bundles/
    copy "dist\bundles\android-*.js" "android\app\src\main\assets\index.android.bundle"
) else (
    echo ERROR: No bundle file found!
    echo Checking all JS files in dist:
    dir dist\*.js /s
    pause
    exit /b 1
)

echo Step 6: Verifying bundle was copied...
if exist "android\app\src\main\assets\index.android.bundle" (
    echo SUCCESS: Bundle file exists
    dir "android\app\src\main\assets\index.android.bundle"
) else (
    echo ERROR: Bundle file was not copied!
    pause
    exit /b 1
)

echo Step 7: Building APK...
cd android
call gradlew assembleDebug
cd ..

echo Step 8: Copying APK to output...
if not exist "apk-output" mkdir "apk-output"
copy "android\app\build\outputs\apk\debug\app-debug.apk" "apk-output\bar-buddy-fixed-bundle-v2.apk"

echo ========================================
echo BUILD COMPLETE!
echo APK: apk-output\bar-buddy-fixed-bundle-v2.apk
echo ========================================
pause
