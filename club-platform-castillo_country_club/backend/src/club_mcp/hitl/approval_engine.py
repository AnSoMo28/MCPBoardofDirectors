"""
Approval engine for Human-in-the-Loop workflows.
Manages creation, approval, rejection, and expiry of requests.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Callable, Optional
from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
from club_mcp.hitl.approval_types import (
    ApprovalLevel,
    ApprovalRequest,
    ApprovalStatus,
)

logger = logging.getLogger(__name__)

EXPIRY_BY_LEVEL: dict[ApprovalLevel, Optional[timedelta]] = {
    ApprovalLevel.AUTO: None,
    ApprovalLevel.SEMI_AUTO: timedelta(hours=72),
    ApprovalLevel.HITL: timedelta(hours=48),
    ApprovalLevel.ALWAYS_HUMAN: timedelta(hours=72),
}


class ApprovalEngine:
    """
    In-memory approval engine.
    Production version persists to database.
    """

    def __init__(self) -> None:
        self._requests: dict[UUID, ApprovalRequest] = {}
        self._callbacks: dict[UUID, Callable] = {}
        # P2-C3h B0.5 — cierra el loop HITL: antes aprobar solo cambiaba
        # el status y los 38 execute_* de los agentes quedaban huérfanos.
        self._executors: dict[tuple[str, str], Callable] = {}
        self._executions: dict[UUID, Any] = {}

    def register_executor(self, agent: str, tool: str, executor: Callable) -> None:
        """Registrar el ejecutor post-aprobación para (agent, tool)."""
        self._executors[(agent, tool)] = executor

    def get_execution(self, request_id: UUID) -> Any | None:
        """Resultado del ejecutor para una solicitud aprobada (si hubo)."""
        return self._executions.get(request_id)



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
        approver_roles: Optional[list[str]] = None,
        on_approved: Optional[Callable] = None,
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
            expires_at=datetime.now(timezone.utc) + expiry if expiry else None,
        )
        self._requests[request.request_id] = request
        if on_approved:
            self._callbacks[request.request_id] = on_approved
        logger.info(
            "[HITL] Request %s created | agent=%s tool=%s level=%s",
            request.request_id, agent, tool, approval_level.value,
        )
        return request

    async def approve(
        self,
        request_id: UUID,
        approved_by: str,
        note: str = "",
    ) -> ApprovalRequest:
        request = self._get_or_raise(request_id)
        if request.status != ApprovalStatus.PENDING:
            raise ValueError(f"Request {request_id} is not pending (status={request.status.value})")

        request.status = ApprovalStatus.APPROVED
        request.resolved_by = approved_by
        request.resolution_note = note
        request.resolved_at = datetime.now(timezone.utc)

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

        return request

    async def reject(
        self,
        request_id: UUID,
        rejected_by: str,
        reason: str = "",
    ) -> ApprovalRequest:
        request = self._get_or_raise(request_id)
        if request.status != ApprovalStatus.PENDING:
            raise ValueError(f"Request {request_id} is not pending (status={request.status.value})")

        request.status = ApprovalStatus.REJECTED
        request.resolved_by = rejected_by
        request.resolution_note = reason
        request.resolved_at = datetime.now(timezone.utc)

        self._callbacks.pop(request_id, None)
        logger.info("[HITL] Request %s rejected by %s | reason=%s", request_id, rejected_by, reason)
        return request

    async def get_pending(
        self,
        agent: Optional[str] = None,
    ) -> list[ApprovalRequest]:
        results = [
            r for r in self._requests.values()
            if r.status == ApprovalStatus.PENDING
        ]
        if agent:
            results = [r for r in results if r.agent == agent]
        return sorted(results, key=lambda r: r.created_at)

    async def get_request(self, request_id: UUID) -> Optional[ApprovalRequest]:
        return self._requests.get(request_id)

    async def expire_stale(self) -> int:
        now = datetime.now(timezone.utc)
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

    def _get_or_raise(self, request_id: UUID) -> ApprovalRequest:
        request = self._requests.get(request_id)
        if not request:
            raise ValueError(f"Approval request not found: {request_id}")
        return request
    async def start_expiry_task(self, interval_seconds: int = 300) -> None:
        """Background task: expire stale requests every N seconds."""
        import asyncio

        async def _loop():
            while True:
                try:
                    count = await self.expire_stale()
                    if count > 0:
                        logger.info("[HITL] Expired %d requests", count)
                except Exception:
                    logger.exception("[HITL] Error in expiry task")
                await asyncio.sleep(interval_seconds)

        asyncio.create_task(_loop())
        logger.info("[HITL] Expiry task started (interval=%ds)", interval_seconds)
