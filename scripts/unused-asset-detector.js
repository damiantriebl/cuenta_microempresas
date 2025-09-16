#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const AssetReferenceScanner = require('./asset-reference-scanner');

/**
 * Unused Asset Detector
 * Compares all assets in the assets/ directory with referenced assets to find unused ones
 */

class UnusedAssetDetector {
  constructor() {
    this.allAssets = [];
    this.referencedAssets = new Set();
    this.unusedAssets = [];
    this.errors = [];
    this.assetSizes = new Map();
    
    // Assets directory to scan
    this.assetsDirectory = 'assets';
    
    // Asset file extensions to consider
    this.assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ttf', '.otf', '.woff', '.woff2', '.mp3', '.mp4', '.webm', '.ico'];
  }

  /**
   * Main detection function
   */
  async detectUnusedAssets() {
    console.log('🔍 Detecting unused assets...\n');
    
    try {
      // Step 1: Scan for all assets in the assets directory
      await this.scanAllAssets();
      
      // Step 2: Get referenced assets using the asset reference scanner
      await this.getReferencedAssets();
      
      // Step 3: Compare and find unused assets
      this.findUnusedAssets();
      
      // Step 4: Calculate file sizes for unused assets
      await this.calculateAssetSizes();
      
      return this.generateReport();
      
    } catch (error) {
      this.errors.push(`Detection error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recursively scan the assets directory for all asset files
   */
  async scanAllAssets() {
    if (!fs.existsSync(this.assetsDirectory)) {
      throw new Error(`Assets directory '${this.assetsDirectory}' does not exist`);
    }
    
    console.log(`📁 Scanning assets directory: ${this.assetsDirectory}`);
    await this.scanAssetsDirectory(this.assetsDirectory);
    console.log(`📊 Found ${this.allAssets.length} total assets\n`);
  }

  /**
   * Recursively scan a directory for asset files
   */
  async scanAssetsDirectory(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanAssetsDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.assetExtensions.includes(ext)) {
            // Store relative path from project root
            const relativePath = fullPath.replace(/\\/g, '/');
            this.allAssets.push(relativePath);
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error scanning assets directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Get referenced assets using the AssetReferenceScanner
   */
  async getReferencedAssets() {
    console.log('🔗 Getting referenced assets...');
    
    try {
      const scanner = new AssetReferenceScanner();
      const scanReport = await scanner.scanAssetReferences();
      
      // Add all referenced assets to our set
      scanReport.referencedAssets.forEach(asset => {
        this.referencedAssets.add(asset);
      });
      
      console.log(`📎 Found ${this.referencedAssets.size} referenced assets\n`);
      
    } catch (error) {
      this.errors.push(`Error getting referenced assets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare all assets with referenced assets to find unused ones
   */
  findUnusedAssets() {
    console.log('🔍 Comparing assets to find unused ones...');
    
    this.unusedAssets = this.allAssets.filter(asset => {
      return !this.referencedAssets.has(asset);
    });
    
    console.log(`🗑️  Found ${this.unusedAssets.length} unused assets\n`);
    
    if (this.unusedAssets.length > 0) {
      console.log('📋 Unused assets:');
      this.unusedAssets.forEach(asset => {
        console.log(`  - ${asset}`);
      });
      console.log();
    }
  }

  /**
   * Calculate file sizes for all unused assets
   */
  async calculateAssetSizes() {
    console.log('📏 Calculating file sizes...');
    
    let totalSize = 0;
    
    for (const asset of this.unusedAssets) {
      try {
        const stats = fs.statSync(asset);
        const sizeInBytes = stats.size;
        this.assetSizes.set(asset, sizeInBytes);
        totalSize += sizeInBytes;
      } catch (error) {
        this.errors.push(`Error getting size for ${asset}: ${error.message}`);
        this.assetSizes.set(asset, 0);
      }
    }
    
    console.log(`💾 Total size of unused assets: ${this.formatFileSize(totalSize)}\n`);
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate a comprehensive report of findings
   */
  generateReport() {
    const totalUnusedSize = Array.from(this.assetSizes.values()).reduce((sum, size) => sum + size, 0);
    
    const unusedAssetsWithSizes = this.unusedAssets.map(asset => ({
      path: asset,
      size: this.assetSizes.get(asset) || 0,
      formattedSize: this.formatFileSize(this.assetSizes.get(asset) || 0)
    })).sort((a, b) => b.size - a.size); // Sort by size descending
    
    const report = {
      summary: {
        totalAssets: this.allAssets.length,
        referencedAssets: this.referencedAssets.size,
        unusedAssets: this.unusedAssets.length,
        totalUnusedSize: totalUnusedSize,
        formattedTotalUnusedSize: this.formatFileSize(totalUnusedSize),
        errorsEncountered: this.errors.length
      },
      allAssets: this.allAssets.sort(),
      referencedAssets: Array.from(this.referencedAssets).sort(),
      unusedAssets: unusedAssetsWithSizes,
      errors: this.errors
    };
    
    return report;
  }

  /**
   * Print a formatted report to console
   */
  printReport(report) {
    console.log('\n📊 Unused Asset Detection Report');
    console.log('=================================\n');
    
    console.log(`📁 Total assets found: ${report.summary.totalAssets}`);
    console.log(`📎 Referenced assets: ${report.summary.referencedAssets}`);
    console.log(`🗑️  Unused assets: ${report.summary.unusedAssets}`);
    console.log(`💾 Total unused size: ${report.summary.formattedTotalUnusedSize}`);
    console.log(`❌ Errors: ${report.summary.errorsEncountered}\n`);
    
    if (report.unusedAssets.length > 0) {
      console.log('🗑️  Unused Assets (sorted by size):');
      report.unusedAssets.forEach(asset => {
        console.log(`  - ${asset.path} (${asset.formattedSize})`);
      });
      console.log();
    }
    
    if (report.summary.unusedAssets > 0) {
      console.log('💡 Recommendations:');
      console.log('  - Review unused assets before deletion');
      console.log('  - Check if assets are used in native code or configuration');
      console.log('  - Consider keeping assets that might be used dynamically');
      console.log(`  - Removing unused assets could save ${report.summary.formattedTotalUnusedSize} of space\n`);
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
  saveReport(report, outputPath = 'unused-assets-report.json') {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`💾 Report saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error saving report: ${error.message}`);
    }
  }

  /**
   * Remove unused assets (with confirmation)
   */
  async removeUnusedAssets(report, dryRun = true) {
    if (report.unusedAssets.length === 0) {
      console.log('✅ No unused assets to remove!');
      return;
    }
    
    console.log(`\n🗑️  ${dryRun ? 'DRY RUN: Would remove' : 'Removing'} ${report.unusedAssets.length} unused assets...\n`);
    
    let removedCount = 0;
    let removedSize = 0;
    
    for (const asset of report.unusedAssets) {
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would remove: ${asset.path} (${asset.formattedSize})`);
        } else {
          fs.unlinkSync(asset.path);
          console.log(`  ✅ Removed: ${asset.path} (${asset.formattedSize})`);
        }
        removedCount++;
        removedSize += asset.size;
      } catch (error) {
        console.log(`  ❌ Error removing ${asset.path}: ${error.message}`);
        this.errors.push(`Error removing ${asset.path}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 ${dryRun ? 'Would remove' : 'Removed'} ${removedCount} assets`);
    console.log(`💾 ${dryRun ? 'Would save' : 'Saved'} ${this.formatFileSize(removedSize)} of space`);
  }
}

// CLI execution
if (require.main === module) {
  async function main() {
    const detector = new UnusedAssetDetector();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const dryRun = !args.includes('--remove');
    
    try {
      const report = await detector.detectUnusedAssets();
      detector.printReport(report);
      detector.saveReport(report);
      
      // Optionally remove unused assets
      if (args.includes('--remove') || args.includes('--dry-run')) {
        await detector.removeUnusedAssets(report, dryRun);
      }
      
      console.log('\n✅ Unused asset detection completed successfully!');
      
      if (dryRun && report.summary.unusedAssets > 0) {
        console.log('\n💡 To actually remove unused assets, run with --remove flag');
        console.log('   To see what would be removed, run with --dry-run flag');
      }
      
    } catch (error) {
      console.error('❌ Unused asset detection failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = UnusedAssetDetector;