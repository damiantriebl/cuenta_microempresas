module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: This plugin must be listed last.
      'react-native-reanimated/plugin',
    ],
    env: {
      test: {
        presets: [
          ['babel-preset-expo', { jsxRuntime: 'automatic' }]
        ]
      }
    }
  };
};


