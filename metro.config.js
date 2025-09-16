const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.alias = {
  ...config.resolver.alias,
  'react': require.resolve('react'),
  'react-dom': require.resolve('react-dom'),
};
module.exports = config;