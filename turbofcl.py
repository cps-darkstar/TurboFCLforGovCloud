from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ProcessingStatus(str, Enum):
    IDLE = "idle"
    FETCHING = "fetching"
    VALIDATING = "validating"
    COMPLETE = "complete"
    ERROR = "error"

class EntityType(str, Enum):
    LLC = "llc"
    CORPORATION = "corporation"
    PUBLIC_CORPORATION = "public-corporation"
    GENERAL_PARTNERSHIP = "general-partnership"
    LIMITED_PARTNERSHIP = "limited-partnership"
    SOLE_PROPRIETORSHIP = "sole-proprietorship"

class FOCIStatus(str, Enum):
    NO_FOCI = "no-foci"
    FOREIGN_INVESTORS = "foreign-investors"
    FOREIGN_OWNERSHIP = "foreign-ownership"
    FOREIGN_BOARD_MEMBERS = "foreign-board-members"
    FOREIGN_CONTRACTS = "foreign-contracts"
    FOREIGN_TECHNOLOGY = "foreign-technology"

class FCLApplicationCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=500)
    uei: Optional[str] = Field(None, pattern="^[A-Z0-9]{12}$")
    cage_code: Optional[str] = Field(None, max_length=10)
    entity_type: Optional[EntityType] = None
    foci_status: List[FOCIStatus] = Field(default_factory=list)

class FCLApplicationResponse(BaseModel):
    application_id: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)

class ChatResponse(BaseModel):
    response: str
    sources: List[str] = Field(default_factory=list)

class ValidationIssue(BaseModel):
    type: str = Field(..., pattern="^(error|warning)$")
    field: str
    message: str
    source: str

class AIInsight(BaseModel):
    type: str = Field(..., pattern="^(recommendation|warning|info)$")
    message: str
    confidence: float = Field(..., ge=0.0, le=1.0)

class ValidationResponse(BaseModel):
    issues: List[ValidationIssue] = Field(default_factory=list)
    insights: List[AIInsight] = Field(default_factory=list)

class KMPData(BaseModel):
    full_name: str
    role: str
    citizenship_status: Optional[str] = None
    clearance_required: bool = True
    clearance_level: Optional[str] = None
    extracted_by_ai: bool = False
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)

class KMPExtraction(BaseModel):
    kmps: List[KMPData]

class DocumentUploadResponse(BaseModel):
    document_id: str
    status: str
    extracted_data: Optional[Dict[str, Any]] = None

class SAMData(BaseModel):
    legal_business_name: str
    uei: str
    cage_code: str
    entity_structure: str
    state_of_incorporation: str
    principal_place_of_business: str
    registration_status: str
    last_updated: str

class EDGARFiling(BaseModel):
    form_type: str
    filing_date: str
    description: str

class OwnershipInfo(BaseModel):
    institutional_ownership: str
    foreign_ownership: str
    insider_ownership: str

class EDGARData(BaseModel):
    cik: str
    filings: List[EDGARFiling]
    ownership_info: OwnershipInfo

class ApplicationStatus(BaseModel):
    id: str
    company_name: str
    uei: Optional[str]
    cage_code: Optional[str]
    entity_type: Optional[EntityType]
    foci_status: List[FOCIStatus]
    sam_data: Optional[SAMData]
    edgar_data: Optional[EDGARData]
    validation_issues: List[ValidationIssue]
    ai_insights: List[AIInsight]
    processing_status: ProcessingStatus
    status: str
    created_at: datetime
    updated_at: datetime

class SubmissionResponse(BaseModel):
    submission_id: str
    status: str
    message: str

class PackageGenerationResponse(BaseModel):
    package_url: str
    documents: List[str] 