import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  writeBatch,
  DocumentSnapshot,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { 
  Company, 
  Product, 
  MigrationStatus, 
  MigrationBackup, 
  ProductMigrationData, 
  CompanyMigrationData,
  MigrationRecovery,
  COLLECTIONS,
  CreateMigrationStatusData,
  CreateMigrationBackupData
} from '@/schemas/types';
import { 
  getCompanyRef, 
  getProductsRef, 
  getCompany, 
  getProducts 
} from '@/schemas/firestore-utils';

/**
 * Service for handling database migration operations including backup and rollback functionality
 */
export class MigrationService {
  private static instance: MigrationService;
  
  private constructor() {}
  
  public static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  // ============================================================================
  // BACKUP FUNCTIONALITY
  // ============================================================================

  /**
   * Creates a backup of company and product data before migration
   */
  public async createBackup(empresaId: string): Promise<string> {
    const context = 'MigrationService.createBackup';
    console.log(`${context}: Starting backup creation`, { empresaId });

    try {
      // Step 1: Get current company data
      const company = await getCompany(empresaId);
      if (!company) {
        throw new Error(`Company ${empresaId} not found`);
      }

      // Step 2: Get all products (including inactive ones for complete backup)
      const productsRef = getProductsRef(empresaId);
      const productsSnapshot = await getDocs(productsRef);
      const productos = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Step 3: Create backup document
      const backupData: CreateMigrationBackupData = {
        empresaId,
        backupData: {
          empresa: company,
          productos
        }
      };

      const backup: MigrationBackup = {
        id: '', // Will be set by Firestore
        ...backupData,
        creado: Timestamp.now()
      };

      // Step 4: Store backup in Firestore
      const backupRef = await addDoc(collection(db, 'migration_backups'), backup);
      
      console.log(`${context}: Backup created successfully`, { 
        empresaId, 
        backupId: backupRef.id,
        companyName: company.nombre,
        productCount: productos.length
      });

      return backupRef.id;
    } catch (error) {
      console.error(`${context}: Failed to create backup`, { empresaId, error });
      throw new Error(`Failed to create backup for company ${empresaId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that a backup was created successfully and contains expected data
   */
  public async validateBackup(backupId: string): Promise<boolean> {
    const context = 'MigrationService.validateBackup';
    console.log(`${context}: Validating backup`, { backupId });

    try {
      const backupDoc = await getDoc(doc(db, 'migration_backups', backupId));
      
      if (!backupDoc.exists()) {
        console.error(`${context}: Backup document not found`, { backupId });
        return false;
      }

      const backup = { id: backupDoc.id, ...backupDoc.data() } as MigrationBackup;
      
      // Validate backup structure
      const isValid = !!(
        backup.empresaId &&
        backup.backupData &&
        backup.backupData.empresa &&
        Array.isArray(backup.backupData.productos) &&
        backup.creado
      );

      console.log(`${context}: Backup validation result`, { 
        backupId, 
        isValid,
        empresaId: backup.empresaId,
        hasCompanyData: !!backup.backupData?.empresa,
        productCount: backup.backupData?.productos?.length || 0
      });

      return isValid;
    } catch (error) {
      console.error(`${context}: Error validating backup`, { backupId, error });
      return false;
    }
  }

  /**
   * Retrieves backup data for a specific backup ID
   */
  public async getBackup(backupId: string): Promise<MigrationBackup | null> {
    const context = 'MigrationService.getBackup';
    
    try {
      const backupDoc = await getDoc(doc(db, 'migration_backups', backupId));
      
      if (!backupDoc.exists()) {
        console.log(`${context}: Backup not found`, { backupId });
        return null;
      }

      const backup = { id: backupDoc.id, ...backupDoc.data() } as MigrationBackup;
      console.log(`${context}: Backup retrieved`, { 
        backupId, 
        empresaId: backup.empresaId,
        createdAt: backup.creado
      });

      return backup;
    } catch (error) {
      console.error(`${context}: Error retrieving backup`, { backupId, error });
      throw error;
    }
  }

  /**
   * Lists all backups for a specific company
   */
  public async getCompanyBackups(empresaId: string): Promise<MigrationBackup[]> {
    const context = 'MigrationService.getCompanyBackups';
    
    try {
      const q = query(
        collection(db, 'migration_backups'),
        where('empresaId', '==', empresaId),
        orderBy('creado', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const backups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MigrationBackup));

      console.log(`${context}: Retrieved company backups`, { 
        empresaId, 
        backupCount: backups.length 
      });

      return backups;
    } catch (error) {
      console.error(`${context}: Error retrieving company backups`, { empresaId, error });
      throw error;
    }
  }

  // ============================================================================
  // MIGRATION STATUS TRACKING
  // ============================================================================

  /**
   * Creates or updates migration status for a company
   */
  public async updateMigrationStatus(statusData: CreateMigrationStatusData): Promise<void> {
    const context = 'MigrationService.updateMigrationStatus';
    
    try {
      const status: MigrationStatus = {
        ...statusData,
        timestamp: Timestamp.now()
      };

      await setDoc(doc(db, 'migration_status', statusData.empresaId), status);
      
      console.log(`${context}: Migration status updated`, { 
        empresaId: statusData.empresaId,
        status: statusData
      });
    } catch (error) {
      console.error(`${context}: Error updating migration status`, { 
        empresaId: statusData.empresaId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Retrieves migration status for a company
   */
  public async getMigrationStatus(empresaId: string): Promise<MigrationStatus | null> {
    const context = 'MigrationService.getMigrationStatus';
    
    try {
      const statusDoc = await getDoc(doc(db, 'migration_status', empresaId));
      
      if (!statusDoc.exists()) {
        console.log(`${context}: No migration status found`, { empresaId });
        return null;
      }

      const status = statusDoc.data() as MigrationStatus;
      console.log(`${context}: Migration status retrieved`, { 
        empresaId, 
        migrationCompleted: status.migrationCompleted,
        hasErrors: status.errors.length > 0
      });

      return status;
    } catch (error) {
      console.error(`${context}: Error retrieving migration status`, { empresaId, error });
      throw error;
    }
  }

  // ============================================================================
  // COMPANY NAME MIGRATION
  // ============================================================================

  /**
   * Identifies companies that are missing the 'nombre' field
   */
  public async getCompaniesNeedingNameMigration(): Promise<CompanyMigrationData[]> {
    const context = 'MigrationService.getCompaniesNeedingNameMigration';
    console.log(`${context}: Starting company name migration check`);

    try {
      const companiesRef = collection(db, COLLECTIONS.EMPRESAS);
      const companiesSnapshot = await getDocs(companiesRef);
      
      const companiesNeedingMigration: CompanyMigrationData[] = [];
      
      companiesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const company = { id: doc.id, ...data } as Company;
        
        const needsMigration = !company.nombre || company.nombre.trim() === '';
        
        if (needsMigration) {
          companiesNeedingMigration.push({
            ...company,
            needsMigration: true
          } as CompanyMigrationData);
        }
      });

      console.log(`${context}: Found companies needing migration`, { 
        totalCompanies: companiesSnapshot.docs.length,
        companiesNeedingMigration: companiesNeedingMigration.length,
        companyIds: companiesNeedingMigration.map(c => c.id)
      });

      return companiesNeedingMigration;
    } catch (error) {
      console.error(`${context}: Error checking companies for migration`, { error });
      throw error;
    }
  }

  /**
   * Migrates a company by adding a nombre field
   * @param empresaId - Company ID to migrate
   * @param nombre - Company name to set (optional, will prompt user if not provided)
   */
  public async migrateCompanyName(empresaId: string, nombre?: string): Promise<void> {
    const context = 'MigrationService.migrateCompanyName';
    console.log(`${context}: Starting company name migration`, { empresaId, hasNombre: !!nombre });

    try {
      // Get current company data
      const company = await getCompany(empresaId);
      if (!company) {
        throw new Error(`Company ${empresaId} not found`);
      }

      // Determine the name to use
      let companyName = nombre;
      if (!companyName) {
        // Use a default naming strategy based on owner email
        const ownerEmail = company.propietario;
        companyName = this.generateDefaultCompanyName(ownerEmail);
        console.log(`${context}: Generated default company name`, { 
          empresaId, 
          ownerEmail, 
          generatedName: companyName 
        });
      }

      // Validate the name
      const validationResult = this.validateCompanyName(companyName);
      if (!validationResult.isValid) {
        throw new Error(`Invalid company name: ${validationResult.errors.join(', ')}`);
      }

      // Update the company document
      const companyRef = getCompanyRef(empresaId);
      await updateDoc(companyRef, {
        nombre: companyName,
        actualizado: Timestamp.now()
      });

      console.log(`${context}: Company name migration completed`, { 
        empresaId, 
        nombre: companyName 
      });
    } catch (error) {
      console.error(`${context}: Error migrating company name`, { empresaId, error });
      throw error;
    }
  }

  /**
   * Migrates all companies that need name migration
   * @param nameMapping - Optional mapping of company IDs to names
   */
  public async migrateAllCompanyNames(nameMapping?: Record<string, string>): Promise<{ 
    successful: string[], 
    failed: { empresaId: string, error: string }[] 
  }> {
    const context = 'MigrationService.migrateAllCompanyNames';
    console.log(`${context}: Starting bulk company name migration`, { 
      hasNameMapping: !!nameMapping,
      mappingCount: nameMapping ? Object.keys(nameMapping).length : 0
    });

    const successful: string[] = [];
    const failed: { empresaId: string, error: string }[] = [];

    try {
      const companiesNeedingMigration = await this.getCompaniesNeedingNameMigration();
      
      console.log(`${context}: Processing companies`, { 
        count: companiesNeedingMigration.length 
      });

      for (const company of companiesNeedingMigration) {
        try {
          const nombre = nameMapping?.[company.id];
          await this.migrateCompanyName(company.id, nombre);
          successful.push(company.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ empresaId: company.id, error: errorMessage });
          console.error(`${context}: Failed to migrate company`, { 
            empresaId: company.id, 
            error: errorMessage 
          });
        }
      }

      console.log(`${context}: Bulk migration completed`, { 
        successful: successful.length,
        failed: failed.length,
        successfulIds: successful,
        failedIds: failed.map(f => f.empresaId)
      });

      return { successful, failed };
    } catch (error) {
      console.error(`${context}: Error in bulk company name migration`, { error });
      throw error;
    }
  }

  /**
   * Generates a default company name based on owner email
   */
  private generateDefaultCompanyName(ownerEmail: string): string {
    // Extract username from email and create a readable company name
    const username = ownerEmail.split('@')[0];
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, ' ').trim();
    
    // Capitalize first letter of each word
    const capitalizedName = cleanUsername
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return `${capitalizedName} Company`;
  }

  /**
   * Validates a company name
   */
  private validateCompanyName(nombre: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!nombre || nombre.trim() === '') {
      errors.push('Company name cannot be empty');
    }
    
    if (nombre && nombre.trim().length < 2) {
      errors.push('Company name must be at least 2 characters long');
    }
    
    if (nombre && nombre.trim().length > 100) {
      errors.push('Company name cannot exceed 100 characters');
    }
    
    // Check for invalid characters (basic validation)
    if (nombre && !/^[a-zA-Z0-9\s\-_.,&()]+$/.test(nombre.trim())) {
      errors.push('Company name contains invalid characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates that company name migration was successful
   */
  public async validateCompanyNameMigration(empresaId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const context = 'MigrationService.validateCompanyNameMigration';
    const errors: string[] = [];
    
    try {
      const company = await getCompany(empresaId);
      
      if (!company) {
        errors.push('Company not found');
      } else {
        if (!company.nombre || company.nombre.trim() === '') {
          errors.push('Company still missing nombre field');
        } else {
          const validationResult = this.validateCompanyName(company.nombre);
          if (!validationResult.isValid) {
            errors.push(...validationResult.errors);
          }
        }
      }
      
      const isValid = errors.length === 0;
      
      console.log(`${context}: Company name migration validation`, { 
        empresaId, 
        isValid, 
        errors 
      });
      
      return { isValid, errors };
    } catch (error) {
      console.error(`${context}: Error validating company name migration`, { empresaId, error });
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

  // ============================================================================
  // PRODUCT DATA MIGRATION
  // ============================================================================

  /**
   * Migrates a product by adding missing required fields
   * @param empresaId - Company ID
   * @param productId - Product ID to migrate
   * @param defaultCosto - Default cost value (defaults to 0)
   * @param defaultGanancia - Default profit value (defaults to 0)
   */
  public async migrateProductData(
    empresaId: string, 
    productId: string, 
    defaultCosto: number = 0, 
    defaultGanancia: number = 0
  ): Promise<void> {
    const context = 'MigrationService.migrateProductData';
    console.log(`${context}: Starting product data migration`, { 
      empresaId, 
      productId, 
      defaultCosto, 
      defaultGanancia 
    });

    try {
      // Get current product data
      const productRef = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.PRODUCTOS, productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error(`Product ${productId} not found in company ${empresaId}`);
      }

      const productData = productDoc.data();
      const updates: any = {};
      let needsUpdate = false;

      // Check and add missing ultimoCosto
      if (productData.ultimoCosto === undefined || productData.ultimoCosto === null) {
        updates.ultimoCosto = defaultCosto;
        needsUpdate = true;
        console.log(`${context}: Adding missing ultimoCosto`, { 
          empresaId, 
          productId, 
          defaultCosto 
        });
      }

      // Check and add missing ultimaGanancia
      if (productData.ultimaGanancia === undefined || productData.ultimaGanancia === null) {
        updates.ultimaGanancia = defaultGanancia;
        needsUpdate = true;
        console.log(`${context}: Adding missing ultimaGanancia`, { 
          empresaId, 
          productId, 
          defaultGanancia 
        });
      }

      // Update the product if needed
      if (needsUpdate) {
        updates.actualizado = Timestamp.now();
        await updateDoc(productRef, updates);
        
        console.log(`${context}: Product data migration completed`, { 
          empresaId, 
          productId, 
          updates 
        });
      } else {
        console.log(`${context}: Product already has required fields`, { 
          empresaId, 
          productId 
        });
      }
    } catch (error) {
      console.error(`${context}: Error migrating product data`, { 
        empresaId, 
        productId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Migrates all products in a company that need data migration
   * @param empresaId - Company ID
   * @param defaultValues - Default values for missing fields
   */
  public async migrateAllProductsData(
    empresaId: string, 
    defaultValues: { ultimoCosto?: number; ultimaGanancia?: number } = {}
  ): Promise<{ 
    successful: string[], 
    failed: { productId: string, error: string }[] 
  }> {
    const context = 'MigrationService.migrateAllProductsData';
    console.log(`${context}: Starting bulk product data migration`, { 
      empresaId, 
      defaultValues 
    });

    const successful: string[] = [];
    const failed: { productId: string, error: string }[] = [];

    try {
      const productsNeedingMigration = await this.checkProductsNeedMigration(empresaId);
      
      console.log(`${context}: Processing products`, { 
        empresaId,
        count: productsNeedingMigration.length 
      });

      for (const product of productsNeedingMigration) {
        try {
          await this.migrateProductData(
            empresaId, 
            product.id, 
            defaultValues.ultimoCosto ?? 0, 
            defaultValues.ultimaGanancia ?? 0
          );
          successful.push(product.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ productId: product.id, error: errorMessage });
          console.error(`${context}: Failed to migrate product`, { 
            empresaId, 
            productId: product.id, 
            error: errorMessage 
          });
        }
      }

      console.log(`${context}: Bulk product migration completed`, { 
        empresaId,
        successful: successful.length,
        failed: failed.length,
        successfulIds: successful,
        failedIds: failed.map(f => f.productId)
      });

      return { successful, failed };
    } catch (error) {
      console.error(`${context}: Error in bulk product data migration`, { empresaId, error });
      throw error;
    }
  }

  /**
   * Validates product data completeness
   */
  public async validateProductData(empresaId: string, productId: string): Promise<{ 
    isValid: boolean; 
    errors: string[];
    missingFields: string[];
  }> {
    const context = 'MigrationService.validateProductData';
    const errors: string[] = [];
    const missingFields: string[] = [];
    
    try {
      const productRef = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.PRODUCTOS, productId);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        errors.push('Product not found');
        return { isValid: false, errors, missingFields };
      }

      const productData = productDoc.data();
      
      // Check required fields
      if (productData.ultimoCosto === undefined || productData.ultimoCosto === null) {
        errors.push('Product missing ultimoCosto field');
        missingFields.push('ultimoCosto');
      } else if (typeof productData.ultimoCosto !== 'number' || productData.ultimoCosto < 0) {
        errors.push('Product ultimoCosto must be a non-negative number');
      }
      
      if (productData.ultimaGanancia === undefined || productData.ultimaGanancia === null) {
        errors.push('Product missing ultimaGanancia field');
        missingFields.push('ultimaGanancia');
      } else if (typeof productData.ultimaGanancia !== 'number' || productData.ultimaGanancia < 0) {
        errors.push('Product ultimaGanancia must be a non-negative number');
      }
      
      // Check other essential fields
      if (!productData.nombre || productData.nombre.trim() === '') {
        errors.push('Product missing or empty nombre field');
        missingFields.push('nombre');
      }
      
      if (productData.posicion === undefined || productData.posicion === null) {
        errors.push('Product missing posicion field');
        missingFields.push('posicion');
      } else if (typeof productData.posicion !== 'number' || productData.posicion < 0) {
        errors.push('Product posicion must be a non-negative number');
      }
      
      const isValid = errors.length === 0;
      
      console.log(`${context}: Product data validation`, { 
        empresaId, 
        productId, 
        isValid, 
        errors,
        missingFields
      });
      
      return { isValid, errors, missingFields };
    } catch (error) {
      console.error(`${context}: Error validating product data`, { empresaId, productId, error });
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, missingFields };
    }
  }

  /**
   * Validates all products in a company for data completeness
   */
  public async validateAllProductsData(empresaId: string): Promise<{
    totalProducts: number;
    validProducts: number;
    invalidProducts: { productId: string; errors: string[]; missingFields: string[] }[];
    isAllValid: boolean;
  }> {
    const context = 'MigrationService.validateAllProductsData';
    console.log(`${context}: Starting bulk product validation`, { empresaId });

    try {
      const productsRef = getProductsRef(empresaId);
      const productsSnapshot = await getDocs(productsRef);
      
      const invalidProducts: { productId: string; errors: string[]; missingFields: string[] }[] = [];
      let validProducts = 0;
      
      for (const productDoc of productsSnapshot.docs) {
        const validation = await this.validateProductData(empresaId, productDoc.id);
        
        if (validation.isValid) {
          validProducts++;
        } else {
          invalidProducts.push({
            productId: productDoc.id,
            errors: validation.errors,
            missingFields: validation.missingFields
          });
        }
      }
      
      const result = {
        totalProducts: productsSnapshot.docs.length,
        validProducts,
        invalidProducts,
        isAllValid: invalidProducts.length === 0
      };
      
      console.log(`${context}: Bulk product validation completed`, { 
        empresaId,
        ...result
      });
      
      return result;
    } catch (error) {
      console.error(`${context}: Error in bulk product validation`, { empresaId, error });
      throw error;
    }
  }

  /**
   * Generates a product migration report
   */
  public async generateProductMigrationReport(empresaId: string): Promise<{
    summary: {
      totalProducts: number;
      productsNeedingMigration: number;
      missingCostoCount: number;
      missingGananciaCount: number;
    };
    productsNeedingMigration: ProductMigrationData[];
    recommendations: string[];
  }> {
    const context = 'MigrationService.generateProductMigrationReport';
    console.log(`${context}: Generating product migration report`, { empresaId });

    try {
      const productsNeedingMigration = await this.checkProductsNeedMigration(empresaId);
      const allProductsRef = getProductsRef(empresaId);
      const allProductsSnapshot = await getDocs(allProductsRef);
      
      let missingCostoCount = 0;
      let missingGananciaCount = 0;
      
      productsNeedingMigration.forEach(product => {
        if (product.ultimoCosto === undefined) missingCostoCount++;
        if (product.ultimaGanancia === undefined) missingGananciaCount++;
      });
      
      const recommendations: string[] = [];
      
      if (productsNeedingMigration.length > 0) {
        recommendations.push(`${productsNeedingMigration.length} products need migration`);
        
        if (missingCostoCount > 0) {
          recommendations.push(`${missingCostoCount} products missing cost data - consider setting realistic default values`);
        }
        
        if (missingGananciaCount > 0) {
          recommendations.push(`${missingGananciaCount} products missing profit data - consider setting realistic default values`);
        }
        
        recommendations.push('Create backup before running migration');
        recommendations.push('Review default values before applying migration');
      } else {
        recommendations.push('All products have required fields - no migration needed');
      }
      
      const report = {
        summary: {
          totalProducts: allProductsSnapshot.docs.length,
          productsNeedingMigration: productsNeedingMigration.length,
          missingCostoCount,
          missingGananciaCount
        },
        productsNeedingMigration,
        recommendations
      };
      
      console.log(`${context}: Product migration report generated`, { 
        empresaId,
        summary: report.summary
      });
      
      return report;
    } catch (error) {
      console.error(`${context}: Error generating product migration report`, { empresaId, error });
      throw error;
    }
  }

  // ============================================================================
  // ROLLBACK FUNCTIONALITY
  // ============================================================================

  /**
   * Rolls back a migration using backup data
   * @param backupId - ID of the backup to restore from
   */
  public async rollbackMigration(backupId: string): Promise<void> {
    const context = 'MigrationService.rollbackMigration';
    console.log(`${context}: Starting migration rollback`, { backupId });

    try {
      // Step 1: Retrieve and validate backup
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const isValidBackup = await this.validateBackup(backupId);
      if (!isValidBackup) {
        throw new Error(`Backup ${backupId} is invalid or corrupted`);
      }

      const { empresa, productos } = backup.backupData;
      const empresaId = backup.empresaId;

      console.log(`${context}: Backup validated, starting rollback`, { 
        empresaId, 
        backupId,
        companyData: !!empresa,
        productCount: productos?.length || 0
      });

      // Step 2: Create a batch for atomic operations
      const batch = writeBatch(db);

      // Step 3: Restore company data
      if (empresa) {
        const companyRef = getCompanyRef(empresaId);
        batch.set(companyRef, empresa);
        console.log(`${context}: Company data queued for restoration`, { empresaId });
      }

      // Step 4: Restore products data
      if (productos && Array.isArray(productos)) {
        for (const producto of productos) {
          const productRef = doc(db, COLLECTIONS.EMPRESAS, empresaId, COLLECTIONS.PRODUCTOS, producto.id);
          const { id, ...productData } = producto; // Remove id from data
          batch.set(productRef, productData);
        }
        console.log(`${context}: Products data queued for restoration`, { 
          empresaId, 
          productCount: productos.length 
        });
      }

      // Step 5: Execute the batch operation
      await batch.commit();

      // Step 6: Mark backup as restored
      const backupRef = doc(db, 'migration_backups', backupId);
      await updateDoc(backupRef, {
        restored: true,
        restoredAt: Timestamp.now()
      });

      // Step 7: Update migration status
      await this.updateMigrationStatus({
        empresaId,
        nombreAdded: false, // Reset migration flags
        productsValidated: false,
        backupCreated: true,
        migrationCompleted: false,
        errors: [`Migration rolled back from backup ${backupId}`]
      });

      console.log(`${context}: Migration rollback completed successfully`, { 
        empresaId, 
        backupId 
      });
    } catch (error) {
      console.error(`${context}: Error during migration rollback`, { backupId, error });
      throw new Error(`Failed to rollback migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that rollback was successful
   * @param backupId - ID of the backup that was used for rollback
   */
  public async validateRollback(backupId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const context = 'MigrationService.validateRollback';
    const errors: string[] = [];

    try {
      // Get the backup data
      const backup = await this.getBackup(backupId);
      if (!backup) {
        errors.push('Backup not found');
        return { isValid: false, errors };
      }

      const { empresa, productos } = backup.backupData;
      const empresaId = backup.empresaId;

      console.log(`${context}: Validating rollback`, { empresaId, backupId });

      // Validate company data was restored
      if (empresa) {
        const currentCompany = await getCompany(empresaId);
        if (!currentCompany) {
          errors.push('Company not found after rollback');
        } else {
          // Check key fields match
          if (currentCompany.propietario !== empresa.propietario) {
            errors.push('Company propietario does not match backup');
          }
          // Note: We don't check 'nombre' field as it might have been added during migration
        }
      }

      // Validate products data was restored
      if (productos && Array.isArray(productos)) {
        const currentProducts = await getProducts(empresaId);
        
        if (currentProducts.length !== productos.length) {
          errors.push(`Product count mismatch: expected ${productos.length}, found ${currentProducts.length}`);
        }

        // Check each product exists and has correct data
        for (const backupProduct of productos) {
          const currentProduct = currentProducts.find(p => p.id === backupProduct.id);
          if (!currentProduct) {
            errors.push(`Product ${backupProduct.id} not found after rollback`);
          } else {
            // Check key fields
            if (currentProduct.nombre !== backupProduct.nombre) {
              errors.push(`Product ${backupProduct.id} name mismatch`);
            }
            if (currentProduct.posicion !== backupProduct.posicion) {
              errors.push(`Product ${backupProduct.id} position mismatch`);
            }
          }
        }
      }

      // Check if backup is marked as restored
      const backupDoc = await getDoc(doc(db, 'migration_backups', backupId));
      if (backupDoc.exists()) {
        const backupData = backupDoc.data();
        if (!backupData.restored) {
          errors.push('Backup not marked as restored');
        }
      }

      const isValid = errors.length === 0;

      console.log(`${context}: Rollback validation completed`, { 
        empresaId, 
        backupId, 
        isValid, 
        errorCount: errors.length 
      });

      return { isValid, errors };
    } catch (error) {
      console.error(`${context}: Error validating rollback`, { backupId, error });
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Creates a rollback plan without executing it
   * @param backupId - ID of the backup to create rollback plan for
   */
  public async createRollbackPlan(backupId: string): Promise<MigrationRecovery> {
    const context = 'MigrationService.createRollbackPlan';
    console.log(`${context}: Creating rollback plan`, { backupId });

    try {
      const backup = await this.getBackup(backupId);
      if (!backup) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const { empresa, productos } = backup.backupData;
      const empresaId = backup.empresaId;

      const rollbackPlan: MigrationRecovery = {
        backupData: [empresa, ...(productos || [])],
        rollbackSteps: [
          `1. Validate backup ${backupId} integrity`,
          `2. Create batch operation for atomic rollback`,
          `3. Restore company data for ${empresaId}`,
          `4. Restore ${productos?.length || 0} products`,
          `5. Mark backup as restored`,
          `6. Update migration status to reflect rollback`,
          `7. Validate rollback success`
        ],
        validationChecks: [
          'Backup exists and is valid',
          'Company data matches backup',
          'All products restored correctly',
          'Product count matches backup',
          'Key fields match backup data',
          'Backup marked as restored'
        ],
        manualSteps: [
          'Review rollback validation results',
          'Check application functionality',
          'Verify user data integrity',
          'Update any dependent systems',
          'Notify users if necessary'
        ]
      };

      console.log(`${context}: Rollback plan created`, { 
        empresaId, 
        backupId,
        stepCount: rollbackPlan.rollbackSteps.length,
        validationCount: rollbackPlan.validationChecks.length
      });

      return rollbackPlan;
    } catch (error) {
      console.error(`${context}: Error creating rollback plan`, { backupId, error });
      throw error;
    }
  }

  /**
   * Lists all available backups for rollback
   */
  public async getAvailableBackupsForRollback(empresaId?: string): Promise<{
    backupId: string;
    empresaId: string;
    createdAt: Timestamp;
    restored: boolean;
    companyName?: string;
    productCount: number;
  }[]> {
    const context = 'MigrationService.getAvailableBackupsForRollback';
    console.log(`${context}: Getting available backups`, { empresaId });

    try {
      let backupsQuery = query(
        collection(db, 'migration_backups'),
        orderBy('creado', 'desc')
      );

      if (empresaId) {
        backupsQuery = query(
          collection(db, 'migration_backups'),
          where('empresaId', '==', empresaId),
          orderBy('creado', 'desc')
        );
      }

      const backupsSnapshot = await getDocs(backupsQuery);
      
      const availableBackups = backupsSnapshot.docs.map(doc => {
        const data = doc.data() as MigrationBackup;
        return {
          backupId: doc.id,
          empresaId: data.empresaId,
          createdAt: data.creado,
          restored: data.restored || false,
          companyName: data.backupData?.empresa?.nombre,
          productCount: data.backupData?.productos?.length || 0
        };
      });

      console.log(`${context}: Found available backups`, { 
        count: availableBackups.length,
        empresaId 
      });

      return availableBackups;
    } catch (error) {
      console.error(`${context}: Error getting available backups`, { empresaId, error });
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Checks if a company needs migration (missing nombre field)
   */
  public async checkCompanyNeedsMigration(empresaId: string): Promise<boolean> {
    const context = 'MigrationService.checkCompanyNeedsMigration';
    
    try {
      const company = await getCompany(empresaId);
      if (!company) {
        console.log(`${context}: Company not found`, { empresaId });
        return false;
      }

      const needsMigration = !company.nombre || company.nombre.trim() === '';
      console.log(`${context}: Company migration check`, { 
        empresaId, 
        hasNombre: !!company.nombre,
        needsMigration 
      });

      return needsMigration;
    } catch (error) {
      console.error(`${context}: Error checking company migration needs`, { empresaId, error });
      throw error;
    }
  }

  /**
   * Checks if products need migration (missing required fields)
   */
  public async checkProductsNeedMigration(empresaId: string): Promise<ProductMigrationData[]> {
    const context = 'MigrationService.checkProductsNeedMigration';
    
    try {
      const productsRef = getProductsRef(empresaId);
      const productsSnapshot = await getDocs(productsRef);
      
      const productsNeedingMigration: ProductMigrationData[] = [];
      
      productsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const product = { id: doc.id, ...data } as Product;
        
        const needsMigration = (
          product.ultimoCosto === undefined || 
          product.ultimaGanancia === undefined
        );
        
        if (needsMigration) {
          productsNeedingMigration.push({
            ...product,
            needsMigration: true
          } as ProductMigrationData);
        }
      });

      console.log(`${context}: Products migration check completed`, { 
        empresaId, 
        totalProducts: productsSnapshot.docs.length,
        productsNeedingMigration: productsNeedingMigration.length
      });

      return productsNeedingMigration;
    } catch (error) {
      console.error(`${context}: Error checking products migration needs`, { empresaId, error });
      throw error;
    }
  }

  /**
   * Validates that all required data is present after migration
   */
  public async validateMigrationComplete(empresaId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const context = 'MigrationService.validateMigrationComplete';
    const errors: string[] = [];
    
    try {
      // Check company has nombre field
      const company = await getCompany(empresaId);
      if (!company) {
        errors.push('Company not found');
      } else if (!company.nombre || company.nombre.trim() === '') {
        errors.push('Company missing nombre field');
      }

      // Check all products have required fields
      const products = await getProducts(empresaId);
      products.forEach(product => {
        if (product.ultimoCosto === undefined) {
          errors.push(`Product ${product.nombre} missing ultimoCosto`);
        }
        if (product.ultimaGanancia === undefined) {
          errors.push(`Product ${product.nombre} missing ultimaGanancia`);
        }
      });

      const isValid = errors.length === 0;
      
      console.log(`${context}: Migration validation completed`, { 
        empresaId, 
        isValid, 
        errorCount: errors.length,
        errors 
      });

      return { isValid, errors };
    } catch (error) {
      console.error(`${context}: Error validating migration`, { empresaId, error });
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors };
    }
  }
}

export default MigrationService;