"""EventRepository async — los 4 dicts del event_repo in-memory se vuelven 4 tablas.

Ola 2.2 (vertical event — el repo sync que la guía §5.3 registró
como "su propia ola con awaits + repo + gate"). Contrato EXACTO del
módulo in-memory que reemplaza (club_mcp.db.repositories.event_repo)
— mismos 25 métodos públicos, mismas firmas, mismos Pydantic de
salida, mismo comportamiento de error (None / lista vacía / False;
el in-memory no define excepciones custom y el ORM tampoco):

    create_event / get_event / update_event / delete_event /
    search_events / add_rsvp / update_rsvp / remove_rsvp /
    get_rsvp / list_rsvps / get_family_rsvp / add_vendor /
    update_vendor / remove_vendor / list_vendors / add_program_item /
    update_program_item / remove_program_item / list_program /
    get_calendar / get_capacity_info / compute_analytics /
    clone_event / generate_report / get_conflict_details

Mismas decisiones que family/engagement (§3.8/§3.8-bis/§3.8-tris):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (f"{prefix}_{uuid4().hex[:8]}" — evt_/rsvp_/vnd_/prog_).

La semántica sync del dominio (cupos que no se sobrevenden) se
preserva CON el estilo async: add_rsvp cuenta los confirmados
vigentes dentro de la MISMA transacción antes de decidir waitlist
— el punto de decisión crítica queda serializado por la transacción;
el resto del flujo sigue siendo I/O no bloqueante.

delete_event: el in-memory re-construía los dicts filtrando
event_id; acá es FK ON DELETE CASCADE (una transacción, cero
rebuilds — el invariante lo garantiza el constraint, no el código).

current_attendance / waitlist_count: columnas-cache refrescadas
con COUNT real tras cada mutación de RSVP (mismo rol que
_refresh_attendance del in-memory); el read (get_event /
search_events / get_calendar) SIEMPRE lee de la tabla — no miente.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select

from club_mcp.db.orm.event_orm import (
    EventORM,
    EventProgramItemORM,
    EventRSVPORM,
    EventVendorORM,
    utcnow,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.event import (
    CalendarDay,
    CapacityInfo,
    EventAnalytics,
    EventBrief,
    EventCategory,
    EventCreate,
    EventPricingModel,
    EventReport,
    EventResponse,
    EventSearchParams,
    EventStatus,
    EventType,
    ProgramItem,
    RecurrencePattern,
    RSVPRecord,
    RSVPStatus,
    VendorContractStatus,
    VendorRecord,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _gen_id(prefix: str) -> str:
    """MISMA generación que el in-memory (f"{prefix}_{uuid4().hex[:8]}")."""
    return f"{prefix}_{uuid4().hex[:8]}"


# ── Conversores ORM → Pydantic (el contrato de salida no cambia) ──


def _event_from_orm(r: EventORM) -> EventResponse:
    # read-path: reconstruye los enums que el write-path persistió como
    # .value/str (mismo idioma que engagement_repo — roundtrip idéntico).
    return EventResponse(
        id=r.id,
        title=r.title,
        description=r.description,
        category=EventCategory(r.category),
        event_type=EventType(r.event_type),
        status=EventStatus(r.status),
        date_start=r.date_start,
        date_end=r.date_end,
        location=r.location,
        facility_ids=r.facility_ids,
        age_groups=r.age_groups,
        max_capacity=r.max_capacity,
        current_attendance=r.current_attendance,
        waitlist_count=r.waitlist_count,
        pricing_model=EventPricingModel(r.pricing_model),
        price_per_person=r.price_per_person,
        is_members_only=r.is_members_only,
        allow_guests=r.allow_guests,
        max_guests_per_family=r.max_guests_per_family,
        recurrence=RecurrencePattern(r.recurrence),
        requires_rsvp=r.requires_rsvp,
        dress_code=r.dress_code,
        notes=r.notes,
        tags=r.tags,
        created_by=r.created_by,
        created_at=r.created_at,
        updated_at=r.updated_at,
        programs=[],
        rsvps=[],
        vendors=[],
    )


def _brief_from_orm(r: EventORM) -> EventBrief:
    return EventBrief(
        id=r.id,
        title=r.title,
        category=EventCategory(r.category),
        status=EventStatus(r.status),
        date_start=r.date_start,
        date_end=r.date_end,
        location=r.location,
        current_attendance=r.current_attendance,
        max_capacity=r.max_capacity,
        pricing_model=EventPricingModel(r.pricing_model),
    )


def _rsvp_from_orm(r: EventRSVPORM) -> RSVPRecord:
    return RSVPRecord(
        id=r.id,
        event_id=r.event_id,
        family_id=r.family_id,
        family_name=r.family_name,
        member_ids=r.member_ids,
        status=RSVPStatus(r.status),
        guests_count=r.guests_count,
        dietary_restrictions=r.dietary_restrictions,
        notes=r.notes,
        total_cost=r.total_cost,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _vendor_from_orm(r: EventVendorORM) -> VendorRecord:
    return VendorRecord(
        id=r.id,
        event_id=r.event_id,
        name=r.name,
        service_type=r.service_type,
        contact_name=r.contact_name,
        contact_phone=r.contact_phone,
        contact_email=r.contact_email,
        quoted_cost=r.quoted_cost,
        final_cost=r.final_cost,
        contract_status=VendorContractStatus(r.contract_status),
        notes=r.notes,
        created_at=r.created_at,
        updated_at=r.updated_at,
    )


def _program_from_orm(r: EventProgramItemORM) -> ProgramItem:
    return ProgramItem(
        id=r.id,
        event_id=r.event_id,
        title=r.title,
        time_start=r.time_start,
        time_end=r.time_end,
        description=r.description,
        location=r.location,
        responsible=r.responsible,
        notes=r.notes,
        order=r.order,
    )


def _apply_update(orm_obj: Any, val: Any) -> Any:
    """dict.update del in-memory: enums → .value, el resto tal cual."""
    if hasattr(val, "value") and not isinstance(val, (dict, list)):
        return val.value
    return val


class EventRepository:
    """Repo async del dominio event — 4 tablas, contrato del in-memory."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Events CRUD ────────────────────────────────────────

    async def create_event(self, data: EventCreate) -> EventResponse:
        eid = _gen_id("evt")
        now = utcnow()
        record = EventORM(
            id=eid,
            title=data.title,
            description=data.description,
            category=data.category.value,
            event_type=data.event_type.value,
            status=EventStatus.DRAFT.value,
            date_start=data.date_start,
            date_end=data.date_end,
            location=data.location,
            facility_ids=list(data.facility_ids),
            age_groups=list(data.age_groups),
            max_capacity=data.max_capacity,
            current_attendance=0,
            waitlist_count=0,
            pricing_model=data.pricing_model.value,
            price_per_person=data.price_per_person,
            is_members_only=data.is_members_only,
            allow_guests=data.allow_guests,
            max_guests_per_family=data.max_guests_per_family,
            recurrence=data.recurrence.value,
            requires_rsvp=data.requires_rsvp,
            dress_code=data.dress_code,
            notes=data.notes,
            tags=list(data.tags),
            created_by=data.created_by,
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info("[event] Event created: %s (%s)", data.title, eid)
        return _event_from_orm(record)

    async def get_event(self, event_id: str) -> EventResponse | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventORM, event_id)
            if r is None:
                return None
            programs, rsvps, vendors = await self._load_children(s, event_id)
            return _event_full(r, programs, rsvps, vendors)

    async def update_event(
        self, event_id: str, data: dict[str, Any]
    ) -> EventResponse | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventORM, event_id)
            if r is None:
                return None
            for key, val in data.items():
                if val is not None:
                    setattr(r, key, _apply_update(r, val))
            r.updated_at = utcnow()
            return _event_from_orm(r)

    async def delete_event(self, event_id: str) -> bool:
        async with session_scope(self._engine) as s:
            r = await s.get(EventORM, event_id)
            if r is None:
                return False
            # CASCADE físico (FK ON DELETE CASCADE) — el in-memory
            # rebuildaba los dicts; acá la transacción borra a los 4.
            await s.execute(
                sa_delete(EventRSVPORM).where(EventRSVPORM.event_id == event_id)
            )
            await s.execute(
                sa_delete(EventVendorORM).where(EventVendorORM.event_id == event_id)
            )
            await s.execute(
                sa_delete(EventProgramItemORM).where(
                    EventProgramItemORM.event_id == event_id
                )
            )
            await s.delete(r)
            return True

    async def search_events(self, params: EventSearchParams) -> list[EventBrief]:
        async with session_scope(self._engine) as s:
            stmt = select(EventORM)
            if params.query:
                q = f"%{params.query.lower()}%"
                stmt = stmt.where(
                    func.lower(EventORM.title).like(q)
                    | func.lower(EventORM.description).like(q)
                )
            if params.category:
                stmt = stmt.where(EventORM.category == params.category.value)
            if params.status:
                stmt = stmt.where(EventORM.status == params.status.value)
            if params.pricing_model:
                stmt = stmt.where(EventORM.pricing_model == params.pricing_model.value)
            if params.date_from:
                stmt = stmt.where(EventORM.date_start >= params.date_from)
            if params.date_to:
                stmt = stmt.where(EventORM.date_end <= params.date_to)
            rows = (await s.execute(stmt.order_by(EventORM.date_start))).scalars().all()
            out: list[EventBrief] = []
            for r in rows:
                if params.age_group and params.age_group not in r.age_groups and "all" not in r.age_groups:
                    continue
                if params.tags and not set(params.tags).intersection(r.tags):
                    continue
                out.append(_brief_from_orm(r))
            start = (params.page - 1) * params.page_size
            return out[start : start + params.page_size]

    # ── RSVP Management ────────────────────────────────────

    async def add_rsvp(
        self,
        event_id: str,
        family_id: str,
        member_ids: list[str],
        status: RSVPStatus = RSVPStatus.CONFIRMED,
        guests_count: int = 0,
        dietary_restrictions: str = "",
        notes: str = "",
        family_name: str = "",
    ) -> RSVPRecord | None:
        async with session_scope(self._engine) as s:
            ev = await s.get(EventORM, event_id)
            if ev is None:
                return None
            price = ev.price_per_person or 0.0
            headcount = len(member_ids) + guests_count

            # Auto-waitlist cuando excede cupo — MISMA transacción:
            # el punto de decisión crítica serializado (semántica sync
            # del dominio sobre I/O async).
            if ev.max_capacity > 0:
                current = await self._count_attendance(s, event_id)
                available = ev.max_capacity - current
                if headcount > available and status == RSVPStatus.CONFIRMED:
                    status = RSVPStatus.WAITLISTED

            rsvp_id = _gen_id("rsvp")
            now = utcnow()
            record = EventRSVPORM(
                id=rsvp_id,
                event_id=event_id,
                family_id=family_id,
                family_name=family_name,
                member_ids=list(member_ids),
                status=status.value,
                guests_count=guests_count,
                dietary_restrictions=dietary_restrictions,
                notes=notes,
                total_cost=price * headcount,
                created_at=now,
                updated_at=now,
            )
            s.add(record)
            await s.flush()
            await self._refresh_attendance(s, ev)
            return _rsvp_from_orm(record)

    async def update_rsvp(
        self, rsvp_id: str, data: dict[str, Any]
    ) -> RSVPRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventRSVPORM, rsvp_id)
            if r is None:
                return None
            for key, val in data.items():
                if val is not None:
                    setattr(r, key, _apply_update(r, val))
            r.updated_at = utcnow()
            ev = await s.get(EventORM, r.event_id)
            if ev is not None:
                await self._refresh_attendance(s, ev)
            return _rsvp_from_orm(r)

    async def remove_rsvp(self, rsvp_id: str) -> bool:
        async with session_scope(self._engine) as s:
            r = await s.get(EventRSVPORM, rsvp_id)
            if r is None:
                return False
            event_id = r.event_id
            await s.delete(r)
            await s.flush()
            ev = await s.get(EventORM, event_id)
            if ev is not None:
                await self._refresh_attendance(s, ev)
            return True

    async def get_rsvp(self, rsvp_id: str) -> RSVPRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventRSVPORM, rsvp_id)
            return None if r is None else _rsvp_from_orm(r)

    async def list_rsvps(
        self, event_id: str, status: RSVPStatus | None = None
    ) -> list[RSVPRecord]:
        async with session_scope(self._engine) as s:
            stmt = select(EventRSVPORM).where(EventRSVPORM.event_id == event_id)
            if status:
                stmt = stmt.where(EventRSVPORM.status == status.value)
            rows = (await s.execute(stmt.order_by(EventRSVPORM.id))).scalars().all()
            return [_rsvp_from_orm(r) for r in rows]

    async def get_family_rsvp(
        self, event_id: str, family_id: str
    ) -> RSVPRecord | None:
        async with session_scope(self._engine) as s:
            r = (
                (
                    await s.execute(
                        select(EventRSVPORM).where(
                            EventRSVPORM.event_id == event_id,
                            EventRSVPORM.family_id == family_id,
                        )
                    )
                )
                .scalars()
                .first()
            )
            return None if r is None else _rsvp_from_orm(r)

    # ── Vendor Management ──────────────────────────────────

    async def add_vendor(
        self,
        event_id: str,
        name: str,
        service_type: str,
        contact_name: str = "",
        contact_phone: str = "",
        contact_email: str = "",
        quoted_cost: float = 0.0,
        notes: str = "",
    ) -> VendorRecord | None:
        async with session_scope(self._engine) as s:
            ev = await s.get(EventORM, event_id)
            if ev is None:
                return None
            vid = _gen_id("vnd")
            now = utcnow()
            record = EventVendorORM(
                id=vid,
                event_id=event_id,
                name=name,
                service_type=service_type,
                contact_name=contact_name,
                contact_phone=contact_phone,
                contact_email=contact_email,
                quoted_cost=quoted_cost,
                final_cost=None,
                contract_status=VendorContractStatus.PENDING.value,
                notes=notes,
                created_at=now,
                updated_at=now,
            )
            s.add(record)
            return _vendor_from_orm(record)

    async def update_vendor(
        self, vendor_id: str, data: dict[str, Any]
    ) -> VendorRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventVendorORM, vendor_id)
            if r is None:
                return None
            for key, val in data.items():
                if val is not None:
                    setattr(r, key, _apply_update(r, val))
            r.updated_at = utcnow()
            return _vendor_from_orm(r)

    async def remove_vendor(self, vendor_id: str) -> bool:
        async with session_scope(self._engine) as s:
            r = await s.get(EventVendorORM, vendor_id)
            if r is None:
                return False
            await s.delete(r)
            return True

    async def list_vendors(self, event_id: str) -> list[VendorRecord]:
        async with session_scope(self._engine) as s:
            stmt = select(EventVendorORM).where(EventVendorORM.event_id == event_id)
            rows = (await s.execute(stmt.order_by(EventVendorORM.id))).scalars().all()
            return [_vendor_from_orm(r) for r in rows]

    # ── Program / Itinerary ────────────────────────────────

    async def add_program_item(
        self,
        event_id: str,
        title: str,
        time_start: str,
        time_end: str,
        description: str = "",
        location: str = "",
        responsible: str = "",
        notes: str = "",
        order: int = 0,
    ) -> ProgramItem | None:
        async with session_scope(self._engine) as s:
            ev = await s.get(EventORM, event_id)
            if ev is None:
                return None
            pid = _gen_id("prog")
            record = EventProgramItemORM(
                id=pid,
                event_id=event_id,
                title=title,
                time_start=time_start,
                time_end=time_end,
                description=description,
                location=location,
                responsible=responsible,
                notes=notes,
                order=order,
            )
            s.add(record)
            return _program_from_orm(record)

    async def update_program_item(
        self, item_id: str, data: dict[str, Any]
    ) -> ProgramItem | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EventProgramItemORM, item_id)
            if r is None:
                return None
            for key, val in data.items():
                if val is not None:
                    setattr(r, key, val)
            return _program_from_orm(r)

    async def remove_program_item(self, item_id: str) -> bool:
        async with session_scope(self._engine) as s:
            r = await s.get(EventProgramItemORM, item_id)
            if r is None:
                return False
            await s.delete(r)
            return True

    async def list_program(self, event_id: str) -> list[ProgramItem]:
        async with session_scope(self._engine) as s:
            stmt = (
                select(EventProgramItemORM)
                .where(EventProgramItemORM.event_id == event_id)
                .order_by(EventProgramItemORM.order, EventProgramItemORM.time_start)
            )
            rows = (await s.execute(stmt)).scalars().all()
            return [_program_from_orm(r) for r in rows]

    # ── Calendar ───────────────────────────────────────────

    async def get_calendar(
        self,
        date_from: datetime,
        date_to: datetime,
        category: str | None = None,
    ) -> list[CalendarDay]:
        async with session_scope(self._engine) as s:
            stmt = select(EventORM).where(
                EventORM.date_start <= date_to, EventORM.date_end >= date_from
            )
            if category:
                stmt = stmt.where(EventORM.category == category)
            rows = (await s.execute(stmt.order_by(EventORM.date_start))).scalars().all()
            briefs_by_day: dict[str, list[EventBrief]] = {}
            for r in rows:
                d = max(r.date_start.date(), date_from.date())
                d_end = min(r.date_end.date(), date_to.date())
                while d <= d_end:
                    briefs_by_day.setdefault(d.isoformat(), []).append(
                        _brief_from_orm(r)
                    )
                    d = d.fromordinal(d.toordinal() + 1)

            calendar: list[CalendarDay] = []
            cur = date_from.date()
            while cur <= date_to.date():
                day_events = briefs_by_day.get(cur.isoformat(), [])
                calendar.append(
                    CalendarDay(
                        date=cur.isoformat(),
                        events=day_events,
                        total_events=len(day_events),
                        has_conflicts=self._has_conflicts(day_events),
                    )
                )
                cur = cur.fromordinal(cur.toordinal() + 1)
            return calendar

    # ── Capacity ───────────────────────────────────────────

    async def get_capacity_info(self, event_id: str) -> CapacityInfo | None:
        async with session_scope(self._engine) as s:
            ev = await s.get(EventORM, event_id)
            if ev is None:
                return None
            mx = ev.max_capacity
            cur = await self._count_attendance(s, event_id)
            wl = await self._count_waitlist(s, event_id)
            avail = max(0, mx - cur) if mx > 0 else 0
            return CapacityInfo(
                event_id=event_id,
                event_title=ev.title,
                max_capacity=mx,
                current_attendance=cur,
                waitlist_count=wl,
                available_spots=avail,
                occupancy_pct=round(cur / mx * 100, 1) if mx > 0 else 0.0,
                is_full=mx > 0 and cur >= mx,
                is_waitlist_active=wl > 0,
            )

    # ── Analytics ──────────────────────────────────────────

    async def compute_analytics(self, event_id: str) -> EventAnalytics | None:
        async with session_scope(self._engine) as s:
            ev = await s.get(EventORM, event_id)
            if ev is None:
                return None
            rows = (
                (
                    await s.execute(
                        select(EventRSVPORM).where(EventRSVPORM.event_id == event_id)
                    )
                )
                .scalars()
                .all()
            )
            total = len(rows)
            confirmed = sum(1 for r in rows if r.status == RSVPStatus.CONFIRMED.value)
            declined = sum(1 for r in rows if r.status == RSVPStatus.DECLINED.value)
            no_shows = sum(1 for r in rows if r.status == RSVPStatus.NO_SHOW.value)
            waitlisted = sum(1 for r in rows if r.status == RSVPStatus.WAITLISTED.value)
            revenue = sum(
                r.total_cost
                for r in rows
                if r.status in (RSVPStatus.CONFIRMED.value, RSVPStatus.NO_SHOW.value)
            )
            total_guests = sum(
                r.guests_count for r in rows if r.status == RSVPStatus.CONFIRMED.value
            )
            avg_guests = (total_guests / confirmed) if confirmed > 0 else 0.0

            return EventAnalytics(
                event_id=event_id,
                event_title=ev.title,
                total_rsvps=total,
                confirmed_attendance=confirmed,
                declined_count=declined,
                no_shows=no_shows,
                waitlisted_count=waitlisted,
                attendance_rate=round(confirmed / total * 100, 1) if total > 0 else 0.0,
                cancellation_rate=round(declined / total * 100, 1) if total > 0 else 0.0,
                revenue=revenue,
                average_guests_per_family=round(avg_guests, 1),
            )

    # ── Clone / Template ───────────────────────────────────

    async def clone_event(
        self,
        source_id: str,
        new_start: datetime,
        new_end: datetime,
        title_suffix: str = "(copia)",
    ) -> EventResponse | None:
        async with session_scope(self._engine) as s:
            src = await s.get(EventORM, source_id)
            if src is None:
                return None
            new_id = _gen_id("evt")
            now = utcnow()
            cloned = EventORM(
                id=new_id,
                title=f"{src.title} {title_suffix}".strip(),
                description=src.description,
                category=src.category,
                event_type=src.event_type,
                status=EventStatus.DRAFT.value,
                date_start=new_start,
                date_end=new_end,
                location=src.location,
                facility_ids=list(src.facility_ids),
                age_groups=list(src.age_groups),
                max_capacity=src.max_capacity,
                current_attendance=0,
                waitlist_count=0,
                pricing_model=src.pricing_model,
                price_per_person=src.price_per_person,
                is_members_only=src.is_members_only,
                allow_guests=src.allow_guests,
                max_guests_per_family=src.max_guests_per_family,
                recurrence=src.recurrence,
                requires_rsvp=src.requires_rsvp,
                dress_code=src.dress_code,
                notes=src.notes,
                tags=list(src.tags),
                created_by=src.created_by,
                created_at=now,
                updated_at=now,
            )
            s.add(cloned)

            # Clone program items (mismo comportamiento que el in-memory:
            # solo el programa se copia — RSVPs y vendors NO).
            items = (
                (
                    await s.execute(
                        select(EventProgramItemORM).where(
                            EventProgramItemORM.event_id == source_id
                        )
                    )
                )
                .scalars()
                .all()
            )
            for item in items:
                s.add(
                    EventProgramItemORM(
                        id=_gen_id("prog"),
                        event_id=new_id,
                        title=item.title,
                        time_start=item.time_start,
                        time_end=item.time_end,
                        description=item.description,
                        location=item.location,
                        responsible=item.responsible,
                        notes=item.notes,
                        order=item.order,
                    )
                )
            return _event_from_orm(cloned)

    # ── Report ─────────────────────────────────────────────

    async def generate_report(
        self,
        date_from: datetime,
        date_to: datetime,
        report_type: str = "executive",
    ) -> EventReport:
        async with session_scope(self._engine) as s:
            in_range = (
                (
                    await s.execute(
                        select(EventORM).where(
                            EventORM.date_start >= date_from,
                            EventORM.date_start <= date_to,
                        )
                    )
                )
                .scalars()
                .all()
            )
            total = len(in_range)
            completed = sum(1 for r in in_range if r.status == EventStatus.COMPLETED.value)
            cancelled = sum(1 for r in in_range if r.status == EventStatus.CANCELLED.value)
            upcoming = sum(
                1
                for r in in_range
                if r.status
                in (EventStatus.APPROVED.value, EventStatus.PUBLISHED.value)
            )

            attendance = 0
            revenue = 0.0
            cats: dict[str, int] = {}
            per_event_attendance: dict[str, int] = {}
            for r in in_range:
                cur = await self._count_attendance(s, r.id)
                per_event_attendance[r.id] = cur
                attendance += cur
                cats[r.category] = cats.get(r.category, 0) + 1
                rows = (
                    (
                        await s.execute(
                            select(EventRSVPORM).where(EventRSVPORM.event_id == r.id)
                        )
                    )
                    .scalars()
                    .all()
                )
                for row in rows:
                    if row.status == RSVPStatus.CONFIRMED.value:
                        revenue += row.total_cost

            avg = round(attendance / total, 1) if total > 0 else 0.0
            top_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:5]
            top_eids = sorted(
                in_range, key=lambda r: per_event_attendance.get(r.id, 0), reverse=True
            )[:5]

            return EventReport(
                report_type=report_type,
                period_start=date_from,
                period_end=date_to,
                total_events=total,
                completed_events=completed,
                cancelled_events=cancelled,
                upcoming_events=upcoming,
                total_attendance=attendance,
                average_attendance=avg,
                total_revenue=round(revenue, 2),
                top_categories=[{"category": c, "count": n} for c, n in top_cats],
                top_events=[_brief_from_orm(r) for r in top_eids],
            )

    # ── Conflicts ──────────────────────────────────────────

    async def get_conflict_details(
        self,
        date_from: datetime,
        date_to: datetime,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        """Detecta conflictos por pares — misma lógica del in-memory."""
        async with session_scope(self._engine) as s:
            stmt = select(EventORM).where(
                EventORM.date_start <= date_to, EventORM.date_end >= date_from
            )
            if category:
                stmt = stmt.where(EventORM.category == category)
            in_range = (await s.execute(stmt)).scalars().all()

            conflicts: list[dict[str, Any]] = []
            seen: set[tuple[str, str]] = set()
            for i in range(len(in_range)):
                rec_a = in_range[i]
                start_a, end_a = rec_a.date_start, rec_a.date_end
                loc_a = rec_a.location or ""
                fac_a = set(rec_a.facility_ids or [])

                for j in range(i + 1, len(in_range)):
                    rec_b = in_range[j]
                    start_b, end_b = rec_b.date_start, rec_b.date_end
                    loc_b = rec_b.location or ""
                    fac_b = set(rec_b.facility_ids or [])

                    overlap_start = max(start_a, start_b)
                    overlap_end = min(end_a, end_b)
                    if overlap_start >= overlap_end:
                        continue

                    pair_key: tuple[str, str] = (
                        (rec_a.id, rec_b.id)
                        if rec_a.id <= rec_b.id
                        else (rec_b.id, rec_a.id)
                    )
                    if pair_key in seen:
                        continue
                    seen.add(pair_key)

                    overlap_minutes = int(
                        (overlap_end - overlap_start).total_seconds() / 60
                    )
                    conflict_types: list[str] = ["time"]
                    if loc_a and loc_b and loc_a == loc_b:
                        conflict_types.append("venue")
                    shared_facilities = fac_a & fac_b
                    if shared_facilities:
                        conflict_types.append("resource")

                    if overlap_minutes >= 120 or "venue" in conflict_types:
                        severity = "high"
                    elif overlap_minutes >= 60:
                        severity = "medium"
                    else:
                        severity = "low"

                    if "venue" in conflict_types:
                        suggestion = (
                            f"Reubicar uno de los eventos a otro espacio. "
                            f"Comparten: {loc_a}."
                        )
                    elif "resource" in conflict_types:
                        suggestion = (
                            f"Coordinar uso de instalaciones compartidas: "
                            f"{', '.join(sorted(shared_facilities))}."
                        )
                    else:
                        suggestion = (
                            f"Superposición de {overlap_minutes} minutos. "
                            f"Considerar reprogramar uno de los eventos."
                        )

                    conflicts.append(
                        {
                            "event_a_id": rec_a.id,
                            "event_a_title": rec_a.title,
                            "event_a_start": start_a.isoformat(),
                            "event_a_end": end_a.isoformat(),
                            "event_a_location": loc_a,
                            "event_b_id": rec_b.id,
                            "event_b_title": rec_b.title,
                            "event_b_start": start_b.isoformat(),
                            "event_b_end": end_b.isoformat(),
                            "event_b_location": loc_b,
                            "overlap_start": overlap_start.isoformat(),
                            "overlap_end": overlap_end.isoformat(),
                            "overlap_minutes": overlap_minutes,
                            "conflict_types": conflict_types,
                            "shared_facilities": sorted(shared_facilities),
                            "severity": severity,
                            "suggestion": suggestion,
                        }
                    )

            conflicts.sort(
                key=lambda c: (
                    {"high": 0, "medium": 1, "low": 2}[c["severity"]],
                    -c["overlap_minutes"],
                )
            )
            return conflicts

    # ── Internal helpers (mismo rol que los del in-memory) ──

    @staticmethod
    async def _count_attendance(s: Any, event_id: str) -> int:
        rows = (
            (
                await s.execute(
                    select(EventRSVPORM).where(
                        EventRSVPORM.event_id == event_id,
                        EventRSVPORM.status == RSVPStatus.CONFIRMED.value,
                    )
                )
            )
            .scalars()
            .all()
        )
        return sum(len(r.member_ids) + r.guests_count for r in rows)

    @staticmethod
    async def _count_waitlist(s: Any, event_id: str) -> int:
        rows = (
            (
                await s.execute(
                    select(EventRSVPORM).where(
                        EventRSVPORM.event_id == event_id,
                        EventRSVPORM.status == RSVPStatus.WAITLISTED.value,
                    )
                )
            )
            .scalars()
            .all()
        )
        return len(rows)

    @staticmethod
    async def _refresh_attendance(s: Any, ev: EventORM) -> None:
        """Columna-cache honesta: COUNT real tras cada mutación de RSVP."""
        total = await EventRepository._count_attendance(s, ev.id)
        wl = await EventRepository._count_waitlist(s, ev.id)
        ev.current_attendance = total
        ev.waitlist_count = wl

    @staticmethod
    async def _load_children(
        s: Any, event_id: str
    ) -> tuple[list[ProgramItem], list[RSVPRecord], list[VendorRecord]]:
        programs = (
            (
                await s.execute(
                    select(EventProgramItemORM)
                    .where(EventProgramItemORM.event_id == event_id)
                    .order_by(EventProgramItemORM.order, EventProgramItemORM.time_start)
                )
            )
            .scalars()
            .all()
        )
        rsvps = (
            (
                await s.execute(
                    select(EventRSVPORM).where(EventRSVPORM.event_id == event_id)
                )
            )
            .scalars()
            .all()
        )
        vendors = (
            (
                await s.execute(
                    select(EventVendorORM).where(EventVendorORM.event_id == event_id)
                )
            )
            .scalars()
            .all()
        )
        return (
            [_program_from_orm(r) for r in programs],
            [_rsvp_from_orm(r) for r in rsvps],
            [_vendor_from_orm(r) for r in vendors],
        )

    @staticmethod
    def _has_conflicts(events: list[EventBrief]) -> bool:
        if len(events) < 2:
            return False
        st = sorted(events, key=lambda e: e.date_start)
        for i in range(len(st) - 1):
            if st[i].date_end > st[i + 1].date_start:
                return True
        return False


def _event_full(
    r: EventORM,
    programs: list[ProgramItem],
    rsvps: list[RSVPRecord],
    vendors: list[VendorRecord],
) -> EventResponse:
    """EventORM + hijos cargados → EventResponse (contrato get_event)."""
    resp = _event_from_orm(r)
    resp.programs = programs
    resp.rsvps = rsvps
    resp.vendors = vendors
    return resp

