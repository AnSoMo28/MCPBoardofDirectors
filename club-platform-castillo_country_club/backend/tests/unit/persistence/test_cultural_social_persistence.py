"""Suite de persistencia Ola 2.1-nona — gate del vertical cultural_social:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction/communication (Ola 2.1-bis/-tris/2.2/2.1-quinqua/-sexta/
-septima/-octava): restart REAL (engine.dispose() + engine NUEVO +
sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente cultural_social
(tests/unit/agents/test_cultural_social_agent.py) corren contra el repo
in-memory async; este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 23 métodos · None/[]/dict sin excepciones custom
salvo la ValueError literal de get_status_counts · enums roundtrip ·
updates parciales dict · listas JSONB roundtrip · analytics compute-on-
read byte a byte · get_upcoming ventana N días strings).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.cultural_social_repo import (
    CulturalSocialRepository as CulturalSocialRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.cultural_social import (
    CreateArtExhibition,
    CreateCulturalEvent,
    CreateCulturalProgram,
    CreateEntertainmentAct,
    CulturalCategory,
    EntertainmentType,
    EventStatus,
    EventType,
    ExhibitionStatus,
    FormalityLevel,
    PerformanceStatus,
    ProgramStatus,
    VenueType,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_cultural_social.db"

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


def _repo() -> CulturalSocialRepoORM:
    return CulturalSocialRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: CulturalSocialRepoORM) -> CulturalSocialRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


# ── test 1 · events CRUD + filtros + cancel ─────────────────────────


async def test_events_crud_filtered_restart() -> None:
    """write → restart → read: create/update/get/list/filtered/cancel."""
    await _reset_backend()
    repo = _repo()

    e1 = await repo.create_event(
        CreateCulturalEvent(
            name="Noche de Gala",
            event_type=EventType.GALA,
            formality=FormalityLevel.FORMAL,
            venue="Salón Principal",
            venue_type=VenueType.BALLROOM,
            date="2026-12-15",
            start_time="19:00",
            end_time="23:00",
            organizer_member_id="m-001",
            guest_count=180,
            budget=15000.0,
            menu_theme="Cena de gala",
            dress_code="black tie",
        )
    )
    e2 = await repo.create_event(
        CreateCulturalEvent(
            name="Club de Lectura",
            event_type=EventType.RECEPTION,
            formality=FormalityLevel.CASUAL,
            venue="Biblioteca",
            venue_type=VenueType.LOUNGE,
            date="2026-11-25",
            start_time="18:00",
            end_time="20:00",
            organizer_member_id="m-002",
        )
    )
    assert e1.status == EventStatus.PLANNED
    assert e1.entertainment_ids == []
    assert e1.created_at != ""

    # update dict parcial + None-filter
    upd = await repo.update_event(e1.id, {"guest_count": 200, "budget": 17000.0})
    assert upd is not None and upd.guest_count == 200 and upd.budget == 17000.0
    assert upd.name == "Noche de Gala"  # intocables persisten

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_event(e1.id)
    assert got is not None and got.guest_count == 200
    assert got.event_type == EventType.GALA  # enum roundtrip
    assert await repo.get_event("no-existe") is None

    # filtros: por enum + por rango de fecha
    galas = await repo.list_events(event_type=EventType.GALA)
    assert len(galas) == 1 and galas[0].id == e1.id
    nov = await repo.list_events(date_from="2026-11-01", date_to="2026-11-30")
    assert [e.id for e in nov] == [e2.id]
    all_events = await repo.list_events()
    assert len(all_events) == 2  # orden de inserción

    # cancel = update status
    cancelled = await repo.cancel_event(e2.id)
    assert cancelled is not None and cancelled.status == EventStatus.CANCELLED
    assert await repo.cancel_event("no-existe") is None


# ── test 2 · acts + programs + exhibitions roundtrip ────────────────


async def test_acts_programs_exhibitions_restart() -> None:
    """write → restart → read: 3 entidades restantes con JSONB roundtrip."""
    await _reset_backend()
    repo = _repo()

    a1 = await repo.create_act(
        CreateEntertainmentAct(
            artist_name="Trío Astor",
            entertainment_type=EntertainmentType.LIVE_BAND,
            genre="tango",
            duration_minutes=90,
            cost=2500.0,
            requirements=["escenario", "2 micrófonos"],
        )
    )
    assert a1.status == PerformanceStatus.PROPOSED
    assert a1.event_id is None
    assert a1.requirements == ["escenario", "2 micrófonos"]

    upd = await repo.update_act(a1.id, {"status": PerformanceStatus.CONFIRMED, "event_id": "ev-1"})
    assert upd is not None and upd.status == PerformanceStatus.CONFIRMED
    assert upd.event_id == "ev-1"

    p1 = await repo.create_program(
        CreateCulturalProgram(
            name="Escuela de Tango",
            category=CulturalCategory.DANCE,
            description="Programa trimestral",
            season="Q1-2027",
            start_date="2027-01-10",
            end_date="2027-03-20",
            coordinator_member_id="m-003",
            max_participants=40,
            budget=6000.0,
        )
    )
    assert p1.status == ProgramStatus.DRAFT
    assert p1.current_participants == 0
    upd_p = await repo.update_program(p1.id, {"current_participants": 12})
    assert upd_p is not None and upd_p.current_participants == 12

    x1 = await repo.create_exhibition(
        CreateArtExhibition(
            title="Paisajes de Costa Rica",
            artist_name="Ana Villalobos",
            category=CulturalCategory.VISUAL_ARTS,
            venue="Galería Norte",
            venue_type=VenueType.AUDITORIUM,
            start_date="2026-12-01",
            end_date="2026-12-20",
            num_pieces=25,
            curator_member_id="m-004",
            opening_reception=True,
        )
    )
    assert x1.status == ExhibitionStatus.SCHEDULED
    assert x1.opening_reception is True

    # restart REAL
    repo = await _restart_repo(repo)

    got_a = await repo.get_act(a1.id)
    assert got_a is not None and got_a.requirements == ["escenario", "2 micrófonos"]
    assert got_a.entertainment_type == EntertainmentType.LIVE_BAND

    got_p = await repo.get_program(p1.id)
    assert got_p is not None and got_p.current_participants == 12
    assert got_p.category == CulturalCategory.DANCE

    got_x = await repo.get_exhibition(x1.id)
    assert got_x is not None and got_x.num_pieces == 25

    # listas con filtro enum
    bands = await repo.list_acts(entertainment_type=EntertainmentType.LIVE_BAND)
    assert len(bands) == 1
    dances = await repo.list_programs(category=CulturalCategory.DANCE, season="Q1-2027")
    assert len(dances) == 1
    visual = await repo.list_exhibitions(status=ExhibitionStatus.SCHEDULED)
    assert len(visual) == 1

    # get None
    assert await repo.get_act("no") is None
    assert await repo.get_program("no") is None
    assert await repo.get_exhibition("no") is None


# ── test 3 · analytics compute-on-read ──────────────────────────────


async def test_analytics_compute_on_read() -> None:
    """status_counts · upcoming · budget_by_category · venue · costs · seasonal."""
    await _reset_backend()
    repo = _repo()

    await repo.create_program(
        CreateCulturalProgram(
            name="Escuela de Tango",
            category=CulturalCategory.DANCE,
            description="d",
            season="Q1-2027",
            start_date="2026-11-01",
            end_date="2027-02-01",
            coordinator_member_id="m-003",
            max_participants=40,
            budget=6000.0,
        )
    )
    await repo.create_program(
        CreateCulturalProgram(
            name="Coro del Club",
            category=CulturalCategory.MUSIC,
            description="d",
            season="Q1-2027",
            start_date="2026-11-01",
            end_date="2027-02-01",
            coordinator_member_id="m-005",
            max_participants=60,
            budget=3000.0,
        )
    )

    # status_counts (enums como keys .value)
    counts = await repo.get_status_counts("programs")
    assert counts == {"draft": 2}
    with pytest.raises(ValueError):
        await repo.get_status_counts("no-existe")

    # upcoming: program activo dentro de ventana 30d aparece
    up = await repo.get_upcoming(days=30)
    assert set(up.keys()) == {"events", "exhibitions", "programs"}
    assert len(up["programs"]) >= 1
    assert up["events"] == [] and up["exhibitions"] == []

    # budget por categoría — misma aritmética
    budgets = await repo.get_budget_by_category()
    assert budgets == {"dance": 6000.0, "music": 3000.0}

    # venue utilization (events suman guests+budget, exhibitions bookings)
    await repo.create_event(
        CreateCulturalEvent(
            name="Gala",
            event_type=EventType.GALA,
            venue="Salón Principal",
            date="2026-11-22",
            start_time="20:00",
            end_time="23:00",
            organizer_member_id="m-001",
            guest_count=100,
            budget=5000.0,
        )
    )
    venues = await repo.get_venue_utilization()
    assert len(venues) == 1
    v = venues[0]
    assert v["venue"] == "Salón Principal" and v["bookings"] == 1
    assert v["total_guests"] == 100 and v["avg_guests"] == 100.0

    # entertainment costs — avg/cost_per_minute/contracted_rate
    await repo.create_act(
        CreateEntertainmentAct(
            artist_name="Dúo Sol",
            entertainment_type=EntertainmentType.LIVE_BAND,
            duration_minutes=120,
            cost=3000.0,
        )
    )
    await repo.create_act(
        CreateEntertainmentAct(
            artist_name="DJ Nocturna",
            entertainment_type=EntertainmentType.DJ,
            duration_minutes=180,
            cost=1200.0,
        )
    )
    costs = await repo.get_entertainment_costs()
    by_type = {c["type"]: c for c in costs}
    band = by_type["live_band"]
    assert band["total_acts"] == 1 and band["total_cost"] == 3000.0
    assert band["avg_cost"] == 3000.0 and band["cost_per_minute"] == 25.0
    dj = by_type["dj"]
    assert dj["contracted_rate"] == 0.0  # proposed no cuenta

    # seasonal data — enrollment_rate
    seasonal = await repo.get_seasonal_data("Q1-2027")
    assert len(seasonal) == 1
    s = seasonal[0]
    assert s["programs"] == 2 and s["max_participants"] == 100
    assert s["enrollment_rate"] == 0.0  # current 0
    # sin filtro trae igual (season=None)
    all_seasons = await repo.get_seasonal_data()
    assert len(all_seasons) == 1


# ── test 4 · contrato vacío sin excepciones ─────────────────────────


async def test_empty_backend_contract() -> None:
    """Tabla vacía → None/[]/dict EXACTO como el in-memory sin seed."""
    await _reset_backend()
    repo = _repo()

    assert await repo.get_event("x") is None
    assert await repo.list_events() == []
    assert await repo.list_acts() == []
    assert await repo.list_programs() == []
    assert await repo.list_exhibitions() == []
    assert await repo.get_status_counts("events") == {}
    up = await repo.get_upcoming(days=30)
    assert up == {"events": [], "exhibitions": [], "programs": []}
    assert await repo.get_budget_by_category() == {}
    assert await repo.get_venue_utilization() == []
    assert await repo.get_entertainment_costs() == []
    assert await repo.get_seasonal_data() == []
    with pytest.raises(ValueError):
        await repo.get_status_counts("nonsense")
