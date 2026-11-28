"""Suite de persistencia Ola 2.1-decimocuarta — gate del vertical
sports_recreation:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/
guest/satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation/facility_management/age_group (Ola 2.1-bis
…-decimatercera): restart REAL (engine.dispose() + engine NUEVO +
sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente sports (61 tests)
corren contra el repo in-memory async; este archivo verifica que el
repo ORM async cumple el mismo contrato (mismos 40 métodos · None/[]
sin excepciones custom · JSONB lists roundtrip · enums roundtrip ·
status/is_active literales del create · update dict parcial + clave
desconocida ignorada · filtros list_* · analytics F32 compute-on-read
con la misma aritmética · contrato vacío None/[]).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.sports_recreation_repo import (
    SportsRecreationRepository as SportsRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.sports_recreation import (
    ClassType,
    CreateCoachingSession,
    CreateEquipment,
    CreateFitnessClass,
    CreateReservation,
    CreateSportLeague,
    CreateSportsRecommendation,
    CreateTournament,
    EquipmentCondition,
    LeagueFormat,
    LeagueStatus,
    ReservationStatus,
    SkillLevel,
    TournamentFormat,
    TournamentStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_sports.db"

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


def _repo() -> SportsRepoORM:
    return SportsRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: SportsRepoORM) -> SportsRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


def _create_reservation(
    court: str = "Cancha Central", sport: str = "tennis"
) -> CreateReservation:
    return CreateReservation(
        member_id="M001",
        member_name="Socio Uno",
        sport=sport,
        court_name=court,
        date="2026-11-10",
        start_time="09:00",
        end_time="10:30",
    )


def _create_tournament(name: str = "Copa Castillo") -> CreateTournament:
    return CreateTournament(
        name=name,
        sport="tennis",
        format=TournamentFormat.SINGLE_ELIMINATION,
        start_date="2026-12-01",
        end_date="2026-12-05",
        registration_deadline="2026-11-25",
        max_participants=32,
        venue="Club Main Field",
        organizer_member_id="M001",
        entry_fee=25000.0,
        prizes=["Trofeo", "Medalla"],
        rules="Reglas del torneo",
    )


def _create_class(name: str = "Yoga Matutino") -> CreateFitnessClass:
    return CreateFitnessClass(
        name=name,
        sport="yoga",
        class_type=ClassType.GROUP,
        instructor="Coach Ana",
        schedule_day="lunes",
        schedule_time="07:00",
        duration_minutes=60,
        max_capacity=20,
        location="Salón A",
        skill_level=SkillLevel.ALL_LEVELS,
        equipment_needed=["mat", "blocks"],
    )


def _create_coaching() -> CreateCoachingSession:
    return CreateCoachingSession(
        sport="tennis",
        coach_name="Coach Ana",
        member_id="M001",
        member_name="Socio Uno",
        date="2026-11-13",
        start_time="08:00",
        end_time="09:00",
        location="Cancha Central",
        skill_level=SkillLevel.INTERMEDIATE,
        focus_areas=["saque", "revés"],
    )


def _create_equipment(name: str = "Red de tennis") -> CreateEquipment:
    return CreateEquipment(
        name=name,
        sport="tennis",
        location="Bodega 1",
        total_quantity=5,
        available_quantity=5,
        condition=EquipmentCondition.GOOD,
        brand="Wilson",
    )


def _create_league(name: str = "Liga Verano") -> CreateSportLeague:
    return CreateSportLeague(
        name=name,
        sport="football",
        season="2026",
        start_date="2026-11-20",
        end_date="2026-12-20",
        coordinator_member_id="M001",
        max_teams=10,
        format=LeagueFormat.ROUND_ROBIN,
        teams=["A", "B", "C", "D"],
    )


# ── test 1 · CRUD 7 entidades: JSONB · enums · literales del create ──
async def test_entities_restart() -> None:
    await _reset_backend()
    repo = _repo()

    res = await repo.create_reservation(_create_reservation())
    assert res.id.startswith("res_"), "ids res_{hex8} del in-memory"
    assert res.status == ReservationStatus.CONFIRMED, (
        "status CONFIRMED literal del create"
    )
    assert res.sport == "tennis"

    tour = await repo.create_tournament(_create_tournament())
    assert tour.id.startswith("trn_")
    assert tour.status == TournamentStatus.DRAFT, "DRAFT literal del create"
    assert tour.current_participants == 0, "0 literal del create"
    assert tour.prizes == ["Trofeo", "Medalla"], "JSONB roundtrip"

    cls = await repo.create_fitness_class(_create_class())
    assert cls.id.startswith("cls_")
    assert cls.current_enrolled == 0, "0 literal del create"
    assert cls.is_active is True, "True literal del create"
    assert cls.equipment_needed == ["mat", "blocks"], "JSONB roundtrip"

    coa = await repo.create_coaching_session(_create_coaching())
    assert coa.id.startswith("coach_")
    assert coa.status == "scheduled", "status string literal del create"
    assert coa.focus_areas == ["saque", "revés"], "JSONB roundtrip"

    eq = await repo.create_equipment(_create_equipment())
    assert eq.id.startswith("eq_")
    assert eq.notes is None and eq.last_maintenance is None, "None literales"
    assert eq.condition == EquipmentCondition.GOOD, "enum roundtrip"

    lg = await repo.create_league(_create_league())
    assert lg.id.startswith("lg_")
    assert lg.status == LeagueStatus.PROPOSED, "PROPOSED literal del create"
    assert lg.current_round == 0 and lg.standings == {}, "literales del create"
    assert lg.teams == ["A", "B", "C", "D"], "JSONB roundtrip"
    assert lg.format == LeagueFormat.ROUND_ROBIN, "enum roundtrip"

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    got = await repo.get_reservation(res.id)
    assert got is not None
    assert got.status == ReservationStatus.CONFIRMED, "enum roundtrip"
    assert got.court_name == "Cancha Central"

    got_t = await repo.get_tournament(tour.id)
    assert got_t is not None
    assert got_t.prizes == ["Trofeo", "Medalla"], "JSONB roundtrip tras restart"
    assert got_t.format == TournamentFormat.SINGLE_ELIMINATION

    got_c = await repo.get_fitness_class(cls.id)
    assert got_c is not None
    assert got_c.equipment_needed == ["mat", "blocks"]
    assert got_c.is_active is True

    got_s = await repo.get_coaching_session(coa.id)
    assert got_s is not None
    assert got_s.focus_areas == ["saque", "revés"]
    assert got_s.status == "scheduled"

    got_e = await repo.get_equipment(eq.id)
    assert got_e is not None
    assert got_e.condition == EquipmentCondition.GOOD

    got_l = await repo.get_league(lg.id)
    assert got_l is not None
    assert got_l.teams == ["A", "B", "C", "D"]
    assert got_l.standings == {}

    # update dict parcial + clave desconocida ignorada
    upd = await repo.update_reservation(
        res.id,
        {"court_name": "Cancha Norte", "status": ReservationStatus.CANCELLED,
         "clave_desconocida": "ignorada", "notes": None},
    )
    assert upd is not None
    assert upd.court_name == "Cancha Norte"
    assert upd.status == ReservationStatus.CANCELLED, "enum .value al persistir"

    upd_t = await repo.update_tournament(
        tour.id,
        {"current_participants": 18, "status": TournamentStatus.REGISTRATION_OPEN},
    )
    assert upd_t is not None
    assert upd_t.current_participants == 18
    assert upd_t.status == TournamentStatus.REGISTRATION_OPEN

    # inexistente → None sin excepción
    assert await repo.get_reservation("nope") is None
    assert await repo.update_reservation("nope", {"court_name": "x"}) is None
    assert await repo.get_tournament("nope") is None

    # filtros list_*
    await repo.create_reservation(
        _create_reservation(court="Cancha Norte", sport="football")
    )
    all_res = await repo.list_reservations()
    assert len(all_res) == 2
    tennis_res = await repo.list_reservations(sport="tennis")
    assert len(tennis_res) == 1
    nov_res = await repo.list_reservations(date="2026-11-10")
    assert len(nov_res) == 2
    cancelled = await repo.list_reservations(status=ReservationStatus.CANCELLED)
    assert len(cancelled) == 1

    # vistas del contrato (refactor 0042 · async por el vertical)
    view = await repo.get_reservations_view()
    assert len(view) == 2
    assert view[res.id]["court_name"] == "Cancha Norte"
    assert repo.status_value(ReservationStatus.CANCELLED) == "cancelled"
    assert repo.parse_date("2026-11-10") is not None
    assert repo.parse_date("basura") is None


# ── test 2 · coaching/leagues/equipment/recommendations CRUD+filtros ──
async def test_coaching_equipment_leagues_restart() -> None:
    await _reset_backend()
    repo = _repo()

    c1 = await repo.create_coaching_session(_create_coaching())
    c2 = await repo.create_coaching_session(
        CreateCoachingSession(
            sport="football",
            coach_name="Coach Beto",
            member_id="M002",
            member_name="Socio Dos",
            date="2026-11-15",
            start_time="17:00",
            end_time="18:00",
            location="Cancha Norte",
            skill_level=SkillLevel.BEGINNER,
            focus_areas=["pase"],
        )
    )

    e1 = await repo.create_equipment(_create_equipment("Red de tennis"))
    e2 = await repo.create_equipment(
        CreateEquipment(
            name="Balones",
            sport="football",
            location="Bodega 2",
            total_quantity=5,
            available_quantity=0,
            condition=EquipmentCondition.NEEDS_REPAIR,
        )
    )

    l1 = await repo.create_league(_create_league())

    rec1 = await repo.create_recommendation(
        CreateSportsRecommendation(
            member_id="M001",
            sport="tennis",
            reason="Alta asistencia",
            confidence_score=0.9,
            suggested_class="Yoga Matutino",
            suggested_coach="Coach Ana",
        )
    )

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # filtros coaching
    by_member = await repo.list_coaching_sessions(member_id="M001")
    assert len(by_member) == 1
    by_coach = await repo.list_coaching_sessions(coach_name="Coach Beto")
    assert len(by_coach) == 1
    by_sport = await repo.list_coaching_sessions(sport="football")
    assert len(by_sport) == 1

    # filtros equipment
    equip_football = await repo.list_equipment(sport="football")
    assert len(equip_football) == 1
    equip_bodega1 = await repo.list_equipment(location="Bodega 1")
    assert len(equip_bodega1) == 1
    # update equipment: maintenance y notes
    upd_e = await repo.update_equipment(
        e2.id,
        {"condition": EquipmentCondition.FAIR, "last_maintenance": "2026-06-01",
         "notes": "Revisar pronto"},
    )
    assert upd_e is not None
    assert upd_e.condition == EquipmentCondition.FAIR
    assert upd_e.last_maintenance == "2026-06-01"

    # filtros leagues
    leagues_proposed = await repo.list_leagues(status=LeagueStatus.PROPOSED)
    assert len(leagues_proposed) == 1
    leagues_football = await repo.list_leagues(sport="football")
    assert len(leagues_football) == 1

    # update league: standings dict JSONB roundtrip + teams
    upd_l = await repo.update_league(
        l1.id,
        {"current_round": 2, "standings": {"A": 1, "B": 2},
         "teams": ["A", "B", "C", "D", "E"]},
    )
    assert upd_l is not None
    assert upd_l.current_round == 2
    assert upd_l.standings == {"A": 1, "B": 2}, "JSONB dict roundtrip"
    assert upd_l.teams == ["A", "B", "C", "D", "E"]

    # recommendations
    recs = await repo.list_recommendations(member_id="M001")
    assert len(recs) == 1
    assert recs[0].confidence_score == 0.9
    assert recs[0].suggested_class == "Yoga Matutino"
    tennis_recs = await repo.list_recommendations(sport="tennis")
    assert len(tennis_recs) == 1

    # delete no existe en el contrato — confirmamos el set final
    all_coaching = await repo.list_coaching_sessions()
    assert len(all_coaching) == 2


# ── test 3 · analytics F32 compute-on-read (parte 1) ──
async def test_analytics_popularity_utilization_enrollment() -> None:
    await _reset_backend()
    repo = _repo()

    # dataset: 2 reservas tennis activas + 1 cancelled + 1 football ·
    # 1 clase yoga activa + 1 inactive · 1 torneo tennis
    await repo.create_reservation(_create_reservation())
    await repo.create_reservation(
        CreateReservation(
            member_id="M002",
            member_name="Socio Dos",
            sport="tennis",
            court_name="Cancha Central",
            date="2026-11-12",
            start_time="10:00",
            end_time="11:00",
        )
    )
    # la cancelada via update (el create SIEMPRE CONFIRMED — literal)
    r3c = await repo.create_reservation(
        CreateReservation(
            member_id="M003",
            member_name="Socio Tres",
            sport="football",
            court_name="Cancha Norte",
            date="2026-11-14",
            start_time="16:00",
            end_time="18:00",
        )
    )
    await repo.update_reservation(r3c.id, {"status": "cancelled"})

    c1 = await repo.create_fitness_class(_create_class())
    c2 = await repo.create_fitness_class(
        CreateFitnessClass(
            name="Spinning Nocturno",
            sport="fitness",
            class_type=ClassType.GROUP,
            instructor="Coach Beto",
            schedule_day="miércoles",
            schedule_time="18:30",
            duration_minutes=45,
            max_capacity=15,
            location="Sala Bike",
        )
    )
    await repo.update_fitness_class(c2.id, {"current_enrolled": 14})
    # una clase inactiva
    c3 = await repo.create_fitness_class(_create_class("Yoga Inactivo"))
    await repo.update_fitness_class(c3.id, {"is_active": False})

    t1 = await repo.create_tournament(_create_tournament())

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # popularity: tennis 2 res + 1 torneo = 3 · yoga 1 · fitness 1 —
    # football NO aparece: su única reserva está CANCELLED y el conteo
    # la excluye (contrato F32 verificado contra el in-memory)
    pop = await repo.get_sport_popularity()
    assert len(pop) == 3, "cancelled NO crea fila de popularity"
    assert [p.sport for p in pop] == ["tennis", "yoga", "fitness"]
    tennis = pop[0]
    assert tennis.reservation_count == 2, "cancelled NO cuenta"
    assert tennis.tournament_count == 1
    assert tennis.total_activity == 3
    assert tennis.popularity_rank == 1, "sort DESC + rank"
    yoga = pop[1]
    assert yoga.class_count == 1, "la clase inactive NO cuenta (1 activa)"
    assert yoga.popularity_rank == 2
    total = 3 + 1 + 1
    assert tennis.activity_share_pct == round(3 / total * 100, 1)

    # court utilization: cutoff de 90 días toma las de nov (lookback 90)
    util = await repo.get_court_utilization(90)
    assert len(util) == 1, "solo Cancha Central (la cancelled excluida)"
    cu = util[0]
    assert cu.court_name == "Cancha Central"
    assert cu.total_slots == 14 * 90, "14h/día literal F32"
    assert cu.booked_slots == 2, "int(booked 2.5h) truncates — F32 literal"

    # enrollment stats: solo activas · fill ASC
    enr = await repo.get_class_enrollment_stats()
    assert len(enr) == 2, "la inactiva NO cuenta"
    enr_by_fill = sorted(enr, key=lambda x: x.fill_rate_pct)
    spins = next(e for e in enr if e.name == "Spinning Nocturno")
    assert spins.enrolled == 14
    assert spins.capacity == 15, "max_capacity del constructor (15)"
    assert spins.fill_rate_pct == round(14 / 15 * 100, 1)
    yoga_e = next(e for e in enr if e.name == "Yoga Matutino")
    assert yoga_e.fill_rate_pct == 0.0
    assert [e.fill_rate_pct for e in enr] == [
        e.fill_rate_pct for e in enr_by_fill
    ], "sort fill ASC"
    assert yoga_e.is_underperforming is True, "< 40"


# ── test 4 · analytics F32 compute-on-read (parte 2) + perfil ──
async def test_analytics_metrics_lifecycle_seasonal_profile() -> None:
    await _reset_backend()
    repo = _repo()

    t1 = await repo.create_tournament(_create_tournament())
    await repo.update_tournament(t1.id, {"current_participants": 18})
    t2 = await repo.create_tournament(
        CreateTournament(
            name="Liga Interna",
            sport="football",
            format=TournamentFormat.SINGLE_ELIMINATION,
            start_date="2026-12-10",
            end_date="2026-12-15",
            registration_deadline="2026-12-01",
            max_participants=8,
            venue="Cancha Norte",
            organizer_member_id="M002",
        )
    )
    await repo.update_tournament(
        t2.id, {"current_participants": 6, "status": "in_progress"}
    )

    e1 = await repo.create_equipment(_create_equipment())
    e_old = await repo.create_equipment(
        CreateEquipment(
            name="Balones Usados",
            sport="football",
            location="Bodega 1",
            total_quantity=5,
            available_quantity=0,
            condition=EquipmentCondition.NEEDS_REPAIR,
        )
    )
    await repo.update_equipment(
        e_old.id, {"last_maintenance": "2025-01-01"}
    )

    c1 = await repo.create_coaching_session(_create_coaching())
    await repo.create_coaching_session(
        CreateCoachingSession(
            sport="tennis",
            coach_name="Coach Ana",
            member_id="M002",
            member_name="Socio Dos",
            date="2026-11-15",
            start_time="08:00",
            end_time="09:00",
            location="Cancha Central",
        )
    )
    await repo.create_coaching_session(
        CreateCoachingSession(
            sport="football",
            coach_name="Coach Beto",
            member_id="M002",
            member_name="Socio Dos",
            date="2026-11-16",
            start_time="17:00",
            end_time="18:00",
            location="Cancha Norte",
        )
    )

    await repo.create_recommendation(
        CreateSportsRecommendation(
            member_id="M001", sport="swimming", reason="Cross-training"
        )
    )

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    # tournament metrics
    m = await repo.get_tournament_metrics()
    assert m.total_tournaments == 2
    assert m.by_status == {"draft": 1, "in_progress": 1}
    assert m.avg_participation_rate == round((18 / 32 + 6 / 8) / 2 * 100, 1)
    assert m.upcoming_count == 1, "draft cuenta como upcoming"
    assert m.in_progress_count == 1
    assert m.total_revenue == round(18 * 25000.0, 2)
    assert m.avg_entry_fee == round((25000.0 + 0.0) / 2, 2)

    # equipment lifecycle: needs_repair 80 + 0/5 <0.2 (+20) + >365d (+30) = 100
    lc = await repo.get_equipment_lifecycle()
    assert len(lc) == 2
    top = lc[0]
    assert top.urgency_score >= 80
    assert top.recommended_action in ("replace_urgent",)
    good = next(x for x in lc if x.condition == EquipmentCondition.GOOD)
    assert good.recommended_action == "ok"
    assert good.urgency_score == 10.0

    # coaching effectiveness
    eff = await repo.get_coaching_effectiveness()
    assert eff.total_sessions == 3
    assert eff.unique_members_coached == 2
    assert eff.top_coach == "Coach Ana", "2 sesiones vs 1 de Beto"
    ana = next(c for c in eff.coaches if c.name == "Coach Ana")
    assert ana.session_count == 2
    assert ana.unique_members == 2
    assert ana.avg_sessions_per_member == 1.0
    assert eff.avg_sessions_per_member == round(3 / 2, 1)

    # seasonal patterns: 12 meses siempre · este test no siembra
    # reservas ni clases (solo torneos dic + coaching nov)
    sp = await repo.get_seasonal_patterns()
    assert len(sp) == 12
    nov = next(m_ for m_ in sp if m_.month == 11)
    assert nov.reservation_count == 0
    assert nov.class_count == 0
    dic = next(m_ for m_ in sp if m_.month == 12)
    assert dic.tournament_count == 2, "2 torneos empiezan 12-01/12-10"
    assert dic.class_count == 0, "sin clases activas en este test"
    assert dic.is_peak_season is True
    assert sp[0].month_name == "Enero"

    # member profile
    prof = await repo.get_member_sport_profile("M001")
    assert prof.sports_played == ["swimming", "tennis"], (
        "sorted · tennis del coaching · swimming de la recommendation"
    )
    assert prof.total_sessions == 1, "1 coaching (sin reservas acá)"
    assert prof.coaching_sessions == 1
    assert prof.active_reservations == 0
    assert prof.favorite_sport == "tennis"
    assert prof.skill_levels == {"tennis": "intermediate"}

    # contrato vacío: profile de socio sin datos → defaults
    empty_pop = await repo.get_member_sport_profile("ninien")
    assert empty_pop.sports_played == []
    assert empty_pop.favorite_sport is None
    assert empty_pop.total_sessions == 0
    assert empty_pop.active_reservations == 0
