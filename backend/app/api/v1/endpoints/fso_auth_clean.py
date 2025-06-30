"""
FSO Authentication API Endpoints for TurboFCL

Simplified endpoints for FSO-centric authentication and account management.
Designed for testing phase with 5-10 testers at ISI and a few at DARPA.
"""

from typing import List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/request-account", response_model=Dict[str, Any])
async def request_account_access(request_data: Dict[str, Any]):
    """
    Request account access - public endpoint for new FSOs.
    Matches your improved form with FSO name, contact info, company name, and UEI.
    """
    try:
        # Mock response for now
        return {
            "message": "Account request submitted successfully",
            "request_id": "req-123",
            "status": "pending_review",
            "estimated_approval_time": "1-2 business days",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process account request: {str(e)}",
        ) from e


@router.post("/register", response_model=Dict[str, Any])
async def register_fso(registration_data: Dict[str, Any]):
    """
    FSO registration (after approval by admin/Coleman).
    Creates FSO account with initial company setup.
    """
    try:
        # Mock response for now
        return {
            "message": "FSO registered successfully",
            "fso_id": "fso-123",
            "company_id": "comp-123",
            "access_token": "token-abc123",
            "token_type": "bearer",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.post("/login", response_model=Dict[str, Any])
async def login_fso(login_data: Dict[str, Any]):
    """
    FSO login endpoint.
    Returns JWT tokens for authenticated sessions.
    """
    try:
        # Mock response for now
        return {
            "access_token": "token-abc123",
            "token_type": "bearer",
            "expires_in": 3600,
            "fso_id": "fso-123",
            "company_id": "comp-123",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from e


@router.get("/companies/{company_id}/users", response_model=List[Dict[str, Any]])
async def get_company_users(company_id: UUID):
    """
    Get all users associated with a company.
    FSO can manage their company's users.
    """
    try:
        # Mock response for now
        return [
            {
                "id": "user-123",
                "name": "John Doe",
                "email": "john.doe@example.com",
                "role": "employee",
                "clearance_level": "secret",
            }
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.post("/companies/{company_id}/users", response_model=Dict[str, Any])
async def create_company_user(company_id: UUID, user_data: Dict[str, Any]):
    """
    Create a new user for the company.
    FSO can add employees to their company.
    """
    try:
        # Mock response for now
        return {
            "message": "User created successfully",
            "user_id": "user-124",
            "company_id": str(company_id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.put("/users/{user_id}/permissions", response_model=Dict[str, Any])
async def update_user_permissions(user_id: UUID, permissions_data: Dict[str, Any]):
    """
    Update user permissions within the company.
    FSO can manage their employees' permissions.
    """
    try:
        # Mock response for now
        return {
            "message": "User permissions updated successfully",
            "user_id": str(user_id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.get("/companies/{company_id}/fcl-status", response_model=Dict[str, Any])
async def get_fcl_status(company_id: UUID):
    """
    Get FCL application status for the company.
    Shows current clearance level and application status.
    """
    try:
        # Mock response for now
        return {
            "company_id": str(company_id),
            "current_clearance": "confidential",
            "application_status": "in_progress",
            "last_updated": "2025-01-27T10:00:00Z",
            "next_review_date": "2025-02-15",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.get("/system/status", response_model=Dict[str, Any])
async def get_system_status():
    """
    Get system status - for monitoring and health checks.
    Shows current system health and statistics.
    """
    try:
        # Mock response for now
        return {
            "status": "operational",
            "total_companies": 5,
            "total_fsos": 8,
            "total_applications": 12,
            "last_updated": "2025-01-27T10:00:00Z",
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system status: {str(e)}",
        ) from e
