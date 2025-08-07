/**
 * Android Build Helper Script
 * 
 * This script helps prepare the app for Android APK building by:
 * 1. Prompting for your local IP address to use in the Android build
 * 2. Updating the environment configuration with your IP address
 * 3. Building the APK using EAS
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
  
  return addresses;
}

// Main function
async function main() {
  try {
    console.log('=========================================');
    console.log('bar-buddy Android Build Helper');
    console.log('=========================================');
    console.log('\nThis script will help you build an APK for Android testing.\n');
    
    // Get local IP addresses
    const ipAddresses = getLocalIpAddress();
    
    console.log('Detected local IP addresses:');
    ipAddresses.forEach((ip, index) => {
      console.log(`${index + 1}. ${ip}`);
    });
    
    // Prompt for IP address selection
    const selectedIp = await new Promise((resolve) => {
      rl.question('\nSelect the IP address to use (number), or enter a custom one: ', (answer) => {
        if (!isNaN(answer) && parseInt(answer) >= 1 && parseInt(answer) <= ipAddresses.length) {
          resolve(ipAddresses[parseInt(answer) - 1]);
        } else {
          resolve(answer);
        }
      });
    });
    
    console.log(`\nUsing IP address: ${selectedIp}`);
    
    // Update environment files with the selected IP
    console.log('\nUpdating environment configuration...');
    
    // Update app/config/environment.js
    const appEnvPath = path.join(__dirname, '..', 'app', 'config', 'environment.js');
    if (fs.existsSync(appEnvPath)) {
      let envContent = fs.readFileSync(appEnvPath, 'utf8');
      envContent = envContent.replace(/proxyUrl: ['"](http:\/\/YOUR_LOCAL_IP:3000|http:\/\/\d+\.\d+\.\d+\.\d+:3000)['"]/, `proxyUrl: 'http://${selectedIp}:3000'`);
      envContent = envContent.replace(/cheeriosApiUrl: ['"](http:\/\/YOUR_LOCAL_IP:8001|http:\/\/\d+\.\d+\.\d+\.\d+:8001)['"]/, `cheeriosApiUrl: 'http://${selectedIp}:8001'`);
      
      // Ask if they want to use direct API calls or proxy for the APK
      const useDirect = await new Promise((resolve) => {
        rl.question('\nDo you want the APK to make direct API calls to the cloud services? (y/n): ', (answer) => {
          resolve(answer.toLowerCase() === 'y');
        });
      });
      
      if (useDirect) {
        console.log('\nConfiguring APK to make direct API calls to cloud services...');
        // Make sure the mobile environment is set to use direct API calls
        if (envContent.includes('mobile: {')) {
          envContent = envContent.replace(/mobile:\s*{[\s\S]*?useProxy:\s*true/m, 'mobile: {\n    apiUrl: \'https://dev-api.example.com\',\n    proxyUrl: \'\',\n    cheeriosApiUrl: \'https://ch-api-dev-ooifid6utq-uc.a.run.app\',\n    cloudHubApiUrl: \'https://ch-api-dev-ooifid6utq-uc.a.run.app\',\n    useProxy: false');
        }
      } else {
        console.log(`\nConfiguring APK to use proxy at ${selectedIp}...`);
        // Make sure the mobile environment is set to use the proxy
        if (envContent.includes('mobile: {')) {
          envContent = envContent.replace(/mobile:\s*{[\s\S]*?useProxy:\s*false/m, `mobile: {\n    apiUrl: 'https://dev-api.example.com',\n    proxyUrl: 'http://${selectedIp}:3000',\n    cheeriosApiUrl: 'http://${selectedIp}:8001',\n    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    useProxy: true`);
        }
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
      
      // Update the MOBILE environment based on user choice
      if (useDirect && envContent.includes('[Environment.MOBILE]')) {
        envContent = envContent.replace(/\[Environment\.MOBILE\]: \{[\s\S]*?useProxy: (true|false)/, `[Environment.MOBILE]: {\n    apiBaseUrl: 'https://dev-api.example.com',\n    apiProxyUrl: '',\n    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    useProxy: false`);
      } else if (!useDirect && envContent.includes('[Environment.MOBILE]')) {
        envContent = envContent.replace(/\[Environment\.MOBILE\]: \{[\s\S]*?useProxy: (true|false)/, `[Environment.MOBILE]: {\n    apiBaseUrl: 'https://dev-api.example.com',\n    apiProxyUrl: 'http://${selectedIp}:3000',\n    cheeriosApiUrl: 'http://${selectedIp}:8001',\n    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    useProxy: true`);
      }
      
      fs.writeFileSync(modulesEnvPath, envContent);
      console.log('- Updated modules/config/environment.ts');
    }
    
    console.log('\nEnvironment configuration updated successfully!');
    
    // Ask if the user wants to build the APK
    const buildApk = await new Promise((resolve) => {
      rl.question('\nDo you want to build the APK now? (y/n): ', (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
    
    if (buildApk) {
      console.log('\nBuilding APK using EAS...');
      console.log('This may take several minutes...');
      
      try {
        execSync('npx eas build -p android --profile preview', { stdio: 'inherit' });
        console.log('\nAPK build completed successfully!');
      } catch (error) {
        console.error('\nError building APK:', error.message);
        console.log('\nYou can try building manually with: npx eas build -p android --profile preview');
      }
    } else {
      console.log('\nYou can build the APK manually with: npx eas build -p android --profile preview');
    }
    
    console.log('\nDone! Your app is now configured for Android testing.');
    console.log('\nRemember to start the proxy server on your computer before testing:');
    console.log('node modules/api-proxy/services/proxyServer.js');
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Run the main function
main();
