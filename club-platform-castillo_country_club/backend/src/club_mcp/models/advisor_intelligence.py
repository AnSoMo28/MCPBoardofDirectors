"""
Advisor Intelligence — Response models.
Defines the structured output from each AI-powered advisor tool.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class InsightNarrativeResult(BaseModel):
    """Response from generate_insight_narrative."""
    insight_id: str
    root_cause: str
    benchmark_comparison: str
    recommendation: str
    estimated_impact: str
    full_narrative: str
    adjusted_confidence: int = Field(ge=0, le=100)


class ActionPlanItem(BaseModel):
    """Single action in an AI-generated plan."""
    title: str
    reasoning: str
    urgency: str  # "today" | "this_week" | "this_month"
    server: str
    tool: str
    params: dict[str, Any] = Field(default_factory=dict)
    approval_level: str = "auto"
    source_insight_id: str
    confidence: int = Field(ge=0, le=100)


class ActionPlanResult(BaseModel):
    """Response from generate_action_plan."""
    summary: str
    items: list[ActionPlanItem]
    total_estimated_impact: str


class ScenarioProjection(BaseModel):
    """Single scenario in a simulation."""
    name: str  # "optimistic" | "base" | "pessimistic"
    description: str
    projected_metrics: dict[str, Any] = Field(default_factory=dict)
    probability: int = Field(ge=0, le=100)


class ScenarioSimulationResult(BaseModel):
    """Response from simulate_scenario."""
    scenarios: list[ScenarioProjection]
    risk_assessment: str
    recommended_scenario: str


class BoardBriefResult(BaseModel):
    """Response from generate_board_brief."""
    brief_md: str
    key_points: list[str]
    talking_points: list[str]
    q_and_a: list[dict[str, str]]


class AdvisorAnswerResult(BaseModel):
    """Response from ask_advisor."""
    answer: str
    evidence: list[str]
    related_insights: list[str]
    suggested_action: Optional[dict[str, Any]] = None
