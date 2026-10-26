"""Tests for FinanceAgent — 31 tests."""

from __future__ import annotations

from datetime import date
from uuid import UUID

import pytest

from club_mcp.agents.finance import FinanceAgent
from club_mcp.db.repositories.family_repo import FamilyRepository
from club_mcp.db.repositories.finance_repo import FinanceRepository
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.family import FamilyCreate, MembershipTier
from club_mcp.models.finance import FinancialReport
from club_mcp.models.member import MemberCreate, MemberRole


@pytest.fixture
def fin_repo() -> FinanceRepository:
    return FinanceRepository()


@pytest.fixture
def family_repo() -> FamilyRepository:
    return FamilyRepository()


@pytest.fixture
def fin_agent(
    fin_repo: FinanceRepository,
    family_repo: FamilyRepository,
    approval_engine,
) -> FinanceAgent:
    return FinanceAgent(fin_repo, approval_engine, family_repo=family_repo)


def _seed_financials(repo: FinanceRepository) -> None:
    """Seed some expenses and invoices."""
    from club_mcp.models.finance import ExpenseCreate, InvoiceCreate, InvoiceItem

    # Set budgets
    repo.set_budget("maintenance", 50000.0)
    repo.set_budget("food_beverage", 30000.0)
    repo.set_budget("staff", 80000.0)
    repo.set_budget("events", 20000.0)

    # Expenses
    repo.create_expense(ExpenseCreate(
        description="Poda de jardines",
        amount=3500.0,
        category="maintenance",
        vendor="Jardín Express",
        date="2025-01-15",
    ))
    repo.create_expense(ExpenseCreate(
        description="Catering evento",
        amount=8000.0,
        category="food_beverage",
        vendor="Chef Mario",
        date="2025-01-20",
    ))
    repo.create_expense(ExpenseCreate(
        description="Mantenimiento piscina",
        amount=5000.0,
        category="maintenance",
        vendor="Pool Care",
        date="2025-02-10",
    ))

    # Invoice
    repo.create_invoice(
        InvoiceCreate(
            family_id="fam-001",
            items=[
                InvoiceItem(description="Membresía Enero", quantity=1, unit_price=5000),
                InvoiceItem(description="Evento especial", quantity=2, unit_price=1500),
            ],
            tax_rate=16.0,
            due_date="2025-02-01",
        ),
        family_name="Familia García",
    )


# ══════════════════════════════════════════════════════════
# Test 1: finance_expense_create  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestExpenseCreate:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, fin_agent):
        res = await fin_agent.finance_expense_create(
            description="Compra sillas",
            amount=15000.0,
            category="equipment",
        )
        assert res["status"] == "pending_approval"
        assert res["amount"] == 15000.0
        assert "request_id" in res

    @pytest.mark.asyncio
    async def test_invalid_category(self, fin_agent):
        res = await fin_agent.finance_expense_create(
            description="Bad", amount=100, category="lazer",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_zero_amount(self, fin_agent):
        res = await fin_agent.finance_expense_create(
            description="Gratis", amount=0, category="other",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_negative_amount(self, fin_agent):
        res = await fin_agent.finance_expense_create(
            description="Negativo", amount=-100, category="other",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_creates_expense(self, fin_agent):
        res = await fin_agent.execute_expense_create({
            "description": "Poda", "amount": 3000, "category": "maintenance",
        })
        assert res["status"] == "success"
        assert res["data"]["amount"] == 3000

    @pytest.mark.asyncio
    async def test_approval_flow(self, fin_agent):
        res = await fin_agent.finance_expense_create(
            description="Equipo nuevo", amount=25000, category="equipment",
        )
        req_id = UUID(res["request_id"])
        approved = await fin_agent.approval_engine.approve(req_id, approved_by="admin")
        assert approved.status == ApprovalStatus.APPROVED
        exec_res = await fin_agent.execute_expense_create(approved.params)
        assert exec_res["status"] == "success"


# ══════════════════════════════════════════════════════════
# Test 2: finance_invoice_create  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestInvoiceCreate:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, fin_agent):
        res = await fin_agent.finance_invoice_create(
            family_id="fam-001",
            items=[{"description": "Membresía", "quantity": 1, "unit_price": 5000}],
            tax_rate=16.0,
        )
        assert res["status"] == "pending_approval"
        assert res["total"] == 5800.0

    @pytest.mark.asyncio
    async def test_empty_items(self, fin_agent):
        res = await fin_agent.finance_invoice_create(
            family_id="fam-001", items=[],
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_item_data(self, fin_agent):
        res = await fin_agent.finance_invoice_create(
            family_id="fam-001",
            items=[{"bad": "data"}],
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_multiple_items_calculation(self, fin_agent):
        res = await fin_agent.finance_invoice_create(
            family_id="fam-001",
            items=[
                {"description": "Item A", "quantity": 2, "unit_price": 1000},
                {"description": "Item B", "quantity": 1, "unit_price": 3000},
            ],
            tax_rate=10.0,
        )
        assert res["subtotal"] == 5000.0
        assert res["tax"] == 500.0
        assert res["total"] == 5500.0

    @pytest.mark.asyncio
    async def test_execute_creates_invoice(self, fin_agent):
        res = await fin_agent.execute_invoice_create({
            "family_id": "fam-001",
            "items": [{"description": "Test", "quantity": 1, "unit_price": 1000}],
            "tax_rate": 0.0,
        })
        assert res["status"] == "success"
        assert res["data"]["total"] == 1000.0


# ══════════════════════════════════════════════════════════
# Test 3: finance_budget_check  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestBudgetCheck:

    @pytest.fixture(autouse=True)
    def seed(self, fin_agent):
        _seed_financials(fin_agent.repo)

    @pytest.mark.asyncio
    async def test_check_budget(self, fin_agent):
        res = await fin_agent.finance_budget_check()
        assert res["status"] == "success"
        assert res["total_budgeted"] == 180000.0

    @pytest.mark.asyncio
    async def test_budget_reflects_expenses(self, fin_agent):
        res = await fin_agent.finance_budget_check()
        assert res["total_spent"] == 16500.0

    @pytest.mark.asyncio
    async def test_budget_period(self, fin_agent):
        res = await fin_agent.finance_budget_check(period="quarterly")
        assert res["data"]["period"] == "quarterly"

    @pytest.mark.asyncio
    async def test_empty_budget(self):
        repo = FinanceRepository()
        agent = FinanceAgent(repo)
        res = await agent.finance_budget_check()
        assert res["total_budgeted"] == 0.0


# ══════════════════════════════════════════════════════════
# Test 4: finance_payment_process  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestPaymentProcess:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, fin_agent):
        res = await fin_agent.finance_payment_process(
            family_id="fam-001",
            amount=5000,
            method="transfer",
            reference="REF-001",
        )
        assert res["status"] == "pending_approval"
        assert res["amount"] == 5000

    @pytest.mark.asyncio
    async def test_invalid_method(self, fin_agent):
        res = await fin_agent.finance_payment_process(
            family_id="fam-001", amount=1000, method="bitcoin",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_zero_amount(self, fin_agent):
        res = await fin_agent.finance_payment_process(
            family_id="fam-001", amount=0,
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_processes_payment(self, fin_agent):
        res = await fin_agent.execute_payment_process({
            "family_id": "fam-001",
            "amount": 5000,
            "method": "transfer",
        })
        assert res["status"] == "success"
        assert res["data"]["status"] == "paid"


# ══════════════════════════════════════════════════════════
# Test 5: finance_report_generate  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestReportGenerate:

    @pytest.fixture(autouse=True)
    def seed(self, fin_agent):
        _seed_financials(fin_agent.repo)

    @pytest.mark.asyncio
    async def test_generates_report(self, fin_agent):
        res = await fin_agent.finance_report_generate(
            date_from="2025-01-01", date_to="2025-12-31",
        )
        assert res["status"] == "success"
        assert res["data"]["total_expenses"] == 16500.0

    @pytest.mark.asyncio
    async def test_missing_dates(self, fin_agent):
        res = await fin_agent.finance_report_generate()
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_inverted_dates(self, fin_agent):
        res = await fin_agent.finance_report_generate(
            date_from="2025-12-31", date_to="2025-01-01",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_empty_period(self, fin_agent):
        res = await fin_agent.finance_report_generate(
            date_from="2024-01-01", date_to="2024-01-31",
        )
        assert res["data"]["total_expenses"] == 0.0


# ══════════════════════════════════════════════════════════
# Test 6: finance_account_status  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestAccountStatus:

    @pytest.fixture(autouse=True)
    def seed(self, fin_agent):
        _seed_financials(fin_agent.repo)

    @pytest.mark.asyncio
    async def test_family_with_invoice(self, fin_agent):
        res = await fin_agent.finance_account_status("fam-001")
        assert res["status"] == "success"
        assert res["data"]["total_invoiced"] > 0

    @pytest.mark.asyncio
    async def test_family_without_activity(self, fin_agent):
        res = await fin_agent.finance_account_status("fam-999")
        assert res["status"] == "success"

    @pytest.mark.asyncio
    async def test_balance_reflects_payments(self, fin_agent):
        from club_mcp.models.finance import PaymentCreate
        fin_agent.repo.create_payment(PaymentCreate(
            family_id="fam-001", amount=5000, method="transfer",
        ))
        fin_agent.repo.list_payments(family_id="fam-001")
        # Mark as paid manually for test
        p = fin_agent.repo.list_payments(family_id="fam-001")[0]
        fin_agent.repo.update_payment_status(p.id, "paid")

        res = await fin_agent.finance_account_status("fam-001")
        assert res["data"]["total_paid"] == 5000


# ══════════════════════════════════════════════════════════
# Test 7: finance_category_update  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestCategoryUpdate:

    @pytest.mark.asyncio
    async def test_update_budget(self, fin_agent):
        res = await fin_agent.finance_category_update("maintenance", 100000)
        assert res["status"] == "success"
        assert res["budget_amount"] == 100000

    @pytest.mark.asyncio
    async def test_invalid_category(self, fin_agent):
        res = await fin_agent.finance_category_update("vacation", 50000)
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_negative_budget(self, fin_agent):
        res = await fin_agent.finance_category_update("maintenance", -1000)
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_budget_reflected_in_check(self, fin_agent):
        await fin_agent.finance_category_update("events", 50000)
        res = await fin_agent.finance_budget_check()
        events_line = next(
            line for line in res["data"]["lines"]
            if line["category"] == "events"
        )
        assert events_line["budgeted"] == 50000


# ══════════════════════════════════════════════════════════
# Test 8: generate_ai_analysis  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGenerateAiAnalysis:

    @pytest.fixture(autouse=True)
    def seed(self, fin_agent):
        _seed_financials(fin_agent.repo)

    @pytest.mark.asyncio
    async def test_returns_success(self, fin_agent):
        res = await fin_agent.generate_ai_analysis(
            scope="financial", period="current_quarter",
        )
        assert res["status"] == "success"
        assert "data" in res

    @pytest.mark.asyncio
    async def test_has_all_sections(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        data = res["data"]
        assert "health_score" in data
        assert "cash_flow_forecast" in data
        assert "revenue_concentration" in data
        assert "financial_anomalies" in data
        assert "recommendations" in data
        assert "positive_trends" in data
        assert "alert_signals" in data
        assert "projection" in data
        assert "member_economics" in data

    @pytest.mark.asyncio
    async def test_health_score_structure(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        hs = res["data"]["health_score"]
        assert 0 <= hs["total"] <= 100
        assert hs["grade"] in ["A+", "A", "B+", "B", "C+", "C", "D", "F"]
        assert len(hs["factors"]) == 5
        for f in hs["factors"]:
            assert 0 <= f["score"] <= 100
            assert 0 <= f["weight"] <= 1
            assert f["trend"] in ["improving", "stable", "declining"]

    @pytest.mark.asyncio
    async def test_health_score_weights_sum_to_one(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        factors = res["data"]["health_score"]["factors"]
        total_weight = sum(f["weight"] for f in factors)
        assert abs(total_weight - 1.0) < 0.001

    @pytest.mark.asyncio
    async def test_health_score_contribution_math(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        factors = res["data"]["health_score"]["factors"]
        for f in factors:
            expected = round(f["score"] * f["weight"], 1)
            assert abs(f["contribution"] - expected) < 0.15

    @pytest.mark.asyncio
    async def test_cash_flow_forecast_six_periods(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        cf = res["data"]["cash_flow_forecast"]
        assert len(cf["periods"]) == 6
        assert cf["confidence_band_pct"] == 80.0
        assert cf["method"] != ""

    @pytest.mark.asyncio
    async def test_cash_flow_periods_have_bounds(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        for p in res["data"]["cash_flow_forecast"]["periods"]:
            assert p["lower_bound"] <= p["projected_net"]
            assert p["upper_bound"] >= p["projected_net"]
            assert p["label"] != ""

    @pytest.mark.asyncio
    async def test_revenue_concentration_structure(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        rc = res["data"]["revenue_concentration"]
        assert 0 <= rc["diversification_index"] <= 1
        assert rc["entropy"] >= 0
        assert rc["herfindahl_index"] >= 0
        assert rc["risk_assessment"] != ""

    @pytest.mark.asyncio
    async def test_shannon_entropy_math(self, fin_agent):
        """Verify entropy formula: H = -Σ(p_i x log2(p_i))."""
        import math
        res = await fin_agent.generate_ai_analysis()
        rc = res["data"]["revenue_concentration"]
        if rc["sources"]:
            shares = [s["share_pct"] / 100 for s in rc["sources"]]
            expected_h = -sum(p * math.log2(p) for p in shares if p > 0)
            assert abs(rc["entropy"] - round(expected_h, 3)) < 0.01

    @pytest.mark.asyncio
    async def test_hhi_math(self, fin_agent):
        """Verify HHI = Σ(share_pct²)."""
        res = await fin_agent.generate_ai_analysis()
        rc = res["data"]["revenue_concentration"]
        if rc["sources"]:
            expected_hhi = sum(s["share_pct"] ** 2 for s in rc["sources"])
            assert abs(rc["herfindahl_index"] - round(expected_hhi, 0)) < 1

    @pytest.mark.asyncio
    async def test_recommendations_non_empty(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        recs = res["data"]["recommendations"]
        assert len(recs) > 0
        for r in recs:
            assert r["category"] in [
                "cost_reduction", "revenue_growth", "risk_mitigation", "efficiency",
            ]
            assert r["priority"] in ["critical", "high", "medium", "low"]
            assert r["action"] != ""

    @pytest.mark.asyncio
    async def test_recommendations_have_impact(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        recs = res["data"]["recommendations"]
        # All recommendations should have a numeric impact (>= 0)
        for r in recs:
            assert isinstance(r["estimated_impact_annual"], (int, float))
            assert r["estimated_impact_annual"] >= 0

    @pytest.mark.asyncio
    async def test_anomalies_are_list(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        anomalies = res["data"]["financial_anomalies"]
        assert isinstance(anomalies, list)
        for a in anomalies:
            assert a["domain"] in ["revenue", "expense", "collection", "budget"]
            assert a["severity"] in ["critical", "high", "medium", "low"]

    @pytest.mark.asyncio
    async def test_member_economics_structure(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        me = res["data"]["member_economics"]
        assert me["member_count"] == 0
        assert me["avg_revenue_per_member"] >= 0
        assert me["avg_cost_per_member"] >= 0
        assert me["ltv_estimate"] >= 0
        assert me["cac_estimate"] >= 0
        assert me["ltv_cac_ratio"] >= 0

    @pytest.mark.asyncio
    async def test_member_economics_uses_active_member_count(
        self, fin_repo, family_repo,
    ):
        await family_repo.create_family(FamilyCreate(
            name="Familia Unit Economics",
            tier=MembershipTier.PREMIUM,
            email="unit-economics@example.com",
            phone="+50688887799",
            members=[
                MemberCreate(
                    name="Socio Principal",
                    date_of_birth=date(1980, 1, 1),
                    role=MemberRole.PRIMARY,
                    email=None,
                    phone=None,
                    allergies=None,
                    dietary_restrictions=None,
                ),
                MemberCreate(
                    name="Miembro Familiar",
                    date_of_birth=date(2010, 1, 1),
                    role=MemberRole.CHILD,
                    email=None,
                    phone=None,
                    allergies=None,
                    dietary_restrictions=None,
                ),
            ],
        ))
        agent = FinanceAgent(fin_repo, family_repo=family_repo)
        report = FinancialReport(
            report_type="income_expense",
            period_start="2026-01-01",
            period_end="2026-03-31",
            total_income=2000,
            total_expenses=800,
            net_result=1200,
        )

        economics = await agent._calculate_member_economics(report)

        assert economics.member_count == 2
        assert economics.avg_revenue_per_member == 1000
        assert economics.avg_cost_per_member == 400

    @pytest.mark.asyncio
    async def test_member_economics_ltv_gt_cac(self, fin_agent):
        """LTV should be significantly greater than CAC for a viable club."""
        res = await fin_agent.generate_ai_analysis()
        me = res["data"]["member_economics"]
        if me["cac_estimate"] > 0:
            assert me["ltv_cac_ratio"] > 1.0

    @pytest.mark.asyncio
    async def test_projection_structure(self, fin_agent):
        res = await fin_agent.generate_ai_analysis()
        proj = res["data"]["projection"]
        assert proj["method"] != ""
        assert proj["confidence"] != ""
        assert proj["summary"] != ""
        assert isinstance(proj["key_assumptions"], list)
        assert isinstance(proj["risk_factors"], list)
        assert len(proj["risk_factors"]) > 0

    @pytest.mark.asyncio
    async def test_different_periods(self, fin_agent):
        """All period options should return valid responses."""
        for period in [
            "current_month",
            "current_quarter",
            "current_year",
            "last_month",
            "last_quarter",
            "ytd",
        ]:
            res = await fin_agent.generate_ai_analysis(period=period)
            assert res["status"] == "success"
            assert "data" in res

    @pytest.mark.asyncio
    async def test_empty_repo_still_works(self):
        """Agent with no data should return valid structure."""
        repo = FinanceRepository()
        agent = FinanceAgent(repo)
        res = await agent.generate_ai_analysis()
        assert res["status"] == "success"
        hs = res["data"]["health_score"]
        assert 0 <= hs["total"] <= 100
        assert len(hs["factors"]) == 5

    @pytest.mark.asyncio
    async def test_format_currency_utility(self):
        from club_mcp.agents.finance import format_currency
        assert "M" in format_currency(15_000_000)
        assert "K" in format_currency(45_000)
        assert "₡" in format_currency(500)

    @pytest.mark.asyncio
    async def test_health_grade_boundaries(self):
        from club_mcp.agents.finance import FinanceAgent
        agent = FinanceAgent(FinanceRepository())
        assert agent._health_grade(97) == "A+"
        assert agent._health_grade(90) == "A"
        assert agent._health_grade(80) == "B+"
        assert agent._health_grade(70) == "B"
        assert agent._health_grade(60) == "C+"
        assert agent._health_grade(50) == "C"
        assert agent._health_grade(40) == "D"
        assert agent._health_grade(20) == "F"
