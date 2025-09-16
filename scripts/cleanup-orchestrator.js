#!/usr/bin/env node

/**
 * Cleanup Orchestrator
 * Master script that orchestrates all cleanup operations with dry-run mode,
 * progress reporting, and logging for each cleanup step
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import individual cleanup modules
const DependencyScanner = require('./dependency-scanner');
const DeadCodeDetector = require('./dead-code-detector');
const AssetManager = require('./asset-manager');
const ExpoConfigCleaner = require('./expo-config-cleaner');
const EasConfigOptimizer = require('./eas-config-optimizer');
const FirebaseConfigNormalizer = require('./firebase-config-normalizer');
const DebugScriptOrganizer = require('./debug-script-organizer');
const PackageScriptCleaner = require('./package-script-cleaner');
const BackupRollbackSystem = require('./backup-rollback-system');

class CleanupOrchestrator {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun !== false, // Default to true
      verbose: options.verbose || false,
      skipSteps: options.skipSteps || [],
      logFile: options.logFile || 'cleanup-orchestrator.log',
      useBackup: options.useBackup !== false, // Default to true
      ...options
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      steps: [],
      summary: {
        totalSteps: 0,
        completedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0
      },
      errors: [],
      warnings: []
    };
    
    this.logStream = null;
    this.backupSystem = null;
    this.initializeLogging();
    
    // Initialize backup system if enabled
    if (this.options.useBackup) {
      this.backupSystem = new BackupRollbackSystem({
        verbose: this.options.verbose,
        useGit: !options.noGit
      });
    }
  }

  /**
   * Initialize logging system
   */
  initializeLogging() {
    try {
      this.logStream = fs.createWriteStream(this.options.logFile, { flags: 'w' });
      this.log('info', 'Cleanup orchestrator initialized');
      this.log('info', `Options: ${JSON.stringify(this.options, null, 2)}`);
    } catch (error) {
      console.error('❌ Failed to initialize logging:', error.message);
    }
  }

  /**
   * Log message to both console and file
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output with colors
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${level.toUpperCase()}: ${message}${colors.reset}`);
    
    if (data && this.options.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }

    // File output
    if (this.logStream) {
      this.logStream.write(JSON.stringify(logEntry) + '\n');
    }
  }

  /**
   * Update progress and report current step
   */
  updateProgress(stepName, status, details = null) {
    const step = {
      name: stepName,
      status, // 'started', 'completed', 'failed', 'skipped'
      timestamp: new Date().toISOString(),
      details
    };

    this.results.steps.push(step);
    
    const emoji = {
      started: '🔄',
      completed: '✅',
      failed: '❌',
      skipped: '⏭️'
    }[status] || '📋';

    this.log('info', `${emoji} ${stepName}: ${status}`, details);
    
    // Update summary
    if (status === 'completed') this.results.summary.completedSteps++;
    if (status === 'failed') this.results.summary.failedSteps++;
    if (status === 'skipped') this.results.summary.skippedSteps++;
  }

  /**
   * Execute a cleanup step with error handling and backup/rollback support
   */
  async executeStep(stepName, stepFunction, required = false, filesToBackup = []) {
    if (this.options.skipSteps.includes(stepName)) {
      this.updateProgress(stepName, 'skipped', 'Skipped by user request');
      return { success: true, skipped: true };
    }

    this.updateProgress(stepName, 'started');
    this.results.summary.totalSteps++;

    // Create checkpoint before executing step
    let checkpoint = null;
    if (this.backupSystem && !this.options.dryRun) {
      try {
        checkpoint = await this.backupSystem.createCheckpoint(stepName, filesToBackup);
        this.log('info', `Checkpoint created for ${stepName}`);
      } catch (error) {
        this.log('warning', `Failed to create checkpoint for ${stepName}: ${error.message}`);
      }
    }

    try {
      const result = await stepFunction();
      
      // Validate step if backup system is available
      if (this.backupSystem && checkpoint && !this.options.dryRun) {
        const validation = await this.validateStepResult(stepName, result);
        if (!validation.success) {
          throw new Error(`Step validation failed: ${validation.error}`);
        }
      }
      
      this.updateProgress(stepName, 'completed', result);
      return { success: true, result };
    } catch (error) {
      const errorDetails = {
        message: error.message,
        stack: error.stack
      };
      
      this.updateProgress(stepName, 'failed', errorDetails);
      this.results.errors.push({
        step: stepName,
        error: errorDetails,
        required,
        checkpoint: checkpoint?.success
      });

      // Attempt rollback if backup system is available
      if (this.backupSystem && checkpoint && !this.options.dryRun) {
        try {
          await this.backupSystem.rollbackToCheckpoint(stepName);
          this.log('info', `Rolled back ${stepName} due to failure`);
          errorDetails.rolledBack = true;
        } catch (rollbackError) {
          this.log('error', `Rollback failed for ${stepName}: ${rollbackError.message}`);
          errorDetails.rollbackFailed = rollbackError.message;
        }
      }

      if (required) {
        throw new Error(`Required step '${stepName}' failed: ${error.message}`);
      }

      this.log('warning', `Non-critical step '${stepName}' failed, continuing...`);
      return { success: false, error: errorDetails };
    }
  }

  /**
   * Validate step result (basic validation)
   */
  async validateStepResult(stepName, result) {
    try {
      // Basic TypeScript compilation check
      execSync('pnpm tsc --noEmit', { stdio: 'pipe' });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `TypeScript compilation failed after ${stepName}` 
      };
    }
  }

  /**
   * Step 1: TypeScript Configuration and Analysis Tools Setup
   */
  async setupAnalysisTools() {
    this.log('info', 'Setting up TypeScript strict configuration and analysis tools...');
    
    // Update tsconfig.json with strict settings
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    let tsconfig = {};
    
    if (fs.existsSync(tsconfigPath)) {
      tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    }
    
    // Ensure strict TypeScript settings
    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      exactOptionalPropertyTypes: true,
      noFallthroughCasesInSwitch: true
    };

    if (!this.options.dryRun) {
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }

    // Verify TypeScript compilation
    try {
      execSync('pnpm tsc --noEmit', { stdio: 'pipe' });
      return { 
        tsconfigUpdated: !this.options.dryRun,
        compilationPassed: true 
      };
    } catch (error) {
      return { 
        tsconfigUpdated: !this.options.dryRun,
        compilationPassed: false,
        compilationError: error.message
      };
    }
  }

  /**
   * Step 2: Dependency Analysis and Cleanup
   */
  async analyzeDependencies() {
    this.log('info', 'Analyzing project dependencies...');
    
    const scanner = new DependencyScanner();
    const report = await scanner.generateReport();
    
    return {
      unusedDependencies: report.unused.total,
      safeToRemove: report.validation.safeToRemove.length,
      shouldKeep: report.validation.shouldKeep.length,
      missingDependencies: Object.keys(report.missing).length,
      report
    };
  }

  /**
   * Step 3: Dead Code Detection
   */
  async detectDeadCode() {
    this.log('info', 'Detecting dead code and unused exports...');
    
    const detector = new DeadCodeDetector();
    const report = await detector.generateReport();
    
    return {
      unusedFiles: report.summary.totalUnusedFiles,
      unusedExports: report.summary.totalUnusedExports,
      safeToRemoveFiles: report.summary.safeToRemoveFiles,
      dynamicReferences: report.summary.totalDynamicReferences,
      report
    };
  }

  /**
   * Step 4: Asset Management
   */
  async manageAssets() {
    this.log('info', 'Analyzing and managing project assets...');
    
    const manager = new AssetManager();
    const report = await manager.runCompleteAnalysis();
    
    return {
      totalAssets: report.summary.totalAssets,
      unusedAssets: report.summary.unusedAssets,
      unusedSize: report.summary.formattedTotalUnusedSize,
      report
    };
  }

  /**
   * Step 5: Configuration Cleanup
   */
  async cleanupConfigurations() {
    this.log('info', 'Cleaning up configuration files...');
    
    const results = {};
    
    // Expo configuration
    try {
      const expoCleaner = new ExpoConfigCleaner();
      const expoResult = await expoCleaner.cleanup({ 
        dryRun: this.options.dryRun, 
        removeUnused: true 
      });
      results.expo = expoResult;
    } catch (error) {
      results.expo = { success: false, error: error.message };
    }
    
    // EAS configuration
    try {
      const easOptimizer = new EasConfigOptimizer();
      const easResult = await easOptimizer.optimizeConfig({ 
        dryRun: this.options.dryRun 
      });
      results.eas = easResult;
    } catch (error) {
      results.eas = { success: false, error: error.message };
    }
    
    // Firebase configuration
    try {
      const firebaseNormalizer = new FirebaseConfigNormalizer();
      const firebaseResult = await firebaseNormalizer.normalizeConfig({ 
        dryRun: this.options.dryRun 
      });
      results.firebase = firebaseResult;
    } catch (error) {
      results.firebase = { success: false, error: error.message };
    }
    
    return results;
  }

  /**
   * Step 6: Script and Tool Organization
   */
  async organizeScripts() {
    this.log('info', 'Organizing development scripts and tools...');
    
    const results = {};
    
    // Debug script organization
    try {
      const debugOrganizer = new DebugScriptOrganizer();
      const debugResult = await debugOrganizer.organizeDebugScripts({ 
        dryRun: this.options.dryRun 
      });
      results.debug = debugResult;
    } catch (error) {
      results.debug = { success: false, error: error.message };
    }
    
    // Package.json script cleanup
    try {
      const scriptCleaner = new PackageScriptCleaner();
      const scriptResult = await scriptCleaner.cleanPackageScripts({ 
        dryRun: this.options.dryRun 
      });
      results.packageScripts = scriptResult;
    } catch (error) {
      results.packageScripts = { success: false, error: error.message };
    }
    
    return results;
  }

  /**
   * Step 7: Validation and Testing
   */
  async validateCleanup() {
    this.log('info', 'Validating cleanup results...');
    
    const validationResults = {
      typescript: false,
      dependencies: false,
      build: false,
      errors: []
    };
    
    // TypeScript validation
    try {
      execSync('pnpm tsc --noEmit', { stdio: 'pipe' });
      validationResults.typescript = true;
    } catch (error) {
      validationResults.errors.push(`TypeScript validation failed: ${error.message}`);
    }
    
    // Dependency validation
    try {
      execSync('pnpm install --frozen-lockfile', { stdio: 'pipe' });
      validationResults.dependencies = true;
    } catch (error) {
      validationResults.errors.push(`Dependency validation failed: ${error.message}`);
    }
    
    // Build validation (basic check)
    try {
      execSync('pnpm expo export --platform web --output-dir dist/validation', { stdio: 'pipe' });
      validationResults.build = true;
    } catch (error) {
      validationResults.errors.push(`Build validation failed: ${error.message}`);
    }
    
    return validationResults;
  }

  /**
   * Generate final cleanup report
   */
  generateFinalReport() {
    const report = {
      ...this.results,
      options: this.options,
      summary: {
        ...this.results.summary,
        successRate: this.results.summary.totalSteps > 0 
          ? (this.results.summary.completedSteps / this.results.summary.totalSteps * 100).toFixed(2) + '%'
          : '0%',
        duration: new Date().toISOString()
      }
    };
    
    // Save report to file
    const reportPath = `cleanup-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { report, reportPath };
  }

  /**
   * Print summary to console
   */
  printSummary(report) {
    console.log('\n🎯 CLEANUP ORCHESTRATOR SUMMARY');
    console.log('================================');
    console.log(`📅 Started: ${report.timestamp}`);
    console.log(`📅 Completed: ${report.summary.duration}`);
    console.log(`📊 Total steps: ${report.summary.totalSteps}`);
    console.log(`✅ Completed: ${report.summary.completedSteps}`);
    console.log(`❌ Failed: ${report.summary.failedSteps}`);
    console.log(`⏭️  Skipped: ${report.summary.skippedSteps}`);
    console.log(`📈 Success rate: ${report.summary.successRate}`);
    
    if (this.options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes were made');
      console.log('💡 Run with --apply to execute changes');
    }
    
    if (report.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      report.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.step}: ${error.error.message}`);
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      report.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
  }

  /**
   * Main orchestration method
   */
  async orchestrate() {
    this.log('info', '🚀 Starting comprehensive project cleanup...');
    
    try {
      // Create initial backup
      if (this.backupSystem && !this.options.dryRun) {
        this.log('info', '📦 Creating initial backup...');
        const backupResult = await this.backupSystem.createInitialBackup();
        this.log('success', `Backup created: ${backupResult.method}`);
        this.results.backup = backupResult;
      }
      
      // Execute all cleanup steps with appropriate file backups
      await this.executeStep('Setup Analysis Tools', () => this.setupAnalysisTools(), true, ['tsconfig.json']);
      await this.executeStep('Analyze Dependencies', () => this.analyzeDependencies(), false, ['package.json']);
      await this.executeStep('Detect Dead Code', () => this.detectDeadCode());
      await this.executeStep('Manage Assets', () => this.manageAssets(), false, ['assets/']);
      await this.executeStep('Cleanup Configurations', () => this.cleanupConfigurations(), false, [
        'app.json', 'app.config.js', 'eas.json', 'firebase.json', 'firebaseConfig.ts'
      ]);
      await this.executeStep('Organize Scripts', () => this.organizeScripts(), false, ['scripts/', 'package.json']);
      await this.executeStep('Validate Cleanup', () => this.validateCleanup(), true);
      
      // Generate and display final report
      const { report, reportPath } = this.generateFinalReport();
      this.printSummary(report);
      
      this.log('success', `📋 Full report saved to: ${reportPath}`);
      this.log('success', '🎉 Cleanup orchestration completed!');
      
      // Cleanup backup system if successful
      if (this.backupSystem && !this.options.dryRun) {
        const keepBackup = this.results.summary.failedSteps > 0;
        await this.backupSystem.cleanup(keepBackup);
        this.log('info', keepBackup ? '📦 Backup preserved due to failures' : '📦 Backup cleaned up');
      }
      
      return { success: true, report, reportPath };
      
    } catch (error) {
      this.log('error', '💥 Cleanup orchestration failed', { error: error.message });
      
      // Offer rollback on critical failure
      if (this.backupSystem && !this.options.dryRun) {
        this.log('info', '🔄 Critical failure detected, rollback available');
        this.log('info', 'Run with --rollback to restore initial state');
      }
      
      const { report, reportPath } = this.generateFinalReport();
      this.printSummary(report);
      
      return { success: false, error: error.message, report, reportPath };
    } finally {
      if (this.logStream) {
        this.logStream.end();
      }
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup() {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  // Handle rollback command
  if (args[0] === 'rollback') {
    const backupSystem = new BackupRollbackSystem({ verbose: true });
    try {
      await backupSystem.rollbackToInitial();
      console.log('✅ Successfully rolled back to initial state');
      process.exit(0);
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }
  
  const options = {
    dryRun: !args.includes('--apply'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipSteps: [],
    logFile: 'cleanup-orchestrator.log',
    useBackup: !args.includes('--no-backup'),
    noGit: args.includes('--no-git')
  };
  
  // Parse skip steps
  const skipIndex = args.indexOf('--skip');
  if (skipIndex !== -1 && args[skipIndex + 1]) {
    options.skipSteps = args[skipIndex + 1].split(',');
  }
  
  // Parse custom log file
  const logIndex = args.indexOf('--log');
  if (logIndex !== -1 && args[logIndex + 1]) {
    options.logFile = args[logIndex + 1];
  }
  
  console.log('🧹 Cleanup Orchestrator');
  console.log('========================');
  
  if (options.dryRun) {
    console.log('🔍 Running in DRY RUN mode - no changes will be made');
    console.log('💡 Use --apply to execute actual cleanup');
  }
  
  if (options.useBackup) {
    console.log('📦 Backup system enabled');
  } else {
    console.log('⚠️  Backup system disabled');
  }
  
  if (options.skipSteps.length > 0) {
    console.log(`⏭️  Skipping steps: ${options.skipSteps.join(', ')}`);
  }
  
  const orchestrator = new CleanupOrchestrator(options);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Cleanup interrupted by user');
    orchestrator.cleanup();
    process.exit(1);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Cleanup terminated');
    orchestrator.cleanup();
    process.exit(1);
  });
  
  try {
    const result = await orchestrator.orchestrate();
    
    if (!result.success && options.useBackup && !options.dryRun) {
      console.log('\n💡 To rollback all changes, run:');
      console.log('   node scripts/cleanup-orchestrator.js rollback');
    }
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
    orchestrator.cleanup();
    process.exit(1);
  }
}

// Export for use as module
module.exports = CleanupOrchestrator;

// Run if called directly
if (require.main === module) {
  main();
}