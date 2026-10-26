"""Role-Based Access Control: permissions, role matrix, tool mapping."""

from __future__ import annotations

from enum import Enum


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
# SOCIO: 6 | STAFF: 8 | ADMIN: 15 | JUNTA: 5
# ═══════════════════════════════════════════════════

ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "socio": {
        Permission.VIEW_FAMILY_PROFILE,
        Permission.VIEW_EVENTS,
        Permission.SUBMIT_SURVEY,
        Permission.VIEW_SATISFACTION,
        Permission.VIEW_GUESTS,
        Permission.VIEW_RECOMMENDATIONS,
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
# TOOL → MINIMUM PERMISSION MAPPING
# ═══════════════════════════════════════════════════

TOOL_PERMISSION_MAP: dict[str, Permission] = {
    # ── Family Profile ──
    "family_get_profile": Permission.VIEW_FAMILY_PROFILE,
    "family_create": Permission.EDIT_FAMILY_PROFILE,
    "family_update": Permission.EDIT_FAMILY_PROFILE,
    "family_search": Permission.VIEW_FAMILY_PROFILE,
    "family_social_compatibility": Permission.VIEW_FAMILY_PROFILE,

    # ── Event Orchestrator ──
    "event_create": Permission.CREATE_EVENTS,
    "event_list": Permission.VIEW_EVENTS,
    "event_get_details": Permission.VIEW_EVENTS,
    "event_update": Permission.MANAGE_EVENTS,
    "event_cancel": Permission.MANAGE_EVENTS,

    # ── Finance ──
    "finance_get_overview": Permission.VIEW_FINANCIAL,
    "finance_generate_invoice": Permission.MANAGE_FINANCIAL,

    # ── Wellness ──
    "wellness_get_profile": Permission.VIEW_WELLNESS,
    "wellness_create_program": Permission.MANAGE_WELLNESS,

    # ── Compliance ──
    "compliance_get_status": Permission.VIEW_COMPLIANCE,
    "compliance_create_policy": Permission.MANAGE_COMPLIANCE,

    # ── Sports ──
    "sports_get_activities": Permission.VIEW_SPORTS,
    "sports_create_activity": Permission.MANAGE_SPORTS,

    # ── Cultural ──
    "cultural_get_events": Permission.VIEW_CULTURAL,
    "cultural_create_event": Permission.MANAGE_CULTURAL,

    # ── Communication ──
    "communication_send_message": Permission.MANAGE_COMMUNICATIONS,
    "communication_get_messages": Permission.VIEW_COMMUNICATIONS,
    "send_board_package": Permission.GENERATE_BOARD_REPORT,

    # ── Facilities ──
    "facility_get_status": Permission.VIEW_FACILITIES,
    "facility_create_maintenance": Permission.MANAGE_FACILITIES,

    # ── Engagement ──
    "engagement_get_score": Permission.VIEW_ENGAGEMENT,
    "engagement_create_campaign": Permission.MANAGE_ENGAGEMENT,

    # ── Guests ──
    "guest_register": Permission.VIEW_GUESTS,
    "guest_manage": Permission.MANAGE_GUESTS,

    # ── Recommendations ──
    "recommendation_get": Permission.VIEW_RECOMMENDATIONS,

    # ── Documents ──
    "document_get": Permission.VIEW_DOCUMENTS,
    "document_create": Permission.MANAGE_DOCUMENTS,

    # ── Executive Dashboard ──
    "get_executive_summary": Permission.VIEW_DASHBOARD,
    "get_financial_overview": Permission.VIEW_FINANCIAL,
    "get_membership_health": Permission.VIEW_DASHBOARD,
    "get_operational_pulse": Permission.VIEW_DASHBOARD,
    "detect_anomalies": Permission.VIEW_ANOMALIES,
    "export_report": Permission.EXPORT_REPORTS,
    "generate_quarterly_board_report": Permission.GENERATE_BOARD_REPORT,
    "get_age_group_balance": Permission.VIEW_DASHBOARD,

    # ── Satisfaction ──
    "submit_satisfaction_survey": Permission.SUBMIT_SURVEY,
    "get_survey_for_event": Permission.VIEW_SATISFACTION,
    "analyze_event_satisfaction": Permission.MANAGE_SATISFACTION,
    "get_satisfaction_trends": Permission.VIEW_SATISFACTION,
    "generate_satisfaction_report": Permission.MANAGE_SATISFACTION,
    "get_satisfaction_questions": Permission.VIEW_SATISFACTION,
}
