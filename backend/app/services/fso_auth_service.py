"""
Simplified FSO Authentication Service for TurboFCL

FSO-centric authentication system for testing phase.
- FSO is the primary user and FCL application package owner
- One FCL case per business entity/firm at any given time
- FSO can create additional users (KMP, security personnel) for their company
"""

import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from app.core.database import get_sync_db_session
from app.core.exceptions import BusinessLogicError, SecurityError, ValidationError
from fastapi import Depends
from sqlalchemy.orm import Session


class FSO_AuthService:
    """Simplified FSO-centric authentication service."""

    def __init__(self, db: Session):
        self.db = db

    async def register_fso_account(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        company_name: str,
        uei: Optional[str] = None,
        phone: Optional[str] = None,
        fso_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register a new FSO account and create associated company/FCL case.

        The FSO becomes:
        - Primary admin for their company
        - Owner of the FCL application package
        - Can grant access to other users (KMP, security personnel)
        """
        try:
            # Generate IDs for related entities
            user_id = uuid4()
            company_id = uuid4()
            fcl_application_id = uuid4()

            # Create FSO user record
            fso_data = {
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "fso_name": fso_name or f"{first_name} {last_name}",
                "role": "FSO",
                "is_admin": True,  # FSO is admin for their company
                "company_id": company_id,
                "password_hash": self._hash_password(password),
                "created_at": datetime.utcnow(),
                "is_active": True,
            }

            # Create company entity (one per FSO)
            company_data = {
                "id": company_id,
                "name": company_name,
                "uei": uei,
                "primary_fso_id": user_id,
                "fcl_application_id": fcl_application_id,
                "created_at": datetime.utcnow(),
                "is_active": True,
            }

            # Create single FCL application case for the company
            fcl_case_data = {
                "id": fcl_application_id,
                "company_id": company_id,
                "primary_fso_id": user_id,
                "status": "NOT_STARTED",  # Initial status
                "components_complete": {},
                "progress_percentage": 0,
                "created_by": user_id,
                "created_at": datetime.utcnow(),
                "last_updated": datetime.utcnow(),
            }

            # TODO: Save to database when tables are ready
            # self._save_fso_registration(fso_data, company_data, fcl_case_data)

            return {
                "success": True,
                "user_id": user_id,
                "company_id": company_id,
                "fcl_application_id": fcl_application_id,
                "message": "FSO account registered successfully",
                "next_steps": [
                    "Verify email address",
                    "Complete company profile",
                    "Verify UEI with SAM.gov",
                    "Begin FCL application process",
                ],
            }

        except Exception as e:
            raise BusinessLogicError(f"Failed to register FSO account: {str(e)}") from e

    async def authenticate_fso(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate FSO and return session information."""
        try:
            # TODO: Query database for user
            # For testing, accept any valid email format
            if "@" not in email:
                raise SecurityError(
                    "Invalid email format", security_event="INVALID_EMAIL"
                )

            # TODO: Validate password hash
            # For testing, accept any password

            # Mock user data - would come from database
            user_id = uuid4()
            company_id = uuid4()
            fcl_application_id = uuid4()

            # Generate session token
            session_token = secrets.token_urlsafe(32)

            return {
                "success": True,
                "user_id": user_id,
                "company_id": company_id,
                "fcl_application_id": fcl_application_id,
                "session_token": session_token,
                "expires_at": datetime.utcnow() + timedelta(hours=8),
                "user_role": "FSO",
                "is_admin": True,
                "permissions": {
                    "fcl_application": ["read", "write", "submit"],
                    "company_users": ["create", "read", "update", "delete"],
                    "company_profile": ["read", "write"],
                },
            }

        except Exception as e:
            raise SecurityError(
                f"Authentication failed: {str(e)}", security_event="LOGIN_FAILED"
            ) from e

    async def get_fcl_application_status(self, company_id: UUID) -> Dict[str, Any]:
        """
        Get the current FCL application status for a company.
        Only one FCL case per company at any given time.
        """
        try:
            # TODO: Query database for actual FCL application
            # Mock data for testing

            status_options = [
                "NOT_STARTED",
                "APPLICATION_COMPONENTS_INCOMPLETE",
                "APPLICATION_COMPONENTS_COMPLETE",
                "APPLICATION_GENERATED_READY_TO_SUBMIT",
                "SUBMITTED_TO_DCSA",
                "UNDER_REVIEW",
                "APPROVED",
                "DENIED",
            ]

            # Mock current status
            current_status = "NOT_STARTED"

            components = {
                "company_profile": {"complete": False, "required": True},
                "key_management_personnel": {"complete": False, "required": True},
                "business_structure": {"complete": False, "required": True},
                "foreign_ownership": {"complete": False, "required": True},
                "facility_information": {"complete": False, "required": True},
                "security_procedures": {"complete": False, "required": True},
            }

            # Calculate progress
            total_required = sum(1 for comp in components.values() if comp["required"])
            completed = sum(1 for comp in components.values() if comp["complete"])
            progress_percentage = (
                (completed / total_required * 100) if total_required > 0 else 0
            )

            return {
                "company_id": company_id,
                "fcl_application_id": uuid4(),  # Would be actual ID from database
                "status": current_status,
                "progress_percentage": progress_percentage,
                "components": components,
                "last_updated": datetime.utcnow(),
                "next_required_action": self._get_next_action(
                    current_status, components
                ),
                "can_submit": current_status == "APPLICATION_COMPONENTS_COMPLETE",
            }

        except Exception as e:
            raise BusinessLogicError(f"Failed to get FCL status: {str(e)}") from e

    async def create_company_user(
        self,
        fso_user_id: UUID,
        company_id: UUID,
        email: str,
        first_name: str,
        last_name: str,
        role: str = "KMP",  # Key Management Personnel
        permissions: Optional[List[str]] = None,
        phone: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Allow FSO to create additional users for their company.
        All users are contributors to the single FCL application.
        """
        if permissions is None:
            permissions = ["read"]  # Default read-only

        try:
            # TODO: Verify FSO has admin rights for this company

            new_user_id = uuid4()

            user_data = {
                "id": new_user_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "role": role,
                "is_admin": False,  # Only FSO is admin
                "company_id": company_id,
                "created_by": fso_user_id,
                "permissions": permissions,
                "created_at": datetime.utcnow(),
                "is_active": True,
            }

            # TODO: Save to database

            return {
                "success": True,
                "user_id": new_user_id,
                "message": f"{role} user created successfully",
                "permissions": permissions,
                "fcl_access": "contributor",  # All company users are FCL contributors
            }

        except Exception as e:
            raise BusinessLogicError(f"Failed to create company user: {str(e)}") from e

    async def update_user_permissions(
        self, fso_user_id: UUID, target_user_id: UUID, new_permissions: List[str]
    ) -> Dict[str, Any]:
        """FSO can update permissions for users in their company."""
        try:
            # TODO: Verify FSO owns the target user's company
            # TODO: Update user permissions in database

            return {
                "success": True,
                "user_id": target_user_id,
                "permissions": new_permissions,
                "updated_by": fso_user_id,
                "updated_at": datetime.utcnow(),
            }

        except Exception as e:
            raise BusinessLogicError(
                f"Failed to update user permissions: {str(e)}"
            ) from e

    async def get_company_users(self, company_id: UUID) -> List[Dict[str, Any]]:
        """Get all users associated with a company."""
        try:
            # TODO: Query database for company users
            # Mock data for testing

            users = [
                {
                    "id": uuid4(),
                    "email": "fso@company.com",
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "role": "FSO",
                    "is_admin": True,
                    "permissions": ["read", "write", "admin"],
                    "last_login": datetime.utcnow() - timedelta(hours=2),
                    "is_active": True,
                }
            ]

            return users

        except Exception as e:
            raise BusinessLogicError(f"Failed to get company users: {str(e)}") from e

    def _hash_password(self, password: str) -> str:
        """Simple password hashing - use proper bcrypt in production."""
        # TODO: Use proper password hashing (bcrypt)
        return f"hashed_{password}_salt"

    def _get_next_action(self, status: str, components: Dict[str, Any]) -> str:
        """Determine the next required action based on current status."""
        if status == "NOT_STARTED":
            return "Complete company profile information"

        # Find first incomplete required component
        for comp_name, comp_info in components.items():
            if comp_info["required"] and not comp_info["complete"]:
                return f"Complete {comp_name.replace('_', ' ').title()}"

        if status == "APPLICATION_COMPONENTS_COMPLETE":
            return "Review and submit FCL application"

        return "No action required"


def get_fso_auth_service(db: Session = Depends(get_sync_db_session)) -> FSO_AuthService:
    """Dependency injection for FSO_AuthService."""
    return FSO_AuthService(db)
