"""Tablas del dominio HITL — Ola 2.3 (vertical ApprovalEngine).

Espejo 1:1 de club_mcp.hitl.approval_types.ApprovalRequest (Pydantic):

    engine._requests: dict[UUID, ApprovalRequest] → tabla approvals

params (dict[str, Any]) a JSONB por fila: anexo del agregado, no
entidad con identity propia — mismo criterio que
families.activities (§3.8-bis) y las 16 verticales previas.

Segunda tabla — approval_events — es NUEVA en el contrato observable
(sin equivalente in-memory, no rompe el espejo): un LEDGER
append-only de cada transición del ciclo de vida
(created/approved/rejected/expired) con CHAIN DE HASHES
tamper-evident: cada evento sella el hash del anterior
(prev_hash) y el hash de SU contenido determinista (event_hash).
Esto hace que la aprobación no solo sobreviva al restart (Q-PER-03)
sino que sea AUDITABLE criptográficamente: cualquier edición
post-hoc de una fila de events rompe la cadena y se detecta en
verify_chain() (R-6 del radar — ADR-0007). Sin equivalentes en
la industria para un motor HITL de un club deportivo.

Enums (ApprovalLevel/ApprovalStatus) NO son constraint CHECK: el
repo guarda .value str plano y Pydantic reconstruye al leer —
mismo estilo que las 17 verticales previas (lección 0017).

created_at/resolved_at/expires_at: el motor usa datetimes
tz-aware UTC (datetime.now(timezone.utc)); columnas
DateTime(timezone=True) — roundtrip pérdida cero.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from club_mcp.db.orm.base import Base


def utcnow() -> datetime:
    """now tz-aware UTC (misma fuente que el motor in-memory)."""
    return datetime.now(tz=UTC)


# JSONB en postgres, JSON en sqlite (dev/suite local): misma API.
JSONType = JSONB().with_variant(JSON(), "sqlite")


class ApprovalORM(Base):
    """Una solicitud HITL — espejo de ApprovalRequest (Pydantic)."""

    __tablename__ = "approvals"

    request_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    agent: Mapped[str] = mapped_column(String(64), nullable=False)
    tool: Mapped[str] = mapped_column(String(128), nullable=False)
    requested_by: Mapped[str] = mapped_column(String(64), nullable=False)
    approval_level: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    params: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    risk_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    estimated_impact: Mapped[str] = mapped_column(Text, nullable=False, default="")
    affected_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Q-HITL-01 (campos del modelo, aún sin máquina de estados dual en el
    # motor — el espejo los persiste 1:1, SIN inventar semántica):
    requires_dual_approval: Mapped[bool] = mapped_column(nullable=False, default=False)
    first_approval_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    second_approval_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approver_roles: Mapped[list[str]] = mapped_column(JSONType, nullable=False, default=list)


class ApprovalEventORM(Base):
    """Ledger append-only del ciclo HITL — hash-chain tamper-evident.

    Nuevo en Ola 2.3 (sin equivalente in-memory): cada transición
    del ciclo (created · approved · rejected · expired · re-registered)
    agrega UNA fila cuya event_hash = sha256(prev_hash + canon(event)),
    sellando la fila anterior. verify_chain() la re-deriva end to end:
    una edición post-hoc rompe la cadena exactamente en la fila
    editada. GENESIS: prev_hash = "0" * 64.
    """

    __tablename__ = "approval_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(16), nullable=False)
    actor: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    def canonical(self) -> str:
        """Serialización determinista para hash (orden fijo · ISO datetimes)."""
        from club_mcp.db.orm.repositories.approval_repo import canonical_event

        return canonical_event(self)

    def to_dict(self) -> dict[str, Any]:
        """Fila como dict simple (para assertion de tests y lecturas)."""
        return {
            "id": self.id,
            "request_id": self.request_id,
            "event_type": self.event_type,
            "actor": self.actor,
            "note": self.note,
            "payload": self.payload,
            "created_at": self.created_at,
            "prev_hash": self.prev_hash,
            "event_hash": self.event_hash,
        }


def approval_orm_from_model(request: Any) -> ApprovalORM:
    """ApprovalRequest (Pydantic) → ApprovalORM (espejo 1:1)."""
    return ApprovalORM(
        request_id=str(request.request_id),
        agent=request.agent,
        tool=request.tool,
        requested_by=request.requested_by,
        approval_level=request.approval_level.value,
        status=request.status.value,
        params=dict(request.params),
        created_at=request.created_at,
        resolved_at=request.resolved_at,
        resolved_by=request.resolved_by,
        resolution_note=request.resolution_note,
        expires_at=request.expires_at,
        risk_summary=request.risk_summary,
        estimated_impact=request.estimated_impact,
        affected_count=request.affected_count,
        requires_dual_approval=request.requires_dual_approval,
        first_approval_by=request.first_approval_by,
        second_approval_by=request.second_approval_by,
        approver_roles=list(request.approver_roles),
    )


def approval_model_from_orm(row: ApprovalORM) -> Any:
    """ApprovalORM → ApprovalRequest (Pydantic reconstruye enums)."""
    from club_mcp.hitl.approval_types import ApprovalLevel, ApprovalRequest, ApprovalStatus

    return ApprovalRequest(
        request_id=UUID(row.request_id),
        agent=row.agent,
        tool=row.tool,
        params=dict(row.params),
        requested_by=row.requested_by,
        approval_level=ApprovalLevel(row.approval_level),
        status=ApprovalStatus(row.status),
        created_at=row.created_at,
        resolved_at=row.resolved_at,
        resolved_by=row.resolved_by,
        resolution_note=row.resolution_note,
        expires_at=row.expires_at,
        risk_summary=row.risk_summary,
        estimated_impact=row.estimated_impact,
        affected_count=row.affected_count,
        requires_dual_approval=row.requires_dual_approval,
        first_approval_by=row.first_approval_by,
        second_approval_by=row.second_approval_by,
        approver_roles=list(row.approver_roles),
    )
