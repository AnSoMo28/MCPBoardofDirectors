"""Ola 2.1-nona — 4 tablas del dominio Cultural & Social.

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-20

Espejo 1:1 de db/orm/cultural_social_orm.py (CulturalEventORM ·
EntertainmentActORM · CulturalProgramORM · ArtExhibitionORM) —
constraint names deterministas por la naming_convention de Base
(pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas
anexas (entertainment_ids · requirements · event_ids): anexos del
agregado, no entidades con identity propia (mismo criterio que
families.activities §3.8-bis, engagement.favorite_activities
§3.8-tris, guests.privileges §3.8-SEXTA, satisfaction.questions
§3.8-SEPTIMA y communication.channels §3.8-OCTAVA).

Sin índices: todos los reads del contrato cargan la tabla (chica)
y filtran en Python EXACTO como el in-memory iteraba .values() —
mismo orden de inserción, mismo contrato observable (criterio
sin-índice de communication §3.8-OCTAVA).

Sin tabla de dataset demo: el in-memory de cultural_social no tiene
constantes de seed — los 4 dicts nacen vacíos y solo el runtime del
agente los puebla.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 8 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0009"
down_revision: str | None = "0008"
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
    """4 tablas del vertical cultural_social."""
    _mk(
        "cultural_events",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False, server_default=""),
            sa.Column("event_type", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
            sa.Column("formality", sa.String(32), nullable=False, server_default="semi_formal"),
            sa.Column("venue", sa.String(120), nullable=False, server_default=""),
            sa.Column("venue_type", sa.String(32), nullable=False, server_default="ballroom"),
            sa.Column("date", sa.Text(), nullable=False, server_default=""),
            sa.Column("start_time", sa.String(16), nullable=False, server_default=""),
            sa.Column("end_time", sa.String(16), nullable=False, server_default=""),
            sa.Column("organizer_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("guest_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("budget", sa.Float(), nullable=False, server_default="0"),
            sa.Column("menu_theme", sa.String(120), nullable=False, server_default=""),
            sa.Column("dress_code", sa.String(64), nullable=False, server_default=""),
            sa.Column("entertainment_ids", JSONType, nullable=False, server_default="[]"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    _mk(
        "entertainment_acts",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("artist_name", sa.String(120), nullable=False, server_default=""),
            sa.Column("entertainment_type", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("genre", sa.String(64), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("contact_person", sa.String(120), nullable=False, server_default=""),
            sa.Column("contact_phone", sa.String(64), nullable=False, server_default=""),
            sa.Column("requirements", JSONType, nullable=False, server_default="[]"),
            sa.Column("event_id", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "cultural_programs",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False, server_default=""),
            sa.Column("category", sa.String(32), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("season", sa.String(32), nullable=False, server_default=""),
            sa.Column("start_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("end_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("coordinator_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("max_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("current_participants", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("budget", sa.Float(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("event_ids", JSONType, nullable=False, server_default="[]"),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "art_exhibitions",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("title", sa.String(200), nullable=False, server_default=""),
            sa.Column("artist_name", sa.String(120), nullable=False, server_default=""),
            sa.Column("category", sa.String(32), nullable=False, server_default="visual_arts"),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("venue", sa.String(120), nullable=False, server_default=""),
            sa.Column("venue_type", sa.String(32), nullable=False, server_default="lounge"),
            sa.Column("start_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("end_date", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="scheduled"),
            sa.Column("num_pieces", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("curator_member_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("opening_reception", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )


def downgrade() -> None:
    for t in (
        "art_exhibitions",
        "cultural_programs",
        "entertainment_acts",
        "cultural_events",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
