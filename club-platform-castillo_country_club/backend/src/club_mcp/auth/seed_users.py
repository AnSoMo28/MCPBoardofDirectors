"""Demo seed users for Castillo Country Club."""

from __future__ import annotations

from club_mcp.auth.models import User, UserRole
from club_mcp.auth.password_service import hash_password


def seed_demo_users() -> list[User]:
    """Create 4 demo users: 1 socio, 1 staff, 1 admin, 1 junta."""
    return [
        User(
            id="socio_001",
            name="Carlos Rodriguez",
            email="carlos@castillo.cr",
            hashed_password=hash_password("admin123"),
            role=UserRole.SOCIO,
            family_id="fam_001",
        ),
        User(
            id="staff_001",
            name="Maria Fernandez",
            email="maria@castillo.cr",
            hashed_password=hash_password("staff123"),
            role=UserRole.STAFF,
        ),
        User(
            id="admin_001",
            name="Gerente General",
            email="gerente@castillo.cr",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
        ),
        User(
            id="junta_001",
            name="Director Junta",
            email="director@castillo.cr",
            hashed_password=hash_password("junta123"),
            role=UserRole.JUNTA,
        ),
    ]
