# Ejemplos de Uso - Sistema de Limpieza

## Escenarios Comunes de Uso

### Escenario 1: Primera Limpieza del Proyecto

**Situación**: Proyecto con muchas dependencias y archivos acumulados durante desarrollo.

**Pasos recomendados**:

```bash
# 1. Crear respaldo
git checkout -b backup-before-first-cleanup
git checkout main

# 2. Análisis inicial completo
pnpm run cleanup:scan-all

# 3. Ver qué se va a limpiar (sin aplicar cambios)
pnpm run cleanup:dry-run

# 4. Revisar el reporte generado
cat cleanup-analysis-report.json

# 5. Ejecutar limpieza completa con validación
pnpm run cleanup:full

# 6. Verificar que todo funciona
pnpm run validate:all
pnpm run start
```

**Resultado esperado**:
- Dependencias reducidas de ~50 a ~25
- Assets reducidos de ~100MB a ~60MB
- Archivos de código reducidos en ~20%
- Configuraciones optimizadas

### Escenario 2: Limpieza Selectiva de Assets

**Situación**: Solo necesitas limpiar assets no utilizados, sin tocar código o dependencias.

**Pasos**:

```bash
# 1. Analizar solo assets
pnpm run assets:analyze

# 2. Ver qué assets se eliminarían
pnpm run assets:clean

# 3. Revisar lista de assets no utilizados
cat unused-assets-report.json

# 4. Eliminar assets confirmados como no utilizados
pnpm run assets:remove

# 5. Verificar que la app sigue funcionando
pnpm run start
```

**Ejemplo de salida**:
```json
{
  "unusedAssets": [
    "assets/images/old-logo.png",
    "assets/fonts/unused-font.ttf",
    "assets/icons/deprecated-icon.svg"
  ],
  "totalSizeSaved": "15.2MB"
}
```

### Escenario 3: Limpieza Antes de Release

**Situación**: Preparar proyecto para release de producción.

**Pasos**:

```bash
# 1. Análisis completo pre-release
pnpm run cleanup:scan-all
pnpm run analyze:all

# 2. Limpieza completa
pnpm run cleanup:full

# 3. Validación exhaustiva
pnpm run validate:all

# 4. Pruebas de build para todas las plataformas
pnpm run build:web
pnpm run build:android:production

# 5. Verificar métricas de optimización
cat cleanup-report-generator.json
```

**Métricas típicas de mejora**:
- Bundle size: -30%
- Dependencies: -40%
- Build time: -25%
- Assets: -50%

### Escenario 4: Limpieza Después de Refactoring

**Situación**: Después de un refactoring grande, hay muchos archivos y imports obsoletos.

**Pasos**:

```bash
# 1. Enfocarse en código muerto
pnpm run cleanup:scan-dead-code

# 2. Ver análisis detallado
pnpm run analyze:dead-code
pnpm run analyze:unused-exports

# 3. Limpieza con foco en código
pnpm run cleanup:execute --skip-assets --skip-config

# 4. Validar compilación TypeScript
pnpm run typecheck

# 5. Ejecutar tests
pnpm run test
```

### Escenario 5: Limpieza de Emergencia (Proyecto Roto)

**Situación**: El proyecto no compila debido a dependencias o configuraciones rotas.

**Pasos de recuperación**:

```bash
# 1. Crear respaldo del estado actual
git stash push -m "Estado roto antes de limpieza"

# 2. Intentar limpieza conservadora
pnpm run cleanup:dry-run --conservative

# 3. Si dry-run se ve bien, ejecutar
pnpm run cleanup:execute --conservative

# 4. Si sigue roto, rollback y limpieza manual
git stash pop
# Luego limpieza manual paso a paso
```

### Escenario 6: Mantenimiento Periódico

**Situación**: Limpieza regular mensual para mantener proyecto optimizado.

**Script automatizado**:

```bash
#!/bin/bash
# maintenance-cleanup.sh

echo "🧹 Iniciando limpieza de mantenimiento mensual..."

# Crear respaldo automático
git checkout -b "maintenance-backup-$(date +%Y%m%d)"
git checkout main

# Análisis rápido
pnpm run cleanup:scan-all

# Limpieza conservadora
pnpm run cleanup:execute --conservative

# Validación básica
pnpm run validate:cleanup

# Reporte
echo "✅ Limpieza completada. Ver reporte en cleanup-report.json"
```

## Ejemplos de Configuración Avanzada

### Configuración Personalizada para Proyecto Grande

Crear archivo `.cleanuprc.json`:

```json
{
  "skipPatterns": [
    "legacy/**/*",
    "vendor/**/*",
    "third-party/**/*"
  ],
  "preserveAssets": [
    "assets/branding/**/*",
    "assets/legal/**/*"
  ],
  "preserveDependencies": [
    "react-native-custom-module",
    "internal-company-package"
  ],
  "strictMode": false,
  "backupEnabled": true,
  "validationLevel": "full"
}
```

### Configuración para Desarrollo vs Producción

**Desarrollo** (`.cleanuprc.dev.json`):
```json
{
  "skipAssets": true,
  "skipScripts": true,
  "preserveDebugTools": true,
  "validationLevel": "basic"
}
```

**Producción** (`.cleanuprc.prod.json`):
```json
{
  "aggressiveCleanup": true,
  "removeDebugTools": true,
  "optimizeConfigs": true,
  "validationLevel": "full"
}
```

## Casos de Uso por Tipo de Proyecto

### Proyecto Nuevo (< 3 meses)
```bash
# Limpieza ligera, enfoque en dependencias
pnpm run cleanup:execute --light --focus=dependencies
```

### Proyecto Maduro (> 1 año)
```bash
# Limpieza completa, todas las categorías
pnpm run cleanup:full --aggressive
```

### Proyecto Legacy
```bash
# Limpieza muy conservadora
pnpm run cleanup:execute --conservative --skip-config
```

### Proyecto Pre-Release
```bash
# Limpieza optimizada para producción
pnpm run cleanup:full --production --optimize-bundle
```

## Integración con CI/CD

### GitHub Actions Example

```yaml
name: Cleanup Validation
on:
  pull_request:
    branches: [main]

jobs:
  cleanup-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm run cleanup:dry-run
      - run: pnpm run validate:cleanup
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "🔍 Verificando limpieza del proyecto..."

# Verificar que no hay código muerto
pnpm run analyze:dead-code --quiet

# Verificar dependencias
pnpm run analyze:deps --quiet

if [ $? -ne 0 ]; then
  echo "❌ Proyecto necesita limpieza. Ejecuta: pnpm run cleanup:dry-run"
  exit 1
fi

echo "✅ Proyecto limpio"
```

## Métricas y Benchmarks

### Métricas Típicas Antes de Limpieza
```
📊 Estado Inicial:
- Dependencies: 127 packages
- Bundle size: 45.2MB
- Assets: 156 files (89.3MB)
- TypeScript files: 234
- Dead code: 23 files
- Unused exports: 67
```

### Métricas Después de Limpieza
```
📊 Estado Post-Limpieza:
- Dependencies: 89 packages (-30%)
- Bundle size: 31.8MB (-30%)
- Assets: 98 files (52.1MB) (-42%)
- TypeScript files: 198 (-15%)
- Dead code: 0 files (-100%)
- Unused exports: 0 (-100%)
```

### Benchmarks de Rendimiento
```
⚡ Mejoras de Rendimiento:
- Build time: 2m 15s → 1m 42s (-24%)
- Cold start: 3.2s → 2.1s (-34%)
- Hot reload: 850ms → 620ms (-27%)
- Bundle analysis: 45s → 28s (-38%)
```

## Troubleshooting por Escenario

### Problema: "Limpieza eliminó archivo necesario"

**Detección**:
```bash
# Error durante build o runtime
Error: Cannot resolve './components/RemovedComponent'
```

**Solución**:
```bash
# 1. Identificar qué se eliminó
git diff HEAD~1 --name-status | grep "^D"

# 2. Restaurar archivo específico
git checkout HEAD~1 -- components/RemovedComponent.tsx

# 3. Agregar a lista de preservación
echo "components/RemovedComponent.tsx" >> .cleanuprc.preserve
```

### Problema: "Dependencia marcada como no utilizada pero es necesaria"

**Detección**:
```bash
# Dependencia se usa dinámicamente
const module = require(`dynamic-${platform}-module`);
```

**Solución**:
```bash
# Agregar comentario especial
// @preserve-dependency: dynamic-ios-module
// @preserve-dependency: dynamic-android-module

# O agregar a configuración
echo "dynamic-*-module" >> .cleanuprc.preserveDeps
```

## Automatización y Scripts Personalizados

### Script de Limpieza Personalizado

```javascript
// custom-cleanup.js
const { execSync } = require('child_process');

async function customCleanup() {
  console.log('🧹 Iniciando limpieza personalizada...');
  
  // Paso 1: Análisis
  execSync('pnpm run cleanup:scan-all', { stdio: 'inherit' });
  
  // Paso 2: Limpieza selectiva
  execSync('pnpm run cleanup:execute --skip-config', { stdio: 'inherit' });
  
  // Paso 3: Validación personalizada
  execSync('pnpm run test', { stdio: 'inherit' });
  execSync('pnpm run typecheck', { stdio: 'inherit' });
  
  console.log('✅ Limpieza personalizada completada');
}

customCleanup().catch(console.error);
```

### Integración con Package.json

```json
{
  "scripts": {
    "cleanup:custom": "node custom-cleanup.js",
    "cleanup:weekly": "pnpm run cleanup:execute --conservative",
    "cleanup:release": "pnpm run cleanup:full --production",
    "cleanup:dev": "pnpm run cleanup:execute --skip-assets --skip-scripts"
  }
}
```

---

**Nota**: Estos ejemplos están basados en casos reales de uso. Siempre adaptar a las necesidades específicas de cada proyecto y mantener respaldos antes de ejecutar limpiezas.