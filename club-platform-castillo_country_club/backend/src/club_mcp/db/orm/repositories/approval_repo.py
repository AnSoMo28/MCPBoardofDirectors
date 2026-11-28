"""ApprovalStore async — el estado del motor HITL se vuelve tabla + ledger.

Ola 2.3 (vertical ApprovalEngine · Q-PER-03). A diferencia de las 17
verticales previas (repo de datos), este vertical persiste un MOTOR:
el engine conserva lógica (expiración · callbacks · executores) y
DELEGA el estado durable en un ApprovalStore (protocol de
club_mcp.hitl.approval_engine — inversión de dependencias: hitl NO
importa db.orm; este módulo implementa el protocol y el bootstrap
hace el wiring OPT-IN, igual que las 17: sin CLUB_PERSISTENCE_URL
el motor corre 100% in-memory — byte a byte el comportamiento
actual, smoke B0 y los 929 tests intactos).

Ledger tamper-evident (R-6 del radar · ADR-0007): cada transición
append una fila en approval_events cuya event_hash sella la
anterior (prev_hash). GENESIS = "0"*64. verify_chain() re-deriva
toda la cadena: una edición post-hoc rompe EXACTAMENTE en la fila
editada. Firmas del protocol (las llama el motor):

    save / get / get_pending / delete_expired
    append_event / verify_chain / events_for

Semántica literal del motor in-memory que se preserva:
  * create: INSERT (solo requests PENDING-nuevos).
  * approve/reject/expire: UPDATE de status/resolved_*.
  * get_pending: filtro status=="pending", sort created_at (mismo
    orden observable del motor — lección run #56: orden SIEMPRE
    explícito order_by).
  * expire_stale: UPDATE condicionado (PENDING + expires_at < now)
    — MISMA selección que el motor iteraba.
  * El motor sigue siendo la fuente del CICLO (callbacks,
    executores, EXPIRY_BY_LEVEL): el store solo persiste.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import delete, select, update

from club_mcp.db.orm.approvals_orm import (
    ApprovalEventORM,
    ApprovalORM,
    approval_model_from_orm,
    approval_orm_from_model,
)
from club_mcp.db.orm.session import session_scope
from club_mcp.hitl.approval_types import ApprovalStatus


if TYPE_CHECKING:
    from collections.abc import Sequence
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncEngine

    from club_mcp.hitl.approval_types import ApprovalRequest

logger = logging.getLogger(__name__)

GENESIS = "0" * 64

# event_type del ledger (lenguaje del dominio, str plano)
EVENT_CREATED = "created"
EVENT_APPROVED = "approved"
EVENT_REJECTED = "rejected"
EVENT_EXPIRED = "expired"
EVENT_REREGISTERED = "re-registered"


def canonical_event(row: ApprovalEventORM) -> str:
    """Serialización DETERMINISTA de una fila de events (para hash).

    Orden fijo de campos · datetimes ISO 8601 SIEMPRE en UTC (naive:
    tz-aware se normaliza — sqlite relee sin tzinfo y el canon debe
    ser EXACTO al escribir y al releer, independientemente del
    driver) · JSON sort_keys. Cualquier edición de la fila cambia
    este canon y rompe event_hash.
    """
    created = row.created_at
    if created is not None and created.tzinfo is not None:
        created = created.astimezone(UTC).replace(tzinfo=None)
    return json.dumps(
        {
            "id": row.id,
            "request_id": row.request_id,
            "event_type": row.event_type,
            "actor": row.actor,
            "note": row.note,
            "payload": row.payload,
            "created_at": created.isoformat() if created else None,
        },
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def event_digest(prev_hash: str, canon: str) -> str:
    """sha256(prev_hash + canon) — el eslabón de la cadena."""
    return hashlib.sha256((prev_hash + canon).encode("utf-8")).hexdigest()


def verify_chain_rows(rows: Sequence[ApprovalEventORM]) -> list[int]:
    """Re-deriva la cadena de UNA lista de filas (orden por id).

    Devuelve los ids de filas donde el hash NO calza (vacía = cadena
    íntegra). Una edición post-hoc rompe su propia fila y todas las
    que la sellan después (efecto dominó del prev_hash).
    """
    broken: list[int] = []
    prev = GENESIS
    for row in rows:
        if row.prev_hash != prev or row.event_hash != event_digest(prev, row.canonical()):
            broken.append(row.id)
        prev = row.event_hash
    return broken


class ApprovalStore:
    """Estado durable del ApprovalEngine — tabla + ledger hash-chain."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def save(self, request: ApprovalRequest) -> None:
        """INSERT de la solicitud (create_request del motor)."""
        async with session_scope(self._engine, repo="approval_store") as session:
            session.add(approval_orm_from_model(request))

    async def get(self, request_id: UUID) -> ApprovalRequest | None:
        async with session_scope(self._engine, repo="approval_store") as session:
            row = await session.get(ApprovalORM, str(request_id))
            return approval_model_from_orm(row) if row else None

    async def update_state(
        self,
        request: ApprovalRequest,
    ) -> None:
        """UPDATE del estado resuelto (approve/reject/expire del motor)."""
        values = {
            "status": request.status.value,
            "resolved_at": request.resolved_at,
            "resolved_by": request.resolved_by,
            "resolution_note": request.resolution_note,
            "requires_dual_approval": request.requires_dual_approval,
            "first_approval_by": request.first_approval_by,
            "second_approval_by": request.second_approval_by,
        }
        async with session_scope(self._engine, repo="approval_store") as session:
            await session.execute(
                update(ApprovalORM)
                .where(ApprovalORM.request_id == str(request.request_id))
                .values(**values)
            )

    async def get_pending(
        self,
        agent: str | None = None,
    ) -> list[ApprovalRequest]:
        """PENDING (opcionalmente por agent), orden created_at — mismo orden del motor."""
        async with session_scope(self._engine, repo="approval_store") as session:
            stmt = (
                select(ApprovalORM)
                .where(ApprovalORM.status == ApprovalStatus.PENDING.value)
                .order_by(ApprovalORM.created_at, ApprovalORM.request_id)
            )
            if agent:
                stmt = stmt.where(ApprovalORM.agent == agent)
            rows = (await session.execute(stmt)).scalars().all()
            return [approval_model_from_orm(r) for r in rows]

    async def expire_stale(self, now: datetime | None = None) -> list[ApprovalRequest]:
        """UPDATE PENDING+expiradas → EXPIRED. Devuelve las expiradas (motor loguea N).

        MISMA selección que el motor iteraba (status PENDING · expires_at
        not null · expires_at < now) — sin inventar semántica nueva.
        """
        now = now or datetime.now(tz=UTC)
        expired: list[ApprovalRequest] = []
        async with session_scope(self._engine, repo="approval_store") as session:
            stmt = select(ApprovalORM).where(
                ApprovalORM.status == ApprovalStatus.PENDING.value,
                ApprovalORM.expires_at.is_not(None),
                ApprovalORM.expires_at < now,
            )
            rows = (await session.execute(stmt)).scalars().all()
            for row in rows:
                expired.append(approval_model_from_orm(row))
                row.status = ApprovalStatus.EXPIRED.value
                row.resolved_at = now
        return expired

    async def delete_expired(self) -> int:
        """Purga de resueltas/expiradas (llamado por expire_stale del motor)."""
        async with session_scope(self._engine, repo="approval_store") as session:
            res = await session.execute(
                delete(ApprovalORM).where(
                    ApprovalORM.status != ApprovalStatus.PENDING.value
                )
            )
            return int(getattr(res, "rowcount", 0) or 0)  # CursorResult con rowcount

    async def append_event(
        self,
        request_id: UUID | str,
        event_type: str,
        actor: str = "",
        note: str = "",
        payload: dict[str, Any] | None = None,
    ) -> str:
        """Append UNA fila al ledger sellando la cadena. Devuelve event_hash."""
        rid = str(request_id)
        async with session_scope(self._engine, repo="approval_store") as session:
            last = (
                await session.execute(
                    select(ApprovalEventORM)
                    .where(ApprovalEventORM.request_id == rid)
                    .order_by(ApprovalEventORM.id)
                )
            ).scalars().all()
            prev_hash = last[-1].event_hash if last else GENESIS
            row = ApprovalEventORM(
                request_id=rid,
                event_type=event_type,
                actor=actor,
                note=note,
                payload=dict(payload or {}),
                prev_hash=prev_hash,
                event_hash="",  # placeholder: se sella tras flush (id ya asignado)
            )
            session.add(row)
            await session.flush()
            row.event_hash = event_digest(prev_hash, row.canonical())
            await session.flush()  # persistir el sello antes de salir
            return row.event_hash

    async def verify_chain(self) -> list[dict[str, Any]]:
        """Verifica TODA la cadena (global, orden id). Devuelve roturas.

        Cada rotura: {event_id, request_id, reason}. Vacío = íntegra.
        Este es el gate del ADR-0007: la evidencia de integridad se
        DEMUESTRA ejecutando (la edición post-hoc cae aquí).
        """
        broken: list[dict[str, Any]] = []
        async with session_scope(self._engine, repo="approval_store") as session:
            rows = (
                await session.execute(
                    select(ApprovalEventORM).order_by(ApprovalEventORM.id)
                )
            ).scalars().all()
        # 1) re-derivación global (prev_hash encadenado)
        for row_id in verify_chain_rows(rows):
            broken.append(
                {"event_id": row_id, "request_id": None, "reason": "chain_mismatch"}
            )
        # 2) rows sin pareja approvals (huérfanas de purge) NO rompen: el
        #    ledger es append-only INDEPENDIENTE del estado mutable.
        return broken

    async def events_for(self, request_id: UUID | str) -> list[dict[str, Any]]:
        """Historial de UNA solicitud (orden id) — dict simple."""
        rid = str(request_id)
        async with session_scope(self._engine, repo="approval_store") as session:
            rows = (
                await session.execute(
                    select(ApprovalEventORM)
                    .where(ApprovalEventORM.request_id == rid)
                    .order_by(ApprovalEventORM.id)
                )
            ).scalars().all()
            return [r.to_dict() for r in rows]
