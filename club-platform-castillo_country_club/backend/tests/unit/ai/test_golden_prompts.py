"""Golden set de prompts — Ola 3.4 (Q-LLM-04).

El censo de Ola 3.3 compara registry ↔ árbol (drift interno). Este
golden compara árbol ↔ COMPORTAMIENTO PRETENDIDO: por cada spec, el
archivo ``golden/prompts_v1.json`` pina ``version · sha256 · variables
· chars`` y (cuando tiene variables) el ``render_sha256`` con kwargs
sintéticos estables. Un template editado sin bump de versión rompe
acá con diff legible — ANTES de que llegue a producción.

Regla de mantenimiento: cambiar un prompt = bump de versión en el
registry + regenerar el golden en el MISMO PR (el generador vive en
scripts/ del vertical; el JSON lleva su semilla anotada).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from club_mcp.ai.prompt_registry import PROMPT_REGISTRY

GOLDEN = Path(__file__).parent / "golden" / "prompts_v1.json"
_doc = json.loads(GOLDEN.read_text(encoding="utf-8"))
SPECS: dict = _doc["specs"]
SAMPLES = {
    "name": "Ana", "age": 7, "family_name": "Los Herrera",
    "member_name": "Luis", "apellido": "Herrera", "ratings": "[]",
    "kpis": "ingresos=100", "audience": "junta", "available_tools": "[]",
    "distribution_data": "{}", "insight_data": "n/a",
    "insights_data": "n/a", "question": "¿Cómo vamos?", "context": "n/a",
    "documents": "n/a", "query": "cuotas", "history": "n/a",
}


def synth_for(variables):
    return {v: SAMPLES.get(v, "X_" + v) for v in variables}


def test_golden_cubre_todo_el_registry() -> None:
    live = set(PROMPT_REGISTRY)
    pinned = set(SPECS)
    assert live == pinned, "diff: faltan %s · sobran %s" % (
        sorted(live - pinned), sorted(pinned - live))
    assert _doc["registry_size"] == len(PROMPT_REGISTRY) == 41


@pytest.mark.parametrize("name", sorted(PROMPT_REGISTRY))
def test_golden_pin_por_spec(name: str) -> None:
    """Cada spec del árbol calza el pin completo del golden."""
    spec = PROMPT_REGISTRY[name]
    pin = SPECS[name]
    diffs = []
    if spec.version != pin["version"]:
        diffs.append("version %s ≠ %s" % (spec.version, pin["version"]))
    if spec.sha256 != pin["sha256"]:
        diffs.append("sha256 %s ≠ %s (template editado sin bump)" %
                     (spec.sha256, pin["sha256"]))
    if spec.variables != tuple(pin["variables"]):
        diffs.append("variables %s ≠ %s" %
                     (spec.variables, tuple(pin["variables"])))
    if len(spec.template) != pin["chars"]:
        diffs.append("chars %d ≠ %d" % (len(spec.template), pin["chars"]))
    assert not diffs, "%s: %s" % (name, " · ".join(diffs))


@pytest.mark.parametrize("name", sorted(
    n for n, p in SPECS.items() if "render_sha256" in p))
def test_golden_render_por_spec(name: str) -> None:
    """El render con kwargs sintéticos calza el hash congelado."""
    spec = PROMPT_REGISTRY[name]
    pin = SPECS[name]
    kwargs = {v: SAMPLES.get(v, "X_" + v) for v in pin["render_kwargs"]}
    rendered = spec.render(**kwargs)
    got = hashlib.sha256(rendered.encode("utf-8")).hexdigest()[:16]
    assert got == pin["render_sha256"], (
        "%s: render drift (kwargs %s)" % (name, kwargs))


def test_golden_semillas_anotadas() -> None:
    """El archivo dice de dónde nació — evidencia, no fe."""
    assert _doc["seed_commit"] == "66e73de"
    assert _doc["generated"] == "2026-11-25"
    n_render = sum(1 for p in SPECS.values() if "render_sha256" in p)
    assert n_render >= 20  # los specs con variables, todos pineados
