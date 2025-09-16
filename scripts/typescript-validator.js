#!/usr/bin/env node

/**
 * TypeScript Validation Test Script
 * 
 * This script validates TypeScript compilation with strict settings
 * and ensures the project meets all cleanup requirements.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TypeScriptValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.tsConfigPath = path.join(this.projectRoot, 'tsconfig.json');
    this.results = {
      compilation: { passed: false, errors: [], warnings: [] },
      strictMode: { passed: false, issues: [] },
      cleanup: { passed: false, issues: [] }
    };
  }

  /**
   * Run TypeScript compilation check with --noEmit
   */
  async validateCompilation() {
    console.log('🔍 Running TypeScript compilation validation...');
    
    try {
      // Run tsc --noEmit to check compilation without generating files
      const result = execSync('npx tsc --noEmit', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.results.compilation.passed = true;
      console.log('✅ TypeScript compilation passed');
      
    } catch (error) {
      this.results.compilation.passed = false;
      this.results.compilation.errors = error.stdout ? 
        error.stdout.split('\n').filter(line => line.trim()) : 
        [error.message];
      
      console.log('❌ TypeScript compilation failed:');
      this.results.compilation.errors.forEach(err => {
        console.log(`   ${err}`);
      });
    }
    
    return this.results.compilation.passed;
  }

  /**
   * Validate strict mode configuration
   */
  async validateStrictMode() {
    console.log('🔍 Validating TypeScript strict mode configuration...');
    
    if (!fs.existsSync(this.tsConfigPath)) {
      this.results.strictMode.issues.push('tsconfig.json not found');
      return false;
    }

    try {
      // Use TypeScript to parse the config (handles comments and trailing commas)
      const result = execSync('npx tsc --showConfig', { encoding: 'utf8', stdio: 'pipe' });
      const tsConfig = JSON.parse(result);
      const compilerOptions = tsConfig.compilerOptions || {};
      
      const requiredStrictOptions = {
        'strict': true,
        'noUnusedLocals': true,
        'noUnusedParameters': true,
        'exactOptionalPropertyTypes': true,
        'noFallthroughCasesInSwitch': true,
        'noImplicitReturns': true
      };

      const missingOptions = [];
      const incorrectOptions = [];

      for (const [option, expectedValue] of Object.entries(requiredStrictOptions)) {
        if (!(option in compilerOptions)) {
          missingOptions.push(option);
        } else if (compilerOptions[option] !== expectedValue) {
          incorrectOptions.push(`${option}: expected ${expectedValue}, got ${compilerOptions[option]}`);
        }
      }

      if (missingOptions.length > 0) {
        this.results.strictMode.issues.push(`Missing strict options: ${missingOptions.join(', ')}`);
      }

      if (incorrectOptions.length > 0) {
        this.results.strictMode.issues.push(`Incorrect options: ${incorrectOptions.join(', ')}`);
      }

      this.results.strictMode.passed = missingOptions.length === 0 && incorrectOptions.length === 0;

      if (this.results.strictMode.passed) {
        console.log('✅ TypeScript strict mode configuration is valid');
      } else {
        console.log('❌ TypeScript strict mode configuration issues:');
        this.results.strictMode.issues.forEach(issue => {
          console.log(`   ${issue}`);
        });
      }

    } catch (error) {
      this.results.strictMode.issues.push(`Failed to parse tsconfig.json: ${error.message}`);
      this.results.strictMode.passed = false;
      console.log('❌ Failed to validate TypeScript configuration:', error.message);
    }

    return this.results.strictMode.passed;
  }

  /**
   * Validate that cleanup requirements are met
   */
  async validateCleanupRequirements() {
    console.log('🔍 Validating cleanup requirements...');
    
    const issues = [];

    // Check for unused locals and parameters by running tsc with specific flags
    try {
      execSync('npx tsc --noEmit --noUnusedLocals --noUnusedParameters', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log('✅ No unused locals or parameters detected');
    } catch (error) {
      if (error.stdout && error.stdout.includes('is declared but never used')) {
        issues.push('Unused locals or parameters detected');
        console.log('❌ Unused locals or parameters found:');
        const unusedLines = error.stdout.split('\n')
          .filter(line => line.includes('is declared but never used'))
          .slice(0, 5); // Show first 5 examples
        unusedLines.forEach(line => console.log(`   ${line.trim()}`));
        if (error.stdout.split('\n').filter(line => line.includes('is declared but never used')).length > 5) {
          console.log('   ... and more');
        }
      }
    }

    // Check TypeScript version compatibility
    try {
      const tsVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
      console.log(`📋 TypeScript version: ${tsVersion}`);
    } catch (error) {
      issues.push('TypeScript not available');
    }

    this.results.cleanup.issues = issues;
    this.results.cleanup.passed = issues.length === 0;

    return this.results.cleanup.passed;
  }

  /**
   * Update TypeScript configuration with strict settings
   */
  async updateStrictConfiguration() {
    console.log('🔧 Updating TypeScript configuration with strict settings...');
    
    if (!fs.existsSync(this.tsConfigPath)) {
      throw new Error('tsconfig.json not found');
    }

    // Read the raw file for updating (we'll handle comments manually)
    let tsConfigContent = fs.readFileSync(this.tsConfigPath, 'utf8');
    
    // For parsing, use tsc --showConfig to get the resolved config
    const result = execSync('npx tsc --showConfig', { encoding: 'utf8', stdio: 'pipe' });
    const tsConfig = JSON.parse(result);
    
    // Ensure compilerOptions exists
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }

    // Apply strict settings
    const strictSettings = {
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      noFallthroughCasesInSwitch: true,
      noImplicitReturns: true
    };

    Object.assign(tsConfig.compilerOptions, strictSettings);

    // Write back to file with proper formatting
    fs.writeFileSync(this.tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✅ TypeScript configuration updated with strict settings');
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        passed: this.results.compilation.passed && 
                this.results.strictMode.passed && 
                this.results.cleanup.passed
      },
      details: this.results
    };

    console.log('\n📊 TypeScript Validation Report');
    console.log('================================');
    console.log(`Overall Status: ${report.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Compilation: ${this.results.compilation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Strict Mode: ${this.results.strictMode.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Cleanup Requirements: ${this.results.cleanup.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (!report.overall.passed) {
      console.log('\n🔍 Issues Found:');
      if (!this.results.compilation.passed) {
        console.log('  Compilation Errors:');
        this.results.compilation.errors.forEach(err => console.log(`    - ${err}`));
      }
      if (!this.results.strictMode.passed) {
        console.log('  Strict Mode Issues:');
        this.results.strictMode.issues.forEach(issue => console.log(`    - ${issue}`));
      }
      if (!this.results.cleanup.passed) {
        console.log('  Cleanup Issues:');
        this.results.cleanup.issues.forEach(issue => console.log(`    - ${issue}`));
      }
    }

    return report;
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('🚀 Starting TypeScript validation tests...\n');

    await this.validateStrictMode();
    await this.validateCompilation();
    await this.validateCleanupRequirements();

    const report = this.generateReport();
    
    // Write report to file
    const reportPath = path.join(this.projectRoot, 'typescript-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return report.overall.passed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new TypeScriptValidator();

  try {
    if (args.includes('--update-config')) {
      await validator.updateStrictConfiguration();
      return;
    }

    if (args.includes('--compilation-only')) {
      const passed = await validator.validateCompilation();
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--strict-mode-only')) {
      const passed = await validator.validateStrictMode();
      process.exit(passed ? 0 : 1);
    }

    // Run all tests by default
    const passed = await validator.runAllTests();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TypeScriptValidator;