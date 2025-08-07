module.exports = function(api) { 
  api.cache(true); 
  return { 
    presets: ['babel-preset-expo'], 
    plugins: [ 
      ['module-resolver', { 
        root: ['.'], 
        alias: { 
          '@': '.',
          '~': './src',
        }, 
      }], 
      'expo-router/babel', 
      'react-native-reanimated/plugin',
      ['transform-inline-environment-variables', {
        include: [
          'NODE_ENV',
          'REACT_APP_*',
        ]
      }],
    ], 
  }; 
}; 
