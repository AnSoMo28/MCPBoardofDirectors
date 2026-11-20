"""Tablas del dominio Communication — Ola 2.1-octava (vertical communication).

Espejo 1:1 de club_mcp.models.communication (Pydantic). Las 9 entidades
del repo in-memory (verificar contra communication_repo.py):

    _announcements:  dict[str, Announcement]             → announcements
    _emergencies:    dict[str, EmergencyBroadcast]         → emergency_broadcasts
    _templates:      dict[str, NotificationTemplate]       → notification_templates
    _scheduled:      dict[str, ScheduledNotification]     → scheduled_notifications
    _logs:           dict[str, NotificationLog]           → notification_logs
    _preferences:    dict[str, CommunicationPreferences]   → communication_preferences
    _personalized:   dict[str, PersonalizedNotification]  → personalized_notifications
    _campaigns:      dict[str, Campaign]                   → communication_campaigns
    _sentiment:      dict[str, SentimentDataPoint]        → sentiment_data_points

Los enums del dominio (NotificationChannel · AnnouncementType ·
AnnouncementStatus · EmergencyType · TemplateCategory ·
NotificationStatus · FrequencyPreference · CampaignStatus ·
SentimentLevel) NO son constraint CHECK: el repo guarda .value en
String(32) y reconstruye el Pydantic enum al leer — el contrato del
agente pasa enums; un CHECK duplicaría la validación que Pydantic ya
hace en el borde (mismo estilo que las 7 verticales previas §3.8..§3.8-
SEPTIMA).

Las listas (channels · recipient_ids · variables) y los dicts anexos
(params · metrics) van a JSONB por fila: anexos del agregado, no
entidades con identity propia — mismo criterio que
families.activities (§3.8-bis), engagement.favorite_activities
(§3.8-tris), guests.privileges (§3.8-SEXTA) y satisfaction.questions
(§3.8-SEPTIMA).

IDs: el in-memory genera uuid4().hex[:8] SIN prefijo (_gen_id
staticmethod); el repo ORM reproduce la MISMA forma. Sin excepciones
custom (el in-memory devuelve None / listas vacías / dict; el ORM
idéntico).

sent_at / created_at / scheduled_at / start_date / end_date /
timestamp: el in-memory persiste ISO strings (sent_at=""/None y
created_at=datetime.now(...).isoformat() en create); columnas Text
nullable que guardan el MISMO string — el roundtrip es pérdida cero
(el contrato del agente compara strings, no datetimes).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base

# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
# (idéntico a families §3.8-bis y satisfaction §3.8-SEPTIMA).
JSONType = JSONB().with_variant(JSON(), "sqlite")


class AnnouncementORM(Base):
    """Anuncio — espejo de Announcement (Pydantic)."""

    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    announcement_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="general"
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    channels: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    target_audience: Mapped[str] = mapped_column(
        String(64), nullable=False, default="all"
    )
    scheduled_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    requires_acknowledgment: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class EmergencyBroadcastORM(Base):
    """Broadcast de emergencia — espejo de EmergencyBroadcast (Pydantic)."""

    __tablename__ = "emergency_broadcasts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    emergency_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    channels: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    sent_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    acknowledged_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class NotificationTemplateORM(Base):
    """Plantilla — espejo de NotificationTemplate (Pydantic)."""

    __tablename__ = "notification_templates"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body_template: Mapped[str] = mapped_column(Text, nullable=False, default="")
    channels: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    variables: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class ScheduledNotificationORM(Base):
    """Notificación agendada — espejo de ScheduledNotification (Pydantic)."""

    __tablename__ = "scheduled_notifications"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    template_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    recipient_ids: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    scheduled_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    params: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    sent_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class NotificationLogORM(Base):
    """Log de notificación — espejo de NotificationLog (Pydantic)."""

    __tablename__ = "notification_logs"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    notification_type: Mapped[str] = mapped_column(
        String(64), nullable=False, default=""
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    recipient_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="sent")
    sent_at: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class CommunicationPreferencesORM(Base):
    """Preferencias por miembro — espejo de CommunicationPreferences."""

    __tablename__ = "communication_preferences"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    email_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sms_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    whatsapp_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    in_app_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    announcements: Mapped[str] = mapped_column(
        String(32), nullable=False, default="realtime"
    )
    events: Mapped[str] = mapped_column(
        String(32), nullable=False, default="realtime"
    )
    promotions: Mapped[str] = mapped_column(
        String(32), nullable=False, default="weekly_digest"
    )
    quiet_hours_start: Mapped[str] = mapped_column(
        String(8), nullable=False, default="22:00"
    )
    quiet_hours_end: Mapped[str] = mapped_column(
        String(8), nullable=False, default="07:00"
    )


class PersonalizedNotificationORM(Base):
    """Notificación personalizada — espejo de PersonalizedNotification."""

    __tablename__ = "personalized_notifications"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    recipient_ids: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    sent_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class CampaignORM(Base):
    """Campaña — espejo de Campaign (metrics a JSONB anexo)."""

    __tablename__ = "communication_campaigns"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    channels: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    target_audience: Mapped[str] = mapped_column(
        String(64), nullable=False, default="all"
    )
    template_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    start_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    end_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    metrics: Mapped[dict[str, Any]] = mapped_column(
        JSONType, nullable=False, default=dict
    )
    created_by: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False, default="")


class SentimentDataPointORM(Base):
    """Punto de sentimiento — espejo de SentimentDataPoint."""

    __tablename__ = "sentiment_data_points"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    sentiment: Mapped[str] = mapped_column(
        String(32), nullable=False, default="neutral"
    )
    score: Mapped[float] = mapped_column(nullable=False, default=0.5)
    channel: Mapped[str | None] = mapped_column(String(32), nullable=True)
    member_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[str] = mapped_column(Text, nullable=False, default="")
