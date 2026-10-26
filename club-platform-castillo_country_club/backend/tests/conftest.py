"""
Shared test fixtures for Castillo Country Club.
"""

from __future__ import annotations
import pytest_asyncio
import asyncio
from datetime import date, timedelta
from typing import AsyncGenerator

import pytest

from club_mcp.agents.family_profile import FamilyProfileAgent
from club_mcp.db.repositories.family_repo import FamilyRepository
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.models.family import FamilyCreate, MembershipTier
from club_mcp.models.member import MemberCreate, MemberRole
from club_mcp.db.repositories.event_repo import EventRepository


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def repo() -> FamilyRepository:
    return FamilyRepository()


@pytest.fixture
def approval_engine() -> ApprovalEngine:
    return ApprovalEngine()


@pytest.fixture
def family_agent(repo: FamilyRepository, approval_engine: ApprovalEngine) -> FamilyProfileAgent:
    agent = FamilyProfileAgent(repo=repo)
    agent.approval_engine = approval_engine
    return agent


@pytest_asyncio.fixture
async def sample_family(repo: FamilyRepository):
    """Creates and returns a sample family in the repo."""
    data = FamilyCreate(
        name="Familia Garcia",
        tier=MembershipTier.PREMIUM,
        email="garcia@example.com",
        phone="+50688887777",
        address="Condominio Castillo, Casa 42",
        members=[
            MemberCreate(
                name="Carlos Garcia",
                date_of_birth=date(1982, 5, 15),
                role=MemberRole.PRIMARY,
                email="carlos@example.com",
            ),
            MemberCreate(
                name="Maria Lopez",
                date_of_birth=date(1985, 8, 22),
                role=MemberRole.SPOUSE,
            ),
            MemberCreate(
                name="Sofia Garcia",
                date_of_birth=date(2017, 3, 10),
                role=MemberRole.CHILD,
            ),
            MemberCreate(
                name="Diego Garcia",
                date_of_birth=date(2010, 11, 5),
                role=MemberRole.CHILD,
            ),
        ],
    )
    return await repo.create_family(data)


@pytest_asyncio.fixture
async def second_family(repo: FamilyRepository):
    """Creates a second family for search/social tests."""
    data = FamilyCreate(
        name="Familia Rodriguez",
        tier=MembershipTier.BASIC,
        email="rodriguez@example.com",
        phone="+50688886666",
        members=[
            MemberCreate(
                name="Andres Rodriguez",
                date_of_birth=date(1970, 1, 20),
                role=MemberRole.PRIMARY,
            ),
            MemberCreate(
                name="Laura Mora",
                date_of_birth=date(1973, 6, 14),
                role=MemberRole.SPOUSE,
            ),
            MemberCreate(
                name="Valentina Rodriguez",
                date_of_birth=date(2000, 9, 3),
                role=MemberRole.CHILD,
            ),
        ],
    )
    return await repo.create_family(data)

@pytest.fixture
def event_repo() -> EventRepository:
    return EventRepository()
