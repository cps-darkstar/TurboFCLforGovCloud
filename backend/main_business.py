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

# Business structure demo data - inline for simplicity
DEMO_BUSINESSES = [
    {
        "uei": "LRG12345ABCD",
        "entityName": "Raytheon Technologies Corporation",
        "businessSize": "Large Business",
        "category": "LARGE_BUSINESS",
        "entityType": "Public Corporation (Delaware C-Corp)",
        "structureComplexity": "Multi-tier holding company with 200+ subsidiaries",
        "focifactors": [
            "NYSE: RTX",
            "International joint ventures",
            "Foreign revenue 35%",
        ],
        "kmpCount": 12,
        "clearanceLevels": ["SECRET", "TOP_SECRET"],
        "specialAgreements": ["SSA with DoD for Collins Aerospace"],
        "ownershipTiers": 4,
        "foreignOwnership": 8.2,
        "complianceComplexity": "HIGH",
        "registrationStatus": "Active",
        "cageCode": "45892",
    },
    {
        "uei": "SML24680MNOP",
        "entityName": "Cyber Defense Solutions LLC",
        "businessSize": "Small Business",
        "category": "SMALL_BUSINESS",
        "entityType": "Virginia Limited Liability Company (Member-Managed)",
        "structureComplexity": "Three founding members with equal ownership",
        "focifactors": ["No foreign ownership", "US citizens only"],
        "kmpCount": 3,
        "clearanceLevels": ["SECRET"],
        "specialAgreements": [],
        "ownershipTiers": 1,
        "foreignOwnership": 0.0,
        "complianceComplexity": "LOW",
        "registrationStatus": "Active",
        "cageCode": "23451",
    },
    {
        "uei": "VET77777GGGG",
        "entityName": "Special Operations Contracting LLC",
        "businessSize": "Veteran-Owned Small Business",
        "category": "VOSB",
        "entityType": "North Carolina Limited Liability Company",
        "structureComplexity": "Veteran-owned with DoD contractor teaming agreements",
        "focifactors": ["Veteran ownership 100%", "Special operations background"],
        "kmpCount": 3,
        "clearanceLevels": ["SECRET", "TOP_SECRET"],
        "specialAgreements": ["Veteran verification"],
        "ownershipTiers": 1,
        "foreignOwnership": 0.0,
        "complianceComplexity": "LOW",
        "registrationStatus": "Active",
        "cageCode": "67890",
    },
    {
        "uei": "WOM44444DDDD",
        "entityName": "Strategic Consulting Partners LLC",
        "businessSize": "Woman-Owned Small Business",
        "category": "WOSB",
        "entityType": "Delaware Limited Liability Company (Manager-Managed)",
        "structureComplexity": "Female CEO with private equity backing",
        "focifactors": ["Woman ownership 51%", "PE fund minority stake"],
        "kmpCount": 4,
        "clearanceLevels": ["SECRET"],
        "specialAgreements": [],
        "ownershipTiers": 2,
        "foreignOwnership": 0.0,
        "complianceComplexity": "LOW",
        "registrationStatus": "Active",
        "cageCode": "12367",
    },
]


@app.get("/")
async def root():
    """
    Root endpoint that returns a status message indicating the API is running.
    """
    return {"message": "TurboFCL API is running with Business Structure Explorer"}


async def validate_uei_format(uei: str) -> bool:
    """Validate UEI format before making API call"""
    pattern = r"^[A-Z0-9]{12}$"
    return bool(re.match(pattern, uei.upper()))


def get_mock_sam_data(uei: str) -> Dict[str, Any]:
    """Generate mock SAM data for development"""
    # Check if this UEI exists in our demo businesses
    demo_business = next((b for b in DEMO_BUSINESSES if b["uei"] == uei), None)

    if demo_business:
        return {
            "uei": uei,
            "entityName": demo_business["entityName"],
            "cageCode": demo_business["cageCode"],
            "entityType": demo_business["entityType"],
            "registrationStatus": demo_business["registrationStatus"],
            "lastUpdated": "2024-01-15T10:30:00Z",
            "source": "demo_business_data",
        }

    # Fallback to generic mock data
    mock_business_sizes = [
        "Small Business",
        "Large Business",
        "Small Disadvantaged Business",
        "Woman-Owned Small Business",
        "Veteran-Owned Small Business",
        "HUBZone Small Business",
        "8(a) Small Disadvantaged Business",
    ]

    size_index = sum(ord(c) for c in uei) % len(mock_business_sizes)
    business_size = mock_business_sizes[size_index]

    return {
        "uei": uei,
        "entityName": f"Mock Company for {uei}",
        "cageCode": f"{(hash(uei) % 90000) + 10000:05d}",
        "entityType": "Corporation",
        "registrationStatus": "Active",
        "lastUpdated": "2024-01-15T10:30:00Z",
        "businessSize": business_size,
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
                        "registrationStatus": entity_reg.get("registrationStatus"),
                        "lastUpdated": entity_reg.get("lastUpdateDate"),
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

    # Calculate FOCI score
    foci_score = 0
    risk_factors = []

    if business["foreignOwnership"] > 15:
        foci_score += 3
        risk_factors.append(f"Foreign ownership: {business['foreignOwnership']}%")
    elif business["foreignOwnership"] > 5:
        foci_score += 2
        risk_factors.append(
            f"Moderate foreign ownership: {business['foreignOwnership']}%"
        )

    if business["ownershipTiers"] > 3:
        foci_score += 2
        risk_factors.append("Complex multi-tier ownership structure")

    if "international" in str(business["focifactors"]).lower():
        foci_score += 1
        risk_factors.append("International business operations")

    # Determine mitigation
    if foci_score >= 5:
        mitigation = "Special Security Agreement (SSA) required"
        risk_level = "HIGH"
    elif foci_score >= 3:
        mitigation = "Board Resolution or Proxy Agreement recommended"
        risk_level = "MEDIUM"
    elif foci_score >= 1:
        mitigation = "Enhanced monitoring required"
        risk_level = "MEDIUM"
    else:
        mitigation = "Standard facility clearance procedures"
        risk_level = "LOW"

    return {
        "uei": business["uei"],
        "companyName": business["entityName"],
        "fociScore": foci_score,
        "riskLevel": risk_level,
        "riskFactors": risk_factors,
        "recommendedMitigation": mitigation,
        "specialAgreements": business["specialAgreements"],
        "assessmentDate": "2025-06-29",
    }


if __name__ == "__main__":
    import socket

    import uvicorn

    def find_free_port(start_port=8000, end_port=8009):
        for test_port in range(start_port, end_port + 1):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(("localhost", test_port))
                    return test_port
            except OSError:
                continue
        return start_port

    port = find_free_port()
    print(f"🚀 TurboFCL API with Business Structures starting on port {port}")
    print(f"📖 API docs: http://localhost:{port}/docs")
    print(f"🔍 Business structures: http://localhost:{port}/api/business-structures")
    print(
        f"🎯 FOCI assessment: http://localhost:{port}/api/foci-assessment/LRG12345ABCD"
    )
    uvicorn.run(app, host="127.0.0.1", port=port)
