/**
 * This script fixes the issue with the use-latest-callback package
 * by creating the missing file structure that's causing build failures.
 * 
 * The error shows that the package is looking for:
 * /node_modules/use-latest-callback/lib/index.js
 */
const fs = require('fs');
const path = require('path');

// Path to the package
const packagePath = path.join(__dirname, 'node_modules', 'use-latest-callback');
const libPath = path.join(packagePath, 'lib');
const indexPath = path.join(libPath, 'index.js');

// Check if the package exists
if (!fs.existsSync(packagePath)) {
  console.error('Error: use-latest-callback package not found');
  process.exit(1);
}

// Create the lib directory if it doesn't exist
if (!fs.existsSync(libPath)) {
  console.log('Creating lib directory...');
  fs.mkdirSync(libPath, { recursive: true });
}

// Create the index.js file with the correct content
console.log('Creating index.js file...');

// Get the actual source code from the package
const srcPath = path.join(packagePath, 'src', 'index.js');
let content = '';

if (fs.existsSync(srcPath)) {
  // If the source file exists, copy its content
  content = fs.readFileSync(srcPath, 'utf8');
  console.log('Copied content from src/index.js');
} else {
  // Otherwise, create a basic implementation
  content = `
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
  console.log('Created new implementation');
}

// Write the content to the index.js file
fs.writeFileSync(indexPath, content);

// Check if the package.json exists and if it points to the correct main file
const packageJsonPath = path.join(packagePath, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`Current main field in package.json: ${packageJson.main}`);
  
  // If the main field doesn't point to lib/index.js, update it
  if (packageJson.main !== './lib/index.js') {
    packageJson.main = './lib/index.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json main field to ./lib/index.js');
  }
}

console.log('Successfully fixed use-latest-callback package!');
