"""Tests for the Member 360 MCP agent boundary."""

from __future__ import annotations

import pytest

from club_mcp.agents.member_360_agent import Member360Agent
from club_mcp.db.repositories.member_360_repo import Member360Repository


class ToolRegistry:
    def __init__(self) -> None:
        self.tools: dict[str, object] = {}

    def tool(self, *, name: str, description: str):
        def register(function):
            self.tools[name] = function
            return function

        return register


@pytest.mark.asyncio
async def test_default_repository_does_not_expose_demo_members():
    agent = Member360Agent()

    profile = await agent.get_member_360_profile("m-001")
    search = await agent.search_members_360()

    assert profile["status"] == "not_found"
    assert search["members"] == []
    assert search["total"] == 0


@pytest.mark.asyncio
async def test_demo_data_requires_explicit_opt_in():
    agent = Member360Agent(
        repo=Member360Repository(seed_demo_data=True)
    )

    profile = await agent.get_member_360_profile("m-001")

    assert "member" in profile
    assert profile["member"]["member_id"] == "m-001"


@pytest.mark.parametrize(
    "tool_name",
    [
        "get_member_health_score",
        "get_member_journey",
        "get_member_churn_prediction",
        "get_member_ltv_analysis",
        "get_member_activity_summary",
        "get_member_social_profile",
        "generate_member_engagement_proposals",
        "get_member_risk_assessment",
    ],
)
@pytest.mark.asyncio
async def test_member_tools_reject_unknown_ids(tool_name: str):
    agent = Member360Agent()
    tool = getattr(agent, tool_name)

    result = await tool("unknown-member")

    assert result["status"] == "not_found"


def test_agent_registers_all_ten_tools_with_base_agent_contract():
    agent = Member360Agent()
    registry = ToolRegistry()

    registered_count = agent.register_with_mcp(registry)

    assert agent.agent_name == "member_360"
    assert registered_count == 10
    assert len(registry.tools) == 10


@pytest.mark.asyncio
async def test_search_rejects_invalid_pagination():
    agent = Member360Agent()

    invalid_page = await agent.search_members_360(page=0)
    oversized_page = await agent.search_members_360(page_size=101)

    assert invalid_page["status"] == "error"
    assert oversized_page["status"] == "error"
