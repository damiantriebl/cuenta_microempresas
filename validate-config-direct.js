const fs = require('fs');
const path = require('path');

console.log('🔍 Direct validation of app configuration...\n');

// Read the file content directly
const configPath = './app.config.js';
const configContent = fs.readFileSync(configPath, 'utf8');

console.log('✅ File read successfully');
console.log('📄 File size:', configContent.length, 'characters');

// Check for key configuration elements
const hasName = configContent.includes('"Cuenta Microempresas');
const hasSlug = configContent.includes('"cuenta-microempresas"');
const hasPackage = configContent.includes('"com.ukn.cuentamicroempresas"');
const hasEASProject = configContent.includes('3dc127bf-00d4-4447-a8ea-eaaeae7a6276');
const hasNotificationPlugin = configContent.includes('expo-notifications');
const hasNotificationColor = configContent.includes('#20B2AA');

console.log('✅ App name found:', hasName);
console.log('✅ Slug found:', hasSlug);
console.log('✅ Package name found:', hasPackage);
console.log('✅ EAS project ID found:', hasEASProject);
console.log('✅ Notification plugin found:', hasNotificationPlugin);
console.log('✅ Notification color found:', hasNotificationColor);

if (hasName && hasSlug && hasPackage && hasEASProject && hasNotificationPlugin && hasNotificationColor) {
  console.log('\n🎉 All configuration elements are present in the file!');
  console.log('\n📋 Configuration Summary:');
  console.log('   • App Name: Cuenta Microempresas - Gestión de Ventas');
  console.log('   • Slug: cuenta-microempresas');
  console.log('   • Package: com.ukn.cuentamicroempresas');
  console.log('   • EAS Project: 3dc127bf-00d4-4447-a8ea-eaaeae7a6276');
  console.log('   • Notification Color: #20B2AA');
} else {
  console.log('\n❌ Some configuration elements are missing');
  process.exit(1);
}