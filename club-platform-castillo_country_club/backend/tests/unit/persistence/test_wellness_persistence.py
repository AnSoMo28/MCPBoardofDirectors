"""Suite de persistencia Ola 2.1-decimosexta — gate del vertical
wellness:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/
guest/satisfaction/communication/cultural_social/executive_dashboard/
proactive_recommendation/facility_management/age_group/sports_
recreation/finance (Ola 2.1-bis … -decimoquinta): restart REAL
(engine.dispose() + engine NUEVO + sesión nueva) · RE-RUNNABLE
(_reset_backend antes de cada test) · sqlite local / pgvector real
en CI.

Además — el gate de CONTRATO: los tests del agente wellness (28
tests) corren contra el repo in-memory async (la cirugía del propio
vertical); este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 22 métodos · None/[] sin excepciones custom
· JSONB lists roundtrip · enums roundtrip · SCHEDULED/ACTIVE
literales del create · enrolled_count increment/floor · filtros
list_* con orden de inserción (order_by(id) — lección run #56) ·
streak = unique dates literal · compute-on-read de prediction/
anomalies/correlations/insights byte a byte).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.wellness_repo import (
    WellnessRepository as WellnessRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.wellness import (
    ActivityType,
    AppointmentStatus,
    ClassLevel,
    GoalStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_wellness.db"

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


def _repo() -> WellnessRepoORM:
    return WellnessRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: WellnessRepoORM) -> WellnessRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


async def _seed_dataset(repo: WellnessRepoORM) -> None:
    """Dataset sembrado SOLO por métodos públicos del contrato (4 familias)."""
    await repo.create_profile({
        "family_id": "fam-001",
        "family_name": "Familia García",
        "fitness_level": "intermediate",
        "preferred_activities": ["yoga", "swimming"],
        "health_conditions": ["hipertensión"],
        "dietary_restrictions": ["vegetariano"],
    })
    await repo.create_profile({
        "family_id": "fam-002",
        "family_name": "Familia Chen",
        "fitness_level": "advanced",
        "preferred_activities": ["gym"],
    })
    await repo.create_goal({
        "family_id": "fam-001",
        "goal_type": "fitness",
        "title": "Correr 5K",
        "target_value": 5.0,
        "unit": "km",
        "status": "active",
    })
    await repo.create_goal({
        "family_id": "fam-002",
        "goal_type": "weight",
        "title": "Bajar 3 kilos",
        "target_value": 3.0,
        "unit": "kg",
        "status": "completed",
        "current_value": 3.0,
    })
    for i, (fid, at, mins, date) in enumerate([
        ("fam-001", "yoga", 60, "2026-11-01"),
        ("fam-001", "swimming", 45, "2026-11-03"),
        ("fam-001", "gym", 50, "2026-11-05"),
        ("fam-001", "gym", 40, "2026-11-07"),
        ("fam-001", "yoga", 55, "2026-11-09"),
        ("fam-001", "gym", 35, "2026-11-11"),
        ("fam-002", "gym", 80, "2026-11-02"),
        ("fam-002", "gym", 70, "2026-11-06"),
    ]):
        await repo.log_activity({
            "family_id": fid,
            "member_name": f"Miembro {i}",
            "activity_type": at,
            "duration_minutes": mins,
            "calories_burned": mins * 5,
            "date": date,
        })
    await repo.add_class({
        "name": "Yoga Matutino",
        "description": "Clase de yoga al amanecer",
        "activity_type": "yoga",
        "instructor": "Instructora Ana",
        "level": "all_levels",
        "max_participants": 15,
        "duration_minutes": 60,
        "location": "Mirador",
        "schedule_day": "lunes",
        "schedule_time": "07:00",
    })
    await repo.add_class({
        "name": "Aqua Fitness",
        "activity_type": "swimming",
        "instructor": "Coach Pedro",
        "level": "beginner",
        "max_participants": 2,
        "duration_minutes": 45,
        "location": "Piscina",
        "enrolled_count": 2,  # FULL
    })


async def test_entities_restart() -> None:
    """Profiles (JSONB lists) + goals + activities + classes + appointments."""
    await _reset_backend()
    repo = _repo()

    prof = await repo.create_profile({
        "family_id": "fam-001",
        "family_name": "Familia García",
        "fitness_level": "intermediate",
        "preferred_activities": ["yoga", "swimming"],
        "health_conditions": ["hipertensión"],
        "dietary_restrictions": ["vegetariano"],
    })
    assert prof.id.startswith("wlp_"), "ids wlp_{hex8} del in-memory"
    assert prof.fitness_level == ClassLevel.INTERMEDIATE, "enum roundtrip"
    assert prof.preferred_activities == ["yoga", "swimming"]
    assert prof.health_conditions == ["hipertensión"]

    goal = await repo.create_goal({
        "family_id": "fam-001",
        "goal_type": "fitness",
        "title": "Correr 5K",
        "target_value": 5.0,
        "unit": "km",
        "status": "active",
    })
    assert goal.id.startswith("goal_")
    assert goal.status == GoalStatus.ACTIVE, "ACTIVE literal del create"

    act = await repo.log_activity({
        "family_id": "fam-001",
        "member_name": "Carlos",
        "activity_type": "yoga",
        "duration_minutes": 60,
        "calories_burned": 200,
        "date": "2026-11-01",
    })
    assert act.id.startswith("wla_")
    assert act.activity_type == ActivityType.YOGA, "enum roundtrip"
    assert act.date == "2026-11-01", "date del Create se respeta"

    cls = await repo.add_class({
        "name": "Yoga Matutino",
        "activity_type": "yoga",
        "max_participants": 15,
    })
    assert cls.id.startswith("cls_")
    assert cls.enrolled_count == 0, "0 default del in-memory"
    assert "created_at" not in cls.model_dump(), "class SIN created_at"

    appt = await repo.create_appointment({
        "class_id": cls.id,
        "class_name": "Yoga Matutino",
        "family_id": "fam-001",
        "member_name": "Carlos",
        "date": "2026-12-01",
        "time": "07:00",
    })
    assert appt.id.startswith("appt_")
    assert appt.status == AppointmentStatus.SCHEDULED, "SCHEDULED literal"
    cls_now = await repo.get_class(cls.id)
    assert cls_now is not None and cls_now.enrolled_count == 1, "+= 1 literal"

    cancelled = await repo.cancel_appointment(appt.id)
    assert cancelled is not None
    assert cancelled.status == AppointmentStatus.CANCELLED
    cls_after = await repo.get_class(cls.id)
    assert cls_after is not None and cls_after.enrolled_count == 0
    # doble cancel: floor 0 (semántica literal del in-memory)
    again = await repo.cancel_appointment(appt.id)
    assert again is not None and again.status == AppointmentStatus.CANCELLED
    cls_floor = await repo.get_class(cls.id)
    assert cls_floor is not None and cls_floor.enrolled_count == 0, "max(0, n-1)"

    # contrato de errores: None / [] sin excepciones
    assert await repo.get_profile("wlp_nope") is None
    assert await repo.get_goal("goal_nope") is None
    assert await repo.get_class("cls_nope") is None
    assert await repo.cancel_appointment("appt_nope") is None
    assert (await repo.update_profile("wlp_nope", {"notes": "x"})) is None
    assert (await repo.update_goal("goal_nope", {"title": "x"})) is None

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    got_prof = await repo.get_profile_by_family("fam-001")
    assert got_prof is not None
    assert got_prof.fitness_level == ClassLevel.INTERMEDIATE, "enum tras restart"
    assert got_prof.preferred_activities == ["yoga", "swimming"], "JSONB tras restart"
    assert got_prof.health_conditions == ["hipertensión"]

    goals = await repo.list_goals("fam-001")
    assert len(goals) == 1
    assert goals[0].status == GoalStatus.ACTIVE

    acts = await repo.list_activities("fam-001")
    assert len(acts) == 1
    assert acts[0].activity_type == ActivityType.YOGA

    got_cls = await repo.get_class(cls.id)
    assert got_cls is not None and got_cls.enrolled_count == 0

    appts = await repo.list_appointments("fam-001")
    assert len(appts) == 1
    assert appts[0].status == AppointmentStatus.CANCELLED, "cancel sobrevive restart"


async def test_filters_and_updates() -> None:
    """Filtros list_* · update None-ignora · orden de inserción estable."""
    await _reset_backend()
    repo = _repo()

    await _seed_dataset(repo)

    # list_goals con filtro status (orden de inserción — lección #56)
    active_goals = await repo.list_goals("fam-001", status="active")
    assert len(active_goals) == 1
    assert active_goals[0].title == "Correr 5K"
    all_goals = await repo.list_goals("fam-002")
    assert [g.title for g in all_goals] == ["Bajar 3 kilos"]

    # list_activities filtros date_from/date_to (string compare)
    acts = await repo.list_activities(
        "fam-001", date_from="2026-11-03", date_to="2026-11-09"
    )
    assert [a.date for a in acts] == [
        "2026-11-09", "2026-11-07", "2026-11-05", "2026-11-03",
    ], "sort date DESC (orden contractual EXPLÍCITO)"

    # list_classes filtro activity_type
    yoga_classes = await repo.list_classes(activity_type="yoga")
    assert len(yoga_classes) == 1
    assert yoga_classes[0].name == "Yoga Matutino"

    # update_goal: None ignorado (semántica literal del in-memory)
    goal_id = active_goals[0].id
    upd = await repo.update_goal(
        goal_id, {"current_value": 2.5, "title": None, "unit": "km"}
    )
    assert upd is not None
    assert upd.current_value == 2.5
    assert upd.title == "Correr 5K", "None IGNORADO (no borrado)"

    # update_profile: None ignorado + updated_at SIEMPRE
    prof = await repo.get_profile_by_family("fam-001")
    assert prof is not None
    old_updated = prof.updated_at
    upd_prof = await repo.update_profile(
        prof.id, {"notes": "nueva nota", "family_name": None}
    )
    assert upd_prof is not None
    assert upd_prof.notes == "nueva nota"
    assert upd_prof.family_name == "Familia García", "None ignorado"
    assert upd_prof.updated_at >= old_updated, "updated_at se refresca"

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    goal_after = await repo.get_goal(goal_id)
    assert goal_after is not None
    assert goal_after.current_value == 2.5, "update sobrevive restart"
    assert goal_after.title == "Correr 5K"


async def test_compute_on_read_after_restart() -> None:
    """recommendations · report · prediction · anomalies: compute byte a byte."""
    await _reset_backend()
    repo = _repo()

    await _seed_dataset(repo)

    # recommendations: profile bien dotado + goals activos + actividades
    recs = await repo.get_recommendations("fam-001")
    cats = {r.category for r in recs}
    assert "class" in cats, "clases disponibles [:3]"
    class_recs = [r for r in recs if r.category == "class"]
    assert len(class_recs) == 2, "2 clases en el dataset"
    assert class_recs[0].related_class_id.startswith("cls_")

    # report: streak = unique dates (literal del in-memory)
    report = await repo.generate_report("fam-001", "2026-01-01", "2026-12-31")
    assert report.total_activities == 6
    assert report.total_minutes == 60 + 45 + 50 + 40 + 55 + 35
    assert report.total_calories == (60 + 45 + 50 + 40 + 55 + 35) * 5
    assert report.streak_days == 6, "streak = unique dates literal"
    assert report.most_frequent_activity == "gym", "3 gym vs 2 yoga"
    assert report.summary.startswith("\U0001f3c3"), "emoji 🏃 MISMO"
    assert "actividades" in report.summary
    assert report.goals_summary == {"active": 1}

    # prediction: engagement de 6 actividades / 285 min / 1 goal / perfil
    pred = await repo.compute_prediction("fam-001")
    assert pred.engagement_score == 62.5, (
        "6x4=24 · 285/10=28.5 · goal_rate 0/1 → 0 · perfil 10 = 62.5"
    )
    assert pred.predicted_trend == "stable", "62.5 ∈ [45,70)"
    assert pred.risk_level.value == "medium"
    assert pred.churn_risk_pct == 37.5, "100 - 62.5"
    assert pred.activity_forecast["most_frequent"] == "gym"
    assert pred.activity_forecast["suggested_weekly_minutes"] == 150

    # anomalies: sin gap (actividades de HOY) pero el goal ACTIVE al 0%
    # dispara GOAL_STAGNATION (semántica literal del in-memory)
    anoms = await repo.detect_anomalies("fam-001")
    assert anoms.total_anomalies == 1
    assert anoms.anomalies[0].anomaly_type.value == "goal_stagnation"
    assert anoms.anomalies[0].severity.value == "medium"
    assert anoms.critical_count == 0
    assert anoms.summary.startswith("\u2139"), "info emoji MISMO"

    # ── restart REAL ──
    repo = await _restart_repo(repo)

    report2 = await repo.generate_report("fam-001", "2026-01-01", "2026-12-31")
    assert report2.total_minutes == 285, "reporte sobrevive restart"
    pred2 = await repo.compute_prediction("fam-001")
    assert pred2.engagement_score == pred.engagement_score, "predicción idéntica"
    anoms2 = await repo.detect_anomalies("fam-001")
    assert anoms2.total_anomalies == 1, "goal_stagnation sobrevive restart"


async def test_correlations_insights_and_drop_in_inmemory() -> None:
    """correlations (Pearson de módulo) + insights + contrato drop-in VACÍO."""
    await _reset_backend()
    orm = _repo()

    from club_mcp.db.repositories.wellness_repo import (
        WellnessRepository as WellnessInMemory,
    )

    mem = WellnessInMemory()

    # ── contrato vacío idéntico ──
    assert await orm.get_profile_by_family("fam-0") is None
    assert await mem.get_profile_by_family("fam-0") is None
    assert (await orm.list_goals("fam-0")) == []
    assert (await mem.list_goals("fam-0")) == []
    assert (await orm.list_activities("fam-0")) == []
    assert (await orm.list_classes()) == []
    assert (await mem.list_classes()) == []
    empty_recs_orm = await orm.get_recommendations("fam-0")
    empty_recs_mem = await mem.get_recommendations("fam-0")
    assert [r.category for r in empty_recs_orm] == [r.category for r in empty_recs_mem]
    assert [r.category for r in empty_recs_orm] == ["goals", "activity"]

    # ── correlations: 2 familias → Pearson y segmentos ──
    await _seed_dataset(orm)
    await _seed_dataset(mem)

    def canon_corr(c):
        return (
            tuple(
                (k, v.coefficient, v.significance)
                for k, v in sorted(c.correlations.items())
            ),
            tuple(
                (s.segment, s.member_count, s.avg_monthly_spend_crc)
                for s in c.segment_insights
            ),
            tuple(
                (a.activity, a.avg_participants, a.monthly_revenue_impact_crc)
                for a in c.activity_value_ranking
            ),
        )

    corr_orm = await orm.compute_correlations()
    corr_mem = await mem.compute_correlations()
    assert canon_corr(corr_orm) == canon_corr(corr_mem), "correlations idénticas"
    assert len(corr_orm.segment_insights) == 3, "3 tiers SIEMPRE"
    assert corr_orm.activity_value_ranking[0].activity in ("gym", "yoga")

    # ── insights: mismo score y hallazgos ──
    def canon_insights(i):
        return (
            i.health_score,
            i.executive_summary,
            tuple(
                (f.category, f.finding, f.impact, f.action)
                for f in i.key_findings
            ),
            tuple(i.trend_analysis.items()),
            tuple(
                (c.insight, c.confidence, c.recommended_action)
                for c in i.critical_insights
            ),
        )

    ins_orm = await orm.compute_insights("fam-001")
    ins_mem = await mem.compute_insights("fam-001")
    assert canon_insights(ins_orm) == canon_insights(ins_mem), "insights idénticos"
    assert ins_orm.health_score > 0
    assert len(ins_orm.key_findings) >= 1, "financial SIEMPRE presente"

    # ── restart REAL: correlations leen la TABLA ──
    orm = await _restart_repo(orm)
    corr2 = await orm.compute_correlations()
    assert canon_corr(corr2) == canon_corr(corr_mem), "correlations tras restart"
    ins2 = await orm.compute_insights("fam-001")
    assert canon_insights(ins2) == canon_insights(ins_mem), "insights tras restart"
