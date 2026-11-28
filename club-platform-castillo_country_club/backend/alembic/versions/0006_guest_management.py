"""Ola 2.1-sexta — 4 tablas del dominio Guest Management.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-18

Espejo 1:1 de db/orm/guest_orm.py (GuestORM · PrivateEventORM ·
TrialMembershipORM · GuestMonthlySnapshotORM) — constraint names
deterministas por la naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para
guests.privileges y trial_memberships.privileges: anexos del
agregado, no entidades con identity propia (mismo criterio que
families.activities §3.8-bis y engagement.favorite_activities
§3.8-tris).

visit_count: columna REAL (el in-memory lo guardaba como anexo
privado `_visit_count` que solo el seed demo producía) — default 1
reproduce el comportamiento observable del in-memory para guests
creados por create_guest.

guest_monthly_snapshots: las tendencias temporales eran UNA constante
de seed demo que solo existía con seed_demo_data=True (el runtime
nunca la activa); tabla para que el deploy cargue el dataset (criterio
0011: dataset demo UNA fuente) y los compute lean de la base.

Los enums NO son constraint CHECK: el repo guarda .value (String(24))
y reconstruye el Pydantic enum al leer — el contrato del agente (44
tests) pasa enums por update; un CHECK duplicaría la validación que
Pydantic ya hace en el borde (mismo estilo que las 5 verticales previas).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "guests",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_guests"),
        sa.Column("family_id", sa.String(length=64), nullable=False),
        sa.Column("host_member_id", sa.String(length=64), nullable=False),
        sa.Column("guest_name", sa.String(length=200), nullable=False),
        sa.Column("guest_email", sa.String(length=200), nullable=False),
        sa.Column("guest_phone", sa.String(length=50), nullable=False),
        sa.Column("visit_date", sa.String(length=10), nullable=False),
        sa.Column("purpose", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("privileges", _jsonb(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("visit_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_guests_family_id",
        "guests",
        ["family_id"],
    )
    op.create_index(
        "ix_guests_status",
        "guests",
        ["status"],
    )
    op.create_index(
        "ix_guests_visit_date",
        "guests",
        ["visit_date"],
    )
    op.create_table(
        "private_events",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_private_events"),
        sa.Column("family_id", sa.String(length=64), nullable=False),
        sa.Column("event_name", sa.String(length=200), nullable=False),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("venue", sa.String(length=200), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("start_time", sa.String(length=10), nullable=False),
        sa.Column("end_time", sa.String(length=10), nullable=False),
        sa.Column("guest_count", sa.Integer(), nullable=False),
        sa.Column("budget", sa.Numeric(14, 2), nullable=False),
        sa.Column("estimated_cost", sa.Numeric(14, 2), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("coordinator_member_id", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("special_requirements", sa.Text(), nullable=False),
        sa.Column("catering_required", sa.Boolean(), nullable=False),
        sa.Column("decoration_required", sa.Boolean(), nullable=False),
        sa.Column("entertainment_required", sa.Boolean(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_private_events_family_id",
        "private_events",
        ["family_id"],
    )
    op.create_index(
        "ix_private_events_status",
        "private_events",
        ["status"],
    )
    op.create_table(
        "trial_memberships",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_trial_memberships"),
        sa.Column("guest_name", sa.String(length=200), nullable=False),
        sa.Column("guest_email", sa.String(length=200), nullable=False),
        sa.Column("guest_phone", sa.String(length=50), nullable=False),
        sa.Column("referred_by_family_id", sa.String(length=64), nullable=False),
        sa.Column("trial_type", sa.String(length=24), nullable=False),
        sa.Column("start_date", sa.String(length=10), nullable=False),
        sa.Column("end_date", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("privileges", _jsonb(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_trial_memberships_referred_by_family_id",
        "trial_memberships",
        ["referred_by_family_id"],
    )
    op.create_index(
        "ix_trial_memberships_status",
        "trial_memberships",
        ["status"],
    )
    op.create_table(
        "guest_monthly_snapshots",
        sa.Column("month", sa.String(length=7), nullable=False),
        sa.PrimaryKeyConstraint("month", name="pk_guest_monthly_snapshots"),
        sa.Column("new_guests", sa.Integer(), nullable=False),
        sa.Column("check_ins", sa.Integer(), nullable=False),
        sa.Column("trials", sa.Integer(), nullable=False),
        sa.Column("conversions", sa.Integer(), nullable=False),
        sa.Column("events", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("guest_monthly_snapshots")
    op.drop_index("ix_trial_memberships_status", table_name="trial_memberships")
    op.drop_index("ix_trial_memberships_referred_by_family_id", table_name="trial_memberships")
    op.drop_table("trial_memberships")
    op.drop_index("ix_private_events_status", table_name="private_events")
    op.drop_index("ix_private_events_family_id", table_name="private_events")
    op.drop_table("private_events")
    op.drop_index("ix_guests_visit_date", table_name="guests")
    op.drop_index("ix_guests_status", table_name="guests")
    op.drop_index("ix_guests_family_id", table_name="guests")
    op.drop_table("guests")
