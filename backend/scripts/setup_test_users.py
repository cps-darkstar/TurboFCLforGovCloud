#!/usr/bin/env python3
"""
Setup Test Users for TurboFCL UX Testing
Creates test users in AWS Cognito and pre-populates application data
Run this script after database migrations
"""

import asyncio
import boto3
import json
import os
import sys
from datetime import datetime
from uuid import uuid4
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings, TEST_USER_CONFIGS
from app.models.turbofcl import User, FCLApplication, SAMDataCache

# Initialize AWS clients for GovCloud
cognito_client = boto3.client(
    'cognito-idp',
    region_name=settings.COGNITO_REGION
)

ssm_client = boto3.client(
    'ssm',
    region_name=settings.AWS_REGION
)

def get_test_password():
    """Get test user password from SSM Parameter Store"""
    try:
        response = ssm_client.get_parameter(
            Name='/turbofcl/test-user-password',
            WithDecryption=True
        )
        return response['Parameter']['Value']
    except:
        # Fallback for local development
        return os.getenv('TEST_USER_PASSWORD', 'TurboFCL-Test-2025!')

def create_cognito_user(email: str, password: str, attributes: dict):
    """Create user in Cognito User Pool"""
    try:
        # Create user
        response = cognito_client.admin_create_user(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'},
                *[{'Name': k, 'Value': v} for k, v in attributes.items() if k != 'email']
            ],
            MessageAction='SUPPRESS',  # Don't send welcome email
            TemporaryPassword=password
        )
        
        # Set permanent password
        cognito_client.admin_set_user_password(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True
        )
        
        print(f"✓ Created Cognito user: {email}")
        return response['User']['Username']
        
    except cognito_client.exceptions.UsernameExistsException:
        print(f"! User already exists: {email}")
        return email
    except Exception as e:
        print(f"✗ Failed to create user {email}: {str(e)}")
        return None

async def setup_database_records():
    """Create database records for test users"""
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        for email, config in TEST_USER_CONFIGS.items():
            # Check if user exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                print(f"! User already exists in DB: {email}")
                user = existing_user
            else:
                # Create user record
                user = User(
                    id=str(uuid4()),
                    email=email,
                    cognito_sub=email,  # Will be updated on first login
                    role=config['cognito_attributes'].get('custom:role', 'FSO'),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(user)
                db.commit()
                print(f"✓ Created DB user: {email}")
            
            # Create pre-populated application for FSO users
            if 'application_data' in config and user.role == 'FSO':
                existing_app = db.query(FCLApplication).filter(
                    FCLApplication.user_id == user.id
                ).first()
                
                if not existing_app:
                    app_data = config['application_data']
                    application = FCLApplication(
                        id=str(uuid4()),
                        user_id=user.id,
                        company_name=app_data['company_name'],
                        uei=app_data.get('uei'),
                        cage_code=app_data.get('cage_code'),
                        entity_type=app_data.get('entity_type'),
                        foci_status=app_data.get('foci_status', []),
                        status='draft',
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    
                    # Add SAM data if provided
                    if 'sam_data' in app_data:
                        sam_cache = SAMDataCache(
                            id=str(uuid4()),
                            uei=app_data['uei'],
                            data=app_data['sam_data'],
                            created_at=datetime.utcnow(),
                            expires_at=datetime(2025, 12, 31)  # Long expiry for test data
                        )
                        db.add(sam_cache)
                        application.sam_data = app_data['sam_data']
                    
                    # Add EDGAR data if provided
                    if 'edgar_data' in app_data:
                        application.edgar_data = app_data['edgar_data']
                    
                    db.add(application)
                    db.commit()
                    print(f"✓ Created test application for: {email}")
                else:
                    print(f"! Application already exists for: {email}")
        
        print("\n✓ Database setup complete!")
        
    except Exception as e:
        print(f"✗ Database error: {str(e)}")
        db.rollback()
    finally:
        db.close()

def print_test_credentials():
    """Print test user credentials for easy access"""
    password = get_test_password()
    
    print("\n" + "="*60)
    print("TurboFCL TEST USER CREDENTIALS")
    print("="*60)
    print("\nThese users are for UX testing only!")
    print(f"\nPassword for all test users: {password}")
    print("\nTest Scenarios:")
    print("-"*60)
    
    for email, config in TEST_USER_CONFIGS.items():
        attrs = config['cognito_attributes']
        print(f"\nEmail: {email}")
        print(f"Role: {attrs.get('custom:role', 'FSO')}")
        print(f"Scenario: {attrs.get('custom:test_scenario', 'N/A')}")
        if 'application_data' in config:
            app = config['application_data']
            print(f"  - Company: {app.get('company_name')}")
            print(f"  - Entity Type: {app.get('entity_type')}")
            print(f"  - FOCI Status: {app.get('foci_status')}")
    
    print("\n" + "="*60)
    print("\nLogin at: https://turbofcl.us-gov-west-1.elb.amazonaws.com")
    print("="*60)

async def main():
    """Main setup function"""
    print("Setting up TurboFCL test users...")
    
    # Check if test users are enabled
    if not settings.ENABLE_TEST_USERS:
        print("⚠️  Test users are disabled in settings.")
        print("Set ENABLE_TEST_USERS=true to enable.")
        return
    
    # Get password
    password = get_test_password()
    
    # Create Cognito users
    print("\nCreating Cognito users...")
    for email, config in TEST_USER_CONFIGS.items():
        create_cognito_user(
            email=email,
            password=password,
            attributes=config['cognito_attributes']
        )
    
    # Setup database records
    print("\nSetting up database records...")
    await setup_database_records()
    
    # Print credentials
    print_test_credentials()
    
    print("\n✅ Test user setup complete!")

if __name__ == "__main__":
    # Check environment
    if settings.ENVIRONMENT == "production" and not settings.ENABLE_TEST_USERS:
        print("❌ Cannot create test users in production without explicit enable flag!")
        sys.exit(1)
    
    asyncio.run(main()) 