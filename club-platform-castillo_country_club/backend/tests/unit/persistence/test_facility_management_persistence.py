"""Suite de persistencia Ola 2.1-duodécima — gate del vertical
facility_management:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation (Ola 2.1-bis/-tris/2.2/-quinqua/-sexta/
-septima/-octava/-nona/-décima/-undécima): restart REAL
(engine.dispose() + engine NUEVO + sesión nueva) · RE-RUNNABLE
(_reset_backend antes de cada test) · sqlite local / pgvector real
en CI.

Además — el gate de CONTRATO: los tests del agente
facility_management (tests/unit/agents/
test_facility_management_agent.py, 39 tests) corren contra el repo
in-memory async; este archivo verifica que el repo ORM async cumple
el mismo contrato (mismos 20 métodos · None/[] sin excepciones
custom · listas JSONB roundtrip · enums roundtrip · updates
parciales dict · filtros list_* · sort (date, start_time) ·
conflict overlap · status literals del create · analytics
compute-on-read sobre tablas).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.facility_management_repo import (
    FacilityManagementRepository as FacilityRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.facility_management import (
    CreateEventSetup,
    CreateFacility,
    CreateFacilityReservation,
    CreateInspection,
    CreateMaintenanceTask,
    FacilityStatus,
    FacilityType,
    InspectionResult,
    MaintenancePriority,
    MaintenanceStatus,
    MaintenanceType,
    ReservationStatus,
    SetupStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_facility_management.db"

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


def _repo() -> FacilityRepoORM:
    return FacilityRepoORM(make_engine(_backend_url()))


async def _restart_repo(
    repo: FacilityRepoORM,
) -> FacilityRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


# ── test 1 · facilities: JSONB amenities · filtros · update dict ──
async def test_facilities_restart() -> None:
    await _reset_backend()
    repo = _repo()

    created = await repo.create_facility(
        CreateFacility(
            name="Piscina Test",
            facility_type=FacilityType.POOL,
            location="Zona Norte",
            capacity=100,
            description="Piscina de prueba",
            amenities=["Jacuzzi", "Pool bar"],
            base_rate=5_000.0,
        )
    )
    assert created.id
    assert created.status is FacilityStatus.OPERATIONAL  # LITERAL del create
    assert created.amenities == ["Jacuzzi", "Pool bar"]

    other = await repo.create_facility(
        CreateFacility(
            name="Gimnasio Test",
            facility_type=FacilityType.GYM,
            capacity=80,
        )
    )

    # restart REAL: dispose + engine nuevo + repo nuevo
    repo = await _restart_repo(repo)

    # read tras restart: JSONB roundtrip · enums roundtrip
    got = await repo.get_facility(created.id)
    assert got is not None
    assert got.name == "Piscina Test"
    assert got.facility_type is FacilityType.POOL
    assert got.status is FacilityStatus.OPERATIONAL
    assert got.amenities == ["Jacuzzi", "Pool bar"]
    assert got.capacity == 100

    # filtros por igualdad
    pools = await repo.list_facilities(facility_type=FacilityType.POOL)
    assert [f.id for f in pools] == [created.id]
    operational = await repo.list_facilities(status=FacilityStatus.OPERATIONAL)
    assert {f.id for f in operational} == {created.id, other.id}

    # update dict parcial: record.update — sin updated_at (contrato exacto)
    updated = await repo.update_facility(
        created.id, {"capacity": 120, "location": "Zona Sur"}
    )
    assert updated is not None
    assert updated.capacity == 120
    assert updated.location == "Zona Sur"
    assert updated.name == "Piscina Test"  # no tocado

    # clave desconocida: ignorada
    ghost = await repo.update_facility(created.id, {"no_column": "x"})
    assert ghost is not None
    assert ghost.name == "Piscina Test"

    # contrato vacío: None / []
    assert await repo.get_facility("nope-404") is None
    assert await repo.list_facilities(facility_type=FacilityType.SPA) == []


# ── test 2 · maintenance + setups: enums · JSONB requirements ──
async def test_maintenance_setups_restart() -> None:
    await _reset_backend()
    repo = _repo()

    task = await repo.create_maintenance(
        CreateMaintenanceTask(
            facility_id="fac-001",
            facility_name="Piscina Principal",
            maintenance_type=MaintenanceType.CORRECTIVE,
            priority=MaintenancePriority.HIGH,
            description="Filtro de arena",
            scheduled_date="2026-12-01",
            scheduled_time="07:00",
            estimated_duration_hours=4.0,
            assigned_to="Técnico PoolsCR",
            cost=850_000.0,
        )
    )
    assert task.id
    assert task.status is MaintenanceStatus.SCHEDULED  # LITERAL del create

    setup = await repo.create_setup(
        CreateEventSetup(
            event_id="evt-001",
            event_name="Boda Jiménez",
            facility_id="fac-008",
            facility_name="Salón El Dorado",
            setup_date="2026-12-05",
            setup_time="14:00",
            event_start="2026-12-05T19:00",
            event_end="2026-12-05T23:00",
            requirements=["Sonido", "Iluminación", "Pista de baile"],
        )
    )
    assert setup.status is SetupStatus.REQUESTED  # LITERAL del create
    assert setup.requirements == ["Sonido", "Iluminación", "Pista de baile"]

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_maintenance(task.id)
    assert got is not None
    assert got.maintenance_type is MaintenanceType.CORRECTIVE
    assert got.priority is MaintenancePriority.HIGH
    assert got.cost == 850_000.0
    assert got.status is MaintenanceStatus.SCHEDULED

    got_setup = await repo.get_setup(setup.id)
    assert got_setup is not None
    assert got_setup.requirements == ["Sonido", "Iluminación", "Pista de baile"]
    assert got_setup.event_start == "2026-12-05T19:00"

    # filtros list_*
    by_facility = await repo.list_maintenance(facility_id="fac-001")
    assert [m.id for m in by_facility] == [task.id]
    by_status = await repo.list_setups(status=SetupStatus.REQUESTED)
    assert [s.id for s in by_status] == [setup.id]

    # update dict con enum (record.update del in-memory pasaba enums al dict)
    upd = await repo.update_maintenance(
        task.id, {"status": MaintenanceStatus.IN_PROGRESS}
    )
    assert upd is not None
    assert upd.status is MaintenanceStatus.IN_PROGRESS

    upd_setup = await repo.update_setup(setup.id, {"status": SetupStatus.PLANNED})
    assert upd_setup is not None
    assert upd_setup.status is SetupStatus.PLANNED


# ── test 3 · inspections + reservations: JSONB · sort · conflict ──
async def test_inspections_reservations_restart() -> None:
    await _reset_backend()
    repo = _repo()

    insp = await repo.create_inspection(
        CreateInspection(
            facility_id="fac-001",
            facility_name="Piscina Principal",
            result=InspectionResult.MINOR_ISSUES,
            inspector_member_id="insp-01",
            inspection_date="2026-11-15",
            findings="pH levemente alto",
            corrective_actions=["Ajustar cloro", "Revisar filtro"],
            next_inspection_date="2026-12-15",
        )
    )
    assert insp.result is InspectionResult.MINOR_ISSUES
    assert insp.corrective_actions == ["Ajustar cloro", "Revisar filtro"]

    res = await repo.create_reservation(
        CreateFacilityReservation(
            facility_id="fac-001",
            facility_name="Piscina Principal",
            family_id="fam-001",
            family_name="Familia Rodríguez",
            date="2026-12-10",
            start_time="10:00",
            end_time="14:00",
            guest_count=8,
            purpose="Fiesta de cumpleaños",
        )
    )
    assert res.status is ReservationStatus.CONFIRMED  # LITERAL del create
    assert res.created_at is not None  # now ISO del create

    res_early = await repo.create_reservation(
        CreateFacilityReservation(
            facility_id="fac-001",
            facility_name="Piscina Principal",
            family_id="fam-002",
            family_name="Familia Mora",
            date="2026-12-10",
            start_time="08:00",
            end_time="09:30",
            guest_count=4,
            purpose="Clase matinal",
        )
    )

    # restart REAL
    repo = await _restart_repo(repo)

    got_insp = await repo.get_inspection(insp.id)
    assert got_insp is not None
    assert got_insp.corrective_actions == ["Ajustar cloro", "Revisar filtro"]
    assert got_insp.next_inspection_date == "2026-12-15"

    by_facility = await repo.list_inspections(facility_id="fac-001")
    assert [i.id for i in by_facility] == [insp.id]

    # sort (date, start_time) tras filtros — semántica literal
    listed = await repo.list_reservations(facility_id="fac-001")
    assert [r.id for r in listed] == [res_early.id, res.id]

    # filtros de rango de fecha + status
    dec_only = await repo.list_reservations(date_from="2026-12-01", date_to="2026-12-31")
    assert {r.id for r in dec_only} == {res.id, res_early.id}
    confirmed = await repo.list_reservations(status=ReservationStatus.CONFIRMED)
    assert {r.id for r in confirmed} == {res.id, res_early.id}

    # conflict overlap: MISMA facility+date, solapa 09:00-13:00
    conflicts = await repo.check_reservation_conflict(
        "fac-001", "2026-12-10", "09:00", "13:00"
    )
    assert {c.id for c in conflicts} == {res_early.id, res.id}

    # sin solape: fuera de horario
    no_conflict = await repo.check_reservation_conflict(
        "fac-001", "2026-12-10", "15:00", "17:00"
    )
    assert no_conflict == []

    # exclude_id excluye la propia reserva
    only_res = await repo.check_reservation_conflict(
        "fac-001", "2026-12-10", "09:00", "13:00", exclude_id=res.id
    )
    assert [c.id for c in only_res] == [res_early.id]

    # contrato vacío
    assert await repo.get_inspection("nope-404") is None
    assert await repo.list_reservations(facility_id="fac-999") == []


# ── test 4 · analytics compute-on-read sobre tablas ──
async def test_analytics_compute_on_read() -> None:
    await _reset_backend()
    repo = _repo()

    # sin datos: analytics válidos (contrato vacío, no excepciones)
    health = await repo.get_facility_health()
    assert 0 <= health.score <= 100
    assert len(health.factors) == 5
    assert health.generated_at

    utilization = await repo.get_amenity_utilization()
    assert utilization.overall_utilization_pct == 0.0
    assert utilization.facilities == []

    optimization = await repo.get_space_optimization()
    assert optimization.suggestions == []

    analytics = await repo.get_facility_analytics()
    assert len(analytics.dimensions) == 9  # D1..D9
    assert len(analytics.cross_domain_signals) == 4

    # con datos: health reacciona a las TABLAS
    await repo.create_facility(
        CreateFacility(
            name="Piscina Analytics",
            facility_type=FacilityType.POOL,
            capacity=100,
            amenities=["Pool bar"],
        )
    )
    await repo.create_maintenance(
        CreateMaintenanceTask(
            facility_id="fac-001",
            facility_name="Piscina Analytics",
            maintenance_type=MaintenanceType.PREVENTIVE,
            description="Servicio preventivo",
            scheduled_date="2020-01-01",  # ATRASADO respecto de hoy
            cost=100_000.0,
        )
    )
    await repo.create_inspection(
        CreateInspection(
            facility_id="fac-001",
            facility_name="Piscina Analytics",
            result=InspectionResult.FAIL,
            inspector_member_id="insp-01",
            inspection_date="2026-11-19",  # reciente (≤30 días)
            findings="Fallo crítico",
        )
    )

    health2 = await repo.get_facility_health()
    # 1 mantenimiento atrasado -> -15 · 1 FAIL reciente -> alerta
    assert any("atrasada" in a for a in health2.alerts)
    assert any("FAIL" in a or "fail" in a for a in health2.alerts)

    utilization2 = await repo.get_amenity_utilization(facility_type=FacilityType.POOL)
    assert len(utilization2.facilities) == 1
    fac_item = utilization2.facilities[0]
    assert fac_item.estimated_monthly_revenue > 0  # _REVENUE_RATES del dominio
    assert len(fac_item.time_series) == 7  # serie determinista de 7 días

    # restart REAL: analytics siguen funcionando (leyen tablas)
    repo = await _restart_repo(repo)
    health3 = await repo.get_facility_health()
    assert any("atrasada" in a for a in health3.alerts)
