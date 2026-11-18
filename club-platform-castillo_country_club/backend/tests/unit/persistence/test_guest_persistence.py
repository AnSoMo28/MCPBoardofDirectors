"""Suite de persistencia Ola 2.1-sexta — gate del vertical guest:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance
(Ola 2.1-bis/-tris/2.2/2.1-quinqua): restart REAL (engine.dispose() +
engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes de
cada test) · sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los 44 tests del agente guest
(tests/unit/agents/test_guest_management_agent.py) corren contra el
repo in-memory async; este archivo verifica que el repo ORM async
cumple el mismo contrato (mismos 18 métodos · None/[] sin excepciones
custom · enums roundtrip · update_* aplica dict completo · filtros
list_* · analytics dict · compute-on-read: funnel/health/forecast
leen las TABLAS, no memoria de proceso).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.guest_orm import GuestMonthlySnapshotORM
from club_mcp.db.orm.repositories.guest_repo import (
    GuestManagementRepository as GuestRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.guest_management import (
    CreateGuest,
    CreatePrivateEvent,
    CreateTrialMembership,
    GuestStatus,
    PrivateEventStatus,
    TrialMembershipStatus,
    TrialMembershipType,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_guest.db"

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


def _repo() -> GuestRepoORM:
    return GuestRepoORM(make_engine(_backend_url()))


async def _seed_snapshots(repo: GuestRepoORM) -> None:
    """Carga 6 meses demo en la tabla de snapshots (criterio 0011)."""
    from club_mcp.db.orm.session import session_scope

    data = {
        "2026-01": {"new_guests": 8, "check_ins": 12, "trials": 2, "conversions": 1, "events": 1},
        "2026-02": {"new_guests": 10, "check_ins": 18, "trials": 3, "conversions": 2, "events": 2},
        "2026-03": {"new_guests": 7, "check_ins": 14, "trials": 2, "conversions": 2, "events": 1},
        "2026-04": {"new_guests": 12, "check_ins": 22, "trials": 3, "conversions": 0, "events": 2},
        "2026-05": {"new_guests": 9, "check_ins": 16, "trials": 2, "conversions": 1, "events": 1},
        "2026-06": {"new_guests": 6, "check_ins": 10, "trials": 1, "conversions": 0, "events": 1},
    }
    rows = [GuestMonthlySnapshotORM(month=m, **d) for m, d in data.items()]
    engine = repo._engine
    async with session_scope(engine) as s:
        for row in rows:
            s.add(row)


GUEST = {
    "family_id": "fam-001",
    "host_member_id": "mem-001",
    "guest_name": "Roberto Chen",
    "guest_email": "rchen@mail.com",
    "guest_phone": "8888-1001",
    "visit_date": "2026-06-15",
    "purpose": "social",
    "privileges": ["pool", "dining"],
}


async def test_guest_write_restart_read() -> None:
    """write → restart runtime → read: el guest SOBREVIVE."""
    await _reset_backend()
    repo = _repo()
    guest = await repo.create_guest(CreateGuest(**GUEST))
    assert guest.status == GuestStatus.REGISTERED
    assert guest.privileges == ["pool", "dining"]

    # restart runtime REAL: engine NUEVO + sesión nueva
    repo2 = _repo()
    read = await repo2.get_guest(guest.id)
    assert read is not None
    assert read.guest_name == "Roberto Chen"
    assert read.status == GuestStatus.REGISTERED
    assert read.privileges == ["pool", "dining"]

    missing = await repo2.get_guest("inexistente")
    assert missing is None


async def test_guest_update_and_list_filters() -> None:
    """update_guest (dict completo, enums) + filtros list_guests."""
    await _reset_backend()
    repo = _repo()
    g1 = await repo.create_guest(CreateGuest(**GUEST))
    await repo.create_guest(
        CreateGuest(
            family_id="fam-002",
            host_member_id="mem-005",
            guest_name="Diego Mora",
            visit_date="2026-06-20",
            purpose="business",
        )
    )

    checked = await repo.update_guest(
        g1.id, {"status": GuestStatus.CHECKED_IN.value}
    )
    assert checked is not None
    assert checked.status == GuestStatus.CHECKED_IN

    fam = await repo.list_guests(family_id="fam-002")
    assert len(fam) == 1
    assert fam[0].guest_name == "Diego Mora"

    active = await repo.list_guests(status="checked_in")
    assert len(active) == 1
    assert active[0].id == g1.id

    day = await repo.list_guests(visit_date="2026-06-20")
    assert len(day) == 1

    missing = await repo.update_guest("inexistente", {"status": "cancelled"})
    assert missing is None


async def test_event_and_trial_write_restart_read() -> None:
    """event + trial: write → restart → read + filtros."""
    await _reset_backend()
    repo = _repo()
    event = await repo.create_private_event(
        CreatePrivateEvent(
            family_id="fam-001",
            event_name="Boda Chen-Vargas",
            event_type="wedding",
            venue="Salón Principal",
            date="2026-08-15",
            guest_count=180,
            budget=8500000,
        )
    )
    assert event.status == PrivateEventStatus.INQUIRY
    assert event.estimated_cost == 0.0

    trial = await repo.create_trial_membership(
        CreateTrialMembership(
            guest_name="María Fernanda López",
            referred_by_family_id="fam-004",
            trial_type="month_trial",
            start_date="2026-07-01",
            end_date="2026-08-01",
        )
    )
    assert trial.status == TrialMembershipStatus.PENDING_APPROVAL

    repo2 = _repo()  # restart runtime
    read_ev = await repo2.get_private_event(event.id)
    assert read_ev is not None
    assert read_ev.event_type.value == "wedding"
    assert read_ev.guest_count == 180

    approved = await repo2.update_private_event(
        event.id, {"status": PrivateEventStatus.APPROVED.value}
    )
    assert approved is not None
    assert approved.status == PrivateEventStatus.APPROVED

    events_fam = await repo2.list_private_events(family_id="fam-001")
    assert len(events_fam) == 1
    read_tr = await repo2.get_trial_membership(trial.id)
    assert read_tr is not None
    assert read_tr.trial_type == TrialMembershipType.MONTH_TRIAL

    converted = await repo2.update_trial_membership(
        trial.id, {"status": TrialMembershipStatus.CONVERTED.value}
    )
    assert converted is not None
    assert converted.status == TrialMembershipStatus.CONVERTED

    trials_fam = await repo2.list_trial_memberships(
        referred_by_family_id="fam-004"
    )
    assert len(trials_fam) == 1

    missing_ev = await repo2.get_private_event("inexistente")
    assert missing_ev is None
    missing_tr = await repo2.update_trial_membership("inexistente", {"status": "x"})
    assert missing_tr is None


async def test_analytics_dict_after_restart() -> None:
    """get_guest_analytics: dict plano con las claves del in-memory."""
    await _reset_backend()
    repo = _repo()
    await repo.create_guest(CreateGuest(**GUEST))
    await repo.create_guest(
        CreateGuest(
            family_id="fam-001",
            host_member_id="mem-001",
            guest_name="Ana Chen",
            visit_date="2026-06-15",
            purpose="social",
        )
    )
    trial = await repo.create_trial_membership(
        CreateTrialMembership(
            guest_name="María Fernanda López",
            referred_by_family_id="fam-001",
            trial_type="month_trial",
            start_date="2026-07-01",
            end_date="2026-08-01",
        )
    )
    await repo.update_trial_membership(
        trial.id, {"status": TrialMembershipStatus.CONVERTED.value}
    )

    repo2 = _repo()  # restart runtime
    analytics = await repo2.get_guest_analytics()
    assert analytics["total_guests"] == 2
    assert analytics["active_guests"] == 2  # registered
    assert analytics["total_trial_memberships"] == 1
    assert analytics["converted_trials"] == 1
    assert analytics["top_purposes"][0] == {"purpose": "social", "count": 2}

    fam = await repo2.get_guest_analytics(family_id="fam-001")
    assert fam["total_guests"] == 2


async def test_compute_reads_tables_not_memory() -> None:
    """funnel + health + forecast: compute-on-read contra las TABLAS."""
    await _reset_backend()
    repo = _repo()
    guest = await repo.create_guest(CreateGuest(**GUEST))
    # recurrencia: visit_count > 1 → etapa REPEAT_GUEST del funnel
    await repo.update_guest(guest.id, {"visit_count": 5})
    await repo.create_trial_membership(
        CreateTrialMembership(
            guest_name="María Fernanda López",
            referred_by_family_id="fam-001",
            trial_type="month_trial",
            start_date="2026-07-01",
            end_date="2026-08-01",
        )
    )
    await _seed_snapshots(repo)

    repo2 = _repo()  # restart runtime
    funnel = await repo2.get_conversion_funnel()
    assert funnel.total_guests == 1
    assert funnel.stages[0].count == 1
    assert funnel.stages[2].count == 1  # repeat: visit_count=5 > 1
    assert funnel.stages[3].count == 1  # trial applicant
    assert funnel.stages[4].count == 0  # converted: 0

    health = await repo2.get_health_score()
    assert 0 <= health.score <= 100
    assert len(health.factors) == 5  # Guest Volume/Conversion/Repeat/Referral/Pipeline
    assert health.trend == "declining"  # snapshots: 6+10=16 < 19*0.95 — la MISMA regla del in-memory

    forecast = await repo2.get_guest_demand_forecast()
    metrics = [f.metric for f in forecast.forecasts]
    assert "guest_volume" in metrics
    assert "trial_demand" in metrics
    assert "conversion_rate" in metrics
    assert "event_pipeline" in metrics
    assert forecast.forecast_horizon_months == 3
    assert forecast.peak_months == ["Diciembre", "Marzo", "Abril", "Julio"]

    enhanced = await repo2.get_analytics_enhanced()
    assert enhanced.total_guests == 1
    assert len(enhanced.temporal_trends) == 6  # 6 meses de snapshots de TABLA
    assert enhanced.temporal_trends[0].month == "2026-01"
    assert enhanced.temporal_trends[0].new_guests == 8


async def test_proposals_compute_p1() -> None:
    """generate_engagement_proposals: P1 hot-lead con visit_count de TABLA."""
    await _reset_backend()
    repo = _repo()
    guest = await repo.create_guest(CreateGuest(**GUEST))
    await repo.update_guest(guest.id, {"visit_count": 6})  # hot lead (5+)

    repo2 = _repo()  # restart runtime
    proposals = await repo2.generate_engagement_proposals()
    assert proposals.total >= 1
    p1 = [
        p
        for p in proposals.proposals
        if p.title == f"Invitar a trial: {guest.guest_name}"
    ]
    assert len(p1) == 1
    assert p1[0].priority == "high"
    assert p1[0].cross_domain_signals[0] == "Guest recurrente: 6 visitas"
    assert p1[0].suggested_action["action"] == "send_trial_invitation"

    # sin data: contrato vacío, no excepción
    await _reset_backend()
    repo3 = _repo()
    empty = await repo3.generate_engagement_proposals()
    assert empty.total == 0
    assert empty.proposals == []
