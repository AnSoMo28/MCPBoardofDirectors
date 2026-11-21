"""GuestManagementRepository async — los 3 dicts se vuelven tablas.

Ola 2.1-sexta (vertical guest_management). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.guest_management_repo)
— mismos 18 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía / dict — el in-memory no
define excepciones custom y el ORM tampoco las inventa):

    create_guest / get_guest / list_guests / update_guest /
    create_private_event / get_private_event / list_private_events /
    update_private_event /
    create_trial_membership / get_trial_membership /
    list_trial_memberships / update_trial_membership /
    get_guest_analytics /
    get_health_score / get_conversion_funnel /
    get_analytics_enhanced / get_guest_demand_forecast /
    generate_engagement_proposals

Mismas decisiones que family/engagement/event/compliance (§3.8 y
siguientes): engine por inyección · session_scope transaccional ·
devuelve Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (uuid4().hex[:8] SIN prefijo — el contrato no cambia ni un
byte).

Semántica literal del in-memory que se preserva:
  * create_*: id/created_at/updated_at los fija el REPO; status default
    REGISTERED / INQUIRY / PENDING_APPROVAL; estimated_cost=0.0 al
    crear el evento.
  * update_*: dict.update literal — TODA clave llega, updated_at SIEMPRE.
  * list_*: filtros por prefijo de familia/estado/tipo solo si el
    string no-vacío llega (el in-memory filtraba con if family_id:).
  * get_guest_analytics: dict plano con las mismas claves y la misma
    aritmética (top_purposes sorted desc [:5]).
  * compute: MISMA aritmética byte a byte del in-memory — health 5
    factores ponderados, funnel 5 etapas, enhanced (temporal de
    snapshots + referrers + privileges + peak days + correlación),
    forecast (tendencia 3 meses + pipeline) y proposals P1-P5. Las
    lecturas usan los guests de la TABLA (visit_count columna) y los
    snapshots de la TABLA — sin memoria de proceso.
  * visit_count: el in-memory lo guardaba como anexo `_visit_count`
    (solo el seed demo); columna real con default 1 = mismo
    comportamiento observable (g.get("_visit_count", 1)).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.guest_orm import (
    GuestMonthlySnapshotORM,
    GuestORM,
    PrivateEventORM,
    TrialMembershipORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.guest_management import (
    ConversionFunnel,
    ConversionFunnelStage,
    ConversionStage,
    CreateGuest,
    CreatePrivateEvent,
    CreateTrialMembership,
    Guest,
    GuestAnalyticsEnhanced,
    GuestDemandForecast,
    GuestEngagementProposal,
    GuestEngagementProposalList,
    GuestForecastItem,
    GuestHealthFactor,
    GuestHealthLevel,
    GuestHealthScore,
    GuestPrivilegeType,
    GuestProposalType,
    GuestStatus,
    GuestTemporalTrend,
    PrivateEvent,
    PrivateEventStatus,
    PrivateEventType,
    TrialMembership,
    TrialMembershipStatus,
    TrialMembershipType,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# ── update genérico (contrato: dict.update con claves del modelo) ──

_GUEST_COLUMNS = {
    "family_id", "host_member_id", "guest_name", "guest_email",
    "guest_phone", "visit_date", "purpose", "status", "privileges",
    "notes", "visit_count",
}
_EVENT_COLUMNS = {
    "family_id", "event_name", "event_type", "venue", "date",
    "start_time", "end_time", "guest_count", "budget", "estimated_cost",
    "status", "coordinator_member_id", "description",
    "special_requirements", "catering_required", "decoration_required",
    "entertainment_required", "notes",
}
_TRIAL_COLUMNS = {
    "guest_name", "guest_email", "guest_phone", "referred_by_family_id",
    "trial_type", "start_date", "end_date", "status", "privileges",
    "notes",
}


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _plain(val: Any) -> Any:
    """Enum → .value (el in-memory guardaba el dict tal cual llegaba)."""
    if hasattr(val, "value") and not isinstance(val, (dict, list)):
        return val.value
    if isinstance(val, list):
        return [
            (v.value if hasattr(v, "value") and not isinstance(v, (dict, list)) else v)
            for v in val
        ]
    return val


def _guest_from_orm(r: GuestORM) -> Guest:
    return Guest(
        id=r.id,
        family_id=r.family_id,
        host_member_id=r.host_member_id,
        guest_name=r.guest_name,
        guest_email=r.guest_email or "",
        guest_phone=r.guest_phone or "",
        visit_date=r.visit_date,
        purpose=r.purpose or "",
        status=GuestStatus(r.status),
        privileges=list(r.privileges or []),
        notes=r.notes or "",
        created_at=_iso(r.created_at),
        updated_at=_iso(r.updated_at),
    )


def _event_from_orm(r: PrivateEventORM) -> PrivateEvent:
    return PrivateEvent(
        id=r.id,
        family_id=r.family_id,
        event_name=r.event_name,
        event_type=PrivateEventType(r.event_type),
        venue=r.venue,
        date=r.date,
        start_time=r.start_time or "",
        end_time=r.end_time or "",
        guest_count=r.guest_count,
        budget=float(r.budget),
        estimated_cost=float(r.estimated_cost),
        status=PrivateEventStatus(r.status),
        coordinator_member_id=r.coordinator_member_id or "",
        description=r.description or "",
        special_requirements=r.special_requirements or "",
        catering_required=bool(r.catering_required),
        decoration_required=bool(r.decoration_required),
        entertainment_required=bool(r.entertainment_required),
        notes=r.notes or "",
        created_at=_iso(r.created_at),
        updated_at=_iso(r.updated_at),
    )


def _trial_from_orm(r: TrialMembershipORM) -> TrialMembership:
    return TrialMembership(
        id=r.id,
        guest_name=r.guest_name,
        guest_email=r.guest_email or "",
        guest_phone=r.guest_phone or "",
        referred_by_family_id=r.referred_by_family_id,
        trial_type=TrialMembershipType(r.trial_type),
        start_date=r.start_date,
        end_date=r.end_date,
        status=TrialMembershipStatus(r.status),
        privileges=list(r.privileges or []),
        notes=r.notes or "",
        created_at=_iso(r.created_at),
        updated_at=_iso(r.updated_at),
    )


def _iso(dt: datetime | None) -> str:
    """datetime tz-aware → str ISO (el in-memory guardaba strings)."""
    return dt.isoformat() if dt is not None else ""


async def _load_guests(s: Any) -> list[GuestORM]:
    return list((await s.execute(select(GuestORM))).scalars().all())


async def _load_events(s: Any) -> list[PrivateEventORM]:
    return list((await s.execute(select(PrivateEventORM))).scalars().all())


async def _load_trials(s: Any) -> list[TrialMembershipORM]:
    return list(
        (await s.execute(select(TrialMembershipORM))).scalars().all()
    )


class GuestManagementRepository:
    """Repo ORM async — contrato EXACTO del in-memory (18 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Guests ─────────────────────────────────────────────

    async def create_guest(self, data: CreateGuest) -> Guest:
        gid = _gen_id()
        now = datetime.now(tz=UTC)
        d = data.model_dump()
        record = GuestORM(
            id=gid,
            family_id=d["family_id"],
            host_member_id=d["host_member_id"],
            guest_name=d["guest_name"],
            guest_email=d.get("guest_email", "") or "",
            guest_phone=d.get("guest_phone", "") or "",
            visit_date=d["visit_date"],
            purpose=d.get("purpose", "") or "",
            status=GuestStatus.REGISTERED.value,
            privileges=list(d.get("privileges", []) or []),
            notes=d.get("notes", "") or "",
            visit_count=1,
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return _guest_from_orm(record)

    async def get_guest(self, guest_id: str) -> Guest | None:
        async with session_scope(self._engine) as s:
            r = await s.get(GuestORM, guest_id)
            if r is None:
                return None
            return _guest_from_orm(r)

    async def list_guests(
        self,
        family_id: str = "",
        visit_date: str = "",
        status: str = "",
    ) -> list[Guest]:
        async with session_scope(self._engine) as s:
            stmt = select(GuestORM)
            if family_id:
                stmt = stmt.where(GuestORM.family_id == family_id)
            if visit_date:
                stmt = stmt.where(GuestORM.visit_date == visit_date)
            if status:
                stmt = stmt.where(GuestORM.status == status)
            rows = list((await s.execute(stmt)).scalars().all())
            return [_guest_from_orm(r) for r in rows]

    async def update_guest(
        self, guest_id: str, updates: dict[str, Any]
    ) -> Guest | None:
        async with session_scope(self._engine) as s:
            r = await s.get(GuestORM, guest_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key not in _GUEST_COLUMNS:
                    continue
                setattr(r, key, _plain(val))
            r.updated_at = datetime.now(tz=UTC)
            return _guest_from_orm(r)

    # ── Private Events ─────────────────────────────────────

    async def create_private_event(
        self, data: CreatePrivateEvent
    ) -> PrivateEvent:
        eid = _gen_id()
        now = datetime.now(tz=UTC)
        d = data.model_dump()
        record = PrivateEventORM(
            id=eid,
            family_id=d["family_id"],
            event_name=d["event_name"],
            event_type=_plain(d["event_type"]),
            venue=d["venue"],
            date=d["date"],
            start_time=d.get("start_time", "") or "",
            end_time=d.get("end_time", "") or "",
            guest_count=d.get("guest_count", 0) or 0,
            budget=float(d.get("budget", 0.0) or 0.0),
            estimated_cost=0.0,
            status=PrivateEventStatus.INQUIRY.value,
            coordinator_member_id=d.get("coordinator_member_id", "") or "",
            description=d.get("description", "") or "",
            special_requirements=d.get("special_requirements", "") or "",
            catering_required=bool(d.get("catering_required", False)),
            decoration_required=bool(d.get("decoration_required", False)),
            entertainment_required=bool(d.get("entertainment_required", False)),
            notes=d.get("notes", "") or "",
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return _event_from_orm(record)

    async def get_private_event(
        self, event_id: str
    ) -> PrivateEvent | None:
        async with session_scope(self._engine) as s:
            r = await s.get(PrivateEventORM, event_id)
            if r is None:
                return None
            return _event_from_orm(r)

    async def list_private_events(
        self,
        family_id: str = "",
        status: str = "",
        event_type: str = "",
    ) -> list[PrivateEvent]:
        async with session_scope(self._engine) as s:
            stmt = select(PrivateEventORM)
            if family_id:
                stmt = stmt.where(PrivateEventORM.family_id == family_id)
            if status:
                stmt = stmt.where(PrivateEventORM.status == status)
            if event_type:
                stmt = stmt.where(PrivateEventORM.event_type == event_type)
            rows = list((await s.execute(stmt)).scalars().all())
            return [_event_from_orm(r) for r in rows]

    async def update_private_event(
        self, event_id: str, updates: dict[str, Any]
    ) -> PrivateEvent | None:
        async with session_scope(self._engine) as s:
            r = await s.get(PrivateEventORM, event_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key not in _EVENT_COLUMNS:
                    continue
                setattr(r, key, _plain(val))
            r.updated_at = datetime.now(tz=UTC)
            return _event_from_orm(r)

    # ── Trial Memberships ──────────────────────────────────

    async def create_trial_membership(
        self, data: CreateTrialMembership
    ) -> TrialMembership:
        tid = _gen_id()
        now = datetime.now(tz=UTC)
        d = data.model_dump()
        record = TrialMembershipORM(
            id=tid,
            guest_name=d["guest_name"],
            guest_email=d.get("guest_email", "") or "",
            guest_phone=d.get("guest_phone", "") or "",
            referred_by_family_id=d["referred_by_family_id"],
            trial_type=_plain(d["trial_type"]),
            start_date=d["start_date"],
            end_date=d["end_date"],
            status=TrialMembershipStatus.PENDING_APPROVAL.value,
            privileges=list(d.get("privileges", []) or []),
            notes=d.get("notes", "") or "",
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return _trial_from_orm(record)

    async def get_trial_membership(
        self, trial_id: str
    ) -> TrialMembership | None:
        async with session_scope(self._engine) as s:
            r = await s.get(TrialMembershipORM, trial_id)
            if r is None:
                return None
            return _trial_from_orm(r)

    async def list_trial_memberships(
        self,
        referred_by_family_id: str = "",
        status: str = "",
        trial_type: str = "",
    ) -> list[TrialMembership]:
        async with session_scope(self._engine) as s:
            stmt = select(TrialMembershipORM)
            if referred_by_family_id:
                stmt = stmt.where(
                    TrialMembershipORM.referred_by_family_id
                    == referred_by_family_id
                )
            if status:
                stmt = stmt.where(TrialMembershipORM.status == status)
            if trial_type:
                stmt = stmt.where(TrialMembershipORM.trial_type == trial_type)
            rows = list((await s.execute(stmt)).scalars().all())
            return [_trial_from_orm(r) for r in rows]

    async def update_trial_membership(
        self, trial_id: str, updates: dict[str, Any]
    ) -> TrialMembership | None:
        async with session_scope(self._engine) as s:
            r = await s.get(TrialMembershipORM, trial_id)
            if r is None:
                return None
            for key, val in updates.items():
                if key not in _TRIAL_COLUMNS:
                    continue
                setattr(r, key, _plain(val))
            r.updated_at = datetime.now(tz=UTC)
            return _trial_from_orm(r)

    # ── Analytics ──────────────────────────────────────────

    async def get_guest_analytics(self, family_id: str = "") -> dict[str, Any]:
        guests = await self.list_guests(family_id=family_id)
        events = await self.list_private_events(family_id=family_id)
        trials = (
            await self.list_trial_memberships(
                referred_by_family_id=family_id
            )
            if family_id
            else await self.list_trial_memberships()
        )

        active_guests = [
            g
            for g in guests
            if g.status
            in (GuestStatus.REGISTERED, GuestStatus.CHECKED_IN)
        ]
        upcoming_events = [
            e
            for e in events
            if e.status
            not in (PrivateEventStatus.COMPLETED, PrivateEventStatus.CANCELLED)
        ]
        active_trials = [
            t
            for t in trials
            if t.status
            in (TrialMembershipStatus.ACTIVE, TrialMembershipStatus.APPROVED)
        ]
        converted_trials = [
            t
            for t in trials
            if t.status == TrialMembershipStatus.CONVERTED
        ]

        purpose_counts: dict[str, int] = {}
        for g in guests:
            p = g.purpose or "sin_proposito"
            purpose_counts[p] = purpose_counts.get(p, 0) + 1
        purpose_items: list[dict[str, Any]] = [
            {"purpose": k, "count": v}
            for k, v in purpose_counts.items()
        ]
        top_purposes = sorted(
            purpose_items,
            key=lambda x: x["count"],
            reverse=True,
        )[:5]

        return {
            "total_guests": len(guests),
            "active_guests": len(active_guests),
            "total_private_events": len(events),
            "upcoming_events": len(upcoming_events),
            "total_trial_memberships": len(trials),
            "active_trials": len(active_trials),
            "converted_trials": len(converted_trials),
            "top_purposes": top_purposes,
        }

    # ── Intelligence (compute-on-read) ────────────────────

    async def get_health_score(self) -> GuestHealthScore:
        async with session_scope(self._engine) as s:
            guests = await _load_guests(s)
            trials = await _load_trials(s)
            events = await _load_events(s)
            snapshots = await _load_snapshots(s)
            factors = self._compute_health_factors(guests, trials, events)
            total = round(sum(f.weighted_score for f in factors), 1)
            level = (
                GuestHealthLevel.EXCELLENT if total >= 85
                else GuestHealthLevel.HEALTHY if total >= 65
                else GuestHealthLevel.ATTENTION if total >= 45
                else GuestHealthLevel.CRITICAL
            )
            trend = _compute_guest_trend(snapshots)
            critical = [f for f in factors if f.impact == "high"]
            summary = (
                f"Score {total}/100 ({level.value}). "
                f"{len(critical)} factor(es) críticos: "
                f"{', '.join(f.name for f in critical)}"
                if critical
                else f"Score {total}/100 ({level.value}). Todos los factores saludables."
            )
            return GuestHealthScore(
                score=int(total), level=level, factors=factors,
                trend=trend, summary=summary,
            )

    async def get_conversion_funnel(self) -> ConversionFunnel:
        async with session_scope(self._engine) as s:
            guests = await _load_guests(s)
            trials = await _load_trials(s)
            return self._build_funnel(guests, trials)

    async def get_analytics_enhanced(
        self, family_id: str = ""
    ) -> GuestAnalyticsEnhanced:
        base = await self.get_guest_analytics(family_id=family_id)
        async with session_scope(self._engine) as s:
            snapshots = await _load_snapshots(s)
            trials = await _load_trials(s)
            guests = await _load_guests(s)
            events = await _load_events(s)

            temporal: list[GuestTemporalTrend] = []
            for row in snapshots:
                temporal.append(GuestTemporalTrend(
                    month=row.month,
                    new_guests=row.new_guests,
                    check_ins=row.check_ins,
                    trials_created=row.trials,
                    trials_converted=row.conversions,
                    private_events=row.events,
                ))

            total_guests = base.get("total_guests", 0)
            total_trials = base.get("total_trial_memberships", 0)
            converted = base.get("converted_trials", 0)
            guest_to_trial = round(total_trials / max(total_guests, 1) * 100, 1)
            trial_to_member = round(converted / max(total_trials, 1) * 100, 1)

            family_referrals: dict[str, dict[str, int]] = {}
            for t in trials:
                fid = t.referred_by_family_id or ""
                if not fid:
                    continue
                ref = family_referrals.setdefault(fid, {"referral_count": 0, "converted_count": 0})
                ref["referral_count"] += 1
                if t.status == TrialMembershipStatus.CONVERTED:
                    ref["converted_count"] += 1
            referrer_items: list[dict[str, Any]] = [
                {"family_id": fid, **counts}
                for fid, counts in family_referrals.items()
            ]
            top_referrers = sorted(
                referrer_items,
                key=lambda x: int(x["converted_count"]),
                reverse=True,
            )[:5]

            priv_counts: dict[str, dict[str, Any]] = {}
            for g in guests:
                for p in g.privileges:
                    entry = priv_counts.setdefault(p, {"usage_count": 0, "guests": set()})
                    entry["usage_count"] += 1
                    entry["guests"].add(g.id)
            priv_items: list[dict[str, Any]] = [
                {"privilege_type": k, "usage_count": v["usage_count"],
                 "unique_guests": len(v["guests"])}
                for k, v in priv_counts.items()
            ]
            privilege_usage = sorted(
                priv_items,
                key=lambda x: int(x["usage_count"]),
                reverse=True,
            )

            day_counts: dict[str, int] = {}
            for g in guests:
                vd = g.visit_date or ""
                if vd:
                    day_counts[vd] = day_counts.get(vd, 0) + 1
            day_items: list[dict[str, Any]] = [
                {"day": d, "visit_count": c}
                for d, c in day_counts.items()
            ]
            peak_days = sorted(
                day_items,
                key=lambda x: int(x["visit_count"]),
                reverse=True,
            )[:5]

            event_type_guests: dict[str, dict[str, Any]] = {}
            for e in events:
                et = e.event_type
                entry = event_type_guests.setdefault(et, {"total_guests": 0, "total_events": 0})
                entry["total_guests"] += e.guest_count
                entry["total_events"] += 1
            event_correlation = [
                {"event_type": et, "avg_guests_generated": round(d["total_guests"] / max(d["total_events"], 1)),
                 "total_events": d["total_events"]}
                for et, d in event_type_guests.items()
            ]

            return GuestAnalyticsEnhanced(
                total_guests=base.get("total_guests", 0),
                active_guests=base.get("active_guests", 0),
                total_private_events=base.get("total_private_events", 0),
                upcoming_events=base.get("upcoming_events", 0),
                total_trial_memberships=base.get("total_trial_memberships", 0),
                active_trials=base.get("active_trials", 0),
                converted_trials=converted,
                guest_to_trial_rate=guest_to_trial,
                trial_to_member_rate=trial_to_member,
                temporal_trends=temporal,
                top_referrers=top_referrers,
                privilege_usage=privilege_usage,
                peak_visit_days=peak_days,
                event_guest_correlation=event_correlation,
                top_purposes=base.get("top_purposes", []),
            )

    async def get_guest_demand_forecast(self) -> GuestDemandForecast:
        async with session_scope(self._engine) as s:
            snapshots = await _load_snapshots(s)
            events = await _load_events(s)
            trials = await _load_trials(s)
            return self._build_forecast(snapshots, events, trials)

    async def generate_engagement_proposals(self) -> GuestEngagementProposalList:
        async with session_scope(self._engine) as s:
            guests = await _load_guests(s)
            trials = await _load_trials(s)
            events = await _load_events(s)
            return self._build_proposals(guests, trials, events)

    # ── Internal Helpers (compute-on-read, MISMA aritmética) ──

    def _compute_health_factors(
        self,
        guests: list[GuestORM],
        trials: list[TrialMembershipORM],
        events: list[PrivateEventORM],
    ) -> list[GuestHealthFactor]:
        """Compute 5 weighted health factors — aritmética del in-memory."""
        factors: list[GuestHealthFactor] = []

        # Factor 1: Guest Volume (weight 0.20)
        total_guests = len(guests)
        active = sum(1 for g in guests
                     if g.status in (GuestStatus.REGISTERED.value, GuestStatus.CHECKED_IN.value))
        volume_score = min(100, total_guests * 3)
        factors.append(GuestHealthFactor(
            name="Guest Volume",
            score=round(volume_score, 1),
            weight=0.20,
            weighted_score=round(volume_score * 0.20, 1),
            impact="high" if volume_score < 40 else "medium" if volume_score < 70 else "low",
            detail=f"{total_guests} guests totales, {active} activos",
        ))

        # Factor 2: Conversion Rate (weight 0.25)
        total_trials = len(trials)
        converted = sum(1 for t in trials
                        if t.status == TrialMembershipStatus.CONVERTED.value)
        conv_rate = converted / max(total_trials, 1) * 100
        conv_score = min(100, conv_rate * 4)
        factors.append(GuestHealthFactor(
            name="Conversion Rate",
            score=round(conv_score, 1),
            weight=0.25,
            weighted_score=round(conv_score * 0.25, 1),
            impact="high" if conv_score < 40 else "medium" if conv_score < 60 else "low",
            detail=f"{conv_rate:.0f}% trial→member ({converted}/{total_trials})",
        ))

        # Factor 3: Repeat Visit Rate (weight 0.20)
        repeat = sum(1 for g in guests if g.visit_count > 1)
        repeat_rate = repeat / max(total_guests, 1) * 100
        repeat_score = min(100, repeat_rate * 2)
        factors.append(GuestHealthFactor(
            name="Repeat Visit Rate",
            score=round(repeat_score, 1),
            weight=0.20,
            weighted_score=round(repeat_score * 0.20, 1),
            impact="high" if repeat_score < 30 else "medium" if repeat_score < 50 else "low",
            detail=f"{repeat_rate:.0f}% visitantes recurrentes ({repeat}/{total_guests})",
        ))

        # Factor 4: Referral Strength (weight 0.20)
        ref_count = len({t.referred_by_family_id
                         for t in trials
                         if t.referred_by_family_id})
        ref_score = min(100, ref_count * 15)
        factors.append(GuestHealthFactor(
            name="Referral Strength",
            score=round(ref_score, 1),
            weight=0.20,
            weighted_score=round(ref_score * 0.20, 1),
            impact="high" if ref_score < 30 else "medium" if ref_score < 60 else "low",
            detail=f"{ref_count} familias referidoras activas",
        ))

        # Factor 5: Event Pipeline (weight 0.15)
        upcoming = sum(1 for e in events
                       if e.status not in (PrivateEventStatus.COMPLETED.value,
                                           PrivateEventStatus.CANCELLED.value))
        event_score = min(100, upcoming * 25)
        factors.append(GuestHealthFactor(
            name="Event Pipeline",
            score=round(event_score, 1),
            weight=0.15,
            weighted_score=round(event_score * 0.15, 1),
            impact="high" if event_score < 25 else "medium" if event_score < 50 else "low",
            detail=f"{upcoming} eventos privados en pipeline",
        ))

        return factors

    def _build_funnel(
        self,
        guests: list[GuestORM],
        trials: list[TrialMembershipORM],
    ) -> ConversionFunnel:
        """5-stage funnel — aritmética del in-memory byte a byte."""
        total_guests = len(guests)
        checked_in = [g for g in guests if g.status in (
            GuestStatus.CHECKED_IN.value, GuestStatus.COMPLETED.value
        )]
        repeat = [g for g in guests if g.visit_count > 1]
        trial_applicants = len(trials)
        converted = [t for t in trials if t.status == TrialMembershipStatus.CONVERTED.value]

        stages = [
            ConversionFunnelStage(
                stage=ConversionStage.GUEST_REGISTERED,
                label="Invitados Registrados",
                count=total_guests,
                rate_pct=100.0,
                cumulative_rate_pct=100.0,
                avg_days_in_stage=0,
                dropoff_count=0,
                benchmark_rate_pct=100.0,
                vs_benchmark=0.0,
            ),
            ConversionFunnelStage(
                stage=ConversionStage.GUEST_CHECKED_IN,
                label="Check-in Realizado",
                count=len(checked_in),
                rate_pct=round(len(checked_in) / max(total_guests, 1) * 100, 1),
                cumulative_rate_pct=round(len(checked_in) / max(total_guests, 1) * 100, 1),
                avg_days_in_stage=1.5,
                dropoff_count=total_guests - len(checked_in),
                benchmark_rate_pct=75.0,
                vs_benchmark=round(len(checked_in) / max(total_guests, 1) * 100 - 75, 1),
            ),
            ConversionFunnelStage(
                stage=ConversionStage.REPEAT_GUEST,
                label="Visita Recurrente (2+)",
                count=len(repeat),
                rate_pct=round(len(repeat) / max(len(checked_in), 1) * 100, 1),
                cumulative_rate_pct=round(len(repeat) / max(total_guests, 1) * 100, 1),
                avg_days_in_stage=30,
                dropoff_count=len(checked_in) - len(repeat),
                benchmark_rate_pct=40.0,
                vs_benchmark=round(len(repeat) / max(len(checked_in), 1) * 100 - 40, 1),
            ),
            ConversionFunnelStage(
                stage=ConversionStage.TRIAL_APPLICANT,
                label="Aplicaron Trial",
                count=trial_applicants,
                rate_pct=round(trial_applicants / max(len(repeat), 1) * 100, 1),
                cumulative_rate_pct=round(trial_applicants / max(total_guests, 1) * 100, 1),
                avg_days_in_stage=14,
                dropoff_count=len(repeat) - trial_applicants,
                benchmark_rate_pct=25.0,
                vs_benchmark=round(trial_applicants / max(len(repeat), 1) * 100 - 25, 1),
            ),
            ConversionFunnelStage(
                stage=ConversionStage.CONVERTED_MEMBER,
                label="Miembros Convertidos",
                count=len(converted),
                rate_pct=round(len(converted) / max(trial_applicants, 1) * 100, 1),
                cumulative_rate_pct=round(len(converted) / max(total_guests, 1) * 100, 1),
                avg_days_in_stage=21,
                dropoff_count=trial_applicants - len(converted),
                benchmark_rate_pct=25.0,
                vs_benchmark=round(len(converted) / max(trial_applicants, 1) * 100 - 25, 1),
            ),
        ]

        overall = round(len(converted) / max(total_guests, 1) * 100, 1)
        active_trials = [t for t in trials if t.status in (
            TrialMembershipStatus.ACTIVE.value,
            TrialMembershipStatus.APPROVED.value,
            TrialMembershipStatus.PENDING_APPROVAL.value,
        )]
        pipeline_value = len(active_trials) * 350000 + len(repeat) * 50000

        return ConversionFunnel(
            stages=stages,
            overall_conversion_pct=overall,
            overall_benchmark_pct=5.0,
            total_guests=total_guests,
            total_converted=len(converted),
            pipeline_value=pipeline_value,
        )

    def _build_forecast(
        self,
        snapshots: list[GuestMonthlySnapshotORM],
        events: list[PrivateEventORM],
        trials: list[TrialMembershipORM],
    ) -> GuestDemandForecast:
        """Demand forecast — aritmética del in-memory byte a byte."""
        snapshot_map = {row.month: row for row in snapshots}
        sorted_m = sorted(snapshot_map.keys())
        forecasts: list[GuestForecastItem] = []

        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]

            guest_values = [snapshot_map[m].new_guests for m in last_3]
            gv_current = guest_values[-1]
            gv_delta = (guest_values[-1] - guest_values[0]) / max(len(guest_values) - 1, 1)
            gv_predicted = max(0, round(gv_current + gv_delta * 3))
            gv_change = round((gv_predicted - gv_current) / max(gv_current, 1) * 100, 1)
            gv_confidence = round(max(0.3, min(0.9, 1.0 - abs(gv_delta) / max(gv_current, 1))), 2)

            forecasts.append(GuestForecastItem(
                metric="guest_volume",
                current_value=gv_current,
                predicted_value=gv_predicted,
                change_pct=gv_change,
                confidence=gv_confidence,
                trend="improving" if gv_change > 5 else "declining" if gv_change < -5 else "stable",
                period="Q3 2026",
                factors=["tendencia 6 meses", "eventos pipeline", "estacionalidad CR"],
            ))

            trial_values = [snapshot_map[m].trials for m in last_3]
            tv_current = trial_values[-1]
            tv_delta = (trial_values[-1] - trial_values[0]) / max(len(trial_values) - 1, 1)
            tv_predicted = max(0, round(tv_current + tv_delta * 3))

            forecasts.append(GuestForecastItem(
                metric="trial_demand",
                current_value=tv_current,
                predicted_value=tv_predicted,
                change_pct=round((tv_predicted - tv_current) / max(tv_current, 1) * 100, 1),
                confidence=0.6,
                trend="stable",
                period="Q3 2026",
                factors=["pipeline de guests", "eventos privados"],
            ))

            conv_values = [snapshot_map[m].conversions for m in last_3]
            trial_v = [snapshot_map[m].trials for m in last_3]
            conv_rates = [round(c / max(t, 1) * 100, 1) for c, t in zip(conv_values, trial_v, strict=False)]
            cr_current = conv_rates[-1] if conv_rates else 0
            cr_delta = (conv_rates[-1] - conv_rates[0]) / max(len(conv_rates) - 1, 1) if len(conv_rates) > 1 else 0
            cr_predicted = round(max(0, min(100, cr_current + cr_delta * 3)), 1)

            forecasts.append(GuestForecastItem(
                metric="conversion_rate",
                current_value=cr_current,
                predicted_value=cr_predicted,
                change_pct=round(cr_predicted - cr_current, 1),
                confidence=0.5,
                trend="stable",
                period="Q3 2026",
                factors=["calidad de leads", "follow-up process"],
            ))

        upcoming = [e for e in events
                    if e.status not in (PrivateEventStatus.COMPLETED.value,
                                        PrivateEventStatus.CANCELLED.value)]
        event_forecast = GuestForecastItem(
            metric="event_pipeline",
            current_value=len(upcoming),
            predicted_value=round(len(upcoming) * 1.15),
            change_pct=15.0,
            confidence=0.65,
            trend="improving",
            period="Q3 2026",
            factors=["eventos confirmados", "consultas pendientes", "estacionalidad bodas"],
        )
        forecasts.append(event_forecast)

        active_trials = sum(1 for t in trials
                           if t.status in (TrialMembershipStatus.ACTIVE.value,
                                           TrialMembershipStatus.APPROVED.value))
        trial_cap_needed = round(active_trials * 1.3) + sum(
            1 for f in forecasts if f.metric == "trial_demand"
        )

        peak_months = ["Diciembre", "Marzo", "Abril", "Julio"]

        return GuestDemandForecast(
            forecasts=forecasts,
            trial_capacity_needed=trial_cap_needed if trial_cap_needed > 0 else 5,
            seasonal_multiplier=1.15,
            peak_months=peak_months,
            forecast_horizon_months=3,
            data_quality_note="Basado en 6 meses de data demo. Re-entrenar con data real.",
        )

    def _build_proposals(
        self,
        guests: list[GuestORM],
        trials: list[TrialMembershipORM],
        events: list[PrivateEventORM],
    ) -> GuestEngagementProposalList:
        """P1-P5 proposals — aritmética del in-memory byte a byte."""
        proposals: list[GuestEngagementProposal] = []

        # ── P1: Hot leads (5+ visits, no trial) ──
        hot_leads = []
        for g in guests:
            visits = g.visit_count
            if visits >= 5:
                has_trial = any(
                    t.referred_by_family_id == g.family_id
                    and t.guest_name == g.guest_name
                    for t in trials
                )
                if not has_trial:
                    hot_leads.append(g)

        for lead in hot_leads:
            proposals.append(GuestEngagementProposal(
                proposal_type=GuestProposalType.TRIAL_INVITATION,
                title=f"Invitar a trial: {lead.guest_name}",
                description=(
                    f"{lead.guest_name} ha visitado {lead.visit_count} veces "
                    f"sin aplicar a trial. Alto potencial de conversión. "
                    f"Proponer invitación personalizada a membresía de prueba."
                ),
                target_family_id=lead.family_id,
                target_guest_ids=[lead.id],
                priority="high",
                impact="high",
                confidence=0.85,
                cross_domain_signals=[
                    f"Guest recurrente: {lead.visit_count} visitas",
                    f"Propósito: {lead.purpose or 'social'}",
                    "Sin trial — oportunidad de conversión directa",
                ],
                suggested_action={
                    "action": "send_trial_invitation",
                    "domain": "communication",
                    "params": {
                        "guest_id": lead.id,
                        "family_id": lead.family_id,
                        "trial_type": "month_trial",
                    },
                },
            ))

        # ── P2: Active trials without follow-up ──
        for t in trials:
            if t.status in (
                TrialMembershipStatus.ACTIVE.value,
                TrialMembershipStatus.APPROVED.value,
            ):
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.FOLLOW_UP_CAMPAIGN,
                    title=f"Follow-up trial: {t.guest_name}",
                    description=(
                        f"Trial de {t.guest_name} ({t.trial_type}) "
                        f"activo. Programar seguimiento para evaluar "
                        f"experiencia y facilitar conversión a membresía."
                    ),
                    target_family_id=t.referred_by_family_id,
                    target_guest_ids=[t.id],
                    priority="medium",
                    impact="high",
                    confidence=0.75,
                    cross_domain_signals=[
                        f"Trial activo: {t.trial_type}",
                        "Ventana de conversión abierta",
                    ],
                    suggested_action={
                        "action": "schedule_trial_followup",
                        "domain": "communication",
                        "params": {"trial_id": t.id},
                    },
                ))

        # ── P3: Top referrers inactive >60 days ──
        family_last_referral: dict[str, str] = {}
        for t in trials:
            fid = t.referred_by_family_id or ""
            created_raw = _iso(t.created_at) if t.created_at else ""
            created = created_raw[:10]
            if fid and created and (
                fid not in family_last_referral
                or created > family_last_referral[fid]
            ):
                family_last_referral[fid] = created

        family_ref_count: dict[str, int] = {}
        for t in trials:
            fid = t.referred_by_family_id or ""
            if fid:
                family_ref_count[fid] = family_ref_count.get(fid, 0) + 1

        top_ref_families = [fid for fid, cnt in family_ref_count.items() if cnt >= 2]
        for fid in top_ref_families:
            last = family_last_referral.get(fid, "")
            if last and last < "2026-04-01":
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.REFERRAL_ACTIVATION,
                    title=f"Reactivar referidor: Familia {fid}",
                    description=(
                        f"Familia {fid} fue referidor activo "
                        f"({family_ref_count[fid]} referidos) "
                        f"pero no ha referido desde {last}. "
                        f"Activar con programa de incentivos."
                    ),
                    target_family_id=fid,
                    priority="medium",
                    impact="medium",
                    confidence=0.70,
                    cross_domain_signals=[
                        f"Top referidor inactivo: {family_ref_count[fid]} referidos históricos",
                        "Programa de referral incentives",
                    ],
                    suggested_action={
                        "action": "send_referral_incentive",
                        "domain": "communication",
                        "params": {"family_id": fid},
                    },
                ))

        # ── P4: Privilege expansion for active guests ──
        priv_usage: dict[str, int] = {}
        for g in guests:
            for p in g.privileges or []:
                priv_usage[p] = priv_usage.get(p, 0) + 1

        if priv_usage:
            top_priv = max(priv_usage, key=lambda k: priv_usage[k])
            unused_privs = [p.value for p in GuestPrivilegeType if p.value not in priv_usage]
            if unused_privs and priv_usage.get(top_priv, 0) > 5:
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.PRIVILEGE_EXPANSION,
                    title="Expandir privilegios subutilizados",
                    description=(
                        f"El privilegio '{top_priv}' es el más usado "
                        f"({priv_usage[top_priv]} usos). "
                        f"Privilegios como {', '.join(unused_privs[:3])} "
                        f"no se están ofreciendo. Proponer paquetes "
                        f"de privilegios ampliados para aumentar "
                        f"el valor percibido del club."
                    ),
                    priority="low",
                    impact="medium",
                    confidence=0.65,
                    cross_domain_signals=[
                        f"Privilegios desbalanceados: {top_priv} domina",
                        "Oportunidad: cross-sell de áreas subutilizadas",
                    ],
                    suggested_action={
                        "action": "expand_privilege_offering",
                        "domain": "guest_management",
                        "params": {"expand_to": unused_privs[:3]},
                    },
                ))

        # ── P5: Private event → guest conversion opportunity ──
        for e in events:
            if e.status in (
                PrivateEventStatus.APPROVED.value,
                PrivateEventStatus.CONTRACTED.value,
            ) and e.guest_count > 80:
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.EVENT_OUTREACH,
                    title=f"Lead generation: {e.event_name}",
                    description=(
                        f"Evento '{e.event_name}' tendrá "
                        f"{e.guest_count} invitados. "
                        f"Muchos serán nuevos para el club. "
                        f"Proponer: welcome packages, tours, "
                        f"y trial offers para asistentes."
                    ),
                    target_family_id=e.family_id,
                    priority="medium",
                    impact="high",
                    confidence=0.80,
                    cross_domain_signals=[
                        f"Evento grande: {e.guest_count} invitados",
                        f"Tipo: {e.event_type} → potencial nuevos guests",
                        "Lead generation opportunity",
                    ],
                    suggested_action={
                        "action": "prepare_event_outreach",
                        "domain": "communication",
                        "params": {
                            "event_id": e.id,
                            "guest_count": e.guest_count,
                        },
                    },
                ))

        high_count = sum(1 for p in proposals if p.priority == "high")
        cross_count = sum(1 for p in proposals if len(p.cross_domain_signals) > 1)

        return GuestEngagementProposalList(
            proposals=proposals,
            total=len(proposals),
            high_priority_count=high_count,
            cross_domain_count=cross_count,
        )


def _compute_guest_trend(snapshots: list[GuestMonthlySnapshotORM]) -> str:
    """Overall trend from last 3 months — aritmética del in-memory."""
    sorted_m = sorted(snapshots, key=lambda r: r.month)[-3:]
    if len(sorted_m) < 2:
        return "stable"
    totals = []
    for row in sorted_m:
        totals.append(row.new_guests + row.check_ins)
    if totals[-1] > totals[0] * 1.05:
        return "improving"
    elif totals[-1] < totals[0] * 0.95:
        return "declining"
    return "stable"


async def _load_snapshots(s: Any) -> list[GuestMonthlySnapshotORM]:
    return list(
        (await s.execute(select(GuestMonthlySnapshotORM))).scalars().all()
    )
