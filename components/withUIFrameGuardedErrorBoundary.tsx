import React, { ComponentType, ReactNode } from 'react';
import UIFrameGuardedErrorBoundary from './UIFrameGuardedErrorBoundary';
import { UIFrameGuardedError } from '../services/DiagnosticService';

interface ErrorBoundaryOptions {
  fallbackComponent?: ReactNode;
  onError?: (error: UIFrameGuardedError, errorInfo: React.ErrorInfo) => void;
  enableRecovery?: boolean;
  componentName?: string;
}

/**
 * Higher-Order Component to wrap components with UIFrameGuarded error boundary
 * 
 * Usage:
 * const SafeComponent = withUIFrameGuardedErrorBoundary(MyComponent, {
 *   componentName: 'MyComponent',
 *   enableRecovery: true
 * });
 */
function withUIFrameGuardedErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: ErrorBoundaryOptions = {}
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const WithErrorBoundary = (props: P) => {
    return (
      <UIFrameGuardedErrorBoundary
        componentName={options.componentName || displayName}
        fallbackComponent={options.fallbackComponent}
        onError={options.onError}
        enableRecovery={options.enableRecovery}
      >
        <WrappedComponent {...props} />
      </UIFrameGuardedErrorBoundary>
    );
  };

  WithErrorBoundary.displayName = `withUIFrameGuardedErrorBoundary(${displayName})`;
  
  return WithErrorBoundary;
}

export default withUIFrameGuardedErrorBoundary;