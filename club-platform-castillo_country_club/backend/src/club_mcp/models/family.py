"""
Family domain models.
Pydantic schemas for validation, serialization, and API contracts.
Intelligence models for AI-powered family analytics.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, EmailStr, Field, computed_field

from club_mcp.models.member import (
    AgeGroup,
    MemberCreate,
    MemberResponse,
    compute_age_group,
)


# ──────────────────────────────────────────────────
# ENUMS
# ──────────────────────────────────────────────────


class MembershipTier(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    VIP = "vip"


class FamilyStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_APPROVAL = "pending_approval"


class LifecycleStage(str, Enum):
    PROSPECT = "prospect"
    ONBOARDING = "onboarding"
    GROWING = "growing"
    PEAK = "peak"
    PLATEAU = "plateau"
    AT_RISK = "at_risk"
    DORMANT = "dormant"
    REACTIVATED = "reactivated"


# ──────────────────────────────────────────────────
# INPUT SCHEMAS
# ──────────────────────────────────────────────────


class FamilyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, examples=["Familia Garcia"])
    tier: MembershipTier = MembershipTier.BASIC
    email: EmailStr
    phone: str = Field(..., min_length=8, max_length=30)
    address: Optional[str] = Field(None, max_length=500)
    members: list[MemberCreate] = Field(..., min_length=1)
    referral_family_id: Optional[UUID] = None
    notes: Optional[str] = Field(None, max_length=1000)


class FamilyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    tier: Optional[MembershipTier] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, min_length=8, max_length=30)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)


class FamilyPreferences(BaseModel):
    preferred_language: str = Field("es", max_length=5)
    notification_channels: list[str] = Field(default_factory=lambda: ["email", "push"])
    preferred_contact_time: Optional[str] = Field(None, examples=["morning", "afternoon", "evening"])
    interests: list[str] = Field(default_factory=list)
    dietary_notes: Optional[str] = Field(None, max_length=500)
    privacy_level: str = Field("normal", pattern="^(open|normal|private|restricted)$")


class FamilySearchParams(BaseModel):
    query: Optional[str] = Field(None, max_length=200)
    tier: Optional[MembershipTier] = None
    status: Optional[FamilyStatus] = None
    age_group: Optional[AgeGroup] = None
    engagement_min: Optional[int] = Field(None, ge=0, le=100)
    engagement_max: Optional[int] = Field(None, ge=0, le=100)
    joined_after: Optional[date] = None
    joined_before: Optional[date] = None
    limit: int = Field(50, ge=1, le=500)
    offset: int = Field(0, ge=0)


# ──────────────────────────────────────────────────
# OUTPUT SCHEMAS — Basic
# ──────────────────────────────────────────────────


class FamilyResponse(BaseModel):
    id: UUID
    name: str
    tier: MembershipTier
    status: FamilyStatus
    email: str
    phone: str
    address: Optional[str] = None
    join_date: date
    engagement_score: int = Field(0, ge=0, le=100)
    referral_family_id: Optional[UUID] = None
    notes: Optional[str] = None
    members: list[MemberResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def member_count(self) -> int:
        return len(self.members)

    @computed_field
    @property
    def age_groups_present(self) -> list[AgeGroup]:
        seen: set[AgeGroup] = set()
        for m in self.members:
            seen.add(compute_age_group(m.date_of_birth))
        return sorted(seen, key=lambda g: list(AgeGroup).index(g))


class FamilyBrief(BaseModel):
    id: UUID
    name: str
    tier: MembershipTier
    status: FamilyStatus
    member_count: int
    engagement_score: int
    join_date: date

    model_config = {"from_attributes": True}


class FamilyListResponse(BaseModel):
    families: list[FamilyBrief]
    total: int
    limit: int
    offset: int


class SocialConnection(BaseModel):
    connected_family_id: UUID
    connected_family_name: str
    connection_strength: float = Field(..., ge=0.0, le=1.0)
    shared_events_count: int
    last_shared_event: Optional[str] = None


class FamilySocialGraph(BaseModel):
    family_id: UUID
    family_name: str
    connections: list[SocialConnection]
    total_connections: int


class ActivityHistoryItem(BaseModel):
    event_name: str
    event_date: date
    event_type: str
    members_attended: list[str]
    satisfaction_rating: Optional[float] = None
    amount_spent: Optional[float] = None


class FamilyActivityHistory(BaseModel):
    family_id: UUID
    family_name: str
    activities: list[ActivityHistoryItem]
    total_activities: int
    period_from: Optional[date] = None
    period_to: Optional[date] = None


# ──────────────────────────────────────────────────
# OUTPUT SCHEMAS — Intelligence
# ──────────────────────────────────────────────────


class ChurnFactor(BaseModel):
    name: str
    impact: float = Field(..., ge=-10, le=10)
    direction: str = Field(..., pattern="^(positive|negative)$")
    detail: str


class FamilyChurnPrediction(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str = Field(..., pattern="^(low|medium|high|critical)$")
    factors: list[ChurnFactor]
    recommendation: str
    confidence: float = Field(..., ge=0, le=1)


class ActivityRecommendation(BaseModel):
    id: str
    activity_name: str
    category: str
    match_score: int = Field(..., ge=0, le=100)
    reason: str
    target_members: list[str]
    estimated_engagement: int = Field(..., ge=0, le=100)
    scheduling_suggestion: str
    linked_event_id: Optional[str] = None


class RecommendationContext(BaseModel):
    interests: list[str] = Field(default_factory=list)
    demographics: list[str] = Field(default_factory=list)
    history: list[str] = Field(default_factory=list)


class FamilyActivityRecommendations(BaseModel):
    recommendations: list[ActivityRecommendation]
    based_on: RecommendationContext


class SocialMatchSuggestion(BaseModel):
    family_id: str
    family_name: str
    tier: str
    match_score: int = Field(..., ge=0, le=100)
    common_interests: list[str]
    shared_demographics: list[str]
    reason: str
    suggested_activity: str


class SocialMatchResponse(BaseModel):
    suggestions: list[SocialMatchSuggestion]


class EngagementPlanAction(BaseModel):
    id: str
    action: str
    category: str = Field(..., pattern="^(communication|activity|recognition|social|financial)$")
    priority: str = Field(..., pattern="^(high|medium|low)$")
    timing: str
    expected_impact: str
    assigned_to: str


class FamilyEngagementPlan(BaseModel):
    current_score: int = Field(..., ge=0, le=100)
    target_score: int = Field(..., ge=0, le=100)
    timeframe: str
    actions: list[EngagementPlanAction]
    ai_summary: str
    estimated_roi: str


class LifecycleRecommendation(BaseModel):
    action: str
    priority: str
    expected_impact: str


class FamilyLifecycleAnalysis(BaseModel):
    current_stage: LifecycleStage
    stage_progress: float = Field(..., ge=0, le=1)
    next_transition: str
    days_at_stage: int = Field(..., ge=0)
    recommendations: list[LifecycleRecommendation]
    confidence: float = Field(..., ge=0, le=1)


class DomainScore(BaseModel):
    domain: str
    score: int = Field(..., ge=0, le=100)
    status: str = Field(..., pattern="^(exceptional|healthy|attention|critical)$")
    finding: str
    recommendation: str


class CrossDomainCorrelation(BaseModel):
    domains: list[str]
    correlation: str
    insight: str
    impact: str


class Family360Insight(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    domains: list[DomainScore]
    top_insights: list[str]
    cross_domain_correlations: list[CrossDomainCorrelation]
    ai_summary: str


class EnrichedSocialConnection(BaseModel):
    connected_family_id: str
    connected_family_name: str
    strength: float = Field(..., ge=0, le=1)
    relationship: str
    shared_activities: list[str] = Field(default_factory=list)
    shared_events: int = 0
    last_interaction: Optional[str] = None
    connected_tier: Optional[str] = None
    connected_engagement: Optional[int] = None
    ai_insight: Optional[str] = None


class SocialGraphCluster(BaseModel):
    id: str
    name: str
    family_ids: list[str]
    common_interest: str
    avg_strength: float = Field(..., ge=0, le=1)


class SuggestedConnection(BaseModel):
    family_id: str
    family_name: str
    tier: str
    match_score: int = Field(..., ge=0, le=100)
    reason: str


class FamilySocialGraphEnriched(BaseModel):
    family_id: str
    family_name: str
    connections: list[EnrichedSocialConnection]
    total_connections: int
    clusters: list[SocialGraphCluster]
    suggested_connections: list[SuggestedConnection]


class FamilyMilestone(BaseModel):
    id: str
    type: str = Field(..., pattern="^(anniversary|birthday|age_transition|achievement)$")
    title: str
    date: str
    days_until: int
    member_name: Optional[str] = None
    suggested_action: str
    priority: str = Field(..., pattern="^(high|medium|low)$")


class MilestoneTrackerResponse(BaseModel):
    upcoming: list[FamilyMilestone]
    recent: list[FamilyMilestone]
    suggestions: list[str]
