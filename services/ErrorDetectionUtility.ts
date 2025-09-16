import { UIFrameGuardedError } from './DiagnosticService';

export class ErrorDetectionUtility {
  private static instance: ErrorDetectionUtility;

  static getInstance(): ErrorDetectionUtility {
    if (!ErrorDetectionUtility.instance) {
      ErrorDetectionUtility.instance = new ErrorDetectionUtility();
    }
    return ErrorDetectionUtility.instance;
  }

  detectError(error: Error): UIFrameGuardedError {
    return {
      errorType: 'UIFrameGuarded',
      stackTrace: error.stack ? error.stack.split('\n') : ['No stack trace available'],
      affectedComponents: ['Unknown'],
      potentialCauses: [
        {
          description: error.message || 'Unknown error',
          severity: 'medium',
          type: 'runtime_error'
        }
      ],
      suggestedFixes: [
        {
          description: 'Refresh the application',
          steps: ['Close and reopen the app'],
          riskLevel: 'low',
          estimatedTime: '1min'
        }
      ]
    };
  }
}

export default ErrorDetectionUtility;
