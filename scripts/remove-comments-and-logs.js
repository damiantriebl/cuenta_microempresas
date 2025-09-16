#!/usr/bin/env node

/**
 * Script to remove comments and manage console.log statements
 * - Remove all comments (single-line and multi-line)
 * - Remove client-side console.log statements
 * - Convert server-side console.log statements to Spanish
 */

const fs = require('fs');
const path = require('path');

// Directories to process
const CLIENT_DIRS = ['app', 'components', 'context', 'hooks'];
const SERVER_DIRS = ['services', 'schemas'];
const CONFIG_FILES = ['firebaseConfig.ts', 'babel.config.js', '.eslintrc.js', 'metro.config.js'];

// Spanish translations for common log messages
const LOG_TRANSLATIONS = {
  'Starting': 'Iniciando',
  'starting': 'iniciando',
  'Created': 'Creado',
  'created': 'creado',
  'Updated': 'Actualizado',
  'updated': 'actualizado',
  'Deleted': 'Eliminado',
  'deleted': 'eliminado',
  'Retrieved': 'Obtenido',
  'retrieved': 'obtenido',
  'Found': 'Encontrado',
  'found': 'encontrado',
  'Failed': 'Falló',
  'failed': 'falló',
  'Error': 'Error',
  'error': 'error',
  'Success': 'Éxito',
  'success': 'éxito',
  'Validation': 'Validación',
  'validation': 'validación',
  'Processing': 'Procesando',
  'processing': 'procesando',
  'Completed': 'Completado',
  'completed': 'completado',
  'Client': 'Cliente',
  'client': 'cliente',
  'Product': 'Producto',
  'product': 'producto',
  'Company': 'Empresa',
  'company': 'empresa',
  'Transaction': 'Transacción',
  'transaction': 'transacción',
  'Event': 'Evento',
  'event': 'evento',
  'Sync': 'Sincronización',
  'sync': 'sincronización',
  'Backup': 'Respaldo',
  'backup': 'respaldo',
  'Migration': 'Migración',
  'migration': 'migración',
  'Notification': 'Notificación',
  'notification': 'notificación',
  'Validating': 'Validando',
  'validating': 'validando',
  'successfully': 'exitosamente',
  'Successfully': 'Exitosamente',
  'automatic': 'automático',
  'Automatic': 'Automático',
  'cleared': 'limpiado',
  'Cleared': 'Limpiado',
  'recalculated': 'recalculado',
  'Recalculated': 'Recalculado',
  'visibility': 'visibilidad',
  'Visibility': 'Visibilidad',
  'toggled': 'cambiado',
  'Toggled': 'Cambiado',
  'debt': 'deuda',
  'Debt': 'Deuda'
};

function removeComments(content) {
  // Remove single-line comments (but preserve URLs and other important patterns)
  content = content.replace(/^\s*\/\/.*$/gm, '');
  
  // Remove multi-line comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove empty lines that were left after comment removal
  content = content.replace(/^\s*\n/gm, '');
  
  // Remove multiple consecutive empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return content;
}

function removeClientConsoleLog(content) {
  // Remove console.log statements completely from client-side code
  content = content.replace(/^\s*console\.log\([^;]*\);?\s*$/gm, '');
  
  // Remove console.log statements that span multiple lines
  content = content.replace(/console\.log\([^)]*\);?/g, '');
  
  return content;
}

function translateServerConsoleLog(content) {
  // Find and translate console.log statements in server-side code
  content = content.replace(/console\.log\(([^)]+)\)/g, (match, args) => {
    let translatedArgs = args;
    
    // Translate common English phrases to Spanish
    Object.entries(LOG_TRANSLATIONS).forEach(([english, spanish]) => {
      const regex = new RegExp(`\\b${english}\\b`, 'g');
      translatedArgs = translatedArgs.replace(regex, spanish);
    });
    
    return `console.log(${translatedArgs})`;
  });
  
  return content;
}

function processFile(filePath, isClientSide = true) {
  try {
    console.log(`Procesando: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Always remove comments
    content = removeComments(content);
    
    if (isClientSide) {
      // Remove console.log statements from client-side code
      content = removeClientConsoleLog(content);
    } else {
      // Translate console.log statements in server-side code
      content = translateServerConsoleLog(content);
    }
    
    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
    } else {
      console.log(`⏭️  Sin cambios: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

function getFilesInDirectory(directory, extensions = ['ts', 'tsx', 'js', 'jsx']) {
  const files = [];
  
  function walkDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.includes('node_modules') && !item.includes('.git') && !item.includes('__tests__')) {
            walkDir(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item).slice(1);
          if (extensions.includes(ext) && !item.includes('.test.') && !item.includes('.spec.')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
  }
  
  if (fs.existsSync(directory)) {
    walkDir(directory);
  }
  
  return files;
}

function main() {
  console.log('🧹 Iniciando limpieza de comentarios y console.log...\n');
  
  let processedFiles = 0;
  
  // Process client-side directories
  console.log('📱 Procesando archivos del lado del cliente...');
  CLIENT_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getFilesInDirectory(dir);
      files.forEach(file => {
        processFile(file, true);
        processedFiles++;
      });
    }
  });
  
  // Process server-side directories
  console.log('\n🖥️  Procesando archivos del lado del servidor...');
  SERVER_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = getFilesInDirectory(dir);
      files.forEach(file => {
        processFile(file, false);
        processedFiles++;
      });
    }
  });
  
  // Process configuration files
  console.log('\n⚙️  Procesando archivos de configuración...');
  CONFIG_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      processFile(file, true);
      processedFiles++;
    }
  });
  
  console.log(`\n✨ Limpieza completada. ${processedFiles} archivos procesados.`);
}

if (require.main === module) {
  main();
}

module.exports = { removeComments, removeClientConsoleLog, translateServerConsoleLog };