"""CulturalSocialRepository async — los 4 dicts se vuelven 4 tablas.

Ola 2.1-nona (vertical cultural_social). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.cultural_social_repo)
— mismos 23 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía / dict — el in-memory no
define excepciones custom y el ORM tampoco las inventa).

La nona es async-FIRST como la sexta/septima/octava (drop-in total):
el in-memory ya es 23/23 async y el agente YA awaited sus 48 call
sites (verificado por grep — 0 privados tocados: contrato limpio).

Mismas decisiones que family/engagement/event/compliance/guest/
satisfaction/communication (§3.8 y siguientes): engine por inyección ·
session_scope transaccional · devuelve Pydantic (SQLAlchemy no sube)
· ids de la MISMA forma que el in-memory (uuid4().hex[:8] SIN
prefijo — el contrato no cambia ni un byte).

Semántica literal del in-memory que se preserva:
  * create_*: INSERT puro con defaults del in-memory (status
    PLANNED/PROPOSED/DRAFT/SCHEDULED · current_participants 0 ·
    entertainment_ids/event_ids [] · created_at ISO now en create_event).
  * update_* (updates: dict): UPDATE de las claves presentes — el
    in-memory hacía record.update(updates) sobre el dict plano; el ORM
    aplica setattr por clave conocida de columna (_UPDATABLE por
    entidad, id intocable) y devuelve el registro reconstruido. Clave
    desconocida: el in-memory la guardaba en el dict (Pydantic la
    descartaría al reconstruir); el ORM la ignora silenciosamente —
    MISMO comportamiento observable del contrato.
  * cancel_event: update_event({"status": EventStatus.CANCELLED}).
  * get_*: None si no existe (sin excepciones).
  * list_*: filtros por igualdad/date-range EN Python sobre la tabla
    completa (chica) — MISMO orden de inserción, MISMO contrato
    observable que iterar .values() del in-memory (criterio
    sin-índice de communication §3.8-OCTAVA).
  * get_status_counts(entity_type): ValueError si el entity_type no
    calza — la ÚNICA excepción del contrato, reproducida literal
    (mapeo events/acts/programs/exhibitions).
  * get_upcoming(days): window hoy..hoy+N comparando STRINGS
    "YYYY-MM-DD" (mismo orden lexicoográfico del in-memory) y
    status not in (cancelled...) por entidad — dict con las 3
    listas (events/exhibitions/programs), acts NO (mismo in-memory).
  * analytics (budget_by_category · venue_utilization ·
    entertainment_costs · seasonal_data): COMPUTE-ON-READ byte a
    byte sobre los rows de las tablas en UNA sesión de lectura
    (misma aritmética redondeos incluidos).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.cultural_social_orm import (
    ArtExhibitionORM,
    CulturalEventORM,
    CulturalProgramORM,
    EntertainmentActORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.cultural_social import (
    ArtExhibition,
    CreateArtExhibition,
    CreateCulturalEvent,
    CreateCulturalProgram,
    CreateEntertainmentAct,
    CulturalCategory,
    CulturalEvent,
    CulturalProgram,
    EntertainmentAct,
    EntertainmentType,
    EventStatus,
    EventType,
    ExhibitionStatus,
    FormalityLevel,
    PerformanceStatus,
    ProgramStatus,
    VenueType,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create_event)."""
    return datetime.now(tz=UTC).isoformat()


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


def _str_list(items: Any) -> list[str]:
    """list[enum/str] → list[str] para JSONB (requirements/...)."""
    return [x.value if hasattr(x, "value") else str(x) for x in (items or [])]


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _event_from_orm(r: CulturalEventORM) -> CulturalEvent:
    return CulturalEvent(
        id=r.id,
        name=r.name,
        event_type=EventType(r.event_type),
        status=EventStatus(r.status),
        formality=FormalityLevel(r.formality),
        venue=r.venue,
        venue_type=VenueType(r.venue_type),
        date=r.date,
        start_time=r.start_time,
        end_time=r.end_time,
        organizer_member_id=r.organizer_member_id,
        description=r.description,
        guest_count=r.guest_count,
        budget=r.budget,
        menu_theme=r.menu_theme,
        dress_code=r.dress_code,
        entertainment_ids=list(r.entertainment_ids or []),
        notes=r.notes,
        created_at=r.created_at,
    )


def _act_from_orm(r: EntertainmentActORM) -> EntertainmentAct:
    return EntertainmentAct(
        id=r.id,
        artist_name=r.artist_name,
        entertainment_type=EntertainmentType(r.entertainment_type),
        status=PerformanceStatus(r.status),
        genre=r.genre,
        description=r.description,
        duration_minutes=r.duration_minutes,
        cost=r.cost,
        contact_person=r.contact_person,
        contact_phone=r.contact_phone,
        requirements=list(r.requirements or []),
        event_id=r.event_id,
        notes=r.notes,
    )


def _program_from_orm(r: CulturalProgramORM) -> CulturalProgram:
    return CulturalProgram(
        id=r.id,
        name=r.name,
        category=CulturalCategory(r.category),
        description=r.description,
        season=r.season,
        start_date=r.start_date,
        end_date=r.end_date,
        coordinator_member_id=r.coordinator_member_id,
        max_participants=r.max_participants,
        current_participants=r.current_participants,
        budget=r.budget,
        status=ProgramStatus(r.status),
        event_ids=list(r.event_ids or []),
        notes=r.notes,
    )


def _exhibition_from_orm(r: ArtExhibitionORM) -> ArtExhibition:
    return ArtExhibition(
        id=r.id,
        title=r.title,
        artist_name=r.artist_name,
        category=CulturalCategory(r.category),
        description=r.description,
        venue=r.venue,
        venue_type=VenueType(r.venue_type),
        start_date=r.start_date,
        end_date=r.end_date,
        status=ExhibitionStatus(r.status),
        num_pieces=r.num_pieces,
        curator_member_id=r.curator_member_id,
        opening_reception=r.opening_reception,
        notes=r.notes,
    )


# ── updates dict (semántica record.update del in-memory) ──

_UPDATABLE: dict[str, set[str]] = {
    "event": {
        "name", "event_type", "status", "formality", "venue", "venue_type",
        "date", "start_time", "end_time", "organizer_member_id",
        "description", "guest_count", "budget", "menu_theme", "dress_code",
        "entertainment_ids", "notes", "created_at",
    },
    "act": {
        "artist_name", "entertainment_type", "status", "genre",
        "description", "duration_minutes", "cost", "contact_person",
        "contact_phone", "requirements", "event_id", "notes",
    },
    "program": {
        "name", "category", "description", "season", "start_date",
        "end_date", "coordinator_member_id", "max_participants",
        "current_participants", "budget", "status", "event_ids", "notes",
    },
    "exhibition": {
        "title", "artist_name", "category", "description", "venue",
        "venue_type", "start_date", "end_date", "status", "num_pieces",
        "curator_member_id", "opening_reception", "notes",
    },
}


def _apply_updates(obj: Any, updates: dict[str, Any], key: str) -> None:
    """record.update(updates) del in-memory — setattr por clave de columna.

    Las claves que no calzan con una columna se ignoran (el dict del
    in-memory las guardaba pero Pydantic las descartaba al reconstruir:
    mismo comportamiento observable). id no se toca nunca.
    """
    allowed = _UPDATABLE[key]
    for k, v in (updates or {}).items():
        if k in allowed:
            setattr(obj, k, v)


async def _load_all(s: Any, cls: Any) -> list[Any]:
    return list((await s.execute(select(cls))).scalars().all())


class CulturalSocialRepository:
    """Repo ORM async — contrato EXACTO del in-memory (23 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Cultural Events ────────────────────────────────────────

    async def create_event(self, data: CreateCulturalEvent) -> CulturalEvent:
        record = CulturalEventORM(
            id=_gen_id(),
            name=data.name,
            event_type=_enum_val(data.event_type),
            status=EventStatus.PLANNED.value,
            formality=data.formality,
            venue=data.venue,
            venue_type=data.venue_type,
            date=data.date,
            start_time=data.start_time,
            end_time=data.end_time,
            organizer_member_id=data.organizer_member_id,
            description=data.description,
            guest_count=data.guest_count,
            budget=data.budget,
            menu_theme=data.menu_theme,
            dress_code=data.dress_code,
            entertainment_ids=[],
            notes=data.notes,
            created_at=_utcnow_iso(),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info("[cultural_social] Event created: %s (%s)", data.name, record.id)
        return _event_from_orm(record)

    async def get_event(self, event_id: str) -> CulturalEvent | None:
        async with session_scope(self._engine) as s:
            record = await s.get(CulturalEventORM, event_id)
            if record is None:
                return None
            return _event_from_orm(record)

    async def update_event(
        self, event_id: str, updates: dict[str, Any]
    ) -> CulturalEvent | None:
        async with session_scope(self._engine) as s:
            record = await s.get(CulturalEventORM, event_id)
            if record is None:
                return None
            _apply_updates(record, updates, "event")
            await s.flush()
            return _event_from_orm(record)

    async def list_events(
        self,
        event_type: EventType | None = None,
        status: EventStatus | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[CulturalEvent]:
        # ojo: el orden de inserción ES el orden del dict in-memory
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, CulturalEventORM)
            return [
                _event_from_orm(r)
                for r in rows
                if (not event_type or r.event_type == event_type.value)
                and (not status or r.status == status.value)
                and (not date_from or r.date >= date_from)
                and (not date_to or r.date <= date_to)
            ]

    async def cancel_event(self, event_id: str) -> CulturalEvent | None:
        return await self.update_event(event_id, {"status": EventStatus.CANCELLED})

    # ── Entertainment Acts ─────────────────────────────────────

    async def create_act(self, data: CreateEntertainmentAct) -> EntertainmentAct:
        record = EntertainmentActORM(
            id=_gen_id(),
            artist_name=data.artist_name,
            entertainment_type=_enum_val(data.entertainment_type),
            status=PerformanceStatus.PROPOSED.value,
            genre=data.genre,
            description=data.description,
            duration_minutes=data.duration_minutes,
            cost=data.cost,
            contact_person=data.contact_person,
            contact_phone=data.contact_phone,
            requirements=_str_list(data.requirements),
            event_id=None,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[cultural_social] Entertainment act created: %s (%s)",
            data.artist_name,
            record.id,
        )
        return _act_from_orm(record)

    async def get_act(self, act_id: str) -> EntertainmentAct | None:
        async with session_scope(self._engine) as s:
            record = await s.get(EntertainmentActORM, act_id)
            if record is None:
                return None
            return _act_from_orm(record)

    async def update_act(
        self, act_id: str, updates: dict[str, Any]
    ) -> EntertainmentAct | None:
        async with session_scope(self._engine) as s:
            record = await s.get(EntertainmentActORM, act_id)
            if record is None:
                return None
            _apply_updates(record, updates, "act")
            await s.flush()
            return _act_from_orm(record)

    async def list_acts(
        self,
        entertainment_type: EntertainmentType | None = None,
    ) -> list[EntertainmentAct]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, EntertainmentActORM)
            return [
                _act_from_orm(r)
                for r in rows
                if (
                    not entertainment_type
                    or r.entertainment_type == entertainment_type.value
                )
            ]

    # ── Cultural Programs ──────────────────────────────────────

    async def create_program(
        self, data: CreateCulturalProgram
    ) -> CulturalProgram:
        record = CulturalProgramORM(
            id=_gen_id(),
            name=data.name,
            category=_enum_val(data.category),
            description=data.description,
            season=data.season,
            start_date=data.start_date,
            end_date=data.end_date,
            coordinator_member_id=data.coordinator_member_id,
            max_participants=data.max_participants,
            current_participants=0,
            budget=data.budget,
            status=ProgramStatus.DRAFT.value,
            event_ids=[],
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info("[cultural_social] Program created: %s (%s)", data.name, record.id)
        return _program_from_orm(record)

    async def get_program(self, program_id: str) -> CulturalProgram | None:
        async with session_scope(self._engine) as s:
            record = await s.get(CulturalProgramORM, program_id)
            if record is None:
                return None
            return _program_from_orm(record)

    async def update_program(
        self, program_id: str, updates: dict[str, Any]
    ) -> CulturalProgram | None:
        async with session_scope(self._engine) as s:
            record = await s.get(CulturalProgramORM, program_id)
            if record is None:
                return None
            _apply_updates(record, updates, "program")
            await s.flush()
            return _program_from_orm(record)

    async def list_programs(
        self,
        category: CulturalCategory | None = None,
        season: str | None = None,
    ) -> list[CulturalProgram]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, CulturalProgramORM)
            return [
                _program_from_orm(r)
                for r in rows
                if (not category or r.category == category.value)
                and (not season or r.season == season)
            ]

    # ── Art Exhibitions �────────────────────────────────────────

    async def create_exhibition(
        self, data: CreateArtExhibition
    ) -> ArtExhibition:
        record = ArtExhibitionORM(
            id=_gen_id(),
            title=data.title,
            artist_name=data.artist_name,
            category=_enum_val(data.category),
            description=data.description,
            venue=data.venue,
            venue_type=data.venue_type,
            start_date=data.start_date,
            end_date=data.end_date,
            status=ExhibitionStatus.SCHEDULED.value,
            num_pieces=data.num_pieces,
            curator_member_id=data.curator_member_id,
            opening_reception=data.opening_reception,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[cultural_social] Exhibition created: %s (%s)", data.title, record.id
        )
        return _exhibition_from_orm(record)

    async def get_exhibition(self, exhibition_id: str) -> ArtExhibition | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ArtExhibitionORM, exhibition_id)
            if record is None:
                return None
            return _exhibition_from_orm(record)

    async def update_exhibition(
        self, exhibition_id: str, updates: dict[str, Any]
    ) -> ArtExhibition | None:
        async with session_scope(self._engine) as s:
            record = await s.get(ArtExhibitionORM, exhibition_id)
            if record is None:
                return None
            _apply_updates(record, updates, "exhibition")
            await s.flush()
            return _exhibition_from_orm(record)

    async def list_exhibitions(
        self,
        category: CulturalCategory | None = None,
        status: ExhibitionStatus | None = None,
    ) -> list[ArtExhibition]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ArtExhibitionORM)
            return [
                _exhibition_from_orm(r)
                for r in rows
                if (not category or r.category == category.value)
                and (not status or r.status == status.value)
            ]

    # ── Analytics & Aggregation (F31) — COMPUTE-ON-READ ──────────

    def _get_store(self, entity_type: str) -> Any:
        """Resolve entity type — MISMA ValueError del in-memory."""
        stores = {
            "events": CulturalEventORM,
            "acts": EntertainmentActORM,
            "programs": CulturalProgramORM,
            "exhibitions": ArtExhibitionORM,
        }
        if entity_type not in stores:
            raise ValueError(f"Unknown entity type: {entity_type}")
        return stores[entity_type]

    async def get_status_counts(self, entity_type: str) -> dict[str, int]:
        """Count entities by status — misma aritmética del in-memory."""
        cls = self._get_store(entity_type)
        counts: dict[str, int] = {}
        async with session_scope(self._engine) as s:
            for r in await _load_all(s, cls):
                status = getattr(r, "status", None)
                if status is not None:
                    key = _enum_val(status)
                    counts[key] = counts.get(key, 0) + 1
        return counts

    async def get_upcoming(self, days: int = 30) -> dict[str, list[Any]]:
        """Upcoming items within N days — mismas ventanas string del in-memory."""
        from datetime import timedelta

        now = datetime.now(tz=UTC)
        cutoff = (now + timedelta(days=days)).strftime("%Y-%m-%d")
        today = now.strftime("%Y-%m-%d")

        async with session_scope(self._engine) as s:
            upcoming_events = [
                _event_from_orm(r)
                for r in await _load_all(s, CulturalEventORM)
                if today <= r.date and r.date <= cutoff
                and _enum_val(r.status) not in ("cancelled", "completed")
            ]
            upcoming_exhibitions = [
                _exhibition_from_orm(r)
                for r in await _load_all(s, ArtExhibitionORM)
                if r.end_date >= today
                and r.start_date <= cutoff
                and _enum_val(r.status) not in ("cancelled", "dismantled")
            ]
            upcoming_programs = [
                _program_from_orm(r)
                for r in await _load_all(s, CulturalProgramORM)
                if r.end_date >= today
                and r.start_date <= cutoff
                and _enum_val(r.status) not in ("cancelled",)
            ]

        return {
            "events": upcoming_events,
            "exhibitions": upcoming_exhibitions,
            "programs": upcoming_programs,
        }

    async def get_budget_by_category(self) -> dict[str, float]:
        """Aggregate budget by category — misma aritmética del in-memory."""
        budgets: dict[str, float] = {}
        async with session_scope(self._engine) as s:
            for r in await _load_all(s, CulturalProgramORM):
                cat = _enum_val(r.category or "unknown")
                budgets[cat] = budgets.get(cat, 0.0) + (r.budget or 0.0)
        return budgets

    async def get_venue_utilization(self) -> list[dict[str, Any]]:
        """Venue usage — misma aritmética (round incluido) del in-memory."""
        venues: dict[str, dict[str, Any]] = {}

        async with session_scope(self._engine) as s:
            for r in await _load_all(s, CulturalEventORM):
                venue = r.venue or "unknown"
                vt = _enum_val(r.venue_type or "")
                if venue not in venues:
                    venues[venue] = {
                        "venue": venue, "venue_type": vt,
                        "bookings": 0, "total_guests": 0, "total_budget": 0.0,
                    }
                venues[venue]["bookings"] += 1
                venues[venue]["total_guests"] += r.guest_count or 0
                venues[venue]["total_budget"] += r.budget or 0.0

            for r in await _load_all(s, ArtExhibitionORM):
                venue = r.venue or "unknown"
                vt = _enum_val(r.venue_type or "")
                if venue not in venues:
                    venues[venue] = {
                        "venue": venue, "venue_type": vt,
                        "bookings": 0, "total_guests": 0, "total_budget": 0.0,
                    }
                venues[venue]["bookings"] += 1

        for v in venues.values():
            v["avg_guests"] = (
                round(v["total_guests"] / v["bookings"], 1) if v["bookings"] > 0 else 0.0
            )

        return list(venues.values())

    async def get_entertainment_costs(self) -> list[dict[str, Any]]:
        """Entertainment cost analysis — misma aritmética del in-memory."""
        costs: dict[str, dict[str, Any]] = {}
        async with session_scope(self._engine) as s:
            for r in await _load_all(s, EntertainmentActORM):
                etype = _enum_val(r.entertainment_type or "unknown")
                status = _enum_val(r.status or "")
                if etype not in costs:
                    costs[etype] = {
                        "type": etype, "total_acts": 0, "contracted": 0,
                        "total_cost": 0.0, "total_duration": 0,
                    }
                costs[etype]["total_acts"] += 1
                costs[etype]["total_cost"] += r.cost or 0.0
                costs[etype]["total_duration"] += r.duration_minutes or 0
                if status in ("contracted", "confirmed", "in_progress", "completed"):
                    costs[etype]["contracted"] += 1

        for c in costs.values():
            n = c["total_acts"]
            c["avg_cost"] = round(c["total_cost"] / n, 0) if n > 0 else 0.0
            c["cost_per_minute"] = (
                round(c["total_cost"] / c["total_duration"], 0)
                if c["total_duration"] > 0
                else 0.0
            )
            c["contracted_rate"] = round(c["contracted"] / n * 100, 1) if n > 0 else 0.0

        return list(costs.values())

    async def get_seasonal_data(self, season: str | None = None) -> list[dict[str, Any]]:
        """Data aggregated by season — misma aritmética del in-memory."""
        seasons: dict[str, dict[str, Any]] = {}
        async with session_scope(self._engine) as s:
            for r in await _load_all(s, CulturalProgramORM):
                ssn = r.season or "unknown"
                if season and ssn != season:
                    continue
                if ssn not in seasons:
                    seasons[ssn] = {
                        "season": ssn, "programs": 0, "total_budget": 0.0,
                        "total_participants": 0, "max_participants": 0,
                    }
                seasons[ssn]["programs"] += 1
                seasons[ssn]["total_budget"] += r.budget or 0.0
                seasons[ssn]["total_participants"] += r.current_participants or 0
                seasons[ssn]["max_participants"] += r.max_participants or 0

        for s_v in seasons.values():
            mp = s_v["max_participants"]
            s_v["enrollment_rate"] = (
                round(s_v["total_participants"] / mp * 100, 1) if mp > 0 else 0.0
            )

        return list(seasons.values())
