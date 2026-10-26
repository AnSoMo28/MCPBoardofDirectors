"""FastAPI application factory for the Castillo Country Club API bridge."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from club_mcp.agents.base import BaseAgent
from club_mcp.api.routes import agents, auth, chat, health
from club_mcp.api.routes.documents import router as documents_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the API."""
    # ── Startup ──

    # HITL: start approval expiry background task
    for agent in app.state.agents.values():
        engine = getattr(agent, "approval_engine", None)
        if engine is not None and hasattr(engine, "start_expiry_task"):
            await engine.start_expiry_task(interval_seconds=300)
            logger.info(
                "[startup] HITL expiry task started "
                "(interval=300s, via agent=%s)",
                agent.agent_name,
            )
            break  # solo necesitamos un engine

    logger.info(
        "[startup] API ready: %d agents, %d tools",
        app.state.agents_count,
        app.state.tools_count,
    )

    yield

    # ── Shutdown ──
    logger.info("[shutdown] API shutting down")


def create_api_app(
    agents_list: list[BaseAgent] | None = None,
    mcp_server: Any = None,
    claude_service: Any = None,
) -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="Castillo Country Club API",
        description="API bridge para el MCP Server del Castillo Country Club",
        version="0.1.0",
        lifespan=lifespan,                    # ← FIX: wire lifespan
    )

    # ── CORS for React frontend ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Store references in app state ──
    resolved_agents = agents_list or []
    app.state.agents = {a.agent_name: a for a in resolved_agents}
    app.state.mcp_server = mcp_server
    app.state.claude_service = claude_service

    # Count tools dynamically
    tools_count = 0
    for agent in resolved_agents:
        for attr_name in dir(agent):
            if attr_name.startswith("_"):
                continue
            attr = getattr(agent, attr_name, None)
            if attr and callable(attr) and getattr(attr, "_mcp_tool", False):
                tools_count += 1
    app.state.tools_count = tools_count
    app.state.agents_count = len(resolved_agents)

    logger.info(
        "API app created: %d agents, %d tools",
        app.state.agents_count,
        app.state.tools_count,
    )

    # ── Include routers ──
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(agents.router, prefix="/api/agents", tags=["agents"])
    app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(documents_router, prefix="/api/documents", tags=["documents"])

    return app


app = create_api_app()
