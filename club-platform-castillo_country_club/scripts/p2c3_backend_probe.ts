#!/usr/bin/env node
/**
 * P2-C3 · Backend Tool Probe (read-only)
 *
 * Contexto: VI v3.2.0 (check 6) sigue reportando backendTools=0 sobre
 * backend/src/club_mcp (102 .py escaneados). Los fixes FastMCP de VI-13
 * (kwargs con puntos, ventana 40, clave compuesta) no bastaron: el
 * backend NO usa ninguna convención reconocida (@x.tool, add_tool/
 * register_tool, Tool(name=…)). Quedan 24 tools "missing from mock AND
 * backend — verify manually".
 *
 * Este probe resuelve la pregunta de raíz con evidencia, sin tocar nada:
 *
 *   STRONG — el nombre punteado completo aparece citado en el backend
 *            ("guests.get_today_guests" como string/kwarg/dict-key).
 *            El tool EXISTE bajo una convención que el VI no reconoce
 *            → procede VI-14: extender extractBackendToolNames con la
 *            forma que muestra el contexto del hit.
 *   WEAK   — solo existe la función con el short name (def get_facility).
 *            El handler existe pero no se ve cómo se registra.
 *   ABSENT — ni nombre ni función: el tool no existe server-side.
 *            Deuda real de implementación (backend o mocks).
 *
 * Además: censo de convenciones de registro sobre todo backend/ (no solo
 * club_mcp), y marcado de hits fuera del scope del VI (backend/src/
 * club_mcp) — si los tools se registran fuera de ahí, el VI nunca los
 * verá aunque se extienda el extractor.
 *
 * Exclusiones: venv/.venv, site-packages, node_modules, dist, build,
 * __pycache__, .git, tests/ (VI-01: los tests registran tools falsos).
 *
 * Uso:  npx tsx ../scripts/p2c3_backend_probe.ts [--backend=<dir>]
 *                                             [--tools=a.b,c.d] [--json]
 * Salida: consola (o --json para máquina). Exit 0 siempre: es sonda.
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

const TARGETS: string[] = TOOLS_ARG
  ? TOOLS_ARG.split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_TOOLS;

// ─── resolución de rutas (mismo contrato que el VI) ─────────────────────

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
// Scope exacto que escanea el VI (check 6): backend/src/club_mcp.
// Derivable del propio backend: coincide con join(root, "backend", "src",
// "club_mcp") cuando backend está en <root>/backend.
const viScopeDir = backendDir ? join(backendDir, "src", "club_mcp") : null;

if (!backendDir || !existsSync(backendDir)) {
  console.error(
    "✗ no localizo el backend — usa --backend=<dir> (p. ej. ../backend desde frontend/)",
  );
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

const pyFiles = walkPy(backendDir);
const rel = (f: string): string => relative(backendDir, f).replace(/\\/g, "/");
const inViScope = (f: string): boolean =>
  viScopeDir ? !relative(viScopeDir, f).startsWith("..") : false;
const bareLine = (l: string): string => l.replace(/\r$/, "").trim().slice(0, 110);

// ─── censo de convenciones ──────────────────────────────────────────────

const CENSUS: Array<[string, RegExp]> = [
  ["@x.tool decorator", /^[ \t]*@(?:[\w.]+\.)?tool\b/],
  ["add_tool/register_tool", /\.(?:add_tool|register_tool|addTool|registerTool)\s*\(/],
  ["Tool(name=…)", /(?:^|[.\s])Tool\s*\(\s*name\s*=/],
  ["low-level list_tools()", /\blist_tools\s*\(/],
  ["low-level call_tool()", /\bcall_tool\s*\(/],
  ["FastMCP(…)", /\bFastMCP\s*\(/],
  ["TOOLS collection", /\bTOOLS\b\s*[=:{[]/],
  ["dotted name kwarg", /\bname\s*=\s*["'][\w-]+\.[\w.-]+["']/],
  ["register_handler()", /\bregister_handlers?\s*\(/],
];

interface CensusRow { pattern: string; files: Set<string>; lines: number; sample: string; }
const census: CensusRow[] = [];

// ─── búsqueda STRONG/WEAK ───────────────────────────────────────────────

interface Hit {
  tool: string;
  kind: "strong" | "weak";
  file: string;
  line: number;
  context: string[];
  inViScope: boolean;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// comillas como clase de carácter: " ' ` (el backtick no puede vivir suelto
// dentro de un template literal, así que va por interpolación)
const QUOTES = '"\'`';

const hits: Hit[] = [];

for (const file of pyFiles) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const tool of TARGETS) {
    const short = tool.split(".")[1] ?? tool;
    const strongRe = new RegExp(`[${QUOTES}]${escapeRe(tool)}[${QUOTES}]`);
    const weakRe = new RegExp(`\\b${escapeRe(short)}\\b`);

    let strongSeen = 0;
    let weakSeen = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (strongRe.test(line) && strongSeen < 5) {
        strongSeen++;
        hits.push({
          tool,
          kind: "strong",
          file: rel(file),
          line: i + 1,
          context: lines.slice(i, i + 3).map(bareLine),
          inViScope: inViScope(file),
        });
      } else if (strongSeen === 0 && weakRe.test(line) && weakSeen < 3) {
        weakSeen++;
        hits.push({
          tool,
          kind: "weak",
          file: rel(file),
          line: i + 1,
          context: [bareLine(line)],
          inViScope: inViScope(file),
        });
      }
    }
  }

  for (const [pat, re] of CENSUS) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i]!)) {
        let row = census.find((c) => c.pattern === pat);
        if (!row) {
          row = { pattern: pat, files: new Set(), lines: 0, sample: "" };
          census.push(row);
        }
        row.files.add(rel(file));
        row.lines++;
        if (!row.sample) row.sample = bareLine(lines[i]!);
      }
    }
  }
}

// ─── agregación por tool ────────────────────────────────────────────────

interface ToolVerdict {
  tool: string;
  kind: "strong" | "weak" | "absent";
  strongCount: number;
  strongInScope: number;
  hits: Hit[];
}

const verdicts: ToolVerdict[] = TARGETS.map((tool) => {
  const toolHits = hits.filter((h) => h.tool === tool);
  const strong = toolHits.filter((h) => h.kind === "strong");
  return {
    tool,
    kind: strong.length > 0 ? "strong" : toolHits.length > 0 ? "weak" : "absent",
    strongCount: strong.length,
    strongInScope: strong.filter((h) => h.inViScope).length,
    hits: toolHits,
  };
});

const strongTools = verdicts.filter((v) => v.kind === "strong");
const weakTools = verdicts.filter((v) => v.kind === "weak");
const absentTools = verdicts.filter((v) => v.kind === "absent");
const strongButOutOfScope = strongTools.filter((v) => v.strongInScope === 0);

// ─── salida ─────────────────────────────────────────────────────────────

if (JSON_MODE) {
  console.log(JSON.stringify({
    backendDir,
    viScopeDir,
    pyFiles: pyFiles.length,
    targets: TARGETS.length,
    strong: strongTools.length,
    weak: weakTools.length,
    absent: absentTools.length,
    strongButOutOfScope: strongButOutOfScope.map((v) => v.tool),
    verdicts: verdicts.map((v) => ({
      tool: v.tool, kind: v.kind, strongInScope: v.strongInScope,
      hits: v.hits.map((h) => ({ kind: h.kind, file: h.file, line: h.line, inViScope: h.inViScope })),
    })),
    census: census.map((c) => ({ pattern: c.pattern, files: c.files.size, lines: c.lines, sample: c.sample })),
  }, null, 2));
  process.exit(0);
}

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
};

console.log("P2-C3 · Backend Tool Probe");
console.log(`backend : ${backendDir} (${pyFiles.length} .py sin tests/venv)`);
console.log(`scope VI: ${viScopeDir}${existsSync(viScopeDir ?? "") ? "" : "  (no existe — el VI escanearía 0 .py aquí)"}`);
console.log(`targets : ${TARGETS.length} tool(s)\n`);

console.log("── A) Censo de convenciones de registro ──");
if (census.length === 0) {
  console.log("  (ningún patrón conocido ni aproximado — registro por convención propia o ausente)");
}
for (const row of census) {
  console.log(`  ${row.pattern.padEnd(24)} ${String(row.files.size).padStart(3)} archivo(s) · ${String(row.lines).padStart(4)} línea(s)`);
  console.log(c.dim(`    ej.: ${row.sample}`));
}

console.log("\n── B) Los tools buscados ──");
console.log(`  ${c.green(`STRONG (nombre citado): ${strongTools.length}`)} · ${c.yellow(`WEAK (solo función): ${weakTools.length}`)} · ${c.red(`ABSENT: ${absentTools.length}`)} — de ${TARGETS.length}\n`);

for (const v of strongTools) {
  const scope = v.strongInScope > 0 ? "" : c.red("  ← FUERA del scope del VI");
  console.log(`  ${c.green("STRONG")}  ${v.tool}${scope}`);
  const h = v.hits.find((x) => x.kind === "strong")!;
  console.log(c.dim(`    ${h.file}:${h.line} · ${h.context[0]}`));
}
if (strongTools.length > 0) console.log("");
for (const v of weakTools) {
  const h = v.hits[0]!;
  console.log(`  ${c.yellow("WEAK")}    ${v.tool}`);
  console.log(c.dim(`    ${h.file}:${h.line} · ${h.context[0]}`));
}
if (weakTools.length > 0) console.log("");
if (absentTools.length > 0) {
  console.log(`  ${c.red("ABSENT")}: ${absentTools.map((v) => v.tool).join(", ")}`);
}

console.log("\n── C) Veredicto ──");
if (strongTools.length > 0) {
  if (strongButOutOfScope.length === strongTools.length && strongTools.length > 0) {
    console.log(`  ${strongTools.length} tool(s) existen pero NINGUNO dentro de backend/src/club_mcp:`);
    console.log(`  el VI mira solo esa ruta — o mueve el registro ahí, o amplía backendSrc en el VI.`);
  } else {
    console.log(`  ${strongTools.length}/${TARGETS.length} tool(s) citados en el backend → convención NO reconocida por el VI.`);
    console.log(`  Siguiente paso: VI-14 — extender extractBackendToolNames con la forma del contexto arriba.`);
  }
  if (strongButOutOfScope.length > 0 && strongButOutOfScope.length < strongTools.length) {
    console.log(`  OJO: ${strongButOutOfScope.map((v) => v.tool).join(", ")} solo aparecen FUERA de club_mcp.`);
  }
}
if (weakTools.length > 0) {
  console.log(`  ${weakTools.length} tool(s) tienen handler (función) sin registro visible — revisa cómo se monta el servidor.`);
}
if (absentTools.length > 0) {
  console.log(`  ${absentTools.length} tool(s) no existen server-side: deuda real (implementar backend o añadir mocks).`);
}

console.log(`\n${c.dim("Sonda read-only — nada fue modificado. --json para salida máquina.")}`);
process.exit(0);
