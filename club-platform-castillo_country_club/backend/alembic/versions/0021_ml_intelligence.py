"""Ola 2.1-decimonovena — 1 tabla de features de ML (ml_intelligence).

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-24

Espejo 1:1 de db/orm/ml_intelligence_orm.py (MLMemberFeatureORM)
— constraint names deterministas por la naming_convention de Base
(pk_ml_member_features).

LA TABLA DE FEATURES (decisión de diseño de la decimonovena, no
del perfilado): el dataset cross-domain del in-memory tiene
features per-member (engagement · ltv · churn_risk ·
satisfaction · visits_monthly · active_domains · tenure) que NO
existen en NINGUNA de las 18 tablas migradas — son features de
ML, no columnas de dominio. Con la tabla: canon drop-in byte a
byte (churn 17.5 · segments 4/7/7/2 · PSI 5/5). Sin ella (tabla
vacía): el repo degrada con proxies por-tier sobre members_360
(MISMA forma, MISMA matemática). La tabla nace VACÍA — el
opt-in del repo (seed_member_features) siembra el dataset del
in-memory idempotente (mecánica member360.seed_demo_data).

JSONB (postgres) con variante JSON (sqlite/dev) para
active_domains — mismo criterio que families §3.8-bis hasta
document_intelligence §3.8-DECIMOOCTAVA.

Sin FK dura a members_360: features puede existir para members
que aún no migran (MISMA forma que el in-memory, que no valida
contra nada). Sin índices: el loader carga la tabla completa
(chica — 20 filas del seed) y ordena por member_id ASC (canon
determinista, lección run #56).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    """1 tabla de features del vertical ml_intelligence."""
    sa.Table(
        "ml_member_features",
        Base.metadata,
        sa.Column("member_id", sa.String(24), primary_key=True),
        sa.Column("name", sa.String(240), nullable=False,
                  server_default=""),
        sa.Column("tier", sa.String(32), nullable=False,
                  server_default=""),
        sa.Column("family_id", sa.String(64), nullable=False,
                  server_default=""),
        sa.Column("join_month", sa.String(7), nullable=False,
                  server_default=""),
        sa.Column("engagement", sa.Float(), nullable=False),
        sa.Column("ltv", sa.Float(), nullable=False),
        sa.Column("churn_risk", sa.String(16), nullable=False,
                  server_default="medium"),
        sa.Column("satisfaction", sa.Float(), nullable=False),
        sa.Column("visits_monthly", sa.Integer(), nullable=False),
        sa.Column("active_domains", JSONType, nullable=False),
        sa.Column("tenure_months", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        keep_existing=True,
    )


def downgrade() -> None:
    """1 tabla del vertical ml_intelligence (down determinista)."""
    sa.Table("ml_member_features", Base.metadata).drop(
        checkfirst=True
    )
