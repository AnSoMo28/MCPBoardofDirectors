"""Session factory + contexto transaccional — Ola 2.1.

Patrón: async with session_scope() as s: ... — commit al salir bien,
rollback + raise si algo tronó, dispose SIEMPRE (la lección Q-CI-04:
transports/loops sin cerrar promueven ResourceWarnings a error bajo
filterwarnings=error; el suite de persistencia cierra TODO lo que
abre).
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from club_mcp.db.orm.base import Base  # noqa: F401 — alembic target_metadata


def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Session factory para un engine dado (tests pasan el suyo)."""
    return async_sessionmaker(engine, expire_on_commit=False)


@asynccontextmanager
async def session_scope(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Transacción: commit / rollback+raise / close garantizados."""
    factory = session_factory(engine)
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def make_engine(url: str) -> AsyncEngine:
    """Engine explícito para un URL dado (tests/seed — sqlite o postgres)."""
    return create_async_engine(url, pool_pre_ping=True)
