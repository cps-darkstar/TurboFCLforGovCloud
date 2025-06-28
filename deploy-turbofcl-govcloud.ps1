# TurboFCL GovCloud Deployment Script
# Deploys the complete TurboFCL application to AWS GovCloud West 1

param(
    [Parameter(Mandatory = $false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipInfrastructure,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipModels,
    
    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Configuration
$AWS_REGION = "us-gov-west-1"
$AWS_PROFILE = "govcloud"
$PROJECT_NAME = "turbofcl"
$STACK_NAME = "turbofcl-infrastructure"

# Colors for output
function Write-Success { Write-Host $args[0] -ForegroundColor Green }
function Write-Info { Write-Host $args[0] -ForegroundColor Cyan }
function Write-Warning { Write-Host $args[0] -ForegroundColor Yellow }
function Write-Error { Write-Host $args[0] -ForegroundColor Red }

Write-Info "========================================"
Write-Info "TurboFCL GovCloud Deployment"
Write-Info "Region: $AWS_REGION"
Write-Info "Environment: $Environment"
Write-Info "========================================"

# Step 1: Verify AWS credentials
Write-Info "`nStep 1: Verifying AWS credentials..."
try {
    $identity = aws sts get-caller-identity --profile $AWS_PROFILE --region $AWS_REGION | ConvertFrom-Json
    Write-Success "✓ Authenticated as: $($identity.Arn)"
    $AWS_ACCOUNT_ID = $identity.Account
}
catch {
    Write-Error "✗ Failed to authenticate with AWS. Please configure your GovCloud credentials."
    exit 1
}

# Step 2: Deploy infrastructure
if (-not $SkipInfrastructure) {
    Write-Info "`nStep 2: Deploying infrastructure with Terraform..."
    
    Push-Location infra
    try {
        # Initialize Terraform
        terraform init -backend-config="region=$AWS_REGION"
        
        # Plan changes
        terraform plan -var-file="terraform.tfvars.govcloud" -out=tfplan
        
        if ($Force -or (Read-Host "Apply infrastructure changes? (y/n)") -eq 'y') {
            terraform apply tfplan
            Write-Success "✓ Infrastructure deployed successfully"
        }
    }
    catch {
        Write-Error "✗ Infrastructure deployment failed: $_"
        Pop-Location
        exit 1
    }
    Pop-Location
}
else {
    Write-Warning "Skipping infrastructure deployment"
}

# Step 3: Build and push Docker images
Write-Info "`nStep 3: Building and pushing Docker images..."

# Backend image
Write-Info "Building backend image..."
Push-Location backend
try {
    $ECR_BACKEND = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-backend"
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | docker login --username AWS --password-stdin $ECR_BACKEND
    
    # Build and push
    docker build -t $PROJECT_NAME-backend:latest .
    docker tag $PROJECT_NAME-backend:latest ${ECR_BACKEND}:latest
    docker push ${ECR_BACKEND}:latest
    
    Write-Success "✓ Backend image pushed successfully"
}
catch {
    Write-Error "✗ Backend image build failed: $_"
    Pop-Location
    exit 1
}
Pop-Location

# Frontend image
Write-Info "Building frontend image..."
Push-Location frontend
try {
    $ECR_FRONTEND = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME-frontend"
    
    # Build frontend
    npm install
    npm run build
    
    # Build Docker image
    docker build -t $PROJECT_NAME-frontend:latest .
    docker tag $PROJECT_NAME-frontend:latest ${ECR_FRONTEND}:latest
    docker push ${ECR_FRONTEND}:latest
    
    Write-Success "✓ Frontend image pushed successfully"
}
catch {
    Write-Error "✗ Frontend image build failed: $_"
    Pop-Location
    exit 1
}
Pop-Location

# Step 4: Run database migrations
Write-Info "`nStep 4: Running database migrations..."
try {
    # Get necessary values from Terraform outputs
    Write-Info "Fetching network and database configuration..."
    $TfStatePath = "infra/terraform/terraform.tfstate"
    $ECS_CLUSTER_NAME = terraform output -state=$TfStatePath -raw ecs_cluster_name
    $PRIVATE_SUBNET_IDS_JSON = terraform output -state=$TfStatePath -raw private_subnet_ids
    $PRIVATE_SUBNET_IDS = $PRIVATE_SUBNET_IDS_JSON | ConvertFrom-Json
    $ECS_TASKS_SG_ID = terraform output -state=$TfStatePath -raw ecs_tasks_sg_id
    $DB_CONNECTION_SECRET_ARN = terraform output -state=$TfStatePath -raw db_connection_secret_arn

    if (-not $DB_CONNECTION_SECRET_ARN) {
        Write-Error "✗ Could not find Secrets Manager secret for DB connection. Please apply Terraform changes."
        exit 1
    }

    # Define the migration task definition
    $TASK_FAMILY = "${PROJECT_NAME}-migrations"
    $LogGroupName = "/ecs/${PROJECT_NAME}-migrations"
    $EXECUTION_ROLE_ARN = "arn:aws:iam::$AWS_ACCOUNT_ID:role/${PROJECT_NAME}-ecs-task-execution"
    
    # Ensure log group exists. Ignore errors if it already exists.
    aws logs create-log-group --log-group-name $LogGroupName --kms-key-id "alias/${PROJECT_NAME}" --profile $AWS_PROFILE --region $AWS_REGION 2>$null

    $TASK_DEFINITION_JSON = @"
{
    "family": "$TASK_FAMILY",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "$EXECUTION_ROLE_ARN",
    "containerDefinitions": [{
        "name": "migrations",
        "image": "${ECR_BACKEND}:latest",
        "command": ["alembic", "upgrade", "head"],
        "secrets": [
            { "name": "DATABASE_URL", "valueFrom": "${DB_CONNECTION_SECRET_ARN}:connection_string::" }
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "$LogGroupName",
                "awslogs-region": "$AWS_REGION",
                "awslogs-stream-prefix": "ecs-migrations"
            }
        }
    }]
}
"@
    
    Write-Info "Registering migration task definition..."
    $TASK_DEF_ARN = aws ecs register-task-definition --cli-input-json $TASK_DEFINITION_JSON --profile $AWS_PROFILE --region $AWS_REGION --query 'taskDefinition.taskDefinitionArn' --output text
    Write-Success "✓ Task definition registered: $TASK_DEF_ARN"

    # Run the migration task
    Write-Info "Running migration task on ECS Fargate..."
    $SubnetsString = '"' + ($PRIVATE_SUBNET_IDS -join '","') + '"'
    
    $runTaskResult = aws ecs run-task `
        --cluster $ECS_CLUSTER_NAME `
        --task-definition $TASK_DEF_ARN `
        --launch-type "FARGATE" `
        --network-configuration "awsvpcConfiguration={subnets=[$SubnetsString],securityGroups=[$ECS_TASKS_SG_ID],assignPublicIp=DISABLED}" `
        --profile $AWS_PROFILE `
        --region $AWS_REGION `
        --enable-ecs-managed-tags `
        --propagate-tags "TASK_DEFINITION" `
    | ConvertFrom-Json
        
    $taskArn = $runTaskResult.tasks[0].taskArn
    Write-Info "Migration task started: $taskArn"
    
    # Wait for the task to complete
    Write-Info "Waiting for migration task to complete..."
    aws ecs wait tasks-stopped --cluster $ECS_CLUSTER_NAME --tasks $taskArn --profile $AWS_PROFILE --region $AWS_REGION
    
    # Check if the task succeeded
    $taskResult = aws ecs describe-tasks --cluster $ECS_CLUSTER_NAME --tasks $taskArn --profile $AWS_PROFILE --region $AWS_REGION | ConvertFrom-Json
    $exitCode = $taskResult.tasks[0].containers[0].exitCode
    
    if ($exitCode -eq 0) {
        Write-Success "✓ Database migrations completed successfully"
    }
    else {
        $reason = $taskResult.tasks[0].stoppedReason
        Write-Error "✗ Database migration task failed with exit code: $exitCode. Reason: $reason. Check CloudWatch logs in group '$LogGroupName' for details."
        exit 1
    }

}
catch {
    Write-Error "✗ An error occurred during database migration: $_"
    exit 1
}

# Step 5: Deploy SageMaker models
if (-not $SkipModels) {
    Write-Info "`nStep 5: Deploying SageMaker models..."
    
    # Deploy models using Python script
    try {
        python scripts/deploy_sagemaker_models.py --region $AWS_REGION --profile $AWS_PROFILE
        Write-Success "✓ SageMaker models deployed"
    }
    catch {
        Write-Error "✗ SageMaker model deployment failed: $_"
    }
}
else {
    Write-Warning "Skipping SageMaker model deployment"
}

# Step 6: Update ECS services
Write-Info "`nStep 6: Updating ECS services..."
try {
    # Force new deployment
    aws ecs update-service `
        --cluster $PROJECT_NAME-cluster `
        --service $PROJECT_NAME-backend-service `
        --force-new-deployment `
        --profile $AWS_PROFILE `
        --region $AWS_REGION
    
    aws ecs update-service `
        --cluster $PROJECT_NAME-cluster `
        --service $PROJECT_NAME-frontend-service `
        --force-new-deployment `
        --profile $AWS_PROFILE `
        --region $AWS_REGION
    
    Write-Success "✓ ECS services updated"
}
catch {
    Write-Error "✗ ECS service update failed: $_"
    exit 1
}

# Step 7: Verify deployment
Write-Info "`nStep 7: Verifying deployment..."

# Get ALB endpoint
$ALB_ENDPOINT = terraform output -state=infra/terraform.tfstate -raw alb_endpoint

Write-Info "Waiting for services to become healthy..."
Start-Sleep -Seconds 30

# Check health endpoint
try {
    $response = Invoke-WebRequest -Uri "https://$ALB_ENDPOINT/api/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Success "✓ Backend health check passed"
    }
}
catch {
    Write-Warning "Backend health check failed (services may still be starting)"
}

# Output summary
Write-Info "`n========================================"
Write-Success "Deployment Complete!"
Write-Info "========================================"
Write-Info "Application URL: https://$ALB_ENDPOINT"
Write-Info "Backend API: https://$ALB_ENDPOINT/api"
Write-Info "Frontend: https://$ALB_ENDPOINT"
Write-Info ""
Write-Info "Next steps:"
Write-Info "1. Update Route 53 DNS records to point to the ALB"
Write-Info "2. Configure WAF rules for additional security"
Write-Info "3. Enable CloudFront distribution for better performance"
Write-Info "4. Set up monitoring alerts in CloudWatch"
Write-Info ""
Write-Warning "IMPORTANT: Update security group rules to restrict access!"

# Save deployment info
$deploymentInfo = @{
    Timestamp     = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Environment   = $Environment
    Region        = $AWS_REGION
    AccountId     = $AWS_ACCOUNT_ID
    ALBEndpoint   = $ALB_ENDPOINT
    BackendImage  = "${ECR_BACKEND}:latest"
    FrontendImage = "${ECR_FRONTEND}:latest"
}

$deploymentInfo | ConvertTo-Json | Out-File -FilePath "deployment-info.json"
Write-Info "Deployment information saved to deployment-info.json" 