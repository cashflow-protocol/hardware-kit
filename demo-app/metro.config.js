const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

// Monorepo root (one level up from demo-app)
const monorepoRoot = path.resolve(__dirname, '..');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

/**
 * Metro configuration for the demo app in a pnpm monorepo.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot],

  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      rootNodeModules,
    ],
    disableHierarchicalLookup: false,

    // Block duplicate react/react-native copies nested inside other packages
    blockList: [
      /node_modules\/.*\/node_modules\/react\//,
      /node_modules\/.*\/node_modules\/react-native\//,
      /node_modules\/\.pnpm\//,
    ],

    // Force single copies of shared packages
    extraNodeModules: {
      'react': path.resolve(rootNodeModules, 'react'),
      'react-native': path.resolve(rootNodeModules, 'react-native'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert'),
      events: require.resolve('events'),
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
