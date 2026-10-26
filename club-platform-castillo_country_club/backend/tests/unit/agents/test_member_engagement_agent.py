"""
Tests for MemberEngagementAgent.
Club: Castillo Country Club
"""

from __future__ import annotations

import pytest
from uuid import UUID

from club_mcp.agents.member_engagement_agent import MemberEngagementAgent
from club_mcp.db.repositories.member_engagement_repo import (
    MemberEngagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.member_engagement import (
    CampaignType,
    CreateEngagementProfile,
    CreateLoyaltyReward,
    CreateMemberFeedback,
    CreateReactivationCampaign,
    CreateReferral,
    EngagementLevel,
    FeedbackChannel,
    FeedbackSentiment,
    RewardStatus,
    RewardType,
)


# ── Fixtures ───────────────────────────────────────────

@pytest.fixture
def engagement_repo():
    return MemberEngagementRepository()


@pytest.fixture
def engagement_agent(engagement_repo, approval_engine):
    agent = MemberEngagementAgent(repo=engagement_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────

async def _seed_profile(repo, **overrides):
    data = CreateEngagementProfile(
        member_id=overrides.get("member_id", "M001"),
        member_name=overrides.get("member_name", "Carlos García"),
        engagement_level=overrides.get(
            "engagement_level", EngagementLevel.ENGAGED
        ),
        activity_score=overrides.get("activity_score", 85.0),
        visits_last_30_days=overrides.get("visits_last_30_days", 8),
        visits_last_90_days=overrides.get("visits_last_90_days", 22),
        total_spend_ytd=overrides.get("total_spend_ytd", 1500000.0),
        favorite_activities=overrides.get(
            "favorite_activities", ["tennis", "spa"]
        ),
        loyalty_points=overrides.get("loyalty_points", 0),
        tags=overrides.get("tags", ["premium"]),
    )
    return await repo.create_profile(data)


async def _seed_reward(repo, **overrides):
    data = CreateLoyaltyReward(
        member_id=overrides.get("member_id", "M001"),
        member_name=overrides.get("member_name", "Carlos García"),
        reward_type=overrides.get("reward_type", RewardType.DISCOUNT),
        description=overrides.get("description", "10% en el restaurante"),
        points_cost=overrides.get("points_cost", 500),
        monetary_value=overrides.get("monetary_value", 25000.0),
        valid_from=overrides.get("valid_from", "2026-05-01"),
        valid_until=overrides.get("valid_until", "2026-08-01"),
    )
    return await repo.create_reward(data)


async def _seed_feedback(repo, **overrides):
    data = CreateMemberFeedback(
        member_id=overrides.get("member_id", "M001"),
        member_name=overrides.get("member_name", "Carlos García"),
        channel=overrides.get("channel", FeedbackChannel.IN_APP),
        sentiment=overrides.get("sentiment", FeedbackSentiment.POSITIVE),
        rating=overrides.get("rating", 5),
        category=overrides.get("category", "servicio"),
        comment=overrides.get("comment", "Excelente atención"),
    )
    return await repo.create_feedback(data)


async def _seed_referral(repo, **overrides):
    data = CreateReferral(
        referrer_member_id=overrides.get("referrer_member_id", "M001"),
        referrer_name=overrides.get("referrer_name", "Carlos García"),
        referred_name=overrides.get("referred_name", "Ana Mora"),
        referred_email=overrides.get("referred_email", "ana@example.com"),
        reward_points=overrides.get("reward_points", 500),
    )
    return await repo.create_referral(data)


# ══════════════════════════════════════════════════════
# TEST CLASS 1: get_engagement_insights
# ══════════════════════════════════════════════════════


class TestGetEngagementInsights:

    @pytest.mark.asyncio
    async def test_list_empty(self, engagement_agent):
        result = await engagement_agent.get_engagement_insights()
        assert result["status"] == "success"
        assert result["profiles"] == []

    @pytest.mark.asyncio
    async def test_list_with_profiles(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(engagement_repo, member_id="M001")
        await _seed_profile(
            engagement_repo,
            member_id="M002",
            member_name="María López",
            engagement_level=EngagementLevel.AT_RISK,
        )

        result = await engagement_agent.get_engagement_insights()
        assert result["status"] == "success"
        assert result["summary"]["total"] == 2
        assert "engaged" in result["summary"]["by_level"]
        assert "at_risk" in result["summary"]["by_level"]

    @pytest.mark.asyncio
    async def test_filter_by_level(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(engagement_repo, member_id="M001")
        await _seed_profile(
            engagement_repo,
            member_id="M002",
            member_name="María",
            engagement_level=EngagementLevel.AT_RISK,
        )

        result = await engagement_agent.get_engagement_insights(
            engagement_level="at_risk"
        )
        assert result["status"] == "success"
        assert len(result["profiles"]) == 1

    @pytest.mark.asyncio
    async def test_invalid_level(self, engagement_agent):
        result = await engagement_agent.get_engagement_insights(
            engagement_level="super_saiyan"
        )
        assert result["status"] == "error"
        assert "Nivel no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_get_by_member(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(engagement_repo, member_id="M050")

        result = await engagement_agent.get_engagement_insights(
            member_id="M050"
        )
        assert result["status"] == "success"
        assert result["profile"]["member_id"] == "M050"
        assert "insights" in result

    @pytest.mark.asyncio
    async def test_get_not_found(self, engagement_agent):
        result = await engagement_agent.get_engagement_insights(
            member_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_insights_at_risk(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(
            engagement_repo,
            member_id="M070",
            engagement_level=EngagementLevel.AT_RISK,
            visits_last_30_days=0,
        )

        result = await engagement_agent.get_engagement_insights(
            member_id="M070"
        )
        assert result["status"] == "success"
        assert any("riesgo" in i for i in result["insights"])


# ══════════════════════════════════════════════════════
# TEST CLASS 2: design_reactivation_campaign
# ══════════════════════════════════════════════════════


class TestDesignReactivationCampaign:

    @pytest.mark.asyncio
    async def test_list_empty(self, engagement_agent):
        result = await engagement_agent.design_reactivation_campaign(
            action="list"
        )
        assert result["status"] == "success"
        assert result["campaigns"] == []

    @pytest.mark.asyncio
    async def test_create_hitl_pending(self, engagement_agent):
        result = await engagement_agent.design_reactivation_campaign(
            action="create",
            name="Reactivación Mayo 2026",
            campaign_type="reactivation",
            description="Contactar socios inactivos",
            target_member_ids="M010,M020,M030",
            target_engagement_level="inactive",
            channels="email,whatsapp",
            start_date="2026-06-01",
            end_date="2026-06-30",
            budget=500000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "Reactivación" in result["message"]

    @pytest.mark.asyncio
    async def test_create_approve_and_execute(
        self, engagement_agent, approval_engine
    ):
        result = await engagement_agent.design_reactivation_campaign(
            action="create",
            name="Retención Premium",
            campaign_type="retention",
            description="Retener socios premium",
            target_member_ids="M001,M002",
            start_date="2026-07-01",
            end_date="2026-09-30",
            budget=300000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Campaña aprobada.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await engagement_agent.execute_reactivation_campaign(
            name="Retención Premium",
            campaign_type="retention",
            description="Retener socios premium",
            target_member_ids=["M001", "M002"],
            start_date="2026-07-01",
            end_date="2026-09-30",
            budget=300000.0,
        )

        assert execute_result["status"] == "success"
        assert execute_result["campaign"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, engagement_agent):
        result = await engagement_agent.design_reactivation_campaign(
            action="create",
            name="Incompleta",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_type(self, engagement_agent):
        result = await engagement_agent.design_reactivation_campaign(
            action="create",
            name="Test",
            campaign_type="tiktok_viral",
            description="Desc",
            start_date="2026-06-01",
            end_date="2026-07-01",
        )
        assert result["status"] == "error"
        assert "Tipo no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_update_status(
        self, engagement_agent, engagement_repo
    ):
        data = CreateReactivationCampaign(
            name="Test Campaign",
            campaign_type=CampaignType.REACTIVATION,
            description="Test",
            start_date="2026-06-01",
            end_date="2026-07-01",
        )
        campaign = await engagement_repo.create_campaign(data)

        result = await engagement_agent.design_reactivation_campaign(
            action="update_status",
            campaign_id=campaign.id,
            new_status="paused",
        )
        assert result["status"] == "success"
        assert "paused" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(
        self, engagement_agent, engagement_repo
    ):
        data = CreateReactivationCampaign(
            name="Mi Campaña",
            campaign_type=CampaignType.REACTIVATION,
            description="Desc",
            start_date="2026-06-01",
            end_date="2026-07-01",
        )
        campaign = await engagement_repo.create_campaign(data)

        result = await engagement_agent.design_reactivation_campaign(
            action="get", campaign_id=campaign.id
        )
        assert result["status"] == "success"
        assert result["campaign"]["name"] == "Mi Campaña"

    @pytest.mark.asyncio
    async def test_invalid_action(self, engagement_agent):
        result = await engagement_agent.design_reactivation_campaign(
            action="dance"
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 3: manage_loyalty_rewards
# ══════════════════════════════════════════════════════


class TestManageLoyaltyRewards:

    @pytest.mark.asyncio
    async def test_list_empty(self, engagement_agent):
        result = await engagement_agent.manage_loyalty_rewards(action="list")
        assert result["status"] == "success"
        assert result["rewards"] == []

    @pytest.mark.asyncio
    async def test_create_hitl_pending(self, engagement_agent):
        result = await engagement_agent.manage_loyalty_rewards(
            action="create",
            member_id="M001",
            member_name="Carlos García",
            reward_type="discount",
            description="15% en spa",
            points_cost=800,
            monetary_value=35000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_create_approve_and_execute(
        self, engagement_agent, approval_engine
    ):
        result = await engagement_agent.manage_loyalty_rewards(
            action="create",
            member_id="M001",
            member_name="Carlos García",
            reward_type="free_service",
            description="Clase de yoga gratis",
            points_cost=200,
            monetary_value=15000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Recompensa aprobada.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await engagement_agent.execute_loyalty_reward(
            member_id="M001",
            member_name="Carlos García",
            reward_type="free_service",
            description="Clase de yoga gratis",
            points_cost=200,
            monetary_value=15000.0,
        )

        assert execute_result["status"] == "success"
        assert execute_result["reward"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_redeem_success(
        self, engagement_agent, engagement_repo
    ):
        reward = await _seed_reward(engagement_repo)

        result = await engagement_agent.manage_loyalty_rewards(
            action="redeem", reward_id=reward.id
        )
        assert result["status"] == "success"
        assert "redimida" in result["message"]

    @pytest.mark.asyncio
    async def test_redeem_already_redeemed(
        self, engagement_agent, engagement_repo
    ):
        reward = await _seed_reward(engagement_repo)
        await engagement_agent.manage_loyalty_rewards(
            action="redeem", reward_id=reward.id
        )

        result = await engagement_agent.manage_loyalty_rewards(
            action="redeem", reward_id=reward.id
        )
        assert result["status"] == "error"
        assert "no está activa" in result["message"]

    @pytest.mark.asyncio
    async def test_get_not_found(self, engagement_agent):
        result = await engagement_agent.manage_loyalty_rewards(
            action="get", reward_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_success(
        self, engagement_agent, engagement_repo
    ):
        reward = await _seed_reward(engagement_repo)
        result = await engagement_agent.manage_loyalty_rewards(
            action="get", reward_id=reward.id
        )
        assert result["status"] == "success"
        assert result["reward"]["description"] == "10% en el restaurante"

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, engagement_agent):
        result = await engagement_agent.manage_loyalty_rewards(
            action="create",
            member_id="M001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_invalid_reward_type(self, engagement_agent):
        result = await engagement_agent.manage_loyalty_rewards(
            action="create",
            member_id="M001",
            member_name="Test",
            reward_type="unicorn_tears",
            description="Test",
        )
        assert result["status"] == "error"
        assert "Tipo de recompensa no válido" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 4: submit_feedback
# ══════════════════════════════════════════════════════


class TestSubmitFeedback:

    @pytest.mark.asyncio
    async def test_create_success(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="create",
            member_id="M001",
            member_name="Carlos García",
            channel="in_app",
            sentiment="positive",
            rating=5,
            category="servicio",
            comment="Excelente atención en el restaurante",
        )

        assert result["status"] == "success"
        assert "Carlos García" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="create",
            member_id="M001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_channel(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="create",
            member_id="M001",
            member_name="Test",
            channel="carrier_pigeon",
            comment="Test",
        )
        assert result["status"] == "error"
        assert "Canal no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_sentiment(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="create",
            member_id="M001",
            member_name="Test",
            sentiment="existential_crisis",
            comment="Test",
        )
        assert result["status"] == "error"
        assert "Sentimiento no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_respond_success(
        self, engagement_agent, engagement_repo
    ):
        fb = await _seed_feedback(engagement_repo)

        result = await engagement_agent.submit_feedback(
            action="respond",
            feedback_id=fb.id,
            response="Gracias por sus comentarios, Carlos.",
        )

        assert result["status"] == "success"
        assert result["feedback"]["response"] is not None

    @pytest.mark.asyncio
    async def test_respond_not_found(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="respond",
            feedback_id="no_existe",
            response="Respuesta",
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_empty(self, engagement_agent):
        result = await engagement_agent.submit_feedback(action="list")
        assert result["status"] == "success"
        assert result["feedbacks"] == []

    @pytest.mark.asyncio
    async def test_get_not_found(self, engagement_agent):
        result = await engagement_agent.submit_feedback(
            action="get", feedback_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_invalid_action(self, engagement_agent):
        result = await engagement_agent.submit_feedback(action="yell")
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 5: manage_referrals
# ══════════════════════════════════════════════════════


class TestManageReferrals:

    @pytest.mark.asyncio
    async def test_create_success(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(engagement_repo, member_id="M001")

        result = await engagement_agent.manage_referrals(
            action="create",
            referrer_member_id="M001",
            referrer_name="Carlos García",
            referred_name="Ana Mora",
            referred_email="ana@example.com",
        )

        assert result["status"] == "success"
        assert "Ana Mora" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, engagement_agent):
        result = await engagement_agent.manage_referrals(
            action="create",
            referrer_member_id="M001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_convert_success(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(
            engagement_repo,
            member_id="M001",
            loyalty_points=500,
        )
        referral = await _seed_referral(engagement_repo)

        result = await engagement_agent.manage_referrals(
            action="convert", referral_id=referral.id
        )

        assert result["status"] == "success"
        assert "convertido" in result["message"]
        assert result["referral"]["status"] == "converted"

        # Verify points were added
        profile = await engagement_repo.get_profile_by_member("M001")
        assert profile.loyalty_points == 1000

    @pytest.mark.asyncio
    async def test_convert_not_found(self, engagement_agent):
        result = await engagement_agent.manage_referrals(
            action="convert", referral_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_empty(self, engagement_agent):
        result = await engagement_agent.manage_referrals(action="list")
        assert result["status"] == "success"
        assert result["referrals"] == []

    @pytest.mark.asyncio
    async def test_list_with_filter(
        self, engagement_agent, engagement_repo
    ):
        await _seed_referral(engagement_repo, referrer_member_id="M001")
        await _seed_referral(
            engagement_repo,
            referrer_member_id="M002",
            referrer_name="María López",
            referred_name="Pedro Vargas",
        )

        result = await engagement_agent.manage_referrals(
            action="list", referrer_member_id="M001"
        )
        assert result["status"] == "success"
        assert len(result["referrals"]) == 1

    @pytest.mark.asyncio
    async def test_invalid_action(self, engagement_agent):
        result = await engagement_agent.manage_referrals(action="fly")
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 6: get_engagement_dashboard
# ══════════════════════════════════════════════════════


class TestGetEngagementDashboard:

    @pytest.mark.asyncio
    async def test_dashboard_empty(self, engagement_agent):
        result = await engagement_agent.get_engagement_dashboard()
        assert result["status"] == "success"
        assert result["dashboard"]["profiles"]["total"] == 0
        assert result["dashboard"]["campaigns"]["total"] == 0

    @pytest.mark.asyncio
    async def test_dashboard_with_data(
        self, engagement_agent, engagement_repo
    ):
        await _seed_profile(
            engagement_repo,
            member_id="M001",
            engagement_level=EngagementLevel.ENGAGED,
            loyalty_points=1200,
        )
        await _seed_profile(
            engagement_repo,
            member_id="M002",
            member_name="María López",
            engagement_level=EngagementLevel.AT_RISK,
        )
        await _seed_reward(engagement_repo)
        await _seed_feedback(engagement_repo)
        await _seed_referral(engagement_repo)

        result = await engagement_agent.get_engagement_dashboard()
        assert result["status"] == "success"

        d = result["dashboard"]
        assert d["profiles"]["total"] == 2
        assert d["profiles"]["total_loyalty_points"] == 1200
        assert len(d["profiles"]["at_risk_members"]) == 1
        assert d["rewards"]["total"] == 1
        assert d["feedback"]["total"] == 1
        assert d["referrals"]["total"] == 1
