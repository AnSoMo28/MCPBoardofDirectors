"""
Tests for GuestManagementAgent.
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from club_mcp.agents.guest_management_agent import GuestManagementAgent
from club_mcp.db.repositories.guest_management_repo import (
    GuestManagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.guest_management import (
    CreateGuest,
    CreatePrivateEvent,
    CreateTrialMembership,
    GuestPrivilegeType,
    PrivateEventType,
    TrialMembershipType,
)


# ── Fixtures ───────────────────────────────────────────────

@pytest.fixture
def guest_repo():
    return GuestManagementRepository()


@pytest.fixture
def guest_agent(guest_repo, approval_engine):
    agent = GuestManagementAgent(repo=guest_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────────

async def _seed_guest(
    repo: GuestManagementRepository,
    family_id: str = "fam_001",
    guest_name: str = "Juan Perez",
    visit_date: str = "2026-06-01",
    host_member_id: str = "mem_001",
    privileges: list[str] | None = None,
):
    data = CreateGuest(
        family_id=family_id,
        host_member_id=host_member_id,
        guest_name=guest_name,
        visit_date=visit_date,
        privileges=privileges or [],
    )
    return await repo.create_guest(data)


async def _seed_private_event(
    repo: GuestManagementRepository,
    family_id: str = "fam_001",
    event_name: str = "Boda Garcia-Lopez",
    event_type: str = "wedding",
):
    data = CreatePrivateEvent(
        family_id=family_id,
        event_name=event_name,
        event_type=PrivateEventType(event_type),
        venue="Sal\u00f3n Principal",
        date="2026-08-15",
        start_time="18:00",
        end_time="23:00",
        coordinator_member_id="mem_001",
        guest_count=200,
        budget=25000.0,
    )
    return await repo.create_private_event(data)


async def _seed_trial(
    repo: GuestManagementRepository,
    guest_name: str = "Pedro Ramirez",
    referred_by_family_id: str = "fam_001",
):
    data = CreateTrialMembership(
        guest_name=guest_name,
        guest_email="pedro@example.com",
        referred_by_family_id=referred_by_family_id,
        trial_type=TrialMembershipType.MONTH_TRIAL,
        start_date="2026-06-01",
        end_date="2026-06-30",
    )
    return await repo.create_trial_membership(data)


# ═══════════════════════════════════════════════════════════
# TEST: REGISTER GUEST
# ═══════════════════════════════════════════════════════════


class TestRegisterGuest:
    @pytest.mark.asyncio
    async def test_list_guests_empty(self, guest_agent):
        result = await guest_agent.register_guest(action="list")
        assert result["status"] == "success"
        assert result["guests"] == []

    @pytest.mark.asyncio
    async def test_create_guest_success(self, guest_agent):
        result = await guest_agent.register_guest(
            action="create",
            family_id="fam_001",
            host_member_id="mem_001",
            guest_name="Juan Perez",
            visit_date="2026-06-01",
        )
        assert result["status"] == "success"
        assert "Juan Perez" in result["message"]
        assert result["guest"]["guest_name"] == "Juan Perez"
        assert result["guest"]["status"] == "registered"

    @pytest.mark.asyncio
    async def test_create_guest_missing_fields(self, guest_agent):
        result = await guest_agent.register_guest(
            action="create",
            family_id="fam_001",
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.parametrize(
        ("visit_date", "privileges"),
        [("invalid-date", ""), ("2026-06-01", "bowling")],
    )
    @pytest.mark.asyncio
    async def test_create_guest_rejects_invalid_data(
        self, visit_date, privileges, guest_agent,
    ):
        result = await guest_agent.register_guest(
            action="create",
            family_id="fam_001",
            host_member_id="mem_001",
            guest_name="Juan Perez",
            visit_date=visit_date,
            privileges=privileges,
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_get_guest(self, guest_agent, guest_repo):
        guest = await _seed_guest(guest_repo)
        result = await guest_agent.register_guest(
            action="get", guest_id=guest.id
        )
        assert result["status"] == "success"
        assert result["guest"]["id"] == guest.id

    @pytest.mark.asyncio
    async def test_get_guest_not_found(self, guest_agent):
        result = await guest_agent.register_guest(
            action="get", guest_id="nonexistent"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_check_in_guest(self, guest_agent, guest_repo):
        guest = await _seed_guest(guest_repo)
        result = await guest_agent.register_guest(
            action="check_in", guest_id=guest.id
        )
        assert result["status"] == "success"
        assert result["guest"]["status"] == "checked_in"

    @pytest.mark.asyncio
    async def test_cancel_guest(self, guest_agent, guest_repo):
        guest = await _seed_guest(guest_repo)
        result = await guest_agent.register_guest(
            action="cancel", guest_id=guest.id
        )
        assert result["status"] == "success"
        assert result["guest"]["status"] == "cancelled"

    @pytest.mark.parametrize("action", ["check_in", "cancel"])
    @pytest.mark.asyncio
    async def test_guest_update_not_found_after_lookup(
        self, action, guest_agent, guest_repo, monkeypatch,
    ):
        guest = await _seed_guest(guest_repo)
        monkeypatch.setattr(
            guest_repo, "update_guest", AsyncMock(return_value=None)
        )

        result = await guest_agent.register_guest(
            action=action, guest_id=guest.id
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_guests_with_data(self, guest_agent, guest_repo):
        await _seed_guest(guest_repo, guest_name="Guest 1")
        await _seed_guest(guest_repo, guest_name="Guest 2")
        result = await guest_agent.register_guest(action="list")
        assert result["status"] == "success"
        assert len(result["guests"]) == 2

    @pytest.mark.asyncio
    async def test_create_guest_exceeds_limit(
        self, guest_agent, guest_repo
    ):
        # Sembrar 4 invitados (el l\u00edmite)
        for i in range(4):
            await _seed_guest(
                guest_repo,
                guest_name=f"Guest {i + 1}",
                family_id="fam_limit",
                visit_date="2026-07-01",
            )
        # El 5\u00ba debe disparar aprobaci\u00f3n
        result = await guest_agent.register_guest(
            action="create",
            family_id="fam_limit",
            host_member_id="mem_001",
            guest_name="Guest 5",
            visit_date="2026-07-01",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert result["current_guests"] == 4
        assert result["limit"] == 4


# ═══════════════════════════════════════════════════════════
# TEST: MANAGE GUEST PRIVILEGES
# ═══════════════════════════════════════════════════════════


class TestManageGuestPrivileges:
    @pytest.mark.asyncio
    async def test_list_available_privileges(self, guest_agent):
        result = await guest_agent.manage_guest_privileges(
            action="list"
        )
        assert result["status"] == "success"
        assert len(result["privileges"]) == len(GuestPrivilegeType)
        types = [p["type"] for p in result["privileges"]]
        assert "pool" in types
        assert "gym" in types

    @pytest.mark.asyncio
    async def test_get_guest_privileges(
        self, guest_agent, guest_repo
    ):
        guest = await _seed_guest(
            guest_repo, privileges=["pool", "dining"]
        )
        result = await guest_agent.manage_guest_privileges(
            action="get", guest_id=guest.id
        )
        assert result["status"] == "success"
        assert "pool" in result["privileges"]
        assert "dining" in result["privileges"]
        assert len(result["privileges"]) == 2

    @pytest.mark.asyncio
    async def test_assign_privilege(self, guest_agent, guest_repo):
        guest = await _seed_guest(guest_repo)
        result = await guest_agent.manage_guest_privileges(
            action="assign",
            guest_id=guest.id,
            privilege_type="pool",
        )
        assert result["status"] == "success"
        assert "pool" in result["guest"]["privileges"]

    @pytest.mark.asyncio
    async def test_revoke_privilege(self, guest_agent, guest_repo):
        guest = await _seed_guest(
            guest_repo, privileges=["pool", "gym"]
        )
        result = await guest_agent.manage_guest_privileges(
            action="revoke",
            guest_id=guest.id,
            privilege_type="pool",
        )
        assert result["status"] == "success"
        assert "pool" not in result["guest"]["privileges"]
        assert "gym" in result["guest"]["privileges"]

    @pytest.mark.parametrize(
        ("action", "privileges"),
        [("assign", []), ("revoke", ["pool"])],
    )
    @pytest.mark.asyncio
    async def test_privilege_update_not_found_after_lookup(
        self, action, privileges, guest_agent, guest_repo, monkeypatch,
    ):
        guest = await _seed_guest(guest_repo, privileges=privileges)
        monkeypatch.setattr(
            guest_repo, "update_guest", AsyncMock(return_value=None)
        )

        result = await guest_agent.manage_guest_privileges(
            action=action,
            guest_id=guest.id,
            privilege_type="pool",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_assign_privilege_invalid_type(
        self, guest_agent, guest_repo
    ):
        guest = await _seed_guest(guest_repo)
        result = await guest_agent.manage_guest_privileges(
            action="assign",
            guest_id=guest.id,
            privilege_type="bowling",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_get_privileges_not_found(self, guest_agent):
        result = await guest_agent.manage_guest_privileges(
            action="get", guest_id="nonexistent"
        )
        assert result["status"] == "not_found"


# ═══════════════════════════════════════════════════════════
# TEST: PLAN PRIVATE EVENT
# ═══════════════════════════════════════════════════════════


class TestPlanPrivateEvent:
    @pytest.mark.asyncio
    async def test_list_events_empty(self, guest_agent):
        result = await guest_agent.plan_private_event(action="list")
        assert result["status"] == "success"
        assert result["events"] == []

    @pytest.mark.asyncio
    async def test_create_private_event_pending_approval(
        self, guest_agent
    ):
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
            event_name="Boda Garcia-Lopez",
            event_type="wedding",
            venue="Sal\u00f3n Principal",
            date="2026-08-15",
            coordinator_member_id="mem_001",
            guest_count=200,
            budget=25000.0,
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_create_private_event_rejects_invalid_date(self, guest_agent):
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
            event_name="Evento de prueba",
            event_type="wedding",
            venue="Salón Principal",
            date="invalid-date",
            coordinator_member_id="mem_001",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_approve_and_execute_private_event(
        self, guest_agent, guest_repo, approval_engine
    ):
        # Crear solicitud
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
            event_name="Boda Garcia-Lopez",
            event_type="wedding",
            venue="Sal\u00f3n Principal",
            date="2026-08-15",
            coordinator_member_id="mem_001",
            guest_count=200,
            budget=25000.0,
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        # Aprobar
        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado para agosto",
        )
        assert approval.status == ApprovalStatus.APPROVED

        # Ejecutar
        exec_result = await guest_agent.execute_private_event(
            family_id="fam_001",
            event_name="Boda Garcia-Lopez",
            event_type="wedding",
            venue="Sal\u00f3n Principal",
            date="2026-08-15",
            coordinator_member_id="mem_001",
            guest_count=200,
            budget=25000.0,
        )
        assert exec_result["status"] == "success"
        assert exec_result["event"]["status"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_private_event(
        self, guest_agent, approval_engine
    ):
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
            event_name="Evento Rechazado",
            event_type="corporate",
            venue="Terraza",
            date="2026-09-01",
            coordinator_member_id="mem_001",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="Conflicto de fecha",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_get_private_event(
        self, guest_agent, guest_repo
    ):
        event = await _seed_private_event(guest_repo)
        result = await guest_agent.plan_private_event(
            action="get", event_id=event.id
        )
        assert result["status"] == "success"
        assert result["event"]["id"] == event.id

    @pytest.mark.asyncio
    async def test_update_event_status(
        self, guest_agent, guest_repo
    ):
        event = await _seed_private_event(guest_repo)
        result = await guest_agent.plan_private_event(
            action="update_status",
            event_id=event.id,
            new_status="quoted",
        )
        assert result["status"] == "success"
        assert result["event"]["status"] == "quoted"

    @pytest.mark.asyncio
    async def test_update_event_status_not_found_after_lookup(
        self, guest_agent, guest_repo, monkeypatch,
    ):
        event = await _seed_private_event(guest_repo)
        monkeypatch.setattr(
            guest_repo,
            "update_private_event",
            AsyncMock(return_value=None),
        )

        result = await guest_agent.plan_private_event(
            action="update_status", event_id=event.id, new_status="quoted",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_event_confirmation_failure_after_create(
        self, guest_agent, guest_repo, monkeypatch,
    ):
        monkeypatch.setattr(
            guest_repo,
            "update_private_event",
            AsyncMock(return_value=None),
        )

        result = await guest_agent.execute_private_event(
            family_id="fam_001",
            event_name="Evento de prueba",
            event_type="wedding",
            venue="Salón Principal",
            date="2026-12-15",
            coordinator_member_id="mem_001",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_create_event_missing_fields(self, guest_agent):
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.asyncio
    async def test_create_event_invalid_type(self, guest_agent):
        result = await guest_agent.plan_private_event(
            action="create",
            family_id="fam_001",
            event_name="Test",
            event_type="rodeo",
            venue="Main",
            date="2026-09-01",
            coordinator_member_id="mem_001",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]

    @pytest.mark.asyncio
    async def test_list_events_with_data(
        self, guest_agent, guest_repo
    ):
        await _seed_private_event(
            guest_repo, event_name="Boda 1"
        )
        await _seed_private_event(
            guest_repo,
            event_name="Bautizo 1",
            event_type="baptism",
        )
        result = await guest_agent.plan_private_event(action="list")
        assert result["status"] == "success"
        assert len(result["events"]) == 2


# ═══════════════════════════════════════════════════════════
# TEST: GET GUEST ANALYTICS
# ═══════════════════════════════════════════════════════════


class TestGetGuestAnalytics:
    @pytest.mark.asyncio
    async def test_analytics_empty(self, guest_agent):
        result = await guest_agent.get_guest_analytics()
        assert result["status"] == "success"
        assert result["analytics"]["total_guests"] == 0
        assert result["analytics"]["total_private_events"] == 0

    @pytest.mark.asyncio
    async def test_analytics_with_data(
        self, guest_agent, guest_repo
    ):
        await _seed_guest(
            guest_repo, guest_name="G1", family_id="fam_a"
        )
        await _seed_guest(
            guest_repo, guest_name="G2", family_id="fam_a"
        )
        await _seed_private_event(guest_repo, family_id="fam_a")
        await _seed_trial(guest_repo, referred_by_family_id="fam_a")

        result = await guest_agent.get_guest_analytics(
            family_id="fam_a"
        )
        assert result["status"] == "success"
        assert result["analytics"]["total_guests"] == 2
        assert result["analytics"]["total_private_events"] == 1
        assert result["analytics"]["total_trial_memberships"] == 1


# ═══════════════════════════════════════════════════════════
# TEST: MANAGE TRIAL MEMBERSHIPS
# ═══════════════════════════════════════════════════════════


class TestManageTrialMemberships:
    @pytest.mark.asyncio
    async def test_list_trials_empty(self, guest_agent):
        result = await guest_agent.manage_trial_memberships(
            action="list"
        )
        assert result["status"] == "success"
        assert result["trial_memberships"] == []

    @pytest.mark.asyncio
    async def test_create_trial_pending_approval(self, guest_agent):
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Pedro Ramirez",
            guest_email="pedro@example.com",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-06-01",
            end_date="2026-06-30",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_approve_and_execute_trial(
        self, guest_agent, approval_engine
    ):
        # Crear solicitud
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Pedro Ramirez",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-06-01",
            end_date="2026-06-30",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        # Aprobar
        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Trial aprobado",
        )
        assert approval.status == ApprovalStatus.APPROVED

        # Ejecutar
        exec_result = await guest_agent.execute_trial_membership(
            guest_name="Pedro Ramirez",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-06-01",
            end_date="2026-06-30",
            guest_email="pedro@example.com",
        )
        assert exec_result["status"] == "success"
        assert exec_result["trial_membership"]["status"] == "approved"

    @pytest.mark.asyncio
    async def test_reject_trial(
        self, guest_agent, approval_engine
    ):
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Rechazado",
            referred_by_family_id="fam_001",
            trial_type="day_pass",
            start_date="2026-06-01",
            end_date="2026-06-01",
            requested_by="admin@castillo.cr",
        )
        request_id = result["request_id"]

        approval = await approval_engine.reject(
            UUID(request_id),
            rejected_by="admin@castillo.cr",
            reason="No cumple requisitos",
        )
        assert approval.status == ApprovalStatus.REJECTED

    @pytest.mark.asyncio
    async def test_get_trial(self, guest_agent, guest_repo):
        trial = await _seed_trial(guest_repo)
        result = await guest_agent.manage_trial_memberships(
            action="get", trial_id=trial.id
        )
        assert result["status"] == "success"
        assert result["trial_membership"]["id"] == trial.id

    @pytest.mark.asyncio
    async def test_create_trial_missing_fields(self, guest_agent):
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Incomplete",
        )
        assert result["status"] == "error"
        assert "obligatorios" in result["message"]

    @pytest.mark.asyncio
    async def test_create_trial_rejects_invalid_date_range(self, guest_agent):
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Pedro Ramirez",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-06-30",
            end_date="2026-06-01",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_execute_trial_rejects_invalid_date_range(self, guest_agent):
        result = await guest_agent.execute_trial_membership(
            guest_name="Pedro Ramirez",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-06-30",
            end_date="2026-06-01",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_update_trial_status(
        self, guest_agent, guest_repo
    ):
        trial = await _seed_trial(guest_repo)
        result = await guest_agent.manage_trial_memberships(
            action="update_status",
            trial_id=trial.id,
            new_status="active",
        )
        assert result["status"] == "success"
        assert result["trial_membership"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_update_trial_status_not_found_after_lookup(
        self, guest_agent, guest_repo, monkeypatch,
    ):
        trial = await _seed_trial(guest_repo)
        monkeypatch.setattr(
            guest_repo,
            "update_trial_membership",
            AsyncMock(return_value=None),
        )

        result = await guest_agent.manage_trial_memberships(
            action="update_status",
            trial_id=trial.id,
            new_status="active",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_trial_approval_failure_after_create(
        self, guest_agent, guest_repo, monkeypatch,
    ):
        monkeypatch.setattr(
            guest_repo,
            "update_trial_membership",
            AsyncMock(return_value=None),
        )

        result = await guest_agent.execute_trial_membership(
            guest_name="Invitado de prueba",
            referred_by_family_id="fam_001",
            trial_type="month_trial",
            start_date="2026-12-01",
            end_date="2026-12-31",
        )

        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_create_trial_invalid_type(self, guest_agent):
        result = await guest_agent.manage_trial_memberships(
            action="create",
            guest_name="Bad Type",
            referred_by_family_id="fam_001",
            trial_type="lifetime_free",
            start_date="2026-06-01",
            end_date="2026-12-31",
        )
        assert result["status"] == "error"
        assert "no v\u00e1lido" in result["message"]
