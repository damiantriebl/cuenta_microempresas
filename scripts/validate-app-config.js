#!/usr/bin/env node

/**
 * App Configuration Validation Script
 * Validates that the app configuration is properly set up for multi-environment support
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating app configuration...\n');

// Check if app.json or app.config.js exists
const appJsonPath = path.join(process.cwd(), 'app.json');
const appConfigPath = path.join(process.cwd(), 'app.config.js');

let config;
let configSource;

if (fs.existsSync(appJsonPath)) {
  console.log('✅ app.json exists');
  configSource = 'app.json';
  try {
    const jsonContent = fs.readFileSync(appJsonPath, 'utf8');
    config = JSON.parse(jsonContent).expo;
  } catch (error) {
    console.error('❌ Failed to parse app.json:', error.message);
    process.exit(1);
  }
} else if (fs.existsSync(appConfigPath)) {
  console.log('✅ app.config.js exists');
  configSource = 'app.config.js';
  try {
    config = require(appConfigPath);
    if (typeof config === 'function') {
      config = config();
    }
  } catch (error) {
    console.error('❌ Failed to load app.config.js:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ Neither app.json nor app.config.js found');
  process.exit(1);
}
console.log(`✅ ${configSource} loads successfully`);

// Debug: Show what we loaded
console.log('🔍 Debug - Config keys:', Object.keys(config));
console.log('🔍 Debug - Extra keys:', Object.keys(config.expo?.extra || {}));
console.log('🔍 Debug - EAS object:', config.expo?.extra?.eas);

// Validate EAS project ID
if (!config.extra?.eas?.projectId) {
  console.error('❌ EAS project ID not configured');
  process.exit(1);
}
console.log('✅ EAS project ID configured:', config.extra.eas.projectId);

// Validate that expo-notifications plugin is NOT present (we removed it)
const notificationPlugin = config.plugins?.find(plugin => 
  Array.isArray(plugin) && plugin[0] === 'expo-notifications'
);
if (notificationPlugin) {
  console.error('❌ expo-notifications plugin still configured (should be removed)');
  process.exit(1);
}
console.log('✅ expo-notifications plugin properly removed');

// Validate basic required plugins
const requiredPlugins = ['expo-dev-client', 'expo-router'];
const configuredPlugins = config.plugins || [];

requiredPlugins.forEach(pluginName => {
  const isConfigured = configuredPlugins.some(plugin => {
    if (typeof plugin === 'string') return plugin === pluginName;
    if (Array.isArray(plugin)) return plugin[0] === pluginName;
    return false;
  });
  
  if (isConfigured) {
    console.log(`✅ ${pluginName} plugin configured`);
  } else {
    console.error(`❌ ${pluginName} plugin not configured`);
    process.exit(1);
  }
});

// Validate Android configuration
if (!config.android?.package) {
  console.error('❌ Android package name not configured');
  process.exit(1);
}
console.log('✅ Android package name configured:', config.android.package);

// Validate iOS configuration (optional but recommended)
if (config.ios?.bundleIdentifier) {
  console.log('✅ iOS bundle identifier configured:', config.ios.bundleIdentifier);
} else {
  console.warn('⚠️  iOS bundle identifier not configured (optional)');
}

// Validate basic app information
if (!config.name) {
  console.error('❌ App name not configured');
  process.exit(1);
}
console.log('✅ App name configured:', config.name);

if (!config.version) {
  console.error('❌ App version not configured');
  process.exit(1);
}
console.log('✅ App version configured:', config.version);

console.log('\n🎉 App configuration validation completed successfully!');
console.log('\n📋 Configuration Summary:');
console.log(`   • App Name: ${config.name}`);
console.log(`   • Version: ${config.version}`);
console.log(`   • Android Package: ${config.android.package}`);
console.log(`   • EAS Project: ${config.extra.eas.projectId}`);
console.log(`   • Push Notifications: Disabled (properly removed)`);