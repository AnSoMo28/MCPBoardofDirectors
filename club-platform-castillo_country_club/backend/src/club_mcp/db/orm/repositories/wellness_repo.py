"""WellnessRepository async — los 5 dicts se vuelven tablas.

Ola 2.1-decimosexta (vertical wellness). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.wellness_repo) —
mismos 22 métodos públicos (misma superficie que el in-memory tras
la cirugía async del propio vertical), mismas firmas, mismos
Pydantic de salida, mismo comportamiento de error (None / lista
vacía / respuestas con defaults — el in-memory no define
excepciones custom y el ORM tampoco las inventa).

La decimosexta es vertical DIRECTO sin refactor previo (como las
14 primeras): el agente YA consume solo públicos (0 privados
tocados) y sus tools son YA async, así que este repo implementa el
contrato async completo y el agente solo gana los await (misma
mecánica de compliance §3.8-QUINQUE y finance §3.8-DECIMOQUINTA).

Mismas decisiones que las 15 verticales (§3.8..§3.8-DECIMOQUINTA):
engine por inyección · session_scope transaccional · devuelve
Pydantic (SQLAlchemy no sube) · ids de la MISMA forma que el
in-memory (wlp_/goal_/wla_/cls_/appt_ + uuid4().hex[:8]).

Semántica literal del in-memory que se preserva:
  * create_profile: id/created_at/updated_at los fija el REPO ·
    update_profile None-ignora + updated_at SIEMPRE.
  * create_goal: status ACTIVE del create · created_at del repo.
  * log_activity: created_at del repo · date "" literal del create.
  * add_class: SIN created_at (el modelo no lo tiene — espejo
    exacto del observable del in-memory).
  * create_appointment: SCHEDULED literal · enrolled_count += 1 si
    la clase existe (clase inexistente NO rompe — el in-memory
    guardaba con silently-no-count: mismo observable).
  * cancel_appointment: CANCELLED + enrolled_count = max(0, n-1)
    (doble cancel clava en 0 — MISMO floor del in-memory).
  * list_activities: filtros date_from/date_to por string compare ·
    sort date DESC (orden contractual EXPLÍCITO, lección run #56:
    jamás el heap físico del result-set).
  * list_goals/list_classes/list_appointments: filtros en Python ·
    MISMO orden de inserción (order_by(id) siempre explícito).
  * get_recommendations: MISMA aritmética (avg 150 OMS · clases
    [:3] · profile/goals/activities reads).
  * generate_report: breakdown · most_freq .get · streak = len
    (unique dates — literal del in-memory) · summary MISMO formato
    con emoji 🏃 STRING LITERAL MISMO.
  * compute_prediction/detect_anomalies/compute_correlations/
    compute_insights: compute-on-read byte a byte (engagement 4
    componentes · riesgo 70/45/25 · churn 100-eng · forecast by_type
    · factores 4 señales · anomalías gap/stagnation/drop/over ·
    Pearson _pearson/_significance MISMOS (staticmethods del
    in-memory replicados como funciones de módulo acá) · segmentos
    3 tiers · ranking revenue impact 200_000 · insights 90 días).

created_at: el in-memory NUNCA lo persiste (el default_factory del
modelo lo regenera en cada read); el ORM lo persiste ISO Text y lo
parsea al leer — roundtrip pérdida cero, y conserva el REAL.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.session import session_scope
from club_mcp.db.orm.wellness_orm import (
    WellnessActivityORM,
    WellnessAppointmentORM,
    WellnessClassORM,
    WellnessGoalORM,
    WellnessProfileORM,
)
from club_mcp.models.wellness import (
    ActivityType,
    AppointmentStatus,
    ClassAppointment,
    ClassLevel,
    GoalStatus,
    WellnessActivity,
    WellnessActivityValue,
    WellnessAnomaly,
    WellnessAnomalyResponse,
    WellnessAnomalyType,
    WellnessClass,
    WellnessCorrelateResponse,
    WellnessCorrelation,
    WellnessCriticalInsight,
    WellnessGoal,
    WellnessGoalType,
    WellnessInsightsResponse,
    WellnessKeyFinding,
    WellnessPrediction,
    WellnessProfile,
    WellnessRecommendation,
    WellnessReport,
    WellnessRiskLevel,
    WellnessSegmentInsight,
)


def _gen_id(prefix: str) -> str:
    """MISMA forma que el in-memory: {prefix}_{uuid4().hex[:8]}."""
    return f"{prefix}_{uuid4().hex[:8]}"


def _plain(value: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return value.value if hasattr(value, "value") else str(value)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _parse_created(v: str | None) -> datetime:
    """created_at ISO Text → datetime (default_factory utcnow del modelo)."""
    if not v:
        return datetime.now(UTC)
    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return datetime.now(UTC)


def _activity_type(v: Any) -> ActivityType:
    return ActivityType(v)


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _profile_from_orm(p: WellnessProfileORM) -> WellnessProfile:
    return WellnessProfile(
        id=p.id,
        family_id=p.family_id,
        family_name=p.family_name,
        fitness_level=ClassLevel(p.fitness_level),
        health_conditions=list(p.health_conditions or []),
        allergies=list(p.allergies or []),
        dietary_restrictions=list(p.dietary_restrictions or []),
        preferred_activities=list(p.preferred_activities or []),
        emergency_contact=p.emergency_contact,
        emergency_phone=p.emergency_phone,
        notes=p.notes,
        created_at=_parse_created(p.created_at),
        updated_at=_parse_created(p.updated_at),
    )


def _goal_from_orm(g: WellnessGoalORM) -> WellnessGoal:
    return WellnessGoal(
        id=g.id,
        family_id=g.family_id,
        goal_type=WellnessGoalType(g.goal_type),
        title=g.title,
        description=g.description,
        target_value=g.target_value,
        current_value=g.current_value,
        unit=g.unit,
        status=GoalStatus(g.status),
        target_date=g.target_date,
        created_at=_parse_created(g.created_at),
    )


def _activity_from_orm(a: WellnessActivityORM) -> WellnessActivity:
    return WellnessActivity(
        id=a.id,
        family_id=a.family_id,
        member_name=a.member_name,
        activity_type=ActivityType(a.activity_type),
        description=a.description,
        duration_minutes=a.duration_minutes,
        calories_burned=a.calories_burned,
        distance_km=a.distance_km,
        notes=a.notes,
        date=a.date,
        created_at=_parse_created(a.created_at),
    )


def _class_from_orm(c: WellnessClassORM) -> WellnessClass:
    return WellnessClass(
        id=c.id,
        name=c.name,
        description=c.description,
        activity_type=ActivityType(c.activity_type),
        instructor=c.instructor,
        level=ClassLevel(c.level),
        max_participants=c.max_participants,
        duration_minutes=c.duration_minutes,
        location=c.location,
        schedule_day=c.schedule_day,
        schedule_time=c.schedule_time,
        enrolled_count=c.enrolled_count,
    )


def _appointment_from_orm(a: WellnessAppointmentORM) -> ClassAppointment:
    return ClassAppointment(
        id=a.id,
        class_id=a.class_id,
        class_name=a.class_name,
        family_id=a.family_id,
        member_name=a.member_name,
        date=a.date,
        time=a.time,
        status=AppointmentStatus(a.status),
        notes=a.notes,
        created_at=_parse_created(a.created_at),
    )


# ── correlación: los staticmethods del in-memory, MISMA fórmula ──


def _pearson(x: list[float], y: list[float]) -> float:
    """Pearson correlation coefficient (idéntico al in-memory)."""
    n = len(x)
    if n < 2 or n != len(y):
        return 0.0
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    num = sum(
        (xi - mean_x) * (yi - mean_y)
        for xi, yi in zip(x, y, strict=False)
    )
    den_x = sum((xi - mean_x) ** 2 for xi in x)
    den_y = sum((yi - mean_y) ** 2 for yi in y)
    den = float((den_x * den_y) ** 0.5)
    if den == 0:
        return 0.0
    return max(-1.0, min(1.0, float(num) / den))


def _significance(coeff: float) -> str:
    """Classify correlation coefficient significance (idéntico)."""
    abs_c = abs(coeff)
    if abs_c >= 0.7:
        return "high"
    if abs_c >= 0.4:
        return "medium"
    return "low"


_INFO_EMOJI = "\u2139\ufe0f"


class WellnessRepository:
    """Repo ORM async del dominio Wellness — contrato EXACTO del in-memory."""

    def __init__(self, engine: Any) -> None:
        self._engine = engine

    # ── Profiles ───────────────────────────────────────────

    async def create_profile(self, data: dict[str, Any]) -> WellnessProfile:
        pid = _gen_id("wlp")
        now = _now_iso()
        rec = WellnessProfileORM(
            id=pid,
            family_id=data["family_id"],
            family_name=data.get("family_name", ""),
            fitness_level=_plain(data.get("fitness_level", "beginner")),
            health_conditions=list(data.get("health_conditions", [])),
            allergies=list(data.get("allergies", [])),
            dietary_restrictions=list(data.get("dietary_restrictions", [])),
            preferred_activities=list(data.get("preferred_activities", [])),
            emergency_contact=data.get("emergency_contact", ""),
            emergency_phone=data.get("emergency_phone", ""),
            notes=data.get("notes", ""),
            created_at=now,
            updated_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        out = dict(data)
        out["id"] = pid
        out["created_at"] = now
        out["updated_at"] = now
        return WellnessProfile(**out)

    async def get_profile(self, profile_id: str) -> WellnessProfile | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessProfileORM, profile_id)
            if row is None:
                return None
            return _profile_from_orm(row)

    async def get_profile_by_family(self, family_id: str) -> WellnessProfile | None:
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(WellnessProfileORM).order_by(WellnessProfileORM.id)
                )
            ).scalars():
                if row.family_id == family_id:
                    return _profile_from_orm(row)
        return None

    async def update_profile(
        self, profile_id: str, updates: dict[str, Any]
    ) -> WellnessProfile | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessProfileORM, profile_id)
            if row is None:
                return None
            for k, v in updates.items():
                if v is None:
                    continue
                if k == "fitness_level" and hasattr(v, "value"):
                    v = v.value
                if hasattr(row, k):
                    setattr(row, k, v)
            row.updated_at = _now_iso()
            return _profile_from_orm(row)

    # ── Goals ──────────────────────────────────────────────

    async def create_goal(self, data: dict[str, Any]) -> WellnessGoal:
        gid = _gen_id("goal")
        now = _now_iso()
        goal_type = data.get("goal_type", "custom")
        if hasattr(goal_type, "value"):
            goal_type = goal_type.value
        status = data.get("status", "active")
        if hasattr(status, "value"):
            status = status.value
        rec = WellnessGoalORM(
            id=gid,
            family_id=data["family_id"],
            goal_type=goal_type,
            title=data.get("title", ""),
            description=data.get("description", ""),
            target_value=float(data.get("target_value", 0.0)),
            current_value=float(data.get("current_value", 0.0)),
            unit=data.get("unit", ""),
            status=status,
            target_date=data.get("target_date", ""),
            created_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        out = dict(data)
        out["id"] = gid
        out["created_at"] = now
        return WellnessGoal(**out)

    async def get_goal(self, goal_id: str) -> WellnessGoal | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessGoalORM, goal_id)
            if row is None:
                return None
            return _goal_from_orm(row)

    async def list_goals(
        self, family_id: str, status: str | None = None
    ) -> list[WellnessGoal]:
        out: list[WellnessGoal] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(WellnessGoalORM).order_by(WellnessGoalORM.id)
                )
            ).scalars():
                if row.family_id != family_id:
                    continue
                if status and row.status != status:
                    continue
                out.append(_goal_from_orm(row))
        return out

    async def update_goal(
        self, goal_id: str, updates: dict[str, Any]
    ) -> WellnessGoal | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessGoalORM, goal_id)
            if row is None:
                return None
            for k, v in updates.items():
                if v is None:
                    continue
                if hasattr(row, k):
                    setattr(row, k, v)
            return _goal_from_orm(row)

    # ── Activities ─────────────────────────────────────────

    async def log_activity(self, data: dict[str, Any]) -> WellnessActivity:
        aid = _gen_id("wla")
        now = _now_iso()
        at = data.get("activity_type", "other")
        if hasattr(at, "value"):
            at = at.value
        rec = WellnessActivityORM(
            id=aid,
            family_id=data["family_id"],
            member_name=data.get("member_name", ""),
            activity_type=at,
            description=data.get("description", ""),
            duration_minutes=int(data.get("duration_minutes", 0)),
            calories_burned=int(data.get("calories_burned", 0)),
            distance_km=float(data.get("distance_km", 0.0)),
            notes=data.get("notes", ""),
            date=data.get("date", ""),
            created_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        out = dict(data)
        out["id"] = aid
        out["created_at"] = now
        return WellnessActivity(**out)

    async def list_activities(
        self,
        family_id: str,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[WellnessActivity]:
        out: list[WellnessActivity] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(WellnessActivityORM).order_by(WellnessActivityORM.id)
                )
            ).scalars():
                if row.family_id != family_id:
                    continue
                if date_from and row.date < date_from:
                    continue
                if date_to and row.date > date_to:
                    continue
                out.append(_activity_from_orm(row))
        return sorted(out, key=lambda a: a.date, reverse=True)

    # ── Classes ────────────────────────────────────────────

    async def add_class(self, data: dict[str, Any]) -> WellnessClass:
        cid = _gen_id("cls")
        at = data.get("activity_type", "other")
        if hasattr(at, "value"):
            at = at.value
        level = data.get("level", "all_levels")
        if hasattr(level, "value"):
            level = level.value
        rec = WellnessClassORM(
            id=cid,
            name=data.get("name", ""),
            description=data.get("description", ""),
            activity_type=at,
            instructor=data.get("instructor", ""),
            level=level,
            max_participants=int(data.get("max_participants", 0)),
            duration_minutes=int(data.get("duration_minutes", 60)),
            location=data.get("location", ""),
            schedule_day=data.get("schedule_day", ""),
            schedule_time=data.get("schedule_time", ""),
            enrolled_count=int(data.get("enrolled_count", 0)),
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
        out = dict(data)
        out["id"] = cid
        return WellnessClass(**out)

    async def get_class(self, class_id: str) -> WellnessClass | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessClassORM, class_id)
            if row is None:
                return None
            return _class_from_orm(row)

    async def list_classes(
        self, activity_type: str | None = None
    ) -> list[WellnessClass]:
        out: list[WellnessClass] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(WellnessClassORM).order_by(WellnessClassORM.id)
                )
            ).scalars():
                if activity_type and row.activity_type != activity_type:
                    continue
                out.append(_class_from_orm(row))
        return out

    # ── Appointments ───────────────────────────────────────

    async def create_appointment(self, data: dict[str, Any]) -> ClassAppointment:
        aid = _gen_id("appt")
        now = _now_iso()
        status = data.get("status", "scheduled")
        if hasattr(status, "value"):
            status = status.value
        rec = WellnessAppointmentORM(
            id=aid,
            class_id=data.get("class_id", ""),
            class_name=data.get("class_name", ""),
            family_id=data["family_id"],
            member_name=data.get("member_name", ""),
            date=data.get("date", ""),
            time=data.get("time", ""),
            status=status,
            notes=data.get("notes", ""),
            created_at=now,
        )
        async with session_scope(self._engine) as s:
            s.add(rec)
            # enrolled_count += 1 si la clase existe (literal del in-memory)
            cls_row = await s.get(WellnessClassORM, rec.class_id)
            if cls_row is not None:
                cls_row.enrolled_count = cls_row.enrolled_count + 1
        out = dict(data)
        out["id"] = aid
        out["created_at"] = now
        return ClassAppointment(**out)

    async def cancel_appointment(
        self, appointment_id: str
    ) -> ClassAppointment | None:
        async with session_scope(self._engine) as s:
            row = await s.get(WellnessAppointmentORM, appointment_id)
            if row is None:
                return None
            cls_row = await s.get(WellnessClassORM, row.class_id)
            if cls_row is not None:
                cls_row.enrolled_count = max(
                    0, cls_row.enrolled_count - 1
                )
            row.status = AppointmentStatus.CANCELLED.value
            return _appointment_from_orm(row)

    async def list_appointments(self, family_id: str) -> list[ClassAppointment]:
        out: list[ClassAppointment] = []
        async with session_scope(self._engine) as s:
            for row in (
                await s.execute(
                    select(WellnessAppointmentORM).order_by(
                        WellnessAppointmentORM.id
                    )
                )
            ).scalars():
                if row.family_id != family_id:
                    continue
                out.append(_appointment_from_orm(row))
        return out

    # ── Recommendations ────────────────────────────────────

    async def get_recommendations(
        self, family_id: str
    ) -> list[WellnessRecommendation]:
        profile = await self.get_profile_by_family(family_id)
        goals = await self.list_goals(family_id, status="active")
        activities = await self.list_activities(family_id)

        recs: list[WellnessRecommendation] = []

        if profile:
            if not profile.preferred_activities:
                recs.append(WellnessRecommendation(
                    category="profile",
                    title="Completa tu perfil de bienestar",
                    description="Agrega tus actividades preferidas para recibir recomendaciones personalizadas.",
                    priority="high",
                ))
            if not profile.fitness_level or profile.fitness_level == ClassLevel.BEGINNER:
                recs.append(WellnessRecommendation(
                    category="fitness",
                    title="Clases para principiantes",
                    description="Te recomendamos empezar con clases de nivel principiante.",
                    priority="medium",
                ))

        if not goals:
            recs.append(WellnessRecommendation(
                category="goals",
                title="Define tus objetivos",
                description="Establece metas de bienestar para medir tu progreso.",
                priority="high",
            ))

        if activities:
            total_min = sum(a.duration_minutes for a in activities)
            avg_per_week = total_min / max(1, len(activities))
            if avg_per_week < 150:
                recs.append(WellnessRecommendation(
                    category="activity",
                    title="Aumenta tu actividad física",
                    description=f"La OMS recomienda 150 min/semana. Actualmente promedias {avg_per_week:.0f} min.",
                    priority="medium",
                ))
        else:
            recs.append(WellnessRecommendation(
                category="activity",
                title="Registra tu primera actividad",
                description="Empieza a registrar tus actividades para llevar tu progreso.",
                priority="high",
            ))

        available = await self.list_classes()
        for cls in available[:3]:
            recs.append(WellnessRecommendation(
                category="class",
                title=f"Prueba: {cls.name}",
                description=cls.description or f"Clase de {cls.activity_type.value} con {cls.instructor}",
                priority="low",
                related_class_id=cls.id,
            ))

        return recs

    # ── Reports ────────────────────────────────────────────

    async def generate_report(
        self,
        family_id: str,
        date_from: str,
        date_to: str,
    ) -> WellnessReport:
        activities = await self.list_activities(family_id, date_from, date_to)
        goals = await self.list_goals(family_id)

        total_min = sum(a.duration_minutes for a in activities)
        total_cal = sum(a.calories_burned for a in activities)

        by_type: dict[str, int] = {}
        for a in activities:
            at = a.activity_type.value if hasattr(a.activity_type, "value") else a.activity_type
            by_type[at] = by_type.get(at, 0) + 1
        breakdown = [
            {"activity_type": k, "count": v} for k, v in by_type.items()
        ]
        most_freq = max(by_type, key=by_type.__getitem__) if by_type else ""

        goals_by_status: dict[str, int] = {}
        for g in goals:
            gs = g.status.value if hasattr(g.status, "value") else g.status
            goals_by_status[gs] = goals_by_status.get(gs, 0) + 1

        unique_dates = sorted({a.date for a in activities if a.date})
        streak = 0
        for i in range(len(unique_dates) - 1, -1, -1):
            if i == len(unique_dates) - 1:
                streak = 1
            else:
                streak += 1

        return WellnessReport(
            period_start=date_from,
            period_end=date_to,
            total_activities=len(activities),
            total_minutes=total_min,
            total_calories=total_cal,
            most_frequent_activity=most_freq,
            activity_breakdown=breakdown,
            goals_summary=goals_by_status,
            streak_days=streak,
            summary=(
                f"\U0001f3c3 {len(activities)} actividades, "
                f"{total_min} minutos, "
                f"{total_cal} calorías quemadas. "
                f"Actividad favorita: {most_freq or 'N/A'}."
            ),
        )

    # ── Prediction ─────────────────────────────────────────

    async def compute_prediction(self, family_id: str) -> WellnessPrediction:
        """Compute wellness engagement and risk prediction."""
        profile = await self.get_profile_by_family(family_id)
        goals = await self.list_goals(family_id)
        activities = await self.list_activities(family_id)

        total_activities = len(activities)
        total_minutes = sum(a.duration_minutes for a in activities)

        active_goals = [g for g in goals if g.status == GoalStatus.ACTIVE]
        completed_goals = [g for g in goals if g.status == GoalStatus.COMPLETED]
        goal_completion_rate = (
            len(completed_goals) / max(1, len(goals)) * 100
        )

        active_dates = sorted(
            {a.date for a in activities if a.date}
        )

        activity_comp = min(40.0, total_activities * 4.0)
        duration_comp = min(30.0, total_minutes / 10.0)
        goal_comp = min(20.0, goal_completion_rate / 5.0)
        profile_comp = (
            10.0
            if profile and profile.preferred_activities
            else 0.0
        )
        engagement_score = (
            activity_comp + duration_comp
            + goal_comp + profile_comp
        )

        if engagement_score >= 70:
            risk_level = WellnessRiskLevel.LOW
            predicted_trend = "improving"
        elif engagement_score >= 45:
            risk_level = WellnessRiskLevel.MEDIUM
            predicted_trend = "stable"
        elif engagement_score >= 25:
            risk_level = WellnessRiskLevel.HIGH
            predicted_trend = "declining"
        else:
            risk_level = WellnessRiskLevel.CRITICAL
            predicted_trend = "declining"

        churn_risk = round(
            max(0.0, min(100.0, 100.0 - engagement_score)), 1
        )

        activity_forecast: dict[str, Any] = {}
        if activities:
            by_type: dict[str, int] = {}
            for a in activities:
                at = (
                    a.activity_type.value
                    if hasattr(a.activity_type, "value")
                    else a.activity_type
                )
                by_type[at] = by_type.get(at, 0) + 1
            activity_forecast = {
                "current_distribution": by_type,
                "most_frequent": max(by_type, key=by_type.__getitem__),
                "total_unique_dates": len(active_dates),
                "suggested_weekly_minutes": 150,
            }

        factors: list[dict[str, Any]] = []
        if total_activities == 0:
            factors.append({
                "factor": "Sin actividades registradas",
                "impact": "high",
            })
        if not active_goals:
            factors.append({
                "factor": "Sin objetivos activos",
                "impact": "medium",
            })
        if total_minutes < 150:
            factors.append({
                "factor": (
                    "Actividad física bajo recomendación "
                    "OMS (150 min/sem)"
                ),
                "impact": "medium",
            })
        if 0 < total_activities < 5:
            factors.append({
                "factor": (
                    "Pocas actividades — confianza limitada"
                ),
                "impact": "low",
            })

        if total_activities == 0:
            top_rec = (
                "Registrar tu primera actividad de bienestar"
            )
        elif not active_goals:
            top_rec = (
                "Establecer objetivos de bienestar "
                "para medir progreso"
            )
        elif engagement_score < 50:
            top_rec = (
                "Aumentar frecuencia de actividades "
                "a 3 veces por semana"
            )
        else:
            top_rec = (
                "¡Excelente progreso! Considerar clases "
                "avanzadas o nuevos desafíos"
            )

        confidence = min(
            100.0,
            total_activities * 10.0
            + len(goals) * 15.0
            + (15.0 if profile else 0.0),
        )

        return WellnessPrediction(
            family_id=family_id,
            risk_level=risk_level,
            engagement_score=round(engagement_score, 1),
            predicted_trend=predicted_trend,
            churn_risk_pct=churn_risk,
            activity_forecast=activity_forecast,
            factors=factors,
            top_recommendation=top_rec,
            confidence=round(confidence, 1),
        )

    # ── Anomaly Detection ──────────────────────────────────

    async def detect_anomalies(
        self, family_id: str
    ) -> WellnessAnomalyResponse:
        """Detect wellness anomalies for a family."""
        activities = await self.list_activities(family_id)
        goals = await self.list_goals(family_id)

        anomalies: list[WellnessAnomaly] = []
        now = datetime.now(UTC).isoformat()
        today = datetime.now(UTC).date()

        if activities:
            dates = sorted(
                {a.date for a in activities if a.date},
                reverse=True,
            )
            if dates:
                try:
                    last = datetime.strptime(
                        dates[0], "%Y-%m-%d"
                    ).date()
                    days_gap = (today - last).days
                    if days_gap > 14:
                        sev = (
                            WellnessRiskLevel.HIGH
                            if days_gap > 30
                            else WellnessRiskLevel.MEDIUM
                        )
                        anomalies.append(WellnessAnomaly(
                            id=f"anom_gap_{family_id}",
                            anomaly_type=(
                                WellnessAnomalyType.ACTIVITY_GAP
                            ),
                            severity=sev,
                            title="Inactividad prolongada",
                            description=(
                                f"Han pasado {days_gap} días "
                                f"desde la última actividad."
                            ),
                            detected_value=float(days_gap),
                            expected_min=0,
                            expected_max=14,
                            detected_at=now,
                            suggested_action=(
                                "Contactar a la familia para "
                                "motivar el regreso."
                            ),
                        ))
                except ValueError:
                    pass
        else:
            anomalies.append(WellnessAnomaly(
                id=f"anom_none_{family_id}",
                anomaly_type=(
                    WellnessAnomalyType.ENGAGEMENT_DROP
                ),
                severity=WellnessRiskLevel.HIGH,
                title="Sin actividades registradas",
                description=(
                    "No hay actividades de bienestar "
                    "registradas para esta familia."
                ),
                detected_value=0,
                expected_min=1,
                expected_max=999,
                detected_at=now,
                suggested_action=(
                    "Invitar a la familia a una clase "
                    "de prueba gratuita."
                ),
            ))

        active_goals = [
            g for g in goals if g.status == GoalStatus.ACTIVE
        ]
        for g in active_goals:
            if g.target_value > 0:
                progress = (
                    g.current_value / g.target_value * 100
                )
                if progress < 10:
                    anomalies.append(WellnessAnomaly(
                        id=f"anom_stag_{g.id}",
                        anomaly_type=(
                            WellnessAnomalyType.GOAL_STAGNATION
                        ),
                        severity=WellnessRiskLevel.MEDIUM,
                        title=(
                            f"Objetivo estancado: {g.title}"
                        ),
                        description=(
                            f"Solo {progress:.0f}% de progreso "
                            f"hacia '{g.title}'."
                        ),
                        detected_value=round(progress, 1),
                        expected_min=10,
                        expected_max=100,
                        detected_at=now,
                        suggested_action=(
                            f"Revisar el objetivo '{g.title}' "
                            f"o ajustar la meta."
                        ),
                    ))

        if len(activities) >= 6:
            sorted_act = sorted(
                activities, key=lambda a: a.date
            )
            mid = len(sorted_act) // 2
            first_min = sum(
                a.duration_minutes for a in sorted_act[:mid]
            )
            second_min = sum(
                a.duration_minutes for a in sorted_act[mid:]
            )
            if first_min > 0 and second_min < first_min * 0.5:
                ratio = round(
                    second_min / first_min * 100, 1
                )
                anomalies.append(WellnessAnomaly(
                    id=f"anom_drop_{family_id}",
                    anomaly_type=(
                        WellnessAnomalyType.ENGAGEMENT_DROP
                    ),
                    severity=WellnessRiskLevel.HIGH,
                    title=(
                        "Caída significativa en engagement"
                    ),
                    description=(
                        f"Actividad reducida a {ratio}% "
                        f"del período anterior."
                    ),
                    detected_value=ratio,
                    expected_min=50,
                    expected_max=150,
                    detected_at=now,
                    suggested_action=(
                        "Programar seguimiento personalizado "
                        "o invitación a clase especial."
                    ),
                ))

        if activities:
            week_ago = (
                datetime.now(UTC)
                - timedelta(days=7)
            ).strftime("%Y-%m-%d")
            recent = [
                a for a in activities if a.date >= week_ago
            ]
            recent_min = sum(
                a.duration_minutes for a in recent
            )
            if recent_min > 600:
                anomalies.append(WellnessAnomaly(
                    id=f"anom_over_{family_id}",
                    anomaly_type=(
                        WellnessAnomalyType.OVERTRAINING
                    ),
                    severity=WellnessRiskLevel.MEDIUM,
                    title="Posible sobreentrenamiento",
                    description=(
                        f"{recent_min} minutos esta semana. "
                        f"Riesgo de lesión."
                    ),
                    detected_value=float(recent_min),
                    expected_min=0,
                    expected_max=600,
                    detected_at=now,
                    suggested_action=(
                        "Recomendar descanso y alternar con "
                        "actividades de baja intensidad."
                    ),
                ))

        critical_count = sum(
            1 for a in anomalies
            if a.severity in (
                WellnessRiskLevel.CRITICAL,
                WellnessRiskLevel.HIGH,
            )
        )
        if not anomalies:
            summary = (
                "\u2705 Sin anomalías detectadas. El engagement "
                "de bienestar es saludable."
            )
        elif critical_count > 0:
            summary = (
                f"\u26a0\ufe0f {len(anomalies)} anomalía(s), "
                f"{critical_count} de alta severidad."
            )
        else:
            summary = (
                f"{_INFO_EMOJI} {len(anomalies)} anomalía(s) detectada(s)."
            )

        return WellnessAnomalyResponse(
            family_id=family_id,
            total_anomalies=len(anomalies),
            critical_count=critical_count,
            anomalies=anomalies,
            summary=summary,
        )

    # ── Cross-Domain Correlations ───────────────────────────

    async def compute_correlations(self) -> WellnessCorrelateResponse:
        """Compute cross-domain wellness correlations (club-wide)."""
        family_metrics: list[dict[str, Any]] = []
        seen: set[str] = set()

        async with session_scope(self._engine) as s:
            profile_rows = (
                await s.execute(
                    select(WellnessProfileORM).order_by(WellnessProfileORM.id)
                )
            ).scalars().all()

        for profile_data in profile_rows:
            fid = profile_data.family_id
            if not fid or fid in seen:
                continue
            seen.add(fid)

            activities = await self.list_activities(fid)
            goals = await self.list_goals(fid)

            total_activities = len(activities)
            total_minutes = sum(a.duration_minutes for a in activities)

            total_goals = len(goals)
            completed = sum(
                1 for g in goals
                if g.status == GoalStatus.COMPLETED
            )
            goal_rate = (
                (completed / total_goals * 100)
                if total_goals > 0
                else 0.0
            )

            profile_comp = (
                10.0
                if profile_data.preferred_activities
                else 0.0
            )
            eng = (
                min(40.0, total_activities * 4.0)
                + min(30.0, total_minutes / 10.0)
                + min(20.0, goal_rate / 5.0)
                + profile_comp
            )

            retention = 0.0
            if activities:
                dates = sorted(
                    {a.date for a in activities if a.date},
                    reverse=True,
                )
                if dates:
                    today = datetime.now(UTC).date()
                    try:
                        last = datetime.strptime(
                            dates[0], "%Y-%m-%d"
                        ).date()
                        if (today - last).days <= 14:
                            retention = 1.0
                    except ValueError:
                        pass

            act_types = [
                (
                    a.activity_type.value
                    if hasattr(a.activity_type, "value")
                    else a.activity_type
                )
                for a in activities
            ]

            family_metrics.append({
                "family_id": fid,
                "engagement": eng,
                "total_activities": total_activities,
                "total_minutes": total_minutes,
                "goal_rate": goal_rate,
                "retention": retention,
                "satisfaction": goal_rate / 100.0,
                "revenue_proxy": total_minutes / 100.0,
                "activity_types": act_types,
            })

        if len(family_metrics) < 2:
            return WellnessCorrelateResponse(
                correlations={
                    "wellness_to_retention": WellnessCorrelation(),
                    "wellness_to_revenue": WellnessCorrelation(),
                    "wellness_to_satisfaction": WellnessCorrelation(),
                },
                segment_insights=[],
                activity_value_ranking=[],
            )

        eng_scores = [m["engagement"] for m in family_metrics]
        retention_arr = [m["retention"] for m in family_metrics]
        revenue_arr = [m["revenue_proxy"] for m in family_metrics]
        satisf_arr = [m["satisfaction"] for m in family_metrics]

        r_ret = _pearson(eng_scores, retention_arr)
        r_rev = _pearson(eng_scores, revenue_arr)
        r_sat = _pearson(eng_scores, satisf_arr)

        correlations = {
            "wellness_to_retention": WellnessCorrelation(
                coefficient=round(r_ret, 2),
                significance=_significance(r_ret),
            ),
            "wellness_to_revenue": WellnessCorrelation(
                coefficient=round(r_rev, 2),
                significance=_significance(r_rev),
            ),
            "wellness_to_satisfaction": WellnessCorrelation(
                coefficient=round(r_sat, 2),
                significance=_significance(r_sat),
            ),
        }

        segments = [
            ("Wellness Alto (70-100)", 70, 100),
            ("Wellness Medio (40-69)", 40, 69),
            ("Wellness Bajo (0-39)", 0, 39),
        ]

        segment_insights: list[WellnessSegmentInsight] = []
        for seg_name, seg_min, seg_max in segments:
            members = [
                m for m in family_metrics
                if seg_min <= m["engagement"] <= seg_max
            ]
            count = len(members)
            if count > 0:
                avg_eng = (
                    sum(m["engagement"] for m in members) / count
                )
                avg_ret = (
                    sum(m["retention"] for m in members) / count
                )
                avg_spend = round(
                    50_000 + (avg_eng / 100) * 150_000, 0
                )
                avg_nps = round(max(0, avg_eng - 10), 0)
            else:
                avg_ret = 0.0
                avg_spend = 0.0
                avg_nps = 0.0

            segment_insights.append(WellnessSegmentInsight(
                segment=seg_name,
                wellness_score_range=[
                    float(seg_min), float(seg_max)
                ],
                avg_monthly_spend_crc=avg_spend,
                retention_rate=round(avg_ret, 2),
                nps=avg_nps,
                member_count=count,
            ))

        act_stats: dict[str, dict[str, float]] = {}
        for m in family_metrics:
            seen_types: set[str] = set()
            for at in m["activity_types"]:
                if at in seen_types:
                    continue
                seen_types.add(at)
                if at not in act_stats:
                    act_stats[at] = {
                        "families": 0.0,
                        "engagement_sum": 0.0,
                        "minutes_sum": 0.0,
                    }
                act_stats[at]["families"] += 1
                act_stats[at]["engagement_sum"] += m["engagement"]
                act_stats[at]["minutes_sum"] += m["total_minutes"]

        activity_value_ranking: list[WellnessActivityValue] = []
        for at, stats in act_stats.items():
            fam_count = int(stats["families"])
            avg_eng = (
                stats["engagement_sum"] / max(1, fam_count)
            )
            revenue_impact = round(
                fam_count * (avg_eng / 100) * 200_000, 0
            )
            sat_corr = round(
                min(1.0, avg_eng / 100 + 0.3), 2
            )
            churn_red = round(
                min(0.3, avg_eng / 500), 2
            )

            activity_value_ranking.append(
                WellnessActivityValue(
                    activity=at,
                    avg_participants=float(fam_count),
                    monthly_revenue_impact_crc=revenue_impact,
                    satisfaction_correlation=sat_corr,
                    churn_risk_reduction=churn_red,
                )
            )

        activity_value_ranking.sort(
            key=lambda x: x.monthly_revenue_impact_crc,
            reverse=True,
        )

        return WellnessCorrelateResponse(
            correlations=correlations,
            segment_insights=segment_insights,
            activity_value_ranking=activity_value_ranking,
        )

    # ── Comprehensive Insights ──────────────────────────────

    async def compute_insights(
        self, family_id: str
    ) -> WellnessInsightsResponse:
        """Compute comprehensive wellness insights for a family."""
        profile = await self.get_profile_by_family(family_id)
        goals = await self.list_goals(family_id)
        activities = await self.list_activities(family_id)
        prediction = await self.compute_prediction(family_id)
        anomaly_resp = await self.detect_anomalies(family_id)

        today = datetime.now(UTC).date()
        date_to = today.isoformat()
        date_from = (today - timedelta(days=90)).isoformat()
        _report = await self.generate_report(
            family_id, date_from, date_to
        )

        now = datetime.now(UTC).isoformat()
        health_score = prediction.engagement_score
        family_name = (
            profile.family_name if profile else family_id
        )

        parts = [
            f"El bienestar de {family_name} tiene un "
            f"score de {health_score:.0f}/100."
        ]
        if prediction.predicted_trend == "improving":
            parts.append(
                "La tendencia es positiva y en mejora."
            )
        elif prediction.predicted_trend == "declining":
            parts.append(
                "Se detecta una tendencia descendente "
                "que requiere atención."
            )
        else:
            parts.append(
                "La tendencia se mantiene estable."
            )
        if anomaly_resp.total_anomalies > 0:
            parts.append(
                f"Se detectaron "
                f"{anomaly_resp.total_anomalies} "
                f"anomalía(s)."
            )
        executive_summary = " ".join(parts)

        key_findings: list[WellnessKeyFinding] = []

        group_count = sum(
            1 for a in activities
            if (
                a.activity_type.value
                if hasattr(a.activity_type, "value")
                else a.activity_type
            ) in ("group_class", "yoga", "meditation")
        )
        individual_count = len(activities) - group_count
        if individual_count > 0 and group_count > 0:
            ratio = individual_count / group_count
            if ratio > 2:
                key_findings.append(WellnessKeyFinding(
                    category="engagement",
                    finding=(
                        f"Actividades individuales superan "
                        f"a las grupales {ratio:.1f}:1. "
                        f"Las grupales generan mayor "
                        f"impacto en retención."
                    ),
                    impact="high",
                    action=(
                        "Incorporar al menos 1 actividad "
                        "grupal semanal."
                    ),
                ))

        active_goals = [
            g for g in goals
            if g.status == GoalStatus.ACTIVE
        ]
        if not active_goals:
            finding_text = (
                "No hay objetivos de bienestar "
                "definidos."
                if not goals
                else "Los objetivos existentes no "
                "están activos."
            )
            key_findings.append(WellnessKeyFinding(
                category="opportunity",
                finding=finding_text,
                impact="medium",
                action=(
                    "Establecer al menos 2 objetivos "
                    "de bienestar medibles."
                ),
            ))

        per_point = round(
            max(5_000, health_score * 120), 0
        )
        key_findings.append(WellnessKeyFinding(
            category="financial",
            finding=(
                f"Cada punto de mejora en wellness "
                f"score genera un impacto estimado de "
                f"\u20a1{per_point:,.0f} adicionales "
                f"mensuales por socio."
            ),
            impact="high",
            action=(
                "Priorizar inversiones en programas "
                "de bienestar con ROI demostrado."
            ),
        ))

        if anomaly_resp.critical_count > 0:
            key_findings.append(WellnessKeyFinding(
                category="risk",
                finding=(
                    f"{anomaly_resp.critical_count} "
                    f"anomalía(s) de alta severidad "
                    f"requieren acción inmediata."
                ),
                impact="high",
                action=(
                    "Activar protocolo de retención "
                    "con seguimiento personalizado."
                ),
            ))

        trend_analysis: dict[str, str] = {
            "period": "Últimos 90 días",
            "direction": prediction.predicted_trend,
            "velocity": (
                f"{prediction.engagement_score / 10:.1f}%"
                f" por semana"
            ),
            "comparison": "vs período anterior",
        }

        critical_insights: list[WellnessCriticalInsight] = []
        for anom in anomaly_resp.anomalies:
            if anom.severity in (
                WellnessRiskLevel.HIGH,
                WellnessRiskLevel.CRITICAL,
            ):
                critical_insights.append(
                    WellnessCriticalInsight(
                        insight=anom.description,
                        confidence=min(
                            0.95,
                            prediction.confidence / 100,
                        ),
                        recommended_action=(
                            anom.suggested_action
                        ),
                    )
                )

        churn_risk = max(
            0, round(prediction.churn_risk_pct / 20)
        )

        if prediction.predicted_trend == "improving":
            eng_forecast = (
                f"+{health_score * 0.05:.0f}% basado en "
                f"tendencia positiva actual."
            )
            growth = (
                "Mantener la estrategia actual puede "
                "consolidar las mejoras."
            )
        elif prediction.predicted_trend == "declining":
            eng_forecast = (
                f"{health_score * -0.1:.0f}% si la "
                f"tendencia negativa continúa."
            )
            growth = (
                "Invertir en actividades grupales y "
                "seguimiento personalizado."
            )
        else:
            eng_forecast = (
                "Estable. Pequeñas mejoras posibles "
                "con intervención dirigida."
            )
            growth = (
                "Un programa de wellness personalizado "
                "puede incrementar engagement "
                "significativamente."
            )

        predictions: dict[str, Any] = {
            "next_month_engagement": eng_forecast,
            "churn_risk_members": churn_risk,
            "growth_opportunity": growth,
        }

        return WellnessInsightsResponse(
            generated_at=now,
            health_score=health_score,
            executive_summary=executive_summary,
            key_findings=key_findings,
            trend_analysis=trend_analysis,
            critical_insights=critical_insights,
            predictions=predictions,
        )
