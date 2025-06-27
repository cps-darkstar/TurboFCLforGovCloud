# TurboFCL - AI-Powered Facility Clearance Application

## Overview

TurboFCL is an AI-powered web application that streamlines the DCSA Facility Clearance (FCL) application process. Built specifically for AWS GovCloud deployment, it features:

- **AI-Powered Validation**: Real-time error checking and FOCI assessment using machine learning
- **Automated Data Retrieval**: SAM.gov and EDGAR integration for seamless data population  
- **Smart Document Processing**: OCR and NLP extraction of key information from uploaded documents
- **Expert AI Guidance**: Chat with DCSA-trained AI for personalized FCL guidance
- **Secure Infrastructure**: FedRAMP-compliant AWS GovCloud deployment with end-to-end encryption

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   FastAPI       │    │   PostgreSQL    │
│   TypeScript    ├────┤   Python 3.11   ├────┤   + pgvector    │
│   Tailwind CSS  │    │   Async/Await   │    │   Vector DB     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │                       │
         └──────────────────────┴───────────────────────┘
                               │
                    ┌──────────────────┐
                    │   AWS GovCloud   │
                    │   us-gov-west-1  │
                    └──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SageMaker   │    │   S3 Buckets   │    │    Cognito      │
│   - GPT-NeoX  │    │   Documents     │    │    User Pool    │
│   - Embeddings│    │   Model Data    │    │    Auth/RBAC    │
│   - NER Model │    │   Audit Logs    │    │                 │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

1. **AWS GovCloud Account** with appropriate permissions
2. **AWS CLI** configured for GovCloud: `aws configure set region us-gov-west-1`
3. **Docker** installed and running
4. **Node.js 18+** and npm
5. **Python 3.11+** with pip
6. **Terraform 1.0+**

### Deployment Steps

#### 1. Clone and Setup

```bash
git clone https://github.com/yourorg/turbofcl.git
cd turbofcl

# Install dependencies
cd frontend && npm install && cd ..
cd backend && pip install -r requirements.txt && cd ..
```

#### 2. Configure Environment

Create `.env.govcloud` files:

**backend/.env.govcloud:**
```env
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/turbofcl
COGNITO_USER_POOL_ID=us-gov-west-1_xxxxxx
COGNITO_CLIENT_ID=xxxxxx
S3_DOCUMENTS_BUCKET=turbofcl-documents-gov
SAGEMAKER_GPT_ENDPOINT=turbofcl-gpt-endpoint
SAGEMAKER_EMBEDDING_ENDPOINT=turbofcl-embedding-endpoint
SAGEMAKER_NER_ENDPOINT=turbofcl-ner-endpoint
```

**frontend/.env.govcloud:**
```env
VITE_API_URL=https://your-alb-endpoint.us-gov-west-1.elb.amazonaws.com/api
VITE_COGNITO_USER_POOL_ID=us-gov-west-1_xxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxx
VITE_AWS_REGION=us-gov-west-1
```

#### 3. Deploy Infrastructure

```powershell
# Windows PowerShell
.\scripts\deploy-turbofcl-govcloud.ps1 -Environment production

# Linux/Mac
./scripts/deploy-turbofcl-govcloud.sh production
```

This will:
1. Deploy Terraform infrastructure (VPC, RDS, ECS, etc.)
2. Build and push Docker images to ECR
3. Run database migrations
4. Deploy SageMaker models
5. Update ECS services
6. Verify deployment

#### 4. Access Application

After deployment, you'll receive:
- **Application URL**: `https://your-alb-endpoint.us-gov-west-1.elb.amazonaws.com`
- **API Endpoint**: `https://your-alb-endpoint.us-gov-west-1.elb.amazonaws.com/api`

## Features

### 1. Company Information & SAM.gov Integration
- Automatic data retrieval from SAM.gov using UEI
- Real-time validation against government databases
- Entity structure verification

### 2. AI-Powered FOCI Assessment
- Intelligent FOCI detection and analysis
- Automated mitigation recommendations
- Compliance scoring

### 3. Document Processing
- Upload corporate documents (PDF, Word, etc.)
- AI-powered extraction of key information
- Automatic KMP identification using NER

### 4. AI Chat Assistant
- Context-aware responses based on DCSA guidelines
- Real-time help with application questions
- Citation of relevant regulations

### 5. Validation & Package Generation
- Comprehensive validation against DCSA requirements
- Automated generation of submission package
- Export to required government forms

## API Documentation

### Authentication
All API endpoints require JWT authentication via Cognito:
```
Authorization: Bearer <JWT_TOKEN>
```

### Key Endpoints

#### Create Application
```http
POST /api/applications
{
  "company_name": "Acme Corp",
  "uei": "ABC123DEF456",
  "entity_type": "llc",
  "foci_status": ["no-foci"]
}
```

#### Get SAM.gov Data
```http
GET /api/sam-data/{uei}
```

#### Chat with AI
```http
POST /api/chat
{
  "message": "What documents do I need for an LLC?"
}
```

#### Validate Application
```http
POST /api/applications/{id}/validate
```

## Security Considerations

### Network Security
- All traffic encrypted with TLS 1.2+
- WAF rules for application protection
- VPC with private subnets for backend services
- Security groups with least-privilege access

### Data Security
- Encryption at rest using AWS KMS
- Encryption in transit for all communications
- S3 bucket policies for document storage
- Database encryption with RDS encryption

### Authentication & Authorization
- AWS Cognito for user management
- Multi-factor authentication required
- Role-based access control (RBAC)
- Session management with Redis

### Compliance
- FedRAMP-compliant infrastructure
- NIST 800-171 controls implemented
- Audit logging to CloudTrail
- Data retention policies enforced

## Monitoring & Operations

### CloudWatch Dashboards
- Application performance metrics
- SageMaker model latency
- Database performance
- Error tracking

### Alerts
- ECS service health
- Database connection issues
- SageMaker endpoint failures
- High error rates

### Logs
- Application logs in CloudWatch
- Access logs for ALB
- Database query logs
- AI model inference logs

## Cost Optimization

### Estimated Monthly Costs (Production)
- **ECS Fargate**: ~$200 (2 tasks, 1 vCPU, 2GB RAM each)
- **RDS PostgreSQL**: ~$300 (db.r5.large with backups)
- **SageMaker**: ~$500 (ml.g4dn.xlarge for GPT, ml.m5.large for others)
- **S3 & Data Transfer**: ~$50
- **Other Services**: ~$100

**Total**: ~$1,150/month

### Cost Saving Tips
1. Use SageMaker auto-scaling to reduce idle capacity
2. Schedule non-production environments to shut down after hours
3. Use S3 lifecycle policies for document archival
4. Monitor and optimize database queries

## Troubleshooting

### Common Issues

#### 1. SageMaker Endpoint Timeout
```bash
# Check endpoint status
aws sagemaker describe-endpoint --endpoint-name turbofcl-gpt-endpoint

# View logs
aws logs tail /aws/sagemaker/Endpoints/turbofcl-gpt-endpoint
```

#### 2. Database Connection Issues
```bash
# Test connection
psql -h your-rds-endpoint -U turbofcl -d turbofcl

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

#### 3. ECS Service Not Starting
```bash
# View service events
aws ecs describe-services --cluster turbofcl-cluster --services turbofcl-backend-service

# Check task logs
aws logs tail /ecs/turbofcl
```

## Development

### Local Development Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements-dev.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

## Support

For issues or questions:
1. Check CloudWatch logs for detailed error messages
2. Review the troubleshooting section above
3. Contact the development team

## License

This project is proprietary and confidential. All rights reserved. 