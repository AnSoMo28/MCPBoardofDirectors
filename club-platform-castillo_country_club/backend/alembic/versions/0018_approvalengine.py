"""Ola 2.3 — 2 tablas del vertical ApprovalEngine (Q-PER-03).

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-22

Espejo 1:1 de db/orm/approvals_orm.py (ApprovalORM ·
ApprovalEventORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

approval_events: índices en request_id y event_hash (el ledger SE
CONSULTA por solicitud — events_for — y se verifica por hash), con
op.create_index explícito estilo 0007: la única vertical con
índices no-PK (append-only se consulta, no se escanea).

Los enums NO son constraint CHECK: el repo guarda str plano
(.value) y Pydantic reconstruye al leer — mismo estilo que las 17
verticales previas (lección 0017).

Sin seed: las tablas nacen VACÍAS — el estado inicial del motor es
runtime (ninguna solicitud pre-existente es truthful).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op
from club_mcp.db.orm.base import Base  # noqa: F401 — target_metadata


revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    """2 tablas del vertical ApprovalEngine."""
    # approvals — espejo de ApprovalRequest (Pydantic)
    op.create_table(
        "approvals",
        sa.Column("request_id", sa.String(length=36), nullable=False),
        sa.PrimaryKeyConstraint("request_id", name="pk_approvals"),
        sa.Column("agent", sa.String(length=64), nullable=False),
        sa.Column("tool", sa.String(length=128), nullable=False),
        sa.Column("requested_by", sa.String(length=64), nullable=False),
        sa.Column("approval_level", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("params", _jsonb(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.String(length=64), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("risk_summary", sa.Text(), nullable=False),
        sa.Column("estimated_impact", sa.Text(), nullable=False),
        sa.Column("affected_count", sa.Integer(), nullable=False),
        sa.Column("requires_dual_approval", sa.Boolean(), nullable=False),
        sa.Column("first_approval_by", sa.String(length=64), nullable=True),
        sa.Column("second_approval_by", sa.String(length=64), nullable=True),
        sa.Column("approver_roles", _jsonb(), nullable=False),
    )
    # approval_events — ledger append-only hash-chain (ADR-0007)
    op.create_table(
        "approval_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("request_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=16), nullable=False),
        sa.Column("actor", sa.String(length=64), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("payload", _jsonb(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("prev_hash", sa.String(length=64), nullable=False),
        sa.Column("event_hash", sa.String(length=64), nullable=False),
    )
    op.create_index(
        "ix_approval_events_request_id", "approval_events", ["request_id"]
    )
    op.create_index(
        "ix_approval_events_event_hash", "approval_events", ["event_hash"]
    )


def downgrade() -> None:
    """Determinista: las 2 tablas del vertical (índices primero)."""
    op.drop_index("ix_approval_events_event_hash", table_name="approval_events")
    op.drop_index("ix_approval_events_request_id", table_name="approval_events")
    op.drop_table("approval_events")
    op.drop_table("approvals")
