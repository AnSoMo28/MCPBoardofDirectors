"""Ola 2.1-duodécima — 5 tablas del dominio Facility Management.

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-20

Espejo 1:1 de db/orm/facility_management_orm.py
(FacilityORM · MaintenanceTaskORM · EventSetupORM · InspectionORM ·
FacilityReservationORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas del
agregado: amenities · requirements · corrective_actions — mismo
criterio que families §3.8-bis hasta proactive_recommendation
§3.8-UNDECIMA.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA).

Sin seed: el _seed_data del in-memory (12 facilities + 8 maintenance
+ 5 inspections + 4 setups + 10 reservations — demo) NO se reproduce:
las tablas nacen VACÍAS y solo el runtime las puebla (mismo criterio
que communication §3.8-OCTAVA … proactive_recommendation
§3.8-UNDECIMA: el seed DEMO es del demo in-memory).

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 11 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0012"
down_revision: str | None = "0011"
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
    """5 tablas del vertical facility_management."""
    # facilities — enums .value (facility_type/status)
    _mk(
        "facilities",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False, server_default=""),
            sa.Column("facility_type", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="operational"),
            sa.Column("location", sa.String(240), nullable=False, server_default=""),
            sa.Column("capacity", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("amenities", JSONType, nullable=False),
            sa.Column("opening_time", sa.String(8), nullable=False, server_default="06:00"),
            sa.Column("closing_time", sa.String(8), nullable=False, server_default="22:00"),
            sa.Column("responsible_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("base_rate", sa.Float(), nullable=False, server_default="0"),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    # maintenance_tasks — enums .value (maintenance_type/status/priority)
    _mk(
        "maintenance_tasks",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("facility_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("facility_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("maintenance_type", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="scheduled"),
            sa.Column("priority", sa.String(32), nullable=False, server_default="medium"),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("scheduled_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("scheduled_time", sa.String(8), nullable=False, server_default="08:00"),
            sa.Column("estimated_duration_hours", sa.Float(), nullable=False, server_default="2"),
            sa.Column("assigned_to", sa.String(240), nullable=False, server_default=""),
            sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("completed_at", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    # event_setups — requirements JSONB · status enum .value
    _mk(
        "event_setups",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("event_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("event_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("facility_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("facility_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="requested"),
            sa.Column("setup_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("setup_time", sa.String(8), nullable=False, server_default="08:00"),
            sa.Column("event_start", sa.Text(), nullable=False, server_default=""),
            sa.Column("event_end", sa.Text(), nullable=False, server_default=""),
            sa.Column("requirements", JSONType, nullable=False),
            sa.Column("assigned_to", sa.String(240), nullable=False, server_default=""),
            sa.Column("coordinator_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    # inspections — result enum .value · corrective_actions JSONB
    _mk(
        "inspections",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("facility_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("facility_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("result", sa.String(32), nullable=False, server_default="pass"),
            sa.Column("inspector_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("inspection_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("findings", sa.Text(), nullable=False, server_default=""),
            sa.Column("corrective_actions", JSONType, nullable=False),
            sa.Column("next_inspection_date", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    # facility_reservations — status CONFIRMED literal del create · created_at ISO
    _mk(
        "facility_reservations",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("facility_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("facility_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("family_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("family_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("date", sa.Text(), nullable=False, server_default=""),
            sa.Column("start_time", sa.String(8), nullable=False, server_default=""),
            sa.Column("end_time", sa.String(8), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("guest_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("purpose", sa.String(240), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(240), nullable=False, server_default="system"),
            sa.Column("created_at", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    """5 tablas del vertical facility_management (down determinista)."""
    for t in (
        "facility_reservations",
        "inspections",
        "event_setups",
        "maintenance_tasks",
        "facilities",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
