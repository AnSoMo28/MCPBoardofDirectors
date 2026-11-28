"""Suite RV-1 — evidencia de prompt en llm_calls (retro vanguardia Ola 3).

Deuda ADR-0009 pagada y blindada. Lo que esta suite afirma:

  * Persistencia: la clave ``usage["prompt"]`` (forma
    ``PromptSpec.snapshot()``) queda en las 3 columnas nuevas;
    la llamada sin prompt queda NULL (honesta, no inventada);
    el prompt malformado NO rompe el registro (fail-open acotado:
    se persiste sin evidencia — el costo nunca se pierde).
  * Flujo: ``ResilientClaudeService._acall`` con ``prompt_name``
    fluye el fingerprint VIVO del registry hasta el ledger —
    probado con ledger espía + stub del attempt, sin red.
  * Circuito (la vanguardia del retrofit): ``calls_by_prompt``
    contra el registry vivo — la llamada grabada calza byte a
    byte con lo que ``get_prompt`` devuelve HOY, y un drift
    simulado (sha retocado) es DETECTADO por la misma consulta.
  * Juez: ``judge_response`` emite la clave ``prompt`` en la forma
    canónica del flujo (predica con el ejemplo).
  * Migración 0023: up/down determinista sobre sqlite (la mecánica
    de las 19 verticales — write, restart, read).

Misma mecánica de la suite 3.2: restart REAL (engine.dispose() +
engine NUEVO) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / PG real en CI.
"""
from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest

from club_mcp.ai.prompt_registry import get_prompt, registry_snapshot
from club_mcp.ai.resilience import (
    CircuitBreaker,
    ResilientClaudeService,
    TokenUsageLedger,
)
from club_mcp.db.orm.base import Base
from club_mcp.db.orm.llm_calls_orm import LLMCallLogORM, LLMUsageDailyORM
from club_mcp.db.orm.repositories.llm_calls_repo import LLMCallsRepository
from club_mcp.db.orm.session import make_engine


# sqlite aio local (misma mecánica de la suite 3.2 — lección 0005)
SQLITE_URL = "sqlite+aiosqlite:///./test_llm_calls_prompt.db"

_now = datetime.now(tz=UTC)


async def _reset_backend(url: str) -> None:
    """Drop/create SOLO las tablas del vertical (lección 0056-bis)."""
    engine = make_engine(url)
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync: Base.metadata.drop_all(
                sync,
                tables=[
                    LLMCallLogORM.__table__,
                    LLMUsageDailyORM.__table__,
                ],
            )
        )
        await conn.run_sync(
            lambda sync: Base.metadata.create_all(
                sync,
                tables=[
                    LLMCallLogORM.__table__,
                    LLMUsageDailyORM.__table__,
                ],
            )
        )
    await engine.dispose()


pytestmark = pytest.mark.asyncio


# ════════════════════════════════════════════════════════════════
# 1 · Persistencia de las 3 columnas
# ════════════════════════════════════════════════════════════════


async def test_prompt_evidence_persisted_and_survives_restart():
    """La clave usage["prompt"] queda en la fila Y sobrevive restart."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    spec = get_prompt("judge.eval")
    usage = {
        "input_tokens": 100,
        "output_tokens": 50,
        "prompt": {
            "name": spec.name,
            "version": spec.version,
            "sha256": spec.sha256,
        },
    }
    await repo.record(usage, model="claude-test")
    # restart REAL: engine NUEVO, sesión nueva
    await repo.engine.dispose()
    repo2 = LLMCallsRepository(make_engine(SQLITE_URL))
    rows = await repo2.calls_between(_now.replace(year=_now.year - 1), _now.replace(year=_now.year + 1))
    assert len(rows) == 1
    row = rows[0]
    assert row["prompt_name"] == "judge.eval"
    assert row["prompt_version"] == spec.version
    assert row["prompt_sha256"] == spec.sha256
    await repo2.engine.dispose()


async def test_call_without_prompt_stays_null():
    """Sin clave prompt: 3 columnas NULL — honesto, no inventado."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    await repo.record({"input_tokens": 10, "output_tokens": 5}, model="m")
    rows = await repo.calls_between(_now.replace(year=_now.year - 1), _now.replace(year=_now.year + 1))
    assert len(rows) == 1
    assert rows[0]["prompt_name"] is None
    assert rows[0]["prompt_version"] is None
    assert rows[0]["prompt_sha256"] is None
    await repo.engine.dispose()


async def test_malformed_prompt_does_not_lose_the_cost():
    """Prompt malformado (sin name/sha256 str): la fila se graba sin
    evidencia — el COSTO nunca se pierde por metadato roto."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    await repo.record(
        {"input_tokens": 7, "output_tokens": 3, "prompt": {"name": 42}},
        model="m",
    )
    rows = await repo.calls_between(_now.replace(year=_now.year - 1), _now.replace(year=_now.year + 1))
    assert len(rows) == 1
    assert rows[0]["prompt_name"] is None
    daily = await repo.daily(limit=1)
    assert daily[0]["tokens"] == 10  # el costo quedó
    await repo.engine.dispose()


async def test_version_truncated_to_column_width():
    """Versión más larga que la columna se trunca, no revienta."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    await repo.record(
        {
            "input_tokens": 1,
            "output_tokens": 1,
            "prompt": {
                "name": "x" * 80,  # > 64
                "version": "9" * 30,  # > 16
                "sha256": "f" * 16,
            },
        },
        model="m",
    )
    rows = await repo.calls_between(_now.replace(year=_now.year - 1), _now.replace(year=_now.year + 1))
    assert len(rows[0]["prompt_name"]) == 64
    assert len(rows[0]["prompt_version"]) == 16
    await repo.engine.dispose()


# ════════════════════════════════════════════════════════════════
# 2 · Flujo del wrapper resiliente (sin red: stub del attempt)
# ════════════════════════════════════════════════════════════════


class _Response:
    def __init__(self) -> None:
        class _C:
            text = "respuesta"

        class _U:
            input_tokens = 11
            output_tokens = 7

        self.content = [_C()]
        self.usage = _U()
        self.stop_reason = "end_turn"


class _LedgerSpy(TokenUsageLedger):
    """Ledger in-memory que ESPÍA el usage que recibe."""

    def __init__(self) -> None:
        super().__init__()
        self.seen: list[dict] = []

    async def record(self, usage: dict) -> dict | None:
        self.seen.append(usage)
        return await super().record(usage)


def _wrapper(ledger: TokenUsageLedger) -> ResilientClaudeService:
    svc = ResilientClaudeService(
        inner=object(),
        max_attempts=1,
        breaker=CircuitBreaker(name="t"),
        fallback=None,
        ledger=ledger,
        use_fallback=False,
    )

    async def _attempt(system_prompt, user_prompt, max_tokens, history):
        return _Response()

    svc._attempt = _attempt  # type: ignore[method-assign]
    return svc


async def test_acall_flows_prompt_metadata_to_ledger():
    """_acall(prompt_name=...) inyecta el fingerprint VIVO del registry."""
    spy = _LedgerSpy()
    svc = _wrapper(spy)
    await svc._acall("sys", "usr", 100, prompt_name="judge.eval")
    assert len(spy.seen) == 1
    meta = spy.seen[0].get("prompt")
    spec = get_prompt("judge.eval")
    assert meta == {
        "name": "judge.eval",
        "version": spec.version,
        "sha256": spec.sha256,
    }


async def test_acall_without_prompt_name_keeps_usage_pure():
    """Sin prompt_name: usage queda EXACTO al de antes (2 llaves)."""
    spy = _LedgerSpy()
    svc = _wrapper(spy)
    await svc._acall("sys", "usr", 100)
    assert spy.seen[0] == {"input_tokens": 11, "output_tokens": 7}


async def test_acall_unknown_prompt_name_fails_at_the_door():
    """Spec inexistente: KeyError ANTES de gastar la llamada (puerta 3.3)."""
    spy = _LedgerSpy()
    svc = _wrapper(spy)
    with pytest.raises(KeyError, match="no-esta-en-el-registro|no está en el registro"):
        await svc._acall("sys", "usr", 100, prompt_name="no.existe")
    assert spy.seen == []  # no llegó a contar nada


# ════════════════════════════════════════════════════════════════
# 3 · EL CIRCUITO: registro vs registry vivo (la vanguardia RV-1)
# ════════════════════════════════════════════════════════════════


async def test_circuit_recorded_sha_matches_live_registry():
    """La consulta que cierra ADR-0009: lo grabado calza con lo vivo.

    calls_by_prompt + get_prompt: el JOIN de la deuda — con la fila,
    no con el recuerdo. Es el patrón del gate ledger↔CLI de 4.1
    aplicado a la evidencia de prompts.
    """
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    spec = get_prompt("satisfaction_analysis")
    await repo.record(
        {
            "input_tokens": 20,
            "output_tokens": 10,
            "prompt": {
                "name": spec.name,
                "version": spec.version,
                "sha256": spec.sha256,
            },
        },
        model="m",
    )
    rows = await repo.calls_by_prompt("satisfaction_analysis")
    assert len(rows) == 1
    live = get_prompt("satisfaction_analysis")
    assert rows[0]["prompt_sha256"] == live.sha256  # sin drift
    assert rows[0]["prompt_version"] == live.version
    await repo.engine.dispose()


async def test_circuit_detects_drift():
    """Un sha retocado en la fila es DETECTADO por la misma consulta:
    el circuito no solo calza — RECHAZA lo que no calza."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    await repo.record(
        {
            "input_tokens": 1,
            "output_tokens": 1,
            "prompt": {
                "name": "narrative_report",
                "version": "1.0.0",
                "sha256": "deadbeefdeadbeef",
            },
        },
        model="m",
    )
    rows = await repo.calls_by_prompt("narrative_report")
    live = get_prompt("narrative_report")
    assert rows[0]["prompt_sha256"] != live.sha256  # drift VISIBLE
    await repo.engine.dispose()


async def test_calls_by_prompt_empty_for_unknown():
    """Prompt sin llamadas: lista vacía, sin error."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    assert await repo.calls_by_prompt("rag") == []
    await repo.engine.dispose()


# ════════════════════════════════════════════════════════════════
# 4 · Juez predica con el ejemplo + censo del flujo completo
# ════════════════════════════════════════════════════════════════


async def test_judge_emits_canonical_prompt_key():
    """judge_response() trae la clave "prompt" en la forma del flujo."""
    from club_mcp.ai.llm_judge import judge_response

    out = await judge_response("una respuesta con ó y ñ suficientemente larga para pasar el largo", client=None)
    spec = get_prompt("judge.eval")
    assert out["prompt"] == {
        "name": "judge.eval",
        "version": spec.version,
        "sha256": spec.sha256,
    }
    assert out["judge_eval_sha256"] == out["prompt"]["sha256"]


async def test_registry_snapshot_shape_feeds_record():
    """La forma de PromptSpec.snapshot() alimenta record() directo:
    el contrato de la evidencia es UNO (sin traducción de formas)."""
    await _reset_backend(SQLITE_URL)
    repo = LLMCallsRepository(make_engine(SQLITE_URL))
    # cualquier spec del censo, via su snapshot (sin variables/chars
    # — record() lee solo las 3 llaves de evidencia)
    snap = registry_snapshot()[0]
    await repo.record(
        {
            "input_tokens": 5,
            "output_tokens": 5,
            "prompt": snap,
        },
        model="m",
    )
    rows = await repo.calls_by_prompt(str(snap["name"]))
    assert rows and rows[0]["prompt_sha256"] == snap["sha256"]
    await repo.engine.dispose()
