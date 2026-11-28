"""Tablas del dominio Guest Management — Ola 2.1-sexta (vertical guest).

Espejo 1:1 de club_mcp.models.guest_management (Pydantic). Las 3
entidades del repo in-memory (verificar contra guest_management_repo.py):

    _guests:            dict[str, dict]  → tabla guests
    _private_events:    dict[str, dict]  → tabla private_events
    _trial_memberships: dict[str, dict]  → tabla trial_memberships
    _monthly_snapshots: dict[str, dict]  → tabla guest_monthly_snapshots

Las listas flexibles (privileges de guest/trial) a JSONB por fila:
anexos del agregado, no entidades con identity propia — mismo criterio
que families.activities (§3.8-bis) y engagement.favorite_activities
(§3.8-tris).

`visit_count`: el in-memory lo guardaba como anexo privado `_visit_count`
del dict (solo lo producía el seed demo; el Guest de Pydantic lo descarta
en el contrato). La tabla lo persiste como columna REAL — la métrica de
recurrencia (funnel/health/proposals) deja de ser un artefacto del seed
y sobrevive al restart. Default 1 = el mismo comportamiento observable
del in-memory para guests creados por create_guest (sin anexo →
g.get("_visit_count", 1)).

guest_monthly_snapshots: las tendencias temporales del in-memory eran
UNA constante de seed demo (_seed_monthly_snapshots, 6 meses) que solo
existía con seed_demo_data=True — el runtime nunca la activa (bootstrap
instancia GuestManagementRepository() sin seed). La tabla existe para
que el deploy real pueda cargarla (dataset demo UNA fuente, criterio
0011) y que get_analytics_enhanced/forecast lean de la base y no de una
constante en memoria.

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo; el repo ORM
reproduce la MISMA forma. Sin excepciones custom (el in-memory devuelve
None / listas vacías; el ORM idéntico).
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el modelo in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class GuestORM(Base):
    __tablename__ = "guests"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    host_member_id: Mapped[str] = mapped_column(String(64), nullable=False)
    guest_name: Mapped[str] = mapped_column(String(200), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    guest_phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    visit_date: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    privileges: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    visit_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class PrivateEventORM(Base):
    __tablename__ = "private_events"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_name: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(24), nullable=False)
    venue: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    end_time: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    budget: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False, default=0.0)
    estimated_cost: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False, default=0.0
    )
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    coordinator_member_id: Mapped[str] = mapped_column(
        String(64), nullable=False, default=""
    )
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    special_requirements: Mapped[str] = mapped_column(Text, nullable=False, default="")
    catering_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    decoration_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    entertainment_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class TrialMembershipORM(Base):
    __tablename__ = "trial_memberships"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    guest_name: Mapped[str] = mapped_column(String(200), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    guest_phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    referred_by_family_id: Mapped[str] = mapped_column(String(64), nullable=False)
    trial_type: Mapped[str] = mapped_column(String(24), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    privileges: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class GuestMonthlySnapshotORM(Base):
    __tablename__ = "guest_monthly_snapshots"

    month: Mapped[str] = mapped_column(String(7), primary_key=True)
    new_guests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    check_ins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trials: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conversions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    events: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
