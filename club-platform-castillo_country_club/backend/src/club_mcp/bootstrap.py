"""Composition root — the ONLY place agents are instantiated.

P2-C3h B0. Both transports (FastAPI REST bridge + FastMCP server) build
from this module, so they can never diverge again. Sealed findings
(h5-wiring):

  F-1   server.py used claude_service before assigning it (UnboundLocalError)
  F-2   FamilyProfileAgent positional mismatch (3 args -> 2-param __init__)
  F-2b  server.py logged agent.name (attribute does not exist)
  F-3   api/app.py module-level app had ZERO agents (REST = 404 everywhere)
  F-8   member_360 & ml_intelligence were never instantiated (20 tools absent)
  W-2b  CommunicationAgent was instantiated twice (with/without rag_service)

Wiring is signature-driven with an explicit override table: constructor
params are matched BY NAME against shared infrastructure (repos,
approval engine, notifier, claude service, club config, rag service).
Adding an agent = one line in _AGENT_MODULES.

HITL closure (B0.5): _EXECUTOR_BINDINGS registers post-approval
executors on the shared ApprovalEngine — approving now EXECUTES.
Verified seed only; remaining pairs land with their batches.
"""
from __future__ import annotations

import importlib
import inspect
import logging
import re
from dataclasses import dataclass
from typing import Any, Callable, Optional

from club_mcp.agents.base import BaseAgent
from club_mcp.registry import AgentRegistry

logger = logging.getLogger(__name__)

_AGENT_MODULES: list[str] = [
    "family_profile",
    "event_orchestrator",
    "age_group",
    "finance",
    "wellness",
    "compliance",
    "sports_recreation_agent",
    "cultural_social_agent",
    "communication_agent",
    "facility_management_agent",
    "member_engagement_agent",
    "guest_management_agent",
    "proactive_recommendation_agent",
    "document_intelligence_agent",
    "executive_dashboard_agent",
    "satisfaction_agent",
    "advisor_intelligence",
    # F-8: these two were never instantiated by server.py — their 20 tools
    # existed in source but not in the running system.
    "member_360_agent",
    "ml_intelligence",
]

# Generic "repo" constructor param -> repository module key.
_REPO_BY_MODULE: dict[str, str] = {
    "family_profile": "family_repo",
    "event_orchestrator": "event_repo",
    "age_group": "age_group_repo",
    "wellness": "wellness_repo",
    "compliance": "compliance_repo",
    "sports_recreation_agent": "sports_recreation_repo",
    "cultural_social_agent": "cultural_social_repo",
    "communication_agent": "communication_repo",
    "facility_management_agent": "facility_management_repo",
    "member_engagement_agent": "member_engagement_repo",
    "guest_management_agent": "guest_management_repo",
    "proactive_recommendation_agent": "proactive_recommendation_repo",
    "document_intelligence_agent": "document_intelligence_repo",
    "executive_dashboard_agent": "executive_dashboard_repo",
    "satisfaction_agent": "satisfaction_repo",
    "member_360_agent": "member_360_repo",
    "ml_intelligence": "ml_intelligence_repo",
    # finance/advisor wire by exact param name (finance_repo / claude_service)
}

# Post-approval executors (verified pairs only — extend per batch).
_EXECUTOR_BINDINGS: list[tuple[str, str, str]] = [
    ("finance", "finance_invoice_create", "execute_invoice_create"),
    ("executive_dashboard", "generate_quarterly_board_report", "execute_board_report"),
]


def _snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


def _load_repo_class(repo_key: str) -> type:
    module_name = f"club_mcp.db.repositories.{repo_key}"
    module = importlib.import_module(module_name)
    target = repo_key.removesuffix("_repo")
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if not inspect.isclass(attr):
            continue
        if _snake(attr_name).removesuffix("_repository") == target:
            return attr
    # P2-C3h b0t: fallback — convención de nombre + escaneo del módulo
    from importlib import import_module as _b0t_import
    _b0t_mod = None
    _b0t_err = None
    try:
        _b0t_mod = _b0t_import(module_name)
    except ModuleNotFoundError as _b0t_e:
        _b0t_err = _b0t_e
    if _b0t_mod is not None:
        _b0t_parts = [p.title() if not p.isdigit() else p for p in repo_key.split("_")]
        _b0t_base = "".join(_b0t_parts)
        _b0t_strip = repo_key[:-5] if repo_key.endswith("_repo") else repo_key
        _b0t_base2 = "".join(p.title() if not p.isdigit() else p for p in _b0t_strip.split("_")) if _b0t_strip else _b0t_base
        _b0t_cands = []
        for _b0t_s in (_b0t_base, _b0t_base2 + "Repo", _b0t_base2 + "Repository", _b0t_base2):
            if _b0t_s and _b0t_s not in _b0t_cands:
                _b0t_cands.append(_b0t_s)
        for _b0t_c in _b0t_cands:
            _b0t_cls = getattr(_b0t_mod, _b0t_c, None)
            if isinstance(_b0t_cls, type):
                return _b0t_cls
        _b0t_defined = sorted(
            _n for _n, _v in vars(_b0t_mod).items()
            if isinstance(_v, type) and _v.__module__ == _b0t_mod.__name__ and not _n.startswith("_")
        )
        if len(_b0t_defined) == 1:
            return getattr(_b0t_mod, _b0t_defined[0])
        raise LookupError(
            f"Repository class not found for '{repo_key}' in {module_name}"
            f" (candidatas: {_b0t_cands}; clases definidas: {_b0t_defined})"
        )
    raise LookupError(
        f"Repository module not found for '{repo_key}': {module_name} ({_b0t_err})"
    )


def _agent_class(module_name: str) -> type:
    module = importlib.import_module(f"club_mcp.agents.{module_name}")
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if (
            inspect.isclass(attr)
            and attr is not BaseAgent
            and issubclass(attr, BaseAgent)
            and attr.__module__ == module.__name__
        ):
            return attr
    raise LookupError(f"No BaseAgent subclass in club_mcp.agents.{module_name}")


def _bind_executor(agent: BaseAgent, method_name: str) -> Callable:
    """Adapt an execute_* method to the engine's executor(**params) call.

    Single-param executors take the whole params dict; multi-param ones
    take the params as kwargs.
    """
    method = getattr(agent, method_name, None)
    if method is None:
        raise AttributeError(
            f"{agent.agent_name} no tiene el método '{method_name}'"
        )
    sig = inspect.signature(method)
    free = [
        p for p in sig.parameters.values()
        if p.kind not in (p.VAR_POSITIONAL, p.VAR_KEYWORD)
    ]
    if len(free) == 1:
        only = free[0].name

        async def _dict_wrapper(**kwargs: Any) -> Any:
            return await method(**{only: kwargs})

        return _dict_wrapper

    async def _kwargs_wrapper(**kwargs: Any) -> Any:
        return await method(**kwargs)

    return _kwargs_wrapper


@dataclass
class Runtime:
    agents: list[BaseAgent]
    registry: AgentRegistry
    mcp: Any
    approval_engine: Any
    claude_service: Any
    notifier: Any


def build_runtime() -> Runtime:
    from fastmcp import FastMCP

    from club_mcp.ai.claude_service import ClaudeService
    from club_mcp.ai.resilience import build_resilient_claude_service
    from club_mcp.config.club_registry import get_club_config
    from club_mcp.hitl.approval_engine import ApprovalEngine
    from club_mcp.hitl.notifier import HITLNotifier

    # F-1: claude_service FIRST — it feeds DocumentIntelligenceRepository.
    # G12 (Q-LLM-01): envuelto en ResilientClaudeService — retry exponencial
    # + jitter, timeout por intento, circuit breaker y fallback Ollama.
    # Misma interfaz: los consumidores no cambian.
    claude_service = build_resilient_claude_service(ClaudeService())
    approval_engine = ApprovalEngine()
    notifier = HITLNotifier()
    club_config = get_club_config("castillo_country_club")

    repo_cache: dict[str, Any] = {}

    def repo_for(key: str) -> Any:
        if key not in repo_cache:
            cls = _load_repo_class(key)
            if key == "document_intelligence_repo":
                repo_cache[key] = cls(claude_service=claude_service)
            else:
                repo_cache[key] = cls()
        return repo_cache[key]

    # rag_service comes from the document repo (single CommunicationAgent, W-2b)
    doc_repo = repo_for("document_intelligence_repo")
    rag_service = getattr(doc_repo, "_rag_service", None)

    agents: list[BaseAgent] = []
    for module_name in _AGENT_MODULES:
        cls = _agent_class(module_name)
        sig = inspect.signature(cls.__init__)
        kwargs: dict[str, Any] = {}
        for pname, p in sig.parameters.items():
            if pname == "self":
                continue
            repo_key: Optional[str] = None
            if pname == "repo":
                repo_key = _REPO_BY_MODULE.get(module_name)
            elif pname.endswith("_repo"):
                repo_key = pname
            if repo_key is not None:
                kwargs[pname] = repo_for(repo_key)
            elif pname == "approval_engine":
                kwargs[pname] = approval_engine
            elif pname == "notifier":
                kwargs[pname] = notifier
            elif pname == "claude_service":
                kwargs[pname] = claude_service
            elif pname == "club_config":
                kwargs[pname] = club_config
            elif pname == "rag_service":
                kwargs[pname] = rag_service
            elif p.default is inspect.Parameter.empty:
                kwargs[pname] = None
                logger.warning(
                    "[bootstrap] %s.%s sin resolución explícita — None",
                    cls.__name__, pname,
                )
        agents.append(cls(**kwargs))
        logger.info("[bootstrap] agente cableado: %s", agents[-1].agent_name)

    # MCP transport (registration with W-2b dedupe guard + F-2b fix)
    mcp = FastMCP(name="Castillo Country Club MCP", version="0.2.0")
    total_tools = 0
    seen: set[str] = set()
    for agent in agents:
        if agent.agent_name in seen:
            logger.warning("[bootstrap] agente duplicado ignorado: %s", agent.agent_name)
            continue
        seen.add(agent.agent_name)
        count = agent.register_with_mcp(mcp)
        total_tools += count
        logger.info("Agent registered: %s (%d tools)", agent.agent_name, count)

    registry = AgentRegistry(agents)

    # B0.5 — close the HITL loop
    for agent_name, tool_name, method_name in _EXECUTOR_BINDINGS:
        target = next((a for a in agents if a.agent_name == agent_name), None)
        if target is None:
            logger.warning("[bootstrap] executor: agente '%s' no encontrado", agent_name)
            continue
        try:
            approval_engine.register_executor(
                agent_name, tool_name, _bind_executor(target, method_name)
            )
            logger.info(
                "[bootstrap] executor HITL: %s.%s → %s",
                agent_name, tool_name, method_name,
            )
        except AttributeError as exc:
            logger.warning("[bootstrap] executor omitido: %s", exc)

    logger.info(
        "Runtime listo: %d agentes · %d tools · %d executores HITL",
        len(agents), total_tools, len(_EXECUTOR_BINDINGS),
    )
    return Runtime(
        agents=agents,
        registry=registry,
        mcp=mcp,
        approval_engine=approval_engine,
        claude_service=claude_service,
        notifier=notifier,
    )


_RUNTIME: Optional[Runtime] = None


def get_runtime() -> Runtime:
    """Process-wide singleton (tests may call build_runtime directly)."""
    global _RUNTIME
    if _RUNTIME is None:
        _RUNTIME = build_runtime()
    return _RUNTIME

