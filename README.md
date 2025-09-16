# 📱 Campo - Aplicación de Gestión de Microempresas

Esta es una aplicación [Expo](https://expo.dev) + React Native + Firebase diseñada para la gestión de microempresas, con soporte para Android y Web.

## 🚀 Configuración Rápida

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [pnpm](https://pnpm.io/) como gestor de paquetes
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Para Android: [Android Studio](https://developer.android.com/studio) y SDK

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd micro-empresas
   ```

2. **Instalar dependencias con pnpm**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus valores específicos (ver sección de Variables de Entorno).

4. **Iniciar la aplicación**
   ```bash
   pnpm start
   ```

## 🌐 Plataformas Soportadas

✅ **Android** - Completamente soportado  
✅ **Web** - Completamente soportado  
❌ **iOS** - NO soportado en esta versión

## 📋 Variables de Entorno Requeridas

Copia `.env.example` a `.env` y configura las siguientes variables:

```bash
# Configuración del Proyecto EAS
EAS_PROJECT_ID=tu-project-id-aqui

# Configuración de Google Services
GOOGLE_CLIENT_ID=tu-google-client-id-aqui

# Propietario de Expo (para builds EAS)
EXPO_OWNER=tu-username-expo

# Entorno de desarrollo
NODE_ENV=development
```

### Obtener las Variables de Entorno

1. **EAS_PROJECT_ID**: Obténlo desde tu [dashboard de Expo](https://expo.dev/)
2. **GOOGLE_CLIENT_ID**: Configúralo en [Google Cloud Console](https://console.cloud.google.com/)
3. **EXPO_OWNER**: Tu nombre de usuario de Expo

## 🛠️ Comandos Disponibles

### Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm start

# Ejecutar en Android
pnpm android

# Ejecutar en Web
pnpm web

# Construir para Web
pnpm run build:web
```

### Linting y Validación

```bash
# Ejecutar linter
pnpm lint

# Corregir problemas de linting automáticamente
pnpm run lint:fix

# Verificar tipos TypeScript
pnpm typecheck
```

### Testing

```bash
# Ejecutar tests
pnpm test

# Ejecutar tests simples
pnpm run test:simple

# Ejecutar tests para CI
pnpm run test:ci
```

### Construcción y Despliegue

```bash
# Construir para Android (preview)
pnpm run build:android:preview

# Construir para Android (producción)
pnpm run build:android:production

# Desplegar a Web (Firebase Hosting)
pnpm run deploy:web

# Vista previa local de Web
pnpm run preview:web
```

### Análisis y Limpieza de Código

```bash
# Analizar dependencias no utilizadas
pnpm run analyze:deps

# Detectar código muerto
pnpm run analyze:dead-code

# Análisis completo
pnpm run analyze:all

# Escanear assets no utilizados
pnpm run assets:unused

# Limpiar assets (modo dry-run)
pnpm run assets:clean
```

## 🏗️ Estructura del Proyecto

```
micro-empresas/
├── app/                    # Rutas de la aplicación (Expo Router)
├── components/             # Componentes reutilizables
├── services/              # Servicios de negocio
├── context/               # Contextos de React
├── hooks/                 # Hooks personalizados
├── schemas/               # Esquemas y tipos TypeScript
├── assets/                # Recursos estáticos
├── scripts/               # Scripts de utilidad y limpieza
└── docs/                  # Documentación adicional
```

## 🔥 Integración con Firebase

La aplicación utiliza Firebase para:

- **Authentication**: Autenticación de usuarios
- **Firestore**: Base de datos NoSQL
- **Hosting**: Despliegue web

### Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Configura Authentication y Firestore
3. Actualiza `firebaseConfig.ts` con tu configuración
4. Para despliegue web: `firebase init hosting`

## 🧪 Testing

El proyecto incluye configuración para Jest con soporte para:

- Tests unitarios de componentes React Native
- Tests de servicios y lógica de negocio
- Mocking de Firebase y Expo APIs

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar tests con coverage
pnpm run test:ci

# Ejecutar tests en modo watch
pnpm test --watch
```

## 📱 Desarrollo Android

### Configuración Inicial

1. Instala Android Studio
2. Configura el SDK de Android
3. Crea un emulador o conecta un dispositivo físico

### Comandos Android

```bash
# Prebuild para Android
pnpm run android:prebuild

# Ejecutar en modo desarrollo
pnpm run android:dev

# Construir APK de release
pnpm run android:build-apk

# Limpiar build de Android
pnpm run android:clean
```

## 🌐 Desarrollo Web

La aplicación web se construye usando Expo Web y se puede desplegar en Firebase Hosting.

```bash
# Desarrollo local
pnpm web

# Construir para producción
pnpm run build:web

# Vista previa local
pnpm run preview:web

# Desplegar a Firebase
pnpm run deploy:web
```

## 🔧 Herramientas de Desarrollo

### Análisis de Código

- **ESLint**: Linting de código
- **TypeScript**: Tipado estático
- **Knip**: Detección de código muerto
- **Depcheck**: Análisis de dependencias

### Sistema de Limpieza Automatizada

El proyecto incluye un sistema completo de limpieza automatizada para mantener el código optimizado:

```bash
# Vista previa de limpieza (recomendado primero)
pnpm run cleanup:dry-run

# Ejecutar limpieza completa
pnpm run cleanup:execute

# Limpieza completa con validación automática
pnpm run cleanup:full

# Mostrar opciones disponibles
pnpm run cleanup:help
```

**Características del sistema de limpieza**:
- ✅ Eliminación de código muerto y dependencias no utilizadas
- ✅ Limpieza de assets no referenciados
- ✅ Optimización de configuraciones (Expo, EAS, Firebase)
- ✅ Validación automática post-limpieza
- ✅ Sistema de respaldo y rollback

**Documentación completa**:
- [Guía de Limpieza](docs/GUIA_LIMPIEZA_PROYECTO.md) - Documentación completa del sistema
- [Solución de Problemas](docs/SOLUCION_PROBLEMAS_LIMPIEZA.md) - Troubleshooting específico
- [Ejemplos de Uso](docs/EJEMPLOS_USO_LIMPIEZA.md) - Casos prácticos y ejemplos

## 📚 Documentación Adicional

- [Configuración de la Aplicación](docs/APP_CONFIGURATION.md)
- [Sistema de Logging](docs/BLACK_SCREEN_LOGGING_SYSTEM.md)
- [Guía de Testing](docs/ENVIRONMENT_TESTING_GUIDE.md)
- [Troubleshooting](docs/QUICK_TROUBLESHOOTING_REFERENCE.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y está destinado únicamente para uso interno.

## 🆘 Soporte

Para problemas técnicos o preguntas:

1. Revisa la [documentación de troubleshooting](docs/QUICK_TROUBLESHOOTING_REFERENCE.md)
2. Verifica los logs de la aplicación
3. Ejecuta los scripts de diagnóstico disponibles

---

*Aplicación desarrollada con Expo, React Native y Firebase*
