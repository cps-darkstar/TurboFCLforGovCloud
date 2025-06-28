"""
Authentication Service for TurboFCL
Handles AWS Cognito integration and JWT validation
"""

import boto3
import jwt
import json
import httpx
from typing import Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from jose import JWTError, jwt as jose_jwt
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        self.settings = get_settings()
        self.cognito_client = boto3.client(
            'cognito-idp',
            region_name=self.settings.COGNITO_REGION
        )
        self.user_pool_id = self.settings.COGNITO_USER_POOL_ID
        self.client_id = self.settings.COGNITO_CLIENT_ID
        self.jwks_cache = {}
        self.jwks_cache_expiry = None
    
    async def verify_cognito_token(self, token: str) -> Dict[str, Any]:
        """
        Verify JWT token from AWS Cognito
        """
        try:
            # Get JWKS (JSON Web Key Set) from Cognito
            jwks = await self._get_jwks()
            
            # Decode token header to get key ID
            unverified_header = jose_jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            
            if not kid:
                raise ValueError("Token missing key ID")
            
            # Find the correct key
            key = None
            for jwk in jwks.get('keys', []):
                if jwk.get('kid') == kid:
                    key = jwk
                    break
            
            if not key:
                raise ValueError("Unable to find appropriate key")
            
            # Verify and decode the token
            payload = jose_jwt.decode(
                token,
                key,
                algorithms=['RS256'],
                audience=self.client_id,
                issuer=f'https://cognito-idp.{self.settings.COGNITO_REGION}.amazonaws.com/{self.user_pool_id}'
            )
            
            # Validate token expiration
            if payload.get('exp', 0) < datetime.utcnow().timestamp():
                raise ValueError("Token has expired")
            
            # Validate token usage
            if payload.get('token_use') != 'access':
                raise ValueError("Token is not an access token")
            
            return payload
            
        except JWTError as e:
            logger.error(f"JWT validation error: {str(e)}")
            raise ValueError(f"Invalid token: {str(e)}")
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            raise ValueError(f"Token verification failed: {str(e)}")
    
    async def _get_jwks(self) -> Dict[str, Any]:
        """
        Get JSON Web Key Set from Cognito
        Cache for performance
        """
        # Check cache
        if (self.jwks_cache and self.jwks_cache_expiry and 
            datetime.utcnow() < self.jwks_cache_expiry):
            return self.jwks_cache
        
        try:
            jwks_url = f'https://cognito-idp.{self.settings.COGNITO_REGION}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json'
            
            async with httpx.AsyncClient() as client:
                response = await client.get(jwks_url)
                response.raise_for_status()
                
                jwks = response.json()
                
                # Cache for 1 hour
                self.jwks_cache = jwks
                self.jwks_cache_expiry = datetime.utcnow() + timedelta(hours=1)
                
                return jwks
                
        except Exception as e:
            logger.error(f"Error fetching JWKS: {str(e)}")
            raise ValueError("Unable to fetch token validation keys")
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Get user information from Cognito using access token
        """
        try:
            response = self.cognito_client.get_user(AccessToken=access_token)
            
            # Extract user attributes
            user_attributes = {}
            for attr in response.get('UserAttributes', []):
                user_attributes[attr['Name']] = attr['Value']
            
            return {
                'username': response.get('Username'),
                'user_attributes': user_attributes,
                'email': user_attributes.get('email'),
                'company_name': user_attributes.get('custom:company_name'),
                'role': user_attributes.get('custom:role'),
                'security_clearance': user_attributes.get('custom:security_clearance'),
                'dcsa_facility_id': user_attributes.get('custom:dcsa_facility_id')
            }
            
        except Exception as e:
            logger.error(f"Error getting user info: {str(e)}")
            raise ValueError("Unable to retrieve user information")
    
    async def create_test_user(self, email: str, password: str, attributes: Dict[str, str]) -> Dict[str, Any]:
        """
        Create test user in Cognito (for development/testing only)
        """
        if not self.settings.ENABLE_TEST_USERS:
            raise ValueError("Test user creation is disabled")
        
        try:
            # Prepare user attributes
            user_attrs = [
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'}
            ]
            
            # Add custom attributes
            for key, value in attributes.items():
                if key.startswith('custom:'):
                    user_attrs.append({'Name': key, 'Value': value})
            
            # Create user
            response = self.cognito_client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=user_attrs,
                TemporaryPassword=password,
                MessageAction='SUPPRESS'  # Don't send welcome email
            )
            
            # Set permanent password
            self.cognito_client.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=email,
                Password=password,
                Permanent=True
            )
            
            logger.info(f"Test user created: {email}")
            return {
                'username': email,
                'status': 'created',
                'attributes': attributes
            }
            
        except Exception as e:
            logger.error(f"Error creating test user: {str(e)}")
            raise ValueError(f"Failed to create test user: {str(e)}")
    
    async def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with email and password
        Returns tokens if successful
        """
        try:
            response = self.cognito_client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': email,
                    'PASSWORD': password
                }
            )
            
            auth_result = response.get('AuthenticationResult', {})
            
            return {
                'access_token': auth_result.get('AccessToken'),
                'id_token': auth_result.get('IdToken'),
                'refresh_token': auth_result.get('RefreshToken'),
                'expires_in': auth_result.get('ExpiresIn'),
                'token_type': auth_result.get('TokenType', 'Bearer')
            }
            
        except self.cognito_client.exceptions.NotAuthorizedException:
            raise ValueError("Invalid email or password")
        except self.cognito_client.exceptions.UserNotConfirmedException:
            raise ValueError("User account not confirmed")
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise ValueError("Authentication failed")
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token
        """
        try:
            response = self.cognito_client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            
            auth_result = response.get('AuthenticationResult', {})
            
            return {
                'access_token': auth_result.get('AccessToken'),
                'id_token': auth_result.get('IdToken'),
                'expires_in': auth_result.get('ExpiresIn'),
                'token_type': auth_result.get('TokenType', 'Bearer')
            }
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            raise ValueError("Token refresh failed")
    
    async def logout_user(self, access_token: str) -> bool:
        """
        Logout user by invalidating tokens
        """
        try:
            self.cognito_client.global_sign_out(AccessToken=access_token)
            return True
        except Exception as e:
            logger.error(f"Logout error: {str(e)}")
            return False
    
    def validate_user_permissions(self, user_info: Dict[str, Any], required_permissions: List[str]) -> bool:
        """
        Validate user has required permissions based on role
        """
        user_role = user_info.get('custom:role', '')
        
        # Define role permissions
        role_permissions = {
            'FSO': [
                'create:applications',
                'read:applications',
                'update:applications',
                'upload:documents',
                'manage:kmps'
            ],
            'DCSA_REVIEWER': [
                'read:applications',
                'read:documents',
                'write:comments'
            ],
            'ADMIN': [
                'create:applications',
                'read:applications',
                'update:applications',
                'delete:applications',
                'upload:documents',
                'manage:kmps',
                'manage:users'
            ]
        }
        
        user_permissions = role_permissions.get(user_role, [])
        
        # Check if user has all required permissions
        return all(perm in user_permissions for perm in required_permissions)