"""Suite de persistencia Ola 2.1-decimotercima — gate del vertical
age_group:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation/facility_management (Ola 2.1-bis/-tris/2.2/
-quinqua/-sexta/-septima/-octava/-nona/-décima/-undécima/-duodécima):
restart REAL (engine.dispose() + engine NUEVO + sesión nueva) ·
RE-RUNNABLE (_reset_backend antes de cada test) · sqlite local /
pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente age_group
(tests/unit/agents/test_age_group.py, 26 tests) corren contra el repo
in-memory async; este archivo verifica que el repo ORM async cumple
el mismo contrato (mismos 18 métodos · None/[] sin excepciones
custom · listas JSONB roundtrip · enums roundtrip · update dict con
None ignora + enum .value + updated_at SIEMPRE · delete cascada de
enrollments · filtros list_* · sort por confidence DESC · snapshots
month→{ag: metrics} · counts dato de primera clase via siembra del
contrato interno de deploy).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.age_group_orm import AgeGroupEnrollmentORM
from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.age_group_repo import (
    AgeGroupRepository as AgeGroupRepoORM,
)
from club_mcp.db.orm.session import make_engine, session_scope
from club_mcp.models.age_group_activity import (
    ActivityDifficulty,
    AgeGroupActivityCreate,
    AgeGroupActivityStatus,
    AgeGroupCategory,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_age_group.db"

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


def _repo() -> AgeGroupRepoORM:
    return AgeGroupRepoORM(make_engine(_backend_url()))


async def _restart_repo(
    repo: AgeGroupRepoORM,
) -> AgeGroupRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


def _create_data(
    name: str, group: str = "kids", max_pax: int = 15
) -> AgeGroupActivityCreate:
    return AgeGroupActivityCreate(
        name=name,
        description="Actividad de persistencia",
        age_group=AgeGroupCategory(group),
        difficulty=ActivityDifficulty.EASY,
        location="Cancha Test",
        max_participants=max_pax,
        duration_minutes=60,
        requires_instructor=True,
        instructor_name="Coach Test",
        equipment_needed=["balones", "conos"],
        tags=["deporte", "kids"],
        schedule_days=["monday", "friday"],
        schedule_time="15:00",
    )


# ── test 1 · activities: JSONB lists · enums · filtros · CRUD ──
async def test_activities_restart() -> None:
    await _reset_backend()
    repo = _repo()

    created = await repo.create_activity(_create_data("Tenis Kids"))
    assert created.id.startswith("act_"), "ids act_{hex8} del in-memory"
    assert created.status == AgeGroupActivityStatus.ACTIVE, (
        "status ACTIVE literal del create"
    )
    assert created.equipment_needed == ["balones", "conos"]
    assert created.tags == ["deporte", "kids"]
    assert created.schedule_days == ["monday", "friday"]
    assert created.age_group == AgeGroupCategory.KIDS
    assert created.difficulty == ActivityDifficulty.EASY
    assert created.created_at is not None
    assert created.updated_at is not None

    other = await repo.create_activity(
        _create_data("Yoga Adults", group="adults")
    )

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    got = await repo.get_activity(created.id)
    assert got is not None
    assert got.name == "Tenis Kids"
    assert got.equipment_needed == ["balones", "conos"], "JSONB roundtrip"
    assert got.tags == ["deporte", "kids"], "JSONB roundtrip"
    assert got.schedule_days == ["monday", "friday"], "JSONB roundtrip"
    assert got.age_group == AgeGroupCategory.KIDS, "enum roundtrip"
    assert got.difficulty == ActivityDifficulty.EASY, "enum roundtrip"
    assert got.status == AgeGroupActivityStatus.ACTIVE, "enum roundtrip"

    # filtros list_*
    kids_acts = await repo.list_activities(age_group="kids")
    assert len(kids_acts) == 1
    all_acts = await repo.list_activities()
    assert len(all_acts) == 2
    active_acts = await repo.list_activities(status="active")
    assert len(active_acts) == 2

    # update dict: None ignora + enum .value + updated_at refresca
    updated = await repo.update_activity(
        created.id,
        {
            "name": "Tenis Kids Plus",
            "max_participants": 20,
            "description": None,  # None se IGNORA
            "status": AgeGroupActivityStatus.SEASONAL,
            "clave_desconocida": "ignorada",
        },
    )
    assert updated is not None
    assert updated.name == "Tenis Kids Plus"
    assert updated.max_participants == 20
    assert updated.description == "Actividad de persistencia", (
        "None NO borra (semántica literal del in-memory)"
    )
    assert updated.status == AgeGroupActivityStatus.SEASONAL

    # inexistente → None sin excepción
    assert await repo.get_activity("nope") is None
    assert await repo.update_activity("nope", {"name": "x"}) is None

    # delete → True · y de las 2 queda 1
    assert await repo.delete_activity(other.id) is True
    assert await repo.get_activity(other.id) is None
    assert await repo.delete_activity(other.id) is False

    # summaries tras restart: la categoría existe aunque sin filas
    summary = await repo.get_age_group_summary("kids")
    assert summary is not None
    assert summary.description.startswith("Niños")
    assert summary.member_count == 0, "sin censo → 0 (contrato vacío)"
    assert await repo.get_age_group_summary("grupo_inventado") is None
    summaries = await repo.list_age_groups()
    assert len(summaries) == 6, "6 categorías siempre"


# ── test 2 · contract surface: distribution/enrollment/snapshots ──
async def test_contract_surface_restart() -> None:
    await _reset_backend()
    repo = _repo()

    act = await repo.create_activity(_create_data("Natación Kids"))

    # censo (siembra del contrato interno de deploy — dato de primera clase)
    await repo.set_member_count("kids", 120)
    await repo.set_family_count("kids", 80)
    await repo.set_member_count("adults", 200)
    await repo.set_family_count("adults", 150)

    # snapshots (siembra del contrato interno de deploy — H-3)
    await repo.upsert_monthly_snapshot("2026-01", "kids", 45, 4.1, 45, 92.5)
    await repo.upsert_monthly_snapshot("2026-02", "kids", 48, 4.0, 3, 94.0)
    await repo.upsert_monthly_snapshot("2026-03", "kids", 50, 4.1, 2, 95.0)
    await repo.upsert_monthly_snapshot("2026-03", "teens", 14, 3.3, 2, 77.0)

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # get_distribution: percentage sobre el total del censo
    distribution = await repo.get_distribution()
    assert len(distribution) == 6
    kids_d = next(d for d in distribution if d.age_group == "kids")
    assert kids_d.member_count == 120, "censo persiste tras restart"
    assert kids_d.family_count == 80
    total = 120 + 200
    assert kids_d.percentage == round(120 / total * 100, 1)
    assert kids_d.activity_count == 1
    assert kids_d.active_activity_count == 1
    assert kids_d.coverage_adequate is False, "1 activa < 2"

    # get_monthly_snapshots: month → {ag: metrics}
    snaps = await repo.get_monthly_snapshots()
    assert set(snaps.keys()) == {"2026-01", "2026-02", "2026-03"}
    assert snaps["2026-03"]["kids"]["enrolled"] == 50
    assert snaps["2026-03"]["kids"]["satisfaction"] == 4.1
    assert snaps["2026-03"]["teens"]["enrolled"] == 14

    # get_activity_enrollment de una actividad sin inscripciones → []
    assert await repo.get_activity_enrollment(act.id) == []
    assert await repo.get_activity_enrollment("nope") == []

    # demographics con censo
    demographics = await repo.get_demographics()
    kids_g = next(d for d in demographics if d.age_group == "kids")
    assert kids_g.total_members == 120
    assert kids_g.activity_count == 1
    assert kids_g.active_participants == 1


# ── test 3 · enrollment map → participation/recommendations/trends ──
async def test_participation_recommendations_trends() -> None:
    await _reset_backend()
    repo = _repo()

    act1 = await repo.create_activity(_create_data("Tenis Kids"))
    act2 = await repo.create_activity(
        _create_data("Pintura Teens", group="teens")
    )

    # siembra directa de enrollments vía siembra de deploy:
    # el in-memory solo los generaba del seed demo; para el gate
    # escribimos filas con el mismo contrato de columnas planas.
    async with session_scope(repo._engine) as s:
        s.add(
            AgeGroupEnrollmentORM(
                activity_id=act1.id,
                family_id="fam-001",
                enrolled_at="2026-03-10",
                status="active",
                satisfaction=4.5,
            )
        )
        s.add(
            AgeGroupEnrollmentORM(
                activity_id=act1.id,
                family_id="fam-002",
                enrolled_at="2026-03-11",
                status="active",
                satisfaction=4.0,
            )
        )
        s.add(
            AgeGroupEnrollmentORM(
                activity_id=act1.id,
                family_id="fam-003",
                enrolled_at="2026-03-12",
                status="completed",
                satisfaction=4.2,
            )
        )
        s.add(
            AgeGroupEnrollmentORM(
                activity_id=act2.id,
                family_id="fam-001",
                enrolled_at="2026-03-15",
                status="active",
                satisfaction=3.0,
            )
        )

    await repo.set_member_count("kids", 120)
    await repo.upsert_monthly_snapshot("2026-01", "kids", 40, 4.0, 40, 90.0)
    await repo.upsert_monthly_snapshot("2026-02", "kids", 44, 4.1, 4, 92.0)
    await repo.upsert_monthly_snapshot("2026-03", "kids", 48, 4.1, 4, 94.0)
    await repo.upsert_monthly_snapshot("2026-01", "teens", 20, 3.4, 20, 80.0)
    await repo.upsert_monthly_snapshot("2026-02", "teens", 18, 3.3, -2, 79.0)
    await repo.upsert_monthly_snapshot("2026-03", "teens", 16, 3.2, -2, 78.0)

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # get_activity_enrollment: dicts planos en orden de inserción
    enr = await repo.get_activity_enrollment(act1.id)
    assert len(enr) == 3
    assert enr[0]["family_id"] == "fam-001"
    assert enr[0]["status"] == "active"
    assert enr[0]["satisfaction"] == 4.5
    assert enr[2]["status"] == "completed"

    # get_participation: solo active · avg_sat de actives · retention
    participation = await repo.get_participation(age_group="kids")
    assert len(participation) == 1
    p = participation[0]
    assert p.activity_id == act1.id
    assert p.total_enrolled == 2, "solo active (completed no cuenta)"
    assert p.satisfaction_score == round((4.5 + 4.0) / 2, 1)
    assert p.sessions_held == 8

    # get_recommendations: sort por confidence DESC · top 10
    recs = await repo.get_recommendations(["kids", "teens"])
    assert 1 <= len(recs) <= 10
    if len(recs) > 1:
        confs = [r.confidence for r in recs]
        assert confs == sorted(confs, reverse=True), "sort DESC"
    kids_rec = next(
        (r for r in recs if r.age_group == "kids"), None
    )
    assert kids_rec is not None
    assert kids_rec.activity_name == "Tenis Kids"
    assert "alta satisfacción" in kids_rec.match_reason or (
        "disponibilidad" in kids_rec.match_reason
    )

    # get_participation_trends: sorted months · 0.85 factor · retention
    trends = await repo.get_participation_trends()
    assert len(trends) == 6, "3 meses x 2 grupos"
    by_period = {}
    for t in trends:
        by_period.setdefault(t.period, []).append(t)
    assert set(by_period.keys()) == {
        "2026-01", "2026-02", "2026-03"
    }
    t_kids_m3 = next(
        t
        for t in by_period["2026-03"]
        if t.age_group == "kids"
    )
    assert t_kids_m3.total_enrolled == 48
    assert t_kids_m3.unique_participants == int(48 * 0.85)
    assert t_kids_m3.new_enrollments == 4
    assert t_kids_m3.retention_rate == 94.0

    # delete cascade: borrar act1 borra SUS enrollments
    assert await repo.delete_activity(act1.id) is True
    assert await repo.get_activity_enrollment(act1.id) == [], (
        "delete cascada enrollments (como el _enrollment.pop)"
    )
    assert await repo.get_activity_enrollment(act2.id) != []


# ── test 4 · intelligence compute-on-read sobre tablas ──
async def test_intelligence_compute_on_read() -> None:
    await _reset_backend()
    repo = _repo()

    for i in range(3):
        await repo.create_activity(
            _create_data(f"Actividad Kids {i}", group="kids", max_pax=30)
        )
    await repo.create_activity(
        _create_data("Yoga Adults", group="adults", max_pax=60)
    )

    await repo.set_member_count("kids", 120)
    await repo.set_family_count("kids", 80)
    await repo.set_member_count("adults", 200)
    await repo.set_family_count("adults", 150)

    for m, kids_e, teens_e in (
        ("2026-01", 40, 20),
        ("2026-02", 44, 18),
        ("2026-03", 48, 16),
    ):
        await repo.upsert_monthly_snapshot(m, "kids", kids_e, 4.1, 4, 92.0)
        await repo.upsert_monthly_snapshot(m, "teens", teens_e, 3.3, -2, 79.0)

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # health score: 5 factores · trend improving (kids 40→48)
    health = await repo.get_health_score()
    names = [f.name for f in health.factors]
    assert names == [
        "Participation Rate",
        "Activity Coverage",
        "Demographic Balance",
        "Satisfaction Average",
        "Family Engagement",
    ]
    assert health.trend == "improving"
    assert 0 <= health.score <= 100

    # generational analytics: distribution + counts + coverage
    analytics = await repo.get_generational_analytics()
    assert analytics.total_members == 320
    assert analytics.total_families == 230
    assert analytics.total_activities == 4
    assert analytics.active_activities == 4
    assert len(analytics.distribution) == 6
    assert len(analytics.participation_trends) == 6

    # forecast: ≥3 meses → 2 ForecastItem por grupo + demand + seasonal
    forecast = await repo.get_age_group_forecast()
    assert len(forecast.forecasts) == 12, "2 items x 6 grupos"
    assert len(forecast.demand_projections) == 6
    assert len(forecast.seasonal_patterns) == 36, "Jul-Dic (6 meses x 6 grupos)"
    assert forecast.forecast_horizon_months == 3
    kids_part = next(
        f
        for f in forecast.forecasts
        if f.age_group == "kids" and f.metric == "participation"
    )
    assert kids_part.current_value == 48, "último mes del snapshot"
    assert kids_part.period == "Q3 2026", "period literal"
    kids_demand = next(
        d
        for d in forecast.demand_projections
        if d.age_group == "kids"
    )
    assert kids_demand.current_capacity == 90, "3 actividades x 30"

    # engagement proposals: R5 seasonal SIEMPRE · R2 coverage kids NO
    proposals = await repo.generate_engagement_proposals()
    assert proposals.total == len(proposals.proposals)
    assert proposals.total >= 1, "R5 seasonal siempre presente"
    seasonal = next(
        p
        for p in proposals.proposals
        if p.title.startswith("Preparar programas")
    )
    assert seasonal.target_age_group == "kids"
    r_titles = [p.title for p in proposals.proposals]
    assert not any(
        t.startswith("Expandir cobertura para kids")
        for t in r_titles
    ), "kids tiene 3 activas → R2 NO dispara"
    assert any(
        (
            t.startswith("Expandir cobertura para") and "teens" in t
        )
        or t.startswith("Expandir cobertura para toddlers")
        for t in r_titles
    ), "grupos sin actividades → R2 dispara"
