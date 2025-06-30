"""GovCloud Best-Practices Endpoint

Runs lightweight, on-demand checks to see whether the current TurboFCL
installation adheres to a curated list of AWS GovCloud security &
operational best practices.  Implementation is intentionally *static /
stubbed* for now – it returns the checklist with `status: pending` so the
front-end can already surface the categories and individual items while we
wire real evaluators in follow-up work.
"""

from datetime import datetime
from typing import List

from fastapi import APIRouter

router = APIRouter()

# ————————————————————————————————————————————
# Curated GovCloud best-practice items we eventually want to validate in depth.
# Each entry contains: id, title, description, and current evaluation status.
# Status vocabulary: pass | fail | warning | pending
# ————————————————————————————————————————————
BEST_PRACTICES: List[dict] = [
    {
        "id": "kms-key-rotation",
        "category": "Security",
        "title": "Enable automatic KMS key rotation",
        "description": "All customer-managed KMS keys should have an annual rotation schedule.",
        "status": "pending",
    },
    {
        "id": "alb-access-logs",
        "category": "Observability",
        "title": "ALB access logging to encrypted S3 bucket",
        "description": "Application Load Balancer logs must be delivered to an SSE-KMS bucket in the logging account.",
        "status": "pending",
    },
    {
        "id": "guardduty-enabled",
        "category": "Security",
        "title": "GuardDuty detector enabled",
        "description": "Amazon GuardDuty should be enabled in all GovCloud regions.",
        "status": "pending",
    },
    {
        "id": "cis-level-1",
        "category": "Compliance",
        "title": "CIS AWS Foundations Benchmark Level 1",
        "description": "Baseline resources should pass CIS Level 1 checks (CloudTrail, S3 encryption, etc.).",
        "status": "pending",
    },
]


@router.get("/best-practices", tags=["GovCloud"])
async def get_govcloud_best_practices():
    """Return the GovCloud best-practice checklist with current evaluation."""

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total": len(BEST_PRACTICES),
        "items": BEST_PRACTICES,
    } 