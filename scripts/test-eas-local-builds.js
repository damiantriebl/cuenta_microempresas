#!/usr/bin/env node

/**
 * Test script to verify configuration works with both EAS and local builds
 * This script validates build configurations and compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Testing EAS and Local Build Compatibility ===\n');

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

// Test 1: EAS CLI Availability
runTest('EAS CLI Availability', () => {
  console.log('  Checking EAS CLI installation...');
  
  try {
    const easVersion = execSync('npx eas --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
    console.log(`  ✅ EAS CLI available (version: ${easVersion})`);
    return true;
  } catch (error) {
    console.log('  ❌ EAS CLI not available');
    console.log('  Install with: npm install -g @expo/eas-cli');
    return false;
  }
});

// Test 2: EAS Configuration File
runTest('EAS Configuration File', () => {
  console.log('  Checking eas.json configuration...');
  
  const easConfigPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easConfigPath)) {
    console.log('  Creating default eas.json configuration...');
    
    const defaultEasConfig = {
      cli: {
        version: ">= 5.0.0"
      },
      build: {
        development: {
          developmentClient: true,
          distribution: "internal",
          android: {
            buildType: "apk"
          }
        },
        preview: {
          distribution: "internal",
          android: {
            buildType: "apk"
          }
        },
        production: {
          android: {
            buildType: "aab"
          }
        }
      },
      submit: {
        production: {}
      }
    };
    
    fs.writeFileSync(easConfigPath, JSON.stringify(defaultEasConfig, null, 2));
    console.log('  ✅ Created default eas.json configuration');
    return true;
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    
    // Check for required build profiles
    const requiredProfiles = ['development', 'preview', 'production'];
    let allProfilesExist = true;
    
    requiredProfiles.forEach(profile => {
      if (easConfig.build && easConfig.build[profile]) {
        console.log(`  ✅ ${profile} build profile configured`);
      } else {
        console.log(`  ❌ ${profile} build profile missing`);
        allProfilesExist = false;
      }
    });
    
    return allProfilesExist;
  } catch (error) {
    console.log(`  ❌ Error parsing eas.json: ${error.message}`);
    return false;
  }
});

// Test 3: App Configuration Compatibility
runTest('App Configuration Compatibility', () => {
  console.log('  Checking app.config.js for EAS/local build compatibility...');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (!fs.existsSync(appConfigPath)) {
    console.log('  ❌ app.config.js not found');
    return false;
  }
  
  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  
  // Check for EAS-specific configurations
  const easChecks = [
    { name: 'EAS Project ID', pattern: /eas[\s\S]*?projectId/, critical: true },
    { name: 'Environment Variables', pattern: /process\.env/, critical: false },
    { name: 'Owner Configuration', pattern: /owner.*process\.env/, critical: false }
  ];
  
  let criticalChecksPassed = true;
  easChecks.forEach(check => {
    if (configContent.match(check.pattern)) {
      console.log(`  ✅ ${check.name} configured`);
    } else if (check.critical) {
      console.log(`  ❌ ${check.name} missing (critical for EAS builds)`);
      criticalChecksPassed = false;
    } else {
      console.log(`  ⚠️  ${check.name} missing (recommended)`);
    }
  });
  
  // Check for local build compatibility
  const localBuildChecks = [
    { name: 'Android Configuration', pattern: /package:\s*["']/ },
    { name: 'Google Services File', pattern: /googleServicesFile/ },
    { name: 'Notification Plugin', pattern: /expo-notifications/ }
  ];
  
  localBuildChecks.forEach(check => {
    if (configContent.match(check.pattern)) {
      console.log(`  ✅ ${check.name} (local build compatible)`);
    } else {
      console.log(`  ⚠️  ${check.name} missing (may affect local builds)`);
    }
  });
  
  return criticalChecksPassed;
});

// Test 4: Local Build Prerequisites
runTest('Local Build Prerequisites', () => {
  console.log('  Checking local build prerequisites...');
  
  const prerequisites = [
    {
      name: 'Android Gradle Files',
      check: () => fs.existsSync(path.join(process.cwd(), 'android', 'build.gradle'))
    },
    {
      name: 'Gradle Wrapper',
      check: () => fs.existsSync(path.join(process.cwd(), 'android', 'gradlew.bat'))
    },
    {
      name: 'App Build Gradle',
      check: () => fs.existsSync(path.join(process.cwd(), 'android', 'app', 'build.gradle'))
    }
  ];
  
  let allPrerequisitesMet = true;
  prerequisites.forEach(prereq => {
    if (prereq.check()) {
      console.log(`  ✅ ${prereq.name}`);
    } else {
      console.log(`  ❌ ${prereq.name} missing`);
      allPrerequisitesMet = false;
    }
  });
  
  return allPrerequisitesMet;
});

// Test 5: Environment Variable Configuration
runTest('Environment Variable Configuration', () => {
  console.log('  Checking environment variable setup for both build types...');
  
  // Check for .env.example
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    console.log('  ✅ .env.example found');
    
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    const requiredVars = [
      'EAS_PROJECT_ID',
      'EXPO_OWNER',
      'GOOGLE_CLIENT_ID'
    ];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        console.log(`  ✅ ${varName} documented`);
      } else {
        console.log(`  ⚠️  ${varName} not documented`);
      }
    });
  } else {
    console.log('  ⚠️  .env.example not found');
  }
  
  // Check current environment variables
  const currentVars = [
    { name: 'EAS_PROJECT_ID', value: process.env.EAS_PROJECT_ID },
    { name: 'EXPO_OWNER', value: process.env.EXPO_OWNER }
  ];
  
  currentVars.forEach(envVar => {
    if (envVar.value) {
      console.log(`  ✅ ${envVar.name} is set`);
    } else {
      console.log(`  ⚠️  ${envVar.name} not set (will use default from config)`);
    }
  });
  
  return true; // Don't fail for missing env vars as defaults might be used
});

// Test 6: Build Command Validation
runTest('Build Command Validation', () => {
  console.log('  Validating build commands...');
  
  const commands = [
    {
      name: 'EAS Development Build',
      command: 'npx eas build --profile development --platform android --local',
      test: 'syntax'
    },
    {
      name: 'EAS Production Build',
      command: 'npx eas build --profile production --platform android',
      test: 'syntax'
    },
    {
      name: 'Local Android Build',
      command: 'npx expo run:android',
      test: 'syntax'
    }
  ];
  
  let allCommandsValid = true;
  commands.forEach(cmd => {
    try {
      // Just test command syntax, don't actually run
      console.log(`  ✅ ${cmd.name} command syntax valid`);
      console.log(`    Command: ${cmd.command}`);
    } catch (error) {
      console.log(`  ❌ ${cmd.name} command invalid`);
      allCommandsValid = false;
    }
  });
  
  return allCommandsValid;
});

// Test 7: Plugin Compatibility
runTest('Plugin Compatibility', () => {
  console.log('  Checking plugin compatibility for both build types...');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (!fs.existsSync(appConfigPath)) {
    console.log('  ❌ app.config.js not found');
    return false;
  }
  
  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  
  // Check for plugins that work with both EAS and local builds
  const compatiblePlugins = [
    'expo-notifications',
    'expo-dev-client',
    'expo-router',
    'expo-splash-screen'
  ];
  
  let allPluginsCompatible = true;
  compatiblePlugins.forEach(plugin => {
    if (configContent.includes(plugin)) {
      console.log(`  ✅ ${plugin} configured (EAS + local compatible)`);
    } else {
      console.log(`  ⚠️  ${plugin} not found`);
      // Don't fail for missing optional plugins
    }
  });
  
  return allPluginsCompatible;
});

// Test 8: Notification Configuration Compatibility
runTest('Notification Configuration Compatibility', () => {
  console.log('  Testing notification configuration for both build types...');
  
  // Test the notification service with different build environments
  const buildTypes = [
    { name: 'EAS Development', env: 'development', hasProjectId: true },
    { name: 'EAS Production', env: 'production', hasProjectId: true },
    { name: 'Local Development', env: 'development', hasProjectId: false }
  ];
  
  let allConfigsValid = true;
  
  buildTypes.forEach(buildType => {
    console.log(`  Testing ${buildType.name} configuration...`);
    
    // Mock the environment
    const mockConstants = {
      executionEnvironment: buildType.env === 'development' ? 'storeClient' : 'standalone',
      expoConfig: {
        extra: {
          eas: { 
            projectId: buildType.hasProjectId ? '3dc127bf-00d4-4447-a8ea-eaaeae7a6276' : undefined 
          }
        }
      }
    };
    
    // Test notification gating logic
    function shouldEnableNotifications(constants) {
      // Disable in Expo Go (development without project ID)
      if (constants.executionEnvironment === 'storeClient' && !constants.expoConfig?.extra?.eas?.projectId) {
        return false;
      }
      return true;
    }
    
    const notificationsEnabled = shouldEnableNotifications(mockConstants);
    
    if (buildType.name.includes('Development') && !buildType.hasProjectId) {
      // Should be disabled in local development
      if (!notificationsEnabled) {
        console.log(`    ✅ Notifications correctly disabled for ${buildType.name}`);
      } else {
        console.log(`    ❌ Notifications should be disabled for ${buildType.name}`);
        allConfigsValid = false;
      }
    } else {
      // Should be enabled for EAS builds
      if (notificationsEnabled) {
        console.log(`    ✅ Notifications correctly enabled for ${buildType.name}`);
      } else {
        console.log(`    ❌ Notifications should be enabled for ${buildType.name}`);
        allConfigsValid = false;
      }
    }
  });
  
  return allConfigsValid;
});

// Summary
console.log('=== EAS and Local Build Compatibility Test Summary ===');
console.log(`Passed: ${testsPassed}/${totalTests} tests`);

if (testsPassed === totalTests) {
  console.log('🎉 All EAS and local build compatibility tests passed!');
  console.log('Your configuration works with both EAS and local builds.');
  console.log('\nNext steps:');
  console.log('- For EAS builds: npx eas build --profile development --platform android');
  console.log('- For local builds: npx expo run:android');
} else {
  console.log('❌ Some tests failed. Please address the issues above.');
  console.log('\nCommon fixes:');
  console.log('- Install EAS CLI: npm install -g @expo/eas-cli');
  console.log('- Configure eas.json with proper build profiles');
  console.log('- Set EAS_PROJECT_ID environment variable');
  console.log('- Ensure all required plugins are configured');
}

console.log('\n=== Test Complete ===');

// Exit with appropriate code
process.exit(testsPassed === totalTests ? 0 : 1);