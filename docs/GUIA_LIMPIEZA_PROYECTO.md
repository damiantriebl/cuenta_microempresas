# Guía de Limpieza del Proyecto

## Descripción General

Este sistema de limpieza automatizada está diseñado para auditar y simplificar el proyecto Expo + React Native + Firebase eliminando código no utilizado, dependencias innecesarias, assets no referenciados y normalizando archivos de configuración.

## Características Principales

- ✅ Eliminación de código muerto y imports no utilizados
- ✅ Optimización de dependencias (solo las necesarias)
- ✅ Limpieza de assets no referenciados
- ✅ Normalización de configuraciones (Expo, EAS, Firebase)
- ✅ Organización de scripts de desarrollo
- ✅ Validación completa del proyecto después de la limpieza
- ✅ Sistema de respaldo y rollback

## Comandos Disponibles

### Comandos Principales de Limpieza

```bash
# Vista previa de cambios (recomendado primero)
pnpm run cleanup:dry-run

# Ejecutar limpieza completa
pnpm run cleanup:execute

# Limpieza completa con validación
pnpm run cleanup:full

# Mostrar ayuda y opciones
pnpm run cleanup:help
```

### Comandos de Análisis Individual

```bash
# Análisis de dependencias
pnpm run cleanup:scan-deps

# Análisis de código muerto
pnpm run cleanup:scan-dead-code

# Análisis de assets
pnpm run cleanup:scan-assets

# Análisis completo
pnpm run cleanup:scan-all
```

### Comandos de Validación

```bash
# Validar limpieza
pnpm run validate:cleanup

# Validación end-to-end
pnpm run validate:end-to-end

# Validación completa
pnpm run validate:all
```

### Comandos de Assets

```bash
# Escanear referencias de assets
pnpm run assets:scan

# Detectar assets no utilizados
pnpm run assets:unused

# Analizar assets
pnpm run assets:analyze

# Vista previa de limpieza de assets
pnpm run assets:clean

# Remover assets no utilizados
pnpm run assets:remove
```

## Proceso de Limpieza Paso a Paso

### 1. Preparación

Antes de ejecutar la limpieza, asegúrate de:

```bash
# Hacer commit de cambios actuales
git add .
git commit -m "Antes de limpieza del proyecto"

# Crear rama de respaldo
git checkout -b backup-before-cleanup
git checkout main
```

### 2. Análisis Inicial

```bash
# Ejecutar análisis completo para ver el estado actual
pnpm run cleanup:scan-all

# Ver qué cambios se realizarían
pnpm run cleanup:dry-run
```

### 3. Ejecución de Limpieza

```bash
# Opción 1: Limpieza básica
pnpm run cleanup:execute

# Opción 2: Limpieza completa con validación (recomendado)
pnpm run cleanup:full
```

### 4. Validación Post-Limpieza

```bash
# Validar que todo funciona correctamente
pnpm run validate:all

# Probar compilación TypeScript
pnpm run typecheck

# Probar que la app inicia
pnpm run start
```

## Opciones de Configuración

El sistema de limpieza soporta las siguientes opciones:

### Modo Dry-Run
- `--dry-run`: Muestra qué cambios se realizarían sin aplicarlos
- Útil para revisar antes de ejecutar cambios reales

### Modo de Ejecución
- `--execute`: Ejecuta la limpieza con confirmaciones
- `--full`: Ejecuta limpieza completa con validación automática
- `--force`: Ejecuta sin confirmaciones (usar con cuidado)

### Opciones de Limpieza Selectiva
- `--skip-deps`: Omitir limpieza de dependencias
- `--skip-assets`: Omitir limpieza de assets
- `--skip-config`: Omitir limpieza de configuraciones
- `--skip-scripts`: Omitir organización de scripts

## Archivos y Directorios Afectados

### Código y Dependencias
- `package.json`: Dependencias no utilizadas
- `node_modules/`: Se reinstala después de limpieza
- Archivos `.ts/.tsx/.js/.jsx`: Imports y exports no utilizados

### Assets
- `assets/`: Archivos no referenciados
- `public/`: Assets web no utilizados

### Configuraciones
- `app.config.js` / `app.json`: Configuración Expo
- `eas.json`: Perfiles de build
- `firebase.json`: Servicios Firebase
- `firebaseConfig.ts`: Configuración Firebase
- `tsconfig.json`: Configuración TypeScript estricta

### Scripts y Herramientas
- `scripts/`: Organización de utilidades
- `tools/`: Scripts de debug movidos aquí
- `package.json`: Scripts de package.json

## Sistema de Respaldo y Rollback

### Respaldos Automáticos
El sistema crea respaldos automáticos en `.config-backups/`:
- Configuraciones antes de modificar
- Lista de archivos eliminados
- Dependencias removidas

### Rollback Manual
```bash
# Restaurar desde git
git checkout backup-before-cleanup

# O restaurar archivos específicos
git checkout HEAD~1 -- package.json
git checkout HEAD~1 -- app.config.js
```

### Rollback con Scripts
```bash
# Usar script de rollback de migración
pnpm run migrate:rollback
```

## Validaciones Incluidas

### Validaciones Estáticas
- ✅ Compilación TypeScript sin errores
- ✅ Linting sin problemas
- ✅ Análisis de código muerto
- ✅ Validación de dependencias

### Validaciones Dinámicas
- ✅ Inicio de servidor de desarrollo (Web)
- ✅ Inicio en emulador Android
- ✅ Navegación básica funcional
- ✅ Conexión Firebase operativa

### Validaciones de Build
- ✅ Build web exitoso
- ✅ Build Android exitoso
- ✅ Tamaño de bundle optimizado

## Solución de Problemas

### Error: "Dependencia no encontrada"
```bash
# Reinstalar dependencias
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error: "TypeScript compilation failed"
```bash
# Verificar configuración TypeScript
pnpm run typecheck

# Restaurar tsconfig.json si es necesario
git checkout HEAD~1 -- tsconfig.json
```

### Error: "App no inicia después de limpieza"
```bash
# Verificar que no se eliminaron archivos necesarios
pnpm run validate:end-to-end

# Restaurar desde respaldo si es necesario
git checkout backup-before-cleanup
```

### Error: "Firebase no funciona"
```bash
# Verificar configuración Firebase
cat firebaseConfig.ts

# Restaurar configuración si es necesario
git checkout HEAD~1 -- firebaseConfig.ts firebase.json
```

## Métricas y Reportes

Después de la limpieza, el sistema genera reportes con:

### Métricas de Limpieza
- Archivos eliminados y tamaños
- Dependencias removidas
- Assets eliminados
- Configuraciones optimizadas

### Métricas de Rendimiento
- Reducción de tamaño de bundle
- Tiempo de compilación mejorado
- Reducción de dependencias
- Archivos totales reducidos

### Reporte de Validación
- Resultados de pruebas
- Estado de plataformas (Android/Web)
- Estado de integración Firebase
- Problemas encontrados y resueltos

## Mejores Prácticas

### Antes de Ejecutar
1. ✅ Hacer commit de cambios actuales
2. ✅ Crear rama de respaldo
3. ✅ Ejecutar `cleanup:dry-run` primero
4. ✅ Revisar qué se va a eliminar

### Durante la Ejecución
1. ✅ Usar `cleanup:full` para validación automática
2. ✅ No interrumpir el proceso de limpieza
3. ✅ Revisar logs y reportes generados

### Después de la Limpieza
1. ✅ Ejecutar `validate:all`
2. ✅ Probar funcionalidad crítica manualmente
3. ✅ Hacer commit de cambios de limpieza
4. ✅ Actualizar documentación si es necesario

## Soporte de Plataformas

### Plataformas Soportadas ✅
- **Android**: Completamente soportado y validado
- **Web**: Completamente soportado y validado

### Plataformas NO Soportadas ❌
- **iOS**: No requerido para este proyecto

### Servicios Firebase Soportados ✅
- **Firestore**: Base de datos principal
- **Firebase Auth**: Autenticación de usuarios
- **Firebase Hosting**: Para deployment web

## Contacto y Soporte

Para problemas o preguntas sobre el sistema de limpieza:

1. Revisar esta documentación completa
2. Verificar logs en `scripts/` para errores específicos
3. Usar `git checkout backup-before-cleanup` para restaurar si es necesario
4. Consultar documentación adicional en `docs/`

---

**Nota**: Este sistema está diseñado específicamente para el proyecto Expo + React Native + Firebase con soporte para Android y Web. Siempre hacer respaldos antes de ejecutar limpieza completa.