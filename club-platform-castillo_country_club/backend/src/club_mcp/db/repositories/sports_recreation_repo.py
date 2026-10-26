"""
In-memory repository for Sports & Recreation domain entities.
All methods are async to match the project's repository pattern.
"""

from __future__ import annotations

from typing import Optional
from uuid import uuid4

from club_mcp.models.sports_recreation import (
    CalendarItemType,
    ClassEnrollmentStat,
    ClassType,
    CoachStat,
    CoachingEffectiveness,
    CoachingSession,
    CourtReservation,
    CourtUtilizationStat,
    CreateCoachingSession,
    CreateEquipment,
    CreateFitnessClass,
    CreateReservation,
    CreateSportLeague,
    CreateSportsRecommendation,
    CreateTournament,
    Equipment,
    EquipmentCondition,
    EquipmentLifecycleItem,
    FitnessClass,
    LeagueStatus,
    MemberSportProfile,
    ReservationStatus,
    SeasonalPattern,
    SportLeague,
    SportPopularity,
    SportsAnalytics,
    SportsCalendarItem,
    SportsHealthFactor,
    SportsHealthSummary,
    SportsProposal,
    SportsRecommendation,
    SportType,
    Tournament,
    TournamentMetrics,
    TournamentStatus,
)


class SportsRecreationRepository:
    """In-memory store for all sports & recreation entities."""

    def __init__(self) -> None:
        self._reservations: dict[str, dict] = {}
        self._tournaments: dict[str, dict] = {}
        self._fitness_classes: dict[str, dict] = {}
        self._coaching_sessions: dict[str, dict] = {}
        self._equipment: dict[str, dict] = {}
        self._leagues: dict[str, dict] = {}
        self._recommendations: dict[str, dict] = {}

    # ── helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def _gen_id(prefix: str) -> str:
        return f"{prefix}_{uuid4().hex[:8]}"

    # ── Reservations ──────────────────────────────────────────────────────

    async def create_reservation(self, data: CreateReservation) -> CourtReservation:
        rid = self._gen_id("res")
        rec = {
            "id": rid,
            **data.model_dump(),
            "status": ReservationStatus.CONFIRMED,
        }
        self._reservations[rid] = rec
        return CourtReservation(**rec)

    async def get_reservation(self, reservation_id: str) -> Optional[CourtReservation]:
        rec = self._reservations.get(reservation_id)
        return CourtReservation(**rec) if rec else None

    async def update_reservation(
        self, reservation_id: str, updates: dict
    ) -> Optional[CourtReservation]:
        rec = self._reservations.get(reservation_id)
        if not rec:
            return None
        rec.update(updates)
        self._reservations[reservation_id] = rec
        return CourtReservation(**rec)

    async def list_reservations(
        self,
        member_id: Optional[str] = None,
        sport: Optional[SportType] = None,
        date: Optional[str] = None,
        status: Optional[ReservationStatus] = None,
    ) -> list[CourtReservation]:
        results = list(self._reservations.values())
        if member_id:
            results = [r for r in results if r["member_id"] == member_id]
        if sport:
            results = [r for r in results if r["sport"] == sport]
        if date:
            results = [r for r in results if r["date"] == date]
        if status:
            results = [r for r in results if r["status"] == status]
        return [CourtReservation(**r) for r in results]

    # ── Tournaments ───────────────────────────────────────────────────────

    async def create_tournament(self, data: CreateTournament) -> Tournament:
        tid = self._gen_id("trn")
        rec = {
            "id": tid,
            **data.model_dump(),
            "current_participants": 0,
            "status": TournamentStatus.DRAFT,
        }
        self._tournaments[tid] = rec
        return Tournament(**rec)

    async def get_tournament(self, tournament_id: str) -> Optional[Tournament]:
        rec = self._tournaments.get(tournament_id)
        return Tournament(**rec) if rec else None

    async def update_tournament(
        self, tournament_id: str, updates: dict
    ) -> Optional[Tournament]:
        rec = self._tournaments.get(tournament_id)
        if not rec:
            return None
        rec.update(updates)
        self._tournaments[tournament_id] = rec
        return Tournament(**rec)

    async def list_tournaments(
        self,
        sport: Optional[SportType] = None,
        status: Optional[TournamentStatus] = None,
    ) -> list[Tournament]:
        results = list(self._tournaments.values())
        if sport:
            results = [t for t in results if t["sport"] == sport]
        if status:
            results = [t for t in results if t["status"] == status]
        return [Tournament(**t) for t in results]

    # ── Fitness Classes ───────────────────────────────────────────────────

    async def create_fitness_class(self, data: CreateFitnessClass) -> FitnessClass:
        cid = self._gen_id("cls")
        rec = {
            "id": cid,
            **data.model_dump(),
            "current_enrolled": 0,
            "is_active": True,
        }
        self._fitness_classes[cid] = rec
        return FitnessClass(**rec)

    async def get_fitness_class(self, class_id: str) -> Optional[FitnessClass]:
        rec = self._fitness_classes.get(class_id)
        return FitnessClass(**rec) if rec else None

    async def update_fitness_class(
        self, class_id: str, updates: dict
    ) -> Optional[FitnessClass]:
        rec = self._fitness_classes.get(class_id)
        if not rec:
            return None
        rec.update(updates)
        self._fitness_classes[class_id] = rec
        return FitnessClass(**rec)

    async def list_fitness_classes(
        self,
        sport: Optional[SportType] = None,
        class_type: Optional[ClassType] = None,
        active_only: bool = False,
    ) -> list[FitnessClass]:
        results = list(self._fitness_classes.values())
        if sport:
            results = [c for c in results if c["sport"] == sport]
        if class_type:
            results = [c for c in results if c["class_type"] == class_type]
        if active_only:
            results = [c for c in results if c.get("is_active", True)]
        return [FitnessClass(**c) for c in results]

    # ── Coaching Sessions ─────────────────────────────────────────────────

    async def create_coaching_session(
        self, data: CreateCoachingSession
    ) -> CoachingSession:
        sid = self._gen_id("coach")
        rec = {
            "id": sid,
            **data.model_dump(),
            "status": "scheduled",
        }
        self._coaching_sessions[sid] = rec
        return CoachingSession(**rec)

    async def get_coaching_session(
        self, session_id: str
    ) -> Optional[CoachingSession]:
        rec = self._coaching_sessions.get(session_id)
        return CoachingSession(**rec) if rec else None

    async def list_coaching_sessions(
        self,
        member_id: Optional[str] = None,
        coach_name: Optional[str] = None,
        sport: Optional[SportType] = None,
    ) -> list[CoachingSession]:
        results = list(self._coaching_sessions.values())
        if member_id:
            results = [s for s in results if s["member_id"] == member_id]
        if coach_name:
            results = [s for s in results if s["coach_name"] == coach_name]
        if sport:
            results = [s for s in results if s["sport"] == sport]
        return [CoachingSession(**s) for s in results]

    # ── Equipment ─────────────────────────────────────────────────────────

    async def create_equipment(self, data: CreateEquipment) -> Equipment:
        eid = self._gen_id("eq")
        rec = {
            "id": eid,
            **data.model_dump(),
            "notes": None,
            "last_maintenance": None,
        }
        self._equipment[eid] = rec
        return Equipment(**rec)

    async def get_equipment(self, equipment_id: str) -> Optional[Equipment]:
        rec = self._equipment.get(equipment_id)
        return Equipment(**rec) if rec else None

    async def update_equipment(
        self, equipment_id: str, updates: dict
    ) -> Optional[Equipment]:
        rec = self._equipment.get(equipment_id)
        if not rec:
            return None
        rec.update(updates)
        self._equipment[equipment_id] = rec
        return Equipment(**rec)

    async def list_equipment(
        self,
        sport: Optional[SportType] = None,
        location: Optional[str] = None,
    ) -> list[Equipment]:
        results = list(self._equipment.values())
        if sport:
            results = [e for e in results if e["sport"] == sport]
        if location:
            results = [e for e in results if e["location"] == location]
        return [Equipment(**e) for e in results]

    # ── Leagues ───────────────────────────────────────────────────────────

    async def create_league(self, data: CreateSportLeague) -> SportLeague:
        lid = self._gen_id("lg")
        rec = {
            "id": lid,
            **data.model_dump(),
            "current_round": 0,
            "standings": {},
            "status": LeagueStatus.PROPOSED,
        }
        self._leagues[lid] = rec
        return SportLeague(**rec)

    async def get_league(self, league_id: str) -> Optional[SportLeague]:
        rec = self._leagues.get(league_id)
        return SportLeague(**rec) if rec else None

    async def update_league(
        self, league_id: str, updates: dict
    ) -> Optional[SportLeague]:
        rec = self._leagues.get(league_id)
        if not rec:
            return None
        rec.update(updates)
        self._leagues[league_id] = rec
        return SportLeague(**rec)

    async def list_leagues(
        self,
        sport: Optional[SportType] = None,
        status: Optional[LeagueStatus] = None,
    ) -> list[SportLeague]:
        results = list(self._leagues.values())
        if sport:
            results = [l for l in results if l["sport"] == sport]
        if status:
            results = [l for l in results if l["status"] == status]
        return [SportLeague(**l) for l in results]

    # ── Recommendations ───────────────────────────────────────────────────

    async def create_recommendation(
        self, data: CreateSportsRecommendation
    ) -> SportsRecommendation:
        rid = self._gen_id("srec")
        rec = {"id": rid, **data.model_dump()}
        self._recommendations[rid] = rec
        return SportsRecommendation(**rec)

    async def list_recommendations(
        self,
        member_id: Optional[str] = None,
        sport: Optional[SportType] = None,
    ) -> list[SportsRecommendation]:
        results = list(self._recommendations.values())
        if member_id:
            results = [r for r in results if r["member_id"] == member_id]
        if sport:
            results = [r for r in results if r["sport"] == sport]
        return [SportsRecommendation(**r) for r in results]

    # ── Intelligence Aggregation Methods (F32) ───────────────────────────

    @staticmethod
    def _ev(value) -> str:
        """Extract string value from enum or return as-is if already a string."""
        return value.value if hasattr(value, "value") else str(value)

    @staticmethod
    def _safe_int(value: Any, default: int = 0) -> int:
        """Safely cast to int."""
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """Safely parse an ISO date string."""
        try:
            return datetime.fromisoformat(date_str)
        except (ValueError, TypeError):
            return None

    async def get_sport_popularity(self) -> list[SportPopularity]:
        """Rank sports by total activity across all entity types."""
        from collections import defaultdict

        counts: dict[str, dict[str, int]] = defaultdict(
            lambda: {"reservation": 0, "class": 0, "tournament": 0, "coaching": 0}
        )

        for r in self._reservations.values():
            if self._ev(r.get("status")) == "cancelled":
                continue
            counts[self._ev(r["sport"])]["reservation"] += 1

        for c in self._fitness_classes.values():
            if not c.get("is_active", True):
                continue
            counts[self._ev(c["sport"])]["class"] += 1

        for t in self._tournaments.values():
            counts[self._ev(t["sport"])]["tournament"] += 1

        for s in self._coaching_sessions.values():
            counts[self._ev(s["sport"])]["coaching"] += 1

        total_activity = max(1, sum(sum(c.values()) for c in counts.values()))

        result: list[SportPopularity] = []
        for sport_val, breakdown in counts.items():
            sport_total = sum(breakdown.values())
            try:
                sport_enum = SportType(sport_val)
            except ValueError:
                continue
            result.append(
                SportPopularity(
                    sport=sport_enum,
                    total_activity=sport_total,
                    reservation_count=breakdown["reservation"],
                    class_count=breakdown["class"],
                    tournament_count=breakdown["tournament"],
                    coaching_count=breakdown["coaching"],
                    activity_share_pct=round(sport_total / total_activity * 100, 1),
                    popularity_rank=0,
                )
            )

        result.sort(key=lambda x: x.total_activity, reverse=True)
        for idx, item in enumerate(result):
            item.popularity_rank = idx + 1

        return result

    async def get_court_utilization(
        self, lookback_days: int = 30
    ) -> list[CourtUtilizationStat]:
        """Calculate per-court utilization over a lookback period."""
        from collections import defaultdict

        now = datetime.utcnow()
        cutoff_ts = (now - __import__("datetime").timedelta(days=lookback_days)).timestamp()

        court_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"sport": None, "booked_hours": 0, "bookings": []}
        )

        for r in self._reservations.values():
            if self._ev(r.get("status")) == "cancelled":
                continue
            res_dt = self._parse_date(r["date"])
            if res_dt is None or res_dt.timestamp() < cutoff_ts:
                continue

            court = r["court_name"]
            court_data[court]["sport"] = r["sport"]
            court_data[court]["bookings"].append(r)

            start_parts = r.get("start_time", "0:00").split(":")
            end_parts = r.get("end_time", "0:00").split(":")
            start_min = int(start_parts[0]) * 60 + int(start_parts[1]) if len(start_parts) >= 2 else 0
            end_min = int(end_parts[0]) * 60 + int(end_parts[1]) if len(end_parts) >= 2 else 0
            hours = max(0, (end_min - start_min) / 60)
            court_data[court]["booked_hours"] += hours

        available_hours_per_day = 14  # 7am–9pm
        total_available = available_hours_per_day * lookback_days

        result: list[CourtUtilizationStat] = []
        for court_name, data in court_data.items():
            booked = data["booked_hours"]
            util_pct = round(booked / total_available * 100, 1) if total_available > 0 else 0.0

            hour_counts: dict[str, int] = defaultdict(int)
            for b in data["bookings"]:
                h = b.get("start_time", "0:00").split(":")[0]
                hour_counts[f"{h}:00"] += 1

            peak = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_hours = [h[0] for h in peak]
            avg_daily = round(booked / lookback_days, 1) if lookback_days > 0 else 0.0

            result.append(
                CourtUtilizationStat(
                    court_name=court_name,
                    sport=data["sport"],
                    total_slots=total_available,
                    booked_slots=int(booked),
                    utilization_pct=util_pct,
                    peak_hours=peak_hours,
                    avg_daily_bookings=avg_daily,
                    trend="stable",
                )
            )

        result.sort(key=lambda x: x.utilization_pct, reverse=True)
        return result

    async def get_class_enrollment_stats(self) -> list[ClassEnrollmentStat]:
        """Calculate enrollment performance for all active fitness classes."""
        result: list[ClassEnrollmentStat] = []

        for c in self._fitness_classes.values():
            if not c.get("is_active", True):
                continue

            enrolled = self._safe_int(c.get("current_enrolled", 0))
            capacity = max(1, self._safe_int(c.get("max_capacity", 1)))
            fill_rate = round(enrolled / capacity * 100, 1)

            result.append(
                ClassEnrollmentStat(
                    class_id=c["id"],
                    name=c["name"],
                    sport=c["sport"],
                    class_type=c["class_type"],
                    enrolled=enrolled,
                    capacity=capacity,
                    fill_rate_pct=fill_rate,
                    is_underperforming=fill_rate < 40,
                    instructor=c.get("instructor", ""),
                    schedule_day=c.get("schedule_day", ""),
                )
            )

        result.sort(key=lambda x: x.fill_rate_pct)
        return result

    async def get_tournament_metrics(self) -> TournamentMetrics:
        """Aggregate tournament statistics across all tournaments."""
        tournaments = list(self._tournaments.values())

        if not tournaments:
            return TournamentMetrics()

        by_status: dict[str, int] = {}
        total_participation_ratio = 0.0
        total_revenue = 0.0
        upcoming = 0
        in_progress = 0
        completed = 0
        total_entry_fees = 0.0
        count_with_participants = 0

        for t in tournaments:
            status_val = self._ev(t.get("status", "draft"))
            by_status[status_val] = by_status.get(status_val, 0) + 1

            max_p = max(1, self._safe_int(t.get("max_participants", 0)))
            cur_p = self._safe_int(t.get("current_participants", 0))
            fee = float(t.get("entry_fee", 0) or 0)

            total_participation_ratio += cur_p / max_p
            count_with_participants += 1
            total_revenue += cur_p * fee
            total_entry_fees += fee

            if status_val in ("registration_open", "confirmed", "draft"):
                upcoming += 1
            elif status_val == "in_progress":
                in_progress += 1
            elif status_val == "completed":
                completed += 1

        avg_participation = (
            round(total_participation_ratio / count_with_participants * 100, 1)
            if count_with_participants > 0
            else 0.0
        )

        return TournamentMetrics(
            total_tournaments=len(tournaments),
            by_status=by_status,
            avg_participation_rate=avg_participation,
            total_revenue=round(total_revenue, 2),
            upcoming_count=upcoming,
            in_progress_count=in_progress,
            completed_count=completed,
            avg_entry_fee=round(total_entry_fees / len(tournaments), 2) if tournaments else 0.0,
        )

    async def get_equipment_lifecycle(self) -> list[EquipmentLifecycleItem]:
        """Assess equipment condition and urgency for replacement/maintenance."""
        condition_urgency: dict[str, int] = {
            EquipmentCondition.NEW.value: 0,
            EquipmentCondition.GOOD.value: 10,
            EquipmentCondition.FAIR.value: 40,
            EquipmentCondition.NEEDS_REPAIR.value: 80,
            EquipmentCondition.RETIRED.value: 100,
        }

        result: list[EquipmentLifecycleItem] = []

        for e in self._equipment.values():
            cond = e.get("condition", EquipmentCondition.GOOD)
            cond_val = self._ev(cond)
            try:
                condition_enum = EquipmentCondition(cond_val)
            except ValueError:
                condition_enum = EquipmentCondition.GOOD

            base_urgency = condition_urgency.get(cond_val, 10)

            # Factor in maintenance recency
            days_since: Optional[int] = None
            maintenance_str = e.get("last_maintenance")
            if maintenance_str:
                last_dt = self._parse_date(maintenance_str)
                if last_dt is not None:
                    days_since = (datetime.utcnow() - last_dt).days
                    if days_since > 365:
                        base_urgency = min(100, base_urgency + 30)
                    elif days_since > 180:
                        base_urgency = min(100, base_urgency + 15)

            # Low availability increases urgency
            total_qty = max(1, self._safe_int(e.get("total_quantity", 1)))
            avail_qty = self._safe_int(e.get("available_quantity", 0))
            if avail_qty / total_qty < 0.2:
                base_urgency = min(100, base_urgency + 20)

            if base_urgency >= 80:
                action = "replace_urgent"
            elif base_urgency >= 60:
                action = "replace_soon"
            elif base_urgency >= 35:
                action = "schedule_maintenance"
            else:
                action = "ok"

            result.append(
                EquipmentLifecycleItem(
                    equipment_id=e["id"],
                    name=e["name"],
                    sport=e["sport"],
                    condition=condition_enum,
                    urgency_score=float(base_urgency),
                    needs_attention=base_urgency >= 35,
                    days_since_maintenance=days_since,
                    recommended_action=action,
                )
            )

        result.sort(key=lambda x: x.urgency_score, reverse=True)
        return result

    async def get_coaching_effectiveness(self) -> CoachingEffectiveness:
        """Aggregate coaching session statistics by coach."""
        from collections import defaultdict

        sessions = list(self._coaching_sessions.values())

        if not sessions:
            return CoachingEffectiveness()

        coach_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"session_count": 0, "members": set(), "sports": defaultdict(int)}
        )

        all_members: set[str] = set()

        for s in sessions:
            coach = s.get("coach_name", "Unknown")
            member = s.get("member_id", "")
            sport_val = self._ev(s.get("sport", ""))

            coach_data[coach]["session_count"] += 1
            coach_data[coach]["members"].add(member)
            coach_data[coach]["sports"][sport_val] += 1
            all_members.add(member)

        coaches: list[CoachStat] = []
        top_coach: Optional[str] = None
        max_sessions = 0

        for name, data in coach_data.items():
            member_count = len(data["members"])
            pop_sports = sorted(
                data["sports"].items(), key=lambda x: x[1], reverse=True
            )[:3]

            coaches.append(
                CoachStat(
                    name=name,
                    session_count=data["session_count"],
                    unique_members=member_count,
                    popular_sports=[s[0] for s in pop_sports],
                    avg_sessions_per_member=(
                        round(data["session_count"] / member_count, 1)
                        if member_count > 0
                        else 0.0
                    ),
                )
            )

            if data["session_count"] > max_sessions:
                max_sessions = data["session_count"]
                top_coach = name

        coaches.sort(key=lambda x: x.session_count, reverse=True)
        unique_count = len(all_members)

        return CoachingEffectiveness(
            coaches=coaches,
            total_sessions=len(sessions),
            avg_sessions_per_member=(
                round(len(sessions) / unique_count, 1) if unique_count > 0 else 0.0
            ),
            unique_members_coached=unique_count,
            top_coach=top_coach,
        )

    async def get_seasonal_patterns(self) -> list[SeasonalPattern]:
        """Analyze monthly activity distribution with Costa Rica seasonal context."""
        from collections import defaultdict

        MONTH_NAMES = [
            "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
        ]
        PEAK_MONTHS = {12, 1, 2, 3, 4}

        monthly: dict[int, dict[str, Any]] = defaultdict(
            lambda: {"reservation": 0, "class": 0, "tournament": 0, "sports": defaultdict(int)}
        )

        for r in self._reservations.values():
            dt = self._parse_date(r.get("date", ""))
            if dt is not None:
                m = dt.month
                monthly[m]["reservation"] += 1
                monthly[m]["sports"][self._ev(r["sport"])] += 1

        # Classes: each active class ≈ 4 sessions/month (weekly)
        for c in self._fitness_classes.values():
            if not c.get("is_active", True):
                continue
            sport_val = self._ev(c["sport"])
            for m in range(1, 13):
                monthly[m]["class"] += 4
                monthly[m]["sports"][sport_val] += 4

        for t in self._tournaments.values():
            dt = self._parse_date(t.get("start_date", ""))
            if dt is not None:
                m = dt.month
                monthly[m]["tournament"] += 1
                monthly[m]["sports"][self._ev(t["sport"])] += 1

        result: list[SeasonalPattern] = []
        for m in range(1, 13):
            data = monthly[m]
            total = data["reservation"] + data["class"] + data["tournament"]
            dominant = None
            if data["sports"]:
                dominant = max(data["sports"].items(), key=lambda x: x[1])[0]

            result.append(
                SeasonalPattern(
                    month=m,
                    month_name=MONTH_NAMES[m],
                    activity_count=total,
                    dominant_sport=dominant,
                    is_peak_season=m in PEAK_MONTHS,
                    reservation_count=data["reservation"],
                    class_count=data["class"],
                    tournament_count=data["tournament"],
                )
            )

        return result

    async def get_member_sport_profile(self, member_id: str) -> MemberSportProfile:
        """Build a complete sport profile for a specific member."""
        from collections import defaultdict

        sports_played: set[str] = set()
        total_sessions = 0
        sport_counts: dict[str, int] = defaultdict(int)
        coaching_count = 0
        active_reservations = 0
        skill_levels: dict[str, str] = {}

        for r in self._reservations.values():
            if r.get("member_id") != member_id:
                continue
            sport_val = self._ev(r["sport"])
            sports_played.add(sport_val)
            sport_counts[sport_val] += 1
            total_sessions += 1
            if self._ev(r.get("status")) in ("confirmed", "pending"):
                active_reservations += 1

        for s in self._coaching_sessions.values():
            if s.get("member_id") != member_id:
                continue
            sport_val = self._ev(s["sport"])
            sports_played.add(sport_val)
            sport_counts[sport_val] += 1
            total_sessions += 1
            coaching_count += 1
            sl = s.get("skill_level")
            if sl:
                skill_levels[sport_val] = self._ev(sl)

        for rec in self._recommendations.values():
            if rec.get("member_id") != member_id:
                continue
            sports_played.add(self._ev(rec["sport"]))

        favorite = max(sport_counts.items(), key=lambda x: x[1])[0] if sport_counts else None

        return MemberSportProfile(
            member_id=member_id,
            sports_played=sorted(sports_played),
            total_sessions=total_sessions,
            favorite_sport=favorite,
            coaching_sessions=coaching_count,
            tournament_participations=0,
            active_reservations=active_reservations,
            skill_levels=skill_levels,
        )
