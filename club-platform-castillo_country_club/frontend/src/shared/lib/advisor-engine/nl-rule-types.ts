// src/shared/lib/advisor-engine/nl-rule-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Natural Language Rule Types (F52)
//
// Types for the NL Rule Authoring system. Club managers
// write rules in Spanish natural language. The system
// parses, validates, and converts them into executable
// RuleDefinitions compatible with the Advisor Engine.
//
// Two parsing strategies:
//   1. Deterministic (primary) — pattern matching, 0 tokens
//   2. LLM-assisted (fallback) — for complex phrases
//
// Custom rules integrate with:
//   - F50: calibration (accuracy tracking)
//   - F51: goal derivation (NL rules can create goals)
//   - F49: signal emission (NL rules can emit signals)
//
// Depends on:
//   ./types (BaseContext, AdvisorImpactLevel)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — NL RULE LIFECYCLE
// ═══════════════════════════════════════════════════════════

/**
 * Status of a custom NL rule.
 *
 * draft     → just created, not yet validated
 * active    → validated and injected into the engine
 * paused    → temporarily disabled by user
 * errored   → validation failed or runtime error
 * calibrated → has enough outcomes for confidence calibration
 */
export type NLRuleStatus =
  | "draft"
  | "active"
  | "paused"
  | "errored"
  | "calibrated";

/**
 * Which parsing strategy produced this rule.
 */
export type ParseStrategy = "deterministic" | "llm";

// ═══════════════════════════════════════════════════════════
// SECTION 2 — NL RULE TEMPLATE (user input)
// ═══════════════════════════════════════════════════════════

/**
 * The raw NL rule as written by the manager.
 * Stored in localStorage. The source of truth for custom rules.
 */
export interface NLRuleTemplate {
  /** Unique rule ID */
  id: string;
  /** The natural language text written by the manager */
  text: string;
  /** Which domain this rule targets (auto-detected or manual) */
  domain: AIDomain | "global";
  /** Current status */
  status: NLRuleStatus;
  /** Who created this rule */
  createdBy: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** How many times this rule has been evaluated */
  evaluationCount: number;
  /** How many times the condition was true */
  triggerCount: number;
  /** Which parsing strategy was used */
  parseStrategy: ParseStrategy;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — PARSED CONDITION
// ═══════════════════════════════════════════════════════════

/**
 * A single condition extracted from NL text.
 * Multiple conditions are combined with AND (MVP).
 *
 * Example: "churn supere 8%"
 *   → { metric: "churnRate", operator: ">", threshold: 8, unit: "%" }
 */
export interface NLCondition {
  /** Metric name (resolved from dictionary) */
  metric: string;
  /** Comparison operator */
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  /** Numeric threshold */
  threshold: number;
  /** Unit of measurement */
  unit: string;
  /** Domain this metric belongs to */
  domain: AIDomain | "global";
  /** Confidence in this parse (0-1) */
  parseConfidence: number;
}

/**
 * A parsed action extracted from NL text.
 *
 * Example: "alertar al gerente con prioridad alta"
 *   → { verb: "alertar", target: "gerente", server: "hitl", tool: "create_alert" }
 */
export interface NLAction {
  /** Action verb detected */
  verb: string;
  /** Who/what to target */
  target: string;
  /** MCP server to call */
  server: string;
  /** MCP tool to call */
  tool: string;
  /** Approval level for this action */
  approvalLevel: "auto" | "semi" | "hitl";
  /** Build params from condition context */
  buildParams: (condition: NLCondition) => Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — PARSED RULE (structured output)
// ═══════════════════════════════════════════════════════════

/**
 * The structured output of parsing an NL rule.
 * This is the intermediate representation before validation
 * and conversion to a RuleDefinition.
 */
export interface ParsedNLRule {
  /** Original NL text */
  originalText: string;
  /** Parsing strategy used */
  strategy: ParseStrategy;
  /** Conditions extracted (AND-combined) */
  conditions: NLCondition[];
  /** Action extracted */
  action: NLAction;
  /** Overall parse confidence (average of conditions) */
  parseConfidence: number;
  /** Detected impact level */
  impact: AdvisorImpactLevel;
  /** Suggested rule title (generated from conditions) */
  suggestedTitle: string;
  /** Detected domain */
  domain: AIDomain | "global";
  /** Can this rule trigger goal derivation? */
  canDeriveGoal: boolean;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — VALIDATION RESULT
// ═══════════════════════════════════════════════════════════

/**
 * Severity of a validation issue.
 */
export type ValidationSeverity = "error" | "warning" | "info";

/**
 * A single validation issue.
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  /** Which part of the rule this relates to */
  location: "condition" | "action" | "general";
  /** Index of the condition (if applicable) */
  conditionIndex?: number;
}

/**
 * Result of validating a parsed NL rule.
 */
export interface NLRuleValidationResult {
  /** Is the rule valid? (no errors) */
  valid: boolean;
  /** All issues found */
  issues: ValidationIssue[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Suggested fixes (auto-generated) */
  suggestions: string[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — METRIC DICTIONARY
// ═══════════════════════════════════════════════════════════

/**
 * A known metric that managers can reference in NL rules.
 */
export interface MetricDefinition {
  /** Display name (Spanish) — what the manager writes */
  names: string[];
  /** Data path for runtime access */
  path: string;
  /** Unit of measurement */
  unit: string;
  /** Which domain this metric belongs to */
  domain: AIDomain | "global";
  /** Reasonable min/max for validation */
  reasonableMin: number;
  reasonableMax: number;
  /** Description for UI help */
  description: string;
}

/**
 * Runtime metric resolver function type.
 * Takes a context object and a metric path, returns the current value.
 */
export type MetricResolver = (
  ctx: Record<string, unknown>,
  metricPath: string,
) => number | null;

// ═══════════════════════════════════════════════════════════
// SECTION 7 — LLM FALLBACK TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Request sent to backend for LLM-assisted parsing.
 */
export interface LLMParseRequest {
  /** The NL text to parse */
  text: string;
  /** Available metrics for context */
  availableMetrics: string[];
  /** Available actions for context */
  availableActions: string[];
  /** Language hint */
  language: "es" | "en";
}

/**
 * Response from backend LLM parsing.
 */
export interface LLMParseResponse {
  /** Did the LLM successfully parse? */
  success: boolean;
  /** Parsed conditions */
  conditions?: Array<{
    metric: string;
    operator: string;
    threshold: number;
    unit: string;
  }>;
  /** Parsed action */
  action?: {
    verb: string;
    target: string;
    server: string;
    tool: string;
    approvalLevel: string;
  };
  /** LLM's confidence in its parse */
  confidence: number;
  /** LLM's explanation of its interpretation */
  reasoning: string;
  /** Error message if parse failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — DISPLAY CONFIG
// ═══════════════════════════════════════════════════════════

export const NL_RULE_STATUS_CONFIG: Record<
  NLRuleStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: "Borrador",
    color: "var(--color-silver-400)",
    bgColor: "rgba(255,255,255,0.04)",
  },
  active: {
    label: "Activa",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  paused: {
    label: "Pausada",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
  },
  errored: {
    label: "Error",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
  },
  calibrated: {
    label: "Calibrada",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
};

export const PARSE_STRATEGY_CONFIG: Record<
  ParseStrategy,
  { label: string; color: string; description: string }
> = {
  deterministic: {
    label: "Determinístico",
    color: "var(--color-teal-400)",
    description: "Parseo por patrones — 100% auditable, 0 tokens",
  },
  llm: {
    label: "IA Asistida",
    color: "var(--color-gold-400)",
    description: "Parseo con IA — flexible, requiere backend",
  },
};