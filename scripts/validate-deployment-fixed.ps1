# TurboFCL Deployment Validation Script - Fixed
param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    [Parameter(Mandatory=$false)]
    [switch]$PreDeployment
)

function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Info "TurboFCL Deployment Validation"
$validationResults = @()

if ($PreDeployment) {
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity | ConvertFrom-Json
        Write-Success "✓ AWS credentials valid"
        $validationResults += @{Check="AWS Credentials"; Status="PASS"}
    } catch {
        Write-Error "✗ AWS credentials invalid"
        $validationResults += @{Check="AWS Credentials"; Status="FAIL"}
    }
    
    # Check required files
    $requiredFiles = @(
        "infrastructure\terraform\main.tf",
        "infrastructure\terraform\variables.tf"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success "✓ Required file exists: $file"
            $validationResults += @{Check="File: $file"; Status="PASS"}
        } else {
            Write-Error "✗ Missing required file: $file"
            $validationResults += @{Check="File: $file"; Status="FAIL"}
        }
    }
    
    # Check Docker
    try {
        docker --version | Out-Null
        Write-Success "✓ Docker available"
        $validationResults += @{Check="Docker"; Status="PASS"}
    } catch {
        Write-Error "✗ Docker not available"
        $validationResults += @{Check="Docker"; Status="FAIL"}
    }
}

# Summary
$passCount = ($validationResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($validationResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Info "`nValidation Summary:"
Write-Success "Passed: $passCount"
Write-Error "Failed: $failCount"

if ($failCount -eq 0) {
    Write-Success "✅ Ready for next step"
    exit 0
} else {
    Write-Error "❌ Fix issues before proceeding"
    exit 1
}