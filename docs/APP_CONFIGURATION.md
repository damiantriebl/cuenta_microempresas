# App Configuration Guide

## Overview

This document explains the multi-environment app configuration setup for the Campo app, supporting both development and production builds with proper push notification gating.

## Configuration Files

### app.config.js

The main configuration file that supports environment variables for different build environments:

```javascript
export default {
  expo: {
    // ... base configuration
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "fallback-project-id"
      }
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#007AFF",
          defaultChannel: "default"
        }
      ]
    ],
    android: {
      package: "com.campo.gestionsales",
      googleServicesFile: "./android/app/google-services.json"
    }
  }
};
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# EAS Project Configuration
EAS_PROJECT_ID=your-eas-project-id

# Google Services Configuration  
GOOGLE_CLIENT_ID=your-google-client-id

# Expo Owner (for EAS builds)
EXPO_OWNER=your-expo-username
```

## Multi-Environment Support

### Development Environment (Expo Go)

- Push notifications are automatically gated using `Constants.appOwnership`
- No FCM configuration required
- Uses fallback values for missing environment variables

### Development Build

- Full push notification support
- Requires proper google-services.json configuration
- Uses environment-specific EAS project ID

### Production Build

- Complete feature set including push notifications
- Production google-services.json with real Firebase project
- Production EAS project ID and configuration

## Push Notification Configuration

### Notification Plugin Setup

```javascript
[
  "expo-notifications",
  {
    icon: "./assets/images/icon.png",        // Notification icon
    color: "#007AFF",                       // Notification color
    defaultChannel: "default"               // Default notification channel
  }
]
```

### Android Configuration

```javascript
android: {
  package: "com.campo.gestionsales",
  googleServicesFile: "./android/app/google-services.json",
  permissions: [
    "android.permission.RECEIVE_BOOT_COMPLETED",
    "android.permission.VIBRATE",
    "android.permission.WAKE_LOCK"
  ]
}
```

## Validation

Run the configuration validation script to ensure everything is set up correctly:

```bash
npm run validate:config
```

This script checks:
- ✅ app.config.js exists and loads properly
- ✅ EAS project ID is configured
- ✅ expo-notifications plugin is properly configured
- ✅ Notification icon exists and is referenced correctly
- ✅ Notification color is set
- ✅ Android package name is configured
- ✅ google-services.json exists and is referenced

## Build Commands

### Development
```bash
npm run android          # Run in Expo Go (notifications gated)
expo run:android --dev   # Development build (notifications enabled)
```

### Production
```bash
npm run build:android:production  # EAS production build
npm run deploy:android           # Build and submit to Play Store
```

## Troubleshooting

### Missing EAS Project ID
If you see "EAS project ID not configured":
1. Set `EAS_PROJECT_ID` in your `.env` file
2. Or update the fallback value in `app.config.js`

### Google Services Configuration
For production builds, ensure:
1. `google-services.json` contains real Firebase project configuration
2. Package name matches between `app.config.js` and Firebase project
3. FCM is enabled in your Firebase project

### Notification Icon Issues
- Icon must be in PNG format
- Recommended size: 96x96px for Android
- Must be referenced correctly in the plugin configuration

## Environment-Specific Features

| Feature | Expo Go | Dev Build | Production |
|---------|---------|-----------|------------|
| Push Notifications | ❌ Gated | ✅ Enabled | ✅ Enabled |
| FCM Integration | ❌ N/A | ✅ Required | ✅ Required |
| Google Services | ❌ N/A | ✅ Required | ✅ Required |
| EAS Project ID | ⚠️ Optional | ✅ Required | ✅ Required |

## Next Steps

1. Copy `.env.example` to `.env` and configure your values
2. Replace placeholder `google-services.json` with real Firebase configuration
3. Run `npm run validate:config` to verify setup
4. Test in different environments (Expo Go, dev build, production)