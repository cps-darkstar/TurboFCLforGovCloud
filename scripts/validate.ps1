param([switch]$PreDeployment)

Write-Host "TurboFCL Validation" -ForegroundColor Cyan
$results = @()

if ($PreDeployment) {
    # AWS Check
    if (Get-Command aws -ErrorAction SilentlyContinue) {
        Write-Host "✓ AWS CLI available" -ForegroundColor Green
        $results += "PASS"
    } else {
        Write-Host "✗ AWS CLI missing" -ForegroundColor Red
        $results += "FAIL"
    }
    
    # Files Check
    $files = @("infrastructure\terraform\main.tf", "infrastructure\terraform\variables.tf")
    foreach ($file in $files) {
        if (Test-Path $file) {
            Write-Host "✓ $file exists" -ForegroundColor Green
            $results += "PASS"
        } else {
            Write-Host "✗ $file missing" -ForegroundColor Red
            $results += "FAIL"
        }
    }
    
    # Docker Check
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "✓ Docker available" -ForegroundColor Green
        $results += "PASS"
    } else {
        Write-Host "✗ Docker missing" -ForegroundColor Red
        $results += "FAIL"
    }
}

$failed = ($results | Where-Object { $_ -eq "FAIL" }).Count
if ($failed -eq 0) {
    Write-Host "✅ Validation passed" -ForegroundColor Green
} else {
    Write-Host "❌ $failed issues found" -ForegroundColor Red
}