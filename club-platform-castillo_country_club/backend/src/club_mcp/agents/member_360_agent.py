"""
Member 360 Intelligence Agent — 10 MCP Tools.
Cross-domain aggregation for individual member intelligence.

Tools: 10 (10 intel/data, 0 HITL mutations)
Server: member_360
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.member_360_repo import Member360Repository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.member_360 import (
    ChurnRiskLevel,
    JourneyStage,
    Member360ProfileResponse,
    MemberActivitySummaryResponse,
    MemberChurnPredictionResponse,
    MemberEngagementProposalsResponse,
    MemberHealthLevel,
    MemberHealthScoreResponse,
    MemberJourneyResponse,
    MemberLTVAnalysisResponse,
    MemberRiskAssessmentResponse,
    MemberSocialProfileResponse,
    SearchMembers360Response,
)


class Member360Agent(BaseAgent):
    """
    Member 360 Intelligence Agent.

    Provides cross-domain aggregated intelligence for individual club members.
    Consumes data from Families, Finance, Events, Sports, Wellness, Cultural,
    Communications, Satisfaction, and Engagement domains.

    10 tools: all AUTO approval (intelligence/data, no side effects).
    """

    agent_name = "member_360"
    description = "Member 360 Intelligence — vista unificada de cada socio"

    def __init__(self, repo: Member360Repository | None = None) -> None:
        super().__init__()
        self.repo = repo if repo is not None else Member360Repository()

    def _register_tools(self) -> None:
        pass

    def _member_lookup_error(self, member_id: str) -> dict[str, str] | None:
        if not member_id.strip():
            return {"status": "error", "message": "member_id is required."}
        if self.repo.get_member_identity(member_id) is None:
            return {
                "status": "not_found",
                "message": f"Member {member_id} was not found.",
            }
        return None

    # ─── Tool 1: Full 360 Profile ────────────────────────────────────────────

    @MCPTool(
        name="get_member_360_profile",
        description=(
            "Obtener perfil completo 360° de un socio individual. "
            "Agrega datos de TODOS los dominios: identidad, salud, journey, "
            "churn, LTV, engagement, actividades, social."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_360_profile(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error

        identity = self.repo.get_member_identity(member_id)
        if not identity:
            return {
                "status": "not_found",
                "message": f"Member {member_id} was not found.",
            }

        health = self.repo.get_health_score(member_id)
        journey = self.repo.get_member_journey(member_id)
        churn = self.repo.get_churn_prediction(member_id)
        ltv = self.repo.get_ltv_analysis(member_id)
        activity = self.repo.get_activity_summary(member_id)
        social = self.repo.get_social_profile(member_id)
        activity_dates = [
            domain["last_activity"]
            for domain in activity.get("by_domain", [])
            if domain.get("last_activity") is not None
        ]

        return Member360ProfileResponse(
            member=identity,
            health_score=health["composite_score"],
            health_level=health["health_level"],
            journey_stage=journey["current_stage"],
            days_in_stage=journey["days_in_stage"],
            churn_risk=churn["churn_risk"],
            churn_score=churn["churn_score"],
            engagement_score=next(
                (f.score for f in health["factors"] if f.name == "engagement"), 50
            ),
            ltv_estimate=ltv["current_ltv"],
            ltv_trend=ltv["ltv_trend"],
            active_domains=[d["domain"] for d in activity.get("by_domain", [])],
            total_activities_90d=activity["total_activities"],
            last_activity_date=max(activity_dates, default=None),
            connections_count=social["connections_count"],
            satisfaction_nps=None,  # TODO: connect satisfaction agent
            upcoming_milestones=[
                m for m in journey.get("milestones", []) if not m.celebrated
            ][:3],
            top_risks=[rf["detail"] for rf in churn.get("risk_factors", [])][:3],
            generated_at=datetime.now(UTC),
        ).model_dump(mode="json")

    # ─── Tool 2: Health Score ────────────────────────────────────────────────

    @MCPTool(
        name="get_member_health_score",
        description=(
            "Score de salud compuesto (0-100) de un socio individual con 5 factores "
            "ponderados: engagement, financial, social, satisfaction, activity."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_health_score(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_health_score(member_id)
        result["factors"] = [
            factor.model_dump(mode="json") for factor in result["factors"]
        ]
        return MemberHealthScoreResponse(**result).model_dump(mode="json")

    # ─── Tool 3: Journey ─────────────────────────────────────────────────────

    @MCPTool(
        name="get_member_journey",
        description=(
            "Journey del socio: etapa del lifecycle, historial de etapas, "
            "hitos (join, aniversarios, logros), próxima transición esperada."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_journey(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_member_journey(member_id)
        if "error" in result:
            return result
        result["milestones"] = [
            milestone.model_dump(mode="json")
            for milestone in result["milestones"]
        ]
        return MemberJourneyResponse(**result).model_dump(mode="json")

    # ─── Tool 4: Churn Prediction ────────────────────────────────────────────

    @MCPTool(
        name="get_member_churn_prediction",
        description=(
            "Predicción de abandono individual con score, nivel de riesgo, "
            "factores de riesgo, factores protectores, y acciones recomendadas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_churn_prediction(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_churn_prediction(member_id)
        return MemberChurnPredictionResponse(**result).model_dump(mode="json")

    # ─── Tool 5: LTV Analysis ────────────────────────────────────────────────

    @MCPTool(
        name="get_member_ltv_analysis",
        description=(
            "Análisis de Lifetime Value: LTV actual, gasto mensual promedio, "
            "desglose por dominio, proyección a 12 meses, benchmark vs tier."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_ltv_analysis(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_ltv_analysis(member_id)
        if "error" in result:
            return result
        return MemberLTVAnalysisResponse(**result).model_dump(mode="json")

    # ─── Tool 6: Activity Summary ────────────────────────────────────────────

    @MCPTool(
        name="get_member_activity_summary",
        description=(
            "Resumen de actividades cross-domain: desglose por dominio, "
            "heatmap de actividad, venues favoritos, racha actual."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_activity_summary(
        self, member_id: str, period_days: int = 90
    ) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        if not 1 <= period_days <= 3650:
            return {
                "status": "error",
                "message": "period_days must be between 1 and 3650.",
            }
        result = self.repo.get_activity_summary(member_id, period_days)
        return MemberActivitySummaryResponse(**result).model_dump(mode="json")

    # ─── Tool 7: Social Profile ──────────────────────────────────────────────

    @MCPTool(
        name="get_member_social_profile",
        description=(
            "Perfil social: conexiones, membresía a clusters, referrals, "
            "score de influencia social, conexiones recomendadas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_social_profile(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_social_profile(member_id)
        result["connections"] = [
            connection.model_dump(mode="json")
            for connection in result["connections"]
        ]
        return MemberSocialProfileResponse(**result).model_dump(mode="json")

    # ─── Tool 8: Engagement Proposals (Motor) ────────────────────────────────

    @MCPTool(
        name="generate_member_engagement_proposals",
        description=(
            "Motor de Engagement: genera propuestas personalizadas cross-domain "
            "para reconectar, expandir actividad, o celebrar hitos de un socio."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_member_engagement_proposals(
        self, member_id: str
    ) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.generate_engagement_proposals(member_id)
        if "error" in result:
            return result
        result["proposals"] = [
            proposal.model_dump(mode="json")
            for proposal in result["proposals"]
        ]
        return MemberEngagementProposalsResponse(**result).model_dump(mode="json")

    # ─── Tool 9: Risk Assessment ─────────────────────────────────────────────

    @MCPTool(
        name="get_member_risk_assessment",
        description=(
            "Evaluación de riesgo cross-domain: factores de riesgo de múltiples "
            "dominios, factores protectores, tendencia, mitigación sugerida."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_risk_assessment(self, member_id: str) -> dict[str, Any]:
        member_error = self._member_lookup_error(member_id)
        if member_error:
            return member_error
        result = self.repo.get_risk_assessment(member_id)
        return MemberRiskAssessmentResponse(**result).model_dump(mode="json")

    # ─── Tool 10: Search Members 360 ─────────────────────────────────────────

    @MCPTool(
        name="search_members_360",
        description=(
            "Buscar socios con preview 360°: health score, churn risk, "
            "engagement, lifecycle stage. Filtrable por tier, health level, churn risk."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def search_members_360(
        self,
        query: str | None = None,
        tier: str | None = None,
        health_level: str | None = None,
        churn_risk: str | None = None,
        journey_stage: str | None = None,
        sort_by: str = "health_score_desc",
        page: int = 1,
        page_size: int = 20,
    ) -> dict[str, Any]:
        if page < 1 or not 1 <= page_size <= 100:
            return {
                "status": "error",
                "message": "page must be positive and page_size must be between 1 and 100.",
            }

        if health_level and health_level not in {
            level.value for level in MemberHealthLevel
        }:
            return {"status": "error", "message": "health_level is not valid."}
        if churn_risk and churn_risk not in {
            risk.value for risk in ChurnRiskLevel
        }:
            return {"status": "error", "message": "churn_risk is not valid."}
        if journey_stage and journey_stage not in {
            stage.value for stage in JourneyStage
        }:
            return {"status": "error", "message": "journey_stage is not valid."}

        valid_sorts = {
            "health_score_desc",
            "health_score_asc",
            "churn_risk_desc",
            "name_asc",
            "tier_desc",
            "engagement_desc",
        }
        if sort_by not in valid_sorts:
            return {
                "status": "error",
                "message": f"sort_by must be one of: {', '.join(sorted(valid_sorts))}.",
            }

        result = self.repo.search_members(
            query=query,
            tier=tier,
            health_level=health_level,
            churn_risk=churn_risk,
            journey_stage=journey_stage,
            sort_by=sort_by,
            page=page,
            page_size=page_size,
        )
        result.setdefault("generated_at", datetime.now(UTC))
        result["members"] = [
            member.model_dump(mode="json") for member in result["members"]
        ]
        result["filters_applied"] = {
            k: v
            for k, v in {
                "query": query,
                "tier": tier,
                "health_level": health_level,
                "churn_risk": churn_risk,
                "journey_stage": journey_stage,
            }.items()
            if v is not None
        }
        return SearchMembers360Response(**result).model_dump(mode="json")
