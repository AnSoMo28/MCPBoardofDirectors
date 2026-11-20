"""Ola 2.1-décima — 5 tablas del dominio Executive Dashboard.

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-20

Espejo 1:1 de db/orm/executive_dashboard_orm.py (ExecutiveSummaryORM
· ExecutiveAnomalyORM · ExecutiveBoardReportORM ·
ExecutiveRiskMatrixORM · ExecutiveExportORM) — constraint names
deterministas por la naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para los anexos del
agregado: KPIs anidados (membership/financial/operational/
engagement · trends · context) y listas (strategic_recommendations ·
risk_assessment · items del risk) — mismo criterio que families
§3.8-bis hasta cultural_social §3.8-NONA.

OJO risk_matrices: period es la PRIMARY KEY (el in-memory indexa por
período, no por id) — create sobre período existente = overwrite del
registro completo (created_at fresh).

OJO anomalies: id duplicable entre runs (anom_<domain>_001) — el
dict in-memory hacía overwrite de la clave; el repo ORM reproduce la
misma semántica con select-then-update.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice de
communication §3.8-OCTAVA).

Sin tabla de dataset demo: el in-memory de executive_dashboard no
tiene constantes de seed — los 5 dicts nacen vacíos y solo el runtime
del agente los puebla.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 9 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0010"
down_revision: str | None = "0009"
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
    """5 tablas del vertical executive_dashboard."""
    # executive_summaries — keying por id (String(32): summary_id del
    # agente es timestamp strftime %Y%m%d%H%M%S)
    _mk(
        "executive_summaries",
        [
            sa.Column("id", sa.String(32), primary_key=True),
            sa.Column("period", sa.String(32), nullable=False),
            sa.Column("date_from", sa.Text(), nullable=False, server_default=""),
            sa.Column("date_to", sa.Text(), nullable=False, server_default=""),
            sa.Column("membership", JSONType, nullable=False),
            sa.Column("financial", JSONType, nullable=False),
            sa.Column("operational", JSONType, nullable=False),
            sa.Column("engagement", JSONType, nullable=False),
            sa.Column("trends", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # executive_anomalies — id duplicable (anom_<domain>_001): el
    # in-memory hacía overwrite del dict; ORM = select-then-update
    _mk(
        "executive_anomalies",
        [
            sa.Column("id", sa.String(64), primary_key=True),
            sa.Column("domain", sa.String(32), nullable=False),
            sa.Column("severity", sa.String(32), nullable=False),
            sa.Column("title", sa.String(240), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("context", JSONType, nullable=False),
            sa.Column("suggested_action", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # executive_board_reports — keying por id (uuid4().hex[:8])
    _mk(
        "executive_board_reports",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("year", sa.Integer(), nullable=False),
            sa.Column("quarter", sa.String(32), nullable=False),
            sa.Column("executive_summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("membership_analysis", sa.Text(), nullable=False, server_default=""),
            sa.Column("financial_performance", sa.Text(), nullable=False, server_default=""),
            sa.Column("operational_excellence", sa.Text(), nullable=False, server_default=""),
            sa.Column("member_satisfaction", sa.Text(), nullable=False, server_default=""),
            sa.Column("strategic_recommendations", JSONType, nullable=False),
            sa.Column("risk_assessment", JSONType, nullable=False),
            sa.Column("outlook", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # executive_risk_matrices — PERIOD es la pk (keying por período del
    # in-memory: create sobre período existente = overwrite completo)
    _mk(
        "executive_risk_matrices",
        [
            sa.Column("period", sa.String(64), primary_key=True),
            sa.Column("items", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # executive_exports — keying por id (uuid4().hex[:8])
    _mk(
        "executive_exports",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("report_type", sa.String(64), nullable=False, server_default=""),
            sa.Column("export_format", sa.String(32), nullable=False),
            sa.Column("audience", sa.String(32), nullable=False, server_default="internal"),
            sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("file_path", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )


def downgrade() -> None:
    for t in (
        "executive_exports",
        "executive_risk_matrices",
        "executive_board_reports",
        "executive_anomalies",
        "executive_summaries",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
