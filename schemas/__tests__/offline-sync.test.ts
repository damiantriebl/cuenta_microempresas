// Mock Firebase/Firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    now: () => ({ seconds: Date.now() / 1000, nanoseconds: 0 })
  }
}));

// Mock Firebase config
jest.mock('@/firebaseConfig', () => ({
  db: {}
}));

import OfflineDataManager from '@/services/OfflineDataManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define test types locally to avoid import issues
interface CreateProductData {
  nombre: string;
  colorFondo: string;
  posicion: number;
  activo: boolean;
  ultimoCosto?: number;
  ultimaGanancia?: number;
}

interface CreateClientData {
  nombre: string;
  direccion: string;
  telefono: string;
  oculto: boolean;
  notas?: string;
  fechaImportante?: any;
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
}));

// Mock services with proper structure
jest.mock('@/services/ProductService', () => ({
  ProductService: {
    getInstance: jest.fn()
  }
}));

jest.mock('@/services/ClientService', () => ({
  ClientService: jest.fn()
}));

jest.mock('@/services/TransactionEventService', () => ({
  TransactionEventService: {
    createSaleEvent: jest.fn(),
    createPaymentEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn()
  }
}));

describe('Offline Synchronization', () => {
  let offlineManager: OfflineDataManager;
  const mockEmpresaId = 'test-empresa-123';

  beforeEach(() => {
    jest.clearAllMocks();
    offlineManager = OfflineDataManager.getInstance();
    
    // Mock AsyncStorage default responses
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
    (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([]);
  });

  describe('Sync Queue Management', () => {
    it('should add items to sync queue when offline', async () => {
      // Set offline status
      await offlineManager.setConnectionStatus(false);

      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'products',
        empresaId: mockEmpresaId,
        data: productData,
        maxRetries: 3
      });

      expect(offlineManager.getSyncQueueLength()).toBe(1);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_sync_queue',
        expect.stringContaining('create')
      );
    });

    it('should process sync queue when coming online', async () => {
      // Mock successful product creation
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ success: true, data: 'product-123' })
      };
      
      const { ProductService } = require('@/services/ProductService');
      (ProductService.getInstance as jest.Mock).mockReturnValue(mockProductService);

      // Add item to queue while offline
      await offlineManager.setConnectionStatus(false);
      
      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'products',
        empresaId: mockEmpresaId,
        data: productData,
        maxRetries: 3
      });

      // Mock existing queue in storage
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([{
            id: 'test-item-1',
            type: 'create',
            collection: 'products',
            empresaId: mockEmpresaId,
            data: productData,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            status: 'pending',
            priority: 'normal'
          }]));
        }
        return Promise.resolve(null);
      });

      // Come back online and process queue
      await offlineManager.setConnectionStatus(true);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProductService.createProduct).toHaveBeenCalledWith(
        mockEmpresaId,
        productData
      );
    });

    it('should handle sync failures and retry logic', async () => {
      // Mock failing product creation
      const mockProductService = {
        createProduct: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ success: true, data: 'product-123' })
      };
      
      const { ProductService } = require('@/services/ProductService');
      (ProductService.getInstance as jest.Mock).mockReturnValue(mockProductService);

      // Set online status
      await offlineManager.setConnectionStatus(true);

      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      // Mock existing queue with failed item
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([{
            id: 'test-item-1',
            type: 'create',
            collection: 'products',
            empresaId: mockEmpresaId,
            data: productData,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            status: 'pending',
            priority: 'normal'
          }]));
        }
        return Promise.resolve(null);
      });

      const result = await offlineManager.processSyncQueue();

      expect(result.failed).toBe(1);
      expect(mockProductService.createProduct).toHaveBeenCalledTimes(1);
    });

    it('should move items to failed storage after max retries', async () => {
      // Mock consistently failing product creation
      const mockProductService = {
        createProduct: jest.fn().mockRejectedValue(new Error('Persistent error'))
      };
      
      const { ProductService } = require('@/services/ProductService');
      (ProductService.getInstance as jest.Mock).mockReturnValue(mockProductService);

      // Set online status
      await offlineManager.setConnectionStatus(true);

      const productData: CreateProductData = {
        nombre: 'Test Product',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      // Mock existing queue with item at max retries
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([{
            id: 'test-item-1',
            type: 'create',
            collection: 'products',
            empresaId: mockEmpresaId,
            data: productData,
            timestamp: Date.now(),
            retryCount: 2, // One less than max
            maxRetries: 3,
            status: 'pending',
            priority: 'normal'
          }]));
        }
        return Promise.resolve(null);
      });

      await offlineManager.processSyncQueue();

      // Should have moved to failed items
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_failed_items',
        expect.stringContaining('test-item-1')
      );
    });
  });

  describe('Client Operations Sync', () => {
    it('should sync client creation operations', async () => {
      const mockClientService = {
        createClient: jest.fn().mockResolvedValue({ success: true, data: 'client-123' })
      };
      
      const { ClientService } = require('@/services/ClientService');
      (ClientService as jest.Mock).mockImplementation(() => mockClientService);

      // Set online status
      await offlineManager.setConnectionStatus(true);

      const clientData: CreateClientData = {
        nombre: 'Test Client',
        direccion: 'Test Address',
        telefono: '123456789',
        oculto: false
      };

      // Mock existing queue with client creation
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([{
            id: 'test-client-1',
            type: 'create',
            collection: 'clients',
            empresaId: mockEmpresaId,
            data: clientData,
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            status: 'pending',
            priority: 'normal'
          }]));
        }
        return Promise.resolve(null);
      });

      const result = await offlineManager.processSyncQueue();

      expect(result.processed).toBe(1);
      expect(mockClientService.createClient).toHaveBeenCalledWith(clientData);
    });

    it('should handle client visibility toggle operations', async () => {
      const mockClientService = {
        toggleClientVisibility: jest.fn().mockResolvedValue({ success: true, data: true })
      };
      
      const { ClientService } = require('@/services/ClientService');
      (ClientService as jest.Mock).mockImplementation(() => mockClientService);

      // Set online status
      await offlineManager.setConnectionStatus(true);

      // Mock existing queue with toggle operation
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([{
            id: 'test-toggle-1',
            type: 'update',
            collection: 'clients',
            empresaId: mockEmpresaId,
            documentId: 'client-123',
            data: { toggleVisibility: true },
            timestamp: Date.now(),
            retryCount: 0,
            maxRetries: 3,
            status: 'pending',
            priority: 'normal'
          }]));
        }
        return Promise.resolve(null);
      });

      const result = await offlineManager.processSyncQueue();

      expect(result.processed).toBe(1);
      expect(mockClientService.toggleClientVisibility).toHaveBeenCalledWith('client-123');
    });
  });

  describe('Cache Management', () => {
    it('should cache and retrieve products data', async () => {
      const mockProducts = [
        { id: 'prod-1', nombre: 'Product 1', colorFondo: '#ff0000', posicion: 0, activo: true },
        { id: 'prod-2', nombre: 'Product 2', colorFondo: '#00ff00', posicion: 1, activo: true }
      ];

      await offlineManager.cacheProducts(mockEmpresaId, mockProducts);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `offline_products_${mockEmpresaId}`,
        expect.stringContaining('Product 1')
      );

      // Mock cached data retrieval
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        data: mockProducts,
        timestamp: Date.now(),
        version: 1
      }));

      const cachedProducts = await offlineManager.getCachedProducts(mockEmpresaId);
      expect(cachedProducts).toEqual(mockProducts);
    });

    it('should cache and retrieve clients data', async () => {
      const mockClients = [
        { id: 'client-1', nombre: 'Client 1', direccion: 'Address 1', telefono: '123', oculto: false, deudaActual: 0 },
        { id: 'client-2', nombre: 'Client 2', direccion: 'Address 2', telefono: '456', oculto: false, deudaActual: 100 }
      ];

      await offlineManager.cacheClients(mockEmpresaId, mockClients);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        `offline_clients_${mockEmpresaId}`,
        expect.stringContaining('Client 1')
      );

      // Mock cached data retrieval
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        data: mockClients,
        timestamp: Date.now(),
        version: 1
      }));

      const cachedClients = await offlineManager.getCachedClients(mockEmpresaId);
      expect(cachedClients).toEqual(mockClients);
    });
  });

  describe('Sync Statistics', () => {
    it('should track sync statistics', async () => {
      const mockStats = {
        totalProcessed: 10,
        totalFailed: 2,
        lastSyncAttempt: Date.now(),
        lastSuccessfulSync: Date.now() - 1000,
        averageProcessingTime: 500
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_stats') {
          return Promise.resolve(JSON.stringify(mockStats));
        }
        return Promise.resolve(null);
      });

      const stats = await offlineManager.getSyncStats();
      expect(stats).toEqual(mockStats);
    });

    it('should provide comprehensive offline statistics', async () => {
      // Mock various storage responses
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_stats') {
          return Promise.resolve(JSON.stringify({
            totalProcessed: 5,
            totalFailed: 1,
            lastSyncAttempt: Date.now(),
            lastSuccessfulSync: Date.now() - 1000,
            averageProcessingTime: 300
          }));
        }
        if (key === 'offline_failed_items') {
          return Promise.resolve(JSON.stringify([
            { id: 'failed-1', type: 'create', collection: 'products' }
          ]));
        }
        if (key === `last_sync_${mockEmpresaId}`) {
          return Promise.resolve(JSON.stringify({
            products: Date.now() - 5000,
            clients: Date.now() - 3000
          }));
        }
        return Promise.resolve(null);
      });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        `offline_products_${mockEmpresaId}`,
        `offline_clients_${mockEmpresaId}`
      ]);

      (AsyncStorage.multiGet as jest.Mock).mockResolvedValue([
        [`offline_products_${mockEmpresaId}`, '{"data":[]}'],
        [`offline_clients_${mockEmpresaId}`, '{"data":[]}']
      ]);

      const stats = await offlineManager.getOfflineStats(mockEmpresaId);

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('failedItemsCount', 1);
      expect(stats).toHaveProperty('syncStats');
      expect(stats).toHaveProperty('pendingByType');
    });
  });

  describe('Failed Items Management', () => {
    it('should retry failed items', async () => {
      const failedItem = {
        id: 'failed-item-1',
        type: 'create' as const,
        collection: 'products' as const,
        empresaId: mockEmpresaId,
        data: { nombre: 'Failed Product' },
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
        status: 'failed' as const,
        priority: 'normal' as const,
        failedAt: Date.now(),
        finalError: 'Network timeout'
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_failed_items') {
          return Promise.resolve(JSON.stringify([failedItem]));
        }
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(null);
      });

      const success = await offlineManager.retryFailedItem('failed-item-1');

      expect(success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_sync_queue',
        expect.stringContaining('failed-item-1')
      );
    });

    it('should clear all failed items', async () => {
      await offlineManager.clearFailedItems();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_failed_items');
    });
  });

  describe('Priority Handling', () => {
    it('should process high priority items first', async () => {
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ success: true, data: 'product-123' })
      };
      
      const { ProductService } = require('@/services/ProductService');
      (ProductService.getInstance as jest.Mock).mockReturnValue(mockProductService);

      // Set online status
      await offlineManager.setConnectionStatus(true);

      // Mock queue with different priorities
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_sync_queue') {
          return Promise.resolve(JSON.stringify([
            {
              id: 'low-priority',
              type: 'create',
              collection: 'products',
              empresaId: mockEmpresaId,
              data: { nombre: 'Low Priority Product' },
              timestamp: Date.now() - 2000,
              retryCount: 0,
              maxRetries: 3,
              status: 'pending',
              priority: 'low'
            },
            {
              id: 'high-priority',
              type: 'create',
              collection: 'products',
              empresaId: mockEmpresaId,
              data: { nombre: 'High Priority Product' },
              timestamp: Date.now() - 1000,
              retryCount: 0,
              maxRetries: 3,
              status: 'pending',
              priority: 'high'
            }
          ]));
        }
        return Promise.resolve(null);
      });

      await offlineManager.processSyncQueue();

      // High priority should be processed first despite being newer
      expect(mockProductService.createProduct).toHaveBeenNthCalledWith(
        1,
        mockEmpresaId,
        { nombre: 'High Priority Product' }
      );
      expect(mockProductService.createProduct).toHaveBeenNthCalledWith(
        2,
        mockEmpresaId,
        { nombre: 'Low Priority Product' }
      );
    });
  });
});