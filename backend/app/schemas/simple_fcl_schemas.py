"""
Simple FCL Application Schemas

Schemas for the simplified FCL application process where:
1. FSO is the package originator and owner
2. One FCL case per business entity at any time
3. Application states: "Not Started", "In Progress", "Components Complete", "Ready for Submission"
"""

from datetime import date, datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


class FCLApplicationStatus(str, Enum):
    """FCL Application status states."""

    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPONENTS_COMPLETE = "COMPONENTS_COMPLETE"
    READY_FOR_SUBMISSION = "READY_FOR_SUBMISSION"
    SUBMITTED_TO_DCSA = "SUBMITTED_TO_DCSA"


class BusinessEntityRequest(BaseModel):
    """Business entity information for FCL application."""

    company_name: str = Field(..., min_length=1, max_length=200)
    uei: str = Field(..., description="Unique Entity Identifier from SAM.gov")
    duns: Optional[str] = Field(None, max_length=20)
    ein: Optional[str] = Field(None, max_length=15)
    cage_code: Optional[str] = Field(None, max_length=10)

    # Address information
    street_address: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=2, max_length=2)
    postal_code: str = Field(..., max_length=10)
    country: str = Field(default="USA", max_length=3)

    @validator("postal_code")
    def validate_postal_code(cls, v):
        import re

        if not re.match(r"^\d{5}(-\d{4})?$", v):
            raise ValueError("Invalid postal code format")
        return v

    # Contact information
    primary_phone: str = Field(..., max_length=20)
    primary_email: EmailStr
    website: Optional[str] = None


class FCLApplicationCreate(BaseModel):
    """Create new FCL application."""

    business_entity: BusinessEntityRequest
    requested_clearance_level: str = Field(
        ..., description="CONFIDENTIAL, SECRET, TOP_SECRET"
    )
    justification: str = Field(..., min_length=50, max_length=2000)
    expected_contract_value: Optional[float] = Field(None, ge=0)
    expected_start_date: Optional[date] = None


class FCLApplicationUpdate(BaseModel):
    """Update FCL application."""

    status: Optional[FCLApplicationStatus] = None
    justification: Optional[str] = Field(None, min_length=50, max_length=2000)
    expected_contract_value: Optional[float] = Field(None, ge=0)
    expected_start_date: Optional[date] = None
    completion_notes: Optional[str] = None


class FCLApplicationResponse(BaseModel):
    """FCL application response."""

    id: UUID
    application_number: str
    status: FCLApplicationStatus
    business_entity: dict
    requested_clearance_level: str
    justification: str
    expected_contract_value: Optional[float]
    expected_start_date: Optional[date]

    # Application components tracking
    components_status: Dict[str, bool] = Field(
        default_factory=lambda: {
            "business_entity_verified": False,
            "ownership_structure_complete": False,
            "key_management_complete": False,
            "security_plan_complete": False,
            "foci_assessment_complete": False,
            "supporting_documents_complete": False,
        }
    )

    completion_percentage: float = Field(default=0.0, ge=0.0, le=100.0)

    # Audit fields
    created_at: datetime
    updated_at: datetime
    created_by: UUID
    updated_by: UUID

    # FSO/Company management
    fso_email: str
    company_name: str
    contributors: List[dict] = Field(default_factory=list)


class KMPRequest(BaseModel):
    """Key Management Personnel request."""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., max_length=20)
    position_title: str = Field(..., min_length=1, max_length=200)
    clearance_level: Optional[str] = None
    citizenship: str = Field(default="US", max_length=3)
    date_of_birth: date
    ssn_last_four: str = Field(..., max_length=4)

    @validator("ssn_last_four")
    def validate_ssn_last_four(cls, v):
        import re

        if not re.match(r"^\d{4}$", v):
            raise ValueError("SSN last four must be 4 digits")
        return v


class KMPResponse(BaseModel):
    """Key Management Personnel response."""

    id: UUID
    fcl_application_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str
    position_title: str
    clearance_level: Optional[str]
    citizenship: str

    # Verification status
    background_check_status: str = Field(default="PENDING")
    clearance_verification_status: str = Field(default="PENDING")

    created_at: datetime
    updated_at: datetime


class DocumentUploadRequest(BaseModel):
    """Document upload request."""

    document_type: str = Field(
        ..., description="Type of document (ARTICLES_OF_INCORPORATION, etc.)"
    )
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., ge=1)
    mime_type: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class DocumentResponse(BaseModel):
    """Document response."""

    id: UUID
    fcl_application_id: UUID
    document_type: str
    file_name: str
    file_size: int
    mime_type: str
    description: Optional[str]
    upload_status: str = Field(default="PENDING")
    verification_status: str = Field(default="PENDING")

    uploaded_at: datetime
    uploaded_by: UUID


class OwnershipRecordRequest(BaseModel):
    """Ownership record request."""

    owner_name: str = Field(..., min_length=1, max_length=255)
    owner_type: str = Field(..., description="INDIVIDUAL, ENTITY, TRUST, GOVERNMENT")
    ownership_percentage: float = Field(..., ge=0.0, le=100.0)
    voting_rights_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    is_foreign_ownership: bool = Field(default=False)
    country_of_origin: Optional[str] = Field(None, max_length=3)


class OwnershipStructureRequest(BaseModel):
    """Ownership structure request."""

    total_shares: Optional[int] = Field(None, ge=1)
    authorized_shares: Optional[int] = Field(None, ge=1)
    is_publicly_traded: bool = Field(default=False)
    stock_exchange: Optional[str] = None
    ticker_symbol: Optional[str] = None
    ownership_records: List[OwnershipRecordRequest] = []


class ApplicationSummaryResponse(BaseModel):
    """Application summary for dashboard."""

    application_id: UUID
    application_number: str
    company_name: str
    status: FCLApplicationStatus
    completion_percentage: float
    last_updated: datetime
    days_since_created: int
    next_steps: List[str]
    outstanding_items: List[str]
