"""In-memory wellness repository."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from club_mcp.models.wellness import (
    ActivityType,
    AppointmentStatus,
    ClassAppointment,
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
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


class WellnessRepository:
    """In-memory repository for wellness data."""

    def __init__(self) -> None:
        self._profiles: dict[str, dict[str, Any]] = {}
        self._goals: dict[str, dict[str, Any]] = {}
        self._activities: dict[str, dict[str, Any]] = {}
        self._classes: dict[str, dict[str, Any]] = {}
        self._appointments: dict[str, dict[str, Any]] = {}

    # ── Profiles ───────────────────────────────────────────

    def create_profile(self, data: dict[str, Any]) -> WellnessProfile:
        pid = _gen_id("wlp")
        now = datetime.now(timezone.utc)
        data["id"] = pid
        data["created_at"] = now.isoformat()
        data["updated_at"] = now.isoformat()
        self._profiles[pid] = data
        return WellnessProfile(**data)

    def get_profile(self, profile_id: str) -> WellnessProfile | None:
        if profile_id not in self._profiles:
            return None
        return WellnessProfile(**self._profiles[profile_id])

    def get_profile_by_family(self, family_id: str) -> WellnessProfile | None:
        for rec in self._profiles.values():
            if rec.get("family_id") == family_id:
                return WellnessProfile(**rec)
        return None

    def update_profile(self, profile_id: str, updates: dict[str, Any]) -> WellnessProfile | None:
        if profile_id not in self._profiles:
            return None
        rec = self._profiles[profile_id]
        for k, v in updates.items():
            if v is not None:
                rec[k] = v
        rec["updated_at"] = datetime.now(timezone.utc).isoformat()
        return WellnessProfile(**rec)

    # ── Goals ──────────────────────────────────────────────

    def create_goal(self, data: dict[str, Any]) -> WellnessGoal:
        gid = _gen_id("goal")
        now = datetime.now(timezone.utc)
        data["id"] = gid
        data["created_at"] = now.isoformat()
        self._goals[gid] = data
        return WellnessGoal(**data)

    def get_goal(self, goal_id: str) -> WellnessGoal | None:
        if goal_id not in self._goals:
            return None
        return WellnessGoal(**self._goals[goal_id])

    def list_goals(self, family_id: str, status: str | None = None) -> list[WellnessGoal]:
        out: list[WellnessGoal] = []
        for rec in self._goals.values():
            if rec.get("family_id") != family_id:
                continue
            if status and rec.get("status") != status:
                continue
            out.append(WellnessGoal(**rec))
        return out

    def update_goal(self, goal_id: str, updates: dict[str, Any]) -> WellnessGoal | None:
        if goal_id not in self._goals:
            return None
        rec = self._goals[goal_id]
        for k, v in updates.items():
            if v is not None:
                rec[k] = v
        return WellnessGoal(**rec)

    # ── Activities ─────────────────────────────────────────

    def log_activity(self, data: dict[str, Any]) -> WellnessActivity:
        aid = _gen_id("wla")
        now = datetime.now(timezone.utc)
        data["id"] = aid
        data["created_at"] = now.isoformat()
        self._activities[aid] = data
        return WellnessActivity(**data)

    def list_activities(
        self,
        family_id: str,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[WellnessActivity]:
        out: list[WellnessActivity] = []
        for rec in self._activities.values():
            if rec.get("family_id") != family_id:
                continue
            if date_from and rec.get("date", "") < date_from:
                continue
            if date_to and rec.get("date", "") > date_to:
                continue
            out.append(WellnessActivity(**rec))
        return sorted(out, key=lambda a: a.date, reverse=True)

    # ── Classes ────────────────────────────────────────────

    def add_class(self, data: dict[str, Any]) -> WellnessClass:
        cid = _gen_id("cls")
        data["id"] = cid
        self._classes[cid] = data
        return WellnessClass(**data)

    def get_class(self, class_id: str) -> WellnessClass | None:
        if class_id not in self._classes:
            return None
        return WellnessClass(**self._classes[class_id])

    def list_classes(self, activity_type: str | None = None) -> list[WellnessClass]:
        out: list[WellnessClass] = []
        for rec in self._classes.values():
            if activity_type and rec.get("activity_type") != activity_type:
                continue
            out.append(WellnessClass(**rec))
        return out

    # ── Appointments ───────────────────────────────────────

    def create_appointment(self, data: dict[str, Any]) -> ClassAppointment:
        aid = _gen_id("appt")
        now = datetime.now(timezone.utc)
        data["id"] = aid
        data["created_at"] = now.isoformat()
        self._appointments[aid] = data
        # Increment enrolled count
        cls_id = data.get("class_id", "")
        if cls_id in self._classes:
            self._classes[cls_id]["enrolled_count"] = (
                self._classes[cls_id].get("enrolled_count", 0) + 1
            )
        return ClassAppointment(**data)

    def cancel_appointment(self, appointment_id: str) -> ClassAppointment | None:
        if appointment_id not in self._appointments:
            return None
        rec = self._appointments[appointment_id]
        cls_id = rec.get("class_id", "")
        if cls_id in self._classes:
            self._classes[cls_id]["enrolled_count"] = max(
                0, self._classes[cls_id].get("enrolled_count", 1) - 1
            )
        rec["status"] = AppointmentStatus.CANCELLED.value
        return ClassAppointment(**rec)

    def list_appointments(self, family_id: str) -> list[ClassAppointment]:
        out: list[ClassAppointment] = []
        for rec in self._appointments.values():
            if rec.get("family_id") != family_id:
                continue
            out.append(ClassAppointment(**rec))
        return out

    # ── Recommendations ────────────────────────────────────

    def get_recommendations(self, family_id: str) -> list[WellnessRecommendation]:
        profile = self.get_profile_by_family(family_id)
        goals = self.list_goals(family_id, status="active")
        activities = self.list_activities(family_id)

        recs: list[WellnessRecommendation] = []

        # Profile-based recommendations
        if profile:
            if not profile.preferred_activities:
                recs.append(WellnessRecommendation(
                    category="profile",
                    title="Completa tu perfil de bienestar",
                    description="Agrega tus actividades preferidas para recibir recomendaciones personalizadas.",
                    priority="high",
                ))
            if not profile.fitness_level or profile.fitness_level == "beginner":
                recs.append(WellnessRecommendation(
                    category="fitness",
                    title="Clases para principiantes",
                    description="Te recomendamos empezar con clases de nivel principiante.",
                    priority="medium",
                ))

        # Goal-based recommendations
        if not goals:
            recs.append(WellnessRecommendation(
                category="goals",
                title="Define tus objetivos",
                description="Establece metas de bienestar para medir tu progreso.",
                priority="high",
            ))

        # Activity-based recommendations
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

        # Available classes
        available = self.list_classes()
        for cls in available[:3]:
            recs.append(WellnessRecommendation(
                category="class",
                title=f"Prueba: {cls.name}",
                description=cls.description or f"Clase de {cls.activity_type} con {cls.instructor}",
                priority="low",
                related_class_id=cls.id,
            ))

        return recs

    # ── Reports ────────────────────────────────────────────

    def generate_report(
        self,
        family_id: str,
        date_from: str,
        date_to: str,
    ) -> WellnessReport:
        activities = self.list_activities(family_id, date_from, date_to)
        goals = self.list_goals(family_id)

        total_min = sum(a.duration_minutes for a in activities)
        total_cal = sum(a.calories_burned for a in activities)

        # Activity breakdown
        by_type: dict[str, int] = {}
        for a in activities:
            at = a.activity_type.value if hasattr(a.activity_type, "value") else a.activity_type
            by_type[at] = by_type.get(at, 0) + 1
        breakdown = [
            {"activity_type": k, "count": v} for k, v in by_type.items()
        ]
        most_freq = max(by_type, key=by_type.get) if by_type else ""

        # Goals summary
        goals_by_status: dict[str, int] = {}
        for g in goals:
            gs = g.status.value if hasattr(g.status, "value") else g.status
            goals_by_status[gs] = goals_by_status.get(gs, 0) + 1

        # Streak (consecutive days with activities)
        unique_dates = sorted(set(a.date for a in activities if a.date))
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
                f"🏃 {len(activities)} actividades, "
                f"{total_min} minutos, "
                f"{total_cal} calorías quemadas. "
                f"Actividad favorita: {most_freq or 'N/A'}."
            ),
        )

    # ── Prediction ─────────────────────────────────────────

    def compute_prediction(self, family_id: str) -> WellnessPrediction:
        """Compute wellness engagement and risk prediction."""
        profile = self.get_profile_by_family(family_id)
        goals = self.list_goals(family_id)
        activities = self.list_activities(family_id)

        total_activities = len(activities)
        total_minutes = sum(a.duration_minutes for a in activities)

        # Goal metrics
        active_goals = [
            g for g in goals if g.status == GoalStatus.ACTIVE
        ]
        completed_goals = [
            g for g in goals if g.status == GoalStatus.COMPLETED
        ]
        goal_completion_rate = (
            len(completed_goals) / max(1, len(goals)) * 100
        )

        # Activity consistency (unique active dates)
        active_dates = sorted(
            set(a.date for a in activities if a.date)
        )

        # Engagement score (0-100) — 4 weighted components
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

        # Risk classification
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

        # Activity forecast
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
                "most_frequent": max(by_type, key=by_type.get),
                "total_unique_dates": len(active_dates),
                "suggested_weekly_minutes": 150,
            }

        # Contributing factors
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

        # Top recommendation
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

        # Confidence based on data volume
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

    def detect_anomalies(
        self, family_id: str
    ) -> WellnessAnomalyResponse:
        """Detect wellness anomalies for a family."""
        activities = self.list_activities(family_id)
        goals = self.list_goals(family_id)

        anomalies: list[WellnessAnomaly] = []
        now = datetime.now(timezone.utc).isoformat()
        today = datetime.now(timezone.utc).date()

        # 1. Activity gap — last activity > 14 days ago
        if activities:
            dates = sorted(
                set(a.date for a in activities if a.date),
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
            # No activities at all
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

        # 2. Goal stagnation — <10% progress on active goals
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

        # 3. Engagement drop — second half < 50% of first
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

        # 4. Overtraining — >600 min in last 7 days
        if activities:
            week_ago = (
                datetime.now(timezone.utc)
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

        # Build response
        critical_count = sum(
            1 for a in anomalies
            if a.severity in (
                WellnessRiskLevel.CRITICAL,
                WellnessRiskLevel.HIGH,
            )
        )
        if not anomalies:
            summary = (
                "✅ Sin anomalías detectadas. El engagement "
                "de bienestar es saludable."
            )
        elif critical_count > 0:
            summary = (
                f"⚠️ {len(anomalies)} anomalía(s), "
                f"{critical_count} de alta severidad."
            )
        else:
            summary = (
                f"ℹ️ {len(anomalies)} anomalía(s) detectada(s)."
            )

        return WellnessAnomalyResponse(
            family_id=family_id,
            total_anomalies=len(anomalies),
            critical_count=critical_count,
            anomalies=anomalies,
            summary=summary,
        )

    # ── Correlation Helpers ─────────────────────────────────

    @staticmethod
    def _pearson(x: list[float], y: list[float]) -> float:
        """Pearson correlation coefficient."""
        n = len(x)
        if n < 2 or n != len(y):
            return 0.0
        mean_x = sum(x) / n
        mean_y = sum(y) / n
        num = sum(
            (xi - mean_x) * (yi - mean_y)
            for xi, yi in zip(x, y)
        )
        den_x = sum((xi - mean_x) ** 2 for xi in x)
        den_y = sum((yi - mean_y) ** 2 for yi in y)
        den = (den_x * den_y) ** 0.5
        if den == 0:
            return 0.0
        return max(-1.0, min(1.0, num / den))

    @staticmethod
    def _significance(coeff: float) -> str:
        """Classify correlation coefficient significance."""
        abs_c = abs(coeff)
        if abs_c >= 0.7:
            return "high"
        if abs_c >= 0.4:
            return "medium"
        return "low"

    # ── Cross-Domain Correlations ───────────────────────────

    def compute_correlations(self) -> WellnessCorrelateResponse:
        """Compute cross-domain wellness correlations (club-wide).

        Iterates all families to produce:
        - Pearson correlations: wellness ↔ retention, revenue, satisfaction
        - Segment insights: 3 tiers of engagement with business metrics
        - Activity value ranking: per-activity revenue impact estimation
        """
        # 1. Gather per-family metrics
        family_metrics: list[dict[str, Any]] = []
        seen: set[str] = set()

        for profile_data in self._profiles.values():
            fid = profile_data.get("family_id", "")
            if not fid or fid in seen:
                continue
            seen.add(fid)

            activities = self.list_activities(fid)
            goals = self.list_goals(fid)

            total_activities = len(activities)
            total_minutes = sum(a.duration_minutes for a in activities)

            # Goal completion rate
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

            # Engagement score (same formula as compute_prediction)
            profile_comp = (
                10.0
                if profile_data.get("preferred_activities")
                else 0.0
            )
            eng = (
                min(40.0, total_activities * 4.0)
                + min(30.0, total_minutes / 10.0)
                + min(20.0, goal_rate / 5.0)
                + profile_comp
            )

            # Retention proxy: activity in last 14 days
            retention = 0.0
            if activities:
                dates = sorted(
                    set(a.date for a in activities if a.date),
                    reverse=True,
                )
                if dates:
                    today = datetime.now(timezone.utc).date()
                    try:
                        last = datetime.strptime(
                            dates[0], "%Y-%m-%d"
                        ).date()
                        if (today - last).days <= 14:
                            retention = 1.0
                    except ValueError:
                        pass

            # Activity types for this family
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

        # 2. Not enough data — return neutral
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

        # 3. Compute Pearson correlations
        eng_scores = [m["engagement"] for m in family_metrics]
        retention_arr = [m["retention"] for m in family_metrics]
        revenue_arr = [m["revenue_proxy"] for m in family_metrics]
        satisf_arr = [m["satisfaction"] for m in family_metrics]

        r_ret = self._pearson(eng_scores, retention_arr)
        r_rev = self._pearson(eng_scores, revenue_arr)
        r_sat = self._pearson(eng_scores, satisf_arr)

        correlations = {
            "wellness_to_retention": WellnessCorrelation(
                coefficient=round(r_ret, 2),
                significance=self._significance(r_ret),
            ),
            "wellness_to_revenue": WellnessCorrelation(
                coefficient=round(r_rev, 2),
                significance=self._significance(r_rev),
            ),
            "wellness_to_satisfaction": WellnessCorrelation(
                coefficient=round(r_sat, 2),
                significance=self._significance(r_sat),
            ),
        }

        # 4. Segment insights (3 tiers)
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
                # Revenue estimate: higher engagement → higher spend
                avg_spend = round(
                    50_000 + (avg_eng / 100) * 150_000, 0
                )
                # NPS estimate from engagement level
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

        # 5. Activity value ranking
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
            # Revenue impact: families × engagement × scale
            revenue_impact = round(
                fam_count * (avg_eng / 100) * 200_000, 0
            )
            # Satisfaction correlation from engagement level
            sat_corr = round(
                min(1.0, avg_eng / 100 + 0.3), 2
            )
            # Churn risk reduction estimate
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

    def compute_insights(
        self, family_id: str
    ) -> WellnessInsightsResponse:
        """Compute comprehensive wellness insights for a family.

        Aggregates: prediction + anomalies + goals + activities
        into a structured insights report.
        """
        profile = self.get_profile_by_family(family_id)
        goals = self.list_goals(family_id)
        activities = self.list_activities(family_id)
        prediction = self.compute_prediction(family_id)
        anomaly_resp = self.detect_anomalies(family_id)

        # Report for last 90 days
        today = datetime.now(timezone.utc).date()
        date_to = today.isoformat()
        date_from = (today - timedelta(days=90)).isoformat()
        report = self.generate_report(
            family_id, date_from, date_to
        )

        now = datetime.now(timezone.utc).isoformat()
        health_score = prediction.engagement_score
        family_name = (
            profile.family_name if profile else family_id
        )

        # ── Executive summary ──
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

        # ── Key findings ──
        key_findings: list[WellnessKeyFinding] = []

        # Finding 1: Group vs individual balance
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

        # Finding 2: Goals status
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

        # Finding 3: Financial impact
        per_point = round(
            max(5_000, health_score * 120), 0
        )
        key_findings.append(WellnessKeyFinding(
            category="financial",
            finding=(
                f"Cada punto de mejora en wellness "
                f"score genera un impacto estimado de "
                f"₡{per_point:,.0f} adicionales "
                f"mensuales por socio."
            ),
            impact="high",
            action=(
                "Priorizar inversiones en programas "
                "de bienestar con ROI demostrado."
            ),
        ))

        # Finding 4: Critical risk
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

        # ── Trend analysis ──
        trend_analysis: dict[str, str] = {
            "period": "Últimos 90 días",
            "direction": prediction.predicted_trend,
            "velocity": (
                f"{prediction.engagement_score / 10:.1f}%"
                f" por semana"
            ),
            "comparison": "vs período anterior",
        }

        # ── Critical insights (high severity anomalies) ──
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

        # ── Predictions ──
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
