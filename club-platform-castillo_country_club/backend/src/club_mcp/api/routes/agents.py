"""Agent tool proxy route: authenticated MCP tool calls via REST."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from club_mcp.auth.jwt_service import TokenPayload
from club_mcp.auth.middleware import get_current_user
from club_mcp.auth.rbac import TOOL_PERMISSION_MAP, check_permission
from club_mcp.auth.jwt_service import TokenPayload

import inspect

logger = logging.getLogger(__name__)

router = APIRouter()


class ToolCallRequest(BaseModel):
    params: dict[str, Any] = {}


@router.post("/{agent_name}/{tool_name}")
async def call_agent_tool(
    agent_name: str,
    tool_name: str,
    body: ToolCallRequest,
    request: Request,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Call an MCP tool on an agent with RBAC enforcement."""

    # 1. Permission check
    required_permission = TOOL_PERMISSION_MAP.get(tool_name)
    if required_permission and not check_permission(
        current_user.role, required_permission
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Permiso insuficiente para tool '{tool_name}'. "
                f"Se requiere: {required_permission.value}"
            ),
        )

    # 2. Find agent
    agents = request.app.state.agents
    agent = agents.get(agent_name)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agente '{agent_name}' no encontrado",
        )

    # 3. Find tool method on agent
    tool_method = None
    for attr_name in dir(agent):
        if attr_name.startswith("_"):
            continue
        attr = getattr(agent, attr_name, None)
        if (
            attr
            and callable(attr)
            and getattr(attr, "_tool_name", None) == tool_name
        ):
            tool_method = attr
            break

    if not tool_method:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Tool '{tool_name}' no encontrada en agente '{agent_name}'"
            ),
        )

    # 4. Inject authenticated user and call
    params = dict(body.params)

    # Only inject requested_by if the tool method accepts it
    sig = inspect.signature(tool_method)
    if "requested_by" in sig.parameters:
        params["requested_by"] = current_user.sub

    try:
        result = await tool_method(**params)
        return result
    except TypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parámetros inválidos para '{tool_name}': {exc}",
        )
    except Exception as exc:
        logger.exception("Error calling tool %s/%s", agent_name, tool_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ejecutando '{tool_name}': {exc}",
        )


