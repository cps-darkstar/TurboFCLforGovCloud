"""
SAM.gov Integration Service
Handles data retrieval from SAM.gov API
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class SAMService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.SAM_GOV_API_URL
        self.api_key = self.settings.SAM_GOV_API_KEY
        self.cache = {}  # Simple in-memory cache
        self.cache_ttl = timedelta(hours=24)

    async def fetch_sam_data(self, uei: str) -> Optional[Dict[str, Any]]:
        """
        Fetch company data from SAM.gov by UEI
        Returns cached data if available and fresh
        """
        # Check cache first
        cache_key = f"sam_data_{uei}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if datetime.now() - cached_time < self.cache_ttl:
                logger.info(f"Returning cached SAM data for UEI: {uei}")
                return cached_data

        try:
            # Make API request to SAM.gov
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = (
                    {"X-API-Key": self.api_key, "Accept": "application/json"}
                    if self.api_key
                    else {"Accept": "application/json"}
                )

                url = f"{self.base_url}/entities"
                params = {
                    "ueiSAM": uei,
                    "includeSections": "entityRegistration,coreData",
                }

                response = await client.get(url, headers=headers, params=params)

                if response.status_code == 200:
                    data = response.json()

                    # Extract relevant information
                    if "entityData" in data and len(data["entityData"]) > 0:
                        entity = data["entityData"][0]

                        sam_data = {
                            "legal_business_name": entity.get(
                                "entityRegistration", {}
                            ).get("legalBusinessName", ""),
                            "uei": entity.get("entityRegistration", {}).get(
                                "ueiSAM", uei
                            ),
                            "cage_code": entity.get("entityRegistration", {}).get(
                                "cageCode"
                            ),
                            "entity_structure": entity.get(
                                "entityRegistration", {}
                            ).get("entityStructureDesc", ""),
                            "state_of_incorporation": entity.get(
                                "entityRegistration", {}
                            ).get("stateOfIncorporation"),
                            "registration_status": entity.get(
                                "entityRegistration", {}
                            ).get("registrationStatus", ""),
                            "last_updated": entity.get("entityRegistration", {}).get(
                                "lastUpdateDate", datetime.now().isoformat()
                            ),
                        }

                        # Cache the result
                        self.cache[cache_key] = (sam_data, datetime.now())

                        logger.info(f"Successfully fetched SAM data for UEI: {uei}")
                        return sam_data
                    else:
                        logger.warning(f"No entity data found for UEI: {uei}")
                        return None

                elif response.status_code == 404:
                    logger.warning(f"UEI not found in SAM.gov: {uei}")
                    return None
                else:
                    logger.error(
                        f"SAM.gov API error: {response.status_code} - {response.text}"
                    )
                    return None

        except httpx.TimeoutException:
            logger.error(f"Timeout fetching SAM data for UEI: {uei}")
            return None
        except Exception as e:
            logger.error(f"Error fetching SAM data for UEI {uei}: {str(e)}")
            return None

    async def validate_uei_format(self, uei: str) -> bool:
        """Validate UEI format before making API call"""
        import re

        pattern = r"^[A-Z0-9]{12}$"
        return bool(re.match(pattern, uei.upper()))

    async def get_entity_structure_mapping(
        self, sam_entity_structure: str
    ) -> Optional[str]:
        """Map SAM.gov entity structure to our internal entity types"""
        mapping = {
            "LIMITED LIABILITY COMPANY": "llc",
            "CORPORATION": "corporation",
            "PUBLICLY HELD CORPORATION": "public-corporation",
            "GENERAL PARTNERSHIP": "general-partnership",
            "LIMITED PARTNERSHIP": "limited-partnership",
            "SOLE PROPRIETORSHIP": "sole-proprietorship",
        }

        return mapping.get(sam_entity_structure.upper())

    async def check_registration_status(
        self, sam_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if SAM registration is active and current"""
        status_info = {
            "is_active": False,
            "expires_soon": False,
            "days_until_expiry": None,
            "warnings": [],
        }

        registration_status = sam_data.get("registration_status", "").upper()
        status_info["is_active"] = registration_status == "ACTIVE"

        if not status_info["is_active"]:
            status_info["warnings"].append(
                "SAM.gov registration is not active. Please update your registration."
            )

        # Check expiration date
        try:
            last_updated = datetime.fromisoformat(
                sam_data.get("last_updated", "").replace("Z", "+00:00")
            )
            expiry_date = last_updated + timedelta(days=365)
            days_until_expiry = (expiry_date - datetime.now()).days

            status_info["days_until_expiry"] = days_until_expiry

            if days_until_expiry < 30:
                status_info["expires_soon"] = True
                status_info["warnings"].append(
                    f"SAM.gov registration expires in {days_until_expiry} days. Consider renewing soon."
                )
        except:
            pass  # Ignore date parsing errors

        return status_info

    def clear_cache(self):
        """Clear the SAM data cache"""
        self.cache.clear()
        logger.info("SAM data cache cleared")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring"""
        return {"cache_size": len(self.cache), "cache_keys": list(self.cache.keys())}
