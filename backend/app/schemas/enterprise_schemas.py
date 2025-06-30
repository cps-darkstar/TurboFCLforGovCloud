"""
Enterprise Pydantic Schemas for TurboFCL

This module defines all Pydantic models for API serialization/deserialization,
validation, and data transfer objects for the enterprise TurboFCL system.
Includes comprehensive validation rules and security considerations.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, root_validator, validator
from pydantic.types import confloat, conint, constr


# Base Schema Classes
class TimestampedSchema(BaseModel):
    """Base schema with timestamp fields."""

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None,
            Decimal: lambda v: float(v) if v else None,
        }


class AuditableSchema(TimestampedSchema):
    """Base schema with audit fields."""

    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None
    version: Optional[int] = Field(default=1, ge=1)


# Enums
class SecurityClearanceLevel(str, Enum):
    """Security clearance levels."""

    CONFIDENTIAL = "CONFIDENTIAL"
    SECRET = "SECRET"
    TOP_SECRET = "TOP_SECRET"
    SCI = "SCI"
    SAP = "SAP"


class FCLStatus(str, Enum):
    """Facility Clearance List status."""

    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"


class FOCIRiskLevel(str, Enum):
    """FOCI risk assessment levels."""

    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ComplianceStatus(str, Enum):
    """Compliance status."""

    COMPLIANT = "COMPLIANT"
    NON_COMPLIANT = "NON_COMPLIANT"
    PENDING_REVIEW = "PENDING_REVIEW"
    REMEDIATION_REQUIRED = "REMEDIATION_REQUIRED"


class BusinessEntityType(str, Enum):
    """Business entity types."""

    CORPORATION = "CORPORATION"
    LLC = "LLC"
    PARTNERSHIP = "PARTNERSHIP"
    SOLE_PROPRIETORSHIP = "SOLE_PROPRIETORSHIP"
    NONPROFIT = "NONPROFIT"
    GOVERNMENT = "GOVERNMENT"
    FOREIGN_ENTITY = "FOREIGN_ENTITY"


# Business Entity Schemas
class BusinessEntityBase(BaseModel):
    """Base business entity schema."""

    name: constr(min_length=1, max_length=255)
    entity_type: BusinessEntityType
    duns_number: Optional[constr(regex=r"^\d{9}$")] = None
    ein: Optional[constr(regex=r"^\d{2}-\d{7}$")] = None
    cage_code: Optional[constr(regex=r"^[A-Z0-9]{5}$")] = None

    @validator("duns_number")
    def validate_duns(cls, v):
        if v and not v.isdigit():
            raise ValueError("DUNS number must contain only digits")
        return v


class BusinessEntityCreate(BusinessEntityBase):
    """Schema for creating business entities."""

    addresses: List["AddressCreate"] = []
    contact_info: Optional["ContactInfoCreate"] = None


class BusinessEntityUpdate(BaseModel):
    """Schema for updating business entities."""

    name: Optional[constr(min_length=1, max_length=255)] = None
    entity_type: Optional[BusinessEntityType] = None
    duns_number: Optional[constr(regex=r"^\d{9}$")] = None
    ein: Optional[constr(regex=r"^\d{2}-\d{7}$")] = None
    cage_code: Optional[constr(regex=r"^[A-Z0-9]{5}$")] = None


class BusinessEntity(BusinessEntityBase, AuditableSchema):
    """Complete business entity schema."""

    id: UUID
    is_active: bool = True
    addresses: List["Address"] = []
    contact_info: Optional["ContactInfo"] = None
    ownership_structure: Optional["OwnershipStructure"] = None
    compliance_status: ComplianceStatus = ComplianceStatus.PENDING_REVIEW


# Address Schemas
class AddressBase(BaseModel):
    """Base address schema."""

    address_type: Literal["HEADQUARTERS", "BRANCH", "REGISTERED", "MAILING"]
    street_address: constr(min_length=1, max_length=255)
    city: constr(min_length=1, max_length=100)
    state: constr(min_length=2, max_length=2)
    postal_code: constr(regex=r"^\d{5}(-\d{4})?$")
    country: constr(min_length=2, max_length=3) = "USA"


class AddressCreate(AddressBase):
    """Schema for creating addresses."""

    pass


class Address(AddressBase, AuditableSchema):
    """Complete address schema."""

    id: UUID
    business_entity_id: UUID


# Contact Information Schemas
class ContactInfoBase(BaseModel):
    """Base contact information schema."""

    primary_email: EmailStr
    secondary_email: Optional[EmailStr] = None
    primary_phone: constr(
        regex=r"^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$"
    )
    secondary_phone: Optional[
        constr(regex=r"^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$")
    ] = None
    website: Optional[str] = None


class ContactInfoCreate(ContactInfoBase):
    """Schema for creating contact information."""

    pass


class ContactInfo(ContactInfoBase, AuditableSchema):
    """Complete contact information schema."""

    id: UUID
    business_entity_id: UUID


# Ownership Structure Schemas
class OwnershipStructureBase(BaseModel):
    """Base ownership structure schema."""

    total_shares: Optional[int] = Field(None, ge=1)
    authorized_shares: Optional[int] = Field(None, ge=1)
    par_value: Optional[Decimal] = Field(None, ge=0)
    is_publicly_traded: bool = False
    stock_exchange: Optional[str] = None
    ticker_symbol: Optional[constr(max_length=10)] = None


class OwnershipStructureCreate(OwnershipStructureBase):
    """Schema for creating ownership structures."""

    pass


class OwnershipStructure(OwnershipStructureBase, AuditableSchema):
    """Complete ownership structure schema."""

    id: UUID
    business_entity_id: UUID
    ownership_records: List["OwnershipRecord"] = []


# Ownership Record Schemas
class OwnershipRecordBase(BaseModel):
    """Base ownership record schema."""

    owner_name: constr(min_length=1, max_length=255)
    owner_type: Literal["INDIVIDUAL", "ENTITY", "TRUST", "GOVERNMENT"]
    ownership_percentage: confloat(ge=0, le=100)
    shares_owned: Optional[int] = Field(None, ge=0)
    voting_rights: Optional[confloat(ge=0, le=100)] = None
    control_rights: Optional[confloat(ge=0, le=100)] = None
    is_foreign_ownership: bool = False
    country_of_origin: Optional[str] = None


class OwnershipRecordCreate(OwnershipRecordBase):
    """Schema for creating ownership records."""

    pass


class OwnershipRecord(OwnershipRecordBase, AuditableSchema):
    """Complete ownership record schema."""

    id: UUID
    ownership_structure_id: UUID


# FOCI Assessment Schemas
class FOCIAssessmentBase(BaseModel):
    """Base FOCI assessment schema."""

    assessment_type: Literal["INITIAL", "PERIODIC", "TRIGGERED", "SPECIAL"]
    scope: constr(min_length=1, max_length=500)
    methodology: Optional[str] = None
    risk_factors: List[str] = []
    mitigation_measures: List[str] = []


class FOCIAssessmentCreate(FOCIAssessmentBase):
    """Schema for creating FOCI assessments."""

    business_entity_id: UUID


class FOCIAssessmentUpdate(BaseModel):
    """Schema for updating FOCI assessments."""

    scope: Optional[constr(min_length=1, max_length=500)] = None
    methodology: Optional[str] = None
    risk_factors: Optional[List[str]] = None
    mitigation_measures: Optional[List[str]] = None
    status: Optional[Literal["IN_PROGRESS", "COMPLETED", "UNDER_REVIEW"]] = None


class FOCIAssessment(FOCIAssessmentBase, AuditableSchema):
    """Complete FOCI assessment schema."""

    id: UUID
    business_entity_id: UUID
    status: Literal["IN_PROGRESS", "COMPLETED", "UNDER_REVIEW"] = "IN_PROGRESS"
    risk_level: Optional[FOCIRiskLevel] = None
    score: Optional[confloat(ge=0, le=100)] = None
    findings: List["FOCIFinding"] = []
    recommendations: List[str] = []
    next_review_date: Optional[date] = None


# FOCI Finding Schemas
class FOCIFindingBase(BaseModel):
    """Base FOCI finding schema."""

    finding_type: Literal["RISK", "VULNERABILITY", "NON_COMPLIANCE", "CONCERN"]
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    title: constr(min_length=1, max_length=255)
    description: constr(min_length=1, max_length=2000)
    remediation_required: bool = False
    remediation_timeline: Optional[int] = Field(None, ge=1)  # days


class FOCIFindingCreate(FOCIFindingBase):
    """Schema for creating FOCI findings."""

    pass


class FOCIFinding(FOCIFindingBase, AuditableSchema):
    """Complete FOCI finding schema."""

    id: UUID
    foci_assessment_id: UUID
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED", "ACCEPTED"] = "OPEN"
    remediation_plan: Optional[str] = None
    resolution_notes: Optional[str] = None


# FCL Application Schemas
class FCLApplicationBase(BaseModel):
    """Base FCL application schema."""

    application_type: Literal["INITIAL", "RENEWAL", "AMENDMENT", "REINSTATEMENT"]
    clearance_level: SecurityClearanceLevel
    facility_name: constr(min_length=1, max_length=255)
    purpose: constr(min_length=1, max_length=1000)
    contract_numbers: List[str] = []
    estimated_start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None


class FCLApplicationCreate(FCLApplicationBase):
    """Schema for creating FCL applications."""

    business_entity_id: UUID


class FCLApplicationUpdate(BaseModel):
    """Schema for updating FCL applications."""

    clearance_level: Optional[SecurityClearanceLevel] = None
    facility_name: Optional[constr(min_length=1, max_length=255)] = None
    purpose: Optional[constr(min_length=1, max_length=1000)] = None
    contract_numbers: Optional[List[str]] = None
    estimated_start_date: Optional[date] = None
    estimated_end_date: Optional[date] = None
    status: Optional[FCLStatus] = None


class FCLApplication(FCLApplicationBase, AuditableSchema):
    """Complete FCL application schema."""

    id: UUID
    business_entity_id: UUID
    application_number: str
    status: FCLStatus = FCLStatus.PENDING
    submitted_date: Optional[date] = None
    review_start_date: Optional[date] = None
    decision_date: Optional[date] = None
    approval_date: Optional[date] = None
    expiration_date: Optional[date] = None
    denial_reason: Optional[str] = None
    conditions: List[str] = []
    documents: List["Document"] = []


# Document Schemas
class DocumentBase(BaseModel):
    """Base document schema."""

    title: constr(min_length=1, max_length=255)
    document_type: Literal[
        "APPLICATION", "SUPPORTING", "COMPLIANCE", "LEGAL", "FINANCIAL"
    ]
    classification: Optional[SecurityClearanceLevel] = None
    description: Optional[str] = None
    file_size: Optional[int] = Field(None, ge=0)
    mime_type: Optional[str] = None
    checksum: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Schema for creating documents."""

    file_content: Optional[bytes] = None  # For direct upload
    s3_key: Optional[str] = None  # For S3 reference


class Document(DocumentBase, AuditableSchema):
    """Complete document schema."""

    id: UUID
    fcl_application_id: Optional[UUID] = None
    business_entity_id: Optional[UUID] = None
    s3_bucket: Optional[str] = None
    s3_key: Optional[str] = None
    is_encrypted: bool = False
    encryption_key_id: Optional[str] = None
    access_permissions: Dict[str, Any] = {}


# Compliance Event Schemas
class ComplianceEventBase(BaseModel):
    """Base compliance event schema."""

    event_type: Literal["REVIEW", "AUDIT", "VIOLATION", "REMEDIATION", "CERTIFICATION"]
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    title: constr(min_length=1, max_length=255)
    description: constr(min_length=1, max_length=2000)
    regulatory_reference: Optional[str] = None
    due_date: Optional[date] = None


class ComplianceEventCreate(ComplianceEventBase):
    """Schema for creating compliance events."""

    business_entity_id: UUID


class ComplianceEvent(ComplianceEventBase, AuditableSchema):
    """Complete compliance event schema."""

    id: UUID
    business_entity_id: UUID
    status: Literal["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE"] = "OPEN"
    resolution_notes: Optional[str] = None
    resolved_date: Optional[date] = None
    assigned_to: Optional[UUID] = None


# Audit Log Schemas
class AuditLogBase(BaseModel):
    """Base audit log schema."""

    operation_type: Literal["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT"]
    table_name: Optional[str] = None
    record_id: Optional[str] = None
    changes: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None


class AuditLog(AuditLogBase, TimestampedSchema):
    """Complete audit log schema."""

    id: UUID
    user_id: Optional[UUID] = None
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


# User Schemas
class UserBase(BaseModel):
    """Base user schema."""

    username: constr(min_length=3, max_length=50)
    email: EmailStr
    first_name: constr(min_length=1, max_length=100)
    last_name: constr(min_length=1, max_length=100)
    phone: Optional[
        constr(regex=r"^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$")
    ] = None


class UserCreate(UserBase):
    """Schema for creating users."""

    password: constr(min_length=8, max_length=128)
    clearance_level: Optional[SecurityClearanceLevel] = None


class UserUpdate(BaseModel):
    """Schema for updating users."""

    email: Optional[EmailStr] = None
    first_name: Optional[constr(min_length=1, max_length=100)] = None
    last_name: Optional[constr(min_length=1, max_length=100)] = None
    phone: Optional[
        constr(regex=r"^\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$")
    ] = None
    is_active: Optional[bool] = None


class User(UserBase, AuditableSchema):
    """Complete user schema."""

    id: UUID
    is_active: bool = True
    clearance_level: Optional[SecurityClearanceLevel] = None
    last_login: Optional[datetime] = None
    login_count: int = 0
    roles: List["Role"] = []


# Role and Permission Schemas
class RoleBase(BaseModel):
    """Base role schema."""

    name: constr(min_length=1, max_length=100)
    description: Optional[str] = None


class Role(RoleBase, AuditableSchema):
    """Complete role schema."""

    id: UUID
    permissions: List["Permission"] = []


class PermissionBase(BaseModel):
    """Base permission schema."""

    name: constr(min_length=1, max_length=100)
    resource: constr(min_length=1, max_length=100)
    action: Literal["CREATE", "READ", "UPDATE", "DELETE", "EXECUTE"]


class Permission(PermissionBase, AuditableSchema):
    """Complete permission schema."""

    id: UUID


# Response Schemas
class MessageResponse(BaseModel):
    """Generic message response."""

    message: str
    success: bool = True


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""

    items: List[Any]
    total: int
    page: int
    per_page: int
    pages: int


class HealthCheckResponse(BaseModel):
    """Health check response."""

    status: Literal["healthy", "unhealthy"]
    timestamp: datetime
    version: str
    services: Dict[str, str]


# Initial Access / Onboarding Schemas
class InitialAccessLinkRequest(BaseModel):
    """Request to validate an initial access link."""

    token: str = Field(..., min_length=32, max_length=512)
    source: Optional[str] = Field(
        None, max_length=100
    )  # "DARPA_BRIDGES", "MANUAL", etc.


class InitialAccessLinkResponse(BaseModel):
    """Response for initial access link validation."""

    valid: bool
    expires_at: Optional[datetime] = None
    user_info: Optional[Dict[str, Any]] = None
    company_info: Optional[Dict[str, Any]] = None
    source: Optional[str] = None


class ContactInferenceRequest(BaseModel):
    """Request to infer contact information from partial data."""

    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    company_name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    additional_data: Optional[Dict[str, Any]] = {}


class ContactInferenceResponse(BaseModel):
    """Response with inferred contact information."""

    confidence_score: float = Field(..., ge=0.0, le=1.0)
    inferred_data: Dict[str, Any]
    missing_fields: List[str]
    suggestions: List[Dict[str, Any]]


class CompanyMatchRequest(BaseModel):
    """Request to match a company against existing records."""

    company_name: str = Field(..., max_length=200)
    ein: Optional[str] = Field(None, max_length=20)
    duns: Optional[str] = Field(None, max_length=20)
    cage_code: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    fuzzy_match: bool = Field(default=True)
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0)


class CompanyMatchResponse(BaseModel):
    """Response with company matching results."""

    matches: List[Dict[str, Any]]
    best_match: Optional[Dict[str, Any]] = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    is_new_company: bool
    suggested_cage_codes: List[str] = []


class TestEntityRequest(BaseModel):
    """Request to create or retrieve test entity baseline."""

    entity_type: Literal["COMPANY", "INDIVIDUAL", "FOREIGN_ENTITY"]
    scenario: str = Field(
        ..., max_length=100
    )  # "BASIC_CONTRACTOR", "FOCI_COMPLEX", etc.
    include_sample_data: bool = Field(default=True)


class TestEntityResponse(BaseModel):
    """Response with test entity baseline data."""

    entity_id: UUID
    entity_type: str
    scenario: str
    baseline_data: Dict[str, Any]
    sample_documents: List[Dict[str, Any]] = []
    next_steps: List[str] = []


class SecureOnboardingRequest(BaseModel):
    """Comprehensive request for secure user onboarding."""

    access_token: str = Field(..., min_length=32, max_length=512)
    contact_info: ContactInferenceRequest
    company_info: Optional[CompanyMatchRequest] = None
    create_test_entity: Optional[TestEntityRequest] = None
    agreed_to_terms: bool = Field(..., description="User must agree to terms")
    source_metadata: Optional[Dict[str, Any]] = {}


class SecureOnboardingResponse(BaseModel):
    """Response for secure onboarding completion."""

    success: bool
    user_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    test_entity_id: Optional[UUID] = None
    session_token: Optional[str] = None
    next_steps: List[str] = []
    warnings: List[str] = []
    errors: List[str] = []


# Forward references resolution
BusinessEntityCreate.model_rebuild()
BusinessEntity.model_rebuild()
OwnershipStructure.model_rebuild()
FOCIAssessment.model_rebuild()
FCLApplication.model_rebuild()
User.model_rebuild()
Role.model_rebuild()

# Export all schemas
__all__ = [
    # Base classes
    "TimestampedSchema",
    "AuditableSchema",
    # Enums
    "SecurityClearanceLevel",
    "FCLStatus",
    "FOCIRiskLevel",
    "ComplianceStatus",
    "BusinessEntityType",
    # Business Entity
    "BusinessEntityBase",
    "BusinessEntityCreate",
    "BusinessEntityUpdate",
    "BusinessEntity",
    # Address
    "AddressBase",
    "AddressCreate",
    "Address",
    # Contact Info
    "ContactInfoBase",
    "ContactInfoCreate",
    "ContactInfo",
    # Ownership
    "OwnershipStructureBase",
    "OwnershipStructureCreate",
    "OwnershipStructure",
    "OwnershipRecordBase",
    "OwnershipRecordCreate",
    "OwnershipRecord",
    # FOCI Assessment
    "FOCIAssessmentBase",
    "FOCIAssessmentCreate",
    "FOCIAssessmentUpdate",
    "FOCIAssessment",
    "FOCIFindingBase",
    "FOCIFindingCreate",
    "FOCIFinding",
    # FCL Application
    "FCLApplicationBase",
    "FCLApplicationCreate",
    "FCLApplicationUpdate",
    "FCLApplication",
    # Document
    "DocumentBase",
    "DocumentCreate",
    "Document",
    # Compliance
    "ComplianceEventBase",
    "ComplianceEventCreate",
    "ComplianceEvent",
    # Audit
    "AuditLogBase",
    "AuditLog",
    # User Management
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "User",
    "RoleBase",
    "Role",
    "PermissionBase",
    "Permission",
    # Responses
    "MessageResponse",
    "PaginatedResponse",
    "HealthCheckResponse",
    # Initial Access / Onboarding
    "InitialAccessLinkRequest",
    "InitialAccessLinkResponse",
    "ContactInferenceRequest",
    "ContactInferenceResponse",
    "CompanyMatchRequest",
    "CompanyMatchResponse",
    "TestEntityRequest",
    "TestEntityResponse",
    "SecureOnboardingRequest",
    "SecureOnboardingResponse",
]
