#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Asset Reference Scanner
 * Scans TypeScript/JavaScript files for asset references and builds a list of referenced assets
 */

class AssetReferenceScanner {
  constructor() {
    this.referencedAssets = new Set();
    this.scannedFiles = [];
    this.errors = [];
    
    // Regex patterns to match different asset reference formats
    this.assetPatterns = [
      // require('@/assets/...') or require('../assets/...')
      /require\(['"`]([^'"`]*assets[^'"`]*\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2|mp3|mp4|webm|ico))['"`]\)/gi,
      
      // import ... from '@/assets/...' or import ... from '../assets/...'
      /import\s+[^'"`]*from\s+['"`]([^'"`]*assets[^'"`]*\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2|mp3|mp4|webm|ico))['"`]/gi,
      
      // Dynamic imports: import('assets/...')
      /import\(['"`]([^'"`]*assets[^'"`]*\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2|mp3|mp4|webm|ico))['"`]\)/gi,
      
      // Asset references in strings with ./ prefix (for config files)
      /['"`](\.\/assets[^'"`]*\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2|mp3|mp4|webm|ico))['"`]/gi,
      
      // Asset references in strings without ./ prefix (for scripts and arrays)
      /['"`](assets\/[^'"`]*\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2|mp3|mp4|webm|ico))['"`]/gi,
    ];
    
    // File extensions to scan
    this.scanExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'];
    
    // Directories to scan for asset references
    this.scanDirectories = ['app', 'components', 'hooks', 'context', 'services', 'schemas', 'scripts', 'docs'];
    
    // Additional files to scan
    this.additionalFiles = ['app.json', 'app.config.js', 'metro.config.js'];
  }

  /**
   * Main scanning function
   */
  async scanAssetReferences() {
    console.log('🔍 Scanning for asset references...\n');
    
    try {
      // Scan directories
      for (const dir of this.scanDirectories) {
        if (fs.existsSync(dir)) {
          await this.scanDirectory(dir);
        }
      }
      
      // Scan additional files
      for (const file of this.additionalFiles) {
        if (fs.existsSync(file)) {
          await this.scanFile(file);
        }
      }
      
      return this.generateReport();
      
    } catch (error) {
      this.errors.push(`Scanning error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recursively scan a directory for files
   */
  async scanDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', '.expo', 'dist', 'build'].includes(entry.name)) {
            await this.scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.scanExtensions.includes(ext)) {
            await this.scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error scanning directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Scan a single file for asset references
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.scannedFiles.push(filePath);
      
      // Apply all regex patterns to find asset references
      for (const pattern of this.assetPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const assetPath = match[1];
          const normalizedPath = this.normalizeAssetPath(assetPath);
          
          if (normalizedPath) {
            this.referencedAssets.add(normalizedPath);
            console.log(`📎 Found asset reference: ${normalizedPath} in ${filePath}`);
          }
        }
      }
      
    } catch (error) {
      this.errors.push(`Error scanning file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Normalize asset paths to a consistent format
   */
  normalizeAssetPath(assetPath) {
    // Remove leading ./ if present
    let normalized = assetPath.replace(/^\.\//, '');
    
    // Handle @/ alias (maps to root directory)
    normalized = normalized.replace(/^@\//, '');
    
    // Handle relative paths like ../assets/...
    if (normalized.includes('../assets/')) {
      const parts = normalized.split('/');
      const assetsIndex = parts.findIndex(part => part === 'assets');
      if (assetsIndex !== -1) {
        normalized = parts.slice(assetsIndex).join('/');
      }
    }
    
    // Only return paths that are actually in the assets directory
    if (normalized.startsWith('assets/')) {
      return normalized;
    }
    
    return null;
  }

  /**
   * Generate a comprehensive report of findings
   */
  generateReport() {
    const referencedAssetsArray = Array.from(this.referencedAssets).sort();
    
    const report = {
      summary: {
        totalFilesScanned: this.scannedFiles.length,
        totalAssetsReferenced: referencedAssetsArray.length,
        errorsEncountered: this.errors.length
      },
      referencedAssets: referencedAssetsArray,
      scannedFiles: this.scannedFiles.sort(),
      errors: this.errors
    };
    
    return report;
  }

  /**
   * Print a formatted report to console
   */
  printReport(report) {
    console.log('\n📊 Asset Reference Scan Report');
    console.log('================================\n');
    
    console.log(`📁 Files scanned: ${report.summary.totalFilesScanned}`);
    console.log(`🖼️  Assets referenced: ${report.summary.totalAssetsReferenced}`);
    console.log(`❌ Errors: ${report.summary.errorsEncountered}\n`);
    
    if (report.referencedAssets.length > 0) {
      console.log('📎 Referenced Assets:');
      report.referencedAssets.forEach(asset => {
        console.log(`  - ${asset}`);
      });
      console.log();
    }
    
    if (report.errors.length > 0) {
      console.log('❌ Errors encountered:');
      report.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
      console.log();
    }
  }

  /**
   * Save report to JSON file
   */
  saveReport(report, outputPath = 'asset-references-report.json') {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`💾 Report saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error saving report: ${error.message}`);
    }
  }
}

// CLI execution
if (require.main === module) {
  async function main() {
    const scanner = new AssetReferenceScanner();
    
    try {
      const report = await scanner.scanAssetReferences();
      scanner.printReport(report);
      scanner.saveReport(report);
      
      console.log('✅ Asset reference scanning completed successfully!');
      
    } catch (error) {
      console.error('❌ Asset reference scanning failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = AssetReferenceScanner;