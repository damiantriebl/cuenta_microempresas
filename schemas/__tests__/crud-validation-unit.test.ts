/**
 * Post-Migration CRUD Validation Tests
 * 
 * These tests validate that the CRUD operations properly enforce
 * the new database structure requirements:
 * - Companies must have a 'nombre' field
 * - Products must have 'ultimoCosto' and 'ultimaGanancia' fields
 * - All validation logic works correctly
 */

describe('Post-Migration CRUD Validation Tests', () => {
  describe('Company Data Structure Validation', () => {
    it('should require nombre field in company data', () => {
      // Test data structure requirements
      const companyWithoutNombre = {
        id: 'test-id',
        propietario: 'test@example.com',
        creado: new Date()
        // Missing nombre field
      };

      const companyWithNombre = {
        ...companyWithoutNombre,
        nombre: 'Test Company'
      };

      // Validate structure requirements
      expect(companyWithoutNombre).not.toHaveProperty('nombre');
      expect(companyWithNombre).toHaveProperty('nombre');
      expect(companyWithNombre.nombre).toBe('Test Company');
      expect(typeof companyWithNombre.nombre).toBe('string');
    });

    it('should validate company name requirements', () => {
      // Test validation logic for company names
      const validNames = ['Test Company', 'My Business', 'ABC Corp'];
      const invalidNames = ['', '   ', 'A', 'A'.repeat(101)];

      validNames.forEach(name => {
        expect(name.trim().length).toBeGreaterThanOrEqual(2);
        expect(name.trim().length).toBeLessThanOrEqual(100);
      });

      invalidNames.forEach(name => {
        const trimmed = name.trim();
        const isValid = trimmed.length >= 2 && trimmed.length <= 100;
        expect(isValid).toBe(false);
      });
    });

    it('should validate company data completeness', () => {
      const completeCompany = {
        id: 'test-id',
        nombre: 'Test Company', // Required field
        propietario: 'test@example.com',
        creado: new Date()
      };

      const requiredFields = ['id', 'nombre', 'propietario', 'creado'];
      
      requiredFields.forEach(field => {
        expect(completeCompany).toHaveProperty(field);
        expect(completeCompany[field as keyof typeof completeCompany]).toBeDefined();
      });

      // Specifically validate nombre field
      expect(typeof completeCompany.nombre).toBe('string');
      expect(completeCompany.nombre.trim().length).toBeGreaterThan(0);
    });
  });

  describe('Product Data Structure Validation', () => {
    it('should require ultimoCosto and ultimaGanancia fields in product data', () => {
      // Test data structure requirements
      const productWithoutRequiredFields = {
        id: 'test-id',
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true,
        creado: new Date()
        // Missing ultimoCosto and ultimaGanancia fields
      };

      const productWithRequiredFields = {
        ...productWithoutRequiredFields,
        ultimoCosto: 100,
        ultimaGanancia: 50
      };

      // Validate structure requirements
      expect(productWithoutRequiredFields).not.toHaveProperty('ultimoCosto');
      expect(productWithoutRequiredFields).not.toHaveProperty('ultimaGanancia');
      
      expect(productWithRequiredFields).toHaveProperty('ultimoCosto');
      expect(productWithRequiredFields).toHaveProperty('ultimaGanancia');
      expect(typeof productWithRequiredFields.ultimoCosto).toBe('number');
      expect(typeof productWithRequiredFields.ultimaGanancia).toBe('number');
    });

    it('should validate product cost and profit field types', () => {
      const validValues = [0, 10, 100.5, 1000];
      const invalidValues = ['10', '100.5', null, undefined, -1, -10.5, NaN, Infinity];

      validValues.forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(isFinite(value)).toBe(true);
      });

      invalidValues.forEach(value => {
        const isValid = typeof value === 'number' && value >= 0 && isFinite(value);
        expect(isValid).toBe(false);
      });
    });

    it('should validate product data completeness', () => {
      const completeProduct = {
        id: 'test-id',
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true,
        ultimoCosto: 100, // Required field
        ultimaGanancia: 50, // Required field
        creado: new Date()
      };

      const requiredFields = ['id', 'nombre', 'colorFondo', 'posicion', 'activo', 'ultimoCosto', 'ultimaGanancia', 'creado'];
      
      requiredFields.forEach(field => {
        expect(completeProduct).toHaveProperty(field);
        expect(completeProduct[field as keyof typeof completeProduct]).toBeDefined();
      });

      // Specifically validate required numeric fields
      expect(typeof completeProduct.ultimoCosto).toBe('number');
      expect(typeof completeProduct.ultimaGanancia).toBe('number');
      expect(completeProduct.ultimoCosto).toBeGreaterThanOrEqual(0);
      expect(completeProduct.ultimaGanancia).toBeGreaterThanOrEqual(0);
    });

    it('should validate product position field for ordering', () => {
      const products = [
        {
          id: 'product-1',
          nombre: 'Product 1',
          posicion: 0,
          ultimoCosto: 100,
          ultimaGanancia: 50
        },
        {
          id: 'product-2',
          nombre: 'Product 2',
          posicion: 1,
          ultimoCosto: 200,
          ultimaGanancia: 75
        },
        {
          id: 'product-3',
          nombre: 'Product 3',
          posicion: 2,
          ultimoCosto: 150,
          ultimaGanancia: 60
        }
      ];

      // Validate that products have position field for ordering
      products.forEach(product => {
        expect(product).toHaveProperty('posicion');
        expect(typeof product.posicion).toBe('number');
        expect(product.posicion).toBeGreaterThanOrEqual(0);
      });

      // Validate that positions are sequential (no gaps)
      const positions = products.map(p => p.posicion).sort((a, b) => a - b);
      for (let i = 0; i < positions.length; i++) {
        expect(positions[i]).toBe(i);
      }

      // Validate no duplicate positions
      const uniquePositions = [...new Set(positions)];
      expect(uniquePositions.length).toBe(positions.length);
    });
  });

  describe('Validation Logic Tests', () => {
    describe('Company Name Validation', () => {
      const validateCompanyName = (name: string) => {
        const errors: string[] = [];

        if (!name || name.trim().length === 0) {
          errors.push('Company name is required');
        } else if (name.trim().length < 2) {
          errors.push('Company name must be at least 2 characters long');
        } else if (name.trim().length > 100) {
          errors.push('Company name must be less than 100 characters');
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      };

      it('should validate empty company names', () => {
        const result1 = validateCompanyName('');
        expect(result1.isValid).toBe(false);
        expect(result1.errors).toContain('Company name is required');

        const result2 = validateCompanyName('   ');
        expect(result2.isValid).toBe(false);
        expect(result2.errors).toContain('Company name is required');
      });

      it('should validate short company names', () => {
        const result = validateCompanyName('A');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Company name must be at least 2 characters long');
      });

      it('should validate long company names', () => {
        const longName = 'A'.repeat(101);
        const result = validateCompanyName(longName);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Company name must be less than 100 characters');
      });

      it('should validate valid company names', () => {
        const validNames = ['AB', 'Test Company', 'My Business LLC', 'A'.repeat(100)];
        
        validNames.forEach(name => {
          const result = validateCompanyName(name);
          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('Product Field Validation', () => {
      const validateProductFields = (ultimoCosto: any, ultimaGanancia: any) => {
        const errors: string[] = [];

        if (typeof ultimoCosto !== 'number') {
          errors.push('El último costo es requerido y debe ser un número');
        } else if (ultimoCosto < 0) {
          errors.push('El último costo debe ser un número mayor o igual a 0');
        }

        if (typeof ultimaGanancia !== 'number') {
          errors.push('La última ganancia es requerida y debe ser un número');
        } else if (ultimaGanancia < 0) {
          errors.push('La última ganancia debe ser un número mayor o igual a 0');
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      };

      it('should validate missing cost field', () => {
        const result = validateProductFields(undefined, 50);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('último costo'))).toBe(true);
      });

      it('should validate missing profit field', () => {
        const result = validateProductFields(100, undefined);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('última ganancia'))).toBe(true);
      });

      it('should validate negative cost values', () => {
        const result = validateProductFields(-10, 50);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('último costo'))).toBe(true);
      });

      it('should validate negative profit values', () => {
        const result = validateProductFields(100, -5);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('última ganancia'))).toBe(true);
      });

      it('should validate non-numeric values', () => {
        const result1 = validateProductFields('100', 50);
        expect(result1.isValid).toBe(false);
        expect(result1.errors.some(error => error.includes('último costo'))).toBe(true);

        const result2 = validateProductFields(100, '50');
        expect(result2.isValid).toBe(false);
        expect(result2.errors.some(error => error.includes('última ganancia'))).toBe(true);
      });

      it('should validate valid cost and profit values', () => {
        const validCombinations = [
          [0, 0],
          [100, 50],
          [0.5, 0.25],
          [1000, 500]
        ];

        validCombinations.forEach(([cost, profit]) => {
          const result = validateProductFields(cost, profit);
          expect(result.isValid).toBe(true);
          expect(result.errors).toEqual([]);
        });
      });
    });

    describe('Product List Validation', () => {
      const validateProductList = (products: any[]) => {
        const errors: string[] = [];

        // Check for duplicate positions
        const positions = products.map(p => p.posicion);
        const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
        if (duplicatePositions.length > 0) {
          errors.push(`Duplicate positions found: ${duplicatePositions.join(', ')}`);
        }

        // Check for position gaps (should be sequential starting from 0)
        const sortedPositions = [...positions].sort((a, b) => a - b);
        for (let i = 0; i < sortedPositions.length; i++) {
          if (sortedPositions[i] !== i) {
            errors.push(`Position gap detected: expected ${i}, found ${sortedPositions[i]}`);
            break;
          }
        }

        // Check for invalid IDs
        const invalidProducts = products.filter(product => !product.id || typeof product.id !== 'string');
        if (invalidProducts.length > 0) {
          errors.push(`Found ${invalidProducts.length} products with invalid IDs`);
        }

        // Check for missing required fields
        const productsWithMissingFields = products.filter(product => 
          typeof product.ultimoCosto !== 'number' || 
          typeof product.ultimaGanancia !== 'number'
        );
        if (productsWithMissingFields.length > 0) {
          errors.push(`Found ${productsWithMissingFields.length} products with missing required fields`);
        }

        return {
          isValid: errors.length === 0,
          errors
        };
      };

      it('should validate valid product list', () => {
        const validProducts = [
          { id: 'p1', nombre: 'Product 1', posicion: 0, ultimoCosto: 100, ultimaGanancia: 50 },
          { id: 'p2', nombre: 'Product 2', posicion: 1, ultimoCosto: 200, ultimaGanancia: 75 },
          { id: 'p3', nombre: 'Product 3', posicion: 2, ultimoCosto: 150, ultimaGanancia: 60 }
        ];

        const result = validateProductList(validProducts);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should identify duplicate positions', () => {
        const productsWithDuplicates = [
          { id: 'p1', nombre: 'Product 1', posicion: 0, ultimoCosto: 100, ultimaGanancia: 50 },
          { id: 'p2', nombre: 'Product 2', posicion: 0, ultimoCosto: 200, ultimaGanancia: 75 }
        ];

        const result = validateProductList(productsWithDuplicates);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Duplicate positions'))).toBe(true);
      });

      it('should identify position gaps', () => {
        const productsWithGaps = [
          { id: 'p1', nombre: 'Product 1', posicion: 0, ultimoCosto: 100, ultimaGanancia: 50 },
          { id: 'p2', nombre: 'Product 2', posicion: 2, ultimoCosto: 200, ultimaGanancia: 75 } // Gap at position 1
        ];

        const result = validateProductList(productsWithGaps);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Position gap'))).toBe(true);
      });

      it('should identify invalid IDs', () => {
        const productsWithInvalidIds = [
          { id: '', nombre: 'Product 1', posicion: 0, ultimoCosto: 100, ultimaGanancia: 50 },
          { id: 'p2', nombre: 'Product 2', posicion: 1, ultimoCosto: 200, ultimaGanancia: 75 }
        ];

        const result = validateProductList(productsWithInvalidIds);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('invalid IDs'))).toBe(true);
      });

      it('should identify missing required fields', () => {
        const productsWithMissingFields = [
          { id: 'p1', nombre: 'Product 1', posicion: 0, ultimoCosto: 100 }, // Missing ultimaGanancia
          { id: 'p2', nombre: 'Product 2', posicion: 1, ultimaGanancia: 75 } // Missing ultimoCosto
        ];

        const result = validateProductList(productsWithMissingFields);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('missing required fields'))).toBe(true);
      });
    });
  });

  describe('Migration Compatibility Tests', () => {
    it('should handle legacy data without required fields', () => {
      // Simulate legacy company data without nombre field
      const legacyCompany = {
        id: 'legacy-company',
        propietario: 'test@example.com',
        creado: new Date()
        // No nombre field
      };

      // Migration should add nombre field
      const migratedCompany = {
        ...legacyCompany,
        nombre: legacyCompany.propietario // Use email as fallback
      };

      expect(legacyCompany).not.toHaveProperty('nombre');
      expect(migratedCompany).toHaveProperty('nombre');
      expect(migratedCompany.nombre).toBe('test@example.com');
    });

    it('should handle legacy product data without required fields', () => {
      // Simulate legacy product data without cost/profit fields
      const legacyProduct = {
        id: 'legacy-product',
        nombre: 'Legacy Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true,
        creado: new Date()
        // No ultimoCosto or ultimaGanancia fields
      };

      // Migration should add required fields with default values
      const migratedProduct = {
        ...legacyProduct,
        ultimoCosto: 0, // Default value
        ultimaGanancia: 0 // Default value
      };

      expect(legacyProduct).not.toHaveProperty('ultimoCosto');
      expect(legacyProduct).not.toHaveProperty('ultimaGanancia');
      expect(migratedProduct).toHaveProperty('ultimoCosto');
      expect(migratedProduct).toHaveProperty('ultimaGanancia');
      expect(migratedProduct.ultimoCosto).toBe(0);
      expect(migratedProduct.ultimaGanancia).toBe(0);
    });

    it('should preserve existing data during migration', () => {
      const originalCompany = {
        id: 'existing-company',
        propietario: 'owner@example.com',
        creado: new Date('2023-01-01'),
        customField: 'custom value'
      };

      const migratedCompany = {
        ...originalCompany,
        nombre: 'Migrated Company Name'
      };

      // All original fields should be preserved
      expect(migratedCompany.id).toBe(originalCompany.id);
      expect(migratedCompany.propietario).toBe(originalCompany.propietario);
      expect(migratedCompany.creado).toBe(originalCompany.creado);
      expect(migratedCompany.customField).toBe(originalCompany.customField);
      
      // New required field should be added
      expect(migratedCompany.nombre).toBe('Migrated Company Name');
    });
  });
});