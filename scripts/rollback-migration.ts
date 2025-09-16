#!/usr/bin/env tsx

/**
 * Database Migration Rollback Script
 * 
 * This script provides functionality to rollback database migrations
 * using previously created backups.
 * 
 * Usage:
 *   npm run migrate:rollback [options]
 *   
 * Options:
 *   --backup-id <id>      Specific backup ID to rollback from
 *   --company-id <id>     Show backups for specific company only
 *   --list               List available backups
 *   --latest             Use latest backup for company
 *   --dry-run            Show rollback plan without executing
 *   --help               Show help information
 */

import { program } from 'commander';
import { MigrationService } from '@/services/MigrationService';

interface RollbackOptions {
  backupId?: string;
  companyId?: string;
  list: boolean;
  latest: boolean;
  dryRun: boolean;
}

class RollbackExecutor {
  private migrationService: MigrationService;

  constructor() {
    this.migrationService = MigrationService.getInstance();
  }

  /**
   * Main rollback execution method
   */
  async execute(options: RollbackOptions): Promise<void> {
    console.log('🔄 Database Migration Rollback Tool');
    console.log('===================================');

    try {
      if (options.list) {
        await this.listAvailableBackups(options.companyId);
        return;
      }

      if (!options.backupId && !options.latest) {
        console.error('❌ Error: Must specify either --backup-id or --latest option');
        process.exit(1);
      }

      let backupId = options.backupId;

      // If using latest option, find the most recent backup
      if (options.latest) {
        if (!options.companyId) {
          console.error('❌ Error: --latest option requires --company-id');
          process.exit(1);
        }
        backupId = await this.getLatestBackupId(options.companyId);
      }

      if (!backupId) {
        console.error('❌ Error: No backup ID specified or found');
        process.exit(1);
      }

      if (options.dryRun) {
        await this.showRollbackPlan(backupId);
      } else {
        await this.executeRollback(backupId);
      }

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      process.exit(1);
    }
  }

  /**
   * Lists all available backups
   */
  private async listAvailableBackups(companyId?: string): Promise<void> {
    console.log('📋 Available Backups');
    console.log('====================');

    try {
      const backups = await this.migrationService.getAvailableBackupsForRollback(companyId);

      if (backups.length === 0) {
        console.log('No backups found.');
        return;
      }

      console.log(`Found ${backups.length} backup(s):\n`);

      backups.forEach((backup, index) => {
        const createdDate = backup.createdAt.toDate().toLocaleString();
        const status = backup.restored ? '🔄 Restored' : '✅ Available';
        
        console.log(`${index + 1}. Backup ID: ${backup.backupId}`);
        console.log(`   Company: ${backup.companyName || 'Unknown'} (${backup.empresaId})`);
        console.log(`   Created: ${createdDate}`);
        console.log(`   Products: ${backup.productCount}`);
        console.log(`   Status: ${status}`);
        console.log('');
      });

      console.log('💡 Usage examples:');
      console.log(`   npm run migrate:rollback -- --backup-id ${backups[0].backupId}`);
      if (companyId) {
        console.log(`   npm run migrate:rollback -- --company-id ${companyId} --latest`);
      }

    } catch (error) {
      console.error('❌ Error listing backups:', error);
      throw error;
    }
  }

  /**
   * Gets the latest backup ID for a company
   */
  private async getLatestBackupId(companyId: string): Promise<string | null> {
    try {
      const backups = await this.migrationService.getAvailableBackupsForRollback(companyId);
      
      if (backups.length === 0) {
        console.error(`❌ No backups found for company ${companyId}`);
        return null;
      }

      // Backups are already ordered by creation date (desc)
      const latestBackup = backups[0];
      console.log(`📦 Using latest backup: ${latestBackup.backupId} (created ${latestBackup.createdAt.toDate().toLocaleString()})`);
      
      return latestBackup.backupId;
    } catch (error) {
      console.error('❌ Error finding latest backup:', error);
      throw error;
    }
  }

  /**
   * Shows rollback plan without executing
   */
  private async showRollbackPlan(backupId: string): Promise<void> {
    console.log(`📋 Rollback Plan for Backup: ${backupId}`);
    console.log('==========================================');

    try {
      // Get backup info
      const backup = await this.migrationService.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      console.log(`🏢 Company: ${backup.backupData.empresa?.nombre || 'Unknown'} (${backup.empresaId})`);
      console.log(`📦 Products to restore: ${backup.backupData.productos?.length || 0}`);
      console.log(`📅 Backup created: ${backup.creado.toDate().toLocaleString()}`);
      console.log('');

      // Generate rollback plan
      const rollbackPlan = await this.migrationService.createRollbackPlan(backupId);

      console.log('🔄 Rollback Steps:');
      rollbackPlan.rollbackSteps.forEach((step, index) => {
        console.log(`   ${step}`);
      });

      console.log('\n✅ Validation Checks:');
      rollbackPlan.validationChecks.forEach((check, index) => {
        console.log(`   - ${check}`);
      });

      console.log('\n📝 Manual Steps After Rollback:');
      rollbackPlan.manualSteps.forEach((step, index) => {
        console.log(`   - ${step}`);
      });

      console.log('\n💡 To execute this rollback:');
      console.log(`   npm run migrate:rollback -- --backup-id ${backupId}`);

    } catch (error) {
      console.error('❌ Error creating rollback plan:', error);
      throw error;
    }
  }

  /**
   * Executes the rollback
   */
  private async executeRollback(backupId: string): Promise<void> {
    console.log(`🔄 Executing Rollback from Backup: ${backupId}`);
    console.log('===============================================');

    try {
      // Get backup info first
      const backup = await this.migrationService.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      console.log(`🏢 Company: ${backup.backupData.empresa?.nombre || 'Unknown'} (${backup.empresaId})`);
      console.log(`📦 Products to restore: ${backup.backupData.productos?.length || 0}`);
      console.log(`📅 Backup created: ${backup.creado.toDate().toLocaleString()}`);

      // Confirm rollback
      console.log('\n⚠️  WARNING: This will overwrite current data with backup data!');
      console.log('   Make sure you understand the implications before proceeding.');
      
      // In a real CLI, you might want to add a confirmation prompt here
      // For now, we'll proceed with a warning

      console.log('\n🔄 Starting rollback process...');

      // Execute rollback
      await this.migrationService.rollbackMigration(backupId);

      console.log('✅ Rollback completed successfully!');

      // Validate rollback
      console.log('\n🔍 Validating rollback...');
      const validation = await this.migrationService.validateRollback(backupId);

      if (validation.isValid) {
        console.log('✅ Rollback validation passed!');
      } else {
        console.warn('⚠️  Rollback validation found issues:');
        validation.errors.forEach(error => {
          console.warn(`   - ${error}`);
        });
      }

      console.log('\n🎉 Rollback Process Completed!');
      console.log('==============================');
      console.log('📝 Next steps:');
      console.log('   - Test application functionality');
      console.log('   - Verify data integrity');
      console.log('   - Check for any issues');
      console.log('   - Consider re-running migration if needed');

    } catch (error) {
      console.error('❌ Rollback execution failed:', error);
      
      console.log('\n🚨 Rollback Failed!');
      console.log('===================');
      console.log('📝 Recovery options:');
      console.log('   - Check error details above');
      console.log('   - Try rollback with a different backup');
      console.log('   - Contact system administrator');
      console.log('   - Manual data recovery may be required');
      
      throw error;
    }
  }
}

// CLI Configuration
program
  .name('rollback-migration')
  .description('Rollback database migration using backup data')
  .version('1.0.0')
  .option('--backup-id <id>', 'Specific backup ID to rollback from')
  .option('--company-id <id>', 'Show backups for specific company only')
  .option('--list', 'List available backups', false)
  .option('--latest', 'Use latest backup for company', false)
  .option('--dry-run', 'Show rollback plan without executing', false)
  .action(async (options) => {
    try {
      const rollbackOptions: RollbackOptions = {
        backupId: options.backupId,
        companyId: options.companyId,
        list: options.list,
        latest: options.latest,
        dryRun: options.dryRun
      };

      const executor = new RollbackExecutor();
      await executor.execute(rollbackOptions);

    } catch (error) {
      console.error('❌ Rollback execution failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { RollbackExecutor };