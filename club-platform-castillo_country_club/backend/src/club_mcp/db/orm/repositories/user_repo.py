"""UserRepository async — el dict _users de auth.py se vuelve tabla.

Contrato (mismo que el módulo in-memory que reemplaza):

    get_by_email(email) -> User | None
    get_by_id(id)       -> User | None
    create(UserCreate) -> User            (email único — 409-like IntegrityError)
    count()             -> int
    seed_idempotent()  -> int             (los 4 demo users, INSERT si falta)

Devuelve club_mcp.auth.models.User (Pydantic): SQLAlchemy no se
filtra hacia arriba. asyncpg NO soporta ON CONFLICT — la
idempotencia es SELECT-then-INSERT por email (4 filas: la carrera
es imposible en seed de arranque; el CREATE de rutas usa unique
constraint real).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from club_mcp.auth.models import User, UserCreate, UserRole
from club_mcp.auth.password_service import hash_password
from club_mcp.auth.seed_users import seed_demo_users
from club_mcp.db.orm.session import session_scope
from club_mcp.db.orm.users_orm import UserORM


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

_ORM_COLS = (
    UserORM.id,
    UserORM.name,
    UserORM.email,
    UserORM.hashed_password,
    UserORM.role,
    UserORM.family_id,
    UserORM.is_active,
    UserORM.created_at,
)


def _to_user(o: UserORM) -> User:
    """UserORM → User (Pydantic from_attributes lo hace trivial)."""
    return User(
        id=o.id,
        name=o.name,
        email=o.email,
        hashed_password=o.hashed_password,
        role=UserRole(o.role),
        family_id=o.family_id,
        is_active=o.is_active,
        created_at=o.created_at,
    )


class UserRepository:
    """Repositorio de usuarios sobre Postgres async (Ola 2.1)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def get_by_email(self, email: str) -> User | None:
        async with session_scope(self._engine) as s:
            o = (
                await s.execute(
                    select(UserORM).where(UserORM.email == email)
                )
            ).scalar_one_or_none()
            return _to_user(o) if o else None

    async def get_by_id(self, user_id: str) -> User | None:
        async with session_scope(self._engine) as s:
            o = (
                await s.execute(
                    select(UserORM).where(UserORM.id == user_id)
                )
            ).scalar_one_or_none()
            return _to_user(o) if o else None

    async def count(self) -> int:
        async with session_scope(self._engine) as s:
            return int(
                (await s.execute(select(func.count()).select_from(UserORM))).scalar_one()
            )

    async def create(self, data: UserCreate) -> User:
        """INSERT directo — email duplicado trona en el UNIQUE real."""
        o = UserORM(
            id=data.email,
            name=data.name,
            email=data.email,
            hashed_password=hash_password(data.password),
            role=data.role.value,
            family_id=data.family_id,
            is_active=True,
        )
        async with session_scope(self._engine) as s:
            s.add(o)
            await s.flush()
            return _to_user(o)

    async def seed_idempotent(self) -> int:
        """Semilla los 4 demo users si faltan; devuelve el total final.

        POSTGRES: pg INSERT ON CONFLICT DO NOTHING (una pasada, sin
        carrera). FALLBACK dialecto no-pg (sqlite en tests): SELECT
        previo por email — mismo contrato, sin upsert nativo.
        """
        seeds = [
            (u.id, u.name, u.email, u.hashed_password, u.role.value, u.family_id)
            for u in seed_demo_users()
        ]
        async with session_scope(self._engine) as s:
            if s.bind is not None and s.bind.dialect.name == "postgresql":
                stmt = pg_insert(UserORM).values(
                    [
                        dict(
                            zip(
                                ("id", "name", "email", "hashed_password", "role", "family_id"),
                                row,
                                strict=True,
                            )
                        )
                        for row in seeds
                    ]
                )
                await s.execute(stmt.on_conflict_do_nothing(index_elements=["email"]))
                total = int(
                    (await s.execute(select(func.count()).select_from(UserORM))).scalar_one()
                )
                return total
            for row in seeds:
                email = row[2]
                exists = (
                    await s.execute(select(UserORM.id).where(UserORM.email == email))
                ).scalar_one_or_none()
                if exists is None:
                    s.add(
                        UserORM(
                            id=row[0],
                            name=row[1],
                            email=email,
                            hashed_password=row[3],
                            role=row[4],
                            family_id=row[5],
                            is_active=True,
                        )
                    )
            total = int(
                (await s.execute(select(func.count()).select_from(UserORM))).scalar_one()
            )
            return total
