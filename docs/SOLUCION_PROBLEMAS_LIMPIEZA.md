# Guía de Solución de Problemas - Sistema de Limpieza

## Problemas Comunes y Soluciones

### 1. Errores de Dependencias

#### Problema: "Cannot find module 'X'"
```
Error: Cannot find module 'react-native-something'
```

**Causa**: Dependencia necesaria fue removida incorrectamente.

**Solución**:
```bash
# Reinstalar dependencia específica
pnpm add react-native-something

# O reinstalar todas las dependencias
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Problema: "Unused dependency detected"
```
Warning: 'some-package' is listed as dependency but not used
```

**Causa**: Dependencia se usa dinámicamente o en archivos no escaneados.

**Solución**:
```bash
# Agregar a lista de excepciones en depcheck
echo "some-package" >> .depcheckrc
```

### 2. Errores de TypeScript

#### Problema: "TypeScript compilation failed"
```
Error: TS2307: Cannot find module './removed-file'
```

**Causa**: Archivo referenciado fue eliminado incorrectamente.

**Solución**:
```bash
# Verificar qué archivos fueron eliminados
git diff HEAD~1 --name-status | grep "^D"

# Restaurar archivo específico si es necesario
git checkout HEAD~1 -- path/to/removed-file.ts

# O ejecutar validación para identificar problemas
pnpm run typecheck
```

#### Problema: "Strict mode errors"
```
Error: TS2322: Type 'string | undefined' is not assignable to type 'string'
```

**Causa**: Configuración TypeScript estricta detectó problemas existentes.

**Solución**:
```bash
# Opción 1: Arreglar el código
# Agregar verificaciones de null/undefined

# Opción 2: Restaurar configuración menos estricta temporalmente
git checkout HEAD~1 -- tsconfig.json

# Luego arreglar gradualmente los problemas
```

### 3. Errores de Assets

#### Problema: "Asset not found"
```
Error: Unable to resolve asset './assets/removed-image.png'
```

**Causa**: Asset necesario fue eliminado incorrectamente.

**Solución**:
```bash
# Verificar qué assets fueron eliminados
cat unused-assets-report.json

# Restaurar asset específico
git checkout HEAD~1 -- assets/removed-image.png

# O verificar si el asset realmente se usa
pnpm run assets:scan
```

#### Problema: "Asset still marked as unused"
```
Warning: Asset is used but not detected by scanner
```

**Causa**: Asset se usa dinámicamente o en archivos no escaneados.

**Solución**:
```bash
# Buscar manualmente referencias al asset
grep -r "image-name" app/ components/ --include="*.ts" --include="*.tsx"

# Agregar comentario especial para preservar asset
// @preserve-asset: ./assets/dynamic-image.png
```

### 4. Errores de Configuración

#### Problema: "Expo configuration invalid"
```
Error: Invalid configuration in app.config.js
```

**Causa**: Configuración necesaria fue removida.

**Solución**:
```bash
# Restaurar configuración original
git checkout HEAD~1 -- app.config.js

# Comparar diferencias
git diff HEAD~1 app.config.js

# Aplicar solo cambios seguros manualmente
```

#### Problema: "EAS build profile not found"
```
Error: Build profile 'preview' not found in eas.json
```

**Causa**: Perfil de build necesario fue eliminado.

**Solución**:
```bash
# Restaurar eas.json
git checkout HEAD~1 -- eas.json

# O agregar perfil manualmente
```

### 5. Errores de Firebase

#### Problema: "Firebase configuration error"
```
Error: Firebase app not initialized
```

**Causa**: Configuración Firebase fue modificada incorrectamente.

**Solución**:
```bash
# Restaurar configuración Firebase
git checkout HEAD~1 -- firebaseConfig.ts firebase.json

# Verificar que las variables de entorno están configuradas
cat .env.example
```

#### Problema: "Firestore rules validation failed"
```
Error: Invalid Firestore security rules
```

**Causa**: Reglas de Firestore fueron modificadas incorrectamente.

**Solución**:
```bash
# Restaurar reglas originales
git checkout HEAD~1 -- firestore.rules

# Validar reglas manualmente
firebase firestore:rules:get
```

### 6. Errores de Build

#### Problema: "Build failed after cleanup"
```
Error: Build process failed with exit code 1
```

**Causa**: Archivos necesarios para build fueron eliminados.

**Solución**:
```bash
# Verificar logs de build
pnpm run build:web 2>&1 | tee build.log

# Restaurar archivos de build si es necesario
git checkout HEAD~1 -- android/ ios/

# Limpiar cache de build
pnpm run android:clean
```

#### Problema: "Metro bundler errors"
```
Error: Unable to resolve module from 'removed-file'
```

**Causa**: Archivo referenciado en Metro fue eliminado.

**Solución**:
```bash
# Limpiar cache de Metro
npx expo start --clear

# Verificar configuración Metro
cat metro.config.js

# Restaurar archivo si es necesario
```

### 7. Errores de Validación

#### Problema: "End-to-end validation failed"
```
Error: App failed to start during validation
```

**Causa**: Limpieza rompió funcionalidad crítica.

**Solución**:
```bash
# Ejecutar validación detallada
pnpm run validate:end-to-end --verbose

# Verificar logs específicos
cat scripts/validation-logs.txt

# Rollback completo si es necesario
git checkout backup-before-cleanup
```

#### Problema: "Platform validation failed"
```
Error: Android platform validation failed
```

**Causa**: Configuración específica de plataforma fue afectada.

**Solución**:
```bash
# Verificar configuración Android
cat android/app/build.gradle

# Limpiar y reconstruir
pnpm run android:clean
pnpm run android:prebuild
```

## Comandos de Diagnóstico

### Verificar Estado del Proyecto
```bash
# Compilación TypeScript
pnpm run typecheck

# Linting
pnpm run lint

# Análisis de dependencias
pnpm run analyze:deps

# Análisis completo
pnpm run analyze:all
```

### Verificar Funcionalidad
```bash
# Iniciar servidor desarrollo
pnpm run start

# Probar build web
pnpm run build:web

# Probar Android
pnpm run android

# Validación completa
pnpm run validate:all
```

### Verificar Configuraciones
```bash
# Verificar configuración Expo
npx expo config

# Verificar configuración EAS
eas config

# Verificar Firebase
firebase projects:list
```

## Estrategias de Rollback

### Rollback Parcial
```bash
# Restaurar solo archivos específicos
git checkout HEAD~1 -- package.json
git checkout HEAD~1 -- tsconfig.json
git checkout HEAD~1 -- app.config.js

# Reinstalar dependencias
pnpm install
```

### Rollback Completo
```bash
# Cambiar a rama de respaldo
git checkout backup-before-cleanup

# O resetear a commit anterior
git reset --hard HEAD~1

# Limpiar archivos no trackeados
git clean -fd
```

### Rollback Selectivo por Categoría
```bash
# Solo dependencias
git checkout HEAD~1 -- package.json pnpm-lock.yaml
pnpm install

# Solo configuraciones
git checkout HEAD~1 -- app.config.js eas.json firebase.json

# Solo assets
git checkout HEAD~1 -- assets/
```

## Prevención de Problemas

### Antes de Ejecutar Limpieza
1. ✅ **Siempre hacer backup completo**
   ```bash
   git checkout -b backup-before-cleanup
   git checkout main
   ```

2. ✅ **Ejecutar dry-run primero**
   ```bash
   pnpm run cleanup:dry-run
   ```

3. ✅ **Verificar estado actual**
   ```bash
   pnpm run validate:all
   ```

### Durante la Limpieza
1. ✅ **No interrumpir el proceso**
2. ✅ **Revisar logs en tiempo real**
3. ✅ **Usar modo full para validación automática**
   ```bash
   pnpm run cleanup:full
   ```

### Después de la Limpieza
1. ✅ **Validar inmediatamente**
   ```bash
   pnpm run validate:all
   ```

2. ✅ **Probar funcionalidad crítica**
   ```bash
   pnpm run start
   pnpm run android
   ```

3. ✅ **Hacer commit de cambios exitosos**
   ```bash
   git add .
   git commit -m "Limpieza exitosa del proyecto"
   ```

## Logs y Debugging

### Ubicación de Logs
- `scripts/cleanup-logs.txt`: Logs de limpieza
- `scripts/validation-logs.txt`: Logs de validación
- `unused-assets-report.json`: Reporte de assets
- `typescript-validation-report.json`: Reporte TypeScript

### Habilitar Logging Detallado
```bash
# Ejecutar con logging verbose
DEBUG=1 pnpm run cleanup:execute

# O usar scripts específicos con logging
node scripts/cleanup-orchestrator.js --verbose --dry-run
```

### Analizar Logs
```bash
# Ver últimos logs de limpieza
tail -f scripts/cleanup-logs.txt

# Buscar errores específicos
grep "ERROR" scripts/cleanup-logs.txt

# Ver reporte de validación
cat scripts/validation-report.md
```

## Contacto para Soporte Avanzado

Si los problemas persisten después de seguir esta guía:

1. **Recopilar información**:
   - Logs completos de error
   - Comando ejecutado que causó el problema
   - Estado del proyecto antes de limpieza

2. **Intentar rollback completo**:
   ```bash
   git checkout backup-before-cleanup
   ```

3. **Documentar el problema** para futuras mejoras del sistema

---

**Recordatorio**: Siempre mantener respaldos y usar `--dry-run` antes de ejecutar cambios reales.