"""AgeGroupRepository async — los 4 dicts se vuelven 4 tablas.

Ola 2.1-decimotercima (vertical age_group). Contrato EXACTO del
módulo in-memory que reemplaza (club_mcp.db.repositories.
age_group_repo) — mismos 18 métodos, mismas firmas, mismos Pydantic
de salida, mismo comportamiento de error (None / lista vacía / dict
vacío — el in-memory no define excepciones custom y el ORM tampoco
las inventa).

La decimotercima es drop-in tras el refactor 0039 (contrato
observable): el agente YA consume solo los públicos (0 privados
tocados — desacoplados en d84cecd), así que este repo implementa el
contrato completo y el agente no cambia UN BYTE.

Mismas decisiones que las 12 verticales (§3.8..§3.8-DUODECIMA):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (_gen_id("act") = act_{uuid4().hex[:8]}).

Semántica literal del in-memory que se preserva:
  * create_activity: status ACTIVE LITERAL (no el default del
    modelo — el Create schema NO trae status; el in-memory lo fija
    en el create) · created_at=updated_at=now ISO en el create.
  * update_activity: recorre updates.items() y SOLO asigna si
    val is not None (clave None ignora — SEMÁNTICA DISTINTA a
    facility: aquí None significa "no tocar", no borrar) · enum →
    .value · updated_at SIEMPRE se refresca (aunque no haya claves
    válidas) · actividad inexistente → None SIN excepción.
  * delete_activity: borra la actividad Y sus enrollments (el
    in-memory hace _enrollment.pop(activity_id, None)) → True/False.
  * list_activities: filtros por igualdad en Python sobre la tabla
    completa (chica) — MISMO orden de inserción que iterar
    .items()/.values() del in-memory.
  * get_activity_enrollment: lista de dicts planos (family_id ·
    enrolled_at · status · satisfaction) en orden de inserción ·
    [] si la actividad no existe o no tiene inscripciones.
  * get_monthly_snapshots: dict month → {age_group: metrics} ·
    MISMA forma que el in-memory (shallow copy).
  * get_age_group_summary: description de AGE_GROUP_DESCRIPTIONS ·
    None si el age_group no es categoría.
  * get_demographics: percentage_of_club sobre total_club =
    max(sum(member_counts), 1) — con counts vacíos el total es 1 y
    los pct son 0.0, IGUAL que el in-memory vacío.
  * get_recommendations: por actividad activa del grupo ·
    capacity = max_participants or 1 · avg_sat default 4.0 ·
    confidence = min(0.99, sat/5*0.6 + availability*0.4) ·
    sort por confidence DESC · top 10.
  * get_health_score: 5 factores ponderados reproducidos byte a
    byte (0.25/0.20/0.20/0.20/0.15) · trend de últimos 3 meses ·
    summary literal.
  * get_generational_analytics: distribution + balance_score +
    coverage_score + enrolled + avg_sat + avg_retention + trends +
    cross_domain_signals — mismo orden de campos.
  * get_participation_trends: sorted(months)[-months:] ·
    unique_participants = int(enrolled*0.85) · retention del
    snapshot.
  * get_age_group_forecast: ≥3 meses → 2 ForecastItem por grupo ·
    DemandProjection con _SEASONAL_MULTIPLIER[7] · seasonal
    Jul-Dic (6 meses x 6 grupos) · period "Q3 2026" LITERAL.
  * generate_engagement_proposals: R1 (declining) · R2 (coverage
    <2) · R3 (sat ≥4 + stable + enrolled/members <0.5) · R4 (teens
    declining) · R5 (seasonal SIEMPRE) — reproducidos byte a byte
    + contadores.
  * _seed_data: NO se reproduce — las tablas nacen vacías (el seed
    DEMO del in-memory es solo del demo; criterio communication
    §3.8-OCTAVA). Las snapshots y counts nacen de las TABLAS.

Los 5 helpers compute del in-memory (_compute_distribution ·
_compute_health_factors · _compute_trend ·
_generate_cross_domain_signals + las constantes IDEAL_PCT ·
_BASE_SATISFACTION · _ENROLLMENT_RATE · _SEASONAL_MULTIPLIER ·
MONTH_NAMES_ES · AGE_GROUP_DESCRIPTIONS) se reproducen en este
módulo: MISMA fuente de verdad sobre tablas.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.age_group_orm import (
    AgeGroupActivityORM,
    AgeGroupEnrollmentORM,
    AgeGroupMemberCountORM,
    AgeGroupMonthlySnapshotORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.age_group_activity import (
    ActivityDifficulty,
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


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

logger = logging.getLogger(__name__)

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


def _gen_id(prefix: str) -> str:
    """MISMA generación que el in-memory (act_{uuid4().hex[:8]})."""
    return f"{prefix}_{uuid4().hex[:8]}"


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create/update)."""
    return datetime.now(tz=UTC).isoformat()


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _activity_from_orm(r: AgeGroupActivityORM) -> AgeGroupActivity:
    return AgeGroupActivity(
        id=r.id,
        name=r.name,
        description=r.description,
        age_group=AgeGroupCategory(r.age_group),
        difficulty=ActivityDifficulty(r.difficulty),
        location=r.location,
        max_participants=r.max_participants,
        duration_minutes=r.duration_minutes,
        requires_instructor=bool(r.requires_instructor),
        instructor_name=r.instructor_name,
        equipment_needed=list(r.equipment_needed or []),
        tags=list(r.tags or []),
        status=AgeGroupActivityStatus(r.status),
        schedule_days=list(r.schedule_days or []),
        schedule_time=r.schedule_time,
        created_at=_parse_iso(r.created_at),
        updated_at=_parse_iso(r.updated_at),
    )


def _parse_iso(v: str | None) -> datetime:
    """ISO string → datetime (el modelo Pydantic espera datetime)."""
    if not v:
        return datetime.now(tz=UTC)
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return datetime.now(tz=UTC)


def _enrollment_row_to_dict(
    r: AgeGroupEnrollmentORM,
) -> dict[str, Any]:
    return {
        "family_id": r.family_id,
        "enrolled_at": r.enrolled_at,
        "status": r.status,
        "satisfaction": r.satisfaction,
    }


def _snapshot_metrics(r: AgeGroupMonthlySnapshotORM) -> dict[str, Any]:
    return {
        "enrolled": r.enrolled,
        "satisfaction": r.satisfaction,
        "new_enrollments": r.new_enrollments,
        "retention_rate": r.retention_rate,
    }


class AgeGroupRepository:
    """Repo ORM async — contrato EXACTO del in-memory (18 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── siembra de counts (dato de primera clase — H-3) ──────────

    async def set_member_count(
        self, age_group: str, member_count: int
    ) -> None:
        """Escribe el member_count de un grupo (deploy/suite seed).

        El in-memory nace con 0 en las 6 categorías y solo el seed
        demo lo llenaba; el ORM hace el count dato de primera clase
        (criterio H-3) — el deploy carga el censo UNA vez.
        """
        async with session_scope(self._engine) as s:
            r = await s.get(AgeGroupMemberCountORM, age_group)
            if r is None:
                s.add(
                    AgeGroupMemberCountORM(
                        age_group=age_group,
                        member_count=member_count,
                        family_count=0,
                    )
                )
            else:
                r.member_count = member_count

    async def set_family_count(
        self, age_group: str, family_count: int
    ) -> None:
        """Escribe el family_count de un grupo (deploy/suite seed)."""
        async with session_scope(self._engine) as s:
            r = await s.get(AgeGroupMemberCountORM, age_group)
            if r is None:
                s.add(
                    AgeGroupMemberCountORM(
                        age_group=age_group,
                        member_count=0,
                        family_count=family_count,
                    )
                )
            else:
                r.family_count = family_count

    async def upsert_monthly_snapshot(
        self,
        month: str,
        age_group: str,
        enrolled: int,
        satisfaction: float,
        new_enrollments: int,
        retention_rate: float,
    ) -> None:
        """Escribe una celda del snapshot (deploy/suite seed — H-3).

        El in-memory solo tenía snapshots del seed demo; la tabla
        las hace dato de primera clase.
        """
        async with session_scope(self._engine) as s:
            r = await s.get(
                AgeGroupMonthlySnapshotORM,
                (month, age_group),
            )
            if r is None:
                s.add(
                    AgeGroupMonthlySnapshotORM(
                        month=month,
                        age_group=age_group,
                        enrolled=enrolled,
                        satisfaction=satisfaction,
                        new_enrollments=new_enrollments,
                        retention_rate=retention_rate,
                    )
                )
            else:
                r.enrolled = enrolled
                r.satisfaction = satisfaction
                r.new_enrollments = new_enrollments
                r.retention_rate = retention_rate

    # ── estado interno como lecturas (privado del módulo) ────────

    async def _load_activities(
        self, s: AsyncSession
    ) -> list[AgeGroupActivityORM]:
        """Las actividades en orden de inserción (= .items() del dict)."""
        rows = await s.execute(
            select(AgeGroupActivityORM).order_by(
                AgeGroupActivityORM.id
            )
        )
        return list(rows.scalars().all())

    async def _member_counts(self, s: AsyncSession) -> dict[str, int]:
        rows = await s.execute(select(AgeGroupMemberCountORM))
        return {r.age_group: r.member_count for r in rows.scalars().all()}

    async def _family_counts(self, s: AsyncSession) -> dict[str, int]:
        rows = await s.execute(select(AgeGroupMemberCountORM))
        return {r.age_group: r.family_count for r in rows.scalars().all()}

    async def _snapshots(
        self, s: AsyncSession
    ) -> dict[str, dict[str, dict[str, float]]]:
        rows = await s.execute(
            select(AgeGroupMonthlySnapshotORM).order_by(
                AgeGroupMonthlySnapshotORM.month,
                AgeGroupMonthlySnapshotORM.age_group,
            )
        )
        out: dict[str, dict[str, dict[str, float]]] = {}
        for r in rows.scalars().all():
            out.setdefault(r.month, {})[r.age_group] = _snapshot_metrics(r)
        return out

    async def _enrollment_map(
        self, s: AsyncSession
    ) -> dict[str, list[dict[str, Any]]]:
        rows = await s.execute(
            select(AgeGroupEnrollmentORM).order_by(
                AgeGroupEnrollmentORM.id
            )
        )
        out: dict[str, list[dict[str, Any]]] = {}
        for r in rows.scalars().all():
            out.setdefault(r.activity_id, []).append(
                _enrollment_row_to_dict(r)
            )
        return out

    # ── Activity CRUD ─────────────────────────────────────────────

    async def create_activity(
        self, data: AgeGroupActivityCreate
    ) -> AgeGroupActivity:
        aid = _gen_id("act")
        now = _utcnow_iso()
        async with session_scope(self._engine) as s:
            s.add(
                AgeGroupActivityORM(
                    id=aid,
                    name=data.name,
                    description=data.description,
                    age_group=_enum_val(data.age_group),
                    difficulty=_enum_val(data.difficulty),
                    location=data.location,
                    max_participants=data.max_participants,
                    duration_minutes=data.duration_minutes,
                    requires_instructor=data.requires_instructor,
                    instructor_name=data.instructor_name,
                    equipment_needed=list(data.equipment_needed),
                    tags=list(data.tags),
                    status=AgeGroupActivityStatus.ACTIVE.value,
                    schedule_days=list(data.schedule_days),
                    schedule_time=data.schedule_time,
                    created_at=now,
                    updated_at=now,
                )
            )
        return await self.get_activity(aid) or AgeGroupActivity(
            name=data.name,
            age_group=data.age_group,
            difficulty=data.difficulty,
        )

    async def get_activity(
        self, activity_id: str
    ) -> AgeGroupActivity | None:
        async with session_scope(self._engine) as s:
            r = await s.get(AgeGroupActivityORM, activity_id)
            if r is None:
                return None
            return _activity_from_orm(r)

    async def update_activity(
        self, activity_id: str, updates: dict[str, Any]
    ) -> AgeGroupActivity | None:
        async with session_scope(self._engine) as s:
            r = await s.get(AgeGroupActivityORM, activity_id)
            if r is None:
                return None
            # semántica literal del in-memory: None ignora · enum →
            # .value · updated_at SIEMPRE (aunque no haya claves)
            for key, val in updates.items():
                if val is not None:
                    v = val.value if hasattr(val, "value") else val
                    if key == "requires_instructor":
                        v = 1 if v else 0
                    if key == "equipment_needed" or key == "tags" or key == "schedule_days":
                        v = list(v)
                    if hasattr(r, key) and key not in ("id", "created_at"):
                        setattr(r, key, v)
            r.updated_at = _utcnow_iso()
            record = _activity_from_orm(r)
        return record

    async def delete_activity(self, activity_id: str) -> bool:
        async with session_scope(self._engine) as s:
            r = await s.get(AgeGroupActivityORM, activity_id)
            if r is None:
                return False
            await s.delete(r)
            enrollments = await s.execute(
                select(AgeGroupEnrollmentORM).where(
                    AgeGroupEnrollmentORM.activity_id == activity_id
                )
            )
            for e in enrollments.scalars().all():
                await s.delete(e)
        return True

    async def list_activities(
        self,
        age_group: str | None = None,
        status: str | None = None,
    ) -> list[AgeGroupActivity]:
        async with session_scope(self._engine) as s:
            rows = await self._load_activities(s)
        out: list[AgeGroupActivity] = []
        for r in rows:
            if age_group and r.age_group != age_group:
                continue
            if status and r.status != status:
                continue
            out.append(_activity_from_orm(r))
        return out

    # ── Contract surface (refactor 0039) ──────────────────────

    async def get_distribution(
        self,
    ) -> list[AgeGroupDistribution]:
        """Public demographic distribution with balance analysis."""
        async with session_scope(self._engine) as s:
            distribution = await self._compute_distribution(s)
        return distribution

    async def get_activity_enrollment(
        self, activity_id: str
    ) -> list[dict[str, Any]]:
        """Enrollment records for one activity (observable read)."""
        async with session_scope(self._engine) as s:
            rows = await s.execute(
                select(AgeGroupEnrollmentORM)
                .where(
                    AgeGroupEnrollmentORM.activity_id == activity_id
                )
                .order_by(AgeGroupEnrollmentORM.id)
            )
            return [
                _enrollment_row_to_dict(r)
                for r in rows.scalars().all()
            ]

    async def get_monthly_snapshots(
        self,
    ) -> dict[str, dict[str, Any]]:
        """Monthly snapshots by group (observable read)."""
        async with session_scope(self._engine) as s:
            snaps = await self._snapshots(s)
        return {month: dict(snap) for month, snap in snaps.items()}

    # ── Age Group Summaries ─────────────────────────────────────

    async def get_age_group_summary(
        self, age_group: str
    ) -> AgeGroupSummary | None:
        if age_group not in AGE_GROUP_DESCRIPTIONS:
            return None
        activities = await self.list_activities(age_group=age_group)
        async with session_scope(self._engine) as s:
            mc = (await self._member_counts(s)).get(age_group, 0)
            fc = (await self._family_counts(s)).get(age_group, 0)
        return AgeGroupSummary(
            age_group=age_group,
            description=AGE_GROUP_DESCRIPTIONS.get(age_group, ""),
            member_count=mc,
            family_count=fc,
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

    # ── Demographics ─────────────────────────────────────────────

    async def get_demographics(
        self, age_group: str | None = None
    ) -> list[AgeGroupDemographics]:
        async with session_scope(self._engine) as s:
            member_counts = await self._member_counts(s)
            family_counts = await self._family_counts(s)
            rows = await self._load_activities(s)
        total_club = max(sum(member_counts.values()), 1)
        groups = (
            [age_group]
            if age_group
            else [ag.value for ag in AgeGroupCategory]
        )
        out: list[AgeGroupDemographics] = []
        for ag in groups:
            mc = member_counts.get(ag, 0)
            fc = family_counts.get(ag, 0)
            ag_acts = [
                _activity_from_orm(r)
                for r in rows
                if r.age_group == ag
            ]
            active_count = sum(
                1
                for a in ag_acts
                if a.status == AgeGroupActivityStatus.ACTIVE
            )
            out.append(
                AgeGroupDemographics(
                    age_group=ag,
                    total_members=mc,
                    total_families=fc,
                    percentage_of_club=round(mc / total_club * 100, 1),
                    active_participants=active_count,
                    activity_count=len(ag_acts),
                )
            )
        return out

    # ── Participation ────────────────────────────────────────────

    async def get_participation(
        self, age_group: str | None = None
    ) -> list[ParticipationRecord]:
        activities = await self.list_activities(age_group=age_group)
        enrollment_map: dict[str, list[dict[str, Any]]] = {}
        async with session_scope(self._engine) as s:
            enrollment_map = await self._enrollment_map(s)
        out: list[ParticipationRecord] = []
        for act in activities:
            enrollments = enrollment_map.get(act.id, [])
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

    # ── Recommendations ───────────────────────────────────────────

    async def get_recommendations(
        self, age_groups: list[str]
    ) -> list[ActivityRecommendation]:
        enrollment_map: dict[str, list[dict[str, Any]]] = {}
        async with session_scope(self._engine) as s:
            enrollment_map = await self._enrollment_map(s)
        recs: list[ActivityRecommendation] = []
        for ag in age_groups:
            activities = await self.list_activities(
                age_group=ag, status="active"
            )
            for act in activities:
                enrollments = enrollment_map.get(act.id, [])
                active_enr = [
                    e for e in enrollments if e["status"] == "active"
                ]
                enrolled = len(active_enr)
                capacity = act.max_participants or 1
                utilization = (
                    enrolled / capacity if capacity > 0 else 0
                )
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

    # ── INTELLIGENCE METHODS ─────────────────────────────────────

    async def get_health_score(self) -> AgeGroupHealthScore:
        """Compute composite health score with 5 weighted factors."""
        async with session_scope(self._engine) as s:
            factors = await self._compute_health_factors(s)
            trend = await self._compute_trend(s)
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
        async with session_scope(self._engine) as s:
            distribution = await self._compute_distribution(s)
            member_counts = await self._member_counts(s)
            family_counts = await self._family_counts(s)
            rows = await self._load_activities(s)
            enrollment_map = await self._enrollment_map(s)
            trends = await self.get_participation_trends()
            signals = await self._generate_cross_domain_signals(s)

        total_members = sum(member_counts.values())
        total_families = sum(family_counts.values())

        max_dev = (
            max(abs(d.deviation) for d in distribution)
            if distribution
            else 0
        )
        balance_score = round(max(0, 100 - max_dev * 2), 1)

        total_activities = len(rows)
        active_activities = sum(
            1
            for r in rows
            if r.status == AgeGroupActivityStatus.ACTIVE.value
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
            for enrollments in enrollment_map.values()
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
        async with session_scope(self._engine) as s:
            snaps = await self._snapshots(s)
        sorted_m = sorted(snaps.keys())[-months:]
        points: list[ParticipationTrendPoint] = []
        for month in sorted_m:
            snap = snaps.get(month, {})
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
        async with session_scope(self._engine) as s:
            snaps = await self._snapshots(s)
        sorted_m = sorted(snaps.keys())

        if len(sorted_m) >= 3:
            last_3 = sorted_m[-3:]
            for ag in AgeGroupCategory:
                gv = ag.value
                values = [
                    snaps[m]
                    .get(gv, {})
                    .get("enrolled", 0)
                    for m in last_3
                ]
                sat_values = [
                    snaps[m]
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
        async with session_scope(self._engine) as s:
            snaps = await self._snapshots(s)
            member_counts = await self._member_counts(s)
            enrollment_map = await self._enrollment_map(s)
        sorted_m = sorted(snaps.keys())

        for ag in AgeGroupCategory:
            gv = ag.value
            group_trend = "stable"
            avg_sat = 4.0

            if len(sorted_m) >= 3:
                last_3 = sorted_m[-3:]
                values = [
                    snaps[m]
                    .get(gv, {})
                    .get("enrolled", 0)
                    for m in last_3
                ]
                sat_values = [
                    snaps[m]
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
                member_count = member_counts.get(gv, 0)
                enrolled = sum(
                    len(
                        [
                            e
                            for e in enrollment_map.get(a.id, [])
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
                                f"({avg_sat:.1f}/5) pero baja "
                                f"participación ({enrolled}/"
                                f"{member_count}). Programas "
                                f"cross-sell pueden convertir "
                                f"satisfacción en engagement."
                            ),
                            target_age_group=gv,
                            priority="medium",
                            impact="medium",
                            confidence=0.75,
                            cross_domain_signals=[
                                f"Satisfacción {gv}: {avg_sat:.1f}/5",
                                f"Enrollment: {enrolled}/"
                                f"{member_count} miembros",
                            ],
                            suggested_action={
                                "action": "targeted_communication",
                                "domain": "communication",
                                "params": {
                                    "age_group": gv,
                                    "campaign": "cross_sell",
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

    # ── Internal Helpers (reproducidos byte a byte sobre tablas) ──

    async def _compute_health_factors(
        self, s: AsyncSession
    ) -> list[AgeGroupHealthFactor]:
        """Compute 5 weighted health factors."""
        factors: list[AgeGroupHealthFactor] = []
        rows = await self._load_activities(s)
        enrollment_map = await self._enrollment_map(s)
        member_counts = await self._member_counts(s)

        # Factor 1: Participation Rate (weight 0.25)
        rates: list[float] = []
        for r in rows:
            if r.status != AgeGroupActivityStatus.ACTIVE.value:
                continue
            max_pax = r.max_participants
            if max_pax == 0:
                continue
            active = len(
                [
                    e
                    for e in enrollment_map.get(r.id, [])
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
        for r in rows:
            if (
                r.status
                == AgeGroupActivityStatus.ACTIVE.value
            ):
                ag = r.age_group
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
                    if coverage < 40
                    else "medium" if coverage < 70 else "low"
                ),
                detail=f"{adequate}/6 grupos con 2+ actividades",
            )
        )

        # Factor 3: Demographic Balance (weight 0.20)
        total = max(sum(member_counts.values()), 1)
        max_dev = 0.0
        for ag in AgeGroupCategory:
            pct = (
                member_counts.get(ag.value, 0) / total * 100
            )
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
            for enrollments in enrollment_map.values()
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
        acts_by_id = {r.id: r for r in rows}
        for aid, enrollments in enrollment_map.items():
            group = acts_by_id.get(aid)
            gname = group.age_group if group else ""
            for e in enrollments:
                if e["status"] == "active":
                    family_groups.setdefault(
                        e["family_id"], set()
                    ).add(gname)
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

    async def _compute_distribution(
        self, s: AsyncSession
    ) -> list[AgeGroupDistribution]:
        """Compute demographic distribution with balance analysis."""
        member_counts = await self._member_counts(s)
        family_counts = await self._family_counts(s)
        rows = await self._load_activities(s)
        total = max(sum(member_counts.values()), 1)
        out: list[AgeGroupDistribution] = []
        for ag in AgeGroupCategory:
            gv = ag.value
            mc = member_counts.get(gv, 0)
            fc = family_counts.get(gv, 0)
            pct = round(mc / total * 100, 1)
            dev = round(pct - IDEAL_PCT, 1)

            if dev > 5:
                balance = AgeGroupBalanceStatus.OVERREPRESENTED
            elif dev < -5:
                balance = AgeGroupBalanceStatus.UNDERREPRESENTED
            else:
                balance = AgeGroupBalanceStatus.BALANCED

            all_acts = [r for r in rows if r.age_group == gv]
            active_acts = [
                r
                for r in all_acts
                if r.status
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

    async def _compute_trend(self, s: AsyncSession) -> str:
        """Overall trend from last 3 months of snapshots."""
        snaps = await self._snapshots(s)
        months = sorted(snaps.keys())[-3:]
        if len(months) < 2:
            return "stable"
        totals = []
        for month in months:
            t = sum(
                snap.get("enrolled", 0)
                for snap in snaps[month].values()
            )
            totals.append(t)
        if totals[-1] > totals[0] * 1.05:
            return "improving"
        elif totals[-1] < totals[0] * 0.95:
            return "declining"
        return "stable"

    async def _generate_cross_domain_signals(
        self, s: AsyncSession
    ) -> list[CrossDomainSignal]:
        """Generate signals for cross-domain consumption."""
        signals: list[CrossDomainSignal] = []
        snaps = await self._snapshots(s)
        enrollment_map = await self._enrollment_map(s)
        rows = await self._load_activities(s)
        acts_by_id = {r.id: r for r in rows}
        months = sorted(snaps.keys())

        if len(months) >= 3:
            last_3 = months[-3:]
            for ag in AgeGroupCategory:
                gv = ag.value
                values = [
                    snaps[m]
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

        for aid, enrollments in enrollment_map.items():
            active_enr = [
                e for e in enrollments if e["status"] == "active"
            ]
            if len(active_enr) >= 3:
                avg = sum(
                    e["satisfaction"] for e in active_enr
                ) / len(active_enr)
                if avg < 3.0:
                    act = acts_by_id.get(aid)
                    signals.append(
                        CrossDomainSignal(
                            source_domain="age_group",
                            target_domain="satisfaction",
                            signal_type="warning",
                            message=(
                                f"Actividad "
                                f"'{act.name if act else aid}' "
                                f"({act.age_group if act else '?'}) "
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
