#!/usr/bin/env node

const AssetReferenceScanner = require('./asset-reference-scanner');
const UnusedAssetDetector = require('./unused-asset-detector');

/**
 * Asset Manager
 * Combined tool for asset reference scanning and unused asset detection
 */

class AssetManager {
  constructor() {
    this.scanner = new AssetReferenceScanner();
    this.detector = new UnusedAssetDetector();
  }

  /**
   * Run complete asset management analysis
   */
  async runCompleteAnalysis() {
    console.log('🎯 Running complete asset management analysis...\n');
    
    try {
      // Step 1: Scan for asset references
      console.log('📋 Step 1: Scanning asset references');
      const referenceReport = await this.scanner.scanAssetReferences();
      
      // Step 2: Detect unused assets
      console.log('\n📋 Step 2: Detecting unused assets');
      const unusedReport = await this.detector.detectUnusedAssets();
      
      // Step 3: Generate combined report
      const combinedReport = this.generateCombinedReport(referenceReport, unusedReport);
      
      return combinedReport;
      
    } catch (error) {
      console.error('❌ Asset management analysis failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate a combined report from both analyses
   */
  generateCombinedReport(referenceReport, unusedReport) {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalAssets: unusedReport.summary.totalAssets,
        referencedAssets: unusedReport.summary.referencedAssets,
        unusedAssets: unusedReport.summary.unusedAssets,
        totalUnusedSize: unusedReport.summary.totalUnusedSize,
        formattedTotalUnusedSize: unusedReport.summary.formattedTotalUnusedSize,
        filesScanned: referenceReport.summary.totalFilesScanned,
        totalErrors: referenceReport.summary.errorsEncountered + unusedReport.summary.errorsEncountered
      },
      assetAnalysis: {
        allAssets: unusedReport.allAssets,
        referencedAssets: unusedReport.referencedAssets,
        unusedAssets: unusedReport.unusedAssets
      },
      scanDetails: {
        scannedFiles: referenceReport.scannedFiles,
        errors: [...referenceReport.errors, ...unusedReport.errors]
      }
    };
  }

  /**
   * Print combined report
   */
  printCombinedReport(report) {
    console.log('\n🎯 Complete Asset Management Report');
    console.log('===================================\n');
    
    console.log(`📊 Analysis Summary:`);
    console.log(`  📁 Total assets: ${report.summary.totalAssets}`);
    console.log(`  📎 Referenced assets: ${report.summary.referencedAssets}`);
    console.log(`  🗑️  Unused assets: ${report.summary.unusedAssets}`);
    console.log(`  💾 Unused assets size: ${report.summary.formattedTotalUnusedSize}`);
    console.log(`  📄 Files scanned: ${report.summary.filesScanned}`);
    console.log(`  ❌ Total errors: ${report.summary.totalErrors}\n`);
    
    if (report.assetAnalysis.referencedAssets.length > 0) {
      console.log('📎 Referenced Assets:');
      report.assetAnalysis.referencedAssets.forEach(asset => {
        console.log(`  ✅ ${asset}`);
      });
      console.log();
    }
    
    if (report.assetAnalysis.unusedAssets.length > 0) {
      console.log('🗑️  Unused Assets (sorted by size):');
      report.assetAnalysis.unusedAssets.forEach(asset => {
        console.log(`  ❌ ${asset.path} (${asset.formattedSize})`);
      });
      console.log();
      
      console.log('💡 Recommendations:');
      console.log('  - Review unused assets before deletion');
      console.log('  - Verify assets are not used in native configurations');
      console.log('  - Consider dynamic asset loading patterns');
      console.log(`  - Potential space savings: ${report.summary.formattedTotalUnusedSize}\n`);
    } else {
      console.log('✅ No unused assets found! All assets are properly referenced.\n');
    }
    
    if (report.scanDetails.errors.length > 0) {
      console.log('❌ Errors encountered:');
      report.scanDetails.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
      console.log();
    }
  }

  /**
   * Save combined report
   */
  saveCombinedReport(report, outputPath = 'asset-management-report.json') {
    try {
      const fs = require('fs');
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`💾 Combined report saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error saving combined report: ${error.message}`);
    }
  }

  /**
   * Clean unused assets with confirmation
   */
  async cleanUnusedAssets(report, dryRun = true) {
    if (report.assetAnalysis.unusedAssets.length === 0) {
      console.log('✅ No unused assets to clean!');
      return;
    }
    
    await this.detector.removeUnusedAssets(report.assetAnalysis, dryRun);
  }
}

// CLI execution
if (require.main === module) {
  async function main() {
    const manager = new AssetManager();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'analyze';
    
    try {
      switch (command) {
        case 'analyze':
        case 'scan':
          {
            const report = await manager.runCompleteAnalysis();
            manager.printCombinedReport(report);
            manager.saveCombinedReport(report);
            
            if (report.summary.unusedAssets > 0) {
              console.log('💡 Next steps:');
              console.log('  - Run "node scripts/asset-manager.js clean --dry-run" to preview cleanup');
              console.log('  - Run "node scripts/asset-manager.js clean --remove" to remove unused assets');
            }
          }
          break;
          
        case 'clean':
          {
            const report = await manager.runCompleteAnalysis();
            const dryRun = !args.includes('--remove');
            await manager.cleanUnusedAssets(report, dryRun);
          }
          break;
          
        case 'references':
          {
            const referenceReport = await manager.scanner.scanAssetReferences();
            manager.scanner.printReport(referenceReport);
            manager.scanner.saveReport(referenceReport);
          }
          break;
          
        case 'unused':
          {
            const unusedReport = await manager.detector.detectUnusedAssets();
            manager.detector.printReport(unusedReport);
            manager.detector.saveReport(unusedReport);
          }
          break;
          
        default:
          console.log('🎯 Asset Manager - Usage:');
          console.log('  node scripts/asset-manager.js analyze     - Run complete analysis (default)');
          console.log('  node scripts/asset-manager.js clean       - Clean unused assets (dry-run)');
          console.log('  node scripts/asset-manager.js clean --remove - Actually remove unused assets');
          console.log('  node scripts/asset-manager.js references  - Scan asset references only');
          console.log('  node scripts/asset-manager.js unused      - Detect unused assets only');
          process.exit(1);
      }
      
      console.log('\n✅ Asset management completed successfully!');
      
    } catch (error) {
      console.error('❌ Asset management failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = AssetManager;