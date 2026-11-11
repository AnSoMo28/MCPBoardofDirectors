#!/usr/bin/env npx tsx
/**
 * verify-integration.ts — Castillo AI Platform · Integration Verifier v3
 *
 * Governance layer · Lote 1b · Rewritten post-audit (dictamen 6.0/10 for v2).
 *
 * Scans the frontend (+ backend when present) and verifies:
 *   1. router-imports      Lazy imports in app/router.tsx resolve to real files
 *   2. mcp-coverage        useMCPQuery(server, tool) coverage in the mock registry
 *   3. phantom-tokens      CSS custom properties used but never defined
 *   4. raw-buttons         Raw <button> outside the UI primitive layer
 *   5. permission-gates    PermissionGate coverage on admin routes
 *   6. backend-tools       Tools missing from BOTH mock registry AND backend
 *   7. duplicate-routes    Route paths registered more than once (normalized)
 *   8. orphan-mocks        Mock-registry entries never referenced by a hook
 *
 * Usage:
 *   npx tsx scripts/verify-integration.ts [options]
 *   node scripts/verify-integration.ts [options]      (Node >= 22.18, no tsx;
 *                                                      requires ESM context:
 *                                                      "type":"module" or .mts)
 *
 * Options:
 *   --json          machine-readable report (CI); suppresses console report
 *   --quiet, -q     summary + verdict only
 *   --no-color      disable ANSI (auto when piped or NO_COLOR is set)
 *   --root <path>   project root (default: script dir -> cwd, walking up)
 *   --check <list>  subset by number or slug, comma-separated
 *   --help, -h      full help
 *
 * Exit codes:
 *   0  all clear (info findings allowed)
 *   1  errors found
 *   2  warnings only
 *   3  usage error / internal failure
 *
 * v3 changelog vs v2 (defect -> fix):
 *   VI-01  check 6 equated "any quoted identifier in any .py" with a backend
 *          tool -> systematic false negatives (missing tools reported as
 *          present). Extraction is now registration-based: @<x>.tool / @tool
 *          decorators over def (incl. name= kwarg), .add_tool(...) /
 *          .register_tool(...) and Tool(name=...) constructions. When the
 *          backend exposes none of those conventions the check degrades to
 *          advisory LOUDLY instead of failing silently.
 *   VI-02  __dirname broke under ESM ("type": "module" -> ReferenceError).
 *          Root is resolved from argv[1]/cwd walking up + --root override.
 *   VI-03  one single-quoted dynamic import aborted check 1 silently
 *          (indexOf('")') === -1 -> break). Both quote styles supported;
 *          explicit extensions (@/x.tsx, @/x.js) also resolve.
 *   VI-04  phantom tokens were a frozen 8-item list that could not detect
 *          NEW phantoms. Now derived from the actual CSS in frontend/src:
 *          var(--x) undefined = runtime defect (warning); bare mentions in
 *          strings = possible phantom (info); legacy list kept as fallback
 *          when no CSS custom properties exist.
 *   VI-05  raw-button allowlist was 24 hardcoded file paths (rot risk: every
 *          new primitive required editing the verifier). The whole primitive
 *          layer is now exempt by directory and coverage extends to
 *          features/ and app/.
 *   VI-06  registry parser depended on exact 2-space indent and the exact
 *          "(params" signature. Now indent-relative and it accepts arrow and
 *          method-style mock handlers.
 *   VI-07  scans hit dist/build/.next/coverage/venv (stale compiled output
 *          and site-packages polluted results). All excluded now.
 *   VI-08  registry keys, file lists and useMCPQuery refs were computed
 *          twice. A single ScanContext is built once and shared.
 *   VI-09  PermissionGate window was an arbitrary 10 lines and the bare
 *          "admin" layout route was invisible. Window is now bounded by the
 *          next route declaration; route === "admin" is included.
 *   VI-10  duplicate routes now compared after normalization (whitespace,
 *          leading/trailing slash, "//").
 *   VI-11  no JSON mode, no error containment, fixed-width summary box that
 *          misaligned. Now: --json/--quiet/--check/--no-color, global
 *          try/catch with exit 3, dynamic-width ANSI-aware boxes, and a new
 *          advisory check 8 (orphan mocks) that reuses the shared context.
 *   VI-15  G8 RESTORE: commit 290afa4 (P2-C3e/f) was authored against the
 *          pre-P2B base and DELETED the VI-12 changes from f11d8e7 (check 8
 *          non-hook refs + check 4 EOL-insensitivity + v3.1.0). G8 re-applies
 *          them over the VI-14 v2 file: check 8 unions the four reference
 *          shapes again, check 4 is EOL-insensitive again. Version = 3.2.0
 *          (VI-14 v2 + VI-12 — the 3.2.0 the .bak anticipated). Regression
 *          documented in MASTER_CHECKPOINT §0.3 (#62).
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ═══════════════════════════════════════════════ types & constants ═══════

type Severity = "error" | "warning" | "info";

interface Finding {
  file: string;
  line: number;
  message: string;
  snippet?: string;
  /** Overrides the check's default severity for this finding. */
  severity?: Severity;
}

interface CheckOutcome {
  id: string;
  title: string;
  severity: Severity;
  findings: Finding[];
  stats: Array<[string, string | number]>;
  notes: string[];
}

interface McpQueryRef {
  file: string;
  line: number;
  server: string;
  tool: string;
}

interface ScanContext {
  root: string;
  frontendSrc: string;
  backendSrc: string;
  tsFiles: string[]; // absolute, no .d.ts, no build output
  cssFiles: string[]; // absolute
  pyFiles: string[]; // absolute, tests excluded
  routerContent: string | null;
  registryKeys: Set<string>; // "server::tool"
  registryFound: boolean;
  mcpQueries: McpQueryRef[];
  extraToolRefs: McpQueryRef[]; // VI-12: mutations, direct calls, advisor pairs
  backendTools: Vi14BackendIndex;
  backendScanned: boolean;
  definedTokens: Set<string>;
  tokenSource: "css" | "legacy";
  compatAliases: Map<string, string>; // legacy "server.tool" -> canonical "server.tool" (registry.py)
}

interface Totals {
  errors: number;
  warnings: number;
  info: number;
}

interface CliOptions {
  root: string | undefined;
  json: boolean;
  quiet: boolean;
  noColor: boolean;
  checks: string[];
  help: boolean;
}

class UsageError extends Error {}

const TOOL_VERSION = "3.2.0";
const MAX_DISPLAYED_FINDINGS = 40;
const SNIPPET_MAX = 120;

/** Directories never scanned (dependencies, VCS, build output, caches). */
const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", "coverage",
  "__pycache__", ".venv", "venv", ".turbo", ".cache", ".pytest_cache",
  ".mypy_cache", ".ruff_cache", "target",
]);

/** UI primitive layer — raw <button> is legal here and ONLY here (check 4). */
const RAW_BUTTON_EXEMPT_DIRS = [
  "shared/components/ui",
  "shared/components/layout",
  "shared/components/error",
  "shared/components/export",
];

/** Route guards recognized on admin routes (check 5). */
const GATE_IDENTIFIERS = ["PermissionGate", "RequirePermission", "GuardedRoute", "AdminGuard"];

/** v2 compatibility list — used only when no CSS custom properties exist. */
const LEGACY_PHANTOM_TOKENS = [
  "--color-text-primary", "--color-text-secondary", "--color-text-muted",
  "--color-bg", "--color-violet-400", "--color-violet-500",
  "--color-gold-mid", "--color-gold-light",
];

const DYNAMIC_IMPORT_RE = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
const MCP_QUERY_RE =
  /\buseMCPQuery\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;
const MCP_MUTATION_RE =
  /\buseMCPMutation\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;
const MCP_DIRECT_RE =
  /\bcallMCPTool\s*(?:<[^()]*>)?\(\s*["']([A-Za-z_][\w-]*)["']\s*,\s*["']([A-Za-z_][\w-]*)["']/g;
const MCP_DATA_PAIR_RE =
  /\bserver:\s*["']([A-Za-z_][\w-]*)["']\s*,\s*\n\s*tool:\s*["']([A-Za-z_][\w-]*)["']/g;
const VAR_USE_RE = /var\(\s*(--[\w-]+)/g;
const BARE_TOKEN_RE = /["'`](--[\w-]+)["'`]/g;

// ═══════════════════════════════════════════════════ helpers ═════════════

function read(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function relFrom(root: string, abs: string): string {
  return path.relative(root, abs).replace(/\\/g, "/");
}

function snippetOf(line: string): string {
  return line.trim().replace(/\s+/g, " ").slice(0, SNIPPET_MAX);
}

/** Line-start offsets for index -> line mapping (binary search). */
function lineIndex(content: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") offsets.push(i + 1);
  }
  return offsets;
}

function lineAt(offsets: number[], charIdx: number): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid]! <= charIdx) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function lineText(content: string, offsets: number[], line: number): string {
  const start = offsets[line - 1] ?? 0;
  const end = line < offsets.length ? offsets[line]! - 1 : content.length;
  return content.slice(start, Math.max(start, end));
}

function walk(dir: string, extensions: string[], acc: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      walk(full, extensions, acc);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      acc.push(full);
    }
  }
  return acc;
}

// ═══════════════════════════════════════════ CLI & root resolution ═══════

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    root: undefined,
    json: false,
    quiet: false,
    noColor: false,
    checks: CHECKS.map((c) => c.id),
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    switch (arg) {
      case "--json":
        opts.json = true;
        break;
      case "--quiet":
      case "-q":
        opts.quiet = true;
        break;
      case "--no-color":
        opts.noColor = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      case "--root": {
        const value = argv[++i];
        if (!value) throw new UsageError("--root requires a path argument");
        opts.root = value;
        break;
      }
      case "--check": {
        const value = argv[++i];
        if (!value) throw new UsageError("--check requires a comma-separated list argument");
        const ids = value
          .split(",")
          .map((tok) => tok.trim().toLowerCase())
          .filter(Boolean)
          .map((tok) => {
            const match = CHECKS.find((c) => c.num === tok || c.id === tok);
            if (!match) {
              throw new UsageError(
                `Unknown check "${tok}" — valid: ${CHECKS.map((c) => `${c.num}/${c.id}`).join(", ")}`,
              );
            }
            return match.id;
          });
        if (ids.length === 0) throw new UsageError("--check received an empty list");
        opts.checks = ids;
        break;
      }
      default:
        throw new UsageError(`Unknown option "${arg}" — run with --help`);
    }
  }
  return opts;
}

/**
 * ESM/CJS-safe root resolution (VI-02): no __dirname anywhere.
 * Priority: --root, then the directory of this script (argv[1]), then cwd;
 * each seed walks up until a directory containing frontend/src is found.
 */
function resolveProjectRoot(cliRoot: string | undefined): string {
  const seeds: string[] = [];
  if (cliRoot) seeds.push(path.resolve(cliRoot));
  if (process.argv[1]) seeds.push(path.dirname(path.resolve(process.argv[1])));
  seeds.push(process.cwd());

  for (const seed of seeds) {
    let dir = seed;
    for (let depth = 0; depth < 5; depth++) {
      if (isDir(path.join(dir, "frontend", "src"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return seeds[seeds.length - 1]!;
}

// ═════════════════════════════════════════ shared context extraction ══════

/** "server::tool" keys from mock-registry.ts (VI-06: indent-relative). */
function extractRegistryKeys(content: string): Set<string> {
  const keys = new Set<string>();
  const lines = content.split("\n");
  let server: string | null = null;
  let serverIndent = -1;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

    const serverMatch = rawLine.match(/^([ \t]{0,4})([A-Za-z_][\w]*)[ \t]*:[ \t]*\{/);
    if (serverMatch) {
      server = serverMatch[2]!;
      serverIndent = serverMatch[1]!.length;
      continue;
    }

    if (server === null) continue;
    const indent = rawLine.match(/^[ \t]*/)![0]!.length;
    if (indent <= serverIndent) {
      server = null;
      serverIndent = -1;
      continue;
    }
    // Mock handlers: arrow "tool: (params) => …" or method "tool(params) { …"
    const arrow = rawLine.match(/^[ \t]*([A-Za-z_][\w]*)[ \t]*:[ \t]*\(/);
    const method = rawLine.match(/^[ \t]*([A-Za-z_][\w]*)[ \t]*\([^)]*\)[ \t]*\{/);
    const tool = arrow?.[1] ?? method?.[1];
    if (tool) keys.add(`${server}::${tool}`);
  }
  return keys;
}

/** All useMCPQuery("server", "tool") references across src (VI-08: once). */
function collectMcpQueries(frontendSrc: string, tsFiles: string[]): McpQueryRef[] {
  const refs: McpQueryRef[] = [];
  for (const file of tsFiles) {
    const relPath = relFrom(frontendSrc, file);
    if (relPath.startsWith("shared/mocks/")) continue;
    if (/\.(test|spec|stories)\.[tj]sx?$/.test(relPath)) continue;
    const content = read(file);
    if (!content) continue;
    const offsets = lineIndex(content);
    for (const m of content.matchAll(MCP_QUERY_RE)) {
      refs.push({
        file: relPath,
        line: lineAt(offsets, m.index ?? 0),
        server: m[1]!,
        tool: m[2]!,
      });
    }
  }
  return refs;
}

/** VI-12: non-hook tool references — mutations, direct calls, advisor data pairs. */
function collectExtraToolRefs(frontendSrc: string, tsFiles: string[]): McpQueryRef[] {
  const refs: McpQueryRef[] = [];
  const patterns = [MCP_MUTATION_RE, MCP_DIRECT_RE, MCP_DATA_PAIR_RE];
  for (const file of tsFiles) {
    const relPath = relFrom(frontendSrc, file);
    if (relPath.startsWith("shared/mocks/")) continue;
    if (/\.(test|spec|stories)\.[tj]sx?$/.test(relPath)) continue;
    const content = read(file);
    if (!content) continue;
    const offsets = lineIndex(content);
    for (const re of patterns) {
      for (const m of content.matchAll(re)) {
        refs.push({
          file: relPath,
          line: lineAt(offsets, m.index ?? 0),
          server: m[1]!,
          tool: m[2]!,
        });
      }
    }
  }
  return refs;
}

/** Test files excluded — they register fake tools (VI-01 precision). */
function isBackendSource(abs: string, backendSrc: string): boolean {
  const relPath = relFrom(backendSrc, abs);
  if (relPath.startsWith("tests/") || relPath.includes("/tests/")) return false;
  const base = path.basename(abs);
  return !(/^test_.*\.py$/.test(base) || /_test\.py$/.test(base) || base === "conftest.py");
}

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
  "engagement.list_reactivation_campaigns": ["design_reactivation_campaign"],
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
  "guests.list_trial_memberships": ["manage_trial_memberships"],
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
  compatAliases?: Map<string, string>,
): Vi14Classification {
  const dotted = server + "." + tool;
  const seed = VI14_EQUIVALENCES[dotted] ?? [];
  const cands = vi14RefCandidates(server, tool);

  // 0) B3: the backend registry itself resolves this legacy key
  // (AGENT_ALIASES + TOOL_ALIASES in registry.py, applied by the
  // dispatch layer with Deprecation headers). The ref is served —
  // it is a compat key, not missing debt.
  const canonicalKey = compatAliases?.get(dotted);
  if (canonicalKey) {
    const [cs, ct] = canonicalKey.split(".");
    if (backend.byServer.get(cs)?.has(ct)) {
      return {
        status: "tool-backend",
        real: canonicalKey,
        evidence: ["registry.py compat alias: " + dotted + " -> " + canonicalKey],
      };
    }
    if (registryKeys.has(cs + "::" + ct)) {
      return {
        status: "servido-por-mock",
        real: canonicalKey,
        evidence: ["registry.py compat alias (mock): " + dotted + " -> " + canonicalKey],
      };
    }
  }

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

/** Custom properties defined at declaration position (line start). */
function extractDefinedTokens(cssFiles: string[]): Set<string> {
  const tokens = new Set<string>();
  const DECL_RE = /^[ \t]*(--[\w-]+)[ \t]*:/;
  for (const file of cssFiles) {
    const content = read(file);
    if (!content) continue;
    for (const rawLine of content.split("\n")) {
      const m = rawLine.match(DECL_RE);
      if (m) tokens.add(m[1]!);
    }
  }
  return tokens;
}

function buildContext(root: string): ScanContext {
  const frontendSrc = path.join(root, "frontend", "src");
  const backendSrc = path.join(root, "backend", "src", "club_mcp");

  const tsFiles = walk(frontendSrc, [".ts", ".tsx"]).filter((f) => !f.endsWith(".d.ts"));
  const cssFiles = walk(frontendSrc, [".css"]);
  const backendScanned = isDir(backendSrc);
  const pyFiles = backendScanned
    ? walk(backendSrc, [".py"]).filter((f) => isBackendSource(f, backendSrc))
    : [];
  const compatAliases = extractBackendCompatAliases(backendSrc);

  const routerContent = read(path.join(frontendSrc, "app", "router.tsx"));

  const registryContent = read(path.join(frontendSrc, "shared", "mocks", "mock-registry.ts"));
  const registryKeys = registryContent ? extractRegistryKeys(registryContent) : new Set<string>();
  const registryFound = registryContent !== null;

  const mcpQueries = collectMcpQueries(frontendSrc, tsFiles);
  const extraToolRefs = collectExtraToolRefs(frontendSrc, tsFiles); // VI-12
  const backendTools = extractBackendToolNames(pyFiles);

  const definedTokens = extractDefinedTokens(cssFiles);
  const tokenSource: "css" | "legacy" = definedTokens.size > 0 ? "css" : "legacy";

  return {
    root,
    frontendSrc,
    backendSrc,
    tsFiles,
    cssFiles,
    pyFiles,
    routerContent,
    registryKeys,
    registryFound,
    mcpQueries,
    extraToolRefs,
    backendTools,
    backendScanned,
    definedTokens,
    tokenSource,
    compatAliases,
  };
}

/**
 * B3: parse AGENT_ALIASES + TOOL_ALIASES from the backend registry.py —
 * the same DATA the dispatch layer applies at runtime (with Deprecation/
 * Sunset headers). This keeps the verifier in sync with the single source
 * of truth instead of a hand-maintained equivalence table.
 */
function extractBackendCompatAliases(backendSrc: string): Map<string, string> {
  const out = new Map<string, string>();
  const registryPath = path.join(backendSrc, "registry.py");
  const content = read(registryPath);
  if (!content) return out;

  // AGENT_ALIASES: { "legacy": "canonical", ... } — plain string dict.
  const agentBlock = matchBalancedDict(content, "AGENT_ALIASES");
  const agentRenames: Record<string, string> = {};
  if (agentBlock) {
    for (const m of agentBlock.matchAll(/["']([a-z_]+)["']\s*:\s*["']([a-z_]+)["']/g)) {
      agentRenames[m[1]!] = m[2]!;
    }
  }

  // TOOL_ALIASES: nested { canonical_agent: { legacy: target } } where
  // target is "tool", ("agent", "tool") or AliasAdapter(target=(...)).
  // The canonical agent lives in the OUTER dict key of each inner block,
  // so we scan inner blocks one at a time.
  const toolBlock = matchBalancedDict(content, "TOOL_ALIASES");
  if (toolBlock) {
    const INNER_RE = /"([a-z_0-9]+)":\s*\{/g;
    for (const inner of toolBlock.matchAll(INNER_RE)) {
      const canonicalAgent = inner[1]!;
      const innerBlock = matchBalancedDictFrom(toolBlock, inner.index ?? 0);
      if (!innerBlock) continue;
      const ENTRY_RE = /"([a-z_0-9]+)"\s*:\s*(?:\(\s*"([a-z_0-9]+)"\s*,\s*"([a-z_0-9]+)"\s*\)|"([a-z_0-9]+)"|AliasAdapter\(\s*target\s*=\s*\(\s*"([a-z_0-9]+)"\s*,\s*"([a-z_0-9]+)"\s*\))/g;
      for (const m of innerBlock.matchAll(ENTRY_RE)) {
        const legacyTool = m[1]!;
        const tAgent = m[2] ?? m[5] ?? canonicalAgent;
        const tTool = m[3] ?? m[6] ?? m[4];
        if (tTool === undefined || tTool === legacyTool) continue;
        const legacyServers = new Set<string>([canonicalAgent]);
        for (const [legacyName, canonical] of Object.entries(agentRenames)) {
          if (canonical === canonicalAgent) legacyServers.add(legacyName);
        }
        for (const [feName, targets] of Object.entries(VI14_SERVER_RENAMES)) {
          if (targets.includes(canonicalAgent)) legacyServers.add(feName);
        }
        for (const s of legacyServers) {
          out.set(s + "." + legacyTool, tAgent + "." + tTool);
        }
      }
    }
  }
  return out;
}

/** Extract the {...} literal of `NAME: dict[str, ...] = { ... }`. */
function matchBalancedDict(content: string, name: string): string | null {
  const assign = content.indexOf(name + ": dict");
  const start = assign >= 0 ? content.indexOf("{", assign) : -1;
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

function matchBalancedDictFrom(content: string, from: number): string | null {
  const start = content.indexOf("{", from);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

// ═════════════════════════════════════════════════════ checks ════════════

function outcome(
  id: string,
  title: string,
  severity: Severity,
  findings: Finding[],
  stats: Array<[string, string | number]>,
  notes: string[],
): CheckOutcome {
  return { id, title, severity, findings, stats, notes };
}

/** Resolves "@/x" against src/ — both quote styles, explicit extensions. */
function resolveAliasImport(specifier: string, srcRoot: string): string | null {
  const clean = specifier.slice(2); // strip "@/"
  const stems = [clean];
  if (/\.(?:js|jsx)$/.test(clean)) stems.push(clean.replace(/\.(?:js|jsx)$/, ""));
  for (const stem of stems) {
    for (const ext of ["", ".ts", ".tsx", ".js", ".jsx"]) {
      const candidate = path.join(srcRoot, stem + ext);
      if (isFile(candidate)) return candidate;
    }
    for (const indexFile of ["index.ts", "index.tsx", "index.js", "index.jsx"]) {
      const candidate = path.join(srcRoot, stem, indexFile);
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

function checkRouterImports(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [];
  let total = 0;
  let resolved = 0;

  if (ctx.routerContent === null) {
    findings.push({
      file: "app/router.tsx",
      line: 0,
      message: "router.tsx not found — lazy imports cannot be verified",
      severity: "error",
    });
    return outcome("router-imports", "1. Router Lazy Imports", "error", findings, [["found", 0]], notes);
  }

  const content = ctx.routerContent;
  const offsets = lineIndex(content);
  for (const m of content.matchAll(DYNAMIC_IMPORT_RE)) {
    const spec = m[1]!;
    if (!spec.startsWith("@/")) continue;
    total++;
    if (resolveAliasImport(spec, ctx.frontendSrc) !== null) {
      resolved++;
      continue;
    }
    const line = lineAt(offsets, m.index ?? 0);
    findings.push({
      file: "app/router.tsx",
      line,
      message: `import("${spec}") → file not found`,
      snippet: snippetOf(lineText(content, offsets, line)),
    });
  }

  notes.push("Only static-string dynamic imports are verified; template-literal imports are out of scope by design.");
  return outcome(
    "router-imports",
    "1. Router Lazy Imports",
    "error",
    findings,
    [
      ["found", total],
      ["resolved", resolved],
      ["broken", total - resolved],
    ],
    notes,
  );
}

function checkMcpCoverage(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const invalid = new Map<string, { tool: string; occurrences: Array<[string, number]> }>();

  for (const q of ctx.mcpQueries) {
    if (ctx.registryKeys.has(`${q.server}::${q.tool}`)) continue;
    const key = `${q.server}::${q.tool}`;
    const entry = invalid.get(key) ?? { tool: q.tool, occurrences: [] };
    entry.occurrences.push([q.file, q.line]);
    invalid.set(key, entry);
  }

  for (const [key, entry] of invalid) {
    const server = key.split("::")[0]!;
    const where = entry.occurrences.map(([f, l]) => `${f}:${l}`).join(", ");
    findings.push({
      file: entry.occurrences[0]![0],
      line: entry.occurrences[0]![1],
      message: `${server}.${entry.tool} is not in the mock registry (${entry.occurrences.length} use(s): ${where}) — depends on backend fallback`,
    });
  }

  if (!ctx.registryFound) notes.push("mock-registry.ts was not found — every query counts as uncovered.");
  notes.push("Tools outside the mock registry may still resolve via the backend fallback (see check 6).");

  const uncoveredRefs = [...invalid.values()].reduce((n, e) => n + e.occurrences.length, 0);
  return outcome(
    "mcp-coverage",
    "2. useMCPQuery — Mock Registry Coverage",
    "warning",
    findings,
    [
      ["refs", ctx.mcpQueries.length],
      ["covered", ctx.mcpQueries.length - uncoveredRefs],
      ["uncoveredTools", invalid.size],
    ],
    notes,
  );
}

function checkPhantomTokens(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [];
  const used = new Set<string>();
  const mentioned = new Set<string>();
  let varRefs = 0;

  if (ctx.tokenSource === "legacy") {
    notes.push("No CSS custom properties found under frontend/src — using the frozen v2 phantom-token list (8 tokens).");
    for (const file of ctx.tsFiles) {
      const relPath = relFrom(ctx.frontendSrc, file);
      const content = read(file);
      if (!content) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        for (const token of LEGACY_PHANTOM_TOKENS) {
          if (lines[i]!.includes(token)) {
            findings.push({
              file: relPath,
              line: i + 1,
              message: `Phantom token ${token} (legacy list)`,
              snippet: snippetOf(lines[i]!),
            });
          }
        }
      }
    }
    return outcome(
      "phantom-tokens",
      "3. Phantom CSS Tokens (legacy mode)",
      "warning",
      findings,
      [
        ["cssTokens", 0],
        ["legacyHits", findings.length],
      ],
      notes,
    );
  }

  for (const file of ctx.tsFiles) {
    const relPath = relFrom(ctx.frontendSrc, file);
    const content = read(file);
    if (!content) continue;
    const offsets = lineIndex(content);
    const lines = content.split("\n");

    // Local inline definitions ("--x": value) count as defined for this file.
    const locallyDefined = new Set<string>();
    for (const m of content.matchAll(BARE_TOKEN_RE)) {
      if (/^\s*:/.test(content.slice((m.index ?? 0) + m[0].length))) locallyDefined.add(m[1]!);
    }

    for (const m of content.matchAll(VAR_USE_RE)) {
      varRefs++;
      used.add(m[1]!);
      if (ctx.definedTokens.has(m[1]!)) continue;
      const line = lineAt(offsets, m.index ?? 0);
      findings.push({
        file: relPath,
        line,
        message: `var(${m[1]}) is not defined in any CSS under src/ — resolves to nothing at runtime`,
        snippet: snippetOf(lines[line - 1] ?? ""),
        severity: "warning",
      });
    }

    for (const m of content.matchAll(BARE_TOKEN_RE)) {
      if (locallyDefined.has(m[1]!)) continue;
      mentioned.add(m[1]!);
      if (ctx.definedTokens.has(m[1]!) || used.has(m[1]!)) continue;
      const line = lineAt(offsets, m.index ?? 0);
      findings.push({
        file: relPath,
        line,
        message: `Token ${m[1]} mentioned in a string but not defined in any CSS (possible phantom)`,
        snippet: snippetOf(lines[line - 1] ?? ""),
        severity: "info",
      });
    }
  }

  const unused = [...ctx.definedTokens].filter((t) => !used.has(t) && !mentioned.has(t));
  if (unused.length > 0) {
    const preview = unused.slice(0, 20).join(", ");
    notes.push(`${unused.length} defined token(s) never referenced in TS/TSX: ${preview}${unused.length > 20 ? " …" : ""}`);
  }

  const phantomVar = findings.filter((f) => f.severity === "warning").length;
  return outcome(
    "phantom-tokens",
    "3. Phantom CSS Tokens",
    "warning",
    findings,
    [
      ["defined", ctx.definedTokens.size],
      ["varRefs", varRefs],
      ["undefinedVar", phantomVar],
      ["bareMentions", findings.length - phantomVar],
      ["definedUnused", unused.length],
    ],
    notes,
  );
}

function checkRawButtons(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [
    `Advisory: raw <button> is allowed in the primitive layer only — ${RAW_BUTTON_EXEMPT_DIRS.join(", ")}.`,
  ];
  let scanned = 0;

  for (const file of ctx.tsFiles) {
    if (!file.endsWith(".tsx")) continue;
    const relPath = relFrom(ctx.frontendSrc, file);
    if (RAW_BUTTON_EXEMPT_DIRS.some((d) => relPath.startsWith(`${d}/`))) continue;
    if (/\.(test|spec|stories)\.tsx$/.test(relPath)) continue;
    scanned++;
    const content = read(file);
    if (!content) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (/<button(?=[\s>]|$)/.test(lines[i]!.replace(/\r$/, ""))) {
        findings.push({
          file: relPath,
          line: i + 1,
          message: "Raw <button> outside the UI primitive layer — use <Button>/<GlowButton>",
          snippet: snippetOf(lines[i]!),
        });
      }
    }
  }

  return outcome(
    "raw-buttons",
    "4. Raw <button> Outside UI Primitives",
    "warning",
    findings,
    [
      ["tsxScanned", scanned],
      ["violations", findings.length],
    ],
    notes,
  );
}

function checkPermissionGates(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [];
  let adminRoutes = 0;
  let gated = 0;

  if (ctx.routerContent === null) {
    findings.push({
      file: "app/router.tsx",
      line: 0,
      message: "router.tsx not found — PermissionGate coverage cannot be verified",
      severity: "warning",
    });
    return outcome("permission-gates", "5. PermissionGate on Admin Routes", "warning", findings, [["adminRoutes", 0]], notes);
  }

  const lines = ctx.routerContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const pathMatch = lines[i]!.match(/path:\s*["']([^"']+)["']/);
    if (!pathMatch) continue;
    const route = pathMatch[1]!;
    if (route !== "admin" && !route.startsWith("admin/")) continue;
    adminRoutes++;

    // VI-09: window bounded by the NEXT route declaration (not a fixed 10 lines).
    let hasGate = false;
    for (let j = i; j < Math.min(i + 80, lines.length); j++) {
      if (j > i && /path:\s*["']/.test(lines[j]!)) break;
      if (GATE_IDENTIFIERS.some((g) => lines[j]!.includes(g))) {
        hasGate = true;
        break;
      }
    }
    if (hasGate) gated++;
    else {
      findings.push({
        file: "app/router.tsx",
        line: i + 1,
        message: `/${route} — no PermissionGate (looked for: ${GATE_IDENTIFIERS.join(", ")})`,
      });
    }
  }

  return outcome(
    "permission-gates",
    "5. PermissionGate on Admin Routes",
    "warning",
    findings,
    [
      ["adminRoutes", adminRoutes],
      ["gated", gated],
      ["ungated", adminRoutes - gated],
    ],
    notes,
  );
}

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
    const cls = vi14ClassifyRef(q.server, q.tool, idx, ctx.registryKeys, ctx.compatAliases);
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

/** VI-10: compare routes after normalization (whitespace, slashes). */
function normalizeRoute(route: string): string {
  return route.trim().replace(/^\/+/, "").replace(/\/+$/, "").replace(/\/{2,}/g, "/");
}

function checkDuplicateRoutes(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = ["Routes are compared after normalization (leading/trailing slash, //, whitespace). Case is NOT folded."];
  const map = new Map<string, { raw: string; lines: number[] }>();
  let declared = 0;

  if (ctx.routerContent !== null) {
    const lines = ctx.routerContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const pathMatch = lines[i]!.match(/path:\s*["']([^"']+)["']/);
      if (!pathMatch) continue;
      declared++;
      const raw = pathMatch[1]!;
      const key = normalizeRoute(raw);
      const entry = map.get(key) ?? { raw, lines: [] };
      entry.lines.push(i + 1);
      map.set(key, entry);
    }
  } else {
    findings.push({
      file: "app/router.tsx",
      line: 0,
      message: "router.tsx not found — duplicate detection skipped",
      severity: "warning",
    });
  }

  for (const entry of map.values()) {
    if (entry.lines.length > 1) {
      findings.push({
        file: "app/router.tsx",
        line: entry.lines[0]!,
        message: `Duplicate route "${entry.raw}" at lines ${entry.lines.join(", ")}`,
      });
    }
  }

  return outcome(
    "duplicate-routes",
    "7. Duplicate Routes",
    "error",
    findings,
    [
      ["declared", declared],
      ["unique", map.size],
      ["duplicates", findings.length],
    ],
    notes,
  );
}

function checkOrphanMocks(ctx: ScanContext): CheckOutcome {
  const findings: Finding[] = [];
  const notes: string[] = [
    "Heuristic (VI-12): references counted from useMCPQuery + useMCPMutation + callMCPTool + adjacent {server, tool} data pairs — direct registry calls are still not tracked.",
  ];

  if (!ctx.registryFound) {
    notes.push("mock-registry.ts not found — nothing to check.");
    return outcome("orphan-mocks", "8. Orphan Mock Entries", "info", findings, [["registryKeys", 0]], notes);
  }

  const usedKeys = new Set(
    ctx.mcpQueries
      .concat(ctx.extraToolRefs)
      .map((q) => `${q.server}::${q.tool}`),
  );
  const orphansByServer = new Map<string, string[]>();
  let orphanCount = 0;
  for (const key of ctx.registryKeys) {
    if (usedKeys.has(key)) continue;
    const [server, tool] = key.split("::");
    const list = orphansByServer.get(server!) ?? [];
    list.push(tool!);
    orphansByServer.set(server!, list);
    orphanCount++;
  }

  for (const [server, tools] of orphansByServer) {
    findings.push({
      file: "shared/mocks/mock-registry.ts",
      line: 1,
      message: `${server}: ${tools.length} unused mock(s) — ${tools.join(", ")}`,
      severity: "info",
    });
  }

  return outcome(
    "orphan-mocks",
    "8. Orphan Mock Entries",
    "info",
    findings,
    [
      ["registryKeys", ctx.registryKeys.size],
      ["referenced", ctx.registryKeys.size - orphanCount],
      ["orphanTools", orphanCount],
      ["extraRefs", ctx.extraToolRefs.length],
    ],
    notes,
  );
}

const CHECKS: ReadonlyArray<{ id: string; num: string; title: string; run: (ctx: ScanContext) => CheckOutcome }> = [
  { id: "router-imports", num: "1", title: "1. Router Lazy Imports", run: checkRouterImports },
  { id: "mcp-coverage", num: "2", title: "2. useMCPQuery — Mock Registry Coverage", run: checkMcpCoverage },
  { id: "phantom-tokens", num: "3", title: "3. Phantom CSS Tokens", run: checkPhantomTokens },
  { id: "raw-buttons", num: "4", title: "4. Raw <button> Outside UI Primitives", run: checkRawButtons },
  { id: "permission-gates", num: "5", title: "5. PermissionGate on Admin Routes", run: checkPermissionGates },
  { id: "backend-tools", num: "6", title: "6. Tools Missing from Mock AND Backend", run: checkBackendTools },
  { id: "duplicate-routes", num: "7", title: "7. Duplicate Routes", run: checkDuplicateRoutes },
  { id: "orphan-mocks", num: "8", title: "8. Orphan Mock Entries", run: checkOrphanMocks },
];

const HELP = [
  `verify-integration v${TOOL_VERSION} — Castillo AI Platform`,
  "",
  "Usage: npx tsx scripts/verify-integration.ts [options]",
  "",
  "Options:",
  "  --json          machine-readable report (CI); suppresses the console report",
  "  --quiet, -q     summary + verdict only",
  "  --no-color      disable ANSI colors (auto when piped or NO_COLOR is set)",
  "  --root <path>   project root (default: script dir -> cwd, walking up until frontend/src)",
  "  --check <list>  run a subset, comma-separated, by number or slug:",
  ...CHECKS.map((c) => `                    ${c.num} ${c.id}`),
  "  --help, -h      show this help",
  "",
  "Exit codes: 0 all clear · 1 errors · 2 warnings only · 3 usage/internal error",
].join("\n");

// ═══════════════════════════════════════════════════ reporting ════════════

interface Colors {
  reset: string;
  red: string;
  green: string;
  yellow: string;
  cyan: string;
  dim: string;
  bold: string;
}

function makeColors(enabled: boolean): Colors {
  return enabled
    ? {
        reset: "\x1b[0m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        cyan: "\x1b[36m",
        dim: "\x1b[2m",
        bold: "\x1b[1m",
      }
    : { reset: "", red: "", green: "", yellow: "", cyan: "", dim: "", bold: "" };
}

function visibleLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function padEndVisible(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - visibleLen(s)));
}

function printBox(lines: string[], c: Colors): void {
  const inner = Math.max(20, ...lines.map(visibleLen));
  const bar = "═".repeat(inner + 2);
  console.log(`${c.bold}╔${bar}╗${c.reset}`);
  for (const line of lines) {
    console.log(`${c.bold}║${c.reset} ${padEndVisible(line, inner)} ${c.bold}║${c.reset}`);
  }
  console.log(`${c.bold}╚${bar}╝${c.reset}`);
}

function severityMark(sev: Severity, c: Colors): string {
  return sev === "error" ? `${c.red}✗${c.reset}` : sev === "warning" ? `${c.yellow}⚠${c.reset}` : `${c.cyan}ℹ${c.reset}`;
}

function printOutcome(o: CheckOutcome, c: Colors): void {
  console.log(`\n${c.bold}${c.cyan}━━━ ${o.title} ━━━${c.reset}`);
  for (const n of o.notes) console.log(`  ${c.dim}note: ${n}${c.reset}`);
  const shown = o.findings.slice(0, MAX_DISPLAYED_FINDINGS);
  for (const f of shown) {
    const sev = f.severity ?? o.severity;
    const loc = f.line > 0 ? `${f.file}:${f.line}` : f.file;
    console.log(`  ${severityMark(sev, c)} ${c.bold}${loc}${c.reset} ${c.dim}—${c.reset} ${f.message}`);
    if (f.snippet) console.log(`        ${c.dim}${f.snippet}${c.reset}`);
  }
  if (o.findings.length > shown.length) {
    console.log(`  ${c.dim}… +${o.findings.length - shown.length} more (see --json for the full list)${c.reset}`);
  }
  if (o.findings.length === 0) console.log(`  ${c.green}✓${c.reset} ${c.dim}no findings${c.reset}`);
  if (o.stats.length > 0) console.log(`  ${c.dim}${o.stats.map(([k, v]) => `${k}=${v}`).join(" · ")}${c.reset}`);
}

function coloredCount(n: number, color: string, c: Colors): string {
  return n > 0 ? `${color}${c.bold}${n}${c.reset}` : `${c.dim}0${c.reset}`;
}

function printConsoleReport(
  ctx: ScanContext,
  outcomes: CheckOutcome[],
  totals: Totals,
  opts: CliOptions,
  c: Colors,
  durationMs: number,
  exitCode: number,
): void {
  printBox(
    [
      `${c.bold}Castillo AI Platform — Integration Verifier v${TOOL_VERSION}${c.reset}`,
      `${c.dim}${new Date().toISOString()} · root: ${ctx.root}${c.reset}`,
    ],
    c,
  );

  if (!opts.quiet) for (const o of outcomes) printOutcome(o, c);

  const rows: string[] = [];
  for (const o of outcomes) {
    const t = countTotals([o]);
    const status =
      t.errors > 0 ? `${c.red}${t.errors} error(s)${c.reset}`
      : t.warnings > 0 ? `${c.yellow}${t.warnings} warning(s)${c.reset}`
      : t.info > 0 ? `${c.cyan}${t.info} info${c.reset}`
      : `${c.green}clean${c.reset}`;
    rows.push(`${o.title} ${c.dim}—${c.reset} ${status}`);
  }
  rows.push("");
  rows.push(
    `${c.bold}Errors:${c.reset} ${coloredCount(totals.errors, c.red, c)}  ` +
      `${c.bold}Warnings:${c.reset} ${coloredCount(totals.warnings, c.yellow, c)}  ` +
      `${c.bold}Info:${c.reset} ${coloredCount(totals.info, c.cyan, c)}`,
  );
  rows.push("");
  rows.push(`${c.dim}${ctx.tsFiles.length} ts/tsx · ${ctx.cssFiles.length} css · ${ctx.pyFiles.length} py scanned in ${durationMs}ms${c.reset}`);
  printBox(rows, c);

  if (exitCode === 1) {
    console.log(`\n${c.red}${c.bold}RESULT: FAIL — ${totals.errors} error(s) must be fixed. (exit 1)${c.reset}`);
  } else if (exitCode === 2) {
    console.log(`\n${c.yellow}${c.bold}RESULT: PASS with warnings — ${totals.warnings} advisory issue(s). (exit 2)${c.reset}`);
  } else {
    console.log(`\n${c.green}${c.bold}RESULT: ALL CLEAR. (exit 0)${c.reset}`);
  }
}

function buildJsonReport(
  ctx: ScanContext,
  outcomes: CheckOutcome[],
  totals: Totals,
  durationMs: number,
  exitCode: number,
): object {
  return {
    tool: "verify-integration",
    version: TOOL_VERSION,
    generatedAt: new Date().toISOString(),
    root: ctx.root,
    scanned: {
      tsTsFiles: ctx.tsFiles.length,
      cssFiles: ctx.cssFiles.length,
      pyFiles: ctx.pyFiles.length,
      backendDetected: ctx.backendScanned,
      backendTools: ctx.backendTools.flat.size,
      mockRegistryFound: ctx.registryFound,
      routerFound: ctx.routerContent !== null,
      tokenSource: ctx.tokenSource,
    },
    durationMs,
    totals,
    result: exitCode === 0 ? "all-clear" : exitCode === 1 ? "fail" : "pass-with-warnings",
    exitCode,
    checks: outcomes.map((o) => ({
      id: o.id,
      title: o.title,
      severity: o.severity,
      findingCount: o.findings.length,
      findings: o.findings.map((f) => ({
        severity: f.severity ?? o.severity,
        file: f.file,
        line: f.line,
        message: f.message,
      })),
      stats: Object.fromEntries(o.stats),
      notes: o.notes,
    })),
  };
}

// ═════════════════════════════════════════════════════ main ══════════════

function countTotals(outcomes: CheckOutcome[]): Totals {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const o of outcomes) {
    for (const f of o.findings) {
      const sev = f.severity ?? o.severity;
      if (sev === "error") errors++;
      else if (sev === "warning") warnings++;
      else info++;
    }
  }
  return { errors, warnings, info };
}

function main(): void {
  const startedAt = Date.now();
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    console.log(HELP);
    return;
  }

  const root = resolveProjectRoot(opts.root);
  if (!isDir(path.join(root, "frontend", "src"))) {
    console.error(`verify-integration: frontend/src not found under "${root}".`);
    console.error("Run from the project root or pass --root <path> (see --help).");
    process.exitCode = 3;
    return;
  }

  const ctx = buildContext(root);
  const outcomes = CHECKS.filter((c) => opts.checks.includes(c.id)).map((c) => c.run(ctx));
  const totals = countTotals(outcomes);
  const exitCode = totals.errors > 0 ? 1 : totals.warnings > 0 ? 2 : 0;
  const durationMs = Date.now() - startedAt;

  if (opts.json) {
    console.log(JSON.stringify(buildJsonReport(ctx, outcomes, totals, durationMs, exitCode), null, 2));
  } else {
    const colorEnabled = !opts.noColor && process.stdout.isTTY === true && !process.env.NO_COLOR;
    printConsoleReport(ctx, outcomes, totals, opts, makeColors(colorEnabled), durationMs, exitCode);
  }

  // exitCode (not process.exit) so piped stdout fully flushes in CI.
  process.exitCode = exitCode;
}

try {
  main();
} catch (err) {
  if (err instanceof UsageError) {
    console.error(`verify-integration: ${err.message}`);
    console.error("Run with --help for usage.");
    process.exitCode = 3;
  } else {
    console.error(
      `verify-integration: internal error — ${err instanceof Error ? err.stack ?? err.message : String(err)}`,
    );
    process.exitCode = 3;
  }
}
