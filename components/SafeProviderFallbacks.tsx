import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
interface FallbackAuthContextType {
  user: null;
  loading: boolean;
  empresaId: null;
  setEmpresaId: (empresaId: string | null) => void;
  empresas: [];
  refreshEmpresas: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutApp: () => Promise<void>;
}
const FallbackAuthContext = createContext<FallbackAuthContextType>({
  user: null,
  loading: false,
  empresaId: null,
  setEmpresaId: () => {},
  empresas: [],
  refreshEmpresas: async () => {},
  signInWithEmail: async () => { 
    throw new Error('Auth service unavailable - using fallback provider'); 
  },
  signUpWithEmail: async () => { 
    throw new Error('Auth service unavailable - using fallback provider'); 
  },
  signOutApp: async () => { 
    throw new Error('Auth service unavailable - using fallback provider'); 
  }
});
export const FallbackAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FallbackAuthContext.Provider value={{  user: null, loading: false, empresaId: null, setEmpresaId: () => {}, empresas: [], refreshEmpresas: async () => {}, signInWithEmail: async () => { throw new Error('Auth service unavailable - using fallback provider'); }, signUpWithEmail: async () => { throw new Error('Auth service unavailable - using fallback provider'); }, signOutApp: async () => { throw new Error('Auth service unavailable - using fallback provider'); } }}>
      <View style={styles.fallbackContainer}>
        {children}
        <FallbackIndicator providerName="Auth" />
      </View>
    </FallbackAuthContext.Provider>
  );
};
interface FallbackThemeContextType {
  colors: {
    primary: string;
    background: string;
    text: string;
    error: string;
    warning: string;
    success: string;
  };
  gradients: {};
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  typography: {
    fontSize: number;
    fontWeight: string;
  };
  shadows: {};
}
const fallbackTheme: FallbackThemeContextType = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759'
  },
  gradients: {},
  spacing: {
    small: 8,
    medium: 16,
    large: 24
  },
  typography: {
    fontSize: 16,
    fontWeight: 'normal'
  },
  shadows: {}
};
const FallbackThemeContext = createContext<FallbackThemeContextType>(fallbackTheme);
export const FallbackThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FallbackThemeContext.Provider value={fallbackTheme}>
      <View style={styles.fallbackContainer}>
        {children}
        <FallbackIndicator providerName="Theme" />
      </View>
    </FallbackThemeContext.Provider>
  );
};
interface FallbackToastContextType {
  showToast: (message: string, type: string, action?: any) => void;
  hideToast: () => void;
}
const FallbackToastContext = createContext<FallbackToastContextType>({
  showToast: (message: string) => {
    console.warn(`Toast unavailable - Message: ${message}`);
  },
  hideToast: () => {}
});
export const FallbackToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FallbackToastContext.Provider value={{ showToast: (message: string) => { console.warn(`Toast unavailable - Message: ${message}`); }, hideToast: () => {} }}>
      <View style={styles.fallbackContainer}>
        {children}
        <FallbackIndicator providerName="Toast" />
      </View>
    </FallbackToastContext.Provider>
  );
};
interface FallbackRealtimeDataContextType {
  products: [];
  productsLoading: boolean;
  clients: [];
  clientsLoading: boolean;
  includeHiddenClients: boolean;
  setIncludeHiddenClients: (include: boolean) => void;
  companyMembers: [];
  membersLoading: boolean;
  selectedClientEvents: [];
  eventsLoading: boolean;
  selectedClientId: null;
  setSelectedClientId: (clientId: string | null) => void;
  isConnected: boolean;
  lastSyncTime: null;
  refreshProducts: () => void;
  refreshClients: () => void;
  refreshMembers: () => void;
  refreshEvents: () => void;
  refreshAll: () => void;
}
const fallbackRealtimeData: FallbackRealtimeDataContextType = {
  products: [],
  productsLoading: false,
  clients: [],
  clientsLoading: false,
  includeHiddenClients: false,
  setIncludeHiddenClients: () => {},
  companyMembers: [],
  membersLoading: false,
  selectedClientEvents: [],
  eventsLoading: false,
  selectedClientId: null,
  setSelectedClientId: () => {},
  isConnected: false,
  lastSyncTime: null,
  refreshProducts: () => console.warn('RealtimeData service unavailable'),
  refreshClients: () => console.warn('RealtimeData service unavailable'),
  refreshMembers: () => console.warn('RealtimeData service unavailable'),
  refreshEvents: () => console.warn('RealtimeData service unavailable'),
  refreshAll: () => console.warn('RealtimeData service unavailable')
};
const FallbackRealtimeDataContext = createContext<FallbackRealtimeDataContextType>(fallbackRealtimeData);
export const FallbackRealtimeDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FallbackRealtimeDataContext.Provider value={fallbackRealtimeData}>
      <View style={styles.fallbackContainer}>
        {children}
        <FallbackIndicator providerName="RealtimeData" />
      </View>
    </FallbackRealtimeDataContext.Provider>
  );
};
interface FallbackClientSelectionContextType {
  selectedClient: null;
  selectClient: (client: any) => void;
  clearSelection: () => void;
  isClientSelected: boolean;
}
const fallbackClientSelection: FallbackClientSelectionContextType = {
  selectedClient: null,
  selectClient: () => console.warn('ClientSelection service unavailable'),
  clearSelection: () => {},
  isClientSelected: false
};
const FallbackClientSelectionContext = createContext<FallbackClientSelectionContextType>(fallbackClientSelection);
export const FallbackClientSelectionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <FallbackClientSelectionContext.Provider value={fallbackClientSelection}>
      <View style={styles.fallbackContainer}>
        {children}
        <FallbackIndicator providerName="ClientSelection" />
      </View>
    </FallbackClientSelectionContext.Provider>
  );
};
const FallbackIndicator: React.FC<{ providerName: string }> = ({ providerName }) => {
  if (!__DEV__) return null;
  return (
    <View style={styles.indicator}>
      <Text style={styles.indicatorText}>
        ⚠️ Fallback {providerName} Provider Active
      </Text>
    </View>
  );
};
export const useFallbackAuth = () => useContext(FallbackAuthContext);
export const useFallbackTheme = () => useContext(FallbackThemeContext);
export const useFallbackToast = () => useContext(FallbackToastContext);
export const useFallbackRealtimeData = () => useContext(FallbackRealtimeDataContext);
export const useFallbackClientSelection = () => useContext(FallbackClientSelectionContext);
const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    zIndex: 9999,
  },
  indicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
export class SafeProviderFactory {
  static createSafeProvider<T extends React.ComponentType<any>>(
    OriginalProvider: T,
    FallbackProvider: React.ComponentType<{ children: ReactNode }>,
    providerName: string
  ): React.ComponentType<React.ComponentProps<T>> {
    return function SafeProvider(props: React.ComponentProps<T>) {
      return (
        <ProviderErrorBoundary
          providerName={providerName}
          fallbackComponent={FallbackProvider}
        >
          <OriginalProvider {...props} />
        </ProviderErrorBoundary>
      );
    };
  }
  static getAllFallbackProviders() {
    return {
      FallbackAuthProvider,
      FallbackThemeProvider,
      FallbackToastProvider,
      FallbackRealtimeDataProvider,
      FallbackClientSelectionProvider
    };
  }
}
import ProviderErrorBoundary from './ProviderErrorBoundary';
export default SafeProviderFactory;