terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "s3" {
    bucket         = "turbofcl-terraform-state-gov"
    key            = "turbofcl/terraform.tfstate"
    region         = "us-gov-west-1"
    encrypt        = true
    dynamodb_table = "turbofcl-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "TurboFCL"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Compliance  = "FedRAMP-High"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# KMS key for encryption
resource "aws_kms_key" "turbofcl" {
  description             = "TurboFCL encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudWatch Logs"
        Effect = "Allow"
        Principal = {
          Service = "logs.${var.aws_region}.amazonaws.com"
        }
        Action = [
          "kms:Encrypt*",
          "kms:Decrypt*",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:Describe*"
        ]
        Resource = "*"
      }
    ]
  })
  
  tags = {
    Name = "${var.project_name}-kms-key"
  }
}

resource "aws_kms_alias" "turbofcl" {
  name          = "alias/${var.project_name}"
  target_key_id = aws_kms_key.turbofcl.key_id
}

# VPC Configuration
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.5.2"
  
  name                = var.project_name
  cidr                = var.vpc_cidr
  
  azs                 = data.aws_availability_zones.available.names
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  database_subnets    = var.database_subnets
  
  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "production"
  enable_vpn_gateway   = var.environment == "production"
  
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Security Groups
module "security_groups" {
  source = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"
  
  name        = "${var.project_name}-sg"
  description = "Security group for TurboFCL"
  vpc_id      = module.vpc.vpc_id
  
  # Ingress rules
  ingress_with_cidr_blocks = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      description = "HTTP"
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      description = "HTTPS"
      cidr_blocks = "0.0.0.0/0"
    }
  ]
  
  # Egress rules
  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      description = "All traffic"
      cidr_blocks = "0.0.0.0/0"
    }
  ]
  
  tags = {
    Name = "${var.project_name}-sg"
  }
}

# RDS PostgreSQL with pgvector
module "database" {
  source = "terraform-aws-modules/rds/aws"
  version = "6.1.0"
  
  identifier = "${var.project_name}-db"
  
  engine                     = "postgres"
  engine_version             = "15.3"
  family                     = "postgres15"
  major_engine_version       = "15"
  instance_class             = var.rds_instance_class
  
  allocated_storage          = var.rds_allocated_storage
  max_allocated_storage      = var.rds_max_allocated_storage
  
  db_name                    = "${var.project_name}db"
  username                   = "turbofcladmin"
  password                   = random_password.db_password.result
  port                       = "5432"
  
  vpc_security_group_ids     = [module.security_groups.security_group_id]
  db_subnet_group_name       = module.vpc.database_subnet_group
  
  backup_retention_period    = var.rds_backup_retention_period
  backup_window              = var.rds_backup_window
  maintenance_window         = var.rds_maintenance_window
  
  performance_insights_enabled = true
  storage_encrypted          = true
  kms_key_id                 = aws_kms_key.turbofcl.arn
  
  tags = {
    Name = "${var.project_name}-db"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "documents" {
  bucket = "${var.project_name}-documents-gov-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "${var.project_name}-documents"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.turbofcl.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  
  rule {
    id     = "transition-to-ia"
    status = "Enabled"
    
    filter {}
    
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket" "models" {
  bucket = "${var.project_name}-models-gov-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "${var.project_name}-models"
  }
}

resource "aws_s3_bucket_versioning" "models" {
  bucket = aws_s3_bucket.models.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "models" {
  bucket = aws_s3_bucket.models.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.turbofcl.arn
    }
  }
}

resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-logs-gov-${data.aws_caller_identity.current.account_id}"
  
  tags = {
    Name = "${var.project_name}-logs"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.turbofcl.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  
  rule {
    id     = "delete-old-logs"
    status = "Enabled"
    
    filter {}
    
    expiration {
      days = 365
    }
  }
}

# Cognito User Pool
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"
  
  # MFA configuration for GovCloud
  mfa_configuration = "ON"
  software_token_mfa_configuration {
    enabled = true
  }
  
  # Password policy (NIST 800-63B compliant)
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  # Custom attributes for FCL roles
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }
  
  schema {
    name                = "company_name"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 0
      max_length = 500
    }
  }
  
  schema {
    name                = "test_scenario"
    attribute_data_type = "String"
    mutable             = true
    required            = false
    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }
  
  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
    recovery_mechanism {
      name     = "verified_phone_number"
      priority = 2
    }
  }
  
  # Auto-verified attributes
  auto_verified_attributes = ["email"]
  
  # Username configuration
  username_attributes = ["email"]
  
  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
  
  # Verification message templates
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_message        = "Your verification code is {####}"
    email_subject        = "Your Verification Code"
  }
  
  # Admin create user config
  admin_create_user_config {
    allow_admin_create_user_only = false
    
    invite_message_template {
      email_message = "Your username is {username} and temporary password is {####}"
      email_subject = "Your temporary password"
      sms_message   = "Your username is {username} and temporary password is {####}"
    }
  }
  
  # Device configuration
  device_configuration {
    challenge_required_on_new_device      = false
    device_only_remembered_on_user_prompt = false
  }
  
  tags = {
    Name = "${var.project_name}-user-pool"
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-client"
  user_pool_id = aws_cognito_user_pool.main.id
  
  # Token validity
  access_token_validity  = 60  # minutes
  id_token_validity      = 60  # minutes
  refresh_token_validity = 30  # days
  
  # Token units
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
  
  # OAuth flows
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  
  # Callback URLs
  callback_urls = ["https://${module.alb.dns_name}/callback"]
  logout_urls   = ["https://${module.alb.dns_name}/logout"]
  
  # Supported identity providers
  supported_identity_providers = ["COGNITO"]
  
  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
  
  # Security
  prevent_user_existence_errors = "ENABLED"
  
  # Attributes
  read_attributes = [
    "email",
    "email_verified",
    "name",
    "custom:role",
    "custom:company_name"
  ]
  
  write_attributes = [
    "email",
    "name",
    "custom:role",
    "custom:company_name"
  ]
}

# Cognito User Pool Domain
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ECS Cluster
module "ecs_cluster" {
  source = "terraform-aws-modules/ecs/aws"
  version = "5.12.1"

  cluster_name = "${var.project_name}-${var.environment}"

  fargate_capacity_providers = {
    FARGATE = {
      default_capacity_provider_strategy = {
        weight = 50
      }
    }
    FARGATE_SPOT = {
      default_capacity_provider_strategy = {
        weight = 50
      }
    }
  }
}

# ALB for ECS services
module "alb" {
  source = "terraform-aws-modules/alb/aws"
  version = "9.4.0"
  
  name = "${var.project_name}-alb"
  
  load_balancer_type = "application"
  
  vpc_id                = module.vpc.vpc_id
  subnets               = module.vpc.public_subnets
  security_groups       = [module.security_groups.security_group_id]
  
  enable_deletion_protection = false
  enable_http2               = true
  
  # Access logs
  access_logs = {
    bucket = aws_s3_bucket.logs.id
  }
}

# ECS Task Definition for Backend
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-backend:latest"
    
    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]
    
    environment = [
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AWS_REGION", value = var.aws_region }
    ]
    
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_connection.arn },
      { name = "COGNITO_USER_POOL_ID", valueFrom = aws_ssm_parameter.cognito_user_pool_id.arn },
      { name = "SECRET_KEY", valueFrom = aws_secretsmanager_secret.app_secret_key.arn }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
  }])
}

# ECS Service for Backend
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend"
  cluster         = module.ecs_cluster.cluster_id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [module.security_groups.security_group_id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }
  
  health_check_grace_period_seconds = 60
  
  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

# ECS Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-frontend:latest"
    
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    
    environment = [
      { name = "REACT_APP_API_URL", value = "https://${module.alb.dns_name}/api" }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_logs.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
  }])
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend"
  cluster         = module.ecs_cluster.cluster_id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [module.security_groups.security_group_id]
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }
  
  health_check_grace_period_seconds = 30
  
  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.ecs_task_execution
  ]
}

# Target Groups for ALB
resource "aws_lb_target_group" "backend" {
  name     = "${var.project_name}-backend"
  port     = 8000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "frontend" {
  name     = "${var.project_name}-frontend"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200"
  }
}

# ALB HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = module.alb.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ALB HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = module.alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.certificate_arn
  
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}

# ALB Listener Rules
resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
  
  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "frontend" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200
  
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
  
  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

# IAM Roles for ECS
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-execution"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_task_execution_secrets" {
  name = "${var.project_name}-ecs-task-execution-secrets"
  role = aws_iam_role.ecs_task_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.app_secret_key.arn,
          aws_secretsmanager_secret.db_connection.arn,
          aws_secretsmanager_secret.sam_gov_api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/turbofcl/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${var.project_name}-ecs-task"
  role = aws_iam_role.ecs_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.documents.arn}/*",
          "${aws_s3_bucket.models.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = [
          "arn:${data.aws_partition.current.partition}:sagemaker:${var.aws_region}:${data.aws_caller_identity.current.account_id}:endpoint/turbofcl-*"
        ]
      }
    ]
  })
}

# Secrets for RDS connection
resource "aws_secretsmanager_secret" "db_connection" {
  name        = "${var.project_name}-db-connection"
  description = "Database connection string"
  kms_key_id  = aws_kms_key.turbofcl.id
}

resource "aws_secretsmanager_secret_version" "db_connection" {
  secret_id = aws_secretsmanager_secret.db_connection.id
  secret_string = jsonencode({
    connection_string = "postgresql://turbofcladmin:${random_password.db_password.result}@${module.database.db_instance_endpoint}/turbofcldb"
  })
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# SSM Parameter for Cognito User Pool ID
resource "aws_ssm_parameter" "cognito_user_pool_id" {
  name  = "/turbofcl/cognito/user_pool_id"
  type  = "String"
  value = aws_cognito_user_pool.main.id
}

# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "KMS"
    kms_key        = aws_kms_key.turbofcl.arn
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}-frontend"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  encryption_configuration {
    encryption_type = "KMS"
    kms_key        = aws_kms_key.turbofcl.arn
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secret_key" {
  name        = "${var.project_name}-secret-key"
  description = "Application secret key for JWT signing"
  kms_key_id  = aws_kms_key.turbofcl.id
}

resource "aws_secretsmanager_secret_version" "app_secret_key" {
  secret_id = aws_secretsmanager_secret.app_secret_key.id
  secret_string = jsonencode({
    secret_key = random_password.app_secret_key.result
  })
}

resource "random_password" "app_secret_key" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "sam_gov_api_key" {
  name        = "${var.project_name}-sam-gov-api"
  description = "SAM.gov API key"
  kms_key_id  = aws_kms_key.turbofcl.id
}

# SageMaker Endpoints (deployed separately)
resource "aws_ssm_parameter" "sagemaker_endpoints" {
  for_each = {
    gpt       = "turbofcl-gpt-endpoint"
    embedding = "turbofcl-embedding-endpoint"
    ner       = "turbofcl-ner-endpoint"
  }
  
  name  = "/turbofcl/sagemaker/${each.key}_endpoint"
  type  = "String"
  value = each.value
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/${var.project_name}/${var.environment}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.turbofcl.arn
}

# ElastiCache Redis for caching (optional)
resource "aws_elasticache_subnet_group" "redis" {
  count = var.enable_redis ? 1 : 0
  
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_elasticache_parameter_group" "redis" {
  count = var.enable_redis ? 1 : 0
  
  name   = "${var.project_name}-redis-params"
  family = "redis7"
}

resource "aws_elasticache_replication_group" "redis" {
  count = var.enable_redis ? 1 : 0
  
  replication_group_id       = "${var.project_name}-redis"
  description                = "Redis cache for TurboFCL"
  node_type                  = var.redis_node_type
  parameter_group_name       = aws_elasticache_parameter_group.redis[0].name
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis[0].name
  security_group_ids         = [module.security_groups.security_group_id]
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token[0].result
  kms_key_id                 = aws_kms_key.turbofcl.arn
  
  # High availability
  automatic_failover_enabled = var.environment == "production"
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  
  # Backup
  snapshot_retention_limit   = var.environment == "production" ? 7 : 1
  snapshot_window            = "03:00-05:00"
  
  tags = {
    Name = "${var.project_name}-redis"
  }
}

resource "random_password" "redis_auth_token" {
  count = var.enable_redis ? 1 : 0
  
  length  = 32
  special = true
  override_special = "!&#$^<>-"
}

resource "aws_secretsmanager_secret" "redis_auth_token" {
  count = var.enable_redis ? 1 : 0
  
  name        = "${var.project_name}-redis-auth-token"
  description = "Redis authentication token"
  kms_key_id  = aws_kms_key.turbofcl.id
}

resource "aws_secretsmanager_secret_version" "redis_auth_token" {
  count = var.enable_redis ? 1 : 0
  
  secret_id = aws_secretsmanager_secret.redis_auth_token[0].id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token[0].result
    endpoint   = aws_elasticache_replication_group.redis[0].configuration_endpoint_address
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "alb_healthy_hosts" {
  alarm_name          = "${var.project_name}-alb-healthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"
  alarm_description   = "This metric monitors ALB healthy host count"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = module.alb.arn_suffix
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.project_name}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = module.ecs_cluster.cluster_name
    ServiceName = "backend"
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.project_name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.database.db_instance_identifier
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name              = "${var.project_name}-alerts"
  kms_master_key_id = aws_kms_key.turbofcl.id
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Outputs
output "alb_endpoint" {
  description = "ALB endpoint URL"
  value       = module.alb.dns_name
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.database.db_instance_address
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "The ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.main.id
}

output "ecs_cluster_name" {
  description = "The name of the ECS cluster"
  value       = module.ecs_cluster.cluster_name
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnets
}

output "ecs_tasks_sg_id" {
  description = "The ID of the security group for ECS tasks"
  value       = module.security_groups.security_group_id
}

output "db_connection_secret_arn" {
  description = "ARN of the Secrets Manager secret for the DB connection string"
  value       = aws_secretsmanager_secret.db_connection.arn
} 