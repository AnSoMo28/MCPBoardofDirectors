"""Suite de persistencia Ola 2.1-tris — gate del vertical engagement:

    pytest: write → restart runtime → read OK

Misma mecánica de family (Ola 2.1-bis): restart REAL (engine.dispose()
+ engine NUEVO + sesión nueva) · RE-RUNNABLE (_reset_backend antes de
cada test) · sqlite local / pgvector real en CI.

Además — el gate de CONTRATO: los 42 tests del agente engagement
(tests/unit/agents/test_member_engagement_agent.py) corren contra el
repo in-memory; este archivo verifica que el repo ORM cumple el
mismo contrato sobre las 5 entidades (profiles · campaigns · rewards
· feedback · referrals) comparando comportamiento observable.
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.engagement_repo import (
    MemberEngagementRepository as EngagementRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.member_engagement import (
    CampaignStatus,
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


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_engagement.db"


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


pytestmark = pytest.mark.asyncio


async def _make_repo() -> tuple[EngagementRepoORM, object]:
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return EngagementRepoORM(engine), engine


async def test_engagement_write_restart_read() -> None:
    """PATH 2.1-tris gate: write → dispose (restart) → NEW engine → read."""
    await _reset_backend()
    url = _backend_url()
    # write (engine 1) — datos que SOLO existen en las tablas
    engine1 = make_engine(url)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo1 = EngagementRepoORM(engine1)
    profile = await repo1.create_profile(
        CreateEngagementProfile(
            member_id="member-001",
            member_name="Carlos Garcia",
            engagement_level=EngagementLevel.ENGAGED,
            activity_score=87.5,
            visits_last_30_days=12,
            visits_last_90_days=34,
            total_spend_ytd=4500.00,
            favorite_activities=["tennis", "gym"],
            loyalty_points=1200,
            tags=["vip", "tennis-lover"],
        )
    )
    campaign = await repo1.create_campaign(
        CreateReactivationCampaign(
            name="Reactivación Noviembre",
            campaign_type=CampaignType.REACTIVATION,
            description="Socios inactivos 90 días",
            target_member_ids=["member-002", "member-003"],
            channels=[FeedbackChannel.EMAIL, FeedbackChannel.SMS],
            start_date="2026-11-17",
            end_date="2026-12-17",
            budget=5000.00,
        )
    )
    reward = await repo1.create_reward(
        CreateLoyaltyReward(
            member_id="member-001",
            member_name="Carlos Garcia",
            reward_type=RewardType.DISCOUNT,
            description="20% off en pro shop",
            points_cost=800,
            monetary_value=50.00,
            valid_from="2026-11-17",
            valid_until="2027-11-17",
        )
    )
    feedback = await repo1.create_feedback(
        CreateMemberFeedback(
            member_id="member-001",
            member_name="Carlos Garcia",
            channel=FeedbackChannel.IN_APP,
            sentiment=FeedbackSentiment.POSITIVE,
            rating=5,
            category="instalaciones",
            comment="Excelente estado de las canchas",
        )
    )
    referral = await repo1.create_referral(
        CreateReferral(
            referrer_member_id="member-001",
            referrer_name="Carlos Garcia",
            referred_name="Luis Miranda",
            referred_email="luis@ejemplo.cr",
            reward_points=300,
        )
    )
    await engine1.dispose()  # ← restart: TODO lo in-memory muere acá

    # read (engine 2 — NUEVO proceso/sesión)
    engine2 = make_engine(url)
    repo2 = EngagementRepoORM(engine2)
    p2 = await repo2.get_profile(profile.id)
    c2 = await repo2.get_campaign(campaign.id)
    r2 = await repo2.get_reward(reward.id)
    f2 = await repo2.get_feedback(feedback.id)
    ref2 = await repo2.get_referral(referral.id)
    await engine2.dispose()

    assert p2 is not None, "el profile NO sobrevivió al restart"
    assert p2.member_name == "Carlos Garcia"
    assert p2.engagement_level == EngagementLevel.ENGAGED
    assert p2.favorite_activities == ["tennis", "gym"], (
        "favorite_activities (JSONB) NO sobrevivió al restart"
    )
    assert p2.tags == ["vip", "tennis-lover"], "tags (JSONB) no sobrevivieron"
    assert c2 is not None, "la campaign NO sobrevivió al restart"
    assert c2.status == CampaignStatus.DRAFT
    assert c2.channels == [FeedbackChannel.EMAIL, FeedbackChannel.SMS], (
        "channels (JSONB con enums) no sobrevivieron o perdieron el tipo"
    )
    assert r2 is not None and r2.status == RewardStatus.ACTIVE
    assert f2 is not None and f2.rating == 5 and f2.response is None
    assert ref2 is not None and ref2.status == "pending"


async def test_engagement_updates_roundtrip() -> None:
    """update_* con enums y listas: el roundtrip devuelve el mismo Pydantic."""
    await _reset_backend()
    repo, engine = await _make_repo()
    profile = await repo.create_profile(
        CreateEngagementProfile(
            member_id="member-010",
            member_name="Ana Vargas",
            engagement_level=EngagementLevel.MODERATE,
        )
    )
    upd = await repo.update_profile(
        profile.id,
        {
            "engagement_level": EngagementLevel.HIGHLY_ENGAGED,
            "loyalty_points": 2000,
            "favorite_activities": ["natación"],
            "tags": ["nova"],
            "feedback_score": 4.7,
        },
    )
    campaign = await repo.create_campaign(
        CreateReactivationCampaign(
            name="C1",
            campaign_type=CampaignType.REACTIVATION,
            description="c1",
            start_date="2026-11-01",
            end_date="2026-12-01",
        )
    )
    await repo.update_campaign(
        campaign.id,
        {"status": CampaignStatus.ACTIVE, "sent_count": 25, "conversion_count": 3},
    )
    referral = await repo.create_referral(
        CreateReferral(
            referrer_member_id="member-010",
            referrer_name="Ana Vargas",
            referred_name="Paz Molina",
        )
    )
    await repo.update_referral(referral.id, {"status": "converted"})
    await engine.dispose()

    # verificación post-commit con engine NUEVO (lo que CI y el agente ven)
    engine2 = make_engine(_backend_url())
    repo2 = EngagementRepoORM(engine2)
    p = await repo2.get_profile(profile.id)
    c = await repo2.get_campaign(campaign.id)
    ref = await repo2.get_referral(referral.id)
    await engine2.dispose()
    assert upd is not None and upd.engagement_level == EngagementLevel.HIGHLY_ENGAGED
    assert p is not None
    assert p.engagement_level == EngagementLevel.HIGHLY_ENGAGED, (
        "enum en update no persistió su .value"
    )
    assert p.loyalty_points == 2000
    assert p.favorite_activities == ["natación"]
    assert p.feedback_score == 4.7
    assert c is not None
    assert c.status == CampaignStatus.ACTIVE
    assert c.sent_count == 25 and c.conversion_count == 3
    assert ref is not None and ref.status == "converted"


async def test_engagement_lists_and_filters() -> None:
    """list_* con filtros (el contrato del dashboard del agente)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    await repo.create_profile(
        CreateEngagementProfile(
            member_id="m1", member_name="Uno", engagement_level=EngagementLevel.ENGAGED
        )
    )
    await repo.create_profile(
        CreateEngagementProfile(
            member_id="m2", member_name="Dos", engagement_level=EngagementLevel.DISENGAGED
        )
    )
    await repo.create_profile(
        CreateEngagementProfile(
            member_id="m3", member_name="Tres", engagement_level=EngagementLevel.ENGAGED
        )
    )
    only_high = await repo.list_profiles(engagement_level=EngagementLevel.ENGAGED)
    all_profiles = await repo.list_profiles()
    by_member = await repo.get_profile_by_member("m2")
    await engine.dispose()

    assert len(only_high) == 2
    assert {p.member_name for p in only_high} == {"Uno", "Tres"}
    assert len(all_profiles) == 3
    assert by_member is not None and by_member.member_name == "Dos"


async def test_engagement_not_found_same_behavior() -> None:
    """fantasmas → None / [] (contrato: sin excepciones custom)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    assert await repo.get_profile("ghost0000") is None
    assert await repo.get_campaign("ghost0000") is None
    assert await repo.get_reward("ghost0000") is None
    assert await repo.get_feedback("ghost0000") is None
    assert await repo.get_referral("ghost0000") is None
    assert await repo.update_profile("ghost0000", {"notes": "x"}) is None
    assert await repo.update_campaign("ghost0000", {"notes": "x"}) is None
    assert await repo.update_reward("ghost0000", {"notes": "x"}) is None
    assert await repo.update_feedback("ghost0000", {"response": "x"}) is None
    assert await repo.update_referral("ghost0000", {"status": "x"}) is None
    assert await repo.list_profiles() == []
    assert await repo.list_campaigns() == []
    assert await repo.list_rewards() == []
    assert await repo.list_feedback() == []
    assert await repo.list_referrals() == []
    await engine.dispose()


async def test_engagement_filters_campaigns_rewards_feedback() -> None:
    """los 3 filtros de list_* de las otras entidades (contrato completo)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    w = await repo.create_campaign(
        CreateReactivationCampaign(
            name="Winback",
            campaign_type=CampaignType.REACTIVATION,
            description="winback Q4",
            start_date="2026-11-01",
            end_date="2026-12-01",
        )
    )
    await repo.create_campaign(
        CreateReactivationCampaign(
            name="Aniversario",
            campaign_type=CampaignType.ANNIVERSARY,
            description="aniversarios",
            start_date="2026-11-01",
            end_date="2026-12-01",
        )
    )
    await repo.update_campaign(w.id, {"status": CampaignStatus.COMPLETED})
    await repo.create_reward(
        CreateLoyaltyReward(
            member_id="m1",
            member_name="Uno",
            reward_type=RewardType.FREE_SERVICE,
            description="Cena para 2",
            points_cost=500,
            valid_from="2026-11-01",
            valid_until="2027-01-01",
        )
    )
    redeemed = await repo.create_reward(
        CreateLoyaltyReward(
            member_id="m1",
            member_name="Uno",
            reward_type=RewardType.DISCOUNT,
            description="10% off spa",
            points_cost=200,
            valid_from="2026-11-01",
            valid_until="2027-01-01",
        )
    )
    await repo.update_reward(
        redeemed.id, {"status": RewardStatus.REDEEMED, "redeemed_at": "2026-11-10"}
    )
    await repo.create_feedback(
        CreateMemberFeedback(
            member_id="m1",
            member_name="Uno",
            channel=FeedbackChannel.EMAIL,
            sentiment=FeedbackSentiment.NEGATIVE,
            rating=2,
            category="servicio",
            comment="lento",
        )
    )
    await repo.create_feedback(
        CreateMemberFeedback(
            member_id="m2",
            member_name="Dos",
            channel=FeedbackChannel.IN_APP,
            sentiment=FeedbackSentiment.POSITIVE,
            rating=5,
            category="instalaciones",
            comment="impecable",
        )
    )
    await repo.create_referral(
        CreateReferral(
            referrer_member_id="m1",
            referrer_name="Uno",
            referred_name="Referido A",
        )
    )
    await engine.dispose()

    engine2 = make_engine(_backend_url())
    repo2 = EngagementRepoORM(engine2)
    winbacks = await repo2.list_campaigns(campaign_type=CampaignType.REACTIVATION)
    completed = await repo2.list_campaigns(status=CampaignStatus.COMPLETED)
    all_c = await repo2.list_campaigns()
    rewards_m1 = await repo2.list_rewards(member_id="m1")
    active_rewards = await repo2.list_rewards(status=RewardStatus.ACTIVE)
    fb_m1 = await repo2.list_feedback(member_id="m1")
    refs_m1 = await repo2.list_referrals(referrer_member_id="m1")
    await engine2.dispose()

    assert len(all_c) == 2
    assert len(winbacks) == 1 and winbacks[0].name == "Winback"
    assert len(completed) == 1 and completed[0].status == CampaignStatus.COMPLETED
    assert len(rewards_m1) == 2
    assert len(active_rewards) == 1 and active_rewards[0].description == "Cena para 2"
    assert len(fb_m1) == 1 and fb_m1[0].rating == 2
    assert len(refs_m1) == 1 and refs_m1[0].referred_name == "Referido A"


async def test_engagement_agent_composition_uses_repo() -> None:
    """El agente MemberEngagementAgent acepta el repo ORM por inyección.

    Mismo gate que family: el swap del bootstrap depende de que el
    constructor (repo=None default) acepte el repo persistente —
    las tools del agente corren sin cambios sobre el repo ORM.
    """
    from club_mcp.agents.member_engagement_agent import MemberEngagementAgent

    await _reset_backend()
    repo, engine = await _make_repo()
    agent = MemberEngagementAgent(repo=repo)
    created = await agent.repo.create_profile(
        CreateEngagementProfile(
            member_id="m-agent",
            member_name="Por Agente",
            engagement_level=EngagementLevel.MODERATE,
        )
    )
    got = await agent.repo.get_profile_by_member("m-agent")
    await engine.dispose()
    assert created.id == got.id if got else False
    assert got is not None and got.member_name == "Por Agente"
