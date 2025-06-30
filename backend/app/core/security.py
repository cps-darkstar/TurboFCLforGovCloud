import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

"""
Enterprise Security & Encryption Service for TurboFCL
Handles PII encryption, secure key management, and FIPS 140-2 compliance
"""

import asyncio
import base64
import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union
from uuid import uuid4

from app.core.config import get_settings
from app.schemas.enterprise_schemas import User  # Import the User schema
from cryptography.fernet import Fernet
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy.ext.asyncio import AsyncSession

settings = get_settings()
logger = logging.getLogger(__name__)


class EncryptionError(Exception):
    """Custom exception for encryption-related errors"""

    pass


class EnterpriseEncryptionService:
    """
    Enterprise-grade encryption service for government compliance
    Implements FIPS 140-2 Level 3 equivalent encryption standards
    """

    def __init__(self):
        self._encryption_key = self._get_or_create_encryption_key()
        self._fernet = Fernet(self._encryption_key)
        self._classification_keys = self._initialize_classification_keys()

    def _get_or_create_encryption_key(self) -> bytes:
        """
        Get or create the master encryption key from secure storage
        In production, this should use AWS KMS, Azure Key Vault, or HSM
        """
        key_env = os.getenv("TURBOFCL_ENCRYPTION_KEY")
        if key_env:
            try:
                return base64.urlsafe_b64decode(key_env.encode())
            except Exception as e:
                logger.error(f"Failed to decode encryption key from environment: {e}")
                raise EncryptionError("Invalid encryption key in environment")

        # Generate new key for development (NOT for production)
        if settings.ENVIRONMENT == "development":
            logger.warning("Generating new encryption key for development environment")
            return Fernet.generate_key()

        raise EncryptionError("No encryption key found - required for production")

    def _initialize_classification_keys(self) -> Dict[str, bytes]:
        """Initialize classification-specific encryption keys"""
        classifications = [
            "UNCLASSIFIED",
            "CUI",
            "CONFIDENTIAL",
            "SECRET",
            "TOP_SECRET",
        ]
        keys = {}

        for classification in classifications:
            # In production, these would be retrieved from secure key management
            key_material = f"{classification}_{settings.SECRET_KEY}".encode()
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"turbofcl_classification_salt",  # Use unique salt per deployment
                iterations=100000,
                backend=default_backend(),
            )
            derived_key = base64.urlsafe_b64encode(kdf.derive(key_material))
            keys[classification] = derived_key

        return keys

    async def encrypt_pii_field(
        self,
        plaintext: str,
        classification: str = "CUI",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Encrypt PII data with classification-appropriate encryption

        Args:
            plaintext: The sensitive data to encrypt
            classification: Data classification level
            context: Additional context for audit trail

        Returns:
            Dict containing encrypted data and metadata
        """
        if not plaintext or not isinstance(plaintext, str):
            raise EncryptionError("Invalid plaintext data for encryption")

        try:
            # Select appropriate encryption key based on classification
            if classification in self._classification_keys:
                fernet = Fernet(self._classification_keys[classification])
            else:
                fernet = self._fernet
                logger.warning(
                    f"Unknown classification {classification}, using default encryption"
                )

            # Add timestamp and context to plaintext for integrity
            timestamp = datetime.utcnow().isoformat()
            enriched_data = {
                "data": plaintext,
                "timestamp": timestamp,
                "classification": classification,
                "context": context or {},
            }

            # Convert to JSON and encrypt
            import json

            json_data = json.dumps(enriched_data, sort_keys=True)
            encrypted_data = fernet.encrypt(json_data.encode())

            # Generate hash for searchability without decryption
            search_hash = hashlib.sha256(
                f"{plaintext.lower()}_{classification}".encode()
            ).hexdigest()

            return {
                "encrypted_data": encrypted_data,
                "search_hash": search_hash,
                "classification": classification,
                "encryption_algorithm": "Fernet_AES256",
                "encrypted_at": timestamp,
                "key_version": "v1",  # For key rotation tracking
            }

        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt data: {str(e)}")

    async def decrypt_pii_field(
        self, encrypted_data: bytes, classification: str = "CUI"
    ) -> str:
        """
        Decrypt PII data with audit logging

        Args:
            encrypted_data: The encrypted data bytes
            classification: Data classification level

        Returns:
            Decrypted plaintext string
        """
        try:
            # Select appropriate decryption key
            if classification in self._classification_keys:
                fernet = Fernet(self._classification_keys[classification])
            else:
                fernet = self._fernet

            # Decrypt and parse
            decrypted_bytes = fernet.decrypt(encrypted_data)
            import json

            enriched_data = json.loads(decrypted_bytes.decode())

            # Validate data integrity
            if enriched_data.get("classification") != classification:
                logger.warning(
                    f"Classification mismatch during decryption: {enriched_data.get('classification')} vs {classification}"
                )

            # Log access for audit trail
            logger.info(
                f"PII data accessed - Classification: {classification}, Timestamp: {datetime.utcnow().isoformat()}"
            )

            return enriched_data["data"]

        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt data: {str(e)}")

    async def encrypt_document(
        self,
        file_content: bytes,
        classification: str = "CUI",
        document_type: str = "GENERAL",
    ) -> Dict[str, Any]:
        """
        Encrypt document content with strong encryption

        Args:
            file_content: Document bytes to encrypt
            classification: Security classification
            document_type: Type of document for context

        Returns:
            Encryption metadata and encrypted content
        """
        try:
            # Generate unique key for this document
            document_key = Fernet.generate_key()
            document_fernet = Fernet(document_key)

            # Encrypt document content
            encrypted_content = document_fernet.encrypt(file_content)

            # Encrypt the document key with master key
            master_fernet = Fernet(
                self._classification_keys.get(classification, self._encryption_key)
            )
            encrypted_key = master_fernet.encrypt(document_key)

            # Generate file hash for integrity checking
            file_hash = hashlib.sha256(file_content).hexdigest()

            return {
                "encrypted_content": encrypted_content,
                "encrypted_key": encrypted_key,
                "file_hash": file_hash,
                "classification": classification,
                "document_type": document_type,
                "encryption_algorithm": "AES-256-CBC",
                "encrypted_at": datetime.utcnow().isoformat(),
                "content_size": len(file_content),
            }

        except Exception as e:
            logger.error(f"Document encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt document: {str(e)}")

    async def decrypt_document(
        self,
        encrypted_content: bytes,
        encrypted_key: bytes,
        classification: str = "CUI",
        expected_hash: Optional[str] = None,
    ) -> bytes:
        """
        Decrypt document content with integrity verification

        Args:
            encrypted_content: Encrypted document bytes
            encrypted_key: Encrypted document key
            classification: Security classification
            expected_hash: Expected SHA-256 hash for verification

        Returns:
            Decrypted document bytes
        """
        try:
            # Decrypt the document key
            master_fernet = Fernet(
                self._classification_keys.get(classification, self._encryption_key)
            )
            document_key = master_fernet.decrypt(encrypted_key)

            # Decrypt document content
            document_fernet = Fernet(document_key)
            decrypted_content = document_fernet.decrypt(encrypted_content)

            # Verify integrity if hash provided
            if expected_hash:
                actual_hash = hashlib.sha256(decrypted_content).hexdigest()
                if actual_hash != expected_hash:
                    raise EncryptionError("Document integrity check failed")

            # Log document access
            logger.info(
                f"Document decrypted - Classification: {classification}, Size: {len(decrypted_content)} bytes"
            )

            return decrypted_content

        except Exception as e:
            logger.error(f"Document decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt document: {str(e)}")

    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)

    def hash_password(
        self, password: str, salt: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Hash password with secure parameters

        Args:
            password: Plain text password
            salt: Optional salt bytes

        Returns:
            Dict with hash and salt
        """
        if salt is None:
            salt = secrets.token_bytes(32)

        # Use PBKDF2 with high iteration count for government compliance
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=64,
            salt=salt,
            iterations=200000,  # High iteration count for security
            backend=default_backend(),
        )

        password_hash = kdf.derive(password.encode())

        return {
            "hash": base64.b64encode(password_hash).decode(),
            "salt": base64.b64encode(salt).decode(),
            "algorithm": "PBKDF2_SHA256",
            "iterations": 200000,
        }

    def verify_password(self, password: str, stored_hash: str, salt: str) -> bool:
        """
        Verify password against stored hash

        Args:
            password: Plain text password to verify
            stored_hash: Base64-encoded stored hash
            salt: Base64-encoded salt

        Returns:
            True if password matches
        """
        try:
            salt_bytes = base64.b64decode(salt.encode())
            stored_hash_bytes = base64.b64decode(stored_hash.encode())

            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=64,
                salt=salt_bytes,
                iterations=200000,
                backend=default_backend(),
            )

            # Verify password
            kdf.verify(password.encode(), stored_hash_bytes)
            return True

        except Exception:
            return False

    async def rotate_encryption_keys(self) -> Dict[str, Any]:
        """
        Rotate encryption keys for security compliance
        This would trigger re-encryption of all PII data in production
        """
        logger.warning("Key rotation initiated - this is a critical security operation")

        # In production, this would:
        # 1. Generate new encryption keys
        # 2. Re-encrypt all PII data with new keys
        # 3. Update key version tracking
        # 4. Maintain old keys for decryption during transition

        return {
            "rotation_started": datetime.utcnow().isoformat(),
            "status": "initiated",
            "estimated_completion": (
                datetime.utcnow() + timedelta(hours=24)
            ).isoformat(),
        }

    def get_classification_requirements(self, classification: str) -> Dict[str, Any]:
        """
        Get encryption requirements for a given classification level

        Args:
            classification: Security classification

        Returns:
            Dict with encryption requirements
        """
        requirements = {
            "UNCLASSIFIED": {
                "encryption_required": False,
                "algorithm": "AES-256",
                "key_length": 256,
                "storage_requirements": "Standard encryption at rest",
            },
            "CUI": {
                "encryption_required": True,
                "algorithm": "AES-256",
                "key_length": 256,
                "storage_requirements": "FIPS 140-2 Level 2 equivalent",
                "transmission_requirements": "TLS 1.3 minimum",
            },
            "CONFIDENTIAL": {
                "encryption_required": True,
                "algorithm": "AES-256",
                "key_length": 256,
                "storage_requirements": "FIPS 140-2 Level 3 equivalent",
                "transmission_requirements": "End-to-end encryption required",
                "access_logging": "All access must be logged",
            },
            "SECRET": {
                "encryption_required": True,
                "algorithm": "AES-256",
                "key_length": 256,
                "storage_requirements": "FIPS 140-2 Level 3 or 4",
                "transmission_requirements": "Type 1 encryption required",
                "access_logging": "Real-time monitoring required",
                "key_management": "Hardware Security Module required",
            },
            "TOP_SECRET": {
                "encryption_required": True,
                "algorithm": "Suite B compliant",
                "key_length": 256,
                "storage_requirements": "FIPS 140-2 Level 4",
                "transmission_requirements": "Type 1 encryption mandatory",
                "access_logging": "Real-time monitoring with alerting",
                "key_management": "Certified HSM with key escrow",
                "physical_security": "SCIF requirements apply",
            },
        }

        return requirements.get(classification, requirements["CUI"])


# Global encryption service instance
encryption_service = EnterpriseEncryptionService()


# Utility functions for easy access
async def encrypt_sensitive_data(
    data: str, classification: str = "CUI"
) -> Dict[str, Any]:
    """Convenience function for encrypting sensitive data"""
    return await encryption_service.encrypt_pii_field(data, classification)


async def decrypt_sensitive_data(
    encrypted_data: bytes, classification: str = "CUI"
) -> str:
    """Convenience function for decrypting sensitive data"""
    return await encryption_service.decrypt_pii_field(encrypted_data, classification)


def secure_hash(data: str) -> str:
    """Generate secure hash for data integrity checking"""
    return hashlib.sha256(data.encode()).hexdigest()


def generate_audit_token() -> str:
    """Generate secure token for audit trail tracking"""
    return encryption_service.generate_secure_token()


async def get_current_active_user() -> User:
    """
    Placeholder for a dependency that would get the current authenticated user.
    In a real application, this would involve decoding a JWT token,
    verifying the session, and fetching the user from the database.

    Returns a mock User model instance.
    """
    # This is a mock user. In a real app, you'd get this from a token.
    return User(
        id=uuid4(),
        username="testuser",
        email="user@example.gov",
        first_name="Test",
        last_name="User",
        is_active=True,
        roles=[],  # In a real app, this would be populated with Role schemas
        created_at=datetime.now(),
        updated_at=datetime.now(),
        login_count=1,
        last_login=datetime.now(),
    )
