"""Engine async lazy — Ola 2.1.

0 consumidores de DATABASE_URL existían (recon Ola 2: "sin
referencias"). Este módulo es el primero. LAZY de verdad: el engine
se crea en la PRIMERA llamada a get_engine(), nunca al importar —
así los 846 tests existentes (TestClient, sin Postgres) siguen
verdes sin tocar una sola línea suya, y la suite de persistencia
(que SÍ quiere DB) lo crea explícitamente.
"""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from club_mcp.config.settings import get_settings


@lru_cache(maxsize=1)
def get_engine() -> AsyncEngine:
    """Engine async singleton (asyncpg). Crear al usar, no al importar."""
    settings = get_settings()
    return create_async_engine(settings.database_url, pool_pre_ping=True)
