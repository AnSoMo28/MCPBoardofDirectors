"""
Guest management models.
Club: Castillo Country Club
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────

class GuestStatus(str, Enum):
    REGISTERED = "registered"
    CHECKED_IN = "checked_in"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PrivateEventType(str, Enum):
    WEDDING = "wedding"
    BAPTISM = "baptism"
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"
    CORPORATE = "corporate"
    QUINCEANERA = "quinceanera"
    OTHER = "other"


class PrivateEventStatus(str, Enum):
    INQUIRY = "inquiry"
    QUOTED = "quoted"
    APPROVED = "approved"
    CONTRACTED = "contracted"
    DEPOSIT_PAID = "deposit_paid"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrialMembershipType(str, Enum):
    DAY_PASS = "day_pass"
    WEEK_TRIAL = "week_trial"
    MONTH_TRIAL = "month_trial"


class TrialMembershipStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    ACTIVE = "active"
    EXPIRED = "expired"
    CONVERTED = "converted"
    CANCELLED = "cancelled"


class GuestPrivilegeType(str, Enum):
    POOL = "pool"
    GYM = "gym"
    DINING = "dining"
    TENNIS = "tennis"
    GOLF = "golf"
    SPA = "spa"
    KIDS_AREA = "kids_area"
    SOCIAL_EVENTS = "social_events"


# ── Guest ──────────────────────────────────────────────────

class Guest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    family_id: str
    host_member_id: str
    guest_name: str
    guest_email: str = ""
    guest_phone: str = ""
    visit_date: str
    purpose: str = ""
    status: GuestStatus = GuestStatus.REGISTERED
    privileges: list[str] = Field(default_factory=list)
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""


class CreateGuest(BaseModel):
    family_id: str
    host_member_id: str
    guest_name: str
    guest_email: str = ""
    guest_phone: str = ""
    visit_date: str
    purpose: str = ""
    privileges: list[str] = Field(default_factory=list)
    notes: str = ""


# ── PrivateEvent ───────────────────────────────────────────

class PrivateEvent(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    family_id: str
    event_name: str
    event_type: PrivateEventType
    venue: str
    date: str
    start_time: str = ""
    end_time: str = ""
    guest_count: int = 0
    budget: float = 0.0
    estimated_cost: float = 0.0
    status: PrivateEventStatus = PrivateEventStatus.INQUIRY
    coordinator_member_id: str = ""
    description: str = ""
    special_requirements: str = ""
    catering_required: bool = False
    decoration_required: bool = False
    entertainment_required: bool = False
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""


class CreatePrivateEvent(BaseModel):
    family_id: str
    event_name: str
    event_type: PrivateEventType
    venue: str
    date: str
    start_time: str = ""
    end_time: str = ""
    guest_count: int = 0
    budget: float = 0.0
    coordinator_member_id: str = ""
    description: str = ""
    special_requirements: str = ""
    catering_required: bool = False
    decoration_required: bool = False
    entertainment_required: bool = False
    notes: str = ""


# ── TrialMembership ────────────────────────────────────────

class TrialMembership(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_name: str
    guest_email: str = ""
    guest_phone: str = ""
    referred_by_family_id: str
    trial_type: TrialMembershipType
    start_date: str
    end_date: str
    status: TrialMembershipStatus = TrialMembershipStatus.PENDING_APPROVAL
    privileges: list[str] = Field(default_factory=list)
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""


class CreateTrialMembership(BaseModel):
    guest_name: str
    guest_email: str = ""
    guest_phone: str = ""
    referred_by_family_id: str
    trial_type: TrialMembershipType
    start_date: str
    end_date: str
    privileges: list[str] = Field(default_factory=list)
    notes: str = ""


# ── Intelligence Enums ─────────────────────────────────────


class GuestHealthLevel(str, Enum):
    """Health levels for guest management intelligence."""

    EXCELLENT = "excellent"
    HEALTHY = "healthy"
    ATTENTION = "attention"
    CRITICAL = "critical"


class ConversionStage(str, Enum):
    """Stages in the guest-to-member conversion funnel."""

    GUEST_REGISTERED = "guest_registered"
    GUEST_CHECKED_IN = "guest_checked_in"
    REPEAT_GUEST = "repeat_guest"
    TRIAL_APPLICANT = "trial_applicant"
    CONVERTED_MEMBER = "converted_member"


class GuestProposalType(str, Enum):
    """Types of engagement proposals for guest intelligence."""

    TRIAL_INVITATION = "trial_invitation"
    FOLLOW_UP_CAMPAIGN = "follow_up_campaign"
    PRIVILEGE_EXPANSION = "privilege_expansion"
    REFERRAL_ACTIVATION = "referral_activation"
    EVENT_OUTREACH = "event_outreach"
    CONVERSION_NUDGE = "conversion_nudge"


# ── Intelligence Models ────────────────────────────────────


class GuestHealthFactor(BaseModel):
    """Individual factor contributing to guest management health."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    score: float = Field(ge=0, le=100, description="Factor score 0-100")
    weight: float = Field(ge=0, le=1, description="Weight in composite")
    weighted_score: float = Field(ge=0, le=100)
    impact: str = Field(
        default="medium", description="high, medium, low"
    )
    detail: str = ""


class GuestHealthScore(BaseModel):
    """Composite health score for guest management intelligence."""

    model_config = ConfigDict(from_attributes=True)

    score: int = Field(ge=0, le=100)
    level: GuestHealthLevel = GuestHealthLevel.HEALTHY
    factors: list[GuestHealthFactor] = Field(default_factory=list)
    trend: str = Field(
        default="stable", description="improving, stable, declining"
    )
    summary: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ConversionFunnelStage(BaseModel):
    """Single stage in the guest-to-member conversion funnel."""

    model_config = ConfigDict(from_attributes=True)

    stage: ConversionStage
    label: str = ""
    count: int = 0
    rate_pct: float = Field(
        ge=0, le=100, default=0.0,
        description="Conversion rate from previous stage",
    )
    cumulative_rate_pct: float = Field(
        ge=0, le=100, default=0.0,
        description="Conversion rate from first stage",
    )
    avg_days_in_stage: float = 0.0
    dropoff_count: int = 0
    benchmark_rate_pct: float = Field(
        default=0.0,
        description="CR private club benchmark for this transition",
    )
    vs_benchmark: float = Field(
        default=0.0,
        description="Positive = above benchmark, negative = below",
    )


class ConversionFunnel(BaseModel):
    """Complete guest-to-member conversion funnel."""

    model_config = ConfigDict(from_attributes=True)

    stages: list[ConversionFunnelStage] = Field(default_factory=list)
    overall_conversion_pct: float = Field(
        ge=0, le=100, default=0.0,
        description="Guest → Member end-to-end rate",
    )
    overall_benchmark_pct: float = Field(
        default=0.0,
        description="CR club average end-to-end rate",
    )
    total_guests: int = 0
    total_converted: int = 0
    pipeline_value: float = Field(
        default=0.0,
        description="Estimated revenue value of active pipeline",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class GuestTemporalTrend(BaseModel):
    """Monthly data point for guest analytics trends."""

    model_config = ConfigDict(from_attributes=True)

    month: str = Field(description="YYYY-MM")
    new_guests: int = 0
    unique_visitors: int = 0
    check_ins: int = 0
    trials_created: int = 0
    trials_converted: int = 0
    private_events: int = 0
    avg_visit_frequency: float = 0.0


class GuestAnalyticsEnhanced(BaseModel):
    """Complete analytics dashboard for guest intelligence."""

    model_config = ConfigDict(from_attributes=True)

    # Core counts
    total_guests: int = 0
    active_guests: int = 0
    total_private_events: int = 0
    upcoming_events: int = 0
    total_trial_memberships: int = 0
    active_trials: int = 0
    converted_trials: int = 0

    # Conversion rates
    guest_to_trial_rate: float = Field(
        ge=0, le=100, default=0.0
    )
    trial_to_member_rate: float = Field(
        ge=0, le=100, default=0.0
    )

    # Temporal
    temporal_trends: list[GuestTemporalTrend] = Field(
        default_factory=list
    )

    # Referrals
    top_referrers: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{family_id, referral_count, converted_count}]",
    )

    # Privileges
    privilege_usage: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{privilege_type, usage_count, unique_guests}]",
    )

    # Visit patterns
    peak_visit_days: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{day, visit_count}]",
    )

    # Event correlation
    event_guest_correlation: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{event_type, avg_guests_generated, total_events}]",
    )

    # Top purposes
    top_purposes: list[dict[str, Any]] = Field(
        default_factory=list,
    )

    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class GuestForecastItem(BaseModel):
    """Single forecast prediction for guest management."""

    model_config = ConfigDict(from_attributes=True)

    metric: str = Field(
        description="guest_volume, trial_demand, conversion_rate, event_pipeline"
    )
    current_value: float = 0.0
    predicted_value: float = 0.0
    change_pct: float = 0.0
    confidence: float = Field(ge=0, le=1, default=0.5)
    trend: str = "stable"
    period: str = Field(default="", description="e.g., 'Q3 2026'")
    factors: list[str] = Field(default_factory=list)


class GuestDemandForecast(BaseModel):
    """Complete demand forecast for guest management."""

    model_config = ConfigDict(from_attributes=True)

    forecasts: list[GuestForecastItem] = Field(default_factory=list)
    trial_capacity_needed: int = Field(
        default=0,
        description="Projected trial slots needed",
    )
    seasonal_multiplier: float = Field(
        default=1.0,
        description="Next period seasonal factor (1.0 = average)",
    )
    peak_months: list[str] = Field(default_factory=list)
    forecast_horizon_months: int = 3
    data_quality_note: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class GuestEngagementProposal(BaseModel):
    """A proactive engagement proposal from the guest engine."""

    model_config = ConfigDict(from_attributes=True)

    proposal_id: str = Field(
        default_factory=lambda: uuid4().hex[:8]
    )
    proposal_type: GuestProposalType
    title: str
    description: str
    target_family_id: str = ""
    target_guest_ids: list[str] = Field(default_factory=list)
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


class GuestEngagementProposalList(BaseModel):
    """Collection of engagement proposals with metadata."""

    model_config = ConfigDict(from_attributes=True)

    proposals: list[GuestEngagementProposal] = Field(
        default_factory=list
    )
    total: int = 0
    high_priority_count: int = 0
    cross_domain_count: int = 0
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class GuestIntelligenceReport(BaseModel):
    """Full intelligence report combining all guest dimensions."""

    model_config = ConfigDict(from_attributes=True)

    health_score: GuestHealthScore | None = None
    funnel: ConversionFunnel | None = None
    analytics: GuestAnalyticsEnhanced | None = None
    forecast: GuestDemandForecast | None = None
    proposals: GuestEngagementProposalList | None = None
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
