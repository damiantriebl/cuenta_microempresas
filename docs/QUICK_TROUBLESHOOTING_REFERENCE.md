# Quick Troubleshooting Reference

This is a quick reference guide for the most common issues and their immediate solutions.

## 🚀 Quick Fixes

### Java Issues
```bash
# Fix JAVA_HOME automatically
.\scripts\setup-java.bat

# Validate Java setup
.\scripts\validate-environment.ps1
```

### Push Notification Issues
```bash
# Test notification gating
npm run test:notifications

# Validate app configuration
npm run validate:config
```

### Build Issues
```bash
# Clean and rebuild
cd android && .\gradlew clean && cd ..
npx expo run:android --clear
```

## 🔍 Common Error Messages

| Error | Quick Fix |
|-------|-----------|
| `JAVA_HOME is not set` | `.\scripts\setup-java.bat` |
| `Push notifications disabled in Expo Go` | ✅ **Expected behavior** |
| `Android Gradle plugin requires Java 11` | Install Java 17 LTS from [adoptium.net](https://adoptium.net/) |
| `Could not find or load main class` | `.\scripts\detect-java.ps1 -SetEnvironment` |
| `EAS project ID not configured` | Set `EAS_PROJECT_ID` in `.env` file |

## 📋 Environment Testing Checklist

### Expo Go (Development)
- [ ] App starts without errors
- [ ] Push notifications are gated (return null)
- [ ] Warning message logged: "Push notifications disabled in Expo Go"
- [ ] All other features work normally

### Development Build
- [ ] Push notification permissions requested
- [ ] Push token generated successfully
- [ ] Firebase integration working
- [ ] Debug logging visible

### Production Build
- [ ] Full push notification functionality
- [ ] No development warnings
- [ ] Production-level performance
- [ ] Store submission ready

## 🛠️ Diagnostic Commands

```bash
# Complete environment check
.\scripts\validate-environment.ps1 -Verbose

# Test all environments
npm run test:all-environments

# Validate configuration
npm run validate:config

# Check Java installations
.\scripts\detect-java.ps1 -Verbose
```

## 📞 When to Get Help

If these quick fixes don't work:

1. Run full diagnostics: `.\scripts\validate-environment.ps1 -Verbose`
2. Check the [comprehensive troubleshooting guide](./EXPO_GO_DEVELOPMENT_TROUBLESHOOTING.md)
3. Include diagnostic output when asking for help

## 🔗 Key Resources

- **Full Guide:** [EXPO_GO_DEVELOPMENT_TROUBLESHOOTING.md](./EXPO_GO_DEVELOPMENT_TROUBLESHOOTING.md)
- **Java Setup:** [JAVA_SETUP_TROUBLESHOOTING.md](./JAVA_SETUP_TROUBLESHOOTING.md)
- **App Config:** [APP_CONFIGURATION.md](./APP_CONFIGURATION.md)
- **Scripts:** [../scripts/README.md](../scripts/README.md)