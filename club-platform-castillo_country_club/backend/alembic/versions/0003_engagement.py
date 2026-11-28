"""Ola 2.1-tris — 5 tablas del dominio Member Engagement.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-17

Espejo 1:1 de db/orm/engagement_orm.py (EngagementProfileORM ·
ReactivationCampaignORM · LoyaltyRewardORM · MemberFeedbackORM ·
ReferralORM) — constraint names deterministas por la
naming_convention de Base (pk_<table>).

JSONB (postgres) con variante JSON (sqlite/dev) para
favorite_activities · tags · target_member_ids · channels: anexos
del agregado, no entidades con identity propia (mismo criterio que
families.activities §3.8-bis).

Los enums NO son constraint CHECK: el repo guarda .value (String(24))
y reconstruye el Pydantic enum al leer — el contrato del agente
(42 tests) pasa enums por update; un CHECK duplicaría la validación
que Pydantic ya hace en el borde (decisión: sin CHECK, mismo estilo
que tier/status en families).
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _jsonb() -> sa.types.TypeEngine:
    return JSONB().with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "engagement_profiles",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_engagement_profiles"),
        sa.Column("member_id", sa.String(length=36), nullable=False),
        sa.Column("member_name", sa.String(length=200), nullable=False),
        sa.Column("engagement_level", sa.String(length=24), nullable=False),
        sa.Column("activity_score", sa.Numeric(8, 2), nullable=False),
        sa.Column("visits_last_30_days", sa.Integer(), nullable=False),
        sa.Column("visits_last_90_days", sa.Integer(), nullable=False),
        sa.Column("last_visit_date", sa.String(length=10), nullable=True),
        sa.Column("total_spend_ytd", sa.Numeric(12, 2), nullable=False),
        sa.Column("favorite_activities", _jsonb(), nullable=False),
        sa.Column("loyalty_points", sa.Integer(), nullable=False),
        sa.Column("referral_count", sa.Integer(), nullable=False),
        sa.Column("feedback_score", sa.Numeric(4, 2), nullable=True),
        sa.Column("tags", _jsonb(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "reactivation_campaigns",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_reactivation_campaigns"),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("campaign_type", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("target_member_ids", _jsonb(), nullable=False),
        sa.Column("target_engagement_level", sa.String(length=24), nullable=True),
        sa.Column("channels", _jsonb(), nullable=False),
        sa.Column("message_template", sa.Text(), nullable=False),
        sa.Column("start_date", sa.String(length=10), nullable=False),
        sa.Column("end_date", sa.String(length=10), nullable=False),
        sa.Column("budget", sa.Numeric(12, 2), nullable=False),
        sa.Column("sent_count", sa.Integer(), nullable=False),
        sa.Column("response_count", sa.Integer(), nullable=False),
        sa.Column("conversion_count", sa.Integer(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "loyalty_rewards",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_loyalty_rewards"),
        sa.Column("member_id", sa.String(length=36), nullable=False),
        sa.Column("member_name", sa.String(length=200), nullable=False),
        sa.Column("reward_type", sa.String(length=24), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("points_cost", sa.Integer(), nullable=False),
        sa.Column("monetary_value", sa.Numeric(12, 2), nullable=False),
        sa.Column("valid_from", sa.String(length=10), nullable=False),
        sa.Column("valid_until", sa.String(length=10), nullable=False),
        sa.Column("redeemed_at", sa.String(length=10), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "member_feedback",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_member_feedback"),
        sa.Column("member_id", sa.String(length=36), nullable=False),
        sa.Column("member_name", sa.String(length=200), nullable=False),
        sa.Column("channel", sa.String(length=24), nullable=False),
        sa.Column("sentiment", sa.String(length=24), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("response", sa.Text(), nullable=True),
        sa.Column("responded_at", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "referrals",
        sa.Column("id", sa.String(length=8), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_referrals"),
        sa.Column("referrer_member_id", sa.String(length=36), nullable=False),
        sa.Column("referrer_name", sa.String(length=200), nullable=False),
        sa.Column("referred_name", sa.String(length=200), nullable=False),
        sa.Column("referred_email", sa.String(length=255), nullable=False),
        sa.Column("referred_phone", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("reward_points", sa.Integer(), nullable=False),
        sa.Column("converted_at", sa.String(length=30), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("referrals")
    op.drop_table("member_feedback")
    op.drop_table("loyalty_rewards")
    op.drop_table("reactivation_campaigns")
    op.drop_table("engagement_profiles")
