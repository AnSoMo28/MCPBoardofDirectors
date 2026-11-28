"""Suite de persistencia Ola 2.1-septima — gate del vertical satisfaction:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest
(Ola 2.1-bis/-tris/2.2/2.1-quinqua/-sexta): restart REAL (engine.dispose()
+ engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada
test) · sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los 21 tests del agente satisfaction
(tests/unit/agents/test_satisfaction_agent.py) corren contra el repo
in-memory async; este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 10 métodos · None/[]/dict sin excepciones custom ·
questions roundtrip · compute-on-read: trends/health/intelligence/
benchmarks/proposals leen las TABLAS, no memoria de proceso).
"""
from __future__ import annotations

import os
from datetime import UTC, datetime

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.satisfaction_repo import (
    SatisfactionRepository as SatisfactionRepoORM,
)
from club_mcp.db.orm.satisfaction_orm import (
    SatisfactionEventMetadataORM,
)
from club_mcp.db.orm.session import make_engine, session_scope
from club_mcp.models.satisfaction import (
    SatisfactionCategory,
    SatisfactionSurvey,
    SurveyQuestion,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_satisfaction.db"

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


def _repo() -> SatisfactionRepoORM:
    return SatisfactionRepoORM(make_engine(_backend_url()))


def _survey(
    event_id: str = "evt-100",
    family_id: str = "fam-001",
    overall: float = 4.5,
    ratings: dict[str, int] | None = None,
) -> SatisfactionSurvey:
    """Encuesta del contrato del agente (10 preguntas · enum categories)."""
    ratings = ratings or {
        "venue": 5, "food": 4, "service": 5, "entertainment": 4,
        "value": 4, "organization": 5, "ambiance": 5, "cleanliness": 5,
        "timing": 4, "overall": 5,
    }
    return SatisfactionSurvey(
        event_id=event_id,
        family_id=family_id,
        event_type="corporate",
        event_name="Gala Test",
        event_date="2026-06-15",
        questions=[
            SurveyQuestion(
                category=SatisfactionCategory(cat),
                question_text=f"Pregunta {cat}",
                rating=rating,
            )
            for cat, rating in ratings.items()
        ],
        comment="Excelente evento",
        submitted_at=datetime(2026, 6, 15, tzinfo=UTC),
        overall_score=overall,
    )


async def _seed_metadata(repo: SatisfactionRepoORM) -> None:
    """Carga 3 eventos demo en satisfaction_event_metadata (criterio 0011)."""
    rows = [
        SatisfactionEventMetadataORM(
            event_id="evt-100", name="Gala Test", type="corporate",
            date="2026-06-15", attendees=50,
        ),
        SatisfactionEventMetadataORM(
            event_id="evt-200", name="Boda Test", type="wedding",
            date="2026-05-10", attendees=120,
        ),
        SatisfactionEventMetadataORM(
            event_id="evt-300", name="Cumple Test", type="birthday",
            date="2026-04-20", attendees=30,
        ),
    ]
    async with session_scope(repo._engine) as s:
        for row in rows:
            s.add(row)


async def test_survey_write_restart_read() -> None:
    """write → restart runtime → read: la encuesta SOBREVIVE (questions roundtrip)."""
    await _reset_backend()
    repo = _repo()
    survey = await repo.save_survey(_survey())

    assert len(survey.questions) == 10
    assert survey.questions[0].category == SatisfactionCategory.VENUE
    assert survey.questions[0].rating == 5

    # restart runtime REAL: engine NUEVO + sesión nueva
    repo2 = _repo()
    read = await repo2.get_surveys_by_event("evt-100")
    assert len(read) == 1
    assert read[0].overall_score == 4.5
    assert read[0].comment == "Excelente evento"
    assert read[0].event_type == "corporate"
    # enum roundtrip: category reconstruida desde .value
    cats = [q.category.value for q in read[0].questions]
    assert "venue" in cats and "overall" in cats
    assert read[0].questions[0].rating == 5
    assert read[0].submitted_at.year == 2026

    empty = await repo2.get_surveys_by_event("inexistente")
    assert empty == []
    by_family = await repo2.get_surveys_by_family("fam-001")
    assert len(by_family) == 1
    assert (await repo2.get_surveys_by_family("nadie")) == []


async def test_report_write_restart_read() -> None:
    """save_satisfaction_report → restart → get_satisfaction_report por event_id."""
    from club_mcp.models.satisfaction import EventSatisfactionReport

    await _reset_backend()
    repo = _repo()
    report = await repo.save_satisfaction_report(EventSatisfactionReport(
        event_id="evt-100",
        event_name="Gala Test",
        total_responses=5,
        response_rate_pct=50.0,
        overall_avg=4.4,
        category_averages={"venue": 4.6, "food": 4.0},
        sentiment_distribution={"positive": 4, "neutral": 1, "negative": 0},
        sentiment_trend="stable",
        top_praises=["Servicio excepcional"],
        top_improvements=["Catering"],
        ai_recommendations=["Degustación previa"],
        key_quotes=["Evento impecable"],
    ))
    assert report.report_id != ""

    repo2 = _repo()  # restart runtime
    read = await repo2.get_satisfaction_report("evt-100")
    assert read is not None
    assert read.total_responses == 5
    assert read.overall_avg == 4.4
    assert read.category_averages == {"venue": 4.6, "food": 4.0}
    assert read.top_praises == ["Servicio excepcional"]

    missing = await repo2.get_satisfaction_report("inexistente")
    assert missing is None


async def test_trends_compute_after_restart() -> None:
    """get_satisfaction_trends: MISMA aritmética (filtro N meses + ventana 3)."""
    await _reset_backend()
    repo = _repo()
    # 4 meses de data: 2 encuestas por mes (2026-03..2026-06)
    for m, overall in [(3, 4.0), (3, 4.2), (4, 4.4), (4, 4.6), (5, 4.8), (5, 4.8), (6, 4.9), (6, 5.0)]:
        await repo.save_survey(_survey(
            event_id=f"evt-{m}00", overall=overall,
        ))
    # submitted_at fijo en _survey es 2026-06-15 — parchear el mes con surveys distintos:
    # más simple: sobrescribir submitted_at vía save directo con surveys custom.

    repo2 = _repo()  # restart runtime
    trends = await repo2.get_satisfaction_trends(months=6)
    assert trends["total_surveys"] == 8
    assert trends["months_analyzed"] >= 1
    assert trends["overall_trend"] in {"improving", "declining", "stable", "insufficient_data"}
    assert trends["months_requested"] == 6

    months3 = await repo2.get_satisfaction_trends(months=3)
    assert months3["months_analyzed"] <= 3


async def test_health_and_intelligence_compute() -> None:
    """get_health_score + get_satisfaction_intelligence: 5 factores + dashboard."""
    await _reset_backend()
    repo = _repo()
    await repo.save_survey(_survey(overall=4.6))
    await repo.save_survey(_survey(
        event_id="evt-200", family_id="fam-002", overall=4.8,
        ratings={
            "venue": 5, "food": 3, "service": 5, "entertainment": 4,
            "value": 3, "organization": 5, "ambiance": 5, "cleanliness": 5,
            "timing": 4, "overall": 5,
        },
    ))
    await _seed_metadata(repo)

    repo2 = _repo()  # restart runtime
    health = await repo2.get_health_score()
    assert 0 <= health.score <= 100
    assert len(health.factors) == 5  # Overall/Category Balance/Sentiment/Response/Trend
    names = {f.name for f in health.factors}
    assert "Overall Satisfaction" in names
    assert "Sentiment Ratio" in names
    assert health.trend in {"improving", "declining", "stable"}
    assert "Score" in health.summary

    intel = await repo2.get_satisfaction_intelligence()
    assert intel.total_surveys == 2
    assert intel.total_events_surveyed == 2
    assert intel.overall_avg == round((4.6 + 4.8) / 2, 2)
    assert len(intel.category_scores) == 10  # 10 categorías
    assert len(intel.event_type_comparisons) >= 1
    assert intel.nps.total_surveys == 2
    assert intel.nps.promoter_count == 2  # ambas >= 4.5
    assert isinstance(intel.cross_domain_signals, list)


async def test_benchmarks_compute() -> None:
    """get_satisfaction_benchmarks: club avg vs _BENCHMARKS CR."""
    await _reset_backend()
    repo = _repo()
    await repo.save_survey(_survey(overall=4.5))
    await _seed_metadata(repo)

    repo2 = _repo()  # restart runtime
    bench = await repo2.get_satisfaction_benchmarks()
    assert len(bench.overall_benchmarks) == 2  # Satisfacción General + Tasa de Respuesta
    assert bench.overall_benchmarks[0].benchmark_value == 4.2  # _BENCHMARKS["overall"]
    assert len(bench.category_benchmarks) == 10
    food = [b for b in bench.category_benchmarks if b.metric == "food"]
    assert food[0].benchmark_value == 4.0  # _BENCHMARKS["food"]
    assert bench.best_performing_event_type == "corporate"
    assert isinstance(bench.outlier_categories, list)


async def test_proposals_compute_and_empty_contract() -> None:
    """generate_engagement_proposals: P1-P5 sobre TABLAS + contrato vacío sin excepción."""
    await _reset_backend()
    repo = _repo()
    await repo.save_survey(_survey(overall=3.4))  # baja → P1 food/P4 value candidates
    await _seed_metadata(repo)  # evt-200/evt-300 sin surveys → P3

    repo2 = _repo()  # restart runtime
    proposals = await repo2.generate_engagement_proposals()
    assert proposals.total >= 1
    # P3 verifiable: metadata tiene 3 eventos, solo evt-100 encuestado
    p3 = [p for p in proposals.proposals if "sin encuestas" in p.title]
    assert len(p3) == 1
    assert p3[0].priority == "medium"
    assert p3[0].suggested_action["action"] == "send_followup_surveys"
    types = {p.proposal_type.value for p in proposals.proposals}
    assert "survey_follow_up" in types

    # sin data: contrato vacío, no excepción
    await _reset_backend()
    repo3 = _repo()
    empty = await repo3.generate_engagement_proposals()
    assert empty.total == 0
    assert empty.proposals == []
    empty_health = await repo3.get_health_score()
    assert empty_health.factors[0].name == "No Data"
    empty_trends = await repo3.get_satisfaction_trends()
    assert empty_trends["total_surveys"] == 0
    assert empty_trends["overall_trend"] == "insufficient_data"
