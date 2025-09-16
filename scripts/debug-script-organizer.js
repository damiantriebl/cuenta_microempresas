#!/usr/bin/env node

/**
 * Debug Script Organizer
 * 
 * This script identifies debug-*.ts files and checks their usage throughout the codebase.
 * It can move unused debug scripts to tools/ directory or remove them entirely.
 * It also cleans up package.json scripts that reference moved/deleted files.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DebugScriptOrganizer {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.projectRoot = process.cwd();
    this.toolsDir = path.join(this.projectRoot, 'tools');
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    this.results = {
      debugFiles: [],
      unusedFiles: [],
      usedFiles: [],
      movedFiles: [],
      removedFiles: [],
      packageScriptsUpdated: [],
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
   * Manual file search - optimized for performance
   */
  manualFileSearch(pattern, excludeFileName) {
    const matchingFiles = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    const skipDirs = ['node_modules', '.git', '.expo', 'android', 'ios', 'dist', 'build', '.config-backups'];
    
    const searchInDirectory = (dir, depth = 0) => {
      // Limit recursion depth to prevent infinite loops
      if (depth > 10) return;
      
      try {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
          // Skip hidden files and directories at root level
          if (depth === 0 && item.startsWith('.') && !item.startsWith('.kiro')) continue;
          
          const fullPath = path.join(dir, item);
          let stat;
          
          try {
            stat = fs.statSync(fullPath);
          } catch (statError) {
            continue; // Skip files/dirs that can't be accessed
          }
          
          if (stat.isDirectory()) {
            // Skip common directories that won't contain imports
            if (skipDirs.includes(item)) continue;
            
            searchInDirectory(fullPath, depth + 1);
          } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
            // Skip the file we're checking usage for
            if (item === excludeFileName) continue;
            
            // Skip large files (> 1MB) to avoid performance issues
            if (stat.size > 1024 * 1024) continue;
            
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              
              // Check for import/require patterns more specifically
              const importPatterns = [
                `import.*${pattern}`,
                `from.*${pattern}`,
                `require.*${pattern}`,
                pattern // Direct usage
              ];
              
              const hasMatch = importPatterns.some(p => {
                const regex = new RegExp(p, 'i');
                return regex.test(content);
              });
              
              if (hasMatch) {
                matchingFiles.push(path.relative(this.projectRoot, fullPath));
              }
            } catch (readError) {
              // Skip files that can't be read
            }
          }
        }
      } catch (dirError) {
        // Skip directories that can't be read
      }
    };
    
    searchInDirectory(this.projectRoot);
    return matchingFiles;
  }

  /**
   * Find all debug-*.ts files in the project root
   */
  findDebugFiles() {
    this.log('Scanning for debug-*.ts files...');
    
    try {
      const files = fs.readdirSync(this.projectRoot);
      const debugFiles = files.filter(file => 
        file.startsWith('debug-') && file.endsWith('.ts')
      );
      
      this.results.debugFiles = debugFiles.map(file => ({
        name: file,
        path: path.join(this.projectRoot, file),
        size: fs.statSync(path.join(this.projectRoot, file)).size
      }));
      
      this.log(`Found ${debugFiles.length} debug files: ${debugFiles.join(', ')}`);
      return this.results.debugFiles;
    } catch (error) {
      this.results.errors.push(`Error scanning for debug files: ${error.message}`);
      this.log(`Error scanning for debug files: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Check if a debug file is used anywhere in the codebase
   */
  checkFileUsage(debugFile) {
    this.log(`Checking usage of ${debugFile.name}...`);
    
    try {
      const fileName = debugFile.name;
      const fileNameWithoutExt = fileName.replace('.ts', '');
      
      // Search patterns to check
      const searchPatterns = [
        fileNameWithoutExt,         // filename without extension (most common in imports)
        fileName,                   // exact filename
      ];
      
      let isUsed = false;
      const usageDetails = [];
      
      // Use manual file search - more reliable and faster for our use case
      for (const pattern of searchPatterns) {
        const matchingFiles = this.manualFileSearch(pattern, fileName);
        
        if (matchingFiles.length > 0) {
          isUsed = true;
          usageDetails.push({
            pattern,
            files: matchingFiles.slice(0, 5) // Limit to first 5 matches
          });
          break; // Found usage, no need to check other patterns
        }
      }
      
      if (isUsed) {
        this.results.usedFiles.push({
          ...debugFile,
          usage: usageDetails
        });
        this.log(`${debugFile.name} is USED in the codebase`);
      } else {
        this.results.unusedFiles.push(debugFile);
        this.log(`${debugFile.name} is UNUSED in the codebase`);
      }
      
      return { isUsed, usageDetails };
    } catch (error) {
      this.results.errors.push(`Error checking usage of ${debugFile.name}: ${error.message}`);
      this.log(`Error checking usage of ${debugFile.name}: ${error.message}`, 'error');
      return { isUsed: false, usageDetails: [] };
    }
  }

  /**
   * Create tools directory if it doesn't exist
   */
  ensureToolsDirectory() {
    if (!fs.existsSync(this.toolsDir)) {
      this.log(`Creating tools/ directory...`);
      if (!this.dryRun) {
        fs.mkdirSync(this.toolsDir, { recursive: true });
      }
    }
  }

  /**
   * Move unused debug file to tools directory
   */
  moveToTools(debugFile) {
    this.ensureToolsDirectory();
    
    const sourcePath = debugFile.path;
    const targetPath = path.join(this.toolsDir, debugFile.name);
    
    this.log(`Moving ${debugFile.name} to tools/ directory...`);
    
    if (!this.dryRun) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        fs.unlinkSync(sourcePath);
        this.results.movedFiles.push({
          from: sourcePath,
          to: targetPath,
          file: debugFile
        });
        this.log(`Successfully moved ${debugFile.name} to tools/`);
      } catch (error) {
        this.results.errors.push(`Error moving ${debugFile.name}: ${error.message}`);
        this.log(`Error moving ${debugFile.name}: ${error.message}`, 'error');
      }
    } else {
      this.log(`[DRY RUN] Would move ${debugFile.name} to tools/`);
      this.results.movedFiles.push({
        from: sourcePath,
        to: targetPath,
        file: debugFile
      });
    }
  }

  /**
   * Remove unused debug file entirely
   */
  removeFile(debugFile) {
    this.log(`Removing ${debugFile.name}...`);
    
    if (!this.dryRun) {
      try {
        fs.unlinkSync(debugFile.path);
        this.results.removedFiles.push(debugFile);
        this.log(`Successfully removed ${debugFile.name}`);
      } catch (error) {
        this.results.errors.push(`Error removing ${debugFile.name}: ${error.message}`);
        this.log(`Error removing ${debugFile.name}: ${error.message}`, 'error');
      }
    } else {
      this.log(`[DRY RUN] Would remove ${debugFile.name}`);
      this.results.removedFiles.push(debugFile);
    }
  }

  /**
   * Clean up package.json scripts that reference moved/deleted files
   */
  cleanupPackageScripts() {
    this.log('Checking package.json scripts for references to debug files...');
    
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        this.log('package.json not found', 'warn');
        return;
      }
      
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const originalScripts = { ...packageJson.scripts };
      let scriptsModified = false;
      
      // Get list of all moved/removed files
      const processedFiles = [
        ...this.results.movedFiles.map(m => m.file.name),
        ...this.results.removedFiles.map(r => r.name)
      ];
      
      if (processedFiles.length === 0) {
        this.log('No debug files were moved or removed, skipping package.json cleanup');
        return;
      }
      
      // Check each script for references to processed files
      for (const [scriptName, scriptCommand] of Object.entries(packageJson.scripts || {})) {
        let updatedCommand = scriptCommand;
        let commandModified = false;
        
        for (const fileName of processedFiles) {
          const fileNameWithoutExt = fileName.replace('.ts', '');
          
          // Check if script references the file
          if (scriptCommand.includes(fileName) || scriptCommand.includes(fileNameWithoutExt)) {
            this.log(`Script "${scriptName}" references ${fileName}`, 'warn');
            
            // For moved files, update the path to tools/
            const movedFile = this.results.movedFiles.find(m => m.file.name === fileName);
            if (movedFile) {
              updatedCommand = updatedCommand
                .replace(new RegExp(fileName, 'g'), `tools/${fileName}`)
                .replace(new RegExp(fileNameWithoutExt, 'g'), `tools/${fileNameWithoutExt}`);
              commandModified = true;
              this.log(`Updated script "${scriptName}" to reference tools/${fileName}`);
            }
            
            // For removed files, we'll flag the script but not auto-remove it
            // as it might need manual review
            const removedFile = this.results.removedFiles.find(r => r.name === fileName);
            if (removedFile) {
              this.log(`Script "${scriptName}" references removed file ${fileName} - manual review needed`, 'warn');
              this.results.packageScriptsUpdated.push({
                script: scriptName,
                action: 'needs_manual_review',
                reason: `References removed file ${fileName}`,
                originalCommand: scriptCommand
              });
            }
          }
        }
        
        if (commandModified) {
          packageJson.scripts[scriptName] = updatedCommand;
          scriptsModified = true;
          this.results.packageScriptsUpdated.push({
            script: scriptName,
            action: 'updated',
            originalCommand: scriptCommand,
            newCommand: updatedCommand
          });
        }
      }
      
      // Write updated package.json
      if (scriptsModified && !this.dryRun) {
        fs.writeFileSync(
          this.packageJsonPath, 
          JSON.stringify(packageJson, null, 2) + '\n'
        );
        this.log('Updated package.json scripts');
      } else if (scriptsModified) {
        this.log('[DRY RUN] Would update package.json scripts');
      } else {
        this.log('No package.json script updates needed');
      }
      
    } catch (error) {
      this.results.errors.push(`Error cleaning up package.json scripts: ${error.message}`);
      this.log(`Error cleaning up package.json scripts: ${error.message}`, 'error');
    }
  }

  /**
   * Generate a summary report
   */
  generateReport() {
    const report = {
      summary: {
        totalDebugFiles: this.results.debugFiles.length,
        usedFiles: this.results.usedFiles.length,
        unusedFiles: this.results.unusedFiles.length,
        movedFiles: this.results.movedFiles.length,
        removedFiles: this.results.removedFiles.length,
        packageScriptsUpdated: this.results.packageScriptsUpdated.length,
        errors: this.results.errors.length
      },
      details: this.results
    };
    
    return report;
  }

  /**
   * Main execution method
   */
  async organize(options = {}) {
    const { moveToTools = true, removeUnused = false } = options;
    
    this.log('Starting debug script organization...');
    this.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
    
    // Step 1: Find all debug files
    const debugFiles = this.findDebugFiles();
    
    if (debugFiles.length === 0) {
      this.log('No debug files found');
      return this.generateReport();
    }
    
    // Step 2: Check usage for each file
    for (const debugFile of debugFiles) {
      this.checkFileUsage(debugFile);
    }
    
    // Step 3: Process unused files
    for (const unusedFile of this.results.unusedFiles) {
      if (removeUnused) {
        this.removeFile(unusedFile);
      } else if (moveToTools) {
        this.moveToTools(unusedFile);
      }
    }
    
    // Step 4: Clean up package.json scripts
    this.cleanupPackageScripts();
    
    // Step 5: Generate report
    const report = this.generateReport();
    
    this.log('Debug script organization completed');
    this.log(`Summary: ${report.summary.unusedFiles} unused files, ${report.summary.movedFiles} moved, ${report.summary.removedFiles} removed`);
    
    if (report.summary.errors > 0) {
      this.log(`${report.summary.errors} errors occurred during processing`, 'error');
    }
    
    return report;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    moveToTools: !args.includes('--no-move'),
    removeUnused: args.includes('--remove')
  };
  
  if (args.includes('--help')) {
    console.log(`
Debug Script Organizer

Usage: node debug-script-organizer.js [options]

Options:
  --dry-run       Preview changes without executing them
  --verbose       Show detailed output
  --no-move       Don't move unused files to tools/ directory
  --remove        Remove unused files instead of moving them
  --help          Show this help message

Examples:
  node debug-script-organizer.js --dry-run --verbose
  node debug-script-organizer.js --remove
  node debug-script-organizer.js
`);
    process.exit(0);
  }
  
  const organizer = new DebugScriptOrganizer(options);
  
  organizer.organize(options)
    .then(report => {
      if (options.verbose || options.dryRun) {
        console.log('\n=== DETAILED REPORT ===');
        console.log(JSON.stringify(report, null, 2));
      }
      
      process.exit(report.summary.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = DebugScriptOrganizer;