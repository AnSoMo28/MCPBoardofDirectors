"""Suite de persistencia Ola 2.1 — gate del PATH 2.1:

    pytest: write → restart runtime → read OK

El "restart" es REAL: engine.dispose() + engine NUEVO + sesión nueva
(un dict in-memory NO sobrevive esto; una tabla sí). RE-RUNNABLE
(Ola 2.1f): cada test RESETea el backend antes de sembrar — el env
CLUB_PERSISTENCE_URL vive a nivel JOB en el CI, así que 'pytest 846'
y el paso 'persistence' comparten el MISMO pg16 (run #15: la 2ª
corrida contra la DB sucia tronó UNIQUE users.email + seed 5≠4).
Sin CLUB_PERSISTENCE_URL (dev local) cae a aiosqlite en archivo
(mismo contrato async — aiosqlite en dev desde Ola 2.1e).
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


async def _reset_backend() -> None:
    """Re-runnable: DROP del backend antes de cada test.

    El CI comparte el pg16 del service entre 'pytest 846' y el paso
    'persistence' (env a nivel job) — sin esto, la 2ª corrida contra
    la DB sucia trona UNIQUE users.email (run #15, Ola 2.1f).
    """
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


pytestmark = pytest.mark.asyncio


async def test_write_restart_read() -> None:
    """PATH 2.1 gate: write → dispose (restart) → NEW engine → read OK."""
    await _reset_backend()  # re-runnable: DB limpia antes de escribir
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

    await _reset_backend()  # re-runnable: solo-db del run previo fuera
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
        # Ola 2.2 (WinError 32): el route login consumió la engine vía
        # session_scope — su conexión queda viva en el pool tras el
        # TestClient y Win32 no unlink un archivo con FD abierto.
        # dispose() SIEMPRE antes del teardown que borra los .db.
        await engine.dispose()
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

    await _reset_backend()  # re-runnable: seed fresco para el duplicado
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
    """Borra los archivos sqlite del fallback (solo camino local).

    Win32 no puede unlink un archivo con handle abierto (Linux sí) y
    el worker-thread de aiosqlite puede tardar un tick en soltarlo
    aunque la engine se dispuso (Ola 2.2 — WinError 32): retry corto
    con GC intercalado; si tras eso sigue vivo, NO tronar — el archivo
    es un artefacto dev del fallback sqlite, la próxima corrida hace
    DROP-all primero (_reset_backend) y el .gitignore ya lo ignora
    (G20.1). CI corre Linux/PG: este camino no existe ahí.
    """
    import gc
    import time

    if not PG_URL:
        for name in ("_persist_restart.db", "_persist_route.db", "_persist_uq.db"):
            for attempt in range(3):
                try:
                    Path(name).unlink(missing_ok=True)
                    break
                except PermissionError:
                    if attempt == 2:
                        pass  # handle Win32 retenido: artifacto dev, no gate
                    else:
                        gc.collect()
                        time.sleep(0.05)


def teardown_module() -> None:
    # sqlite local: archivos fuera (PG no necesita teardown — el
    # _reset_backend() del PRÓXIMO arranque limpia su estado; y abrir
    # un loop nuevo acá riska ResourceWarnings bajo filterwarnings=error)
    _cleanup_sqlite_files()
