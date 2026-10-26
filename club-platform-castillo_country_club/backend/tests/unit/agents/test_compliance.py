"""Tests for ComplianceAgent — 28 tests."""

from __future__ import annotations

import pytest
from uuid import UUID

from club_mcp.agents.compliance import ComplianceAgent
from club_mcp.db.repositories.compliance_repo import ComplianceRepository
from club_mcp.hitl.approval_types import ApprovalStatus


@pytest.fixture
def comp_repo() -> ComplianceRepository:
    return ComplianceRepository()


@pytest.fixture
def comp_agent(
    comp_repo: ComplianceRepository,
    approval_engine,
) -> ComplianceAgent:
    return ComplianceAgent(comp_repo, approval_engine)


def _seed_compliance(repo: ComplianceRepository) -> None:
    """Seed audits, documents, and alerts."""
    # Audit
    repo.create_audit({
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
    })

    repo.create_audit({
        "title": "Auditoría Alimentos Q1",
        "area": "food_safety",
        "status": "completed",
        "checks": [
            {
                "id": "chk-003",
                "area": "food_safety",
                "title": "Temperatura refrigeradores",
                "status": "fail",
                "risk_level": "critical",
            },
        ],
        "total_checks": 1,
        "passed_checks": 0,
        "failed_checks": 1,
        "score_pct": 0.0,
    })

    # Documents
    repo.add_document({
        "name": "Licencia de funcionamiento",
        "area": "licensing",
        "issuer": "Municipio",
        "expiry_date": "2025-12-31",
        "status": "current",
    })
    repo.add_document({
        "name": "Certificado HACCP",
        "area": "food_safety",
        "issuer": "SENASAG",
        "expiry_date": "2025-02-01",
        "status": "expired",
    })

    # Alerts
    repo.create_alert({
        "title": "Temperatura fuera de rango",
        "description": "Refrigerador de cocina a 8°C",
        "area": "food_safety",
        "risk_level": "critical",
        "status": "open",
        "due_date": "2025-02-15",
    })


# ══════════════════════════════════════════════════════════
# Test 1: compliance_audit_create  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestAuditCreate:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, comp_agent):
        res = await comp_agent.compliance_audit_create(
            title="Auditoría Piscinas",
            area="health_hygiene",
            auditor="Dra. Martínez",
        )
        assert res["status"] == "pending_approval"
        assert res["area"] == "health_hygiene"
        assert "request_id" in res

    @pytest.mark.asyncio
    async def test_invalid_area(self, comp_agent):
        res = await comp_agent.compliance_audit_create(
            title="Test", area="security",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_empty_title(self, comp_agent):
        res = await comp_agent.compliance_audit_create(
            title="", area="safety",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_creates_audit(self, comp_agent):
        res = await comp_agent.execute_audit_create({
            "title": "Test Audit", "area": "safety",
        })
        assert res["status"] == "success"
        assert res["data"]["title"] == "Test Audit"

    @pytest.mark.asyncio
    async def test_approval_flow(self, comp_agent):
        res = await comp_agent.compliance_audit_create(
            title="Auditoría Laboral", area="labor",
        )
        req_id = UUID(res["request_id"])
        approved = await comp_agent.approval_engine.approve(req_id, approved_by="admin")
        assert approved.status == ApprovalStatus.APPROVED
        exec_res = await comp_agent.execute_audit_create(approved.params)
        assert exec_res["status"] == "success"


# ══════════════════════════════════════════════════════════
# Test 2: compliance_check_run  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestCheckRun:

    @pytest.fixture
    def audit_id(self, comp_agent) -> str:
        res = comp_agent.repo.create_audit({
            "title": "Test Audit",
            "area": "safety",
            "status": "in_progress",
        })
        return res.id

    @pytest.mark.asyncio
    async def test_add_passing_check(self, comp_agent, audit_id):
        res = await comp_agent.compliance_check_run(
            audit_id=audit_id,
            title="Extintores",
            status="pass",
            area="safety",
        )
        assert res["status"] == "success"
        assert res["check_status"] == "pass"

    @pytest.mark.asyncio
    async def test_add_failing_check(self, comp_agent, audit_id):
        res = await comp_agent.compliance_check_run(
            audit_id=audit_id,
            title="Señalización",
            status="fail",
            area="fire_safety",
            risk_level="high",
            findings="Faltan 3 señales de salida",
        )
        assert res["status"] == "success"
        assert res["check_status"] == "fail"
        assert res["audit_score"] == 0.0

    @pytest.mark.asyncio
    async def test_mixed_checks_score(self, comp_agent, audit_id):
        await comp_agent.compliance_check_run(
            audit_id=audit_id, title="Check 1",
            status="pass", area="safety",
        )
        res = await comp_agent.compliance_check_run(
            audit_id=audit_id, title="Check 2",
            status="fail", area="safety",
        )
        assert res["audit_score"] == 50.0

    @pytest.mark.asyncio
    async def test_nonexistent_audit(self, comp_agent):
        res = await comp_agent.compliance_check_run(
            audit_id="fake", title="Test",
            status="pass", area="safety",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_audit_disappears_before_check_is_added(
        self, comp_agent, monkeypatch,
    ):
        audit = comp_agent.repo.create_audit({
            "title": "Test Audit",
            "area": "safety",
            "status": "in_progress",
        })
        monkeypatch.setattr(
            comp_agent.repo,
            "add_check_to_audit",
            lambda _audit_id, _check: None,
        )

        res = await comp_agent.compliance_check_run(
            audit_id=audit.id,
            title="Extintores",
            status="pass",
            area="safety",
        )

        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_status(self, comp_agent, audit_id):
        res = await comp_agent.compliance_check_run(
            audit_id=audit_id, title="Test",
            status="maybe", area="safety",
        )
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 3: compliance_audit_get  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestAuditGet:

    @pytest.fixture(autouse=True)
    def seed(self, comp_agent):
        _seed_compliance(comp_agent.repo)

    @pytest.mark.asyncio
    async def test_get_existing_audit(self, comp_agent):
        audits = comp_agent.repo.list_audits()
        res = await comp_agent.compliance_audit_get(audits[0].id)
        assert res["status"] == "success"

    @pytest.mark.asyncio
    async def test_nonexistent_audit(self, comp_agent):
        res = await comp_agent.compliance_audit_get("fake-id")
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 4: compliance_document_register  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestDocumentRegister:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, comp_agent):
        res = await comp_agent.compliance_document_register(
            name="Póliza de seguro",
            area="insurance",
            issuer="Aseguradora XYZ",
            expiry_date="2026-01-01",
        )
        assert res["status"] == "pending_approval"
        assert res["document_name"] == "Póliza de seguro"

    @pytest.mark.asyncio
    async def test_invalid_area(self, comp_agent):
        res = await comp_agent.compliance_document_register(
            name="Test", area="unknown",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_registers_document(self, comp_agent):
        res = await comp_agent.execute_document_register({
            "name": "Certificado Bomberos",
            "area": "fire_safety",
            "issuer": "Bomberos Voluntarios",
            "expiry_date": "2027-06-01",
        })
        assert res["status"] == "success"
        assert res["data"]["status"] == "current"

    @pytest.mark.asyncio
    async def test_expired_document_detection(self, comp_agent):
        res = await comp_agent.execute_document_register({
            "name": "Certificado Viejo",
            "area": "licensing",
            "expiry_date": "2020-01-01",
        })
        assert res["data"]["status"] == "expired"


# ══════════════════════════════════════════════════════════
# Test 5: compliance_alert_create  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestAlertCreate:

    @pytest.mark.asyncio
    async def test_create_alert(self, comp_agent):
        res = await comp_agent.compliance_alert_create(
            title="Falta EPP",
            description="Personal sin equipo de protección",
            area="safety",
            risk_level="high",
            responsible="Jefe de Mantenimiento",
        )
        assert res["status"] == "success"
        assert res["data"]["risk_level"] == "high"

    @pytest.mark.asyncio
    async def test_invalid_area(self, comp_agent):
        res = await comp_agent.compliance_alert_create(
            title="Test", description="Test", area="cybersecurity",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_risk_level(self, comp_agent):
        res = await comp_agent.compliance_alert_create(
            title="Test", description="Test",
            area="safety", risk_level="extreme",
        )
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 6: compliance_alert_list  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestAlertList:

    @pytest.fixture(autouse=True)
    def seed(self, comp_agent):
        _seed_compliance(comp_agent.repo)

    @pytest.mark.asyncio
    async def test_list_all_alerts(self, comp_agent):
        res = await comp_agent.compliance_alert_list()
        assert res["status"] == "success"
        assert res["total"] >= 1

    @pytest.mark.asyncio
    async def test_filter_by_area(self, comp_agent):
        res = await comp_agent.compliance_alert_list(area="food_safety")
        assert all(a["area"] == "food_safety" for a in res["data"])

    @pytest.mark.asyncio
    async def test_filter_by_status(self, comp_agent):
        res = await comp_agent.compliance_alert_list(status="open")
        assert all(a["status"] == "open" for a in res["data"])

    @pytest.mark.asyncio
    async def test_invalid_area_filter(self, comp_agent):
        res = await comp_agent.compliance_alert_list(area="bad")
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 7: compliance_report_generate  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestReportGenerate:

    @pytest.fixture(autouse=True)
    def seed(self, comp_agent):
        _seed_compliance(comp_agent.repo)

    @pytest.mark.asyncio
    async def test_generates_report(self, comp_agent):
        res = await comp_agent.compliance_report_generate(
            "2025-01-01", "2025-12-31",
        )
        assert res["status"] == "success"
        assert res["overall_score"] >= 0

    @pytest.mark.asyncio
    async def test_missing_dates(self, comp_agent):
        res = await comp_agent.compliance_report_generate("", "")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_inverted_dates(self, comp_agent):
        res = await comp_agent.compliance_report_generate(
            "2025-12-31", "2025-01-01",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_report_reflects_alerts(self, comp_agent):
        res = await comp_agent.compliance_report_generate(
            "2025-01-01", "2025-12-31",
        )
        assert res["data"]["open_alerts"] >= 1
