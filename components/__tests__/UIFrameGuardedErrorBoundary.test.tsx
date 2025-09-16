import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import UIFrameGuardedErrorBoundary from '../UIFrameGuardedErrorBoundary';

// Mock the services
jest.mock('../../services/ErrorDetectionUtility', () => {
  return {
    getInstance: () => ({
      detectError: jest.fn(() => ({
        errorType: 'UIFrameGuarded',
        stackTrace: ['Error stack trace'],
        affectedComponents: ['TestComponent'],
        potentialCauses: [
          { description: 'React version incompatibility', severity: 'high', type: 'version_incompatibility' }
        ],
        suggestedFixes: [
          { description: 'Update React version', steps: ['Step 1'], riskLevel: 'medium', estimatedTime: '30min' }
        ]
      }))
    })
  };
});

jest.mock('../../services/DiagnosticService', () => {
  return {
    getInstance: () => ({
      // Mock methods as needed
    })
  };
});

// Component that throws an error for testing
const ErrorThrowingComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test UIFrameGuarded error');
  }
  return <Text testID="working-component">Working Component</Text>;
};

describe('UIFrameGuardedErrorBoundary', () => {
  // Suppress console errors during tests
  const originalConsoleError = console.error;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;

  beforeEach(() => {
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      const { getByTestId } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });

    it('should pass componentName prop correctly', () => {
      const { getByTestId } = render(
        <UIFrameGuardedErrorBoundary componentName="TestComponent">
          <ErrorThrowingComponent shouldThrow={false} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('UIFrameGuarded Error Detected')).toBeTruthy();
      expect(getByText('⚠️')).toBeTruthy();
    });

    it('should display custom fallback component when provided', () => {
      const CustomFallback = <Text testID="custom-fallback">Custom Error UI</Text>;
      
      const { getByTestId } = render(
        <UIFrameGuardedErrorBoundary fallbackComponent={CustomFallback}>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByTestId('custom-fallback')).toBeTruthy();
    });

    it('should call onError callback when error occurs', () => {
      const mockOnError = jest.fn();
      
      render(
        <UIFrameGuardedErrorBoundary onError={mockOnError}>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should display component name in error UI', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary componentName="TestComponent">
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Component: TestComponent')).toBeTruthy();
    });
  });

  describe('Error Details Display', () => {
    it('should display affected components', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Affected Components:')).toBeTruthy();
      expect(getByText('• TestComponent')).toBeTruthy();
    });

    it('should display potential causes', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Potential Causes:')).toBeTruthy();
      expect(getByText('• React version incompatibility (Severity: high)')).toBeTruthy();
    });

    it('should display suggested fixes', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Suggested Fixes:')).toBeTruthy();
      expect(getByText('• Update React version')).toBeTruthy();
    });
  });

  describe('Recovery Actions', () => {
    it('should show retry button when recovery is enabled', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary enableRecovery={true}>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Retry (3 attempts left)')).toBeTruthy();
    });

    it('should show reset button', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Reset Component')).toBeTruthy();
    });

    it('should handle retry button press', () => {
      const { getByText, queryByTestId } = render(
        <UIFrameGuardedErrorBoundary enableRecovery={true}>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      const retryButton = getByText('Retry (3 attempts left)');
      fireEvent.press(retryButton);

      // After retry, should attempt to render component again
      // In a real scenario, this might succeed if the error was transient
    });

    it('should handle reset button press', () => {
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      const resetButton = getByText('Reset Component');
      fireEvent.press(resetButton);

      // After reset, should attempt to render component again
    });

    it('should disable retry after max attempts', () => {
      const TestWrapper = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);
        
        return (
          <UIFrameGuardedErrorBoundary enableRecovery={true}>
            <ErrorThrowingComponent shouldThrow={shouldThrow} />
          </UIFrameGuardedErrorBoundary>
        );
      };

      const { getByText, queryByText } = render(<TestWrapper />);

      // Press retry multiple times to exceed max attempts
      for (let i = 0; i < 4; i++) {
        const retryButton = queryByText(/Retry \(\d+ attempts left\)/);
        if (retryButton) {
          fireEvent.press(retryButton);
        }
      }

      // Should no longer show retry button after max attempts
      expect(queryByText(/Retry \(\d+ attempts left\)/)).toBeFalsy();
    });
  });

  describe('Error Logging', () => {
    it('should log error details to console', () => {
      render(
        <UIFrameGuardedErrorBoundary componentName="TestComponent">
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(console.group).toHaveBeenCalledWith('🚨 UIFrameGuarded Error Boundary Triggered');
      expect(console.error).toHaveBeenCalledWith('Component Name:', 'TestComponent');
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error without UIFrameGuarded detection', () => {
      // Mock detectError to return null
      const mockDetectError = jest.fn(() => null);
      
      const { getByText } = render(
        <UIFrameGuardedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(getByText('Component Error')).toBeTruthy();
    });

    it('should handle recovery disabled', () => {
      const { queryByText } = render(
        <UIFrameGuardedErrorBoundary enableRecovery={false}>
          <ErrorThrowingComponent shouldThrow={true} />
        </UIFrameGuardedErrorBoundary>
      );

      expect(queryByText(/Retry/)).toBeFalsy();
      expect(getByText('Reset Component')).toBeTruthy();
    });
  });
});