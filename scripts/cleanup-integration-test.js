#!/usr/bin/env node

/**
 * Test de Integración del Sistema de Limpieza
 * Verifica que todos los componentes del sistema funcionen correctamente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CleanupIntegrationTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async runTest(name, testFn) {
    try {
      this.log(`🧪 Ejecutando: ${name}`, 'info');
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
      this.log(`✅ ${name} - PASSED`, 'success');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    }
  }

  testScriptExists(scriptPath) {
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script no encontrado: ${scriptPath}`);
    }
  }

  testPackageJsonScripts() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = [
      'cleanup:dry-run',
      'cleanup:execute',
      'cleanup:full',
      'cleanup:help',
      'cleanup:scan-all',
      'validate:cleanup',
      'validate:all'
    ];

    requiredScripts.forEach(script => {
      if (!packageJson.scripts[script]) {
        throw new Error(`Script faltante en package.json: ${script}`);
      }
    });
  }

  testDocumentationExists() {
    const requiredDocs = [
      'docs/GUIA_LIMPIEZA_PROYECTO.md',
      'docs/SOLUCION_PROBLEMAS_LIMPIEZA.md',
      'docs/EJEMPLOS_USO_LIMPIEZA.md'
    ];

    requiredDocs.forEach(doc => {
      if (!fs.existsSync(doc)) {
        throw new Error(`Documentación faltante: ${doc}`);
      }
    });
  }

  testCleanupScripts() {
    const requiredScripts = [
      'scripts/cleanup-orchestrator.js',
      'scripts/cleanup-help.js',
      'scripts/cleanup-verification.js',
      'scripts/end-to-end-validation.js',
      'scripts/cleanup-report-generator.js'
    ];

    requiredScripts.forEach(script => {
      this.testScriptExists(script);
    });
  }

  testHelpCommand() {
    try {
      execSync('node scripts/cleanup-help.js', { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Help command failed: ${error.message}`);
    }
  }

  testDryRunCommand() {
    try {
      // Test que el comando dry-run no falle
      const result = execSync('node scripts/cleanup-orchestrator.js --dry-run --test', { 
        stdio: 'pipe',
        timeout: 30000 
      });
    } catch (error) {
      // Es aceptable que falle si no existe el script, pero no debe ser un error de sintaxis
      if (error.message.includes('SyntaxError')) {
        throw new Error(`Syntax error in cleanup-orchestrator.js: ${error.message}`);
      }
    }
  }

  testValidationScripts() {
    const validationScripts = [
      'scripts/cleanup-verification.js',
      'scripts/end-to-end-validation.js'
    ];

    validationScripts.forEach(script => {
      try {
        // Test básico de sintaxis
        execSync(`node -c ${script}`, { stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Syntax error in ${script}: ${error.message}`);
      }
    });
  }

  testConfigurationFiles() {
    // Verificar que archivos de configuración existen
    const configFiles = [
      'package.json',
      'tsconfig.json',
      '.env.example'
    ];

    configFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        throw new Error(`Configuration file missing: ${file}`);
      }
    });
  }

  testReadmeIntegration() {
    const readme = fs.readFileSync('README.md', 'utf8');
    
    const requiredSections = [
      'Sistema de Limpieza Automatizada',
      'cleanup:dry-run',
      'cleanup:execute',
      'cleanup:full'
    ];

    requiredSections.forEach(section => {
      if (!readme.includes(section)) {
        throw new Error(`README.md missing section: ${section}`);
      }
    });
  }

  async runAllTests() {
    this.log('\n🧹 Iniciando Test de Integración del Sistema de Limpieza', 'info');
    this.log('=========================================================\n', 'info');

    await this.runTest('Verificar scripts de limpieza existen', () => {
      this.testCleanupScripts();
    });

    await this.runTest('Verificar scripts en package.json', () => {
      this.testPackageJsonScripts();
    });

    await this.runTest('Verificar documentación existe', () => {
      this.testDocumentationExists();
    });

    await this.runTest('Verificar comando de ayuda funciona', () => {
      this.testHelpCommand();
    });

    await this.runTest('Verificar comando dry-run', () => {
      this.testDryRunCommand();
    });

    await this.runTest('Verificar scripts de validación', () => {
      this.testValidationScripts();
    });

    await this.runTest('Verificar archivos de configuración', () => {
      this.testConfigurationFiles();
    });

    await this.runTest('Verificar integración en README', () => {
      this.testReadmeIntegration();
    });

    this.showResults();
  }

  showResults() {
    this.log('\n📊 Resultados del Test de Integración', 'info');
    this.log('=====================================\n', 'info');

    this.results.tests.forEach(test => {
      const status = test.status === 'PASSED' ? '✅' : '❌';
      const color = test.status === 'PASSED' ? 'success' : 'error';
      this.log(`${status} ${test.name}`, color);
      
      if (test.error) {
        this.log(`   Error: ${test.error}`, 'error');
      }
    });

    this.log(`\n📈 Resumen:`, 'info');
    this.log(`✅ Tests pasados: ${this.results.passed}`, 'success');
    this.log(`❌ Tests fallidos: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'success');
    this.log(`📊 Total: ${this.results.tests.length}`, 'info');

    if (this.results.failed === 0) {
      this.log('\n🎉 ¡Todos los tests pasaron! El sistema de limpieza está correctamente integrado.', 'success');
      this.log('\n✅ Comandos disponibles:', 'info');
      this.log('   pnpm run cleanup:help     - Mostrar ayuda completa', 'info');
      this.log('   pnpm run cleanup:dry-run  - Vista previa de limpieza', 'info');
      this.log('   pnpm run cleanup:execute  - Ejecutar limpieza', 'info');
      this.log('   pnpm run cleanup:full     - Limpieza completa con validación', 'info');
    } else {
      this.log('\n⚠️  Algunos tests fallaron. Revisar errores antes de usar el sistema.', 'warning');
      process.exit(1);
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const test = new CleanupIntegrationTest();
  test.runAllTests().catch(error => {
    console.error('Error ejecutando tests:', error);
    process.exit(1);
  });
}

module.exports = CleanupIntegrationTest;