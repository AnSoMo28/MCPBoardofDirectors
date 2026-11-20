"""ProactiveRecommendationRepository async — los 8 dicts se vuelven 8 tablas.

Ola 2.1-undécima (vertical proactive_recommendation). Contrato EXACTO
del módulo in-memory que reemplaza (club_mcp.db.repositories.
proactive_recommendation_repo) — mismos 23 métodos, mismas firmas,
mismos Pydantic de salida, mismo comportamiento de error (None /
lista vacía — el in-memory no define excepciones custom y el ORM
tampoco las inventa).

La undécima es async-FIRST como engagement/guest/satisfaction/
communication/cultural_social/executive_dashboard (drop-in total):
el in-memory ya es 23/23 async y el agente YA awaited sus 17 call
sites (verificado por grep — 0 privados tocados: contrato limpio).

Mismas decisiones que las 10 verticales (§3.8..§3.8-DÉCIMA): engine
por inyección · session_scope transaccional · devuelve Pydantic
(SQLAlchemy no sube) · ids de la MISMA forma que el in-memory
(uuid4().hex[:8] SIN prefijo, _gen_id).

Semántica literal del in-memory que se preserva:
  * create_recommendation(data: CreateRecommendation): record =
    {id: _gen_id, **data.model_dump(), created_at=now,
    updated_at=now} — INSERT por id; score/tags/priority vienen del
    Create schema (enums como .value en el dict plano).
  * list_recommendations(family_id="", recommendation_type="",
    priority=""): filtros por igualdad EN Python sobre la tabla
    completa (chica) — MISMO orden de inserción que iterar .values()
    del in-memory, y luego results.sort(key=score, reverse=True)
    (sort estable de Python: MISMO orden relativo en empates).
  * create_prediction/create_conflict/create_draft: kwargs planos
    → record con enums como .value (confidence/severity) y listas
    or [] (shared_resources/personalization_data or {}).
  * create_suggestion(data: CreateActivitySuggestion) /
    create_pricing(data: CreatePricingOptimization): igual que
    recommendations — **data.model_dump() + id + timestamps.
  * update_suggestion/update_pricing/update_insights(updates:
    dict): record.update(updates) del dict plano + updated_at=now —
    el ORM aplica setattr por clave de columna (_UPDATABLE, id
    intocable) + updated_at=now; clave desconocida: el dict del
    in-memory la guardaba (Pydantic la descartaba al reconstruir);
    el ORM la ignora — MISMO comportamiento observable.
  * create_cluster: family_ids or [] · size=len(family_ids)
    (DERIVADO al crear, jamás recalculado stale) ·
    avg_engagement=0.0 literal · cluster_type .value.
  * create_insights: status "proposed" LITERAL del in-memory (no
    el default del modelo) · top_activities or [] · period .value.
  * list_clusters(cluster_type="") / list_insights(year=0,
    period="") / list_predictions() / list_drafts(family_id=""):
    filtros por igualdad EN Python — MISMO orden de inserción.
  * get_*: None si no existe (sin excepciones).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.proactive_recommendation_orm import (
    ProactiveClusterORM,
    ProactiveConflictORM,
    ProactiveDraftORM,
    ProactiveInsightORM,
    ProactivePredictionORM,
    ProactivePricingORM,
    ProactiveRecommendationORM,
    ProactiveSuggestionORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.proactive_recommendation import (
    ActivitySuggestion,
    AttendancePrediction,
    ClusterType,
    CommunicationDraft,
    ConflictSeverity,
    CreateActivitySuggestion,
    CreatePricingOptimization,
    CreateRecommendation,
    InsightPeriod,
    PredictionConfidence,
    PricingOptimization,
    PricingStrategy,
    QuarterlyInsights,
    Recommendation,
    RecommendationPriority,
    RecommendationType,
    SchedulingConflict,
    SocialCluster,
    SuggestionStatus,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

logger = logging.getLogger(__name__)


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create_*)."""
    return datetime.now(tz=UTC).isoformat()


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _recommendation_from_orm(r: ProactiveRecommendationORM) -> Recommendation:
    return Recommendation(
        id=r.id,
        family_id=r.family_id,
        recommendation_type=RecommendationType(r.recommendation_type),
        title=r.title,
        description=r.description,
        priority=RecommendationPriority(r.priority),
        score=r.score,
        reasoning=r.reasoning,
        tags=list(r.tags or []),
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _prediction_from_orm(r: ProactivePredictionORM) -> AttendancePrediction:
    return AttendancePrediction(
        id=r.id,
        event_id=r.event_id,
        event_name=r.event_name,
        predicted_attendance=r.predicted_attendance,
        confidence=PredictionConfidence(r.confidence),
        factors=list(r.factors or []),
        similar_events_avg=r.similar_events_avg,
        created_at=r.created_at,
    )


def _conflict_from_orm(r: ProactiveConflictORM) -> SchedulingConflict:
    return SchedulingConflict(
        id=r.id,
        event_a_id=r.event_a_id,
        event_a_name=r.event_a_name,
        event_b_id=r.event_b_id,
        event_b_name=r.event_b_name,
        conflict_type=r.conflict_type,
        severity=ConflictSeverity(r.severity),
        overlap_start=r.overlap_start,
        overlap_end=r.overlap_end,
        shared_resources=list(r.shared_resources or []),
        suggestion=r.suggestion,
        created_at=r.created_at,
    )


def _suggestion_from_orm(r: ProactiveSuggestionORM) -> ActivitySuggestion:
    return ActivitySuggestion(
        id=r.id,
        name=r.name,
        description=r.description,
        target_demographic=r.target_demographic,
        estimated_interest=r.estimated_interest,
        estimated_cost=r.estimated_cost,
        similar_clubs_offer=r.similar_clubs_offer,
        member_requests_count=r.member_requests_count,
        status=SuggestionStatus(r.status),
        tags=list(r.tags or []),
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _draft_from_orm(r: ProactiveDraftORM) -> CommunicationDraft:
    return CommunicationDraft(
        id=r.id,
        family_id=r.family_id,
        channel=r.channel,
        subject=r.subject,
        body=r.body,
        tone=r.tone,
        personalization_data=dict(r.personalization_data or {}),
        created_at=r.created_at,
    )


def _pricing_from_orm(r: ProactivePricingORM) -> PricingOptimization:
    return PricingOptimization(
        id=r.id,
        service_name=r.service_name,
        current_price=r.current_price,
        suggested_price=r.suggested_price,
        strategy=PricingStrategy(r.strategy),
        expected_revenue_change=r.expected_revenue_change,
        expected_demand_change=r.expected_demand_change,
        reasoning=r.reasoning,
        risk_level=r.risk_level,
        status=SuggestionStatus(r.status),
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _cluster_from_orm(r: ProactiveClusterORM) -> SocialCluster:
    return SocialCluster(
        id=r.id,
        name=r.name,
        cluster_type=ClusterType(r.cluster_type),
        description=r.description,
        family_ids=list(r.family_ids or []),
        size=r.size,
        avg_engagement=r.avg_engagement,
        shared_interests=list(r.shared_interests or []),
        created_at=r.created_at,
    )


def _insight_from_orm(r: ProactiveInsightORM) -> QuarterlyInsights:
    return QuarterlyInsights(
        id=r.id,
        year=r.year,
        period=InsightPeriod(r.period),
        summary=r.summary,
        total_members_active=r.total_members_active,
        events_held=r.events_held,
        avg_event_attendance=r.avg_event_attendance,
        revenue_total=r.revenue_total,
        top_activities=list(r.top_activities or []),
        member_satisfaction_avg=r.member_satisfaction_avg,
        key_achievements=list(r.key_achievements or []),
        areas_for_improvement=list(r.areas_for_improvement or []),
        recommendations=list(r.recommendations or []),
        status=SuggestionStatus(r.status),
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


# ── updates dict (semántica record.update del in-memory) ──

_UPDATABLE: dict[str, set[str]] = {
    "suggestion": {
        "name", "description", "target_demographic", "estimated_interest",
        "estimated_cost", "similar_clubs_offer", "member_requests_count",
        "status", "tags", "created_at", "updated_at",
    },
    "pricing": {
        "service_name", "current_price", "suggested_price", "strategy",
        "expected_revenue_change", "expected_demand_change", "reasoning",
        "risk_level", "status", "created_at", "updated_at",
    },
    "insights": {
        "year", "period", "summary", "total_members_active", "events_held",
        "avg_event_attendance", "revenue_total", "top_activities",
        "member_satisfaction_avg", "key_achievements",
        "areas_for_improvement", "recommendations", "status",
        "created_at", "updated_at",
    },
}


def _apply_updates(obj: Any, updates: dict[str, Any], key: str) -> None:
    """record.update(updates) del in-memory — setattr por clave de columna.

    Las claves que no calzan con una columna se ignoran (el dict del
    in-memory las guardaba pero Pydantic las descartaba al reconstruir:
    mismo comportamiento observable). id no se toca nunca.
    """
    allowed = _UPDATABLE[key]
    for k, v in (updates or {}).items():
        if k in allowed:
            setattr(obj, k, v)


async def _load_all(s: AsyncSession, cls: type[Any]) -> list[Any]:
    return list((await s.execute(select(cls))).scalars().all())


class ProactiveRecommendationRepository:
    """Repo ORM async — contrato EXACTO del in-memory (23 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Recommendations ─────────────────────────────────────────

    async def create_recommendation(
        self, data: CreateRecommendation
    ) -> Recommendation:
        rec_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": rec_id,
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveRecommendationORM(
                    id=rec_id,
                    family_id=record["family_id"],
                    recommendation_type=record["recommendation_type"],
                    title=record["title"],
                    description=record["description"],
                    priority=record["priority"],
                    score=record["score"],
                    reasoning=record["reasoning"],
                    tags=record["tags"],
                    created_at=now,
                    updated_at=now,
                )
            )
        logger.info(
            "[proactive_repo] Recommendation created: %s (%s)",
            data.title, rec_id,
        )
        return Recommendation(**record)

    async def get_recommendation(
        self, rec_id: str
    ) -> Recommendation | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactiveRecommendationORM, rec_id)
            if r is None:
                return None
            return _recommendation_from_orm(r)

    async def list_recommendations(
        self,
        family_id: str = "",
        recommendation_type: str = "",
        priority: str = "",
    ) -> list[Recommendation]:
        # ojo: el orden de inserción ES el orden del dict in-memory
        # y el sort por score (estable) va DESPUÉS de los filtros.
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveRecommendationORM)
        results: list[dict[str, Any]] = []
        for r in rows:
            rec = {
                "id": r.id,
                "family_id": r.family_id,
                "recommendation_type": r.recommendation_type,
                "title": r.title,
                "description": r.description,
                "priority": r.priority,
                "score": r.score,
                "reasoning": r.reasoning,
                "tags": list(r.tags or []),
                "created_at": r.created_at,
                "updated_at": r.updated_at,
            }
            if family_id and rec["family_id"] != family_id:
                continue
            if recommendation_type and rec["recommendation_type"] != recommendation_type:
                continue
            if priority and rec["priority"] != priority:
                continue
            results.append(rec)
        results.sort(key=lambda rec: rec.get("score", 0), reverse=True)
        return [Recommendation(**rec) for rec in results]

    # ── Predictions ─────────────────────────────────────────────

    async def create_prediction(
        self,
        event_id: str,
        event_name: str,
        predicted_attendance: int,
        confidence: PredictionConfidence,
        factors: list[str],
        similar_events_avg: int = 0,
    ) -> AttendancePrediction:
        pred_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": pred_id,
            "event_id": event_id,
            "event_name": event_name,
            "predicted_attendance": predicted_attendance,
            "confidence": _enum_val(confidence),
            "factors": factors,
            "similar_events_avg": similar_events_avg,
            "created_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactivePredictionORM(
                    id=pred_id,
                    event_id=event_id,
                    event_name=event_name,
                    predicted_attendance=predicted_attendance,
                    confidence=record["confidence"],
                    factors=factors,
                    similar_events_avg=similar_events_avg,
                    created_at=now,
                )
            )
        return AttendancePrediction(**record)

    async def list_predictions(self) -> list[AttendancePrediction]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactivePredictionORM)
        return [_prediction_from_orm(r) for r in rows]

    # ── Conflicts ───────────────────────────────────────────────

    async def create_conflict(
        self,
        event_a_id: str,
        event_a_name: str,
        event_b_id: str,
        event_b_name: str,
        conflict_type: str,
        severity: str,
        overlap_start: str = "",
        overlap_end: str = "",
        shared_resources: list[str] | None = None,
        suggestion: str = "",
    ) -> SchedulingConflict:
        conflict_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": conflict_id,
            "event_a_id": event_a_id,
            "event_a_name": event_a_name,
            "event_b_id": event_b_id,
            "event_b_name": event_b_name,
            "conflict_type": conflict_type,
            "severity": severity,
            "overlap_start": overlap_start,
            "overlap_end": overlap_end,
            "shared_resources": shared_resources or [],
            "suggestion": suggestion,
            "created_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveConflictORM(
                    id=conflict_id,
                    event_a_id=event_a_id,
                    event_a_name=event_a_name,
                    event_b_id=event_b_id,
                    event_b_name=event_b_name,
                    conflict_type=conflict_type,
                    severity=severity,
                    overlap_start=overlap_start,
                    overlap_end=overlap_end,
                    shared_resources=shared_resources or [],
                    suggestion=suggestion,
                    created_at=now,
                )
            )
        return SchedulingConflict(**record)

    async def list_conflicts(
        self, severity: str = ""
    ) -> list[SchedulingConflict]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveConflictORM)
        results = [_conflict_from_orm(r) for r in rows]
        if severity:
            results = [c for c in results if c.severity.value == severity]
        return results

    # ── Suggestions ─────────────────────────────────────────────

    async def create_suggestion(
        self, data: CreateActivitySuggestion
    ) -> ActivitySuggestion:
        sug_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": sug_id,
            **data.model_dump(),
            "status": "proposed",
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveSuggestionORM(
                    id=sug_id,
                    name=record["name"],
                    description=record["description"],
                    target_demographic=record["target_demographic"],
                    estimated_interest=record["estimated_interest"],
                    estimated_cost=record["estimated_cost"],
                    similar_clubs_offer=record["similar_clubs_offer"],
                    member_requests_count=record["member_requests_count"],
                    status="proposed",
                    tags=record["tags"],
                    created_at=now,
                    updated_at=now,
                )
            )
        return ActivitySuggestion(**record)

    async def get_suggestion(
        self, sug_id: str
    ) -> ActivitySuggestion | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactiveSuggestionORM, sug_id)
            if r is None:
                return None
            return _suggestion_from_orm(r)

    async def list_suggestions(
        self, status: str = ""
    ) -> list[ActivitySuggestion]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveSuggestionORM)
        results = [_suggestion_from_orm(r) for r in rows]
        if status:
            results = [sg for sg in results if sg.status.value == status]
        return results

    async def update_suggestion(
        self, sug_id: str, updates: dict[str, Any]
    ) -> ActivitySuggestion | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactiveSuggestionORM, sug_id)
            if r is None:
                return None
            _apply_updates(r, updates, "suggestion")
            r.updated_at = _utcnow_iso()
            result = _suggestion_from_orm(r)
        return result

    # ── Communication Drafts ────────────────────────────────────

    async def create_draft(
        self,
        family_id: str,
        channel: str,
        subject: str,
        body: str,
        tone: str = "friendly",
        personalization_data: dict[str, Any] | None = None,
    ) -> CommunicationDraft:
        draft_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": draft_id,
            "family_id": family_id,
            "channel": channel,
            "subject": subject,
            "body": body,
            "tone": tone,
            "personalization_data": personalization_data or {},
            "created_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveDraftORM(
                    id=draft_id,
                    family_id=family_id,
                    channel=channel,
                    subject=subject,
                    body=body,
                    tone=tone,
                    personalization_data=personalization_data or {},
                    created_at=now,
                )
            )
        return CommunicationDraft(**record)

    async def list_drafts(
        self, family_id: str = ""
    ) -> list[CommunicationDraft]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveDraftORM)
        results = [_draft_from_orm(r) for r in rows]
        if family_id:
            results = [d for d in results if d.family_id == family_id]
        return results

    # ── Pricing Optimization ────────────────────────────────────

    async def create_pricing(
        self, data: CreatePricingOptimization
    ) -> PricingOptimization:
        price_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": price_id,
            **data.model_dump(),
            "status": "proposed",
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactivePricingORM(
                    id=price_id,
                    service_name=record["service_name"],
                    current_price=record["current_price"],
                    suggested_price=record["suggested_price"],
                    strategy=record["strategy"],
                    expected_revenue_change=record["expected_revenue_change"],
                    expected_demand_change=record["expected_demand_change"],
                    reasoning=record["reasoning"],
                    risk_level=record["risk_level"],
                    status="proposed",
                    created_at=now,
                    updated_at=now,
                )
            )
        return PricingOptimization(**record)

    async def get_pricing(
        self, price_id: str
    ) -> PricingOptimization | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactivePricingORM, price_id)
            if r is None:
                return None
            return _pricing_from_orm(r)

    async def list_pricing(
        self, status: str = ""
    ) -> list[PricingOptimization]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactivePricingORM)
        results = [_pricing_from_orm(r) for r in rows]
        if status:
            results = [p for p in results if p.status.value == status]
        return results

    async def update_pricing(
        self, price_id: str, updates: dict[str, Any]
    ) -> PricingOptimization | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactivePricingORM, price_id)
            if r is None:
                return None
            _apply_updates(r, updates, "pricing")
            r.updated_at = _utcnow_iso()
            result = _pricing_from_orm(r)
        return result

    # ── Social Clusters ─────────────────────────────────────────

    async def create_cluster(
        self,
        name: str,
        cluster_type: ClusterType,
        description: str = "",
        family_ids: list[str] | None = None,
        shared_interests: list[str] | None = None,
    ) -> SocialCluster:
        cluster_id = _gen_id()
        now = _utcnow_iso()
        fids = family_ids or []
        record: dict[str, Any] = {
            "id": cluster_id,
            "name": name,
            "cluster_type": _enum_val(cluster_type),
            "description": description,
            "family_ids": fids,
            "size": len(fids),
            "avg_engagement": 0.0,
            "shared_interests": shared_interests or [],
            "created_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveClusterORM(
                    id=cluster_id,
                    name=name,
                    cluster_type=record["cluster_type"],
                    description=description,
                    family_ids=fids,
                    size=len(fids),
                    avg_engagement=0.0,
                    shared_interests=shared_interests or [],
                    created_at=now,
                )
            )
        return SocialCluster(**record)

    async def list_clusters(
        self, cluster_type: str = ""
    ) -> list[SocialCluster]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveClusterORM)
        results = [_cluster_from_orm(r) for r in rows]
        if cluster_type:
            results = [c for c in results if c.cluster_type.value == cluster_type]
        return results

    # ── Quarterly Insights ─────────────────────────────────────

    async def create_insights(
        self,
        year: int,
        period: str,
        summary: str = "",
        total_members_active: int = 0,
        events_held: int = 0,
        avg_event_attendance: float = 0.0,
        revenue_total: float = 0.0,
        top_activities: list[dict[str, Any]] | None = None,
        member_satisfaction_avg: float = 0.0,
        key_achievements: list[str] | None = None,
        areas_for_improvement: list[str] | None = None,
        recommendations: list[str] | None = None,
    ) -> QuarterlyInsights:
        insight_id = _gen_id()
        now = _utcnow_iso()
        record: dict[str, Any] = {
            "id": insight_id,
            "year": year,
            "period": period,
            "summary": summary,
            "total_members_active": total_members_active,
            "events_held": events_held,
            "avg_event_attendance": avg_event_attendance,
            "revenue_total": revenue_total,
            "top_activities": top_activities or [],
            "member_satisfaction_avg": member_satisfaction_avg,
            "key_achievements": key_achievements or [],
            "areas_for_improvement": areas_for_improvement or [],
            "recommendations": recommendations or [],
            "status": "proposed",
            "created_at": now,
            "updated_at": now,
        }
        async with session_scope(self._engine) as s:
            s.add(
                ProactiveInsightORM(
                    id=insight_id,
                    year=year,
                    period=period,
                    summary=summary,
                    total_members_active=total_members_active,
                    events_held=events_held,
                    avg_event_attendance=avg_event_attendance,
                    revenue_total=revenue_total,
                    top_activities=top_activities or [],
                    member_satisfaction_avg=member_satisfaction_avg,
                    key_achievements=key_achievements or [],
                    areas_for_improvement=areas_for_improvement or [],
                    recommendations=recommendations or [],
                    status="proposed",
                    created_at=now,
                    updated_at=now,
                )
            )
        return QuarterlyInsights(**record)

    async def get_insights(
        self, insight_id: str
    ) -> QuarterlyInsights | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactiveInsightORM, insight_id)
            if r is None:
                return None
            return _insight_from_orm(r)

    async def list_insights(
        self, year: int = 0, period: str = ""
    ) -> list[QuarterlyInsights]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ProactiveInsightORM)
        results = [_insight_from_orm(r) for r in rows]
        if year:
            results = [i for i in results if i.year == year]
        if period:
            results = [i for i in results if i.period.value == period]
        return results

    async def update_insights(
        self, insight_id: str, updates: dict[str, Any]
    ) -> QuarterlyInsights | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ProactiveInsightORM, insight_id)
            if r is None:
                return None
            _apply_updates(r, updates, "insights")
            r.updated_at = _utcnow_iso()
            result = _insight_from_orm(r)
        return result
