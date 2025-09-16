@echo off
REM JAVA_HOME Setup Script for Windows
REM This script helps set up JAVA_HOME for Android development

echo === Java Environment Setup ===
echo.

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell is required but not available
    echo Please install PowerShell or use manual setup
    goto :manual_setup
)

echo Detecting Java installations...
echo.

REM Run the PowerShell detection script
powershell -ExecutionPolicy Bypass -File "%~dp0detect-java.ps1" -Verbose

if %errorlevel% neq 0 (
    echo.
    echo Java detection failed. Please install Java 11+ and try again.
    goto :manual_setup
)

echo.
echo Would you like to automatically set JAVA_HOME? (y/n)
set /p choice="> "

if /i "%choice%"=="y" (
    echo Setting JAVA_HOME...
    powershell -ExecutionPolicy Bypass -File "%~dp0detect-java.ps1" -SetEnvironment
    echo.
    echo JAVA_HOME has been set. Please restart your terminal/IDE.
    echo You can now run: npx expo run:android
) else (
    echo.
    echo To set JAVA_HOME manually, use the path shown above with:
    echo   setx JAVA_HOME "C:\Path\To\Your\Java"
)

goto :end

:manual_setup
echo.
echo === Manual Java Setup ===
echo.
echo 1. Install Java 11 or higher from:
echo    - Eclipse Temurin: https://adoptium.net/
echo    - Oracle JDK: https://www.oracle.com/java/technologies/downloads/
echo    - Amazon Corretto: https://aws.amazon.com/corretto/
echo.
echo 2. Find your Java installation directory (usually in):
echo    - C:\Program Files\Java\jdk-XX
echo    - C:\Program Files\Eclipse Adoptium\jdk-XX
echo.
echo 3. Set JAVA_HOME environment variable:
echo    setx JAVA_HOME "C:\Path\To\Your\Java"
echo.
echo 4. Restart your terminal/IDE
echo.
echo 5. Verify with: java -version

:end
echo.
echo === Setup Complete ===
pause