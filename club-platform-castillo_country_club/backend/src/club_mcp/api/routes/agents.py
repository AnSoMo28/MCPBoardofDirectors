"""Agent tool proxy route — registry-driven dispatch with RBAC + compat.

P2-C3h B0:
  * Dispatch resolves (agent_key, tool_key) through AgentRegistry:
    canonical names, legacy compat aliases (Deprecation + Sunset
    headers, observable burn-down), fuzzy suggestions on 404.
  * RBAC runs on the CANONICAL (agent, tool) AFTER resolution, using
    registry-derived policy (auth/rbac.permission_for) — legacy keys
    cannot dodge the gate.
  * Identity fields (requested_by / approved_by / rejected_by) are
    stripped from the client payload and injected from the JWT —
    approval identity can no longer be spoofed.
  * Responses are stamped with _approval_level/_agent so the REST
    envelope matches MCP's (REST bypasses base.py's wrapper).
  * GET /api/agents -> full catalog (discovery & codegen-ready).
"""
from __future__ import annotations

import inspect
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel

from club_mcp.auth.jwt_service import TokenPayload
from club_mcp.auth.middleware import get_current_user
from club_mcp.auth.rbac import check_permission, permission_for
from club_mcp.registry import AgentRegistry, ResolutionError

logger = logging.getLogger(__name__)

router = APIRouter()

IDENTITY_FIELDS = ("requested_by", "approved_by", "rejected_by")
COMPAT_SUNSET_DAYS = 90


class ToolCallRequest(BaseModel):
    params: dict[str, Any] = {}


def _registry(request: Request) -> AgentRegistry:
    registry = getattr(request.app.state, "registry", None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent registry no inicializado (composition root ausente)",
        )
    return registry


@router.get("")
def catalog(request: Request) -> dict:
    """Full agent/tool catalog — public metadata for discovery & codegen."""
    return _registry(request).catalog()


@router.get("/{agent_name}")
def agent_detail(agent_name: str, request: Request) -> dict:
    registry = _registry(request)
    payload = registry.agent_catalog(agent_name)
    if payload is None:
        suggestions = registry.suggest_agent(agent_name)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Agente '{agent_name}' no encontrado. "
                + (
                    "Sugerencias: " + ", ".join(suggestions)
                    if suggestions
                    else "Catálogo: GET /api/agents"
                )
            ),
        )
    return payload


@router.post("/{agent_key}/{tool_key}")
async def call_agent_tool(
    agent_key: str,
    tool_key: str,
    body: ToolCallRequest,
    request: Request,
    response: Response,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Call an MCP tool on an agent with registry resolution + RBAC."""
    registry = _registry(request)

    try:
        resolved = registry.resolve(agent_key, tool_key)
    except ResolutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{agent_key}.{tool_key}' no registrada. {exc.suggestion_text}",
        )

    spec = resolved.spec

    required = permission_for(spec.agent, spec.name, spec.approval)
    if required is not None and not check_permission(current_user.role, required):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Permiso insuficiente para '{spec.agent}.{spec.name}'. "
                f"Se requiere: {required.value}"
            ),
        )

    method = getattr(resolved.agent, spec.method_name)

    # B3 adapters: legacy param names → canonical before binding.
    params = resolved.map_params(
        {k: v for k, v in body.params.items() if k not in IDENTITY_FIELDS}
    )
    sig = inspect.signature(method)
    for identity in IDENTITY_FIELDS:
        if identity in sig.parameters:
            params[identity] = current_user.sub

    try:
        result = await method(**params)
    except TypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parámetros inválidos para '{spec.name}': {exc}",
        )
    except Exception as exc:
        logger.exception("Error calling tool %s/%s", spec.agent, spec.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ejecutando '{spec.name}': {exc}",
        )

    # B3 adapters: canonical response → legacy callsite shape.
    result = resolved.adapt_result(result)

    if isinstance(result, dict):
        result.setdefault("_approval_level", spec.approval)
        result.setdefault("_agent", spec.agent)

    if resolved.via_compat:
        sunset = (
            datetime.now(tz=timezone.utc) + timedelta(days=COMPAT_SUNSET_DAYS)
        ).strftime("%a, %d %b %Y %H:%M:%S GMT")
        response.headers["Deprecation"] = "true"
        response.headers["Sunset"] = sunset
        response.headers["X-Compat-Key"] = f"{agent_key}.{tool_key}"
        logger.warning(
            "[compat] %s.%s → %s.%s (deprecado — migrar callsite)",
            agent_key, tool_key, spec.agent, spec.name,
        )

    return result
