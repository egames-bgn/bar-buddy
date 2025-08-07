# Testing bar-buddy on Your Android Phone

Since building a full APK is encountering memory constraints, here are alternative methods to test the app on your Android device:

## Method 1: Using Expo Go (Easiest)

1. **Install Expo Go on your Android device**
   - Download and install the Expo Go app from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start the development server**
   ```bash
   # In the project directory
   npm run start
   ```

3. **Connect to the development server**
   - Make sure your Android device is on the same Wi-Fi network as your computer
   - Open the Expo Go app and scan the QR code shown in your terminal
   - The app will load on your device

4. **Start the proxy server**
   ```bash
   # In another terminal
   node modules/api-proxy/services/proxyServer.js
   ```

## Method 2: Using Expo Development Build

If you need more native functionality than Expo Go provides:

1. **Create a development build**
   ```bash
   npx expo run:android --device
   ```
   This requires Android Studio and proper setup of the Android development environment.

## Method 3: Using EAS Build (Requires Expo Account)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to your Expo account**
   ```bash
   eas login
   ```

3. **Build the APK**
   ```bash
   eas build -p android --profile preview
   ```

4. **Download and install the APK**
   - After the build completes, you'll receive a link to download the APK
   - Transfer the APK to your phone and install it

## Important Notes for Testing

1. **IP Address Configuration**
   - The app is configured to connect to your computer at IP address: `192.168.60.42`
   - Make sure your phone and computer are on the same network
   - If your computer's IP address changes, update the configuration in:
     - `app/config/environment.js`
     - `modules/config/environment.ts`

2. **Proxy Server**
   - Always start the proxy server before testing:
   ```bash
   node modules/api-proxy/services/proxyServer.js
   ```

3. **Troubleshooting Connection Issues**
   - If the app can't connect to the proxy server:
     - Check that your phone and computer are on the same network
     - Verify the proxy server is running
     - Make sure no firewall is blocking the connection
     - Try using a different network if available
