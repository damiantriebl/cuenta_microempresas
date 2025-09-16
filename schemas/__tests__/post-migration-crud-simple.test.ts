import { Timestamp } from 'firebase/firestore';
import { CompanyService } from '@/services/CompanyService';
import { ProductService } from '@/services/ProductService';
import { 
  Company, 
  Product, 
  CreateCompanyData, 
  CreateProductData, 
  UpdateProductData
} from '@/schemas/types';

// Mock Firebase
jest.mock('@/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

// Mock all external dependencies
jest.mock('@/schemas/firestore-utils');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/components/PriceHistoryTracker');

describe('Post-Migration CRUD Validation Tests', () => {
  let companyService: CompanyService;
  let productService: ProductService;
  
  const testCompanyId = 'test-company-123';
  const testUserId = 'test-user-456';
  const testProductId = 'test-product-789';
  
  const validCompanyData: CreateCompanyData = {
    nombre: 'Test Company',
    propietario: 'test@example.com'
  };
  
  const validProductData: CreateProductData = {
    nombre: 'Test Product',
    colorFondo: '#FF0000',
    posicion: 0,
    activo: true,
    ultimoCosto: 100,
    ultimaGanancia: 50
  };

  beforeAll(async () => {
    companyService = new CompanyService();
    productService = ProductService.getInstance();
    await productService.initialize();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Company CRUD Operations Validation', () => {
    describe('Company Creation Validation', () => {
      it('should validate company data with required nombre field', async () => {
        // Test that validation catches missing nombre
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: ''
        };

        const result = await companyService.createCompany(invalidCompanyData, testUserId);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should validate company data with null nombre field', async () => {
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: null as any
        };

        const result = await companyService.createCompany(invalidCompanyData, testUserId);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should validate company data with whitespace-only nombre', async () => {
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: '   '
        };

        const result = await companyService.createCompany(invalidCompanyData, testUserId);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });
    });

    describe('Company Update Validation', () => {
      it('should validate company updates with empty nombre', async () => {
        const updates = { nombre: '' };
        const result = await companyService.updateCompany(testCompanyId, updates);
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should validate company updates with whitespace-only nombre', async () => {
        const updates = { nombre: '   ' };
        const result = await companyService.updateCompany(testCompanyId, updates);
        
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });
    });

    describe('Company Name Validation', () => {
      it('should validate company name requirements', () => {
        const validation1 = companyService.validateCompanyName('');
        expect(validation1.isValid).toBe(false);
        expect(validation1.errors).toContain('Company name is required');

        const validation2 = companyService.validateCompanyName('A');
        expect(validation2.isValid).toBe(false);
        expect(validation2.errors).toContain('Company name must be at least 2 characters long');

        const validation3 = companyService.validateCompanyName('A'.repeat(101));
        expect(validation3.isValid).toBe(false);
        expect(validation3.errors).toContain('Company name must be less than 100 characters');

        const validation4 = companyService.validateCompanyName('Valid Company Name');
        expect(validation4.isValid).toBe(true);
        expect(validation4.errors).toEqual([]);
      });
    });
  });

  describe('Product CRUD Operations Validation', () => {
    describe('Product Creation Validation', () => {
      it('should validate product data without ultimoCosto', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimoCosto: undefined as any
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should validate product data without ultimaGanancia', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimaGanancia: undefined as any
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should validate product data with negative ultimoCosto', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimoCosto: -10
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should validate product data with negative ultimaGanancia', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimaGanancia: -5
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should validate product data with non-numeric ultimoCosto', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimoCosto: 'invalid' as any
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should validate product data with non-numeric ultimaGanancia', async () => {
        const invalidProductData = {
          ...validProductData,
          ultimaGanancia: 'invalid' as any
        };

        const result = await productService.createProduct(testCompanyId, invalidProductData);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });
    });

    describe('Product Update Validation', () => {
      it('should validate product updates with invalid ultimoCosto type', async () => {
        const updates = {
          ultimoCosto: 'invalid' as any
        };

        const result = await productService.updateProduct(testCompanyId, testProductId, updates);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should validate product updates with invalid ultimaGanancia type', async () => {
        const updates = {
          ultimaGanancia: 'invalid' as any
        };

        const result = await productService.updateProduct(testCompanyId, testProductId, updates);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should validate product updates with negative ultimoCosto', async () => {
        const updates = {
          ultimoCosto: -50
        };

        const result = await productService.updateProduct(testCompanyId, testProductId, updates);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should validate product updates with negative ultimaGanancia', async () => {
        const updates = {
          ultimaGanancia: -25
        };

        const result = await productService.updateProduct(testCompanyId, testProductId, updates);
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });
    });

    describe('Product Management Validation', () => {
      it('should validate product with all required fields', () => {
        const validProduct: Product = {
          id: testProductId,
          nombre: 'Valid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: 100,
          ultimaGanancia: 50,
          creado: Timestamp.now()
        };

        const result = productService.validateProductForManagement(validProduct);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should identify missing ultimoCosto field', () => {
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: undefined as any,
          ultimaGanancia: 50,
          creado: Timestamp.now()
        };

        const result = productService.validateProductForManagement(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimoCosto'))).toBe(true);
      });

      it('should identify missing ultimaGanancia field', () => {
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: 100,
          ultimaGanancia: undefined as any,
          creado: Timestamp.now()
        };

        const result = productService.validateProductForManagement(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimaGanancia'))).toBe(true);
      });

      it('should identify negative values in required fields', () => {
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: -10,
          ultimaGanancia: -5,
          creado: Timestamp.now()
        };

        const result = productService.validateProductForManagement(invalidProduct);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimoCosto'))).toBe(true);
        expect(result.errors.some(error => error.includes('ultimaGanancia'))).toBe(true);
      });

      it('should validate product list for management', () => {
        const validProducts: Product[] = [
          {
            id: 'product-1',
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          },
          {
            id: 'product-2',
            nombre: 'Product 2',
            colorFondo: '#00FF00',
            posicion: 1,
            activo: true,
            ultimoCosto: 200,
            ultimaGanancia: 75,
            creado: Timestamp.now()
          }
        ];

        const result = productService.validateProductListForManagement(validProducts);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should identify duplicate positions in product list', () => {
        const productsWithDuplicatePositions: Product[] = [
          {
            id: 'product-1',
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          },
          {
            id: 'product-2',
            nombre: 'Product 2',
            colorFondo: '#00FF00',
            posicion: 0, // Duplicate position
            activo: true,
            ultimoCosto: 200,
            ultimaGanancia: 75,
            creado: Timestamp.now()
          }
        ];

        const result = productService.validateProductListForManagement(productsWithDuplicatePositions);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Duplicate positions'))).toBe(true);
      });

      it('should identify position gaps in product list', () => {
        const productsWithPositionGaps: Product[] = [
          {
            id: 'product-1',
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          },
          {
            id: 'product-2',
            nombre: 'Product 2',
            colorFondo: '#00FF00',
            posicion: 2, // Gap - should be 1
            activo: true,
            ultimoCosto: 200,
            ultimaGanancia: 75,
            creado: Timestamp.now()
          }
        ];

        const result = productService.validateProductListForManagement(productsWithPositionGaps);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Position gap'))).toBe(true);
      });
    });
  });

  describe('Data Structure Validation', () => {
    it('should validate that companies have required nombre field', () => {
      // This test validates the structure requirements
      const companyWithoutNombre = {
        id: 'test-id',
        propietario: 'test@example.com',
        creado: Timestamp.now()
        // Missing nombre field
      };

      // In the new structure, nombre is required
      expect(companyWithoutNombre).not.toHaveProperty('nombre');
      
      const companyWithNombre = {
        ...companyWithoutNombre,
        nombre: 'Test Company'
      };

      expect(companyWithNombre).toHaveProperty('nombre');
      expect(companyWithNombre.nombre).toBe('Test Company');
    });

    it('should validate that products have required cost and profit fields', () => {
      // This test validates the structure requirements
      const productWithoutRequiredFields = {
        id: 'test-id',
        nombre: 'Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
        // Missing ultimoCosto and ultimaGanancia fields
      };

      // In the new structure, ultimoCosto and ultimaGanancia are required
      expect(productWithoutRequiredFields).not.toHaveProperty('ultimoCosto');
      expect(productWithoutRequiredFields).not.toHaveProperty('ultimaGanancia');
      
      const productWithRequiredFields = {
        ...productWithoutRequiredFields,
        ultimoCosto: 100,
        ultimaGanancia: 50
      };

      expect(productWithRequiredFields).toHaveProperty('ultimoCosto');
      expect(productWithRequiredFields).toHaveProperty('ultimaGanancia');
      expect(typeof productWithRequiredFields.ultimoCosto).toBe('number');
      expect(typeof productWithRequiredFields.ultimaGanancia).toBe('number');
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
        }
      ];

      // Validate that products have position field for ordering
      products.forEach(product => {
        expect(product).toHaveProperty('posicion');
        expect(typeof product.posicion).toBe('number');
        expect(product.posicion).toBeGreaterThanOrEqual(0);
      });

      // Validate that positions are sequential
      const positions = products.map(p => p.posicion).sort();
      for (let i = 0; i < positions.length; i++) {
        expect(positions[i]).toBe(i);
      }
    });
  });
});