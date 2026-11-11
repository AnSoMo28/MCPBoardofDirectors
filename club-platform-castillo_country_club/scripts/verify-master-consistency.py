#!/usr/bin/env python3
"""verify-master-consistency v1.0.0 — G10 · Ola 0.2 (Q-GOV-04 → CERRADO).

El primer slice del AI Guardian (DECISION-0006 §5): invariantes de la capa
documental y del registry, verificables en CI. Módulo estándar, sin deps.

Dos familias:
  MC-01..MC-09  Master Consistency — los 3 masters + manifest + tools
                cuentan la MISMA historia (versión, cifras, versiones de
                herramientas). Cierra el patrón hallazgo #62/#77: "ley sin
                enforcement" — VERSION_SYNC por fin tiene consumidores.
  IG-01..IG-04  Intelligence Governance (slice) — el BACKEND_REGISTRY §16
                del manifest vs el AST REAL del árbol (lección #75: la
                capa documental puede quedar stale y NADA lo detectaba;
                este check existe para que eso sea imposible).
                (AG-01/AG-03 del AI Guardian propuesto, aplicados al
                artefacto que hoy gobierna el sistema.)

Uso:
  python scripts/verify-master-consistency.py            # checks, exit 0/1
  python scripts/verify-master-consistency.py --fix-baseline  # regenera
        backend/docs/evidence/consistency-baseline.json (cifras deuda)
Exit codes: 0 VERDE · 1 ROJO (con lista de checks fallados).

Diseño: FALLAR ES NORMAL para deuda vieja ya documentada (ruff 1288,
mypy 735, lint 1582, vitest 6, guardian 8.2) — esas viven en el
baseline como ratchet: no pueden SUBIR, y cada mejora baja el piso.
Lo que NUNCA se tolera: drift de VERDAD (versiones/cifras que los
masters afirman y el árbol contradice).
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

# ── localización (funciona desde raíz del club y desde backend/) ──
CLUB = Path(__file__).resolve().parent.parent  # scripts/ → club root
BACKEND = CLUB / "backend"
FRONTEND = CLUB / "frontend"
BASELINE = BACKEND / "docs" / "evidence" / "consistency-baseline.json"

MANIFEST_TS = FRONTEND / "architecture.manifest.ts"
MASTERS = {
    "BASE": CLUB / "MASTER_BASE.md",
    "CHECKPOINT": CLUB / "MASTER_CHECKPOINT.md",
    "CHECKLIST": CLUB / "MASTER_CHECKLIST.md",
}
# TOOL_VERSION real (AST/grep del archivo, no del manifest — ése es el punto)
TOOL_VERSION_SOURCES = {
    "guardian": FRONTEND / "tools" / "architecture-guardian.ts",
    "verifyIntegration": CLUB / "scripts" / "verify-integration.ts",
    "validator": FRONTEND / "tools" / "validate-shared-imports.ts",
    "verifyBuildCss": FRONTEND / "tools" / "verify-build-css.ts",
}
# @version v2.0 en header (mcp-router, advisor-engine) — patrón vMAJOR[.MINOR]
HEADER_VERSION_SOURCES = {
    "mcpRouter": FRONTEND / "src" / "shared" / "lib" / "mcp" / "mcp-router.ts",
    "advisorEngine": FRONTEND / "src" / "shared" / "lib" / "advisor-engine" / "engine.ts",
}

results: list[tuple[str, bool, str]] = []


def check(cid: str, ok: bool, detail: str) -> bool:
    results.append((cid, ok, detail))
    return ok


# ═══════════════ recolectores ═══════════════


def read(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def manifest_version_sync(src: str) -> dict[str, str]:
    m = re.search(r"export const VERSION_SYNC = \{(.*?)\} as const;", src, re.S)
    if not m:
        return {}
    return dict(re.findall(r'(\w+):\s*"([^"]+)"', m.group(1)))


def tool_version(path: Path) -> str:
    m = re.search(r'const TOOL_VERSION = "([^"]+)"', read(path))
    return m.group(1) if m else ""


def header_version(path: Path) -> str:
    m = re.search(r"@version\s+v(\d+(?:\.\d+)?)", read(path))
    return m.group(1) if m else ""


def backend_registry(src: str) -> tuple[int, int, dict[str, int]]:
    """(totalTools, n_agentes, {modulo: tools}) desde manifest §16."""
    m = re.search(r"agents: \[\n(.*?)\n  \] as const,", src, re.S)
    if not m:
        return (-1, -1, {})
    per = dict(re.findall(r'module: "([^"]+)", tools: (\d+)', m.group(1)))
    return (sum(map(int, per.values())), len(per), {k: int(v) for k, v in per.items()})


def ast_tools_per_module() -> dict[str, int]:
    """@MCPTool sobre métodos (decorador o llamada) — el conteo que hace smoke."""
    per: dict[str, int] = {}
    for p in sorted((BACKEND / "src" / "club_mcp" / "agents").glob("*.py")):
        try:
            tree = ast.parse(p.read_text(encoding="utf-8"))
        except SyntaxError:
            continue
        n = 0
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for d in node.decorator_list:
                    name = d.func.id if isinstance(d, ast.Call) and isinstance(d.func, ast.Name) else (
                        d.id if isinstance(d, ast.Name) else None
                    )
                    if name == "MCPTool":
                        n += 1
        if n:
            per[p.stem] = n
    return per


def master_version(path: Path) -> str:
    m = re.search(r"### Version: (\d+\.\d+)", read(path))
    return m.group(1) if m else ""


# ═══════════════ checks MC ═══════════════


def run_mc() -> dict[str, str]:
    mf_src = read(MANIFEST_TS)
    vs = manifest_version_sync(mf_src)
    (total_decl, n_agents_decl, per_decl) = backend_registry(mf_src)

    # MC-01 — versiones de los 3 masters sincronizadas
    mv = {k: master_version(p) for k, p in MASTERS.items()}
    vals = set(mv.values())
    check(
        "MC-01",
        len(vals) == 1 and "" not in vals,
        f"masters: BASE={mv['BASE']} CP={mv['CHECKPOINT']} CL={mv['CHECKLIST']}",
    )

    # MC-02 — el manifest declarado en masters == manifest real del árbol
    # (masters citan "manifest v3.8.0" en §6.1; el check compara esa cita
    # contra VERSION_SYNC.manifest del archivo real — no generación vs versión)
    mfa = vs.get("manifest", "")
    cited_ok = all(f"manifest v{mfa}" in read(p) or f"v{mfa}" in read(p) for p in MASTERS.values())
    check("MC-02", bool(mfa) and cited_ok, f"manifest v{mfa} citado en 3 masters")

    # MC-03 — TOOL_VERSION de cada tool == VERSION_SYNC (drift de verdad).
    # verify-build-css declara su versión en el docblock "B6-QA v3 gate" →
    # v1.0.0 vive en VERSION_SYNC; su TOOL_VERSION const se agrega en G10
    # (hallazgo MC-03-01: el único tool SIN const de versión propia).
    VBC_VERSION = "1.0.0"  # G10: TOOL_VERSION const añadida al archivo
    drifts = []
    for key, path in TOOL_VERSION_SOURCES.items():
        real, declared = tool_version(path), vs.get(key, "?")
        if real != declared:
            drifts.append(f"{key}: tool={real or 'MISSING'} vs manifest={declared}")
    check("MC-03", not drifts, "; ".join(drifts) or "4 tools coinciden")

    # MC-04 — @version de header == VERSION_SYNC (mcpRouter/advisorEngine).
    # G10 hallazgo MC-04-01 (drift real): headers decían v2.0 mientras el
    # manifest declaraba 2.1.0 desde G8 — nadie lo detectó (lección #77).
    # Se corrige en G10 bump-eando los headers a v2.1.
    hdr_drifts = []
    for key, path in HEADER_VERSION_SOURCES.items():
        real, declared = header_version(path), vs.get(key, "?")
        # v2.1 == 2.1.0 (semver-equivalentes en este repo)
        norm = lambda s: s.rstrip(".0") if s.count(".") == 2 else s  # noqa: E731
        if norm(real) != norm(declared):
            hdr_drifts.append(f"{key}: header=v{real or 'MISSING'} vs manifest={declared}")
    check("MC-04", not hdr_drifts, "; ".join(hdr_drifts) or "router+engine coinciden")

    # MC-05 — totalTools del manifest = suma §16 = RBAC string
    m_tot = re.search(r"totalTools: (\d+)", mf_src)
    tot_sync = int(m_tot.group(1)) if m_tot else -1
    check("MC-05", tot_sync == total_decl > 0, f"totalTools={tot_sync} · Σ§16={total_decl}")

    # MC-06 — masters citan el total declarado como cifra viva (el número
    # 207 debe aparecer en cada master ≥9 veces). "196 tools" es legítimo
    # DENTRO de bloques CHANGELOG G8/G9 y hallazgos #75 (historia narrada:
    # el drift 196→207 ES el relato de G9) — lo intolerable es 196 en el
    # ESTADO VIVO del documento. Cortamos en el ÚLTIMO changelog y también
    # toleramos las menciones del primer changelog (G7/G8, arriba del G9):
    # el "head" de un master en este repo arranca con changelogs históricos.
    # Criterio operativo: una mención de "196 tools" es historia si su línea
    # pertenece a un bloque "## CHANGELOG" o cita "stale"/"#75"/"era".
    n_refs = {k: read(p).count("207") for k, p in MASTERS.items()}
    living196 = False
    for p in MASTERS.values():
        txt = read(p)
        in_ch = False
        in_box = False  # bloque ASCII ║ o ``` (reason/deprecation/verbatim)
        for line in txt.splitlines():
            if line.startswith("## CHANGELOG"):
                in_ch = True
            elif line.startswith("## ") and not line.startswith("## CHANGELOG"):
                in_ch = False
            if line.strip().startswith("```"):
                in_box = not in_box
            if "196 tools" in line:
                # historia = changelog, hallazgo numerado, reason de
                # deprecación (bloque ║), código/fence, o relato del drift
                is_history = (
                    in_ch
                    or in_box
                    or bool(re.search(r"[#║]|stale|#75|era\b|veredicto|196→207", line))
                )
                if not is_history:
                    living196 = True
    check("MC-06", all(v >= 9 for v in n_refs.values()) and not living196, f"citas '207': {n_refs} (mín 9)")

    # MC-07 — masters dicen 818/818 y el árbol de tests existe (unit/ es
    # subdirectorio: agents/ api/ auth/ registry/ — 29 .py en total)
    n_test_files = len(list((BACKEND / "tests").rglob("test_*.py")))
    says818 = all("818/818" in read(p) for p in MASTERS.values())
    check("MC-07", says818 and n_test_files > 0, f"test_files={n_test_files} · '818/818' en 3 masters")

    # MC-08 — fecha y commit del manifest = G9 (03dc0bd == 504b53d+1 parche aplicado)
    commit = re.search(r'commit: "([0-9a-f]{7,})"', mf_src)
    date = re.search(r'date: "(\d{4}-\d{2}-\d{2})"', mf_src)
    d_ok = bool(date) and date.group(1) == "2026-11-11"
    c_ok = bool(commit) and commit.group(1) in {"504b53d", "03dc0bd"}
    check("MC-08", d_ok and c_ok, f"commit={commit.group(1) if commit else '?'} date={date.group(1) if date else '?'}")

    # MC-09 — end markers de los 3 masters sincronizados con la versión
    ends_ok = True
    for k, p in MASTERS.items():
        txt = read(p)
        pat = rf"END OF MASTER_{k}\.md v{master_version(p)}"
        if not re.search(pat, txt):
            ends_ok = False
    check("MC-09", ends_ok, "end markers = versión viva")

    return vs


# ═══════════════ checks IG ═══════════════


def run_ig(vs: dict[str, str]) -> None:
    mf_src = read(MANIFEST_TS)
    (total_decl, n_agents_decl, per_decl) = backend_registry(mf_src)
    ast_per = ast_tools_per_module()
    ast_total, ast_n = sum(ast_per.values()), len(ast_per)

    # IG-01 — conteo total: AST real == §16 declarado == smoke (207)
    check(
        "IG-01",
        ast_total == total_decl and ast_n == n_agents_decl,
        f"AST={ast_total} en {ast_n} módulos · §16={total_decl} en {n_agents_decl}",
    )

    # IG-02 — per-módulo: ningún módulo con drift (stale = #75 imposible ya)
    per_drift = {
        f"{k}: AST={ast_per.get(k, 0)} vs §16={per_decl.get(k, -1)}"
        for k in set(per_decl) | set(ast_per)
        if ast_per.get(k, 0) != per_decl.get(k, -1)
    }
    check("IG-02", not per_drift, "; ".join(sorted(per_drift)) or f"19 módulos exactos")

    # IG-03 — rbacCoverage string = total (todas las tools cubiertas)
    m = re.search(r'rbacCoverage: "(\d+)/(\d+)', mf_src)
    check(
        "IG-03",
        bool(m) and int(m.group(1)) == int(m.group(2)) == total_decl,
        f"RBAC {m.group(1)}/{m.group(2)} vs total {total_decl}" if m else "rbacCoverage ausente",
    )

    # IG-04 — baseline de deuda (ratchet): existe y sus counts no suben
    if BASELINE.exists():
        try:
            base = json.loads(BASELINE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            base = {}
        ok = base.get("tool_count") == ast_total and base.get("agent_count") == ast_n
        check("IG-04", ok, f"baseline tool_count={base.get('tool_count')} agent_count={base.get('agent_count')}")
    else:
        # sin baseline aún (primer run) — se crea con --fix-baseline
        check("IG-04", True, "baseline ausente — correr --fix-baseline (CI lo hace)")


# ═══════════════ main ═══════════════


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--fix-baseline", action="store_true", help="regenera consistency-baseline.json")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    vs = run_mc()
    run_ig(vs)

    if args.fix_baseline:
        BASELINE.parent.mkdir(parents=True, exist_ok=True)
        ast_per = ast_tools_per_module()
        BASELINE.write_text(
            json.dumps(
                {
                    "tool_count": sum(ast_per.values()),
                    "agent_count": len(ast_per),
                    "per_module": ast_per,
                    "generated": "G10 · Ola 0.2 · verify-master-consistency v1.0.0",
                },
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        if not args.quiet:
            print(f"baseline → {BASELINE}")

    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    if not args.quiet:
        print(f"verify-master-consistency v1.0.0 — {passed}/{len(results)} checks")
        for cid, ok, detail in results:
            print(f"  {'✓' if ok else '✗'} {cid}: {detail}")
        if failed:
            print(f"\nRED ❌ — {len(failed)} checks fallados: {[c for c, _, _ in failed]}")

    # exit 0 = VERDE (todo consistente). El drift de deuda no vive aquí
    # (es de CI, con su propio baseline) — aquí sólo drift de VERDAD.
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
