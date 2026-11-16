"""FamilyRepository async — el dict _families/_members se vuelve tabla.

Ola 2.1-bis (vertical family). Contrato EXACTO del módulo in-memory
que reemplaza (club_mcp.db.repositories.family_repo) — mismos
métodos, mismas firmas, mismos Pydantic de salida, mismas
excepciones (FamilyNotFoundError · DuplicateFamilyError):

    create_family / get_family / get_family_by_email /
    family_exists_by_email / update_family / delete_family /
    get_all_families / get_members / add_member / remove_member /
    search_families / get_activity_history / add_activity /
    get_social_connections / add_social_connection /
    get_preferences / set_preferences / update_engagement_score /
    seed_demo_data (+ _create_member interno)

Mismas decisiones de diseño que user_repo (§3.8): engine por
inyección (tests/seed pasan el suyo) · session_scope transaccional
· devuelve Pydantic (SQLAlchemy no sube) · idempotencia
SELECT-then-INSERT (asyncpg no tiene ON CONFLICT aquí — el
unique real detiene el duplicado con DuplicateFamilyError,
excepción del contrato, no IntegrityError).

users_orm.UserORM.family_id: FK lógico desde la Ola 2.1 — cuando
la tabla families exista (esta ola), el delete_family NO toca
users (igual que el in-memory no lo hacía: consistencia mínima).
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select, update as sa_update

from club_mcp.db.orm.family_orm import (
    FamilyORM,
    MemberORM,
    utcnow,
    uuid_str,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.db.repositories.family_repo import (
    DuplicateFamilyError,
    FamilyNotFoundError,
)
from club_mcp.models.family import (
    FamilyBrief,
    FamilyCreate,
    FamilyListResponse,
    FamilyResponse,
    FamilySearchParams,
    FamilyStatus,
    MembershipTier,
)
from club_mcp.models.member import (
    MemberCreate,
    MemberResponse,
    compute_age_group,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_DEFAULT_PREFERENCES: dict[str, Any] = {
    "preferred_language": "es",
    "notification_channels": ["email", "push"],
    "interests": [],
    "privacy_level": "normal",
}


def _to_family_response(f: FamilyORM, members: list[MemberORM]) -> FamilyResponse:
    """FamilyORM(+members) → FamilyResponse (Pydantic)."""
    return FamilyResponse(
        id=UUID(f.id),
        name=f.name,
        tier=MembershipTier(f.tier),
        status=FamilyStatus(f.status),
        email=f.email,
        phone=f.phone,
        address=f.address,
        join_date=f.join_date,
        engagement_score=f.engagement_score,
        referral_family_id=UUID(f.referral_family_id) if f.referral_family_id else None,
        notes=f.notes,
        members=[_to_member_response(m) for m in members],
        created_at=f.created_at,
        updated_at=f.updated_at,
    )


def _to_member_response(m: MemberORM) -> MemberResponse:
    from club_mcp.models.member import MemberRole

    return MemberResponse(
        id=UUID(m.id),
        family_id=UUID(m.family_id),
        name=m.name,
        date_of_birth=m.date_of_birth,
        role=MemberRole(m.role),
        email=m.email,
        phone=m.phone,
        allergies=m.allergies,
        dietary_restrictions=m.dietary_restrictions,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


async def _members_of(s: Any, family_id: str) -> list[MemberORM]:
    return list(
        (
            await s.execute(
                select(MemberORM)
                .where(MemberORM.family_id == family_id)
                .order_by(MemberORM.created_at)
            )
        ).scalars()
    )


class FamilyRepository:
    """Repositorio de familias sobre Postgres async (Ola 2.1-bis).

    Mismo contrato que el in-memory — el agente family_profile y
    sus tests no distinguen uno del otro (gate de la ola: la suite
    del agente corre VERDE contra ESTE repo).
    """

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ──────────────────────────────────────────────
    # FAMILY CRUD
    # ──────────────────────────────────────────────

    async def create_family(self, data: FamilyCreate) -> FamilyResponse:
        async with session_scope(self._engine) as s:
            exists = (
                await s.execute(
                    select(func.count()).select_from(FamilyORM).where(
                        FamilyORM.email == data.email
                    )
                )
            ).scalar_one()
            if exists:
                raise DuplicateFamilyError("email", data.email)

            now = utcnow()
            family_id = uuid4()
            f = FamilyORM(
                id=uuid_str(family_id),
                name=data.name,
                tier=data.tier.value,
                status=FamilyStatus.ACTIVE.value,
                email=data.email,
                phone=data.phone,
                address=data.address,
                join_date=date.today(),
                engagement_score=50,
                referral_family_id=(
                    uuid_str(data.referral_family_id)
                    if data.referral_family_id
                    else None
                ),
                notes=data.notes,
                activities=[],
                social_connections=[],
                preferences=dict(_DEFAULT_PREFERENCES),
                created_at=now,
                updated_at=now,
            )
            s.add(f)
            await s.flush()

            members = [
                self._member_orm(family_id, m) for m in data.members
            ]
            for m in members:
                s.add(m)
            await s.flush()

            logger.info(
                "Family created: %s (%s) with %d members",
                data.name, family_id, len(members),
            )
            return _to_family_response(f, members)

    async def get_family(self, family_id: UUID) -> Optional[FamilyResponse]:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                return None
            members = await _members_of(s, f.id)
            return _to_family_response(f, members)

    async def get_family_by_email(self, email: str) -> Optional[FamilyResponse]:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.email == email)
                )
            ).scalar_one_or_none()
            if not f:
                return None
            members = await _members_of(s, f.id)
            return _to_family_response(f, members)

    async def family_exists_by_email(self, email: str) -> bool:
        async with session_scope(self._engine) as s:
            n = (
                await s.execute(
                    select(func.count()).select_from(FamilyORM).where(
                        FamilyORM.email == email
                    )
                )
            ).scalar_one()
            return bool(n)

    async def update_family(
        self,
        family_id: UUID,
        name: Optional[str] = None,
        tier: Optional[MembershipTier] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        address: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> FamilyResponse:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            if name is not None:
                f.name = name
            if tier is not None:
                f.tier = tier.value
            if email is not None:
                f.email = email
            if phone is not None:
                f.phone = phone
            if address is not None:
                f.address = address
            if notes is not None:
                f.notes = notes
            f.updated_at = utcnow()
            await s.flush()
            members = await _members_of(s, f.id)
            return _to_family_response(f, members)

    async def delete_family(self, family_id: UUID) -> bool:
        async with session_scope(self._engine) as s:
            fid = uuid_str(family_id)
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == fid)
                )
            ).scalar_one_or_none()
            if not f:
                return False
            await s.execute(
                sa_delete(MemberORM).where(MemberORM.family_id == fid)
            )
            await s.execute(sa_delete(FamilyORM).where(FamilyORM.id == fid))
            logger.info("Family deleted: %s", family_id)
            return True

    async def get_all_families(self) -> list[FamilyResponse]:
        async with session_scope(self._engine) as s:
            fams = list(
                (
                    await s.execute(select(FamilyORM).order_by(FamilyORM.name))
                ).scalars()
            )
            out: list[FamilyResponse] = []
            for f in fams:
                members = await _members_of(s, f.id)
                out.append(_to_family_response(f, members))
            return out

    # ──────────────────────────────────────────────
    # MEMBER CRUD
    # ──────────────────────────────────────────────

    def _member_orm(self, family_id: UUID, data: MemberCreate) -> MemberORM:
        now = utcnow()
        return MemberORM(
            id=uuid_str(uuid4()),
            family_id=uuid_str(family_id),
            name=data.name,
            date_of_birth=data.date_of_birth,
            role=data.role.value,
            email=data.email,
            phone=data.phone,
            allergies=data.allergies,
            dietary_restrictions=data.dietary_restrictions,
            created_at=now,
            updated_at=now,
        )

    async def get_members(self, family_id: UUID) -> list[MemberResponse]:
        async with session_scope(self._engine) as s:
            members = await _members_of(s, uuid_str(family_id))
            return [_to_member_response(m) for m in members]

    async def add_member(
        self, family_id: UUID, data: MemberCreate,
    ) -> MemberResponse:
        async with session_scope(self._engine) as s:
            fid = uuid_str(family_id)
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == fid)
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            f.updated_at = utcnow()
            m = self._member_orm(family_id, data)
            s.add(m)
            await s.flush()
            return _to_member_response(m)

    async def remove_member(self, member_id: UUID) -> bool:
        async with session_scope(self._engine) as s:
            m = (
                await s.execute(
                    select(MemberORM).where(MemberORM.id == uuid_str(member_id))
                )
            ).scalar_one_or_none()
            if not m:
                return False
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == m.family_id)
                )
            ).scalar_one_or_none()
            if f:
                f.updated_at = utcnow()
            await s.execute(
                sa_delete(MemberORM).where(MemberORM.id == uuid_str(member_id))
            )
            return True

    # ──────────────────────────────────────────────
    # SEARCH
    # ──────────────────────────────────────────────

    async def search_families(self, params: FamilySearchParams) -> FamilyListResponse:
        async with session_scope(self._engine) as s:
            fams = list(
                (await s.execute(select(FamilyORM).order_by(FamilyORM.name))).scalars()
            )
            results: list[tuple[FamilyORM, int]] = []
            for f in fams:
                if params.tier and MembershipTier(f.tier) != params.tier:
                    continue
                if params.status and FamilyStatus(f.status) != params.status:
                    continue
                if (
                    params.engagement_min is not None
                    and f.engagement_score < params.engagement_min
                ):
                    continue
                if (
                    params.engagement_max is not None
                    and f.engagement_score > params.engagement_max
                ):
                    continue
                if params.joined_after and f.join_date < params.joined_after:
                    continue
                if params.joined_before and f.join_date > params.joined_before:
                    continue
                if params.query:
                    q = params.query.lower()
                    if q not in f.name.lower() and q not in f.email.lower():
                        continue
                members = await _members_of(s, f.id)
                if params.age_group:
                    groups = {compute_age_group(m.date_of_birth) for m in members}
                    if params.age_group not in groups:
                        continue
                results.append((f, len(members)))

            total = len(results)
            paginated = results[params.offset : params.offset + params.limit]
            briefs = [
                FamilyBrief(
                    id=UUID(f.id),
                    name=f.name,
                    tier=MembershipTier(f.tier),
                    status=FamilyStatus(f.status),
                    member_count=mc,
                    engagement_score=f.engagement_score,
                    join_date=f.join_date,
                )
                for (f, mc) in paginated
            ]
            return FamilyListResponse(
                families=briefs,
                total=total,
                limit=params.limit,
                offset=params.offset,
            )

    # ──────────────────────────────────────────────
    # ACTIVITY HISTORY (JSONB)
    # ──────────────────────────────────────────────

    async def get_activity_history(
        self,
        family_id: UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            out = []
            for a in f.activities or []:
                a_date = a.get("event_date")
                if isinstance(a_date, str):
                    a_date = date.fromisoformat(a_date)
                if date_from and a_date < date_from:
                    continue
                if date_to and a_date > date_to:
                    continue
                out.append(a)
            return out

    async def add_activity(self, family_id: UUID, activity: dict) -> None:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if f is None:
                # contrato in-memory: add sobre familia inexistente es no-op
                return
            acts = list(f.activities or [])
            acts.append(activity)
            f.activities = acts  # reasignar: JSONB mutable no se trackea solo
            f.updated_at = utcnow()

    # ──────────────────────────────────────────────
    # SOCIAL CONNECTIONS (JSONB)
    # ──────────────────────────────────────────────

    async def get_social_connections(self, family_id: UUID) -> list[dict]:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            return list(f.social_connections or [])

    async def add_social_connection(self, family_id: UUID, connection: dict) -> None:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if f is None:
                return
            conns = list(f.social_connections or [])
            conns.append(connection)
            f.social_connections = conns
            f.updated_at = utcnow()

    # ──────────────────────────────────────────────
    # PREFERENCES (JSONB)
    # ──────────────────────────────────────────────

    async def get_preferences(self, family_id: UUID) -> dict:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            if not f.preferences:
                return dict(_DEFAULT_PREFERENCES)
            return dict(f.preferences)

    async def set_preferences(self, family_id: UUID, preferences: dict) -> dict:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if not f:
                raise FamilyNotFoundError(str(family_id))
            f.preferences = dict(preferences)
            f.updated_at = utcnow()
            logger.info("Preferences updated for family %s", family_id)
            return preferences

    # ──────────────────────────────────────────────
    # ENGAGEMENT TRACKING
    # ──────────────────────────────────────────────

    async def update_engagement_score(self, family_id: UUID, score: int) -> None:
        async with session_scope(self._engine) as s:
            f = (
                await s.execute(
                    select(FamilyORM).where(FamilyORM.id == uuid_str(family_id))
                )
            ).scalar_one_or_none()
            if f:
                f.engagement_score = max(0, min(100, score))
                f.updated_at = utcnow()

    # ──────────────────────────────────────────────
    # DEMO DATA SEEDING
    # ──────────────────────────────────────────────

    async def seed_demo_data(self) -> None:
        """Seed idempotente — MISMO dataset (demo_families/demo_extras)."""
        from club_mcp.db.repositories.family_repo import demo_extras, demo_families

        by_email: dict[str, UUID] = {}
        for data in demo_families():
            if await self.family_exists_by_email(data.email):
                existing = await self.get_family_by_email(data.email)
            else:
                existing = await self.create_family(data)
            if existing is None:  # pragma: no cover — defensivo
                continue
            by_email[data.email] = existing.id

        extras = demo_extras()
        for email, score in extras["engagement"]:
            await self.update_engagement_score(by_email[email], score)
        for email, prefs in extras["preferences"]:
            await self.set_preferences(by_email[email], prefs)
        for email, activities in extras["activities"]:
            for activity in activities:
                await self.add_activity(by_email[email], activity)
        for from_email, to_email, connection in extras["social"]:
            payload = {
                "connected_family_id": str(by_email[to_email]),  # UUID resuelto
                **connection,
            }
            await self.add_social_connection(by_email[from_email], payload)
        # join_dates: update directo (contrato in-memory lo hacía tras create)
        async with session_scope(self._engine) as s:
            for email, jd in extras["join_dates"]:
                await s.execute(
                    sa_update(FamilyORM)
                    .where(FamilyORM.email == email)
                    .values(join_date=jd)
                )
