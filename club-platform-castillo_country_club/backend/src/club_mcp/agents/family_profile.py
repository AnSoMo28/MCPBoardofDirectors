"""
FamilyProfileAgent: Gestion de perfiles familiares.
Club: Castillo Country Club (club de montana)

TOOLS (16):
  family_get_profile              🟢 AUTO        Consulta perfil
  family_create_profile           🔴 HITL        Crear membresia
  family_update_members           🔴 HITL        Agregar/quitar miembros
  family_set_preferences          🟡 SEMI-AUTO   Actualizar preferencias
  family_get_activity_hist        🟢 AUTO        Historial de actividades
  family_search                   🟢 AUTO        Buscar familias
  family_get_social_graph         🟢 AUTO        Grafo social
  family_update_profile           🟡 SEMI-AUTO   Actualizar perfil (NEW)
  family_predict_churn            🟢 AUTO        Prediccion churn (NEW)
  family_recommend_activities     🟢 AUTO        Recomendar actividades (NEW)
  family_social_match             🟢 AUTO        Coincidencias sociales (NEW)
  family_engagement_plan          🟢 AUTO        Plan de engagement (NEW)
  family_lifecycle_analysis       🟢 AUTO        Analisis ciclo vida (NEW)
  family_360_insight              🟢 AUTO        Inteligencia 360 (NEW)
  family_social_graph_enriched    🟢 AUTO        Grafo social enriquecido (NEW)
  family_milestone_tracker        🟢 AUTO        Tracker de hitos (NEW)
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any
from uuid import UUID

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.ai.prompts import AGENT_SYSTEM_PROMPTS, MESSAGE_TEMPLATES
from club_mcp.db.repositories.family_repo import (
    DuplicateFamilyError,
    FamilyRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.family import (
    ActivityRecommendation,
    ChurnFactor,
    CrossDomainCorrelation,
    DomainScore,
    EngagementPlanAction,
    EnrichedSocialConnection,
    Family360Insight,
    FamilyActivityRecommendations,
    FamilyChurnPrediction,
    FamilyCreate,
    FamilyEngagementPlan,
    FamilyLifecycleAnalysis,
    FamilyMilestone,
    FamilySearchParams,
    FamilySocialGraphEnriched,
    LifecycleRecommendation,
    LifecycleStage,
    MembershipTier,
    MilestoneTrackerResponse,
    RecommendationContext,
    SocialGraphCluster,
    SocialMatchResponse,
    SocialMatchSuggestion,
    SuggestedConnection,
)
from club_mcp.models.member import (
    AgeGroup,
    MemberCreate,
    MemberRole,
    compute_age,
    compute_age_group,
)


logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────
# CONSTANTS — Activity & Demographic Maps
# ──────────────────────────────────────────────────

AGE_ACTIVITY_MAP: dict[AgeGroup, list[str]] = {
    AgeGroup.TODDLER: ["Clase de natación infantil", "Mini deportes", "Taller de arte"],
    AgeGroup.KIDS: ["Natación", "Fútbol", "Tennis junior", "Campamento de verano", "Arte y manualidades"],
    AgeGroup.TEENS: ["Pádel junior", "Natación competitiva", "Yoga teens", "Senderismo", "Eventos sociales juveniles"],
    AgeGroup.YOUNG: ["Pádel", "Tenis", "Golf", "CrossFit", "Spinning", "Eventos gastronómicos"],
    AgeGroup.ADULT: ["Pádel", "Golf", "Tenis", "Yoga", "Gastronomía", "Vinos", "Spa & Wellness"],
    AgeGroup.SENIOR: ["Yoga suave", "Caminata guiada", "Aquaerobics", "Lectura", "Masajes terapéuticos"],
}

INTEREST_ACTIVITY_MAP: dict[str, list[str]] = {
    "Pádel": ["Torneo de pádel", "Clase de pádel", "Pádel mixto"],
    "Tenis": ["Torneo de tenis", "Clase de tenis", "Dobles de tenis"],
    "Golf": ["Ronda de golf", "Clínica de golf", "Torneo scramble"],
    "Natación": ["Clase de natación", "Aquaerobics", "Competencia de natación"],
    "Yoga": ["Clase de yoga", "Retiro de yoga", "Meditación guiada"],
    "Gastronomía": ["Cena temática", "Clase de cocina", "Maridaje"],
    "Vinos": ["Cata de vinos", "Cena maridaje", "Club de vinos"],
    "Eventos sociales": ["Cena de socios", "Fiesta temática", "Brunch dominical"],
    "Actividades infantiles": ["Campamento", "Fiesta infantil", "Taller de arte"],
    "Spa & Wellness": ["Masaje", "Facial", "Tratamiento corporal"],
    "Senderismo": ["Caminata ecológica", "Tour de montaña", "Observación de aves"],
    "Lectura": ["Club de lectura", "Charla literaria", "Taller de escritura"],
}

WELLNESS_ACTIVITIES = [
    "Masaje deportivo", "Yoga restaurativo", "Spa day package",
    "Evaluación fitness", "Plan nutricional",
]

LIFECYCLE_THRESHOLDS = {
    "onboarding_days": 90,
    "growing_max_days": 365,
    "plateau_min_engagement": 40,
    "plateau_max_engagement": 70,
    "at_risk_max_engagement": 40,
    "dormant_inactive_days": 180,
}

AGE_GROUP_TRANSITIONS: dict[int, AgeGroup] = {
    5: AgeGroup.KIDS,
    12: AgeGroup.TEENS,
    18: AgeGroup.YOUNG,
    31: AgeGroup.ADULT,
    60: AgeGroup.SENIOR,
}


def _next_annual_occurrence(anniversary: date, today: date) -> date:
    try:
        occurrence = date(today.year, anniversary.month, anniversary.day)
    except ValueError:
        occurrence = date(today.year, anniversary.month, anniversary.day - 1)

    if occurrence < today:
        try:
            occurrence = date(today.year + 1, anniversary.month, anniversary.day)
        except ValueError:
            occurrence = date(today.year + 1, anniversary.month, anniversary.day - 1)
    return occurrence


class FamilyProfileAgent(BaseAgent):
    """
    Guardian de las familias de Castillo Country Club.
    16 tools: 7 CRUD + 1 update + 8 intelligence.
    """

    agent_name: str = "family_profile"
    description: str = "Gestion de perfiles familiares e inteligencia"

    def __init__(
        self,
        repo: FamilyRepository | None = None,
        approval_engine: Any | None = None,
        notifier: Any | None = None,
        rag_service: Any | None = None,
    ) -> None:
        super().__init__()
        self.repo = repo or FamilyRepository()
        # P2-C3h B0 (F-2): acepta el engine compartido del composition root
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self.rag_service = rag_service
        self.system_prompt = AGENT_SYSTEM_PROMPTS.get("family_profile", "")

    def _register_tools(self) -> None:
        pass

    # ──────────────────────────────────────────────
    # RAG HELPERS
    # ──────────────────────────────────────────────

    async def _enrich_with_rag_context(
        self, query: str, max_results: int = 3,
    ) -> list[dict]:
        if not self.rag_service:
            return []
        try:
            results = await self.rag_service.search_documents(
                query=query, max_results=max_results, access_level="internal",
            )
            return results
        except Exception as exc:
            logger.warning("[family_profile] RAG enrichment failed: %s", exc)
            return []

    def _format_rag_citations(self, results: list[dict]) -> str:
        if not results:
            return ""
        parts = []
        for r in results[:3]:
            source = r.get("source", "documento")
            score = r.get("score", 0)
            parts.append(f"[{source} (relevancia: {score:.0%})]")
        return " ".join(parts)

    # ══════════════════════════════════════════════
    # EXISTING TOOLS (7) — con fixes
    # ══════════════════════════════════════════════

    @MCPTool(
        name="family_get_profile",
        description=(
            "Obtiene el perfil completo de una familia incluyendo "
            "todos sus miembros, preferencias y datos de contacto. "
            "Usar cuando alguien pregunta por una familia especifica."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_family_profile(self, family_id: str) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {
                "status": "not_found",
                "message": f"No encontramos una familia con ID {family_id}. "
                "¿Puedes verificar el nombre o ID?",
            }

        preferences = await self.repo.get_preferences(uid)

        return {
            "status": "success",
            "family": family.model_dump(mode="json"),
            "preferences": preferences,
            "message": (
                f"Perfil de la familia {family.name}. "
                f"{family.member_count} miembros, "
                f"miembros desde {family.join_date.strftime('%B %Y')}."
            ),
        }

    @MCPTool(
        name="family_create_profile",
        description=(
            "Crea el perfil de una nueva familia y su solicitud de membresia. "
            "REQUIERE APROBACION HUMANA."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin", "membership_committee"],
    )
    async def create_family_profile(
        self,
        family_name: str,
        tier: str,
        email: str,
        phone: str,
        primary_member_name: str,
        primary_member_dob: str,
        address: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        try:
            MembershipTier(tier.lower())
        except ValueError:
            return {
                "status": "error",
                "message": f"Tipo de membresia no valido: '{tier}'. "
                f"Opciones: basic, premium, vip.",
            }

        try:
            date.fromisoformat(primary_member_dob)
        except (ValueError, TypeError):
            return {
                "status": "error",
                "message": "Fecha de nacimiento no valida. Formato: AAAA-MM-DD.",
            }

        if await self.repo.family_exists_by_email(email):
            return {
                "status": "error",
                "message": f"Ya existe una familia registrada con el email {email}.",
            }

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="family_create_profile",
            params={
                "family_name": family_name,
                "tier": tier,
                "email": email,
                "phone": phone,
                "primary_member_name": primary_member_name,
                "primary_member_dob": primary_member_dob,
                "address": address,
                "notes": notes,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=f"Nueva membresia: {family_name} (tier: {tier}). Contacto: {email}, {phone}",
            estimated_impact="Nuevas cuotas mensuales a generar",
            affected_count=1,
            approver_roles=["admin", "membership_committee"],
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": MESSAGE_TEMPLATES["family_created_pending"].format(family_name=family_name),
            "details": {
                "family_name": family_name,
                "tier": tier,
                "email": email,
                "phone": phone,
                "primary_member": primary_member_name,
            },
        }

    async def execute_create_family(
        self,
        family_name: str,
        tier: str,
        email: str,
        phone: str,
        primary_member_name: str,
        primary_member_dob: str,
        address: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        try:
            family_data = FamilyCreate(
                name=family_name,
                tier=MembershipTier(tier.lower()),
                email=email,
                phone=phone,
                address=address or None,
                notes=notes or None,
                members=[
                    MemberCreate(
                        name=primary_member_name,
                        date_of_birth=date.fromisoformat(primary_member_dob),
                        role=MemberRole.PRIMARY,
                        email=email,
                        phone=phone,
                        allergies=None,
                        dietary_restrictions=None,
                    )
                ],
            )
            family = await self.repo.create_family(family_data)
            logger.info("[family_profile] Family created: %s (%s)", family.name, family.id)
            return {
                "status": "created",
                "family": family.model_dump(mode="json"),
                "message": MESSAGE_TEMPLATES["family_created_approved"].format(family_name=family.name),
            }
        except DuplicateFamilyError as e:
            return {"status": "error", "message": f"Ya existe una familia con ese {e.field}."}
        except Exception:
            logger.exception("[family_profile] Error creating family")
            return {"status": "error", "message": "Hubo un problema al crear la familia."}

    @MCPTool(
        name="family_update_members",
        description=(
            "Agrega o remueve miembros de una familia existente. "
            "REQUIERE APROBACION HUMANA."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def update_family_members(
        self,
        family_id: str,
        action: str,
        member_name: str,
        member_dob: str = "",
        member_role: str = "child",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        if action not in ("add", "remove"):
            return {"status": "error", "message": f"Accion no valida: '{action}'. Usa 'add' o 'remove'."}

        if action == "add":
            try:
                date.fromisoformat(member_dob)
            except (ValueError, TypeError):
                return {"status": "error", "message": "Fecha de nacimiento requerida para agregar. Formato: AAAA-MM-DD."}

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="family_update_members",
            params={
                "family_id": family_id,
                "action": action,
                "member_name": member_name,
                "member_dob": member_dob,
                "member_role": member_role,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=f"{'Agregar' if action == 'add' else 'Remover'} miembro '{member_name}' de familia '{family.name}'",
            estimated_impact="Cambio en composicion de membresia y cobros",
            affected_count=1,
            approver_roles=["admin"],
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"La solicitud para {action} a {member_name} "
                f"{'a' if action == 'add' else 'de'} la familia {family.name} "
                f"esta siendo revisada."
            ),
        }

    async def execute_update_members(
        self,
        family_id: str,
        action: str,
        member_name: str,
        member_dob: str = "",
        member_role: str = "child",
    ) -> dict[str, Any]:
        uid = UUID(family_id)
        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "error", "message": "Familia no encontrada"}

        if action == "add":
            member = await self.repo.add_member(
                uid,
                MemberCreate(
                    name=member_name,
                    date_of_birth=date.fromisoformat(member_dob),
                    role=MemberRole(member_role),
                    email=None,
                    phone=None,
                    allergies=None,
                    dietary_restrictions=None,
                ),
            )
            return {
                "status": "success",
                "message": MESSAGE_TEMPLATES["member_added"].format(
                    family_name=family.name, member_name=member_name,
                ),
                "member": member.model_dump(mode="json"),
            }

        members = await self.repo.get_members(uid)
        target = next((m for m in members if m.name == member_name), None)
        if not target:
            return {"status": "error", "message": f"No encontramos a '{member_name}' en la familia {family.name}"}

        await self.repo.remove_member(target.id)
        return {
            "status": "success",
            "message": MESSAGE_TEMPLATES["member_removed"].format(
                family_name=family.name, member_name=member_name,
            ),
        }

    @MCPTool(
        name="family_set_preferences",
        description=(
            "Actualiza las preferencias de una familia "
            "(idioma, canales de notificacion, intereses, etc.)."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def set_family_preferences(
        self,
        family_id: str,
        preferred_language: str = "es",
        notification_channels: str = "email,push",
        interests: str = "",
        privacy_level: str = "normal",
        dietary_notes: str = "",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        valid_privacy_levels = {"open", "normal", "private", "restricted"}
        if privacy_level and privacy_level not in valid_privacy_levels:
            return {
                "status": "error",
                "message": (
                    f"Nivel de privacidad '{privacy_level}' no valido. "
                    f"Opciones: {', '.join(sorted(valid_privacy_levels))}"
                ),
            }

        channels = [c.strip() for c in notification_channels.split(",") if c.strip()]
        interest_list = [i.strip() for i in interests.split(",") if i.strip()]

        prefs = {
            "preferred_language": preferred_language,
            "notification_channels": channels,
            "interests": interest_list,
            "privacy_level": privacy_level,
            "dietary_notes": dietary_notes or None,
        }

        await self.repo.set_preferences(uid, prefs)
        logger.info("[family_profile] Preferences updated for %s", family.name)

        return {
            "status": "success",
            "preferences": prefs,
            "message": MESSAGE_TEMPLATES["preferences_updated"].format(family_name=family.name),
        }

    @MCPTool(
        name="family_get_activity_history",
        description=(
            "Obtiene el historial de actividades y eventos de una familia. "
            "Puede filtrar por rango de fechas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_activity_history(
        self,
        family_id: str,
        date_from: str = "",
        date_to: str = "",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        d_from = None
        d_to = None
        try:
            if date_from:
                d_from = date.fromisoformat(date_from)
            if date_to:
                d_to = date.fromisoformat(date_to)
        except ValueError:
            return {"status": "error", "message": "Formato de fecha invalido. Usa: AAAA-MM-DD."}

        activities = await self.repo.get_activity_history(uid, d_from, d_to)

        return {
            "status": "success",
            "family_id": str(uid),
            "family_name": family.name,
            "activities": activities,
            "total": len(activities),
            "period": {"from": date_from or "inicio", "to": date_to or "presente"},
            "message": f"La familia {family.name} ha participado en {len(activities)} actividades.",
        }

    @MCPTool(
        name="family_search",
        description=(
            "Busca familias por nombre, email, tier de membresia, "
            "grupo etario de sus miembros, o nivel de engagement."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def search_families(
        self,
        query: str = "",
        tier: str = "",
        age_group: str = "",
        engagement_min: int = 0,
        limit: int = 50,
    ) -> dict[str, Any]:
        parsed_tier = None
        parsed_age_group = None

        if tier:
            try:
                parsed_tier = MembershipTier(tier)
            except ValueError:
                return {
                    "status": "error",
                    "message": f"Tier no valido: '{tier}'. Opciones: basic, premium, vip.",
                }

        if age_group:
            try:
                parsed_age_group = AgeGroup(age_group)
            except ValueError:
                valid = ", ".join(a.value for a in AgeGroup)
                return {
                    "status": "error",
                    "message": f"Grupo etario no valido: '{age_group}'. Opciones: {valid}.",
                }

        params = FamilySearchParams(
            query=query or None,
            tier=parsed_tier,
            age_group=parsed_age_group,
            engagement_min=engagement_min if engagement_min > 0 else None,
            engagement_max=None,
            limit=limit,
            offset=0,
        )

        result = await self.repo.search_families(params)

        return {
            "status": "success",
            "families": [f.model_dump(mode="json") for f in result.families],
            "total": result.total,
            "message": f"Encontre {result.total} familias que coinciden con tu busqueda.",
        }

    @MCPTool(
        name="family_get_social_graph",
        description=(
            "Obtiene el grafo social de una familia: "
            "con que otras familias suelen compartir actividades."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_social_graph(self, family_id: str) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        connections = await self.repo.get_social_connections(uid)

        return {
            "status": "success",
            "family_id": str(uid),
            "family_name": family.name,
            "connections": connections,
            "total_connections": len(connections),
            "message": f"La familia {family.name} tiene {len(connections)} conexiones sociales activas.",
        }

    # ══════════════════════════════════════════════
    # NEW CRUD TOOL (1)
    # ══════════════════════════════════════════════

    @MCPTool(
        name="family_update_profile",
        description=(
            "Actualiza los datos del perfil de una familia "
            "(nombre, tier, email, telefono, direccion, notas). "
            "SEMI-AUTO: ejecuta directamente pero notifica al admin."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def update_family_profile(
        self,
        family_id: str,
        name: str = "",
        tier: str = "",
        email: str = "",
        phone: str = "",
        address: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        parsed_tier = None
        if tier:
            try:
                parsed_tier = MembershipTier(tier.lower())
            except ValueError:
                return {
                    "status": "error",
                    "message": f"Tier no valido: '{tier}'. Opciones: basic, premium, vip.",
                }

        try:
            updated = await self.repo.update_family(
                uid,
                name=name or None,
                tier=parsed_tier,
                email=email or None,
                phone=phone or None,
                address=address or None,
                notes=notes or None,
            )
            logger.info("[family_profile] Profile updated for %s", updated.name)
            return {
                "status": "success",
                "family": updated.model_dump(mode="json"),
                "message": f"Perfil de {updated.name} actualizado correctamente.",
            }
        except DuplicateFamilyError:
            return {"status": "error", "message": f"Ya existe una familia con el email {email}."}
        except Exception:
            logger.exception("[family_profile] Error updating profile")
            return {"status": "error", "message": "Error al actualizar el perfil."}

    # ══════════════════════════════════════════════
    # INTELLIGENCE TOOLS (8) — AUTO approval
    # ══════════════════════════════════════════════

    @MCPTool(
        name="family_predict_churn",
        description=(
            "Predice el riesgo de cancelacion de una familia basado en "
            "engagement, actividad, tenure y señales financieras."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def predict_churn(
        self, family_id: str, dashboard_context: str = "",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        prediction = await self._compute_churn_prediction(family, dashboard_context)

        rag_context = await self._enrich_with_rag_context(
            f"retencion de socios club privado Costa Rica churn prediction {family.tier.value}"
        )

        return {
            "status": "success",
            "data": prediction.model_dump(mode="json"),
            "rag_citations": self._format_rag_citations(rag_context),
            "message": (
                f"Riesgo de churn para {family.name}: {prediction.risk_level} "
                f"(score: {prediction.risk_score}/100). "
                f"Confianza: {prediction.confidence:.0%}."
            ),
        }

    @MCPTool(
        name="family_recommend_activities",
        description=(
            "Recomienda actividades para una familia basado en "
            "intereses, demografia e historial."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def recommend_activities(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        result = await self._compute_activity_recommendations(family)

        return {
            "status": "success",
            "data": result.model_dump(mode="json"),
            "message": f"{len(result.recommendations)} actividades recomendadas para {family.name}.",
        }

    @MCPTool(
        name="family_social_match",
        description=(
            "Encuentra familias compatibles basado en intereses, "
            "demografia y actividades compartidas."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def social_match(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        result = await self._compute_social_matches(family)

        return {
            "status": "success",
            "data": result.model_dump(mode="json"),
            "message": f"{len(result.suggestions)} coincidencias sociales encontradas para {family.name}.",
        }

    @MCPTool(
        name="family_engagement_plan",
        description=(
            "Genera un plan de engagement personalizado con acciones "
            "concretas, prioridades, timing y ROI estimado."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def engagement_plan(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        plan = await self._compute_engagement_plan(family)

        rag_context = await self._enrich_with_rag_context(
            f"plan engagement retencion club privado Costa Rica {family.tier.value}"
        )

        return {
            "status": "success",
            "data": plan.model_dump(mode="json"),
            "rag_citations": self._format_rag_citations(rag_context),
            "message": (
                f"Plan de engagement para {family.name}: "
                f"{plan.current_score} → {plan.target_score} en {plan.timeframe}."
            ),
        }

    @MCPTool(
        name="family_lifecycle_analysis",
        description=(
            "Analiza en que etapa del ciclo de vida se encuentra la familia "
            "y predice la siguiente transicion."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def lifecycle_analysis(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        analysis = await self._compute_lifecycle_analysis(family)

        return {
            "status": "success",
            "data": analysis.model_dump(mode="json"),
            "message": (
                f"{family.name} esta en etapa '{analysis.current_stage.value}'. "
                f"Siguiente transicion: {analysis.next_transition}."
            ),
        }

    @MCPTool(
        name="family_360_insight",
        description=(
            "Genera una vista 360 de la familia cruzando datos de "
            "engagement, actividad, conexiones sociales y señales financieras."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def family_360_insight(
        self, family_id: str, dashboard_context: str = "",
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        insight = await self._compute_360_insight(family, dashboard_context)

        rag_context = await self._enrich_with_rag_context(
            "analisis integral familia club privado engagement finanzas social"
        )

        return {
            "status": "success",
            "data": insight.model_dump(mode="json"),
            "rag_citations": self._format_rag_citations(rag_context),
            "message": (
                f"Score 360 de {family.name}: {insight.overall_score}/100. "
                f"Top insight: {insight.top_insights[0] if insight.top_insights else 'N/A'}."
            ),
        }

    @MCPTool(
        name="family_social_graph_enriched",
        description=(
            "Obtiene el grafo social enriquecido con datos de actividades "
            "compartidas, clusters y conexiones sugeridas por AI."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def social_graph_enriched(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        result = await self._compute_enriched_graph(family)

        return {
            "status": "success",
            "data": result.model_dump(mode="json"),
            "message": (
                f"Grafo social de {family.name}: {result.total_connections} conexiones, "
                f"{len(result.clusters)} clusters, {len(result.suggested_connections)} sugerencias."
            ),
        }

    @MCPTool(
        name="family_milestone_tracker",
        description=(
            "Rastrea hitos proximos de la familia: aniversarios, "
            "cumpleaños, transiciones de edad y logros."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def milestone_tracker(
        self, family_id: str,
    ) -> dict[str, Any]:
        try:
            uid = UUID(family_id)
        except ValueError:
            return {"status": "error", "message": f"ID de familia invalido: {family_id}"}

        family = await self.repo.get_family(uid)
        if not family:
            return {"status": "not_found", "message": f"No encontramos la familia con ID {family_id}."}

        result = await self._compute_milestones(family)

        return {
            "status": "success",
            "data": result.model_dump(mode="json"),
            "message": (
                f"{len(result.upcoming)} hitos proximos para {family.name}. "
                f"{len(result.suggestions)} sugerencias de celebracion."
            ),
        }

    # ══════════════════════════════════════════════
    # INTELLIGENCE COMPUTATION HELPERS
    # ══════════════════════════════════════════════

    async def _compute_churn_prediction(
        self, family: Any, dashboard_context: str = "",
    ) -> FamilyChurnPrediction:
        today = date.today()
        tenure_days = (today - family.join_date).days
        engagement = family.engagement_score
        factors: list[ChurnFactor] = []
        risk_points = 0

        # Factor 1: Engagement level
        if engagement < 30:
            factors.append(ChurnFactor(name="Engagement crítico", impact=8.0, direction="negative",
                detail=f"Engagement de {engagement}/100 indica desconexion severa."))
            risk_points += 8
        elif engagement < 50:
            factors.append(ChurnFactor(name="Engagement bajo", impact=5.0, direction="negative",
                detail=f"Engagement de {engagement}/100 esta por debajo del promedio de club privado CR (65)."))
            risk_points += 5
        elif engagement < 70:
            factors.append(ChurnFactor(name="Engagement moderado", impact=2.0, direction="negative",
                detail=f"Engagement de {engagement}/100. Area de mejora."))
            risk_points += 2
        else:
            factors.append(ChurnFactor(name="Engagement saludable", impact=-2.0, direction="positive",
                detail=f"Engagement de {engagement}/100 indica conexion activa con el club."))
            risk_points -= 2

        # Factor 2: Activity recency
        activities = await self.repo.get_activity_history(family.id)
        if activities:
            dates = []
            for a in activities:
                d = a.get("event_date", "")
                if isinstance(d, str) and d:
                    dates.append(date.fromisoformat(d))
                elif isinstance(d, date):
                    dates.append(d)
            if dates:
                days_since_last = (today - max(dates)).days
                if days_since_last > 60:
                    factors.append(ChurnFactor(name="Inactividad reciente", impact=6.0, direction="negative",
                        detail=f"{days_since_last} dias sin actividad. Benchmark CR: familias activas participan cada 21 dias."))
                    risk_points += 6
                elif days_since_last > 30:
                    factors.append(ChurnFactor(name="Actividad decreciente", impact=3.0, direction="negative",
                        detail=f"{days_since_last} dias desde ultima actividad."))
                    risk_points += 3
                else:
                    factors.append(ChurnFactor(name="Actividad regular", impact=-1.5, direction="positive",
                        detail=f"Ultima actividad hace {days_since_last} dias. Participacion activa."))
                    risk_points -= 1
        else:
            factors.append(ChurnFactor(name="Sin historial", impact=4.0, direction="negative",
                detail="Sin registro de actividades. Difícil medir engagement real."))
            risk_points += 4

        # Factor 3: Tenure vulnerability
        if tenure_days < 180 and engagement < 60:
            factors.append(ChurnFactor(name="Onboarding incompleto", impact=4.0, direction="negative",
                detail=f"Familia nueva ({tenure_days} dias) con engagement bajo. 40% del churn ocurre en los primeros 6 meses."))
            risk_points += 4
        elif tenure_days > 730:
            factors.append(ChurnFactor(name="Lealtad establecida", impact=-3.0, direction="positive",
                detail=f"{tenure_days // 365}+ años como socio. La retencion a largo plazo en CR es >90%."))
            risk_points -= 3

        # Factor 4: Social isolation
        connections = await self.repo.get_social_connections(family.id)
        if len(connections) < 2:
            factors.append(ChurnFactor(name="Aislamiento social", impact=3.0, direction="negative",
                detail=f"Solo {len(connections)} conexion(es) social(es). El apoyo social reduce churn 35%."))
            risk_points += 3

        # Factor 5: Family tier context
        if family.tier == MembershipTier.VIP:
            factors.append(ChurnFactor(name="Alto valor", impact=-2.0, direction="positive",
                detail="Familia VIP con alto LTV. La atencion personalizada es clave."))
            risk_points -= 2

        # Compute score (higher = lower risk)
        risk_score = max(0, min(100, 100 - risk_points * 8))

        if risk_score >= 75:
            risk_level = "low"
        elif risk_score >= 50:
            risk_level = "medium"
        elif risk_score >= 30:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Recommendation
        if risk_level == "critical":
            recommendation = f"Contactar a {family.name} inmediatamente. Llamada personal del gerente esta semana. Propuesta: experiencia personalizada de re-engagement."
        elif risk_level == "high":
            recommendation = f"Programar touchpoint con {family.name}. Invitar a evento exclusivo o actividad que coincida con sus intereses."
        elif risk_level == "medium":
            recommendation = f"Mantener engagement de {family.name} con comunicaciones personalizadas y nuevas actividades."
        else:
            recommendation = f"{family.name} esta bien. Mantener el nivel actual de servicio y buscar oportunidades de cross-sell."

        # Confidence
        data_points = 2  # engagement + tenure (always available)
        if activities:
            data_points += 1
        if connections:
            data_points += 1
        if dashboard_context:
            data_points += 1
        confidence = min(1.0, data_points / 5)

        return FamilyChurnPrediction(
            risk_score=risk_score,
            risk_level=risk_level,
            factors=factors,
            recommendation=recommendation,
            confidence=confidence,
        )

    async def _compute_activity_recommendations(
        self, family: Any,
    ) -> FamilyActivityRecommendations:
        members = await self.repo.get_members(family.id)
        preferences = await self.repo.get_preferences(family.id)
        activities = await self.repo.get_activity_history(family.id)

        # Collect interests
        interests = preferences.get("interests", [])

        # Collect age groups
        age_groups = set()
        member_names_by_group: dict[AgeGroup, list[str]] = {}
        for m in members:
            ag = compute_age_group(m.date_of_birth)
            age_groups.add(ag)
            member_names_by_group.setdefault(ag, []).append(m.name)

        # Past activity types
        past_types = set()
        for a in activities:
            past_types.add(a.get("event_type", ""))

        # Generate recommendations
        seen = set()
        recs: list[ActivityRecommendation] = []
        rec_id = 0

        # From interests
        for interest in interests:
            for activity_name in INTEREST_ACTIVITY_MAP.get(interest, []):
                if activity_name not in seen:
                    seen.add(activity_name)
                    rec_id += 1
                    target = []
                    for ag, names in member_names_by_group.items():
                        if interest in ["Actividades infantiles"] and ag in (AgeGroup.TODDLER, AgeGroup.KIDS):
                            target.extend(names)
                        elif interest not in ["Actividades infantiles"]:
                            target.extend(names[:2])

                    recs.append(ActivityRecommendation(
                        id=f"act-{rec_id:03d}",
                        activity_name=activity_name,
                        category=interest,
                        match_score=85 + (rec_id % 10),
                        reason=f"Basado en interes declarado: {interest}",
                        target_members=target[:3] or [members[0].name],
                        estimated_engagement=75 + (rec_id % 15),
                        scheduling_suggestion="Fines de semana" if "famil" in interest.lower() else "Entre semana",
                    ))

        # From demographics
        for ag in age_groups:
            for activity_name in AGE_ACTIVITY_MAP.get(ag, []):
                if activity_name not in seen:
                    seen.add(activity_name)
                    rec_id += 1
                    target = member_names_by_group.get(ag, [])[:2]

                    recs.append(ActivityRecommendation(
                        id=f"act-{rec_id:03d}",
                        activity_name=activity_name,
                        category=f"Demografía ({ag.value})",
                        match_score=70 + (rec_id % 15),
                        reason=f"Recomendado para grupo etario: {ag.value}",
                        target_members=target or [members[0].name],
                        estimated_engagement=65 + (rec_id % 20),
                        scheduling_suggestion="Flexible",
                    ))

        # Wellness for all (if not already covered)
        if not any("Wellness" in k or "Spa" in k or "Yoga" in k for k in seen):
            rec_id += 1
            recs.append(ActivityRecommendation(
                id=f"act-{rec_id:03d}",
                activity_name="Paquete Spa & Wellness",
                category="Wellness",
                match_score=65,
                reason="Bienestar general — recomendado para todas las familias",
                target_members=[members[0].name] if members else [],
                estimated_engagement=60,
                scheduling_suggestion="Findes de semana o dias festivos",
            ))

        demographics = [f"{ag.value}: {len(names)} miembro(s)" for ag, names in member_names_by_group.items()]
        history = [t for t in past_types if t]

        return FamilyActivityRecommendations(
            recommendations=recs[:8],
            based_on=RecommendationContext(
                interests=interests,
                demographics=demographics,
                history=history,
            ),
        )

    async def _compute_social_matches(
        self, family: Any,
    ) -> SocialMatchResponse:
        all_families = await self.repo.get_all_families()
        preferences = await self.repo.get_preferences(family.id)
        connections = await self.repo.get_social_connections(family.id)
        connected_ids = {c.get("connected_family_id", "") for c in connections}

        family_interests = set(preferences.get("interests", []))
        family_members = await self.repo.get_members(family.id)
        family_age_groups = {compute_age_group(m.date_of_birth) for m in family_members}

        suggestions: list[SocialMatchSuggestion] = []

        for other in all_families:
            if other.id == family.id:
                continue
            if str(other.id) in connected_ids:
                continue

            other_prefs = await self.repo.get_preferences(other.id)
            other_interests = set(other_prefs.get("interests", []))
            other_members = await self.repo.get_members(other.id)
            other_age_groups = {compute_age_group(m.date_of_birth) for m in other_members}

            shared_interests = family_interests & other_interests
            shared_demographics = family_age_groups & other_age_groups

            if not shared_interests and not shared_demographics:
                continue

            score = min(100, len(shared_interests) * 25 + len(shared_demographics) * 15)

            if score < 25:
                continue

            suggested_activity = "Evento social del club"
            if shared_interests:
                first_interest = next(iter(shared_interests))
                activities = INTEREST_ACTIVITY_MAP.get(first_interest, [])
                if activities:
                    suggested_activity = activities[0]

            tier_display = other.tier.value if hasattr(other.tier, 'value') else str(other.tier)

            suggestions.append(SocialMatchSuggestion(
                family_id=str(other.id),
                family_name=other.name,
                tier=tier_display,
                match_score=score,
                common_interests=list(shared_interests)[:4],
                shared_demographics=[d.value if hasattr(d, 'value') else str(d) for d in shared_demographics][:3],
                reason=(
                    f"Comparten {len(shared_interests)} interes(es) y "
                    f"{len(shared_demographics)} grupo(s) etario(s)."
                ),
                suggested_activity=suggested_activity,
            ))

        suggestions.sort(key=lambda s: s.match_score, reverse=True)
        return SocialMatchResponse(suggestions=suggestions[:5])

    async def _compute_engagement_plan(
        self, family: Any,
    ) -> FamilyEngagementPlan:
        current_score = family.engagement_score
        target_score = min(100, current_score + 20)
        preferences = await self.repo.get_preferences(family.id)

        actions: list[EngagementPlanAction] = []
        action_id = 0

        # Communication action
        action_id += 1
        channels = preferences.get("notification_channels", ["email"])
        actions.append(EngagementPlanAction(
            id=f"ep-{action_id:03d}",
            action=f"Enviar comunicacion personalizada via {', '.join(channels[:2])}",
            category="communication",
            priority="high" if current_score < 50 else "medium",
            timing="Esta semana",
            expected_impact="+5 pts engagement",
            assigned_to="Equipo de comunicaciones",
        ))

        # Activity action
        action_id += 1
        interests = preferences.get("interests", [])
        interest_text = interests[0] if interests else "actividades del club"
        actions.append(EngagementPlanAction(
            id=f"ep-{action_id:03d}",
            action=f"Invitar a actividad de {interest_text} con 20% descuento",
            category="activity",
            priority="high",
            timing="Proximos 14 dias",
            expected_impact="+8 pts engagement",
            assigned_to="Coordinador de eventos",
        ))

        # Recognition action (if high tenure)
        tenure_days = (date.today() - family.join_date).days
        if tenure_days > 365:
            action_id += 1
            actions.append(EngagementPlanAction(
                id=f"ep-{action_id:03d}",
                action=f"Reconocimiento de {tenure_days // 365} año(s) como socio — tarjeta firmada por la Junta",
                category="recognition",
                priority="medium",
                timing="Proximo evento de socios",
                expected_impact="+3 pts engagement, +15% satisfaccion",
                assigned_to="Gerencia general",
            ))

        # Social action
        connections = await self.repo.get_social_connections(family.id)
        if len(connections) < 3:
            action_id += 1
            actions.append(EngagementPlanAction(
                id=f"ep-{action_id:03d}",
                action="Presentar a otra familia con intereses compatibles en proximo evento social",
                category="social",
                priority="medium",
                timing="Proximo mes",
                expected_impact="+4 pts engagement, +red social",
                assigned_to="Equipo de bienestar",
            ))

        # Financial action (if applicable)
        if family.tier in (MembershipTier.BASIC, MembershipTier.PREMIUM) and current_score > 60:
            action_id += 1
            actions.append(EngagementPlanAction(
                id=f"ep-{action_id:03d}",
                action=f"Evaluar upgrade a {'VIP' if family.tier == MembershipTier.PREMIUM else 'Premium'} con beneficios exclusivos",
                category="financial",
                priority="low",
                timing="Proxima revision trimestral",
                expected_impact="+$X revenue, +beneficios percibidos",
                assigned_to="Area comercial",
            ))

        # Wellness action
        action_id += 1
        actions.append(EngagementPlanAction(
            id=f"ep-{action_id:03d}",
            action="Ofrecer sesion de evaluacion wellness gratuita",
            category="activity",
            priority="low",
            timing="Proximo trimestre",
            expected_impact="+2 pts engagement, +uso de wellness",
            assigned_to="Coordinador wellness",
        ))

        return FamilyEngagementPlan(
            current_score=current_score,
            target_score=target_score,
            timeframe="90 dias",
            actions=actions,
            ai_summary=(
                f"Plan de engagement para {family.name}: {len(actions)} acciones "
                f"enfocadas en {'reactivacion urgente' if current_score < 40 else 'mejora continua'}. "
                f"Prioridad: {'comunicacion personalizada' if current_score < 50 else 'enriquecimiento social'}."
            ),
            estimated_roi=(
                f"Mejora de {target_score - current_score} pts en engagement "
                f"equivale a ~{15 + (target_score - current_score)}% menor probabilidad de churn "
                f"y ~${(target_score - current_score) * 120}/ano en revenue protegido."
            ),
        )

    async def _compute_lifecycle_analysis(
        self, family: Any,
    ) -> FamilyLifecycleAnalysis:
        today = date.today()
        tenure_days = (today - family.join_date).days
        engagement = family.engagement_score
        activities = await self.repo.get_activity_history(family.id)

        # Determine stage
        if tenure_days < LIFECYCLE_THRESHOLDS["onboarding_days"]:
            stage = LifecycleStage.ONBOARDING
            days_at = tenure_days
            next_t = "Transicion a 'Crecimiento' al completar onboarding y superar 60 engagement"
        elif engagement >= 70 and tenure_days < LIFECYCLE_THRESHOLDS["growing_max_days"]:
            stage = LifecycleStage.GROWING
            days_at = tenure_days - LIFECYCLE_THRESHOLDS["onboarding_days"]
            next_t = "Transicion a 'Pico' al consolidar engagement >70 por >1 año"
        elif engagement >= 70 and tenure_days >= LIFECYCLE_THRESHOLDS["growing_max_days"]:
            stage = LifecycleStage.PEAK
            days_at = tenure_days - LIFECYCLE_THRESHOLDS["growing_max_days"]
            next_t = "Mantener pico. Riesgo si engagement baja a <60 por >90 dias"
        elif engagement >= LIFECYCLE_THRESHOLDS["plateau_min_engagement"]:
            stage = LifecycleStage.PLATEAU
            days_at = 0
            next_t = "Transicion a 'Pico' si engagement sube >70, o 'Riesgo' si baja <40"
        elif engagement < LIFECYCLE_THRESHOLDS["at_risk_max_engagement"]:
            if activities:
                dates = [date.fromisoformat(a["event_date"]) if isinstance(a.get("event_date"), str) else a.get("event_date", today) for a in activities]
                last_activity = max(dates) if dates else family.join_date
                days_inactive = (today - last_activity).days
                if days_inactive > LIFECYCLE_THRESHOLDS["dormant_inactive_days"]:
                    stage = LifecycleStage.DORMANT
                    days_at = days_inactive
                    next_t = "Reactivacion necesaria. Campaña personalizada o llamada del gerente"
                else:
                    stage = LifecycleStage.AT_RISK
                    days_at = days_inactive
                    next_t = "Intervencion inmediata recomendada antes de entrar en dormancia"
            else:
                stage = LifecycleStage.AT_RISK
                days_at = 0
                next_t = "Sin datos de actividad. Evaluacion necesaria"
        else:
            stage = LifecycleStage.PLATEAU
            days_at = 0
            next_t = "Monitorear proximos 90 dias"

        # Stage progress (0-1 within current stage)
        if stage == LifecycleStage.ONBOARDING:
            progress = tenure_days / LIFECYCLE_THRESHOLDS["onboarding_days"]
        elif stage == LifecycleStage.GROWING:
            progress = min(1.0, (tenure_days - 90) / 275)
        elif stage == LifecycleStage.PEAK:
            progress = 0.8
        else:
            progress = 0.5

        # Recommendations
        recs: list[LifecycleRecommendation] = []

        if stage == LifecycleStage.ONBOARDING:
            recs.append(LifecycleRecommendation(
                action="Completar tour de instalaciones con miembros clave",
                priority="high",
                expected_impact="Acelerar integracion en 30%",
            ))
            recs.append(LifecycleRecommendation(
                action="Invitar a primer evento social dentro de 30 dias",
                priority="high",
                expected_impact="Primera conexion social = 2x retencion",
            ))
        elif stage == LifecycleStage.AT_RISK:
            recs.append(LifecycleRecommendation(
                action="Llamada personal del gerente esta semana",
                priority="high",
                expected_impact="85% de familias reactivan con contacto personal <30 dias",
            ))
            recs.append(LifecycleRecommendation(
                action="Ofrecer experiencia exclusiva: cena privada o actividad a medida",
                priority="high",
                expected_impact="Re-engagement inmediato si la causa es falta de novedad",
            ))
        elif stage == LifecycleStage.DORMANT:
            recs.append(LifecycleRecommendation(
                action="Campaña de reactivacion: beneficio especial por regreso",
                priority="high",
                expected_impact="20-35% reactivacion con incentivo adecuado",
            ))
        elif stage == LifecycleStage.PLATEAU:
            recs.append(LifecycleRecommendation(
                action="Introducir nueva categoria de actividades no explorada",
                priority="medium",
                expected_impact="Romper plateau con novedad",
            ))
        else:
            recs.append(LifecycleRecommendation(
                action="Mantener excelencia y buscar oportunidades de upgrade",
                priority="low",
                expected_impact="Consolidar fidelidad a largo plazo",
            ))

        # Data confidence
        data_points = 2  # engagement + tenure
        if activities:
            data_points += 1
        confidence = min(1.0, data_points / 4)

        return FamilyLifecycleAnalysis(
            current_stage=stage,
            stage_progress=round(progress, 2),
            next_transition=next_t,
            days_at_stage=max(0, days_at),
            recommendations=recs,
            confidence=confidence,
        )

    async def _compute_360_insight(
        self, family: Any, dashboard_context: str = "",
    ) -> Family360Insight:
        activities = await self.repo.get_activity_history(family.id)
        connections = await self.repo.get_social_connections(family.id)

        def score_status(score: int) -> str:
            if score >= 85:
                return "exceptional"
            if score >= 65:
                return "healthy"
            if score >= 45:
                return "attention"
            return "critical"

        domains: list[DomainScore] = []

        # Engagement domain
        eng_score = family.engagement_score
        domains.append(DomainScore(
            domain="engagement",
            score=eng_score,
            status=score_status(eng_score),
            finding=f"Engagement de {eng_score}/100. "
                    f"{'Excelente participacion' if eng_score >= 70 else 'Necesita atencion' if eng_score >= 40 else 'Critico — intervencion necesaria'}.",
            recommendation="Incrementar frecuencia de actividades" if eng_score < 60 else "Mantener nivel actual",
        ))

        # Activity domain
        activity_count = len(activities)
        act_score = min(100, activity_count * 12)
        domains.append(DomainScore(
            domain="activity",
            score=act_score,
            status=score_status(act_score),
            finding=f"{activity_count} actividades registradas. "
                    f"{'Historial rico' if activity_count >= 6 else 'Historial limitado' if activity_count >= 2 else 'Sin actividad significativa'}.",
            recommendation="Aumentar participacion a 2+ actividades/mes" if activity_count < 4 else "Explorar nuevas categorias",
        ))

        # Social domain
        conn_count = len(connections)
        avg_strength = sum(c.get("connection_strength", 0) for c in connections) / max(1, conn_count)
        social_score = min(100, conn_count * 20 + int(avg_strength * 30))
        domains.append(DomainScore(
            domain="social",
            score=social_score,
            status=score_status(social_score),
            finding=f"{conn_count} conexiones sociales con fuerza promedio de {avg_strength:.0%}.",
            recommendation="Facilitar nuevas conexiones en proximos eventos" if conn_count < 3 else "Fortalecer conexiones existentes",
        ))

        # Financial domain (basic — from available data)
        fin_score = 65  # Default baseline without financial data
        if dashboard_context and "financial" in dashboard_context.lower():
            fin_score = 72
        domains.append(DomainScore(
            domain="financial",
            score=fin_score,
            status=score_status(fin_score),
            finding="Score financiero baseline. Enriquecer con datos de facturacion para analisis completo.",
            recommendation="Integrar datos financieros para analisis LTV/CAC",
        ))

        # Overall
        overall = sum(d.score for d in domains) // len(domains)

        # Cross-domain correlations
        correlations: list[CrossDomainCorrelation] = []

        if eng_score > 70 and social_score < 40:
            correlations.append(CrossDomainCorrelation(
                domains=["engagement", "social"],
                correlation="Engagement alto con red social baja",
                insight="Familia participa pero no se integra socialmente. Riesgo de burnout sin soporte social.",
                impact="medium",
            ))

        if eng_score < 40 and activity_count > 3:
            correlations.append(CrossDomainCorrelation(
                domains=["engagement", "activity"],
                correlation="Actividad presente pero engagement bajo",
                insight="Familia asiste a eventos pero no se conecta emocionalmente. Revisar calidad de experiencia.",
                impact="high",
            ))

        if conn_count == 0 and tenure_days(family) > 180:
            correlations.append(CrossDomainCorrelation(
                domains=["social", "engagement"],
                correlation="Sin conexiones sociales tras 6+ meses",
                insight="Familia no se ha integrado a la comunidad. Riesgo alto de churn por aislamiento.",
                impact="high",
            ))

        if not correlations:
            correlations.append(CrossDomainCorrelation(
                domains=["engagement", "activity", "social"],
                correlation="Sin anomalias cross-domain detectadas",
                insight="Los indicadores estan alineados. Monitorear proximos 90 dias.",
                impact="low",
            ))

        # Top insights
        top = []
        for d in sorted(domains, key=lambda x: x.score):
            if d.status in ("critical", "attention"):
                top.append(f"{d.domain}: {d.finding}")
        if not top:
            top.append(f"Score 360 de {overall}/100. Familia en estado saludable.")

        # RAG enrichment
        rag_context = await self._enrich_with_rag_context(
            f"analisis familiar integral club privado {family.tier.value}"
        )
        rag_citation = self._format_rag_citations(rag_context)
        summary_parts = [
            f"{family.name}: Score 360 de {overall}/100.",
            f"Fortaleza: {max(domains, key=lambda d: d.score).domain}.",
            f"Atencion: {min(domains, key=lambda d: d.score).domain}.",
        ]
        if rag_citation:
            summary_parts.append(f"Referencia: {rag_citation}")

        return Family360Insight(
            overall_score=overall,
            domains=domains,
            top_insights=top[:3],
            cross_domain_correlations=correlations,
            ai_summary=" ".join(summary_parts),
        )

    async def _compute_enriched_graph(
        self, family: Any,
    ) -> FamilySocialGraphEnriched:
        connections = await self.repo.get_social_connections(family.id)
        all_families = await self.repo.get_all_families()
        preferences = await self.repo.get_preferences(family.id)

        # Enrich connections
        enriched: list[EnrichedSocialConnection] = []
        for conn in connections:
            conn_id = conn.get("connected_family_id", "")
            try:
                conn_family = await self.repo.get_family(UUID(conn_id))
                conn_engagement = conn_family.engagement_score if conn_family else None
                conn_tier = conn_family.tier.value if conn_family else None
            except (ValueError, TypeError):
                conn_engagement = None
                conn_tier = None

            strength = conn.get("connection_strength", 0.5)
            insight = None
            if strength > 0.7:
                insight = "Conexion fuerte — familia aliada para actividades conjuntas"
            elif strength < 0.3:
                insight = "Conexion debil — oportunidad de fortalecer en proximo evento"

            enriched.append(EnrichedSocialConnection(
                connected_family_id=conn_id,
                connected_family_name=conn.get("connected_family_name", ""),
                strength=strength,
                relationship=conn.get("relationship", ""),
                shared_activities=conn.get("shared_activities", []),
                shared_events=conn.get("shared_events_count", 0),
                last_interaction=conn.get("last_shared_event"),
                connected_tier=conn_tier,
                connected_engagement=conn_engagement,
                ai_insight=insight,
            ))

        # Build clusters (simple: group by shared activities)
        activity_to_families: dict[str, list[str]] = {}
        for conn in enriched:
            for act in conn.shared_activities:
                activity_to_families.setdefault(act, []).append(conn.connected_family_id)

        clusters: list[SocialGraphCluster] = []
        cluster_id = 0
        for activity, fam_ids in activity_to_families.items():
            if len(fam_ids) >= 2:
                cluster_id += 1
                avg_s = sum(
                    c.strength for c in enriched if c.connected_family_id in fam_ids
                ) / len(fam_ids)
                clusters.append(SocialGraphCluster(
                    id=f"cl-{cluster_id:03d}",
                    name=f"Cluster {activity}",
                    family_ids=fam_ids,
                    common_interest=activity,
                    avg_strength=round(avg_s, 2),
                ))

        # Suggested connections (families not connected)
        connected_ids = {c.connected_family_id for c in enriched}
        suggestions: list[SuggestedConnection] = []
        family_interests = set(preferences.get("interests", []))

        for other in all_families:
            if str(other.id) == str(family.id):
                continue
            if str(other.id) in connected_ids:
                continue

            other_prefs = await self.repo.get_preferences(other.id)
            other_interests = set(other_prefs.get("interests", []))
            shared = family_interests & other_interests
            if shared:
                score = min(100, len(shared) * 30)
                suggestions.append(SuggestedConnection(
                    family_id=str(other.id),
                    family_name=other.name,
                    tier=other.tier.value if hasattr(other.tier, 'value') else str(other.tier),
                    match_score=score,
                    reason=f"Comparten intereses: {', '.join(list(shared)[:3])}",
                ))

        suggestions.sort(key=lambda s: s.match_score, reverse=True)

        return FamilySocialGraphEnriched(
            family_id=str(family.id),
            family_name=family.name,
            connections=enriched,
            total_connections=len(enriched),
            clusters=clusters,
            suggested_connections=suggestions[:3],
        )

    async def _compute_milestones(
        self, family: Any,
    ) -> MilestoneTrackerResponse:
        today = date.today()
        members = await self.repo.get_members(family.id)
        upcoming: list[FamilyMilestone] = []
        recent: list[FamilyMilestone] = []
        suggestions: list[str] = []
        ms_id = 0

        # Anniversary
        join = family.join_date
        this_year_anniversary = _next_annual_occurrence(join, today)
        days_to_anniversary = (this_year_anniversary - today).days
        years = this_year_anniversary.year - join.year

        ms_id += 1
        milestone = FamilyMilestone(
            id=f"ms-{ms_id:03d}",
            type="anniversary",
            title=f"{years}° Aniversario como socios",
            date=this_year_anniversary.isoformat(),
            days_until=days_to_anniversary,
            suggested_action=f"Tarjeta firmada por la Junta + cena especial con {years}% descuento",
            priority="high" if days_to_anniversary <= 30 else "medium",
        )
        upcoming.append(milestone)

        # Birthdays
        for member in members:
            this_year_bday = _next_annual_occurrence(member.date_of_birth, today)
            days_to_bday = (this_year_bday - today).days
            age_turning = compute_age(member.date_of_birth)
            if this_year_bday > today:
                age_turning += 1

            ms_id += 1
            bday_milestone = FamilyMilestone(
                id=f"ms-{ms_id:03d}",
                type="birthday",
                title=f"Cumpleaños de {member.name} ({age_turning} años)",
                date=this_year_bday.isoformat(),
                days_until=days_to_bday,
                member_name=member.name,
                suggested_action="Mencion personalizada en comunicacion del club",
                priority="high" if days_to_bday <= 14 else "low",
            )

            if -30 <= days_to_bday <= 90:
                if days_to_bday < 0:
                    recent.append(bday_milestone)
                else:
                    upcoming.append(bday_milestone)

        # Age group transitions
        for member in members:
            age = compute_age(member.date_of_birth)
            future_group = AGE_GROUP_TRANSITIONS.get(age + 1)
            if future_group is None:
                continue

            next_bday = _next_annual_occurrence(member.date_of_birth, today)
            days_to = (next_bday - today).days

            if days_to > 90:
                continue

            ms_id += 1
            upcoming.append(FamilyMilestone(
                id=f"ms-{ms_id:03d}",
                type="age_transition",
                title=f"{member.name}: transicion a categoria {future_group.value}",
                date=next_bday.isoformat(),
                days_until=days_to,
                member_name=member.name,
                suggested_action=f"Actualizar programa de actividades para {future_group.value}",
                priority="medium",
            ))

        # Suggestions
        if family.engagement_score > 80:
            suggestions.append("Familia con alto engagement — considerar como candidata a Embajador")
        if len(upcoming) > 0:
            nearest = min(upcoming, key=lambda m: m.days_until)
            suggestions.append(f"Proximo hito: {nearest.title} en {nearest.days_until} dias. Preparar accion.")
        if not suggestions:
            suggestions.append("Programar touchpoint personalizado para mantener conexion")

        upcoming.sort(key=lambda m: m.days_until)

        return MilestoneTrackerResponse(
            upcoming=upcoming[:10],
            recent=recent[:5],
            suggestions=suggestions[:3],
        )


def tenure_days(family: Any) -> int:
    return (date.today() - family.join_date).days
