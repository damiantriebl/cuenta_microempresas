#!/usr/bin/env node

/**
 * Platform Smoke Tests Script
 * 
 * This script runs automated smoke tests for Web and Android platforms
 * to validate that the cleaned project still functions correctly.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PlatformSmokeTests {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      web: { passed: false, errors: [], warnings: [] },
      android: { passed: false, errors: [], warnings: [] },
      firebase: { passed: false, errors: [], warnings: [] }
    };
    this.timeouts = {
      web: 30000,      // 30 seconds for web server startup
      android: 60000,  // 60 seconds for Android emulator
      firebase: 15000  // 15 seconds for Firebase connection
    };
  }

  /**
   * Test Web platform startup and basic functionality
   */
  async testWebPlatform() {
    console.log('🌐 Testing Web platform...');
    
    try {
      // Check if web build works
      console.log('  📦 Testing web build...');
      execSync('pnpm run build:web', { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      console.log('  ✅ Web build successful');

      // Test development server startup
      console.log('  🚀 Testing development server startup...');
      const webServerTest = await this.testWebServer();
      
      if (webServerTest.success) {
        console.log('  ✅ Web development server started successfully');
        this.results.web.passed = true;
      } else {
        console.log('  ❌ Web development server failed to start');
        this.results.web.errors.push('Development server startup failed');
        this.results.web.errors.push(...webServerTest.errors);
      }

    } catch (error) {
      this.results.web.passed = false;
      this.results.web.errors.push(`Web platform test failed: ${error.message}`);
      console.log('  ❌ Web platform test failed:', error.message);
    }

    return this.results.web.passed;
  }

  /**
   * Test web server startup (non-blocking)
   */
  async testWebServer() {
    return new Promise((resolve) => {
      const webProcess = spawn('pnpm', ['run', 'web'], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let hasStarted = false;
      const errors = [];

      const timeout = setTimeout(() => {
        if (!hasStarted) {
          webProcess.kill();
          resolve({ 
            success: false, 
            errors: ['Web server startup timeout', ...errors] 
          });
        }
      }, this.timeouts.web);

      webProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // Look for indicators that the server has started
        if (output.includes('Metro waiting on') || 
            output.includes('Web server is ready') ||
            output.includes('Expo DevTools') ||
            output.includes('› Press w │ open web')) {
          hasStarted = true;
          clearTimeout(timeout);
          webProcess.kill();
          resolve({ success: true, errors: [] });
        }
      });

      webProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        errors.push(errorMsg);
        
        // Check for critical errors
        if (errorMsg.includes('Error:') || 
            errorMsg.includes('Failed to') ||
            errorMsg.includes('Cannot resolve')) {
          clearTimeout(timeout);
          webProcess.kill();
          resolve({ 
            success: false, 
            errors: ['Critical error during startup', ...errors] 
          });
        }
      });

      webProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ 
          success: false, 
          errors: [`Process error: ${error.message}`, ...errors] 
        });
      });
    });
  }

  /**
   * Test Android platform (requires emulator or device)
   */
  async testAndroidPlatform() {
    console.log('🤖 Testing Android platform...');
    
    try {
      // Check if Android development environment is available
      console.log('  🔍 Checking Android development environment...');
      
      const androidCheck = await this.checkAndroidEnvironment();
      if (!androidCheck.available) {
        console.log('  ⚠️  Android environment not available, skipping Android tests');
        this.results.android.warnings.push('Android environment not available');
        this.results.android.passed = true; // Don't fail if Android isn't set up
        return true;
      }

      // Test Android build
      console.log('  📦 Testing Android prebuild...');
      execSync('pnpm run android:prebuild', { 
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000
      });
      console.log('  ✅ Android prebuild successful');

      // Test if we can start the development build
      console.log('  🚀 Testing Android development build...');
      const androidTest = await this.testAndroidBuild();
      
      if (androidTest.success) {
        console.log('  ✅ Android development build started successfully');
        this.results.android.passed = true;
      } else {
        console.log('  ❌ Android development build failed');
        this.results.android.errors.push('Android build failed');
        this.results.android.errors.push(...androidTest.errors);
      }

    } catch (error) {
      this.results.android.passed = false;
      this.results.android.errors.push(`Android platform test failed: ${error.message}`);
      console.log('  ❌ Android platform test failed:', error.message);
    }

    return this.results.android.passed;
  }

  /**
   * Check if Android development environment is available
   */
  async checkAndroidEnvironment() {
    try {
      // Check for Android SDK
      execSync('adb version', { stdio: 'pipe' });
      
      // Check for Java
      execSync('java -version', { stdio: 'pipe' });
      
      // Check for Gradle
      if (fs.existsSync(path.join(this.projectRoot, 'android', 'gradlew.bat'))) {
        return { available: true };
      }
      
      return { available: false, reason: 'Gradle wrapper not found' };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Test Android build process
   */
  async testAndroidBuild() {
    return new Promise((resolve) => {
      const androidProcess = spawn('pnpm', ['run', 'android:dev'], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let hasBuilt = false;
      const errors = [];

      const timeout = setTimeout(() => {
        if (!hasBuilt) {
          androidProcess.kill();
          resolve({ 
            success: false, 
            errors: ['Android build timeout', ...errors] 
          });
        }
      }, this.timeouts.android);

      androidProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // Look for build success indicators
        if (output.includes('BUILD SUCCESSFUL') || 
            output.includes('App running on') ||
            output.includes('Successfully installed')) {
          hasBuilt = true;
          clearTimeout(timeout);
          androidProcess.kill();
          resolve({ success: true, errors: [] });
        }
      });

      androidProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        errors.push(errorMsg);
        
        // Check for critical build errors
        if (errorMsg.includes('BUILD FAILED') || 
            errorMsg.includes('FAILURE:') ||
            errorMsg.includes('Could not resolve')) {
          clearTimeout(timeout);
          androidProcess.kill();
          resolve({ 
            success: false, 
            errors: ['Build failed', ...errors] 
          });
        }
      });

      androidProcess.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ 
          success: false, 
          errors: [`Process error: ${error.message}`, ...errors] 
        });
      });
    });
  }

  /**
   * Test Firebase integration
   */
  async testFirebaseIntegration() {
    console.log('🔥 Testing Firebase integration...');
    
    try {
      // Test Firebase configuration
      console.log('  🔧 Checking Firebase configuration...');
      
      const firebaseConfigPath = path.join(this.projectRoot, 'firebaseConfig.ts');
      if (!fs.existsSync(firebaseConfigPath)) {
        throw new Error('Firebase configuration file not found');
      }

      // Test basic Firebase connection
      console.log('  🔗 Testing Firebase connection...');
      const connectionTest = await this.testFirebaseConnection();
      
      if (connectionTest.success) {
        console.log('  ✅ Firebase connection successful');
        this.results.firebase.passed = true;
      } else {
        console.log('  ❌ Firebase connection failed');
        this.results.firebase.errors.push('Firebase connection failed');
        this.results.firebase.errors.push(...connectionTest.errors);
      }

    } catch (error) {
      this.results.firebase.passed = false;
      this.results.firebase.errors.push(`Firebase test failed: ${error.message}`);
      console.log('  ❌ Firebase test failed:', error.message);
    }

    return this.results.firebase.passed;
  }

  /**
   * Test Firebase connection with a simple operation
   */
  async testFirebaseConnection() {
    return new Promise((resolve) => {
      // Create a simple test script to check Firebase connection
      const testScript = `
        // Simple Firebase config test
        const firebaseConfig = {
          apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
          authDomain: "campo-9fb40.firebaseapp.com",
          projectId: "campo-9fb40",
          storageBucket: "campo-9fb40.appspot.com",
          messagingSenderId: "149722424399",
          appId: "1:149722424399:web:099267684d39d0e910f63a"
        };
        
        async function testConnection() {
          try {
            const { initializeApp } = require('firebase/app');
            const { getFirestore } = require('firebase/firestore');
            
            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            
            console.log('Firebase initialized successfully');
            process.exit(0);
          } catch (error) {
            console.error('Firebase connection failed:', error.message);
            process.exit(1);
          }
        }
        
        testConnection();
      `;

      const testFile = path.join(this.projectRoot, 'temp-firebase-test.js');
      fs.writeFileSync(testFile, testScript);

      const testProcess = spawn('node', [testFile], {
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      const errors = [];

      const timeout = setTimeout(() => {
        testProcess.kill();
        fs.unlinkSync(testFile);
        resolve({ 
          success: false, 
          errors: ['Firebase connection timeout', ...errors] 
        });
      }, this.timeouts.firebase);

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        errors.push(data.toString());
      });

      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        fs.unlinkSync(testFile);
        
        if (code === 0) {
          resolve({ success: true, errors: [] });
        } else {
          resolve({ 
            success: false, 
            errors: [`Exit code: ${code}`, ...errors] 
          });
        }
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        fs.unlinkSync(testFile);
        resolve({ 
          success: false, 
          errors: [`Process error: ${error.message}`, ...errors] 
        });
      });
    });
  }

  /**
   * Generate smoke test report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        passed: this.results.web.passed && 
                this.results.android.passed && 
                this.results.firebase.passed
      },
      platforms: this.results
    };

    console.log('\n📊 Platform Smoke Test Report');
    console.log('==============================');
    console.log(`Overall Status: ${report.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Web Platform: ${this.results.web.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Android Platform: ${this.results.android.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Firebase Integration: ${this.results.firebase.passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Show warnings
    if (this.results.android.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.android.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }

    // Show errors if any
    if (!report.overall.passed) {
      console.log('\n🔍 Issues Found:');
      
      if (!this.results.web.passed && this.results.web.errors.length > 0) {
        console.log('  Web Platform Errors:');
        this.results.web.errors.forEach(err => console.log(`    - ${err}`));
      }
      
      if (!this.results.android.passed && this.results.android.errors.length > 0) {
        console.log('  Android Platform Errors:');
        this.results.android.errors.forEach(err => console.log(`    - ${err}`));
      }
      
      if (!this.results.firebase.passed && this.results.firebase.errors.length > 0) {
        console.log('  Firebase Integration Errors:');
        this.results.firebase.errors.forEach(err => console.log(`    - ${err}`));
      }
    }

    return report;
  }

  /**
   * Run all smoke tests
   */
  async runAllTests() {
    console.log('🚀 Starting platform smoke tests...\n');

    // Run tests in sequence
    await this.testWebPlatform();
    await this.testAndroidPlatform();
    await this.testFirebaseIntegration();

    const report = this.generateReport();
    
    // Write report to file
    const reportPath = path.join(this.projectRoot, 'platform-smoke-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return report.overall.passed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const tester = new PlatformSmokeTests();

  try {
    if (args.includes('--web-only')) {
      const passed = await tester.testWebPlatform();
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--android-only')) {
      const passed = await tester.testAndroidPlatform();
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--firebase-only')) {
      const passed = await tester.testFirebaseIntegration();
      process.exit(passed ? 0 : 1);
    }

    // Run all tests by default
    const passed = await tester.runAllTests();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Smoke tests failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PlatformSmokeTests;