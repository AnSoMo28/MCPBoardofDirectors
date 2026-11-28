"""Suite de persistencia Ola 2.1-undécima — gate del vertical
proactive_recommendation:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction/communication/cultural_social/executive_dashboard
(Ola 2.1-bis/-tris/2.2/-quinqua/-sexta/-septima/-octava/-nona/
-décima): restart REAL (engine.dispose() + engine NUEVO + sesión
nueva) · RE-RUNNABLE (_reset_backend antes de cada test) · sqlite
local / pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente
proactive_recommendation (tests/unit/agents/
test_proactive_recommendation_agent.py, 48 tests) corren contra el
repo in-memory async; este archivo verifica que el repo ORM async
cumple el mismo contrato (mismos 23 métodos · None/[] sin
excepciones custom · listas/dicts JSONB roundtrip · enums roundtrip
· updates parciales dict · sort por score · filtros por igualdad ·
size derivado al crear · status "proposed" literal).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.proactive_recommendation_repo import (
    ProactiveRecommendationRepository as ProactiveRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.proactive_recommendation import (
    ClusterType,
    CreateActivitySuggestion,
    CreatePricingOptimization,
    CreateRecommendation,
    PredictionConfidence,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_proactive_recommendation.db"

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


def _repo() -> ProactiveRepoORM:
    return ProactiveRepoORM(make_engine(_backend_url()))


async def _restart_repo(
    repo: ProactiveRepoORM,
) -> ProactiveRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


# ── test 1 · recommendations + predictions: JSONB · sort · filtros ──
async def test_recommendations_predictions_restart() -> None:
    await _reset_backend()
    repo = _repo()

    created_a = await repo.create_recommendation(
        CreateRecommendation(
            family_id="fam-001",
            recommendation_type="activity",
            title="Padel para los sábado",
            description="Grupo de pádel sabatino",
            priority="high",
            score=0.82,
            reasoning="Alta participación",
            tags=["padel", "sabado"],
        )
    )
    created_b = await repo.create_recommendation(
        CreateRecommendation(
            family_id="fam-002",
            recommendation_type="event",
            title="BBQ julio",
            description="Asado familiar",
            priority="low",
            score=0.91,
            reasoning="Histórico",
            tags=["bbq"],
        )
    )
    assert created_a.id and created_b.id
    assert created_a.tags == ["padel", "sabado"]
    assert created_a.created_at and created_a.updated_at

    pred = await repo.create_prediction(
        event_id="evt-001",
        event_name="Torneo Interno",
        predicted_attendance=120,
        confidence=PredictionConfidence.HIGH,
        factors=["weather", "school_holidays"],
        similar_events_avg=98,
    )
    assert pred.confidence is PredictionConfidence.HIGH
    assert pred.factors == ["weather", "school_holidays"]

    # restart REAL: dispose + engine nuevo + repo nuevo
    repo = await _restart_repo(repo)

    # read tras restart: JSONB lists roundtrip · enums roundtrip
    got_a = await repo.get_recommendation(created_a.id)
    assert got_a is not None
    assert got_a.title == "Padel para los sábado"
    assert got_a.tags == ["padel", "sabado"]
    assert got_a.priority.value == "high"
    assert got_a.family_id == "fam-001"

    got_pred = None
    for p in await repo.list_predictions():
        if p.id == pred.id:
            got_pred = p
    assert got_pred is not None
    assert got_pred.predicted_attendance == 120
    assert got_pred.confidence is PredictionConfidence.HIGH
    assert got_pred.factors == ["weather", "school_holidays"]

    # sort por score DESC (semántica literal del in-memory)
    listed = await repo.list_recommendations()
    assert [r.id for r in listed] == [created_b.id, created_a.id]

    # filtros por igualdad
    only_fam2 = await repo.list_recommendations(family_id="fam-002")
    assert [r.id for r in only_fam2] == [created_b.id]
    only_high = await repo.list_recommendations(priority="high")
    assert [r.id for r in only_high] == [created_a.id]

    # contrato vacío: None / []
    assert await repo.get_recommendation("nope-404") is None


# ── test 2 · suggestions: update dict parcial + filtro status ──
async def test_suggestions_update_restart() -> None:
    await _reset_backend()
    repo = _repo()

    sug = await repo.create_suggestion(
        CreateActivitySuggestion(
            name="Yoga en el jardín",
            description="Sesiones al aire libre",
            target_demographic="adults",
            estimated_interest=0.77,
            estimated_cost=150.0,
            similar_clubs_offer=True,
            member_requests_count=12,
            tags=["yoga", "wellness"],
        )
    )
    assert sug.status.value == "proposed"
    assert sug.tags == ["yoga", "wellness"]

    # update dict parcial: record.update(updates) + updated_at=now
    updated = await repo.update_suggestion(
        sug.id, {"status": "approved", "member_requests_count": 15}
    )
    assert updated is not None
    assert updated.status.value == "approved"
    assert updated.member_requests_count == 15
    assert updated.name == "Yoga en el jardín"  # no tocado
    assert updated.updated_at >= sug.created_at

    # clave desconocida: ignorada (Pydantic la descartaba igual)
    ghost = await repo.update_suggestion(sug.id, {"no_column": "x"})
    assert ghost is not None
    assert ghost.name == "Yoga en el jardín"

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_suggestion(sug.id)
    assert got is not None
    assert got.status.value == "approved"  # el update SOBREVIVIÓ
    assert got.member_requests_count == 15
    assert got.tags == ["yoga", "wellness"]
    assert got.similar_clubs_offer is True

    # filtro status
    listed = await repo.list_suggestions(status="approved")
    assert [s.id for s in listed] == [sug.id]

    # update de inexistente: None (sin excepción)
    assert await repo.update_suggestion("nope-404", {"status": "x"}) is None
    assert await repo.get_suggestion("nope-404") is None


# ── test 3 · conflicts + drafts + clusters: JSONB dicts/listas ──
async def test_conflicts_drafts_clusters_restart() -> None:
    await _reset_backend()
    repo = _repo()

    conflict = await repo.create_conflict(
        event_a_id="evt-001",
        event_a_name="Torneo Interno",
        event_b_id="evt-002",
        event_b_name="BBQ Julio",
        conflict_type="resource",
        severity="high",
        overlap_start="2027-07-15T10:00:00",
        overlap_end="2027-07-15T12:00:00",
        shared_resources=["Cancha 1", "Sonido"],
        suggestion="Mover BBQ a las 14:00",
    )
    assert conflict.severity.value == "high"
    assert conflict.shared_resources == ["Cancha 1", "Sonido"]

    draft = await repo.create_draft(
        family_id="fam-001",
        channel="whatsapp",
        subject="Tu reserva",
        body="Hola {nombre}",
        tone="friendly",
        personalization_data={"nombre": "Ana", "hijos": 2},
    )
    assert draft.personalization_data == {"nombre": "Ana", "hijos": 2}

    cluster = await repo.create_cluster(
        name="Pádel sábado",
        cluster_type=ClusterType.ACTIVITY,
        description="Familias del grupo sabatino",
        family_ids=["fam-001", "fam-002", "fam-003"],
        shared_interests=["padel", "competir"],
    )
    # size DERIVADO al crear (len(family_ids)) · avg_engagement 0.0
    assert cluster.size == 3
    assert cluster.avg_engagement == 0.0
    assert cluster.cluster_type is ClusterType.ACTIVITY

    # restart REAL
    repo = await _restart_repo(repo)

    got_conflicts = await repo.list_conflicts(severity="high")
    assert len(got_conflicts) == 1
    got = got_conflicts[0]
    assert got.shared_resources == ["Cancha 1", "Sonido"]
    assert got.suggestion == "Mover BBQ a las 14:00"
    assert got.severity.value == "high"

    got_drafts = await repo.list_drafts(family_id="fam-001")
    assert len(got_drafts) == 1
    assert got_drafts[0].personalization_data == {"nombre": "Ana", "hijos": 2}
    assert got_drafts[0].tone == "friendly"

    got_clusters = await repo.list_clusters(cluster_type="activity")
    assert len(got_clusters) == 1
    c = got_clusters[0]
    assert c.family_ids == ["fam-001", "fam-002", "fam-003"]
    assert c.size == 3
    assert c.avg_engagement == 0.0

    # filtros vacíos / sin match
    assert await repo.list_conflicts(severity="low") == []
    assert await repo.list_drafts(family_id="fam-999") == []
    assert await repo.list_clusters(cluster_type="interest") == []


# ── test 4 · pricing + insights: updates + status literal ──
async def test_pricing_insights_restart() -> None:
    await _reset_backend()
    repo = _repo()

    pricing = await repo.create_pricing(
        CreatePricingOptimization(
            service_name="Membresía Familiar",
            current_price=450.0,
            suggested_price=430.0,
            strategy="member_tier",
            expected_revenue_change=-0.02,
            expected_demand_change=0.08,
            reasoning="Churn alto en renewal",
            risk_level="low",
        )
    )
    assert pricing.status.value == "proposed"
    assert pricing.strategy.value == "member_tier"

    insights = await repo.create_insights(
        year=2027,
        period="Q1",
        summary="Q1 sólido",
        total_members_active=412,
        events_held=23,
        avg_event_attendance=87.5,
        revenue_total=123456.78,
        top_activities=[
            {"name": "Pádel", "attendance": 210},
            {"name": "BBQ", "attendance": 180},
        ],
        member_satisfaction_avg=4.6,
        key_achievements=[" +200 socios", "Natación x2"],
        areas_for_improvement=["Catering eventos"],
        recommendations=["Ampliar horario piscina"],
    )
    # status "proposed" LITERAL del create_* del in-memory
    assert insights.status.value == "proposed"
    assert insights.top_activities[0]["name"] == "Pádel"

    # updates parciales
    upd_p = await repo.update_pricing(
        pricing.id, {"status": "approved", "risk_level": "medium"}
    )
    assert upd_p is not None
    assert upd_p.status.value == "approved"
    assert upd_p.risk_level == "medium"
    assert upd_p.current_price == 450.0

    upd_i = await repo.update_insights(
        insights.id, {"status": "under_review", "summary": "Q1 muy sólido"}
    )
    assert upd_i is not None
    assert upd_i.status.value == "under_review"
    assert upd_i.summary == "Q1 muy sólido"

    # restart REAL
    repo = await _restart_repo(repo)

    got_p = await repo.get_pricing(pricing.id)
    assert got_p is not None
    assert got_p.status.value == "approved"  # SOBREVIVIÓ
    assert got_p.reasoning == "Churn alto en renewal"

    got_i = await repo.get_insights(insights.id)
    assert got_i is not None
    assert got_i.status.value == "under_review"
    assert got_i.top_activities == [
        {"name": "Pádel", "attendance": 210},
        {"name": "BBQ", "attendance": 180},
    ]
    assert got_i.key_achievements == [" +200 socios", "Natación x2"]
    assert got_i.year == 2027

    # filtros: year/period · status
    by_q1 = await repo.list_insights(year=2027, period="Q1")
    assert [i.id for i in by_q1] == [insights.id]
    by_status = await repo.list_pricing(status="approved")
    assert [p.id for p in by_status] == [pricing.id]

    # contrato vacío: None / []
    assert await repo.get_pricing("nope-404") is None
    assert await repo.get_insights("nope-404") is None
    assert await repo.list_insights(year=1999) == []
    assert await repo.list_pricing(status="zzz") == []
