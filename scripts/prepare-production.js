#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparando aplicación para producción...\n');

// Verificar archivos requeridos
const requiredFiles = [
  'app.json',
  'eas.json',
  'assets/images/icon.png',
  'assets/images/adaptive-icon.png'
];

console.log('📋 Verificando archivos requeridos...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANTE`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Faltan archivos requeridos. Por favor, créalos antes de continuar.');
  process.exit(1);
}

// Verificar configuración de app.json
console.log('\n🔍 Verificando configuración...');
const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));

const requiredConfig = [
  'expo.name',
  'expo.slug', 
  'expo.version',
  'expo.android.package',
  'expo.android.versionCode'
];

requiredConfig.forEach(configPath => {
  const value = configPath.split('.').reduce((obj, key) => obj?.[key], appConfig);
  if (value) {
    console.log(`✅ ${configPath}: ${value}`);
  } else {
    console.log(`❌ ${configPath} - NO CONFIGURADO`);
    allFilesExist = false;
  }
});

// Verificar EAS configuration
console.log('\n🔧 Verificando configuración EAS...');
if (fs.existsSync('eas.json')) {
  const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  if (easConfig.build?.production) {
    console.log('✅ Perfil de producción configurado');
  } else {
    console.log('❌ Perfil de producción no configurado');
    allFilesExist = false;
  }
} else {
  console.log('❌ eas.json no encontrado');
  allFilesExist = false;
}

if (allFilesExist) {
  console.log('\n🎉 ¡Aplicación lista para producción!');
  console.log('\nPróximos pasos:');
  console.log('1. eas login');
  console.log('2. npm run build:android:production');
  console.log('3. Configurar Google Play Console');
  console.log('4. npm run submit:android');
} else {
  console.log('\n❌ La aplicación no está lista para producción.');
  console.log('Por favor, corrige los problemas listados arriba.');
  process.exit(1);
}