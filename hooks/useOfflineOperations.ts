import { useCallback } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { useConnectionStatus } from '@/context/RealtimeDataProvider';
import OfflineDataManager from '@/services/OfflineDataManager';
import { ProductService } from '@/services/ProductService';
import { ClientService } from '@/services/ClientService';
import { TransactionEventService } from '@/services/TransactionEventService';
import { 
  CreateProductData, 
  UpdateProductData,
  CreateClientData, 
  UpdateClientData,
  CreateSaleEventData,
  CreatePaymentEventData,
  UpdateTransactionEventData
} from '@/schemas/types';

export function useOfflineOperations() {
  const { empresaId } = useAuth();
  const { isConnected } = useConnectionStatus();
  const offlineManager = OfflineDataManager.getInstance();

  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================

  const createProduct = useCallback(async (productData: CreateProductData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const productService = ProductService.getInstance();
      return await productService.createProduct(empresaId, productData);
    } else {
      // Offline: Queue for later sync with high priority for user-initiated actions
      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'products',
        empresaId,
        data: productData,
        maxRetries: 3,
        priority: 'high'
      });
      
      console.log('Product queued for offline sync:', {
        productName: productData.nombre,
        queueLength: offlineManager.getSyncQueueLength()
      });
      
      return { 
        success: true, 
        data: `temp_${Date.now()}`,
        message: 'Producto guardado localmente. Se sincronizará cuando haya conexión.'
      };
    }
  }, [empresaId, isConnected]);

  const updateProduct = useCallback(async (productId: string, updates: UpdateProductData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const productService = ProductService.getInstance();
      return await productService.updateProduct(empresaId, productId, updates);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'update',
        collection: 'products',
        empresaId,
        documentId: productId,
        data: updates,
        maxRetries: 3
      });
      
      return { success: true };
    }
  }, [empresaId, isConnected]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const productService = ProductService.getInstance();
      return await productService.deleteProduct(empresaId, productId);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'delete',
        collection: 'products',
        empresaId,
        documentId: productId,
        maxRetries: 3
      });
      
      return { success: true };
    }
  }, [empresaId, isConnected]);

  // ============================================================================
  // CLIENT OPERATIONS
  // ============================================================================

  const createClient = useCallback(async (clientData: CreateClientData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const clientService = new ClientService(empresaId);
      return await clientService.createClient(clientData);
    } else {
      // Offline: Queue for later sync with high priority for user-initiated actions
      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'clients',
        empresaId,
        data: clientData,
        maxRetries: 3,
        priority: 'high'
      });
      
      console.log('Client queued for offline sync:', {
        clientName: clientData.nombre,
        queueLength: offlineManager.getSyncQueueLength()
      });
      
      return { 
        success: true, 
        data: `temp_${Date.now()}`,
        message: 'Cliente guardado localmente. Se sincronizará cuando haya conexión.'
      };
    }
  }, [empresaId, isConnected]);

  const updateClient = useCallback(async (clientId: string, updates: UpdateClientData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const clientService = new ClientService(empresaId);
      return await clientService.updateClient(clientId, updates);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'update',
        collection: 'clients',
        empresaId,
        documentId: clientId,
        data: updates,
        maxRetries: 3
      });
      
      return { success: true };
    }
  }, [empresaId, isConnected]);

  const toggleClientVisibility = useCallback(async (clientId: string) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      const clientService = new ClientService(empresaId);
      return await clientService.toggleClientVisibility(clientId);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'update',
        collection: 'clients',
        empresaId,
        documentId: clientId,
        data: { toggleVisibility: true }, // Special flag for toggle operation
        maxRetries: 3
      });
      
      return { success: true, isHidden: true }; // Optimistic response
    }
  }, [empresaId, isConnected]);

  // ============================================================================
  // TRANSACTION EVENT OPERATIONS
  // ============================================================================

  const createSaleEvent = useCallback(async (saleData: CreateSaleEventData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      return await TransactionEventService.createSaleEvent(empresaId, saleData);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'events',
        empresaId,
        data: saleData,
        maxRetries: 3
      });
      
      return { success: true, eventId: `temp_${Date.now()}` };
    }
  }, [empresaId, isConnected]);

  const createPaymentEvent = useCallback(async (paymentData: CreatePaymentEventData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      return await TransactionEventService.createPaymentEvent(empresaId, paymentData);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'create',
        collection: 'events',
        empresaId,
        data: paymentData,
        maxRetries: 3
      });
      
      return { success: true, eventId: `temp_${Date.now()}` };
    }
  }, [empresaId, isConnected]);

  const updateEvent = useCallback(async (eventId: string, updates: UpdateTransactionEventData) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      return await TransactionEventService.updateEvent(empresaId, eventId, updates);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'update',
        collection: 'events',
        empresaId,
        documentId: eventId,
        data: updates,
        maxRetries: 3
      });
      
      return { success: true };
    }
  }, [empresaId, isConnected]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!empresaId) throw new Error('No company selected');

    if (isConnected) {
      // Online: Execute immediately
      return await TransactionEventService.deleteEvent(empresaId, eventId);
    } else {
      // Offline: Queue for later sync
      await offlineManager.addToSyncQueue({
        type: 'delete',
        collection: 'events',
        empresaId,
        documentId: eventId,
        maxRetries: 3
      });
      
      return { success: true };
    }
  }, [empresaId, isConnected]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getSyncStatus = useCallback(async () => {
    if (!empresaId) return null;
    
    return await offlineManager.getOfflineStats(empresaId);
  }, [empresaId]);

  const forceSyncAll = useCallback(async () => {
    if (isConnected) {
      console.log('Starting manual sync...');
      const result = await offlineManager.processSyncQueue();
      console.log('Manual sync completed:', result);
      return result;
    } else {
      console.warn('Cannot sync while offline');
      return { processed: 0, failed: 0, remaining: offlineManager.getSyncQueueLength() };
    }
  }, [isConnected]);

  const clearOfflineData = useCallback(async () => {
    if (empresaId) {
      await offlineManager.clearCache(empresaId);
      console.log('Offline data cleared for company:', empresaId);
    }
  }, [empresaId]);

  const getFailedItems = useCallback(async () => {
    return await offlineManager.getFailedItems();
  }, []);

  const retryFailedItem = useCallback(async (itemId: string) => {
    return await offlineManager.retryFailedItem(itemId);
  }, []);

  const clearFailedItems = useCallback(async () => {
    await offlineManager.clearFailedItems();
  }, []);

  return {
    // Product operations
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Client operations
    createClient,
    updateClient,
    toggleClientVisibility,
    
    // Event operations
    createSaleEvent,
    createPaymentEvent,
    updateEvent,
    deleteEvent,
    
    // Utility functions
    getSyncStatus,
    forceSyncAll,
    clearOfflineData,
    getFailedItems,
    retryFailedItem,
    clearFailedItems,
    
    // Status
    isOffline: !isConnected,
    queueLength: offlineManager.getSyncQueueLength(),
    isSyncing: offlineManager.isSyncInProgress(),
  };
}

export default useOfflineOperations;