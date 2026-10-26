"""Tests for WellnessAgent — 32 tests."""

from __future__ import annotations

import pytest
from uuid import UUID

from club_mcp.agents.wellness import WellnessAgent
from club_mcp.db.repositories.wellness_repo import WellnessRepository
from club_mcp.hitl.approval_types import ApprovalStatus


@pytest.fixture
def wl_repo() -> WellnessRepository:
    return WellnessRepository()


@pytest.fixture
def wl_agent(
    wl_repo: WellnessRepository,
    approval_engine,
) -> WellnessAgent:
    return WellnessAgent(wl_repo, approval_engine)


def _seed_wellness(repo: WellnessRepository) -> None:
    """Seed profiles, goals, activities, and classes."""
    # Profile
    repo.create_profile({
        "family_id": "fam-001",
        "family_name": "Familia García",
        "fitness_level": "intermediate",
        "preferred_activities": ["yoga", "swimming"],
        "health_conditions": [],
        "allergies": [],
        "dietary_restrictions": ["vegetariano"],
    })

    # Goals
    repo.create_goal({
        "family_id": "fam-001",
        "goal_type": "fitness",
        "title": "Correr 5K",
        "target_value": 5.0,
        "unit": "km",
        "status": "active",
        "target_date": "2025-06-01",
    })

    # Activities
    repo.log_activity({
        "family_id": "fam-001",
        "member_name": "Carlos García",
        "activity_type": "yoga",
        "duration_minutes": 60,
        "calories_burned": 200,
        "date": "2025-03-01",
    })
    repo.log_activity({
        "family_id": "fam-001",
        "member_name": "María García",
        "activity_type": "swimming",
        "duration_minutes": 45,
        "calories_burned": 350,
        "date": "2025-03-03",
    })
    repo.log_activity({
        "family_id": "fam-001",
        "member_name": "Carlos García",
        "activity_type": "gym",
        "duration_minutes": 50,
        "calories_burned": 400,
        "date": "2025-03-05",
    })

    # Classes
    repo.add_class({
        "name": "Yoga Matutino",
        "description": "Clase de yoga al amanecer",
        "activity_type": "yoga",
        "instructor": "Instructora Ana",
        "level": "all_levels",
        "max_participants": 15,
        "duration_minutes": 60,
        "location": "Mirador",
        "schedule_day": "lunes",
        "schedule_time": "07:00",
    })
    repo.add_class({
        "name": "Aqua Fitness",
        "activity_type": "swimming",
        "instructor": "Coach Pedro",
        "level": "beginner",
        "max_participants": 10,
        "duration_minutes": 45,
        "location": "Piscina",
        "enrolled_count": 10,  # FULL
    })


# ══════════════════════════════════════════════════════════
# Test 1: wellness_profile_get  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestProfileGet:

    @pytest.fixture(autouse=True)
    def seed(self, wl_agent):
        _seed_wellness(wl_agent.repo)

    @pytest.mark.asyncio
    async def test_get_existing_profile(self, wl_agent):
        res = await wl_agent.wellness_profile_get("fam-001")
        assert res["status"] == "success"
        assert res["data"]["family_name"] == "Familia García"
        assert res["data"]["fitness_level"] == "intermediate"

    @pytest.mark.asyncio
    async def test_get_nonexistent_profile(self, wl_agent):
        res = await wl_agent.wellness_profile_get("fam-999")
        assert res["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_profile_includes_conditions(self, wl_agent):
        res = await wl_agent.wellness_profile_get("fam-001")
        assert "vegetariano" in res["data"]["dietary_restrictions"]


# ══════════════════════════════════════════════════════════
# Test 2: wellness_profile_update  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestProfileUpdate:

    @pytest.mark.asyncio
    async def test_create_new_profile(self, wl_agent):
        res = await wl_agent.wellness_profile_update(
            family_id="fam-new",
            family_name="Familia Nueva",
            fitness_level="beginner",
        )
        assert res["status"] == "success"
        assert "creado" in res["message"]

    @pytest.mark.asyncio
    async def test_update_existing_profile(self, wl_agent):
        wl_agent.repo.create_profile({
            "family_id": "fam-001",
            "family_name": "Test",
            "fitness_level": "beginner",
        })
        res = await wl_agent.wellness_profile_update(
            family_id="fam-001",
            family_name="Test",
            fitness_level="advanced",
        )
        assert res["status"] == "success"
        assert "actualizado" in res["message"]

    @pytest.mark.asyncio
    async def test_invalid_fitness_level(self, wl_agent):
        res = await wl_agent.wellness_profile_update(
            family_id="fam-001", fitness_level="extreme",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_preferred_activities(self, wl_agent):
        res = await wl_agent.wellness_profile_update(
            family_id="fam-001",
            preferred_activities=["yoga", "skydiving"],
        )
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 3: wellness_activity_log  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestActivityLog:

    @pytest.mark.asyncio
    async def test_log_activity(self, wl_agent):
        res = await wl_agent.wellness_activity_log(
            family_id="fam-001",
            member_name="Carlos",
            activity_type="gym",
            duration_minutes=60,
            calories_burned=500,
        )
        assert res["status"] == "success"
        assert res["data"]["activity_type"] == "gym"

    @pytest.mark.asyncio
    async def test_invalid_activity_type(self, wl_agent):
        res = await wl_agent.wellness_activity_log(
            family_id="fam-001",
            member_name="Carlos",
            activity_type="boxing",
            duration_minutes=30,
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_zero_duration(self, wl_agent):
        res = await wl_agent.wellness_activity_log(
            family_id="fam-001",
            member_name="Carlos",
            activity_type="yoga",
            duration_minutes=0,
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_activity_with_distance(self, wl_agent):
        res = await wl_agent.wellness_activity_log(
            family_id="fam-001",
            member_name="María",
            activity_type="swimming",
            duration_minutes=30,
            distance_km=1.5,
        )
        assert res["data"]["distance_km"] == 1.5


# ══════════════════════════════════════════════════════════
# Test 4: wellness_goal_set  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestGoalSet:

    @pytest.mark.asyncio
    async def test_set_goal(self, wl_agent):
        res = await wl_agent.wellness_goal_set(
            family_id="fam-001",
            goal_type="weight",
            title="Bajar 5 kilos",
            target_value=5.0,
            unit="kg",
            target_date="2025-06-01",
        )
        assert res["status"] == "success"
        assert res["data"]["goal_type"] == "weight"

    @pytest.mark.asyncio
    async def test_invalid_goal_type(self, wl_agent):
        res = await wl_agent.wellness_goal_set(
            family_id="fam-001",
            goal_type="sleep",
            title="Dormir más",
            target_value=8,
            unit="hours",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_zero_target(self, wl_agent):
        res = await wl_agent.wellness_goal_set(
            family_id="fam-001",
            goal_type="fitness",
            title="Nada",
            target_value=0,
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_multiple_goals(self, wl_agent):
        await wl_agent.wellness_goal_set(
            family_id="fam-001", goal_type="fitness",
            title="Meta 1", target_value=10, unit="km",
        )
        await wl_agent.wellness_goal_set(
            family_id="fam-001", goal_type="nutrition",
            title="Meta 2", target_value=5, unit="porciones",
        )
        goals = wl_agent.repo.list_goals("fam-001")
        assert len(goals) >= 2


# ══════════════════════════════════════════════════════════
# Test 5: wellness_recommendations  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestRecommendations:

    @pytest.fixture(autouse=True)
    def seed(self, wl_agent):
        _seed_wellness(wl_agent.repo)

    @pytest.mark.asyncio
    async def test_recommendations_exist(self, wl_agent):
        recs = await wl_agent.wellness_recommendations("fam-001")
        assert recs["status"] == "success"
        assert recs["total"] > 0

    @pytest.mark.asyncio
    async def test_recommendations_for_empty_family(self, wl_agent):
        recs = await wl_agent.wellness_recommendations("fam-empty")
        assert recs["status"] == "success"
        # Should still have some recommendations
        assert recs["total"] > 0

    @pytest.mark.asyncio
    async def test_recommendations_include_classes(self, wl_agent):
        recs = await wl_agent.wellness_recommendations("fam-001")
        class_recs = [r for r in recs["data"] if r["category"] == "class"]
        assert len(class_recs) > 0


# ══════════════════════════════════════════════════════════
# Test 6: wellness_schedule_class  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestScheduleClass:

    @pytest.fixture(autouse=True)
    def seed(self, wl_agent):
        _seed_wellness(wl_agent.repo)

    @pytest.mark.asyncio
    async def test_schedule_returns_pending(self, wl_agent):
        classes = wl_agent.repo.list_classes(activity_type="yoga")
        cls = classes[0]
        res = await wl_agent.wellness_schedule_class(
            class_id=cls.id,
            family_id="fam-001",
            member_name="Carlos",
            date="2025-04-01",
            time="07:00",
        )
        assert res["status"] == "pending_approval"
        assert res["class_name"] == "Yoga Matutino"

    @pytest.mark.asyncio
    async def test_schedule_full_class(self, wl_agent):
        classes = wl_agent.repo.list_classes(activity_type="swimming")
        cls = classes[0]  # Aqua Fitness (full)
        res = await wl_agent.wellness_schedule_class(
            class_id=cls.id,
            family_id="fam-001",
            member_name="Carlos",
            date="2025-04-01",
            time="10:00",
        )
        assert res["status"] == "error"
        assert "llena" in res["message"]

    @pytest.mark.asyncio
    async def test_nonexistent_class(self, wl_agent):
        res = await wl_agent.wellness_schedule_class(
            class_id="fake-id",
            family_id="fam-001",
            member_name="Carlos",
            date="2025-04-01",
            time="10:00",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_schedules_appointment(self, wl_agent):
        classes = wl_agent.repo.list_classes(activity_type="yoga")
        cls = classes[0]
        res = await wl_agent.execute_schedule_class({
            "class_id": cls.id,
            "family_id": "fam-001",
            "member_name": "Carlos",
            "date": "2025-04-01",
            "time": "07:00",
        })
        assert res["status"] == "success"
        assert res["data"]["status"] == "scheduled"

    @pytest.mark.asyncio
    async def test_approval_flow(self, wl_agent):
        classes = wl_agent.repo.list_classes(activity_type="yoga")
        cls = classes[0]
        res = await wl_agent.wellness_schedule_class(
            class_id=cls.id,
            family_id="fam-001",
            member_name="María",
            date="2025-04-08",
            time="07:00",
        )
        req_id = UUID(res["request_id"])
        approved = await wl_agent.approval_engine.approve(req_id, approved_by="admin")
        assert approved.status == ApprovalStatus.APPROVED


# ══════════════════════════════════════════════════════════
# Test 7: wellness_report  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestWellnessReport:

    @pytest.fixture(autouse=True)
    def seed(self, wl_agent):
        _seed_wellness(wl_agent.repo)

    @pytest.mark.asyncio
    async def test_generates_report(self, wl_agent):
        res = await wl_agent.wellness_report(
            "fam-001", "2025-01-01", "2025-12-31",
        )
        assert res["status"] == "success"
        assert res["data"]["total_activities"] == 3
        assert res["data"]["total_minutes"] == 155

    @pytest.mark.asyncio
    async def test_empty_period(self, wl_agent):
        res = await wl_agent.wellness_report(
            "fam-001", "2024-01-01", "2024-01-31",
        )
        assert res["data"]["total_activities"] == 0

    @pytest.mark.asyncio
    async def test_missing_dates(self, wl_agent):
        res = await wl_agent.wellness_report("fam-001", "", "")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_inverted_dates(self, wl_agent):
        res = await wl_agent.wellness_report(
            "fam-001", "2025-12-31", "2025-01-01",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_report_includes_calories(self, wl_agent):
        res = await wl_agent.wellness_report(
            "fam-001", "2025-01-01", "2025-12-31",
        )
        assert res["data"]["total_calories"] == 950
