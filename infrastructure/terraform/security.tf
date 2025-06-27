# Enhanced Security Configuration for GovCloud
# Additional security controls beyond the main configuration

# GuardDuty for threat detection
resource "aws_guardduty_detector" "turbofcl" {
  enable = true
  
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
  
  tags = var.tags
}

# Config for compliance monitoring
resource "aws_config_configuration_recorder" "turbofcl" {
  name     = "${var.project_name}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_config_delivery_channel" "turbofcl" {
  name           = "${var.project_name}-config-delivery"
  s3_bucket_name = aws_s3_bucket.config.bucket
}

# Config rules for compliance
resource "aws_config_config_rule" "s3_bucket_ssl_requests_only" {
  name = "s3-bucket-ssl-requests-only"

  source {
    owner             = "AWS"
    source_identifier = "S3_BUCKET_SSL_REQUESTS_ONLY"
  }

  depends_on = [aws_config_configuration_recorder.turbofcl]
}

resource "aws_config_config_rule" "encrypted_volumes" {
  name = "encrypted-volumes"

  source {
    owner             = "AWS"
    source_identifier = "ENCRYPTED_VOLUMES"
  }

  depends_on = [aws_config_configuration_recorder.turbofcl]
}

# Security Hub for centralized security findings
resource "aws_securityhub_account" "turbofcl" {}

# Enable AWS Foundational Security Standard
resource "aws_securityhub_standards_subscription" "aws_foundational" {
  standards_arn = "arn:aws-us-gov:securityhub:${var.aws_region}::standard/aws-foundational-security/v/1.0.0"
  depends_on    = [aws_securityhub_account.turbofcl]
}

# CloudTrail for audit logging
resource "aws_cloudtrail" "turbofcl" {
  name                          = "${var.project_name}-cloudtrail"
  s3_bucket_name               = aws_s3_bucket.cloudtrail.bucket
  s3_key_prefix                = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail        = true
  enable_logging               = true
  
  kms_key_id = aws_kms_key.turbofcl.arn

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.documents.arn}/*"]
    }
  }

  tags = var.tags
}

# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket        = "${var.project_name}-cloudtrail-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = var.tags
}

resource "aws_s3_bucket_encryption" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.turbofcl.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 bucket for Config
resource "aws_s3_bucket" "config" {
  bucket        = "${var.project_name}-config-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = var.tags
}

resource "aws_s3_bucket_encryption" "config" {
  bucket = aws_s3_bucket.config.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.turbofcl.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# IAM role for Config
resource "aws_iam_role" "config" {
  name = "${var.project_name}-config-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/ConfigRole"
}

# Random ID for unique bucket names
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Enhanced WAF rules
resource "aws_wafv2_web_acl" "turbofcl_enhanced" {
  name  = "${var.project_name}-enhanced-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-enhanced-waf"
    sampled_requests_enabled   = true
  }

  # Rate limiting per IP
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Geo-blocking (restrict to US only for GovCloud)
  rule {
    name     = "GeoBlockRule"
    priority = 2

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["CN", "RU", "IR", "KP"]  # Block specific countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  tags = var.tags
}

# VPC Flow Logs
resource "aws_flow_log" "turbofcl_vpc" {
  iam_role_arn    = aws_iam_role.flow_log.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
  traffic_type    = "ALL"
  vpc_id          = module.vpc.vpc_id
}

resource "aws_cloudwatch_log_group" "vpc_flow_log" {
  name              = "/aws/vpc/flowlogs"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.turbofcl.arn

  tags = var.tags
}

resource "aws_iam_role" "flow_log" {
  name = "${var.project_name}-flow-log-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_log" {
  name = "${var.project_name}-flow-log-policy"
  role = aws_iam_role.flow_log.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}