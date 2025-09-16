# Environment Validation Script for Android Development
# Checks all prerequisites for Expo Android development

param(
    [switch]$Fix = $false,
    [switch]$Verbose = $false
)

Write-Host "=== Android Development Environment Validation ===" -ForegroundColor Green
Write-Host ""

$issues = @()
$warnings = @()

# Function to test command availability
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to test Java version compatibility
function Test-JavaCompatibility {
    try {
        $javaVersion = java -version 2>&1 | Out-String
        # Match modern Java versions (9+): "version "21.0.8"" or "openjdk version "21.0.8""
        if ($javaVersion -match '(?:openjdk )?version "(\d+)(?:\.(\d+))?(?:\.(\d+))?') {
            $majorVersion = [int]$matches[1]
            return $majorVersion -ge 11
        }
        # Match legacy Java versions (8 and below): "version "1.8.0_XXX""
        elseif ($javaVersion -match 'version "1\.(\d+)\.') {
            $version = [int]$matches[1]
            return $version -ge 11  # This will be false for Java 8, which is correct
        }
        return $false
    } catch {
        return $false
    }
}

Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

# 1. Check JAVA_HOME
Write-Host "1. Checking JAVA_HOME..." -NoNewline
if ($env:JAVA_HOME) {
    if (Test-Path "$env:JAVA_HOME\bin\java.exe") {
        Write-Host " ✅" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
        }
    } else {
        Write-Host " ❌" -ForegroundColor Red
        $issues += "JAVA_HOME is set but points to invalid directory: $env:JAVA_HOME"
    }
} else {
    Write-Host " ❌" -ForegroundColor Red
    $issues += "JAVA_HOME environment variable is not set"
}

# 2. Check Java availability and version
Write-Host "2. Checking Java installation..." -NoNewline
if (Test-Command "java") {
    if (Test-JavaCompatibility) {
        Write-Host " ✅" -ForegroundColor Green
        if ($Verbose) {
            $javaVersion = java -version 2>&1 | Select-Object -First 1
            Write-Host "   Version: $($javaVersion.ToString().Trim())" -ForegroundColor Gray
        }
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        $warnings += "Java version may be incompatible (Java 11+ recommended for Android development)"
    }
} else {
    Write-Host " ❌" -ForegroundColor Red
    $issues += "Java is not available in PATH"
}

# 3. Check Node.js
Write-Host "3. Checking Node.js..." -NoNewline
if (Test-Command "node") {
    Write-Host " ✅" -ForegroundColor Green
    if ($Verbose) {
        $nodeVersion = node --version
        Write-Host "   Version: $nodeVersion" -ForegroundColor Gray
    }
} else {
    Write-Host " ❌" -ForegroundColor Red
    $issues += "Node.js is not installed or not in PATH"
}

# 4. Check npm/yarn
Write-Host "4. Checking package manager..." -NoNewline
if (Test-Command "npm") {
    Write-Host " ✅ (npm)" -ForegroundColor Green
    if ($Verbose) {
        $npmVersion = npm --version
        Write-Host "   npm version: $npmVersion" -ForegroundColor Gray
    }
} elseif (Test-Command "yarn") {
    Write-Host " ✅ (yarn)" -ForegroundColor Green
    if ($Verbose) {
        $yarnVersion = yarn --version
        Write-Host "   yarn version: $yarnVersion" -ForegroundColor Gray
    }
} else {
    Write-Host " ❌" -ForegroundColor Red
    $issues += "No package manager (npm/yarn) found"
}

# 5. Check Expo CLI
Write-Host "5. Checking Expo CLI..." -NoNewline
if (Test-Command "npx") {
    try {
        $expoVersion = npx expo --version 2>$null
        if ($expoVersion) {
            Write-Host " ✅" -ForegroundColor Green
            if ($Verbose) {
                Write-Host "   Expo CLI version: $expoVersion" -ForegroundColor Gray
            }
        } else {
            Write-Host " ⚠️" -ForegroundColor Yellow
            $warnings += "Expo CLI not installed globally (will use npx)"
        }
    } catch {
        Write-Host " ⚠️" -ForegroundColor Yellow
        $warnings += "Could not verify Expo CLI installation"
    }
} else {
    Write-Host " ❌" -ForegroundColor Red
    $issues += "npx is not available (Node.js installation issue)"
}

# 6. Check Android SDK (optional but recommended)
Write-Host "6. Checking Android SDK..." -NoNewline
if ($env:ANDROID_HOME -or $env:ANDROID_SDK_ROOT) {
    $androidHome = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
    if (Test-Path "$androidHome\platform-tools\adb.exe") {
        Write-Host " ✅" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "   Android SDK: $androidHome" -ForegroundColor Gray
        }
    } else {
        Write-Host " ⚠️" -ForegroundColor Yellow
        $warnings += "Android SDK path is set but platform-tools not found"
    }
} else {
    Write-Host " ⚠️" -ForegroundColor Yellow
    $warnings += "Android SDK not configured (ANDROID_HOME/ANDROID_SDK_ROOT not set)"
}

Write-Host ""

# Display results
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "🎉 All checks passed! Your environment is ready for Android development." -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "❌ Issues found that need to be fixed:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "   • $issue" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "⚠️  Warnings (recommended to fix):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   • $warning" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    # Offer fixes
    if ($Fix -and $issues -contains "JAVA_HOME environment variable is not set") {
        Write-Host "Attempting to fix JAVA_HOME..." -ForegroundColor Yellow
        & "$PSScriptRoot\detect-java.ps1" -SetEnvironment
    } elseif ($issues.Count -gt 0) {
        Write-Host "To attempt automatic fixes, run:" -ForegroundColor Cyan
        Write-Host "  .\scripts\validate-environment.ps1 -Fix" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Or run the Java setup script:" -ForegroundColor Cyan
        Write-Host "  .\scripts\setup-java.bat" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "=== Validation Complete ===" -ForegroundColor Green

# Return exit code based on critical issues
if ($issues.Count -gt 0) {
    exit 1
} else {
    exit 0
}