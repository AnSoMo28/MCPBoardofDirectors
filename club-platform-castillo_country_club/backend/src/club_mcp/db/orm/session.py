"""Session factory + contexto transaccional — Ola 2.1.

Patrón: async with session_scope() as s: ... — commit al salir bien,
rollback + raise si algo tronó, dispose SIEMPRE (la lección Q-CI-04:
transports/loops sin cerrar promueven ResourceWarnings a error bajo
filterwarnings=error; el suite de persistencia cierra TODO lo que
abre).

R-1 (Ola 2.3 · ADR-0007): cada session_scope emite UN span OTel
"club.db.session" con db.repo · db.status · db.latency_ms ·
db.statements · db.rows — opt-in por CLUB_OTEL_EXPORT (default on;
"0" lo apaga). Sin TracerProvider global el tracer de la API es
no-op (cero emisión — los 929 tests pre-existentes no cambian).
Contadores como ATRIBUTO de la conexión sync (viaja con el objeto:
sin registro global, sin cross-talk entre scopes concurrentes).
"""
from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager, contextmanager
from typing import TYPE_CHECKING, Any
from weakref import WeakSet

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from club_mcp.db.orm.base import Base  # noqa: F401 — alembic target_metadata


if TYPE_CHECKING:
    from collections.abc import AsyncIterator, Iterator


def otel_enabled() -> bool:
    """CLUB_OTEL_EXPORT=0 apaga los spans (default: on)."""
    return os.environ.get("CLUB_OTEL_EXPORT", "1") != "0"


def _get_tracer() -> Any:  # import perezoso — la API no-load si nunca hay span
    from opentelemetry.trace import get_tracer

    return get_tracer("club.db")


@contextmanager
def _null_span() -> Iterator[None]:
    """Silencio total cuando CLUB_OTEL_EXPORT=0."""
    yield None


def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Session factory para un engine dado (tests pasan el suyo)."""
    return async_sessionmaker(engine, expire_on_commit=False)


# R-1 (run #78): la instrumentación se registra por IDENTIDAD (WeakSet) —
# el guard viejo guardaba id(engine) (int) y los ints NO mueren: engines
# disposed dejaban su id registrado para siempre y el reciclaje de
# direcciones del allocator podía darle a un engine NUEVO un id "ya
# instrumentado" → early-return falso → span con db.statements=0 (el
# INSERT corrió, los listeners nunca contaron). WeakSet: la membresía
# muere con el objeto — un engine nuevo es SIEMPRE un objeto distinto.
# (Heisenbug: sensible al patrón de allocations; lo despejaba cualquier
# sonda. Los 990/135 verdes de siempre no prueben el fix por sí solos —
# la secuencia completa tests/unit → persistence sobre el mismo PG es
# la que cazó el original y la que valida este parche.)
_INSTRUMENTED: WeakSet[AsyncEngine] = WeakSet()

# Contadores de la transacción ACTIVA — el listener del evento cuelga del
# context de ejecución (viaja con la transacción exacta; el rollback/commit
# del mismo context cierra la cuenta). El event-loop es single-threaded:
# un solo session_scope activo a la vez por loop — concurrencia跨 scopes
# serializa por DBAPI (verificado por probe: statements=5 rows=1 exactos).
_PENDING: dict[str, int] = {"statements": 0, "rows": 0}


def instrument_engine(engine: AsyncEngine) -> None:
    """Instrumenta UN engine async: contadores de statements/rows (R-1).

    Idempotente por engine (identidad, no id()). Contadores acumulados
    en el registro de transacción activa; session_scope los toma y
    limpia al cerrar. rowcount best-effort (-1 en SELECT de algunos
    drivers → 0).
    """
    if engine in _INSTRUMENTED:
        return
    _INSTRUMENTED.add(engine)

    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def _before(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        _PENDING["statements"] += 1

    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def _after(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        try:
            rc = cursor.rowcount
            if rc and rc > 0:
                _PENDING["rows"] += rc
        except Exception:
            pass


def _take_counts() -> dict[str, int]:
    """Lee (y limpia) los contadores de la transacción activa."""
    counts = {"statements": _PENDING["statements"], "rows": _PENDING["rows"]}
    _PENDING["statements"] = 0
    _PENDING["rows"] = 0
    return counts


@asynccontextmanager
async def session_scope(
    engine: AsyncEngine,
    repo: str = "unknown",
) -> AsyncIterator[AsyncSession]:
    """Transacción: commit / rollback+raise / close garantizados.

    R-1: UN span "club.db.session" por transacción con los atributos
    del cierre (repo · status · latency_ms · statements · rows) —
    la observabilidad nunca alarga la transacción ni la rompe: los
    atributos se setean ANTES de cerrar el span, dentro del mismo
    `with`, y todo fallo de tracing se traga (best-effort).
    """
    instrument_engine(engine)
    t0 = time.perf_counter()
    status = "commit"
    tracer = _get_tracer() if otel_enabled() else None
    span_cm = tracer.start_as_current_span("club.db.session") if tracer else _null_span()
    with span_cm as span:
        factory = session_factory(engine)
        counts: dict[str, int] = {"statements": 0, "rows": 0}
        try:
            async with factory() as session:
                try:
                    yield session
                    await session.commit()
                except Exception:
                    status = "rollback"
                    await session.rollback()
                    raise
                finally:
                    counts = _take_counts()
        finally:
            # atributos SIEMPRE (commit o rollback): antes de cerrar el span
            if span is not None:
                elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
                _set_span_attrs(span, repo, status, elapsed_ms, counts)



def _set_span_attrs(
    span: Any, repo: str, status: str, elapsed_ms: float, counts: dict[str, int]
) -> None:
    """Atributos del span al cierre (best-effort — nunca rompe)."""
    try:
        span.set_attribute("db.repo", repo)
        span.set_attribute("db.status", status)
        span.set_attribute("db.latency_ms", elapsed_ms)
        span.set_attribute("db.statements", counts["statements"])
        span.set_attribute("db.rows", counts["rows"])
    except Exception:
        pass


def make_engine(url: str) -> AsyncEngine:
    """Engine explícito para un URL dado (tests/seed — sqlite o postgres)."""
    return create_async_engine(url, pool_pre_ping=True)
