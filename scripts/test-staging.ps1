Write-Host "Testing Staging Environment" -ForegroundColor Cyan

# Health checks
$tests = @()

# API Health
try {
    $response = Invoke-WebRequest -Uri "https://staging-alb-endpoint/api/health" -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ API Health: OK" -ForegroundColor Green
        $tests += "PASS"
    }
} catch {
    Write-Host "✗ API Health: FAIL" -ForegroundColor Red
    $tests += "FAIL"
}

# Database connectivity
try {
    $dbTest = aws rds describe-db-instances --query "DBInstances[?contains(DBInstanceIdentifier,'turbofcl-staging')].DBInstanceStatus" --output text
    if ($dbTest -eq "available") {
        Write-Host "✓ Database: OK" -ForegroundColor Green
        $tests += "PASS"
    }
} catch {
    Write-Host "✗ Database: FAIL" -ForegroundColor Red
    $tests += "FAIL"
}

# ECS Services
try {
    $services = aws ecs describe-services --cluster turbofcl-staging-cluster --services turbofcl-backend-service --query "services[0].runningCount" --output text
    if ($services -gt 0) {
        Write-Host "✓ ECS Services: OK ($services running)" -ForegroundColor Green
        $tests += "PASS"
    }
} catch {
    Write-Host "✗ ECS Services: FAIL" -ForegroundColor Red
    $tests += "FAIL"
}

$failed = ($tests | Where-Object { $_ -eq "FAIL" }).Count
if ($failed -eq 0) {
    Write-Host "✅ All staging tests passed" -ForegroundColor Green
} else {
    Write-Host "❌ $failed tests failed" -ForegroundColor Red
}