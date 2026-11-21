"""Ola 2.1-decimotercima — 4 tablas del dominio Age Group.

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-21

Espejo 1:1 de db/orm/age_group_orm.py (AgeGroupActivityORM ·
AgeGroupEnrollmentORM · AgeGroupMonthlySnapshotORM ·
AgeGroupMemberCountORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas del
agregado: equipment_needed · tags · schedule_days — mismo criterio
que families §3.8-bis hasta facility_management §3.8-DUODECIMA.

Enrollments NORMALIZADOS a tabla propia (columnas planas family_id ·
enrolled_at · status · satisfaction + activity_id) — el in-memory
las colgaba como list[dict] del activity_id; el ORM las hace filas
con surrogate id: MISMO contrato observable.

Monthly snapshots: PK compuesto (month, age_group) — dato de primera
clase (hallazgo H-3 de la guía: el in-memory solo las tenía del seed
demo; la tabla las hace reales).

Member/family counts: una fila por age_group — dato de primera clase
(criterio H-3). Sin seed: las 6 categorías nacen de filas que el
deploy escribe; SIN filas el repo lee 0 — igual que el in-memory sin
seed (contrato vacío idéntico).

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice de
communication §3.8-OCTAVA).

Sin seed: el _seed_data del in-memory (47 actividades + enrollments
+ 6 meses de snapshots — demo) NO se reproduce: las tablas nacen
VACÍAS y solo el runtime las puebla (mismo criterio que communication
§3.8-OCTAVA … facility_management §3.8-DUODECIMA: el seed DEMO es
del demo in-memory).

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 12 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0013"
down_revision: str | None = "0012"
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
    """4 tablas del vertical age_group."""
    # age_group_activities — enums .value (age_group/difficulty/status)
    _mk(
        "age_group_activities",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("age_group", sa.String(32), nullable=False),
            sa.Column("difficulty", sa.String(32), nullable=False, server_default="easy"),
            sa.Column("location", sa.String(240), nullable=False, server_default=""),
            sa.Column("max_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("requires_instructor", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("instructor_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("equipment_needed", JSONType, nullable=False),
            sa.Column("tags", JSONType, nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="active"),
            sa.Column("schedule_days", JSONType, nullable=False),
            sa.Column("schedule_time", sa.String(16), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.Text(), nullable=True),
        ],
    )
    # age_group_enrollments — columnas planas del dict de inscripción
    _mk(
        "age_group_enrollments",
        [
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("activity_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("family_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("enrolled_at", sa.String(16), nullable=False, server_default=""),
            sa.Column("status", sa.String(16), nullable=False, server_default="active"),
            sa.Column("satisfaction", sa.Float(), nullable=False, server_default="0"),
        ],
    )
    # age_group_monthly_snapshots — PK compuesto (month, age_group)
    _mk(
        "age_group_monthly_snapshots",
        [
            sa.Column("month", sa.String(7), primary_key=True),
            sa.Column("age_group", sa.String(32), primary_key=True),
            sa.Column("enrolled", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("satisfaction", sa.Float(), nullable=False, server_default="0"),
            sa.Column("new_enrollments", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("retention_rate", sa.Float(), nullable=False, server_default="0"),
        ],
    )
    # age_group_member_counts — censo por grupo (dato de primera clase H-3)
    _mk(
        "age_group_member_counts",
        [
            sa.Column("age_group", sa.String(32), primary_key=True),
            sa.Column("member_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("family_count", sa.Integer(), nullable=False, server_default="0"),
        ],
    )


def downgrade() -> None:
    """4 tablas del vertical age_group (down determinista)."""
    for t in (
        "age_group_member_counts",
        "age_group_monthly_snapshots",
        "age_group_enrollments",
        "age_group_activities",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
