"""
TurboFCL Pydantic Schemas
Data models for FCL application system
"""

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class EntityType(str, Enum):
    SOLE_PROPRIETORSHIP = "sole-proprietorship"
    GENERAL_PARTNERSHIP = "general-partnership"
    LIMITED_PARTNERSHIP = "limited-partnership"
    CORPORATION = "corporation"
    PUBLIC_CORPORATION = "public-corporation"
    LLC = "llc"


class FOCIStatus(str, Enum):
    NO_FOCI = "no-foci"
    FOREIGN_INVESTORS = "foreign-investors"
    FOREIGN_OWNERSHIP = "foreign-ownership"
    FOREIGN_BOARD_MEMBERS = "foreign-board-members"
    FOREIGN_CONTRACTS = "foreign-contracts"
    FOREIGN_TECHNOLOGY = "foreign-technology"
    FOREIGN_DEBT = "foreign-debt"


class ValidationIssue(BaseModel):
    type: str = Field(..., description="error, warning, or info")
    field: str = Field(..., description="Field that has the issue")
    message: str = Field(..., description="Human-readable error message")
    source: str = Field(
        ..., description="Source of validation (e.g., 'Field Validation', 'SAM.gov')"
    )


class AIInsight(BaseModel):
    type: str = Field(..., description="recommendation, warning, or info")
    message: str = Field(..., description="AI-generated insight")
    confidence: float = Field(default=0.85, description="Confidence score 0-1")


class SAMData(BaseModel):
    legal_business_name: str
    uei: str
    cage_code: Optional[str] = None
    entity_structure: str
    state_of_incorporation: Optional[str] = None
    registration_status: str
    last_updated: str


class EDGARData(BaseModel):
    cik: str
    filings: List[Dict[str, Any]] = []
    ownership_info: Optional[Dict[str, Any]] = None


class FCLApplicationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=500)
    uei: Optional[str] = Field(None, regex=r"^[A-Z0-9]{12}$")
    cage_code: Optional[str] = Field(None, max_length=10)
    entity_type: EntityType
    foci_status: List[FOCIStatus] = Field(default=[FOCIStatus.NO_FOCI])

    @validator("foci_status")
    def validate_foci_status(cls, v):
        if FOCIStatus.NO_FOCI in v and len(v) > 1:
            raise ValueError("Cannot have both 'no-foci' and other FOCI conditions")
        return v

    @validator("uei")
    def validate_uei_format(cls, v):
        if v and not re.match(r"^[A-Z0-9]{12}$", v):
            raise ValueError("UEI must be exactly 12 alphanumeric characters")
        return v


class FCLApplicationUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=500)
    uei: Optional[str] = Field(None, regex=r"^[A-Z0-9]{12}$")
    cage_code: Optional[str] = Field(None, max_length=10)
    entity_type: Optional[EntityType] = None
    foci_status: Optional[List[FOCIStatus]] = None
    sam_data: Optional[SAMData] = None
    edgar_data: Optional[EDGARData] = None


class ApplicationResponse(BaseModel):
    id: str
    status: str
    created_at: str
    tracking_number: Optional[str] = None


class KMPCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=500)
    role: str = Field(..., min_length=1, max_length=100)
    citizenship_status: Optional[str] = Field(None, max_length=50)
    clearance_required: bool = Field(default=True)
    clearance_level: Optional[str] = Field(None, max_length=50)


class KMPResponse(BaseModel):
    id: str
    full_name: str
    role: str
    citizenship_status: Optional[str] = None
    clearance_required: bool
    clearance_level: Optional[str] = None
    extracted_by_ai: bool = False
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    status: str
    extracted_data: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []


class ValidationRequest(BaseModel):
    application_id: str


class ValidationResponse(BaseModel):
    validation_issues: List[ValidationIssue]
    ai_insights: List[AIInsight]
    validation_passed: bool


class SubmissionResponse(BaseModel):
    status: str
    tracking_number: str
    estimated_processing_time: str


class FOCIMitigationResponse(BaseModel):
    has_foci: bool
    conditions: List[str]
    mitigation_required: Optional[str] = None
    processing_time: str
    mitigation_descriptions: Dict[str, str]


# User management schemas
class UserCreate(BaseModel):
    email: str = Field(..., regex=r"^[^@]+@[^@]+\.[^@]+$")
    company_name: str = Field(..., min_length=1, max_length=500)
    security_clearance: Optional[str] = None
    dcsa_facility_id: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    company_name: str
    security_clearance: Optional[str] = None
    dcsa_facility_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Health check schema
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
