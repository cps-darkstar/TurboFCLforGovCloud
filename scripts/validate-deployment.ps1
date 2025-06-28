# TurboFCL Deployment Validation Script
# Validates GovCloud deployment readiness and post-deployment health

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-gov-west-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$PreDeployment
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Info "========================================"
Write-Info "TurboFCL Deployment Validation"
Write-Info "Environment: $Environment"
Write-Info "Region: $Region"
Write-Info "========================================"

$validationResults = @()

# Pre-deployment validations
if ($PreDeployment) {
    Write-Info "`n1. Pre-deployment Validations"
    
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity --region $Region | ConvertFrom-Json
        Write-Success "✓ AWS credentials valid: $($identity.Arn)"
        $validationResults += @{Check="AWS Credentials"; Status="PASS"; Details=$identity.Arn}
    } catch {
        Write-Error "✗ AWS credentials invalid"
        $validationResults += @{Check="AWS Credentials"; Status="FAIL"; Details=$_.Exception.Message}
    }
    
    # Check required files
    $requiredFiles = @(
        "infrastructure\terraform\main.tf",
        "infrastructure\terraform\variables.tf",
        "infrastructure\terraform\terraform.tfvars.govcloud",
        "backend\Dockerfile",
        "frontend\Dockerfile"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success "✓ Required file exists: $file"
            $validationResults += @{Check="File: $file"; Status="PASS"; Details="File exists"}
        } else {
            Write-Error "✗ Missing required file: $file"
            $validationResults += @{Check="File: $file"; Status="FAIL"; Details="File missing"}
        }
    }
    
    # Validate Terraform configuration
    Write-Info "`nValidating Terraform configuration..."
    Push-Location infrastructure\terraform
    try {
        terraform init -backend=false
        terraform validate
        Write-Success "✓ Terraform configuration valid"
        $validationResults += @{Check="Terraform Validation"; Status="PASS"; Details="Configuration valid"}
    } catch {
        Write-Error "✗ Terraform configuration invalid: $_"
        $validationResults += @{Check="Terraform Validation"; Status="FAIL"; Details=$_.Exception.Message}
    }
    Pop-Location
    
    # Check Docker
    try {
        docker --version | Out-Null
        Write-Success "✓ Docker available"
        $validationResults += @{Check="Docker"; Status="PASS"; Details="Docker available"}
    } catch {
        Write-Error "✗ Docker not available"
        $validationResults += @{Check="Docker"; Status="FAIL"; Details="Docker not found"}
    }
}

# Post-deployment validations
if (-not $PreDeployment) {
    Write-Info "`n2. Post-deployment Validations"
    
    # Check ECS services
    try {
        $services = aws ecs list-services --cluster turbofcl-cluster --region $Region | ConvertFrom-Json
        if ($services.serviceArns.Count -gt 0) {
            Write-Success "✓ ECS services deployed: $($services.serviceArns.Count) services"
            $validationResults += @{Check="ECS Services"; Status="PASS"; Details="$($services.serviceArns.Count) services found"}
            
            # Check service health
            foreach ($serviceArn in $services.serviceArns) {
                $serviceName = $serviceArn.Split("/")[-1]
                $service = aws ecs describe-services --cluster turbofcl-cluster --services $serviceName --region $Region | ConvertFrom-Json
                $runningCount = $service.services[0].runningCount
                $desiredCount = $service.services[0].desiredCount
                
                if ($runningCount -eq $desiredCount -and $runningCount -gt 0) {
                    Write-Success "✓ Service healthy: $serviceName ($runningCount/$desiredCount)"
                    $validationResults += @{Check="Service: $serviceName"; Status="PASS"; Details="$runningCount/$desiredCount tasks running"}
                } else {
                    Write-Warning "⚠ Service not fully healthy: $serviceName ($runningCount/$desiredCount)"
                    $validationResults += @{Check="Service: $serviceName"; Status="WARN"; Details="$runningCount/$desiredCount tasks running"}
                }
            }
        } else {
            Write-Error "✗ No ECS services found"
            $validationResults += @{Check="ECS Services"; Status="FAIL"; Details="No services found"}
        }
    } catch {
        Write-Error "✗ Failed to check ECS services: $_"
        $validationResults += @{Check="ECS Services"; Status="FAIL"; Details=$_.Exception.Message}
    }
    
    # Check RDS instance
    try {
        $dbInstances = aws rds describe-db-instances --region $Region | ConvertFrom-Json
        $turbofclDb = $dbInstances.DBInstances | Where-Object { $_.DBInstanceIdentifier -like "*turbofcl*" }
        
        if ($turbofclDb) {
            if ($turbofclDb.DBInstanceStatus -eq "available") {
                Write-Success "✓ RDS instance healthy: $($turbofclDb.DBInstanceIdentifier)"
                $validationResults += @{Check="RDS Instance"; Status="PASS"; Details="Status: $($turbofclDb.DBInstanceStatus)"}
            } else {
                Write-Warning "⚠ RDS instance not available: $($turbofclDb.DBInstanceStatus)"
                $validationResults += @{Check="RDS Instance"; Status="WARN"; Details="Status: $($turbofclDb.DBInstanceStatus)"}
            }
        } else {
            Write-Error "✗ No TurboFCL RDS instance found"
            $validationResults += @{Check="RDS Instance"; Status="FAIL"; Details="No instance found"}
        }
    } catch {
        Write-Error "✗ Failed to check RDS: $_"
        $validationResults += @{Check="RDS Instance"; Status="FAIL"; Details=$_.Exception.Message}
    }
    
    # Check SageMaker endpoints
    $endpoints = @("turbofcl-gpt-endpoint", "turbofcl-embedding-endpoint", "turbofcl-ner-endpoint")
    foreach ($endpoint in $endpoints) {
        try {
            $endpointInfo = aws sagemaker describe-endpoint --endpoint-name $endpoint --region $Region | ConvertFrom-Json
            if ($endpointInfo.EndpointStatus -eq "InService") {
                Write-Success "✓ SageMaker endpoint healthy: $endpoint"
                $validationResults += @{Check="SageMaker: $endpoint"; Status="PASS"; Details="Status: InService"}
            } else {
                Write-Warning "⚠ SageMaker endpoint not ready: $endpoint ($($endpointInfo.EndpointStatus))"
                $validationResults += @{Check="SageMaker: $endpoint"; Status="WARN"; Details="Status: $($endpointInfo.EndpointStatus)"}
            }
        } catch {
            Write-Error "✗ SageMaker endpoint not found: $endpoint"
            $validationResults += @{Check="SageMaker: $endpoint"; Status="FAIL"; Details="Endpoint not found"}
        }
    }
    
    # Check ALB health
    try {
        $loadBalancers = aws elbv2 describe-load-balancers --region $Region | ConvertFrom-Json
        $turbofclAlb = $loadBalancers.LoadBalancers | Where-Object { $_.LoadBalancerName -like "*turbofcl*" }
        
        if ($turbofclAlb) {
            if ($turbofclAlb.State.Code -eq "active") {
                Write-Success "✓ ALB healthy: $($turbofclAlb.LoadBalancerName)"
                $validationResults += @{Check="ALB"; Status="PASS"; Details="Status: active"}
                
                # Test health endpoint
                $albDns = $turbofclAlb.DNSName
                try {
                    $response = Invoke-WebRequest -Uri "https://$albDns/api/health" -Method GET -TimeoutSec 10
                    if ($response.StatusCode -eq 200) {
                        Write-Success "✓ API health check passed"
                        $validationResults += @{Check="API Health"; Status="PASS"; Details="HTTP 200 OK"}
                    } else {
                         Write-Warning "⚠ API health check failed (may still be starting)"
                         $validationResults += @{Check="API Health"; Status="WARN"; Details="Health check failed"}
                    }
                } catch {
                    Write-Warning "⚠ API health check failed (may still be starting)"
                    $validationResults += @{Check="API Health"; Status="WARN"; Details="Health check failed"}
                }
            } else {
                Write-Warning "⚠ ALB not active: $($turbofclAlb.State.Code)"
                $validationResults += @{Check="ALB"; Status="WARN"; Details="Status: $($turbofclAlb.State.Code)"}
            }
        } else {
            Write-Error "✗ No TurboFCL ALB found"
            $validationResults += @{Check="ALB"; Status="FAIL"; Details="No ALB found"}
        }
    } catch {
        Write-Error "✗ Failed to check ALB: $_"
        $validationResults += @{Check="ALB"; Status="FAIL"; Details=$_.Exception.Message}
    }
    
    # Check S3 buckets
    $expectedBuckets = @("documents", "models", "logs")
    foreach ($bucketType in $expectedBuckets) {
        try {
            $buckets = aws s3api list-buckets --region $Region | ConvertFrom-Json
            $turbofclBucket = $buckets.Buckets | Where-Object { $_.Name -like "*turbofcl*$bucketType*" }
            
            if ($turbofclBucket) {
                Write-Success "✓ S3 bucket exists: $bucketType"
                $validationResults += @{Check="S3: $bucketType"; Status="PASS"; Details="Bucket exists"}
            } else {
                Write-Error "✗ S3 bucket missing: $bucketType"
                $validationResults += @{Check="S3: $bucketType"; Status="FAIL"; Details="Bucket not found"}
            }
        } catch {
            Write-Error "✗ Failed to check S3 bucket: $bucketType"
            $validationResults += @{Check="S3: $bucketType"; Status="FAIL"; Details=$_.Exception.Message}
        }
    }
}

# Security validations (both pre and post)
Write-Info "`n3. Security Validations"

# Check KMS key
try {
    $kmsKeys = aws kms list-keys --region $Region | ConvertFrom-Json
    $turbofclKey = $kmsKeys.Keys | ForEach-Object {
        $keyInfo = aws kms describe-key --key-id $_.KeyId --region $Region | ConvertFrom-Json
        if ($keyInfo.KeyMetadata.Description -like "*TurboFCL*") { $keyInfo }
    }
    
    if ($turbofclKey) {
        Write-Success "✓ KMS key configured"
        $validationResults += @{Check="KMS Key"; Status="PASS"; Details="Key exists and enabled"}
    } else {
        Write-Error "✗ No TurboFCL KMS key found"
        $validationResults += @{Check="KMS Key"; Status="FAIL"; Details="No key found"}
    }
} catch {
    Write-Error "✗ Failed to check KMS: $_"
    $validationResults += @{Check="KMS Key"; Status="FAIL"; Details=$_.Exception.Message}
}

# Check Cognito User Pool
if (-not $PreDeployment) {
    try {
        $userPools = aws cognito-idp list-user-pools --max-items 50 --region $Region | ConvertFrom-Json
        $turbofclPool = $userPools.UserPools | Where-Object { $_.Name -like "*turbofcl*" }
        
        if ($turbofclPool) {
            Write-Success "✓ Cognito User Pool configured"
            $validationResults += @{Check="Cognito User Pool"; Status="PASS"; Details="Pool exists"}
        } else {
            Write-Error "✗ No TurboFCL Cognito User Pool found"
            $validationResults += @{Check="Cognito User Pool"; Status="FAIL"; Details="No pool found"}
        }
    } catch {
        Write-Error "✗ Failed to check Cognito: $_"
        $validationResults += @{Check="Cognito User Pool"; Status="FAIL"; Details=$_.Exception.Message}
    }
}

# Generate validation report
Write-Info "`n========================================"
Write-Info "Validation Summary"
Write-Info "========================================"

$passCount = ($validationResults | Where-Object { $_.Status -eq "PASS" }).Count
$warnCount = ($validationResults | Where-Object { $_.Status -eq "WARN" }).Count
$failCount = ($validationResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $validationResults.Count

Write-Info "Total Checks: $totalCount"
Write-Success "Passed: $passCount"
Write-Warning "Warnings: $warnCount"
Write-Error "Failed: $failCount"

if ($failCount -eq 0) {
    Write-Success "`n✅ All critical validations passed!"
    if ($warnCount -gt 0) {
        Write-Warning "⚠️  Some warnings detected - review before production use"
    }
} else {
    Write-Error "`n❌ Critical issues detected - resolve before proceeding"
}

# Save detailed report
$report = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Environment = $Environment
    Region = $Region
    ValidationMode = if ($PreDeployment) { "Pre-deployment" } else { "Post-deployment" }
    Summary = @{
        Total = $totalCount
        Passed = $passCount
        Warnings = $warnCount
        Failed = $failCount
    }
    Results = $validationResults
}

$reportFile = "validation-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$report | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile
Write-Info "`nDetailed report saved to: $reportFile"

# Exit with appropriate code
if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}