"""Role-Based Access Control: permissions, role matrix, tool policy.

P2-C3h B0 — policy derived from the real agent registry:

* The OLD TOOL_PERMISSION_MAP (~50 entries) was ~75% phantom tool names
  that never existed (family_create, event_list, finance_get_overview...)
  while ~146 REAL tools had NO gate — any authenticated role could call
  the financial AI analysis.
* NEW: permission_for(agent, tool, approval) derives the required
  permission from a per-agent (read, write) POLICY plus explicit
  OVERRIDES. Write-ness = approval level in WRITE_LEVELS.
* Coverage invariant: every registered tool MUST map to a permission —
  scripts/smoke_b0.py asserts 196/196.
* Routes re-check on the CANONICAL pair AFTER alias resolution.

Role matrix changes (documented & reviewable):
* admin: + domains the admin console actually drives, + APPROVE_REQUESTS
  (previously granted to NO role — approvals were 403 for everyone),
  + VIEW_ANOMALIES.
* staff: + VIEW_WELLNESS (class scheduling).
* socio: + VIEW_WELLNESS, + VIEW_FACILITIES (mi-club reads).
"""
from __future__ import annotations

from enum import Enum
from typing import Optional


class Permission(str, Enum):
    # ── Family ──
    VIEW_FAMILY_PROFILE = "view_family_profile"
    EDIT_FAMILY_PROFILE = "edit_family_profile"

    # ── Events ──
    VIEW_EVENTS = "view_events"
    CREATE_EVENTS = "create_events"
    MANAGE_EVENTS = "manage_events"

    # ── Financial ──
    VIEW_FINANCIAL = "view_financial"
    MANAGE_FINANCIAL = "manage_financial"

    # ── Wellness ──
    VIEW_WELLNESS = "view_wellness"
    MANAGE_WELLNESS = "manage_wellness"

    # ── Compliance ──
    VIEW_COMPLIANCE = "view_compliance"
    MANAGE_COMPLIANCE = "manage_compliance"

    # ── Sports ──
    VIEW_SPORTS = "view_sports"
    MANAGE_SPORTS = "manage_sports"

    # ── Cultural ──
    VIEW_CULTURAL = "view_cultural"
    MANAGE_CULTURAL = "manage_cultural"

    # ── Communications ──
    VIEW_COMMUNICATIONS = "view_communications"
    MANAGE_COMMUNICATIONS = "manage_communications"

    # ── Facilities ──
    VIEW_FACILITIES = "view_facilities"
    MANAGE_FACILITIES = "manage_facilities"

    # ── Engagement ──
    VIEW_ENGAGEMENT = "view_engagement"
    MANAGE_ENGAGEMENT = "manage_engagement"

    # ── Guests ──
    VIEW_GUESTS = "view_guests"
    MANAGE_GUESTS = "manage_guests"

    # ── Recommendations ──
    VIEW_RECOMMENDATIONS = "view_recommendations"

    # ── Documents ──
    VIEW_DOCUMENTS = "view_documents"
    MANAGE_DOCUMENTS = "manage_documents"

    # ── Dashboard ──
    VIEW_DASHBOARD = "view_dashboard"
    EXPORT_REPORTS = "export_reports"
    GENERATE_BOARD_REPORT = "generate_board_report"

    # ── Satisfaction ──
    VIEW_SATISFACTION = "view_satisfaction"
    MANAGE_SATISFACTION = "manage_satisfaction"
    SUBMIT_SURVEY = "submit_survey"

    # ── Admin ──
    MANAGE_USERS = "manage_users"
    APPROVE_REQUESTS = "approve_requests"
    VIEW_ANOMALIES = "view_anomalies"


# ═══════════════════════════════════════════════════
# ROLE → PERMISSIONS MATRIX
# ═══════════════════════════════════════════════════

ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "socio": {
        Permission.VIEW_FAMILY_PROFILE,
        Permission.VIEW_EVENTS,
        Permission.SUBMIT_SURVEY,
        Permission.VIEW_SATISFACTION,
        Permission.VIEW_GUESTS,
        Permission.VIEW_RECOMMENDATIONS,
        # B0: mi-club reads
        Permission.VIEW_WELLNESS,
        Permission.VIEW_FACILITIES,
    },
    "staff": {
        Permission.VIEW_FAMILY_PROFILE,
        Permission.VIEW_EVENTS,
        Permission.MANAGE_EVENTS,
        Permission.VIEW_SPORTS,
        Permission.VIEW_CULTURAL,
        Permission.VIEW_FACILITIES,
        Permission.VIEW_GUESTS,
        Permission.MANAGE_GUESTS,
        # B0: scheduling de clases
        Permission.VIEW_WELLNESS,
    },
    "admin": {
        Permission.VIEW_FAMILY_PROFILE,
        Permission.EDIT_FAMILY_PROFILE,
        Permission.VIEW_EVENTS,
        Permission.CREATE_EVENTS,
        Permission.MANAGE_EVENTS,
        Permission.VIEW_FINANCIAL,
        Permission.MANAGE_FINANCIAL,
        Permission.VIEW_WELLNESS,
        Permission.MANAGE_WELLNESS,
        Permission.VIEW_COMPLIANCE,
        Permission.VIEW_DASHBOARD,
        Permission.EXPORT_REPORTS,
        Permission.GENERATE_BOARD_REPORT,
        Permission.VIEW_SATISFACTION,
        Permission.MANAGE_SATISFACTION,
        Permission.MANAGE_USERS,
        # B0: dominios que la consola admin realmente usa
        Permission.VIEW_COMMUNICATIONS,
        Permission.MANAGE_COMMUNICATIONS,
        Permission.VIEW_FACILITIES,
        Permission.MANAGE_FACILITIES,
        Permission.VIEW_ENGAGEMENT,
        Permission.MANAGE_ENGAGEMENT,
        Permission.VIEW_GUESTS,
        Permission.MANAGE_GUESTS,
        Permission.VIEW_DOCUMENTS,
        Permission.MANAGE_DOCUMENTS,
        Permission.VIEW_RECOMMENDATIONS,
        Permission.VIEW_ANOMALIES,
        # B0: antes no lo tenía NINGÚN rol — aprobar era 403 universal
        Permission.APPROVE_REQUESTS,
    },
    "junta": {
        Permission.VIEW_DASHBOARD,
        Permission.VIEW_FINANCIAL,
        Permission.EXPORT_REPORTS,
        Permission.GENERATE_BOARD_REPORT,
        Permission.VIEW_ANOMALIES,
    },
}


def check_permission(role: str, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms


# ═══════════════════════════════════════════════════
# REGISTRY-DERIVED TOOL POLICY
# (read, write) por agente — write = semi_auto/hitl/always_human
# ═══════════════════════════════════════════════════

WRITE_LEVELS = {"semi_auto", "hitl", "always_human"}

AGENT_POLICY: dict[str, tuple[Permission, Permission]] = {
    "family_profile": (Permission.VIEW_FAMILY_PROFILE, Permission.EDIT_FAMILY_PROFILE),
    "event_orchestrator": (Permission.VIEW_EVENTS, Permission.MANAGE_EVENTS),
    "finance": (Permission.VIEW_FINANCIAL, Permission.MANAGE_FINANCIAL),
    "wellness": (Permission.VIEW_WELLNESS, Permission.MANAGE_WELLNESS),
    "compliance": (Permission.VIEW_COMPLIANCE, Permission.MANAGE_COMPLIANCE),
    "sports_recreation": (Permission.VIEW_SPORTS, Permission.MANAGE_SPORTS),
    "cultural_social": (Permission.VIEW_CULTURAL, Permission.MANAGE_CULTURAL),
    "communication": (Permission.VIEW_COMMUNICATIONS, Permission.MANAGE_COMMUNICATIONS),
    "facility_management": (Permission.VIEW_FACILITIES, Permission.MANAGE_FACILITIES),
    "member_engagement": (Permission.VIEW_ENGAGEMENT, Permission.MANAGE_ENGAGEMENT),
    "guest_management": (Permission.VIEW_GUESTS, Permission.MANAGE_GUESTS),
    "proactive_recommendation": (Permission.VIEW_RECOMMENDATIONS, Permission.MANAGE_ENGAGEMENT),
    "document_intelligence": (Permission.VIEW_DOCUMENTS, Permission.MANAGE_DOCUMENTS),
    "executive_dashboard": (Permission.VIEW_DASHBOARD, Permission.EXPORT_REPORTS),
    "satisfaction": (Permission.VIEW_SATISFACTION, Permission.MANAGE_SATISFACTION),
    "member_360": (Permission.VIEW_DASHBOARD, Permission.VIEW_DASHBOARD),
    "ml_intelligence": (Permission.VIEW_DASHBOARD, Permission.VIEW_DASHBOARD),
    "advisor_intelligence": (Permission.VIEW_DASHBOARD, Permission.VIEW_DASHBOARD),
    "age_group": (Permission.VIEW_DASHBOARD, Permission.MANAGE_EVENTS),
}

TOOL_PERMISSION_OVERRIDES: dict[tuple[str, str], Permission] = {
    ("event_orchestrator", "event_create"): Permission.CREATE_EVENTS,
    ("executive_dashboard", "export_report"): Permission.EXPORT_REPORTS,
    ("executive_dashboard", "generate_quarterly_board_report"): Permission.GENERATE_BOARD_REPORT,
    ("executive_dashboard", "get_board_report"): Permission.VIEW_DASHBOARD,
    ("executive_dashboard", "get_pending_approvals"): Permission.APPROVE_REQUESTS,
    ("executive_dashboard", "approve_request"): Permission.APPROVE_REQUESTS,
    ("executive_dashboard", "reject_request"): Permission.APPROVE_REQUESTS,
    ("communication", "send_board_package"): Permission.GENERATE_BOARD_REPORT,
    ("satisfaction", "submit_satisfaction_survey"): Permission.SUBMIT_SURVEY,
    ("age_group", "age_group_get_activities"): Permission.VIEW_EVENTS,
    ("age_group", "age_group_recommend_activities"): Permission.VIEW_RECOMMENDATIONS,
    ("proactive_recommendation", "optimize_pricing"): Permission.MANAGE_FINANCIAL,
}


def permission_for(agent: str, tool: str, approval: str) -> Optional[Permission]:
    """Required permission for a canonical (agent, tool) pair.

    Returns None only for unknown agents — smoke_b0 asserts this never
    happens for registered tools (196/196 coverage).
    """
    override = TOOL_PERMISSION_OVERRIDES.get((agent, tool))
    if override is not None:
        return override
    policy = AGENT_POLICY.get(agent)
    if policy is None:
        return None
    read_perm, write_perm = policy
    # approval llega como str ("auto") o como ApprovalLevel (spec del
    # registry); str(enum) da "ApprovalLevel.HITL" y nunca matchea.
    level = getattr(approval, "value", approval)
    return write_perm if str(level).lower() in WRITE_LEVELS else read_perm
