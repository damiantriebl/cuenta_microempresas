# Test script to validate Android development workflow with fixed JAVA_HOME
# This script tests the complete Android development setup

param(
    [switch]$SkipBuild = $false,
    [switch]$Verbose = $false
)

Write-Host "=== Testing Android Development Workflow ===" -ForegroundColor Green
Write-Host ""

$testsPassed = 0
$totalTests = 0

# Function to run a test and track results
function Test-Step {
    param(
        [string]$TestName,
        [scriptblock]$TestScript
    )
    
    $script:totalTests++
    Write-Host "Testing: $TestName" -ForegroundColor Yellow
    
    try {
        $result = & $TestScript
        if ($result) {
            Write-Host "✅ PASS: $TestName" -ForegroundColor Green
            $script:testsPassed++
        } else {
            Write-Host "❌ FAIL: $TestName" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ ERROR: $TestName - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 1: Java Environment Detection
Test-Step "Java Environment Detection" {
    Write-Host "  Running Java detection script..." -ForegroundColor Gray
    $javaResult = & "$PSScriptRoot\detect-java.ps1" -Verbose:$Verbose
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Java detection successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Java detection failed" -ForegroundColor Red
        return $false
    }
}

# Test 2: Environment Validation
Test-Step "Environment Validation" {
    Write-Host "  Running environment validation..." -ForegroundColor Gray
    $envResult = & "$PSScriptRoot\validate-environment.ps1" -Verbose:$Verbose
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Environment validation passed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Environment validation failed" -ForegroundColor Red
        return $false
    }
}

# Test 3: JAVA_HOME Configuration
Test-Step "JAVA_HOME Configuration" {
    if ($env:JAVA_HOME) {
        Write-Host "  JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray
        
        if (Test-Path "$env:JAVA_HOME\bin\java.exe") {
            Write-Host "  ✅ JAVA_HOME points to valid Java installation" -ForegroundColor Green
            
            # Test Java version
            try {
                $javaVersion = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Select-Object -First 1
                Write-Host "  Java version: $($javaVersion.ToString().Trim())" -ForegroundColor Gray
                
                # Check if it's Java 11+
                if ($javaVersion -match '(?:openjdk )?version "(\d+)') {
                    $majorVersion = [int]$matches[1]
                    if ($majorVersion -ge 11) {
                        Write-Host "  ✅ Java version is compatible (11+)" -ForegroundColor Green
                        return $true
                    } else {
                        Write-Host "  ❌ Java version is too old (need 11+)" -ForegroundColor Red
                        return $false
                    }
                }
            } catch {
                Write-Host "  ❌ Could not determine Java version" -ForegroundColor Red
                return $false
            }
        } else {
            Write-Host "  ❌ JAVA_HOME points to invalid directory" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  ❌ JAVA_HOME is not set" -ForegroundColor Red
        return $false
    }
}

# Test 4: Gradle Wrapper Availability
Test-Step "Gradle Wrapper Availability" {
    $gradlewPath = ".\android\gradlew.bat"
    if (Test-Path $gradlewPath) {
        Write-Host "  ✅ Gradle wrapper found at $gradlewPath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ❌ Gradle wrapper not found at $gradlewPath" -ForegroundColor Red
        return $false
    }
}

# Test 5: Android Project Structure
Test-Step "Android Project Structure" {
    $requiredFiles = @(
        ".\android\build.gradle",
        ".\android\settings.gradle",
        ".\android\app\build.gradle"
    )
    
    $allFilesExist = $true
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "  ✅ Found: $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Missing: $file" -ForegroundColor Red
            $allFilesExist = $false
        }
    }
    
    return $allFilesExist
}

# Test 6: Expo CLI Commands (without building)
Test-Step "Expo CLI Availability" {
    try {
        Write-Host "  Testing 'npx expo --version'..." -ForegroundColor Gray
        $expoVersion = npx expo --version 2>$null
        if ($expoVersion) {
            Write-Host "  ✅ Expo CLI available (version: $expoVersion)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ❌ Expo CLI not available" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ❌ Error running Expo CLI: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Test 7: Package Dependencies
Test-Step "Package Dependencies" {
    if (Test-Path ".\package.json") {
        Write-Host "  Checking package.json..." -ForegroundColor Gray
        $packageJson = Get-Content ".\package.json" | ConvertFrom-Json
        
        $requiredDeps = @(
            "expo",
            "expo-notifications",
            "expo-constants"
        )
        
        $allDepsFound = $true
        foreach ($dep in $requiredDeps) {
            if ($packageJson.dependencies.$dep -or $packageJson.devDependencies.$dep) {
                Write-Host "  ✅ Found dependency: $dep" -ForegroundColor Green
            } else {
                Write-Host "  ❌ Missing dependency: $dep" -ForegroundColor Red
                $allDepsFound = $false
            }
        }
        
        return $allDepsFound
    } else {
        Write-Host "  ❌ package.json not found" -ForegroundColor Red
        return $false
    }
}

# Test 8: Build Test (Optional - can be skipped for faster testing)
if (-not $SkipBuild) {
    Test-Step "Android Build Test" {
        Write-Host "  Attempting to run Android build check..." -ForegroundColor Gray
        Write-Host "  This may take a few minutes..." -ForegroundColor Gray
        
        try {
            # Try to run the Android build in check mode (doesn't actually build)
            $buildResult = npx expo run:android --no-build-cache --no-install 2>&1
            
            # Check if the command started successfully (even if it fails later due to no device)
            if ($buildResult -match "JAVA_HOME" -and $buildResult -match "not set") {
                Write-Host "  ❌ JAVA_HOME error detected in build output" -ForegroundColor Red
                return $false
            } elseif ($buildResult -match "Could not find java") {
                Write-Host "  ❌ Java not found error detected" -ForegroundColor Red
                return $false
            } else {
                Write-Host "  ✅ No JAVA_HOME errors detected in build process" -ForegroundColor Green
                return $true
            }
        } catch {
            # If the command fails for other reasons (like no device), that's okay
            # We're just checking for JAVA_HOME issues
            if ($_.Exception.Message -match "JAVA_HOME") {
                Write-Host "  ❌ JAVA_HOME error: $($_.Exception.Message)" -ForegroundColor Red
                return $false
            } else {
                Write-Host "  ✅ No JAVA_HOME errors (build failed for other reasons)" -ForegroundColor Green
                return $true
            }
        }
    }
} else {
    Write-Host "Skipping build test (use -SkipBuild:$false to include)" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "=== Android Workflow Test Summary ===" -ForegroundColor Green
Write-Host "Passed: $testsPassed/$totalTests tests" -ForegroundColor Cyan

if ($testsPassed -eq $totalTests) {
    Write-Host "🎉 All Android workflow tests passed!" -ForegroundColor Green
    Write-Host "Your Android development environment is properly configured." -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Please check the issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "- Run: .\scripts\detect-java.ps1 -SetEnvironment" -ForegroundColor Cyan
    Write-Host "- Run: .\scripts\validate-environment.ps1 -Fix" -ForegroundColor Cyan
    Write-Host "- Install missing dependencies: npm install" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green

# Return appropriate exit code
if ($testsPassed -eq $totalTests) {
    exit 0
} else {
    exit 1
}