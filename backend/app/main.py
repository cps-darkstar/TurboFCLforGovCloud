"""TurboFCL FastAPI application entry-point.

This minimalist module intentionally exposes only a *very* small surface-area:
1. Creation of the global `FastAPI` application instance.
2. A root (/) endpoint that returns a running message.
3. A `/health` endpoint suitable for container health-checks.
4. A `__main__` execution guard that starts an ad-hoc development server
   (useful for local testing).

All additional APIs should be wired in via sub-packages (e.g. `backend/app/api`).
"""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="TurboFCL API")


@app.get("/", tags=["Utility"])
def read_root() -> dict[str, str]:
    """Liveness probe confirming the API server is reachable."""
    return {"message": "TurboFCL API is running"}


@app.get("/health", tags=["Utility"])
def health_check() -> dict[str, str]:
    """Simple health-check for orchestration platforms (ECS, Kubernetes, etc.)."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
