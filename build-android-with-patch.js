/**
 * Custom build script for Android that applies patches before building
 */
const { execSync } = require('child_process');

console.log('=== Starting Android build with patches ===');

// Step 1: Apply patches
console.log('\n=== Applying patches ===');
try {
  console.log('Patching expo-router dependencies...');
  execSync('node patch-expo-router.js', { stdio: 'inherit' });
  console.log('Patches applied successfully!');
} catch (error) {
  console.error('Failed to apply patches:', error);
  process.exit(1);
}

// Step 2: Start the EAS build
console.log('\n=== Starting EAS build ===');
try {
  console.log('Building Android app...');
  execSync('npx eas build -p android --profile preview --non-interactive', { stdio: 'inherit' });
  console.log('Build command executed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

console.log('\n=== Build process completed ===');
