/**
 * Android Diagnostics Build Helper Script
 * 
 * This script helps prepare a diagnostics-focused APK for Android to debug startup crashes:
 * 1. Configures the environment to use direct API calls to cloud services
 * 2. Ensures diagnostics mode is enabled
 * 3. Builds the APK using EAS
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
    console.log('bar-buddy Android Diagnostics Build Helper');
    console.log('=========================================');
    console.log('\nThis script will build an APK with diagnostics mode enabled.\n');
    
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
      
      // Configure the mobile environment to use direct API calls to cloud services
      console.log('\nConfiguring APK to make direct API calls to cloud services...');
      if (envContent.includes('mobile: {')) {
        envContent = envContent.replace(/mobile:\s*{[\s\S]*?useProxy:\s*true/m, 'mobile: {\n    apiUrl: \'https://dev-api.example.com\',\n    proxyUrl: \'\',\n    cheeriosApiUrl: \'https://ntnservices.dev.buzztime.com\',\n    cloudHubApiUrl: \'https://ch-api-dev-ooifid6utq-uc.a.run.app\',\n    useProxy: false');
      }
      
      // Make sure diagnostics mode is enabled in the environment config
      if (envContent.includes('enableDiagnostics:')) {
        envContent = envContent.replace(/enableDiagnostics:\s*(false|true)/m, 'enableDiagnostics: true');
      } else if (envContent.includes('mobile: {')) {
        // Add enableDiagnostics if it doesn't exist
        envContent = envContent.replace(/mobile:\s*{/m, 'mobile: {\n    enableDiagnostics: true,');
      }
      
      fs.writeFileSync(appEnvPath, envContent);
      console.log('- Updated app/config/environment.js');
    }
    
    // Update modules/config/environment.ts
    const modulesEnvPath = path.join(__dirname, '..', 'modules', 'config', 'environment.ts');
    if (fs.existsSync(modulesEnvPath)) {
      let envContent = fs.readFileSync(modulesEnvPath, 'utf8');
      
      // Update the MOBILE environment to use direct API calls
      if (envContent.includes('[Environment.MOBILE]')) {
        envContent = envContent.replace(/\[Environment\.MOBILE\]: \{[\s\S]*?useProxy: (true|false)/, `[Environment.MOBILE]: {\n    apiProxyUrl: '',\n    cheeriosApiUrl: 'https://ntnservices.dev.buzztime.com',\n    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',\n    enableDiagnostics: true,\n    useProxy: false`);
      }
      
      fs.writeFileSync(modulesEnvPath, envContent);
      console.log('- Updated modules/config/environment.ts');
    }
    
    // Ensure diagnostics mode is enabled in _layout.tsx
    const layoutPath = path.join(__dirname, '..', 'app', '_layout.tsx');
    if (fs.existsSync(layoutPath)) {
      let layoutContent = fs.readFileSync(layoutPath, 'utf8');
      
      // Check if diagnostics mode is already enabled
      if (layoutContent.includes('const ENABLE_DIAGNOSTICS_MODE = false')) {
        layoutContent = layoutContent.replace('const ENABLE_DIAGNOSTICS_MODE = false', 'const ENABLE_DIAGNOSTICS_MODE = true');
        fs.writeFileSync(layoutPath, layoutContent);
        console.log('- Updated app/_layout.tsx to enable diagnostics mode');
      } else if (layoutContent.includes('const ENABLE_DIAGNOSTICS_MODE = true')) {
        console.log('- Diagnostics mode is already enabled in app/_layout.tsx');
      } else {
        console.log('- Could not find diagnostics mode flag in app/_layout.tsx');
      }
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
        console.log('\nIMPORTANT: After installing the APK on your device, check for crash logs at:');
        console.log('- Android/data/com.yourapp.package/files/bar_buddy_crash.txt');
        console.log('- Android/data/com.yourapp.package/files/bar_buddy_latest_crash.txt');
      } catch (error) {
        console.error('\nError building APK:', error.message);
        console.log('\nYou can try building manually with: npx eas build -p android --profile preview');
      }
    } else {
      console.log('\nYou can build the APK manually with: npx eas build -p android --profile preview');
    }
    
    rl.close();
  } catch (error) {
    console.error('\nAn error occurred:', error);
    rl.close();
    process.exit(1);
  }
}

// Run the main function
main();
