#!/usr/bin/env node

/**
 * App Configuration Validation Script
 * Validates that the app configuration is properly set up for multi-environment support
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating app configuration...\n');

// Check if app.config.js exists
const appConfigPath = path.join(process.cwd(), 'app.config.js');
if (!fs.existsSync(appConfigPath)) {
  console.error('❌ app.config.js not found');
  process.exit(1);
}
console.log('✅ app.config.js exists');

// Load and validate app.config.js
let config;
try {
  config = require(appConfigPath);
  if (typeof config === 'function') {
    config = config();
  }
} catch (error) {
  console.error('❌ Failed to load app.config.js:', error.message);
  process.exit(1);
}
console.log('✅ app.config.js loads successfully');

// Debug: Show what we loaded
console.log('🔍 Debug - Config keys:', Object.keys(config));
console.log('🔍 Debug - Expo keys:', Object.keys(config.expo || {}));
console.log('🔍 Debug - Extra keys:', Object.keys(config.expo?.extra || {}));
console.log('🔍 Debug - EAS object:', config.expo?.extra?.eas);

// Validate EAS project ID
if (!config.expo?.extra?.eas?.projectId) {
  console.error('❌ EAS project ID not configured');
  process.exit(1);
}
console.log('✅ EAS project ID configured:', config.expo.extra.eas.projectId);

// Validate expo-notifications plugin
const notificationPlugin = config.expo?.plugins?.find(plugin => 
  Array.isArray(plugin) && plugin[0] === 'expo-notifications'
);
if (!notificationPlugin) {
  console.error('❌ expo-notifications plugin not configured');
  process.exit(1);
}
console.log('✅ expo-notifications plugin configured');

// Validate notification icon
const notificationConfig = notificationPlugin[1];
if (!notificationConfig?.icon) {
  console.error('❌ Notification icon not configured');
  process.exit(1);
}

const iconPath = path.join(process.cwd(), notificationConfig.icon);
if (!fs.existsSync(iconPath)) {
  console.error('❌ Notification icon file not found:', notificationConfig.icon);
  process.exit(1);
}
console.log('✅ Notification icon configured and exists:', notificationConfig.icon);

// Validate notification color
if (!notificationConfig?.color) {
  console.error('❌ Notification color not configured');
  process.exit(1);
}
console.log('✅ Notification color configured:', notificationConfig.color);

// Validate Android configuration
if (!config.expo?.android?.package) {
  console.error('❌ Android package name not configured');
  process.exit(1);
}
console.log('✅ Android package name configured:', config.expo.android.package);

// Check google-services.json
const googleServicesPath = path.join(process.cwd(), 'android/app/google-services.json');
if (!fs.existsSync(googleServicesPath)) {
  console.warn('⚠️  google-services.json not found - this is needed for production builds');
} else {
  console.log('✅ google-services.json exists');
}

// Validate Android googleServicesFile reference
if (!config.expo?.android?.googleServicesFile) {
  console.error('❌ Android googleServicesFile not configured');
  process.exit(1);
}
console.log('✅ Android googleServicesFile configured:', config.expo.android.googleServicesFile);

console.log('\n🎉 App configuration validation completed successfully!');
console.log('\n📋 Configuration Summary:');
console.log(`   • App Name: ${config.expo.name}`);
console.log(`   • Package: ${config.expo.android.package}`);
console.log(`   • EAS Project: ${config.expo.extra.eas.projectId}`);
console.log(`   • Notification Icon: ${notificationConfig.icon}`);
console.log(`   • Notification Color: ${notificationConfig.color}`);
console.log(`   • Google Services: ${config.expo.android.googleServicesFile}`);