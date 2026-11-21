"""Tablas del dominio Sports & Recreation — Ola 2.1-decimocuarta.

Espejo 1:1 del estado interno del repo in-memory
(club_mcp.db.repositories.sports_recreation_repo):

    _reservations:      dict[str, dict] → sports_reservations
    _tournaments:       dict[str, dict] → sports_tournaments
    _fitness_classes:   dict[str, dict] → sports_fitness_classes
    _coaching_sessions: dict[str, dict] → sports_coaching_sessions
    _equipment:         dict[str, dict] → sports_equipment
    _leagues:           dict[str, dict] → sports_leagues
    _recommendations:   dict[str, dict] → sports_recommendations

Los enums del dominio (SportType · ReservationStatus ·
TournamentStatus · TournamentFormat · ClassType · SkillLevel ·
EquipmentCondition · LeagueStatus · LeagueFormat) NO son constraint
CHECK: el repo guarda .value en String(32) y reconstruye el Pydantic
enum al leer — el contrato del agente pasa enums; un CHECK duplicaría
la validación que Pydantic ya hace en el borde (mismo estilo que las
13 verticales previas §3.8..§3.8-DECIMATERCERA).

Las listas/dicts del agregado (equipment_needed de clases ·
focus_areas de coaching · prizes de torneos · teams y standings de
ligas) van a JSONB por fila: anexos de la entidad, no entidades con
identity propia — mismo criterio que families (§3.8-bis) hasta
age_group (§3.8-DECIMATERCERA).

created_at: el in-memory NUNCA lo persiste — el default_factory del
modelo (datetime.utcnow) lo genera en la REHIDRATACIÓN del
Pydantic. La columna lo persiste ISO Text y el repo lo parsea al
leer: roundtrip pérdida cero, y el ORM conserva el created_at REAL
(una ventaja del vertical sobre el in-memory, que lo pierde en cada
read).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA).

Sin seed: el in-memory no tiene seed demo (nace vacío) — las tablas
nacen VACÍAS igual (contrato vacío idéntico).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis … age_group §3.8-DECIMATERCERA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class SportsReservationORM(Base):
    """Reserva de cancha — espejo de CourtReservation."""

    __tablename__ = "sports_reservations"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    member_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    court_name: Mapped[str] = mapped_column(String(240), nullable=False)
    date: Mapped[str] = mapped_column(String(16), nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False, default="0:00")
    end_time: Mapped[str] = mapped_column(String(8), nullable=False, default="0:00")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="confirmed")
    purpose: Mapped[str] = mapped_column(String(32), nullable=False, default="regular")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsTournamentORM(Base):
    """Torneo deportivo — espejo de Tournament."""

    __tablename__ = "sports_tournaments"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    format: Mapped[str] = mapped_column(String(32), nullable=False)
    start_date: Mapped[str] = mapped_column(String(16), nullable=False)
    end_date: Mapped[str] = mapped_column(String(16), nullable=False)
    registration_deadline: Mapped[str] = mapped_column(String(16), nullable=False)
    max_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_participants: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    venue: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    organizer_member_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    entry_fee: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    prizes: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    rules: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsFitnessClassORM(Base):
    """Clase de fitness — espejo de FitnessClass."""

    __tablename__ = "sports_fitness_classes"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    class_type: Mapped[str] = mapped_column(String(32), nullable=False)
    instructor: Mapped[str] = mapped_column(String(240), nullable=False)
    schedule_day: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    schedule_time: Mapped[str] = mapped_column(String(8), nullable=False, default="00:00")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    location: Mapped[str] = mapped_column(String(240), nullable=False)
    skill_level: Mapped[str] = mapped_column(String(32), nullable=False, default="all_levels")
    current_enrolled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    equipment_needed: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    is_active: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsCoachingSessionORM(Base):
    """Sesión de coaching — espejo de CoachingSession."""

    __tablename__ = "sports_coaching_sessions"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    coach_name: Mapped[str] = mapped_column(String(240), nullable=False)
    member_id: Mapped[str] = mapped_column(String(64), nullable=False)
    member_name: Mapped[str] = mapped_column(String(240), nullable=False)
    date: Mapped[str] = mapped_column(String(16), nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False, default="0:00")
    end_time: Mapped[str] = mapped_column(String(8), nullable=False, default="0:00")
    location: Mapped[str] = mapped_column(String(240), nullable=False)
    skill_level: Mapped[str] = mapped_column(String(32), nullable=False, default="beginner")
    focus_areas: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="scheduled")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsEquipmentORM(Base):
    """Equipo deportivo — espejo de Equipment."""

    __tablename__ = "sports_equipment"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    location: Mapped[str] = mapped_column(String(240), nullable=False)
    total_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    available_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    condition: Mapped[str] = mapped_column(String(32), nullable=False, default="good")
    brand: Mapped[str | None] = mapped_column(String(120), nullable=True, default=None)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    last_maintenance: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsLeagueORM(Base):
    """Liga deportiva — espejo de SportLeague."""

    __tablename__ = "sports_leagues"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    season: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    start_date: Mapped[str] = mapped_column(String(16), nullable=False)
    end_date: Mapped[str] = mapped_column(String(16), nullable=False)
    coordinator_member_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    max_teams: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="round_robin")
    teams: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    current_round: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    standings: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)


class SportsRecommendationORM(Base):
    """Recomendación deportiva para un socio — espejo de SportsRecommendation."""

    __tablename__ = "sports_recommendations"

    id: Mapped[str] = mapped_column(String(24), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(64), nullable=False)
    sport: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.8)
    suggested_class: Mapped[str | None] = mapped_column(String(240), nullable=True, default=None)
    suggested_coach: Mapped[str | None] = mapped_column(String(240), nullable=True, default=None)
    created_at: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
