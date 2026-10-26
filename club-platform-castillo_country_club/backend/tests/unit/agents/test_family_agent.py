"""
Tests for FamilyProfileAgent.
Validates all 16 tools: CRUD, update, and intelligence flows.
"""

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID, uuid4

import pytest
import pytest_asyncio

from club_mcp.agents.family_profile import (
    FamilyProfileAgent,
    _next_annual_occurrence,
)
from club_mcp.db.repositories.family_repo import FamilyRepository
from club_mcp.hitl.approval_types import ApprovalStatus


# ──────────────────────────────────────────────────
# FIXTURES
# ──────────────────────────────────────────────────


@pytest.fixture
def family_repo():
    return FamilyRepository()


@pytest.fixture
def family_agent(family_repo):
    return FamilyProfileAgent(repo=family_repo)


@pytest_asyncio.fixture
async def seeded_repo():
    """Repository with demo data pre-seeded."""
    repo = FamilyRepository()
    await repo.seed_demo_data()
    return repo


@pytest_asyncio.fixture
async def seeded_agent(seeded_repo):
    """Agent with demo data for intelligence tests."""
    return FamilyProfileAgent(repo=seeded_repo)


@pytest_asyncio.fixture
async def sample_family(family_agent):
    """Create a sample family for CRUD tests."""
    result = await family_agent.execute_create_family(
        family_name="Familia Garcia",
        tier="premium",
        email="garcia@example.com",
        phone="+50688881111",
        primary_member_name="Carlos Garcia",
        primary_member_dob="1978-03-15",
    )
    family = result["family"]

    # Add more members
    await family_agent.execute_update_members(
        family_id=family["id"],
        action="add",
        member_name="Maria Rodriguez",
        member_dob="1980-07-22",
        member_role="spouse",
    )
    await family_agent.execute_update_members(
        family_id=family["id"],
        action="add",
        member_name="Sofia Garcia",
        member_dob="2018-01-10",
        member_role="child",
    )
    await family_agent.execute_update_members(
        family_id=family["id"],
        action="add",
        member_name="Diego Garcia",
        member_dob="2015-05-03",
        member_role="child",
    )

    # Re-fetch to get full family
    profile = await family_agent.get_family_profile(family["id"])
    class FamilyProxy:
        def __init__(self, data):
            self.id = data["family"]["id"]
            self.name = data["family"]["name"]
    return FamilyProxy(profile)


@pytest_asyncio.fixture
async def second_family(family_agent):
    result = await family_agent.execute_create_family(
        family_name="Familia Rodriguez",
        tier="basic",
        email="rodriguez@example.com",
        phone="+50688882222",
        primary_member_name="Luis Rodriguez",
        primary_member_dob="1975-11-08",
    )
    class FamilyProxy:
        def __init__(self, data):
            self.id = data["family"]["id"]
            self.name = data["family"]["name"]
    return FamilyProxy(result)


async def _create_social_match_candidate(agent):
    result = await agent.execute_create_family(
        family_name="Familia Padel",
        tier="premium",
        email="padel@example.com",
        phone="+50688887777",
        primary_member_name="Ana Padel",
        primary_member_dob="1988-06-15",
    )
    family = result["family"]
    await agent.repo.set_preferences(
        UUID(family["id"]), {"interests": ["Pádel"]}
    )
    return family


# ══════════════════════════════════════════════════
# EXISTING TOOLS (7)
# ══════════════════════════════════════════════════


class TestGetFamilyProfile:

    @pytest.mark.asyncio
    async def test_get_existing_family(self, family_agent, sample_family):
        result = await family_agent.get_family_profile(sample_family.id)
        assert result["status"] == "success"
        assert result["family"]["name"] == "Familia Garcia"
        assert len(result["family"]["members"]) == 4
        assert result["preferences"] is not None

    @pytest.mark.asyncio
    async def test_get_nonexistent_family(self, family_agent):
        result = await family_agent.get_family_profile(str(uuid4()))
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_invalid_id(self, family_agent):
        result = await family_agent.get_family_profile("not-a-uuid")
        assert result["status"] == "error"
        assert "invalido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_response_includes_member_ages(self, family_agent, sample_family):
        result = await family_agent.get_family_profile(sample_family.id)
        members = result["family"]["members"]
        sofia = next(m for m in members if m["name"] == "Sofia Garcia")
        assert "age" in sofia
        assert "age_group" in sofia


class TestCreateFamilyProfile:

    @pytest.mark.asyncio
    async def test_create_returns_pending_approval(self, family_agent):
        result = await family_agent.create_family_profile(
            family_name="Familia Test",
            tier="premium",
            email="test@example.com",
            phone="+50688889999",
            primary_member_name="Juan Test",
            primary_member_dob="1990-01-15",
            requested_by="admin",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_create_invalid_tier(self, family_agent):
        result = await family_agent.create_family_profile(
            family_name="Familia Test",
            tier="gold",
            email="test@example.com",
            phone="+50688889999",
            primary_member_name="Juan Test",
            primary_member_dob="1990-01-15",
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_create_invalid_dob(self, family_agent):
        result = await family_agent.create_family_profile(
            family_name="Familia Test",
            tier="basic",
            email="test@example.com",
            phone="+50688889999",
            primary_member_name="Juan Test",
            primary_member_dob="fecha-invalida",
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_create_duplicate_email(self, family_agent, sample_family):
        result = await family_agent.create_family_profile(
            family_name="Otra Familia",
            tier="basic",
            email="garcia@example.com",
            phone="+50688881111",
            primary_member_name="Otro",
            primary_member_dob="1990-01-01",
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_create_after_approval(self, family_agent):
        result = await family_agent.execute_create_family(
            family_name="Familia Aprobada",
            tier="vip",
            email="aprobada@example.com",
            phone="+50688885555",
            primary_member_name="Pedro Aprobado",
            primary_member_dob="1985-06-20",
        )
        assert result["status"] == "created"
        assert result["family"]["tier"] == "vip"


class TestUpdateFamilyMembers:

    @pytest.mark.asyncio
    async def test_add_member_pending(self, family_agent, sample_family):
        result = await family_agent.update_family_members(
            family_id=sample_family.id,
            action="add",
            member_name="Luis Garcia",
            member_dob="2024-06-01",
            member_role="child",
            requested_by="carlos@example.com",
        )
        assert result["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_remove_member_pending(self, family_agent, sample_family):
        result = await family_agent.update_family_members(
            family_id=sample_family.id,
            action="remove",
            member_name="Sofia Garcia",
            requested_by="carlos@example.com",
        )
        assert result["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_invalid_action(self, family_agent, sample_family):
        result = await family_agent.update_family_members(
            family_id=sample_family.id,
            action="delete",
            member_name="Someone",
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_nonexistent_family(self, family_agent):
        result = await family_agent.update_family_members(
            family_id=str(uuid4()),
            action="add",
            member_name="Ghost",
            member_dob="2000-01-01",
        )
        assert result["status"] == "not_found"


class TestSetFamilyPreferences:

    @pytest.mark.asyncio
    async def test_set_preferences_success(self, family_agent, sample_family):
        result = await family_agent.set_family_preferences(
            family_id=sample_family.id,
            preferred_language="es",
            notification_channels="email,push,whatsapp",
            interests="tenis,yoga,spa",
            privacy_level="open",
        )
        assert result["status"] == "success"
        assert "email" in result["preferences"]["notification_channels"]

    @pytest.mark.asyncio
    async def test_set_preferences_invalid_privacy(self, family_agent, sample_family):
        result = await family_agent.set_family_preferences(
            family_id=sample_family.id,
            privacy_level="super_secret",
        )
        assert result["status"] == "error"


class TestGetActivityHistory:

    @pytest.mark.asyncio
    async def test_get_history(self, family_agent, sample_family):
        result = await family_agent.get_activity_history(sample_family.id)
        assert result["status"] == "success"
        assert result["total"] >= 0

    @pytest.mark.asyncio
    async def test_get_history_invalid_date(self, family_agent, sample_family):
        result = await family_agent.get_activity_history(
            sample_family.id, date_from="invalid",
        )
        assert result["status"] == "error"


class TestSearchFamilies:

    @pytest.mark.asyncio
    async def test_search_all(self, family_agent, sample_family, second_family):
        result = await family_agent.search_families()
        assert result["status"] == "success"
        assert result["total"] == 2

    @pytest.mark.asyncio
    async def test_search_by_query(self, family_agent, sample_family, second_family):
        result = await family_agent.search_families(query="Garcia")
        assert result["status"] == "success"
        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_search_by_tier(self, family_agent, sample_family, second_family):
        result = await family_agent.search_families(tier="basic")
        assert result["status"] == "success"
        assert result["total"] == 1

    @pytest.mark.asyncio
    async def test_search_with_limit(self, family_agent, sample_family, second_family):
        result = await family_agent.search_families(limit=1)
        assert result["status"] == "success"
        assert result["total"] == 2
        assert len(result["families"]) == 1

    @pytest.mark.asyncio
    async def test_search_invalid_tier(self, family_agent, sample_family):
        result = await family_agent.search_families(tier="gold")
        assert result["status"] == "error"
        assert "no valido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_search_invalid_age_group(self, family_agent, sample_family):
        result = await family_agent.search_families(age_group="infant")
        assert result["status"] == "error"
        assert "no valido" in result["message"].lower()


class TestGetSocialGraph:

    @pytest.mark.asyncio
    async def test_social_graph_empty(self, family_agent, sample_family):
        result = await family_agent.get_social_graph(sample_family.id)
        assert result["status"] == "success"
        assert result["total_connections"] == 0

    @pytest.mark.asyncio
    async def test_social_graph_nonexistent(self, family_agent):
        result = await family_agent.get_social_graph(str(uuid4()))
        assert result["status"] == "not_found"


# ══════════════════════════════════════════════════
# NEW CRUD TOOL
# ══════════════════════════════════════════════════


class TestUpdateFamilyProfile:

    @pytest.mark.asyncio
    async def test_update_name(self, family_agent, sample_family):
        result = await family_agent.update_family_profile(
            family_id=sample_family.id,
            name="Familia Garcia-Lopez",
        )
        assert result["status"] == "success"
        assert result["family"]["name"] == "Familia Garcia-Lopez"

    @pytest.mark.asyncio
    async def test_update_nonexistent(self, family_agent):
        result = await family_agent.update_family_profile(
            family_id=str(uuid4()),
            name="Ghost",
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_invalid_tier(self, family_agent, sample_family):
        result = await family_agent.update_family_profile(
            family_id=sample_family.id,
            tier="gold",
        )
        assert result["status"] == "error"


# ══════════════════════════════════════════════════
# INTELLIGENCE TOOLS (8) — seeded data
# ══════════════════════════════════════════════════


class TestPredictChurn:

    @pytest.mark.asyncio
    async def test_high_engagement_low_risk(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.predict_churn(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        assert data["risk_level"] in ("low", "medium")
        assert data["risk_score"] >= 50
        assert len(data["factors"]) > 0
        assert 0 <= data["confidence"] <= 1

    @pytest.mark.asyncio
    async def test_low_engagement_high_risk(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        chen = next(f for f in families if f.name == "Familia Chen")

        result = await seeded_agent.predict_churn(str(chen.id))
        assert result["status"] == "success"
        data = result["data"]
        assert data["risk_level"] in ("high", "critical")
        assert data["risk_score"] < 50

    @pytest.mark.asyncio
    async def test_nonexistent_family(self, seeded_agent):
        result = await seeded_agent.predict_churn(str(uuid4()))
        assert result["status"] == "not_found"


class TestRecommendActivities:

    @pytest.mark.asyncio
    async def test_recommendations_for_active_family(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.recommend_activities(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        assert len(data["recommendations"]) > 0
        assert data["based_on"]["interests"]
        rec = data["recommendations"][0]
        assert rec["match_score"] > 0
        assert rec["target_members"]

    @pytest.mark.asyncio
    async def test_nonexistent_family(self, seeded_agent):
        result = await seeded_agent.recommend_activities(str(uuid4()))
        assert result["status"] == "not_found"


class TestSocialMatch:

    @pytest.mark.asyncio
    async def test_matches_found(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")
        candidate = await _create_social_match_candidate(seeded_agent)

        result = await seeded_agent.social_match(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        sug = next(
            suggestion
            for suggestion in data["suggestions"]
            if suggestion["family_id"] == candidate["id"]
        )
        assert sug["match_score"] > 0
        assert sug["family_name"] != "Familia Garcia"

    @pytest.mark.asyncio
    async def test_excludes_self_and_connected(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")
        candidate = await _create_social_match_candidate(seeded_agent)

        result = await seeded_agent.social_match(str(garcia.id))
        suggestions = result["data"]["suggestions"]
        names = [s["family_name"] for s in suggestions]
        assert "Familia Garcia" not in names
        assert "Familia Rodriguez" not in names
        assert "Familia Morales" not in names
        assert candidate["name"] in names


class TestEngagementPlan:

    @pytest.mark.asyncio
    async def test_plan_generation(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        rodriguez = next(f for f in families if f.name == "Familia Rodriguez")

        result = await seeded_agent.engagement_plan(str(rodriguez.id))
        assert result["status"] == "success"
        plan = result["data"]
        assert plan["current_score"] > 0
        assert plan["target_score"] > plan["current_score"]
        assert len(plan["actions"]) >= 3
        assert plan["timeframe"] == "90 dias"
        assert plan["estimated_roi"]

    @pytest.mark.asyncio
    async def test_critical_family_gets_high_priority(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        chen = next(f for f in families if f.name == "Familia Chen")

        result = await seeded_agent.engagement_plan(str(chen.id))
        plan = result["data"]
        high_priority = [a for a in plan["actions"] if a["priority"] == "high"]
        assert len(high_priority) > 0


class TestLifecycleAnalysis:

    @pytest.mark.asyncio
    async def test_new_family_is_onboarding(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        morales = next(f for f in families if f.name == "Familia Morales")

        result = await seeded_agent.lifecycle_analysis(str(morales.id))
        assert result["status"] == "success"
        data = result["data"]
        assert data["current_stage"] in ("onboarding", "growing")
        assert data["confidence"] > 0

    @pytest.mark.asyncio
    async def test_established_family_is_peak_or_plateau(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.lifecycle_analysis(str(garcia.id))
        data = result["data"]
        assert data["current_stage"] in ("peak", "growing", "plateau")
        assert data["recommendations"]


class TestFamily360Insight:

    @pytest.mark.asyncio
    async def test_360_insight_generation(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.family_360_insight(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        assert data["overall_score"] > 0
        assert len(data["domains"]) == 4
        assert data["top_insights"]
        assert data["cross_domain_correlations"]
        assert data["ai_summary"]

    @pytest.mark.asyncio
    async def test_360_domain_statuses(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.family_360_insight(str(garcia.id))
        domains = result["data"]["domains"]
        valid_statuses = {"exceptional", "healthy", "attention", "critical"}
        for d in domains:
            assert d["status"] in valid_statuses
            assert 0 <= d["score"] <= 100


class TestSocialGraphEnriched:

    @pytest.mark.asyncio
    async def test_enriched_graph_with_data(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.social_graph_enriched(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        assert data["total_connections"] > 0
        assert len(data["connections"]) > 0
        conn = data["connections"][0]
        assert "ai_insight" in conn
        assert "shared_activities" in conn

    @pytest.mark.asyncio
    async def test_enriched_graph_suggestions(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        rodriguez = next(f for f in families if f.name == "Familia Rodriguez")

        result = await seeded_agent.social_graph_enriched(str(rodriguez.id))
        data = result["data"]
        # Rodriguez is connected to Garcia but may have suggestions for others
        assert "suggested_connections" in data


class TestMilestoneTracker:

    def test_annual_occurrence_handles_leap_day(self):
        leap_birthday = date(2000, 2, 29)

        assert _next_annual_occurrence(
            leap_birthday, date(2026, 2, 27)
        ) == date(2026, 2, 28)
        assert _next_annual_occurrence(
            leap_birthday, date(2027, 3, 1)
        ) == date(2028, 2, 29)

    @pytest.mark.asyncio
    async def test_age_transition_uses_next_birthday(self, family_agent):
        birthday = date.today() + timedelta(days=45)
        if birthday.month == 2 and birthday.day == 29:
            birthday += timedelta(days=1)

        result = await family_agent.execute_create_family(
            family_name="Familia Transicion",
            tier="premium",
            email="transicion@example.com",
            phone="+50688889988",
            primary_member_name="Miembro Transicion",
            primary_member_dob=date(
                birthday.year - 5, birthday.month, birthday.day
            ).isoformat(),
        )
        milestones = await family_agent.milestone_tracker(
            result["family"]["id"]
        )
        transition = next(
            item
            for item in milestones["data"]["upcoming"]
            if item["type"] == "age_transition"
        )

        assert transition["date"] == birthday.isoformat()
        assert "kids" in transition["title"]

    @pytest.mark.asyncio
    async def test_milestones_include_anniversary(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.milestone_tracker(str(garcia.id))
        assert result["status"] == "success"
        data = result["data"]
        assert len(data["upcoming"]) > 0
        types = [m["type"] for m in data["upcoming"]]
        assert "anniversary" in types or "birthday" in types

    @pytest.mark.asyncio
    async def test_milestones_include_birthdays(self, seeded_agent, seeded_repo):
        families = await seeded_repo.get_all_families()
        garcia = next(f for f in families if f.name == "Familia Garcia")

        result = await seeded_agent.milestone_tracker(str(garcia.id))
        data = result["data"]
        birthdays = [m for m in data["upcoming"] if m["type"] == "birthday"]
        assert len(birthdays) > 0
        assert birthdays[0]["member_name"]

    @pytest.mark.asyncio
    async def test_milestones_nonexistent(self, seeded_agent):
        result = await seeded_agent.milestone_tracker(str(uuid4()))
        assert result["status"] == "not_found"


# ══════════════════════════════════════════════════
# HITL FULL FLOW
# ══════════════════════════════════════════════════


class TestHITLFullFlow:

    @pytest.mark.asyncio
    async def test_create_then_approve_then_exists(self, family_agent):
        request_result = await family_agent.create_family_profile(
            family_name="Familia HITL Test",
            tier="premium",
            email="hitl@example.com",
            phone="+50688880000",
            primary_member_name="Ana HITL",
            primary_member_dob="1992-04-10",
        )
        assert request_result["status"] == "pending_approval"
        request_id = request_result["request_id"]

        from uuid import UUID
        approval = await family_agent.approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado",
        )
        assert approval.status == ApprovalStatus.APPROVED

        exec_result = await family_agent.execute_create_family(
            family_name="Familia HITL Test",
            tier="premium",
            email="hitl@example.com",
            phone="+50688880000",
            primary_member_name="Ana HITL",
            primary_member_dob="1992-04-10",
        )
        assert exec_result["status"] == "created"

        family_id = exec_result["family"]["id"]
        profile = await family_agent.get_family_profile(family_id)
        assert profile["status"] == "success"
        assert profile["family"]["name"] == "Familia HITL Test"

    @pytest.mark.asyncio
    async def test_create_then_reject(self, family_agent):
        request_result = await family_agent.create_family_profile(
            family_name="Familia Rechazada",
            tier="vip",
            email="rechazada@example.com",
            phone="+50688883333",
            primary_member_name="Rechazado",
            primary_member_dob="1980-01-01",
        )

        from uuid import UUID
        await family_agent.approval_engine.reject(
            UUID(request_result["request_id"]),
            rejected_by="admin@castillo.cr",
            reason="Documentacion incompleta",
        )

        assert not await family_agent.repo.family_exists_by_email("rechazada@example.com")
