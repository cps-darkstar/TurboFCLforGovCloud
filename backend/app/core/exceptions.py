"""
Enterprise Exception Classes for TurboFCL
Custom exceptions for business logic and validation errors
"""

from typing import Any, Dict, Optional


class TurboFCLException(Exception):
    """Base exception class for TurboFCL application"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class BusinessLogicError(TurboFCLException):
    """Raised when business logic rules are violated"""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        error_code: str = "BUSINESS_LOGIC_ERROR",
    ):
        self.error_code = error_code
        super().__init__(message, details)


class ValidationError(TurboFCLException):
    """Raised when data validation fails"""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.field = field
        self.error_code = "VALIDATION_ERROR"
        super().__init__(message, details)


class SecurityError(TurboFCLException):
    """Raised when security policies are violated"""

    def __init__(
        self,
        message: str,
        security_event: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.security_event = security_event
        self.error_code = "SECURITY_ERROR"
        super().__init__(message, details)


class ComplianceError(TurboFCLException):
    """Raised when compliance requirements are not met"""

    def __init__(
        self, message: str, regulation: str, details: Optional[Dict[str, Any]] = None
    ):
        self.regulation = regulation
        self.error_code = "COMPLIANCE_ERROR"
        super().__init__(message, details)


class AuthorizationError(TurboFCLException):
    """Raised when user lacks required authorization"""

    def __init__(
        self, message: str, required_permission: str, user_id: Optional[str] = None
    ):
        self.required_permission = required_permission
        self.user_id = user_id
        self.error_code = "AUTHORIZATION_ERROR"
        super().__init__(message)


class EntityNotFoundError(TurboFCLException):
    """Raised when requested entity is not found"""

    def __init__(self, entity_type: str, entity_id: str):
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.error_code = "ENTITY_NOT_FOUND"
        message = f"{entity_type} with ID {entity_id} not found"
        super().__init__(message)


class FOCIAssessmentError(TurboFCLException):
    """Raised when FOCI assessment encounters errors"""

    def __init__(
        self,
        message: str,
        assessment_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.assessment_id = assessment_id
        self.error_code = "FOCI_ASSESSMENT_ERROR"
        super().__init__(message, details)


class EncryptionError(TurboFCLException):
    """Raised when encryption/decryption operations fail"""

    def __init__(
        self, message: str, operation: str, details: Optional[Dict[str, Any]] = None
    ):
        self.operation = operation
        self.error_code = "ENCRYPTION_ERROR"
        super().__init__(message, details)


class DatabaseError(TurboFCLException):
    """Raised when database operations fail"""

    def __init__(
        self, message: str, operation: str, details: Optional[Dict[str, Any]] = None
    ):
        self.operation = operation
        self.error_code = "DATABASE_ERROR"
        super().__init__(message, details)


class ExternalServiceError(TurboFCLException):
    """Raised when external service calls fail"""

    def __init__(
        self, message: str, service_name: str, status_code: Optional[int] = None
    ):
        self.service_name = service_name
        self.status_code = status_code
        self.error_code = "EXTERNAL_SERVICE_ERROR"
        super().__init__(message)


class DocumentProcessingError(TurboFCLException):
    """Raised when document processing fails"""

    def __init__(
        self,
        message: str,
        document_id: Optional[str] = None,
        processing_stage: Optional[str] = None,
    ):
        self.document_id = document_id
        self.processing_stage = processing_stage
        self.error_code = "DOCUMENT_PROCESSING_ERROR"
        super().__init__(message)


class ConfigurationError(TurboFCLException):
    """Raised when application configuration is invalid"""

    def __init__(self, message: str, config_key: Optional[str] = None):
        self.config_key = config_key
        self.error_code = "CONFIGURATION_ERROR"
        super().__init__(message)
