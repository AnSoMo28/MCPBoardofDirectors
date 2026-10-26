"""Tests for password hashing and verification."""

from __future__ import annotations

from club_mcp.auth.password_service import hash_password, verify_password


class TestHashPassword:
    def test_returns_string(self):
        result = hash_password("test123")
        assert isinstance(result, str)

    def test_different_hashes_for_same_input(self):
        h1 = hash_password("test123")
        h2 = hash_password("test123")
        assert h1 != h2

    def test_hash_starts_with_bcrypt_prefix(self):
        h = hash_password("test123")
        assert h.startswith("$2b$")


class TestVerifyPassword:
    def test_correct_password(self):
        hashed = hash_password("admin123")
        assert verify_password("admin123", hashed) is True

    def test_wrong_password(self):
        hashed = hash_password("admin123")
        assert verify_password("wrong_password", hashed) is False

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("not_empty", hashed) is False

    def test_unicode_password(self):
        plain = "castillo_🏰_2026"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed) is True
