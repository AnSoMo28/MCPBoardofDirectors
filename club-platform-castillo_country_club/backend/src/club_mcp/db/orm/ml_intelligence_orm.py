"""ML member features ORM — Ola 2.1-decimonovena.

Las features per-member del dataset cross-domain de
ml_intelligence (engagement · ltv · churn_risk · satisfaction ·
visits_monthly · active_domains · join_month · tenure) son
FEATURES DE ML, no columnas de dominio: NO viven en ninguna de
las 18 tablas migradas. El repo in-memory las siembra literales
en _build_cross_domain_seed; el ORM las persiste aquí para que
el canon drop-in sea byte a byte.

Mecánica member360.seed_demo_data: INSERT idempotente — el
id del member ES la clave (member_id unique); re-siembra =
no-op por fila. El agente NUNCA escribe: solo el repo
(_seed_member_features) o el suite. Sin FK dura a
members_360 (features puede existir para members que aún no
migran — MISMA forma que el in-memory, que no valida contra
nada).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


JSONType = JSONB().with_variant(JSON(), "sqlite")


class MLMemberFeatureORM(Base):
    """Feature set de ML por member — espejo del seed del repo."""

    __tablename__ = "ml_member_features"

    member_id: Mapped[str] = mapped_column(
        String(24), primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(240), nullable=False, default=""
    )
    tier: Mapped[str] = mapped_column(
        String(32), nullable=False, default=""
    )
    family_id: Mapped[str] = mapped_column(
        String(64), nullable=False, default=""
    )
    join_month: Mapped[str] = mapped_column(
        String(7), nullable=False, default=""
    )
    engagement: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    ltv: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    churn_risk: Mapped[str] = mapped_column(
        String(16), nullable=False, default="medium"
    )
    satisfaction: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    visits_monthly: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    active_domains: Mapped[list[str]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    tenure_months: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None
    )

    def to_dict(self) -> dict[str, Any]:
        """El shape EXACTO del member del seed in-memory."""
        return {
            "id": self.member_id,
            "name": self.name,
            "tier": self.tier,
            "family_id": self.family_id,
            "join_month": self.join_month,
            "engagement": self.engagement,
            "ltv": self.ltv,
            "churn_risk": self.churn_risk,
            "satisfaction": self.satisfaction,
            "visits_monthly": self.visits_monthly,
            "active_domains": self.active_domains,
            "tenure_months": self.tenure_months,
        }
