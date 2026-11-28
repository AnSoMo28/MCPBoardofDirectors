"""Ola 2.1-septima — 3 tablas del dominio Satisfaction.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-20

Espejo 1:1 de db/orm/satisfaction_orm.py (SatisfactionSurveyORM ·
EventSatisfactionReportORM · SatisfactionEventMetadataORM) — constraint
names deterministas por la naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para
satisfaction_surveys.questions (list[SurveyQuestion]) y los 4 JSONB del
report (category_averages · sentiment_distribution · top_praises ·
top_improvements · ai_recommendations · key_quotes): anexos del
agregado, no entidades con identity propia (mismo criterio que
families.activities §3.8-bis, engagement.favorite_activities §3.8-tris
y guests.privileges §3.8-SEXTA).

satisfaction_event_metadata: el in-memory la poblaba como constante de
seed (_seed_event_metadata, 12 eventos) que solo existía con
seed_demo_data=True (el runtime nunca la activa); tabla para que el
deploy cargue el dataset (criterio 0011: dataset demo UNA fuente) y
response_rate / best_event / worst_event / P3-SURVEY_FOLLOW_UP lean de
la base.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente (21
tests) pasa enums por survey; un CHECK duplicaría la validación que
Pydantic ya hace en el borde (mismo estilo que las 6 verticales
previas).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "satisfaction_surveys",
        sa.Column("survey_id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("survey_id", name="pk_satisfaction_surveys"),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("family_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("event_name", sa.String(length=200), nullable=False),
        sa.Column("event_date", sa.String(length=10), nullable=False),
        sa.Column("questions", _jsonb(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("ai_assisted_comment", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("sentiment", sa.String(length=16), nullable=False),
        sa.Column("sentiment_score", sa.Float(), nullable=False),
    )
    op.create_index(
        "ix_satisfaction_surveys_event_id",
        "satisfaction_surveys",
        ["event_id"],
    )
    op.create_index(
        "ix_satisfaction_surveys_family_id",
        "satisfaction_surveys",
        ["family_id"],
    )
    op.create_table(
        "satisfaction_reports",
        sa.Column("report_id", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("report_id", name="pk_satisfaction_reports"),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("event_name", sa.String(length=200), nullable=False),
        sa.Column("total_responses", sa.Integer(), nullable=False),
        sa.Column("response_rate_pct", sa.Float(), nullable=False),
        sa.Column("overall_avg", sa.Float(), nullable=False),
        sa.Column("category_averages", _jsonb(), nullable=False),
        sa.Column("sentiment_distribution", _jsonb(), nullable=False),
        sa.Column("sentiment_trend", sa.String(length=24), nullable=False),
        sa.Column("top_praises", _jsonb(), nullable=False),
        sa.Column("top_improvements", _jsonb(), nullable=False),
        sa.Column("ai_recommendations", _jsonb(), nullable=False),
        sa.Column("key_quotes", _jsonb(), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_satisfaction_reports_event_id",
        "satisfaction_reports",
        ["event_id"],
    )
    op.create_table(
        "satisfaction_event_metadata",
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("event_id", name="pk_satisfaction_event_metadata"),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("date", sa.String(length=10), nullable=False),
        sa.Column("attendees", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("satisfaction_event_metadata")
    op.drop_index("ix_satisfaction_reports_event_id", table_name="satisfaction_reports")
    op.drop_table("satisfaction_reports")
    op.drop_index("ix_satisfaction_surveys_family_id", table_name="satisfaction_surveys")
    op.drop_index("ix_satisfaction_surveys_event_id", table_name="satisfaction_surveys")
    op.drop_table("satisfaction_surveys")
