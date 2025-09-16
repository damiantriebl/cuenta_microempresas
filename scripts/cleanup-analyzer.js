#!/usr/bin/env node

/**
 * Comprehensive Cleanup Analyzer
 * Combines dependency analysis and dead code detection for complete project cleanup insights
 */

const DependencyScanner = require('./dependency-scanner');
const DeadCodeDetector = require('./dead-code-detector');
const fs = require('fs');
const path = require('path');

class CleanupAnalyzer {
  constructor() {
    this.dependencyScanner = new DependencyScanner();
    this.deadCodeDetector = new DeadCodeDetector();
  }

  /**
   * Run comprehensive analysis combining both dependency and dead code analysis
   */
  async runComprehensiveAnalysis() {
    console.log('🚀 Starting comprehensive cleanup analysis...\n');

    // Run dependency analysis
    console.log('📦 DEPENDENCY ANALYSIS');
    console.log('======================');
    const dependencyReport = await this.dependencyScanner.generateReport();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run dead code analysis
    console.log('💀 DEAD CODE ANALYSIS');
    console.log('=====================');
    const deadCodeReport = await this.deadCodeDetector.generateReport();

    // Generate combined summary
    console.log('\n' + '='.repeat(50) + '\n');
    this.generateCombinedSummary(dependencyReport, deadCodeReport);

    return {
      dependencies: dependencyReport,
      deadCode: deadCodeReport,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate a combined summary of all findings
   */
  generateCombinedSummary(dependencyReport, deadCodeReport) {
    console.log('📊 COMPREHENSIVE CLEANUP SUMMARY');
    console.log('=================================');
    
    const totalIssues = 
      dependencyReport.validation.safeToRemove.length +
      Object.keys(dependencyReport.missing).length +
      deadCodeReport.summary.safeToRemoveFiles +
      deadCodeReport.summary.safeToRemoveExports;

    console.log(`🎯 Total cleanup opportunities: ${totalIssues}`);
    console.log(`📦 Dependencies to remove: ${dependencyReport.validation.safeToRemove.length}`);
    console.log(`❓ Missing dependencies: ${Object.keys(dependencyReport.missing).length}`);
    console.log(`📁 Unused files: ${deadCodeReport.summary.safeToRemoveFiles}`);
    console.log(`📤 Unused exports: ${deadCodeReport.summary.safeToRemoveExports}`);
    console.log(`🔗 Dynamic references detected: ${deadCodeReport.summary.totalDynamicReferences}`);

    // Priority recommendations
    console.log('\n🎯 PRIORITY RECOMMENDATIONS:');
    
    if (Object.keys(dependencyReport.missing).length > 0) {
      console.log('1. 🚨 HIGH: Install missing dependencies first');
      Object.entries(dependencyReport.missing).forEach(([dep, files]) => {
        console.log(`   - pnpm add ${dep.startsWith('@types/') ? '-D ' : ''}${dep}`);
      });
    }

    if (dependencyReport.validation.safeToRemove.length > 0) {
      console.log('2. 📦 MEDIUM: Remove unused dependencies');
      console.log(`   - pnpm remove ${dependencyReport.validation.safeToRemove.join(' ')}`);
    }

    if (deadCodeReport.summary.safeToRemoveFiles > 0) {
      console.log('3. 📁 LOW: Review and remove unused files (manual review recommended)');
    }

    if (deadCodeReport.summary.safeToRemoveExports > 0) {
      console.log('4. 📤 LOW: Clean up unused exports (use ts-prune for details)');
    }

    // Warnings
    if (dependencyReport.validation.shouldKeep.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      console.log('Dependencies with dynamic imports (keep these):');
      dependencyReport.validation.shouldKeep.forEach(dep => {
        console.log(`   - ${dep}`);
      });
    }
  }

  /**
   * Save comprehensive report to file
   */
  async saveReport(report, filename = 'cleanup-analysis-report.json') {
    const reportPath = path.join(process.cwd(), filename);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Full report saved to: ${filename}`);
    } catch (error) {
      console.error(`❌ Error saving report: ${error.message}`);
    }
  }

  /**
   * Generate actionable cleanup script
   */
  generateCleanupScript(report) {
    const scriptLines = [
      '#!/bin/bash',
      '# Generated cleanup script',
      '# Review before executing!',
      '',
      'echo "🧹 Starting project cleanup..."',
      ''
    ];

    // Add missing dependencies
    if (Object.keys(report.dependencies.missing).length > 0) {
      scriptLines.push('echo "📦 Installing missing dependencies..."');
      Object.keys(report.dependencies.missing).forEach(dep => {
        const isDev = dep.startsWith('@types/') || dep.includes('test');
        scriptLines.push(`pnpm add ${isDev ? '-D ' : ''}${dep}`);
      });
      scriptLines.push('');
    }

    // Remove unused dependencies
    if (report.dependencies.validation.safeToRemove.length > 0) {
      scriptLines.push('echo "🗑️  Removing unused dependencies..."');
      scriptLines.push(`pnpm remove ${report.dependencies.validation.safeToRemove.join(' ')}`);
      scriptLines.push('');
    }

    scriptLines.push('echo "✅ Cleanup complete!"');
    scriptLines.push('echo "⚠️  Remember to test your application after cleanup"');

    const scriptContent = scriptLines.join('\n');
    const scriptPath = path.join(process.cwd(), 'cleanup-script.sh');
    
    try {
      fs.writeFileSync(scriptPath, scriptContent);
      console.log(`\n📜 Cleanup script generated: cleanup-script.sh`);
      console.log('   Review the script before running: chmod +x cleanup-script.sh && ./cleanup-script.sh');
    } catch (error) {
      console.error(`❌ Error generating cleanup script: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const analyzer = new CleanupAnalyzer();
  
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'deps':
        await analyzer.dependencyScanner.generateReport();
        break;
      
      case 'dead-code':
        await analyzer.deadCodeDetector.generateReport();
        break;
      
      case 'save':
        const report = await analyzer.runComprehensiveAnalysis();
        await analyzer.saveReport(report);
        analyzer.generateCleanupScript(report);
        break;
      
      case 'script':
        const scriptReport = await analyzer.runComprehensiveAnalysis();
        analyzer.generateCleanupScript(scriptReport);
        break;
      
      case 'full':
      default:
        await analyzer.runComprehensiveAnalysis();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = CleanupAnalyzer;

// Run if called directly
if (require.main === module) {
  main();
}