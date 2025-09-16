# Java Setup Troubleshooting Guide

This guide helps resolve common Java environment issues for Android development with Expo.

## Quick Fix

Run our automated setup script:

```bash
# Windows Command Prompt
scripts\setup-java.bat

# Windows PowerShell
.\scripts\detect-java.ps1 -SetEnvironment

# Validate your setup
.\scripts\validate-environment.ps1
```

## Common Issues and Solutions

### 1. JAVA_HOME Not Set

**Error Messages:**
- `JAVA_HOME is not set and no 'java' command could be found`
- `Could not find or load main class org.gradle.wrapper.GradleWrapperMain`
- `ERROR: JAVA_HOME is not set`

**Solution:**

1. **Automatic Detection:**
   ```powershell
   .\scripts\detect-java.ps1 -SetEnvironment
   ```

2. **Manual Setup:**
   ```cmd
   # Find your Java installation
   dir "C:\Program Files\Java"
   dir "C:\Program Files\Eclipse Adoptium"
   
   # Set JAVA_HOME (replace with your actual path)
   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot"
   
   # Restart your terminal/IDE
   ```

### 2. Java Not Found in PATH

**Error Messages:**
- `'java' is not recognized as an internal or external command`
- `Java installation not found`

**Solution:**

1. **Check if Java is installed:**
   ```powershell
   .\scripts\detect-java.ps1 -Verbose
   ```

2. **Add Java to PATH:**
   ```cmd
   # Add to PATH (replace with your JAVA_HOME)
   setx PATH "%PATH%;%JAVA_HOME%\bin"
   ```

3. **Verify installation:**
   ```cmd
   java -version
   javac -version
   ```

### 3. Incompatible Java Version

**Error Messages:**
- `Android Gradle plugin requires Java 11 to run`
- `Unsupported Java version`

**Current Requirements:**
- **Minimum:** Java 11
- **Recommended:** Java 17 or 21 (LTS versions)

**Solution:**

1. **Check current version:**
   ```cmd
   java -version
   ```

2. **Install compatible Java:**
   - [Eclipse Temurin](https://adoptium.net/) (Recommended)
   - [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)
   - [Amazon Corretto](https://aws.amazon.com/corretto/)
   - [Microsoft OpenJDK](https://www.microsoft.com/openjdk)

3. **Update JAVA_HOME to new installation:**
   ```powershell
   .\scripts\detect-java.ps1 -SetEnvironment
   ```

### 4. Multiple Java Installations

**Issue:** Multiple Java versions causing conflicts

**Solution:**

1. **List all installations:**
   ```powershell
   .\scripts\detect-java.ps1 -Verbose
   ```

2. **Choose the correct one:**
   - The script automatically selects the most recent compatible version
   - Manually set JAVA_HOME if you need a specific version

3. **Clean up old installations (optional):**
   - Uninstall unused Java versions through Control Panel
   - Remove old JAVA_HOME entries

### 5. Gradle Build Failures

**Error Messages:**
- `Could not determine the dependencies of task ':app:compileDebugJavaWithJavac'`
- `Execution failed for task ':app:mergeDebugResources'`

**Solution:**

1. **Validate environment:**
   ```powershell
   .\scripts\validate-environment.ps1
   ```

2. **Clean and rebuild:**
   ```bash
   cd android
   .\gradlew clean
   cd ..
   npx expo run:android
   ```

3. **Check Android SDK:**
   ```cmd
   # Verify Android SDK is installed
   echo %ANDROID_HOME%
   echo %ANDROID_SDK_ROOT%
   ```

### 6. Permission Issues

**Error Messages:**
- `Access denied`
- `Cannot create directory`

**Solution:**

1. **Run as Administrator:**
   - Right-click Command Prompt/PowerShell
   - Select "Run as administrator"

2. **Check file permissions:**
   - Ensure you have write access to Java installation directory
   - Check if antivirus is blocking the installation

### 7. Corporate/Enterprise Environments

**Common Issues:**
- Restricted execution policies
- Proxy settings
- Limited user permissions

**Solutions:**

1. **PowerShell execution policy:**
   ```powershell
   # Check current policy
   Get-ExecutionPolicy
   
   # Set for current user (if allowed)
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Manual JAVA_HOME setup:**
   ```cmd
   # Use system properties instead of command line
   # Windows Key + R → sysdm.cpl → Advanced → Environment Variables
   ```

3. **Contact IT department:**
   - Request Java 11+ installation
   - Request JAVA_HOME environment variable setup
   - Request Android SDK installation (if needed)

## Installation Paths Reference

### Common Java Installation Locations:

```
# Eclipse Temurin (Adoptium)
C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot
C:\Program Files\Eclipse Adoptium\jdk-17.0.8.7-hotspot

# Oracle JDK
C:\Program Files\Java\jdk-11.0.20
C:\Program Files\Java\jdk-17.0.8

# Amazon Corretto
C:\Program Files\Amazon Corretto\jdk11.0.20_8
C:\Program Files\Amazon Corretto\jdk17.0.8_7

# Microsoft OpenJDK
C:\Program Files\Microsoft\jdk-11.0.16.101-hotspot
C:\Program Files\Microsoft\jdk-17.0.4.101-hotspot

# OpenJDK (various distributions)
C:\Program Files\OpenJDK\jdk-11.0.2
C:\Users\[username]\AppData\Local\Programs\Java\jdk-11.0.20
```

## Verification Commands

After setup, verify your installation:

```bash
# Check Java version
java -version

# Check Java compiler
javac -version

# Check JAVA_HOME
echo %JAVA_HOME%

# Validate complete environment
.\scripts\validate-environment.ps1 -Verbose

# Test Android build
npx expo run:android
```

## Environment Variables Summary

Required environment variables for Android development:

```cmd
# Essential
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-11.0.20.8-hotspot
PATH=%PATH%;%JAVA_HOME%\bin

# Optional but recommended
ANDROID_HOME=C:\Users\[username]\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=%ANDROID_HOME%
PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```

## Additional Troubleshooting Scenarios

### 8. WSL (Windows Subsystem for Linux) Issues

**Issue:** Using WSL but Java is installed on Windows

**Solution:**

1. **Install Java in WSL:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install openjdk-17-jdk

   # Set JAVA_HOME in WSL
   echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
   echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
   source ~/.bashrc
   ```

2. **Or use Windows Java from WSL:**
   ```bash
   # Add Windows Java to WSL PATH
   echo 'export JAVA_HOME="/mnt/c/Program Files/Eclipse Adoptium/jdk-17.0.8.7-hotspot"' >> ~/.bashrc
   echo 'export PATH=$PATH:$JAVA_HOME/bin' >> ~/.bashrc
   source ~/.bashrc
   ```

### 9. Android Studio Integration Issues

**Issue:** Android Studio can't find Java or uses wrong version

**Solution:**

1. **Configure in Android Studio:**
   - File → Project Structure → SDK Location
   - Set JDK location to your JAVA_HOME path

2. **Gradle JVM Configuration:**
   - File → Settings → Build → Gradle
   - Set Gradle JVM to your Java installation

3. **Sync with system JAVA_HOME:**
   ```cmd
   # Ensure Android Studio uses system Java
   set STUDIO_JDK=%JAVA_HOME%
   ```

### 10. Antivirus and Security Software Issues

**Symptoms:**
- Java installation fails
- JAVA_HOME gets reset
- Gradle builds are blocked

**Solutions:**

1. **Whitelist Java directories:**
   - Add Java installation folder to antivirus exclusions
   - Add Gradle cache directory: `%USERPROFILE%\.gradle`

2. **Temporarily disable real-time protection:**
   - During Java installation only
   - Re-enable after setup is complete

3. **Corporate security software:**
   - Contact IT for Java installation approval
   - Request whitelist for development tools

### 11. Path Length Limitations (Windows)

**Issue:** Long path names causing Java issues

**Solution:**

1. **Enable long path support:**
   ```cmd
   # Run as Administrator
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1
   ```

2. **Use shorter installation paths:**
   ```cmd
   # Install Java to shorter path
   C:\Java\jdk-17
   # Instead of default long path
   ```

3. **Use 8.3 names if needed:**
   ```cmd
   # Get short name
   dir /x "C:\Program Files"
   # Use PROGRA~1 instead of "Program Files"
   ```

## Environment-Specific Testing Instructions

### Testing Java Setup

**Basic Validation:**
```bash
# Test Java installation
java -version
javac -version

# Test JAVA_HOME
echo %JAVA_HOME%
echo %PATH% | findstr Java

# Test Gradle compatibility
cd android
.\gradlew --version
cd ..
```

**Advanced Testing:**
```bash
# Test Android build process
npx expo run:android --dry-run

# Test EAS build compatibility
npx eas build --platform android --local --dry-run

# Test with different Java versions
.\scripts\detect-java.ps1 -Verbose
```

### Integration Testing

**Test with Expo CLI:**
```bash
# Test Expo development build
npx expo install --fix
npx expo run:android

# Test EAS build
npx eas build --platform android --profile development
```

**Test with Android Studio:**
1. Open `android` folder in Android Studio
2. Sync project with Gradle files
3. Build → Make Project
4. Verify no Java-related errors

### Performance Testing

**Build Performance:**
```bash
# Time the build process
Measure-Command { npx expo run:android }

# Check Gradle daemon
cd android
.\gradlew --status
cd ..
```

**Memory Usage:**
```bash
# Check Java memory usage during build
# Task Manager → Java processes during build
# Adjust if needed: set GRADLE_OPTS=-Xmx4g
```

## Getting Help

If you're still experiencing issues:

1. **Run comprehensive diagnostics:**
   ```powershell
   .\scripts\validate-environment.ps1 -Verbose
   .\scripts\detect-java.ps1 -Verbose
   ```

2. **Generate diagnostic report:**
   ```powershell
   # Create detailed report
   .\scripts\validate-environment.ps1 -Verbose > java-diagnostics.txt
   echo "Java installations:" >> java-diagnostics.txt
   .\scripts\detect-java.ps1 -Verbose >> java-diagnostics.txt
   echo "System info:" >> java-diagnostics.txt
   systeminfo | findstr /C:"OS Name" /C:"OS Version" >> java-diagnostics.txt
   ```

3. **Check comprehensive troubleshooting:**
   - [Complete Troubleshooting Guide](./EXPO_GO_DEVELOPMENT_TROUBLESHOOTING.md)
   - [Quick Reference](./QUICK_TROUBLESHOOTING_REFERENCE.md)

4. **Expo documentation:**
   - [Expo Development Build](https://docs.expo.dev/development/build/)
   - [Android Setup](https://docs.expo.dev/workflow/android-studio-emulator/)

5. **Common resources:**
   - [React Native Environment Setup](https://reactnative.dev/docs/environment-setup)
   - [Android Developer Documentation](https://developer.android.com/studio/install)

6. **Community support:**
   - [Expo Discord](https://chat.expo.dev/)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
   - [GitHub Issues](https://github.com/expo/expo/issues)

## Troubleshooting Checklist

- [ ] Java 11+ is installed
- [ ] JAVA_HOME is set correctly
- [ ] Java is in PATH
- [ ] Terminal/IDE has been restarted
- [ ] No conflicting Java installations
- [ ] Proper permissions for installation directories
- [ ] Corporate firewall/proxy not blocking downloads
- [ ] Antivirus not interfering with Java execution

## Advanced Troubleshooting

### Debug Java Detection

```powershell
# Enable verbose output
.\scripts\detect-java.ps1 -Verbose

# Check all possible Java locations
Get-ChildItem "C:\Program Files\Java" -Recurse -Name "java.exe" 2>$null
Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Recurse -Name "java.exe" 2>$null
Get-ChildItem "C:\Program Files (x86)\Java" -Recurse -Name "java.exe" 2>$null
```

### Registry Check (Windows)

```cmd
# Check Java installations in registry
reg query "HKLM\SOFTWARE\JavaSoft\Java Runtime Environment"
reg query "HKLM\SOFTWARE\JavaSoft\JDK"
```

### Clean Installation

If all else fails, perform a clean Java installation:

1. Uninstall all Java versions
2. Clear JAVA_HOME environment variable
3. Download fresh Java 17 from [Adoptium](https://adoptium.net/)
4. Install with default settings
5. Run setup script: `.\scripts\setup-java.bat`