"""Suite de persistencia Ola 2.1-decimonovena — gate del vertical
ml_intelligence (Q-PER-01 CERRADO: 0 repos in-memory):

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family…document_intelligence (Ola
2.1-bis … -decimoctava): restart REAL (engine.dispose() +
engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes
de cada test) · sqlite local / PG real en CI.

Vertical READ-ONLY con UNA tabla de features: los 9 métodos del
repo son análisis (0 escrituras del agente); la tabla
ml_member_features persiste las FEATURES per-member del seed del
in-memory (engagement/ltv/churn_risk/satisfaction/visits/
active_domains) que NO viven en ninguna de las 18 tablas de
dominio — la decisión de diseño de la decimonovena para el canon
byte a byte. Este archivo verifica: seed idempotente tras
restart (20 features del seed) · canon drop-in ORM vs in-memory
con el dataset del MISMO seed (churn avg 17.5 · segments 4/7/7/2
· PSI 5/5 byte a byte · explain 26.9) · agregación compute-on-
read de las series SQL (revenue/satisfaction/guest/teens del
seed sobre tablas) · contrato degradado SIN features ni series
(vacío: MISMA forma del in-memory sin data).

canon: la única pieza aleatoria del vertical es NONE — todo el
pipeline es determinista con random_state=42 en sklearn; el
canon compara TODO byte a byte (el in-memory no tiene random en
ml_intelligence).
"""
from __future__ import annotations

import os
from datetime import date, datetime

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.ml_intelligence_repo import (
    MLIntelligenceRepository as MLRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.ml_intelligence import (
    DomainCoverageStatus,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_ml.db"

pytestmark = pytest.mark.asyncio


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP + CREATE del backend antes de cada test."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def _repo() -> MLRepoORM:
    return MLRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: MLRepoORM) -> MLRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


async def _seed_sources(engine) -> None:
    """Siembra las TABLAS fuente con el dataset del seed (canon).

    MISMO dataset del in-memory (_build_cross_domain_seed) sobre
    las tablas reales: invoices PAGADAS por mes de revenue ·
    events por mes · surveys por mes · guest snapshots ·
    age_group snapshots teens/seniors · notification logs.
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    from club_mcp.db.orm.age_group_orm import (
        AgeGroupMonthlySnapshotORM,
    )
    from club_mcp.db.orm.communication_orm import (
        NotificationLogORM,
    )
    from club_mcp.db.orm.event_orm import EventORM
    from club_mcp.db.orm.finance_orm import FinanceInvoiceORM
    from club_mcp.db.orm.guest_orm import GuestMonthlySnapshotORM
    from club_mcp.db.orm.satisfaction_orm import (
        SatisfactionSurveyORM,
    )
    from club_mcp.db.repositories.ml_intelligence_repo import (
        _build_cross_domain_seed,
    )

    seed = _build_cross_domain_seed()
    session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_maker() as s:
        for month, revenue in seed["revenue_monthly"].items():
            s.add(FinanceInvoiceORM(
                id=f"inv-{month}",
                family_id="fam-001",
                family_name="Familia Chen",
                items=[],
                subtotal=revenue,
                tax=0.0,
                total=revenue,
                status="paid",
                due_date=f"{month}-20",
                paid_date=f"{month}-28",
            ))
        for month, ev in seed["events_monthly"].items():
            for i in range(ev["count"]):
                s.add(EventORM(
                    id=f"ev-{month}-{i}",
                    title=f"Evento {month} {i}",
                    description="",
                    category="social",
                    event_type="social",
                    status="confirmed",
                    date_start=datetime(
                        int(month[:4]), int(month[5:7]), 15, 18
                    ),
                    date_end=datetime(
                        int(month[:4]), int(month[5:7]), 15, 22
                    ),
                    max_capacity=ev["attendance"],
                    pricing_model="free",
                    current_attendance=(
                        ev["attendance"] // ev["count"]
                    ),
                    price_per_person=(
                        ev["revenue"] / max(ev["attendance"], 1)
                    ),
                ))
        for month, sat in seed["satisfaction_monthly"].items():
            for i in range(sat["surveys"]):
                s.add(SatisfactionSurveyORM(
                    survey_id=f"sv-{month}-{i}",
                    event_id="ev-1",
                    family_id=f"fam-{i:03d}",
                    event_type="social",
                    event_name="Evento",
                    event_date=f"{month}-15",
                    questions=[],
                    comment="",
                    ai_assisted_comment="",
                    submitted_at=datetime(
                        int(month[:4]), int(month[5:7]), 20, 12
                    ),
                    overall_score=sat["avg"],
                    sentiment="positive",
                    sentiment_score=0.5,
                ))
        for month, g in seed["guest_monthly"].items():
            s.add(GuestMonthlySnapshotORM(
                month=month,
                new_guests=g["new_guests"],
                check_ins=0,
                trials=g["trials"],
                conversions=g["conversions"],
                events=0,
            ))
        for month, ag in seed["age_group_monthly"].items():
            s.add(AgeGroupMonthlySnapshotORM(
                month=month,
                age_group="teens",
                enrolled=ag["teens_enrolled"],
                satisfaction=0.0,
                new_enrollments=0,
                retention_rate=0.0,
            ))
            s.add(AgeGroupMonthlySnapshotORM(
                month=month,
                age_group="seniors",
                enrolled=ag["seniors_enrolled"],
                satisfaction=0.0,
                new_enrollments=0,
                retention_rate=0.0,
            ))
        for month, c in seed["comms_monthly"].items():
            s.add(NotificationLogORM(
                id=f"log-{month}",
                notification_type="announcement",
                title=f"News {month}",
                channel="email",
                recipient_count=c["sent"],
                status="sent",
                sent_at=f"{month}-20T09:00:00",
                created_by="director",
            ))
        await s.commit()


async def test_seed_idempotente_y_canon_tras_restart() -> None:
    """Seed features + series: canon drop-in byte a byte."""
    await _reset_backend()
    engine = make_engine(_backend_url())
    await _seed_sources(engine)

    repo = _repo()
    n1 = await repo.seed_member_features()
    assert n1 == 20, "20 features del seed tras la 1ª siembra"

    # idempotente: la 2ª siembra es no-op (SELECT por PK)
    n2 = await repo.seed_member_features()
    assert n2 == 20, "re-siembra = no-op por fila"

    # ── canon drop-in vs in-memory (dataset del MISMO seed) ──
    from club_mcp.db.repositories.ml_intelligence_repo import (
        MLIntelligenceRepository as MemRepo,
    )

    mem = MemRepo()

    # churn: heuristic (N=20 < 50) — avg byte a byte
    ch_o = await repo.get_churn_ml_scores()
    ch_m = await mem.get_churn_ml_scores()
    assert ch_o.avg_ml_score == ch_m.avg_ml_score == 17.5
    assert ch_o.total_analyzed == ch_m.total_analyzed == 20
    assert [s.member_id for s in ch_o.scores][:3] == [
        s.member_id for s in ch_m.scores
    ][:3]

    # segments: MISMA distribución 4/7/7/2
    sg_o = await repo.get_member_segments()
    sg_m = await mem.get_member_segments()
    assert [
        (s.display_name, s.member_count) for s in sg_o.segments
    ] == [
        (s.display_name, s.member_count) for s in sg_m.segments
    ]

    # anomaly: MISMOS totales sobre series SQL
    a_o = await repo.get_anomaly_report()
    a_m = await mem.get_anomaly_report()
    assert a_o.total_anomalies == a_m.total_anomalies
    assert a_o.systemic_risk_score == a_m.systemic_risk_score

    # model health: PSI 5/5 byte a byte
    mh_o = await repo.get_model_health()
    mh_m = await mem.get_model_health()
    assert [
        (d.model_name, d.psi_score) for d in mh_o.drift_reports
    ] == [
        (d.model_name, d.psi_score) for d in mh_m.drift_reports
    ]

    # explain: MISMO score byte a byte
    ex_o = await repo.explain_churn_prediction("mem-001")
    ex_m = await mem.explain_churn_prediction("mem-001")
    assert ex_o.predicted_value == ex_m.predicted_value == 26.9

    # ── restart REAL: TODO sobrevive (features + series son tablas) ──
    repo = await _restart_repo(repo)

    ch2 = await repo.get_churn_ml_scores()
    assert ch2.avg_ml_score == 17.5, "canon sobrevive restart"
    sg2 = await repo.get_member_segments()
    assert [
        (s.display_name, s.member_count) for s in sg2.segments
    ] == [
        (s.display_name, s.member_count) for s in sg_m.segments
    ]
    n3 = await repo.seed_member_features()
    assert n3 == 20, "features persistidas (no re-siembra)"
    await engine.dispose()


async def test_agregacion_compute_on_read_de_series() -> None:
    """Series SQL → MISMO dataset del seed (compute-on-read)."""
    await _reset_backend()
    engine = make_engine(_backend_url())
    await _seed_sources(engine)
    repo = _repo()

    from club_mcp.db.orm.repositories.ml_intelligence_repo import (
        _load_cross_domain_data,
    )

    data = await _load_cross_domain_data(repo._engine)
    mem_months = [
        "2026-01", "2026-02", "2026-03",
        "2026-04", "2026-05", "2026-06",
    ]
    assert data["months"] == mem_months, "meses del canon ASC"

    # revenue: invoices PAGADAS sumadas por mes = seed byte a byte
    assert data["revenue_monthly"]["2026-01"] == 48200000
    assert data["revenue_monthly"]["2026-06"] == 52400000

    # satisfaction: avg por mes = seed
    assert data["satisfaction_monthly"]["2026-01"]["avg"] == 4.3
    assert data["satisfaction_monthly"]["2026-05"]["avg"] == 3.6
    assert data["satisfaction_monthly"]["2026-01"]["surveys"] == 8

    # guest: snapshots = shape EXACTO del seed
    assert data["guest_monthly"]["2026-04"]["conversions"] == 0
    assert data["guest_monthly"]["2026-02"]["new_guests"] == 10

    # teens: snapshot por mes
    assert data["age_group_monthly"]["2026-01"][
        "teens_enrolled"
    ] == 18
    assert data["age_group_monthly"]["2026-06"][
        "teens_enrolled"
    ] == 8

    # anomaly vive SOBRE la serie SQL (canon del in-memory)
    a = await repo.get_anomaly_report()
    assert a.total_anomalies == 2
    assert sorted(a.domains_affected) == [
        "finance", "guest_management",
    ]

    # demand forecast sobre series SQL (fallback smoothing sin
    # prophet en CI — dual-path ES el contrato)
    fc = await repo.get_demand_forecast(target="revenue")
    assert fc.model_type in (
        "prophet", "exponential_smoothing"
    )
    assert fc.current_value == 52.4
    assert fc.target.value == "revenue"
    await engine.dispose()


async def test_contrato_vacio_sin_datos() -> None:
    """Tablas VACÍAS: MISMA degradación del in-memory vacío."""
    await _reset_backend()
    repo = _repo()

    # series vacías: months [] · el forecast degrada a [0.0]*h
    from club_mcp.db.orm.repositories.ml_intelligence_repo import (
        _load_cross_domain_data,
    )

    data = await _load_cross_domain_data(repo._engine)
    assert data["months"] == []
    assert data["members"] == []
    assert data["revenue_monthly"] == {}

    # churn: reporte VACÍO (0 members) — MISMA forma
    ch = await repo.get_churn_ml_scores()
    assert ch.total_analyzed == 0
    assert ch.scores == []
    assert ch.top_churn_features  # heuristic global SIEMPRE vive

    # segments: 0 members · MISMA forma
    sg = await repo.get_member_segments()
    assert sg.total_members == 0
    assert sg.segments == []

    # anomaly: 0 sobre series vacías · risk 0
    a = await repo.get_anomaly_report()
    assert a.total_anomalies == 0
    assert a.systemic_risk_score == 0

    # explain: not found MISMO literal
    ex = await repo.explain_churn_prediction("nope")
    assert "not found" in ex.limitations[0]

    # chat context: MISMA forma con counts 0
    cc = await repo.build_chat_context()
    assert cc.member_count == 0
    assert cc.current_month == "2026-06"

    # data quality: coverage seed VIVE (metadato) — MISMA forma
    dq = await repo.get_data_quality_report()
    assert dq.total_domains == 13
    assert dq.overall_status in DomainCoverageStatus


async def test_features_via_members360_proxy() -> None:
    """Sin ml_member_features: proxies por-tier de members_360.

    El loader cae a members_360 cuando la tabla de features está
    vacía — MISMA forma, MISMA matemática (canon de forma).
    """
    await _reset_backend()
    engine = make_engine(_backend_url())
    await _seed_sources(engine)

    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker

    from club_mcp.db.orm.member360_orm import Member360MemberORM

    session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_maker() as s:
        for i in range(8):
            s.add(Member360MemberORM(
                member_id=f"m2-{i:03d}",
                first_name="Ana",
                last_name=f"Vargas{i}",
                email="",
                tier="platino" if i % 2 else "bronce",
                role="member",
                family_id="fam-001",
                family_name="Familia",
                join_date=date(2025, 1, 15),
                age=None,
                age_group=None,
            ))
        await s.commit()

    repo = _repo()
    from club_mcp.db.orm.repositories.ml_intelligence_repo import (
        _load_cross_domain_data,
    )

    data = await _load_cross_domain_data(repo._engine)
    assert len(data["members"]) == 8
    # proxies por-tier deterministas: platino low · bronce high
    tiers = {m["tier"]: m["churn_risk"] for m in data["members"]}
    assert tiers == {"platino": "low", "bronce": "high"}
    # churn corre sobre los 8 (heuristic) — MISMA forma
    ch = await repo.get_churn_ml_scores()
    assert ch.total_analyzed == 8
    # segments sobre 8 (rules) — MISMA forma
    sg = await repo.get_member_segments()
    assert sg.total_members == 8
    await engine.dispose()
