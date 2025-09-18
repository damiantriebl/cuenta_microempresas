# 📱 Cuenta Microempresas - Aplicación de Gestión de Microempresas

Esta es una aplicación [Expo](https://expo.dev) + React Native + Firebase diseñada para la gestión de microempresas, con soporte para Android y Web.


# ACTUALMENTE SE PUEDE USAR COMO DEMO

https://campo-9fb40.web.app/

## Tambien se puede usar para android 

https://play.google.com/apps/internaltest/4701338497453554763

en teoria, si abren ese link desde un telefono android pueden acceder a la version de prueba interna, por cuestiones que tarda mucho sacarlo a produccion 
y se requieren 12 verificadores de prueba cerrada, no creo que llegue a estar directametne en android, pero si me pasan las direcciones de mail de los que deseen 
testear la aplicacion a damiantriebl@gmail.com, puedo agregarlos como tester y se instala automaticamente.

se probo unicamente en android por el MVP, pero pasarlo a iOS para Iphone no es una tarea muy compleja ya que practicamente React native lo hace automaticamente.

## 🚀 Configuración Rápida

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [pnpm](https://pnpm.io/) como gestor de paquetes
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Para Android: [Android Studio](https://developer.android.com/studio) y SDK

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/damiantriebl/cuenta_microempresas
   cd micro-empresas
   ```

2. **Instalar dependencias con pnpm**
   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno**
   Por el periodo unicamente de el tiempo del concurso, tengo las variables de entorno publicas, lo cual no es lo optimo, pero tengo un free tier de firebase, por ende lo maximo que podria pasar es que se bloquee, para cambiar de tier, 
   solo hay q tener una cuenta de firebase, y poner las variables en firebaseConfig.ts -> https://firebase.google.cn/docs/web/setup?hl=es-419 (se explica mas adelante)


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

# Propietario de Expo (para builds EAS) -> no es necesario, pero si alguien tiene puede buildear de ahi
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
5. POR CUESTIONES DE TIEMPO, van a estar abiertas las contraseñas de firebase, esto es un riesgo de seguridad, pero se hace por el tiempo del concurso

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


## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es publico, no tengo ningun ownership, lo hice especificamente para la gente de Banco Provincia bajo el contexto de el concurso de Innovacion Tecnologica
## 🆘 Soporte

Para problemas técnicos o preguntas:

### principalmente comunicarse conmigo, ** damiantriebl@gmail.com ** si no por telefono a 2262 556307
1. Revisa la [documentación de troubleshooting](docs/QUICK_TROUBLESHOOTING_REFERENCE.md)
2. Verifica los logs de la aplicación
3. Ejecuta los scripts de diagnóstico disponibles

---

*Aplicación desarrollada con Expo, React Native y Firebase*
