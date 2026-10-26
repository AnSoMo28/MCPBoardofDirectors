"""
In-memory repository for Cultural & Social domain.
Club: Castillo Country Club
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

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
    PerformanceStatus,
    ProgramStatus,
)

logger = logging.getLogger(__name__)


class CulturalSocialRepository:
    """In-memory CRUD repository for cultural & social domain."""

    def __init__(self) -> None:
        self._events: dict[str, dict] = {}
        self._acts: dict[str, dict] = {}
        self._programs: dict[str, dict] = {}
        self._exhibitions: dict[str, dict] = {}

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Cultural Events ─────────────────────────────────

    async def create_event(self, data: CreateCulturalEvent) -> CulturalEvent:
        eid = self._gen_id()
        record = {
            "id": eid,
            "name": data.name,
            "event_type": data.event_type,
            "status": EventStatus.PLANNED,
            "formality": data.formality,
            "venue": data.venue,
            "venue_type": data.venue_type,
            "date": data.date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "organizer_member_id": data.organizer_member_id,
            "description": data.description,
            "guest_count": data.guest_count,
            "budget": data.budget,
            "menu_theme": data.menu_theme,
            "dress_code": data.dress_code,
            "entertainment_ids": [],
            "notes": data.notes,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        self._events[eid] = record
        logger.info("[cultural_social] Event created: %s (%s)", data.name, eid)
        return CulturalEvent(**record)

    async def get_event(self, event_id: str) -> Optional[CulturalEvent]:
        record = self._events.get(event_id)
        if record is None:
            return None
        return CulturalEvent(**record)

    async def update_event(
        self, event_id: str, updates: dict
    ) -> Optional[CulturalEvent]:
        record = self._events.get(event_id)
        if record is None:
            return None
        record.update(updates)
        self._events[event_id] = record
        return CulturalEvent(**record)

    async def list_events(
        self,
        event_type: Optional[EventType] = None,
        status: Optional[EventStatus] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> list[CulturalEvent]:
        results: list[CulturalEvent] = []
        for record in self._events.values():
            if event_type and record["event_type"] != event_type:
                continue
            if status and record["status"] != status:
                continue
            if date_from and record["date"] < date_from:
                continue
            if date_to and record["date"] > date_to:
                continue
            results.append(CulturalEvent(**record))
        return results

    async def cancel_event(self, event_id: str) -> Optional[CulturalEvent]:
        return await self.update_event(event_id, {"status": EventStatus.CANCELLED})

    # ── Entertainment Acts ──────────────────────────────

    async def create_act(self, data: CreateEntertainmentAct) -> EntertainmentAct:
        aid = self._gen_id()
        record = {
            "id": aid,
            "artist_name": data.artist_name,
            "entertainment_type": data.entertainment_type,
            "status": PerformanceStatus.PROPOSED,
            "genre": data.genre,
            "description": data.description,
            "duration_minutes": data.duration_minutes,
            "cost": data.cost,
            "contact_person": data.contact_person,
            "contact_phone": data.contact_phone,
            "requirements": data.requirements,
            "event_id": None,
            "notes": data.notes,
        }
        self._acts[aid] = record
        logger.info(
            "[cultural_social] Entertainment act created: %s (%s)",
            data.artist_name,
            aid,
        )
        return EntertainmentAct(**record)

    async def get_act(self, act_id: str) -> Optional[EntertainmentAct]:
        record = self._acts.get(act_id)
        if record is None:
            return None
        return EntertainmentAct(**record)

    async def update_act(
        self, act_id: str, updates: dict
    ) -> Optional[EntertainmentAct]:
        record = self._acts.get(act_id)
        if record is None:
            return None
        record.update(updates)
        self._acts[act_id] = record
        return EntertainmentAct(**record)

    async def list_acts(
        self,
        entertainment_type: Optional[EntertainmentType] = None,
    ) -> list[EntertainmentAct]:
        results: list[EntertainmentAct] = []
        for record in self._acts.values():
            if entertainment_type and record["entertainment_type"] != entertainment_type:
                continue
            results.append(EntertainmentAct(**record))
        return results

    # ── Cultural Programs ───────────────────────────────

    async def create_program(self, data: CreateCulturalProgram) -> CulturalProgram:
        pid = self._gen_id()
        record = {
            "id": pid,
            "name": data.name,
            "category": data.category,
            "description": data.description,
            "season": data.season,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "coordinator_member_id": data.coordinator_member_id,
            "max_participants": data.max_participants,
            "current_participants": 0,
            "budget": data.budget,
            "status": ProgramStatus.DRAFT,
            "event_ids": [],
            "notes": data.notes,
        }
        self._programs[pid] = record
        logger.info("[cultural_social] Program created: %s (%s)", data.name, pid)
        return CulturalProgram(**record)

    async def get_program(self, program_id: str) -> Optional[CulturalProgram]:
        record = self._programs.get(program_id)
        if record is None:
            return None
        return CulturalProgram(**record)

    async def update_program(
        self, program_id: str, updates: dict
    ) -> Optional[CulturalProgram]:
        record = self._programs.get(program_id)
        if record is None:
            return None
        record.update(updates)
        self._programs[program_id] = record
        return CulturalProgram(**record)

    async def list_programs(
        self,
        category: Optional[CulturalCategory] = None,
        season: Optional[str] = None,
    ) -> list[CulturalProgram]:
        results: list[CulturalProgram] = []
        for record in self._programs.values():
            if category and record["category"] != category:
                continue
            if season and record["season"] != season:
                continue
            results.append(CulturalProgram(**record))
        return results

    # ── Art Exhibitions ─────────────────────────────────

    async def create_exhibition(self, data: CreateArtExhibition) -> ArtExhibition:
        xid = self._gen_id()
        record = {
            "id": xid,
            "title": data.title,
            "artist_name": data.artist_name,
            "category": data.category,
            "description": data.description,
            "venue": data.venue,
            "venue_type": data.venue_type,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "status": ExhibitionStatus.SCHEDULED,
            "num_pieces": data.num_pieces,
            "curator_member_id": data.curator_member_id,
            "opening_reception": data.opening_reception,
            "notes": data.notes,
        }
        self._exhibitions[xid] = record
        logger.info(
            "[cultural_social] Exhibition created: %s (%s)", data.title, xid
        )
        return ArtExhibition(**record)

    async def get_exhibition(self, exhibition_id: str) -> Optional[ArtExhibition]:
        record = self._exhibitions.get(exhibition_id)
        if record is None:
            return None
        return ArtExhibition(**record)

    async def update_exhibition(
        self, exhibition_id: str, updates: dict
    ) -> Optional[ArtExhibition]:
        record = self._exhibitions.get(exhibition_id)
        if record is None:
            return None
        record.update(updates)
        self._exhibitions[exhibition_id] = record
        return ArtExhibition(**record)

    async def list_exhibitions(
        self,
        category: Optional[CulturalCategory] = None,
        status: Optional[ExhibitionStatus] = None,
    ) -> list[ArtExhibition]:
        results: list[ArtExhibition] = []
        for record in self._exhibitions.values():
            if category and record["category"] != category:
                continue
            if status and record["status"] != status:
                continue
            results.append(ArtExhibition(**record))
        return results

    # ── Analytics & Aggregation (F31) ────────────────────

    def _get_store(self, entity_type: str) -> dict:
        """Resolve entity type to internal store."""
        stores = {
            "events": self._events,
            "acts": self._acts,
            "programs": self._programs,
            "exhibitions": self._exhibitions,
        }
        if entity_type not in stores:
            raise ValueError(f"Unknown entity type: {entity_type}")
        return stores[entity_type]

    @staticmethod
    def _enum_val(value: Any) -> str:
        """Extract string value from enum or return as-is."""
        return value.value if hasattr(value, "value") else str(value)

    async def get_status_counts(self, entity_type: str) -> dict[str, int]:
        """Count entities by status for a given entity type."""
        store = self._get_store(entity_type)
        counts: dict[str, int] = {}
        for record in store.values():
            status = record.get("status")
            if status is not None:
                key = self._enum_val(status)
                counts[key] = counts.get(key, 0) + 1
        return counts

    async def get_upcoming(self, days: int = 30) -> dict[str, list]:
        """Get upcoming items across all entity types within N days."""
        from datetime import timedelta

        now = datetime.now(tz=timezone.utc)
        cutoff = (now + timedelta(days=days)).strftime("%Y-%m-%d")
        today = now.strftime("%Y-%m-%d")

        upcoming_events = [
            CulturalEvent(**r) for r in self._events.values()
            if today <= r.get("date", "") <= cutoff
            and self._enum_val(r.get("status", "")) not in ("cancelled", "completed")
        ]

        upcoming_exhibitions = [
            ArtExhibition(**r) for r in self._exhibitions.values()
            if r.get("end_date", "") >= today
            and r.get("start_date", "") <= cutoff
            and self._enum_val(r.get("status", "")) not in ("cancelled", "dismantled")
        ]

        upcoming_programs = [
            CulturalProgram(**r) for r in self._programs.values()
            if r.get("end_date", "") >= today
            and r.get("start_date", "") <= cutoff
            and self._enum_val(r.get("status", "")) not in ("cancelled",)
        ]

        return {
            "events": upcoming_events,
            "exhibitions": upcoming_exhibitions,
            "programs": upcoming_programs,
        }

    async def get_budget_by_category(self) -> dict[str, float]:
        """Aggregate budget by CulturalCategory across programs."""
        budgets: dict[str, float] = {}
        for record in self._programs.values():
            cat = self._enum_val(record.get("category", "unknown"))
            budgets[cat] = budgets.get(cat, 0.0) + record.get("budget", 0.0)
        return budgets

    async def get_venue_utilization(self) -> list[dict]:
        """Venue usage statistics across events and exhibitions."""
        venues: dict[str, dict] = {}

        for record in self._events.values():
            venue = record.get("venue", "unknown")
            vt = self._enum_val(record.get("venue_type", ""))
            if venue not in venues:
                venues[venue] = {
                    "venue": venue, "venue_type": vt,
                    "bookings": 0, "total_guests": 0, "total_budget": 0.0,
                }
            venues[venue]["bookings"] += 1
            venues[venue]["total_guests"] += record.get("guest_count", 0)
            venues[venue]["total_budget"] += record.get("budget", 0.0)

        for record in self._exhibitions.values():
            venue = record.get("venue", "unknown")
            vt = self._enum_val(record.get("venue_type", ""))
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

    async def get_entertainment_costs(self) -> list[dict]:
        """Entertainment cost analysis by type."""
        costs: dict[str, dict] = {}
        for record in self._acts.values():
            etype = self._enum_val(record.get("entertainment_type", "unknown"))
            status = self._enum_val(record.get("status", ""))
            if etype not in costs:
                costs[etype] = {
                    "type": etype, "total_acts": 0, "contracted": 0,
                    "total_cost": 0.0, "total_duration": 0,
                }
            costs[etype]["total_acts"] += 1
            costs[etype]["total_cost"] += record.get("cost", 0.0)
            costs[etype]["total_duration"] += record.get("duration_minutes", 0)
            if status in ("contracted", "confirmed", "in_progress", "completed"):
                costs[etype]["contracted"] += 1

        for c in costs.values():
            n = c["total_acts"]
            c["avg_cost"] = round(c["total_cost"] / n, 0) if n > 0 else 0.0
            c["cost_per_minute"] = (
                round(c["total_cost"] / c["total_duration"], 0) if c["total_duration"] > 0 else 0.0
            )
            c["contracted_rate"] = round(c["contracted"] / n * 100, 1) if n > 0 else 0.0

        return list(costs.values())

    async def get_seasonal_data(self, season: Optional[str] = None) -> list[dict]:
        """Data aggregated by season from programs."""
        seasons: dict[str, dict] = {}
        for record in self._programs.values():
            s = record.get("season", "unknown")
            if season and s != season:
                continue
            if s not in seasons:
                seasons[s] = {
                    "season": s, "programs": 0, "total_budget": 0.0,
                    "total_participants": 0, "max_participants": 0,
                }
            seasons[s]["programs"] += 1
            seasons[s]["total_budget"] += record.get("budget", 0.0)
            seasons[s]["total_participants"] += record.get("current_participants", 0)
            seasons[s]["max_participants"] += record.get("max_participants", 0)

        for s in seasons.values():
            mp = s["max_participants"]
            s["enrollment_rate"] = round(s["total_participants"] / mp * 100, 1) if mp > 0 else 0.0

        return list(seasons.values())
