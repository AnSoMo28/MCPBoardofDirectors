"""
In-memory repository for Communication domain.
Club: Castillo Country Club
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from club_mcp.models.communication import (
    Announcement,
    AnnouncementStatus,
    AnnouncementType,
    CommunicationPreferences,
    CreateAnnouncement,
    CreateCommunicationPreferences,
    CreateEmergencyBroadcast,
    CreateNotificationTemplate,
    CreatePersonalizedNotification,
    CreateScheduledNotification,
    EmergencyBroadcast,
    EmergencyType,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    NotificationTemplate,
    PersonalizedNotification,
    ScheduledNotification,
    TemplateCategory,
)

logger = logging.getLogger(__name__)


class CommunicationRepository:
    """In-memory CRUD repository for communication domain."""

    def __init__(self) -> None:
        self._announcements: dict[str, dict] = {}
        self._emergencies: dict[str, dict] = {}
        self._templates: dict[str, dict] = {}
        self._scheduled: dict[str, dict] = {}
        self._logs: dict[str, dict] = {}
        self._preferences: dict[str, dict] = {}
        self._personalized: dict[str, dict] = {}
        self._campaigns: dict[str, dict] = {}
        self._sentiment: dict[str, dict] = {}

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Announcements ───────────────────────────────────

    async def create_announcement(
        self, data: CreateAnnouncement
    ) -> Announcement:
        aid = self._gen_id()
        record = {
            "id": aid,
            "title": data.title,
            "body": data.body,
            "announcement_type": data.announcement_type,
            "status": AnnouncementStatus.DRAFT,
            "channels": data.channels,
            "target_audience": data.target_audience,
            "scheduled_at": data.scheduled_at,
            "sent_at": None,
            "created_by": data.created_by,
            "priority": data.priority,
            "requires_acknowledgment": data.requires_acknowledgment,
            "notes": data.notes,
        }
        self._announcements[aid] = record
        logger.info(
            "[communication] Announcement created: %s (%s)", data.title, aid
        )
        return Announcement(**record)


    async def update_announcement(
        self, announcement_id: str, updates: dict
    ) -> Optional[Announcement]:
        record = self._announcements.get(announcement_id)
        if record is None:
            return None
        record.update(updates)
        self._announcements[announcement_id] = record
        return Announcement(**record)

    async def list_announcements(
        self,
        announcement_type: Optional[AnnouncementType] = None,
        status: Optional[AnnouncementStatus] = None,
    ) -> list[Announcement]:
        results: list[Announcement] = []
        for record in self._announcements.values():
            if announcement_type and record["announcement_type"] != announcement_type:
                continue
            if status and record["status"] != status:
                continue
            results.append(Announcement(**record))
        return results
# En communication_repo.py — AGREGAR junto al list_announcements existente

    async def list_announcements_filtered(
        self,
        page: int = 1,
        page_size: int = 12,
        status: Optional[AnnouncementStatus] = None,
        announcement_type: Optional[AnnouncementType] = None,
        search: Optional[str] = None,
    ) -> dict[str, Any]:
        """List announcements with filters, search and pagination.

        Extends list_announcements() with pagination and text search.
        The original method remains unchanged for backward compatibility.
        """
        # Reuse existing method for base filtering
        base_results = await self.list_announcements(
            announcement_type=announcement_type,
            status=status,
        )

        # Search filter (in-memory for mock, SQL LIKE for real DB)
        if search:
            q = search.lower()
            base_results = [
                a for a in base_results
                if q in a.title.lower() or q in a.body.lower()
            ]

        # Sort by most recent first (assumes announcements have id or created_at)
        # For mock (in-memory dict), order is undefined, so we sort by id desc
        base_results.sort(key=lambda a: a.id, reverse=True)

        total = len(base_results)
        total_pages = max(1, (total + page_size - 1) // page_size)

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        items = base_results[start:end]

        return {
            "items": items,
            "total": total,
            "total_pages": total_pages,
        }


    async def get_announcement(self, announcement_id: str) -> Optional[Announcement]:
        """Get single announcement by ID."""
        record = self._announcements.get(announcement_id)
        if record:
            return Announcement(**record)
        return None

    # ── Emergency Broadcasts ────────────────────────────

    async def create_emergency(
        self, data: CreateEmergencyBroadcast
    ) -> EmergencyBroadcast:
        eid = self._gen_id()
        record = {
            "id": eid,
            "title": data.title,
            "body": data.body,
            "emergency_type": data.emergency_type,
            "status": NotificationStatus.PENDING,
            "channels": data.channels,
            "sent_at": None,
            "created_by": data.created_by,
            "acknowledged_count": 0,
            "notes": data.notes,
        }
        self._emergencies[eid] = record
        logger.info(
            "[communication] Emergency broadcast created: %s (%s)",
            data.title,
            eid,
        )
        return EmergencyBroadcast(**record)

    async def get_emergency(
        self, emergency_id: str
    ) -> Optional[EmergencyBroadcast]:
        record = self._emergencies.get(emergency_id)
        if record is None:
            return None
        return EmergencyBroadcast(**record)

    async def update_emergency(
        self, emergency_id: str, updates: dict
    ) -> Optional[EmergencyBroadcast]:
        record = self._emergencies.get(emergency_id)
        if record is None:
            return None
        record.update(updates)
        self._emergencies[emergency_id] = record
        return EmergencyBroadcast(**record)

    async def list_emergencies(
        self,
        emergency_type: Optional[EmergencyType] = None,
    ) -> list[EmergencyBroadcast]:
        results: list[EmergencyBroadcast] = []
        for record in self._emergencies.values():
            if emergency_type and record["emergency_type"] != emergency_type:
                continue
            results.append(EmergencyBroadcast(**record))
        return results

    # ── Templates ───────────────────────────────────────

    async def create_template(
        self, data: CreateNotificationTemplate
    ) -> NotificationTemplate:
        tid = self._gen_id()
        record = {
            "id": tid,
            "name": data.name,
            "category": data.category,
            "subject": data.subject,
            "body_template": data.body_template,
            "channels": data.channels,
            "variables": data.variables,
            "is_active": True,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        self._templates[tid] = record
        logger.info(
            "[communication] Template created: %s (%s)", data.name, tid
        )
        return NotificationTemplate(**record)

    async def get_template(
        self, template_id: str
    ) -> Optional[NotificationTemplate]:
        record = self._templates.get(template_id)
        if record is None:
            return None
        return NotificationTemplate(**record)

    async def update_template(
        self, template_id: str, updates: dict
    ) -> Optional[NotificationTemplate]:
        record = self._templates.get(template_id)
        if record is None:
            return None
        record.update(updates)
        self._templates[template_id] = record
        return NotificationTemplate(**record)

    async def list_templates(
        self,
        category: Optional[TemplateCategory] = None,
        active_only: bool = False,
    ) -> list[NotificationTemplate]:
        results: list[NotificationTemplate] = []
        for record in self._templates.values():
            if category and record["category"] != category:
                continue
            if active_only and not record["is_active"]:
                continue
            results.append(NotificationTemplate(**record))
        return results

    # ── Scheduled Notifications ─────────────────────────

    async def create_scheduled(
        self, data: CreateScheduledNotification
    ) -> ScheduledNotification:
        sid = self._gen_id()
        record = {
            "id": sid,
            "template_id": data.template_id,
            "recipient_ids": data.recipient_ids,
            "channel": data.channel,
            "scheduled_at": data.scheduled_at,
            "status": NotificationStatus.QUEUED,
            "params": data.params,
            "sent_at": None,
            "notes": data.notes,
        }
        self._scheduled[sid] = record
        logger.info(
            "[communication] Scheduled notification created: %s", sid
        )
        return ScheduledNotification(**record)

    async def get_scheduled(
        self, scheduled_id: str
    ) -> Optional[ScheduledNotification]:
        record = self._scheduled.get(scheduled_id)
        if record is None:
            return None
        return ScheduledNotification(**record)

    async def update_scheduled(
        self, scheduled_id: str, updates: dict
    ) -> Optional[ScheduledNotification]:
        record = self._scheduled.get(scheduled_id)
        if record is None:
            return None
        record.update(updates)
        self._scheduled[scheduled_id] = record
        return ScheduledNotification(**record)

    async def list_scheduled(
        self,
        status: Optional[NotificationStatus] = None,
    ) -> list[ScheduledNotification]:
        results: list[ScheduledNotification] = []
        for record in self._scheduled.values():
            if status and record["status"] != status:
                continue
            results.append(ScheduledNotification(**record))
        return results

    # ── Notification Logs ───────────────────────────────

    async def create_log(
        self,
        notification_type: str,
        title: str,
        channel: NotificationChannel,
        recipient_count: int,
        status: NotificationStatus,
        created_by: str = "",
        notes: Optional[str] = None,
    ) -> NotificationLog:
        lid = self._gen_id()
        record = {
            "id": lid,
            "notification_type": notification_type,
            "title": title,
            "channel": channel,
            "recipient_count": recipient_count,
            "status": status,
            "sent_at": datetime.now(tz=timezone.utc).isoformat(),
            "created_by": created_by,
            "notes": notes,
        }
        self._logs[lid] = record
        return NotificationLog(**record)

    async def list_logs(
        self,
        limit: int = 50,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        channel: Optional[NotificationChannel] = None,
        notification_type: Optional[str] = None,
    ) -> list[NotificationLog]:
        """List notification logs with optional filters, sorted by date desc.

        Filters are additive. All parameters are optional.
        """
        results = [NotificationLog(**r) for r in self._logs.values()]

        # Date range filter
        if date_from:
            try:
                dt_from = datetime.fromisoformat(date_from)
                results = [
                    r for r in results
                    if r.sent_at
                    and datetime.fromisoformat(
                        r.sent_at.replace("Z", "+00:00")
                    ) >= dt_from
                ]
            except (ValueError, TypeError):
                pass

        if date_to:
            try:
                dt_to = datetime.fromisoformat(date_to)
                results = [
                    r for r in results
                    if r.sent_at
                    and datetime.fromisoformat(
                        r.sent_at.replace("Z", "+00:00")
                    ) <= dt_to
                ]
            except (ValueError, TypeError):
                pass

        # Channel filter
        if channel is not None:
            results = [r for r in results if r.channel == channel]

        # Type filter
        if notification_type:
            results = [
                r for r in results
                if r.notification_type == notification_type
            ]

        results.sort(key=lambda l: l.sent_at, reverse=True)
        return results[:limit]

    # ── Communication Preferences ───────────────────────

    async def create_preferences(
        self, data: CreateCommunicationPreferences
    ) -> CommunicationPreferences:
        pid = self._gen_id()
        record = {
            "id": pid,
            "member_id": data.member_id,
            "email_enabled": data.email_enabled,
            "push_enabled": data.push_enabled,
            "sms_enabled": data.sms_enabled,
            "whatsapp_enabled": data.whatsapp_enabled,
            "in_app_enabled": data.in_app_enabled,
            "announcements": data.announcements,
            "events": data.events,
            "promotions": data.promotions,
            "quiet_hours_start": data.quiet_hours_start,
            "quiet_hours_end": data.quiet_hours_end,
        }
        self._preferences[pid] = record
        logger.info(
            "[communication] Preferences created for member: %s",
            data.member_id,
        )
        return CommunicationPreferences(**record)

    async def get_preferences(
        self, preferences_id: str
    ) -> Optional[CommunicationPreferences]:
        record = self._preferences.get(preferences_id)
        if record is None:
            return None
        return CommunicationPreferences(**record)

    async def get_preferences_by_member(
        self, member_id: str
    ) -> Optional[CommunicationPreferences]:
        for record in self._preferences.values():
            if record["member_id"] == member_id:
                return CommunicationPreferences(**record)
        return None

    async def update_preferences(
        self, preferences_id: str, updates: dict
    ) -> Optional[CommunicationPreferences]:
        record = self._preferences.get(preferences_id)
        if record is None:
            return None
        record.update(updates)
        self._preferences[preferences_id] = record
        return CommunicationPreferences(**record)

    async def list_preferences(self) -> list[CommunicationPreferences]:
        return [
            CommunicationPreferences(**r) for r in self._preferences.values()
        ]

    # ── Personalized Notifications ──────────────────────

    async def create_personalized(
        self, data: CreatePersonalizedNotification
    ) -> PersonalizedNotification:
        pid = self._gen_id()
        record = {
            "id": pid,
            "title": data.title,
            "body": data.body,
            "channel": data.channel,
            "recipient_ids": data.recipient_ids,
            "status": NotificationStatus.PENDING,
            "sent_at": None,
            "created_by": data.created_by,
            "notes": data.notes,
        }
        self._personalized[pid] = record
        logger.info(
            "[communication] Personalized notification created: %s", pid
        )
        return PersonalizedNotification(**record)

    async def get_personalized(
        self, notification_id: str
    ) -> Optional[PersonalizedNotification]:
        record = self._personalized.get(notification_id)
        if record is None:
            return None
        return PersonalizedNotification(**record)

    async def update_personalized(
        self, notification_id: str, updates: dict
    ) -> Optional[PersonalizedNotification]:
        record = self._personalized.get(notification_id)
        if record is None:
            return None
        record.update(updates)
        self._personalized[notification_id] = record
        return PersonalizedNotification(**record)

    async def list_personalized(self) -> list[PersonalizedNotification]:
        return [
            PersonalizedNotification(**r)
            for r in self._personalized.values()
        ]

    # ── Campaigns (F28) ────────────────────────────────

    async def create_campaign(
        self, data: "CreateCampaign"
    ) -> "Campaign":
        from club_mcp.models.communication import (
            Campaign,
            CampaignMetrics,
            CampaignStatus,
            CreateCampaign,
        )

        cid = self._gen_id()
        record = {
            "id": cid,
            "name": data.name,
            "description": data.description,
            "status": CampaignStatus.DRAFT,
            "channels": data.channels,
            "target_audience": data.target_audience,
            "template_id": data.template_id,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "metrics": {
                "sent": 0,
                "delivered": 0,
                "opened": 0,
                "clicked": 0,
                "failed": 0,
                "bounced": 0,
            },
            "created_by": data.created_by,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        self._campaigns[cid] = record
        logger.info(
            "[communication] Campaign created: %s (%s)",
            data.name,
            cid,
        )
        return Campaign(**record)

    async def get_campaign(
        self, campaign_id: str
    ) -> "Optional[Campaign]":
        from club_mcp.models.communication import Campaign

        record = self._campaigns.get(campaign_id)
        if record is None:
            return None
        return Campaign(**record)

    async def list_campaigns(
        self,
        status: "Optional[CampaignStatus]" = None,
        limit: int = 20,
    ) -> "list[Campaign]":
        from club_mcp.models.communication import Campaign, CampaignStatus

        results: list = []
        for record in self._campaigns.values():
            if status and record.get("status") != status:
                continue
            results.append(Campaign(**record))
        return results[:limit]

    async def update_campaign(
        self, campaign_id: str, updates: dict
    ) -> "Optional[Campaign]":
        from club_mcp.models.communication import Campaign

        record = self._campaigns.get(campaign_id)
        if record is None:
            return None
        record.update(updates)
        self._campaigns[campaign_id] = record
        return Campaign(**record)

    async def delete_campaign(self, campaign_id: str) -> bool:
        if campaign_id in self._campaigns:
            del self._campaigns[campaign_id]
            logger.info(
                "[communication] Campaign deleted: %s", campaign_id
            )
            return True
        return False

    # ── Sentiment (F28) ────────────────────────────────

    async def record_sentiment(
        self, data: "CreateSentimentDataPoint"
    ) -> "SentimentDataPoint":
        from club_mcp.models.communication import (
            CreateSentimentDataPoint,
            SentimentDataPoint,
        )

        sid = self._gen_id()
        record = {
            "id": sid,
            "source": data.source,
            "text": data.text,
            "sentiment": data.sentiment,
            "score": data.score,
            "channel": data.channel,
            "member_id": data.member_id,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }
        self._sentiment[sid] = record
        return SentimentDataPoint(**record)

    async def get_sentiment_history(
        self,
        days: int = 30,
        channel: "Optional[NotificationChannel]" = None,
    ) -> "list[SentimentDataPoint]":
        from club_mcp.models.communication import SentimentDataPoint

        now = datetime.now(tz=timezone.utc)
        cutoff = now.timestamp() - (days * 86400)

        results: list = []
        for record in self._sentiment.values():
            ts = record.get("timestamp", "")
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if dt.timestamp() < cutoff:
                    continue
            except (ValueError, TypeError):
                continue
            if channel and record.get("channel") != channel:
                continue
            results.append(SentimentDataPoint(**record))

        results.sort(key=lambda s: s.timestamp, reverse=True)
        return results
