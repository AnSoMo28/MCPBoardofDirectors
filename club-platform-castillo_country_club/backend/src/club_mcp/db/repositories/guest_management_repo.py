"""
Guest management repository.
In-memory store for guests, private events, and trial memberships.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

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

logger = logging.getLogger(__name__)


class GuestManagementRepository:
    def __init__(self, *, seed_demo_data: bool = False) -> None:
        self._guests: dict[str, dict] = {}
        self._private_events: dict[str, dict] = {}
        self._trial_memberships: dict[str, dict] = {}
        self._monthly_snapshots: dict[str, dict[str, Any]] = {}
        if seed_demo_data:
            self._seed_data()

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Guests ─────────────────────────────────────────────

    async def create_guest(self, data: CreateGuest) -> Guest:
        guest_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": guest_id,
            **data.model_dump(),
            "status": GuestStatus.REGISTERED.value,
            "created_at": now,
            "updated_at": now,
        }
        self._guests[guest_id] = record
        logger.info(
            "[guest_repo] Guest created: %s (%s)", data.guest_name, guest_id
        )
        return Guest(**record)

    async def get_guest(self, guest_id: str) -> Optional[Guest]:
        record = self._guests.get(guest_id)
        if not record:
            return None
        return Guest(**record)

    async def list_guests(
        self,
        family_id: str = "",
        visit_date: str = "",
        status: str = "",
    ) -> list[Guest]:
        results = list(self._guests.values())
        if family_id:
            results = [g for g in results if g["family_id"] == family_id]
        if visit_date:
            results = [g for g in results if g["visit_date"] == visit_date]
        if status:
            results = [g for g in results if g["status"] == status]
        return [Guest(**g) for g in results]

    async def update_guest(
        self, guest_id: str, updates: dict
    ) -> Optional[Guest]:
        record = self._guests.get(guest_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return Guest(**record)

    # ── Private Events ─────────────────────────────────────

    async def create_private_event(
        self, data: CreatePrivateEvent
    ) -> PrivateEvent:
        event_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": event_id,
            **data.model_dump(),
            "estimated_cost": 0.0,
            "status": PrivateEventStatus.INQUIRY.value,
            "created_at": now,
            "updated_at": now,
        }
        self._private_events[event_id] = record
        logger.info(
            "[guest_repo] Private event created: %s (%s)",
            data.event_name,
            event_id,
        )
        return PrivateEvent(**record)

    async def get_private_event(
        self, event_id: str
    ) -> Optional[PrivateEvent]:
        record = self._private_events.get(event_id)
        if not record:
            return None
        return PrivateEvent(**record)

    async def list_private_events(
        self,
        family_id: str = "",
        status: str = "",
        event_type: str = "",
    ) -> list[PrivateEvent]:
        results = list(self._private_events.values())
        if family_id:
            results = [e for e in results if e["family_id"] == family_id]
        if status:
            results = [e for e in results if e["status"] == status]
        if event_type:
            results = [e for e in results if e["event_type"] == event_type]
        return [PrivateEvent(**e) for e in results]

    async def update_private_event(
        self, event_id: str, updates: dict
    ) -> Optional[PrivateEvent]:
        record = self._private_events.get(event_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return PrivateEvent(**record)

    # ── Trial Memberships ──────────────────────────────────

    async def create_trial_membership(
        self, data: CreateTrialMembership
    ) -> TrialMembership:
        trial_id = self._gen_id()
        now = datetime.now(tz=timezone.utc).isoformat()
        record = {
            "id": trial_id,
            **data.model_dump(),
            "status": TrialMembershipStatus.PENDING_APPROVAL.value,
            "created_at": now,
            "updated_at": now,
        }
        self._trial_memberships[trial_id] = record
        logger.info(
            "[guest_repo] Trial membership created: %s (%s)",
            data.guest_name,
            trial_id,
        )
        return TrialMembership(**record)

    async def get_trial_membership(
        self, trial_id: str
    ) -> Optional[TrialMembership]:
        record = self._trial_memberships.get(trial_id)
        if not record:
            return None
        return TrialMembership(**record)

    async def list_trial_memberships(
        self,
        referred_by_family_id: str = "",
        status: str = "",
        trial_type: str = "",
    ) -> list[TrialMembership]:
        results = list(self._trial_memberships.values())
        if referred_by_family_id:
            results = [
                t
                for t in results
                if t["referred_by_family_id"] == referred_by_family_id
            ]
        if status:
            results = [t for t in results if t["status"] == status]
        if trial_type:
            results = [t for t in results if t["trial_type"] == trial_type]
        return [TrialMembership(**t) for t in results]

    async def update_trial_membership(
        self, trial_id: str, updates: dict
    ) -> Optional[TrialMembership]:
        record = self._trial_memberships.get(trial_id)
        if not record:
            return None
        record.update(updates)
        record["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
        return TrialMembership(**record)

    # ── Analytics ──────────────────────────────────────────

    async def get_guest_analytics(self, family_id: str = "") -> dict:
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
        top_purposes = sorted(
            [
                {"purpose": k, "count": v}
                for k, v in purpose_counts.items()
            ],
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
    # ── Seed Data ──────────────────────────────────────────

    def _seed_data(self) -> None:
        """Populate with realistic Castillo Country Club guest data."""
        self._seed_guests()
        self._seed_private_events()
        self._seed_trial_memberships()
        self._seed_monthly_snapshots()
        logger.info(
            "[guest_repo] Seeded: %d guests, %d events, %d trials, %d months",
            len(self._guests),
            len(self._private_events),
            len(self._trial_memberships),
            len(self._monthly_snapshots),
        )

    def _seed_guests(self) -> None:
        """Create 30 guests across 8 families with realistic patterns."""
        _guest_defs = [
            # family_id, host_member_id, guest_name, email, phone, visit_date, purpose, privileges, status, visits
            ("fam-001", "mem-001", "Roberto Chen", "rchen@mail.com", "8888-1001", "2026-01-15", "social", ["pool", "dining"], "completed", 5),
            ("fam-001", "mem-001", "Ana Lucía Chen", "achen@mail.com", "8888-1002", "2026-02-20", "social", ["pool", "gym"], "completed", 4),
            ("fam-002", "mem-005", "Diego Mora", "dmora@mail.com", "8888-2001", "2026-01-22", "business", ["dining", "golf"], "completed", 7),
            ("fam-002", "mem-005", "Sofía Mora", "smora@mail.com", "8888-2002", "2026-03-10", "family", ["pool", "kids_area"], "completed", 3),
            ("fam-002", "mem-005", "Andrés Mora", "amora@mail.com", "8888-2003", "2026-04-05", "social", ["tennis", "dining"], "checked_in", 6),
            ("fam-003", "mem-010", "Patricia Vargas", "pvargas@mail.com", "8888-3001", "2026-02-14", "valentine", ["dining", "spa"], "completed", 2),
            ("fam-003", "mem-010", "Carlos Rivera", "crivera@mail.com", "8888-3002", "2026-05-01", "social", ["pool", "dining"], "registered", 1),
            ("fam-004", "mem-015", "María Elena Solano", "msolano@mail.com", "8888-4001", "2026-01-10", "social", ["tennis", "dining"], "completed", 8),
            ("fam-004", "mem-015", "Jorge Solano", "jsolano@mail.com", "8888-4002", "2026-03-22", "business", ["golf", "dining"], "completed", 5),
            ("fam-004", "mem-015", "Valentina Solano", "vsolano@mail.com", "8888-4003", "2026-04-18", "social", ["pool", "spa"], "checked_in", 3),
            ("fam-005", "mem-020", "Luis Herrera", "lherrera@mail.com", "8888-5001", "2026-02-08", "family", ["pool", "kids_area", "dining"], "completed", 4),
            ("fam-005", "mem-020", "Camila Herrera", "cherrera@mail.com", "8888-5002", "2026-04-12", "social", ["gym", "spa"], "completed", 2),
            ("fam-006", "mem-025", "Fernando Guzmán", "fguzman@mail.com", "8888-6001", "2026-01-25", "business", ["golf", "dining"], "completed", 9),
            ("fam-006", "mem-025", "Isabella Guzmán", "iguzman@mail.com", "8888-6002", "2026-03-15", "social", ["pool", "tennis"], "completed", 6),
            ("fam-006", "mem-025", "Mateo Guzmán", "mguzman@mail.com", "8888-6003", "2026-05-20", "social", ["gym", "pool"], "registered", 1),
            ("fam-007", "mem-030", "Gabriela Rojas", "grojas@mail.com", "8888-7001", "2026-02-28", "family", ["pool", "kids_area", "social_events"], "completed", 5),
            ("fam-007", "mem-030", "Marco Rojas", "mrojas@mail.com", "8888-7002", "2026-04-22", "business", ["golf", "dining"], "completed", 3),
            ("fam-008", "mem-035", "Silvia Montero", "smontero@mail.com", "8888-8001", "2026-01-08", "social", ["dining", "spa"], "completed", 10),
            ("fam-008", "mem-035", "Raúl Montero", "rmontero@mail.com", "8888-8002", "2026-03-05", "social", ["golf", "tennis"], "completed", 7),
            ("fam-008", "mem-035", "Daniela Montero", "dmontero@mail.com", "8888-8003", "2026-04-30", "social", ["pool", "gym"], "checked_in", 4),
            ("fam-001", "mem-002", "Roberto Chen Jr", "rchenjr@mail.com", "8888-1003", "2026-05-10", "social", ["tennis", "pool"], "registered", 2),
            ("fam-002", "mem-006", "Laura Viquez", "lviquez@mail.com", "8888-2004", "2026-03-18", "family", ["pool", "kids_area"], "completed", 4),
            ("fam-003", "mem-011", "Eduardo Blanco", "eblanco@mail.com", "8888-3003", "2026-04-02", "business", ["golf", "dining"], "completed", 3),
            ("fam-009", "mem-040", "Carmen Duarte", "cduarte@mail.com", "8888-9001", "2026-02-12", "social", ["dining", "spa", "pool"], "completed", 6),
            ("fam-009", "mem-040", "Pablo Duarte", "pduarte@mail.com", "8888-9002", "2026-05-15", "social", ["golf", "dining"], "registered", 1),
            ("fam-010", "mem-045", "Adriana Castro", "acastro@mail.com", "8888-10010", "2026-03-08", "social", ["tennis", "gym"], "completed", 5),
            ("fam-010", "mem-045", "Miguel Castro", "mcastro@mail.com", "8888-10011", "2026-05-25", "family", ["pool", "kids_area"], "registered", 1),
            ("fam-011", "mem-050", "Elena Quesada", "equesada@mail.com", "8888-11001", "2026-01-30", "social", ["spa", "dining"], "completed", 8),
            ("fam-012", "mem-055", "Rodrigo Sánchez", "rsanchez@mail.com", "8888-12001", "2026-04-10", "business", ["golf", "dining", "tennis"], "completed", 4),
            ("fam-012", "mem-055", "Natalia Sánchez", "nsanchez@mail.com", "8888-12002", "2026-05-28", "social", ["pool", "spa"], "registered", 1),
        ]

        for (fid, hid, name, email, phone, vdate, purpose,
             privs, status, visits) in _guest_defs:
            gid = self._gen_id()
            now = datetime.now(tz=timezone.utc).isoformat()
            self._guests[gid] = {
                "id": gid,
                "family_id": fid,
                "host_member_id": hid,
                "guest_name": name,
                "guest_email": email,
                "guest_phone": phone,
                "visit_date": vdate,
                "purpose": purpose,
                "status": status,
                "privileges": privs,
                "notes": f"Visita #{visits}",
                "created_at": now,
                "updated_at": now,
                "_visit_count": visits,
            }

    def _seed_private_events(self) -> None:
        """Create 8 private events with realistic data."""
        _event_defs = [
            ("fam-001", "Boda Chen-Vargas", "wedding", "Salón Principal", "2026-03-15", "16:00", "23:00", 180, 8500000, "approved", 12000, True, True, True),
            ("fam-003", "Bautizo Rivera", "baptism", "Capilla + Jardín", "2026-04-20", "10:00", "14:00", 60, 2500000, "confirmed", 8000, True, False, False),
            ("fam-006", "Gala Corporativa Guzmán", "corporate", "Salón Ejecutivo", "2026-02-28", "18:00", "23:00", 100, 5500000, "completed", 10000, True, True, True),
            ("fam-008", "50 Aniversario Montero", "anniversary", "Terraza Gourmet", "2026-05-10", "19:00", "01:00", 120, 6200000, "approved", 9500, True, True, True),
            ("fam-004", "Quinceañera Solano", "quinceanera", "Salón Principal", "2026-06-15", "18:00", "00:00", 150, 7000000, "contracted", 11000, True, True, True),
            ("fam-009", "Cumpleaños 40 Duarte", "birthday", "Restaurante Privado", "2026-01-25", "19:00", "23:00", 40, 1800000, "completed", 6000, True, False, True),
            ("fam-002", "Evento Corporativo Mora", "corporate", "Salón Ejecutivo", "2026-06-20", "08:00", "17:00", 80, 4200000, "quoted", 7500, True, False, False),
            ("fam-011", "Cena de Gala Quesada", "other", "Wine Cellar", "2026-07-05", "19:30", "23:30", 30, 1500000, "inquiry", 5000, True, False, True),
        ]

        for (fid, name, etype, venue, date, start, end,
             pcount, budget, status, est_cost, cat, dec, ent) in _event_defs:
            eid = self._gen_id()
            now = datetime.now(tz=timezone.utc).isoformat()
            self._private_events[eid] = {
                "id": eid,
                "family_id": fid,
                "event_name": name,
                "event_type": etype,
                "venue": venue,
                "date": date,
                "start_time": start,
                "end_time": end,
                "guest_count": pcount,
                "budget": budget,
                "estimated_cost": est_cost,
                "status": status,
                "coordinator_member_id": f"mem-{fid.split('-')[1]}",
                "description": f"Evento privado: {name}",
                "special_requirements": "",
                "catering_required": cat,
                "decoration_required": dec,
                "entertainment_required": ent,
                "notes": "",
                "created_at": now,
                "updated_at": now,
            }

    def _seed_trial_memberships(self) -> None:
        """Create 12 trial memberships: 5 converted, 3 active, 2 expired, 2 pending."""
        _trial_defs = [
            ("María Fernanda López", "mfl@mail.com", "8877-0001", "fam-004", "month_trial", "2026-01-10", "2026-02-10", ["pool", "gym", "dining"], "converted"),
            ("Pablo Andrés Jiménez", "paj@mail.com", "8877-0002", "fam-006", "week_trial", "2026-02-01", "2026-02-08", ["golf", "dining"], "converted"),
            ("Carolina Brenes", "cbrenes@mail.com", "8877-0003", "fam-008", "month_trial", "2026-02-15", "2026-03-15", ["tennis", "pool", "spa"], "converted"),
            ("Felipe Alvarado", "falvarado@mail.com", "8877-0004", "fam-001", "day_pass", "2026-03-01", "2026-03-01", ["pool"], "converted"),
            ("Lucía Pacheco", "lpacheco@mail.com", "8877-0005", "fam-009", "month_trial", "2026-03-10", "2026-04-10", ["gym", "spa", "pool"], "converted"),
            ("Rodrigo Matamoros", "rmatamoros@mail.com", "8877-0006", "fam-002", "week_trial", "2026-04-01", "2026-04-08", ["golf", "tennis"], "active"),
            ("Valeria Durán", "vduran@mail.com", "8877-0007", "fam-005", "month_trial", "2026-04-15", "2026-05-15", ["pool", "gym", "dining"], "active"),
            ("Esteban Quirós", "equiros@mail.com", "8877-0008", "fam-010", "day_pass", "2026-05-01", "2026-05-01", ["pool", "dining"], "active"),
            ("Mariana Solís", "msolis@mail.com", "8877-0009", "fam-003", "week_trial", "2026-01-20", "2026-01-27", ["tennis", "gym"], "expired"),
            ("Javier Montero", "jmontero@mail.com", "8877-0010", "fam-007", "month_trial", "2026-02-01", "2026-03-01", ["golf", "spa"], "expired"),
            ("Andrea Campos", "acampos@mail.com", "8877-0011", "fam-011", "week_trial", "2026-05-20", "2026-05-27", ["pool", "dining", "spa"], "pending_approval"),
            ("Sergio Vargas", "svargas@mail.com", "8877-0012", "fam-012", "month_trial", "2026-06-01", "2026-07-01", ["golf", "tennis", "gym"], "pending_approval"),
        ]

        for (name, email, phone, fid, ttype, start, end,
             privs, status) in _trial_defs:
            tid = self._gen_id()
            now = datetime.now(tz=timezone.utc).isoformat()
            self._trial_memberships[tid] = {
                "id": tid,
                "guest_name": name,
                "guest_email": email,
                "guest_phone": phone,
                "referred_by_family_id": fid,
                "trial_type": ttype,
                "start_date": start,
                "end_date": end,
                "status": status,
                "privileges": privs,
                "notes": "",
                "created_at": now,
                "updated_at": now,
            }

    def _seed_monthly_snapshots(self) -> None:
        """Generate 6 months of guest analytics snapshots."""
        _snapshot_data = {
            "2026-01": {"new_guests": 8, "check_ins": 12, "trials": 2, "conversions": 1, "events": 1},
            "2026-02": {"new_guests": 10, "check_ins": 18, "trials": 3, "conversions": 2, "events": 2},
            "2026-03": {"new_guests": 7, "check_ins": 14, "trials": 2, "conversions": 2, "events": 1},
            "2026-04": {"new_guests": 12, "check_ins": 22, "trials": 3, "conversions": 0, "events": 2},
            "2026-05": {"new_guests": 9, "check_ins": 16, "trials": 2, "conversions": 1, "events": 1},
            "2026-06": {"new_guests": 6, "check_ins": 10, "trials": 1, "conversions": 0, "events": 1},
        }
        for month, data in _snapshot_data.items():
            self._monthly_snapshots[month] = data

    # ── INTELLIGENCE METHODS (new) ─────────────────────────

    async def get_health_score(self) -> GuestHealthScore:
        """Compute composite health score with 5 weighted factors."""
        factors = self._compute_health_factors()
        total = round(sum(f.weighted_score for f in factors), 1)
        level = (
            GuestHealthLevel.EXCELLENT if total >= 85
            else GuestHealthLevel.HEALTHY if total >= 65
            else GuestHealthLevel.ATTENTION if total >= 45
            else GuestHealthLevel.CRITICAL
        )
        trend = self._compute_guest_trend()
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
        """Build complete 5-stage guest-to-member conversion funnel."""
        all_guests = list(self._guests.values())
        all_trials = list(self._trial_memberships.values())

        total_guests = len(all_guests)
        checked_in = [g for g in all_guests if g["status"] in (
            GuestStatus.CHECKED_IN.value, GuestStatus.COMPLETED.value
        )]
        # Repeat guests: >1 visit (notes contain visit count)
        repeat = [g for g in all_guests if g.get("_visit_count", 1) > 1]
        trial_applicants = len(all_trials)
        converted = [t for t in all_trials if t["status"] == TrialMembershipStatus.CONVERTED.value]

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
        # Pipeline: active trials + repeat guests not yet trialing
        active_trials = [t for t in all_trials if t["status"] in (
            TrialMembershipStatus.ACTIVE.value, TrialMembershipStatus.APPROVED.value,
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

    async def get_analytics_enhanced(self, family_id: str = "") -> GuestAnalyticsEnhanced:
        """Complete analytics dashboard with temporal, referral, and privilege data."""
        base = await self.get_guest_analytics(family_id=family_id)

        # Temporal trends from snapshots
        temporal: list[GuestTemporalTrend] = []
        for month, data in sorted(self._monthly_snapshots.items()):
            temporal.append(GuestTemporalTrend(
                month=month,
                new_guests=data.get("new_guests", 0),
                check_ins=data.get("check_ins", 0),
                trials_created=data.get("trials", 0),
                trials_converted=data.get("conversions", 0),
                private_events=data.get("events", 0),
            ))

        # Conversion rates
        total_guests = base.get("total_guests", 0)
        total_trials = base.get("total_trial_memberships", 0)
        converted = base.get("converted_trials", 0)
        guest_to_trial = round(total_trials / max(total_guests, 1) * 100, 1)
        trial_to_member = round(converted / max(total_trials, 1) * 100, 1)

        # Top referrers
        family_referrals: dict[str, dict[str, int]] = {}
        for t in self._trial_memberships.values():
            fid = t.get("referred_by_family_id", "")
            if not fid:
                continue
            ref = family_referrals.setdefault(fid, {"referral_count": 0, "converted_count": 0})
            ref["referral_count"] += 1
            if t["status"] == TrialMembershipStatus.CONVERTED.value:
                ref["converted_count"] += 1
        top_referrers = sorted(
            [{"family_id": fid, **counts} for fid, counts in family_referrals.items()],
            key=lambda x: x["converted_count"], reverse=True,
        )[:5]

        # Privilege usage
        priv_counts: dict[str, dict[str, Any]] = {}
        for g in self._guests.values():
            for p in g.get("privileges", []):
                entry = priv_counts.setdefault(p, {"usage_count": 0, "guests": set()})
                entry["usage_count"] += 1
                entry["guests"].add(g["id"])
        privilege_usage = sorted(
            [{"privilege_type": k, "usage_count": v["usage_count"],
              "unique_guests": len(v["guests"])} for k, v in priv_counts.items()],
            key=lambda x: x["usage_count"], reverse=True,
        )

        # Peak visit days (from visit_date field)
        day_counts: dict[str, int] = {}
        for g in self._guests.values():
            vd = g.get("visit_date", "")
            if vd:
                day_counts[vd] = day_counts.get(vd, 0) + 1
        peak_days = sorted(
            [{"day": d, "visit_count": c} for d, c in day_counts.items()],
            key=lambda x: x["visit_count"], reverse=True,
        )[:5]

        # Event-guest correlation
        event_type_guests: dict[str, dict[str, Any]] = {}
        for e in self._private_events.values():
            et = e.get("event_type", "other")
            entry = event_type_guests.setdefault(et, {"total_guests": 0, "total_events": 0})
            entry["total_guests"] += e.get("guest_count", 0)
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
        """Generate demand forecast based on historical patterns."""
        sorted_m = sorted(self._monthly_snapshots.keys())
        forecasts: list[GuestForecastItem] = []

        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]

            # Guest volume forecast
            guest_values = [self._monthly_snapshots[m].get("new_guests", 0) for m in last_3]
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

            # Trial demand
            trial_values = [self._monthly_snapshots[m].get("trials", 0) for m in last_3]
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

            # Conversion rate
            conv_values = [self._monthly_snapshots[m].get("conversions", 0) for m in last_3]
            trial_v = [self._monthly_snapshots[m].get("trials", 0) for m in last_3]
            conv_rates = [round(c / max(t, 1) * 100, 1) for c, t in zip(conv_values, trial_v)]
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

        # Event pipeline
        upcoming = [e for e in self._private_events.values()
                    if e["status"] not in (PrivateEventStatus.COMPLETED.value,
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

        # Trial capacity
        active_trials = sum(1 for t in self._trial_memberships.values()
                           if t["status"] in (TrialMembershipStatus.ACTIVE.value,
                                               TrialMembershipStatus.APPROVED.value))
        trial_cap_needed = round(active_trials * 1.3) + sum(
            1 for f in forecasts if f.metric == "trial_demand"
        )

        # Peak months for Costa Rica private events
        peak_months = ["Diciembre", "Marzo", "Abril", "Julio"]

        return GuestDemandForecast(
            forecasts=forecasts,
            trial_capacity_needed=trial_cap_needed if trial_cap_needed > 0 else 5,
            seasonal_multiplier=1.15,
            peak_months=peak_months,
            forecast_horizon_months=3,
            data_quality_note="Basado en 6 meses de data demo. Re-entrenar con data real.",
        )

    async def generate_engagement_proposals(self) -> GuestEngagementProposalList:
        """Generate proactive cross-domain engagement proposals."""
        proposals: list[GuestEngagementProposal] = []

        # ── P1: Hot leads (5+ visits, no trial) ──
        hot_leads = []
        for g in self._guests.values():
            visits = g.get("_visit_count", 1)
            if visits >= 5:
                # Check if they already have a trial
                has_trial = any(
                    t["referred_by_family_id"] == g["family_id"]
                    and t["guest_name"] == g["guest_name"]
                    for t in self._trial_memberships.values()
                )
                if not has_trial:
                    hot_leads.append(g)

        for lead in hot_leads:
            proposals.append(GuestEngagementProposal(
                proposal_type=GuestProposalType.TRIAL_INVITATION,
                title=f"Invitar a trial: {lead['guest_name']}",
                description=(
                    f"{lead['guest_name']} ha visitado {lead['_visit_count']} veces "
                    f"sin aplicar a trial. Alto potencial de conversión. "
                    f"Proponer invitación personalizada a membresía de prueba."
                ),
                target_family_id=lead["family_id"],
                target_guest_ids=[lead["id"]],
                priority="high",
                impact="high",
                confidence=0.85,
                cross_domain_signals=[
                    f"Guest recurrente: {lead['_visit_count']} visitas",
                    f"Propósito: {lead.get('purpose', 'social')}",
                    "Sin trial — oportunidad de conversión directa",
                ],
                suggested_action={
                    "action": "send_trial_invitation",
                    "domain": "communication",
                    "params": {
                        "guest_id": lead["id"],
                        "family_id": lead["family_id"],
                        "trial_type": "month_trial",
                    },
                },
            ))

        # ── P2: Expiring trials without follow-up ──
        for t in self._trial_memberships.values():
            if t["status"] in (
                TrialMembershipStatus.ACTIVE.value,
                TrialMembershipStatus.APPROVED.value,
            ):
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.FOLLOW_UP_CAMPAIGN,
                    title=f"Follow-up trial: {t['guest_name']}",
                    description=(
                        f"Trial de {t['guest_name']} ({t['trial_type']}) "
                        f"activo. Programar seguimiento para evaluar "
                        f"experiencia y facilitar conversión a membresía."
                    ),
                    target_family_id=t["referred_by_family_id"],
                    target_guest_ids=[t["id"]],
                    priority="medium",
                    impact="high",
                    confidence=0.75,
                    cross_domain_signals=[
                        f"Trial activo: {t['trial_type']}",
                        "Ventana de conversión abierta",
                    ],
                    suggested_action={
                        "action": "schedule_trial_followup",
                        "domain": "communication",
                        "params": {"trial_id": t["id"]},
                    },
                ))

        # ── P3: Top referrers inactive >60 days ──
        family_last_referral: dict[str, str] = {}
        for t in self._trial_memberships.values():
            fid = t.get("referred_by_family_id", "")
            created = t.get("created_at", "")[:10]
            if fid and created:
                if fid not in family_last_referral or created > family_last_referral[fid]:
                    family_last_referral[fid] = created

        # Top referrers (families with 2+ referrals)
        family_ref_count: dict[str, int] = {}
        for t in self._trial_memberships.values():
            fid = t.get("referred_by_family_id", "")
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
        for g in self._guests.values():
            for p in g.get("privileges", []):
                priv_usage[p] = priv_usage.get(p, 0) + 1

        if priv_usage:
            top_priv = max(priv_usage, key=priv_usage.get)
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
        for e in self._private_events.values():
            if e["status"] in (
                PrivateEventStatus.APPROVED.value,
                PrivateEventStatus.CONTRACTED.value,
            ) and e.get("guest_count", 0) > 80:
                proposals.append(GuestEngagementProposal(
                    proposal_type=GuestProposalType.EVENT_OUTREACH,
                    title=f"Lead generation: {e['event_name']}",
                    description=(
                        f"Evento '{e['event_name']}' tendrá "
                        f"{e['guest_count']} invitados. "
                        f"Muchos serán nuevos para el club. "
                        f"Proponer: welcome packages, tours, "
                        f"y trial offers para asistentes."
                    ),
                    target_family_id=e["family_id"],
                    priority="medium",
                    impact="high",
                    confidence=0.80,
                    cross_domain_signals=[
                        f"Evento grande: {e['guest_count']} invitados",
                        f"Tipo: {e['event_type']} → potencial nuevos guests",
                        "Lead generation opportunity",
                    ],
                    suggested_action={
                        "action": "prepare_event_outreach",
                        "domain": "communication",
                        "params": {
                            "event_id": e["id"],
                            "guest_count": e["guest_count"],
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

    # ── Internal Helpers ───────────────────────────────────

    def _compute_health_factors(self) -> list[GuestHealthFactor]:
        """Compute 5 weighted health factors for guest management."""
        factors: list[GuestHealthFactor] = []

        # Factor 1: Guest Volume (weight 0.20)
        total_guests = len(self._guests)
        active = sum(1 for g in self._guests.values()
                     if g["status"] in (GuestStatus.REGISTERED.value, GuestStatus.CHECKED_IN.value))
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
        total_trials = len(self._trial_memberships)
        converted = sum(1 for t in self._trial_memberships.values()
                        if t["status"] == TrialMembershipStatus.CONVERTED.value)
        conv_rate = converted / max(total_trials, 1) * 100
        conv_score = min(100, conv_rate * 4)  # 25% conversion = 100 score
        factors.append(GuestHealthFactor(
            name="Conversion Rate",
            score=round(conv_score, 1),
            weight=0.25,
            weighted_score=round(conv_score * 0.25, 1),
            impact="high" if conv_score < 40 else "medium" if conv_score < 60 else "low",
            detail=f"{conv_rate:.0f}% trial→member ({converted}/{total_trials})",
        ))

        # Factor 3: Repeat Visit Rate (weight 0.20)
        repeat = sum(1 for g in self._guests.values() if g.get("_visit_count", 1) > 1)
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
        ref_count = len(set(t.get("referred_by_family_id", "")
                           for t in self._trial_memberships.values()
                           if t.get("referred_by_family_id")))
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
        upcoming = sum(1 for e in self._private_events.values()
                       if e["status"] not in (PrivateEventStatus.COMPLETED.value,
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

    def _compute_guest_trend(self) -> str:
        """Compute overall trend from last 3 months."""
        sorted_m = sorted(self._monthly_snapshots.keys())[-3:]
        if len(sorted_m) < 2:
            return "stable"
        totals = []
        for month in sorted_m:
            snap = self._monthly_snapshots[month]
            totals.append(snap.get("new_guests", 0) + snap.get("check_ins", 0))
        if totals[-1] > totals[0] * 1.05:
            return "improving"
        elif totals[-1] < totals[0] * 0.95:
            return "declining"
        return "stable"
