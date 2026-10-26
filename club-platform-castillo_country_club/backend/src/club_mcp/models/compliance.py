"""Compliance domain models for the Club MCP platform."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Enums ─────────────────────────────────────────────────


class AuditStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NEEDS_FOLLOWUP = "needs_followup"


class ComplianceArea(str, Enum):
    SAFETY = "safety"
    HEALTH_HYGIENE = "health_hygiene"
    FOOD_SAFETY = "food_safety"
    ENVIRONMENTAL = "environmental"
    LABOR = "labor"
    DATA_PRIVACY = "data_privacy"
    LICENSING = "licensing"
    FIRE_SAFETY = "fire_safety"
    ACCESSIBILITY = "accessibility"
    INSURANCE = "insurance"


class CheckStatus(str, Enum):
    PENDING = "pending"
    PASS = "pass"
    FAIL = "fail"
    NOT_APPLICABLE = "not_applicable"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DocumentStatus(str, Enum):
    CURRENT = "current"
    EXPIRING_SOON = "expiring_soon"
    EXPIRED = "expired"
    MISSING = "missing"


# ── Core models ───────────────────────────────────────────


class ComplianceCheck(BaseModel):
    """A single compliance check item."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    area: ComplianceArea
    title: str
    description: str = ""
    status: CheckStatus = CheckStatus.PENDING
    risk_level: RiskLevel = RiskLevel.MEDIUM
    findings: str = ""
    corrective_action: str = ""
    deadline: str = ""
    responsible: str = ""
    checked_at: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditRecord(BaseModel):
    """A compliance audit record."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    title: str
    area: ComplianceArea
    status: AuditStatus = AuditStatus.DRAFT
    auditor: str = ""
    date_from: str = ""
    date_to: str = ""
    summary: str = ""
    checks: list[ComplianceCheck] = Field(default_factory=list)
    total_checks: int = 0
    passed_checks: int = 0
    failed_checks: int = 0
    score_pct: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplianceDocument(BaseModel):
    """A compliance-related document/certificate."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    name: str
    area: ComplianceArea
    issuer: str = ""
    document_number: str = ""
    issue_date: str = ""
    expiry_date: str = ""
    status: DocumentStatus = DocumentStatus.CURRENT
    file_url: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplianceAlert(BaseModel):
    """A compliance alert or finding."""

    model_config = ConfigDict(from_attributes=True)

    id: str = ""
    area: ComplianceArea
    title: str
    description: str
    risk_level: RiskLevel = RiskLevel.MEDIUM
    status: str = "open"
    due_date: str = ""
    responsible: str = ""
    resolution: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComplianceReport(BaseModel):
    """Overall compliance status report."""

    model_config = ConfigDict(from_attributes=True)

    period_start: str
    period_end: str
    overall_score: float = 0.0
    total_areas: int = 0
    compliant_areas: int = 0
    non_compliant_areas: int = 0
    open_alerts: int = 0
    expiring_documents: int = 0
    area_scores: list[dict[str, Any]] = Field(default_factory=list)
    recent_audits: list[dict[str, Any]] = Field(default_factory=list)
    summary: str = ""
