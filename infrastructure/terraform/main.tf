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
  
  project_name = var.project_name
  vpc_id       = module.vpc.vpc_id
}

# RDS PostgreSQL with pgvector
module "database" {
  source = "terraform-aws-modules/rds/aws"
  version = "6.1.0"
  
  project_name               = var.project_name
  engine                     = "postgres"
  engine_version             = "15.3"
  family                     = "postgres15"
  major_engine_version       = "15"
  instance_class             = var.rds_instance_class
  
  allocated_storage          = var.rds_allocated_storage
  max_allocated_storage      = var.rds_max_allocated_storage
  
  db_name                    = "${var.project_name}db"
  db_username                = "turbofcladmin"
  
  vpc_id                     = module.vpc.vpc_id
  db_subnet_group_name       = module.vpc.database_subnet_group
  
  backup_retention_period    = var.rds_backup_retention_period
  backup_window              = var.rds_backup_window
  maintenance_window         = var.rds_maintenance_window
  
  performance_insights_enabled = true
  kms_key_id                 = aws_kms_key.turbofcl.arn
}

# S3 Buckets
module "s3_buckets" {
  source = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"
  
  project_name = var.project_name
  
  buckets = {
    documents = {
      bucket_name = "${var.project_name}-documents-gov"
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
      bucket_name = "${var.project_name}-models-gov"
      versioning = true
    }
    logs = {
      bucket_name = "${var.project_name}-logs-gov"
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
  
  kms_key_arn  = aws_kms_key.turbofcl.arn
}

# Cognito User Pool
module "cognito" {
  source = "terraform-aws-modules/cognito-user-pool/aws"
  version = "2.2.0"
  
  project_name = var.project_name
  
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
  schema_attributes = [
    {
      name                = "role"
      attribute_data_type = "String"
      mutable             = true
      required            = false
    },
    {
      name                = "company_name"
      attribute_data_type = "String"
      mutable             = true
      required            = false
    },
    {
      name                = "test_scenario"
      attribute_data_type = "String"
      mutable             = true
      required            = false
    }
  ]
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
  security_groups       = [module.security_groups.default_security_group_id]
  
  listeners = {
    ex-http-https-redirect = {
      port     = 80
      protocol = "HTTP"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    ex-https-fixed-response = {
      port            = 443
      protocol        = "HTTPS"
      certificate_arn = var.certificate_arn
      fixed_response = {
        content_type = "text/plain"
        message_body = "Fixed response"
        status_code  = "200"
      }
    }
  }
  
  # Access logs
  access_logs = {
    bucket = module.s3_buckets.s3_bucket_id["logs"]
  }
}

# ECS Services
module "backend_service" {
  source = "terraform-aws-modules/ecs/aws//modules/service"
  
  name = "backend"
  
  cluster_arn = module.ecs_cluster.cluster_arn
  
  launch_type = "FARGATE"
  
  network_configuration = {
    subnets          = module.vpc.private_subnets
    security_groups  = [module.security_groups.default_security_group_id]
    assign_public_ip = false
  }
  
  # Container configuration
  container_definitions = {
    backend = {
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-backend:latest"
      port_mappings = [{
        containerPort = 8000
        protocol      = "tcp"
      }]
      cpu    = 512
      memory = 1024
      
      environment = [
        { name = "ENVIRONMENT", value = var.environment },
        { name = "AWS_REGION", value = var.aws_region }
      ]
      
      secrets = [
        { name = "DATABASE_URL", valueFrom = module.database.db_instance_address },
        { name = "COGNITO_USER_POOL_ID", valueFrom = module.cognito.user_pool_id },
      ]
    }
  }
  
  # Auto-scaling
  autoscaling_min_capacity = var.environment == "production" ? 2 : 1
  autoscaling_max_capacity = var.environment == "production" ? 10 : 3
  
  # Health check
  health_check_grace_period_seconds = 60
}

module "frontend_service" {
  source = "terraform-aws-modules/ecs/aws//modules/service"
  
  name = "frontend"
  
  cluster_arn = module.ecs_cluster.cluster_arn
  
  launch_type = "FARGATE"
  
  network_configuration = {
    subnets          = module.vpc.private_subnets
    security_groups  = [module.security_groups.default_security_group_id]
    assign_public_ip = false
  }
  
  # Container configuration
  container_definitions = {
    frontend = {
      image = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}-frontend:latest"
      port_mappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]
      cpu    = 256
      memory = 512
      
      environment = [
        { name = "REACT_APP_API_URL", value = "https://${module.alb.dns_name}/api" },
      ]
    }
  }
  
  # Auto-scaling
  autoscaling_min_capacity = var.environment == "production" ? 2 : 1
  max_capacity       = var.environment == "production" ? 6 : 2
  
  # Health check
  health_check_grace_period_seconds = 30
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
module "redis" {
  count = var.enable_redis ? 1 : 0
  
  source = "terraform-aws-modules/elasticache/aws"
  version = "1.5.0"
  
  cluster_id           = "${var.project_name}-${var.environment}"
  engine               = "redis"
  family               = "redis7"
  
  vpc_id               = module.vpc.vpc_id
  subnets              = module.vpc.private_subnets
  security_group_ids   = [module.security_groups.default_security_group_id]
  
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  
  # Encryption at rest and in transit
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  kms_key_id                 = aws_kms_key.turbofcl.arn
}

# CloudWatch Alarms
module "monitoring" {
  source = "terraform-aws-modules/cloudwatch/aws"
  version = "4.2.0"

  project_name = var.project_name
  environment  = var.environment
  
  # ALB alarms
  alb_arn = module.alb.arn
  
  # ECS service alarms
  ecs_cluster_name = module.ecs_cluster.cluster_name
  ecs_service_name = module.backend_service.name
  
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
  value       = module.alb.load_balancer_dns_name
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.database.db_instance_address
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = module.cognito.user_pool_clients["default"].id
} 