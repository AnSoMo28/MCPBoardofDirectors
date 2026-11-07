"""MCP Server entry point for Castillo Country Club.

P2-C3h B0: composition lives in club_mcp.bootstrap — this module is now
a thin transport adapter. Sealed here (h5-wiring): F-1 (claude_service
usado antes de asignarse), F-2 (FamilyProfileAgent posicional), F-2b
(agent.name inexistente), F-8 (member_360/ml_intelligence sin
instanciar), W-2b (CommunicationAgent doble).
"""
from __future__ import annotations

import logging
import sys

from club_mcp.bootstrap import get_runtime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def create_mcp_server():
    """Create the FastMCP server from the shared composition root."""
    return get_runtime().mcp


def main() -> None:
    mcp = create_mcp_server()
    mcp.run()


if __name__ == "__main__":
    main()
