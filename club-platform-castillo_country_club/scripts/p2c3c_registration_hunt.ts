#!/usr/bin/env node
/**
 * P2-C3c · Registration Hunt (read-only)
 *
 * Continuación de p2c3_backend_probe.ts y p2c3b_inventory_dump.ts.
 * Su run sobre el backend real dejó dos incógnitas:
 *
 *   1) server.py (DENTRO del scope VI) muestra solo `mcp = FastMCP(`
 *      (línea 78) y `mcp.run()` (154): ninguna llamada mcp.tool/@tool/
 *      add_tool/mount en medio. PERO ni el VI ni las sondas anteriores
 *      buscaron `\.tool(` genérico ni el wiring `Agent(mcp)` — el dump
 *      solo escaneó "superficies" de archivos con literal `FastMCP(`.
 *      Hipótesis principal: los agents se auto-registran en su
 *      __init__ (`self.mcp.tool(fn)`) o reciben mcp por constructor.
 *   2) El mock-registry define 3 de los 24 bajo otra forma (get_facility
 *      bajo facility_management:377; scenario_simulate/stress_test bajo
 *      finance:311/319) — ¿claves compuestas (`finance_*`)? Hace falta
 *      ver esas líneas exactas.
 *
 * Este hunt las cierra:
 *
 *   A) Dump COMPLETO del/de los archivo(s) con FastMCP( (server.py),
 *      con números de línea y marcas en las líneas que hacen wiring
 *      (Agent(mcp)), llaman .tool( o decoran @tool.
 *   B) Señales de registro sobre TODOS los .py del backend (sin
 *      tests/venv): `X.tool(...)` con cualquier receptor (mcp.tool,
 *      self.mcp.tool, srv.tool), decoradores @tool/@mcp.tool,
 *      add_tool/register_tool, Tool(name=), .mount(, list_tools/call_tool,
 *      __init__(…mcp…), Agent(mcp) e imports fastmcp/mcp.
 *   C) Mapa del mock-registry.ts: bloques server con línea, contextos
 *      ±6 verbatim de cada target que aparezca (dotted o short), y
 *      drift de servers: los que usa el frontend (check 2 del run
 *      2026-11-04, hardcodeados abajo) sin bloque equivalente en el mock.
 *   D) Veredicto: ¿existe mecanismo de registro (→ VI-14 concreto) o
 *      no existe (→ backendTools=0 es la verdad cruda y el camino es
 *      alinear la taxonomía del frontend)?
 *
 * Exclusiones: venv/.venv, site-packages, node_modules, dist, build,
 * __pycache__, .git, tests/ (VI-01).
 *
 * Uso:  npx tsx ../scripts/p2c3c_registration_hunt.ts
 *                     [--backend=<dir>] [--mocks=<file>] [--json]
 * Pega la salida completa (A y B importan más). Exit 0: es sonda.
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

const TARGETS: Target[] = DEFAULT_TOOLS.map((dotted) => {
  const i = dotted.indexOf(".");
  return {
    dotted,
    server: i > 0 ? dotted.slice(0, i) : dotted,
    short: i > 0 ? dotted.slice(i + 1) : dotted,
  };
});

// Servers usados por el frontend en los 24 refs del check 2 (run propio:
// si cambia el frontend, actualiza esta lista).
const FRONTEND_SERVERS = [
  "communication", "engagement", "facilities", "finance",
  "guests", "families", "reports",
];

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
// tolerante: permite "_" a ambos lados del token
const tolerant = (token: string): RegExp =>
  new RegExp("(?<![A-Za-z0-9])" + esc(token) + "(?![A-Za-z0-9])");
const bareLine = (l: string): string => l.replace(/\r$/, "").trim().slice(0, 110);

// ─── A) archivos con FastMCP( — dump completo ────────────────────────────

const FASTMCP_RE = /\bFastMCP\s*\(/;
const TOOLCALL_RE = /\.\s*tool\s*\(/;
const DECORATOR_RE = /^[ \t]*@[ \t]*[\w.]*tool\b/;
const WIRING_RE = /\b[A-Z]\w*\s*\(\s*[^()\n]*\bmcp\b/;

const serverFiles = sources.filter((s) => s.lines.some((l) => FASTMCP_RE.test(l)));

interface DumpMark { line: number; text: string; marks: string[]; }

const serverDumps = serverFiles.slice(0, 2).map((s) => {
  const total = s.lines.length;
  const marks: DumpMark[] = [];
  for (let i = 0; i < Math.min(total, 400); i++) {
    const l = s.lines[i]!;
    const m: string[] = [];
    if (TOOLCALL_RE.test(l)) m.push(".tool(");
    if (WIRING_RE.test(l) && !FASTMCP_RE.test(l)) m.push("wiring mcp");
    if (DECORATOR_RE.test(l)) m.push("@tool");
    marks.push({ line: i + 1, text: l.replace(/\r$/, "").slice(0, 100), marks: m });
  }
  return { file: s.rel, inScope: s.inScope, total, lines: marks, truncated: total > 400 };
});

// ─── B) señales de registro en todo el backend ──────────────────────────

const SIGNALS: Array<[string, RegExp]> = [
  ["X.tool(...) — cualquier receptor", /\.\s*tool\s*\(/],
  ["@tool / @mcp.tool (decorador)", /^[ \t]*@[ \t]*[\w.]*tool\b/],
  ["add_tool(...) / register_tool(...)", /\b(?:add_tool|register_tool)\s*\(/],
  ["Tool(name=...)", /\bTool\s*\(\s*name\s*=/],
  [".mount(...)", /\.\s*mount\s*\(/],
  ["list_tools(...) / call_tool(...)", /\b(?:list_tools|call_tool)\s*\(/],
  ["__init__(..., mcp, ...) — recibe servidor", /def\s+__init__\s*\([^)]*\bmcp\b/],
  ["Agent(mcp) — wiring", /\b[A-Z]\w*\s*\(\s*[^()\n]*\bmcp\b/],
  ["import fastmcp / mcp", /^[ \t]*(?:from|import)\s+(?:fastmcp|mcp)\b/],
];

interface Sig { pattern: string; file: string; line: number; text: string; inScope: boolean; }

const sigs: Sig[] = [];
for (const s of sources) {
  for (const [pat, re] of SIGNALS) {
    for (let i = 0; i < s.lines.length; i++) {
      if (sigs.length >= 600) break;
      if (re.test(s.lines[i]!)) {
        sigs.push({ pattern: pat, file: s.rel, line: i + 1, text: bareLine(s.lines[i]!), inScope: s.inScope });
      }
    }
  }
}

const sigsByPattern = SIGNALS.map(([pat]) => ({
  pattern: pat,
  hits: sigs.filter((x) => x.pattern === pat),
}));

// ─── C) mock-registry: mapa de servers + contextos de targets ───────────

let mockLines: string[] | null = null;
if (mocksFile && existsSync(mocksFile)) {
  mockLines = readFileSync(mocksFile, "utf8").split("\n");
}

const HEADER_RE = /^([ \t]*)([A-Za-z_]\w*)[ \t]*:[ \t]*\{/;
const SERVER_OBJ_RE = /\bserver[ \t]*:[ \t]*["'](\w+)["']/;

interface MockHeader { name: string; line: number; form: "block" | "field"; }

const mockHeaders: MockHeader[] = [];
if (mockLines) {
  mockLines.forEach((l, i) => {
    const m1 = HEADER_RE.exec(l);
    if (m1 && m1[1]!.length <= 4) mockHeaders.push({ name: m1[2]!, line: i + 1, form: "block" });
    const m2 = SERVER_OBJ_RE.exec(l);
    if (m2) mockHeaders.push({ name: m2[1]!, line: i + 1, form: "field" });
  });
}

const mockServers = [...new Set(mockHeaders.map((h) => h.name))];

interface MockHit { target: string; matched: "dotted" | "short"; line: number; }

const mockHits: MockHit[] = [];
if (mockLines) {
  for (const t of TARGETS) {
    const dottedRe = tolerant(t.dotted);
    const shortRe = tolerant(t.short);
    for (let i = 0; i < mockLines!.length; i++) {
      const l = mockLines![i]!;
      if (dottedRe.test(l)) mockHits.push({ target: t.dotted, matched: "dotted", line: i + 1 });
      else if (shortRe.test(l)) mockHits.push({ target: t.dotted, matched: "short", line: i + 1 });
    }
  }
}

// fusionar contextos solapados (±6)
interface CtxBlock { from: number; to: number; lines: Array<{ n: number; text: string }>; }

const ctxBlocks: CtxBlock[] = [];
if (mockLines) {
  const spans = mockHits
    .map((h) => ({ from: Math.max(0, h.line - 7), to: Math.min(mockLines!.length, h.line + 2) }))
    .sort((a, b) => a.from - b.from);
  for (const sp of spans) {
    const last = ctxBlocks[ctxBlocks.length - 1];
    if (last && sp.from <= last.to + 1) {
      last.to = Math.max(last.to, sp.to);
    } else {
      ctxBlocks.push({ from: sp.from, to: sp.to, lines: [] });
    }
  }
  for (const b of ctxBlocks.slice(0, 12)) {
    for (let i = b.from; i < b.to; i++) {
      b.lines.push({ n: i + 1, text: (mockLines![i] ?? "").replace(/\r$/, "").slice(0, 100) });
    }
  }
}

const drift = FRONTEND_SERVERS.filter((s) => !mockServers.includes(s));

// ─── salida ─────────────────────────────────────────────────────────────

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const scopeTag = (inScope: boolean): string =>
  inScope ? c.green("[DENTRO del scope VI]") : c.red("[FUERA del scope VI]");

if (JSON_MODE) {
  console.log(JSON.stringify({
    backendDir,
    viScopeDir,
    mocksFile: mocksFile ?? null,
    pyFiles: sources.length,
    targets: TARGETS.length,
    frontendServers: FRONTEND_SERVERS,
    serverDumps,
    signals: sigsByPattern.map((g) => ({
      pattern: g.pattern,
      count: g.hits.length,
      files: [...new Set(g.hits.map((h) => h.file))],
      hits: g.hits.slice(0, 20),
    })),
    mockServers,
    mockHeaders,
    mockHits,
    ctxBlocks: ctxBlocks.slice(0, 12),
    drift,
  }, null, 2));
  process.exit(0);
}

console.log("P2-C3c · Registration Hunt");
console.log(`backend : ${backendDir} (${sources.length} .py sin tests/venv)`);
console.log(`scope VI: ${viScopeDir}${existsSync(viScopeDir ?? "") ? "" : "  (no existe)"}`);
console.log(`mocks   : ${mocksFile ?? "(?)"}${mocksFile && existsSync(mocksFile) ? "" : c.red("  (no encontrado — usa --mocks=)")}`);
console.log(`targets : ${TARGETS.length} tool(s)\n`);

console.log("── A) Archivos con FastMCP( — dump completo (marcas: .tool( / wiring mcp / @tool) ──");
if (serverDumps.length === 0) console.log("  (ninguno)");
for (const d of serverDumps) {
  console.log(`  ${d.file}  ${scopeTag(d.inScope)} · ${d.total} líneas`);
  for (const l of d.lines) {
    const mark = l.marks.length > 0 ? c.cyan(`   ← ${l.marks.join(" · ")}`) : "";
    console.log(c.dim(`    ${String(l.line).padStart(4)} | ${l.text}`) + mark);
  }
  if (d.truncated) console.log(c.dim(`    … truncado a 400 líneas`));
}

console.log("\n── B) Señales de registro sobre TODO el backend (.py) ──");
for (const g of sigsByPattern) {
  const files = [...new Set(g.hits.map((h) => h.file))];
  console.log(`  ${g.pattern.padEnd(42)} ${String(g.hits.length).padStart(4)} línea(s) · ${files.length} archivo(s)`);
  for (const h of g.hits.slice(0, 8)) {
    const scope = h.inScope ? "" : c.red("  [fuera scope]");
    console.log(c.dim(`    ${h.file}:${h.line}${scope} · ${h.text.slice(0, 86)}`));
  }
  if (g.hits.length > 8) console.log(c.dim(`    … +${g.hits.length - 8} más`));
}

console.log("\n── C) mock-registry.ts ──");
if (!mockLines) {
  console.log("  (no leído — usa --mocks=)");
} else {
  console.log(`  servers declarados (${mockServers.length}):`);
  for (const h of mockHeaders) {
    console.log(c.dim(`    ${String(h.line).padStart(4)} | ${h.name} (${h.form === "block" ? "bloque" : "campo server:"})`));
  }
  console.log(`\n  targets presentes en el mock (${mockHits.length} hit(s)):`);
  for (const h of mockHits) {
    console.log(`    ${h.target} — ${h.matched === "dotted" ? c.green("DOTTED exacto") : c.yellow("short/compound, forma arriba")} · línea ${h.line}`);
  }
  if (mockHits.length === 0) console.log("    (ninguno de los 24 aparece ni como token)");
  if (ctxBlocks.length > 0) {
    console.log(`\n  contextos ±6 (verbatim, hasta 12 bloques):`);
    for (const b of ctxBlocks.slice(0, 12)) {
      console.log(c.cyan(`    ── líneas ${b.lines[0]!.n}–${b.lines[b.lines.length - 1]!.n} ──`));
      for (const l of b.lines) console.log(c.dim(`    ${String(l.n).padStart(4)} | ${l.text}`));
    }
  }
  console.log(`\n  drift de servers (frontend vs mock):`);
  console.log(`    frontend usa: ${FRONTEND_SERVERS.join(", ")}`);
  console.log(`    ${drift.length === 0 ? c.green("todos tienen bloque en el mock") : c.red(`SIN bloque equivalente: ${drift.join(", ")}`)}`);
}

console.log("\n── D) Veredicto ──");
const mechanism =
  sigsByPattern[0]!.hits.length +   // X.tool(
  sigsByPattern[1]!.hits.length +   // @tool
  sigsByPattern[2]!.hits.length +   // add_tool
  sigsByPattern[3]!.hits.length +   // Tool(name=
  sigsByPattern[4]!.hits.length;     // .mount(
if (mechanism > 0) {
  console.log(`  ${c.green(`mecanismo de registro DETECTADO (${mechanism} señal(es))`)} → VI-14 tiene forma concreta:`);
  console.log(`  extender extractBackendToolNames con las llamadas .tool( / decoradores de arriba (receptor agnóstico).`);
} else {
  console.log(`  ${c.red("sin ninguna señal de registro en todo el backend")}`);
  console.log(`  → backendTools=0 es la verdad cruda: los agents NO exponen tools MCP por ninguna vía reconocida.`);
  console.log(`  → VI-14 (extensión del extractor) NO procede; el camino es alinear taxonomía frontend↔plataforma (P2-C4).`);
}
const wiring = sigsByPattern[7]!.hits.length + sigsByPattern[6]!.hits.length;
if (wiring > 0) {
  console.log(`  wiring mcp→agents: ${wiring} señal(es) — mira A para ver cómo se monta el servidor.`);
}
if (drift.length > 0) {
  console.log(`  ${c.yellow(`drift de servers confirmado en mock: ${drift.join(", ")}`)} — parte de los 24 se explica SOLO por esto.`);
}

console.log(`\n${c.dim("Sonda read-only — nada fue modificado. Pega A y B completos para cerrar el caso.")}`);
process.exit(0);
