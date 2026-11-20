"""Ola 2.1-undécima — 8 tablas del dominio Proactive Recommendation.

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-20

Espejo 1:1 de db/orm/proactive_recommendation_orm.py
(ProactiveRecommendationORM · ProactivePredictionORM ·
ProactiveConflictORM · ProactiveSuggestionORM · ProactiveDraftORM ·
ProactivePricingORM · ProactiveClusterORM · ProactiveInsightORM) —
constraint names deterministas por la naming_convention de Base
(pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para los anexos del
agregado: listas (tags · factors · shared_resources · family_ids ·
shared_interests · key_achievements · areas_for_improvement ·
recommendations) y dicts (personalization_data · top_activities) —
mismo criterio que families §3.8-bis hasta executive_dashboard
§3.8-DÉCIMA.

OJO clusters: size es DERIVADO al crear (len(family_ids)) y
avg_engagement nace 0.0 — columnas normales, jamás recalculadas
stale (el repo nunca las muta después del create; mismo contrato
observable que el dict del in-memory).

OJO insights: status nace "proposed" LITERAL del create_* —
columna String(32) como el resto de los enums .value.

Sin índices: todos los reads del contrato cargan la tabla (chica) y
filtran en Python EXACTO como el in-memory iteraba .values() — mismo
orden de inserción, mismo contrato observable (criterio sin-índice
de communication §3.8-OCTAVA).

Sin tabla de dataset demo: el in-memory de proactive_recommendation
no tiene constantes de seed — los 8 dicts nacen vacíos y solo el
runtime del agente los puebla (mismo que executive_dashboard
§3.8-DÉCIMA).

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 10 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base


revision: str = "0011"
down_revision: str | None = "0010"
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
    """8 tablas del vertical proactive_recommendation."""
    # proactive_recommendations — id uuid4().hex[:8] del _gen_id
    _mk(
        "proactive_recommendations",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("family_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("recommendation_type", sa.String(32), nullable=False),
            sa.Column("title", sa.String(240), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("priority", sa.String(32), nullable=False, server_default="medium"),
            sa.Column("score", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reasoning", sa.Text(), nullable=False, server_default=""),
            sa.Column("tags", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_predictions — confidence enum .value
    _mk(
        "proactive_predictions",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("event_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("event_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("predicted_attendance", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("confidence", sa.String(32), nullable=False, server_default="medium"),
            sa.Column("factors", JSONType, nullable=False),
            sa.Column("similar_events_avg", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_conflicts — shared_resources JSONB
    _mk(
        "proactive_conflicts",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("event_a_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("event_a_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("event_b_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("event_b_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("conflict_type", sa.String(64), nullable=False, server_default=""),
            sa.Column("severity", sa.String(32), nullable=False, server_default="medium"),
            sa.Column("overlap_start", sa.Text(), nullable=False, server_default=""),
            sa.Column("overlap_end", sa.Text(), nullable=False, server_default=""),
            sa.Column("shared_resources", JSONType, nullable=False),
            sa.Column("suggestion", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_suggestions — bool + status enum .value
    _mk(
        "proactive_suggestions",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("target_demographic", sa.String(120), nullable=False, server_default=""),
            sa.Column("estimated_interest", sa.Float(), nullable=False, server_default="0"),
            sa.Column("estimated_cost", sa.Float(), nullable=False, server_default="0"),
            sa.Column("similar_clubs_offer", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("member_requests_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("tags", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_drafts — personalization_data JSONB
    _mk(
        "proactive_drafts",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("family_id", sa.String(16), nullable=False, server_default=""),
            sa.Column("channel", sa.String(32), nullable=False, server_default=""),
            sa.Column("subject", sa.String(240), nullable=False, server_default=""),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("tone", sa.String(32), nullable=False, server_default="friendly"),
            sa.Column("personalization_data", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_pricing — strategy enum .value
    _mk(
        "proactive_pricing",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("service_name", sa.String(240), nullable=False, server_default=""),
            sa.Column("current_price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("suggested_price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("strategy", sa.String(32), nullable=False, server_default="demand_based"),
            sa.Column("expected_revenue_change", sa.Float(), nullable=False, server_default="0"),
            sa.Column("expected_demand_change", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reasoning", sa.Text(), nullable=False, server_default=""),
            sa.Column("risk_level", sa.String(32), nullable=False, server_default="medium"),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_clusters — size derivado + family_ids JSONB
    _mk(
        "proactive_clusters",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(240), nullable=False, server_default=""),
            sa.Column("cluster_type", sa.String(32), nullable=False),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("family_ids", JSONType, nullable=False),
            sa.Column("size", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("avg_engagement", sa.Float(), nullable=False, server_default="0"),
            sa.Column("shared_interests", JSONType, nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    # proactive_insights — top_activities JSONB · status "proposed" literal
    _mk(
        "proactive_insights",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("year", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("period", sa.String(32), nullable=False),
            sa.Column("summary", sa.Text(), nullable=False, server_default=""),
            sa.Column("total_members_active", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("events_held", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("avg_event_attendance", sa.Float(), nullable=False, server_default="0"),
            sa.Column("revenue_total", sa.Float(), nullable=False, server_default="0"),
            sa.Column("top_activities", JSONType, nullable=False),
            sa.Column("member_satisfaction_avg", sa.Float(), nullable=False, server_default="0"),
            sa.Column("key_achievements", JSONType, nullable=False),
            sa.Column("areas_for_improvement", JSONType, nullable=False),
            sa.Column("recommendations", JSONType, nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("updated_at", sa.Text(), nullable=False, server_default=""),
        ],
    )


def downgrade() -> None:
    """8 tablas del vertical proactive_recommendation (down determinista)."""
    for t in (
        "proactive_insights",
        "proactive_clusters",
        "proactive_pricing",
        "proactive_drafts",
        "proactive_suggestions",
        "proactive_conflicts",
        "proactive_predictions",
        "proactive_recommendations",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
