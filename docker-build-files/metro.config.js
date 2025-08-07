// @ts-check
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude test files from bundling
config.resolver.blacklistRE = [
  /.*\/__tests__\/.*/,
  /.*\/node_modules\/.*\/__tests__\/.*/,
];

// Add custom resolver for problematic modules
config.resolver.extraNodeModules = {
  // Provide fallbacks for Node.js core modules
  'crypto': path.resolve(__dirname, 'node_modules/expo-crypto'),
  'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
  'buffer': path.resolve(__dirname, 'node_modules/buffer'),
  // Use our custom NavigationContainer instead of the original
  '@react-navigation/native': path.resolve(__dirname, 'components/CustomNavigationContainer'),
};

// Ensure we process all files in node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
];

// Add support for specific file extensions
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'jsx',
  'js',
  'ts',
  'tsx',
  'cjs',
  'mjs',
  'json',
];

module.exports = config;
