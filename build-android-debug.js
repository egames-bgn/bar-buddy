/**
 * Custom build script for Android that helps debug build issues
 * This script will:
 * 1. Clean the project
 * 2. Fix the use-latest-callback package
 * 3. Create a more robust metro.config.js
 * 4. Run the EAS build with additional debug flags
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to execute commands and log output
function runCommand(command) {
  console.log(`\n> ${command}\n`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    return { success: true, output };
  } catch (error) {
    console.error(`Command failed: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

// Clean the project
console.log('=== Cleaning project ===');
runCommand('npm cache clean --force');
runCommand('rm -rf node_modules/.cache');

// Fix use-latest-callback package
console.log('\n=== Fixing use-latest-callback package ===');
const packagePath = path.join(__dirname, 'node_modules', 'use-latest-callback');
const libSrcPath = path.join(packagePath, 'lib', 'src');
const indexPath = path.join(libSrcPath, 'index.js');

// Create the lib/src directory if it doesn't exist
if (!fs.existsSync(libSrcPath)) {
  console.log('Creating lib/src directory...');
  fs.mkdirSync(libSrcPath, { recursive: true });
}

// Create the index.js file with the correct content
console.log('Creating index.js file...');
const content = `
/**
 * use-latest-callback
 * Fixed implementation for React Native compatibility
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function useLatestCallback(callback) {
  const ref = require('react').useRef(callback);
  ref.current = callback;
  return require('react').useCallback((...args) => ref.current(...args), []);
}

exports.default = useLatestCallback;
module.exports = useLatestCallback;
module.exports.default = useLatestCallback;
`;

// Write the content to the index.js file
fs.writeFileSync(indexPath, content);
console.log('Successfully fixed use-latest-callback package!');

// Create a more robust metro.config.js
console.log('\n=== Creating robust metro.config.js ===');
const metroConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for use-latest-callback package
config.resolver.extraNodeModules = {
  'use-latest-callback': path.resolve(__dirname, 'node_modules/use-latest-callback'),
};

// Exclude test files and scripts from being bundled
config.resolver.blockList = [
  // Exclude all test files
  /test-.*\\.js$/,
  /\\.test\\.js$/,
  /\\.spec\\.js$/,
  
  // Exclude scripts directory
  /scripts\\/.*/,
  
  // Exclude specific directories that might contain Node.js specific code
  /modules\\/api-proxy\\/.*/,
  
  // Exclude any temporary files
  /temp\\/.*/,
];

// Ensure we process all necessary file types
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Add specific node_modules to be processed by Metro
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;`;

fs.writeFileSync(path.join(__dirname, 'metro.config.js'), metroConfig);
console.log('Successfully created robust metro.config.js!');

// Run the EAS build with additional debug flags
console.log('\n=== Running EAS build with debug flags ===');
runCommand('npx eas build -p android --profile preview --non-interactive --no-wait');

console.log('\n=== Build process initiated ===');
console.log('Check the EAS dashboard for build logs and status.');
console.log('If the build fails, you can run "npx eas build:list" to see recent builds.');
console.log('Then run "npx eas build:view" to see detailed logs for a specific build.');
