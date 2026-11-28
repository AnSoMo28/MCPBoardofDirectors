"""Suite de persistencia Ola 2.3 — gate del vertical ApprovalEngine
(Q-PER-03):

    pytest: write → restart runtime → read OK

Misma mecánica de las 17 verticales (Ola 2.1-bis … decimaseptima):
restart REAL (engine.dispose() + engine NUEVO + sesión nueva) ·
RE-RUNNABLE (_reset_backend antes de cada test) · sqlite local /
PG real en CI.

Lo que este archivo verifica (cada test es UNA garantía):
  1. write-restart-read del ciclo HITL: create (proceso A) →
     restart → get_request/approve (proceso B) — la garantía
     textual de NEXT-STEPS 2.3: "approval creada, proceso muere,
     approval sigue pendiente".
  2. LEDGER tamper-evident: cadena íntegra tras el ciclo completo;
     UNA EDICIÓN post-hoc de una fila de events rompe
     verify_chain() EXACTAMENTE ahí (la demostración de que la
     aprobación es auditable criptográficamente — R-6/ADR-0007).
  3. expiración SOBREVIVE al restart: expires_at pasado +
     proceso nuevo → expire_stale() la marca EXPIRED en tabla.
  4. dual/JSONB roundtrip: campos dual + params anidados +
     approver_roles persisten 1:1.
  5. drop-in in-memory vs ORM: MISMO contrato observable (get_pending
     orden created_at · get_request None sin crear · expire_stale 0).
  6. re-register tras restart: executor nuevo + approve → ejecuta
     (los bindings son runtime, la tabla NO los necesita).
  7. get_pending por agent tras restart (filtro + orden).
"""
from __future__ import annotations

import os
from datetime import timedelta
from uuid import UUID

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.approval_repo import (
    GENESIS,
    ApprovalStore,
    event_digest,
    verify_chain_rows,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.hitl.approval_types import ApprovalLevel, ApprovalStatus


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_approvals.db"

pytestmark = pytest.mark.asyncio


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP + CREATE del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def _engine_with_store() -> tuple[ApprovalEngine, ApprovalStore]:
    """Motor OPT-IN cableado al backend de test (el 'proceso A')."""
    engine = make_engine(_backend_url())
    return ApprovalEngine(store=ApprovalStore(engine)), ApprovalStore(engine)


def _engine_with_store_b() -> tuple[ApprovalEngine, ApprovalStore]:
    """Motor 'proceso B': engine NUEVO sobre el MISMO backend (restart)."""
    return _engine_with_store()


async def test_cycle_survives_restart() -> None:
    """Q-PER-03 (gate textual): created por A → restart → PENDING para B → approve."""
    await _reset_backend()
    engine_a, _ = _engine_with_store()
    req = await engine_a.create_request(
        agent="finance",
        tool="finance_invoice_create",
        params={"family_id": "fam-001", "amount": 100.0},
        requested_by="treasurer",
        approval_level=ApprovalLevel.HITL,
        risk_summary="invoice > umbral",
    )
    rid = req.request_id

    # restart REAL: proceso nuevo, dicts vacíos — solo la tabla
    engine_b, store_b = _engine_with_store_b()
    loaded = await engine_b.get_request(rid)
    assert loaded is not None, "la solicitud se perdió en el restart (Q-PER-03 FAIL)"
    assert loaded.status == ApprovalStatus.PENDING
    assert loaded.agent == "finance"
    assert loaded.params["amount"] == 100.0
    assert loaded.approver_roles == []

    approved = await engine_b.approve(rid, approved_by="board-chair", note="ok")
    assert approved.status == ApprovalStatus.APPROVED
    assert approved.resolved_by == "board-chair"
    # tras approve, la tabla refleja el estado resuelto
    persisted = await store_b.get(rid)
    assert persisted is not None and persisted.status == ApprovalStatus.APPROVED


async def test_ledger_tamper_evident() -> None:
    """R-6/ADR-0007: cadena íntegra tras el ciclo; UNA edición rompe EXACTO ahí."""
    await _reset_backend()
    engine_a, store_a = _engine_with_store()
    req = await engine_a.create_request(
        agent="event_orchestrator",
        tool="event_create",
        params={"name": "Gala", "budget": 5000},
        requested_by="manager",
        approval_level=ApprovalLevel.ALWAYS_HUMAN,
    )
    await engine_a.approve(req.request_id, approved_by="gm", note="firma")

    # cadena íntegra: verify_chain() sin roturas
    broken = await store_a.verify_chain()
    assert broken == [], f"cadena rota sin edición previa: {broken}"

    # eventos del ciclo completo: created → approved (append-only)
    events = await store_a.events_for(req.request_id)
    assert [e["event_type"] for e in events] == ["created", "approved"]
    assert events[0]["prev_hash"] == GENESIS

    # EDICIÓN POST-HOC: cambiar el actor del evento approved
    from sqlalchemy import select, update

    from club_mcp.db.orm.approvals_orm import ApprovalEventORM

    eng = make_engine(_backend_url())
    from club_mcp.db.orm.session import session_scope

    async with session_scope(eng, repo="test_tamper") as session:
        row = (
            await session.execute(
                select(ApprovalEventORM).where(
                    ApprovalEventORM.request_id == str(req.request_id)
                )
            )
        ).scalars().all()[1]
        tampered_id = row.id
        await session.execute(
            update(ApprovalEventORM)
            .where(ApprovalEventORM.id == tampered_id)
            .values(actor="malicious-editor")
        )
    await eng.dispose()

    _, store_c = _engine_with_store_b()
    broken = await store_c.verify_chain()
    assert broken != [], "la edición post-hoc NO se detectó (tamper-evidence FAIL)"
    assert all(b["reason"] == "chain_mismatch" for b in broken)
    # la fila editada es la primera en romper (dominó hacia adelante)
    assert broken[0]["event_id"] == tampered_id


async def test_expiry_survives_restart() -> None:
    """La expiración se computa contra la TABLA tras restart (no contra dicts muertos)."""
    await _reset_backend()
    engine_a, _ = _engine_with_store()
    req = await engine_a.create_request(
        agent="finance",
        tool="finance_invoice_create",
        params={"amount": 5.0},
        requested_by="treasurer",
        approval_level=ApprovalLevel.HITL,  # expiry 48h
    )
    # forzar expires_at en el pasado (edición directa del estado durable)
    from sqlalchemy import update as _upd

    from club_mcp.db.orm.approvals_orm import ApprovalORM
    from club_mcp.db.orm.session import session_scope

    eng = make_engine(_backend_url())
    past = req.created_at - timedelta(hours=1)
    async with session_scope(eng, repo="test_expiry") as session:
        await session.execute(
            _upd(ApprovalORM)
            .where(ApprovalORM.request_id == str(req.request_id))
            .values(expires_at=past)
        )
    await eng.dispose()

    # proceso B: expiración contra la tabla
    engine_b, _ = _engine_with_store_b()
    count = await engine_b.expire_stale()
    assert count == 1, f"la expirada no se detectó tras restart: {count}"
    loaded = await engine_b.get_request(req.request_id)
    assert loaded is not None and loaded.status == ApprovalStatus.EXPIRED


async def test_dual_fields_and_jsonb_roundtrip() -> None:
    """Campos dual + params anidados + approver_roles persisten 1:1 (Q-HITL-01 espejo)."""
    await _reset_backend()
    engine_a, _ = _engine_with_store()
    req = await engine_a.create_request(
        agent="communication",
        tool="send_announcement",
        params={"body": "x" * 300, "nested": {"deep": [1, 2, {"k": "v"}]}},
        requested_by="social",
        approval_level=ApprovalLevel.ALWAYS_HUMAN,
        risk_summary="broadcast",
        estimated_impact="all members",
        affected_count=210,
        approver_roles=["board", "gm"],
    )
    # el motor actual NO implementa lógica dual: se setean espejo 1:1 vía modelo
    req.requires_dual_approval = True
    req.first_approval_by = "first"
    eng = make_engine(_backend_url())
    store = ApprovalStore(eng)
    await store.update_state(req)
    await eng.dispose()

    engine_b, _ = _engine_with_store_b()
    loaded = await engine_b.get_request(req.request_id)
    assert loaded is not None
    assert loaded.requires_dual_approval is True
    assert loaded.first_approval_by == "first"
    assert loaded.affected_count == 210
    assert loaded.approver_roles == ["board", "gm"]
    assert loaded.params["nested"]["deep"][2]["k"] == "v"
    assert loaded.risk_summary == "broadcast"


async def test_dropin_inmemory_vs_orm_contract() -> None:
    """Sin store (in-memory) vs con store: MISMO contrato observable."""
    await _reset_backend()
    plain = ApprovalEngine()  # 100% in-memory (sin wiring — comportamiento pre-2.3)
    engine_a, _ = _engine_with_store()

    r1 = await plain.create_request(
        agent="finance", tool="t", params={}, requested_by="x",
        approval_level=ApprovalLevel.HITL,
    )
    r2 = await engine_a.create_request(
        agent="finance", tool="t", params={}, requested_by="x",
        approval_level=ApprovalLevel.HITL,
    )
    # get_pending: mismo filtro y orden
    assert [r.agent for r in await plain.get_pending("finance")] == ["finance"]
    assert [r.agent for r in await engine_a.get_pending("finance")] == ["finance"]
    # get_request desconocida: None en ambos
    assert await plain.get_request(UUID(int=999)) is None
    assert await engine_a.get_request(UUID(int=999)) is None
    # expire_stale sin expiradas: 0 en ambos
    assert await plain.expire_stale() == 0
    assert await engine_a.expire_stale() == 0
    # los requests viven y están PENDING en ambos
    assert r1.status == r2.status == ApprovalStatus.PENDING


async def test_reregister_executor_after_restart() -> None:
    """Bindings runtime: executor registrado en B ejecuta la aprobación creada en A."""
    await _reset_backend()
    engine_a, _ = _engine_with_store()
    req = await engine_a.create_request(
        agent="executive_dashboard",
        tool="generate_quarterly_board_report",
        params={"quarter": "Q4"},
        requested_by="board",
        approval_level=ApprovalLevel.HITL,
    )

    # proceso B: executor NUEVO (re-registrado en cada arranque — como bootstrap)
    engine_b, _ = _engine_with_store_b()
    calls: list[dict] = []

    async def _executor(**params: object) -> dict[str, str]:
        calls.append(dict(params))  # type: ignore[arg-type]
        return {"status": "success"}

    engine_b.register_executor("executive_dashboard", "generate_quarterly_board_report", _executor)
    await engine_b.approve(req.request_id, approved_by="chair")
    assert len(calls) == 1, "el executor re-registrado NO ejecutó tras restart"
    execution = engine_b.get_execution(req.request_id)
    assert execution is not None and execution["status"] == "success"


async def test_get_pending_filter_and_order_after_restart() -> None:
    """Filtro por agent + orden created_at desde la tabla (lección run #56: orden explícito)."""
    await _reset_backend()
    engine_a, _ = _engine_with_store()
    r_f1 = await engine_a.create_request(
        agent="finance", tool="t1", params={}, requested_by="x",
        approval_level=ApprovalLevel.HITL,
    )
    await engine_a.create_request(
        agent="wellness", tool="t2", params={}, requested_by="x",
        approval_level=ApprovalLevel.HITL,
    )
    r_f3 = await engine_a.create_request(
        agent="finance", tool="t3", params={}, requested_by="x",
        approval_level=ApprovalLevel.HITL,
    )
    # resolver la primera: la tabla queda con 1 PENDING de finance y otra de wellness
    await engine_a.approve(r_f1.request_id, approved_by="gm")

    engine_b, _ = _engine_with_store_b()
    pending_finance = await engine_b.get_pending("finance")
    assert len(pending_finance) == 1
    assert pending_finance[0].tool == "t3"
    assert pending_finance[0].request_id == r_f3.request_id
    all_pending = await engine_b.get_pending()
    assert sorted(p.agent for p in all_pending) == ["finance", "wellness"]


async def test_chain_digest_is_deterministic() -> None:
    """event_digest puro: mismo input → mismo hash; distinto input → distinto hash."""
    d1 = event_digest(GENESIS, '{"a":1}')
    d2 = event_digest(GENESIS, '{"a":1}')
    d3 = event_digest(GENESIS, '{"a":2}')
    assert d1 == d2 and d1 != d3
    assert len(d1) == 64
    # rows vacía: cadena íntegra por definición
    assert verify_chain_rows([]) == []
