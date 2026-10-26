# tool_permissions.py
# Cada tool del MCP se mapea a un permiso mínimo necesario

TOOL_PERMISSION_MAP: dict[str, Permission] = {
    # FamilyProfileAgent
    "create_family_profile": Permission.EDIT_FAMILIES,
    "get_family_profile": Permission.VIEW_ALL_FAMILIES,  # socio solo ve la suya
    "search_families": Permission.VIEW_ALL_FAMILIES,
    "update_family_members": Permission.EDIT_FAMILIES,
    "set_family_preferences": Permission.EDIT_OWN_PROFILE,
    "get_family_activity_history": Permission.VIEW_OWN_PROFILE,
    "get_family_social_graph": Permission.VIEW_ALL_FAMILIES,

    # ExecutiveDashboardAgent
    "get_executive_summary": Permission.VIEW_DASHBOARD,
    "get_financial_overview": Permission.VIEW_FINANCIALS,
    "get_membership_health": Permission.VIEW_DASHBOARD,
    "get_operational_pulse": Permission.VIEW_OPERATIONS,
    "detect_anomalies": Permission.VIEW_ANOMALIES,
    "generate_quarterly_board_report": Permission.GENERATE_REPORTS,
    "export_report": Permission.GENERATE_REPORTS,

    # FinanceAgent
    "get_family_financial_status": Permission.VIEW_OWN_FINANCES,
    "get_financial_dashboard": Permission.VIEW_FINANCIALS,
    "process_monthly_dues": Permission.VIEW_FINANCIALS,
    "handle_refund_or_credit": Permission.APPROVE_HITL,

    # GuestManagementAgent
    "register_guest": Permission.REGISTER_GUESTS,
    "manage_guest_privileges": Permission.MANAGE_GUESTS,
    "plan_private_event": Permission.MANAGE_EVENTS,
    "get_guest_analytics": Permission.VIEW_DASHBOARD,

    # CommunicationAgent
    "send_personalized_notification": Permission.MANAGE_COMMUNICATIONS,
    "broadcast_club_announcement": Permission.MANAGE_COMMUNICATIONS,
    "manage_emergency_broadcast": Permission.MANAGE_COMMUNICATIONS,

    # ... etc para los 103 tools
}
