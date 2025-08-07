/**
 * This script patches the expo-router package to avoid using the problematic use-latest-callback package
 */
const fs = require('fs');
const path = require('path');

console.log('Patching expo-router to fix build issues...');

// Create a custom implementation of use-latest-callback
const customImplementationDir = path.join(__dirname, 'node_modules', 'use-latest-callback');
const libDir = path.join(customImplementationDir, 'lib');
const indexPath = path.join(libDir, 'index.js');

// Create directories if they don't exist
if (!fs.existsSync(libDir)) {
  console.log('Creating lib directory...');
  fs.mkdirSync(libDir, { recursive: true });
}

// Create the index.js file with a working implementation
console.log('Creating use-latest-callback implementation...');
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

// Check if the package.json exists and update it if needed
const packageJsonPath = path.join(customImplementationDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('Updating package.json...');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update the main field to point to the correct file
  packageJson.main = './lib/index.js';
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

console.log('Successfully patched expo-router dependencies!');
