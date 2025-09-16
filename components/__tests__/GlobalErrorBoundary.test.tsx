import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import { DiagnosticService } from '../../services/DiagnosticService';
import { ErrorSeverity } from '../../types/diagnostic';

// Mock DiagnosticService
jest.mock('../../services/DiagnosticService');
const mockDiagnosticService = DiagnosticService as jest.Mocked<typeof DiagnosticService>;

// Mock Firebase
jest.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
  db: {}
}));

// Mock Expo Font
jest.mock('expo-font', () => ({
  isLoaded: {}
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text>No error</Text>;
};

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock diagnostic service methods
    mockDiagnosticService.runFullDiagnostic.mockResolvedValue({
      timestamp: new Date(),
      checks: {
        providers: { status: 'healthy', details: [] },
        navigation: { status: 'healthy' },
        assets: { status: 'healthy', fonts: { loaded: [], failed: [], pending: [] }, images: { cached: 0, failed: 0, loading: 0 } },
        firebase: { status: 'healthy', auth: true, firestore: true },
        metro: { status: 'healthy', bundleLoaded: true, hotReloadActive: true },
        dependencies: { status: 'healthy', conflicts: [], missing: [] }
      },
      recommendations: ['All systems appear healthy'],
      severity: ErrorSeverity.LOW
    });
    
    mockDiagnosticService.logError.mockImplementation(() => {});
    mockDiagnosticService.attemptAutoRecovery.mockResolvedValue(true);
  });

  it('should render children when no error occurs', () => {
    const { getByText } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    expect(getByText('No error')).toBeTruthy();
  });

  it('should catch errors and show error screen', async () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    // Initially no error
    expect(getByText('No error')).toBeTruthy();

    // Trigger error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Oops! Algo salió mal')).toBeTruthy();
    });
  });

  it('should call DiagnosticService when error occurs', async () => {
    const { rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(mockDiagnosticService.logError).toHaveBeenCalled();
      expect(mockDiagnosticService.runFullDiagnostic).toHaveBeenCalled();
    });
  });

  it('should show retry button and handle retry', async () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    // Trigger error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Intentar Recuperación')).toBeTruthy();
    });

    // Mock successful recovery
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    const retryButton = getByText('Intentar Recuperación');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(getByText('No error')).toBeTruthy();
    });
  });

  it('should show diagnostic details when requested', async () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    // Trigger error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Ver Detalles Técnicos')).toBeTruthy();
    });

    const detailsButton = getByText('Ver Detalles Técnicos');
    fireEvent.press(detailsButton);

    await waitFor(() => {
      expect(getByText('Detalles Técnicos')).toBeTruthy();
      expect(getByText('Verificaciones del Sistema:')).toBeTruthy();
    });
  });

  it('should call custom onError handler when provided', async () => {
    const onError = jest.fn();
    
    const { rerender } = render(
      <GlobalErrorBoundary onError={onError}>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    rerender(
      <GlobalErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should use custom fallback when provided', async () => {
    const customFallback = jest.fn(() => <Text>Custom Error Screen</Text>);
    
    const { getByText, rerender } = render(
      <GlobalErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    rerender(
      <GlobalErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Custom Error Screen')).toBeTruthy();
      expect(customFallback).toHaveBeenCalled();
    });
  });

  it('should limit recovery attempts', async () => {
    const { getByText, rerender } = render(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </GlobalErrorBoundary>
    );

    // Trigger error
    rerender(
      <GlobalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GlobalErrorBoundary>
    );

    await waitFor(() => {
      expect(getByText('Intentar Recuperación')).toBeTruthy();
    });

    // Simulate multiple failed recovery attempts
    const retryButton = getByText('Intentar Recuperación');
    
    // First attempt
    fireEvent.press(retryButton);
    
    // Should show attempt counter after first retry
    await waitFor(() => {
      expect(getByText(/Reintentar \(1\/3\)/)).toBeTruthy();
    });
  });
});