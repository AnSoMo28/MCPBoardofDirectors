"""
Tests for ProactiveRecommendationAgent.
"""

from __future__ import annotations

from uuid import UUID

import pytest

from club_mcp.agents.proactive_recommendation_agent import (
    ProactiveRecommendationAgent,
)
from club_mcp.db.repositories.proactive_recommendation_repo import (
    ProactiveRecommendationRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.proactive_recommendation import (
    ClusterType,
    CreateActivitySuggestion,
    CreatePricingOptimization,
    CreateRecommendation,
    InsightPeriod,
    PredictionConfidence,
    PricingStrategy,
    RecommendationPriority,
    RecommendationType,
)


# ── Fixtures ───────────────────────────────────────────────

@pytest.fixture
def proactive_repo():
    return ProactiveRecommendationRepository()


@pytest.fixture
def proactive_agent(proactive_repo, approval_engine):
    agent = ProactiveRecommendationAgent(repo=proactive_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────────

async def _seed_recommendation(
    repo: ProactiveRecommendationRepository,
    family_id: str = "fam_001",
    title: str = "Test Rec",
    rec_type: RecommendationType = RecommendationType.ACTIVITY,
    score: float = 80.0,
):
    data = CreateRecommendation(
        family_id=family_id,
        recommendation_type=rec_type,
        title=title,
        description=f"Descripción de {title}",
        priority=RecommendationPriority.MEDIUM,
        score=score,
    )
    return await repo.create_recommendation(data)


async def _seed_suggestion(
    repo: ProactiveRecommendationRepository,
    name: str = "Padel",
    target: str = "adultos",
):
    data = CreateActivitySuggestion(
        name=name,
        description=f"Actividad de {name}",
        target_demographic=target,
        estimated_interest=75.0,
        estimated_cost=5000.0,
        member_requests_count=15,
    )
    return await repo.create_suggestion(data)


async def _seed_pricing(
    repo: ProactiveRecommendationRepository,
    service_name: str = "Alquiler Cancha",
):
    data = CreatePricingOptimization(
        service_name=service_name,
        current_price=50.0,
        suggested_price=65.0,
        strategy=PricingStrategy.DEMAND_BASED,
        expected_revenue_change=5000.0,
        expected_demand_change=-10.0,
        reasoning="Alta demanda en fines de semana",
    )
    return await repo.create_pricing(data)


# ═══════════════════════════════════════════════════════════
# TEST: OPTIMIZE PRICING
# ═══════════════════════════════════════════════════════════


class TestOptimizePricing:
    @pytest.mark.asyncio
    async def test_list_pricing_empty(self, proactive_agent):
        result = await proactive_agent.optimize_pricing(action="list")
        assert result["status"] == "success"
        assert result["pricings"] == []

    @pytest.mark.asyncio
    async def test_create_pricing_pending_approval(
        self, proactive_agent
    ):
        result = await proactive_agent.optimize_pricing(
            action="create",
            service_name="Alquiler Cancha",
            current_price=50.0,
            suggested_price=65.0,
            strategy="demand_based",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "change_pct" in result["details"]

    @pytest.mark.asyncio
    async def test_approve_and_execute_pricing(
        self, proactive_agent, approval_engine
    ):
        result = await proactive_agent.optimize_pricing(
            action="create",
            service_name="Spa Premium",
            current_price=80.0,
            suggested_price=100.0,
            strategy="seasonal",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado para temporada alta",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await proactive_agent.execute_pricing_optimization(
            service_name="Spa Premium",
            current_price=80.0,
            suggested_price=100.0,
            strategy="seasonal",
        )
        assert exec_result["status"] == "success"
        assert exec_result["pricing"]["status"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_pricing(
        self, proactive_agent, approval_engine
    ):
        result = await proactive_agent.optimize_pricing(
            action="create",
            service_name="Servicio Caro",
            current_price=100.0,
            suggested_price=300.0,
            strategy="demand_based",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Aumento excesivo",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_get_pricing(self, proactive_agent, proactive_repo):
        pricing = await _seed_pricing(proactive_repo)
        result = await proactive_agent.optimize_pricing(
            action="get", pricing_id=pricing.id
        )
        assert result["status"] == "success"
        assert result["pricing"]["id"] == pricing.id

    @pytest.mark.asyncio
    async def test_update_pricing_status(
        self, proactive_agent, proactive_repo
    ):
        pricing = await _seed_pricing(proactive_repo)
        result = await proactive_agent.optimize_pricing(
            action="update_status",
            pricing_id=pricing.id,
            new_status="implemented",
        )
        assert result["status"] == "success"
        assert result["pricing"]["status"] == "implemented"

    @pytest.mark.asyncio
    async def test_create_pricing_missing_fields(
        self, proactive_agent
    ):
        result = await proactive_agent.optimize_pricing(
            action="create",
            service_name="Test",
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.asyncio
    async def test_create_pricing_invalid_strategy(
        self, proactive_agent
    ):
        result = await proactive_agent.optimize_pricing(
            action="create",
            service_name="Test",
            current_price=50.0,
            suggested_price=60.0,
            strategy="magic",
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_list_pricing_with_data(
        self, proactive_agent, proactive_repo
    ):
        await _seed_pricing(proactive_repo, "Servicio 1")
        await _seed_pricing(proactive_repo, "Servicio 2")
        result = await proactive_agent.optimize_pricing(action="list")
        assert result["status"] == "success"
        assert len(result["pricings"]) == 2


# ═══════════════════════════════════════════════════════════
# TEST: SUGGEST NEW ACTIVITIES
# ═══════════════════════════════════════════════════════════


class TestSuggestNewActivities:
    @pytest.mark.asyncio
    async def test_list_suggestions_empty(self, proactive_agent):
        result = await proactive_agent.suggest_new_activities(
            action="list"
        )
        assert result["status"] == "success"
        assert result["suggestions"] == []

    @pytest.mark.asyncio
    async def test_create_suggestion_pending_approval(
        self, proactive_agent
    ):
        result = await proactive_agent.suggest_new_activities(
            action="create",
            name="Padel",
            description="Canchas de padel para socios",
            target_demographic="adultos",
            estimated_interest=80.0,
            estimated_cost=15000.0,
            member_requests_count=25,
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_approve_and_execute_suggestion(
        self, proactive_agent, approval_engine
    ):
        result = await proactive_agent.suggest_new_activities(
            action="create",
            name="Escalada",
            description="Muro de escalada recreativo",
            target_demographic="jovenes",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado por popularidad",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await proactive_agent.execute_activity_suggestion(
            name="Escalada",
            description="Muro de escalada recreativo",
            target_demographic="jovenes",
        )
        assert exec_result["status"] == "success"
        assert exec_result["suggestion"]["status"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_suggestion(
        self, proactive_agent, approval_engine
    ):
        result = await proactive_agent.suggest_new_activities(
            action="create",
            name="Polo",
            description="Campo de polo",
            target_demographic="elite",
            estimated_cost=500000.0,
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Costo prohibitivo",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_get_suggestion(
        self, proactive_agent, proactive_repo
    ):
        suggestion = await _seed_suggestion(proactive_repo)
        result = await proactive_agent.suggest_new_activities(
            action="get", suggestion_id=suggestion.id
        )
        assert result["status"] == "success"
        assert result["suggestion"]["id"] == suggestion.id

    @pytest.mark.asyncio
    async def test_create_suggestion_missing_fields(
        self, proactive_agent
    ):
        result = await proactive_agent.suggest_new_activities(
            action="create", name="Test"
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.asyncio
    async def test_update_suggestion_status(
        self, proactive_agent, proactive_repo
    ):
        suggestion = await _seed_suggestion(proactive_repo)
        result = await proactive_agent.suggest_new_activities(
            action="update_status",
            suggestion_id=suggestion.id,
            new_status="implemented",
        )
        assert result["status"] == "success"
        assert result["suggestion"]["status"] == "implemented"

    @pytest.mark.asyncio
    async def test_list_suggestions_with_data(
        self, proactive_agent, proactive_repo
    ):
        await _seed_suggestion(proactive_repo, "Yoga")
        await _seed_suggestion(proactive_repo, "Pilates")
        result = await proactive_agent.suggest_new_activities(
            action="list"
        )
        assert result["status"] == "success"
        assert len(result["suggestions"]) == 2


# ═══════════════════════════════════════════════════════════
# TEST: GENERATE FAMILY RECOMMENDATIONS
# ═══════════════════════════════════════════════════════════


class TestGenerateFamilyRecommendations:
    @pytest.mark.asyncio
    async def test_generate_recommendations(self, proactive_agent):
        result = await proactive_agent.generate_family_recommendations(
            family_id="fam_001"
        )
        assert result["status"] == "success"
        assert len(result["recommendations"]) > 0

    @pytest.mark.asyncio
    async def test_generate_with_type_filter(self, proactive_agent):
        result = await proactive_agent.generate_family_recommendations(
            family_id="fam_001",
            recommendation_type="activity",
        )
        assert result["status"] == "success"
        assert len(result["recommendations"]) == 1
        assert (
            result["recommendations"][0]["recommendation_type"]
            == "activity"
        )

    @pytest.mark.asyncio
    async def test_generate_with_limit(self, proactive_agent):
        result = await proactive_agent.generate_family_recommendations(
            family_id="fam_001", limit=2
        )
        assert result["status"] == "success"
        assert len(result["recommendations"]) <= 2

    @pytest.mark.asyncio
    async def test_generate_invalid_type(self, proactive_agent):
        result = await proactive_agent.generate_family_recommendations(
            family_id="fam_001",
            recommendation_type="bowling",
        )
        assert result["status"] == "error"
        assert "no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_generate_global(self, proactive_agent):
        result = await proactive_agent.generate_family_recommendations()
        assert result["status"] == "success"
        assert len(result["recommendations"]) > 0


# ═══════════════════════════════════════════════════════════
# TEST: PREDICT EVENT ATTENDANCE
# ═══════════════════════════════════════════════════════════


class TestPredictEventAttendance:
    @pytest.mark.asyncio
    async def test_predict_attendance(self, proactive_agent):
        result = await proactive_agent.predict_event_attendance(
            event_name="Torneo de Tenis",
            event_type="tournament",
            venue_capacity=200,
        )
        assert result["status"] == "success"
        assert result["prediction"]["predicted_attendance"] > 0
        assert result["prediction"]["event_name"] == "Torneo de Tenis"

    @pytest.mark.asyncio
    async def test_predict_gala(self, proactive_agent):
        result = await proactive_agent.predict_event_attendance(
            event_name="Gala de Navidad",
            event_type="gala",
            venue_capacity=300,
        )
        assert result["status"] == "success"
        # Galas tienen multiplicador 1.3
        assert result["prediction"]["predicted_attendance"] > 150

    @pytest.mark.asyncio
    async def test_predict_missing_name(self, proactive_agent):
        result = await proactive_agent.predict_event_attendance()
        assert result["status"] == "error"
        assert "event_name" in result["message"]

    @pytest.mark.asyncio
    async def test_predict_default_capacity(self, proactive_agent):
        result = await proactive_agent.predict_event_attendance(
            event_name="Evento Pequeño"
        )
        assert result["status"] == "success"
        assert result["prediction"]["predicted_attendance"] > 0

    @pytest.mark.asyncio
    async def test_predict_social_low_multiplier(
        self, proactive_agent
    ):
        result = await proactive_agent.predict_event_attendance(
            event_name="Mixer Social",
            event_type="social",
            venue_capacity=100,
        )
        assert result["status"] == "success"
        # social tiene multiplicador 0.8
        assert result["prediction"]["predicted_attendance"] < 100


# ═══════════════════════════════════════════════════════════
# TEST: DETECT SCHEDULING CONFLICTS
# ═══════════════════════════════════════════════════════════


class TestDetectSchedulingConflicts:
    @pytest.mark.asyncio
    async def test_detect_no_conflicts(self, proactive_agent):
        result = await proactive_agent.detect_scheduling_conflicts(
            date="2026-12-25"
        )
        assert result["status"] == "success"
        assert result["total_conflicts"] == 0

    @pytest.mark.asyncio
    async def test_detect_missing_date(self, proactive_agent):
        result = await proactive_agent.detect_scheduling_conflicts()
        assert result["status"] == "error"
        assert "date" in result["message"]

    @pytest.mark.asyncio
    async def test_detect_with_severity_filter(
        self, proactive_agent, proactive_repo
    ):
        # Sembrar un conflicto
        await proactive_repo.create_conflict(
            event_a_id="evt_1",
            event_a_name="Torneo",
            event_b_id="evt_2",
            event_b_name="Cena",
            conflict_type="venue_overlap",
            severity="high",
        )
        result = await proactive_agent.detect_scheduling_conflicts(
            date="2026-06-15",
            severity_filter="high",
        )
        assert result["status"] == "success"
        assert result["total_conflicts"] == 1

    @pytest.mark.asyncio
    async def test_detect_with_data(
        self, proactive_agent, proactive_repo
    ):
        await proactive_repo.create_conflict(
            event_a_id="evt_a",
            event_a_name="Evento A",
            event_b_id="evt_b",
            event_b_name="Evento B",
            conflict_type="time_overlap",
            severity="medium",
        )
        await proactive_repo.create_conflict(
            event_a_id="evt_c",
            event_a_name="Evento C",
            event_b_id="evt_d",
            event_b_name="Evento D",
            conflict_type="resource_conflict",
            severity="low",
        )
        result = await proactive_agent.detect_scheduling_conflicts(
            date="2026-07-01"
        )
        assert result["status"] == "success"
        assert result["total_conflicts"] == 2


# ═══════════════════════════════════════════════════════════
# TEST: PERSONALIZE COMMUNICATION
# ═══════════════════════════════════════════════════════════


class TestPersonalizeCommunication:
    @pytest.mark.asyncio
    async def test_personalize_email(self, proactive_agent):
        result = await proactive_agent.personalize_communication(
            family_id="fam_001",
            family_name="Familia Garcia",
            topic="event_invitation",
            channel="email",
        )
        assert result["status"] == "success"
        assert result["draft"]["family_id"] == "fam_001"
        assert "Garcia" in result["draft"]["subject"]

    @pytest.mark.asyncio
    async def test_personalize_whatsapp(self, proactive_agent):
        result = await proactive_agent.personalize_communication(
            family_id="fam_001",
            family_name="Familia Lopez",
            topic="activity_reminder",
            channel="whatsapp",
        )
        assert result["status"] == "success"
        assert result["draft"]["channel"] == "whatsapp"

    @pytest.mark.asyncio
    async def test_personalize_unknown_topic(self, proactive_agent):
        result = await proactive_agent.personalize_communication(
            family_id="fam_001",
            family_name="Test",
            topic="custom_topic",
        )
        assert result["status"] == "success"
        # Usa template genérico
        assert "Castillo Country Club" in result["draft"]["body"]

    @pytest.mark.asyncio
    async def test_personalize_missing_fields(
        self, proactive_agent
    ):
        result = await proactive_agent.personalize_communication(
            family_id="fam_001"
        )
        assert result["status"] == "error"
        assert "topic" in result["message"]

    @pytest.mark.asyncio
    async def test_personalize_loyalty_reward(self, proactive_agent):
        result = await proactive_agent.personalize_communication(
            family_id="fam_002",
            family_name="Familia Rodriguez",
            topic="loyalty_reward",
        )
        assert result["status"] == "success"
        assert "Rodriguez" in result["draft"]["subject"]


# ═══════════════════════════════════════════════════════════
# TEST: IDENTIFY SOCIAL CLUSTERS
# ═══════════════════════════════════════════════════════════


class TestIdentifySocialClusters:
    @pytest.mark.asyncio
    async def test_identify_clusters_empty(self, proactive_agent):
        result = await proactive_agent.identify_social_clusters()
        assert result["status"] == "success"
        assert result["total_clusters"] == 0

    @pytest.mark.asyncio
    async def test_identify_clusters_with_data(
        self, proactive_agent, proactive_repo
    ):
        await proactive_repo.create_cluster(
            name="Familias Deportivas",
            cluster_type=ClusterType.ACTIVITY,
            description="Familias que practican deportes juntas",
            family_ids=["fam_001", "fam_002", "fam_003"],
            shared_interests=["tennis", "golf"],
        )
        await proactive_repo.create_cluster(
            name="Grupo Cultural",
            cluster_type=ClusterType.INTEREST,
            description="Amantes del arte y la cultura",
            family_ids=["fam_004", "fam_005"],
            shared_interests=["arte", "música"],
        )
        result = await proactive_agent.identify_social_clusters()
        assert result["status"] == "success"
        assert result["total_clusters"] == 2

    @pytest.mark.asyncio
    async def test_identify_clusters_by_type(
        self, proactive_agent, proactive_repo
    ):
        await proactive_repo.create_cluster(
            name="Cluster Social",
            cluster_type=ClusterType.SOCIAL,
            family_ids=["fam_001", "fam_002"],
        )
        await proactive_repo.create_cluster(
            name="Cluster Actividad",
            cluster_type=ClusterType.ACTIVITY,
            family_ids=["fam_003", "fam_004"],
        )
        result = await proactive_agent.identify_social_clusters(
            cluster_type="social"
        )
        assert result["status"] == "success"
        assert result["total_clusters"] == 1

    @pytest.mark.asyncio
    async def test_identify_clusters_min_size(
        self, proactive_agent, proactive_repo
    ):
        # Cluster con 1 familia (menor que min_size=2)
        await proactive_repo.create_cluster(
            name="Solo",
            cluster_type=ClusterType.SOCIAL,
            family_ids=["fam_001"],
        )
        result = await proactive_agent.identify_social_clusters(
            min_size=2
        )
        assert result["status"] == "success"
        assert result["total_clusters"] == 0


# ═══════════════════════════════════════════════════════════
# TEST: GENERATE QUARTERLY INSIGHTS
# ═══════════════════════════════════════════════════════════


class TestGenerateQuarterlyInsights:
    @pytest.mark.asyncio
    async def test_generate_insights(self, proactive_agent):
        result = await proactive_agent.generate_quarterly_insights(
            action="generate",
            year=2026,
            period="Q1",
        )
        assert result["status"] == "success"
        assert result["insight"]["year"] == 2026
        assert result["insight"]["period"] == "Q1"
        assert result["insight"]["events_held"] == 45
        assert len(result["insight"]["key_achievements"]) > 0

    @pytest.mark.asyncio
    async def test_generate_invalid_period(self, proactive_agent):
        result = await proactive_agent.generate_quarterly_insights(
            action="generate",
            year=2026,
            period="Q5",
        )
        assert result["status"] == "error"
        assert "no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_generate_missing_fields(self, proactive_agent):
        result = await proactive_agent.generate_quarterly_insights(
            action="generate",
            year=2026,
        )
        assert result["status"] == "error"
        assert "period" in result["message"]

    @pytest.mark.asyncio
    async def test_list_insights(self, proactive_agent, proactive_repo):
        # Generar primero
        await proactive_agent.generate_quarterly_insights(
            action="generate", year=2026, period="Q2"
        )
        result = await proactive_agent.generate_quarterly_insights(
            action="list", year=2026, period="Q2"
        )
        assert result["status"] == "success"
        assert len(result["insights"]) == 1

    @pytest.mark.asyncio
    async def test_get_insight(self, proactive_agent, proactive_repo):
        # Generar
        gen = await proactive_agent.generate_quarterly_insights(
            action="generate", year=2026, period="Q3"
        )
        insight_id = gen["insight"]["id"]
        result = await proactive_agent.generate_quarterly_insights(
            action="get", insight_id=insight_id
        )
        assert result["status"] == "success"
        assert result["insight"]["id"] == insight_id

    @pytest.mark.asyncio
    async def test_update_insight_status(
        self, proactive_agent, proactive_repo
    ):
        gen = await proactive_agent.generate_quarterly_insights(
            action="generate", year=2026, period="Q4"
        )
        insight_id = gen["insight"]["id"]
        result = await proactive_agent.generate_quarterly_insights(
            action="update_status",
            insight_id=insight_id,
            new_status="approved",
        )
        assert result["status"] == "success"
        assert result["insight"]["status"] == "approved"

    @pytest.mark.asyncio
    async def test_get_insight_not_found(self, proactive_agent):
        result = await proactive_agent.generate_quarterly_insights(
            action="get", insight_id="nonexistent"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_insights_empty(self, proactive_agent):
        result = await proactive_agent.generate_quarterly_insights(
            action="list"
        )
        assert result["status"] == "success"
        assert result["insights"] == []
