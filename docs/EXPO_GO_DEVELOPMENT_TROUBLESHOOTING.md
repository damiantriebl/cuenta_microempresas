# Expo Go Development Environment - Comprehensive Troubleshooting Guide

This guide provides complete troubleshooting information for the Expo Go development environment fixes, covering Java setup, push notification issues, and environment-specific testing.

## Quick Start - Automated Fixes

Before diving into manual troubleshooting, try these automated solutions:

```bash
# Fix Java environment automatically
.\scripts\setup-java.bat

# Validate complete environment
.\scripts\validate-environment.ps1

# Test push notification gating
npm run test:notifications

# Validate app configuration
npm run validate:config
```

## Table of Contents

1. [Java Environment Issues](#java-environment-issues)
2. [Push Notification Problems](#push-notification-problems)
3. [Environment-Specific Testing](#environment-specific-testing)
4. [Configuration Issues](#configuration-issues)
5. [Build and Deployment Problems](#build-and-deployment-problems)
6. [Advanced Troubleshooting](#advanced-troubleshooting)

---

## Java Environment Issues

### 1. JAVA_HOME Not Set or Incorrect

**Symptoms:**
- `JAVA_HOME is not set and no 'java' command could be found`
- `Could not find or load main class org.gradle.wrapper.GradleWrapperMain`
- `ERROR: JAVA_HOME is not set`
- Android builds fail with Java-related errors

**Automated Solution:**
```bash
# Windows Command Prompt
.\scripts\setup-java.bat

# PowerShell (preferred)
.\scripts\detect-java.ps1 -SetEnvironment

# Validate the fix
.\scripts\validate-environment.ps1
```

**Manual Solution:**
```cmd
# 1. Find Java installation
dir "C:\Program Files\Java"
dir "C:\Program Files\Eclipse Adoptium"

# 2. Set JAVA_HOME (replace with your path)
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot"

# 3. Add to PATH
setx PATH "%PATH%;%JAVA_HOME%\bin"

# 4. Restart terminal and verify
java -version
```

### 2. Incompatible Java Version

**Symptoms:**
- `Android Gradle plugin requires Java 11 to run`
- `Unsupported Java version`
- Build fails with version compatibility errors

**Requirements:**
- **Minimum:** Java 11
- **Recommended:** Java 17 LTS or Java 21 LTS

**Solution:**
```bash
# Check current version
java -version

# If incompatible, install Java 17 LTS
# Download from: https://adoptium.net/

# After installation, run setup
.\scripts\detect-java.ps1 -SetEnvironment
```

**Recommended Java Distributions:**
- [Eclipse Adoptium (Temurin)](https://adoptium.net/) - **Recommended**
- [Amazon Corretto](https://aws.amazon.com/corretto/)
- [Microsoft OpenJDK](https://www.microsoft.com/openjdk)

### 3. Multiple Java Installations Conflict

**Symptoms:**
- Inconsistent Java version between `java -version` and `javac -version`
- Build works sometimes but fails other times
- Different Java versions in different terminals

**Solution:**
```powershell
# List all Java installations
.\scripts\detect-java.ps1 -Verbose

# Auto-select best version
.\scripts\detect-java.ps1 -SetEnvironment

# Verify consistency
java -version
javac -version
echo $env:JAVA_HOME
```

**Manual Cleanup (if needed):**
1. Uninstall old Java versions via Control Panel
2. Clear old JAVA_HOME entries from environment variables
3. Install single Java 17 LTS version
4. Run setup script

### 4. Corporate/Enterprise Environment Issues

**Symptoms:**
- PowerShell execution policy restrictions
- Limited user permissions
- Proxy/firewall blocking downloads

**Solutions:**

**PowerShell Execution Policy:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set for current user (if allowed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Alternative: Run specific script
powershell -ExecutionPolicy Bypass -File .\scripts\detect-java.ps1
```

**Manual Setup for Restricted Environments:**
1. Open System Properties (Windows Key + R → `sysdm.cpl`)
2. Advanced → Environment Variables
3. Add JAVA_HOME: `C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot`
4. Edit PATH: Add `%JAVA_HOME%\bin`
5. Restart IDE/terminal

**Contact IT Department:**
- Request Java 17 LTS installation
- Request JAVA_HOME environment variable setup
- Request Android SDK installation (if needed)

---

## Push Notification Problems

### 1. Push Notifications Not Working in Expo Go

**Expected Behavior:** Push notifications should be **disabled** in Expo Go

**Symptoms:**
- App crashes when trying to register push notifications
- Errors related to missing FCM configuration
- `Constants.appOwnership` issues

**Verification:**
```bash
# Test notification gating
npm run test:notifications

# Or run verification script
node services/verify-notification-gating.ts
```

**Expected Results:**
- ✅ Push notifications return `null` in Expo Go
- ✅ Warning message logged: "Push notifications disabled in Expo Go"
- ✅ No crashes or blocking errors

**If Still Having Issues:**

1. **Check NotificationService Implementation:**
```typescript
// Should have this logic in services/NotificationService.ts
private static isRunningInExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient' || 
         Constants.appOwnership === 'expo';
}
```

2. **Verify Constants Import:**
```typescript
import Constants from 'expo-constants';
```

3. **Check App Configuration:**
```javascript
// app.config.js should have EAS project ID
extra: {
  eas: {
    projectId: process.env.EAS_PROJECT_ID || "fallback-project-id"
  }
}
```

### 2. Push Notifications Not Working in Production

**Symptoms:**
- Push notifications return `null` in production builds
- No push tokens generated
- Permissions not requested

**Troubleshooting Steps:**

1. **Verify Environment Detection:**
```bash
# Check if app thinks it's in Expo Go
console.log('Execution Environment:', Constants.executionEnvironment);
console.log('App Ownership:', Constants.appOwnership);
```

2. **Check Firebase Configuration:**
```bash
# Verify google-services.json exists
ls android/app/google-services.json

# Validate configuration
npm run validate:config
```

3. **Test Permissions:**
```typescript
// Add debug logging to NotificationService
const { status } = await Notifications.requestPermissionsAsync();
console.log('Permission status:', status);
```

4. **Verify EAS Configuration:**
```bash
# Check EAS project ID
echo $EAS_PROJECT_ID

# Verify eas.json configuration
cat eas.json
```

### 3. Push Notification Permission Issues

**Symptoms:**
- Permissions always denied
- No permission prompt shown
- App crashes when requesting permissions

**Solutions:**

1. **Check Android Permissions:**
```javascript
// app.config.js should include
android: {
  permissions: [
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.VIBRATE",
    "android.permission.WAKE_LOCK"
  ]
}
```

2. **Test Permission Flow:**
```typescript
// Debug permission request
try {
  const { status } = await Notifications.requestPermissionsAsync();
  console.log('Permission result:', status);
  
  if (status !== 'granted') {
    console.log('Permissions not granted, opening settings...');
    // Guide user to settings
  }
} catch (error) {
  console.error('Permission request failed:', error);
}
```

3. **Check Device Settings:**
- Android: Settings → Apps → [Your App] → Notifications
- Ensure notifications are enabled for the app

---

## Environment-Specific Testing

### Testing in Expo Go

**Purpose:** Verify push notifications are properly gated

**Test Steps:**
1. Start app in Expo Go: `npx expo start`
2. Open app on device via QR code
3. Verify no push notification errors in console
4. Check that warning message is logged

**Expected Results:**
```
✅ App starts without errors
✅ Console shows: "Push notifications disabled in Expo Go"
✅ No FCM-related crashes
✅ All other features work normally
```

**If Tests Fail:**
```bash
# Check notification service implementation
cat services/NotificationService.ts | grep -A 10 "isRunningInExpoGo"

# Verify Constants import
grep "expo-constants" services/NotificationService.ts

# Run automated test
npm run test:notifications
```

### Testing Development Builds

**Purpose:** Verify push notifications work in development builds

**Test Steps:**
1. Create development build: `npx eas build --profile development`
2. Install on device
3. Test push notification registration
4. Verify token generation

**Expected Results:**
```
✅ Push notification permissions requested
✅ Push token generated successfully
✅ Token logged to console
✅ Notifications can be received
```

**If Tests Fail:**
```bash
# Check EAS configuration
cat eas.json | grep -A 5 "development"

# Verify google-services.json
ls -la android/app/google-services.json

# Check app configuration
npm run validate:config
```

### Testing Production Builds

**Purpose:** Verify full functionality in production

**Test Steps:**
1. Create production build: `npx eas build --profile production`
2. Install on device (or submit to store)
3. Test complete push notification flow
4. Verify Firebase integration

**Expected Results:**
```
✅ Full push notification functionality
✅ Firebase integration working
✅ Production-level performance
✅ No development warnings
```

### Cross-Environment Validation

**Automated Testing:**
```bash
# Run complete test suite
npm run test:all-environments

# Test specific environments
npm run test:expo-go
npm run test:development-build
npm run test:production-build
```

**Manual Validation Checklist:**
- [ ] Expo Go: Notifications gated, no errors
- [ ] Development build: Notifications work, debug logging
- [ ] Production build: Full functionality, no debug logs
- [ ] All environments: Core app features work
- [ ] Configuration adapts correctly to each environment

---

## Configuration Issues

### 1. App Configuration Problems

**Symptoms:**
- Build fails with configuration errors
- Missing EAS project ID warnings
- Plugin configuration issues

**Validation:**
```bash
# Validate complete configuration
npm run validate:config

# Check specific configuration file
node -e "console.log(require('./app.config.js'))"
```

**Common Issues and Fixes:**

**Missing EAS Project ID:**
```javascript
// app.config.js - Add fallback
extra: {
  eas: {
    projectId: process.env.EAS_PROJECT_ID || "your-fallback-project-id"
  }
}
```

**Notification Plugin Issues:**
```javascript
// Ensure proper plugin configuration
plugins: [
  [
    "expo-notifications",
    {
      icon: "./assets/images/icon.png",
      color: "#007AFF",
      defaultChannel: "default"
    }
  ]
]
```

**Android Configuration:**
```javascript
android: {
  package: "com.campo.gestionsales",
  googleServicesFile: "./android/app/google-services.json"
}
```

### 2. Environment Variable Issues

**Symptoms:**
- Configuration values not loading
- Build-time vs runtime variable confusion
- Missing .env file

**Solutions:**

1. **Create .env file:**
```bash
# Copy example file
cp .env.example .env

# Edit with your values
EAS_PROJECT_ID=your-eas-project-id
GOOGLE_CLIENT_ID=your-google-client-id
EXPO_OWNER=your-expo-username
```

2. **Verify Variable Loading:**
```javascript
// In app.config.js
console.log('EAS_PROJECT_ID:', process.env.EAS_PROJECT_ID);
```

3. **Build-time vs Runtime:**
```javascript
// Build-time (app.config.js)
projectId: process.env.EAS_PROJECT_ID

// Runtime (app code)
import Constants from 'expo-constants';
const projectId = Constants.expoConfig?.extra?.eas?.projectId;
```

### 3. Google Services Configuration

**Symptoms:**
- FCM not working
- Authentication issues
- Package name mismatches

**Validation:**
```bash
# Check file exists
ls -la android/app/google-services.json

# Validate JSON format
cat android/app/google-services.json | jq .
```

**Common Issues:**

**Wrong Package Name:**
```json
// google-services.json should match app.config.js
{
  "client": [{
    "client_info": {
      "android_client_info": {
        "package_name": "com.campo.gestionsales"
      }
    }
  }]
}
```

**Development vs Production:**
- Use development Firebase project for development builds
- Use production Firebase project for production builds
- Never commit production google-services.json to version control

---

## Build and Deployment Problems

### 1. EAS Build Issues

**Symptoms:**
- Build fails on EAS servers
- Configuration not found
- Plugin installation failures

**Troubleshooting:**

1. **Check EAS Configuration:**
```bash
# Validate eas.json
cat eas.json

# Check EAS CLI version
npx eas --version

# Login to EAS
npx eas login
```

2. **Common Build Fixes:**
```json
// eas.json - Ensure all profiles are configured
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

3. **Plugin Issues:**
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install

# Verify plugin installation
npm list expo-notifications
```

### 2. Local Build Issues

**Symptoms:**
- `npx expo run:android` fails
- Gradle build errors
- Android SDK issues

**Solutions:**

1. **Java Environment:**
```bash
# Validate Java setup
.\scripts\validate-environment.ps1

# Fix if needed
.\scripts\setup-java.bat
```

2. **Android SDK:**
```bash
# Check Android SDK
echo $ANDROID_HOME
echo $ANDROID_SDK_ROOT

# Install if missing
# Download from: https://developer.android.com/studio
```

3. **Clean Build:**
```bash
# Clean everything
cd android
.\gradlew clean
cd ..
npx expo run:android --clear
```

### 3. Deployment Issues

**Symptoms:**
- App store submission failures
- Version conflicts
- Signing issues

**Solutions:**

1. **Version Management:**
```javascript
// app.config.js - Increment versions
version: "1.0.1",
android: {
  versionCode: 2
}
```

2. **Signing Configuration:**
```bash
# Check signing configuration in eas.json
cat eas.json | grep -A 5 "credentials"
```

3. **Store Submission:**
```bash
# Submit to store
npx eas submit --platform android

# Check submission status
npx eas submission:list
```

---

## Advanced Troubleshooting

### Debug Mode and Logging

**Enable Debug Logging:**
```typescript
// Add to app entry point
if (__DEV__) {
  console.log('Development mode - enabling debug logging');
  
  // Log environment info
  console.log('Constants.executionEnvironment:', Constants.executionEnvironment);
  console.log('Constants.appOwnership:', Constants.appOwnership);
  console.log('EAS Project ID:', Constants.expoConfig?.extra?.eas?.projectId);
}
```

**Notification Service Debug:**
```typescript
// Add debug logging to NotificationService
export class NotificationService {
  private static debug(message: string, data?: any) {
    if (__DEV__) {
      console.log(`[NotificationService] ${message}`, data || '');
    }
  }
  
  static async registerPush(): Promise<string | null> {
    this.debug('registerPush called');
    
    if (this.isRunningInExpoGo()) {
      this.debug('Running in Expo Go - gating notifications');
      console.warn('Push notifications disabled in Expo Go');
      return null;
    }
    
    this.debug('Not in Expo Go - proceeding with registration');
    // ... rest of implementation
  }
}
```

### Performance Monitoring

**Monitor Startup Performance:**
```typescript
// Add performance markers
const startTime = Date.now();

// After app initialization
const initTime = Date.now() - startTime;
console.log(`App initialization took ${initTime}ms`);
```

**Memory Usage Monitoring:**
```typescript
// Monitor memory usage (development only)
if (__DEV__) {
  setInterval(() => {
    if (performance.memory) {
      console.log('Memory usage:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
      });
    }
  }, 30000); // Every 30 seconds
}
```

### Network and Connectivity Issues

**Debug Network Requests:**
```typescript
// Add network interceptor for debugging
if (__DEV__) {
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    console.log('Network request:', url, options);
    const response = await originalFetch(url, options);
    console.log('Network response:', response.status, response.statusText);
    return response;
  };
}
```

**Test Offline Behavior:**
```typescript
// Test offline scenarios
import NetInfo from '@react-native-async-storage/async-storage';

NetInfo.addEventListener(state => {
  console.log('Network state:', state);
  if (!state.isConnected) {
    console.warn('App is offline - some features may not work');
  }
});
```

### Automated Diagnostics

**Run Complete Diagnostic Suite:**
```bash
# Run all diagnostic scripts
.\scripts\validate-environment.ps1 -Verbose
npm run validate:config
npm run test:notifications
npm run test:all-environments

# Generate diagnostic report
.\scripts\generate-diagnostic-report.ps1
```

**Custom Diagnostic Script:**
```powershell
# Create custom diagnostic script
# scripts/diagnose-issues.ps1

Write-Host "Running comprehensive diagnostics..."

# Check Java
Write-Host "Java Environment:"
java -version
echo "JAVA_HOME: $env:JAVA_HOME"

# Check Node.js
Write-Host "Node.js Environment:"
node --version
npm --version

# Check Expo
Write-Host "Expo Environment:"
npx expo --version

# Check app configuration
Write-Host "App Configuration:"
node -e "console.log(JSON.stringify(require('./app.config.js'), null, 2))"

# Test notification service
Write-Host "Notification Service Test:"
npm run test:notifications

Write-Host "Diagnostics complete!"
```

### Recovery Procedures

**Complete Environment Reset:**
```bash
# 1. Clean Node.js environment
rm -rf node_modules
rm package-lock.json
npm install

# 2. Reset Java environment
.\scripts\setup-java.bat

# 3. Clear Expo cache
npx expo r -c

# 4. Reset Android build
cd android
.\gradlew clean
cd ..

# 5. Validate everything
.\scripts\validate-environment.ps1
npm run validate:config
```

**Rollback to Working State:**
```bash
# If you have a working commit
git stash
git checkout [working-commit-hash]

# Test if working
npm install
npx expo start

# If working, identify what changed
git diff [working-commit-hash] HEAD
```

---

## Getting Help and Support

### Before Asking for Help

Run these diagnostic commands and include the output:

```bash
# Environment diagnostics
.\scripts\validate-environment.ps1 -Verbose > diagnostics.txt

# Configuration validation
npm run validate:config >> diagnostics.txt

# Notification testing
npm run test:notifications >> diagnostics.txt

# System information
echo "OS: $(Get-WmiObject -Class Win32_OperatingSystem | Select-Object Caption, Version)" >> diagnostics.txt
echo "Node: $(node --version)" >> diagnostics.txt
echo "Java: $(java -version 2>&1)" >> diagnostics.txt
```

### Information to Include

When reporting issues, provide:

1. **Error Messages:** Complete error text and stack traces
2. **Environment Info:** OS, Node.js version, Java version
3. **Configuration:** Relevant parts of app.config.js and eas.json
4. **Steps to Reproduce:** Exact commands and steps that cause the issue
5. **Expected vs Actual:** What you expected vs what actually happened
6. **Diagnostic Output:** Results from diagnostic scripts

### Community Resources

- **Expo Documentation:** [docs.expo.dev](https://docs.expo.dev/)
- **Expo Discord:** [chat.expo.dev](https://chat.expo.dev/)
- **Stack Overflow:** [stackoverflow.com/questions/tagged/expo](https://stackoverflow.com/questions/tagged/expo)
- **GitHub Issues:** [github.com/expo/expo/issues](https://github.com/expo/expo/issues)
- **React Native Docs:** [reactnative.dev/docs](https://reactnative.dev/docs)

### Internal Support

For project-specific issues:

1. **Check Documentation:** Review all docs in the `docs/` folder
2. **Run Scripts:** Use automated scripts in `scripts/` folder
3. **Check Tests:** Review test files for expected behavior
4. **Consult Code:** Look at implementation in `services/` folder

---

## Troubleshooting Checklist

Use this checklist to systematically troubleshoot issues:

### Java Environment ✓
- [ ] Java 11+ is installed
- [ ] JAVA_HOME is set correctly
- [ ] Java is in PATH
- [ ] Terminal/IDE has been restarted
- [ ] No conflicting Java installations
- [ ] Proper permissions for installation directories
- [ ] Corporate firewall/proxy not blocking
- [ ] Antivirus not interfering

### Push Notifications ✓
- [ ] NotificationService properly detects Expo Go
- [ ] Warning messages logged in Expo Go
- [ ] Notifications return null in Expo Go
- [ ] Permissions work in production builds
- [ ] Firebase configuration is correct
- [ ] EAS project ID is configured
- [ ] google-services.json exists and is valid

### Configuration ✓
- [ ] app.config.js loads without errors
- [ ] All required plugins are configured
- [ ] Environment variables are set
- [ ] EAS configuration is complete
- [ ] Android configuration is correct
- [ ] Notification icons exist

### Build System ✓
- [ ] Dependencies are installed correctly
- [ ] No version conflicts
- [ ] Build scripts work
- [ ] EAS CLI is authenticated
- [ ] Android SDK is configured (if needed)

### Testing ✓
- [ ] Expo Go works without errors
- [ ] Development builds work correctly
- [ ] Production builds have full functionality
- [ ] All environments tested
- [ ] Automated tests pass

---

This comprehensive guide should help you resolve any issues with the Expo Go development environment. If you encounter problems not covered here, use the diagnostic tools and support resources provided.