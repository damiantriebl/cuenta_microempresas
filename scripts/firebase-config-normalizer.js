#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Firebase Configuration Normalizer
 * Cleans firebase.json, optimizes firebaseConfig.ts, and validates consistency
 */

class FirebaseConfigNormalizer {
  constructor() {
    this.backupDir = path.join(process.cwd(), '.config-backups');
    this.firebaseJsonPath = path.join(process.cwd(), 'firebase.json');
    this.firebaseConfigPath = path.join(process.cwd(), 'firebaseConfig.ts');
    this.firestoreRulesPath = path.join(process.cwd(), 'firestore.rules');
    this.firestoreIndexesPath = path.join(process.cwd(), 'firestore.indexes.json');
    
    // Services needed for MVP (Auth + Firestore + Hosting)
    this.requiredServices = new Set(['hosting']);
    this.optionalServices = new Set(['firestore', 'storage', 'functions', 'emulators']);
  }

  /**
   * Create backup of Firebase configuration files
   */
  async createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backups = [];
    
    try {
      // Backup firebase.json
      if (fs.existsSync(this.firebaseJsonPath)) {
        const backupPath = path.join(this.backupDir, `firebase-json-${timestamp}.json`);
        const content = fs.readFileSync(this.firebaseJsonPath, 'utf8');
        fs.writeFileSync(backupPath, content);
        backups.push(backupPath);
      }
      
      // Backup firebaseConfig.ts
      if (fs.existsSync(this.firebaseConfigPath)) {
        const backupPath = path.join(this.backupDir, `firebase-config-${timestamp}.ts`);
        const content = fs.readFileSync(this.firebaseConfigPath, 'utf8');
        fs.writeFileSync(backupPath, content);
        backups.push(backupPath);
      }
      
      console.log(`✅ Firebase backups created: ${backups.length} files`);
      return backups;
    } catch (error) {
      console.error('❌ Error creating Firebase backups:', error.message);
      throw error;
    }
  }

  /**
   * Load Firebase JSON configuration
   */
  loadFirebaseJson() {
    if (!fs.existsSync(this.firebaseJsonPath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(this.firebaseJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Error parsing firebase.json:', error.message);
      throw error;
    }
  }  /**

   * Load Firebase TypeScript configuration
   */
  loadFirebaseConfig() {
    if (!fs.existsSync(this.firebaseConfigPath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(this.firebaseConfigPath, 'utf8');
      return content;
    } catch (error) {
      console.error('❌ Error reading firebaseConfig.ts:', error.message);
      throw error;
    }
  }

  /**
   * Analyze Firebase JSON configuration for unused services
   */
  analyzeFirebaseJson(config) {
    if (!config) {
      return { unusedServices: [], warnings: [], issues: [] };
    }
    
    const analysis = {
      unusedServices: [],
      warnings: [],
      issues: [],
      activeServices: []
    };
    
    const services = Object.keys(config);
    
    services.forEach(service => {
      if (this.requiredServices.has(service)) {
        analysis.activeServices.push(service);
      } else if (this.optionalServices.has(service)) {
        analysis.activeServices.push(service);
        analysis.warnings.push(`Service "${service}" is optional for MVP`);
      } else {
        analysis.unusedServices.push(service);
        analysis.warnings.push(`Service "${service}" may not be needed`);
      }
    });
    
    // Analyze hosting configuration
    if (config.hosting) {
      const hosting = config.hosting;
      
      if (hosting.public !== 'dist') {
        analysis.warnings.push('Hosting public directory should be "dist" for Expo web builds');
      }
      
      if (!hosting.rewrites || !hosting.rewrites.some(r => r.source === '**' && r.destination === '/index.html')) {
        analysis.issues.push('Missing SPA rewrite rule for client-side routing');
      }
      
      if (!hosting.headers || hosting.headers.length === 0) {
        analysis.warnings.push('No caching headers configured - consider adding for better performance');
      }
    }
    
    return analysis;
  }

  /**
   * Analyze Firebase TypeScript configuration
   */
  analyzeFirebaseConfig(configContent) {
    if (!configContent) {
      return { issues: [], warnings: [], optimizations: [] };
    }
    
    const analysis = {
      issues: [],
      warnings: [],
      optimizations: []
    };
    
    // Check for unused imports
    const imports = configContent.match(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];/g) || [];
    const usedServices = [];
    
    if (configContent.includes('getFirestore') || configContent.includes('db')) {
      usedServices.push('firestore');
    }
    
    if (configContent.includes('getAuth') || configContent.includes('auth')) {
      usedServices.push('auth');
    }
    
    if (configContent.includes('getMessaging') || configContent.includes('messaging')) {
      usedServices.push('messaging');
    }
    
    if (configContent.includes('getStorage')) {
      usedServices.push('storage');
    }
    
    // Check for unused messaging import
    if (configContent.includes('getMessaging') && configContent.includes('messaging = null')) {
      analysis.optimizations.push('Messaging service imported but conditionally used - consider simplifying');
    }
    
    // Check for development emulator connections
    if (configContent.includes('connectFirestoreEmulator') && configContent.includes('// Uncomment')) {
      analysis.warnings.push('Emulator connections are commented out - consider enabling for development');
    }
    
    // Check for hardcoded configuration
    if (configContent.includes('apiKey:') && !configContent.includes('process.env')) {
      analysis.warnings.push('Firebase configuration is hardcoded - consider using environment variables');
    }
    
    return analysis;
  }  
/**
   * Validate Firestore rules and indexes consistency
   */
  validateFirestoreConsistency() {
    const validation = {
      rulesExist: fs.existsSync(this.firestoreRulesPath),
      indexesExist: fs.existsSync(this.firestoreIndexesPath),
      issues: [],
      warnings: []
    };
    
    if (!validation.rulesExist) {
      validation.issues.push('firestore.rules file is missing');
    }
    
    if (!validation.indexesExist) {
      validation.warnings.push('firestore.indexes.json file is missing - may cause query performance issues');
    }
    
    // If both exist, check for basic consistency
    if (validation.rulesExist && validation.indexesExist) {
      try {
        const rulesContent = fs.readFileSync(this.firestoreRulesPath, 'utf8');
        const indexesContent = fs.readFileSync(this.firestoreIndexesPath, 'utf8');
        const indexes = JSON.parse(indexesContent);
        
        // Check if rules mention collections that have indexes
        const collections = ['empresas', 'productos', 'clientes', 'eventos', 'solicitudes'];
        const indexCollections = new Set();
        
        if (indexes.indexes) {
          indexes.indexes.forEach(index => {
            indexCollections.add(index.collectionGroup);
          });
        }
        
        collections.forEach(collection => {
          if (rulesContent.includes(`/${collection}/`) && !indexCollections.has(collection)) {
            validation.warnings.push(`Collection "${collection}" used in rules but has no indexes defined`);
          }
        });
        
      } catch (error) {
        validation.issues.push('Error validating Firestore files consistency: ' + error.message);
      }
    }
    
    return validation;
  }

  /**
   * Clean Firebase JSON configuration
   */
  cleanFirebaseJson(config, options = {}) {
    if (!config) return { cleanedConfig: null, changes: [] };
    
    const { removeUnusedServices = false } = options;
    const cleanedConfig = JSON.parse(JSON.stringify(config));
    const changes = [];
    
    if (removeUnusedServices) {
      // Remove services that are not required for MVP
      const servicesToRemove = ['functions', 'storage', 'database'];
      
      servicesToRemove.forEach(service => {
        if (cleanedConfig[service]) {
          delete cleanedConfig[service];
          changes.push(`Removed unused service: ${service}`);
        }
      });
    }
    
    // Optimize hosting configuration
    if (cleanedConfig.hosting) {
      const hosting = cleanedConfig.hosting;
      
      // Ensure correct public directory
      if (hosting.public !== 'dist') {
        hosting.public = 'dist';
        changes.push('Updated hosting public directory to "dist"');
      }
      
      // Ensure SPA rewrite rule exists
      if (!hosting.rewrites || !hosting.rewrites.some(r => r.source === '**')) {
        hosting.rewrites = hosting.rewrites || [];
        if (!hosting.rewrites.some(r => r.source === '**')) {
          hosting.rewrites.push({
            source: '**',
            destination: '/index.html'
          });
          changes.push('Added SPA rewrite rule for client-side routing');
        }
      }
    }
    
    return { cleanedConfig, changes };
  }  
/**
   * Optimize Firebase TypeScript configuration
   */
  optimizeFirebaseConfig(configContent, options = {}) {
    if (!configContent) return { optimizedConfig: null, changes: [] };
    
    const { removeUnusedImports = false, enableEmulators = false } = options;
    let optimizedConfig = configContent;
    const changes = [];
    
    // Remove unused messaging if it's always null
    if (removeUnusedImports && configContent.includes('messaging = null') && 
        configContent.includes('let messaging: any = null;')) {
      
      // Remove messaging-related imports and code
      optimizedConfig = optimizedConfig.replace(/import\s+{[^}]*getMessaging[^}]*}\s+from\s+['"][^'"]+['"];\s*/g, '');
      optimizedConfig = optimizedConfig.replace(/import\s+{[^}]*isSupported[^}]*}\s+from\s+['"][^'"]+['"];\s*/g, '');
      optimizedConfig = optimizedConfig.replace(/\/\/ Initialize Cloud Messaging[\s\S]*?export { messaging };/g, '');
      
      changes.push('Removed unused messaging service imports and initialization');
    }
    
    // Enable emulators for development if requested
    if (enableEmulators && configContent.includes('// Uncomment these lines')) {
      optimizedConfig = optimizedConfig.replace(
        /\/\/ connectFirestoreEmulator\(db, 'localhost', 8080\);/,
        "connectFirestoreEmulator(db, 'localhost', 8080);"
      );
      optimizedConfig = optimizedConfig.replace(
        /\/\/ connectAuthEmulator\(auth, 'http:\/\/localhost:9099'\);/,
        "connectAuthEmulator(auth, 'http://localhost:9099');"
      );
      changes.push('Enabled Firebase emulators for development');
    }
    
    // Add environment variable usage suggestion
    if (!configContent.includes('process.env') && !configContent.includes('// TODO: Use environment variables')) {
      const configObjectMatch = optimizedConfig.match(/const firebaseConfig = {[\s\S]*?};/);
      if (configObjectMatch) {
        const replacement = configObjectMatch[0] + '\n\n// TODO: Consider using environment variables for sensitive configuration';
        optimizedConfig = optimizedConfig.replace(configObjectMatch[0], replacement);
        changes.push('Added suggestion to use environment variables');
      }
    }
    
    return { optimizedConfig, changes };
  }

  /**
   * Save configurations
   */
  saveConfigurations(firebaseJson, firebaseConfig) {
    const saved = [];
    
    try {
      if (firebaseJson) {
        const content = JSON.stringify(firebaseJson, null, 2);
        fs.writeFileSync(this.firebaseJsonPath, content);
        saved.push('firebase.json');
      }
      
      if (firebaseConfig) {
        fs.writeFileSync(this.firebaseConfigPath, firebaseConfig);
        saved.push('firebaseConfig.ts');
      }
      
      console.log(`✅ Firebase configurations saved: ${saved.join(', ')}`);
    } catch (error) {
      console.error('❌ Error saving Firebase configurations:', error.message);
      throw error;
    }
  }

  /**
   * Generate normalization report
   */
  generateReport(jsonAnalysis, configAnalysis, firestoreValidation, jsonChanges, configChanges) {
    return {
      timestamp: new Date().toISOString(),
      firebaseJson: {
        analysis: jsonAnalysis,
        changes: jsonChanges
      },
      firebaseConfig: {
        analysis: configAnalysis,
        changes: configChanges
      },
      firestoreValidation,
      summary: {
        totalIssues: (jsonAnalysis?.issues?.length || 0) + 
                    (configAnalysis?.issues?.length || 0) + 
                    (firestoreValidation?.issues?.length || 0),
        totalWarnings: (jsonAnalysis?.warnings?.length || 0) + 
                      (configAnalysis?.warnings?.length || 0) + 
                      (firestoreValidation?.warnings?.length || 0),
        totalChanges: jsonChanges.length + configChanges.length
      }
    };
  }  /**

   * Main normalization function
   */
  async normalize(options = {}) {
    const { 
      dryRun = true, 
      removeUnusedServices = false, 
      removeUnusedImports = false,
      enableEmulators = false 
    } = options;
    
    console.log('🔥 Starting Firebase configuration normalization...');
    
    try {
      // Create backups
      const backupPaths = await this.createBackup();
      
      // Load configurations
      const firebaseJson = this.loadFirebaseJson();
      const firebaseConfigContent = this.loadFirebaseConfig();
      
      if (!firebaseJson && !firebaseConfigContent) {
        return { success: false, reason: 'No Firebase configuration files found' };
      }
      
      // Analyze configurations
      const jsonAnalysis = this.analyzeFirebaseJson(firebaseJson);
      const configAnalysis = this.analyzeFirebaseConfig(firebaseConfigContent);
      const firestoreValidation = this.validateFirestoreConsistency();
      
      // Clean and optimize configurations
      const { cleanedConfig: cleanedJson, changes: jsonChanges } = 
        this.cleanFirebaseJson(firebaseJson, { removeUnusedServices });
      
      const { optimizedConfig: optimizedConfig, changes: configChanges } = 
        this.optimizeFirebaseConfig(firebaseConfigContent, { removeUnusedImports, enableEmulators });
      
      // Generate report
      const report = this.generateReport(
        jsonAnalysis, configAnalysis, firestoreValidation, 
        jsonChanges, configChanges
      );
      
      if (!dryRun) {
        this.saveConfigurations(cleanedJson, optimizedConfig);
      }
      
      // Display results
      console.log('\n📊 Normalization Report:');
      console.log(`Firebase JSON issues: ${jsonAnalysis?.issues?.length || 0}`);
      console.log(`Firebase Config issues: ${configAnalysis?.issues?.length || 0}`);
      console.log(`Firestore validation issues: ${firestoreValidation?.issues?.length || 0}`);
      console.log(`Total warnings: ${report.summary.totalWarnings}`);
      console.log(`Total changes: ${report.summary.totalChanges}`);
      
      if (dryRun) {
        console.log('\n🔍 Dry run mode - no changes made');
      }
      
      return { success: true, report, backupPaths };
      
    } catch (error) {
      console.error('❌ Normalization failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FirebaseConfigNormalizer;

// CLI interface
if (require.main === module) {
  const normalizer = new FirebaseConfigNormalizer();
  
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const removeUnusedServices = args.includes('--remove-unused-services');
  const removeUnusedImports = args.includes('--remove-unused-imports');
  const enableEmulators = args.includes('--enable-emulators');
  
  console.log('Firebase Configuration Normalizer');
  console.log('=================================');
  
  if (dryRun) {
    console.log('Running in dry-run mode. Use --apply to make changes.');
  }
  
  if (removeUnusedServices) {
    console.log('Will remove unused Firebase services.');
  }
  
  if (removeUnusedImports) {
    console.log('Will remove unused imports from firebaseConfig.ts.');
  }
  
  if (enableEmulators) {
    console.log('Will enable Firebase emulators for development.');
  }
  
  normalizer.normalize({ dryRun, removeUnusedServices, removeUnusedImports, enableEmulators })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Normalization completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Normalization failed:', result.reason || result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error.message);
      process.exit(1);
    });
}