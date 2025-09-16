#!/usr/bin/env node

/**
 * Sistema de Ayuda para Limpieza del Proyecto
 * Muestra información detallada sobre comandos y opciones disponibles
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CleanupHelp {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };
  }

  colorize(text, color) {
    return `${this.colors[color]}${text}${this.colors.reset}`;
  }

  showHeader() {
    console.log(this.colorize('\n🧹 Sistema de Limpieza del Proyecto', 'bright'));
    console.log(this.colorize('=====================================', 'cyan'));
    console.log('\nSistema automatizado para optimizar y limpiar el proyecto Expo + React Native + Firebase');
  }

  showMainCommands() {
    console.log(this.colorize('\n📋 Comandos Principales', 'bright'));
    console.log(this.colorize('----------------------', 'cyan'));
    
    const commands = [
      {
        cmd: 'pnpm run cleanup:dry-run',
        desc: 'Vista previa de cambios (SIN aplicar)',
        icon: '👀'
      },
      {
        cmd: 'pnpm run cleanup:execute',
        desc: 'Ejecutar limpieza con confirmaciones',
        icon: '🔧'
      },
      {
        cmd: 'pnpm run cleanup:full',
        desc: 'Limpieza completa + validación automática',
        icon: '🚀'
      },
      {
        cmd: 'pnpm run cleanup:help',
        desc: 'Mostrar esta ayuda',
        icon: '❓'
      }
    ];

    commands.forEach(({ cmd, desc, icon }) => {
      console.log(`${icon} ${this.colorize(cmd, 'green')}`);
      console.log(`   ${desc}\n`);
    });
  }

  showAnalysisCommands() {
    console.log(this.colorize('🔍 Comandos de Análisis', 'bright'));
    console.log(this.colorize('----------------------', 'cyan'));
    
    const analysisCommands = [
      {
        cmd: 'pnpm run cleanup:scan-all',
        desc: 'Escanear todo (dependencias, código, assets)',
        category: 'General'
      },
      {
        cmd: 'pnpm run cleanup:scan-deps',
        desc: 'Analizar solo dependencias',
        category: 'Dependencias'
      },
      {
        cmd: 'pnpm run cleanup:scan-dead-code',
        desc: 'Detectar código muerto',
        category: 'Código'
      },
      {
        cmd: 'pnpm run cleanup:scan-assets',
        desc: 'Analizar assets no utilizados',
        category: 'Assets'
      },
      {
        cmd: 'pnpm run analyze:all',
        desc: 'Análisis completo con herramientas externas',
        category: 'Completo'
      }
    ];

    analysisCommands.forEach(({ cmd, desc, category }) => {
      console.log(`📊 ${this.colorize(cmd, 'blue')}`);
      console.log(`   ${desc} (${this.colorize(category, 'yellow')})\n`);
    });
  }

  showValidationCommands() {
    console.log(this.colorize('✅ Comandos de Validación', 'bright'));
    console.log(this.colorize('-------------------------', 'cyan'));
    
    const validationCommands = [
      {
        cmd: 'pnpm run validate:cleanup',
        desc: 'Verificar que la limpieza fue exitosa'
      },
      {
        cmd: 'pnpm run validate:end-to-end',
        desc: 'Pruebas completas de funcionalidad'
      },
      {
        cmd: 'pnpm run validate:all',
        desc: 'Todas las validaciones'
      }
    ];

    validationCommands.forEach(({ cmd, desc }) => {
      console.log(`✔️  ${this.colorize(cmd, 'green')}`);
      console.log(`   ${desc}\n`);
    });
  }

  showAssetCommands() {
    console.log(this.colorize('🖼️  Comandos de Assets', 'bright'));
    console.log(this.colorize('--------------------', 'cyan'));
    
    const assetCommands = [
      {
        cmd: 'pnpm run assets:scan',
        desc: 'Escanear referencias de assets'
      },
      {
        cmd: 'pnpm run assets:unused',
        desc: 'Detectar assets no utilizados'
      },
      {
        cmd: 'pnpm run assets:clean',
        desc: 'Vista previa de limpieza de assets'
      },
      {
        cmd: 'pnpm run assets:remove',
        desc: 'Eliminar assets no utilizados'
      }
    ];

    assetCommands.forEach(({ cmd, desc }) => {
      console.log(`🎨 ${this.colorize(cmd, 'magenta')}`);
      console.log(`   ${desc}\n`);
    });
  }

  showWorkflow() {
    console.log(this.colorize('🔄 Flujo de Trabajo Recomendado', 'bright'));
    console.log(this.colorize('-------------------------------', 'cyan'));
    
    const steps = [
      '1. Crear respaldo: git checkout -b backup-before-cleanup',
      '2. Análisis inicial: pnpm run cleanup:scan-all',
      '3. Vista previa: pnpm run cleanup:dry-run',
      '4. Ejecutar limpieza: pnpm run cleanup:full',
      '5. Validar resultado: pnpm run validate:all',
      '6. Probar aplicación: pnpm start'
    ];

    steps.forEach((step, index) => {
      const color = index < 2 ? 'yellow' : index < 4 ? 'blue' : 'green';
      console.log(`${this.colorize(step, color)}`);
    });
  }

  showOptions() {
    console.log(this.colorize('\n⚙️  Opciones Avanzadas', 'bright'));
    console.log(this.colorize('--------------------', 'cyan'));
    
    const options = [
      {
        option: '--dry-run',
        desc: 'Solo mostrar cambios, no aplicar'
      },
      {
        option: '--force',
        desc: 'Ejecutar sin confirmaciones'
      },
      {
        option: '--skip-deps',
        desc: 'Omitir limpieza de dependencias'
      },
      {
        option: '--skip-assets',
        desc: 'Omitir limpieza de assets'
      },
      {
        option: '--skip-config',
        desc: 'Omitir limpieza de configuraciones'
      },
      {
        option: '--verbose',
        desc: 'Mostrar información detallada'
      }
    ];

    options.forEach(({ option, desc }) => {
      console.log(`⚡ ${this.colorize(option, 'yellow')}`);
      console.log(`   ${desc}\n`);
    });
  }

  showExamples() {
    console.log(this.colorize('💡 Ejemplos de Uso', 'bright'));
    console.log(this.colorize('----------------', 'cyan'));
    
    const examples = [
      {
        title: 'Primera limpieza (recomendado)',
        commands: [
          'git checkout -b backup-before-cleanup',
          'pnpm run cleanup:dry-run',
          'pnpm run cleanup:full'
        ]
      },
      {
        title: 'Solo limpiar assets',
        commands: [
          'pnpm run assets:analyze',
          'pnpm run assets:remove'
        ]
      },
      {
        title: 'Limpieza conservadora',
        commands: [
          'pnpm run cleanup:execute --skip-config',
          'pnpm run validate:cleanup'
        ]
      }
    ];

    examples.forEach(({ title, commands }) => {
      console.log(`\n${this.colorize(title, 'bright')}:`);
      commands.forEach(cmd => {
        console.log(`  ${this.colorize(cmd, 'green')}`);
      });
    });
  }

  showTroubleshooting() {
    console.log(this.colorize('\n🚨 Solución de Problemas Rápida', 'bright'));
    console.log(this.colorize('--------------------------------', 'cyan'));
    
    const issues = [
      {
        problem: 'Error de compilación después de limpieza',
        solution: 'git checkout HEAD~1 -- tsconfig.json && pnpm run typecheck'
      },
      {
        problem: 'Dependencia eliminada por error',
        solution: 'pnpm add nombre-dependencia'
      },
      {
        problem: 'Asset eliminado por error',
        solution: 'git checkout HEAD~1 -- assets/archivo-eliminado.png'
      },
      {
        problem: 'Rollback completo',
        solution: 'git checkout backup-before-cleanup'
      }
    ];

    issues.forEach(({ problem, solution }) => {
      console.log(`${this.colorize('❌ Problema:', 'red')} ${problem}`);
      console.log(`${this.colorize('✅ Solución:', 'green')} ${solution}\n`);
    });
  }

  showDocumentation() {
    console.log(this.colorize('📚 Documentación Completa', 'bright'));
    console.log(this.colorize('-------------------------', 'cyan'));
    
    const docs = [
      {
        file: 'docs/GUIA_LIMPIEZA_PROYECTO.md',
        desc: 'Guía completa del sistema de limpieza'
      },
      {
        file: 'docs/SOLUCION_PROBLEMAS_LIMPIEZA.md',
        desc: 'Troubleshooting detallado'
      },
      {
        file: 'docs/EJEMPLOS_USO_LIMPIEZA.md',
        desc: 'Ejemplos prácticos y casos de uso'
      }
    ];

    docs.forEach(({ file, desc }) => {
      const exists = fs.existsSync(file);
      const status = exists ? this.colorize('✅', 'green') : this.colorize('❌', 'red');
      console.log(`${status} ${this.colorize(file, 'blue')}`);
      console.log(`   ${desc}\n`);
    });
  }

  showFooter() {
    console.log(this.colorize('\n⚠️  Recordatorios Importantes', 'bright'));
    console.log(this.colorize('----------------------------', 'cyan'));
    console.log('• Siempre crear respaldo antes de limpieza: git checkout -b backup-before-cleanup');
    console.log('• Usar --dry-run primero para ver qué se va a cambiar');
    console.log('• Validar después de limpieza: pnpm run validate:all');
    console.log('• En caso de problemas: git checkout backup-before-cleanup');
    
    console.log(this.colorize('\n🎯 Plataformas Soportadas', 'bright'));
    console.log('✅ Android - Completamente soportado');
    console.log('✅ Web - Completamente soportado');
    console.log('❌ iOS - NO soportado en este proyecto');
    
    console.log(this.colorize('\n📞 Soporte', 'bright'));
    console.log('Para problemas específicos, consultar la documentación en docs/');
    console.log('Usar git para rollback en caso de problemas graves\n');
  }

  run() {
    this.showHeader();
    this.showMainCommands();
    this.showAnalysisCommands();
    this.showValidationCommands();
    this.showAssetCommands();
    this.showWorkflow();
    this.showOptions();
    this.showExamples();
    this.showTroubleshooting();
    this.showDocumentation();
    this.showFooter();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const help = new CleanupHelp();
  help.run();
}

module.exports = CleanupHelp;