const fs = require('fs');
const path = require('path');

console.log('🔍 Validación directa de configuración de app...\n');


const configPath = './app.config.js';
const configContent = fs.readFileSync(configPath, 'utf8');

console.log('✅ Archivo leído exitosamente');
console.log('📄 Tamaño del archivo:', configContent.length, 'caracteres');


const hasName = configContent.includes('"Cuenta Microempresas');
const hasSlug = configContent.includes('"cuenta-microempresas"');
const hasPackage = configContent.includes('"com.ukn.cuentamicroempresas"');
const hasEASProject = configContent.includes('3dc127bf-00d4-4447-a8ea-eaaeae7a6276');
const hasNotificationPlugin = configContent.includes('expo-notifications');
const hasNotificationColor = configContent.includes('#20B2AA');

console.log('✅ Nombre de app encontrado:', hasName);
console.log('✅ Slug encontrado:', hasSlug);
console.log('✅ Nombre de paquete encontrado:', hasPackage);
console.log('✅ ID de proyecto EAS encontrado:', hasEASProject);
console.log('✅ Plugin de notificaciones encontrado:', hasNotificationPlugin);
console.log('✅ Color de notificación encontrado:', hasNotificationColor);

if (hasName && hasSlug && hasPackage && hasEASProject && hasNotificationPlugin && hasNotificationColor) {
  console.log('\n🎉 Todos los elementos de configuración están presentes en el archivo!');
  console.log('\n📋 Resumen de Configuración:');
  console.log('   • Nombre de App: Cuenta Microempresas - Gestión de Ventas');
  console.log('   • Slug: cuenta-microempresas');
  console.log('   • Paquete: com.ukn.cuentamicroempresas');
  console.log('   • Proyecto EAS: 3dc127bf-00d4-4447-a8ea-eaaeae7a6276');
  console.log('   • Color de Notificación: #20B2AA');
} else {
  console.log('\n❌ Faltan algunos elementos de configuración');
  process.exit(1);
}