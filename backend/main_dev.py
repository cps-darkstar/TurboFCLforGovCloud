import os
import re
from typing import Any, Dict

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

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


@app.get("/")
async def root():
    """
    Root endpoint that returns a status message indicating the API is running.
    """
    return {"message": "TurboFCL API is running"}


async def validate_uei_format(uei: str) -> bool:
    """Validate UEI format before making API call"""
    pattern = r"^[A-Z0-9]{12}$"
    return bool(re.match(pattern, uei.upper()))


def get_mock_sam_data(uei: str) -> Dict[str, Any]:
    """Generate mock SAM data for development"""
    mock_business_sizes = [
        "Small Business",
        "Large Business",
        "Small Disadvantaged Business",
        "Woman-Owned Small Business",
        "Veteran-Owned Small Business",
        "HUBZone Small Business",
        "8(a) Small Disadvantaged Business",
    ]

    # Use UEI to determine mock business size for consistency
    size_index = sum(ord(c) for c in uei) % len(mock_business_sizes)
    business_size = mock_business_sizes[size_index]

    mock_companies = [
        "Innovative Tech Solutions Corp",
        "Advanced Defense Systems LLC",
        "Precision Engineering Inc",
        "Strategic Consulting Group",
        "NextGen Development Partners",
        "Elite Services Corporation",
        "Professional Solutions LLC",
    ]

    company_index = sum(ord(c) for c in uei[:6]) % len(mock_companies)
    company_name = mock_companies[company_index]

    return {
        "uei": uei,
        "entityName": f"{company_name} ({uei})",
        "cageCode": f"{(hash(uei) % 90000) + 10000:05d}",
        "entityType": (
            "Corporation" if "Corp" in company_name else "Limited Liability Company"
        ),
        "stateOfIncorporation": ["DE", "VA", "MD", "TX", "CA", "FL"][hash(uei) % 6],
        "registrationStatus": "Active",
        "lastUpdated": "2024-01-15T10:30:00Z",
        "businessSize": business_size,
        "registrationInfo": {
            "is_active": True,
            "expires_soon": False,
            "days_until_expiry": 180,
            "warnings": [],
        },
    }


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
    if not await validate_uei_format(uei):
        raise HTTPException(
            status_code=400, detail="UEI must be exactly 12 alphanumeric characters"
        )

    # Get SAM.gov API key from environment
    sam_api_key = os.getenv("SAM_GOV_API_KEY")

    # Check if we have a valid API key (not None or empty string)
    if not sam_api_key or sam_api_key.strip() == "":
        # For development, return mock data if no API key
        print(f"🔧 No SAM_GOV_API_KEY found, returning mock data for UEI: {uei}")
        return get_mock_sam_data(uei)

    try:
        async with httpx.AsyncClient() as client:
            # SAM.gov Entity Management API endpoint
            sam_url = "https://api.sam.gov/entity-information/v3/entities"
            params = {
                "ueiSAM": uei,
                "api_key": sam_api_key,
                "format": "JSON",
                "includeSections": "entityRegistration,coreData",
            }

            print(f"🌐 Making request to SAM.gov for UEI: {uei}")
            response = await client.get(sam_url, params=params, timeout=30.0)

            if response.status_code == 404:
                print(f"❌ UEI not found in SAM.gov: {uei}")
                raise HTTPException(
                    status_code=404, detail=f"No entity found for UEI: {uei}"
                )
            elif response.status_code != 200:
                print(f"❌ SAM.gov API error: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Error fetching data from SAM.gov",
                )

            sam_data = response.json()

            # Extract key fields for TurboFCL
            if "entityData" in sam_data and len(sam_data["entityData"]) > 0:
                entity = sam_data["entityData"][0]
                entity_reg = entity.get("entityRegistration", {})

                print(
                    f"✅ Successfully fetched SAM data for: {entity_reg.get('legalBusinessName')}"
                )

                return {
                    "uei": uei,
                    "entityName": entity_reg.get("legalBusinessName"),
                    "cageCode": entity_reg.get("cageCode"),
                    "entityType": entity_reg.get("entityStructureDesc"),
                    "stateOfIncorporation": entity_reg.get("stateOfIncorporation"),
                    "registrationStatus": entity_reg.get("registrationStatus"),
                    "lastUpdated": entity_reg.get("lastUpdateDate"),
                    "registrationInfo": {
                        "is_active": entity_reg.get("registrationStatus", "").upper()
                        == "ACTIVE",
                        "expires_soon": False,
                        "days_until_expiry": None,
                        "warnings": [],
                    },
                }
            else:
                print(f"❌ No entity data found in SAM.gov response for UEI: {uei}")
                raise HTTPException(
                    status_code=404, detail=f"No entity data found for UEI: {uei}"
                )

    except httpx.TimeoutException:
        print(f"⏰ Timeout while fetching SAM data for UEI: {uei}")
        raise HTTPException(
            status_code=408, detail="Timeout while fetching data from SAM.gov"
        )
    except httpx.RequestError as e:
        print(f"🔌 Connection error to SAM.gov: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error connecting to SAM.gov: {str(e)}"
        )


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
    print(f"🚀 TurboFCL API starting on port {port}")
    print(f"📖 API docs available at: http://localhost:{port}/docs")
    print(f"🔍 Test endpoint: http://localhost:{port}/api/sam-data/123456789ABC")
    uvicorn.run(app, host="127.0.0.1", port=port)
