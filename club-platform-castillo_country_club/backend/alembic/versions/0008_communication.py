"""Ola 2.1-octava — 9 tablas del dominio Communication.

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-20

Espejo 1:1 de db/orm/communication_orm.py (AnnouncementORM ·
EmergencyBroadcastORM · NotificationTemplateORM ·
ScheduledNotificationORM · NotificationLogORM ·
CommunicationPreferencesORM · PersonalizedNotificationORM ·
CampaignORM · SentimentDataPointORM) — constraint names deterministas
por la naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para las listas anexas
(channels · recipient_ids · variables) y los dicts (params · metrics):
anexos del agregado, no entidades con identity propia (mismo criterio
que families.activities §3.8-bis, engagement.favorite_activities
§3.8-tris, guests.privileges §3.8-SEXTA y satisfaction.questions
§3.8-SEPTIMA).

Sin tabla de dataset demo: el in-memory de communication no tiene
constantes de seed (a diferencia de satisfaction_event_metadata) —
los 9 dicts nacen vacíos y solo el runtime del agente los puebla.

Los enums NO son constraint CHECK: el repo guarda .value (String(32))
y reconstruye el Pydantic enum al leer — el contrato del agente pasa
enums; un CHECK duplicaría la validación que Pydantic ya hace en el
borde (mismo estilo que las 7 verticales previas).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from club_mcp.db.orm.base import Base

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = postgresql.JSONB().with_variant(sa.JSON(), "sqlite")


def _mk(table: str, cols: list) -> None:
    sa.Table(
        table,
        Base.metadata,
        *[c.copy() for c in cols],
        keep_existing=True,
    )


def upgrade() -> None:
    """9 tablas del vertical communication."""
    _mk(
        "announcements",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("title", sa.String(200), nullable=False, server_default=""),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("announcement_type", sa.String(32), nullable=False, server_default="general"),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("channels", JSONType, nullable=False, server_default="[]"),
            sa.Column("target_audience", sa.String(64), nullable=False, server_default="all"),
            sa.Column("scheduled_at", sa.Text(), nullable=True),
            sa.Column("sent_at", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("requires_acknowledgment", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "emergency_broadcasts",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("title", sa.String(200), nullable=False, server_default=""),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("emergency_type", sa.String(32), nullable=False),
            sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("channels", JSONType, nullable=False, server_default="[]"),
            sa.Column("sent_at", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("acknowledged_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "notification_templates",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False, server_default=""),
            sa.Column("category", sa.String(32), nullable=False),
            sa.Column("subject", sa.String(200), nullable=False, server_default=""),
            sa.Column("body_template", sa.Text(), nullable=False, server_default=""),
            sa.Column("channels", JSONType, nullable=False, server_default="[]"),
            sa.Column("variables", JSONType, nullable=False, server_default="[]"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    _mk(
        "scheduled_notifications",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("template_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("recipient_ids", JSONType, nullable=False, server_default="[]"),
            sa.Column("channel", sa.String(32), nullable=False),
            sa.Column("scheduled_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
            sa.Column("params", JSONType, nullable=False, server_default="{}"),
            sa.Column("sent_at", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "notification_logs",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("notification_type", sa.String(64), nullable=False, server_default=""),
            sa.Column("title", sa.String(200), nullable=False, server_default=""),
            sa.Column("channel", sa.String(32), nullable=False),
            sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(32), nullable=False, server_default="sent"),
            sa.Column("sent_at", sa.Text(), nullable=False, server_default=""),
            sa.Column("created_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "communication_preferences",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("member_id", sa.String(64), nullable=False, server_default=""),
            sa.Column("email_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("sms_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("in_app_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("announcements", sa.String(32), nullable=False, server_default="realtime"),
            sa.Column("events", sa.String(32), nullable=False, server_default="realtime"),
            sa.Column("promotions", sa.String(32), nullable=False, server_default="weekly_digest"),
            sa.Column("quiet_hours_start", sa.String(8), nullable=False, server_default="22:00"),
            sa.Column("quiet_hours_end", sa.String(8), nullable=False, server_default="07:00"),
        ],
    )
    _mk(
        "personalized_notifications",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("title", sa.String(200), nullable=False, server_default=""),
            sa.Column("body", sa.Text(), nullable=False, server_default=""),
            sa.Column("channel", sa.String(32), nullable=False),
            sa.Column("recipient_ids", JSONType, nullable=False, server_default="[]"),
            sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
            sa.Column("sent_at", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("notes", sa.Text(), nullable=True),
        ],
    )
    _mk(
        "communication_campaigns",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("name", sa.String(200), nullable=False, server_default=""),
            sa.Column("description", sa.Text(), nullable=False, server_default=""),
            sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
            sa.Column("channels", JSONType, nullable=False, server_default="[]"),
            sa.Column("target_audience", sa.String(64), nullable=False, server_default="all"),
            sa.Column("template_id", sa.String(64), nullable=True),
            sa.Column("start_date", sa.Text(), nullable=True),
            sa.Column("end_date", sa.Text(), nullable=True),
            sa.Column("metrics", JSONType, nullable=False, server_default="{}"),
            sa.Column("created_by", sa.String(64), nullable=False, server_default=""),
            sa.Column("created_at", sa.Text(), nullable=False, server_default=""),
        ],
    )
    _mk(
        "sentiment_data_points",
        [
            sa.Column("id", sa.String(16), primary_key=True),
            sa.Column("source", sa.String(64), nullable=False, server_default=""),
            sa.Column("text", sa.Text(), nullable=False, server_default=""),
            sa.Column("sentiment", sa.String(32), nullable=False, server_default="neutral"),
            sa.Column("score", sa.Float(), nullable=False, server_default="0.5"),
            sa.Column("channel", sa.String(32), nullable=True),
            sa.Column("member_id", sa.String(64), nullable=True),
            sa.Column("timestamp", sa.Text(), nullable=False, server_default=""),
        ],
    )


def downgrade() -> None:
    for t in (
        "sentiment_data_points",
        "communication_campaigns",
        "personalized_notifications",
        "communication_preferences",
        "notification_logs",
        "scheduled_notifications",
        "notification_templates",
        "emergency_broadcasts",
        "announcements",
    ):
        sa.Table(t, Base.metadata).drop(checkfirst=True)
