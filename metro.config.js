const { getDefaultConfig } = require('expo/metro-config'); 
const path = require('path'); 
const config = getDefaultConfig(__dirname); 
const modifiedConfig = { 
  ...config, 
  resolver: { 
    ...config.resolver, 
    extraNodeModules: { 
      '@': path.resolve(__dirname), 
    }, 
  }, 
}; 
module.exports = modifiedConfig; 
