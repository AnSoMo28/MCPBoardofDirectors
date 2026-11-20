"""CommunicationRepository async — los 9 dicts se vuelven 9 tablas.

Ola 2.1-octava (vertical communication). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.communication_repo)
— mismos 35 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía / dict — el in-memory no
define excepciones custom y el ORM tampoco las inventa).

La octava es async-FIRST como la sexta y la séptima (drop-in total):
el in-memory ya es 35/35 async y el agente YA awaited sus 38 call
sites (verificado por grep — 0 privados tocados: contrato limpio, el
mayor vertical drop-in hasta la fecha).

Mismas decisiones que family/engagement/event/compliance/guest/
satisfaction (§3.8 y siguientes): engine por inyección ·
session_scope transaccional · devuelve Pydantic (SQLAlchemy no sube)
· ids de la MISMA forma que el in-memory (uuid4().hex[:8] SIN
prefijo — el contrato no cambia ni un byte).

Semántica literal del in-memory que se preserva:
  * create_*: INSERT puro con defaults del in-memory (status DRAFT/
    PENDING/QUEUED · metrics sent:0... · is_active True ·
    acknowledged_count 0 · sent_at None).
  * update_* (updates: dict): UPDATE de las claves presentes — el
    in-memory hacía record.update(updates) sobre el dict plano; el ORM
    aplica setattr por clave conocida de columna (las claves que el
    in-memory aceptaba: columnas del modelo, sin tocar id) y devuelve
    el registro reconstruido. Clave desconocida: el in-memory la
    guardaba en el dict (Pydantic la ignoraría al reconstruir en
    modelos sin extra="forbid"); el ORM la ignora silenciosamente —
    MISMO comportamiento observable del contrato.
  * get_*: None si no existe (sin excepciones).
  * list_*: filtro por igualdad + límites literales (list_campaigns
    [:limit] · list_logs sort por sent_at desc + [:limit] ·
    list_announcements_filtered: paginación total_pages=
    max(1, ceil) + items por página).
  * get_preferences_by_member: PRIMER registro cuyo member_id calza
    (el in-memory iteraba .values() — mismo orden de inserción).
  * get_sentiment_history: filtro últimos N días (cutoff timestamp)
    + canal + sort por timestamp desc — MISMA aritmética y MISMO
    manejo de parseo (fromisoformat con replace("Z","+00:00") ·
    ValueError/TypeError → skip silencioso).
  * delete_campaign: True si existía, False si no.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Optional
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.communication_orm import (
    AnnouncementORM,
    CampaignORM,
    CommunicationPreferencesORM,
    EmergencyBroadcastORM,
    NotificationLogORM,
    NotificationTemplateORM,
    PersonalizedNotificationORM,
    ScheduledNotificationORM,
    SentimentDataPointORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.communication import (
    Announcement,
    AnnouncementStatus,
    AnnouncementType,
    Campaign,
    CommunicationPreferences,
    CreateAnnouncement,
    CreateCommunicationPreferences,
    CreateEmergencyBroadcast,
    CreateNotificationTemplate,
    CreatePersonalizedNotification,
    CreateScheduledNotification,
    CreateSentimentDataPoint,
    EmergencyBroadcast,
    EmergencyType,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    NotificationTemplate,
    PersonalizedNotification,
    ScheduledNotification,
    SentimentDataPoint,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8] sin prefijo)."""
    return uuid4().hex[:8]


def _utcnow_iso() -> str:
    """now ISO UTC — misma fuente que el in-memory (create_log/...)."""
    return datetime.now(tz=UTC).isoformat()


# ── helpers de reconstrucción (ORM → Pydantic) ──


def _announcement_from_orm(r: AnnouncementORM) -> Announcement:
    return Announcement(
        id=r.id,
        title=r.title,
        body=r.body,
        announcement_type=AnnouncementType(r.announcement_type),
        status=AnnouncementStatus(r.status),
        channels=[
            NotificationChannel(c) for c in (r.channels or []) if c
        ],
        target_audience=r.target_audience,
        scheduled_at=r.scheduled_at,
        sent_at=r.sent_at,
        created_by=r.created_by,
        priority=r.priority,
        requires_acknowledgment=r.requires_acknowledgment,
        notes=r.notes,
    )


def _emergency_from_orm(r: EmergencyBroadcastORM) -> EmergencyBroadcast:
    return EmergencyBroadcast(
        id=r.id,
        title=r.title,
        body=r.body,
        emergency_type=EmergencyType(r.emergency_type),
        status=NotificationStatus(r.status),
        channels=[
            NotificationChannel(c) for c in (r.channels or []) if c
        ],
        sent_at=r.sent_at,
        created_by=r.created_by,
        acknowledged_count=r.acknowledged_count,
        notes=r.notes,
    )


def _template_from_orm(r: NotificationTemplateORM) -> NotificationTemplate:
    from club_mcp.models.communication import TemplateCategory

    return NotificationTemplate(
        id=r.id,
        name=r.name,
        category=TemplateCategory(r.category),
        subject=r.subject,
        body_template=r.body_template,
        channels=[
            NotificationChannel(c) for c in (r.channels or []) if c
        ],
        variables=list(r.variables or []),
        is_active=r.is_active,
        created_at=r.created_at,
    )


def _scheduled_from_orm(r: ScheduledNotificationORM) -> ScheduledNotification:
    return ScheduledNotification(
        id=r.id,
        template_id=r.template_id,
        recipient_ids=list(r.recipient_ids or []),
        channel=NotificationChannel(r.channel),
        scheduled_at=r.scheduled_at,
        status=NotificationStatus(r.status),
        params=dict(r.params or {}),
        sent_at=r.sent_at,
        notes=r.notes,
    )


def _log_from_orm(r: NotificationLogORM) -> NotificationLog:
    return NotificationLog(
        id=r.id,
        notification_type=r.notification_type,
        title=r.title,
        channel=NotificationChannel(r.channel),
        recipient_count=r.recipient_count,
        status=NotificationStatus(r.status),
        sent_at=r.sent_at,
        created_by=r.created_by,
        notes=r.notes,
    )


def _preferences_from_orm(
    r: CommunicationPreferencesORM,
) -> CommunicationPreferences:
    from club_mcp.models.communication import FrequencyPreference

    return CommunicationPreferences(
        id=r.id,
        member_id=r.member_id,
        email_enabled=r.email_enabled,
        push_enabled=r.push_enabled,
        sms_enabled=r.sms_enabled,
        whatsapp_enabled=r.whatsapp_enabled,
        in_app_enabled=r.in_app_enabled,
        announcements=FrequencyPreference(r.announcements),
        events=FrequencyPreference(r.events),
        promotions=FrequencyPreference(r.promotions),
        quiet_hours_start=r.quiet_hours_start,
        quiet_hours_end=r.quiet_hours_end,
    )


def _personalized_from_orm(
    r: PersonalizedNotificationORM,
) -> PersonalizedNotification:
    return PersonalizedNotification(
        id=r.id,
        title=r.title,
        body=r.body,
        channel=NotificationChannel(r.channel),
        recipient_ids=list(r.recipient_ids or []),
        status=NotificationStatus(r.status),
        sent_at=r.sent_at,
        created_by=r.created_by,
        notes=r.notes,
    )


def _campaign_from_orm(r: CampaignORM) -> Campaign:
    from club_mcp.models.communication import CampaignMetrics, CampaignStatus

    return Campaign(
        id=r.id,
        name=r.name,
        description=r.description,
        status=CampaignStatus(r.status),
        channels=[
            NotificationChannel(c) for c in (r.channels or []) if c
        ],
        target_audience=r.target_audience,
        template_id=r.template_id,
        start_date=r.start_date,
        end_date=r.end_date,
        metrics=CampaignMetrics(**dict(r.metrics or {})),
        created_by=r.created_by,
        created_at=r.created_at,
    )


def _sentiment_from_orm(r: SentimentDataPointORM) -> SentimentDataPoint:
    from club_mcp.models.communication import SentimentLevel

    return SentimentDataPoint(
        id=r.id,
        source=r.source,
        text=r.text,
        sentiment=SentimentLevel(r.sentiment),
        score=r.score,
        channel=NotificationChannel(r.channel) if r.channel else None,
        member_id=r.member_id,
        timestamp=r.timestamp,
    )


# columnas actualizables por entidad (update_* — las claves del dict
# del in-memory que calzan con columnas reales; id nunca se toca).
_UPDATABLE: dict[str, set[str]] = {
    "announcement": {
        "title", "body", "announcement_type", "status", "channels",
        "target_audience", "scheduled_at", "sent_at", "created_by",
        "priority", "requires_acknowledgment", "notes",
    },
    "emergency": {
        "title", "body", "emergency_type", "status", "channels",
        "sent_at", "created_by", "acknowledged_count", "notes",
    },
    "template": {
        "name", "category", "subject", "body_template", "channels",
        "variables", "is_active", "created_at",
    },
    "scheduled": {
        "template_id", "recipient_ids", "channel", "scheduled_at",
        "status", "params", "sent_at", "notes",
    },
    "preferences": {
        "member_id", "email_enabled", "push_enabled", "sms_enabled",
        "whatsapp_enabled", "in_app_enabled", "announcements", "events",
        "promotions", "quiet_hours_start", "quiet_hours_end",
    },
    "personalized": {
        "title", "body", "channel", "recipient_ids", "status",
        "sent_at", "created_by", "notes",
    },
    "campaign": {
        "name", "description", "status", "channels", "target_audience",
        "template_id", "start_date", "end_date", "metrics", "created_by",
        "created_at",
    },
}


def _apply_updates(obj: Any, updates: dict, key: str) -> None:
    """record.update(updates) del in-memory — setattr por clave de columna.

    Las claves que no calzan con una columna se ignoran (el dict del
    in-memory las guardaba pero Pydantic las descartaba al reconstruir:
    mismo comportamiento observable). id no se toca nunca.
    """
    allowed = _UPDATABLE[key]
    for k, v in (updates or {}).items():
        if k in allowed:
            setattr(obj, k, v)


async def _load_all(s: Any, cls: Any) -> list[Any]:
    return list((await s.execute(select(cls))).scalars().all())


class CommunicationRepository:
    """Repo ORM async — contrato EXACTO del in-memory (35 métodos)."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Announcements ────────────────────────────────────────

    async def create_announcement(
        self, data: CreateAnnouncement
    ) -> Announcement:
        record = AnnouncementORM(
            id=_gen_id(),
            title=data.title,
            body=data.body,
            announcement_type=_enum_val(data.announcement_type),
            status=AnnouncementStatus.DRAFT.value,
            channels=_channels_list(data.channels),
            target_audience=data.target_audience,
            scheduled_at=data.scheduled_at,
            sent_at=None,
            created_by=data.created_by,
            priority=data.priority,
            requires_acknowledgment=data.requires_acknowledgment,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Announcement created: %s (%s)",
            data.title,
            record.id,
        )
        return _announcement_from_orm(record)

    async def update_announcement(
        self, announcement_id: str, updates: dict
    ) -> Optional[Announcement]:
        async with session_scope(self._engine) as s:
            record = await s.get(AnnouncementORM, announcement_id)
            if record is None:
                return None
            _apply_updates(record, updates, "announcement")
            await s.flush()
            return _announcement_from_orm(record)

    async def list_announcements(
        self,
        announcement_type: Optional[AnnouncementType] = None,
        status: Optional[AnnouncementStatus] = None,
    ) -> list[Announcement]:
        # ojo: el orden de inserción ES el orden del dict in-memory
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, AnnouncementORM)
            return [
                _announcement_from_orm(r)
                for r in rows
                if (not announcement_type
                    or r.announcement_type == announcement_type.value)
                and (not status or r.status == status.value)
            ]

    async def list_announcements_filtered(
        self,
        page: int = 1,
        page_size: int = 12,
        status: Optional[AnnouncementStatus] = None,
        announcement_type: Optional[AnnouncementType] = None,
        search: Optional[str] = None,
    ) -> dict[str, Any]:
        """MISMA semántica del in-memory: filtro base + search + sort
        por id desc + paginación (total_pages=max(1, ceil))."""
        base_results = await self.list_announcements(
            announcement_type=announcement_type,
            status=status,
        )
        if search:
            q = search.lower()
            base_results = [
                a for a in base_results
                if q in a.title.lower() or q in a.body.lower()
            ]
        base_results.sort(key=lambda a: a.id, reverse=True)
        total = len(base_results)
        total_pages = max(1, (total + page_size - 1) // page_size)
        start = (page - 1) * page_size
        end = start + page_size
        items = base_results[start:end]
        return {
            "items": items,
            "total": total,
            "total_pages": total_pages,
        }

    async def get_announcement(
        self, announcement_id: str
    ) -> Optional[Announcement]:
        async with session_scope(self._engine) as s:
            record = await s.get(AnnouncementORM, announcement_id)
            if record is None:
                return None
            return _announcement_from_orm(record)

    # ── Emergency Broadcasts ─────────────────────────────────

    async def create_emergency(
        self, data: CreateEmergencyBroadcast
    ) -> EmergencyBroadcast:
        record = EmergencyBroadcastORM(
            id=_gen_id(),
            title=data.title,
            body=data.body,
            emergency_type=_enum_val(data.emergency_type),
            status=NotificationStatus.PENDING.value,
            channels=_channels_list(data.channels),
            sent_at=None,
            created_by=data.created_by,
            acknowledged_count=0,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Emergency broadcast created: %s (%s)",
            data.title,
            record.id,
        )
        return _emergency_from_orm(record)

    async def get_emergency(
        self, emergency_id: str
    ) -> Optional[EmergencyBroadcast]:
        async with session_scope(self._engine) as s:
            record = await s.get(EmergencyBroadcastORM, emergency_id)
            if record is None:
                return None
            return _emergency_from_orm(record)

    async def update_emergency(
        self, emergency_id: str, updates: dict
    ) -> Optional[EmergencyBroadcast]:
        async with session_scope(self._engine) as s:
            record = await s.get(EmergencyBroadcastORM, emergency_id)
            if record is None:
                return None
            _apply_updates(record, updates, "emergency")
            await s.flush()
            return _emergency_from_orm(record)

    async def list_emergencies(
        self,
        emergency_type: Optional[EmergencyType] = None,
    ) -> list[EmergencyBroadcast]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, EmergencyBroadcastORM)
            return [
                _emergency_from_orm(r)
                for r in rows
                if not emergency_type
                or r.emergency_type == emergency_type.value
            ]

    # ── Templates ────────────────────────────────────────────

    async def create_template(
        self, data: CreateNotificationTemplate
    ) -> NotificationTemplate:
        record = NotificationTemplateORM(
            id=_gen_id(),
            name=data.name,
            category=_enum_val(data.category),
            subject=data.subject,
            body_template=data.body_template,
            channels=_channels_list(data.channels),
            variables=[
                v if isinstance(v, str) else str(v)
                for v in (data.variables or [])
            ],
            is_active=True,
            created_at=_utcnow_iso(),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Template created: %s (%s)",
            data.name,
            record.id,
        )
        return _template_from_orm(record)

    async def get_template(
        self, template_id: str
    ) -> Optional[NotificationTemplate]:
        async with session_scope(self._engine) as s:
            record = await s.get(NotificationTemplateORM, template_id)
            if record is None:
                return None
            return _template_from_orm(record)

    async def update_template(
        self, template_id: str, updates: dict
    ) -> Optional[NotificationTemplate]:
        async with session_scope(self._engine) as s:
            record = await s.get(NotificationTemplateORM, template_id)
            if record is None:
                return None
            _apply_updates(record, updates, "template")
            await s.flush()
            return _template_from_orm(record)

    async def list_templates(
        self,
        category: Optional[Any] = None,
        active_only: bool = False,
    ) -> list[NotificationTemplate]:
        # ojo: orden de inserción ES el orden del dict in-memory
        category_val = getattr(category, "value", category)
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, NotificationTemplateORM)
            return [
                _template_from_orm(r)
                for r in rows
                if (not category_val or r.category == category_val)
                and (not active_only or r.is_active)
            ]

    # ── Scheduled Notifications ──────────────────────────────

    async def create_scheduled(
        self, data: CreateScheduledNotification
    ) -> ScheduledNotification:
        record = ScheduledNotificationORM(
            id=_gen_id(),
            template_id=data.template_id,
            recipient_ids=list(data.recipient_ids or []),
            channel=_enum_val(data.channel),
            scheduled_at=data.scheduled_at,
            status=NotificationStatus.QUEUED.value,
            params=dict(data.params or {}),
            sent_at=None,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Scheduled notification created: %s",
            record.id,
        )
        return _scheduled_from_orm(record)

    async def get_scheduled(
        self, scheduled_id: str
    ) -> Optional[ScheduledNotification]:
        async with session_scope(self._engine) as s:
            record = await s.get(ScheduledNotificationORM, scheduled_id)
            if record is None:
                return None
            return _scheduled_from_orm(record)

    async def update_scheduled(
        self, scheduled_id: str, updates: dict
    ) -> Optional[ScheduledNotification]:
        async with session_scope(self._engine) as s:
            record = await s.get(ScheduledNotificationORM, scheduled_id)
            if record is None:
                return None
            _apply_updates(record, updates, "scheduled")
            await s.flush()
            return _scheduled_from_orm(record)

    async def list_scheduled(
        self,
        status: Optional[Any] = None,
    ) -> list[ScheduledNotification]:
        status_val = getattr(status, "value", status)
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, ScheduledNotificationORM)
            return [
                _scheduled_from_orm(r)
                for r in rows
                if not status_val or r.status == status_val
            ]

    # ── Notification Logs ─────────────────────────────────────

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
        record = NotificationLogORM(
            id=_gen_id(),
            notification_type=notification_type,
            title=title,
            channel=_enum_val(channel),
            recipient_count=recipient_count,
            status=_enum_val(status),
            sent_at=_utcnow_iso(),
            created_by=created_by,
            notes=notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return _log_from_orm(record)

    async def list_logs(
        self,
        limit: int = 50,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        channel: Optional[NotificationChannel] = None,
        notification_type: Optional[str] = None,
    ) -> list[NotificationLog]:
        """MISMA aritmética del in-memory: filtros aditivos · sent_at
        ISO parse (ValueError/TypeError → skip silencioso) · sort desc
        · [:limit]."""
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, NotificationLogORM)
        results = [_log_from_orm(r) for r in rows]

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
        if channel is not None:
            results = [r for r in results if r.channel == channel]
        if notification_type:
            results = [
                r for r in results
                if r.notification_type == notification_type
            ]
        results.sort(key=lambda l: l.sent_at, reverse=True)
        return results[:limit]

    # ── Communication Preferences ────────────────────────────

    async def create_preferences(
        self, data: CreateCommunicationPreferences
    ) -> CommunicationPreferences:
        record = CommunicationPreferencesORM(
            id=_gen_id(),
            member_id=data.member_id,
            email_enabled=data.email_enabled,
            push_enabled=data.push_enabled,
            sms_enabled=data.sms_enabled,
            whatsapp_enabled=data.whatsapp_enabled,
            in_app_enabled=data.in_app_enabled,
            announcements=_enum_val(data.announcements),
            events=_enum_val(data.events),
            promotions=_enum_val(data.promotions),
            quiet_hours_start=data.quiet_hours_start,
            quiet_hours_end=data.quiet_hours_end,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Preferences created for member: %s",
            data.member_id,
        )
        return _preferences_from_orm(record)

    async def get_preferences(
        self, preferences_id: str
    ) -> Optional[CommunicationPreferences]:
        async with session_scope(self._engine) as s:
            record = await s.get(
                CommunicationPreferencesORM, preferences_id
            )
            if record is None:
                return None
            return _preferences_from_orm(record)

    async def get_preferences_by_member(
        self, member_id: str
    ) -> Optional[CommunicationPreferences]:
        # PRIMER registro cuyo member_id calza (orden de inserción =
        # orden del dict in-memory)
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, CommunicationPreferencesORM)
            for r in rows:
                if r.member_id == member_id:
                    return _preferences_from_orm(r)
            return None

    async def update_preferences(
        self, preferences_id: str, updates: dict
    ) -> Optional[CommunicationPreferences]:
        async with session_scope(self._engine) as s:
            record = await s.get(
                CommunicationPreferencesORM, preferences_id
            )
            if record is None:
                return None
            _apply_updates(record, updates, "preferences")
            await s.flush()
            return _preferences_from_orm(record)

    async def list_preferences(self) -> list[CommunicationPreferences]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, CommunicationPreferencesORM)
            return [_preferences_from_orm(r) for r in rows]

    # ── Personalized Notifications ──────────────────────────

    async def create_personalized(
        self, data: CreatePersonalizedNotification
    ) -> PersonalizedNotification:
        record = PersonalizedNotificationORM(
            id=_gen_id(),
            title=data.title,
            body=data.body,
            channel=_enum_val(data.channel),
            recipient_ids=list(data.recipient_ids or []),
            status=NotificationStatus.PENDING.value,
            sent_at=None,
            created_by=data.created_by,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Personalized notification created: %s",
            record.id,
        )
        return _personalized_from_orm(record)

    async def get_personalized(
        self, notification_id: str
    ) -> Optional[PersonalizedNotification]:
        async with session_scope(self._engine) as s:
            record = await s.get(
                PersonalizedNotificationORM, notification_id
            )
            if record is None:
                return None
            return _personalized_from_orm(record)

    async def update_personalized(
        self, notification_id: str, updates: dict
    ) -> Optional[PersonalizedNotification]:
        async with session_scope(self._engine) as s:
            record = await s.get(
                PersonalizedNotificationORM, notification_id
            )
            if record is None:
                return None
            _apply_updates(record, updates, "personalized")
            await s.flush()
            return _personalized_from_orm(record)

    async def list_personalized(self) -> list[PersonalizedNotification]:
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, PersonalizedNotificationORM)
            return [_personalized_from_orm(r) for r in rows]

    # ── Campaigns (F28) ─────────────────────────────────────

    async def create_campaign(self, data: Any) -> Campaign:
        record = CampaignORM(
            id=_gen_id(),
            name=data.name,
            description=data.description,
            status="draft",
            channels=_channels_list(data.channels),
            target_audience=data.target_audience,
            template_id=data.template_id,
            start_date=data.start_date,
            end_date=data.end_date,
            metrics={
                "sent": 0,
                "delivered": 0,
                "opened": 0,
                "clicked": 0,
                "failed": 0,
                "bounced": 0,
            },
            created_by=data.created_by,
            created_at=_utcnow_iso(),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[communication] Campaign created: %s (%s)",
            data.name,
            record.id,
        )
        return _campaign_from_orm(record)

    async def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        async with session_scope(self._engine) as s:
            record = await s.get(CampaignORM, campaign_id)
            if record is None:
                return None
            return _campaign_from_orm(record)

    async def list_campaigns(
        self,
        status: Optional[Any] = None,
        limit: int = 20,
    ) -> list[Campaign]:
        status_val = getattr(status, "value", status)
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, CampaignORM)
            results = [
                _campaign_from_orm(r)
                for r in rows
                if not status_val or r.status == status_val
            ]
            return results[:limit]

    async def update_campaign(
        self, campaign_id: str, updates: dict
    ) -> Optional[Campaign]:
        async with session_scope(self._engine) as s:
            record = await s.get(CampaignORM, campaign_id)
            if record is None:
                return None
            _apply_updates(record, updates, "campaign")
            await s.flush()
            return _campaign_from_orm(record)

    async def delete_campaign(self, campaign_id: str) -> bool:
        async with session_scope(self._engine) as s:
            record = await s.get(CampaignORM, campaign_id)
            if record is None:
                return False
            await s.delete(record)
        logger.info(
            "[communication] Campaign deleted: %s", campaign_id
        )
        return True

    # ── Sentiment (F28) ─────────────────────────────────────

    async def record_sentiment(
        self, data: CreateSentimentDataPoint
    ) -> SentimentDataPoint:
        record = SentimentDataPointORM(
            id=_gen_id(),
            source=data.source,
            text=data.text,
            sentiment=_enum_val(data.sentiment),
            score=data.score,
            channel=_enum_val(data.channel) if data.channel else None,
            member_id=data.member_id,
            timestamp=_utcnow_iso(),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        return _sentiment_from_orm(record)

    async def get_sentiment_history(
        self,
        days: int = 30,
        channel: Optional[NotificationChannel] = None,
    ) -> list[SentimentDataPoint]:
        """MISMA aritmética del in-memory: cutoff timestamp · parse
        fromisoformat (Z→+00:00 · ValueError/TypeError → skip) · filtro
        canal · sort timestamp desc."""
        async with session_scope(self._engine) as s:
            rows = await _load_all(s, SentimentDataPointORM)
        now = datetime.now(tz=UTC)
        cutoff = now.timestamp() - (days * 86400)

        results: list = []
        for r in rows:
            ts = r.timestamp or ""
            if not ts:
                continue
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if dt.timestamp() < cutoff:
                    continue
            except (ValueError, TypeError):
                continue
            if channel and r.channel != channel.value:
                continue
            results.append(_sentiment_from_orm(r))
        results.sort(key=lambda s_: s_.timestamp, reverse=True)
        return results


# ── helpers de enums (mismo estilo que las 7 verticales previas) ──


def _enum_val(v: Any) -> str:
    """Enum → .value; str pasa directo (mismo borde del in-memory)."""
    return v.value if hasattr(v, "value") else str(v)


def _channels_list(channels: Any) -> list[str]:
    """list[NotificationChannel] → list[str .value] para JSONB."""
    return [
        c.value if hasattr(c, "value") else str(c)
        for c in (channels or [])
    ]
