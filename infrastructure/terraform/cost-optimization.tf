# Cost Optimization Resources

# SageMaker Auto Scaling
resource "aws_application_autoscaling_target" "sagemaker_gpt" {
  count = var.environment == "production" ? 1 : 0
  
  max_capacity       = 3
  min_capacity       = 0
  resource_id        = "endpoint/turbofcl-gpt-endpoint/variant/AllTraffic"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
  
  depends_on = [aws_sagemaker_endpoint.gpt]
}

# S3 Lifecycle Policy
resource "aws_s3_bucket_lifecycle_configuration" "documents_lifecycle" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "cost_optimization"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years retention
    }
  }
}

# Budget Alert
resource "aws_budgets_budget" "monthly_budget" {
  name         = "${var.project_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = var.environment == "production" ? "1500" : "300"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filters {
    tag {
      key    = "Project"
      values = ["TurboFCL"]
    }
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}