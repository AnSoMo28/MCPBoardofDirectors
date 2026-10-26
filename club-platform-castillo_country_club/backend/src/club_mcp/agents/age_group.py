"""AgeGroupAgent — Generational Intelligence for Castillo Country Club.

11 tools covering:
  - 7 data/mutation tools (upgraded from original)
  - 4 intelligence tools (new: health, analytics, forecast, proposals)

Cross-domain signals: emits to communication, member_360, events, satisfaction.
"""

from __future__ import annotations

import logging
from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.age_group_repo import AgeGroupRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.age_group_activity import (
    AgeGroupActivityCreate,
    AgeGroupActivityStatus,
    AgeGroupCategory,
)

logger = logging.getLogger(__name__)


class AgeGroupAgent(BaseAgent):
    """Agente de inteligencia generacional del Castillo Country Club.

    Gestiona actividades por grupo etario, analiza balance demográfico,
    predice demanda, y genera propuestas de engagement cross-domain.
    """

    agent_name = "age_group"
    description = (
        "Inteligencia generacional — actividades, balance demográfico, "
        "predicciones y engagement por grupo etario"
    )

    def __init__(
        self,
        age_group_repo: AgeGroupRepository | None = None,
        approval_engine: Any = None,
        notifier: Any = None,
    ) -> None:
        super().__init__()
        self.repo = age_group_repo or AgeGroupRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # ═══════════════════════════════════════════════════
    # 🟢 DATA TOOLS (upgraded from original)
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 1: age_group_list  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_list",
        "Listar todos los grupos etarios con conteo de miembros, "
        "actividades y balance demográfico.",
        approval=ApprovalLevel.AUTO,
    )
    async def age_group_list(self) -> dict[str, Any]:
        """List all age groups with member counts, activity counts,
        and balance status."""
        groups = await self.repo.list_age_groups()
        distribution = self.repo._compute_distribution()
        total_members = sum(g.member_count for g in groups)
        total_activities = sum(g.activity_count for g in groups)

        balance_map = {
            d.age_group: d.balance_status.value
            for d in distribution
        }

        enriched = []
        for g in groups:
            enriched.append(
                {
                    **g.model_dump(mode="json"),
                    "balance_status": balance_map.get(
                        g.age_group, "balanced"
                    ),
                }
            )

        return {
            "status": "success",
            "message": (
                f"👨‍👩‍👧‍👦 {total_members} miembros en "
                f"{len(groups)} grupos etarios, "
                f"{total_activities} actividades. "
                f"Distribución: "
                f"{sum(1 for d in distribution if d.balance_status.value == 'balanced')}/6 equilibrados."
            ),
            "data": enriched,
            "total_groups": len(groups),
            "total_members": total_members,
            "total_activities": total_activities,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: age_group_get_activities  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_get_activities",
        "Obtener actividades disponibles para un grupo etario "
        "específico con métricas de enrollment.",
        approval=ApprovalLevel.AUTO,
    )
    async def age_group_get_activities(
        self,
        age_group: str,
        active_only: bool = True,
    ) -> dict[str, Any]:
        """Get available activities for a specific age group
        with enrollment metrics."""
        try:
            AgeGroupCategory(age_group)
        except ValueError:
            valid = ", ".join(c.value for c in AgeGroupCategory)
            return {
                "status": "error",
                "message": (
                    f"Grupo etario '{age_group}' no válido. "
                    f"Opciones: {valid}"
                ),
            }

        status = "active" if active_only else None
        activities = await self.repo.list_activities(
            age_group=age_group, status=status
        )

        enriched = []
        for act in activities:
            enrollments = self.repo._enrollment.get(act.id, [])
            active_enr = [
                e for e in enrollments if e["status"] == "active"
            ]
            enrolled = len(active_enr)
            capacity = act.max_participants
            utilization = (
                round(enrolled / capacity * 100, 1)
                if capacity > 0
                else 0.0
            )
            avg_sat = (
                round(
                    sum(e["satisfaction"] for e in active_enr)
                    / len(active_enr),
                    1,
                )
                if active_enr
                else 0.0
            )
            enriched.append(
                {
                    **act.model_dump(mode="json"),
                    "enrolled": enrolled,
                    "utilization_pct": utilization,
                    "avg_satisfaction": avg_sat,
                }
            )

        return {
            "status": "success",
            "message": (
                f"🎯 {len(activities)} actividades para "
                f"'{age_group}'"
                f"{' (solo activas)' if active_only else ''}."
            ),
            "data": enriched,
            "total": len(activities),
            "age_group": age_group,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 3: age_group_register_activity  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_register_activity",
        "Registrar una nueva actividad para un grupo etario. "
        "Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def age_group_register_activity(
        self,
        activity_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Register a new activity for an age group (HITL)."""
        try:
            validated = AgeGroupActivityCreate(**activity_data)
        except Exception as exc:
            return {
                "status": "error",
                "message": (
                    f"Datos de actividad inválidos: {exc}"
                ),
            }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="age_group_register_activity",
            params={
                "activity_data": validated.model_dump(
                    mode="json"
                )
            },
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        logger.info(
            "[age_group] Activity registration request: %s "
            "for %s",
            validated.name,
            validated.age_group.value,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'🎯 Actividad "{validated.name}" para '
                f"{validated.age_group.value} registrada. "
                f"Pendiente de aprobación."
            ),
            "request_id": str(request.request_id),
            "activity_name": validated.name,
            "age_group": validated.age_group.value,
        }

    async def execute_register_activity(
        self, activity_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute activity registration post-approval."""
        validated = AgeGroupActivityCreate(**activity_data)
        activity = await self.repo.create_activity(validated)

        logger.info(
            "[age_group] Activity created: %s (%s)",
            activity.name,
            activity.id,
        )

        return {
            "status": "success",
            "message": (
                f'✨ Actividad "{activity.name}" creada para '
                f"{activity.age_group}. Ya está disponible."
            ),
            "data": activity.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 4: age_group_get_demographics  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_get_demographics",
        "Obtener estadísticas demográficas con análisis de balance.",
        approval=ApprovalLevel.AUTO,
    )
    async def age_group_get_demographics(
        self,
        age_group: str | None = None,
    ) -> dict[str, Any]:
        """Get demographics breakdown with balance analysis."""
        if age_group:
            try:
                AgeGroupCategory(age_group)
            except ValueError:
                valid = ", ".join(
                    c.value for c in AgeGroupCategory
                )
                return {
                    "status": "error",
                    "message": (
                        f"Grupo etario no válido: "
                        f"{age_group}. Opciones: {valid}"
                    ),
                }

        demographics = await self.repo.get_demographics(
            age_group
        )
        distribution = self.repo._compute_distribution()
        total = sum(d.total_members for d in demographics)

        balance_map = {
            d.age_group: d.balance_status.value
            for d in distribution
        }

        enriched = []
        for d in demographics:
            enriched.append(
                {
                    **d.model_dump(mode="json"),
                    "balance_status": balance_map.get(
                        d.age_group, "balanced"
                    ),
                }
            )

        over = sum(
            1
            for d in distribution
            if d.balance_status.value == "overrepresented"
        )
        under = sum(
            1
            for d in distribution
            if d.balance_status.value == "underrepresented"
        )

        return {
            "status": "success",
            "message": (
                f"📊 Demografía: {total} miembros en "
                f"{len(demographics)} grupo(s). "
                f"{over} sobre-representado(s), "
                f"{under} bajo-representado(s)."
            ),
            "data": enriched,
            "total_members": total,
            "balance_summary": {
                "overrepresented": over,
                "balanced": len(distribution) - over - under,
                "underrepresented": under,
            },
        }

    # ─────────────────────────────────────────────────────────
    # Tool 5: age_group_get_participation  🟢 AUTO (upgraded)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_get_participation",
        "Obtener métricas de participación con tendencias "
        "y benchmark vs promedio del club.",
        approval=ApprovalLevel.AUTO,
    )
    async def age_group_get_participation(
        self,
        age_group: str | None = None,
    ) -> dict[str, Any]:
        """Get participation metrics with trends and benchmarks."""
        if age_group:
            try:
                AgeGroupCategory(age_group)
            except ValueError:
                valid = ", ".join(
                    c.value for c in AgeGroupCategory
                )
                return {
                    "status": "error",
                    "message": (
                        f"Grupo etario no válido: "
                        f"{age_group}. Opciones: {valid}"
                    ),
                }

        participation = await self.repo.get_participation(
            age_group
        )
        trends = await self.repo.get_participation_trends(
            months=3
        )

        total_enrolled = sum(
            p.total_enrolled for p in participation
        )
        all_sat = [
            p.satisfaction_score
            for p in participation
            if p.satisfaction_score > 0
        ]
        avg_satisfaction = (
            round(sum(all_sat) / len(all_sat), 1)
            if all_sat
            else 0.0
        )

        # Benchmark per group
        group_metrics: dict[str, dict[str, float]] = {}
        for p in participation:
            gm = group_metrics.setdefault(
                p.age_group,
                {"sat_sum": 0, "count": 0, "enrolled": 0},
            )
            gm["sat_sum"] += p.satisfaction_score
            gm["count"] += 1
            gm["enrolled"] += p.total_enrolled

        # Compute trend per group from monthly snapshots
        sorted_m = sorted(self.repo._monthly_snapshots.keys())
        group_trends: dict[str, str] = {}
        if len(sorted_m) >= 2:
            last2 = sorted_m[-2:]
            for ag in AgeGroupCategory:
                gv = ag.value
                v1 = (
                    self.repo._monthly_snapshots[last2[0]]
                    .get(gv, {})
                    .get("enrolled", 0)
                )
                v2 = (
                    self.repo._monthly_snapshots[last2[1]]
                    .get(gv, {})
                    .get("enrolled", 0)
                )
                if v2 > v1 * 1.05:
                    group_trends[gv] = "improving"
                elif v2 < v1 * 0.95:
                    group_trends[gv] = "declining"
                else:
                    group_trends[gv] = "stable"

        benchmark_data = []
        for gv, gm in group_metrics.items():
            avg_group_sat = (
                round(gm["sat_sum"] / gm["count"], 1)
                if gm["count"] > 0
                else 0.0
            )
            benchmark_data.append(
                {
                    "age_group": gv,
                    "activities": int(gm["count"]),
                    "total_enrolled": int(gm["enrolled"]),
                    "avg_satisfaction": avg_group_sat,
                    "vs_club_avg": round(
                        avg_group_sat - avg_satisfaction, 1
                    ),
                    "trend": group_trends.get(gv, "stable"),
                }
            )

        return {
            "status": "success",
            "message": (
                f"📈 Participación: {len(participation)} "
                f"actividades, {total_enrolled} inscritos, "
                f"satisfacción promedio {avg_satisfaction}/5."
            ),
            "data": [
                p.model_dump(mode="json") for p in participation
            ],
            "total_activities": len(participation),
            "total_enrolled": total_enrolled,
            "average_satisfaction": avg_satisfaction,
            "benchmark_by_group": benchmark_data,
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: age_group_recommend_activities  🟢 AUTO (upgraded)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_recommend_activities",
        "Recomendar actividades para una familia basado en "
        "grupos etarios, satisfacción real y disponibilidad.",
        approval=ApprovalLevel.AUTO,
    )
    async def age_group_recommend_activities(
        self,
        age_groups: list[str],
    ) -> dict[str, Any]:
        """Recommend activities based on real satisfaction
        and availability (upgraded from hash-based)."""
        invalid = [
            ag
            for ag in age_groups
            if ag not in {c.value for c in AgeGroupCategory}
        ]
        if invalid:
            return {
                "status": "error",
                "message": (
                    f"Grupos etarios no válidos: "
                    f"{', '.join(invalid)}"
                ),
            }

        recommendations = await self.repo.get_recommendations(
            age_groups
        )

        if not recommendations:
            return {
                "status": "success",
                "message": (
                    "🔍 No encontramos actividades "
                    "recomendadas para los grupos indicados."
                ),
                "data": [],
                "total": 0,
            }

        return {
            "status": "success",
            "message": (
                f"🌟 {len(recommendations)} actividades "
                f"recomendadas (ordenadas por confianza)."
            ),
            "data": [
                r.model_dump(mode="json")
                for r in recommendations
            ],
            "total": len(recommendations),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: age_group_update_activity  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "age_group_update_activity",
        "Actualizar una actividad existente de un grupo etario.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def age_group_update_activity(
        self,
        activity_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        """Update an existing age group activity."""
        existing = await self.repo.get_activity(activity_id)
        if not existing:
            return {
                "status": "error",
                "message": (
                    f"No encontramos la actividad "
                    f"con ID {activity_id}."
                ),
            }

        activity = await self.repo.update_activity(
            activity_id, updates
        )
        if not activity:
            return {
                "status": "error",
                "message": (
                    "No se pudo actualizar la actividad."
                ),
            }

        logger.info(
            "[age_group] Activity updated: %s (%s)",
            activity.name,
            activity_id,
        )

        return {
            "status": "success",
            "message": (
                f'✅ Actividad "{activity.name}" actualizada.'
            ),
            "data": activity.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 🧠 INTELLIGENCE TOOLS (new)
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 8: get_age_group_health_score  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_age_group_health_score",
        "Obtener score de salud generacional (0-100) con 5 "
        "factores ponderados: participation, coverage, balance, "
        "satisfaction, family engagement.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_age_group_health_score(
        self,
    ) -> dict[str, Any]:
        """Compute composite generational health score."""
        health = await self.repo.get_health_score()

        level_emoji = {
            "excellent": "🟢",
            "healthy": "🟢",
            "attention": "🟡",
            "critical": "🔴",
        }
        emoji = level_emoji.get(health.level.value, "⚪")
        trend_emoji = {
            "improving": "📈",
            "stable": "➡️",
            "declining": "📉",
        }
        trend_e = trend_emoji.get(health.trend, "")

        critical_factors = [
            f.name for f in health.factors if f.impact == "high"
        ]

        return {
            "status": "success",
            "message": (
                f"{emoji} Health Score: {health.score}/100 "
                f"({health.level.value}) {trend_e}. "
                f"{len(critical_factors)} factor(es) "
                f"crítico(s): "
                f"{', '.join(critical_factors) if critical_factors else 'ninguno'}."
            ),
            "health_score": health.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 9: get_generational_analytics  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_generational_analytics",
        "Dashboard completo de inteligencia generacional: "
        "distribución, balance, cobertura, tendencias 6 meses, "
        "y señales cross-domain.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_generational_analytics(
        self,
    ) -> dict[str, Any]:
        """Complete generational analytics dashboard."""
        analytics = await self.repo.get_generational_analytics()

        over = sum(
            1
            for d in analytics.distribution
            if d.balance_status.value == "overrepresented"
        )
        under = sum(
            1
            for d in analytics.distribution
            if d.balance_status.value == "underrepresented"
        )

        return {
            "status": "success",
            "message": (
                f"📊 Generational Analytics: "
                f"{analytics.total_members} miembros, "
                f"balance {analytics.balance_score}/100, "
                f"cobertura {analytics.coverage_score}%, "
                f"satisfacción {analytics.avg_satisfaction}/5, "
                f"{len(analytics.cross_domain_signals)} "
                f"señales cross-domain."
            ),
            "analytics": analytics.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: get_age_group_forecast  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "get_age_group_forecast",
        "Predicción de demanda generacional: participación "
        "y satisfacción a 3 meses, capacidad proyectada, "
        "patrones estacionales (Dic-Feb peak Costa Rica).",
        approval=ApprovalLevel.AUTO,
    )
    async def get_age_group_forecast(
        self,
    ) -> dict[str, Any]:
        """Generate demand forecast with seasonal patterns."""
        forecast = await self.repo.get_age_group_forecast()

        # Summary highlights
        declining = [
            f
            for f in forecast.forecasts
            if f.trend == "declining" and f.metric == "participation"
        ]
        capacity_gaps = [
            d
            for d in forecast.demand_projections
            if d.gap > 0
        ]

        highlights: list[str] = []
        if declining:
            groups = list(
                set(f.age_group for f in declining)
            )
            highlights.append(
                f"Declive en: {', '.join(groups)}"
            )
        if capacity_gaps:
            gaps = [
                f"{d.age_group} (+{d.gap_pct:.0f}%)"
                for d in capacity_gaps
            ]
            highlights.append(
                f"Necesitan capacidad: {', '.join(gaps)}"
            )

        return {
            "status": "success",
            "message": (
                f"🔮 Forecast Q3 2026: "
                f"{len(forecast.forecasts)} predicciones, "
                f"{len(capacity_gaps)} gap(s) de capacidad. "
                + (
                    " | ".join(highlights)
                    if highlights
                    else "Sin alertas."
                )
            ),
            "forecast": forecast.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 11: generate_age_group_engagement_proposals
    #          🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "generate_age_group_engagement_proposals",
        "Motor de engagement generacional: propuestas "
        "proactivas cross-domain basadas en tendencias, "
        "cobertura, satisfacción y estacionalidad CR.",
        approval=ApprovalLevel.AUTO,
    )
    async def generate_age_group_engagement_proposals(
        self,
    ) -> dict[str, Any]:
        """Generate proactive cross-domain engagement
        proposals."""
        proposals = (
            await self.repo.generate_engagement_proposals()
        )

        return {
            "status": "success",
            "message": (
                f"💡 {proposals.total} propuestas de "
                f"engagement: {proposals.high_priority_count} "
                f"prioridad alta, "
                f"{proposals.cross_domain_count} "
                f"cross-domain."
            ),
            "proposals": proposals.model_dump(mode="json"),
        }
