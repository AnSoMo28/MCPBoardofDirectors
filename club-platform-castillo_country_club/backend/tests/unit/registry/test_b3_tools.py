"""
B3 tools — registry adapter layer + the 8 new read tools.

Covers:
  * AliasAdapter: param_map + adapt_response (families.get_family)
  * executive_dashboard.get_risk_matrix (create-on-demand + persistence)
  * facility_management.get_facility (composite detail contract)
  * guest_management.get_today_guests / get_today_summary
  * finance.finance_transactions_list / finance_invoices_list
  * satisfaction.survey_results / active_survey
"""

from __future__ import annotations

import asyncio

import pytest

from club_mcp.agents.executive_dashboard_agent import (
    ExecutiveDashboardAgent,
)
from club_mcp.agents.facility_management_agent import (
    FacilityManagementAgent,
)
from club_mcp.agents.finance import FinanceAgent
from club_mcp.agents.guest_management_agent import GuestManagementAgent
from club_mcp.agents.satisfaction_agent import SatisfactionAgent
from club_mcp.db.repositories.facility_management_repo import (
    FacilityManagementRepository,
)
from club_mcp.db.repositories.finance_repo import FinanceRepository
from club_mcp.db.repositories.family_repo import FamilyRepository
from club_mcp.db.repositories.guest_management_repo import (
    GuestManagementRepository,
)
from club_mcp.db.repositories.satisfaction_repo import (
    SatisfactionRepository,
)
from club_mcp.models.finance import InvoiceCreate
from club_mcp.models.satisfaction import (
    SatisfactionCategory,
    SatisfactionSurvey,
    SurveyQuestion,
)
from club_mcp.registry import AgentRegistry, AliasAdapter


def _run(coro):
    return asyncio.run(coro)


# ── AliasAdapter ───────────────────────────────────────────

class TestAliasAdapter:
    def test_families_get_family_maps_params_and_shape(self):
        # full runtime: family_profile (the adapter target) must be present
        from club_mcp.bootstrap import get_runtime

        registry = get_runtime().registry
        r = registry.resolve("families", "get_family")
        assert r.spec.agent == "family_profile"
        assert r.spec.name == "family_get_profile"
        assert r.via_compat
        assert isinstance(r.adapter, AliasAdapter)
        # camelCase param → canonical snake_case
        assert r.map_params({"familyId": "x"}) == {"family_id": "x"}
        # response adapter: snake → camel contract
        raw = {
            "status": "success",
            "family": {
                "id": "f1",
                "name": "Chen",
                "engagement_score": 72,
                "member_count": 4,
                "status": "active",
                "members": [{"id": "m1", "name": "Ana"}],
            },
            "message": "Perfil",
        }
        out = r.adapt_result(raw)
        fam = out["family"]
        assert fam["familyName"] == "Chen"
        assert fam["engagementScore"] == 72
        assert fam["memberCount"] == 4
        assert out["adapter_note"].startswith("families.get_family")

    def test_plain_alias_has_no_adapter(self):
        r = AgentRegistry(agents=[FinanceAgent(
            finance_repo=FinanceRepository(),
            family_repo=FamilyRepository(),
        )]).resolve("finance", "get_family_account")
        assert r.spec.name == "finance_account_status"
        assert r.adapter is None
        assert r.map_params({"family_id": "x"}) == {"family_id": "x"}


# ── executive_dashboard.get_risk_matrix ─────────────────────

class TestGetRiskMatrix:
    def test_invalid_period_rejected(self):
        agent = ExecutiveDashboardAgent()
        out = _run(agent.get_risk_matrix("2026-Q5"))
        assert out["status"] == "error"

    def test_create_on_demand_then_persisted(self):
        agent = ExecutiveDashboardAgent()
        first = _run(agent.get_risk_matrix("2026-Q4"))
        assert first["status"] == "success"
        assert first["total_risks"] == len(first["items"]) > 0
        second = _run(agent.get_risk_matrix("2026-Q4"))
        assert second["items"] == first["items"]  # persistence: same matrix
        assert second["total_risks"] == first["total_risks"]

    def test_grid_and_levels_are_valid(self):
        agent = ExecutiveDashboardAgent()
        out = _run(agent.get_risk_matrix("2026-Q1"))
        counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for item in out["items"]:
            assert 1 <= item["probability"] <= 4
            assert 1 <= item["impact"] <= 4
            assert item["score"] == item["probability"] * item["impact"]
            counts[item["level"]] += 1
        assert out["critical"] == counts["critical"]
        assert out["total_risks"] == sum(counts.values())


# ── facility_management.get_facility ───────────────────────

class TestGetFacility:
    def test_requires_facility_id(self):
        agent = FacilityManagementAgent(
            repo=FacilityManagementRepository(seed_demo_data=True)
        )
        assert _run(agent.get_facility(""))["status"] == "error"

    def test_unknown_facility_not_found(self):
        agent = FacilityManagementAgent(
            repo=FacilityManagementRepository(seed_demo_data=True)
        )
        assert _run(agent.get_facility("fac-999"))["status"] == "not_found"

    def test_detail_contract(self):
        agent = FacilityManagementAgent(
            repo=FacilityManagementRepository(seed_demo_data=True)
        )
        out = _run(agent.get_facility("fac-001"))
        assert out["status"] == "success"
        for key in ("facility", "upcoming_reservations",
                    "utilization_history", "maintenance_log"):
            assert key in out
        for point in out["utilization_history"]:
            assert set(point) == {"date", "utilization"}


# ── guest_management.get_today_* ──────────────────────────

class TestTodayGuests:
    def _agent(self):
        return GuestManagementAgent(
            repo=GuestManagementRepository(seed_demo_data=True)
        )

    def test_invalid_status_rejected(self):
        assert _run(self._agent().get_today_guests(status="bogus"))["status"] == "error"

    def test_board_shape(self):
        out = _run(self._agent().get_today_guests())
        assert out["status"] == "success"
        assert out["total"] == len(out["checkins"])
        assert out["total_count"] == out["total"]
        for c in out["checkins"]:
            assert c["status"] in ("active", "departed", "no_show")
            assert c["guest_name"]
        # counts are consistent with the filtered list
        active = sum(1 for c in out["checkins"] if c["status"] == "active")
        assert out["active_count"] == active

    def test_summary_shape(self):
        out = _run(self._agent().get_today_summary())
        assert out["status"] == "success"
        assert out["currently_present"] == out["checked_in"] - out["departed"]
        assert sum(f["count"] for f in out["by_facility"]) == out["total_expected"]
        assert sum(p["count"] for p in out["by_purpose"]) == out["total_expected"]

    def test_status_filter(self):
        out = _run(self._agent().get_today_guests(status="no_show"))
        assert all(c["status"] == "no_show" for c in out["checkins"])


# ── finance.finance_transactions_list / finance_invoices_list ──

class TestFinanceLedger:
    def _agent(self):
        return FinanceAgent(
            finance_repo=FinanceRepository(),
            family_repo=FamilyRepository(),
        )

    def _seed_invoice(self, agent, family_id="fam-001"):
        return agent.repo.create_invoice(
            InvoiceCreate(
                family_id=family_id,
                items=[
                    {
                        "description": "Cuota mensual",
                        "quantity": 1,
                        "unit_price": 150.0,
                    }
                ],
                due_date="2026-12-01",
                tax_rate=13.0,
            ),
            family_name="Familia Chen",
        )

    def test_transactions_require_family(self):
        assert _run(self._agent().finance_transactions_list(family_id=""))["status"] == "error"

    def test_transactions_pagination(self):
        agent = self._agent()
        self._seed_invoice(agent)
        out = _run(
            agent.finance_transactions_list(family_id="fam-001", page=1, page_size=1)
        )
        assert out["status"] == "success"
        assert out["total"] >= 1
        assert out["total_pages"] == out["total"]
        assert len(out["transactions"]) == 1
        assert out["transactions"][0]["type"] == "charge"

    def test_transactions_type_filter(self):
        agent = self._agent()
        self._seed_invoice(agent)
        out = _run(
            agent.finance_transactions_list(family_id="fam-001", type="payment")
        )
        assert out["status"] == "success"
        assert all(t["type"] == "payment" for t in out["transactions"])

    def test_invoices_list_shape(self):
        agent = self._agent()
        inv = self._seed_invoice(agent)
        out = _run(agent.finance_invoices_list(family_id="fam-001"))
        assert out["status"] == "success"
        assert out["total"] == len(out["invoices"]) == 1
        row = out["invoices"][0]
        assert row["id"] == inv.id
        assert row["total"] == inv.total
        assert row["status"] == inv.status.value


# ── satisfaction.survey_results / active_survey ─────────────

def _seed_survey(repo, event_id, family_id, score, sentiment, comment):
    survey = SatisfactionSurvey(
        event_id=event_id,
        family_id=family_id,
        event_name="Gala Anual",
        overall_score=score,
        sentiment=sentiment,
        comment=comment,
    )
    survey.questions = [
        SurveyQuestion(
            category=SatisfactionCategory.OVERALL,
            question_text="General",
            rating=round(score),
        )
    ]
    _run(repo.save_survey(survey))


class TestSurveyReads:
    def _agent(self):
        return SatisfactionAgent(repo=SatisfactionRepository())

    def test_results_require_survey_id(self):
        assert _run(self._agent().survey_results(survey_id=""))["status"] == "error"

    def test_results_not_found(self):
        assert _run(self._agent().survey_results(survey_id="nope"))["status"] == "not_found"

    def test_results_shape(self):
        agent = self._agent()
        _seed_survey(agent.repo, "ev-1", "fam-001", 4.6, "positive", "Excelente")
        _seed_survey(agent.repo, "ev-1", "fam-002", 2.5, "negative", "Regular")
        out = _run(agent.survey_results(survey_id="ev-1"))
        assert out["status"] == "success"
        assert out["total_responses"] == 2
        assert out["nps_distribution"]["promoters"] == 1
        assert out["nps_distribution"]["detractors"] == 1
        assert out["sentiment_breakdown"]["positive"] == 1
        assert out["sentiment_breakdown"]["negative"] == 1
        assert out["nps_distribution"]["promoters"] + \
            out["nps_distribution"]["passives"] + \
            out["nps_distribution"]["detractors"] == 2
        assert len(out["question_summaries"]) == 10
        assert len(out["recent_comments"]) == 2
        assert out["avg_nps"] == 0  # 1 promoter - 1 detractor → 0

    def test_active_survey_template_shape(self):
        out = _run(self._agent().active_survey(survey_id=""))
        assert out["status"] == "success"
        assert out["is_active"] is True
        assert len(out["questions"]) == 10
        for q in out["questions"]:
            assert q["type"] == "rating"
            assert q["required"] is True
            assert 1 <= q["order"] <= 10
        orders = [q["order"] for q in out["questions"]]
        assert orders == sorted(orders)

    def test_active_survey_counts_usage(self):
        agent = self._agent()
        _seed_survey(agent.repo, "ev-2", "fam-001", 5.0, "positive", "")
        out = _run(agent.active_survey(survey_id="ev-2"))
        assert out["usage_count"] == 1
        assert out["id"] == "ev-2"
