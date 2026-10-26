"""HITL notification stub.

In production this will integrate with email, WhatsApp, and push notifications.
Currently captures calls for testing and logs them.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class HITLNotifier:
    """Handles notifications for HITL approval flows.

    Stubs for email/push/WhatsApp — logs calls in dev,
    asserts in tests via the `calls` list.
    """

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def notify_admin(
        self,
        tool_name: str,
        params: dict[str, Any] | None = None,
        result: dict[str, Any] | None = None,
        message: str = "",
    ) -> None:
        """Notify admin that a SEMI-AUTO tool executed."""
        entry = {
            "type": "admin_notification",
            "tool_name": tool_name,
            "params": params or {},
            "result": result or {},
            "message": message,
        }
        self.calls.append(entry)
        logger.info(
            "[HITL Notifier] Admin notification: tool=%s | %s",
            tool_name,
            message or "auto-executed",
        )

    async def notify_approval_needed(
        self,
        request_id: str,
        tool_name: str,
        params: dict[str, Any],
        approver_ids: list[str] | None = None,
    ) -> None:
        """Notify approvers that a HITL request is pending."""
        entry = {
            "type": "approval_needed",
            "request_id": request_id,
            "tool_name": tool_name,
            "params": params,
            "approver_ids": approver_ids or [],
        }
        self.calls.append(entry)
        logger.info(
            "[HITL Notifier] Approval needed: request=%s tool=%s approvers=%s",
            request_id,
            tool_name,
            approver_ids or ["all"],
        )

    async def notify_approval_result(
        self,
        request_id: str,
        tool_name: str,
        approved: bool,
        reason: str = "",
    ) -> None:
        """Notify stakeholders of an approval decision."""
        entry = {
            "type": "approval_result",
            "request_id": request_id,
            "tool_name": tool_name,
            "approved": approved,
            "reason": reason,
        }
        self.calls.append(entry)
        logger.info(
            "[HITL Notifier] Approval result: request=%s approved=%s reason=%s",
            request_id,
            approved,
            reason or "n/a",
        )

    async def notify_family(
        self,
        family_id: str,
        template: str,
        variables: dict[str, Any] | None = None,
        channel: str = "app",
    ) -> None:
        """Send a message to a family via their preferred channel."""
        entry = {
            "type": "family_message",
            "family_id": family_id,
            "template": template,
            "variables": variables or {},
            "channel": channel,
        }
        self.calls.append(entry)
        logger.info(
            "[HITL Notifier] Family message: family=%s template=%s channel=%s",
            family_id,
            template,
            channel,
        )

    def clear(self) -> None:
        """Reset captured calls (useful in tests)."""
        self.calls.clear()
