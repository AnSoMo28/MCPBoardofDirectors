"""Tests for the health endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from club_mcp.api.app import create_api_app


@pytest.fixture
def client():
    app = create_api_app()
    return TestClient(app)


class TestHealth:
    def test_health_returns_200(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_contains_fields(self, client):
        data = client.get("/api/health").json()
        assert data["status"] == "healthy"
        assert data["service"] == "Castillo Country Club API"
        assert "agents_count" in data
        assert "tools_count" in data

    def test_health_with_no_agents(self, client):
        data = client.get("/api/health").json()
        assert data["agents_count"] == 0
