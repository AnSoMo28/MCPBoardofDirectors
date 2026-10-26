"""WellnessAgent — manages wellness, fitness, spa and health experiences.

7 tools covering profiles, goals, activity logging, class scheduling,
recommendations, and wellness reports.
"""

from __future__ import annotations

from typing import Any

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.wellness_repo import WellnessRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.wellness import (
    ActivityType,
    ClassLevel,
    GoalStatus,
    WellnessGoalType,
)


class WellnessAgent(BaseAgent):
    """Agente de bienestar y fitness del club."""

    agent_name = "wellness"
    description = "Gestión de bienestar: fitness, spa, nutrición y salud"

    def __init__(
        self,
        wellness_repo: WellnessRepository,
        approval_engine: Any = None,
        notifier: Any = None,
    ) -> None:
        super().__init__()
        self.repo = wellness_repo
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # ─────────────────────────────────────────────────────────
    # Tool 1: wellness_profile_get  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_profile_get",
        "Obtener el perfil de bienestar de una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_profile_get(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Get wellness profile for a family."""
        profile = self.repo.get_profile_by_family(family_id)
        if not profile:
            return {
                "status": "not_found",
                "message": (
                    "No encontramos un perfil de bienestar para esta familia. "
                    "¡Podemos crear uno nuevo! 💪"
                ),
            }

        return {
            "status": "success",
            "message": (
                f"🧘 Perfil de bienestar de {profile.family_name}: "
                f"Nivel {profile.fitness_level.value}, "
                f"{len(profile.preferred_activities)} actividades preferidas."
            ),
            "data": profile.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 2: wellness_profile_update  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_profile_update",
        "Crear o actualizar el perfil de bienestar de una familia.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def wellness_profile_update(
        self,
        family_id: str,
        family_name: str = "",
        fitness_level: str = "beginner",
        health_conditions: list[str] | None = None,
        allergies: list[str] | None = None,
        dietary_restrictions: list[str] | None = None,
        preferred_activities: list[str] | None = None,
        emergency_contact: str = "",
        emergency_phone: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Create or update a wellness profile."""
        try:
            level_enum = ClassLevel(fitness_level)
        except ValueError:
            valid = ", ".join(lv.value for lv in ClassLevel)
            return {
                "status": "error",
                "message": f"Nivel '{fitness_level}' no válido. Opciones: {valid}",
            }

        # Validate activity types if provided
        if preferred_activities:
            valid_types = {at.value for at in ActivityType}
            invalid = [a for a in preferred_activities if a not in valid_types]
            if invalid:
                return {
                    "status": "error",
                    "message": f"Actividades no válidas: {', '.join(invalid)}",
                }

        updates = {
            "family_id": family_id,
            "family_name": family_name,
            "fitness_level": level_enum.value,
            "health_conditions": health_conditions or [],
            "allergies": allergies or [],
            "dietary_restrictions": dietary_restrictions or [],
            "preferred_activities": preferred_activities or [],
            "emergency_contact": emergency_contact,
            "emergency_phone": emergency_phone,
            "notes": notes,
        }

        existing = self.repo.get_profile_by_family(family_id)
        if existing:
            profile = self.repo.update_profile(existing.id, updates)
        else:
            profile = self.repo.create_profile(updates)

        return {
            "status": "success",
            "message": (
                f"✅ Perfil de bienestar {'actualizado' if existing else 'creado'} "
                f"para {family_name or family_id}. ¡Listo para entrenar! 💪"
            ),
            "data": profile.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 3: wellness_activity_log  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_activity_log",
        "Registrar una actividad de bienestar realizada.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_activity_log(
        self,
        family_id: str,
        member_name: str,
        activity_type: str,
        duration_minutes: int,
        description: str = "",
        calories_burned: int = 0,
        distance_km: float = 0.0,
        notes: str = "",
        date: str = "",
    ) -> dict[str, Any]:
        """Log a wellness activity."""
        try:
            at_enum = ActivityType(activity_type)
        except ValueError:
            valid = ", ".join(at.value for at in ActivityType)
            return {
                "status": "error",
                "message": f"Tipo de actividad '{activity_type}' no válido. Opciones: {valid}",
            }

        if duration_minutes <= 0:
            return {
                "status": "error",
                "message": "La duración debe ser mayor a cero minutos.",
            }

        activity = self.repo.log_activity({
            "family_id": family_id,
            "member_name": member_name,
            "activity_type": at_enum.value,
            "description": description,
            "duration_minutes": duration_minutes,
            "calories_burned": calories_burned,
            "distance_km": distance_km,
            "notes": notes,
            "date": date,
        })

        emoji_map = {
            "gym": "🏋️", "yoga": "🧘", "swimming": "🏊",
            "tennis": "🎾", "spa": "💆", "meditation": "🧠",
        }
        emoji = emoji_map.get(at_enum.value, "🏃")

        return {
            "status": "success",
            "message": (
                f"{emoji} ¡Actividad registrada! {member_name} - "
                f"{at_enum.value} por {duration_minutes} min. "
                f"{'🔥 ' + str(calories_burned) + ' cal quemadas!' if calories_burned else ''}"
            ),
            "data": activity.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 4: wellness_goal_set  🟡 SEMI-AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_goal_set",
        "Establecer un objetivo de bienestar para la familia.",
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def wellness_goal_set(
        self,
        family_id: str,
        goal_type: str,
        title: str,
        target_value: float,
        unit: str = "",
        description: str = "",
        target_date: str = "",
    ) -> dict[str, Any]:
        """Set a wellness goal."""
        try:
            gt_enum = WellnessGoalType(goal_type)
        except ValueError:
            valid = ", ".join(gt.value for gt in WellnessGoalType)
            return {
                "status": "error",
                "message": f"Tipo de objetivo '{goal_type}' no válido. Opciones: {valid}",
            }

        if target_value <= 0:
            return {
                "status": "error",
                "message": "El valor objetivo debe ser mayor a cero.",
            }

        goal = self.repo.create_goal({
            "family_id": family_id,
            "goal_type": gt_enum.value,
            "title": title,
            "description": description,
            "target_value": target_value,
            "current_value": 0.0,
            "unit": unit,
            "status": GoalStatus.ACTIVE.value,
            "target_date": target_date,
        })

        return {
            "status": "success",
            "message": (
                f'🎯 Objetivo "{title}" establecido: '
                f"{target_value} {unit}. ¡Tú puedes! 💪"
            ),
            "data": goal.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 5: wellness_goal_list  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_goal_list",
        "Listar los objetivos de bienestar de una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_goal_list(
        self,
        family_id: str,
        status: str = "",
    ) -> dict[str, Any]:
        """List wellness goals for a family."""
        status_filter = None
        if status:
            try:
                gs = GoalStatus(status)
                status_filter = gs.value
            except ValueError:
                valid = ", ".join(s.value for s in GoalStatus)
                return {
                    "status": "error",
                    "message": (
                        f"Estado '{status}' no válido. Opciones: {valid}"
                    ),
                }

        goals = self.repo.list_goals(family_id, status_filter)

        if not goals:
            return {
                "status": "success",
                "message": (
                    "📋 No hay objetivos de bienestar registrados."
                ),
                "data": [],
                "total": 0,
            }

        active = sum(1 for g in goals if g.status == GoalStatus.ACTIVE)
        return {
            "status": "success",
            "message": (
                f"🎯 {len(goals)} objetivo(s) encontrado(s). "
                f"{'⚡ ' + str(active) + ' activo(s).' if active else ''}"
            ),
            "data": [g.model_dump(mode="json") for g in goals],
            "total": len(goals),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: wellness_recommendations  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_recommendations",
        "Obtener recomendaciones de bienestar personalizadas.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_recommendations(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Get personalized wellness recommendations."""
        recs = self.repo.get_recommendations(family_id)

        if not recs:
            return {
                "status": "success",
                "message": (
                    "🌟 ¡Tu perfil de bienestar está completo! "
                    "Sigue así con tu rutina actual."
                ),
                "data": [],
                "total": 0,
            }

        high = sum(1 for r in recs if r.priority == "high")
        return {
            "status": "success",
            "message": (
                f"💡 {len(recs)} recomendaciones para ti. "
                f"{'⚡ ' + str(high) + ' de alta prioridad.' if high else ''}"
            ),
            "data": [r.model_dump(mode="json") for r in recs],
            "total": len(recs),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 6: wellness_schedule_class  🔴 HITL
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_schedule_class",
        "Agendar una clase o cita de bienestar. Requiere aprobación.",
        approval=ApprovalLevel.HITL,
    )
    async def wellness_schedule_class(
        self,
        class_id: str,
        family_id: str,
        member_name: str,
        date: str,
        time: str,
        notes: str = "",
    ) -> dict[str, Any]:
        """Schedule a wellness class appointment (HITL)."""
        cls = self.repo.get_class(class_id)
        if not cls:
            return {
                "status": "error",
                "message": f"No encontramos la clase con ID {class_id}. 🔍",
            }

        if cls.max_participants > 0 and cls.enrolled_count >= cls.max_participants:
            return {
                "status": "error",
                "message": (
                    f'La clase "{cls.name}" ya está llena '
                    f"({cls.enrolled_count}/{cls.max_participants}). 😔"
                ),
            }

        request = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="wellness_schedule_class",
            params={
                "class_id": class_id,
                "family_id": family_id,
                "member_name": member_name,
                "date": date,
                "time": time,
                "notes": notes,
            },
            requested_by="system",
            approval_level=ApprovalLevel.HITL,
        )

        return {
            "status": "pending_approval",
            "message": (
                f'📅 Cita para "{cls.name}" el {date} a las {time} '
                f"para {member_name}. Pendiente de aprobación. 🔔"
            ),
            "request_id": str(request.request_id),
            "class_name": cls.name,
            "member_name": member_name,
        }

    async def execute_schedule_class(
        self, params: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute class scheduling post-approval."""
        appointment = self.repo.create_appointment(params)
        cls = self.repo.get_class(params["class_id"])

        return {
            "status": "success",
            "message": (
                f'✨ ¡Cita agendada! {appointment.member_name} '
                f'en "{cls.name if cls else params["class_id"]}" '
                f"el {appointment.date} a las {appointment.time}. 🎉"
            ),
            "data": appointment.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 7: wellness_report  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_report",
        "Generar un reporte de bienestar para una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_report(
        self,
        family_id: str,
        date_from: str,
        date_to: str,
    ) -> dict[str, Any]:
        """Generate a wellness report for a family."""
        if not date_from or not date_to:
            return {
                "status": "error",
                "message": "Debe proporcionar fecha de inicio y fin.",
            }

        if date_from > date_to:
            return {
                "status": "error",
                "message": "La fecha de inicio debe ser anterior a la fecha de fin.",
            }

        report = self.repo.generate_report(family_id, date_from, date_to)

        return {
            "status": "success",
            "message": report.summary,
            "data": report.model_dump(mode="json"),
            "period": f"{date_from} a {date_to}",
        }

    # ─────────────────────────────────────────────────────────
    # Tool 9: wellness_predict  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_predict",
        "Predecir engagement y riesgo de churn de bienestar para una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_predict(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Predict wellness engagement and churn risk."""
        prediction = self.repo.compute_prediction(family_id)

        risk_emoji = {
            "low": "🟢",
            "medium": "🟡",
            "high": "🟠",
            "critical": "🔴",
        }
        emoji = risk_emoji.get(prediction.risk_level.value, "⚪")

        return {
            "status": "success",
            "message": (
                f"{emoji} Predicción: riesgo "
                f"{prediction.risk_level.value}, "
                f"engagement {prediction.engagement_score}/100, "
                f"tendencia {prediction.predicted_trend}."
            ),
            "data": prediction.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 10: wellness_anomalies  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_anomalies",
        "Detectar anomalías en los datos de bienestar de una familia.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_anomalies(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Detect wellness anomalies for a family."""
        response = self.repo.detect_anomalies(family_id)

        return {
            "status": "success",
            "message": response.summary,
            "data": response.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 11: wellness_correlate  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_correlate",
        "Analizar correlaciones cross-domain del bienestar: retención, revenue, satisfacción y ranking de actividades.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_correlate(
        self,
    ) -> dict[str, Any]:
        """Compute cross-domain wellness correlations (club-wide)."""
        response = self.repo.compute_correlations()

        total_segments = len(response.segment_insights)
        total_activities = len(response.activity_value_ranking)

        # Find strongest correlation
        strongest = max(
            response.correlations.values(),
            key=lambda c: abs(c.coefficient),
            default=None,
        )
        if strongest and abs(strongest.coefficient) > 0:
            strongest_label = (
                f"Correlación más fuerte: "
                f"{strongest.coefficient:.2f} "
                f"({strongest.significance})"
            )
        else:
            strongest_label = (
                "Datos insuficientes para correlaciones"
            )

        return {
            "status": "success",
            "message": (
                f"🔗 Análisis cross-domain: "
                f"{strongest_label}. "
                f"{total_segments} segmentos, "
                f"{total_activities} actividades rankeadas."
            ),
            "data": response.model_dump(mode="json"),
        }

    # ─────────────────────────────────────────────────────────
    # Tool 12: wellness_insights  🟢 AUTO
    # ─────────────────────────────────────────────────────────

    @MCPTool(
        "wellness_insights",
        "Generar análisis integral de bienestar para una familia: score, hallazgos, tendencias, predicciones y acciones críticas.",
        approval=ApprovalLevel.AUTO,
    )
    async def wellness_insights(
        self,
        family_id: str,
    ) -> dict[str, Any]:
        """Generate comprehensive wellness insights for a family."""
        response = self.repo.compute_insights(family_id)

        critical = len(response.critical_insights)
        findings = len(response.key_findings)

        if critical > 0:
            alert = f" ⚠️ {critical} acción(es) crítica(s)."
        else:
            alert = ""

        return {
            "status": "success",
            "message": (
                f"🧠 Insights: score "
                f"{response.health_score:.0f}/100, "
                f"{findings} hallazgos.{alert}"
            ),
            "data": response.model_dump(mode="json"),
        }
