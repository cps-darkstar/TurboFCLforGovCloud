"""
Enterprise API Router Integration

This module provides the main router integration for all enterprise endpoints,
organizing them into a cohesive API structure with proper middleware and documentation.
"""

from fastapi import APIRouter

# Import endpoint modules
from .endpoints.enterprise import router as enterprise_router
from .endpoints.fso_auth import router as fso_auth_router
from .endpoints.simple_auth import router as simple_auth_router

# Create main API router
api_router = APIRouter(prefix="/api/v1")


# Health check endpoint (no auth required)
@api_router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "TurboFCL Enterprise API"}


# Include all routers
api_router.include_router(enterprise_router, prefix="/enterprise", tags=["Enterprise"])
api_router.include_router(
    simple_auth_router, prefix="/auth", tags=["Simple Authentication"]
)
api_router.include_router(fso_auth_router, prefix="/fso", tags=["FSO Authentication"])


# Export the main router
__all__ = ["api_router"]
