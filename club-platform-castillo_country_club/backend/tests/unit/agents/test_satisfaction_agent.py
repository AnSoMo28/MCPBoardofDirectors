"""Tests for SatisfactionAgent — all 6 tools."""

from __future__ import annotations

import pytest
import pytest_asyncio

from club_mcp.agents.satisfaction_agent import SatisfactionAgent
from club_mcp.db.repositories.satisfaction_repo import SatisfactionRepository
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.models.satisfaction import (
    SatisfactionCategory,
    SatisfactionSurvey,
    SurveyQuestion,
)


# ═══════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════


@pytest.fixture
def satisfaction_repo() -> SatisfactionRepository:
    return SatisfactionRepository()


@pytest.fixture
def satisfaction_agent(
    satisfaction_repo: SatisfactionRepository,
    approval_engine: ApprovalEngine,
) -> SatisfactionAgent:
    agent = SatisfactionAgent(repo=satisfaction_repo)
    agent.approval_engine = approval_engine
    return agent


def _make_ratings(value: int = 4) -> dict[str, int]:
    """Create uniform ratings for all 10 categories."""
    return {cat.value: value for cat in SatisfactionCategory}


async def _seed_survey(
    repo: SatisfactionRepository,
    event_id: str = "evt_001",
    family_id: str = "fam_001",
    score: float = 4.0,
    sentiment: str = "positive",
) -> SatisfactionSurvey:
    """Helper: seed a survey with given parameters."""
    questions = [
        SurveyQuestion(
            category=cat,
            question_text=f"Pregunta {cat.value}",
            rating=int(score),
            weight=1.0,
        )
        for cat in SatisfactionCategory
    ]
    survey = SatisfactionSurvey(
        event_id=event_id,
        family_id=family_id,
        questions=questions,
        overall_score=score,
        sentiment=sentiment,
        sentiment_score=0.5 if sentiment == "positive" else -0.5,
    )
    return await repo.save_survey(survey)


# ═══════════════════════════════════════════════════
# TESTS: get_satisfaction_questions
# ═══════════════════════════════════════════════════


class TestGetSatisfactionQuestions:
    @pytest.mark.asyncio
    async def test_returns_10_questions(self, satisfaction_agent):
        result = await satisfaction_agent.get_satisfaction_questions()
        assert result["status"] == "success"
        assert len(result["questions"]) == 10

    @pytest.mark.asyncio
    async def test_questions_have_all_categories(self, satisfaction_agent):
        result = await satisfaction_agent.get_satisfaction_questions()
        categories = {q["category"] for q in result["questions"]}
        expected = {c.value for c in SatisfactionCategory}
        assert categories == expected

    @pytest.mark.asyncio
    async def test_questions_have_order(self, satisfaction_agent):
        result = await satisfaction_agent.get_satisfaction_questions()
        orders = [q["order"] for q in result["questions"]]
        assert orders == list(range(1, 11))


# ═══════════════════════════════════════════════════
# TESTS: submit_satisfaction_survey
# ═══════════════════════════════════════════════════


class TestSubmitSatisfactionSurvey:
    @pytest.mark.asyncio
    async def test_successful_submission(self, satisfaction_agent):
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=_make_ratings(4),
            comment="Muy buen evento",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "success"
        assert "4.0" in result["message"]

    @pytest.mark.asyncio
    async def test_missing_event_id(self, satisfaction_agent):
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="",
            family_id="fam_001",
            ratings=_make_ratings(4),
        )
        assert result["status"] == "error"
        assert "event_id" in result["message"]

    @pytest.mark.asyncio
    async def test_wrong_number_of_ratings(self, satisfaction_agent):
        ratings = {"venue": 4, "food": 5}
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=ratings,
        )
        assert result["status"] == "error"
        assert "10" in result["message"]

    @pytest.mark.asyncio
    async def test_missing_category(self, satisfaction_agent):
        ratings = _make_ratings(4)
        del ratings["venue"]
        ratings["extra"] = 3
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=ratings,
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_score_calculation_all_fives(self, satisfaction_agent):
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=_make_ratings(5),
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "success"
        survey = result["survey"]
        assert survey["overall_score"] == 5.0
        assert survey["sentiment"] == "positive"

    @pytest.mark.asyncio
    async def test_score_calculation_all_ones(self, satisfaction_agent):
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=_make_ratings(1),
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "success"
        survey = result["survey"]
        assert survey["overall_score"] == 1.0
        assert survey["sentiment"] == "negative"

    @pytest.mark.asyncio
    async def test_invalid_rating_value(self, satisfaction_agent):
        ratings = _make_ratings(4)
        ratings["venue"] = 7
        result = await satisfaction_agent.submit_satisfaction_survey(
            event_id="evt_001",
            family_id="fam_001",
            ratings=ratings,
        )
        assert result["status"] == "error"
        assert "1-5" in result["message"]


# ═══════════════════════════════════════════════════
# TESTS: get_survey_for_event
# ═══════════════════════════════════════════════════


class TestGetSurveyForEvent:
    @pytest.mark.asyncio
    async def test_returns_surveys(self, satisfaction_agent, satisfaction_repo):
        await _seed_survey(satisfaction_repo)
        result = await satisfaction_agent.get_survey_for_event(
            event_id="evt_001"
        )
        assert result["status"] == "success"
        assert result["total"] >= 1

    @pytest.mark.asyncio
    async def test_no_surveys(self, satisfaction_agent):
        result = await satisfaction_agent.get_survey_for_event(
            event_id="nonexistent"
        )
        assert result["status"] == "success"
        assert result["total"] == 0

    @pytest.mark.asyncio
    async def test_missing_event_id(self, satisfaction_agent):
        result = await satisfaction_agent.get_survey_for_event(event_id="")
        assert result["status"] == "error"


# ═══════════════════════════════════════════════════
# TESTS: analyze_event_satisfaction
# ═══════════════════════════════════════════════════


class TestAnalyzeEventSatisfaction:
    @pytest.mark.asyncio
    async def test_generates_report(
        self, satisfaction_agent, satisfaction_repo
    ):
        await _seed_survey(satisfaction_repo, event_id="evt_002", family_id="fam_001")
        await _seed_survey(satisfaction_repo, event_id="evt_002", family_id="fam_002")

        result = await satisfaction_agent.analyze_event_satisfaction(
            event_id="evt_002",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "success"
        report = result["report"]
        assert report["total_responses"] == 2
        assert report["overall_avg"] == 4.0

    @pytest.mark.asyncio
    async def test_no_surveys(self, satisfaction_agent):
        result = await satisfaction_agent.analyze_event_satisfaction(
            event_id="nonexistent"
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_sentiment_distribution(
        self, satisfaction_agent, satisfaction_repo
    ):
        await _seed_survey(
            satisfaction_repo,
            event_id="evt_003",
            family_id="fam_001",
            score=4.0,
            sentiment="positive",
        )
        await _seed_survey(
            satisfaction_repo,
            event_id="evt_003",
            family_id="fam_002",
            score=2.0,
            sentiment="negative",
        )

        result = await satisfaction_agent.analyze_event_satisfaction(
            event_id="evt_003"
        )
        report = result["report"]
        assert report["sentiment_distribution"]["positive"] == 1
        assert report["sentiment_distribution"]["negative"] == 1


# ═══════════════════════════════════════════════════
# TESTS: get_satisfaction_trends
# ═══════════════════════════════════════════════════


class TestGetSatisfactionTrends:
    @pytest.mark.asyncio
    async def test_empty_trends(self, satisfaction_agent):
        result = await satisfaction_agent.get_satisfaction_trends()
        assert result["status"] == "success"
        assert result["trends"]["overall_trend"] == "insufficient_data"
        assert result["trends"]["total_surveys"] == 0

    @pytest.mark.asyncio
    async def test_returns_trends(
        self, satisfaction_agent, satisfaction_repo
    ):
        await _seed_survey(satisfaction_repo)
        result = await satisfaction_agent.get_satisfaction_trends()
        assert result["status"] == "success"
        assert result["trends"]["total_surveys"] >= 1


# ═══════════════════════════════════════════════════
# TESTS: generate_satisfaction_report
# ═══════════════════════════════════════════════════


class TestGenerateSatisfactionReport:
    @pytest.mark.asyncio
    async def test_generates_full_report(
        self, satisfaction_agent, satisfaction_repo
    ):
        await _seed_survey(satisfaction_repo, event_id="evt_004")
        result = await satisfaction_agent.generate_satisfaction_report(
            event_id="evt_004",
            requested_by="admin@castillo.cr",
        )
        assert result["status"] == "success"
        assert "report" in result
        assert "trends_context" in result["report"]

    @pytest.mark.asyncio
    async def test_no_surveys(self, satisfaction_agent):
        result = await satisfaction_agent.generate_satisfaction_report(
            event_id="nonexistent"
        )
        assert result["status"] == "error"

    @pytest.mark.asyncio
    async def test_missing_event_id(self, satisfaction_agent):
        result = await satisfaction_agent.generate_satisfaction_report(
            event_id=""
        )
        assert result["status"] == "error"
