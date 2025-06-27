# Enhanced Security Controls

# GuardDuty
resource "aws_guardduty_detector" "main" {
  enable = true
  
  datasources {
    s3_logs {
      enable = true
    }
  }
  
  tags = var.tags
}

# Config Recorder
resource "aws_config_configuration_recorder" "main" {
  name     = "${var.project_name}-config"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported = true
  }
}

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
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws-us-gov:iam::aws:policy/service-role/ConfigRole"
}

# Security Hub
resource "aws_securityhub_account" "main" {}

# CloudTrail
resource "aws_cloudtrail" "main" {
  name           = "${var.project_name}-trail"
  s3_bucket_name = aws_s3_bucket.cloudtrail.bucket
  
  event_selector {
    read_write_type           = "All"
    include_management_events = true
  }
  
  tags = var.tags
}

resource "aws_s3_bucket" "cloudtrail" {
  bucket = "${var.project_name}-cloudtrail-${random_id.suffix.hex}"
  tags   = var.tags
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

resource "random_id" "suffix" {
  byte_length = 4
}