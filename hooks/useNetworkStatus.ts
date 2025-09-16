import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import OfflineDataManager from '@/services/OfflineDataManager';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  details: any;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
    details: null
  });

  const offlineManager = OfflineDataManager.getInstance();

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;
      
      setNetworkStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
        details: state.details
      });

      // Update offline manager with connection status
      offlineManager.setConnectionStatus(isConnected && (isInternetReachable ?? true));
    });

    // Get initial network state
    NetInfo.fetch().then(state => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;
      
      setNetworkStatus({
        isConnected,
        isInternetReachable,
        type: state.type,
        details: state.details
      });

      offlineManager.setConnectionStatus(isConnected && (isInternetReachable ?? true));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    ...networkStatus,
    isOnline: networkStatus.isConnected && (networkStatus.isInternetReachable ?? true)
  };
}

export default useNetworkStatus;