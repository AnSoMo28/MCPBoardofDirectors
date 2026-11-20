"""Tablas del dominio Cultural & Social — Ola 2.1-nona (vertical cultural_social).

Espejo 1:1 de club_mcp.models.cultural_social (Pydantic). Las 4 entidades
del repo in-memory (verificar contra cultural_social_repo.py):

    _events:       dict[str, CulturalEvent]     → cultural_events
    _acts:         dict[str, EntertainmentAct]  → entertainment_acts
    _programs:     dict[str, CulturalProgram]  → cultural_programs
    _exhibitions:  dict[str, ArtExhibition]    → art_exhibitions

Los enums del dominio (EventType · EventStatus · EntertainmentType ·
PerformanceStatus · CulturalCategory · VenueType · FormalityLevel ·
ProgramStatus · ExhibitionStatus) NO son constraint CHECK: el repo guarda
.value en String(32) y reconstruye el Pydantic enum al leer — el contrato
del agente pasa enums; un CHECK duplicaría la validación que Pydantic ya
hace en el borde (mismo estilo que las 8 verticales previas §3.8..§3.8-
OCTAVA).

Las listas (entertainment_ids · requirements · event_ids) van a JSONB por
fila: anexos del agregado, no entidades con identity propia — mismo
criterio que families.activities (§3.8-bis), engagement.favorite_activities
(§3.8-tris), guests.privileges (§3.8-SEXTA), satisfaction.questions
(§3.8-SEPTIMA) y communication.channels (§3.8-OCTAVA).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo (_gen_id
staticmethod); el repo ORM reproduce la MISMA forma. Sin excepciones
custom (el in-memory devuelve None / listas vacías / dict; el ORM
idéntico).

date / start_time / end_time / start_date / end_date / created_at: el
in-memory persiste ISO strings (created_at=datetime.now(...).isoformat()
en create; dates como "YYYY-MM-DD" strings del Create schema); columnas
Text nullable que guardan el MISMO string — el roundtrip es pérdida
cero (el contrato del agente compara strings, no datetimes; los
analytics comparan strings con <= / >= como get_upcoming).
"""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis, satisfaction §3.8-SEPTIMA y
# communication §3.8-OCTAVA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class CulturalEventORM(Base):
    """Evento cultural — espejo de CulturalEvent (Pydantic)."""

    __tablename__ = "cultural_events"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")
    formality: Mapped[str] = mapped_column(String(32), nullable=False, default="semi_formal")
    venue: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    venue_type: Mapped[str] = mapped_column(String(32), nullable=False, default="ballroom")
    date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    start_time: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    end_time: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    organizer_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    guest_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    menu_theme: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    dress_code: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    entertainment_ids: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class EntertainmentActORM(Base):
    """Acto de entretenimiento — espejo de EntertainmentAct (Pydantic)."""

    __tablename__ = "entertainment_acts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    artist_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    entertainment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    genre: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    contact_person: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    contact_phone: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    requirements: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    event_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class CulturalProgramORM(Base):
    """Programa cultural — espejo de CulturalProgram (Pydantic)."""

    __tablename__ = "cultural_programs"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    season: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    start_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    end_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    coordinator_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_participants: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    event_ids: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ArtExhibitionORM(Base):
    """Exposición de arte — espejo de ArtExhibition (Pydantic)."""

    __tablename__ = "art_exhibitions"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    artist_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="visual_arts")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    venue: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    venue_type: Mapped[str] = mapped_column(String(32), nullable=False, default="lounge")
    start_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    end_date: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="scheduled")
    num_pieces: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    curator_member_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    opening_reception: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
