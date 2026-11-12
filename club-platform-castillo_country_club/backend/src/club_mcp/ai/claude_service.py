"""Claude API service for auxiliary AI analysis.

Claude is used as an auxiliary service for:
  - Sentiment analysis on post-event surveys
  - Narrative report generation
  - Comment assistance
  - Age balance analysis

QWEN powers the MCP Server — Claude does NOT replace it.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Protocol

from anthropic import AsyncAnthropic

from club_mcp.ai.prompts import (
    AGE_BALANCE_PROMPT,
    COMMENT_ASSIST_PROMPT,
    NARRATIVE_REPORT_PROMPT,
    SATISFACTION_ANALYSIS_PROMPT,
    SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)


class ClaudeServiceLike(Protocol):
    """Contrato estructural de ClaudeService (G12, Q-LLM-01).

    `get_claude_service` puede devolver ClaudeService O su wrapper
    ResilientClaudeService (proxy con la misma interfaz). Tipar contra
    este Protocol — y no contra la clase concreta — es lo que permite
    sustituir la implementación sin tocar consumidores NI mypy.
    """

    async def chat(
        self,
        user_message: str,
        user_role: str = "socio",
        user_name: str = "",
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]: ...

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
    ) -> dict[str, Any]: ...

    async def analyze_satisfaction(
        self,
        event_data: dict[str, Any],
        surveys: list[dict[str, Any]],
    ) -> dict[str, Any]: ...


class ClaudeService:
    """Async Claude API client for auxiliary club analysis."""

    def __init__(
        self,
        api_key: str = "",
        model: str = "claude-sonnet-4-20250514",
    ) -> None:
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model
        self.system_prompt = SYSTEM_PROMPT

    async def chat(
        self,
        user_message: str,
        user_role: str = "socio",
        user_name: str = "",
        history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Conversational chat with role-aware context."""
        messages = list(history) if history else []
        messages.append({"role": "user", "content": user_message})

        context = (
            f"{self.system_prompt}\n\n"
            f"Usuario actual: {user_name} (rol: {user_role}). "
            f"Ajusta el nivel de detalle según el rol."
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=context,
                messages=messages,
            )

            return {
                "content": (
                    response.content[0].text if response.content else ""
                ),
                "stop_reason": response.stop_reason,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            }
        except Exception as exc:
            logger.error("Claude chat error: %s", exc)
            return {
                "content": (
                    "Lo siento, hubo un error procesando tu solicitud. "
                    "Por favor intenta de nuevo."
                ),
                "stop_reason": "error",
                "usage": {"input_tokens": 0, "output_tokens": 0},
                "error": str(exc),
            }

    async def analyze_satisfaction(
        self,
        event_data: dict[str, Any],
        surveys: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """AI-powered satisfaction analysis for post-event surveys."""
        prompt = SATISFACTION_ANALYSIS_PROMPT.format(
            event_data=json.dumps(event_data, ensure_ascii=False, indent=2),
            total_surveys=len(surveys),
            surveys_sample=json.dumps(
                surveys[:10], ensure_ascii=False, indent=2
            ),
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=(
                    "Eres un analista de datos especializado en "
                    "satisfacción de miembros de clubes privados."
                ),
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text if response.content else "{}"

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {
                    "trend": "stable",
                    "praises": [],
                    "improvements": [],
                    "recommendations": [text],
                    "quotes": [],
                }
        except Exception as exc:
            logger.error("Claude satisfaction analysis error: %s", exc)
            return {
                "trend": "unknown",
                "praises": [],
                "improvements": [],
                "recommendations": [],
                "quotes": [],
                "error": str(exc),
            }

    async def generate_narrative_report(
        self,
        kpis: dict[str, Any],
        audience: str = "board",
    ) -> str:
        """Generate a narrative executive report from KPIs."""
        prompt = NARRATIVE_REPORT_PROMPT.format(
            kpis=json.dumps(kpis, ensure_ascii=False, indent=2),
            audience=audience,
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=(
                    "Eres un consultor senior de clubes privados "
                    "especializado en reportes ejecutivos."
                ),
                messages=[{"role": "user", "content": prompt}],
            )

            return response.content[0].text if response.content else ""
        except Exception as exc:
            logger.error("Claude narrative report error: %s", exc)
            return f"Error generando reporte narrativo: {exc}"

    async def assist_comment(
        self,
        survey_ratings: dict[str, int],
    ) -> str:
        """Help a member write a constructive comment based on ratings."""
        prompt = COMMENT_ASSIST_PROMPT.format(
            ratings=json.dumps(survey_ratings, ensure_ascii=False),
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=256,
                system=(
                    "Eres un asistente que ayuda a socios a redactar "
                    "comentarios constructivos sobre eventos del club."
                ),
                messages=[{"role": "user", "content": prompt}],
            )

            return response.content[0].text if response.content else ""
        except Exception as exc:
            logger.error("Claude comment assist error: %s", exc)
            return ""

    async def analyze_age_balance(
        self,
        distribution_data: dict[str, Any],
    ) -> dict[str, Any]:
        """Analyze age group activity distribution with Gini coefficient."""
        prompt = AGE_BALANCE_PROMPT.format(
            distribution_data=json.dumps(
                distribution_data, ensure_ascii=False, indent=2
            ),
        )

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=512,
                system=(
                    "Eres un analista de datos especializado en "
                    "distribución demográfica de clubes privados."
                ),
                messages=[{"role": "user", "content": prompt}],
            )

            text = response.content[0].text if response.content else "{}"

            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {
                    "gini_coefficient": 0.0,
                    "balance_score": "unknown",
                    "overrepresented": [],
                    "underrepresented": [],
                    "recommendations": [text],
                }
        except Exception as exc:
            logger.error("Claude age balance analysis error: %s", exc)
            return {
                "gini_coefficient": 0.0,
                "balance_score": "unknown",
                "overrepresented": [],
                "underrepresented": [],
                "recommendations": [],
                "error": str(exc),
            }

    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
    ) -> dict[str, Any]:
        """Generic AI generation with custom system prompt.

        Used by Advisor Intelligence agent for specialized analysis.
        Returns raw text content — use generate_json() for structured output.
        """
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )

            text = response.content[0].text if response.content else ""

            return {
                "content": text,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            }
        except Exception as exc:
            logger.error("Claude generate error: %s", exc)
            return {
                "content": "",
                "usage": {"input_tokens": 0, "output_tokens": 0},
                "error": str(exc),
            }

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
        fallback: Any = None,
    ) -> dict[str, Any]:
        """Generate AI output and parse as JSON.

        Handles common Claude output patterns:
        - Pure JSON response
        - JSON wrapped in ```json ... ``` code blocks
        - JSON wrapped in ``` ... ``` code blocks
        - Fallback to raw text if parsing fails
        """
        result = await self.generate(system_prompt, user_prompt, max_tokens)

        if result.get("error"):
            return fallback if fallback is not None else {"error": result["error"]}

        content: str = result["content"]
        if not content.strip():
            return fallback if fallback is not None else {"error": "Empty response"}

        # Try direct JSON parse
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Try extracting from ```json ... ``` blocks
        if "```json" in content:
            try:
                json_str = content.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass

        # Try extracting from ``` ... ``` blocks
        if "```" in content:
            try:
                json_str = content.split("```")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass

        # Fallback: return raw content wrapped in dict
        return fallback if fallback is not None else {"raw_content": content}


_claude_service_instance: ClaudeServiceLike | None = None


def get_claude_service() -> ClaudeServiceLike:
    """Singleton factory for the shared ClaudeService instance.

    ml_intelligence (y cualquier agente que no reciba la inyección del
    bootstrap) resuelve su cliente Claude por acá, igual que el patrón
    document_intelligence. Thread-safe por GIL; la primera llamada paga
    la construcción, el resto reutiliza la instancia (y su cliente HTTP).

    G12 (Q-LLM-01): devuelve el wrapper resilient (misma interfaz —
    retry/timeout/breaker/fallback-Ollama transparentes para el llamador).
    """
    global _claude_service_instance
    if _claude_service_instance is None:
        from club_mcp.ai.resilience import build_resilient_claude_service

        _claude_service_instance = build_resilient_claude_service(ClaudeService())
    return _claude_service_instance

