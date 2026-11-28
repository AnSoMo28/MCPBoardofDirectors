#!/usr/bin/env node
/**
 * P2-C3b · Inventory Dump (read-only)
 *
 * Continuación de p2c3_backend_probe.ts. Su run sobre el backend real dio:
 *   STRONG=0 · WEAK=6 (todas métodos de repo/agent, no tools MCP) · ABSENT=18
 *   censo: FastMCP( en 1 archivo · TOOLS: en 8 archivos · CERO decoradores
 *   @tool / add_tool / Tool(name=) en TODO el backend.
 *
 * Dos ciegas del probe v1 que este dump corrige antes de decretar deuda:
 *   1) \b no atraviesa "_" — un nombre estilo "guests_get_today_guests"
 *      (como el propio mock registry: family_get_activity_history) era
 *      invisible para la búsqueda WEAK. Aquí se busca con lookarounds que
 *      PERMITEN "_" a ambos lados (tolerante).
 *   2) solo se buscaba en .py con nombre citado — nombres sin comillas
 *      (docstrings YAML, bloques TOOLS:) y manifiestos yaml/json/toml
 *      quedaban fuera. Aquí se escanea .py + config.
 *
 * Qué responde:
 *   A) ¿Dónde está el FastMCP, DENTRO o FUERA del scope del VI
 *      (backend/src/club_mcp)? Si está fuera, esa sola razón explica
 *      backendTools=0. Y ¿cómo registra tools — decorador, imperativo
 *      (mcp.tool(fn)), o nada (scaffold)?
 *   B) ¿Qué hay dentro de los bloques TOOLS: (8 archivos)?
 *   C) ¿Hay manifiestos yaml/json/toml con nombres de tools?
 *   D) Los 24 tools, con búsqueda tolerante: DOTTED (nombre punteado,
 *      citado o en YAML) / COMPOUND (server_short) / SHORT (short con _
 *      admitidos; se marca def vs llamada) / NONE.
 *   E) Para los NONE: pistas de capacidad (fragmentos del propio nombre
 *      buscados en def — p. ej. "invoice" → async def list_invoices).
 *   F) Auditoría de alias en mock-registry.ts: ¿el tool existe bajo OTRO
 *      server (facilities.get_facility ↔ facility_management.get_facility)?
 *   G) Inventario total de candidatos — la forma concreta que VI-14
 *      tendría que aprender a parsear.
 *
 * Exclusiones: venv/.venv, site-packages, node_modules, dist, build,
 * __pycache__, .git, tests/ (VI-01).
 *
 * Uso:  npx tsx ../scripts/p2c3b_inventory_dump.ts
 *                     [--backend=<dir>] [--mocks=<file>] [--tools=a.b,…] [--json]
 * Pegar de vuelta la salida completa (o el --json): con eso se decide
 * VI-14 (extender extractBackendToolNames) vs. deuda real.
 * Exit 0 siempre: es sonda.
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

const CFG_EXTS = [".yaml", ".yml", ".json", ".toml"];

function isTestFile(abs: string): boolean {
  const base = abs.split(/[\\/]/).pop() ?? "";
  return /^test_.*\.py$/.test(base) || /_test\.py$/.test(base) || base === "conftest.py";
}

function isTestDir(abs: string): boolean {
  const parts = abs.split(/[\\/]/);
  return parts.includes("tests") || parts.includes("test");
}

function walkAll(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    let st;
    try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walkAll(abs, out);
    } else if (entry.endsWith(".py") || CFG_EXTS.some((e) => entry.endsWith(e))) {
      if (isTestFile(abs) || isTestDir(abs)) continue;
      out.push(abs);
    }
  }
  return out;
}

interface SourceFile {
  rel: string;      // relativo a backendDir, con /
  lines: string[];
  isCfg: boolean;
  inScope: boolean; // dentro de backend/src/club_mcp (lo que el VI escanea)
}

const sources: SourceFile[] = walkAll(backendDir).map((abs) => ({
  rel: relative(backendDir, abs).replace(/\\/g, "/"),
  lines: readFileSync(abs, "utf8").split("\n"),
  isCfg: CFG_EXTS.some((e) => abs.endsWith(e)),
  inScope: viScopeDir ? !relative(viScopeDir, abs).startsWith("..") : false,
}));

const pyCount = sources.filter((s) => !s.isCfg).length;
const cfgCount = sources.filter((s) => s.isCfg).length;

// ─── helpers ────────────────────────────────────────────────────────────

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// tolerante: permite "_" a ambos lados (captura guests_get_today_guests
// y nombres en YAML/docstrings sin comillas; el \b del probe v1 no podía)
const tolerant = (token: string): RegExp =>
  new RegExp("(?<![A-Za-z0-9])" + esc(token) + "(?![A-Za-z0-9])");
const bareLine = (l: string): string => l.replace(/\r$/, "").trim().slice(0, 110);

// ─── A) superficie de registro del archivo FastMCP ──────────────────────

const fastmcpRe = /\bFastMCP\s*\(/;

interface Surface {
  file: string;
  inScope: boolean;
  instanceVar: string[];
  surface: Array<{ line: number; text: string }>;
  names: string[];
}

const surfaces: Surface[] = [];

for (const s of sources) {
  if (s.isCfg) continue;
  if (!s.lines.some((l) => fastmcpRe.test(l))) continue;

  const instanceVar = new Set<string>();
  for (const l of s.lines) {
    const m = l.match(/(\w+)\s*=\s*FastMCP\s*\(/);
    if (m) instanceVar.add(m[1]!);
  }

  const surface: Array<{ line: number; text: string }> = [];
  const names = new Set<string>();
  const varCallRes = [...instanceVar].map(
    (v) => new RegExp("\\b" + v + "\\s*\\.\\s*\\w+\\s*\\("),
  );

  s.lines.forEach((l, idx) => {
    const isSurface =
      fastmcpRe.test(l) ||
      varCallRes.some((re) => re.test(l)) ||
      /^[ \t]*@(?:[\w.]+\.)?tool\b/.test(l) ||
      /\b(?:add_tool|register_tool)\s*\(/.test(l) ||
      /\bTool\s*\(\s*name\s*=/.test(l);
    if (isSurface && surface.length < 30) {
      surface.push({ line: idx + 1, text: bareLine(l) });
    }
    for (const m of l.matchAll(/["']([a-z][a-z0-9_.]{5,60})["']/g)) {
      if (names.size < 40) names.add(m[1]!);
    }
  });

  surfaces.push({
    file: s.rel,
    inScope: s.inScope,
    instanceVar: [...instanceVar],
    surface,
    names: [...names],
  });
}

// ─── B) bloques TOOLS: ─────────────────────────────────────────────────

const toolsSiteRe = /\bTOOLS\b\s*[=:{[]/;
const NAME_STOP = new Set(["tools", "handler", "name", "version", "description", "type", "mcp", "server"]);

interface Block { file: string; inScope: boolean; line: number; lines: string[]; candidates: string[]; }

function candidatesOf(chunk: string[]): string[] {
  const out = new Set<string>();
  for (const raw of chunk) {
    const t = raw.replace(/\r$/, "").trim();
    if (!t || t === "}" || t === "}") continue;
    let m = t.match(/^[-*]\s+["']?([a-z_][a-z0-9_.]{2,60})["']?\s*$/);
    if (m) { out.add(m[1]!); continue; }
    m = t.match(/^["']?([a-z_][a-z0-9_.]{2,60})["']?\s*:/);
    if (m && !NAME_STOP.has(m[1]!)) out.add(m[1]!);
    for (const q of t.matchAll(/["']([a-z_][a-z0-9_.]{2,60})["']/g)) out.add(q[1]!);
  }
  return [...out];
}

const blocks: Block[] = [];
for (const s of sources) {
  if (s.isCfg) continue;
  s.lines.forEach((l, idx) => {
    if (!toolsSiteRe.test(l)) return;
    if (blocks.length >= 12) return;
    const rawChunk = s.lines.slice(idx + 1, idx + 13);
    blocks.push({
      file: s.rel,
      inScope: s.inScope,
      line: idx + 1,
      lines: [l, ...rawChunk].map(bareLine),
      candidates: candidatesOf(rawChunk),
    });
  });
}

// ─── C) manifiestos yaml/json/toml ──────────────────────────────────────

interface Manifest { file: string; inScope: boolean; keys: string[]; }

const manifests: Manifest[] = [];
for (const s of sources) {
  if (!s.isCfg) continue;
  const keys: string[] = [];
  for (const raw of s.lines) {
    const t = raw.replace(/\r$/, "").trim();
    const m = t.match(/^["']?([a-z_][a-z0-9_.]{2,60})["']?\s*:/);
    if (m && !NAME_STOP.has(m[1]!) && keys.length < 40) keys.push(m[1]!);
  }
  if (keys.length > 0) manifests.push({ file: s.rel, inScope: s.inScope, keys });
}

// ─── D) los 24 vs el backend (tolerante) ────────────────────────────────

interface ToolHit {
  kind: "dotted" | "compound" | "short";
  file: string;
  line: number;
  text: string;
  isDef: boolean;
  inScope: boolean;
}

interface ToolReport {
  dotted: string;
  verdict: "dotted" | "compound" | "short" | "none";
  hits: ToolHit[];
}

const reports: ToolReport[] = [];

for (const t of TARGETS) {
  const dottedRe = tolerant(t.dotted);
  const compoundRe = tolerant(t.server + "_" + t.short);
  const shortRe = tolerant(t.short);
  const hits: ToolHit[] = [];

  for (const s of sources) {
    for (let i = 0; i < s.lines.length; i++) {
      const l = s.lines[i]!;
      const kind = dottedRe.test(l)
        ? "dotted"
        : compoundRe.test(l)
          ? "compound"
          : shortRe.test(l)
            ? "short"
            : null;
      if (kind && hits.length < 8) {
        hits.push({
          kind,
          file: s.rel,
          line: i + 1,
          text: bareLine(l),
          isDef: /\bdef\s+\w/.test(l),
          inScope: s.inScope,
        });
      }
    }
  }

  const verdict = hits.some((h) => h.kind === "dotted")
    ? "dotted"
    : hits.some((h) => h.kind === "compound")
      ? "compound"
      : hits.length > 0
        ? "short"
        : "none";
  reports.push({ dotted: t.dotted, verdict, hits });
}

// ─── E) pistas de capacidad para los NONE ──────────────────────────────
// fragmentos extraídos del propio nombre del tool (sin invención)

const FRAGMENTS: Record<string, string[]> = {
  "communication.get_communication_history": ["communication", "history"],
  "engagement.list_reactivation_campaigns": ["reactivation", "campaign"],
  "engagement.get_survey_results": ["survey"],
  "engagement.get_active_survey": ["survey"],
  "facilities.list_reservations": ["reservation"],
  "facilities.get_facility": ["facility"],
  "facilities.get_utilization": ["utilization"],
  "finance.get_family_account": ["account"],
  "finance.get_transactions": ["transaction"],
  "finance.get_invoices": ["invoice"],
  "guests.get_today_guests": ["today"],
  "guests.get_today_summary": ["summary", "today"],
  "guests.list_trial_memberships": ["trial"],
  "families.search_families": ["search"],
  "facilities.list_available_facilities": ["available"],
  "families.get_family": ["family"],
  "facilities.get_reservations": ["reservation"],
  "reports.get_board_report": ["board"],
  "reports.get_risk_matrix": ["risk"],
  "families.list_families": ["famil"],
  "finance.narrative_generate": ["narrative"],
  "finance.scenario_simulate": ["scenario"],
  "finance.stress_test": ["stress"],
  "finance.decision_simulate": ["decision"],
};

interface Hint { fragment: string; file: string; line: number; text: string; }

const hints: Record<string, Hint[]> = {};

for (const r of reports) {
  if (r.verdict !== "none") continue;
  const found: Hint[] = [];
  for (const frag of FRAGMENTS[r.dotted] ?? []) {
    if (found.length >= 3) break;
    const re = new RegExp("\\b(?:async\\s+)?def\\s+\\w*" + frag + "\\w*", "i");
    for (const s of sources) {
      if (s.isCfg) continue;
      for (let i = 0; i < s.lines.length; i++) {
        if (re.test(s.lines[i]!) && found.length < 3) {
          found.push({ fragment: frag, file: s.rel, line: i + 1, text: bareLine(s.lines[i]!) });
        }
      }
    }
  }
  hints[r.dotted] = found;
}

// ─── F) auditoría de alias en mock-registry.ts ─────────────────────────

interface MockAudit {
  dotted: string;
  exact: boolean;
  exactLine?: number;
  aliasServer?: string;
  aliasLine?: number;
}

const mockAudits: MockAudit[] = [];
let mockLines: string[] | null = null;
if (mocksFile && existsSync(mocksFile)) {
  mockLines = readFileSync(mocksFile, "utf8").split("\n");
}

if (mockLines) {
  for (const t of TARGETS) {
    const dottedRe = tolerant(t.dotted);
    const shortRe = tolerant(t.short);
    const audit: MockAudit = { dotted: t.dotted, exact: false };
    for (let i = 0; i < mockLines!.length; i++) {
      const l = mockLines![i]!;
      if (dottedRe.test(l)) {
        if (!audit.exact) { audit.exact = true; audit.exactLine = i + 1; }
        continue;
      }
      if (shortRe.test(l) && !audit.aliasServer) {
        for (let j = i; j >= Math.max(0, i - 30); j--) {
          const m1 = mockLines![j]!.match(/^\s*(\w+)\s*:\s*\{/);
          if (m1 && m1[1] !== "mockRegistry") { audit.aliasServer = m1[1]; audit.aliasLine = i + 1; break; }
          const m2 = mockLines![j]!.match(/server\s*:\s*["'](\w+)["']/);
          if (m2) { audit.aliasServer = m2[1]; audit.aliasLine = i + 1; break; }
        }
      }
    }
    mockAudits.push(audit);
  }
}

// ─── G) inventario total de candidatos ──────────────────────────────────

const inventory = new Set<string>();
for (const s of surfaces) for (const n of s.names) inventory.add(n);
for (const b of blocks) for (const c of b.candidates) inventory.add(c);
for (const m of manifests) for (const k of m.keys) inventory.add(k);

// ─── salida ─────────────────────────────────────────────────────────────

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

const scopeTag = (inScope: boolean): string =>
  inScope ? c.green("[DENTRO del scope VI]") : c.red("[FUERA del scope VI — el VI nunca lo escanea]");

if (JSON_MODE) {
  console.log(JSON.stringify({
    backendDir,
    viScopeDir,
    mocksFile: mocksFile ?? null,
    pyFiles: pyCount,
    cfgFiles: cfgCount,
    targets: TARGETS.length,
    surfaces,
    blocks,
    manifests,
    reports,
    hints,
    mockAudits,
    inventory: [...inventory],
  }, null, 2));
  process.exit(0);
}

console.log("P2-C3b · Inventory Dump");
console.log(`backend : ${backendDir} (${pyCount} .py + ${cfgCount} cfg · sin tests/venv)`);
console.log(`scope VI: ${viScopeDir}${existsSync(viScopeDir ?? "") ? "" : "  (no existe — el VI escanearía 0 .py aquí)"}`);
console.log(`mocks   : ${mocksFile ?? "(?)"}${mocksFile && existsSync(mocksFile) ? "" : c.red("  (no encontrado — usa --mocks=)")}`);
console.log(`targets : ${TARGETS.length} tool(s)\n`);

console.log("── A) Servidor FastMCP: superficie de registro ──");
if (surfaces.length === 0) {
  console.log("  (ningún archivo con FastMCP( — el servidor MCP no está en backend/)");
}
for (const s of surfaces) {
  console.log(`  ${s.file}  ${scopeTag(s.inScope)}`);
  if (s.instanceVar.length > 0) console.log(c.dim(`    instancia: ${s.instanceVar.join(", ")}`));
  for (const l of s.surface) console.log(c.dim(`    ${String(l.line).padStart(4)} | ${l.text}`));
  if (s.surface.length === 0) {
    console.log(c.dim("    (sin llamadas de registro visibles: ni @tool, ni mcp.tool(, ni add_tool — scaffold o registro no reconocido)"));
  }
  if (s.names.length > 0) {
    console.log(c.dim(`    nombres citados (${s.names.length}): ${s.names.slice(0, 12).join(", ")}${s.names.length > 12 ? " …" : ""}`));
  }
}

console.log("\n── B) Bloques TOOLS: ──");
if (blocks.length === 0) console.log("  (ninguno)");
for (const b of blocks) {
  console.log(`  ${b.file}:${b.line}  ${scopeTag(b.inScope)}`);
  for (const l of b.lines) console.log(c.dim(`      ${l}`));
  if (b.candidates.length > 0) console.log(c.cyan(`    candidatos: ${b.candidates.join(", ")}`));
}

console.log("\n── C) Manifiestos yaml/json/toml ──");
if (manifests.length === 0) console.log("  (ninguno)");
for (const m of manifests) {
  console.log(`  ${m.file}  ${scopeTag(m.inScope)}`);
  console.log(c.cyan(`    claves (${m.keys.length}): ${m.keys.slice(0, 15).join(", ")}${m.keys.length > 15 ? " …" : ""}`));
}

console.log("\n── D) Los targets vs el backend (tolerante a _ y sin comillas) ──");
const LABEL: Record<string, string> = {
  dotted: c.green("DOTTED"),
  compound: c.green("COMPOUND"),
  short: c.yellow("SHORT"),
  none: c.red("NONE"),
};
for (const r of reports) {
  if (r.verdict === "none") {
    console.log(`  ${LABEL[r.verdict]}  ${r.dotted}`);
    continue;
  }
  const h0 = r.hits[0]!;
  console.log(`  ${LABEL[r.verdict]}  ${r.dotted} · ${h0.file}:${h0.line}${h0.isDef ? " (def)" : ""}`);
  console.log(c.dim(`      ${h0.text}`));
  for (const h of r.hits.slice(1, 3)) {
    console.log(c.dim(`      también: ${h.kind} · ${h.file}:${h.line} ${h.text.slice(0, 70)}`));
  }
  if (r.hits.length > 3) console.log(c.dim(`      … +${r.hits.length - 3} hit(s) más`));
}

console.log("\n── E) Pistas de capacidad para los NONE (fragmentos en def) ──");
const noneReports = reports.filter((r) => r.verdict === "none");
if (noneReports.length === 0) console.log("  (nada que buscar — ningún NONE)");
for (const r of noneReports) {
  const hs = hints[r.dotted] ?? [];
  if (hs.length === 0) {
    console.log(`  ${r.dotted} — ${c.red("sin pistas: ningún def con fragmento del nombre")}`);
    continue;
  }
  for (const h of hs) {
    console.log(`  ${r.dotted} ← ${h.fragment} · ${h.file}:${h.line}`);
    console.log(c.dim(`    ${h.text}`));
  }
}

console.log("\n── F) Auditoría de alias en mock-registry ──");
if (!mockLines) {
  console.log("  (mock-registry no leído — usa --mocks=<ruta>)");
}
for (const a of mockAudits) {
  if (a.exact) {
    console.log(`  ${c.green("EXACT")}     ${a.dotted} (línea ${a.exactLine}) — ya está en el mock con ese nombre`);
  } else if (a.aliasServer) {
    console.log(`  ${c.yellow("ALIAS")}     ${a.dotted} → el mock lo define bajo server '${a.aliasServer}' (línea ${a.aliasLine})`);
  } else {
    console.log(`  ${c.red("NOT-IN-MOCK")} ${a.dotted}`);
  }
}

console.log("\n── G) Inventario total de candidatos (lo que VI-14 parsearía) ──");
const inv = [...inventory].sort();
console.log(`  ${inv.length} nombre(s):`);
console.log(c.dim(`    ${inv.slice(0, 120).join(", ")}${inv.length > 120 ? " …" : ""}`));

// ─── veredicto ──────────────────────────────────────────────────────────

const counts = {
  dotted: reports.filter((r) => r.verdict === "dotted").length,
  compound: reports.filter((r) => r.verdict === "compound").length,
  short: reports.filter((r) => r.verdict === "short").length,
  none: reports.filter((r) => r.verdict === "none").length,
};

console.log("\n═══ VEREDICTO ═══");
console.log(`  targets: ${TARGETS.length} → dotted=${counts.dotted} · compound=${counts.compound} · short=${counts.short} · none=${counts.none}`);
if (surfaces.length > 0) {
  const outScope = surfaces.filter((s) => !s.inScope).length;
  if (outScope === surfaces.length) {
    console.log(`  ${c.red("El archivo FastMCP está FUERA de backend/src/club_mcp: esa sola razón explica backendTools=0 del VI")}`);
    console.log(`  (el VI nunca escanea ese archivo — amplía su scope o mueve el registro)`);
  } else {
    console.log(`  FastMCP: ${surfaces.length} archivo(s), ${surfaces.filter((s) => s.inScope).length} dentro del scope VI`);
  }
  const anyReg = surfaces.some((s) => s.surface.length > 0);
  console.log(anyReg
    ? `  registro detectado en la superficie arriba — esa es la forma exacta para VI-14`
    : `  sin llamadas de registro visibles — el FastMCP parece scaffold vacío`);
} else {
  console.log(`  ${c.red("No hay servidor FastMCP en backend/ — los 24 tools no pueden estar expuestos")}`);
}
if (counts.none > 0) {
  console.log(`  ${counts.none} tool(s) sin rastro tras búsqueda tolerante + configs → ver E (pistas) antes de decretar deuda`);
}

console.log(`\n${c.dim("Sonda read-only — nada fue modificado. Pega esta salida completa (o la del --json) para diseñar VI-14.")}`);
process.exit(0);
