module.exports = function (api) {
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
      ['transform-inline-environment-variables', {
        include: [
          'NODE_ENV',
          'REACT_APP_*',
        ]
      }],
      'react-native-reanimated/plugin',
    ],
  };
};