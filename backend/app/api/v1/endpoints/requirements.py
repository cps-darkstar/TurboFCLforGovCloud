"""Requirements Endpoint

Provides required documents and KMP roles for a given entity type.  Used by the
front-end wizard/checklist so that requirements are fetched dynamically instead
of hard-coding them in JS.
"""

from fastapi import APIRouter, HTTPException

from app.constants.business_rules import ENTITY_REQUIREMENTS

router = APIRouter()


@router.get("/{entity_type}", tags=["Requirements"])
async def get_entity_requirements(entity_type: str):
    """Return document & KMP requirements for *entity_type*.

    Parameters
    ----------
    entity_type : str
        The business structure key (e.g. "llc", "corporation").  Matching is
        case-insensitive.
    """
    key = entity_type.lower()
    if key not in ENTITY_REQUIREMENTS:
        raise HTTPException(status_code=404, detail="Unsupported entity type")

    return {"entity_type": key, **ENTITY_REQUIREMENTS[key]} 