"""Age group activity models for the Club MCP platform."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AgeGroupCategory(str, Enum):
    """Standard age group categories in the club."""

    TODDLER = "toddler"        # 0-3
    KIDS = "kids"              # 4-12
    TEENS = "teens"            # 13-17
    YOUNG_ADULTS = "young_adults"  # 18-25
    ADULTS = "adults"          # 26-59
    SENIORS = "seniors"        # 60+


class ActivityDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class AgeGroupActivityStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SEASONAL = "seasonal"


# ── Core models ───────────────────────────────────────────


class AgeGroupActivity(BaseModel):
    """An activity available for a specific age group."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    name: str
    description: str = ""
    age_group: AgeGroupCategory
    difficulty: ActivityDifficulty = ActivityDifficulty.EASY
    location: str = ""
    max_participants: int = 0
    duration_minutes: int = 60
    requires_instructor: bool = False
    instructor_name: str = ""
    equipment_needed: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    status: AgeGroupActivityStatus = AgeGroupActivityStatus.ACTIVE
    schedule_days: list[str] = Field(default_factory=list)
    schedule_time: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgeGroupDemographics(BaseModel):
    """Demographics breakdown for an age group."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    total_members: int = 0
    total_families: int = 0
    percentage_of_club: float = 0.0
    active_participants: int = 0
    activity_count: int = 0


class ParticipationRecord(BaseModel):
    """Participation metrics for an age group activity."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    activity_name: str = ""
    age_group: str
    total_enrolled: int = 0
    average_attendance: float = 0.0
    sessions_held: int = 0
    satisfaction_score: float = 0.0
    retention_rate: float = 0.0


class ActivityRecommendation(BaseModel):
    """An activity recommendation for a member/family."""

    model_config = ConfigDict(from_attributes=True)

    activity_id: str
    activity_name: str
    age_group: str
    match_reason: str
    confidence: float = 0.0


# ── Request / Response ────────────────────────────────────


class AgeGroupActivityCreate(BaseModel):
    """Schema for registering a new age group activity."""

    name: str
    description: str = ""
    age_group: AgeGroupCategory
    difficulty: ActivityDifficulty = ActivityDifficulty.EASY
    location: str = ""
    max_participants: int = 0
    duration_minutes: int = 60
    requires_instructor: bool = False
    instructor_name: str = ""
    equipment_needed: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    schedule_days: list[str] = Field(default_factory=list)
    schedule_time: str = ""


class AgeGroupActivityUpdate(BaseModel):
    """Schema for updating an age group activity."""

    name: str | None = None
    description: str | None = None
    difficulty: ActivityDifficulty | None = None
    location: str | None = None
    max_participants: int | None = None
    duration_minutes: int | None = None
    requires_instructor: bool | None = None
    instructor_name: str | None = None
    equipment_needed: list[str] | None = None
    tags: list[str] | None = None
    status: AgeGroupActivityStatus | None = None
    schedule_days: list[str] | None = None
    schedule_time: str | None = None


class AgeGroupSummary(BaseModel):
    """Summary of an age group with counts."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    description: str
    member_count: int = 0
    family_count: int = 0
    activity_count: int = 0
    activities: list[AgeGroupActivity] = Field(default_factory=list)



# ── Intelligence Enums ─────────────────────────────────────


class AgeGroupHealthLevel(str, Enum):
    """Health levels for age group intelligence."""

    EXCELLENT = "excellent"
    HEALTHY = "healthy"
    ATTENTION = "attention"
    CRITICAL = "critical"


class AgeGroupBalanceStatus(str, Enum):
    """Balance status for demographic distribution."""

    OVERREPRESENTED = "overrepresented"
    BALANCED = "balanced"
    UNDERREPRESENTED = "underrepresented"


class GenerationalProposalType(str, Enum):
    """Types of engagement proposals for generational intelligence."""

    ACTIVITY_RECOMMENDATION = "activity_recommendation"
    CROSS_SELL = "cross_sell"
    EVENT_PROPOSAL = "event_proposal"
    RETENTION_CAMPAIGN = "retention_campaign"
    COVERAGE_EXPANSION = "coverage_expansion"
    SEASONAL_PROGRAM = "seasonal_program"


# ── Intelligence Models ────────────────────────────────────


class AgeGroupHealthFactor(BaseModel):
    """Individual factor contributing to the age group health score."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    score: float = Field(ge=0, le=100, description="Factor score 0-100")
    weight: float = Field(
        ge=0, le=1, description="Weight in composite score"
    )
    weighted_score: float = Field(
        ge=0, le=100, description="score × weight contribution"
    )
    impact: str = Field(
        default="medium", description="high, medium, low"
    )
    detail: str = ""


class AgeGroupHealthScore(BaseModel):
    """Composite health score for age group intelligence."""

    model_config = ConfigDict(from_attributes=True)

    score: int = Field(ge=0, le=100)
    level: AgeGroupHealthLevel = AgeGroupHealthLevel.HEALTHY
    factors: list[AgeGroupHealthFactor] = Field(default_factory=list)
    trend: str = Field(
        default="stable", description="improving, stable, declining"
    )
    percentile_rank: float = Field(
        default=0.0,
        description="Position relative to other age groups (0-100)",
    )
    summary: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class AgeGroupDistribution(BaseModel):
    """Demographic distribution entry for one age group."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    description: str = ""
    member_count: int = 0
    family_count: int = 0
    percentage: float = Field(
        ge=0, le=100, description="Actual % of total members"
    )
    ideal_percentage: float = Field(
        default=0.0, description="Target balanced %"
    )
    deviation: float = Field(
        default=0.0, description="Actual - ideal (negative = under)"
    )
    balance_status: AgeGroupBalanceStatus = AgeGroupBalanceStatus.BALANCED
    activity_count: int = 0
    active_activity_count: int = 0
    coverage_adequate: bool = Field(
        default=False, description="Has ≥2 active activities"
    )


class ParticipationTrendPoint(BaseModel):
    """Single data point in a participation time series."""

    model_config = ConfigDict(from_attributes=True)

    period: str = Field(description="YYYY-MM format")
    age_group: str
    total_enrolled: int = 0
    unique_participants: int = 0
    avg_satisfaction: float = 0.0
    retention_rate: float = 0.0
    new_enrollments: int = 0


class CrossDomainSignal(BaseModel):
    """Signal emitted or consumed across domain boundaries."""

    model_config = ConfigDict(from_attributes=True)

    source_domain: str = Field(
        description="Domain that generated the signal"
    )
    target_domain: str = Field(
        default="", description="Domain that should consume it"
    )
    signal_type: str = Field(
        default="info", description="info, warning, opportunity"
    )
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    severity: str = Field(
        default="low", description="low, medium, high"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class GenerationalAnalytics(BaseModel):
    """Complete analytics dashboard for generational intelligence."""

    model_config = ConfigDict(from_attributes=True)

    # Distribution
    distribution: list[AgeGroupDistribution] = Field(default_factory=list)
    total_members: int = 0
    total_families: int = 0
    balance_score: float = Field(
        ge=0, le=100,
        description="How balanced the distribution is (100=perfect)",
    )

    # Activity coverage
    total_activities: int = 0
    active_activities: int = 0
    groups_with_adequate_coverage: int = 0
    coverage_score: float = Field(
        ge=0, le=100, description="% of groups with ≥2 active activities"
    )

    # Participation
    total_enrolled: int = 0
    avg_satisfaction: float = 0.0
    avg_retention: float = 0.0

    # Trends
    participation_trends: list[ParticipationTrendPoint] = Field(
        default_factory=list
    )

    # Cross-domain
    cross_domain_signals: list[CrossDomainSignal] = Field(
        default_factory=list
    )

    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ForecastItem(BaseModel):
    """Single forecast prediction for an age group metric."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    metric: str = Field(
        description="participation, demand, satisfaction, retention"
    )
    current_value: float = 0.0
    predicted_value: float = 0.0
    change_pct: float = 0.0
    confidence: float = Field(
        ge=0, le=1, default=0.5, description="Model confidence 0-1"
    )
    trend: str = "stable"
    period: str = Field(default="", description="e.g., 'Q3 2026'")
    factors: list[str] = Field(default_factory=list)


class DemandProjection(BaseModel):
    """Projected demand for activities in an age group."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    current_capacity: int = 0
    current_utilization: float = Field(
        ge=0, le=100, description="% capacity used"
    )
    projected_demand: int = 0
    gap: int = Field(
        default=0, description="Positive = needs more, Negative = excess"
    )
    gap_pct: float = 0.0
    recommendation: str = ""
    urgency: str = Field(
        default="low", description="low, medium, high, critical"
    )


class SeasonalPattern(BaseModel):
    """Seasonal demand pattern for an age group."""

    model_config = ConfigDict(from_attributes=True)

    age_group: str
    month: int = Field(ge=1, le=12)
    month_name: str = ""
    relative_demand: float = Field(
        default=1.0,
        description="1.0 = average, >1 = above average, <1 = below",
    )
    peak_activity: str = ""


class AgeGroupForecast(BaseModel):
    """Complete forecast for generational intelligence."""

    model_config = ConfigDict(from_attributes=True)

    forecasts: list[ForecastItem] = Field(default_factory=list)
    demand_projections: list[DemandProjection] = Field(
        default_factory=list
    )
    seasonal_patterns: list[SeasonalPattern] = Field(default_factory=list)
    forecast_horizon_months: int = 3
    data_quality_note: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class EngagementProposal(BaseModel):
    """A proactive engagement proposal from the generational engine."""

    model_config = ConfigDict(from_attributes=True)

    proposal_id: str = Field(
        default_factory=lambda: uuid4().hex[:8]
    )
    proposal_type: GenerationalProposalType
    title: str
    description: str
    target_age_group: str
    related_age_groups: list[str] = Field(default_factory=list)
    priority: str = Field(
        default="medium", description="high, medium, low"
    )
    impact: str = Field(
        default="medium", description="high, medium, low"
    )
    confidence: float = Field(ge=0, le=1, default=0.5)
    cross_domain_signals: list[str] = Field(default_factory=list)
    suggested_action: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class EngagementProposalList(BaseModel):
    """Collection of engagement proposals with metadata."""

    model_config = ConfigDict(from_attributes=True)

    proposals: list[EngagementProposal] = Field(default_factory=list)
    total: int = 0
    high_priority_count: int = 0
    cross_domain_count: int = 0
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Age Group Intelligence Report (aggregate) ─────────────


class AgeGroupIntelligenceReport(BaseModel):
    """Full intelligence report combining all dimensions."""

    model_config = ConfigDict(from_attributes=True)

    health_score: AgeGroupHealthScore | None = None
    analytics: GenerationalAnalytics | None = None
    forecast: AgeGroupForecast | None = None
    proposals: EngagementProposalList | None = None
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
