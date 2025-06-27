Write-Host "Deploying TurboFCL to Staging" -ForegroundColor Cyan

# Navigate to terraform directory
Set-Location infrastructure\terraform

# Initialize Terraform
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
terraform init

# Plan deployment
Write-Host "Planning staging deployment..." -ForegroundColor Yellow
terraform plan -var-file="terraform.tfvars.staging" -out=staging.tfplan

# Apply (with confirmation)
$confirm = Read-Host "Deploy to staging? (y/n)"
if ($confirm -eq 'y') {
    Write-Host "Deploying to staging..." -ForegroundColor Green
    terraform apply staging.tfplan
    Write-Host "Staging deployment complete!" -ForegroundColor Green
} else {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
}

Set-Location ..\..\..