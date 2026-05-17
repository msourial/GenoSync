// Monorepo-aware Metro config.
// The app lives at <repo>/artifacts/solana/app while many deps
// (@react-native/js-polyfills, etc.) are hoisted to <repo>/node_modules.
// Metro can only SHA-1 / transform files under projectRoot or watchFolders,
// so the monorepo root must be watched and its node_modules resolvable.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
