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
  products: Product[];
  productsLoading: boolean;
  clients: Client[];
  clientsLoading: boolean;
  includeHiddenClients: boolean;
  setIncludeHiddenClients: (include: boolean) => void;
  companyMembers: CompanyMember[];
  membersLoading: boolean;
  selectedClientEvents: TransactionEvent[];
  eventsLoading: boolean;
  selectedClientId: string | null;
  setSelectedClientId: (clientId: string | null) => void;
  isConnected: boolean;
  lastSyncTime: Date | null;
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
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [productService, setProductService] = useState<ProductService | null>(null);
  const [clientService, setClientService] = useState<ClientService | null>(null);
  const offlineManager = OfflineDataManager.getInstance();
  useEffect(() => {
    if (empresaId) {
      const prodService = ProductService.getInstance();
      const clientSvc = new ClientService(empresaId);
      setProductService(prodService);
      setClientService(clientSvc);
      prodService.initialize().catch((error) => {
        console.error('ProductService initialization failed:', error);
      });
    } else {
      setProductService(null);
      setClientService(null);
      setProducts([]);
      setClients([]);
      setCompanyMembers([]);
      setSelectedClientEvents([]);
      setSelectedClientId(null);
    }
  }, [empresaId]);
  useEffect(() => {
    if (!empresaId || !productService) return;
    setProductsLoading(true);
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
      await offlineManager.cacheProducts(empresaId, updatedProducts);
    });
    return () => {
      unsubscribe();
      setProductsLoading(false);
    };
  }, [empresaId, productService]);
  useEffect(() => {
    if (!empresaId || !clientService) return;
    setClientsLoading(true);
    const loadCachedClients = async () => {
      const cachedClients = await offlineManager.getCachedClients(empresaId);
      if (cachedClients) {
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
        const filteredClients = includeHiddenClients
          ? updatedClients
          : updatedClients.filter(client => !client.oculto);
        setClients(filteredClients);
        setClientsLoading(false);
        setLastSyncTime(new Date());
        await offlineManager.cacheClients(empresaId, updatedClients);
      }
    );
    return () => {
      unsubscribe();
      setClientsLoading(false);
    };
  }, [empresaId, clientService, includeHiddenClients]);
  useEffect(() => {
    if (!empresaId) return;
    setMembersLoading(true);
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
      await offlineManager.cacheMembers(empresaId, updatedMembers);
    });
    return () => {
      unsubscribe();
      setMembersLoading(false);
    };
  }, [empresaId]);
  useEffect(() => {
    if (!empresaId || !selectedClientId) {
      setSelectedClientEvents([]);
      return;
    }
    setEventsLoading(true);
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
        await offlineManager.cacheEvents(empresaId, selectedClientId, updatedEvents);
      }
    );
    return () => {
      unsubscribe();
      setEventsLoading(false);
    };
  }, [empresaId, selectedClientId]);
  const refreshProducts = useCallback(async () => {
    if (!empresaId || !productService) {
      console.error('RealtimeDataProvider.refreshProducts: Missing empresaId or productService', {
        empresaId: !!empresaId,
        productService: !!productService
      });
      return;
    }
    setProductsLoading(true);
    try {
      const result = await productService.getProducts(empresaId);
      if (result?.success && result.data) {
        setProducts(result.data);
        await offlineManager.cacheProducts(empresaId, result.data);
      } else {
        console.error('RealtimeDataProvider.refreshProducts: Service failed', { 
          result: result || 'No result returned',
          errors: result?.errors || ['Unknown error'] 
        });
        const cachedProducts = await offlineManager.getCachedProducts(empresaId);
        if (cachedProducts) {
          setProducts(cachedProducts);
        }
      }
    } catch (error) {
      console.error('RealtimeDataProvider.refreshProducts: Exception occurred', error);
      const cachedProducts = await offlineManager.getCachedProducts(empresaId);
      if (cachedProducts) {
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
      const result = await clientService.getClients();
      if (result.success && result.data) {
        const filteredClients = includeHiddenClients
          ? result.data
          : result.data.filter(client => !client.oculto);
        setClients(filteredClients);
        await offlineManager.cacheClients(empresaId, result.data);
      }
    } catch (error) {
      console.error('Error refreshing clients:', error);
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
      const cachedEvents = await offlineManager.getCachedEvents(empresaId, selectedClientId);
      if (cachedEvents) {
        setSelectedClientEvents(cachedEvents);
      }
    } finally {
      setEventsLoading(false);
    }
  }, [empresaId, selectedClientId]);
  const refreshAll = useCallback(() => {
    if (empresaId) {
      refreshProducts();
      refreshClients();
      refreshMembers();
      refreshEvents();
    }
  }, [empresaId, refreshProducts, refreshClients, refreshMembers, refreshEvents]);
  useEffect(() => {
    if (isOnline) {
      refreshAll();
      offlineManager.processSyncQueue();
    }
  }, [isOnline, refreshAll]);
  const contextValue: RealtimeDataContextType = {
    products,
    productsLoading,
    clients,
    clientsLoading,
    includeHiddenClients,
    setIncludeHiddenClients,
    companyMembers,
    membersLoading,
    selectedClientEvents,
    eventsLoading,
    selectedClientId,
    setSelectedClientId,
    isConnected: isOnline,
    lastSyncTime,
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
export function useProducts() {
  const { products, productsLoading, refreshProducts } = useRealtimeData();
  return { products, productsLoading, refreshProducts };
}
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
export function useCompanyMembers() {
  const { companyMembers, membersLoading, refreshMembers } = useRealtimeData();
  return { companyMembers, membersLoading, refreshMembers };
}
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
export function useConnectionStatus() {
  const { isConnected, lastSyncTime } = useRealtimeData();
  return { isConnected, lastSyncTime };
}