"""Tests for RBAC permissions and tool mapping."""

from __future__ import annotations

from club_mcp.auth.rbac import (
    ROLE_PERMISSIONS,
    TOOL_PERMISSION_MAP,
    Permission,
    check_permission,
)


class TestRolePermissions:
    def test_socio_has_6_permissions(self):
        assert len(ROLE_PERMISSIONS["socio"]) == 6

    def test_staff_has_8_permissions(self):
        assert len(ROLE_PERMISSIONS["staff"]) == 8

    def test_admin_has_16_permissions(self):
        assert len(ROLE_PERMISSIONS["admin"]) == 16

    def test_junta_has_5_permissions(self):
        assert len(ROLE_PERMISSIONS["junta"]) == 5

    def test_socio_can_submit_survey(self):
        assert Permission.SUBMIT_SURVEY in ROLE_PERMISSIONS["socio"]

    def test_socio_cannot_manage_users(self):
        assert Permission.MANAGE_USERS not in ROLE_PERMISSIONS["socio"]

    def test_admin_can_manage_users(self):
        assert Permission.MANAGE_USERS in ROLE_PERMISSIONS["admin"]

    def test_junta_can_view_dashboard(self):
        assert Permission.VIEW_DASHBOARD in ROLE_PERMISSIONS["junta"]

    def test_junta_cannot_manage_events(self):
        assert Permission.MANAGE_EVENTS not in ROLE_PERMISSIONS["junta"]


class TestCheckPermission:
    def test_admin_has_permission(self):
        assert check_permission("admin", Permission.MANAGE_USERS) is True

    def test_socio_lacks_permission(self):
        assert check_permission("socio", Permission.MANAGE_USERS) is False

    def test_unknown_role_returns_false(self):
        assert check_permission("unknown", Permission.VIEW_DASHBOARD) is False

    def test_staff_view_events(self):
        assert check_permission("staff", Permission.VIEW_EVENTS) is True

    def test_junta_export_reports(self):
        assert check_permission("junta", Permission.EXPORT_REPORTS) is True


class TestToolPermissionMap:
    def test_family_get_profile_maps_to_view(self):
        assert (
            TOOL_PERMISSION_MAP["family_get_profile"]
            == Permission.VIEW_FAMILY_PROFILE
        )

    def test_submit_survey_maps_correctly(self):
        assert (
            TOOL_PERMISSION_MAP["submit_satisfaction_survey"]
            == Permission.SUBMIT_SURVEY
        )

    def test_generate_board_report_maps_correctly(self):
        assert (
            TOOL_PERMISSION_MAP["generate_quarterly_board_report"]
            == Permission.GENERATE_BOARD_REPORT
        )

    def test_all_satisfaction_tools_mapped(self):
        tools = [
            "submit_satisfaction_survey",
            "get_survey_for_event",
            "analyze_event_satisfaction",
            "get_satisfaction_trends",
            "generate_satisfaction_report",
            "get_satisfaction_questions",
        ]
        for tool in tools:
            assert tool in TOOL_PERMISSION_MAP, f"Tool '{tool}' not mapped"

    def test_unknown_tool_returns_none(self):
        assert TOOL_PERMISSION_MAP.get("nonexistent_tool") is None
