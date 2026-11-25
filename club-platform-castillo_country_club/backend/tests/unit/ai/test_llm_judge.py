"""Suite del LLM-as-judge — Ola 3.4 (Q-LLM-04).

Gate del juez: hard gate determinista + LLM aditivo con contrato.
Esta suite corre SIN red y SIN anthropic: el cliente es un stub de
15 líneas que cumple el Protocol ``LLMClient`` — la prueba es del
juez, no del proveedor.

  1. HARD GATE: placeholder crudo reprueba ANTES del LLM — el stub
     nunca se consulta (contador de llamadas en 0).
  2. Rúbrica: require/forbid/largo, score y notas.
  3. Sin cliente: veredicto = rúbrica, degraded=True (CI sin key).
  4. LLM conforme: veredicto pass, degraded=False, judge="rubric+llm".
  5. LLM que rompe su contrato JSON: degraded, no pass.
  6. LLM que absuelve lo reprobado: IMPOSIBLE — el gate corta antes.
  7. Contratos de los specs judge.system/judge.eval en el registry.
"""
from __future__ import annotations

import json
from typing import Any

import pytest

from club_mcp.ai.llm_judge import (
    DEFAULT_RUBRIC,
    LLMClient,
    RubricCriterion,
    evaluate_rubric,
    judge_response,
)
from club_mcp.ai.prompt_registry import get_prompt

RESPUESTA_BUENA = (
    "Hola Ana, con gusto te cuento sobre las actividades del club este "
    "fin de semana: el sábado tenemos asado familiar desde las 12:30 y "
    "el domingo torneo de tenis en la cancha central. ¡Te esperamos!"
)
RESPUESTA_PLACEHOLDER = "Hola {name}, bienvenido al club de los {familia}."
RESPUESTA_FALLBACK = (
    "Lo siento, hubo un error procesando tu solicitud. Por favor "
    "intenta de nuevo." * 2
)


class StubClient:
    """Cliente LLM de mentira que cumple el Protocol — cuenta llamadas."""

    def __init__(self, content: str) -> None:
        self.content = content
        self.calls = 0

    async def chat(self, user_message: str, **kwargs: Any) -> dict[str, Any]:
        self.calls += 1
        return {"content": self.content, "stop_reason": "end_turn",
                "usage": {"input_tokens": 10, "output_tokens": 10}}


LLM_CONFORME = json.dumps({
    "verdict": "PASS",
    "score": 88,
    "criteria": [{"id": "tono", "result": "PASS", "note": "cálido y útil"}],
    "summary": "Respuesta útil y en tono de club.",
})
LLM_ROTO = "La respuesta me parece muy buena, aprobada sin reservas."
LLM_ABSUELVE = json.dumps({
    "verdict": "PASS",
    "score": 95,
    "criteria": [{"id": "tono", "result": "PASS", "note": "prosa perfecta"}],
    "summary": "Perfecta.",
})


# ── 1 · HARD GATE: la rúbrica reprueba ANTES de gastar el LLM ──
@pytest.mark.asyncio
async def test_hard_gate_placeholder_no_consulta_llm() -> None:
    stub = StubClient(LLM_ABSUELVE)
    out = await judge_response(RESPUESTA_PLACEHOLDER, DEFAULT_RUBRIC, client=stub)
    assert out["verdict"] == "fail"
    assert out["degraded"] is True
    assert stub.calls == 0  # el LLM NUNCA se consultó
    assert out["deterministic"]["failed_ids"] == ["no_unresolved_placeholders"]


# ── 2 · rúbrica determinista: require/forbid/largo ──────────────
def test_rubrica_require_forbid_largo() -> None:
    v = evaluate_rubric(RESPUESTA_FALLBACK, DEFAULT_RUBRIC)
    assert not v.ok
    assert "no_fallback_apology" in v.failed_ids
    v2 = evaluate_rubric("ok", DEFAULT_RUBRIC)
    assert not v2.ok
    assert "longitud_util" in v2.failed_ids
    v3 = evaluate_rubric(RESPUESTA_BUENA, DEFAULT_RUBRIC)
    assert v3.ok and v3.score == 100


def test_rubrica_score_proporcional() -> None:
    crits = (
        RubricCriterion(id="a", description="x", require_any=("hola",)),
        RubricCriterion(id="b", description="y", min_len=5),
    )
    v = evaluate_rubric("adiós mundo cruel", crits)  # falla a, pasa b
    # 3 resultados (gate placeholders + a + b), 2 pasan → 67
    assert v.score == 67 and "a" in v.failed_ids


# ── 3 · sin cliente: la rúbrica ES el veredicto (CI sin key) ────
@pytest.mark.asyncio
async def test_sin_cliente_degradado_pero_firmante() -> None:
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=None)
    assert out["verdict"] == "pass"
    assert out["degraded"] is True
    assert out["judge"] == "rubric"
    # fingerprint del prompt del juez presente — evidencia Ola 3.3
    assert out["judge_prompt_sha256"] == get_prompt("judge.system").sha256
    assert out["judge_eval_sha256"] == get_prompt("judge.eval").sha256


# ── 4 · LLM conforme: pass real, no degradado ───────────────────
@pytest.mark.asyncio
async def test_llm_conforme_pass() -> None:
    stub = StubClient(LLM_CONFORME)
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=stub)
    assert stub.calls == 1
    assert out["verdict"] == "pass"
    assert out["degraded"] is False
    assert out["judge"] == "rubric+llm"
    assert out["score"] == 88
    assert out["summary"] == "Respuesta útil y en tono de club."


# ── 5 · LLM que rompe su contrato JSON: degradado, no pass ──────
@pytest.mark.asyncio
async def test_llm_contracto_roto_degradado() -> None:
    stub = StubClient(LLM_ROTO)
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=stub)
    assert stub.calls == 1
    assert out["degraded"] is True
    assert out["judge"] == "rubric+llm-contract"
    assert "contrato" in out["judge_error"]


# ── 6 · LLM con cercadura markdown: tolerante, cuenta conforme ─
@pytest.mark.asyncio
async def test_llm_cercado_markdown_igual_valido() -> None:
    stub = StubClient("```json\n%s\n```" % LLM_CONFORME)
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=stub)
    assert out["degraded"] is False
    assert out["judge"] == "rubric+llm"


# ── 7 · specs del juez en el registry: contrato y fingerprints ──
def test_specs_juez_versionados() -> None:
    sys_spec = get_prompt("judge.system")
    ev_spec = get_prompt("judge.eval")
    assert sys_spec.version == "1.0.0"
    assert sys_spec.variables == ()  # el ejemplo JSON es LITERAL
    assert ev_spec.variables == ("rubric", "candidate", "deterministic")
    # el render del eval lleva las tres secciones y el aviso del gate
    r = ev_spec.render(rubric="RR", candidate="CC", deterministic="DD")
    assert "RÚBRICA (criterios verificables):\nRR" in r
    assert "RESPUESTA CANDIDATA:\nCC" in r
    assert "DD" in r and "hard gate" in r


# ── 8 · LLM que falla de red: juez caído ≠ respuesta aprobada ───
class BoomClient:
    async def chat(self, user_message: str, **kwargs: Any) -> dict[str, Any]:
        raise ConnectionError("sin red")


@pytest.mark.asyncio
async def test_llm_caido_no_absuelve() -> None:
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=BoomClient())
    assert out["degraded"] is True
    assert out["judge"] == "rubric+llm-error"
    assert out["verdict"] == "pass"  # la rúbrica pasó; el juicio LLM no fue
    assert "sin red" in out["judge_error"]


# ── camino LLM real (integration): sin key, skip limpio ─────────
# El unit de arriba prueba el juez con stub. Este prueba que el
# PROMPT del juez (judge.system/judge.eval) funciona contra un LLM
# real: mismo contrato JSON, mismo hard gate. Corre bajo demanda:
#   ANTHROPIC_API_KEY=... uv run pytest -m integration tests/unit/ai/test_llm_judge.py
import os

@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.skipif(not os.environ.get("ANTHROPIC_API_KEY"), reason="sin ANTHROPIC_API_KEY — camino LLM real bajo demanda")
async def test_integration_juez_llm_real() -> None:
    from club_mcp.ai.claude_service import ClaudeService

    client = ClaudeService()
    out = await judge_response(RESPUESTA_BUENA, DEFAULT_RUBRIC, client=client)
    assert out["verdict"] in ("pass", "fail")
    assert out["judge"] in ("rubric+llm", "rubric+llm-error", "rubric+llm-contract")
    # fingerprint del prompt del juez presente aunque el LLM falle
    assert out["judge_prompt_sha256"] == get_prompt("judge.system").sha256
