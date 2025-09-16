#!/usr/bin/env node

/**
 * Dependency Scanner Script
 * Analyzes project dependencies to identify unused and missing dependencies
 * Includes validation for dynamic imports before suggesting removals
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DependencyScanner {
  constructor() {
    this.projectRoot = process.cwd();
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.dynamicImports = new Set();
  }

  /**
   * Run depcheck and parse unused dependencies
   */
  async scanUnusedDependencies() {
    console.log('🔍 Scanning for unused dependencies...');
    
    try {
      // Run depcheck with JSON output
      const depcheckResult = execSync('pnpm depcheck --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot,
        stdio: 'pipe' // Capture both stdout and stderr
      });
      
      const result = JSON.parse(depcheckResult);
      
      return {
        unused: result.dependencies || [],
        unusedDevDependencies: result.devDependencies || [],
        invalidFiles: result.invalidFiles || {},
        invalidDirs: result.invalidDirs || {}
      };
    } catch (error) {
      // depcheck returns non-zero exit code when it finds issues, but still outputs JSON
      if (error.stdout) {
        try {
          const result = JSON.parse(error.stdout);
          return {
            unused: result.dependencies || [],
            unusedDevDependencies: result.devDependencies || [],
            invalidFiles: result.invalidFiles || {},
            invalidDirs: result.invalidDirs || {}
          };
        } catch (parseError) {
          console.error('❌ Error parsing depcheck output:', parseError.message);
        }
      }
      console.error('❌ Error running depcheck:', error.message);
      return {
        unused: [],
        unusedDevDependencies: [],
        invalidFiles: {},
        invalidDirs: {}
      };
    }
  }

  /**
   * Identify missing dependencies
   */
  async scanMissingDependencies() {
    console.log('🔍 Scanning for missing dependencies...');
    
    try {
      // Run depcheck to find missing dependencies
      const depcheckResult = execSync('pnpm depcheck --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot,
        stdio: 'pipe'
      });
      
      const result = JSON.parse(depcheckResult);
      
      return {
        missing: result.missing || {}
      };
    } catch (error) {
      // depcheck returns non-zero exit code when it finds issues, but still outputs JSON
      if (error.stdout) {
        try {
          const result = JSON.parse(error.stdout);
          return {
            missing: result.missing || {}
          };
        } catch (parseError) {
          console.error('❌ Error parsing depcheck output:', parseError.message);
        }
      }
      console.error('❌ Error scanning missing dependencies:', error.message);
      return {
        missing: {}
      };
    }
  }

  /**
   * Scan for dynamic imports and requires to avoid removing dependencies that are dynamically loaded
   */
  async scanDynamicImports() {
    console.log('🔍 Scanning for dynamic imports...');
    
    const dynamicImportPatterns = [
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /require\s*\(\s*([^)]+)\s*\)/g, // Variable requires
      /import\s*\(\s*([^)]+)\s*\)/g   // Variable imports
    ];

    const filesToScan = this.getFilesToScan();
    
    for (const filePath of filesToScan) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of dynamicImportPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1];
            
            // Extract package name from import path
            if (importPath && typeof importPath === 'string') {
              const packageName = this.extractPackageName(importPath);
              if (packageName) {
                this.dynamicImports.add(packageName);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not read file ${filePath}:`, error.message);
      }
    }

    return Array.from(this.dynamicImports);
  }

  /**
   * Get list of files to scan for dynamic imports
   */
  getFilesToScan() {
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    const directories = ['app', 'components', 'services', 'hooks', 'context', 'schemas', 'scripts'];
    const files = [];

    for (const dir of directories) {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        files.push(...this.getFilesRecursively(dirPath, extensions));
      }
    }

    // Also scan root level files
    const rootFiles = fs.readdirSync(this.projectRoot)
      .filter(file => extensions.some(ext => file.endsWith(ext)))
      .map(file => path.join(this.projectRoot, file));
    
    files.push(...rootFiles);

    return files;
  }

  /**
   * Recursively get files with specific extensions
   */
  getFilesRecursively(dir, extensions) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...this.getFilesRecursively(fullPath, extensions));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory ${dir}:`, error.message);
    }

    return files;
  }

  /**
   * Extract package name from import path
   */
  extractPackageName(importPath) {
    // Remove relative path indicators
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return null;
    }

    // Handle scoped packages (@scope/package)
    if (importPath.startsWith('@')) {
      const parts = importPath.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
    }

    // Handle regular packages
    const parts = importPath.split('/');
    return parts[0];
  }

  /**
   * Validate dependencies before removal by checking dynamic imports
   */
  async validateBeforeRemoval(dependenciesToRemove) {
    console.log('🔍 Validating dependencies before removal...');
    
    const dynamicImports = await this.scanDynamicImports();
    const safeToRemove = [];
    const shouldKeep = [];

    for (const dep of dependenciesToRemove) {
      if (dynamicImports.includes(dep)) {
        shouldKeep.push(dep);
        console.log(`⚠️  Keeping ${dep} - found in dynamic imports`);
      } else {
        safeToRemove.push(dep);
      }
    }

    return {
      safeToRemove,
      shouldKeep,
      dynamicImports
    };
  }

  /**
   * Generate comprehensive dependency report
   */
  async generateReport() {
    console.log('📊 Generating dependency analysis report...\n');

    const unused = await this.scanUnusedDependencies();
    const missing = await this.scanMissingDependencies();
    const dynamicImports = await this.scanDynamicImports();

    // Validate unused dependencies
    const allUnused = [...unused.unused, ...unused.unusedDevDependencies];
    const validation = await this.validateBeforeRemoval(allUnused);

    const report = {
      timestamp: new Date().toISOString(),
      unused: {
        dependencies: unused.unused,
        devDependencies: unused.unusedDevDependencies,
        total: allUnused.length
      },
      missing: missing.missing,
      dynamicImports,
      validation: {
        safeToRemove: validation.safeToRemove,
        shouldKeep: validation.shouldKeep
      },
      invalidFiles: unused.invalidFiles,
      invalidDirs: unused.invalidDirs
    };

    // Print summary
    console.log('📋 DEPENDENCY ANALYSIS REPORT');
    console.log('================================');
    console.log(`📅 Generated: ${report.timestamp}`);
    console.log(`📦 Total unused dependencies: ${report.unused.total}`);
    console.log(`🔒 Dependencies with dynamic imports: ${validation.shouldKeep.length}`);
    console.log(`✅ Safe to remove: ${validation.safeToRemove.length}`);
    console.log(`❓ Missing dependencies: ${Object.keys(missing.missing).length}`);

    if (validation.safeToRemove.length > 0) {
      console.log('\n✅ SAFE TO REMOVE:');
      validation.safeToRemove.forEach(dep => console.log(`  - ${dep}`));
    }

    if (validation.shouldKeep.length > 0) {
      console.log('\n⚠️  KEEP (Dynamic imports detected):');
      validation.shouldKeep.forEach(dep => console.log(`  - ${dep}`));
    }

    if (Object.keys(missing.missing).length > 0) {
      console.log('\n❓ MISSING DEPENDENCIES:');
      Object.entries(missing.missing).forEach(([dep, files]) => {
        console.log(`  - ${dep} (used in: ${files.join(', ')})`);
      });
    }

    return report;
  }
}

// CLI interface
async function main() {
  const scanner = new DependencyScanner();
  
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'unused':
        const unused = await scanner.scanUnusedDependencies();
        console.log(JSON.stringify(unused, null, 2));
        break;
      
      case 'missing':
        const missing = await scanner.scanMissingDependencies();
        console.log(JSON.stringify(missing, null, 2));
        break;
      
      case 'dynamic':
        const dynamicImports = await scanner.scanDynamicImports();
        console.log(JSON.stringify(dynamicImports, null, 2));
        break;
      
      case 'validate':
        const depsToCheck = args.slice(1);
        if (depsToCheck.length === 0) {
          console.error('❌ Please provide dependencies to validate');
          process.exit(1);
        }
        const validation = await scanner.validateBeforeRemoval(depsToCheck);
        console.log(JSON.stringify(validation, null, 2));
        break;
      
      case 'report':
      default:
        await scanner.generateReport();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = DependencyScanner;

// Run if called directly
if (require.main === module) {
  main();
}