"""
Proactive recommendation models.
Club: Castillo Country Club
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────

class RecommendationType(str, Enum):
    ACTIVITY = "activity"
    EVENT = "event"
    SOCIAL = "social"
    DINING = "dining"
    WELLNESS = "wellness"
    SPORT = "sport"


class RecommendationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class PredictionConfidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ConflictSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SuggestionStatus(str, Enum):
    PROPOSED = "proposed"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    IMPLEMENTED = "implemented"


class PricingStrategy(str, Enum):
    DEMAND_BASED = "demand_based"
    SEASONAL = "seasonal"
    MEMBER_TIER = "member_tier"
    EVENT_BASED = "event_based"
    BUNDLE = "bundle"


class InsightPeriod(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class ClusterType(str, Enum):
    SOCIAL = "social"
    ACTIVITY = "activity"
    AGE_BASED = "age_based"
    INTEREST = "interest"
    ENGAGEMENT = "engagement"


# ── Recommendation ─────────────────────────────────────────

class Recommendation(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    family_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    priority: RecommendationPriority = RecommendationPriority.MEDIUM
    score: float = 0.0
    reasoning: str = ""
    tags: list[str] = Field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""


class CreateRecommendation(BaseModel):
    family_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    priority: RecommendationPriority = RecommendationPriority.MEDIUM
    score: float = 0.0
    reasoning: str = ""
    tags: list[str] = Field(default_factory=list)


# ── Attendance Prediction ──────────────────────────────────

class AttendancePrediction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    event_name: str
    predicted_attendance: int = 0
    confidence: PredictionConfidence = PredictionConfidence.MEDIUM
    factors: list[str] = Field(default_factory=list)
    similar_events_avg: int = 0
    created_at: str = ""


# ── Scheduling Conflict ────────────────────────────────────

class SchedulingConflict(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_a_id: str
    event_a_name: str
    event_b_id: str
    event_b_name: str
    conflict_type: str
    severity: ConflictSeverity = ConflictSeverity.MEDIUM
    overlap_start: str = ""
    overlap_end: str = ""
    shared_resources: list[str] = Field(default_factory=list)
    suggestion: str = ""
    created_at: str = ""


# ── Activity Suggestion ────────────────────────────────────

class ActivitySuggestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    target_demographic: str = ""
    estimated_interest: float = 0.0
    estimated_cost: float = 0.0
    similar_clubs_offer: bool = False
    member_requests_count: int = 0
    status: SuggestionStatus = SuggestionStatus.PROPOSED
    tags: list[str] = Field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""


class CreateActivitySuggestion(BaseModel):
    name: str
    description: str
    target_demographic: str = ""
    estimated_interest: float = 0.0
    estimated_cost: float = 0.0
    similar_clubs_offer: bool = False
    member_requests_count: int = 0
    tags: list[str] = Field(default_factory=list)


# ── Communication Draft ────────────────────────────────────

class CommunicationDraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    family_id: str
    channel: str
    subject: str
    body: str
    tone: str = "friendly"
    personalization_data: dict[str, Any] = Field(default_factory=dict)
    created_at: str = ""


# ── Pricing Optimization ───────────────────────────────────

class PricingOptimization(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    service_name: str
    current_price: float = 0.0
    suggested_price: float = 0.0
    strategy: PricingStrategy = PricingStrategy.DEMAND_BASED
    expected_revenue_change: float = 0.0
    expected_demand_change: float = 0.0
    reasoning: str = ""
    risk_level: str = "medium"
    status: SuggestionStatus = SuggestionStatus.PROPOSED
    created_at: str = ""
    updated_at: str = ""


class CreatePricingOptimization(BaseModel):
    service_name: str
    current_price: float = 0.0
    suggested_price: float = 0.0
    strategy: PricingStrategy = PricingStrategy.DEMAND_BASED
    expected_revenue_change: float = 0.0
    expected_demand_change: float = 0.0
    reasoning: str = ""
    risk_level: str = "medium"


# ── Social Cluster ─────────────────────────────────────────

class SocialCluster(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    cluster_type: ClusterType
    description: str = ""
    family_ids: list[str] = Field(default_factory=list)
    size: int = 0
    avg_engagement: float = 0.0
    shared_interests: list[str] = Field(default_factory=list)
    created_at: str = ""


# ── Quarterly Insights ─────────────────────────────────────

class QuarterlyInsights(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    year: int
    period: InsightPeriod
    summary: str = ""
    total_members_active: int = 0
    events_held: int = 0
    avg_event_attendance: float = 0.0
    revenue_total: float = 0.0
    top_activities: list[dict[str, Any]] = Field(default_factory=list)
    member_satisfaction_avg: float = 0.0
    key_achievements: list[str] = Field(default_factory=list)
    areas_for_improvement: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    status: SuggestionStatus = SuggestionStatus.PROPOSED
    created_at: str = ""
    updated_at: str = ""
