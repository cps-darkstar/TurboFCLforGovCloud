"""
Simplified FSO Authentication Schemas for TurboFCL

Pydantic models for FSO-centric authentication and account management.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


# FSO Registration and Authentication
class FSORegistrationRequest(BaseModel):
    """Request to register a new FSO account."""

    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    company_name: str = Field(..., min_length=1, max_length=200)
    uei: Optional[str] = Field(
        None, max_length=50, description="Unique Entity Identifier from SAM.gov"
    )
    phone: Optional[str] = Field(None, max_length=20)
    fso_name: Optional[str] = Field(
        None, max_length=200, description="Facility Security Officer full name"
    )

    @validator("email")
    def email_must_be_valid(cls, v):
        if "@" not in v:
            raise ValueError("Must be a valid email address")
        return v.lower()


class FSORegistrationResponse(BaseModel):
    """Response after FSO registration."""

    success: bool
    user_id: UUID
    company_id: UUID
    fcl_application_id: UUID
    message: str
    next_steps: List[str]


class FSOLoginRequest(BaseModel):
    """FSO login request."""

    email: EmailStr
    password: str


class FSOLoginResponse(BaseModel):
    """FSO login response with session information."""

    success: bool
    user_id: UUID
    company_id: UUID
    fcl_application_id: UUID
    session_token: str
    expires_at: datetime
    user_role: str = "FSO"
    is_admin: bool = True
    permissions: Dict[str, List[str]]


# Company User Management
class CreateCompanyUserRequest(BaseModel):
    """Request to create a new user for the FSO's company."""

    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(
        default="KMP", description="User role: KMP, SECURITY_PERSONNEL, etc."
    )
    permissions: Optional[List[str]] = Field(
        default=["read"], description="User permissions"
    )
    phone: Optional[str] = Field(None, max_length=20)


class CreateCompanyUserResponse(BaseModel):
    """Response after creating a company user."""

    success: bool
    user_id: UUID
    message: str
    permissions: List[str]
    fcl_access: str = "contributor"


class CompanyUser(BaseModel):
    """Company user information."""

    id: UUID
    email: str
    first_name: str
    last_name: str
    role: str
    is_admin: bool
    permissions: List[str]
    last_login: Optional[datetime] = None
    is_active: bool
    created_at: Optional[datetime] = None


class UpdateUserPermissionsRequest(BaseModel):
    """Request to update user permissions."""

    user_id: UUID
    permissions: List[str]


# FCL Application Status
class FCLApplicationComponent(BaseModel):
    """Individual FCL application component status."""

    complete: bool
    required: bool
    last_updated: Optional[datetime] = None


class FCLApplicationStatus(BaseModel):
    """Current status of the company's FCL application."""

    company_id: UUID
    fcl_application_id: UUID
    status: str
    progress_percentage: float = Field(..., ge=0.0, le=100.0)
    components: Dict[str, FCLApplicationComponent]
    last_updated: datetime
    next_required_action: str
    can_submit: bool


# Account Management Forms (matching your requirements)
class AccountRequestForm(BaseModel):
    """Form for requesting account access - matches your improved form."""

    # FSO Information (primary contact)
    fso_name: str = Field(
        ..., min_length=1, max_length=200, description="Facility Security Officer name"
    )
    fso_email: EmailStr = Field(..., description="FSO email address")
    fso_phone: str = Field(..., max_length=20, description="FSO phone number")

    # Company Information
    company_name: str = Field(
        ..., min_length=1, max_length=200, description="Legal company name"
    )
    uei: Optional[str] = Field(
        None, max_length=50, description="Unique Entity Identifier from SAM.gov"
    )

    # Additional context
    request_reason: Optional[str] = Field(
        None, max_length=1000, description="Reason for FCL application"
    )
    estimated_personnel_count: Optional[int] = Field(
        None, ge=1, description="Estimated number of personnel requiring clearance"
    )

    # Agreement
    agrees_to_terms: bool = Field(..., description="Must agree to terms and conditions")

    @validator("uei")
    def validate_uei(cls, v):
        if v and len(v) != 12:
            raise ValueError("UEI must be exactly 12 characters")
        return v


class AccountRequestResponse(BaseModel):
    """Response to account request."""

    success: bool
    message: str
    request_id: Optional[UUID] = None
    next_steps: List[str]
    redirect_to_sam_gov: bool = False
    sam_gov_url: Optional[str] = None


# System Status
class SystemStatus(BaseModel):
    """Current system status for user dashboard."""

    user_id: UUID
    company_id: UUID
    fcl_application_id: UUID
    user_role: str
    is_admin: bool
    company_name: str
    fcl_status: str
    progress_percentage: float
    pending_actions: List[str]
    recent_activity: List[Dict[str, Any]] = []


# Export all schemas
__all__ = [
    "FSORegistrationRequest",
    "FSORegistrationResponse",
    "FSOLoginRequest",
    "FSOLoginResponse",
    "CreateCompanyUserRequest",
    "CreateCompanyUserResponse",
    "CompanyUser",
    "UpdateUserPermissionsRequest",
    "FCLApplicationComponent",
    "FCLApplicationStatus",
    "AccountRequestForm",
    "AccountRequestResponse",
    "SystemStatus",
]
