// Debug utility for product creation flow
// This can be imported and used in the actual app to debug issues

interface DebugLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  context: string;
  message: string;
  data?: any;
}

class ProductCreationDebugger {
  private logs: DebugLogEntry[] = [];
  private isEnabled: boolean = true;

  constructor(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  private log(level: 'info' | 'warn' | 'error', context: string, message: string, data?: any) {
    if (!this.isEnabled) return;

    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };

    this.logs.push(entry);

    // Also log to console with appropriate level
    const logMessage = `[${entry.timestamp}] ${context}: ${message}`;
    switch (level) {
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }

  info(context: string, message: string, data?: any) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: any) {
    this.log('error', context, message, data);
  }

  getLogs(): DebugLogEntry[] {
    return [...this.logs];
  }

  getLogsAsString(): string {
    return this.logs.map(log => 
      `[${log.timestamp}] ${log.level.toUpperCase()} ${log.context}: ${log.message}${
        log.data ? '\n  Data: ' + JSON.stringify(log.data, null, 2) : ''
      }`
    ).join('\n');
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Specific methods for product creation debugging
  logProductCreationStart(empresaId: string, productData: any) {
    this.info('ProductCreation', 'Starting product creation', {
      empresaId,
      productData: {
        nombre: productData.nombre,
        colorFondo: productData.colorFondo,
        posicion: productData.posicion,
        activo: productData.activo,
        hasUltimoCosto: productData.ultimoCosto !== undefined,
        hasUltimaGanancia: productData.ultimaGanancia !== undefined
      }
    });
  }

  logValidationResult(isValid: boolean, errors: string[]) {
    if (isValid) {
      this.info('Validation', 'Product data validation passed');
    } else {
      this.error('Validation', 'Product data validation failed', { errors });
    }
  }

  logFirestoreOperation(operation: string, success: boolean, data?: any, error?: any) {
    if (success) {
      this.info('Firestore', `${operation} succeeded`, data);
    } else {
      this.error('Firestore', `${operation} failed`, { 
        error: error ? {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        } : 'Unknown error',
        data 
      });
    }
  }

  logServiceResponse(service: string, method: string, response: any) {
    if (response.success) {
      this.info('ServiceResponse', `${service}.${method} succeeded`, {
        data: response.data,
        hasData: !!response.data
      });
    } else {
      this.error('ServiceResponse', `${service}.${method} failed`, {
        errors: response.errors,
        errorType: response.errorType,
        retryable: response.retryable
      });
    }
  }

  logFormSubmission(formData: any, isEditing: boolean) {
    this.info('FormSubmission', `Form submission ${isEditing ? 'update' : 'create'}`, {
      isEditing,
      formData: {
        nombre: formData.nombre,
        colorFondo: formData.colorFondo,
        hasUltimoCosto: formData.ultimoCosto !== undefined,
        hasUltimaGanancia: formData.ultimaGanancia !== undefined,
        posicion: formData.posicion,
        activo: formData.activo
      }
    });
  }

  logNetworkStatus(isOnline: boolean, connectionType?: string) {
    this.info('Network', `Network status: ${isOnline ? 'online' : 'offline'}`, {
      isOnline,
      connectionType
    });
  }

  logAuthStatus(isAuthenticated: boolean, userId?: string, empresaId?: string) {
    this.info('Auth', `Authentication status: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`, {
      isAuthenticated,
      hasUserId: !!userId,
      hasEmpresaId: !!empresaId
    });
  }

  // Analysis methods
  analyzeFailures(): { 
    totalFailures: number; 
    failuresByContext: Record<string, number>;
    commonErrors: string[];
  } {
    const failures = this.logs.filter(log => log.level === 'error');
    const failuresByContext: Record<string, number> = {};
    const errorMessages: string[] = [];

    failures.forEach(failure => {
      failuresByContext[failure.context] = (failuresByContext[failure.context] || 0) + 1;
      errorMessages.push(failure.message);
    });

    // Find common error patterns
    const errorCounts: Record<string, number> = {};
    errorMessages.forEach(msg => {
      errorCounts[msg] = (errorCounts[msg] || 0) + 1;
    });

    const commonErrors = Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([msg]) => msg);

    return {
      totalFailures: failures.length,
      failuresByContext,
      commonErrors
    };
  }

  generateReport(): string {
    const analysis = this.analyzeFailures();
    const totalLogs = this.logs.length;
    const successRate = totalLogs > 0 ? ((totalLogs - analysis.totalFailures) / totalLogs * 100).toFixed(2) : '0';

    return `
=== Product Creation Debug Report ===
Generated: ${new Date().toISOString()}

Summary:
- Total log entries: ${totalLogs}
- Total failures: ${analysis.totalFailures}
- Success rate: ${successRate}%

Failures by context:
${Object.entries(analysis.failuresByContext)
  .map(([context, count]) => `- ${context}: ${count}`)
  .join('\n')}

Common error messages:
${analysis.commonErrors.map((error, i) => `${i + 1}. ${error}`).join('\n')}

Recent logs (last 10):
${this.logs.slice(-10).map(log => 
  `[${log.timestamp}] ${log.level.toUpperCase()} ${log.context}: ${log.message}`
).join('\n')}

Full logs available via exportLogs() method.
`;
  }
}

// Global instance for easy access
export const productCreationDebugger = new ProductCreationDebugger();

// Helper function to enable/disable debugging
export function setProductCreationDebugging(enabled: boolean) {
  productCreationDebugger['isEnabled'] = enabled;
}

export default ProductCreationDebugger;