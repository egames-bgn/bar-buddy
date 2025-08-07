# bar-buddy Android Diagnostics Mode

This guide explains how to use the diagnostics mode to debug startup crashes on physical Android devices.

## What is Diagnostics Mode?

Diagnostics mode is a special startup mode that bypasses most of the app's initialization code and presents a minimal UI with detailed information about the environment, API configuration, and any crash logs. This helps identify the root cause of startup crashes on physical devices.

## How to Build with Diagnostics Mode

1. Run the diagnostics build script:

```bash
node scripts/build-android-diagnostics.js
```

2. Follow the prompts to select your local IP address and build the APK.

3. Once the build is complete, download the APK from the Expo dashboard or the link provided.

4. Install the APK on your Android device.

## Using Diagnostics Mode

When you open the app with diagnostics mode enabled, you'll see a screen with the following information:

1. **Environment Information**
   - Platform details
   - API URLs configuration
   - Proxy settings

2. **API Connectivity Tests**
   - Test buttons for Cheerios API, CloudHub API, and Proxy API
   - Status of each API connection

3. **Crash Logs**
   - Any previous crash logs stored on the device
   - Option to clear logs

## Interpreting Results

### Common Issues to Look For:

1. **Incorrect API URLs**
   - Check if the Cheerios API URL is correctly set to `https://ch-api-dev-ooifid6utq-uc.a.run.app` for cloud or `http://YOUR_LOCAL_IP:8001` for local development
   - Check if the CloudHub API URL is correctly set to `https://ch-api-dev-ooifid6utq-uc.a.run.app`

2. **API Connection Failures**
   - If API connectivity tests fail, it may indicate network issues or API service problems
   - Check if your device has internet access and can reach the API endpoints

3. **JWT Generation Errors**
   - Look for errors related to JWT token generation in the crash logs
   - These may indicate issues with the Base64 encoding or crypto libraries on mobile

4. **Environment Configuration Errors**
   - Check for errors related to loading environment configuration
   - Ensure the environment files are properly formatted and accessible

## Accessing Crash Logs

Crash logs are stored in the app's document directory:

- `bar_buddy_crash.txt`: Contains all crash logs
- `bar_buddy_latest_crash.txt`: Contains only the most recent crash

You can access these files using Android File Transfer or by connecting your device to a computer and browsing the internal storage.

## Disabling Diagnostics Mode

Once you've identified and fixed the issue, you can disable diagnostics mode by:

1. Opening `app/_layout.tsx`
2. Changing `const ENABLE_DIAGNOSTICS_MODE = true` to `const ENABLE_DIAGNOSTICS_MODE = false`
3. Rebuilding the app

## Troubleshooting Tips

1. **If the app still crashes in diagnostics mode:**
   - Check the device logs using `adb logcat`
   - Look for native crashes that might occur before JavaScript execution

2. **If API tests fail:**
   - Try accessing the API endpoints from a browser on your device
   - Check if the API services are running and accessible

3. **If environment configuration is incorrect:**
   - Manually verify the contents of `app/config/environment.js` and `modules/config/environment.ts`
   - Ensure the mobile environment is properly configured

4. **If JWT generation fails:**
   - Consider implementing a simplified JWT generation method for mobile
   - Check for compatibility issues with crypto libraries on Android
