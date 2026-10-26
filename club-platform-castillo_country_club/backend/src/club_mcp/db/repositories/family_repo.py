"""
Family repository.
In-memory implementation for development/testing.
Swappable to PostgreSQL via SQLAlchemy.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

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
    AgeGroup,
    MemberCreate,
    MemberResponse,
    compute_age_group,
)

logger = logging.getLogger(__name__)


class FamilyNotFoundError(Exception):
    """Raised when a family is not found."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"Family not found: {identifier}")


class DuplicateFamilyError(Exception):
    """Raised when trying to create a duplicate family."""

    def __init__(self, field: str, value: str) -> None:
        self.field = field
        self.value = value
        super().__init__(f"Family already exists with {field}={value}")


class FamilyRepository:
    """
    In-memory family repository.
    Production: replace with SQLAlchemy async repository.
    """

    def __init__(self) -> None:
        self._families: dict[UUID, dict] = {}
        self._members: dict[UUID, dict] = {}
        self._email_index: dict[str, UUID] = {}
        self._activities: dict[UUID, list[dict]] = {}
        self._social_connections: dict[UUID, list[dict]] = {}
        self._preferences: dict[UUID, dict] = {}

    # ──────────────────────────────────────────────
    # FAMILY CRUD
    # ──────────────────────────────────────────────

    async def create_family(self, data: FamilyCreate) -> FamilyResponse:
        if data.email in self._email_index:
            raise DuplicateFamilyError("email", data.email)

        now = datetime.now(timezone.utc)
        family_id = uuid4()

        family_record = {
            "id": family_id,
            "name": data.name,
            "tier": data.tier,
            "status": FamilyStatus.ACTIVE,
            "email": data.email,
            "phone": data.phone,
            "address": data.address,
            "join_date": date.today(),
            "engagement_score": 50,
            "referral_family_id": data.referral_family_id,
            "notes": data.notes,
            "created_at": now,
            "updated_at": now,
        }
        self._families[family_id] = family_record
        self._email_index[data.email] = family_id
        self._activities[family_id] = []
        self._social_connections[family_id] = []
        self._preferences[family_id] = {
            "preferred_language": "es",
            "notification_channels": ["email", "push"],
            "interests": [],
            "privacy_level": "normal",
        }

        members = []
        for m_data in data.members:
            member = await self._create_member(family_id, m_data)
            members.append(member)

        logger.info(
            "Family created: %s (%s) with %d members",
            data.name, family_id, len(members),
        )

        return FamilyResponse(**family_record, members=members)

    async def get_family(self, family_id: UUID) -> Optional[FamilyResponse]:
        record = self._families.get(family_id)
        if not record:
            return None
        members = await self.get_members(family_id)
        return FamilyResponse(**record, members=members)

    async def get_family_by_email(self, email: str) -> Optional[FamilyResponse]:
        family_id = self._email_index.get(email)
        if not family_id:
            return None
        return await self.get_family(family_id)

    async def family_exists_by_email(self, email: str) -> bool:
        return email in self._email_index

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
        record = self._families.get(family_id)
        if not record:
            raise FamilyNotFoundError(str(family_id))

        if name is not None:
            record["name"] = name
        if tier is not None:
            record["tier"] = tier
        if email is not None:
            old_email = record["email"]
            self._email_index.pop(old_email, None)
            record["email"] = email
            self._email_index[email] = family_id
        if phone is not None:
            record["phone"] = phone
        if address is not None:
            record["address"] = address
        if notes is not None:
            record["notes"] = notes
        record["updated_at"] = datetime.now(timezone.utc)

        return await self.get_family(family_id)

    async def delete_family(self, family_id: UUID) -> bool:
        record = self._families.pop(family_id, None)
        if not record:
            return False
        self._email_index.pop(record["email"], None)
        self._activities.pop(family_id, None)
        self._social_connections.pop(family_id, None)
        self._preferences.pop(family_id, None)
        member_ids = [mid for mid, m in self._members.items() if m["family_id"] == family_id]
        for mid in member_ids:
            del self._members[mid]
        logger.info("Family deleted: %s", family_id)
        return True

    async def get_all_families(self) -> list[FamilyResponse]:
        """Returns all families. Used for cross-family intelligence."""
        families = []
        for family_id in self._families:
            family = await self.get_family(family_id)
            if family:
                families.append(family)
        return families

    # ──────────────────────────────────────────────
    # MEMBER CRUD
    # ──────────────────────────────────────────────

    async def _create_member(
        self, family_id: UUID, data: MemberCreate,
    ) -> MemberResponse:
        now = datetime.now(timezone.utc)
        member_id = uuid4()
        record = {
            "id": member_id,
            "family_id": family_id,
            "name": data.name,
            "date_of_birth": data.date_of_birth,
            "role": data.role,
            "email": data.email,
            "phone": data.phone,
            "allergies": data.allergies,
            "dietary_restrictions": data.dietary_restrictions,
            "created_at": now,
            "updated_at": now,
        }
        self._members[member_id] = record
        return MemberResponse(**record)

    async def get_members(self, family_id: UUID) -> list[MemberResponse]:
        return [
            MemberResponse(**m)
            for m in self._members.values()
            if m["family_id"] == family_id
        ]

    async def add_member(
        self, family_id: UUID, data: MemberCreate,
    ) -> MemberResponse:
        if family_id not in self._families:
            raise FamilyNotFoundError(str(family_id))
        self._families[family_id]["updated_at"] = datetime.now(timezone.utc)
        return await self._create_member(family_id, data)

    async def remove_member(self, member_id: UUID) -> bool:
        record = self._members.pop(member_id, None)
        if not record:
            return False
        family_id = record["family_id"]
        if family_id in self._families:
            self._families[family_id]["updated_at"] = datetime.now(timezone.utc)
        return True

    # ──────────────────────────────────────────────
    # SEARCH
    # ──────────────────────────────────────────────

    async def search_families(self, params: FamilySearchParams) -> FamilyListResponse:
        results: list[dict] = []

        for record in self._families.values():
            if params.tier and record["tier"] != params.tier:
                continue
            if params.status and record["status"] != params.status:
                continue
            if params.engagement_min is not None and record["engagement_score"] < params.engagement_min:
                continue
            if params.engagement_max is not None and record["engagement_score"] > params.engagement_max:
                continue
            if params.joined_after and record["join_date"] < params.joined_after:
                continue
            if params.joined_before and record["join_date"] > params.joined_before:
                continue
            if params.query:
                query_lower = params.query.lower()
                if query_lower not in record["name"].lower() and query_lower not in record["email"].lower():
                    continue
            if params.age_group:
                members = await self.get_members(record["id"])
                groups = {compute_age_group(m.date_of_birth) for m in members}
                if params.age_group not in groups:
                    continue
            results.append(record)

        total = len(results)
        paginated = results[params.offset : params.offset + params.limit]

        briefs = []
        for r in paginated:
            member_count = sum(1 for m in self._members.values() if m["family_id"] == r["id"])
            briefs.append(FamilyBrief(
                id=r["id"],
                name=r["name"],
                tier=r["tier"],
                status=r["status"],
                member_count=member_count,
                engagement_score=r["engagement_score"],
                join_date=r["join_date"],
            ))

        return FamilyListResponse(
            families=briefs, total=total,
            limit=params.limit, offset=params.offset,
        )

    # ──────────────────────────────────────────────
    # ACTIVITIES
    # ──────────────────────────────────────────────

    async def get_activity_history(
        self,
        family_id: UUID,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
    ) -> list[dict]:
        if family_id not in self._families:
            raise FamilyNotFoundError(str(family_id))
        activities = self._activities.get(family_id, [])
        result = []
        for a in activities:
            a_date = a.get("event_date")
            if isinstance(a_date, str):
                a_date = date.fromisoformat(a_date)
            if date_from and a_date < date_from:
                continue
            if date_to and a_date > date_to:
                continue
            result.append(a)
        return result

    async def add_activity(self, family_id: UUID, activity: dict) -> None:
        """Add an activity record for a family."""
        if family_id not in self._activities:
            self._activities[family_id] = []
        self._activities[family_id].append(activity)

    # ──────────────────────────────────────────────
    # SOCIAL CONNECTIONS
    # ──────────────────────────────────────────────

    async def get_social_connections(self, family_id: UUID) -> list[dict]:
        if family_id not in self._families:
            raise FamilyNotFoundError(str(family_id))
        return self._social_connections.get(family_id, [])

    async def add_social_connection(self, family_id: UUID, connection: dict) -> None:
        """Add a social connection for a family."""
        if family_id not in self._social_connections:
            self._social_connections[family_id] = []
        self._social_connections[family_id].append(connection)

    # ──────────────────────────────────────────────
    # PREFERENCES
    # ──────────────────────────────────────────────

    async def get_preferences(self, family_id: UUID) -> dict:
        if family_id not in self._families:
            raise FamilyNotFoundError(str(family_id))
        return self._preferences.get(family_id, {
            "preferred_language": "es",
            "notification_channels": ["email", "push"],
            "interests": [],
            "privacy_level": "normal",
        })

    async def set_preferences(self, family_id: UUID, preferences: dict) -> dict:
        if family_id not in self._families:
            raise FamilyNotFoundError(str(family_id))
        self._preferences[family_id] = preferences
        logger.info("Preferences updated for family %s", family_id)
        return preferences

    # ──────────────────────────────────────────────
    # ENGAGEMENT TRACKING
    # ──────────────────────────────────────────────

    async def update_engagement_score(self, family_id: UUID, score: int) -> None:
        """Update family engagement score."""
        record = self._families.get(family_id)
        if record:
            record["engagement_score"] = max(0, min(100, score))
            record["updated_at"] = datetime.now(timezone.utc)

    # ──────────────────────────────────────────────
    # DEMO DATA SEEDING
    # ──────────────────────────────────────────────

    async def seed_demo_data(self) -> None:
        """Seed repository with realistic demo data for development."""
        today = date.today()

        # Family 1: Garcia — high engagement, VIP, active
        garcia_data = FamilyCreate(
            name="Familia Garcia",
            tier=MembershipTier.VIP,
            email="garcia@castillo.cr",
            phone="+50688881111",
            address="Castillo Country Club, Casa 12",
            members=[
                MemberCreate(name="Carlos Garcia", date_of_birth=date(1978, 3, 15), role="primary"),
                MemberCreate(name="Maria Rodriguez", date_of_birth=date(1980, 7, 22), role="spouse"),
                MemberCreate(name="Sofia Garcia", date_of_birth=date(2018, 1, 10), role="child"),
                MemberCreate(name="Diego Garcia", date_of_birth=date(2015, 5, 3), role="child"),
            ],
        )
        garcia = await self.create_family(garcia_data)
        garcia_id = garcia.id

        # Family 2: Rodriguez — medium engagement, premium
        rodriguez_data = FamilyCreate(
            name="Familia Rodriguez",
            tier=MembershipTier.PREMIUM,
            email="rodriguez@castillo.cr",
            phone="+50688882222",
            members=[
                MemberCreate(name="Luis Rodriguez", date_of_birth=date(1975, 11, 8), role="primary"),
                MemberCreate(name="Ana Vargas", date_of_birth=date(1977, 2, 14), role="spouse"),
                MemberCreate(name="Pedro Rodriguez", date_of_birth=date(2010, 9, 25), role="child"),
            ],
        )
        rodriguez = await self.create_family(rodriguez_data)
        rodriguez_id = rodriguez.id

        # Family 3: Chen — low engagement, basic, at-risk
        chen_data = FamilyCreate(
            name="Familia Chen",
            tier=MembershipTier.BASIC,
            email="chen@castillo.cr",
            phone="+50688883333",
            members=[
                MemberCreate(name="Wei Chen", date_of_birth=date(1985, 6, 30), role="primary"),
                MemberCreate(name="Li Wang", date_of_birth=date(1987, 12, 5), role="spouse"),
            ],
        )
        chen = await self.create_family(chen_data)
        chen_id = chen.id

        # Family 4: Morales — new family, onboarding
        morales_data = FamilyCreate(
            name="Familia Morales",
            tier=MembershipTier.PREMIUM,
            email="morales@castillo.cr",
            phone="+50688884444",
            members=[
                MemberCreate(name="Roberto Morales", date_of_birth=date(1982, 4, 18), role="primary"),
                MemberCreate(name="Carmen Solano", date_of_birth=date(1984, 8, 9), role="spouse"),
                MemberCreate(name="Lucia Morales", date_of_birth=date(2020, 3, 22), role="child"),
            ],
        )
        morales = await self.create_family(morales_data)
        morales_id = morales.id

        # Set engagement scores
        await self.update_engagement_score(garcia_id, 85)
        await self.update_engagement_score(rodriguez_id, 58)
        await self.update_engagement_score(chen_id, 25)
        await self.update_engagement_score(morales_id, 45)

        # Override join_dates for demo scenarios
        self._families[garcia_id]["join_date"] = date(today.year - 4, 1, 15)
        self._families[rodriguez_id]["join_date"] = date(today.year - 2, 6, 1)
        self._families[chen_id]["join_date"] = date(today.year - 1, 3, 10)
        self._families[morales_id]["join_date"] = date(today.year, today.month - 1 if today.month > 1 else 12, 1)

        # Preferences
        await self.set_preferences(garcia_id, {
            "preferred_language": "es",
            "notification_channels": ["email", "push", "whatsapp"],
            "interests": ["Pádel", "Gastronomía", "Natación", "Eventos sociales"],
            "privacy_level": "open",
        })
        await self.set_preferences(rodriguez_id, {
            "preferred_language": "es",
            "notification_channels": ["email"],
            "interests": ["Tenis", "Golf", "Lectura"],
            "privacy_level": "normal",
        })
        await self.set_preferences(chen_id, {
            "preferred_language": "en",
            "notification_channels": ["email", "push"],
            "interests": ["Yoga", "Spa & Wellness"],
            "privacy_level": "private",
        })
        await self.set_preferences(morales_id, {
            "preferred_language": "es",
            "notification_channels": ["email", "push", "whatsapp"],
            "interests": ["Actividades infantiles", "Natación", "Senderismo"],
            "privacy_level": "normal",
        })

        # Activities — Garcia family (rich history)
        for i in range(8):
            await self.add_activity(garcia_id, {
                "event_name": f"Actividad Club {i+1}",
                "event_date": date(today.year, max(1, today.month - i), 15).isoformat(),
                "event_type": ["event", "reservation", "wellness", "sport"][i % 4],
                "members_attended": ["Carlos Garcia", "Maria Rodriguez"],
                "satisfaction_rating": 4.0 + (i % 3) * 0.3,
                "amount_spent": 15000 + i * 2000,
            })

        # Activities — Rodriguez (moderate)
        for i in range(4):
            await self.add_activity(rodriguez_id, {
                "event_name": f"Evento Club {i+1}",
                "event_date": date(today.year, max(1, today.month - i * 2), 10).isoformat(),
                "event_type": ["event", "sport"][i % 2],
                "members_attended": ["Luis Rodriguez"],
                "satisfaction_rating": 3.5 + (i % 2) * 0.5,
                "amount_spent": 8000 + i * 1500,
            })

        # Activities — Chen (sparse, old)
        await self.add_activity(chen_id, {
            "event_name": "Evento Bienvenida",
            "event_date": date(today.year - 1, 4, 20).isoformat(),
            "event_type": "event",
            "members_attended": ["Wei Chen"],
            "satisfaction_rating": 3.0,
            "amount_spent": 5000,
        })

        # Activities — Morales (onboarding)
        await self.add_activity(morales_id, {
            "event_name": "Tour de Bienvenida",
            "event_date": date(today.year, max(1, today.month - 1), 5).isoformat(),
            "event_type": "event",
            "members_attended": ["Roberto Morales", "Carmen Solano"],
            "satisfaction_rating": 4.5,
            "amount_spent": 0,
        })

        # Social connections
        await self.add_social_connection(garcia_id, {
            "connected_family_id": str(rodriguez_id),
            "connected_family_name": "Familia Rodriguez",
            "connection_strength": 0.8,
            "shared_events_count": 6,
            "last_shared_event": date(today.year, today.month, 1).isoformat(),
            "relationship": "Familias amigas — se conocen del pádel",
            "shared_activities": ["Pádel", "Cenas de club"],
        })
        await self.add_social_connection(garcia_id, {
            "connected_family_id": str(morales_id),
            "connected_family_name": "Familia Morales",
            "connection_strength": 0.4,
            "shared_events_count": 2,
            "last_shared_event": date(today.year, max(1, today.month - 1), 5).isoformat(),
            "relationship": "Se conocieron en evento de bienvenida",
            "shared_activities": ["Natación"],
        })
        await self.add_social_connection(rodriguez_id, {
            "connected_family_id": str(garcia_id),
            "connected_family_name": "Familia Garcia",
            "connection_strength": 0.8,
            "shared_events_count": 6,
            "last_shared_event": date(today.year, today.month, 1).isoformat(),
            "relationship": "Familias amigas — se conocen del pádel",
            "shared_activities": ["Pádel", "Cenas de club"],
        })
        await self.add_social_connection(morales_id, {
            "connected_family_id": str(garcia_id),
            "connected_family_name": "Familia Garcia",
            "connection_strength": 0.4,
            "shared_events_count": 2,
            "last_shared_event": date(today.year, max(1, today.month - 1), 5).isoformat(),
            "relationship": "Familia referente durante onboarding",
            "shared_activities": ["Natación"],
        })

        logger.info("Demo data seeded: 4 families with activities, connections, preferences")
