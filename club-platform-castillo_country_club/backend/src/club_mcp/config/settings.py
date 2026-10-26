"""
Application settings. Loaded from environment variables.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration for Castillo Country Club MCP Server."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Club ──────────────────────────────────────────────
    club_name: str = "castillo_country_club"
    club_env: str = "development"

    # ── Database ──────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://club_user:club_pass@localhost:5432/club_db"

    # ── Redis ─────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Ollama (Local LLM) ────────────────────────────────
    ollama_host: str = "http://localhost:11434"
    ollama_fast_model: str = "qwen2.5:7b"
    ollama_smart_model: str = "qwen2.5:32b"

    # ── Auth / JWT ────────────────────────────────────────
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # ── Cloud AI Fallback (Optional) ──────────────────────
    cloud_ai_enabled: bool = False
    cloud_ai_api_key: str = ""

    # ── Helpers ───────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.club_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.club_env == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Get cached application settings.

    Returns:
        Settings: Singleton instance of application configuration.
    """
    return Settings()