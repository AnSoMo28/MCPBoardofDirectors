"""Wellness domain models for the Club MCP platform."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ─────────────────────────────────────────────────


class WellnessGoalType(str, Enum):
    FITNESS = "fitness"
    NUTRITION = "nutrition"
    MENTAL_HEALTH = "mental_health"
    WEIGHT = "weight"
    FLEXIBILITY = "flexibility"
    ENDURANCE = "endurance"
    STRENGTH = "strength"
    CUSTOM = "custom"


class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    ABANDONED = "abandoned"


class ActivityType(str, Enum):
    GYM = "gym"
    YOGA = "yoga"
    PILATES = "pilates"
    SWIMMING = "swimming"
    TENNIS = "tennis"
    SPA = "spa"
    PERSONAL_TRAINING = "personal_training"
    GROUP_CLASS = "group_class"
    MEDITATION = "meditation"
    OTHER = "other"


class ClassLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class WellnessRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WellnessAnomalyType(str, Enum):
    ENGAGEMENT_DROP = "engagement_drop"
    ACTIVITY_GAP = "activity_gap"
    GOAL_STAGNATION = "goal_stagnation"
    INCONSISTENCY = "inconsistency"
    OVERTRAINING = "overtraining"
    DECLINING_PARTICIPATION = "declining_participation"


# ── Core models ───────────────────────────────────────────


class WellnessProfile(BaseModel):
    """Wellness profile for a member/family."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    family_id: str
    family_name: str = ""
    fitness_level: ClassLevel = ClassLevel.BEGINNER
    health_conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    dietary_restrictions: list[str] = Field(default_factory=list)
    preferred_activities: list[str] = Field(default_factory=list)
    emergency_contact: str = ""
    emergency_phone: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WellnessGoal(BaseModel):
    """A wellness goal set by a member."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    family_id: str
    goal_type: WellnessGoalType
    title: str
    description: str = ""
    target_value: float = 0.0
    current_value: float = 0.0
    unit: str = ""
    status: GoalStatus = GoalStatus.ACTIVE
    target_date: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WellnessActivity(BaseModel):
    """A logged wellness activity."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    family_id: str
    member_name: str = ""
    activity_type: ActivityType
    description: str = ""
    duration_minutes: int = 0
    calories_burned: int = 0
    distance_km: float = 0.0
    notes: str = ""
    date: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WellnessClass(BaseModel):
    """A wellness class available at the club."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    name: str
    description: str = ""
    activity_type: ActivityType
    instructor: str = ""
    level: ClassLevel = ClassLevel.ALL_LEVELS
    max_participants: int = 0
    duration_minutes: int = 60
    location: str = ""
    schedule_day: str = ""
    schedule_time: str = ""
    enrolled_count: int = 0


class ClassAppointment(BaseModel):
    """A scheduled class appointment."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    class_id: str
    class_name: str = ""
    family_id: str
    member_name: str = ""
    date: str = ""
    time: str = ""
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WellnessRecommendation(BaseModel):
    """A personalized wellness recommendation."""

    model_config = ConfigDict(from_attributes=True)

    category: str
    title: str
    description: str
    priority: str = "medium"
    related_class_id: str = ""


class WellnessReport(BaseModel):
    """Wellness analytics report."""

    model_config = ConfigDict(from_attributes=True)

    period_start: str
    period_end: str
    total_activities: int = 0
    total_minutes: int = 0
    total_calories: int = 0
    most_frequent_activity: str = ""
    activity_breakdown: list[dict[str, Any]] = Field(default_factory=list)
    goals_summary: dict[str, int] = Field(default_factory=dict)
    streak_days: int = 0
    summary: str = ""


class WellnessPrediction(BaseModel):
    """Wellness engagement and risk prediction for a family."""

    model_config = ConfigDict(from_attributes=True)

    family_id: str
    risk_level: WellnessRiskLevel = WellnessRiskLevel.LOW
    engagement_score: float = 0.0
    predicted_trend: str = "stable"
    churn_risk_pct: float = 0.0
    activity_forecast: dict[str, Any] = Field(default_factory=dict)
    factors: list[dict[str, Any]] = Field(default_factory=list)
    top_recommendation: str = ""
    confidence: float = 0.0


class WellnessAnomaly(BaseModel):
    """A single wellness anomaly detected in member data."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    anomaly_type: WellnessAnomalyType
    severity: WellnessRiskLevel = WellnessRiskLevel.MEDIUM
    title: str = ""
    description: str = ""
    detected_value: float = 0.0
    expected_min: float = 0.0
    expected_max: float = 0.0
    affected_member: str = ""
    detected_at: str = ""
    suggested_action: str = ""


class WellnessAnomalyResponse(BaseModel):
    """Response wrapper for wellness anomaly detection."""

    model_config = ConfigDict(from_attributes=True)

    family_id: str
    total_anomalies: int = 0
    critical_count: int = 0
    anomalies: list[WellnessAnomaly] = Field(default_factory=list)
    summary: str = ""


# ── Correlation Models ─────────────────────────────────────


class WellnessCorrelation(BaseModel):
    """Single wellness-to-domain correlation."""

    model_config = ConfigDict(from_attributes=True)

    coefficient: float = 0.0
    significance: str = "low"


class WellnessSegmentInsight(BaseModel):
    """Metrics for a wellness engagement segment."""

    model_config = ConfigDict(from_attributes=True)

    segment: str = ""
    wellness_score_range: list[float] = Field(default_factory=lambda: [0.0, 0.0])
    avg_monthly_spend_crc: float = 0.0
    retention_rate: float = 0.0
    nps: float = 0.0
    member_count: int = 0


class WellnessActivityValue(BaseModel):
    """Value ranking of a wellness activity."""

    model_config = ConfigDict(from_attributes=True)

    activity: str = ""
    avg_participants: float = 0.0
    monthly_revenue_impact_crc: float = 0.0
    satisfaction_correlation: float = 0.0
    churn_risk_reduction: float = 0.0


class WellnessCorrelateResponse(BaseModel):
    """Cross-domain wellness correlations and business insights."""

    model_config = ConfigDict(from_attributes=True)

    correlations: dict[str, WellnessCorrelation] = Field(default_factory=dict)
    segment_insights: list[WellnessSegmentInsight] = Field(default_factory=list)
    activity_value_ranking: list[WellnessActivityValue] = Field(default_factory=list)


# ── Insights Models ────────────────────────────────────────


class WellnessKeyFinding(BaseModel):
    """A key finding from wellness analysis."""

    model_config = ConfigDict(from_attributes=True)

    category: str = ""
    finding: str = ""
    impact: str = "medium"
    action: str = ""


class WellnessCriticalInsight(BaseModel):
    """A critical insight requiring immediate attention."""

    model_config = ConfigDict(from_attributes=True)

    insight: str = ""
    confidence: float = 0.0
    recommended_action: str = ""
    deadline: str = ""


class WellnessInsightsResponse(BaseModel):
    """Comprehensive wellness insights for a family."""

    model_config = ConfigDict(from_attributes=True)

    generated_at: str = ""
    health_score: float = 0.0
    executive_summary: str = ""
    key_findings: list[WellnessKeyFinding] = Field(default_factory=list)
    trend_analysis: dict[str, str] = Field(default_factory=dict)
    critical_insights: list[WellnessCriticalInsight] = Field(default_factory=list)
    predictions: dict[str, Any] = Field(default_factory=dict)
