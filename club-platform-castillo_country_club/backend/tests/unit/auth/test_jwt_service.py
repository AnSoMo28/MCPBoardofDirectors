"""Tests for JWT token creation and verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest

from club_mcp.auth.jwt_service import (
    _ALGORITHM,
    _SECRET_KEY,
    TokenPayload,
    TokenPair,
    create_token_pair,
    verify_token,
)


class TestCreateTokenPair:
    def test_creates_valid_pair(self):
        pair = create_token_pair("user_001", "admin", "Gerente", "fam_001")
        assert isinstance(pair, TokenPair)
        assert pair.access_token
        assert pair.refresh_token
        assert pair.token_type == "bearer"
        assert pair.expires_in == 900

    def test_access_token_contains_claims(self):
        pair = create_token_pair("user_001", "admin", "Gerente", "fam_001")
        payload = pyjwt.decode(
            pair.access_token, _SECRET_KEY, algorithms=[_ALGORITHM]
        )
        assert payload["sub"] == "user_001"
        assert payload["role"] == "admin"
        assert payload["name"] == "Gerente"
        assert payload["family_id"] == "fam_001"
        assert payload["type"] == "access"

    def test_refresh_token_type_is_refresh(self):
        pair = create_token_pair("u1", "socio", "Carlos")
        payload = pyjwt.decode(
            pair.refresh_token, _SECRET_KEY, algorithms=[_ALGORITHM]
        )
        assert payload["type"] == "refresh"

    def test_without_family_id(self):
        pair = create_token_pair("staff_001", "staff", "Maria")
        payload = pyjwt.decode(
            pair.access_token, _SECRET_KEY, algorithms=[_ALGORITHM]
        )
        assert payload["family_id"] is None


class TestVerifyToken:
    def test_valid_access_token(self):
        pair = create_token_pair("user_001", "admin", "Gerente", "fam_001")
        result = verify_token(pair.access_token)
        assert isinstance(result, TokenPayload)
        assert result.sub == "user_001"
        assert result.role == "admin"

    def test_valid_refresh_token(self):
        pair = create_token_pair("u1", "socio", "Carlos")
        result = verify_token(pair.refresh_token, expected_type="refresh")
        assert result.sub == "u1"

    def test_wrong_type_raises(self):
        pair = create_token_pair("u1", "socio", "Carlos")
        with pytest.raises(pyjwt.InvalidTokenError):
            verify_token(pair.access_token, expected_type="refresh")

    def test_expired_token_raises(self):
        now = datetime.now(tz=timezone.utc)
        payload = {
            "sub": "u1",
            "role": "socio",
            "name": "Carlos",
            "family_id": None,
            "type": "access",
            "exp": int((now - timedelta(hours=1)).timestamp()),
            "iat": int(now.timestamp()),
        }
        token = pyjwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)
        with pytest.raises(pyjwt.ExpiredSignatureError):
            verify_token(token)

    def test_invalid_token_raises(self):
        with pytest.raises(pyjwt.DecodeError):
            verify_token("invalid.token.here")

    def test_tampered_token_raises(self):
        pair = create_token_pair("u1", "admin", "Gerente")
        tampered = pair.access_token[:-5] + "XXXXX"
        with pytest.raises(Exception):
            verify_token(tampered)
