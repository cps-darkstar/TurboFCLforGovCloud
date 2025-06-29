import os
import re
from typing import Any, Dict, List

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
        "source": "mock",
    }


@app.get("/api/sam-data/{uei}")
async def get_sam_data(uei: str) -> Dict[str, Any]:
    """
    Fetch entity data from SAM.gov API using UEI (Unique Entity Identifier).
    Falls back to mock data if API is unavailable.
    """
    # Validate UEI format
    if not await validate_uei_format(uei):
        raise HTTPException(
            status_code=400, detail="UEI must be exactly 12 alphanumeric characters"
        )

    # Get SAM.gov API key from environment
    sam_api_key = os.getenv("SAM_GOV_API_KEY")

    if not sam_api_key or sam_api_key.strip() == "":
        print(f"📝 No SAM.gov API key found, returning mock data for UEI: {uei}")
        return get_mock_sam_data(uei)

    try:
        print(f"🌐 Making request to SAM.gov for UEI: {uei}")
        async with httpx.AsyncClient() as client:
            # Try the correct SAM.gov API format
            sam_url = "https://api.sam.gov/entity-information/v3/entities"
            headers = {"X-API-Key": sam_api_key, "Accept": "application/json"}
            params = {"ueiSAM": uei, "includeSections": "entityRegistration,coreData"}

            response = await client.get(
                sam_url, headers=headers, params=params, timeout=30.0
            )

            print(f"📊 SAM.gov Response: {response.status_code}")

            if response.status_code == 200:
                sam_data = response.json()
                print(f"✅ Got real SAM data for {uei}")

                if "entityData" in sam_data and len(sam_data["entityData"]) > 0:
                    entity = sam_data["entityData"][0]
                    entity_reg = entity.get("entityRegistration", {})

                    return {
                        "uei": uei,
                        "entityName": entity_reg.get("legalBusinessName"),
                        "cageCode": entity_reg.get("cageCode"),
                        "entityType": entity_reg.get("entityStructureDesc"),
                        "stateOfIncorporation": entity_reg.get("stateOfIncorporation"),
                        "registrationStatus": entity_reg.get("registrationStatus"),
                        "lastUpdated": entity_reg.get("lastUpdateDate"),
                        "registrationInfo": {
                            "is_active": entity_reg.get(
                                "registrationStatus", ""
                            ).upper()
                            == "ACTIVE",
                            "expires_soon": False,
                            "days_until_expiry": None,
                            "warnings": [],
                        },
                        "source": "sam.gov",
                    }

            # If API call failed, fall back to mock data
            print(f"⚠️ SAM.gov API failed ({response.status_code}), using mock data")
            mock_data = get_mock_sam_data(uei)
            mock_data["apiError"] = f"SAM.gov returned {response.status_code}"
            return mock_data

    except Exception as e:
        print(f"❌ Error calling SAM.gov API: {str(e)}")
        print(f"📝 Falling back to mock data for UEI: {uei}")
        mock_data = get_mock_sam_data(uei)
        mock_data["apiError"] = str(e)
        return mock_data


@app.get("/api/sam-data/{uei}/test")
async def test_sam_data(uei: str) -> Dict[str, Any]:
    """Test endpoint that always returns mock data"""
    if not await validate_uei_format(uei):
        raise HTTPException(
            status_code=400, detail="UEI must be exactly 12 alphanumeric characters"
        )

    return get_mock_sam_data(uei)


@app.get("/api/business-structures")
async def get_business_structures() -> List[Dict[str, Any]]:
    """
    Get all representative business structures for demo purposes
    """
    if not generate_demo_companies:
        raise HTTPException(
            status_code=500, detail="Business structure generator not available"
        )

    try:
        companies = generate_demo_companies()
        return companies
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating business structures: {str(e)}"
        )


@app.get("/api/foci-assessment/{uei}")
async def get_foci_assessment(uei: str) -> Dict[str, Any]:
    """
    Get FOCI assessment for a specific UEI
    """
    if not generate_demo_companies or not generate_foci_assessment_report:
        raise HTTPException(
            status_code=500, detail="FOCI assessment generator not available"
        )

    try:
        companies = generate_demo_companies()
        company = next((c for c in companies if c["uei"] == uei), None)

        if not company:
            raise HTTPException(
                status_code=404, detail=f"Company with UEI {uei} not found"
            )

        foci_assessment = generate_foci_assessment_report(company)
        return foci_assessment
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating FOCI assessment: {str(e)}"
        )


@app.get("/api/kmp-requirements/{uei}")
async def get_kmp_requirements(uei: str) -> Dict[str, Any]:
    """
    Get Key Management Personnel requirements for a specific UEI
    """
    if not generate_demo_companies or not generate_kmp_requirements:
        raise HTTPException(
            status_code=500, detail="KMP requirements generator not available"
        )

    try:
        companies = generate_demo_companies()
        company = next((c for c in companies if c["uei"] == uei), None)

        if not company:
            raise HTTPException(
                status_code=404, detail=f"Company with UEI {uei} not found"
            )

        kmp_requirements = generate_kmp_requirements(company)
        return kmp_requirements
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating KMP requirements: {str(e)}"
        )


@app.get("/api/business-structure/{uei}")
async def get_business_structure_details(uei: str) -> Dict[str, Any]:
    """
    Get complete business structure details including FOCI assessment and KMP requirements
    """
    if not generate_demo_companies:
        raise HTTPException(
            status_code=500, detail="Business structure generator not available"
        )

    try:
        companies = generate_demo_companies()
        company = next((c for c in companies if c["uei"] == uei), None)

        if not company:
            raise HTTPException(
                status_code=404, detail=f"Company with UEI {uei} not found"
            )

        # Get FOCI assessment and KMP requirements
        foci_assessment = None
        kmp_requirements = None

        if generate_foci_assessment_report:
            foci_assessment = generate_foci_assessment_report(company)

        if generate_kmp_requirements:
            kmp_requirements = generate_kmp_requirements(company)

        return {
            "businessStructure": company,
            "fociAssessment": foci_assessment,
            "kmpRequirements": kmp_requirements,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting business structure details: {str(e)}",
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
    print(f"📖 API docs: http://localhost:{port}/docs")
    print(f"🔍 Test endpoint: http://localhost:{port}/api/sam-data/ZQGGHJH74DW7")
    print(f"🧪 Mock endpoint: http://localhost:{port}/api/sam-data/ZQGGHJH74DW7/test")
    uvicorn.run(app, host="127.0.0.1", port=port)
