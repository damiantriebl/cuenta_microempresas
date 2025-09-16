export interface UIFrameGuardedError {
  errorType: string;
  stackTrace: string[];
  affectedComponents: string[];
  potentialCauses: Array<{
    description: string;
    severity: string;
    type: string;
  }>;
  suggestedFixes: Array<{
    description: string;
    steps: string[];
    riskLevel: string;
    estimatedTime: string;
  }>;
}

export interface DiagnosticReport {
  severity: 'low' | 'medium' | 'high' | 'critical';
  errorType: string;
  timestamp: Date;
  details: string;
  providers?: Array<{
    name: string;
    status: string;
  }>;
}

export class DiagnosticService {
  private static instance: DiagnosticService;

  static getInstance(): DiagnosticService {
    if (!DiagnosticService.instance) {
      DiagnosticService.instance = new DiagnosticService();
    }
    return DiagnosticService.instance;
  }

  static logError(error: Error, errorInfo?: React.ErrorInfo): void {
    console.error('DiagnosticService: Error logged', error, errorInfo);
  }

  static async runFullDiagnostic(error: Error): Promise<DiagnosticReport> {
    return {
      severity: 'medium',
      errorType: error.name || 'UnknownError',
      timestamp: new Date(),
      details: error.message || 'Unknown error occurred'
    };
  }

  async attemptAutoRecovery(diagnostics: DiagnosticReport): Promise<boolean> {
    console.log('DiagnosticService: Attempting auto recovery', diagnostics);
    return false; // No auto recovery implemented
  }
}

export default DiagnosticService;
