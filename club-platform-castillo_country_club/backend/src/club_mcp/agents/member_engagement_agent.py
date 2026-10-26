"""
MemberEngagementAgent: Engagement y fidelización de socios.
Club: Castillo Country Club

TOOLS:
  get_engagement_insights        🟢 AUTO   Análisis de engagement por socio
  design_reactivation_campaign   🔴 HITL   Campañas de reactivación
  manage_loyalty_rewards         🔴 HITL   Gestión de recompensas
  submit_feedback                🟢 AUTO   Registrar feedback
  manage_referrals               🟢 AUTO   Programa de referidos
  get_engagement_dashboard       🟢 AUTO   Dashboard general de engagement
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from datetime import datetime, timezone
from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.member_engagement_repo import (
    MemberEngagementRepository,
)
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.member_engagement import (
    CampaignType,
    CreateEngagementProfile,
    CreateLoyaltyReward,
    CreateMemberFeedback,
    CreateReactivationCampaign,
    CreateReferral,
    EngagementLevel,
    FeedbackChannel,
    FeedbackSentiment,
    RewardStatus,
    RewardType,
)

logger = logging.getLogger(__name__)


class MemberEngagementAgent(BaseAgent):
    """
    Agente de engagement y fidelización de Castillo Country Club.
    Gestiona perfiles, campañas, recompensas, feedback y referidos.
    """

    agent_name: str = "member_engagement"
    description: str = "Gestión de engagement y fidelización de socios"

    def __init__(self, repo=None, approval_engine=None, notifier=None) -> None:
        super().__init__()
        self.repo = repo or MemberEngagementRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier

    def _register_tools(self) -> None:
        pass

    @staticmethod
    def _parse_channels(channels_str: str) -> list[FeedbackChannel]:
        if not channels_str:
            return [FeedbackChannel.EMAIL]
        result: list[FeedbackChannel] = []
        for ch in channels_str.split(","):
            ch = ch.strip()
            if ch:
                try:
                    result.append(FeedbackChannel(ch))
                except ValueError:
                    pass
        return result if result else [FeedbackChannel.EMAIL]

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET ENGAGEMENT INSIGHTS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_engagement_insights",
        description=(
            "Obtener análisis de engagement de un socio específico "
            "o de todos los socios. Incluye score, nivel, actividad y recomendaciones."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_engagement_insights(
        self,
        member_id: str = "",
        engagement_level: str = "",
    ) -> dict[str, Any]:
        if member_id:
            profile = await self.repo.get_profile_by_member(member_id)
            if not profile:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos perfil de engagement para "
                        f"{member_id} 😊"
                    ),
                }

            # Generate insights
            insights: list[str] = []
            if profile.engagement_level in (
                EngagementLevel.AT_RISK,
                EngagementLevel.INACTIVE,
            ):
                insights.append(
                    "⚠️ Socio en riesgo de abandono. "
                    "Considerar campaña de reactivación."
                )
            if profile.visits_last_30_days == 0:
                insights.append(
                    "📅 Sin visitas en los últimos 30 días."
                )
            if profile.loyalty_points > 1000:
                insights.append(
                    f"⭐ {profile.loyalty_points} puntos acumulados. "
                    f"Ofrecer canje de recompensas."
                )
            if not insights:
                insights.append("✅ Engagement saludable.")

            return {
                "status": "success",
                "profile": profile.model_dump(mode="json"),
                "insights": insights,
            }

        # ── List with optional filter ──
        level_filter = None
        if engagement_level:
            try:
                level_filter = EngagementLevel(engagement_level)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Nivel no válido: '{engagement_level}'. "
                        f"Opciones: {', '.join(e.value for e in EngagementLevel)}"
                    ),
                }

        profiles = await self.repo.list_profiles(
            engagement_level=level_filter
        )

        # Summary stats
        level_counts: dict[str, int] = {}
        for p in profiles:
            lvl = p.engagement_level.value
            level_counts[lvl] = level_counts.get(lvl, 0) + 1

        return {
            "status": "success",
            "message": (
                f"👥 {len(profiles)} perfil(es) de engagement encontrados."
            ),
            "profiles": [p.model_dump(mode="json") for p in profiles],
            "summary": {
                "total": len(profiles),
                "by_level": level_counts,
            },
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: DESIGN REACTIVATION CAMPAIGN (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="design_reactivation_campaign",
        description=(
            "Diseñar y lanzar campañas de reactivación para socios inactivos. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Incluye campañas de retención, upsell, referidos y aniversario."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def design_reactivation_campaign(
        self,
        action: str = "list",
        campaign_id: str = "",
        name: str = "",
        campaign_type: str = "reactivation",
        description: str = "",
        target_member_ids: str = "",
        target_engagement_level: str = "",
        channels: str = "email",
        message_template: str = "",
        start_date: str = "",
        end_date: str = "",
        budget: float = 0.0,
        new_status: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            campaigns = await self.repo.list_campaigns()
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(campaigns)} campañas.",
                "campaigns": [c.model_dump(mode="json") for c in campaigns],
            }

        # ── Get ──
        if action == "get":
            if not campaign_id:
                return {
                    "status": "error",
                    "message": "Se requiere campaign_id 🤔",
                }
            campaign = await self.repo.get_campaign(campaign_id)
            if not campaign:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la campaña {campaign_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "campaign": campaign.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all([name, description, start_date, end_date]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: name, description, "
                        "start_date, end_date 📋"
                    ),
                }

            try:
                ct = CampaignType(campaign_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo no válido: '{campaign_type}'. "
                        f"Opciones: {', '.join(c.value for c in CampaignType)}"
                    ),
                }

            target_level = None
            if target_engagement_level:
                try:
                    target_level = EngagementLevel(target_engagement_level)
                except ValueError:
                    return {
                        "status": "error",
                        "message": (
                            f"Nivel objetivo no válido: "
                            f"'{target_engagement_level}'. "
                            f"Opciones: {', '.join(e.value for e in EngagementLevel)}"
                        ),
                    }

            channel_list = self._parse_channels(channels)
            target_ids = [
                t.strip() for t in target_member_ids.split(",") if t.strip()
            ]

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="design_reactivation_campaign",
                params={
                    "action": "create",
                    "name": name,
                    "campaign_type": campaign_type,
                    "description": description,
                    "target_member_ids": target_ids,
                    "target_engagement_level": target_engagement_level,
                    "channels": [c.value for c in channel_list],
                    "message_template": message_template,
                    "start_date": start_date,
                    "end_date": end_date,
                    "budget": budget,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Campaña de {campaign_type}: '{name}'. "
                    f"Presupuesto: ₡{budget:,.0f}"
                ),
                estimated_impact="Envío masivo de comunicaciones a socios",
                affected_count=len(target_ids),
                approver_roles=["admin"],
            )

            logger.info(
                "[engagement] Campaign approval request: %s", name
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"📣 Campaña '{name}' creada. "
                    f"Esperando aprobación del administrador."
                ),
                "details": {
                    "name": name,
                    "campaign_type": campaign_type,
                    "target_count": len(target_ids),
                    "budget": budget,
                },
            }

        # ── Update Status ──
        if action == "update_status":
            if not campaign_id or not new_status:
                return {
                    "status": "error",
                    "message": "Se requiere campaign_id y new_status 🤔",
                }
            campaign = await self.repo.get_campaign(campaign_id)
            if not campaign:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la campaña {campaign_id} 😊"
                    ),
                }
            campaign = await self.repo.update_campaign(
                campaign_id, {"status": new_status}
            )
            return {
                "status": "success",
                "message": (
                    f"✅ Campaña '{campaign.name}' actualizada a "
                    f"{new_status}."
                ),
                "campaign": campaign.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update_status 🤔"
            ),
        }

    # ── INTERNAL: Execute campaign after HITL ──

    async def execute_reactivation_campaign(
        self,
        name: str,
        campaign_type: str = "reactivation",
        description: str = "",
        target_member_ids: list[str] | None = None,
        target_engagement_level: str = "",
        channels: list[str] | None = None,
        message_template: str = "",
        start_date: str = "",
        end_date: str = "",
        budget: float = 0.0,
        notes: str = "",
    ) -> dict[str, Any]:
        """Lanza la campaña después de la aprobación HITL."""
        channel_objs = []
        for c in (channels or ["email"]):
            try:
                channel_objs.append(FeedbackChannel(c))
            except ValueError:
                pass

        target_level = None
        if target_engagement_level:
            try:
                target_level = EngagementLevel(target_engagement_level)
            except ValueError:
                pass

        data = CreateReactivationCampaign(
            name=name,
            campaign_type=CampaignType(campaign_type),
            description=description,
            target_member_ids=target_member_ids or [],
            target_engagement_level=target_level,
            channels=channel_objs,
            message_template=message_template,
            start_date=start_date,
            end_date=end_date,
            budget=budget,
            notes=notes or None,
        )
        campaign = await self.repo.create_campaign(data)

        # Activate immediately
        campaign = await self.repo.update_campaign(
            campaign.id, {"status": "active"}
        )

        logger.info(
            "[engagement] Campaign activated: %s (%s)",
            campaign.name,
            campaign.id,
        )

        return {
            "status": "success",
            "message": (
                f"📣 Campaña '{campaign.name}' aprobada y activada. "
                f"¡A reactivar socios!"
            ),
            "campaign": campaign.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🔴 TOOL: MANAGE LOYALTY REWARDS (HITL)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_loyalty_rewards",
        description=(
            "Crear, consultar y gestionar recompensas de fidelización. "
            "REQUIERE APROBACIÓN HUMANA para crear nuevas recompensas. "
            "Consultas y redenciones son directas."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def manage_loyalty_rewards(
        self,
        action: str = "list",
        reward_id: str = "",
        member_id: str = "",
        member_name: str = "",
        reward_type: str = "discount",
        description: str = "",
        points_cost: int = 0,
        monetary_value: float = 0.0,
        valid_from: str = "",
        valid_until: str = "",
        new_status: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            rewards = await self.repo.list_rewards(
                member_id=member_id or None
            )
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(rewards)} recompensas.",
                "rewards": [r.model_dump(mode="json") for r in rewards],
            }

        # ── Get ──
        if action == "get":
            if not reward_id:
                return {
                    "status": "error",
                    "message": "Se requiere reward_id 🤔",
                }
            reward = await self.repo.get_reward(reward_id)
            if not reward:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la recompensa {reward_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "reward": reward.model_dump(mode="json"),
            }

        # ── Create → HITL ──
        if action == "create":
            if not all(
                [member_id, member_name, reward_type, description]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: member_id, "
                        "member_name, reward_type, description 📋"
                    ),
                }

            try:
                rt = RewardType(reward_type)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Tipo de recompensa no válido: '{reward_type}'. "
                        f"Opciones: {', '.join(r.value for r in RewardType)}"
                    ),
                }

            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="manage_loyalty_rewards",
                params={
                    "action": "create",
                    "member_id": member_id,
                    "member_name": member_name,
                    "reward_type": reward_type,
                    "description": description,
                    "points_cost": points_cost,
                    "monetary_value": monetary_value,
                    "valid_from": valid_from,
                    "valid_until": valid_until,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Recompensa {reward_type} para {member_name}: "
                    f"{description}. Valor: ₡{monetary_value:,.0f}"
                ),
                estimated_impact="Emisión de recompensa de fidelización",
                affected_count=1,
                approver_roles=["admin"],
            )

            logger.info(
                "[engagement] Reward approval request: %s for %s",
                reward_type,
                member_name,
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"🎁 Recompensa para {member_name} creada. "
                    f"Esperando aprobación."
                ),
                "details": {
                    "member_name": member_name,
                    "reward_type": reward_type,
                    "description": description,
                    "points_cost": points_cost,
                    "monetary_value": monetary_value,
                },
            }

        # ── Redeem ──
        if action == "redeem":
            if not reward_id:
                return {
                    "status": "error",
                    "message": "Se requiere reward_id para redimir 🤔",
                }
            reward = await self.repo.get_reward(reward_id)
            if not reward:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la recompensa {reward_id} 😊"
                    ),
                }
            if reward.status != RewardStatus.ACTIVE:
                return {
                    "status": "error",
                    "message": (
                        f"La recompensa no está activa "
                        f"(estado: {reward.status.value})."
                    ),
                }

            reward = await self.repo.update_reward(
                reward_id,
                {
                    "status": RewardStatus.REDEEMED,
                    "redeemed_at": datetime.now(tz=timezone.utc).isoformat(),
                },
            )

            logger.info(
                "[engagement] Reward redeemed: %s by %s",
                reward.id,
                reward.member_name,
            )

            return {
                "status": "success",
                "message": (
                    f"🎉 Recompensa '{reward.description}' redimida "
                    f"por {reward.member_name}."
                ),
                "reward": reward.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, redeem 🤔"
            ),
        }

    # ── INTERNAL: Execute reward after HITL ──

    async def execute_loyalty_reward(
        self,
        member_id: str,
        member_name: str,
        reward_type: str = "discount",
        description: str = "",
        points_cost: int = 0,
        monetary_value: float = 0.0,
        valid_from: str = "",
        valid_until: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Crea la recompensa después de la aprobación HITL."""
        data = CreateLoyaltyReward(
            member_id=member_id,
            member_name=member_name,
            reward_type=RewardType(reward_type),
            description=description,
            points_cost=points_cost,
            monetary_value=monetary_value,
            valid_from=valid_from,
            valid_until=valid_until,
            notes=notes or None,
        )
        reward = await self.repo.create_reward(data)

        logger.info(
            "[engagement] Reward created: %s for %s (%s)",
            reward.reward_type.value,
            reward.member_name,
            reward.id,
        )

        return {
            "status": "success",
            "message": (
                f"🎁 Recompensa '{reward.description}' aprobada "
                f"y asignada a {reward.member_name}."
            ),
            "reward": reward.model_dump(mode="json"),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: SUBMIT FEEDBACK (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="submit_feedback",
        description=(
            "Registrar feedback de un socio: "
            "quejas, sugerencias, elogios o evaluaciones."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def submit_feedback(
        self,
        action: str = "create",
        feedback_id: str = "",
        member_id: str = "",
        member_name: str = "",
        channel: str = "in_app",
        sentiment: str = "neutral",
        rating: int = 0,
        category: str = "",
        comment: str = "",
        response: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            feedbacks = await self.repo.list_feedback(
                member_id=member_id or None
            )
            return {
                "status": "success",
                "message": (
                    f"📋 Encontramos {len(feedbacks)} feedback(s)."
                ),
                "feedbacks": [f.model_dump(mode="json") for f in feedbacks],
            }

        # ── Get ──
        if action == "get":
            if not feedback_id:
                return {
                    "status": "error",
                    "message": "Se requiere feedback_id 🤔",
                }
            fb = await self.repo.get_feedback(feedback_id)
            if not fb:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el feedback {feedback_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "feedback": fb.model_dump(mode="json"),
            }

        # ── Create ──
        if action == "create":
            if not all([member_id, member_name, comment]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: member_id, "
                        "member_name, comment 📋"
                    ),
                }

            try:
                ch = FeedbackChannel(channel)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Canal no válido: '{channel}'. "
                        f"Opciones: {', '.join(c.value for c in FeedbackChannel)}"
                    ),
                }

            try:
                sent = FeedbackSentiment(sentiment)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Sentimiento no válido: '{sentiment}'. "
                        f"Opciones: {', '.join(s.value for s in FeedbackSentiment)}"
                    ),
                }

            data = CreateMemberFeedback(
                member_id=member_id,
                member_name=member_name,
                channel=ch,
                sentiment=sent,
                rating=max(0, min(5, rating)),
                category=category,
                comment=comment,
            )
            fb = await self.repo.create_feedback(data)

            logger.info(
                "[engagement] Feedback from %s (%s): %s",
                member_name,
                sentiment,
                category,
            )

            return {
                "status": "success",
                "message": (
                    f"💬 Feedback de {member_name} registrado. "
                    f"¡Gracias por tu opinión!"
                ),
                "feedback": fb.model_dump(mode="json"),
            }

        # ── Respond ──
        if action == "respond":
            if not feedback_id or not response:
                return {
                    "status": "error",
                    "message": (
                        "Se requiere feedback_id y response 🤔"
                    ),
                }
            fb = await self.repo.get_feedback(feedback_id)
            if not fb:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el feedback {feedback_id} 😊"
                    ),
                }

            fb = await self.repo.update_feedback(
                feedback_id,
                {
                    "response": response,
                    "responded_at": datetime.now(tz=timezone.utc).isoformat(),
                },
            )

            return {
                "status": "success",
                "message": (
                    f"✅ Respuesta registrada para feedback de "
                    f"{fb.member_name}."
                ),
                "feedback": fb.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, respond 🤔"
            ),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: MANAGE REFERRALS (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="manage_referrals",
        description=(
            "Gestionar el programa de referidos: "
            "registrar nuevos referidos y marcar conversiones."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_referrals(
        self,
        action: str = "create",
        referral_id: str = "",
        referrer_member_id: str = "",
        referrer_name: str = "",
        referred_name: str = "",
        referred_email: str = "",
        referred_phone: str = "",
        reward_points: int = 500,
        notes: str = "",
    ) -> dict[str, Any]:
        # ── List ──
        if action == "list":
            referrals = await self.repo.list_referrals(
                referrer_member_id=referrer_member_id or None
            )
            return {
                "status": "success",
                "message": (
                    f"📋 Encontramos {len(referrals)} referido(s)."
                ),
                "referrals": [r.model_dump(mode="json") for r in referrals],
            }

        # ── Create ──
        if action == "create":
            if not all(
                [referrer_member_id, referrer_name, referred_name]
            ):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: referrer_member_id, "
                        "referrer_name, referred_name 📋"
                    ),
                }

            data = CreateReferral(
                referrer_member_id=referrer_member_id,
                referrer_name=referrer_name,
                referred_name=referred_name,
                referred_email=referred_email,
                referred_phone=referred_phone,
                reward_points=reward_points,
                notes=notes or None,
            )
            referral = await self.repo.create_referral(data)

            # Increment referrer's count
            profile = await self.repo.get_profile_by_member(
                referrer_member_id
            )
            if profile:
                await self.repo.update_profile(
                    profile.id,
                    {"referral_count": profile.referral_count + 1},
                )

            logger.info(
                "[engagement] Referral: %s → %s",
                referrer_name,
                referred_name,
            )

            return {
                "status": "success",
                "message": (
                    f"🤝 Referido de {referrer_name}: "
                    f"'{referred_name}' registrado."
                ),
                "referral": referral.model_dump(mode="json"),
            }

        # ── Convert ──
        if action == "convert":
            if not referral_id:
                return {
                    "status": "error",
                    "message": "Se requiere referral_id para convertir 🤔",
                }
            referral = await self.repo.get_referral(referral_id)
            if not referral:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos el referido {referral_id} 😊"
                    ),
                }

            referral = await self.repo.update_referral(
                referral_id,
                {
                    "status": "converted",
                    "converted_at": datetime.now(tz=timezone.utc).isoformat(),
                },
            )

            # Add points to referrer
            profile = await self.repo.get_profile_by_member(
                referral.referrer_member_id
            )
            if profile:
                await self.repo.update_profile(
                    profile.id,
                    {
                        "loyalty_points": (
                            profile.loyalty_points + referral.reward_points
                        ),
                    },
                )

            return {
                "status": "success",
                "message": (
                    f"🎉 Referido convertido: {referral.referred_name}. "
                    f"{referral.reward_points} puntos otorgados a "
                    f"{referral.referrer_name}."
                ),
                "referral": referral.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, create, convert 🤔"
            ),
        }

    # ──────────────────────────────────────────────────
    # 🟢 TOOL: GET ENGAGEMENT DASHBOARD (AUTO)
    # ──────────────────────────────────────────────────

    @MCPTool(
        name="get_engagement_dashboard",
        description=(
            "Dashboard general de engagement del club: "
            "métricas de socios, campañas, recompensas y feedback."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_engagement_dashboard(self) -> dict[str, Any]:
        profiles = await self.repo.list_profiles()
        campaigns = await self.repo.list_campaigns()
        rewards = await self.repo.list_rewards()
        feedbacks = await self.repo.list_feedback()
        referrals = await self.repo.list_referrals()

        # ── Profile metrics ──
        level_counts: dict[str, int] = {}
        total_points = 0
        total_spend = 0.0
        for p in profiles:
            lvl = p.engagement_level.value
            level_counts[lvl] = level_counts.get(lvl, 0) + 1
            total_points += p.loyalty_points
            total_spend += p.total_spend_ytd

        at_risk = [
            p.member_name
            for p in profiles
            if p.engagement_level
            in (EngagementLevel.AT_RISK, EngagementLevel.INACTIVE)
        ]

        # ── Campaign metrics ──
        active_campaigns = [
            c for c in campaigns if c.status.value == "active"
        ]
        total_conversions = sum(c.conversion_count for c in campaigns)

        # ── Reward metrics ──
        active_rewards = [
            r for r in rewards if r.status == RewardStatus.ACTIVE
        ]
        redeemed = [r for r in rewards if r.status == RewardStatus.REDEEMED]

        # ── Feedback metrics ──
        avg_rating = 0.0
        sentiment_counts: dict[str, int] = {}
        if feedbacks:
            avg_rating = sum(f.rating for f in feedbacks) / len(feedbacks)
            for fb in feedbacks:
                s = fb.sentiment.value
                sentiment_counts[s] = sentiment_counts.get(s, 0) + 1

        # ── Referral metrics ──
        pending_referrals = [r for r in referrals if r.status == "pending"]
        converted_referrals = [r for r in referrals if r.status == "converted"]

        return {
            "status": "success",
            "message": "📊 Dashboard de engagement del club.",
            "dashboard": {
                "profiles": {
                    "total": len(profiles),
                    "by_level": level_counts,
                    "at_risk_members": at_risk,
                    "total_loyalty_points": total_points,
                    "total_spend_ytd": total_spend,
                },
                "campaigns": {
                    "total": len(campaigns),
                    "active": len(active_campaigns),
                    "total_conversions": total_conversions,
                },
                "rewards": {
                    "total": len(rewards),
                    "active": len(active_rewards),
                    "redeemed": len(redeemed),
                },
                "feedback": {
                    "total": len(feedbacks),
                    "average_rating": round(avg_rating, 1),
                    "sentiment_breakdown": sentiment_counts,
                },
                "referrals": {
                    "total": len(referrals),
                    "pending": len(pending_referrals),
                    "converted": len(converted_referrals),
                },
            },
        }
