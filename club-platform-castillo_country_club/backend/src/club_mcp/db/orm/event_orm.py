"""Tablas del dominio Event — Ola 2.2 (vertical event, PATH 2.2).

Espejo 1:1 de club_mcp.models.event (Pydantic). Las 4 entidades del
agregado (verificar contra el repo in-memory):

    _events:       dict[str, dict]  → tabla events
    _rsvps:        dict[str, dict]  → tabla event_rsvps (FK events.id)
    _vendors:      dict[str, dict]  → tabla event_vendors (FK events.id)
    _program_items: dict[str, dict] → tabla event_program_items (FK events.id)

Las listas del agregado (facility_ids · age_groups · tags ·
member_ids) a JSONB por fila: anexos del agregado, no entidades con
identity propia — mismo criterio que families.activities (§3.8-bis).

delete_event del in-memory BORRA en cascada los rsvps/vendors/
program_items del evento (rebuild de dicts); acá es FK ON DELETE
CASCADE — el constraint físico reemplaza el rebuild manual.

IDs: el in-memory genera f"{prefix}_{uuid4().hex[:8]}" (evt_/
rsvp_/vnd_/prog_); el repo ORM reproduce la MISMA forma para que el
contrato no cambie ni un byte. Los enums van como String(24) SIN
CHECK — la validación vive en Pydantic del borde (mismo estilo que
tier/status en families §3.8-bis).

current_attendance / waitlist_count del in-memory eran COLUMNAS
DERIVADAS (recalculadas por _refresh_attendance en cada mutación de
RSVP): en la tabla siguen siendo columnas (cache del agregado) que
el repo refresca con COUNT real de event_rsvps tras cada add/
update/remove — el read nunca miente y el contrato de salida
(EventResponse.current_attendance) no cambia.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el modelo in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class EventORM(Base):
    """Tabla events — espejo 1:1 de EventCreate/EventResponse."""

    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    category: Mapped[str] = mapped_column(String(24), nullable=False)
    event_type: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    date_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    date_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    facility_ids: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    age_groups: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_attendance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    waitlist_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pricing_model: Mapped[str] = mapped_column(String(24), nullable=False)
    price_per_person: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_members_only: Mapped[bool] = mapped_column(nullable=False, default=True)
    allow_guests: Mapped[bool] = mapped_column(nullable=False, default=False)
    max_guests_per_family: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    recurrence: Mapped[str] = mapped_column(String(24), nullable=False, default="none")
    requires_rsvp: Mapped[bool] = mapped_column(nullable=False, default=True)
    dress_code: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    created_by: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class EventRSVPORM(Base):
    """Tabla event_rsvps — espejo 1:1 de RSVPRecord."""

    __tablename__ = "event_rsvps"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    family_id: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    family_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    member_ids: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    guests_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dietary_restrictions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    total_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class EventVendorORM(Base):
    """Tabla event_vendors — espejo 1:1 de VendorRecord."""

    __tablename__ = "event_vendors"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    service_type: Mapped[str] = mapped_column(String(60), nullable=False, default="")
    contact_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    contact_phone: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    quoted_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    final_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    contract_status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class EventProgramItemORM(Base):
    """Tabla event_program_items — espejo 1:1 de ProgramItem."""

    __tablename__ = "event_program_items"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    time_start: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    time_end: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    responsible: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
