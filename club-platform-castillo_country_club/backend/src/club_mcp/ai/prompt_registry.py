"""Registro versionado de prompts — Ola 3.3 (Q-LLM-03).

814 líneas de constantes vivían en ``ai/prompts.py`` SIN versionado y
SIN contrato de variables: un ``.format()`` con un kwarg faltante es un
``KeyError`` que solo estalla DESPUÉS de gastar la llamada al LLM (o en
runtime, frente al socio). Este módulo convierte cada prompt en un
``PromptSpec`` con:
- ``name``: nombre canónico (``satifaction_analysis``, ``advisor.ask``…).
- ``version``: semántico de 3 partes. La v1.0.0 es el texto VIVO del
  árbol en 9cdc841 — el hash lo demuestra (misma cadena de bytes, no
  una re-transcripción).
- ``variables``: derivadas AUTOMÁTICAMENTE del texto con
  ``string.Formatter`` — el contrato no puede mentir ni quedar viejo:
  si el template cambia de variables, la derivación lo sigue sin que
  nadie toque el registro a mano.
- ``sha256``: fingerprint del template exacto — la evidencia que dos
  procesos distintos corrieron el MISMO prompt (semilla del golden set
  de Ola 3.4).

El contrato observable de ``render`` es el de ``str.format``: para los
mismos kwargs, ``render() == template.format(**kwargs)`` byte a byte.
La única diferencia es que ``render`` valida ANTES: kwargs exactos
(ni falta ni sobra) o ``ValueError`` con el diff legible — el error
ocurre en la puerta, no dentro de la llamada al LLM.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from string import Formatter


@dataclass(frozen=True, kw_only=True)
class PromptSpec:
    """Un prompt versionado + su contrato de variables derivado."""

    name: str
    version: str
    template: str

    @property
    def variables(self) -> tuple[str, ...]:
        """Variables del template, derivadas (orden de aparición, únicas)."""
        seen: dict[str, None] = {}
        for _, field_name, _, _ in Formatter().parse(self.template):
            if field_name is not None:
                seen.setdefault(field_name, None)
        return tuple(seen)

    @property
    def sha256(self) -> str:
        """Fingerprint del template exacto (hex, 16 chars — colisión no es amenaza aquí)."""
        return hashlib.sha256(self.template.encode("utf-8")).hexdigest()[:16]

    def render(self, **kwargs: object) -> str:
        """Valida kwargs exactos y renderiza con ``str.format``.

        Regla del contrato: ni falta ni sobra. Los kwargs sobrantes son
        typos silenciosos (``insight_id`` vs ``insights_id``) que hoy
        mueren ahogados; los faltantes son ``KeyError`` tarde. Ambos
        pasan a ser ``ValueError`` legible ANTES de gastar la llamada.
        """
        expected = set(self.variables)
        got = set(kwargs)
        missing = expected - got
        extra = got - expected
        if missing or extra:
            parts = [f"prompt '{self.name}' v{self.version}:"]
            if missing:
                parts.append(f"faltan {sorted(missing)}")
            if extra:
                parts.append(f"sobran {sorted(extra)}")
            parts.append(f"variables del contrato: {sorted(expected)}")
            raise ValueError(" ".join(parts))
        return self.template.format(**kwargs)

    def snapshot(self) -> dict[str, object]:
        """Evidencia ejecutable (para logs / llm_calls / golden set 3.4)."""
        return {
            "name": self.name,
            "version": self.version,
            "sha256": self.sha256,
            "variables": list(self.variables),
            "chars": len(self.template),
        }


def _spec(name: str, version: str, template: str) -> PromptSpec:
    return PromptSpec(name=name, version=version, template=template)


def _specs_from_module(prefix: str, templates: dict[str, str]) -> dict[str, PromptSpec]:
    """Versiona un dict existente (AGENT_SYSTEM_PROMPTS / MESSAGE_TEMPLATES).

    Cada clave del dict vive en ``<prefix>.<key>``. La v1.0.0 es el
    texto vivo — se pasa tal cual, sin re-transcribir.
    """
    return {
        f"{prefix}.{key}": _spec(f"{prefix}.{key}", "1.0.0", text)
        for key, text in templates.items()
    }


from club_mcp.ai.prompts import (  # noqa: E402
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
    AGE_BALANCE_PROMPT,
    AGENT_SYSTEM_PROMPTS,
    COMMENT_ASSIST_PROMPT,
    MESSAGE_TEMPLATES,
    NARRATIVE_REPORT_PROMPT,
    RAG_SYSTEM_PROMPT,
    SATISFACTION_ANALYSIS_PROMPT,
    SYSTEM_PROMPT,
)


# ── Registro vivo: 39 prompts · v1.0.0 = texto del árbol @ 9cdc841 ──
# (los 11 de agente + 12 message templates entran por dict con sus
# prefijos canónicos; los 16 nominados a mano porque viven sueltos).
PROMPT_REGISTRY: dict[str, PromptSpec] = {
    **_specs_from_module("agent", AGENT_SYSTEM_PROMPTS),
    **_specs_from_module("message", MESSAGE_TEMPLATES),
    "system": _spec("system", "1.0.0", SYSTEM_PROMPT),
    "satisfaction_analysis": _spec(
        "satisfaction_analysis", "1.0.0", SATISFACTION_ANALYSIS_PROMPT
    ),
    "narrative_report": _spec("narrative_report", "1.0.0", NARRATIVE_REPORT_PROMPT),
    "comment_assist": _spec("comment_assist", "1.0.0", COMMENT_ASSIST_PROMPT),
    "age_balance": _spec("age_balance", "1.0.0", AGE_BALANCE_PROMPT),
    "advisor.narrative.system": _spec(
        "advisor.narrative.system", "1.0.0", ADVISOR_NARRATIVE_SYSTEM
    ),
    "advisor.narrative": _spec("advisor.narrative", "1.0.0", ADVISOR_NARRATIVE_PROMPT),
    "advisor.action_plan.system": _spec(
        "advisor.action_plan.system", "1.0.0", ADVISOR_ACTION_PLAN_SYSTEM
    ),
    "advisor.action_plan": _spec(
        "advisor.action_plan", "1.0.0", ADVISOR_ACTION_PLAN_PROMPT
    ),
    "advisor.scenario.system": _spec(
        "advisor.scenario.system", "1.0.0", ADVISOR_SCENARIO_SYSTEM
    ),
    "advisor.scenario": _spec("advisor.scenario", "1.0.0", ADVISOR_SCENARIO_PROMPT),
    "advisor.board_brief.system": _spec(
        "advisor.board_brief.system", "1.0.0", ADVISOR_BOARD_BRIEF_SYSTEM
    ),
    "advisor.board_brief": _spec(
        "advisor.board_brief", "1.0.0", ADVISOR_BOARD_BRIEF_PROMPT
    ),
    "advisor.ask.system": _spec("advisor.ask.system", "1.0.0", ADVISOR_ASK_SYSTEM),
    "advisor.ask": _spec("advisor.ask", "1.0.0", ADVISOR_ASK_PROMPT),
    # El RAG vivía DUPLICADO byte a byte (ai/prompts.py:798 huérfano +
    # rag/rag_service.py:77 vivo — hallazgo del perfilado 0064). La
    # fuente canónica pasa a ser ESTA entrada; rag_service la importa.
    "rag": _spec("rag", "1.0.0", RAG_SYSTEM_PROMPT),
}


def get_prompt(prompt_name: str, /) -> PromptSpec:
    """Devuelve el spec o ``KeyError`` con la lista de nombres válidos."""
    try:
        return PROMPT_REGISTRY[prompt_name]
    except KeyError:
        raise KeyError(
            f"prompt '{prompt_name}' no está en el registro — válidos: "
            f"{sorted(PROMPT_REGISTRY)}"
        ) from None


def render_prompt(prompt_name: str, /, **kwargs: object) -> str:
    """Atajo de un paso: ``render_prompt('message.birthday', name=..., age=...)``.

    ``prompt_name`` es posicional-only: ``name`` es una variable de
    template tan común que el parámetro NO puede ocupar ese espacio de
    kwargs (lo cazó la propia suite del vertical).
    """
    return get_prompt(prompt_name).render(**kwargs)


def registry_snapshot() -> list[dict[str, object]]:
    """Snapshot completo (39 entradas) — evidencia ejecutable del censo."""
    return [spec.snapshot() for spec in PROMPT_REGISTRY.values()]
