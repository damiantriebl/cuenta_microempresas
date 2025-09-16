# Black Screen Diagnosis - Logging and Reporting System

## Overview

This document describes the comprehensive logging and error reporting system implemented for diagnosing and resolving black screen issues in the Expo React Native application.

## System Components

### 1. DiagnosticLogger (`services/DiagnosticLogger.ts`)

The core logging service that provides structured logging with automatic sensitive information filtering.

#### Features
- **Structured Logging**: Hierarchical log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
- **Sensitive Data Filtering**: Automatically filters passwords, tokens, emails, and other sensitive information
- **Health Metrics**: Records and monitors application performance metrics
- **Black Screen Specific Logging**: Specialized methods for black screen diagnosis
- **Export Capabilities**: Export logs for debugging and analysis

#### Usage Examples

```typescript
import { diagnosticLogger, logError, logInfo } from '../services/DiagnosticLogger';

// Basic logging
logInfo('navigation', 'User navigated to profile screen', { userId: 'user123' });
logError('provider', 'AuthProvider failed to initialize', {}, error);

// Black screen specific logging
diagnosticLogger.logBlackScreenEvent({
  errorType: 'render_failure',
  componentStack: 'App > Layout > Screen',
  recoveryAttempted: true,
  recoverySuccessful: false
});

// Health metrics
diagnosticLogger.recordHealthMetrics({
  renderPerformance: {
    averageFrameTime: 16.67,
    droppedFrames: 0,
    renderErrors: 0
  }
});
```

### 2. PerformanceMetrics (`services/PerformanceMetrics.ts`)

Monitors application performance in real-time and detects performance issues.

#### Features
- **Frame Rate Monitoring**: Tracks frame times and dropped frames
- **Memory Usage Tracking**: Monitors memory consumption patterns
- **Slow Operation Detection**: Identifies operations that exceed performance thresholds
- **Automatic Performance Logging**: Logs performance issues automatically

#### Usage Examples

```typescript
import { performanceMetrics, measureOperation } from '../services/PerformanceMetrics';

// Measure async operations
const result = await measureOperation('loadUserData', async () => {
  return await fetchUserData(userId);
});

// Record performance events
performanceMetrics.recordSlowOperation('componentRender', 150, 100);
performanceMetrics.recordInteractionDelay('buttonPress', 200);
```

### 3. ErrorReportingService (`services/ErrorReportingService.ts`)

Handles automatic error reporting and crash analytics.

#### Features
- **Automatic Error Reporting**: Captures unhandled errors and promise rejections
- **User Action Tracking**: Records user interactions for context
- **Severity Classification**: Automatically classifies error severity
- **Remote Reporting**: Sends error reports to external services (configurable)
- **Report Management**: Query, filter, and manage error reports

#### Usage Examples

```typescript
import { errorReportingService, reportError, recordUserAction } from '../services/ErrorReportingService';

// Record user actions for context
recordUserAction('button_press', { button: 'save', screen: 'profile' });

// Report errors manually
const reportId = reportError({
  category: 'validation',
  message: 'Form validation failed',
  severity: 'medium',
  context: { formData: sanitizedFormData }
});

// Report black screen errors
const blackScreenReportId = errorReportingService.reportBlackScreenError({
  errorType: 'provider_failure',
  componentStack: 'App > AuthProvider',
  recoveryAttempted: true
});
```

### 4. DiagnosticReportingSystem (`services/DiagnosticReportingSystem.ts`)

The main orchestrator that integrates all logging and reporting components.

#### Features
- **System Health Monitoring**: Comprehensive health checks across all components
- **Black Screen Diagnosis**: Automated diagnosis of black screen causes
- **Recovery Tracking**: Monitors and logs recovery attempts
- **Unified Reporting**: Generates comprehensive system health reports

#### Usage Examples

```typescript
import { 
  initializeDiagnostics, 
  diagnoseBlackScreen, 
  generateHealthReport 
} from '../services/DiagnosticReportingSystem';

// Initialize the system
initializeDiagnostics();

// Diagnose black screen issues
const diagnosis = await diagnoseBlackScreen({
  errorType: 'render_failure',
  navigationState: currentNavigationState
});

// Generate health report
const healthReport = generateHealthReport();
console.log('System Health:', healthReport.overallHealth);
```

## Integration Guide

### 1. Basic Setup

Add to your main app initialization:

```typescript
// app/_layout.tsx
import { initializeDiagnostics } from '../services/DiagnosticReportingSystem';

export default function RootLayout() {
  useEffect(() => {
    // Initialize diagnostic system
    initializeDiagnostics();
    
    return () => {
      // Cleanup on unmount
      shutdownDiagnostics();
    };
  }, []);

  // ... rest of your layout
}
```

### 2. Error Boundary Integration

```typescript
// components/GlobalErrorBoundary.tsx
import { diagnoseBlackScreen, recordRecovery } from '../services/DiagnosticReportingSystem';

export class GlobalErrorBoundary extends Component {
  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Diagnose the error
    const diagnosis = await diagnoseBlackScreen({
      error: error.message,
      componentStack: errorInfo.componentStack
    });

    // Attempt recovery based on diagnosis
    const recoverySuccess = await this.attemptRecovery(diagnosis.autoRecoveryOptions);
    
    // Record recovery attempt
    recordRecovery('auto_recovery', recoverySuccess, {
      options: diagnosis.autoRecoveryOptions,
      primaryCause: diagnosis.diagnosis.primaryCause
    });
  }
}
```

### 3. Component-Level Logging

```typescript
// components/MyComponent.tsx
import { logInfo, logError, recordUserAction } from '../services';

export function MyComponent() {
  const handleButtonPress = async () => {
    recordUserAction('button_press', { component: 'MyComponent', action: 'save' });
    
    try {
      logInfo('user_action', 'Save button pressed', { component: 'MyComponent' });
      await saveData();
    } catch (error) {
      logError('data_save', 'Failed to save data', { component: 'MyComponent' }, error);
    }
  };

  return (
    <Button onPress={handleButtonPress} title="Save" />
  );
}
```

## Configuration

### Environment-Based Configuration

The system automatically configures itself based on the environment:

- **Development**: Full logging, visual overlays, console output
- **Production**: Minimal logging, remote reporting, performance optimized

### Custom Configuration

```typescript
// Custom logging configuration
const customConfig = {
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  logLevel: LogLevel.INFO,
  maxLogEntries: 500,
  enableMetrics: true
};
```

## Debugging and Development Tools

### Console Helpers

The system provides global console helpers for debugging:

```javascript
// Available in browser console
window.debugHelpers.blackScreen.init();           // Initialize diagnostics
window.debugHelpers.blackScreen.diagnose();       // Run black screen diagnosis
window.debugHelpers.blackScreen.health();         // Get system health
window.debugHelpers.blackScreen.exportLogs();     // Export all logs
window.debugHelpers.blackScreen.clearLogs();      // Clear all logs
```

### Visual Debug Overlay

In development mode, the system can show visual debugging information:

```typescript
// Enable debug overlay
import { enableDebugMode } from '../services';

enableDebugMode(); // Shows performance metrics, error counts, etc.
```

## Performance Considerations

### Memory Management
- Automatic log rotation (keeps last 1000 entries by default)
- Metrics cleanup (keeps last 100 snapshots)
- Weak references to prevent memory leaks

### Performance Impact
- Minimal overhead in production mode
- Throttled health checks (every 5 seconds)
- Lazy loading of diagnostic tools
- Background processing where possible

## Security and Privacy

### Sensitive Data Protection
- Automatic filtering of passwords, tokens, API keys
- Email address masking
- Stack trace sanitization in production
- Configurable sensitive field patterns

### Data Retention
- Logs are stored locally only
- No automatic data transmission in development
- Configurable retention policies
- User consent for error reporting

## Testing

The system includes comprehensive tests:

```bash
# Run all logging system tests
npm test -- services/__tests__/DiagnosticLogger.simple.test.js
npm test -- services/__tests__/ErrorReportingService.simple.test.js
npm test -- services/__tests__/DiagnosticReportingSystem.simple.test.js
```

### Test Coverage
- Unit tests for all core functionality
- Integration tests for component interaction
- Mock implementations for React Native dependencies
- Performance and memory leak tests

## Troubleshooting

### Common Issues

1. **TypeScript Import Errors**
   - Use CommonJS imports in test files
   - Ensure proper module exports

2. **React Native Module Mocking**
   - Mock Platform, Dimensions, and other RN modules
   - Use simple JavaScript versions for testing

3. **Performance Impact**
   - Disable detailed logging in production
   - Use appropriate log levels
   - Monitor memory usage

### Debug Steps

1. Check system health: `generateHealthReport()`
2. Review recent logs: `diagnosticLogger.getRecentLogs()`
3. Analyze error patterns: `errorReportingService.getReportStats()`
4. Export logs for analysis: `diagnosticLogger.exportLogs()`

## Future Enhancements

### Planned Features
- Machine learning for error prediction
- Remote configuration management
- A/B testing for recovery strategies
- Advanced performance profiling
- Integration with external monitoring services

### Extensibility
- Plugin system for custom loggers
- Configurable recovery strategies
- Custom diagnostic checks
- External service integrations

## API Reference

### DiagnosticLogger Methods
- `debug(category, message, context?)`: Log debug information
- `info(category, message, context?)`: Log informational messages
- `warn(category, message, context?)`: Log warnings
- `error(category, message, context?, error?)`: Log errors
- `critical(category, message, context?, error?)`: Log critical errors
- `recordHealthMetrics(metrics)`: Record performance metrics
- `generateDiagnosticReport()`: Generate comprehensive report

### ErrorReportingService Methods
- `reportError(errorInfo)`: Report an error
- `reportBlackScreenError(context)`: Report black screen error
- `recordUserAction(type, details)`: Record user action
- `getReports(severity?)`: Get error reports
- `getReportStats()`: Get reporting statistics

### DiagnosticReportingSystem Methods
- `initialize()`: Initialize the system
- `shutdown()`: Shutdown the system
- `generateSystemHealthReport()`: Generate health report
- `diagnoseBlackScreen(context?)`: Diagnose black screen
- `recordRecoveryAttempt(method, success, details?)`: Record recovery

## Support

For issues or questions about the logging system:

1. Check the test files for usage examples
2. Review the generated diagnostic reports
3. Use the console helpers for debugging
4. Consult the system health reports for insights

The logging and reporting system is designed to be self-documenting through its comprehensive reporting capabilities.