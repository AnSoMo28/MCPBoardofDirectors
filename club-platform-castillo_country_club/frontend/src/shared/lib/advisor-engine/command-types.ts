// src/shared/lib/advisor-engine/command-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Command Interface Types (F54)
//
// Types for the NL Command Interface — a structured command
// system where club managers interact with the AI platform
// through natural language commands (not a chatbot).
//
// 7 command types cover ~95% of manager interactions:
//   QUERY      → resolve a metric value
//   ANALYSIS   → explain why something happened (causal chains)
//   SIMULATION → what-if scenario (F53 delta-simulator)
//   ACTION     → execute an MCP tool (with HITL if needed)
//   RULE       → create/manage NL rules (F52)
//   GOAL       → derive a goal from a target (F51)
//   REPORT     → generate executive reports
//
// Each command has:
//   - Structured intent (parsed from NL)
//   - Rich card response (not plain text)
//   - Confidence score
//   - Action capability (some commands trigger HITL)
//
// Multi-turn context: last 10 turns stored for follow-ups.
//
// Depends on:
//   ./twin-types (DeltaScenario)
//   ./nl-rule-types (ParsedNLRule)
//   ./intent-types (AdvisorGoal)
//   @/shared/types/ai-intelligence (AIDomain, AdvisorImpactLevel)
// ═══════════════════════════════════════════════════════════

import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";
import type { DeltaScenario } from "./twin-types";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — COMMAND INTENT TYPES
// ═══════════════════════════════════════════════════════════

/**
 * The 7 command types the system supports.
 */
export type CommandType =
  | "query"
  | "analysis"
  | "simulation"
  | "action"
  | "rule"
  | "goal"
  | "report";

/**
 * Confidence in the parsed intent.
 */
export type CommandConfidence = "high" | "medium" | "low";

/**
 * Display config for command types.
 */
export const COMMAND_TYPE_CONFIG: Record<
  CommandType,
  { label: string; color: string; icon: string; description: string }
> = {
  query: {
    label: "Consulta",
    color: "var(--color-teal-400)",
    icon: "Search",
    description: "Consultar valor de una métrica",
  },
  analysis: {
    label: "Análisis",
    color: "var(--color-amber-400)",
    icon: "BarChart3",
    description: "Analizar por qué algo sucedió",
  },
  simulation: {
    label: "Simulación",
    color: "var(--color-gold-400)",
    icon: "Play",
    description: "Simular escenario what-if",
  },
  action: {
    label: "Acción",
    color: "var(--color-rose-400)",
    icon: "Zap",
    description: "Ejecutar acción en el sistema",
  },
  rule: {
    label: "Regla",
    color: "var(--color-emerald-400)",
    icon: "Rule",
    description: "Crear o gestionar reglas",
  },
  goal: {
    label: "Meta",
    color: "var(--color-gold-400)",
    icon: "Target",
    description: "Definir o consultar metas",
  },
  report: {
    label: "Reporte",
    color: "var(--color-silver-300)",
    icon: "FileText",
    description: "Generar reporte ejecutivo",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 2 — PARSED COMMAND INTENT
// ═══════════════════════════════════════════════════════════

/**
 * A parsed command intent — the structured representation
 * of what the manager wants to do.
 */
export interface CommandIntent {
  /** Command type detected */
  type: CommandType;
  /** Confidence in this parse */
  confidence: CommandConfidence;
  /** Parsed confidence numeric (0-100) */
  confidenceScore: number;
  /** Which domain is targeted */
  domain: AIDomain | "global";
  /** Metrics referenced (for queries/analysis) */
  metrics: string[];
  /** Time range if specified ("último mes", "este trimestre") */
  timeRange?: TimeRange;
  /** Comparison target if specified ("vs año pasado") */
  comparisonTarget?: string;
  /** Parsed scenario for simulation commands */
  scenario?: Partial<DeltaScenario>;
  /** Parsed rule text for rule commands */
  ruleText?: string;
  /** Target value for goal commands */
  goalTarget?: { metric: string; value: number; unit: string; deadline?: string };
  /** MCP tool to invoke for action commands */
  mcpAction?: { server: string; tool: string; params: Record<string, unknown> };
  /** Report type for report commands */
  reportType?: string;
}

/**
 * Time range extracted from NL text.
 */
export interface TimeRange {
  /** Start date (ISO) or relative expression */
  from: string;
  /** End date (ISO) or "today" */
  to: string;
  /** Human-readable label */
  label: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — COMMAND RESPONSE TYPES
// ═══════════════════════════════════════════════════════════

/**
 * The type of response card to render.
 */
export type ResponseCardType =
  | "metric_value"
  | "insight_list"
  | "cascade_viz"
  | "simulation_result"
  | "action_confirmation"
  | "rule_created"
  | "goal_created"
  | "report_preview"
  | "error"
  | "clarification_needed";

/**
 * A single response from the command interface.
 */
export interface CommandResponse {
  /** Response ID */
  id: string;
  /** What type of card to render */
  cardType: ResponseCardType;
  /** The intent that produced this response */
  intent: CommandIntent;
  /** Plain text summary (for accessibility/fallback) */
  textSummary: string;
  /** Rich data for the card renderer */
  data: CommandResponseData;
  /** Parse strategy used */
  parseStrategy: "deterministic" | "llm";
  /** Execution time in ms */
  executionMs: number;
  /** Can the user take action on this response? */
  actionable: boolean;
  /** Available follow-up commands */
  suggestedFollowups: string[];
  /** Timestamp */
  timestamp: number;
}

/**
 * Union of all possible response data shapes.
 * Discriminated by CommandResponse.cardType.
 */
export type CommandResponseData =
  | MetricValueData
  | InsightListData
  | SimulationResultData
  | ActionConfirmationData
  | RuleCreatedData
  | GoalCreatedData
  | ReportPreviewData
  | ErrorData
  | ClarificationData;

export interface MetricValueData {
  type: "metric_value";
  metricName: string;
  metricPath: string;
  value: number;
  unit: string;
  domain: AIDomain | "global";
  /** Trend vs previous period */
  trend?: { direction: "up" | "down" | "flat"; delta: number; deltaPct: number };
  /** Context: where does this rank? */
  context?: { min: number; max: number; avg: number; percentile: number };
}

export interface InsightListData {
  type: "insight_list";
  domain: AIDomain | "global";
  insights: Array<{
    id: string;
    title: string;
    description: string;
    impact: AdvisorImpactLevel;
    confidence: number;
  }>;
  totalCount: number;
  /** Causal chains that explain these insights */
  causalChains?: Array<{
    name: string;
    description: string;
    confidence: number;
  }>;
}

export interface SimulationResultData {
  type: "simulation_result";
  /** The scenario that was simulated */
  scenarioName: string;
  /** Verdict */
  verdict: string;
  verdictAssessment: "positive" | "neutral" | "negative" | "mixed";
  /** Key predictions */
  predictions: Array<{
    metricName: string;
    current: number;
    predicted: number;
    delta: number;
    unit: string;
    confidence: number;
  }>;
  /** Recommendation */
  recommendation: string;
  /** Has full result available? */
  hasFullResult: boolean;
}

export interface ActionConfirmationData {
  type: "action_confirmation";
  /** What action was/will be executed */
  actionDescription: string;
  /** Server + tool */
  server: string;
  tool: string;
  /** Approval level required */
  approvalLevel: "auto" | "semi" | "hitl";
  /** Was it executed? Or pending approval? */
  status: "executed" | "pending_approval" | "awaiting_confirmation";
  /** Result if already executed */
  result?: unknown;
}

export interface RuleCreatedData {
  type: "rule_created";
  /** The parsed rule */
  ruleText: string;
  /** Status after validation */
  valid: boolean;
  /** Validation issues */
  issues: Array<{ severity: string; message: string }>;
  /** Rule ID if saved */
  ruleId?: string;
}

export interface GoalCreatedData {
  type: "goal_created";
  /** Goal title */
  title: string;
  /** Target metric */
  metricName: string;
  /** Current value */
  currentValue: number;
  /** Target value */
  targetValue: number;
  /** Unit */
  unit: string;
  /** Deadline */
  deadline?: string;
  /** Was it derived? */
  status: "created" | "suggested" | "already_exists";
}

export interface ReportPreviewData {
  type: "report_preview";
  /** Report type */
  reportType: string;
  /** Report title */
  title: string;
  /** Key metrics summary */
  keyMetrics: Array<{
    name: string;
    value: string;
    trend?: string;
  }>;
  /** Has full report available? */
  hasFullReport: boolean;
  /** MCP tool that generates it */
  toolServer?: string;
  toolName?: string;
}

export interface ErrorData {
  type: "error";
  /** What went wrong */
  errorMessage: string;
  /** Error code */
  errorCode: "parse_failed" | "metric_not_found" | "tool_unavailable" | "permission_denied" | "unknown";
  /** Suggestion for the user */
  suggestion: string;
}

export interface ClarificationData {
  type: "clarification_needed";
  /** What the system understood */
  partialIntent: Partial<CommandIntent>;
  /** What's missing */
  missingInfo: string[];
  /** Options to present to the user */
  options: Array<{
    label: string;
    description: string;
    /** The intent this option would resolve to */
    resolvedIntent: Partial<CommandIntent>;
  }>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CONVERSATION CONTEXT (multi-turn)
// ═══════════════════════════════════════════════════════════

/**
 * A single turn in the conversation.
 */
export interface ConversationTurn {
  /** Turn ID */
  id: string;
  /** The user's command text */
  userText: string;
  /** Parsed intent */
  intent: CommandIntent;
  /** System response */
  response: CommandResponse;
  /** Timestamp */
  timestamp: number;
}

/**
 * The full conversation state.
 */
export interface ConversationState {
  /** All turns (newest first) */
  turns: ConversationTurn[];
  /** Currently referenced metric (for follow-ups) */
  activeMetric?: string;
  /** Currently referenced domain */
  activeDomain?: AIDomain | "global";
  /** Currently referenced time range */
  activeTimeRange?: TimeRange;
  /** Last simulation result (for follow-ups like "y si aumento más?") */
  lastSimulation?: DeltaScenario;
  /** Is the system processing a command? */
  isProcessing: boolean;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — COMMAND PARSER RESULT
// ═══════════════════════════════════════════════════════════

/**
 * Result of parsing a command string.
 */
export interface CommandParseResult {
  /** The parsed intent */
  intent: CommandIntent | null;
  /** Parse strategy used */
  strategy: "deterministic" | "llm";
  /** Parse confidence */
  confidence: number;
  /** Did parsing succeed? */
  success: boolean;
  /** Error message if parsing failed */
  error?: string;
  /** Suggestions for the user if parse was ambiguous */
  suggestions?: string[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — PATTERN DEFINITIONS (deterministic matching)
// ═══════════════════════════════════════════════════════════

/**
 * A command pattern for deterministic parsing.
 * Maps NL text patterns to CommandIntents.
 */
export interface CommandPattern {
  /** Unique pattern ID */
  id: string;
  /** Command type this pattern produces */
  type: CommandType;
  /** NL trigger phrases (accent-stripped, lowercase) */
  triggers: string[];
  /** Domain hint (if domain-specific) */
  domain?: AIDomain | "global";
  /** Confidence when this pattern matches */
  confidence: CommandConfidence;
  /** Confidence score (0-100) */
  confidenceScore: number;
  /** Does this pattern need a metric to be complete? */
  requiresMetric: boolean;
  /** Does this pattern need a number to be complete? */
  requiresNumber: boolean;
  /** Custom resolver (builds intent parts beyond type) */
  resolve: (
    text: string,
    normalized: string,
    metrics: string[],
    numbers: number[],
  ) => Partial<CommandIntent>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — LLM FALLBACK TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Request sent to backend for LLM-assisted command parsing.
 */
export interface LLMCommandParseRequest {
  /** The command text */
  text: string;
  /** Conversation context (last 3 turns for follow-up resolution) */
  recentTurns: Array<{ user: string; intent: string }>;
  /** Available metrics */
  availableMetrics: string[];
  /** Available actions */
  availableActions: string[];
  /** Active metric/domain from conversation context */
  contextHints: {
    activeMetric?: string;
    activeDomain?: string;
    lastSimulation?: string;
  };
}

/**
 * Response from backend LLM command parsing.
 */
export interface LLMCommandParseResponse {
  success: boolean;
  intent?: {
    type: CommandType;
    domain: string;
    metrics: string[];
    timeRange?: { from: string; to: string; label: string };
    scenario?: { deltas: Array<{ metric: string; deltaPct: number }> };
    ruleText?: string;
    goalTarget?: { metric: string; value: number; unit: string };
    action?: { server: string; tool: string };
    reportType?: string;
  };
  confidence: number;
  reasoning: string;
  error?: string;
}