"""Tablas `families` + `members` — Ola 2.1-bis (vertical family, PATH 2.1).

Espejo 1:1 de club_mcp.models.family / member (Pydantic). Las listas
auxiliares del repo in-memory (_activities · _social_connections)
vienen a JSONB por familia: son anexos append-only del agregado, no
entidades con identity propia (verificar contra el repos original:

    _families: dict[UUID, dict]        → tabla families
    _members: dict[UUID, dict]         → tabla members (FK families.id)
    _email_index: dict[str, UUID]      → uq_families_email (índice real)
    _activities: dict[UUID, list[dict]]→ families.activities JSONB
    _social_connections                → families.social_connections JSONB
    _preferences: dict[UUID, dict]     → families.preferences JSONB

users_orm.family_id (Ola 2.1) declaraba FK LÓGICO "la tabla families
no existe todavía; se materializa en su propia ola" — esta ES esa
ola: el FK físico llega con la migración 0002.

El repo (family_repo.py) devuelve objetos Pydantic (FamilyResponse,
MemberResponse): SQLAlchemy no se filtra hacia arriba — los 16 tools
del agente family y sus 50 tests no cambian (regla §3.2-1 de la
guía: radio de explosión mínimo).
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (column default — misma fuente que el modelo)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class FamilyORM(Base):
    __tablename__ = "families"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    tier: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    join_date: Mapped[date] = mapped_column(Date, nullable=False)
    engagement_score: Mapped[int] = mapped_column(
        Integer, nullable=False, default=50
    )
    referral_family_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # anexos del agregado (Ola 2.1-bis): JSONB — postgres real, JSON dev
    activities: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    social_connections: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class MemberORM(Base):
    __tablename__ = "members"
    __table_args__ = (
        UniqueConstraint("family_id", "id", name="uq_members_family_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    family_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("families.id", name="fk_members_family"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    dietary_restrictions: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


def uuid_str(u: UUID) -> str:
    """UUID → String(36) (la PK del in-memory era uuid4(); mismas llaves)."""
    return str(u)
