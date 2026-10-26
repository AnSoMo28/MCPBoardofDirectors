"""
Advisor Intelligence Agent — AI-powered strategic analysis.
Transforms deterministic insights into rich narratives,
action plans, scenario simulations, and board briefings.

Uses Claude as auxiliary analysis engine.
All data arrives from frontend as params — no repository needed.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.ai.claude_service import ClaudeService
from club_mcp.ai.prompts import (
    ADVISOR_ACTION_PLAN_PROMPT,
    ADVISOR_ACTION_PLAN_SYSTEM,
    ADVISOR_ASK_PROMPT,
    ADVISOR_ASK_SYSTEM,
    ADVISOR_BOARD_BRIEF_PROMPT,
    ADVISOR_BOARD_BRIEF_SYSTEM,
    ADVISOR_NARRATIVE_PROMPT,
    ADVISOR_NARRATIVE_SYSTEM,
    ADVISOR_SCENARIO_PROMPT,
    ADVISOR_SCENARIO_SYSTEM,
)
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.hitl.notifier import HITLNotifier
from club_mcp.models.advisor_intelligence import (
    ActionPlanResult,
    AdvisorAnswerResult,
    BoardBriefResult,
    InsightNarrativeResult,
    ScenarioSimulationResult,
)

logger = logging.getLogger(__name__)

AVAILABLE_TOOLS_DESCRIPTION = """
finance:
  - finance_expense_create (HITL): Crear gasto
  - finance_invoice_create (HITL): Crear factura
  - finance_budget_check (AUTO): Verificar presupuesto
  - finance_payment_process (HITL): Procesar pago
  - finance_report_generate (SEMI): Generar reporte financiero
  - finance_account_status (AUTO): Estado de cuenta
  - finance_category_update (SEMI): Actualizar categoría presupuestaria

events:
  - event_create (HITL): Crear evento
  - event_clone_template (SEMI): Clonar evento como template
  - event_manage_rsvps (AUTO/HITL): Gestionar RSVPs
  - event_manage_capacity (AUTO): Gestionar capacidad
  - event_generate_report (SEMI): Generar reporte de eventos

hitl:
  - get_pending_approvals (AUTO): Ver aprobaciones pendientes
  - approve_request (AUTO): Aprobar solicitud
  - reject_request (AUTO): Rechazar solicitud

executive_dashboard:
  - get_executive_summary (AUTO): Resumen ejecutivo
  - detect_anomalies (AUTO): Detectar anomalías
  - generate_quarterly_board_report (HITL): Reporte para junta
  - export_report (SEMI): Exportar reporte PDF
"""


class AdvisorIntelligenceAgent(BaseAgent):
    """AI-powered advisor that transforms data into strategic intelligence."""

    agent_name = "advisor_intelligence"
    description = (
        "Motor de inteligencia analítica del Advisor. "
        "Genera narrativas, planes de acción, simulaciones y briefings "
        "usando Claude como engine de razonamiento."
    )

    def __init__(
        self,
        claude_service: ClaudeService,
        approval_engine: ApprovalEngine,
        notifier: HITLNotifier,
    ) -> None:
        super().__init__()
        self.claude = claude_service
        self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        """Legacy hook — tools registered via @MCPTool decorator."""
        pass

    # ── Tool 1: Insight Narrative ──────────────────────────

    @MCPTool(
        "generate_insight_narrative",
        "Genera análisis narrativo profundo para un insight del Advisor",
        ApprovalLevel.AUTO,
    )
    async def generate_insight_narrative(
        self,
        insight_data: dict[str, Any],
        financial_context: Optional[dict[str, Any]] = None,
        events_context: Optional[dict[str, Any]] = None,
        role: str = "admin",
    ) -> dict[str, Any]:
        """Transform a deterministic insight into an AI-powered narrative."""
        insight_id = insight_data.get("id", "unknown")

        # Build prompt with available context
        fin_ctx = json.dumps(financial_context, ensure_ascii=False, indent=2) if financial_context else "No disponible"
        evt_ctx = json.dumps(events_context, ensure_ascii=False, indent=2) if events_context else "No disponible"

        user_prompt = ADVISOR_NARRATIVE_PROMPT.format(
            insight_data=json.dumps(insight_data, ensure_ascii=False, indent=2),
            financial_context=fin_ctx,
            events_context=evt_ctx,
            role=role,
            insight_id=insight_id,
        )

        fallback = {
            "insight_id": insight_id,
            "root_cause": "No se pudo generar análisis automático.",
            "benchmark_comparison": "",
            "recommendation": "Revisar manualmente los datos del insight.",
            "estimated_impact": "",
            "full_narrative": insight_data.get("reasoning", ""),
            "adjusted_confidence": insight_data.get("confidence", 50),
        }

        result = await self.claude.generate_json(
            system_prompt=ADVISOR_NARRATIVE_SYSTEM,
            user_prompt=user_prompt,
            max_tokens=1500,
            fallback=fallback,
        )

        # Validate structure
        try:
            validated = InsightNarrativeResult(**result)
            return {
                "status": "success",
                "narrative": validated.model_dump(),
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
        except Exception:
            logger.warning(
                "[AdvisorIntel] Narrative validation failed for %s, using fallback",
                insight_id,
            )
            return {
                "status": "success",
                "narrative": fallback,
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }

    # ── Tool 2: Action Plan ────────────────────────────────

    @MCPTool(
        "generate_action_plan",
        "Genera un plan de acción ejecutable priorizado a partir de insights",
        ApprovalLevel.AUTO,
    )
    async def generate_action_plan(
        self,
        insights: list[dict[str, Any]],
        role: str = "admin",
        timeframe: str = "week",
    ) -> dict[str, Any]:
        """Generate a prioritized action plan from advisor insights."""
        user_prompt = ADVISOR_ACTION_PLAN_PROMPT.format(
            insights_data=json.dumps(insights, ensure_ascii=False, indent=2),
            role=role,
            timeframe=timeframe,
        )

        fallback = {
            "summary": "No se pudo generar el plan automático. Revisá los insights manualmente.",
            "items": [],
            "total_estimated_impact": "No calculado",
        }

        result = await self.claude.generate_json(
            system_prompt=ADVISOR_ACTION_PLAN_SYSTEM.format(
                available_tools=AVAILABLE_TOOLS_DESCRIPTION,
            ),
            user_prompt=user_prompt,
            max_tokens=2500,
            fallback=fallback,
        )

        # Validate — allow partial results
        try:
            validated = ActionPlanResult(**result)
            return {
                "status": "success",
                "plan": validated.model_dump(),
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
        except Exception as exc:
            logger.warning("[AdvisorIntel] Plan validation failed: %s", exc)
            # Try to salvage partial items
            items = result.get("items", [])
            return {
                "status": "success",
                "plan": {
                    "summary": result.get("summary", fallback["summary"]),
                    "items": items if isinstance(items, list) else [],
                    "total_estimated_impact": result.get("total_estimated_impact", "No calculado"),
                },
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }

    # ── Tool 3: Scenario Simulation ────────────────────────

    @MCPTool(
        "simulate_scenario",
        "Modela escenarios financieros optimista/base/pesimista",
        ApprovalLevel.AUTO,
    )
    async def simulate_scenario(
        self,
        base_data: dict[str, Any],
        proposed_changes: list[dict[str, Any]],
        timeframe: str = "quarter",
    ) -> dict[str, Any]:
        """Simulate financial scenarios with projected outcomes."""
        user_prompt = ADVISOR_SCENARIO_PROMPT.format(
            base_data=json.dumps(base_data, ensure_ascii=False, indent=2),
            proposed_changes=json.dumps(proposed_changes, ensure_ascii=False, indent=2),
            timeframe=timeframe,
        )

        fallback = {
            "scenarios": [],
            "risk_assessment": "No se pudo generar simulación automática.",
            "recommended_scenario": "base",
        }

        result = await self.claude.generate_json(
            system_prompt=ADVISOR_SCENARIO_SYSTEM,
            user_prompt=user_prompt,
            max_tokens=2000,
            fallback=fallback,
        )

        try:
            validated = ScenarioSimulationResult(**result)
            return {
                "status": "success",
                "simulation": validated.model_dump(),
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
        except Exception as exc:
            logger.warning("[AdvisorIntel] Simulation validation failed: %s", exc)
            return {
                "status": "success",
                "simulation": result if isinstance(result, dict) else fallback,
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }

    # ── Tool 4: Board Brief ────────────────────────────────

    @MCPTool(
        "generate_board_brief",
        "Genera briefing ejecutivo para la Junta Directiva",
        ApprovalLevel.AUTO,
    )
    async def generate_board_brief(
        self,
        executive_summary: dict[str, Any],
        financial_data: dict[str, Any],
        events_summary: dict[str, Any],
        anomalies: list[dict[str, Any]],
        recommendations: list[dict[str, Any]],
        period: str = "current_quarter",
    ) -> dict[str, Any]:
        """Generate a board-ready executive briefing document."""
        user_prompt = ADVISOR_BOARD_BRIEF_PROMPT.format(
            executive_summary=json.dumps(executive_summary, ensure_ascii=False, indent=2),
            financial_data=json.dumps(financial_data, ensure_ascii=False, indent=2),
            events_summary=json.dumps(events_summary, ensure_ascii=False, indent=2),
            anomalies=json.dumps(anomalies, ensure_ascii=False, indent=2),
            recommendations=json.dumps(recommendations, ensure_ascii=False, indent=2),
            period=period,
        )

        fallback = {
            "brief_md": "# Briefing no disponible\n\nNo se pudo generar el briefing automático. Revise los datos manualmente.",
            "key_points": [],
            "talking_points": [],
            "q_and_a": [],
        }

        result = await self.claude.generate_json(
            system_prompt=ADVISOR_BOARD_BRIEF_SYSTEM,
            user_prompt=user_prompt,
            max_tokens=3000,
            fallback=fallback,
        )

        try:
            validated = BoardBriefResult(**result)
            return {
                "status": "success",
                "brief": validated.model_dump(),
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
        except Exception as exc:
            logger.warning("[AdvisorIntel] Board brief validation failed: %s", exc)
            return {
                "status": "success",
                "brief": {
                    "brief_md": result.get("brief_md", fallback["brief_md"]),
                    "key_points": result.get("key_points", []),
                    "talking_points": result.get("talking_points", []),
                    "q_and_a": result.get("q_and_a", []),
                },
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }

    # ── Tool 5: Ask Advisor ────────────────────────────────

    @MCPTool(
        "ask_advisor",
        "Hace una pregunta al Advisor con contexto completo del club",
        ApprovalLevel.AUTO,
    )
    async def ask_advisor(
        self,
        question: str,
        dashboard_context: dict[str, Any],
        role: str = "admin",
        conversation_history: Optional[list[dict[str, Any]]] = None,
    ) -> dict[str, Any]:
        """Answer a natural language question about the club using all available data.

        When conversation_history is provided, the Advisor references its own
        previous answers (including evidence and related insights) to provide
        contextual, building responses rather than isolated answers.
        """
        # ── Format conversation history for context ──
        history_section = ""
        if conversation_history:
            history_lines: list[str] = []
            for entry in conversation_history[-10:]:
                entry_role = entry.get("role", "unknown")
                entry_content = entry.get("content", "")
                label = "Usuario" if entry_role == "user" else "Advisor"
                history_lines.append(f"[{label}]: {entry_content}")
                # Include evidence summary from Advisor responses for richer context
                if entry_role == "assistant" and entry.get("evidence_summary"):
                    for ev in entry["evidence_summary"][:2]:
                        history_lines.append(f"  (evidencia citada: {ev})")
                # Include related insights mentioned
                if entry_role == "assistant" and entry.get("related_insights"):
                    for ri in entry["related_insights"][:2]:
                        history_lines.append(f"  (insight mencionado: {ri})")
            history_section = "\n".join(history_lines)

        user_prompt = ADVISOR_ASK_PROMPT.format(
            question=question,
            dashboard_context=json.dumps(dashboard_context, ensure_ascii=False, indent=2),
            role=role,
        )

        # Append conversation history to prompt when available
        if history_section:
            user_prompt += (
                "\n\n---\n"
                "HISTORIAL DE CONVERSACIÓN RECIENTE "
                "(referenciá tus respuestas anteriores cuando sea relevante. "
                "No repitas información que ya diste — construí sobre ella):\n"
                f"{history_section}\n"
                "---"
            )

        fallback = {
            "answer": "No pude procesar tu pregunta con los datos disponibles. Intentá ser más específico o revisá los dashboards directamente.",
            "evidence": [],
            "related_insights": [],
            "suggested_action": None,
        }

        result = await self.claude.generate_json(
            system_prompt=ADVISOR_ASK_SYSTEM,
            user_prompt=user_prompt,
            max_tokens=2000,
            fallback=fallback,
        )

        try:
            validated = AdvisorAnswerResult(**result)
            return {
                "status": "success",
                "answer": validated.model_dump(),
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
        except Exception as exc:
            logger.warning("[AdvisorIntel] Ask validation failed: %s", exc)
            return {
                "status": "success",
                "answer": {
                    "answer": result.get("answer", fallback["answer"]),
                    "evidence": result.get("evidence", []),
                    "related_insights": result.get("related_insights", []),
                    "suggested_action": result.get("suggested_action"),
                },
                "_approval_level": ApprovalLevel.AUTO.value,
                "_agent": self.agent_name,
            }
