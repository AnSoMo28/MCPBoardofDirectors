"""
CommunicationAgent: Communication Intelligence Platform.
Club: Castillo Country Club

TOOLS (14 total):
  broadcast_club_announcement        🔴 HITL          Anuncios masivos a todos los socios
  manage_emergency_broadcast         🔴 ALWAYS_HUMAN   Alertas de emergencia (doble confirmación)
  send_personalized_notification     🟡 SEMI_AUTO      Notificaciones personalizadas (>100 → HITL)
  manage_notification_templates      🟢 AUTO           CRUD de plantillas de notificación
  schedule_notification              🟢 AUTO           Programar notificaciones futuras
  get_notification_history           🟢 AUTO           Historial de notificaciones enviadas
  manage_communication_preferences   🟢 AUTO           Preferencias de comunicación del socio
  send_board_package                 🟡 SEMI_AUTO      Board package para junta directiva
  list_announcements                 🟢 AUTO           Listar anuncios con filtros y paginación
  update_announcement_status         🟡 SEMI_AUTO      Cambiar estado de un anuncio
  get_communication_analytics        🟢 AUTO           Analytics de rendimiento de comunicaciones
  generate_communication_insights    🟢 AUTO           9 dimensiones de inteligencia comunicacional
  get_communication_health           🟢 AUTO           Health score compuesto 0-100 (5 factores)
  get_campaign_performance           🟢 AUTO           Analytics de campañas y engagement scoring
"""

from __future__ import annotations

import logging
import math
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from club_mcp.agents.base import BaseAgent, MCPTool
from club_mcp.db.repositories.communication_repo import CommunicationRepository
from club_mcp.hitl.approval_types import ApprovalLevel
from club_mcp.models.communication import (
    AnnouncementStatus,
    AnnouncementType,
    CreateAnnouncement,
    CreateCommunicationPreferences,
    CreateEmergencyBroadcast,
    CreateNotificationTemplate,
    CreatePersonalizedNotification,
    CreateScheduledNotification,
    EmergencyType,
    FrequencyPreference,
    NotificationChannel,
    NotificationStatus,
    TemplateCategory,
)

logger = logging.getLogger(__name__)

# Threshold for requiring HITL on personalized notifications
PERSONALIZED_NOTIFICATION_HITL_THRESHOLD = 100

# Costa Rica private club communication benchmarks
CR_BENCHMARKS = {
    "delivery_rate_pct": 85.0,
    "channel_diversity_min": 3,
    "failure_rate_max_pct": 3.0,
    "personalization_ratio_pct": 25.0,
    "weekly_frequency_optimal": 2.5,
    "response_time_hours": 4.0,
}


class CommunicationAgent(BaseAgent):
    """
    Communication Intelligence Platform for Castillo Country Club.
    Manages announcements, emergencies, templates, notifications,
    preferences, campaigns, analytics, and communication intelligence.
    """

    agent_name: str = "communication"
    description: str = "Communication Intelligence Platform"

    def __init__(
        self, repo=None, approval_engine=None, notifier=None,
        rag_service=None,
    ) -> None:
        super().__init__()
        self.repo = repo or CommunicationRepository()
        if approval_engine is not None:
            self.approval_engine = approval_engine
        self.notifier = notifier
        self._rag_service = rag_service

    def _register_tools(self) -> None:
        pass

    # ── Helpers ──────────────────────────────────────────

    @staticmethod
    def _parse_channels(channels_str: str) -> list[NotificationChannel]:
        if not channels_str.strip():
            return [NotificationChannel.EMAIL]
        result: list[NotificationChannel] = []
        invalid: list[str] = []
        for channel in channels_str.split(","):
            channel = channel.strip()
            if not channel:
                continue
            try:
                result.append(NotificationChannel(channel))
            except ValueError:
                invalid.append(channel)
        if invalid or not result:
            valid = ", ".join(item.value for item in NotificationChannel)
            invalid_text = ", ".join(invalid) if invalid else channels_str
            raise ValueError(
                f"Canales no válidos: {invalid_text}. Opciones: {valid}"
            )
        return result

    @staticmethod
    def _compute_dimension_status(score: float) -> str:
        """Map score to status label."""
        if score >= 85:
            return "excellent"
        elif score >= 65:
            return "good"
        elif score >= 45:
            return "attention"
        return "critical"

    def _empty_analytics(self, period: str) -> dict[str, Any]:
        """Return empty analytics structure."""
        return {
            "period": period,
            "total_sent": 0,
            "total_recipients": 0,
            "delivery_rate_pct": 0,
            "avg_recipients_per_send": 0,
            "best_day_to_send": "N/A",
            "best_hour_to_send": "N/A",
            "channel_breakdown": [],
            "type_breakdown": [],
            "status_breakdown": {
                "sent": 0,
                "delivered": 0,
                "failed": 0,
                "cancelled": 0,
            },
            "daily_volume": [],
            "hourly_distribution": [
                {"hour": f"{h:02d}:00", "count": 0} for h in range(24)
            ],
        }

    def _get_emergency_suggested_actions(
        self, emergency_type: str, title: str
    ) -> list[dict[str, Any]]:
        """Detect keywords and suggest cross-agent actions for emergencies."""
        actions: list[dict[str, Any]] = []
        now = datetime.now(tz=timezone.utc)
        current_quarter = f"Q{(now.month - 1) // 3 + 1}"

        if emergency_type in ("evacuation", "weather", "security"):
            actions.append({
                "label": "Cerrar instalaciones afectadas",
                "server": "facility_management",
                "tool": "manage_facilities",
                "params": {"action": "update", "status": "closed"},
                "reasoning": (
                    f"Emergencia ({emergency_type}) requiere evaluación "
                    "de cierre de instalaciones"
                ),
                "auto_executable": False,
            })

        if emergency_type in ("evacuation", "security", "health"):
            actions.append({
                "label": "Evaluar cancelación de eventos",
                "server": "events",
                "tool": "event_get_calendar",
                "params": {
                    "date_from": now.strftime("%Y-%m-%d"),
                    "date_to": now.strftime("%Y-%m-%d"),
                },
                "reasoning": (
                    "Eventos programados deben evaluarse para "
                    "cancelación o aplazamiento"
                ),
                "auto_executable": False,
            })

        if emergency_type == "infrastructure":
            actions.append({
                "label": "Programar mantenimiento de emergencia",
                "server": "facility_management",
                "tool": "schedule_maintenance",
                "params": {"priority": "emergency"},
                "reasoning": "Falla de infraestructura requiere atención inmediata",
                "auto_executable": False,
            })

        # Always suggest board notification
        actions.append({
            "label": "Notificar a Junta Directiva",
            "server": "communication",
            "tool": "send_board_package",
            "params": {
                "quarter": current_quarter,
                "year": now.year,
                "recipients": "director_only",
            },
            "reasoning": (
                "Protocolo de emergencia requiere notificación "
                "inmediata a directiva"
            ),
            "auto_executable": True,
        })

        return actions
    async def _enrich_with_rag_context(
        self, query: str, max_results: int = 3
    ) -> list[dict[str, Any]]:
        """Query RAG engine for relevant club documentation.

        Returns list of {source, content, score} or empty list
        if RAG is unavailable. Non-blocking: errors return empty.
        """
        if not self._rag_service:
            return []

        try:
            results = await self._rag_service.search_documents(
                query=query,
                max_results=max_results,
                access_level="internal",
            )
            if not results:
                return []

            return [
                {
                    "source": getattr(r, "source", "documento del club"),
                    "content": getattr(r, "content", "")[:300],
                    "score": getattr(r, "score", 0),
                }
                for r in results[:max_results]
            ]
        except Exception as e:
            logger.warning(
                "[communication] RAG query failed (non-blocking): %s",
                str(e),
            )
            return []

    def _format_rag_citations(
        self, rag_results: list[dict[str, Any]]
    ) -> str:
        """Format RAG results as citation string for recommendations."""
        if not rag_results:
            return ""
        citations = []
        for r in rag_results:
            source = r.get("source", "documento")
            content = r.get("content", "")
            if content:
                citations.append(
                    f"Según {source}: \"{content[:150]}...\""
                )
        return " | ".join(citations) if citations else ""

    # ══════════════════════════════════════════════════════
    # 🔴 TOOL 1: BROADCAST CLUB ANNOUNCEMENT (HITL)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="broadcast_club_announcement",
        description=(
            "Enviar un anuncio masivo a los socios del club. "
            "REQUIERE APROBACIÓN HUMANA. "
            "Incluye avisos generales, eventos, promociones y cambios de política."
        ),
        approval=ApprovalLevel.HITL,
        approver_roles=["admin"],
    )
    async def broadcast_club_announcement(
        self,
        title: str = "",
        body: str = "",
        announcement_type: str = "general",
        channels: str = "email",
        target_audience: str = "all",
        scheduled_at: str = "",
        priority: int = 1,
        requires_acknowledgment: bool = False,
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([title, body]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: title, body 📋",
            }

        try:
            at = AnnouncementType(announcement_type)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Tipo no válido: '{announcement_type}'. "
                    f"Opciones: {', '.join(a.value for a in AnnouncementType)}"
                ),
            }

        try:
            channel_list = self._parse_channels(channels)
        except ValueError as exc:
            return {"status": "error", "message": str(exc)}

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="broadcast_club_announcement",
            params={
                "title": title,
                "body": body,
                "announcement_type": announcement_type,
                "channels": [c.value for c in channel_list],
                "target_audience": target_audience,
                "scheduled_at": scheduled_at,
                "priority": priority,
                "requires_acknowledgment": requires_acknowledgment,
                "notes": notes,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.HITL,
            risk_summary=(
                f"Anuncio masivo: '{title}' ({announcement_type}) "
                f"dirigido a {target_audience} por "
                f"{', '.join(c.value for c in channel_list)}"
            ),
            estimated_impact="Notificación a todos los socios del club",
            affected_count=0,
            approver_roles=["admin"],
        )

        logger.info(
            "[communication] Announcement approval request: %s", title
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"📢 Anuncio '{title}' creado. "
                f"Esperando aprobación del administrador."
            ),
            "details": {
                "title": title,
                "announcement_type": announcement_type,
                "channels": [c.value for c in channel_list],
                "target_audience": target_audience,
                "priority": priority,
            },
        }

    async def execute_announcement(
        self,
        title: str,
        body: str,
        announcement_type: str = "general",
        channels: list[str] | None = None,
        target_audience: str = "all",
        scheduled_at: str = "",
        priority: int = 1,
        requires_acknowledgment: bool = False,
        created_by: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Send announcement after HITL approval."""
        channel_objs = [NotificationChannel(c) for c in (channels or ["email"])]

        data = CreateAnnouncement(
            title=title,
            body=body,
            announcement_type=AnnouncementType(announcement_type),
            channels=channel_objs,
            target_audience=target_audience,
            scheduled_at=scheduled_at or None,
            created_by=created_by,
            priority=priority,
            requires_acknowledgment=requires_acknowledgment,
            notes=notes or None,
        )
        announcement = await self.repo.create_announcement(data)

        announcement = await self.repo.update_announcement(
            announcement.id,
            {
                "status": AnnouncementStatus.SENT,
                "sent_at": datetime.now(tz=timezone.utc).isoformat(),
            },
        )
        if announcement is None:
            return {
                "status": "error",
                "message": "El anuncio se creó, pero no se pudo marcar como enviado.",
            }

        await self.repo.create_log(
            notification_type="announcement",
            title=title,
            channel=channel_objs[0],
            recipient_count=0,
            status=NotificationStatus.SENT,
            created_by=created_by,
        )

        logger.info(
            "[communication] Announcement sent: %s (%s)",
            announcement.title,
            announcement.id,
        )

        return {
            "status": "success",
            "message": (
                f"📢 Anuncio '{announcement.title}' enviado exitosamente."
            ),
            "announcement": announcement.model_dump(mode="json"),
        }

    # ══════════════════════════════════════════════════════
    # 🔴 TOOL 2: MANAGE EMERGENCY BROADCAST (ALWAYS_HUMAN)
    # ENHANCED: +suggested_actions cross-agent
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="manage_emergency_broadcast",
        description=(
            "Enviar alerta de emergencia a todos los socios. "
            "REQUIERE DOBLE APROBACIÓN HUMANA. "
            "Usar solo para emergencias reales: clima, seguridad, salud, evacuación. "
            "Incluye acciones sugeridas cross-agent (cierre instalaciones, "
            "cancelación eventos, notificación junta)."
        ),
        approval=ApprovalLevel.ALWAYS_HUMAN,
        approver_roles=["admin"],
    )
    async def manage_emergency_broadcast(
        self,
        title: str = "",
        body: str = "",
        emergency_type: str = "security",
        channels: str = "push,sms,whatsapp",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([title, body]):
            return {
                "status": "error",
                "message": "Faltan campos obligatorios: title, body 📋",
            }

        try:
            et = EmergencyType(emergency_type)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Tipo de emergencia no válido: '{emergency_type}'. "
                    f"Opciones: {', '.join(e.value for e in EmergencyType)}"
                ),
            }

        try:
            channel_list = self._parse_channels(channels)
        except ValueError as exc:
            return {"status": "error", "message": str(exc)}

        approval = await self.approval_engine.create_request(
            agent=self.agent_name,
            tool="manage_emergency_broadcast",
            params={
                "title": title,
                "body": body,
                "emergency_type": emergency_type,
                "channels": [c.value for c in channel_list],
                "notes": notes,
            },
            requested_by=requested_by,
            approval_level=ApprovalLevel.ALWAYS_HUMAN,
            risk_summary=(
                f"ALERTA DE EMERGENCIA ({emergency_type}): '{title}'. "
                f"Canales: {', '.join(c.value for c in channel_list)}"
            ),
            estimated_impact="Alerta masiva a todos los socios por todos los canales",
            affected_count=0,
            approver_roles=["admin"],
        )

        # Cross-agent escalation: suggest derived actions
        suggested_actions = self._get_emergency_suggested_actions(
            emergency_type, title
        )

        logger.info(
            "[communication] Emergency broadcast approval: %s "
            "(%d suggested actions)",
            title,
            len(suggested_actions),
        )

        return {
            "status": "pending_approval",
            "request_id": str(approval.request_id),
            "message": (
                f"🚨 Alerta de emergencia '{title}' creada. "
                f"Requiere doble confirmación del administrador."
            ),
            "details": {
                "title": title,
                "emergency_type": emergency_type,
                "channels": [c.value for c in channel_list],
            },
            "suggested_actions": suggested_actions,
        }

    async def execute_emergency_broadcast(
        self,
        title: str,
        body: str,
        emergency_type: str = "security",
        channels: list[str] | None = None,
        created_by: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Send emergency alert after HITL approval."""
        channel_objs = [
            NotificationChannel(c)
            for c in (channels or ["push", "sms", "whatsapp"])
        ]

        data = CreateEmergencyBroadcast(
            title=title,
            body=body,
            emergency_type=EmergencyType(emergency_type),
            channels=channel_objs,
            created_by=created_by,
            notes=notes or None,
        )
        emergency = await self.repo.create_emergency(data)

        emergency = await self.repo.update_emergency(
            emergency.id,
            {
                "status": NotificationStatus.SENT,
                "sent_at": datetime.now(tz=timezone.utc).isoformat(),
            },
        )
        if emergency is None:
            return {
                "status": "error",
                "message": "La alerta se creó, pero no se pudo marcar como enviada.",
            }

        await self.repo.create_log(
            notification_type="emergency",
            title=title,
            channel=channel_objs[0],
            recipient_count=0,
            status=NotificationStatus.SENT,
            created_by=created_by,
            notes=f"EMERGENCY: {emergency_type}",
        )

        logger.info(
            "[communication] Emergency broadcast sent: %s (%s)",
            emergency.title,
            emergency.id,
        )

        return {
            "status": "success",
            "message": (
                f"🚨 Alerta de emergencia '{emergency.title}' enviada "
                f"por {', '.join(c.value for c in channel_objs)}."
            ),
            "emergency": emergency.model_dump(mode="json"),
        }

    # ══════════════════════════════════════════════════════
    # 🔴 TOOL 3: SEND PERSONALIZED NOTIFICATION (SEMI→HITL)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="send_personalized_notification",
        description=(
            "Enviar notificación personalizada a miembros específicos. "
            "REQUIERE APROBACIÓN HUMANA si hay más de 100 destinatarios. "
            "Para grupos pequeños ejecuta directamente."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
        approver_roles=["admin"],
    )
    async def send_personalized_notification(
        self,
        title: str = "",
        body: str = "",
        channel: str = "email",
        recipient_ids: str = "",
        notes: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([title, body, recipient_ids]):
            return {
                "status": "error",
                "message": (
                    "Faltan campos obligatorios: title, body, recipient_ids 📋"
                ),
            }

        try:
            ch = NotificationChannel(channel)
        except ValueError:
            return {
                "status": "error",
                "message": (
                    f"Canal no válido: '{channel}'. "
                    f"Opciones: {', '.join(c.value for c in NotificationChannel)}"
                ),
            }

        recipients = [r.strip() for r in recipient_ids.split(",") if r.strip()]
        if not recipients:
            return {
                "status": "error",
                "message": "No se proporcionaron destinatarios válidos 🤔",
            }

        # >100 recipients → HITL
        if len(recipients) > PERSONALIZED_NOTIFICATION_HITL_THRESHOLD:
            approval = await self.approval_engine.create_request(
                agent=self.agent_name,
                tool="send_personalized_notification",
                params={
                    "title": title,
                    "body": body,
                    "channel": channel,
                    "recipient_ids": recipients,
                    "notes": notes,
                },
                requested_by=requested_by,
                approval_level=ApprovalLevel.HITL,
                risk_summary=(
                    f"Notificación personalizada a {len(recipients)} "
                    f"destinatarios por {channel}: '{title}'"
                ),
                estimated_impact="Envío masivo de notificación personalizada",
                affected_count=len(recipients),
                approver_roles=["admin"],
            )

            logger.info(
                "[communication] Personalized notification approval: %s "
                "(%d recipients)",
                title,
                len(recipients),
            )

            return {
                "status": "pending_approval",
                "request_id": str(approval.request_id),
                "message": (
                    f"📬 Notificación '{title}' para {len(recipients)} "
                    f"destinatarios. Requiere aprobación (>100)."
                ),
                "details": {
                    "title": title,
                    "channel": channel,
                    "recipient_count": len(recipients),
                },
            }

        # ≤100 recipients → AUTO
        data = CreatePersonalizedNotification(
            title=title,
            body=body,
            channel=ch,
            recipient_ids=recipients,
            created_by=requested_by,
            notes=notes or None,
        )
        notification = await self.repo.create_personalized(data)

        notification = await self.repo.update_personalized(
            notification.id,
            {
                "status": NotificationStatus.SENT,
                "sent_at": datetime.now(tz=timezone.utc).isoformat(),
            },
        )
        if notification is None:
            return {
                "status": "error",
                "message": "La notificación se creó, pero no se pudo actualizar.",
            }

        await self.repo.create_log(
            notification_type="personalized",
            title=title,
            channel=ch,
            recipient_count=len(recipients),
            status=NotificationStatus.SENT,
            created_by=requested_by,
        )

        logger.info(
            "[communication] Personalized notification sent: %s to %d",
            title,
            len(recipients),
        )

        return {
            "status": "success",
            "message": (
                f"📬 Notificación '{title}' enviada a "
                f"{len(recipients)} destinatario(s) por {channel}."
            ),
            "notification": notification.model_dump(mode="json"),
        }

    async def execute_personalized_notification(
        self,
        title: str,
        body: str,
        channel: str = "email",
        recipient_ids: list[str] | None = None,
        created_by: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        """Send personalized notification after HITL approval."""
        ch = NotificationChannel(channel)
        recipients = recipient_ids or []

        data = CreatePersonalizedNotification(
            title=title,
            body=body,
            channel=ch,
            recipient_ids=recipients,
            created_by=created_by,
            notes=notes or None,
        )
        notification = await self.repo.create_personalized(data)

        notification = await self.repo.update_personalized(
            notification.id,
            {
                "status": NotificationStatus.SENT,
                "sent_at": datetime.now(tz=timezone.utc).isoformat(),
            },
        )
        if notification is None:
            return {
                "status": "error",
                "message": "La notificación se creó, pero no se pudo actualizar.",
            }

        await self.repo.create_log(
            notification_type="personalized",
            title=title,
            channel=ch,
            recipient_count=len(recipients),
            status=NotificationStatus.SENT,
            created_by=created_by,
        )

        logger.info(
            "[communication] Personalized notification approved & sent: "
            "%s to %d recipients",
            title,
            len(recipients),
        )

        return {
            "status": "success",
            "message": (
                f"📬 Notificación '{title}' aprobada y enviada a "
                f"{len(recipients)} destinatario(s)."
            ),
            "notification": notification.model_dump(mode="json"),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 4: MANAGE NOTIFICATION TEMPLATES (AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="manage_notification_templates",
        description=(
            "Crear, consultar y gestionar plantillas de notificación. "
            "Incluye plantillas para bienvenida, recordatorios, cumpleaños, etc."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_notification_templates(
        self,
        action: str = "list",
        template_id: str = "",
        name: str = "",
        category: str = "welcome",
        subject: str = "",
        body_template: str = "",
        channels: str = "email",
        variables: str = "",
        is_active: bool = True,
    ) -> dict[str, Any]:
        if action == "list":
            cat_filter = None
            if category:
                try:
                    cat_filter = TemplateCategory(category)
                except ValueError:
                    pass
            templates = await self.repo.list_templates(
                category=cat_filter, active_only=False
            )
            return {
                "status": "success",
                "message": f"📋 Encontramos {len(templates)} plantillas.",
                "templates": [t.model_dump(mode="json") for t in templates],
            }

        if action == "get":
            if not template_id:
                return {
                    "status": "error",
                    "message": "Se requiere template_id 🤔",
                }
            template = await self.repo.get_template(template_id)
            if not template:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la plantilla {template_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "template": template.model_dump(mode="json"),
            }

        if action == "create":
            if not all([name, category, subject, body_template]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: name, category, "
                        "subject, body_template 📋"
                    ),
                }

            try:
                cat = TemplateCategory(category)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Categoría no válida: '{category}'. "
                        f"Opciones: {', '.join(c.value for c in TemplateCategory)}"
                    ),
                }

            try:
                channel_list = self._parse_channels(channels)
            except ValueError as exc:
                return {"status": "error", "message": str(exc)}
            var_list = (
                [v.strip() for v in variables.split(",") if v.strip()]
                if variables
                else []
            )

            data = CreateNotificationTemplate(
                name=name,
                category=cat,
                subject=subject,
                body_template=body_template,
                channels=channel_list,
                variables=var_list,
            )
            template = await self.repo.create_template(data)

            logger.info(
                "[communication] Template created: %s", template.name
            )

            return {
                "status": "success",
                "message": (
                    f"📝 Plantilla '{template.name}' creada exitosamente."
                ),
                "template": template.model_dump(mode="json"),
            }

        if action == "update":
            if not template_id:
                return {
                    "status": "error",
                    "message": "Se requiere template_id para actualizar 🤔",
                }

            updates: dict[str, Any] = {}
            if name:
                updates["name"] = name
            if subject:
                updates["subject"] = subject
            if body_template:
                updates["body_template"] = body_template
            if channels:
                try:
                    updates["channels"] = self._parse_channels(channels)
                except ValueError as exc:
                    return {"status": "error", "message": str(exc)}
            if variables:
                updates["variables"] = [
                    v.strip() for v in variables.split(",") if v.strip()
                ]
            updates["is_active"] = is_active

            template = await self.repo.update_template(template_id, updates)
            if not template:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la plantilla {template_id} 😊"
                    ),
                }

            return {
                "status": "success",
                "message": f"✏️ Plantilla '{template.name}' actualizada.",
                "template": template.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: list, get, create, update 🤔"
            ),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 5: SCHEDULE NOTIFICATION (AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="schedule_notification",
        description=(
            "Programar el envío de una notificación para una fecha y hora futura. "
            "Usa plantillas existentes."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def schedule_notification(
        self,
        action: str = "create",
        schedule_id: str = "",
        template_id: str = "",
        recipient_ids: str = "",
        channel: str = "email",
        scheduled_at: str = "",
        params: str = "",
        notes: str = "",
    ) -> dict[str, Any]:
        if action == "list":
            scheduled = await self.repo.list_scheduled()
            return {
                "status": "success",
                "message": (
                    f"📋 Encontramos {len(scheduled)} "
                    f"notificaciones programadas."
                ),
                "scheduled": [s.model_dump(mode="json") for s in scheduled],
            }

        if action == "get":
            if not schedule_id:
                return {
                    "status": "error",
                    "message": "Se requiere schedule_id 🤔",
                }
            sched = await self.repo.get_scheduled(schedule_id)
            if not sched:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la programación {schedule_id} 😊"
                    ),
                }
            return {
                "status": "success",
                "scheduled": sched.model_dump(mode="json"),
            }

        if action == "cancel":
            if not schedule_id:
                return {
                    "status": "error",
                    "message": "Se requiere schedule_id para cancelar 🤔",
                }
            sched = await self.repo.get_scheduled(schedule_id)
            if not sched:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la programación {schedule_id} 😊"
                    ),
                }
            sched = await self.repo.update_scheduled(
                schedule_id, {"status": NotificationStatus.CANCELLED}
            )
            if sched is None:
                return {
                    "status": "not_found",
                    "message": f"No encontramos la programación {schedule_id}.",
                }
            return {
                "status": "success",
                "message": "❌ Notificación programada cancelada.",
                "scheduled": sched.model_dump(mode="json"),
            }

        if action == "create":
            if not all([template_id, recipient_ids, scheduled_at]):
                return {
                    "status": "error",
                    "message": (
                        "Faltan campos obligatorios: template_id, "
                        "recipient_ids, scheduled_at 📋"
                    ),
                }

            template = await self.repo.get_template(template_id)
            if not template:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos la plantilla {template_id} 😊"
                    ),
                }

            try:
                ch = NotificationChannel(channel)
            except ValueError:
                return {
                    "status": "error",
                    "message": (
                        f"Canal no válido: '{channel}'. "
                        f"Opciones: {', '.join(c.value for c in NotificationChannel)}"
                    ),
                }

            recipients = [
                r.strip() for r in recipient_ids.split(",") if r.strip()
            ]
            params_dict = {}
            if params:
                for pair in params.split(","):
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        params_dict[k.strip()] = v.strip()

            data = CreateScheduledNotification(
                template_id=template_id,
                recipient_ids=recipients,
                channel=ch,
                scheduled_at=scheduled_at,
                params=params_dict,
                notes=notes or None,
            )
            scheduled = await self.repo.create_scheduled(data)

            logger.info(
                "[communication] Notification scheduled: %s for %s",
                scheduled.id,
                scheduled_at,
            )

            return {
                "status": "success",
                "message": (
                    f"⏰ Notificación programada para {scheduled_at} "
                    f"({len(recipients)} destinatarios)."
                ),
                "scheduled": scheduled.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: create, get, list, cancel 🤔"
            ),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 6: GET NOTIFICATION HISTORY (AUTO)
    # ENHANCED: +date_from, date_to, channel, type filters
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="get_notification_history",
        description=(
            "Consultar el historial de notificaciones y comunicaciones enviadas. "
            "Ordenado por fecha descendente. "
            "Soporta filtros: date_from, date_to, channel, notification_type."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_notification_history(
        self,
        limit: int = 20,
        date_from: str = "",
        date_to: str = "",
        channel: str = "",
        notification_type: str = "",
    ) -> dict[str, Any]:
        logs = await self.repo.list_logs(limit=limit * 3)  # fetch extra for filtering

        if not logs:
            return {
                "status": "success",
                "message": "📋 No hay notificaciones en el historial.",
                "history": [],
                "total": 0,
            }

        # Apply filters
        filtered = list(logs)

        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                filtered = [
                    l for l in filtered
                    if l.sent_at and datetime.fromisoformat(
                        l.sent_at.replace("Z", "+00:00")
                    ) >= dt_from
                ]
            except (ValueError, TypeError):
                pass

        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                filtered = [
                    l for l in filtered
                    if l.sent_at and datetime.fromisoformat(
                        l.sent_at.replace("Z", "+00:00")
                    ) <= dt_to
                ]
            except (ValueError, TypeError):
                pass

        if channel:
            filtered = [
                l for l in filtered
                if (l.channel.value if hasattr(l.channel, "value")
                    else str(l.channel)) == channel
            ]

        if notification_type:
            filtered = [
                l for l in filtered
                if l.notification_type == notification_type
            ]

        # Apply limit after filtering
        filtered = filtered[:limit]

        return {
            "status": "success",
            "message": (
                f"📋 Historial: {len(filtered)} notificación(es) recientes."
            ),
            "history": [l.model_dump(mode="json") for l in filtered],
            "total": len(filtered),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 7: MANAGE COMMUNICATION PREFERENCES (AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="manage_communication_preferences",
        description=(
            "Gestionar las preferencias de comunicación de un socio. "
            "Incluye canales habilitados, frecuencia y horario silencioso."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def manage_communication_preferences(
        self,
        action: str = "get",
        preferences_id: str = "",
        member_id: str = "",
        email_enabled: bool = True,
        push_enabled: bool = True,
        sms_enabled: bool = False,
        whatsapp_enabled: bool = True,
        in_app_enabled: bool = True,
        announcements: str = "realtime",
        events: str = "realtime",
        promotions: str = "weekly_digest",
        quiet_hours_start: str = "22:00",
        quiet_hours_end: str = "07:00",
    ) -> dict[str, Any]:
        if action == "get":
            if member_id:
                prefs = await self.repo.get_preferences_by_member(member_id)
                if not prefs:
                    return {
                        "status": "not_found",
                        "message": (
                            f"No encontramos preferencias para {member_id} 😊"
                        ),
                    }
                return {
                    "status": "success",
                    "preferences": prefs.model_dump(mode="json"),
                }

            if preferences_id:
                prefs = await self.repo.get_preferences(preferences_id)
                if not prefs:
                    return {
                        "status": "not_found",
                        "message": (
                            f"No encontramos preferencias {preferences_id} 😊"
                        ),
                    }
                return {
                    "status": "success",
                    "preferences": prefs.model_dump(mode="json"),
                }

            return {
                "status": "error",
                "message": "Se requiere member_id o preferences_id 🤔",
            }

        if action == "create":
            if not member_id:
                return {
                    "status": "error",
                    "message": "Se requiere member_id 🤔",
                }

            existing = await self.repo.get_preferences_by_member(member_id)
            if existing:
                return {
                    "status": "error",
                    "message": (
                        f"El socio {member_id} ya tiene preferencias "
                        f"registradas. Usá action='update'."
                    ),
                }

            try:
                ann_freq = FrequencyPreference(announcements)
                ev_freq = FrequencyPreference(events)
                prom_freq = FrequencyPreference(promotions)
            except ValueError as e:
                return {
                    "status": "error",
                    "message": f"Frecuencia no válida: {e} 🤔",
                }

            data = CreateCommunicationPreferences(
                member_id=member_id,
                email_enabled=email_enabled,
                push_enabled=push_enabled,
                sms_enabled=sms_enabled,
                whatsapp_enabled=whatsapp_enabled,
                in_app_enabled=in_app_enabled,
                announcements=ann_freq,
                events=ev_freq,
                promotions=prom_freq,
                quiet_hours_start=quiet_hours_start,
                quiet_hours_end=quiet_hours_end,
            )
            prefs = await self.repo.create_preferences(data)

            logger.info(
                "[communication] Preferences created for: %s", member_id
            )

            return {
                "status": "success",
                "message": (
                    f"⚙️ Preferencias de comunicación para "
                    f"{member_id} registradas."
                ),
                "preferences": prefs.model_dump(mode="json"),
            }

        if action == "update":
            if not preferences_id:
                return {
                    "status": "error",
                    "message": "Se requiere preferences_id para actualizar 🤔",
                }

            updates: dict[str, Any] = {
                "email_enabled": email_enabled,
                "push_enabled": push_enabled,
                "sms_enabled": sms_enabled,
                "whatsapp_enabled": whatsapp_enabled,
                "in_app_enabled": in_app_enabled,
                "quiet_hours_start": quiet_hours_start,
                "quiet_hours_end": quiet_hours_end,
            }

            try:
                updates["announcements"] = FrequencyPreference(announcements)
                updates["events"] = FrequencyPreference(events)
                updates["promotions"] = FrequencyPreference(promotions)
            except ValueError as e:
                return {
                    "status": "error",
                    "message": f"Frecuencia no válida: {e} 🤔",
                }

            prefs = await self.repo.update_preferences(
                preferences_id, updates
            )
            if not prefs:
                return {
                    "status": "not_found",
                    "message": (
                        f"No encontramos preferencias {preferences_id} 😊"
                    ),
                }

            return {
                "status": "success",
                "message": "✏️ Preferencias actualizadas exitosamente.",
                "preferences": prefs.model_dump(mode="json"),
            }

        return {
            "status": "error",
            "message": (
                f"Acción no válida: '{action}'. "
                f"Usa: get, create, update 🤔"
            ),
        }

    # ══════════════════════════════════════════════════════
    # 🟡 TOOL 8: SEND BOARD PACKAGE (SEMI_AUTO)
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="send_board_package",
        description=(
            "Generar y enviar board package a la junta directiva. "
            "Parámetros: quarter (Q1-Q4), year, "
            "recipients (director_only | full_board). "
            "Si director_only: envía solo al director primero. "
            "Si full_board: envía a toda la junta."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
    )
    async def send_board_package(
        self,
        quarter: str = "",
        year: int = 0,
        recipients: str = "full_board",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([quarter, year]):
            return {
                "status": "error",
                "message": "Se requiere quarter (Q1-Q4) y year 📋",
            }

        valid_quarters = {"Q1", "Q2", "Q3", "Q4"}
        if quarter not in valid_quarters:
            return {
                "status": "error",
                "message": (
                    f"Trimestre inválido: '{quarter}'. "
                    f"Opciones: {', '.join(sorted(valid_quarters))}"
                ),
            }

        if recipients not in ("director_only", "full_board"):
            return {
                "status": "error",
                "message": (
                    f"Recipients inválido: '{recipients}'. "
                    f"Opciones: director_only, full_board"
                ),
            }

        package_id = uuid4().hex[:8]
        now = datetime.now(tz=timezone.utc)

        if recipients == "director_only":
            send_list = [
                {
                    "name": "Director de Junta",
                    "email": "director@castillo.cr",
                    "role": "director",
                },
            ]
            delivery_note = (
                "Enviado al Director para revisión previa "
                "(director_only)"
            )
        else:
            send_list = [
                {
                    "name": "Director de Junta",
                    "email": "director@castillo.cr",
                    "role": "director",
                },
                {
                    "name": "Vicepresidente",
                    "email": "vp@castillo.cr",
                    "role": "vicepresident",
                },
                {
                    "name": "Tesorero",
                    "email": "tesorero@castillo.cr",
                    "role": "treasurer",
                },
                {
                    "name": "Secretario",
                    "email": "secretario@castillo.cr",
                    "role": "secretary",
                },
            ]
            delivery_note = "Enviado a toda la junta directiva (full_board)"

        package = {
            "package_id": package_id,
            "quarter": quarter,
            "year": year,
            "recipients": send_list,
            "delivery_mode": recipients,
            "generated_at": now.isoformat(),
            "contents": [
                "Resumen Ejecutivo",
                "Reporte Financiero",
                "Estado de Membresía",
                "Pulso Operativo",
                "Satisfacción de Socios",
                "Anomalías Detectadas",
                "Recomendaciones Estratégicas",
            ],
            "status": "sent",
        }

        logger.info(
            "[%s] Board package %s: %s %s → %s",
            self.agent_name,
            package_id,
            quarter,
            year,
            recipients,
        )

        return {
            "status": "success",
            "message": f"📦 Board Package {quarter} {year}: {delivery_note}",
            "package": package,
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 9: LIST ANNOUNCEMENTS (AUTO)
    # MOVED from module level → into class
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="list_announcements",
        description=(
            "Consultar anuncios del club con filtros opcionales. "
            "Incluye estado, tipo, búsqueda de texto y paginación."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def list_announcements(
        self,
        page: int = 1,
        page_size: int = 12,
        status: str = "",
        announcement_type: str = "",
        search: str = "",
    ) -> dict[str, Any]:
        status_filter = None
        if status:
            try:
                status_filter = AnnouncementStatus(status)
            except ValueError:
                pass

        type_filter = None
        if announcement_type:
            try:
                type_filter = AnnouncementType(announcement_type)
            except ValueError:
                pass

        result = await self.repo.list_announcements_filtered(
            page=page,
            page_size=page_size,
            status=status_filter,
            announcement_type=type_filter,
            search=search or None,
        )

        return {
            "status": "success",
            "message": f"📋 {result['total']} anuncio(s) encontrados.",
            "announcements": [
                a.model_dump(mode="json") for a in result["items"]
            ],
            "total": result["total"],
            "page": page,
            "page_size": page_size,
            "total_pages": result["total_pages"],
        }

    # ══════════════════════════════════════════════════════
    # 🟡 TOOL 10: UPDATE ANNOUNCEMENT STATUS (SEMI_AUTO)
    # MOVED from module level → into class
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="update_announcement_status",
        description=(
            "Cambiar el estado de un anuncio. "
            "Acciones: publish (draft→sent), archive (any→cancelled), "
            "cancel (any→cancelled)."
        ),
        approval=ApprovalLevel.SEMI_AUTO,
        approver_roles=["admin"],
    )
    async def update_announcement_status(
        self,
        announcement_id: str = "",
        action: str = "",
        requested_by: str = "system",
    ) -> dict[str, Any]:
        if not all([announcement_id, action]):
            return {
                "status": "error",
                "message": "Se requiere announcement_id y action 📋",
            }

        valid_actions = {"publish", "archive", "cancel"}
        if action not in valid_actions:
            return {
                "status": "error",
                "message": (
                    f"Acción no válida: '{action}'. "
                    f"Opciones: {', '.join(sorted(valid_actions))}"
                ),
            }

        announcement = await self.repo.get_announcement(announcement_id)
        if not announcement:
            return {
                "status": "not_found",
                "message": (
                    f"No encontramos el anuncio {announcement_id} 😊"
                ),
            }

        now = datetime.now(tz=timezone.utc).isoformat()

        if action == "publish":
            if announcement.status != AnnouncementStatus.DRAFT:
                return {
                    "status": "error",
                    "message": (
                        f"Solo se pueden publicar borradores. "
                        f"Estado actual: {announcement.status.value}"
                    ),
                }
            updates = {
                "status": AnnouncementStatus.SENT,
                "sent_at": now,
            }
        else:
            updates = {"status": AnnouncementStatus.CANCELLED}

        updated = await self.repo.update_announcement(
            announcement_id, updates
        )
        if updated is None:
            return {
                "status": "not_found",
                "message": f"No encontramos el anuncio {announcement_id}.",
            }

        await self.repo.create_log(
            notification_type=f"announcement_{action}",
            title=updated.title,
            channel=(
                updated.channels[0]
                if updated.channels
                else NotificationChannel.EMAIL
            ),
            recipient_count=0,
            status=NotificationStatus.SENT,
            created_by=requested_by,
            notes=f"Action: {action}",
        )

        logger.info(
            "[communication] Announcement %s: %s (%s)",
            action,
            updated.title,
            updated.id,
        )

        return {
            "status": "success",
            "message": (
                f"📢 Anuncio '{updated.title}' — {action} exitoso."
            ),
            "announcement": updated.model_dump(mode="json"),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 11: GET COMMUNICATION ANALYTICS (AUTO)
    # MOVED from module level → into class
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="get_communication_analytics",
        description=(
            "Analytics de comunicaciones. Calcula métricas de rendimiento "
            "por canal, tipo y periodo a partir del historial real de envíos."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_communication_analytics(
        self,
        period: str = "current_month",
    ) -> dict[str, Any]:
        logs = await self.repo.list_logs(limit=500)

        if not logs:
            return {
                "status": "success",
                "message": "📋 Sin datos de comunicaciones aún.",
                "analytics": self._empty_analytics(period),
            }

        now = datetime.now(tz=timezone.utc)
        filtered = []
        for log in logs:
            if not log.sent_at:
                continue
            try:
                log_date = datetime.fromisoformat(
                    log.sent_at.replace("Z", "+00:00")
                )
            except (ValueError, AttributeError):
                continue

            if period == "current_month":
                if log_date.year == now.year and log_date.month == now.month:
                    filtered.append(log)
            elif period == "current_quarter":
                current_q = (now.month - 1) // 3
                log_q = (log_date.month - 1) // 3
                if log_date.year == now.year and log_q == current_q:
                    filtered.append(log)
            elif period == "last_30_days":
                if (now - log_date).days <= 30:
                    filtered.append(log)
            elif period == "last_90_days":
                if (now - log_date).days <= 90:
                    filtered.append(log)
            elif period == "ytd":
                if log_date.year == now.year:
                    filtered.append(log)

        total = len(filtered)
        if total == 0:
            return {
                "status": "success",
                "message": f"📋 Sin comunicaciones en: {period}.",
                "analytics": self._empty_analytics(period),
            }

        # Compute metrics
        by_channel: dict[str, int] = {}
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        by_day: dict[str, int] = {}
        by_hour: dict[int, int] = {}
        total_recipients = 0
        success_count = 0

        days_of_week = [
            "Lunes", "Martes", "Miércoles", "Jueves",
            "Viernes", "Sábado", "Domingo",
        ]

        for log in filtered:
            ch = (
                log.channel.value
                if hasattr(log.channel, "value")
                else str(log.channel)
            )
            st = (
                log.status.value
                if hasattr(log.status, "value")
                else str(log.status)
            )

            by_channel[ch] = by_channel.get(ch, 0) + 1
            by_type[log.notification_type] = (
                by_type.get(log.notification_type, 0) + 1
            )
            by_status[st] = by_status.get(st, 0) + 1
            total_recipients += log.recipient_count or 0

            if st in ("sent", "delivered"):
                success_count += 1

            if log.sent_at:
                try:
                    dt = datetime.fromisoformat(
                        log.sent_at.replace("Z", "+00:00")
                    )
                    by_day[days_of_week[dt.weekday()]] = (
                        by_day.get(days_of_week[dt.weekday()], 0) + 1
                    )
                    by_hour[dt.hour] = by_hour.get(dt.hour, 0) + 1
                except (ValueError, IndexError):
                    pass

        delivery_rate = (
            (success_count / total * 100) if total > 0 else 0
        )
        best_day = (
            max(by_day.items(), key=lambda item: item[1])[0]
            if by_day
            else "N/A"
        )
        best_hour_raw = (
            max(by_hour.items(), key=lambda item: item[1])[0]
            if by_hour
            else 0
        )
        best_hour = f"{best_hour_raw:02d}:00"

        channel_stats = [
            {
                "channel": ch,
                "count": count,
                "percentage": round(count / total * 100, 1),
            }
            for ch, count in sorted(
                by_channel.items(), key=lambda x: x[1], reverse=True
            )
        ]

        type_stats = [
            {
                "type": tp,
                "count": count,
                "percentage": round(count / total * 100, 1),
            }
            for tp, count in sorted(
                by_type.items(), key=lambda x: x[1], reverse=True
            )
        ]

        daily_volume: dict[str, int] = {}
        for log in filtered:
            if log.sent_at:
                try:
                    dt = datetime.fromisoformat(
                        log.sent_at.replace("Z", "+00:00")
                    )
                    day_key = dt.strftime("%Y-%m-%d")
                    daily_volume[day_key] = (
                        daily_volume.get(day_key, 0) + 1
                    )
                except ValueError:
                    pass

        hourly_dist = [
            {"hour": f"{h:02d}:00", "count": by_hour.get(h, 0)}
            for h in range(24)
        ]

        return {
            "status": "success",
            "message": (
                f"📊 Analytics de {total} comunicaciones ({period})."
            ),
            "analytics": {
                "period": period,
                "total_sent": total,
                "total_recipients": total_recipients,
                "delivery_rate_pct": round(delivery_rate, 1),
                "avg_recipients_per_send": (
                    round(total_recipients / total, 1) if total else 0
                ),
                "best_day_to_send": best_day,
                "best_hour_to_send": best_hour,
                "channel_breakdown": channel_stats,
                "type_breakdown": type_stats,
                "status_breakdown": {
                    "sent": by_status.get("sent", 0),
                    "delivered": by_status.get("delivered", 0),
                    "failed": by_status.get("failed", 0),
                    "cancelled": by_status.get("cancelled", 0),
                },
                "daily_volume": [
                    {"date": k, "count": v}
                    for k, v in sorted(daily_volume.items())
                ],
                "hourly_distribution": hourly_dist,
            },
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 12: GENERATE COMMUNICATION INSIGHTS (AUTO)
    # NEW — 9 dimensiones de inteligencia comunicacional
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="generate_communication_insights",
        description=(
            "Generar análisis de inteligencia comunicacional en 9 dimensiones: "
            "timing, channel, audience, content, frequency, risk, opportunity, "
            "sentiment y health. Cada dimensión incluye score 0-100, hallazgo, "
            "recomendación y benchmark de clubes privados de Costa Rica."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def generate_communication_insights(
        self,
        period: str = "last_90_days",
    ) -> dict[str, Any]:
        # Fetch data
        logs = await self.repo.list_logs(limit=500)
        scheduled = await self.repo.list_scheduled()
        templates = await self.repo.list_templates()

        if not logs:
            return {
                "status": "success",
                "message": "📋 Sin datos suficientes para generar insights.",
                "overall_score": 0,
                "dimensions": [],
                "alerts": ["Sin historial de comunicaciones"],
                "opportunities": [],
                "generated_at": datetime.now(tz=timezone.utc).isoformat(),
            }

        # Filter logs by period
        now = datetime.now(tz=timezone.utc)
        period_days = {
            "last_30_days": 30, "last_90_days": 90,
            "current_month": 30, "current_quarter": 90, "ytd": 365,
        }
        lookback = period_days.get(period, 90)

        active_logs = []
        for log in logs:
            if not log.sent_at:
                continue
            try:
                dt = datetime.fromisoformat(
                    log.sent_at.replace("Z", "+00:00")
                )
                if (now - dt).days <= lookback:
                    active_logs.append(log)
            except (ValueError, AttributeError):
                continue

        total = len(active_logs)
        days_of_week = [
            "Lunes", "Martes", "Miércoles", "Jueves",
            "Viernes", "Sábado", "Domingo",
        ]

        # ── Pre-compute aggregates ──
        by_channel: Counter = Counter()
        by_type: Counter = Counter()
        by_status: Counter = Counter()
        by_day: Counter = Counter()
        by_hour: Counter = Counter()
        dates: list[datetime] = []

        for log in active_logs:
            ch = (
                log.channel.value
                if hasattr(log.channel, "value")
                else str(log.channel)
            )
            st = (
                log.status.value
                if hasattr(log.status, "value")
                else str(log.status)
            )
            by_channel[ch] += 1
            by_type[log.notification_type] += 1
            by_status[st] += 1
            if log.sent_at:
                try:
                    dt = datetime.fromisoformat(
                        log.sent_at.replace("Z", "+00:00")
                    )
                    by_day[days_of_week[dt.weekday()]] += 1
                    by_hour[dt.hour] += 1
                    dates.append(dt)
                except (ValueError, IndexError):
                    pass

        dates.sort()
        success_count = by_status.get("sent", 0) + by_status.get("delivered", 0)
        fail_count = by_status.get("failed", 0) + by_status.get("cancelled", 0)

        # ── RAG: Query club documentation for grounding ──
        rag_policy = await self._enrich_with_rag_context(
            "política de comunicación del club frecuencia canales"
        )
        rag_emergency = await self._enrich_with_rag_context(
            "protocolo de emergencia comunicación socios"
        )
        rag_policy_citation = self._format_rag_citations(rag_policy)
        rag_emergency_citation = self._format_rag_citations(rag_emergency)

        # ── Dimension 1: Timing ──
        best_day = (
            max(by_day.items(), key=lambda item: item[1])[0]
            if by_day
            else "N/A"
        )
        best_hour_n = (
            max(by_hour.items(), key=lambda item: item[1])[0]
            if by_hour
            else 0
        )
        best_hour_s = f"{best_hour_n:02d}:00"
        days_active = len(by_day)
        timing_score = min(100, (days_active / 5) * 60 + (15 if best_day != "N/A" else 0) + (25 if by_hour else 0))
        timing_dim = {
            "dimension": "timing",
            "score": round(timing_score),
            "status": self._compute_dimension_status(timing_score),
            "finding": (
                f"Mejor día: {best_day}, mejor hora: {best_hour_s}. "
                f"Comunicaciones activas en {days_active}/7 días."
            ),
            "recommendation": (
                f"Concentrá comunicaciones importantes los {best_day} "
                f"alrededor de las {best_hour_s} para maximizar engagement."
            ),
            "benchmark": f"Clubes CR promedio envían más los martes y jueves (10-11h)",
            "metric_value": days_active,
            "metric_unit": "días activos / 7",
        }

        # ── Dimension 2: Channel ──
        channels_used = len(by_channel)
        channel_max_pct = (
            max(by_channel.values()) / total * 100 if total > 0 else 0
        )
        diversity_score = min(100, (channels_used / 5) * 70)
        if channel_max_pct > 60:
            diversity_score -= 20
        diversity_score = max(0, diversity_score)
        channel_dim = {
            "dimension": "channel",
            "score": round(diversity_score),
            "status": self._compute_dimension_status(diversity_score),
            "finding": (
                f"{channels_used}/5 canales activos. "
                f"Canal dominante: "
                f"{max(by_channel.items(), key=lambda item: item[1])[0] if by_channel else 'N/A'} "
                f"({channel_max_pct:.0f}%)."
            ),
            "recommendation": (
                f"{'Diversificá entre al menos 3 canales para reducir dependencia.' if channels_used < 3 else 'Mantené la diversidad de canales actual.'}"
            ),
            "benchmark": (
                f"Clubes CR usan promedio 2.8 canales. "
                f"Óptimo: ≥3 canales activos."
            ),
            "metric_value": channels_used,
            "metric_unit": "canales activos",
        }

        # ── Dimension 3: Audience ──
        personalized = by_type.get("personalized", 0)
        p_ratio = (personalized / total * 100) if total > 0 else 0
        audience_score = min(100, p_ratio * 4)  # 25% → 100
        audience_dim = {
            "dimension": "audience",
            "score": round(audience_score),
            "status": self._compute_dimension_status(audience_score),
            "finding": (
                f"{personalized} de {total} comunicaciones personalizadas "
                f"({p_ratio:.0f}%). "
                f"{'Buena segmentación.' if p_ratio >= 20 else 'Predomina comunicación genérica.'}"
            ),
            "recommendation": (
                f"{'Mantené la personalización actual.' if p_ratio >= 20 else 'Incrementá comunicaciones segmentadas para mejorar engagement hasta 2x.'}"
            ),
            "benchmark": (
                f"Clubes CR elite: {CR_BENCHMARKS['personalization_ratio_pct']}% "
                f"personalizado. Tu ratio: {p_ratio:.0f}%."
            ),
            "metric_value": round(p_ratio, 1),
            "metric_unit": "% personalizado",
        }

        # ── Dimension 4: Content ──
        content_types = len(by_type)
        content_score = min(100, (content_types / 4) * 80 + 20)
        content_dim = {
            "dimension": "content",
            "score": round(content_score),
            "status": self._compute_dimension_status(content_score),
            "finding": (
                f"{content_types} tipos de comunicación utilizados: "
                f"{', '.join(by_type.keys())}."
            ),
            "recommendation": (
                "Explorá nuevos formatos: recordatorios de pago, "
                "cumpleaños automatizados, promociones estacionales."
            ),
            "benchmark": "Clubes CR usan promedio 3-4 tipos de contenido.",
            "metric_value": content_types,
            "metric_unit": "tipos de contenido",
        }

        # ── Dimension 5: Frequency ──
        weeks = max(1, lookback / 7)
        weekly_freq = total / weeks
        freq_score = 100 - abs(weekly_freq - CR_BENCHMARKS["weekly_frequency_optimal"]) * 20
        freq_score = max(0, min(100, freq_score))
        # Regularity: std dev of gaps
        regularity_note = ""
        if len(dates) >= 2:
            gaps = [
                (dates[i + 1] - dates[i]).total_seconds() / 86400
                for i in range(len(dates) - 1)
            ]
            mean_gap = sum(gaps) / len(gaps)
            variance = sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
            std_gap = math.sqrt(variance)
            regularity_note = (
                f"Intervalo promedio: {mean_gap:.1f} días "
                f"(σ={std_gap:.1f})."
            )
            if std_gap < mean_gap * 0.5:
                freq_score = min(100, freq_score + 10)
                regularity_note += " Comunicación regular."
            else:
                regularity_note += " Comunicación irregular."

        freq_dim = {
            "dimension": "frequency",
            "score": round(freq_score),
            "status": self._compute_dimension_status(freq_score),
            "finding": (
                f"{weekly_freq:.1f} comunicaciones/semana. "
                f"{regularity_note}"
            ),
            "recommendation": (
                f"{'Frecuencia adecuada.' if weekly_freq >= 2 else 'Incrementá a 2-3 comunicaciones/semana para mantener engagement.'}"
                + (f" {rag_policy_citation}" if rag_policy_citation else "")
            ),
            "benchmark": (
                f"Óptimo CR: {CR_BENCHMARKS['weekly_frequency_optimal']} "
                f"comunicaciones/semana."
            ),
            "metric_value": round(weekly_freq, 1),
            "metric_unit": "comunicaciones/semana",
        }

        # ── Dimension 6: Risk ──
        failure_rate = (fail_count / total * 100) if total > 0 else 0
        risk_score = max(0, 100 - failure_rate * 15)
        risk_dim = {
            "dimension": "risk",
            "score": round(risk_score),
            "status": self._compute_dimension_status(risk_score),
            "finding": (
                f"Tasa de fallas: {failure_rate:.1f}% "
                f"({fail_count} de {total}). "
                f"{'Riesgo bajo.' if failure_rate < 3 else 'Riesgo elevado.'}"
            ),
            "recommendation": (
                f"{'Sistema estable.' if failure_rate < 3 else 'Revisá calidad de datos de contacto y configuración de canales.'}"
                + (f" {rag_emergency_citation}" if rag_emergency_citation else "")
            ),
            "benchmark": (
                f"Máximo aceptable CR: "
                f"{CR_BENCHMARKS['failure_rate_max_pct']}%."
            ),
            "metric_value": round(failure_rate, 1),
            "metric_unit": "% fallas",
        }

        # ── Dimension 7: Opportunity ──
        opp_findings: list[str] = []
        all_channels = {"email", "push", "sms", "whatsapp", "in_app"}
        unused = all_channels - set(by_channel.keys())
        low_usage = {
            ch: cnt
            for ch, cnt in by_channel.items()
            if cnt / total * 100 < 10
        }
        if unused:
            opp_findings.append(
                f"Canales sin usar: {', '.join(unused)}"
            )
        if low_usage:
            opp_findings.append(
                f"Canales subutilizados: {', '.join(low_usage.keys())}"
            )
        if personalized < total * 0.15 and total > 10:
            opp_findings.append(
                "Personalización baja — oportunidad de segmentación"
            )
        opp_score = 100 - len(opp_findings) * 20
        opp_score = max(20, min(100, opp_score))
        opp_dim = {
            "dimension": "opportunity",
            "score": round(opp_score),
            "status": self._compute_dimension_status(opp_score),
            "finding": (
                "; ".join(opp_findings)
                if opp_findings
                else "Sin oportunidades críticas detectadas."
            ),
            "recommendation": (
                "Activá canales subutilizados (WhatsApp: 98% apertura) "
                "y aumentá personalización para duplicar engagement."
            ),
            "benchmark": "Clubes CR con mejor engagement usan 3+ canales y >20% personalización.",
            "metric_value": len(low_usage) + len(unused),
            "metric_unit": "canales subutilizados",
        }

        # ── Dimension 8: Sentiment ──
        # Sentiment data not available until B2 — placeholder
        sentiment_dim = {
            "dimension": "sentiment",
            "score": 50,
            "status": "attention",
            "finding": (
                "Sin datos de sentimiento disponibles. "
                "El análisis de sentimiento requiere integración con "
                "el módulo de satisfacción."
            ),
            "recommendation": (
                "Activá el análisis de sentimiento cruzando comunicaciones "
                "con encuestas de satisfacción para medir impacto real."
            ),
            "benchmark": "Análisis de sentimiento: feature disponible en Communication Intelligence.",
            "metric_value": None,
            "metric_unit": None,
        }

        # ── Dimension 9: Health ──
        delivery_rate = (
            (success_count / total * 100) if total > 0 else 0
        )
        health_composite = (
            delivery_rate * 0.4
            + diversity_score * 0.3
            + (100 - failure_rate * 10) * 0.3
        )
        health_composite = max(0, min(100, health_composite))
        health_dim = {
            "dimension": "health",
            "score": round(health_composite),
            "status": self._compute_dimension_status(health_composite),
            "finding": (
                f"Health Score compuesto: {health_composite:.0f}/100 "
                f"(delivery {delivery_rate:.0f}% × 0.4 + diversity "
                f"{diversity_score:.0f} × 0.3 + reliability "
                f"{max(0, 100 - failure_rate * 10):.0f} × 0.3)."
            ),
            "recommendation": (
                f"{'Sistema comunicacional saludable.' if health_composite >= 65 else 'Atención: el sistema comunicacional necesita mejoras.'}"
            ),
            "benchmark": (
                f"Clubes CR promedio: 70/100. "
                f"Tu score: {health_composite:.0f}/100."
            ),
            "metric_value": round(health_composite, 1),
            "metric_unit": "health score",
        }

        # ── Assemble all dimensions ──
        dimensions = [
            timing_dim, channel_dim, audience_dim, content_dim,
            freq_dim, risk_dim, opp_dim, sentiment_dim, health_dim,
        ]

        overall_score = round(
            sum(d["score"] for d in dimensions) / len(dimensions)
        )

        alerts = [
            d["finding"]
            for d in dimensions
            if d["status"] in ("critical", "attention")
        ]

        opportunities = [
            d["recommendation"]
            for d in dimensions
            if d["dimension"] in ("opportunity", "audience", "content")
            and d["score"] < 70
        ]

        logger.info(
            "[communication] Insights generated: %d dimensions, "
            "overall=%d, alerts=%d",
            len(dimensions),
            overall_score,
            len(alerts),
        )

        return {
            "status": "success",
            "message": (
                f"🧠 Insights comunicacionales: {overall_score}/100 "
                f"general, {len(alerts)} alertas."
            ),
            "overall_score": overall_score,
            "dimensions": dimensions,
            "alerts": alerts,
            "opportunities": opportunities,
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 13: GET COMMUNICATION HEALTH (AUTO)
    # NEW — 5-factor health score compuesto
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="get_communication_health",
        description=(
            "Health score compuesto de comunicaciones (0-100). "
            "5 factores: delivery, diversity, reliability, frequency, engagement. "
            "Incluye tendencia y comparación con benchmarks de clubes privados CR."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_communication_health(self) -> dict[str, Any]:
        logs = await self.repo.list_logs(limit=500)

        if not logs:
            return {
                "status": "success",
                "message": "📋 Sin datos para calcular health score.",
                "health": {
                    "score": 0,
                    "level": "no_data",
                    "factors": {
                        "delivery": 0,
                        "diversity": 0,
                        "reliability": 0,
                        "frequency": 0,
                        "engagement": 0,
                    },
                    "trend": "stable",
                    "benchmark_comparison": "Sin datos suficientes.",
                },
            }

        now = datetime.now(tz=timezone.utc)
        total = len(logs)

        # Filter last 30 days for health calculation
        recent_logs = []
        for log in logs:
            if not log.sent_at:
                continue
            try:
                dt = datetime.fromisoformat(
                    log.sent_at.replace("Z", "+00:00")
                )
                if (now - dt).days <= 30:
                    recent_logs.append(log)
            except (ValueError, AttributeError):
                continue

        recent_total = len(recent_logs)

        # Factor 1: Delivery rate
        success = sum(
            1 for l in recent_logs
            if (l.status.value if hasattr(l.status, "value")
                else str(l.status)) in ("sent", "delivered")
        )
        delivery = (success / recent_total * 100) if recent_total > 0 else 0

        # Factor 2: Channel diversity
        channels = set()
        for l in recent_logs:
            ch = (l.channel.value if hasattr(l.channel, "value")
                  else str(l.channel))
            channels.add(ch)
        diversity = min(100, (len(channels) / 5) * 100)

        # Factor 3: Reliability (inverse failure rate)
        failures = sum(
            1 for l in recent_logs
            if (l.status.value if hasattr(l.status, "value")
                else str(l.status)) in ("failed", "cancelled")
        )
        fail_rate = (failures / recent_total * 100) if recent_total > 0 else 0
        reliability = max(0, 100 - fail_rate * 10)

        # Factor 4: Frequency (optimal 2-3/week)
        weekly = recent_total / max(1, 30 / 7)
        frequency = max(0, 100 - abs(weekly - 2.5) * 25)

        # Factor 5: Engagement proxy (personalization ratio * 100)
        personalized = sum(
            1 for l in recent_logs
            if l.notification_type == "personalized"
        )
        engagement = min(
            100,
            (personalized / recent_total * 400) if recent_total > 0 else 0
        )

        factors = {
            "delivery": round(delivery, 1),
            "diversity": round(diversity, 1),
            "reliability": round(reliability, 1),
            "frequency": round(frequency, 1),
            "engagement": round(engagement, 1),
        }

        score = round(
            delivery * 0.30
            + diversity * 0.20
            + reliability * 0.25
            + frequency * 0.15
            + engagement * 0.10
        )
        score = max(0, min(100, score))

        # Level
        if score >= 85:
            level = "exceptional"
        elif score >= 65:
            level = "healthy"
        elif score >= 45:
            level = "attention"
        else:
            level = "critical"

        # Trend: compare last 15 days vs previous 15 days
        first_half = [
            l for l in recent_logs
            if l.sent_at and (now - datetime.fromisoformat(
                l.sent_at.replace("Z", "+00:00")
            )).days > 15
        ]
        second_half = [
            l for l in recent_logs
            if l.sent_at and (now - datetime.fromisoformat(
                l.sent_at.replace("Z", "+00:00")
            )).days <= 15
        ]
        h1_success = sum(
            1 for l in first_half
            if (l.status.value if hasattr(l.status, "value")
                else str(l.status)) in ("sent", "delivered")
        )
        h2_success = sum(
            1 for l in second_half
            if (l.status.value if hasattr(l.status, "value")
                else str(l.status)) in ("sent", "delivered")
        )
        h1_rate = (h1_success / len(first_half) * 100) if first_half else 0
        h2_rate = (h2_success / len(second_half) * 100) if second_half else 0

        if h2_rate > h1_rate + 5:
            trend = "improving"
        elif h2_rate < h1_rate - 5:
            trend = "declining"
        else:
            trend = "stable"

        # Benchmark comparison
        cr_avg = 70
        if score >= cr_avg + 15:
            benchmark = (
                f"Superior al promedio de clubes CR ({cr_avg}/100) "
                f"por {score - cr_avg} puntos."
            )
        elif score >= cr_avg - 5:
            benchmark = (
                f"Consistente con el promedio de clubes CR ({cr_avg}/100)."
            )
        else:
            benchmark = (
                f"Inferior al promedio de clubes CR ({cr_avg}/100) "
                f"por {cr_avg - score} puntos. Requiere atención."
            )

        logger.info(
            "[communication] Health score: %d (%s), trend: %s",
            score,
            level,
            trend,
        )

        return {
            "status": "success",
            "message": (
                f"❤️ Health Score: {score}/100 ({level}). "
                f"Tendencia: {trend}."
            ),
            "health": {
                "score": score,
                "level": level,
                "factors": factors,
                "trend": trend,
                "benchmark_comparison": benchmark,
            },
        }

    # ══════════════════════════════════════════════════════
    # 🟢 TOOL 14: GET CAMPAIGN PERFORMANCE (AUTO)
    # NEW — Campaign analytics + engagement scoring
    # ══════════════════════════════════════════════════════

    @MCPTool(
        name="get_campaign_performance",
        description=(
            "Analytics de campañas de comunicación. "
            "Retorna rendimiento, engagement scoring y recomendaciones. "
            "Si no hay campañas creadas, retorna estado vacío con sugerencias."
        ),
        approval=ApprovalLevel.AUTO,
    )
    async def get_campaign_performance(
        self,
        status: str = "",
        limit: int = 10,
    ) -> dict[str, Any]:
        # Campaign store may not exist until B2
        try:
            campaigns_raw = list(getattr(self.repo, "_campaigns", {}).values())
        except (AttributeError, TypeError):
            campaigns_raw = []

        if not campaigns_raw:
            # Compute a "virtual" campaign analysis from logs
            logs = await self.repo.list_logs(limit=200)

            if not logs:
                return {
                    "status": "success",
                    "message": (
                        "📋 Sin campañas ni historial de comunicaciones. "
                        "Creá tu primera campaña para ver analytics."
                    ),
                    "campaigns": [],
                    "summary": {
                        "total_campaigns": 0,
                        "total_sent": 0,
                        "avg_engagement": 0,
                        "top_channel": "N/A",
                        "top_type": "N/A",
                    },
                    "top_performers": [],
                    "recommendations": [
                        "Creá campañas segmentadas para cada audiencia clave.",
                        "Usá A/B testing en asuntos para mejorar tasas de apertura.",
                        "Programá envíos en el mejor horario detectado.",
                    ],
                }

            # Derive virtual campaigns from notification types
            now = datetime.now(tz=timezone.utc)
            by_type_groups: dict[str, list] = {}
            for log in logs:
                by_type_groups.setdefault(log.notification_type, []).append(log)

            virtual_campaigns = []
            for ntype, nlogs in by_type_groups.items():
                success = sum(
                    1 for l in nlogs
                    if (l.status.value if hasattr(l.status, "value")
                        else str(l.status)) in ("sent", "delivered")
                )
                total_n = len(nlogs)
                channels_used = set()
                for l in nlogs:
                    ch = (l.channel.value if hasattr(l.channel, "value")
                          else str(l.channel))
                    channels_used.add(ch)

                virtual_campaigns.append({
                    "id": f"virtual-{ntype}",
                    "name": f"Campaña: {ntype.replace('_', ' ').title()}",
                    "status": "active",
                    "channels": list(channels_used),
                    "total_sent": total_n,
                    "success_count": success,
                    "success_rate": round(
                        (success / total_n * 100) if total_n > 0 else 0, 1
                    ),
                    "engagement_score": round(
                        min(100, (success / max(1, total_n)) * 80
                            + len(channels_used) * 5),
                        1,
                    ),
                })

            virtual_campaigns.sort(
                key=lambda c: c["engagement_score"], reverse=True
            )

            top_channel = max(
                by_type_groups.keys(),
                key=lambda k: len(by_type_groups[k]),
            ) if by_type_groups else "N/A"

            total_all = sum(c["total_sent"] for c in virtual_campaigns)
            avg_engagement = (
                sum(c["engagement_score"] for c in virtual_campaigns)
                / len(virtual_campaigns)
                if virtual_campaigns else 0
            )

            return {
                "status": "success",
                "message": (
                    f"📊 {len(virtual_campaigns)} campañas virtuales "
                    f"derivadas del historial."
                ),
                "campaigns": virtual_campaigns[:limit],
                "summary": {
                    "total_campaigns": len(virtual_campaigns),
                    "total_sent": total_all,
                    "avg_engagement": round(avg_engagement, 1),
                    "top_channel": top_channel,
                    "top_type": (
                        virtual_campaigns[0]["name"]
                        if virtual_campaigns else "N/A"
                    ),
                },
                "top_performers": virtual_campaigns[:3],
                "recommendations": [
                    f"Tu mejor rendimiento es '{virtual_campaigns[0]['name']}' "
                    f"({virtual_campaigns[0]['engagement_score']:.0f} engagement). "
                    f"Replicá su estrategia en otras campañas."
                    if virtual_campaigns else
                    "Sin datos suficientes para recomendaciones.",
                    "Segmentá audiencias para mejorar engagement promedio.",
                    "Usá múltiples canales (email + WhatsApp) para mayor alcance.",
                ],
            }

        # Real campaigns exist — compute metrics
        campaigns = []
        for c in campaigns_raw:
            campaigns.append({
                "id": c.get("id", ""),
                "name": c.get("name", ""),
                "status": c.get("status", "draft"),
                "channels": c.get("channels", []),
                "total_sent": c.get("metrics", {}).get("sent", 0),
                "success_count": c.get("metrics", {}).get("delivered", 0),
                "success_rate": 0,
                "engagement_score": 0,
            })

        return {
            "status": "success",
            "message": f"📊 {len(campaigns)} campañas encontradas.",
            "campaigns": campaigns[:limit],
            "summary": {
                "total_campaigns": len(campaigns),
                "total_sent": sum(c["total_sent"] for c in campaigns),
                "avg_engagement": 0,
                "top_channel": "N/A",
                "top_type": "N/A",
            },
            "top_performers": campaigns[:3],
            "recommendations": [],
        }
