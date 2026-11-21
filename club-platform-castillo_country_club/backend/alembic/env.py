"""Alembic env — Ola 2.1: async + settings + naming determinista.

URL: ALEMBIC_DATABASE_URL > settings.database_url. offline (--sql)
renderiza contra el dialecto de la URL; online corre async contra
Postgres. target_metadata = Base.metadata de TODAS las tablas
(importa users_orm — y las que vengan: cada ola nueva las suma acá).
"""
from __future__ import annotations

import asyncio
import os
from logging.config import fileConfig
from typing import TYPE_CHECKING

from alembic import context
from sqlalchemy import pool

from club_mcp.config.settings import get_settings
from club_mcp.db.orm import users_orm  # noqa: F401 — registra la tabla en Base
from club_mcp.db.orm.base import Base

if TYPE_CHECKING:
    from sqlalchemy.engine import Connection

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    return os.environ.get("ALEMBIC_DATABASE_URL", get_settings().database_url)


def run_migrations_offline() -> None:
    """--sql: render sin DB (el gate V2/V3 del sandbox — DDL puro)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_database_url(), poolclass=pool.NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
