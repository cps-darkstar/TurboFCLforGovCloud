"""
TurboFCL Validation Service
Implements all business rules from extracted knowledge
"""

from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
import re
from enum import Enum

# Import from root-level schemas since app.schemas doesn't exist
from turbofcl import (
    EntityType, FOCIStatus, ValidationIssue, AIInsight,
    FCLApplicationCreate, SAMData, EDGARData
)

class ValidationSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class BusinessRules:
    """Constants matching frontend business rules"""
    
    # Entity requirements
    ENTITY_REQUIREMENTS = {
        EntityType.SOLE_PROPRIETORSHIP: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Recent changes to company Structure"
            ],
            "kmps": [
                "Owner of sole proprietorship",
                "Senior Management Official (SMO)",
                "FSO",
                "ITPSO"
            ],
            "min_kmp_count": 4
        },
        EntityType.LLC: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Certificate of Formation or Articles of Organization",
                "Legal Organization Chart",
                "Operating Agreement",
                "LLC Meeting Minutes",
                "Recent changes to company structure",
                "FSO/ITPSO Appointment Letter",
                "KMP Citizenship Verification",
                "Signed undated DD Form 441",
                "Signed SF 328"
            ],
            "kmps": [
                "SMO",
                "FSO",
                "ITPSO",
                "LLC Members (if requiring classified access)",
                "Managers"
            ],
            "min_kmp_count": 4
        },
        EntityType.CORPORATION: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Articles of Incorporation",
                "By-Laws",
                "Stock Ledger",
                "Legal Organization Chart",
                "Board/Company Meeting Minutes",
                "Recent changes to company structure",
                "FSO/ITPSO Appointment Letter",
                "KMP Citizenship Verification",
                "Signed undated DD Form 441",
                "Signed SF 328"
            ],
            "kmps": [
                "SMO",
                "FSO",
                "ITPSO",
                "Chairman of the Board",
                "Vice Chair of Board (if applicable)",
                "Corporate Officials (if requiring classified access)"
            ],
            "min_kmp_count": 5
        },
        EntityType.PUBLIC_CORPORATION: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Articles of Incorporation",
                "By-Laws",
                "Stock Ledger",
                "Most recent SEC filings",
                "Legal Organization Chart",
                "Board/Company Meeting Minutes",
                "Recent changes to company Structure",
                "FSO/ITPSO Appointment Letter",
                "KMP Citizenship Verification",
                "Signed undated DD Form 441",
                "Signed SF 328"
            ],
            "kmps": [
                "SMO",
                "FSO",
                "ITPSO",
                "Chairman of the Board",
                "Vice Chair of Board (if applicable)",
                "Corporate Officials (if requiring classified access)"
            ],
            "min_kmp_count": 5
        },
        EntityType.GENERAL_PARTNERSHIP: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Partnership Agreement",
                "Legal Organization Chart",
                "Board/Company Meeting Minutes",
                "Recent changes to company Structure",
                "FSO/ITPSO Appointment Letter",
                "KMP Citizenship Verification",
                "Signed undated DD Form 441",
                "Signed SF 328"
            ],
            "kmps": [
                "SMO",
                "FSO",
                "ITPSO",
                "All General Partners"
            ],
            "min_kmp_count": 4
        },
        EntityType.LIMITED_PARTNERSHIP: {
            "documents": [
                "Business License",
                "Fictitious Name Certificate",
                "Partnership Agreement",
                "Certificate of Limited Partnership",
                "Legal Organization Chart",
                "Board/Company Meeting Minutes",
                "Recent changes to company structure",
                "FSO/ITPSO Appointment Letter",
                "KMP Citizenship Verification",
                "Signed undated DD Form 441",
                "Signed SF 328"
            ],
            "kmps": [
                "SMO",
                "FSO",
                "ITPSO",
                "All General Partners",
                "Limited Partners (if working on classified contracts)"
            ],
            "min_kmp_count": 4
        }
    }
    
    # FOCI thresholds
    FOCI_OWNERSHIP_THRESHOLD = 5.0  # 5% triggers FOCI
    FOCI_DEBT_THRESHOLD = 10_000_000  # $10M triggers FOCI
    FOCI_HIGH_OWNERSHIP_THRESHOLD = 10.0  # 10% requires SSA
    
    # Validation patterns
    UEI_PATTERN = re.compile(r"^[A-Z0-9]{12}$")
    CAGE_CODE_MAX_LENGTH = 10
    COMPANY_NAME_MAX_LENGTH = 500
    
    # SAM.gov entity mapping
    SAM_ENTITY_MAP = {
        "LIMITED LIABILITY COMPANY": EntityType.LLC,
        "CORPORATION": EntityType.CORPORATION,
        "PUBLICLY HELD CORPORATION": EntityType.PUBLIC_CORPORATION,
        "GENERAL PARTNERSHIP": EntityType.GENERAL_PARTNERSHIP,
        "LIMITED PARTNERSHIP": EntityType.LIMITED_PARTNERSHIP,
        "SOLE PROPRIETORSHIP": EntityType.SOLE_PROPRIETORSHIP
    }

class ValidationService:
    """
    Core validation service implementing all business rules
    """
    
    def __init__(self):
        self.rules = BusinessRules()
    
    async def validate_application(
        self,
        application: FCLApplicationCreate,
        sam_data: Optional[SAMData] = None,
        edgar_data: Optional[EDGARData] = None,
        uploaded_documents: List[str] = None,
        kmp_count: int = 0
    ) -> Tuple[List[ValidationIssue], List[AIInsight]]:
        """
        Comprehensive application validation
        Returns tuple of (validation_issues, ai_insights)
        """
        issues = []
        insights = []
        
        # Field-level validations
        issues.extend(self._validate_uei(application.uei))
        issues.extend(self._validate_company_name(application.company_name))
        issues.extend(self._validate_cage_code(application.cage_code))
        
        # Cross-field validations
        if sam_data and application.entity_type:
            issues.extend(self._validate_entity_type_match(
                application.entity_type, sam_data
            ))
        
        # FOCI validations
        issues.extend(self._validate_foci_status(application.foci_status))
        foci_insights = self._assess_foci_impact(application.foci_status)
        insights.extend(foci_insights)
        
        # Entity-specific validations
        if application.entity_type:
            # KMP count validation
            kmp_issues, kmp_insights = self._validate_kmp_requirements(
                application.entity_type, kmp_count
            )
            issues.extend(kmp_issues)
            insights.extend(kmp_insights)
            
            # Document validation
            if uploaded_documents:
                doc_issues, doc_insights = self._validate_document_requirements(
                    application.entity_type, uploaded_documents
                )
                issues.extend(doc_issues)
                insights.extend(doc_insights)
        
        # Public corporation specific
        if application.entity_type == EntityType.PUBLIC_CORPORATION:
            if not edgar_data or not edgar_data.filings:
                issues.append(ValidationIssue(
                    type="error",
                    field="documents",
                    message="Public corporations must provide SEC filings (10-K, 8-K, DEF 14A)",
                    source="Entity Validation"
                ))
        
        # SAM.gov status validation
        if sam_data:
            sam_issues = self._validate_sam_status(sam_data)
            issues.extend(sam_issues)
        
        # Add confidence scores to insights
        for insight in insights:
            if not hasattr(insight, 'confidence'):
                insight.confidence = 0.85  # Default confidence
        
        return issues, insights
    
    def _validate_uei(self, uei: Optional[str]) -> List[ValidationIssue]:
        """Validate UEI format"""
        issues = []
        
        if not uei:
            return issues  # UEI is optional
        
        uei_upper = uei.upper()
        if not self.rules.UEI_PATTERN.match(uei_upper):
            issues.append(ValidationIssue(
                type="error",
                field="uei",
                message="UEI must be exactly 12 characters (letters and numbers only). Example: ABC123DEF456",
                source="Field Validation"
            ))
        
        return issues
    
    def _validate_company_name(self, name: str) -> List[ValidationIssue]:
        """Validate company name"""
        issues = []
        
        if not name or not name.strip():
            issues.append(ValidationIssue(
                type="error",
                field="company_name",
                message="Company name is required",
                source="Field Validation"
            ))
        elif len(name) > self.rules.COMPANY_NAME_MAX_LENGTH:
            issues.append(ValidationIssue(
                type="error",
                field="company_name",
                message=f"Company name must be less than {self.rules.COMPANY_NAME_MAX_LENGTH} characters",
                source="Field Validation"
            ))
        
        # Check for special characters
        special_chars = ['&', '.', '-', "'"]
        if any(char in name for char in special_chars):
            issues.append(ValidationIssue(
                type="warning",
                field="company_name",
                message="Company name contains special characters. Ensure it matches your SAM.gov registration exactly.",
                source="Field Validation"
            ))
        
        return issues
    
    def _validate_cage_code(self, cage_code: Optional[str]) -> List[ValidationIssue]:
        """Validate CAGE code"""
        issues = []
        
        if cage_code and len(cage_code) > self.rules.CAGE_CODE_MAX_LENGTH:
            issues.append(ValidationIssue(
                type="error",
                field="cage_code",
                message=f"CAGE code must be {self.rules.CAGE_CODE_MAX_LENGTH} characters or less",
                source="Field Validation"
            ))
        
        return issues
    
    def _validate_entity_type_match(
        self, 
        selected_type: EntityType, 
        sam_data: SAMData
    ) -> List[ValidationIssue]:
        """Validate entity type matches SAM.gov"""
        issues = []
        
        sam_entity = sam_data.entity_structure.upper()
        expected_type = self.rules.SAM_ENTITY_MAP.get(sam_entity)
        
        if not expected_type:
            issues.append(ValidationIssue(
                type="warning",
                field="entity_type",
                message=f"Unknown SAM.gov entity structure: {sam_data.entity_structure}",
                source="SAM.gov Validation"
            ))
        elif expected_type != selected_type:
            issues.append(ValidationIssue(
                type="error",
                field="entity_type",
                message=f'Entity type mismatch: SAM.gov shows "{sam_data.entity_structure}" but you selected "{selected_type.value}". Please verify.',
                source="SAM.gov Validation"
            ))
        
        return issues
    
    def _validate_foci_status(self, foci_status: List[FOCIStatus]) -> List[ValidationIssue]:
        """Validate FOCI status selections"""
        issues = []
        
        if FOCIStatus.NO_FOCI in foci_status and len(foci_status) > 1:
            issues.append(ValidationIssue(
                type="error",
                field="foci_status",
                message="Contradictory FOCI selections: Cannot have both foreign investors and no FOCI.",
                source="FOCI Validation"
            ))
        
        return issues
    
    def _assess_foci_impact(self, foci_status: List[FOCIStatus]) -> List[AIInsight]:
        """Generate AI insights for FOCI conditions"""
        insights = []
        
        if any(status in [FOCIStatus.FOREIGN_INVESTORS, FOCIStatus.FOREIGN_OWNERSHIP] 
               for status in foci_status):
            insights.append(AIInsight(
                type="recommendation",
                message="Based on your FOCI status, you will likely need a Security Control Agreement (SCA) or Special Security Agreement (SSA). Consider preparing board resolutions and governance modifications.",
                confidence=0.85
            ))
        
        if FOCIStatus.FOREIGN_BOARD_MEMBERS in foci_status:
            insights.append(AIInsight(
                type="recommendation",
                message="Foreign board members require a Voting Trust Agreement or board resolution excluding them from classified matters. Start preparing these documents early.",
                confidence=0.90
            ))
        
        if len([s for s in foci_status if s != FOCIStatus.NO_FOCI]) >= 3:
            insights.append(AIInsight(
                type="warning",
                message="Multiple FOCI conditions detected. This will likely extend processing time to 90-120 days. Consider engaging a facility clearance consultant.",
                confidence=0.88
            ))
        
        return insights
    
    def _validate_kmp_requirements(
        self, 
        entity_type: EntityType, 
        kmp_count: int
    ) -> Tuple[List[ValidationIssue], List[AIInsight]]:
        """Validate KMP requirements by entity type"""
        issues = []
        insights = []
        
        requirements = self.rules.ENTITY_REQUIREMENTS.get(entity_type)
        if not requirements:
            return issues, insights
        
        min_count = requirements["min_kmp_count"]
        
        if kmp_count < min_count:
            issues.append(ValidationIssue(
                type="error",
                field="kmps",
                message=f"{entity_type.value.replace('-', ' ').title()} typically requires at least {min_count} KMPs. Ensure all required positions are identified.",
                source="KMP Validation"
            ))
            
            # Add helpful insight
            required_roles = requirements["kmps"][:min_count]
            insights.append(AIInsight(
                type="info",
                message=f"Required KMP roles for {entity_type.value}: {', '.join(required_roles)}",
                confidence=0.95
            ))
        
        return issues, insights
    
    def _validate_document_requirements(
        self, 
        entity_type: EntityType, 
        uploaded_documents: List[str]
    ) -> Tuple[List[ValidationIssue], List[AIInsight]]:
        """Validate document requirements by entity type"""
        issues = []
        insights = []
        
        requirements = self.rules.ENTITY_REQUIREMENTS.get(entity_type)
        if not requirements:
            return issues, insights
        
        required_docs = requirements["documents"]
        uploaded_lower = [doc.lower() for doc in uploaded_documents]
        
        missing_docs = []
        for req_doc in required_docs:
            if not any(req_doc.lower() in uploaded for uploaded in uploaded_lower):
                missing_docs.append(req_doc)
        
        if missing_docs:
            completion_rate = (len(required_docs) - len(missing_docs)) / len(required_docs)
            
            if completion_rate < 0.5:
                issues.append(ValidationIssue(
                    type="error",
                    field="documents",
                    message=f"Missing {len(missing_docs)} required documents. Upload all required documents before submission.",
                    source="Document Validation"
                ))
            else:
                issues.append(ValidationIssue(
                    type="warning",
                    field="documents",
                    message=f"Missing {len(missing_docs)} documents: {', '.join(missing_docs[:3])}{'...' if len(missing_docs) > 3 else ''}",
                    source="Document Validation"
                ))
            
            # Add helpful insight
            insights.append(AIInsight(
                type="info",
                message=f"You've uploaded {len(required_docs) - len(missing_docs)} of {len(required_docs)} required documents ({int(completion_rate * 100)}% complete)",
                confidence=1.0
            ))
        
        return issues, insights
    
    def _validate_sam_status(self, sam_data: SAMData) -> List[ValidationIssue]:
        """Validate SAM.gov registration status"""
        issues = []
        
        if sam_data.registration_status.upper() != "ACTIVE":
            issues.append(ValidationIssue(
                type="error",
                field="sam_registration",
                message="Your SAM.gov registration appears to be inactive. Please update your registration before proceeding.",
                source="SAM.gov Validation"
            ))
        
        # Check if registration is expiring soon
        try:
            last_updated = datetime.fromisoformat(sam_data.last_updated.replace('Z', '+00:00'))
            expiry_date = last_updated + timedelta(days=365)
            days_until_expiry = (expiry_date - datetime.now()).days
            
            if days_until_expiry < 30:
                issues.append(ValidationIssue(
                    type="warning",
                    field="sam_registration",
                    message=f"Your SAM.gov registration expires in {days_until_expiry} days. Consider renewing soon.",
                    source="SAM.gov Validation"
                ))
        except:
            pass  # Ignore date parsing errors
        
        return issues
    
    def calculate_foci_mitigation(
        self,
        foreign_ownership_percentage: float = 0,
        has_foreign_board_members: bool = False,
        foreign_debt_amount: float = 0,
        has_foreign_technology: bool = False,
        has_foreign_contracts: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate FOCI mitigation requirements based on conditions
        """
        conditions = []
        mitigation_type = None
        processing_time = "45-90 days"
        
        # Check ownership threshold
        if foreign_ownership_percentage >= self.rules.FOCI_OWNERSHIP_THRESHOLD:
            conditions.append("foreign-ownership")
            
            if foreign_ownership_percentage >= self.rules.FOCI_HIGH_OWNERSHIP_THRESHOLD:
                mitigation_type = "SSA"  # Special Security Agreement
            else:
                mitigation_type = "SCA"  # Security Control Agreement
        
        # Check foreign debt
        if foreign_debt_amount > self.rules.FOCI_DEBT_THRESHOLD:
            conditions.append("foreign-debt")
            if not mitigation_type:
                mitigation_type = "SCA"
        
        # Check board members
        if has_foreign_board_members:
            conditions.append("foreign-board-members")
            if not mitigation_type:
                mitigation_type = "VTA"  # Voting Trust Agreement
        
        # Check technology/contracts
        if has_foreign_technology:
            conditions.append("foreign-technology")
            if not mitigation_type:
                mitigation_type = "LSA"  # Limited Security Agreement
        
        if has_foreign_contracts:
            conditions.append("foreign-contracts")
            if not mitigation_type:
                mitigation_type = "LSA"
        
        # Adjust processing time based on complexity
        if len(conditions) > 0:
            processing_time = "60-120 days"
        if len(conditions) > 2 or mitigation_type == "SSA":
            processing_time = "90-180 days"
        
        return {
            "has_foci": len(conditions) > 0,
            "conditions": conditions,
            "mitigation_required": mitigation_type,
            "processing_time": processing_time,
            "mitigation_descriptions": {
                "SSA": "Special Security Agreement - Required for significant foreign ownership (>10%). Involves government-approved board members.",
                "SCA": "Security Control Agreement - For moderate foreign influence (5-10%). Enhanced security measures required.",
                "VTA": "Voting Trust Agreement - US trustees manage voting rights when foreign board members exist.",
                "LSA": "Limited Security Agreement - Implements firewalls between foreign and classified work.",
                "PROXY": "Proxy Agreement - For complete foreign ownership. US citizens act as proxy holders."
            }
        } 