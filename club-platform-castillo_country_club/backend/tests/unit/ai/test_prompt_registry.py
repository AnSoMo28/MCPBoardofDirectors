"""Suite del vertical Ola 3.3 — prompts versionados (Q-LLM-03).

Gate del registry: 41 specs (Ola 3.4: +judge.system/judge.eval) ·
render validado ANTES de gastar la
llamada · contrato observable == ``str.format`` byte a byte.

Lo que este archivo verifica (cada test es UNA garantía):
  1. CENSO COMPLETO: el registro tiene los 39 prompts del árbol
     (11 agent · 12 message · 16 nominados) y cada template es BYTE A
     BYTE el texto vivo de ``ai/prompts.py`` — la v1.0.0 no es una
     re-transcripción, es el mismo objeto de texto.
  2. CONTRATO DE RENDER: para los mismos kwargs,
     ``render() == template.format(**kwargs)`` — el swap de los 3
     consumidores no cambia NI UN BYTE de lo que viaja al LLM.
  3. PUERTA VALIDADA: kwarg faltante y kwarg sobrante son
     ``ValueError`` legible (con el diff) ANTES de la llamada — hoy
     mismo un ``insight_id`` tipografiado es silencio o ``KeyError``
     tarde, frente al socio.
  4. VARIABLES DERIVADAS: el contrato sale del template con
     ``string.Formatter`` — los 38 placeholders del árbol censados
     sin que nadie los mantenga a mano (un template que cambia de
     variables cambia el contrato solo).
  5. FINGERPRINT ESTABLE: ``sha256`` del template es determinista
     entre procesos — la semilla del golden set de Ola 3.4 (saber
     QUÉ prompt exacto corrió en cada llamada).
  6. DEDUPE RAG: ``rag_service.RAG_SYSTEM_PROMPT`` es ahora el
     template del registry — la copia huérfana de ``ai/prompts.py``
     y la viva de ``rag_service.py`` ya no pueden bifurcarse (eran
     idénticas byte a byte por disciplina, no por contrato).
  7. CONSUMIDORES SOBRE EL REGISTRY: los 4 puntos de render del
     árbol (claude_service · advisor · family_profile · rag) usan
     ``render_prompt``/``get_prompt`` — cero ``.format()`` crudo
     sobre constantes de prompts en src/.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from club_mcp.ai import prompts as prompts_module
from club_mcp.ai.prompt_registry import (
    PROMPT_REGISTRY,
    PromptSpec,
    get_prompt,
    registry_snapshot,
    render_prompt,
)

SRC = Path(__file__).resolve().parents[3] / "src"


# ── 1 · censo completo: 39 specs = el árbol vivo ────────────────
def test_censo_41_specs_byte_a_byte() -> None:
    assert len(PROMPT_REGISTRY) == 41
    snapshot = registry_snapshot()
    assert len(snapshot) == 41

    # los dicts entran con prefijo canónico
    for key in prompts_module.AGENT_SYSTEM_PROMPTS:
        spec = PROMPT_REGISTRY[f"agent.{key}"]
        assert spec.template == prompts_module.AGENT_SYSTEM_PROMPTS[key]
    for key in prompts_module.MESSAGE_TEMPLATES:
        spec = PROMPT_REGISTRY[f"message.{key}"]
        assert spec.template == prompts_module.MESSAGE_TEMPLATES[key]

    # los 16 nominados: MISMA cadena de texto, no re-transcripción
    nominados = {
        "system": prompts_module.SYSTEM_PROMPT,
        "satisfaction_analysis": prompts_module.SATISFACTION_ANALYSIS_PROMPT,
        "narrative_report": prompts_module.NARRATIVE_REPORT_PROMPT,
        "comment_assist": prompts_module.COMMENT_ASSIST_PROMPT,
        "age_balance": prompts_module.AGE_BALANCE_PROMPT,
        "advisor.narrative.system": prompts_module.ADVISOR_NARRATIVE_SYSTEM,
        "advisor.narrative": prompts_module.ADVISOR_NARRATIVE_PROMPT,
        "advisor.action_plan.system": prompts_module.ADVISOR_ACTION_PLAN_SYSTEM,
        "advisor.action_plan": prompts_module.ADVISOR_ACTION_PLAN_PROMPT,
        "advisor.scenario.system": prompts_module.ADVISOR_SCENARIO_SYSTEM,
        "advisor.scenario": prompts_module.ADVISOR_SCENARIO_PROMPT,
        "advisor.board_brief.system": prompts_module.ADVISOR_BOARD_BRIEF_SYSTEM,
        "advisor.board_brief": prompts_module.ADVISOR_BOARD_BRIEF_PROMPT,
        "advisor.ask.system": prompts_module.ADVISOR_ASK_SYSTEM,
        "advisor.ask": prompts_module.ADVISOR_ASK_PROMPT,
        "rag": prompts_module.RAG_SYSTEM_PROMPT,
        "judge.system": prompts_module.JUDGE_SYSTEM_PROMPT,
        "judge.eval": prompts_module.JUDGE_EVAL_PROMPT,
    }
    for name, template in nominados.items():
        assert PROMPT_REGISTRY[name].template == template, name
    # 23 (dicts) + 18 (nominados, Ola 3.4: +juez) = 41 — sin huecos
    assert len(PROMPT_REGISTRY) == 23 + len(nominados)


# ── 2 · contrato observable: render == format byte a byte ───────
def test_render_es_format_byte_a_byte() -> None:
    casos: list[tuple[str, dict[str, object]]] = [
        ("message.birthday", {"name": "Ana", "age": 7}),
        ("message.event_invitation", {
            "family_name": "Los Herrera",
            "event_title": "Asado familiar",
            "event_date": "2026-12-05",
            "event_location": "Terraza",
        }),
        (
            "advisor.action_plan.system",
            {"available_tools": "tool_a, tool_b"},
        ),
        (
            "advisor.narrative",
            {
                "insight_data": '{"kpi": "churn"}',
                "financial_context": "No disponible",
                "events_context": "No disponible",
                "role": "ADMIN",
                "insight_id": "ins-001",
            },
        ),
        (
            "advisor.board_brief",
            {
                "executive_summary": "{}",
                "financial_data": "{}",
                "events_summary": "{}",
                "anomalies": "[]",
                "recommendations": "[]",
                "period": "Q4-2026",
            },
        ),
        (
            "satisfaction_analysis",
            {
                "event_data": '{"title": "Asado"}',
                "total_surveys": 3,
                "surveys_sample": "[]",
            },
        ),
        (
            "narrative_report",
            {"kpis": "{}", "audience": "board"},
        ),
        ("comment_assist", {"ratings": '{"food": 5}'}),
        ("age_balance", {"distribution_data": "{}"}),
        (
            "advisor.scenario",
            {
                "base_data": "{}",
                "proposed_changes": "[]",
                "timeframe": "6 meses",
            },
        ),
        (
            "advisor.ask",
            {
                "question": "¿Cuántos socios activos?",
                "dashboard_context": "{}",
                "role": "SOCIO",
            },
        ),
    ]
    for name, kwargs in casos:
        spec = get_prompt(name)
        assert spec.render(**kwargs) == spec.template.format(**kwargs), name


# ── 3 · puerta validada: falta y sobra → ValueError legible ─────
def test_kwarg_faltante_es_valueerror() -> None:
    with pytest.raises(ValueError, match="faltan"):
        render_prompt("message.birthday", name="Ana")


def test_kwarg_sobrante_es_valueerror() -> None:
    with pytest.raises(ValueError, match="sobran"):
        render_prompt("message.birthday", name="Ana", age=7, typo=1)


def test_nombre_desconocido_lista_validos() -> None:
    with pytest.raises(KeyError, match="no está en el registro"):
        render_prompt("message.cumpleaños")  # typo intencional


# ── 4 · variables derivadas del template (no mantenidas a mano) ─
def test_variables_derivadas_y_censo_38_placeholders() -> None:
    todos: set[str] = set()
    for spec in PROMPT_REGISTRY.values():
        todos.update(spec.variables)
    # los 38 placeholders del árbol (35 + rubric/candidate/
    # deterministic del juez, Ola 3.4), censados por derivación
    assert len(todos) == 38, sorted(todos)
    # contratos puntuales que los call-sites ya dependen de ellos
    assert get_prompt("advisor.narrative").variables == (
        "insight_data", "financial_context", "events_context", "role", "insight_id",
    )
    assert set(get_prompt("advisor.action_plan.system").variables) == {
        "available_tools",
    }


# ── 5 · fingerprint estable entre procesos ──────────────────────
def test_sha256_determinista_entre_procesos() -> None:
    snap = get_prompt("rag")
    codigo = (
        "from club_mcp.ai.prompt_registry import get_prompt;"
        f"s = get_prompt({snap.name!r});"
        "print(s.sha256, s.template == get_prompt('rag').template)"
    )
    out = subprocess.run(
        [sys.executable, "-c", codigo],
        capture_output=True, text=True, check=True,
    )
    digest, same = out.stdout.split()
    assert same == "True"
    assert digest == snap.sha256  # igual entre procesos


# ── 6 · dedupe RAG: una sola fuente canónica ────────────────────
def test_rag_service_usa_el_registry() -> None:
    from club_mcp.rag.rag_service import RAG_SYSTEM_PROMPT as rag_vivo

    spec = get_prompt("rag")
    assert rag_vivo == spec.template
    # el texto NO cambió con el dedupe: es el que vivía en el árbol
    assert rag_vivo == prompts_module.RAG_SYSTEM_PROMPT


# ── 7 · consumidores: cero .format crudo sobre constantes ───────
def test_consumidores_sin_format_crudo() -> None:
    """Los 4 puntos de render del árbol van por el registry.

    grep NEGATIVO sobre src/: ningún consumidor puede volver a
    ``PROMPTS_ALGO.format(...)`` — la puerta validada es la única
    entrada. (Los ``.format`` de f-strings y de otros módulos no
    cuentan: el patrón ancla en las CONSTANTES de prompts.)
    """
    offenders = [
        f"{p}:{i}"
        for p in [
            "ai/claude_service.py",
            "agents/advisor_intelligence.py",
            "agents/family_profile.py",
            "rag/rag_service.py",
        ]
        for i, line in enumerate(
            (SRC / "club_mcp" / p).read_text().splitlines(), start=1
        )
        if "PROMPT" in line and ".format(" in line and "render_prompt" not in line
    ]
    assert offenders == [], offenders
