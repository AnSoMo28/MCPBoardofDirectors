"""Tablas del dominio Member Engagement — Ola 2.1-tris (vertical engagement).

Espejo 1:1 de club_mcp.models.member_engagement (Pydantic). Las 5
entidades del ciclo del socio (verificar contra el repo in-memory:

    _profiles:  dict[str, dict]  → tabla engagement_profiles
    _campaigns: dict[str, dict]  → tabla reactivation_campaigns
    _rewards:   dict[str, dict]  → tabla loyalty_rewards
    _feedback:  dict[str, dict]  → tabla member_feedback
    _referrals: dict[str, dict]  → tabla referrals

Las listas flexibles (favorite_activities · tags · target_member_ids
· channels) a JSONB por fila: anexos del agregado, no entidades con
identity propia — mismo criterio que families.activities (§3.8-bis).

IDs: el in-memory genera uuid4().hex[:8] (String(8)); el repo ORM
reproduce la MISMA forma para que el contrato no cambie ni un byte.
Sin excepciones custom (el in-memory devuelve None / listas vacías;
el ORM idéntico).
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el modelo in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class EngagementProfileORM(Base):
    __tablename__ = "engagement_profiles"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    member_name: Mapped[str] = mapped_column(String(200), nullable=False)
    engagement_level: Mapped[str] = mapped_column(String(24), nullable=False)
    activity_score: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False, default=0.0)
    visits_last_30_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    visits_last_90_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_visit_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    total_spend_ytd: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    favorite_activities: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    loyalty_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    referral_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    feedback_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class ReactivationCampaignORM(Base):
    __tablename__ = "reactivation_campaigns"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_member_ids: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    target_engagement_level: Mapped[str | None] = mapped_column(String(24), nullable=True)
    channels: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)
    message_template: Mapped[str] = mapped_column(Text, nullable=False, default="")
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    budget: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    sent_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    response_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    conversion_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class LoyaltyRewardORM(Base):
    __tablename__ = "loyalty_rewards"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    member_name: Mapped[str] = mapped_column(String(200), nullable=False)
    reward_type: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    points_cost: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    monetary_value: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    valid_from: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    valid_until: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    redeemed_at: Mapped[str | None] = mapped_column(String(10), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class MemberFeedbackORM(Base):
    __tablename__ = "member_feedback"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    member_name: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[str] = mapped_column(String(24), nullable=False)
    sentiment: Mapped[str] = mapped_column(String(24), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    category: Mapped[str] = mapped_column(Text, nullable=False, default="")
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    responded_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class ReferralORM(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String(8), primary_key=True)
    referrer_member_id: Mapped[str] = mapped_column(String(36), nullable=False)
    referrer_name: Mapped[str] = mapped_column(String(200), nullable=False)
    referred_name: Mapped[str] = mapped_column(String(200), nullable=False)
    referred_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    referred_phone: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    reward_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    converted_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
