#!/usr/bin/env node

/**
 * Dead Code Detection Script
 * Runs knip, ts-prune, and unimported tools to identify dead code
 * Consolidates results and detects dynamic require() and import() statements
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeadCodeDetector {
  constructor() {
    this.projectRoot = process.cwd();
    this.dynamicReferences = new Set();
  }

  /**
   * Run knip to find unused files and exports
   */
  async runKnip() {
    console.log('🔍 Running knip analysis...');
    
    try {
      const result = execSync('pnpm knip --reporter json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const knipResult = JSON.parse(result);
      
      return {
        unusedFiles: knipResult.files || [],
        unusedDependencies: knipResult.dependencies || [],
        unusedDevDependencies: knipResult.devDependencies || [],
        unusedExports: knipResult.exports || [],
        duplicateExports: knipResult.duplicates || [],
        unresolved: knipResult.unresolved || []
      };
    } catch (error) {
      console.warn('⚠️  Knip analysis failed, continuing with empty results');
      console.warn('Error:', error.message);
      return {
        unusedFiles: [],
        unusedDependencies: [],
        unusedDevDependencies: [],
        unusedExports: [],
        duplicateExports: [],
        unresolved: []
      };
    }
  }

  /**
   * Run ts-prune to find unused TypeScript exports
   */
  async runTsPrune() {
    console.log('🔍 Running ts-prune analysis...');
    
    try {
      const result = execSync('pnpm ts-prune --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      // ts-prune outputs line-by-line results, parse them
      const lines = result.trim().split('\n').filter(line => line.trim());
      const unusedExports = [];
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          unusedExports.push(parsed);
        } catch (e) {
          // If not JSON, try to parse the default format
          if (line.includes(' - ')) {
            const [file, exportName] = line.split(' - ');
            unusedExports.push({
              file: file.trim(),
              export: exportName.trim()
            });
          }
        }
      }
      
      return {
        unusedExports
      };
    } catch (error) {
      console.warn('⚠️  ts-prune analysis failed, continuing with empty results');
      console.warn('Error:', error.message);
      return {
        unusedExports: []
      };
    }
  }

  /**
   * Run unimported to find unimported modules
   */
  async runUnimported() {
    console.log('🔍 Running unimported analysis...');
    
    try {
      const result = execSync('pnpm unimported --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const unimportedResult = JSON.parse(result);
      
      return {
        unimported: unimportedResult.unimported || [],
        unresolved: unimportedResult.unresolved || []
      };
    } catch (error) {
      console.warn('⚠️  unimported analysis failed, continuing with empty results');
      console.warn('Error:', error.message);
      return {
        unimported: [],
        unresolved: []
      };
    }
  }

  /**
   * Detect dynamic require() and import() statements
   */
  async detectDynamicReferences() {
    console.log('🔍 Detecting dynamic require() and import() statements...');
    
    const dynamicPatterns = [
      // Dynamic imports
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*([^)]+)\s*\)/g,
      
      // Dynamic requires
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /require\s*\(\s*([^)]+)\s*\)/g,
      
      // Template literals in imports/requires
      /import\s*\(\s*`([^`]+)`\s*\)/g,
      /require\s*\(\s*`([^`]+)`\s*\)/g,
      
      // Variable-based imports/requires
      /require\s*\(\s*\w+\s*\)/g,
      /import\s*\(\s*\w+\s*\)/g
    ];

    const filesToScan = this.getFilesToScan();
    const dynamicReferences = [];
    
    for (const filePath of filesToScan) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(this.projectRoot, filePath);
        
        for (const pattern of dynamicPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            const reference = match[1] || match[0];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            dynamicReferences.push({
              file: relativePath,
              line: lineNumber,
              reference: reference.trim(),
              fullMatch: match[0],
              type: match[0].includes('import') ? 'dynamic-import' : 'dynamic-require'
            });
            
            // Add to set for quick lookup
            this.dynamicReferences.add(reference.trim());
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not scan file ${filePath}:`, error.message);
      }
    }

    return dynamicReferences;
  }

  /**
   * Get list of files to scan
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
   * Consolidate results from all tools
   */
  consolidateResults(knipResult, tsPruneResult, unimportedResult, dynamicReferences) {
    const consolidated = {
      files: {
        unused: knipResult.unusedFiles || [],
        unimported: unimportedResult.unimported || []
      },
      exports: {
        unused: [
          ...(knipResult.unusedExports || []),
          ...(tsPruneResult.unusedExports || [])
        ],
        duplicates: knipResult.duplicateExports || []
      },
      dependencies: {
        unused: knipResult.unusedDependencies || [],
        unusedDev: knipResult.unusedDevDependencies || []
      },
      dynamic: {
        references: dynamicReferences,
        count: dynamicReferences.length
      },
      unresolved: [
        ...(knipResult.unresolved || []),
        ...(unimportedResult.unresolved || [])
      ]
    };

    return consolidated;
  }

  /**
   * Filter results to exclude dynamically referenced code
   */
  filterSafeToRemove(consolidated) {
    const safeToRemove = {
      files: [],
      exports: [],
      dependencies: []
    };

    const shouldKeep = {
      files: [],
      exports: [],
      dependencies: []
    };

    // Check files
    for (const file of consolidated.files.unused) {
      const isDynamicallyReferenced = consolidated.dynamic.references.some(ref => 
        ref.reference.includes(file) || file.includes(ref.reference)
      );

      if (isDynamicallyReferenced) {
        shouldKeep.files.push(file);
      } else {
        safeToRemove.files.push(file);
      }
    }

    // Check exports (more complex as they might be referenced by path)
    for (const exportItem of consolidated.exports.unused) {
      const exportPath = typeof exportItem === 'string' ? exportItem : exportItem.file;
      const isDynamicallyReferenced = consolidated.dynamic.references.some(ref => 
        ref.reference.includes(exportPath) || exportPath.includes(ref.reference)
      );

      if (isDynamicallyReferenced) {
        shouldKeep.exports.push(exportItem);
      } else {
        safeToRemove.exports.push(exportItem);
      }
    }

    // Dependencies are handled by the dependency scanner
    safeToRemove.dependencies = consolidated.dependencies.unused;

    return { safeToRemove, shouldKeep };
  }

  /**
   * Generate comprehensive dead code analysis report
   */
  async generateReport() {
    console.log('📊 Generating dead code analysis report...\n');

    // Run all analysis tools
    const knipResult = await this.runKnip();
    const tsPruneResult = await this.runTsPrune();
    const unimportedResult = await this.runUnimported();
    const dynamicReferences = await this.detectDynamicReferences();

    // Consolidate results
    const consolidated = this.consolidateResults(
      knipResult, 
      tsPruneResult, 
      unimportedResult, 
      dynamicReferences
    );

    // Filter safe to remove vs should keep
    const filtered = this.filterSafeToRemove(consolidated);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUnusedFiles: consolidated.files.unused.length,
        totalUnusedExports: consolidated.exports.unused.length,
        totalDynamicReferences: dynamicReferences.length,
        safeToRemoveFiles: filtered.safeToRemove.files.length,
        safeToRemoveExports: filtered.safeToRemove.exports.length
      },
      consolidated,
      filtered,
      tools: {
        knip: knipResult,
        tsPrune: tsPruneResult,
        unimported: unimportedResult
      }
    };

    // Print summary
    console.log('📋 DEAD CODE ANALYSIS REPORT');
    console.log('==============================');
    console.log(`📅 Generated: ${report.timestamp}`);
    console.log(`📁 Total unused files: ${report.summary.totalUnusedFiles}`);
    console.log(`📤 Total unused exports: ${report.summary.totalUnusedExports}`);
    console.log(`🔗 Dynamic references found: ${report.summary.totalDynamicReferences}`);
    console.log(`✅ Safe to remove files: ${report.summary.safeToRemoveFiles}`);
    console.log(`✅ Safe to remove exports: ${report.summary.safeToRemoveExports}`);

    if (filtered.safeToRemove.files.length > 0) {
      console.log('\n✅ FILES SAFE TO REMOVE:');
      filtered.safeToRemove.files.forEach(file => console.log(`  - ${file}`));
    }

    if (filtered.shouldKeep.files.length > 0) {
      console.log('\n⚠️  FILES TO KEEP (Dynamic references):');
      filtered.shouldKeep.files.forEach(file => console.log(`  - ${file}`));
    }

    if (dynamicReferences.length > 0) {
      console.log('\n🔗 DYNAMIC REFERENCES DETECTED:');
      dynamicReferences.forEach(ref => {
        console.log(`  - ${ref.file}:${ref.line} - ${ref.type}: ${ref.reference}`);
      });
    }

    return report;
  }
}

// CLI interface
async function main() {
  const detector = new DeadCodeDetector();
  
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'knip':
        const knipResult = await detector.runKnip();
        console.log(JSON.stringify(knipResult, null, 2));
        break;
      
      case 'ts-prune':
        const tsPruneResult = await detector.runTsPrune();
        console.log(JSON.stringify(tsPruneResult, null, 2));
        break;
      
      case 'unimported':
        const unimportedResult = await detector.runUnimported();
        console.log(JSON.stringify(unimportedResult, null, 2));
        break;
      
      case 'dynamic':
        const dynamicRefs = await detector.detectDynamicReferences();
        console.log(JSON.stringify(dynamicRefs, null, 2));
        break;
      
      case 'report':
      default:
        await detector.generateReport();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = DeadCodeDetector;

// Run if called directly
if (require.main === module) {
  main();
}