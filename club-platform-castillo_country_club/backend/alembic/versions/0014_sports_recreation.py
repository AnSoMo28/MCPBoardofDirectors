"""Ola 2.1-decimocuarta — 7 tablas del dominio Sports & Recreation.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-21

Espejo 1:1 de db/orm/sports_recreation_orm.py (SportsReservationORM ·
SportsTournamentORM · SportsFitnessClassORM · SportsCoachingSessionORM ·
SportsEquipmentORM · SportsLeagueORM · SportsRecommendationORM) —
constraint names deterministas por la naming_convention de Base
(pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas/dicts
del agregado: prizes (torneos) · equipment_needed (clases) ·
focus_areas (coaching) · teams + standings (ligas) — mismo criterio
que families §3.8-bis hasta age_group §3.8-DECIMATERCERA.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 13 verticales previas).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice de
communication §3.8-OCTAVA).

Sin seed: el in-memory nace VACÍO (sin seed demo) — las tablas nacen
VACÍAS igual: contrato vacío idéntico.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def _mk(table: str, cols: list) -> None:
    sa.Table(
        table,
        Base.metadata,
        *[c.copy() for c in cols],
        keep_existing=True,
    )


def upgrade() -> None:
    """7 tablas del vertical sports_recreation."""
    # sports_reservations — status CONFIRMED literal del create
    _mk(
        "sports_reservations",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("member_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("member_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("court_name", sa.String(240), nullable=False),
            sa.Column("date", sa.String(16), nullable=False),
            sa.Column("start_time", sa.String(8), nullable=False, server_default="0:00"),
            sa.Column("end_time", sa.String(8), nullable=False, server_default="0:00"),
            sa.Column("status", sa.String(32), nullable=False, server_default="confirmed"),
            sa.Column("purpose", sa.String(32), nullable=False, server_default="regular"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_tournaments — current_participants=0 · status DRAFT del create
    _mk(
        "sports_tournaments",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("format", sa.String(32), nullable=False),
            sa.Column("start_date", sa.String(16), nullable=False),
            sa.Column("end_date", sa.String(16), nullable=False),
            sa.Column("registration_deadline", sa.String(16), nullable=False),
            sa.Column("max_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("current_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("venue", sa.String(240), nullable=False, server_default=""),
            sa.Column("organizer_member_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("entry_fee", sa.Float(), nullable=False, server_default="0"),
            sa.Column("prizes", JSONType, nullable=False),
            sa.Column("rules", sa.Text(), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_fitness_classes — current_enrolled=0 · is_active=1 del create
    _mk(
        "sports_fitness_classes",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("class_type", sa.String(32), nullable=False),
            sa.Column("instructor", sa.String(240), nullable=False),
            sa.Column("schedule_day", sa.String(32), nullable=False, server_default=""),
            sa.Column("schedule_time", sa.String(8), nullable=False, server_default="00:00"),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("max_capacity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("location", sa.String(240), nullable=False),
            sa.Column("skill_level", sa.String(32), nullable=False, server_default="all_levels"),
            sa.Column("current_enrolled", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("equipment_needed", JSONType, nullable=False),
            sa.Column("is_active", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_coaching_sessions — status "scheduled" string literal
    _mk(
        "sports_coaching_sessions",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("coach_name", sa.String(240), nullable=False),
            sa.Column("member_id", sa.String(64), nullable=False),
            sa.Column("member_name", sa.String(240), nullable=False),
            sa.Column("date", sa.String(16), nullable=False),
            sa.Column("start_time", sa.String(8), nullable=False, server_default="0:00"),
            sa.Column("end_time", sa.String(8), nullable=False, server_default="0:00"),
            sa.Column("location", sa.String(240), nullable=False),
            sa.Column("skill_level", sa.String(32), nullable=False, server_default="beginner"),
            sa.Column("focus_areas", JSONType, nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("status", sa.String(32), nullable=False, server_default="scheduled"),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_equipment — notes/last_maintenance None del create
    _mk(
        "sports_equipment",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("location", sa.String(240), nullable=False),
            sa.Column("total_quantity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("available_quantity", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("condition", sa.String(32), nullable=False, server_default="good"),
            sa.Column("brand", sa.String(120), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("last_maintenance", sa.Text(), nullable=True),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_leagues — current_round=0 · standings={} · PROPOSED del create
    _mk(
        "sports_leagues",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("season", sa.String(32), nullable=False, server_default=""),
            sa.Column("start_date", sa.String(16), nullable=False),
            sa.Column("end_date", sa.String(16), nullable=False),
            sa.Column("coordinator_member_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("max_teams", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("format", sa.String(32), nullable=False, server_default="round_robin"),
            sa.Column("teams", JSONType, nullable=False),
            sa.Column("current_round", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("standings", JSONType, nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # sports_recommendations — espejo de SportsRecommendation
    _mk(
        "sports_recommendations",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("member_id", sa.String(64), nullable=False),
            sa.Column("sport", sa.String(32), nullable=False),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.8"),
            sa.Column("suggested_class", sa.String(240), nullable=True),
            sa.Column("suggested_coach", sa.String(240), nullable=True),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    """7 tablas del vertical sports_recreation (down determinista)."""
    for t in (
        "sports_recommendations",
        "sports_leagues",
        "sports_equipment",
        "sports_coaching_sessions",
        "sports_fitness_classes",
        "sports_tournaments",
        "sports_reservations",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
