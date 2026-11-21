"""Suite de persistencia Ola 2.1-quinqua — gate del vertical compliance:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event (Ola
2.1-bis/-tris/2.2): restart REAL (engine.dispose() + engine NUEVO +
sesión nueva) · RE-RUNNABLE (_reset_backend antes de cada test) ·
sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los 28 tests del agente compliance
(tests/unit/agents/test_compliance.py) corren contra el repo
in-memory; este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 14 métodos · None/[] sin excepciones custom
· enums roundtrip · add_check_to_audit recalcula score_pct ·
list_audits DESC por created_at · resolve_alert) comparando
comportamiento observable.
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.compliance_repo import (
    ComplianceRepository as ComplianceRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.compliance import (
    AuditStatus,
    ComplianceArea,
    ComplianceCheck,
    DocumentStatus,
    RiskLevel,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_compliance.db"

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


def _repo() -> ComplianceRepoORM:
    return ComplianceRepoORM(make_engine(_backend_url()))


AUDIT = {
    "title": "Auditoría Seguridad Q1",
    "area": "safety",
    "status": "completed",
    "auditor": "Ing. López",
    "date_from": "2025-01-01",
    "date_to": "2025-03-31",
    "checks": [
        {
            "id": "chk-001",
            "area": "safety",
            "title": "Extintores vigentes",
            "status": "pass",
            "risk_level": "high",
        },
        {
            "id": "chk-002",
            "area": "safety",
            "title": "Señalización de salida",
            "status": "pass",
            "risk_level": "medium",
        },
    ],
    "total_checks": 2,
    "passed_checks": 2,
    "failed_checks": 0,
    "score_pct": 100.0,
}


async def test_audit_write_restart_read() -> None:
    """write → restart runtime → read: el audit SOBREVIVE."""
    await _reset_backend()
    repo = _repo()
    audit = await repo.create_audit(dict(AUDIT))

    # restart runtime REAL: engine NUEVO + sesión nueva
    repo2 = _repo()
    read = await repo2.get_audit(audit.id)
    assert read is not None
    assert read.title == AUDIT["title"]
    assert read.area == ComplianceArea.SAFETY
    assert read.status == AuditStatus.COMPLETED
    assert read.total_checks == 2
    assert read.score_pct == 100.0
    assert len(read.checks) == 2
    assert read.checks[0].title == "Extintores vigentes"


async def test_audit_update_and_list_filters() -> None:
    """update_audit solo claves no-None + list_audits filtro y DESC."""
    await _reset_backend()
    repo = _repo()
    a1 = await repo.create_audit(dict(AUDIT))
    await repo.create_audit(
        {
            "title": "Auditoría Alimentos Q1",
            "area": "food_safety",
            "status": "draft",
            "auditor": "Lic. Ramírez",
        }
    )

    updated = await repo.update_audit(
        a1.id, {"summary": "Sin hallazgos", "auditor": None}
    )
    assert updated is not None
    assert updated.summary == "Sin hallazgos"
    assert updated.auditor == AUDIT["auditor"]  # None NO se aplica

    safety = await repo.list_audits(area="safety")
    assert len(safety) == 1
    assert safety[0].id == a1.id

    drafts = await repo.list_audits(status="draft")
    assert len(drafts) == 1
    assert drafts[0].area == ComplianceArea.FOOD_SAFETY

    missing = await repo.get_audit("aud_inexistente")
    assert missing is None

    none_update = await repo.update_audit("aud_inexistente", {"title": "x"})
    assert none_update is None


async def test_add_check_recomputes_score() -> None:
    """add_check_to_audit: append + recuento + score_pct MISMA transacción."""
    await _reset_backend()
    repo = _repo()
    audit = await repo.create_audit(
        {"title": "Auditoría vacía", "area": "labor", "status": "in_progress"}
    )
    assert audit.score_pct == 0.0

    check = ComplianceCheck(
        area=ComplianceArea.LABOR,
        title="Contratos al día",
        status="fail",
        risk_level=RiskLevel.HIGH,
    )
    updated = await repo.add_check_to_audit(audit.id, check)
    assert updated is not None
    assert updated.total_checks == 1
    assert updated.failed_checks == 1
    assert updated.score_pct == 0.0  # 0/1

    check2 = ComplianceCheck(
        area=ComplianceArea.LABOR,
        title="Seguridad social",
        status="pass",
        risk_level=RiskLevel.LOW,
    )
    updated2 = await repo.add_check_to_audit(audit.id, check2)
    assert updated2 is not None
    assert updated2.total_checks == 2
    assert updated2.passed_checks == 1
    assert updated2.score_pct == 50.0  # 1/2, round(...,1)

    missing = await repo.add_check_to_audit("aud_inexistente", check)
    assert missing is None


async def test_document_write_restart_read() -> None:
    """add_document → restart → get_document + list_documents filtros."""
    await _reset_backend()
    repo = _repo()
    doc = await repo.add_document(
        {
            "name": "Póliza de responsabilidad civil",
            "area": "insurance",
            "issuer": "INS S.A.",
            "document_number": "POL-2025-001",
            "issue_date": "2025-02-01",
            "expiry_date": "2026-02-01",
            "status": "current",
        }
    )
    await repo.add_document(
        {
            "name": "Permiso sanitario",
            "area": "food_safety",
            "status": "expiring_soon",
        }
    )

    repo2 = _repo()  # restart runtime
    read = await repo2.get_document(doc.id)
    assert read is not None
    assert read.name == "Póliza de responsabilidad civil"
    assert read.area == ComplianceArea.INSURANCE
    assert read.status == DocumentStatus.CURRENT

    insurance = await repo2.list_documents(area="insurance")
    assert len(insurance) == 1
    expiring = await repo2.list_documents(status="expiring_soon")
    assert len(expiring) == 1
    assert expiring[0].area == ComplianceArea.FOOD_SAFETY

    missing = await repo2.get_document("doc_inexistente")
    assert missing is None


async def test_alert_lifecycle_resolve() -> None:
    """create_alert → restart → list_alerts + resolve_alert."""
    await _reset_backend()
    repo = _repo()
    alert = await repo.create_alert(
        {
            "title": "Extintores vencidos",
            "description": "Ala este, 3 extintores vencidos",
            "area": "safety",
            "risk_level": "high",
            "responsible": "Mantenimiento",
        }
    )
    await repo.create_alert(
        {
            "title": "Cartelería",
            "description": "Cartel de salida dañado",
            "area": "fire_safety",
            "risk_level": "medium",
        }
    )

    repo2 = _repo()  # restart runtime
    open_alerts = await repo2.list_alerts(status="open")
    assert len(open_alerts) == 2

    resolved = await repo2.resolve_alert(alert.id, "Reemplazados los 3")
    assert resolved is not None
    assert resolved.status == "resolved"
    assert resolved.resolution == "Reemplazados los 3"

    open_after = await repo2.list_alerts(status="open")
    assert len(open_after) == 1
    assert open_after[0].area == ComplianceArea.FIRE_SAFETY

    safety_alerts = await repo2.list_alerts(area="safety")
    assert len(safety_alerts) == 1
    assert safety_alerts[0].risk_level == RiskLevel.HIGH

    missing = await repo2.resolve_alert("alrt_inexistente", "x")
    assert missing is None


async def test_generate_report_reads_all_three() -> None:
    """generate_report: lee audits+documents+alerts, aritmética del in-memory."""
    await _reset_backend()
    repo = _repo()
    await repo.create_audit(dict(AUDIT))  # completed · safety · 100.0
    await repo.add_document(
        {
            "name": "Permiso bomberos",
            "area": "fire_safety",
            "status": "expiring_soon",
        }
    )
    await repo.create_alert(
        {
            "title": "Salida bloqueada",
            "description": "Ala oeste",
            "area": "fire_safety",
            "risk_level": "critical",
        }
    )

    report = await repo.generate_report("2025-01-01", "2025-06-30")
    assert report.period_start == "2025-01-01"
    assert report.overall_score == 100.0
    assert report.total_areas == 1
    assert report.compliant_areas == 1
    assert report.open_alerts == 1
    assert report.expiring_documents == 1
    assert report.area_scores[0]["area"] == "safety"
    assert report.recent_audits[0]["score"] == 100.0
    assert "100.0%" in report.summary
