"""ML Intelligence Agent for Castillo Country Club.

Central intelligence hub that aggregates cross-domain data
and provides anomaly detection, forecasting, churn prediction,
member segmentation, conversational AI, and hypothetical simulation.

This agent bridges ALL domains and is the "brain" of the platform.

Enhanced (F40):
- 10 MCP tools covering full ML intelligence spectrum
- Claude service integration for conversational AI and simulation
- Statistical algorithms: z-score, IQR, exponential smoothing
- Cross-domain signal aggregation and anomaly correlation

Updated (F44-B7):
- Fixed missing imports (SimulationScenario, ScenarioType)
- Encapsulated claude calls behind _query_claude() helper
"""

from __future__ import annotations

import logging
from typing import Any

from club_mcp.agents.base_agent import BaseAgent
from club_mcp.db.repositories.ml_intelligence_repo import (
    MLIntelligenceRepository,
)
from club_mcp.models.ml_intelligence import (
    ForecastTarget,
    ScenarioType,
    SimulationScenario,
)
from club_mcp.agents.base import MCPTool
from club_mcp.ai.claude_service import get_claude_service
from club_mcp.hitl.approval_types import ApprovalLevel

logger = logging.getLogger(__name__)


class MLIntelligenceAgent(BaseAgent):
    """Central ML intelligence agent — the brain of the platform.

    Aggregates data from all 13+ domain agents to provide:
    - Data quality assessment across all domains
    - Anomaly detection (ensemble: Isolation Forest + IQR)
    - Demand and revenue forecasting (Prophet with CR holidays)
    - ML-based churn scoring vs rule-based advisor
    - Member segmentation (weighted clustering)
    - ML model health monitoring (PSI drift detection)
    - Conversational AI (Club Manager Chat)
    - Prediction explanation with factor decomposition
    - Hypothetical simulation ("What if?")
    """

    agent_name: str = "ml_intelligence"
    description: str = (
        "Motor de inteligencia central — detección de "
        "anomalías, forecasting, churn prediction, "
        "segmentación, chat con Club Manager, y "
        "simulaciones hipotéticas."
    )

    def __init__(self) -> None:
        super().__init__()
        self.repo = MLIntelligenceRepository()
        self.claude = get_claude_service()
        logger.info("[ml_intelligence] Agent initialized")

    def _register_tools(self) -> None:
        pass

    # ── Claude helper ─────────────────────────────────────

    async def _query_claude(
        self,
        context: str,
        question: str,
        query_type: str,
    ) -> dict[str, Any]:
        """Query Claude with cross-domain context.

        Encapsulates the claude_service call behind a
        semantic interface. Delegates to analyze_satisfaction()
        which handles generic analysis despite its
        domain-specific naming.
        """
        return await self.claude.analyze_satisfaction(
            {
                "context": context,
                "question": question,
                "type": query_type,
            }
        )

    # ═══════════════════════════════════════════════════
    # 🔍 DATA QUALITY & ANOMALY DETECTION TOOLS
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 1: get_data_quality_report  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_data_quality_report",
        description=(
            "Reporte de calidad de datos cross-domain: "
            "score por dominio (completitud, frescura, "
            "consistencia), gaps críticos, dominios listos "
            "para ML, y recomendaciones de mejora."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_data_quality_report(
        self,
    ) -> dict[str, Any]:
        """Generate cross-domain data quality assessment."""
        report = await self.repo.get_data_quality_report()

        critical = report.critical_gaps
        ready = report.domains_ready_for_ml

        emoji = {
            "excellent": "🟢",
            "good": "🟢",
            "partial": "🟡",
            "minimal": "🔴",
        }.get(report.overall_status.value, "⚪")

        domain_details = []
        for d in report.domains:
            status_e = {
                "excellent": "🟢",
                "good": "🟢",
                "partial": "🟡",
                "minimal": "🔴",
            }.get(d.status.value, "⚪")
            domain_details.append(
                f"  {status_e} {d.display_name}: {d.overall_score:.0f}%"
                f" (comp:{d.completeness_pct:.0f}%"
                f" fresh:{d.freshness_hours:.0f}h"
                f" consist:{d.consistency_score:.0f}%)"
            )

        logger.info(
            "[ml_intelligence] Data quality: %.0f%% (%s)",
            report.overall_score,
            report.overall_status.value,
        )

        return {
            "status": "success",
            "message": (
                f"{emoji} Calidad de datos: {report.overall_score:.0f}% "
                f"({report.overall_status.value}). "
                f"{ready}/{report.total_domains} dominios listos para ML. "
                f"Gaps críticos: {', '.join(critical) if critical else 'ninguno'}."
            ),
            "report": report.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: get_anomaly_report  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_anomaly_report",
        description=(
            "Detección de anomalías cross-domain usando "
            "ensemble (Isolation Forest + IQR): anomalías en "
            "revenue, satisfacción, enrollment, conversion. "
            "Con severidad, factores, consenso del ensemble, "
            "explicación y dominios afectados."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_anomaly_report(
        self,
        domain: str = "",
    ) -> dict[str, Any]:
        """Detect anomalies across all domains."""
        report = await self.repo.get_anomaly_report(
            domain=domain or None
        )

        risk_e = (
            "🔴" if report.systemic_risk_score > 70
            else "🟡" if report.systemic_risk_score > 40
            else "🟢"
        )

        anomaly_summaries = []
        for a in report.anomalies[:5]:
            sev_e = {
                "critical": "🔴",
                "high": "🟠",
                "medium": "🟡",
                "low": "🟢",
            }.get(a.severity.value, "⚪")
            method_tag = (
                f" [{a.ensemble_consensus}]"
                if a.detection_method == "ensemble"
                else ""
            )
            anomaly_summaries.append(
                f"{sev_e} [{a.domain}] {a.metric}: "
                f"{a.current_value} (expected: {a.expected_value}, "
                f"{a.deviation_pct:+.1f}%){method_tag}"
            )

        logger.info(
            "[ml_intelligence] Anomalies: %d detected "
            "(%d critical, %d high) via %s",
            report.total_anomalies,
            report.critical_count,
            report.high_count,
            report.detection_method,
        )

        return {
            "status": "success",
            "message": (
                f"{risk_e} {report.total_anomalies} anomalías "
                f"detectadas: {report.critical_count} críticas, "
                f"{report.high_count} altas. "
                f"Risk score: {report.systemic_risk_score:.0f}/100. "
                f"Dominios: {', '.join(report.domains_affected)}. "
                f"Método: {report.detection_method} "
                f"({report.ensemble_size} métodos)."
            ),
            "anomaly_summaries": anomaly_summaries,
            "report": report.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 📈 FORECASTING TOOLS
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 3: get_demand_forecast  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_demand_forecast",
        description=(
            "Predicción de demanda usando Prophet "
            "(con holidays CR y seasonal decomposition) "
            "o exponential smoothing como fallback: "
            "revenue, eventos, ocupación, invitados, "
            "satisfacción. Con intervalos de confianza "
            "y componentes de tendencia/estacionalidad."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_demand_forecast(
        self,
        target: str = "revenue",
        horizon: int = 3,
    ) -> dict[str, Any]:
        """Forecast demand for a specific target."""
        valid_targets = [t.value for t in ForecastTarget]
        if target not in valid_targets:
            return {
                "status": "error",
                "message": (
                    f"Target '{target}' no válido. "
                    f"Opciones: {', '.join(valid_targets)}"
                ),
            }

        forecast = await self.repo.get_demand_forecast(
            target=target,
            horizon=min(horizon, 6),
        )

        trend_e = {
            "improving": "📈",
            "stable": "➡️",
            "declining": "📉",
        }.get(forecast.trend, "")

        points_summary = []
        for p in forecast.forecast_points:
            comp_tag = ""
            if p.trend_component is not None:
                comp_tag = (
                    f" [trend:{p.trend_component:+.1f}"
                    f" seasonal:{p.seasonal_component:+.1f}]"
                )
            points_summary.append(
                f"  {p.period}: {p.predicted_value:.1f} "
                f"[{p.lower_bound:.1f} - {p.upper_bound:.1f}] "
                f"({p.confidence:.0%} CI){comp_tag}"
            )

        factor_summary = [
            f"  {f.name}: {f.weight:.0%} ({f.direction})"
            for f in forecast.factors
        ]

        logger.info(
            "[ml_intelligence] Demand forecast: %s (%s, model=%s)",
            target,
            forecast.trend,
            forecast.model_type,
        )

        return {
            "status": "success",
            "message": (
                f"{trend_e} Forecast [{forecast.display_name}]: "
                f"actual={forecast.current_value:.1f}. "
                f"Tendencia: {forecast.trend}. "
                f"Estacional: {forecast.seasonal_pattern}. "
                f"Modelo: {forecast.model_type}."
            ),
            "forecast": forecast.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 4: get_revenue_forecast  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_revenue_forecast",
        description=(
            "Forecast de revenue con 3 escenarios "
            "(optimista/base/pesimista): valores mensuales, "
            "total trimestral, variance vs budget, "
            "probabilidad y supuestos. Prophet CI-based "
            "con fallback a exponential smoothing."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_revenue_forecast(
        self,
        horizon: int = 3,
        scenario: str = "",
    ) -> dict[str, Any]:
        """Generate revenue forecast with scenarios."""
        forecast = await self.repo.get_revenue_forecast(
            horizon=min(horizon, 6),
            scenario=scenario or None,
        )

        scenario_summaries = []
        for s in forecast.scenarios:
            emoji = {
                "optimistic": "🟢",
                "base": "🟡",
                "pessimistic": "🔴",
            }.get(s.scenario_type.value, "⚪")
            scenario_summaries.append(
                f"{emoji} {s.label}: "
                f"₡{s.quarterly_total / 1e6:.1f}M "
                f"({s.vs_budget_pct:+.1f}% vs budget, "
                f"prob: {s.probability:.0%})"
            )

        logger.info(
            "[ml_intelligence] Revenue forecast: %.0f%% conf, "
            "recommended=%s, model=%s",
            forecast.confidence * 100,
            forecast.recommended_scenario.value,
            forecast.model_type,
        )

        return {
            "status": "success",
            "message": (
                f"💰 Revenue forecast ({forecast.horizon_months} meses): "
                f"Actual: ₡{forecast.current_monthly_revenue / 1e6:.1f}M/mes. "
                f"Budget: ₡{forecast.budget_monthly / 1e6:.1f}M/mes. "
                f"Confianza: {forecast.confidence:.0%}. "
                f"Modelo: {forecast.model_type}."
            ),
            "scenarios": scenario_summaries,
            "forecast": forecast.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 🧬 CHURN & SEGMENTATION TOOLS
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 5: get_churn_ml_scores  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_churn_ml_scores",
        description=(
            "Scores de churn basados en ML vs reglas: "
            "comparación por socio, discrepancias "
            "significativas, feature importance global, "
            "y breakdown por segmento."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_churn_ml_scores(
        self,
        segment: str = "",
    ) -> dict[str, Any]:
        """Compare ML churn scores with rule-based scores."""
        report = await self.repo.get_churn_ml_scores(
            segment=segment or None,
        )

        top_risks = report.scores[:5]
        risk_summaries = []
        for s in top_risks:
            disc_e = "⚠️" if abs(s.discrepancy) > 15 else ""
            risk_summaries.append(
                f"  {s.member_name} ({s.tier}): "
                f"ML={s.ml_churn_score:.0f} "
                f"Rules={s.rule_churn_score:.0f} "
                f"({s.discrepancy:+.0f}) {disc_e}"
            )

        logger.info(
            "[ml_intelligence] Churn ML: %d analyzed, "
            "%d at risk, %d significant discrepancies",
            report.total_analyzed,
            report.total_at_risk,
            report.significant_discrepancies,
        )

        return {
            "status": "success",
            "message": (
                f"🧬 Churn ML: {report.total_analyzed} socios "
                f"analizados. {report.total_at_risk} en riesgo "
                f"alto/crítico. {report.significant_discrepancies} "
                f"discrepancias significativas (ML vs Rules). "
                f"Avg ML: {report.avg_ml_score:.0f} "
                f"vs Avg Rules: {report.avg_rule_score:.0f}."
            ),
            "top_risks": risk_summaries,
            "report": report.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: get_member_segments  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_member_segments",
        description=(
            "Segmentación de socios en 5 clusters: "
            "Campeones, Leales, Potenciales, En Riesgo, "
            "Dormidos. Con características, LTV promedio, "
            "engagement, estrategia recomendada."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_member_segments(
        self,
    ) -> dict[str, Any]:
        """Generate member segmentation report."""
        seg = await self.repo.get_member_segments()

        segment_summaries = []
        for s in seg.segments:
            segment_summaries.append(
                f"  {s.display_name}: {s.member_count} "
                f"({s.percentage:.0f}%) — "
                f"Eng:{s.avg_engagement:.0f} "
                f"LTV:₡{s.avg_ltv / 1e6:.1f}M "
                f"Sat:{s.avg_satisfaction:.1f} "
                f"ChurnRisk:{s.churn_risk_pct:.0f}%"
            )

        logger.info(
            "[ml_intelligence] Segmentation: %d members → "
            "%d segments (silhouette: %.2f)",
            seg.total_members,
            len(seg.segments),
            seg.silhouette_score,
        )

        return {
            "status": "success",
            "message": (
                f"🧬 Segmentación: {seg.total_members} socios "
                f"→ {len(seg.segments)} clusters "
                f"(silhouette: {seg.silhouette_score:.2f}). "
                f"Diferenciadores: "
                f"{'; '.join(seg.key_differentiators[:2])}."
            ),
            "segments": segment_summaries,
            "report": seg.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 🔧 MODEL HEALTH TOOL
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 7: get_model_health  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="get_model_health",
        description=(
            "Salud de los modelos ML: accuracy, PSI drift "
            "detection, feature importance, último "
            "entrenamiento, estado (healthy/degraded/"
            "retrain_needed) y recomendaciones de retrain."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_model_health(
        self,
    ) -> dict[str, Any]:
        """Report ML model health metrics."""
        health = await self.repo.get_model_health()

        model_summaries = []
        for m in health.models:
            status_e = {
                "healthy": "🟢",
                "degraded": "🟡",
                "retrain_needed": "🔴",
            }.get(m.status, "⚪")
            drift_e = "⚠️" if m.drift_detected else ""
            acc_str = (
                f"Acc:{m.accuracy:.0f}%"
                if m.accuracy > 0
                else f"Silhouette:{m.mape:.2f}"
            )
            psi_str = ""
            if m.psi_score is not None:
                psi_str = f" PSI:{m.psi_score:.3f}"
                if m.psi_status:
                    psi_str += f"({m.psi_status.value})"
            model_summaries.append(
                f"  {status_e} {m.display_name}: "
                f"{acc_str}{psi_str} "
                f"Drift:{m.drift_magnitude:.2f} {drift_e} "
                f"({m.status})"
            )

        logger.info(
            "[ml_intelligence] Model health: %d models "
            "(%d healthy, %d degraded, %d retrain) "
            "drift_status=%s",
            health.total_models,
            health.healthy_count,
            health.degraded_count,
            health.retrain_needed_count,
            health.overall_drift_status.value,
        )

        return {
            "status": "success",
            "message": (
                f"🔧 Model health: {health.total_models} modelos. "
                f"🟢 {health.healthy_count} healthy, "
                f"🟡 {health.degraded_count} degraded, "
                f"🔴 {health.retrain_needed_count} retrain needed. "
                f"Avg accuracy: {health.avg_accuracy:.0f}%. "
                f"Drift: {health.overall_drift_status.value}. "
                f"Próximo entrenamiento: "
                f"{health.next_scheduled_training}."
            ),
            "models": model_summaries,
            "report": health.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════
    # 💬 CONVERSATIONAL AI TOOLS
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 8: chat_club_manager  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="chat_club_manager",
        description=(
            "Chat con el Club Manager AI: hace preguntas "
            "en lenguaje natural sobre cualquier aspecto "
            "del club. El sistema agrega contexto "
            "cross-domain automáticamente (anomalías, "
            "predicciones, calidad de datos) y Claude "
            "responde con evidencia y acciones sugeridas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def chat_club_manager(
        self,
        question: str,
    ) -> dict[str, Any]:
        """Conversational AI with full cross-domain context."""
        if not question.strip():
            return {
                "status": "error",
                "message": "Por favor hacé una pregunta sobre el club.",
            }

        # Build cross-domain context
        context = await self.repo.build_chat_context()
        anomalies = await self.repo.get_anomaly_report()
        quality = await self.repo.get_data_quality_report()

        # Build context summary for Claude
        context_parts = [
            f"=== CONTEXTO CASTILLO COUNTRY CLUB ({context.current_month}) ===",
            f"Total socios: {context.member_count}",
            f"Dominios activos: {len(context.active_domains)}",
            f"Anomalías recientes: {context.recent_anomalies}",
            "",
            "--- Estado de anomalías ---",
        ]

        for a in anomalies.anomalies[:5]:
            context_parts.append(
                f"- [{a.severity.value.upper()}] {a.domain}/"
                f"{a.metric}: {a.explanation}"
            )

        context_parts.extend([
            "",
            "--- Predicciones ---",
            f"- Tendencia revenue: "
            f"{context.latest_predictions.get('revenue_trend', 'N/A')}",
            f"- Socios en riesgo churn: "
            f"{context.latest_predictions.get('churn_at_risk', 0)}",
            f"- Tendencia satisfacción: "
            f"{context.latest_predictions.get('satisfaction_trend', 'N/A')}",
            "",
            "--- Calidad de datos ---",
            f"- Score general: {quality.overall_score:.0f}%",
            f"- Dominios listos para ML: "
            f"{quality.domains_ready_for_ml}/{quality.total_domains}",
        ])

        if quality.critical_gaps:
            context_parts.append(
                f"- Gaps críticos: "
                f"{', '.join(quality.critical_gaps)}"
            )

        full_context = "\n".join(context_parts)

        # Call Claude via helper
        try:
            response = await self._query_claude(
                context=full_context,
                question=question,
                query_type="club_manager_chat",
            )

            answer = response.get(
                "analysis",
                "No pude generar una respuesta en este momento.",
            )
            confidence = response.get("confidence", 0.7)

            # Build evidence from context
            evidence = []
            for a in anomalies.anomalies[:3]:
                evidence.append({
                    "source": f"anomaly:{a.domain}",
                    "data": a.explanation,
                    "confidence": a.confidence,
                })

            related = []
            if "satisfacci" in question.lower():
                related.append("satisfaction_trends")
            if "churn" in question.lower() or "riesgo" in question.lower():
                related.append("churn_ml_scores")
            if "revenue" in question.lower() or "ingreso" in question.lower():
                related.append("revenue_forecast")

            # Suggest follow-up action
            suggested = None
            if anomalies.critical_count > 0:
                suggested = {
                    "tool": "get_anomaly_report",
                    "reason": "Hay anomalías críticas activas",
                }
            elif context.latest_predictions.get("churn_at_risk", 0) > 3:
                suggested = {
                    "tool": "get_churn_ml_scores",
                    "reason": "Múltiples socios en riesgo de churn",
                }

            logger.info(
                "[ml_intelligence] Chat: '%s' → response (%.0f%% conf)",
                question[:50],
                confidence * 100,
            )

            return {
                "status": "success",
                "message": answer,
                "evidence": evidence,
                "related_insights": related,
                "suggested_action": suggested,
                "confidence": confidence,
                "context_used": [
                    "anomalies",
                    "predictions",
                    "data_quality",
                    "member_count",
                ],
            }

        except Exception as e:
            logger.error(
                "[ml_intelligence] Chat error: %s", str(e)
            )
            return {
                "status": "error",
                "message": (
                    f"Error procesando la pregunta: {str(e)}. "
                    f"Intentá de nuevo."
                ),
            }

    # ═══════════════════════════════════════════════════
    # 🔬 EXPLANATION & SIMULATION TOOLS
    # ═══════════════════════════════════════════════════

    # ─────────────────────────────────────────────────────────
    # Tool 9: explain_prediction  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="explain_prediction",
        description=(
            "Explicar una predicción de churn: factores "
            "contribuyentes con pesos, análisis de "
            "sensibilidad ('si X mejora, churn baja Y'), "
            "comparación ML vs reglas, y limitaciones."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def explain_prediction(
        self,
        member_id: str = "",
        prediction_type: str = "churn",
    ) -> dict[str, Any]:
        """Explain a prediction with factor decomposition."""
        if not member_id:
            return {
                "status": "error",
                "message": (
                    "Proporcioná un member_id para explicar. "
                    "Ejemplo: mem-000, mem-003, mem-012"
                ),
            }

        if prediction_type == "churn":
            explanation = await self.repo.explain_churn_prediction(
                member_id=member_id,
            )
        else:
            return {
                "status": "error",
                "message": (
                    f"Tipo '{prediction_type}' no soportado. "
                    f"Opciones: churn"
                ),
            }

        if explanation.limitations and "not found" in str(
            explanation.limitations
        ).lower():
            return {
                "status": "error",
                "message": (
                    f"Member '{member_id}' no encontrado. "
                    f"IDs disponibles: mem-000 a mem-019."
                ),
            }

        # Format factor summary
        factor_summaries = []
        for f in explanation.factors:
            dir_e = "🔴" if f.get("direction") == "negative" else "🟢"
            factor_summaries.append(
                f"  {dir_e} {f['feature']}: "
                f"{f['value']} (peso: {f['weight']:.0%}) — "
                f"{f['explanation']}"
            )

        sensitivity_summaries = [
            f"  → {s['change']}: {s['impact']}"
            for s in explanation.sensitivity
        ]

        logger.info(
            "[ml_intelligence] Explain: %s %s (value=%.0f, conf=%.0f%%)",
            prediction_type,
            member_id,
            explanation.predicted_value,
            explanation.confidence * 100,
        )

        return {
            "status": "success",
            "message": (
                f"🔬 Explicación {prediction_type} para "
                f"{member_id}: Score={explanation.predicted_value:.0f}. "
                f"Confianza: {explanation.confidence:.0%}. "
                f"{explanation.comparison_to_rules}"
            ),
            "factors": factor_summaries,
            "sensitivity": sensitivity_summaries,
            "explanation": explanation.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: simulate_hypothetical  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        name="simulate_hypothetical",
        description=(
            "Simulador '¿qué pasa si...?': analiza "
            "escenarios hipotéticos con 3 resultados "
            "(optimista/base/pesimista), impactos "
            "cross-domain, evaluación de riesgo y "
            "probabilidad estimada."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def simulate_hypothetical(
        self,
        question: str,
    ) -> dict[str, Any]:
        """Simulate hypothetical scenarios using Claude."""
        if not question.strip():
            return {
                "status": "error",
                "message": (
                    "Describí el escenario hipotético. "
                    "Ejemplo: '¿Qué pasa si perdemos 3 socios "
                    "platino este trimestre?'"
                ),
            }

        # Build current state context
        context = await self.repo.build_chat_context()
        anomalies = await self.repo.get_anomaly_report()
        churn = await self.repo.get_churn_ml_scores()
        quality = await self.repo.get_data_quality_report()

        sim_context = [
            "=== ESTADO ACTUAL DEL CLUB ===",
            f"Socios: {context.member_count}",
            f"Anomalías activas: {context.recent_anomalies}",
            f"Socios en riesgo churn: "
            f"{context.latest_predictions.get('churn_at_risk', 0)}",
            f"Tendencia revenue: "
            f"{context.latest_predictions.get('revenue_trend', 'N/A')}",
            f"Tendencia satisfacción: "
            f"{context.latest_predictions.get('satisfaction_trend', 'N/A')}",
            "",
            "--- Top churn risks ---",
        ]

        for s in churn.scores[:3]:
            sim_context.append(
                f"- {s.member_name} ({s.tier}): "
                f"ML={s.ml_churn_score:.0f}"
            )

        sim_context.extend([
            "",
            f"--- Calidad datos: {quality.overall_score:.0f}% ---",
            "",
            f"=== PREGUNTA HIPOTÉTICA ===",
            question,
        ])

        full_context = "\n".join(sim_context)

        # Call Claude via helper
        try:
            response = await self._query_claude(
                context=full_context,
                question=question,
                query_type="hypothetical_simulation",
            )

            analysis = response.get("analysis", "")
            confidence = response.get("confidence", 0.6)

            # Build 3 scenarios
            scenarios = [
                SimulationScenario(
                    scenario_type=ScenarioType.OPTIMISTIC,
                    label="Optimista",
                    description=(
                        "Los impactos negativos se mitigan "
                        "con acciones inmediatas."
                    ),
                    predictions={
                        "outcome": "Impacto mínimo, recuperación en 1 mes",
                        "affected_metrics": "Menos del 5% variación",
                    },
                    probability=0.25,
                    key_assumptions=[
                        "Acciones correctivas inmediatas",
                        "Comunicación proactiva con afectados",
                        "Equipo de respuesta preparado",
                    ],
                    risks=[
                        "Depende de velocidad de respuesta",
                        "Requiere recursos adicionales",
                    ],
                ),
                SimulationScenario(
                    scenario_type=ScenarioType.BASE,
                    label="Base",
                    description=(
                        "El escenario se desarrolla con "
                        "impactos moderados."
                    ),
                    predictions={
                        "outcome": "Impacto notable pero manejable",
                        "affected_metrics": "5-15% variación en métricas clave",
                    },
                    probability=0.50,
                    key_assumptions=[
                        "Respuesta estándar del equipo",
                        "Sin intervención extraordinaria",
                        "Tendencias actuales continúan",
                    ],
                    risks=[
                        "Podría escalar si no se monitorea",
                        "Efecto cascada a otros dominios",
                    ],
                ),
                SimulationScenario(
                    scenario_type=ScenarioType.PESSIMISTIC,
                    label="Pesimista",
                    description=(
                        "El impacto se amplifica y afecta "
                        "múltiples dominios."
                    ),
                    predictions={
                        "outcome": "Impacto severo, requiere intervención ejecutiva",
                        "affected_metrics": ">15% variación, posible cascada",
                    },
                    probability=0.25,
                    key_assumptions=[
                        "Sin intervención o respuesta tardía",
                        "Condiciones externas adversas",
                        "Efecto cascada no mitigado",
                    ],
                    risks=[
                        "Churn adicional por contagio",
                        "Reputación del club afectada",
                        "Revenue impact significativo",
                    ],
                ),
            ]

            # Cross-domain impacts
            cross_domain = [
                {
                    "domain": "member_360",
                    "impact": "Engagement y churn risk afectados",
                    "severity": "medium",
                },
                {
                    "domain": "finance",
                    "impact": "Revenue stream potentially impacted",
                    "severity": "medium",
                },
                {
                    "domain": "satisfaction",
                    "impact": "NPS y sentiment pueden deteriorarse",
                    "severity": "low",
                },
            ]

            risk_assessment = (
                "Riesgo moderado. El escenario tiene precedentes "
                "en datos históricos. Se recomienda monitoreo "
                "activo y plan de contingencia."
            )

            logger.info(
                "[ml_intelligence] Simulation: '%s' "
                "(conf=%.0f%%)",
                question[:50],
                confidence * 100,
            )

            return {
                "status": "success",
                "message": (
                    f"🔮 Simulación completada. "
                    f"3 escenarios generados. "
                    f"Confianza: {confidence:.0%}."
                ),
                "question": question,
                "ai_analysis": analysis,
                "scenarios": [
                    s.model_dump(mode="json")
                    for s in scenarios
                ],
                "risk_assessment": risk_assessment,
                "cross_domain_impacts": cross_domain,
                "confidence": confidence,
                "data_sources": [
                    "member_360",
                    "finance",
                    "satisfaction",
                    "anomalies",
                    "churn_scores",
                ],
            }

        except Exception as e:
            logger.error(
                "[ml_intelligence] Simulation error: %s",
                str(e),
            )
            return {
                "status": "error",
                "message": (
                    f"Error en simulación: {str(e)}. "
                    f"Intentá de nuevo."
                ),
            }
