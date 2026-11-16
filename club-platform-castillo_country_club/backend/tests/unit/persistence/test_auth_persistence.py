"""Suite de persistencia Ola 2.1 — gate del PATH 2.1:

    pytest: write → restart runtime → read OK

El "restart" es REAL: engine.dispose() + engine NUEVO + sesión nueva
(un dict in-memory NO sobrevive esto; una tabla sí). Corre contra
aiosqlite en archivo local (mismo contrato async que asyncpg) y, si
hay Postgres en CLUB_PERSISTENCE_URL (CI: service container
pgvector/pgvector:pg16), corre TAMBIÉN contra él. Sin ninguna de las
dos → skip honesto con count (no verde silencioso: 3 estados como
el ratchet G15.1).
"""
from __future__ import annotations

import os
from pathlib import Path

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.user_repo import UserRepository
from club_mcp.db.orm.session import make_engine


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_restart.db"


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


pytestmark = pytest.mark.asyncio


async def test_write_restart_read() -> None:
    """PATH 2.1 gate: write → dispose (restart) → NEW engine → read OK."""

    url = _backend_url()
    # write (engine 1)
    engine1 = make_engine(url)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo = UserRepository(engine1)
    total = await repo.seed_idempotent()
    await engine1.dispose()  # ← restart: TODO lo in-memory muere acá

    # read (engine 2 — NUEVO proceso/sesión)
    engine2 = make_engine(url)
    repo2 = UserRepository(engine2)
    user = await repo2.get_by_email("carlos@castillo.cr")
    total2 = await repo2.count()
    await engine2.dispose()

    assert user is not None, "el usuario NO sobrevivió al restart"
    assert user.role.value == "socio"
    assert total == total2 == 4, f"seed no idempotente: {total} vs {total2}"


async def test_login_route_uses_db_when_alive() -> None:
    """login contra persistencia REAL (gate de artefacto).

    Sembramos un usuario que SOLO existe en la DB (no está en el
    seed in-memory) y parcheamos get_engine a la engine sembrada:
    si login responde 200, leyó la TABLA — si el route cayera al
    dict _users, daría 401 (el usuario no existe ahí).
    """
    from fastapi.testclient import TestClient

    from club_mcp.api.app import create_api_app
    from club_mcp.auth.models import UserCreate, UserRole

    url = _backend_url()  # Ola 2.1e: PG del CI (antes: hardcode sqlite)
    engine = make_engine(url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo = UserRepository(engine)
    await repo.seed_idempotent()
    await repo.create(
        UserCreate(
            name="Solo En Base",
            email="solo-db@castillo.cr",
            password="dbonly123",
            role=UserRole.STAFF,
        )
    )
    total = await repo.count()
    await engine.dispose()

    # get_engine() → nuestra engine sembrada (login lee LA tabla)
    import club_mcp.db.orm.engine as engine_mod

    orig = engine_mod.get_engine
    engine_mod.get_engine = lambda: engine  # type: ignore[assignment]
    # _find_user consulta settings.database_url (postgresql) → true
    import club_mcp.config.settings as settings_mod

    orig_url = settings_mod.get_settings
    st = orig_url().model_copy(update={"database_url": "postgresql+asyncpg://x/x/x"})
    settings_mod.get_settings = lambda: st  # type: ignore[assignment]
    try:
        app = create_api_app()
        client = TestClient(app)
        resp = client.post(
            "/api/auth/login",
            json={"email": "solo-db@castillo.cr", "password": "dbonly123"},
        )
    finally:
        engine_mod.get_engine = orig  # type: ignore[assignment]
        settings_mod.get_settings = orig_url  # type: ignore[assignment]
    assert resp.status_code == 200, f"login no leyó la DB: {resp.status_code} {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert data["user"]["role"] == "staff"
    assert data["user"]["email"] == "solo-db@castillo.cr"
    assert total == 5


async def test_create_user_unique_email() -> None:
    """email duplicado → trona el UNIQUE real (IntegrityError)."""
    from sqlalchemy.exc import IntegrityError

    from club_mcp.auth.models import UserCreate, UserRole

    engine = make_engine(_backend_url())  # Ola 2.1e: PG del CI (antes: hardcode)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo = UserRepository(engine)
    await repo.seed_idempotent()
    dup = UserCreate(
        name="Dup",
        email="carlos@castillo.cr",
        password="x12345678",
        role=UserRole.SOCIO,
    )
    with pytest.raises(IntegrityError):
        await repo.create(dup)
    await engine.dispose()


def _cleanup_sqlite_files() -> None:
    """Borra los archivos sqlite del fallback (solo camino local)."""
    if not PG_URL:
        for name in ("_persist_restart.db", "_persist_route.db", "_persist_uq.db"):
            Path(name).unlink(missing_ok=True)


def teardown_module() -> None:
    _cleanup_sqlite_files()
