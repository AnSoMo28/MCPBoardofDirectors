#!/usr/bin/env node
/**
 * P2-C3e · VI-14 patch — extractBackendToolNames v2 (motor-based)
 *
 * Implementa la spec VI-14 que salió del veredicto P2-C3d:
 *
 *   1. Inventario motor-based: los tools del backend NO se registran con
 *      decoradores @tool / add_tool (v1 encontró 0). El motor real es
 *      BaseAgent.register_with_mcp() → `for attr_name in dir(self)` →
 *      mcp.tool(name=…)(wrapper)  (base.py:62-86, server.py:138, 18 agentes).
 *      v2 extrae por agente: specs name="…" (kwargs / dict / campo /
 *      ToolSpec posicional), docstrings "TOOLS:", claves de TOOLS={…}/
 *      tool_specs=[…] y —fallback para agentes sin specs (finance)— los
 *      nombres de métodos públicos (exactamente lo que dir(self) registra;
 *      execute_* de HITL y _private excluidos).
 *   2. Normalización de refs: renombres de servers del frontend
 *      (families→family_profile, facilities→facility_management, …) +
 *      convención de clave compuesta del mock (finance_stress_test).
 *   3. Clasificación TOOL-BACKEND / EQUIVALENTE / SERVIDO-POR-MOCK /
 *      CAPACIDAD-SIN-TOOL / DEUDA-REAL; missingBoth se reporta SOLO para
 *      DEUDA-REAL (los falsos positivos del check 6 desaparecen).
 *
 * El parche es quirúrgico y atómico (4 anclas; si falta una, no escribe
 * nada) y crea <vi>.bak-p2c3e antes de tocar el archivo.
 *
 * Uso (desde frontend/):
 *   npx tsx ../scripts/p2c3e_vi14_patch.ts --selftest   # valida el bloque inyectado; no toca nada
 *   npx tsx ../scripts/p2c3e_vi14_patch.ts --dry-run    # muestra el plan sin escribir
 *   npx tsx ../scripts/p2c3e_vi14_patch.ts              # aplica (backup incluido)
 *   npx tsx ../scripts/p2c3e_vi14_patch.ts --vi=<ruta>  # si el VI no está en scripts/
 *
 * Después:  npx tsx scripts/verify-integration.ts --check 6
 * Exit 0 salvo --selftest fallido (exit 1) o anclas no encontradas (exit 2).
 */

import {
  readFileSync, writeFileSync, copyFileSync, existsSync,
  mkdirSync, readdirSync, rmSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ═════════════════════════════════════════════════════════════════════════
// VI14_BLOCK — el código que se inyecta en el VI (reemplaza el extractor v1).
// String.raw para que los escapes de regex sobrevivan literalmente.
// Sin imports, sin backticks, sin ${ }: debe compilar dentro del VI tal cual
// (usa el helper read() que el VI ya define) y standalone en el --selftest.
// ═════════════════════════════════════════════════════════════════════════

const VI14_BLOCK = String.raw`
// ═══ VI-14 · Backend tool extraction v2 (motor-based) — P2-C3 audit ═══
//
// Evidence (P2-C3 audit, 2026-11-04): the backend registers its tools via
// BaseAgent.register_with_mcp(), which iterates dir(self) and calls
// mcp.tool(name=...)(wrapper) — src/club_mcp/agents/base.py:62-86, driven by
// server.py:138 over 18 agents. The v1 scan (@tool decorators, add_tool,
// Tool(name=)) matched ZERO of those patterns in this codebase, so check 6
// degraded to advisory. v2 mirrors the motor instead:
//
//   · per-agent specs: name="..." kwargs, {"name": "..."} dicts,
//     name: str = "..." fields and ToolSpec("...") positional declarations
//   · docstring "TOOLS:" blocks (snake tokens)
//   · keys of TOOLS = {...} / tool_specs = [...] literals
//   · fallback for spec-less agents (e.g. finance): public method names —
//     exactly what dir(self) registers. HITL continuations (execute_*),
//     _private and framework names are excluded.
//
// Server taxonomy = snake_case(agent class minus "Agent"), which matches the
// mock-registry blocks 1:1 (family_profile, facility_management, finance...).

interface Vi14ToolHit { server: string; name: string; sources: string[]; file: string; line: number; }
interface Vi14DefHit { file: string; line: number; }
interface Vi14BackendIndex {
  flat: Set<string>;
  byServer: Map<string, Set<string>>;
  hits: Vi14ToolHit[];
  defs: Map<string, Vi14DefHit[]>;
  agents: string[];
}

/** Frontend server names → real platform servers (P2-C3 taxonomy drift). */
const VI14_SERVER_RENAMES: Record<string, string[]> = {
  families: ["family_profile"],
  facilities: ["facility_management"],
  guests: ["guest_management"],
  engagement: ["member_engagement", "satisfaction"],
  reports: ["executive_dashboard"],
};

/** snake_case(agent) → mock block name where they differ. */
const VI14_AGENT_SERVER_ALIASES: Record<string, string> = {
  event_orchestrator: "events",
};

/** Method names never registered as tools (HITL continuations, helpers). */
const VI14_METHOD_EXCLUDE = new Set([
  "wrapper", "handler", "callback", "main", "run", "call", "get", "setup", "teardown",
]);

/** Audited equivalences (P2-C3b/c/d evidence, 2026-11-04): "server.tool" → real names. */
const VI14_EQUIVALENCES: Record<string, string[]> = {
  "communication.get_communication_history": ["get_communication_analytics", "get_notification_history"],
  "engagement.get_survey_results": ["analyze_event_satisfaction", "generate_satisfaction_report"],
  "engagement.get_active_survey": ["get_survey_for_event"],
  "facilities.list_reservations": ["get_facility_reservations"],
  "facilities.get_facility": [],
  "facilities.get_utilization": ["get_amenity_utilization"],
  "facilities.get_reservations": ["get_facility_reservations"],
  "facilities.list_available_facilities": ["manage_facilities"],
  "finance.get_family_account": ["finance_account_status"],
  "finance.get_transactions": [],
  "finance.get_invoices": ["finance_invoice_create"],
  "guests.get_today_guests": [],
  "guests.get_today_summary": [],
  "families.search_families": ["family_search"],
  "families.get_family": ["family_get_profile"],
  "families.list_families": ["family_search"],
  "reports.get_board_report": ["generate_quarterly_board_report", "send_board_package"],
  "reports.get_risk_matrix": ["get_member_risk_assessment"],
  "finance.narrative_generate": ["finance_narrative_generate", "generate_insight_narrative"],
  "finance.scenario_simulate": ["finance_scenario_simulate", "simulate_scenario"],
  "finance.stress_test": ["finance_stress_test"],
  "finance.decision_simulate": ["finance_decision_simulate"],
};

function vi14Snake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Za-z])([0-9])/g, "$1_$2")
    .toLowerCase();
}

function vi14AgentServer(className: string): string {
  const base = /Agent$/.test(className) ? className.slice(0, -5) : className;
  const snake = vi14Snake(base);
  return VI14_AGENT_SERVER_ALIASES[snake] ?? snake;
}

function vi14Disp(file: string): string {
  const parts = file.split(/[\\/]/);
  return parts.length >= 2 ? parts.slice(-2).join("/") : file;
}

function extractBackendToolNames(pyFiles: string[]): Vi14BackendIndex {
  const flat = new Set<string>();
  const byServer = new Map<string, Set<string>>();
  const defs = new Map<string, Vi14DefHit[]>();
  const hits: Vi14ToolHit[] = [];
  const agents: string[] = [];

  const CLASS_RE = /^[ \t]*class[ \t]+([A-Za-z_]\w*)/;
  const DEF_RE = /^[ \t]*(?:async[ \t]+)?def[ \t]+([A-Za-z_]\w*)/;
  const TOOLS_DOC_RE = /\bTOOLS[ \t]*:/;
  const TOOLS_ASG_RE = /\b(?:TOOLS|tool_specs|TOOL_SPECS|tool_registry|_TOOLS)[ \t]*=[ \t]*[{[]/;
  const SNAKE_TOKEN_RE = /([a-z][a-z0-9]*_[a-z0-9_]{2,})/g;
  const NAME_PATTERNS: RegExp[] = [
    /\bname[ \t]*=[ \t]*["']([a-z][a-z0-9_]{3,50})["']/g,
    /["']name["'][ \t]*:[ \t]*["']([a-z][a-z0-9_]{3,50})["']/g,
    /\bname[ \t]*:[ \t]*[A-Za-z_]\w*[ \t]*=[ \t]*["']([a-z][a-z0-9_]{3,50})["']/g,
    /\b(?:ToolSpec|Tool)[ \t]*\([ \t]*["']([a-z][a-z0-9_]{3,50})["']/g,
  ];
  const DICT_KEY_RE = /^[ \t]*["']?([a-z][a-z0-9_]{5,60})["']?[ \t]*:/;
  const LIST_ITEM_RE = /^[ \t]*["']?([a-z][a-z0-9_]{5,60})["']?[ \t]*,?[ \t]*$/;

  for (const file of pyFiles) {
    const content = read(file);
    if (!content) continue;
    const lines = content.split("\n");
    const disp = vi14Disp(file);

    // capability map: every public def anywhere (agent methods, repo functions)
    for (let i = 0; i < lines.length; i++) {
      const m = DEF_RE.exec(lines[i]!);
      if (!m) continue;
      const n = m[1]!;
      if (n.startsWith("_") || VI14_METHOD_EXCLUDE.has(n)) continue;
      const arr = defs.get(n) ?? [];
      if (arr.length < 4) arr.push({ file: disp, line: i + 1 });
      defs.set(n, arr);
    }

    // agent classes in this file (BaseAgent is the framework, not a server)
    const agentClasses: string[] = [];
    for (const l of lines) {
      const m = CLASS_RE.exec(l);
      if (m && /Agent$/.test(m[1]!) && m[1] !== "BaseAgent") agentClasses.push(m[1]!);
    }
    if (agentClasses.length === 0) continue;

    const server = vi14AgentServer(agentClasses[0]!);
    if (!agents.includes(server)) agents.push(server);

    const authoritative = new Map<string, { sources: string[]; line: number }>();
    const record = (name: string, source: string, line: number): void => {
      const cur = authoritative.get(name);
      if (cur) {
        if (!cur.sources.includes(source)) cur.sources.push(source);
        if (line < cur.line) cur.line = line;
      } else {
        authoritative.set(name, { sources: [source], line });
      }
    };

    // 1) specs: name= in any of the four declaration styles
    for (let i = 0; i < lines.length; i++) {
      for (const re of NAME_PATTERNS) {
        re.lastIndex = 0;
        const m = re.exec(lines[i]!);
        if (m) record(m[1]!, "spec name=", i + 1);
      }
    }

    // 2) docstring TOOLS: blocks
    for (let i = 0; i < lines.length; i++) {
      if (!TOOLS_DOC_RE.test(lines[i]!)) continue;
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 16); j++) {
        const w = lines[j]!;
        if (/"""/.test(w)) break;
        for (const m of w.matchAll(SNAKE_TOKEN_RE)) {
          record(m[1]!, "docstring TOOLS:", j + 1);
        }
      }
    }

    // 3) keys of TOOLS = {...} / tool_specs = [...]
    for (let i = 0; i < lines.length; i++) {
      if (!TOOLS_ASG_RE.test(lines[i]!)) continue;
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 40); j++) {
        const w = lines[j]!;
        if (/^[ \t]*[}\]][ \t]*,?[ \t]*$/.test(w)) break;
        const mk = DICT_KEY_RE.exec(w);
        if (mk) {
          record(mk[1]!, "dict TOOLS=", j + 1);
          continue;
        }
        const ml = LIST_ITEM_RE.exec(w);
        if (ml) record(ml[1]!, "list tool_specs=", j + 1);
      }
    }

    // 4) method fallback ONLY for spec-less agents — mirrors dir(self)
    if (authoritative.size === 0) {
      for (let i = 0; i < lines.length; i++) {
        const m = DEF_RE.exec(lines[i]!);
        if (!m) continue;
        const n = m[1]!;
        if (n.startsWith("_") || /^execute_/.test(n) || VI14_METHOD_EXCLUDE.has(n)) continue;
        record(n, "method (dir-motor fallback)", i + 1);
      }
    }

    const names = byServer.get(server) ?? new Set<string>();
    for (const [name, info] of authoritative) {
      flat.add(name);
      names.add(name);
      hits.push({ server, name, sources: info.sources.slice(), file: disp, line: info.line });
    }
    byServer.set(server, names);
  }

  return { flat, byServer, hits, defs, agents };
}

interface Vi14RefCandidate { server: string; tool: string; via: string; }

function vi14RefCandidates(server: string, tool: string): Vi14RefCandidate[] {
  const out: Vi14RefCandidate[] = [{ server, tool, via: "exact" }];
  for (const s of VI14_SERVER_RENAMES[server] ?? []) {
    out.push({ server: s, tool, via: "server rename " + server + "->" + s });
  }
  const servers = [server, ...(VI14_SERVER_RENAMES[server] ?? [])];
  for (const s of servers) {
    out.push({ server: s, tool: s + "_" + tool, via: "compound " + s + "_" + tool });
  }
  return out;
}

type Vi14Status = "tool-backend" | "equivalente" | "servido-por-mock" | "capacidad-sin-tool" | "deuda-real";

interface Vi14Classification {
  status: Vi14Status;
  real: string | null;
  evidence: string[];
}

function vi14ClassifyRef(
  server: string,
  tool: string,
  backend: Vi14BackendIndex,
  registryKeys: Set<string>,
): Vi14Classification {
  const dotted = server + "." + tool;
  const seed = VI14_EQUIVALENCES[dotted] ?? [];
  const cands = vi14RefCandidates(server, tool);

  // 1) the tool exists in the backend under the ref (renamed) server
  for (const c of cands) {
    if (backend.byServer.get(c.server)?.has(c.tool)) {
      return { status: "tool-backend", real: c.server + "." + c.tool, evidence: [c.via + ": " + c.server + "::" + c.tool] };
    }
  }

  // 2) audited equivalence registered in the backend (any server)
  for (const n of seed) {
    for (const [srv, set] of backend.byServer) {
      if (set.has(n)) {
        return { status: "equivalente", real: srv + "." + n, evidence: ["audited equivalence: " + srv + "::" + n] };
      }
    }
  }

  // 3) mock coverage: exact / renamed / compound / audited equivalence
  for (const c of cands) {
    if (registryKeys.has(c.server + "::" + c.tool)) {
      return { status: "servido-por-mock", real: c.server + "." + c.tool, evidence: [c.via + ": mock " + c.server + "::" + c.tool] };
    }
  }
  for (const n of seed) {
    for (const k of registryKeys) {
      if (k.endsWith("::" + n)) {
        return { status: "servido-por-mock", real: k.replace("::", "."), evidence: ["audited equivalence in mock: " + k] };
      }
    }
  }

  // 4) capability exists as a def but is not exposed as a tool
  for (const n of [tool, ...seed]) {
    const dh = backend.defs.get(n);
    if (dh && dh.length > 0) {
      return { status: "capacidad-sin-tool", real: null, evidence: ["def " + n + " (" + dh[0]!.file + ":" + dh[0]!.line + ") is not a registered tool"] };
    }
  }

  return { status: "deuda-real", real: null, evidence: ["no trace in specs, docstrings, methods, defs or mock"] };
}

export { extractBackendToolNames, vi14ClassifyRef, vi14RefCandidates };
`;

// ═════════════════════════════════════════════════════════════════════════
// NEW_CHECK6 — check 6 reescrito sobre la clasificación VI-14.
// ═════════════════════════════════════════════════════════════════════════

const NEW_CHECK6 = String.raw`
function checkBackendTools(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const idx = ctx.backendTools;
  const degraded = !ctx.backendScanned || idx.flat.size === 0;

  if (!ctx.backendScanned) {
    notes.push("Backend source not found at " + relFrom(ctx.root, ctx.backendSrc) + " — backend coverage is unknown.");
  } else if (idx.flat.size === 0) {
    notes.push(
      "VI-14 v2: backend scanned but no tools extracted from specs, TOOLS: docstrings or agent methods — extraction rules need review.",
    );
  }
  notes.push(
    "VI-14 v2 (motor-based): tools extracted per agent — specs (name=), TOOLS: docstrings, tool_specs keys; spec-less agents expose their public methods (that is what dir(self) registers via BaseAgent.register_with_mcp).",
  );
  notes.push(
    "Server renames applied: families->family_profile, facilities->facility_management, guests->guest_management, engagement->member_engagement/satisfaction, reports->executive_dashboard; mock compound keys (server_tool) recognized.",
  );
  notes.push("Audited equivalence map (P2-C3 audit, 2026-11-04) embedded as VI14_EQUIVALENCES — a ref is only 'missing' when no layer implements it.");

  const counts: Record<Vi14Status, number> = {
    "tool-backend": 0,
    equivalente: 0,
    "servido-por-mock": 0,
    "capacidad-sin-tool": 0,
    "deuda-real": 0,
  };
  const missingBoth = new Map<string, McpQueryRef>();

  for (const q of ctx.mcpQueries) {
    const cls = vi14ClassifyRef(q.server, q.tool, idx, ctx.registryKeys);
    counts[cls.status] += 1;
    if (cls.status === "deuda-real") missingBoth.set(q.server + "::" + q.tool, q);

    if (cls.status === "equivalente") {
      findings.push({
        file: q.file,
        line: q.line,
        message:
          q.server + "." + q.tool + " is called under a name the platform never exposes — the real tool is " +
          cls.real + " (" + cls.evidence.join("; ") + "); rewrite the ref (or alias the mock)",
        severity: "warning",
      });
    } else if (cls.status === "capacidad-sin-tool") {
      findings.push({
        file: q.file,
        line: q.line,
        message:
          q.server + "." + q.tool + " has backend capability but no registered tool — expose it or drop the ref (" +
          cls.evidence.join("; ") + ")",
        severity: "warning",
      });
    } else if (cls.status === "servido-por-mock") {
      findings.push({
        file: q.file,
        line: q.line,
        message: q.server + "." + q.tool + " is mock-only (backend implementation pending) — real name: " + cls.real,
        severity: "info",
      });
    } else if (cls.status === "deuda-real") {
      findings.push({
        file: q.file,
        line: q.line,
        message:
          q.server + "." + q.tool + " exists in neither mock nor backend under any audited name — genuine implementation debt",
        severity: "warning",
      });
    }
  }

  return outcome(
    "backend-tools",
    "6. Tools Missing from Mock AND Backend",
    degraded ? "info" : findings.some((f) => f.severity === "warning") ? "warning" : "info",
    findings,
    [
      ["refs", ctx.mcpQueries.length],
      ["backendTools", idx.flat.size],
      ["backendAgents", idx.agents.length],
      ["toolBackend", counts["tool-backend"]],
      ["equivalente", counts["equivalente"]],
      ["mockOnly", counts["servido-por-mock"]],
      ["capacidadSinTool", counts["capacidad-sin-tool"]],
      ["missingBoth", missingBoth.size],
    ],
    notes,
  );
}
`;

// ═════════════════════════════════════════════════════════════ CLI/utils ═══

function argOf(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : undefined;
}

const VI_ARG = argOf("--vi=");
const DRY_RUN = process.argv.includes("--dry-run");
const SELFTEST = process.argv.includes("--selftest");

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

// ═════════════════════════════════════════════════════════════ selftest ═══

const ST = "/tmp/p2c3e-selftest";

const PY_BASE = `class BaseAgent:
    def __init__(self, repo=None, engine=None, notifier=None):
        self.repo = repo
        self.tool_specs = []

    def register_with_mcp(self, mcp):
        count = 0
        for attr_name in dir(self):
            if attr_name.startswith("_"):
                continue
        return count
`;

const PY_FAMILY = `class FamilyProfileAgent(BaseAgent):
    """
    Agent: family_profile

    TOOLS:
        family_search
        family_get_profile
    """

    def __init__(self, repo, engine, notifier):
        super().__init__(repo, engine, notifier)
        self.tool_specs = [
            {"name": "family_search", "description": "Buscar familias"},
            {"name": "family_get_profile", "description": "Perfil de familia"},
        ]

    async def search_families(self, params):
        return await self.repo.search_families(params)

    async def get_family_profile(self, family_id):
        return await self.repo.get_family(family_id)
`;

const PY_FACILITY = `class FacilityManagementAgent(BaseAgent):
    """
    TOOLS:
        get_facility_reservations
        get_amenity_utilization
    """

    async def get_facility_reservations(self, facility_id):
        return []

    async def get_amenity_utilization(self):
        return {}
`;

const PY_FINANCE = `class FinanceAgent(BaseAgent):
    def __init__(self, repo, engine, notifier):
        super().__init__(repo, engine, notifier)

    async def finance_account_status(self, family_id):
        return {}

    async def finance_invoice_create(self, data):
        return {}

    async def execute_invoice_create(self, approval_id):
        return {}

    async def _private_helper(self):
        return None
`;

const PY_GUEST = `class GuestManagementAgent(BaseAgent):
    """
    TOOLS:
        register_guest
        manage_trial_memberships
    """

    async def register_guest(self, payload):
        return {}

    async def manage_trial_memberships(self, action, payload):
        return {}
`;

const PY_COMM = `class CommunicationAgent(BaseAgent):
    def __init__(self, repo, engine, notifier):
        super().__init__(repo, engine, notifier)
        self.tool_specs = [
            ToolSpec(name="get_communication_analytics", description="Analitica"),
            ToolSpec("get_notification_history", "Historial"),
        ]
`;

const PY_REPO = `class FacilityManagementRepository:
    def get_facility(self, facility_id):
        return {}

    def list_reservations(self, facility_id):
        return []
`;

const PY_SERVER = `from fastmcp import FastMCP


def create_mcp_server() -> FastMCP:
    mcp = FastMCP(name="Castillo Country Club MCP", version="0.1.0")
    agents = []
    for agent in agents:
        count = agent.register_with_mcp(mcp)
    return mcp


def main() -> None:
    mcp = create_mcp_server()
    mcp.run()
`;

async function selftest(): Promise<void> {
  rmSync(ST, { recursive: true, force: true });
  const agDir = join(ST, "backend", "src", "club_mcp", "agents");
  const repoDir = join(ST, "backend", "src", "club_mcp", "db", "repositories");
  mkdirSync(agDir, { recursive: true });
  mkdirSync(repoDir, { recursive: true });
  writeFileSync(join(agDir, "base.py"), PY_BASE);
  writeFileSync(join(agDir, "family_profile.py"), PY_FAMILY);
  writeFileSync(join(agDir, "facility_management_agent.py"), PY_FACILITY);
  writeFileSync(join(agDir, "finance.py"), PY_FINANCE);
  writeFileSync(join(agDir, "guest_management_agent.py"), PY_GUEST);
  writeFileSync(join(agDir, "communication_agent.py"), PY_COMM);
  writeFileSync(join(repoDir, "facility_management_repo.py"), PY_REPO);
  writeFileSync(join(ST, "backend", "src", "club_mcp", "server.py"), PY_SERVER);

  const pyFiles = [
    join(agDir, "base.py"),
    join(agDir, "family_profile.py"),
    join(agDir, "facility_management_agent.py"),
    join(agDir, "finance.py"),
    join(agDir, "guest_management_agent.py"),
    join(agDir, "communication_agent.py"),
    join(repoDir, "facility_management_repo.py"),
    join(ST, "backend", "src", "club_mcp", "server.py"),
  ];

  // mismo bloque que se inyecta, con un prelude que define read()
  const prelude =
    'import { readFileSync } from "node:fs";\n' +
    "const read = (p: string): string | null => { try { return readFileSync(p, \"utf-8\"); } catch { return null; } };\n\n";
  const blockFile = join(ST, "vi14-block.ts");
  writeFileSync(blockFile, prelude + VI14_BLOCK + "\n");
  const mod = await import(pathToFileURL(blockFile).href);

  const idx = mod.extractBackendToolNames(pyFiles);
  const registryKeys = new Set<string>([
    "finance::finance_account_status",
    "finance::finance_stress_test",
    "finance::finance_narrative_generate",
    "family_profile::family_search",
    "family_profile::family_get_profile",
    "facility_management::get_facility_reservations",
    "guest_management::manage_trial_memberships",
    "communication::get_communication_analytics",
  ]);

  const sorted = (srv: string): string[] => [...(idx.byServer.get(srv) ?? [])].sort();
  const cls = (s: string, t: string) => mod.vi14ClassifyRef(s, t, idx, registryKeys);

  const results: Array<[string, boolean]> = [];
  const check = (name: string, cond: boolean): void => { results.push([name, cond]); };

  check("family_profile → {family_get_profile, family_search} (specs/docstring autoritativos; search_families NO es tool)",
    JSON.stringify(sorted("family_profile")) === JSON.stringify(["family_get_profile", "family_search"]));
  check("finance → métodos públicos {finance_account_status, finance_invoice_create}",
    sorted("finance").includes("finance_account_status") && sorted("finance").includes("finance_invoice_create"));
  check("finance NO registra execute_invoice_create ni _private_helper",
    !sorted("finance").includes("execute_invoice_create") && !sorted("finance").includes("_private_helper"));
  check("facility_management → {get_amenity_utilization, get_facility_reservations} (docstring)",
    JSON.stringify(sorted("facility_management")) === JSON.stringify(["get_amenity_utilization", "get_facility_reservations"]));
  check("communication → {get_communication_analytics, get_notification_history} (kwargs + posicional)",
    JSON.stringify(sorted("communication")) === JSON.stringify(["get_communication_analytics", "get_notification_history"]));
  check("guest_management → {manage_trial_memberships, register_guest}",
    JSON.stringify(sorted("guest_management")) === JSON.stringify(["manage_trial_memberships", "register_guest"]));
  check("flat.size === 10 y agents === 5", idx.flat.size === 10 && idx.agents.length === 5);
  check("defs tiene get_facility (capacidad en repo)",
    (idx.defs.get("get_facility") ?? []).length > 0);

  check("classify family_profile.family_search → tool-backend",
    cls("family_profile", "family_search").status === "tool-backend");
  check("classify finance.finance_account_status → tool-backend",
    cls("finance", "finance_account_status").status === "tool-backend");
    (() => { const r = cls("families", "search_families"); return r.status === "equivalente" && r.real === "family_profile.family_search"; })());
  check("classify facilities.list_reservations → equivalente (get_facility_reservations)",
    (() => { const r = cls("facilities", "list_reservations"); return r.status === "equivalente" && r.real === "facility_management.get_facility_reservations"; })());
  check("classify finance.get_family_account → equivalente (finance_account_status)",
    (() => { const r = cls("finance", "get_family_account"); return r.status === "equivalente" && r.real === "finance.finance_account_status"; })());
  check("classify guests.list_trial_memberships → equivalente (manage_trial_memberships)",
    cls("guests", "list_trial_memberships").status === "equivalente");
  check("classify finance.stress_test → servido-por-mock (clave compuesta)",
    cls("finance", "stress_test").status === "servido-por-mock");
  check("classify finance.narrative_generate → servido-por-mock",
    cls("finance", "narrative_generate").status === "servido-por-mock");
  check("classify facilities.get_facility → capacidad-sin-tool (def en repo)",
    cls("facilities", "get_facility").status === "capacidad-sin-tool");
  check("classify guests.get_today_guests → deuda-real",
    cls("guests", "get_today_guests").status === "deuda-real");

  console.log("P2-C3e · --selftest (bloque VI-14 sobre fixture con la convención real)");
  let failed = 0;
  for (const [name, ok] of results) {
    console.log(`  ${ok ? c.green("PASS") : c.red("FAIL")} · ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\n  inventario: ${[...idx.byServer.entries()].map(([s, n]) => s + "(" + n.size + ")").join(" ")}`);
  console.log(failed === 0 ? c.green(`\n  ${results.length}/${results.length} PASS — el bloque está listo para inyectar`) : c.red(`\n  ${failed} FAIL — NO inyectar hasta corregir`));
  process.exit(failed === 0 ? 0 : 1);
}

// ═══════════════════════════════════════════════════════════════ apply ════

function findViFile(): string | null {
  for (const seed of [process.cwd(), __dirname]) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (!existsSync(join(dir, "frontend", "src"))) {
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
        continue;
      }
      const direct = [
        join(dir, "scripts", "verify-integration.ts"),
        join(dir, "scripts", "verify-integration.mts"),
        join(dir, "verify-integration.ts"),
        join(dir, "frontend", "scripts", "verify-integration.ts"),
      ];
      for (const p of direct) if (existsSync(p)) return p;
      const scriptsDir = join(dir, "scripts");
      if (existsSync(scriptsDir)) {
        for (const f of readdirSync(scriptsDir)) {
          if (!/\.(ts|mts)$/.test(f)) continue;
          const p = join(scriptsDir, f);
          try {
            if (readFileSync(p, "utf-8").includes("extractBackendToolNames")) return p;
          } catch { /* unreadable — skip */ }
        }
      }
      return null;
    }
  }
  return null;
}

interface Anchor { name: string; ok: boolean; detail: string; }

function applyPatch(viPath: string): void {
  const original = readFileSync(viPath, "utf-8");

  if (original.includes("vi14ClassifyRef")) {
    console.log(c.green(`✓ ${viPath} ya tiene VI-14 aplicado — nada que hacer`));
    process.exit(0);
  }

  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  // normalizar una vez: quitar el \r final de archivos CRLF, o el join(eol)
  // emitiría \r\r\n en cada línea original (fix P2-C3f)
  const lines = original.split("\n").map((l) => l.replace(/\r$/, ""));
  const anchors: Anchor[] = [];

  const findLine = (re: RegExp): number =>
    lines.findIndex((l) => re.test(l.replace(/\r$/, "")));

  // A2: extractor v1 (doc comment + función) → VI14_BLOCK
  const fnIdx = findLine(/^function extractBackendToolNames\(/);
  let docStart = fnIdx;
  if (fnIdx >= 0) {
    const isDoc = (s: string): boolean => {
      const t = s.trim();
      return t.startsWith("*") || t.startsWith("/**") || t === "*/";
    };
    while (docStart > 0 && isDoc(lines[docStart - 1]!)) docStart -= 1;
  }
  let fnEnd = -1;
  if (fnIdx >= 0) {
    for (let i = fnIdx + 1; i < lines.length; i++) {
      if (lines[i]!.replace(/\r$/, "") === "}") { fnEnd = i; break; }
    }
  }
  anchors.push({
    name: "A2 · function extractBackendToolNames (v1) → v2 motor-based",
    ok: fnIdx >= 0 && fnEnd >= 0,
    detail: fnIdx >= 0 ? `líneas ${docStart + 1}–${fnEnd + 1}` : "no encontrada",
  });

  // A3: check 6 completo → NEW_CHECK6
  const c6 = findLine(/^function checkBackendTools\(ctx: ScanContext\): CheckOutcome \{/);
  let c6End = -1;
  if (c6 >= 0) {
    for (let i = c6 + 1; i < lines.length; i++) {
      if (lines[i]!.replace(/\r$/, "") === "}") { c6End = i; break; }
    }
  }
  anchors.push({
    name: "A3 · function checkBackendTools → clasificación 5 estados",
    ok: c6 >= 0 && c6End >= 0,
    detail: c6 >= 0 ? `líneas ${c6 + 1}–${c6End + 1}` : "no encontrada",
  });

  // A1: campo de ScanContext (tolera indentación y comentario en línea)
  const a1 = findLine(/^[ \t]*backendTools:[ \t]*Set<string>;[ \t]*(?:\/\/.*)?$/);
  anchors.push({
    name: "A1 · ScanContext.backendTools: Set<string> → Vi14BackendIndex",
    ok: a1 >= 0,
    detail: a1 >= 0 ? `línea ${a1 + 1}` : "no encontrado",
  });

  const missing = anchors.filter((a) => !a.ok);
  console.log("P2-C3e · VI-14 patch — anclas:");
  for (const a of anchors) {
    console.log(`  ${a.ok ? c.green("OK  ") : c.red("MISS")} ${a.name}  ${c.dim(a.detail)}`);
  }
  if (missing.length > 0) {
    console.error(c.red(`\n✗ ${missing.length} ancla(s) no encontrada(s) — el VI difiere de la base esperada (v3.2.0 local vs copia auditada). NADA fue modificado.`));
    console.error(c.yellow("  Pega la cabecera (líneas 1-60) y el contorno de extractBackendToolNames/checkBackendTools para adaptar las anclas."));
    process.exit(2);
  }

  // parcheo en memoria, del final hacia el inicio para conservar índices
  const blockLines = VI14_BLOCK.replace(/^\n/, "").replace(/\n$/, "").split("\n");
  const checkLines = NEW_CHECK6.replace(/^\n/, "").replace(/\n$/, "").split("\n");
  const newLines = [...lines];
  newLines.splice(c6!, c6End! - c6! + 1, ...checkLines);
  newLines.splice(docStart, fnEnd! - docStart + 1, ...blockLines);
  newLines[a1!] = newLines[a1]!.replace(/^(\s*)backendTools: Set<string>;/, "$1backendTools: Vi14BackendIndex;");
  // A4 global: cualquier ctx.backendTools.size restante (reporte JSON etc.)
  let globalReplacements = 0;
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i]!.includes("ctx.backendTools.size")) {
      newLines[i] = newLines[i]!.replace(/ctx\.backendTools\.size/g, "ctx.backendTools.flat.size");
      globalReplacements += 1;
    }
  }
  const newContent = newLines.join(eol);

  // validación atómica antes de escribir
  const defs = (newContent.match(/function extractBackendToolNames\(/g) ?? []).length;
  const checkDefs = (newContent.match(/function checkBackendTools\b/g) ?? []).length;
  const uses = (newContent.match(/vi14ClassifyRef/g) ?? []).length;
  const wiringRefs = (newContent.match(/\bcheckBackendTools\b/g) ?? []).length;
  const leftover = newContent.includes("ctx.backendTools.size");
  if (defs !== 1 || checkDefs !== 1 || uses < 2 || leftover) {
    console.error(c.red("✗ validación post-parche falló (extractor/check duplicado o restos v1) — NADA fue modificado."));
    process.exit(2);
  }
  if (wiringRefs < 2) {
    console.log(
      c.yellow("  ⚠ checkBackendTools aparece " + wiringRefs + " vez (definición sin referencia de wiring):") +
        " el CHECKS local puede llamar a OTRA función — corre p2c3f_postcheck.ts después de este parche.",
    );
  }

  if (DRY_RUN) {
    console.log(c.yellow("\n--dry-run: no se escribe nada. Plan:"));
    console.log(`  · reemplazar ${fnEnd! - docStart + 1} líneas del extractor v1 por ${blockLines.length} (v2 motor-based)`);
    console.log(`  · reemplazar ${c6End! - c6! + 1} líneas del check 6 por ${checkLines.length} (clasificación 5 estados)`);
    console.log(`  · ScanContext.backendTools → Vi14BackendIndex (línea ${a1 + 1})`);
    console.log(`  · ctx.backendTools.size → ctx.backendTools.flat.size (${globalReplacements} sitio(s))`);
    return;
  }

  const backup = viPath + ".bak-p2c3e";
  if (!existsSync(backup)) copyFileSync(viPath, backup);
  writeFileSync(viPath, newContent);

  // verificación post-escritura: releer de disco y confirmar que la v2 está
  // realmente presente (paranoia frente a escrituras fallidas/cachés)
  const onDisk = readFileSync(viPath, "utf-8");
  const diskOk =
    onDisk.includes("vi14ClassifyRef") &&
    onDisk.includes("VI-14 v2 (motor-based)") &&
    !onDisk.includes("ctx.backendTools.size") &&
    (onDisk.match(/function checkBackendTools\b/g) ?? []).length === 1;
  if (!diskOk) {
    copyFileSync(backup, viPath);
    console.error(c.red("✗ el archivo releyó SIN los marcadores v2 — restaurado desde " + backup + "; nada quedó a medias."));
    process.exit(2);
  }
  const eolHealth = (onDisk.match(/\r\r\n/g) ?? []).length;
  if (eolHealth > 0) {
    console.log(c.yellow(`  ⚠ ${eolHealth} línea(s) con \\r\\r\\n detectadas tras escribir — normaliza con: npx tsx ../scripts/p2c3f_postcheck.ts --repair-eol`));
  }

  console.log(c.green(`\n✓ VI-14 aplicado a ${viPath} (verificado en disco: ${eol === "\r\n" ? "CRLF" : "LF"} limpio, ${(onDisk.match(/vi14ClassifyRef/g) ?? []).length} marcadores v2)`));
  console.log(`  · extractor v1 (${fnEnd! - docStart + 1} líneas) → v2 motor-based (${blockLines.length} líneas)`);
  console.log(`  · check 6 (${c6End! - c6! + 1} líneas) → clasificación TOOL/EQUIV/MOCK/CAPACIDAD/DEUDA (${checkLines.length} líneas)`);
  console.log(`  · ScanContext.backendTools: Vi14BackendIndex · ${globalReplacements} uso(s) de .size ajustado(s)`);
  console.log(`  · backup: ${backup}`);
  console.log(c.dim(`\n  siguiente:  npx tsx ../scripts/p2c3f_postcheck.ts   (audita que el check 6 corra la v2)`));
}

// ─── main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (SELFTEST) {
    await selftest();
    return;
  }
  const viPath = VI_ARG ? resolve(VI_ARG) : findViFile();
  if (!viPath || !existsSync(viPath)) {
    console.error("✗ no localizo el VI — usa --vi=<ruta a verify-integration.ts>");
    process.exit(2);
  }
  applyPatch(viPath);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
