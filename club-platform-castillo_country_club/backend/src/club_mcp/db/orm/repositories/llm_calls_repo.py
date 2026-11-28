"""LLMCallsRepository async — Ola 3.2 (vertical llm_calls + presupuesto).

Cierre REAL de Q-LLM-02: TokenUsageLedger (G12) acumulaba usage en
memoria de proceso — "contorno sin DB nueva ... persistencia real
llega con PostgreSQL" (su propio docstring). Este módulo ES esa
promesa pagada: el día se acumula EN TABLA (llm_usage_daily upsert
por date_key) y cada llamada queda registrada (llm_calls
append-only) — el presupuesto SOBREVIVE al restart.

Diseño (inversión de dependencias, patrón Ola 2.3/ApprovalStore):

  * TokenUsageLedger gana UN backend: este repositorio. MISMA API
    pública (record(usage) -> signal | None · snapshot() -> dict)
    — _acall() y los 6 consumidores NO cambian un byte. Sin
    CLUB_PERSISTENCE_URL el bootstrap sigue cableando el ledger
    in-memory: 0 cambio de comportamiento (smoke B0 intacto).
  * El repo NO importa resilience.py (db.orm no depende de ai) —
    el wiring es del bootstrap (misma disciplina que hitl/db.orm).

Contrato observable (lo que la suite write-restart-read afirma):
  * record(): llama → llm_calls INSERT + llm_usage_daily UPSERT
    (tokens += in+out · calls += 1) → MISMA señal de umbral del
    ledger in-memory (warning ≥80% · critical ≥95% · None bajo) —
    el umbral se recalcula DESDE TABLA, no desde memoria.
  * record() con degraded/error: la fila registra la degradación
    (provider "ollama" · degraded True · provider_error) y cuenta
    tokens 0/0 — contorno honesto heredado, no se inventan tokens.
  * snapshot(): dict con date/tokens/calls/budget — MISMA forma
    que el in-memory; tokens/calls salen de la TABLA de HOY.
  * calls_between(Desde, Hasta): auditoría — rango temporal de
    llm_calls, orden called_at ASC (lección run #56: orden
    SIEMPRE explícito) — la consulta que paga el índice 0022.
  * daily(day=None): filas de presupuesto por día, date_key DESC.
  * Contrato vacío: día sin llamadas → tokens=0 · calls=0 ·
    ningún upsert fantasma (SELECT sin fila NO crea nada).

Mismas decisiones que las 19 verticales (§3.8): engine por
inyección · session_scope transaccional · devuelve dicts/None
(SQLAlchemy no sube) · date_key como llave natural del día.
El UPSERT diario es read-modify-write DENTRO de session_scope
(con SQLAlchemy puro, sin dialecto-ON CONFLICT: sqlite dev/suite
y PG comparten el MISMO código — lección 0005: la suite tiene que
correr en ambos sin bifurcar).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.llm_calls_orm import (
    LLMCallLogORM,
    LLMUsageDailyORM,
    utcnow,
)
from club_mcp.db.orm.session import session_scope


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _today() -> str:
    """date_key YYYY-MM-DD tz-aware UTC (misma fuente del ledger)."""
    return datetime.now(tz=UTC).strftime("%Y-%m-%d")


class LLMCallsRepository:
    """Estado durable del presupuesto LLM (Q-LLM-02) + auditoría."""

    def __init__(self, engine: AsyncEngine) -> None:
        self.engine = engine

    # ── API del ledger (misma forma que TokenUsageLedger) ──────

    async def record(
        self,
        usage: dict[str, Any],
        *,
        provider: str = "claude",
        model: str = "",
        degraded: bool = False,
        provider_error: str | None = None,
        latency_ms: float = 0.0,
        daily_budget: int = 200_000,
    ) -> dict[str, Any] | None:
        """Registra UNA llamada; devuelve la señal de umbral o None.

        MISMA semántica de TokenUsageLedger.record (fuente única de
        verdad, no se bifurca): señal warning ≥80% · critical ≥95%
        · None por debajo. La diferencia es DONDE acumula: tabla.

        RV-1 (retro vanguardia Ola 3 · ADR-0009): si ``usage`` trae
        la clave ``prompt`` (dict con name/version/sha256 — la forma
        de ``PromptSpec.snapshot()`` de ai/prompt_registry), la fila
        llm_calls la persiste. Fluido por _acall del wrapper resiliente
        SIN cambio de firma: la evidencia viaja en el mismo dict que
        ya cruzaba la capa.
        """
        date_key = _today()
        in_tok = int(usage.get("input_tokens", 0))
        out_tok = int(usage.get("output_tokens", 0))
        tokens = in_tok + out_tok
        prompt = usage.get("prompt")
        prompt_meta = (
            prompt
            if isinstance(prompt, dict)
            and isinstance(prompt.get("name"), str)
            and isinstance(prompt.get("sha256"), str)
            else None
        )

        async with session_scope(self.engine, repo="llm_calls") as session:
            # upsert diario: read-modify-write dentro de la transacción
            row = (
                await session.execute(
                    select(LLMUsageDailyORM).where(
                        LLMUsageDailyORM.date_key == date_key
                    )
                )
            ).scalar_one_or_none()
            if row is None:
                row = LLMUsageDailyORM(
                    date_key=date_key,
                    tokens=0,
                    calls=0,
                    updated_at=utcnow(),
                )
                session.add(row)
                await session.flush()
            row.tokens += tokens
            row.calls += 1
            row.updated_at = utcnow()

            # la llamada misma: append-only (+ evidencia de prompt RV-1)
            session.add(
                LLMCallLogORM(
                    call_id=uuid4().hex,
                    provider=provider,
                    model=model,
                    input_tokens=in_tok,
                    output_tokens=out_tok,
                    degraded=degraded,
                    provider_error=provider_error,
                    latency_ms=float(latency_ms),
                    called_at=utcnow(),
                    date_key=date_key,
                    prompt_name=(
                        prompt_meta["name"][:64] if prompt_meta else None
                    ),
                    prompt_version=(
                        str(prompt_meta.get("version", ""))[:16]
                        if prompt_meta
                        else None
                    ),
                    prompt_sha256=(
                        prompt_meta["sha256"][:16] if prompt_meta else None
                    ),
                )
            )

        pct = (row.tokens) / daily_budget if daily_budget else 0.0
        if pct >= 0.95:
            return self._signal("critical", pct, row.tokens, daily_budget)
        if pct >= 0.80:
            return self._signal("warning", pct, row.tokens, daily_budget)
        return None

    async def snapshot(
        self, daily_budget: int = 200_000
    ) -> dict[str, Any]:
        """MISMA forma que TokenUsageLedger.snapshot — desde TABLA."""
        date_key = _today()
        async with session_scope(self.engine, repo="llm_calls") as session:
            row = (
                await session.execute(
                    select(LLMUsageDailyORM).where(
                        LLMUsageDailyORM.date_key == date_key
                    )
                )
            ).scalar_one_or_none()
        tokens = int(row.tokens) if row is not None else 0
        calls = int(row.calls) if row is not None else 0
        return {
            "date": date_key,
            "tokens": tokens,
            "calls": calls,
            "budget": daily_budget,
        }

    # ── auditoría (consultable — lo que paga los índices 0022) ──

    async def calls_between(
        self, since: datetime, until: datetime
    ) -> list[dict[str, Any]]:
        """Rango temporal de llamadas, called_at ASC (run #56: orden explícito)."""
        async with session_scope(self.engine, repo="llm_calls") as session:
            rows = (
                (
                    await session.execute(
                        select(LLMCallLogORM)
                        .where(
                            LLMCallLogORM.called_at >= since,
                            LLMCallLogORM.called_at <= until,
                        )
                        .order_by(LLMCallLogORM.called_at.asc())
                    )
                )
                .scalars()
                .all()
            )
        return [
            {
                "call_id": r.call_id,
                "provider": r.provider,
                "model": r.model,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "degraded": r.degraded,
                "provider_error": r.provider_error,
                "latency_ms": r.latency_ms,
                "called_at": r.called_at,
                "prompt_name": r.prompt_name,
                "prompt_version": r.prompt_version,
                "prompt_sha256": r.prompt_sha256,
            }
            for r in rows
        ]

    async def calls_by_prompt(
        self, prompt_name: str
    ) -> list[dict[str, Any]]:
        """RV-1: llamadas de UN prompt, called_at ASC.

        La consulta que cierra el circuito 3.2↔3.3↔3.4: contra el
        snapshot vivo de prompt_registry, cualquier drift entre lo
        que CORRIÓ (esta tabla) y lo que la suite PINEA (golden) es
        visible sin investigación — con la fila, no con el recuerdo.
        """
        async with session_scope(self.engine, repo="llm_calls") as session:
            rows = (
                (
                    await session.execute(
                        select(LLMCallLogORM)
                        .where(LLMCallLogORM.prompt_name == prompt_name)
                        .order_by(LLMCallLogORM.called_at.asc())
                    )
                )
                .scalars()
                .all()
            )
        return [
            {
                "call_id": r.call_id,
                "called_at": r.called_at,
                "model": r.model,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "degraded": r.degraded,
                "prompt_version": r.prompt_version,
                "prompt_sha256": r.prompt_sha256,
            }
            for r in rows
        ]

    async def daily(
        self, limit: int = 30
    ) -> list[dict[str, Any]]:
        """Presupuesto por día, date_key DESC (los más recientes primero)."""
        async with session_scope(self.engine, repo="llm_calls") as session:
            rows = (
                (
                    await session.execute(
                        select(LLMUsageDailyORM)
                        .order_by(LLMUsageDailyORM.date_key.desc())
                        .limit(limit)
                    )
                )
                .scalars()
                .all()
            )
        return [
            {
                "date_key": r.date_key,
                "tokens": int(r.tokens),
                "calls": int(r.calls),
                "updated_at": r.updated_at,
            }
            for r in rows
        ]

    @staticmethod
    def _signal(
        level: str, pct: float, tokens: int, budget: int
    ) -> dict[str, Any]:
        """MISMA forma del ledger in-memory (señal visible, no ruido)."""
        return {
            "level": level,
            "message": f"Presupuesto LLM diario al {pct:.0%}",
            "tokens_today": tokens,
            "budget": budget,
        }


class TokenUsageLedgerPersistent:
    """Adapter TokenUsageLedger→LLMCallsRepository.

    MISMA API del contorno G12 (record/snapshot) para que el
    ResilientClaudeService NO cambie un byte: el bootstrap inyecta
    ESTE objeto con CLUB_PERSISTENCE_URL, el in-memory sin él.

    Extra opcional (lo llama _acall cuando degradó): metrics de la
    llamada (provider/model/degraded/error/latency) — el adapter
    las acepta con defaults neutros para calzar la firma vieja.
    """

    def __init__(
        self,
        repo: LLMCallsRepository,
        *,
        daily_budget: int = 200_000,
        model: str = "",
    ) -> None:
        self.repo = repo
        self.daily_budget = daily_budget
        self.model = model

    async def record(
        self,
        usage: dict[str, Any],
        *,
        provider: str = "claude",
        degraded: bool = False,
        provider_error: str | None = None,
        latency_ms: float = 0.0,
    ) -> dict[str, Any] | None:
        return await self.repo.record(
            usage,
            provider=provider,
            model=self.model,
            degraded=degraded,
            provider_error=provider_error,
            latency_ms=latency_ms,
            daily_budget=self.daily_budget,
        )

    async def snapshot(self) -> dict[str, Any]:
        return await self.repo.snapshot(daily_budget=self.daily_budget)


# re-export explícito para el wiring y la suite
__all__ = [
    "LLMCallsRepository",
    "TokenUsageLedgerPersistent",
    "_today",
]


