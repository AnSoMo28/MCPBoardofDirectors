"""
Proactive recommendation repository.
In-memory store for recommendations, predictions, suggestions, and analytics.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from club_mcp.models.proactive_recommendation import (
    ActivitySuggestion,
    AttendancePrediction,
    ClusterType,
    CommunicationDraft,
    CreateActivitySuggestion,
    CreatePricingOptimization,
    CreateRecommendation,
    PricingOptimization,
    PredictionConfidence,
    QuarterlyInsights,
    Recommendation,
    SchedulingConflict,
    SocialCluster,
)

logger = logging.getLogger(__name__)


class ProactiveRecommendationRepository:
    def __init__(self) -> None:
        self._recommendations: dict[str, dict] = {}
        self._predictions: dict[str, dict] = {}
        self._conflicts: dict[str, dict] = {}
        self._suggestions: dict[str, dict] = {}
        self._drafts: dict[str, dict] = {}
        self._pricing: dict[str, dict] = {}
        self._clusters: dict[str, dict] = {}
        self._insights: dict[str, dict] = {}

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Recommendations ────────────────────────────────────

    async def create_recommendation(
        self, data: CreateRecommendation
    ) -> Recommendation:
        rec_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": rec_id,
            **data.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        self._recommendations[rec_id] = record
        logger.info(
            "[proactive_repo] Recommendation created: %s (%s)",
            data.title, rec_id,
        )
        return Recommendation(**record)

    async def get_recommendation(
        self, rec_id: str
    ) -> Optional[Recommendation]:
        record = self._recommendations.get(rec_id)
        if not record:
            return None
        return Recommendation(**record)

    async def list_recommendations(
        self,
        family_id: str = "",
        recommendation_type: str = "",
        priority: str = "",
    ) -> list[Recommendation]:
        results = list(self._recommendations.values())
        if family_id:
            results = [r for r in results if r["family_id"] == family_id]
        if recommendation_type:
            results = [
                r for r in results
                if r["recommendation_type"] == recommendation_type
            ]
        if priority:
            results = [r for r in results if r["priority"] == priority]
        results.sort(key=lambda r: r.get("score", 0), reverse=True)
        return [Recommendation(**r) for r in results]

    # ── Predictions ────────────────────────────────────────

    async def create_prediction(
        self,
        event_id: str,
        event_name: str,
        predicted_attendance: int,
        confidence: PredictionConfidence,
        factors: list[str],
        similar_events_avg: int = 0,
    ) -> AttendancePrediction:
        pred_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": pred_id,
            "event_id": event_id,
            "event_name": event_name,
            "predicted_attendance": predicted_attendance,
            "confidence": confidence.value,
            "factors": factors,
            "similar_events_avg": similar_events_avg,
            "created_at": now,
        }
        self._predictions[pred_id] = record
        return AttendancePrediction(**record)

    async def list_predictions(self) -> list[AttendancePrediction]:
        return [
            AttendancePrediction(**p)
            for p in self._predictions.values()
        ]

    # ── Conflicts ──────────────────────────────────────────

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
        conflict_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
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
        self._conflicts[conflict_id] = record
        return SchedulingConflict(**record)

    async def list_conflicts(
        self, severity: str = ""
    ) -> list[SchedulingConflict]:
        results = list(self._conflicts.values())
        if severity:
            results = [c for c in results if c["severity"] == severity]
        return [SchedulingConflict(**c) for c in results]

    # ── Activity Suggestions ───────────────────────────────

    async def create_suggestion(
        self, data: CreateActivitySuggestion
    ) -> ActivitySuggestion:
        sug_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": sug_id,
            **data.model_dump(),
            "status": "proposed",
            "created_at": now,
            "updated_at": now,
        }
        self._suggestions[sug_id] = record
        logger.info(
            "[proactive_repo] Suggestion created: %s (%s)",
            data.name, sug_id,
        )
        return ActivitySuggestion(**record)

    async def get_suggestion(
        self, sug_id: str
    ) -> Optional[ActivitySuggestion]:
        record = self._suggestions.get(sug_id)
        if not record:
            return None
        return ActivitySuggestion(**record)

    async def list_suggestions(
        self, status: str = ""
    ) -> list[ActivitySuggestion]:
        results = list(self._suggestions.values())
        if status:
            results = [s for s in results if s["status"] == status]
        return [ActivitySuggestion(**s) for s in results]

    async def update_suggestion(
        self, sug_id: str, updates: dict
    ) -> Optional[ActivitySuggestion]:
        record = self._suggestions.get(sug_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return ActivitySuggestion(**record)

    # ── Communication Drafts ───────────────────────────────

    async def create_draft(
        self,
        family_id: str,
        channel: str,
        subject: str,
        body: str,
        tone: str = "friendly",
        personalization_data: dict[str, Any] | None = None,
    ) -> CommunicationDraft:
        draft_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": draft_id,
            "family_id": family_id,
            "channel": channel,
            "subject": subject,
            "body": body,
            "tone": tone,
            "personalization_data": personalization_data or {},
            "created_at": now,
        }
        self._drafts[draft_id] = record
        return CommunicationDraft(**record)

    async def list_drafts(
        self, family_id: str = ""
    ) -> list[CommunicationDraft]:
        results = list(self._drafts.values())
        if family_id:
            results = [d for d in results if d["family_id"] == family_id]
        return [CommunicationDraft(**d) for d in results]

    # ── Pricing ────────────────────────────────────────────

    async def create_pricing(
        self, data: CreatePricingOptimization
    ) -> PricingOptimization:
        price_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": price_id,
            **data.model_dump(),
            "status": "proposed",
            "created_at": now,
            "updated_at": now,
        }
        self._pricing[price_id] = record
        logger.info(
            "[proactive_repo] Pricing optimization created: %s (%s)",
            data.service_name, price_id,
        )
        return PricingOptimization(**record)

    async def get_pricing(
        self, price_id: str
    ) -> Optional[PricingOptimization]:
        record = self._pricing.get(price_id)
        if not record:
            return None
        return PricingOptimization(**record)

    async def list_pricing(
        self, status: str = ""
    ) -> list[PricingOptimization]:
        results = list(self._pricing.values())
        if status:
            results = [p for p in results if p["status"] == status]
        return [PricingOptimization(**p) for p in results]

    async def update_pricing(
        self, price_id: str, updates: dict
    ) -> Optional[PricingOptimization]:
        record = self._pricing.get(price_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return PricingOptimization(**record)

    # ── Social Clusters ────────────────────────────────────

    async def create_cluster(
        self,
        name: str,
        cluster_type: ClusterType,
        description: str = "",
        family_ids: list[str] | None = None,
        shared_interests: list[str] | None = None,
    ) -> SocialCluster:
        cluster_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        fids = family_ids or []
        record = {
            "id": cluster_id,
            "name": name,
            "cluster_type": cluster_type.value,
            "description": description,
            "family_ids": fids,
            "size": len(fids),
            "avg_engagement": 0.0,
            "shared_interests": shared_interests or [],
            "created_at": now,
        }
        self._clusters[cluster_id] = record
        return SocialCluster(**record)

    async def list_clusters(
        self, cluster_type: str = ""
    ) -> list[SocialCluster]:
        results = list(self._clusters.values())
        if cluster_type:
            results = [
                c for c in results if c["cluster_type"] == cluster_type
            ]
        return [SocialCluster(**c) for c in results]

    # ── Quarterly Insights ─────────────────────────────────

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
        insight_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
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
        self._insights[insight_id] = record
        return QuarterlyInsights(**record)

    async def get_insights(
        self, insight_id: str
    ) -> Optional[QuarterlyInsights]:
        record = self._insights.get(insight_id)
        if not record:
            return None
        return QuarterlyInsights(**record)

    async def list_insights(
        self, year: int = 0, period: str = ""
    ) -> list[QuarterlyInsights]:
        results = list(self._insights.values())
        if year:
            results = [i for i in results if i["year"] == year]
        if period:
            results = [i for i in results if i["period"] == period]
        return [QuarterlyInsights(**i) for i in results]

    async def update_insights(
        self, insight_id: str, updates: dict
    ) -> Optional[QuarterlyInsights]:
        record = self._insights.get(insight_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return QuarterlyInsights(**record)
