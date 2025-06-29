import os

# Import business demo data
import sys
from typing import Any, Dict, List

from app.services.sam_service import SAMService
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))
try:
    from scripts.business_size_demo import (
        generate_demo_companies,
        generate_foci_assessment_report,
    )
except ImportError:
    # Fallback if import fails
    def generate_demo_companies():
        return []

    def generate_foci_assessment_report(company_data):
        return {"error": "Business demo module not available"}


app = FastAPI(title="TurboFCL API", version="1.0.0")

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
sam_service = SAMService()

# Generate demo business data
DEMO_BUSINESSES = generate_demo_companies()


@app.get("/")
async def root():
    """
    Root endpoint that returns a status message indicating the API is running.
    """
    return {"message": "TurboFCL API is running"}


@app.get("/api/sam-data/{uei}")
async def get_sam_data(uei: str) -> Dict[str, Any]:
    """
    Fetch entity data from SAM.gov API using UEI (Unique Entity Identifier).

    Args:
        uei: 12-character Unique Entity Identifier

    Returns:
        Dict containing entity information from SAM.gov
    """
    # Validate UEI format
    if not await sam_service.validate_uei_format(uei):
        raise HTTPException(
            status_code=400, detail="UEI must be exactly 12 alphanumeric characters"
        )

    # Fetch SAM data using the service
    sam_data = await sam_service.fetch_sam_data(uei)

    if not sam_data:
        raise HTTPException(status_code=404, detail=f"No entity found for UEI: {uei}")

    # Check registration status
    status_info = await sam_service.check_registration_status(sam_data)

    # Return normalized data for frontend
    return {
        "uei": sam_data.get("uei", uei),
        "entityName": sam_data.get("legal_business_name"),
        "cageCode": sam_data.get("cage_code"),
        "entityType": sam_data.get("entity_structure"),
        "stateOfIncorporation": sam_data.get("state_of_incorporation"),
        "registrationStatus": sam_data.get("registration_status"),
        "lastUpdated": sam_data.get("last_updated"),
        "registrationInfo": status_info,
    }


@app.get("/api/business-structure/{uei}")
async def get_business_structure(uei: str) -> Dict[str, Any]:
    """
    Get the business structure for a given UEI.

    Args:
        uei: 12-character Unique Entity Identifier

    Returns:
        Dict containing business structure information
    """
    # Validate UEI format
    if not await sam_service.validate_uei_format(uei):
        raise HTTPException(
            status_code=400, detail="UEI must be exactly 12 alphanumeric characters"
        )

    # Find the demo business by UEI
    business = next((b for b in DEMO_BUSINESSES if b["uei"] == uei), None)

    if not business:
        raise HTTPException(status_code=404, detail=f"No business found for UEI: {uei}")

    return {"uei": business["uei"], "entityType": business["entityType"]}


@app.get("/api/business-structures")
async def get_business_structures() -> List[Dict[str, Any]]:
    """Get all representative business structures for demo purposes"""
    return DEMO_BUSINESSES


@app.get("/api/foci-assessment/{uei}")
async def get_foci_assessment(uei: str) -> Dict[str, Any]:
    """Get FOCI assessment for a specific UEI"""
    # Find the business
    business = next((b for b in DEMO_BUSINESSES if b["uei"] == uei), None)
    if not business:
        raise HTTPException(
            status_code=404, detail=f"Business with UEI {uei} not found"
        )

    # Generate FOCI assessment using the demo logic
    return generate_foci_assessment_report(business)


@app.get("/api/kmp-requirements/{uei}")
async def get_kmp_requirements(uei: str) -> Dict[str, Any]:
    """Get Key Management Personnel requirements for a specific UEI"""
    from scripts.business_size_demo import generate_kmp_requirements

    # Find the business
    business = next((b for b in DEMO_BUSINESSES if b["uei"] == uei), None)
    if not business:
        raise HTTPException(
            status_code=404, detail=f"Business with UEI {uei} not found"
        )

    # Generate KMP requirements
    return generate_kmp_requirements(business)


if __name__ == "__main__":
    import socket

    import uvicorn

    # Find available port in range 8000-8009
    def find_free_port(start_port=8000, end_port=8009):
        for test_port in range(start_port, end_port + 1):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("localhost", test_port))
                    return test_port
            except OSError:
                continue
        return start_port  # fallback

    port = find_free_port()
    print(f"Starting server on port {port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
