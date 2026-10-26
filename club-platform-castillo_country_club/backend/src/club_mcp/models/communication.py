"""
Pydantic models for Communication domain.
Club: Castillo Country Club
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────

class NotificationChannel(str, Enum):
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    IN_APP = "in_app"


class AnnouncementType(str, Enum):
    GENERAL = "general"
    EVENT = "event"
    MAINTENANCE = "maintenance"
    PROMOTION = "promotion"
    POLICY = "policy"
    SEASONAL = "seasonal"


class AnnouncementStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENT = "sent"
    CANCELLED = "cancelled"


class EmergencyType(str, Enum):
    WEATHER = "weather"
    SECURITY = "security"
    HEALTH = "health"
    INFRASTRUCTURE = "infrastructure"
    EVACUATION = "evacuation"


class TemplateCategory(str, Enum):
    WELCOME = "welcome"
    EVENT_REMINDER = "event_reminder"
    PAYMENT_REMINDER = "payment_reminder"
    BIRTHDAY = "birthday"
    ANNIVERSARY = "anniversary"
    SEASONAL_GREETING = "seasonal_greeting"
    MAINTENANCE_NOTICE = "maintenance_notice"
    PROMOTION = "promotion"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FrequencyPreference(str, Enum):
    REALTIME = "realtime"
    DAILY_DIGEST = "daily_digest"
    WEEKLY_DIGEST = "weekly_digest"
    NONE = "none"


# ── Entity Schemas ─────────────────────────────────────

class Announcement(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    body: str
    announcement_type: AnnouncementType = AnnouncementType.GENERAL
    status: AnnouncementStatus = AnnouncementStatus.DRAFT
    channels: list[NotificationChannel] = Field(default_factory=list)
    target_audience: str = "all"
    scheduled_at: Optional[str] = None
    sent_at: Optional[str] = None
    created_by: str = ""
    priority: int = 1
    requires_acknowledgment: bool = False
    notes: Optional[str] = None


class EmergencyBroadcast(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    body: str
    emergency_type: EmergencyType
    status: NotificationStatus = NotificationStatus.PENDING
    channels: list[NotificationChannel] = Field(default_factory=list)
    sent_at: Optional[str] = None
    created_by: str = ""
    acknowledged_count: int = 0
    notes: Optional[str] = None


class NotificationTemplate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: TemplateCategory
    subject: str
    body_template: str
    channels: list[NotificationChannel] = Field(default_factory=list)
    variables: list[str] = Field(default_factory=list)
    is_active: bool = True
    created_at: str = ""


class ScheduledNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    template_id: str
    recipient_ids: list[str] = Field(default_factory=list)
    channel: NotificationChannel
    scheduled_at: str
    status: NotificationStatus = NotificationStatus.QUEUED
    params: dict[str, str] = Field(default_factory=dict)
    sent_at: Optional[str] = None
    notes: Optional[str] = None


class NotificationLog(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    notification_type: str
    title: str
    channel: NotificationChannel
    recipient_count: int = 0
    status: NotificationStatus = NotificationStatus.SENT
    sent_at: str = ""
    created_by: str = ""
    notes: Optional[str] = None


class CommunicationPreferences(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    member_id: str
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    whatsapp_enabled: bool = True
    in_app_enabled: bool = True
    announcements: FrequencyPreference = FrequencyPreference.REALTIME
    events: FrequencyPreference = FrequencyPreference.REALTIME
    promotions: FrequencyPreference = FrequencyPreference.WEEKLY_DIGEST
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


class PersonalizedNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    body: str
    channel: NotificationChannel
    recipient_ids: list[str] = Field(default_factory=list)
    status: NotificationStatus = NotificationStatus.PENDING
    sent_at: Optional[str] = None
    created_by: str = ""
    notes: Optional[str] = None


# ── Create Schemas ─────────────────────────────────────

class CreateAnnouncement(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    body: str
    announcement_type: AnnouncementType = AnnouncementType.GENERAL
    channels: list[NotificationChannel] = Field(default_factory=list)
    target_audience: str = "all"
    scheduled_at: Optional[str] = None
    created_by: str = ""
    priority: int = 1
    requires_acknowledgment: bool = False
    notes: Optional[str] = None


class CreateEmergencyBroadcast(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    body: str
    emergency_type: EmergencyType
    channels: list[NotificationChannel] = Field(default_factory=list)
    created_by: str = ""
    notes: Optional[str] = None


class CreateNotificationTemplate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    category: TemplateCategory
    subject: str
    body_template: str
    channels: list[NotificationChannel] = Field(default_factory=list)
    variables: list[str] = Field(default_factory=list)


class CreateScheduledNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    template_id: str
    recipient_ids: list[str] = Field(default_factory=list)
    channel: NotificationChannel
    scheduled_at: str
    params: dict[str, str] = Field(default_factory=dict)
    notes: Optional[str] = None


class CreateCommunicationPreferences(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: str
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    whatsapp_enabled: bool = True
    in_app_enabled: bool = True
    announcements: FrequencyPreference = FrequencyPreference.REALTIME
    events: FrequencyPreference = FrequencyPreference.REALTIME
    promotions: FrequencyPreference = FrequencyPreference.WEEKLY_DIGEST
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "07:00"


class CreatePersonalizedNotification(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    body: str
    channel: NotificationChannel
    recipient_ids: list[str] = Field(default_factory=list)
    created_by: str = ""
    notes: Optional[str] = None


# ── Update Schemas ─────────────────────────────────────

class UpdateNotificationTemplate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    category: Optional[TemplateCategory] = None
    subject: Optional[str] = None
    body_template: Optional[str] = None
    channels: Optional[list[NotificationChannel]] = None
    variables: Optional[list[str]] = None
    is_active: Optional[bool] = None


class UpdateCommunicationPreferences(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    announcements: Optional[FrequencyPreference] = None
    events: Optional[FrequencyPreference] = None
    promotions: Optional[FrequencyPreference] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


# ══════════════════════════════════════════════════════════
# F28 — Campaign Models
# ══════════════════════════════════════════════════════════

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignMetrics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sent: int = 0
    delivered: int = 0
    opened: int = 0
    clicked: int = 0
    failed: int = 0
    bounced: int = 0


class Campaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str = ""
    status: CampaignStatus = CampaignStatus.DRAFT
    channels: list[NotificationChannel] = Field(default_factory=list)
    target_audience: str = "all"
    template_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    metrics: CampaignMetrics = Field(default_factory=CampaignMetrics)
    created_by: str = ""
    created_at: str = ""


class CreateCampaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    description: str = ""
    channels: list[NotificationChannel] = Field(default_factory=list)
    target_audience: str = "all"
    template_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_by: str = ""


class UpdateCampaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    channels: Optional[list[NotificationChannel]] = None
    target_audience: Optional[str] = None
    template_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# ══════════════════════════════════════════════════════════
# F28 — Sentiment Models
# ══════════════════════════════════════════════════════════

class SentimentLevel(str, Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


class SentimentDataPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source: str = ""
    text: str = ""
    sentiment: SentimentLevel = SentimentLevel.NEUTRAL
    score: float = 0.5
    channel: Optional[NotificationChannel] = None
    member_id: Optional[str] = None
    timestamp: str = ""


class CreateSentimentDataPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source: str = ""
    text: str = ""
    sentiment: SentimentLevel = SentimentLevel.NEUTRAL
    score: float = 0.5
    channel: Optional[NotificationChannel] = None
    member_id: Optional[str] = None


# ══════════════════════════════════════════════════════════
# F28 — Intelligence Response Models
# ══════════════════════════════════════════════════════════

class CommunicationInsightDimension(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dimension: str
    score: float
    status: str
    finding: str
    recommendation: str
    benchmark: Optional[str] = None
    metric_value: Optional[float] = None
    metric_unit: Optional[str] = None


class CommunicationInsightsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    overall_score: float
    dimensions: list[CommunicationInsightDimension]
    alerts: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    generated_at: str = ""


class HealthFactors(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    delivery: float = 0
    diversity: float = 0
    reliability: float = 0
    frequency: float = 0
    engagement: float = 0


class CommunicationHealthResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: float
    level: str
    factors: HealthFactors
    trend: str = "stable"
    benchmark_comparison: str = ""


class CampaignSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_campaigns: int = 0
    total_sent: int = 0
    avg_engagement: float = 0
    top_channel: str = "N/A"
    top_type: str = "N/A"


class CampaignPerformanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    campaigns: list[Campaign] = Field(default_factory=list)
    summary: CampaignSummary = Field(default_factory=CampaignSummary)
    top_performers: list[Campaign] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
