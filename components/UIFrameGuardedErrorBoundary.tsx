import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ErrorDetectionUtility from '../services/ErrorDetectionUtility';
import DiagnosticService, { UIFrameGuardedError } from '../services/DiagnosticService';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: UIFrameGuardedError, errorInfo: React.ErrorInfo) => void;
  enableRecovery?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  uiFrameGuardedError: UIFrameGuardedError | null;
  retryCount: number;
}

/**
 * UIFrameGuarded-specific Error Boundary Component
 * 
 * This component catches UIFrameGuarded errors and provides fallback UI
 * with recovery mechanisms and detailed error reporting.
 */
class UIFrameGuardedErrorBoundary extends Component<Props, State> {
  private errorDetectionUtility: ErrorDetectionUtility;
  private diagnosticService: DiagnosticService;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      uiFrameGuardedError: null,
      retryCount: 0
    };

    this.errorDetectionUtility = ErrorDetectionUtility.getInstance();
    this.diagnosticService = DiagnosticService.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Detect if this is a UIFrameGuarded error
    const uiFrameGuardedError = this.errorDetectionUtility.detectError(error, {
      component: this.props.componentName || 'Unknown',
      timestamp: new Date(),
      platform: 'react-native',
      action: 'component_render'
    });

    this.setState({
      errorInfo,
      uiFrameGuardedError
    });

    // Call custom error handler if provided
    if (this.props.onError && uiFrameGuardedError) {
      this.props.onError(uiFrameGuardedError, errorInfo);
    }

    // Log detailed error information
    this.logErrorDetails(error, errorInfo, uiFrameGuardedError);
  }

  private logErrorDetails(
    error: Error, 
    errorInfo: React.ErrorInfo, 
    uiFrameGuardedError: UIFrameGuardedError | null
  ) {
    console.group('🚨 UIFrameGuarded Error Boundary Triggered');
    console.error('Original Error:', error);
    console.error('Error Info:', errorInfo);
    
    if (uiFrameGuardedError) {
      console.error('UIFrameGuarded Analysis:', {
        affectedComponents: uiFrameGuardedError.affectedComponents,
        potentialCauses: uiFrameGuardedError.potentialCauses,
        suggestedFixes: uiFrameGuardedError.suggestedFixes
      });
    }
    
    if (this.props.componentName) {
      console.error('Component Name:', this.props.componentName);
    }
    
    console.groupEnd();
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        uiFrameGuardedError: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      uiFrameGuardedError: null,
      retryCount: 0
    });
  };

  private renderErrorDetails() {
    const { uiFrameGuardedError, error } = this.state;
    
    if (!uiFrameGuardedError) {
      return (
        <View style={styles.errorDetails}>
          <Text style={styles.errorTitle}>Component Error</Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'An unknown error occurred'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.errorDetails}>
        <Text style={styles.errorTitle}>UIFrameGuarded Error Detected</Text>
        
        {uiFrameGuardedError.affectedComponents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Affected Components:</Text>
            {uiFrameGuardedError.affectedComponents.map((component, index) => (
              <Text key={index} style={styles.listItem}>• {component}</Text>
            ))}
          </View>
        )}

        {uiFrameGuardedError.potentialCauses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Potential Causes:</Text>
            {uiFrameGuardedError.potentialCauses.map((cause, index) => (
              <Text key={index} style={styles.listItem}>
                • {cause.description} (Severity: {cause.severity})
              </Text>
            ))}
          </View>
        )}

        {uiFrameGuardedError.suggestedFixes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested Fixes:</Text>
            {uiFrameGuardedError.suggestedFixes.slice(0, 2).map((fix, index) => (
              <Text key={index} style={styles.listItem}>
                • {fix.description}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  private renderRecoveryActions() {
    const { retryCount } = this.state;
    const canRetry = this.props.enableRecovery !== false && retryCount < this.maxRetries;

    return (
      <View style={styles.actions}>
        {canRetry && (
          <TouchableOpacity 
            style={[styles.button, styles.retryButton]} 
            onPress={this.handleRetry}
          >
            <Text style={styles.buttonText}>
              Retry ({this.maxRetries - retryCount} attempts left)
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.resetButton]} 
          onPress={this.handleReset}
        >
          <Text style={styles.buttonText}>Reset Component</Text>
        </TouchableOpacity>
      </View>
    );
  }

  private renderFallbackUI() {
    // Use custom fallback component if provided
    if (this.props.fallbackComponent) {
      return (
        <View style={styles.container}>
          {this.props.fallbackComponent}
          {this.renderRecoveryActions()}
        </View>
      );
    }

    // Default fallback UI
    return (
      <View style={styles.container}>
        <View style={styles.errorIcon}>
          <Text style={styles.errorIconText}>⚠️</Text>
        </View>
        
        {this.renderErrorDetails()}
        {this.renderRecoveryActions()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Component: {this.props.componentName || 'Unknown'}
          </Text>
          <Text style={styles.footerText}>
            Time: {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: 20,
  },
  errorIconText: {
    fontSize: 48,
  },
  errorDetails: {
    width: '100%',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7f1d1d',
    textAlign: 'center',
    marginBottom: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 5,
  },
  listItem: {
    fontSize: 12,
    color: '#7f1d1d',
    marginLeft: 10,
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  retryButton: {
    backgroundColor: '#059669',
  },
  resetButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
    paddingTop: 10,
    width: '100%',
  },
  footerText: {
    fontSize: 10,
    color: '#991b1b',
    textAlign: 'center',
  },
});

export default UIFrameGuardedErrorBoundary;