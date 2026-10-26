"""Re-exports auth dependencies for convenient imports from api package."""

from club_mcp.auth.jwt_service import TokenPayload
from club_mcp.auth.middleware import get_current_user, require_permission, require_roles
from club_mcp.auth.rbac import Permission

__all__ = [
    "get_current_user",
    "require_permission",
    "require_roles",
    "TokenPayload",
    "Permission",
]
