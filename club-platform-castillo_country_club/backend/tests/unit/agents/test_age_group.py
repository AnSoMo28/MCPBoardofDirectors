"""Tests for AgeGroupAgent — 31 tests."""

from __future__ import annotations

from uuid import UUID

import pytest
import pytest_asyncio

from club_mcp.agents.age_group import AgeGroupAgent
from club_mcp.db.repositories.age_group_repo import AgeGroupRepository
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.age_group_activity import AgeGroupActivityCreate



@pytest.fixture
def age_repo() -> AgeGroupRepository:
    return AgeGroupRepository()


@pytest.fixture
def age_agent(
    age_repo: AgeGroupRepository,
    approval_engine,
) -> AgeGroupAgent:
    return AgeGroupAgent(age_repo, approval_engine)


def _tenis_kids_data() -> dict:
    return {
        "name": "Torneo Mini-Tenis",
        "description": "Torneo de tenis para niños",
        "age_group": "kids",
        "difficulty": "easy",
        "location": "Cancha de Tenis 3",
        "max_participants": 16,
        "duration_minutes": 60,
        "requires_instructor": True,
        "instructor_name": "Coach Carlos",
        "equipment_needed": ["raqueta", "pelotas"],
        "tags": ["tenis", "torneo", "deporte"],
        "schedule_days": ["sábado"],
        "schedule_time": "09:00",
    }


def _yoga_adults_data() -> dict:
    return {
        "name": "Yoga al Amanecer",
        "description": "Sesión de yoga en el mirador",
        "age_group": "adults",
        "difficulty": "medium",
        "location": "Mirador de la Montaña",
        "max_participants": 20,
        "duration_minutes": 75,
        "requires_instructor": True,
        "instructor_name": "Instructora Ana",
        "tags": ["yoga", "bienestar"],
    }


def _art_teen_data() -> dict:
    return {
        "name": "Taller de Pintura",
        "age_group": "teens",
        "difficulty": "easy",
        "location": "Salón Cultural",
        "max_participants": 12,
    }


async def _seed_activities(repo: AgeGroupRepository) -> None:
    await repo.create_activity(AgeGroupActivityCreate(**_tenis_kids_data()))
    await repo.create_activity(AgeGroupActivityCreate(**_yoga_adults_data()))
    await repo.create_activity(AgeGroupActivityCreate(**_art_teen_data()))
    repo._member_counts.update({
        "toddler": 50, "kids": 120, "teens": 80,
        "young_adults": 60, "adults": 200, "seniors": 90,
    })
    repo._family_counts.update({
        "toddler": 30, "kids": 80, "teens": 55,
        "young_adults": 40, "adults": 150, "seniors": 60,
    })


# ══════════════════════════════════════════════════════════
# Test 1: age_group_list  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestAgeGroupList:

    @pytest.mark.asyncio
    async def test_list_empty(self, age_agent):
        res = await age_agent.age_group_list()
        assert res["status"] == "success"
        assert res["total_groups"] == 6
        assert res["total_members"] == 0

    @pytest.mark.asyncio
    async def test_list_with_data(self, age_agent):
        await _seed_activities(age_agent.repo)
        res = await age_agent.age_group_list()
        assert res["total_members"] == 600
        assert res["total_activities"] == 3

    @pytest.mark.asyncio
    async def test_list_returns_all_six_groups(self, age_agent):
        res = await age_agent.age_group_list()
        groups = [g["age_group"] for g in res["data"]]
        assert "kids" in groups
        assert "teens" in groups
        assert "adults" in groups
        assert "seniors" in groups


# ══════════════════════════════════════════════════════════
# Test 2: age_group_get_activities  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGetActivities:

    @pytest_asyncio.fixture(autouse=True)
    async def seed(self, age_agent):
        await _seed_activities(age_agent.repo)

    @pytest.mark.asyncio
    async def test_get_kids_activities(self, age_agent):
        res = await age_agent.age_group_get_activities("kids")
        assert res["status"] == "success"
        assert res["total"] == 1
        assert res["data"][0]["name"] == "Torneo Mini-Tenis"

    @pytest.mark.asyncio
    async def test_get_adults_activities(self, age_agent):
        res = await age_agent.age_group_get_activities("adults")
        assert res["total"] == 1
        assert res["data"][0]["name"] == "Yoga al Amanecer"

    @pytest.mark.asyncio
    async def test_invalid_age_group(self, age_agent):
        res = await age_agent.age_group_get_activities("babies")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_empty_age_group(self, age_agent):
        res = await age_agent.age_group_get_activities("seniors")
        assert res["total"] == 0

    @pytest.mark.asyncio
    async def test_include_inactive(self, age_agent):
        activities = await age_agent.repo.list_activities(age_group="kids")
        aid = activities[0].id
        await age_agent.repo.update_activity(aid, {"status": "inactive"})
        res = await age_agent.age_group_get_activities("kids", active_only=False)
        assert res["total"] == 1


# ══════════════════════════════════════════════════════════
# Test 3: age_group_register_activity  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestRegisterActivity:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, age_agent):
        res = await age_agent.age_group_register_activity(_tenis_kids_data())
        assert res["status"] == "pending_approval"
        assert "request_id" in res
        assert res["activity_name"] == "Torneo Mini-Tenis"

    @pytest.mark.asyncio
    async def test_invalid_data(self, age_agent):
        res = await age_agent.age_group_register_activity({"name": "Bad"})
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_creates_activity(self, age_agent):
        res = await age_agent.execute_register_activity(_tenis_kids_data())
        assert res["status"] == "success"
        assert res["data"]["name"] == "Torneo Mini-Tenis"
        assert res["data"]["age_group"] == "kids"

    @pytest.mark.asyncio
    async def test_approval_flow(self, age_agent):
        res = await age_agent.age_group_register_activity(_yoga_adults_data())
        req_id = UUID(res["request_id"])
        approved = await age_agent.approval_engine.approve(req_id, approved_by="admin")
        assert approved.status == ApprovalStatus.APPROVED
        exec_res = await age_agent.execute_register_activity(approved.params["activity_data"])
        assert exec_res["status"] == "success"


# ══════════════════════════════════════════════════════════
# Test 4: age_group_get_demographics  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGetDemographics:

    @pytest_asyncio.fixture(autouse=True)
    async def seed(self, age_agent):
        await _seed_activities(age_agent.repo)

    @pytest.mark.asyncio
    async def test_all_demographics(self, age_agent):
        res = await age_agent.age_group_get_demographics()
        assert res["status"] == "success"
        assert res["total_members"] == 600
        assert len(res["data"]) == 6

    @pytest.mark.asyncio
    async def test_single_group(self, age_agent):
        res = await age_agent.age_group_get_demographics(age_group="kids")
        assert len(res["data"]) == 1
        assert res["data"][0]["total_members"] == 120

    @pytest.mark.asyncio
    async def test_invalid_group(self, age_agent):
        res = await age_agent.age_group_get_demographics(age_group="invalid")
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 5: age_group_get_participation  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGetParticipation:

    @pytest_asyncio.fixture(autouse=True)
    async def seed(self, age_agent):
        await _seed_activities(age_agent.repo)

    @pytest.mark.asyncio
    async def test_all_participation(self, age_agent):
        res = await age_agent.age_group_get_participation()
        assert res["status"] == "success"
        assert res["total_activities"] == 3

    @pytest.mark.asyncio
    async def test_kids_participation(self, age_agent):
        res = await age_agent.age_group_get_participation(age_group="kids")
        assert res["total_activities"] == 1
        assert res["data"][0]["activity_name"] == "Torneo Mini-Tenis"

    @pytest.mark.asyncio
    async def test_empty_group(self, age_agent):
        res = await age_agent.age_group_get_participation(age_group="toddler")
        assert res["total_activities"] == 0


# ══════════════════════════════════════════════════════════
# Test 6: age_group_recommend_activities  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestRecommendActivities:

    @pytest_asyncio.fixture(autouse=True)
    async def seed(self, age_agent):
        await _seed_activities(age_agent.repo)

    @pytest.mark.asyncio
    async def test_recommend_for_kids(self, age_agent):
        res = await age_agent.age_group_recommend_activities(["kids"])
        assert res["status"] == "success"
        assert res["total"] == 1

    @pytest.mark.asyncio
    async def test_recommend_multi_group(self, age_agent):
        res = await age_agent.age_group_recommend_activities(["kids", "teens"])
        assert res["total"] == 2

    @pytest.mark.asyncio
    async def test_recommend_empty_group(self, age_agent):
        res = await age_agent.age_group_recommend_activities(["seniors"])
        assert res["total"] == 0

    @pytest.mark.asyncio
    async def test_invalid_group(self, age_agent):
        res = await age_agent.age_group_recommend_activities(["babies"])
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 7: age_group_update_activity  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestUpdateActivity:

    @pytest_asyncio.fixture
    async def activity_id(self, age_agent) -> str:
        await _seed_activities(age_agent.repo)
        activities = await age_agent.repo.list_activities(age_group="kids")
        return activities[0].id

    @pytest.mark.asyncio
    async def test_update_name(self, age_agent, activity_id):
        res = await age_agent.age_group_update_activity(
            activity_id, {"name": "Super Mini-Tenis"},
        )
        assert res["status"] == "success"
        assert res["data"]["name"] == "Super Mini-Tenis"

    @pytest.mark.asyncio
    async def test_update_status(self, age_agent, activity_id):
        res = await age_agent.age_group_update_activity(
            activity_id, {"status": "inactive"},
        )
        assert res["data"]["status"] == "inactive"

    @pytest.mark.asyncio
    async def test_nonexistent_activity(self, age_agent):
        res = await age_agent.age_group_update_activity("fake_id", {"name": "X"})
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_update_preserves_other_fields(self, age_agent, activity_id):
        await age_agent.age_group_update_activity(activity_id, {"location": "Nueva Cancha"})
        act = await age_agent.repo.get_activity(activity_id)
        assert act.location == "Nueva Cancha"
        assert act.name == "Torneo Mini-Tenis"  # preserved
