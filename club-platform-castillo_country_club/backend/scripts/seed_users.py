"""Seed CLI de users — PATH Ola 2.1: "usuarios seed → tabla + script seed".

    python scripts/seed_users.py [--url ...]

Corre alembic upgrade head (SI hay URL postgres) y SIEMBRA los 4
demo users de forma idempotente. Correrlo dos veces seguidas deja
el MISMO conteo (4): esa es la prueba del PATH — "seed → tabla +
script seed" (NEXT-STEPS 2.1).

--url por defecto: settings.database_url. Sin Postgres disponible y
sin --url explícito, sale 2 con mensaje claro (no asume nada).
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR / "src"))


async def _run(url: str) -> int:
    from club_mcp.db.orm.engine import get_engine
    from club_mcp.db.orm.repositories.user_repo import UserRepository
    from club_mcp.db.orm.session import make_engine

    from club_mcp.db.orm.base import Base
    from club_mcp.db.orm import users_orm  # noqa: F401 — registra la tabla

    engine = make_engine(url) if url else get_engine()
    # schema idempotente: create_all SOLO crea lo que falta (la fuente
    # de verdad canónica es alembic — esto es el arranque de dev/seed)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo = UserRepository(engine)
    try:
        total = await repo.seed_idempotent()
        print(f"seed OK: {total} users (idempotente — re-run = mismo conteo)")
        return 0
    finally:
        await engine.dispose()


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed users (idempotente)")
    ap.add_argument("--url", default="", help="database URL (default: settings)")
    args = ap.parse_args()
    try:
        return asyncio.run(_run(args.url))
    except Exception as exc:  # CLI: mensaje claro y exit != 0
        print(f"seed FAIL: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
