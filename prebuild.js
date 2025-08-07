/**
 * This script runs before the Expo build process
 * It patches the use-latest-callback package to fix build issues
 */
const fs = require('fs');
const path = require('path');

console.log('Running pre-build script...');

// Create a custom implementation of use-latest-callback directly in node_modules
const packageDir = path.join(__dirname, 'node_modules', 'use-latest-callback');
const libDir = path.join(packageDir, 'lib');
const srcDir = path.join(packageDir, 'src');
const indexPath = path.join(libDir, 'index.js');
const srcIndexPath = path.join(srcDir, 'index.js');

// Create directories if they don't exist
if (!fs.existsSync(libDir)) {
  console.log('Creating lib directory...');
  fs.mkdirSync(libDir, { recursive: true });
}

if (!fs.existsSync(srcDir)) {
  console.log('Creating src directory...');
  fs.mkdirSync(srcDir, { recursive: true });
}

// Create the implementation files
console.log('Creating use-latest-callback implementation...');
const libContent = `
/**
 * use-latest-callback
 * Fixed implementation for React Native compatibility
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

function useLatestCallback(callback) {
  var ref = React.useRef(callback);
  ref.current = callback;
  return React.useCallback(function() {
    return ref.current.apply(ref, arguments);
  }, []);
}

exports.default = useLatestCallback;
module.exports = useLatestCallback;
module.exports.default = useLatestCallback;
`;

const srcContent = `
import * as React from 'react';

export default function useLatestCallback(callback) {
  const ref = React.useRef(callback);
  ref.current = callback;
  return React.useCallback((...args) => ref.current(...args), []);
}
`;

// Write the content to the files
fs.writeFileSync(indexPath, libContent);
fs.writeFileSync(srcIndexPath, srcContent);

// Update the package.json to point to the correct file
const packageJsonPath = path.join(packageDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('Updating package.json...');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Update the main field to point to the correct file
  packageJson.main = './lib/index.js';
  packageJson.module = './src/index.js';
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

console.log('Pre-build script completed successfully!');
