"""
Tests for ExecutiveDashboardAgent.
"""

from __future__ import annotations

from uuid import UUID

import pytest

from club_mcp.agents.executive_dashboard_agent import (
    ExecutiveDashboardAgent,
)
from club_mcp.db.repositories.executive_dashboard_repo import (
    ExecutiveDashboardRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.executive_dashboard import (
    CreateBoardReport,
    ExportFormat,
    ReportQuarter,
)


# ── Fixtures ───────────────────────────────────────────────

@pytest.fixture
def dashboard_repo():
    return ExecutiveDashboardRepository()


@pytest.fixture
def dashboard_agent(dashboard_repo, approval_engine):
    agent = ExecutiveDashboardAgent(repo=dashboard_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────────

async def _seed_board_report(
    repo: ExecutiveDashboardRepository,
    year: int = 2026,
    quarter: str = "Q1",
):
    data = CreateBoardReport(
        year=year,
        quarter=ReportQuarter(quarter),
        executive_summary=f"Resumen {quarter} {year}",
        membership_analysis="An\u00e1lisis de membres\u00eda.",
        financial_performance="Desempe\u00f1o financiero.",
        operational_excellence="Excelencia operativa.",
        member_satisfaction="Satisfacci\u00f3n alta.",
        strategic_recommendations=["Recomendaci\u00f3n 1"],
        risk_assessment=["Riesgo 1"],
        outlook="Perspectiva positiva.",
    )
    return await repo.create_board_report(data)


# ═══════════════════════════════════════════════════════════
# TEST: GENERATE QUARTERLY BOARD REPORT
# ═══════════════════════════════════════════════════════════


class TestGenerateQuarterlyBoardReport:
    @pytest.mark.asyncio
    async def test_report_pending_approval(self, dashboard_agent):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
            quarter="Q1",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_approve_and_execute_report(
        self, dashboard_agent, approval_engine
    ):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
            quarter="Q2",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado para la junta",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await dashboard_agent.execute_board_report(
            year=2026,
            quarter="Q2",
        )
        assert exec_result["status"] == "success"
        assert exec_result["report"]["year"] == 2026
        assert exec_result["report"]["quarter"] == "Q2"
        assert exec_result["report"]["status"] == "draft"

    @pytest.mark.asyncio
    async def test_reject_report(
        self, dashboard_agent, approval_engine
    ):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
            quarter="Q3",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Datos incompletos",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_report_missing_fields(self, dashboard_agent):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
        )
        assert result["status"] == "error"
        assert "quarter" in result["message"]

    @pytest.mark.asyncio
    async def test_report_invalid_quarter(self, dashboard_agent):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
            quarter="Q5",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_report_has_all_sections(
        self, dashboard_agent, approval_engine
    ):
        result = await dashboard_agent.generate_quarterly_board_report(
            year=2026,
            quarter="Q4",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
        )

        exec_result = await dashboard_agent.execute_board_report(
            year=2026, quarter="Q4",
        )
        report = exec_result["report"]
        assert len(report["executive_summary"]) > 0
        assert len(report["membership_analysis"]) > 0
        assert len(report["financial_performance"]) > 0
        assert len(report["operational_excellence"]) > 0
        assert len(report["member_satisfaction"]) > 0
        assert len(report["strategic_recommendations"]) > 0
        assert len(report["risk_assessment"]) > 0
        assert len(report["outlook"]) > 0


# ═══════════════════════════════════════════════════════════
# TEST: GET EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════


class TestGetExecutiveSummary:
    @pytest.mark.asyncio
    async def test_executive_summary(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary()
        assert result["status"] == "success"
        summary = result["summary"]
        assert summary["membership"]["total_families"] == 1247
        assert summary["financial"]["revenue"] == 4250000.0
        assert summary["operational"]["events_held"] == 45
        assert summary["engagement"]["satisfaction_score"] == 4.2

    @pytest.mark.asyncio
    async def test_summary_trends(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary()
        trends = result["summary"]["trends"]
        assert "membership_growth" in trends
        assert "revenue_trend" in trends
        assert "engagement_trend" in trends

    @pytest.mark.asyncio
    async def test_summary_custom_period(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary(
            period="current_month",
            date_from="2026-05-01",
            date_to="2026-05-31",
        )
        assert result["status"] == "success"
        assert result["summary"]["date_from"] == "2026-05-01"

    @pytest.mark.asyncio
    async def test_summary_invalid_period(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary(
            period="millennium"
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_summary_saved(self, dashboard_agent, dashboard_repo):
        await dashboard_agent.get_executive_summary()
        summaries = await dashboard_repo.list_summaries()
        assert len(summaries) == 1

    @pytest.mark.asyncio
    async def test_summary_by_tier(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary()
        by_tier = result["summary"]["membership"]["by_tier"]
        assert by_tier["basic"] == 561
        assert by_tier["premium"] == 499
        assert by_tier["vip"] == 187

    @pytest.mark.asyncio
    async def test_summary_financial_sources(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary()
        sources = result["summary"]["financial"]["top_revenue_sources"]
        assert len(sources) == 4
        assert sources[0]["source"] == "Membership Dues"

    @pytest.mark.asyncio
    async def test_summary_top_activities(self, dashboard_agent):
        result = await dashboard_agent.get_executive_summary()
        activities = result["summary"]["operational"]["top_activities"]
        assert len(activities) == 4
        assert activities[0]["name"] == "Tennis"


# ═══════════════════════════════════════════════════════════
# TEST: GET FINANCIAL OVERVIEW
# ═══════════════════════════════════════════════════════════


class TestGetFinancialOverview:
    @pytest.mark.asyncio
    async def test_financial_overview(self, dashboard_agent):
        result = await dashboard_agent.get_financial_overview()
        assert result["status"] == "success"
        fin = result["financial"]
        assert fin["revenue"] == 4250000.0
        assert fin["expenses"] == 3180000.0
        assert fin["net_income"] == 1070000.0

    @pytest.mark.asyncio
    async def test_financial_margin(self, dashboard_agent):
        result = await dashboard_agent.get_financial_overview()
        assert "margin_pct" in result
        assert result["margin_pct"] > 0

    @pytest.mark.asyncio
    async def test_financial_collection_rate(self, dashboard_agent):
        result = await dashboard_agent.get_financial_overview()
        fin = result["financial"]
        assert fin["collection_rate_pct"] == 94.0

    @pytest.mark.asyncio
    async def test_financial_budget_variance(self, dashboard_agent):
        result = await dashboard_agent.get_financial_overview()
        fin = result["financial"]
        assert fin["budget_variance_pct"] == 5.3

    @pytest.mark.asyncio
    async def test_financial_revenue_sources(self, dashboard_agent):
        result = await dashboard_agent.get_financial_overview()
        sources = result["financial"]["top_revenue_sources"]
        assert len(sources) == 4
        total = sum(s["amount"] for s in sources)
        assert total > 0


# ═══════════════════════════════════════════════════════════
# TEST: GET MEMBERSHIP HEALTH
# ═══════════════════════════════════════════════════════════


class TestGetMembershipHealth:
    @pytest.mark.asyncio
    async def test_membership_health(self, dashboard_agent):
        result = await dashboard_agent.get_membership_health()
        assert result["status"] == "success"
        mem = result["membership"]
        assert mem["total_families"] == 1247
        assert mem["total_members"] == 3891

    @pytest.mark.asyncio
    async def test_membership_growth(self, dashboard_agent):
        result = await dashboard_agent.get_membership_health()
        mem = result["membership"]
        assert mem["growth_rate_pct"] == 3.2
        assert mem["net_growth"] == 34

    @pytest.mark.asyncio
    async def test_membership_churn_risk(self, dashboard_agent):
        result = await dashboard_agent.get_membership_health()
        mem = result["membership"]
        assert mem["churn_risk_count"] == 23

    @pytest.mark.asyncio
    async def test_membership_tier_pct(self, dashboard_agent):
        result = await dashboard_agent.get_membership_health()
        tier_pct = result["tier_distribution_pct"]
        assert "basic" in tier_pct
        assert "premium" in tier_pct
        assert "vip" in tier_pct
        total = sum(tier_pct.values())
        assert abs(total - 100.0) < 1.0

    @pytest.mark.asyncio
    async def test_membership_engagement(self, dashboard_agent):
        result = await dashboard_agent.get_membership_health()
        mem = result["membership"]
        assert mem["avg_engagement_score"] == 78.5


# ═══════════════════════════════════════════════════════════
# TEST: GET OPERATIONAL PULSE
# ═══════════════════════════════════════════════════════════


class TestGetOperationalPulse:
    @pytest.mark.asyncio
    async def test_operational_pulse(self, dashboard_agent):
        result = await dashboard_agent.get_operational_pulse()
        assert result["status"] == "success"
        ops = result["operational"]
        assert ops["events_held"] == 45
        assert ops["events_upcoming"] == 12

    @pytest.mark.asyncio
    async def test_operational_utilization(self, dashboard_agent):
        result = await dashboard_agent.get_operational_pulse()
        ops = result["operational"]
        assert ops["facility_utilization_pct"] == 72.0

    @pytest.mark.asyncio
    async def test_operational_attendance(self, dashboard_agent):
        result = await dashboard_agent.get_operational_pulse()
        ops = result["operational"]
        assert ops["avg_event_attendance"] == 87.5
        assert ops["attendance_trend"] == "improving"

    @pytest.mark.asyncio
    async def test_operational_maintenance(self, dashboard_agent):
        result = await dashboard_agent.get_operational_pulse()
        ops = result["operational"]
        assert ops["maintenance_pending"] == 5

    @pytest.mark.asyncio
    async def test_operational_activities(self, dashboard_agent):
        result = await dashboard_agent.get_operational_pulse()
        activities = result["operational"]["top_activities"]
        assert len(activities) == 4
        assert activities[0]["name"] == "Tennis"
        assert activities[0]["participation"] == 450

    @pytest.mark.asyncio
    async def test_operational_guests_and_trials(
        self, dashboard_agent
    ):
        result = await dashboard_agent.get_operational_pulse()
        ops = result["operational"]
        assert ops["guest_visits"] == 312
        assert ops["active_trial_memberships"] == 18


# ═══════════════════════════════════════════════════════════
# TEST: DETECT ANOMALIES
# ═══════════════════════════════════════════════════════════


class TestDetectAnomalies:
    @pytest.mark.asyncio
    async def test_detect_all_domains(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies()
        assert result["status"] == "success"
        assert result["total_anomalies"] == 4
        domains = [a["domain"] for a in result["anomalies"]]
        assert "membership" in domains
        assert "financial" in domains
        assert "operational" in domains
        assert "engagement" in domains

    @pytest.mark.asyncio
    async def test_detect_membership_only(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies(
            domain="membership"
        )
        assert result["status"] == "success"
        assert result["total_anomalies"] == 1
        assert result["anomalies"][0]["domain"] == "membership"

    @pytest.mark.asyncio
    async def test_detect_financial_only(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies(
            domain="financial"
        )
        assert result["status"] == "success"
        assert result["anomalies"][0]["severity"] == "high"

    @pytest.mark.asyncio
    async def test_detect_operational(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies(
            domain="operational"
        )
        assert result["status"] == "success"
        assert "piscina" in result["anomalies"][0]["title"].lower()

    @pytest.mark.asyncio
    async def test_detect_engagement(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies(
            domain="engagement"
        )
        assert result["status"] == "success"
        assert "nps" in result["anomalies"][0]["title"].lower()

    @pytest.mark.asyncio
    async def test_anomaly_severity_counts(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies()
        counts = result["severity_counts"]
        assert "medium" in counts
        assert "high" in counts
        assert "low" in counts

    @pytest.mark.asyncio
    async def test_anomaly_has_suggested_action(
        self, dashboard_agent
    ):
        result = await dashboard_agent.detect_anomalies()
        for a in result["anomalies"]:
            assert len(a["suggested_action"]) > 0

    @pytest.mark.asyncio
    async def test_anomaly_has_context(self, dashboard_agent):
        result = await dashboard_agent.detect_anomalies()
        for a in result["anomalies"]:
            assert isinstance(a["context"], dict)
            assert len(a["context"]) > 0


# ═══════════════════════════════════════════════════════════
# TEST: EXPORT REPORT
# ═══════════════════════════════════════════════════════════


class TestExportReport:
    @pytest.mark.asyncio
    async def test_export_internal_pdf(self, dashboard_agent):
        result = await dashboard_agent.export_report(
            report_type="executive_summary",
            export_format="pdf",
            audience="internal",
        )
        assert result["status"] == "success"
        assert result["export"]["export_format"] == "pdf"
        assert ".pdf" in result["export"]["file_path"]

    @pytest.mark.asyncio
    async def test_export_internal_excel(self, dashboard_agent):
        result = await dashboard_agent.export_report(
            report_type="financial_overview",
            export_format="excel",
            audience="internal",
        )
        assert result["status"] == "success"
        assert result["export"]["export_format"] == "excel"

    @pytest.mark.asyncio
    async def test_export_internal_csv(self, dashboard_agent):
        result = await dashboard_agent.export_report(
            report_type="membership_health",
            export_format="csv",
            audience="internal",
        )
        assert result["status"] == "success"
        assert result["export"]["export_format"] == "csv"

    @pytest.mark.asyncio
    async def test_export_external_pending_approval(
        self, dashboard_agent
    ):
        result = await dashboard_agent.export_report(
            report_type="executive_summary",
            export_format="pdf",
            audience="external",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_export_members_pending_approval(
        self, dashboard_agent
    ):
        result = await dashboard_agent.export_report(
            report_type="board_report",
            export_format="pdf",
            audience="members",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_export_missing_report_type(
        self, dashboard_agent
    ):
        result = await dashboard_agent.export_report()
        assert result["status"] == "error"
        assert "report_type" in result["message"]

    @pytest.mark.asyncio
    async def test_export_invalid_format(self, dashboard_agent):
        result = await dashboard_agent.export_report(
            report_type="test",
            export_format="mp3",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_export_invalid_audience(self, dashboard_agent):
        result = await dashboard_agent.export_report(
            report_type="test",
            audience="hackers",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lida" in result["message"]

    @pytest.mark.asyncio
    async def test_export_list(self, dashboard_agent):
        await dashboard_agent.export_report(
            report_type="test", export_format="pdf"
        )
        exports = await dashboard_agent.repo.list_exports()
        assert len(exports) == 1
