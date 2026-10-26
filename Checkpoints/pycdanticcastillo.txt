"""
Pydantic models for Member Engagement domain.
Club: Castillo Country Club
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ──────────────────────────────────────────────

class EngagementLevel(str, Enum):
    HIGHLY_ENGAGED = "highly_engaged"
    ENGAGED = "engaged"
    MODERATE = "moderate"
    DISENGAGED = "disengaged"
    INACTIVE = "inactive"
    AT_RISK = "at_risk"


class CampaignType(str, Enum):
    REACTIVATION = "reactivation"
    WELCOME = "welcome"
    UPSELL = "upsell"
    RETENTION = "retention"
    ANNIVERSARY = "anniversary"
    REFER_A_FRIEND = "refer_a_friend"


class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RewardType(str, Enum):
    DISCOUNT = "discount"
    FREE_SERVICE = "free_service"
    UPGRADE = "upgrade"
    POINTS = "points"
    GIFT_CARD = "gift_card"
    PRIORITY_BOOKING = "priority_booking"


class RewardStatus(str, Enum):
    ACTIVE = "active"
    REDEEMED = "redeemed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class FeedbackChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PHONE = "phone"
    IN_PERSON = "in_person"


class FeedbackSentiment(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


# ── Entity Schemas ─────────────────────────────────────

class EngagementProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    member_id: str
    member_name: str
    engagement_level: EngagementLevel = EngagementLevel.MODERATE
    activity_score: float = 0.0
    visits_last_30_days: int = 0
    visits_last_90_days: int = 0
    last_visit_date: Optional[str] = None
    total_spend_ytd: float = 0.0
    favorite_activities: list[str] = Field(default_factory=list)
    loyalty_points: int = 0
    referral_count: int = 0
    feedback_score: Optional[float] = None
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ReactivationCampaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    campaign_type: CampaignType
    status: CampaignStatus = CampaignStatus.DRAFT
    description: str
    target_member_ids: list[str] = Field(default_factory=list)
    target_engagement_level: Optional[EngagementLevel] = None
    channels: list[FeedbackChannel] = Field(default_factory=list)
    message_template: str = ""
    start_date: str
    end_date: str
    budget: float = 0.0
    sent_count: int = 0
    response_count: int = 0
    conversion_count: int = 0
    notes: Optional[str] = None


class LoyaltyReward(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    member_id: str
    member_name: str
    reward_type: RewardType
    status: RewardStatus = RewardStatus.ACTIVE
    description: str
    points_cost: int = 0
    monetary_value: float = 0.0
    valid_from: str = ""
    valid_until: str = ""
    redeemed_at: Optional[str] = None
    notes: Optional[str] = None


class MemberFeedback(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    member_id: str
    member_name: str
    channel: FeedbackChannel
    sentiment: FeedbackSentiment = FeedbackSentiment.NEUTRAL
    rating: int = 0
    category: str = ""
    comment: str = ""
    response: Optional[str] = None
    responded_at: Optional[str] = None
    created_at: str = ""


class ReferralRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    referrer_member_id: str
    referrer_name: str
    referred_name: str
    referred_email: str = ""
    referred_phone: str = ""
    status: str = "pending"
    reward_points: int = 0
    converted_at: Optional[str] = None
    notes: Optional[str] = None


# ── Create Schemas ─────────────────────────────────────

class CreateEngagementProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: str
    member_name: str
    engagement_level: EngagementLevel = EngagementLevel.MODERATE
    activity_score: float = 0.0
    visits_last_30_days: int = 0
    visits_last_90_days: int = 0
    total_spend_ytd: float = 0.0
    favorite_activities: list[str] = Field(default_factory=list)
    loyalty_points: int = 0
    tags: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


class CreateReactivationCampaign(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    campaign_type: CampaignType
    description: str
    target_member_ids: list[str] = Field(default_factory=list)
    target_engagement_level: Optional[EngagementLevel] = None
    channels: list[FeedbackChannel] = Field(default_factory=list)
    message_template: str = ""
    start_date: str
    end_date: str
    budget: float = 0.0
    notes: Optional[str] = None


class CreateLoyaltyReward(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: str
    member_name: str
    reward_type: RewardType
    description: str
    points_cost: int = 0
    monetary_value: float = 0.0
    valid_from: str = ""
    valid_until: str = ""
    notes: Optional[str] = None


class CreateMemberFeedback(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    member_id: str
    member_name: str
    channel: FeedbackChannel
    sentiment: FeedbackSentiment = FeedbackSentiment.NEUTRAL
    rating: int = 0
    category: str = ""
    comment: str = ""
    notes: Optional[str] = None


class CreateReferral(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    referrer_member_id: str
    referrer_name: str
    referred_name: str
    referred_email: str = ""
    referred_phone: str = ""
    reward_points: int = 500
    notes: Optional[str] = None


# ── Update Schemas ─────────────────────────────────────

class UpdateEngagementProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    engagement_level: Optional[EngagementLevel] = None
    activity_score: Optional[float] = None
    visits_last_30_days: Optional[int] = None
    visits_last_90_days: Optional[int] = None
    total_spend_ytd: Optional[float] = None
    favorite_activities: Optional[list[str]] = None
    loyalty_points: Optional[int] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None


class UpdateLoyaltyReward(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Optional[RewardStatus] = None
    description: Optional[str] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None
