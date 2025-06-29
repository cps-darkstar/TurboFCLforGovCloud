"""
Enterprise FOCI Assessment Service
Implements comprehensive Foreign Ownership, Control, or Influence analysis
per NISPOM 2-202 through 2-207 requirements
"""

import asyncio
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.core.exceptions import BusinessLogicError, ValidationError
from app.core.security import encryption_service
from app.models.entities import (
    Entity,
    FOCIAssessment,
    FOCIIndicator,
    MitigationMeasure,
    OwnershipRelation,
    ValidationResult,
)
from app.services.audit_service import AuditService
from app.types.enterprise import (
    ConfidenceLevel,
    FOCIIndicatorType,
    FOCIRiskLevel,
    FOCISeverity,
    MitigationType,
    ValidationStatus,
)
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


class EnterpriseFOCIService:
    """
    Enterprise-grade FOCI assessment service with comprehensive validation
    Implements DCSA NISPOM requirements for facility clearance eligibility
    """

    def __init__(self, db: AsyncSession, audit_service: AuditService):
        self.db = db
        self.audit_service = audit_service

        # FOCI risk thresholds per NISPOM guidance
        self.risk_thresholds = {
            "foreign_ownership_minor": Decimal("5.0"),  # 5% triggers monitoring
            "foreign_ownership_major": Decimal("10.0"),  # 10% triggers mitigation
            "foreign_ownership_critical": Decimal("25.0"),  # 25% may preclude clearance
            "voting_control_threshold": Decimal("10.0"),  # Voting control assessment
            "board_representation_threshold": Decimal(
                "25.0"
            ),  # Board representation concern
        }

        # Indicator weights for risk scoring
        self.indicator_weights = {
            FOCIIndicatorType.FOREIGN_OWNERSHIP: {
                FOCISeverity.MINOR: 10,
                FOCISeverity.MODERATE: 25,
                FOCISeverity.MAJOR: 50,
                FOCISeverity.CRITICAL: 100,
            },
            FOCIIndicatorType.FOREIGN_CONTROL: {
                FOCISeverity.MINOR: 15,
                FOCISeverity.MODERATE: 35,
                FOCISeverity.MAJOR: 70,
                FOCISeverity.CRITICAL: 100,
            },
            FOCIIndicatorType.FOREIGN_INFLUENCE: {
                FOCISeverity.MINOR: 5,
                FOCISeverity.MODERATE: 15,
                FOCISeverity.MAJOR: 40,
                FOCISeverity.CRITICAL: 80,
            },
            FOCIIndicatorType.TECHNOLOGY_TRANSFER: {
                FOCISeverity.MINOR: 20,
                FOCISeverity.MODERATE: 40,
                FOCISeverity.MAJOR: 80,
                FOCISeverity.CRITICAL: 100,
            },
        }

    async def conduct_comprehensive_assessment(
        self,
        entity_id: str,
        assessor_id: str,
        assessment_type: str = "ANNUAL",
        force_refresh: bool = False,
    ) -> FOCIAssessment:
        """
        Conduct enterprise-grade FOCI assessment with full audit trail

        Args:
            entity_id: UUID of entity to assess
            assessment_type: Type of assessment (INITIAL, ANNUAL, etc.)
            assessor_id: UUID of authorized assessor
            force_refresh: Force fresh data gathering vs cached results

        Returns:
            Complete FOCI assessment with risk analysis
        """
        async with self.db.begin():
            try:
                # Validate entity exists and assessor has authority
                entity = await self._validate_assessment_authority(
                    entity_id, assessor_id
                )

                # Check for recent assessment unless forced
                if not force_refresh:
                    recent_assessment = await self._check_recent_assessment(
                        entity_id, assessment_type
                    )
                    if recent_assessment:
                        logger.info(
                            f"Using recent FOCI assessment for entity {entity_id}"
                        )
                        return recent_assessment

                # Gather comprehensive ownership data
                ownership_analysis = await self._analyze_ownership_structure(entity)

                # Evaluate all FOCI indicators
                foci_indicators = await self._evaluate_comprehensive_foci_indicators(
                    entity, ownership_analysis
                )

                # Assess required mitigation measures
                mitigation_analysis = await self._assess_mitigation_requirements(
                    entity, ownership_analysis, foci_indicators
                )

                # Calculate enterprise risk score using weighted algorithm
                risk_assessment = await self._calculate_enterprise_risk_score(
                    ownership_analysis, foci_indicators, mitigation_analysis
                )

                # Determine DCSA submission requirements
                dcsa_requirements = await self._assess_dcsa_submission_requirements(
                    risk_assessment, foci_indicators
                )

                # Create comprehensive assessment record
                assessment = await self._create_assessment_record(
                    entity_id=entity_id,
                    assessor_id=assessor_id,
                    assessment_type=assessment_type,
                    risk_assessment=risk_assessment,
                    indicators=foci_indicators,
                    mitigation_measures=mitigation_analysis,
                    dcsa_requirements=dcsa_requirements,
                )

                # Log compliance event with full context
                await self.audit_service.log_compliance_event(
                    event_type="FOCI_ASSESSMENT_COMPLETED",
                    entity_id=entity_id,
                    assessment_id=assessment.id,
                    risk_level=risk_assessment["risk_level"],
                    metadata={
                        "assessor_id": assessor_id,
                        "assessment_type": assessment_type,
                        "indicators_count": len(foci_indicators),
                        "risk_score": risk_assessment["risk_score"],
                        "mitigation_required": risk_assessment["mitigation_required"],
                        "dcsa_submission_required": dcsa_requirements[
                            "submission_required"
                        ],
                    },
                )

                return assessment

            except Exception as e:
                await self.audit_service.log_error(
                    error_type="FOCI_ASSESSMENT_FAILED",
                    entity_id=entity_id,
                    error_details=str(e),
                    metadata={
                        "assessor_id": assessor_id,
                        "assessment_type": assessment_type,
                    },
                )
                raise BusinessLogicError(f"FOCI assessment failed: {str(e)}")

    async def _validate_assessment_authority(
        self, entity_id: str, assessor_id: str
    ) -> Entity:
        """Validate entity exists and assessor has proper authority"""
        result = await self.db.execute(
            select(Entity)
            .where(Entity.id == entity_id)
            .where(Entity.deleted_at.is_(None))
            .options(
                selectinload(Entity.ownership_relations),
                selectinload(Entity.addresses),
                selectinload(Entity.contacts),
            )
        )

        entity = result.scalar_one_or_none()
        if not entity:
            raise BusinessLogicError(f"Entity {entity_id} not found or deleted")

        # TODO: Validate assessor authority based on clearance level and role
        # This would check against user permissions and clearance requirements

        return entity

    async def _check_recent_assessment(
        self, entity_id: str, assessment_type: str
    ) -> Optional[FOCIAssessment]:
        """Check for recent valid assessment to avoid duplication"""
        # Define "recent" based on assessment type
        recent_threshold = {
            "INITIAL": timedelta(days=90),
            "ANNUAL": timedelta(days=330),  # Allow 35-day window before annual due
            "TRIGGERED": timedelta(days=30),
            "CHANGE_IN_OWNERSHIP": timedelta(days=60),
        }.get(assessment_type, timedelta(days=90))

        cutoff_date = datetime.utcnow() - recent_threshold

        result = await self.db.execute(
            select(FOCIAssessment)
            .where(FOCIAssessment.entity_id == entity_id)
            .where(FOCIAssessment.assessment_type == assessment_type)
            .where(FOCIAssessment.assessment_date >= cutoff_date)
            .where(FOCIAssessment.validation_status == ValidationStatus.PASSED)
            .order_by(FOCIAssessment.assessment_date.desc())
        )

        return result.scalar_one_or_none()

    async def _analyze_ownership_structure(self, entity: Entity) -> Dict[str, Any]:
        """
        Comprehensive ownership analysis with recursive traversal
        Implements cycle detection and foreign ownership aggregation
        """
        visited_entities = set()
        ownership_chain = []
        total_foreign_ownership = Decimal("0.0")
        foreign_control_indicators = []

        async def traverse_ownership(
            current_entity_id: str,
            depth: int = 0,
            cumulative_percentage: Decimal = Decimal("100.0"),
        ) -> List[Dict[str, Any]]:
            """Recursively traverse ownership structure"""
            if depth > 10:  # Prevent infinite recursion
                raise BusinessLogicError(
                    "Ownership chain exceeds maximum depth - possible circular reference"
                )

            if current_entity_id in visited_entities:
                raise BusinessLogicError(
                    f"Circular ownership detected at entity {current_entity_id}"
                )

            visited_entities.add(current_entity_id)

            # Get all ownership relations for current entity
            result = await self.db.execute(
                select(OwnershipRelation)
                .where(OwnershipRelation.owned_entity_id == current_entity_id)
                .where(OwnershipRelation.effective_date <= datetime.utcnow().date())
                .where(
                    or_(
                        OwnershipRelation.termination_date.is_(None),
                        OwnershipRelation.termination_date > datetime.utcnow().date(),
                    )
                )
                .order_by(OwnershipRelation.ownership_percentage.desc())
            )

            relations = result.scalars().all()
            ownership_details = []

            for relation in relations:
                # Calculate effective ownership percentage
                effective_percentage = (
                    relation.ownership_percentage / 100
                ) * cumulative_percentage

                relation_detail = {
                    "owner_id": relation.owner_entity_id or "INDIVIDUAL",
                    "owner_name": relation.owner_individual_name or "Entity Owner",
                    "owner_type": relation.owner_type,
                    "direct_percentage": relation.ownership_percentage,
                    "effective_percentage": effective_percentage,
                    "voting_percentage": relation.voting_percentage,
                    "is_foreign": relation.is_foreign,
                    "is_controlling": relation.is_controlling,
                    "relationship_type": relation.relationship_type,
                    "citizenship": relation.citizenship or [],
                    "depth": depth,
                }

                # Accumulate foreign ownership
                if relation.is_foreign:
                    foreign_contribution = effective_percentage
                    total_foreign_ownership += foreign_contribution

                    # Check for control indicators
                    if (
                        relation.is_controlling
                        or relation.ownership_percentage
                        >= self.risk_thresholds["voting_control_threshold"]
                        or (
                            relation.voting_percentage
                            and relation.voting_percentage
                            >= self.risk_thresholds["voting_control_threshold"]
                        )
                    ):
                        foreign_control_indicators.append(
                            {
                                "owner": relation_detail,
                                "control_type": (
                                    "VOTING_CONTROL"
                                    if relation.voting_percentage
                                    else "OWNERSHIP_CONTROL"
                                ),
                                "control_percentage": relation.voting_percentage
                                or relation.ownership_percentage,
                            }
                        )

                ownership_details.append(relation_detail)

                # Recursively analyze if owner is another entity
                if relation.owner_entity_id and depth < 5:  # Limit recursion depth
                    sub_ownership = await traverse_ownership(
                        relation.owner_entity_id, depth + 1, effective_percentage
                    )
                    ownership_details.extend(sub_ownership)

            return ownership_details

        # Start ownership traversal from root entity
        all_ownership_relations = await traverse_ownership(entity.id)

        # Calculate ownership tiers and complexity metrics
        max_depth = max([rel["depth"] for rel in all_ownership_relations] + [0])
        ownership_complexity = self._calculate_ownership_complexity(
            all_ownership_relations
        )

        return {
            "entity_id": entity.id,
            "total_ownership_relations": len(all_ownership_relations),
            "ownership_tiers": max_depth + 1,
            "total_foreign_ownership_percentage": min(
                total_foreign_ownership, Decimal("100.0")
            ),
            "foreign_control_indicators": foreign_control_indicators,
            "ownership_complexity_score": ownership_complexity,
            "detailed_ownership": all_ownership_relations,
            "analysis_timestamp": datetime.utcnow().isoformat(),
        }

    def _calculate_ownership_complexity(
        self, ownership_relations: List[Dict[str, Any]]
    ) -> int:
        """Calculate complexity score based on ownership structure"""
        complexity_score = 0

        # Base complexity on number of owners
        complexity_score += len(ownership_relations) * 2

        # Add complexity for foreign owners
        foreign_owners = [rel for rel in ownership_relations if rel["is_foreign"]]
        complexity_score += len(foreign_owners) * 5

        # Add complexity for controlling interests
        controlling_owners = [
            rel for rel in ownership_relations if rel["is_controlling"]
        ]
        complexity_score += len(controlling_owners) * 3

        # Add complexity for multi-tier structures
        max_depth = max([rel["depth"] for rel in ownership_relations] + [0])
        complexity_score += max_depth * 10

        # Add complexity for different owner types
        owner_types = set([rel["owner_type"] for rel in ownership_relations])
        complexity_score += len(owner_types) * 2

        return min(complexity_score, 100)  # Cap at 100

    async def _evaluate_comprehensive_foci_indicators(
        self, entity: Entity, ownership_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all categories of FOCI indicators per NISPOM requirements
        """
        indicators = []

        # 1. Foreign Ownership Indicators
        foreign_ownership_indicators = await self._assess_foreign_ownership_indicators(
            ownership_analysis
        )
        indicators.extend(foreign_ownership_indicators)

        # 2. Foreign Control Indicators
        foreign_control_indicators = await self._assess_foreign_control_indicators(
            ownership_analysis
        )
        indicators.extend(foreign_control_indicators)

        # 3. Foreign Influence Indicators
        foreign_influence_indicators = await self._assess_foreign_influence_indicators(
            entity, ownership_analysis
        )
        indicators.extend(foreign_influence_indicators)

        # 4. Technology Transfer Indicators
        tech_transfer_indicators = await self._assess_technology_transfer_indicators(
            entity
        )
        indicators.extend(tech_transfer_indicators)

        # 5. Export Control Indicators
        export_control_indicators = await self._assess_export_control_indicators(entity)
        indicators.extend(export_control_indicators)

        # 6. International Agreement Indicators
        intl_agreement_indicators = (
            await self._assess_international_agreement_indicators(entity)
        )
        indicators.extend(intl_agreement_indicators)

        return indicators

    async def _assess_foreign_ownership_indicators(
        self, ownership_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess foreign ownership FOCI indicators"""
        indicators = []
        foreign_ownership_pct = ownership_analysis["total_foreign_ownership_percentage"]

        if foreign_ownership_pct > self.risk_thresholds["foreign_ownership_critical"]:
            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_OWNERSHIP,
                    "severity": FOCISeverity.CRITICAL,
                    "description": f"Foreign ownership of {foreign_ownership_pct}% exceeds critical threshold",
                    "evidence": [f"Total foreign ownership: {foreign_ownership_pct}%"],
                    "mitigation_required": True,
                    "nispom_reference": "NISPOM 2-202a",
                }
            )
        elif foreign_ownership_pct > self.risk_thresholds["foreign_ownership_major"]:
            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_OWNERSHIP,
                    "severity": FOCISeverity.MAJOR,
                    "description": f"Foreign ownership of {foreign_ownership_pct}% requires mitigation",
                    "evidence": [f"Total foreign ownership: {foreign_ownership_pct}%"],
                    "mitigation_required": True,
                    "nispom_reference": "NISPOM 2-202b",
                }
            )
        elif foreign_ownership_pct > self.risk_thresholds["foreign_ownership_minor"]:
            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_OWNERSHIP,
                    "severity": FOCISeverity.MODERATE,
                    "description": f"Foreign ownership of {foreign_ownership_pct}% requires monitoring",
                    "evidence": [f"Total foreign ownership: {foreign_ownership_pct}%"],
                    "mitigation_required": False,
                    "nispom_reference": "NISPOM 2-202c",
                }
            )

        # Check for concentrated foreign ownership
        foreign_relations = [
            rel for rel in ownership_analysis["detailed_ownership"] if rel["is_foreign"]
        ]
        for relation in foreign_relations:
            if relation["direct_percentage"] >= 10:
                indicators.append(
                    {
                        "indicator_type": FOCIIndicatorType.FOREIGN_OWNERSHIP,
                        "severity": FOCISeverity.MODERATE,
                        "description": f"Concentrated foreign ownership by {relation['owner_name']}",
                        "evidence": [
                            f"Single foreign owner with {relation['direct_percentage']}% ownership"
                        ],
                        "mitigation_required": relation["direct_percentage"] >= 25,
                        "nispom_reference": "NISPOM 2-203",
                    }
                )

        return indicators

    async def _assess_foreign_control_indicators(
        self, ownership_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess foreign control FOCI indicators"""
        indicators = []
        control_indicators = ownership_analysis["foreign_control_indicators"]

        for control_indicator in control_indicators:
            owner = control_indicator["owner"]
            control_type = control_indicator["control_type"]
            control_pct = control_indicator["control_percentage"]

            severity = (
                FOCISeverity.CRITICAL
                if control_pct >= 50
                else (
                    FOCISeverity.MAJOR if control_pct >= 25 else FOCISeverity.MODERATE
                )
            )

            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_CONTROL,
                    "severity": severity,
                    "description": f"Foreign {control_type.lower()} by {owner['owner_name']}",
                    "evidence": [
                        f"Foreign entity has {control_pct}% {control_type.lower()}",
                        f"Owner type: {owner['owner_type']}",
                        f"Citizenship: {', '.join(owner['citizenship'])}",
                    ],
                    "mitigation_required": True,
                    "nispom_reference": "NISPOM 2-204",
                }
            )

        return indicators

    async def _assess_foreign_influence_indicators(
        self, entity: Entity, ownership_analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Assess foreign influence FOCI indicators"""
        indicators = []

        # Check for foreign board members or key management
        # This would require additional data about board composition
        # For now, we'll check ownership structure for influence patterns

        foreign_relations = [
            rel for rel in ownership_analysis["detailed_ownership"] if rel["is_foreign"]
        ]

        # Look for patterns that suggest foreign influence
        if len(foreign_relations) >= 3:
            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_INFLUENCE,
                    "severity": FOCISeverity.MODERATE,
                    "description": "Multiple foreign ownership relationships may indicate coordinated influence",
                    "evidence": [
                        f"Number of foreign ownership relationships: {len(foreign_relations)}"
                    ],
                    "mitigation_required": False,
                    "nispom_reference": "NISPOM 2-205",
                }
            )

        # Check for foreign government ownership
        foreign_gov_relations = [
            rel for rel in foreign_relations if rel["owner_type"] == "GOVERNMENT"
        ]
        if foreign_gov_relations:
            indicators.append(
                {
                    "indicator_type": FOCIIndicatorType.FOREIGN_INFLUENCE,
                    "severity": FOCISeverity.CRITICAL,
                    "description": "Foreign government ownership detected",
                    "evidence": [f"Foreign government entity in ownership structure"],
                    "mitigation_required": True,
                    "nispom_reference": "NISPOM 2-206",
                }
            )

        return indicators

    async def _assess_technology_transfer_indicators(
        self, entity: Entity
    ) -> List[Dict[str, Any]]:
        """Assess technology transfer FOCI indicators"""
        indicators = []

        # This would analyze:
        # - Technology sharing agreements
        # - Joint ventures with foreign entities
        # - Export control classifications
        # - International collaboration agreements

        # For now, return placeholder based on NAICS codes
        # High-tech NAICS codes that may involve technology transfer
        high_tech_naics = ["334", "335", "336", "541", "541511", "541512"]

        if hasattr(entity, "naics_codes"):
            for naics in entity.naics_codes:
                if any(naics.code.startswith(tech) for tech in high_tech_naics):
                    indicators.append(
                        {
                            "indicator_type": FOCIIndicatorType.TECHNOLOGY_TRANSFER,
                            "severity": FOCISeverity.MINOR,
                            "description": f"High-technology industry classification requires technology transfer review",
                            "evidence": [
                                f"NAICS Code: {naics.code} - {naics.description}"
                            ],
                            "mitigation_required": False,
                            "nispom_reference": "NISPOM 2-207",
                        }
                    )

        return indicators

    async def _assess_export_control_indicators(
        self, entity: Entity
    ) -> List[Dict[str, Any]]:
        """Assess export control FOCI indicators"""
        indicators = []

        # This would check:
        # - ITAR registration status
        # - EAR controlled technology
        # - Export license history
        # - Denied parties list screening

        # Placeholder implementation
        return indicators

    async def _assess_international_agreement_indicators(
        self, entity: Entity
    ) -> List[Dict[str, Any]]:
        """Assess international agreement FOCI indicators"""
        indicators = []

        # This would analyze:
        # - International joint ventures
        # - Foreign subsidiary relationships
        # - Cross-border agreements
        # - Foreign facility operations

        # Placeholder implementation
        return indicators

    async def _assess_mitigation_requirements(
        self,
        entity: Entity,
        ownership_analysis: Dict[str, Any],
        foci_indicators: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Determine required mitigation measures based on FOCI assessment"""
        mitigation_measures = []

        # Analyze indicators to determine mitigation needs
        critical_indicators = [
            ind for ind in foci_indicators if ind["severity"] == FOCISeverity.CRITICAL
        ]
        major_indicators = [
            ind for ind in foci_indicators if ind["severity"] == FOCISeverity.MAJOR
        ]

        foreign_ownership_pct = ownership_analysis["total_foreign_ownership_percentage"]

        # Determine primary mitigation strategy
        if critical_indicators or foreign_ownership_pct >= 25:
            # Special Security Agreement (SSA) required
            mitigation_measures.append(
                {
                    "measure_type": MitigationType.SPECIAL_SECURITY_AGREEMENT,
                    "description": "Special Security Agreement required due to significant FOCI conditions",
                    "implementation_timeline": "Within 90 days of clearance approval",
                    "responsible_party": "Facility Security Officer",
                    "monitoring_requirements": "Annual compliance review by DCSA",
                    "effectiveness_assessment": "High - addresses most FOCI concerns",
                }
            )
        elif major_indicators or foreign_ownership_pct >= 10:
            # Proxy Agreement or Board Resolution
            if ownership_analysis["foreign_control_indicators"]:
                mitigation_measures.append(
                    {
                        "measure_type": MitigationType.PROXY_AGREEMENT,
                        "description": "Proxy Agreement to mitigate foreign control concerns",
                        "implementation_timeline": "Prior to clearance approval",
                        "responsible_party": "Board of Directors",
                        "monitoring_requirements": "Semi-annual compliance certification",
                        "effectiveness_assessment": "Medium - addresses control concerns",
                    }
                )
            else:
                mitigation_measures.append(
                    {
                        "measure_type": MitigationType.BOARD_RESOLUTION,
                        "description": "Board Resolution excluding foreign interests from classified activities",
                        "implementation_timeline": "Within 30 days of clearance approval",
                        "responsible_party": "Board of Directors",
                        "monitoring_requirements": "Annual board certification",
                        "effectiveness_assessment": "Medium - suitable for ownership without control",
                    }
                )

        # Additional technology-specific mitigations
        tech_indicators = [
            ind
            for ind in foci_indicators
            if ind["indicator_type"] == FOCIIndicatorType.TECHNOLOGY_TRANSFER
        ]
        if tech_indicators:
            mitigation_measures.append(
                {
                    "measure_type": MitigationType.TECHNOLOGY_CONTROL_PLAN,
                    "description": "Technology Control Plan to prevent unauthorized technology transfer",
                    "implementation_timeline": "Prior to classified contract award",
                    "responsible_party": "Chief Technology Officer / FSO",
                    "monitoring_requirements": "Quarterly technology transfer reviews",
                    "effectiveness_assessment": "High - specific to technology concerns",
                }
            )

        return mitigation_measures

    async def _calculate_enterprise_risk_score(
        self,
        ownership_analysis: Dict[str, Any],
        foci_indicators: List[Dict[str, Any]],
        mitigation_measures: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculate comprehensive FOCI risk score using weighted algorithm"""

        base_score = 0

        # Score based on foreign ownership percentage
        foreign_ownership_pct = ownership_analysis["total_foreign_ownership_percentage"]
        if foreign_ownership_pct >= 25:
            base_score += 50
        elif foreign_ownership_pct >= 10:
            base_score += 30
        elif foreign_ownership_pct >= 5:
            base_score += 15

        # Score based on ownership complexity
        complexity_score = ownership_analysis["ownership_complexity_score"]
        base_score += min(complexity_score // 4, 25)  # Up to 25 points for complexity

        # Score based on FOCI indicators
        indicator_score = 0
        for indicator in foci_indicators:
            indicator_type = indicator["indicator_type"]
            severity = indicator["severity"]

            if (
                indicator_type in self.indicator_weights
                and severity in self.indicator_weights[indicator_type]
            ):
                indicator_score += self.indicator_weights[indicator_type][severity]

        base_score += min(indicator_score, 50)  # Cap indicator contribution

        # Adjust for mitigation measures (reduce risk)
        mitigation_reduction = 0
        for measure in mitigation_measures:
            if measure["measure_type"] == MitigationType.SPECIAL_SECURITY_AGREEMENT:
                mitigation_reduction += 30
            elif measure["measure_type"] == MitigationType.PROXY_AGREEMENT:
                mitigation_reduction += 20
            elif measure["measure_type"] == MitigationType.BOARD_RESOLUTION:
                mitigation_reduction += 15
            elif measure["measure_type"] == MitigationType.TECHNOLOGY_CONTROL_PLAN:
                mitigation_reduction += 10

        final_score = max(base_score - mitigation_reduction, 0)

        # Determine risk level based on final score
        if final_score >= 80:
            risk_level = FOCIRiskLevel.CRITICAL
        elif final_score >= 60:
            risk_level = FOCIRiskLevel.HIGH
        elif final_score >= 30:
            risk_level = FOCIRiskLevel.MEDIUM
        elif final_score >= 10:
            risk_level = FOCIRiskLevel.LOW
        else:
            risk_level = FOCIRiskLevel.NONE

        return {
            "risk_score": final_score,
            "risk_level": risk_level,
            "base_score": base_score,
            "indicator_contribution": indicator_score,
            "mitigation_reduction": mitigation_reduction,
            "mitigation_required": final_score >= 30,
            "clearance_recommendation": self._get_clearance_recommendation(
                risk_level, final_score
            ),
            "confidence_level": self._assess_confidence_level(
                ownership_analysis, foci_indicators
            ),
        }

    def _get_clearance_recommendation(
        self, risk_level: FOCIRiskLevel, risk_score: int
    ) -> str:
        """Provide clearance recommendation based on risk assessment"""
        if risk_level == FOCIRiskLevel.CRITICAL:
            return "DENY - Critical FOCI conditions present"
        elif risk_level == FOCIRiskLevel.HIGH:
            return "CONDITIONAL APPROVAL - Comprehensive mitigation required"
        elif risk_level == FOCIRiskLevel.MEDIUM:
            return "APPROVE WITH MITIGATION - Standard mitigation measures required"
        elif risk_level == FOCIRiskLevel.LOW:
            return "APPROVE WITH MONITORING - Enhanced monitoring recommended"
        else:
            return "APPROVE - No significant FOCI concerns identified"

    def _assess_confidence_level(
        self, ownership_analysis: Dict[str, Any], foci_indicators: List[Dict[str, Any]]
    ) -> ConfidenceLevel:
        """Assess confidence level in the FOCI assessment"""
        # Factors affecting confidence:
        # - Completeness of ownership data
        # - Depth of ownership analysis
        # - Quality of evidence for indicators
        # - Recency of data

        confidence_score = 100

        # Reduce confidence for incomplete ownership data
        if ownership_analysis["ownership_tiers"] > 3:
            confidence_score -= 10  # Complex structures harder to fully analyze

        # Reduce confidence if many indicators lack strong evidence
        weak_evidence_indicators = [
            ind for ind in foci_indicators if len(ind.get("evidence", [])) < 2
        ]
        if len(weak_evidence_indicators) > len(foci_indicators) / 2:
            confidence_score -= 20

        # Determine confidence level
        if confidence_score >= 90:
            return ConfidenceLevel.VERY_HIGH
        elif confidence_score >= 75:
            return ConfidenceLevel.HIGH
        elif confidence_score >= 60:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW

    async def _assess_dcsa_submission_requirements(
        self, risk_assessment: Dict[str, Any], foci_indicators: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Determine DCSA submission requirements based on assessment"""

        submission_required = False
        submission_urgency = "STANDARD"
        required_documents = []

        risk_level = risk_assessment["risk_level"]

        if risk_level in [FOCIRiskLevel.HIGH, FOCIRiskLevel.CRITICAL]:
            submission_required = True
            submission_urgency = "EXPEDITED"
            required_documents.extend(
                [
                    "Complete ownership structure diagram",
                    "Foreign ownership documentation",
                    "Proposed mitigation measures",
                    "Board resolutions and corporate documents",
                ]
            )
        elif risk_level == FOCIRiskLevel.MEDIUM:
            submission_required = True
            required_documents.extend(
                [
                    "Ownership structure summary",
                    "FOCI assessment report",
                    "Mitigation plan",
                ]
            )

        # Check for specific trigger conditions
        critical_indicators = [
            ind for ind in foci_indicators if ind["severity"] == FOCISeverity.CRITICAL
        ]
        if critical_indicators:
            submission_required = True
            if not submission_urgency == "EXPEDITED":
                submission_urgency = "PRIORITY"

        return {
            "submission_required": submission_required,
            "submission_urgency": submission_urgency,
            "required_documents": required_documents,
            "estimated_review_time": self._estimate_dcsa_review_time(
                submission_urgency
            ),
            "dcsa_contact_required": risk_level
            in [FOCIRiskLevel.HIGH, FOCIRiskLevel.CRITICAL],
        }

    def _estimate_dcsa_review_time(self, urgency: str) -> str:
        """Estimate DCSA review timeframe based on submission urgency"""
        timeframes = {
            "STANDARD": "60-90 business days",
            "PRIORITY": "30-45 business days",
            "EXPEDITED": "15-30 business days",
        }
        return timeframes.get(urgency, "60-90 business days")

    async def _create_assessment_record(
        self,
        entity_id: str,
        assessor_id: str,
        assessment_type: str,
        risk_assessment: Dict[str, Any],
        indicators: List[Dict[str, Any]],
        mitigation_measures: List[Dict[str, Any]],
        dcsa_requirements: Dict[str, Any],
    ) -> FOCIAssessment:
        """Create comprehensive FOCI assessment record in database"""

        # Create main assessment record
        assessment = FOCIAssessment(
            entity_id=entity_id,
            assessment_type=assessment_type,
            risk_level=risk_assessment["risk_level"],
            risk_score=risk_assessment["risk_score"],
            dccsa_submission_required=dcsa_requirements["submission_required"],
            assessment_date=datetime.utcnow().date(),
            assessor_id=assessor_id,
            methodology="Enterprise FOCI Assessment v2.0",
            confidence_level=risk_assessment["confidence_level"],
            next_review_date=self._calculate_next_review_date(assessment_type),
            validation_status=ValidationStatus.PASSED,
        )

        self.db.add(assessment)
        await self.db.flush()  # Get assessment ID

        # Create indicator records
        for indicator_data in indicators:
            indicator = FOCIIndicator(
                assessment_id=assessment.id,
                indicator_type=indicator_data["indicator_type"],
                severity=indicator_data["severity"],
                description=indicator_data["description"],
                evidence=indicator_data["evidence"],
                mitigation_required=indicator_data["mitigation_required"],
                nispom_reference=indicator_data.get("nispom_reference"),
            )
            self.db.add(indicator)

        # Create mitigation measure records
        for measure_data in mitigation_measures:
            measure = MitigationMeasure(
                assessment_id=assessment.id,
                measure_type=measure_data["measure_type"],
                description=measure_data["description"],
                status="PROPOSED",
                review_date=datetime.utcnow().date() + timedelta(days=90),
                responsible_party=measure_data["responsible_party"],
            )
            self.db.add(measure)

        return assessment

    def _calculate_next_review_date(self, assessment_type: str) -> date:
        """Calculate next review date based on assessment type"""
        base_date = datetime.utcnow().date()

        review_intervals = {
            "INITIAL": timedelta(days=365),  # Annual review after initial
            "ANNUAL": timedelta(days=365),  # Next annual review
            "TRIGGERED": timedelta(days=180),  # Semi-annual follow-up
            "CHANGE_IN_OWNERSHIP": timedelta(days=90),  # Quarterly monitoring
        }

        interval = review_intervals.get(assessment_type, timedelta(days=365))
        return base_date + interval


# Service factory
def create_foci_service(
    db: AsyncSession, audit_service: AuditService
) -> EnterpriseFOCIService:
    """Create configured FOCI service instance"""
    return EnterpriseFOCIService(db, audit_service)
