"""
Human-in-the-Loop approval types and data models.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ApprovalLevel(str, Enum):
    AUTO = "auto"
    SEMI_AUTO = "semi_auto"
    HITL = "hitl"
    ALWAYS_HUMAN = "always_human"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ApprovalRequest(BaseModel):
    request_id: UUID = Field(default_factory=uuid4)
    agent: str
    tool: str
    params: dict[str, Any]
    requested_by: str
    approval_level: ApprovalLevel
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    expires_at: Optional[datetime] = None

    risk_summary: str = ""
    estimated_impact: str = ""
    affected_count: int = 0

    requires_dual_approval: bool = False
    first_approval_by: Optional[str] = None
    second_approval_by: Optional[str] = None
    approver_roles: list[str] = Field(default_factory=list)
