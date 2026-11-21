"""Suite de persistencia Ola 2.1-decimaseptima — gate del vertical
member_360:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family…wellness (Ola 2.1-bis …
-decimosexta): restart REAL (engine.dispose() + engine NUEVO +
sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / PG real en CI.

Vertical READ-ONLY: el repo in-memory NO tiene writes públicos —
el dataset demo entra por el opt-in del constructor
(seed_demo_data=True), MISMO contrato que el in-memory. Este
archivo verifica: seed idempotente tras restart (12 members ·
5x5 factors explícitos · default factors para el resto) ·
contrato vacío sin opt-in (todo None/[]/{error}) · compute-on-read
byte a byte en lo DETERMINISTA (search orden completo · composites
· levels · churn · risk_factors exactos · journey stage/history/
milestones forma · LTV breakdown 30/25/15/10/12/8 · proposals
deterministas m-007/m-009) · forma-only para lo random stateless
(rangos · keys idénticas) · drop-in in-memory vs ORM con dataset
sembrado por el MISMO opt-in.

canon: la parte ALEATORIA (random.uniform/choice/sample) es
STATELESS — MISMO contrato en ambos repos: se compara TODO lo
determinista byte a byte y lo aleatorio por forma (rango/keys).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.member360_repo import (
    Member360Repository as Member360RepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.member_360 import (
    ChurnRiskLevel,
    MemberHealthLevel,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_member360.db"

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


def _repo(seed: bool = False) -> Member360RepoORM:
    return Member360RepoORM(make_engine(_backend_url()), seed_demo_data=seed)


async def _restart_repo(repo: Member360RepoORM, seed: bool = False) -> Member360RepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo(seed)


async def test_empty_contract_without_opt_in() -> None:
    """Sin seed_demo_data: members VACÍOS — factors del SEED GLOBAL.

    Contrato EXACTO del in-memory sin opt-in: identity/search/
    journey/ltv/proposals → None/[]/{"error": ...} (dependen de
    _members VACÍO); health/churn/risk/activity/social FUNCIONAN
    sobre HEALTH_FACTORS_SEED GLOBAL (m-001 87.9 excellent).
    """
    await _reset_backend()
    repo = _repo()  # sin opt-in

    assert await repo.get_member_identity("m-001") is None
    search = await repo.search_members()
    assert search == {"members": [], "total": 0, "page": 1, "page_size": 20}
    # factors del SEED global (NO default): m-001 tiene seed explícito
    f = await repo.get_health_factors("m-001")
    assert [(x.name, x.score) for x in f][:2] == [("engagement", 92.0), ("financial", 88.0)]
    # m-999 (sin seed): DEFAULT factors del in-memory
    f999 = await repo.get_health_factors("m-999")
    assert [(x.name, x.score) for x in f999][:2] == [("engagement", 60.0), ("financial", 70.0)]
    # health/churn/risk VIVEN sin opt-in (SEED global — MISMO in-memory)
    hs = await repo.get_health_score("m-001")
    assert hs["composite_score"] == 87.9
    assert hs["health_level"] == MemberHealthLevel.EXCELLENT.value
    c = await repo.get_churn_prediction("m-001")
    assert c["churn_risk"] == "low" and c["churn_score"] == 12.1
    ri = await repo.get_risk_assessment("m-001")
    assert ri["overall_risk"] == "low" and ri["risk_score"] == 12.1
    ac = await repo.get_activity_summary("m-001", 30)
    assert 18 <= ac["total_activities"] <= 23  # 92//5 + randint(0,5)
    # pero journey/ltv/proposals → error (identity None)
    assert await repo.get_member_journey("m-001") == {"error": "Member not found"}
    assert await repo.get_ltv_analysis("m-001") == {"error": "Member not found"}
    assert await repo.generate_engagement_proposals("m-001") == {"error": "Member not found"}


async def test_seed_and_search_after_restart() -> None:
    """Seed idempotente (12 members · 5x5 factors) + search completo."""
    await _reset_backend()
    repo = _repo(seed=True)

    # identidades del MISMO MEMBER_SEED
    ids = [m.member_id for m in
           (await repo.search_members(page_size=50))["members"]]
    # orden health_score_desc: m-012 (90.85) · m-001 (87.9) · m-003 (71.9)
    # · 7 default (60.75) · m-009 (57.75) · m-007 (39.9)
    assert ids[:4] == ["m-012", "m-001", "m-003", "m-002"]
    assert ids[-2:] == ["m-009", "m-007"]
    assert (await repo.search_members())["total"] == 12

    # preview determinista byte a byte (m-001)
    s = await repo.search_members(tier="platino")
    assert [m.member_id for m in s["members"]] == ["m-001", "m-002", "m-011"]
    assert [m.health_score for m in s["members"]] == [87.9, 60.8, 60.8]
    assert s["members"][0].health_level == "excellent"
    assert s["members"][0].churn_risk == "low"
    assert s["members"][0].journey_stage == "peak"
    assert s["members"][0].engagement_score == 92.0

    # filtros query/tier/health_level deterministas
    gonz = await repo.search_members(query="gonz")
    assert [m.member_id for m in gonz["members"]] == ["m-001", "m-002", "m-011"]
    crit = await repo.search_members(health_level="critical")
    assert [m.member_id for m in crit["members"]] == ["m-007"]
    at_risk = await repo.search_members(churn_risk="high")
    assert [m.member_id for m in at_risk["members"]] == ["m-007"]
    onb = await repo.search_members(journey_stage="onboarding")
    assert [m.member_id for m in onb["members"]] == ["m-009"]
    # sort tier_desc (mapa literal) + paginación
    tdesc = await repo.search_members(sort_by="tier_desc", page_size=5)
    assert [(m.member_id, m.tier) for m in tdesc["members"]] == [
        ("m-012", "vip"), ("m-001", "platino"), ("m-002", "platino"),
        ("m-011", "platino"), ("m-003", "oro"),
    ]
    page2 = await repo.search_members(sort_by="tier_desc", page_size=5, page=2)
    assert [m.member_id for m in page2["members"]] == [
        "m-004", "m-008", "m-010", "m-005", "m-006",
    ]
    # ltv_desc placeholder: MISMO orden que venía (orden de inserción)
    ltv_sort = await repo.search_members(sort_by="ltv_desc", page_size=3)
    assert [m.member_id for m in ltv_sort["members"]] == ["m-001", "m-002", "m-003"]

    # ── restart REAL (SIN seed en el nuevo repo: la data YA está) ──
    repo = await _restart_repo(repo)  # seed False: data persistida

    after = await repo.search_members(page_size=50)
    assert after["total"] == 12
    ids_after = [m.member_id for m in after["members"]]
    assert ids_after[:4] == ["m-012", "m-001", "m-003", "m-002"]
    m1 = await repo.get_member_identity("m-001")
    assert m1 is not None and m1.first_name == "Carlos" and m1.tier == "platino"
    f = await repo.get_health_factors("m-001")
    assert [(x.name, x.score) for x in f][:2] == [("engagement", 92.0), ("financial", 88.0)]
    assert f[0].details is not None and "Champion" in f[0].details


async def test_compute_on_read_after_restart() -> None:
    """health/journey/churn/ltv/risk/proposals: compute byte a byte."""
    await _reset_backend()
    repo = _repo(seed=True)

    # health_score: composite/level/factors deterministas
    hs = await repo.get_health_score("m-007")
    assert hs["composite_score"] == 39.9
    assert hs["health_level"] == MemberHealthLevel.CRITICAL.value
    assert len(hs["factors"]) == 5
    # aleatorio stateless: forma idéntica
    assert 40.0 <= hs["benchmark_percentile"] <= 95.0
    assert hs["trend"] in {"improving", "stable", "declining"}
    prev_delta = abs(hs["composite_score"] - hs["previous_score"]) <= 5.0
    assert prev_delta

    # churn m-007: HIGH · risk_factors exactos (engagement/social/activity)
    c = await repo.get_churn_prediction("m-007")
    assert c["churn_risk"] == ChurnRiskLevel.HIGH.value
    assert c["churn_score"] == 60.1
    assert [rf["source"] for rf in c["risk_factors"]] == ["engagement", "social", "activity"]
    assert c["protective_factors"] == [], "financial 55 NO supera 70"
    assert c["recommended_actions"] == [
        "Contactar personalmente en las próximas 48 horas",
        "Ofrecer experiencia personalizada sin costo",
        "Agendar reunión con Director de Experiencia",
    ]
    assert c["time_horizon_days"] == 90
    # churn m-001: LOW · 5 protectivos · 0 riesgos · sin acciones
    c1 = await repo.get_churn_prediction("m-001")
    assert c1["churn_risk"] == "low" and c1["churn_score"] == 12.1
    assert c1["risk_factors"] == []
    assert len(c1["protective_factors"]) == 5
    assert c1["recommended_actions"] == []

    # journey m-009: ONBOARDING determinista (tenure 45 < 90)
    j = await repo.get_member_journey("m-009")
    assert j["current_stage"] == "onboarding"
    assert j["next_expected_transition"] == "growing"
    assert j["member_id"] == "m-009"
    assert all("stage" in h and "entered_at" in h for h in j["stage_history"])
    assert {m.milestone_type for m in j["milestones"]} >= {"join", "achievement", "celebration"}
    # journey m-001: PEAK (eng 92 ≥ 80 · tenure 1825 > 365)
    j1 = await repo.get_member_journey("m-001")
    assert j1["current_stage"] == "peak"
    assert j1["next_expected_transition"] == "plateau"
    assert any(m.milestone_type == "anniversary" for m in j1["milestones"])
    # not found: MISMO error literal
    assert await repo.get_member_journey("nope") == {"error": "Member not found"}

    # LTV: breakdown 30/25/15/10/12/8 + tier por eng
    ltv = await repo.get_ltv_analysis("m-001")
    assert [b["domain"] for b in ltv["spend_breakdown"]] == [
        "events", "sports", "wellness", "cultural", "dining", "guests",
    ]
    assert [b["percentage"] for b in ltv["spend_breakdown"]] == [30, 25, 15, 10, 12, 8]
    assert ltv["ltv_trend"] == "improving"  # eng 92 > 70
    assert ltv["current_ltv"] == round(ltv["monthly_avg_spend"] * 60, 2)  # tenure 1825//30
    assert ltv["peak_month"] in {"Diciembre", "Julio", "Marzo"}

    # risk m-001: overall LOW · 0 riesgos (mín 78>45) · protectivos 5
    ri = await repo.get_risk_assessment("m-001")
    assert ri["overall_risk"] == "low"
    assert ri["risk_score"] == 12.1
    assert ri["risk_factors"] == []
    assert len(ri["protective_factors"]) == 5
    # risk m-007: overall CRITICAL (39.9 < 40) · severidades
    ri7 = await repo.get_risk_assessment("m-007")
    assert ri7["overall_risk"] == "critical"
    sev = {rf["source"]: rf["severity"] for rf in ri7["risk_factors"]}
    assert sev == {"engagement": "medium", "social": "high", "activity": "high"}

    # proposals m-007 (deterministas): retention (eng 38<50) + social (25<40) + cross
    pr = await repo.generate_engagement_proposals("m-007")
    types = [p.proposal_type for p in pr["proposals"]]
    assert types[0] == "retention_campaign" and types[1] == "social_connection"
    assert "cross_domain" in types
    ret = pr["proposals"][0]
    assert ret.priority == "high" and ret.confidence == 82
    assert ret.suggested_action == "Agendar llamada personal + invitación a evento exclusivo"
    sig = {s["signal"]: s["status"] for s in pr["cross_domain_signals"]}
    assert sig["engagement_trend"] == "attention" and sig["social_density"] == "attention"
    # proposals m-009: sin retention (eng 55) + social (20<40) + cross + wellness
    pr9 = await repo.generate_engagement_proposals("m-009")
    t9 = [p.proposal_type for p in pr9["proposals"]]
    assert "retention_campaign" not in t9
    assert t9[0] == "social_connection" and "cross_domain" in t9

    # ── restart REAL: compute sobre la TABLA persistida ──
    repo = await _restart_repo(repo)

    hs2 = await repo.get_health_score("m-007")
    assert hs2["composite_score"] == 39.9, "compute sobrevive restart"
    c2 = await repo.get_churn_prediction("m-007")
    assert c2["churn_risk"] == "high" and c2["churn_score"] == 60.1
    assert [rf["source"] for rf in c2["risk_factors"]] == ["engagement", "social", "activity"]
    j2 = await repo.get_member_journey("m-009")
    assert j2["current_stage"] == "onboarding"
    ltv2 = await repo.get_ltv_analysis("m-001")
    assert ltv2["ltv_trend"] == "improving"
    ri2 = await repo.get_risk_assessment("m-007")
    assert ri2["overall_risk"] == "critical"


async def test_drop_in_inmemory_canon() -> None:
    """Drop-in: dataset MISMO (opt-in) — canon determinista idéntico."""
    await _reset_backend()
    orm = _repo(seed=True)

    from club_mcp.db.repositories.member_360_repo import (
        Member360Repository as Member360InMemory,
    )

    mem = Member360InMemory(seed_demo_data=True)

    # ── canon de search: TODO determinista byte a byte ──
    def canon_preview(p):
        return (
            p.member_id, p.first_name, p.last_name, p.tier, p.role,
            p.family_name, p.health_score, p.health_level, p.churn_risk,
            p.engagement_score, p.journey_stage,
        )

    for q in (None, "gonz", "vega"):
        o = await orm.search_members(query=q, page_size=50)
        m = await mem.search_members(query=q, page_size=50)
        assert [canon_preview(x) for x in o["members"]] == \
            [canon_preview(x) for x in m["members"]], f"query={q}"
        assert o["total"] == m["total"]
    for t in ("platino", "oro", "vip", "basic"):
        o = await orm.search_members(tier=t, page_size=50)
        m = await mem.search_members(tier=t, page_size=50)
        assert [canon_preview(x) for x in o["members"]] == \
            [canon_preview(x) for x in m["members"]], f"tier={t}"
    for sb in ("health_score_desc", "tier_desc", "name_asc", "churn_risk_desc"):
        o = await orm.search_members(sort_by=sb, page_size=50)
        m = await mem.search_members(sort_by=sb, page_size=50)
        assert [canon_preview(x) for x in o["members"]] == \
            [canon_preview(x) for x in m["members"]], f"sort={sb}"

    # ── canon de identity/factors: byte a byte ──
    for mid in ("m-001", "m-007", "m-009", "m-012"):
        io = await orm.get_member_identity(mid)
        im = await mem.get_member_identity(mid)
        assert io.model_dump() == im.model_dump(), mid
        fo = await orm.get_health_factors(mid)
        fm = await mem.get_health_factors(mid)
        assert [f.model_dump() for f in fo] == [f.model_dump() for f in fm], mid

    # ── canon churn/risk: determinista completo ──
    for mid in ("m-001", "m-003", "m-007", "m-009"):
        co = await orm.get_churn_prediction(mid)
        cm = await mem.get_churn_prediction(mid)
        assert (co["churn_risk"], co["churn_score"]) == (cm["churn_risk"], cm["churn_score"])
        assert [rf["source"] for rf in co["risk_factors"]] == \
            [rf["source"] for rf in cm["risk_factors"]]
        assert co["recommended_actions"] == cm["recommended_actions"]
        ro = await orm.get_risk_assessment(mid)
        rm = await mem.get_risk_assessment(mid)
        assert ro["overall_risk"] == rm["overall_risk"]
        assert [rf["source"] for rf in ro["risk_factors"]] == \
            [rf["source"] for rf in rm["risk_factors"]]

    # ── canon journey: stage + next + milestones tipo ──
    for mid in ("m-001", "m-003", "m-007", "m-009", "m-012"):
        jo = await orm.get_member_journey(mid)
        jm = await mem.get_member_journey(mid)
        assert jo["current_stage"] == jm["current_stage"], mid
        assert jo["next_expected_transition"] == jm["next_expected_transition"]
        assert {m2.milestone_type for m2 in jo["milestones"]} == \
            {m2.milestone_type for m2 in jm["milestones"]}

    # ── canon LTV: domains + trend + monthly coherencia ──
    for mid in ("m-001", "m-007"):
        lo = await orm.get_ltv_analysis(mid)
        lm = await mem.get_ltv_analysis(mid)
        assert [b["domain"] for b in lo["spend_breakdown"]] == \
            [b["domain"] for b in lm["spend_breakdown"]]
        assert lo["ltv_trend"] == lm["ltv_trend"]

    # ── canon proposals: tipos deterministas ──
    po = await orm.generate_engagement_proposals("m-007")
    pm = await mem.generate_engagement_proposals("m-007")
    assert [p.proposal_type for p in po["proposals"][:2]] == \
        [p.proposal_type for p in pm["proposals"][:2]]
    assert po["proposals"][0].model_dump(exclude={"related_members", "expires_at"}) == \
        pm["proposals"][0].model_dump(exclude={"related_members", "expires_at"}), \
        "retention proposal completa byte a byte"

    # ── forma-only (aleatorio stateless): keys y rangos ──
    ao = await orm.get_activity_summary("m-001", 30)
    am = await mem.get_activity_summary("m-001", 30)
    assert sorted(ao.keys()) == sorted(am.keys())
    assert ao["period_days"] == 30 == am["period_days"]
    assert len(ao["activity_heatmap"]) == len(am["activity_heatmap"]) == 49
    so = await orm.get_social_profile("m-001")
    sm = await mem.get_social_profile("m-001")
    assert sorted(so.keys()) == sorted(sm.keys())
    assert 0 <= so["connections_count"] <= 8
    assert 20.0 <= so["social_influence_score"] <= 95.0

    # ── contrato vacío idéntico (backend LIMPIO, sin opt-in) ──
    # (el store persistido es COMPARTIDO por URL — el in-memory
    # vacío vive en su propia instancia: el canon vacío corre sobre
    # un backend recién reseteado, MISMA posición inicial relativa)
    await _reset_backend()
    orm_empty = _repo()  # engine nuevo, sin seed members
    assert await orm_empty.get_member_identity("m-001") is None
    mem_empty = Member360InMemory()
    assert await mem_empty.get_member_identity("m-001") is None
    empty_o = await orm_empty.search_members()
    empty_m = await mem_empty.search_members()
    assert empty_o == empty_m, "contrato vacío idéntico"
    # factors del SEED global VIVEN sin opt-in (MISMO in-memory)
    fo = await orm_empty.get_health_factors("m-001")
    fm = await mem_empty.get_health_factors("m-001")
    assert [f.model_dump() for f in fo] == [f.model_dump() for f in fm]

    # ── restart REAL: canon sigue idéntico tras restart ──
    # (seed=True en el repo nuevo: MISMA posición relativa del
    # in-memory — sembrar de nuevo es idempotente sobre la TABLA
    # persistida; el canon compara CONTRATO, no estado del store)
    orm = await _restart_repo(orm, seed=True)
    o = await orm.search_members(page_size=50)
    m = await mem.search_members(page_size=50)
    assert [canon_preview(x) for x in o["members"]] == \
        [canon_preview(x) for x in m["members"]], "canon tras restart"
