"""
Application settings. Loaded from environment variables.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Secretos placeholder conocidos del árbol — NUNCA válidos en production.
_INSECURE_JWT_SECRETS: frozenset[str] = frozenset({
    "change-me-in-production",
    "castillo-country-club-dev-secret-key-change-in-production",
    "dev-only-insecure-jwt-secret-do-not-use-in-production",
})


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
    # Q-SEC-01 (Ola 1.1): el default inseguro solo sobrevive en
    # desarrollo — production RECHAZA arrancar con secretos placeholder
    # (validator abajo). Nunca más un HS256 firmado con un literal
    # conocido por el repo público.
    # 48 bytes: HS256 exige >=32 (RFC 7518) — pyjwt>=2.10 lanza
    # InsecureKeyLengthWarning si es más corto, y filterwarnings=error
    # de la casa lo promueve. Sigue siendo placeholder (production lo
    # rechaza por denylist); ahora también es criptográficamente
    # válido para el dev loop.
    jwt_secret_key: str = "dev-only-insecure-jwt-secret-do-not-use-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # ── Cloud AI Fallback (Optional) ──────────────────────
    # Q-SEC-02 (Ola 1.1): cloud_ai_enabled=True SIN api_key real es
    # configuración rota — production lo rechaza; desarrollo loguea y
    # deshabilita el fallback en silencio (no puede "medio funcionar").
    cloud_ai_enabled: bool = False
    cloud_ai_api_key: str = ""

    # ── Security validation (Ola 1.1) ─────────────────────
    @model_validator(mode="after")
    def _reject_insecure_production(self) -> Settings:
        """Fail-fast: production sin secretos reales NO arranca.

        Ola 1.1 · Q-SEC-01/02 — el gate es de ARTEFACTO: sin esto, un
        deploy con defaults arranca feliz y firma tokens con un secreto
        publicado en el repo público.
        """
        if self.is_production:
            insecure = (
                not self.jwt_secret_key
                or self.jwt_secret_key in _INSECURE_JWT_SECRETS
            )
            if insecure:
                raise ValueError(
                    "club_env=production exige JWT_SECRET_KEY real: "
                    f"'{self.jwt_secret_key}' es placeholder/vacío. "
                    "Exportá JWT_SECRET_KEY (o .env) antes de arrancar."
                )
            if self.cloud_ai_enabled and not self.cloud_ai_api_key:
                raise ValueError(
                    "cloud_ai_enabled=True exige CLOUD_AI_API_KEY en "
                    "production — fallback deshabilitado no es opcional."
                )
        return self

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
