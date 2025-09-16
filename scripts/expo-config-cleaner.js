#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Expo Configuration Cleaner
 * Analyzes app.json/app.config.js for unused keys and validates required settings
 */

class ExpoConfigCleaner {
  constructor() {
    this.backupDir = path.join(process.cwd(), '.config-backups');
    this.requiredKeys = new Set([
      'name', 'slug', 'version', 'orientation', 'icon', 'platforms',
      'android.package', 'android.versionCode', 'web.bundler', 'extra.eas.projectId'
    ]);
    
    // Keys that are commonly unused or can be removed for MVP
    this.potentiallyUnusedKeys = new Set([
      'ios', 'privacy', 'description', 'keywords', 'experiments.typedRoutes',
      'owner', 'userInterfaceStyle', 'newArchEnabled'
    ]);
  }

  /**
   * Create backup of configuration files
   */
  async createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `expo-config-${timestamp}.json`);
    
    try {
      const appJsonPath = path.join(process.cwd(), 'app.json');
      if (fs.existsSync(appJsonPath)) {
        const content = fs.readFileSync(appJsonPath, 'utf8');
        fs.writeFileSync(backupPath, content);
        console.log(`✅ Backup created: ${backupPath}`);
        return backupPath;
      }
    } catch (error) {
      console.error('❌ Error creating backup:', error.message);
      throw error;
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupPath) {
    try {
      const content = fs.readFileSync(backupPath, 'utf8');
      const appJsonPath = path.join(process.cwd(), 'app.json');
      fs.writeFileSync(appJsonPath, content);
      console.log(`✅ Configuration restored from: ${backupPath}`);
    } catch (error) {
      console.error('❌ Error restoring backup:', error.message);
      throw error;
    }
  }  /**
   * 
Load and parse Expo configuration
   */
  loadConfig() {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    const appConfigPath = path.join(process.cwd(), 'app.config.js');
    
    if (fs.existsSync(appJsonPath)) {
      try {
        const content = fs.readFileSync(appJsonPath, 'utf8');
        return { config: JSON.parse(content), type: 'json', path: appJsonPath };
      } catch (error) {
        console.error('❌ Error parsing app.json:', error.message);
        throw error;
      }
    } else if (fs.existsSync(appConfigPath)) {
      console.log('⚠️  app.config.js detected - manual review required');
      return { config: null, type: 'js', path: appConfigPath };
    } else {
      throw new Error('No Expo configuration file found (app.json or app.config.js)');
    }
  }

  /**
   * Validate required Expo configuration settings
   */
  validateRequiredSettings(config) {
    const issues = [];
    const expo = config.expo || {};
    
    // Check required top-level keys
    if (!expo.name || typeof expo.name !== 'string') {
      issues.push('Missing or invalid "name" field');
    }
    
    if (!expo.slug || typeof expo.slug !== 'string') {
      issues.push('Missing or invalid "slug" field');
    }
    
    if (!expo.version || typeof expo.version !== 'string') {
      issues.push('Missing or invalid "version" field');
    }
    
    if (!expo.platforms || !Array.isArray(expo.platforms)) {
      issues.push('Missing or invalid "platforms" array');
    }
    
    // Check Android-specific requirements (since iOS is not required)
    if (expo.platforms && expo.platforms.includes('android')) {
      if (!expo.android?.package) {
        issues.push('Missing Android package identifier');
      }
      if (!expo.android?.versionCode || typeof expo.android.versionCode !== 'number') {
        issues.push('Missing or invalid Android versionCode');
      }
    }
    
    // Check Web-specific requirements
    if (expo.platforms && expo.platforms.includes('web')) {
      if (!expo.web?.bundler) {
        issues.push('Missing Web bundler configuration');
      }
    }
    
    // Check EAS project ID
    if (!expo.extra?.eas?.projectId) {
      issues.push('Missing EAS project ID');
    }
    
    return issues;
  } 
 /**
   * Analyze configuration for unused keys
   */
  analyzeUnusedKeys(config) {
    const expo = config.expo || {};
    const unusedKeys = [];
    const warnings = [];
    
    // Check for iOS configuration (not needed for MVP)
    if (expo.ios && !expo.platforms?.includes('ios')) {
      unusedKeys.push('expo.ios');
      warnings.push('iOS configuration found but iOS not in platforms array');
    }
    
    // Check for potentially unused keys
    this.potentiallyUnusedKeys.forEach(key => {
      const keyPath = key.split('.');
      let current = expo;
      
      for (let i = 0; i < keyPath.length - 1; i++) {
        if (!current[keyPath[i]]) return;
        current = current[keyPath[i]];
      }
      
      const finalKey = keyPath[keyPath.length - 1];
      if (current[finalKey] !== undefined) {
        unusedKeys.push(`expo.${key}`);
      }
    });
    
    // Check for empty or default values
    if (expo.privacy === 'public') {
      warnings.push('Privacy set to "public" - consider if this is intentional');
    }
    
    if (expo.newArchEnabled === false) {
      unusedKeys.push('expo.newArchEnabled');
      warnings.push('newArchEnabled is false (default) - can be removed');
    }
    
    return { unusedKeys, warnings };
  }

  /**
   * Clean configuration by removing unused keys
   */
  cleanConfig(config, removeUnused = false) {
    const cleanedConfig = JSON.parse(JSON.stringify(config));
    const expo = cleanedConfig.expo;
    const removedKeys = [];
    
    if (removeUnused) {
      // Remove iOS configuration if iOS not in platforms
      if (expo.ios && (!expo.platforms || !expo.platforms.includes('ios'))) {
        delete expo.ios;
        removedKeys.push('expo.ios');
      }
      
      // Remove potentially unused keys
      const keysToRemove = [
        'privacy', 'description', 'keywords', 'owner', 
        'userInterfaceStyle', 'newArchEnabled'
      ];
      
      keysToRemove.forEach(key => {
        if (expo[key] !== undefined) {
          delete expo[key];
          removedKeys.push(`expo.${key}`);
        }
      });
      
      // Remove experiments if only typedRoutes
      if (expo.experiments && Object.keys(expo.experiments).length === 1 && expo.experiments.typedRoutes) {
        delete expo.experiments;
        removedKeys.push('expo.experiments');
      }
    }
    
    return { cleanedConfig, removedKeys };
  }  /**

   * Save cleaned configuration
   */
  saveConfig(config, configPath) {
    try {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(configPath, content);
      console.log(`✅ Configuration saved to: ${configPath}`);
    } catch (error) {
      console.error('❌ Error saving configuration:', error.message);
      throw error;
    }
  }

  /**
   * Generate cleanup report
   */
  generateReport(analysis, removedKeys, validationIssues) {
    const report = {
      timestamp: new Date().toISOString(),
      analysis: {
        unusedKeys: analysis.unusedKeys,
        warnings: analysis.warnings
      },
      removedKeys,
      validationIssues,
      recommendations: []
    };
    
    // Add recommendations
    if (analysis.unusedKeys.length > 0) {
      report.recommendations.push('Consider removing unused configuration keys to simplify setup');
    }
    
    if (validationIssues.length > 0) {
      report.recommendations.push('Fix validation issues before deploying');
    }
    
    return report;
  }

  /**
   * Main cleanup function
   */
  async cleanup(options = {}) {
    const { dryRun = true, removeUnused = false } = options;
    
    console.log('🧹 Starting Expo configuration cleanup...');
    
    try {
      // Create backup
      const backupPath = await this.createBackup();
      
      // Load configuration
      const { config, type, path: configPath } = this.loadConfig();
      
      if (type === 'js') {
        console.log('⚠️  JavaScript configuration detected - manual review required');
        return { success: false, reason: 'JavaScript config requires manual review' };
      }
      
      // Validate required settings
      const validationIssues = this.validateRequiredSettings(config);
      
      // Analyze unused keys
      const analysis = this.analyzeUnusedKeys(config);
      
      // Clean configuration
      const { cleanedConfig, removedKeys } = this.cleanConfig(config, removeUnused);
      
      // Generate report
      const report = this.generateReport(analysis, removedKeys, validationIssues);
      
      if (!dryRun && removeUnused) {
        this.saveConfig(cleanedConfig, configPath);
      }
      
      // Display results
      console.log('\n📊 Cleanup Report:');
      console.log(`Unused keys found: ${analysis.unusedKeys.length}`);
      console.log(`Warnings: ${analysis.warnings.length}`);
      console.log(`Validation issues: ${validationIssues.length}`);
      console.log(`Keys removed: ${removedKeys.length}`);
      
      if (dryRun) {
        console.log('\n🔍 Dry run mode - no changes made');
      }
      
      return { success: true, report, backupPath };
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ExpoConfigCleaner;

// CLI interface
if (require.main === module) {
  const cleaner = new ExpoConfigCleaner();
  
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const removeUnused = args.includes('--remove-unused');
  
  console.log('Expo Configuration Cleaner');
  console.log('==========================');
  
  if (dryRun) {
    console.log('Running in dry-run mode. Use --apply to make changes.');
  }
  
  if (removeUnused) {
    console.log('Will remove unused keys.');
  }
  
  cleaner.cleanup({ dryRun, removeUnused })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Cleanup completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Cleanup failed:', result.reason || result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error.message);
      process.exit(1);
    });
}