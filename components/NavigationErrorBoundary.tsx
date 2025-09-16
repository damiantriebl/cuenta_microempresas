import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { NavigationStateVerifier, NavigationStatus } from '@/services/NavigationStateVerifier';

interface Props {
  children: ReactNode;
  fallbackRoute?: string;
  onNavigationError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  navigationStatus: NavigationStatus | null;
  recoveryAttempts: number;
}

/**
 * Error boundary specifically for navigation-related errors
 * Provides automatic recovery and safe navigation fallbacks
 */
export class NavigationErrorBoundary extends Component<Props, State> {
  private verifier: NavigationStateVerifier;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      navigationStatus: null,
      recoveryAttempts: 0
    };
    this.verifier = NavigationStateVerifier.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a navigation-related error
    const isNavigationError = 
      error.message.includes('navigation') ||
      error.message.includes('route') ||
      error.message.includes('router') ||
      error.stack?.includes('expo-router') ||
      error.stack?.includes('@react-navigation');

    if (isNavigationError) {
      return {
        hasError: true,
        error
      };
    }

    // If not navigation-related, let other error boundaries handle it
    throw error;
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Navigation Error:', error);
    console.error('Error Info:', errorInfo);

    // Call custom error handler if provided
    if (this.props.onNavigationError) {
      this.props.onNavigationError(error, errorInfo);
    }

    // Verify navigation state
    try {
      const navigationStatus = await this.verifier.verifyNavigationState();
      this.setState({ navigationStatus });

      // Attempt automatic recovery if this is the first error
      if (this.state.recoveryAttempts === 0) {
        this.attemptAutomaticRecovery();
      }
    } catch (verificationError) {
      console.error('Navigation verification failed:', verificationError);
    }
  }

  private attemptAutomaticRecovery = async () => {
    const { fallbackRoute = '/(tabs)' } = this.props;
    const { recoveryAttempts } = this.state;

    if (recoveryAttempts >= 3) {
      console.warn('Max navigation recovery attempts reached');
      return;
    }

    this.setState({ recoveryAttempts: recoveryAttempts + 1 });

    try {
      console.log('Attempting automatic navigation recovery...');
      
      const recoverySuccess = await this.verifier.attemptNavigationRecovery({
        resetToRoute: fallbackRoute,
        clearStack: true,
        preserveParams: false
      });

      if (recoverySuccess) {
        console.log('Navigation recovery successful');
        // Reset error state to retry rendering
        this.setState({
          hasError: false,
          error: null,
          navigationStatus: null
        });
      } else {
        console.warn('Navigation recovery failed');
      }
    } catch (recoveryError) {
      console.error('Navigation recovery attempt failed:', recoveryError);
    }
  };

  private handleManualRecovery = async (route: string) => {
    try {
      console.log(`Manual navigation recovery to: ${route}`);
      
      const success = await this.verifier.attemptNavigationRecovery({
        resetToRoute: route,
        clearStack: true,
        preserveParams: false
      });

      if (success) {
        this.setState({
          hasError: false,
          error: null,
          navigationStatus: null,
          recoveryAttempts: 0
        });
      }
    } catch (error) {
      console.error('Manual recovery failed:', error);
    }
  };

  private handleEmergencyReset = async () => {
    try {
      console.log('Performing emergency navigation reset');
      
      const success = await this.verifier.performEmergencyReset();
      
      if (success) {
        this.setState({
          hasError: false,
          error: null,
          navigationStatus: null,
          recoveryAttempts: 0
        });
      }
    } catch (error) {
      console.error('Emergency reset failed:', error);
    }
  };

  private renderRecoveryOptions() {
    const { navigationStatus } = this.state;
    
    return (
      <View style={styles.recoveryContainer}>
        <Text style={styles.recoveryTitle}>Navigation Recovery Options</Text>
        
        <TouchableOpacity
          style={styles.recoveryButton}
          onPress={() => this.handleManualRecovery('/(tabs)')}
        >
          <Text style={styles.recoveryButtonText}>Go to Main App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recoveryButton}
          onPress={() => this.handleManualRecovery('/(company)')}
        >
          <Text style={styles.recoveryButtonText}>Go to Company Selection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recoveryButton}
          onPress={() => this.handleManualRecovery('/(auth)/login')}
        >
          <Text style={styles.recoveryButtonText}>Go to Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.recoveryButton, styles.emergencyButton]}
          onPress={this.handleEmergencyReset}
        >
          <Text style={[styles.recoveryButtonText, styles.emergencyButtonText]}>
            Emergency Reset
          </Text>
        </TouchableOpacity>

        {navigationStatus && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Navigation Status:</Text>
            <Text style={[
              styles.statusText,
              { color: this.getStatusColor(navigationStatus.status) }
            ]}>
              {navigationStatus.status.toUpperCase()}: {navigationStatus.message}
            </Text>
            
            {navigationStatus.currentRoute && (
              <Text style={styles.statusDetail}>
                Current Route: {navigationStatus.currentRoute}
              </Text>
            )}
            
            {navigationStatus.stackDepth !== undefined && (
              <Text style={styles.statusDetail}>
                Stack Depth: {navigationStatus.stackDepth}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'warning': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, recoveryAttempts } = this.state;

      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>Navigation Error</Text>
            
            <Text style={styles.errorMessage}>
              The app encountered a navigation error and cannot continue normally.
            </Text>

            <Text style={styles.errorDetails}>
              Error: {error?.message || 'Unknown navigation error'}
            </Text>

            {recoveryAttempts > 0 && (
              <Text style={styles.recoveryInfo}>
                Recovery attempts: {recoveryAttempts}/3
              </Text>
            )}

            {this.renderRecoveryOptions()}

            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  Error Name: {error?.name}
                </Text>
                <Text style={styles.debugText}>
                  Recovery Attempts: {recoveryAttempts}
                </Text>
                <Text style={styles.debugText}>
                  Router Available: {router ? 'Yes' : 'No'}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorDetails: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  recoveryInfo: {
    fontSize: 12,
    color: '#ffc107',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  recoveryContainer: {
    marginBottom: 20,
  },
  recoveryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 15,
    textAlign: 'center',
  },
  recoveryButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginBottom: 10,
  },
  recoveryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#dc3545',
    marginTop: 10,
  },
  emergencyButtonText: {
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 5,
  },
  statusDetail: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 3,
  },
  debugContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 6,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
});

export default NavigationErrorBoundary;