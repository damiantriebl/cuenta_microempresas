import { renderHook, act } from '@testing-library/react-hooks';
import useOfflineOperations from '@/hooks/useOfflineOperations';
import OfflineDataManager from '@/services/OfflineDataManager';
import { CreateProductData, CreateClientData } from '@/schemas/types';

// Mock the dependencies
jest.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ empresaId: 'test-empresa-123' })
}));

jest.mock('@/context/RealtimeDataProvider', () => ({
  useConnectionStatus: () => ({ isConnected: true })
}));

jest.mock('@/services/ProductService');
jest.mock('@/services/ClientService');
jest.mock('@/services/TransactionEventService');

describe('Offline Operations Integration', () => {
  let offlineManager: OfflineDataManager;

  beforeEach(() => {
    jest.clearAllMocks();
    offlineManager = OfflineDataManager.getInstance();
  });

  describe('Product Creation Flow', () => {
    it('should handle online product creation', async () => {
      const { ProductService } = require('@/services/ProductService');
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ 
          success: true, 
          data: 'product-123' 
        })
      };
      ProductService.getInstance.mockReturnValue(mockProductService);

      const { result } = renderHook(() => useOfflineOperations());

      const productData: CreateProductData = {
        nombre: 'Test Product Online',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createProduct(productData);
      });

      expect(createResult).toEqual({
        success: true,
        data: 'product-123'
      });
      expect(mockProductService.createProduct).toHaveBeenCalledWith(
        'test-empresa-123',
        productData
      );
    });

    it('should queue product creation when offline', async () => {
      // Mock offline status
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      const { result, rerender } = renderHook(() => useOfflineOperations());

      const productData: CreateProductData = {
        nombre: 'Test Product Offline',
        colorFondo: '#00ff00',
        posicion: 1,
        activo: true
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createProduct(productData);
      });

      expect(createResult).toEqual({
        success: true,
        data: expect.stringMatching(/^temp_\d+$/),
        message: 'Producto guardado localmente. Se sincronizará cuando haya conexión.'
      });

      // Verify item was queued
      expect(result.current.queueLength).toBe(1);
    });
  });

  describe('Client Creation Flow', () => {
    it('should handle online client creation', async () => {
      const { ClientService } = require('@/services/ClientService');
      const mockClientService = {
        createClient: jest.fn().mockResolvedValue({ 
          success: true, 
          data: 'client-123' 
        })
      };
      ClientService.mockImplementation(() => mockClientService);

      const { result } = renderHook(() => useOfflineOperations());

      const clientData: CreateClientData = {
        nombre: 'Test Client Online',
        direccion: 'Test Address',
        telefono: '123456789',
        oculto: false
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createClient(clientData);
      });

      expect(createResult).toEqual({
        success: true,
        data: 'client-123'
      });
      expect(mockClientService.createClient).toHaveBeenCalledWith(clientData);
    });

    it('should queue client creation when offline', async () => {
      // Mock offline status
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      const { result } = renderHook(() => useOfflineOperations());

      const clientData: CreateClientData = {
        nombre: 'Test Client Offline',
        direccion: 'Test Address Offline',
        telefono: '987654321',
        oculto: false
      };

      let createResult;
      await act(async () => {
        createResult = await result.current.createClient(clientData);
      });

      expect(createResult).toEqual({
        success: true,
        data: expect.stringMatching(/^temp_\d+$/),
        message: 'Cliente guardado localmente. Se sincronizará cuando haya conexión.'
      });

      // Verify item was queued
      expect(result.current.queueLength).toBe(1);
    });
  });

  describe('Offline-to-Online Transition', () => {
    it('should sync queued items when coming back online', async () => {
      const { ProductService } = require('@/services/ProductService');
      const { ClientService } = require('@/services/ClientService');
      
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ success: true, data: 'product-123' })
      };
      const mockClientService = {
        createClient: jest.fn().mockResolvedValue({ success: true, data: 'client-123' })
      };
      
      ProductService.getInstance.mockReturnValue(mockProductService);
      ClientService.mockImplementation(() => mockClientService);

      // Start offline
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      const { result, rerender } = renderHook(() => useOfflineOperations());

      // Create items while offline
      const productData: CreateProductData = {
        nombre: 'Offline Product',
        colorFondo: '#ff0000',
        posicion: 0,
        activo: true
      };

      const clientData: CreateClientData = {
        nombre: 'Offline Client',
        direccion: 'Offline Address',
        telefono: '123456789',
        oculto: false
      };

      await act(async () => {
        await result.current.createProduct(productData);
        await result.current.createClient(clientData);
      });

      expect(result.current.queueLength).toBe(2);

      // Come back online
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: true })
      }));

      rerender();

      // Force sync
      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSyncAll();
      });

      expect(syncResult.processed).toBe(2);
      expect(syncResult.failed).toBe(0);
      expect(syncResult.remaining).toBe(0);

      expect(mockProductService.createProduct).toHaveBeenCalledWith(
        'test-empresa-123',
        productData
      );
      expect(mockClientService.createClient).toHaveBeenCalledWith(clientData);
    });

    it('should handle partial sync failures gracefully', async () => {
      const { ProductService } = require('@/services/ProductService');
      const { ClientService } = require('@/services/ClientService');
      
      const mockProductService = {
        createProduct: jest.fn().mockRejectedValue(new Error('Product creation failed'))
      };
      const mockClientService = {
        createClient: jest.fn().mockResolvedValue({ success: true, data: 'client-123' })
      };
      
      ProductService.getInstance.mockReturnValue(mockProductService);
      ClientService.mockImplementation(() => mockClientService);

      // Start offline and queue items
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      const { result, rerender } = renderHook(() => useOfflineOperations());

      await act(async () => {
        await result.current.createProduct({
          nombre: 'Failing Product',
          colorFondo: '#ff0000',
          posicion: 0,
          activo: true
        });
        await result.current.createClient({
          nombre: 'Success Client',
          direccion: 'Success Address',
          telefono: '123456789',
          oculto: false
        });
      });

      // Come back online
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: true })
      }));

      rerender();

      // Force sync
      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSyncAll();
      });

      expect(syncResult.processed).toBe(1); // Only client succeeded
      expect(syncResult.failed).toBe(1);    // Product failed
      expect(syncResult.remaining).toBe(1); // Product still in queue for retry
    });
  });

  describe('Sync Status and Statistics', () => {
    it('should provide accurate sync status information', async () => {
      const { result } = renderHook(() => useOfflineOperations());

      // Queue some items
      await act(async () => {
        await result.current.createProduct({
          nombre: 'Status Test Product',
          colorFondo: '#ff0000',
          posicion: 0,
          activo: true
        });
      });

      let syncStatus;
      await act(async () => {
        syncStatus = await result.current.getSyncStatus();
      });

      expect(syncStatus).toHaveProperty('queueLength');
      expect(syncStatus).toHaveProperty('failedItemsCount');
      expect(syncStatus).toHaveProperty('syncStats');
      expect(syncStatus).toHaveProperty('pendingByType');
      expect(syncStatus.queueLength).toBeGreaterThan(0);
    });

    it('should track failed items and allow retry', async () => {
      const { result } = renderHook(() => useOfflineOperations());

      // Simulate failed items
      const failedItems = [
        {
          id: 'failed-1',
          type: 'create' as const,
          collection: 'products' as const,
          empresaId: 'test-empresa-123',
          data: { nombre: 'Failed Product' },
          timestamp: Date.now(),
          retryCount: 3,
          maxRetries: 3,
          status: 'failed' as const,
          priority: 'normal' as const,
          failedAt: Date.now(),
          finalError: 'Network timeout'
        }
      ];

      // Mock failed items in storage
      jest.spyOn(offlineManager, 'getFailedItems').mockResolvedValue(failedItems);
      jest.spyOn(offlineManager, 'retryFailedItem').mockResolvedValue(true);

      let retrievedFailedItems;
      await act(async () => {
        retrievedFailedItems = await result.current.getFailedItems();
      });

      expect(retrievedFailedItems).toEqual(failedItems);

      let retryResult;
      await act(async () => {
        retryResult = await result.current.retryFailedItem('failed-1');
      });

      expect(retryResult).toBe(true);
      expect(offlineManager.retryFailedItem).toHaveBeenCalledWith('failed-1');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors during sync gracefully', async () => {
      const { ProductService } = require('@/services/ProductService');
      
      const mockProductService = {
        createProduct: jest.fn()
          .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
          .mockResolvedValueOnce({ success: true, data: 'product-123' })
      };
      
      ProductService.getInstance.mockReturnValue(mockProductService);

      const { result } = renderHook(() => useOfflineOperations());

      // Queue item while offline
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      await act(async () => {
        await result.current.createProduct({
          nombre: 'Network Error Product',
          colorFondo: '#ff0000',
          posicion: 0,
          activo: true
        });
      });

      // Come online and sync (first attempt fails)
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: true })
      }));

      let firstSyncResult;
      await act(async () => {
        firstSyncResult = await result.current.forceSyncAll();
      });

      expect(firstSyncResult.failed).toBe(1);
      expect(firstSyncResult.remaining).toBe(1); // Item should still be in queue for retry

      // Second sync attempt should succeed
      let secondSyncResult;
      await act(async () => {
        secondSyncResult = await result.current.forceSyncAll();
      });

      expect(secondSyncResult.processed).toBe(1);
      expect(secondSyncResult.remaining).toBe(0);
    });

    it('should clear offline data when requested', async () => {
      const { result } = renderHook(() => useOfflineOperations());

      jest.spyOn(offlineManager, 'clearCache').mockResolvedValue();

      await act(async () => {
        await result.current.clearOfflineData();
      });

      expect(offlineManager.clearCache).toHaveBeenCalledWith('test-empresa-123');
    });

    it('should clear failed items when requested', async () => {
      const { result } = renderHook(() => useOfflineOperations());

      jest.spyOn(offlineManager, 'clearFailedItems').mockResolvedValue();

      await act(async () => {
        await result.current.clearFailedItems();
      });

      expect(offlineManager.clearFailedItems).toHaveBeenCalled();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large sync queues efficiently', async () => {
      const { ProductService } = require('@/services/ProductService');
      
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ success: true, data: 'product-123' })
      };
      
      ProductService.getInstance.mockReturnValue(mockProductService);

      const { result } = renderHook(() => useOfflineOperations());

      // Queue many items while offline
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: false })
      }));

      const itemCount = 50;
      await act(async () => {
        for (let i = 0; i < itemCount; i++) {
          await result.current.createProduct({
            nombre: `Bulk Product ${i}`,
            colorFondo: '#ff0000',
            posicion: i,
            activo: true
          });
        }
      });

      expect(result.current.queueLength).toBe(itemCount);

      // Come online and sync all items
      jest.doMock('@/context/RealtimeDataProvider', () => ({
        useConnectionStatus: () => ({ isConnected: true })
      }));

      const startTime = Date.now();
      let syncResult;
      await act(async () => {
        syncResult = await result.current.forceSyncAll();
      });
      const endTime = Date.now();

      expect(syncResult.processed).toBe(itemCount);
      expect(syncResult.remaining).toBe(0);
      expect(mockProductService.createProduct).toHaveBeenCalledTimes(itemCount);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should prioritize high-priority operations', async () => {
      const { ProductService } = require('@/services/ProductService');
      
      const mockProductService = {
        createProduct: jest.fn().mockResolvedValue({ success: true, data: 'product-123' })
      };
      
      ProductService.getInstance.mockReturnValue(mockProductService);

      // Manually add items with different priorities
      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'products',
        empresaId: 'test-empresa-123',
        data: { nombre: 'Low Priority Product' },
        maxRetries: 3,
        priority: 'low'
      });

      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'products',
        empresaId: 'test-empresa-123',
        data: { nombre: 'High Priority Product' },
        maxRetries: 3,
        priority: 'high'
      });

      await offlineManager.setConnectionStatus(true);
      const result = await offlineManager.processSyncQueue();

      expect(result.processed).toBe(2);
      
      // High priority should be processed first
      expect(mockProductService.createProduct).toHaveBeenNthCalledWith(
        1,
        'test-empresa-123',
        { nombre: 'High Priority Product' }
      );
      expect(mockProductService.createProduct).toHaveBeenNthCalledWith(
        2,
        'test-empresa-123',
        { nombre: 'Low Priority Product' }
      );
    });
  });
});