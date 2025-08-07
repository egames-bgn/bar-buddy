/**
 * D Drive Configuration for Expo/React Native Hot Swapping
 * This script configures Expo and React Native to use D drive for caching and hot reload
 */

const path = require('path');
const fs = require('fs');

// Create necessary directories if they don't exist
const directories = [
  'D:\\Temp\\expo-cache',
  'D:\\Temp\\metro-cache',
  'D:\\Temp\\babel-cache',
  'D:\\Temp\\react-native-packager-cache',
  'D:\\Temp\\haste-map',
  'D:\\Temp\\hot-update'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Export configuration for various tools
module.exports = {
  // Metro bundler config
  metro: {
    cacheStores: [
      {
        name: 'metro-cache',
        directory: 'D:\\Temp\\metro-cache'
      }
    ],
    cacheDirectory: 'D:\\Temp\\metro-cache',
    hasteMapCacheDirectory: 'D:\\Temp\\haste-map'
  },
  
  // Babel config
  babel: {
    cacheDirectory: 'D:\\Temp\\babel-cache'
  },
  
  // Expo config
  expo: {
    cacheDirectory: 'D:\\Temp\\expo-cache'
  },
  
  // Hot update config
  hotUpdate: {
    path: 'D:\\Temp\\hot-update'
  },
  
  // Webpack config (for web)
  webpack: {
    cache: {
      type: 'filesystem',
      cacheDirectory: 'D:\\Temp\\webpack-cache'
    },
    output: {
      path: 'D:\\Temp\\webpack-output'
    }
  }
};

console.log('Expo/React Native configured to use D drive for caching and hot reload');
