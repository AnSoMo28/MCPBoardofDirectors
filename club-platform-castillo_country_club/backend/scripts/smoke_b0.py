"""B0 smoke gate — proves the backend is ALIVE before migrating anything.

Run: cd backend && PYTHONPATH=src python scripts/smoke_b0.py
Exit 0 = verde. Cualquier FAIL es accionable: pegarlo en el chat.
"""
from __future__ import annotations

import asyncio
import sys
import traceback

FAILURES: list[str] = []


def check(label: str, cond: bool, extra: str = "") -> None:
    status = "PASS" if cond else "FAIL"
    suffix = f" — {extra}" if (extra and not cond) else ""
    print(f"  [{status}] {label}{suffix}")
    if not cond:
        FAILURES.append(label)


def main() -> None:
    from club_mcp.bootstrap import get_runtime
    from club_mcp.hitl.approval_types import ApprovalLevel

    rt = get_runtime()

    # ── Composición ──
    names = [a.agent_name for a in rt.agents]
    check("19 agentes instanciados", len(names) == 19, f"{len(names)}: {sorted(names)}")
    for expected in ("member_360", "ml_intelligence"):
        check(f"agente {expected} presente (F-8)", expected in names)
    check("agent_name duplicados = 0", len(names) == len(set(names)))

    # ── Registro ──
    check("197 tools en registro", rt.registry.total_tools == 197, f"got {rt.registry.total_tools}")
    print(
        "  · tools/agent:",
        ", ".join(f"{a}={len(t)}" for a, t in sorted(rt.registry.tools_by_agent.items())),
    )

    # ── Resolve: directo + compat ──
    r = rt.registry.resolve("family_profile", "family_get_profile")
    check("resolve directo", r.spec.name == "family_get_profile" and not r.via_compat)

    r = rt.registry.resolve("families", "get_family")
    check(
        "compat families.get_family",
        r.spec.agent == "family_profile" and r.spec.name == "family_get_profile" and r.via_compat,
    )
    r = rt.registry.resolve("hitl", "approve_request")
    check("compat hitl.approve_request", r.spec.agent == "executive_dashboard" and r.via_compat)
    r = rt.registry.resolve("facilities", "get_reservations")
    check("compat facilities.get_reservations", r.spec.name == "get_facility_reservations")
    r = rt.registry.resolve("executive_dashboard", "generate_ai_analysis")
    check("cross-agent generate_ai_analysis → finance", r.spec.agent == "finance")

    # B2: reports.get_board_report registrado (read AUTO + create-on-demand)
    r = rt.registry.resolve("reports", "get_board_report")
    check(
        "compat reports.get_board_report → executive_dashboard (B2)",
        r.spec.agent == "executive_dashboard" and r.spec.name == "get_board_report" and r.via_compat,
    )

    # ── RBAC ──
    from club_mcp.auth.rbac import Permission, check_permission, permission_for

    check(
        "approve_request → APPROVE_REQUESTS",
        permission_for("executive_dashboard", "approve_request", "auto") == Permission.APPROVE_REQUESTS,
    )
    check("socio puede submit_survey", check_permission("socio", Permission.SUBMIT_SURVEY))
    check("socio NO puede view_financial", not check_permission("socio", Permission.VIEW_FINANCIAL))
    check("admin puede approve_requests", check_permission("admin", Permission.APPROVE_REQUESTS))

    missing = [
        (a, s.name)
        for a, tools in rt.registry.tools_by_agent.items()
        for s in tools.values()
        if permission_for(a, s.name, s.approval) is None
    ]
    check("RBAC cubre 197/197", not missing, f"faltan: {missing[:5]}")

    # ── HITL closure (B0.5) ──
    async def hitl_flow():
        engine = rt.approval_engine
        req = await engine.create_request(
            agent="finance",
            tool="finance_invoice_create",
            params={
                "family_id": "fam-smoke-001",
                "items": [{"description": "Smoke test", "quantity": 1, "unit_price": 100.0}],
                "due_date": "2026-12-01",
                "notes": "smoke",
                "tax_rate": 13.0,
            },
            requested_by="smoke",
            approval_level=ApprovalLevel.HITL,
        )
        approved = await engine.approve(request_id=req.request_id, approved_by="smoke-admin")
        return approved, engine.get_execution(req.request_id)

    approved, execution = asyncio.run(hitl_flow())
    check("approve() ejecuta el executor", execution is not None and execution.get("status") == "success", f"execution={execution}")

    # ── App self-wired (F-3) ──
    from club_mcp.api.app import app

    check("app.state.agents == 19", app.state.agents_count == 19, str(app.state.agents_count))
    check("app.state.tools == 197", app.state.tools_count == 197, str(app.state.tools_count))

    # ── HTTP (si httpx está disponible) ──
    try:
        from fastapi.testclient import TestClient
    except Exception:
        print("  [SKIP] fastapi.testclient no disponible — checks internos suficientes")
        TestClient = None

    if TestClient is not None:
        client = TestClient(app)
        resp = client.get("/api/health")
        check("GET /api/health 200", resp.status_code == 200, str(resp.status_code))
        resp = client.get("/api/agents")
        check(
            "GET /api/agents catalog 200 + 197 tools",
            resp.status_code == 200 and resp.json().get("total_tools") == 197,
            f"{resp.status_code} {str(resp.json())[:200]}",
        )
        resp = client.post(
            "/api/agents/family_profile/family_get_profile",
            json={"params": {"family_id": "x"}},
        )
        check("POST sin token → 401", resp.status_code == 401, str(resp.status_code))

    print()
    if FAILURES:
        print(f"✗ B0 SMOKE: {len(FAILURES)} fallo(s): {FAILURES}")
        sys.exit(1)
    print("✓ B0 SMOKE VERDE: 19 agentes · 197 tools · compat · RBAC 197/197 · HITL cierra")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        sys.exit(2)
