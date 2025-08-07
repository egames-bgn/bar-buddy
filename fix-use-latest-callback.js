/**
 * This script fixes the issue with the use-latest-callback package
 * by creating the missing file structure that's causing build failures.
 */
const fs = require('fs');
const path = require('path');

// Path to the package
const packagePath = path.join(__dirname, 'node_modules', 'use-latest-callback');
const libSrcPath = path.join(packagePath, 'lib', 'src');
const indexPath = path.join(libSrcPath, 'index.js');

// Check if the package exists
if (!fs.existsSync(packagePath)) {
  console.error('Error: use-latest-callback package not found');
  process.exit(1);
}

// Create the lib/src directory if it doesn't exist
if (!fs.existsSync(libSrcPath)) {
  console.log('Creating lib/src directory...');
  fs.mkdirSync(libSrcPath, { recursive: true });
}

// Create the index.js file with the correct content
console.log('Creating index.js file...');

// Get the actual source code from the package
const srcPath = path.join(packagePath, 'src', 'index.js');
let content = '';

if (fs.existsSync(srcPath)) {
  // If the source file exists, copy its content
  content = fs.readFileSync(srcPath, 'utf8');
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
}

// Write the content to the index.js file
fs.writeFileSync(indexPath, content);

console.log('Successfully fixed use-latest-callback package!');
