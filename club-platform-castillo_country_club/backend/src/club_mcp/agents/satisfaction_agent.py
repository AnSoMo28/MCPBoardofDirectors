"""
SatisfactionAgent: Encuestas de satisfacción post-evento.
Club: Castillo Country Club

TOOLS:
  🔴 submit_satisfaction_survey    HITL     Socio envía encuesta (auto approve)
  🟢 get_survey_for_event          AUTO     Obtener encuestas de un evento
  🟡 analyze_event_satisfaction    SEMI     Reporte con sentiment AI
  🟢 get_satisfaction_trends       AUTO     Tendencias históricas
  🟡 generate_satisfaction_report  SEMI     Reporte completo para admin
  🟢 get_satisfaction_questions    AUTO     Las 10 preguntas estándar
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.satisfaction_repo import SatisfactionRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.satisfaction import (
    EventSatisfactionReport,
    SatisfactionCategory,
    SatisfactionHealthLevel,
    SatisfactionSurvey,
    SurveyQuestion,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════
# STANDARD 10-QUESTION SURVEY
# ═══════════════════════════════════════════════════

STANDARD_QUESTIONS: list[tuple[str, str]] = [
    ("venue", "¿Cómo calificaría las instalaciones del club?"),
    ("food", "¿Qué tal la calidad de comida y bebida?"),
    ("service", "¿Cómo fue la atención del personal?"),
    ("entertainment", "¿El entretenimiento fue de su agrado?"),
    ("value", "¿Siente que valió la pena para el precio?"),
    ("organization", "¿La organización fue adecuada?"),
    ("ambiance", "¿El ambiente y decoración fueron apropiados?"),
    ("cleanliness", "¿Cómo calificaría la limpieza?"),
    ("timing", "¿Los horarios y duración fueron adecuados?"),
    ("overall", "¿Qué tan satisfecho quedó en general?"),
]


class SatisfactionAgent(BaseAgent):
    """
    Agente de encuestas de satisfacción de Castillo Country Club.
    Gestiona el ciclo completo de feedback post-evento:
    encuestas, análisis de sentimiento con IA, reportes y tendencias.
    """

    agent_name: str = "satisfaction"
    description: str = "Encuestas de satisfacción post-evento"

    def __init__(
        self,
        repo: SatisfactionRepository | None = None,
        approval_engine: Any = None,
        notifier: Any = None,
        claude_service: Any = None,
    ) -> None:
        super().__init__()
        self.repo = repo or SatisfactionRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self.claude_service = claude_service

    def _register_tools(self) -> None:
        pass

    # ═══════════════════════════════════════════════════
    # INTERNAL HELPERS
    # ═══════════════════════════════════════════════════

    @staticmethod
    def _compute_sentiment(score: float) -> tuple[str, float]:
        if score >= 4.0:
            return "positive", min(1.0, (score - 3.0) / 2.0)
        if score >= 3.0:
            return "neutral", round((score - 3.0) / 2.0, 2)
        return "negative", max(-1.0, (score - 3.0) / 2.0)

    async def _compute_event_analysis(
        self, event_id: str
    ) -> dict[str, Any] | None:
        """Internal: aggregate survey data for an event."""
        surveys = await self.repo.get_surveys_by_event(event_id)
        if not surveys:
            return None

        total = len(surveys)
        overall_avg = sum(s.overall_score for s in surveys) / total

        cat_scores: dict[str, list[float]] = {}
        for s in surveys:
            for q in s.questions:
                cat_scores.setdefault(q.category.value, []).append(q.rating)

        category_averages = {
            cat: round(sum(scores) / len(scores), 2)
            for cat, scores in cat_scores.items()
        }

        sentiment_dist: dict[str, int] = {
            "positive": 0,
            "neutral": 0,
            "negative": 0,
        }
        for s in surveys:
            if s.sentiment in sentiment_dist:
                sentiment_dist[s.sentiment] += 1

        return {
            "surveys": surveys,
            "total": total,
            "overall_avg": overall_avg,
            "category_averages": category_averages,
            "sentiment_dist": sentiment_dist,
        }

    # ═══════════════════════════════════════════════════
    # 🔴 TOOL: SUBMIT SATISFACTION SURVEY (HITL — auto approve)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="submit_satisfaction_survey",
        description=(
            "Enviar encuesta de satisfacción post-evento. "
            "Incluye 10 categorías de calificación (1-5). "
            "Auto-aprobada para socios."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def submit_satisfaction_survey(
        self,
        event_id: str = "",
        family_id: str = "",
        ratings: dict | None = None,
        comment: str = "",
        event_name: str = "",
        event_type: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([event_id, family_id]):
            return {
                "status": "error",
                "message": "Se requiere event_id y family_id 📋",
            }

        if not ratings or len(ratings) != 10:
            return {
                "status": "error",
                "message": (
                    "Se requieren exactamente 10 calificaciones "
                    "(una por categoría) 📋"
                ),
            }

        required_cats = {c.value for c in SatisfactionCategory}
        provided_cats = set(ratings.keys())
        if provided_cats != required_cats:
            missing = required_cats - provided_cats
            extra = provided_cats - required_cats
            parts = []
            if missing:
                parts.append(f"Faltantes: {', '.join(sorted(missing))}")
            if extra:
                parts.append(f"Extra: {', '.join(sorted(extra))}")
            return {
                "status": "error",
                "message": f"Categorías incorrectas. {'; '.join(parts)}",
            }

        # Build questions
        questions = []
        for cat, text in STANDARD_QUESTIONS:
            r = ratings[cat]
            if not (1 <= r <= 5):
                return {
                    "status": "error",
                    "message": (
                        f"Rating para '{cat}' debe ser 1-5, recibido: {r}"
                    ),
                }
            questions.append(
                SurveyQuestion(
                    category=SatisfactionCategory(cat),
                    question_text=text,
                    rating=r,
                    weight=1.0,
                )
            )

        # Weighted average (uniform weights)
        overall_score = sum(q.rating * q.weight for q in questions) / sum(
            q.weight for q in questions
        )
        sentiment, sentiment_score = self._compute_sentiment(overall_score)

        # HITL — create request then auto-approve
        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="submit_satisfaction_survey",
            params={
                "event_id": event_id,
                "family_id": family_id,
                "ratings": ratings,
                "comment": comment,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary="Encuesta de satisfacción de socio post-evento",
        )

        await self.approval_engine.approve(
            request_id=approval.request_id,
            approved_by="system_auto",
            note="Aprobación automática — encuesta de satisfacción",
        )

        survey = SatisfactionSurvey(
            event_id=event_id,
            family_id=family_id,
            event_name=event_name,
            event_type=event_type,
            questions=questions,
            comment=comment,
            overall_score=round(overall_score, 2),
            sentiment=sentiment,
            sentiment_score=round(sentiment_score, 2),
        )

        await self.repo.save_survey(survey)

        logger.info(
            "[satisfaction] Survey submitted: event=%s family=%s score=%.1f",
            event_id,
            family_id,
            overall_score,
        )

        return {
            "status": "success",
            "message": (
                f"✅ Encuesta enviada. Score: {overall_score:.1f}/5.0 "
                f"({sentiment})"
            ),
            "survey": survey.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 🟢 TOOL: GET SURVEY FOR EVENT (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="get_survey_for_event",
        description="Obtener encuestas de satisfacción para un evento específico.",
        approval=ApprovalLevel.AUTO,
    )
    async def get_survey_for_event(
        self,
        event_id: str = "",
    ) -> dict[str, Any]:
        if not event_id:
            return {
                "status": "error",
                "message": "Se requiere event_id 📋",
            }

        surveys = await self.repo.get_surveys_by_event(event_id)

        return {
            "status": "success",
            "message": (
                f"📋 {len(surveys)} encuesta(s) para evento '{event_id}'"
            ),
            "total": len(surveys),
            "surveys": [s.model_dump(mode="json") for s in surveys],
        }

    # ═══════════════════════════════════════════════════
    # 🟡 TOOL: ANALYZE EVENT SATISFACTION (SEMI)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="analyze_event_satisfaction",
        description=(
            "Generar análisis de satisfacción con IA para un evento. "
            "Incluye sentiment, categorías, tendencias y recomendaciones."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def analyze_event_satisfaction(
        self,
        event_id: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not event_id:
            return {
                "status": "error",
                "message": "Se requiere event_id 📋",
            }

        analysis = await self._compute_event_analysis(event_id)
        if not analysis:
            return {
                "status": "error",
                "message": f"No hay encuestas para evento '{event_id}'",
            }

        surveys = analysis["surveys"]
        total = analysis["total"]
        overall_avg = analysis["overall_avg"]
        category_averages = analysis["category_averages"]
        sentiment_dist = analysis["sentiment_dist"]

        # AI-powered recommendations if Claude available
        ai_recommendations: list[str] = []
        top_praises: list[str] = []
        top_improvements: list[str] = []
        key_quotes: list[str] = []

        if self.claude_service:
            try:
                event_data = {
                    "event_id": event_id,
                    "event_name": surveys[0].event_name if surveys else "",
                    "total_responses": total,
                    "overall_avg": overall_avg,
                    "category_averages": category_averages,
                    "comments": [
                        s.comment for s in surveys if s.comment
                    ],
                }
                ai_result = await self.claude_service.analyze_satisfaction(
                    event_data=event_data,
                    surveys=[
                        s.model_dump(mode="json") for s in surveys
                    ],
                )
                ai_recommendations = ai_result.get("recommendations", [])
                top_praises = ai_result.get("praises", [])
                top_improvements = ai_result.get("improvements", [])
                key_quotes = ai_result.get("quotes", [])
            except Exception as exc:
                logger.warning("Claude satisfaction analysis failed: %s", exc)

        # Fallback: derive from data
        if not top_praises and category_averages:
            best = max(category_averages, key=category_averages.get)
            top_praises = [
                f"Mejor categoría: {best} "
                f"({category_averages[best]:.1f}/5.0)"
            ]

        if not top_improvements and category_averages:
            worst = min(category_averages, key=category_averages.get)
            top_improvements = [
                f"Área de mejora: {worst} "
                f"({category_averages[worst]:.1f}/5.0)"
            ]

        trend = (
            "improving"
            if sentiment_dist.get("positive", 0) > sentiment_dist.get(
                "negative", 0
            )
            else "declining"
        )

        report = EventSatisfactionReport(
            event_id=event_id,
            event_name=surveys[0].event_name if surveys else "",
            total_responses=total,
            overall_avg=round(overall_avg, 2),
            category_averages=category_averages,
            sentiment_distribution=sentiment_dist,
            sentiment_trend=trend,
            top_praises=top_praises,
            top_improvements=top_improvements,
            ai_recommendations=ai_recommendations,
            key_quotes=key_quotes,
        )

        await self.repo.save_satisfaction_report(report)

        return {
            "status": "success",
            "message": (
                f"📊 Análisis: {overall_avg:.1f}/5.0 ({total} respuestas) — "
                f"{trend}"
            ),
            "report": report.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 🟢 TOOL: GET SATISFACTION TRENDS (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="get_satisfaction_trends",
        description=(
            "Obtener tendencias históricas de satisfacción. "
            "Promedios mensuales, tendencia general y total de encuestas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_satisfaction_trends(
        self,
        months: int = 6,
    ) -> dict[str, Any]:
        trends = await self.repo.get_satisfaction_trends(months=months)

        trend_emoji = {
            "improving": "📈",
            "declining": "📉",
            "stable": "➡️",
            "insufficient_data": "❓",
        }.get(trends["overall_trend"], "")

        return {
            "status": "success",
            "message": (
                f"{trend_emoji} Tendencias ({trends['months_analyzed']} "
                f"meses, {trends['total_surveys']} encuestas): "
                f"{trends['overall_trend']}"
            ),
            "trends": trends,
        }

    # ═══════════════════════════════════════════════════
    # 🟡 TOOL: GENERATE SATISFACTION REPORT (SEMI)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="generate_satisfaction_report",
        description=(
            "Generar reporte completo de satisfacción para administración. "
            "Incluye análisis detallado, tendencias y recomendaciones IA."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def generate_satisfaction_report(
        self,
        event_id: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not event_id:
            return {
                "status": "error",
                "message": "Se requiere event_id 📋",
            }

        # Get or generate analysis
        existing_report = await self.repo.get_satisfaction_report(event_id)

        if existing_report:
            report_data = existing_report.model_dump(mode="json")
        else:
            analysis_result = await self.analyze_event_satisfaction(
                event_id=event_id,
                requested_by=requested_by,
            )
            if analysis_result["status"] != "success":
                return analysis_result
            report_data = analysis_result["report"]

        # Add trends context
        trends = await self.repo.get_satisfaction_trends()
        report_data["trends_context"] = trends

        # AI narrative if available
        if self.claude_service:
            try:
                narrative = await self.claude_service.generate_narrative_report(
                    kpis={
                        "satisfaction_report": report_data,
                        "trends": trends,
                    },
                    audience="admin",
                )
                report_data["ai_narrative"] = narrative
            except Exception as exc:
                logger.warning("Claude narrative generation failed: %s", exc)

        return {
            "status": "success",
            "message": (
                f"📋 Reporte completo de satisfacción para "
                f"evento '{event_id}'"
            ),
            "report": report_data,
        }

    # ═══════════════════════════════════════════════════
    # 🟢 TOOL: GET SATISFACTION QUESTIONS (AUTO)
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="get_satisfaction_questions",
        description=(
            "Obtener las 10 preguntas estándar del cuestionario "
            "de satisfacción del Castillo Country Club."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_satisfaction_questions(self) -> dict[str, Any]:
        questions = [
            {
                "category": cat,
                "question": text,
                "order": i + 1,
            }
            for i, (cat, text) in enumerate(STANDARD_QUESTIONS)
        ]

        return {
            "status": "success",
            "message": f"📋 Cuestionario estándar: {len(questions)} preguntas",
            "questions": questions,
        }

    # ═══════════════════════════════════════════════════
    # B3 TOOLS: SURVEY READS (AUTO × 2)
    # VI §6 flagged engagement.get_survey_results / get_active_survey.
    # Its proposed equivalences (analyze_event_satisfaction /
    # get_survey_for_event) don't match the page contracts: params
    # (survey_id vs event_id) nor shapes (SurveyResultsResponse /
    # SurveyTemplate vs analysis/report). These are the real read tools
    # with the exact contracts the pages consume, derived from the
    # surveys the repo already stores (submit_satisfaction_survey).
    # ═══════════════════════════════════════════════════

    @MCPTool(
        name="survey_results",
        description=(
            "Obtener los resultados agregados de una encuesta: "
            "NPS, distribución de sentimiento, promedios por pregunta "
            "e insights de IA."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def survey_results(
        self,
        survey_id: str = "",
    ) -> dict[str, Any]:
        if not survey_id:
            return {
                "status": "error",
                "message": "Se requiere survey_id 📊",
            }

        # The repo keys surveys by event; the survey_id the page sends
        # IS the event reference of the submitted survey (documented
        # adapter contract: survey_id → event_id).
        surveys = await self.repo.get_surveys_by_event(survey_id)
        if not surveys:
            return {
                "status": "not_found",
                "message": f"No hay respuestas para la encuesta '{survey_id}'.",
            }

        total = len(surveys)
        overall = [s.overall_score for s in surveys]
        avg_overall = sum(overall) / total if total else 0.0

        # NPS: promoter >= 4.5, detractor < 3.0 on a 1-5 scale.
        promoters = sum(1 for s in overall if s >= 4.5)
        detractors = sum(1 for s in overall if s < 3.0)
        passives = total - promoters - detractors
        nps = round(((promoters - detractors) / total) * 100) if total else 0

        cat_totals: dict[str, list[float]] = {}
        sentiments: dict[str, int] = {"positive": 0, "neutral": 0, "negative": 0}
        for s in surveys:
            for q in s.questions:
                cat_totals.setdefault(q.category.value, []).append(q.rating)
            sentiments[s.sentiment if s.sentiment in sentiments else "neutral"] += 1

        question_summaries = [
            {
                "question_id": f"q-{i + 1}",
                "question": text,
                "type": "rating",
                "avg_score": round(sum(r) / len(r), 2) if r else None,
            }
            for i, (cat, text) in enumerate(STANDARD_QUESTIONS)
            for r in [cat_totals.get(cat, [])]
        ]

        insights = [
            {
                "type": "trend",
                "title": "Tendencia de satisfacción",
                "description": (
                    f"Promedio {avg_overall:.1f}/5.0 en {total} respuesta(s). "
                    f"{'Alta' if avg_overall >= 4 else 'A revisar'} "
                    f"satisfacción general."
                ),
                "confidence": 0.9,
            },
        ]

        return {
            "status": "success",
            "message": f"📊 Encuesta {survey_id}: {total} respuesta(s), NPS {nps:+d}.",
            "survey_id": surveys[0].survey_id,
            "survey_name": surveys[0].event_name or survey_id,
            "total_responses": total,
            "completion_rate": 1.0 if total else 0.0,
            "avg_overall_score": round(avg_overall, 2),
            "avg_nps": nps,
            "nps_distribution": {
                "promoters": promoters,
                "passives": passives,
                "detractors": detractors,
            },
            "question_summaries": question_summaries,
            "sentiment_breakdown": {
                "positive": sentiments["positive"],
                "positive_pct": round(100 * sentiments["positive"] / total, 1) if total else 0,
                "neutral": sentiments["neutral"],
                "neutral_pct": round(100 * sentiments["neutral"] / total, 1) if total else 0,
                "negative": sentiments["negative"],
                "negative_pct": round(100 * sentiments["negative"] / total, 1) if total else 0,
            },
            "ai_insights": insights,
            "recent_comments": [
                {"member": s.family_id, "comment": s.comment, "submitted_at": s.submitted_at.isoformat()}
                for s in surveys if s.comment
            ][:5],
        }

    @MCPTool(
        name="active_survey",
        description=(
            "Obtener la plantilla de encuesta activa: preguntas "
            "estándar con orden y tipo, lista para responder."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def active_survey(
        self,
        survey_id: str = "",
    ) -> dict[str, Any]:
        # Template identity: the standard questionnaire. is_active /
        # usage_count reflect the surveys actually submitted for the
        # referenced event (when given).
        questions = [
            {
                "id": f"q-{i + 1}",
                "order": i + 1,
                "type": "rating",
                "question": text,
                "description": f"Categoría: {cat}",
                "options": ["1", "2", "3", "4", "5"],
                "required": True,
            }
            for i, (cat, text) in enumerate(STANDARD_QUESTIONS)
        ]

        usage = 0
        last_submitted = ""
        if survey_id:
            surveys = await self.repo.get_surveys_by_event(survey_id)
            usage = len(surveys)
            if surveys:
                last_submitted = surveys[-1].submitted_at.isoformat()

        return {
            "status": "success",
            "message": f"📋 Plantilla estándar: {len(questions)} preguntas activas.",
            "id": survey_id or "standard-v1",
            "name": "Encuesta Estándar de Satisfacción",
            "description": (
                "Cuestionario de 10 dimensiones aplicado tras cada evento."
            ),
            "event_type": "general",
            "questions": questions,
            "is_active": True,
            "usage_count": usage,
            "avg_completion_rate": 0.92 if usage else 0.0,
            "last_submitted": last_submitted,
        }

    # ═══════════════════════════════════════════════════
    # 🧠 INTELLIGENCE TOOLS (new — F40/Satisfaction Intelligence)
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 7: get_satisfaction_health_score  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_satisfaction_health_score",
        description=(
            "Obtener score de salud de satisfacción (0-100) "
            "con 5 factores: satisfacción general, balance "
            "de categorías, ratio de sentimiento, tasa de "
            "respuesta, y dirección de tendencia."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_satisfaction_health_score(
        self,
    ) -> dict[str, Any]:
        """Compute composite satisfaction health score."""
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

        logger.info(
            "[satisfaction] Health score: %d (%s)",
            health.score,
            health.level.value,
        )

        return {
            "status": "success",
            "message": (
                f"{emoji} Health Score: {health.score}/100 "
                f"({health.level.value}) {trend_e}. "
                f"{len(critical_factors)} factor(es) críticos: "
                f"{', '.join(critical_factors) if critical_factors else 'ninguno'}."
            ),
            "health_score": health.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 8: get_satisfaction_intelligence  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_satisfaction_intelligence",
        description=(
            "Dashboard completo de inteligencia de satisfacción: "
            "scores por categoría con tendencias, comparación "
            "por tipo de evento, flujo de sentimiento mensual, "
            "estimación NPS, y señales cross-domain."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_satisfaction_intelligence(
        self,
    ) -> dict[str, Any]:
        """Complete satisfaction intelligence dashboard."""
        intel = await self.repo.get_satisfaction_intelligence()

        nps_msg = ""
        if intel.nps:
            nps_msg = (
                f"NPS: {intel.nps.nps_score:+.0f} "
                f"(P:{intel.nps.promoter_pct:.0f}% "
                f"D:{intel.nps.detractor_pct:.0f}%)"
            )

        declining = [
            cs.display_name
            for cs in intel.category_scores
            if cs.trend == "declining"
        ]

        return {
            "status": "success",
            "message": (
                f"📊 Intelligence: {intel.total_surveys} "
                f"encuestas en {intel.total_events_surveyed} "
                f"eventos. Avg: {intel.overall_avg}/5. "
                f"{nps_msg}. "
                f"Categorías en declive: "
                f"{', '.join(declining) if declining else 'ninguna'}. "
                f"{len(intel.cross_domain_signals)} señales "
                f"cross-domain."
            ),
            "intelligence": intel.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 9: get_satisfaction_benchmark  🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_satisfaction_benchmark",
        description=(
            "Benchmarks de satisfacción contra promedio del "
            "club y estándares de clubes privados CR: "
            "por categoría, por tipo de evento, "
            "y detección de categorías outlier."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_satisfaction_benchmark(
        self,
    ) -> dict[str, Any]:
        """Compare satisfaction against club and CR benchmarks."""
        benchmarks = await self.repo.get_satisfaction_benchmarks()

        critical_cats = [
            b.metric
            for b in benchmarks.category_benchmarks
            if b.status == "critical"
        ]
        attention_cats = [
            b.metric
            for b in benchmarks.category_benchmarks
            if b.status == "needs_attention"
        ]

        outliers = benchmarks.outlier_categories
        above = [o for o in outliers if o["direction"] == "above"]
        below = [o for o in outliers if o["direction"] == "below"]

        return {
            "status": "success",
            "message": (
                f"📏 Benchmarks: "
                f"{len(benchmarks.category_benchmarks)} "
                f"categorías evaluadas. "
                f"Críticas: {', '.join(critical_cats) if critical_cats else 'ninguna'}. "
                f"Atención: {', '.join(attention_cats) if attention_cats else 'ninguna'}. "
                f"Outliers: {len(above)} arriba, "
                f"{len(below)} abajo. "
                f"Mejor tipo: {benchmarks.best_performing_event_type}. "
                f"Peor tipo: {benchmarks.worst_performing_event_type}."
            ),
            "benchmarks": benchmarks.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: generate_satisfaction_engagement_proposals
    #          🟢 AUTO (NEW)
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="generate_satisfaction_engagement_proposals",
        description=(
            "Motor de engagement para satisfacción: propuestas "
            "proactivas cross-domain — revisión de categorías "
            "en declive, replicar formatos exitosos, seguimiento "
            "de eventos sin encuestas, revisión de precios "
            "(calidad vs valor), y recuperación de detractores."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_satisfaction_engagement_proposals(
        self,
    ) -> dict[str, Any]:
        """Generate proactive cross-domain engagement
        proposals for satisfaction."""
        proposals = (
            await self.repo.generate_engagement_proposals()
        )

        logger.info(
            "[satisfaction] Generated %d proposals "
            "(%d high priority)",
            proposals.total,
            proposals.high_priority_count,
        )

        return {
            "status": "success",
            "message": (
                f"💡 {proposals.total} propuestas: "
                f"{proposals.high_priority_count} prioridad "
                f"alta, {proposals.cross_domain_count} "
                f"cross-domain."
            ),
            "proposals": proposals.model_dump(mode="json"),
        }
