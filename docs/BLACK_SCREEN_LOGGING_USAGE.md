# Sistema de Logging y Diagnóstico de Pantalla Negra - Guía de Uso

## Introducción

El sistema de logging y diagnóstico de pantalla negra proporciona una solución completa para detectar, registrar y reportar errores que causan pantalla negra en aplicaciones Expo React Native. Este sistema incluye logging estructurado, filtrado de información sensible, reportes automáticos y métricas de salud.

## Componentes Principales

### 1. BlackScreenLogger
Sistema de logging estructurado con filtrado automático de información sensible.

### 2. AutomaticErrorReporter
Sistema de reportes automáticos para errores críticos con rate limiting y reintentos.

### 3. HealthMetricsCollector
Recolector de métricas de salud y rendimiento de la aplicación.

### 4. BlackScreenDiagnosticSystem
Sistema integrado que coordina todos los componentes.

## Instalación y Configuración

### Inicialización Básica

```typescript
import { blackScreenDiagnosticSystem } from './services/BlackScreenDiagnosticSystem';

// Inicializar en App.tsx o _layout.tsx
export default function App() {
  useEffect(() => {
    // Configuración básica
    blackScreenDiagnosticSystem.initialize({
      enableLogging: true,
      enableAutomaticReporting: !__DEV__,
      enableHealthMetrics: true,
      reportingEndpoint: 'https://your-api.com/error-reports'
    });
  }, []);

  return (
    // Tu aplicación
  );
}
```

### Configuración Avanzada

```typescript
// Configuración para desarrollo
if (__DEV__) {
  blackScreenDiagnosticSystem.enableDevelopmentMode();
} else {
  blackScreenDiagnosticSystem.enableProductionMode();
}

// Configuración personalizada
blackScreenDiagnosticSystem.initialize({
  enableLogging: true,
  enableAutomaticReporting: true,
  enableHealthMetrics: true,
  logLevel: LogLevel.INFO,
  reportingEndpoint: 'https://api.example.com/reports',
  developmentMode: __DEV__
});
```

## Uso del Sistema de Logging

### Logging Básico

```typescript
import { blackScreenLogger, ErrorCategory } from './services/BlackScreenLogger';

// Log de información
blackScreenLogger.logInfo('User logged in successfully', ErrorCategory.PROVIDER, {
  userId: 'user123',
  timestamp: new Date()
});

// Log de advertencia
blackScreenLogger.logWarning('Slow network detected', ErrorCategory.FIREBASE, {
  responseTime: 5000,
  endpoint: '/api/data'
});

// Log de error
blackScreenLogger.logError('Failed to load user data', ErrorCategory.FIREBASE, {
  error: 'Network timeout',
  retryCount: 3
});

// Log de error crítico
try {
  // Código que puede fallar
} catch (error) {
  blackScreenLogger.logCriticalError(
    'Critical component failure',
    error,
    ErrorCategory.RENDER,
    {
      component: 'UserProfile',
      props: { userId: 'user123' }
    }
  );
}
```

### Categorías de Error

```typescript
enum ErrorCategory {
  PROVIDER = 'provider',     // Errores en providers (Auth, Theme, etc.)
  NAVIGATION = 'navigation', // Errores de navegación
  ASSET = 'asset',          // Errores de carga de assets
  FIREBASE = 'firebase',    // Errores de Firebase
  RENDER = 'render',        // Errores de renderizado
  UNKNOWN = 'unknown'       // Errores no categorizados
}
```

### Filtrado Automático de Información Sensible

El sistema filtra automáticamente:
- Tokens y claves API
- Passwords y credenciales
- Información personal (emails, teléfonos)
- URLs con parámetros sensibles

```typescript
// Este log será filtrado automáticamente
blackScreenLogger.logError('Authentication failed', ErrorCategory.FIREBASE, {
  email: 'user@example.com',        // Se filtra a [EMAIL_FILTERED]
  password: 'secretpassword',       // Se filtra a [SENSITIVE_DATA_FILTERED]
  token: 'abc123token456',          // Se filtra a [TOKEN_FILTERED]
  apiKey: 'key789xyz'               // Se filtra a [SENSITIVE_DATA_FILTERED]
});
```

## Reporte de Errores de Pantalla Negra

### Reporte Manual

```typescript
import { reportBlackScreen } from './services/BlackScreenDiagnosticSystem';

// En un Error Boundary o cuando detectes pantalla negra
try {
  // Código que puede causar pantalla negra
} catch (error) {
  await reportBlackScreen(
    'Black screen detected in main navigation',
    error,
    {
      route: 'HomeScreen',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  );
}
```

### Reporte Automático

```typescript
// Los errores críticos se reportan automáticamente
blackScreenLogger.logCriticalError(
  'App failed to render',
  new Error('Component tree corrupted'),
  ErrorCategory.RENDER
);
// Esto disparará automáticamente un reporte si está configurado
```

## Métricas de Salud y Rendimiento

### Registro de Métricas

```typescript
import { healthMetricsCollector } from './services/HealthMetricsCollector';

// Iniciar recolección de métricas
healthMetricsCollector.startCollection();

// Registrar métricas de provider
healthMetricsCollector.registerProviderMetrics('AuthProvider', {
  initializationTime: 500,
  errorCount: 0,
  healthStatus: 'healthy'
});

// Registrar cambios de navegación
healthMetricsCollector.recordNavigationChange('ProfileScreen', 150);

// Registrar errores de renderizado
healthMetricsCollector.recordRenderError();
```

### Verificación de Salud

```typescript
import { getSystemHealth } from './services/BlackScreenDiagnosticSystem';

// Obtener estado actual del sistema
const health = getSystemHealth();

if (!health.isHealthy) {
  console.warn('System health issues detected:', health.criticalIssues);
  console.log('Recommendations:', health.recommendations);
}
```

## Diagnóstico Completo

### Ejecutar Diagnóstico Manual

```typescript
import { runDiagnostic } from './services/BlackScreenDiagnosticSystem';

// Ejecutar diagnóstico completo
const report = await runDiagnostic();

console.log('Diagnostic Report:', {
  id: report.id,
  systemHealthy: report.systemStatus.isHealthy,
  criticalIssues: report.systemStatus.criticalIssues,
  totalErrors: report.errorSummary.totalErrors
});
```

### Exportar Datos para Soporte

```typescript
import { blackScreenDiagnosticSystem } from './services/BlackScreenDiagnosticSystem';

// Exportar todos los datos de diagnóstico
const diagnosticData = blackScreenDiagnosticSystem.exportDiagnosticData();

// Enviar a soporte técnico o guardar localmente
console.log('Complete diagnostic data:', diagnosticData);
```

## Integración con Error Boundaries

### Error Boundary con Diagnóstico

```typescript
import React from 'react';
import { reportBlackScreen } from './services/BlackScreenDiagnosticSystem';

class DiagnosticErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Reportar error de pantalla negra
    await reportBlackScreen(
      'Error boundary caught critical error',
      error,
      {
        errorInfo,
        component: this.props.componentName || 'Unknown',
        timestamp: new Date().toISOString()
      }
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong. Error has been reported.</Text>
          <Button 
            title="Retry" 
            onPress={() => this.setState({ hasError: false })} 
          />
        </View>
      );
    }

    return this.props.children;
  }
}
```

## Configuración de Reportes Automáticos

### Configuración del Reporter

```typescript
import { automaticErrorReporter } from './services/AutomaticErrorReporter';

// Configurar reporter
automaticErrorReporter.configure({
  enabled: !__DEV__,
  maxReportsPerHour: 10,
  maxReportsPerDay: 50,
  retryAttempts: 3,
  retryDelayMs: 5000,
  endpoint: 'https://your-api.com/error-reports'
});

// Obtener estadísticas
const stats = automaticErrorReporter.getReportingStats();
console.log('Reporting stats:', stats);
```

### Manejo de Rate Limiting

```typescript
// El sistema automáticamente limita los reportes
// Configurar límites apropiados para tu aplicación
automaticErrorReporter.configure({
  maxReportsPerHour: 5,    // Máximo 5 reportes por hora
  maxReportsPerDay: 20,    // Máximo 20 reportes por día
  retryAttempts: 2,        // 2 reintentos por reporte fallido
  retryDelayMs: 10000      // 10 segundos entre reintentos
});
```

## Monitoreo en Producción

### Configuración para Producción

```typescript
// En producción, usar configuración optimizada
if (!__DEV__) {
  blackScreenDiagnosticSystem.enableProductionMode();
  
  // Configurar endpoint de reportes
  automaticErrorReporter.configure({
    enabled: true,
    endpoint: process.env.ERROR_REPORTING_ENDPOINT,
    maxReportsPerHour: 5,
    maxReportsPerDay: 25
  });
}
```

### Análisis de Logs

```typescript
// Obtener resumen de logs para análisis
const logSummary = blackScreenLogger.getLogSummary();

console.log('Log Analysis:', {
  totalLogs: logSummary.totalLogs,
  errorRate: (logSummary.errorCount / logSummary.totalLogs) * 100,
  criticalErrors: logSummary.criticalCount,
  topCategories: Object.entries(logSummary.categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
});
```

## Mejores Prácticas

### 1. Inicialización Temprana
```typescript
// Inicializar lo antes posible en el ciclo de vida de la app
export default function App() {
  useEffect(() => {
    blackScreenDiagnosticSystem.initialize();
  }, []);
  
  // Resto de la aplicación
}
```

### 2. Logging Contextual
```typescript
// Siempre proporcionar contexto útil
blackScreenLogger.logError('Navigation failed', ErrorCategory.NAVIGATION, {
  fromRoute: 'Home',
  toRoute: 'Profile',
  userId: 'user123',
  navigationMethod: 'push',
  timestamp: new Date().toISOString()
});
```

### 3. Categorización Apropiada
```typescript
// Usar categorías específicas para mejor análisis
blackScreenLogger.logError('Auth token expired', ErrorCategory.FIREBASE);
blackScreenLogger.logError('Component render failed', ErrorCategory.RENDER);
blackScreenLogger.logError('Asset loading timeout', ErrorCategory.ASSET);
```

### 4. Manejo de Errores Asincrónicos
```typescript
// Manejar errores en operaciones asíncronas
async function loadUserData() {
  try {
    const data = await fetchUserData();
    return data;
  } catch (error) {
    blackScreenLogger.logError(
      'Failed to load user data',
      ErrorCategory.FIREBASE,
      {
        error: error.message,
        userId: getCurrentUserId(),
        retryCount: getRetryCount()
      }
    );
    throw error;
  }
}
```

### 5. Limpieza Periódica
```typescript
// Configurar limpieza automática
setInterval(() => {
  blackScreenDiagnosticSystem.cleanup();
}, 60 * 60 * 1000); // Cada hora
```

## Solución de Problemas

### Problema: Logs no aparecen
```typescript
// Verificar que el sistema esté inicializado
if (!blackScreenDiagnosticSystem.isInitialized) {
  blackScreenDiagnosticSystem.initialize();
}

// Verificar nivel de log
blackScreenLogger.logDebug('Test debug message'); // Solo en desarrollo
blackScreenLogger.logInfo('Test info message');   // Siempre visible
```

### Problema: Reportes no se envían
```typescript
// Verificar configuración del reporter
const stats = automaticErrorReporter.getReportingStats();
console.log('Reporter stats:', stats);

// Verificar endpoint
automaticErrorReporter.configure({
  endpoint: 'https://your-correct-endpoint.com/reports'
});
```

### Problema: Métricas no se recolectan
```typescript
// Verificar que la recolección esté activa
healthMetricsCollector.startCollection();

// Verificar métricas actuales
const metrics = healthMetricsCollector.getCurrentMetrics();
console.log('Current metrics:', metrics);
```

## Integración con Servicios Externos

### Sentry Integration
```typescript
import * as Sentry from '@sentry/react-native';

// Configurar reporte a Sentry
automaticErrorReporter.configure({
  endpoint: 'https://your-sentry-dsn.ingest.sentry.io/api/reports',
  enabled: true
});

// O integrar directamente en el logger
const originalLogCritical = blackScreenLogger.logCriticalError;
blackScreenLogger.logCriticalError = function(message, error, category, context) {
  // Log normal
  originalLogCritical.call(this, message, error, category, context);
  
  // También enviar a Sentry
  Sentry.captureException(error, {
    tags: { category },
    extra: { message, context }
  });
};
```

### Firebase Crashlytics
```typescript
import crashlytics from '@react-native-firebase/crashlytics';

// Integrar con Crashlytics
const originalLogCritical = blackScreenLogger.logCriticalError;
blackScreenLogger.logCriticalError = function(message, error, category, context) {
  originalLogCritical.call(this, message, error, category, context);
  
  crashlytics().recordError(error);
  crashlytics().log(message);
};
```

Este sistema proporciona una base sólida para el diagnóstico y reporte de errores de pantalla negra en aplicaciones Expo React Native, con énfasis en la seguridad de datos y la facilidad de uso.