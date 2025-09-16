/**
 * Example of how to integrate the ProviderChainVerifier system
 * This shows how to use the verifier to detect and handle provider issues
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ProviderChainVerifier } from '@/services/ProviderChainVerifier';
import ProviderErrorBoundary from '@/components/ProviderErrorBoundary';
import { 
  FallbackAuthProvider,
  FallbackThemeProvider,
  FallbackToastProvider,
  FallbackRealtimeDataProvider,
  FallbackClientSelectionProvider
} from '@/components/SafeProviderFallbacks';

// Example 1: Basic provider chain verification
export async function verifyProviderHealth() {
  const verifier = ProviderChainVerifier.getInstance();
  
  try {
    console.log('Running provider chain verification...');
    const report = await verifier.verifyProviderChain();
    
    console.log('Provider Chain Report:', {
      overall: report.overall,
      timestamp: report.timestamp,
      providerCount: report.providers.length
    });

    // Check each provider
    report.providers.forEach(provider => {
      console.log(`${provider.name}: ${provider.status} - ${provider.message}`);
      
      if (provider.context) {
        console.log(`  Context:`, provider.context);
      }
      
      if (provider.error) {
        console.error(`  Error:`, provider.error.message);
      }
    });

    // Show recommendations
    console.log('Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });

    return report;
  } catch (error) {
    console.error('Provider verification failed:', error);
    return null;
  }
}

// Example 2: Detect specific provider errors
export async function detectSpecificProviderIssues() {
  const verifier = ProviderChainVerifier.getInstance();
  const providersToCheck = [
    'AuthProvider',
    'ThemeProvider', 
    'RealtimeDataProvider',
    'ToastProvider'
  ];

  for (const providerName of providersToCheck) {
    try {
      console.log(`\nChecking ${providerName}...`);
      const result = await verifier.detectProviderErrors(providerName);
      
      if (result.hasErrors) {
        console.error(`❌ ${providerName} has errors:`);
        result.errors.forEach(error => console.error(`  - ${error}`));
      }
      
      if (result.warnings.length > 0) {
        console.warn(`⚠️ ${providerName} has warnings:`);
        result.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      
      if (!result.hasErrors && result.warnings.length === 0) {
        console.log(`✅ ${providerName} is healthy`);
      }
      
      if (result.context) {
        console.log(`  Context:`, result.context);
      }
    } catch (error) {
      console.error(`Failed to check ${providerName}:`, error);
    }
  }
}

// Example 3: Attempt automatic recovery
export async function attemptProviderRecovery(providerName) {
  const verifier = ProviderChainVerifier.getInstance();
  
  try {
    console.log(`Attempting recovery for ${providerName}...`);
    const success = await verifier.attemptProviderRecovery(providerName);
    
    if (success) {
      console.log(`✅ Recovery successful for ${providerName}`);
      
      // Verify the provider is now healthy
      const errors = await verifier.detectProviderErrors(providerName);
      if (!errors.hasErrors) {
        console.log(`✅ ${providerName} is now healthy after recovery`);
      } else {
        console.warn(`⚠️ ${providerName} still has issues after recovery`);
      }
    } else {
      console.error(`❌ Recovery failed for ${providerName}`);
    }
    
    return success;
  } catch (error) {
    console.error(`Recovery attempt failed for ${providerName}:`, error);
    return false;
  }
}

// Example 4: Safe provider wrapper component
export function SafeProviderWrapper({ 
  children, 
  providerName, 
  OriginalProvider, 
  fallbackProvider 
}) {
  return (
    <ProviderErrorBoundary
      providerName={providerName}
      fallbackComponent={fallbackProvider}
      onError={(error, errorInfo) => {
        console.error(`Provider ${providerName} failed:`, error);
        
        // Optionally attempt automatic recovery
        attemptProviderRecovery(providerName).then(success => {
          if (success) {
            console.log(`Auto-recovery successful for ${providerName}`);
          }
        });
      }}
    >
      <OriginalProvider>
        {children}
      </OriginalProvider>
    </ProviderErrorBoundary>
  );
}

// Example 5: Provider health monitoring component
export function ProviderHealthMonitor() {
  const [healthReport, setHealthReport] = React.useState(null);
  const [isChecking, setIsChecking] = React.useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const report = await verifyProviderHealth();
      setHealthReport(report);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const attemptRecovery = async (providerName) => {
    const success = await attemptProviderRecovery(providerName);
    if (success) {
      // Refresh health report
      checkHealth();
    }
  };

  React.useEffect(() => {
    // Check health on mount
    checkHealth();
  }, []);

  if (!healthReport) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Loading provider health...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Provider Health Status: {healthReport.overall.toUpperCase()}
      </Text>
      
      <TouchableOpacity
        onPress={checkHealth}
        disabled={isChecking}
        style={{
          backgroundColor: '#007AFF',
          padding: 10,
          borderRadius: 5,
          marginBottom: 15
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {isChecking ? 'Checking...' : 'Refresh Health Check'}
        </Text>
      </TouchableOpacity>

      {healthReport.providers.map((provider, index) => (
        <View key={index} style={{ 
          marginBottom: 10, 
          padding: 10, 
          backgroundColor: provider.status === 'error' ? '#ffebee' : 
                          provider.status === 'warning' ? '#fff3e0' : '#e8f5e8',
          borderRadius: 5 
        }}>
          <Text style={{ fontWeight: 'bold' }}>
            {provider.name}: {provider.status.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12, color: '#666' }}>
            {provider.message}
          </Text>
          
          {provider.status === 'error' && (
            <TouchableOpacity
              onPress={() => attemptRecovery(provider.name)}
              style={{
                backgroundColor: '#ff9800',
                padding: 5,
                borderRadius: 3,
                marginTop: 5
              }}
            >
              <Text style={{ color: 'white', fontSize: 12, textAlign: 'center' }}>
                Attempt Recovery
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <View style={{ marginTop: 15 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
          Recommendations:
        </Text>
        {healthReport.recommendations.map((rec, index) => (
          <Text key={index} style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
            • {rec}
          </Text>
        ))}
      </View>
    </View>
  );
}

// Example 6: Complete safe provider setup
export function createSafeProviderChain() {
  const verifier = ProviderChainVerifier.getInstance();
  const fallbacks = verifier.getSafeFallbackProviders();

  return {
    SafeAuthProvider: ({ children }) => (
      <SafeProviderWrapper
        providerName="AuthProvider"
        fallbackProvider={fallbacks.FallbackAuthProvider}
      >
        {children}
      </SafeProviderWrapper>
    ),
    
    SafeThemeProvider: ({ children }) => (
      <SafeProviderWrapper
        providerName="ThemeProvider"
        fallbackProvider={fallbacks.FallbackThemeProvider}
      >
        {children}
      </SafeProviderWrapper>
    ),
    
    SafeToastProvider: ({ children }) => (
      <SafeProviderWrapper
        providerName="ToastProvider"
        fallbackProvider={fallbacks.FallbackToastProvider}
      >
        {children}
      </SafeProviderWrapper>
    ),
    
    SafeRealtimeDataProvider: ({ children }) => (
      <SafeProviderWrapper
        providerName="RealtimeDataProvider"
        fallbackProvider={fallbacks.FallbackRealtimeDataProvider}
      >
        {children}
      </SafeProviderWrapper>
    ),
    
    SafeClientSelectionProvider: ({ children }) => (
      <SafeProviderWrapper
        providerName="ClientSelectionProvider"
        fallbackProvider={fallbacks.FallbackClientSelectionProvider}
      >
        {children}
      </SafeProviderWrapper>
    )
  };
}

// Usage example in _layout.tsx:
/*
import { createSafeProviderChain } from '@/examples/provider-chain-integration-example';

const {
  SafeAuthProvider,
  SafeThemeProvider,
  SafeToastProvider,
  SafeRealtimeDataProvider,
  SafeClientSelectionProvider
} = createSafeProviderChain();

export default function RootLayout() {
  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeThemeProvider>
        <SafeToastProvider>
          <SafeAuthProvider>
            <SafeRealtimeDataProvider>
              <SafeClientSelectionProvider>
                <AppNavigator />
                <OfflineStatusBar />
                <StatusBar style="auto" />
              </SafeClientSelectionProvider>
            </SafeRealtimeDataProvider>
          </SafeAuthProvider>
        </SafeToastProvider>
      </SafeThemeProvider>
    </NavigationThemeProvider>
  );
}
*/