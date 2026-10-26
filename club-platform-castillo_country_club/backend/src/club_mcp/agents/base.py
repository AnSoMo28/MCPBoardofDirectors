"""
Base agent class.
Provides: tool registration decorator, MCP integration, HITL support.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from enum import Enum
from functools import wraps
from typing import Any, Callable, Optional

from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.hitl.approval_types import ApprovalLevel

logger = logging.getLogger(__name__)


class MCPTool:
    """
    Decorator to mark a method as an MCP tool.
    Usage:
        @MCPTool("family_get_profile", "Obtiene el perfil", ApprovalLevel.AUTO)
        async def get_profile(self, family_id: str) -> dict: ...
    """

    def __init__(
        self,
        name: str,
        description: str,
        approval: ApprovalLevel = ApprovalLevel.AUTO,
        approver_roles: Optional[list[str]] = None,
    ) -> None:
        self.name = name
        self.description = description
        self.approval = approval
        self.approver_roles = approver_roles or []

    def __call__(self, func: Callable) -> Callable:
        func._mcp_tool = True  # type: ignore[attr-defined]
        func._tool_name = self.name  # type: ignore[attr-defined]
        func._tool_description = self.description  # type: ignore[attr-defined]
        func._tool_approval = self.approval  # type: ignore[attr-defined]
        func._tool_approver_roles = self.approver_roles  # type: ignore[attr-defined]
        return func


class BaseAgent(ABC):
    """
    Abstract base class for all MCP agents.
    Subclasses must implement agent_name, description, and _register_tools().
    """

    agent_name: str
    description: str

    def __init__(self) -> None:
        self.approval_engine = ApprovalEngine()
        self._mcp: Any = None

    def register_with_mcp(self, mcp: Any) -> int:
        """
        Scan for @MCPTool-decorated methods and register them with the MCP server.
        Returns the number of tools registered.
        """
        self._mcp = mcp
        count = 0
        for attr_name in dir(self):
            if attr_name.startswith("_"):
                continue
            attr = getattr(self, attr_name, None)
            if attr is None:
                continue
            if not callable(attr):
                continue
            if not getattr(attr, "_mcp_tool", False):
                continue

            tool_name: str = attr._tool_name
            tool_desc: str = attr._tool_description
            approval: ApprovalLevel = attr._tool_approval

            wrapper = self._wrap_with_hitl(attr, approval)

            mcp.tool(name=tool_name, description=tool_desc)(wrapper)
            count += 1
            logger.debug(
                "[%s] Registered tool: %s (approval=%s)",
                self.agent_name, tool_name, approval.value,
            )

        logger.info("[%s] Registered %d tools", self.agent_name, count)
        return count

    def _wrap_with_hitl(
        self,
        func: Callable,
        approval: ApprovalLevel,
    ) -> Callable:
        """
        Wraps a tool method to inject HITL metadata into the response.
        Does NOT block execution - that logic lives in each tool.
        This wrapper adds metadata so the caller knows the approval level.
        """

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            result = await func(*args, **kwargs)
            if isinstance(result, dict):
                result["_approval_level"] = approval.value
                result["_agent"] = self.agent_name
            return result

        return wrapper

    @abstractmethod
    def _register_tools(self) -> None:
        """Legacy hook for manual tool registration. Not used with @MCPTool."""
        ...
