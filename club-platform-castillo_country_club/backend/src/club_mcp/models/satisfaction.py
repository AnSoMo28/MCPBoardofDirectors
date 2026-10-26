"""Satisfaction domain models: surveys, reports, enums."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class SatisfactionCategory(str, Enum):
    VENUE = "venue"
    FOOD = "food"
    SERVICE = "service"
    ENTERTAINMENT = "entertainment"
    VALUE = "value"
    ORGANIZATION = "organization"
    AMBIANCE = "ambiance"
    CLEANLINESS = "cleanliness"
    TIMING = "timing"
    OVERALL = "overall"


class RatingLevel(int, Enum):
    ONE = 1
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5


class SurveyQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: SatisfactionCategory
    question_text: str
    rating: int = Field(ge=1, le=5)
    weight: float = 1.0


class SatisfactionSurvey(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    survey_id: str = Field(default_factory=lambda: uuid4().hex[:8])
    event_id: str
    family_id: str
    event_type: str = ""
    event_name: str = ""
    event_date: str = ""
    questions: list[SurveyQuestion] = Field(default_factory=list)
    comment: str = ""
    ai_assisted_comment: str = ""
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )
    overall_score: float = 0.0
    sentiment: str = ""
    sentiment_score: float = 0.0


class EventSatisfactionReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: str = Field(default_factory=lambda: uuid4().hex[:8])
    event_id: str
    event_name: str = ""
    total_responses: int = 0
    response_rate_pct: float = 0.0
    overall_avg: float = 0.0
    category_averages: dict[str, float] = Field(default_factory=dict)
    sentiment_distribution: dict[str, int] = Field(default_factory=dict)
    sentiment_trend: str = ""
    top_praises: list[str] = Field(default_factory=list)
    top_improvements: list[str] = Field(default_factory=list)
    ai_recommendations: list[str] = Field(default_factory=list)
    key_quotes: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(tz=timezone.utc)
    )


# ── Intelligence Enums ─────────────────────────────────────


class SatisfactionHealthLevel(str, Enum):
    """Health levels for satisfaction intelligence."""

    EXCELLENT = "excellent"
    HEALTHY = "healthy"
    ATTENTION = "attention"
    CRITICAL = "critical"


class SatisfactionProposalType(str, Enum):
    """Types of engagement proposals for satisfaction intelligence."""

    CATEGORY_REVIEW = "category_review"
    FORMAT_REPLICATION = "format_replication"
    SURVEY_FOLLOW_UP = "survey_follow_up"
    EVENT_REDESIGN = "event_redesign"
    STAFF_TRAINING = "staff_training"
    PRICING_REVIEW = "pricing_review"


class NPSSegment(str, Enum):
    """NPS classification based on overall satisfaction score."""

    PROMOTER = "promoter"    # 4.5+
    PASSIVE = "passive"      # 3.0 - 4.4
    DETRACTOR = "detractor"  # < 3.0


# ── Intelligence Models ────────────────────────────────────


class SatisfactionHealthFactor(BaseModel):
    """Individual factor contributing to satisfaction health score."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    score: float = Field(ge=0, le=100, description="Factor score 0-100")
    weight: float = Field(ge=0, le=1, description="Weight in composite")
    weighted_score: float = Field(ge=0, le=100)
    impact: str = Field(
        default="medium", description="high, medium, low"
    )
    detail: str = ""


class SatisfactionHealthScore(BaseModel):
    """Composite health score for satisfaction intelligence."""

    model_config = ConfigDict(from_attributes=True)

    score: int = Field(ge=0, le=100)
    level: SatisfactionHealthLevel = SatisfactionHealthLevel.HEALTHY
    factors: list[SatisfactionHealthFactor] = Field(default_factory=list)
    trend: str = Field(
        default="stable", description="improving, stable, declining"
    )
    summary: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class CategoryScore(BaseModel):
    """Score for a single satisfaction category across all events."""

    model_config = ConfigDict(from_attributes=True)

    category: str
    display_name: str = ""
    avg_score: float = 0.0
    trend: str = "stable"
    event_count: int = 0
    best_event: str = ""
    worst_event: str = ""
    vs_club_avg: float = Field(
        default=0.0,
        description="Positive = above club average",
    )


class EventTypeComparison(BaseModel):
    """Satisfaction comparison across event types."""

    model_config = ConfigDict(from_attributes=True)

    event_type: str
    display_name: str = ""
    event_count: int = 0
    avg_score: float = 0.0
    total_responses: int = 0
    sentiment_breakdown: dict[str, int] = Field(default_factory=dict)
    best_category: str = ""
    worst_category: str = ""
    vs_club_avg: float = 0.0
    trend: str = "stable"


class SentimentFlowPoint(BaseModel):
    """Single data point in sentiment time series."""

    model_config = ConfigDict(from_attributes=True)

    month: str = Field(description="YYYY-MM")
    avg_score: float = 0.0
    survey_count: int = 0
    positive_pct: float = 0.0
    negative_pct: float = 0.0
    neutral_pct: float = 0.0
    nps_proxy: float = Field(
        default=0.0,
        description="Promoters% - Detractors%",
    )


class NPSSummary(BaseModel):
    """NPS estimation based on satisfaction scores."""

    model_config = ConfigDict(from_attributes=True)

    nps_score: float = Field(
        default=0.0,
        description="NPS proxy: promoter% - detractor%",
    )
    promoter_pct: float = 0.0
    passive_pct: float = 0.0
    detractor_pct: float = 0.0
    promoter_count: int = 0
    passive_count: int = 0
    detractor_count: int = 0
    total_surveys: int = 0
    classification: str = Field(
        default="neutral",
        description="positive, neutral, negative",
    )


class SatisfactionIntelligence(BaseModel):
    """Complete intelligence dashboard for satisfaction."""

    model_config = ConfigDict(from_attributes=True)

    # Overview
    total_surveys: int = 0
    total_events_surveyed: int = 0
    overall_avg: float = 0.0
    response_rate_pct: float = 0.0

    # Category analysis
    category_scores: list[CategoryScore] = Field(default_factory=list)

    # Event type comparison
    event_type_comparisons: list[EventTypeComparison] = Field(
        default_factory=list
    )

    # Sentiment time series
    sentiment_flow: list[SentimentFlowPoint] = Field(
        default_factory=list
    )

    # NPS
    nps: NPSSummary | None = None

    # Cross-domain
    cross_domain_signals: list[dict[str, Any]] = Field(
        default_factory=list
    )

    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SatisfactionBenchmark(BaseModel):
    """Benchmark comparison for satisfaction metrics."""

    model_config = ConfigDict(from_attributes=True)

    metric: str
    current_value: float = 0.0
    club_average: float = 0.0
    benchmark_value: float = Field(
        default=0.0,
        description="CR private club benchmark",
    )
    vs_club: float = Field(
        default=0.0, description="Positive = above club avg"
    )
    vs_benchmark: float = Field(
        default=0.0, description="Positive = above benchmark"
    )
    status: str = Field(
        default="on_track",
        description="on_track, needs_attention, critical",
    )


class SatisfactionBenchmarkReport(BaseModel):
    """Complete benchmark report with per-category and per-event-type analysis."""

    model_config = ConfigDict(from_attributes=True)

    overall_benchmarks: list[SatisfactionBenchmark] = Field(
        default_factory=list
    )
    category_benchmarks: list[SatisfactionBenchmark] = Field(
        default_factory=list
    )
    event_type_benchmarks: list[SatisfactionBenchmark] = Field(
        default_factory=list
    )
    outlier_categories: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Categories significantly above or below average",
    )
    best_performing_event_type: str = ""
    worst_performing_event_type: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SatisfactionEngagementProposal(BaseModel):
    """A proactive engagement proposal from satisfaction intelligence."""

    model_config = ConfigDict(from_attributes=True)

    proposal_id: str = Field(
        default_factory=lambda: uuid4().hex[:8]
    )
    proposal_type: SatisfactionProposalType
    title: str
    description: str
    target_event_id: str = ""
    target_event_type: str = ""
    target_category: str = ""
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


class SatisfactionEngagementProposalList(BaseModel):
    """Collection of satisfaction engagement proposals."""

    model_config = ConfigDict(from_attributes=True)

    proposals: list[SatisfactionEngagementProposal] = Field(
        default_factory=list
    )
    total: int = 0
    high_priority_count: int = 0
    cross_domain_count: int = 0
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class SatisfactionIntelligenceReport(BaseModel):
    """Full intelligence report combining all satisfaction dimensions."""

    model_config = ConfigDict(from_attributes=True)

    health_score: SatisfactionHealthScore | None = None
    intelligence: SatisfactionIntelligence | None = None
    benchmarks: SatisfactionBenchmarkReport | None = None
    proposals: SatisfactionEngagementProposalList | None = None
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
