"""Suite de persistencia Ola 2.1-bis — gate del vertical family:

    pytest: write → restart runtime → read OK

Misma mecánica de la suite auth (Ola 2.1): el "restart" es REAL
(engine.dispose() + engine NUEVO + sesión nueva — un dict
in-memory NO sobrevive esto; una tabla sí) · RE-RUNNABLE
(Ola 2.1f): _reset_backend() antes de cada test.

Además — el gate de CONTRATO: los 50 tests del agente family
(tests/unit/agents/test_family_agent.py) corren contra el repo
in-memory; este archivo verifica que el repo ORM cumple el mismo
contrato (mismos métodos · mismas excepciones · mismos tipos de
salida), comparando comportamiento observable entre ambas
implementaciones sobre el MISMO dataset demo (demo_families):
si el in-memory y el ORM divergen, esta suite lo grita.
"""
from __future__ import annotations

import os
from datetime import date
from uuid import uuid4

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.family_orm import MemberORM
from club_mcp.db.orm.repositories.family_repo import FamilyRepository
from club_mcp.db.orm.session import make_engine
from club_mcp.db.repositories.family_repo import (
    DuplicateFamilyError,
    FamilyNotFoundError,
    demo_families,
)
from club_mcp.models.family import (
    FamilyCreate,
    FamilySearchParams,
    MembershipTier,
)
from club_mcp.models.member import MemberCreate


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_family.db"


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


pytestmark = pytest.mark.asyncio


async def _make_repo() -> tuple[FamilyRepository, object]:
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return FamilyRepository(engine), engine


async def test_family_write_restart_read() -> None:
    """PATH 2.1-bis gate: write → dispose (restart) → NEW engine → read."""
    await _reset_backend()
    url = _backend_url()
    # write (engine 1) — familia que SOLO existe en la tabla
    engine1 = make_engine(url)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo1 = FamilyRepository(engine1)
    created = await repo1.create_family(
        FamilyCreate(
            name="Familia Prueba Restart",
            tier=MembershipTier.PREMIUM,
            email="restart@castillo.cr",
            phone="+50699990000",
            members=[
                MemberCreate(name="Miembro Uno", date_of_birth=date(1990, 1, 1), role="primary"),
            ],
        )
    )
    await repo1.add_activity(
        created.id,
        {"event_name": "Actividad Pre-Restart", "event_date": "2026-11-16",
         "event_type": "event", "members_attended": ["Miembro Uno"]},
    )
    await engine1.dispose()  # ← restart: TODO lo in-memory muere acá

    # read (engine 2 — NUEVO proceso/sesión)
    engine2 = make_engine(url)
    repo2 = FamilyRepository(engine2)
    family = await repo2.get_family_by_email("restart@castillo.cr")
    activities = await repo2.get_activity_history(created.id)
    await engine2.dispose()

    assert family is not None, "la familia NO sobrevivió al restart"
    assert family.name == "Familia Prueba Restart"
    assert family.tier == MembershipTier.PREMIUM
    assert family.member_count == 1
    assert family.engagement_score == 50
    assert [a["event_name"] for a in activities] == ["Actividad Pre-Restart"], (
        "las activities (JSONB) NO sobrevivieron al restart"
    )


async def test_family_member_fk_and_remove() -> None:
    """members viven en su tabla con FK; remove_member los baja de verdad."""
    await _reset_backend()
    repo, engine = await _make_repo()
    fam = await repo.create_family(
        FamilyCreate(
            name="Familia Miembros",
            tier=MembershipTier.BASIC,
            email="miembros@castillo.cr",
            phone="+50699991111",
            members=[
                MemberCreate(name="Alpha", date_of_birth=date(1980, 1, 1), role="primary"),
                MemberCreate(name="Beta", date_of_birth=date(1982, 2, 2), role="spouse"),
            ],
        )
    )
    added = await repo.add_member(
        fam.id,
        MemberCreate(name="Gamma", date_of_birth=date(2015, 3, 3), role="child"),
    )
    assert (await repo.get_members(fam.id)).__len__() == 3

    ok = await repo.remove_member(added.id)
    remaining = await repo.get_members(fam.id)
    await engine.dispose()
    assert ok is True
    assert [m.name for m in remaining] == ["Alpha", "Beta"]

    # delete_family barre members (FK): la tabla queda limpia
    engine2 = make_engine(_backend_url())
    repo2 = FamilyRepository(engine2)
    assert await repo2.delete_family(fam.id) is True
    from sqlalchemy import select as _sel

    async with engine2.connect() as conn:
        n = len(
            (
                await conn.execute(_sel(MemberORM).where(MemberORM.family_id == str(fam.id)))
            ).scalars().all()
        )
        await conn.close()  # ResourceWarning: __del__ de aiosqlite (lección Q-CI-04)
    await engine2.dispose()
    assert n == 0, "members huérfanos tras delete_family"


async def test_family_duplicate_email_same_error() -> None:
    """email duplicado → DuplicateFamilyError (contrato, no IntegrityError)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    data = FamilyCreate(
        name="Familia Dup",
        tier=MembershipTier.BASIC,
        email="dup@castillo.cr",
        phone="+50699992222",
        members=[MemberCreate(name="D", date_of_birth=date(1999, 9, 9), role="primary")],
    )
    await repo.create_family(data)
    with pytest.raises(DuplicateFamilyError):
        await repo.create_family(data)
    await engine.dispose()


async def test_family_not_found_same_error() -> None:
    """familia inexistente → FamilyNotFoundError (mismo contrato)."""
    await _reset_backend()
    repo, engine = await _make_repo()
    ghost = uuid4()
    with pytest.raises(FamilyNotFoundError):
        await repo.get_preferences(ghost)
    with pytest.raises(FamilyNotFoundError):
        await repo.update_family(ghost, name="X")
    await engine.dispose()


async def test_family_seed_demo_and_search() -> None:
    """seed_demo_data idempotente + search contra el dataset compartido.

    El dataset vive UNA vez (demo_families/demo_extras del módulo
    in-memory): si el in-memory y el ORM divergen, este test lo
    grita — compara count + tier + engagement contra el plan.
    """
    await _reset_backend()
    url = _backend_url()
    engine1 = make_engine(url)
    async with engine1.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    repo1 = FamilyRepository(engine1)
    await repo1.seed_demo_data()
    n_after_1 = len(await repo1.get_all_families())
    await repo1.seed_demo_data()  # idempotencia
    n_after_2 = len(await repo1.get_all_families())
    await engine1.dispose()

    assert n_after_1 == n_after_2 == len(demo_families()) == 4, (
        f"seed no idempotente: {n_after_1} vs {n_after_2}"
    )

    # restart + read del seed
    engine2 = make_engine(url)
    repo2 = FamilyRepository(engine2)
    garcia = await repo2.get_family_by_email("garcia@castillo.cr")
    assert garcia is not None, "el seed NO sobrevivió al restart"
    assert garcia.tier == MembershipTier.VIP
    assert garcia.member_count == 4  # 4 members del plan
    assert garcia.engagement_score == 85  # extras['engagement']

    # search: tier filter + engagement_min (contrato de la 2.1-bis)
    res = await repo2.search_families(
        FamilySearchParams(tier=MembershipTier.VIP)
    )
    assert res.total == 1 and res.families[0].name == "Familia Garcia"
    # engagement_min=50: garcia 85 + rodriguez 58 (morales 45 queda fuera)
    res2 = await repo2.search_families(FamilySearchParams(engagement_min=50))
    assert res2.total == 2, f"engagement_min=50 → esperaba 2, obtuve {res2.total}"
    await engine2.dispose()


async def test_family_preferences_and_social_roundtrip() -> None:
    """JSONB roundtrip: preferences dict + social connections list."""
    await _reset_backend()
    repo, engine = await _make_repo()
    fam = await repo.create_family(
        FamilyCreate(
            name="Familia JSONB",
            tier=MembershipTier.BASIC,
            email="jsonb@castillo.cr",
            phone="+50699993333",
            members=[MemberCreate(name="J", date_of_birth=date(1975, 5, 5), role="primary")],
        )
    )
    prefs = {
        "preferred_language": "en",
        "notification_channels": ["email"],
        "interests": ["Golf"],
        "privacy_level": "private",
    }
    await repo.set_preferences(fam.id, prefs)
    await repo.add_social_connection(
        fam.id,
        {"connected_family_name": "Familia Garcia", "connection_strength": 0.5},
    )
    got_prefs = await repo.get_preferences(fam.id)
    got_social = await repo.get_social_connections(fam.id)
    await engine.dispose()
    assert got_prefs == prefs
    assert len(got_social) == 1 and got_social[0]["connection_strength"] == 0.5
