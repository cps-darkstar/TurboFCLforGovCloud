# TurboFCL Cost Optimization Guide

## Current Estimated Monthly Costs (Production)

| Service | Configuration | Monthly Cost | Optimization Potential |
|---------|---------------|--------------|----------------------|
| **ECS Fargate** | 2 tasks, 1 vCPU, 2GB RAM | $200 | 30% with Spot instances |
| **RDS PostgreSQL** | db.r6g.large, Multi-AZ | $350 | 20% with Reserved Instances |
| **SageMaker GPT** | ml.g4dn.xlarge, 24/7 | $600 | 60% with auto-scaling |
| **SageMaker Embedding** | ml.m5.large, 24/7 | $150 | 50% with auto-scaling |
| **SageMaker NER** | ml.m5.large, 24/7 | $150 | 50% with auto-scaling |
| **ElastiCache Redis** | cache.r6g.large, Multi-AZ | $200 | 15% with Reserved Instances |
| **S3 Storage** | 100GB + requests | $50 | 30% with lifecycle policies |
| **Data Transfer** | ALB, NAT Gateway | $100 | 20% with optimization |
| **Other Services** | KMS, Secrets, CloudWatch | $100 | 10% with cleanup |

**Total Current: ~$1,900/month**
**Optimized Target: ~$1,200/month (37% savings)**

## Immediate Cost Optimizations

### 1. SageMaker Auto-Scaling (Highest Impact)
```yaml
# Add to your Terraform
resource "aws_application_autoscaling_target" "sagemaker_gpt" {
  max_capacity       = 3
  min_capacity       = 0  # Scale to zero during off-hours
  resource_id        = "endpoint/turbofcl-gpt-endpoint/variant/AllTraffic"
  scalable_dimension = "sagemaker:variant:DesiredInstanceCount"
  service_namespace  = "sagemaker"
}

resource "aws_application_autoscaling_policy" "sagemaker_gpt_policy" {
  name               = "turbofcl-gpt-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_application_autoscaling_target.sagemaker_gpt.resource_id
  scalable_dimension = aws_application_autoscaling_target.sagemaker_gpt.scalable_dimension
  service_namespace  = aws_application_autoscaling_target.sagemaker_gpt.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0
    predefined_metric_specification {
      predefined_metric_type = "SageMakerVariantInvocationsPerInstance"
    }
    scale_out_cooldown = 300
    scale_in_cooldown  = 300
  }
}
```

**Savings: $360/month (60% reduction on SageMaker)**

### 2. Scheduled Scaling for Non-Production
```python
# Lambda function to scale down during off-hours
import boto3
import json

def lambda_handler(event, context):
    sagemaker = boto3.client('sagemaker')
    
    # Scale down endpoints during off-hours (6 PM - 6 AM EST)
    endpoints = ['turbofcl-gpt-endpoint', 'turbofcl-embedding-endpoint', 'turbofcl-ner-endpoint']
    
    for endpoint in endpoints:
        try:
            sagemaker.update_endpoint_weights_and_capacities(
                EndpointName=endpoint,
                DesiredWeightsAndCapacities=[
                    {
                        'VariantName': 'AllTraffic',
                        'DesiredInstanceCount': 0 if event['action'] == 'scale_down' else 1
                    }
                ]
            )
        except Exception as e:
            print(f"Error scaling {endpoint}: {e}")
    
    return {'statusCode': 200, 'body': json.dumps('Scaling completed')}
```

### 3. S3 Lifecycle Policies
```yaml
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "transition_to_ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }
  }

  rule {
    id     = "delete_old_logs"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    expiration {
      days = 90
    }
  }
}
```

**Savings: $15/month (30% reduction on S3)**

### 4. Reserved Instances for Predictable Workloads
```bash
# Purchase 1-year Reserved Instances for RDS and ElastiCache
aws rds purchase-reserved-db-instances-offering \
  --reserved-db-instances-offering-id <offering-id> \
  --reserved-db-instance-id turbofcl-rds-reserved

aws elasticache purchase-reserved-cache-nodes-offering \
  --reserved-cache-nodes-offering-id <offering-id> \
  --reserved-cache-node-id turbofcl-redis-reserved
```

**Savings: $110/month (20% reduction on RDS + ElastiCache)**

## Advanced Optimizations

### 1. Spot Instances for ECS (Development/Staging)
```yaml
# Use Fargate Spot for non-production
capacity_providers = ["FARGATE", "FARGATE_SPOT"]

default_capacity_provider_strategy = [
  {
    capacity_provider = "FARGATE_SPOT"
    weight           = 4
    base             = 0
  },
  {
    capacity_provider = "FARGATE"
    weight           = 1
    base             = 1
  }
]
```

**Savings: $60/month (30% reduction on ECS)**

### 2. CloudWatch Log Retention Optimization
```yaml
resource "aws_cloudwatch_log_group" "ecs_logs" {
  name              = "/ecs/turbofcl"
  retention_in_days = 7  # Reduce from 30 days for non-production
  kms_key_id        = aws_kms_key.turbofcl.arn
}
```

### 3. NAT Gateway Optimization
```yaml
# Use single NAT Gateway for non-production
single_nat_gateway = var.environment != "production"
```

**Savings: $45/month (50% reduction on NAT Gateway)**

## Monitoring and Alerting for Cost Control

### 1. Cost Anomaly Detection
```yaml
resource "aws_ce_anomaly_detector" "turbofcl" {
  name         = "turbofcl-cost-anomaly"
  monitor_type = "DIMENSIONAL"

  specification {
    dimension_key           = "SERVICE"
    match_options          = ["EQUALS"]
    values                 = ["Amazon Elastic Container Service", "Amazon SageMaker"]
  }
}

resource "aws_ce_anomaly_subscription" "turbofcl" {
  name      = "turbofcl-cost-alerts"
  frequency = "DAILY"
  
  monitor_arn_list = [
    aws_ce_anomaly_detector.turbofcl.arn
  ]
  
  subscriber {
    type    = "EMAIL"
    address = var.alert_email
  }

  threshold_expression {
    and {
      dimension {
        key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
        values        = ["100"]
        match_options = ["GREATER_THAN_OR_EQUAL"]
      }
    }
  }
}
```

### 2. Budget Alerts
```yaml
resource "aws_budgets_budget" "turbofcl_monthly" {
  name         = "turbofcl-monthly-budget"
  budget_type  = "COST"
  limit_amount = "1500"
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

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
```

## Environment-Specific Configurations

### Development Environment
```yaml
# Minimal resources for development
rds_instance_class = "db.t3.micro"
redis_node_type = "cache.t3.micro"
ecs_cpu = 256
ecs_memory = 512
sagemaker_instance_type = "ml.t3.medium"  # CPU-only for basic testing
```

**Development Cost: ~$200/month (90% savings)**

### Staging Environment
```yaml
# Scaled-down production-like environment
rds_instance_class = "db.r6g.large"
redis_node_type = "cache.r6g.large"
ecs_cpu = 512
ecs_memory = 1024
# Use scheduled scaling for SageMaker endpoints
```

**Staging Cost: ~$600/month (68% savings)**

## Cost Optimization Checklist

### Weekly Tasks
- [ ] Review CloudWatch metrics for underutilized resources
- [ ] Check SageMaker endpoint utilization
- [ ] Monitor S3 storage growth and lifecycle transitions
- [ ] Review ECS task CPU/memory utilization

### Monthly Tasks
- [ ] Analyze AWS Cost Explorer reports
- [ ] Review Reserved Instance utilization
- [ ] Optimize CloudWatch log retention policies
- [ ] Clean up unused resources (old AMIs, snapshots, etc.)

### Quarterly Tasks
- [ ] Evaluate Reserved Instance renewals
- [ ] Review and optimize data transfer patterns
- [ ] Assess new AWS services for cost optimization
- [ ] Update auto-scaling policies based on usage patterns

## Implementation Priority

1. **High Impact, Low Effort** (Implement First)
   - SageMaker auto-scaling
   - S3 lifecycle policies
   - CloudWatch log retention optimization

2. **High Impact, Medium Effort**
   - Reserved Instances for RDS/ElastiCache
   - Scheduled scaling for non-production
   - Cost monitoring and alerting

3. **Medium Impact, High Effort**
   - Spot instances for ECS
   - Multi-environment optimization
   - Advanced monitoring dashboards

## Expected Results

After implementing all optimizations:
- **Production**: $1,900 → $1,200/month (37% savings)
- **Staging**: $1,200 → $600/month (50% savings)  
- **Development**: $600 → $200/month (67% savings)

**Total Annual Savings: $21,600**