/**
 * Integration Tests for Product and Client Creation
 * Tests for task 7: Test and validate fixes
 * 
 * This test suite covers:
 * - Integration between ProductService and ClientService
 * - End-to-end creation workflows
 * - Cross-service error handling
 * - Performance under load
 * - Requirements: 1.1, 1.4, 1.5, 2.1, 2.4, 2.5
 */

import { jest } from '@jest/globals';

// Mock Firebase modules
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
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
  trackClientError: jest.fn(),
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
  logClientCreation: {
    start: jest.fn(),
    validation: jest.fn(),
    firestore: jest.fn(),
    complete: jest.fn(),
  },
}));

import ProductService from '../../services/ProductService';
import { ClientService } from '../../services/ClientService';
import { CreateProductData, CreateClientData } from '../types';

describe('Product and Client Creation Integration Tests', () => {
  let productService: ProductService;
  let clientService: ClientService;
  const testEmpresaId = 'integration-test-empresa';

  beforeEach(() => {
    jest.clearAllMocks();
    productService = ProductService.getInstance();
    clientService = ClientService.getInstance();
    
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Setup default mocks
    mockFirestore.collection.mockReturnValue('mock-collection');
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Concurrent Creation Operations', () => {
    test('should handle concurrent product and client creation', async () => {
      const productData: CreateProductData = {
        nombre: 'Concurrent Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Concurrent Client',
        telefono: '+1234567890',
        activo: true
      };

      // Mock successful responses
      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: 'product-concurrent' })
        .mockResolvedValueOnce({ id: 'client-concurrent' });

      // Execute both operations concurrently
      const [productResult, clientResult] = await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      expect(productResult.success).toBe(true);
      expect(productResult.data).toBe('product-concurrent');
      expect(clientResult.success).toBe(true);
      expect(clientResult.data).toBe('client-concurrent');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(2);
    });

    test('should handle mixed success/failure in concurrent operations', async () => {
      const productData: CreateProductData = {
        nombre: 'Success Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: '', // Invalid - empty name
        activo: true
      };

      // Mock product success, client will fail validation
      mockFirestore.addDoc.mockResolvedValue({ id: 'product-success' });

      const [productResult, clientResult] = await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      expect(productResult.success).toBe(true);
      expect(clientResult.success).toBe(false);
      expect(clientResult.errorType).toBe('validation');
    });

    test('should handle network failures affecting both services', async () => {
      const productData: CreateProductData = {
        nombre: 'Network Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Network Test Client',
        activo: true
      };

      const networkError = new Error('Network unavailable');
      (networkError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(networkError);

      const [productResult, clientResult] = await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      expect(productResult.success).toBe(false);
      expect(productResult.errorType).toBe('network');
      expect(clientResult.success).toBe(false);
      expect(clientResult.errorType).toBe('network');
    });
  });

  describe('Bulk Creation Operations', () => {
    test('should handle bulk product creation', async () => {
      const products: CreateProductData[] = Array.from({ length: 10 }, (_, i) => ({
        nombre: `Bulk Product ${i + 1}`,
        colorFondo: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        posicion: i,
        activo: true
      }));

      // Mock successful responses for all products
      products.forEach((_, i) => {
        mockFirestore.addDoc.mockResolvedValueOnce({ id: `bulk-product-${i + 1}` });
      });

      const results = await Promise.all(
        products.map(product => productService.createProduct(testEmpresaId, product))
      );

      expect(results).toHaveLength(10);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(10);
    });

    test('should handle bulk client creation', async () => {
      const clients: CreateClientData[] = Array.from({ length: 5 }, (_, i) => ({
        nombre: `Bulk Client ${i + 1}`,
        telefono: `+123456789${i}`,
        activo: true
      }));

      // Mock successful responses for all clients
      clients.forEach((_, i) => {
        mockFirestore.addDoc.mockResolvedValueOnce({ id: `bulk-client-${i + 1}` });
      });

      const results = await Promise.all(
        clients.map(client => clientService.createClient(testEmpresaId, client))
      );

      expect(results).toHaveLength(5);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(5);
    });

    test('should handle partial failures in bulk operations', async () => {
      const products: CreateProductData[] = [
        { nombre: 'Valid Product 1', colorFondo: '#FF0000', posicion: 0, activo: true },
        { nombre: '', colorFondo: '#FF0000', posicion: 1, activo: true }, // Invalid
        { nombre: 'Valid Product 2', colorFondo: '#00FF00', posicion: 2, activo: true }
      ];

      // Mock success for valid products
      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: 'valid-product-1' })
        .mockResolvedValueOnce({ id: 'valid-product-2' });

      const results = await Promise.all(
        products.map(product => productService.createProduct(testEmpresaId, product))
      );

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false); // Validation failure
      expect(results[2].success).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(2); // Only valid products
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from transient network errors', async () => {
      const productData: CreateProductData = {
        nombre: 'Recovery Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const transientError = new Error('Transient network error');
      (transientError as any).code = 'unavailable';

      // Fail first attempt, succeed on retry
      mockFirestore.addDoc
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue({ id: 'recovery-product' });

      const result = await productService.createProduct(testEmpresaId, productData);

      expect(result.success).toBe(true);
      expect(result.data).toBe('recovery-product');
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(2);
    });

    test('should handle service degradation gracefully', async () => {
      const productData: CreateProductData = {
        nombre: 'Degradation Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        ultimoCosto: 10,
        ultimaGanancia: 5,
        activo: true
      };

      // Product creation succeeds but price caching fails
      mockFirestore.addDoc.mockResolvedValue({ id: 'degradation-product' });
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage unavailable'));

      const result = await productService.createProduct(testEmpresaId, productData);

      // Should still succeed despite cache failure
      expect(result.success).toBe(true);
      expect(result.data).toBe('degradation-product');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Price caching failed'),
        expect.any(Object)
      );
    });

    test('should maintain data consistency during failures', async () => {
      const productData: CreateProductData = {
        nombre: 'Consistency Test Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const consistencyError = new Error('Data consistency error');
      (consistencyError as any).code = 'aborted';
      mockFirestore.addDoc.mockRejectedValue(consistencyError);

      const result = await productService.createProduct(testEmpresaId, productData);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('firestore');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-frequency creation requests', async () => {
      const startTime = Date.now();
      const requestCount = 20;
      
      const products: CreateProductData[] = Array.from({ length: requestCount }, (_, i) => ({
        nombre: `Performance Product ${i + 1}`,
        colorFondo: '#FF0000',
        posicion: i,
        activo: true
      }));

      // Mock all requests to succeed quickly
      Array.from({ length: requestCount }, (_, i) => {
        mockFirestore.addDoc.mockResolvedValueOnce({ id: `perf-product-${i + 1}` });
      });

      const results = await Promise.all(
        products.map(product => productService.createProduct(testEmpresaId, product))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(requestCount);
      expect(results.every(result => result.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(requestCount);
    });

    test('should handle memory pressure during bulk operations', async () => {
      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        nombre: `Memory Test Product ${i + 1}`.repeat(10), // Larger strings
        colorFondo: '#FF0000',
        posicion: i,
        activo: true
      }));

      // Mock successful responses
      largeDataSet.forEach((_, i) => {
        mockFirestore.addDoc.mockResolvedValueOnce({ id: `memory-product-${i + 1}` });
      });

      // Process in batches to simulate real-world usage
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < largeDataSet.length; i += batchSize) {
        const batch = largeDataSet.slice(i, i + batchSize);
        batches.push(batch);
      }

      let successCount = 0;
      for (const batch of batches) {
        const results = await Promise.all(
          batch.map(product => productService.createProduct(testEmpresaId, product))
        );
        successCount += results.filter(result => result.success).length;
      }

      expect(successCount).toBe(largeDataSet.length);
    });
  });

  describe('Cross-Service Data Validation', () => {
    test('should validate empresa ID consistency across services', async () => {
      const productData: CreateProductData = {
        nombre: 'Cross-Service Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Cross-Service Client',
        activo: true
      };

      const invalidEmpresaId = '';

      const [productResult, clientResult] = await Promise.all([
        productService.createProduct(invalidEmpresaId, productData),
        clientService.createClient(invalidEmpresaId, clientData)
      ]);

      expect(productResult.success).toBe(false);
      expect(productResult.errorType).toBe('validation');
      expect(clientResult.success).toBe(false);
      expect(clientResult.errorType).toBe('validation');
    });

    test('should handle different validation rules between services', async () => {
      // Product allows empty prices, client requires name
      const productData: CreateProductData = {
        nombre: 'Valid Product',
        colorFondo: '#FF0000',
        posicion: 0,
        // No prices - should be valid
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: '', // Invalid for client
        activo: true
      };

      mockFirestore.addDoc.mockResolvedValue({ id: 'valid-product' });

      const [productResult, clientResult] = await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      expect(productResult.success).toBe(true);
      expect(clientResult.success).toBe(false);
    });
  });

  describe('Logging and Monitoring Integration', () => {
    test('should provide comprehensive logging across services', async () => {
      const productData: CreateProductData = {
        nombre: 'Logging Integration Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Logging Integration Client',
        activo: true
      };

      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: 'logging-product' })
        .mockResolvedValueOnce({ id: 'logging-client' });

      await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      // Verify both services logged their operations
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting product creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting client creation'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created successfully'),
        expect.any(Object)
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Client created successfully'),
        expect.any(Object)
      );
    });

    test('should correlate errors across services', async () => {
      const productData: CreateProductData = {
        nombre: 'Error Correlation Product',
        colorFondo: '#FF0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Error Correlation Client',
        activo: true
      };

      const correlatedError = new Error('Correlated service error');
      (correlatedError as any).code = 'internal';
      mockFirestore.addDoc.mockRejectedValue(correlatedError);

      await Promise.all([
        productService.createProduct(testEmpresaId, productData),
        clientService.createClient(testEmpresaId, clientData)
      ]);

      // Both services should log the same error
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Product creation failed'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Correlated service error'
          })
        })
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Client creation failed'),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Correlated service error'
          })
        })
      );
    });
  });

  describe('Real-world Scenario Simulation', () => {
    test('should simulate typical user workflow', async () => {
      // Simulate a user creating a client first, then products for that client
      const clientData: CreateClientData = {
        nombre: 'Juan Pérez',
        telefono: '+1234567890',
        email: 'juan@example.com',
        activo: true
      };

      const products: CreateProductData[] = [
        { nombre: 'Coca Cola 500ml', colorFondo: '#FF0000', posicion: 0, ultimoCosto: 15, ultimaGanancia: 5, activo: true },
        { nombre: 'Pepsi 500ml', colorFondo: '#0000FF', posicion: 1, ultimoCosto: 14, ultimaGanancia: 6, activo: true },
        { nombre: 'Agua 1L', colorFondo: '#00FFFF', posicion: 2, ultimoCosto: 8, ultimaGanancia: 2, activo: true }
      ];

      // Mock successful responses
      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: 'client-juan' })
        .mockResolvedValueOnce({ id: 'product-coca' })
        .mockResolvedValueOnce({ id: 'product-pepsi' })
        .mockResolvedValueOnce({ id: 'product-agua' });

      // Create client first
      const clientResult = await clientService.createClient(testEmpresaId, clientData);
      expect(clientResult.success).toBe(true);

      // Then create products
      const productResults = await Promise.all(
        products.map(product => productService.createProduct(testEmpresaId, product))
      );

      expect(productResults.every(result => result.success)).toBe(true);
      expect(mockFirestore.addDoc).toHaveBeenCalledTimes(4);
    });

    test('should handle mixed validation scenarios', async () => {
      // Simulate form submission with some valid and some invalid data
      const mixedData = [
        { type: 'product', data: { nombre: 'Valid Product', colorFondo: '#FF0000', posicion: 0, activo: true } },
        { type: 'client', data: { nombre: '', activo: true } }, // Invalid
        { type: 'product', data: { nombre: '', colorFondo: '#FF0000', posicion: 1, activo: true } }, // Invalid
        { type: 'client', data: { nombre: 'Valid Client', telefono: '+1234567890', activo: true } }
      ];

      mockFirestore.addDoc
        .mockResolvedValueOnce({ id: 'valid-product' })
        .mockResolvedValueOnce({ id: 'valid-client' });

      const results = await Promise.all(
        mixedData.map(item => {
          if (item.type === 'product') {
            return productService.createProduct(testEmpresaId, item.data as CreateProductData);
          } else {
            return clientService.createClient(testEmpresaId, item.data as CreateClientData);
          }
        })
      );

      expect(results[0].success).toBe(true);  // Valid product
      expect(results[1].success).toBe(false); // Invalid client
      expect(results[2].success).toBe(false); // Invalid product
      expect(results[3].success).toBe(true);  // Valid client
    });
  });
});