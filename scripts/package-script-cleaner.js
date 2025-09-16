#!/usr/bin/env node

/**
 * Package.json Script Cleaner
 * 
 * This script validates all scripts in package.json, removes broken or unused commands,
 * and adds necessary scripts for typecheck, lint, and dead code analysis.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PackageScriptCleaner {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    this.results = {
      originalScripts: {},
      validScripts: [],
      brokenScripts: [],
      unusedScripts: [],
      addedScripts: [],
      updatedScripts: [],
      errors: []
    };
  }

  log(message, level = 'info') {
    if (level === 'error' || this.verbose) {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Load and parse package.json
   */
  loadPackageJson() {
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        throw new Error('package.json not found');
      }
      
      const content = fs.readFileSync(this.packageJsonPath, 'utf8');
      const packageJson = JSON.parse(content);
      
      this.results.originalScripts = { ...packageJson.scripts || {} };
      this.log(`Loaded ${Object.keys(this.results.originalScripts).length} scripts from package.json`);
      
      return packageJson;
    } catch (error) {
      this.results.errors.push(`Error loading package.json: ${error.message}`);
      this.log(`Error loading package.json: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Check if a command exists and is accessible
   */
  commandExists(command) {
    try {
      // Extract the base command (first word)
      const baseCommand = command.split(' ')[0];
      
      // Skip validation for npm/pnpm/yarn scripts and built-in commands
      const skipValidation = [
        'npm', 'pnpm', 'yarn', 'npx', 'node', 'tsx', 'echo', 'cd'
      ];
      
      if (skipValidation.includes(baseCommand)) {
        return true;
      }
      
      // Commands that are typically available through node_modules/.bin or as dev dependencies
      const devDependencyCommands = [
        'expo', 'jest', 'tsc', 'eslint', 'depcheck', 'knip', 'ts-prune', 'unimported',
        'eas', 'firebase', 'gradlew.bat'
      ];
      
      if (devDependencyCommands.includes(baseCommand)) {
        // Check if it's in package.json dependencies or devDependencies
        try {
          const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          // Check if the command is a known dependency
          const relatedPackages = {
            'expo': ['expo'],
            'jest': ['jest', 'jest-expo'],
            'tsc': ['typescript'],
            'eslint': ['eslint'],
            'depcheck': ['depcheck'],
            'knip': ['knip'],
            'ts-prune': ['ts-prune'],
            'unimported': ['unimported'],
            'eas': ['@expo/cli', 'eas-cli'],
            'firebase': ['firebase-tools'],
            'gradlew.bat': ['react-native'] // gradlew.bat is part of Android build system
          };
          
          const packages = relatedPackages[baseCommand] || [baseCommand];
          const hasPackage = packages.some(pkg => allDeps[pkg]);
          
          if (hasPackage) {
            return true;
          }
        } catch (error) {
          // If we can't read package.json, assume it's available
          return true;
        }
      }
      
      // For other commands, try to run them
      const testCommands = [`${baseCommand} --version`, `${baseCommand} --help`];
      
      for (const testCmd of testCommands) {
        try {
          execSync(testCmd, { 
            stdio: 'ignore', 
            timeout: 5000,
            windowsHide: true 
          });
          return true;
        } catch (error) {
          // Continue to next test command
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a file or script referenced in the command exists
   */
  checkScriptReferences(scriptCommand) {
    const issues = [];
    
    // Check for file references in the script
    const filePatterns = [
      /node\s+([^\s]+\.js)/g,
      /tsx\s+([^\s]+\.ts)/g,
      /([^\s]+\.js)/g,
      /([^\s]+\.ts)/g,
      /([^\s]+\.mjs)/g
    ];
    
    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(scriptCommand)) !== null) {
        const filePath = match[1];
        
        // Skip URLs and absolute paths
        if (filePath.startsWith('http') || path.isAbsolute(filePath)) {
          continue;
        }
        
        const fullPath = path.join(this.projectRoot, filePath);
        if (!fs.existsSync(fullPath)) {
          issues.push(`Referenced file not found: ${filePath}`);
        }
      }
    }
    
    // Special handling for commands that change directory and run executables
    if (scriptCommand.includes('cd ') && scriptCommand.includes('&&')) {
      const parts = scriptCommand.split('&&').map(p => p.trim());
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith('cd ')) {
          const targetDir = part.replace('cd ', '').trim();
          const targetPath = path.join(this.projectRoot, targetDir);
          
          if (!fs.existsSync(targetPath)) {
            issues.push(`Directory not found: ${targetDir}`);
          } else if (i + 1 < parts.length) {
            // Check if the next command's executable exists in the target directory
            const nextCommand = parts[i + 1];
            const executable = nextCommand.split(' ')[0];
            
            // Check for gradlew.bat specifically
            if (executable === 'gradlew.bat') {
              const executablePath = path.join(targetPath, executable);
              if (!fs.existsSync(executablePath)) {
                issues.push(`Executable not found: ${executable} in ${targetDir}`);
              }
            }
          }
        }
      }
    }
    
    return issues;
  }

  /**
   * Validate a single script
   */
  validateScript(scriptName, scriptCommand) {
    this.log(`Validating script: ${scriptName}`);
    
    const validation = {
      name: scriptName,
      command: scriptCommand,
      isValid: true,
      issues: [],
      category: this.categorizeScript(scriptName)
    };
    
    // Check for file references
    const fileIssues = this.checkScriptReferences(scriptCommand);
    validation.issues.push(...fileIssues);
    
    // Check for broken command chains
    if (scriptCommand.includes('&&')) {
      const commands = scriptCommand.split('&&').map(cmd => cmd.trim());
      for (const cmd of commands) {
        const baseCmd = cmd.split(' ')[0];
        if (!this.commandExists(baseCmd)) {
          validation.issues.push(`Command not found: ${baseCmd}`);
        }
      }
    } else {
      const baseCmd = scriptCommand.split(' ')[0];
      if (!this.commandExists(baseCmd)) {
        validation.issues.push(`Command not found: ${baseCmd}`);
      }
    }
    
    validation.isValid = validation.issues.length === 0;
    
    if (validation.isValid) {
      this.results.validScripts.push(validation);
      this.log(`✅ ${scriptName} is valid`);
    } else {
      this.results.brokenScripts.push(validation);
      this.log(`❌ ${scriptName} has issues: ${validation.issues.join(', ')}`, 'warn');
    }
    
    return validation;
  }

  /**
   * Categorize script by its purpose
   */
  categorizeScript(scriptName) {
    const categories = {
      'development': ['start', 'dev', 'serve'],
      'build': ['build', 'compile', 'bundle'],
      'test': ['test', 'spec', 'jest'],
      'lint': ['lint', 'eslint', 'format'],
      'deploy': ['deploy', 'publish', 'release'],
      'analysis': ['analyze', 'check', 'audit'],
      'cleanup': ['clean', 'reset', 'clear'],
      'migration': ['migrate', 'migration'],
      'android': ['android'],
      'ios': ['ios'],
      'web': ['web'],
      'utility': ['prepare', 'setup', 'install']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => scriptName.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Identify potentially unused scripts
   */
  identifyUnusedScripts() {
    this.log('Identifying potentially unused scripts...');
    
    // Only mark scripts as unused if they have real issues, not just because they're rarely used
    const scriptsToRemove = [
      'test:fallback', // Very specific test that's rarely needed
    ];
    
    // Scripts that reference moved debug files
    const debugReferences = ['debug-offline-mode', 'debug-product-creation', 'debug-requests-cleanup'];
    
    for (const [scriptName, scriptCommand] of Object.entries(this.results.originalScripts)) {
      let isUnused = false;
      let reason = '';
      
      // Only remove scripts that are truly problematic
      if (scriptsToRemove.includes(scriptName)) {
        isUnused = true;
        reason = 'Very specific test script that is rarely needed';
      }
      
      // Check if it references debug files
      for (const debugRef of debugReferences) {
        if (scriptCommand.includes(debugRef)) {
          isUnused = true;
          reason = `References moved debug file: ${debugRef}`;
          break;
        }
      }
      
      if (isUnused) {
        this.results.unusedScripts.push({
          name: scriptName,
          command: scriptCommand,
          reason: reason
        });
        this.log(`🗑️ ${scriptName} marked as unused: ${reason}`, 'warn');
      }
    }
  }

  /**
   * Get recommended scripts that should be present
   */
  getRecommendedScripts() {
    return {
      // Essential development scripts
      'typecheck': 'tsc --noEmit',
      'lint': 'expo lint',
      'lint:fix': 'expo lint --fix',
      
      // Analysis scripts (if tools are available)
      'analyze:deps': 'depcheck',
      'analyze:dead-code': 'knip',
      'analyze:unused-exports': 'ts-prune',
      'analyze:unimported': 'unimported',
      'analyze:all': 'pnpm run typecheck && pnpm run analyze:deps && pnpm run analyze:dead-code',
      
      // Cleanup scripts
      'cleanup:organize-debug': 'node scripts/debug-script-organizer.js',
      'cleanup:validate-scripts': 'node scripts/package-script-cleaner.js --dry-run',
      
      // Build and deploy
      'build:web': 'expo export --platform web',
      'deploy:web': 'pnpm run build:web && firebase deploy --only hosting',
      
      // Testing
      'test': 'jest --watchAll',
      'test:ci': 'jest --ci --coverage --watchAll=false'
    };
  }

  /**
   * Add missing recommended scripts
   */
  addRecommendedScripts(packageJson) {
    this.log('Checking for missing recommended scripts...');
    
    const recommended = this.getRecommendedScripts();
    const currentScripts = packageJson.scripts || {};
    
    for (const [scriptName, scriptCommand] of Object.entries(recommended)) {
      if (!currentScripts[scriptName]) {
        // Check if the required tools exist before adding analysis scripts
        if (scriptName.startsWith('analyze:')) {
          const tool = scriptCommand.split(' ')[0];
          if (!this.commandExists(tool) && tool !== 'pnpm') {
            this.log(`Skipping ${scriptName} - tool ${tool} not available`, 'warn');
            continue;
          }
        }
        
        currentScripts[scriptName] = scriptCommand;
        this.results.addedScripts.push({
          name: scriptName,
          command: scriptCommand
        });
        this.log(`➕ Added script: ${scriptName}`);
      }
    }
    
    packageJson.scripts = currentScripts;
  }

  /**
   * Update existing scripts with improvements
   */
  updateScripts(packageJson) {
    this.log('Checking for script improvements...');
    
    const scripts = packageJson.scripts || {};
    const improvements = {
      // Improve test script to not watch by default
      'test': 'jest',
      
      // Ensure consistent package manager usage
      'deploy': 'pnpm run build:web && firebase deploy',
      'deploy:android': 'pnpm run build:android:production && pnpm run submit:android',
      'deploy:web': 'pnpm run build:web && firebase deploy --only hosting',
      
      // Fix any npm references to use pnpm
      'build:android:preview': 'eas build --platform android --profile preview',
      'build:android:production': 'eas build --platform android --profile production'
    };
    
    for (const [scriptName, newCommand] of Object.entries(improvements)) {
      if (scripts[scriptName] && scripts[scriptName] !== newCommand) {
        const oldCommand = scripts[scriptName];
        scripts[scriptName] = newCommand;
        this.results.updatedScripts.push({
          name: scriptName,
          oldCommand: oldCommand,
          newCommand: newCommand
        });
        this.log(`🔄 Updated script: ${scriptName}`);
      }
    }
  }

  /**
   * Clean the package.json scripts
   */
  async clean() {
    this.log('Starting package.json script cleanup...');
    this.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
    
    try {
      // Load package.json
      const packageJson = this.loadPackageJson();
      
      // Validate all existing scripts
      for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts || {})) {
        this.validateScript(scriptName, scriptCommand);
      }
      
      // Identify unused scripts
      this.identifyUnusedScripts();
      
      // Only remove truly broken scripts and unused scripts
      // Don't remove scripts just because commands aren't globally available
      const scriptsToRemove = [
        ...this.results.brokenScripts.filter(s => 
          // Only remove if the file reference is broken, not if command isn't found
          s.issues.some(issue => issue.includes('Referenced file not found'))
        ).map(s => s.name),
        ...this.results.unusedScripts.map(s => s.name)
      ];
      
      for (const scriptName of scriptsToRemove) {
        if (packageJson.scripts[scriptName]) {
          delete packageJson.scripts[scriptName];
          this.log(`🗑️ Removed script: ${scriptName}`);
        }
      }
      
      // Add recommended scripts
      this.addRecommendedScripts(packageJson);
      
      // Update existing scripts
      this.updateScripts(packageJson);
      
      // Write updated package.json
      if (!this.dryRun) {
        const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
        fs.writeFileSync(this.packageJsonPath, updatedContent);
        this.log('✅ Updated package.json');
      } else {
        this.log('[DRY RUN] Would update package.json');
      }
      
      return this.generateReport();
      
    } catch (error) {
      this.results.errors.push(`Fatal error: ${error.message}`);
      this.log(`Fatal error: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    const report = {
      summary: {
        originalScriptCount: Object.keys(this.results.originalScripts).length,
        validScripts: this.results.validScripts.length,
        brokenScripts: this.results.brokenScripts.length,
        unusedScripts: this.results.unusedScripts.length,
        addedScripts: this.results.addedScripts.length,
        updatedScripts: this.results.updatedScripts.length,
        errors: this.results.errors.length
      },
      details: this.results
    };
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };
  
  if (args.includes('--help')) {
    console.log(`
Package.json Script Cleaner

Usage: node package-script-cleaner.js [options]

Options:
  --dry-run       Preview changes without executing them
  --verbose       Show detailed output
  --help          Show this help message

Examples:
  node package-script-cleaner.js --dry-run --verbose
  node package-script-cleaner.js
`);
    process.exit(0);
  }
  
  const cleaner = new PackageScriptCleaner(options);
  
  cleaner.clean()
    .then(report => {
      if (options.verbose || options.dryRun) {
        console.log('\n=== CLEANUP REPORT ===');
        console.log(JSON.stringify(report, null, 2));
      }
      
      console.log('\n=== SUMMARY ===');
      console.log(`📊 Original scripts: ${report.summary.originalScriptCount}`);
      console.log(`✅ Valid scripts: ${report.summary.validScripts}`);
      console.log(`❌ Broken scripts: ${report.summary.brokenScripts}`);
      console.log(`🗑️ Unused scripts: ${report.summary.unusedScripts}`);
      console.log(`➕ Added scripts: ${report.summary.addedScripts}`);
      console.log(`🔄 Updated scripts: ${report.summary.updatedScripts}`);
      console.log(`⚠️ Errors: ${report.summary.errors}`);
      
      process.exit(report.summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = PackageScriptCleaner;