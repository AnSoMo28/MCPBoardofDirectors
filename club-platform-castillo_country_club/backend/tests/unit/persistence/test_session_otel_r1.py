"""Suite R-1 (ADR-0007) — spans OTel GenAI de session_scope.

Gate del radar R-1: cada session_scope emite UN span "club.db.session"
con db.repo · db.status · db.latency_ms · db.statements · db.rows.
Se verifica POSITIVO capturando spans reales con un
TracerProvider + SpanExporter propio del test (SimpleSpanProcessor
— probe verificado contra el lock: opentelemetry 1.45.2). Y el
opt-out: CLUB_OTEL_EXPORT=0 → cero emisión (contrato intacto).

Detalle de aislamiento: set_tracer_provider es UNA vez por proceso
(opentelemetry-api lo exige) — el test de opt-out NO toca el
provider: verifica la bandera otel_enabled() directamente.
"""
from __future__ import annotations

import os

import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExporter, SpanExportResult

from club_mcp.db.orm import approvals_orm  # noqa: F401 — registra las tablas en Base.metadata
from club_mcp.db.orm.base import Base
from club_mcp.db.orm.session import make_engine, otel_enabled, session_scope


pytestmark = pytest.mark.asyncio

SQLITE_URL = "sqlite+aiosqlite:///_persist_otel_r1.db"

CAPTURED: list = []


class ListSpanExporter(SpanExporter):
    """Export a lista (la evidencia del test)."""

    def export(self, spans):  # type: ignore[override]
        CAPTURED.extend(spans)
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        return None


def _install_provider() -> None:
    """TracerProvider global UNA vez + UN solo exporter compartido.

    set_tracer_provider es idempotente a nivel API (no override):
    instalamos UN provider y UN processor-exporter a lista que TODA
    la suite comparte — cada test hace CAPTURED.clear() al empezar.
    """
    global _INSTALLED
    if _INSTALLED:
        return
    provider = TracerProvider()
    trace.set_tracer_provider(provider)
    provider.add_span_processor(SimpleSpanProcessor(ListSpanExporter()))
    _INSTALLED = True


_INSTALLED = False


async def test_span_emitted_with_repo_attributes() -> None:
    """R-1 positivo: UN span club.db.session con repo·status·latency·statements·rows."""
    _install_provider()
    CAPTURED.clear()
    engine = make_engine(SQLITE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with session_scope(engine, repo="r1_probe") as session:
        from sqlalchemy import text

        await session.execute(
            text(
                "INSERT INTO approvals (request_id, agent, tool, requested_by, "
                "approval_level, status, params, created_at, risk_summary, "
                "estimated_impact, affected_count, requires_dual_approval, "
                "approver_roles) VALUES ('r1', 'a', 't', 'x', 'hitl', 'pending', "
                "'{}', CURRENT_TIMESTAMP, '', '', 0, 0, '[]')"
            )
        )

    await engine.dispose()
    spans = [s for s in CAPTURED if s.name == "club.db.session"]
    assert len(spans) == 1, f"esperaba 1 span, capturé {len(spans)}"
    attrs = dict(spans[0].attributes)
    assert attrs["db.repo"] == "r1_probe"
    assert attrs["db.status"] == "commit"
    assert attrs["db.statements"] >= 1
    assert "db.latency_ms" in attrs


async def test_span_status_rollback_on_error() -> None:
    """El span reporta rollback cuando la transacción tronó (la mitad oscura del gate)."""
    _install_provider()
    CAPTURED.clear()
    engine = make_engine(SQLITE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    with pytest.raises(RuntimeError, match="boom-r1"):
        async with session_scope(engine, repo="r1_rollback"):
            raise RuntimeError("boom-r1")
    await engine.dispose()
    spans = [s for s in CAPTURED if s.name == "club.db.session"]
    assert len(spans) == 1
    assert dict(spans[0].attributes)["db.status"] == "rollback"


async def test_opt_out_flag() -> None:
    """CLUB_OTEL_EXPORT=0 apaga la emisión (bandera — sin tocar el provider global)."""
    saved = os.environ.get("CLUB_OTEL_EXPORT")
    os.environ["CLUB_OTEL_EXPORT"] = "0"
    try:
        assert otel_enabled() is False
    finally:
        if saved is None:
            os.environ.pop("CLUB_OTEL_EXPORT", None)
        else:
            os.environ["CLUB_OTEL_EXPORT"] = saved
    assert otel_enabled() is True  # default on (el sandbox/ci corre con on)


async def test_session_scope_signature_compatible() -> None:
    """El repo kw es OPCIONAL: las 17 verticales llaman session_scope(engine) SIN repo."""
    engine = make_engine(SQLITE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with session_scope(engine) as session:  # llamada clásica 1-arg
        from sqlalchemy import text

        await session.execute(text("SELECT 1"))
    await engine.dispose()
    assert True  # llegó acá sin TypeError: compat con las 17 verticales
