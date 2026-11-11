"""
B4 tools — event reads + audit-driven renames.

Covers:
  * event_orchestrator.get_event / list_events (repo wrappers, AUTO)
  * registry aliases: finance.decision_simulate, age_group.activity_health,
    guest_management.insights, events → event_orchestrator agent alias
"""

from __future__ import annotations

import asyncio

import pytest

from club_mcp.agents.event_orchestrator import EventOrchestratorAgent
from club_mcp.db.repositories.event_repo import EventRepository
from club_mcp.models.event import EventCreate

def _run(coro):
    return asyncio.run(coro)


def _seed(repo: EventRepository) -> str:
    data = {
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
    ev = repo.create_event(EventCreate(**data))
    repo.create_event(
        EventCreate(
            **{
                **data,
                "title": "Torneo de Tenis Familiar",
                "category": "sports",
                "date_start": "2025-12-28T09:00:00",
                "date_end": "2025-12-28T17:00:00",
                "location": "Canchas de Tenis",
                "max_capacity": 100,
                "pricing_model": "free",
                "price_per_person": 0.0,
                "tags": ["tenis"],
            }
        )
    )
    return ev.id


def _agent():
    return EventOrchestratorAgent(EventRepository())


# ── get_event ──────────────────────────────────────────────

class TestGetEvent:
    def test_requires_event_id(self):
        assert _run(_agent().get_event(""))["status"] == "error"

    def test_not_found(self):
        assert _run(_agent().get_event("evt-x"))["status"] == "not_found"

    def test_returns_full_event(self):
        agent = _agent()
        eid = _seed(agent.event_repo)
        out = _run(agent.get_event(eid))
        assert out["status"] == "success"
        assert out["event"]["id"] == eid
        assert out["event"]["title"] == "Fiesta de Fin de Año"
        assert "date_start" in out["event"]


# ── list_events ────────────────────────────────────────────

class TestListEvents:
    def test_pagination_validation(self):
        assert _run(_agent().list_events(page=0))["status"] == "error"
        assert _run(_agent().list_events(page_size=0))["status"] == "error"

    def test_lists_all_seeded(self):
        agent = _agent()
        _seed(agent.event_repo)
        out = _run(agent.list_events())
        assert out["status"] == "success"
        assert out["total"] == 2
        assert len(out["events"]) == 2
        assert out["page"] == 1

    def test_category_filter(self):
        agent = _agent()
        _seed(agent.event_repo)
        out = _run(agent.list_events(category="sports"))
        assert out["total"] == 1
        assert out["events"][0]["title"] == "Torneo de Tenis Familiar"

    def test_invalid_category_rejected(self):
        assert _run(_agent().list_events(category="nope"))["status"] == "error"

    def test_page_window(self):
        agent = _agent()
        _seed(agent.event_repo)
        out = _run(agent.list_events(page=2, page_size=1))
        assert out["status"] == "success"
        assert len(out["events"]) == 1
        assert out["page"] == 2


# ── registry aliases (B4) ─────────────────────────────────

class TestB4Aliases:
    def test_events_agent_alias(self):
        from club_mcp.bootstrap import get_runtime

        rt = get_runtime()
        for tool in ("get_event", "list_events", "event_get_calendar"):
            r = rt.registry.resolve("events", tool)
            assert r.spec.agent == "event_orchestrator"
            assert r.via_compat

    def test_finance_decision_simulate_cross_agent(self):
        from club_mcp.bootstrap import get_runtime

        r = get_runtime().registry.resolve("finance", "decision_simulate")
        assert r.spec.agent == "advisor_intelligence"
        assert r.spec.name == "simulate_scenario"
        assert r.via_compat

    def test_age_group_health_rename(self):
        from club_mcp.bootstrap import get_runtime

        r = get_runtime().registry.resolve(
            "age_group", "get_activity_health_score"
        )
        assert r.spec.name == "get_age_group_health_score"
        assert r.via_compat

    def test_guest_insights_rename(self):
        from club_mcp.bootstrap import get_runtime

        r = get_runtime().registry.resolve(
            "guest_management", "guest_management_insights"
        )
        assert r.spec.name == "get_guest_analytics_enhanced"
        assert r.via_compat
