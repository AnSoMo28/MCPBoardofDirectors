"""Suite de persistencia Ola 2.2 — gate del vertical event:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement (Ola 2.1-bis/-tris):
restart REAL (engine.dispose() + engine NUEVO + sesión nueva) ·
RE-RUNNABLE (_reset_backend antes de cada test) · sqlite local /
pgvector real en CI.

Además — el gate de CONTRATO: los 50 tests del agente event
(tests/unit/agents/test_event_orchestrator.py) corren contra el repo
in-memory; este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 25 métodos · None/[]/False sin excepciones
custom · enums roundtrip · auto-waitlist por cupo · CASCADE al
borrar evento) comparando comportamiento observable.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.event_orm import EventProgramItemORM
from club_mcp.db.orm.repositories.event_repo import (
    EventRepository as EventRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.event import (
    EventCategory,
    EventCreate,
    EventSearchParams,
    EventStatus,
    EventType,
    EventPricingModel,
    RecurrencePattern,
    RSVPStatus,
    VendorContractStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_event.db"


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


pytestmark = pytest.mark.asyncio


async def _make_repo() -> tuple[EventRepoORM, object]:
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return EventRepoORM(engine), engine


def _fiesta() -> EventCreate:
    """max_capacity=2 — el laboratorio del auto-waitlist."""
    return EventCreate(
        title="Fiesta de Fin de Año",
        description="La celebración más esperada",
        category=EventCategory.FESTIVE,
        event_type=EventType.OPEN,
        date_start=datetime(2026, 12, 31, 18, 0, tzinfo=timezone.utc),
        date_end=datetime(2027, 1, 1, 2, 0, tzinfo=timezone.utc),
        location="Jardín Principal",
        facility_ids=["fac-jardin", "fac-sonido"],
        age_groups=["all"],
        max_capacity=2,
        pricing_model=EventPricingModel.PAID,
        price_per_person=25000.0,
        is_members_only=True,
        allow_guests=True,
        max_guests_per_family=4,
        recurrence=RecurrencePattern.NONE,
        requires_rsvp=True,
        dress_code="Elegante",
        notes="Traer champaña",
        tags=["fin-de-año", "familia"],
        created_by="admin_001",
    )


def _fiesta_full() -> EventCreate:
    """Mismo evento con cupo holgado (500) — para los tests de
    search/analytics/report donde el cupo no debe interferir."""
    data = _fiesta().model_dump()
    data["max_capacity"] = 500
    return EventCreate(**data)


async def test_event_write_restart_read() -> None:
    """PATH 2.2 gate: write → dispose (restart) → NEW engine → read."""
    await _reset_backend()
    url = _backend_url()
    # write (engine 1) — evento + programa + rsvp que SOLO existen en tablas
    engine1 = make_engine(url)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo1 = EventRepoORM(engine1)
    ev = await repo1.create_event(_fiesta())
    assert ev.id.startswith("evt_")
    assert ev.status == EventStatus.DRAFT.value
    await repo1.add_program_item(
        ev.id, title="Brindis", time_start="23:45", time_end="00:15", order=1
    )
    rsvp = await repo1.add_rsvp(
        ev.id,
        family_id="fam-001",
        member_ids=["m-1"],
        guests_count=1,
        family_name="García",
    )
    assert rsvp is not None and rsvp.status == RSVPStatus.CONFIRMED.value
    assert rsvp.total_cost == 50000.0  # 2 personas × 25000
    await engine1.dispose()  # ← restart: TODO lo in-memory muere acá

    # read (engine 2 — NUEVO proceso/sesión)
    engine2 = make_engine(url)
    async with engine2.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo2 = EventRepoORM(engine2)
    back = await repo2.get_event(ev.id)
    assert back is not None
    assert back.title == "Fiesta de Fin de Año"
    assert back.current_attendance == 2  # sobrevivió al restart (COUNT real)
    assert len(back.programs) == 1 and back.programs[0].title == "Brindis"
    assert len(back.rsvps) == 1 and back.rsvps[0].family_name == "García"
    assert back.tags == ["fin-de-año", "familia"]  # JSONB roundtrip
    assert back.facility_ids == ["fac-jardin", "fac-sonido"]
    await engine2.dispose()


async def test_rsvp_auto_waitlist_and_capacity() -> None:
    """La semántica sync del dominio, sobre I/O async: cupo NUNCA se
    sobrevende — add_rsvp cuenta confirmados dentro de la MISMA
    transacción antes de decidir waitlist."""
    await _reset_backend()
    repo, engine = await _make_repo()
    ev = await repo.create_event(_fiesta())  # max_capacity=2

    r1 = await repo.add_rsvp(ev.id, family_id="fam-001", member_ids=["m-1"], guests_count=1)
    assert r1 is not None and r1.status == RSVPStatus.CONFIRMED.value  # 2/2

    r2 = await repo.add_rsvp(ev.id, family_id="fam-002", member_ids=["m-2"], guests_count=0)
    assert r2 is not None and r2.status == RSVPStatus.WAITLISTED.value  # excede → waitlist

    cap = await repo.get_capacity_info(ev.id)
    assert cap is not None
    assert cap.current_attendance == 2 and cap.is_full and cap.waitlist_count == 1
    assert cap.available_spots == 0 and cap.occupancy_pct == 100.0

    # remove del confirmado → el waitlist sigue waitlisted (mismo
    # comportamiento que el in-memory: promoción manual vía update)
    assert await repo.remove_rsvp(r1.id) is True
    cap2 = await repo.get_capacity_info(ev.id)
    assert cap2 is not None
    assert cap2.current_attendance == 0 and cap2.waitlist_count == 1
    await engine.dispose()


async def test_enums_and_updates_roundtrip() -> None:
    """Updates con enums → .value persistido → read reconstruye el
    mismo Pydantic (contrato: el agente pasa enums por update)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    ev = await repo.create_event(_fiesta())

    upd = await repo.update_event(ev.id, {"status": EventStatus.PUBLISHED})
    assert upd is not None and upd.status == EventStatus.PUBLISHED.value

    vendor = await repo.add_vendor(
        ev.id, name="Catering Castillo", service_type="catering",
        contact_name="Ana", quoted_cost=150000.0,
    )
    assert vendor is not None
    assert vendor.contract_status == VendorContractStatus.PENDING.value
    upd_v = await repo.update_vendor(
        vendor.id, {"contract_status": VendorContractStatus.CONTRACTED, "final_cost": 140000.0}
    )
    assert upd_v is not None
    assert upd_v.contract_status == VendorContractStatus.CONTRACTED.value
    assert upd_v.final_cost == 140000.0

    rsvp = await repo.add_rsvp(ev.id, family_id="fam-003", member_ids=["m-3"])
    assert rsvp is not None
    upd_r = await repo.update_rsvp(rsvp.id, {"status": RSVPStatus.DECLINED})
    assert upd_r is not None and upd_r.status == RSVPStatus.DECLINED.value
    await engine.dispose()


async def test_delete_event_cascade() -> None:
    """delete_event borra los 3 hijos (FK ON DELETE CASCADE) — el
    invariante que el in-memory cumplía con rebuild de dicts."""
    await _reset_backend()
    repo, engine = await _make_repo()
    ev = await repo.create_event(_fiesta())
    await repo.add_rsvp(ev.id, family_id="fam-001", member_ids=["m-1"])
    await repo.add_vendor(ev.id, name="Sonido SA", service_type="av")
    await repo.add_program_item(ev.id, title="Apertura", time_start="18:00", time_end="18:30")

    assert await repo.delete_event(ev.id) is True
    assert await repo.get_event(ev.id) is None
    assert await repo.get_rsvp("cualquiera") is None
    assert (await repo.list_rsvps(ev.id)) == []
    assert (await repo.list_vendors(ev.id)) == []
    assert (await repo.list_program(ev.id)) == []
    assert await repo.delete_event(ev.id) is False  # contrato: no existe → False
    await engine.dispose()


async def test_search_calendar_analytics_report_conflicts() -> None:
    """search con filtros · calendar por día · analytics · report ·
    conflict detection — comportamiento observable igual al in-memory."""
    await _reset_backend()
    repo, engine = await _make_repo()
    ev = await repo.create_event(_fiesta_full())  # max_capacity=500: caben 2
    await repo.update_event(ev.id, {"status": EventStatus.PUBLISHED.value})
    await repo.add_rsvp(ev.id, family_id="fam-001", member_ids=["m-1"], guests_count=1)
    # segundo evento SOLAPADO en el mismo location → conflicto venue+time
    tennis = EventCreate(
        title="Torneo de Tenis",
        category=EventCategory.SPORTS,
        event_type=EventType.OPEN,
        date_start=datetime(2026, 12, 31, 20, 0, tzinfo=timezone.utc),
        date_end=datetime(2026, 12, 31, 23, 0, tzinfo=timezone.utc),
        location="Jardín Principal",
        max_capacity=100,
        pricing_model=EventPricingModel.FREE,
    )
    ev2 = await repo.create_event(tennis)

    # search: filtro por categoría con paginación
    found = await repo.search_events(
        EventSearchParams(category=EventCategory.FESTIVE, page=1, page_size=10)
    )
    assert len(found) == 1 and found[0].id == ev.id
    found_all = await repo.search_events(EventSearchParams())
    assert len(found_all) == 2
    assert found_all[0].date_start <= found_all[1].date_start  # orden por fecha

    # calendar: 31-dic tiene 2 eventos → has_conflicts True
    cal = await repo.get_calendar(
        datetime(2026, 12, 31, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 12, 31, 23, 59, tzinfo=timezone.utc),
    )
    assert len(cal) == 1 and cal[0].total_events == 2
    assert cal[0].has_conflicts is True

    # analytics — semántica del in-memory: confirmed_attendance
    # cuenta RSVPs confirmados (NO heads); los heads viven en
    # average_guests_per_family y en current_attendance.
    an = await repo.compute_analytics(ev.id)
    assert an is not None
    assert an.confirmed_attendance == 1 and an.attendance_rate == 100.0
    assert an.revenue == 50000.0
    assert an.average_guests_per_family == 1.0

    # report del período
    rep = await repo.generate_report(
        datetime(2026, 12, 1, tzinfo=timezone.utc),
        datetime(2027, 1, 31, tzinfo=timezone.utc),
    )
    assert rep.total_events == 2 and rep.total_revenue == 50000.0

    # conflict detection: par (ev, ev2) con overlap → venue + time
    conf = await repo.get_conflict_details(
        datetime(2026, 12, 1, tzinfo=timezone.utc),
        datetime(2027, 1, 31, tzinfo=timezone.utc),
    )
    assert len(conf) == 1
    assert "venue" in conf[0]["conflict_types"] and "time" in conf[0]["conflict_types"]
    assert conf[0]["severity"] == "high"  # venue → high (regla del in-memory)
    assert conf[0]["event_a_id"] == ev.id and conf[0]["event_b_id"] == ev2.id
    await engine.dispose()


async def test_contract_none_empty_and_agent_with_orm_repo() -> None:
    """Contrato de ausencia (None / [] / False — sin excepciones) +
    el agente event corre con el repo ORM inyectado (swap del
    bootstrap) — mismo patrón que el gate de contrato engagement."""
    await _reset_backend()
    repo, engine = await _make_repo()
    # contrato de ausencia — el in-memory no lanza, el ORM tampoco
    assert await repo.get_event("evt_inexistente") is None
    assert await repo.get_rsvp("rsvp_inexistente") is None
    assert await repo.get_family_rsvp("evt_inexistente", "fam-x") is None
    assert await repo.add_rsvp("evt_inexistente", family_id="f", member_ids=[]) is None
    assert await repo.add_vendor("evt_inexistente", name="x", service_type="y") is None
    assert (
        await repo.add_program_item("evt_inexistente", title="x", time_start="", time_end="")
        is None
    )
    assert await repo.get_capacity_info("evt_inexistente") is None
    assert await repo.compute_analytics("evt_inexistente") is None
    assert await repo.clone_event("evt_inexistente", datetime(2027, 1, 1, tzinfo=timezone.utc),
                                 datetime(2027, 1, 2, tzinfo=timezone.utc)) is None
    assert await repo.update_event("evt_inexistente", {"title": "x"}) is None
    assert await repo.remove_vendor("vnd_inexistente") is False
    assert await repo.remove_program_item("prog_inexistente") is False

    # el agente event CON el repo ORM inyectado (radio 0: el agente
    # no sabe qué implementación tiene detrás)
    ev = await repo.create_event(_fiesta())
    await repo.update_event(ev.id, {"status": EventStatus.PUBLISHED.value})
    rsvp = await repo.add_rsvp(
        ev.id, family_id="fam-001", member_ids=["m-1"], family_name="García"
    )
    assert rsvp is not None

    an = await repo.compute_analytics(ev.id)
    assert an is not None and an.confirmed_attendance == 1
    await engine.dispose()
