"""Tests for auth routes: login, refresh, me."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from club_mcp.api.app import create_api_app
from club_mcp.auth.jwt_service import create_token_pair


@pytest.fixture
def client():
    app = create_api_app()
    return TestClient(app)


@pytest.fixture
def admin_access_token():
    return create_token_pair("admin_001", "admin", "Gerente").access_token


class TestLogin:
    def test_login_success_socio(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "carlos@castillo.cr", "password": "admin123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["user"]["role"] == "socio"
        assert "tokens" in data

    def test_login_success_admin(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "gerente@castillo.cr", "password": "admin123"},
        )
        assert resp.status_code == 200
        assert resp.json()["user"]["role"] == "admin"

    def test_login_wrong_password(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "carlos@castillo.cr", "password": "wrong"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "x"},
        )
        assert resp.status_code == 401


class TestRefresh:
    def test_refresh_success(self, client):
        # First login
        login_resp = client.post(
            "/api/auth/login",
            json={"email": "carlos@castillo.cr", "password": "admin123"},
        )
        refresh_token = login_resp.json()["tokens"]["refresh_token"]

        resp = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert resp.status_code == 200
        assert "tokens" in resp.json()

    def test_refresh_invalid_token(self, client):
        resp = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )
        assert resp.status_code == 401


class TestMe:
    def test_me_with_valid_token(self, client, admin_access_token):
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {admin_access_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "admin"

    def test_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401  # ← era 403

