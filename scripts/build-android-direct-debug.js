/**
 * bar-buddy Android Build Helper (Direct API Mode with Debug)
 * 
 * This script builds an APK for Android testing with direct API calls
 * and enhanced error handling for debugging mobile crashes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Display header
console.log('\n=========================================');
console.log('bar-buddy Android Build Helper (Direct API Mode with Debug)');
console.log('=========================================\n');
console.log('This script will build an APK for Android testing with direct API calls and enhanced debugging.\n');

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      // Skip internal and non-IPv4 addresses
      if (!info.internal && info.family === 'IPv4') {
        addresses.push({
          name: interfaceName,
          address: info.address
        });
      }
    }
  }
  
  if (addresses.length === 0) {
    console.error('No network interfaces found!');
    return '127.0.0.1';
  }
  
  // Use the first available IP address
  const selectedIp = addresses[0].address;
  console.log(`\nUsing IP address: ${selectedIp}\n`);
  return selectedIp;
}

// Update environment configuration files
function updateEnvironmentConfig(ipAddress) {
  console.log('Updating environment configuration...\n');
  
  // Configure for direct API calls
  console.log('Configuring APK to make direct API calls to cloud services with enhanced debugging...');
  
  // Update JavaScript environment file
  const jsEnvPath = path.join(__dirname, '..', 'app', 'config', 'environment.js');
  try {
    let jsEnvContent = fs.readFileSync(jsEnvPath, 'utf8');
    
    // Ensure mobile environment is properly configured
    if (jsEnvContent.includes('mobile: {')) {
      // Update mobile environment with debug logging
      const mobileEnvRegex = /(mobile: \{[\s\S]*?\})/;
      const updatedMobileEnv = `mobile: {
    apiUrl: 'https://dev-api.example.com',
    proxyUrl: '', // Not used when useProxy is false
    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Direct access to Cheerios API
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app', // Direct access to CloudHub API
    useProxy: false, // Skip proxy for mobile devices
  }`;
      
      jsEnvContent = jsEnvContent.replace(mobileEnvRegex, updatedMobileEnv);
      fs.writeFileSync(jsEnvPath, jsEnvContent);
      console.log('- Updated app/config/environment.js');
    } else {
      console.error('Could not find mobile environment in JS config!');
    }
  } catch (error) {
    console.error(`Error updating JS environment file: ${error.message}`);
  }
  
  // Update TypeScript environment file
  const tsEnvPath = path.join(__dirname, '..', 'modules', 'config', 'environment.ts');
  try {
    let tsEnvContent = fs.readFileSync(tsEnvPath, 'utf8');
    
    // Ensure MOBILE environment is properly configured
    if (tsEnvContent.includes('[Environment.MOBILE]')) {
      // Update MOBILE environment with debug logging
      const mobileEnvRegex = /(\[Environment\.MOBILE\]: \{[\s\S]*?\}),/;
      const updatedMobileEnv = `[Environment.MOBILE]: {
    apiBaseUrl: 'https://dev-api.example.com',
    apiProxyUrl: '',
    cheeriosApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
    cloudHubApiUrl: 'https://ch-api-dev-ooifid6utq-uc.a.run.app',
    useProxy: false, // Skip proxy for mobile devices
    jwtSecret: 'dev-secret-key',
  },`;
      
      tsEnvContent = tsEnvContent.replace(mobileEnvRegex, updatedMobileEnv);
      fs.writeFileSync(tsEnvPath, tsEnvContent);
      console.log('- Updated modules/config/environment.ts');
    } else {
      console.error('Could not find MOBILE environment in TS config!');
    }
  } catch (error) {
    console.error(`Error updating TS environment file: ${error.message}`);
  }
  
  console.log('\nEnvironment configuration updated successfully!');
}

// Main function
async function main() {
  try {
    // Get local IP address
    const ipAddress = getLocalIpAddress();
    
    // Update environment configuration
    updateEnvironmentConfig(ipAddress);
    
    // Build APK using EAS
    console.log('\nBuilding APK using EAS...');
    console.log('This may take several minutes...');
    
    try {
      // Check if user is logged in to EAS
      console.log('\nChecking EAS login status...');
      try {
        execSync('npx eas whoami', { stdio: 'pipe' });
        console.log('Already logged in to EAS.');
      } catch (error) {
        console.error('\nYou are not logged in to EAS. Please log in manually with:');
        console.error('npx eas login');
        console.error('\nAfter logging in, run the build command:');
        console.error('npx eas build -p android --profile preview');
        return;
      }
      
      // Build the APK
      console.log('\nStarting EAS build...');
      execSync('npx eas build -p android --profile preview --non-interactive', { stdio: 'inherit' });
      console.log('\nBuild completed successfully!');
    } catch (error) {
      console.error(`\nError building APK: ${error.message}`);
      console.error('\nYou can try building manually with: npx eas build -p android --profile preview');
    }
    
    console.log('\nDone! Your app is now configured for Android testing.');
    console.log('\nRemember that this APK is configured for direct API calls to:');
    console.log('- Cheerios API: https://ch-api-dev-ooifid6utq-uc.a.run.app');
    console.log('- CloudHub API: https://ch-api-dev-ooifid6utq-uc.a.run.app');
    console.log('\nThe app has enhanced error handling to help diagnose crashes.');
  } catch (error) {
    console.error(`\nAn unexpected error occurred: ${error.message}`);
  }
}

// Run the script
main();
