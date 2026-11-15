"""JWT token creation and verification (HS256 dev → RS256 prod)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from pydantic import BaseModel, ConfigDict

# ── Configuration ──
# Q-SEC-01 (Ola 1.1): una sola fuente de verdad — el secreto ya estaba
# declarado en config/settings.py desde G9 y NADIE lo consumía: este
# módulo firmaba con SU propio literal (distinto al de settings). Ahora
# ambos se resuelven desde get_settings(); los nombres de módulo se
# conservan solo como alias para los tests legacy de la suite de 827
# (test_jwt_service importa _SECRET_KEY/_ALGORITHM).
from club_mcp.config.settings import get_settings


_SETTINGS = get_settings()
_SECRET_KEY = _SETTINGS.jwt_secret_key
_ALGORITHM = _SETTINGS.jwt_algorithm
_ACCESS_TTL = timedelta(minutes=15)
_REFRESH_TTL = timedelta(days=7)


class TokenPayload(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sub: str
    role: str
    name: str
    family_id: str | None = None
    exp: int = 0


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = int(_ACCESS_TTL.total_seconds())


def create_token_pair(
    user_id: str,
    role: str,
    name: str,
    family_id: str | None = None,
) -> TokenPair:
    """Create an access + refresh token pair for a user."""
    now = datetime.now(tz=UTC)
    iat = int(now.timestamp())

    access_payload = {
        "sub": user_id,
        "role": role,
        "name": name,
        "family_id": family_id,
        "type": "access",
        "exp": int((now + _ACCESS_TTL).timestamp()),
        "iat": iat,
    }
    refresh_payload = {
        "sub": user_id,
        "role": role,
        "name": name,
        "family_id": family_id,
        "type": "refresh",
        "exp": int((now + _REFRESH_TTL).timestamp()),
        "iat": iat,
    }

    return TokenPair(
        access_token=jwt.encode(access_payload, _SECRET_KEY, algorithm=_ALGORITHM),
        refresh_token=jwt.encode(refresh_payload, _SECRET_KEY, algorithm=_ALGORITHM),
    )


def verify_token(token: str, expected_type: str = "access") -> TokenPayload:
    """Verify and decode a JWT token. Raises jwt exceptions on failure."""
    payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])

    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(
            f"Expected token type '{expected_type}', got '{payload.get('type')}'"
        )

    return TokenPayload(
        sub=payload["sub"],
        role=payload["role"],
        name=payload["name"],
        family_id=payload.get("family_id"),
        exp=payload["exp"],
    )
