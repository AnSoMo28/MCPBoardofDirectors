"""MemberEngagementRepository async — los 5 dicts se vuelven 5 tablas.

Ola 2.1-tris (vertical engagement). Contrato EXACTO del módulo
in-memory que reemplaza (club_mcp.db.repositories.member_engagement_repo)
— mismos 21 métodos, mismas firmas, mismos Pydantic de salida, mismo
comportamiento de error (None / lista vacía — el in-memory no define
excepciones custom y el ORM tampoco las inventa):

    create_profile / get_profile / get_profile_by_member /
    update_profile / list_profiles /
    create_campaign / get_campaign / update_campaign / list_campaigns /
    create_reward / get_reward / update_reward / list_rewards /
    create_feedback / get_feedback / update_feedback / list_feedback /
    create_referral / get_referral / update_referral / list_referrals

Mismas decisiones que family_repo/user_repo (§3.8/§3.8-bis): engine
por inyección · session_scope transaccional · devuelve Pydantic
(SQLAlchemy no sube) · ids de la MISMA forma que el in-memory
(uuid4().hex[:8] — el contrato no cambia ni un byte).

create_feedback: created_at lo fija el REPO (datetime.now UTC
isoformat) — el in-memory hacía lo mismo; se preserva literal.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import uuid4

from sqlalchemy import select

from club_mcp.db.orm.engagement_orm import (
    EngagementProfileORM,
    LoyaltyRewardORM,
    MemberFeedbackORM,
    ReactivationCampaignORM,
    ReferralORM,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.models.member_engagement import (
    CampaignStatus,
    CampaignType,
    CreateEngagementProfile,
    CreateLoyaltyReward,
    CreateMemberFeedback,
    CreateReactivationCampaign,
    CreateReferral,
    EngagementLevel,
    EngagementProfile,
    FeedbackChannel,
    LoyaltyReward,
    MemberFeedback,
    ReactivationCampaign,
    ReferralRecord,
    RewardStatus,
    RewardType,
)


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# ── update genérico (contrato: dict.update con claves del modelo) ──

_PROFILE_COLUMNS = {
    "member_id", "member_name", "engagement_level", "activity_score",
    "visits_last_30_days", "visits_last_90_days", "last_visit_date",
    "total_spend_ytd", "favorite_activities", "loyalty_points",
    "referral_count", "feedback_score", "tags", "notes",
}
_CAMPAIGN_COLUMNS = {
    "name", "campaign_type", "status", "description", "target_member_ids",
    "target_engagement_level", "channels", "message_template",
    "start_date", "end_date", "budget", "sent_count", "response_count",
    "conversion_count", "notes",
}
_REWARD_COLUMNS = {
    "member_id", "member_name", "reward_type", "status", "description",
    "points_cost", "monetary_value", "valid_from", "valid_until",
    "redeemed_at", "notes",
}
_FEEDBACK_COLUMNS = {
    "member_id", "member_name", "channel", "sentiment", "rating",
    "category", "comment", "response", "responded_at",
}
_REFERRAL_COLUMNS = {
    "referrer_member_id", "referrer_name", "referred_name",
    "referred_email", "referred_phone", "status", "reward_points",
    "converted_at", "notes",
}




def _gen_id() -> str:
    """MISMA generación que el in-memory (uuid4().hex[:8])."""
    return uuid4().hex[:8]


# ── Engagement Profiles ─────────────────────────────


def _profile_from_orm(r: EngagementProfileORM) -> EngagementProfile:
    return EngagementProfile(
        id=r.id,
        member_id=r.member_id,
        member_name=r.member_name,
        engagement_level=EngagementLevel(r.engagement_level),
        activity_score=float(r.activity_score),
        visits_last_30_days=r.visits_last_30_days,
        visits_last_90_days=r.visits_last_90_days,
        last_visit_date=r.last_visit_date,
        total_spend_ytd=float(r.total_spend_ytd),
        favorite_activities=r.favorite_activities,
        loyalty_points=r.loyalty_points,
        referral_count=r.referral_count,
        feedback_score=None if r.feedback_score is None else float(r.feedback_score),
        tags=r.tags,
        notes=r.notes,
    )


def _campaign_from_orm(r: ReactivationCampaignORM) -> ReactivationCampaign:
    return ReactivationCampaign(
        id=r.id,
        name=r.name,
        campaign_type=CampaignType(r.campaign_type),
        status=CampaignStatus(r.status),
        description=r.description or "",
        target_member_ids=r.target_member_ids,
        target_engagement_level=(
            None
            if r.target_engagement_level is None
            else EngagementLevel(r.target_engagement_level)
        ),
        channels=[FeedbackChannel(c) for c in r.channels],
        message_template=r.message_template,
        start_date=r.start_date,
        end_date=r.end_date,
        budget=float(r.budget),
        sent_count=r.sent_count,
        response_count=r.response_count,
        conversion_count=r.conversion_count,
        notes=r.notes,
    )


def _reward_from_orm(r: LoyaltyRewardORM) -> LoyaltyReward:
    return LoyaltyReward(
        id=r.id,
        member_id=r.member_id,
        member_name=r.member_name,
        reward_type=RewardType(r.reward_type),
        status=RewardStatus(r.status),
        description=r.description or "",
        points_cost=r.points_cost,
        monetary_value=float(r.monetary_value),
        valid_from=r.valid_from,
        valid_until=r.valid_until,
        redeemed_at=r.redeemed_at,
        notes=r.notes,
    )


def _feedback_from_orm(r: MemberFeedbackORM) -> MemberFeedback:
    from club_mcp.models.member_engagement import FeedbackChannel, FeedbackSentiment

    return MemberFeedback(
        id=r.id,
        member_id=r.member_id,
        member_name=r.member_name,
        channel=FeedbackChannel(r.channel),
        sentiment=FeedbackSentiment(r.sentiment),
        rating=r.rating,
        category=r.category,
        comment=r.comment,
        response=r.response,
        responded_at=r.responded_at,
        created_at=r.created_at.isoformat() if r.created_at else "",
    )


def _referral_from_orm(r: ReferralORM) -> ReferralRecord:
    return ReferralRecord(
        id=r.id,
        referrer_member_id=r.referrer_member_id,
        referrer_name=r.referrer_name,
        referred_name=r.referred_name,
        referred_email=r.referred_email,
        referred_phone=r.referred_phone,
        status=r.status,
        reward_points=r.reward_points,
        converted_at=r.converted_at,
        notes=r.notes,
    )


class MemberEngagementRepository:
    """Repo async de engagement — 5 entidades, contrato del in-memory."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    # ── Engagement Profiles ─────────────────────────────

    async def create_profile(
        self, data: CreateEngagementProfile
    ) -> EngagementProfile:
        pid = _gen_id()
        record = EngagementProfileORM(
            id=pid,
            member_id=data.member_id,
            member_name=data.member_name,
            engagement_level=data.engagement_level.value,
            activity_score=data.activity_score,
            visits_last_30_days=data.visits_last_30_days,
            visits_last_90_days=data.visits_last_90_days,
            last_visit_date=None,
            total_spend_ytd=data.total_spend_ytd,
            favorite_activities=data.favorite_activities,
            loyalty_points=data.loyalty_points,
            referral_count=0,
            feedback_score=None,
            tags=data.tags,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[engagement] Profile created: %s (%s)", data.member_name, pid
        )
        return _profile_from_orm(record)

    async def get_profile(
        self, profile_id: str
    ) -> EngagementProfile | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EngagementProfileORM, profile_id)
            return None if r is None else _profile_from_orm(r)

    async def get_profile_by_member(
        self, member_id: str
    ) -> EngagementProfile | None:
        async with session_scope(self._engine) as s:
            r = (
                (
                    await s.execute(
                        select(EngagementProfileORM).where(
                            EngagementProfileORM.member_id == member_id
                        )
                    )
                )
                .scalars()
                .first()
            )
            return None if r is None else _profile_from_orm(r)

    async def update_profile(
        self, profile_id: str, updates: dict[str, Any]
    ) -> EngagementProfile | None:
        async with session_scope(self._engine) as s:
            r = await s.get(EngagementProfileORM, profile_id)
            if r is None:
                return None
            _apply_updates(r, updates, _PROFILE_COLUMNS)
            return _profile_from_orm(r)

    async def list_profiles(
        self,
        engagement_level: EngagementLevel | None = None,
    ) -> list[EngagementProfile]:
        async with session_scope(self._engine) as s:
            stmt = select(EngagementProfileORM)
            if engagement_level is not None:
                stmt = stmt.where(
                    EngagementProfileORM.engagement_level
                    == engagement_level.value
                )
            rows = (await s.execute(stmt.order_by(EngagementProfileORM.id))).scalars().all()
            return [_profile_from_orm(r) for r in rows]

    # ── Reactivation Campaigns ──────────────────────────

    async def create_campaign(
        self, data: CreateReactivationCampaign
    ) -> ReactivationCampaign:
        cid = _gen_id()
        record = ReactivationCampaignORM(
            id=cid,
            name=data.name,
            campaign_type=data.campaign_type.value,
            status=CampaignStatus.DRAFT.value,
            description=data.description,
            target_member_ids=data.target_member_ids,
            target_engagement_level=(
                None
                if data.target_engagement_level is None
                else data.target_engagement_level.value
            ),
            channels=[c.value for c in data.channels],
            message_template=data.message_template,
            start_date=data.start_date,
            end_date=data.end_date,
            budget=data.budget,
            sent_count=0,
            response_count=0,
            conversion_count=0,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[engagement] Campaign created: %s (%s)", data.name, cid
        )
        return _campaign_from_orm(record)

    async def get_campaign(
        self, campaign_id: str
    ) -> ReactivationCampaign | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ReactivationCampaignORM, campaign_id)
            return None if r is None else _campaign_from_orm(r)

    async def update_campaign(
        self, campaign_id: str, updates: dict[str, Any]
    ) -> ReactivationCampaign | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ReactivationCampaignORM, campaign_id)
            if r is None:
                return None
            _apply_updates(r, updates, _CAMPAIGN_COLUMNS)
            return _campaign_from_orm(r)

    async def list_campaigns(
        self,
        campaign_type: CampaignType | None = None,
        status: CampaignStatus | None = None,
    ) -> list[ReactivationCampaign]:
        async with session_scope(self._engine) as s:
            stmt = select(ReactivationCampaignORM)
            if campaign_type is not None:
                stmt = stmt.where(
                    ReactivationCampaignORM.campaign_type
                    == campaign_type.value
                )
            if status is not None:
                stmt = stmt.where(
                    ReactivationCampaignORM.status == status.value
                )
            rows = (
                (await s.execute(stmt.order_by(ReactivationCampaignORM.id)))
                .scalars()
                .all()
            )
            return [_campaign_from_orm(r) for r in rows]

    # ── Loyalty Rewards ─────────────────────────────────

    async def create_reward(self, data: CreateLoyaltyReward) -> LoyaltyReward:
        rid = _gen_id()
        record = LoyaltyRewardORM(
            id=rid,
            member_id=data.member_id,
            member_name=data.member_name,
            reward_type=data.reward_type.value,
            status=RewardStatus.ACTIVE.value,
            description=data.description,
            points_cost=data.points_cost,
            monetary_value=data.monetary_value,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            redeemed_at=None,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[engagement] Reward created: %s for %s (%s)",
            data.reward_type.value,
            data.member_name,
            rid,
        )
        return _reward_from_orm(record)

    async def get_reward(self, reward_id: str) -> LoyaltyReward | None:
        async with session_scope(self._engine) as s:
            r = await s.get(LoyaltyRewardORM, reward_id)
            return None if r is None else _reward_from_orm(r)

    async def update_reward(
        self, reward_id: str, updates: dict[str, Any]
    ) -> LoyaltyReward | None:
        async with session_scope(self._engine) as s:
            r = await s.get(LoyaltyRewardORM, reward_id)
            if r is None:
                return None
            _apply_updates(r, updates, _REWARD_COLUMNS)
            return _reward_from_orm(r)

    async def list_rewards(
        self,
        member_id: str | None = None,
        status: RewardStatus | None = None,
    ) -> list[LoyaltyReward]:
        async with session_scope(self._engine) as s:
            stmt = select(LoyaltyRewardORM)
            if member_id is not None:
                stmt = stmt.where(LoyaltyRewardORM.member_id == member_id)
            if status is not None:
                stmt = stmt.where(LoyaltyRewardORM.status == status.value)
            rows = (
                (await s.execute(stmt.order_by(LoyaltyRewardORM.id)))
                .scalars()
                .all()
            )
            return [_reward_from_orm(r) for r in rows]

    # ── Member Feedback ─────────────────────────────────

    async def create_feedback(
        self, data: CreateMemberFeedback
    ) -> MemberFeedback:
        fid = _gen_id()
        now_iso = datetime.now(tz=UTC).isoformat()
        record = MemberFeedbackORM(
            id=fid,
            member_id=data.member_id,
            member_name=data.member_name,
            channel=data.channel.value,
            sentiment=data.sentiment.value,
            rating=data.rating,
            category=data.category,
            comment=data.comment,
            response=None,
            responded_at=None,
            created_at=datetime.now(tz=UTC),
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[engagement] Feedback created: %s (%s)",
            data.member_name,
            fid,
        )
        fb = _feedback_from_orm(record)
        fb.created_at = now_iso
        return fb

    async def get_feedback(
        self, feedback_id: str
    ) -> MemberFeedback | None:
        async with session_scope(self._engine) as s:
            r = await s.get(MemberFeedbackORM, feedback_id)
            return None if r is None else _feedback_from_orm(r)

    async def update_feedback(
        self, feedback_id: str, updates: dict[str, Any]
    ) -> MemberFeedback | None:
        async with session_scope(self._engine) as s:
            r = await s.get(MemberFeedbackORM, feedback_id)
            if r is None:
                return None
            _apply_updates(r, updates, _FEEDBACK_COLUMNS)
            return _feedback_from_orm(r)

    async def list_feedback(
        self,
        member_id: str | None = None,
    ) -> list[MemberFeedback]:
        async with session_scope(self._engine) as s:
            stmt = select(MemberFeedbackORM)
            if member_id is not None:
                stmt = stmt.where(MemberFeedbackORM.member_id == member_id)
            rows = (
                (await s.execute(stmt.order_by(MemberFeedbackORM.id)))
                .scalars()
                .all()
            )
            return [_feedback_from_orm(r) for r in rows]

    # ── Referrals ───────────────────────────────────────

    async def create_referral(self, data: CreateReferral) -> ReferralRecord:
        rid = _gen_id()
        record = ReferralORM(
            id=rid,
            referrer_member_id=data.referrer_member_id,
            referrer_name=data.referrer_name,
            referred_name=data.referred_name,
            referred_email=data.referred_email,
            referred_phone=data.referred_phone,
            status="pending",
            reward_points=data.reward_points,
            converted_at=None,
            notes=data.notes,
        )
        async with session_scope(self._engine) as s:
            s.add(record)
        logger.info(
            "[engagement] Referral created: %s → %s (%s)",
            data.referrer_name,
            data.referred_name,
            rid,
        )
        return _referral_from_orm(record)

    async def get_referral(
        self, referral_id: str
    ) -> ReferralRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ReferralORM, referral_id)
            return None if r is None else _referral_from_orm(r)

    async def update_referral(
        self, referral_id: str, updates: dict[str, Any]
    ) -> ReferralRecord | None:
        async with session_scope(self._engine) as s:
            r = await s.get(ReferralORM, referral_id)
            if r is None:
                return None
            _apply_updates(r, updates, _REFERRAL_COLUMNS)
            return _referral_from_orm(r)

    async def list_referrals(
        self,
        referrer_member_id: str | None = None,
    ) -> list[ReferralRecord]:
        async with session_scope(self._engine) as s:
            stmt = select(ReferralORM)
            if referrer_member_id is not None:
                stmt = stmt.where(
                    ReferralORM.referrer_member_id == referrer_member_id
                )
            rows = (await s.execute(stmt.order_by(ReferralORM.id))).scalars().all()
            return [_referral_from_orm(r) for r in rows]





def _apply_updates(orm_obj: Any, updates: dict[str, Any], allowed: set[str]) -> None:
    """dict.update del in-memory, aplanado sobre el ORM.

    Las claves enum llegan como Pydantic enum O como str (los updates
    del agente pasan enums; el in-memory las guardaba en el dict tal
    cual) — se persiste .value en las columnas enum para que el read
    reconstruya el mismo Pydantic (roundtrip idéntico).
    """
    for key, val in updates.items():
        if key not in allowed:
            continue
        if hasattr(val, "value") and not isinstance(val, (dict, list)):
            val = val.value
        if isinstance(val, list):
            val = [
                (v.value if hasattr(v, "value") and not isinstance(v, (dict, list)) else v)
                for v in val
            ]
        setattr(orm_obj, key, val)


