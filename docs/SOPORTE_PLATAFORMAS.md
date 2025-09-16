# 🌐 Soporte de Plataformas - Campo App

## 📋 Estado Actual de Plataformas

### ✅ Android - COMPLETAMENTE SOPORTADO
- **Estado**: Funcional al 100%
- **Versión mínima**: Android 6.0 (API 23)
- **Versión objetivo**: Android 14 (API 34)
- **Arquitecturas**: arm64-v8a, armeabi-v7a, x86_64

#### Funcionalidades Android
- ✅ Autenticación con Firebase
- ✅ Operaciones Firestore (lectura/escritura)
- ✅ Navegación entre pantallas
- ✅ Notificaciones push
- ✅ Almacenamiento local (AsyncStorage)
- ✅ Conectividad de red
- ✅ Gestos y animaciones

#### Comandos Android
```bash
# Desarrollo
pnpm android                    # Ejecutar en emulador/dispositivo
pnpm run android:dev           # Modo desarrollo
pnpm run android:prebuild      # Prebuild nativo

# Construcción
pnpm run build:android:preview     # Build preview
pnpm run build:android:production  # Build producción
pnpm run android:build-apk        # Generar APK
pnpm run android:build-aab        # Generar AAB

# Mantenimiento
pnpm run android:clean         # Limpiar build
```

### ✅ Web - COMPLETAMENTE SOPORTADO
- **Estado**: Funcional al 100%
- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Responsive**: Sí, adaptado para móvil y desktop
- **PWA**: Configurado como Progressive Web App

#### Funcionalidades Web
- ✅ Autenticación con Firebase
- ✅ Operaciones Firestore (lectura/escritura)
- ✅ Navegación SPA (Single Page Application)
- ✅ Almacenamiento local (localStorage)
- ✅ Responsive design
- ✅ Firebase Hosting

#### Comandos Web
```bash
# Desarrollo
pnpm web                       # Servidor desarrollo
pnpm run preview:web          # Vista previa local

# Construcción y Despliegue
pnpm run build:web            # Construir para producción
pnpm run deploy:web           # Desplegar a Firebase Hosting
```

### ❌ iOS - NO SOPORTADO
- **Estado**: NO implementado
- **Razón**: Decisión de proyecto - enfoque en Android y Web
- **Futuro**: No planificado en roadmap actual

#### ¿Por qué no iOS?
1. **Recursos limitados**: Enfoque en plataformas prioritarias
2. **Complejidad adicional**: Certificados, App Store, etc.
3. **Mercado objetivo**: Usuarios principalmente Android y Web
4. **Costos**: Licencias de desarrollador Apple

## 🔧 Configuración por Plataforma

### Configuración Android

#### Prerrequisitos
```bash
# Android Studio con SDK
# Java Development Kit (JDK) 17+
# Variables de entorno configuradas
```

#### Estructura de Archivos Android
```
android/
├── app/
│   ├── build.gradle          # Configuración de build
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── res/              # Recursos Android
├── build.gradle              # Configuración raíz
└── gradle.properties         # Propiedades Gradle
```

#### Variables de Entorno Android
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Configuración Web

#### Estructura de Archivos Web
```
public/                       # Assets estáticos
├── logo.png
└── favicon.ico

dist/                        # Build de producción (generado)
├── _expo/
└── index.html
```

#### Firebase Hosting
```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## 🧪 Testing por Plataforma

### Tests Android
```bash
# Tests unitarios
pnpm test

# Tests de integración Android
pnpm run test:android

# Smoke tests
node scripts/platform-smoke-tests.js android
```

### Tests Web
```bash
# Tests unitarios
pnpm test

# Tests de integración Web
pnpm run test:web

# Smoke tests
node scripts/platform-smoke-tests.js web
```

## 📊 Métricas de Rendimiento

### Android
- **Tamaño APK**: ~25-30 MB
- **Tiempo de inicio**: <3 segundos
- **Memoria RAM**: ~150-200 MB
- **Compatibilidad**: 95%+ dispositivos Android

### Web
- **Bundle size**: ~2-3 MB (gzipped)
- **First Contentful Paint**: <2 segundos
- **Time to Interactive**: <3 segundos
- **Lighthouse Score**: 90+ (Performance)

## 🔍 Debugging por Plataforma

### Android Debugging
```bash
# Logs de Android
adb logcat | grep ReactNativeJS

# Debugging con Flipper
pnpm android --variant debug

# Remote debugging
# Chrome DevTools disponible
```

### Web Debugging
```bash
# DevTools del navegador
# Console, Network, Performance tabs

# Source maps habilitados
# React DevTools disponible
```

## 🚀 Despliegue por Plataforma

### Android Deployment
```bash
# Google Play Store
pnpm run build:android:production
pnpm run submit:android

# Distribución directa (APK)
pnpm run android:build-apk
```

### Web Deployment
```bash
# Firebase Hosting
pnpm run deploy:web

# Otros proveedores
pnpm run build:web
# Subir carpeta dist/ al hosting
```

## 📈 Roadmap de Plataformas

### Corto Plazo (3 meses)
- ✅ Optimización Android
- ✅ Mejoras Web PWA
- ✅ Performance tuning

### Mediano Plazo (6 meses)
- 🔄 Android TV (evaluando)
- 🔄 Web Desktop app (Electron)

### Largo Plazo (12+ meses)
- ❓ iOS (si hay demanda del mercado)
- ❓ Windows/macOS nativo

## 🆘 Soporte Técnico

### Problemas Android
1. Verificar SDK y emulador
2. Limpiar build: `pnpm run android:clean`
3. Revisar logs: `adb logcat`

### Problemas Web
1. Limpiar cache del navegador
2. Verificar Firebase config
3. Revisar Console del navegador

### Contacto
- Documentación: `docs/QUICK_TROUBLESHOOTING_REFERENCE.md`
- Logs del sistema: `docs/BLACK_SCREEN_LOGGING_SYSTEM.md`

---

*Última actualización: Enero 2025*