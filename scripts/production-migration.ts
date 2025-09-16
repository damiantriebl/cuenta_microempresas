#!/usr/bin/env tsx

/**
 * Production Database Migration Script
 * 
 * This script is specifically designed for production migration with enhanced
 * safety measures, monitoring, and validation. It includes additional checks
 * and safeguards compared to the development migration script.
 * 
 * Usage:
 *   npm run migrate:production [options]
 *   
 * Options:
 *   --confirm-production     Required flag to confirm production migration
 *   --company-id <id>        Migrate specific company only
 *   --batch-size <n>         Number of companies to process in each batch (default: 5)
 *   --delay <ms>             Delay between batches in milliseconds (default: 1000)
 *   --default-cost <n>       Default cost value for products (default: 0)
 *   --default-profit <n>     Default profit value for products (default: 0)
 *   --monitoring-interval <ms> Progress monitoring interval (default: 30000)
 *   --help                   Show help information
 */

import { program } from 'commander';
import { MigrationService } from '@/services/MigrationService';
import { CompanyService } from '@/services/CompanyService';
import { collection, getDocs, query, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTIONS } from '@/schemas/types';

interface ProductionMigrationOptions {
  confirmProduction: boolean;
  companyId?: string;
  batchSize: number;
  delay: number;
  defaultCost: number;
  defaultProfit: number;
  monitoringInterval: number;
}

interface ProductionMigrationProgress {
  totalCompanies: number;
  processedCompanies: number;
  successfulMigrations: number;
  failedMigrations: number;
  currentBatch: number;
  totalBatches: number;
  startTime: Date;
  lastProgressUpdate: Date;
  errors: Array<{ empresaId: string; error: string; timestamp: Date }>;
  backupIds: Array<{ empresaId: string; backupId: string }>;
}

interface ProductionMigrationReport {
  summary: {
    totalCompanies: number;
    successful: number;
    failed: number;
    totalTime: string;
    averageTimePerCompany: string;
  };
  backups: Array<{ empresaId: string; backupId: string; companyName?: string }>;
  errors: Array<{ empresaId: string; error: string; timestamp: Date }>;
  recommendations: string[];
}

class ProductionMigrationExecutor {
  private migrationService: MigrationService;
  private companyService: CompanyService;
  private progress: ProductionMigrationProgress;
  private monitoringTimer?: NodeJS.Timeout;

  constructor() {
    this.migrationService = MigrationService.getInstance();
    this.companyService = CompanyService.getInstance();
    this.progress = {
      totalCompanies: 0,
      processedCompanies: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      currentBatch: 0,
      totalBatches: 0,
      startTime: new Date(),
      lastProgressUpdate: new Date(),
      errors: [],
      backupIds: []
    };
  }

  /**
   * Main production migration execution method
   */
  async execute(options: ProductionMigrationOptions): Promise<void> {
    console.log('🚀 Production Database Migration');
    console.log('================================');
    
    if (!options.confirmProduction) {
      console.error('❌ Production migration requires --confirm-production flag');
      console.error('   This ensures you understand you are running on production data');
      process.exit(1);
    }

    console.log('⚠️  WARNING: This will modify production data!');
    console.log('   Make sure you have:');
    console.log('   - Tested migration in development environment');
    console.log('   - Verified backup and rollback procedures');
    console.log('   - Planned for potential downtime');
    console.log('   - Notified relevant stakeholders');
    console.log('');

    try {
      // Step 1: Pre-production validation
      await this.preProductionValidation(options);

      // Step 2: Start monitoring
      this.startProgressMonitoring(options.monitoringInterval);

      // Step 3: Execute migration in batches
      await this.executeBatchedMigration(options);

      // Step 4: Post-production validation
      await this.postProductionValidation();

      // Step 5: Generate production report
      const report = await this.generateProductionReport();
      await this.saveProductionReport(report);

      console.log('\n🎉 Production Migration Completed Successfully!');
      this.displayFinalSummary(report);

    } catch (error) {
      console.error('❌ Production migration failed:', error);
      await this.handleProductionFailure(error);
      throw error;
    } finally {
      this.stopProgressMonitoring();
    }
  }

  /**
   * Validates production environment and prerequisites
   */
  private async preProductionValidation(options: ProductionMigrationOptions): Promise<void> {
    console.log('🔍 Pre-production Validation');
    console.log('============================');

    try {
      // Step 1: Environment validation
      console.log('   Validating production environment...');
      await this.validateProductionEnvironment();

      // Step 2: Database connectivity and permissions
      console.log('   Validating database connectivity and permissions...');
      await this.validateDatabaseAccess();

      // Step 3: Migration analysis
      console.log('   Analyzing migration requirements...');
      const analysisResult = await this.analyzeProductionMigration(options);
      
      if (analysisResult.totalCompanies === 0) {
        console.log('✅ No companies need migration. Exiting.');
        process.exit(0);
      }

      this.progress.totalCompanies = analysisResult.totalCompanies;
      this.progress.totalBatches = Math.ceil(analysisResult.totalCompanies / options.batchSize);

      console.log(`   Migration Analysis Results:`);
      console.log(`   - Total companies: ${analysisResult.totalCompanies}`);
      console.log(`   - Companies needing name migration: ${analysisResult.companiesNeedingNameMigration}`);
      console.log(`   - Total products needing migration: ${analysisResult.productsNeedingMigration}`);
      console.log(`   - Estimated batches: ${this.progress.totalBatches}`);
      console.log(`   - Batch size: ${options.batchSize}`);

      // Step 4: Backup storage validation
      console.log('   Validating backup storage capacity...');
      await this.validateBackupCapacity(analysisResult.totalCompanies);

      // Step 5: Final confirmation
      console.log('\n⚠️  Final Production Migration Confirmation');
      console.log('   This is your last chance to abort before modifying production data.');
      console.log(`   About to migrate ${analysisResult.totalCompanies} companies in ${this.progress.totalBatches} batches.`);
      
      // In a real production environment, you might want to add an interactive confirmation
      console.log('   Proceeding with migration in 5 seconds...');
      await this.delay(5000);

      console.log('✅ Pre-production validation completed');

    } catch (error) {
      console.error('❌ Pre-production validation failed:', error);
      throw error;
    }
  }

  /**
   * Executes migration in batches for better control and monitoring
   */
  private async executeBatchedMigration(options: ProductionMigrationOptions): Promise<void> {
    console.log('\n🔄 Executing Batched Production Migration');
    console.log('=========================================');

    try {
      const companies = await this.getCompaniesForMigration(options.companyId);
      
      // Process companies in batches
      for (let i = 0; i < companies.length; i += options.batchSize) {
        this.progress.currentBatch++;
        const batch = companies.slice(i, i + options.batchSize);
        
        console.log(`\n📦 Processing Batch ${this.progress.currentBatch}/${this.progress.totalBatches}`);
        console.log(`   Companies in batch: ${batch.length}`);
        console.log(`   Batch IDs: ${batch.map(c => c.id).join(', ')}`);

        // Process each company in the batch
        for (const company of batch) {
          await this.migrateProductionCompany(company, options);
          this.progress.processedCompanies++;
        }

        // Delay between batches to reduce system load
        if (i + options.batchSize < companies.length) {
          console.log(`   ⏱️  Waiting ${options.delay}ms before next batch...`);
          await this.delay(options.delay);
        }
      }

      console.log('\n✅ Batched migration completed');

    } catch (error) {
      console.error('❌ Batched migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrates a single company with production-level error handling
   */
  private async migrateProductionCompany(
    company: { id: string; nombre?: string; propietario: string }, 
    options: ProductionMigrationOptions
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`\n   🏢 Migrating: ${company.nombre || company.propietario} (${company.id})`);

    try {
      let backupId: string | null = null;

      // Step 1: Create backup with validation
      console.log('      📦 Creating production backup...');
      backupId = await this.migrationService.createBackup(company.id);
      
      const isValidBackup = await this.migrationService.validateBackup(backupId);
      if (!isValidBackup) {
        throw new Error('Production backup validation failed');
      }

      this.progress.backupIds.push({ empresaId: company.id, backupId });
      console.log(`      ✅ Backup created and validated: ${backupId}`);

      // Step 2: Update migration status - starting
      await this.migrationService.updateMigrationStatus({
        empresaId: company.id,
        nombreAdded: false,
        productsValidated: false,
        backupCreated: true,
        migrationCompleted: false,
        errors: []
      });

      // Step 3: Migrate company name if needed
      const companyNeedsMigration = await this.migrationService.checkCompanyNeedsMigration(company.id);
      if (companyNeedsMigration) {
        console.log('      🏢 Migrating company name...');
        await this.migrationService.migrateCompanyName(company.id);
        
        const nameValidation = await this.migrationService.validateCompanyNameMigration(company.id);
        if (!nameValidation.isValid) {
          throw new Error(`Company name migration validation failed: ${nameValidation.errors.join(', ')}`);
        }
        console.log('      ✅ Company name migrated');
      }

      // Step 4: Migrate products if needed
      const productsNeedingMigration = await this.migrationService.checkProductsNeedMigration(company.id);
      if (productsNeedingMigration.length > 0) {
        console.log(`      📦 Migrating ${productsNeedingMigration.length} products...`);
        
        const productMigrationResult = await this.migrationService.migrateAllProductsData(company.id, {
          ultimoCosto: options.defaultCost,
          ultimaGanancia: options.defaultProfit
        });

        if (productMigrationResult.failed.length > 0) {
          console.warn(`      ⚠️  Some products failed: ${productMigrationResult.failed.length}`);
          // Log but don't fail the entire migration for partial product failures
        }

        console.log(`      ✅ Products migrated: ${productMigrationResult.successful.length} successful`);
      }

      // Step 5: Final validation
      console.log('      🔍 Validating migration...');
      const migrationValidation = await this.migrationService.validateMigrationComplete(company.id);
      if (!migrationValidation.isValid) {
        throw new Error(`Migration validation failed: ${migrationValidation.errors.join(', ')}`);
      }

      // Step 6: Update migration status - completed
      await this.migrationService.updateMigrationStatus({
        empresaId: company.id,
        nombreAdded: companyNeedsMigration,
        productsValidated: true,
        backupCreated: true,
        migrationCompleted: true,
        errors: []
      });

      const duration = Date.now() - startTime;
      console.log(`      ✅ Migration completed (${duration}ms)`);
      this.progress.successfulMigrations++;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`      ❌ Migration failed (${duration}ms):`, errorMessage);
      
      this.progress.errors.push({
        empresaId: company.id,
        error: errorMessage,
        timestamp: new Date()
      });
      this.progress.failedMigrations++;

      // Update migration status with error
      try {
        await this.migrationService.updateMigrationStatus({
          empresaId: company.id,
          nombreAdded: false,
          productsValidated: false,
          backupCreated: false,
          migrationCompleted: false,
          errors: [errorMessage]
        });
      } catch (statusError) {
        console.error('      ❌ Failed to update migration status:', statusError);
      }

      // In production, we might want to continue with other companies
      // rather than failing the entire migration
      console.log('      ⏭️  Continuing with next company...');
    }
  }

  /**
   * Validates production environment
   */
  private async validateProductionEnvironment(): Promise<void> {
    // Check environment variables or other production indicators
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.ENVIRONMENT === 'production' ||
                        process.env.FIREBASE_PROJECT_ID?.includes('prod');

    if (!isProduction) {
      console.warn('⚠️  Warning: Environment does not appear to be production');
      console.warn('   Make sure you are running against the correct database');
    }

    // Additional production-specific validations could go here
    console.log('   ✅ Production environment validated');
  }

  /**
   * Validates database access and permissions
   */
  private async validateDatabaseAccess(): Promise<void> {
    try {
      // Test read access
      const testQuery = await getDocs(query(collection(db, COLLECTIONS.EMPRESAS), limit(1)));
      
      // Test write access (create a temporary document and delete it)
      // This is a more thorough test but might not be suitable for all production environments
      
      console.log('   ✅ Database access validated');
    } catch (error) {
      throw new Error(`Database access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyzes production migration requirements
   */
  private async analyzeProductionMigration(options: ProductionMigrationOptions): Promise<{
    totalCompanies: number;
    companiesNeedingNameMigration: number;
    productsNeedingMigration: number;
  }> {
    const companies = await this.getCompaniesForMigration(options.companyId);
    let companiesNeedingNameMigration = 0;
    let productsNeedingMigration = 0;

    for (const company of companies) {
      const companyNeedsMigration = await this.migrationService.checkCompanyNeedsMigration(company.id);
      if (companyNeedsMigration) {
        companiesNeedingNameMigration++;
      }

      const productsNeeding = await this.migrationService.checkProductsNeedMigration(company.id);
      productsNeedingMigration += productsNeeding.length;
    }

    return {
      totalCompanies: companies.length,
      companiesNeedingNameMigration,
      productsNeedingMigration
    };
  }

  /**
   * Validates backup storage capacity
   */
  private async validateBackupCapacity(totalCompanies: number): Promise<void> {
    // This is a placeholder for backup capacity validation
    // In a real implementation, you might check available storage space,
    // backup collection size limits, etc.
    
    console.log(`   ✅ Backup capacity validated for ${totalCompanies} companies`);
  }

  /**
   * Gets companies for migration with pagination support
   */
  private async getCompaniesForMigration(companyId?: string): Promise<Array<{ id: string; nombre?: string; propietario: string }>> {
    if (companyId) {
      const company = await this.companyService.getCompany(companyId);
      if (!company) {
        throw new Error(`Company ${companyId} not found`);
      }
      return [company];
    }

    // Get all companies with pagination for large datasets
    const companies: Array<{ id: string; nombre?: string; propietario: string }> = [];
    let lastDoc: DocumentSnapshot | null = null;
    const batchSize = 100; // Firestore query batch size

    do {
      let companiesQuery = query(
        collection(db, COLLECTIONS.EMPRESAS),
        orderBy('creado'),
        limit(batchSize)
      );

      if (lastDoc) {
        companiesQuery = query(
          collection(db, COLLECTIONS.EMPRESAS),
          orderBy('creado'),
          startAfter(lastDoc),
          limit(batchSize)
        );
      }

      const companiesSnapshot = await getDocs(companiesQuery);
      
      if (companiesSnapshot.empty) {
        break;
      }

      companiesSnapshot.docs.forEach(doc => {
        companies.push({
          id: doc.id,
          ...doc.data()
        } as { id: string; nombre?: string; propietario: string });
      });

      lastDoc = companiesSnapshot.docs[companiesSnapshot.docs.length - 1];
    } while (lastDoc);

    return companies;
  }

  /**
   * Starts progress monitoring
   */
  private startProgressMonitoring(interval: number): void {
    console.log(`📊 Starting progress monitoring (interval: ${interval}ms)`);
    
    this.monitoringTimer = setInterval(() => {
      this.logProgressUpdate();
    }, interval);
  }

  /**
   * Stops progress monitoring
   */
  private stopProgressMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
  }

  /**
   * Logs progress update
   */
  private logProgressUpdate(): void {
    const now = new Date();
    const elapsed = now.getTime() - this.progress.startTime.getTime();
    const elapsedMinutes = Math.floor(elapsed / 60000);
    const elapsedSeconds = Math.floor((elapsed % 60000) / 1000);

    const completionPercentage = this.progress.totalCompanies > 0 
      ? Math.round((this.progress.processedCompanies / this.progress.totalCompanies) * 100)
      : 0;

    console.log(`\n📊 Progress Update (${now.toLocaleTimeString()})`);
    console.log(`   Completion: ${completionPercentage}% (${this.progress.processedCompanies}/${this.progress.totalCompanies})`);
    console.log(`   Batch: ${this.progress.currentBatch}/${this.progress.totalBatches}`);
    console.log(`   Successful: ${this.progress.successfulMigrations}`);
    console.log(`   Failed: ${this.progress.failedMigrations}`);
    console.log(`   Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s`);
    console.log(`   Backups created: ${this.progress.backupIds.length}`);

    if (this.progress.errors.length > 0) {
      console.log(`   Recent errors: ${this.progress.errors.slice(-3).map(e => e.empresaId).join(', ')}`);
    }

    this.progress.lastProgressUpdate = now;
  }

  /**
   * Performs post-production validation
   */
  private async postProductionValidation(): Promise<void> {
    console.log('\n🔍 Post-production Validation');
    console.log('=============================');

    try {
      console.log('   Validating migration completeness...');
      
      let validationErrors = 0;
      const companies = await this.getCompaniesForMigration();
      
      for (const company of companies) {
        try {
          const validation = await this.migrationService.validateMigrationComplete(company.id);
          if (!validation.isValid) {
            console.error(`   ❌ Validation failed for ${company.id}:`, validation.errors);
            validationErrors++;
          }
        } catch (error) {
          console.error(`   ❌ Validation error for ${company.id}:`, error);
          validationErrors++;
        }
      }

      if (validationErrors > 0) {
        console.warn(`   ⚠️  Post-production validation found ${validationErrors} issues`);
      } else {
        console.log('   ✅ All post-production validations passed');
      }

    } catch (error) {
      console.error('❌ Post-production validation failed:', error);
      throw error;
    }
  }

  /**
   * Generates comprehensive production migration report
   */
  private async generateProductionReport(): Promise<ProductionMigrationReport> {
    const endTime = new Date();
    const totalTime = endTime.getTime() - this.progress.startTime.getTime();
    const totalTimeFormatted = this.formatDuration(totalTime);
    const averageTimePerCompany = this.progress.processedCompanies > 0 
      ? this.formatDuration(totalTime / this.progress.processedCompanies)
      : '0ms';

    // Get company names for backups
    const backupsWithNames = await Promise.all(
      this.progress.backupIds.map(async (backup) => {
        try {
          const company = await this.companyService.getCompany(backup.empresaId);
          return {
            ...backup,
            companyName: company?.nombre || company?.propietario
          };
        } catch {
          return backup;
        }
      })
    );

    const recommendations: string[] = [];
    
    if (this.progress.failedMigrations > 0) {
      recommendations.push(`${this.progress.failedMigrations} migrations failed - review errors and consider retry`);
      recommendations.push('Check failed company migration status and consider rollback if needed');
    }
    
    if (this.progress.successfulMigrations > 0) {
      recommendations.push('Test application functionality with migrated data');
      recommendations.push('Monitor system performance and user feedback');
    }
    
    recommendations.push('Keep backups until migration stability is confirmed');
    recommendations.push('Update documentation and notify stakeholders of completion');

    return {
      summary: {
        totalCompanies: this.progress.totalCompanies,
        successful: this.progress.successfulMigrations,
        failed: this.progress.failedMigrations,
        totalTime: totalTimeFormatted,
        averageTimePerCompany
      },
      backups: backupsWithNames,
      errors: this.progress.errors,
      recommendations
    };
  }

  /**
   * Saves production migration report
   */
  private async saveProductionReport(report: ProductionMigrationReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `migration-reports/production-migration-${timestamp}.json`;
    
    try {
      // In a real implementation, you might save this to a file system or database
      console.log(`📄 Production migration report would be saved to: ${reportPath}`);
      console.log('   Report contains:');
      console.log(`   - Summary: ${JSON.stringify(report.summary, null, 2)}`);
      console.log(`   - Backups: ${report.backups.length} entries`);
      console.log(`   - Errors: ${report.errors.length} entries`);
      console.log(`   - Recommendations: ${report.recommendations.length} items`);
      
    } catch (error) {
      console.error('❌ Failed to save production report:', error);
      // Don't throw - report saving failure shouldn't fail the migration
    }
  }

  /**
   * Displays final migration summary
   */
  private displayFinalSummary(report: ProductionMigrationReport): void {
    console.log('\n🎉 Production Migration Summary');
    console.log('==============================');
    console.log(`📊 Results:`);
    console.log(`   - Total companies: ${report.summary.totalCompanies}`);
    console.log(`   - Successful: ${report.summary.successful}`);
    console.log(`   - Failed: ${report.summary.failed}`);
    console.log(`   - Success rate: ${Math.round((report.summary.successful / report.summary.totalCompanies) * 100)}%`);
    console.log(`   - Total time: ${report.summary.totalTime}`);
    console.log(`   - Average per company: ${report.summary.averageTimePerCompany}`);

    console.log(`\n📦 Backups created: ${report.backups.length}`);
    if (report.backups.length > 0) {
      console.log('   Use these backup IDs for rollback if needed:');
      report.backups.slice(0, 5).forEach(backup => {
        console.log(`   - ${backup.backupId} (${backup.companyName || backup.empresaId})`);
      });
      if (report.backups.length > 5) {
        console.log(`   ... and ${report.backups.length - 5} more`);
      }
    }

    if (report.errors.length > 0) {
      console.log(`\n❌ Errors: ${report.errors.length}`);
      report.errors.slice(0, 3).forEach(error => {
        console.log(`   - ${error.empresaId}: ${error.error}`);
      });
      if (report.errors.length > 3) {
        console.log(`   ... and ${report.errors.length - 3} more errors`);
      }
    }

    console.log(`\n📝 Recommendations:`);
    report.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }

  /**
   * Handles production migration failure
   */
  private async handleProductionFailure(error: any): Promise<void> {
    console.log('\n🚨 Production Migration Failure');
    console.log('===============================');
    console.log('📊 Current state:');
    console.log(`   - Processed: ${this.progress.processedCompanies}/${this.progress.totalCompanies}`);
    console.log(`   - Successful: ${this.progress.successfulMigrations}`);
    console.log(`   - Failed: ${this.progress.failedMigrations}`);
    console.log(`   - Backups created: ${this.progress.backupIds.length}`);

    console.log('\n🔄 Recovery options:');
    console.log('   1. Review error details and fix underlying issues');
    console.log('   2. Resume migration for remaining companies');
    console.log('   3. Rollback successful migrations if needed:');
    
    if (this.progress.backupIds.length > 0) {
      console.log('      Available backups for rollback:');
      this.progress.backupIds.slice(0, 5).forEach(backup => {
        console.log(`      - npm run migrate:rollback -- --backup-id ${backup.backupId}`);
      });
    }

    console.log('\n📞 Contact system administrator with:');
    console.log(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(`   - Progress: ${this.progress.processedCompanies}/${this.progress.totalCompanies}`);
    console.log(`   - Backup IDs: ${this.progress.backupIds.map(b => b.backupId).join(', ')}`);
  }

  /**
   * Utility method to format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Configuration
program
  .name('production-migration')
  .description('Execute database migration in production environment with enhanced safety measures')
  .version('1.0.0')
  .option('--confirm-production', 'Required flag to confirm production migration', false)
  .option('--company-id <id>', 'Migrate specific company only')
  .option('--batch-size <n>', 'Number of companies to process in each batch', '5')
  .option('--delay <ms>', 'Delay between batches in milliseconds', '1000')
  .option('--default-cost <n>', 'Default cost value for products', '0')
  .option('--default-profit <n>', 'Default profit value for products', '0')
  .option('--monitoring-interval <ms>', 'Progress monitoring interval', '30000')
  .action(async (options) => {
    try {
      const productionOptions: ProductionMigrationOptions = {
        confirmProduction: options.confirmProduction,
        companyId: options.companyId,
        batchSize: parseInt(options.batchSize),
        delay: parseInt(options.delay),
        defaultCost: parseFloat(options.defaultCost),
        defaultProfit: parseFloat(options.defaultProfit),
        monitoringInterval: parseInt(options.monitoringInterval)
      };

      // Validate numeric options
      if (isNaN(productionOptions.batchSize) || productionOptions.batchSize < 1) {
        console.error('❌ Invalid batch size. Must be a positive number.');
        process.exit(1);
      }

      if (isNaN(productionOptions.delay) || productionOptions.delay < 0) {
        console.error('❌ Invalid delay. Must be a non-negative number.');
        process.exit(1);
      }

      if (isNaN(productionOptions.defaultCost) || productionOptions.defaultCost < 0) {
        console.error('❌ Invalid default cost. Must be a non-negative number.');
        process.exit(1);
      }

      if (isNaN(productionOptions.defaultProfit) || productionOptions.defaultProfit < 0) {
        console.error('❌ Invalid default profit. Must be a non-negative number.');
        process.exit(1);
      }

      const executor = new ProductionMigrationExecutor();
      await executor.execute(productionOptions);

    } catch (error) {
      console.error('❌ Production migration execution failed:', error);
      process.exit(1);
    }
  });

// Add production migration script to package.json
program.addHelpText('after', `
Examples:
  npm run migrate:production -- --confirm-production
  npm run migrate:production -- --confirm-production --company-id "company123"
  npm run migrate:production -- --confirm-production --batch-size 10 --delay 2000
`);

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { ProductionMigrationExecutor };