/**
 * Comprehensive Product Creation Tests
 * Tests for task 7.1: Test product creation functionality
 * 
 * This test suite covers:
 * - Product creation with valid data
 * - Product creation with invalid data  
 * - Product creation under various network conditions
 * - Requirements: 1.1, 1.4, 1.5
 */

import { jest } from '@jest/globals';

// Mock Firebase modules
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  Timestamp: {
    now: () => ({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
  },
};

jest.mock('firebase/firestore', () => mockFirestore);
jest.mock('@/firebaseConfig', () => ({
  db: 'mock-db'
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Toast Provider
const mockShowToast = jest.fn();
jest.mock('@/context/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast })
}));

// Mock ErrorTracker
jest.mock('../../services/ErrorTracker', () => ({
  errorTracker: {
    addBreadcrumb: jest.fn(),
    trackError: jest.fn(),
  },
  trackProductError: jest.fn(),
}));

// Mock DebugLogger
jest.mock('../../services/DebugLogger', () => ({
  debugLogger: {
    startOperation: jest.fn(() => 'mock-operation-id'),
    endOperation: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    logValidation: jest.fn(),
    logFirestoreOperation: jest.fn(),
    logServiceResponse: jest.fn(),
  },
  logProductCreation: {
    start: jest.fn(),
    validation: jest.fn(),
    firestore: jest.fn(),
    complete: jest.fn(),
  },
}));

import ProductService from '../../services/ProductService';
import { createProduct } from '../firestore-utils';
import { validateProduct } from '../validation';
import { CreateProductData } from '../types';

describe('Product Creation Comprehensive Tests', () => {
  let productService: ProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    productService = ProductService.getInstance();
    
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Valid Data Scenarios - Requirement 1.1', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should create product with complete valid data', async () => {
      const validProductData: CreateProductData = {
        nombre: 'Coca Cola 500ml',
        colorFondo: '#FF0000',
        posicion: 0,
        ultimoCosto: 15.50,
        ultimaGanancia: 4.50,
        activo: true
      };

      const mockProductRef = { id: 'product-123' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');
      mockAsyncStorage.getItem.mockResolvedValue(null);
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('product-123');
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Coca Cola 500ml',
          colorFondo: '#FF0000',
          posicion: 0,
          ultimoCosto: 15.50,
          ultimaGanancia: 4.50,
          activo: true,
          creado: expect.anything()
        })
      );

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting product creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created successfully'),
        expect.any(Object)
      );
    });

    test('should create product with minimal valid data (no prices)', async () => {
      const minimalProductData: CreateProductData = {
        nombre: 'Simple Product',
        colorFondo: '#00FF00',
        posicion: 1,
        activo: true
      };

      const mockProductRef = { id: 'product-minimal' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, minimalProductData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('product-minimal');
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Simple Product',
          colorFondo: '#00FF00',
          posicion: 1,
          activo: true,
          creado: expect.anything()
        })
      );

      // Should not contain ultimoCosto or ultimaGanancia
      const addDocCall = mockFirestore.addDoc.mock.calls[0][1];
      expect(addDocCall).not.toHaveProperty('ultimoCosto');
      expect(addDocCall).not.toHaveProperty('ultimaGanancia');
    });

    test('should create product with zero prices', async () => {
      const zeroPriceData: CreateProductData = {
        nombre: 'Free Sample',
        colorFondo: '#0000FF',
        posicion: 0,
        ultimoCosto: 0,
        ultimaGanancia: 0,
        activo: true
      };

      const mockProductRef = { id: 'product-free' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, zeroPriceData);

      expect(result.success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          ultimoCosto: 0,
          ultimaGanancia: 0
        })
      );
    });

    test('should create product with special characters in name', async () => {
      const specialCharData: CreateProductData = {
        nombre: 'Café & Té (Especial) - 500ml',
        colorFondo: '#FF00FF',
        posicion: 0,
        activo: true
      };

      const mockProductRef = { id: 'product-special' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, specialCharData);

      expect(result.success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Café & Té (Especial) - 500ml'
        })
      );
    });

    test('should create product with large position number', async () => {
      const largePositionData: CreateProductData = {
        nombre: 'Product at End',
        colorFondo: '#FFFF00',
        posicion: 999999,
        activo: true
      };

      const mockProductRef = { id: 'product-large-pos' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, largePositionData);

      expect(result.success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          posicion: 999999
        })
      );
    });
  });

  describe('Invalid Data Scenarios - Requirement 1.5', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should reject product with empty name', async () => {
      const invalidData: CreateProductData = {
        nombre: '',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.errors).toContain('El nombre del producto es requerido');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with whitespace-only name', async () => {
      const invalidData: CreateProductData = {
        nombre: '   ',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with name too long', async () => {
      const invalidData: CreateProductData = {
        nombre: 'A'.repeat(101), // Exceeds 100 character limit
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with invalid color format', async () => {
      const invalidData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: 'invalid-color',
        posicion: 0,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with negative prices', async () => {
      const invalidData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: '#FF0000',
        posicion: 0,
        ultimoCosto: -5,
        ultimaGanancia: -2,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with negative position', async () => {
      const invalidData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: '#FF0000',
        posicion: -1,
        activo: true
      };

      const result = await productService.createProduct(validEmpresaId, invalidData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });

    test('should reject product with empty empresa ID', async () => {
      const validData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const result = await productService.createProduct('', validData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(mockFirestore.addDoc).not.toHaveBeenCalled();
    });
  });

  describe('Network Condition Scenarios - Requirement 1.4', () => {
    const validEmpresaId = 'test-empresa-123';
    const validProductData: CreateProductData = {
      nombre: 'Network Test Product',
      colorFondo: '#FF0000',
      posicion: 0,
      activo: true
    };

    test('should handle network timeout errors', async () => {
      const networkError = new Error('Network request failed');
      (networkError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(networkError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.retryable).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Product creation failed'),
        expect.any(Object)
      );
    });

    test('should handle permission denied errors', async () => {
      const permissionError = new Error('Missing or insufficient permissions');
      (permissionError as any).code = 'permission-denied';
      mockFirestore.addDoc.mockRejectedValue(permissionError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Product creation failed'),
        expect.any(Object)
      );
    });

    test('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      (quotaError as any).code = 'resource-exhausted';
      mockFirestore.addDoc.mockRejectedValue(quotaError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(true);
    });

    test('should handle connection timeout with retry', async () => {
      const timeoutError = new Error('Connection timeout');
      (timeoutError as any).code = 'deadline-exceeded';
      
      // First call fails, second succeeds
      mockFirestore.addDoc
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue({ id: 'product-retry-success' });
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('product-retry-success');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(2);
    });

    test('should handle intermittent network failures', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'unavailable';
      
      // Fail twice, then succeed
      mockFirestore.addDoc
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue({ id: 'product-network-recovery' });
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('product-network-recovery');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retry attempts', async () => {
      const persistentError = new Error('Persistent network error');
      (persistentError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(persistentError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle Firestore service unavailable', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(serviceError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const validEmpresaId = 'test-empresa-123';

    test('should handle price caching failures gracefully', async () => {
      const validProductData: CreateProductData = {
        nombre: 'Cache Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        ultimoCosto: 10,
        ultimaGanancia: 5,
        activo: true
      };

      const mockProductRef = { id: 'product-cache-fail' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');
      
      // Mock cache failure
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const result = await productService.createProduct(validEmpresaId, validProductData);

      // Should still succeed even if caching fails
      expect(result.success).toBe(true);
      expect(result.data).toBe('product-cache-fail');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Price caching failed'),
        expect.any(Object)
      );
    });

    test('should handle malformed Firestore responses', async () => {
      const validProductData: CreateProductData = {
        nombre: 'Malformed Response Test',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      // Mock malformed response (no id)
      mockFirestore.addDoc.mockResolvedValue({});
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
    });

    test('should handle unexpected errors gracefully', async () => {
      const validProductData: CreateProductData = {
        nombre: 'Unexpected Error Test',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const unexpectedError = new Error('Unexpected error occurred');
      mockFirestore.addDoc.mockRejectedValue(unexpectedError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const result = await productService.createProduct(validEmpresaId, validProductData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Product creation failed'),
        expect.any(Object)
      );
    });
  });

  describe('Validation Integration Tests', () => {
    test('should use validateProduct function correctly', () => {
      const validData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const validation = validateProduct(validData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should catch validation errors from validateProduct', () => {
      const invalidData: CreateProductData = {
        nombre: '',
        colorFondo: 'invalid',
        posicion: -1,
        activo: true
      };

      const validation = validateProduct(invalidData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Logging and Debugging Tests', () => {
    const validEmpresaId = 'test-empresa-123';
    const validProductData: CreateProductData = {
      nombre: 'Logging Test Product',
      colorFondo: '#FF0000',
      posicion: 0,
      activo: true
    };

    test('should log all creation steps', async () => {
      const mockProductRef = { id: 'product-logging' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await productService.createProduct(validEmpresaId, validProductData);

      // Verify comprehensive logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting product creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Validating product data'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Creating product in Firestore'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created successfully'),
        expect.any(Object)
      );
    });

    test('should log validation failures with details', async () => {
      const invalidData: CreateProductData = {
        nombre: '',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      await productService.createProduct(validEmpresaId, invalidData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed'),
        expect.objectContaining({
          errors: expect.arrayContaining([expect.any(String)])
        })
      );
    });

    test('should log Firestore errors with context', async () => {
      const firestoreError = new Error('Firestore error');
      (firestoreError as any).code = 'internal';
      mockFirestore.addDoc.mockRejectedValue(firestoreError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await productService.createProduct(validEmpresaId, validProductData);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Product creation failed'),
        expect.objectContaining({
          empresaId: validEmpresaId,
          productName: validProductData.nombre,
          error: expect.objectContaining({
            name: 'Error',
            message: 'Firestore error'
          })
        })
      );
    });
  });
});