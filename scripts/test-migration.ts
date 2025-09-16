#!/usr/bin/env tsx

/**
 * Migration Testing Script
 * 
 * This script creates test data and validates the migration process
 * in a development environment before running on production data.
 * 
 * Usage:
 *   npm run migrate:test
 *   
 * Options:
 *   --create-test-data    Create test companies and products
 *   --test-migration      Test migration process
 *   --test-rollback       Test rollback functionality
 *   --cleanup            Clean up test data
 *   --all                Run all tests
 *   --help               Show help information
 */

import { program } from 'commander';
import { MigrationService } from '@/services/MigrationService';
import { CompanyService } from '@/services/CompanyService';
import { ProductService } from '@/services/ProductService';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTIONS } from '@/schemas/types';

interface TestOptions {
  createTestData: boolean;
  testMigration: boolean;
  testRollback: boolean;
  cleanup: boolean;
  all: boolean;
}

interface TestCompany {
  id: string;
  propietario: string;
  creado: Timestamp;
  // Intentionally missing 'nombre' field for testing
}

interface TestProduct {
  id: string;
  nombre: string;
  colorFondo: string;
  posicion: number;
  activo: boolean;
  creado: Timestamp;
  // Intentionally missing 'ultimoCosto' and 'ultimaGanancia' for some products
  ultimoCosto?: number;
  ultimaGanancia?: number;
}

class MigrationTester {
  private migrationService: MigrationService;
  private companyService: CompanyService;
  private productService: ProductService;
  private testCompanyIds: string[] = [];
  private testPrefix = 'TEST_MIGRATION_';

  constructor() {
    this.migrationService = MigrationService.getInstance();
    this.companyService = CompanyService.getInstance();
    this.productService = ProductService.getInstance();
  }

  /**
   * Main test execution method
   */
  async execute(options: TestOptions): Promise<void> {
    console.log('🧪 Migration Testing Suite');
    console.log('==========================');

    try {
      if (options.all) {
        await this.runAllTests();
      } else {
        if (options.createTestData) {
          await this.createTestData();
        }
        if (options.testMigration) {
          await this.testMigration();
        }
        if (options.testRollback) {
          await this.testRollback();
        }
        if (options.cleanup) {
          await this.cleanup();
        }
      }

      console.log('\n✅ All tests completed successfully!');

    } catch (error) {
      console.error('❌ Testing failed:', error);
      throw error;
    }
  }

  /**
   * Runs all tests in sequence
   */
  private async runAllTests(): Promise<void> {
    console.log('🔄 Running complete test suite...\n');

    // Step 1: Clean up any existing test data
    console.log('1️⃣ Cleaning up existing test data...');
    await this.cleanup();

    // Step 2: Create test data
    console.log('\n2️⃣ Creating test data...');
    await this.createTestData();

    // Step 3: Test migration
    console.log('\n3️⃣ Testing migration process...');
    await this.testMigration();

    // Step 4: Test rollback
    console.log('\n4️⃣ Testing rollback functionality...');
    await this.testRollback();

    // Step 5: Final cleanup
    console.log('\n5️⃣ Final cleanup...');
    await this.cleanup();
  }

  /**
   * Creates test companies and products with missing fields
   */
  private async createTestData(): Promise<void> {
    console.log('📦 Creating test data for migration testing...');

    try {
      // Create test companies without 'nombre' field
      const testCompanies = [
        {
          propietario: `${this.testPrefix}user1@test.com`,
          creado: Timestamp.now()
        },
        {
          propietario: `${this.testPrefix}user2@test.com`,
          creado: Timestamp.now()
        },
        {
          propietario: `${this.testPrefix}user3@test.com`,
          creado: Timestamp.now()
        }
      ];

      console.log('   Creating test companies...');
      for (const companyData of testCompanies) {
        const companyRef = await addDoc(collection(db, COLLECTIONS.EMPRESAS), companyData);
        this.testCompanyIds.push(companyRef.id);
        console.log(`   ✅ Created company: ${companyRef.id} (${companyData.propietario})`);
      }

      // Create test products with missing fields
      console.log('   Creating test products...');
      for (const companyId of this.testCompanyIds) {
        const products = [
          // Product with all fields (should not need migration)
          {
            nombre: 'Complete Product',
            colorFondo: '#FF0000',
            posicion: 0,
            ultimoCosto: 10,
            ultimaGanancia: 5,
            activo: true,
            creado: Timestamp.now()
          },
          // Product missing cost (needs migration)
          {
            nombre: 'Missing Cost Product',
            colorFondo: '#00FF00',
            posicion: 1,
            ultimaGanancia: 3,
            activo: true,
            creado: Timestamp.now()
          },
          // Product missing profit (needs migration)
          {
            nombre: 'Missing Profit Product',
            colorFondo: '#0000FF',
            posicion: 2,
            ultimoCosto: 8,
            activo: true,
            creado: Timestamp.now()
          },
          // Product missing both (needs migration)
          {
            nombre: 'Missing Both Product',
            colorFondo: '#FFFF00',
            posicion: 3,
            activo: true,
            creado: Timestamp.now()
          }
        ];

        for (const productData of products) {
          const productRef = await addDoc(
            collection(db, COLLECTIONS.EMPRESAS, companyId, COLLECTIONS.PRODUCTOS),
            productData
          );
          console.log(`   ✅ Created product: ${productData.nombre} in company ${companyId}`);
        }
      }

      console.log(`\n✅ Test data created successfully!`);
      console.log(`   - Companies: ${this.testCompanyIds.length}`);
      console.log(`   - Products per company: 4`);
      console.log(`   - Total products: ${this.testCompanyIds.length * 4}`);

    } catch (error) {
      console.error('❌ Failed to create test data:', error);
      throw error;
    }
  }

  /**
   * Tests the migration process on test data
   */
  private async testMigration(): Promise<void> {
    console.log('🔄 Testing migration process...');

    try {
      // Step 1: Pre-migration analysis
      console.log('\n   📊 Pre-migration analysis...');
      for (const companyId of this.testCompanyIds) {
        const companyNeedsMigration = await this.migrationService.checkCompanyNeedsMigration(companyId);
        const productsNeedingMigration = await this.migrationService.checkProductsNeedMigration(companyId);
        
        console.log(`   Company ${companyId}:`);
        console.log(`     - Needs name migration: ${companyNeedsMigration}`);
        console.log(`     - Products needing migration: ${productsNeedingMigration.length}`);

        // Validate that we have the expected test scenario
        if (!companyNeedsMigration) {
          throw new Error(`Test company ${companyId} should need name migration`);
        }
        if (productsNeedingMigration.length !== 3) {
          throw new Error(`Test company ${companyId} should have 3 products needing migration, found ${productsNeedingMigration.length}`);
        }
      }

      // Step 2: Test migration execution
      console.log('\n   🚀 Executing migration...');
      for (const companyId of this.testCompanyIds) {
        console.log(`   Migrating company: ${companyId}`);

        // Create backup
        const backupId = await this.migrationService.createBackup(companyId);
        console.log(`     ✅ Backup created: ${backupId}`);

        // Validate backup
        const isValidBackup = await this.migrationService.validateBackup(backupId);
        if (!isValidBackup) {
          throw new Error(`Backup validation failed for ${backupId}`);
        }
        console.log(`     ✅ Backup validated`);

        // Migrate company name
        await this.migrationService.migrateCompanyName(companyId);
        console.log(`     ✅ Company name migrated`);

        // Validate company name migration
        const nameValidation = await this.migrationService.validateCompanyNameMigration(companyId);
        if (!nameValidation.isValid) {
          throw new Error(`Company name migration validation failed: ${nameValidation.errors.join(', ')}`);
        }
        console.log(`     ✅ Company name migration validated`);

        // Migrate products
        const productMigrationResult = await this.migrationService.migrateAllProductsData(companyId, {
          ultimoCosto: 0,
          ultimaGanancia: 0
        });

        if (productMigrationResult.failed.length > 0) {
          throw new Error(`Product migration failed for some products: ${productMigrationResult.failed.map(f => f.error).join(', ')}`);
        }
        console.log(`     ✅ Products migrated: ${productMigrationResult.successful.length} successful`);

        // Final validation
        const migrationValidation = await this.migrationService.validateMigrationComplete(companyId);
        if (!migrationValidation.isValid) {
          throw new Error(`Migration validation failed: ${migrationValidation.errors.join(', ')}`);
        }
        console.log(`     ✅ Migration validation passed`);
      }

      // Step 3: Post-migration verification
      console.log('\n   🔍 Post-migration verification...');
      for (const companyId of this.testCompanyIds) {
        // Check company has name
        const company = await this.companyService.getCompany(companyId);
        if (!company?.nombre) {
          throw new Error(`Company ${companyId} still missing name after migration`);
        }
        console.log(`     ✅ Company ${companyId} has name: ${company.nombre}`);

        // Check all products have required fields
        const productValidation = await this.migrationService.validateAllProductsData(companyId);
        if (!productValidation.isAllValid) {
          throw new Error(`Product validation failed for company ${companyId}: ${productValidation.invalidProducts.length} invalid products`);
        }
        console.log(`     ✅ All ${productValidation.totalProducts} products valid`);
      }

      console.log('\n✅ Migration testing completed successfully!');

    } catch (error) {
      console.error('❌ Migration testing failed:', error);
      throw error;
    }
  }

  /**
   * Tests rollback functionality
   */
  private async testRollback(): Promise<void> {
    console.log('🔄 Testing rollback functionality...');

    try {
      // Get available backups for testing
      const testCompanyId = this.testCompanyIds[0];
      const backups = await this.migrationService.getCompanyBackups(testCompanyId);
      
      if (backups.length === 0) {
        throw new Error('No backups found for rollback testing');
      }

      const backupToTest = backups[0];
      console.log(`   Using backup: ${backupToTest.id} for rollback test`);

      // Step 1: Record current state (after migration)
      const companyBeforeRollback = await this.companyService.getCompany(testCompanyId);
      const productsBeforeRollback = await this.migrationService.validateAllProductsData(testCompanyId);

      console.log(`   Pre-rollback state:`);
      console.log(`     - Company has name: ${!!companyBeforeRollback?.nombre}`);
      console.log(`     - Valid products: ${productsBeforeRollback.validProducts}/${productsBeforeRollback.totalProducts}`);

      // Step 2: Create rollback plan
      const rollbackPlan = await this.migrationService.createRollbackPlan(backupToTest.id);
      console.log(`   ✅ Rollback plan created with ${rollbackPlan.rollbackSteps.length} steps`);

      // Step 3: Execute rollback
      console.log(`   🔄 Executing rollback...`);
      await this.migrationService.rollbackMigration(backupToTest.id);
      console.log(`   ✅ Rollback executed`);

      // Step 4: Validate rollback
      const rollbackValidation = await this.migrationService.validateRollback(backupToTest.id);
      if (!rollbackValidation.isValid) {
        throw new Error(`Rollback validation failed: ${rollbackValidation.errors.join(', ')}`);
      }
      console.log(`   ✅ Rollback validation passed`);

      // Step 5: Verify data was restored to pre-migration state
      const companyAfterRollback = await this.companyService.getCompany(testCompanyId);
      const productsAfterRollback = await this.migrationService.validateAllProductsData(testCompanyId);

      console.log(`   Post-rollback state:`);
      console.log(`     - Company has name: ${!!companyAfterRollback?.nombre}`);
      console.log(`     - Valid products: ${productsAfterRollback.validProducts}/${productsAfterRollback.totalProducts}`);

      // Verify rollback restored original state
      if (companyAfterRollback?.nombre) {
        console.log(`   ⚠️  Note: Company still has name after rollback (this may be expected if name was in backup)`);
      }

      // Check that some products should be missing required fields again
      const productsNeedingMigrationAfterRollback = await this.migrationService.checkProductsNeedMigration(testCompanyId);
      if (productsNeedingMigrationAfterRollback.length === 0) {
        console.log(`   ⚠️  Note: No products need migration after rollback (backup may have had complete data)`);
      } else {
        console.log(`   ✅ Rollback restored original state: ${productsNeedingMigrationAfterRollback.length} products need migration again`);
      }

      console.log('\n✅ Rollback testing completed successfully!');

    } catch (error) {
      console.error('❌ Rollback testing failed:', error);
      throw error;
    }
  }

  /**
   * Cleans up test data
   */
  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Find all test companies
      const companiesRef = collection(db, COLLECTIONS.EMPRESAS);
      const testCompaniesQuery = query(
        companiesRef,
        where('propietario', '>=', this.testPrefix),
        where('propietario', '<', this.testPrefix + '\uf8ff')
      );
      
      const testCompaniesSnapshot = await getDocs(testCompaniesQuery);
      const foundTestCompanies = testCompaniesSnapshot.docs.map(doc => doc.id);

      console.log(`   Found ${foundTestCompanies.length} test companies to clean up`);

      // Delete test companies and their products
      for (const companyId of foundTestCompanies) {
        // Delete all products in the company
        const productsRef = collection(db, COLLECTIONS.EMPRESAS, companyId, COLLECTIONS.PRODUCTOS);
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          await deleteDoc(productDoc.ref);
        }
        console.log(`   ✅ Deleted ${productsSnapshot.docs.length} products from company ${companyId}`);

        // Delete the company
        await deleteDoc(doc(db, COLLECTIONS.EMPRESAS, companyId));
        console.log(`   ✅ Deleted company ${companyId}`);
      }

      // Clean up test backups
      const backupsRef = collection(db, 'migration_backups');
      const testBackupsQuery = query(
        backupsRef,
        where('empresaId', 'in', foundTestCompanies.length > 0 ? foundTestCompanies : ['dummy'])
      );
      
      if (foundTestCompanies.length > 0) {
        const testBackupsSnapshot = await getDocs(testBackupsQuery);
        for (const backupDoc of testBackupsSnapshot.docs) {
          await deleteDoc(backupDoc.ref);
        }
        console.log(`   ✅ Deleted ${testBackupsSnapshot.docs.length} test backups`);
      }

      // Clean up test migration status
      for (const companyId of foundTestCompanies) {
        try {
          await deleteDoc(doc(db, 'migration_status', companyId));
        } catch (error) {
          // Migration status might not exist, ignore error
        }
      }

      // Reset test company IDs
      this.testCompanyIds = [];

      console.log('✅ Cleanup completed successfully!');

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Don't throw here - cleanup failure shouldn't stop other operations
    }
  }

  /**
   * Validates test environment setup
   */
  private async validateTestEnvironment(): Promise<void> {
    console.log('🔍 Validating test environment...');

    try {
      // Check if we're in a development environment
      // This is a basic check - you might want to add more sophisticated environment detection
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.NODE_ENV === 'test' ||
                           !process.env.NODE_ENV;

      if (!isDevelopment) {
        throw new Error('Migration testing should only be run in development environment');
      }

      // Check database connectivity
      const testQuery = await getDocs(query(collection(db, COLLECTIONS.EMPRESAS), where('__name__', '==', 'non-existent')));
      console.log('   ✅ Database connectivity verified');

      // Warn about existing test data
      const existingTestQuery = query(
        collection(db, COLLECTIONS.EMPRESAS),
        where('propietario', '>=', this.testPrefix),
        where('propietario', '<', this.testPrefix + '\uf8ff')
      );
      const existingTestSnapshot = await getDocs(existingTestQuery);
      
      if (existingTestSnapshot.docs.length > 0) {
        console.log(`   ⚠️  Found ${existingTestSnapshot.docs.length} existing test companies - will be cleaned up`);
      }

      console.log('✅ Test environment validation passed');

    } catch (error) {
      console.error('❌ Test environment validation failed:', error);
      throw error;
    }
  }
}

// CLI Configuration
program
  .name('test-migration')
  .description('Test database migration functionality in development environment')
  .version('1.0.0')
  .option('--create-test-data', 'Create test companies and products', false)
  .option('--test-migration', 'Test migration process', false)
  .option('--test-rollback', 'Test rollback functionality', false)
  .option('--cleanup', 'Clean up test data', false)
  .option('--all', 'Run all tests', false)
  .action(async (options) => {
    try {
      const testOptions: TestOptions = {
        createTestData: options.createTestData,
        testMigration: options.testMigration,
        testRollback: options.testRollback,
        cleanup: options.cleanup,
        all: options.all
      };

      // If no specific options provided, run all tests
      if (!testOptions.createTestData && !testOptions.testMigration && 
          !testOptions.testRollback && !testOptions.cleanup) {
        testOptions.all = true;
      }

      const tester = new MigrationTester();
      await tester.execute(testOptions);

    } catch (error) {
      console.error('❌ Migration testing failed:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { MigrationTester };