"""
Tests for CommunicationAgent.
Club: Castillo Country Club
"""

from __future__ import annotations

import pytest
from uuid import UUID

from club_mcp.agents.communication_agent import CommunicationAgent
from club_mcp.db.repositories.communication_repo import CommunicationRepository
from club_mcp.hitl.approval_types import ApprovalStatus
from club_mcp.models.communication import (
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


# ── Fixtures ───────────────────────────────────────────

@pytest.fixture
def communication_repo():
    return CommunicationRepository()


@pytest.fixture
def communication_agent(communication_repo, approval_engine):
    agent = CommunicationAgent(repo=communication_repo)
    agent.approval_engine = approval_engine
    return agent


# ── Seed helpers ───────────────────────────────────────

async def _seed_template(repo, **overrides):
    data = CreateNotificationTemplate(
        name=overrides.get("name", "Bienvenida"),
        category=overrides.get("category", TemplateCategory.WELCOME),
        subject=overrides.get("subject", "¡Bienvenido al Club!"),
        body_template=overrides.get(
            "body_template", "Hola {{nombre}}, bienvenido al club."
        ),
        channels=overrides.get(
            "channels", [NotificationChannel.EMAIL]
        ),
        variables=overrides.get("variables", ["nombre"]),
    )
    return await repo.create_template(data)


async def _seed_preferences(repo, **overrides):
    data = CreateCommunicationPreferences(
        member_id=overrides.get("member_id", "M001"),
        email_enabled=overrides.get("email_enabled", True),
        push_enabled=overrides.get("push_enabled", True),
        whatsapp_enabled=overrides.get("whatsapp_enabled", True),
        announcements=overrides.get(
            "announcements", FrequencyPreference.REALTIME
        ),
    )
    return await repo.create_preferences(data)


async def _seed_personalized(repo, **overrides):
    data = CreatePersonalizedNotification(
        title=overrides.get("title", "Invitación especial"),
        body=overrides.get("body", "Tenemos algo especial para vos."),
        channel=overrides.get("channel", NotificationChannel.EMAIL),
        recipient_ids=overrides.get("recipient_ids", ["M001", "M002"]),
        created_by=overrides.get("created_by", "admin@castillo.cr"),
    )
    return await repo.create_personalized(data)


# ══════════════════════════════════════════════════════
# TEST CLASS 1: broadcast_club_announcement
# ══════════════════════════════════════════════════════


class TestBroadcastClubAnnouncement:

    @pytest.mark.asyncio
    async def test_announcement_pending_approval(self, communication_agent):
        result = await communication_agent.broadcast_club_announcement(
            title="Mantenimiento de Piscina",
            body="La piscina estará cerrada el próximo lunes.",
            announcement_type="maintenance",
            channels="email,push",
            target_audience="all",
            priority=2,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "Mantenimiento" in result["message"]

    @pytest.mark.asyncio
    async def test_announcement_approve_and_execute(
        self, communication_agent, approval_engine
    ):
        result = await communication_agent.broadcast_club_announcement(
            title="Evento de Fin de Año",
            body="Los esperamos en la cena de fin de año.",
            announcement_type="event",
            channels="email,whatsapp",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Anuncio aprobado.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await communication_agent.execute_announcement(
            title="Evento de Fin de Año",
            body="Los esperamos en la cena de fin de año.",
            announcement_type="event",
            channels=["email", "whatsapp"],
            created_by="admin@castillo.cr",
        )

        assert execute_result["status"] == "success"
        assert execute_result["announcement"]["status"] == "sent"

    @pytest.mark.asyncio
    async def test_announcement_missing_fields(self, communication_agent):
        result = await communication_agent.broadcast_club_announcement(
            title="Solo título",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_announcement_invalid_type(self, communication_agent):
        result = await communication_agent.broadcast_club_announcement(
            title="Test",
            body="Body",
            announcement_type="invalid_type",
        )
        assert result["status"] == "error"
        assert "Tipo no válido" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 2: manage_emergency_broadcast
# ══════════════════════════════════════════════════════


class TestManageEmergencyBroadcast:

    @pytest.mark.asyncio
    async def test_emergency_pending_approval(self, communication_agent):
        result = await communication_agent.manage_emergency_broadcast(
            title="Alerta de tormenta tropical",
            body="Se acerca tormenta tropical. Permanezcan en áreas seguras.",
            emergency_type="weather",
            channels="push,sms,whatsapp",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "request_id" in result
        assert "emergencia" in result["message"].lower()

    @pytest.mark.asyncio
    async def test_emergency_approve_and_execute(
        self, communication_agent, approval_engine
    ):
        result = await communication_agent.manage_emergency_broadcast(
            title="Prueba de evacuación",
            body="Diríjanse a los puntos de reunión.",
            emergency_type="evacuation",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Emergencia confirmada.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await communication_agent.execute_emergency_broadcast(
            title="Prueba de evacuación",
            body="Diríjanse a los puntos de reunión.",
            emergency_type="evacuation",
            channels=["push", "sms", "whatsapp"],
            created_by="admin@castillo.cr",
        )

        assert execute_result["status"] == "success"
        assert execute_result["emergency"]["status"] == "sent"

    @pytest.mark.asyncio
    async def test_emergency_missing_fields(self, communication_agent):
        result = await communication_agent.manage_emergency_broadcast(
            title="Solo título",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_emergency_invalid_type(self, communication_agent):
        result = await communication_agent.manage_emergency_broadcast(
            title="Test",
            body="Body",
            emergency_type="zombie_apocalypse",
        )
        assert result["status"] == "error"
        assert "Tipo de emergencia no válido" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 3: send_personalized_notification
# ══════════════════════════════════════════════════════


class TestSendPersonalizedNotification:

    @pytest.mark.asyncio
    async def test_small_group_auto(self, communication_agent):
        result = await communication_agent.send_personalized_notification(
            title="Invitación privada",
            body="Tenemos una cena especial para vos.",
            channel="email",
            recipient_ids="M001,M002,M003",
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "success"
        assert "3 destinatario(s)" in result["message"]

    @pytest.mark.asyncio
    async def test_large_group_hitl(self, communication_agent):
        recipients = ",".join([f"M{i:03d}" for i in range(1, 151)])

        result = await communication_agent.send_personalized_notification(
            title="Newsletter masivo",
            body="Contenido del newsletter.",
            channel="email",
            recipient_ids=recipients,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        assert "150" in result["details"]["recipient_count"].__str__() or result["details"]["recipient_count"] == 150

    @pytest.mark.asyncio
    async def test_approve_large_notification(
        self, communication_agent, approval_engine
    ):
        recipients = ",".join([f"M{i:03d}" for i in range(1, 120)])

        result = await communication_agent.send_personalized_notification(
            title="Oferta Black Friday",
            body="Descuentos exclusivos para socios.",
            channel="whatsapp",
            recipient_ids=recipients,
            requested_by="admin@castillo.cr",
        )

        assert result["status"] == "pending_approval"
        request_id = result["request_id"]

        approval = await approval_engine.approve(
            UUID(request_id),
            approved_by="admin@castillo.cr",
            note="Notificación masiva aprobada.",
        )
        assert approval.status == ApprovalStatus.APPROVED

        execute_result = await communication_agent.execute_personalized_notification(
            title="Oferta Black Friday",
            body="Descuentos exclusivos para socios.",
            channel="whatsapp",
            recipient_ids=[f"M{i:03d}" for i in range(1, 120)],
            created_by="admin@castillo.cr",
        )

        assert execute_result["status"] == "success"
        assert execute_result["notification"]["status"] == "sent"

    @pytest.mark.asyncio
    async def test_missing_fields(self, communication_agent):
        result = await communication_agent.send_personalized_notification(
            title="Solo título",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_invalid_channel(self, communication_agent):
        result = await communication_agent.send_personalized_notification(
            title="Test",
            body="Body",
            channel="carrier_pigeon",
            recipient_ids="M001",
        )
        assert result["status"] == "error"
        assert "Canal no válido" in result["message"]

    @pytest.mark.asyncio
    async def test_empty_recipients(self, communication_agent):
        result = await communication_agent.send_personalized_notification(
            title="Test",
            body="Body",
            recipient_ids="",
        )
        assert result["status"] == "error"


# ══════════════════════════════════════════════════════
# TEST CLASS 4: manage_notification_templates
# ══════════════════════════════════════════════════════


class TestManageNotificationTemplates:

    @pytest.mark.asyncio
    async def test_list_empty(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="list"
        )
        assert result["status"] == "success"
        assert result["templates"] == []

    @pytest.mark.asyncio
    async def test_create_success(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="create",
            name="Recordatorio de Pago",
            category="payment_reminder",
            subject="Su próximo pago vence pronto",
            body_template="Estimado {{nombre}}, su pago vence el {{fecha}}.",
            channels="email",
            variables="nombre,fecha",
        )

        assert result["status"] == "success"
        assert "Recordatorio de Pago" in result["message"]
        assert result["template"]["variables"] == ["nombre", "fecha"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="create",
            name="Incompleta",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_category(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="create",
            name="Test",
            category="quantum_entanglement",
            subject="Sub",
            body_template="Body",
        )
        assert result["status"] == "error"
        assert "Categoría no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_get_success(
        self, communication_agent, communication_repo
    ):
        template = await _seed_template(communication_repo)
        result = await communication_agent.manage_notification_templates(
            action="get", template_id=template.id
        )
        assert result["status"] == "success"
        assert result["template"]["name"] == "Bienvenida"

    @pytest.mark.asyncio
    async def test_get_not_found(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="get", template_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_template(
        self, communication_agent, communication_repo
    ):
        template = await _seed_template(communication_repo)
        result = await communication_agent.manage_notification_templates(
            action="update",
            template_id=template.id,
            subject="Nuevo asunto",
            is_active=True,
        )
        assert result["status"] == "success"
        assert result["template"]["subject"] == "Nuevo asunto"

    @pytest.mark.asyncio
    async def test_invalid_action(self, communication_agent):
        result = await communication_agent.manage_notification_templates(
            action="dance"
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 5: schedule_notification
# ══════════════════════════════════════════════════════


class TestScheduleNotification:

    @pytest.mark.asyncio
    async def test_create_success(
        self, communication_agent, communication_repo
    ):
        template = await _seed_template(communication_repo)

        result = await communication_agent.schedule_notification(
            action="create",
            template_id=template.id,
            recipient_ids="M001,M002",
            channel="email",
            scheduled_at="2026-06-01T09:00:00",
        )

        assert result["status"] == "success"
        assert "programada" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_fields(self, communication_agent):
        result = await communication_agent.schedule_notification(
            action="create",
            template_id="T001",
        )
        assert result["status"] == "error"
        assert "Faltan campos" in result["message"]

    @pytest.mark.asyncio
    async def test_create_invalid_template(self, communication_agent):
        result = await communication_agent.schedule_notification(
            action="create",
            template_id="no_existe",
            recipient_ids="M001",
            scheduled_at="2026-06-01T09:00:00",
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_list_empty(self, communication_agent):
        result = await communication_agent.schedule_notification(action="list")
        assert result["status"] == "success"
        assert result["scheduled"] == []

    @pytest.mark.asyncio
    async def test_get_not_found(self, communication_agent):
        result = await communication_agent.schedule_notification(
            action="get", schedule_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_cancel_success(
        self, communication_agent, communication_repo
    ):
        template = await _seed_template(communication_repo)
        create_result = await communication_agent.schedule_notification(
            action="create",
            template_id=template.id,
            recipient_ids="M001",
            scheduled_at="2026-07-01T10:00:00",
        )
        schedule_id = create_result["scheduled"]["id"]

        result = await communication_agent.schedule_notification(
            action="cancel", schedule_id=schedule_id
        )
        assert result["status"] == "success"
        assert "cancelada" in result["message"]

    @pytest.mark.asyncio
    async def test_invalid_channel(
        self, communication_agent, communication_repo
    ):
        template = await _seed_template(communication_repo)

        result = await communication_agent.schedule_notification(
            action="create",
            template_id=template.id,
            recipient_ids="M001",
            channel="telepathy",
            scheduled_at="2026-06-01T09:00:00",
        )
        assert result["status"] == "error"
        assert "Canal no válido" in result["message"]


# ══════════════════════════════════════════════════════
# TEST CLASS 6: get_notification_history
# ══════════════════════════════════════════════════════


class TestGetNotificationHistory:

    @pytest.mark.asyncio
    async def test_empty_history(self, communication_agent):
        result = await communication_agent.get_notification_history()
        assert result["status"] == "success"
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_history_with_data(
        self, communication_agent, communication_repo
    ):
        await communication_repo.create_log(
            notification_type="announcement",
            title="Anuncio 1",
            channel=NotificationChannel.EMAIL,
            recipient_count=100,
            status=NotificationStatus.SENT,
            created_by="admin",
        )
        await communication_repo.create_log(
            notification_type="emergency",
            title="Emergencia 1",
            channel=NotificationChannel.PUSH,
            recipient_count=0,
            status=NotificationStatus.SENT,
            created_by="admin",
        )

        result = await communication_agent.get_notification_history()
        assert result["status"] == "success"
        assert result["total"] == 2

    @pytest.mark.asyncio
    async def test_history_limit(
        self, communication_agent, communication_repo
    ):
        for i in range(5):
            await communication_repo.create_log(
                notification_type="test",
                title=f"Log {i}",
                channel=NotificationChannel.EMAIL,
                recipient_count=10,
                status=NotificationStatus.SENT,
            )

        result = await communication_agent.get_notification_history(limit=3)
        assert result["status"] == "success"
        assert result["total"] == 3


# ══════════════════════════════════════════════════════
# TEST CLASS 7: manage_communication_preferences
# ══════════════════════════════════════════════════════


class TestManageCommunicationPreferences:

    @pytest.mark.asyncio
    async def test_create_success(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="create",
            member_id="M001",
            email_enabled=True,
            push_enabled=True,
            whatsapp_enabled=True,
            sms_enabled=False,
            announcements="realtime",
            events="realtime",
            promotions="weekly_digest",
        )

        assert result["status"] == "success"
        assert "M001" in result["message"]

    @pytest.mark.asyncio
    async def test_create_duplicate(self, communication_agent):
        await communication_agent.manage_communication_preferences(
            action="create", member_id="M001"
        )

        result = await communication_agent.manage_communication_preferences(
            action="create", member_id="M001"
        )

        assert result["status"] == "error"
        assert "ya tiene preferencias" in result["message"]

    @pytest.mark.asyncio
    async def test_create_missing_member_id(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="create"
        )
        assert result["status"] == "error"
        assert "member_id" in result["message"]

    @pytest.mark.asyncio
    async def test_get_by_member(
        self, communication_agent, communication_repo
    ):
        prefs = await _seed_preferences(communication_repo, member_id="M050")

        result = await communication_agent.manage_communication_preferences(
            action="get", member_id="M050"
        )
        assert result["status"] == "success"
        assert result["preferences"]["member_id"] == "M050"

    @pytest.mark.asyncio
    async def test_get_not_found(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="get", member_id="no_existe"
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_update_success(
        self, communication_agent, communication_repo
    ):
        prefs = await _seed_preferences(communication_repo, member_id="M060")

        result = await communication_agent.manage_communication_preferences(
            action="update",
            preferences_id=prefs.id,
            sms_enabled=True,
            announcements="daily_digest",
        )

        assert result["status"] == "success"
        assert result["preferences"]["sms_enabled"] is True

    @pytest.mark.asyncio
    async def test_update_not_found(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="update",
            preferences_id="no_existe",
        )
        assert result["status"] == "not_found"

    @pytest.mark.asyncio
    async def test_invalid_frequency(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="create",
            member_id="M099",
            announcements="every_full_moon",
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]

    @pytest.mark.asyncio
    async def test_invalid_action(self, communication_agent):
        result = await communication_agent.manage_communication_preferences(
            action="fly"
        )
        assert result["status"] == "error"
        assert "no válida" in result["message"]
