"""ML Intelligence domain models for Castillo Country Club.

Models for anomaly detection, forecasting, churn prediction,
member segmentation, data quality, model health, conversational AI,
and hypothetical simulation.

Updated (F44):
- Prophet forecast components (trend, seasonal)
- Ensemble anomaly detection (Isolation Forest + IQR)
- PSI drift detection
- Model health with drift scoring
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────────


class MLHealthLevel(str, Enum):
    """Health levels for ML intelligence system."""

    EXCELLENT = "excellent"
    HEALTHY = "healthy"
    ATTENTION = "attention"
    CRITICAL = "critical"


class AnomalySeverity(str, Enum):
    """Severity levels for detected anomalies."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AnomalyType(str, Enum):
    """Types of anomalies the system detects."""

    POINT = "point"
    CONTEXTUAL = "contextual"
    COLLECTIVE = "collective"
    DRIFT = "drift"


class ForecastTarget(str, Enum):
    """Targets for demand forecasting."""

    REVENUE = "revenue"
    MEMBERSHIP = "membership"
    EVENT_ATTENDANCE = "event_attendance"
    FACILITY_OCCUPANCY = "facility_occupancy"
    GUEST_VOLUME = "guest_volume"
    SATISFACTION = "satisfaction"


class SegmentLabel(str, Enum):
    """Labels for member segments."""

    CHAMPION = "champion"
    LOYAL = "loyal"
    POTENTIAL = "potential"
    AT_RISK = "at_risk"
    DORMANT = "dormant"


class DomainCoverageStatus(str, Enum):
    """Data coverage status for a domain."""

    EXCELLENT = "excellent"
    GOOD = "good"
    PARTIAL = "partial"
    MINIMAL = "minimal"


class ScenarioType(str, Enum):
    """Types of simulation scenarios."""

    OPTIMISTIC = "optimistic"
    BASE = "base"
    PESSIMISTIC = "pessimistic"


class DriftStatus(str, Enum):
    """Drift detection status."""

    STABLE = "stable"
    MILD = "mild"
    SIGNIFICANT = "significant"
    SEVERE = "severe"


# ── Anomaly Models ─────────────────────────────────────────


class AnomalyFactor(BaseModel):
    """A factor contributing to an anomaly detection."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    value: float = 0.0
    expected_range_min: float = 0.0
    expected_range_max: float = 0.0
    deviation_sigma: float = Field(
        default=0.0,
        description="Standard deviations from mean",
    )
    contribution_pct: float = Field(
        ge=0, le=100, default=0.0,
        description="How much this factor contributed to anomaly score",
    )


class EnsembleVote(BaseModel):
    """Vote from a single detection method in the ensemble."""

    model_config = ConfigDict(from_attributes=True)

    method: str = Field(
        description="Detection method: isolation_forest, iqr, z_score"
    )
    is_anomaly: bool = False
    score: float = Field(
        default=0.0,
        description="Anomaly score from this method (0-1)",
    )
    threshold: float = Field(
        default=0.5,
        description="Threshold used for this method",
    )


class Anomaly(BaseModel):
    """A detected anomaly in any domain."""

    model_config = ConfigDict(from_attributes=True)

    anomaly_id: str = Field(
        default_factory=lambda: uuid4().hex[:8]
    )
    domain: str = Field(
        description="Source domain (finance, events, satisfaction, etc.)"
    )
    metric: str = Field(description="Which metric is anomalous")
    anomaly_type: AnomalyType = AnomalyType.POINT
    severity: AnomalySeverity = AnomalySeverity.MEDIUM
    current_value: float = 0.0
    expected_value: float = 0.0
    deviation_pct: float = 0.0
    confidence: float = Field(ge=0, le=1, default=0.5)
    factors: list[AnomalyFactor] = Field(default_factory=list)
    explanation: str = ""
    affected_domains: list[str] = Field(default_factory=list)
    suggested_action: str = ""
    detected_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    detection_method: str = Field(
        default="z_score_iqr",
        description="Method used: ensemble, isolation_forest, z_score_iqr",
    )
    ensemble_consensus: str = Field(
        default="single",
        description="Consensus level: unanimous, majority, single",
    )
    ensemble_votes: list[EnsembleVote] = Field(
        default_factory=list,
        description="Individual votes from ensemble methods",
    )


class AnomalyReport(BaseModel):
    """Complete anomaly detection report."""

    model_config = ConfigDict(from_attributes=True)

    anomalies: list[Anomaly] = Field(default_factory=list)
    total_anomalies: int = 0
    critical_count: int = 0
    high_count: int = 0
    domains_affected: list[str] = Field(default_factory=list)
    systemic_risk_score: float = Field(
        ge=0, le=100, default=0.0,
        description="Composite risk from all anomalies",
    )
    detection_method: str = Field(
        default="ensemble",
        description="Detection method: ensemble or legacy",
    )
    ensemble_size: int = Field(
        default=2,
        description="Number of methods in ensemble",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Forecast Models ────────────────────────────────────────


class ForecastFactor(BaseModel):
    """A factor influencing a forecast prediction."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    weight: float = Field(ge=0, le=1, default=0.0)
    direction: str = Field(
        default="neutral",
        description="positive, negative, neutral",
    )
    description: str = ""


class ForecastPoint(BaseModel):
    """Single point in a forecast time series."""

    model_config = ConfigDict(from_attributes=True)

    period: str = Field(description="e.g., '2026-07', 'Q3 2026'")
    predicted_value: float = 0.0
    lower_bound: float = Field(
        default=0.0, description="CI lower bound (95%)"
    )
    upper_bound: float = Field(
        default=0.0, description="CI upper bound (95%)"
    )
    confidence: float = Field(ge=0, le=1, default=0.5)
    trend_component: float | None = Field(
        default=None,
        description="Prophet trend component (None if exp smoothing)",
    )
    seasonal_component: float | None = Field(
        default=None,
        description="Prophet seasonal + holiday component",
    )


class DemandForecast(BaseModel):
    """Demand forecast for a specific target."""

    model_config = ConfigDict(from_attributes=True)

    target: ForecastTarget
    display_name: str = ""
    current_value: float = 0.0
    forecast_points: list[ForecastPoint] = Field(
        default_factory=list
    )
    factors: list[ForecastFactor] = Field(default_factory=list)
    seasonal_pattern: str = ""
    trend: str = Field(
        default="stable",
        description="improving, stable, declining",
    )
    vs_last_period_pct: float = 0.0
    data_quality_note: str = ""
    model_type: str = Field(
        default="exponential_smoothing",
        description="Model used: prophet or exponential_smoothing",
    )
    prophet_components: dict[str, float] | None = Field(
        default=None,
        description="Prophet decomposition (trend, yearly, holidays)",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class RevenueScenario(BaseModel):
    """A revenue scenario (optimistic/base/pessimistic)."""

    model_config = ConfigDict(from_attributes=True)

    scenario_type: ScenarioType
    label: str = ""
    monthly_values: dict[str, float] = Field(
        default_factory=dict, description="YYYY-MM → value"
    )
    quarterly_total: float = 0.0
    vs_budget_pct: float = 0.0
    probability: float = Field(ge=0, le=1, default=0.5)
    key_assumptions: list[str] = Field(default_factory=list)


class RevenueForecast(BaseModel):
    """Complete revenue forecast with scenarios."""

    model_config = ConfigDict(from_attributes=True)

    horizon_months: int = 3
    current_monthly_revenue: float = 0.0
    budget_monthly: float = 0.0
    scenarios: list[RevenueScenario] = Field(default_factory=list)
    recommended_scenario: ScenarioType = ScenarioType.BASE
    factors: list[ForecastFactor] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1, default=0.5)
    model_type: str = Field(
        default="exponential_smoothing",
        description="Model used: prophet or exponential_smoothing",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Churn ML Models ────────────────────────────────────────


class ChurnMLScore(BaseModel):
    """ML churn score for an individual member."""

    model_config = ConfigDict(from_attributes=True)

    member_id: str
    member_name: str = ""
    tier: str = ""
    ml_churn_score: float = Field(
        ge=0, le=100,
        description="ML-predicted churn probability 0-100",
    )
    rule_churn_score: float = Field(
        ge=0, le=100,
        description="Rule-based churn score 0-100",
    )
    discrepancy: float = Field(
        default=0.0,
        description="ml_score - rule_score (positive = ML more pessimistic)",
    )
    churn_risk: str = Field(
        default="medium", description="low, medium, high, critical"
    )
    top_features: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{feature, importance, direction}]",
    )
    explanation: str = ""
    recommended_action: str = ""


class ChurnMLReport(BaseModel):
    """Complete ML churn analysis report."""

    model_config = ConfigDict(from_attributes=True)

    scores: list[ChurnMLScore] = Field(default_factory=list)
    total_at_risk: int = 0
    total_analyzed: int = 0
    avg_ml_score: float = 0.0
    avg_rule_score: float = 0.0
    significant_discrepancies: int = Field(
        default=0,
        description="Members where |ml - rule| > 15 points",
    )
    top_churn_features: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Global feature importance for churn model",
    )
    segment_breakdown: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Churn stats per tier/segment",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Segmentation Models ────────────────────────────────────


class MemberSegment(BaseModel):
    """A member segment from clustering analysis."""

    model_config = ConfigDict(from_attributes=True)

    segment_id: str = Field(
        default_factory=lambda: uuid4().hex[:6]
    )
    label: SegmentLabel
    display_name: str = ""
    member_count: int = 0
    percentage: float = Field(ge=0, le=100, default=0.0)
    avg_ltv: float = 0.0
    avg_engagement: float = 0.0
    avg_satisfaction: float = 0.0
    avg_visit_frequency: float = 0.0
    churn_risk_pct: float = Field(
        ge=0, le=100, default=0.0,
        description="% of segment with high churn risk",
    )
    revenue_contribution_pct: float = Field(
        ge=0, le=100, default=0.0,
    )
    characteristics: list[str] = Field(default_factory=list)
    recommended_strategy: str = ""
    key_features: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{feature, value, vs_avg}]",
    )


class MemberSegmentation(BaseModel):
    """Complete member segmentation report."""

    model_config = ConfigDict(from_attributes=True)

    segments: list[MemberSegment] = Field(default_factory=list)
    total_members: int = 0
    silhouette_score: float = Field(
        ge=-1, le=1, default=0.5,
        description="Clustering quality metric (higher = better)",
    )
    optimal_k: int = Field(
        default=5, description="Optimal number of clusters"
    )
    key_differentiators: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Data Quality Models ────────────────────────────────────


class DomainQualityScore(BaseModel):
    """Data quality score for a single domain."""

    model_config = ConfigDict(from_attributes=True)

    domain: str
    display_name: str = ""
    completeness_pct: float = Field(ge=0, le=100, default=0.0)
    freshness_hours: float = Field(
        default=0.0,
        description="Hours since last data update",
    )
    consistency_score: float = Field(
        ge=0, le=100, default=0.0,
        description="Cross-field consistency check",
    )
    overall_score: float = Field(ge=0, le=100, default=0.0)
    status: DomainCoverageStatus = DomainCoverageStatus.GOOD
    gaps: list[str] = Field(default_factory=list)
    recommendation: str = ""


class DataQualityReport(BaseModel):
    """Complete data quality assessment across all domains."""

    model_config = ConfigDict(from_attributes=True)

    overall_score: float = Field(ge=0, le=100, default=0.0)
    overall_status: DomainCoverageStatus = DomainCoverageStatus.GOOD
    domains: list[DomainQualityScore] = Field(default_factory=list)
    total_domains: int = 0
    domains_ready_for_ml: int = Field(
        default=0,
        description="Domains with quality > 60% (safe for ML)",
    )
    critical_gaps: list[str] = Field(default_factory=list)
    recommendation: str = ""
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Model Health Models ────────────────────────────────────


class DriftReport(BaseModel):
    """PSI-based drift assessment for a single model."""

    model_config = ConfigDict(from_attributes=True)

    model_name: str = ""
    psi_score: float = Field(
        ge=0, default=0.0,
        description=(
            "Population Stability Index: "
            "<0.10 stable, 0.10-0.20 mild, >0.20 significant"
        ),
    )
    status: DriftStatus = DriftStatus.STABLE
    baseline_window: str = Field(
        default="",
        description="Training baseline period (e.g., '2026-01 to 2026-03')",
    )
    current_window: str = Field(
        default="",
        description="Current evaluation window (e.g., '2026-04 to 2026-06')",
    )
    bins_used: int = Field(default=10, description="Number of PSI bins")
    retrain_recommended: bool = False
    details: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Per-bin PSI breakdown for debugging",
    )


class ModelPerformance(BaseModel):
    """Performance metrics for a single ML model."""

    model_config = ConfigDict(from_attributes=True)

    model_name: str
    display_name: str = ""
    model_type: str = Field(
        description="anomaly_detection, forecasting, churn, clustering"
    )
    accuracy: float = Field(ge=0, le=100, default=0.0)
    mae: float = Field(default=0.0, description="Mean Absolute Error")
    mape: float = Field(
        default=0.0, description="Mean Absolute Percentage Error"
    )
    drift_detected: bool = False
    drift_magnitude: float = Field(
        ge=0, default=0.0,
        description="0 = no drift, >0.3 = significant",
    )
    feature_importance: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{feature, importance_pct}]",
    )
    last_trained: str = Field(
        default="", description="ISO datetime of last training"
    )
    training_samples: int = 0
    status: str = Field(
        default="healthy", description="healthy, degraded, retrain_needed"
    )
    psi_score: float | None = Field(
        default=None,
        description=(
            "PSI value if computed: <0.10 stable, "
            "0.10-0.20 mild, >0.20 significant drift"
        ),
    )
    psi_status: DriftStatus | None = Field(
        default=None,
        description="PSI-based drift status",
    )
    retrain_threshold: float = Field(
        default=0.20,
        description="PSI threshold that triggers retrain recommendation",
    )


class ModelHealthReport(BaseModel):
    """Complete ML model health report."""

    model_config = ConfigDict(from_attributes=True)

    models: list[ModelPerformance] = Field(default_factory=list)
    total_models: int = 0
    healthy_count: int = 0
    degraded_count: int = 0
    retrain_needed_count: int = 0
    avg_accuracy: float = 0.0
    any_drift: bool = False
    next_scheduled_training: str = ""
    overall_drift_status: DriftStatus = Field(
        default=DriftStatus.STABLE,
        description="Aggregate drift across all models",
    )
    drift_reports: list[DriftReport] = Field(
        default_factory=list,
        description="Per-model PSI drift reports",
    )
    next_evaluation: str = Field(
        default="",
        description="When next PSI evaluation runs",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Chat Models ────────────────────────────────────────────


class ChatContext(BaseModel):
    """Context provided to the conversational AI."""

    model_config = ConfigDict(from_attributes=True)

    active_domains: list[str] = Field(default_factory=list)
    recent_anomalies: int = 0
    active_insights: int = 0
    latest_predictions: dict[str, Any] = Field(default_factory=dict)
    member_count: int = 0
    current_month: str = ""


class ChatResponse(BaseModel):
    """Response from the Club Manager AI."""

    model_config = ConfigDict(from_attributes=True)

    conversation_id: str = Field(
        default_factory=lambda: uuid4().hex[:8]
    )
    answer: str = ""
    evidence: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{source, data, confidence}]",
    )
    related_insights: list[str] = Field(default_factory=list)
    suggested_action: dict[str, Any] | None = None
    confidence: float = Field(ge=0, le=1, default=0.5)
    context_used: list[str] = Field(
        default_factory=list,
        description="Which domains/data were used",
    )
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Simulation Models ──────────────────────────────────────


class SimulationScenario(BaseModel):
    """A single simulation scenario."""

    model_config = ConfigDict(from_attributes=True)

    scenario_type: ScenarioType
    label: str = ""
    description: str = ""
    predictions: dict[str, Any] = Field(default_factory=dict)
    probability: float = Field(ge=0, le=1, default=0.33)
    key_assumptions: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class SimulationResponse(BaseModel):
    """Response from the hypothetical simulator."""

    model_config = ConfigDict(from_attributes=True)

    question: str = ""
    scenarios: list[SimulationScenario] = Field(
        default_factory=list
    )
    recommended_scenario: ScenarioType = ScenarioType.BASE
    risk_assessment: str = ""
    cross_domain_impacts: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{domain, impact, severity}]",
    )
    confidence: float = Field(ge=0, le=1, default=0.5)
    data_sources: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── Prediction Explanation ─────────────────────────────────


class PredictionExplanation(BaseModel):
    """Detailed explanation of a prediction's factors."""

    model_config = ConfigDict(from_attributes=True)

    prediction_id: str = ""
    prediction_type: str = Field(
        description="churn, revenue, demand, anomaly"
    )
    predicted_value: float = 0.0
    factors: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{feature, weight, direction, value, explanation}]",
    )
    sensitivity: list[dict[str, Any]] = Field(
        default_factory=list,
        description="[{change, impact_on_prediction}]",
    )
    comparison_to_rules: str = ""
    confidence: float = Field(ge=0, le=1, default=0.5)
    limitations: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
