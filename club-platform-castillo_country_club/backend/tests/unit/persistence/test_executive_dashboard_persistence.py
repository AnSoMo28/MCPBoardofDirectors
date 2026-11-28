"""Suite de persistencia Ola 2.1-décima — gate del vertical
executive_dashboard:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction/communication/cultural_social (Ola 2.1-bis/-tris/2.2/
-quinqua/-sexta/-septima/-octava/-nona): restart REAL (engine.dispose()
+ engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes de
cada test) · sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente executive_dashboard
(tests/unit/agents/test_executive_dashboard_agent.py, 47 tests) corren
contra el repo in-memory async; este archivo verifica que el repo ORM
async cumple el mismo contrato (mismos 15 métodos · None/[] sin
excepciones custom · KPIs JSONB roundtrip · enums roundtrip · updates
parciales dict · overwrite por id de anomalías duplicables · keying
por PERIOD del risk matrix · contados derivados compute-on-read ·
clear_anomalies devuelve el count antes de borrar).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.executive_dashboard_repo import (
    ExecutiveDashboardRepository as ExecutiveDashboardRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.executive_dashboard import (
    Anomaly,
    AnomalyDomain,
    AnomalySeverity,
    CreateBoardReport,
    CreateRiskMatrix,
    DashboardPeriod,
    ExecutiveSummary,
    ExportFormat,
    MembershipKPI,
    ReportAudience,
    ReportQuarter,
    RiskItem,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_executive_dashboard.db"

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


def _repo() -> ExecutiveDashboardRepoORM:
    return ExecutiveDashboardRepoORM(make_engine(_backend_url()))


async def _restart_repo(
    repo: ExecutiveDashboardRepoORM,
) -> ExecutiveDashboardRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


# ── test 1 · summary + anomalies: JSONB KPIs · overwrite por id ──


async def test_summary_anomalies_restart() -> None:
    """write → restart → read: KPIs JSONB roundtrip + overwrite id dup."""
    await _reset_backend()
    repo = _repo()

    # summary con id PROPIO del agente (timestamp strftime)
    summary = ExecutiveSummary(
        id="20261120120000",
        period=DashboardPeriod.CURRENT_QUARTER,
        date_from="2026-09-01",
        date_to="2026-11-30",
        membership=MembershipKPI(total_families=1247, total_members=3891),
        trends={"membership_growth": "improving"},
    )
    saved = await repo.save_summary(summary)
    assert saved.id == "20261120120000"
    assert saved.membership.total_families == 1247
    assert saved.trends == {"membership_growth": "improving"}

    # anomalía con id DUPLICABLE entre runs (anom_<domain>_001):
    # el dict in-memory hacía overwrite de la clave
    a1 = Anomaly(
        id="anom_membership_001",
        domain=AnomalyDomain.MEMBERSHIP,
        severity=AnomalySeverity.MEDIUM,
        title="Segmento básico con churn elevado",
        description="Tasa de cancelación 2.3x sobre el promedio trimestral",
        context={"churn_rate_basic": 4.1, "members_affected": 23},
    )
    await repo.save_anomaly(a1)
    a1b = Anomaly(
        id="anom_membership_001",
        domain=AnomalyDomain.MEMBERSHIP,
        severity=AnomalySeverity.HIGH,
        title="Título actualizado",
        description="Descripción actualizada del overwrite",
        context={"churn_rate_basic": 5.0},
    )
    await repo.save_anomaly(a1b)  # overwrite por id
    a2 = Anomaly(
        id="anom_financial_001",
        domain=AnomalyDomain.FINANCIAL,
        severity=AnomalySeverity.HIGH,
        title="Sobrecosto en F&B",
        description="Gastos de F&B sobre presupuesto en 18%",
        context={"budget_pct_used": 118.0},
    )
    await repo.save_anomaly(a2)

    # filtros dobles del contrato (domain + severity, igualdad)
    highs = await repo.list_anomalies(severity="high")
    assert len(highs) == 2
    only_fin = await repo.list_anomalies(domain="financial")
    assert len(only_fin) == 1 and only_fin[0].id == "anom_financial_001"
    assert (
        await repo.list_anomalies(domain="nonexistent") == []
    )  # contrato vacío

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_summary("20261120120000")
    assert got is not None
    assert got.period == DashboardPeriod.CURRENT_QUARTER  # enum roundtrip
    assert got.membership.total_members == 3891  # KPI JSONB roundtrip
    assert got.trends == {"membership_growth": "improving"}
    assert await repo.get_summary("no-existe") is None

    # el overwrite PERSISTIÓ: 2 anomalías, membership quedó en HIGH
    anomalies = await repo.list_anomalies()
    assert len(anomalies) == 2
    memb = next(
        a for a in anomalies if a.id == "anom_membership_001"
    )
    assert memb.severity == AnomalySeverity.HIGH
    assert memb.title == "Título actualizado"
    assert memb.context == {"churn_rate_basic": 5.0}

    # list_summaries con filtro de período (igualdad)
    summaries = await repo.list_summaries(period="current_quarter")
    assert len(summaries) == 1 and summaries[0].id == "20261120120000"
    assert await repo.list_summaries(period="last_year") == []

    # clear_anomalies: devuelve el count ANTES de borrar
    assert await repo.clear_anomalies() == 2
    assert await repo.list_anomalies() == []
    assert await repo.clear_anomalies() == 0  # ya vacío


# ── test 2 · board reports: create/get/update + filtros ──────


async def test_board_reports_restart() -> None:
    """write → restart → read: create gen-id · update dict · filtros."""
    await _reset_backend()
    repo = _repo()

    r1 = await repo.create_board_report(
        CreateBoardReport(
            year=2026,
            quarter=ReportQuarter.Q4,
            executive_summary="Cierre de año sólido",
            strategic_recommendations=["Expandir wellness", "Renovar spa"],
            risk_assessment=["Churn del segmento basic"],
        )
    )
    assert r1.status == "draft"  # default del create
    assert r1.created_at != "" and r1.updated_at == r1.created_at
    assert r1.strategic_recommendations == [
        "Expandir wellness",
        "Renovar spa",
    ]  # JSONB roundtrip
    # r2: segundo reporte Q3 (el filtro de year=2026 espera 2)
    _ = await repo.create_board_report(
        CreateBoardReport(year=2026, quarter=ReportQuarter.Q3)
    )

    # update dict parcial: record.update del in-memory
    upd = await repo.update_board_report(
        r1.id,
        {"status": "final", "outlook": "2027 expansivo", "desconocida": 1},
    )
    assert upd is not None
    assert upd.status == "final"
    assert upd.outlook == "2027 expansivo"
    assert upd.executive_summary == "Cierre de año sólido"  # intocable persiste
    assert upd.updated_at >= r1.updated_at  # updated_at = now
    assert (
        await repo.update_board_report("no-existe", {"status": "x"}) is None
    )

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_board_report(r1.id)
    assert got is not None
    assert got.quarter == ReportQuarter.Q4  # enum roundtrip
    assert got.status == "final"  # el update persistió
    assert got.risk_assessment == ["Churn del segmento basic"]
    assert await repo.get_board_report("no-existe") is None

    # filtros dobles (year int + quarter str, igualdad)
    q4 = await repo.list_board_reports(year=2026, quarter="Q4")
    assert [r.id for r in q4] == [r1.id]
    year26 = await repo.list_board_reports(year=2026)
    assert len(year26) == 2  # orden de inserción
    assert await repo.list_board_reports(year=2025) == []


# ── test 3 · risk matrix: keying por PERIOD + compute-on-read ──


async def test_risk_matrix_restart() -> None:
    """write → restart → read: PERIOD pk · overwrite completo · derive."""
    await _reset_backend()
    repo = _repo()

    items_a = [
        RiskItem(
            id="r1",
            title="Churn basic",
            level="critical",
            probability=3,
            impact=4,
        ),
        RiskItem(
            id="r2",
            title="Sobrecosto F&B",
            level="high",
            probability=2,
            impact=3,
        ),
    ]
    m1 = await repo.create_risk_matrix(
        CreateRiskMatrix(period="2026-Q4", items=items_a)
    )
    # contados derivados COMPUTE-ON-READ (nunca stale)
    assert m1.total_risks == 2
    assert m1.critical == 1 and m1.high == 1 and m1.medium == 0 and m1.low == 0

    # items B para el overwrite por período
    items_b = [
        RiskItem(
            id="r1",
            title="Churn basic (revisado)",
            level="medium",
            probability=2,
            impact=2,
        ),
        RiskItem(
            id="r3",
            title="NPS a la baja",
            level="low",
            probability=1,
            impact=2,
        ),
    ]
    m2 = await repo.create_risk_matrix(
        CreateRiskMatrix(period="2026-Q4", items=items_b)
    )
    # el in-memory REEMPLAZA el dict completo por período
    assert m2.total_risks == 2
    assert m2.critical == 0 and m2.medium == 1 and m2.low == 1

    # restart REAL
    repo = await _restart_repo(repo)

    got = await repo.get_risk_matrix("2026-Q4")
    assert got is not None
    assert got.total_risks == 2  # derive recalculado al leer
    assert got.critical == 0 and got.medium == 1 and got.low == 1
    assert got.items[0].title == "Churn basic (revisado)"
    assert await repo.get_risk_matrix("no-existe") is None

    # update_risk_matrix: items mixtos (dict + RiskItem) → dicts planos
    upd = await repo.update_risk_matrix(
        "2026-Q4",
        [
            {
                "id": "r9",
                "title": "Nuevo riesgo dict",
                "level": "critical",
            },
            RiskItem(
                id="r10",
                title="Nuevo riesgo modelo",
                level="low",
            ),
        ],
    )
    assert upd is not None
    assert upd.total_risks == 2 and upd.critical == 1 and upd.low == 1
    assert (
        await repo.update_risk_matrix("no-existe", items_b) is None
    )

    # el update persistió tras restart
    repo = await _restart_repo(repo)
    got2 = await repo.get_risk_matrix("2026-Q4")
    assert got2 is not None
    assert got2.critical == 1
    assert got2.items[0].id == "r9"


# ── test 4 · exports: create con file_path + filtro ──────────


async def test_exports_restart() -> None:
    """write → restart → read: gen-id · file_path · filtro report_type."""
    await _reset_backend()
    repo = _repo()

    e1 = await repo.create_export(
        "board_report", ExportFormat.PDF, ReportAudience.BOARD
    )
    assert e1.status == "completed"  # default del create
    assert e1.export_format == ExportFormat.PDF  # enum roundtrip
    assert e1.audience == ReportAudience.BOARD
    assert e1.file_path == f"/exports/board_report_{e1.id}.pdf"
    assert e1.created_at != ""

    e2 = await repo.create_export(
        "kpi_summary", ExportFormat.EXCEL
    )  # audience default INTERNAL
    assert e2.audience == ReportAudience.INTERNAL

    # restart REAL
    repo = await _restart_repo(repo)

    board = await repo.list_exports(report_type="board_report")
    assert len(board) == 1 and board[0].id == e1.id
    assert board[0].file_path == f"/exports/board_report_{e1.id}.pdf"
    assert board[0].audience == ReportAudience.BOARD
    all_exports = await repo.list_exports()
    assert len(all_exports) == 2  # orden de inserción
    assert await repo.list_exports(report_type="nonexistent") == []  # vacío
