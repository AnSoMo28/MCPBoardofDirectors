"""In-memory event repository.

Production will swap this for PostgreSQL + SQLAlchemy.
Same interface contract, so the agent code never changes.
"""

from __future__ import annotations

import uuid
from collections import OrderedDict, defaultdict
from datetime import datetime, timezone
from typing import Any

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
    ProgramItem,
    RecurrencePattern,
    RSVPRecord,
    RSVPStatus,
    VendorContractStatus,
    VendorRecord,
)


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class EventRepository:
    """In-memory repository for events, RSVPs, vendors, and programs."""

    def __init__(self) -> None:
        self._events: dict[str, dict[str, Any]] = {}
        self._rsvps: dict[str, dict[str, Any]] = {}
        self._vendors: dict[str, dict[str, Any]] = {}
        self._program_items: dict[str, dict[str, Any]] = {}

    # ── Events CRUD ────────────────────────────────────────

    def create_event(self, data: EventCreate) -> EventResponse:
        eid = _gen_id("evt")
        now = datetime.now(timezone.utc)
        self._events[eid] = {
            "id": eid,
            "title": data.title,
            "description": data.description,
            "category": data.category.value,
            "event_type": data.event_type.value,
            "status": EventStatus.DRAFT.value,
            "date_start": data.date_start.isoformat(),
            "date_end": data.date_end.isoformat(),
            "location": data.location,
            "facility_ids": list(data.facility_ids),
            "age_groups": list(data.age_groups),
            "max_capacity": data.max_capacity,
            "current_attendance": 0,
            "waitlist_count": 0,
            "pricing_model": data.pricing_model.value,
            "price_per_person": data.price_per_person,
            "is_members_only": data.is_members_only,
            "allow_guests": data.allow_guests,
            "max_guests_per_family": data.max_guests_per_family,
            "recurrence": data.recurrence.value,
            "requires_rsvp": data.requires_rsvp,
            "dress_code": data.dress_code,
            "notes": data.notes,
            "tags": list(data.tags),
            "created_by": data.created_by,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        return self._to_event_response(eid)

    def get_event(self, event_id: str) -> EventResponse | None:
        if event_id not in self._events:
            return None
        return self._to_event_response(event_id)

    def update_event(self, event_id: str, data: dict[str, Any]) -> EventResponse | None:
        if event_id not in self._events:
            return None
        rec = self._events[event_id]
        for key, val in data.items():
            if val is not None:
                rec[key] = val.value if hasattr(val, "value") else val
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        return self._to_event_response(event_id)

    def delete_event(self, event_id: str) -> bool:
        if event_id not in self._events:
            return False
        del self._events[event_id]
        self._rsvps = {k: v for k, v in self._rsvps.items() if v["event_id"] != event_id}
        self._vendors = {k: v for k, v in self._vendors.items() if v["event_id"] != event_id}
        self._program_items = {k: v for k, v in self._program_items.items() if v["event_id"] != event_id}
        return True

    def search_events(self, params: EventSearchParams) -> list[EventBrief]:
        results: list[EventBrief] = []
        for eid in self._events:
            rec = self._events[eid]
            if not self._matches_filter(rec, params):
                continue
            results.append(self._to_event_brief(eid))
        results.sort(key=lambda e: e.date_start)
        start = (params.page - 1) * params.page_size
        return results[start : start + params.page_size]

    # ── RSVP Management ────────────────────────────────────

    def add_rsvp(
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
        if event_id not in self._events:
            return None

        event = self._events[event_id]
        price = event.get("price_per_person", 0.0)
        headcount = len(member_ids) + guests_count

        # Auto-waitlist when over capacity
        if event["max_capacity"] > 0:
            current = self._count_attendance(event_id)
            available = event["max_capacity"] - current
            if headcount > available and status == RSVPStatus.CONFIRMED:
                status = RSVPStatus.WAITLISTED

        rsvp_id = _gen_id("rsvp")
        now = datetime.now(timezone.utc)
        self._rsvps[rsvp_id] = {
            "id": rsvp_id,
            "event_id": event_id,
            "family_id": family_id,
            "family_name": family_name,
            "member_ids": list(member_ids),
            "status": status.value,
            "guests_count": guests_count,
            "dietary_restrictions": dietary_restrictions,
            "notes": notes,
            "total_cost": price * headcount,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        self._refresh_attendance(event_id)
        return self._to_rsvp_record(rsvp_id)

    def update_rsvp(self, rsvp_id: str, data: dict[str, Any]) -> RSVPRecord | None:
        if rsvp_id not in self._rsvps:
            return None
        rec = self._rsvps[rsvp_id]
        for key, val in data.items():
            if val is not None:
                rec[key] = val.value if hasattr(val, "value") else val
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        self._refresh_attendance(rec["event_id"])
        return self._to_rsvp_record(rsvp_id)

    def remove_rsvp(self, rsvp_id: str) -> bool:
        if rsvp_id not in self._rsvps:
            return False
        event_id = self._rsvps[rsvp_id]["event_id"]
        del self._rsvps[rsvp_id]
        self._refresh_attendance(event_id)
        return True

    def get_rsvp(self, rsvp_id: str) -> RSVPRecord | None:
        if rsvp_id not in self._rsvps:
            return None
        return self._to_rsvp_record(rsvp_id)

    def list_rsvps(self, event_id: str, status: RSVPStatus | None = None) -> list[RSVPRecord]:
        out: list[RSVPRecord] = []
        for rid, rec in self._rsvps.items():
            if rec["event_id"] != event_id:
                continue
            if status and rec["status"] != status.value:
                continue
            out.append(self._to_rsvp_record(rid))
        return out

    def get_family_rsvp(self, event_id: str, family_id: str) -> RSVPRecord | None:
        for rid, rec in self._rsvps.items():
            if rec["event_id"] == event_id and rec["family_id"] == family_id:
                return self._to_rsvp_record(rid)
        return None

    # ── Vendor Management ──────────────────────────────────

    def add_vendor(
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
        if event_id not in self._events:
            return None
        vid = _gen_id("vnd")
        now = datetime.now(timezone.utc)
        self._vendors[vid] = {
            "id": vid,
            "event_id": event_id,
            "name": name,
            "service_type": service_type,
            "contact_name": contact_name,
            "contact_phone": contact_phone,
            "contact_email": contact_email,
            "quoted_cost": quoted_cost,
            "final_cost": None,
            "contract_status": VendorContractStatus.PENDING.value,
            "notes": notes,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        return self._to_vendor_record(vid)

    def update_vendor(self, vendor_id: str, data: dict[str, Any]) -> VendorRecord | None:
        if vendor_id not in self._vendors:
            return None
        rec = self._vendors[vendor_id]
        for key, val in data.items():
            if val is not None:
                rec[key] = val.value if hasattr(val, "value") else val
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        return self._to_vendor_record(vendor_id)

    def remove_vendor(self, vendor_id: str) -> bool:
        if vendor_id not in self._vendors:
            return False
        del self._vendors[vendor_id]
        return True

    def list_vendors(self, event_id: str) -> list[VendorRecord]:
        return [
            self._to_vendor_record(vid)
            for vid, rec in self._vendors.items()
            if rec["event_id"] == event_id
        ]

    # ── Program / Itinerary ────────────────────────────────

    def add_program_item(
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
        if event_id not in self._events:
            return None
        pid = _gen_id("prog")
        self._program_items[pid] = {
            "id": pid,
            "event_id": event_id,
            "title": title,
            "time_start": time_start,
            "time_end": time_end,
            "description": description,
            "location": location,
            "responsible": responsible,
            "notes": notes,
            "order": order,
        }
        return self._to_program_item(pid)

    def update_program_item(self, item_id: str, data: dict[str, Any]) -> ProgramItem | None:
        if item_id not in self._program_items:
            return None
        rec = self._program_items[item_id]
        for key, val in data.items():
            if val is not None:
                rec[key] = val
        return self._to_program_item(item_id)

    def remove_program_item(self, item_id: str) -> bool:
        if item_id not in self._program_items:
            return False
        del self._program_items[item_id]
        return True

    def list_program(self, event_id: str) -> list[ProgramItem]:
        items = [
            self._to_program_item(pid)
            for pid, rec in self._program_items.items()
            if rec["event_id"] == event_id
        ]
        items.sort(key=lambda x: (x.order, x.time_start))
        return items

    # ── Calendar ───────────────────────────────────────────

    def get_calendar(
        self,
        date_from: datetime,
        date_to: datetime,
        category: str | None = None,
    ) -> list[CalendarDay]:
        days: OrderedDict[str, list[EventBrief]] = OrderedDict()
        cur = date_from.date()
        while cur <= date_to.date():
            days[cur.isoformat()] = []
            cur = cur.fromordinal(cur.toordinal() + 1)

        for eid, rec in self._events.items():
            if category and rec["category"] != category:
                continue
            es = datetime.fromisoformat(rec["date_start"]).date()
            ee = datetime.fromisoformat(rec["date_end"]).date()
            d = max(es, date_from.date())
            d_end = min(ee, date_to.date())
            while d <= d_end:
                key = d.isoformat()
                if key in days:
                    days[key].append(self._to_event_brief(eid))
                d = d.fromordinal(d.toordinal() + 1)

        calendar: list[CalendarDay] = []
        for day_str, events in days.items():
            calendar.append(
                CalendarDay(
                    date=day_str,
                    events=events,
                    total_events=len(events),
                    has_conflicts=self._has_conflicts(events),
                )
            )
        return calendar

    # ── Capacity ───────────────────────────────────────────

    def get_capacity_info(self, event_id: str) -> CapacityInfo | None:
        if event_id not in self._events:
            return None
        ev = self._events[event_id]
        mx = ev["max_capacity"]
        cur = self._count_attendance(event_id)
        wl = self._count_waitlist(event_id)
        avail = max(0, mx - cur) if mx > 0 else 0
        return CapacityInfo(
            event_id=event_id,
            event_title=ev["title"],
            max_capacity=mx,
            current_attendance=cur,
            waitlist_count=wl,
            available_spots=avail,
            occupancy_pct=round(cur / mx * 100, 1) if mx > 0 else 0.0,
            is_full=mx > 0 and cur >= mx,
            is_waitlist_active=wl > 0,
        )

    # ── Analytics ──────────────────────────────────────────

    def compute_analytics(self, event_id: str) -> EventAnalytics | None:
        if event_id not in self._events:
            return None
        ev = self._events[event_id]
        rsvps = self.list_rsvps(event_id)
        total = len(rsvps)
        confirmed = sum(1 for r in rsvps if r.status == RSVPStatus.CONFIRMED)
        declined = sum(1 for r in rsvps if r.status == RSVPStatus.DECLINED)
        no_shows = sum(1 for r in rsvps if r.status == RSVPStatus.NO_SHOW)
        waitlisted = sum(1 for r in rsvps if r.status == RSVPStatus.WAITLISTED)
        revenue = sum(
            r.total_cost
            for r in rsvps
            if r.status in (RSVPStatus.CONFIRMED, RSVPStatus.NO_SHOW)
        )
        total_guests = sum(r.guests_count for r in rsvps if r.status == RSVPStatus.CONFIRMED)
        avg_guests = (total_guests / confirmed) if confirmed > 0 else 0.0

        return EventAnalytics(
            event_id=event_id,
            event_title=ev["title"],
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

    def clone_event(
        self,
        source_id: str,
        new_start: datetime,
        new_end: datetime,
        title_suffix: str = "(copia)",
    ) -> EventResponse | None:
        src = self._events.get(source_id)
        if not src:
            return None
        new_id = _gen_id("evt")
        now = datetime.now(timezone.utc)
        cloned = dict(src)
        cloned.update(
            id=new_id,
            title=f"{src['title']} {title_suffix}".strip(),
            status=EventStatus.DRAFT.value,
            date_start=new_start.isoformat(),
            date_end=new_end.isoformat(),
            current_attendance=0,
            waitlist_count=0,
            created_at=now.isoformat(),
            updated_at=now.isoformat(),
        )
        self._events[new_id] = cloned

        # Clone program items
        for item in list(self._program_items.values()):
            if item["event_id"] == source_id:
                new_pid = _gen_id("prog")
                ci = dict(item)
                ci["id"] = new_pid
                ci["event_id"] = new_id
                self._program_items[new_pid] = ci

        return self._to_event_response(new_id)

    # ── Report ─────────────────────────────────────────────

    def generate_report(
        self,
        date_from: datetime,
        date_to: datetime,
        report_type: str = "executive",
    ) -> EventReport:
        in_range: list[tuple[str, dict]] = []
        for eid, rec in self._events.items():
            es = datetime.fromisoformat(rec["date_start"])
            if date_from <= es <= date_to:
                in_range.append((eid, rec))

        total = len(in_range)
        completed = sum(1 for _, r in in_range if r["status"] == EventStatus.COMPLETED.value)
        cancelled = sum(1 for _, r in in_range if r["status"] == EventStatus.CANCELLED.value)
        upcoming = sum(
            1
            for _, r in in_range
            if r["status"] in (EventStatus.APPROVED.value, EventStatus.PUBLISHED.value)
        )

        attendance = 0
        revenue = 0.0
        cats: dict[str, int] = defaultdict(int)
        for eid, rec in in_range:
            attendance += self._count_attendance(eid)
            cats[rec["category"]] += 1
            for rsvp in self.list_rsvps(eid):
                if rsvp.status == RSVPStatus.CONFIRMED:
                    revenue += rsvp.total_cost

        avg = round(attendance / total, 1) if total > 0 else 0.0
        top_cats = sorted(cats.items(), key=lambda x: x[1], reverse=True)[:5]
        top_eids = sorted(in_range, key=lambda x: self._count_attendance(x[0]), reverse=True)[:5]

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
            top_events=[self._to_event_brief(eid) for eid, _ in top_eids],
        )

    # ── Internal helpers ───────────────────────────────────

    def _count_attendance(self, event_id: str) -> int:
        total = 0
        for rec in self._rsvps.values():
            if rec["event_id"] == event_id and rec["status"] == RSVPStatus.CONFIRMED.value:
                total += len(rec["member_ids"]) + rec["guests_count"]
        return total

    def _count_waitlist(self, event_id: str) -> int:
        return sum(
            1
            for rec in self._rsvps.values()
            if rec["event_id"] == event_id and rec["status"] == RSVPStatus.WAITLISTED.value
        )

    def _refresh_attendance(self, event_id: str) -> None:
        if event_id in self._events:
            self._events[event_id]["current_attendance"] = self._count_attendance(event_id)
            self._events[event_id]["waitlist_count"] = self._count_waitlist(event_id)

    def get_conflict_details(
        self,
        date_from: datetime,
        date_to: datetime,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        """Detect all pairwise event conflicts in a date range."""
        conflicts: list[dict[str, Any]] = []
        in_range: list[tuple[str, dict]] = []

        for eid, rec in self._events.items():
            if category and rec["category"] != category:
                continue
            es = datetime.fromisoformat(rec["date_start"])
            ee = datetime.fromisoformat(rec["date_end"])
            if es <= date_to and ee >= date_from:
                in_range.append((eid, rec))

        # Pairwise comparison
        seen: set[tuple[str, str]] = set()
        for i in range(len(in_range)):
            eid_a, rec_a = in_range[i]
            start_a = datetime.fromisoformat(rec_a["date_start"])
            end_a = datetime.fromisoformat(rec_a["date_end"])
            loc_a = rec_a.get("location", "")
            fac_a = set(rec_a.get("facility_ids", []))

            for j in range(i + 1, len(in_range)):
                eid_b, rec_b = in_range[j]
                start_b = datetime.fromisoformat(rec_b["date_start"])
                end_b = datetime.fromisoformat(rec_b["date_end"])
                loc_b = rec_b.get("location", "")
                fac_b = set(rec_b.get("facility_ids", []))

                # Time overlap check
                overlap_start = max(start_a, start_b)
                overlap_end = min(end_a, end_b)

                if overlap_start >= overlap_end:
                    continue  # No overlap

                pair_key = tuple(sorted([eid_a, eid_b]))
                if pair_key in seen:
                    continue
                seen.add(pair_key)

                overlap_minutes = int(
                    (overlap_end - overlap_start).total_seconds() / 60
                )

                # Conflict types
                conflict_types: list[str] = ["time"]
                if loc_a and loc_b and loc_a == loc_b:
                    conflict_types.append("venue")
                shared_facilities = fac_a & fac_b
                if shared_facilities:
                    conflict_types.append("resource")

                # Severity
                if overlap_minutes >= 120 or "venue" in conflict_types:
                    severity = "high"
                elif overlap_minutes >= 60:
                    severity = "medium"
                else:
                    severity = "low"

                # Suggestion
                if "venue" in conflict_types:
                    suggestion = (
                        f"Reubicar uno de los eventos a otro espacio. "
                        f"Comparten: {loc_a}."
                    )
                elif "resource" in conflict_types:
                    suggestion = (
                        f"Coordinar uso de instalaciones compartidas: "
                        f"{', '.join(shared_facilities)}."
                    )
                else:
                    suggestion = (
                        f"Superposición de {overlap_minutes} minutos. "
                        f"Considerar reprogramar uno de los eventos."
                    )

                conflicts.append({
                    "event_a_id": eid_a,
                    "event_a_title": rec_a["title"],
                    "event_a_start": start_a.isoformat(),
                    "event_a_end": end_a.isoformat(),
                    "event_a_location": loc_a,
                    "event_b_id": eid_b,
                    "event_b_title": rec_b["title"],
                    "event_b_start": start_b.isoformat(),
                    "event_b_end": end_b.isoformat(),
                    "event_b_location": loc_b,
                    "overlap_start": overlap_start.isoformat(),
                    "overlap_end": overlap_end.isoformat(),
                    "overlap_minutes": overlap_minutes,
                    "conflict_types": conflict_types,
                    "shared_facilities": list(shared_facilities),
                    "severity": severity,
                    "suggestion": suggestion,
                })

        # Sort: high severity first, then by overlap duration
        conflicts.sort(
            key=lambda c: (
                {"high": 0, "medium": 1, "low": 2}[c["severity"]],
                -c["overlap_minutes"],
            )
        )
        return conflicts

    def _matches_filter(self, rec: dict, params: EventSearchParams) -> bool:
        if params.query:
            q = params.query.lower()
            if q not in rec["title"].lower() and q not in rec.get("description", "").lower():
                return False
        if params.category and rec["category"] != params.category.value:
            return False
        if params.status and rec["status"] != params.status.value:
            return False
        if params.pricing_model and rec["pricing_model"] != params.pricing_model.value:
            return False
        if params.date_from:
            if datetime.fromisoformat(rec["date_start"]) < params.date_from:
                return False
        if params.date_to:
            if datetime.fromisoformat(rec["date_end"]) > params.date_to:
                return False
        if params.age_group:
            ag = rec.get("age_groups", [])
            if params.age_group not in ag and "all" not in ag:
                return False
        if params.tags:
            if not set(params.tags).intersection(rec.get("tags", [])):
                return False
        return True

    @staticmethod
    def _has_conflicts(events: list[EventBrief]) -> bool:
        if len(events) < 2:
            return False
        s = sorted(events, key=lambda e: e.date_start)
        for i in range(len(s) - 1):
            if s[i].date_end > s[i + 1].date_start:
                return True
        return False

    # ── Model converters ───────────────────────────────────

    def _to_event_response(self, eid: str) -> EventResponse:
        rec = dict(self._events[eid])
        rec["programs"] = [self._to_program_item(p) for p, r in self._program_items.items() if r["event_id"] == eid]
        rec["rsvps"] = [self._to_rsvp_record(r) for r, rd in self._rsvps.items() if rd["event_id"] == eid]
        rec["vendors"] = [self._to_vendor_record(v) for v, vd in self._vendors.items() if vd["event_id"] == eid]
        return EventResponse(**rec)

    def _to_event_brief(self, eid: str) -> EventBrief:
        r = self._events[eid]
        return EventBrief(
            id=r["id"],
            title=r["title"],
            category=r["category"],
            status=r["status"],
            date_start=datetime.fromisoformat(r["date_start"]),
            date_end=datetime.fromisoformat(r["date_end"]),
            location=r["location"],
            current_attendance=r["current_attendance"],
            max_capacity=r["max_capacity"],
            pricing_model=r["pricing_model"],
        )

    def _to_rsvp_record(self, rid: str) -> RSVPRecord:
        r = self._rsvps[rid]
        return RSVPRecord(
            id=r["id"],
            event_id=r["event_id"],
            family_id=r["family_id"],
            family_name=r.get("family_name", ""),
            member_ids=r["member_ids"],
            status=r["status"],
            guests_count=r["guests_count"],
            dietary_restrictions=r.get("dietary_restrictions", ""),
            notes=r.get("notes", ""),
            total_cost=r.get("total_cost", 0.0),
            created_at=datetime.fromisoformat(r["created_at"]),
            updated_at=datetime.fromisoformat(r["updated_at"]),
        )

    def _to_vendor_record(self, vid: str) -> VendorRecord:
        r = self._vendors[vid]
        return VendorRecord(
            id=r["id"],
            event_id=r["event_id"],
            name=r["name"],
            service_type=r["service_type"],
            contact_name=r.get("contact_name", ""),
            contact_phone=r.get("contact_phone", ""),
            contact_email=r.get("contact_email", ""),
            quoted_cost=r.get("quoted_cost", 0.0),
            final_cost=r.get("final_cost"),
            contract_status=r["contract_status"],
            notes=r.get("notes", ""),
            created_at=datetime.fromisoformat(r["created_at"]),
            updated_at=datetime.fromisoformat(r["updated_at"]),
        )

    def _to_program_item(self, pid: str) -> ProgramItem:
        r = self._program_items[pid]
        return ProgramItem(
            id=r["id"],
            event_id=r["event_id"],
            title=r["title"],
            time_start=r["time_start"],
            time_end=r["time_end"],
            description=r.get("description", ""),
            location=r.get("location", ""),
            responsible=r.get("responsible", ""),
            notes=r.get("notes", ""),
            order=r.get("order", 0),
        )
