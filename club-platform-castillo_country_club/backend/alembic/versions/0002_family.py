"""Ola 2.1-bis — tablas families + members (vertical family).

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-16

Espejo 1:1 de db/orm/family_orm.py (FamilyORM · MemberORM) —
constraint names deterministas por la naming_convention de Base
(pk_families / uq_families_email / fk_members_family /
uq_members_family_id). users.family_id (migración 0001) era FK
LÓGICO ("la tabla families no existe todavía; se materializa en
su propia ola") — esta ES esa ola: queda como FK físico.

JSONB (postgres) con variante JSON (sqlite/dev) para activities ·
social_connections · preferences: anexos append-only del agregado
familia, no entidades con identity propia (mismo criterio que el
dict in-memory que reemplazan).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "families",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_families"),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("tier", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=30), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("join_date", sa.Date(), nullable=False),
        sa.Column("engagement_score", sa.Integer(), nullable=False),
        sa.Column("referral_family_id", sa.String(length=36), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "activities",
            JSONB().with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column(
            "social_connections",
            JSONB().with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column(
            "preferences",
            JSONB().with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_families_email", "families", ["email"], unique=True)
    op.create_index("ix_families_tier", "families", ["tier"], unique=False)
    op.create_index("ix_families_status", "families", ["status"], unique=False)

    op.create_table(
        "members",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_members"),
        sa.Column("family_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(
            ["family_id"], ["families.id"], name="fk_members_family"
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("allergies", sa.Text(), nullable=True),
        sa.Column("dietary_restrictions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("family_id", "id", name="uq_members_family_id"),
    )
    op.create_index("ix_members_family_id", "members", ["family_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_members_family_id", table_name="members")
    op.drop_table("members")
    op.drop_index("ix_families_status", table_name="families")
    op.drop_index("ix_families_tier", table_name="families")
    op.drop_index("ix_families_email", table_name="families")
    op.drop_table("families")
