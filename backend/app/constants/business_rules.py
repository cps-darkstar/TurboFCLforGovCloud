"""Business-rule constants for the backend.

NOTE:  This is *not* a 1-to-1 port of the rich front-end rules defined in
`frontend/src/constants/businessRules.ts`.  It only contains the fields that
are currently referenced by backend code (e.g. `ENTITY_REQUIREMENTS`).  If the
backend evolves to need the full rule-set you can safely expand this module or
import from a shared source via an internal package.
"""

from typing import Dict, List

EntityType = str  # Simple alias until we formalise shared enums between FE and BE

# A trimmed-down mapping – include the keys used in tests/demo. Feel free to
# extend.
ENTITY_REQUIREMENTS: Dict[EntityType, Dict[str, List[str]]] = {
    "llc": {
        "documents": [
            "Business License",
            "Certificate of Formation or Articles of Organization",
            "Operating Agreement",
            "Signed undated DD Form 441",
            "Signed SF 328",
        ],
        "kmps": [
            "SMO",
            "FSO",
            "ITPSO",
            "LLC Members",
        ],
    },
    "corporation": {
        "documents": [
            "Articles of Incorporation",
            "By-Laws",
            "Stock Ledger",
            "Signed undated DD Form 441",
            "Signed SF 328",
        ],
        "kmps": [
            "SMO",
            "FSO",
            "ITPSO",
            "Chairman of the Board",
        ],
    },
}
