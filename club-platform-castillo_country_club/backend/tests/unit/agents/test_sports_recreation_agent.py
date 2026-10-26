"""
Tests for SportsRecreationAgent.
Validates all 7 tools: AUTO, HITL, and internal execution flows.
"""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from club_mcp.agents.sports_recreation_agent import SportsRecreationAgent
from club_mcp.db.repositories.sports_recreation_repo import (
    SportsRecreationRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel, ApprovalStatus
from club_mcp.models.sports_recreation import (
    ClassType,
    CreateCoachingSession,
    CreateEquipment,
    CreateFitnessClass,
    CreateReservation,
    CreateSportLeague,
    CreateSportsRecommendation,
    CreateTournament,
    EquipmentCondition,
    LeagueFormat,
    ReservationStatus,
    SkillLevel,
    SportType,
    TournamentFormat,
    TournamentStatus,
)


# ── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture
def sports_repo() -> SportsRecreationRepository:
    return SportsRecreationRepository()


# En test_sports_recreation_agent.py — SOLO CAMBIAR EL FIXTURE

@pytest.fixture
def sports_agent(
    sports_repo: SportsRecreationRepository, approval_engine
) -> SportsRecreationAgent:
    agent = SportsRecreationAgent(repo=sports_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Async seed helpers ─────────────────────────────────────────────────────


async def _seed_reservations(
    repo: SportsRecreationRepository, count: int = 3
) -> list:
    res = []
    for i in range(count):
        data = CreateReservation(
            court_name=f"Court {i+1}",
            sport=SportType.TENNIS,
            member_id=f"M{i+1:03d}",
            member_name=f"Member {i+1}",
            date="2026-06-15",
            start_time=f"{9+i}:00",
            end_time=f"{10+i}:00",
        )
        res.append(await repo.create_reservation(data))
    return res


async def _seed_fitness_classes(
    repo: SportsRecreationRepository, count: int = 3
) -> list:
    classes = []
    sports = [SportType.YOGA, SportType.FITNESS, SportType.PILATES]
    days = ["Monday", "Wednesday", "Friday"]
    for i in range(count):
        data = CreateFitnessClass(
            name=f"Morning {sports[i].value.title()}",
            sport=sports[i],
            class_type=ClassType.GROUP,
            instructor=f"Instructor {i+1}",
            skill_level=SkillLevel.ALL_LEVELS,
            schedule_day=days[i],
            schedule_time=f"{8+i}:00",
            duration_minutes=60,
            max_capacity=20,
            location=f"Studio {i+1}",
        )
        classes.append(await repo.create_fitness_class(data))
    return classes


async def _seed_coaching(repo: SportsRecreationRepository) -> object:
    data = CreateCoachingSession(
        sport=SportType.TENNIS,
        coach_name="Coach Martinez",
        member_id="M001",
        member_name="Ana García",
        skill_level=SkillLevel.INTERMEDIATE,
        date="2026-06-20",
        start_time="10:00",
        end_time="11:00",
        location="Court 1",
        focus_areas=["backhand", "serve"],
    )
    return await repo.create_coaching_session(data)


async def _seed_equipment(repo: SportsRecreationRepository, count: int = 3) -> list:
    items = [
        CreateEquipment(
            name="Tennis Racket",
            sport=SportType.TENNIS,
            location="Equipment Room A",
            condition=EquipmentCondition.GOOD,
            total_quantity=20,
            available_quantity=15,
            brand="Wilson",
        ),
        CreateEquipment(
            name="Yoga Mat",
            sport=SportType.YOGA,
            location="Studio 1",
            condition=EquipmentCondition.NEW,
            total_quantity=30,
            available_quantity=30,
            brand="Manduka",
        ),
        CreateEquipment(
            name="Swimming Goggles",
            sport=SportType.SWIMMING,
            location="Pool Area",
            condition=EquipmentCondition.FAIR,
            total_quantity=25,
            available_quantity=10,
            brand="Speedo",
        ),
    ]
    return [await repo.create_equipment(d) for d in items[:count]]


async def _seed_league(repo: SportsRecreationRepository) -> object:
    data = CreateSportLeague(
        name="Spring Tennis League",
        sport=SportType.TENNIS,
        format=LeagueFormat.ROUND_ROBIN,
        teams=["Team A", "Team B", "Team C", "Team D"],
        season="Spring 2026",
        start_date="2026-04-01",
        end_date="2026-06-30",
        coordinator_member_id="COORD001",
        max_teams=8,
    )
    return await repo.create_league(data)


# ══════════════════════════════════════════════════════════════════════════
# TOOL 1: manage_court_reservations (🟢 AUTO / 🔴 HITL for tournament)
# ══════════════════════════════════════════════════════════════════════════


class TestManageCourtReservations:

    @pytest.mark.asyncio
    async def test_create_reservation_success(self, sports_agent):
        result = await sports_agent.manage_court_reservations(
            action="create",
            court_name="Court 1",
            sport="tennis",
            member_id="M001",
            member_name="Ana García",
            date="2026-06-15",
            start_time="10:00",
            end_time="11:00",
        )

        assert result["status"] == "success"
        assert "Court 1" in result["message"]
        assert result["reservation"]["member_id"] == "M001"
        assert result["reservation"]["status"] == "confirmed"

    @pytest.mark.asyncio
    async def test_create_reservation_missing_fields(self, sports_agent):
        result = await sports_agent.manage_court_reservations(
            action="create",
            court_name="Court 1",
        )

        assert result["status"] == "error"
        assert "obligatorios" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_create_reservation_invalid_sport(self, sports_agent):
        result = await sports_agent.manage_court_reservations(
            action="create",
            court_name="Court 1",
            sport="quidditch",
            member_id="M001",
            member_name="Ana",
            date="2026-06-15",
            start_time="10:00",
            end_time="11:00",
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_reservation_success(self, sports_agent, sports_repo):
        reservations = await _seed_reservations(sports_repo, 1)

        result = await sports_agent.manage_court_reservations(
            action="cancel", reservation_id=reservations[0].id
        )

        assert result["status"] == "success"
        assert "cancelada" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_cancel_reservation_not_found(self, sports_agent):
        result = await sports_agent.manage_court_reservations(
            action="cancel", reservation_id="nonexistent"
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_cancel_reservation_missing_id(self, sports_agent):
        result = await sports_agent.manage_court_reservations(action="cancel")

        assert result["status"] == "error"
        assert "reservation_id" in result["message"]

    @pytest.mark.asyncio
    async def test_tournament_block_requires_approval(self, sports_agent):
        """Tournament court blocks should go through HITL."""
        result = await sports_agent.manage_court_reservations(
            action="create",
            court_name="Center Court",
            sport="tennis",
            member_id="ORG001",
            member_name="Tournament Organizer",
            date="2026-07-01",
            start_time="08:00",
            end_time="20:00",
            purpose="tournament_block",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "aprobación" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_tournament_block_approve_and_execute(
        self, sports_agent, sports_repo
    ):
        """Full HITL flow: request → approve → execute court block."""
        result = await sports_agent.manage_court_reservations(
            action="create",
            court_name="Center Court",
            sport="tennis",
            member_id="ORG001",
            member_name="Tournament Organizer",
            date="2026-07-01",
            start_time="08:00",
            end_time="20:00",
            purpose="tournament_block",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        # Approve
        approval = await sports_agent.approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado para torneo de verano",
        )
        assert approval.status == ApprovalStatus.APPROVED

        # Execute
        exec_result = await sports_agent.execute_court_reservation_block(
            court_name="Center Court",
            sport="tennis",
            member_id="ORG001",
            member_name="Tournament Organizer",
            date="2026-07-01",
            start_time="08:00",
            end_time="20:00",
            purpose="tournament_block",
        )

        assert exec_result["status"] == "success"
        assert exec_result["reservation"]["purpose"] == "tournament_block"


# ══════════════════════════════════════════════════════════════════════════
# TOOL 2: organize_tournament (🔴 HITL)
# ══════════════════════════════════════════════════════════════════════════


class TestOrganizeTournament:

    @pytest.mark.asyncio
    async def test_create_tournament_pending_approval(self, sports_agent):
        result = await sports_agent.organize_tournament(
            name="Summer Open",
            sport="tennis",
            format="single_elimination",
            start_date="2026-07-01",
            end_date="2026-07-05",
            registration_deadline="2026-06-25",
            max_participants=32,
            venue="Main Courts",
            organizer_member_id="ORG001",
            entry_fee=50.0,
            prizes="Trophy, Cash Prize",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert result["details"]["name"] == "Summer Open"
        assert len(result["details"]["prizes"]) == 2

    @pytest.mark.asyncio
    async def test_create_tournament_missing_fields(self, sports_agent):
        result = await sports_agent.organize_tournament(name="Incomplete")

        assert result["status"] == "error"
        assert "obligatorios" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_create_tournament_invalid_sport(self, sports_agent):
        result = await sports_agent.organize_tournament(
            name="Bad Sport Tourney",
            sport="chess",
            start_date="2026-07-01",
            end_date="2026-07-05",
            registration_deadline="2026-06-25",
            max_participants=16,
            venue="Room A",
            organizer_member_id="ORG001",
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_create_tournament_invalid_format(self, sports_agent):
        result = await sports_agent.organize_tournament(
            name="Bad Format Tourney",
            sport="tennis",
            format="battle_royale",
            start_date="2026-07-01",
            end_date="2026-07-05",
            registration_deadline="2026-06-25",
            max_participants=16,
            venue="Courts",
            organizer_member_id="ORG001",
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_execute_tournament_approve_flow(
        self, sports_agent, sports_repo
    ):
        """Full approval flow: request → approve → execute tournament."""
        result = await sports_agent.organize_tournament(
            name="Club Championship",
            sport="tennis",
            format="round_robin",
            start_date="2026-08-01",
            end_date="2026-08-10",
            registration_deadline="2026-07-25",
            max_participants=16,
            venue="Main Courts",
            organizer_member_id="ORG002",
            prizes="Medal, Trophy",
            requested_by="org002@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        # Approve
        approval = await sports_agent.approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado por comité deportivo",
        )
        assert approval.status == ApprovalStatus.APPROVED

        # Execute
        exec_result = await sports_agent.execute_tournament(
            name="Club Championship",
            sport="tennis",
            format="round_robin",
            start_date="2026-08-01",
            end_date="2026-08-10",
            registration_deadline="2026-07-25",
            max_participants=16,
            venue="Main Courts",
            organizer_member_id="ORG002",
            prizes=["Medal", "Trophy"],
        )

        assert exec_result["status"] == "success"
        assert exec_result["tournament"]["status"] == "confirmed"
        assert exec_result["tournament"]["name"] == "Club Championship"

        # Verify it exists in repo
        all_tournaments = await sports_repo.list_tournaments()
        assert len(all_tournaments) == 1

    @pytest.mark.asyncio
    async def test_execute_tournament_reject_flow(self, sports_agent, sports_repo):
        """Tournament should NOT be created if rejected."""
        result = await sports_agent.organize_tournament(
            name="Rejected Tourney",
            sport="tennis",
            format="single_elimination",
            start_date="2026-09-01",
            end_date="2026-09-05",
            registration_deadline="2026-08-25",
            max_participants=8,
            venue="Courts",
            organizer_member_id="ORG003",
        )

        # Reject
        await sports_agent.approval_engine.reject(
            UUID(result["request_id"]),
            rejected_by="admin@castillo.cr",
            reason="Conflicto de calendario",
        )

        # Tournament should NOT exist
        all_tournaments = await sports_repo.list_tournaments()
        assert len(all_tournaments) == 0


# ══════════════════════════════════════════════════════════════════════════
# TOOL 3: manage_fitness_classes (🟢 AUTO)
# ══════════════════════════════════════════════════════════════════════════


class TestManageFitnessClasses:

    @pytest.mark.asyncio
    async def test_list_classes_empty(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(action="list")

        assert result["status"] == "success"
        assert result["classes"] == []
        assert "0" in result["message"]

    @pytest.mark.asyncio
    async def test_list_classes_with_data(self, sports_agent, sports_repo):
        await _seed_fitness_classes(sports_repo, 3)

        result = await sports_agent.manage_fitness_classes(action="list")

        assert result["status"] == "success"
        assert len(result["classes"]) == 3

    @pytest.mark.asyncio
    async def test_list_classes_filter_by_sport(self, sports_agent, sports_repo):
        await _seed_fitness_classes(sports_repo, 3)

        result = await sports_agent.manage_fitness_classes(
            action="list", sport="yoga"
        )

        assert result["status"] == "success"
        assert len(result["classes"]) == 1
        assert result["classes"][0]["sport"] == "yoga"

    @pytest.mark.asyncio
    async def test_create_class_success(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="create",
            name="Evening Yoga",
            sport="yoga",
            class_type="group",
            instructor="Maria Lopez",
            skill_level="all_levels",
            schedule_day="Tuesday",
            schedule_time="18:00",
            duration_minutes=75,
            max_capacity=25,
            location="Studio 2",
            equipment_needed="Yoga Mat, Blocks",
        )

        assert result["status"] == "success"
        assert "Evening Yoga" in result["message"]
        assert result["fitness_class"]["instructor"] == "Maria Lopez"
        assert result["fitness_class"]["max_capacity"] == 25

    @pytest.mark.asyncio
    async def test_create_class_missing_fields(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="create", name="Incomplete"
        )

        assert result["status"] == "error"
        assert "obligatorios" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_create_class_invalid_sport(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="create",
            name="Bad Sport",
            sport="boxing",
            class_type="group",
            instructor="Coach",
            schedule_day="Monday",
            schedule_time="10:00",
            duration_minutes=60,
            max_capacity=10,
            location="Gym",
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_get_class_success(self, sports_agent, sports_repo):
        classes = await _seed_fitness_classes(sports_repo, 1)

        result = await sports_agent.manage_fitness_classes(
            action="get", class_id=classes[0].id
        )

        assert result["status"] == "success"
        assert result["fitness_class"]["id"] == classes[0].id

    @pytest.mark.asyncio
    async def test_get_class_not_found(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="get", class_id="nonexistent"
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_class_missing_id(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(action="get")

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_update_class_success(self, sports_agent, sports_repo):
        classes = await _seed_fitness_classes(sports_repo, 1)

        result = await sports_agent.manage_fitness_classes(
            action="update",
            class_id=classes[0].id,
            instructor="New Instructor",
            max_capacity=30,
        )

        assert result["status"] == "success"
        assert result["fitness_class"]["instructor"] == "New Instructor"
        assert result["fitness_class"]["max_capacity"] == 30

    @pytest.mark.asyncio
    async def test_update_class_not_found(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="update", class_id="nonexistent", instructor="Nobody"
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_class_missing_id(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(
            action="update", instructor="Nobody"
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_unknown_action(self, sports_agent):
        result = await sports_agent.manage_fitness_classes(action="delete")

        assert result["status"] == "error"
        assert "no válida" in result["message"].lower()


# ══════════════════════════════════════════════════════════════════════════
# TOOL 4: coordinate_coaching (🟢 AUTO)
# ══════════════════════════════════════════════════════════════════════════


class TestCoordinateCoaching:

    @pytest.mark.asyncio
    async def test_create_session_success(self, sports_agent):
        result = await sports_agent.coordinate_coaching(
            action="create",
            sport="tennis",
            coach_name="Coach Martinez",
            member_id="M001",
            member_name="Ana García",
            skill_level="intermediate",
            date="2026-06-20",
            start_time="10:00",
            end_time="11:00",
            location="Court 1",
            focus_areas="backhand, serve, footwork",
        )

        assert result["status"] == "success"
        assert "Coach Martinez" in result["message"]
        assert result["session"]["status"] == "scheduled"
        assert len(result["session"]["focus_areas"]) == 3

    @pytest.mark.asyncio
    async def test_create_session_missing_fields(self, sports_agent):
        result = await sports_agent.coordinate_coaching(
            action="create", coach_name="Coach"
        )

        assert result["status"] == "error"
        assert "obligatorios" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_create_session_invalid_sport(self, sports_agent):
        result = await sports_agent.coordinate_coaching(
            action="create",
            sport="boxing",
            coach_name="Coach",
            member_id="M001",
            member_name="Ana",
            date="2026-06-20",
            start_time="10:00",
            end_time="11:00",
            location="Gym",
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_list_sessions_empty(self, sports_agent):
        result = await sports_agent.coordinate_coaching(action="list")

        assert result["status"] == "success"
        assert result["sessions"] == []

    @pytest.mark.asyncio
    async def test_list_sessions_with_data(self, sports_agent, sports_repo):
        await _seed_coaching(sports_repo)

        result = await sports_agent.coordinate_coaching(action="list")

        assert result["status"] == "success"
        assert len(result["sessions"]) == 1

    @pytest.mark.asyncio
    async def test_list_sessions_filter_sport(self, sports_agent, sports_repo):
        await _seed_coaching(sports_repo)

        result = await sports_agent.coordinate_coaching(
            action="list", sport="swimming"
        )

        assert result["status"] == "success"
        assert len(result["sessions"]) == 0

    @pytest.mark.asyncio
    async def test_get_session_success(self, sports_agent, sports_repo):
        session = await _seed_coaching(sports_repo)

        result = await sports_agent.coordinate_coaching(
            action="get", session_id=session.id
        )

        assert result["status"] == "success"
        assert result["session"]["coach_name"] == "Coach Martinez"

    @pytest.mark.asyncio
    async def test_get_session_not_found(self, sports_agent):
        result = await sports_agent.coordinate_coaching(
            action="get", session_id="nonexistent"
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_session_missing_id(self, sports_agent):
        result = await sports_agent.coordinate_coaching(action="get")

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_unknown_action(self, sports_agent):
        result = await sports_agent.coordinate_coaching(action="delete")

        assert result["status"] == "error"
        assert "no válida" in result["message"].lower()


# ══════════════════════════════════════════════════════════════════════════
# TOOL 5: manage_sport_leagues (🔴 HITL)
# ══════════════════════════════════════════════════════════════════════════


class TestManageSportLeagues:

    @pytest.mark.asyncio
    async def test_create_league_pending_approval(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(
            action="create",
            name="Summer Tennis League",
            sport="tennis",
            format="round_robin",
            teams="Alpha, Bravo, Charlie, Delta",
            season="Summer 2026",
            start_date="2026-06-01",
            end_date="2026-08-31",
            coordinator_member_id="COORD001",
            max_teams=8,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert result["details"]["name"] == "Summer Tennis League"
        assert len(result["details"]["teams"]) == 4

    @pytest.mark.asyncio
    async def test_create_league_missing_fields(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(
            action="create", name="Incomplete"
        )

        assert result["status"] == "error"
        assert "obligatorios" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_list_leagues_empty(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(action="list")

        assert result["status"] == "success"
        assert result["leagues"] == []

    @pytest.mark.asyncio
    async def test_list_leagues_with_data(self, sports_agent, sports_repo):
        await _seed_league(sports_repo)

        result = await sports_agent.manage_sport_leagues(action="list")

        assert result["status"] == "success"
        assert len(result["leagues"]) == 1

    @pytest.mark.asyncio
    async def test_get_league_success(self, sports_agent, sports_repo):
        league = await _seed_league(sports_repo)

        result = await sports_agent.manage_sport_leagues(
            action="get", league_id=league.id
        )

        assert result["status"] == "success"
        assert result["league"]["name"] == "Spring Tennis League"

    @pytest.mark.asyncio
    async def test_get_league_not_found(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(
            action="get", league_id="nonexistent"
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_get_league_missing_id(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(action="get")

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_update_league_status(self, sports_agent, sports_repo):
        league = await _seed_league(sports_repo)

        result = await sports_agent.manage_sport_leagues(
            action="update_status",
            league_id=league.id,
            new_status="active",
        )

        assert result["status"] == "success"
        assert result["league"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_update_league_status_not_found(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(
            action="update_status",
            league_id="nonexistent",
            new_status="active",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_execute_league_approve_flow(
        self, sports_agent, sports_repo
    ):
        """Full approval flow: request → approve → execute league."""
        result = await sports_agent.manage_sport_leagues(
            action="create",
            name="Pro League",
            sport="tennis",
            format="round_robin",
            teams="A, B",
            season="Pro 2026",
            start_date="2026-09-01",
            end_date="2026-12-31",
            coordinator_member_id="COORD002",
            max_teams=10,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        # Approve
        approval = await sports_agent.approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado para temporada Pro",
        )
        assert approval.status == ApprovalStatus.APPROVED

        # Execute
        exec_result = await sports_agent.execute_league(
            name="Pro League",
            sport="tennis",
            format="round_robin",
            teams=["A", "B"],
            season="Pro 2026",
            start_date="2026-09-01",
            end_date="2026-12-31",
            coordinator_member_id="COORD002",
            max_teams=10,
        )

        assert exec_result["status"] == "success"
        assert exec_result["league"]["status"] == "active"

        # Verify it exists in repo
        all_leagues = await sports_repo.list_leagues()
        assert len(all_leagues) == 1

    @pytest.mark.asyncio
    async def test_unknown_action(self, sports_agent):
        result = await sports_agent.manage_sport_leagues(action="delete")

        assert result["status"] == "error"
        assert "no válida" in result["message"].lower()


# ══════════════════════════════════════════════════════════════════════════
# TOOL 6: get_equipment_availability (🟢 AUTO)
# ══════════════════════════════════════════════════════════════════════════


class TestGetEquipmentAvailability:

    @pytest.mark.asyncio
    async def test_all_equipment_empty(self, sports_agent):
        result = await sports_agent.get_equipment_availability()

        assert result["status"] == "success"
        assert result["equipment"] == []
        assert result["total_items"] == 0

    @pytest.mark.asyncio
    async def test_all_equipment_with_data(self, sports_agent, sports_repo):
        await _seed_equipment(sports_repo, 3)

        result = await sports_agent.get_equipment_availability()

        assert result["status"] == "success"
        assert result["total_items"] == 3
        assert result["available_items"] == 3

    @pytest.mark.asyncio
    async def test_filter_by_sport(self, sports_agent, sports_repo):
        await _seed_equipment(sports_repo, 3)

        result = await sports_agent.get_equipment_availability(sport="yoga")

        assert result["status"] == "success"
        assert len(result["equipment"]) == 1
        assert result["equipment"][0]["sport"] == "yoga"

    @pytest.mark.asyncio
    async def test_filter_by_location(self, sports_agent, sports_repo):
        await _seed_equipment(sports_repo, 3)

        result = await sports_agent.get_equipment_availability(
            location="Pool Area"
        )

        assert result["status"] == "success"
        assert len(result["equipment"]) == 1
        assert result["equipment"][0]["location"] == "Pool Area"

    @pytest.mark.asyncio
    async def test_invalid_sport(self, sports_agent):
        result = await sports_agent.get_equipment_availability(sport="cricket")

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_filter_no_results(self, sports_agent, sports_repo):
        await _seed_equipment(sports_repo, 3)

        result = await sports_agent.get_equipment_availability(sport="golf")

        assert result["status"] == "success"
        assert result["equipment"] == []
        assert result["total_items"] == 0


# ══════════════════════════════════════════════════════════════════════════
# TOOL 7: get_sports_recommendations (🟢 AUTO)
# ══════════════════════════════════════════════════════════════════════════


class TestGetSportsRecommendations:

    @pytest.mark.asyncio
    async def test_no_data_returns_empty(self, sports_agent):
        result = await sports_agent.get_sports_recommendations(member_id="M001")

        assert result["status"] == "success"
        assert isinstance(result["recommendations"], list)

    @pytest.mark.asyncio
    async def test_recommendations_from_classes(self, sports_agent, sports_repo):
        await _seed_fitness_classes(sports_repo, 2)

        result = await sports_agent.get_sports_recommendations(member_id="M001")

        assert result["status"] == "success"
        assert len(result["recommendations"]) >= 2

    @pytest.mark.asyncio
    async def test_recommendations_from_coaching(self, sports_agent, sports_repo):
        await _seed_coaching(sports_repo)

        result = await sports_agent.get_sports_recommendations(member_id="M001")

        assert result["status"] == "success"
        coach_recs = [
            r for r in result["recommendations"] if r.get("suggested_coach")
        ]
        assert len(coach_recs) >= 1

    @pytest.mark.asyncio
    async def test_recommendations_from_equipment_fallback(
        self, sports_agent, sports_repo
    ):
        """When no classes/coaching but equipment exists, suggest based on equipment."""
        await _seed_equipment(sports_repo, 2)

        result = await sports_agent.get_sports_recommendations(member_id="M002")

        assert result["status"] == "success"
        assert len(result["recommendations"]) >= 1

    @pytest.mark.asyncio
    async def test_missing_member_id(self, sports_agent):
        result = await sports_agent.get_sports_recommendations()

        assert result["status"] == "error"
        assert "member_id" in result["message"]

    @pytest.mark.asyncio
    async def test_invalid_sport_filter(self, sports_agent):
        result = await sports_agent.get_sports_recommendations(
            member_id="M001", sport="cricket"
        )

        assert result["status"] == "error"
        assert "no válido" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_filter_by_sport(self, sports_agent, sports_repo):
        await _seed_fitness_classes(sports_repo, 3)
        await _seed_coaching(sports_repo)

        result = await sports_agent.get_sports_recommendations(
            member_id="M001", sport="tennis"
        )

        assert result["status"] == "success"
        for rec in result["recommendations"]:
            assert rec["sport"] == "tennis"
