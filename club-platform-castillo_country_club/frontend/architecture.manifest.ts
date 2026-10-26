/**
 * architecture.manifest.ts
 * frontend/architecture.manifest.ts
 *
 * @level       Level 6+ Agency · Apple/Xiaomi Production Grade · 2027
 * @namespace   manifest
 * @keyframes   0 (data file, not UI)
 * @depends     (none — pure data, zero runtime deps)
 *
 * ARCHITECTURE MANIFEST — Single Source of Truth v3.3.0
 *
 * LINEAGE: repo v2.1 (data-rich) ⊕ AI-gen v1.0 (schema/canon-mapped)
 *          → v3.0.0 FUSION → v3.1.0 RECONCILIATION → v3.2.0 BC-02 APPLIED
 *          → v3.3.0 PAQUETE 1 AUDITED (REQUEST 1 §13 · EventCalendar unlock)
 *          (see §14-§15 AUDIT LEDGERS).
 *
 * v3.1.0 reconciles this file against the tool that enforces it:
 * architecture-guardian v4.1.1 (verified against a 1.151-file production run,
 * 30.075 violations, score 8.0/10). Every claim §5 makes about enforcement is
 * now backed by an emitting check — and every emitted rule ID has an owner
 * entry here. Behaviour of the guardian is UNCHANGED by this version
 * (proven byte-identical in the verification harness, see §14 MF-02).
 *
 * v3.2.0 applies BC-02: the QueryClient global error handler landed as a
 * 6-file drop-in (providers.tsx v1.1 · api.ts v2.1 · Toast.tsx v2.1 ·
 * Toast.css v2.1 · ui/index.ts v2.1 · this manifest). The 401 feedback
 * loop is closed END-TO-END: api.ts throws APIError with the REAL status
 * (G8-05) → QueryCache/MutationCache onError → deduped APIError-aware
 * toast → ToastContainer mounted in Providers above the router. Verified
 * by 111 behavioral + 30 static checks (scripts/bc02-verify/). No tool
 * versions changed — VERSION_SYNC.guardian/validator untouched. See §14
 * BC-02 LEDGER.
 *
 * v3.3.0 audits REQUEST 1 (CHECKPOINT §13 — the 7 shared/ blockers) as a
 * 13-file drop-in (12 rewritten + FreshnessBadge.css unchanged). 20
 * findings G9-01..G9-20: G9-17 BLOCKING (PermissionGate.css was 100%
 * desynced from its TSX — 0 of 27 classes covered, the gate rendered
 * unstyled in all 3 modes), G9-01 CRITICAL (conditional hook — Rules of
 * Hooks crash) and G9-11 CRITICAL (TS2686 UMD-global compile error).
 * The 7 registry entries move pending → audited (scores ≥ 9.3): J-10 /
 * SHARED-7 no longer blocks EventCalendar. No tool versions changed —
 * VERSION_SYNC.guardian/validator untouched. See §15 G9 LEDGER.
 *
 * Canonical sources (BASE §1.3 anti-duplication):
 *   Token CANON values .......... [CHECKPOINT §1.2/§1.3]
 *   BEM registry ................ [CHECKPOINT §1.4]
 *   Check IDs A..J (180) ........ [CHECKLIST §1-§10]  ← IDs are LAW
 *   Zero Tolerance ........ ...... [BASE §8.3]
 * THIS FILE: machine-readable materialization for tooling. It maps to the
 * canon above — it NEVER redefines meaning of a canon check ID (AC-1 fix).
 *
 * §1  Types                        §8  Audited file registry (+ derived views)
 * §2  Design tokens                §9  Glass primitives
 * §3  Path aliases                 §10 CSS dimensions + policy + enforcement tables
 * §4  Module inventory (data)      §11 Scoring + rollout
 * §5  Rule registry                §12 Version sync
 * §6  Breaking changes             §13 Helpers (computed stats + coverage)
 * §7  Feature domain map           §14-§15 Audit ledgers
 *
 * ID POLICY (critical — fixes RC-1/AC-X01):
 *   - A check that matches a canon CHECKLIST ID 1:1 REUSES that ID
 *     (B-76, C-01, C-09, H-06…).
 *   - Every tooling-only rule is keyed X-* and declares `checkIds[]`
 *     (the canon checks it contributes to). A canon ID NEVER carries
 *     two meanings across the system. A canon ID MAY be contributed to by
 *     more than one rule (e.g. C-05 by X-13 and X-23) when the meaning is
 *     the same — getCanonCoverage() makes every such case explicit.
 *
 * ENFORCEMENT POLICY (v3.1.0 — fixes MF-03):
 *   - Every entry in §5 defaults to `enforcement: "enforced"`: a guardian
 *     v4.1.1 check emits its ID today. Entries marked `"planned"` are
 *     declared law with ZERO current enforcement (X-11, X-24) — the gap is
 *     explicit, never implied. getRuleStats() reports both counts.
 *   - The guardian resolves severity through the OWNING entry here
 *     (ownerByRule); an emitted ID without an owner entry falls back to the
 *     check's hardcoded severity — v3.1.0 closes that hole for X-28 and H-06
 *     with entries that match the current fallback exactly (neutral change).
 *
 * R-16 EXEMPTION: this file is the ONLY legal home for color literals
 * (canonical token source). Guardian exempts it.
 *
 * PATH CONVENTION: registry paths are src-relative and extensionless
 * ("shared/lib/api"). Use normalizeSharedPath() before lookup.
 */

/* ═══════════════════ §1  TYPES ═══════════════════ */

export type Severity = "error" | "warn"; // masters semantics (was "warning")

export type AutomationKind = "full" | "heuristic" | "manual";

/**
 * v3.1.0 (MF-03): declared law vs. live law. "enforced" (default) means a
 * guardian v4.1.1 check emits this rule ID today; "planned" means the rule
 * is canon but no check implements it yet — the manifest never implies
 * enforcement that does not exist.
 */
export type Enforcement = "enforced" | "planned";

export type OwnerSuite =
  | "guardian:architecture"
  | "guardian:mcp"
  | "guardian:advisor"
  | "guardian:css"
  | "guardian:typescript"
  | "guardian:component"
  | "shared-imports"
  | "manual";

export type AuditStatus = "audited" | "reverify-on-use" | "pending" | "config";

export interface TokenGroupEntry {
  readonly value: string;
  readonly source: "CHECKPOINT §1.2" | "CHECKPOINT §1.3" | "globals.css (pending CANON registration)";
}

/** §4 raw inventory row — statuses/scores are DERIVED from §8 (MF-05). */
export interface ModuleInventoryEntry {
  readonly exports: readonly string[];
  readonly types?: readonly string[];
  /** Free-form notes preserved verbatim from v3.0.0 §4 (provenance, gates). */
  readonly notes?: string;
}

export interface ModuleInfo {
  readonly exports: readonly string[];
  readonly types?: readonly string[];
  /** Derived from §8 AUDITED_REGISTRY at load time — never hand-written. */
  readonly status: string;
  readonly score?: number;
  /** Derived: §8 children with status "pending" (component names). */
  readonly pendingAudit?: readonly string[];
  readonly notes?: string;
}

export interface IntegrityRule {
  readonly rule: string;
  readonly severity: Severity;
  readonly check: string;
  readonly category: "architecture" | "mcp-chain" | "advisor" | "css" | "typescript" | "component";
  /** Canon CHECKLIST IDs this rule contributes to (may be empty). */
  readonly checkIds: readonly string[];
  readonly automation: AutomationKind;
  readonly owner: OwnerSuite;
  readonly sourceRule?: string; // provenance: repo v2.1 rule id
  /** v3.1.0: defaults to "enforced" — see ENFORCEMENT POLICY above. */
  readonly enforcement?: Enforcement;
}

export interface BreakingChange {
  readonly description: string;
  readonly before?: readonly string[];
  readonly after?: readonly string[];
  readonly grep: string;
  readonly replacement?: string;
  readonly detail?: string;
  readonly status: "PENDING" | "APPLIED" | "BLOCKED";
  readonly blocking: boolean;
}

export interface FeatureConfig {
  readonly prefix: string;
  readonly status: "pending" | "in-progress" | "pending-review" | "complete" | "blocked";
  readonly wave: 1 | 2 | 3 | 4 | 5 | 6;
  readonly files: { readonly completed: number; readonly total: number };
  readonly aura?: { readonly token: string; readonly var: string };
}

export interface AuditedEntry {
  readonly path: string;
  readonly status: AuditStatus;
  readonly phase: string;
  readonly score?: number;
  readonly notes?: string;
}

export interface GlassPrimitive {
  readonly description: string;
  readonly tones?: readonly string[];
  readonly variants?: readonly string[];
  readonly trends?: readonly string[];
  readonly states?: readonly string[];
}

/** §13 getPlannedTokenMeta() row — computed from §7 FEATURE_MAP. */
export interface PlannedTokenMeta {
  readonly kind: "aura" | "color-family";
  readonly consumedBy: readonly string[]; // feature prefixes ([] = global)
  readonly gate: "AURA-VALUES" | "TOKEN-REGISTRATION";
}

/* ═══════════════════ §2  DESIGN TOKENS ═══════════════════ */

export const MANIFEST_VERSION = "3.3.0";
export const MANIFEST_DATE = "2026-10-24";

export const TOKENS = {
  colors: {
    // Deep Dark
    abyss: "#080B12",
    surface0: "#0C1018",
    surface1: "rgba(12,16,24,0.75)",
    surface2: "rgba(12,16,24,0.60)",
    surface3: "#243049",

    // Silver — Text Hierarchy
    silver100: "#F0F2F5",
    silver200: "#E8EAF0",
    silver300: "#B8C0CC",
    silver400: "#8A95A5",
    silver500: "#6B7585",
    silver600: "#4A5568",
    silver700: "#3A4050",
    silver800: "#2D3748", // casing normalized (was #2d3748)

    // Gold — Intelligence / Analysis
    gold200: "#E8D5A0",
    gold300: "#D4B87A",
    gold400: "#C9A96E",
    gold500: "#D4A840",
    gold700: "#8B692A", // CANON value [CHECKPOINT §1.3] — repo v2.1 had #8B6A2A (AC-2)

    // Teal — Execution / Operations
    teal300: "#5EEAD4",
    teal400: "#2A9AB5",
    teal500: "#1E7F95",

    // Emerald — Results / Health
    emerald400: "#3DAA70",
    emerald500: "#2D8F5C",

    // Amber — Warnings
    amber400: "#D4A840", // NOTE: intentionally aliased to gold500 (AC-3 pending ratification)
    amber500: "#F59E0B", // casing normalized

    // Rose — Errors / Critical
    rose300: "#E8798A", // casing normalized
    rose400: "#E85D6E",
    rose500: "#D64457",

    // Activity Tones
    terracotta400: "#C17F59",
    sage400: "#87A878",

    // Semantic
    warmCanvas: "#F5F3EE",
    border: "rgba(255,255,255,0.06)",
    lineColor: "rgba(255,255,255,0.06)",
    scenarioColor: "var(--color-teal-400)",
    sectionAccent: "var(--color-gold-400)",
  },

  charts: {
    1: "var(--color-gold-400)",
    2: "var(--color-teal-400)",
    3: "var(--color-emerald-400)",
    4: "var(--color-amber-400)",
    5: "var(--color-rose-400)",
  },

  fonts: {
    display: "'Cormorant Garamond', serif",   // resolves CL-M3 PENDING (--font-display)
    mono: "'DM Mono', monospace",             // resolves CL-M3 PENDING (--font-mono)
    ui: "'DM Sans', sans-serif",              // resolves CL-M3 PENDING (--font-ui)
  },

  easing: {
    apple: "cubic-bezier(0.32, 0.72, 0, 1)", // CANON [CHECKPOINT §1.3]
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    micro: "ease-out",
  },

  shadows: {
    sm: "0 2px 8px rgba(0,0,0,0.15)",
    md: "0 8px 24px rgba(0,0,0,0.2)",
    lg: "0 16px 48px rgba(0,0,0,0.3)",
    xl: "0 32px 64px rgba(0,0,0,0.5)",
    card: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset", // CANON
    float: "0 12px 40px rgba(0,0,0,0.3)",   // CANON
    hero: "0 20px 60px rgba(0,0,0,0.4)",    // CANON
    overlay: "0 24px 80px rgba(0,0,0,0.5)", // CANON
  },

  glass: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.06)",
    hoverShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },

  gaps: {
    panel: "14px",     // CANON --gap-panel
    card: "10px",      // CANON --gap-card
    metric: "6px",     // CANON --gap-metric
    timeline: "5px",   // CANON --gap-timeline
    action: "5px",     // CANON --gap-action
  },

  radii: {
    sm: "6px",  // resolves CL-M3 PENDING (--radius-sm)
    md: "10px", // resolves CL-M3 PENDING (--radius-md)
    lg: "12px",
    xl: "16px",
  },

  /**
   * DEPRECATED — backward compat only. Do NOT use in new code.
   * Flagged by guardian X-18. Machine-readable replacements live in
   * DEPRECATED_TOKEN_REPLACEMENTS (v3.1.0); this map keeps the v2.1 prose.
   */
  deprecated: {
    ocean400: "→ use teal-400",
    ocean500: "→ use teal-500",
    jungle400: "→ use emerald-400",
    jade400: "→ use sage-400",
    pearl100: "→ use silver-100",
    pearl200: "→ use silver-200",
    forest400: "→ use sage-400",
    cream100: "→ use silver-100",
    ivory100: "→ use silver-100",
    fontBody: "→ REMOVED (was 'Source Serif 4')",
  },
} as const;

/**
 * TOKEN PROVENANCE (v3.1.0 — makes TokenGroupEntry live data, MF-10):
 * values that were normalized, canon-corrected or aliased during the fusion,
 * with the authority that backs each decision. Anything NOT listed here is
 * straight v2.1 lineage pending CANON registration.
 */
export const TOKEN_PROVENANCE: Readonly<Record<string, TokenGroupEntry>> = {
  "colors.gold700": { value: "#8B692A", source: "CHECKPOINT §1.3" }, // AC-2
  "colors.silver800": { value: "#2D3748", source: "globals.css (pending CANON registration)" },
  "colors.amber400": { value: "#D4A840", source: "globals.css (pending CANON registration)" }, // AC-3
  "colors.amber500": { value: "#F59E0B", source: "globals.css (pending CANON registration)" },
  "colors.rose300": { value: "#E8798A", source: "globals.css (pending CANON registration)" },
  "easing.apple": { value: "cubic-bezier(0.32, 0.72, 0, 1)", source: "CHECKPOINT §1.3" },
  "shadows.card": { value: "0 4px 24px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.03) inset", source: "CHECKPOINT §1.3" },
  "shadows.float": { value: "0 12px 40px rgba(0,0,0,0.3)", source: "CHECKPOINT §1.3" },
  "shadows.hero": { value: "0 20px 60px rgba(0,0,0,0.4)", source: "CHECKPOINT §1.3" },
  "shadows.overlay": { value: "0 24px 80px rgba(0,0,0,0.5)", source: "CHECKPOINT §1.3" },
  "gaps.panel": { value: "14px", source: "CHECKPOINT §1.2" },
  "gaps.card": { value: "10px", source: "CHECKPOINT §1.2" },
  "gaps.metric": { value: "6px", source: "CHECKPOINT §1.2" },
  "gaps.timeline": { value: "5px", source: "CHECKPOINT §1.2" },
  "gaps.action": { value: "5px", source: "CHECKPOINT §1.2" },
};

/**
 * v3.1.0 (MF-04): explicit group→custom-property prefix map. The v3.0.0
 * helper derived prefixes with `/s$/` replacement and produced THREE names
 * that do not exist in VALID_TOKENS ("--radii-sm", "--easing-apple",
 * "--glass-hover-shadow"). Derivation is now a lookup table — unknown groups
 * throw (fail-closed) instead of returning an invented name.
 */
export const TOKEN_GROUP_PREFIXES: Readonly<Record<string, string>> = {
  colors: "--color",
  fonts: "--font",
  easing: "--ease",
  shadows: "--shadow",
  glass: "--glass",
  gaps: "--gap",
  radii: "--radius",
};

/**
 * v3.1.0 (MF-04): names whose canonical custom property is NOT the mechanical
 * derivation (semantic aliases + irregular ordering). Keyed "group/name".
 */
export const TOKEN_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  "colors/lineColor": "--line-color",
  "colors/scenarioColor": "--scenario-color",
  "colors/sectionAccent": "--section-accent",
  "glass/hoverShadow": "--glass-shadow-hover",
};

/**
 * CSS custom property name for a token group + name.
 * FIXED (AC-8, reopened by MF-04): numeric scale names ("gold400" →
 * --color-gold-400) AND correct prefixes for every group. Fail-closed on
 * unknown groups — a codemod consuming this helper must never receive a
 * silently invented token name.
 */
export function toCSSToken(group: string, name: string): string {
  const override = TOKEN_NAME_OVERRIDES[`${group}/${name}`];
  if (override !== undefined) return override;
  const prefix = TOKEN_GROUP_PREFIXES[group];
  if (prefix === undefined) {
    throw new Error(
      `toCSSToken: unknown token group "${group}" — known groups: ${Object.keys(TOKEN_GROUP_PREFIXES).join(", ")}`,
    );
  }
  const n = name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/(\d+)/g, "-$1")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `${prefix}-${n}`;
}

/**
 * v3.1.0 (MF-04): VALID_TOKENS is DERIVED from TOKENS — the token table and
 * the allowlist the guardian enforces (X-13/X-18) can no longer drift apart.
 * Skips: `charts` (var() references, not custom properties) and `deprecated`
 * (mapping prose, not tokens). The verification harness pins the derived set
 * byte-for-byte against the v3.0.0 hand-declared list (61 tokens).
 */
function deriveValidTokens(): ReadonlySet<string> {
  const out = new Set<string>();
  for (const [group, names] of Object.entries(TOKENS)) {
    if (group === "charts" || group === "deprecated") continue;
    for (const name of Object.keys(names)) {
      out.add(toCSSToken(group, name));
    }
  }
  return out;
}

/**
 * IMPLEMENTED CSS custom property tokens — consumed by X-13 (colors),
 * X-18 (deprecated). Must match globals.css `:root` exactly
 * (verification gate = token diff scan, see §11 ROLLOUT).
 */
export const VALID_TOKENS: ReadonlySet<string> = deriveValidTokens();

/**
 * PLANNED tokens — names are CANON [CHECKPOINT §1.5] but values are NOT yet
 * registered (never invent values, BASE §4.3). Auras consume these names;
 * registering values in globals.css is a tracked gate (AC-4 / RM-2 fix).
 * Cross-checked against §7 FEATURE_MAP by the verification harness
 * (aura vars ⊆ this set; planned color families = distinct aura tokens).
 */
export const PLANNED_TOKENS: ReadonlySet<string> = new Set([
  "--aura-global", "--aura-events", "--aura-families", "--aura-sports",
  "--aura-cultural", "--aura-engagement", "--aura-finance", "--aura-guests",
  "--aura-members", "--aura-comms", "--aura-wellness", "--aura-facilities",
  "--aura-age-group", "--aura-recs",
  // Color families referenced by CHECKPOINT §1.5 auras — NOT in VALID_TOKENS yet
  "--color-violet-400", "--color-sky-400", "--color-cyan-400", "--color-indigo-400",
  "--color-pink-400", "--color-orange-400", "--color-lime-400",
]);

/** Deprecated tokens — flagged by guardian X-18. */
export const DEPRECATED_TOKENS: ReadonlySet<string> = new Set([
  "--color-ocean-400", "--color-ocean-500", "--color-jungle-400", "--color-jade-400",
  "--color-pearl-100", "--color-pearl-200", "--color-forest-400", "--color-cream-100",
  "--color-ivory-100", "--font-body",
]);

/**
 * v3.1.0 (MF-13): machine-readable replacements for X-18 suggestions and the
 * F-wave token codemods. Every target is a VALID_TOKEN (harness-pinned).
 * `--font-body` is intentionally absent — it was REMOVED, not replaced.
 */
export const DEPRECATED_TOKEN_REPLACEMENTS: Readonly<Record<string, string>> = {
  "--color-ocean-400": "--color-teal-400",
  "--color-ocean-500": "--color-teal-500",
  "--color-jungle-400": "--color-emerald-400",
  "--color-jade-400": "--color-sage-400",
  "--color-pearl-100": "--color-silver-100",
  "--color-pearl-200": "--color-silver-200",
  "--color-forest-400": "--color-sage-400",
  "--color-cream-100": "--color-silver-100",
  "--color-ivory-100": "--color-silver-100",
};

/* ═══════════════════ §3  PATH ALIASES ═══════════════════ */

export const PATH_ALIASES = {
  "@": "src/",
  "@shared/": "src/shared/",
  "@features/": "src/features/",
  "@stores/": "src/stores/",
  "@app/": "src/app/",
} as const;

/* ═══════════════════ §4  MODULE INVENTORY (DATA) ═══════════════════
 * v3.1.0 (MF-05): this section is RAW DATA ONLY — exports and types, plus
 * notes preserved verbatim from v3.0.0. status/score/pendingAudit are NOT
 * hand-written here anymore: `MODULES` (same export name, same ModuleInfo
 * shape) is materialized from this inventory + §8 AUDITED_REGISTRY at the
 * end of §8, so §4 and §8 can never tell two different truths again
 * (BASE §1.3 anti-duplication — v3.0.0 violated it with 6 drifted fields).
 */

export const MODULE_INVENTORY: Readonly<Record<string, ModuleInventoryEntry>> = {
  "shared/lib/utils": {
    exports: [
      "cn", "formatCurrency", "formatUSD", "formatNumber",
      "formatPercent", "calculateAge", "getAgeGroup", "timeAgo",
      "severityColor", "roleLabel", "getGreeting", "compactCurrency",
      "MONTH_NAMES", "getCurrentSeason",
    ],
    // AC-5 fix: NOT in AUDITED_FILES (was contradictory in v2.1 — RC-3)
    notes: "PENDING REWRITE — score 7.2 < 9.2 threshold. 6 violations (U-01 to U-06).",
  },

  "shared/lib/api": {
    exports: ["callMCPTool", "APIError"],
    notes: "verify vs impl: healthCheck? (AC-6)",
  },

  "shared/lib/mcp/mcp-router": {
    exports: ["routeMCPCall"],
  },

  "shared/hooks/useMCPQuery": {
    exports: ["useMCPQuery", "useMCPMutation"],
  },

  "shared/hooks/useAutonomousAdvisor": {
    exports: ["useAutonomousAdvisor"],
  },

  "shared/lib/advisor-engine": {
    exports: [
      "useAdvisorEngine", "AdvisorEngine",
      "buildInsight", "computeHealthScore",
      "computeConfidence", "CONFIDENCE_PRESETS",
    ],
    types: [
      "BaseContext", "RuleDefinition", "Insight",
      "HealthFactorDef", "AdvisorConfig", "ConfidenceScore",
      "SignalDefinition", "AdvisorCommand",
    ],
    notes: "AUDITED — types 9.3, engine 9.4, index 9.3",
  },

  "shared/lib/advisor-engine/rules/events": {
    exports: ["EVENT_RULES", "EventsContext", "EVENT_HEALTH_FACTORS"],
  },

  "shared/lib/advisor-engine/signal-bus": {
    exports: ["SignalBus"],
  },

  "shared/types/ai-intelligence": {
    exports: ["AIDomain", "AdvisorActionState", "AdvisorReaction"],
    notes: "VERIFIED via useAutonomousAdvisor read",
  },

  "shared/types/domain-enums": {
    exports: ["SeverityLevel", "TrendDirection", "HealthFactorStatus"],
    notes: "VERIFIED via events/types.ts read",
  },

  "shared/components/ui": {
    exports: [
      "Button", "Card", "Badge", "Input", "Modal", "Skeleton",
      "FormField", "FilterDropdown", "Toast", "EmptyState",
      "Table", "TrendIcon", "FrostedGlassCard", "GlowButton",
      "ScoreGauge", "WizardStepper", "FreshnessBadge",
      "StaleDataBanner", "NotificationDropdown",
      "AdvisorActionModal", "AdvisorReactionCard",
      "PlanStepApprovalModal", "CommandPalette",
    ],
    notes: "23/23 MIGRATED — avg 9.3. API re-verification pending (Checklist J). " +
      "MF-11: guardian X-02 also protects ToastContainer — EXPORT-LISTS gate " +
      "must adjudicate whether ui/index exports it.",
  },

  "shared/components/layout": {
    exports: ["PageContainer", "DashboardLayout", "Header", "Sidebar"],
    // v3.0.0 claimed "PENDING AUDIT (registry §8)" for all four, but §8 only
    // registers PageContainer — the other three are a REGISTRY GAP (MF-05),
    // documented in §14 until validate-shared-imports consumption is audited.
  },

  "shared/components/auth": {
    exports: ["PermissionGate", "ProtectedRoute"],
    // Same MF-05 registry gap: only PermissionGate is registered in §8.
  },
};

/* ═══════════════════ §5  RULE REGISTRY ═══════════════════
 * RECONCILED with architecture-guardian v4.1.1 (MF-02/MF-03):
 *   - The guardian emits exactly 40 rule IDs (26 X-*, 9 B-*, 4 C-*, H-06)
 *     from 32 checks + cycle detection. Every emitted ID has an owner entry
 *     below — v3.0.0 was missing X-28 and H-06 (their severities ran on the
 *     checks' hardcoded fallback, outside manifest authority).
 *   - X-11 and X-24 remain declared canon with NO emitting check in the
 *     guardian → marked `enforcement: "planned"`. The count of entries is
 *     COMPUTED (getRuleStats) — hand-counted numbers in comments are
 *     forbidden (RM-3 class of defect; v3.0.0's "35 rules" comment drifted).
 *   - checkIds are not documentation: the guardian's computeScore() resolves
 *     file-score penalties THROUGH them (X-14→B-21, X-19→C-03, X-20→A-01;
 *     B-64/B-70 direct). A wrong checkId silently changes scores.
 *   - Merge note: repo v2.1 R-03 and M-04 overlapped (both ban fetch outside
 *     MCP chain) → merged into X-03.
 */

export const RULES: Readonly<Record<string, IntegrityRule>> = {
  // ── Architecture (6) ──
  "X-01": {
    rule: "All shared/ imports use @shared/ alias (no relative paths)",
    severity: "error", check: "no-relative-imports-to-shared",
    category: "architecture", checkIds: [], automation: "full",
    owner: "guardian:architecture", sourceRule: "R-01",
  },
  "X-02": {
    rule: "No local Button/Card/Modal/etc outside shared/components/ui",
    severity: "error", check: "no-duplicate-shared-components",
    category: "architecture", checkIds: ["I-10", "H-05"],
    automation: "full", owner: "guardian:architecture", sourceRule: "R-02",
  },
  "X-03": {
    rule: "No raw fetch()/axios outside MCP chain (features use useMCPQuery/useMCPMutation)",
    severity: "error", check: "no-raw-fetch",
    category: "architecture", checkIds: ["F-06", "I-06"], automation: "full",
    owner: "guardian:architecture", sourceRule: "R-03 + M-04 (merged)",
  },
  "X-04": {
    rule: "No inline advisor logic outside advisor-engine (buildInsight, evaluateRule, etc)",
    severity: "error", check: "no-inline-advisor",
    category: "architecture", checkIds: ["F-05"], automation: "full",
    owner: "guardian:architecture", sourceRule: "R-04",
  },
  "X-05": {
    rule: "Features must not import from other features — go through shared/",
    severity: "error", check: "no-cross-feature-imports",
    category: "architecture", checkIds: [], automation: "full",
    owner: "guardian:architecture", sourceRule: "R-05",
  },
  // MF-02: emitted by the guardian since v4.0.0, severity ran on the check's
  // hardcoded "error" fallback because v3.0.0 had no owner entry. This entry
  // declares exactly that severity → authority moves to the manifest with
  // ZERO behavioural change (harness-verified byte-identical report).
  // Canon ID: CHECKLIST §11 fonts — exact ID to be confirmed on masters (Lote 3).
  "X-28": {
    rule: "No banned font families (Inter, Roboto, Arial, Space Grotesk, system-ui) — use --font-* tokens",
    severity: "error", check: "no-banned-fonts",
    category: "css", checkIds: [], automation: "full",
    owner: "guardian:css", sourceRule: "guardian v4.0.0 (AG4-09/10) — ts+tsx+css, globals.css exempt",
  },
  // MF-02: circular-dependency detection (guardian v4.0.0+, hardcoded
  // "error"). Canon H-06 reused 1:1 per ID POLICY. 10 hits in the last
  // production digest (shared/types) — remediating them is F5.
  "H-06": {
    rule: "No circular dependencies in the import graph",
    severity: "error", check: "no-circular-imports",
    category: "architecture", checkIds: ["H-06"], automation: "full",
    owner: "guardian:architecture", sourceRule: "guardian v4.0.0 — cycle detection over the full graph",
  },

  // ── MCP Communication Chain (3) ──
  "X-06": {
    rule: "callMCPTool only in shared/ hooks — features use useMCPQuery",
    severity: "error", check: "no-direct-mcp-call",
    category: "mcp-chain", checkIds: ["F-06"], automation: "full",
    owner: "guardian:mcp", sourceRule: "M-01",
  },
  "X-07": {
    rule: "routeMCPCall only in shared/lib/api.ts — transport layer",
    severity: "error", check: "no-direct-route-call",
    category: "mcp-chain", checkIds: [], automation: "full",
    owner: "guardian:mcp", sourceRule: "M-02",
  },
  "X-08": {
    rule: "useMCPQuery must have explicit type parameter <T>",
    severity: "warn", check: "mcp-query-type-param",
    category: "mcp-chain", checkIds: [], automation: "heuristic",
    owner: "guardian:mcp", sourceRule: "M-03",
  },

  // ── Advisor Engine (4) ──
  "X-09": {
    rule: "AdvisorEngine only instantiated in advisor-engine/ or domain hooks",
    severity: "error", check: "no-engine-instantiation-outside",
    category: "advisor", checkIds: [], automation: "full",
    owner: "guardian:advisor", sourceRule: "A-01",
  },
  "X-10": {
    rule: "No console.* in advisor rules — rules must be pure functions",
    severity: "warn", check: "no-console-in-rules",
    category: "advisor", checkIds: [], automation: "full",
    owner: "guardian:advisor", sourceRule: "A-02",
  },
  // MF-03: declared canon, ZERO enforcement — guardian v4.1.1 has no
  // emitting check (roadmap v4.2). Previously this entry implied enforcement.
  "X-11": {
    rule: "buildInsight/computeHealthScore/computeConfidence only in advisor-engine/",
    severity: "error", check: "no-advisor-internals-outside",
    category: "advisor", checkIds: [], automation: "full",
    owner: "guardian:advisor", sourceRule: "A-03",
    enforcement: "planned",
  },
  "X-12": {
    rule: "Feature config.ts must reference advisor domain",
    severity: "warn", check: "missing-advisor-config",
    category: "advisor", checkIds: ["F-09"], automation: "heuristic",
    owner: "guardian:advisor", sourceRule: "A-04",
  },

  // ── CSS Architecture (11) ──
  "X-13": {
    rule: "No hardcoded hex/rgba in component CSS — use tokens (structural colors are tokenized too: --glass-*, --color-border)",
    severity: "error", check: "no-hardcoded-colors",
    category: "css", checkIds: ["B-31", "C-05"], automation: "full",
    owner: "guardian:css", sourceRule: "R-06",
  },
  "X-14": {
    rule: "No transition: all — always specific properties",
    severity: "error", check: "no-transition-all",
    category: "css", checkIds: ["B-21"], automation: "full",
    owner: "guardian:css", sourceRule: "R-07",
  },
  "X-15": {
    rule: "No Material easing (0.4,0,0.2,1) — use var(--ease-apple)",
    severity: "error", check: "no-material-easing",
    category: "css", checkIds: ["B-15"], automation: "full",
    owner: "guardian:css", sourceRule: "R-08",
  },
  "X-16": {
    rule: "backdrop-filter must include -webkit-backdrop-filter mirror",
    severity: "error", check: "webkit-backdrop-mirror",
    category: "css", checkIds: ["B-01"], automation: "full",
    owner: "guardian:css", sourceRule: "R-09",
  },
  "X-17": {
    rule: "Component CSS must include: light mode, reduced-motion, print, responsive",
    severity: "warn", check: "css-dimensions-coverage",
    category: "css", checkIds: ["B-56", "B-57", "B-64", "B-70", "B-73"],
    automation: "full", owner: "guardian:css", sourceRule: "R-10",
  },
  "X-18": {
    rule: "No deprecated tokens (ocean, jungle, jade, pearl, forest, cream, ivory, font-body)",
    severity: "warn", check: "no-deprecated-tokens",
    category: "css", checkIds: [], automation: "full",
    owner: "guardian:css", sourceRule: "R-15",
  },
  // Canon identity-reuse (exact CHECKLIST B-76..B-79 — same meaning):
  "B-76": {
    rule: "Keyframes at end of CSS file (before @media queries)",
    severity: "warn", check: "keyframes-at-end",
    category: "css", checkIds: ["B-76"], automation: "full", owner: "guardian:css",
  },
  "B-77": {
    rule: "Keyframes namespaced: <prefix>-<DescriptiveName>",
    severity: "warn", check: "keyframes-namespaced",
    category: "css", checkIds: ["B-77"], automation: "full", owner: "guardian:css",
  },
  "B-78": {
    rule: "Max 6 keyframes per component CSS file",
    severity: "warn", check: "keyframes-count-limit",
    category: "css", checkIds: ["B-78"], automation: "full", owner: "guardian:css",
  },
  "B-79": {
    rule: "No generic keyframe names (fadeIn, slideUp, pulse, etc)",
    severity: "error", check: "no-generic-keyframe-names",
    category: "css", checkIds: ["B-79"], automation: "full", owner: "guardian:css",
  },

  // ── TypeScript Quality (9) ──
  "X-19": {
    rule: "No framer-motion / react-spring / GSAP — CSS animations only",
    severity: "error", check: "no-js-animation-lib",
    category: "typescript", checkIds: ["C-03"], automation: "full",
    owner: "guardian:typescript", sourceRule: "R-11",
  },
  "X-20": {
    rule: "No 'any' type — use unknown + type guards",
    severity: "error", check: "no-any-type",
    category: "typescript", checkIds: ["A-01"], automation: "full",
    owner: "guardian:typescript", sourceRule: "R-12",
  },
  "X-21": {
    rule: "No default exports — named exports only (entrypoints allowlist: src/main.tsx, src/app/App.tsx)",
    severity: "error", check: "no-default-export",
    category: "typescript", checkIds: ["A-09"], automation: "full",
    owner: "guardian:typescript", sourceRule: "R-13",
  },
  "X-22": {
    rule: "All interface fields readonly",
    severity: "warn", check: "readonly-interfaces",
    category: "typescript", checkIds: ["A-03", "C-22"], automation: "full",
    owner: "guardian:typescript", sourceRule: "R-14",
  },
  "X-23": {
    rule: "No hex colors in .ts/.tsx strings — use var(--color-*) references",
    severity: "error", check: "no-hex-in-ts",
    category: "typescript", checkIds: ["C-05"], automation: "full",
    owner: "guardian:typescript", sourceRule: "R-16",
  },
  // MF-03: declared canon (heuristic), ZERO enforcement in guardian v4.1.1.
  "X-24": {
    rule: "No local type redefinition — import from @shared/types/",
    severity: "error", check: "no-type-redefinition",
    category: "typescript", checkIds: ["F-08", "I-09"], automation: "heuristic",
    owner: "guardian:typescript", sourceRule: "R-17",
    enforcement: "planned",
  },
  "X-25": {
    rule: "TSX files must have § section markers (/* §1 TYPES */, etc)",
    severity: "warn", check: "section-markers",
    category: "typescript", checkIds: ["A-18", "C-18"], automation: "full",
    owner: "guardian:typescript", sourceRule: "T-01",
  },
  "X-26": {
    rule: "No Tailwind utility classes in className — use BEM CSS classes",
    severity: "error", check: "no-tailwind-utilities",
    category: "typescript", checkIds: ["C-04"], automation: "full",
    owner: "guardian:typescript", sourceRule: "T-02",
  },

  // ── Component Patterns (5) ──
  "X-27": {
    rule: "Exported components must have data-testid on root element",
    severity: "warn", check: "missing-data-testid",
    category: "component", checkIds: ["C-07"], automation: "full",
    owner: "guardian:component", sourceRule: "T-03",
  },
  "C-01": {
    rule: "Components with styles must have co-located CSS file",
    severity: "error", check: "css-co-located",
    category: "component", checkIds: ["C-01"], automation: "full", owner: "guardian:component",
  },
  "C-06": {
    rule: "CSS file must be imported in TSX (import './Component.css')",
    severity: "error", check: "missing-css-import",
    category: "component", checkIds: ["C-06"], automation: "full", owner: "guardian:component",
  },
  "C-09": {
    rule: "Buttons must have aria-label or visible text",
    severity: "warn", check: "aria-label-buttons",
    category: "component", checkIds: ["C-09"], automation: "full", owner: "guardian:component",
  },
  "C-19": {
    rule: "TSX files must have JSDoc header (@level, @namespace, @keyframes, @depends)",
    severity: "warn", check: "file-header",
    category: "component", checkIds: ["C-19"], automation: "full", owner: "guardian:component",
  },
};

/* ═══════════════════ §6  BREAKING CHANGES ═══════════════════ */

export const BREAKING_CHANGES: Readonly<Record<string, BreakingChange>> = {
  "BC-01": {
    description: "HealthFactorStatus Spanish → English values",
    before: ["excepcional", "saludable", "atención", "crítico"],
    after: ["exceptional", "healthy", "attention", "critical"],
    grep: 'grep -rn "excepcional\\|saludable\\|atención\\|crítico" src/ --include="*.ts" --include="*.tsx"',
    status: "PENDING",
    blocking: false,
  },
  "BC-02": {
    description: "QueryClient global error handler in providers.tsx",
    detail: "Move showToast(401) from api.ts to QueryClient default onError (APIError-aware). Runtime crash on 401 without it — MUST land before EventCalendar finalization.",
    // v3.2.0: call-syntax grep — api.ts v2.1 documents the migration in
    // header comments, so a bare 'showToast' grep false-positives on them.
    grep: "grep -rn 'showToast(' src/shared/lib/api.ts",
    status: "APPLIED", // v3.2.0 — 6-file drop-in, harness-verified (§14 BC-02 LEDGER)
    blocking: true, // severity IF pending (RM-6); APPLIED since v3.2.0
  },
  "BC-03": {
    description: "Remove api.getExecutiveSummary()/getPendingApprovals()",
    replacement: "useMCPQuery hook calls",
    grep: 'grep -rn "api\\.get" src/ --include="*.ts" --include="*.tsx"',
    status: "PENDING",
    blocking: false,
  },
  "BC-04": {
    description: "Remove TrendDirection re-export from advisor-engine barrel",
    replacement: "Import from @shared/types/domain-enums",
    grep: 'grep -rn "TrendDirection" src/ | grep "advisor-engine"',
    status: "PENDING",
    blocking: false,
  },
};

/* ═══════════════════ §7  FEATURE DOMAIN MAP ═══════════════════
 * unit = deliverable (tsx+css pair or single ts module) [CHECKPOINT §3.4].
 * totals = documental baseline; tooling derives live counts from filesystem.
 * maintenance prefix = "mt" (CHECKPOINT §1.4 ratified — repo v2.1 had "mn", AC-7).
 * Auras referencing --color-*-400 families are PLANNED tokens (see §2) —
 * getPlannedTokenMeta() (§13) computes the cross-index from this map.
 */

export const FEATURE_MAP: Readonly<Record<string, FeatureConfig>> = {
  "events":          { prefix: "ev", status: "in-progress",  wave: 1, files: { completed: 9, total: 25 }, aura: { token: "--color-emerald-400", var: "--aura-events" } },
  "dashboard":       { prefix: "db", status: "pending",      wave: 1, files: { completed: 0, total: 22 } },
  "families":        { prefix: "fm", status: "pending",      wave: 1, files: { completed: 0, total: 21 }, aura: { token: "--color-violet-400", var: "--aura-families" } },
  "members":         { prefix: "me", status: "pending",      wave: 2, files: { completed: 0, total: 21 }, aura: { token: "--color-indigo-400", var: "--aura-members" } },
  "finance":         { prefix: "fi", status: "pending",      wave: 2, files: { completed: 0, total: 19 }, aura: { token: "--color-emerald-400", var: "--aura-finance" } },
  "guests":          { prefix: "gu", status: "pending",      wave: 2, files: { completed: 0, total: 19 }, aura: { token: "--color-cyan-400", var: "--aura-guests" } },
  "recommendations": { prefix: "rc", status: "pending",      wave: 2, files: { completed: 0, total: 31 }, aura: { token: "--color-violet-400", var: "--aura-recs" } },
  "sports":          { prefix: "sp", status: "pending",      wave: 3, files: { completed: 0, total: 30 }, aura: { token: "--color-sky-400", var: "--aura-sports" } },
  "cultural":        { prefix: "cu", status: "pending",      wave: 3, files: { completed: 0, total: 35 }, aura: { token: "--color-amber-400", var: "--aura-cultural" } },
  "communications":  { prefix: "cm", status: "pending",      wave: 3, files: { completed: 0, total: 21 }, aura: { token: "--color-pink-400", var: "--aura-comms" } },
  "facilities":      { prefix: "fa", status: "pending",      wave: 4, files: { completed: 0, total: 26 }, aura: { token: "--color-orange-400", var: "--aura-facilities" } },
  "wellness":        { prefix: "we", status: "pending",      wave: 4, files: { completed: 0, total: 19 }, aura: { token: "--color-teal-400", var: "--aura-wellness" } },
  "engagement":      { prefix: "en", status: "pending",      wave: 4, files: { completed: 0, total: 18 }, aura: { token: "--color-rose-400", var: "--aura-engagement" } },
  "age-group":       { prefix: "ag", status: "pending",      wave: 4, files: { completed: 0, total: 11 }, aura: { token: "--color-lime-400", var: "--aura-age-group" } },
  "mi-club":         { prefix: "mc", status: "pending",      wave: 5, files: { completed: 0, total: 12 } },
  "ai-system":       { prefix: "ai", status: "pending",      wave: 5, files: { completed: 0, total: 6 } },
  "reports":         { prefix: "rp", status: "pending",      wave: 5, files: { completed: 0, total: 10 } },
  "operations":      { prefix: "op", status: "pending",      wave: 5, files: { completed: 0, total: 4 } },
  "settings":        { prefix: "st", status: "pending",      wave: 5, files: { completed: 0, total: 8 } },
  "auth":            { prefix: "au", status: "pending",      wave: 5, files: { completed: 0, total: 4 } },
  "approvals":       { prefix: "ap", status: "pending",      wave: 6, files: { completed: 0, total: 6 } },
  "documents":       { prefix: "do", status: "pending",      wave: 6, files: { completed: 0, total: 8 } },
  "maintenance":     { prefix: "mt", status: "pending",      wave: 6, files: { completed: 0, total: 2 } }, // mt- ratified (was mn)
};

/* ═══════════════════ §8  AUDITED FILE REGISTRY ═══════════════════
 * Single source of truth for tools/validate-shared-imports.ts.
 * STATUS TAXONOMY (fixes RC-2/RC-3):
 *   audited          → J-09/J-10 pass
 *   reverify-on-use  → pass with warn; consumer must re-verify API (J-07)
 *   pending          → J-10 FAIL when consumed by a feature (blockers)
 *   config           → esquema/wiring registry (not consumed as shared/)
 * BARREL RESOLUTION RULE: importing from a barrel resolves to the DEEPEST
 * file (Button, not ui/index) — status of the child WINS over the barrel.
 */

export const AUDITED_REGISTRY: readonly AuditedEntry[] = [
  // ── Infrastructure (FASE 1.5) ──
  { path: "shared/lib/api", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/lib/mcp", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/lib/mcp/mcp-router", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/hooks/useMCPQuery", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/hooks/useAutonomousAdvisor", status: "audited", phase: "FASE 1.5", score: 9.3 },
  // ── Advisor Engine ──
  { path: "shared/lib/advisor-engine", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/lib/advisor-engine/types", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/lib/advisor-engine/engine", status: "audited", phase: "FASE 1.5", score: 9.4 },
  { path: "shared/lib/advisor-engine/index", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/lib/advisor-engine/rules/events", status: "audited", phase: "FASE 2", score: 9.4 },
  { path: "shared/lib/advisor-engine/signal-bus", status: "audited", phase: "FASE 2", score: 9.4 },
  // ── Types ──
  { path: "shared/types", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/types/ai-intelligence", status: "audited", phase: "FASE 1.5", score: 9.3 },
  { path: "shared/types/domain-enums", status: "audited", phase: "FASE 1.5", score: 9.3 },
  // ── Design system ──
  { path: "styles/globals", status: "audited", phase: "FASE 0", score: 9.7,
    notes: "Layer 0 token implementation [CHECKPOINT §1.1]" },

  // ── Reverify-on-use (FASE 1 migrated — Checklist J note, CHECKPOINT §12) ──
  { path: "shared/components/ui", status: "reverify-on-use", phase: "FASE 1", score: 9.3,
    notes: "BARREL — child status wins on resolution" },
  { path: "shared/components/ui/Button", status: "reverify-on-use", phase: "FASE 1", score: 9.3 },
  { path: "shared/components/ui/EmptyState", status: "reverify-on-use", phase: "FASE 1", score: 9.3 },
  { path: "shared/components/ui/AdvisorActionModal", status: "reverify-on-use", phase: "FASE 1", score: 9.2 },

  // ── REQUEST 1 · Paquete 1 — AUDITED G9 (7 files · EventCalendar UNLOCKED) ──
  { path: "shared/components/ui/ScoreGauge", status: "audited", phase: "G9", score: 9.4,
    notes: "EventCalendar unlocked (§13 #1) — G9-01/G9-02 fixed" },
  { path: "shared/components/ui/FreshnessBadge", status: "audited", phase: "G9", score: 9.3,
    notes: "EventCalendar unlocked (§13 #2) — G9-04/G9-05 fixed (css unchanged)" },
  { path: "shared/components/ui/StaleDataBanner", status: "audited", phase: "G9", score: 9.3,
    notes: "EventCalendar unlocked (§13 #3) — G9-06..G9-10 fixed" },
  { path: "shared/components/ui/Skeleton", status: "audited", phase: "G9", score: 9.3,
    notes: "EventCalendar unlocked (§13 #4) — G9-11..G9-13 fixed" },
  { path: "shared/hooks/useBreakpoint", status: "audited", phase: "G9", score: 9.3,
    notes: "EventCalendar unlocked (§13 #5) — G9-14 fixed" },
  { path: "shared/components/layout/PageContainer", status: "audited", phase: "G9", score: 9.4,
    notes: "EventCalendar unlocked (§13 #6) — G9-15/G9-16 fixed" },
  { path: "shared/components/auth/PermissionGate", status: "audited", phase: "G9", score: 9.3,
    notes: "EventCalendar unlocked (§13 #7) — G9-17..G9-20 fixed; legacy denied CSS preserved (§9 of its css)" },

  // ── Calibration material (REQUEST 3 — not blockers) ──
  { path: "shared/lib/advisor-engine/confidence", status: "config", phase: "REQUEST 3",
    notes: "calibración de checks heurísticos D/G" },

  // ── Esquema / wiring config registry ──
  { path: "app/providers", status: "config", phase: "ESQUEMA" },
  { path: "app/router", status: "config", phase: "ESQUEMA" },
  { path: "stores/auth.store", status: "config", phase: "ESQUEMA" },
  { path: "shared/lib/utils", status: "config", phase: "ESQUEMA", score: 7.2, // score preserved from v3.0.0 §4 (MF-05)
    notes: "PENDING REWRITE 7.2 (U-01..U-06) — RC-3: removed from audited set" },
  { path: "shared/features/__TEMPLATE__/types", status: "config", phase: "ESQUEMA",
    notes: "Pilar 3 template — operator-confirmed route" },
  { path: "shared/components/ui/index", status: "config", phase: "ESQUEMA",
    notes: "barrel — H-04 sync check" },
];

/** Legacy-shaped view (kept for repo v2.1 consumers of AUDITED_FILES). */
export const AUDITED_FILES: ReadonlySet<string> = new Set(
  AUDITED_REGISTRY.filter((e) => e.status === "audited").map((e) => e.path),
);

export const PENDING_AUDIT: ReadonlySet<string> = new Set(
  AUDITED_REGISTRY.filter((e) => e.status === "pending").map((e) => e.path),
);

/**
 * v3.1.0 (MF-05): MODULES materialized from §4 inventory + this registry —
 * status/score/pendingAudit are COMPUTED, never hand-written. Same export
 * name and ModuleInfo shape as v3.0.0; the drifted §4 fields are gone.
 */
function buildModules(): Readonly<Record<string, ModuleInfo>> {
  const out: Record<string, ModuleInfo> = {};
  for (const [path, inv] of Object.entries(MODULE_INVENTORY)) {
    const exact = AUDITED_REGISTRY.find((e) => e.path === path);
    const children = AUDITED_REGISTRY.filter(
      (e) => e.path.startsWith(`${path}/`) && e.status !== "config",
    );
    const pendingAudit = children
      .filter((c) => c.status === "pending")
      .map((c) => c.path.slice(path.length + 1));
    const registryNotes = exact?.notes;
    const notes =
      [inv.notes, registryNotes].filter((n): n is string => n !== undefined).join(" | ") ||
      undefined;
    out[path] = {
      exports: inv.exports,
      ...(inv.types !== undefined ? { types: inv.types } : {}),
      status: resolveAuditStatus(path),
      ...(exact?.score !== undefined ? { score: exact.score } : {}),
      ...(pendingAudit.length > 0 ? { pendingAudit } : {}),
      ...(notes !== undefined ? { notes } : {}),
    };
  }
  return out;
}

export const MODULES: Readonly<Record<string, ModuleInfo>> = buildModules();

/**
 * BARREL RESOLUTION: given a normalized import path, return the entry whose
 * status governs. Child entries WIN over barrels (fixes RC-2).
 *
 * Precedence (v3.1.0 doc — semantics unchanged from v3.0.0, now pinned by
 * the verification harness):
 *   1. any non-config child "pending"          → "pending"  (conservative block)
 *   2. exact entry, no non-config children      → exact.status
 *   3. any non-config child "reverify-on-use"  → "reverify-on-use"
 *   4. exact entry                              → exact.status
 *   5. non-config children exist (all audited) → "audited"
 *   6. otherwise                                → "unknown"
 * "config" children never govern their parent; a "config" parent with
 * non-config children is governed by those children (rules 1/3/5).
 */
export function resolveAuditStatus(normalizedPath: string): AuditStatus | "unknown" {
  const exact = getAuditEntry(normalizedPath);
  const children = AUDITED_REGISTRY.filter(
    (e) => e.path.startsWith(`${normalizedPath}/`) && e.status !== "config",
  );
  if (children.some((c) => c.status === "pending")) return "pending";
  if (exact && children.length === 0) return exact.status;
  if (children.some((c) => c.status === "reverify-on-use")) return "reverify-on-use";
  if (exact) return exact.status;
  return children.length > 0 ? "audited" : "unknown";
}

/* ═══════════════════ §9  GLASS PRIMITIVES ═══════════════════
 * MF-12: "jade" is a DEPRECATED token family while glass-card still lists it
 * as a tone (BEM modifier .glass-card--jade), and "aqua"/"deep" have no token
 * families at all. Data left verbatim pending the globals.css audit (Lote 2)
 * — do not "fix" design truth without evidence.
 */

export const GLASS_PRIMITIVES: Readonly<Record<string, GlassPrimitive>> = {
  "glass-card": {
    description: "Rain on Glass — standard card",
    tones: ["gold", "teal", "emerald", "terracotta", "silver", "rose", "jade", "aqua", "deep"],
  },
  "glass-card--aura": {
    description: "Houdini-powered glowing card",
    variants: ["gold", "silver"],
    trends: ["up", "down"],
  },
  "stat-surface": { description: "Metric/stat container" },
  "glass-panel": { description: "Sidebar, modal — more opaque" },
  "glass-input": {
    description: "Full input system with labels/errors",
    states: ["default", "error", "success", "disabled"],
  },
  "glass-gauge": { description: "ScoreGauge SVG wrapper" },
  "glow-card": { description: "Conic gradient rotating glow" },
  "frost-card": {
    description: "Houdini frost effect (252px fixed)",
    trends: ["up", "down", "neutral"],
  },
  "frost-canvas-animated": { description: "Lighter frost canvas" },
  "frost-badge": {
    description: "Inline pill badge",
    variants: ["gold", "teal", "emerald", "silver"],
  },
  "aurora-btn": {
    description: "Aurora sweep on hover",
    variants: ["sage", "gold", "danger"],
  },
  "lunar-btn": {
    description: "Diagonal light beam on hover",
    variants: ["gold", "rose", "emerald", "teal", "silver"],
  },
};

/* ═══════════════════ §10  CSS DIMENSIONS + COLOR POLICY ═══════════════════ */

export const CSS_DIMENSIONS: readonly string[] = [
  "light-mode",
  "reduced-motion",
  "print",
  "responsive",
];

/**
 * STRUCTURAL COLOR POLICY (reconciles CL-K1):
 *   1st choice  → tokenize (glass.bg, border, warmCanvas…) — already done for
 *                 most structural values in TOKENS.
 *   2nd choice  → allowlisted literal during migration (print values, light-mode
 *                 rgba(0,0,0,x) scrims not yet tokenized).
 *   forbidden   → any other literal in component CSS (X-13).
 */
export const STRUCTURAL_COLOR_ALLOWLIST: ReadonlySet<string> = new Set([
  "rgba(255,255,255,0.03)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.05)",
  "rgba(255,255,255,0.06)", "rgba(255,255,255,0.07)", "rgba(255,255,255,0.08)",
  "rgba(0,0,0,0.02)", "rgba(0,0,0,0.04)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.08)",
  "#fff", "#ffffff", "#000", "#000000", "#ccc", // print-safe (B-73)
]);

/** Default-export allowlist [BASE §8.3 E-1] — enforced by X-21. */
export const DEFAULT_EXPORT_ALLOWLIST: ReadonlySet<string> = new Set([
  "src/main.tsx",
  "src/app/App.tsx",
]);

/** Banned fonts [CHECKLIST §11] — enforced by guardian font check (X-28). */
export const BANNED_FONTS: readonly string[] = [
  "Inter", "Roboto", "Arial", "Space Grotesk", "system-ui",
];

/** Banned animation libs [BASE Rule 4] — enforced by X-19. */
export const BANNED_DEPENDENCIES: readonly string[] = [
  "framer-motion", "react-spring", "gsap",
];

/* ── ENFORCEMENT TABLES (v3.1.0) ──────────────────────────────────────────
 * MF-16: materialized from guardian v4.1.1 §3 TOOL-LEVEL CONSTANTS — closes
 * the guardian's own TODO("manifest v3.1: absorb …"). Values are pinned
 * byte-equal against the guardian source by the verification harness, so a
 * future guardian v4.2 can consume them from HERE with zero semantic drift.
 * Until that flip happens, the guardian still uses its internal copies and
 * these tables are the audited mirror.
 */

/** X-02: local re-declaration of any of these names outside ui/ is an error. */
export const SHARED_COMPONENT_NAMES: readonly string[] = [
  "Button", "Card", "Badge", "Input", "Modal", "Skeleton",
  "FormField", "FilterDropdown", "Toast", "ToastContainer",
  "EmptyState", "Table", "TrendIcon", "FrostedGlassCard",
  "GlowButton", "ScoreGauge", "WizardStepper", "FreshnessBadge",
  "StaleDataBanner", "NotificationDropdown", "AdvisorActionModal",
  "AdvisorReactionCard", "PlanStepApprovalModal", "CommandPalette",
];

/** B-79: generic keyframe names that must be namespaced instead. */
export const GENERIC_KEYFRAMES: readonly string[] = [
  "fadeIn", "fadeOut", "slideUp", "slideDown", "slideLeft", "slideRight",
  "scaleIn", "scaleOut", "pulse", "spin", "bounce", "shake",
  "popIn", "popOut", "zoomIn", "zoomOut", "flash", "blink", "wiggle",
];

/** X-03: files allowed to call raw fetch() (MCP transport chain). */
export const MCP_CHAIN_EXEMPT: readonly string[] = [
  "src/shared/lib/api.ts",
  "src/shared/lib/mcp/mcp-router.ts",
  "src/shared/hooks/useMCPQuery.ts",
];

/** X-09/X-11 territory: advisor internals may live here. */
export const ADVISOR_EXEMPT: readonly string[] = [
  "shared/lib/advisor-engine/",
  "shared/hooks/",
];

/** X-19: banned animation libraries beyond BANNED_DEPENDENCIES. */
export const EXTRA_BANNED_ANIMATION_LIBS: readonly string[] = ["@react-spring"];

/* ═══════════════════ §11  SCORING + ROLLOUT ═══════════════════ */

export const SCORING = {
  scale: 10,
  passThreshold: 9.3,
  /**
   * Penalties keyed by CANON check IDs [BASE §0.2] — once per distinct rule
   * per file. MF-15 domain map (how the guardian resolves them today):
   *   X-14 → via its checkIds        → B-21 (0.3)
   *   X-19 → via its checkIds        → C-03 (0.5)
   *   X-20 → via its checkIds        → A-01 (0.5)
   *   B-64, B-70 → direct (emitted IDs under X-17's check)
   *   J-10 → NOT emitted by the guardian — validate-shared-imports domain.
   */
  penalties: {
    "A-01": 0.5,
    "B-21": 0.3,
    "C-03": 0.5,
    "J-10": 0.7,
    "B-64": 0.4,
    "B-70": 0.3,
  } as Readonly<Record<string, number>>,
  formula: "raw = (passes / (applicable - na)) * 10; final = raw - sum(distinct penalties); round 1dp half-up",
} as const;

/**
 * v3.1.0 (MF-07): advisoryRules is COMPUTED from §5 severities — the exact
 * set of rules that stay "warn" in both default and --strict modes (guardian
 * AG4-04 semantics). v3.0.0 hand-listed 8 of the 13 warn rules.
 */
const ADVISORY_RULES: readonly string[] = Object.entries(RULES)
  .filter(([, rule]) => rule.severity === "warn")
  .map(([id]) => id);

export const ROLLOUT = {
  mode: "warn-to-error" as const,
  advisoryRules: ADVISORY_RULES,
  strictFlag: "--strict",
  gates: [
    { id: "BC-02", blocking: true, detail: "QueryClient onError before EventCalendar" },
    { id: "SHARED-7", blocking: true, detail: "7 pending shared/ before EventCalendar — CLOSED v3.3.0 (PENDING_AUDIT.size = 0)" },
    { id: "TOKEN-DIFF", blocking: false, detail: "globals.css vs TOKENS diff scan (K-1 verification)" },
    { id: "AURA-VALUES", blocking: false, detail: "PLANNED_TOKENS values registration (AC-4)" },
    { id: "EXPORT-LISTS", blocking: false, detail: "MODULES export lists vs implementations (AC-6) — incl. ToastContainer (MF-11)" },
  ],
} as const;

/* ═══════════════════ §12  VERSION SYNC ═══════════════════ */

export const VERSION_SYNC = {
  manifest: "3.3.0", // bumped with MANIFEST_VERSION (self-consistency; tools unchanged)
  guardian: "4.1.1",   // verified against production digest (1.151 files, 30.075 violations)
  validator: "pending-audit", // validate-shared-imports NOT yet audited — do not fake a number (MF-06)
  mcpRouter: "2.1.0",
  advisorEngine: "2.1.0",
} as const;

export const COMPATIBLE_MANIFEST_MAJOR = 3;

/* ═══════════════════ §13  HELPERS (COMPUTED STATS + COVERAGE) ═══════════════════ */

export function isAuditedPath(normalizedPath: string): boolean {
  return AUDITED_FILES.has(normalizedPath);
}

export function isPendingAudit(normalizedPath: string): boolean {
  return PENDING_AUDIT.has(normalizedPath);
}

export function getAuditEntry(normalizedPath: string): AuditedEntry | undefined {
  return AUDITED_REGISTRY.find((e) => e.path === normalizedPath);
}

/**
 * Normalize an import specifier or FS path to registry form: forward slashes,
 * no leading "./" or "/", no trailing slash, no file extension.
 * v3.1.0 (MF-09): also handles Windows separators ("shared\\lib\\api.ts"),
 * duplicated slashes, and .css/.jsx/.js/.mjs/.cjs extensions — the repo runs
 * on Windows/MINGW64 and this function is the lookup key into §8.
 */
export function normalizeSharedPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "")
    .replace(/^\//, "")
    .replace(/\.(tsx|ts|css|jsx|js|mjs|cjs)$/, "");
}

export function getRulesByCategory(
  category: IntegrityRule["category"],
): readonly string[] {
  return Object.entries(RULES)
    .filter(([, rule]) => rule.category === category)
    .map(([id]) => id);
}

/**
 * v3.1.0 (MF-08): canon check-ID → contributing rules. Makes every
 * multi-contributor ID explicit and auditable (e.g. C-05 → X-13 + X-23:
 * same meaning — hardcoded colors — on two surfaces). Consumers building a
 * CHECKLIST coverage matrix (masters audit) read from here, never from
 * hand-maintained lists.
 */
export function getCanonCoverage(): Readonly<Record<string, readonly string[]>> {
  const coverage: Record<string, readonly string[]> = {};
  for (const [id, rule] of Object.entries(RULES)) {
    for (const cid of rule.checkIds) {
      const list = coverage[cid] ?? [];
      coverage[cid] = [...list, id];
    }
  }
  return coverage;
}

/** Computed stats — never hand-counted (fixes RM-3 class). */
export function getRuleStats(): {
  readonly total: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly byAutomation: Readonly<Record<AutomationKind, number>>;
  /** v3.1.0 (MF-03): enforcement split — "enforced" (default) vs "planned". */
  readonly enforced: number;
  readonly planned: number;
} {
  const byCategory: Record<string, number> = {};
  const byAutomation: Record<AutomationKind, number> = { full: 0, heuristic: 0, manual: 0 };
  let enforced = 0;
  let planned = 0;
  for (const rule of Object.values(RULES)) {
    byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
    byAutomation[rule.automation] += 1;
    if (rule.enforcement === "planned") planned += 1;
    else enforced += 1;
  }
  return {
    total: Object.keys(RULES).length,
    byCategory,
    byAutomation,
    enforced,
    planned,
  };
}

/**
 * v3.1.0 (MF-13): PLANNED_TOKENS cross-index computed from §7 FEATURE_MAP —
 * which auras exist, which planned color families they consume, and which
 * gate owns registration. Aura vars accumulate consumers when shared.
 */
export function getPlannedTokenMeta(): Readonly<Record<string, PlannedTokenMeta>> {
  const out: Record<string, PlannedTokenMeta> = {
    "--aura-global": { kind: "aura", consumedBy: [], gate: "AURA-VALUES" },
  };
  const colorConsumers: Record<string, string[]> = {};
  for (const feature of Object.values(FEATURE_MAP)) {
    if (feature.aura === undefined) continue;
    const existing = out[feature.aura.var];
    out[feature.aura.var] = {
      kind: "aura",
      consumedBy: existing === undefined ? [feature.prefix] : [...existing.consumedBy, feature.prefix],
      gate: "AURA-VALUES",
    };
    // Only PLANNED color families carry a registration gate — auras over
    // already-valid colors (emerald, teal, rose, amber) need no entry, so
    // the returned keys are exactly PLANNED_TOKENS (harness-pinned).
    const token = feature.aura.token;
    if (VALID_TOKENS.has(token)) continue;
    colorConsumers[token] = [...(colorConsumers[token] ?? []), feature.prefix];
  }
  for (const [token, consumers] of Object.entries(colorConsumers)) {
    out[token] = { kind: "color-family", consumedBy: consumers, gate: "TOKEN-REGISTRATION" };
  }
  return out;
}

export function getMigrationProgress(): {
  readonly totalFiles: number;
  readonly completedFiles: number;
  readonly percent: number;
} {
  let total = 0;
  let completed = 0;
  for (const feature of Object.values(FEATURE_MAP)) {
    total += feature.files.total;
    completed += feature.files.completed;
  }
  return {
    totalFiles: total,
    completedFiles: completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/* ═══════════════════ §14  AUDIT LEDGER ═══════════════════
 * MF-01: v3.0.0's header promised this section; the body never shipped it.
 * The FUSION ledger below is RECONSTRUCTED from the 19 in-file citations
 * (AC-*, RC-*, RM-*, AC-X01) — each entry states only what the citing line
 * states. The RECONCILIATION ledger records every v3.1.0 change with its
 * evidence.
 *
 * ── FUSION LEDGER (v2.1 ⊕ AI-gen → v3.0.0) ──────────────────────────────
 * AC-1    Tooling materialization never redefines canon check-ID meaning
 *         (header ID POLICY).
 * AC-2    gold700 = #8B692A (CANON) — v2.1 carried #8B6A2A.
 * AC-3    amber400 intentionally aliased to gold500 — pending ratification.
 * AC-4    PLANNED_TOKENS: names canon, values never invented; registration
 *         is a tracked gate (AURA-VALUES).
 * AC-5    shared/lib/utils removed from AUDITED_FILES (contradicted §8).
 * AC-6    MODULES export lists vs implementations unverified (healthCheck?).
 * AC-7    maintenance prefix "mt" ratified (was "mn").
 * AC-8    toCSSToken numeric scales ("gold400" → --color-gold-400).
 *         REOPENED by MF-04: v3.0.0 implementation was wrong for radii,
 *         easing and glass/hoverShadow. Truly fixed in v3.1.0.
 * AC-X01  Canon ID dual-meaning ban (with RC-1).
 * RC-1    ID POLICY: canon IDs reused 1:1; tooling rules keyed X-*.
 * RC-2    Barrel resolution: child status wins over the barrel.
 * RC-3    utils contradictory status resolved via "config" taxonomy.
 * RM-2    Planned-token values registration tracked as a gate.
 * RM-3    Hand-counted stats forbidden — getRuleStats() computes.
 *         v3.0.0 still hand-counted "35 rules" in a §5 comment (MF-14).
 * RM-6    BC-02 blocking flag restored (was unflagged in v2.1).
 *
 * ── RECONCILIATION LEDGER (v3.0.0 → v3.1.0) ─────────────────────────────
 * Evidence base: architecture-guardian v4.1.1 source (2.434 lines, 32 checks
 * + H-06, 40 emitted rule IDs) + production digest (1.151 files, 30.075
 * violations, score 8.0/10) + this file as uploaded (993 lines).
 * MF-01   §14 shipped. The header promised it; the body never contained it.
 * MF-02   §5 + X-28, H-06 owner entries: severity authority now covers all
 *         40 emitted IDs. Entries mirror the checks' current fallback
 *         severities exactly → guardian behaviour unchanged (harness-proven
 *         byte-identical reports, v3.0.0 vs v3.1.0).
 * MF-03   enforcement: "planned" on X-11/X-24 — declared canon with zero
 *         emitting checks (grep of the guardian source: no X-11, no X-24).
 *         getRuleStats() reports enforced=35 / planned=2.
 * MF-04   toCSSToken rewritten with TOKEN_GROUP_PREFIXES +
 *         TOKEN_NAME_OVERRIDES; unknown groups throw (fail-closed).
 *         VALID_TOKENS now DERIVED from TOKENS (61 tokens, pinned
 *         byte-equal to the v3.0.0 hand-declared list by the harness).
 * MF-05   MODULES derived from §8 at load: 6 drifted fields closed
 *         (ui.pendingAudit 6→4 registry-truth; EmptyState/Button are
 *         reverify-on-use, NOT pending; layout/auth barrels resolve via
 *         children). Registry gap documented: DashboardLayout, Header,
 *         Sidebar, ProtectedRoute are claimed pending in v3.0.0 §4 but
 *         never registered in §8 — NOT added blind because
 *         validate-shared-imports' consumption of PENDING_AUDIT is still
 *         unaudited (grows 7→11 the moment they are registered).
 *         utils score 7.2 preserved by moving it onto the §8 entry.
 * MF-06   VERSION_SYNC truthful: guardian 4.1.1 (verified), validator
 *         "pending-audit" instead of an invented "3.0.0".
 * MF-07   ROLLOUT.advisoryRules computed from severities (13 warn rules;
 *         v3.0.0 hand-listed 8).
 * MF-08   getCanonCoverage() exported — C-05 (X-13 + X-23) and every other
 *         multi-contributor canon ID is now explicit, not accidental.
 * MF-09   normalizeSharedPath: Windows separators, "./", "//", .css/.jsx/
 *         .js/.mjs/.cjs extensions.
 * MF-10   TokenGroupEntry is live data (TOKEN_PROVENANCE) — was declared
 *         and never used in v3.0.0.
 * MF-11   ToastContainer gap: guardian X-02 protects 24 names; §4 inventory
 *         lists 23. EXPORT-LISTS gate extended to adjudicate.
 * MF-12   glass-card tones jade/aqua/deep flagged — jade is deprecated as a
 *         TOKEN family; aqua/deep have none. Verdict deferred to the
 *         globals.css audit (Lote 2) — no data changed without evidence.
 * MF-13   DEPRECATED_TOKEN_REPLACEMENTS machine-readable (all targets are
 *         VALID_TOKENs; --font-body deliberately absent — REMOVED, not
 *         replaced). getPlannedTokenMeta() computed from FEATURE_MAP.
 * MF-14   §5 "35 rules" hand-counted comment deleted — getRuleStats() is
 *         the only authority (37 entries: 35 enforced + 2 planned).
 * MF-15   SCORING.penalties domain map documented (see §11) — J-10 belongs
 *         to validate-shared-imports; the guardian resolves B-21/C-03/A-01
 *         THROUGH manifest checkIds and B-64/B-70 directly.
 * MF-16   Guardian §3 TODO("manifest v3.1 absorption") closed on the
 *         manifest side: SHARED_COMPONENT_NAMES, GENERIC_KEYFRAMES,
 *         MCP_CHAIN_EXEMPT, ADVISOR_EXEMPT, EXTRA_BANNED_ANIMATION_LIBS
 *         materialized, pinned byte-equal to the guardian's internal
 *         constants. Guardian v4.2 flips to consuming them from here.
 *
 * Verification: scripts/manifest-verify/ — tsc strict (0 errors), 70 unit
 * checks, and the A/B neutrality runs (guardian v4.1.1 + v3.0.0 manifest vs
 * v3.1.0 manifest over the same fixture → identical reports, default AND
 * --strict modes).
 *
 * ── BC-02 LEDGER (v3.1.0 → v3.2.0) ────────────────────────────────────
 * Evidence base: the 5 uploaded files as received (providers.tsx v1.0,
 * api.ts v2.0, Toast.tsx v1.0, Toast.css v1.0, ui/index.ts v2.0) +
 * globals.css v2.2 (token/cascade cross-checks) + @tanstack/react-query
 * 5.104.5 (harness-pinned behavioral contract).
 * G8-01   CRITICAL providers: BC-02 never implemented — no cache onError,
 *         no ToastContainer mounted. api.ts v2.0 had ALREADY removed
 *         showToast trusting this file: 401s produced ZERO feedback.
 *         v1.1: QueryCache+MutationCache onError, deduped funnel, mount.
 * G8-02   HIGH providers: retry: 2 unconditional retried 401/403/404
 *         (3 auth/logout cycles per query). v1.1: 4xx never retried.
 * G8-03   HIGH providers: mutations retry: 1 — non-idempotent MCP tool
 *         calls could double-fire (create_event ×2). v1.1: retry false.
 * G8-04   MEDIUM providers: module-level QueryClient (test/SSR bleed).
 *         v1.1: useState(createQueryClient) per mount.
 * G8-05   CRITICAL api: callMCPTool re-wrapped EVERY router error as 500 —
 *         a 401 reached the UI as 500 (broke retry + BC-02 classification).
 *         v2.1: per-invocation capture of the original APIError
 *         (concurrency-safe), rethrown with its REAL status.
 * G8-06   MEDIUM api: base64url without padding restoration. v2.1: padEnd.
 * G8-07   MEDIUM api: login/health without timeout. v2.1: 10s/5s + 408
 *         mapping; backendCaller stays untimed (AI tools legitimately slow).
 * G8-08   MEDIUM api: 2xx bodies unvalidated. v2.1: shape guards → 502.
 * G8-09   LOW api: double normalization masked the refresh failure message.
 *         v2.1: already-normalized APIErrors preserved.
 * G8-10   MEDIUM Toast: "hover pause" claimed (D7) but never implemented.
 *         v2.1: real pause with REMAINING time + data-paused hook.
 * G8-11   LOW Toast: no subscription API (unobservable). v2.1:
 *         subscribeToToasts(); ToastContainer itself uses it.
 * G8-12   LOW Toast: non-null assertion + no overloads. v2.1: overloads.
 * G8-13   LOW Toast: aria-label on role-less div (dead for AT);
 *         250/4000 duplicated vs CSS. v2.1: role=region + named consts.
 * G8-14   LOW barrel: "3 utility strings (etc.)" (they are 2); "23
 *         components" imprecise; ToastMessage/ToastType not re-exported.
 *         v2.1: 30 symbols/23 files documented, types exported.
 * G8-15   CRITICAL css: .glass-toast (globals §6) is position:fixed
 *         top-right; the item inherited it and ESCAPED the stack column —
 *         all toasts overlapped at top-right, wrap/gap/stagger/mobile
 *         inert. Plus order-dependent animation/align-items cascade ties
 *         and a reduced-motion rule that would lose to the fix. v2.1:
 *         wrap-scoped arbitration rule (0,2,0) + specificity-bumped
 *         reduced-motion + stagger cap n+5.
 * G8-16   SYSTEMIC: each file passed LOCAL review; the CONTRACT between
 *         them was never verified. The BC-02 harness closes this class:
 *         an end-to-end test drives a real 401 query through the real
 *         QueryClient into the real ToastContainer DOM.
 *
 * Verification: scripts/bc02-verify/ — tsc strict (0 errors), 111
 * behavioral checks (real @tanstack/react-query 5.104.5 + React 19 +
 * jsdom; real fetchQuery retry paths; real DOM assertions), 30 static
 * checks (barrel surface, cascade fixes, token cross-check vs globals.css
 * v2.2, BC-02 grep contract). Deterministic across consecutive runs.
 *
 * ── G9 LEDGER (v3.2.0 → v3.3.0) — PAQUETE 1 · REQUEST 1 §13 ──────────
 * Evidence base: the 13 uploaded files as received (7 units: ScoreGauge,
 * FreshnessBadge, StaleDataBanner, Skeleton — tsx+css pairs; useBreakpoint;
 * PageContainer tsx+css; PermissionGate tsx+css) + globals.css v2.2 token
 * cross-check + the BC-02 stack (providers v1.1) as error-feedback layer.
 * G9-01   CRITICAL ScoreGauge.tsx: conditional hook call
 *         (reducedMotion ? score : useAnimatedCounter(score)) — Rules of
 *         Hooks violation; flipping prefers-reduced-motion mid-session
 *         crashes React ("Rendered fewer hooks than expected"). v2.1:
 *         hook always invoked, reduced-motion resolved BY VALUE.
 * G9-02   HIGH ScoreGauge.tsx: endpoint angle pct*360-90 double-compensated
 *         the CSS rotate(-90deg) — dot lagged the arc end by 90°. v2.1:
 *         angle shares the arc's angular base; -90° lives ONLY in CSS.
 * G9-03   LOW ScoreGauge.css: print track rgba(255,255,255,.04) invisible
 *         on white paper. v2.1: print stroke override.
 * G9-04   HIGH FreshnessBadge.tsx: /[hd]/ without word boundaries flagged
 *         ANY label containing h/d as stale ("hace 45 seg" → stale).
 *         v2.1: boundary-aware patterns + compact forms (16-case matrix).
 * G9-05   LOW FreshnessBadge.tsx: dead /\ds$/ branch; FreshnessData not
 *         exported; "día, día" JSDoc typo. v2.1: exported, pruned, fixed.
 * G9-06   MEDIUM StaleDataBanner.tsx: dead shouldRender state. v2.1: gone.
 * G9-07   MEDIUM StaleDataBanner.tsx: setTimeout(1500) fake feedback, no
 *         cleanup, setState-after-unmount. v2.1: awaited promise + 8s
 *         cap + 350ms grace + unmount cleanup.
 * G9-08   MEDIUM StaleDataBanner.tsx: barrel self-import (index →
 *         StaleDataBanner → index) inside its own package. v2.1: ./Button.
 * G9-09   LOW StaleDataBanner.tsx: "hace ?." copy. v2.1: explicit branches.
 * G9-10   MEDIUM StaleDataBanner.css: nowrap+ellipsis truncated the warning
 *         text itself on desktop. v2.1: multiline flow.
 * G9-11   CRITICAL Skeleton.tsx: `as React.CSSProperties` with no React
 *         import → TS2686 (UMD global in a module). v2.1: type import.
 * G9-12   HIGH Skeleton: noAnimation applied .ui-card--static which was
 *         defined NOWHERE — the prop was a no-op. v2.1: §2.5 static block.
 * G9-13   LOW Skeleton.css: dead `> *` --skel-index rule + empty light
 *         blocks. v2.1: pruned.
 * G9-14   MEDIUM useBreakpoint.ts: initial flags hardcoded desktop → wrong
 *         first frame on mobile/tablet (layout flash); width semantics
 *         undocumented. v2.1: lazy client initializer + doc.
 * G9-15   LOW PageContainer.tsx: PageAction variant union hand-duplicated
 *         from Button (drift risk); BreadcrumbItem unexported. v2.1:
 *         ComponentProps<typeof Button>["variant"] + export.
 * G9-16   LOW PageContainer.css: empty 1280px media query + redundant
 *         1024px title rule (clamp already caps). v2.1: pruned.
 * G9-17   CRITICAL (BLOCKING) PermissionGate.css: file defined ONLY
 *         .glass-perm-* while the TSX emits .perm-* — 0 of 27 classes
 *         covered; the gate rendered UNSTYLED in all 3 modes (dim overlay
 *         without glass, readonly bar without layout, tooltip
 *         unpositioned, debug without panel, sweep nonexistent). The TSX
 *         header claimed the namespace migration as done — only half the
 *         pair had moved. v2.1: full perm-* rewrite (27/27 classes, 3
 *         namespaced keyframes, D11 light / D12 motion+print / D9
 *         responsive) + legacy .glass-perm-denied* preserved (§9) for
 *         PermissionDenied.tsx (pending audit) — zero-regression drop-in.
 * G9-18   HIGH PermissionGate.tsx: readonly interception was BUBBLE-phase —
 *         child handlers fired BEFORE the wrapper's onClick, so locked
 *         controls still acted. v2.1: onClickCapture + preventDefault +
 *         stopPropagation + CSS ::after pointer layer (defense in depth).
 * G9-19   MEDIUM PermissionGate.tsx: tooltip timers stacked without refs/
 *         cleanup — repeated clicks cut the tooltip short. v2.1: single
 *         ref + clearTimeout + unmount cleanup.
 * G9-20   MEDIUM PermissionGate.tsx: deniable telemetry duplication
 *         (reason A→B→A, loading→denied) + unused-import eslint-disable
 *         hack. v2.1: signature dedupe + reset-on-grant + direct re-export.
 *
 * Verification: scripts/verify-paquete01.py — 15/15 checks (27/27 perm-*
 * class coverage TSX→CSS, keyframe resolution, syntax anchors for hooks/
 * cycles/UMD/timers/capture-phase, 16-case freshness matrix ported to
 * Python). Deterministic across consecutive runs. Harness self-audit: 3
 * naive-check bugs found and fixed during verification (audit-trail
 * comments matched as active syntax — same class as bc02-verify;
 * data-testid/keyframe names extracted as classes; animation:none
 * counted as keyframe reference).
 */
