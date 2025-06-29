"""
TurboFCL Business Size Classification System
Generates representative UEIs for all 7 business size categories
"""

"""
TurboFCL Business Size Classification System
Generates representative UEIs for all 7 business size categories with complex entity structures
Based on DCSA/NISS facility clearance requirements and real defense contractor patterns
"""

BUSINESS_SIZE_CATEGORIES = {
    "LARGE_BUSINESS": {
        "name": "Large Business",
        "description": "Companies that exceed SBA size standards",
        "entity_structures": [
            {
                "uei": "LRG12345ABCD",
                "name": "Raytheon Technologies Corporation",
                "entity_type": "Public Corporation (Delaware C-Corp)",
                "structure_complexity": "Multi-tier holding company with 200+ subsidiaries",
                "foci_factors": [
                    "NYSE: RTX",
                    "International joint ventures",
                    "Foreign revenue 35%",
                ],
                "kmp_count": 12,
                "clearance_levels": ["SECRET", "TOP_SECRET"],
                "special_agreements": ["SSA with DoD for Collins Aerospace"],
                "ownership_tiers": 4,
                "foreign_ownership": 8.2,
            },
            {
                "uei": "BIG67890EFGH",
                "name": "Lockheed Martin Holdings LLC",
                "entity_type": "Delaware Limited Liability Company",
                "structure_complexity": "Manager-managed LLC with institutional investors",
                "foci_factors": [
                    "Pension fund ownership",
                    "Canadian subsidiary operations",
                ],
                "kmp_count": 8,
                "clearance_levels": ["SECRET", "TOP_SECRET"],
                "special_agreements": ["Proxy Agreement for F-35 program"],
                "ownership_tiers": 3,
                "foreign_ownership": 12.1,
            },
            {
                "uei": "CRP13579IJKL",
                "name": "General Dynamics Master Limited Partnership",
                "entity_type": "Delaware Master Limited Partnership",
                "structure_complexity": "Publicly traded partnership with complex tax structure",
                "foci_factors": [
                    "UK pension fund limited partner",
                    "European operations",
                ],
                "kmp_count": 15,
                "clearance_levels": ["CONFIDENTIAL", "SECRET", "TOP_SECRET"],
                "special_agreements": ["Board Resolution Exclusion"],
                "ownership_tiers": 5,
                "foreign_ownership": 15.7,
            },
        ],
        "characteristics": [
            "Over 500 employees",
            "Revenue > $41.5M",
            "Complex FOCI mitigation",
        ],
    },
    "SMALL_BUSINESS": {
        "name": "Small Business",
        "description": "Companies meeting SBA size standards",
        "entity_structures": [
            {
                "uei": "SML24680MNOP",
                "name": "Cyber Defense Solutions LLC",
                "entity_type": "Virginia Limited Liability Company (Member-Managed)",
                "structure_complexity": "Three founding members with equal ownership",
                "foci_factors": ["No foreign ownership", "US citizens only"],
                "kmp_count": 3,
                "clearance_levels": ["SECRET"],
                "special_agreements": [],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "SMB97531QRST",
                "name": "Advanced Materials Corporation",
                "entity_type": "Maryland S-Corporation",
                "structure_complexity": "Employee Stock Ownership Plan (ESOP) structure",
                "foci_factors": ["ESOP trust", "Employee ownership 100%"],
                "kmp_count": 5,
                "clearance_levels": ["CONFIDENTIAL", "SECRET"],
                "special_agreements": [],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "SBC86420UVWX",
                "name": "Tactical Systems Partnership",
                "entity_type": "Texas Limited Liability Partnership",
                "structure_complexity": "Professional services partnership with managing partners",
                "foci_factors": [
                    "Former military officers",
                    "Government contracting focus",
                ],
                "kmp_count": 4,
                "clearance_levels": ["SECRET"],
                "special_agreements": [],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": ["Under 500 employees", "Revenue < $41.5M", "SBA certified"],
    },
    "SDB": {
        "name": "Small Disadvantaged Business",
        "description": "Small businesses owned by disadvantaged individuals",
        "entity_structures": [
            {
                "uei": "SDB11111AAAA",
                "name": "Minority Defense Contractors LLC",
                "entity_type": "Delaware Limited Liability Company (Single-Member)",
                "structure_complexity": "Sole proprietorship converted to LLC for liability protection",
                "foci_factors": [
                    "African American ownership 100%",
                    "Disadvantaged area location",
                ],
                "kmp_count": 2,
                "clearance_levels": ["CONFIDENTIAL"],
                "special_agreements": [],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "DIS22222BBBB",
                "name": "Hispanic Engineering Solutions Corporation",
                "entity_type": "California Benefit Corporation",
                "structure_complexity": "B-Corp with social mission and profit motive",
                "foci_factors": ["Hispanic ownership 51%", "Community benefit mission"],
                "kmp_count": 3,
                "clearance_levels": ["SECRET"],
                "special_agreements": [],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "ADV33333CCCC",
                "name": "Native American Defense Technologies LLC",
                "entity_type": "Tribally-Chartered Limited Liability Company",
                "structure_complexity": "Tribal entity with sovereign immunity considerations",
                "foci_factors": ["Tribal ownership", "Federal trust land operations"],
                "kmp_count": 4,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["Tribal sovereignty agreement"],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": [
            "SDB certified",
            "51% owned by disadvantaged",
            "Small business",
        ],
    },
    "WOSB": {
        "name": "Woman-Owned Small Business",
        "description": "Small businesses owned by women",
        "entity_structures": [
            {
                "uei": "WOM44444DDDD",
                "name": "Strategic Consulting Partners LLC",
                "entity_type": "Delaware Limited Liability Company (Manager-Managed)",
                "structure_complexity": "Female CEO with private equity backing",
                "foci_factors": ["Woman ownership 51%", "PE fund minority stake"],
                "kmp_count": 4,
                "clearance_levels": ["SECRET"],
                "special_agreements": [],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "WOS55555EEEE",
                "name": "Women's Defense Manufacturing Corporation",
                "entity_type": "Michigan Professional Corporation",
                "structure_complexity": "Professional corporation with licensed engineers",
                "foci_factors": [
                    "Female engineers 75%",
                    "Professional licensing requirements",
                ],
                "kmp_count": 6,
                "clearance_levels": ["CONFIDENTIAL", "SECRET"],
                "special_agreements": [],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "FEM66666FFFF",
                "name": "Innovative Defense Solutions Family Trust",
                "entity_type": "Family Limited Partnership with Trust Structure",
                "structure_complexity": "Multi-generational family business with trust management",
                "foci_factors": [
                    "Family trust ownership",
                    "Second generation leadership",
                ],
                "kmp_count": 5,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["Family trust documentation"],
                "ownership_tiers": 3,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": ["51% owned by women", "WOSB certified", "Small business"],
    },
    "VOSB": {
        "name": "Veteran-Owned Small Business",
        "description": "Small businesses owned by veterans",
        "entity_structures": [
            {
                "uei": "VET77777GGGG",
                "name": "Special Operations Contracting LLC",
                "entity_type": "North Carolina Limited Liability Company",
                "structure_complexity": "Veteran-owned with DoD contractor teaming agreements",
                "foci_factors": [
                    "Veteran ownership 100%",
                    "Special operations background",
                ],
                "kmp_count": 3,
                "clearance_levels": ["SECRET", "TOP_SECRET"],
                "special_agreements": ["Veteran verification"],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "VOS88888HHHH",
                "name": "Disabled Veteran Logistics Corporation",
                "entity_type": "Service-Disabled Veteran-Owned Small Business Corporation",
                "structure_complexity": "SDVOSB with VA certification and disability documentation",
                "foci_factors": ["Disabled veteran 51%", "VA healthcare contracts"],
                "kmp_count": 4,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["SDVOSB certification"],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "SVC99999IIII",
                "name": "Military Contractors Joint Venture",
                "entity_type": "Unincorporated Joint Venture Agreement",
                "structure_complexity": "Temporary JV between two veteran-owned companies",
                "foci_factors": [
                    "Joint venture structure",
                    "Multiple prime contractors",
                ],
                "kmp_count": 6,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["Joint venture agreement"],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": [
            "51% owned by veterans",
            "VOSB certified",
            "Small business",
        ],
    },
    "HUBZONE": {
        "name": "HUBZone Small Business",
        "description": "Small businesses in Historically Underutilized Business Zones",
        "entity_structures": [
            {
                "uei": "HUB00000JJJJ",
                "name": "Rural Defense Manufacturing LLC",
                "entity_type": "West Virginia Limited Liability Company",
                "structure_complexity": "Rural location with community development focus",
                "foci_factors": ["HUBZone location", "Rural community employment 35%+"],
                "kmp_count": 3,
                "clearance_levels": ["CONFIDENTIAL"],
                "special_agreements": ["HUBZone certification"],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "ZON11111KKKK",
                "name": "Urban Renewal Defense Contractors Corporation",
                "entity_type": "Michigan Certified Benefit Corporation",
                "structure_complexity": "Urban HUBZone with community benefit mission",
                "foci_factors": ["Detroit HUBZone", "Community hiring requirements"],
                "kmp_count": 5,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["Community benefit reporting"],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "HBZ22222LLLL",
                "name": "Native Lands Defense Cooperative",
                "entity_type": "Worker Cooperative Corporation",
                "structure_complexity": "Employee-owned cooperative on tribal lands",
                "foci_factors": ["Tribal HUBZone", "Worker-owned structure"],
                "kmp_count": 7,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["Cooperative bylaws", "Tribal land lease"],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": [
            "Located in HUBZone",
            "35% employees in HUBZone",
            "Small business",
        ],
    },
    "8A": {
        "name": "8(a) Small Disadvantaged Business",
        "description": "SBA 8(a) Business Development Program participants",
        "entity_structures": [
            {
                "uei": "EIG33333MMMM",
                "name": "Emerging Technologies Defense LLC",
                "entity_type": "Delaware Limited Liability Company with SBA Oversight",
                "structure_complexity": "8(a) program participant with annual compliance requirements",
                "foci_factors": [
                    "SBA 8(a) certification",
                    "Annual revenue caps",
                    "Graduation timeline",
                ],
                "kmp_count": 3,
                "clearance_levels": ["SECRET"],
                "special_agreements": ["8(a) program agreement", "SBA oversight"],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "AYE44444NNNN",
                "name": "Disadvantaged Business Development Corporation",
                "entity_type": "Closely Held Corporation with 8(a) Status",
                "structure_complexity": "Family-owned business in 8(a) development program",
                "foci_factors": ["8(a) year 3 of 9", "Family business structure"],
                "kmp_count": 4,
                "clearance_levels": ["CONFIDENTIAL", "SECRET"],
                "special_agreements": [
                    "8(a) business plan",
                    "Family succession planning",
                ],
                "ownership_tiers": 2,
                "foreign_ownership": 0.0,
            },
            {
                "uei": "EAT55555OOOO",
                "name": "Transitioning 8(a) Enterprises LLC",
                "entity_type": "Limited Liability Company Preparing for 8(a) Graduation",
                "structure_complexity": "Year 8 of 9 in 8(a) program, preparing for graduation",
                "foci_factors": [
                    "8(a) graduation preparation",
                    "Competitive transition planning",
                ],
                "kmp_count": 6,
                "clearance_levels": ["SECRET"],
                "special_agreements": [
                    "8(a) graduation plan",
                    "Competitive capability assessment",
                ],
                "ownership_tiers": 1,
                "foreign_ownership": 0.0,
            },
        ],
        "characteristics": ["8(a) certified", "Disadvantaged", "9-year program limit"],
    },
}


def generate_demo_companies():
    """Generate demo company data for all business types with complex entity structures"""
    demo_companies = []

    for category_key, category in BUSINESS_SIZE_CATEGORIES.items():
        for entity_structure in category["entity_structures"]:
            enhanced_company = {
                "uei": entity_structure["uei"],
                "entityName": entity_structure["name"],
                "businessSize": category["name"],
                "category": category_key,
                "entityType": entity_structure["entity_type"],
                "structureComplexity": entity_structure["structure_complexity"],
                "focifactors": entity_structure["foci_factors"],
                "kmpCount": entity_structure["kmp_count"],
                "clearanceLevels": entity_structure["clearance_levels"],
                "specialAgreements": entity_structure["special_agreements"],
                "ownershipTiers": entity_structure["ownership_tiers"],
                "foreignOwnership": entity_structure["foreign_ownership"],
                "characteristics": category["characteristics"],
                "registrationStatus": "Active",
                "cageCode": f"{hash(entity_structure['uei']) % 90000 + 10000:05d}",
                "stateOfIncorporation": (
                    entity_structure["entity_type"].split()[0]
                    if " " in entity_structure["entity_type"]
                    else "DE"
                ),
                "complianceComplexity": (
                    "HIGH"
                    if entity_structure["ownership_tiers"] > 2
                    else "MEDIUM" if entity_structure["kmp_count"] > 5 else "LOW"
                ),
            }
            demo_companies.append(enhanced_company)

    return demo_companies


def generate_foci_assessment_report(company_data):
    """Generate a FOCI assessment report for a given company"""
    foci_score = 0
    risk_factors = []

    # Calculate FOCI risk score
    if company_data["foreignOwnership"] > 15:
        foci_score += 3
        risk_factors.append(f"Foreign ownership: {company_data['foreignOwnership']}%")
    elif company_data["foreignOwnership"] > 5:
        foci_score += 2
        risk_factors.append(
            f"Moderate foreign ownership: {company_data['foreignOwnership']}%"
        )

    if company_data["ownershipTiers"] > 3:
        foci_score += 2
        risk_factors.append("Complex multi-tier ownership structure")

    if "international" in str(company_data["focifactors"]).lower():
        foci_score += 1
        risk_factors.append("International business operations")

    # Determine mitigation requirements
    if foci_score >= 5:
        mitigation = "Special Security Agreement (SSA) required"
    elif foci_score >= 3:
        mitigation = "Board Resolution or Proxy Agreement recommended"
    elif foci_score >= 1:
        mitigation = "Enhanced monitoring required"
    else:
        mitigation = "Standard facility clearance procedures"

    return {
        "uei": company_data["uei"],
        "companyName": company_data["entityName"],
        "fociScore": foci_score,
        "riskLevel": (
            "HIGH" if foci_score >= 5 else "MEDIUM" if foci_score >= 3 else "LOW"
        ),
        "riskFactors": risk_factors,
        "recommendedMitigation": mitigation,
        "specialAgreements": company_data["specialAgreements"],
        "assessmentDate": "2025-06-29",
    }


def generate_kmp_requirements(company_data):
    """Generate Key Management Personnel requirements based on entity structure"""
    base_requirements = []

    if "Corporation" in company_data["entityType"]:
        base_requirements.extend(["CEO/President", "CFO", "Board Directors"])
    elif "LLC" in company_data["entityType"]:
        if "Manager-Managed" in company_data["entityType"]:
            base_requirements.extend(["Managing Members", "Chief Operating Officer"])
        else:
            base_requirements.extend(["All Members with Management Rights"])
    elif "Partnership" in company_data["entityType"]:
        base_requirements.extend(["General Partners", "Managing Partners"])
    elif "Cooperative" in company_data["entityType"]:
        base_requirements.extend(["Board of Directors", "General Manager"])

    # Add security-specific roles
    security_roles = [
        "Facility Security Officer (FSO)",
        "Senior Management Official (SMO)",
    ]
    if "TOP_SECRET" in company_data["clearanceLevels"]:
        security_roles.append("IT Personnel Security Officer (ITPSO)")

    return {
        "uei": company_data["uei"],
        "baseRequirements": base_requirements,
        "securityRoles": security_roles,
        "estimatedKmpCount": company_data["kmpCount"],
        "clearanceLevels": company_data["clearanceLevels"],
        "entityType": company_data["entityType"],
    }


if __name__ == "__main__":
    print("🏢 TurboFCL Defense Contractor Entity Structure Demo")
    print("=" * 60)

    demo_companies = generate_demo_companies()

    print(f"\n📊 Generated {len(demo_companies)} representative defense contractors:")
    print("-" * 60)

    for comp in demo_companies:
        print(f"\n🏭 {comp['entityName']}")
        print(f"   UEI: {comp['uei']} | Size: {comp['businessSize']}")
        print(f"   Entity: {comp['entityType']}")
        print(
            f"   Complexity: {comp['complianceComplexity']} | KMP: {comp['kmpCount']} | Tiers: {comp['ownershipTiers']}"
        )
        if comp["foreignOwnership"] > 0:
            print(f"   🌍 Foreign Ownership: {comp['foreignOwnership']}%")
        if comp["specialAgreements"]:
            print(f"   📋 Agreements: {', '.join(comp['specialAgreements'])}")

    print(f"\n🔍 FOCI Assessment Examples:")
    print("-" * 40)

    # Show FOCI assessments for complex cases
    complex_cases = [
        comp for comp in demo_companies if comp["complianceComplexity"] == "HIGH"
    ]
    for comp in complex_cases[:3]:
        foci_report = generate_foci_assessment_report(comp)
        print(f"\n🏢 {foci_report['companyName']} (UEI: {foci_report['uei']})")
        print(
            f"   Risk Level: {foci_report['riskLevel']} (Score: {foci_report['fociScore']})"
        )
        print(f"   Mitigation: {foci_report['recommendedMitigation']}")
        if foci_report["riskFactors"]:
            print(f"   Risk Factors: {'; '.join(foci_report['riskFactors'])}")

    print(f"\n👥 KMP Requirements Examples:")
    print("-" * 40)

    # Show KMP requirements for different entity types
    entity_examples = {}
    for comp in demo_companies:
        entity_key = comp["entityType"].split()[0]
        if entity_key not in entity_examples:
            entity_examples[entity_key] = comp

    for entity_type, comp in list(entity_examples.items())[:4]:
        kmp_req = generate_kmp_requirements(comp)
        print(f"\n🏢 {comp['entityName']}")
        print(f"   Entity Type: {kmp_req['entityType']}")
        print(f"   Base KMP: {', '.join(kmp_req['baseRequirements'])}")
        print(f"   Security Roles: {', '.join(kmp_req['securityRoles'])}")
        print(f"   Clearance Levels: {', '.join(kmp_req['clearanceLevels'])}")

    print(f"\n🎯 Ready for TurboFCL Integration!")
    print("   • All 7 business size categories represented")
    print("   • Complex entity structures modeled")
    print("   • FOCI assessment logic implemented")
    print("   • KMP requirements calculated")
    print("   • DCSA/NISS compliance patterns included")
