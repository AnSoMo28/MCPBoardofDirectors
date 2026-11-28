"""Tablas del dominio Compliance — Ola 2.1-quinqua (vertical compliance).

Espejo 1:1 de club_mcp.models.compliance (Pydantic). Las 3 entidades
del repo in-memory (verificar contra compliance_repo.py):

    _audits:    dict[str, dict]  → tabla compliance_audits
    _documents: dict[str, dict]  → tabla compliance_documents
    _alerts:    dict[str, dict]  → tabla compliance_alerts

Las listas flexibles (checks del audit: lista de ComplianceCheck)
a JSONB por fila: anexos del agregado, no entidades con identity
propia — mismo criterio que families.activities (§3.8-bis) y que
engagement.favorite_activities (§3.8-tris). El in-memory guarda el
audit CON sus checks en el mismo dict; la tabla hace lo mismo en una
columna JSONB — el contrato add_check_to_audit (append + recuento
score_pct) no cambia ni un byte.

IDs: el in-memory genera {prefix}_{uuid4().hex[:8]} (aud_/doc_/alrt_
/chk_ para checks); el repo ORM reproduce la MISMA forma. Sin
excepciones custom (el in-memory devuelve None / listas vacías; el
ORM idéntico).
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el modelo in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class ComplianceAuditORM(Base):
    __tablename__ = "compliance_audits"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    area: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    auditor: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    date_from: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    date_to: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    checks: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONType, nullable=False, default=list
    )
    total_checks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    passed_checks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_checks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score_pct: Mapped[float] = mapped_column(Numeric(6, 1), nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class ComplianceDocumentORM(Base):
    __tablename__ = "compliance_documents"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    area: Mapped[str] = mapped_column(String(24), nullable=False)
    issuer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    document_number: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    issue_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    expiry_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class ComplianceAlertORM(Base):
    __tablename__ = "compliance_alerts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    area: Mapped[str] = mapped_column(String(24), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    risk_level: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="open")
    due_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    responsible: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    resolution: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
