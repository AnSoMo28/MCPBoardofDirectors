"""Health check route."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict:
    """Return service health status."""
    return {
        "status": "healthy",
        "service": "Castillo Country Club API",
        "version": "0.1.0",
        "agents_count": request.app.state.agents_count,
        "tools_count": request.app.state.tools_count,
    }
