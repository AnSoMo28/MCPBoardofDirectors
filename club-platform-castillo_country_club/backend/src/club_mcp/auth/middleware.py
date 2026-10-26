"""FastAPI auth dependencies: token extraction, permission checks."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from club_mcp.auth.jwt_service import TokenPayload, verify_token
from club_mcp.auth.rbac import Permission, check_permission

_security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> TokenPayload:
    """Extract and verify the Bearer token from the Authorization header."""
    try:
        return verify_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_permission(permission: Permission):
    """Dependency factory: rejects if current user lacks the given permission."""

    async def _check(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        if not check_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permiso insuficiente. Se requiere: {permission.value}. "
                    f"Rol actual: {current_user.role}"
                ),
            )
        return current_user

    return _check


def require_roles(*roles: str):
    """Dependency factory: rejects if current user's role is not in the set."""

    async def _check(
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Rol no autorizado. Se requiere: {', '.join(roles)}. "
                    f"Rol actual: {current_user.role}"
                ),
            )
        return current_user

    return _check
