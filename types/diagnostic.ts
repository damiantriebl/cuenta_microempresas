// Types and interfaces for diagnostic system
export interface DiagnosticReport {
  timestamp: Date;
  error?: Error;
  checks: {
    providers: ProviderCheck;
    navigation: NavigationCheck;
    assets: AssetCheck;
    firebase: FirebaseCheck;
    metro: MetroCheck;
    dependencies: DependencyCheck;
  };
  recommendations: string[];
  severity: ErrorSeverity;
}

export interface ProviderCheck {
  status: 'healthy' | 'warning' | 'error';
  details: ProviderStatus[];
}

export interface ProviderStatus {
  provider: string;
  status: 'fulfilled' | 'rejected';
  error?: string;
  renderTime?: number;
}

export interface NavigationCheck {
  status: 'healthy' | 'warning' | 'error';
  currentRoute?: string;
  stackDepth?: number;
  canGoBack?: boolean;
  error?: string;
}

export interface AssetCheck {
  status: 'healthy' | 'warning' | 'error';
  fonts: FontStatus;
  images: ImageStatus;
  error?: string;
}

export interface FontStatus {
  loaded: string[];
  failed: string[];
  pending: string[];
}

export interface ImageStatus {
  cached: number;
  failed: number;
  loading: number;
}

export interface FirebaseCheck {
  status: 'healthy' | 'warning' | 'error';
  auth: boolean;
  firestore: boolean;
  error?: string;
}

export interface MetroCheck {
  status: 'healthy' | 'warning' | 'error';
  bundleLoaded: boolean;
  hotReloadActive: boolean;
  error?: string;
}

export interface DependencyCheck {
  status: 'healthy' | 'warning' | 'error';
  conflicts: string[];
  missing: string[];
  error?: string;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  checks: HealthCheckResult[];
  overallScore: number;
}

export interface HealthCheckResult {
  name: string;
  status: 'fulfilled' | 'rejected';
  result: any;
  duration: number;
}

export interface RenderHealth {
  status: 'healthy' | 'warning' | 'critical';
  renderTime?: number;
  frameRate?: number;
  error?: string;
}

export interface RecoveryStrategy {
  immediate: () => Promise<boolean>;
  delayed: () => Promise<boolean>;
  manual: () => ManualStep[];
  fallback: () => React.ComponentType;
}

export interface ManualStep {
  title: string;
  description: string;
  action?: () => void;
}

export interface DiagnosticIssue {
  type: 'provider' | 'navigation' | 'asset' | 'firebase' | 'render' | 'unknown';
  severity: ErrorSeverity;
  message: string;
  context: Record<string, any>;
  autoRecoverable: boolean;
  recoveryStrategy?: RecoveryStrategy;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  diagnostics: DiagnosticReport | null;
  recoveryAttempts: number;
}

export interface DiagnosticLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  context: Record<string, any>;
  stackTrace?: string;
  deviceInfo?: any;
  appVersion: string;
}