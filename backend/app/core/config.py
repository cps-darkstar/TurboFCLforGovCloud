"""
TurboFCL Backend Configuration
AWS GovCloud Compliant Settings
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, List
import os
from functools import lru_cache

class Settings(BaseSettings):
    """
    Application settings with AWS GovCloud compliance
    All sensitive data stored in AWS Secrets Manager / Parameter Store
    """
    
    # Application
    APP_NAME: str = "TurboFCL"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # AWS GovCloud Region
    AWS_REGION: str = "us-gov-west-1"
    AWS_ACCOUNT_ID: Optional[str] = None
    
    # Database (RDS PostgreSQL with pgvector)
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 40
    DB_POOL_TIMEOUT: int = 30
    
    # AWS Cognito (GovCloud)
    COGNITO_USER_POOL_ID: str
    COGNITO_CLIENT_ID: str
    COGNITO_REGION: str = "us-gov-west-1"
    
    # S3 Buckets (GovCloud)
    S3_DOCUMENTS_BUCKET: str = "turbofcl-documents-gov"
    S3_MODELS_BUCKET: str = "turbofcl-models-gov"
    S3_LOGS_BUCKET: str = "turbofcl-logs-gov"
    S3_PRESIGNED_URL_EXPIRY: int = 3600  # 1 hour
    
    # SageMaker Endpoints (GovCloud)
    SAGEMAKER_GPT_ENDPOINT: str = "turbofcl-gpt-endpoint"
    SAGEMAKER_EMBEDDING_ENDPOINT: str = "turbofcl-embedding-endpoint"
    SAGEMAKER_NER_ENDPOINT: str = "turbofcl-ner-endpoint"
    
    # API Keys (stored in Secrets Manager)
    SAM_GOV_API_KEY: Optional[str] = None
    SAM_GOV_API_URL: str = "https://api.sam.gov/entity-information/v3"
    EDGAR_API_URL: str = "https://data.sec.gov/api/xbrl/companyfacts"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS (GovCloud ALB endpoints)
    ALLOWED_ORIGINS: List[str] = [
        "https://turbofcl.us-gov-west-1.elb.amazonaws.com",
        "https://turbofcl.gov",
        "http://localhost:3000"  # Development only
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 600
    
    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_FILE_EXTENSIONS: List[str] = [".pdf", ".doc", ".docx"]
    
    # Test Users (for UX testing)
    ENABLE_TEST_USERS: bool = False
    TEST_USER_PASSWORD: Optional[str] = None
    
    # Monitoring
    CLOUDWATCH_LOG_GROUP: str = "/ecs/turbofcl"
    ENABLE_XRAY_TRACING: bool = True
    
    # Cache
    REDIS_URL: Optional[str] = None
    CACHE_TTL_SECONDS: int = 86400  # 24 hours for SAM.gov data
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v):
        if v not in ["development", "staging", "production"]:
            raise ValueError("Invalid environment")
        return v
    
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v):
        if not v.startswith("postgresql://"):
            raise ValueError("Database URL must be PostgreSQL")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Test user configurations for UX testing
TEST_USER_CONFIGS = {
    "fso-test-nofoci@turbofcl.test": {
        "cognito_attributes": {
            "email": "fso-test-nofoci@turbofcl.test",
            "custom:role": "FSO",
            "custom:company_name": "Test Defense LLC",
            "custom:test_scenario": "LLC with no FOCI conditions"
        },
        "application_data": {
            "company_name": "Test Defense LLC",
            "uei": "TEST12345678",
            "cage_code": "TEST1",
            "entity_type": "llc",
            "foci_status": ["no-foci"],
            "sam_data": {
                "legalBusinessName": "Test Defense LLC",
                "entityStructure": "LIMITED LIABILITY COMPANY",
                "registrationStatus": "Active"
            }
        }
    },
    "fso-test-foci@turbofcl.test": {
        "cognito_attributes": {
            "email": "fso-test-foci@turbofcl.test",
            "custom:role": "FSO",
            "custom:company_name": "Global Defense Corp",
            "custom:test_scenario": "Corporation with 15% foreign ownership"
        },
        "application_data": {
            "company_name": "Global Defense Corp",
            "uei": "GLOB87654321",
            "cage_code": "GLOB1",
            "entity_type": "corporation",
            "foci_status": ["foreign-ownership"],
            "foreign_ownership_percentage": 15,
            "sam_data": {
                "legalBusinessName": "Global Defense Corp",
                "entityStructure": "CORPORATION",
                "registrationStatus": "Active"
            }
        }
    },
    "fso-test-public@turbofcl.test": {
        "cognito_attributes": {
            "email": "fso-test-public@turbofcl.test",
            "custom:role": "FSO",
            "custom:company_name": "Public Defense Systems Inc",
            "custom:test_scenario": "Public corporation with SEC requirements"
        },
        "application_data": {
            "company_name": "Public Defense Systems Inc",
            "uei": "PUBL11223344",
            "cage_code": "PUBL1",
            "entity_type": "public-corporation",
            "foci_status": ["no-foci"],
            "sam_data": {
                "legalBusinessName": "Public Defense Systems Inc",
                "entityStructure": "PUBLICLY HELD CORPORATION",
                "registrationStatus": "Active"
            },
            "edgar_data": {
                "cik": "0001234567",
                "filings": [
                    {"formType": "10-K", "filingDate": "2024-12-31"},
                    {"formType": "8-K", "filingDate": "2025-01-15"}
                ]
            }
        }
    },
    "dcsa-reviewer@turbofcl.test": {
        "cognito_attributes": {
            "email": "dcsa-reviewer@turbofcl.test",
            "custom:role": "DCSA_REVIEWER",
            "custom:agency": "DCSA",
            "custom:test_scenario": "Read-only access for application review"
        },
        "permissions": ["read:applications", "read:documents", "write:comments"]
    }
}

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# AWS Service Configuration
AWS_SERVICE_CONFIG = {
    "s3": {
        "signature_version": "s3v4",
        "region_name": "us-gov-west-1",
        "use_ssl": True,
        "verify": True
    },
    "sagemaker-runtime": {
        "region_name": "us-gov-west-1",
        "use_ssl": True,
        "verify": True
    },
    "cognito-idp": {
        "region_name": "us-gov-west-1",
        "use_ssl": True,
        "verify": True
    },
    "secretsmanager": {
        "region_name": "us-gov-west-1",
        "use_ssl": True,
        "verify": True
    },
    "ssm": {
        "region_name": "us-gov-west-1",
        "use_ssl": True,
        "verify": True
    }
}

# Security Headers for GovCloud Compliance
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://turbofcl.us-gov-west-1.elb.amazonaws.com; style-src 'self' 'unsafe-inline';",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

# IAM Policy Templates for Least Privilege
IAM_POLICY_TEMPLATES = {
    "ecs_task_role": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject"
                ],
                "Resource": [
                    "arn:aws-us-gov:s3:::turbofcl-documents-gov/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "sagemaker:InvokeEndpoint"
                ],
                "Resource": [
                    "arn:aws-us-gov:sagemaker:us-gov-west-1:*:endpoint/turbofcl-*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue"
                ],
                "Resource": [
                    "arn:aws-us-gov:secretsmanager:us-gov-west-1:*:secret:turbofcl/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "ssm:GetParameter",
                    "ssm:GetParameters"
                ],
                "Resource": [
                    "arn:aws-us-gov:ssm:us-gov-west-1:*:parameter/turbofcl/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "kms:Decrypt",
                    "kms:GenerateDataKey"
                ],
                "Resource": [
                    "arn:aws-us-gov:kms:us-gov-west-1:*:key/*"
                ],
                "Condition": {
                    "StringEquals": {
                        "kms:ViaService": [
                            "s3.us-gov-west-1.amazonaws.com",
                            "secretsmanager.us-gov-west-1.amazonaws.com"
                        ]
                    }
                }
            }
        ]
    }
}

settings = get_settings() 