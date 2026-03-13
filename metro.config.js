/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Windows path resolution
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs'
];

// Remove duplicates by using Set
config.resolver.sourceExts = [...new Set(config.resolver.sourceExts)];

// Ensure proper asset resolution
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts.push('svg');
config.resolver.sourceExts = [...new Set(config.resolver.sourceExts)];

// Add specific resolver for expo-router
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('expo-router')) {
    // Force correct path resolution
    return context.resolveRequest(
      context,
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;