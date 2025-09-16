import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { ProductService } from '@/services/ProductService';
import { ClientService } from '@/services/ClientService';
import { TransactionEventService } from '@/services/TransactionEventService';
import OfflineDataManager from '@/services/OfflineDataManager';
import useNetworkStatus from '@/hooks/useNetworkStatus';
import {
  Product,
  Client,
  TransactionEvent,
  CompanyMember
} from '@/schemas/types';
import { subscribeToCompanyMembers } from '@/schemas/firestore-utils';

interface RealtimeDataContextType {
  // Products
  products: Product[];
  productsLoading: boolean;

  // Clients
  clients: Client[];
  clientsLoading: boolean;
  includeHiddenClients: boolean;
  setIncludeHiddenClients: (include: boolean) => void;

  // Company Members
  companyMembers: CompanyMember[];
  membersLoading: boolean;

  // Transaction Events (for selected client)
  selectedClientEvents: TransactionEvent[];
  eventsLoading: boolean;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;

  // Connection status
  isConnected: boolean;
  lastSyncTime: Date | null;

  // Manual refresh functions
  refreshProducts: () => void;
  refreshClients: () => void;
  refreshMembers: () => void;
  refreshEvents: () => void;
  refreshAll: () => void;
}

const RealtimeDataContext = createContext<RealtimeDataContextType | undefined>(undefined);

interface RealtimeDataProviderProps {
  children: ReactNode;
}


export function RealtimeDataProvider({ children }: RealtimeDataProviderProps) {
  const { empresaId } = useAuth();
  const { isOnline } = useNetworkStatus();

  // State for all data types
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [includeHiddenClients, setIncludeHiddenClients] = useState(false);

  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [selectedClientEvents, setSelectedClientEvents] = useState<TransactionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Use network status from hook instead of local state
  // const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Services
  const [productService, setProductService] = useState<ProductService | null>(null);
  const [clientService, setClientService] = useState<ClientService | null>(null);
  const offlineManager = OfflineDataManager.getInstance();

  // Initialize services when empresaId changes
  useEffect(() => {
    if (empresaId) {
      const prodService = ProductService.getInstance();
      const clientSvc = new ClientService(empresaId);

      setProductService(prodService);
      setClientService(clientSvc);

      // Initialize product service
      prodService.initialize().catch(console.error);
    } else {
      setProductService(null);
      setClientService(null);

      // Clear all data when no company selected
      setProducts([]);
      setClients([]);
      setCompanyMembers([]);
      setSelectedClientEvents([]);
      setSelectedClientId(null);
    }
  }, [empresaId]);

  // ============================================================================
  // PRODUCTS REAL-TIME SUBSCRIPTION WITH OFFLINE SUPPORT
  // ============================================================================

  useEffect(() => {
    if (!empresaId || !productService) return;

    setProductsLoading(true);

    // Load cached data first
    const loadCachedProducts = async () => {
      const cachedProducts = await offlineManager.getCachedProducts(empresaId);
      if (cachedProducts) {
        setProducts(cachedProducts);
        setProductsLoading(false);
      }
    };

    loadCachedProducts();

    const unsubscribe = productService.subscribeToProducts(empresaId, async (updatedProducts) => {
      setProducts(updatedProducts);
      setProductsLoading(false);
      setLastSyncTime(new Date());

      // Cache the updated data
      await offlineManager.cacheProducts(empresaId, updatedProducts);
    });

    return () => {
      unsubscribe();
      setProductsLoading(false);
    };
  }, [empresaId, productService]);

  // ============================================================================
  // CLIENTS REAL-TIME SUBSCRIPTION WITH OFFLINE SUPPORT
  // ============================================================================

  useEffect(() => {
    if (!empresaId || !clientService) return;

    setClientsLoading(true);

    // Load cached data first
    const loadCachedClients = async () => {
      const cachedClients = await offlineManager.getCachedClients(empresaId);
      if (cachedClients) {
        // Apply client-side filtering for hidden clients
        const filteredClients = includeHiddenClients
          ? cachedClients
          : cachedClients.filter(client => !client.oculto);
        setClients(filteredClients);
        setClientsLoading(false);
      }
    };

    loadCachedClients();

    const unsubscribe = clientService.subscribeToClients(
      async (updatedClients) => {
        setClients(updatedClients);
        setClientsLoading(false);
        setLastSyncTime(new Date());

        // Cache the updated data (cache all clients, filtering is done on display)
        const allClients = includeHiddenClients
          ? updatedClients
          : [...updatedClients, ...(await offlineManager.getCachedClients(empresaId) || []).filter(c => c.oculto)];
        await offlineManager.cacheClients(empresaId, allClients);
      },
      {
        includeHidden: includeHiddenClients,
        sortBy: 'nombre',
        sortOrder: 'asc'
      }
    );

    return () => {
      unsubscribe();
      setClientsLoading(false);
    };
  }, [empresaId, clientService, includeHiddenClients]);

  // ============================================================================
  // COMPANY MEMBERS REAL-TIME SUBSCRIPTION WITH OFFLINE SUPPORT
  // ============================================================================

  useEffect(() => {
    if (!empresaId) return;

    setMembersLoading(true);

    // Load cached data first
    const loadCachedMembers = async () => {
      const cachedMembers = await offlineManager.getCachedMembers(empresaId);
      if (cachedMembers) {
        setCompanyMembers(cachedMembers);
        setMembersLoading(false);
      }
    };

    loadCachedMembers();

    const unsubscribe = subscribeToCompanyMembers(empresaId, async (updatedMembers) => {
      setCompanyMembers(updatedMembers);
      setMembersLoading(false);
      setLastSyncTime(new Date());

      // Cache the updated data
      await offlineManager.cacheMembers(empresaId, updatedMembers);
    });

    return () => {
      unsubscribe();
      setMembersLoading(false);
    };
  }, [empresaId]);

  // ============================================================================
  // TRANSACTION EVENTS REAL-TIME SUBSCRIPTION WITH OFFLINE SUPPORT
  // ============================================================================

  useEffect(() => {
    if (!empresaId || !selectedClientId) {
      setSelectedClientEvents([]);
      return;
    }

    setEventsLoading(true);

    // Load cached data first
    const loadCachedEvents = async () => {
      const cachedEvents = await offlineManager.getCachedEvents(empresaId, selectedClientId);
      if (cachedEvents) {
        setSelectedClientEvents(cachedEvents);
        setEventsLoading(false);
      }
    };

    loadCachedEvents();

    const unsubscribe = TransactionEventService.subscribeToClientEvents(
      empresaId,
      selectedClientId,
      async (updatedEvents) => {
        setSelectedClientEvents(updatedEvents);
        setEventsLoading(false);
        setLastSyncTime(new Date());

        // Cache the updated data
        await offlineManager.cacheEvents(empresaId, selectedClientId, updatedEvents);
      }
    );

    return () => {
      unsubscribe();
      setEventsLoading(false);
    };
  }, [empresaId, selectedClientId]);

  // ============================================================================
  // MANUAL REFRESH FUNCTIONS
  // ============================================================================

  const refreshProducts = useCallback(async () => {
    if (!empresaId || !productService) {
      // This is normal when on company selection screen - silently skip
      return;
    }

    console.log('RealtimeDataProvider.refreshProducts: Starting manual refresh', { empresaId });
    setProductsLoading(true);
    try {
      console.log('RealtimeDataProvider.refreshProducts: Calling productService.getProducts');
      const result = await productService.getProducts(empresaId);
      console.log('RealtimeDataProvider.refreshProducts: getProducts completed');
      console.log('RealtimeDataProvider.refreshProducts: Service result', {
        success: result.success,
        dataLength: result.data?.length,
        errors: result.errors
      });

      if (result.success && result.data) {
        console.log('RealtimeDataProvider.refreshProducts: Setting products', {
          count: result.data.length,
          productNames: result.data.map(p => p.nombre)
        });
        setProducts(result.data);
        await offlineManager.cacheProducts(empresaId, result.data);
      } else {
        console.error('RealtimeDataProvider.refreshProducts: Service failed', { errors: result.errors });
        // Try to load from cache if service fails
        const cachedProducts = await offlineManager.getCachedProducts(empresaId);
        if (cachedProducts) {
          console.log('RealtimeDataProvider.refreshProducts: Using cached products', { count: cachedProducts.length });
          setProducts(cachedProducts);
        }
      }
    } catch (error) {
      console.error('RealtimeDataProvider.refreshProducts: Exception occurred', error);
      // Try to load from cache if network fails
      const cachedProducts = await offlineManager.getCachedProducts(empresaId);
      if (cachedProducts) {
        console.log('RealtimeDataProvider.refreshProducts: Using cached products after error', { count: cachedProducts.length });
        setProducts(cachedProducts);
      }
    } finally {
      setProductsLoading(false);
    }
  }, [empresaId, productService]);

  const refreshClients = useCallback(async () => {
    if (!empresaId || !clientService) return;

    setClientsLoading(true);
    try {
      const result = await clientService.getClients({
        includeHidden: includeHiddenClients,
        sortBy: 'nombre',
        sortOrder: 'asc'
      });

      if (result.success && result.data) {
        setClients(result.data);
        await offlineManager.cacheClients(empresaId, result.data);
      }
    } catch (error) {
      console.error('Error refreshing clients:', error);
      // Try to load from cache if network fails
      const cachedClients = await offlineManager.getCachedClients(empresaId);
      if (cachedClients) {
        const filteredClients = includeHiddenClients
          ? cachedClients
          : cachedClients.filter(client => !client.oculto);
        setClients(filteredClients);
      }
    } finally {
      setClientsLoading(false);
    }
  }, [empresaId, clientService, includeHiddenClients]);

  const refreshMembers = useCallback(() => {
    // Members are only available through real-time subscription
    // This function exists for consistency but doesn't do manual loading
    console.log('Company members are only available through real-time subscription');
  }, []);

  const refreshEvents = useCallback(async () => {
    if (!empresaId || !selectedClientId) return;

    setEventsLoading(true);
    try {
      const events = await TransactionEventService.getClientEvents(empresaId, selectedClientId);
      setSelectedClientEvents(events);
      await offlineManager.cacheEvents(empresaId, selectedClientId, events);
    } catch (error) {
      console.error('Error refreshing events:', error);
      // Try to load from cache if network fails
      const cachedEvents = await offlineManager.getCachedEvents(empresaId, selectedClientId);
      if (cachedEvents) {
        setSelectedClientEvents(cachedEvents);
      }
    } finally {
      setEventsLoading(false);
    }
  }, [empresaId, selectedClientId]);

  const refreshAll = useCallback(() => {
    // Only refresh if we have a company selected
    if (empresaId) {
      refreshProducts();
      refreshClients();
      refreshMembers();
      refreshEvents();
    }
  }, [empresaId, refreshProducts, refreshClients, refreshMembers, refreshEvents]);

  // ============================================================================
  // NETWORK STATUS HANDLING
  // ============================================================================

  useEffect(() => {
    // When coming back online, refresh all data and process sync queue
    if (isOnline) {
      refreshAll();
      offlineManager.processSyncQueue();
    }
  }, [isOnline, refreshAll]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const contextValue: RealtimeDataContextType = {
    // Products
    products,
    productsLoading,

    // Clients
    clients,
    clientsLoading,
    includeHiddenClients,
    setIncludeHiddenClients,

    // Company Members
    companyMembers,
    membersLoading,

    // Transaction Events
    selectedClientEvents,
    eventsLoading,
    selectedClientId,
    setSelectedClientId,

    // Connection status
    isConnected: isOnline,
    lastSyncTime,

    // Manual refresh functions
    refreshProducts,
    refreshClients,
    refreshMembers,
    refreshEvents,
    refreshAll,
  };

  return (
    <RealtimeDataContext.Provider value={contextValue}>
      {children}
    </RealtimeDataContext.Provider>
  );
}

export function useRealtimeData(): RealtimeDataContextType {
  const context = useContext(RealtimeDataContext);
  if (context === undefined) {
    throw new Error('useRealtimeData must be used within a RealtimeDataProvider');
  }
  return context;
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for accessing only products data
 */
export function useProducts() {
  const { products, productsLoading, refreshProducts } = useRealtimeData();
  return { products, productsLoading, refreshProducts };
}

/**
 * Hook for accessing only clients data
 */
export function useClients() {
  const {
    clients,
    clientsLoading,
    includeHiddenClients,
    setIncludeHiddenClients,
    refreshClients
  } = useRealtimeData();

  return {
    clients,
    clientsLoading,
    includeHiddenClients,
    setIncludeHiddenClients,
    refreshClients
  };
}

/**
 * Hook for accessing only company members data
 */
export function useCompanyMembers() {
  const { companyMembers, membersLoading, refreshMembers } = useRealtimeData();
  return { companyMembers, membersLoading, refreshMembers };
}

/**
 * Hook for accessing transaction events for selected client
 */
export function useClientEvents() {
  const {
    selectedClientEvents,
    eventsLoading,
    selectedClientId,
    setSelectedClientId,
    refreshEvents
  } = useRealtimeData();

  return {
    events: selectedClientEvents,
    eventsLoading,
    selectedClientId,
    setSelectedClientId,
    refreshEvents
  };
}

/**
 * Hook for connection status
 */
export function useConnectionStatus() {
  const { isConnected, lastSyncTime } = useRealtimeData();
  return { isConnected, lastSyncTime };
}