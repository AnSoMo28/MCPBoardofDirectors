"""Tests for ML Intelligence Agent and Repository.

Covers:
- All 10 MCP tools (agent-level, mocked repo)
- Prophet forecast (B1) — with fallback
- Ensemble anomaly detection (B2)
- PSI drift detection (B3)
- Model health with PSI (B4)
- Shape regression (frontend compatibility)

Production-grade: deterministic seed data, real algorithms.
"""

from __future__ import annotations

import math
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from club_mcp.models.ml_intelligence import (
    Anomaly,
    AnomalyReport,
    AnomalySeverity,
    ChatContext,
    ChurnMLReport,
    DataQualityReport,
    DemandForecast,
    DriftReport,
    DriftStatus,
    EnsembleVote,
    ForecastPoint,
    ForecastTarget,
    MemberSegmentation,
    ModelHealthReport,
    ModelPerformance,
    PredictionExplanation,
    RevenueForecast,
    ScenarioType,
)


# ── Fixtures ───────────────────────────────────────────────


@pytest.fixture()
def seed_data() -> dict[str, Any]:
    """Cross-domain seed data (same as repo)."""
    from club_mcp.db.repositories.ml_intelligence_repo import (
        _build_cross_domain_seed,
    )

    return _build_cross_domain_seed()


@pytest.fixture()
def repo():
    """Fresh repository instance with seed data."""
    from club_mcp.db.repositories.ml_intelligence_repo import (
        MLIntelligenceRepository,
    )

    return MLIntelligenceRepository()


@pytest.fixture()
def mock_repo():
    """Mock repository for agent-level tests."""
    mock = MagicMock()
    mock.get_data_quality_report = AsyncMock()
    mock.get_anomaly_report = AsyncMock()
    mock.get_demand_forecast = AsyncMock()
    mock.get_revenue_forecast = AsyncMock()
    mock.get_churn_ml_scores = AsyncMock()
    mock.get_member_segments = AsyncMock()
    mock.get_model_health = AsyncMock()
    mock.build_chat_context = AsyncMock()
    mock.explain_churn_prediction = AsyncMock()
    return mock


@pytest.fixture()
def agent(mock_repo):
    """Agent instance with mocked repo and claude."""
    from club_mcp.agents.ml_intelligence import MLIntelligenceAgent

    with patch(
        "club_mcp.agents.ml_intelligence.get_claude_service"
    ) as mock_claude_svc:
        mock_claude = MagicMock()
        mock_claude.analyze_satisfaction = AsyncMock(
            return_value={
                "analysis": "Test response",
                "confidence": 0.8,
            }
        )
        mock_claude_svc.return_value = mock_claude

        with patch(
            "club_mcp.agents.ml_intelligence.MLIntelligenceRepository"
        ) as mock_repo_cls:
            mock_repo_cls.return_value = mock_repo
            agent = MLIntelligenceAgent()
            agent.claude = mock_claude
            agent.repo = mock_repo
            yield agent


# ── Agent Tool Tests ───────────────────────────────────────


class TestAgentTools:
    """Test all 10 MCP tools return correct status and shapes."""

    @pytest.mark.asyncio()
    async def test_get_data_quality_report(self, agent, mock_repo):
        """Tool 1: data quality report returns success."""
        mock_repo.get_data_quality_report.return_value = (
            DataQualityReport(
                overall_score=72.5,
                overall_status="good",
                domains=[],
                total_domains=13,
                domains_ready_for_ml=10,
                critical_gaps=["age_group"],
                recommendation="10/13 ready",
            )
        )

        result = await agent.get_data_quality_report()

        assert result["status"] == "success"
        assert "Calidad de datos" in result["message"]
        assert "report" in result

    @pytest.mark.asyncio()
    async def test_get_anomaly_report(self, agent, mock_repo):
        """Tool 2: anomaly report returns success with ensemble info."""
        mock_repo.get_anomaly_report.return_value = AnomalyReport(
            anomalies=[],
            total_anomalies=2,
            critical_count=0,
            high_count=1,
            domains_affected=["finance"],
            systemic_risk_score=30.0,
            detection_method="ensemble",
            ensemble_size=2,
        )

        result = await agent.get_anomaly_report(domain="finance")

        assert result["status"] == "success"
        assert "anomalías" in result["message"]
        assert "report" in result

    @pytest.mark.asyncio()
    async def test_get_demand_forecast(self, agent, mock_repo):
        """Tool 3: demand forecast returns success with model type."""
        mock_repo.get_demand_forecast.return_value = DemandForecast(
            target=ForecastTarget.REVENUE,
            display_name="Revenue mensual (₡M)",
            current_value=52.4,
            forecast_points=[
                ForecastPoint(
                    period="2026-07",
                    predicted_value=51.0,
                    lower_bound=46.0,
                    upper_bound=56.0,
                    confidence=0.85,
                    trend_component=50.5,
                    seasonal_component=0.5,
                ),
            ],
            factors=[],
            seasonal_pattern="Peak Dic-Feb",
            trend="stable",
            vs_last_period_pct=-2.7,
            data_quality_note="6 months",
            model_type="prophet",
            prophet_components={"trend": 50.5, "yearly": 0.3},
        )

        result = await agent.get_demand_forecast(
            target="revenue", horizon=3
        )

        assert result["status"] == "success"
        assert "Forecast" in result["message"]
        assert "forecast" in result

    @pytest.mark.asyncio()
    async def test_get_demand_forecast_invalid_target(self, agent):
        """Tool 3: invalid target returns error."""
        result = await agent.get_demand_forecast(
            target="invalid_target"
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"]

    @pytest.mark.asyncio()
    async def test_get_revenue_forecast(self, agent, mock_repo):
        """Tool 4: revenue forecast with 3 scenarios."""
        from club_mcp.models.ml_intelligence import RevenueScenario

        mock_repo.get_revenue_forecast.return_value = RevenueForecast(
            horizon_months=3,
            current_monthly_revenue=52400000,
            budget_monthly=53000000,
            scenarios=[
                RevenueScenario(
                    scenario_type=ScenarioType.OPTIMISTIC,
                    label="Optimista",
                    quarterly_total=160000000,
                    vs_budget_pct=2.5,
                    probability=0.25,
                ),
                RevenueScenario(
                    scenario_type=ScenarioType.BASE,
                    label="Base",
                    quarterly_total=150000000,
                    vs_budget_pct=-4.0,
                    probability=0.50,
                ),
                RevenueScenario(
                    scenario_type=ScenarioType.PESSIMISTIC,
                    label="Pesimista",
                    quarterly_total=135000000,
                    vs_budget_pct=-13.5,
                    probability=0.25,
                ),
            ],
            recommended_scenario=ScenarioType.BASE,
            confidence=0.78,
            model_type="prophet",
        )

        result = await agent.get_revenue_forecast(horizon=3)

        assert result["status"] == "success"
        assert len(result["scenarios"]) == 3
        assert "Revenue forecast" in result["message"]

    @pytest.mark.asyncio()
    async def test_get_churn_ml_scores(self, agent, mock_repo):
        """Tool 5: churn ML scores with discrepancies."""
        mock_repo.get_churn_ml_scores.return_value = ChurnMLReport(
            scores=[],
            total_at_risk=4,
            total_analyzed=20,
            avg_ml_score=38.5,
            avg_rule_score=35.2,
            significant_discrepancies=3,
        )

        result = await agent.get_churn_ml_scores(segment="platino")

        assert result["status"] == "success"
        assert "Churn ML" in result["message"]

    @pytest.mark.asyncio()
    async def test_get_member_segments(self, agent, mock_repo):
        """Tool 6: member segmentation returns clusters."""
        mock_repo.get_member_segments.return_value = (
            MemberSegmentation(
                segments=[],
                total_members=20,
                silhouette_score=0.62,
                optimal_k=5,
                key_differentiators=["Engagement es factor #1"],
            )
        )

        result = await agent.get_member_segments()

        assert result["status"] == "success"
        assert "Segmentación" in result["message"]

    @pytest.mark.asyncio()
    async def test_get_model_health(self, agent, mock_repo):
        """Tool 7: model health with PSI info."""
        mock_repo.get_model_health.return_value = ModelHealthReport(
            models=[
                ModelPerformance(
                    model_name="test_model",
                    display_name="Test Model",
                    model_type="forecasting",
                    accuracy=85.0,
                    status="healthy",
                    psi_score=0.05,
                    psi_status=DriftStatus.STABLE,
                ),
            ],
            total_models=1,
            healthy_count=1,
            degraded_count=0,
            retrain_needed_count=0,
            avg_accuracy=85.0,
            any_drift=False,
            overall_drift_status=DriftStatus.STABLE,
            drift_reports=[],
            next_evaluation="2026-06-23T02:00:00",
        )

        result = await agent.get_model_health()

        assert result["status"] == "success"
        assert "Model health" in result["message"]
        assert len(result["models"]) == 1

    @pytest.mark.asyncio()
    async def test_chat_club_manager_empty(self, agent):
        """Tool 8: empty question returns error."""
        result = await agent.chat_club_manager(question="")

        assert result["status"] == "error"
        assert "pregunta" in result["message"]

    @pytest.mark.asyncio()
    async def test_chat_club_manager_success(self, agent, mock_repo):
        """Tool 8: valid question returns Claude response."""
        mock_repo.build_chat_context.return_value = ChatContext(
            active_domains=["finance", "events"],
            recent_anomalies=2,
            active_insights=5,
            latest_predictions={"churn_at_risk": 4},
            member_count=20,
            current_month="2026-06",
        )
        mock_repo.get_anomaly_report.return_value = AnomalyReport(
            anomalies=[],
            total_anomalies=0,
            critical_count=0,
            high_count=0,
            domains_affected=[],
            systemic_risk_score=0.0,
        )
        mock_repo.get_data_quality_report.return_value = (
            DataQualityReport(
                overall_score=75.0,
                overall_status="good",
                domains=[],
                total_domains=13,
                domains_ready_for_ml=10,
                critical_gaps=[],
            )
        )

        result = await agent.chat_club_manager(
            question="¿Cuál es el estado del club?"
        )

        assert result["status"] == "success"
        assert result["confidence"] == 0.8

    @pytest.mark.asyncio()
    async def test_explain_prediction_no_id(self, agent):
        """Tool 9: missing member_id returns error."""
        result = await agent.explain_prediction(member_id="")

        assert result["status"] == "error"
        assert "member_id" in result["message"]

    @pytest.mark.asyncio()
    async def test_explain_prediction_success(self, agent, mock_repo):
        """Tool 9: valid member returns explanation."""
        mock_repo.explain_churn_prediction.return_value = (
            PredictionExplanation(
                prediction_id="mem-001",
                prediction_type="churn",
                predicted_value=65.0,
                factors=[
                    {
                        "feature": "engagement_score",
                        "weight": 0.25,
                        "direction": "negative",
                        "value": 45.0,
                        "explanation": "Engagement del socio",
                    },
                ],
                sensitivity=[
                    {
                        "change": "Engagement +10",
                        "impact": "Churn baja ~8%",
                    },
                ],
                comparison_to_rules="ML: 65 vs Rules: 72",
                confidence=0.78,
            )
        )

        result = await agent.explain_prediction(
            member_id="mem-001", prediction_type="churn"
        )

        assert result["status"] == "success"
        assert "Explicación" in result["message"]

    @pytest.mark.asyncio()
    async def test_simulate_hypothetical_empty(self, agent):
        """Tool 10: empty question returns error."""
        result = await agent.simulate_hypothetical(question="")

        assert result["status"] == "error"
        assert "escenario" in result["message"]

    @pytest.mark.asyncio()
    async def test_simulate_hypothetical_success(
        self, agent, mock_repo
    ):
        """Tool 10: valid question returns 3 scenarios."""
        mock_repo.build_chat_context.return_value = ChatContext(
            active_domains=["finance"],
            recent_anomalies=1,
            member_count=20,
            current_month="2026-06",
            latest_predictions={"churn_at_risk": 4},
        )
        mock_repo.get_anomaly_report.return_value = AnomalyReport(
            anomalies=[],
            total_anomalies=0,
            critical_count=0,
            high_count=0,
            domains_affected=[],
            systemic_risk_score=0.0,
        )
        mock_repo.get_churn_ml_scores.return_value = ChurnMLReport(
            scores=[],
            total_at_risk=0,
            total_analyzed=0,
        )
        mock_repo.get_data_quality_report.return_value = (
            DataQualityReport(
                overall_score=75.0,
                overall_status="good",
                domains=[],
                total_domains=13,
                domains_ready_for_ml=10,
            )
        )

        result = await agent.simulate_hypothetical(
            question="¿Qué pasa si perdemos 3 socios platino?"
        )

        assert result["status"] == "success"
        assert len(result["scenarios"]) == 3
        assert result["confidence"] == 0.8


# ── Prophet Forecast Tests (B1) ────────────────────────────


class TestProphetForecast:
    """Test Prophet integration and fallback."""

    @pytest.mark.asyncio()
    async def test_demand_forecast_prophet_or_fallback(self, repo):
        """Forecast returns valid points regardless of Prophet."""
        forecast = await repo.get_demand_forecast(
            target="revenue", horizon=3
        )

        assert isinstance(forecast, DemandForecast)
        assert len(forecast.forecast_points) == 3
        assert forecast.target == ForecastTarget.REVENUE
        assert forecast.model_type in ("prophet", "exponential_smoothing")

        for pt in forecast.forecast_points:
            assert pt.predicted_value > 0
            assert pt.lower_bound <= pt.predicted_value
            assert pt.upper_bound >= pt.predicted_value
            assert 0.0 <= pt.confidence <= 1.0

    @pytest.mark.asyncio()
    async def test_demand_forecast_prophet_components(self, repo):
        """Prophet path includes trend/seasonal components."""
        forecast = await repo.get_demand_forecast(
            target="revenue", horizon=3
        )

        if forecast.model_type == "prophet":
            # Prophet should populate components
            assert forecast.prophet_components is not None
            assert "trend" in forecast.prophet_components

            # Points should have trend/seasonal
            for pt in forecast.forecast_points:
                assert pt.trend_component is not None
                assert pt.seasonal_component is not None
        else:
            # Fallback: components should be None
            assert forecast.prophet_components is None
            for pt in forecast.forecast_points:
                assert pt.trend_component is None

    @pytest.mark.asyncio()
    async def test_revenue_forecast_scenarios(self, repo):
        """Revenue forecast has 3 scenarios with valid totals."""
        forecast = await repo.get_revenue_forecast(horizon=3)

        assert isinstance(forecast, RevenueForecast)
        assert len(forecast.scenarios) == 3
        assert forecast.model_type in ("prophet", "exponential_smoothing")

        scenario_types = {s.scenario_type for s in forecast.scenarios}
        assert ScenarioType.OPTIMISTIC in scenario_types
        assert ScenarioType.BASE in scenario_types
        assert ScenarioType.PESSIMISTIC in scenario_types

        # Totals should be ordered
        opt = next(
            s for s in forecast.scenarios
            if s.scenario_type == ScenarioType.OPTIMISTIC
        )
        base = next(
            s for s in forecast.scenarios
            if s.scenario_type == ScenarioType.BASE
        )
        pess = next(
            s for s in forecast.scenarios
            if s.scenario_type == ScenarioType.PESSIMISTIC
        )

        assert opt.quarterly_total >= base.quarterly_total
        assert base.quarterly_total >= pess.quarterly_total

    @pytest.mark.asyncio()
    async def test_all_demand_targets(self, repo):
        """All 6 forecast targets return valid forecasts."""
        targets = [
            "revenue", "facility_occupancy", "event_attendance",
            "guest_volume", "satisfaction", "membership",
        ]

        for target in targets:
            forecast = await repo.get_demand_forecast(
                target=target, horizon=3
            )
            assert len(forecast.forecast_points) == 3, (
                f"Target '{target}' returned "
                f"{len(forecast.forecast_points)} points"
            )


# ── Ensemble Anomaly Detection Tests (B2) ──────────────────


class TestEnsembleAnomalies:
    """Test Isolation Forest + IQR ensemble."""

    def test_ensemble_detects_outlier(self):
        """Revenue spike detected by ensemble."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _ensemble_anomalies,
        )

        values = [100, 102, 98, 101, 99, 200]  # 200 is outlier
        labels = [f"2026-0{i+1}" for i in range(6)]

        anomalies = _ensemble_anomalies(
            values=values,
            labels=labels,
            domain="finance",
            metric_prefix="revenue",
            contamination=0.15,
        )

        # Should detect the outlier (200)
        assert len(anomalies) >= 1
        outlier = next(
            (a for a in anomalies if a.current_value == 200), None
        )
        assert outlier is not None
        assert outlier.detection_method == "ensemble"
        assert outlier.ensemble_consensus in (
            "unanimous", "majority", "single"
        )
        assert len(outlier.ensemble_votes) == 2

    def test_ensemble_no_false_positives(self):
        """Normal data produces no anomalies."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _ensemble_anomalies,
        )

        values = [100, 101, 99, 100, 101, 99]  # tight range
        labels = [f"2026-0{i+1}" for i in range(6)]

        anomalies = _ensemble_anomalies(
            values=values,
            labels=labels,
            domain="finance",
            metric_prefix="revenue",
            contamination=0.05,  # strict
        )

        assert len(anomalies) == 0

    def test_ensemble_votes_structure(self):
        """Ensemble votes have correct structure."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _ensemble_anomalies,
        )

        values = [100, 102, 98, 101, 99, 250]
        labels = [f"2026-0{i+1}" for i in range(6)]

        anomalies = _ensemble_anomalies(
            values=values,
            labels=labels,
            domain="finance",
            metric_prefix="revenue",
            contamination=0.20,
        )

        for a in anomalies:
            assert a.detection_method == "ensemble"
            for vote in a.ensemble_votes:
                assert isinstance(vote, EnsembleVote)
                assert vote.method in ("isolation_forest", "iqr")
                assert isinstance(vote.is_anomaly, bool)
                assert vote.score >= 0.0

    def test_ensemble_short_series_returns_empty(self):
        """Series < 4 points returns no anomalies."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _ensemble_anomalies,
        )

        anomalies = _ensemble_anomalies(
            values=[100, 200, 300],
            labels=["a", "b", "c"],
            domain="finance",
            metric_prefix="revenue",
        )

        assert len(anomalies) == 0


# ── PSI Drift Detection Tests (B3) ─────────────────────────


class TestPSIDrift:
    """Test Population Stability Index computation."""

    def test_psi_stable(self):
        """Similar distributions → PSI < 0.10 (stable)."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _compute_psi,
        )

        baseline = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0,
                     16.0, 17.0, 18.0, 19.0, 20.0, 21.0]
        current = [10.5, 11.5, 12.5, 13.5, 14.5, 15.5,
                    16.5, 17.5, 18.5, 19.5, 20.5, 21.5]

        result = _compute_psi(baseline, current, n_bins=5)

        assert result["psi_score"] < 0.10
        assert result["status"] == DriftStatus.STABLE
        assert result["bins_used"] > 0

    def test_psi_significant(self):
        """Very different distributions → PSI > 0.20."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _compute_psi,
        )

        baseline = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0,
                     16.0, 17.0, 18.0, 19.0, 20.0, 21.0]
        # Shifted significantly upward
        current = [30.0, 31.0, 32.0, 33.0, 34.0, 35.0,
                    36.0, 37.0, 38.0, 39.0, 40.0, 41.0]

        result = _compute_psi(baseline, current, n_bins=5)

        assert result["psi_score"] > 0.20
        assert result["status"] in (
            DriftStatus.SIGNIFICANT, DriftStatus.SEVERE
        )

    def test_psi_empty_input(self):
        """Empty inputs return stable with 0 PSI."""
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _compute_psi,
        )

        result = _compute_psi([], [], n_bins=5)

        assert result["psi_score"] == 0.0
        assert result["status"] == DriftStatus.STABLE


# ── Model Health with PSI (B4) ─────────────────────────────


class TestModelHealthPSI:
    """Test model health integrates real PSI drift."""

    @pytest.mark.asyncio()
    async def test_model_health_has_psi(self, repo):
        """Model health reports include PSI scores."""
        health = await repo.get_model_health()

        assert isinstance(health, ModelHealthReport)
        assert health.total_models == 5
        assert len(health.drift_reports) > 0

        for model in health.models:
            if model.psi_score is not None:
                assert model.psi_score >= 0.0
                assert model.psi_status is not None
                assert isinstance(model.psi_status, DriftStatus)

    @pytest.mark.asyncio()
    async def test_model_health_overall_drift(self, repo):
        """Overall drift status aggregates from all models."""
        health = await repo.get_model_health()

        assert isinstance(health.overall_drift_status, DriftStatus)
        assert health.overall_drift_status in (
            DriftStatus.STABLE,
            DriftStatus.MILD,
            DriftStatus.SIGNIFICANT,
            DriftStatus.SEVERE,
        )
        assert health.next_evaluation != ""


# ── Shape Regression Tests ─────────────────────────────────


class TestShapeRegression:
    """Verify output shapes match what frontend expects.

    These tests prevent silent breaks when backend
    changes model shapes that frontend advisor hooks consume.
    """

    @pytest.mark.asyncio()
    async def test_anomaly_report_shape(self, repo):
        """AnomalyReport shape matches useMLAdvisor expectations."""
        report = await repo.get_anomaly_report()

        assert hasattr(report, "anomalies")
        assert hasattr(report, "total_anomalies")
        assert hasattr(report, "critical_count")
        assert hasattr(report, "systemic_risk_score")
        assert hasattr(report, "detection_method")
        assert hasattr(report, "ensemble_size")

        # Serialized shape
        data = report.model_dump(mode="json")
        assert "anomalies" in data
        assert "detection_method" in data
        assert isinstance(data["anomalies"], list)

    @pytest.mark.asyncio()
    async def test_demand_forecast_shape(self, repo):
        """DemandForecast shape matches advisor expectations."""
        forecast = await repo.get_demand_forecast(
            target="revenue", horizon=3
        )

        data = forecast.model_dump(mode="json")
        assert "forecast_points" in data
        assert "model_type" in data
        assert "trend" in data
        assert len(data["forecast_points"]) == 3

        pt = data["forecast_points"][0]
        assert "period" in pt
        assert "predicted_value" in pt
        assert "lower_bound" in pt
        assert "upper_bound" in pt
        assert "confidence" in pt
        assert "trend_component" in pt
        assert "seasonal_component" in pt

    @pytest.mark.asyncio()
    async def test_revenue_forecast_shape(self, repo):
        """RevenueForecast shape matches advisor expectations."""
        forecast = await repo.get_revenue_forecast(horizon=3)

        data = forecast.model_dump(mode="json")
        assert "scenarios" in data
        assert "model_type" in data
        assert len(data["scenarios"]) == 3

        scenario = data["scenarios"][0]
        assert "scenario_type" in scenario
        assert "quarterly_total" in scenario
        assert "vs_budget_pct" in scenario
        assert "probability" in scenario

    @pytest.mark.asyncio()
    async def test_model_health_shape(self, repo):
        """ModelHealthReport shape matches advisor expectations."""
        health = await repo.get_model_health()

        data = health.model_dump(mode="json")
        assert "models" in data
        assert "overall_drift_status" in data
        assert "drift_reports" in data

        model = data["models"][0]
        assert "model_name" in model
        assert "accuracy" in model
        assert "status" in model
        assert "psi_score" in model
        assert "psi_status" in model

    @pytest.mark.asyncio()
    async def test_churn_report_shape(self, repo):
        """ChurnMLReport shape matches advisor expectations."""
        report = await repo.get_churn_ml_scores()

        data = report.model_dump(mode="json")
        assert "scores" in data
        assert "total_at_risk" in data
        assert "significant_discrepancies" in data

        if data["scores"]:
            score = data["scores"][0]
            assert "member_id" in score
            assert "ml_churn_score" in score
            assert "rule_churn_score" in score
            assert "discrepancy" in score


# ── Statistical Helper Tests ───────────────────────────────


class TestStatisticalHelpers:
    """Test core statistical functions."""

    def test_mean(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _mean,
        )

        assert _mean([1, 2, 3, 4, 5]) == 3.0
        assert _mean([]) == 0.0

    def test_std(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _std,
        )

        assert _std([1]) == 0.0
        assert _std([]) == 0.0
        assert _std([2, 4, 4, 4, 5, 5, 7, 9]) == pytest.approx(
            2.0, abs=0.1
        )

    def test_z_score(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _z_score,
        )

        assert _z_score(10, 5, 2.5) == 2.0
        assert _z_score(5, 5, 0) == 0.0  # zero std

    def test_iqr_bounds(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _iqr_bounds,
        )

        lower, upper = _iqr_bounds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        assert lower < 1
        assert upper > 10

    def test_exponential_smoothing(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _exponential_smoothing,
        )

        result = _exponential_smoothing(
            [10, 12, 11, 13, 14], alpha=0.3, horizon=3
        )
        assert len(result) == 3
        assert all(isinstance(v, float) for v in result)

    def test_exponential_smoothing_empty(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _exponential_smoothing,
        )

        result = _exponential_smoothing([], alpha=0.3, horizon=3)
        assert result == [0.0, 0.0, 0.0]

    def test_compute_ci(self):
        from club_mcp.db.repositories.ml_intelligence_repo import (
            _compute_ci,
        )

        lo, hi = _compute_ci(100.0, [90, 95, 100, 105, 110])
        assert lo < 100.0
        assert hi > 100.0
        assert hi - lo > 0
