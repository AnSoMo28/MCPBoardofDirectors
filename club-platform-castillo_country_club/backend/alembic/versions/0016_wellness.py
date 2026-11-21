"""Ola 2.1-decimosexta — 5 tablas del dominio Wellness.

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-21

Espejo 1:1 de db/orm/wellness_orm.py (WellnessProfileORM ·
WellnessGoalORM · WellnessActivityORM · WellnessClassORM ·
WellnessAppointmentORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas del
agregado: health_conditions · allergies · dietary_restrictions ·
preferred_activities (perfiles) — mismo criterio que families
§3.8-bis hasta finance §3.8-DECIMOQUINTA.

Los enums NO son constraint CHECK: el repo guarda .value
(String(32)) y Pydantic reconstruye el enum al leer — el contrato
del agente pasa enums y str indistintamente; un CHECK duplicaría la
validación que Pydantic ya hace en el borde (mismo estilo que las
15 verticales previas).

Sin índices: todos los reads del contrato cargan la tabla (chica)
y filtran en Python EXACTO como el in-memory iteraba .values() —
mismo orden de inserción, mismo contrato observable (criterio
sin-índice de communication §3.8-OCTAVA · lección run #56: todo
orden contractual lleva order_by(id) explícito en el repo).

Sin seed: el in-memory nace VACÍO — las tablas nacen VACÍAS igual:
contrato vacío idéntico.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0016"
down_revision: str | None = "0015"
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
    """5 tablas del vertical wellness."""
    # wellness_profiles — listas JSONB · created/updated ISO Text
    _mk(
        "wellness_profiles",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("family_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("fitness_level", sa.String(32), nullable=False, server_default="beginner"),
            sa.Column("health_conditions", JSONType, nullable=False),
            sa.Column("allergies", JSONType, nullable=False),
            sa.Column("dietary_restrictions", JSONType, nullable=False),
            sa.Column("preferred_activities", JSONType, nullable=False),
            sa.Column("emergency_contact", sa.String(240), nullable=False, server_default=""),
            sa.Column("emergency_phone", sa.String(64), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.Text(), nullable=True),
        ],
    )
    # wellness_goals — status ACTIVE del create · enums .value
    _mk(
        "wellness_goals",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("goal_type", sa.String(32), nullable=False),
            sa.Column("title", sa.String(240), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("target_value", sa.Float(), nullable=False, server_default="0"),
            sa.Column("current_value", sa.Float(), nullable=False, server_default="0"),
            sa.Column("unit", sa.String(32), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="active"),
            sa.Column("target_date", sa.String(16), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # wellness_activities — date "" literal del create
    _mk(
        "wellness_activities",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("member_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("activity_type", sa.String(32), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("calories_burned", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("distance_km", sa.Float(), nullable=False, server_default="0"),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("date", sa.String(16), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )
    # wellness_classes — SIN created_at (el modelo no lo tiene)
    _mk(
        "wellness_classes",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("activity_type", sa.String(32), nullable=False),
            sa.Column("instructor", sa.String(240), nullable=False, server_default=""),
            sa.Column("level", sa.String(32), nullable=False, server_default="all_levels"),
            sa.Column("max_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("location", sa.String(240), nullable=False, server_default=""),
            sa.Column("schedule_day", sa.String(32), nullable=False, server_default=""),
            sa.Column("schedule_time", sa.String(16), nullable=False, server_default=""),
            sa.Column("enrolled_count", sa.Integer(), nullable=False, server_default="0"),
        ],
    )
    # wellness_appointments — SCHEDULED literal · cancel floor 0
    _mk(
        "wellness_appointments",
        [
            sa.Column("id", sa.String(24), primary_key=True),
            sa.Column("class_id", sa.String(24), nullable=False, server_default=""),
            sa.Column("class_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("family_id", sa.String(64), nullable=False),
            sa.Column("member_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("date", sa.String(16), nullable=False, server_default=""),
            sa.Column("time", sa.String(16), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="scheduled"),
            sa.Column("notes", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    """5 tablas del vertical wellness (down determinista)."""
    for t in (
        "wellness_appointments",
        "wellness_classes",
        "wellness_activities",
        "wellness_goals",
        "wellness_profiles",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
