"""Agent & tool registry — the single source of truth for tool identity.

P2-C3h B0. The index is COMPUTED from live agent instances (via @MCPTool
metadata), so it can never drift from the code that actually runs. It
powers:

  * REST dispatch (api/routes/agents.py) — canonical + legacy keys
  * GET /api/agents catalog (discovery, codegen-ready)
  * RBAC policy resolution (auth/rbac.permission_for)
  * Compat burn-down telemetry (legacy keys -> 0, observable)

Design:
  * COMPAT is DATA, not code: AGENT_ALIASES + TOOL_ALIASES map legacy
    frontend keys to canonical pairs. Every compat hit is counted and
    surfaced via Deprecation/Sunset headers by the routes layer.
  * No silent fallbacks: unknown keys raise ResolutionError with fuzzy
    suggestions.
"""
from __future__ import annotations

import difflib
import inspect
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Optional

from club_mcp.agents.base import BaseAgent

# ═══════════════════════════════════════════════════════════
# Legacy -> canonical maps (DATA — edit here, no code changes)
# Seeded ONLY with pairs verified in P2-C3h h3/h4 (params+read
# compatible). B2 landed: reports → executive_dashboard with
# get_board_report registered (params compatible). Param-mismatch
# pairs (reports.get_risk_matrix, satisfaction survey reads, etc.)
# wait for their adapter batches (B3+).
# ═══════════════════════════════════════════════════════════

AGENT_ALIASES: dict[str, str] = {
    "families": "family_profile",
    "guests": "guest_management",
    "facilities": "facility_management",
    "hitl": "executive_dashboard",
    "engagement": "member_engagement",
    "reports": "executive_dashboard",
}

# Key: canonical agent. Value: {legacy_tool: target | (agent, tool) | Adapter}
#
# B3 — Adapter layer. A bare str/tuple remains a rename-only alias (B2
# semantics: params pass through verbatim). An Adapter entry additionally
# transforms params before dispatch and the response after it, so a
# legacy callsite keeps working while the canonical tool evolves its
# contract. Adapters are DATA: each declares
#   param_map:  {legacy_param: canonical_param | None}  (None drops it)
#   adapt_response: callable(raw: dict, params: dict) -> dict
# and the routes layer applies them generically after resolve().

@dataclass(frozen=True)
class AliasAdapter:
    """Param + response transformation for a legacy key (B3)."""

    target: tuple[str, str]  # (canonical_agent, canonical_tool)
    param_map: dict[str, str | None] = field(default_factory=dict)
    adapt_response: Optional[Callable[[dict, dict], dict]] = None


def adapt_family_profile(raw: dict, params: dict) -> dict:
    """family_get_profile payload → the mi-club landing shape.

    The callsite (useMiClubLanding:435 → families/types.ts Family, camelCase:
    familyName/totalBalance/engagementScore/memberCount) predates the canonical
    snake_case FamilyResponse. This adapter reuses the profile data (no
    invented numbers: totalBalance = engagement placeholder 0 — financial
    totals are finance.get_family_account's domain, cross-linked below).
    """
    family = dict(raw.get("family") or {})
    camel = {
        "id": family.get("id", ""),
        "familyName": family.get("name", ""),
        "tier": family.get("tier", ""),
        "status": family.get("status", ""),
        "email": family.get("email", ""),
        "phone": family.get("phone", ""),
        "memberCount": family.get("member_count", len(family.get("members", []))),
        "engagementScore": family.get("engagement_score", 0),
        "joinDate": family.get("join_date", ""),
        "totalBalance": 0,
        "accountStatus": "active" if family.get("status") == "active" else str(family.get("status", "")),
    }
    out = dict(raw)
    out["family"] = camel
    out["members"] = [
        {
            "id": m.get("id", ""),
            "name": m.get("name", ""),
            "roleInFamily": m.get("role", ""),
            "birthDate": m.get("date_of_birth", ""),
            "membershipType": m.get("membership_type", ""),
        }
        for m in family.get("members", [])
    ]
    out["recentActivity"] = []
    out["financialSummary"] = {
        "monthlyDues": 0,
        "totalBalance": 0,
        "paymentStatus": "unknown",
    }
    out["socialConnections"] = []
    out["message"] = raw.get("message", "")
    out["adapter_note"] = "families.get_family → family_profile.family_get_profile (B3 adapter)"
    return out


TOOL_ALIASES: dict[str, dict[str, Any]] = {
    "family_profile": {
        "get_family": AliasAdapter(
            target=("family_profile", "family_get_profile"),
            # mi-club callsite sends camelCase `familyId` (useMiClubLanding:435)
            param_map={"familyId": "family_id"},
            # FamilyResponse (snake) -> Family (camelCase) that the callsite reads:
            # familyName/totalBalance/engagementScore/memberCount (families/types:196)
            adapt_response=adapt_family_profile,
        ),
        "create_family": "family_create_profile",
        "update_family": "family_update_members",
        "list_families": "family_search",
        "search_families": "family_search",
        "get_activity_history": "family_get_activity_history",
        "get_social_graph": "family_get_social_graph",
    },
    "facility_management": {
        "get_reservations": "get_facility_reservations",
        "list_reservations": "get_facility_reservations",
        "get_utilization": "get_amenity_utilization",
        "list_available_facilities": "manage_facilities",
    },
    "finance": {
        "get_family_account": "finance_account_status",
        "get_transactions": "finance_transactions_list",
        "get_invoices": "finance_invoices_list",
        # B3: useDecisionDocument legacy keys (mock-registry already
        # serves the canonical names for all four).
        "narrative_generate": ("advisor_intelligence", "generate_insight_narrative"),
        "scenario_simulate": ("advisor_intelligence", "simulate_scenario"),
    },
    "member_engagement": {
        # B3: engagement.* survey reads are cross-agent — the tools live
        # in satisfaction. Params already match (survey_id); survey_id →
        # event_id is the documented contract of the tools themselves.
        "get_survey_results": ("satisfaction", "survey_results"),
        "get_active_survey": ("satisfaction", "active_survey"),
    },
    "communication": {
        "get_communication_history": "get_notification_history",
    },
    "executive_dashboard": {
        # cross-agent: the tool lives in finance, params match exactly
        "generate_ai_analysis": ("finance", "generate_ai_analysis"),
    },
    # reports.* → B2: get_board_report is now a real tool under
    # executive_dashboard (same name, so no TOOL_ALIASES entry needed —
    # AGENT_ALIASES.reports handles the server rename). B3 registers
    # get_risk_matrix as a real tool too (same name under the alias
    # server), so no entry is needed for it either.
}


def _alias_target(entry: Any, canonical_agent: str, tool_key: str) -> tuple[str, str]:
    if isinstance(entry, AliasAdapter):
        return entry.target
    if isinstance(entry, tuple):
        return entry[0], entry[1]
    if isinstance(entry, str):
        return canonical_agent, entry
    return canonical_agent, tool_key


def _alias_adapter(entry: Any) -> Optional[AliasAdapter]:
    return entry if isinstance(entry, AliasAdapter) else None



class ResolutionError(KeyError):
    """Unknown (agent_key, tool_key) — carries fuzzy suggestions."""

    def __init__(self, agent_key: str, tool_key: str, suggestions: list[str]) -> None:
        super().__init__(f"{agent_key}.{tool_key}")
        self.agent_key = agent_key
        self.tool_key = tool_key
        self.suggestions = suggestions
        self.suggestion_text = (
            "Sugerencias: " + ", ".join(suggestions)
            if suggestions
            else "Catálogo completo: GET /api/agents"
        )


@dataclass(frozen=True)
class ParamSpec:
    name: str
    required: bool
    type_name: str


@dataclass(frozen=True)
class ToolSpec:
    name: str
    agent: str
    description: str
    approval: str
    approver_roles: tuple[str, ...]
    params: tuple[ParamSpec, ...]
    method_name: str


@dataclass
class Resolved:
    agent: BaseAgent
    spec: ToolSpec
    requested: tuple[str, str]
    canonical: tuple[str, str]
    via_alias_agent: bool
    via_alias_tool: bool
    adapter: Optional[AliasAdapter] = None

    @property
    def via_compat(self) -> bool:
        return self.via_alias_agent or self.via_alias_tool

    def map_params(self, params: dict[str, Any]) -> dict[str, Any]:
        """Apply the alias param_map (B3 adapters): rename or drop keys."""
        if self.adapter is None or not self.adapter.param_map:
            return dict(params)
        out = {}
        for key, value in params.items():
            mapped = self.adapter.param_map.get(key, key)
            if mapped is not None:
                out[mapped] = value
        return out

    def adapt_result(self, result: Any) -> Any:
        """Apply the alias response adapter (B3), if any."""
        if (
            self.adapter is None
            or self.adapter.adapt_response is None
            or not isinstance(result, dict)
        ):
            return result
        params = {}  # params are not needed by current adapters
        return self.adapter.adapt_response(result, params)


def _type_name(annotation: Any) -> str:
    if annotation is inspect.Parameter.empty:
        return "any"
    text = str(annotation)
    return text if text else "any"


class AgentRegistry:
    """Indexes agents and their @MCPTool methods at construction time."""

    def __init__(self, agents: Iterable[BaseAgent]) -> None:
        self._agents: dict[str, BaseAgent] = {}
        self._tools: dict[str, dict[str, ToolSpec]] = {}
        for agent in agents:
            name = getattr(agent, "agent_name", None)
            if not name:
                raise ValueError(f"Agente sin agent_name: {type(agent).__name__}")
            if name in self._agents:
                # W-2b guard: duplicate wiring is a composition bug — fail loud.
                raise ValueError(
                    f"agent_name duplicado '{name}' — bug en el composition root"
                )
            tools: dict[str, ToolSpec] = {}
            for attr_name in dir(agent):
                if attr_name.startswith("_"):
                    continue
                attr = getattr(agent, attr_name, None)
                if not callable(attr) or not getattr(attr, "_mcp_tool", False):
                    continue
                sig = inspect.signature(attr)
                params = tuple(
                    ParamSpec(p.name, p.default is inspect.Parameter.empty, _type_name(p.annotation))
                    for p in sig.parameters.values()
                    if p.name != "self" and p.kind not in (p.VAR_POSITIONAL, p.VAR_KEYWORD)
                )
                tools[attr._tool_name] = ToolSpec(
                    name=attr._tool_name,
                    agent=name,
                    description=attr._tool_description,
                    approval=attr._tool_approval.value,
                    approver_roles=tuple(getattr(attr, "_tool_approver_roles", []) or []),
                    params=params,
                    method_name=attr_name,
                )
            self._agents[name] = agent
            self._tools[name] = tools
        self.compat_hits: Counter = Counter()

    # ── Queries ────────────────────────────────────────────

    @property
    def agents(self) -> dict[str, BaseAgent]:
        return self._agents

    @property
    def tools_by_agent(self) -> dict[str, dict[str, ToolSpec]]:
        return self._tools

    @property
    def total_tools(self) -> int:
        return sum(len(tools) for tools in self._tools.values())

    def resolve(self, agent_key: str, tool_key: str) -> Resolved:
        canonical_agent = AGENT_ALIASES.get(agent_key, agent_key)
        via_agent = canonical_agent != agent_key
        agent = self._agents.get(canonical_agent)
        if agent is None:
            raise ResolutionError(agent_key, tool_key, self._suggest(agent_key, tool_key))

        alias_entry = TOOL_ALIASES.get(canonical_agent, {}).get(tool_key)
        target_agent, target_tool = _alias_target(alias_entry, canonical_agent, tool_key)
        adapter = _alias_adapter(alias_entry)
        via_tool = (target_tool != tool_key) or (target_agent != canonical_agent)

        # Cross-agent aliases must execute on the TARGET agent's instance,
        # not the requested server's (e.g. engagement.get_active_survey →
        # satisfaction.active_survey runs on SatisfactionAgent).
        if agent_key != target_agent and target_agent != canonical_agent:
            cross_agent = self._agents.get(target_agent)
            if cross_agent is None:
                raise ResolutionError(agent_key, tool_key, self._suggest(agent_key, tool_key))
        else:
            cross_agent = agent

        spec = self._tools.get(target_agent, {}).get(target_tool)
        if spec is None:
            raise ResolutionError(agent_key, tool_key, self._suggest(agent_key, tool_key))

        if via_agent or via_tool:
            self.compat_hits[f"{agent_key}.{tool_key}"] += 1
        return Resolved(
            agent=cross_agent or agent,
            spec=spec,
            requested=(agent_key, tool_key),
            canonical=(target_agent, target_tool),
            via_alias_agent=via_agent,
            via_alias_tool=via_tool,
            adapter=adapter,
        )

    # ── Catalog ────────────────────────────────────────────

    def catalog(self) -> dict:
        return {
            "status": "success",
            "total_agents": len(self._agents),
            "total_tools": self.total_tools,
            "compat_hits": dict(self.compat_hits),
            "agents": [self._agent_payload(name) for name in sorted(self._agents)],
        }

    def agent_catalog(self, name: str) -> Optional[dict]:
        canonical = AGENT_ALIASES.get(name, name)
        if canonical not in self._agents:
            return None
        payload = self._agent_payload(canonical)
        if canonical != name:
            payload["canonical_name"] = canonical
        return payload

    def _agent_payload(self, name: str) -> dict:
        agent = self._agents[name]
        tools = self._tools[name]
        return {
            "name": name,
            "description": getattr(agent, "description", ""),
            "tools_count": len(tools),
            "tools": [
                self._tool_payload(t)
                for t in sorted(tools.values(), key=lambda s: s.name)
            ],
        }

    def _tool_payload(self, spec: ToolSpec) -> dict:
        return {
            "name": spec.name,
            "description": spec.description,
            "approval": spec.approval,
            "approver_roles": list(spec.approver_roles),
            "params": [
                {"name": p.name, "required": p.required, "type": p.type_name}
                for p in spec.params
            ],
        }

    # ── Suggestions ────────────────────────────────────────

    def _suggest(self, agent_key: str, tool_key: str, limit: int = 3) -> list[str]:
        target = f"{agent_key}.{tool_key}"
        pool = [f"{a}.{t}" for a, tools in self._tools.items() for t in tools]
        pool += [f"{alias}.{a}" for alias, a in AGENT_ALIASES.items()]
        close = difflib.get_close_matches(target, pool, n=limit, cutoff=0.55)
        if close:
            return close
        tool_matches = difflib.get_close_matches(
            tool_key,
            [t for tools in self._tools.values() for t in tools],
            n=limit,
            cutoff=0.45,
        )
        out: list[str] = []
        for t in tool_matches:
            for a, tools in self._tools.items():
                if t in tools:
                    out.append(f"{a}.{t}")
                    break
        return out

    def suggest_agent(self, name: str, limit: int = 3) -> list[str]:
        pool = list(self._agents) + list(AGENT_ALIASES)
        return difflib.get_close_matches(name, pool, n=limit, cutoff=0.6)
