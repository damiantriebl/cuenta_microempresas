import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { DiagnosticService } from '../services/DiagnosticService';
import { ErrorBoundaryState, DiagnosticReport } from '../types/diagnostic';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, diagnostics: DiagnosticReport | null, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class GlobalErrorBoundary extends Component<Props, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostics: null,
      recoveryAttempts: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('🚨 GlobalErrorBoundary caught error:', error);
    
    return {
      hasError: true,
      error
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error caught by GlobalErrorBoundary:', error, errorInfo);
    
    // Log the error
    DiagnosticService.logError(error, errorInfo);
    
    // Run diagnostic
    try {
      const diagnostics = await DiagnosticService.runFullDiagnostic(error);
      
      this.setState({
        errorInfo,
        diagnostics
      });
      
      // Call custom error handler if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
      
      // Attempt auto recovery for non-critical errors
      if (diagnostics.severity !== 'critical' && this.state.recoveryAttempts < 3) {
        this.attemptAutoRecovery(diagnostics);
      }
    } catch (diagnosticError) {
      console.error('Failed to run diagnostics:', diagnosticError);
      this.setState({
        errorInfo,
        diagnostics: null
      });
    }
  }

  private async attemptAutoRecovery(diagnostics: DiagnosticReport) {
    console.log('🔧 Attempting automatic recovery...');
    
    try {
      const success = await DiagnosticService.attemptAutoRecovery(diagnostics);
      
      if (success) {
        // Wait a bit then try to recover
        this.retryTimeoutId = setTimeout(() => {
          this.handleRetry();
        }, 2000);
      }
    } catch (error) {
      console.error('Auto recovery failed:', error);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    console.log('🔄 Retrying after error...');
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostics: null,
      recoveryAttempts: prevState.recoveryAttempts + 1
    }));
  };

  handleReset = () => {
    console.log('🔄 Resetting application state...');
    
    // Clear any cached state, reset navigation, etc.
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      diagnostics: null,
      recoveryAttempts: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error!,
          this.state.diagnostics,
          this.handleRetry
        );
      }

      // Default error screen
      return (
        <ErrorRecoveryScreen
          error={this.state.error}
          diagnostics={this.state.diagnostics}
          recoveryAttempts={this.state.recoveryAttempts}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorRecoveryScreenProps {
  error: Error | null;
  diagnostics: DiagnosticReport | null;
  recoveryAttempts: number;
  onRetry: () => void;
  onReset: () => void;
}

function ErrorRecoveryScreen({
  error,
  diagnostics,
  recoveryAttempts,
  onRetry,
  onReset
}: ErrorRecoveryScreenProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getSeverityText = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Bajo';
      default: return 'Desconocido';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Oops! Algo salió mal</Text>
        
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          La aplicación encontró un problema inesperado
        </Text>

        {/* Severity Badge */}
        {diagnostics && (
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(diagnostics.severity) }]}>
            <Text style={styles.severityText}>
              Severidad: {getSeverityText(diagnostics.severity)}
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorMessageText}>{error.message}</Text>
          </View>
        )}

        {/* Recommendations */}
        {diagnostics && diagnostics.recommendations.length > 0 && (
          <View style={styles.recommendations}>
            <Text style={styles.recommendationsTitle}>Recomendaciones:</Text>
            {diagnostics.recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendationItem}>
                • {rec}
              </Text>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={onRetry}
            disabled={recoveryAttempts >= 3}
          >
            <Text style={styles.primaryButtonText}>
              {recoveryAttempts === 0 ? 'Intentar Recuperación' : `Reintentar (${recoveryAttempts}/3)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => setShowDetails(!showDetails)}
          >
            <Text style={styles.secondaryButtonText}>
              {showDetails ? 'Ocultar Detalles' : 'Ver Detalles Técnicos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.dangerButton]} 
            onPress={onReset}
          >
            <Text style={styles.dangerButtonText}>
              Reiniciar Aplicación
            </Text>
          </TouchableOpacity>
        </View>

        {/* Technical Details */}
        {showDetails && (
          <DiagnosticDetailsPanel 
            diagnostics={diagnostics}
            error={error}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface DiagnosticDetailsPanelProps {
  diagnostics: DiagnosticReport | null;
  error: Error | null;
}

function DiagnosticDetailsPanel({ diagnostics, error }: DiagnosticDetailsPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <View style={styles.detailsPanel}>
      <Text style={styles.detailsTitle}>Detalles Técnicos</Text>
      
      {/* Error Details */}
      {error && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Error:</Text>
          <Text style={styles.detailText}>{error.name}: {error.message}</Text>
          {error.stack && (
            <Text style={styles.stackTrace}>{error.stack}</Text>
          )}
        </View>
      )}

      {/* Diagnostic Results */}
      {diagnostics && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Verificaciones del Sistema:</Text>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.providers.status)} Providers: {diagnostics.checks.providers.status}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.navigation.status)} Navegación: {diagnostics.checks.navigation.status}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.assets.status)} Assets: {diagnostics.checks.assets.status}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.firebase.status)} Firebase: {diagnostics.checks.firebase.status}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.metro.status)} Metro: {diagnostics.checks.metro.status}
            </Text>
          </View>
          
          <View style={styles.checkItem}>
            <Text style={styles.checkLabel}>
              {getStatusIcon(diagnostics.checks.dependencies.status)} Dependencias: {diagnostics.checks.dependencies.status}
            </Text>
          </View>
        </View>
      )}

      {/* Timestamp */}
      {diagnostics && (
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Timestamp:</Text>
          <Text style={styles.detailText}>{diagnostics.timestamp.toISOString()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  severityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorMessageText: {
    color: '#721c24',
    fontSize: 14,
  },
  recommendations: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  recommendationsTitle: {
    fontWeight: 'bold',
    color: '#0c5460',
    marginBottom: 8,
  },
  recommendationItem: {
    color: '#0c5460',
    fontSize: 14,
    marginBottom: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
  },
  detailsPanel: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    width: '100%',
    borderColor: '#dee2e6',
    borderWidth: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212529',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  stackTrace: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginTop: 8,
  },
  checkItem: {
    marginBottom: 4,
  },
  checkLabel: {
    fontSize: 14,
    color: '#495057',
  },
});

export default GlobalErrorBoundary;