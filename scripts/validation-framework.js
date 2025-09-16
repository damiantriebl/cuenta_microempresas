#!/usr/bin/env node

/**
 * Comprehensive Validation Framework
 * 
 * This script combines TypeScript validation and platform smoke tests
 * to provide a complete validation suite for the cleanup process.
 */

const TypeScriptValidator = require('./typescript-validator');
const PlatformSmokeTests = require('./platform-smoke-tests');
const fs = require('fs');
const path = require('path');

class ValidationFramework {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      typescript: null,
      platforms: null,
      overall: { passed: false, score: 0 }
    };
  }

  /**
   * Run TypeScript validation tests
   */
  async runTypeScriptValidation() {
    console.log('🔍 Running TypeScript validation...\n');
    
    const validator = new TypeScriptValidator();
    
    try {
      const passed = await validator.runAllTests();
      this.results.typescript = {
        passed,
        details: validator.results
      };
      
      console.log(`\n📋 TypeScript validation: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      return passed;
    } catch (error) {
      console.error('❌ TypeScript validation failed:', error.message);
      this.results.typescript = {
        passed: false,
        error: error.message
      };
      return false;
    }
  }

  /**
   * Run platform smoke tests
   */
  async runPlatformTests() {
    console.log('\n🚀 Running platform smoke tests...\n');
    
    const tester = new PlatformSmokeTests();
    
    try {
      const passed = await tester.runAllTests();
      this.results.platforms = {
        passed,
        details: tester.results
      };
      
      console.log(`\n📋 Platform tests: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      return passed;
    } catch (error) {
      console.error('❌ Platform tests failed:', error.message);
      this.results.platforms = {
        passed: false,
        error: error.message
      };
      return false;
    }
  }

  /**
   * Calculate validation score
   */
  calculateScore() {
    let score = 0;
    let maxScore = 0;

    // TypeScript validation (40% of total score)
    maxScore += 40;
    if (this.results.typescript?.passed) {
      score += 40;
    } else if (this.results.typescript?.details) {
      // Partial credit based on what passed
      const details = this.results.typescript.details;
      if (details.strictMode?.passed) score += 15;
      if (details.compilation?.passed) score += 15;
      if (details.cleanup?.passed) score += 10;
    }

    // Platform tests (60% of total score)
    maxScore += 60;
    if (this.results.platforms?.passed) {
      score += 60;
    } else if (this.results.platforms?.details) {
      // Partial credit for individual platforms
      const details = this.results.platforms.details;
      if (details.web?.passed) score += 25;
      if (details.android?.passed) score += 20;
      if (details.firebase?.passed) score += 15;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    const score = this.calculateScore();
    const overallPassed = score >= 80; // 80% threshold for passing

    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        passed: overallPassed,
        score: score,
        grade: this.getGrade(score)
      },
      typescript: this.results.typescript,
      platforms: this.results.platforms,
      recommendations: this.generateRecommendations()
    };

    console.log('\n' + '='.repeat(50));
    console.log('📊 COMPREHENSIVE VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Validation Score: ${score}% (${report.overall.grade})`);
    console.log(`Timestamp: ${report.timestamp}`);

    console.log('\n📋 Component Results:');
    console.log(`  TypeScript Validation: ${this.results.typescript?.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Platform Tests: ${this.results.platforms?.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(50));

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

    // TypeScript recommendations
    if (!this.results.typescript?.passed) {
      if (!this.results.typescript?.details?.compilation?.passed) {
        recommendations.push('Fix TypeScript compilation errors before proceeding with cleanup');
      }
      if (!this.results.typescript?.details?.strictMode?.passed) {
        recommendations.push('Update tsconfig.json with strict TypeScript settings');
      }
      if (!this.results.typescript?.details?.cleanup?.passed) {
        recommendations.push('Remove unused locals and parameters from the codebase');
      }
    }

    // Platform recommendations
    if (!this.results.platforms?.passed) {
      const platformDetails = this.results.platforms?.details;
      
      if (!platformDetails?.web?.passed) {
        recommendations.push('Fix web platform issues - check build configuration and dependencies');
      }
      if (!platformDetails?.android?.passed && platformDetails?.android?.errors?.length > 0) {
        recommendations.push('Resolve Android platform issues - check Android SDK and build configuration');
      }
      if (!platformDetails?.firebase?.passed) {
        recommendations.push('Fix Firebase integration - verify configuration and network connectivity');
      }
    }

    // General recommendations
    if (this.results.typescript?.passed && this.results.platforms?.passed) {
      recommendations.push('All validations passed! The project is ready for cleanup operations');
    } else {
      recommendations.push('Address failing validations before running cleanup operations');
    }

    return recommendations;
  }

  /**
   * Run all validation tests
   */
  async runAllValidations() {
    console.log('🚀 Starting comprehensive validation framework...\n');

    const tsResult = await this.runTypeScriptValidation();
    const platformResult = await this.runPlatformTests();

    this.results.overall.passed = tsResult && platformResult;
    this.results.overall.score = this.calculateScore();

    const report = this.generateReport();
    
    // Write comprehensive report to file
    const reportPath = path.join(this.projectRoot, 'validation-framework-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Comprehensive report saved to: ${reportPath}`);

    return report.overall.passed;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const framework = new ValidationFramework();

  try {
    if (args.includes('--typescript-only')) {
      const passed = await framework.runTypeScriptValidation();
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--platforms-only')) {
      const passed = await framework.runPlatformTests();
      process.exit(passed ? 0 : 1);
    }

    if (args.includes('--score-only')) {
      await framework.runAllValidations();
      console.log(`Final Score: ${framework.results.overall.score}%`);
      process.exit(0);
    }

    // Run all validations by default
    const passed = await framework.runAllValidations();
    process.exit(passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation framework failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ValidationFramework;