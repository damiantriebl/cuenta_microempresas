import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ProviderChainVerifier, ProviderStatus } from '@/services/ProviderChainVerifier';
interface Props {
  children: ReactNode;
  providerName: string;
  fallbackComponent?: React.ComponentType<{ children: ReactNode }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}
interface State {
  hasError: boolean;
  error: Error | null;
  providerStatus: ProviderStatus | null;
  recoveryAttempts: number;
}
export class ProviderErrorBoundary extends Component<Props, State> {
  private verifier: ProviderChainVerifier;
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      providerStatus: null,
      recoveryAttempts: 0
    };
    this.verifier = ProviderChainVerifier.getInstance();
  }
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }
  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Provider Error in ${this.props.providerName}:`, error);
    console.error('Error Info:', errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    try {
      const report = await this.verifier.verifyProviderChain();
      const providerStatus = report.providers.find(p => p.name === this.props.providerName) || null;
      this.setState({ providerStatus });
      if (this.state.recoveryAttempts === 0) {
        this.attemptRecovery();
      }
    } catch (verificationError) {
      console.error('Provider verification failed:', verificationError);
    }
  }
  private attemptRecovery = async () => {
    const { providerName } = this.props;
    const { recoveryAttempts } = this.state;
    if (recoveryAttempts >= 3) {
      console.warn(`Max recovery attempts reached for ${providerName}`);
      return;
    }
    this.setState({ recoveryAttempts: recoveryAttempts + 1 });
    try {
      const recoverySuccess = await this.verifier.attemptProviderRecovery(providerName);
      if (recoverySuccess) {
        this.setState({
          hasError: false,
          error: null,
          providerStatus: null
        });
      } else {
        console.warn(`Recovery failed for ${providerName}`);
      }
    } catch (recoveryError) {
      console.error(`Recovery attempt failed for ${providerName}:`, recoveryError);
    }
  };
  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      providerStatus: null,
      recoveryAttempts: 0
    });
  };
  private renderFallback() {
    const { providerName, fallbackComponent: FallbackComponent } = this.props;
    const { error, providerStatus, recoveryAttempts } = this.state;
    if (FallbackComponent) {
      return (
        <FallbackComponent>
          {this.renderErrorInfo()}
        </FallbackComponent>
      );
    }
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorTitle}>
            Provider Error: {providerName}
          </Text>
          <Text style={styles.errorMessage}>
            {error?.message || 'Unknown provider error'}
          </Text>
          {providerStatus && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>Provider Status:</Text>
              <Text style={[
                styles.statusText,
                { color: this.getStatusColor(providerStatus.status) }
              ]}>
                {providerStatus.status.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleManualRetry}
              disabled={recoveryAttempts >= 3}
            >
              <Text style={styles.retryButtonText}>
                {recoveryAttempts >= 3 ? 'Max Retries Reached' : `Retry (${recoveryAttempts}/3)`}
              </Text>
            </TouchableOpacity>
            {recoveryAttempts < 3 && (
              <TouchableOpacity
                style={styles.autoRecoveryButton}
                onPress={this.attemptRecovery}
              >
                <Text style={styles.autoRecoveryButtonText}>
                  Attempt Auto Recovery
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugTitle}>Debug Info:</Text>
              <Text style={styles.debugText}>
                Provider: {providerName}
              </Text>
              <Text style={styles.debugText}>
                Recovery Attempts: {recoveryAttempts}
              </Text>
              <Text style={styles.debugText}>
                Error: {error?.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  private renderErrorInfo() {
    const { error, providerStatus } = this.state;
    if (!__DEV__) return null;
    return (
      <View style={styles.errorInfo}>
        <Text style={styles.errorInfoText}>
          Provider Error: {error?.message}
        </Text>
        {providerStatus && (
          <Text style={styles.errorInfoText}>
            Status: {providerStatus.status}
          </Text>
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
      return this.renderFallback();
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    flex: 1,
    marginRight: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  autoRecoveryButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    flex: 1,
    marginLeft: 5,
  },
  autoRecoveryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 5,
  },
  debugText: {
    fontSize: 11,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  errorInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    padding: 10,
  },
  errorInfoText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});
export default ProviderErrorBoundary;