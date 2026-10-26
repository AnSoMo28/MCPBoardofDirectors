"""Financial models for the Club MCP platform."""

from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ─────────────────────────────────────────────────


class ExpenseCategory(str, Enum):
    MAINTENANCE = "maintenance"
    FOOD_BEVERAGE = "food_beverage"
    STAFF = "staff"
    EVENTS = "events"
    UTILITIES = "utilities"
    EQUIPMENT = "equipment"
    MARKETING = "marketing"
    INSURANCE = "insurance"
    OTHER = "other"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    PARTIAL = "partial"


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    CHECK = "check"
    OTHER = "other"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class BudgetPeriod(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


# ── Core models ───────────────────────────────────────────


class Expense(BaseModel):
    """A club expense record."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    description: str
    amount: float
    category: ExpenseCategory
    vendor: str = ""
    date: str = ""
    notes: str = ""
    receipt_url: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Invoice(BaseModel):
    """An invoice issued to a family/member."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    family_id: str
    family_name: str = ""
    items: list[InvoiceItem] = Field(default_factory=list)
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    status: InvoiceStatus = InvoiceStatus.DRAFT
    due_date: str = ""
    paid_date: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvoiceItem(BaseModel):
    """A line item in an invoice."""

    model_config = ConfigDict(from_attributes=True)

    description: str
    quantity: int = 1
    unit_price: float = 0.0
    total: float = 0.0


class BudgetLine(BaseModel):
    """Budget line for a category."""

    model_config = ConfigDict(from_attributes=True)

    category: str
    budgeted: float = 0.0
    spent: float = 0.0
    remaining: float = 0.0
    utilization_pct: float = 0.0


class BudgetSummary(BaseModel):
    """Budget summary for a period."""

    model_config = ConfigDict(from_attributes=True)

    period: str
    total_budgeted: float = 0.0
    total_spent: float = 0.0
    total_remaining: float = 0.0
    utilization_pct: float = 0.0
    lines: list[BudgetLine] = Field(default_factory=list)


class Payment(BaseModel):
    """A payment record."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    invoice_id: str = ""
    family_id: str
    family_name: str = ""
    amount: float
    method: PaymentMethod = PaymentMethod.TRANSFER
    status: PaymentStatus = PaymentStatus.PENDING
    reference: str = ""
    date: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AccountStatus(BaseModel):
    """Account status for a family."""

    model_config = ConfigDict(from_attributes=True)

    family_id: str
    family_name: str = ""
    total_invoiced: float = 0.0
    total_paid: float = 0.0
    balance_due: float = 0.0
    overdue_amount: float = 0.0
    overdue_count: int = 0
    last_payment_date: str = ""
    invoices: list[Invoice] = Field(default_factory=list)


class FinancialReport(BaseModel):
    """Generated financial report."""

    model_config = ConfigDict(from_attributes=True)

    report_type: str
    period_start: str
    period_end: str
    total_income: float = 0.0
    total_expenses: float = 0.0
    net_result: float = 0.0
    expense_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    income_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    summary: str = ""


# ── Request / Response ────────────────────────────────────


class ExpenseCreate(BaseModel):
    """Schema for creating an expense."""

    description: str
    amount: float
    category: ExpenseCategory
    vendor: str = ""
    date: str = ""
    notes: str = ""
    receipt_url: str = ""


class InvoiceCreate(BaseModel):
    """Schema for creating an invoice."""

    family_id: str
    items: list[InvoiceItem]
    due_date: str = ""
    notes: str = ""
    tax_rate: float = 0.0


class PaymentCreate(BaseModel):
    """Schema for recording a payment."""

    invoice_id: str = ""
    family_id: str
    amount: float
    method: PaymentMethod = PaymentMethod.TRANSFER
    reference: str = ""
    date: str = ""
    notes: str = ""



# ── AI Financial Analysis Models ──────────────────────────


class HealthScoreFactor(BaseModel):
    """Individual factor in the composite health score."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    score: float = Field(ge=0, le=100, description="Factor score 0-100")
    weight: float = Field(ge=0, le=1, description="Weight in composite score")
    contribution: float = 0.0
    trend: str = Field(default="stable", pattern="^(improving|stable|declining)$")
    detail: str = ""


class HealthScore(BaseModel):
    """Composite financial health score with breakdown."""

    model_config = ConfigDict(from_attributes=True)

    total: float = Field(ge=0, le=100)
    grade: str = "C"
    factors: list[HealthScoreFactor] = Field(default_factory=list)
    trend_vs_previous: float = 0.0


class CashFlowPeriod(BaseModel):
    """Single period in cash flow forecast."""

    model_config = ConfigDict(from_attributes=True)

    label: str
    projected_revenue: float = 0.0
    projected_expenses: float = 0.0
    projected_net: float = 0.0
    cumulative_cash: float = 0.0
    lower_bound: float = 0.0
    upper_bound: float = 0.0


class CashFlowForecast(BaseModel):
    """Cash flow projection with confidence bands."""

    model_config = ConfigDict(from_attributes=True)

    method: str = "linear_regression"
    confidence: str = "medium"
    confidence_band_pct: float = 80.0
    periods: list[CashFlowPeriod] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)


class RevenueSource(BaseModel):
    """Single revenue source with share and trend."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    label: str = ""
    share_pct: float = 0.0
    amount: float = 0.0
    trend: str = Field(default="stable", pattern="^(growing|stable|declining)$")


class RevenueConcentration(BaseModel):
    """Revenue diversification analysis using Shannon entropy and HHI."""

    model_config = ConfigDict(from_attributes=True)

    entropy: float = 0.0
    max_entropy: float = 0.0
    diversification_index: float = 0.0
    herfindahl_index: float = 0.0
    sources: list[RevenueSource] = Field(default_factory=list)
    risk_assessment: str = ""


class FinancialAnomaly(BaseModel):
    """Detected financial anomaly with impact estimation."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: str = Field(pattern="^(revenue|expense|collection|budget)$")
    severity: str = Field(pattern="^(critical|high|medium|low)$")
    title: str
    detail: str
    deviation_pct: float = 0.0
    estimated_annual_impact: float = 0.0
    suggested_action: str = ""


class FinancialRecommendation(BaseModel):
    """Actionable recommendation with quantified impact."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str = Field(
        default="efficiency",
        pattern="^(cost_reduction|revenue_growth|risk_mitigation|efficiency)$",
    )
    action: str
    justification: str
    estimated_impact_annual: float = 0.0
    confidence: str = Field(default="medium", pattern="^(high|medium|low)$")
    priority: str = Field(default="medium", pattern="^(critical|high|medium|low)$")
    implementation_effort: str = Field(
        default="medium", pattern="^(low|medium|high)$"
    )
    deadline: str = ""


class TrendItem(BaseModel):
    """Positive or negative trend detected in financial data."""

    model_config = ConfigDict(from_attributes=True)

    title: str
    detail: str
    metric: str = ""
    change_pct: float = 0.0
    period: str = ""


class AlertSignal(BaseModel):
    """Financial alert requiring attention."""

    model_config = ConfigDict(from_attributes=True)

    title: str
    detail: str
    severity: str = Field(default="medium", pattern="^(critical|high|medium|low)$")
    deviation_pct: float = 0.0
    threshold_exceeded: float = 0.0


class CashFlowProjection(BaseModel):
    """Narrative projection summary."""

    model_config = ConfigDict(from_attributes=True)

    method: str = ""
    confidence: str = ""
    summary: str = ""
    key_assumptions: list[str] = Field(default_factory=list)
    risk_factors: list[str] = Field(default_factory=list)


class TierEconomics(BaseModel):
    """Per-member economics for a single membership tier."""

    model_config = ConfigDict(from_attributes=True)

    tier: str
    avg_revenue: float = 0.0
    avg_cost: float = 0.0
    margin_pct: float = 0.0
    count: int = 0


class MemberEconomics(BaseModel):
    """Aggregate member economics with per-tier breakdown."""

    model_config = ConfigDict(from_attributes=True)

    member_count: int = 0
    avg_revenue_per_member: float = 0.0
    avg_cost_per_member: float = 0.0
    avg_margin_per_member: float = 0.0
    ltv_estimate: float = 0.0
    cac_estimate: float = 0.0
    ltv_cac_ratio: float = 0.0
    by_tier: list[TierEconomics] = Field(default_factory=list)


class AiFinancialReport(BaseModel):
    """Complete AI-powered financial analysis report.

    Contains: Health Score, Cash Flow Forecast, Revenue Concentration
    (Shannon + HHI), Anomalies, Recommendations, Trends, Alerts,
    Projection, and Member Economics.
    """

    model_config = ConfigDict(from_attributes=True)

    health_score: HealthScore = Field(default_factory=HealthScore)
    cash_flow_forecast: CashFlowForecast = Field(default_factory=CashFlowForecast)
    revenue_concentration: RevenueConcentration = Field(
        default_factory=RevenueConcentration
    )
    financial_anomalies: list[FinancialAnomaly] = Field(default_factory=list)
    recommendations: list[FinancialRecommendation] = Field(default_factory=list)
    positive_trends: list[TrendItem] = Field(default_factory=list)
    alert_signals: list[AlertSignal] = Field(default_factory=list)
    projection: CashFlowProjection = Field(default_factory=CashFlowProjection)
    member_economics: MemberEconomics = Field(default_factory=MemberEconomics)


# ── Financial Summary (get_financial_summary) ────────────


class FinancialMonthlyTrend(BaseModel):
    """Monthly trend data point for financial summary."""

    model_config = ConfigDict(from_attributes=True)

    month: str
    revenue: float = 0.0
    expenses: float = 0.0
    net: float = 0.0


class FinancialExpenseLine(BaseModel):
    """Expense breakdown line for financial summary."""

    model_config = ConfigDict(from_attributes=True)

    category: str
    amount: float = 0.0
    percentage: float = 0.0
    variance_pct: float = 0.0


class FinancialRevenueLine(BaseModel):
    """Revenue source line for financial summary."""

    model_config = ConfigDict(from_attributes=True)

    source: str
    amount: float = 0.0
    percentage: float = 0.0


class FinancialARAgingBucket(BaseModel):
    """Accounts receivable aging bucket."""

    model_config = ConfigDict(from_attributes=True)

    bucket: str
    amount: float = 0.0
    count: int = 0


class FinancialSummaryResponse(BaseModel):
    """Dashboard-level financial summary for get_financial_summary tool."""

    model_config = ConfigDict(from_attributes=True)

    period: str = "current_quarter"
    revenue_total: float = 0.0
    expenses_total: float = 0.0
    net_income: float = 0.0
    operating_margin_pct: float = 0.0
    collection_ratio_pct: float = 0.0
    budget_variance_pct: float = 0.0
    monthly_trend: list[FinancialMonthlyTrend] = Field(default_factory=list)
    expense_breakdown: list[FinancialExpenseLine] = Field(default_factory=list)
    revenue_by_source: list[FinancialRevenueLine] = Field(default_factory=list)
    cash_position: float = 0.0
    accounts_receivable: float = 0.0
    accounts_receivable_aging: list[FinancialARAgingBucket] = Field(default_factory=list)
