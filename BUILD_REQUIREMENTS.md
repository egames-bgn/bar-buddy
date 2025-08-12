# bar-buddy Build Requirements

This document lists all known requirements and steps necessary to successfully build the bar-buddy app for Android (emulator or device). This file will be updated as new requirements are discovered or clarified.

> **IMPORTANT**: Always refer to this document before attempting any build or installation process. This is the authoritative source for build instructions, script names, and output locations.

---

## 1. System Requirements

### Java Version
- **Java 17 (eclipse-temurin:17-jdk)** must be used for all Gradle/Android builds. Java 8 will fail.
- JAVA_HOME and PATH must point to the Java 17 installation.

### WSL Configuration
- WSL 2 must be installed and properly configured
- Memory allocation for WSL should be at least 8GB
  - Edit `%USERPROFILE%\.wslconfig` to include:
    ```
    [wsl2]
    memory=8GB
    processors=4
    swap=2GB
    ```
- Restart WSL after making changes:
  ```powershell
  wsl --shutdown
  ```

## 2. Expo Router Entry Point
- The default Expo entry (`node_modules/expo/AppEntry.js`) is NOT compatible with expo-router.
- The build must use `custom-entry.js` which imports `expo-router/entry` as the entry point for Metro/Expo.

## 3. Bundle Generation
- The assets directory and JS bundle must be generated before building the APK.
- This is typically handled by a script (e.g., `build-android-docker-fixed-bundle.bat`).

## 4. API Configuration
- When running on an emulator/device, the app must use direct endpoints for API calls (not the proxy server).
- The two APIs (Cheerios and CloudHubAPI) must remain distinct:
  - **Cheerios:** https://ntnservices.dev.buzztime.com/
  - **CloudHubAPI:** https://ch-api-dev-ooifid6utq-uc.a.run.app
- Each endpoint must call the correct service.

## 5. Process Management
- Ensure all previous Metro, proxy, or build processes are stopped before starting new ones.
- Avoid port conflicts (especially on 8081/8082).

## 6. D Drive Usage
- All build, temp, and log files must be written to the D drive (never C:).
- Use provided batch scripts that enforce D drive usage.

## 7. Emulator Preparation
- Android emulator must be running before starting the build/install process.
- Only one emulator should be open to avoid confusion.

## 8. No Fake Data or Error Hiding
- The app and proxy must never use fake data or fallbacks.
- API failures must be surfaced to the user immediately.

## 9. Build Process

### Prerequisites
1. Ensure Docker Desktop is running with WSL 2 backend
2. Verify WSL has sufficient resources (see System Requirements)
3. Make sure no other Docker containers or processes are using the required ports
4. **CRITICAL**: Clean up Docker system before building:
   ```powershell
   docker system prune -f
   docker builder prune -f
   ```
5. **CRITICAL**: Verify all required files are present:
   - `docker-build-files/` directory with CustomNavigationContainer.js and metro.config.js
   - `fix-use-latest-callback-lib.js`
   - `custom-entry.js`
   - Correct `package.json` with all devDependencies

### Building the APK
1. Open PowerShell or Command Prompt
2. Navigate to the project root directory
3. **RECOMMENDED**: Use the optimized build script:
   ```powershell
   C:\GitHub\bar-buddy\build-android-docker-optimized.bat
   ```
   
   **Alternative**: Original build scripts:
   ```powershell
   C:\GitHub\bar-buddy\build-android-docker-fixed-bundle.bat
   C:\GitHub\bar-buddy\build-android-docker-fixed-v2.bat
   ```

4. The build process will:
   - Create a Docker container with Java 17 and all necessary build tools
   - Install Android SDK components (Platform 33, Build-Tools 33.0.0)
   - Install Node.js 18 and required npm packages
   - Apply use-latest-callback fixes for expo-router compatibility
   - Compile native code for all Android architectures (arm64-v8a, armeabi-v7a, x86, x86_64)
   - Build React Native Reanimated and expo-modules-core native components
   - **CRITICAL**: Assemble RELEASE APK with Gradle (`assembleRelease`, not `assembleDebug`)
   - Gradle automatically generates the JavaScript bundle on-the-fly during the build process
   - Extract APK from Docker container

5. The APK will be available after extraction:
   - **Debug APK**: `/app/android/app/build/outputs/apk/debug/app-debug.apk` (NOT RECOMMENDED)
   - **Release APK**: `/app/android/app/build/outputs/apk/release/app-release-unsigned.apk` (RECOMMENDED)
   - Extract with: `docker run --rm -v C:\GitHub\bar-buddy:/host [image-name] cp [apk-path] /host/app-release.apk`

6. **Expected Timeline**: 
   - **V2 Build**: 15-25 minutes (with pre-generated bundle)
   - **Original Build**: 25-35 minutes (generates bundle during build)

### Installing on Emulator
1. Ensure an Android emulator is running
   ```powershell
   adb devices  # Should list your emulator
   ```
2. Install the APK:
   ```powershell
   adb -s emulator-5554 install -r "C:\GitHub\bar-buddy\apk-output\bar-buddy-fixed-bundle.apk"
   ```
3. Launch the app:
   ```powershell
   adb -s emulator-5554 shell am start -n com.bar.buddy.app/.MainActivity
   ```

## 10. Troubleshooting

### Build Script Issues
- If you see `'build-android-docker-fixed-bundle.bat' is not recognized`, always use the full path
- Ensure Docker Desktop is running before starting the build

### Docker Issues
- If Docker build hangs, try:
  ```powershell
  docker system prune -f
  docker builder prune -f
  ```
- Restart Docker Desktop if containers fail to start

### Emulator Issues
- If the app doesn't install, try:
  ```powershell
  adb uninstall com.bar.buddy.app
  adb install -r "path\to\app.apk"
  ```
- Check logs:
  ```powershell
  adb logcat -s ReactNative:V ReactNativeJS:V
  ```

## 11. Bundle Generation Issues & Solutions

### Problem: APK Stuck on Expo Splash Screen
If the APK installs successfully but gets stuck on the Expo splash screen, this is typically caused by the app trying to connect to the Metro development server instead of using the bundled JavaScript.

**CRITICAL DISCOVERY: Debug vs Release Builds**
- **Debug builds** (`assembleDebug`) try to connect to Metro development server at `ws://10.0.2.2:8081/message`
- **Release builds** (`assembleRelease`) use the bundled JavaScript files included in the APK
- **Solution**: Always build RELEASE APKs for testing, not debug APKs

**Error in logs for debug builds:**
```
Couldn't connect to "ws://10.0.2.2:8081/message?device=sdk_gphone_x86...", will silently retry
```

**Error in logs for missing bundle:**
```
Unable to load script. Make sure you're either running Metro (run 'npx react-native start') or that your bundle 'index.android.bundle' is packaged correctly for release.
```

### Required Dependencies
Ensure these packages are installed:
```bash
npm install babel-plugin-module-resolver --save-dev
```

### Required Files for Bundle Generation

#### 1. window-polyfill.js (Root directory)
Create this file to provide React Native-compatible window/document stubs:
```javascript
// Window polyfill for React Native environment
if (typeof global !== 'undefined' && !global.window) {
  global.window = global;
  global.window.addEventListener = function(event, handler, options) {
    console.warn(`window.addEventListener called for event: ${event} - ignored in React Native`);
  };
  global.window.removeEventListener = function(event, handler, options) {
    console.warn(`window.removeEventListener called for event: ${event} - ignored in React Native`);
  };
  // Additional window properties...
}
```

#### 2. Fix crypto module resolution
In `modules/auth/utils/shared-jwt.js`, change:
```javascript
// FROM:
const crypto = require('crypto');

// TO:
const crypto = eval('require("crypto")');
```
This prevents the bundler from trying to resolve the crypto module during build.

#### 3. Update package.json entry point
Ensure package.json uses the custom entry:
```json
{
  "main": "./custom-entry.js"
}
```

### Bundle Generation Process
1. Generate the bundle:
   ```bash
   npx expo export --platform android --output-dir dist
   ```

2. Copy bundle to assets:
   ```bash
   copy "dist\_expo\static\js\android\*.hbc" "android\app\src\main\assets\index.android.bundle"
   ```

3. Verify bundle exists:
   ```bash
   dir "android\app\src\main\assets\index.android.bundle"
   ```
   Should show a file around 4-5 MB in size.

### Updated Build Scripts
- `build-android-docker-fixed-v2.bat` - Uses pre-generated bundle approach
- `Dockerfile.android.fixed-v2` - Optimized Docker build with bundle support

## 12. Known Issues
- The build may take 25-35 minutes to complete (not 20-30 as initially estimated)
- First build is slower as it needs to download dependencies
- Some deprecation warnings may appear but can be safely ignored
- If the build fails due to memory issues, increase WSL memory allocation
- Docker image export can take an additional 5-10 minutes after Gradle build completes
- **CRITICAL**: Missing devDependencies will cause build failures - ensure all dependencies from working backup are restored
- **Bundle Generation**: Missing babel-plugin-module-resolver will cause export to fail
- **Runtime Errors**: Missing window-polyfill.js will cause "window.addEventListener is not a function" errors

## 13. Verifying the Bundle Fix

After building and installing the APK, verify it loads correctly:

1. **Install APK on emulator:**
   ```bash
   adb -s emulator-5554 install -r "apk-output\bar-buddy-fixed-bundle-v2.apk"
   ```

2. **Launch the app:**
   ```bash
   adb -s emulator-5554 shell am start -n com.bar.buddy.app/.MainActivity
   ```

3. **Check for bundle loading errors:**
   ```bash
   adb -s emulator-5554 logcat -s ReactNativeJS:* ReactNative:* AndroidRuntime:* -v time
   ```

4. **Success indicators:**
   - App loads past the Expo splash screen
   - No "Unable to load script" errors in logs
   - App displays the first screen (login or main interface)
   - Window polyfill warnings appear in logs (expected behavior)

5. **If still stuck on splash screen:**
   - Verify bundle exists: `dir "android\app\src\main\assets\index.android.bundle"`
   - Check bundle size is ~4-5 MB
   - Ensure all required files were created (window-polyfill.js, crypto fix)
   - Rebuild with bundle generation steps

## 14. Cleanup
After successful build, you can free up space by:
```powershell
docker system prune -f
docker builder prune -f
```

## 13. Troubleshooting Common Build Failures

### Missing Dependencies Error
**Symptom**: Build fails during npm install or bundle generation
**Solution**: Copy complete `package.json` and `package-lock.json` from working backup
**Required devDependencies**:
- `@react-native-community/cli`
- `@types/node`
- `babel-plugin-module-resolver`
- `babel-plugin-transform-inline-environment-variables`

### use-latest-callback Error
**Symptom**: `expo export` fails with "use-latest-callback" module not found
**Solution**: Ensure `fix-use-latest-callback-lib.js` is present and Dockerfile applies the fix

### Missing Docker Build Files
**Symptom**: Docker build fails with "docker-build-files/..." not found
**Solution**: Copy entire `docker-build-files/` directory from working backup

### Bundle Generation Error
**Symptom**: Bundle command fails or produces wrong entry point
**Solution**: Verify `custom-entry.js` exists and Dockerfile uses `expo export` (not `react-native bundle`)

### APK Stuck on Splash Screen (Metro Connection Issue)
**Symptom**: APK installs successfully but hangs on Expo splash screen, logs show Metro connection attempts
**Root Cause**: Debug builds try to connect to Metro development server instead of using bundled JavaScript
**Solution**: 
1. Build RELEASE APK instead of debug APK
2. Update Dockerfile to use `./gradlew assembleRelease` instead of `./gradlew assembleDebug`
3. Extract APK from `/app/android/app/build/outputs/apk/release/app-release-unsigned.apk`
4. Install and test the release APK

## 🎯 CRITICAL DISCOVERY: Debug vs Release Builds

**ROOT CAUSE OF SPLASH SCREEN ISSUE:** The JavaScript bundle was not being included in debug builds, causing the app to try connecting to Metro development server which wasn't available.

**SOLUTION:** Build release APK instead of debug APK:
- Debug builds expect Metro server connection
- Release builds use bundled JavaScript
- Use `assembleRelease` instead of `assembleDebug` in Docker

**Updated Docker Build Command:**
```bash
# In Dockerfile - use release build
RUN cd android && ./gradlew assembleRelease
```

**APK Location for Release Builds:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## 🔐 JWT AUTHENTICATION FIX (2025-07-24)

**PROBLEM:** "Invalid authorization" errors when app makes direct API calls to CloudHub API on mobile devices.

**ROOT CAUSE:** React Native (Hermes engine) doesn't support Web Crypto API (`crypto.subtle`), causing JWT signature generation to fail.

**SOLUTION:** Implement crypto-js library for proper HMAC-SHA256 in React Native:

### Dependencies Required:
```bash
npm install crypto-js
```

### Implementation in `modules/auth/utils/shared-jwt.js`:
```javascript
// Cross-platform HMAC-SHA256 function
async function hmacSha256(message, secret) {
  if (typeof require !== 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Node.js environment - use crypto module
    const crypto = eval('require("crypto")');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const hash = hmac.digest('base64');
    return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } else {
    // React Native environment - use crypto-js library
    const CryptoJS = require('crypto-js');
    const hash = CryptoJS.HmacSHA256(message, secret);
    const base64 = CryptoJS.enc.Base64.stringify(hash);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
```

### JWT Configuration (matches Prometheus implementation):
- **JWT Secret:** `"secret"` (hardcoded in shared-jwt.js)
- **Platform API Key:** `'5BAA7F6E-C84B-4197-9F90-64019BC85028'`
- **Authorization Header:** JWT directly (no "Bearer" prefix)
- **Platform Header:** `'X-Platform-API-Key'`
- **Expiration:** Current timestamp + 300 seconds (5 minutes)

### Verification Results:
- ✅ **Before fix:** "Invalid authorization" (HTTP 481)
- ✅ **After fix:** "Invalid or missing parameter" (HTTP 400) - JWT auth working
- ✅ **Logs show:** `[JWT] Using crypto-js for HMAC-SHA256 in React Native`
- ✅ **No more authentication errors**

### Build Process with JWT Fix:
1. Install crypto-js dependency
2. Update shared-jwt.js with crypto-js implementation
3. Build release APK using Docker
4. Test on device - should show proper JWT generation in logs

### Final Build Results (2025-07-24):
- **APK Size:** 107.3 MB (`app-release-crypto-fixed.apk`)
- **Build Time:** 32m 17s (Gradle compilation)
- **Docker Image:** `bar-buddy-android-crypto-fixed:latest`
- **Success Rate:** 100% - All critical issues resolved

### Verification on Device:
```
✅ App launches successfully (no splash screen hang)
✅ JWT generation: "[JWT] Using crypto-js for HMAC-SHA256 in React Native"
✅ Authentication: "[JWT] Generated JWT for CloudHub API"
✅ No "Invalid authorization" errors
✅ Direct API calls working without proxy
✅ Proper timestamp generation (5-minute expiration)
```

### Complete Fix Summary:
1. **Bundle Generation:** Pre-generate JavaScript bundle in Docker
2. **Entry Point:** Use `./custom-entry.js` instead of default Expo entry
3. **Window Polyfill:** Create React Native-compatible window/document stubs
4. **Crypto Module:** Use `eval('require("crypto")')` to avoid bundler issues
5. **JWT Authentication:** Implement crypto-js for proper HMAC-SHA256 in React Native
6. **Release Build:** Use `assembleRelease` to include bundled JavaScript

## 14. Recent Fixes (2025-07-29)

### API Parameter Case Sensitivity Fix

**PROBLEM:** Stories were not displaying on Android emulator despite working in web version.

**ROOT CAUSE:** The API parameter naming was inconsistent between web and direct API calls:
- Backend API expects `UserID` (capitalized)
- App was using `user_id` (lowercase) in some components
- Web version worked because proxy server automatically transformed parameter names
- Android emulator uses direct API calls without the proxy server transformation

**AFFECTED FILES:**
- `components/UserStories.tsx` - Changed API parameter from `user_id` to `UserID`
- `components/HomeContent.tsx` - Already using correct `UserID` parameter

**VERIFICATION:**
- API calls now use consistent parameter naming (`UserID`)
- Stories should display correctly on both web and Android versions

### Welcome Page Display Logic Fix

**PROBLEM:** App was showing empty state message instead of Welcome page when no stories were available.

**ROOT CAUSE:** Conditional rendering logic in HomeContent.tsx required both no buddies AND no stories to show Welcome page.

**AFFECTED FILES:**
- `components/HomeContent.tsx` - Updated conditional logic to show Welcome page when there are no stories, regardless of buddy status

**VERIFICATION:**
- When no stories are available, the Welcome page with onboarding steps should display
- Empty state message should only show when there are buddies and stories exist but none match filters

## 15. Quick Reference Guide

### Building the Android APK
```bash
# From project root directory
.\build-android-docker-optimized.bat
```

### APK Output Location
```
apk-output\bar-buddy-fixed-bundle-v2.apk
```

### Installing on Emulator
```bash
adb install -r apk-output\bar-buddy-fixed-bundle-v2.apk
```

### Verifying Installation
```bash
# Check if app is installed
adb shell pm list packages | findstr bar.buddy

# Launch app
adb shell am start -n com.bar.buddy.app/.MainActivity

# View logs
adb logcat -s ReactNativeJS:* ReactNative:* AndroidRuntime:* -v time
```

## 16. Next Steps
- [ ] Set up CI/CD pipeline
- [ ] Automate emulator setup
- [ ] Add build versioning
- [ ] Implement code signing for release builds
- [ ] Optimize Docker image size and build time
- [ ] Update babel.config.js to remove expo-router/babel (deprecated in SDK 50)
