/**
 * Android Build Helper Script (Non-interactive version)
 * 
 * This script helps prepare the app for Android APK building by:
 * 1. Using the first detected IP address
 * 2. Configuring for direct API calls
 * 3. Building the APK using EAS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Get the local IP address of the machine
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const k in interfaces) {
    for (const k2 in interfaces[k]) {
      const address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        addresses.push(address.address);
      }
    }
  }
  
  return addresses[0]; // Return the first detected IP address
}

// Main function
async function main() {
  try {
    console.log('=========================================');
    console.log('bar-buddy Android Build Helper (Direct API Mode)');
    console.log('=========================================');
    console.log('\nThis script will build an APK for Android testing with direct API calls.\n');
    
    // Get local IP address
    const selectedIp = getLocalIpAddress();
    console.log(`\nUsing IP address: ${selectedIp}`);
    
    // Update environment files with the selected IP
    console.log('\nUpdating environment configuration...');
    
    // Update app/config/environment.js
    const appEnvPath = path.join(__dirname, '..', 'app', 'config', 'environment.js');
    if (fs.existsSync(appEnvPath)) {
      let envContent = fs.readFileSync(appEnvPath, 'utf8');
      envContent = envContent.replace(/proxyUrl: ['"](http:\/\/YOUR_LOCAL_IP:3000|http:\/\/\d+\.\d+\.\d+\.\d+:3000)['"]/, `proxyUrl: 'http://${selectedIp}:3000'`);
      envContent = envContent.replace(/cheeriosApiUrl: ['"](http:\/\/YOUR_LOCAL_IP:8001|http:\/\/\d+\.\d+\.\d+\.\d+:8001)['"]/, `cheeriosApiUrl: 'http://${selectedIp}:8001'`);
      
      // Configure for direct API calls
      console.log('\nConfiguring APK to make direct API calls to cloud services...');
      if (envContent.includes('mobile: {')) {
        envContent = envContent.replace(/mobile:\s*{[\s\S]*?useProxy:\s*true/m, 'mobile: {\n    apiUrl: \'https://dev-api.example.com\',\n    proxyUrl: \'\',\n    cheeriosApiUrl: \'https://ch-api-dev-ooifid6utq-uc.a.run.app\',\n    cloudHubApiUrl: \'https://ch-api-dev-ooifid6utq-uc.a.run.app\',\n    useProxy: false');
      }
      
      fs.writeFileSync(appEnvPath, envContent);
      console.log('- Updated app/config/environment.js');
    }
    
    // Update modules/config/environment.ts
    const modulesEnvPath = path.join(__dirname, '..', 'modules', 'config', 'environment.ts');
    if (fs.existsSync(modulesEnvPath)) {
      let envContent = fs.readFileSync(modulesEnvPath, 'utf8');
      envContent = envContent.replace(/apiProxyUrl: ['"](http:\/\/YOUR_LOCAL_IP:3000|http:\/\/\d+\.\d+\.\d+\.\d+:3000)['"]/, `apiProxyUrl: 'http://${selectedIp}:3000'`);
      
      // Update the cheeriosApiUrl in the DEV environment
      envContent = envContent.replace(/cheeriosApiUrl: ['"](http:\/\/YOUR_LOCAL_IP:8001|http:\/\/\d+\.\d+\.\d+\.\d+:8001|http:\/\/localhost:8001)['"]/, `cheeriosApiUrl: 'http://${selectedIp}:8001'`);
      
      // Update the ANDROID_DEVICE environment
      if (envContent.includes('[Environment.ANDROID_DEVICE]')) {
        envContent = envContent.replace(/\[Environment\.ANDROID_DEVICE\]: \{[\s\S]*?apiProxyUrl: ['"](http:\/\/YOUR_LOCAL_IP:3000|http:\/\/\d+\.\d+\.\d+\.\d+:3000)['"]/, `[Environment.ANDROID_DEVICE]: {\n    apiBaseUrl: 'https://dev-api.example.com',\n    apiProxyUrl: 'http://${selectedIp}:3000'`);
        envContent = envContent.replace(/cheeriosApiUrl: ['"](http:\/\/YOUR_LOCAL_IP:8001|http:\/\/\d+\.\d+\.\d+\.\d+:8001|http:\/\/localhost:8001)['"]/, `cheeriosApiUrl: 'http://${selectedIp}:8001'`);
      }
      
      // Update the MOBILE environment for direct API calls
      if (envContent.includes('[Environment.MOBILE]')) {
        envContent = envContent.replace(/\[Environment\.MOBILE\]: \{[\s\S]*?useProxy: (true|false)/, `[Environment.MOBILE]: {\n    apiBaseUrl: 'https://dev-api.example.com',\n    apiProxyUrl: '',\n    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    useProxy: false`);
      }
      
      fs.writeFileSync(modulesEnvPath, envContent);
      console.log('- Updated modules/config/environment.ts');
    }
    
    console.log('\nEnvironment configuration updated successfully!');
    
    // Build the APK
    console.log('\nBuilding APK using EAS...');
    console.log('This may take several minutes...');
    
    try {
      execSync('npx eas build -p android --profile preview', { stdio: 'inherit' });
      console.log('\nAPK build completed successfully!');
    } catch (error) {
      console.error('\nError building APK:', error.message);
      console.log('\nYou can try building manually with: npx eas build -p android --profile preview');
    }
    
    console.log('\nDone! Your app is now configured for Android testing.');
    console.log('\nRemember that this APK is configured for direct API calls to:');
    console.log('- Cheerios API: https://ch-api-dev-ooifid6utq-uc.a.run.app');
    console.log('- CloudHub API: https://ch-api-dev-ooifid6utq-uc.a.run.app');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main();
