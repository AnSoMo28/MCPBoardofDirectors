"""Tests for agent tool proxy routes."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from club_mcp.agents.satisfaction_agent import SatisfactionAgent
from club_mcp.api.app import create_api_app
from club_mcp.auth.jwt_service import create_token_pair
from club_mcp.db.repositories.satisfaction_repo import SatisfactionRepository
from club_mcp.hitl.approval_engine import ApprovalEngine


@pytest.fixture
def satisfaction_repo():
    return SatisfactionRepository()


@pytest.fixture
def app_with_satisfaction(satisfaction_repo):
    engine = ApprovalEngine()
    agent = SatisfactionAgent(repo=satisfaction_repo, approval_engine=engine)
    return create_api_app(agents_list=[agent])


@pytest.fixture
def client(app_with_satisfaction):
    return TestClient(app_with_satisfaction)


@pytest.fixture
def socio_token():
    return create_token_pair("socio_001", "socio", "Carlos", "fam_001").access_token


@pytest.fixture
def admin_token():
    return create_token_pair("admin_001", "admin", "Gerente").access_token


class TestCallAgentTool:
    def test_call_tool_success(self, client, admin_token):
        resp = client.post(
            "/api/agents/satisfaction/get_satisfaction_questions",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"params": {}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert len(data["questions"]) == 10

    def test_call_tool_insufficient_permission(self, client, socio_token):
        resp = client.post(
            "/api/agents/satisfaction/analyze_event_satisfaction",
            headers={"Authorization": f"Bearer {socio_token}"},
            json={"params": {"event_id": "evt_001"}},
        )
        assert resp.status_code == 403

    def test_call_tool_nonexistent_agent(self, client, admin_token):
        resp = client.post(
            "/api/agents/fake_agent/some_tool",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"params": {}},
        )
        assert resp.status_code == 404

    def test_call_tool_nonexistent_tool(self, client, admin_token):
        resp = client.post(
            "/api/agents/satisfaction/fake_tool",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"params": {}},
        )
        assert resp.status_code == 404

    def test_call_without_auth(self, client):
        resp = client.post(
            "/api/agents/satisfaction/get_satisfaction_questions",
            json={"params": {}},
        )
        assert resp.status_code == 401  # ← era 403

