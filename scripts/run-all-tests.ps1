# Comprehensive test runner for all Expo Go development fixes
# This script runs all validation tests and provides a summary

param(
    [switch]$SkipBuild = $false,
    [switch]$Verbose = $false,
    [switch]$ContinueOnFailure = $false
)

Write-Host "=== Running All Expo Go Development Fix Tests ===" -ForegroundColor Green
Write-Host "Testing all components of the development environment fixes..." -ForegroundColor Gray
Write-Host ""

$testResults = @()
$totalTestSuites = 0
$passedTestSuites = 0

# Function to run a test suite and track results
function Run-TestSuite {
    param(
        [string]$SuiteName,
        [string]$ScriptPath,
        [string[]]$Arguments = @()
    )
    
    $script:totalTestSuites++
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "Running Test Suite: $SuiteName" -ForegroundColor Yellow
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    try {
        if ($ScriptPath.EndsWith('.ps1')) {
            $result = & $ScriptPath @Arguments
            $exitCode = $LASTEXITCODE
        } else {
            $result = & node $ScriptPath
            $exitCode = $LASTEXITCODE
        }
        
        if ($exitCode -eq 0) {
            Write-Host "✅ ${SuiteName}: PASSED" -ForegroundColor Green
            $script:passedTestSuites++
            $script:testResults += @{
                Suite = $SuiteName
                Status = "PASSED"
                ExitCode = $exitCode
            }
        } else {
            Write-Host "❌ ${SuiteName}: FAILED (Exit Code: $exitCode)" -ForegroundColor Red
            $script:testResults += @{
                Suite = $SuiteName
                Status = "FAILED"
                ExitCode = $exitCode
            }
            
            if (-not $ContinueOnFailure) {
                Write-Host "Stopping tests due to failure. Use -ContinueOnFailure to run all tests." -ForegroundColor Yellow
                return $false
            }
        }
    } catch {
        Write-Host "❌ ${SuiteName}: ERROR - $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{
            Suite = $SuiteName
            Status = "ERROR"
            ExitCode = -1
        }
        
        if (-not $ContinueOnFailure) {
            Write-Host "Stopping tests due to error. Use -ContinueOnFailure to run all tests." -ForegroundColor Yellow
            return $false
        }
    }
    
    Write-Host ""
    return $true
}

# Test Suite 1: Expo Go Compatibility
$continue = Run-TestSuite -SuiteName "Expo Go Compatibility" -ScriptPath "$PSScriptRoot\test-expo-go-compatibility.js"
if (-not $continue) { exit 1 }

# Test Suite 2: Android Development Workflow
$androidArgs = @()
if ($SkipBuild) { $androidArgs += "-SkipBuild" }
if ($Verbose) { $androidArgs += "-Verbose" }

$continue = Run-TestSuite -SuiteName "Android Development Workflow" -ScriptPath "$PSScriptRoot\test-android-workflow.ps1" -Arguments $androidArgs
if (-not $continue) { exit 1 }

# Test Suite 3: Production Build Configuration
$continue = Run-TestSuite -SuiteName "Production Build Configuration" -ScriptPath "$PSScriptRoot\test-production-build.js"
if (-not $continue) { exit 1 }

# Test Suite 4: EAS and Local Build Compatibility
$continue = Run-TestSuite -SuiteName "EAS and Local Build Compatibility" -ScriptPath "$PSScriptRoot\test-eas-local-builds.js"
if (-not $continue) { exit 1 }

# Additional validation tests
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Running Additional Validation Tests" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan

# Test Suite 5: Environment Validation
$envArgs = @()
if ($Verbose) { $envArgs += "-Verbose" }

$continue = Run-TestSuite -SuiteName "Environment Validation" -ScriptPath "$PSScriptRoot\validate-environment.ps1" -Arguments $envArgs
if (-not $continue) { exit 1 }

# Test Suite 6: Java Detection
$javaArgs = @()
if ($Verbose) { $javaArgs += "-Verbose" }

$continue = Run-TestSuite -SuiteName "Java Detection" -ScriptPath "$PSScriptRoot\detect-java.ps1" -Arguments $javaArgs
if (-not $continue) { exit 1 }

# Summary Report
Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "TEST SUMMARY REPORT" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green
Write-Host ""

Write-Host "Overall Results: $passedTestSuites/$totalTestSuites test suites passed" -ForegroundColor Cyan
Write-Host ""

# Detailed results
Write-Host "Detailed Results:" -ForegroundColor Yellow
foreach ($result in $testResults) {
    $statusColor = switch ($result.Status) {
        "PASSED" { "Green" }
        "FAILED" { "Red" }
        "ERROR" { "Magenta" }
        default { "Gray" }
    }
    
    $statusIcon = switch ($result.Status) {
        "PASSED" { "✅" }
        "FAILED" { "❌" }
        "ERROR" { "💥" }
        default { "❓" }
    }
    
    Write-Host "  $statusIcon $($result.Suite): $($result.Status)" -ForegroundColor $statusColor
}

Write-Host ""

# Requirements validation summary
Write-Host "Requirements Validation:" -ForegroundColor Yellow

$requirements = @(
    @{ Name = "Java Development Environment Setup"; TestSuites = @("Java Detection", "Environment Validation", "Android Development Workflow") },
    @{ Name = "Push Notification Expo Go Compatibility"; TestSuites = @("Expo Go Compatibility", "Production Build Configuration") },
    @{ Name = "Android Configuration Optimization"; TestSuites = @("Production Build Configuration", "EAS and Local Build Compatibility") },
    @{ Name = "Development Workflow Optimization"; TestSuites = @("Android Development Workflow", "EAS and Local Build Compatibility") }
)

foreach ($req in $requirements) {
    $reqPassed = $true
    foreach ($suite in $req.TestSuites) {
        $suiteResult = $testResults | Where-Object { $_.Suite -eq $suite }
        if ($suiteResult -and $suiteResult.Status -ne "PASSED") {
            $reqPassed = $false
            break
        }
    }
    
    if ($reqPassed) {
        Write-Host "  ✅ $($req.Name)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($req.Name)" -ForegroundColor Red
    }
}

Write-Host ""

# Final assessment
if ($passedTestSuites -eq $totalTestSuites) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Your Expo Go development environment fixes are working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Java environment is properly configured" -ForegroundColor Green
    Write-Host "✅ Push notifications are properly gated for Expo Go" -ForegroundColor Green
    Write-Host "✅ Android development workflow is functional" -ForegroundColor Green
    Write-Host "✅ Production builds are properly configured" -ForegroundColor Green
    Write-Host "✅ EAS and local builds are compatible" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Cyan
    Write-Host "- Run 'npx expo start' for Expo Go development" -ForegroundColor Cyan
    Write-Host "- Run 'npx expo run:android' for local Android builds" -ForegroundColor Cyan
    Write-Host "- Run 'npx eas build' for EAS cloud builds" -ForegroundColor Cyan
    
    $exitCode = 0
} else {
    Write-Host "❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "Please review the failed test suites above and address the issues." -ForegroundColor Red
    Write-Host ""
    Write-Host "Common next steps:" -ForegroundColor Yellow
    Write-Host "- Fix Java environment: .\scripts\detect-java.ps1 -SetEnvironment" -ForegroundColor Yellow
    Write-Host "- Install missing dependencies: npm install" -ForegroundColor Yellow
    Write-Host "- Configure environment variables" -ForegroundColor Yellow
    Write-Host "- Review app.config.js settings" -ForegroundColor Yellow
    
    $exitCode = 1
}

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Green
Write-Host "TEST EXECUTION COMPLETE" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Green

exit $exitCode