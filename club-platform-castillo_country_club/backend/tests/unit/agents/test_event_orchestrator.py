"""Tests for EventOrchestratorAgent."""

from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta

from club_mcp.agents.event_orchestrator import EventOrchestratorAgent
from club_mcp.db.repositories.event_repo import EventRepository
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.hitl.approval_types import ApprovalLevel, ApprovalStatus
from club_mcp.models.event import (
    EventCategory,
    EventCreate,
    EventSearchParams,
    EventStatus,
    RSVPStatus,
    VendorContractStatus,
)
from uuid import UUID

# ── Helpers & Fixtures ────────────────────────────────────


class MockNotifier:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    async def notify_admin(self, **kwargs: object) -> None:
        self.calls.append(kwargs)


@pytest.fixture
def event_repo() -> EventRepository:
    return EventRepository()


@pytest.fixture
def notifier() -> MockNotifier:
    return MockNotifier()


@pytest.fixture
def event_agent(
    event_repo: EventRepository,
    approval_engine: ApprovalEngine,
    notifier: MockNotifier,
) -> EventOrchestratorAgent:
    return EventOrchestratorAgent(event_repo, approval_engine, notifier)


def _fiesta_data() -> dict:
    return {
        "title": "Fiesta de Fin de Año",
        "description": "La celebración más esperada",
        "category": "festive",
        "event_type": "open",
        "date_start": "2025-12-31T18:00:00",
        "date_end": "2026-01-01T02:00:00",
        "location": "Jardín Principal",
        "max_capacity": 500,
        "pricing_model": "paid",
        "price_per_person": 25000.0,
        "is_members_only": True,
        "allow_guests": True,
        "max_guests_per_family": 4,
        "requires_rsvp": True,
        "tags": ["fin-de-año", "familia"],
        "created_by": "admin_001",
    }


def _tenis_data() -> dict:
    return {
        "title": "Torneo de Tenis Familiar",
        "description": "Torneo abierto",
        "category": "sports",
        "event_type": "open",
        "date_start": "2025-12-28T09:00:00",
        "date_end": "2025-12-28T17:00:00",
        "location": "Canchas de Tenis",
        "max_capacity": 100,
        "pricing_model": "free",
        "is_members_only": True,
        "requires_rsvp": True,
        "tags": ["tenis", "torneo"],
    }


def _create_and_publish(repo: EventRepository, data: dict) -> str:
    ev = repo.create_event(EventCreate(**data))
    repo.update_event(ev.id, {"status": EventStatus.PUBLISHED.value})
    return ev.id


# ══════════════════════════════════════════════════════════
# Test 1: event_create  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestEventCreate:

    @pytest.mark.asyncio
    async def test_returns_pending_approval(self, event_agent):
        res = await event_agent.event_create(_fiesta_data())
        assert res["status"] == "pending_approval"
        assert "request_id" in res
        assert res["event_title"] == "Fiesta de Fin de Año"

    @pytest.mark.asyncio
    async def test_creates_approval_request(self, event_agent):
        res = await event_agent.event_create(_fiesta_data())
        pending = await event_agent.approval_engine.get_pending()
        assert len(pending) >= 1
        assert any(str(r.request_id) == str(res["request_id"]) for r in pending)

    @pytest.mark.asyncio
    async def test_invalid_data_returns_error(self, event_agent):
        res = await event_agent.event_create({"title": "Missing required fields"})
        assert res["status"] == "error"
        assert "inválidos" in res["message"]

    @pytest.mark.asyncio
    async def test_execute_creates_and_approves(self, event_agent):
        res = await event_agent.execute_event_create(_fiesta_data())
        assert res["status"] == "success"
        event = event_agent.event_repo.get_event(res["data"]["id"])
        assert event is not None
        assert event.status == EventStatus.APPROVED
        assert event.title == "Fiesta de Fin de Año"

    @pytest.mark.asyncio
    async def test_warm_message_with_emoji(self, event_agent):
        res = await event_agent.event_create(_fiesta_data())
        assert "🎉" in res["message"]
        assert "🔔" in res["message"]


# ══════════════════════════════════════════════════════════
# Test 2: event_build_program  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestBuildProgram:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_adds_program_items(self, event_agent, event_id):
        items = [
            {"title": "Recepción", "time_start": "18:00", "time_end": "19:00"},
            {"title": "Cena", "time_start": "19:00", "time_end": "21:00"},
            {"title": "Baile", "time_start": "21:00", "time_end": "02:00"},
        ]
        res = await event_agent.event_build_program(event_id, items)
        assert res["status"] == "success"
        assert res["total_items"] == 3

    @pytest.mark.asyncio
    async def test_replaces_existing(self, event_agent, event_id):
        items1 = [{"title": "A", "time_start": "10:00", "time_end": "11:00"}]
        items2 = [{"title": "B", "time_start": "12:00", "time_end": "13:00"}]
        await event_agent.event_build_program(event_id, items1)
        res = await event_agent.event_build_program(event_id, items2, replace_all=True)
        assert res["total_items"] == 1
        assert res["program_items"][0]["title"] == "B"

    @pytest.mark.asyncio
    async def test_nonexistent_event_returns_error(self, event_agent):
        res = await event_agent.event_build_program("fake_id", [])
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_build_program_succeeds_with_data(self, event_agent, event_id):
        res = await event_agent.event_build_program(
            event_id,
            [{"title": "Brunch", "time_start": "09:00", "time_end": "11:00"}],
        )
        assert res["status"] == "success"
        assert res["total_items"] == 1
        event = event_agent.event_repo.get_event(event_id)
        assert len(event.programs) == 1


# ══════════════════════════════════════════════════════════
# Test 3: event_manage_rsvps  🟢 AUTO / 🔴 HITL
# ══════════════════════════════════════════════════════════


class TestManageRSVPs:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_add_rsvp(self, event_agent, event_id):
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="fam_001", member_ids=["m1", "m2", "m3"], guests_count=1,
        )
        assert res["status"] == "success"
        assert res["data"]["family_id"] == "fam_001"
        assert res["data"]["status"] == "confirmed"

    @pytest.mark.asyncio
    async def test_add_rsvp_waitlists_when_full(self, event_agent, event_repo, event_id):
        event_repo.update_event(event_id, {"max_capacity": 5})
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="fam_fill", member_ids=["a", "b", "c", "d", "e"],
        )
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="fam_overflow", member_ids=["x"],
        )
        assert res["data"]["status"] == "waitlisted"

    @pytest.mark.asyncio
    async def test_update_rsvp(self, event_agent, event_id):
        add = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="fam_002", member_ids=["m1"],
        )
        rsvp_id = add["data"]["id"]
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="update",
            rsvp_id=rsvp_id, guests_count=3,
        )
        assert res["status"] == "success"
        assert res["data"]["guests_count"] == 3

    @pytest.mark.asyncio
    async def test_remove_rsvp(self, event_agent, event_id):
        add = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="fam_003", member_ids=["m1"],
        )
        rsvp_id = add["data"]["id"]
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="remove", rsvp_id=rsvp_id,
        )
        assert res["status"] == "success"

    @pytest.mark.asyncio
    async def test_list_rsvps(self, event_agent, event_id):
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add", family_id="f1", member_ids=["m1"],
        )
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add", family_id="f2", member_ids=["m2"],
        )
        res = await event_agent.event_manage_rsvps(event_id=event_id, action="list")
        assert res["total"] == 2

    @pytest.mark.asyncio
    async def test_list_with_status_filter(self, event_agent, event_repo, event_id):
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add", family_id="f1", member_ids=["m1"],
        )
        rsvps = event_repo.list_rsvps(event_id)
        event_repo.update_rsvp(rsvps[0].id, {"status": "declined"})
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="list", new_status="declined",
        )
        assert res["total"] == 1

    @pytest.mark.asyncio
    async def test_nonexistent_event(self, event_agent):
        res = await event_agent.event_manage_rsvps(
            event_id="nope", action="add", family_id="f1", member_ids=[],
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_bulk_auto_small_batch(self, event_agent, event_id):
        bulk = [{"family_id": f"f{i}", "member_ids": [f"m{i}"]} for i in range(5)]
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add_bulk", bulk_rsvps=bulk,
        )
        assert res["status"] == "success"
        assert res["total"] == 5

    @pytest.mark.asyncio
    async def test_bulk_hitl_large_batch(self, event_agent, event_id):
        bulk = [{"family_id": f"f{i}", "member_ids": [f"m{i}"]} for i in range(15)]
        res = await event_agent.event_manage_rsvps(
            event_id=event_id, action="add_bulk", bulk_rsvps=bulk,
        )
        assert res["status"] == "pending_approval"
        assert "request_id" in res


# ══════════════════════════════════════════════════════════
# Test 4: event_coordinate_vendors  🔴 HITL
# ══════════════════════════════════════════════════════════


class TestCoordinateVendors:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_list_vendors_direct(self, event_agent, event_repo, event_id):
        event_repo.add_vendor(event_id, "Catering CR", "catering")
        res = await event_agent.event_coordinate_vendors(event_id, "list")
        assert res["status"] == "success"
        assert len(res["data"]) == 1

    @pytest.mark.asyncio
    async def test_add_vendor_pending(self, event_agent, event_id):
        res = await event_agent.event_coordinate_vendors(
            event_id, "add",
            vendor_data={
                "name": "DJ Tropical", "service_type": "entertainment",
                "contact_name": "Carlos", "quoted_cost": 500000,
            },
        )
        assert res["status"] == "pending_approval"
        assert "request_id" in res

    @pytest.mark.asyncio
    async def test_update_vendor_pending(self, event_agent, event_id):
        res = await event_agent.event_coordinate_vendors(
            event_id, "update",
            vendor_data={"quoted_cost": 600000}, vendor_id="vnd_abc",
        )
        assert res["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_remove_vendor_pending(self, event_agent, event_id):
        res = await event_agent.event_coordinate_vendors(
            event_id, "remove", vendor_id="vnd_abc",
        )
        assert res["status"] == "pending_approval"

    @pytest.mark.asyncio
    async def test_execute_add_vendor(self, event_agent, event_id):
        res = await event_agent.execute_coordinate_vendors({
            "event_id": event_id, "action": "add",
            "vendor_data": {
                "name": "Florería Jardín", "service_type": "decoration",
                "contact_name": "Ana", "quoted_cost": 200000,
            },
        })
        assert res["status"] == "success"
        assert res["data"]["name"] == "Florería Jardín"

    @pytest.mark.asyncio
    async def test_execute_approve_contract(self, event_agent, event_repo, event_id):
        vendor = event_repo.add_vendor(event_id, "Sonido Pro", "audio_visual")
        res = await event_agent.execute_coordinate_vendors({
            "event_id": event_id, "action": "approve_contract",
            "vendor_id": vendor.id,
        })
        assert res["status"] == "success"
        assert res["data"]["contract_status"] == VendorContractStatus.APPROVED.value

    @pytest.mark.asyncio
    async def test_nonexistent_event(self, event_agent):
        res = await event_agent.event_coordinate_vendors("nope", "list")
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 5: event_manage_capacity  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestManageCapacity:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_get_capacity_info(self, event_agent, event_id):
        res = await event_agent.event_manage_capacity(event_id)
        assert res["status"] == "success"
        assert res["data"]["max_capacity"] == 500
        assert res["data"]["current_attendance"] == 0

    @pytest.mark.asyncio
    async def test_update_max_capacity(self, event_agent, event_id):
        res = await event_agent.event_manage_capacity(event_id, new_max_capacity=300)
        assert res["status"] == "success"
        assert res["data"]["max_capacity"] == 300

    @pytest.mark.asyncio
    async def test_nonexistent_event(self, event_agent):
        res = await event_agent.event_manage_capacity("nope")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_reflects_rsvp_count(self, event_agent, event_id):
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add", family_id="f1", member_ids=["a", "b"],
        )
        res = await event_agent.event_manage_capacity(event_id)
        assert res["data"]["current_attendance"] == 2


# ══════════════════════════════════════════════════════════
# Test 6: event_get_analytics  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGetAnalytics:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_empty_event(self, event_agent, event_id):
        res = await event_agent.event_get_analytics(event_id)
        assert res["status"] == "success"
        assert res["data"]["total_rsvps"] == 0
        assert res["data"]["revenue"] == 0.0

    @pytest.mark.asyncio
    async def test_with_rsvps(self, event_agent, event_id):
        await event_agent.event_manage_rsvps(
            event_id=event_id, action="add",
            family_id="f1", member_ids=["m1", "m2"], guests_count=1,
        )
        res = await event_agent.event_get_analytics(event_id)
        assert res["data"]["confirmed_attendance"] == 1
        assert res["data"]["total_rsvps"] == 1
        assert res["data"]["revenue"] == 75000.0

    @pytest.mark.asyncio
    async def test_nonexistent_event(self, event_agent):
        res = await event_agent.event_get_analytics("nope")
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 7: event_clone_template  🟡 SEMI-AUTO
# ══════════════════════════════════════════════════════════


class TestCloneTemplate:

    @pytest.fixture
    def event_id(self, event_repo: EventRepository) -> str:
        return _create_and_publish(event_repo, _fiesta_data())

    @pytest.mark.asyncio
    async def test_clone_basic(self, event_agent, event_id):
        res = await event_agent.event_clone_template(
            event_id, "2026-06-15T18:00:00", "2026-06-16T02:00:00",
        )
        assert res["status"] == "success"
        cloned = res["data"]
        assert cloned["id"] != event_id
        assert cloned["status"] == EventStatus.DRAFT.value
        assert "15/06/2026" in cloned["title"]

    @pytest.mark.asyncio
    async def test_clone_preserves_program(self, event_agent, event_repo, event_id):
        event_repo.add_program_item(event_id, "Cena", "19:00", "21:00")
        res = await event_agent.event_clone_template(
            event_id, "2026-07-01T18:00:00", "2026-07-02T02:00:00",
            title_suffix="Verano",
        )
        cloned = event_agent.event_repo.get_event(res["data"]["id"])
        assert len(cloned.programs) == 1
        assert cloned.programs[0].title == "Cena"

    @pytest.mark.asyncio
    async def test_clone_nonexistent(self, event_agent):
        res = await event_agent.event_clone_template(
            "nope", "2026-01-01T00:00:00", "2026-01-02T00:00:00",
        )
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_clone_invalid_dates(self, event_agent, event_id):
        res = await event_agent.event_clone_template(event_id, "not-a-date", "also-bad")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_clone_produces_draft(self, event_agent, event_id):
        res = await event_agent.event_clone_template(
            event_id, "2026-03-01T00:00:00", "2026-03-02T00:00:00",
        )
        assert res["status"] == "success"
        assert res["data"]["status"] == EventStatus.DRAFT.value


# ══════════════════════════════════════════════════════════
# Test 8: event_get_calendar  🟢 AUTO
# ══════════════════════════════════════════════════════════


class TestGetCalendar:

    @pytest.mark.asyncio
    async def test_empty_calendar(self, event_agent):
        res = await event_agent.event_get_calendar("2025-01-01", "2025-01-07")
        assert res["status"] == "success"
        assert res["total_events"] == 0

    @pytest.mark.asyncio
    async def test_calendar_with_events(self, event_agent, event_repo):
        """Fiesta spans Dec31-Jan1 (2 days) + Tenis on Dec28 (1 day) = 3 event-days."""
        _create_and_publish(event_repo, _fiesta_data())
        _create_and_publish(event_repo, _tenis_data())
        res = await event_agent.event_get_calendar("2025-12-25", "2026-01-02")
        assert res["total_events"] == 3

    @pytest.mark.asyncio
    async def test_calendar_by_category(self, event_agent, event_repo):
        _create_and_publish(event_repo, _fiesta_data())
        _create_and_publish(event_repo, _tenis_data())
        res = await event_agent.event_get_calendar(
            "2025-12-25", "2026-01-02", category="sports",
        )
        assert res["total_events"] == 1

    @pytest.mark.asyncio
    async def test_invalid_date_format(self, event_agent):
        res = await event_agent.event_get_calendar("bad", "worse")
        assert res["status"] == "error"

    @pytest.mark.asyncio
    async def test_invalid_category(self, event_agent):
        res = await event_agent.event_get_calendar(
            "2025-01-01", "2025-01-31", category="fake",
        )
        assert res["status"] == "error"


# ══════════════════════════════════════════════════════════
# Test 9: event_generate_report  🟡 SEMI-AUTO / 🔴 HITL
# ══════════════════════════════════════════════════════════


class TestGenerateReport:

    @pytest.mark.asyncio
    async def test_executive_report(self, event_agent, event_repo):
        _create_and_publish(event_repo, _fiesta_data())
        # date_to must be after event start (Dec 31 18:00) to include it
        res = await event_agent.event_generate_report("2025-12-01", "2026-01-02")
        assert res["status"] == "success"
        assert res["data"]["total_events"] >= 1

    @pytest.mark.asyncio
    async def test_financial_report_requires_hitl(self, event_agent):
        res = await event_agent.event_generate_report(
            "2025-12-01", "2025-12-31", report_type="financial",
        )
        assert res["status"] == "pending_approval"
        assert "request_id" in res

    @pytest.mark.asyncio
    async def test_empty_period(self, event_agent):
        res = await event_agent.event_generate_report("2024-01-01", "2024-01-31")
        assert res["status"] == "success"
        assert res["data"]["total_events"] == 0

    @pytest.mark.asyncio
    async def test_execute_financial_report(self, event_agent, event_repo):
        _create_and_publish(event_repo, _fiesta_data())
        res = await event_agent.execute_generate_report_financial({
            "date_from": "2025-12-01", "date_to": "2026-01-02",
        })
        assert res["status"] == "success"

    @pytest.mark.asyncio
    async def test_report_generates_successfully(self, event_agent):
        res = await event_agent.event_generate_report("2025-12-01", "2025-12-31")
        assert res["status"] == "success"
        assert "data" in res


# ══════════════════════════════════════════════════════════
# HITL Integration Flows
# ══════════════════════════════════════════════════════════


class TestHITLFullFlow:

    @pytest.mark.asyncio
    async def test_approve_event_create_flow(self, event_agent):
        # 1. Tool → pending
        res = await event_agent.event_create(_fiesta_data())
        assert res["status"] == "pending_approval"
        req_id = res["request_id"]

        # 2. Approve (async)
        from uuid import UUID
        approved = await event_agent.approval_engine.approve(
            UUID(req_id), approved_by="admin_001",
        )
        assert approved.status == ApprovalStatus.APPROVED

        # 3. Execute post-approval
        exec_res = await event_agent.execute_event_create(approved.params["event_data"])
        assert exec_res["status"] == "success"

        # 4. Verify event exists
        event = event_agent.event_repo.get_event(exec_res["data"]["id"])
        assert event is not None
        assert event.status == EventStatus.APPROVED

    @pytest.mark.asyncio
    async def test_reject_event_create_flow(self, event_agent, event_repo):
        # 1. Tool → pending
        res = await event_agent.event_create(_fiesta_data())
        req_id = res["request_id"]

        # 2. Reject (async)
        from uuid import UUID
        rejected = await event_agent.approval_engine.reject(
            UUID(req_id), rejected_by="admin_001", reason="No disponible esa fecha",
        )
        assert rejected.status == ApprovalStatus.REJECTED

        # 3. Event should NOT exist (never created)
        events = event_repo.search_events(EventSearchParams())
        assert len(events) == 0

    @pytest.mark.asyncio
    async def test_approve_financial_report_flow(self, event_agent, event_repo):
        _create_and_publish(event_repo, _fiesta_data())

        # 1. Request financial report → HITL
        res = await event_agent.event_generate_report(
            "2025-12-01", "2026-01-02", report_type="financial",
        )
        assert res["status"] == "pending_approval"
        req_id = res["request_id"]

        # 2. Approve
        from uuid import UUID
        approved = await event_agent.approval_engine.approve(
            UUID(req_id), approved_by="admin_001",
        )

        # 3. Execute
        exec_res = await event_agent.execute_generate_report_financial(approved.params)
        assert exec_res["status"] == "success"
        assert exec_res["data"]["total_events"] >= 1
