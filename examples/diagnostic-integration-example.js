// Example of how to integrate the GlobalErrorBoundary and DiagnosticService
// This file demonstrates the usage without requiring complex test setup

import React from 'react';
import { View, Text } from 'react-native';
import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import { DiagnosticService } from '../services/DiagnosticService';

// Example of wrapping your app with GlobalErrorBoundary
export function AppWithErrorBoundary({ children }) {
  const handleError = (error, errorInfo) => {
    console.log('Custom error handler called:', error.message);
    // You could send this to crash reporting service
  };

  return (
    <GlobalErrorBoundary onError={handleError}>
      {children}
    </GlobalErrorBoundary>
  );
}

// Example of setting up navigation ref for diagnostics
export function setupDiagnostics(navigationRef) {
  // Set the navigation reference for diagnostic checks
  DiagnosticService.setNavigationRef(navigationRef);
  
  console.log('✅ Diagnostic system initialized');
}

// Example of manually running diagnostics
export async function runManualDiagnostic() {
  try {
    console.log('🔍 Running manual diagnostic...');
    const report = await DiagnosticService.runFullDiagnostic();
    
    console.log('📊 Diagnostic Report:');
    console.log('- Timestamp:', report.timestamp);
    console.log('- Severity:', report.severity);
    console.log('- Providers:', report.checks.providers.status);
    console.log('- Navigation:', report.checks.navigation.status);
    console.log('- Assets:', report.checks.assets.status);
    console.log('- Firebase:', report.checks.firebase.status);
    console.log('- Metro:', report.checks.metro.status);
    console.log('- Dependencies:', report.checks.dependencies.status);
    console.log('- Recommendations:', report.recommendations);
    
    return report;
  } catch (error) {
    console.error('❌ Failed to run diagnostic:', error);
    return null;
  }
}

// Example component that might throw an error
export function ProblematicComponent({ shouldThrow = false }) {
  if (shouldThrow) {
    throw new Error('This is a test error for demonstration');
  }
  
  return (
    <View>
      <Text>This component works fine!</Text>
    </View>
  );
}

// Example of complete app setup
export function ExampleApp() {
  return (
    <AppWithErrorBoundary>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Welcome to the app with error boundary protection!</Text>
        <ProblematicComponent shouldThrow={false} />
      </View>
    </AppWithErrorBoundary>
  );
}

// Usage instructions:
/*
1. Wrap your main app component with GlobalErrorBoundary:
   <GlobalErrorBoundary>
     <YourApp />
   </GlobalErrorBoundary>

2. Set up the navigation reference in your main navigation component:
   const navigationRef = useNavigationContainerRef();
   
   useEffect(() => {
     DiagnosticService.setNavigationRef(navigationRef);
   }, []);

3. The error boundary will automatically catch errors and show recovery screen

4. You can manually run diagnostics anytime:
   const report = await DiagnosticService.runFullDiagnostic();

5. The system will attempt automatic recovery for non-critical errors
*/