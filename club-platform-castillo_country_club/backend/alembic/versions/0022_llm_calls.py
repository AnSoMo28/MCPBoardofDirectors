"""Ola 3.2 — 2 tablas del vertical LLM calls + presupuesto (Q-LLM-02).

Revision ID: 0022
Revises: 0021
Create Date: 2026-11-24

Espejo 1:1 de db/orm/llm_calls_orm.py (LLMCallLogORM ·
LLMUsageDailyORM) — constraint names deterministas por la
naming_convention de Base (pk_<table> / uq_llm_usage_daily_date).

Índices EXPLÍCITOS estilo 0018 (la única vertical previa con
índices no-PK fue approval — mismo criterio: tablas de LEDGER se
CONSULTAN, no se escanean):
  * ix_llm_calls_called_at — auditoría por rango temporal
    (calls_between: WHERE called_at >= $1 AND <= $2 ORDER BY ASC)
  * ix_llm_calls_date_key — la agrupación del presupuesto por día
  * ix_llm_usage_daily_date_key — el SELECT de HOY del presupuesto

Los enums/provider NO llevan constraint CHECK: el repo guarda str
plano — mismo estilo que las 19 verticales previas (lección 0017).

Sin seed: las tablas nacen VACÍAS — un presupuesto que empiece en
cero es el estado truthful de un deploy nuevo.
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op
from club_mcp.db.orm.base import Base  # noqa: F401 — target_metadata


revision: str = "0022"
down_revision: str | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """2 tablas del vertical LLM calls + presupuesto diario."""
    # llm_calls — registro append-only de cada llamada LLM
    op.create_table(
        "llm_calls",
        sa.Column("call_id", sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint("call_id", name="pk_llm_calls"),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("degraded", sa.Boolean(), nullable=False),
        sa.Column("provider_error", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Float(), nullable=False),
        sa.Column("called_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_key", sa.String(length=10), nullable=False),
        sa.Column("day", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_llm_calls_called_at", "llm_calls", ["called_at"], unique=False
    )
    op.create_index(
        "ix_llm_calls_date_key", "llm_calls", ["date_key"], unique=False
    )
    # llm_usage_daily — presupuesto acumulado por día (UNIQUE date_key)
    op.create_table(
        "llm_usage_daily",
        sa.Column("date_key", sa.String(length=10), nullable=False),
        sa.PrimaryKeyConstraint("date_key", name="pk_llm_usage_daily"),
        sa.UniqueConstraint("date_key", name="uq_llm_usage_daily_date"),
        sa.Column("tokens", sa.Integer(), nullable=False),
        sa.Column("calls", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("day", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_llm_usage_daily_date_key",
        "llm_usage_daily",
        ["date_key"],
        unique=False,
    )


def downgrade() -> None:
    """Determinista: exactamente lo que upgrade creó, inverso."""
    op.drop_index(
        "ix_llm_usage_daily_date_key", table_name="llm_usage_daily"
    )
    op.drop_table("llm_usage_daily")
    op.drop_index("ix_llm_calls_date_key", table_name="llm_calls")
    op.drop_index("ix_llm_calls_called_at", table_name="llm_calls")
    op.drop_table("llm_calls")
