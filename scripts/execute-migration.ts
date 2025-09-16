#!/usr/bin/env tsx

/**
 * Database Migration Execution Script
 * 
 * This script executes the full database migration process for restructuring
 * company and product data. It includes progress tracking, logging, and 
 * validation checks at each step.
 * 
 * Usage:
 *   npm run migrate:execute [options]
 *   
 * Options:
 *   --company-id <id>     Migrate specific company only
 *   --dry-run            Show what would be migrated without executing
 *   --skip-backup        Skip backup creation (NOT RECOMMENDED)
 *   --default-cost <n>   Default cost value for products (default: 0)
 *   --default-profit <n> Default profit value for products (default: 0)
 *   --help               Show help information
 */

import { program } from 'commander';
import { MigrationService } from '@/services/MigrationService';
import { CompanyService } from '@/services/CompanyService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTIONS } from '@/schemas/types';

interface MigrationOptions {
  companyId?: string;
  dryRun: boolean;
  skipBackup: boolean;
  defaultCost: number;
  defaultProfit: number;
}

interface MigrationProgress {
  totalCompanies: number;
  processedCompanies: number;
  successfulMigrations: number;
  failedMigrations: number;
  currentStep: string;
  startTime: Date;
  errors: Array<{ empresaId: string; error: string; step: string }>;
}

class MigrationExecutor {
  private migrationService: MigrationService;
  private companyService: CompanyService;
  private progress: MigrationProgress;

  constructor() {
    this.migrationService = MigrationService.getInstance();
    this.companyService = CompanyService.getInstance();
    this.progress = {
      totalCompanies: 0,
      processedCompanies: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      currentStep: 'Initializing',
      startTime: new Date(),
      errors: []
    };
  }

  /**
   * Main migration execution method
   */
  async execute(options: MigrationOptions): Promise<void> {
    console.log('🚀 Starting Database Migration Process');
    console.log('=====================================');
    console.log(`Options:`, {
      companyId: options.companyId || 'ALL',
      dryRun: options.dryRun,
      skipBackup: options.skipBackup,
      defaultCost: options.defaultCost,
      defaultProfit: options.defaultProfit
    });
    console.log('');

    try {
      // Step 1: Pre-migration validation and analysis
      await this.preMigrationAnalysis(options);

      if (options.dryRun) {
        console.log('✅ Dry run completed. No changes were made.');
        return;
      }

      // Step 2: Execute migration for each company
      const companiesToMigrate = await this.getCompaniesToMigrate(options.companyId);
      this.progress.totalCompanies = companiesToMigrate.length;

      for (const company of companiesToMigrate) {
        await this.migrateCompany(company.id, options);
        this.progress.processedCompanies++;
        this.logProgress();
      }

      // Step 3: Post-migration validation
      await this.postMigrationValidation(companiesToMigrate);

      // Step 4: Generate final report
      this.generateFinalReport();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Analyzes current database state and generates migration plan
   */
  private async preMigrationAnalysis(options: MigrationOptions): Promise<void> {
    this.progress.currentStep = 'Pre-migration Analysis';
    console.log('📊 Analyzing current database state...');

    try {
      const companiesToMigrate = await this.getCompaniesToMigrate(options.companyId);
      
      let totalCompaniesNeedingNameMigration = 0;
      let totalProductsNeedingMigration = 0;
      let totalProducts = 0;

      console.log(`\n📋 Migration Analysis Report`);
      console.log('============================');

      for (const company of companiesToMigrate) {
        // Check company name migration needs
        const companyNeedsMigration = await this.migrationService.checkCompanyNeedsMigration(company.id);
        if (companyNeedsMigration) {
          totalCompaniesNeedingNameMigration++;
        }

        // Check product migration needs
        const productsNeedingMigration = await this.migrationService.checkProductsNeedMigration(company.id);
        totalProductsNeedingMigration += productsNeedingMigration.length;

        // Get total product count
        const allProducts = await this.migrationService.validateAllProductsData(company.id);
        totalProducts += allProducts.totalProducts;

        console.log(`\n🏢 Company: ${company.nombre || company.propietario} (${company.id})`);
        console.log(`   - Name migration needed: ${companyNeedsMigration ? '✅ Yes' : '❌ No'}`);
        console.log(`   - Products needing migration: ${productsNeedingMigration.length}/${allProducts.totalProducts}`);
        
        if (productsNeedingMigration.length > 0) {
          const missingCosto = productsNeedingMigration.filter(p => p.ultimoCosto === undefined).length;
          const missingGanancia = productsNeedingMigration.filter(p => p.ultimaGanancia === undefined).length;
          console.log(`     - Missing cost data: ${missingCosto}`);
          console.log(`     - Missing profit data: ${missingGanancia}`);
        }
      }

      console.log(`\n📈 Summary:`);
      console.log(`   - Total companies: ${companiesToMigrate.length}`);
      console.log(`   - Companies needing name migration: ${totalCompaniesNeedingNameMigration}`);
      console.log(`   - Total products: ${totalProducts}`);
      console.log(`   - Products needing migration: ${totalProductsNeedingMigration}`);

      if (totalCompaniesNeedingNameMigration === 0 && totalProductsNeedingMigration === 0) {
        console.log('\n✅ No migration needed! All data is already in the correct format.');
        return;
      }

      console.log(`\n⚠️  Migration Plan:`);
      if (totalCompaniesNeedingNameMigration > 0) {
        console.log(`   - Add names to ${totalCompaniesNeedingNameMigration} companies`);
      }
      if (totalProductsNeedingMigration > 0) {
        console.log(`   - Update ${totalProductsNeedingMigration} products with missing fields`);
        console.log(`     - Default cost value: ${options.defaultCost}`);
        console.log(`     - Default profit value: ${options.defaultProfit}`);
      }
      if (!options.skipBackup) {
        console.log(`   - Create backups for all companies before migration`);
      }

    } catch (error) {
      console.error('❌ Pre-migration analysis failed:', error);
      throw error;
    }
  }

  /**
   * Gets list of companies to migrate based on options
   */
  private async getCompaniesToMigrate(companyId?: string): Promise<Array<{ id: string; nombre?: string; propietario: string }>> {
    if (companyId) {
      const company = await this.companyService.getCompany(companyId);
      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }
      return [company];
    }

    // Get all companies
    const companiesRef = collection(db, COLLECTIONS.EMPRESAS);
    const companiesSnapshot = await getDocs(companiesRef);
    
    return companiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; nombre?: string; propietario: string }>;
  }

  /**
   * Migrates a single company
   */
  private async migrateCompany(empresaId: string, options: MigrationOptions): Promise<void> {
    this.progress.currentStep = `Migrating company ${empresaId}`;
    console.log(`\n🔄 Migrating company: ${empresaId}`);

    try {
      let backupId: string | null = null;

      // Step 1: Create backup (unless skipped)
      if (!options.skipBackup) {
        console.log('   📦 Creating backup...');
        backupId = await this.migrationService.createBackup(empresaId);
        
        const isValidBackup = await this.migrationService.validateBackup(backupId);
        if (!isValidBackup) {
          throw new Error('Backup validation failed');
        }
        console.log(`   ✅ Backup created and validated: ${backupId}`);
      }

      // Step 2: Update migration status - starting
      await this.migrationService.updateMigrationStatus({
        empresaId,
        nombreAdded: false,
        productsValidated: false,
        backupCreated: !!backupId,
        migrationCompleted: false,
        errors: []
      });

      // Step 3: Migrate company name if needed
      const companyNeedsMigration = await this.migrationService.checkCompanyNeedsMigration(empresaId);
      if (companyNeedsMigration) {
        console.log('   🏢 Migrating company name...');
        await this.migrationService.migrateCompanyName(empresaId);
        
        // Validate company name migration
        const nameValidation = await this.migrationService.validateCompanyNameMigration(empresaId);
        if (!nameValidation.isValid) {
          throw new Error(`Company name migration validation failed: ${nameValidation.errors.join(', ')}`);
        }
        console.log('   ✅ Company name migrated successfully');
      } else {
        console.log('   ⏭️  Company name migration not needed');
      }

      // Step 4: Migrate products if needed
      const productsNeedingMigration = await this.migrationService.checkProductsNeedMigration(empresaId);
      if (productsNeedingMigration.length > 0) {
        console.log(`   📦 Migrating ${productsNeedingMigration.length} products...`);
        
        const productMigrationResult = await this.migrationService.migrateAllProductsData(empresaId, {
          ultimoCosto: options.defaultCost,
          ultimaGanancia: options.defaultProfit
        });

        if (productMigrationResult.failed.length > 0) {
          console.warn(`   ⚠️  Some products failed to migrate:`, productMigrationResult.failed);
        }

        console.log(`   ✅ Products migrated: ${productMigrationResult.successful.length} successful, ${productMigrationResult.failed.length} failed`);
      } else {
        console.log('   ⏭️  Product migration not needed');
      }

      // Step 5: Final validation
      console.log('   🔍 Validating migration...');
      const migrationValidation = await this.migrationService.validateMigrationComplete(empresaId);
      if (!migrationValidation.isValid) {
        throw new Error(`Migration validation failed: ${migrationValidation.errors.join(', ')}`);
      }

      // Step 6: Update migration status - completed
      await this.migrationService.updateMigrationStatus({
        empresaId,
        nombreAdded: companyNeedsMigration,
        productsValidated: true,
        backupCreated: !!backupId,
        migrationCompleted: true,
        errors: []
      });

      console.log(`   ✅ Company migration completed successfully`);
      this.progress.successfulMigrations++;

    } catch (error) {
      console.error(`   ❌ Company migration failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.progress.errors.push({
        empresaId,
        error: errorMessage,
        step: this.progress.currentStep
      });
      this.progress.failedMigrations++;

      // Update migration status with error
      try {
        await this.migrationService.updateMigrationStatus({
          empresaId,
          nombreAdded: false,
          productsValidated: false,
          backupCreated: false,
          migrationCompleted: false,
          errors: [errorMessage]
        });
      } catch (statusError) {
        console.error('   ❌ Failed to update migration status:', statusError);
      }

      // Don't throw here - continue with other companies
    }
  }

  /**
   * Validates all migrations after completion
   */
  private async postMigrationValidation(companies: Array<{ id: string; nombre?: string; propietario: string }>): Promise<void> {
    this.progress.currentStep = 'Post-migration Validation';
    console.log('\n🔍 Performing post-migration validation...');

    let validationErrors = 0;

    for (const company of companies) {
      try {
        const validation = await this.migrationService.validateMigrationComplete(company.id);
        if (!validation.isValid) {
          console.error(`   ❌ Validation failed for ${company.id}:`, validation.errors);
          validationErrors++;
        } else {
          console.log(`   ✅ Validation passed for ${company.id}`);
        }
      } catch (error) {
        console.error(`   ❌ Validation error for ${company.id}:`, error);
        validationErrors++;
      }
    }

    if (validationErrors > 0) {
      console.warn(`\n⚠️  Post-migration validation found ${validationErrors} issues`);
    } else {
      console.log('\n✅ All post-migration validations passed');
    }
  }

  /**
   * Logs current migration progress
   */
  private logProgress(): void {
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);

    console.log(`\n📊 Progress: ${this.progress.processedCompanies}/${this.progress.totalCompanies} companies processed`);
    console.log(`   ✅ Successful: ${this.progress.successfulMigrations}`);
    console.log(`   ❌ Failed: ${this.progress.failedMigrations}`);
    console.log(`   ⏱️  Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s`);
  }

  /**
   * Generates final migration report
   */
  private generateFinalReport(): void {
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);

    console.log('\n🎉 Migration Process Completed!');
    console.log('================================');
    console.log(`📊 Final Results:`);
    console.log(`   - Total companies processed: ${this.progress.processedCompanies}`);
    console.log(`   - Successful migrations: ${this.progress.successfulMigrations}`);
    console.log(`   - Failed migrations: ${this.progress.failedMigrations}`);
    console.log(`   - Total time: ${elapsedMinutes}m ${elapsedSeconds}s`);

    if (this.progress.errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      this.progress.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Company ${error.empresaId} (${error.step}): ${error.error}`);
      });
    }

    if (this.progress.failedMigrations > 0) {
      console.log(`\n⚠️  Some migrations failed. Check the errors above and consider:`);
      console.log(`   - Running the migration again for failed companies`);
      console.log(`   - Using rollback functionality if needed`);
      console.log(`   - Manual intervention for specific issues`);
    } else {
      console.log(`\n✅ All migrations completed successfully!`);
    }

    console.log(`\n📝 Next steps:`);
    console.log(`   - Test application functionality with migrated data`);
    console.log(`   - Monitor for any issues in production`);
    console.log(`   - Clean up old backup data when confident migration is stable`);
  }
}

// CLI Configuration
program
  .name('execute-migration')
  .description('Execute database migration for company and product restructuring')
  .version('1.0.0')
  .option('--company-id <id>', 'Migrate specific company only')
  .option('--dry-run', 'Show what would be migrated without executing', false)
  .option('--skip-backup', 'Skip backup creation (NOT RECOMMENDED)', false)
  .option('--default-cost <n>', 'Default cost value for products', '0')
  .option('--default-profit <n>', 'Default profit value for products', '0')
  .action(async (options) => {
    try {
      const migrationOptions: MigrationOptions = {
        companyId: options.companyId,
        dryRun: options.dryRun,
        skipBackup: options.skipBackup,
        defaultCost: parseFloat(options.defaultCost),
        defaultProfit: parseFloat(options.defaultProfit)
      };

      // Validate numeric options
      if (isNaN(migrationOptions.defaultCost) || migrationOptions.defaultCost < 0) {
        console.error('❌ Invalid default cost value. Must be a non-negative number.');
        process.exit(1);
      }

      if (isNaN(migrationOptions.defaultProfit) || migrationOptions.defaultProfit < 0) {
        console.error('❌ Invalid default profit value. Must be a non-negative number.');
        process.exit(1);
      }

      // Warning for skip backup
      if (migrationOptions.skipBackup) {
        console.warn('⚠️  WARNING: Backup creation is disabled. This is NOT RECOMMENDED for production data!');
        console.warn('   Consider running with backup enabled for safety.');
      }

      const executor = new MigrationExecutor();
      await executor.execute(migrationOptions);

    } catch (error) {
      console.error('❌ Migration execution failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { MigrationExecutor };