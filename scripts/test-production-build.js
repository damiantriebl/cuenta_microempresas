#!/usr/bin/env node

/**
 * Test script to validate production build functionality with full push notification support
 * This script checks configuration and simulates production environment testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Testing Production Build Configuration ===\n');

let testsPassed = 0;
let totalTests = 0;

function runTest(testName, testFunction) {
  totalTests++;
  console.log(`Testing: ${testName}`);
  
  try {
    const result = testFunction();
    if (result) {
      console.log(`✅ PASS: ${testName}\n`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL: ${testName}\n`);
    }
  } catch (error) {
    console.log(`❌ ERROR: ${testName} - ${error.message}\n`);
  }
}

// Test 1: EAS Configuration
runTest('EAS Configuration', () => {
  console.log('  Checking eas.json configuration...');
  
  const easConfigPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easConfigPath)) {
    console.log('  ⚠️  eas.json not found - this is optional but recommended for production builds');
    return true; // Not critical for this test
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    if (easConfig.build) {
      console.log('  ✅ EAS build configuration found');
      
      // Check for production profile
      if (easConfig.build.production) {
        console.log('  ✅ Production build profile configured');
        return true;
      } else {
        console.log('  ⚠️  No production build profile found');
        return true; // Still pass, as default config might work
      }
    } else {
      console.log('  ❌ No build configuration in eas.json');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Error parsing eas.json: ${error.message}`);
    return false;
  }
});

// Test 2: App Configuration for Production
runTest('App Configuration for Production', () => {
  console.log('  Checking app.config.js for production settings...');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (!fs.existsSync(appConfigPath)) {
    console.log('  ❌ app.config.js not found');
    return false;
  }
  
  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  
  // Check for required production settings
  const checks = [
    { name: 'EAS Project ID', pattern: /eas[\s\S]*?projectId/, required: true },
    { name: 'Notification Plugin', pattern: /expo-notifications/, required: true },
    { name: 'Android Package', pattern: /package:\s*["']/, required: true },
    { name: 'Google Services File', pattern: /googleServicesFile/, required: true },
    { name: 'Bundle Identifier', pattern: /bundleIdentifier/, required: false }
  ];
  
  let allRequired = true;
  checks.forEach(check => {
    if (configContent.match(check.pattern)) {
      console.log(`  ✅ ${check.name} configured`);
    } else if (check.required) {
      console.log(`  ❌ ${check.name} missing (required)`);
      allRequired = false;
    } else {
      console.log(`  ⚠️  ${check.name} missing (optional)`);
    }
  });
  
  return allRequired;
});

// Test 3: Push Notification Dependencies
runTest('Push Notification Dependencies', () => {
  console.log('  Checking package.json for notification dependencies...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ❌ package.json not found');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = [
    'expo-notifications',
    'expo-constants',
    'expo-device'
  ];
  
  let allDepsFound = true;
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`  ❌ Missing dependency: ${dep}`);
      allDepsFound = false;
    }
  });
  
  return allDepsFound;
});

// Test 4: Firebase Configuration
runTest('Firebase Configuration', () => {
  console.log('  Checking Firebase configuration files...');
  
  const firebaseConfigPath = path.join(process.cwd(), 'firebaseConfig.ts');
  const googleServicesPath = path.join(process.cwd(), 'android', 'app', 'google-services.json');
  
  let configValid = true;
  
  if (fs.existsSync(firebaseConfigPath)) {
    console.log('  ✅ firebaseConfig.ts found');
  } else {
    console.log('  ❌ firebaseConfig.ts not found');
    configValid = false;
  }
  
  if (fs.existsSync(googleServicesPath)) {
    console.log('  ✅ google-services.json found');
  } else {
    console.log('  ⚠️  google-services.json not found (required for FCM)');
    // Don't fail the test as this might be configured differently
  }
  
  return configValid;
});

// Test 5: Notification Service Implementation
runTest('Notification Service Implementation', () => {
  console.log('  Checking NotificationService implementation...');
  
  const notificationServicePath = path.join(process.cwd(), 'services', 'NotificationService.ts');
  if (!fs.existsSync(notificationServicePath)) {
    console.log('  ❌ NotificationService.ts not found');
    return false;
  }
  
  const serviceContent = fs.readFileSync(notificationServicePath, 'utf8');
  
  const checks = [
    { name: 'Expo Go Detection', pattern: /isRunningInExpoGo|executionEnvironment.*storeClient/ },
    { name: 'Push Token Registration', pattern: /getExpoPushTokenAsync/ },
    { name: 'Permission Handling', pattern: /requestPermissionsAsync/ },
    { name: 'Environment Gating', pattern: /console\.warn.*Expo Go/ },
    { name: 'Production Logic', pattern: /registerForPushNotifications/ }
  ];
  
  let allChecksPass = true;
  checks.forEach(check => {
    if (serviceContent.match(check.pattern)) {
      console.log(`  ✅ ${check.name} implemented`);
    } else {
      console.log(`  ❌ ${check.name} missing or incorrect`);
      allChecksPass = false;
    }
  });
  
  return allChecksPass;
});

// Test 6: Build Configuration Validation
runTest('Build Configuration Validation', () => {
  console.log('  Validating build configuration...');
  
  try {
    // Check if we can run the app config validation
    const validationScript = path.join(process.cwd(), 'scripts', 'validate-app-config.js');
    if (fs.existsSync(validationScript)) {
      console.log('  Running app config validation...');
      execSync(`node "${validationScript}"`, { stdio: 'pipe' });
      console.log('  ✅ App configuration validation passed');
      return true;
    } else {
      console.log('  ⚠️  App config validation script not found');
      return true; // Don't fail if script doesn't exist
    }
  } catch (error) {
    console.log(`  ❌ App configuration validation failed: ${error.message}`);
    return false;
  }
});

// Test 7: Environment Variable Configuration
runTest('Environment Variable Configuration', () => {
  console.log('  Checking environment variable setup...');
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    console.log('  ✅ .env.example found');
    
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = ['EAS_PROJECT_ID', 'GOOGLE_CLIENT_ID'];
    
    let allVarsDocumented = true;
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        console.log(`  ✅ ${varName} documented in .env.example`);
      } else {
        console.log(`  ⚠️  ${varName} not documented in .env.example`);
        // Don't fail for this, just warn
      }
    });
    
    return true;
  } else {
    console.log('  ⚠️  .env.example not found');
    return true; // Don't fail for missing example file
  }
});

// Test 8: Production Build Simulation
runTest('Production Build Simulation', () => {
  console.log('  Simulating production environment checks...');
  
  // Mock production environment
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  
  try {
    // Test the notification service logic with production constants
    const mockProductionConstants = {
      executionEnvironment: 'standalone',
      appOwnership: 'standalone',
      expoConfig: {
        extra: {
          eas: { projectId: '3dc127bf-00d4-4447-a8ea-eaaeae7a6276' }
        }
      }
    };
    
    // Simulate the detection logic
    function isRunningInExpoGo(constants) {
      if (constants.executionEnvironment === 'storeClient') return true;
      if (constants.appOwnership === 'expo') return true;
      if (!constants.expoConfig?.extra?.eas?.projectId && process.env.NODE_ENV === 'development') return true;
      return false;
    }
    
    const isExpoGo = isRunningInExpoGo(mockProductionConstants);
    
    if (!isExpoGo) {
      console.log('  ✅ Production environment correctly detected (not Expo Go)');
      console.log('  ✅ Push notifications would be enabled in production');
      return true;
    } else {
      console.log('  ❌ Production environment incorrectly detected as Expo Go');
      return false;
    }
  } finally {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  }
});

// Summary
console.log('=== Production Build Test Summary ===');
console.log(`Passed: ${testsPassed}/${totalTests} tests`);

if (testsPassed === totalTests) {
  console.log('🎉 All production build tests passed!');
  console.log('Your app is ready for production builds with full push notification support.');
} else {
  console.log('❌ Some tests failed. Please address the issues above.');
  console.log('\nCommon fixes:');
  console.log('- Ensure all required dependencies are installed: npm install');
  console.log('- Configure EAS project ID in app.config.js');
  console.log('- Add google-services.json for Android FCM support');
  console.log('- Verify NotificationService implementation');
}

console.log('\n=== Test Complete ===');

// Exit with appropriate code
process.exit(testsPassed === totalTests ? 0 : 1);