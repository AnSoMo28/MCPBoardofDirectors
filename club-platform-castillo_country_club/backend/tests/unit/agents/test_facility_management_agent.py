"""
Tests for FacilityManagementAgent.
Club: Castillo Country Club
"""

from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import pytest

from club_mcp.agents.facility_management_agent import FacilityManagementAgent
from club_mcp.db.repositories.facility_management_repo import (
    FacilityManagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.facility_management import (
    CreateEventSetup,
    CreateFacility,
    CreateInspection,
    CreateMaintenanceTask,
    FacilityStatus,
    FacilityType,
    InspectionResult,
    MaintenancePriority,
    MaintenanceStatus,
    MaintenanceType,
    SetupStatus,
)


# ── Fixtures ───────────────────────────────────────────

@pytest.fixture
def facility_repo():
    return FacilityManagementRepository()


@pytest.fixture
def facility_agent(facility_repo, approval_engine):
    agent = FacilityManagementAgent(repo=facility_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────

async def _seed_facility(repo, **overrides):
    data = CreateFacility(
        name=overrides.get("name", "Piscina Principal"),
        facility_type=overrides.get("facility_type", FacilityType.POOL),
        location=overrides.get("location", "Área central"),
        capacity=overrides.get("capacity", 60),
        description=overrides.get("description", "Piscina olímpica"),
        amenities=overrides.get("amenities", ["duchas", "lockers"]),
        opening_time=overrides.get("opening_time", "06:00"),
        closing_time=overrides.get("closing_time", "22:00"),
        responsible_member_id=overrides.get("responsible_member_id", "M001"),
    )
    return await repo.create_facility(data)


async def _seed_maintenance(repo, facility_id, facility_name, **overrides):
    data = CreateMaintenanceTask(
        facility_id=facility_id,
        facility_name=facility_name,
        maintenance_type=overrides.get(
            "maintenance_type", MaintenanceType.PREVENTIVE
        ),
        priority=overrides.get("priority", MaintenancePriority.MEDIUM),
        description=overrides.get("description", "Limpieza profunda"),
        scheduled_date=overrides.get("scheduled_date", "2026-06-15"),
        scheduled_time=overrides.get("scheduled_time", "08:00"),
        estimated_duration_hours=overrides.get("estimated_duration_hours", 3.0),
        assigned_to=overrides.get("assigned_to", "Mantenimiento SA"),
        cost=overrides.get("cost", 150000.0),
    )
    return await repo.create_maintenance(data)


async def _seed_inspection(repo, facility_id, facility_name, **overrides):
    data = CreateInspection(
        facility_id=facility_id,
        facility_name=facility_name,
        result=overrides.get("result", InspectionResult.PASS),
        inspector_member_id=overrides.get("inspector_member_id", "M010"),
        inspection_date=overrides.get("inspection_date", "2026-05-14"),
        findings=overrides.get("findings", "Todo en orden"),
    )
    return await repo.create_inspection(data)


# ══════════════════════════════════════════════════════
# TEST CLASS 1: manage_facilities
# ══════════════════════════════════════════════════════


class TestManageFacilities:

    @pytest.mark.asyncio
    async def test_list_empty(self, facility_agent):
        result = await facility_agent.manage_facilities(action="list")
        assert result["status"] == "success"
        assert result["facilities"] == []

    @pytest.mark.asyncio
    async def test_create_success(self, facility_agent):
        result = await facility_agent.manage_facilities(
            action="create",
            name="Cancha de Tenis 1",
            facility_type="tennis_court",
            location="Sector deportivo",
            capacity=4,
            amenities="iluminación,gradas",
            responsible_member_id="M002",
        )

        assert result["status"] == "success"
        assert "Cancha de Tenis 1" in result["message"]
        assert result["facility"]["amenities"] == ["iluminación", "gradas"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, facility_agent):
        result = await facility_agent.manage_facilities(
            action="create",
            name="Solo nombre",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_type(self, facility_agent):
        result = await facility_agent.manage_facilities(
            action="create",
            name="Test",
            facility_type="spaceship_hangar",
        )
        assert result["status"] == "error"
        assert "Tipo no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)
        result = await facility_agent.manage_facilities(
            action="get", facility_id=facility.id
        )
        assert result["status"] == "success"
        assert result["facility"]["name"] == "Piscina Principal"

    @pytest.mark.asyncio
    async def test_get_not_found(self, facility_agent):
        result = await facility_agent.manage_facilities(
            action="get", facility_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_status(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)
        result = await facility_agent.manage_facilities(
            action="update_status",
            facility_id=facility.id,
            new_status="maintenance",
        )
        assert result["status"] == "success"
        assert result["facility"]["status"] == "maintenance"

    @pytest.mark.asyncio
    async def test_update_status_not_found_after_lookup(
        self, facility_agent, facility_repo, monkeypatch,
    ):
        facility = await _seed_facility(facility_repo)
        monkeypatch.setattr(
            facility_agent.repo,
            "update_facility",
            AsyncMock(return_value=None),
        )

        result = await facility_agent.manage_facilities(
            action="update_status",
            facility_id=facility.id,
            new_status="maintenance",
        )

        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_invalid_action(self, facility_agent):
        result = await facility_agent.manage_facilities(action="fly")
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 2: schedule_maintenance
# ══════════════════════════════════════════════════════


class TestScheduleMaintenance:

    @pytest.mark.asyncio
    async def test_maintenance_pending_approval(
        self, facility_agent, facility_repo
    ):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.schedule_maintenance(
            facility_id=facility.id,
            facility_name="Piscina Principal",
            maintenance_type="preventive",
            priority="high",
            description="Revisión del sistema de filtrado",
            scheduled_date="2026-07-01",
            cost=250000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result

    @pytest.mark.asyncio
    async def test_maintenance_approve_and_execute(
        self, facility_agent, facility_repo, approval_engine
    ):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.schedule_maintenance(
            facility_id=facility.id,
            maintenance_type="corrective",
            priority="critical",
            description="Reparar bomba de piscina",
            scheduled_date="2026-06-01",
            cost=500000.0,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Aprobado. Reparación urgente.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await facility_agent.execute_maintenance(
            facility_id=facility.id,
            facility_name="Piscina Principal",
            maintenance_type="corrective",
            priority="critical",
            description="Reparar bomba de piscina",
            scheduled_date="2026-06-01",
            cost=500000.0,
        )

        assert execute_result["status"] == "success"
        assert execute_result["maintenance"]["status"] == "scheduled"

        # Verify facility set to maintenance (corrective triggers it)
        updated_facility = await facility_repo.get_facility(facility.id)
        assert updated_facility.status == FacilityStatus.MAINTENANCE

    @pytest.mark.asyncio
    async def test_maintenance_missing_fields(self, facility_agent):
        result = await facility_agent.schedule_maintenance(
            facility_id="F001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_maintenance_invalid_type(self, facility_agent):
        result = await facility_agent.schedule_maintenance(
            facility_id="F001",
            maintenance_type="voodoo",
            description="Test",
            scheduled_date="2026-06-01",
        )
        assert result["status"] == "error"
        assert "Tipo no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_maintenance_invalid_priority(self, facility_agent):
        result = await facility_agent.schedule_maintenance(
            facility_id="F001",
            maintenance_type="preventive",
            priority="nuclear",
            description="Test",
            scheduled_date="2026-06-01",
        )
        assert result["status"] == "error"
        assert "Prioridad no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_maintenance_resolves_facility_name(
        self, facility_agent, facility_repo
    ):
        facility = await _seed_facility(facility_repo, name="Gimnasio Central")

        result = await facility_agent.schedule_maintenance(
            facility_id=facility.id,
            description="Mantenimiento de equipos",
            scheduled_date="2026-07-15",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert result["details"]["facility_name"] == "Gimnasio Central"


# ══════════════════════════════════════════════════════
# TEST CLASS 3: coordinate_event_setup
# ══════════════════════════════════════════════════════


class TestCoordinateEventSetup:

    @pytest.mark.asyncio
    async def test_setup_pending_approval(self, facility_agent):
        result = await facility_agent.coordinate_event_setup(
            event_id="E001",
            event_name="Gala de Verano",
            facility_id="F001",
            facility_name="Salón Principal",
            setup_date="2026-07-20",
            setup_time="14:00",
            event_start="19:00",
            event_end="23:30",
            requirements="mesas,sillas,escenario,sonido",
            coordinator_member_id="M005",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert result["details"]["requirements"] == [
            "mesas", "sillas", "escenario", "sonido"
        ]

    @pytest.mark.asyncio
    async def test_setup_approve_and_execute(
        self, facility_agent, facility_repo, approval_engine
    ):
        facility = await _seed_facility(
            facility_repo,
            name="Salón Principal",
            facility_type=FacilityType.BALLROOM,
        )

        result = await facility_agent.coordinate_event_setup(
            event_id="E002",
            event_name="Cena de Gala",
            facility_id=facility.id,
            facility_name="Salón Principal",
            setup_date="2026-08-10",
            coordinator_member_id="M005",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Montaje aprobado.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await facility_agent.execute_event_setup(
            event_id="E002",
            event_name="Cena de Gala",
            facility_id=facility.id,
            facility_name="Salón Principal",
            setup_date="2026-08-10",
            coordinator_member_id="M005",
        )

        assert execute_result["status"] == "success"
        assert execute_result["setup"]["event_name"] == "Cena de Gala"

        # Verify facility set to reserved
        updated_facility = await facility_repo.get_facility(facility.id)
        assert updated_facility.status == FacilityStatus.RESERVED

    @pytest.mark.asyncio
    async def test_setup_missing_fields(self, facility_agent):
        result = await facility_agent.coordinate_event_setup(
            event_id="E001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 4: get_facility_occupancy
# ══════════════════════════════════════════════════════


class TestGetFacilityOccupancy:

    @pytest.mark.asyncio
    async def test_occupancy_empty(self, facility_agent):
        result = await facility_agent.get_facility_occupancy()
        assert result["status"] == "success"
        assert result["occupancy"] == []

    @pytest.mark.asyncio
    async def test_occupancy_with_data(
        self, facility_agent, facility_repo
    ):
        await _seed_facility(facility_repo, name="Piscina")
        await _seed_facility(
            facility_repo,
            name="Gimnasio",
            facility_type=FacilityType.GYM,
        )

        result = await facility_agent.get_facility_occupancy()
        assert result["status"] == "success"
        assert len(result["occupancy"]) == 2

    @pytest.mark.asyncio
    async def test_occupancy_filter_type(
        self, facility_agent, facility_repo
    ):
        await _seed_facility(facility_repo, name="Piscina")
        await _seed_facility(
            facility_repo,
            name="Gimnasio",
            facility_type=FacilityType.GYM,
        )

        result = await facility_agent.get_facility_occupancy(
            facility_type="pool"
        )
        assert result["status"] == "success"
        assert len(result["occupancy"]) == 1
        assert result["occupancy"][0]["facility_name"] == "Piscina"

    @pytest.mark.asyncio
    async def test_occupancy_invalid_type(self, facility_agent):
        result = await facility_agent.get_facility_occupancy(
            facility_type="volcano"
        )
        assert result["status"] == "error"
        assert "Tipo no válido" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 5: manage_inspections
# ══════════════════════════════════════════════════════


class TestManageInspections:

    @pytest.mark.asyncio
    async def test_list_empty(self, facility_agent):
        result = await facility_agent.manage_inspections(action="list")
        assert result["status"] == "success"
        assert result["inspections"] == []

    @pytest.mark.asyncio
    async def test_create_success(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.manage_inspections(
            action="create",
            facility_id=facility.id,
            facility_name="Piscina Principal",
            result="pass",
            inspector_member_id="M010",
            inspection_date="2026-05-14",
            findings="Todo en orden",
        )

        assert result["status"] == "success"
        assert "pass" in result["message"]

    @pytest.mark.asyncio
    async def test_create_with_issues(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.manage_inspections(
            action="create",
            facility_id=facility.id,
            facility_name="Piscina Principal",
            result="minor_issues",
            inspector_member_id="M010",
            inspection_date="2026-05-14",
            findings="Rejillas de drenaje desgastadas",
            corrective_actions="Cambiar rejillas,Verificar presión",
        )

        assert result["status"] == "success"
        assert "minor_issues" in result["message"]
        assert result["inspection"]["corrective_actions"] == [
            "Cambiar rejillas", "Verificar presión"
        ]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, facility_agent):
        result = await facility_agent.manage_inspections(
            action="create",
            facility_id="F001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_result(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.manage_inspections(
            action="create",
            facility_id=facility.id,
            facility_name="Piscina",
            result="explosion",
            inspector_member_id="M010",
            inspection_date="2026-05-14",
        )
        assert result["status"] == "error"
        assert "Resultado no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)
        inspection = await _seed_inspection(
            facility_repo, facility.id, "Piscina Principal"
        )

        result = await facility_agent.manage_inspections(
            action="get", inspection_id=inspection.id
        )
        assert result["status"] == "success"
        assert result["inspection"]["result"] == "pass"

    @pytest.mark.asyncio
    async def test_get_not_found(self, facility_agent):
        result = await facility_agent.manage_inspections(
            action="get", inspection_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_with_data(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)
        await _seed_inspection(
            facility_repo, facility.id, "Piscina Principal"
        )
        await _seed_inspection(
            facility_repo,
            facility.id,
            "Piscina Principal",
            result=InspectionResult.MINOR_ISSUES,
        )

        result = await facility_agent.manage_inspections(action="list")
        assert result["status"] == "success"
        assert len(result["inspections"]) == 2

    @pytest.mark.asyncio
    async def test_invalid_action(self, facility_agent):
        result = await facility_agent.manage_inspections(action="dance")
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 6: report_facility_issue
# ══════════════════════════════════════════════════════


class TestReportFacilityIssue:

    @pytest.mark.asyncio
    async def test_report_success(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.report_facility_issue(
            facility_id=facility.id,
            facility_name="Piscina Principal",
            description="Filtración de agua en el vestidor",
            reported_by="M015",
            priority="high",
        )

        assert result["status"] == "success"
        assert "reportado" in result["message"].lower()
        assert result["maintenance"]["maintenance_type"] == "corrective"
        assert result["maintenance"]["priority"] == "high"

    @pytest.mark.asyncio
    async def test_report_resolves_facility_name(
        self, facility_agent, facility_repo
    ):
        facility = await _seed_facility(facility_repo, name="Spa Deluxe")

        result = await facility_agent.report_facility_issue(
            facility_id=facility.id,
            description="Aire acondicionado no funciona",
            reported_by="M020",
        )

        assert result["status"] == "success"
        assert "Spa Deluxe" in result["maintenance"]["facility_name"]

    @pytest.mark.asyncio
    async def test_report_missing_fields(self, facility_agent):
        result = await facility_agent.report_facility_issue(
            facility_id="F001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_report_invalid_priority(self, facility_agent, facility_repo):
        facility = await _seed_facility(facility_repo)

        result = await facility_agent.report_facility_issue(
            facility_id=facility.id,
            description="Test",
            reported_by="M001",
            priority="armageddon",
        )
        assert result["status"] == "error"
        assert "Prioridad no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 7: get_maintenance_schedule
# ══════════════════════════════════════════════════════


class TestGetMaintenanceSchedule:

    @pytest.mark.asyncio
    async def test_schedule_empty(self, facility_agent):
        result = await facility_agent.get_maintenance_schedule()
        assert result["status"] == "success"
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_schedule_with_data(
        self, facility_agent, facility_repo
    ):
        facility = await _seed_facility(facility_repo)
        await _seed_maintenance(
            facility_repo,
            facility.id,
            "Piscina Principal",
            scheduled_date="2026-07-01",
        )
        await _seed_maintenance(
            facility_repo,
            facility.id,
            "Piscina Principal",
            scheduled_date="2026-06-15",
            description="Revisión mensual",
        )

        result = await facility_agent.get_maintenance_schedule()
        assert result["status"] == "success"
        assert result["total"] == 2
        # Sorted by date
        assert result["schedule"][0]["scheduled_date"] == "2026-06-15"

    @pytest.mark.asyncio
    async def test_schedule_filter_status(
        self, facility_agent, facility_repo
    ):
        facility = await _seed_facility(facility_repo)
        await _seed_maintenance(
            facility_repo, facility.id, "Piscina Principal"
        )

        result = await facility_agent.get_maintenance_schedule(
            status="completed"
        )
        assert result["status"] == "success"
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_schedule_invalid_status(self, facility_agent):
        result = await facility_agent.get_maintenance_schedule(
            status="kaboom"
        )
        assert result["status"] == "error"
        assert "Estado no válido" in result["message"]
