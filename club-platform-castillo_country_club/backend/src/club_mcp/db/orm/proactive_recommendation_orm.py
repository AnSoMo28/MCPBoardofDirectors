"""Tablas del dominio Proactive Recommendation — Ola 2.1-undécima.

Espejo 1:1 de club_mcp.models.proactive_recommendation (Pydantic).
Las 8 entidades del repo in-memory (verificar contra
proactive_recommendation_repo.py):

    _recommendations: dict[str, dict] → proactive_recommendations
    _predictions:     dict[str, dict] → proactive_predictions
    _conflicts:       dict[str, dict] → proactive_conflicts
    _suggestions:     dict[str, dict] → proactive_suggestions
    _drafts:          dict[str, dict] → proactive_drafts
    _pricing:         dict[str, dict] → proactive_pricing
    _clusters:        dict[str, dict] → proactive_clusters
    _insights:        dict[str, dict] → proactive_insights

Los enums del dominio (RecommendationType · RecommendationPriority ·
PredictionConfidence · ConflictSeverity · SuggestionStatus ·
PricingStrategy · InsightPeriod · ClusterType) NO son constraint
CHECK: el repo guarda .value en String(32) y reconstruye el Pydantic
enum al leer — el contrato del agente pasa enums; un CHECK duplicaría
la validación que Pydantic ya hace en el borde (mismo estilo que las
10 verticales previas §3.8..§3.8-DÉCIMA).

Las listas (tags · factors · shared_resources · family_ids ·
shared_interests · key_achievements · areas_for_improvement ·
recommendations) y los dicts (personalization_data ·
top_activities) van a JSONB por fila: anexos del agregado, no
entidades con identity propia — mismo criterio que families
(§3.8-bis) hasta executive_dashboard (§3.8-DÉCIMA).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo (_gen_id
staticmethod) para TODAS las entidades; el repo ORM reproduce la
MISMA forma. Sin excepciones custom (el in-memory devuelve None /
listas vacías; el ORM idéntico).

created_at / updated_at: el in-memory persiste ISO strings
(datetime.now(tz=UTC).isoformat() en create) — columnas Text que
guardan el MISMO string; roundtrip pérdida cero.

OJO clusters: "size" es DERIVADO (len(family_ids) al crear) y
"avg_engagement" nace 0.0 — el in-memory los guarda en el dict; el
ORM los guarda como columnas normales (mismo contrato observable:
nunca se recalculan stale, el repo nunca los muta después del
create).

OJO insights: "status" nace "proposed" literal del create_*
(in-memory); SuggestionStatus default del modelo es PROPOSED — el
ORM guarda .value String(32) como el resto.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis, satisfaction §3.8-SEPTIMA,
# communication §3.8-OCTAVA y executive_dashboard §3.8-DÉCIMA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class ProactiveRecommendationORM(Base):
    """Recomendación — espejo de Recommendation (Pydantic)."""

    __tablename__ = "proactive_recommendations"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    recommendation_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    priority: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactivePredictionORM(Base):
    """Predicción de asistencia — espejo de AttendancePrediction."""

    __tablename__ = "proactive_predictions"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    event_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    predicted_attendance: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    factors: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    similar_events_avg: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactiveConflictORM(Base):
    """Conflicto de agenda — espejo de SchedulingConflict."""

    __tablename__ = "proactive_conflicts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    event_a_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    event_a_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    event_b_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    event_b_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    conflict_type: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    severity: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    overlap_start: Mapped[str] = mapped_column(Text, nullable=False, default="")
    overlap_end: Mapped[str] = mapped_column(Text, nullable=False, default="")
    shared_resources: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    suggestion: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactiveSuggestionORM(Base):
    """Sugerencia de actividad — espejo de ActivitySuggestion."""

    __tablename__ = "proactive_suggestions"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_demographic: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    estimated_interest: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_cost: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    similar_clubs_offer: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    member_requests_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactiveDraftORM(Base):
    """Draft de comunicación — espejo de CommunicationDraft."""

    __tablename__ = "proactive_drafts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    family_id: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    subject: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tone: Mapped[str] = mapped_column(String(32), nullable=False, default="friendly")
    personalization_data: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactivePricingORM(Base):
    """Optimización de precio — espejo de PricingOptimization."""

    __tablename__ = "proactive_pricing"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    service_name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    current_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    suggested_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    strategy: Mapped[str] = mapped_column(String(32), nullable=False, default="demand_based")
    expected_revenue_change: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    expected_demand_change: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    reasoning: Mapped[str] = mapped_column(Text, nullable=False, default="")
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactiveClusterORM(Base):
    """Cluster social — espejo de SocialCluster."""

    __tablename__ = "proactive_clusters"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    cluster_type: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    family_ids: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_engagement: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    shared_interests: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ProactiveInsightORM(Base):
    """Insights trimestrales — espejo de QuarterlyInsights."""

    __tablename__ = "proactive_insights"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    period: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    total_members_active: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    events_held: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_event_attendance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    revenue_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    top_activities: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    member_satisfaction_avg: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    key_achievements: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    areas_for_improvement: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    recommendations: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="proposed")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    updated_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
