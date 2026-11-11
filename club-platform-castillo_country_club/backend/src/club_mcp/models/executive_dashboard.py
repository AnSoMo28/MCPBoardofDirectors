"""
Executive dashboard models.
Club: Castillo Country Club
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────

class DashboardPeriod(str, Enum):
    CURRENT_MONTH = "current_month"
    CURRENT_QUARTER = "current_quarter"
    YTD = "ytd"
    CUSTOM = "custom"


class TrendDirection(str, Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class AnomalySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnomalyDomain(str, Enum):
    MEMBERSHIP = "membership"
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    ENGAGEMENT = "engagement"
    FACILITIES = "facilities"


class ReportAudience(str, Enum):
    INTERNAL = "internal"
    BOARD = "board"
    MEMBERS = "members"
    EXTERNAL = "external"


class ReportQuarter(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class ExportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"


# ── KPI Snapshots ──────────────────────────────────────────

class MembershipKPI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_families: int = 0
    total_members: int = 0
    active_members: int = 0
    new_this_period: int = 0
    departures: int = 0
    net_growth: int = 0
    growth_rate_pct: float = 0.0
    churn_risk_count: int = 0
    avg_engagement_score: float = 0.0
    by_tier: dict[str, int] = Field(default_factory=dict)


class FinancialKPI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    revenue: float = 0.0
    expenses: float = 0.0
    net_income: float = 0.0
    outstanding_dues: float = 0.0
    collection_rate_pct: float = 0.0
    budget_variance_pct: float = 0.0
    revenue_growth_pct: float = 0.0
    top_revenue_sources: list[dict[str, Any]] = Field(
        default_factory=list
    )


class OperationalKPI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    events_held: int = 0
    events_upcoming: int = 0
    avg_event_attendance: float = 0.0
    attendance_trend: TrendDirection = TrendDirection.STABLE
    facility_utilization_pct: float = 0.0
    maintenance_pending: int = 0
    guest_visits: int = 0
    active_trial_memberships: int = 0
    top_activities: list[dict[str, Any]] = Field(default_factory=list)


class EngagementKPI(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    satisfaction_score: float = 0.0
    loyalty_points_distributed: int = 0
    nps_score: float = 0.0
    engagement_trend: TrendDirection = TrendDirection.STABLE
    at_risk_members: int = 0
    highly_engaged_pct: float = 0.0
    campaigns_active: int = 0
    referrals_this_period: int = 0


# ── Executive Summary ──────────────────────────────────────

class ExecutiveSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    period: DashboardPeriod
    date_from: str = ""
    date_to: str = ""
    membership: MembershipKPI = Field(default_factory=MembershipKPI)
    financial: FinancialKPI = Field(default_factory=FinancialKPI)
    operational: OperationalKPI = Field(default_factory=OperationalKPI)
    engagement: EngagementKPI = Field(default_factory=EngagementKPI)
    trends: dict[str, str] = Field(default_factory=dict)
    created_at: str = ""


# ── Anomaly ────────────────────────────────────────────────

class Anomaly(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: AnomalyDomain
    severity: AnomalySeverity
    title: str
    description: str
    context: dict[str, Any] = Field(default_factory=dict)
    suggested_action: str = ""
    created_at: str = ""


# ── Board Report ───────────────────────────────────────────

class BoardReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    year: int
    quarter: ReportQuarter
    executive_summary: str = ""
    membership_analysis: str = ""
    financial_performance: str = ""
    operational_excellence: str = ""
    member_satisfaction: str = ""
    strategic_recommendations: list[str] = Field(
        default_factory=list
    )
    risk_assessment: list[str] = Field(default_factory=list)
    outlook: str = ""
    status: str = "draft"
    created_at: str = ""
    updated_at: str = ""


class CreateBoardReport(BaseModel):
    year: int
    quarter: ReportQuarter
    executive_summary: str = ""
    membership_analysis: str = ""
    financial_performance: str = ""
    operational_excellence: str = ""
    member_satisfaction: str = ""
    strategic_recommendations: list[str] = Field(
        default_factory=list
    )
    risk_assessment: list[str] = Field(default_factory=list)
    outlook: str = ""


# ── Risk Matrix (B3) ────────────────────────────────────────
# Board-level 4x4 risk register: probability(1-4) × impact(1-4),
# the exact contract the frontend RiskHeatmap renders
# (features/reports/types.ts RiskSummary/RiskItem).

class RiskItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str = ""
    category: str = "operational"
    probability: int = Field(2, ge=1, le=4)
    impact: int = Field(2, ge=1, le=4)
    score: int = 0
    level: str = "medium"
    mitigation: str = ""
    owner: str = ""
    identified_at: str = ""
    review_date: Optional[str] = None


class RiskMatrix(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period: str
    items: list[RiskItem] = Field(default_factory=list)
    total_risks: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    created_at: str = ""
    updated_at: str = ""


class CreateRiskMatrix(BaseModel):
    period: str
    items: list[RiskItem] = Field(default_factory=list)


# ── Export Request ──────────────────────────────────────────

class ExportRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    report_type: str
    export_format: ExportFormat
    audience: ReportAudience = ReportAudience.INTERNAL
    status: str = "pending"
    file_path: str = ""
    created_at: str = ""
    updated_at: str = ""
