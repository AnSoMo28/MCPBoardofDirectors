"""Ola 2.2 — 4 tablas del dominio Event (vertical event).

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-18

Espejo 1:1 de db/orm/event_orm.py (EventORM · EventRSVPORM ·
EventVendorORM · EventProgramItemORM) — constraint names deterministas
por la naming_convention de Base (pk_<table> · fk_<table>_event_id_events).

Los 3 hijos llevan FK event_id → events.id ON DELETE CASCADE: el
delete_event del in-memory rebuildaba los dicts filtrando event_id;
acá el invariante "borrar el evento borra sus RSVPs/vendors/programa"
lo garantiza el constraint físico dentro de la transacción.

JSONB (postgres) con variante JSON (sqlite/dev) para facility_ids ·
age_groups · tags · member_ids: anexos del agregado, no entidades con
identity propia (mismo criterio que families §3.8-bis).

Enums SIN CHECK (String(24)): la validación vive en Pydantic del
borde — mismo estilo que tier/status en families y que 0003.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_events"),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=24), nullable=False),
        sa.Column("event_type", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("date_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(length=300), nullable=False),
        sa.Column("facility_ids", _jsonb(), nullable=False),
        sa.Column("age_groups", _jsonb(), nullable=False),
        sa.Column("max_capacity", sa.Integer(), nullable=False),
        sa.Column("current_attendance", sa.Integer(), nullable=False),
        sa.Column("waitlist_count", sa.Integer(), nullable=False),
        sa.Column("pricing_model", sa.String(length=24), nullable=False),
        sa.Column("price_per_person", sa.Float(), nullable=False),
        sa.Column("is_members_only", sa.Boolean(), nullable=False),
        sa.Column("allow_guests", sa.Boolean(), nullable=False),
        sa.Column("max_guests_per_family", sa.Integer(), nullable=False),
        sa.Column("recurrence", sa.String(length=24), nullable=False),
        sa.Column("requires_rsvp", sa.Boolean(), nullable=False),
        sa.Column("dress_code", sa.String(length=120), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("tags", _jsonb(), nullable=False),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_events_date_start", "events", ["date_start"], unique=False
    )
    op.create_index(
        "ix_events_status", "events", ["status"], unique=False
    )

    op.create_table(
        "event_rsvps",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_event_rsvps"),
        sa.Column("event_id", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"], ["events.id"], ondelete="CASCADE",
            name="fk_event_rsvps_event_id_events",
        ),
        sa.Column("family_id", sa.String(length=36), nullable=False),
        sa.Column("family_name", sa.String(length=200), nullable=False),
        sa.Column("member_ids", _jsonb(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("guests_count", sa.Integer(), nullable=False),
        sa.Column("dietary_restrictions", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("total_cost", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_event_rsvps_event_id", "event_rsvps", ["event_id"], unique=False
    )
    op.create_index(
        "ix_event_rsvps_status", "event_rsvps", ["status"], unique=False
    )

    op.create_table(
        "event_vendors",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_event_vendors"),
        sa.Column("event_id", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"], ["events.id"], ondelete="CASCADE",
            name="fk_event_vendors_event_id_events",
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("service_type", sa.String(length=60), nullable=False),
        sa.Column("contact_name", sa.String(length=200), nullable=False),
        sa.Column("contact_phone", sa.String(length=30), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=False),
        sa.Column("quoted_cost", sa.Float(), nullable=False),
        sa.Column("final_cost", sa.Float(), nullable=True),
        sa.Column("contract_status", sa.String(length=24), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_event_vendors_event_id", "event_vendors", ["event_id"], unique=False
    )

    op.create_table(
        "event_program_items",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_event_program_items"),
        sa.Column("event_id", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(
            ["event_id"], ["events.id"], ondelete="CASCADE",
            name="fk_event_program_items_event_id_events",
        ),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("time_start", sa.String(length=10), nullable=False),
        sa.Column("time_end", sa.String(length=10), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=300), nullable=False),
        sa.Column("responsible", sa.String(length=200), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
    )
    op.create_index(
        "ix_event_program_items_event_id",
        "event_program_items",
        ["event_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("event_program_items")
    op.drop_table("event_vendors")
    op.drop_table("event_rsvps")
    op.drop_index("ix_events_status", table_name="events")
    op.drop_index("ix_events_date_start", table_name="events")
    op.drop_table("events")
