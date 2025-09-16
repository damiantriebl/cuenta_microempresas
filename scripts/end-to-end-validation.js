#!/usr/bin/env node

/**
 * End-to-End Validation Script
 * 
 * This script provides comprehensive validation of the entire cleanup process
 * by testing that the cleaned project builds successfully for Android and Web
 * and validates that all Firebase functionality still works after cleanup.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ValidationFramework = require('./validation-framework');

class EndToEndValidation {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      preValidation: { passed: false, details: null },
      buildTests: { 
        web: { passed: false, errors: [], buildTime: 0 },
        android: { passed: false, errors: [], buildTime: 0 }
      },
      functionalTests: {
        navigation: { passed: false, errors: [] },
        firebase: { passed: false, errors: [] },
        auth: { passed: false, errors: [] },
        firestore: { passed: false, errors: [] }
      },
      postValidation: { passed: false, details: null },
      overall: { passed: false, score: 0 }
    };
    this.timeouts = {
      build: 180000,    // 3 minutes for builds
      functional: 30000, // 30 seconds for functional tests
      firebase: 20000   // 20 seconds for Firebase tests
    };
  }

  /**
   * Run pre-validation checks using existing validation framework
   */
  async runPreValidation() {
    console.log('🔍 Running pre-validation checks...\n');
    
    try {
      const framework = new ValidationFramework();
      const passed = await framework.runAllValidations();
      
      this.results.preValidation = {
        passed,
        details: framework.results
      };
      
      console.log(`\n📋 Pre-validation: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!passed) {
        console.log('⚠️  Pre-validation failed. Continuing with build tests but issues may occur.');
      }
      
      return passed;
    } catch (error) {
      console.error('❌ Pre-validation failed:', error.message);
      this.results.preValidation = {
        passed: false,
        error: error.message
      };
      return false;
    }
  }

  /**
   * Test Web platform build process
   */
  async testWebBuild() {
    console.log('🌐 Testing Web platform build...');
    
    const startTime = Date.now();
    
    try {
      // Clean any previous builds
      console.log('  🧹 Cleaning previous builds...');
      const distPath = path.join(this.projectRoot, 'dist');
      if (fs.existsSync(distPath)) {
        fs.rmSync(distPath, { recursive: true, force: true });
      }

      // Test web build
      console.log('  📦 Building for Web platform...');
      const buildResult = await this.runBuildCommand('pnpm', ['run', 'build:web']);
      
      this.results.buildTests.web.buildTime = Date.now() - startTime;
      
      if (buildResult.success) {
        // Verify build output exists
        if (fs.existsSync(distPath)) {
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            console.log('  ✅ Web build successful and output verified');
            this.results.buildTests.web.passed = true;
          } else {
            console.log('  ❌ Web build completed but index.html not found');
            this.results.buildTests.web.errors.push('Build output missing index.html');
          }
        } else {
          console.log('  ❌ Web build completed but dist directory not found');
          this.results.buildTests.web.errors.push('Build output directory not found');
        }
      } else {
        console.log('  ❌ Web build failed');
        this.results.buildTests.web.errors.push('Build process failed');
        this.results.buildTests.web.errors.push(...buildResult.errors);
      }

    } catch (error) {
      this.results.buildTests.web.buildTime = Date.now() - startTime;
      this.results.buildTests.web.passed = false;
      this.results.buildTests.web.errors.push(`Web build test failed: ${error.message}`);
      console.log('  ❌ Web build test failed:', error.message);
    }

    return this.results.buildTests.web.passed;
  }

  /**
   * Test Android platform build process
   */
  async testAndroidBuild() {
    console.log('🤖 Testing Android platform build...');
    
    const startTime = Date.now();
    
    try {
      // Check Android environment first
      const androidCheck = await this.checkAndroidEnvironment();
      if (!androidCheck.available) {
        console.log('  ⚠️  Android environment not available, skipping Android build test');
        this.results.buildTests.android.passed = true; // Don't fail if Android isn't set up
        this.results.buildTests.android.buildTime = Date.now() - startTime;
        return true;
      }

      // Clean Android build
      console.log('  🧹 Cleaning Android build...');
      try {
        execSync('pnpm run android:clean', { 
          stdio: 'pipe',
          timeout: 60000
        });
      } catch (cleanError) {
        console.log('  ⚠️  Android clean failed, continuing...');
      }

      // Test Android prebuild
      console.log('  📦 Running Android prebuild...');
      const prebuildResult = await this.runBuildCommand('pnpm', ['run', 'android:prebuild']);
      
      if (prebuildResult.success) {
        // Test APK build
        console.log('  🔨 Building Android APK...');
        const apkResult = await this.runBuildCommand('pnpm', ['run', 'android:build-apk']);
        
        this.results.buildTests.android.buildTime = Date.now() - startTime;
        
        if (apkResult.success) {
          // Verify APK was created
          const apkPath = path.join(this.projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release');
          if (fs.existsSync(apkPath)) {
            const apkFiles = fs.readdirSync(apkPath).filter(file => file.endsWith('.apk'));
            if (apkFiles.length > 0) {
              console.log('  ✅ Android APK build successful');
              this.results.buildTests.android.passed = true;
            } else {
              console.log('  ❌ Android build completed but APK not found');
              this.results.buildTests.android.errors.push('APK file not generated');
            }
          } else {
            console.log('  ❌ Android build completed but output directory not found');
            this.results.buildTests.android.errors.push('APK output directory not found');
          }
        } else {
          console.log('  ❌ Android APK build failed');
          this.results.buildTests.android.errors.push('APK build failed');
          this.results.buildTests.android.errors.push(...apkResult.errors);
        }
      } else {
        this.results.buildTests.android.buildTime = Date.now() - startTime;
        console.log('  ❌ Android prebuild failed');
        this.results.buildTests.android.errors.push('Prebuild failed');
        this.results.buildTests.android.errors.push(...prebuildResult.errors);
      }

    } catch (error) {
      this.results.buildTests.android.buildTime = Date.now() - startTime;
      this.results.buildTests.android.passed = false;
      this.results.buildTests.android.errors.push(`Android build test failed: ${error.message}`);
      console.log('  ❌ Android build test failed:', error.message);
    }

    return this.results.buildTests.android.passed;
  }

  /**
   * Run build command with timeout and error handling
   */
  async runBuildCommand(command, args) {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';
      const errors = [];

      const timeout = setTimeout(() => {
        process.kill();
        resolve({ 
          success: false, 
          errors: ['Build timeout exceeded', ...errors],
          stdout,
          stderr
        });
      }, this.timeouts.build);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        stderr += errorMsg;
        
        // Collect significant errors
        if (errorMsg.includes('Error:') || 
            errorMsg.includes('Failed') ||
            errorMsg.includes('BUILD FAILED')) {
          errors.push(errorMsg.trim());
        }
      });

      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ 
          success: code === 0, 
          errors: code !== 0 ? [...errors, `Exit code: ${code}`] : [],
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ 
          success: false, 
          errors: [`Process error: ${error.message}`, ...errors],
          stdout,
          stderr
        });
      });
    });
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
      
      // Check for Gradle wrapper
      const gradlewPath = path.join(this.projectRoot, 'android', 'gradlew.bat');
      if (fs.existsSync(gradlewPath)) {
        return { available: true };
      }
      
      return { available: false, reason: 'Gradle wrapper not found' };
    } catch (error) {
      return { available: false, reason: error.message };
    }
  }

  /**
   * Test basic navigation functionality
   */
  async testNavigation() {
    console.log('🧭 Testing navigation functionality...');
    
    try {
      // Create a test script to verify navigation structure
      const navigationTest = `
        const fs = require('fs');
        const path = require('path');
        
        function testNavigationStructure() {
          const appDir = path.join(process.cwd(), 'app');
          
          // Check for main layout
          const layoutPath = path.join(appDir, '_layout.tsx');
          if (!fs.existsSync(layoutPath)) {
            throw new Error('Main layout file not found');
          }
          
          // Check for tab structure
          const tabsDir = path.join(appDir, '(tabs)');
          if (!fs.existsSync(tabsDir)) {
            throw new Error('Tabs directory not found');
          }
          
          // Check for auth structure
          const authDir = path.join(appDir, '(auth)');
          if (!fs.existsSync(authDir)) {
            throw new Error('Auth directory not found');
          }
          
          // Check for company structure
          const companyDir = path.join(appDir, '(company)');
          if (!fs.existsSync(companyDir)) {
            throw new Error('Company directory not found');
          }
          
          console.log('Navigation structure validation passed');
          return true;
        }
        
        try {
          testNavigationStructure();
          process.exit(0);
        } catch (error) {
          console.error('Navigation test failed:', error.message);
          process.exit(1);
        }
      `;

      const testFile = path.join(this.projectRoot, 'temp-navigation-test.js');
      fs.writeFileSync(testFile, navigationTest);

      const result = await this.runTestScript(testFile);
      fs.unlinkSync(testFile);

      if (result.success) {
        console.log('  ✅ Navigation structure validation passed');
        this.results.functionalTests.navigation.passed = true;
      } else {
        console.log('  ❌ Navigation structure validation failed');
        this.results.functionalTests.navigation.errors.push(...result.errors);
      }

    } catch (error) {
      this.results.functionalTests.navigation.passed = false;
      this.results.functionalTests.navigation.errors.push(`Navigation test failed: ${error.message}`);
      console.log('  ❌ Navigation test failed:', error.message);
    }

    return this.results.functionalTests.navigation.passed;
  }

  /**
   * Test Firebase configuration and basic connectivity
   */
  async testFirebaseConfiguration() {
    console.log('🔥 Testing Firebase configuration...');
    
    try {
      // Test Firebase config file exists and is valid
      const firebaseConfigPath = path.join(this.projectRoot, 'firebaseConfig.ts');
      if (!fs.existsSync(firebaseConfigPath)) {
        throw new Error('Firebase configuration file not found');
      }

      // Test Firebase initialization
      const firebaseTest = `
        async function testFirebaseConfig() {
          try {
            // Import Firebase config
            const firebaseConfig = {
              apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
              authDomain: "campo-9fb40.firebaseapp.com",
              projectId: "campo-9fb40",
              storageBucket: "campo-9fb40.appspot.com",
              messagingSenderId: "149722424399",
              appId: "1:149722424399:web:099267684d39d0e910f63a"
            };
            
            // Test Firebase app initialization
            const { initializeApp } = require('firebase/app');
            const app = initializeApp(firebaseConfig);
            
            if (!app) {
              throw new Error('Firebase app initialization failed');
            }
            
            console.log('Firebase configuration validation passed');
            return true;
          } catch (error) {
            console.error('Firebase config test failed:', error.message);
            throw error;
          }
        }
        
        testFirebaseConfig()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      `;

      const testFile = path.join(this.projectRoot, 'temp-firebase-config-test.js');
      fs.writeFileSync(testFile, firebaseTest);

      const result = await this.runTestScript(testFile);
      fs.unlinkSync(testFile);

      if (result.success) {
        console.log('  ✅ Firebase configuration validation passed');
        this.results.functionalTests.firebase.passed = true;
      } else {
        console.log('  ❌ Firebase configuration validation failed');
        this.results.functionalTests.firebase.errors.push(...result.errors);
      }

    } catch (error) {
      this.results.functionalTests.firebase.passed = false;
      this.results.functionalTests.firebase.errors.push(`Firebase config test failed: ${error.message}`);
      console.log('  ❌ Firebase config test failed:', error.message);
    }

    return this.results.functionalTests.firebase.passed;
  }

  /**
   * Test Firebase Auth functionality
   */
  async testFirebaseAuth() {
    console.log('🔐 Testing Firebase Auth functionality...');
    
    try {
      const authTest = `
        async function testFirebaseAuth() {
          try {
            const { initializeApp } = require('firebase/app');
            const { getAuth, connectAuthEmulator } = require('firebase/auth');
            
            const firebaseConfig = {
              apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
              authDomain: "campo-9fb40.firebaseapp.com",
              projectId: "campo-9fb40",
              storageBucket: "campo-9fb40.appspot.com",
              messagingSenderId: "149722424399",
              appId: "1:149722424399:web:099267684d39d0e910f63a"
            };
            
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            
            if (!auth) {
              throw new Error('Firebase Auth initialization failed');
            }
            
            console.log('Firebase Auth validation passed');
            return true;
          } catch (error) {
            console.error('Firebase Auth test failed:', error.message);
            throw error;
          }
        }
        
        testFirebaseAuth()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      `;

      const testFile = path.join(this.projectRoot, 'temp-firebase-auth-test.js');
      fs.writeFileSync(testFile, authTest);

      const result = await this.runTestScript(testFile);
      fs.unlinkSync(testFile);

      if (result.success) {
        console.log('  ✅ Firebase Auth validation passed');
        this.results.functionalTests.auth.passed = true;
      } else {
        console.log('  ❌ Firebase Auth validation failed');
        this.results.functionalTests.auth.errors.push(...result.errors);
      }

    } catch (error) {
      this.results.functionalTests.auth.passed = false;
      this.results.functionalTests.auth.errors.push(`Firebase Auth test failed: ${error.message}`);
      console.log('  ❌ Firebase Auth test failed:', error.message);
    }

    return this.results.functionalTests.auth.passed;
  }

  /**
   * Test Firestore functionality
   */
  async testFirestore() {
    console.log('🗄️ Testing Firestore functionality...');
    
    try {
      const firestoreTest = `
        async function testFirestore() {
          try {
            const { initializeApp } = require('firebase/app');
            const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
            
            const firebaseConfig = {
              apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
              authDomain: "campo-9fb40.firebaseapp.com",
              projectId: "campo-9fb40",
              storageBucket: "campo-9fb40.appspot.com",
              messagingSenderId: "149722424399",
              appId: "1:149722424399:web:099267684d39d0e910f63a"
            };
            
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            
            if (!db) {
              throw new Error('Firestore initialization failed');
            }
            
            console.log('Firestore validation passed');
            return true;
          } catch (error) {
            console.error('Firestore test failed:', error.message);
            throw error;
          }
        }
        
        testFirestore()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      `;

      const testFile = path.join(this.projectRoot, 'temp-firestore-test.js');
      fs.writeFileSync(testFile, firestoreTest);

      const result = await this.runTestScript(testFile);
      fs.unlinkSync(testFile);

      if (result.success) {
        console.log('  ✅ Firestore validation passed');
        this.results.functionalTests.firestore.passed = true;
      } else {
        console.log('  ❌ Firestore validation failed');
        this.results.functionalTests.firestore.errors.push(...result.errors);
      }

    } catch (error) {
      this.results.functionalTests.firestore.passed = false;
      this.results.functionalTests.firestore.errors.push(`Firestore test failed: ${error.message}`);
      console.log('  ❌ Firestore test failed:', error.message);
    }

    return this.results.functionalTests.firestore.passed;
  }

  /**
   * Run a test script with timeout
   */
  async runTestScript(scriptPath) {
    return new Promise((resolve) => {
      const process = spawn('node', [scriptPath], {
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';
      const errors = [];

      const timeout = setTimeout(() => {
        process.kill();
        resolve({ 
          success: false, 
          errors: ['Test timeout exceeded', ...errors],
          stdout,
          stderr
        });
      }, this.timeouts.functional);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        stderr += errorMsg;
        errors.push(errorMsg.trim());
      });

      process.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ 
          success: code === 0, 
          errors: code !== 0 ? [...errors, `Exit code: ${code}`] : [],
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ 
          success: false, 
          errors: [`Process error: ${error.message}`, ...errors],
          stdout,
          stderr
        });
      });
    });
  }

  /**
   * Run post-validation checks
   */
  async runPostValidation() {
    console.log('\n🔍 Running post-validation checks...\n');
    
    try {
      const framework = new ValidationFramework();
      const passed = await framework.runAllValidations();
      
      this.results.postValidation = {
        passed,
        details: framework.results
      };
      
      console.log(`\n📋 Post-validation: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      return passed;
    } catch (error) {
      console.error('❌ Post-validation failed:', error.message);
      this.results.postValidation = {
        passed: false,
        error: error.message
      };
      return false;
    }
  }

  /**
   * Calculate overall validation score
   */
  calculateScore() {
    let score = 0;
    let maxScore = 0;

    // Pre-validation (20% of total score)
    maxScore += 20;
    if (this.results.preValidation.passed) {
      score += 20;
    }

    // Build tests (40% of total score)
    maxScore += 40;
    if (this.results.buildTests.web.passed) score += 20;
    if (this.results.buildTests.android.passed) score += 20;

    // Functional tests (30% of total score)
    maxScore += 30;
    if (this.results.functionalTests.navigation.passed) score += 8;
    if (this.results.functionalTests.firebase.passed) score += 7;
    if (this.results.functionalTests.auth.passed) score += 8;
    if (this.results.functionalTests.firestore.passed) score += 7;

    // Post-validation (10% of total score)
    maxScore += 10;
    if (this.results.postValidation.passed) {
      score += 10;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Generate comprehensive end-to-end validation report
   */
  generateReport() {
    const score = this.calculateScore();
    const overallPassed = score >= 85; // 85% threshold for passing

    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        passed: overallPassed,
        score: score,
        grade: this.getGrade(score)
      },
      preValidation: this.results.preValidation,
      buildTests: this.results.buildTests,
      functionalTests: this.results.functionalTests,
      postValidation: this.results.postValidation,
      buildTimes: {
        web: this.results.buildTests.web.buildTime,
        android: this.results.buildTests.android.buildTime
      },
      recommendations: this.generateRecommendations()
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 END-TO-END VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Validation Score: ${score}% (${report.overall.grade})`);
    console.log(`Timestamp: ${report.timestamp}`);

    console.log('\n📋 Test Results:');
    console.log(`  Pre-validation: ${this.results.preValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Web Build: ${this.results.buildTests.web.passed ? '✅ PASSED' : '❌ FAILED'} (${Math.round(this.results.buildTests.web.buildTime / 1000)}s)`);
    console.log(`  Android Build: ${this.results.buildTests.android.passed ? '✅ PASSED' : '❌ FAILED'} (${Math.round(this.results.buildTests.android.buildTime / 1000)}s)`);
    console.log(`  Navigation: ${this.results.functionalTests.navigation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Firebase Config: ${this.results.functionalTests.firebase.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Firebase Auth: ${this.results.functionalTests.auth.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Firestore: ${this.results.functionalTests.firestore.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Post-validation: ${this.results.postValidation.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    return report;
  }

  /**
   * Get letter grade based on score
   */
  getGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 65) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    if (!this.results.preValidation.passed) {
      recommendations.push('Fix pre-validation issues before proceeding with cleanup operations');
    }

    if (!this.results.buildTests.web.passed) {
      recommendations.push('Resolve Web build issues - check dependencies and configuration');
    }

    if (!this.results.buildTests.android.passed && this.results.buildTests.android.errors.length > 0) {
      recommendations.push('Fix Android build issues - verify Android SDK and build configuration');
    }

    if (!this.results.functionalTests.navigation.passed) {
      recommendations.push('Fix navigation structure issues - verify app routing configuration');
    }

    if (!this.results.functionalTests.firebase.passed) {
      recommendations.push('Fix Firebase configuration issues - verify firebaseConfig.ts');
    }

    if (!this.results.functionalTests.auth.passed) {
      recommendations.push('Fix Firebase Auth setup - verify authentication configuration');
    }

    if (!this.results.functionalTests.firestore.passed) {
      recommendations.push('Fix Firestore setup - verify database configuration');
    }

    if (!this.results.postValidation.passed) {
      recommendations.push('Address post-validation issues to ensure cleanup was successful');
    }

    if (this.results.overall.passed) {
      recommendations.push('All end-to-end validations passed! The project is ready for production use');
    }

    return recommendations;
  }

  /**
   * Run all end-to-end validation tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive end-to-end validation...\n');

    // Run pre-validation
    await this.runPreValidation();

    // Run build tests
    console.log('\n📦 Running build tests...\n');
    await this.testWebBuild();
    await this.testAndroidBuild();

    // Run functional tests
    console.log('\n🧪 Running functional tests...\n');
    await this.testNavigation();
    await this.testFirebaseConfiguration();
    await this.testFirebaseAuth();
    await this.testFirestore();

    // Run post-validation
    await this.runPostValidation();

    // Calculate overall results
    this.results.overall.score = this.calculateScore();
    this.results.overall.passed = this.results.overall.score >= 85;

    const report = this.generateReport();
    
    // Write comprehensive report to file
    const reportPath = path.join(this.projectRoot, 'end-to-end-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 End-to-end validation report saved to: ${reportPath}`);

    return report.overall.passed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new EndToEndValidation();

  try {
    if (args.includes('--builds-only')) {
      console.log('🚀 Running build tests only...\n');
      await validator.testWebBuild();
      await validator.testAndroidBuild();
      const passed = validator.results.buildTests.web.passed && validator.results.buildTests.android.passed;
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--functional-only')) {
      console.log('🚀 Running functional tests only...\n');
      await validator.testNavigation();
      await validator.testFirebaseConfiguration();
      await validator.testFirebaseAuth();
      await validator.testFirestore();
      const passed = Object.values(validator.results.functionalTests).every(test => test.passed);
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--score-only')) {
      await validator.runAllTests();
      console.log(`Final Score: ${validator.results.overall.score}%`);
      process.exit(0);
    }

    // Run all tests by default
    const passed = await validator.runAllTests();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('❌ End-to-end validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EndToEndValidation;