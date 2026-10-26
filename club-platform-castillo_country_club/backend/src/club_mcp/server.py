"""
MCP Server entry point for Castillo Country Club.
Registers all agents and their tools.
"""

from __future__ import annotations

import logging
import sys

from fastmcp import FastMCP

from club_mcp.agents.base import BaseAgent
from club_mcp.agents.family_profile import FamilyProfileAgent
from club_mcp.agents.event_orchestrator import EventOrchestratorAgent          # ← NUEVO
from club_mcp.db.repositories.family_repo import FamilyRepository
from club_mcp.db.repositories.event_repo import EventRepository               # ← NUEVO
from club_mcp.hitl.approval_engine import ApprovalEngine
from club_mcp.hitl.notifier import HITLNotifier                               # ← NUEVO
from club_mcp.config.club_registry import get_club_config
from club_mcp.agents.age_group import AgeGroupAgent
from club_mcp.db.repositories.age_group_repo import AgeGroupRepository                     # ← NUEVO
from club_mcp.agents.finance import FinanceAgent
from club_mcp.db.repositories.finance_repo import FinanceRepository
from club_mcp.agents.wellness import WellnessAgent
from club_mcp.db.repositories.wellness_repo import WellnessRepository
from club_mcp.agents.compliance import ComplianceAgent
from club_mcp.db.repositories.compliance_repo import ComplianceRepository
from club_mcp.agents.sports_recreation_agent import SportsRecreationAgent
from club_mcp.db.repositories.sports_recreation_repo import SportsRecreationRepository
from club_mcp.agents.cultural_social_agent import CulturalSocialAgent
from club_mcp.db.repositories.cultural_social_repo import CulturalSocialRepository
from club_mcp.agents.communication_agent import CommunicationAgent
from club_mcp.db.repositories.communication_repo import CommunicationRepository
from club_mcp.agents.facility_management_agent import FacilityManagementAgent
from club_mcp.db.repositories.facility_management_repo import (
    FacilityManagementRepository,
)
# Imports nuevos:
from club_mcp.agents.member_engagement_agent import MemberEngagementAgent
from club_mcp.db.repositories.member_engagement_repo import (
    MemberEngagementRepository,
)
from club_mcp.agents.guest_management_agent import GuestManagementAgent
from club_mcp.db.repositories.guest_management_repo import (
    GuestManagementRepository,
)
from club_mcp.agents.proactive_recommendation_agent import ProactiveRecommendationAgent
from club_mcp.db.repositories.proactive_recommendation_repo import (
    ProactiveRecommendationRepository,
)
from club_mcp.agents.document_intelligence_agent import DocumentIntelligenceAgent
from club_mcp.db.repositories.document_intelligence_repo import (
    DocumentIntelligenceRepository,
)
from club_mcp.agents.executive_dashboard_agent import ExecutiveDashboardAgent
from club_mcp.db.repositories.executive_dashboard_repo import (
    ExecutiveDashboardRepository,
)
from club_mcp.agents.satisfaction_agent import SatisfactionAgent
from club_mcp.db.repositories.satisfaction_repo import SatisfactionRepository
from club_mcp.agents.advisor_intelligence import AdvisorIntelligenceAgent
from club_mcp.ai.claude_service import ClaudeService



logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def create_mcp_server() -> FastMCP:
    """Create and configure the MCP server with all agents."""

    mcp = FastMCP(
        name="Castillo Country Club MCP",
        version="0.1.0",
    )

    # ── Shared infrastructure ──────────────────────────────
    approval_engine = ApprovalEngine()
    notifier = HITLNotifier()                     # ← NUEVO: stub de notificaciones
    family_repo = FamilyRepository()
    event_repo = EventRepository()                 # ← NUEVO: repo de eventos
    age_group_repo = AgeGroupRepository()
    finance_repo = FinanceRepository()
    wellness_repo = WellnessRepository()
    compliance_repo = ComplianceRepository()
    sports_recreation_repo = SportsRecreationRepository()
    cultural_social_repo = CulturalSocialRepository()
    communication_repo = CommunicationRepository()
    facility_management_repo = FacilityManagementRepository()
    member_engagement_repo = MemberEngagementRepository()   
    guest_management_repo = GuestManagementRepository()
    proactive_recommendation_repo = ProactiveRecommendationRepository()
    document_intelligence_repo = DocumentIntelligenceRepository(claude_service=claude_service)
    executive_dashboard_repo = ExecutiveDashboardRepository()
    satisfaction_repo = SatisfactionRepository()
    claude_service = ClaudeService()


    # ── Club config (multi-tenant: cambiar para otro club) ─
    club_config = get_club_config("castillo_country_club")

    # ── Instantiate agents with dependencies ───────────────
    agents: list[BaseAgent] = [
        FamilyProfileAgent(family_repo, approval_engine, notifier),
        EventOrchestratorAgent(event_repo, approval_engine, notifier, club_config),
        AgeGroupAgent(age_group_repo, approval_engine, notifier),
        FinanceAgent(
            finance_repo,
            approval_engine,
            notifier,
            family_repo=family_repo,
        ),
        WellnessAgent(wellness_repo, approval_engine, notifier),
        ComplianceAgent(compliance_repo, approval_engine, notifier),
        SportsRecreationAgent(sports_recreation_repo, approval_engine, notifier),                         
        CulturalSocialAgent(cultural_social_repo, approval_engine, notifier),
        CommunicationAgent(communication_repo, approval_engine, notifier),
        FacilityManagementAgent(facility_management_repo, approval_engine, notifier),
        MemberEngagementAgent(member_engagement_repo, approval_engine, notifier),        
        GuestManagementAgent(guest_management_repo, approval_engine, notifier),
        ProactiveRecommendationAgent(proactive_recommendation_repo, approval_engine, notifier),
        DocumentIntelligenceAgent(document_intelligence_repo, approval_engine, notifier),
        ExecutiveDashboardAgent(executive_dashboard_repo, approval_engine, notifier),
        SatisfactionAgent(satisfaction_repo, approval_engine, notifier),
        AdvisorIntelligenceAgent(claude_service, approval_engine, notifier),
        CommunicationAgent(communication_repo, approval_engine, notifier, rag_service=(document_intelligence_repo._rag_service if hasattr(document_intelligence_repo, "_rag_service") else None)),
    ]

    # ── Register all agents with MCP ───────────────────────
    total_tools = 0
    for agent in agents:
        count = agent.register_with_mcp(mcp)
        total_tools += count
        logger.info("Agent registered: %s (%d tools)", agent.name, count)

    logger.info(
        "MCP Server ready: Castillo Country Club 🏰 | %d agents | %d tools",
        len(agents),
        total_tools,
    )

    return mcp



def main() -> None:
    mcp = create_mcp_server()
    mcp.run()


if __name__ == "__main__":
    main()
