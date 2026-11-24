"""Suite de persistencia Ola 3.2 — gate del vertical llm_calls +
presupuesto (Q-LLM-02 de verdad):

    pytest: write → restart runtime → read OK

Misma mecánica de las 19 verticales: restart REAL (engine.dispose()
+ engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes
de cada test) · sqlite local / PG real en CI.

Lo que este archivo verifica (cada test es UNA garantía):
  1. write-restart-read del PRESUPUESTO: 3 record() (proceso A) →
     restart → snapshot() lee tokens=180k/calls=3 DESDE TABLA — la
     promesa textual de G12 ("persistencia real llega con
     PostgreSQL") pagada: el día SOBREVIVE al restart.
  2. UMBRAL recalculado desde tabla: budget 200k · 3 llamadas de
     60k → 90% → señal "warning" con la MISMA forma del ledger
     in-memory (level/message/tokens_today/budget); otra llamada
     → 95%+ → "critical". La señal no vive en memoria: un proceso
     NUEVO la re-emite leyendo la tabla.
  3. llamada DEGRADADA registrada honesta: record con
     provider="ollama" · degraded=True · provider_error → la fila
     persiste con esos valores y tokens 0/0 (contorno honesto
     heredado — no se inventan tokens que Ollama no reporta).
  4. auditoría calls_between: rango temporal ordenado called_at
     ASC · daily() con date_key DESC — lo que pagan los índices
     del 0022.
  5. drop-in in-memory vs ORM: MISMO contrato observable del
     TokenUsageLedger de G12 — misma señal de umbral con los
     mismos tokens (la aritmética 80/95 no se bifurcó).
  6. contrato vacío: día sin llamadas → snapshot tokens=0/calls=0
     sin upsert fantasma (SELECT sin fila NO crea nada).
"""
from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta

import pytest

from club_mcp.ai.resilience import TokenUsageLedger
from club_mcp.db.orm.base import Base
from club_mcp.db.orm.llm_calls_orm import (
    LLMCallLogORM,
    LLMUsageDailyORM,
)
from club_mcp.db.orm.repositories.llm_calls_repo import (
    LLMCallsRepository,
    TokenUsageLedgerPersistent,
    _today,
)
from club_mcp.db.orm.session import make_engine


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")

# sqlite aio local (misma mecánica de las 18 suites previas —
# lección 0005: aiosqlite para que la suite corra sin PG)
SQLITE_URL = "sqlite+aiosqlite:///./test_llm_calls.db"

_now = datetime.now(tz=UTC)


async def _reset_backend(url: str) -> None:
    """Drop/create SOLO las tablas del vertical (lección 0056-bis:
    NUNCA drop_all global — bombea las suites ajenas)."""
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


USAGE = {"input_tokens": 30_000, "output_tokens": 30_000}

pytestmark = pytest.mark.asyncio


async def test_budget_survives_restart():
    await _reset_backend(SQLITE_URL)
    """1. El presupuesto vive EN TABLA: restart y sigue contando."""
    engine_a = make_engine(SQLITE_URL)
    repo_a = LLMCallsRepository(engine_a)
    for _ in range(3):
        await repo_a.record(USAGE)
    snap = await repo_a.snapshot(daily_budget=200_000)
    assert snap["tokens"] == 180_000 and snap["calls"] == 3
    await engine_a.dispose()  # proceso A muere

    # proceso B: MISMO presupuesto que dejó el muerto
    engine_b = make_engine(SQLITE_URL)
    repo_b = LLMCallsRepository(engine_b)
    snap_b = await repo_b.snapshot(daily_budget=200_000)
    assert snap_b["tokens"] == 180_000 and snap_b["calls"] == 3
    await repo_b.record(USAGE)  # 240k: sigue acumulando desde la tabla
    snap_c = await repo_b.snapshot(daily_budget=200_000)
    assert snap_c["tokens"] == 240_000 and snap_c["calls"] == 4
    await engine_b.dispose()


async def test_threshold_signal_recomputed_from_table():
    await _reset_backend(SQLITE_URL)
    """2. La señal de umbral se recalcula DESDE TABLA (90% → warning;
    95%+ → critical) — el proceso nuevo la re-emite leyendo la tabla."""
    engine = make_engine(SQLITE_URL)
    repo = LLMCallsRepository(engine)
    assert await repo.record(USAGE) is None  # 30%: sin señal
    sig = await repo.record(USAGE)  # 60%
    assert sig is None
    sig = await repo.record(USAGE)  # 90% → warning
    assert sig is not None and sig["level"] == "warning"
    assert sig["tokens_today"] == 180_000 and sig["budget"] == 200_000
    assert "Presupuesto LLM diario al 90%" in sig["message"]

    # restart: la señal NO era estado de memoria — se re-deriva
    await engine.dispose()
    engine2 = make_engine(SQLITE_URL)
    repo2 = LLMCallsRepository(engine2)
    sig2 = await repo2.record(USAGE)  # 240k = 120% → critical
    assert sig2 is not None and sig2["level"] == "critical"
    assert sig2["tokens_today"] == 240_000
    await engine2.dispose()


async def test_degraded_call_logged_honestly():
    await _reset_backend(SQLITE_URL)
    """3. La llamada degradada queda registrada sin inventar tokens."""
    engine = make_engine(SQLITE_URL)
    repo = LLMCallsRepository(engine)
    sig = await repo.record(
        {"input_tokens": 0, "output_tokens": 0},
        provider="ollama",
        model="qwen2.5:7b",
        degraded=True,
        provider_error="timeout claude",
        latency_ms=812.5,
    )
    assert sig is None  # 0 tokens: sin señal (contorno honesto)
    calls = await repo.calls_between(
        _now - timedelta(hours=1), _now + timedelta(hours=1)
    )
    assert len(calls) == 1
    c = calls[0]
    assert c["provider"] == "ollama" and c["degraded"] is True
    assert c["provider_error"] == "timeout claude"
    assert c["input_tokens"] == 0 and c["output_tokens"] == 0
    assert c["latency_ms"] == 812.5
    snap = await repo.snapshot()
    assert snap["calls"] == 1 and snap["tokens"] == 0
    await engine.dispose()


async def test_audit_queries_ordered():
    await _reset_backend(SQLITE_URL)
    """4. calls_between ASC por called_at · daily() DESC por date_key."""
    engine = make_engine(SQLITE_URL)
    repo = LLMCallsRepository(engine)
    await repo.record({"input_tokens": 100, "output_tokens": 50})
    await repo.record({"input_tokens": 200, "output_tokens": 150})
    calls = await repo.calls_between(
        _now - timedelta(hours=1), _now + timedelta(hours=1)
    )
    assert [c["input_tokens"] for c in calls] == [100, 200]  # ASC
    days = await repo.daily()
    assert len(days) == 1 and days[0]["date_key"] == _today()
    assert days[0]["tokens"] == 500 and days[0]["calls"] == 2
    await engine.dispose()


async def test_dropin_inmemory_same_signal():
    await _reset_backend(SQLITE_URL)
    """5. Drop-in: el ORM y el TokenUsageLedger de G12 emiten la MISMA
    señal con los mismos tokens (aritmética no bifurcada)."""
    engine = make_engine(SQLITE_URL)
    repo = LLMCallsRepository(engine)
    orm_ledger = TokenUsageLedgerPersistent(repo, daily_budget=200_000)
    mem_ledger = TokenUsageLedger(daily_budget=200_000)
    sig_orm = await orm_ledger.record(USAGE)
    sig_mem = await mem_ledger.record(USAGE)
    assert sig_orm is None and sig_mem is None  # 30% ambos: sin señal
    for _ in range(2):
        sig_orm = await orm_ledger.record(USAGE)
        sig_mem = await mem_ledger.record(USAGE)
    # 90% en ambos → MISMA forma, MISMO umbral, MISMO mensaje
    assert sig_orm is not None and sig_mem is not None
    assert set(sig_orm) == set(sig_mem)
    assert sig_orm["tokens_today"] == sig_mem["tokens_today"]
    assert sig_orm["level"] == sig_mem["level"]
    assert sig_orm["message"] == sig_mem["message"]
    snap_orm = await orm_ledger.snapshot()
    assert snap_orm["tokens"] == 180_000 and snap_orm["calls"] == 3
    assert snap_orm["budget"] == 200_000
    await engine.dispose()


async def test_empty_contract():
    await _reset_backend(SQLITE_URL)
    """6. Día sin llamadas: snapshot 0/0 · sin fila fantasma en daily()."""
    engine = make_engine(SQLITE_URL)
    repo = LLMCallsRepository(engine)
    snap = await repo.snapshot(daily_budget=200_000)
    assert snap["tokens"] == 0 and snap["calls"] == 0
    assert snap["date"] == _today()
    assert await repo.daily() == []  # SELECT sin fila NO crea nada
    await engine.dispose()


@pytest.mark.skipif(
    not PG_URL, reason="CLUB_PERSISTENCE_URL no presente — PG real solo en CI"
)
async def test_pg_real_roundtrip():
    """Bonus CI: mismo write-restart-read contra PG 16 real."""
    await _reset_backend(PG_URL)
    engine_a = make_engine(PG_URL)
    repo_a = LLMCallsRepository(engine_a)
    await repo_a.record(USAGE)
    await engine_a.dispose()
    engine_b = make_engine(PG_URL)
    snap = await LLMCallsRepository(engine_b).snapshot(daily_budget=200_000)
    assert snap["tokens"] == 60_000 and snap["calls"] == 1
    await engine_b.dispose()
    await _reset_backend(PG_URL)
