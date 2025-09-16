#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * EAS Configuration Optimizer
 * Identifies actively used build profiles and removes unused ones
 */

class EasConfigOptimizer {
  constructor() {
    this.backupDir = path.join(process.cwd(), '.config-backups');
    this.requiredProfiles = new Set(['development', 'preview', 'production']);
    this.easConfigPath = path.join(process.cwd(), 'eas.json');
  }

  /**
   * Create backup of EAS configuration
   */
  async createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `eas-config-${timestamp}.json`);
    
    try {
      if (fs.existsSync(this.easConfigPath)) {
        const content = fs.readFileSync(this.easConfigPath, 'utf8');
        fs.writeFileSync(backupPath, content);
        console.log(`✅ EAS backup created: ${backupPath}`);
        return backupPath;
      } else {
        console.log('⚠️  No eas.json file found');
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating EAS backup:', error.message);
      throw error;
    }
  }

  /**
   * Load and parse EAS configuration
   */
  loadConfig() {
    if (!fs.existsSync(this.easConfigPath)) {
      throw new Error('No eas.json file found');
    }
    
    try {
      const content = fs.readFileSync(this.easConfigPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Error parsing eas.json:', error.message);
      throw error;
    }
  }  /**

   * Analyze build profiles for usage and optimization opportunities
   */
  analyzeBuildProfiles(config) {
    const analysis = {
      activeProfiles: [],
      unusedProfiles: [],
      missingProfiles: [],
      optimizations: [],
      warnings: []
    };

    const buildConfig = config.build || {};
    const existingProfiles = Object.keys(buildConfig);
    
    // Check for required profiles
    this.requiredProfiles.forEach(profile => {
      if (buildConfig[profile]) {
        analysis.activeProfiles.push(profile);
      } else {
        analysis.missingProfiles.push(profile);
      }
    });
    
    // Check for potentially unused profiles
    existingProfiles.forEach(profile => {
      if (!this.requiredProfiles.has(profile)) {
        analysis.unusedProfiles.push(profile);
        analysis.warnings.push(`Profile "${profile}" may not be needed for MVP`);
      }
    });
    
    // Analyze profile configurations for optimization
    existingProfiles.forEach(profile => {
      const profileConfig = buildConfig[profile];
      
      // Check Android configuration
      if (profileConfig.android) {
        const android = profileConfig.android;
        
        // Check for redundant settings
        if (android.buildType === 'apk' && profile === 'production') {
          analysis.optimizations.push(`${profile}: Consider using app-bundle for production builds`);
        }
        
        if (android.gradleCommand && profile !== 'development') {
          analysis.optimizations.push(`${profile}: gradleCommand may not be needed for ${profile} builds`);
        }
      }
      
      // Check for iOS configuration (not needed for MVP)
      if (profileConfig.ios) {
        analysis.optimizations.push(`${profile}: iOS configuration can be removed (not required for MVP)`);
      }
      
      // Check for web configuration (usually not needed in EAS)
      if (profileConfig.web) {
        analysis.optimizations.push(`${profile}: Web configuration in EAS may not be necessary`);
      }
    });
    
    return analysis;
  }

  /**
   * Validate EAS configuration against project needs
   */
  validateConfiguration(config) {
    const issues = [];
    
    // Check CLI version requirement
    if (!config.cli?.version) {
      issues.push('Missing CLI version requirement');
    }
    
    // Check build configuration exists
    if (!config.build || Object.keys(config.build).length === 0) {
      issues.push('No build profiles defined');
    }
    
    // Validate required profiles have proper Android configuration
    const buildConfig = config.build || {};
    
    if (buildConfig.production?.android) {
      const android = buildConfig.production.android;
      if (android.buildType !== 'app-bundle') {
        issues.push('Production should use app-bundle for Google Play Store');
      }
    }
    
    if (buildConfig.development?.android) {
      const android = buildConfig.development.android;
      if (android.buildType !== 'apk') {
        issues.push('Development builds should use APK for faster testing');
      }
    }
    
    // Check submit configuration
    if (config.submit?.production?.android) {
      const submit = config.submit.production.android;
      if (!submit.serviceAccountKeyPath) {
        issues.push('Production submit missing service account key path');
      }
      if (!submit.track) {
        issues.push('Production submit missing track specification');
      }
    }
    
    return issues;
  }  /**

   * Optimize EAS configuration by removing unused profiles and settings
   */
  optimizeConfig(config, options = {}) {
    const { removeUnused = false, removeIos = true } = options;
    const optimizedConfig = JSON.parse(JSON.stringify(config));
    const changes = [];
    
    if (optimizedConfig.build) {
      Object.keys(optimizedConfig.build).forEach(profile => {
        const profileConfig = optimizedConfig.build[profile];
        
        // Remove iOS configuration if not needed for MVP
        if (removeIos && profileConfig.ios) {
          delete profileConfig.ios;
          changes.push(`Removed iOS configuration from ${profile} profile`);
        }
        
        // Remove web configuration (usually not needed in EAS)
        if (profileConfig.web) {
          delete profileConfig.web;
          changes.push(`Removed web configuration from ${profile} profile`);
        }
        
        // Remove unused profiles
        if (removeUnused && !this.requiredProfiles.has(profile)) {
          delete optimizedConfig.build[profile];
          changes.push(`Removed unused profile: ${profile}`);
        }
      });
    }
    
    // Optimize submit configuration
    if (optimizedConfig.submit) {
      Object.keys(optimizedConfig.submit).forEach(profile => {
        const submitConfig = optimizedConfig.submit[profile];
        
        // Remove iOS submit configuration
        if (removeIos && submitConfig.ios) {
          delete submitConfig.ios;
          changes.push(`Removed iOS submit configuration from ${profile}`);
        }
        
        // Remove unused submit profiles
        if (removeUnused && !this.requiredProfiles.has(profile)) {
          delete optimizedConfig.submit[profile];
          changes.push(`Removed unused submit profile: ${profile}`);
        }
      });
      
      // Remove empty submit object
      if (Object.keys(optimizedConfig.submit).length === 0) {
        delete optimizedConfig.submit;
        changes.push('Removed empty submit configuration');
      }
    }
    
    return { optimizedConfig, changes };
  }

  /**
   * Save optimized configuration
   */
  saveConfig(config) {
    try {
      const content = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.easConfigPath, content);
      console.log(`✅ EAS configuration saved to: ${this.easConfigPath}`);
    } catch (error) {
      console.error('❌ Error saving EAS configuration:', error.message);
      throw error;
    }
  }

  /**
   * Generate optimization report
   */
  generateReport(analysis, changes, validationIssues) {
    return {
      timestamp: new Date().toISOString(),
      analysis: {
        activeProfiles: analysis.activeProfiles,
        unusedProfiles: analysis.unusedProfiles,
        missingProfiles: analysis.missingProfiles,
        optimizations: analysis.optimizations,
        warnings: analysis.warnings
      },
      changes,
      validationIssues,
      recommendations: this.generateRecommendations(analysis, validationIssues)
    };
  }  /**

   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis, validationIssues) {
    const recommendations = [];
    
    if (analysis.missingProfiles.length > 0) {
      recommendations.push('Add missing required build profiles: ' + analysis.missingProfiles.join(', '));
    }
    
    if (analysis.unusedProfiles.length > 0) {
      recommendations.push('Consider removing unused profiles to simplify configuration');
    }
    
    if (analysis.optimizations.length > 0) {
      recommendations.push('Apply suggested optimizations to improve build efficiency');
    }
    
    if (validationIssues.length > 0) {
      recommendations.push('Fix validation issues before running builds');
    }
    
    return recommendations;
  }

  /**
   * Main optimization function
   */
  async optimize(options = {}) {
    const { dryRun = true, removeUnused = false, removeIos = true } = options;
    
    console.log('🚀 Starting EAS configuration optimization...');
    
    try {
      // Create backup
      const backupPath = await this.createBackup();
      
      if (!backupPath) {
        return { success: false, reason: 'No eas.json file found' };
      }
      
      // Load configuration
      const config = this.loadConfig();
      
      // Analyze build profiles
      const analysis = this.analyzeBuildProfiles(config);
      
      // Validate configuration
      const validationIssues = this.validateConfiguration(config);
      
      // Optimize configuration
      const { optimizedConfig, changes } = this.optimizeConfig(config, { removeUnused, removeIos });
      
      // Generate report
      const report = this.generateReport(analysis, changes, validationIssues);
      
      if (!dryRun) {
        this.saveConfig(optimizedConfig);
      }
      
      // Display results
      console.log('\n📊 Optimization Report:');
      console.log(`Active profiles: ${analysis.activeProfiles.length}`);
      console.log(`Unused profiles: ${analysis.unusedProfiles.length}`);
      console.log(`Missing profiles: ${analysis.missingProfiles.length}`);
      console.log(`Optimizations available: ${analysis.optimizations.length}`);
      console.log(`Changes made: ${changes.length}`);
      console.log(`Validation issues: ${validationIssues.length}`);
      
      if (dryRun) {
        console.log('\n🔍 Dry run mode - no changes made');
      }
      
      return { success: true, report, backupPath };
      
    } catch (error) {
      console.error('❌ Optimization failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EasConfigOptimizer;

// CLI interface
if (require.main === module) {
  const optimizer = new EasConfigOptimizer();
  
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const removeUnused = args.includes('--remove-unused');
  const removeIos = !args.includes('--keep-ios');
  
  console.log('EAS Configuration Optimizer');
  console.log('===========================');
  
  if (dryRun) {
    console.log('Running in dry-run mode. Use --apply to make changes.');
  }
  
  if (removeUnused) {
    console.log('Will remove unused build profiles.');
  }
  
  if (removeIos) {
    console.log('Will remove iOS configurations (use --keep-ios to preserve).');
  }
  
  optimizer.optimize({ dryRun, removeUnused, removeIos })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Optimization completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Optimization failed:', result.reason || result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error.message);
      process.exit(1);
    });
}