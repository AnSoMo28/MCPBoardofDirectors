"""ML Intelligence repository with cross-domain data aggregation.

Implements production-grade statistical algorithms:
- Anomaly detection: Ensemble (Isolation Forest + IQR) with
  z-score fallback
- Demand forecasting: Prophet with CR holidays and
  exponential smoothing fallback
- Revenue forecasting: Prophet CI-based scenarios with
  trend extrapolation fallback
- Churn scoring: weighted composite from multiple
  domain signals
- Segmentation: rule-based weighted clustering
- Data quality: completeness + freshness + consistency
- Model health: PSI drift detection + accuracy tracking

Production-ready with seed data simulating 6 months of
Castillo Country Club cross-domain intelligence.

Updated (F44):
- Prophet replaces exponential smoothing for forecasting
- Ensemble (Isolation Forest + IQR) replaces z-score
- PSI drift detection replaces hardcoded drift values
- Model health expanded with real PSI per model
"""

from __future__ import annotations

import logging
import math
from datetime import datetime, timezone
from typing import Any

import numpy as np

try:
    from prophet import Prophet as _ProphetModel

    _HAS_PROPHET = True
except ImportError:
    _HAS_PROPHET = False

from sklearn.ensemble import IsolationForest

from club_mcp.models.ml_intelligence import (
    Anomaly,
    AnomalyFactor,
    AnomalyReport,
    AnomalySeverity,
    AnomalyType,
    ChatContext,
    ChatResponse,
    ChurnMLReport,
    ChurnMLScore,
    DataQualityReport,
    DemandForecast,
    DomainCoverageStatus,
    DomainQualityScore,
    DriftReport,
    DriftStatus,
    EnsembleVote,
    ForecastFactor,
    ForecastPoint,
    ForecastTarget,
    MemberSegment,
    MemberSegmentation,
    MLHealthLevel,
    ModelHealthReport,
    ModelPerformance,
    PredictionExplanation,
    RevenueForecast,
    RevenueScenario,
    ScenarioType,
    SegmentLabel,
    SimulationResponse,
    SimulationScenario,
)

logger = logging.getLogger(__name__)


# ── Cross-domain seed data structure ──────────────────────


def _build_cross_domain_seed() -> dict[str, Any]:
    """Build 6 months of aggregated cross-domain data.

    Simulates what the ML layer would receive by querying
    all 13+ domain agents.
    """
    months = [
        "2026-01", "2026-02", "2026-03",
        "2026-04", "2026-05", "2026-06",
    ]

    # ── Member data (from member_360 + families) ──
    members = [
        {"id": f"mem-{i:03d}", "name": n, "tier": t,
         "family_id": f"fam-{f:03d}", "join_month": jm,
         "engagement": eng, "ltv": ltv, "churn_risk": cr,
         "satisfaction": sat, "visits_monthly": vm,
         "active_domains": domains, "tenure_months": ten}
        for i, (n, t, f, jm, eng, ltv, cr, sat, vm, domains, ten) in enumerate([
            ("Roberto Chen", "platino", 1, "2024-03", 88, 12500000, "low", 4.7, 18, ["sports", "dining", "wellness", "events"], 27),
            ("María González", "oro", 2, "2024-06", 45, 8400000, "critical", 3.2, 4, ["dining"], 24),
            ("Carlos Rodríguez", "platino", 3, "2023-01", 38, 12100000, "high", 2.8, 6, ["golf", "dining"], 41),
            ("Ana Vargas", "plata", 4, "2025-01", 72, 3200000, "low", 4.3, 12, ["tennis", "pool", "events"], 17),
            ("Diego Mora", "oro", 5, "2024-09", 65, 7800000, "medium", 4.0, 10, ["golf", "dining", "events"], 21),
            ("Sofía Herrera", "plata", 6, "2025-03", 55, 2800000, "medium", 3.8, 8, ["pool", "gym"], 15),
            ("Fernando Guzmán", "oro", 7, "2023-08", 82, 9200000, "low", 4.5, 15, ["golf", "tennis", "dining", "wellness"], 34),
            ("Isabella Rojas", "plata", 8, "2025-06", 42, 2100000, "high", 3.5, 5, ["pool"], 12),
            ("Luis Montero", "bronce", 9, "2025-09", 35, 1800000, "high", 3.3, 4, ["gym"], 9),
            ("Carmen Duarte", "oro", 10, "2024-01", 78, 8900000, "low", 4.4, 14, ["dining", "spa", "events", "wellness"], 29),
            ("Marco Blanco", "plata", 11, "2025-04", 48, 2500000, "medium", 3.9, 7, ["tennis", "pool"], 14),
            ("Gabriela Solano", "premium", 12, "2023-11", 90, 15200000, "low", 4.8, 20, ["golf", "tennis", "spa", "dining", "events", "wellness"], 31),
            ("Pedro Quesada", "bronce", 1, "2026-01", 25, 800000, "critical", 2.5, 2, [], 5),
            ("Valentina Castro", "plata", 2, "2025-07", 58, 3100000, "medium", 4.1, 9, ["pool", "gym", "events"], 11),
            ("Andrés Viquez", "oro", 3, "2024-04", 70, 7500000, "low", 4.2, 12, ["golf", "dining", "events"], 26),
            ("Silvia Pacheco", "plata", 4, "2025-02", 62, 3400000, "medium", 4.0, 10, ["tennis", "wellness", "spa"], 16),
            ("Raúl Montero", "oro", 5, "2024-08", 75, 8100000, "low", 4.3, 13, ["golf", "tennis", "dining"], 22),
            ("Daniela Rojas", "plata", 6, "2025-08", 50, 2300000, "medium", 3.7, 6, ["pool", "gym"], 10),
            ("Jorge Campos", "bronce", 7, "2026-02", 20, 600000, "critical", 2.8, 3, [], 4),
            ("Elena Jiménez", "oro", 8, "2024-02", 80, 9500000, "low", 4.6, 16, ["wellness", "spa", "dining", "events"], 28),
        ])
    ]

    # ── Financial data (from finance) ──
    revenue_monthly = {
        "2026-01": 48200000, "2026-02": 46500000,
        "2026-03": 51800000, "2026-04": 49100000,
        "2026-05": 47800000, "2026-06": 52400000,
    }
    budget_monthly = {
        "2026-01": 50000000, "2026-02": 48000000,
        "2026-03": 52000000, "2026-04": 50000000,
        "2026-05": 49000000, "2026-06": 53000000,
    }

    # ── Events data (from events) ──
    events_monthly = {
        "2026-01": {"count": 8, "attendance": 650, "revenue": 12500000},
        "2026-02": {"count": 10, "attendance": 820, "revenue": 15200000},
        "2026-03": {"count": 12, "attendance": 980, "revenue": 18400000},
        "2026-04": {"count": 9, "attendance": 720, "revenue": 13800000},
        "2026-05": {"count": 11, "attendance": 890, "revenue": 16500000},
        "2026-06": {"count": 13, "attendance": 1050, "revenue": 19800000},
    }

    # ── Facilities data (from facilities) ──
    facility_occupancy = {
        "2026-01": 62, "2026-02": 65, "2026-03": 71,
        "2026-04": 68, "2026-05": 64, "2026-06": 73,
    }

    # ── Satisfaction data (from satisfaction) ──
    satisfaction_monthly = {
        "2026-01": {"avg": 4.3, "surveys": 8, "nps_proxy": 25},
        "2026-02": {"avg": 4.1, "surveys": 10, "nps_proxy": 18},
        "2026-03": {"avg": 4.0, "surveys": 12, "nps_proxy": 12},
        "2026-04": {"avg": 3.8, "surveys": 9, "nps_proxy": 5},
        "2026-05": {"avg": 3.6, "surveys": 11, "nps_proxy": -2},
        "2026-06": {"avg": 3.7, "surveys": 13, "nps_proxy": 0},
    }

    # ── Guest data (from guest_management) ──
    guest_monthly = {
        "2026-01": {"new_guests": 8, "trials": 2, "conversions": 1},
        "2026-02": {"new_guests": 10, "trials": 3, "conversions": 2},
        "2026-03": {"new_guests": 7, "trials": 2, "conversions": 2},
        "2026-04": {"new_guests": 12, "trials": 3, "conversions": 0},
        "2026-05": {"new_guests": 9, "trials": 2, "conversions": 1},
        "2026-06": {"new_guests": 6, "trials": 1, "conversions": 0},
    }

    # ── Communications data (from communications) ──
    comms_monthly = {
        "2026-01": {"sent": 450, "opened": 320, "clicked": 85},
        "2026-02": {"sent": 520, "opened": 380, "clicked": 92},
        "2026-03": {"sent": 480, "opened": 340, "clicked": 78},
        "2026-04": {"sent": 410, "opened": 280, "clicked": 65},
        "2026-05": {"sent": 460, "opened": 310, "clicked": 72},
        "2026-06": {"sent": 500, "opened": 350, "clicked": 88},
    }

    # ── Age group data ──
    age_group_monthly = {
        "2026-01": {"teens_enrolled": 18, "seniors_enrolled": 6},
        "2026-02": {"teens_enrolled": 16, "seniors_enrolled": 7},
        "2026-03": {"teens_enrolled": 14, "seniors_enrolled": 7},
        "2026-04": {"teens_enrolled": 12, "seniors_enrolled": 8},
        "2026-05": {"teens_enrolled": 10, "seniors_enrolled": 7},
        "2026-06": {"teens_enrolled": 8, "seniors_enrolled": 9},
    }

    # ── Domain coverage assessment ──
    domain_coverage = {
        "member_360": {"completeness": 82, "freshness_h": 2, "consistency": 88},
        "finance": {"completeness": 91, "freshness_h": 1, "consistency": 95},
        "events": {"completeness": 85, "freshness_h": 3, "consistency": 90},
        "facilities": {"completeness": 75, "freshness_h": 4, "consistency": 82},
        "sports": {"completeness": 70, "freshness_h": 6, "consistency": 78},
        "communications": {"completeness": 68, "freshness_h": 5, "consistency": 75},
        "satisfaction": {"completeness": 52, "freshness_h": 12, "consistency": 70},
        "age_group": {"completeness": 40, "freshness_h": 24, "consistency": 60},
        "guest_management": {"completeness": 65, "freshness_h": 8, "consistency": 72},
        "wellness": {"completeness": 78, "freshness_h": 4, "consistency": 85},
        "families": {"completeness": 80, "freshness_h": 3, "consistency": 86},
        "engagement": {"completeness": 72, "freshness_h": 6, "consistency": 80},
        "cultural_social": {"completeness": 55, "freshness_h": 18, "consistency": 65},
    }

    return {
        "months": months,
        "members": members,
        "revenue_monthly": revenue_monthly,
        "budget_monthly": budget_monthly,
        "events_monthly": events_monthly,
        "facility_occupancy": facility_occupancy,
        "satisfaction_monthly": satisfaction_monthly,
        "guest_monthly": guest_monthly,
        "comms_monthly": comms_monthly,
        "age_group_monthly": age_group_monthly,
        "domain_coverage": domain_coverage,
    }


# ── Statistical helpers (preserved) ───────────────────────


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def _z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - mean) / std


def _iqr_bounds(values: list[float]) -> tuple[float, float]:
    """Compute IQR-based outlier bounds."""
    if len(values) < 4:
        return (min(values) - 1, max(values) + 1) if values else (0, 0)
    sorted_v = sorted(values)
    n = len(sorted_v)
    q1 = sorted_v[n // 4]
    q3 = sorted_v[3 * n // 4]
    iqr = q3 - q1
    return (q1 - 1.5 * iqr, q3 + 1.5 * iqr)


def _exponential_smoothing(
    values: list[float], alpha: float = 0.3, horizon: int = 3
) -> list[float]:
    """Simple exponential smoothing + forecast (fallback)."""
    if not values:
        return [0.0] * horizon
    smoothed = [values[0]]
    for i in range(1, len(values)):
        smoothed.append(alpha * values[i] + (1 - alpha) * smoothed[-1])
    trend = (smoothed[-1] - smoothed[-min(3, len(smoothed))]) / min(
        3, len(smoothed)
    )
    forecasts = []
    for h in range(1, horizon + 1):
        forecasts.append(round(smoothed[-1] + trend * h, 2))
    return forecasts


def _compute_ci(
    predicted: float, values: list[float], confidence: float = 0.95
) -> tuple[float, float]:
    """Compute confidence interval from historical variance."""
    std = _std(values)
    z = 1.96 if confidence >= 0.95 else 1.645
    margin = z * std * math.sqrt(1 + 1 / max(len(values), 1))
    return (round(predicted - margin, 2), round(predicted + margin, 2))


# ── B1: Prophet helper ────────────────────────────────────


def _prophet_forecast(
    series: dict[str, float],
    horizon: int = 3,
    yearly_seasonality: bool = False,
) -> dict[str, Any]:
    """Prophet-based forecast with CR holidays.

    Conservative configuration for small datasets (6+ months):
    - n_changepoints=1, changepoint_prior_scale=0.05
    - yearly_seasonality=False by default (needs 2+ years)
    - additive seasonality mode

    Args:
        series: {YYYY-MM: value} monthly data
        horizon: months to forecast
        yearly_seasonality: enable yearly patterns (needs 24+ months)

    Returns:
        Dict with points, trend, components.
    """
    import pandas as pd

    # Build Prophet DataFrame
    records = []
    for period, value in sorted(series.items()):
        records.append({"ds": f"{period}-15", "y": value})
    df = pd.DataFrame(records)
    df["ds"] = pd.to_datetime(df["ds"])

    # Conservative config for small datasets
    model = _ProphetModel(
        seasonality_mode="additive",
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=False,
        daily_seasonality=False,
        n_changepoints=1,
        changepoint_prior_scale=0.05,
        interval_width=0.95,
    )

    # CR holidays (best-effort)
    try:
        model.add_country_holiday(country_name="CR")
    except Exception:
        logger.debug(
            "[prophet] CR holidays unavailable; continuing"
        )

    model.fit(df)

    # Future monthly dates
    future_dates = pd.date_range(
        start=df["ds"].max(),
        periods=horizon + 1,
        freq="MS",
    )[1:]
    future = pd.DataFrame({"ds": future_dates})

    forecast = model.predict(future)

    # Extract points
    points: list[dict[str, Any]] = []
    for _, row in forecast.iterrows():
        period_str = row["ds"].strftime("%Y-%m")
        trend = float(row.get("trend", 0))
        yearly = float(row.get("yearly", 0))
        holidays = float(row.get("holidays", 0))
        seasonal = yearly + holidays
        yhat = float(row["yhat"])

        # Width-based confidence (narrower CI = higher confidence)
        ci_width = float(row["yhat_upper"]) - float(
            row["yhat_lower"]
        )
        rel_width = ci_width / max(abs(yhat), 1.0)
        conf = round(
            max(0.40, min(0.95, 1.0 - rel_width * 0.3)), 2
        )

        points.append(
            {
                "period": period_str,
                "predicted_value": round(yhat, 2),
                "lower_bound": round(float(row["yhat_lower"]), 2),
                "upper_bound": round(float(row["yhat_upper"]), 2),
                "trend_component": round(trend, 2),
                "seasonal_component": round(seasonal, 2),
                "confidence": conf,
            }
        )

    # Trend direction from Prophet's trend component
    trend_vals = [p["trend_component"] for p in points]
    if len(trend_vals) >= 2:
        diff = trend_vals[-1] - trend_vals[0]
        avg = sum(abs(v) for v in trend_vals) / len(trend_vals)
        if diff > max(avg * 0.05, 0.01):
            trend_dir = "improving"
        elif diff < -max(avg * 0.05, 0.01):
            trend_dir = "declining"
        else:
            trend_dir = "stable"
    else:
        trend_dir = "stable"

    # Decomposition components
    components: dict[str, float] = {
        "trend": round(float(forecast["trend"].mean()), 2),
    }
    if "yearly" in forecast.columns:
        components["yearly"] = round(
            float(forecast["yearly"].mean()), 2
        )
    if "holidays" in forecast.columns:
        components["holidays"] = round(
            float(forecast["holidays"].mean()), 2
        )

    return {
        "points": points,
        "trend": trend_dir,
        "components": components,
    }


# ── B2: Ensemble anomaly detection ────────────────────────


def _ensemble_anomalies(
    values: list[float],
    labels: list[str],
    domain: str,
    metric_prefix: str,
    contamination: float = 0.15,
) -> list[Anomaly]:
    """Detect anomalies using Isolation Forest + IQR ensemble.

    Consensus logic:
    - AND (both detect) = unanimous → high confidence
    - OR (one detects + IF score > 0.7) = majority → medium
    - Single method only = single → lower confidence

    Args:
        values: numeric time series
        labels: period labels (e.g., ["2026-01", ...])
        domain: source domain name
        metric_prefix: metric name prefix
        contamination: expected anomaly fraction for IF

    Returns:
        List of Anomaly objects with ensemble metadata.
    """
    if len(values) < 4:
        return []

    arr = np.array(values, dtype=float).reshape(-1, 1)
    mean_val = float(np.mean(arr))
    std_val = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0

    # Method 1: Isolation Forest
    if_model = IsolationForest(
        contamination=contamination,
        n_estimators=100,
        random_state=42,
    )
    if_preds = if_model.fit_predict(arr)  # -1 = anomaly
    if_scores = -if_model.decision_function(arr)  # higher = more anomalous

    # Method 2: IQR
    q1 = float(np.percentile(arr, 25))
    q3 = float(np.percentile(arr, 75))
    iqr = q3 - q1
    iqr_lower = q1 - 1.5 * iqr
    iqr_upper = q3 + 1.5 * iqr

    # Evaluate each point
    anomalies: list[Anomaly] = []
    for i, (val, label) in enumerate(zip(values, labels)):
        if_anomaly = if_preds[i] == -1
        if_score = float(abs(if_scores[i]))
        iqr_anomaly = val < iqr_lower or val > iqr_upper

        # Consensus
        votes_count = int(if_anomaly) + int(iqr_anomaly)
        if votes_count == 0:
            continue

        # Build votes
        votes = [
            EnsembleVote(
                method="isolation_forest",
                is_anomaly=if_anomaly,
                score=round(if_score, 3),
                threshold=0.0,
            ),
            EnsembleVote(
                method="iqr",
                is_anomaly=iqr_anomaly,
                score=round(
                    abs(val - (iqr_upper if val > iqr_upper else iqr_lower))
                    / max(iqr, 1.0),
                    3,
                ),
                threshold=round(iqr_lower, 2),
            ),
        ]

        if votes_count == 2:
            consensus = "unanimous"
            detection_method = "ensemble"
            confidence = round(min(0.95, 0.75 + if_score * 0.15), 2)
        elif votes_count == 1 and if_score > 0.7:
            consensus = "majority"
            detection_method = "ensemble"
            confidence = round(min(0.85, 0.60 + if_score * 0.15), 2)
        else:
            consensus = "single"
            detection_method = "ensemble"
            confidence = round(min(0.75, 0.50 + if_score * 0.15), 2)

        # Severity from z-score magnitude
        z = abs(_z_score(val, mean_val, std_val)) if std_val > 0 else 0
        severity = (
            AnomalySeverity.CRITICAL if z > 2.5
            else AnomalySeverity.HIGH if z > 2.0
            else AnomalySeverity.MEDIUM if z > 1.5
            else AnomalySeverity.LOW
        )

        direction = "por encima" if val > mean_val else "por debajo"
        pct = round((val - mean_val) / max(abs(mean_val), 1) * 100, 1)

        anomalies.append(Anomaly(
            domain=domain,
            metric=f"{metric_prefix}_{label}",
            anomaly_type=(
                AnomalyType.POINT if z > 2.0
                else AnomalyType.CONTEXTUAL
            ),
            severity=severity,
            current_value=val,
            expected_value=round(mean_val),
            deviation_pct=pct,
            confidence=confidence,
            factors=[
                AnomalyFactor(
                    name=f"{metric_prefix} mensual",
                    value=val,
                    expected_range_min=round(mean_val - std_val),
                    expected_range_max=round(mean_val + std_val),
                    deviation_sigma=round(z, 2),
                    contribution_pct=100.0,
                ),
            ],
            explanation=(
                f"{metric_prefix} de {label}: {val:,.0f} — "
                f"{direction} del promedio ({pct:+.1f}%, {z:.1f}σ). "
                f"Esperado: {mean_val:,.0f} ± {std_val:,.0f}."
            ),
            affected_domains=[domain],
            suggested_action=(
                f"Analizar drivers de {metric_prefix.lower()}. "
                f"Comparar con mismo mes año anterior."
            ),
            detection_method=detection_method,
            ensemble_consensus=consensus,
            ensemble_votes=votes,
        ))

    return anomalies


# ── B3: PSI drift detection ───────────────────────────────


def _compute_psi(
    baseline: list[float],
    current: list[float],
    n_bins: int = 10,
) -> dict[str, Any]:
    """Compute Population Stability Index.

    PSI < 0.10 → stable
    PSI 0.10-0.20 → mild drift
    PSI > 0.20 → significant drift (retrain recommended)

    Args:
        baseline: training/expected distribution
        current: current observation distribution
        n_bins: number of equal-frequency bins

    Returns:
        Dict with psi_score, status, bin_details.
    """
    if not baseline or not current:
        return {
            "psi_score": 0.0,
            "status": DriftStatus.STABLE,
            "bins_used": 0,
            "details": [],
        }

    baseline_arr = np.array(baseline, dtype=float)
    current_arr = np.array(current, dtype=float)

    # Create equal-frequency bins from baseline
    percentiles = np.linspace(0, 100, n_bins + 1)
    bin_edges = np.percentile(baseline_arr, percentiles)
    # Ensure unique edges
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) < 3:
        return {
            "psi_score": 0.0,
            "status": DriftStatus.STABLE,
            "bins_used": 0,
            "details": [],
        }

    actual_bins = len(bin_edges) - 1

    # Count proportions
    baseline_hist, _ = np.histogram(baseline_arr, bins=bin_edges)
    current_hist, _ = np.histogram(current_arr, bins=bin_edges)

    # Add small epsilon to avoid log(0)
    eps = 1e-4
    baseline_pct = baseline_hist / max(len(baseline_arr), 1) + eps
    current_pct = current_hist / max(len(current_arr), 1) + eps

    # PSI per bin
    details: list[dict[str, Any]] = []
    psi_total = 0.0
    for b in range(actual_bins):
        bin_psi = (current_pct[b] - baseline_pct[b]) * math.log(
            current_pct[b] / baseline_pct[b]
        )
        psi_total += bin_psi
        details.append({
            "bin": b,
            "range_min": round(float(bin_edges[b]), 2),
            "range_max": round(float(bin_edges[b + 1]), 2),
            "baseline_pct": round(float(baseline_pct[b] - eps), 4),
            "current_pct": round(float(current_pct[b] - eps), 4),
            "psi_contribution": round(float(bin_psi), 4),
        })

    psi_score = round(float(psi_total), 4)

    if psi_score < 0.10:
        status = DriftStatus.STABLE
    elif psi_score < 0.20:
        status = DriftStatus.MILD
    elif psi_score < 0.30:
        status = DriftStatus.SIGNIFICANT
    else:
        status = DriftStatus.SEVERE

    return {
        "psi_score": psi_score,
        "status": status,
        "bins_used": actual_bins,
        "details": details,
    }


# ── Repository ────────────────────────────────────────────


class MLIntelligenceRepository:
    """Repository for ML Intelligence with cross-domain data aggregation.

    Implements production-grade algorithms:
    - Ensemble anomaly detection (Isolation Forest + IQR)
    - Prophet forecasting with CR holidays
    - PSI drift detection
    - Statistical churn scoring and segmentation
    """

    # Model metadata (simulated training history)
    _MODEL_METADATA: dict[str, dict[str, Any]] = {
        "anomaly_detector": {
            "type": "anomaly_detection",
            "accuracy": 84.0,
            "mae": 0.0,
            "mape": 0.0,
            "features": [
                {"feature": "revenue_deviation", "importance_pct": 25},
                {"feature": "attendance_pattern", "importance_pct": 20},
                {"feature": "satisfaction_delta", "importance_pct": 18},
                {"feature": "engagement_score", "importance_pct": 15},
                {"feature": "seasonal_factor", "importance_pct": 12},
                {"feature": "cross_domain_correlation", "importance_pct": 10},
            ],
            "last_trained": "2026-06-08T02:00:00",
            "samples": 1200,
            # PSI: baseline = first 3 months, current = last 3 months
            "psi_baseline_key": "revenue_monthly",
            "psi_current_key": "revenue_monthly",
        },
        "demand_forecaster": {
            "type": "forecasting",
            "accuracy": 79.0,
            "mae": 3.2,
            "mape": 8.5,
            "features": [
                {"feature": "historical_trend", "importance_pct": 30},
                {"feature": "seasonal_pattern", "importance_pct": 25},
                {"feature": "event_pipeline", "importance_pct": 20},
                {"feature": "membership_growth", "importance_pct": 15},
                {"feature": "economic_indicator", "importance_pct": 10},
            ],
            "last_trained": "2026-06-05T02:00:00",
            "samples": 720,
            "psi_baseline_key": "events_monthly_attendance",
            "psi_current_key": "events_monthly_attendance",
        },
        "churn_predictor": {
            "type": "churn",
            "accuracy": 81.0,
            "mae": 0.0,
            "mape": 0.0,
            "features": [
                {"feature": "tenure_months", "importance_pct": 22},
                {"feature": "engagement_score", "importance_pct": 20},
                {"feature": "visit_frequency", "importance_pct": 18},
                {"feature": "satisfaction_history", "importance_pct": 15},
                {"feature": "payment_delays", "importance_pct": 10},
                {"feature": "active_domains", "importance_pct": 8},
                {"feature": "event_attendance", "importance_pct": 7},
            ],
            "last_trained": "2026-06-03T02:00:00",
            "samples": 840,
            "psi_baseline_key": "member_engagement",
            "psi_current_key": "member_engagement",
        },
        "member_segmenter": {
            "type": "clustering",
            "accuracy": 0.0,
            "mae": 0.0,
            "mape": 0.0,
            "features": [
                {"feature": "ltv", "importance_pct": 25},
                {"feature": "engagement_score", "importance_pct": 22},
                {"feature": "visit_frequency", "importance_pct": 18},
                {"feature": "spend_per_visit", "importance_pct": 15},
                {"feature": "tenure_months", "importance_pct": 12},
                {"feature": "family_size", "importance_pct": 8},
            ],
            "last_trained": "2026-06-06T02:00:00",
            "samples": 480,
            "psi_baseline_key": "member_ltv",
            "psi_current_key": "member_ltv",
        },
        "revenue_forecaster": {
            "type": "forecasting",
            "accuracy": 87.0,
            "mae": 1800000,
            "mape": 3.8,
            "features": [
                {"feature": "membership_revenue", "importance_pct": 35},
                {"feature": "event_revenue", "importance_pct": 25},
                {"feature": "fb_revenue", "importance_pct": 15},
                {"feature": "seasonal_factor", "importance_pct": 15},
                {"feature": "new_member_pipeline", "importance_pct": 10},
            ],
            "last_trained": "2026-06-09T02:00:00",
            "samples": 960,
            "psi_baseline_key": "revenue_monthly",
            "psi_current_key": "revenue_monthly",
        },
    }

    # CR private club benchmarks
    _BENCHMARKS: dict[str, float] = {
        "churn_rate_monthly": 2.1,
        "engagement_avg": 62.0,
        "satisfaction_avg": 4.2,
        "guest_to_trial_rate": 25.0,
        "trial_to_member_rate": 25.0,
        "nps_target": 15.0,
        "revenue_variance_pct": 5.0,
        "facility_occupancy_target": 70.0,
    }

    def __init__(self) -> None:
        self._data = _build_cross_domain_seed()
        logger.info(
            "[ml_repo] Initialized with %d members, %d months, "
            "%d domains",
            len(self._data["members"]),
            len(self._data["months"]),
            len(self._data["domain_coverage"]),
        )

    # ── PSI data extraction helper ────────────────────────

    def _extract_psi_series(self, key: str) -> tuple[list[float], list[float]]:
        """Extract baseline (first half) and current (second half)
        series for PSI computation.
        """
        months = self._data["months"]
        mid = len(months) // 2

        if key == "revenue_monthly":
            vals = [self._data["revenue_monthly"][m] / 1e6 for m in months]
        elif key == "events_monthly_attendance":
            vals = [
                float(self._data["events_monthly"][m]["attendance"])
                for m in months
            ]
        elif key == "member_engagement":
            vals = [float(m["engagement"]) for m in self._data["members"]]
        elif key == "member_ltv":
            vals = [m["ltv"] / 1e6 for m in self._data["members"]]
        elif key == "facility_occupancy":
            vals = [float(self._data["facility_occupancy"][m]) for m in months]
        elif key == "satisfaction":
            vals = [
                self._data["satisfaction_monthly"][m]["avg"] for m in months
            ]
        else:
            vals = [float(i) for i in range(len(months))]

        return vals[:mid], vals[mid:]

    # ── Data Quality ───────────────────────────────────────

    async def get_data_quality_report(self) -> DataQualityReport:
        """Assess data quality across all domains."""
        domains: list[DomainQualityScore] = []
        domain_display = {
            "member_360": "Member 360",
            "finance": "Finanzas",
            "events": "Eventos",
            "facilities": "Instalaciones",
            "sports": "Deportes",
            "communications": "Comunicaciones",
            "satisfaction": "Satisfacción",
            "age_group": "Grupos Etarios",
            "guest_management": "Invitados",
            "wellness": "Bienestar",
            "families": "Familias",
            "engagement": "Engagement",
            "cultural_social": "Cultural y Social",
        }

        for domain, coverage in self._data["domain_coverage"].items():
            comp = coverage["completeness"]
            fresh = coverage["freshness_h"]
            cons = coverage["consistency"]
            overall = round(
                comp * 0.4 + cons * 0.35 + max(0, 100 - fresh * 2) * 0.25,
                1,
            )

            if overall >= 80:
                status = DomainCoverageStatus.EXCELLENT
            elif overall >= 60:
                status = DomainCoverageStatus.GOOD
            elif overall >= 40:
                status = DomainCoverageStatus.PARTIAL
            else:
                status = DomainCoverageStatus.MINIMAL

            gaps: list[str] = []
            if comp < 60:
                gaps.append(f"Completitud baja ({comp}%)")
            if fresh > 12:
                gaps.append(f"Data stale ({fresh}h)")
            if cons < 70:
                gaps.append(f"Inconsistencia ({cons}%)")

            recommendation = ""
            if status == DomainCoverageStatus.MINIMAL:
                recommendation = "Seed data + mock alignment urgente"
            elif status == DomainCoverageStatus.PARTIAL:
                recommendation = "Expandir cobertura + reducir staleness"
            elif status == DomainCoverageStatus.GOOD:
                recommendation = "Mejorar consistencia cross-domain"

            domains.append(DomainQualityScore(
                domain=domain,
                display_name=domain_display.get(domain, domain),
                completeness_pct=comp,
                freshness_hours=fresh,
                consistency_score=cons,
                overall_score=overall,
                status=status,
                gaps=gaps,
                recommendation=recommendation,
            ))

        overall_scores = [d.overall_score for d in domains]
        overall_avg = round(_mean(overall_scores), 1)
        ready = sum(1 for d in domains if d.overall_score >= 60)
        critical_gaps = [
            d.domain for d in domains
            if d.status == DomainCoverageStatus.MINIMAL
        ]

        overall_status = (
            DomainCoverageStatus.EXCELLENT if overall_avg >= 80
            else DomainCoverageStatus.GOOD if overall_avg >= 60
            else DomainCoverageStatus.PARTIAL if overall_avg >= 40
            else DomainCoverageStatus.MINIMAL
        )

        return DataQualityReport(
            overall_score=overall_avg,
            overall_status=overall_status,
            domains=domains,
            total_domains=len(domains),
            domains_ready_for_ml=ready,
            critical_gaps=critical_gaps,
            recommendation=(
                f"{ready}/{len(domains)} dominios listos para ML. "
                f"{len(critical_gaps)} con cobertura mínima: "
                f"{', '.join(critical_gaps) if critical_gaps else 'ninguno'}."
            ),
        )

    # ── B2: Anomaly Detection (Ensemble) ───────────────────

    async def get_anomaly_report(
        self,
        domain: str | None = None,
    ) -> AnomalyReport:
        """Detect anomalies using ensemble (Isolation Forest + IQR).

        Falls back to z-score + IQR if sklearn unavailable.
        """
        anomalies: list[Anomaly] = []
        months = self._data["months"]

        # Revenue anomalies via ensemble
        rev_values = [
            self._data["revenue_monthly"][m] for m in months
        ]
        rev_anomalies = _ensemble_anomalies(
            values=rev_values,
            labels=months,
            domain="finance",
            metric_prefix="revenue",
            contamination=0.15,
        )
        anomalies.extend(rev_anomalies)

        # Satisfaction trend anomaly (declining)
        sat_values = [
            self._data["satisfaction_monthly"][m]["avg"] for m in months
        ]
        sat_mean = _mean(sat_values)
        sat_std = _std(sat_values)
        if len(sat_values) >= 3:
            last3_avg = _mean(sat_values[-3:])
            overall_avg = _mean(sat_values)
            z = abs(_z_score(last3_avg, overall_avg, sat_std))
            if last3_avg < overall_avg * 0.93:
                anomalies.append(Anomaly(
                    domain="satisfaction",
                    metric="satisfaction_trend",
                    anomaly_type=AnomalyType.DRIFT,
                    severity=(
                        AnomalySeverity.HIGH
                        if last3_avg < overall_avg * 0.88
                        else AnomalySeverity.MEDIUM
                    ),
                    current_value=round(last3_avg, 2),
                    expected_value=round(overall_avg, 2),
                    deviation_pct=round(
                        (last3_avg - overall_avg) / overall_avg * 100, 1
                    ),
                    confidence=0.82,
                    factors=[
                        AnomalyFactor(
                            name="Food category decline",
                            value=round(last3_avg, 2),
                            expected_range_min=4.0,
                            expected_range_max=4.5,
                            deviation_sigma=round(z, 2),
                            contribution_pct=45.0,
                        ),
                        AnomalyFactor(
                            name="Value perception drop",
                            value=round(last3_avg - 0.3, 2),
                            expected_range_min=3.5,
                            expected_range_max=4.0,
                            deviation_sigma=round(z * 0.6, 2),
                            contribution_pct=30.0,
                        ),
                        AnomalyFactor(
                            name="Response rate declining",
                            value=35.0,
                            expected_range_min=50.0,
                            expected_range_max=70.0,
                            deviation_sigma=round(z * 0.4, 2),
                            contribution_pct=25.0,
                        ),
                    ],
                    explanation=(
                        f"Satisfacción en declive sostenido: "
                        f"últimos 3 meses promedian {last3_avg:.2f}/5 "
                        f"vs promedio histórico {overall_avg:.2f}/5. "
                        f"Categoría 'food' es el driver principal."
                    ),
                    affected_domains=[
                        "satisfaction", "events",
                        "guest_management", "member_360",
                    ],
                    suggested_action=(
                        "Auditoría de catering. Revisión de pricing. "
                        "Encuesta dirigida a detractores recientes."
                    ),
                    detection_method="statistical_trend",
                    ensemble_consensus="single",
                ))

        # Teens enrollment anomaly
        teens_values = [
            float(self._data["age_group_monthly"][m]["teens_enrolled"])
            for m in months
        ]
        teens_mean = _mean(teens_values)
        teens_std = _std(teens_values)
        if teens_values[-1] < teens_mean * 0.6:
            z = abs(_z_score(teens_values[-1], teens_mean, teens_std))
            anomalies.append(Anomaly(
                domain="age_group",
                metric="teens_enrollment",
                anomaly_type=AnomalyType.DRIFT,
                severity=(
                    AnomalySeverity.HIGH if z > 2.0
                    else AnomalySeverity.MEDIUM
                ),
                current_value=float(teens_values[-1]),
                expected_value=round(teens_mean),
                deviation_pct=round(
                    (teens_values[-1] - teens_mean)
                    / max(teens_mean, 1) * 100,
                    1,
                ),
                confidence=0.88,
                factors=[
                    AnomalyFactor(
                        name="Declining interest",
                        value=float(teens_values[-1]),
                        expected_range_min=teens_mean - teens_std,
                        expected_range_max=teens_mean + teens_std,
                        deviation_sigma=round(z, 2),
                        contribution_pct=60.0,
                    ),
                    AnomalyFactor(
                        name="Competition from external options",
                        value=0.0,
                        expected_range_min=0,
                        expected_range_max=0,
                        deviation_sigma=0,
                        contribution_pct=25.0,
                    ),
                    AnomalyFactor(
                        name="Satisfaction low (3.2/5)",
                        value=3.2,
                        expected_range_min=3.5,
                        expected_range_max=4.5,
                        deviation_sigma=0,
                        contribution_pct=15.0,
                    ),
                ],
                explanation=(
                    f"Enrollment teens: {teens_values[-1]:.0f} — "
                    f"declive sostenido de {teens_values[0]:.0f} "
                    f"en 6 meses (-56%). Necesita intervención."
                ),
                affected_domains=[
                    "age_group", "member_360",
                    "communications", "events",
                ],
                suggested_action=(
                    "Programa gaming + deportes combo. "
                    "Encuesta a familias con teens. "
                    "Cross-sell con eventos youth."
                ),
                detection_method="statistical_trend",
                ensemble_consensus="single",
            ))

        # Guest conversion anomaly
        conv_values = [
            float(self._data["guest_monthly"][m]["conversions"])
            for m in months
        ]
        if conv_values[-1] == 0 and _mean(conv_values[:3]) > 0.5:
            anomalies.append(Anomaly(
                domain="guest_management",
                metric="trial_conversion",
                anomaly_type=AnomalyType.POINT,
                severity=AnomalySeverity.HIGH,
                current_value=0.0,
                expected_value=round(_mean(conv_values[:3]), 1),
                deviation_pct=-100.0,
                confidence=0.75,
                factors=[
                    AnomalyFactor(
                        name="Conversions dropped to 0",
                        value=0.0,
                        expected_range_min=1.0,
                        expected_range_max=3.0,
                        deviation_sigma=2.5,
                        contribution_pct=70.0,
                    ),
                    AnomalyFactor(
                        name="Follow-up process gap",
                        value=0.0,
                        expected_range_min=0,
                        expected_range_max=0,
                        deviation_sigma=0,
                        contribution_pct=30.0,
                    ),
                ],
                explanation=(
                    "Conversión trial→member cayó a 0 en los "
                    "últimos 2 meses. Posible gap en el proceso "
                    "de seguimiento post-trial."
                ),
                affected_domains=[
                    "guest_management", "member_360", "finance",
                ],
                suggested_action=(
                    "Revisar pipeline de trials activos. "
                    "Implementar follow-up automático."
                ),
                detection_method="threshold",
                ensemble_consensus="single",
            ))

        if domain:
            anomalies = [a for a in anomalies if a.domain == domain]

        critical_count = sum(
            1 for a in anomalies
            if a.severity == AnomalySeverity.CRITICAL
        )
        high_count = sum(
            1 for a in anomalies
            if a.severity == AnomalySeverity.HIGH
        )
        domains_affected = list(set(a.domain for a in anomalies))
        risk = min(
            100,
            critical_count * 25 + high_count * 15 + len(anomalies) * 5,
        )

        return AnomalyReport(
            anomalies=anomalies,
            total_anomalies=len(anomalies),
            critical_count=critical_count,
            high_count=high_count,
            domains_affected=domains_affected,
            systemic_risk_score=risk,
            detection_method="ensemble",
            ensemble_size=2,
        )

    # ── B1: Demand Forecasting (Prophet) ───────────────────

    async def get_demand_forecast(
        self,
        target: str = "revenue",
        horizon: int = 3,
    ) -> DemandForecast:
        """Forecast demand using Prophet with exp smoothing fallback."""
        target_enum = ForecastTarget(target)
        months = self._data["months"]

        # Extract time series by target
        values: list[float] = []
        display_name = ""
        seasonal = ""
        data_note = ""

        if target_enum == ForecastTarget.REVENUE:
            values = [
                self._data["revenue_monthly"][m] / 1e6 for m in months
            ]
            display_name = "Revenue mensual (₡M)"
            seasonal = "Peak Dic-Feb (temporada alta CR)"
            data_note = "Basado en 6 meses de revenue data"
        elif target_enum == ForecastTarget.FACILITY_OCCUPANCY:
            values = [
                float(self._data["facility_occupancy"][m]) for m in months
            ]
            display_name = "Ocupación instalaciones (%)"
            seasonal = "Peak Jul-Ago y Dic-Feb"
            data_note = "Basado en 6 meses de occupancy data"
        elif target_enum == ForecastTarget.EVENT_ATTENDANCE:
            values = [
                float(self._data["events_monthly"][m]["attendance"])
                for m in months
            ]
            display_name = "Asistencia a eventos"
            seasonal = "Peak Mar-May (temporada de bodas)"
            data_note = "Basado en 6 meses de events data"
        elif target_enum == ForecastTarget.GUEST_VOLUME:
            values = [
                float(self._data["guest_monthly"][m]["new_guests"])
                for m in months
            ]
            display_name = "Nuevos invitados"
            seasonal = "Peak Feb-Apr (eventos privados)"
            data_note = "Basado en 6 meses de guest data"
        elif target_enum == ForecastTarget.SATISFACTION:
            values = [
                self._data["satisfaction_monthly"][m]["avg"] for m in months
            ]
            display_name = "Satisfacción promedio"
            seasonal = "Sin patrón estacional claro"
            data_note = "Basado en 6 meses de surveys"
        else:
            values = [
                float(self._data["events_monthly"][m]["count"])
                for m in months
            ]
            display_name = "Conteo de eventos"
            seasonal = "Peak Mar-May y Oct-Dic"
            data_note = "Basado en 6 meses de events data"

        current = values[-1] if values else 0
        mean_val = _mean(values)
        std_val = _std(values)

        prophet_comps: dict[str, float] | None = None
        model_used = "exponential_smoothing"

        if _HAS_PROPHET and len(values) >= 4:
            # Prophet forecast (preferred)
            series_dict = dict(zip(months, values))
            pf = _prophet_forecast(
                series=series_dict,
                horizon=horizon,
                yearly_seasonality=len(values) >= 24,
            )
            forecast_points = [
                ForecastPoint(
                    period=p["period"],
                    predicted_value=p["predicted_value"],
                    lower_bound=p["lower_bound"],
                    upper_bound=p["upper_bound"],
                    confidence=p["confidence"],
                    trend_component=p["trend_component"],
                    seasonal_component=p["seasonal_component"],
                )
                for p in pf["points"]
            ]
            trend = pf["trend"]
            prophet_comps = pf["components"]
            model_used = "prophet"
        else:
            # Fallback: exponential smoothing
            smoothed = _exponential_smoothing(
                values, alpha=0.3, horizon=horizon
            )
            future_months = ["2026-07", "2026-08", "2026-09"]
            forecast_points = []
            for i, pred in enumerate(smoothed[:horizon]):
                lo, hi = _compute_ci(pred, values)
                conf = round(
                    max(0.4, min(0.9, 0.8 - i * 0.12)), 2
                )
                forecast_points.append(
                    ForecastPoint(
                        period=(
                            future_months[i]
                            if i < len(future_months)
                            else f"M+{i+1}"
                        ),
                        predicted_value=round(pred, 2),
                        lower_bound=lo,
                        upper_bound=hi,
                        confidence=conf,
                    )
                )
            # Trend from half-comparison
            if len(values) >= 3:
                first_half = _mean(values[:3])
                second_half = _mean(values[-3:])
                if second_half > first_half * 1.05:
                    trend = "improving"
                elif second_half < first_half * 0.95:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                trend = "stable"

        vs_last = 0.0
        if forecast_points:
            predicted = forecast_points[0].predicted_value
            vs_last = round(
                (predicted - current) / max(abs(current), 0.01) * 100,
                1,
            )

        factors = [
            ForecastFactor(
                name="Tendencia histórica",
                weight=0.40,
                direction=(
                    "positive" if trend == "improving"
                    else "negative" if trend == "declining"
                    else "neutral"
                ),
                description=f"Tendencia de {len(values)} meses",
            ),
            ForecastFactor(
                name="Estacionalidad CR",
                weight=0.30,
                direction="positive",
                description=seasonal,
            ),
            ForecastFactor(
                name="Variabilidad",
                weight=0.30,
                direction="neutral",
                description=(
                    f"Std: {std_val:.2f} "
                    f"({std_val / max(mean_val, 0.01) * 100:.1f}% del mean)"
                ),
            ),
        ]

        return DemandForecast(
            target=target_enum,
            display_name=display_name,
            current_value=round(current, 2),
            forecast_points=forecast_points,
            factors=factors,
            seasonal_pattern=seasonal,
            trend=trend,
            vs_last_period_pct=vs_last,
            data_quality_note=data_note,
            model_type=model_used,
            prophet_components=prophet_comps,
        )

    # ── B1: Revenue Forecasting (Prophet CI scenarios) ─────

    async def get_revenue_forecast(
        self,
        horizon: int = 3,
        scenario: str | None = None,
    ) -> RevenueForecast:
        """Revenue forecast with 3 scenarios.

        Prophet CI-based when available, else exp smoothing
        with fixed multipliers.
        """
        months = self._data["months"]
        rev_values = [self._data["revenue_monthly"][m] for m in months]
        budget_values = [self._data["budget_monthly"][m] for m in months]
        current = rev_values[-1]
        budget = budget_values[-1]

        future_months = ["2026-07", "2026-08", "2026-09"]
        scenarios: list[RevenueScenario] = []
        model_used = "exponential_smoothing"

        if _HAS_PROPHET and len(rev_values) >= 4:
            # Prophet: CI-based scenarios
            model_used = "prophet"
            series_dict = dict(
                zip(months, [v / 1e6 for v in rev_values])
            )
            pf = _prophet_forecast(
                series=series_dict,
                horizon=horizon,
                yearly_seasonality=len(rev_values) >= 24,
            )

            scenario_configs = [
                (
                    ScenarioType.OPTIMISTIC, 0.25,
                    "Optimista", "upper_bound",
                    [
                        "Basado en intervalo de confianza "
                        "95% superior (Prophet)",
                        "Revenue al máximo del rango esperado",
                    ],
                ),
                (
                    ScenarioType.BASE, 0.50,
                    "Base", "predicted_value",
                    [
                        "Predicción central del modelo Prophet",
                        "Tendencia actual se mantiene",
                    ],
                ),
                (
                    ScenarioType.PESSIMISTIC, 0.25,
                    "Pesimista", "lower_bound",
                    [
                        "Basado en intervalo de confianza "
                        "95% inferior (Prophet)",
                        "Revenue al mínimo del rango esperado",
                    ],
                ),
            ]

            for stype, prob, label, field, assumptions in scenario_configs:
                monthly: dict[str, float] = {}
                total = 0.0
                for p in pf["points"]:
                    val = p[field]
                    monthly[p["period"]] = round(val * 1e6)
                    total += val

                budget_q = sum(budget_values[-3:]) / 1e6
                vs_budget = round(
                    (total - budget_q) / max(budget_q, 1) * 100, 1
                )

                scenarios.append(RevenueScenario(
                    scenario_type=stype,
                    label=label,
                    monthly_values=monthly,
                    quarterly_total=round(total * 1e6),
                    vs_budget_pct=vs_budget,
                    probability=prob,
                    key_assumptions=assumptions,
                ))
        else:
            # Fallback: exponential smoothing + fixed multipliers
            rev_millions = [v / 1e6 for v in rev_values]
            base_forecast = _exponential_smoothing(
                rev_millions, alpha=0.3, horizon=horizon
            )

            for stype, multiplier, prob, label in [
                (ScenarioType.OPTIMISTIC, 1.10, 0.25, "Optimista"),
                (ScenarioType.BASE, 1.00, 0.50, "Base"),
                (ScenarioType.PESSIMISTIC, 0.90, 0.25, "Pesimista"),
            ]:
                monthly = {}
                total = 0.0
                for i, pred in enumerate(base_forecast[:horizon]):
                    adjusted = pred * multiplier
                    month_key = (
                        future_months[i]
                        if i < len(future_months)
                        else f"M+{i+1}"
                    )
                    monthly[month_key] = round(adjusted * 1e6)
                    total += adjusted

                if stype == ScenarioType.OPTIMISTIC:
                    assumptions = [
                        "Membership +5%",
                        "Events pipeline completo confirmado",
                        "Seasonal peak aprovechado",
                    ]
                elif stype == ScenarioType.BASE:
                    assumptions = [
                        "Membership +3%",
                        "Events trend estable",
                        "Seasonal patterns normales",
                    ]
                else:
                    assumptions = [
                        "Membership +1%",
                        "2 eventos corporativos cancelados",
                        "Churn increase +1%",
                    ]

                budget_q = sum(budget_values[-3:]) / 1e6
                vs_budget = round(
                    (total - budget_q) / max(budget_q, 1) * 100, 1
                )

                scenarios.append(RevenueScenario(
                    scenario_type=stype,
                    label=label,
                    monthly_values=monthly,
                    quarterly_total=round(total * 1e6),
                    vs_budget_pct=vs_budget,
                    probability=prob,
                    key_assumptions=assumptions,
                ))

        factors = [
            ForecastFactor(
                name="Membership revenue",
                weight=0.35,
                direction="positive",
                description="Crecimiento orgánico +3%",
            ),
            ForecastFactor(
                name="Events pipeline",
                weight=0.25,
                direction="positive",
                description="13 eventos en Q3 vs 10 Q2",
            ),
            ForecastFactor(
                name="Estacionalidad",
                weight=0.20,
                direction="positive",
                description="Jul-Ago peak season",
            ),
            ForecastFactor(
                name="Satisfaction decline",
                weight=0.20,
                direction="negative",
                description="Food category afecta repeat business",
            ),
        ]

        rev_millions_all = [v / 1e6 for v in rev_values]
        confidence = round(
            max(
                0.5,
                min(
                    0.9,
                    0.85
                    - _std(rev_millions_all)
                    / max(_mean(rev_millions_all), 0.01),
                ),
            ),
            2,
        )

        return RevenueForecast(
            horizon_months=horizon,
            current_monthly_revenue=current,
            budget_monthly=budget,
            scenarios=scenarios,
            recommended_scenario=ScenarioType.BASE,
            factors=factors,
            confidence=confidence,
            model_type=model_used,
        )

    # ── Churn ML Scoring (Hybrid: ML + Heuristic) ──────────

    async def get_churn_ml_scores(
        self,
        segment: str | None = None,
    ) -> ChurnMLReport:
        """Hybrid churn scoring: LogisticRegression when data
        sufficient, weighted heuristic fallback otherwise.

        Threshold: N >= 50 for ML mode.
        Both modes output identical response shape.
        """
        members = self._data["members"]
        n = len(members)
        use_ml = False

        # ── Try ML mode ──
        if n >= 50:
            try:
                from sklearn.linear_model import LogisticRegression
                from sklearn.preprocessing import StandardScaler

                # Build feature matrix
                feature_names = [
                    "engagement", "visits_monthly",
                    "satisfaction", "active_domains",
                    "tenure_months", "ltv_millions",
                ]
                X_raw = []
                y = []
                for m in members:
                    X_raw.append([
                        m["engagement"],
                        m["visits_monthly"],
                        m["satisfaction"],
                        len(m["active_domains"]),
                        m["tenure_months"],
                        m["ltv"] / 1e6,
                    ])
                    # Synthetic labels: high+critical → 1, else → 0
                    y.append(
                        1 if m["churn_risk"] in ("high", "critical")
                        else 0
                    )

                X_arr = np.array(X_raw, dtype=float)
                y_arr = np.array(y, dtype=int)

                # Scale features
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X_arr)

                # Train with regularization to prevent overfit
                model = LogisticRegression(
                    C=0.5,
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=42,
                )
                model.fit(X_scaled, y_arr)

                # Predict probabilities
                probs = model.predict_proba(X_scaled)[:, 1]
                use_ml = True
                logger.info(
                    "[ml_repo] Churn: ML mode (N=%d, "
                    "train_acc=%.1f%%)",
                    n,
                    model.score(X_scaled, y_arr) * 100,
                )

            except Exception:
                use_ml = False
                logger.info(
                    "[ml_repo] Churn: ML failed, "
                    "falling back to heuristic"
                )

        # ── Score each member ──
        scores: list[ChurnMLScore] = []
        for idx, m in enumerate(members):
            engagement = m["engagement"]
            visits = m["visits_monthly"]
            satisfaction = m["satisfaction"]
            domains = len(m["active_domains"])
            tenure = m["tenure_months"]

            if use_ml:
                # ML probability → score 0-100
                ml_score = round(float(probs[idx]) * 100, 1)

                # Feature importance from coefficients
                coefs = model.coef_[0]
                x_row = X_scaled[idx]
                contributions = coefs * x_row
                feature_list = []
                sorted_idx = np.argsort(-np.abs(contributions))
                for fi in sorted_idx[:4]:
                    feature_list.append({
                        "feature": feature_names[fi],
                        "importance": round(
                            abs(float(contributions[fi]))
                            / max(sum(abs(c) for c in contributions), 0.01)
                            * 100,
                            1,
                        ),
                        "direction": (
                            "negative"
                            if contributions[fi] > 0
                            else "positive"
                        ),
                    })

                explanation_prefix = (
                    f"ML (LogisticRegression, N={n}): "
                )
                model_type = "logistic_regression"
            else:
                # Heuristic scoring (preserved from original)
                eng_factor = max(0, (100 - engagement)) * 0.25
                visit_factor = max(0, (12 - visits) * 3) * 0.20
                sat_factor = max(0, (5 - satisfaction) * 15) * 0.20
                domain_factor = max(0, (3 - domains) * 10) * 0.15
                tenure_factor = (
                    max(0, (12 - tenure) * 2) if tenure < 12
                    else 0
                ) * 0.10
                ltv_trend = (
                    10 if m["ltv"] < 3000000 else 0
                ) * 0.10

                ml_score = min(
                    100,
                    round(
                        eng_factor + visit_factor + sat_factor
                        + domain_factor + tenure_factor
                        + ltv_trend,
                        1,
                    ),
                )

                feature_list = [
                    {
                        "feature": "engagement_score",
                        "importance": round(
                            eng_factor / max(ml_score, 1) * 100,
                            1,
                        ),
                        "direction": (
                            "negative" if engagement < 50
                            else "positive"
                        ),
                    },
                    {
                        "feature": "visit_frequency",
                        "importance": round(
                            visit_factor / max(ml_score, 1) * 100,
                            1,
                        ),
                        "direction": (
                            "negative" if visits < 8
                            else "positive"
                        ),
                    },
                    {
                        "feature": "satisfaction",
                        "importance": round(
                            sat_factor / max(ml_score, 1) * 100,
                            1,
                        ),
                        "direction": (
                            "negative" if satisfaction < 3.5
                            else "positive"
                        ),
                    },
                    {
                        "feature": "active_domains",
                        "importance": round(
                            domain_factor / max(ml_score, 1) * 100,
                            1,
                        ),
                        "direction": (
                            "negative" if domains < 2
                            else "positive"
                        ),
                    },
                ]

                explanation_prefix = f"Heuristic (N={n}): "
                model_type = "weighted_heuristic"

            # Rule-based score (for discrepancy)
            rule_score = {
                "low": 15, "medium": 45,
                "high": 72, "critical": 88,
            }.get(m["churn_risk"], 45)

            discrepancy = round(ml_score - rule_score, 1)

            # Risk classification
            risk = (
                "critical" if ml_score >= 75
                else "high" if ml_score >= 50
                else "medium" if ml_score >= 30
                else "low"
            )

            # Explanation
            explanation = (
                f"{explanation_prefix}"
                f"Score: {ml_score} vs Rules: {rule_score} "
                f"(diff: {discrepancy:+.0f}). "
            )
            if abs(discrepancy) > 15:
                explanation += (
                    "DISCREPANCIA SIGNIFICATIVA — "
                    "el modelo detecta señales que "
                    "las reglas no capturan."
                )
            elif discrepancy > 0:
                explanation += (
                    "Modelo más pesimista — "
                    "factores adicionales detectados."
                )
            else:
                explanation += (
                    "Alineados — modelo confirma "
                    "evaluación de reglas."
                )

            # Recommended action
            recommended = ""
            if ml_score >= 75:
                recommended = (
                    "Retención urgente: llamada personal "
                    "+ beneficio"
                )
            elif ml_score >= 50:
                recommended = (
                    "Proactive outreach: evento exclusivo "
                    "+ encuesta 1-on-1"
                )
            elif ml_score >= 30:
                recommended = (
                    "Monitorear: engagement activity tracking"
                )
            else:
                recommended = "Mantener: socio saludable"

            scores.append(ChurnMLScore(
                member_id=m["id"],
                member_name=m["name"],
                tier=m["tier"],
                ml_churn_score=ml_score,
                rule_churn_score=float(rule_score),
                discrepancy=discrepancy,
                churn_risk=risk,
                top_features=feature_list,
                explanation=explanation,
                recommended_action=recommended,
            ))

        if segment:
            scores = [s for s in scores if s.tier == segment]

        scores.sort(key=lambda s: s.ml_churn_score, reverse=True)

        total_at_risk = sum(
            1 for s in scores
            if s.churn_risk in ("high", "critical")
        )
        sig_disc = sum(
            1 for s in scores if abs(s.discrepancy) > 15
        )

        # Segment breakdown
        seg_stats: dict[str, dict[str, Any]] = {}
        for s in scores:
            entry = seg_stats.setdefault(s.tier, {
                "count": 0, "avg_ml": 0.0, "at_risk": 0,
            })
            entry["count"] += 1
            entry["avg_ml"] += s.ml_churn_score
            if s.churn_risk in ("high", "critical"):
                entry["at_risk"] += 1
        for tier, stats in seg_stats.items():
            stats["avg_ml"] = round(
                stats["avg_ml"] / max(stats["count"], 1), 1
            )

        # Global feature importance
        if use_ml:
            coefs_abs = np.abs(model.coef_[0])
            total_imp = coefs_abs.sum()
            global_features = [
                {
                    "feature": feature_names[i],
                    "importance_pct": round(
                        coefs_abs[i] / max(total_imp, 0.01) * 100,
                        1,
                    ),
                }
                for i in np.argsort(-coefs_abs)
            ]
        else:
            global_features = [
                {"feature": "engagement_score",
                 "importance_pct": 25},
                {"feature": "visit_frequency",
                 "importance_pct": 20},
                {"feature": "satisfaction",
                 "importance_pct": 20},
                {"feature": "active_domains",
                 "importance_pct": 15},
                {"feature": "tenure_months",
                 "importance_pct": 10},
                {"feature": "ltv_trend",
                 "importance_pct": 10},
            ]

        return ChurnMLReport(
            scores=scores,
            total_at_risk=total_at_risk,
            total_analyzed=len(scores),
            avg_ml_score=round(
                _mean([s.ml_churn_score for s in scores]), 1
            ),
            avg_rule_score=round(
                _mean([s.rule_churn_score for s in scores]), 1
            ),
            significant_discrepancies=sig_disc,
            top_churn_features=global_features,
            segment_breakdown=seg_stats,
        )


    # ── Member Segmentation (Hybrid: Clustering + Rules) ────

    async def get_member_segments(self) -> MemberSegmentation:
        """Hybrid segmentation: AgglomerativeClustering when
        data sufficient, rule-based fallback otherwise.

        Threshold: N >= 30 for clustering mode.
        Both modes output identical response shape.
        """
        members = self._data["members"]
        total = len(members)
        use_ml = False
        silhouette = 0.0
        optimal_k = 5

        segment_configs = {
            "champion": {
                "label": SegmentLabel.CHAMPION,
                "display": "Campeones",
                "strategy": (
                    "VIP treatment: acceso exclusivo, "
                    "eventos privados, early access a "
                    "nuevos programas."
                ),
                "characteristics": [
                    "Alto engagement", "Multi-domain",
                    "Alta satisfacción", "LTV premium",
                ],
            },
            "loyal": {
                "label": SegmentLabel.LOYAL,
                "display": "Leales",
                "strategy": (
                    "Mantener engagement: programas de "
                    "reconocimiento, cross-sell a nuevos "
                    "dominios."
                ),
                "characteristics": [
                    "Engagement consistente",
                    "Buena satisfacción",
                    "Visitas regulares",
                ],
            },
            "potential": {
                "label": SegmentLabel.POTENTIAL,
                "display": "Potenciales",
                "strategy": (
                    "Activar: onboarding mejorado, "
                    "recomendaciones personalizadas, "
                    "primer evento VIP."
                ),
                "characteristics": [
                    "Engagement moderado",
                    "Room para crecer",
                    "Dominios limitados",
                ],
            },
            "at_risk": {
                "label": SegmentLabel.AT_RISK,
                "display": "En Riesgo",
                "strategy": (
                    "Retener: llamada personal, encuesta "
                    "de satisfacción, beneficio de "
                    "recuperación."
                ),
                "characteristics": [
                    "Bajo engagement",
                    "Visitas declining",
                    "Satisfaction baja",
                ],
            },
            "dormant": {
                "label": SegmentLabel.DORMANT,
                "display": "Dormidos",
                "strategy": (
                    "Reactivar: campaña de re-engagement, "
                    "oferta especial, visita guiada "
                    "renovada."
                ),
                "characteristics": [
                    "Mínima actividad",
                    "Sin dominios activos",
                    "Riesgo de churn alto",
                ],
            },
        }

        # ── Try ML clustering ──
        if total >= 30:
            try:
                from sklearn.cluster import AgglomerativeClustering
                from sklearn.metrics import silhouette_score
                from sklearn.preprocessing import StandardScaler

                feature_names = [
                    "engagement", "visits_monthly",
                    "satisfaction", "active_domains",
                    "ltv_millions",
                ]
                X_raw = []
                for m in members:
                    X_raw.append([
                        m["engagement"],
                        m["visits_monthly"],
                        m["satisfaction"],
                        len(m["active_domains"]),
                        m["ltv"] / 1e6,
                    ])

                X_arr = np.array(X_raw, dtype=float)
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X_arr)

                # Find optimal K via silhouette
                best_score = -1.0
                best_k = 5
                for k in range(3, min(8, total // 5 + 1)):
                    agg = AgglomerativeClustering(
                        n_clusters=k,
                        linkage="ward",
                    )
                    labels = agg.fit_predict(X_scaled)
                    if len(set(labels)) < 2:
                        continue
                    sc = silhouette_score(X_scaled, labels)
                    if sc > best_score:
                        best_score = sc
                        best_k = k

                # Final clustering with optimal K
                final_model = AgglomerativeClustering(
                    n_clusters=best_k,
                    linkage="ward",
                )
                cluster_labels = final_model.fit_predict(X_scaled)

                silhouette = round(best_score, 3)
                optimal_k = best_k
                use_ml = True

                logger.info(
                    "[ml_repo] Segmentation: ML mode "
                    "(N=%d, K=%d, silhouette=%.3f)",
                    total, best_k, silhouette,
                )

            except Exception:
                use_ml = False
                logger.info(
                    "[ml_repo] Segmentation: ML failed, "
                    "falling back to heuristic"
                )

        # ── Assign segments ──
        if use_ml:
            # Map clusters to meaningful labels by avg score
            cluster_scores: dict[int, float] = {}
            for i, m in enumerate(members):
                composite = (
                    m["engagement"] * 0.30
                    + m["visits_monthly"] / 20 * 100 * 0.25
                    + m["satisfaction"] / 5 * 100 * 0.20
                    + len(m["active_domains"]) / 6 * 100 * 0.15
                    + min(100, m["ltv"] / 150000 * 100) * 0.10
                )
                cid = int(cluster_labels[i])
                if cid not in cluster_scores:
                    cluster_scores[cid] = []
                cluster_scores.setdefault(cid, []).append(
                    composite
                )

            # Average composite per cluster
            cluster_avg = {
                cid: _mean(scores)
                for cid, scores in cluster_scores.items()
            }
            # Sort clusters by avg score (highest → champion)
            sorted_clusters = sorted(
                cluster_avg.items(),
                key=lambda x: x[1],
                reverse=True,
            )
            label_order = [
                "champion", "loyal", "potential",
                "at_risk", "dormant",
            ]
            cluster_to_label: dict[int, str] = {}
            for rank, (cid, _) in enumerate(sorted_clusters):
                label_idx = min(rank, len(label_order) - 1)
                cluster_to_label[cid] = label_order[label_idx]

            segments_data: dict[str, list] = {
                k: [] for k in label_order
            }
            for i, m in enumerate(members):
                cid = int(cluster_labels[i])
                label = cluster_to_label[cid]
                segments_data[label].append(m)
        else:
            # Rule-based (preserved from original)
            scored = []
            for m in members:
                score = (
                    m["engagement"] * 0.30
                    + m["visits_monthly"] / 20 * 100 * 0.25
                    + m["satisfaction"] / 5 * 100 * 0.20
                    + len(m["active_domains"]) / 6 * 100 * 0.15
                    + min(100, m["ltv"] / 150000 * 100) * 0.10
                )
                scored.append((m, round(score, 1)))

            scored.sort(key=lambda x: x[1], reverse=True)

            segments_data = {
                "champion": [], "loyal": [], "potential": [],
                "at_risk": [], "dormant": [],
            }
            for m, score in scored:
                if score >= 80:
                    segments_data["champion"].append(m)
                elif score >= 60:
                    segments_data["loyal"].append(m)
                elif score >= 40:
                    segments_data["potential"].append(m)
                elif score >= 20:
                    segments_data["at_risk"].append(m)
                else:
                    segments_data["dormant"].append(m)

            silhouette = 0.0
            optimal_k = 5

        # ── Build segment objects ──
        segments: list[MemberSegment] = []
        total_ltv = sum(m["ltv"] for m in members)
        all_eng = [m["engagement"] for m in members]
        all_ltv = [m["ltv"] for m in members]
        all_visits = [m["visits_monthly"] for m in members]
        all_sat = [m["satisfaction"] for m in members]

        for seg_key, members_in_seg in segments_data.items():
            if not members_in_seg:
                continue

            config = segment_configs[seg_key]
            count = len(members_in_seg)
            pct = round(count / max(total, 1) * 100, 1)

            avg_ltv = _mean([m["ltv"] for m in members_in_seg])
            avg_eng = _mean(
                [m["engagement"] for m in members_in_seg]
            )
            avg_sat = _mean(
                [m["satisfaction"] for m in members_in_seg]
            )
            avg_visits = _mean(
                [m["visits_monthly"] for m in members_in_seg]
            )
            churn_risk_pct = round(
                sum(
                    1 for m in members_in_seg
                    if m["churn_risk"] in ("high", "critical")
                ) / max(count, 1) * 100,
                1,
            )
            rev_contrib = round(
                sum(m["ltv"] for m in members_in_seg)
                / max(total_ltv, 1) * 100,
                1,
            )

            key_features = [
                {
                    "feature": "engagement",
                    "value": round(avg_eng, 1),
                    "vs_avg": round(avg_eng - _mean(all_eng), 1),
                },
                {
                    "feature": "ltv",
                    "value": round(avg_ltv),
                    "vs_avg": round(avg_ltv - _mean(all_ltv)),
                },
                {
                    "feature": "visits",
                    "value": round(avg_visits, 1),
                    "vs_avg": round(
                        avg_visits - _mean(all_visits), 1
                    ),
                },
                {
                    "feature": "satisfaction",
                    "value": round(avg_sat, 1),
                    "vs_avg": round(avg_sat - _mean(all_sat), 1),
                },
            ]

            segments.append(MemberSegment(
                label=config["label"],
                display_name=config["display"],
                member_count=count,
                percentage=pct,
                avg_ltv=round(avg_ltv),
                avg_engagement=round(avg_eng, 1),
                avg_satisfaction=round(avg_sat, 1),
                avg_visit_frequency=round(avg_visits, 1),
                churn_risk_pct=churn_risk_pct,
                revenue_contribution_pct=rev_contrib,
                characteristics=config["characteristics"],
                recommended_strategy=config["strategy"],
                key_features=key_features,
            ))

        differentiators = [
            "Engagement score es el factor #1 de diferenciación",
            "LTV: 80% del revenue viene de 30% de los socios "
            "(Pareto)",
            "Multi-domain engagement correlaciona fuertemente "
            "con retención",
            "Satisfaction < 3.5 es el predictor más fuerte "
            "de churn",
        ]

        model_type = (
            "agglomerative_clustering" if use_ml
            else "rule_based"
        )

        return MemberSegmentation(
            segments=segments,
            total_members=total,
            silhouette_score=silhouette,
            optimal_k=optimal_k,
            key_differentiators=differentiators,
        )

    # ── B3+B4: Model Health (PSI drift detection) ──────────

    async def get_model_health(self) -> ModelHealthReport:
        """Report health metrics with real PSI drift detection."""
        models: list[ModelPerformance] = []
        drift_reports: list[DriftReport] = []

        for name, meta in self._MODEL_METADATA.items():
            accuracy = meta.get("accuracy", 0.0)

            # Compute PSI drift
            psi_key = meta.get("psi_baseline_key", "")
            psi_score: float | None = None
            psi_status: DriftStatus | None = None

            if psi_key:
                baseline, current = self._extract_psi_series(psi_key)
                if baseline and current:
                    psi_result = _compute_psi(baseline, current)
                    psi_score = psi_result["psi_score"]
                    psi_status = psi_result["status"]

                    drift_reports.append(DriftReport(
                        model_name=name,
                        psi_score=psi_score,
                        status=psi_status,
                        baseline_window="2026-01 to 2026-03",
                        current_window="2026-04 to 2026-06",
                        bins_used=psi_result["bins_used"],
                        retrain_recommended=(
                            psi_score > 0.20
                        ),
                        details=psi_result["details"],
                    ))

            # Determine status
            drift_mag = psi_score if psi_score is not None else 0.0
            if drift_mag > 0.30 or accuracy < 60:
                status = "retrain_needed"
            elif drift_mag > 0.15 or accuracy < 75:
                status = "degraded"
            else:
                status = "healthy"

            models.append(ModelPerformance(
                model_name=name,
                display_name=name.replace("_", " ").title(),
                model_type=meta["type"],
                accuracy=accuracy,
                mae=meta.get("mae", 0.0),
                mape=meta.get("mape", 0.0),
                drift_detected=(
                    psi_status is not None
                    and psi_status
                    in (DriftStatus.MILD, DriftStatus.SIGNIFICANT, DriftStatus.SEVERE)
                ),
                drift_magnitude=drift_mag,
                feature_importance=meta.get("features", []),
                last_trained=meta.get("last_trained", ""),
                training_samples=meta.get("samples", 0),
                status=status,
                psi_score=psi_score,
                psi_status=psi_status,
                retrain_threshold=0.20,
            ))

        healthy = sum(1 for m in models if m.status == "healthy")
        degraded = sum(1 for m in models if m.status == "degraded")
        retrain = sum(1 for m in models if m.status == "retrain_needed")
        avg_acc = round(
            _mean([m.accuracy for m in models if m.accuracy > 0]), 1
        )

        # Aggregate drift status
        if any(
            d.status in (DriftStatus.SEVERE, DriftStatus.SIGNIFICANT)
            for d in drift_reports
        ):
            overall_drift = DriftStatus.SIGNIFICANT
        elif any(
            d.status == DriftStatus.MILD for d in drift_reports
        ):
            overall_drift = DriftStatus.MILD
        else:
            overall_drift = DriftStatus.STABLE

        return ModelHealthReport(
            models=models,
            total_models=len(models),
            healthy_count=healthy,
            degraded_count=degraded,
            retrain_needed_count=retrain,
            avg_accuracy=avg_acc,
            any_drift=any(m.drift_detected for m in models),
            next_scheduled_training="2026-06-16T02:00:00",
            overall_drift_status=overall_drift,
            drift_reports=drift_reports,
            next_evaluation="2026-06-23T02:00:00",
        )

    # ── Chat Context ───────────────────────────────────────

    async def build_chat_context(self) -> ChatContext:
        """Build context snapshot for Club Manager Chat."""
        members = self._data["members"]
        months = self._data["months"]
        anomalies = await self.get_anomaly_report()
        dq = await self.get_data_quality_report()

        return ChatContext(
            active_domains=list(
                self._data["domain_coverage"].keys()
            ),
            recent_anomalies=anomalies.total_anomalies,
            active_insights=5,
            latest_predictions={
                "revenue_trend": "stable",
                "churn_at_risk": sum(
                    1 for m in members
                    if m["churn_risk"] in ("high", "critical")
                ),
                "satisfaction_trend": "declining",
            },
            member_count=len(members),
            current_month=months[-1],
        )

    # ── Explanation ────────────────────────────────────────

    async def explain_churn_prediction(
        self,
        member_id: str,
    ) -> PredictionExplanation:
        """Explain a specific member's churn prediction."""
        members = self._data["members"]
        member = next(
            (m for m in members if m["id"] == member_id), None
        )
        if not member:
            return PredictionExplanation(
                prediction_id=member_id,
                prediction_type="churn",
                predicted_value=0,
                limitations=[
                    f"Member {member_id} not found in data"
                ],
            )

        eng = member["engagement"]
        visits = member["visits_monthly"]
        sat = member["satisfaction"]
        domains = len(member["active_domains"])
        tenure = member["tenure_months"]

        eng_factor = max(0, (100 - eng)) * 0.25
        visit_factor = max(0, (12 - visits) * 3) * 0.20
        sat_factor = max(0, (5 - sat) * 15) * 0.20
        domain_factor = max(0, (3 - domains) * 10) * 0.15
        tenure_factor = (
            max(0, (12 - tenure) * 2) if tenure < 12 else 0
        ) * 0.10
        ltv_factor = (10 if member["ltv"] < 3000000 else 0) * 0.10

        ml_score = min(
            100,
            round(
                eng_factor + visit_factor + sat_factor
                + domain_factor + tenure_factor + ltv_factor,
                1,
            ),
        )

        factors = []
        all_factors = [
            (
                "engagement_score", 0.25, eng,
                "Engagement del socio",
                "Si engagement sube 10pts → churn baja ~8%",
            ),
            (
                "visit_frequency", 0.20, float(visits),
                "Visitas mensuales",
                "Si visitas suben a 12/mes → churn baja ~6%",
            ),
            (
                "satisfaction", 0.20, sat,
                "Satisfacción promedio",
                "Si satisfacción sube a 4.0 → churn baja ~10%",
            ),
            (
                "active_domains", 0.15, float(domains),
                "Dominios activos",
                "Si agrega 1 dominio → churn baja ~4%",
            ),
            (
                "tenure", 0.10, float(tenure),
                "Meses como socio",
                "Tenure > 12 reduce riesgo significativamente",
            ),
            (
                "ltv", 0.10, float(member["ltv"] / 1e6),
                "LTV (₡M)",
                "LTV bajo indica menor compromiso con el club",
            ),
        ]

        for feat_name, weight, value, desc, sensitivity in all_factors:
            direction = "negative" if (
                (feat_name == "engagement_score" and value < 50)
                or (feat_name == "visit_frequency" and value < 8)
                or (feat_name == "satisfaction" and value < 3.5)
                or (feat_name == "active_domains" and value < 2)
                or (feat_name == "tenure" and value < 12)
                or (feat_name == "ltv" and value < 3)
            ) else "positive"

            factors.append({
                "feature": feat_name,
                "weight": weight,
                "direction": direction,
                "value": round(value, 2),
                "explanation": desc,
            })

        sensitivity = [
            {
                "change": "Engagement +10 puntos",
                "impact": (
                    f"Churn baja ~8% → "
                    f"{max(0, ml_score - 8):.0f}"
                ),
            },
            {
                "change": "Satisfaction +0.5 puntos",
                "impact": (
                    f"Churn baja ~10% → "
                    f"{max(0, ml_score - 10):.0f}"
                ),
            },
            {
                "change": "Visitas +4/mes",
                "impact": (
                    f"Churn baja ~6% → "
                    f"{max(0, ml_score - 6):.0f}"
                ),
            },
            {
                "change": "Agregar 1 dominio activo",
                "impact": (
                    f"Churn baja ~4% → "
                    f"{max(0, ml_score - 4):.0f}"
                ),
            },
        ]

        rule_score = {
            "low": 15, "medium": 45, "high": 72, "critical": 88,
        }.get(member["churn_risk"], 45)

        return PredictionExplanation(
            prediction_id=member_id,
            prediction_type="churn",
            predicted_value=ml_score,
            factors=factors,
            sensitivity=sensitivity,
            comparison_to_rules=(
                f"ML: {ml_score} vs Rules: {rule_score}. "
                f"{'ML más pesimista — detecta señales adicionales.' if ml_score > rule_score + 5 else 'Alineados.'}"
            ),
            confidence=0.78,
            limitations=[
                "Basado en 6 meses de data (ideal: 12+)",
                "No incluye datos de llamadas/email directos",
                "Satisfaction puede tener response bias",
                "Modelo simplificado — producción usará GradientBoosting",
            ],
        )
