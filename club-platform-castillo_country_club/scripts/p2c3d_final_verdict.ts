#!/usr/bin/env node
/**
 * P2-C3d · Final Verdict (read-only)
 *
 * Cierre de la serie p2c3 → p2c3b → p2c3c. El hunt estableció:
 *   · server.py:138  → for agent in agents: agent.register_with_mcp(mcp)  (18 agentes)
 *   · base.py:86     → mcp.tool(name=tool_name, description=tool_desc)(wrapper)
 *     ÚNICO punto de registro del backend: los nombres de tools viven en
 *     SPECS por agente (no en decoradores ni llamadas literales) y los
 *     docstrings TOOLS: los documentan (casan 1:1 con las claves del mock:
 *     get_facility_reservations, get_amenity_utilization…).
 *   · mock: convención de claves compuestas confirmada verbatim
 *     (finance_scenario_simulate:311, finance_stress_test:319,
 *      finance_narrative_generate:323, finance_decision_simulate:325).
 *
 * Esta sonda produce el veredicto final:
 *   A) El motor: dump de register_with_mcp en base.py (qué estructura
 *      itera — el formato exacto que VI-14 debe parsear) + call sites.
 *   B) Inventario de tools del backend, extraído de las tres fuentes
 *      reales de nombres: name="…" en specs, tokens snake en docstrings
 *      TOOLS:, claves de dict/listas TOOLS= / tool_specs=.
 *   C) Inventario COMPLETO de claves del mock-registry (20 servers).
 *   D) Clasificación final de los 24 con evidencia file:line:
 *        TOOL-BACKEND        — el short existe como tool registrado
 *        EQUIVALENTE         — existe un tool equivalente con otro nombre
 *        SERVIDO-POR-MOCK    — solo existe en el mock (alias compuesto/drift)
 *        CAPACIDAD-SIN-TOOL  — handler/def existe pero no está en specs
 *        DEUDA-REAL          — nada en ninguna capa
 *      + nota de drift de server por target (families→family_profile…).
 *   E) Veredicto + spec concreta de VI-14.
 *
 * Exclusiones: venv/.venv, site-packages, node_modules, dist, build,
 * __pycache__, .git, tests/ (VI-01).
 *
 * Uso:  npx tsx ../scripts/p2c3d_final_verdict.ts
 *                     [--backend=<dir>] [--mocks=<file>] [--tools=a.b,…] [--json]
 * Exit 0: es sonda.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI ────────────────────────────────────────────────────────────────

function argOf(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : undefined;
}

const BACKEND_ARG = argOf("--backend=");
const MOCKS_ARG = argOf("--mocks=");
const TOOLS_ARG = argOf("--tools=");
const JSON_MODE = process.argv.includes("--json");

// Los 24 missingBoth del run 2026-11-04T16:08 (VI v3.2.0, check 6).
const DEFAULT_TOOLS = [
  "communication.get_communication_history",
  "engagement.list_reactivation_campaigns",
  "engagement.get_survey_results",
  "engagement.get_active_survey",
  "facilities.list_reservations",
  "facilities.get_facility",
  "facilities.get_utilization",
  "finance.get_family_account",
  "finance.get_transactions",
  "finance.get_invoices",
  "guests.get_today_guests",
  "guests.get_today_summary",
  "guests.list_trial_memberships",
  "families.search_families",
  "facilities.list_available_facilities",
  "families.get_family",
  "facilities.get_reservations",
  "reports.get_board_report",
  "reports.get_risk_matrix",
  "families.list_families",
  "finance.narrative_generate",
  "finance.scenario_simulate",
  "finance.stress_test",
  "finance.decision_simulate",
];

interface Target { dotted: string; server: string; short: string; }

const TARGETS: Target[] = (TOOLS_ARG ? TOOLS_ARG.split(",") : DEFAULT_TOOLS)
  .map((s) => s.trim())
  .filter(Boolean)
  .map((dotted) => {
    const i = dotted.indexOf(".");
    return {
      dotted,
      server: i > 0 ? dotted.slice(0, i) : dotted,
      short: i > 0 ? dotted.slice(i + 1) : dotted,
    };
  });

// Equivalencias OBSERVADAS en los runs p2c3/p2c3b/p2c3c (evidencia real:
// docstrings TOOLS:, defs y claves del mock citadas en esos outputs). La
// sección D las verifica contra los archivos antes de clasificar.
const EQUIVALENCES: Record<string, string[]> = {
  "facilities.list_reservations": ["get_facility_reservations"],
  "facilities.get_reservations": ["get_facility_reservations"],
  "facilities.get_utilization": ["get_amenity_utilization"],
  "facilities.get_facility": ["get_facility"],
  "families.search_families": ["search_families"],
  "families.get_family": ["get_family_profile"],
  "families.list_families": [],
  "guests.list_trial_memberships": ["manage_trial_memberships", "list_trial_memberships"],
  "guests.get_today_guests": [],
  "guests.get_today_summary": [],
  "engagement.get_survey_results": ["analyze_event_satisfaction", "get_survey_for_event"],
  "engagement.get_active_survey": ["get_survey_for_event"],
  "engagement.list_reactivation_campaigns": ["design_reactivation_campaign"],
  "communication.get_communication_history": ["get_communication_analytics"],
  "finance.get_family_account": ["finance_account_status"],
  "finance.get_transactions": [],
  "finance.get_invoices": ["finance_invoice_create", "create_invoice"],
  "reports.get_board_report": ["generate_quarterly_board_report", "get_board_report"],
  "reports.get_risk_matrix": ["get_member_risk_assessment"],
  "finance.narrative_generate": ["finance_narrative_generate", "generate_insight_narrative"],
  "finance.scenario_simulate": ["finance_scenario_simulate", "simulate_scenario"],
  "finance.stress_test": ["finance_stress_test"],
  "finance.decision_simulate": ["finance_decision_simulate"],
  "facilities.list_available_facilities": [],
};

// Drift de taxonomía observado: server del frontend → servers reales
// (bloques del mock + clases de agentes del backend).
const SERVER_RENAMES: Record<string, string> = {
  engagement: "member_engagement / satisfaction",
  facilities: "facility_management",
  guests: "guest_management",
  families: "family_profile",
  reports: "executive_dashboard",
};

// ─── rutas ──────────────────────────────────────────────────────────────

function resolveProjectRoot(): string | null {
  for (const seed of [__dirname, process.cwd()]) {
    let dir = seed;
    for (let i = 0; i < 6; i++) {
      if (existsSync(join(dir, "frontend", "src"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

const projectRoot = resolveProjectRoot();
const backendDir = BACKEND_ARG
  ? resolve(BACKEND_ARG)
  : projectRoot
    ? join(projectRoot, "backend")
    : null;
const viScopeDir = backendDir ? join(backendDir, "src", "club_mcp") : null;
const mocksFile = MOCKS_ARG
  ? resolve(MOCKS_ARG)
  : projectRoot
    ? join(projectRoot, "frontend", "src", "shared", "mocks", "mock-registry.ts")
    : null;

if (!backendDir || !existsSync(backendDir)) {
  console.error("✗ no localizo el backend — usa --backend=<dir> (p. ej. ../backend desde frontend/)");
  process.exit(1);
}

// ─── walk con exclusiones ───────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "venv", ".venv", "env", "site-packages", "node_modules",
  "dist", "build", "__pycache__", ".git", ".mypy_cache", ".pytest_cache",
]);

function isTestFile(abs: string): boolean {
  const base = abs.split(/[\\/]/).pop() ?? "";
  return /^test_.*\.py$/.test(base) || /_test\.py$/.test(base) || base === "conftest.py";
}

function isTestDir(abs: string): boolean {
  const parts = abs.split(/[\\/]/);
  return parts.includes("tests") || parts.includes("test");
}

function walkPy(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    let st;
    try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walkPy(abs, out);
    } else if (entry.endsWith(".py")) {
      if (isTestFile(abs) || isTestDir(abs)) continue;
      out.push(abs);
    }
  }
  return out;
}

interface SourceFile { rel: string; lines: string[]; inScope: boolean; }

const sources: SourceFile[] = walkPy(backendDir).map((abs) => ({
  rel: relative(backendDir, abs).replace(/\\/g, "/"),
  lines: readFileSync(abs, "utf8").split("\n"),
  inScope: viScopeDir ? !relative(viScopeDir, abs).startsWith("..") : false,
}));

// ─── helpers ────────────────────────────────────────────────────────────

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bareLine = (l: string): string => l.replace(/\r$/, "").trim().slice(0, 110);

// ─── A) motor de registro ───────────────────────────────────────────────

const ENGINE_DEF_RE = /def\s+register_with_mcp\s*\(/;
const REGISTER_CALL_RE = /(?<![A-Za-z0-9_])register_with_mcp\s*\(/;

interface EngineFile { file: string; inScope: boolean; from: number; to: number; marks: Array<{ n: number; text: string; mark: string }>; calls: Array<{ file: string; line: number; text: string }>; }

const engineDumps: EngineFile[] = [];
const callSites: Array<{ file: string; line: number; text: string }> = [];

for (const s of sources) {
  for (let i = 0; i < s.lines.length; i++) {
    if (REGISTER_CALL_RE.test(s.lines[i]!) && !ENGINE_DEF_RE.test(s.lines[i]!)) {
      callSites.push({ file: s.rel, line: i + 1, text: bareLine(s.lines[i]!) });
    }
  }
  const defIdx = s.lines.findIndex((l) => ENGINE_DEF_RE.test(l));
  if (defIdx === -1 || engineDumps.length >= 2) continue;
  const from = Math.max(0, defIdx - 12);
  const to = Math.min(s.lines.length, defIdx + 80);
  const marks: EngineFile["marks"] = [];
  for (let i = from; i < to; i++) {
    const l = s.lines[i]!;
    let mark = "";
    if (/\.\s*tool\s*\(/.test(l)) mark = ".tool(";
    else if (/\bfor\s+\w+\s+in\s+/.test(l)) mark = "iteración";
    else if (/\bname\s*=\s*["']/.test(l)) mark = "name=";
    else if (/def\s+/.test(l)) mark = "def";
    if (mark) marks.push({ n: i + 1, text: bareLine(l), mark });
  }
  engineDumps.push({ file: s.rel, inScope: s.inScope, from, to, marks, calls: [] });
}

// ─── B) inventario de tools del backend ─────────────────────────────────

interface InvHit { file: string; line: number; src: string; text: string; }
const inventory = new Map<string, InvHit[]>();

function addInv(name: string, hit: InvHit): void {
  if (name.length < 5 && !name.includes("_")) return;
  const arr = inventory.get(name) ?? [];
  if (arr.length < 6 && !arr.some((h) => h.file === hit.file && h.line === hit.line)) {
    arr.push(hit);
    inventory.set(name, arr);
  }
}

// tres formas reales de declarar el nombre en specs:
// kwargs ToolSpec(name="…"), dict {"name": "…"}, campo con default name: str = "…"
const NAME_PATTERNS: RegExp[] = [
  /\bname\s*=\s*["']([a-z][a-z0-9_]{3,50})["']/g,
  /["']name["']\s*:\s*["']([a-z][a-z0-9_]{3,50})["']/g,
  /\bname\s*:\s*\w+\s*=\s*["']([a-z][a-z0-9_]{3,50})["']/g,
];
const TOOLS_DOC_RE = /\bTOOLS\s*:/;
const TOOLS_ASG_RE = /\b(?:TOOLS|tool_specs|_TOOLS|tool_registry|TOOL_SPECS)\s*=\s*[{[]/;
const SNAKE_RE = /([a-z][a-z0-9]*_[a-z0-9_]{2,})/g;
const DICT_KEY_RE = /^\s*["']?([a-z][a-z0-9_]{5,60})["']?\s*:/;
const LIST_ITEM_RE = /^\s*["']?([a-z][a-z0-9_]{5,60})["']?\s*,?\s*$/;

for (const s of sources) {
  for (let i = 0; i < s.lines.length; i++) {
    const l = s.lines[i]!;

    // (a) name en specs (kwargs / dict / campo con default)
    for (const re of NAME_PATTERNS) {
      for (const m of l.matchAll(re)) {
        addInv(m[1]!, { file: s.rel, line: i + 1, src: "spec name=", text: bareLine(l) });
      }
    }

    // (b) docstring TOOLS: → tokens snake en la ventana
    if (TOOLS_DOC_RE.test(l)) {
      for (let j = i + 1; j <= Math.min(s.lines.length - 1, i + 14); j++) {
        const w = s.lines[j]!;
        if (/"""/.test(w)) break;
        for (const m of w.matchAll(SNAKE_RE)) {
          addInv(m[1]!, { file: s.rel, line: j + 1, src: "docstring TOOLS:", text: bareLine(w) });
        }
      }
    }

    // (c) dict/lista TOOLS= / tool_specs= → claves
    if (TOOLS_ASG_RE.test(l)) {
      for (let j = i + 1; j <= Math.min(s.lines.length - 1, i + 30); j++) {
        const w = s.lines[j]!;
        const closed = /^\s*[}\]]\s*,?\s*$/.test(w);
        if (closed) break;
        const mk = DICT_KEY_RE.exec(w) ?? LIST_ITEM_RE.exec(w);
        if (mk) {
          addInv(mk[1]!, { file: s.rel, line: j + 1, src: "dict TOOLS=/specs", text: bareLine(w) });
        }
      }
    }
  }
}

// defs de todo el backend (capacidad aunque no esté en specs)
interface DefHit { file: string; line: number; text: string; }
const defMap = new Map<string, DefHit>();
const DEF_RE = /^\s*(?:async\s+)?def\s+(\w+)/;
for (const s of sources) {
  for (let i = 0; i < s.lines.length; i++) {
    const m = DEF_RE.exec(s.lines[i]!);
    if (m && !defMap.has(m[1]!)) {
      defMap.set(m[1]!, { file: s.rel, line: i + 1, text: bareLine(s.lines[i]!) });
    }
  }
}

// ─── C) inventario completo del mock ────────────────────────────────────

let mockText = "";
if (mocksFile && existsSync(mocksFile)) mockText = readFileSync(mocksFile, "utf8");

interface MockKey { server: string; key: string; line: number; }
const mockKeys: MockKey[] = [];
const mockServersOrder: string[] = [];

if (mockText) {
  const lines = mockText.split("\n");
  let inRegistry = false;
  let currentServer: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = (lines[i] ?? "").replace(/\r$/, "");
    if (!inRegistry) {
      if (/mockRegistry\b[^=\n]*=\s*\{/.test(l)) inRegistry = true;
      continue;
    }
    if (/^};/.test(l)) break;
    const mS = /^ {2}([A-Za-z_]\w*)\s*:/.exec(l);
    if (mS) {
      currentServer = mS[1]!;
      if (!mockServersOrder.includes(currentServer)) mockServersOrder.push(currentServer);
      continue;
    }
    if (/^ {2}}/.test(l)) { currentServer = null; continue; }
    const mK = /^ {4}([A-Za-z_]\w*)\s*:/.exec(l);
    if (mK && currentServer) {
      mockKeys.push({ server: currentServer, key: mK[1]!, line: i + 1 });
    }
  }
}

const mockKeyLines = new Map<string, MockKey[]>();
for (const k of mockKeys) {
  const arr = mockKeyLines.get(k.key) ?? [];
  arr.push(k);
  mockKeyLines.set(k.key, arr);
}

// ─── D) clasificación final ─────────────────────────────────────────────

type Status = "TOOL-BACKEND" | "EQUIVALENTE" | "SERVIDO-POR-MOCK" | "CAPACIDAD-SIN-TOOL" | "DEUDA-REAL";

interface Classified {
  dotted: string;
  status: Status;
  evidence: string[];
  serverDrift: string | null;
}

const classifications: Classified[] = [];

for (const t of TARGETS) {
  const evidence: string[] = [];
  const compound = `${t.server}_${t.short}`;

  // 1) el short como tool registrado
  const invShort = inventory.get(t.short);
  if (invShort) {
    for (const h of invShort.slice(0, 2)) {
      evidence.push(`backend ${h.src}: ${h.file}:${h.line} · ${h.text.slice(0, 70)}`);
    }
  }

  // 2) equivalencias candidatas
  const cands = EQUIVALENCES[t.dotted] ?? [];
  let candInInventory: { name: string; hit: InvHit } | null = null;
  let candInMock: string | null = null;
  let candAsDef: { name: string; hit: DefHit } | null = null;
  for (const c of cands) {
    const inv = inventory.get(c);
    if (inv && !candInInventory) candInInventory = { name: c, hit: inv[0]! };
    const mk = mockKeyLines.get(c);
    if (mk && !candInMock) candInMock = `${c} (mock ${mk[0]!.server}:${mk[0]!.line})`;
    const df = defMap.get(c);
    if (df && !candAsDef) candAsDef = { name: c, hit: df };
  }

  // 3) mock: clave compuesta / short bajo otro server
  const compoundMock = mockKeyLines.get(compound);
  const driftMock = (mockKeyLines.get(t.short) ?? []).filter((k) => k.server !== t.server);

  let status: Status;
  if (invShort) status = "TOOL-BACKEND";
  else if (candInInventory) status = "EQUIVALENTE";
  else if (compoundMock || driftMock.length > 0 || candInMock) status = "SERVIDO-POR-MOCK";
  else if (candAsDef) status = "CAPACIDAD-SIN-TOOL";
  else status = "DEUDA-REAL";

  if (compoundMock) {
    const k = compoundMock[0]!;
    evidence.push(`mock clave compuesta ${k.key} (${k.server}:${k.line})`);
  }
  if (driftMock.length > 0) {
    const k = driftMock[0]!;
    evidence.push(`mock tiene '${t.short}' bajo server '${k.server}' (${k.line})`);
  }
  if (candInInventory) {
    evidence.push(`equivalente '${candInInventory.name}' registrado: ${candInInventory.hit.src} ${candInInventory.hit.file}:${candInInventory.hit.line}`);
  }
  if (candInMock) evidence.push(`equivalente en mock: ${candInMock}`);
  if (candAsDef) {
    evidence.push(`capacidad sin tool expuesto: def ${candAsDef.name} (${candAsDef.hit.file}:${candAsDef.hit.line})`);
  }
  if (status === "DEUDA-REAL") evidence.push("sin rastro: ni specs, ni docstrings, ni defs, ni mock");

  const serverDrift =
    mockServersOrder.length > 0 && !mockServersOrder.includes(t.server)
      ? (SERVER_RENAMES[t.server] ?? "sin bloque en el mock")
      : null;

  classifications.push({ dotted: t.dotted, status, evidence, serverDrift });
}

// ─── salida ─────────────────────────────────────────────────────────────

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const STATUS_COLOR: Record<Status, (s: string) => string> = {
  "TOOL-BACKEND": c.green,
  "EQUIVALENTE": c.green,
  "SERVIDO-POR-MOCK": c.yellow,
  "CAPACIDAD-SIN-TOOL": c.yellow,
  "DEUDA-REAL": c.red,
};

if (JSON_MODE) {
  console.log(JSON.stringify({
    backendDir,
    viScopeDir,
    mocksFile: mocksFile ?? null,
    pyFiles: sources.length,
    targets: TARGETS.length,
    engineDumps,
    callSites,
    inventory: [...inventory.entries()].map(([name, hits]) => ({ name, hits: hits.slice(0, 3) })),
    defCount: defMap.size,
    mockServersOrder,
    mockKeys,
    classifications,
  }, null, 2));
  process.exit(0);
}

console.log("P2-C3d · Final Verdict");
console.log(`backend : ${backendDir} (${sources.length} .py sin tests/venv)`);
console.log(`scope VI: ${viScopeDir}${existsSync(viScopeDir ?? "") ? "" : "  (no existe)"}`);
console.log(`mocks   : ${mocksFile ?? "(?)"}${mocksFile && existsSync(mocksFile) ? "" : c.red("  (no encontrado — usa --mocks=)")}`);
console.log(`targets : ${TARGETS.length} tool(s)\n`);

console.log("── A) Motor de registro (register_with_mcp) ──");
if (engineDumps.length === 0) {
  console.log(`  ${c.red("no se encontró def register_with_mcp — el mecanismo es otro")}`);
}
for (const e of engineDumps) {
  console.log(`  ${e.file}:${e.from + 1}–${e.to}  ${e.inScope ? c.green("[scope VI]") : c.red("[fuera scope]")}`);
  for (const m of e.marks) {
    console.log(c.dim(`    ${String(m.n).padStart(4)} | ${m.text}`) + c.cyan(`   ← ${m.mark}`));
  }
}
if (callSites.length > 0) {
  console.log(`  call sites (${callSites.length}):`);
  for (const cs of callSites.slice(0, 6)) console.log(c.dim(`    ${cs.file}:${cs.line} · ${cs.text.slice(0, 84)}`));
}

console.log("\n── B) Inventario de tools del backend (specs reales) ──");
const invNames = [...inventory.keys()].sort();
console.log(`  ${invNames.length} nombre(s) extraídos (name=\"…\" · docstring TOOLS: · dict TOOLS=):`);
console.log(c.dim(`    ${invNames.slice(0, 140).join(", ")}${invNames.length > 140 ? " …" : ""}`));
const targetsInInv = TARGETS.filter((t) => inventory.has(t.short));
if (targetsInInv.length > 0) {
  console.log(`  ${c.green("targets cuyo short ESTÁ en el inventario:")} ${targetsInInv.map((t) => t.dotted).join(", ")}`);
}

console.log("\n── C) Inventario completo del mock (claves por server) ──");
if (mockKeys.length === 0) {
  console.log(`  ${c.red("mock no parseado o vacío — usa --mocks=")}`);
} else {
  for (const srv of mockServersOrder) {
    const keys = mockKeys.filter((k) => k.server === srv);
    console.log(`  ${srv} (${keys.length}):`);
    console.log(c.dim(`    ${keys.map((k) => k.key).join(", ")}`));
  }
  console.log(`  total: ${mockKeys.length} clave(s) en ${mockServersOrder.length} server(s)`);
}

console.log("\n── D) Clasificación final de los targets ──");
const ORDER: Status[] = ["TOOL-BACKEND", "EQUIVALENTE", "SERVIDO-POR-MOCK", "CAPACIDAD-SIN-TOOL", "DEUDA-REAL"];
for (const st of ORDER) {
  const group = classifications.filter((x) => x.status === st);
  if (group.length === 0) continue;
  console.log(`\n  ${STATUS_COLOR[st](st)} (${group.length}):`);
  for (const x of group) {
    console.log(`    ${x.dotted}`);
    for (const e of x.evidence) console.log(c.dim(`      · ${e}`));
    if (x.serverDrift) console.log(c.yellow(`      · drift de server: '${x.dotted.split(".")[0]}' no existe; real: ${x.serverDrift}`));
  }
}

console.log("\n── E) Veredicto ──");
const counts = ORDER.map((st) => `${st}=${classifications.filter((x) => x.status === st).length}`).join(" · ");
console.log(`  ${counts}  (de ${TARGETS.length})`);
const realDebt = classifications.filter((x) => x.status === "DEUDA-REAL");
if (realDebt.length > 0) {
  console.log(`  ${c.red(`deuda REAL de implementación (${realDebt.length}):`)} ${realDebt.map((x) => x.dotted).join(", ")}`);
}
const mockOnly = classifications.filter((x) => x.status === "SERVIDO-POR-MOCK");
if (mockOnly.length > 0) {
  console.log(`  ${c.yellow(`solo mock (${mockOnly.length}): la ref funciona en modo mock; backend no la tiene`)}`);
}
console.log(`\n  ${c.green("VI-14 — spec concreta para extractBackendToolNames v2:")}`);
console.log(`  1. Inventario: parsear por agente (a) docstrings TOOLS: (tokens snake con "_"),`);
console.log(`     (b) name="…" en specs, (c) claves de TOOLS = {…} / tool_specs = […].`);
console.log(`     Server = snake_case(nombre del agente) — casa 1:1 con los bloques del mock.`);
console.log(`  2. Normalización de refs del frontend: mapa de renombres de servers`);
console.log(`     (families→family_profile, facilities→facility_management, guests→guest_management,`);
console.log(`     engagement→member_engagement/satisfaction, reports→executive_dashboard)`);
console.log(`     + convención de clave compuesta del mock (server_short).`);
console.log(`  3. Clasificar cada ref como arriba (TOOL/EQUIV/MOCK/CAPACIDAD/DEUDA) y reportar`);
console.log(`     missingBoth SOLO para DEUDA-REAL — el check 6 deja de dar falsos positivos.`);

console.log(`\n${c.dim("Sonda read-only — nada fue modificado.")}`);
process.exit(0);
