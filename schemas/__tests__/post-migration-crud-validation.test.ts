import { Timestamp } from 'firebase/firestore';
import { CompanyService } from '@/services/CompanyService';
import { ProductService } from '@/services/ProductService';
import { 
  Company, 
  Product, 
  CreateCompanyData, 
  CreateProductData, 
  UpdateProductData,
  ServiceResponse 
} from '@/schemas/types';

// Mock Firebase
jest.mock('@/firebaseConfig', () => ({
  db: {},
  auth: {}
}));

// Mock Firestore utils
jest.mock('@/schemas/firestore-utils', () => ({
  createCompany: jest.fn(),
  getCompany: jest.fn(),
  updateCompany: jest.fn(),
  createProduct: jest.fn(),
  getProducts: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  subscribeToCompany: jest.fn(),
  subscribeToProducts: jest.fn()
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

// Mock PriceHistoryTracker
jest.mock('@/components/PriceHistoryTracker', () => ({
  savePriceToHistory: jest.fn()
}));

describe('Post-Migration CRUD Validation Tests', () => {
  let companyService: CompanyService;
  let productService: ProductService;
  
  // Test data
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
    describe('Company Creation', () => {
      it('should successfully create company with required nombre field', async () => {
        // Arrange
        const { createCompany } = require('@/schemas/firestore-utils');
        (createCompany as jest.Mock).mockResolvedValue(testCompanyId);

        // Act
        const result = await companyService.createCompany(validCompanyData, testUserId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBe(testCompanyId);
        expect(createCompany).toHaveBeenCalledWith(validCompanyData, testUserId);
      });

      it('should fail to create company without nombre field', async () => {
        // Arrange
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: ''
        };

        // Act
        const result = await companyService.createCompany(invalidCompanyData, testUserId);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should fail to create company with null nombre field', async () => {
        // Arrange
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: null as any
        };

        // Act
        const result = await companyService.createCompany(invalidCompanyData, testUserId);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should fail to create company with whitespace-only nombre', async () => {
        // Arrange
        const invalidCompanyData = {
          ...validCompanyData,
          nombre: '   '
        };

        // Act
        const result = await companyService.createCompany(invalidCompanyData, testUserId);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });
    });

    describe('Company Reading', () => {
      it('should successfully retrieve company with valid structure', async () => {
        // Arrange
        const mockCompany: Company = {
          id: testCompanyId,
          nombre: 'Test Company',
          propietario: 'test@example.com',
          creado: Timestamp.now()
        };

        const { getCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(getCompany).mockResolvedValue(mockCompany);

        // Act
        const result = await companyService.getCompany(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCompany);
        expect(result.data?.nombre).toBe('Test Company');
      });

      it('should handle company not found', async () => {
        // Arrange
        const { getCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(getCompany).mockResolvedValue(null);

        // Act
        const result = await companyService.getCompany('non-existent-id');

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it('should warn about company missing nombre field', async () => {
        // Arrange
        const mockCompanyWithoutNombre: Company = {
          id: testCompanyId,
          nombre: '', // Missing required field
          propietario: 'test@example.com',
          creado: Timestamp.now()
        };

        const { getCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(getCompany).mockResolvedValue(mockCompanyWithoutNombre);

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        const result = await companyService.getCompany(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Company missing required nombre field'),
          expect.objectContaining({ empresaId: testCompanyId })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Company Updating', () => {
      it('should successfully update company name', async () => {
        // Arrange
        const { updateCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(updateCompany).mockResolvedValue();

        const updates = { nombre: 'Updated Company Name' };

        // Act
        const result = await companyService.updateCompany(testCompanyId, updates);

        // Assert
        expect(result.success).toBe(true);
        expect(updateCompany).toHaveBeenCalledWith(testCompanyId, updates);
      });

      it('should fail to update company with empty nombre', async () => {
        // Arrange
        const updates = { nombre: '' };

        // Act
        const result = await companyService.updateCompany(testCompanyId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should fail to update company with whitespace-only nombre', async () => {
        // Arrange
        const updates = { nombre: '   ' };

        // Act
        const result = await companyService.updateCompany(testCompanyId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('nombre');
      });

      it('should successfully update company name using specific method', async () => {
        // Arrange
        const { updateCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(updateCompany).mockResolvedValue();

        const newName = 'New Company Name';

        // Act
        const result = await companyService.updateCompanyName(testCompanyId, newName);

        // Assert
        expect(result.success).toBe(true);
        expect(updateCompany).toHaveBeenCalledWith(testCompanyId, { nombre: newName });
      });
    });

    describe('Company Structure Validation', () => {
      it('should validate company structure with all required fields', async () => {
        // Arrange
        const mockCompany: Company = {
          id: testCompanyId,
          nombre: 'Valid Company',
          propietario: 'test@example.com',
          creado: Timestamp.now()
        };

        const { getCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(getCompany).mockResolvedValue(mockCompany);

        // Act
        const result = await companyService.validateCompanyStructure(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data?.isValid).toBe(true);
        expect(result.data?.missingFields).toEqual([]);
      });

      it('should identify missing nombre field in company structure', async () => {
        // Arrange
        const mockCompanyWithoutNombre: Company = {
          id: testCompanyId,
          nombre: '', // Missing required field
          propietario: 'test@example.com',
          creado: Timestamp.now()
        };

        const { getCompany } = await import('@/schemas/firestore-utils');
        vi.mocked(getCompany).mockResolvedValue(mockCompanyWithoutNombre);

        // Act
        const result = await companyService.validateCompanyStructure(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data?.isValid).toBe(false);
        expect(result.data?.missingFields).toContain('nombre');
      });
    });
  });

  describe('Product CRUD Operations Validation', () => {
    describe('Product Creation', () => {
      it('should successfully create product with all required fields', async () => {
        // Arrange
        const { createProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(createProduct).mockResolvedValue(testProductId);

        // Act
        const result = await productService.createProduct(testCompanyId, validProductData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBe(testProductId);
        expect(createProduct).toHaveBeenCalledWith(testCompanyId, validProductData);
      });

      it('should fail to create product without ultimoCosto', async () => {
        // Arrange
        const invalidProductData = {
          ...validProductData,
          ultimoCosto: undefined as any
        };

        // Act
        const result = await productService.createProduct(testCompanyId, invalidProductData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should fail to create product without ultimaGanancia', async () => {
        // Arrange
        const invalidProductData = {
          ...validProductData,
          ultimaGanancia: undefined as any
        };

        // Act
        const result = await productService.createProduct(testCompanyId, invalidProductData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should fail to create product with negative ultimoCosto', async () => {
        // Arrange
        const invalidProductData = {
          ...validProductData,
          ultimoCosto: -10
        };

        // Act
        const result = await productService.createProduct(testCompanyId, invalidProductData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should fail to create product with negative ultimaGanancia', async () => {
        // Arrange
        const invalidProductData = {
          ...validProductData,
          ultimaGanancia: -5
        };

        // Act
        const result = await productService.createProduct(testCompanyId, invalidProductData);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should accept product with zero values for cost and profit', async () => {
        // Arrange
        const { createProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(createProduct).mockResolvedValue(testProductId);

        const zeroValueProductData = {
          ...validProductData,
          ultimoCosto: 0,
          ultimaGanancia: 0
        };

        // Act
        const result = await productService.createProduct(testCompanyId, zeroValueProductData);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toBe(testProductId);
      });
    });

    describe('Product Reading', () => {
      it('should successfully retrieve products with all required fields', async () => {
        // Arrange
        const mockProducts: Product[] = [
          {
            id: testProductId,
            nombre: 'Test Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          },
          {
            id: 'test-product-2',
            nombre: 'Test Product 2',
            colorFondo: '#00FF00',
            posicion: 1,
            activo: true,
            ultimoCosto: 200,
            ultimaGanancia: 75,
            creado: Timestamp.now()
          }
        ];

        const { getProducts } = await import('@/schemas/firestore-utils');
        vi.mocked(getProducts).mockResolvedValue(mockProducts);

        // Act
        const result = await productService.getProducts(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.data?.[0].ultimoCosto).toBe(100);
        expect(result.data?.[0].ultimaGanancia).toBe(50);
        expect(result.data?.[1].ultimoCosto).toBe(200);
        expect(result.data?.[1].ultimaGanancia).toBe(75);
      });

      it('should handle products with missing required fields by setting defaults', async () => {
        // Arrange
        const mockProductsWithMissingFields: Product[] = [
          {
            id: testProductId,
            nombre: 'Test Product',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: undefined as any, // Missing required field
            ultimaGanancia: undefined as any, // Missing required field
            creado: Timestamp.now()
          }
        ];

        const { getProducts } = await import('@/schemas/firestore-utils');
        vi.mocked(getProducts).mockResolvedValue(mockProductsWithMissingFields);

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        const result = await productService.getProducts(testCompanyId);

        // Assert
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data?.[0].ultimoCosto).toBe(0); // Default value
        expect(result.data?.[0].ultimaGanancia).toBe(0); // Default value
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Product missing required price fields'),
          expect.any(Object)
        );

        consoleSpy.mockRestore();
      });
    });

    describe('Product Updating', () => {
      it('should successfully update product with valid required fields', async () => {
        // Arrange
        const { updateProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(updateProduct).mockResolvedValue();

        const updates: UpdateProductData = {
          ultimoCosto: 150,
          ultimaGanancia: 60
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(true);
        expect(updateProduct).toHaveBeenCalledWith(testCompanyId, testProductId, updates);
      });

      it('should fail to update product with invalid ultimoCosto type', async () => {
        // Arrange
        const updates = {
          ultimoCosto: 'invalid' as any
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should fail to update product with invalid ultimaGanancia type', async () => {
        // Arrange
        const updates = {
          ultimaGanancia: 'invalid' as any
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should fail to update product with negative ultimoCosto', async () => {
        // Arrange
        const updates = {
          ultimoCosto: -50
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('último costo');
      });

      it('should fail to update product with negative ultimaGanancia', async () => {
        // Arrange
        const updates = {
          ultimaGanancia: -25
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('última ganancia');
      });

      it('should accept zero values for cost and profit updates', async () => {
        // Arrange
        const { updateProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(updateProduct).mockResolvedValue();

        const updates = {
          ultimoCosto: 0,
          ultimaGanancia: 0
        };

        // Act
        const result = await productService.updateProduct(testCompanyId, testProductId, updates);

        // Assert
        expect(result.success).toBe(true);
        expect(updateProduct).toHaveBeenCalledWith(testCompanyId, testProductId, updates);
      });
    });

    describe('Product Deletion', () => {
      it('should successfully delete product', async () => {
        // Arrange
        const { deleteProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(deleteProduct).mockResolvedValue();

        // Act
        const result = await productService.deleteProduct(testCompanyId, testProductId);

        // Assert
        expect(result.success).toBe(true);
        expect(deleteProduct).toHaveBeenCalledWith(testCompanyId, testProductId);
      });
    });

    describe('Product Management Validation', () => {
      it('should validate product with all required fields', () => {
        // Arrange
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

        // Act
        const result = productService.validateProductForManagement(validProduct);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should identify missing ultimoCosto field', () => {
        // Arrange
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: undefined as any, // Missing required field
          ultimaGanancia: 50,
          creado: Timestamp.now()
        };

        // Act
        const result = productService.validateProductForManagement(invalidProduct);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimoCosto'))).toBe(true);
      });

      it('should identify missing ultimaGanancia field', () => {
        // Arrange
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: 100,
          ultimaGanancia: undefined as any, // Missing required field
          creado: Timestamp.now()
        };

        // Act
        const result = productService.validateProductForManagement(invalidProduct);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimaGanancia'))).toBe(true);
      });

      it('should identify negative values in required fields', () => {
        // Arrange
        const invalidProduct: Product = {
          id: testProductId,
          nombre: 'Invalid Product',
          colorFondo: '#FF0000',
          posicion: 0,
          activo: true,
          ultimoCosto: -10, // Invalid negative value
          ultimaGanancia: -5, // Invalid negative value
          creado: Timestamp.now()
        };

        // Act
        const result = productService.validateProductForManagement(invalidProduct);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('ultimoCosto'))).toBe(true);
        expect(result.errors.some(error => error.includes('ultimaGanancia'))).toBe(true);
      });

      it('should validate product list for management', () => {
        // Arrange
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

        // Act
        const result = productService.validateProductListForManagement(validProducts);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should identify duplicate positions in product list', () => {
        // Arrange
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

        // Act
        const result = productService.validateProductListForManagement(productsWithDuplicatePositions);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Duplicate positions'))).toBe(true);
      });

      it('should identify position gaps in product list', () => {
        // Arrange
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

        // Act
        const result = productService.validateProductListForManagement(productsWithPositionGaps);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('Position gap'))).toBe(true);
      });
    });

    describe('Product Reordering', () => {
      it('should successfully reorder products with valid structure', async () => {
        // Arrange
        const { updateProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(updateProduct).mockResolvedValue();

        const productsToReorder: Product[] = [
          {
            id: 'product-1',
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 1, // Will be updated to 0
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          },
          {
            id: 'product-2',
            nombre: 'Product 2',
            colorFondo: '#00FF00',
            posicion: 0, // Will be updated to 1
            activo: true,
            ultimoCosto: 200,
            ultimaGanancia: 75,
            creado: Timestamp.now()
          }
        ];

        // Act
        const result = await productService.reorderProducts(testCompanyId, productsToReorder);

        // Assert
        expect(result.success).toBe(true);
        expect(updateProduct).toHaveBeenCalledTimes(2);
        expect(updateProduct).toHaveBeenCalledWith(testCompanyId, 'product-1', { posicion: 0 });
        expect(updateProduct).toHaveBeenCalledWith(testCompanyId, 'product-2', { posicion: 1 });
      });

      it('should warn about products with missing required fields during reordering', async () => {
        // Arrange
        const { updateProduct } = await import('@/schemas/firestore-utils');
        vi.mocked(updateProduct).mockResolvedValue();

        const productsWithMissingFields: Product[] = [
          {
            id: 'product-1',
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: undefined as any, // Missing required field
            ultimaGanancia: undefined as any, // Missing required field
            creado: Timestamp.now()
          }
        ];

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Act
        const result = await productService.reorderProducts(testCompanyId, productsWithMissingFields);

        // Assert
        expect(result.success).toBe(true);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Found products with missing required fields'),
          expect.any(Object)
        );

        consoleSpy.mockRestore();
      });

      it('should fail to reorder products with invalid IDs', async () => {
        // Arrange
        const productsWithInvalidIds: Product[] = [
          {
            id: '', // Invalid ID
            nombre: 'Product 1',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            ultimoCosto: 100,
            ultimaGanancia: 50,
            creado: Timestamp.now()
          }
        ];

        // Act
        const result = await productService.reorderProducts(testCompanyId, productsWithInvalidIds);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error?.message).toContain('invalid IDs');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle Firestore errors gracefully in company operations', async () => {
      // Arrange
      const { createCompany } = await import('@/schemas/firestore-utils');
      const firestoreError = new Error('Firestore connection failed');
      vi.mocked(createCompany).mockRejectedValue(firestoreError);

      // Act
      const result = await companyService.createCompany(validCompanyData, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Firestore connection failed');
    });

    it('should handle Firestore errors gracefully in product operations', async () => {
      // Arrange
      const { createProduct } = await import('@/schemas/firestore-utils');
      const firestoreError = new Error('Firestore connection failed');
      vi.mocked(createProduct).mockRejectedValue(firestoreError);

      // Act
      const result = await productService.createProduct(testCompanyId, validProductData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Firestore connection failed');
    });

    it('should handle validation errors with proper error types', async () => {
      // Arrange
      const invalidCompanyData = {
        ...validCompanyData,
        nombre: ''
      };

      // Act
      const result = await companyService.createCompany(invalidCompanyData, testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
    });

    it('should handle network timeouts with retry logic', async () => {
      // Arrange
      const { createCompany } = await import('@/schemas/firestore-utils');
      const timeoutError = new Error('Request timeout');
      vi.mocked(createCompany)
        .mockRejectedValueOnce(timeoutError)
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(testCompanyId);

      // Act
      const result = await companyService.createCompany(validCompanyData, testUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(testCompanyId);
      expect(createCompany).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});