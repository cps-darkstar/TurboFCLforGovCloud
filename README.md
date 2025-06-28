# TurboFCL - AI-Powered Facility Clearance Application

TurboFCL is an AI-powered web application that streamlines the DCSA Facility Clearance (FCL) application process. Built specifically for AWS GovCloud deployment with FedRAMP compliance.

## Features

- **AI-Powered Validation**: Real-time error checking and FOCI assessment using machine learning
- **Automated Data Retrieval**: SAM.gov and EDGAR integration for seamless data population  
- **Smart Document Processing**: OCR and NLP extraction of key information from uploaded documents
- **Expert AI Guidance**: Chat with DCSA-trained AI for personalized FCL guidance
- **Secure Infrastructure**: FedRAMP-compliant AWS GovCloud deployment with end-to-end encryption

## Quick Start

### Prerequisites

1. **AWS GovCloud Account** with appropriate permissions
2. **AWS CLI** configured for GovCloud: `aws configure set region us-gov-west-1`
3. **Docker** installed and running
4. **Node.js 18+** and npm
5. **Python 3.11+** with pip
6. **Terraform 1.0+**

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourorg/turbofcl.git
   cd turbofcl
   ```

2. **Start the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Deployment

Deploy to AWS GovCloud using the provided script:

```powershell
# Windows PowerShell
.\deploy.ps1 -Environment production
```

## Architecture

- **Frontend**: React 18 with TypeScript, Tailwind CSS
- **Backend**: FastAPI with Python 3.11, async/await
- **Database**: PostgreSQL with pgvector for AI embeddings
- **AI/ML**: AWS SageMaker with GPT-NeoX, embeddings, and NER models
- **Authentication**: AWS Cognito with MFA
- **Storage**: S3 with KMS encryption
- **Infrastructure**: Terraform for IaC

## Test Accounts

For development and testing:

- **FSO (No FOCI)**: `fso-test-nofoci@turbofcl.test` / `TestPassword123!`
- **FSO (With FOCI)**: `fso-test-foci@turbofcl.test` / `TestPassword123!`

## Security

- FedRAMP-compliant infrastructure
- End-to-end encryption with TLS 1.2+
- AWS KMS for data encryption at rest
- WAF protection and DDoS mitigation
- Multi-factor authentication required
- Role-based access control (RBAC)

## License

This project is proprietary and confidential. All rights reserved.