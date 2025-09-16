// Mock Firebase for testing
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

// Mock Firebase modules
jest.mock('firebase/firestore', () => mockFirestore);
jest.mock('@/firebaseConfig', () => ({
  db: 'mock-db'
}));

import { createProduct } from '../firestore-utils';
import { CreateProductData } from '../types';

describe('Product Creation Debug Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Product Creation Flow', () => {
    const validProductData: CreateProductData = {
      nombre: 'Test Product',
      colorFondo: '#FF0000',
      posicion: 0,
      ultimoCosto: 10,
      ultimaGanancia: 5,
      activo: true
    };

    test('should create product with valid data and log all steps', async () => {
      const mockProductRef = { id: 'product-123' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('company-123', validProductData);

      // Verify logging
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('firestore-utils.createProduct: Starting Firestore product creation'),
        expect.objectContaining({
          empresaId: 'company-123',
          productData: expect.objectContaining({
            nombre: 'Test Product',
            colorFondo: '#FF0000',
            posicion: 0,
            activo: true,
            hasUltimoCosto: true,
            hasUltimaGanancia: true
          })
        })
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product document prepared'),
        expect.any(Object)
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Products collection reference obtained'),
        expect.any(Object)
      );

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created successfully in Firestore'),
        expect.objectContaining({
          empresaId: 'company-123',
          productId: 'product-123',
          productName: 'Test Product'
        })
      );

      // Verify Firestore calls
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Test Product',
          colorFondo: '#FF0000',
          posicion: 0,
          ultimoCosto: 10,
          ultimaGanancia: 5,
          activo: true,
          creado: expect.anything()
        })
      );

      expect(productId).toBe('product-123');
    });

    test('should create product without prices and log appropriately', async () => {
      const productDataWithoutPrices: CreateProductData = {
        nombre: 'Test Product No Prices',
        colorFondo: '#00FF00',
        posicion: 1,
        activo: true
      };

      const mockProductRef = { id: 'product-456' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('company-456', productDataWithoutPrices);

      // Verify logging shows no prices
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting Firestore product creation'),
        expect.objectContaining({
          productData: expect.objectContaining({
            hasUltimoCosto: false,
            hasUltimaGanancia: false
          })
        })
      );

      // Verify Firestore call without prices
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Test Product No Prices',
          colorFondo: '#00FF00',
          posicion: 1,
          activo: true,
          creado: expect.anything()
        })
      );

      expect(productId).toBe('product-456');
    });

    test('should handle Firestore errors and log them properly', async () => {
      const firestoreError = new Error('Permission denied');
      (firestoreError as any).code = 'permission-denied';
      mockFirestore.addDoc.mockRejectedValue(firestoreError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await expect(createProduct('company-123', validProductData)).rejects.toThrow('Permission denied');

      // Verify error logging
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create product in Firestore'),
        expect.objectContaining({
          empresaId: 'company-123',
          productName: 'Test Product',
          error: expect.objectContaining({
            name: 'Error',
            message: 'Permission denied',
            code: 'permission-denied'
          })
        })
      );
    });

    test('should handle network errors and log them properly', async () => {
      const networkError = new Error('Network request failed');
      (networkError as any).code = 'unavailable';
      mockFirestore.addDoc.mockRejectedValue(networkError);
      mockFirestore.collection.mockReturnValue('mock-collection');

      await expect(createProduct('company-789', validProductData)).rejects.toThrow('Network request failed');

      // Verify error logging
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create product in Firestore'),
        expect.objectContaining({
          empresaId: 'company-789',
          error: expect.objectContaining({
            message: 'Network request failed',
            code: 'unavailable'
          })
        })
      );
    });

    test('should handle missing empresaId gracefully', async () => {
      const mockProductRef = { id: 'product-999' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('', validProductData);

      // Should still work but log empty empresaId
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting Firestore product creation'),
        expect.objectContaining({
          empresaId: ''
        })
      );

      expect(productId).toBe('product-999');
    });

    test('should handle special characters in product name', async () => {
      const specialProductData: CreateProductData = {
        nombre: 'Café & Té (Especial) - 500ml',
        colorFondo: '#FF00FF',
        posicion: 0,
        activo: true
      };

      const mockProductRef = { id: 'product-special' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('company-special', specialProductData);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created successfully in Firestore'),
        expect.objectContaining({
          productName: 'Café & Té (Especial) - 500ml'
        })
      );

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          nombre: 'Café & Té (Especial) - 500ml'
        })
      );

      expect(productId).toBe('product-special');
    });

    test('should handle large position numbers', async () => {
      const largePositionData: CreateProductData = {
        nombre: 'Product at Large Position',
        colorFondo: '#FFFF00',
        posicion: 999999,
        activo: true
      };

      const mockProductRef = { id: 'product-large-pos' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('company-large', largePositionData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          posicion: 999999
        })
      );

      expect(productId).toBe('product-large-pos');
    });

    test('should handle zero and negative prices', async () => {
      const zeroPriceData: CreateProductData = {
        nombre: 'Free Product',
        colorFondo: '#000000',
        posicion: 0,
        ultimoCosto: 0,
        ultimaGanancia: 0,
        activo: true
      };

      const mockProductRef = { id: 'product-free' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const productId = await createProduct('company-free', zeroPriceData);

      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          ultimoCosto: 0,
          ultimaGanancia: 0
        })
      );

      expect(productId).toBe('product-free');
    });
  });

  describe('Collection Reference Tests', () => {
    test('should generate correct collection path', async () => {
      const mockProductRef = { id: 'test-collection-path' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      
      // Mock collection to capture the path
      let capturedPath = '';
      mockFirestore.collection.mockImplementation((db, ...pathSegments) => {
        capturedPath = pathSegments.join('/');
        return 'mock-collection';
      });

      await createProduct('test-empresa-123', {
        nombre: 'Test Collection Path',
        colorFondo: '#123456',
        posicion: 0,
        activo: true
      });

      expect(capturedPath).toBe('empresas/test-empresa-123/productos');
    });
  });

  describe('Timestamp Handling', () => {
    test('should add creation timestamp', async () => {
      const mockProductRef = { id: 'timestamp-test' };
      mockFirestore.addDoc.mockResolvedValue(mockProductRef);
      mockFirestore.collection.mockReturnValue('mock-collection');

      const mockTimestamp = { toMillis: () => 1234567890, toDate: () => new Date() };
      mockFirestore.Timestamp.now = jest.fn().mockReturnValue(mockTimestamp);

      await createProduct('timestamp-company', {
        nombre: 'Timestamp Test',
        colorFondo: '#ABCDEF',
        posicion: 0,
        activo: true
      });

      expect(mockFirestore.Timestamp.now).toHaveBeenCalled();
      expect(mockFirestore.addDoc).toHaveBeenCalledWith(
        'mock-collection',
        expect.objectContaining({
          creado: mockTimestamp
        })
      );
    });
  });
});