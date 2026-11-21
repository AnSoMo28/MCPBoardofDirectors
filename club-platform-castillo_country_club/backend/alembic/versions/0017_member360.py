"""Ola 2.1-decimaseptima — 2 tablas del dominio Member 360.

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-21

Espejo 1:1 de db/orm/member360_orm.py (Member360MemberORM ·
Member360HealthFactorORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

El repo in-memory es READ-ONLY (dataset demo en constantes de
módulo, opt-in por constructor): las tablas nacen VACÍAS — el seed
NO va en la migración, va en el repo ORM idempotente
(_ensure_seed con seed_demo_data=True — mecánica family_repo.
seed_demo_data). member360_members.member_id es UNIQUE (lookup
por member_id del contrato).

Sin índices: los reads cargan la tabla (chica) y filtran en
Python EXACTO como el in-memory iteraba la lista _members —
mismo orden de inserción (order_by(id)), mismo contrato observable
(criterio sin-índice de communication §3.8-OCTAVA · lección run
#56: orden contractual SIEMPRE explícito en el repo).

Los enums NO son constraint CHECK: el repo guarda str plano
(tier/role/age_group son str en el modelo) y Pydantic reconstruye
al leer — mismo estilo que las 16 verticales previas.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from club_mcp.db.orm.base import Base


revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _mk(table: str, cols: list) -> None:
    sa.Table(
        table,
        Base.metadata,
        *[c.copy() for c in cols],
        keep_existing=True,
    )


def upgrade() -> None:
    """2 tablas del vertical member_360."""
    # member360_members — espejo de MemberIdentity (dataset demo)
    _mk(
        "member360_members",
        [
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("member_id", sa.String(24), nullable=False, unique=True),
            sa.Column("first_name", sa.String(120), nullable=False),
            sa.Column("last_name", sa.String(120), nullable=False),
            sa.Column("email", sa.String(240), nullable=True),
            sa.Column("tier", sa.String(32), nullable=False),
            sa.Column("role", sa.String(32), nullable=False),
            sa.Column("family_id", sa.String(24), nullable=False),
            sa.Column("family_name", sa.String(120), nullable=False),
            sa.Column("join_date", sa.Date, nullable=False),
            sa.Column("age", sa.Integer, nullable=True),
            sa.Column("age_group", sa.String(32), nullable=True),
        ],
    )
    # member360_health_factors — espejo de HealthFactor (5 por miembro)
    _mk(
        "member360_health_factors",
        [
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("member_id", sa.String(24), nullable=False),
            sa.Column("name", sa.String(32), nullable=False),
            sa.Column("score", sa.Float, nullable=False),
            sa.Column("weight", sa.Float, nullable=False),
            sa.Column("trend", sa.String(16), nullable=False, server_default="stable"),
            sa.Column("details", sa.Text, nullable=True),
        ],
    )


def downgrade() -> None:
    """2 tablas del vertical member_360 (down determinista)."""
    for t in ("member360_health_factors", "member360_members"):
        sa.Table(t, Base.metadata, keep_existing=True).drop(checkfirst=True)
