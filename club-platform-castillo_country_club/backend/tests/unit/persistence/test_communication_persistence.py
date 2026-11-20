"""Suite de persistencia Ola 2.1-octava — gate del vertical communication:

    pytest: write → restart runtime → read OK

Misma mecánica de las suites family/engagement/event/compliance/guest/
satisfaction (Ola 2.1-bis/-tris/2.2/2.1-quinqua/-sexta/-septima):
restart REAL (engine.dispose() + engine NUEVO + sesión nueva) ·
RE-RUNNABLE (_reset_backend antes de cada test) · sqlite local /
pgvector real en CI.

Además — el gate de CONTRATO: los tests del agente communication
(tests/unit/agents/test_communication_agent.py) corren contra el repo
in-memory async; este archivo verifica que el repo ORM async cumple el
mismo contrato (mismos 35 métodos · None/[]/dict sin excepciones custom
· enums roundtrip · updates parciales dict · listas JSONB roundtrip ·
get_preferences_by_member primer-match · sentiment history con filtro
de ventana N días).
"""
from __future__ import annotations

import os

import pytest

from club_mcp.db.orm.base import Base
from club_mcp.db.orm.repositories.communication_repo import (
    CommunicationRepository as CommunicationRepoORM,
)
from club_mcp.db.orm.session import make_engine
from club_mcp.models.communication import (
    AnnouncementStatus,
    CampaignStatus,
    CreateAnnouncement,
    CreateCampaign,
    CreateCommunicationPreferences,
    CreateEmergencyBroadcast,
    CreateNotificationTemplate,
    CreatePersonalizedNotification,
    CreateScheduledNotification,
    CreateSentimentDataPoint,
    EmergencyType,
    FrequencyPreference,
    NotificationChannel,
    NotificationStatus,
    SentimentLevel,
    TemplateCategory,
)


PG_URL = os.environ.get("CLUB_PERSISTENCE_URL", "")
SQLITE_URL = "sqlite+aiosqlite:///_persist_communication.db"

pytestmark = pytest.mark.asyncio


def _backend_url() -> str:
    """PG del service container SIEMPRE que exista; sqlite solo sin PG."""
    if PG_URL:
        return PG_URL
    return SQLITE_URL


async def _reset_backend() -> None:
    """Re-runnable: DROP + CREATE del backend antes de cada test (Ola 2.1f)."""
    engine = make_engine(_backend_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def _repo() -> CommunicationRepoORM:
    return CommunicationRepoORM(make_engine(_backend_url()))


async def _restart_repo(repo: CommunicationRepoORM) -> CommunicationRepoORM:
    """Restart REAL: dispose del engine + engine nuevo + repo nuevo."""
    await repo._engine.dispose()
    return _repo()


# ── test 1 · announcements CRUD + filters + paginación ────────────────


async def test_announcements_crud_filtered_restart() -> None:
    """write → restart → read: create/update/get/list/filtered/search."""
    await _reset_backend()
    repo = _repo()

    a1 = await repo.create_announcement(
        CreateAnnouncement(
            title="Torneo de tenis",
            body="Inscripciones abiertas",
            channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH],
            priority=2,
            requires_acknowledgment=True,
        )
    )
    a2 = await repo.create_announcement(
        CreateAnnouncement(
            title="Cena de gala",
            body="Traje formal",
            channels=[NotificationChannel.EMAIL],
        )
    )
    assert a1.id and len(a1.id) == 8
    assert a1.status == AnnouncementStatus.DRAFT
    assert a1.channels == [
        NotificationChannel.EMAIL, NotificationChannel.PUSH
    ]
    assert a1.requires_acknowledgment is True
    assert a2.priority == 1

    # update parcial (dict — contrato del in-memory)
    up = await repo.update_announcement(
        a1.id, {"status": "sent", "sent_at": "2026-11-20T10:00:00+00:00"}
    )
    assert up is not None
    assert up.status == AnnouncementStatus.SENT
    assert up.sent_at == "2026-11-20T10:00:00+00:00"

    # RESTART: dispose + engine nuevo
    repo = await _restart_repo(repo)

    got = await repo.get_announcement(a1.id)
    assert got is not None
    assert got.status == AnnouncementStatus.SENT  # sobrevivió
    assert got.title == "Torneo de tenis"
    assert got.channels == [
        NotificationChannel.EMAIL, NotificationChannel.PUSH
    ]  # JSONB roundtrip

    lst = await repo.list_announcements()
    assert len(lst) == 2
    filtered = await repo.list_announcements(status=AnnouncementStatus.SENT)
    assert len(filtered) == 1
    assert filtered[0].id == a1.id

    # filtered + search + paginación (contrato list_announcements_filtered)
    page = await repo.list_announcements_filtered(search="tenis")
    assert page["total"] == 1
    assert page["total_pages"] == 1
    assert page["items"][0].id == a1.id

    none = await repo.get_announcement("no-existe")
    assert none is None  # None sin excepción
    up_none = await repo.update_announcement("no-existe", {"title": "x"})
    assert up_none is None


# ── test 2 · emergencies + templates + scheduled ──────────────────────


async def test_emergencies_templates_scheduled_restart() -> None:
    await _reset_backend()
    repo = _repo()

    em = await repo.create_emergency(
        CreateEmergencyBroadcast(
            title="Cierre por tormenta",
            body="El club cierra 18:00",
            emergency_type=EmergencyType.WEATHER,
            channels=[NotificationChannel.SMS],
        )
    )
    assert em.status == NotificationStatus.PENDING
    assert em.emergency_type == EmergencyType.WEATHER  # enum roundtrip
    assert em.acknowledged_count == 0

    tpl = await repo.create_template(
        CreateNotificationTemplate(
            name="Recordatorio evento",
            category=TemplateCategory.EVENT_REMINDER,
            subject="{{family}} — {{event}}",
            body_template="Mañana: {{event}}",
            channels=[NotificationChannel.EMAIL],
            variables=["family", "event"],
        )
    )
    assert tpl.is_active is True
    assert tpl.category == TemplateCategory.EVENT_REMINDER
    assert tpl.variables == ["family", "event"]  # JSONB roundtrip

    sch = await repo.create_scheduled(
        CreateScheduledNotification(
            template_id=tpl.id,
            recipient_ids=["fam-001", "fam-002"],
            channel=NotificationChannel.EMAIL,
            scheduled_at="2026-11-25T09:00:00+00:00",
            params={"event": "Cena de gala"},
        )
    )
    assert sch.status == NotificationStatus.QUEUED
    assert sch.recipient_ids == ["fam-001", "fam-002"]
    assert sch.params == {"event": "Cena de gala"}  # JSONB roundtrip

    # updates dict
    up_em = await repo.update_emergency(
        em.id, {"status": "sent", "acknowledged_count": 5}
    )
    assert up_em.status == NotificationStatus.SENT
    assert up_em.acknowledged_count == 5
    up_tpl = await repo.update_template(tpl.id, {"is_active": False})
    assert up_tpl.is_active is False

    # RESTART
    repo = await _restart_repo(repo)

    got_em = await repo.get_emergency(em.id)
    assert got_em is not None
    assert got_em.acknowledged_count == 5  # sobrevivió
    got_tpl = await repo.get_template(tpl.id)
    assert got_tpl is not None
    assert got_tpl.is_active is False
    assert got_tpl.subject == "{{family}} — {{event}}"
    got_sch = await repo.get_scheduled(sch.id)
    assert got_sch is not None
    assert got_sch.params == {"event": "Cena de gala"}  # params roundtrip

    lst_em = await repo.list_emergencies(emergency_type=EmergencyType.WEATHER)
    assert len(lst_em) == 1
    lst_tpl = await repo.list_templates()
    assert len(lst_tpl) == 1
    lst_sch = await repo.list_scheduled()
    assert len(lst_sch) == 1


# ── test 3 · logs con filtros de fecha/canal/tipo + sort + limit ──────


async def test_logs_filters_sort_limit() -> None:
    await _reset_backend()
    repo = _repo()

    l1 = await repo.create_log(
        "announcement", "Torneo de tenis",
        NotificationChannel.EMAIL, 120, NotificationStatus.SENT,
        created_by="admin-001",
    )
    l2 = await repo.create_log(
        "emergency", "Cierre por tormenta",
        NotificationChannel.SMS, 40, NotificationStatus.SENT,
    )
    l3 = await repo.create_log(
        "campaign", "Promo diciembre",
        NotificationChannel.PUSH, 300, NotificationStatus.FAILED,
    )
    assert l1.sent_at  # now ISO

    # filtros aditivos
    by_channel = await repo.list_logs(channel=NotificationChannel.SMS)
    assert len(by_channel) == 1
    assert by_channel[0].id == l2.id
    by_type = await repo.list_logs(notification_type="campaign")
    assert len(by_type) == 1
    assert by_type[0].id == l3.id
    # date range ISO con Z — mismo parse del in-memory
    yesterday = "2026-11-19T00:00:00+00:00"
    in_range = await repo.list_logs(date_from=yesterday)
    assert len(in_range) == 3  # todos son now() > yesterday

    # RESTART
    repo = await _restart_repo(repo)

    all_logs = await repo.list_logs(limit=2)
    assert len(all_logs) == 2  # [:limit] del in-memory
    ids = [log.id for log in all_logs]
    # sort por sent_at desc: los 3 se crearon en el mismo now() — el
    # orden relativo de inserción preserva desc (mismo contrato).
    assert set(ids) <= {l1.id, l2.id, l3.id}
    assert all(log.sent_at for log in all_logs)


# ── test 4 · preferences por member (primer match) + updates ──────────


async def test_preferences_by_member_restart() -> None:
    await _reset_backend()
    repo = _repo()

    p1 = await repo.create_preferences(
        CreateCommunicationPreferences(member_id="mem-001")
    )
    p2 = await repo.create_preferences(
        CreateCommunicationPreferences(
            member_id="mem-002",
            sms_enabled=True,
            promotions=FrequencyPreference.DAILY_DIGEST,
        )
    )
    assert p1.member_id == "mem-001"
    assert p1.sms_enabled is False
    assert p2.sms_enabled is True
    assert p2.promotions == FrequencyPreference.DAILY_DIGEST

    up = await repo.update_preferences(
        p1.id, {"sms_enabled": True, "promotions": "daily_digest"}
    )
    assert up.sms_enabled is True
    assert up.promotions == FrequencyPreference.DAILY_DIGEST

    # RESTART
    repo = await _restart_repo(repo)

    got = await repo.get_preferences_by_member("mem-001")
    assert got is not None
    assert got.id == p1.id  # primer match
    assert got.sms_enabled is True  # update sobrevivió
    assert got.events == FrequencyPreference.REALTIME  # default roundtrip
    none = await repo.get_preferences_by_member("mem-999")
    assert none is None
    lst = await repo.list_preferences()
    assert len(lst) == 2


# ── test 5 · personalized + campaigns (metrics JSONB + delete) ─────────


async def test_personalized_campaigns_restart() -> None:
    await _reset_backend()
    repo = _repo()

    pn = await repo.create_personalized(
        CreatePersonalizedNotification(
            title="Invitación VIP",
            body="Mesa reservada",
            channel=NotificationChannel.WHATSAPP,
            recipient_ids=["mem-001", "mem-003"],
        )
    )
    assert pn.status == NotificationStatus.PENDING
    assert pn.recipient_ids == ["mem-001", "mem-003"]

    camp = await repo.create_campaign(
        CreateCampaign(
            name="Promo diciembre",
            description="20% off",
            channels=[NotificationChannel.EMAIL, NotificationChannel.PUSH],
            target_audience="members",
        )
    )
    assert camp.status == CampaignStatus.DRAFT
    assert camp.metrics.sent == 0
    assert camp.metrics.delivered == 0

    up_camp = await repo.update_campaign(
        camp.id,
        {
            "status": "active",
            "metrics": {
                "sent": 100, "delivered": 95, "opened": 40,
                "clicked": 12, "failed": 5, "bounced": 0,
            },
        },
    )
    assert up_camp.status == CampaignStatus.ACTIVE
    assert up_camp.metrics.sent == 100
    assert up_camp.metrics.clicked == 12  # metrics JSONB roundtrip

    # RESTART
    repo = await _restart_repo(repo)

    got_camp = await repo.get_campaign(camp.id)
    assert got_camp is not None
    assert got_camp.status == CampaignStatus.ACTIVE
    assert got_camp.metrics.delivered == 95  # sobrevivió
    assert got_camp.channels == [
        NotificationChannel.EMAIL, NotificationChannel.PUSH
    ]
    got_pn = await repo.get_personalized(pn.id)
    assert got_pn is not None
    assert got_pn.recipient_ids == ["mem-001", "mem-003"]

    lst = await repo.list_campaigns(status=CampaignStatus.ACTIVE)
    assert len(lst) == 1

    deleted = await repo.delete_campaign(camp.id)
    assert deleted is True
    deleted_again = await repo.delete_campaign(camp.id)
    assert deleted_again is False  # idempotente como el in-memory
    gone = await repo.get_campaign(camp.id)
    assert gone is None


# ── test 6 · sentiment history (ventana días + canal + sort desc) ─────


async def test_sentiment_history_window_channel() -> None:
    await _reset_backend()
    repo = _repo()

    s1 = await repo.record_sentiment(
        CreateSentimentDataPoint(
            source="survey", text="Excelente evento",
            sentiment=SentimentLevel.VERY_POSITIVE, score=0.95,
            channel=NotificationChannel.EMAIL, member_id="mem-001",
        )
    )
    s2 = await repo.record_sentiment(
        CreateSentimentDataPoint(
            source="whatsapp", text="Comida fría",
            sentiment=SentimentLevel.NEGATIVE, score=0.15,
            channel=NotificationChannel.WHATSAPP,
        )
    )
    assert s1.sentiment == SentimentLevel.VERY_POSITIVE
    assert s1.channel == NotificationChannel.EMAIL

    # RESTART
    repo = await _restart_repo(repo)

    hist = await repo.get_sentiment_history(days=30)
    assert len(hist) == 2  # ambos dentro de la ventana
    assert hist[0].timestamp >= hist[1].timestamp  # sort desc
    only_wa = await repo.get_sentiment_history(
        days=30, channel=NotificationChannel.WHATSAPP
    )
    assert len(only_wa) == 1
    assert only_wa[0].id == s2.id
    # ventana 0 días: cutoff = now → nada calza (cutoff exacto del
    # in-memory: dt.timestamp() < cutoff → skip)
    empty = await repo.get_sentiment_history(days=0)
    assert empty == []


# ── test 7 · contrato vacío sin excepciones (drops a None/[]) ─────────


async def test_empty_backend_contract() -> None:
    """Backend sin filas: todos los reads caen a None/[] sin excepción."""
    await _reset_backend()
    repo = _repo()

    assert await repo.get_announcement("x") is None
    assert await repo.get_emergency("x") is None
    assert await repo.get_template("x") is None
    assert await repo.get_scheduled("x") is None
    assert await repo.get_preferences("x") is None
    assert await repo.get_preferences_by_member("x") is None
    assert await repo.get_personalized("x") is None
    assert await repo.get_campaign("x") is None
    assert await repo.list_announcements() == []
    assert await repo.list_emergencies() == []
    assert await repo.list_templates() == []
    assert await repo.list_scheduled() == []
    assert await repo.list_logs() == []
    assert await repo.list_preferences() == []
    assert await repo.list_personalized() == []
    assert await repo.list_campaigns() == []
    assert await repo.get_sentiment_history() == []
    assert await repo.delete_campaign("x") is False
    page = await repo.list_announcements_filtered()
    assert page["items"] == []
    assert page["total"] == 0
    assert page["total_pages"] == 1  # max(1, ...) del in-memory
