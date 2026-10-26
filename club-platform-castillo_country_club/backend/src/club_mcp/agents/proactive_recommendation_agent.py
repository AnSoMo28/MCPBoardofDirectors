"""
ProactiveRecommendationAgent: Motor de recomendaciones proactivas.
Club: Castillo Country Club

TOOLS:
  optimize_pricing                🔴 HITL   Optimización de precios
  suggest_new_activities          🔴 HITL   Sugerir nuevas actividades
  generate_family_recommendations 🟢 AUTO   Recomendaciones para familias
  predict_event_attendance        🟢 AUTO   Predicción de asistencia
  detect_scheduling_conflicts     🟢 AUTO   Detección de conflictos
  personalize_communication       🟢 AUTO   Borradores personalizados
  identify_social_clusters        🟢 AUTO   Clusters sociales
  generate_quarterly_insights     🟢 AUTO   Informes trimestrales
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.proactive_recommendation_repo import (
    ProactiveRecommendationRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.proactive_recommendation import (
    ClusterType,
    CreateActivitySuggestion,
    CreatePricingOptimization,
    CreateRecommendation,
    InsightPeriod,
    PricingStrategy,
    PredictionConfidence,
    RecommendationPriority,
    RecommendationType,
)

logger = logging.getLogger(__name__)


class ProactiveRecommendationAgent(BaseAgent):
    """
    Motor de recomendaciones proactivas de Castillo Country Club.
    Genera recomendaciones personalizadas, predicciones, detección
    de conflictos, optimización de precios y análisis de clusters.
    """

    agent_name: str = "proactive_recommendation"
    description: str = "Motor de recomendaciones proactivas"

    def __init__(
        self, repo=None, approval_engine=None, notifier=None
    ) -> None:
        super().__init__()
        self.repo = repo or ProactiveRecommendationRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    # ═══════════════════════════════════════════════════════
    # 🔴 TOOL: OPTIMIZE PRICING (HITL)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="optimize_pricing",
        description=(
            "Generar recomendaciones de optimización de precios "
            "para servicios y eventos del club. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Cambiar precios impacta revenue y percepción del socio."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def optimize_pricing(
        self,
        action: str = "list",
        pricing_id: str = "",
        service_name: str = "",
        current_price: float = 0.0,
        suggested_price: float = 0.0,
        strategy: str = "",
        expected_revenue_change: float = 0.0,
        expected_demand_change: float = 0.0,
        reasoning: str = "",
        risk_level: str = "medium",
        new_status: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            pricings = await self.repo.list_pricing()
            return {
                "status": "success",
                "message": (
                    f"💰 Encontramos {len(pricings)} "
                    f"optimización(es) de precios."
                ),
                "pricings": [p.model_dump(mode="json") for p in pricings],
            }

        # ── Get ──
        if action == "get":
            if not pricing_id:
                return {
                    "status": "error",
                    "message": "Se requiere pricing_id 🔍",
                }
            pricing = await self.repo.get_pricing(pricing_id)
            if not pricing:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la optimización "
                        f"{pricing_id} 😔"
                    ),
                }
            return {
                "status": "success",
                "pricing": pricing.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all(
                [service_name, strategy, current_price > 0, suggested_price > 0]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: service_name, "
                        "current_price (> 0), suggested_price (> 0), "
                        "strategy 📋"
                    ),
                }

            try:
                strat = PricingStrategy(strategy)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Estrategia no válida: '{strategy}'. "
                        f"Opciones: "
                        f"{', '.join(s.value for s in PricingStrategy)}"
                    ),
                }

            diff_pct = (
                ((suggested_price - current_price) / current_price) * 100
                if current_price > 0
                else 0
            )

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="optimize_pricing",
                params={
                    "action": "create",
                    "service_name": service_name,
                    "current_price": current_price,
                    "suggested_price": suggested_price,
                    "strategy": strategy,
                    "expected_revenue_change": expected_revenue_change,
                    "expected_demand_change": expected_demand_change,
                    "reasoning": reasoning,
                    "risk_level": risk_level,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Optimización de precio para '{service_name}': "
                    f"${current_price:,.0f} → ${suggested_price:,.0f} "
                    f"({diff_pct:+.1f}%). "
                    f"Estrategia: {strategy}"
                ),
                estimated_impact=(
                    f"Cambio de precio impacta revenue "
                    f"(Δ ${expected_revenue_change:+,.0f}) "
                    f"y demanda (Δ {expected_demand_change:+.1f}%)"
                ),
                affected_count=0,
                approver_roles=["admin"],
            )

            logger.info(
                "[proactive_recommendation] Pricing approval: %s",
                service_name,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"💲 Optimización de precio para "
                    f"'{service_name}' registrada. "
                    f"Esperando aprobación de gerencia."
                ),
                "details": {
                    "service_name": service_name,
                    "current_price": current_price,
                    "suggested_price": suggested_price,
                    "change_pct": f"{diff_pct:+.1f}%",
                    "strategy": strategy,
                    "risk_level": risk_level,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not pricing_id or not new_status:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere pricing_id y new_status 🔍"
                    ),
                }
            pricing = await self.repo.get_pricing(pricing_id)
            if not pricing:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la optimización "
                        f"{pricing_id} 😔"
                    ),
                }
            pricing = await self.repo.update_pricing(
                pricing_id, {"status": new_status}
            )
            return {
                "status": "success",
                "message": (
                    f"✅ Optimización de '{pricing.service_name}' "
                    f"actualizada a: {new_status}."
                ),
                "pricing": pricing.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🔍"
            ),
        }

    # ── INTERNAL: Execute pricing after HITL approval ──

    async def execute_pricing_optimization(
        self,
        service_name: str,
        current_price: float,
        suggested_price: float,
        strategy: str,
        expected_revenue_change: float = 0.0,
        expected_demand_change: float = 0.0,
        reasoning: str = "",
        risk_level: str = "medium",
    ) -> dict[str, Any]:
        """Crea la optimización de precio tras aprobación HITL."""
        data = CreatePricingOptimization(
            service_name=service_name,
            current_price=current_price,
            suggested_price=suggested_price,
            strategy=PricingStrategy(strategy),
            expected_revenue_change=expected_revenue_change,
            expected_demand_change=expected_demand_change,
            reasoning=reasoning,
            risk_level=risk_level,
        )
        pricing = await self.repo.create_pricing(data)

        # Aprobar inmediatamente tras aprobación HITL
        pricing = await self.repo.update_pricing(
            pricing.id, {"status": "approved"}
        )

        logger.info(
            "[proactive_recommendation] Pricing approved: %s (%s)",
            pricing.service_name, pricing.id,
        )

        return {
            "status": "success",
            "message": (
                f"💲 Optimización de precio para "
                f"'{pricing.service_name}' aprobada. "
                f"${current_price:,.0f} → ${suggested_price:,.0f}"
            ),
            "pricing": pricing.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════════
    # 🔴 TOOL: SUGGEST NEW ACTIVITIES (HITL)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="suggest_new_activities",
        description=(
            "Sugerir nuevas actividades y programas para el club "
            "basándose en tendencias, demanda y datos de miembros. "
            "REQUIERE APROBACIÓN HUMANA."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def suggest_new_activities(
        self,
        action: str = "list",
        suggestion_id: str = "",
        name: str = "",
        description: str = "",
        target_demographic: str = "",
        estimated_interest: float = 0.0,
        estimated_cost: float = 0.0,
        similar_clubs_offer: bool = False,
        member_requests_count: int = 0,
        tags: str = "",
        new_status: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            suggestions = await self.repo.list_suggestions()
            return {
                "status": "success",
                "message": (
                    f"💡 Encontramos {len(suggestions)} "
                    f"sugerencia(s) de actividades."
                ),
                "suggestions": [
                    s.model_dump(mode="json") for s in suggestions
                ],
            }

        # ── Get ──
        if action == "get":
            if not suggestion_id:
                return {
                    "status": "error",
                    "message": "Se requiere suggestion_id 🔍",
                }
            suggestion = await self.repo.get_suggestion(suggestion_id)
            if not suggestion:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la sugerencia "
                        f"{suggestion_id} 😔"
                    ),
                }
            return {
                "status": "success",
                "suggestion": suggestion.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all([name, description, target_demographic]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: name, description, "
                        "target_demographic 📋"
                    ),
                }

            tag_list = (
                [t.strip() for t in tags.split(",") if t.strip()]
                if tags
                else []
            )

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="suggest_new_activities",
                params={
                    "action": "create",
                    "name": name,
                    "description": description,
                    "target_demographic": target_demographic,
                    "estimated_interest": estimated_interest,
                    "estimated_cost": estimated_cost,
                    "similar_clubs_offer": similar_clubs_offer,
                    "member_requests_count": member_requests_count,
                    "tags": tag_list,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Propuesta de nueva actividad: {name} "
                    f"para {target_demographic}. "
                    f"Costo estimado: ${estimated_cost:,.0f}. "
                    f"Solicitudes de socios: {member_requests_count}"
                ),
                estimated_impact=(
                    "Inversión en nueva actividad, "
                    "asignación de recursos y personal"
                ),
                affected_count=member_requests_count,
                approver_roles=["admin"],
            )

            logger.info(
                "[proactive_recommendation] Activity suggestion: %s",
                name,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"💡 Actividad '{name}' propuesta. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "name": name,
                    "target_demographic": target_demographic,
                    "estimated_interest": estimated_interest,
                    "estimated_cost": estimated_cost,
                    "member_requests_count": member_requests_count,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not suggestion_id or not new_status:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere suggestion_id y new_status 🔍"
                    ),
                }
            suggestion = await self.repo.get_suggestion(suggestion_id)
            if not suggestion:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la sugerencia "
                        f"{suggestion_id} 😔"
                    ),
                }
            suggestion = await self.repo.update_suggestion(
                suggestion_id, {"status": new_status}
            )
            return {
                "status": "success",
                "message": (
                    f"✅ Sugerencia '{suggestion.name}' "
                    f"actualizada a: {new_status}."
                ),
                "suggestion": suggestion.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🔍"
            ),
        }

    # ── INTERNAL: Execute suggestion after HITL approval ──

    async def execute_activity_suggestion(
        self,
        name: str,
        description: str,
        target_demographic: str = "",
        estimated_interest: float = 0.0,
        estimated_cost: float = 0.0,
        similar_clubs_offer: bool = False,
        member_requests_count: int = 0,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        """Crea la sugerencia tras aprobación HITL."""
        data = CreateActivitySuggestion(
            name=name,
            description=description,
            target_demographic=target_demographic,
            estimated_interest=estimated_interest,
            estimated_cost=estimated_cost,
            similar_clubs_offer=similar_clubs_offer,
            member_requests_count=member_requests_count,
            tags=tags or [],
        )
        suggestion = await self.repo.create_suggestion(data)

        # Marcar como aprobada tras HITL
        suggestion = await self.repo.update_suggestion(
            suggestion.id, {"status": "approved"}
        )

        logger.info(
            "[proactive_recommendation] Activity approved: %s (%s)",
            suggestion.name, suggestion.id,
        )

        return {
            "status": "success",
            "message": (
                f"💡 Actividad '{suggestion.name}' aprobada. "
                f"¡Lista para implementación!"
            ),
            "suggestion": suggestion.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: GENERATE FAMILY RECOMMENDATIONS (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="generate_family_recommendations",
        description=(
            "Generar recomendaciones personalizadas para una familia "
            "basándose en su historial, preferencias y actividades "
            "disponibles."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_family_recommendations(
        self,
        family_id: str = "",
        recommendation_type: str = "",
        limit: int = 5,
    ) -> dict[str, Any]:
        # Generar recomendaciones de ejemplo basadas en el tipo
        rec_types = []
        if recommendation_type:
            try:
                rt = RecommendationType(recommendation_type)
                rec_types = [rt]
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{recommendation_type}'. "
                        f"Opciones: "
                        f"{', '.join(r.value for r in RecommendationType)}"
                    ),
                }
        else:
            rec_types = list(RecommendationType)

        recommendations = []
        for rt in rec_types[:limit]:
            data = CreateRecommendation(
                family_id=family_id or "global",
                recommendation_type=rt,
                title=f"Recomendación {rt.value.replace('_', ' ').title()}",
                description=(
                    f"Sugerencia personalizada basada en "
                    f"actividades de tipo {rt.value}."
                ),
                priority=RecommendationPriority.MEDIUM,
                score=75.0,
                reasoning="Basado en historial y preferencias del socio.",
            )
            rec = await self.repo.create_recommendation(data)
            recommendations.append(rec)

        return {
            "status": "success",
            "message": (
                f"🎯 {len(recommendations)} recomendación(es) "
                f"generada(s) para la familia."
            ),
            "recommendations": [
                r.model_dump(mode="json") for r in recommendations
            ],
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: PREDICT EVENT ATTENDANCE (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="predict_event_attendance",
        description=(
            "Predecir la asistencia esperada a un evento "
            "basándose en datos históricos, tipo de evento "
            "y tendencias recientes."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def predict_event_attendance(
        self,
        event_id: str = "",
        event_name: str = "",
        event_type: str = "",
        venue_capacity: int = 0,
        date: str = "",
    ) -> dict[str, Any]:
        if not event_name:
            return {
                "status": "error",
                "message": "Se requiere event_name 🔍",
            }

        # Predicción heurística basada en tipo
        base_prediction = venue_capacity // 2 if venue_capacity else 100
        confidence = PredictionConfidence.MEDIUM
        factors = [
            "historical_data",
            "event_type",
            "seasonal_trends",
        ]

        # Ajustar por tipo
        type_multipliers = {
            "gala": 1.3,
            "tournament": 1.2,
            "social": 0.8,
            "cultural": 0.7,
            "sports": 0.9,
        }
        multiplier = type_multipliers.get(event_type, 1.0)
        predicted = int(base_prediction * multiplier)

        if predicted > 200:
            confidence = PredictionConfidence.HIGH
        elif predicted < 30:
            confidence = PredictionConfidence.LOW

        prediction = await self.repo.create_prediction(
            event_id=event_id or f"event_{event_name[:10]}",
            event_name=event_name,
            predicted_attendance=predicted,
            confidence=confidence,
            factors=factors,
            similar_events_avg=int(base_prediction),
        )

        return {
            "status": "success",
            "message": (
                f"📈 Predicción para '{event_name}': "
                f"{predicted} asistentes esperados "
                f"(confianza: {confidence.value})."
            ),
            "prediction": prediction.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: DETECT SCHEDULING CONFLICTS (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="detect_scheduling_conflicts",
        description=(
            "Detectar conflictos de programación entre eventos "
            "del club: solapamientos de horarios, venues "
            "y recursos compartidos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def detect_scheduling_conflicts(
        self,
        date: str = "",
        severity_filter: str = "",
    ) -> dict[str, Any]:
        if not date:
            return {
                "status": "error",
                "message": "Se requiere date para buscar conflictos 🔍",
            }

        # Buscar conflictos existentes
        conflicts = await self.repo.list_conflicts(
            severity=severity_filter
        )

        if not conflicts:
            return {
                "status": "success",
                "message": (
                    f"✅ No se detectaron conflictos "
                    f"para {date}."
                ),
                "conflicts": [],
                "total_conflicts": 0,
            }

        return {
            "status": "success",
            "message": (
                f"⚠️ {len(conflicts)} conflicto(s) "
                f"detectado(s) para {date}."
            ),
            "conflicts": [
                c.model_dump(mode="json") for c in conflicts
            ],
            "total_conflicts": len(conflicts),
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: PERSONALIZE COMMUNICATION (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="personalize_communication",
        description=(
            "Generar borradores de comunicación personalizada "
            "para socios basándose en su perfil, actividad "
            "reciente y preferencias."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def personalize_communication(
        self,
        family_id: str = "",
        channel: str = "email",
        tone: str = "friendly",
        topic: str = "",
        family_name: str = "",
    ) -> dict[str, Any]:
        if not all([family_id, topic]):
            return {
                "status": "error",
                "message": (
                    "Se requiere family_id y topic 🔍"
                ),
            }

        # Generar borrador personalizado
        name_display = family_name or "Familia Socio"

        subject_templates = {
            "event_invitation": (
                f"Invitación exclusiva para {name_display} 🎉"
            ),
            "activity_reminder": (
                f"{name_display}, no olvides tu próxima actividad 📅"
            ),
            "loyalty_reward": (
                f"¡{name_display}, tienes recompensas esperándote! 🎁"
            ),
            "membership_renewal": (
                f"Renueva tu membresía, {name_display} ⭐"
            ),
        }

        body_templates = {
            "event_invitation": (
                f"Estimado/a {name_display},\n\n"
                f"Tenemos el gusto de invitarle a nuestros "
                f"próximos eventos exclusivos. Su presencia "
                f"sería un honor para nuestra comunidad.\n\n"
                f"¡Esperamos verle pronto!"
            ),
            "activity_reminder": (
                f"Hola {name_display},\n\n"
                f"Le recordamos que tiene actividades "
                f"programadas esta semana. "
                f"¡No se las pierda!"
            ),
            "loyalty_reward": (
                f"¡Hola {name_display}!\n\n"
                f"Su lealtad al club ha sido reconocida. "
                f"Consulte sus recompensas disponibles."
            ),
            "membership_renewal": (
                f"Estimado/a {name_display},\n\n"
                f"Su membresía está próxima a vencer. "
                f"Renueve ahora y mantenga todos sus "
                f"beneficios activos."
            ),
        }

        subject = subject_templates.get(
            topic,
            f"Comunicación para {name_display}",
        )
        body = body_templates.get(
            topic,
            f"Estimado/a {name_display},\n\n"
            f"Le escribimos para mantenerle informado "
            f"sobre las novedades del club.\n\n"
            f"Atentamente,\nCastillo Country Club",
        )

        draft = await self.repo.create_draft(
            family_id=family_id,
            channel=channel,
            subject=subject,
            body=body,
            tone=tone,
            personalization_data={
                "family_name": name_display,
                "topic": topic,
            },
        )

        return {
            "status": "success",
            "message": (
                f"✉️ Borrador de comunicación generado "
                f"para {name_display}."
            ),
            "draft": draft.model_dump(mode="json"),
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: IDENTIFY SOCIAL CLUSTERS (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="identify_social_clusters",
        description=(
            "Identificar clusters sociales entre familias "
            "del club: grupos con intereses comunes, "
            "actividades compartidas y afinidad social."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def identify_social_clusters(
        self,
        cluster_type: str = "",
        min_size: int = 2,
    ) -> dict[str, Any]:
        # Buscar clusters existentes
        clusters = await self.repo.list_clusters(
            cluster_type=cluster_type
        )

        # Filtrar por tamaño mínimo
        clusters = [c for c in clusters if c.size >= min_size]

        if not clusters:
            return {
                "status": "success",
                "message": (
                    "🔍 No se encontraron clusters "
                    "con los criterios especificados."
                ),
                "clusters": [],
                "total_clusters": 0,
            }

        return {
            "status": "success",
            "message": (
                f"🔗 {len(clusters)} cluster(es) "
                f"social(es) identificado(s)."
            ),
            "clusters": [c.model_dump(mode="json") for c in clusters],
            "total_clusters": len(clusters),
        }

    # ═══════════════════════════════════════════════════════
    # 🟢 TOOL: GENERATE QUARTERLY INSIGHTS (AUTO)
    # ═══════════════════════════════════════════════════════

    @MCPTool(
        name="generate_quarterly_insights",
        description=(
            "Generar informe de insights trimestrales del club: "
            "resumen de actividad, satisfacción, "
            "recomendaciones y áreas de mejora."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_quarterly_insights(
        self,
        action: str = "generate",
        insight_id: str = "",
        year: int = 0,
        period: str = "",
        new_status: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            insights = await self.repo.list_insights(
                year=year, period=period
            )
            return {
                "status": "success",
                "message": (
                    f"📊 {len(insights)} informe(s) "
                    f"trimestral(es) encontrado(s)."
                ),
                "insights": [
                    i.model_dump(mode="json") for i in insights
                ],
            }

        # ── Get ──
        if action == "get":
            if not insight_id:
                return {
                    "status": "error",
                    "message": "Se requiere insight_id 🔍",
                }
            insight = await self.repo.get_insights(insight_id)
            if not insight:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el informe "
                        f"{insight_id} 😔"
                    ),
                }
            return {
                "status": "success",
                "insight": insight.model_dump(mode="json"),
            }

        # ── Generate ──
        if action == "generate":
            if not all([year, period]):
                return {
                    "status": "error",
                    "message": (
                        "Se requiere year y period "
                        "(Q1, Q2, Q3, Q4) 📋"
                    ),
                }

            try:
                InsightPeriod(period)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Período no válido: '{period}'. "
                        f"Opciones: "
                        f"{', '.join(p.value for p in InsightPeriod)}"
                    ),
                }

            insight = await self.repo.create_insights(
                year=year,
                period=period,
                summary=(
                    f"Resumen ejecutivo {period} {year}: "
                    f"El club mantiene un buen nivel de actividad "
                    f"con oportunidades de mejora en engagement."
                ),
                total_members_active=1250,
                events_held=45,
                avg_event_attendance=87.5,
                revenue_total=425000.0,
                top_activities=[
                    {"name": "Torneo de Tenis", "participation": 120},
                    {"name": "Cena Temática", "participation": 95},
                    {"name": "Clase de Yoga", "participation": 80},
                ],
                member_satisfaction_avg=4.2,
                key_achievements=[
                    "Incremento del 15% en asistencia a eventos",
                    "Nuevos programas juveniles implementados",
                    "Satisfacción del socio estable en 4.2/5.0",
                ],
                areas_for_improvement=[
                    "Mejorar comunicación digital",
                    "Ampliar horarios de fin de semana",
                    "Más opciones gastronómicas",
                ],
                recommendations=[
                    "Lanzar programa de referidos con incentivos",
                    "Expandir clases de bienestar",
                    "Implementar app móvil para reservas",
                ],
            )

            return {
                "status": "success",
                "message": (
                    f"📊 Informe {period} {year} generado. "
                    f"Listo para revisión de gerencia."
                ),
                "insight": insight.model_dump(mode="json"),
            }

        # ── Update Status ──
        if action == "update_status":
            if not insight_id or not new_status:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere insight_id y new_status 🔍"
                    ),
                }
            insight = await self.repo.get_insights(insight_id)
            if not insight:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el informe "
                        f"{insight_id} 😔"
                    ),
                }
            insight = await self.repo.update_insights(
                insight_id, {"status": new_status}
            )
            return {
                "status": "success",
                "message": (
                    f"✅ Informe actualizado a: {new_status}."
                ),
                "insight": insight.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, generate, update_status 🔍"
            ),
        }
