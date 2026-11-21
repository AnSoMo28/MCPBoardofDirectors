"""Ola 2.1-quinqua — 3 tablas del dominio Compliance.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-18

Espejo 1:1 de db/orm/compliance_orm.py (ComplianceAuditORM ·
ComplianceDocumentORM · ComplianceAlertORM) — constraint names
deterministas por la naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para
compliance_audits.checks: anexos del agregado, no entidades con
identity propia (mismo criterio que families.activities §3.8-bis
y engagement.favorite_activities §3.8-tris).

Los enums NO son constraint CHECK: el repo guarda .value (String(24))
y reconstruye el Pydantic enum al leer — el contrato del agente
(28 tests) pasa enums por update; un CHECK duplicaría la validación
que Pydantic ya hace en el borde (decisión: sin CHECK, mismo estilo
que tier/status en families y las 4 verticales previas).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "compliance_audits",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_compliance_audits"),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("area", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("auditor", sa.String(length=200), nullable=False),
        sa.Column("date_from", sa.String(length=10), nullable=False),
        sa.Column("date_to", sa.String(length=10), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("checks", _jsonb(), nullable=False),
        sa.Column("total_checks", sa.Integer(), nullable=False),
        sa.Column("passed_checks", sa.Integer(), nullable=False),
        sa.Column("failed_checks", sa.Integer(), nullable=False),
        sa.Column("score_pct", sa.Numeric(6, 1), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_compliance_audits_created_at",
        "compliance_audits",
        ["created_at"],
    )
    op.create_index(
        "ix_compliance_audits_area",
        "compliance_audits",
        ["area"],
    )
    op.create_table(
        "compliance_documents",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_compliance_documents"),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("area", sa.String(length=24), nullable=False),
        sa.Column("issuer", sa.String(length=200), nullable=False),
        sa.Column("document_number", sa.String(length=100), nullable=False),
        sa.Column("issue_date", sa.String(length=10), nullable=False),
        sa.Column("expiry_date", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("file_url", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_compliance_documents_area",
        "compliance_documents",
        ["area"],
    )
    op.create_index(
        "ix_compliance_documents_status",
        "compliance_documents",
        ["status"],
    )
    op.create_table(
        "compliance_alerts",
        sa.Column("id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_compliance_alerts"),
        sa.Column("area", sa.String(length=24), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("risk_level", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("due_date", sa.String(length=10), nullable=False),
        sa.Column("responsible", sa.String(length=200), nullable=False),
        sa.Column("resolution", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_compliance_alerts_area",
        "compliance_alerts",
        ["area"],
    )
    op.create_index(
        "ix_compliance_alerts_status",
        "compliance_alerts",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_compliance_alerts_status", table_name="compliance_alerts")
    op.drop_index("ix_compliance_alerts_area", table_name="compliance_alerts")
    op.drop_table("compliance_alerts")
    op.drop_index("ix_compliance_documents_status", table_name="compliance_documents")
    op.drop_index("ix_compliance_documents_area", table_name="compliance_documents")
    op.drop_table("compliance_documents")
    op.drop_index("ix_compliance_audits_area", table_name="compliance_audits")
    op.drop_index("ix_compliance_audits_created_at", table_name="compliance_audits")
    op.drop_table("compliance_audits")
