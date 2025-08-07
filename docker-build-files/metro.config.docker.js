// @ts-check
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Create a modified config object
const modifiedConfig = {
  ...config,
  resolver: {
    ...config.resolver,
    // Provide fallbacks for Node.js core modules
    extraNodeModules: {
      'crypto': path.resolve(__dirname, 'node_modules/expo-crypto'),
      'stream': path.resolve(__dirname, 'node_modules/stream-browserify'),
      'buffer': path.resolve(__dirname, 'node_modules/buffer'),
      // Add path aliases for Docker build
      '@': path.resolve(__dirname),
      'components': path.resolve(__dirname, 'components'),
      'modules': path.resolve(__dirname, 'modules'),
      'hooks': path.resolve(__dirname, 'hooks'),
      'constants': path.resolve(__dirname, 'constants'),
      'assets': path.resolve(__dirname, 'assets'),
    },
    // Ensure we process all files in node_modules
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
    ],
    // Add support for specific file extensions
    sourceExts: [
      ...(config.resolver.sourceExts || []),
      'jsx',
      'js',
      'ts',
      'tsx',
      'cjs',
      'mjs',
      'json',
    ],
  },
};

module.exports = modifiedConfig;
