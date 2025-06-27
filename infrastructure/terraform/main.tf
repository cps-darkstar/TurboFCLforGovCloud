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
data "aws_availability_zones" "available" {
  state = "available"
}

# KMS key for encryption
resource "aws_kms_key" "turbofcl" {
  description             = "TurboFCL encryption key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  
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
  source = "./modules/vpc"
  
  project_name         = var.project_name
  environment          = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = data.aws_availability_zones.available.names
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  database_subnets    = var.database_subnets
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"
  enable_vpn_gateway  = var.environment == "production"
  enable_flow_logs    = true
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Security Groups
module "security_groups" {
  source = "./modules/security"
  
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.vpc.vpc_id
  vpc_cidr     = var.vpc_cidr
}

# RDS PostgreSQL with pgvector
module "database" {
  source = "./modules/rds"
  
  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  database_subnets           = module.vpc.database_subnets
  security_group_id          = module.security_groups.rds_security_group_id
  instance_class             = var.rds_instance_class
  allocated_storage          = var.rds_allocated_storage
  max_allocated_storage      = var.rds_max_allocated_storage
  backup_retention_period    = var.rds_backup_retention_period
  backup_window              = var.rds_backup_window
  maintenance_window         = var.rds_maintenance_window
  enable_performance_insights = true
  kms_key_id                 = aws_kms_key.turbofcl.arn
  
  # Enable pgvector extension
  enable_pgvector = true
}

# S3 Buckets
module "s3_buckets" {
  source = "./modules/s3"
  
  project_name = var.project_name
  environment  = var.environment
  kms_key_arn  = aws_kms_key.turbofcl.arn
  
  buckets = {
    documents = {
      name = "${var.project_name}-documents-gov"
      versioning = true
      lifecycle_rules = [{
        id      = "archive-old-documents"
        enabled = true
        transition = {
          days          = 90
          storage_class = "GLACIER"
        }
      }]
    }
    models = {
      name = "${var.project_name}-models-gov"
      versioning = true
    }
    logs = {
      name = "${var.project_name}-logs-gov"
      versioning = false
      lifecycle_rules = [{
        id      = "delete-old-logs"
        enabled = true
        expiration = {
          days = 365
        }
      }]
    }
  }
}

# Cognito User Pool
module "cognito" {
  source = "./modules/cognito"
  
  project_name = var.project_name
  environment  = var.environment
  
  # MFA configuration for GovCloud
  mfa_configuration = "ON"
  
  # Password policy (NIST 800-63B compliant)
  password_policy = {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }
  
  # Custom attributes for FCL roles
  custom_attributes = {
    role = {
      type = "String"
      min_length = 1
      max_length = 50
    }
    company_name = {
      type = "String"
      min_length = 1
      max_length = 500
    }
    test_scenario = {
      type = "String"
      min_length = 0
      max_length = 200
    }
  }
}

# ECS Cluster
module "ecs_cluster" {
  source = "./modules/ecs"
  
  project_name = var.project_name
  environment  = var.environment
  
  # Enable Container Insights
  container_insights = true
  
  # Capacity providers
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  
  default_capacity_provider_strategy = [
    {
      capacity_provider = "FARGATE"
      weight           = 1
      base             = 1
    },
    {
      capacity_provider = "FARGATE_SPOT"
      weight           = 4
      base             = 0
    }
  ]
}

# ALB for ECS services
module "alb" {
  source = "./modules/alb"
  
  project_name          = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  public_subnets        = module.vpc.public_subnets
  security_group_id     = module.security_groups.alb_security_group_id
  certificate_arn       = var.certificate_arn
  enable_deletion_protection = var.environment == "production"
  
  # WAF configuration
  enable_waf = true
  waf_rules = [
    "AWSManagedRulesCommonRuleSet",
    "AWSManagedRulesKnownBadInputsRuleSet",
    "AWSManagedRulesSQLiRuleSet",
    "AWSManagedRulesLinuxRuleSet"
  ]
  
  # Access logs
  access_logs_bucket = module.s3_buckets.bucket_ids["logs"]
}

# ECS Services
module "backend_service" {
  source = "./modules/ecs-service"
  
  project_name         = var.project_name
  environment          = var.environment
  service_name         = "backend"
  cluster_id           = module.ecs_cluster.cluster_id
  vpc_id               = module.vpc.vpc_id
  private_subnets      = module.vpc.private_subnets
  security_group_id    = module.security_groups.ecs_security_group_id
  target_group_arn     = module.alb.backend_target_group_arn
  
  # Container configuration
  container_image      = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-backend:latest"
  container_port       = 8000
  cpu                  = 512
  memory               = 1024
  desired_count        = var.environment == "production" ? 3 : 1
  
  # Environment variables from SSM/Secrets Manager
  environment_variables = {
    ENVIRONMENT = var.environment
    AWS_REGION  = var.aws_region
    DATABASE_URL = "postgresql://${module.database.db_username}:${module.database.db_password}@${module.database.db_endpoint}/${module.database.db_name}"
    COGNITO_USER_POOL_ID = module.cognito.user_pool_id
    COGNITO_CLIENT_ID    = module.cognito.client_id
    S3_DOCUMENTS_BUCKET  = module.s3_buckets.bucket_ids["documents"]
    S3_MODELS_BUCKET     = module.s3_buckets.bucket_ids["models"]
    ENABLE_XRAY_TRACING  = "true"
  }
  
  # Secrets from Secrets Manager
  secrets = {
    SECRET_KEY = aws_secretsmanager_secret.app_secret_key.arn
    SAM_GOV_API_KEY = aws_secretsmanager_secret.sam_gov_api_key.arn
  }
  
  # Auto-scaling
  enable_autoscaling = true
  min_capacity       = var.environment == "production" ? 2 : 1
  max_capacity       = var.environment == "production" ? 10 : 3
  
  # Health check
  health_check_grace_period_seconds = 60
  health_check_path                 = "/api/health"
}

module "frontend_service" {
  source = "./modules/ecs-service"
  
  project_name         = var.project_name
  environment          = var.environment
  service_name         = "frontend"
  cluster_id           = module.ecs_cluster.cluster_id
  vpc_id               = module.vpc.vpc_id
  private_subnets      = module.vpc.private_subnets
  security_group_id    = module.security_groups.ecs_security_group_id
  target_group_arn     = module.alb.frontend_target_group_arn
  
  # Container configuration
  container_image      = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-frontend:latest"
  container_port       = 3000
  cpu                  = 256
  memory               = 512
  desired_count        = var.environment == "production" ? 2 : 1
  
  # Environment variables
  environment_variables = {
    REACT_APP_API_URL = "https://${module.alb.alb_dns_name}/api"
    REACT_APP_ENVIRONMENT = var.environment
  }
  
  # Auto-scaling
  enable_autoscaling = true
  min_capacity       = var.environment == "production" ? 2 : 1
  max_capacity       = var.environment == "production" ? 6 : 2
  
  # Health check
  health_check_grace_period_seconds = 30
  health_check_path                 = "/"
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
  name_prefix = "${var.project_name}-secret-key-"
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
  name_prefix = "${var.project_name}-sam-gov-api-"
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
  name              = "/ecs/${var.project_name}"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.turbofcl.arn
}

# ElastiCache Redis for caching (optional)
module "redis" {
  count = var.enable_redis ? 1 : 0
  
  source = "./modules/elasticache"
  
  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  private_subnets   = module.vpc.private_subnets
  security_group_id = module.security_groups.redis_security_group_id
  node_type         = var.redis_node_type
  num_cache_nodes   = var.redis_num_nodes
  
  # Encryption at rest and in transit
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  kms_key_id                 = aws_kms_key.turbofcl.arn
}

# CloudWatch Alarms
module "monitoring" {
  source = "./modules/monitoring"
  
  project_name = var.project_name
  environment  = var.environment
  
  # ALB alarms
  alb_arn_suffix = module.alb.alb_arn_suffix
  
  # ECS service alarms
  ecs_services = {
    backend = {
      cluster_name = module.ecs_cluster.cluster_name
      service_name = module.backend_service.service_name
    }
    frontend = {
      cluster_name = module.ecs_cluster.cluster_name
      service_name = module.frontend_service.service_name
    }
  }
  
  # RDS alarms
  db_instance_id = module.database.db_instance_id
  
  # SNS topic for alerts
  alarm_actions = [aws_sns_topic.alerts.arn]
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
  value       = "https://${module.alb.alb_dns_name}"
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.database.db_endpoint
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = module.cognito.client_id
} 