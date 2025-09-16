# Java Detection and JAVA_HOME Setup Script for Windows
# This script detects Java installations and sets up JAVA_HOME for Android development

param(
    [switch]$SetEnvironment = $false,
    [switch]$Verbose = $false
)

Write-Host "=== Java Environment Detection Script ===" -ForegroundColor Green

# Function to check Java version
function Test-JavaVersion {
    param([string]$JavaPath)
    
    try {
        $versionOutput = & "$JavaPath" -version 2>&1 | Out-String
        # Match modern Java versions (9+): "version "21.0.8"" or "openjdk version "21.0.8""
        if ($versionOutput -match '(?:openjdk )?version "(\d+)(?:\.(\d+))?(?:\.(\d+))?') {
            $majorVersion = [int]$matches[1]
            return $majorVersion -ge 11
        }
        # Match legacy Java versions (8 and below): "version "1.8.0_XXX""
        elseif ($versionOutput -match 'version "1\.(\d+)\.') {
            $version = [int]$matches[1]
            return $version -ge 11  # This will be false for Java 8, which is correct
        }
        return $false
    } catch {
        return $false
    }
}

# Function to get Java home from executable path
function Get-JavaHomeFromPath {
    param([string]$JavaExePath)
    
    $javaDir = Split-Path -Parent $JavaExePath
    if ($javaDir -match '\\bin$') {
        return Split-Path -Parent $javaDir
    }
    return $null
}

# Common Java installation paths
$javaPaths = @(
    "${env:JAVA_HOME}\bin\java.exe",
    "${env:ProgramFiles}\Java\*\bin\java.exe",
    "${env:ProgramFiles(x86)}\Java\*\bin\java.exe",
    "${env:LOCALAPPDATA}\Programs\Java\*\bin\java.exe",
    "${env:ProgramFiles}\Eclipse Adoptium\*\bin\java.exe",
    "${env:ProgramFiles}\OpenJDK\*\bin\java.exe",
    "${env:ProgramFiles}\Amazon Corretto\*\bin\java.exe",
    "${env:ProgramFiles}\Microsoft\*\bin\java.exe"
)

Write-Host "Searching for Java installations..." -ForegroundColor Yellow

$foundJavaInstalls = @()

# Check each path
foreach ($path in $javaPaths) {
    if ($path -like '*\*\*') {
        # Handle wildcard paths
        $basePath = $path -replace '\\\*\\.*', ''
        if (Test-Path $basePath) {
            $expandedPaths = Get-ChildItem -Path $basePath -Directory | ForEach-Object {
                $testPath = $path -replace '\*', $_.Name
                if (Test-Path $testPath) { $testPath }
            } | Where-Object { $_ -ne $null }
            foreach ($expandedPath in $expandedPaths) {
                if (Test-Path $expandedPath) {
                    $javaHome = Get-JavaHomeFromPath $expandedPath
                    if ($javaHome -and (Test-JavaVersion $expandedPath)) {
                        # Check if we already have this installation
                        $alreadyFound = $foundJavaInstalls | Where-Object { $_.Home -eq $javaHome }
                        if (-not $alreadyFound) {
                            $versionLine = & "$expandedPath" -version 2>&1 | Select-Object -First 1
                            $foundJavaInstalls += @{
                                Path = $expandedPath
                                Home = $javaHome
                                Version = $versionLine.ToString()
                            }
                        }
                    }
                }
            }
        }
    } else {
        # Handle direct paths
        if (Test-Path $path) {
            $javaHome = Get-JavaHomeFromPath $path
            if ($javaHome -and (Test-JavaVersion $path)) {
                # Check if we already have this installation
                $alreadyFound = $foundJavaInstalls | Where-Object { $_.Home -eq $javaHome }
                if (-not $alreadyFound) {
                    $versionLine = & "$path" -version 2>&1 | Select-Object -First 1
                    $foundJavaInstalls += @{
                        Path = $path
                        Home = $javaHome
                        Version = $versionLine.ToString()
                    }
                }
            }
        }
    }
}

# Display results
if ($foundJavaInstalls.Count -eq 0) {
    Write-Host "❌ No compatible Java installations found (Java 11+ required)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Java 11 or higher from one of these sources:" -ForegroundColor Yellow
    Write-Host "- Eclipse Temurin: https://adoptium.net/"
    Write-Host "- Oracle JDK: https://www.oracle.com/java/technologies/downloads/"
    Write-Host "- Amazon Corretto: https://aws.amazon.com/corretto/"
    Write-Host "- Microsoft OpenJDK: https://www.microsoft.com/openjdk"
    exit 1
} else {
    Write-Host "✅ Found $($foundJavaInstalls.Count) compatible Java installation(s):" -ForegroundColor Green
    
    for ($i = 0; $i -lt $foundJavaInstalls.Count; $i++) {
        $install = $foundJavaInstalls[$i]
        Write-Host "  [$($i + 1)] $($install.Version.Trim())" -ForegroundColor Cyan
        Write-Host "      Path: $($install.Home)" -ForegroundColor Gray
        if ($Verbose) {
            Write-Host "      Executable: $($install.Path)" -ForegroundColor Gray
        }
    }
    
    # Use the first (most recent) installation
    $selectedJava = $foundJavaInstalls[0]
    
    Write-Host ""
    Write-Host "Selected Java installation: $($selectedJava.Home)" -ForegroundColor Green
    
    # Check current JAVA_HOME
    $currentJavaHome = $env:JAVA_HOME
    if ($currentJavaHome -eq $selectedJava.Home) {
        Write-Host "✅ JAVA_HOME is already correctly set" -ForegroundColor Green
    } else {
        Write-Host "⚠️  JAVA_HOME needs to be updated" -ForegroundColor Yellow
        Write-Host "   Current: $currentJavaHome" -ForegroundColor Gray
        Write-Host "   Should be: $($selectedJava.Home)" -ForegroundColor Gray
        
        if ($SetEnvironment) {
            Write-Host "Setting JAVA_HOME environment variable..." -ForegroundColor Yellow
            [Environment]::SetEnvironmentVariable("JAVA_HOME", $selectedJava.Home, "User")
            $env:JAVA_HOME = $selectedJava.Home
            Write-Host "✅ JAVA_HOME set successfully" -ForegroundColor Green
            Write-Host "⚠️  Please restart your terminal/IDE for changes to take effect" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "To set JAVA_HOME automatically, run:" -ForegroundColor Yellow
            Write-Host "  .\scripts\detect-java.ps1 -SetEnvironment" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "Or set it manually:" -ForegroundColor Yellow
            Write-Host "  setx JAVA_HOME `"$($selectedJava.Home)`"" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "=== Java Detection Complete ===" -ForegroundColor Green