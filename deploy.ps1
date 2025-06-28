# TurboFCL Deployment Script for AWS GovCloud
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment
)

Write-Host "Deploying TurboFCL to $Environment environment..." -ForegroundColor Green

# Set AWS region for GovCloud
$env:AWS_DEFAULT_REGION = "us-gov-west-1"

try {
    # Build frontend
    Write-Host "Building frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    npm run build
    Set-Location ..

    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    pip install -r requirements.txt
    Set-Location ..

    # Run database migrations
    Write-Host "Running database migrations..." -ForegroundColor Yellow
    # Add migration commands here when database is set up

    # Deploy infrastructure with Terraform
    Write-Host "Deploying infrastructure..." -ForegroundColor Yellow
    Set-Location infrastructure/terraform
    terraform init
    terraform plan -var-file="terraform.tfvars.$Environment"
    terraform apply -var-file="terraform.tfvars.$Environment" -auto-approve
    Set-Location ../..

    Write-Host "Deployment completed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Deployment failed: $_" -ForegroundColor Red
    exit 1
}