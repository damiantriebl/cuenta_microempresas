/**
 * Migration Integration Tests
 * 
 * Comprehensive tests for the database migration process including:
 * - Migration execution
 * - Data integrity validation
 * - Rollback functionality
 * - Error handling
 */

import { MigrationService } from '@/services/MigrationService';
import { CompanyService } from '@/services/CompanyService';
import { ProductService } from '@/services/ProductService';
import { MigrationExecutor } from '../execute-migration';
import { RollbackExecutor } from '../rollback-migration';
import { MigrationTester } from '../test-migration';
import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { COLLECTIONS } from '@/schemas/types';

describe('Migration Integration Tests', () => {
  let migrationService: MigrationService;
  let companyService: CompanyService;
  let productService: ProductService;
  let testCompanyIds: string[] = [];
  const testPrefix = 'JEST_TEST_MIGRATION_';

  beforeAll(async () => {
    migrationService = MigrationService.getInstance();
    companyService = CompanyService.getInstance();
    productService = ProductService.getInstance();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData();
    testCompanyIds = [];
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  describe('Migration Service Core Functionality', () => {
    test('should identify companies needing name migration', async () => {
      // Create test company without name
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test1@example.com`,
        creado: Timestamp.now()
      });

      const needsMigration = await migrationService.checkCompanyNeedsMigration(companyId);
      expect(needsMigration).toBe(true);
    });

    test('should identify products needing data migration', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test2@example.com`,
        creado: Timestamp.now()
      });

      // Create products with missing fields
      await createTestProduct(companyId, {
        nombre: 'Test Product 1',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
        // Missing ultimoCosto and ultimaGanancia
      });

      await createTestProduct(companyId, {
        nombre: 'Test Product 2',
        colorFondo: '#00FF00',
        posicion: 1,
        ultimoCosto: 10,
        activo: true,
        creado: Timestamp.now()
        // Missing ultimaGanancia
      });

      const productsNeedingMigration = await migrationService.checkProductsNeedMigration(companyId);
      expect(productsNeedingMigration).toHaveLength(2);
    });

    test('should create and validate backup', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test3@example.com`,
        creado: Timestamp.now()
      });

      await createTestProduct(companyId, {
        nombre: 'Backup Test Product',
        colorFondo: '#0000FF',
        posicion: 0,
        ultimoCosto: 5,
        ultimaGanancia: 2,
        activo: true,
        creado: Timestamp.now()
      });

      const backupId = await migrationService.createBackup(companyId);
      expect(backupId).toBeDefined();

      const isValid = await migrationService.validateBackup(backupId);
      expect(isValid).toBe(true);

      const backup = await migrationService.getBackup(backupId);
      expect(backup).toBeDefined();
      expect(backup?.empresaId).toBe(companyId);
      expect(backup?.backupData.productos).toHaveLength(1);
    });

    test('should migrate company name successfully', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test4@example.com`,
        creado: Timestamp.now()
      });

      await migrationService.migrateCompanyName(companyId, 'Test Company Name');

      const validation = await migrationService.validateCompanyNameMigration(companyId);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const company = await companyService.getCompany(companyId);
      expect(company?.nombre).toBe('Test Company Name');
    });

    test('should migrate product data successfully', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test5@example.com`,
        creado: Timestamp.now()
      });

      const productId = await createTestProduct(companyId, {
        nombre: 'Migration Test Product',
        colorFondo: '#FFFF00',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
        // Missing cost and profit fields
      });

      await migrationService.migrateProductData(companyId, productId, 10, 5);

      const validation = await migrationService.validateProductData(companyId, productId);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.missingFields).toHaveLength(0);
    });

    test('should perform complete migration validation', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}test6@example.com`,
        creado: Timestamp.now()
      });

      await createTestProduct(companyId, {
        nombre: 'Complete Test Product',
        colorFondo: '#FF00FF',
        posicion: 0,
        ultimoCosto: 15,
        ultimaGanancia: 8,
        activo: true,
        creado: Timestamp.now()
      });

      // Migrate company name
      await migrationService.migrateCompanyName(companyId, 'Complete Test Company');

      // Validate complete migration
      const validation = await migrationService.validateMigrationComplete(companyId);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Rollback Functionality', () => {
    test('should rollback migration successfully', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}rollback@example.com`,
        creado: Timestamp.now()
      });

      await createTestProduct(companyId, {
        nombre: 'Rollback Test Product',
        colorFondo: '#00FFFF',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
        // Missing cost and profit
      });

      // Create backup before migration
      const backupId = await migrationService.createBackup(companyId);

      // Perform migration
      await migrationService.migrateCompanyName(companyId, 'Rollback Test Company');
      await migrationService.migrateAllProductsData(companyId, {
        ultimoCosto: 20,
        ultimaGanancia: 10
      });

      // Verify migration was successful
      const company = await companyService.getCompany(companyId);
      expect(company?.nombre).toBe('Rollback Test Company');

      // Perform rollback
      await migrationService.rollbackMigration(backupId);

      // Validate rollback
      const rollbackValidation = await migrationService.validateRollback(backupId);
      expect(rollbackValidation.isValid).toBe(true);

      // Verify data was restored (company name might still exist if it was in backup)
      const restoredCompany = await companyService.getCompany(companyId);
      expect(restoredCompany).toBeDefined();
    });

    test('should create rollback plan', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}plan@example.com`,
        creado: Timestamp.now()
      });

      const backupId = await migrationService.createBackup(companyId);
      const rollbackPlan = await migrationService.createRollbackPlan(backupId);

      expect(rollbackPlan).toBeDefined();
      expect(rollbackPlan.rollbackSteps).toBeInstanceOf(Array);
      expect(rollbackPlan.validationChecks).toBeInstanceOf(Array);
      expect(rollbackPlan.manualSteps).toBeInstanceOf(Array);
      expect(rollbackPlan.rollbackSteps.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid company ID gracefully', async () => {
      const invalidCompanyId = 'non-existent-company';
      
      await expect(migrationService.checkCompanyNeedsMigration(invalidCompanyId))
        .rejects.toThrow();
    });

    test('should handle invalid backup ID gracefully', async () => {
      const invalidBackupId = 'non-existent-backup';
      
      const backup = await migrationService.getBackup(invalidBackupId);
      expect(backup).toBeNull();
    });

    test('should validate company name requirements', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}validation@example.com`,
        creado: Timestamp.now()
      });

      // Test empty name
      await expect(migrationService.migrateCompanyName(companyId, ''))
        .rejects.toThrow();

      // Test very long name
      const longName = 'a'.repeat(200);
      await expect(migrationService.migrateCompanyName(companyId, longName))
        .rejects.toThrow();
    });

    test('should handle product validation errors', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}product-validation@example.com`,
        creado: Timestamp.now()
      });

      const productId = await createTestProduct(companyId, {
        nombre: 'Invalid Product',
        colorFondo: '#000000',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      });

      // Test negative values
      await expect(migrationService.migrateProductData(companyId, productId, -5, -2))
        .rejects.toThrow();
    });
  });

  describe('Migration Status Tracking', () => {
    test('should track migration status correctly', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}status@example.com`,
        creado: Timestamp.now()
      });

      // Update migration status
      await migrationService.updateMigrationStatus({
        empresaId: companyId,
        nombreAdded: true,
        productsValidated: true,
        backupCreated: true,
        migrationCompleted: true,
        errors: []
      });

      // Retrieve migration status
      const status = await migrationService.getMigrationStatus(companyId);
      expect(status).toBeDefined();
      expect(status?.empresaId).toBe(companyId);
      expect(status?.migrationCompleted).toBe(true);
      expect(status?.errors).toHaveLength(0);
    });

    test('should track migration errors', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}errors@example.com`,
        creado: Timestamp.now()
      });

      const testErrors = ['Test error 1', 'Test error 2'];

      await migrationService.updateMigrationStatus({
        empresaId: companyId,
        nombreAdded: false,
        productsValidated: false,
        backupCreated: false,
        migrationCompleted: false,
        errors: testErrors
      });

      const status = await migrationService.getMigrationStatus(companyId);
      expect(status?.errors).toEqual(testErrors);
      expect(status?.migrationCompleted).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    test('should migrate multiple companies', async () => {
      // Create multiple test companies
      const company1Id = await createTestCompany({
        propietario: `${testPrefix}bulk1@example.com`,
        creado: Timestamp.now()
      });

      const company2Id = await createTestCompany({
        propietario: `${testPrefix}bulk2@example.com`,
        creado: Timestamp.now()
      });

      // Migrate all company names
      const result = await migrationService.migrateAllCompanyNames({
        [company1Id]: 'Bulk Test Company 1',
        [company2Id]: 'Bulk Test Company 2'
      });

      expect(result.successful).toContain(company1Id);
      expect(result.successful).toContain(company2Id);
      expect(result.failed).toHaveLength(0);

      // Verify migrations
      const company1 = await companyService.getCompany(company1Id);
      const company2 = await companyService.getCompany(company2Id);
      
      expect(company1?.nombre).toBe('Bulk Test Company 1');
      expect(company2?.nombre).toBe('Bulk Test Company 2');
    });

    test('should migrate multiple products', async () => {
      const companyId = await createTestCompany({
        propietario: `${testPrefix}bulk-products@example.com`,
        creado: Timestamp.now()
      });

      // Create multiple products with missing fields
      await createTestProduct(companyId, {
        nombre: 'Bulk Product 1',
        colorFondo: '#111111',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      });

      await createTestProduct(companyId, {
        nombre: 'Bulk Product 2',
        colorFondo: '#222222',
        posicion: 1,
        activo: true,
        creado: Timestamp.now()
      });

      const result = await migrationService.migrateAllProductsData(companyId, {
        ultimoCosto: 25,
        ultimaGanancia: 15
      });

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);

      // Verify all products are valid
      const validation = await migrationService.validateAllProductsData(companyId);
      expect(validation.isAllValid).toBe(true);
      expect(validation.totalProducts).toBe(2);
      expect(validation.validProducts).toBe(2);
    });
  });

  // Helper functions
  async function createTestCompany(companyData: any): Promise<string> {
    const companyRef = await addDoc(collection(db, COLLECTIONS.EMPRESAS), companyData);
    testCompanyIds.push(companyRef.id);
    return companyRef.id;
  }

  async function createTestProduct(companyId: string, productData: any): Promise<string> {
    const productRef = await addDoc(
      collection(db, COLLECTIONS.EMPRESAS, companyId, COLLECTIONS.PRODUCTOS),
      productData
    );
    return productRef.id;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      // Find all test companies
      const companiesRef = collection(db, COLLECTIONS.EMPRESAS);
      const testCompaniesQuery = query(
        companiesRef,
        where('propietario', '>=', testPrefix),
        where('propietario', '<', testPrefix + '\uf8ff')
      );
      
      const testCompaniesSnapshot = await getDocs(testCompaniesQuery);
      const foundTestCompanies = testCompaniesSnapshot.docs.map(doc => doc.id);

      // Delete test companies and their products
      for (const companyId of foundTestCompanies) {
        // Delete all products in the company
        const productsRef = collection(db, COLLECTIONS.EMPRESAS, companyId, COLLECTIONS.PRODUCTOS);
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          await deleteDoc(productDoc.ref);
        }

        // Delete the company
        await deleteDoc(doc(db, COLLECTIONS.EMPRESAS, companyId));
      }

      // Clean up test backups
      if (foundTestCompanies.length > 0) {
        const backupsRef = collection(db, 'migration_backups');
        const testBackupsQuery = query(
          backupsRef,
          where('empresaId', 'in', foundTestCompanies)
        );
        
        const testBackupsSnapshot = await getDocs(testBackupsQuery);
        for (const backupDoc of testBackupsSnapshot.docs) {
          await deleteDoc(backupDoc.ref);
        }
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
      testCompanyIds = [];

    } catch (error) {
      console.warn('Cleanup failed:', error);
      // Don't throw - cleanup failure shouldn't fail tests
    }
  }
});