"""
In-memory repository for Member Engagement domain.
Club: Castillo Country Club
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

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

logger = logging.getLogger(__name__)


class MemberEngagementRepository:
    """In-memory CRUD repository for member engagement domain."""

    def __init__(self) -> None:
        self._profiles: dict[str, dict] = {}
        self._campaigns: dict[str, dict] = {}
        self._rewards: dict[str, dict] = {}
        self._feedback: dict[str, dict] = {}
        self._referrals: dict[str, dict] = {}

    @staticmethod
    def _gen_id() -> str:
        return uuid4().hex[:8]

    # ── Engagement Profiles ─────────────────────────────

    async def create_profile(
        self, data: CreateEngagementProfile
    ) -> EngagementProfile:
        pid = self._gen_id()
        record = {
            "id": pid,
            "member_id": data.member_id,
            "member_name": data.member_name,
            "engagement_level": data.engagement_level,
            "activity_score": data.activity_score,
            "visits_last_30_days": data.visits_last_30_days,
            "visits_last_90_days": data.visits_last_90_days,
            "last_visit_date": None,
            "total_spend_ytd": data.total_spend_ytd,
            "favorite_activities": data.favorite_activities,
            "loyalty_points": data.loyalty_points,
            "referral_count": 0,
            "feedback_score": None,
            "tags": data.tags,
            "notes": data.notes,
        }
        self._profiles[pid] = record
        logger.info(
            "[engagement] Profile created: %s (%s)", data.member_name, pid
        )
        return EngagementProfile(**record)

    async def get_profile(
        self, profile_id: str
    ) -> Optional[EngagementProfile]:
        record = self._profiles.get(profile_id)
        if record is None:
            return None
        return EngagementProfile(**record)

    async def get_profile_by_member(
        self, member_id: str
    ) -> Optional[EngagementProfile]:
        for record in self._profiles.values():
            if record["member_id"] == member_id:
                return EngagementProfile(**record)
        return None

    async def update_profile(
        self, profile_id: str, updates: dict
    ) -> Optional[EngagementProfile]:
        record = self._profiles.get(profile_id)
        if record is None:
            return None
        record.update(updates)
        self._profiles[profile_id] = record
        return EngagementProfile(**record)

    async def list_profiles(
        self,
        engagement_level: Optional[EngagementLevel] = None,
    ) -> list[EngagementProfile]:
        results: list[EngagementProfile] = []
        for record in self._profiles.values():
            if (
                engagement_level
                and record["engagement_level"] != engagement_level
            ):
                continue
            results.append(EngagementProfile(**record))
        return results

    # ── Reactivation Campaigns ──────────────────────────

    async def create_campaign(
        self, data: CreateReactivationCampaign
    ) -> ReactivationCampaign:
        cid = self._gen_id()
        record = {
            "id": cid,
            "name": data.name,
            "campaign_type": data.campaign_type,
            "status": CampaignStatus.DRAFT,
            "description": data.description,
            "target_member_ids": data.target_member_ids,
            "target_engagement_level": data.target_engagement_level,
            "channels": data.channels,
            "message_template": data.message_template,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "budget": data.budget,
            "sent_count": 0,
            "response_count": 0,
            "conversion_count": 0,
            "notes": data.notes,
        }
        self._campaigns[cid] = record
        logger.info(
            "[engagement] Campaign created: %s (%s)", data.name, cid
        )
        return ReactivationCampaign(**record)

    async def get_campaign(
        self, campaign_id: str
    ) -> Optional[ReactivationCampaign]:
        record = self._campaigns.get(campaign_id)
        if record is None:
            return None
        return ReactivationCampaign(**record)

    async def update_campaign(
        self, campaign_id: str, updates: dict
    ) -> Optional[ReactivationCampaign]:
        record = self._campaigns.get(campaign_id)
        if record is None:
            return None
        record.update(updates)
        self._campaigns[campaign_id] = record
        return ReactivationCampaign(**record)

    async def list_campaigns(
        self,
        campaign_type: Optional[CampaignType] = None,
        status: Optional[CampaignStatus] = None,
    ) -> list[ReactivationCampaign]:
        results: list[ReactivationCampaign] = []
        for record in self._campaigns.values():
            if campaign_type and record["campaign_type"] != campaign_type:
                continue
            if status and record["status"] != status:
                continue
            results.append(ReactivationCampaign(**record))
        return results

    # ── Loyalty Rewards ─────────────────────────────────

    async def create_reward(self, data: CreateLoyaltyReward) -> LoyaltyReward:
        rid = self._gen_id()
        record = {
            "id": rid,
            "member_id": data.member_id,
            "member_name": data.member_name,
            "reward_type": data.reward_type,
            "status": RewardStatus.ACTIVE,
            "description": data.description,
            "points_cost": data.points_cost,
            "monetary_value": data.monetary_value,
            "valid_from": data.valid_from,
            "valid_until": data.valid_until,
            "redeemed_at": None,
            "notes": data.notes,
        }
        self._rewards[rid] = record
        logger.info(
            "[engagement] Reward created: %s for %s (%s)",
            data.reward_type.value,
            data.member_name,
            rid,
        )
        return LoyaltyReward(**record)

    async def get_reward(self, reward_id: str) -> Optional[LoyaltyReward]:
        record = self._rewards.get(reward_id)
        if record is None:
            return None
        return LoyaltyReward(**record)

    async def update_reward(
        self, reward_id: str, updates: dict
    ) -> Optional[LoyaltyReward]:
        record = self._rewards.get(reward_id)
        if record is None:
            return None
        record.update(updates)
        self._rewards[reward_id] = record
        return LoyaltyReward(**record)

    async def list_rewards(
        self,
        member_id: Optional[str] = None,
        status: Optional[RewardStatus] = None,
    ) -> list[LoyaltyReward]:
        results: list[LoyaltyReward] = []
        for record in self._rewards.values():
            if member_id and record["member_id"] != member_id:
                continue
            if status and record["status"] != status:
                continue
            results.append(LoyaltyReward(**record))
        return results

    # ── Member Feedback ─────────────────────────────────

    async def create_feedback(
        self, data: CreateMemberFeedback
    ) -> MemberFeedback:
        fid = self._gen_id()
        record = {
            "id": fid,
            "member_id": data.member_id,
            "member_name": data.member_name,
            "channel": data.channel,
            "sentiment": data.sentiment,
            "rating": data.rating,
            "category": data.category,
            "comment": data.comment,
            "response": None,
            "responded_at": None,
            "created_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        self._feedback[fid] = record
        logger.info(
            "[engagement] Feedback created: %s (%s)",
            data.member_name,
            fid,
        )
        return MemberFeedback(**record)

    async def get_feedback(
        self, feedback_id: str
    ) -> Optional[MemberFeedback]:
        record = self._feedback.get(feedback_id)
        if record is None:
            return None
        return MemberFeedback(**record)

    async def update_feedback(
        self, feedback_id: str, updates: dict
    ) -> Optional[MemberFeedback]:
        record = self._feedback.get(feedback_id)
        if record is None:
            return None
        record.update(updates)
        self._feedback[feedback_id] = record
        return MemberFeedback(**record)

    async def list_feedback(
        self,
        member_id: Optional[str] = None,
    ) -> list[MemberFeedback]:
        results: list[MemberFeedback] = []
        for record in self._feedback.values():
            if member_id and record["member_id"] != member_id:
                continue
            results.append(MemberFeedback(**record))
        return results

    # ── Referrals ───────────────────────────────────────

    async def create_referral(self, data: CreateReferral) -> ReferralRecord:
        rid = self._gen_id()
        record = {
            "id": rid,
            "referrer_member_id": data.referrer_member_id,
            "referrer_name": data.referrer_name,
            "referred_name": data.referred_name,
            "referred_email": data.referred_email,
            "referred_phone": data.referred_phone,
            "status": "pending",
            "reward_points": data.reward_points,
            "converted_at": None,
            "notes": data.notes,
        }
        self._referrals[rid] = record
        logger.info(
            "[engagement] Referral created: %s → %s (%s)",
            data.referrer_name,
            data.referred_name,
            rid,
        )
        return ReferralRecord(**record)

    async def get_referral(
        self, referral_id: str
    ) -> Optional[ReferralRecord]:
        record = self._referrals.get(referral_id)
        if record is None:
            return None
        return ReferralRecord(**record)

    async def update_referral(
        self, referral_id: str, updates: dict
    ) -> Optional[ReferralRecord]:
        record = self._referrals.get(referral_id)
        if record is None:
            return None
        record.update(updates)
        self._referrals[referral_id] = record
        return ReferralRecord(**record)

    async def list_referrals(
        self,
        referrer_member_id: Optional[str] = None,
    ) -> list[ReferralRecord]:
        results: list[ReferralRecord] = []
        for record in self._referrals.values():
            if (
                referrer_member_id
                and record["referrer_member_id"] != referrer_member_id
            ):
                continue
            results.append(ReferralRecord(**record))
        return results
