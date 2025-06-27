Write-Host "TurboFCL Production Deployment" -ForegroundColor Red
Write-Host "WARNING: This will deploy to production environment" -ForegroundColor Yellow

# Pre-deployment checks
Write-Host "Running pre-deployment validation..." -ForegroundColor Cyan
$validation = powershell -Command "if (Get-Command aws -ErrorAction SilentlyContinue) { 'OK' } else { 'FAIL' }"
if ($validation -ne 'OK') {
    Write-Host "Validation failed - AWS CLI not available" -ForegroundColor Red
    exit 1
}

# Confirm production deployment
$confirm1 = Read-Host "Are you sure you want to deploy to PRODUCTION? (yes/no)"
if ($confirm1 -ne 'yes') {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

$confirm2 = Read-Host "Have you tested in staging first? (yes/no)"
if ($confirm2 -ne 'yes') {
    Write-Host "Please test in staging first" -ForegroundColor Yellow
    exit 0
}

# Navigate to terraform
Set-Location infrastructure\terraform

# Initialize and plan
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
terraform init

Write-Host "Planning production deployment..." -ForegroundColor Yellow
terraform plan -var-file="terraform.tfvars.govcloud" -out=production.tfplan

# Final confirmation
$finalConfirm = Read-Host "Apply production deployment? (PRODUCTION/cancel)"
if ($finalConfirm -eq 'PRODUCTION') {
    Write-Host "Deploying to production..." -ForegroundColor Green
    terraform apply production.tfplan
    
    Write-Host "Production deployment complete!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify all services are healthy" -ForegroundColor White
    Write-Host "2. Run post-deployment tests" -ForegroundColor White
    Write-Host "3. Monitor CloudWatch dashboards" -ForegroundColor White
} else {
    Write-Host "Production deployment cancelled" -ForegroundColor Yellow
}

Set-Location ..\..\..