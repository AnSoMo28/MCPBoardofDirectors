"""FastAPI application factory for the Castillo Country Club API bridge.

P2-C3h B0 — self-wiring composition:
  * OLD: module-level app = create_api_app() built the app with ZERO
    agents -> every /api/agents/* call 404'd and /api/chat 503'd. The
    REST bridge and the MCP server were disjoint surfaces.
  * NEW: when agents are not injected (tests), the app bootstraps the
    full runtime via club_mcp.bootstrap — the SAME composition root the
    MCP server uses. One wiring, two transports.
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from club_mcp.agents.base import BaseAgent
from club_mcp.api.routes import agents, auth, chat, health
from club_mcp.api.routes.documents import router as documents_router
from club_mcp.registry import AgentRegistry

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the API."""
    engine = getattr(app.state, "approval_engine", None)
    if engine is not None and hasattr(engine, "start_expiry_task"):
        await engine.start_expiry_task(interval_seconds=300)
        logger.info("[startup] HITL expiry task started (interval=300s)")

    registry = getattr(app.state, "registry", None)
    if registry is not None:
        logger.info(
            "[startup] API ready: %d agents · %d tools · compat: %s",
            app.state.agents_count,
            app.state.tools_count,
            dict(registry.compat_hits) or "sin hits",
        )
    else:
        logger.info(
            "[startup] API ready: %d agents · %d tools",
            app.state.agents_count,
            app.state.tools_count,
        )

    yield
    logger.info("[shutdown] API shutting down")


def create_api_app(
    agents_list: list[BaseAgent] | None = None,
    mcp_server: Any = None,
    claude_service: Any = None,
) -> FastAPI:
    """Create and configure the FastAPI application.

    With no arguments, the full runtime is bootstrapped from
    club_mcp.bootstrap (F-3 fix). Tests may inject agents directly.
    """
    app = FastAPI(
        title="Castillo Country Club API",
        description="API bridge para el MCP Server del Castillo Country Club",
        version="0.2.0",
        lifespan=lifespan,
    )

    if agents_list is None:
        from club_mcp.bootstrap import get_runtime

        runtime = get_runtime()
        agents_list = runtime.agents
        mcp_server = mcp_server or runtime.mcp
        claude_service = claude_service or runtime.claude_service
        logger.info("API app auto-cableada desde bootstrap (composition root)")

    registry = AgentRegistry(agents_list)

    app.state.agents = {a.agent_name: a for a in agents_list}
    app.state.registry = registry
    app.state.mcp_server = mcp_server
    app.state.claude_service = claude_service
    app.state.tools_count = registry.total_tools
    app.state.agents_count = len(agents_list)
    app.state.approval_engine = (
        getattr(agents_list[0], "approval_engine", None) if agents_list else None
    )

    origins_env = os.environ.get(
        "CLUB_API_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    )
    origins = [o.strip() for o in origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
    app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(documents_router, prefix="/api/documents", tags=["documents"])

    logger.info(
        "API app created: %d agents, %d tools",
        app.state.agents_count,
        app.state.tools_count,
    )
    return app


app = create_api_app()
