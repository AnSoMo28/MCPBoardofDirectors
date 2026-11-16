"""Auth routes: login, refresh, me.

Ola 2.1 — el dict _users in-memory se vuelve tabla `users`
(PostgreSQL). login resuelve el usuario por UserRepository cuando
hay DATABASE_URL viva; sin DB (dev loop / 846 tests TestClient sin
postgres) cae al seed in-memory de siempre — MISMA respuesta, cero
tests rotos. La tabla se crea con alembic (versions/0001_users.py)
y el script scripts/seed_users.py siembra idempotente los 4 demo
users (PATH 2.1: "usuarios seed → tabla + script seed").
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from club_mcp.auth.jwt_service import TokenPayload, create_token_pair, verify_token
from club_mcp.auth.middleware import get_current_user
from club_mcp.auth.models import User, UserLogin
from club_mcp.auth.password_service import verify_password
from club_mcp.auth.seed_users import seed_demo_users

router = APIRouter()

# Fallback dev: seed in-memory (mismo dict que antes — solo sin DB).
_users = {u.email: u for u in seed_demo_users()}


class RefreshRequest(BaseModel):
    refresh_token: str


async def _find_user(email: str) -> User | None:
    """User por email: persistencia si hay DB viva; fallback seed."""
    from club_mcp.config.settings import get_settings
    from club_mcp.db.orm.engine import get_engine
    from club_mcp.db.orm.repositories.user_repo import UserRepository

    url = get_settings().database_url
    if url and "postgresql" in url:
        try:
            user = await UserRepository(get_engine()).get_by_email(email)
            if user is not None:
                return user
        except Exception:
            pass  # DB caída → dev loop: seed in-memory de siempre
    return _users.get(email)


@router.post("/login")
async def login(body: UserLogin) -> dict[str, object]:
    """Authenticate user and return JWT token pair."""
    user = await _find_user(body.email)
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
async def refresh_token(body: RefreshRequest) -> dict[str, object]:
    """Exchange a refresh token for a new token pair."""
    try:
        payload = verify_token(body.refresh_token, expected_type="refresh")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o expirado",
        ) from exc

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
) -> dict[str, object]:
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
