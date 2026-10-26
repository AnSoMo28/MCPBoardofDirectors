"""Chat route: conversational AI via Claude."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from club_mcp.auth.jwt_service import TokenPayload
from club_mcp.auth.middleware import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[dict[str, str]] = []


@router.post("/")
async def chat(
    body: ChatRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Send a message to the AI assistant."""
    claude_service = request.app.state.claude_service
    if not claude_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio de IA no disponible",
        )

    result = await claude_service.chat(
        user_message=body.message,
        user_role=current_user.role,
        user_name=current_user.name,
        history=body.conversation_history,
    )

    return {
        "status": "success",
        "response": result,
    }
