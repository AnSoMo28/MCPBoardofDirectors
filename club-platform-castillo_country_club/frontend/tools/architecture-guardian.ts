/**
 * architecture-guardian.ts
 * frontend/tools/architecture-guardian.ts
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   tool-guardian
 * @engines     node >= 18 (ESM · run via `npx tsx tools/architecture-guardian.ts`)
 * @keyframes   0 (tool, not UI)
 * @depends     node:fs · node:path · node:url · node:child_process · node:crypto · ../architecture.manifest.ts
 *
 * ARCHITECTURE GUARDIAN v4.1.1 — Auto-enforcing quality gate (Pilar 10)
 *
 * LINEAGE: repo v2.1 (35 checks) ⊕ AI-gen v1.0 (manifest-driven) → v3.0.0
 *          fusion → v4.0.0 production-hardening audit → v4.1.0 audit-patch
 *          fusion (ledger: §16).
 *
 * USAGE:
 *   npx tsx tools/architecture-guardian.ts [options] [paths...]
 *   --root <dir>       project root (default: parent of tools/) · also --root=<dir>
 *   --json             machine-readable report on stdout (diagnostics → stderr)
 *   --quiet            summary only
 *   --changed          only files changed vs git HEAD (modified + untracked)
 *   --fix              apply safe, idempotent auto-fixes, then re-verify
 *   --strict           manifest-declared severity wins over advisory severity
 *   --no-cache         bypass .arch-guardian-cache.json (full re-analysis)
 *   --fail-on-warn     exit 1 on warnings too
 *   --verbose          print rule registry
 *   --help             usage
 *
 * EXIT CODES (fail-closed taxonomy):
 *   0 = pass            no blocking errors
 *   1 = violations      errors found (or warnings with --fail-on-warn)
 *   2 = internal error  unexpected crash OR unreadable file/dir (gate could not verify)
 *   3 = config error    bad flags · missing root · invalid manifest · git unavailable
 *
 * DESIGN CONTRACT (v4):
 *   D1  Zero module-level mutable state. Module-level RegExp literals are
 *       allowed ONLY without the `g` flag (stateless for .test()); every
 *       stateful scan creates its regex inside the invocation. The single
 *       sanctioned exception is the memoized manifest loader (pure, immutable
 *       after first evaluation).
 *   D2  Every check is a pure function CheckContext → readonly Violation[].
 *   D3  Single read pass: each file is read at most once per run; text is
 *       reused for hashing, import-graph parsing, checks and auto-fix.
 *   D4  Deterministic output: files, violations and every report array are
 *       totally ordered (file → line → rule → message) — in --json too.
 *   D5  Fail-closed: any condition that prevents verification (unreadable
 *       file/dir, missing git, invalid manifest/config) blocks the gate.
 *   D6  `autoFixable: true` ONLY when §13 ships a matching, idempotent fixer.
 *   D7  The engine (runGuardian) is exported and side-effect free; the CLI is
 *       a thin adapter. The module is safely importable from unit tests.
 *
 * ID POLICY (manifest v3.0.0 §5): unchanged —
 *   X-*  = tooling rules → canon CHECKLIST IDs via checkIds[] (no collisions)
 *   B-76..B-79, C-01, C-06, C-09, C-19 = identity-reuse (same meaning)
 *   B-56/B-57/B-64/B-70/B-73 = dimension-coverage violations keyed canon
 * CheckDef.keys[] lists every rule ID a check can EMIT, so BASE §0.2 scoring
 * counts B-5x/B-7x dimension violations correctly (v3 under-counted them).
 */

/* ═══════════════════ §1  TYPES ═══════════════════ */

type Severity = "error" | "warn";

interface Violation {
  readonly rule: string;
  readonly severity: Severity;
  readonly file: string;
  readonly line: number;
  readonly message: string;
  readonly autoFixable: boolean;
  readonly suggestion?: string;
}

interface CheckContext {
  readonly root: string;
  readonly absPath: string;
  readonly relPath: string;
  readonly content: string;
  readonly lines: readonly string[];
  readonly ext: "ts" | "tsx" | "css";
  readonly isFeature: boolean;
  readonly isShared: boolean;
  readonly featureId: string | null;
  /** 1-based line number for a character index into `content` (O(log n)). */
  readonly lineOf: (charIndex: number) => number;
}

interface CheckDef {
  /** Registry label (may be a range, e.g. "B-77/78/79"). */
  readonly key: string;
  /** Rule IDs this check can emit — drives `applicable` and BASE §0.2 scoring. */
  readonly keys: readonly string[];
  readonly description: string;
  readonly appliesTo: (ctx: CheckContext) => boolean;
  readonly run: (ctx: CheckContext) => readonly Violation[];
}

interface FileResult {
  readonly file: string;
  readonly violations: readonly Violation[];
  readonly applicable: readonly string[];
  readonly score: number;
}

interface GuardianReport {
  readonly tool: "architecture-guardian";
  readonly version: string;
  readonly root: string;
  readonly generatedAt: string;
  readonly filesScanned: number;
  readonly readErrors: readonly string[];
  readonly results: readonly FileResult[];
  readonly errors: readonly Violation[];
  readonly warnings: readonly Violation[];
  readonly autoFixable: readonly Violation[];
  readonly overallScore: number;
  readonly passThreshold: number;
  readonly scale: number;
  readonly fixesApplied: number;
  readonly durationMs: number;
  readonly passed: boolean;
}

interface Edge {
  readonly to: string;
  readonly line: number;
}

interface Cycle {
  readonly nodes: readonly string[];
  readonly lines: ReadonlyMap<string, number>;
}

interface ImportSpec {
  readonly spec: string;
  readonly line: number;
}

interface FileAnalysis {
  readonly file: string;
  readonly violations: readonly Violation[];
  readonly applicable: readonly string[];
  readonly hasImports: boolean;
}

interface CliOptions {
  readonly root: string;
  readonly json: boolean;
  readonly quiet: boolean;
  readonly changed: boolean;
  readonly fix: boolean;
  readonly strict: boolean;
  readonly noCache: boolean;
  readonly failOnWarn: boolean;
  readonly verbose: boolean;
  readonly help: boolean;
  readonly paths: readonly string[];
}

export interface GuardianRun {
  readonly report: GuardianReport;
  readonly exitCode: 0 | 1 | 2;
  readonly fixesApplied: number;
}

/** Config-level failure → exit 3. Internal-level failure → exit 2. */
class CliError extends Error {
  constructor(message: string, readonly exitCode: 2 | 3) {
    super(message);
    this.name = "CliError";
  }
}

/* ═══════════════════ §2  MANIFEST CONTRACT (single source) ═══════════════════ */

import * as MANIFEST_MODULE from "../architecture.manifest";

interface RuleMeta {
  readonly severity: Severity;
  readonly checkIds: readonly string[];
}

interface ManifestContract {
  readonly VALID_TOKENS: readonly string[];
  readonly DEPRECATED_TOKENS: readonly string[];
  readonly STRUCTURAL_COLOR_ALLOWLIST: readonly string[];
  readonly DEFAULT_EXPORT_ALLOWLIST: readonly string[];
  readonly BANNED_FONTS: readonly string[];
  readonly BANNED_DEPENDENCIES: readonly string[];
  /** Roadmap X-29 (unknown var(--x) references) will consume these. */
  readonly PLANNED_TOKENS: readonly string[];
  readonly SCORING: {
    readonly scale: number;
    readonly passThreshold: number;
    readonly penalties: Readonly<Record<string, number>>;
  };
  readonly RULES: Readonly<Record<string, RuleMeta>>;
}

let manifestCache: ManifestContract | undefined;

/**
 * Loads and structurally validates ../architecture.manifest at first use.
 * A malformed manifest is a config error (exit 3), never a silent skip —
 * the gate refuses to run on assumptions it cannot verify (D5).
 */
function getManifest(): ManifestContract {
  if (manifestCache === undefined) {
    manifestCache = assertManifestShape(MANIFEST_MODULE);
  }
  return manifestCache;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string");
}

/**
 * Patch 1 (AG4-01): the fusion manifest v3.0.0 exports ReadonlySet
 * collections while repo v2.1 shipped string[] — the boot contract accepts
 * BOTH shapes. isStringArray survives only for cache validation (§13).
 */
function toStringArray(value: unknown, label: string): string[] {
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
    return value as string[];
  }
  if (value instanceof Set && [...value].every((x) => typeof x === "string")) {
    return [...(value as Set<string>)];
  }
  throw new CliError(
    `architecture.manifest: ${label} must be string[] | ReadonlySet<string>`,
    3,
  );
}

function toOptionalStringArray(value: unknown, label: string): string[] {
  return value === undefined ? [] : toStringArray(value, label);
}

function assertManifestShape(mod: unknown): ManifestContract {
  if (!isRecord(mod)) {
    throw new CliError("architecture.manifest must export a module object", 3);
  }
  const scoring = mod["SCORING"];
  if (
    !isRecord(scoring) ||
    typeof scoring["scale"] !== "number" ||
    typeof scoring["passThreshold"] !== "number" ||
    !isRecord(scoring["penalties"]) ||
    !Object.values(scoring["penalties"]).every((p) => typeof p === "number")
  ) {
    throw new CliError("architecture.manifest: SCORING { scale, passThreshold, penalties } is malformed", 3);
  }
  const rules = mod["RULES"];
  if (!isRecord(rules)) {
    throw new CliError("architecture.manifest: RULES must be a record", 3);
  }
  const RULES: Record<string, RuleMeta> = {};
  for (const [id, meta] of Object.entries(rules)) {
    if (!isRecord(meta)) {
      throw new CliError(
        `architecture.manifest: RULES["${id}"] needs { severity: "error"|"warn", checkIds: string[] | ReadonlySet<string> }`,
        3,
      );
    }
    const raw: unknown = meta["severity"];
    const severity: Severity | undefined = raw === "error" || raw === "warn" ? raw : undefined;
    if (severity === undefined) {
      throw new CliError(
        `architecture.manifest: RULES["${id}"] needs { severity: "error"|"warn", checkIds: string[] | ReadonlySet<string> }`,
        3,
      );
    }
    RULES[id] = {
      severity,
      checkIds: toOptionalStringArray(meta["checkIds"], `RULES["${id}"].checkIds`),
    };
  }
  const normalized = {
    VALID_TOKENS: toStringArray(mod["VALID_TOKENS"], "VALID_TOKENS"),
    DEPRECATED_TOKENS: toStringArray(mod["DEPRECATED_TOKENS"], "DEPRECATED_TOKENS"),
    STRUCTURAL_COLOR_ALLOWLIST: toStringArray(mod["STRUCTURAL_COLOR_ALLOWLIST"], "STRUCTURAL_COLOR_ALLOWLIST"),
    DEFAULT_EXPORT_ALLOWLIST: toStringArray(mod["DEFAULT_EXPORT_ALLOWLIST"], "DEFAULT_EXPORT_ALLOWLIST"),
    BANNED_FONTS: toStringArray(mod["BANNED_FONTS"], "BANNED_FONTS"),
    BANNED_DEPENDENCIES: toStringArray(mod["BANNED_DEPENDENCIES"], "BANNED_DEPENDENCIES"),
    PLANNED_TOKENS: toOptionalStringArray(mod["PLANNED_TOKENS"], "PLANNED_TOKENS"),
  };
  return {
    ...normalized,
    SCORING: {
      scale: (scoring as Record<string, unknown>)["scale"] as number,
      passThreshold: (scoring as Record<string, unknown>)["passThreshold"] as number,
      penalties: (scoring as Record<string, unknown>)["penalties"] as Record<string, number>,
    },
    RULES,
  };
}

/* ═══════════════════ §3  TOOL-LEVEL CONSTANTS ═══════════════════
 * TODO(manifest v3.1): absorb SHARED_COMPONENT_NAMES / GENERIC_KEYFRAMES /
 * MCP_CHAIN_EXEMPT / ADVISOR_EXEMPT / EXTRA_BANNED_ANIMATION_LIBS into
 * architecture.manifest (BASE §1.3 anti-duplication).
 */

const TOOL_VERSION = "4.1.3";
const CACHE_FILE = ".arch-guardian-cache.json";
const MAX_CYCLES = 10;
const HEADER_SCAN_LINES = 40;

const SHARED_COMPONENT_NAMES: readonly string[] = [
  "Button", "Card", "Badge", "Input", "Modal", "Skeleton",
  "FormField", "FilterDropdown", "Toast", "ToastContainer",
  "EmptyState", "Table", "TrendIcon", "FrostedGlassCard",
  "GlowButton", "ScoreGauge", "WizardStepper", "FreshnessBadge",
  "StaleDataBanner", "NotificationDropdown", "AdvisorActionModal",
  "AdvisorReactionCard", "PlanStepApprovalModal", "CommandPalette",
];

const GENERIC_KEYFRAMES: readonly string[] = [
  "fadeIn", "fadeOut", "slideUp", "slideDown", "slideLeft", "slideRight",
  "scaleIn", "scaleOut", "pulse", "spin", "bounce", "shake",
  "popIn", "popOut", "zoomIn", "zoomOut", "flash", "blink", "wiggle",
];

const MCP_CHAIN_EXEMPT: readonly string[] = [
  "src/shared/lib/api.ts",
  "src/shared/lib/mcp/mcp-router.ts",
  "src/shared/hooks/useMCPQuery.ts",
];

/** CHECKLIST §14.6 P2: useAutonomousAdvisor → callMCPTool is the sanctioned
 *  autonomous-execution pattern. All shared/hooks/ are MCP-call surface. */
function isMcpCallLayer(relPath: string): boolean {
  return (
    relPath.startsWith("src/shared/hooks/") ||
    relPath === "src/shared/lib/api.ts" ||
    relPath === "src/shared/lib/mcp/mcp-router.ts"
  );
}

const ADVISOR_EXEMPT: readonly string[] = [
  "shared/lib/advisor-engine/",
  "shared/hooks/",
];

const EXTRA_BANNED_ANIMATION_LIBS: readonly string[] = ["@react-spring"];

/** Ignored as PATH SEGMENTS (v3 matched substrings → "my-dist/" was skipped). */
const IGNORED_SEGMENTS: ReadonlySet<string> = new Set([
  "node_modules", "dist", "build", "htmlcov", ".pytest_cache",
  "coverage", "__tests__",
]);

/* — Tailwind detection tables (X-26). Tokenized rewrite of the v3 mega-regex:
 * same matching semantics, but reviewable and unit-testable. — */

const TW_WORD_UNITS: readonly string[] = [
  "flex", "grid", "block", "inline", "hidden", "absolute", "relative",
  "fixed", "sticky", "truncate", "rounded", "border", "shadow",
  "overflow", "whitespace", "pointer-events",
];
const TW_DASH_UNITS: readonly string[] = [
  "min-w-", "max-w-", "space-", "leading-", "tracking-",
  "cursor-", "select-", "list-", "object-",
  "gap-x-", "gap-y-", "inset-x-", "inset-y-", "divide-x-", "divide-y-", // AG4-03
];

/** Patch 11 (AG4-12/03): full-size keywords — no numeric/word unit covered them. */
const TW_KEYWORD_BAN: ReadonlySet<string> = new Set(["w-full", "h-full"]);
const TW_NUMERIC_PREFIXES: readonly string[] = [
  "w-", "h-", "p-", "px-", "py-", "pt-", "pb-", "pl-", "pr-",
  "m-", "mx-", "my-", "mt-", "mb-", "ml-", "mr-", "gap-",
  "opacity-", "z-",
];
const TW_TEXT_SIZES: ReadonlySet<string> = new Set([
  "xs", "sm", "base", "lg", "xl", "2xl", "3xl",
]);
const TW_FONT_WEIGHTS: ReadonlySet<string> = new Set([
  "thin", "light", "normal", "medium", "semibold", "bold", "extrabold", "black",
]);
const TW_COLOR_NAMES: readonly string[] = [
  "white", "black", "gray", "red", "blue", "green", "yellow", "purple", "pink",
  "indigo", "teal", "emerald", "amber", "rose", "violet", "sky", "cyan", "lime",
  "orange", "slate", "zinc", "neutral", "stone",
];

/* ═══════════════════ §4  CORE UTILITIES ═══════════════════ */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import type { Dirent, Stats } from "node:fs";
import { relative, dirname, basename, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countChar(haystack: string, needle: string): number {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = haystack.indexOf(needle, i + 1);
  }
  return n;
}

function isCommentLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--");
}

/** Patch 5 (AG4-06): unified comment guard for regex-exec loops — commented-out
 *  code must neither satisfy nor violate the rules (X-01/05/08/19, X-15). */
function isInsideComment(ctx: CheckContext, charIndex: number): boolean {
  return isCommentLine(ctx.lines[ctx.lineOf(charIndex) - 1] ?? "");
}

/** Replaces CSS comment bodies with spaces — indices and newlines are preserved,
 *  so ctx.lineOf() stays valid on the stripped text. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** v4.1.0 (AG4-15): true when charIndex sits on a `--custom-prop: …` line —
 *  the token SOURCE, not a usage (X-15 + fixer idempotency). */
function isCustomPropertyDefinition(src: string, charIndex: number): boolean {
  const lineStart = src.lastIndexOf("\n", charIndex) + 1;
  return /^[\t ]*--[\w-]+\s*:/.test(src.slice(lineStart, charIndex + 1));
}

/** Precomputes line offsets → O(log n) line lookup (v3 re-split per match). */
function createLineIndexer(content: string): (charIndex: number) => number {
  const offsets: number[] = [0];
  for (let i = content.indexOf("\n"); i !== -1; i = content.indexOf("\n", i + 1)) {
    offsets.push(i + 1);
  }
  return (charIndex: number): number => {
    const clamped = Math.max(0, Math.min(charIndex, content.length));
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if (offsets[mid] <= clamped) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

function buildCheckContext(root: string, absPath: string, relPath: string, text: string): CheckContext {
  return {
    root,
    absPath,
    relPath,
    content: text,
    lines: text.split(/\r?\n/),
    ext: relPath.endsWith(".tsx") ? "tsx" : relPath.endsWith(".css") ? "css" : "ts",
    isFeature: relPath.includes("features/"),
    isShared: relPath.includes("shared/"),
    featureId: /^src\/features\/([^/]+)\//.exec(relPath)?.[1] ?? null,
    lineOf: createLineIndexer(text),
  };
}

function mkViolation(
  ctx: CheckContext,
  rule: string,
  line: number,
  message: string,
  opts: { severity?: Severity; autoFixable?: boolean; suggestion?: string } = {},
): Violation {
  return {
    rule,
    severity: opts.severity ?? "error",
    file: ctx.relPath,
    line,
    message,
    autoFixable: opts.autoFixable ?? false,
    ...(opts.suggestion !== undefined ? { suggestion: opts.suggestion } : {}),
  };
}

/** Total order for deterministic reports: file → line → rule → message.
 *  v4.1.0 (AG4-16): code-unit comparison, NOT localeCompare — ICU collation
 *  is case-blind at primary strength and orders "config" before "Demo",
 *  which contradicts the byte order the cache/JSON consumers assume and
 *  varies with the runtime locale. Determinism must be locale-independent. */
function cmpCodeunit(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareViolations(a: Violation, b: Violation): number {
  return (
    cmpCodeunit(a.file, b.file) ||
    a.line - b.line ||
    cmpCodeunit(a.rule, b.rule) ||
    cmpCodeunit(a.message, b.message) ||
    cmpCodeunit(a.severity, b.severity)
  );
}

/**
 * Index of the line AFTER the block starting at `start`.
 * Handles same-line blocks and single-line at-statements (@import/@charset);
 * brace-less multi-line constructs are a documented limitation (the canonical
 * CSS templates of this repo always open braces on the at-rule line).
 */
function skipBlock(lines: readonly string[], start: number): number {
  const first = lines[start] ?? "";
  if (!first.includes("{")) return start + 1;
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    depth += countChar(lines[i], "{") - countChar(lines[i], "}");
    if (depth <= 0) return i + 1;
  }
  return lines.length;
}

/* ═══════════════════ §5  CHECKS — ARCHITECTURE ═══════════════════ */

const checkX01_RelativeShared: CheckDef = {
  key: "X-01",
  keys: ["X-01"],
  description: "shared/ must be imported via the @shared alias, never relatively",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /from\s+["']((?:\.\.\/)+)(shared\/[^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.content)) !== null) {
      if (isInsideComment(ctx, m.index)) continue; // Patch 5 (AG4-06)
      const target = m[2].replace(/^shared\//, "");
      out.push(mkViolation(ctx, "X-01", ctx.lineOf(m.index),
        `Relative import to shared/: "${m[1]}${m[2]}"`,
        { autoFixable: false, suggestion: `Use: import ... from "@shared/${target}"` }));
    }
    return out;
  },
};

const checkX02_DuplicateComponents: CheckDef = {
  key: "X-02",
  keys: ["X-02"],
  description: "No local re-declaration of shared/ UI primitives",
  appliesTo: (c) => c.ext === "tsx" && !c.relPath.includes("shared/components/ui/"),
  run: (ctx) => {
    const out: Violation[] = [];
    for (const name of SHARED_COMPONENT_NAMES) {
      // Patch 7 (AG4-08): ':' in the trailing class also detects typed const
      // declarations (`const Button: React.FC = …`), not just call/assign.
      const re = new RegExp(`(?:export\\s+)?(?:function|const|class)\\s+${escapeRegExp(name)}\\s*[=({:]`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.content)) !== null) {
        const line = ctx.lineOf(m.index);
        if (isCommentLine(ctx.lines[line - 1] ?? "")) continue;
        out.push(mkViolation(ctx, "X-02", line,
          `Local "${name}" duplicates shared/ primitive`,
          { suggestion: `import { ${name} } from "@shared/components/ui";` }));
      }
    }
    return out;
  },
};

const checkX03_RawFetch: CheckDef = {
  key: "X-03",
  keys: ["X-03"],
  description: "Raw fetch() is only allowed inside the MCP transport chain",
  appliesTo: (c) => c.ext !== "css" && !MCP_CHAIN_EXEMPT.includes(c.relPath),
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /\bfetch\s*\(/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-03", i + 1,
          "Raw fetch() outside MCP chain",
          { suggestion: 'useMCPQuery<T>("agent", "tool", params) or useMCPMutation' }));
      }
    });
    return out;
  },
};

/** Advisor internals that must stay behind the advisor-engine barrel.
 *  NOTE: `new AdvisorEngine` is owned by X-09 (v3 double-reported it here). */
const ADVISOR_INTERNALS: readonly { readonly re: RegExp; readonly label: string }[] = [
  { re: /\bbuildInsight\s*\(/, label: "buildInsight()" },
  { re: /\bcomputeHealthScore\s*\(/, label: "computeHealthScore()" },
  { re: /\bcomputeConfidence\s*\(/, label: "computeConfidence()" },
  { re: /\bevaluateRule\s*\(/, label: "evaluateRule()" },
  { re: /\bdetectCausalChains\s*\(/, label: "detectCausalChains()" },
  { re: /\bcreateSignal\s*\(/, label: "createSignal()" },
];

const checkX04_InlineAdvisor: CheckDef = {
  key: "X-04",
  keys: ["X-04"],
  description: "Advisor internals stay inside advisor-engine (use the public hook)",
  appliesTo: (c) =>
    c.ext !== "css" && !ADVISOR_EXEMPT.some((frag) => c.relPath.includes(frag)),
  run: (ctx) => {
    const out: Violation[] = [];
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      for (const { re, label } of ADVISOR_INTERNALS) {
        if (re.test(line)) {
          out.push(mkViolation(ctx, "X-04", i + 1,
            `Inline advisor logic ${label} outside advisor-engine`,
            { suggestion: "Use useAdvisorEngine or the public barrel @shared/lib/advisor-engine" }));
        }
      }
    });
    return out;
  },
};

const checkX05_CrossFeature: CheckDef = {
  key: "X-05",
  keys: ["X-05"],
  description: "features/ may not import from sibling features (promote to @shared)",
  appliesTo: (c) => c.ext !== "css" && c.isFeature,
  run: (ctx) => {
    const out: Violation[] = [];
    if (ctx.featureId === null) return out;
    // v3 matched only specifiers literally containing "features/<id>/" —
    // relative sibling imports ("../demo/Demo") escaped detection (AG-26).
    // Relative specs are now resolved against the real filesystem layout.
    const re = /from\s+["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.content)) !== null) {
      if (isInsideComment(ctx, m.index)) continue; // Patch 5 (AG4-06)
      const spec = m[1];
      let target: string | null = null;
      if (spec.startsWith(".")) {
        const targetRel = toPosix(relative(ctx.root, resolve(dirname(ctx.absPath), spec)));
        target = /^src\/features\/([^/]+)\//.exec(targetRel)?.[1] ?? null;
      } else {
        target = /features\/([^/"']+)\//.exec(spec)?.[1] ?? null;
      }
      if (target === null || target === ctx.featureId || target === "__TEMPLATE__") continue;
      out.push(mkViolation(ctx, "X-05", ctx.lineOf(m.index),
        `Cross-feature import: ${ctx.featureId} → ${target}`,
        { suggestion: "Promote the shared surface to @shared/ (BASE Rule 5)" }));
    }
    return out;
  },
};

/* ═══════════════════ §6  CHECKS — MCP CHAIN ═══════════════════ */

const checkX06_CallMCPTool: CheckDef = {
  key: "X-06",
  keys: ["X-06"],
  description: "callMCPTool() only inside shared hooks (useMCPQuery/useMCPMutation)",
  // Patch 2 (AG4-02): the whole shared/hooks/ layer is the sanctioned MCP-call
  // surface (CHECKLIST §14.6 P2). X-03 raw-fetch keeps its 3-file exempt list:
  // a fetch() inside a hook is still a violation.
  appliesTo: (c) => c.ext !== "css" && !isMcpCallLayer(c.relPath),
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /\bcallMCPTool\s*[<(]/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-06", i + 1,
          "callMCPTool() used directly outside shared/ hooks",
          { suggestion: "useMCPQuery (reads) / useMCPMutation (writes) from @shared/hooks/useMCPQuery" }));
      }
    });
    return out;
  },
};

const checkX07_RouteMCPCall: CheckDef = {
  key: "X-07",
  keys: ["X-07"],
  description: "routeMCPCall() only inside the transport layer (api.ts)",
  appliesTo: (c) => c.ext !== "css" && c.relPath !== "src/shared/lib/api.ts",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /\brouteMCPCall\s*[<(]/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-07", i + 1,
          "routeMCPCall() used outside transport layer"));
      }
    });
    return out;
  },
};

const checkX08_UntypedMCPQuery: CheckDef = {
  key: "X-08",
  keys: ["X-08"],
  description: "useMCPQuery() calls must carry an explicit type parameter",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    // `useMCPQuery(` matches ONLY untyped calls — typed calls have <T> in between.
    const re = /\buseMCPQuery\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.content)) !== null) {
      if (isInsideComment(ctx, m.index)) continue; // Patch 5 (AG4-06)
      out.push(mkViolation(ctx, "X-08", ctx.lineOf(m.index),
        "useMCPQuery() without type parameter",
        { severity: "warn", suggestion: "useMCPQuery<MyResponse>(...)" }));
    }
    return out;
  },
};

/* ═══════════════════ §7  CHECKS — ADVISOR ═══════════════════ */

const checkX09_EngineInstantiation: CheckDef = {
  key: "X-09",
  keys: ["X-09"],
  description: "AdvisorEngine is instantiated only inside advisor-engine/ or shared/hooks/ wrappers",
  appliesTo: (c) =>
    c.ext !== "css" && !ADVISOR_EXEMPT.some((frag) => c.relPath.includes(frag)),
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /new\s+AdvisorEngine\s*[<(]/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-09", i + 1,
          "AdvisorEngine instantiated outside advisor-engine",
          { suggestion: "Use useAdvisorEngine or the domain wrapper hook" }));
      }
    });
    return out;
  },
};

const checkX10_ConsoleInRules: CheckDef = {
  key: "X-10",
  keys: ["X-10"],
  description: "advisor rules must be pure — no console in rules/",
  appliesTo: (c) =>
    c.ext !== "css" &&
    (c.relPath.includes("advisor-engine") || c.relPath.includes("rules/")) &&
    !c.relPath.endsWith("types.ts"),
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /console\.(?:log|warn|error|info|debug)\s*\(/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-10", i + 1,
          "Console in advisor rules — rules must be pure",
          { severity: "warn", suggestion: "Move logging to an engine listener" }));
      }
    });
    return out;
  },
};

const checkX12_AdvisorConfig: CheckDef = {
  key: "X-12",
  keys: ["X-12"],
  description: "Feature config.ts must reference its advisor domain",
  appliesTo: (c) => c.ext === "ts" && c.isFeature && c.relPath.endsWith("config.ts"),
  run: (ctx) => {
    const hasAdvisorRef = /advisor|domain/i.test(ctx.content);
    return hasAdvisorRef
      ? []
      : [mkViolation(ctx, "X-12", 1,
          "Feature config.ts has no advisor domain reference",
          { severity: "warn", suggestion: `Add: domain: "${ctx.featureId ?? "feature"}"` })];
  },
};

/* ═══════════════════ §8  CHECKS — CSS ═══════════════════ */

const checkX13_HardcodedColors: CheckDef = {
  key: "X-13",
  keys: ["X-13"],
  description: "No hardcoded color literals — use var(--color-*) tokens",
  appliesTo: (c) => c.ext === "css" && !c.relPath.endsWith("styles/globals.css"),
  run: (ctx) => {
    const out: Violation[] = [];
    const manifest = getManifest();
    const allowed = new Set(manifest.STRUCTURAL_COLOR_ALLOWLIST.map(normalizeColorLiteral));
    // Patch 6 (AG4-07): VALID_TOKENS are var(--x) NAMES, not color literals —
    // they belong to a token-reference check, never to this allowlist.
    const css = stripCssComments(ctx.content);
    // v3 shipped `$$`-mangled alternatives → rgba/hsla detection was dead code.
    const re = /#(?:[0-9a-fA-F]{3,8})\b|\brgba?\([^)\n]*\)|\bhsla?\([^)\n]*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
      const literal = normalizeColorLiteral(m[0]);
      const line = ctx.lineOf(m.index);
      if ((ctx.lines[line - 1] ?? "").includes("data:image")) continue;
      if (allowed.has(literal)) continue;
      out.push(mkViolation(ctx, "X-13", line,
        `Hardcoded color literal: ${m[0]}`,
        { suggestion: "Use a token var(--color-*) or add to STRUCTURAL_COLOR_ALLOWLIST with rationale" }));
    }
    return out;
  },
};

function normalizeColorLiteral(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

const checkX14_TransitionAll: CheckDef = {
  key: "X-14",
  keys: ["X-14"],
  description: "transition: all is forbidden — enumerate the properties",
  appliesTo: (c) => c.ext === "css" || c.ext === "tsx",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /transition\s*:\s*all\b|\btransition-all\b/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-14", i + 1,
          "transition: all — specify properties",
          { autoFixable: false, suggestion: "transition: transform 0.25s var(--ease-apple), opacity 0.2s ease" }));
      }
    });
    return out;
  },
};

const checkX15_MaterialEasing: CheckDef = {
  key: "X-15",
  keys: ["X-15"],
  description: "Material easing (0.4, 0, 0.2, 1) → var(--ease-apple)",
  // Patch 8 (AG4-09): runs on every ext — easing literals inside config.ts
  // files escaped the v4.0.0 gate.
  appliesTo: () => true,
  run: (ctx) => {
    const out: Violation[] = [];
    const src = ctx.ext === "css" ? stripCssComments(ctx.content) : ctx.content;
    // v3 shipped `cubic-bezier$$` → this rule NEVER fired. Fixed.
    const re = /cubic-bezier\(\s*0?\.4\s*,\s*0\s*,\s*0?\.2\s*,\s*1\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      if (ctx.ext !== "css" && isInsideComment(ctx, m.index)) continue; // Patch 5/8
      // v4.1.0 hardening (AG4-15): never flag the token's own definition —
      // the fixer would rewrite it into a var() self-reference.
      if (ctx.ext === "css" && isCustomPropertyDefinition(src, m.index)) continue;
      out.push(mkViolation(ctx, "X-15", ctx.lineOf(m.index),
        "Material easing (0.4, 0, 0.2, 1)",
        { autoFixable: true, suggestion: "Replace with var(--ease-apple)" }));
    }
    return out;
  },
};

// AG-29: single source of truth for the X-16 fixable-declaration shape —
// the detector's autoFixable flag and the fixer's matcher stay in lockstep.
const X16_BARE_DECL = /^([ \t]*)(backdrop-filter\s*:\s*)([^;\n]+?)([ \t]*;?[ \t]*)$/;

const checkX16_WebkitBackdrop: CheckDef = {
  key: "X-16",
  keys: ["X-16"],
  description: "backdrop-filter needs its -webkit- mirror (Safari/iOS)",
  appliesTo: (c) => c.ext === "css",
  run: (ctx) => {
    const out: Violation[] = [];
    // AG-29 (β): value-aware, bidirectional ±2 window. v4.1.1 scanned a
    // backward-only window for ANY -webkit- property, while this codebase
    // places the mirror AFTER the standard property — 279/437 flags were
    // declarations whose mirror sat on the next line.
    const decl = /(^|[^-\w])backdrop-filter\s*:\s*([^;]+)/;
    const mir = /(^|[^-\w])-webkit-backdrop-filter\s*:\s*([^;]+)/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      const m = decl.exec(line);
      if (m === null) return;
      const value = normalizeColorLiteral(m[2]);
      const scope = ctx.lines.slice(Math.max(0, i - 2), Math.min(ctx.lines.length, i + 3));
      const mirrored = scope.some((w) => {
        const wm = mir.exec(w);
        return wm !== null && normalizeColorLiteral(wm[2]) === value;
      });
      if (!mirrored) {
        // AG-29 (γ): truthful per violation — the fixer writes exactly the
        // single-line-declaration shape, nothing else.
        out.push(mkViolation(ctx, "X-16", i + 1,
          "backdrop-filter without -webkit-backdrop-filter mirror",
          { autoFixable: X16_BARE_DECL.test(line), suggestion: "Add -webkit-backdrop-filter with the same value on the adjacent line (Safari/iOS)" }));
      }
    });
    return out;
  },
};

const checkX17_DimensionsCoverage: CheckDef = {
  key: "X-17",
  keys: ["B-56", "B-57", "B-64", "B-70", "B-73"],
  description: "CSS must cover tablet/mobile breakpoints, light mode, reduced motion, print",
  appliesTo: (c) => c.ext === "css" && !c.relPath.endsWith("styles/globals.css"),
  run: (ctx) => {
    const out: Violation[] = [];
    // Comment-stripped: a commented-out @media must not satisfy coverage (v3 raw-scanned).
    const css = stripCssComments(ctx.content);
    const dims: readonly { id: string; ok: boolean; msg: string }[] = [
      { id: "B-56", ok: /@media[^{]*max-width:\s*768px/.test(css), msg: "Missing tablet breakpoint (max-width: 768px)" },
      { id: "B-57", ok: /@media[^{]*max-width:\s*480px/.test(css), msg: "Missing mobile breakpoint (max-width: 480px)" },
      { id: "B-64", ok: /\.light\b|\[data-theme/.test(css), msg: "Missing light mode overrides (§N+3)" },
      { id: "B-70", ok: /prefers-reduced-motion:\s*reduce/.test(css), msg: "Missing reduced-motion block (§N+4)" },
      { id: "B-73", ok: /@media\s+print/.test(css), msg: "Missing @media print block (§N+6)" },
    ];
    for (const d of dims) {
      if (!d.ok) {
        out.push(mkViolation(ctx, d.id, 1, d.msg,
          { severity: "warn", suggestion: "See CHECKLIST §13 CSS template" }));
      }
    }
    return out;
  },
};

const checkX18_DeprecatedTokens: CheckDef = {
  key: "X-18",
  keys: ["X-18"],
  description: "Deprecated design tokens must not be referenced",
  appliesTo: () => true,
  run: (ctx) => {
    const out: Violation[] = [];
    for (const token of getManifest().DEPRECATED_TOKENS) {
      const idx = ctx.content.indexOf(`var(${token})`);
      if (idx >= 0) {
        out.push(mkViolation(ctx, "X-18", ctx.lineOf(idx),
          `Deprecated token ${token}`,
          { severity: "warn", suggestion: "Use canonical replacement (manifest TOKENS.deprecated)" }));
      }
    }
    return out;
  },
};

const checkB76_KeyframesAtEnd: CheckDef = {
  key: "B-76",
  keys: ["B-76"],
  description: "@keyframes go after selectors and before @media",
  appliesTo: (c) => c.ext === "css",
  run: (ctx) => {
    // Violation only if a top-level selector block appears AFTER the keyframes
    // section and OUTSIDE at-rule blocks. Trailing @media/@supports/@container
    // blocks are canonical (v3 only exempted @media).
    const lines = ctx.lines;
    let kfSeen = false;
    let i = 0;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (t === "" || isCommentLine(t)) {
        i += 1;
        continue;
      }
      if (t.startsWith("@keyframes")) {
        kfSeen = true;
        i = skipBlock(lines, i);
        continue;
      }
      if (t.startsWith("@")) {
        i = skipBlock(lines, i);
        continue;
      }
      if (kfSeen && t.includes("{")) {
        return [mkViolation(ctx, "B-76", i + 1,
          "Selector block after keyframes — keyframes go after styles, before @media",
          { severity: "warn", suggestion: "Move @keyframes below all selectors, above @media queries" })];
      }
      i += 1;
    }
    return [];
  },
};

const checkB77B78B79_Keyframes: CheckDef = {
  key: "B-77/78/79",
  keys: ["B-77", "B-78", "B-79"],
  description: "Keyframes: namespaced, non-generic, max 6 per file",
  appliesTo: (c) => c.ext === "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const css = stripCssComments(ctx.content);
    const re = /@keyframes\s+([A-Za-z][\w-]*)/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(css)) !== null) {
      count += 1;
      const name = m[1];
      const line = ctx.lineOf(m.index);
      if (GENERIC_KEYFRAMES.includes(name)) {
        out.push(mkViolation(ctx, "B-79", line,
          `Generic keyframe name "${name}"`,
          { autoFixable: false, suggestion: `Rename to <prefix>-<Name> (e.g. ev-${name})` }));
      }
      // v4.1.1 (AG4-17): the documented policy is "<prefix>-<DescriptiveName>"
      // (CHECKPOINT §1.6) — a namespace is ANY lowercase-first alnum prefix
      // followed by dashed segments. The v4.1.0 regex (^\[a-z\]{2,3}-) was
      // stricter than the policy it enforces: real-world namespaced keyframes
      // like "approval-countdown-pulse" (8-char prefix) or
      // "glass-login-shimmer" (5-char) were false-positived. Gap found
      // auditing a production codebase; the verify suite never exercised
      // prefixes longer than 3 chars — now it does (fixture: Probe.css).
      if (!/^[a-z][a-z0-9]*(?:-[A-Za-z0-9]+)+$/.test(name)) {
        out.push(mkViolation(ctx, "B-77", line,
          `Keyframe "${name}" not namespaced`,
          { severity: "warn", suggestion: "Pattern: <prefix>-<DescriptiveName> (CHECKPOINT §1.6)" }));
      }
    }
    if (count > 6 && !ctx.relPath.includes("atoms.css")) {
      out.push(mkViolation(ctx, "B-78", 1,
        `${count} keyframes in file (max 6)`,
        { severity: "warn", suggestion: "Extract shared animations to <feature>-atoms.css" }));
    }
    return out;
  },
};

const BOUNDARY_BEFORE = new Set([" ", "\t", ":", ",", "(", "[", "{", '"', "'", "`"]);
const BOUNDARY_AFTER = new Set([" ", "\t", ",", ";", ")", "]", "}", '"', "'", "`"]);

/** AG-30: a banned font counts only when it stands as a standalone font token
 * (quoted, in a stack, or after a font-family colon) — never inside an
 * identifier (setInterval, Interface, colorInterpolationFilters), a Spanish
 * word (Interés) or hyphenated prose (Inter-generational). */
function isFontToken(line: string, font: string): boolean {
  let at = line.indexOf(font);
  while (at !== -1) {
    const before = at === 0 ? "" : line[at - 1];
    const end = at + font.length;
    const after = end >= line.length ? "" : line[end];
    if ((at === 0 || BOUNDARY_BEFORE.has(before)) && (after === "" || BOUNDARY_AFTER.has(after))) {
      return true;
    }
    at = line.indexOf(font, at + 1);
  }
  return false;
}

const checkX28_BannedFonts: CheckDef = {
  key: "X-28",
  keys: ["X-28"],
  description: "Banned font families — use the --font-* tokens",
  // Patch 9 (AG4-09/10): covers ts+tsx+css (font names inside config.ts
  // escaped the v4.0.0 gate) but never audits styles/globals.css — layer 0
  // owns the font stack.
  appliesTo: (c) => !c.relPath.endsWith("styles/globals.css"),
  run: (ctx) => {
    const out: Violation[] = [];
    for (const font of getManifest().BANNED_FONTS) {
      // AG-30: the v4.1.2 indexOf substring match flagged identifiers,
      // Spanish words and hyphenated prose — 109/111 hits tree-wide were
      // false positives (sandbox-measured); the 2 real system-ui fallback
      // stacks (facilities) still fire. One hit per font per file, as before.
      let flagged = false;
      for (let i = 0; i < ctx.lines.length && !flagged; i += 1) {
        const line = ctx.lines[i];
        if (isCommentLine(line)) continue;
        if (isFontToken(line, font)) {
          out.push(mkViolation(ctx, "X-28", i + 1,
            `Banned font family: ${font}`,
            { suggestion: "Use --font-display / --font-mono / --font-ui tokens" }));
          flagged = true;
        }
      }
    }
    return out;
  },
};

/* ═══════════════════ §9  CHECKS — TYPESCRIPT ═══════════════════ */

const checkX19_AnimationLibs: CheckDef = {
  key: "X-19",
  keys: ["X-19"],
  description: "Banned animation dependencies — CSS animations only (BASE Rule 4)",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const libs = [...getManifest().BANNED_DEPENDENCIES, ...EXTRA_BANNED_ANIMATION_LIBS];
    for (const lib of libs) {
      const re = new RegExp(`["'\`]${escapeRegExp(lib)}(?:/[^"'\`]*)?["'\`]`, "g");
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.content)) !== null) {
        if (isInsideComment(ctx, m.index)) continue; // Patch 5 (AG4-06)
        out.push(mkViolation(ctx, "X-19", ctx.lineOf(m.index),
          `Banned animation dependency: ${lib}`,
          { suggestion: "CSS animations only (BASE Rule 4)" }));
      }
    }
    return out;
  },
};

const checkX20_AnyType: CheckDef = {
  key: "X-20",
  keys: ["X-20"],
  description: "'any' is forbidden — use unknown + type guards (CHECKLIST A-01)",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /:\s*any\b|<any>|\bas\s+any\b/g;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      const matches = line.match(re);
      if (matches !== null && matches.length > 0) {
        out.push(mkViolation(ctx, "X-20", i + 1,
          `'any' type (${matches.join(", ")})`,
          { suggestion: "Use unknown + type guard (CHECKLIST A-01)" }));
      }
    });
    return out;
  },
};

const checkX21_DefaultExport: CheckDef = {
  key: "X-21",
  keys: ["X-21"],
  description: "Named exports only; entrypoints live in DEFAULT_EXPORT_ALLOWLIST",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const isExempt = getManifest().DEFAULT_EXPORT_ALLOWLIST.some(
      (a) => ctx.relPath === a || ctx.relPath.endsWith(`/${a}`),
    );
    if (isExempt) return out;
    const re = /export\s+default\b/;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (re.test(line)) {
        out.push(mkViolation(ctx, "X-21", i + 1,
          "Default export",
          { autoFixable: false, suggestion: "Named export; entrypoints belong in manifest DEFAULT_EXPORT_ALLOWLIST" }));
      }
    });
    return out;
  },
};

const checkX22_ReadonlyInterfaces: CheckDef = {
  key: "X-22",
  keys: ["X-22"],
  description: "Interface fields must be readonly (immutability contract)",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    // Patch 4 (AG4-05): field lines live ONLY at the interface body depth (1)
    // and outside parentheses — nested type members and multiline method
    // signatures are no longer false-positived, and the interface ends at its
    // real closing brace (v4.0.0 mis-tracked depth through inline objects).
    const out: Violation[] = [];
    const lines = ctx.lines;
    let i = 0;
    while (i < lines.length) {
      const ifaceMatch = /^(?:export\s+)?interface\s+([A-Za-z0-9_]+)/.exec((lines[i] ?? "").trim());
      if (ifaceMatch === null) {
        i += 1;
        continue;
      }
      const ifaceName = ifaceMatch[1] ?? "";
      let braceDepth = 0;
      let parenDepth = 0;
      let opened = false;
      let j = i;
      while (j < lines.length) {
        const line = lines[j] ?? "";
        // Field lines live ONLY at the interface body depth (1), outside parens.
        if (opened && braceDepth === 1 && parenDepth === 0 && j > i) {
          const trimmed = line.trim();
          const propMatch =
            /^\s*(readonly\s+)?([A-Za-z_$][\w$]*)(\??)\s*:\s*(.+?);?\s*$/.exec(line);
          if (
            propMatch !== null &&
            !isCommentLine(trimmed) &&
            !trimmed.includes("(") &&
            propMatch[1] === undefined
          ) {
            out.push(mkViolation(ctx, "X-22", j + 1,
              `Interface "${ifaceName}" field "${propMatch[2]}" not readonly`,
              { severity: "warn", autoFixable: false, suggestion: `Change to: readonly ${propMatch[2]}...` }));
          }
        }
        braceDepth += countChar(line, "{") - countChar(line, "}");
        parenDepth += countChar(line, "(") - countChar(line, ")");
        if (braceDepth > 0) opened = true;
        if (opened && braceDepth <= 0) {
          j += 1;
          break;
        }
        j += 1;
      }
      i = Math.max(j, i + 1);
    }
    return out;
  },
};

const checkX23_HexInTS: CheckDef = {
  key: "X-23",
  keys: ["X-23"],
  description: "No hex colors in TS/TSX strings — reference var(--color-*)",
  appliesTo: (c) => c.ext !== "css",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /["'`]#[0-9a-fA-F]{3,8}["'`]/g;
    ctx.lines.forEach((line, i) => {
      if (isCommentLine(line) || line.includes("--color-")) return;
      const matches = line.match(re);
      if (matches !== null && matches.length > 0) {
        out.push(mkViolation(ctx, "X-23", i + 1,
          `Hex color in TS/TSX string: ${matches.join(", ")}`,
          { suggestion: "Reference var(--color-*) from CSS, or centralize in config" }));
      }
    });
    return out;
  },
};

const checkX25_SectionMarkers: CheckDef = {
  key: "X-25",
  keys: ["X-25"],
  description: "TSX files carry § section markers (§1 TYPES, §2 CONSTANTS, …)",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const hasMarkers = /\*\s*§\d|\/\/\s*§\d|\/\*\s*§\d|§\d\s+[A-Z]/.test(ctx.content);
    return hasMarkers
      ? []
      : [mkViolation(ctx, "X-25", 1,
          "Missing § section markers",
          { severity: "warn", suggestion: "Add: /* §1 TYPES */, /* §2 CONSTANTS */, /* §3 COMPONENT */" })];
  },
};

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_]/.test(ch);
}

/** token === unit, or token starts with unit and the follower sits on the
 *  opposite side of a word boundary (regex-\b semantics, tokenized). */
function flagsViaBoundary(token: string, unit: string): boolean {
  if (token === unit) return true;
  if (!token.startsWith(unit)) return false;
  const follower = token[unit.length];
  return follower !== undefined && isWordChar(follower) !== isWordChar(unit[unit.length - 1]);
}

function flagsViaDashUnit(token: string, unit: string): boolean {
  return token.length > unit.length && token.startsWith(unit) && isWordChar(token[unit.length]);
}

function flagsViaNumericPrefix(token: string, prefix: string): boolean {
  return token.startsWith(prefix) && /^\d/.test(token.slice(prefix.length));
}

function matchesColorValue(value: string): boolean {
  return TW_COLOR_NAMES.some((c) => value === c || value.startsWith(`${c}-`));
}

function isTailwindUtility(token: string): boolean {
  if (TW_KEYWORD_BAN.has(token)) return true;
  if (TW_WORD_UNITS.some((u) => flagsViaBoundary(token, u))) return true;
  if (TW_DASH_UNITS.some((u) => flagsViaDashUnit(token, u))) return true;
  if (TW_NUMERIC_PREFIXES.some((p) => flagsViaNumericPrefix(token, p))) return true;
  if (token.startsWith("text-")) {
    const v = token.slice("text-".length);
    return TW_TEXT_SIZES.has(v) || matchesColorValue(v);
  }
  if (token.startsWith("font-")) return TW_FONT_WEIGHTS.has(token.slice("font-".length));
  if (token.startsWith("bg-")) return matchesColorValue(token.slice("bg-".length));
  return false;
}

const checkX26_Tailwind: CheckDef = {
  key: "X-26",
  keys: ["X-26"],
  description: "Tailwind utilities in className are forbidden — use BEM (C-04)",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const out: Violation[] = [];
    // Patch 11 (AG4-12/03): also matches the className={"…"} literal form.
    const re = /className\s*[=:]\s*(?:\{\s*)?(["'`])([^"'`]*)\1/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.content)) !== null) {
      const tokens = (m[2] ?? "").split(/\s+/).filter((t) => t.length > 0 && !t.includes("${"));
      const hits = tokens.filter(isTailwindUtility);
      if (hits.length > 0) {
        out.push(mkViolation(ctx, "X-26", ctx.lineOf(m.index),
          `Tailwind utilities in className: "${hits.join(" ")}"`,
          { suggestion: "Use BEM CSS classes (CHECKLIST C-04)" }));
      }
    }
    return out;
  },
};

const checkX27_DataTestId: CheckDef = {
  key: "X-27",
  keys: ["X-27"],
  description: "Exported components expose data-testid on their root element",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const hasExport = /export\s+(?:function|const)\s+[A-Z]/.test(ctx.content);
    const hasTestId = ctx.content.includes("data-testid");
    return hasExport && !hasTestId
      ? [mkViolation(ctx, "X-27", 1,
          "Exported component without data-testid",
          { severity: "warn", suggestion: 'data-testid="<prefix>-<component>-root" on root element' })]
      : [];
  },
};

/* ═══════════════════ §10  CHECKS — COMPONENT PATTERNS ═══════════════════ */

const checkC01_CoLocatedCSS: CheckDef = {
  key: "C-01",
  keys: ["C-01"],
  description: "Components with styles must co-locate their CSS (BASE Rule 2)",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const importsCSS = /import\s+["'][^"']*\.css["']/.test(ctx.content);
    const hasStyles = /style\s*=\s*\{\{/.test(ctx.content) || /className\s*[=:]/.test(ctx.content);
    const isLogicOnly = /\/(?:lib|mocks|hooks)\//.test(ctx.relPath);
    if (isLogicOnly || !hasStyles || importsCSS) return [];
    return [mkViolation(ctx, "C-01", 1,
      "Component has styles but no co-located CSS import",
      { autoFixable: false, suggestion: "Create <Name>.css and import it (BASE Rule 2)" })];
  },
};

const checkC06_MissingCSSImport: CheckDef = {
  key: "C-06",
  keys: ["C-06"],
  description: "If <Component>.css exists next to the TSX, it must be imported",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const cssCandidate = ctx.absPath.replace(/\.tsx$/, ".css");
    if (!existsSync(cssCandidate)) return [];
     const imported =
       /import\s*["'][^"'\n]*\.css["']/.test(ctx.content) ||
       /from\s*["'][^"'\n]*\.css["']/.test(ctx.content) ||
       /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(ctx.content);
    return imported
      ? []
      : [mkViolation(ctx, "C-06", 1,
          "CSS file exists but is not imported",
          { autoFixable: true, suggestion: `Add: import "./${basename(cssCandidate)}";` })];
  },
};

const checkC09_AriaButtons: CheckDef = {
  key: "C-09",
  keys: ["C-09"],
  description: "Icon-only buttons need aria-label / aria-labelledby",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const out: Violation[] = [];
    const re = /<button\b([^>]*)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.content)) !== null) {
      const attrs = m[1] ?? "";
      const hasLabel = attrs.includes("aria-label") || attrs.includes("aria-labelledby");
      const rest = ctx.content.slice(m.index + m[0].length, m.index + m[0].length + 200);
      // AG-27: v3's [^<>{}]{2,} counted whitespace-only content as "visible
      // text" (regex backtracking) → icon-only buttons were never flagged.
      // Visible text now requires a non-whitespace char outside tags/braces.
      const hasText = /^\s*[^<>{}\s]/.test(rest);
      if (!hasLabel && !hasText) {
        out.push(mkViolation(ctx, "C-09", ctx.lineOf(m.index),
          "Button without aria-label and without visible text",
          { severity: "warn", suggestion: "Add aria-label (CHECKLIST B-61/C-09)" }));
      }
    }
    return out;
  },
};

const checkC19_FileHeader: CheckDef = {
  key: "C-19",
  keys: ["C-19"],
  description: "TSX files carry the @level + @namespace header (CHECKLIST §13)",
  appliesTo: (c) => c.ext === "tsx",
  run: (ctx) => {
    const head = ctx.lines.slice(0, HEADER_SCAN_LINES).join("\n");
    const hasHeader = head.includes("@level") && head.includes("@namespace");
    return hasHeader
      ? []
      : [mkViolation(ctx, "C-19", 1,
          "Missing file header (@level + @namespace)",
          { severity: "warn", suggestion: "See CHECKLIST §13 TSX template" })];
  },
};

/* ═══════════════════ §11  GRAPH — H-06 CIRCULAR DEPENDENCIES ═══════════════════
 * Iterative three-color DFS (v3 recursed → stack overflow on deep graphs).
 * Edges are built from cached or freshly-parsed imports — no re-reading.
 */

function parseImports(content: string): readonly ImportSpec[] {
  const lineOf = createLineIndexer(content);
  const out: ImportSpec[] = [];
  const re = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push({ spec: m[1], line: lineOf(m.index) });
  }
  return out;
}

/** rel (and extensionless rel) → file. Sorted input keeps collisions deterministic. */
function buildFileIndex(files: readonly string[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const rel of files) {
    index.set(rel, rel);
    const noext = rel.replace(/\.(ts|tsx)$/, "");
    if (noext !== rel) index.set(noext, rel);
  }
  return index;
}

/** Hardcoded alias contract (tsconfig): `@/*` → src/*, `@shared/*` → src/shared/*,
 *  `@features/*` → src/features/*, `@stores/*` → src/stores/*, `@app/*` → src/app/*.
 *  Patch 12 (AG4-13): the three feature-scoped aliases were missing → H-06 lost
 *  every cycle routed through them. */
function resolveImportSpec(
  fromRel: string,
  spec: string,
  index: ReadonlyMap<string, string>,
  root: string,
): string | null {
  let baseRel: string;
  if (spec.startsWith("@shared/")) {
    baseRel = toPosix(join("src/shared", spec.slice("@shared/".length)));
  } else if (spec.startsWith("@features/")) {
    baseRel = toPosix(join("src/features", spec.slice("@features/".length)));
  } else if (spec.startsWith("@stores/")) {
    baseRel = toPosix(join("src/stores", spec.slice("@stores/".length)));
  } else if (spec.startsWith("@app/")) {
    baseRel = toPosix(join("src/app", spec.slice("@app/".length)));
  } else if (spec.startsWith("@/")) {
    baseRel = toPosix(join("src", spec.slice("@/".length)));
  } else if (spec.startsWith(".")) {
    baseRel = toPosix(relative(root, resolve(dirname(join(root, fromRel)), spec)));
  } else {
    return null;
  }
  const candidates = [
    baseRel,
    baseRel.replace(/\.(ts|tsx)$/, ""),
    `${baseRel}.ts`,
    `${baseRel}.tsx`,
    `${baseRel}/index.ts`,
    `${baseRel}/index.tsx`,
  ];
  for (const key of candidates) {
    const hit = index.get(key);
    if (hit !== undefined) return hit;
  }
  return null;
}

function buildEdges(
  root: string,
  files: readonly string[],
  importsByFile: ReadonlyMap<string, readonly ImportSpec[]>,
  index: ReadonlyMap<string, string>,
): Map<string, readonly Edge[]> {
  const edges = new Map<string, readonly Edge[]>();
  for (const rel of files) {
    if (rel.endsWith(".css")) {
      edges.set(rel, []);
      continue;
    }
    const list: Edge[] = [];
    for (const imp of importsByFile.get(rel) ?? []) {
      const to = resolveImportSpec(rel, imp.spec, index, root);
      if (to !== null && to !== rel) list.push({ to, line: imp.line });
    }
    list.sort((a, b) => cmpCodeunit(a.to, b.to) || a.line - b.line);
    edges.set(rel, list);
  }
  return edges;
}

function detectCycles(edges: ReadonlyMap<string, readonly Edge[]>): readonly Cycle[] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const seen = new Set<string>();
  const cycles: Cycle[] = [];
  const nodes = [...edges.keys()].sort();

  for (const start of nodes) {
    if ((color.get(start) ?? WHITE) !== WHITE) continue;
    const path: string[] = [start];
    const stack: { node: string; next: number }[] = [{ node: start, next: 0 }];
    color.set(start, GRAY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const list = edges.get(frame.node) ?? [];
      if (frame.next >= list.length) {
        color.set(frame.node, BLACK);
        stack.pop();
        path.pop();
        continue;
      }
      const edge = list[frame.next];
      frame.next += 1;
      const state = color.get(edge.to) ?? WHITE;
      if (state === GRAY) {
        const from = path.indexOf(edge.to);
        if (from !== -1 && seen.size < MAX_CYCLES) {
          const key = path.slice(from).join(">");
          if (!seen.has(key)) {
            seen.add(key);
            const cycNodes = path.slice(from);
            const lines = new Map<string, number>();
            for (let j = from; j < path.length - 1; j += 1) {
              const e = (edges.get(path[j]) ?? []).find((x) => x.to === path[j + 1]);
              if (e !== undefined) lines.set(path[j], e.line);
            }
            lines.set(path[path.length - 1], edge.line);
            cycles.push({ nodes: cycNodes, lines });
          }
        }
      } else if (state === WHITE) {
        color.set(edge.to, GRAY);
        path.push(edge.to);
        stack.push({ node: edge.to, next: 0 });
      }
    }
  }
  return cycles;
}

/* ═══════════════════ §12  ENGINE + SCORING (BASE §0.2) ═══════════════════ */

const CHECKS: readonly CheckDef[] = [
  checkB76_KeyframesAtEnd,
  checkB77B78B79_Keyframes,
  checkC01_CoLocatedCSS,
  checkC06_MissingCSSImport,
  checkC09_AriaButtons,
  checkC19_FileHeader,
  checkX01_RelativeShared,
  checkX02_DuplicateComponents,
  checkX03_RawFetch,
  checkX04_InlineAdvisor,
  checkX05_CrossFeature,
  checkX06_CallMCPTool,
  checkX07_RouteMCPCall,
  checkX08_UntypedMCPQuery,
  checkX09_EngineInstantiation,
  checkX10_ConsoleInRules,
  checkX12_AdvisorConfig,
  checkX13_HardcodedColors,
  checkX14_TransitionAll,
  checkX15_MaterialEasing,
  checkX16_WebkitBackdrop,
  checkX17_DimensionsCoverage,
  checkX18_DeprecatedTokens,
  checkX19_AnimationLibs,
  checkX20_AnyType,
  checkX21_DefaultExport,
  checkX22_ReadonlyInterfaces,
  checkX23_HexInTS,
  checkX25_SectionMarkers,
  checkX26_Tailwind,
  checkX27_DataTestId,
  checkX28_BannedFonts,
];

function runChecks(ctx: CheckContext): { violations: readonly Violation[]; applicable: readonly string[] } {
  const violations: Violation[] = [];
  const applicable: string[] = [];
  for (const check of CHECKS) {
    if (!check.appliesTo(ctx)) continue;
    applicable.push(...check.keys);
    violations.push(...check.run(ctx));
  }
  return { violations, applicable };
}

/** BASE §0.2: raw = (passes / applicable) × scale − Σ distinct penalties. */
function computeScore(applicable: readonly string[], violations: readonly Violation[]): number {
  const manifest = getManifest();
  const { scale, penalties } = manifest.SCORING;
  const violatedRules = new Set(violations.map((v) => v.rule));
  const violatedApplicable = [...violatedRules].filter((r) => applicable.includes(r));
  const passes = applicable.length - violatedApplicable.length;
  const raw = applicable.length === 0 ? scale : (passes / applicable.length) * scale;

  let penalty = 0;
  const penalized = new Set<string>();
  for (const ruleKey of violatedRules) {
    if (penalized.has(ruleKey)) continue;
    const meta = manifest.RULES[ruleKey];
    const direct = penalties[ruleKey];
    const viaCanon = meta?.checkIds
      .map((id) => penalties[id])
      .find((p) => p !== undefined);
    penalty += direct ?? viaCanon ?? 0;
    penalized.add(ruleKey);
    for (const id of meta?.checkIds ?? []) penalized.add(id);
  }
  return Math.round(Math.max(0, raw - penalty) * 10) / 10;
}

/* ═══════════════════ §13  DISCOVERY + CACHE + AUTO-FIX ═══════════════════ */

function discover(root: string): { files: string[]; walkErrors: string[] } {
  const files: string[] = [];
  const walkErrors: string[] = [];
  const walk = (dir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      // Fail-closed (D5): an unreadable directory blocks the gate.
      walkErrors.push(`${toPosix(relative(root, dir))}/`);
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_SEGMENTS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
          files.push(toPosix(relative(root, join(dir, entry.name))));
        }
      }
    }
  };
  walk(join(root, "src"));
  files.sort();
  return { files, walkErrors };
}

/**
 * Changed set = modified vs HEAD + untracked (new files!). Fails CLOSED with
 * exit 3 when git or HEAD is unavailable — v3 silently scanned nothing and
 * reported a green PASS (the worst failure mode a gate can have).
 */
function resolveChangedSet(root: string): Set<string> {
  const git = (args: readonly string[]): string => {
    try {
      return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (err) {
      throw new CliError(
        `--changed requires git access (git ${args.join(" ")}) in ${root}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        3,
      );
    }
  };
  const top = git(["rev-parse", "--show-toplevel"]).trim();
  const prefix = toPosix(relative(top, root));
  const changed = new Set<string>();
  const add = (line: string): void => {
    const p = toPosix(line.trim());
    if (p === "") return;
    let rel = p;
    if (prefix !== "" && prefix !== ".") {
      if (!rel.startsWith(`${prefix}/`)) return;
      rel = rel.slice(prefix.length + 1);
    }
    changed.add(rel);
  };
  // `git diff` emits repo-root-relative paths by default, but `git ls-files`
  // emits CWD-relative paths when run from a subdirectory — without
  // --full-name, untracked files under a non-top-level root were silently
  // dropped from the changed set (false-green risk).
  git(["diff", "--name-only", "HEAD"]).split("\n").forEach(add);
  git(["ls-files", "--others", "--exclude-standard", "--full-name"]).split("\n").forEach(add);
  return changed;
}

interface CacheEntry {
  readonly hash: string;
  readonly mtimeMs: number;
  readonly size: number;
  /** true → violations/applicable are valid; false → import-only entry. */
  readonly checked: boolean;
  readonly violations: readonly Violation[];
  readonly applicable: readonly string[];
  readonly imports: readonly ImportSpec[];
}

interface CacheShape {
  readonly version: string;
  readonly files: Readonly<Record<string, CacheEntry>>;
}

function isViolationShape(v: unknown): v is Violation {
  if (!isRecord(v)) return false;
  return (
    typeof v["rule"] === "string" &&
    (v["severity"] === "error" || v["severity"] === "warn") &&
    typeof v["file"] === "string" &&
    typeof v["line"] === "number" &&
    typeof v["message"] === "string" &&
    typeof v["autoFixable"] === "boolean" &&
    (v["suggestion"] === undefined || typeof v["suggestion"] === "string")
  );
}

function isImportSpecArray(v: unknown): v is ImportSpec[] {
  return (
    Array.isArray(v) &&
    v.every((e) => isRecord(e) && typeof e["spec"] === "string" && typeof e["line"] === "number")
  );
}

/** Structural validation — a hand-edited or corrupted cache degrades to a
 *  full re-analysis, never to garbage violations (v3 trusted a blind cast). */
function isCacheShape(v: unknown): v is CacheShape {
  if (!isRecord(v)) return false;
  if (typeof v["version"] !== "string") return false;
  const files = v["files"];
  if (!isRecord(files)) return false;
  for (const entry of Object.values(files)) {
    if (!isRecord(entry)) return false;
    if (typeof entry["hash"] !== "string") return false;
    if (typeof entry["mtimeMs"] !== "number") return false;
    if (typeof entry["size"] !== "number") return false;
    if (typeof entry["checked"] !== "boolean") return false;
    if (!Array.isArray(entry["violations"]) || !entry["violations"].every(isViolationShape)) return false;
    if (!isStringArray(entry["applicable"])) return false;
    if (!isImportSpecArray(entry["imports"])) return false;
  }
  return true;
}

function loadCache(root: string): CacheShape | null {
  try {
    const raw = readFileSync(join(root, CACHE_FILE), "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isCacheShape(parsed) && parsed.version === TOOL_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/** Atomic write (tmp + rename) — a crash mid-run cannot corrupt the cache. */
function saveCache(root: string, cache: CacheShape): void {
  try {
    const tmp = join(root, `${CACHE_FILE}.tmp`);
    writeFileSync(tmp, JSON.stringify(cache), "utf8");
    renameSync(tmp, join(root, CACHE_FILE));
  } catch (err) {
    process.stderr.write(
      `warn: could not persist cache: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

function sha1(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

/* — Auto-fixers (§13). Contract D6: idempotent, semantics-preserving. — */

/**
 * v3 BUG (critical): the mirror line was built from a match that ends at the
 * colon → `-webkit-backdrop-filter:` with an EMPTY value — invalid CSS that
 * silently killed the blur in Safari. This version mirrors the full value.
 */
function fixWebkitBackdropMirror(text: string): { text: string; fixes: number } {
  const lines = text.split("\n");
  const out: string[] = [];
  let fixes = 0;
  const bare = X16_BARE_DECL;
  const mirror = /^([ \t]*)-webkit-backdrop-filter\s*:\s*([^;\n]+?)([ \t]*;?[ \t]*)$/;
  // AG-29 (α): v4.1.1 checked only the PREVIOUS line for an existing
  // mirror, but this codebase convention places the mirror AFTER the
  // property → --fix duplicated the mirror that already followed (G11
  // shipped 4 such duplicates). Prev OR next (±1) with the same normalized
  // value → already mirrored, no write.
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = bare.exec(line);
    if (m !== null) {
      const value = normalizeColorLiteral(m[3]);
      const prev = out.length > 0 ? out[out.length - 1] : "";
      const pm = mirror.exec(prev);
      const alreadyMirrored =
        (pm !== null && normalizeColorLiteral(pm[2]) === value) ||
        lines.slice(i + 1, i + 2).some((next) => {
          const nm = mirror.exec(next);
          return nm !== null && normalizeColorLiteral(nm[2]) === value;
        });
      if (!alreadyMirrored) {
        const semi = m[4].includes(";") ? ";" : "";
        out.push(`${m[1]}-webkit-backdrop-filter: ${m[3].trim()}${semi}`);
        fixes += 1;
      }
    }
    out.push(line);
  }
  return { text: out.join("\n"), fixes };
}

function fixMaterialEasing(text: string): { text: string; fixes: number } {
  let fixes = 0;
  // v4.1.0 hardening (AG4-15): custom-property definitions are never rewritten —
  // replacing the --ease-apple source would yield `--ease-apple: var(--ease-apple)`
  // (self-reference, invalid token). Idempotency preserved.
  const out = text
    .split("\n")
    .map((line) => {
      if (/^[\t ]*--[\w-]+\s*:/.test(line)) return line;
      return line.replace(/cubic-bezier\(\s*0?\.4\s*,\s*0\s*,\s*0?\.2\s*,\s*1\s*\)/g, () => {
        fixes += 1;
        return "var(--ease-apple)";
      });
    })
    .join("\n");
  return { text: out, fixes };
}

/** C-06 fixer: side-effect import of an existing sibling CSS file — safe. */
/** Enmascara comentarios y cuerpos de string/template para que llaves y
 *  terminadores en posiciones NO-código nunca influyan en el tracker de
 *  declaraciones. Lleva el estado de comentarios de bloque multi-línea. */
function maskLineForBraces(line: string, state: { inBlockComment: boolean }): string {
  let out = "";
  let i = 0;
  const n = line.length;
  while (i < n) {
    if (state.inBlockComment) {
      const end = line.indexOf("*/", i);
      if (end === -1) return out;
      state.inBlockComment = false;
      i = end + 2;
      continue;
    }
    const ch = line[i];
    if (ch === "/" && line[i + 1] === "/") return out;
    if (ch === "/" && line[i + 1] === "*") {
      state.inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < n && line[i] !== quote) i += line[i] === "\\" ? 2 : 1;
      i += 1; // comilla de cierre (o EOL si el literal quedó abierto)
      continue; // el cuerpo del literal jamás llega a `out`
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** C-06 fixer: side-effect import of an existing sibling CSS file — safe.
 *  v2 (G20): fail-closed; ancla = línea donde COMPLETA la última
 *  declaración de import (nunca su línea de apertura). */
function fixMissingCssImport(absTsxPath: string, text: string): { text: string; fixes: number } {
  // Cualquier referencia sintáctica a un módulo .css cuenta como importado:
  // side-effect (`import "./x.css"`), nombrada/modules (`import s from
  // "./x.module.css"` — v1 la duplicaba), dinámica (`import("./x.css")`).
  // En lockstep con el guard de checkC06 (ver parche de esa línea abajo).
  const cssReferenced =
    /import\s*["'][^"'\n]*\.css["']/.test(text) ||
    /from\s*["'][^"'\n]*\.css["']/.test(text) ||
    /\b(?:import|require)\s*\(\s*["'][^"'\n]*\.css["']/.test(text);
  if (cssReferenced) return { text, fixes: 0 };
  // Solo los .tsx llevan la convención de CSS hermano. Sin este guard, un
  // path no-.tsx resuelve cssPath a SÍ MISMO y emitiría un auto-import
  // circular (`import "./foo.ts";`). Latente en v1 (el caller filtra .tsx,
  // L1816) — defensa en profundidad a nivel contrato de la función.
  if (!absTsxPath.endsWith(".tsx")) return { text, fixes: 0 };
  const cssPath = absTsxPath.replace(/\.tsx$/, ".css");
  if (!existsSync(cssPath)) return { text, fixes: 0 };

  const lines = text.split("\n");
  // Preservar el EOL del archivo para no crear líneas mixtas (v1 insertaba
  // sin \r en archivos CRLF). Se detecta por la primera línea con salto.
  const firstNl = text.indexOf("\n");
  const crlf = firstNl > 0 && text[firstNl - 1] === "\r";
  const importLine = `import "./${basename(cssPath)}";${crlf ? "\r" : ""}`;

  const state = { inBlockComment: false };
  let inDeclaration = false;
  let depth = 0;          // profundidad de llaves de la declaración en curso
  let lastCompleted = -1; // última línea donde un import/directiva COMPLETÓ
  let firstCode = -1;     // primera línea de código real (ancla de fallback)

  for (let i = 0; i < lines.length; i += 1) {
    // Se captura ANTES de enmascarar: el test de directivas corre sobre la
    // línea CRUDA (el masker de strings reduce `"use client";` a `;` y el
    // regex no la reconocería sobre el skeleton) y debe excluir directivas
    // citadas DENTRO de comentarios de bloque multi-línea.
    const wasInBlock = state.inBlockComment;
    const masked = maskLineForBraces(lines[i], state);
    const skeleton = masked.trim();

    if (inDeclaration) {
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false;
        depth = 0;
        lastCompleted = i; // la declaración cerró en esta línea
      }
      continue;
    }

    if (skeleton === "") continue; // línea en blanco o solo-comentario

    // Los prólogos de directiva quedan por encima de los imports
    // (seguro barato; la SPA de Vite hoy no usa ninguno).
    if (!wasInBlock && /^['"]use\s+(?:client|server|strict)['"];?$/.test(lines[i].trim())) {
      lastCompleted = i;
      continue;
    }

    // `import.meta` / `import(` son expresiones, no declaraciones.
    if (/^import(?!\.)(?!\s*\()/.test(skeleton)) {
      inDeclaration = true;
      depth = 0;
      for (const ch of masked) {
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
      }
      if (depth <= 0 && /["';]$/.test(skeleton)) {
        inDeclaration = false; // completó en su propia línea de apertura
        lastCompleted = i;
      }
      continue;
    }

    firstCode = i; // primera línea de código real
    break;
  }

  // FAIL-CLOSED: una declaración de import que nunca cerró significa que el
  // archivo ya está roto (o excede lo que este fixer entiende). No escribir
  // en él: primero se diagnostica (g14-diagnose-css-imports.mjs), después
  // se corrige. v1 escribía igual → agravaba archivos ya corruptos.
  if (inDeclaration) return { text, fixes: 0 };

  const insertAt = lastCompleted >= 0 ? lastCompleted + 1 : firstCode;
  if (insertAt < 0) return { text, fixes: 0 }; // sin código, sin imports, sin header: ningún punto probado seguro

  lines.splice(insertAt, 0, importLine);
  return { text: lines.join("\n"), fixes: 1 };
}


function applySafeFixes(absPath: string, relPath: string, text: string): { text: string; fixes: number } {
  let out = text;
  let fixes = 0;
  if (relPath.endsWith(".css")) {
    const r = fixWebkitBackdropMirror(out);
    out = r.text;
    fixes += r.fixes;
  }
  const r = fixMaterialEasing(out);
  out = r.text;
  fixes += r.fixes;
  if (relPath.endsWith(".tsx")) {
    const r2 = fixMissingCssImport(absPath, out);
    out = r2.text;
    fixes += r2.fixes;
  }
  if (fixes > 0 && out !== text) {
    try {
      writeFileSync(absPath, out, "utf8");
    } catch (err) {
      throw new Error(
        `auto-fix write failed for ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { text: out, fixes };
}

/* ═══════════════════ §14  REPORTERS + CLI ═══════════════════ */

const ANSI = {
  reset: "\u001b[0m",
  red: "\u001b[31m",
  yellow: "\u001b[33m",
  green: "\u001b[32m",
  dim: "\u001b[2m",
  bold: "\u001b[1m",
} as const;

type Palette = { reset: string; red: string; yellow: string; green: string; dim: string; bold: string };

function colors(): Palette {
  const enabled =
    process.env["FORCE_COLOR"] === "1" ||
    (process.stdout.isTTY === true && process.env["NO_COLOR"] === undefined);
  return enabled
    ? ANSI
    : { reset: "", red: "", yellow: "", green: "", dim: "", bold: "" };
}

function reportHuman(report: GuardianReport, quiet: boolean): string {
  const c = colors();
  const lines: string[] = [];
  lines.push(`${c.bold}ARCHITECTURE GUARDIAN v${report.version}${c.reset} — root: ${report.root}`);
  lines.push(
    `${c.dim}files: ${report.filesScanned} · errors: ${report.errors.length} · warnings: ${
      report.warnings.length
    } · auto-fixable: ${report.autoFixable.length} · ${report.durationMs}ms${c.reset}`,
  );
  if (report.readErrors.length > 0) {
    lines.push(`${c.red}UNREADABLE (blocking — the gate could not verify):${c.reset}`);
    for (const f of report.readErrors) lines.push(`  ${c.red}✗ ${f}${c.reset}`);
  }
  if (!quiet) {
    const byFile = new Map<string, Violation[]>();
    for (const v of [...report.errors, ...report.warnings]) {
      const list = byFile.get(v.file) ?? [];
      list.push(v);
      byFile.set(v.file, list);
    }
    for (const [file, viols] of [...byFile.entries()].sort((a, b) => cmpCodeunit(a[0], b[0]))) {
      lines.push(`\n${c.bold}${file}${c.reset}`);
      for (const v of viols) {
        const tag = v.severity === "error" ? `${c.red}ERROR${c.reset}` : `${c.yellow}WARN ${c.reset}`;
        const fix = v.autoFixable ? ` ${c.dim}[auto-fixable]${c.reset}` : "";
        lines.push(`  ${tag} ${v.rule} · L${v.line} · ${v.message}${fix}`);
        if (v.suggestion !== undefined) lines.push(`        ${c.dim}→ ${v.suggestion}${c.reset}`);
      }
    }
  }
  lines.push(`\n${c.bold}SUMMARY${c.reset}`);
  lines.push(`  errors:       ${report.errors.length}`);
  lines.push(`  warnings:     ${report.warnings.length}`);
  lines.push(`  auto-fixable: ${report.autoFixable.length}`);
  lines.push(`  score:        ${report.overallScore.toFixed(1)} / ${report.scale} (threshold ${report.passThreshold})`);
  lines.push(
    report.passed
      ? `${c.green}PASS ✅ — commit approved${c.reset}`
      : `${c.red}FAIL ❌ — commit rejected (BASE Rule 8)${c.reset}`,
  );
  return lines.join("\n");
}

function printRuleRegistry(): void {
  const out: string[] = [`\nRULE REGISTRY (${CHECKS.length} file-level + H-06 graph):`];
  for (const check of CHECKS) out.push(`  ${check.key.padEnd(12)} ${check.description}`);
  out.push(`  ${"H-06".padEnd(12)} Circular dependency detection (import graph)`);
  process.stdout.write(`${out.join("\n")}\n`);
}

const HELP = `ARCHITECTURE GUARDIAN v${TOOL_VERSION} — auto-enforcing architecture quality gate

USAGE
  npx tsx tools/architecture-guardian.ts [options] [paths...]

OPTIONS
  --root <dir>      project root (default: parent of tools/) · also --root=<dir>
  --json            machine-readable report on stdout (diagnostics on stderr)
  --quiet           summary only
  --changed         only files changed vs git HEAD (modified + untracked);
                    fails closed (exit 3) when git or HEAD is unavailable
  --fix             apply safe, idempotent auto-fixes (Safari -webkit- backdrop
                    mirror with full value, material easing → var(--ease-apple),
                    missing co-located CSS import), then re-verify fixed text
  --strict          manifest-declared severity wins (advisory warns promoted)
  --no-cache        bypass ${CACHE_FILE} (full re-analysis)
  --fail-on-warn    exit 1 when warnings exist
  --verbose         print the rule registry
  --help            this help

EXIT CODES
  0  pass             no blocking errors
  1  violations       errors found (or warnings with --fail-on-warn)
  2  internal error   unexpected crash OR unreadable file/dir (not verified)
  3  config error     flags · root · manifest · git

SCOPE
  Scans <root>/src/**/*.{ts,tsx,css} (node_modules, dist, build, coverage,
  __tests__, … excluded as path segments). The H-06 import-graph check always
  runs on the FULL discovered file set, even when [paths...] narrow the scope.`;

const BOOLEAN_FLAG_NAMES = new Set([
  "json", "quiet", "changed", "fix", "strict",
  "no-cache", "fail-on-warn", "verbose", "help",
]);

export function parseArgs(argv: readonly string[]): CliOptions {
  const flags = new Set<string>();
  const paths: string[] = [];
  let root: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      paths.push(toPosix(arg).replace(/^\.\//, ""));
      continue;
    }
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1);

    if (name === "root") {
      const value = inlineValue !== undefined ? inlineValue : argv[i + 1];
      if (value === undefined || value === "" || value.startsWith("--")) {
        throw new CliError("--root requires a value (use --root <dir> or --root=<dir>)", 3);
      }
      if (inlineValue === undefined) i += 1;
      root = value;
    } else if (BOOLEAN_FLAG_NAMES.has(name)) {
      if (inlineValue !== undefined) {
        throw new CliError(`--${name} does not accept a value`, 3);
      }
      flags.add(name);
    } else {
      throw new CliError(`unknown flag: --${name} — see --help`, 3);
    }
  }

  const toolDir = dirname(fileURLToPath(import.meta.url));
  const rootDir = root !== undefined ? toPosix(resolve(root)) : toPosix(resolve(join(toolDir, "..")));
  return {
    root: rootDir,
    json: flags.has("json"),
    quiet: flags.has("quiet"),
    changed: flags.has("changed"),
    fix: flags.has("fix"),
    strict: flags.has("strict"),
    noCache: flags.has("no-cache"),
    failOnWarn: flags.has("fail-on-warn"),
    verbose: flags.has("verbose"),
    help: flags.has("help"),
    paths,
  };
}

function buildReport(
  root: string,
  results: readonly FileResult[],
  readErrors: readonly string[],
  durationMs: number,
  strict: boolean,
  fixesApplied: number,
): GuardianReport {
  const manifest = getManifest();
  // Emitted canon IDs (B-56, B-64…) resolve to their OWNING rule (X-17…)
  // for severity lookup — no invented "error" fallback (AG4-04).
  const ownerByRule = new Map<string, string>();
  for (const [id, meta] of Object.entries(manifest.RULES)) {
    if (!ownerByRule.has(id)) ownerByRule.set(id, id);
    for (const cid of meta.checkIds) {
      if (!ownerByRule.has(cid)) ownerByRule.set(cid, id);
    }
  }
  const all = results.flatMap((r) => r.violations);
  const errors: Violation[] = [];
  const warnings: Violation[] = [];
  for (const v of all) {
    const owner = ownerByRule.get(v.rule) ?? v.rule;
    const declared: Severity = manifest.RULES[owner]?.severity ?? v.severity;
    // Patch 3 (AG4-04) semantics:
    //   default  → a manifest "warn" downgrades to warn; otherwise the check's
    //              own severity stands (advisory warns stay warn)
    //   --strict → only a manifest-declared "error" is forced to error; a
    //              declared "warn" (X-17 rollout) stays warn in BOTH modes
    const effective: Severity = strict
      ? declared === "error" ? "error" : v.severity
      : declared === "warn" ? "warn" : v.severity;
    const normalized: Violation = effective === v.severity ? v : { ...v, severity: effective };
    if (effective === "error") errors.push(normalized);
    else warnings.push(normalized);
  }
  errors.sort(compareViolations);
  warnings.sort(compareViolations);

  const totalApplicable = results.reduce((a, r) => a + r.applicable.length, 0);
  const weighted =
    totalApplicable === 0
      ? manifest.SCORING.scale
      : results.reduce((a, r) => a + r.score * r.applicable.length, 0) / totalApplicable;
  const overallScore = Math.round(weighted * 10) / 10;

  return {
    tool: "architecture-guardian",
    version: TOOL_VERSION,
    root,
    generatedAt: new Date().toISOString(),
    filesScanned: results.length,
    readErrors,
    results,
    errors,
    warnings,
    autoFixable: all.filter((v) => v.autoFixable).sort(compareViolations),
    overallScore,
    passThreshold: manifest.SCORING.passThreshold,
    scale: manifest.SCORING.scale,
    fixesApplied,
    durationMs,
    passed: errors.length === 0 && readErrors.length === 0,
  };
}

/* ═══════════════════ §15  ENGINE ORCHESTRATION + ENTRYPOINT ═══════════════════ */

/**
 * Pure engine — no process.exit, no console. Returns the report plus the
 * resolved exit code so the CLI stays a thin adapter (D7: testable).
 */
export function runGuardian(opts: CliOptions): GuardianRun {
  const started = Date.now();
  getManifest(); // fail fast (exit 3) on a malformed manifest

  if (!existsSync(opts.root)) {
    throw new CliError(`root not found: ${opts.root}`, 3);
  }
  if (!statSync(opts.root).isDirectory()) {
    throw new CliError(`root is not a directory: ${opts.root}`, 3);
  }

  // The import graph ALWAYS sees the full discovered set — v3 passed the
  // --paths-filtered list and silently missed cycles outside the filter.
  const { files: allFiles, walkErrors } = discover(opts.root);
  const changedSet = opts.changed ? resolveChangedSet(opts.root) : null;
  const scanTargets = changedSet === null ? allFiles : allFiles.filter((f) => changedSet.has(f));
  const scoped =
    opts.paths.length === 0
      ? scanTargets
      : scanTargets.filter((f) => opts.paths.some((p) => f.startsWith(p)));
  const scopedSet = new Set(scoped);

  const cache = opts.noCache ? null : loadCache(opts.root);
  const nextCacheFiles: Record<string, CacheEntry> = { ...(cache?.files ?? {}) };

  const readErrors: string[] = [...walkErrors];
  const analyses: FileAnalysis[] = [];
  const importsByFile = new Map<string, readonly ImportSpec[]>();
  let fixesApplied = 0;

  // Pass 1 — scoped files: full analysis (cache-aware, single read).
  for (const rel of scoped) {
    const abs = join(opts.root, rel);
    let stats: Stats;
    try {
      stats = statSync(abs);
    } catch {
      readErrors.push(rel);
      continue;
    }
    const cached = cache?.files[rel];
    const cacheHit =
      cached !== undefined &&
      cached.checked &&
      !opts.fix &&
      cached.mtimeMs === stats.mtimeMs &&
      cached.size === stats.size;
    if (cacheHit && cached !== undefined) {
      analyses.push({
        file: rel,
        violations: [...cached.violations],
        applicable: [...cached.applicable],
        hasImports: cached.imports.length > 0,
      });
      importsByFile.set(rel, cached.imports);
      nextCacheFiles[rel] = cached;
      continue;
    }

    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      readErrors.push(rel);
      continue;
    }
    let mtimeMs = stats.mtimeMs;
    let size = stats.size;
    if (opts.fix) {
      const fixed = applySafeFixes(abs, rel, text);
      fixesApplied += fixed.fixes;
      text = fixed.text;
      if (fixed.fixes > 0) {
        try {
          const st2 = statSync(abs);
          mtimeMs = st2.mtimeMs;
          size = st2.size;
        } catch {
          // keep pre-write stats; content is authoritative for the hash below
        }
      }
    }
    const imports = parseImports(text);
    const ctx = buildCheckContext(opts.root, abs, rel, text);
    const { violations, applicable } = runChecks(ctx);
    analyses.push({ file: rel, violations, applicable, hasImports: imports.length > 0 });
    importsByFile.set(rel, imports);
    nextCacheFiles[rel] = { hash: sha1(text), mtimeMs, size, checked: true, violations, applicable, imports };
  }

  // Pass 2 — out-of-scope files: imports only (graph support), cache-aware.
  for (const rel of allFiles) {
    if (importsByFile.has(rel)) continue;
    const abs = join(opts.root, rel);
    let stats: Stats;
    try {
      stats = statSync(abs);
    } catch {
      readErrors.push(rel);
      continue;
    }
    const cached = cache?.files[rel];
    if (cached !== undefined && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      importsByFile.set(rel, cached.imports);
      nextCacheFiles[rel] = cached;
      continue;
    }
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      readErrors.push(rel);
      continue;
    }
    const imports = parseImports(text);
    importsByFile.set(rel, imports);
    nextCacheFiles[rel] = {
      hash: sha1(text),
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      checked: false,
      violations: [],
      applicable: [],
      imports,
    };
  }

  // Graph: H-06 cycles, merged BEFORE scoring so they actually count (v3
  // appended them after scores were computed, via a readonly-subverting cast).
  const index = buildFileIndex(allFiles);
  const edges = buildEdges(opts.root, allFiles, importsByFile, index);
  const cycles = detectCycles(edges);
  const cyclesByFile = new Map<string, Violation[]>();
  for (const cyc of cycles) {
    // Anchor on the first cycle member that is inside the reported scope.
    const anchor = cyc.nodes.find((n) => scopedSet.has(n));
    if (anchor === undefined) continue;
    const line = cyc.lines.get(anchor) ?? 1;
    const list = cyclesByFile.get(anchor) ?? [];
    list.push({
      rule: "H-06",
      severity: "error",
      file: anchor,
      line,
      message: `Circular dependency: ${[...cyc.nodes, cyc.nodes[0]].join(" → ")}`,
      autoFixable: false,
      suggestion: "Break the cycle: extract shared types or invert the dependency",
    });
    cyclesByFile.set(anchor, list);
  }

  const results: FileResult[] = analyses
    .map((a): FileResult => {
      const cyclesForFile = cyclesByFile.get(a.file) ?? [];
      const violations = [...a.violations, ...cyclesForFile].sort(compareViolations);
      const applicable =
        a.hasImports && !a.applicable.includes("H-06")
          ? [...a.applicable, "H-06"]
          : a.applicable;
      return { file: a.file, violations, applicable, score: computeScore(applicable, violations) };
    })
    .sort((a, b) => cmpCodeunit(a.file, b.file));

  if (!opts.noCache) {
    // Prune: keep only entries for files that still exist on disk.
    const pruned: Record<string, CacheEntry> = {};
    for (const rel of allFiles) {
      const entry = nextCacheFiles[rel];
      if (entry !== undefined) pruned[rel] = entry;
    }
    saveCache(opts.root, { version: TOOL_VERSION, files: pruned });
  }

  const report = buildReport(
    opts.root,
    results,
    [...new Set(readErrors)].sort(),
    Date.now() - started,
    opts.strict,
    fixesApplied,
  );

  const exitCode: 0 | 1 | 2 =
    report.readErrors.length > 0
      ? 2
      : report.errors.length > 0 || (opts.failOnWarn && report.warnings.length > 0)
        ? 1
        : 0;

  return { report, exitCode, fixesApplied };
}

/* — CLI adapter (thin; all logic lives in runGuardian) — */

function main(): void {
  let opts: CliOptions;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof CliError) {
      process.stderr.write(`${err.message}\n`);
      process.exit(err.exitCode);
    }
    throw err;
  }
  if (opts.help) {
    process.stdout.write(`${HELP}\n`);
    process.exit(0);
  }
  try {
    const run = runGuardian(opts);
    if (opts.json) {
      if (run.fixesApplied > 0) {
        process.stderr.write(`--fix applied ${run.fixesApplied} safe fix(es). Re-run to verify.\n`);
      }
      process.stdout.write(`${JSON.stringify(run.report, null, 2)}\n`);
    } else {
      if (run.fixesApplied > 0) {
        process.stdout.write(`--fix applied ${run.fixesApplied} safe fix(es). Re-run to verify.\n\n`);
      }
      process.stdout.write(`${reportHuman(run.report, opts.quiet)}\n`);
      if (opts.verbose) printRuleRegistry();
    }
    process.exit(run.exitCode);
  } catch (err) {
    if (err instanceof CliError) {
      process.stderr.write(`config error: ${err.message}\n`);
      process.exit(err.exitCode);
    }
    process.stderr.write(
      `architecture-guardian internal error: ${
        err instanceof Error ? (err.stack ?? err.message) : String(err)
      }\n`,
    );
    process.exit(2);
  }
}

const invokedAsCli =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedAsCli) {
  main();
}

/* ═══════════════════ §16  CHANGELOG (audit ledger) ═══════════════════
 *
 * v4.1.1 — field-audit hotfix (AG4-17):
 * [x] AG4-17 (false positive, B-77) keyframe namespace check accepted only
 *          2–3-char prefixes (^\[a-z\]{2,3}-) while the documented policy is
 *          <prefix>-<DescriptiveName> with no length clause. Namespaced
 *          names such as "approval-countdown-pulse" were flagged. Regex now
 *          accepts any lowercase-first alnum prefix + ≥1 dashed segment:
 *          ^\[a-z\]\[a-z0-9\]*(?:-\[A-Za-z0-9\]+)+$. Surfaced by the first
 *          production-scale audit (30k-violation report): 643 B-77 hits,
 *          sampled hits already namespaced. Verify suite extended with a
 *          long-prefix keyframe fixture (tools gap closed).
 *
 * v4.1.0 — fusion patch set (AG4-01…AG4-15):
 * [x] AG4-01 (critical) manifest boot contract accepts string[] |
 *          ReadonlySet (toStringArray/toOptionalStringArray) — v4.0.0
 *          exit-3'd against any Set-exporting manifest (repo v2.1 or fusion
 *          v3.0.0). isStringArray survives only for cache validation. Patch 1.
 * [x] AG4-02 X-06 exempts the whole shared/hooks/ MCP-call layer (CHECKLIST
 *          §14.6 P2); X-03 keeps its 3-file exempt — fetch() in a hook is
 *          still a violation. Patch 2.
 * [x] AG4-04 severity resolves through the OWNING rule (ownerByRule over
 *          RULES[].checkIds) — no invented "error" fallback; --strict
 *          promotes ONLY manifest-declared errors; X-17 (B-56…B-73) stays
 *          warn in both modes. Patch 3.
 * [x] AG4-05 X-22 rewritten: first-level fields only, paren guard for
 *          multiline signatures, depth-true interface end (nested type
 *          members no longer false-positived). Patch 4.
 * [x] AG4-06 unified comment guard (isInsideComment) for the X-01/05/08/19
 *          exec loops — commented-out code no longer counts. Patch 5.
 * [x] AG4-07 X-13 allowlist is structural-only (VALID_TOKENS are token
 *          NAMES, not literals — dead membership removed). Patch 6.
 * [x] AG4-08 X-02 detects typed const components (regex gains ':'). Patch 7.
 * [x] AG4-09 X-15 runs on every ext — easing literals in config.ts no
 *          longer escape. Patch 8. X-28 covers .ts as well. Patch 9.
 * [x] AG4-10 X-28 never audits styles/globals.css (layer 0 owns the font
 *          stack). Patch 9.
 * [x] AG4-11 X-09 description aligned with the enforcement (advisor-engine/
 *          AND shared/hooks/ wrappers). Patch 10.
 * [x] AG4-12/03 X-26: gap-x-/gap-y-/inset-x-/inset-y-/divide-x-/divide-y-
 *          dash units + w-full/h-full keyword ban + className={"…"} literal
 *          form. Patch 11. (Residual, documented: arbitrary values w-[…] and
 *          ${…} templates stay out of scope — heuristic class F-07.)
 * [x] AG4-13 resolveImportSpec maps @features/@stores/@app — H-06 now sees
 *          cycles routed through feature aliases. Patch 12.
 * [x] AG4-14 header ledger reference aligned with §16. Nomenclature.
 * [x] AG4-15 (verification hardening) X-15 + easing fixer never touch
 *          custom-property definitions — the token source cannot become a
 *          var() self-reference.
 * [x] AG4-16 (verification hardening) report/graph ordering switched from
 *          locale-aware localeCompare to code-unit comparison — ICU primary
 *          strength is case-blind ("config" sorts before "Demo") and
 *          locale-dependent; D4 determinism must be locale-independent.
 *
 * v4.0.0 — production-hardening audit (AG-1…AG-28):
 *
 * CRITICAL — correctness:
 * [x] AG-1  X-15 + easing fixer were dead code (`cubic-bezier$$` regex,
 *          L493/L1062 of v3) → rule never fired, --fix never fixed. Fixed.
 * [x] AG-2  X-13 rgba/hsla alternatives dead (`$$`, L453) → only hex colors
 *          were detected. Fixed.
 * [x] AG-3  X-04 `buildInsight\s*$$` dead internal (L299). Fixed.
 * [x] AG-4  webkit mirror fixer wrote an EMPTY value (match ended at the
 *          colon) → produced invalid CSS that killed Safari blur. Fixed:
 *          full value mirrored, idempotent.
 * [x] AG-5  `--strict` was a functional no-op (both ternary branches equal,
 *          L1166). Implemented: strict = manifest severity authoritative.
 * [x] AG-6  `--changed` without git/HEAD silently scanned 0 files and
 *          returned a green PASS. Now fails closed (exit 3) + includes
 *          untracked files (new files were invisible to the gate).
 * [x] AG-7  H-06 violations bypassed scoring and were pushed via a
 *          readonly-subverting cast after scores were computed. Now merged
 *          immutably BEFORE scoring and added to `applicable`.
 * [x] AG-8  Import graph ran on the --paths-filtered set despite the "always
 *          full" comment → cycles outside the filter were missed. Graph now
 *          always uses the full discovered set; cycles anchor to scoped files.
 * [x] AG-9  X-01 emitted literal `{m[1]}` and X-04 literal `{name}` (the very
 *          GC-5 anti-pattern the v3 ledger claimed fixed). Fixed.
 *
 * MAJOR — robustness / performance / hygiene:
 * [x] AG-10 Dead code removed: `statSync` import (unused), ADVISOR_EXEMPT
 *          (declared, never used — now actually used), X-21 no-op
 *          `.map(a => a.replace(/^src\//, "src/"))`, X-18 `|| true`.
 * [x] AG-11 `autoFixable` is now truthful (D6): X-01 no longer claims a
 *          fixer; C-06 gained a real one (import insertion).
 * [x] AG-12 Single read pass + mtime/size cache with cached import edges:
 *          warm runs stat instead of re-reading; detectCycles no longer
 *          re-reads every file (v3 did double I/O).
 * [x] AG-13 Iterative DFS for cycle detection (v3 recursed → stack overflow
 *          on deep graphs); deterministic edge order.
 * [x] AG-14 Cache: structural validation (corrupted cache → full re-analysis,
 *          not garbage), atomic tmp+rename write, stale-entry pruning.
 * [x] AG-15 CLI hardening: --help, --root=<dir> form, unknown flags → exit 3
 *          (v3 silently ignored them), --json keeps stdout pure (diagnostics
 *          → stderr).
 * [x] AG-16 `lineOf` via precomputed offsets + binary search (v3 re-split the
 *          whole content per match: O(n·m)).
 * [x] AG-17 INTERNAL_DIRS matched substrings ("my-dist/" was skipped) →
 *          path-segment matching.
 * [x] AG-18 X-26 mega-regex tokenized (same semantics, reviewable); X-19 uses
 *          full regex escaping; X-02 names escaped.
 * [x] AG-19 CheckDef.keys[]: emitted rule IDs (B-56…B-79) now enter
 *          `applicable` so BASE §0.2 counts them (v3 under-counted).
 * [x] AG-20 Deterministic order extended to --json (v3 only sorted the human
 *          reporter, contradicting its own header claim).
 * [x] AG-21 X-17 scans comment-stripped CSS (a commented-out @media no longer
 *          satisfies coverage); B-76 exempts trailing at-rule blocks
 *          generically (@supports/@container, not just @media).
 * [x] AG-22 Duplicate `new AdvisorEngine` reporting removed from X-04 (X-09
 *          owns it); walk errors block the gate (GC-11 completed for dirs).
 * [x] AG-23 Testable core: runGuardian/parseArgs exported, entrypoint guarded
 *          via import.meta.url (importing the module no longer runs the CLI).
 * [x] AG-24 Manifest contract validated at boot (exit 3 with a precise
 *          message instead of crashing mid-scan on a malformed manifest).
 * [x] AG-25 skipBlock handles single-line at-statements; the tool itself
 *          passes its own rules (no `any`, readonly interfaces, named
 *          exports, § sections, file header).
 * [x] AG-26 X-05 bypass closed: relative sibling imports ("../demo/Demo")
 *          now resolve against the filesystem — cross-feature imports can
 *          no longer escape detection by omitting "features/" from the
 *          specifier.
 * [x] AG-27 C-09: whitespace-only button content no longer counts as
 *          visible text (v3 regex backtracking let "   " pass) — icon-only
 *          buttons are reliably flagged now.
 * [x] AG-28 --changed: `git ls-files --others` emits CWD-relative paths from
 *          a subdirectory — untracked files were dropped when root ≠ repo
 *          top (false-green). Fixed with --full-name.
 *
 * v4.1.2 — G13 sandbox audit (Linux clone, byte-verified evidence):
 * [x] AG-29 X-16 detector/fixer misaligned — 3 defects, sandbox-reproduced
 *          on the full tree (1156 files, 437 auto-fixable claimed):
 *          (α) fixer checked only the PREVIOUS line for an existing mirror;
 *          repo convention is mirror AFTER → v4.1.1 --fix wrote a duplicate
 *          right above the real one (4 shipped in G11/WellnessAnomalyRadar;
 *          sandbox repro wrote 279). Now: prev OR next, same normalized
 *          value.
 *          (β) detector scanned a backward-only 2-line window for ANY
 *          -webkit- property → 279/437 flags were false positives (mirror
 *          on the NEXT line). Now: value-aware bidirectional ±2 window.
 *          (γ) autoFixable truthful per violation — true only when the
 *          line matches the fixer's own single-line-declaration shape
 *          (X16_BARE_DECL, shared const: detector and fixer in lockstep).
 *          Sandbox-verified: v4.1.1 full --fix = 437 writes incl. 279
 *          duplicates; 4.1.2 = writes only the genuinely-missing mirrors
 *          and re-runs clean (idempotency holds).
 *
 * v4.1.3 — G14 sandbox audit (T3 evidence pass):
 * [x] AG-30 X-28 banned-font detector matched raw substrings —
 *          identifiers (setInterval, Interface, Internal,
 *          colorInterpolationFilters), Spanish words (Interés) and
 *          hyphenated prose (Inter-generational) all contain "Inter":
 *          109/111 hits tree-wide were false positives (sandbox-measured
 *          full run; only 2 real system-ui fallback stacks in facilities).
 *          Now a banned font fires only as a standalone font token
 *          (isFontToken: boundary chars around the name — quoted, in a
 *          stack, or after a font-family colon). Same one-hit-per-font-
 *          per-file semantics as v4.1.2. Errors 15303→15194 with zero
 *          source changes; no real usage missed (grep cross-check).
 */
