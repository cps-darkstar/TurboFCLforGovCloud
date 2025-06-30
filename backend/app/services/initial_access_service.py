"""
Initial Access Service for TurboFCL

Handles secure onboarding, access token validation, contact inference,
company matching, and test entity creation for the TurboFCL system.
Designed to support seamless handoff from DARPA Bridges and other external systems.
"""

import hashlib
import json
import secrets
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID, uuid4

from app.core.database import get_sync_db_session
from app.core.exceptions import BusinessLogicError, SecurityError, ValidationError
from app.core.security import EnterpriseEncryptionService
from fastapi import Depends
from sqlalchemy.orm import Session


class InitialAccessService:
    """Service for handling initial access and secure onboarding."""

    def __init__(self, db: Session, security_service: EnterpriseEncryptionService):
        self.db = db
        self.security = security_service
        self.token_expiry_hours = 24  # Access tokens expire in 24 hours
        self.confidence_threshold = 0.8  # Minimum confidence for matches

    async def validate_access_link(
        self, token: str, source: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate an initial access token/link.

        Args:
            token: The access token to validate
            source: Optional source identifier (e.g., "DARPA_BRIDGES")

        Returns:
            Dict containing validation results and associated data

        Raises:
            SecurityError: If token is invalid or expired
        """
        try:
            # For now, use a simple token validation approach
            # In production, this would integrate with proper encryption
            if not token or len(token) < 32:
                raise SecurityError(
                    "Invalid token format", security_event="TOKEN_FORMAT_INVALID"
                )

            # Basic token structure validation (simplified for now)
            # Format: base64(json_payload)
            import base64

            try:
                decoded_data = base64.b64decode(token).decode("utf-8")
                payload = json.loads(decoded_data)
            except (ValueError, json.JSONDecodeError):
                raise SecurityError(
                    "Token decoding failed", security_event="TOKEN_DECODE_FAILED"
                )

            # Check expiration
            expires_at_str = payload.get("expires_at", "")
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                if datetime.utcnow() > expires_at:
                    raise SecurityError(
                        "Access token has expired", security_event="TOKEN_EXPIRED"
                    )
            else:
                expires_at = datetime.utcnow() + timedelta(hours=24)

            # Validate source if provided
            token_source = payload.get("source")
            if source and token_source != source:
                raise SecurityError(
                    "Token source mismatch", security_event="TOKEN_SOURCE_MISMATCH"
                )

            # Extract user and company info
            user_info = payload.get("user_info", {})
            company_info = payload.get("company_info", {})

            return {
                "valid": True,
                "expires_at": expires_at,
                "user_info": user_info,
                "company_info": company_info,
                "source": token_source,
            }

        except SecurityError:
            raise
        except Exception as e:
            raise SecurityError(
                f"Invalid access token: {str(e)}",
                security_event="TOKEN_VALIDATION_FAILED",
            ) from e

    async def infer_contact_information(
        self,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        company_name: Optional[str] = None,
        phone: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Infer missing contact information using available data and external sources.

        Args:
            email: User's email address
            first_name: User's first name
            last_name: User's last name
            company_name: Associated company name
            phone: User's phone number
            additional_data: Any additional data for inference

        Returns:
            Dict containing inferred data, confidence score, and suggestions
        """
        provided_data = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "company_name": company_name,
            "phone": phone,
        }

        # Remove None values
        provided_data = {k: v for k, v in provided_data.items() if v is not None}

        inferred_data = {}
        missing_fields = []
        suggestions = []
        confidence_score = 0.0

        # Check existing users for similar data
        existing_matches = await self._find_similar_contacts(provided_data)

        # Infer from email domain if available
        if email and not company_name:
            domain = email.split("@")[1] if "@" in email else None
            if domain:
                company_suggestions = await self._infer_company_from_domain(domain)
                if company_suggestions:
                    inferred_data["company_name"] = company_suggestions[0]["name"]
                    suggestions.extend(company_suggestions)
                    confidence_score += 0.3

        # Infer from existing matches
        if existing_matches:
            for match in existing_matches[:3]:  # Top 3 matches
                suggestion = {
                    "type": "existing_contact",
                    "confidence": match["confidence"],
                    "data": match["data"],
                }
                suggestions.append(suggestion)
                confidence_score += match["confidence"] * 0.2

        # Calculate missing fields
        required_fields = ["email", "first_name", "last_name", "company_name"]
        for field in required_fields:
            if field not in provided_data and field not in inferred_data:
                missing_fields.append(field)

        # Adjust confidence based on completeness
        completeness = 1.0 - (len(missing_fields) / len(required_fields))
        confidence_score = min(confidence_score + (completeness * 0.4), 1.0)

        return {
            "confidence_score": confidence_score,
            "inferred_data": inferred_data,
            "missing_fields": missing_fields,
            "suggestions": suggestions,
        }

    async def match_company(
        self,
        company_name: str,
        ein: Optional[str] = None,
        duns: Optional[str] = None,
        cage_code: Optional[str] = None,
        address: Optional[str] = None,
        fuzzy_match: bool = True,
        confidence_threshold: float = 0.8,
    ) -> Dict[str, Any]:
        """
        Match a company against existing business entities.

        Args:
            company_name: Name of the company to match
            ein: Employer Identification Number
            duns: DUNS number
            cage_code: CAGE code
            address: Company address
            fuzzy_match: Whether to perform fuzzy string matching
            confidence_threshold: Minimum confidence for matches

        Returns:
            Dict containing match results and confidence scores
        """
        matches = []
        best_match = None
        confidence_score = 0.0
        is_new_company = True
        suggested_cage_codes = []

        # Exact identifier matches first
        if ein or duns or cage_code:
            exact_matches = await self._find_exact_company_matches(ein, duns, cage_code)
            for match in exact_matches:
                match["confidence"] = 1.0
                matches.append(match)
                is_new_company = False

        # Fuzzy name matching
        if fuzzy_match and len(matches) == 0:
            name_matches = await self._find_fuzzy_company_matches(
                company_name, address, confidence_threshold
            )
            matches.extend(name_matches)
            if name_matches:
                is_new_company = False

        # Select best match
        if matches:
            best_match = max(matches, key=lambda x: x["confidence"])
            confidence_score = best_match["confidence"]

        # Generate CAGE code suggestions for new companies
        if is_new_company:
            suggested_cage_codes = await self._suggest_cage_codes(company_name)

        return {
            "matches": matches,
            "best_match": best_match,
            "confidence_score": confidence_score,
            "is_new_company": is_new_company,
            "suggested_cage_codes": suggested_cage_codes,
        }

    async def create_test_entity(
        self, entity_type: str, scenario: str, include_sample_data: bool = True
    ) -> Dict[str, Any]:
        """
        Create or retrieve a test entity baseline for testing scenarios.

        Args:
            entity_type: Type of entity ("COMPANY", "INDIVIDUAL", "FOREIGN_ENTITY")
            scenario: Test scenario identifier
            include_sample_data: Whether to include sample documents/data

        Returns:
            Dict containing test entity data and next steps
        """
        # Generate test entity ID
        entity_id = uuid4()

        # Get baseline data for scenario
        baseline_data = await self._get_test_baseline_data(entity_type, scenario)

        # Get sample documents if requested
        sample_documents = []
        if include_sample_data:
            sample_documents = await self._get_sample_documents(entity_type, scenario)

        # Define next steps based on scenario
        next_steps = await self._get_test_scenario_steps(entity_type, scenario)

        # Store test entity in database (marked as test)
        await self._store_test_entity(entity_id, entity_type, scenario, baseline_data)

        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "scenario": scenario,
            "baseline_data": baseline_data,
            "sample_documents": sample_documents,
            "next_steps": next_steps,
        }

    async def complete_secure_onboarding(
        self,
        access_token: str,
        contact_info: Dict[str, Any],
        company_info: Optional[Dict[str, Any]] = None,
        test_entity_info: Optional[Dict[str, Any]] = None,
        source_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Complete the secure onboarding process for a new user.

        Args:
            access_token: Validated access token
            contact_info: User contact information
            company_info: Optional company matching information
            test_entity_info: Optional test entity creation info
            source_metadata: Additional metadata from source system

        Returns:
            Dict containing onboarding results and next steps
        """
        warnings = []
        errors = []

        try:
            # Validate access token
            token_data = await self.validate_access_link(access_token)
            if not token_data["valid"]:
                raise SecurityError(
                    "Invalid access token", security_event="TOKEN_INVALID"
                )

            # Infer complete contact information
            contact_result = await self.infer_contact_information(**contact_info)

            if contact_result["confidence_score"] < 0.6:
                warnings.append("Low confidence in contact information inference")

            # Create user account
            user_id = await self._create_user_account(
                contact_result, token_data, source_metadata
            )

            # Handle company matching/creation
            company_id = None
            if company_info:
                company_result = await self.match_company(**company_info)
                if company_result["is_new_company"]:
                    company_id = await self._create_company_entity(
                        company_result, user_id
                    )
                else:
                    company_id = company_result["best_match"]["id"]
                    await self._associate_user_with_company(user_id, company_id)

            # Create test entity if requested
            test_entity_id = None
            if test_entity_info:
                test_result = await self.create_test_entity(**test_entity_info)
                test_entity_id = test_result["entity_id"]
                await self._associate_user_with_test_entity(user_id, test_entity_id)

            # Generate session token
            session_token = await self._generate_session_token(user_id)

            # Define next steps
            next_steps = [
                "Complete profile information",
                "Review security requirements",
                "Begin FCL application process",
            ]

            if test_entity_id:
                next_steps.insert(0, "Explore test entity scenarios")

            return {
                "success": True,
                "user_id": user_id,
                "company_id": company_id,
                "test_entity_id": test_entity_id,
                "session_token": session_token,
                "next_steps": next_steps,
                "warnings": warnings,
                "errors": errors,
            }

        except Exception as e:
            errors.append(str(e))
            return {
                "success": False,
                "user_id": None,
                "company_id": None,
                "test_entity_id": None,
                "session_token": None,
                "next_steps": [],
                "warnings": warnings,
                "errors": errors,
            }

    # Private helper methods

    async def _find_similar_contacts(
        self, provided_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Find similar existing contacts."""
        # Implementation would query the users table
        return []

    async def _infer_company_from_domain(self, domain: str) -> List[Dict[str, Any]]:
        """Infer company information from email domain."""
        # Implementation would use domain lookup services
        return []

    async def _find_exact_company_matches(
        self, ein: Optional[str], duns: Optional[str], cage_code: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Find companies with exact identifier matches."""
        # Implementation would query business_entities table
        return []

    async def _find_fuzzy_company_matches(
        self, company_name: str, address: Optional[str], threshold: float
    ) -> List[Dict[str, Any]]:
        """Find companies with fuzzy name/address matching."""
        # Implementation would use fuzzy string matching
        return []

    async def _suggest_cage_codes(self, company_name: str) -> List[str]:
        """Suggest available CAGE codes for new companies."""
        # Implementation would generate or suggest CAGE codes
        return []

    async def _get_test_baseline_data(
        self, entity_type: str, scenario: str
    ) -> Dict[str, Any]:
        """Get baseline test data for a scenario."""
        test_data = {
            "COMPANY": {
                "BASIC_CONTRACTOR": {
                    "name": "Test Defense Contractor LLC",
                    "ein": "12-3456789",
                    "naics_code": "541330",
                    "business_type": "LLC",
                    "employee_count": 150,
                    "annual_revenue": 25000000,
                },
                "FOCI_COMPLEX": {
                    "name": "International Defense Systems Corp",
                    "ein": "98-7654321",
                    "naics_code": "541330",
                    "business_type": "Corporation",
                    "employee_count": 500,
                    "annual_revenue": 100000000,
                    "foreign_ownership_percentage": 35.5,
                },
            }
        }

        return test_data.get(entity_type, {}).get(scenario, {})

    async def _get_sample_documents(
        self, entity_type: str, scenario: str
    ) -> List[Dict[str, Any]]:
        """Get sample documents for a test scenario."""
        return []

    async def _get_test_scenario_steps(
        self, entity_type: str, scenario: str
    ) -> List[str]:
        """Get next steps for a test scenario."""
        return [
            "Review baseline data",
            "Submit initial FCL application",
            "Complete FOCI assessment if applicable",
        ]

    async def _store_test_entity(
        self,
        entity_id: UUID,
        entity_type: str,
        scenario: str,
        baseline_data: Dict[str, Any],
    ):
        """Store test entity in database."""
        # Implementation would insert into business_entities table with is_test_entity=true
        pass

    async def _create_user_account(
        self,
        contact_result: Dict[str, Any],
        token_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]],
    ) -> UUID:
        """Create a new user account."""
        # Implementation would insert into users table
        return uuid4()

    async def _create_company_entity(
        self, company_result: Dict[str, Any], user_id: UUID
    ) -> UUID:
        """Create a new company entity."""
        # Implementation would insert into business_entities table
        return uuid4()

    async def _associate_user_with_company(self, user_id: UUID, company_id: UUID):
        """Associate user with existing company."""
        # Implementation would update user record or create association
        pass

    async def _associate_user_with_test_entity(
        self, user_id: UUID, test_entity_id: UUID
    ):
        """Associate user with test entity."""
        # Implementation would create test entity association
        pass

    async def _generate_session_token(self, user_id: UUID) -> str:
        """Generate a secure session token."""
        token_data = {
            "user_id": str(user_id),
            "issued_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
        }

        # Simple token generation for now
        import base64

        return base64.b64encode(json.dumps(token_data).encode()).decode()


def get_initial_access_service(
    db: Session = Depends(get_sync_db_session),
    security_service: EnterpriseEncryptionService = Depends(
        lambda: EnterpriseEncryptionService()
    ),
) -> InitialAccessService:
    """Dependency injection for InitialAccessService."""
    return InitialAccessService(db, security_service)
