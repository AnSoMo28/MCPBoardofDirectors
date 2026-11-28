"""Tabla `users` — primer vertical persistente (Ola 2.1, PATH 2.1).

Espejo 1:1 de club_mcp.auth.models.User (Pydantic), tabla real:

    id            String(32) PK     — SEMILLA: User.id (uuid4().hex[:8])
    name          String(120)
    email         String(255) UNIQUE — login key (dict _users lo era)
    hashed_password String(255)      — bcrypt (password_service)
    role          String(16)         — UserRole.value: socio/staff/admin/junta
    family_id     String(32) NULL    — FK lógico a families (no físico:
                                      la tabla families no existe todavía;
                                      se materializa en su propia ola)
    is_active     Boolean
    created_at    DateTime(tz=True) — UTC del modelo

El repo (user_repo.py) devuelve objetos auth.models.User: los agentes
y rutas NO ven SQLAlchemy — la migración es invisible para los 846
tests existentes (regla: radio de explosión mínimo, guía §3.2-1).
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (column default — misma fuente que el modelo)."""
    return datetime.now(tz=UTC)


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    family_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
