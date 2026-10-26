"""Auth routes: login, refresh, me."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from club_mcp.auth.jwt_service import TokenPayload, create_token_pair, verify_token
from club_mcp.auth.middleware import get_current_user
from club_mcp.auth.models import UserLogin
from club_mcp.auth.password_service import verify_password
from club_mcp.auth.seed_users import seed_demo_users

router = APIRouter()

# In-memory user store (demo)
_users = {u.email: u for u in seed_demo_users()}


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/login")
async def login(body: UserLogin) -> dict:
    """Authenticate user and return JWT token pair."""
    user = _users.get(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    tokens = create_token_pair(
        user_id=user.id,
        role=user.role.value,
        name=user.name,
        family_id=user.family_id,
    )

    return {
        "status": "success",
        "message": f"Bienvenido, {user.name} 🏰",
        "tokens": tokens.model_dump(mode="json"),
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "family_id": user.family_id,
        },
    }


@router.post("/refresh")
async def refresh_token(body: RefreshRequest) -> dict:
    """Exchange a refresh token for a new token pair."""
    try:
        payload = verify_token(body.refresh_token, expected_type="refresh")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        )

    tokens = create_token_pair(
        user_id=payload.sub,
        role=payload.role,
        name=payload.name,
        family_id=payload.family_id,
    )

    return {
        "status": "success",
        "tokens": tokens.model_dump(mode="json"),
    }


@router.get("/me")
async def get_me(
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Return current authenticated user info."""
    return {
        "status": "success",
        "user": {
            "sub": current_user.sub,
            "role": current_user.role,
            "name": current_user.name,
            "family_id": current_user.family_id,
        },
    }
