# Building and Testing bar-buddy on Android

This guide provides instructions for building and testing the bar-buddy app on an Android device.

## Prerequisites

- Node.js and npm installed
- Expo CLI installed (`npm install -g expo-cli`)
- EAS CLI installed (`npm install -g eas-cli`)
- An Expo account (create one at [expo.dev](https://expo.dev/signup))
- Android device or emulator

## Option 1: Building with EAS Build (Recommended)

EAS Build is Expo's cloud build service that creates native app binaries for you. This is the easiest way to build an APK.

### Step 1: Log in to your Expo account

```bash
npx eas login
```

### Step 2: Configure your local IP address

Run the build helper script:

```bash
node scripts/build-android.js
```

This script will:
1. Detect your local IP address
2. Update the environment configuration files
3. Offer to build the APK for you

### Step 3: Start the proxy server

Before testing the app, make sure to start the proxy server on your computer:

```bash
node modules/api-proxy/services/proxyServer.js
```

### Step 4: Install and test the APK

1. Download the APK from the Expo dashboard or the link provided after the build completes
2. Transfer the APK to your Android device
3. Install the APK by opening it on your device
4. Make sure your Android device is connected to the same network as your computer
5. Open the app and test the functionality

## Option 2: Building Locally with Expo Dev Client

If you prefer to build locally or don't want to create an Expo account, you can use the Expo Dev Client.

### Step 1: Install the Expo Go app

Install the Expo Go app from the Google Play Store on your Android device.

### Step 2: Configure your local IP address

Run the build helper script to update the environment configuration:

```bash
node scripts/build-android.js
```

When asked if you want to build the APK, select "n".

### Step 3: Start the development server

```bash
npm run android
```

### Step 4: Connect to the development server

1. Make sure your Android device is connected to the same network as your computer
2. Open the Expo Go app on your Android device
3. Scan the QR code displayed in your terminal or select the project from the "Recently Opened" list

## Troubleshooting

### Connection Issues

If the app cannot connect to the proxy server:

1. Make sure your Android device and computer are on the same network
2. Verify that the proxy server is running (`node modules/api-proxy/services/proxyServer.js`)
3. Check that you've used the correct IP address in the configuration
4. Ensure no firewall is blocking the connection

### Build Issues

If you encounter issues with EAS Build:

1. Make sure you're logged in to your Expo account
2. Verify that your `eas.json` file is correctly configured
3. Check the EAS Build logs for specific error messages

## Notes

- The APK built with EAS Build is for testing purposes and is not optimized for production
- The app is configured to connect to your local proxy server, which must be running for the app to function correctly
- Remember to update the IP address in the configuration if your computer's IP address changes
