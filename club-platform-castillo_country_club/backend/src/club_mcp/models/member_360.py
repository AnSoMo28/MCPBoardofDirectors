"""
Member 360 Intelligence — Pydantic Models
Source of truth for Member 360 data structures.

Enums: 10 domain-specific
Entities: 6 core
Responses: 10 (one per MCP tool)
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums ───────────────────────────────────────────────────────────────────

class MemberHealthLevel(str, Enum):
    EXCELLENT = "excellent"        # 85-100
    HEALTHY = "healthy"            # 65-84
    ATTENTION = "attention"        # 45-64
    CRITICAL = "critical"          # 0-44


class JourneyStage(str, Enum):
    PROSPECT = "prospect"
    ONBOARDING = "onboarding"
    GROWING = "growing"
    PEAK = "peak"
    PLATEAU = "plateau"
    AT_RISK = "at_risk"
    DORMANT = "dormant"
    REACTIVATED = "reactivated"


class ChurnRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActivityDomain(str, Enum):
    EVENTS = "events"
    SPORTS = "sports"
    WELLNESS = "wellness"
    CULTURAL = "cultural"
    DINING = "dining"
    SOCIAL = "social"
    GUEST_MANAGEMENT = "guest_management"
    COMMUNICATIONS = "communications"


class RiskFactorSource(str, Enum):
    FINANCIAL = "financial"
    ENGAGEMENT = "engagement"
    SOCIAL = "social"
    WELLNESS = "wellness"
    SATISFACTION = "satisfaction"
    LIFECYCLE = "lifecycle"
    COMMUNICATION = "communication"
    EVENTS = "events"


class EngagementProposalType(str, Enum):
    ACTIVITY_RECOMMENDATION = "activity_recommendation"
    SOCIAL_CONNECTION = "social_connection"
    RETENTION_CAMPAIGN = "retention_campaign"
    TIER_UPGRADE = "tier_upgrade"
    CROSS_DOMAIN = "cross_domain"
    MILESTONE_CELEBRATION = "milestone_celebration"
    WELLNESS_PROGRAM = "wellness_program"
    CULTURAL_INVITATION = "cultural_invitation"


class HealthFactorName(str, Enum):
    ENGAGEMENT = "engagement"
    FINANCIAL = "financial"
    SOCIAL = "social"
    SATISFACTION = "satisfaction"
    ACTIVITY = "activity"


class MemberSearchSort(str, Enum):
    HEALTH_SCORE_ASC = "health_score_asc"
    HEALTH_SCORE_DESC = "health_score_desc"
    CHURN_RISK_DESC = "churn_risk_desc"
    LTV_DESC = "ltv_desc"
    NAME_ASC = "name_asc"
    TIER_DESC = "tier_desc"
    ENGAGEMENT_DESC = "engagement_desc"


class LTVTier(str, Enum):
    HIGH_VALUE = "high_value"        # top 20%
    STANDARD = "standard"            # middle 60%
    LOW_VALUE = "low_value"          # bottom 20%
    NEGATIVE_TREND = "negative_trend" # declining


class SocialClusterType(str, Enum):
    SPORTS_ENTHUSIASTS = "sports_enthusiasts"
    CULTURAL_AFICIONADOS = "cultural_aficionados"
    SOCIAL_BUTTERFLIES = "social_butterflies"
    WELLNESS_FOCUSED = "wellness_focused"
    FAMILY_ORIENTED = "family_oriented"
    EXECUTIVE_NETWORK = "executive_network"


# ─── Core Entities ───────────────────────────────────────────────────────────

class MemberIdentity(BaseModel):
    """Core identity for a single club member."""
    member_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    tier: str  # MemberTier value
    role: str  # MemberRole value (primary, spouse, child, dependent)
    family_id: str
    family_name: str
    join_date: date
    age: Optional[int] = None
    age_group: Optional[str] = None  # AgeGroupCategory value


class HealthFactor(BaseModel):
    """Individual health factor contributing to composite score."""
    name: str  # HealthFactorName value
    score: float = Field(ge=0, le=100)
    weight: float = Field(ge=0, le=1)
    trend: str = "stable"  # TrendDirection value
    details: Optional[str] = None


class ActivityRecord(BaseModel):
    """Single cross-domain activity record."""
    date: datetime
    domain: str  # ActivityDomain value
    activity_type: str
    description: str
    venue: Optional[str] = None
    amount: Optional[float] = None
    duration_minutes: Optional[int] = None
    satisfaction_rating: Optional[float] = None


class SocialConnection(BaseModel):
    """Social graph edge for a member."""
    connected_member_id: str
    connected_name: str
    connection_type: str  # family, friend, co_activity, referral
    strength: float = Field(ge=0, le=1)  # 0-1 connection strength
    shared_activities: int = 0
    last_interaction: Optional[datetime] = None


class JourneyMilestone(BaseModel):
    """Milestone in the member journey."""
    milestone_id: str
    date: datetime
    milestone_type: str  # join, anniversary, achievement, tier_change, activity_streak
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    celebrated: bool = False


class EngagementProposal(BaseModel):
    """Actionable engagement proposal for a member."""
    proposal_id: str
    proposal_type: str  # EngagementProposalType value
    title: str
    description: str
    domain: str  # ActivityDomain value
    priority: str = "medium"  # PriorityLevel value
    estimated_impact: str = "medium"  # high/medium/low
    confidence: float = Field(ge=0, le=100, default=75)
    suggested_action: Optional[str] = None
    related_members: list[str] = Field(default_factory=list)
    expires_at: Optional[datetime] = None


# ─── Tool Response Models ────────────────────────────────────────────────────

class Member360ProfileResponse(BaseModel):
    """get_member_360_profile — Full aggregated profile."""
    member: MemberIdentity
    health_score: float = Field(ge=0, le=100)
    health_level: str  # MemberHealthLevel value
    journey_stage: str  # JourneyStage value
    days_in_stage: int
    churn_risk: str  # ChurnRiskLevel value
    churn_score: float = Field(ge=0, le=100)
    engagement_score: float = Field(ge=0, le=100)
    ltv_estimate: float
    ltv_trend: str  # TrendDirection value
    active_domains: list[str]  # ActivityDomain values
    total_activities_90d: int
    last_activity_date: Optional[datetime] = None
    connections_count: int
    satisfaction_nps: Optional[float] = None
    upcoming_milestones: list[JourneyMilestone] = Field(default_factory=list)
    top_risks: list[str] = Field(default_factory=list)
    generated_at: datetime


class MemberHealthScoreResponse(BaseModel):
    """get_member_health_score — Composite health with 5 factors."""
    member_id: str
    composite_score: float = Field(ge=0, le=100)
    health_level: str  # MemberHealthLevel value
    factors: list[HealthFactor]
    trend: str  # TrendDirection value
    trend_detail: Optional[str] = None
    previous_score: Optional[float] = None
    benchmark_percentile: Optional[float] = None  # vs same tier
    generated_at: datetime


class MemberJourneyResponse(BaseModel):
    """get_member_journey — Lifecycle + timeline + milestones."""
    member_id: str
    current_stage: str  # JourneyStage value
    days_in_stage: int
    stage_history: list[dict] = Field(default_factory=list)  # [{stage, entered_at, exited_at, duration_days}]
    milestones: list[JourneyMilestone]
    next_expected_transition: Optional[str] = None
    next_transition_date: Optional[date] = None
    journey_health: str = "healthy"  # healthy, stalled, accelerating, declining
    generated_at: datetime


class MemberChurnPredictionResponse(BaseModel):
    """get_member_churn_prediction — Individual churn risk + factors."""
    member_id: str
    churn_risk: str  # ChurnRiskLevel value
    churn_score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=100)
    risk_factors: list[dict] = Field(default_factory=list)  # [{source, factor, weight, detail}]
    protective_factors: list[dict] = Field(default_factory=list)
    time_horizon_days: int = 90
    recommended_actions: list[str] = Field(default_factory=list)
    similar_churned_count: Optional[int] = None
    generated_at: datetime


class MemberLTVAnalysisResponse(BaseModel):
    """get_member_ltv_analysis — LTV projection + spend analysis."""
    member_id: str
    current_ltv: float
    monthly_avg_spend: float
    ltv_trend: str  # TrendDirection value
    ltv_tier: str  # LTVTier value
    spend_breakdown: list[dict] = Field(default_factory=list)  # [{domain, amount, percentage}]
    projection_12m: Optional[float] = None
    projection_confidence: Optional[float] = None
    benchmark_vs_tier: Optional[float] = None  # % vs tier average
    peak_month: Optional[str] = None
    low_month: Optional[str] = None
    generated_at: datetime


class MemberActivitySummaryResponse(BaseModel):
    """get_member_activity_summary — Cross-domain activity breakdown."""
    member_id: str
    total_activities: int
    period_days: int = 90
    by_domain: list[dict] = Field(default_factory=list)  # [{domain, count, percentage, trend, last_activity}]
    activity_heatmap: list[dict] = Field(default_factory=list)  # [{weekday, hour, count}]
    favorite_venues: list[dict] = Field(default_factory=list)
    activity_streak_current: int = 0
    activity_streak_longest: int = 0
    generated_at: datetime


class MemberSocialProfileResponse(BaseModel):
    """get_member_social_profile — Connections + clusters + referrals."""
    member_id: str
    connections_count: int
    connections: list[SocialConnection] = Field(default_factory=list)
    cluster_membership: list[str] = Field(default_factory=list)  # SocialClusterType values
    cluster_details: list[dict] = Field(default_factory=list)  # [{cluster, members_count, cohesion, match_score}]
    referrals_made: int = 0
    referrals_converted: int = 0
    social_influence_score: float = Field(ge=0, le=100, default=50)
    recommended_connections: list[dict] = Field(default_factory=list)  # [{member_id, name, reason, shared_interests}]
    generated_at: datetime


class MemberEngagementProposalsResponse(BaseModel):
    """generate_member_engagement_proposals — Engagement Motor."""
    member_id: str
    proposals: list[EngagementProposal]
    total_proposals: int
    cross_domain_signals: list[dict] = Field(default_factory=list)
    generated_at: datetime


class MemberRiskAssessmentResponse(BaseModel):
    """get_member_risk_assessment — Cross-domain risk factors."""
    member_id: str
    overall_risk: str  # SeverityLevel value
    risk_score: float = Field(ge=0, le=100)
    risk_factors: list[dict] = Field(default_factory=list)  # [{source, factor, severity, weight, detail, mitigation}]
    protective_factors: list[dict] = Field(default_factory=list)
    risk_trend: str = "stable"  # TrendDirection value
    similar_at_risk_count: Optional[int] = None
    generated_at: datetime


class Member360Preview(BaseModel):
    """Compact preview for search results."""
    member_id: str
    first_name: str
    last_name: str
    tier: str
    role: str
    family_name: str
    health_score: float
    health_level: str
    churn_risk: str
    engagement_score: float
    journey_stage: str
    last_activity_date: Optional[datetime] = None


class SearchMembers360Response(BaseModel):
    """search_members_360 — Search/browse with 360 preview."""
    members: list[Member360Preview]
    total: int
    page: int = 1
    page_size: int = 20
    filters_applied: dict = Field(default_factory=dict)
    generated_at: datetime
