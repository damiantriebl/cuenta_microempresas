const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for React 19 with Expo Router
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper resolution of React modules
config.resolver.alias = {
  ...config.resolver.alias,
  'react': require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
};

module.exports = config;