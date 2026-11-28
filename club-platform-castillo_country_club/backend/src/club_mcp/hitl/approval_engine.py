"""
Approval engine for Human-in-the-Loop workflows.
Manages creation, approval, rejection, and expiry of requests.

Ola 2.3 (Q-PER-03): el estado durable se DELEGA a un ApprovalStore
(protocol de este módulo — la implementación ORM vive en
db/orm/repositories/approval_repo.py y el wiring es OPT-IN del
bootstrap, igual que las 17 verticales: sin CLUB_PERSISTENCE_URL
el motor corre 100% in-memory — MISMO contrato observable byte a
byte; smoke B0 y toda la suite pre-existente no cambian).

El motor SIGUE siendo la fuente del ciclo (EXPIRY_BY_LEVEL ·
callbacks · executores): el store persiste solicitudes y appenda
el LEDGER tamper-evident (approval_events — hash-chain, ADR-0007).
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any


if TYPE_CHECKING:
    from collections.abc import Callable
    from uuid import UUID

from club_mcp.hitl.approval_types import (
    ApprovalLevel,
    ApprovalRequest,
    ApprovalStatus,
)


logger = logging.getLogger(__name__)

EXPIRY_BY_LEVEL: dict[ApprovalLevel, "timedelta | None"] = {
    ApprovalLevel.AUTO: None,
    ApprovalLevel.SEMI_AUTO: timedelta(hours=72),
    ApprovalLevel.HITL: timedelta(hours=48),
    ApprovalLevel.ALWAYS_HUMAN: timedelta(hours=72),
}


class ApprovalStoreProtocol:
    """Protocol del estado durable del motor (Ola 2.3).

    El motor NO importa db.orm (inversión de dependencias: es lógica
    de negocio, no un repo de datos). El bootstrap cablea la
    implementación ORM OPT-IN; sin wiring, el motor corre solo con
    sus dicts — comportamiento pre-2.3 byte a byte.
    """

    async def save(self, request: ApprovalRequest) -> None:
        return None

    async def get(self, request_id: UUID) -> ApprovalRequest | None:
        return None

    async def update_state(self, request: ApprovalRequest) -> None:
        return None

    async def get_pending(self, agent: str | None = None) -> list[ApprovalRequest]:
        return []

    async def expire_stale(self) -> list[ApprovalRequest]:
        return []

    async def append_event(
        self,
        request_id: UUID,
        event_type: str,
        actor: str = "",
        note: str = "",
        payload: dict[str, Any] | None = None,
    ) -> str:
        return ""


class ApprovalEngine:
    """
    In-memory approval engine.
    Production version persists to database.
    """

    def __init__(self, store: ApprovalStoreProtocol | None = None) -> None:
        self._requests: dict[UUID, ApprovalRequest] = {}
        self._callbacks: dict[UUID, Callable[..., Any]] = {}
        # P2-C3h B0.5 — cierra el loop HITL: antes aprobar solo cambiaba
        # el status y los 38 execute_* de los agentes quedaban huérfanos.
        self._executors: dict[tuple[str, str], Callable[..., Any]] = {}
        self._executions: dict[UUID, Any] = {}
        # Ola 2.3 — estado durable OPT-IN (None = 100% in-memory).
        self._store = store

    def register_executor(self, agent: str, tool: str, executor: Callable[..., Any]) -> None:
        """Registrar el ejecutor post-aprobación para (agent, tool)."""
        self._executors[(agent, tool)] = executor

    def get_execution(self, request_id: UUID) -> Any | None:
        """Resultado del ejecutor para una solicitud aprobada (si hubo)."""
        return self._executions.get(request_id)

    def _persisting(self) -> bool:
        return self._store is not None

    async def create_request(
        self,
        agent: str,
        tool: str,
        params: dict[str, Any],
        requested_by: str,
        approval_level: ApprovalLevel,
        risk_summary: str = "",
        estimated_impact: str = "",
        affected_count: int = 0,
        approver_roles: list[str] | None = None,
        on_approved: Callable[..., Any] | None = None,
    ) -> ApprovalRequest:
        expiry = EXPIRY_BY_LEVEL.get(approval_level)
        request = ApprovalRequest(
            agent=agent,
            tool=tool,
            params=params,
            requested_by=requested_by,
            approval_level=approval_level,
            risk_summary=risk_summary,
            estimated_impact=estimated_impact,
            affected_count=affected_count,
            approver_roles=approver_roles or [],  # ← FIX: persist
            expires_at=datetime.now(UTC) + expiry if expiry else None,
        )
        self._requests[request.request_id] = request
        if on_approved:
            self._callbacks[request.request_id] = on_approved
        logger.info(
            "[HITL] Request %s created | agent=%s tool=%s level=%s",
            request.request_id, agent, tool, approval_level.value,
        )
        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            await store.save(request)
            await store.append_event(
                request.request_id, "created",
                actor=requested_by, note=risk_summary,
            )
        return request

    async def approve(
        self,
        request_id: UUID,
        approved_by: str,
        note: str = "",
    ) -> ApprovalRequest:
        request = await self._get_or_raise(request_id)
        if request.status != ApprovalStatus.PENDING:
            raise ValueError(f"Request {request_id} is not pending (status={request.status.value})")

        request.status = ApprovalStatus.APPROVED
        request.resolved_by = approved_by
        request.resolution_note = note
        request.resolved_at = datetime.now(UTC)

        logger.info("[HITL] Request %s approved by %s", request_id, approved_by)

        callback = self._callbacks.pop(request_id, None)
        if callback:
            try:
                await callback(**request.params)
            except Exception:
                logger.exception("[HITL] Callback failed for approved request %s", request_id)

        # B0.5 — despachar el ejecutor registrado (si existe) con los
        # params originales. El fallo se loguea y captura, nunca es fatal:
        # la aprobación ya está vigente.
        executor = self._executors.get((request.agent, request.tool))
        if executor is not None:
            try:
                self._executions[request_id] = await executor(**request.params)
                logger.info("[HITL] Executor ok para %s/%s", request.agent, request.tool)
            except Exception:
                logger.exception(
                    "[HITL] Executor falló para %s/%s", request.agent, request.tool
                )
                self._executions[request_id] = {
                    "status": "error",
                    "message": "Aprobado, pero la ejecución post-aprobación falló (ver logs).",
                }

        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            await store.update_state(request)
            await store.append_event(
                request_id, "approved", actor=approved_by, note=note,
            )
        return request

    async def reject(
        self,
        request_id: UUID,
        rejected_by: str,
        reason: str = "",
    ) -> ApprovalRequest:
        request = await self._get_or_raise(request_id)
        if request.status != ApprovalStatus.PENDING:
            raise ValueError(f"Request {request_id} is not pending (status={request.status.value})")

        request.status = ApprovalStatus.REJECTED
        request.resolved_by = rejected_by
        request.resolution_note = reason
        request.resolved_at = datetime.now(UTC)

        self._callbacks.pop(request_id, None)
        logger.info("[HITL] Request %s rejected by %s | reason=%s", request_id, rejected_by, reason)
        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            await store.update_state(request)
            await store.append_event(
                request_id, "rejected", actor=rejected_by, note=reason,
            )
        return request

    async def get_pending(
        self,
        agent: str | None = None,
    ) -> list[ApprovalRequest]:
        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            return await store.get_pending(agent)
        results = [
            r for r in self._requests.values()
            if r.status == ApprovalStatus.PENDING
        ]
        if agent:
            results = [r for r in results if r.agent == agent]
        return sorted(results, key=lambda r: r.created_at)

    async def get_request(self, request_id: UUID) -> ApprovalRequest | None:
        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            return await store.get(request_id)
        return self._requests.get(request_id)

    async def expire_stale(self) -> int:
        if self._persisting():
            store = self._store
            assert store is not None  # narrowed por _persisting()
            expired = await store.expire_stale()
            for request in expired:
                self._callbacks.pop(request.request_id, None)
            if expired:
                logger.info("[HITL] Expired %d stale requests", len(expired))
            return len(expired)
        now = datetime.now(UTC)
        count = 0
        for request in self._requests.values():
            if request.status == ApprovalStatus.PENDING and request.expires_at and request.expires_at < now:
                request.status = ApprovalStatus.EXPIRED
                request.resolved_at = now
                self._callbacks.pop(request.request_id, None)
                count += 1
        if count:
            logger.info("[HITL] Expired %d stale requests", count)
        return count

    async def _get_or_raise(self, request_id: UUID) -> ApprovalRequest:
        """Dict primero; si NO está y hay store, la tabla (Q-PER-03: la
        solicitud creada por el proceso ANTERIOR sigue viva tras restart)."""
        request = self._requests.get(request_id)
        if request is None and self._persisting():
            request = await self._store.get(request_id)  # type: ignore[union-attr]
            if request is not None:
                self._requests[request_id] = request
        if not request:
            raise ValueError(f"Approval request not found: {request_id}")
        return request
    async def start_expiry_task(self, interval_seconds: int = 300) -> None:
        """Background task: expire stale requests every N seconds."""
        import asyncio

        async def _loop() -> None:
            while True:
                try:
                    count = await self.expire_stale()
                    if count > 0:
                        logger.info("[HITL] Expired %d requests", count)
                except Exception:
                    logger.exception("[HITL] Error in expiry task")
                await asyncio.sleep(interval_seconds)

        # ratchet: referencia deliberada sin guardar (fire-and-forget del
        # runtime — idéntico al baseline d0606e5; el loop vive mientras el
        # proceso viva)
        asyncio.create_task(_loop())  # noqa: RUF006
        logger.info("[HITL] Expiry task started (interval=%ds)", interval_seconds)
