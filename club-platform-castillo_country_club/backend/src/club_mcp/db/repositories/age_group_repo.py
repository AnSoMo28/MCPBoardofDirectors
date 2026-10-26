"""In-memory age group repository with generational intelligence.

Production-ready with async methods, seed data simulating 6 months
of Castillo Country Club activity, and 5 intelligence computation methods.
Production will swap for PostgreSQL + SQLAlchemy.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from club_mcp.models.age_group_activity import (
    ActivityRecommendation,
    AgeGroupActivity,
    AgeGroupActivityCreate,
    AgeGroupActivityStatus,
    AgeGroupBalanceStatus,
    AgeGroupCategory,
    AgeGroupDemographics,
    AgeGroupDistribution,
    AgeGroupForecast,
    AgeGroupHealthFactor,
    AgeGroupHealthLevel,
    AgeGroupHealthScore,
    AgeGroupSummary,
    CrossDomainSignal,
    DemandProjection,
    EngagementProposal,
    EngagementProposalList,
    ForecastItem,
    GenerationalAnalytics,
    GenerationalProposalType,
    ParticipationRecord,
    ParticipationTrendPoint,
    SeasonalPattern,
)

logger = logging.getLogger(__name__)


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


AGE_GROUP_DESCRIPTIONS: dict[str, str] = {
    "toddler": "Pequeñitos de 0-3 años 👶",
    "kids": "Niños de 4-12 años 🧒",
    "teens": "Adolescentes de 13-17 años 🧑‍🎤",
    "young_adults": "Jóvenes de 18-25 años 🧑‍🎓",
    "adults": "Adultos de 26-59 años 🧑‍💼",
    "seniors": "Adultos mayores de 60+ 🧓",
}

IDEAL_PCT = round(100 / 6, 1)  # 16.7% per group

_BASE_SATISFACTION: dict[str, float] = {
    "toddler": 4.3, "kids": 4.1, "teens": 3.2,
    "young_adults": 3.8, "adults": 4.4, "seniors": 4.5,
}

_ENROLLMENT_RATE: dict[str, float] = {
    "toddler": 0.60, "kids": 0.75, "teens": 0.35,
    "young_adults": 0.50, "adults": 0.65, "seniors": 0.55,
}

_SEASONAL_MULTIPLIER: dict[int, float] = {
    1: 1.2, 2: 1.15, 3: 1.0, 4: 0.95,
    5: 0.85, 6: 0.80, 7: 1.1, 8: 1.0,
    9: 0.85, 10: 0.80, 11: 0.95, 12: 1.25,
}

MONTH_NAMES_ES: dict[int, str] = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


class AgeGroupRepository:
    """Repository for age group activities with generational intelligence.

    Seed data simulates 6 months of Castillo Country Club activity:
    - 47 activities across 6 age groups
    - 12 families with realistic enrollment patterns
    - Participation trends: toddlers (growing), kids (strong),
      teens (declining), young_adults (stable), adults (strong), seniors (growing)
    """

    def __init__(self, *, seed_demo_data: bool = False) -> None:
        self._activities: dict[str, dict[str, Any]] = {}
        self._member_counts: dict[str, int] = {
            ag.value: 0 for ag in AgeGroupCategory
        }
        self._family_counts: dict[str, int] = {
            ag.value: 0 for ag in AgeGroupCategory
        }
        self._enrollment: dict[str, list[dict[str, Any]]] = {}
        self._monthly_snapshots: dict[
            str, dict[str, dict[str, float]]
        ] = {}
        if seed_demo_data:
            self._seed_data()

    # ── Seed Data ──────────────────────────────────────────

    def _seed_data(self) -> None:
        """Populate repository with realistic Castillo Country Club data."""
        self._member_counts = {
            "toddler": 15, "kids": 38, "teens": 12,
            "young_adults": 24, "adults": 28, "seniors": 10,
        }
        self._family_counts = {
            "toddler": 10, "kids": 20, "teens": 9,
            "young_adults": 15, "adults": 18, "seniors": 7,
        }
        self._seed_activities()
        self._seed_enrollments()
        self._seed_monthly_snapshots()
        logger.info(
            "[age_group_repo] Seeded: %d activities, %d families, %d months",
            len(self._activities),
            len(self._enrollment),
            len(self._monthly_snapshots),
        )

    def _seed_activities(self) -> None:
        """Create 47 activities across 6 age groups."""
        _defs = [
            # ── Toddler (4) ──
            ("Mini Gym", "toddler", "easy", "Gimnasio Kids", 8, 45, "María Fernández", ["physical", "motor"], ["mon", "wed", "fri"], "09:00"),
            ("Baby Swim", "toddler", "easy", "Piscina Infantil", 6, 30, "Ana Rojas", ["swimming", "water"], ["tue", "thu"], "10:00"),
            ("Arts & Play", "toddler", "easy", "Salón Infantil", 10, 60, "", ["creative", "arts"], ["mon", "wed"], "10:30"),
            ("Música y Movimiento", "toddler", "easy", "Estudio A", 8, 45, "Laura Méndez", ["music", "movement"], ["tue", "thu"], "09:30"),
            # ── Kids (10) ──
            ("Natación Infantil", "kids", "medium", "Piscina Principal", 12, 60, "Carlos Mora", ["swimming", "sport"], ["mon", "wed", "fri"], "14:00"),
            ("Fútbol", "kids", "easy", "Cancha Multiuso", 20, 60, "Diego Vargas", ["soccer", "team"], ["tue", "thu"], "15:00"),
            ("Tenis Intro", "kids", "medium", "Cancha Tenis 3", 8, 60, "Roberto Solano", ["tennis", "racket"], ["mon", "wed"], "15:00"),
            ("Artes y Manualidades", "kids", "easy", "Salón Infantil", 15, 60, "", ["creative", "crafts"], ["tue", "thu"], "14:00"),
            ("Clase de Cocina", "kids", "medium", "Cocina Demo", 10, 90, "Chef Andrea", ["cooking", "skills"], ["sat"], "10:00"),
            ("Club de Ajedrez", "kids", "medium", "Biblioteca", 12, 60, "Prof. Jiménez", ["chess", "mental"], ["wed", "fri"], "15:30"),
            ("Baile Juvenil", "kids", "easy", "Estudio A", 15, 60, "Valentina Solís", ["dance", "expression"], ["mon", "wed"], "16:00"),
            ("Karate", "kids", "medium", "Dojo", 12, 60, "Sensei Ramírez", ["martial", "discipline"], ["tue", "thu"], "16:00"),
            ("Campamento de Verano", "kids", "easy", "Áreas Verdes", 25, 240, "Equipo Camp", ["outdoor", "adventure"], ["sat"], "08:00"),
            ("Exploradores de la Naturaleza", "kids", "easy", "Jardines", 15, 90, "Biol. Salazar", ["nature", "science"], ["fri"], "14:00"),
            # ── Teens (8) ──
            ("Tenis Juvenil", "teens", "medium", "Cancha Tenis 1", 8, 60, "Roberto Solano", ["tennis", "racket"], ["mon", "wed", "fri"], "16:00"),
            ("Basketball", "teens", "medium", "Cancha Multiuso", 12, 60, "Coach Pérez", ["basketball", "team"], ["tue", "thu"], "16:00"),
            ("Natación Avanzada", "teens", "hard", "Piscina Principal", 10, 60, "Carlos Mora", ["swimming", "competitive"], ["mon", "wed", "fri"], "15:00"),
            ("Club de Fotos", "teens", "easy", "Salón B", 10, 90, "Fotógrafo Quesada", ["photography", "creative"], ["thu"], "16:00"),
            ("Baile Contemporáneo", "teens", "medium", "Estudio A", 12, 60, "Valentina Solís", ["dance", "expression"], ["tue", "thu"], "17:00"),
            ("Cocina para Teens", "teens", "medium", "Cocina Demo", 8, 90, "Chef Andrea", ["cooking", "independence"], ["sat"], "11:30"),
            ("Aventura Extrema", "teens", "hard", "Áreas Verdes", 10, 120, "Guía Montero", ["adventure", "outdoor"], ["sat"], "08:00"),
            ("Gaming Lounge", "teens", "easy", "Salón Teens", 12, 120, "", ["gaming", "social"], ["fri", "sat"], "15:00"),
            # ── Young Adults (8) ──
            ("Tenis Competitivo", "young_adults", "hard", "Cancha Tenis 2", 6, 90, "Roberto Solano", ["tennis", "competitive"], ["mon", "wed", "fri"], "18:00"),
            ("Fitness Grupal", "young_adults", "medium", "Gimnasio", 20, 60, "Coach Aguirre", ["fitness", "health"], ["mon", "wed", "fri"], "07:00"),
            ("Yoga", "young_adults", "easy", "Estudio B", 15, 60, "Instr. Campos", ["yoga", "wellness"], ["tue", "thu", "sat"], "07:30"),
            ("Social Mixer", "young_adults", "easy", "Terraza", 30, 120, "", ["social", "networking"], ["fri"], "19:00"),
            ("Cocina Gourmet", "young_adults", "hard", "Cocina Demo", 8, 120, "Chef Rodríguez", ["cooking", "gourmet"], ["sat"], "18:00"),
            ("Golf Intro", "young_adults", "medium", "Driving Range", 10, 90, "Pro Torres", ["golf", "skill"], ["sun"], "09:00"),
            ("Piscina Libre Jóvenes", "young_adults", "easy", "Piscina Principal", 25, 0, "", ["swimming", "social"], ["sat", "sun"], "12:00"),
            ("Padel", "young_adults", "medium", "Cancha Padel", 4, 60, "Coach Díaz", ["padel", "racket"], ["tue", "thu"], "18:00"),
            # ── Adults (10) ──
            ("Tenis Social", "adults", "medium", "Cancha Tenis 1", 8, 90, "Roberto Solano", ["tennis", "social"], ["mon", "wed", "fri"], "07:00"),
            ("Golf Club", "adults", "medium", "Campo de Golf", 16, 180, "Pro Torres", ["golf", "premium"], ["sat", "sun"], "07:00"),
            ("Fitness Elite", "adults", "medium", "Gimnasio", 25, 60, "Coach Aguirre", ["fitness", "health"], ["mon", "tue", "wed", "thu", "fri"], "06:00"),
            ("Yoga Adultos", "adults", "easy", "Estudio B", 15, 60, "Instr. Campos", ["yoga", "wellness"], ["mon", "wed", "fri"], "09:00"),
            ("Natación Adultos", "adults", "easy", "Piscina Principal", 15, 60, "", ["swimming", "fitness"], ["mon", "wed", "fri"], "07:00"),
            ("Club de Vinos", "adults", "easy", "Wine Cellar", 20, 120, "Sommelier Herrera", ["wine", "social"], ["thu"], "19:00"),
            ("Club de Lectura", "adults", "easy", "Biblioteca", 12, 90, "", ["reading", "culture"], ["tue"], "10:00"),
            ("Clase Cocina Gourmet", "adults", "medium", "Cocina Demo", 10, 120, "Chef Rodríguez", ["cooking", "gourmet"], ["wed"], "18:30"),
            ("Running Club", "adults", "medium", "Senderos", 20, 60, "Coach Mora", ["running", "fitness"], ["tue", "thu", "sat"], "06:00"),
            ("Padel Adultos", "adults", "medium", "Cancha Padel", 4, 60, "Coach Díaz", ["padel", "racket"], ["mon", "wed", "fri"], "18:00"),
            # ── Seniors (7) ──
            ("Aqua Aeróbicos", "seniors", "easy", "Piscina Shallow", 12, 45, "Instr. Villalta", ["aqua", "low-impact"], ["mon", "wed", "fri"], "09:00"),
            ("Yoga Suave", "seniors", "easy", "Estudio B", 12, 45, "Instr. Campos", ["yoga", "gentle"], ["tue", "thu"], "09:30"),
            ("Club de Caminata", "seniors", "easy", "Senderos", 15, 45, "", ["walking", "social"], ["mon", "wed", "fri"], "07:00"),
            ("Bridge Club", "seniors", "medium", "Salón Social", 16, 120, "", ["bridge", "mental"], ["tue", "thu"], "14:00"),
            ("Jardinería", "seniors", "easy", "Huerto Club", 10, 90, "Jardinero Solís", ["gardening", "nature"], ["wed", "sat"], "08:00"),
            ("Tai Chi", "seniors", "easy", "Jardín Zen", 15, 60, "Maestro Chen", ["tai-chi", "balance"], ["mon", "wed", "fri"], "07:30"),
            ("Cocina Saludable", "seniors", "easy", "Cocina Demo", 8, 90, "Nutric. Paniagua", ["cooking", "health"], ["thu"], "10:00"),
        ]

        for name, ag, diff, loc, pax, dur, instr, tags, days, time in _defs:
            aid = _gen_id("act")
            now = datetime.now(timezone.utc).isoformat()
            self._activities[aid] = {
                "id": aid,
                "name": name,
                "description": f"Actividad de {name.lower()} para {ag}",
                "age_group": ag,
                "difficulty": diff,
                "location": loc,
                "max_participants": pax,
                "duration_minutes": dur,
                "requires_instructor": bool(instr),
                "instructor_name": instr,
                "equipment_needed": [],
                "tags": tags,
                "status": AgeGroupActivityStatus.ACTIVE.value,
                "schedule_days": days,
                "schedule_time": time,
                "created_at": now,
                "updated_at": now,
            }

    def _seed_enrollments(self) -> None:
        """Generate realistic enrollment data for all activities."""
        family_ids = [f"fam-{i:03d}" for i in range(1, 13)]

        for aid, act in self._activities.items():
            group = act["age_group"]
            max_pax = act["max_participants"]
            rate = _ENROLLMENT_RATE.get(group, 0.5)
            num_enrolled = max(1, int(max_pax * rate))
            base_sat = _BASE_SATISFACTION.get(group, 4.0)

            enrollments: list[dict[str, Any]] = []
            for i in range(min(num_enrolled, len(family_ids))):
                status = (
                    "active" if i < int(num_enrolled * 0.8) else "completed"
                )
                sat_delta = ((hash(aid + family_ids[i]) % 10) - 5) / 10
                satisfaction = round(
                    max(1.0, min(5.0, base_sat + sat_delta)), 1
                )
                enrollments.append(
                    {
                        "family_id": family_ids[i],
                        "enrolled_at": (
                            f"2026-0{min(6, max(1, (i % 6) + 1))}"
                            f"-{10 + (i % 15):02d}"
                        ),
                        "status": status,
                        "satisfaction": satisfaction,
                    }
                )
            self._enrollment[aid] = enrollments

    def _seed_monthly_snapshots(self) -> None:
        """Generate 6 months of participation data with realistic patterns."""
        enrollment_patterns: dict[str, tuple[int, ...]] = {
            "toddler": (8, 9, 10, 10, 11, 12),
            "kids": (45, 48, 50, 47, 44, 42),
            "teens": (18, 16, 14, 12, 10, 8),
            "young_adults": (20, 22, 21, 23, 22, 24),
            "adults": (35, 38, 40, 42, 39, 41),
            "seniors": (6, 7, 7, 8, 7, 9),
        }
        satisfaction_patterns: dict[str, tuple[float, ...]] = {
            "toddler": (4.2, 4.3, 4.3, 4.4, 4.3, 4.3),
            "kids": (4.1, 4.0, 4.1, 4.1, 4.0, 4.1),
            "teens": (3.5, 3.4, 3.3, 3.2, 3.1, 3.2),
            "young_adults": (3.7, 3.8, 3.8, 3.9, 3.8, 3.8),
            "adults": (4.3, 4.3, 4.4, 4.4, 4.4, 4.4),
            "seniors": (4.4, 4.5, 4.5, 4.5, 4.5, 4.5),
        }
        months = [
            "2026-01", "2026-02", "2026-03",
            "2026-04", "2026-05", "2026-06",
        ]

        for idx, month in enumerate(months):
            self._monthly_snapshots[month] = {}
            for ag in AgeGroupCategory:
                gv = ag.value
                enrolled = enrollment_patterns[gv][idx]
                prev = (
                    enrollment_patterns[gv][idx - 1]
                    if idx > 0
                    else enrolled
                )
                self._monthly_snapshots[month][gv] = {
                    "enrolled": enrolled,
                    "satisfaction": satisfaction_patterns[gv][idx],
                    "new_enrollments": max(0, enrolled - prev),
                    "retention_rate": round(
                        min(95.0, 70 + enrolled * 0.5), 1
                    ),
                }

    # ── Activity CRUD (async) ──────────────────────────────

    async def create_activity(
        self, data: AgeGroupActivityCreate
    ) -> AgeGroupActivity:
        aid = _gen_id("act")
        now = datetime.now(timezone.utc).isoformat()
        rec: dict[str, Any] = {
            "id": aid,
            "name": data.name,
            "description": data.description,
            "age_group": data.age_group.value,
            "difficulty": data.difficulty.value,
            "location": data.location,
            "max_participants": data.max_participants,
            "duration_minutes": data.duration_minutes,
            "requires_instructor": data.requires_instructor,
            "instructor_name": data.instructor_name,
            "equipment_needed": list(data.equipment_needed),
            "tags": list(data.tags),
            "status": AgeGroupActivityStatus.ACTIVE.value,
            "schedule_days": list(data.schedule_days),
            "schedule_time": data.schedule_time,
            "created_at": now,
            "updated_at": now,
        }
        self._activities[aid] = rec
        self._enrollment.setdefault(aid, [])
        return self._to_activity(aid)

    async def get_activity(
        self, activity_id: str
    ) -> AgeGroupActivity | None:
        if activity_id not in self._activities:
            return None
        return self._to_activity(activity_id)

    async def update_activity(
        self, activity_id: str, updates: dict[str, Any]
    ) -> AgeGroupActivity | None:
        if activity_id not in self._activities:
            return None
        rec = self._activities[activity_id]
        for key, val in updates.items():
            if val is not None:
                rec[key] = val.value if hasattr(val, "value") else val
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        return self._to_activity(activity_id)

    async def delete_activity(self, activity_id: str) -> bool:
        if activity_id not in self._activities:
            return False
        del self._activities[activity_id]
        self._enrollment.pop(activity_id, None)
        return True

    async def list_activities(
        self,
        age_group: str | None = None,
        status: str | None = None,
    ) -> list[AgeGroupActivity]:
        out: list[AgeGroupActivity] = []
        for aid, rec in self._activities.items():
            if age_group and rec["age_group"] != age_group:
                continue
            if status and rec["status"] != status:
                continue
            out.append(self._to_activity(aid))
        return out

    # ── Age Group Summaries (async) ────────────────────────

    async def get_age_group_summary(
        self, age_group: str
    ) -> AgeGroupSummary | None:
        if age_group not in AGE_GROUP_DESCRIPTIONS:
            return None
        activities = await self.list_activities(age_group=age_group)
        return AgeGroupSummary(
            age_group=age_group,
            description=AGE_GROUP_DESCRIPTIONS.get(age_group, ""),
            member_count=self._member_counts.get(age_group, 0),
            family_count=self._family_counts.get(age_group, 0),
            activity_count=len(activities),
            activities=activities,
        )

    async def list_age_groups(self) -> list[AgeGroupSummary]:
        out: list[AgeGroupSummary] = []
        for ag in AgeGroupCategory:
            summary = await self.get_age_group_summary(ag.value)
            if summary:
                out.append(summary)
        return out

    # ── Demographics (async) ───────────────────────────────

    async def get_demographics(
        self, age_group: str | None = None
    ) -> list[AgeGroupDemographics]:
        total_club = max(sum(self._member_counts.values()), 1)
        groups = (
            [age_group]
            if age_group
            else [ag.value for ag in AgeGroupCategory]
        )
        out: list[AgeGroupDemographics] = []
        for ag in groups:
            mc = self._member_counts.get(ag, 0)
            fc = self._family_counts.get(ag, 0)
            activities = await self.list_activities(age_group=ag)
            active_count = sum(
                1
                for a in activities
                if a.status == AgeGroupActivityStatus.ACTIVE
            )
            out.append(
                AgeGroupDemographics(
                    age_group=ag,
                    total_members=mc,
                    total_families=fc,
                    percentage_of_club=round(mc / total_club * 100, 1),
                    active_participants=active_count,
                    activity_count=len(activities),
                )
            )
        return out

    # ── Participation (async) ──────────────────────────────

    async def get_participation(
        self, age_group: str | None = None
    ) -> list[ParticipationRecord]:
        activities = await self.list_activities(age_group=age_group)
        out: list[ParticipationRecord] = []
        for act in activities:
            enrollments = self._enrollment.get(act.id, [])
            active_enr = [
                e for e in enrollments if e["status"] == "active"
            ]
            enrolled = len(active_enr)
            avg_sat = (
                round(
                    sum(e["satisfaction"] for e in active_enr)
                    / len(active_enr),
                    1,
                )
                if active_enr
                else 0.0
            )
            retention = round(min(95.0, 70 + enrolled * 0.5), 1)
            out.append(
                ParticipationRecord(
                    activity_id=act.id,
                    activity_name=act.name,
                    age_group=act.age_group,
                    total_enrolled=enrolled,
                    average_attendance=round(enrolled * 0.75, 1),
                    sessions_held=enrolled * 4,
                    satisfaction_score=avg_sat,
                    retention_rate=retention,
                )
            )
        return out

    # ── Recommendations (async, upgraded) ──────────────────

    async def get_recommendations(
        self, age_groups: list[str]
    ) -> list[ActivityRecommendation]:
        recs: list[ActivityRecommendation] = []
        for ag in age_groups:
            activities = await self.list_activities(
                age_group=ag, status="active"
            )
            for act in activities:
                enrollments = self._enrollment.get(act.id, [])
                active_enr = [
                    e for e in enrollments if e["status"] == "active"
                ]
                enrolled = len(active_enr)
                capacity = act.max_participants or 1
                utilization = enrolled / capacity if capacity > 0 else 0
                avg_sat = (
                    sum(e["satisfaction"] for e in active_enr)
                    / len(active_enr)
                    if active_enr
                    else 4.0
                )
                availability = max(0, 1 - utilization)
                confidence = round(
                    min(
                        0.99,
                        (avg_sat / 5.0) * 0.6 + availability * 0.4,
                    ),
                    2,
                )

                reasons: list[str] = []
                if avg_sat >= 4.0:
                    reasons.append(
                        f"alta satisfacción ({avg_sat:.1f}/5)"
                    )
                if availability > 0.3:
                    reasons.append(
                        f"disponibilidad ({int(availability * 100)}%)"
                    )
                if act.tags:
                    reasons.append(f"tags: {', '.join(act.tags[:3])}")

                recs.append(
                    ActivityRecommendation(
                        activity_id=act.id,
                        activity_name=act.name,
                        age_group=act.age_group,
                        match_reason=(
                            " · ".join(reasons)
                            if reasons
                            else f"Actividad para {ag}"
                        ),
                        confidence=confidence,
                    )
                )
        recs.sort(key=lambda r: r.confidence, reverse=True)
        return recs[:10]

    # ── INTELLIGENCE METHODS (new) ─────────────────────────

    async def get_health_score(self) -> AgeGroupHealthScore:
        """Compute composite health score with 5 weighted factors."""
        factors = self._compute_health_factors()
        total = round(sum(f.weighted_score for f in factors), 1)
        level = (
            AgeGroupHealthLevel.EXCELLENT
            if total >= 85
            else (
                AgeGroupHealthLevel.HEALTHY
                if total >= 65
                else (
                    AgeGroupHealthLevel.ATTENTION
                    if total >= 45
                    else AgeGroupHealthLevel.CRITICAL
                )
            )
        )
        trend = self._compute_trend()

        critical = [f for f in factors if f.impact == "high"]
        summary = (
            f"Score {total}/100 ({level.value}). "
            f"{len(critical)} factor(es) requieren atención: "
            f"{', '.join(f.name for f in critical)}"
            if critical
            else f"Score {total}/100 ({level.value}). "
            f"Todos los factores en rango saludable."
        )

        return AgeGroupHealthScore(
            score=int(total),
            level=level,
            factors=factors,
            trend=trend,
            summary=summary,
        )

    async def get_generational_analytics(
        self,
    ) -> GenerationalAnalytics:
        """Complete analytics dashboard for generational intelligence."""
        distribution = self._compute_distribution()
        total_members = sum(self._member_counts.values())
        total_families = sum(self._family_counts.values())

        max_dev = (
            max(abs(d.deviation) for d in distribution)
            if distribution
            else 0
        )
        balance_score = round(max(0, 100 - max_dev * 2), 1)

        total_activities = len(self._activities)
        active_activities = sum(
            1
            for a in self._activities.values()
            if a["status"] == AgeGroupActivityStatus.ACTIVE.value
        )
        groups_adequate = sum(
            1 for d in distribution if d.coverage_adequate
        )
        coverage_score = (
            round(groups_adequate / 6 * 100, 1)
            if distribution
            else 0
        )

        all_enr = [
            e
            for enrollments in self._enrollment.values()
            for e in enrollments
            if e["status"] == "active"
        ]
        total_enrolled = len(all_enr)
        avg_satisfaction = (
            round(
                sum(e["satisfaction"] for e in all_enr) / len(all_enr), 1
            )
            if all_enr
            else 0.0
        )
        avg_retention = round(
            min(95.0, 70 + total_enrolled * 0.3), 1
        )

        trends = await self.get_participation_trends()
        signals = self._generate_cross_domain_signals()

        return GenerationalAnalytics(
            distribution=distribution,
            total_members=total_members,
            total_families=total_families,
            balance_score=balance_score,
            total_activities=total_activities,
            active_activities=active_activities,
            groups_with_adequate_coverage=groups_adequate,
            coverage_score=coverage_score,
            total_enrolled=total_enrolled,
            avg_satisfaction=avg_satisfaction,
            avg_retention=avg_retention,
            participation_trends=trends,
            cross_domain_signals=signals,
        )

    async def get_participation_trends(
        self, months: int = 6
    ) -> list[ParticipationTrendPoint]:
        """Time series of participation metrics by group and month."""
        sorted_m = sorted(self._monthly_snapshots.keys())[-months:]
        points: list[ParticipationTrendPoint] = []
        for month in sorted_m:
            snap = self._monthly_snapshots.get(month, {})
            for ag_name, data in snap.items():
                enrolled = int(data.get("enrolled", 0))
                points.append(
                    ParticipationTrendPoint(
                        period=month,
                        age_group=ag_name,
                        total_enrolled=enrolled,
                        unique_participants=int(enrolled * 0.85),
                        avg_satisfaction=data.get("satisfaction", 0.0),
                        retention_rate=data.get("retention_rate", 0.0),
                        new_enrollments=int(
                            data.get("new_enrollments", 0)
                        ),
                    )
                )
        return points

    async def get_age_group_forecast(self) -> AgeGroupForecast:
        """Generate demand forecast with seasonal patterns."""
        forecasts: list[ForecastItem] = []
        demand_projections: list[DemandProjection] = []
        sorted_m = sorted(self._monthly_snapshots.keys())

        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]
            for ag in AgeGroupCategory:
                gv = ag.value
                values = [
                    self._monthly_snapshots[m]
                    .get(gv, {})
                    .get("enrolled", 0)
                    for m in last_3
                ]
                sat_values = [
                    self._monthly_snapshots[m]
                    .get(gv, {})
                    .get("satisfaction", 0)
                    for m in last_3
                ]
                current = values[-1]
                trend_delta = (values[-1] - values[0]) / max(
                    len(values) - 1, 1
                )
                predicted = max(0, round(current + trend_delta * 3))
                change_pct = round(
                    (predicted - current) / max(current, 1) * 100, 1
                )

                trend = "stable"
                if change_pct > 5:
                    trend = "improving"
                elif change_pct < -5:
                    trend = "declining"

                variance = max(values) - min(values) if values else 0
                confidence = round(
                    max(
                        0.3,
                        min(0.9, 1.0 - variance / max(current, 1)),
                    ),
                    2,
                )

                sat_current = sat_values[-1]
                sat_delta = (sat_values[-1] - sat_values[0]) / max(
                    len(sat_values) - 1, 1
                )
                sat_predicted = round(
                    max(1, min(5, sat_current + sat_delta * 3)), 1
                )

                forecasts.extend(
                    [
                        ForecastItem(
                            age_group=gv,
                            metric="participation",
                            current_value=current,
                            predicted_value=predicted,
                            change_pct=change_pct,
                            confidence=confidence,
                            trend=trend,
                            period="Q3 2026",
                            factors=[
                                "tendencia 6 meses",
                                "estacionalidad CR",
                            ],
                        ),
                        ForecastItem(
                            age_group=gv,
                            metric="satisfaction",
                            current_value=sat_current,
                            predicted_value=sat_predicted,
                            change_pct=round(
                                (sat_predicted - sat_current)
                                / max(sat_current, 0.1)
                                * 100,
                                1,
                            ),
                            confidence=round(confidence * 0.8, 2),
                            trend="stable",
                            period="Q3 2026",
                            factors=[
                                "tendencia satisfacción",
                                "calidad actividades",
                            ],
                        ),
                    ]
                )

                activities = await self.list_activities(
                    age_group=gv, status="active"
                )
                total_cap = sum(a.max_participants for a in activities)
                current_util = (
                    round(current / total_cap * 100, 1)
                    if total_cap > 0
                    else 0
                )
                projected = round(
                    predicted * _SEASONAL_MULTIPLIER.get(7, 1.0)
                )
                gap = projected - total_cap

                demand_projections.append(
                    DemandProjection(
                        age_group=gv,
                        current_capacity=total_cap,
                        current_utilization=current_util,
                        projected_demand=projected,
                        gap=gap,
                        gap_pct=round(
                            gap / max(total_cap, 1) * 100, 1
                        ),
                        recommendation=(
                            f"Expandir actividades para {gv}"
                            if gap > 0
                            else f"Capacidad adecuada para {gv}"
                        ),
                        urgency=(
                            "high"
                            if gap > total_cap * 0.2
                            else "medium" if gap > 0 else "low"
                        ),
                    )
                )

        seasonal: list[SeasonalPattern] = []
        for month_num in range(7, 13):
            multiplier = _SEASONAL_MULTIPLIER.get(month_num, 1.0)
            for ag in AgeGroupCategory:
                gv = ag.value
                activities = await self.list_activities(
                    age_group=gv, status="active"
                )
                peak = activities[0].name if activities else "N/A"
                seasonal.append(
                    SeasonalPattern(
                        age_group=gv,
                        month=month_num,
                        month_name=MONTH_NAMES_ES.get(month_num, ""),
                        relative_demand=multiplier,
                        peak_activity=peak,
                    )
                )

        return AgeGroupForecast(
            forecasts=forecasts,
            demand_projections=demand_projections,
            seasonal_patterns=seasonal,
            forecast_horizon_months=3,
            data_quality_note=(
                "Basado en 6 meses de datos demo. "
                "Reentrenar con data real."
            ),
        )

    async def generate_engagement_proposals(
        self,
    ) -> EngagementProposalList:
        """Generate proactive cross-domain engagement proposals."""
        proposals: list[EngagementProposal] = []
        sorted_m = sorted(self._monthly_snapshots.keys())

        for ag in AgeGroupCategory:
            gv = ag.value
            group_trend = "stable"
            avg_sat = 4.0

            if len(sorted_m) >= 3:
                last_3 = sorted_m[-3:]
                values = [
                    self._monthly_snapshots[m]
                    .get(gv, {})
                    .get("enrolled", 0)
                    for m in last_3
                ]
                sat_values = [
                    self._monthly_snapshots[m]
                    .get(gv, {})
                    .get("satisfaction", 0)
                    for m in last_3
                ]
                if values[-1] > values[0] * 1.05:
                    group_trend = "improving"
                elif values[-1] < values[0] * 0.95:
                    group_trend = "declining"
                avg_sat = (
                    sum(sat_values) / len(sat_values)
                    if sat_values
                    else 4.0
                )

            activities = await self.list_activities(
                age_group=gv, status="active"
            )
            active_count = len(activities)

            # R1: Declining → retention campaign
            if group_trend == "declining":
                proposals.append(
                    EngagementProposal(
                        proposal_type=(
                            GenerationalProposalType.RETENTION_CAMPAIGN
                        ),
                        title=f"Retener participación en {gv}",
                        description=(
                            f"El grupo {gv} muestra declive en "
                            f"participación últimos 3 meses. "
                            f"Proponer actividades renovadas o "
                            f"nuevas experiencias para revertir "
                            f"la tendencia."
                        ),
                        target_age_group=gv,
                        priority="high",
                        impact="high",
                        confidence=0.85,
                        cross_domain_signals=[
                            f"Participación {gv} en declive → "
                            f"riesgo engagement",
                            f"Posible correlación con satisfaction "
                            f"({avg_sat:.1f}/5)",
                        ],
                        suggested_action={
                            "action": "create_new_activities",
                            "domain": "age_group",
                            "params": {
                                "age_group": gv,
                                "suggestion": (
                                    "evaluar nuevas actividades"
                                ),
                            },
                        },
                    )
                )

            # R2: Low coverage → expansion
            if active_count < 2:
                proposals.append(
                    EngagementProposal(
                        proposal_type=(
                            GenerationalProposalType.COVERAGE_EXPANSION
                        ),
                        title=f"Expandir cobertura para {gv}",
                        description=(
                            f"El grupo {gv} tiene solo "
                            f"{active_count} actividad(es) "
                            f"activa(s). Mínimo recomendado: 2. "
                            f"Agregar programas aumenta engagement "
                            f"y retención de familias."
                        ),
                        target_age_group=gv,
                        priority="high",
                        impact="medium",
                        confidence=0.90,
                        cross_domain_signals=[
                            f"Cobertura insuficiente para {gv}",
                            "Impacto en retención de familias",
                        ],
                        suggested_action={
                            "action": "create_activity",
                            "domain": "age_group",
                            "params": {
                                "age_group": gv,
                                "min_activities": 2,
                            },
                        },
                    )
                )

            # R3: High sat + low enrollment → cross-sell
            if avg_sat >= 4.0 and group_trend == "stable":
                member_count = self._member_counts.get(gv, 0)
                enrolled = sum(
                    len(
                        [
                            e
                            for e in self._enrollment.get(a.id, [])
                            if e["status"] == "active"
                        ]
                    )
                    for a in activities
                )
                if (
                    member_count > 0
                    and enrolled / member_count < 0.5
                ):
                    proposals.append(
                        EngagementProposal(
                            proposal_type=(
                                GenerationalProposalType.CROSS_SELL
                            ),
                            title=(
                                f"Aumentar inscripciones en {gv}"
                            ),
                            description=(
                                f"Grupo {gv}: alta satisfacción "
                                f"({avg_sat:.1f}/5) pero solo "
                                f"{enrolled} de {member_count} "
                                f"miembros inscritos. Oportunidad "
                                f"de cross-sell mediante "
                                f"comunicaciones dirigidas."
                            ),
                            target_age_group=gv,
                            priority="medium",
                            impact="medium",
                            confidence=0.75,
                            cross_domain_signals=[
                                f"Gap satisfacción vs inscripción "
                                f"en {gv}",
                                "Oportunidad para communications "
                                "targeting",
                            ],
                            suggested_action={
                                "action": (
                                    "send_targeted_communication"
                                ),
                                "domain": "communication",
                                "params": {
                                    "target_group": gv,
                                    "message_type": (
                                        "activity_promotion"
                                    ),
                                },
                            },
                        )
                    )

            # R4: Teens declining → specific intervention
            if gv == "teens" and group_trend == "declining":
                proposals.append(
                    EngagementProposal(
                        proposal_type=(
                            GenerationalProposalType.ACTIVITY_RECOMMENDATION
                        ),
                        title=(
                            "Programa Gaming + Deportes para Teens"
                        ),
                        description=(
                            "Adolescentes en fuerte declive. "
                            "Los teens de Costa Rica responden "
                            "a programas que combinan tecnología "
                            "(gaming) con actividad física. "
                            "Proponer torneo gaming + sports "
                            "combo para re-engagement."
                        ),
                        target_age_group="teens",
                        priority="high",
                        impact="high",
                        confidence=0.80,
                        cross_domain_signals=[
                            "Teens en declive sostenido "
                            "(18→8 en 6 meses)",
                            "Gaming Lounge subutilizado → "
                            "oportunidad",
                            "Cross-domain: sports + gaming "
                            "como combo",
                        ],
                        suggested_action={
                            "action": "create_event",
                            "domain": "events",
                            "params": {
                                "event_type": "tournament",
                                "target": "teens",
                            },
                        },
                    )
                )

        # R5: Seasonal — high season preparation
        proposals.append(
            EngagementProposal(
                proposal_type=(
                    GenerationalProposalType.SEASONAL_PROGRAM
                ),
                title=(
                    "Preparar programas de alta temporada "
                    "(Dic-Feb)"
                ),
                description=(
                    "Diciembre-Febrero es alta temporada en "
                    "Costa Rica (verano, vacaciones escolares). "
                    "Demanda estimada +20-25%. Preparar "
                    "campamentos, actividades al aire libre, "
                    "y programas intensivos para kids/teens."
                ),
                target_age_group="kids",
                related_age_groups=["teens", "toddler"],
                priority="medium",
                impact="high",
                confidence=0.90,
                cross_domain_signals=[
                    "Estacionalidad CR: Dic-Feb peak demand",
                    "Kids y Teens necesitan programas de "
                    "vacaciones",
                    "Oportunidad revenue: programas premium "
                    "para temporada alta",
                ],
                suggested_action={
                    "action": "plan_seasonal_activities",
                    "domain": "age_group",
                    "params": {
                        "season": "summer",
                        "groups": [
                            "kids",
                            "teens",
                            "toddler",
                        ],
                    },
                },
            )
        )

        high_count = sum(
            1 for p in proposals if p.priority == "high"
        )
        cross_count = sum(
            1 for p in proposals if len(p.cross_domain_signals) > 1
        )

        return EngagementProposalList(
            proposals=proposals,
            total=len(proposals),
            high_priority_count=high_count,
            cross_domain_count=cross_count,
        )

    # ── Internal Helpers ───────────────────────────────────

    def _to_activity(self, aid: str) -> AgeGroupActivity:
        rec = self._activities[aid]
        return AgeGroupActivity(**rec)

    def _compute_health_factors(
        self,
    ) -> list[AgeGroupHealthFactor]:
        """Compute 5 weighted health factors."""
        factors: list[AgeGroupHealthFactor] = []

        # Factor 1: Participation Rate (weight 0.25)
        rates: list[float] = []
        for aid, act in self._activities.items():
            if act["status"] != AgeGroupActivityStatus.ACTIVE.value:
                continue
            max_pax = act["max_participants"]
            if max_pax == 0:
                continue
            active = len(
                [
                    e
                    for e in self._enrollment.get(aid, [])
                    if e["status"] == "active"
                ]
            )
            rates.append(min(1.0, active / max_pax))
        avg_rate = (
            (sum(rates) / len(rates) * 100) if rates else 0
        )
        factors.append(
            AgeGroupHealthFactor(
                name="Participation Rate",
                score=round(min(100, avg_rate), 1),
                weight=0.25,
                weighted_score=round(
                    min(100, avg_rate) * 0.25, 1
                ),
                impact=(
                    "high"
                    if avg_rate < 50
                    else "medium" if avg_rate < 70 else "low"
                ),
                detail=(
                    f"Enrollment promedio a {avg_rate:.0f}% "
                    f"de capacidad"
                ),
            )
        )

        # Factor 2: Activity Coverage (weight 0.20)
        group_counts: dict[str, int] = {}
        for act in self._activities.values():
            if (
                act["status"]
                == AgeGroupActivityStatus.ACTIVE.value
            ):
                ag = act["age_group"]
                group_counts[ag] = group_counts.get(ag, 0) + 1
        adequate = sum(
            1
            for ag in AgeGroupCategory
            if group_counts.get(ag.value, 0) >= 2
        )
        coverage = round(adequate / 6 * 100, 1)
        factors.append(
            AgeGroupHealthFactor(
                name="Activity Coverage",
                score=coverage,
                weight=0.20,
                weighted_score=round(coverage * 0.20, 1),
                impact=(
                    "high"
                    if coverage < 50
                    else "medium" if coverage < 80 else "low"
                ),
                detail=(
                    f"{adequate}/6 grupos con ≥2 actividades "
                    f"activas"
                ),
            )
        )

        # Factor 3: Demographic Balance (weight 0.20)
        total = max(sum(self._member_counts.values()), 1)
        max_dev = 0.0
        for ag in AgeGroupCategory:
            pct = self._member_counts.get(ag.value, 0) / total * 100
            dev = abs(pct - IDEAL_PCT)
            max_dev = max(max_dev, dev)
        balance = round(max(0, 100 - max_dev * 2), 1)
        factors.append(
            AgeGroupHealthFactor(
                name="Demographic Balance",
                score=balance,
                weight=0.20,
                weighted_score=round(balance * 0.20, 1),
                impact=(
                    "high"
                    if balance < 50
                    else "medium" if balance < 70 else "low"
                ),
                detail=(
                    f"Desviación máxima: {max_dev:.1f}% "
                    f"del ideal ({IDEAL_PCT}%)"
                ),
            )
        )

        # Factor 4: Satisfaction Average (weight 0.20)
        all_sats = [
            e["satisfaction"]
            for enrollments in self._enrollment.values()
            for e in enrollments
            if e["status"] == "active"
        ]
        avg_sat = (
            (sum(all_sats) / len(all_sats)) if all_sats else 4.0
        )
        sat_score = round(avg_sat / 5.0 * 100, 1)
        factors.append(
            AgeGroupHealthFactor(
                name="Satisfaction Average",
                score=sat_score,
                weight=0.20,
                weighted_score=round(sat_score * 0.20, 1),
                impact=(
                    "high"
                    if sat_score < 60
                    else "medium" if sat_score < 75 else "low"
                ),
                detail=f"Satisfacción promedio: {avg_sat:.1f}/5.0",
            )
        )

        # Factor 5: Family Engagement (weight 0.15)
        family_groups: dict[str, set[str]] = {}
        for aid, enrollments in self._enrollment.items():
            group = self._activities.get(aid, {}).get(
                "age_group", ""
            )
            for e in enrollments:
                if e["status"] == "active":
                    family_groups.setdefault(
                        e["family_id"], set()
                    ).add(group)
        multi_group = sum(
            1
            for groups in family_groups.values()
            if len(groups) >= 2
        )
        total_fams = max(len(family_groups), 1)
        engagement = round(multi_group / total_fams * 100, 1)
        factors.append(
            AgeGroupHealthFactor(
                name="Family Engagement",
                score=engagement,
                weight=0.15,
                weighted_score=round(engagement * 0.15, 1),
                impact=(
                    "high"
                    if engagement < 30
                    else "medium" if engagement < 50 else "low"
                ),
                detail=(
                    f"{multi_group}/{total_fams} familias "
                    f"en 2+ grupos etarios"
                ),
            )
        )

        return factors

    def _compute_distribution(
        self,
    ) -> list[AgeGroupDistribution]:
        """Compute demographic distribution with balance analysis."""
        total = max(sum(self._member_counts.values()), 1)
        out: list[AgeGroupDistribution] = []
        for ag in AgeGroupCategory:
            gv = ag.value
            mc = self._member_counts.get(gv, 0)
            fc = self._family_counts.get(gv, 0)
            pct = round(mc / total * 100, 1)
            dev = round(pct - IDEAL_PCT, 1)

            if dev > 5:
                balance = AgeGroupBalanceStatus.OVERREPRESENTED
            elif dev < -5:
                balance = AgeGroupBalanceStatus.UNDERREPRESENTED
            else:
                balance = AgeGroupBalanceStatus.BALANCED

            all_acts = [
                a
                for a in self._activities.values()
                if a["age_group"] == gv
            ]
            active_acts = [
                a
                for a in all_acts
                if a["status"]
                == AgeGroupActivityStatus.ACTIVE.value
            ]

            out.append(
                AgeGroupDistribution(
                    age_group=gv,
                    description=AGE_GROUP_DESCRIPTIONS.get(
                        gv, ""
                    ),
                    member_count=mc,
                    family_count=fc,
                    percentage=pct,
                    ideal_percentage=IDEAL_PCT,
                    deviation=dev,
                    balance_status=balance,
                    activity_count=len(all_acts),
                    active_activity_count=len(active_acts),
                    coverage_adequate=len(active_acts) >= 2,
                )
            )
        return out

    def _compute_trend(self) -> str:
        """Overall trend from last 3 months of snapshots."""
        months = sorted(self._monthly_snapshots.keys())[-3:]
        if len(months) < 2:
            return "stable"
        totals = []
        for month in months:
            t = sum(
                snap.get("enrolled", 0)
                for snap in self._monthly_snapshots[month].values()
            )
            totals.append(t)
        if totals[-1] > totals[0] * 1.05:
            return "improving"
        elif totals[-1] < totals[0] * 0.95:
            return "declining"
        return "stable"

    def _generate_cross_domain_signals(
        self,
    ) -> list[CrossDomainSignal]:
        """Generate signals for cross-domain consumption."""
        signals: list[CrossDomainSignal] = []
        months = sorted(self._monthly_snapshots.keys())

        if len(months) >= 3:
            last_3 = months[-3:]
            for ag in AgeGroupCategory:
                gv = ag.value
                values = [
                    self._monthly_snapshots[m]
                    .get(gv, {})
                    .get("enrolled", 0)
                    for m in last_3
                ]

                if values[-1] < values[0] * 0.9:
                    drop = values[0] - values[-1]
                    signals.append(
                        CrossDomainSignal(
                            source_domain="age_group",
                            target_domain="communication",
                            signal_type="warning",
                            message=(
                                f"Participación de {gv} en "
                                f"declive ({values[0]}→"
                                f"{values[-1]}). Considerar "
                                f"campaña de comunicación "
                                f"dirigida."
                            ),
                            data={
                                "age_group": gv,
                                "enrollment_drop": drop,
                            },
                            severity=(
                                "high"
                                if values[-1] < values[0] * 0.7
                                else "medium"
                            ),
                        )
                    )
                    signals.append(
                        CrossDomainSignal(
                            source_domain="age_group",
                            target_domain="member_360",
                            signal_type="warning",
                            message=(
                                f"Declive en {gv} puede afectar "
                                f"engagement de familias con "
                                f"miembros en este grupo etario."
                            ),
                            data={"age_group": gv},
                            severity="medium",
                        )
                    )

                if values[-1] > values[0] * 1.15:
                    growth = round(
                        (values[-1] / values[0] - 1) * 100
                    )
                    signals.append(
                        CrossDomainSignal(
                            source_domain="age_group",
                            target_domain="events",
                            signal_type="opportunity",
                            message=(
                                f"Demanda creciente en {gv} "
                                f"({values[0]}→{values[-1]}). "
                                f"Oportunidad de eventos "
                                f"dirigidos."
                            ),
                            data={
                                "age_group": gv,
                                "growth_pct": growth,
                            },
                            severity="low",
                        )
                    )

        for aid, enrollments in self._enrollment.items():
            active_enr = [
                e for e in enrollments if e["status"] == "active"
            ]
            if len(active_enr) >= 3:
                avg = sum(
                    e["satisfaction"] for e in active_enr
                ) / len(active_enr)
                if avg < 3.0:
                    act = self._activities.get(aid, {})
                    signals.append(
                        CrossDomainSignal(
                            source_domain="age_group",
                            target_domain="satisfaction",
                            signal_type="warning",
                            message=(
                                f"Actividad "
                                f"'{act.get('name', aid)}' "
                                f"({act.get('age_group', '?')}) "
                                f"con satisfacción baja: "
                                f"{avg:.1f}/5.0."
                            ),
                            data={
                                "activity_id": aid,
                                "satisfaction": round(avg, 1),
                            },
                            severity="medium",
                        )
                    )

        return signals
