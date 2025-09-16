#!/usr/bin/env node

/**
 * Backup and Rollback System
 * Creates git branch or backup system before cleanup operations
 * Implements rollback functionality for each cleanup step
 * Adds validation checkpoints after each major cleanup operation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BackupRollbackSystem {
  constructor(options = {}) {
    this.options = {
      useGit: options.useGit !== false, // Default to true
      backupDir: options.backupDir || '.cleanup-backups',
      branchPrefix: options.branchPrefix || 'cleanup-backup',
      verbose: options.verbose || false,
      ...options
    };
    
    this.backupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.backupBranch = `${this.options.branchPrefix}-${this.backupId}`;
    this.backupPath = path.join(process.cwd(), this.options.backupDir, this.backupId);
    
    this.backupManifest = {
      id: this.backupId,
      timestamp: new Date().toISOString(),
      method: this.options.useGit ? 'git' : 'filesystem',
      branch: this.backupBranch,
      path: this.backupPath,
      files: [],
      checkpoints: [],
      rollbacks: []
    };
    
    this.checkpoints = new Map();
    this.isGitRepo = this.checkGitRepository();
  }

  /**
   * Check if current directory is a git repository
   */
  checkGitRepository() {
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Log message with optional verbose output
   */
  log(message, data = null) {
    console.log(`🔄 ${message}`);
    if (this.options.verbose && data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Create initial backup using git or filesystem
   */
  async createInitialBackup() {
    this.log('Creating initial backup...');
    
    if (this.options.useGit && this.isGitRepo) {
      return await this.createGitBackup();
    } else {
      return await this.createFilesystemBackup();
    }
  }

  /**
   * Create git-based backup by creating a new branch
   */
  async createGitBackup() {
    try {
      // Check if there are uncommitted changes
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.log('Uncommitted changes detected, stashing...');
        execSync('git stash push -m "Pre-cleanup stash"', { stdio: 'pipe' });
        this.backupManifest.stashed = true;
      }
      
      // Get current branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      this.backupManifest.originalBranch = currentBranch;
      
      // Create backup branch
      execSync(`git checkout -b ${this.backupBranch}`, { stdio: 'pipe' });
      this.log(`Created backup branch: ${this.backupBranch}`);
      
      // Switch back to original branch
      execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
      
      this.backupManifest.method = 'git';
      this.backupManifest.success = true;
      
      return {
        success: true,
        method: 'git',
        branch: this.backupBranch,
        originalBranch: currentBranch
      };
      
    } catch (error) {
      this.log('Git backup failed, falling back to filesystem backup');
      return await this.createFilesystemBackup();
    }
  }

  /**
   * Create filesystem-based backup
   */
  async createFilesystemBackup() {
    try {
      // Create backup directory
      if (!fs.existsSync(this.options.backupDir)) {
        fs.mkdirSync(this.options.backupDir, { recursive: true });
      }
      
      fs.mkdirSync(this.backupPath, { recursive: true });
      
      // Files and directories to backup
      const itemsToBackup = [
        'package.json',
        'tsconfig.json',
        'app.json',
        'app.config.js',
        'eas.json',
        'firebase.json',
        'firebaseConfig.ts',
        'firestore.rules',
        'firestore.indexes.json',
        '.eslintrc.js',
        'scripts/',
        'components/',
        'app/',
        'services/',
        'hooks/',
        'context/',
        'schemas/'
      ];
      
      for (const item of itemsToBackup) {
        const sourcePath = path.join(process.cwd(), item);
        const targetPath = path.join(this.backupPath, item);
        
        if (fs.existsSync(sourcePath)) {
          await this.copyRecursive(sourcePath, targetPath);
          this.backupManifest.files.push(item);
        }
      }
      
      // Save backup manifest
      const manifestPath = path.join(this.backupPath, 'backup-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(this.backupManifest, null, 2));
      
      this.log(`Created filesystem backup: ${this.backupPath}`);
      
      this.backupManifest.method = 'filesystem';
      this.backupManifest.success = true;
      
      return {
        success: true,
        method: 'filesystem',
        path: this.backupPath,
        files: this.backupManifest.files
      };
      
    } catch (error) {
      throw new Error(`Filesystem backup failed: ${error.message}`);
    }
  }

  /**
   * Copy files/directories recursively
   */
  async copyRecursive(source, target) {
    const stat = fs.statSync(source);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
      
      const entries = fs.readdirSync(source);
      for (const entry of entries) {
        // Skip node_modules, .git, and other large directories
        if (['node_modules', '.git', '.expo', 'dist', 'build'].includes(entry)) {
          continue;
        }
        
        const sourcePath = path.join(source, entry);
        const targetPath = path.join(target, entry);
        await this.copyRecursive(sourcePath, targetPath);
      }
    } else {
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(source, target);
    }
  }

  /**
   * Create a checkpoint for a specific cleanup step
   */
  async createCheckpoint(stepName, filesToBackup = []) {
    this.log(`Creating checkpoint for step: ${stepName}`);
    
    const checkpoint = {
      name: stepName,
      timestamp: new Date().toISOString(),
      files: [],
      method: this.backupManifest.method
    };
    
    if (this.backupManifest.method === 'git' && this.isGitRepo) {
      // Create git checkpoint
      try {
        // Commit current state if there are changes
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
          execSync('git add .', { stdio: 'pipe' });
          execSync(`git commit -m "Checkpoint: ${stepName}"`, { stdio: 'pipe' });
          checkpoint.commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        }
        
        checkpoint.success = true;
      } catch (error) {
        checkpoint.success = false;
        checkpoint.error = error.message;
      }
    } else {
      // Create filesystem checkpoint
      const checkpointPath = path.join(this.backupPath, 'checkpoints', stepName);
      
      try {
        if (!fs.existsSync(path.dirname(checkpointPath))) {
          fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
        }
        
        // Backup specific files for this step
        for (const file of filesToBackup) {
          const sourcePath = path.join(process.cwd(), file);
          const targetPath = path.join(checkpointPath, file);
          
          if (fs.existsSync(sourcePath)) {
            await this.copyRecursive(sourcePath, targetPath);
            checkpoint.files.push(file);
          }
        }
        
        // Save checkpoint metadata
        const checkpointManifest = path.join(checkpointPath, 'checkpoint.json');
        fs.writeFileSync(checkpointManifest, JSON.stringify(checkpoint, null, 2));
        
        checkpoint.path = checkpointPath;
        checkpoint.success = true;
      } catch (error) {
        checkpoint.success = false;
        checkpoint.error = error.message;
      }
    }
    
    this.checkpoints.set(stepName, checkpoint);
    this.backupManifest.checkpoints.push(checkpoint);
    
    return checkpoint;
  }

  /**
   * Rollback to a specific checkpoint
   */
  async rollbackToCheckpoint(stepName) {
    this.log(`Rolling back to checkpoint: ${stepName}`);
    
    const checkpoint = this.checkpoints.get(stepName);
    if (!checkpoint) {
      throw new Error(`Checkpoint '${stepName}' not found`);
    }
    
    const rollback = {
      name: stepName,
      timestamp: new Date().toISOString(),
      success: false
    };
    
    try {
      if (this.backupManifest.method === 'git' && this.isGitRepo && checkpoint.commit) {
        // Git rollback
        execSync(`git reset --hard ${checkpoint.commit}`, { stdio: 'pipe' });
        rollback.method = 'git';
        rollback.commit = checkpoint.commit;
      } else if (checkpoint.path && fs.existsSync(checkpoint.path)) {
        // Filesystem rollback
        for (const file of checkpoint.files) {
          const sourcePath = path.join(checkpoint.path, file);
          const targetPath = path.join(process.cwd(), file);
          
          if (fs.existsSync(sourcePath)) {
            await this.copyRecursive(sourcePath, targetPath);
          }
        }
        rollback.method = 'filesystem';
        rollback.files = checkpoint.files;
      } else {
        throw new Error('No valid rollback data found');
      }
      
      rollback.success = true;
      this.log(`Successfully rolled back to checkpoint: ${stepName}`);
      
    } catch (error) {
      rollback.error = error.message;
      throw new Error(`Rollback failed: ${error.message}`);
    }
    
    this.backupManifest.rollbacks.push(rollback);
    return rollback;
  }

  /**
   * Rollback to initial backup state
   */
  async rollbackToInitial() {
    this.log('Rolling back to initial backup state...');
    
    const rollback = {
      name: 'initial',
      timestamp: new Date().toISOString(),
      success: false
    };
    
    try {
      if (this.backupManifest.method === 'git' && this.isGitRepo) {
        // Switch to backup branch and merge
        const currentBranch = this.backupManifest.originalBranch;
        execSync(`git checkout ${this.backupBranch}`, { stdio: 'pipe' });
        execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
        execSync(`git reset --hard ${this.backupBranch}`, { stdio: 'pipe' });
        
        // Restore stash if it exists
        if (this.backupManifest.stashed) {
          try {
            execSync('git stash pop', { stdio: 'pipe' });
          } catch (error) {
            this.log('Warning: Could not restore stash');
          }
        }
        
        rollback.method = 'git';
        rollback.branch = this.backupBranch;
      } else {
        // Filesystem rollback
        for (const file of this.backupManifest.files) {
          const sourcePath = path.join(this.backupPath, file);
          const targetPath = path.join(process.cwd(), file);
          
          if (fs.existsSync(sourcePath)) {
            await this.copyRecursive(sourcePath, targetPath);
          }
        }
        rollback.method = 'filesystem';
        rollback.files = this.backupManifest.files;
      }
      
      rollback.success = true;
      this.log('Successfully rolled back to initial state');
      
    } catch (error) {
      rollback.error = error.message;
      throw new Error(`Initial rollback failed: ${error.message}`);
    }
    
    this.backupManifest.rollbacks.push(rollback);
    return rollback;
  }

  /**
   * Validate project state after cleanup step
   */
  async validateStep(stepName, validationFunction) {
    this.log(`Validating step: ${stepName}`);
    
    const validation = {
      name: stepName,
      timestamp: new Date().toISOString(),
      success: false
    };
    
    try {
      const result = await validationFunction();
      validation.result = result;
      validation.success = result.success !== false;
      
      if (!validation.success) {
        this.log(`Validation failed for step: ${stepName}`);
        // Automatically rollback if validation fails
        await this.rollbackToCheckpoint(stepName);
      }
      
    } catch (error) {
      validation.error = error.message;
      validation.success = false;
      this.log(`Validation error for step: ${stepName} - ${error.message}`);
      
      // Automatically rollback on validation error
      try {
        await this.rollbackToCheckpoint(stepName);
      } catch (rollbackError) {
        this.log(`Rollback also failed: ${rollbackError.message}`);
      }
    }
    
    return validation;
  }

  /**
   * Cleanup backup files and branches
   */
  async cleanup(keepBackup = false) {
    this.log('Cleaning up backup system...');
    
    if (!keepBackup) {
      // Remove git backup branch
      if (this.backupManifest.method === 'git' && this.isGitRepo) {
        try {
          execSync(`git branch -D ${this.backupBranch}`, { stdio: 'pipe' });
          this.log(`Removed backup branch: ${this.backupBranch}`);
        } catch (error) {
          this.log(`Warning: Could not remove backup branch: ${error.message}`);
        }
      }
      
      // Remove filesystem backup
      if (fs.existsSync(this.backupPath)) {
        try {
          fs.rmSync(this.backupPath, { recursive: true, force: true });
          this.log(`Removed backup directory: ${this.backupPath}`);
        } catch (error) {
          this.log(`Warning: Could not remove backup directory: ${error.message}`);
        }
      }
    }
    
    // Save final manifest
    const manifestPath = path.join(process.cwd(), `backup-manifest-${this.backupId}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(this.backupManifest, null, 2));
    this.log(`Backup manifest saved: ${manifestPath}`);
    
    return {
      success: true,
      manifest: this.backupManifest,
      manifestPath
    };
  }

  /**
   * Get backup information
   */
  getBackupInfo() {
    return {
      id: this.backupId,
      method: this.backupManifest.method,
      branch: this.backupBranch,
      path: this.backupPath,
      checkpoints: Array.from(this.checkpoints.keys()),
      manifest: this.backupManifest
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    useGit: !args.includes('--no-git'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    backupDir: '.cleanup-backups'
  };
  
  const system = new BackupRollbackSystem(options);
  
  try {
    switch (command) {
      case 'create':
        {
          const result = await system.createInitialBackup();
          console.log('✅ Backup created successfully');
          console.log(JSON.stringify(result, null, 2));
        }
        break;
        
      case 'checkpoint':
        {
          const stepName = args[1];
          if (!stepName) {
            console.error('❌ Please provide a step name for the checkpoint');
            process.exit(1);
          }
          const result = await system.createCheckpoint(stepName);
          console.log(`✅ Checkpoint created for: ${stepName}`);
          console.log(JSON.stringify(result, null, 2));
        }
        break;
        
      case 'rollback':
        {
          const stepName = args[1];
          if (stepName === 'initial') {
            const result = await system.rollbackToInitial();
            console.log('✅ Rolled back to initial state');
            console.log(JSON.stringify(result, null, 2));
          } else if (stepName) {
            const result = await system.rollbackToCheckpoint(stepName);
            console.log(`✅ Rolled back to checkpoint: ${stepName}`);
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.error('❌ Please provide a step name or "initial" for rollback');
            process.exit(1);
          }
        }
        break;
        
      case 'info':
        {
          const info = system.getBackupInfo();
          console.log('📋 Backup Information:');
          console.log(JSON.stringify(info, null, 2));
        }
        break;
        
      case 'cleanup':
        {
          const keepBackup = args.includes('--keep');
          const result = await system.cleanup(keepBackup);
          console.log('✅ Backup system cleaned up');
          console.log(JSON.stringify(result, null, 2));
        }
        break;
        
      default:
        console.log('🔄 Backup and Rollback System - Usage:');
        console.log('  node scripts/backup-rollback-system.js create           - Create initial backup');
        console.log('  node scripts/backup-rollback-system.js checkpoint <step> - Create checkpoint');
        console.log('  node scripts/backup-rollback-system.js rollback <step>   - Rollback to checkpoint');
        console.log('  node scripts/backup-rollback-system.js rollback initial  - Rollback to initial state');
        console.log('  node scripts/backup-rollback-system.js info             - Show backup information');
        console.log('  node scripts/backup-rollback-system.js cleanup          - Clean up backups');
        console.log('  node scripts/backup-rollback-system.js cleanup --keep   - Clean up but keep backups');
        console.log('\nOptions:');
        console.log('  --no-git    - Force filesystem backup instead of git');
        console.log('  --verbose   - Verbose output');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = BackupRollbackSystem;

// Run if called directly
if (require.main === module) {
  main();
}