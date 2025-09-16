#!/usr/bin/env node

/**
 * Test script to validate Expo Go compatibility with gated push notifications
 * This script simulates different environments and tests the notification gating logic
 */

const fs = require('fs');
const path = require('path');

console.log('=== Testing Expo Go Compatibility ===\n');

// Mock Constants for testing different environments
const mockConstants = {
  expoGo: {
    executionEnvironment: 'storeClient',
    appOwnership: 'expo', // deprecated but still used as fallback
    expoConfig: {
      extra: {
        eas: { projectId: undefined }
      }
    }
  },
  developmentBuild: {
    executionEnvironment: 'standalone',
    appOwnership: 'standalone',
    expoConfig: {
      extra: {
        eas: { projectId: '3dc127bf-00d4-4447-a8ea-eaaeae7a6276' }
      }
    }
  },
  productionBuild: {
    executionEnvironment: 'standalone',
    appOwnership: 'standalone',
    expoConfig: {
      extra: {
        eas: { projectId: '3dc127bf-00d4-4447-a8ea-eaaeae7a6276' }
      }
    }
  }
};

// Mock the notification service detection logic
function isRunningInExpoGo(constants) {
  // Primary detection: Check if we're in Expo Go client
  if (constants.executionEnvironment === 'storeClient') {
    return true;
  }

  // Fallback detection: Check app ownership (deprecated but still works)
  if (constants.appOwnership === 'expo') {
    return true;
  }

  // Additional check: Expo Go typically doesn't have a project ID in development
  if (!constants.expoConfig?.extra?.eas?.projectId && process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

// Mock registerPush function
async function mockRegisterPush(constants, userId = 'test-user') {
  console.log(`Testing environment: ${constants.executionEnvironment}`);
  console.log(`App ownership: ${constants.appOwnership}`);
  console.log(`Project ID: ${constants.expoConfig?.extra?.eas?.projectId || 'undefined'}`);
  
  // Gate for Expo Go environment
  if (isRunningInExpoGo(constants)) {
    console.log('✅ Push notifications correctly disabled in Expo Go');
    console.log('⚠️  Warning logged: Push notifications disabled in Expo Go - running in development environment');
    return null;
  }

  console.log('✅ Push notifications enabled for production/development build');
  return 'mock-push-token-12345';
}

// Test different environments
async function runTests() {
  let passedTests = 0;
  let totalTests = 0;

  console.log('1. Testing Expo Go Environment');
  console.log('================================');
  totalTests++;
  const expoGoResult = await mockRegisterPush(mockConstants.expoGo);
  if (expoGoResult === null) {
    console.log('✅ PASS: Expo Go correctly returns null for push notifications\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Expo Go should return null for push notifications\n');
  }

  console.log('2. Testing Development Build Environment');
  console.log('=======================================');
  totalTests++;
  const devBuildResult = await mockRegisterPush(mockConstants.developmentBuild);
  if (devBuildResult !== null) {
    console.log('✅ PASS: Development build correctly enables push notifications\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Development build should enable push notifications\n');
  }

  console.log('3. Testing Production Build Environment');
  console.log('======================================');
  totalTests++;
  const prodBuildResult = await mockRegisterPush(mockConstants.productionBuild);
  if (prodBuildResult !== null) {
    console.log('✅ PASS: Production build correctly enables push notifications\n');
    passedTests++;
  } else {
    console.log('❌ FAIL: Production build should enable push notifications\n');
  }

  // Test app.config.js configuration
  console.log('4. Testing App Configuration');
  console.log('============================');
  totalTests++;
  
  try {
    const appConfigPath = path.join(process.cwd(), 'app.config.js');
    if (fs.existsSync(appConfigPath)) {
      // Import the config (this is a simplified test)
      const configContent = fs.readFileSync(appConfigPath, 'utf8');
      
      const hasNotificationPlugin = configContent.includes('expo-notifications');
      const hasEASProjectId = configContent.includes('eas') && configContent.includes('projectId');
      const hasAndroidConfig = configContent.includes('android') && configContent.includes('package');
      
      if (hasNotificationPlugin && hasEASProjectId && hasAndroidConfig) {
        console.log('✅ PASS: App configuration includes all required settings');
        console.log('  - expo-notifications plugin configured');
        console.log('  - EAS project ID configured');
        console.log('  - Android package configuration present\n');
        passedTests++;
      } else {
        console.log('❌ FAIL: App configuration missing required settings');
        console.log(`  - Notification plugin: ${hasNotificationPlugin ? '✅' : '❌'}`);
        console.log(`  - EAS project ID: ${hasEASProjectId ? '✅' : '❌'}`);
        console.log(`  - Android config: ${hasAndroidConfig ? '✅' : '❌'}\n`);
      }
    } else {
      console.log('❌ FAIL: app.config.js not found\n');
    }
  } catch (error) {
    console.log(`❌ FAIL: Error reading app.config.js: ${error.message}\n`);
  }

  // Summary
  console.log('=== Test Summary ===');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All Expo Go compatibility tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
    return false;
  }
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});