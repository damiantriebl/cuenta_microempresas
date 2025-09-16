# 📖 Guía de Configuración - Campo App

## 🎯 Resumen del Proyecto

Campo es una aplicación de gestión de microempresas desarrollada con:
- **Expo** + **React Native** para desarrollo multiplataforma
- **Firebase** para backend (Auth + Firestore)
- **TypeScript** para tipado estático
- **pnpm** como gestor de paquetes

### Plataformas Soportadas
- ✅ **Android** - Completamente funcional
- ✅ **Web** - Completamente funcional  
- ❌ **iOS** - NO soportado en esta versión

## 🚀 Configuración Inicial

### 1. Prerrequisitos del Sistema

```bash
# Verificar versiones requeridas
node --version    # >= 18.0.0
pnpm --version    # >= 8.0.0
```

### 2. Instalación de Herramientas

```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Instalar Expo CLI
pnpm add -g @expo/cli

# Para Android: instalar Android Studio
# Descargar desde: https://developer.android.com/studio
```

### 3. Configuración del Proyecto

```bash
# Clonar e instalar
git clone <repositorio>
cd micro-empresas
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores
```

## 🔧 Comandos de Desarrollo

### Comandos Básicos
```bash
pnpm start          # Servidor de desarrollo
pnpm android        # Ejecutar en Android
pnpm web           # Ejecutar en Web
pnpm typecheck     # Verificar TypeScript
pnpm lint          # Ejecutar linter
pnpm test          # Ejecutar tests
```

### Comandos de Construcción
```bash
pnpm run build:web                    # Construir para Web
pnpm run build:android:preview        # Build Android preview
pnpm run build:android:production     # Build Android producción
```

### Comandos de Análisis
```bash
pnpm run analyze:all        # Análisis completo de código
pnpm run assets:unused      # Detectar assets no utilizados
pnpm run cleanup:analyze    # Análizar limpieza necesaria
```

## 🔥 Configuración de Firebase

### 1. Crear Proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Habilita Authentication y Firestore

### 2. Configurar Variables de Entorno
Actualiza tu archivo `.env` con los valores de Firebase:
```bash
FIREBASE_API_KEY=tu-api-key
FIREBASE_PROJECT_ID=tu-project-id
# ... otros valores
```

## 📱 Configuración Android

### 1. Android Studio Setup
1. Instala Android Studio
2. Configura Android SDK (API 34+)
3. Crea un emulador o conecta dispositivo físico

### 2. Variables de Entorno Android
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🌐 Configuración Web

### 1. Firebase Hosting
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Inicializar hosting
firebase init hosting

# Desplegar
pnpm run deploy:web
```

## 🧪 Configuración de Testing

### Jest Configuration
El proyecto incluye configuración completa para Jest:
- Tests unitarios
- Tests de integración
- Coverage reports

```bash
pnpm test              # Ejecutar tests
pnpm run test:ci       # Tests para CI con coverage
```

## 📊 Herramientas de Análisis

### Análisis de Código
- **knip**: Detecta código muerto
- **depcheck**: Analiza dependencias no utilizadas
- **ts-prune**: Encuentra exports no utilizados
- **unimported**: Detecta módulos no importados

### Scripts de Limpieza
```bash
node scripts/cleanup-report-generator.js  # Generar reporte
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de Metro bundler**
   ```bash
   pnpm start --clear
   ```

2. **Problemas con Android**
   ```bash
   pnpm run android:clean
   pnpm run android:prebuild
   ```

3. **Errores de TypeScript**
   ```bash
   pnpm typecheck
   ```

### Logs y Diagnóstico
- Revisa `docs/BLACK_SCREEN_LOGGING_SYSTEM.md`
- Usa `docs/QUICK_TROUBLESHOOTING_REFERENCE.md`

## 📚 Documentación Adicional

- [Sistema de Logging](BLACK_SCREEN_LOGGING_SYSTEM.md)
- [Testing Guide](ENVIRONMENT_TESTING_GUIDE.md)
- [Configuración de App](APP_CONFIGURATION.md)