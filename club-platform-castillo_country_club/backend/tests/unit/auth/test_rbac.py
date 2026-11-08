"""Tests for RBAC permissions and tool policy.

P2-C3h b0u — reescrito contra la API nueva de rbac.py:

* TOOL_PERMISSION_MAP (mapa explícito ~50 entradas, 75% phantom) fue
  eliminado; la policy ahora deriva de AGENT_POLICY (read, write) por
  agente + TOOL_PERMISSION_OVERRIDES para casos puntuales.
* permission_for(agent, tool, approval) es la función bajo test:
  - override explícito gana siempre;
  - write-ness viene del approval level (enum ApprovalLevel o str);
  - devuelve None SOLO para agentes desconocidos (cobertura 196/196).
* Counts de roles verificados contra ROLE_PERMISSIONS real:
  socio=8, staff=9, admin=29, junta=5.
"""

from __future__ import annotations

from club_mcp.auth.rbac import (
    AGENT_POLICY,
    ROLE_PERMISSIONS,
    TOOL_PERMISSION_OVERRIDES,
    Permission,
    check_permission,
    permission_for,
)
from club_mcp.hitl.approval_types import ApprovalLevel


class TestRolePermissions:
    def test_socio_has_8_permissions(self):
        assert len(ROLE_PERMISSIONS["socio"]) == 8

    def test_staff_has_9_permissions(self):
        assert len(ROLE_PERMISSIONS["staff"]) == 9

    def test_admin_has_29_permissions(self):
        assert len(ROLE_PERMISSIONS["admin"]) == 29

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

    def test_admin_can_approve_requests(self):
        # B0: antes APPROVE_REQUESTS no lo tenía NINGÚN rol (403 universal)
        assert Permission.APPROVE_REQUESTS in ROLE_PERMISSIONS["admin"]

    def test_every_role_key_maps_to_known_permission_set(self):
        for role, perms in ROLE_PERMISSIONS.items():
            assert isinstance(perms, set), role
            assert all(isinstance(p, Permission) for p in perms), role


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


class TestPermissionFor:
    def test_family_get_profile_maps_to_view(self):
        assert (
            permission_for("family_profile", "family_get_profile", "auto")
            == Permission.VIEW_FAMILY_PROFILE
        )

    def test_submit_survey_maps_correctly(self):
        assert (
            permission_for("satisfaction", "submit_satisfaction_survey", "auto")
            == Permission.SUBMIT_SURVEY
        )

    def test_generate_board_report_maps_correctly(self):
        assert (
            permission_for(
                "executive_dashboard",
                "generate_quarterly_board_report",
                "auto",
            )
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
            got = permission_for("satisfaction", tool, "auto")
            assert got is not None, f"Tool '{tool}' not mapped"
        # la única write del set es submit (SUBMIT_SURVEY vía override)
        assert (
            permission_for("satisfaction", "get_survey_for_event", "auto")
            == Permission.VIEW_SATISFACTION
        )

    def test_unknown_agent_returns_none(self):
        assert permission_for("nonexistent_agent", "nonexistent_tool", "auto") is None

    def test_every_agent_policy_entry_is_read_write_pair(self):
        for agent, policy in AGENT_POLICY.items():
            assert len(policy) == 2, agent
            read_perm, write_perm = policy
            assert isinstance(read_perm, Permission), agent
            assert isinstance(write_perm, Permission), agent

    def test_overrides_reference_real_permissions(self):
        for (agent, tool), perm in TOOL_PERMISSION_OVERRIDES.items():
            assert agent in AGENT_POLICY, f"override para agente desconocido: {agent}"
            assert isinstance(perm, Permission), f"{agent}.{tool}"


class TestPermissionForApprovalLevels:
    """b0u: str(enum) != 'hitl' — permission_for debe normalizar el enum."""

    def test_enum_write_level_gives_write_permission(self):
        assert (
            permission_for("family_profile", "family_update_profile", ApprovalLevel.HITL)
            == Permission.EDIT_FAMILY_PROFILE
        )

    def test_enum_read_level_gives_read_permission(self):
        assert (
            permission_for("family_profile", "family_get_profile", ApprovalLevel.AUTO)
            == Permission.VIEW_FAMILY_PROFILE
        )

    def test_str_and_enum_agree(self):
        for level in ApprovalLevel:
            by_enum = permission_for("finance", "finance_invoice_create", level)
            by_str = permission_for("finance", "finance_invoice_create", level.value)
            assert by_enum == by_str, f"divergencia en {level}"
