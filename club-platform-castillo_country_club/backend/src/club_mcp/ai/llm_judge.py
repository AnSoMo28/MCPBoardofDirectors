"""LLM-as-judge con hard gate determinista — Ola 3.4 (Q-LLM-04).

Q-LLM-04 pide evals: golden set + LLM-as-judge. Los markers de pytest
(``slow``/``integration``/``hitl``) existían; las suites no. Este módulo
es el juez: la parte que decide si una respuesta generada es digna del
socio ANTES de que llegue a producción.

DISEÑO — hard gate determinista primero, LLM después:
- La rúbrica determinista (``DeterministicRubric``) es barata,
  reproducible y sin red: placeholders sin resolver ``{nombre}``, largo
  fuera de rango, substrings exigidos/vedados. Si ella reprueba, el
  LLM NO se consulta: su veredicto no puede arreglar un placeholder
  crudo ni un texto de 3 caracteres. El LLM nunca aprueba lo que la
  rúbrica reprueba.
- El LLM (si hay cliente) juzga lo que solo un lector juzga: tono,
  coherencia, utilidad real. Su salida se valida contra el CONTRATO
  JSON del spec ``judge.system`` (verdict/score/criteria/summary) —
  un juez que no sabe contestar en su propio formato queda
  ``degraded``, no ``pass``.
- Sin cliente (CI sin API key, local sin red): el veredicto es el de
  la rúbrica con ``degraded=True``. El CI corre el gate duro SIEMPRE;
  el juicio LLM es aditivo, nunca bloqueante de la infraestructura.

Los prompts del juez viven en el registry (``judge.system`` /
``judge.eval``, v1.0.0) — nacieron versionados: la lección de Ola 3.3.

Cadena de imports stdlib pura: este módulo se puede validar por
ejecución en un sandbox sin ``anthropic`` ni ``sqlalchemy`` (la suite
lo hace con un stub de 15 líneas).
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Protocol

from club_mcp.ai.prompt_registry import get_prompt

_PLACEHOLDER_RE = re.compile(r"\{[a-z_][a-z0-9_]*\}", re.IGNORECASE)

VERDICT_PASS = "pass"
VERDICT_FAIL = "fail"


@dataclass(frozen=True, kw_only=True)
class RubricCriterion:
    """Un criterio verificable de la rúbrica.

    - ``require_any``: al menos UNO de los substrings debe estar
      (ej: idioma español → saludo o cierre en español).
    - ``forbid_any``: NINGUNO puede estar (ej: disculpas genéricas
      del fallback de error).
    - ``min_len``/``max_len``: rango de caracteres de la respuesta.
    """

    id: str
    description: str
    require_any: tuple[str, ...] = ()
    forbid_any: tuple[str, ...] = ()
    min_len: int = 0
    max_len: int = 0


@dataclass(frozen=True)
class CriterionResult:
    id: str
    result: str  # "pass" | "fail" | "n/a"
    note: str


@dataclass(frozen=True)
class RubricVerdict:
    """Veredicto de la rúbrica determinista — el hard gate."""

    ok: bool
    results: tuple[CriterionResult, ...] = ()
    score: int = 100
    notes: tuple[str, ...] = ()

    @property
    def failed_ids(self) -> tuple[str, ...]:
        return tuple(r.id for r in self.results if r.result == "fail")


class LLMClient(Protocol):
    """Lo mínimo que el juez necesita del mundo exterior.

    Protocol estructural: ``claude_service.ClaudeService.chat`` ya lo
    cumple sin tocar una línea. Desacopla el juez de ``anthropic`` —
    la suite lo implementa con un stub de 15 líneas.
    """

    async def chat(self, user_message: str, **kwargs: Any) -> dict[str, Any]:
        ...  # pragma: no cover — contrato, no implementación


def evaluate_rubric(candidate: str, criteria: tuple[RubricCriterion, ...]) -> RubricVerdict:
    """Ejecuta la rúbrica determinista completa. Sin red, sin LLM."""
    results: list[CriterionResult] = []
    notes: list[str] = []
    fails = 0

    # criterio 0 (siempre): sin placeholders sin resolver
    raw = _PLACEHOLDER_RE.findall(candidate)
    if raw:
        fails += 1
        results.append(CriterionResult(
            id="no_unresolved_placeholders", result="fail",
            note="placeholders crudos: %s" % ", ".join(sorted(set(raw))[:5]),
        ))
    else:
        results.append(CriterionResult(
            id="no_unresolved_placeholders", result="pass", note="",
        ))

    for c in criteria:
        ok = True
        note = ""
        if c.require_any and not any(s in candidate for s in c.require_any):
            ok = False
            note = "falta alguno de: %s" % " | ".join(c.require_any)
        if ok and c.forbid_any:
            hit = [s for s in c.forbid_any if s in candidate]
            if hit:
                ok = False
                note = "contiene vedado: %s" % ", ".join(hit)
        if ok and c.min_len and len(candidate) < c.min_len:
            ok = False
            note = "largo %d < min %d" % (len(candidate), c.min_len)
        if ok and c.max_len and len(candidate) > c.max_len:
            ok = False
            note = "largo %d > max %d" % (len(candidate), c.max_len)
        if not ok:
            fails += 1
        results.append(CriterionResult(
            id=c.id, result="pass" if ok else "fail", note=note,
        ))

    total = len(results)
    score = 0 if total == 0 else round(100 * (total - fails) / total)
    return RubricVerdict(
        ok=fails == 0,
        results=tuple(results),
        score=score,
        notes=tuple(n for r in results if r.note for n in (r.note,)),
    )


def _parse_judge_json(content: str) -> dict[str, Any] | None:
    """Extrae el primer objeto JSON del contenido del juez.

    Tolerante a cercadura de markdown (```json ... ```) y a texto
    antes/después: los LLM envuelven su JSON aunque se les pida no
    hacerlo. Devuelve None si no hay objeto JSON válido.
    """
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end + 1])
    except (ValueError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def _valid_judge_payload(payload: dict[str, Any]) -> bool:
    """Contrato del spec judge.system: verdict/score/criteria/summary."""
    if payload.get("verdict") not in ("PASS", "FAIL"):
        return False
    score = payload.get("score")
    if not isinstance(score, (int, float)) or not (0 <= score <= 100):
        return False
    criteria = payload.get("criteria")
    if not isinstance(criteria, list) or not criteria:
        return False
    for c in criteria:
        if not isinstance(c, dict) or c.get("result") not in ("PASS", "FAIL", "N/A"):
            return False
    if not isinstance(payload.get("summary"), str) or not payload["summary"]:
        return False
    return True


async def judge_response(
    candidate: str,
    criteria: tuple[RubricCriterion, ...] = (),
    client: LLMClient | None = None,
    judge_model: str = "claude-3-5-haiku-20241022",
) -> dict[str, Any]:
    """Juzga una respuesta candidata. Hard gate determinista + LLM.

    Devuelve un dict plano (JSON-serializable, listo para
    ``llm_calls`` o evidencia de eval):
    - ``verdict``: "pass" | "fail" (minúscula, dominio del juez).
    - ``score``: 0-100 determinista si no hay LLM; mezclado si lo hay.
    - ``degraded``: True si la rúbrica reprobó ANTES del LLM, o si no
      hay cliente, o si el juez no cumplió su propio contrato JSON.
    - ``judge_prompt_sha256``: fingerprint del prompt del juez que
      corrió — misma evidencia de Ola 3.3, ahora en la salida.
    """
    spec_sys = get_prompt("judge.system")
    spec_eval = get_prompt("judge.eval")
    rubric = evaluate_rubric(candidate, criteria)

    out: dict[str, Any] = {
        "verdict": VERDICT_PASS if rubric.ok else VERDICT_FAIL,
        "score": rubric.score,
        "deterministic": {
            "ok": rubric.ok,
            "score": rubric.score,
            "failed_ids": list(rubric.failed_ids),
        },
        "degraded": True,
        "judge": "rubric",
        "judge_prompt_sha256": spec_sys.sha256,
        "judge_eval_sha256": spec_eval.sha256,
        "criteria": [{"id": r.id, "result": r.result, "note": r.note} for r in rubric.results],
    }

    # HARD GATE: la rúbrica reprobó → el LLM no puede absolver.
    if not rubric.ok:
        return out

    if client is None:
        return out  # CI sin key: gate determinista es el veredicto.

    rubric_text = "\n".join(
        "- %s: %s" % (c.id, c.description) for c in criteria
    ) or "(sin criterios extra — solo el hard gate de placeholders/largo)"
    det_text = "OK — %d criterios, 0 fallos" % len(rubric.results) if rubric.ok else (
        "FALLOS: %s" % ", ".join(rubric.failed_ids)
    )
    prompt = spec_eval.render(
        rubric=rubric_text,
        candidate=candidate,
        deterministic=det_text,
    )
    try:
        response = await client.chat(user_message=prompt, judge_model=judge_model)
    except Exception as exc:  # juez caído ≠ respuesta aprobada
        out["degraded"] = True
        out["judge"] = "rubric+llm-error"
        out["judge_error"] = str(exc)
        return out

    content = response.get("content", "")
    payload = _parse_judge_json(content)
    if payload is None or not _valid_judge_payload(payload):
        out["degraded"] = True
        out["judge"] = "rubric+llm-contract"
        out["judge_error"] = "juez no cumplió su contrato JSON"
        return out

    llm_pass = payload["verdict"] == "PASS" and payload["score"] >= 60
    out["verdict"] = VERDICT_PASS if llm_pass else VERDICT_FAIL
    out["score"] = payload["score"]
    out["judge"] = "rubric+llm"
    out["degraded"] = False
    out["llm_criteria"] = payload["criteria"]
    out["summary"] = payload["summary"]
    return out


# ── Rúbrica por defecto del club (castellano, tono socio) ────────
DEFAULT_RUBRIC: tuple[RubricCriterion, ...] = (
    RubricCriterion(
        id="espanol",
        description="respuesta en español",
        require_any=("ó", "á", "é", "í", "ú", "ñ", "¿", "¡", " del ", " las ", " los ", " y "),
    ),
    RubricCriterion(
        id="no_fallback_apology",
        description="no es el mensaje genérico de error del servicio",
        forbid_any=("hubo un error procesando tu solicitud",),
    ),
    RubricCriterion(
        id="longitud_util",
        description="largo útil (ni telegráfico ni novela)",
        min_len=40,
        max_len=4000,
    ),
)
