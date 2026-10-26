// src/shared/lib/advisor-engine/nl-rule-parser.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Natural Language Rule Parser (F52)
//
// Deterministic parser for Spanish NL rules.
// No LLM — pure pattern matching with dictionaries.
//
// Pipeline:
//   1. Normalize text (lowercase, trim, remove accents)
//   2. Extract trigger ("cuando", "si")
//   3. Extract condition (metric + operator + threshold)
//   4. Extract action (verb + target)
//   5. Extract modifiers (priority, domain)
//   6. Build ParsedNLRule
//
// Metric dictionary: 15 known club metrics (Spanish aliases)
// Action dictionary: 8 action verbs → MCP tool mapping
// Operator dictionary: Spanish operator phrases
//
// If deterministic parse fails → returns null (caller uses LLM fallback)
//
// Depends on:
//   ./nl-rule-types (ParsedNLRule, NLCondition, NLAction, MetricDefinition)
//   ./mcp-tool-registry (for action → tool resolution)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  ParsedNLRule,
  NLCondition,
  NLAction,
  MetricDefinition,
  MetricResolver,
} from "./nl-rule-types";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";
import { hasTool, getToolsForIntent } from "./mcp-tool-registry";
import { callMCPTool } from "@/shared/lib/api";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — METRIC DICTIONARY
// ═══════════════════════════════════════════════════════════

const METRIC_DICTIONARY: MetricDefinition[] = [
  {
    names: ["churn", "abandono", "deserción", "desercion"],
    path: "summary.membership.churn_rate",
    unit: "%",
    domain: "engagement",
    reasonableMin: 0,
    reasonableMax: 50,
    description: "Tasa de abandono de socios",
  },
  {
    names: ["ingresos", "revenue", "facturación", "facturacion", "ventas"],
    path: "summary.financial.total_revenue",
    unit: "₡",
    domain: "financial",
    reasonableMin: 0,
    reasonableMax: 100_000_000,
    description: "Ingresos totales del club",
  },
  {
    names: ["satisfacción", "satisfaccion", "satisfaction", "nps"],
    path: "summary.operational.satisfaction_score",
    unit: "pts",
    domain: "satisfaction",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Score de satisfacción de socios",
  },
  {
    names: ["ocupación", "ocupacion", "occupancy", "capacidad"],
    path: "summary.operational.occupancy_rate",
    unit: "%",
    domain: "events",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Tasa de ocupación de eventos/instalaciones",
  },
  {
    names: ["asistencia", "attendance", "participación", "participacion"],
    path: "summary.operational.attendance_rate",
    unit: "%",
    domain: "events",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Tasa de asistencia a eventos",
  },
  {
    names: ["margen", "margin", "margen bruto"],
    path: "summary.financial.margin_pct",
    unit: "%",
    domain: "financial",
    reasonableMin: -50,
    reasonableMax: 100,
    description: "Margen bruto del club",
  },
  {
    names: ["retención", "retencion", "retention"],
    path: "summary.membership.retention_rate",
    unit: "%",
    domain: "engagement",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Tasa de retención de socios",
  },
  {
    names: ["anomalías", "anomalias", "anomalies", "alertas", "alerts"],
    path: "_computed.anomaly_count",
    unit: "count",
    domain: "global",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Número de anomalías detectadas",
  },
  {
    names: ["wellness", "bienestar", "salud"],
    path: "summary.operational.wellness_score",
    unit: "pts",
    domain: "satisfaction",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Score de bienestar del club",
  },
  {
    names: ["visitas", "visits", "invitados", "guests", "visitantes"],
    path: "summary.membership.guest_visits",
    unit: "count",
    domain: "engagement",
    reasonableMin: 0,
    reasonableMax: 10_000,
    description: "Visitas de invitados",
  },
  {
    names: ["socios", "members", "membresías", "membresias", "membresia"],
    path: "summary.membership.total_members",
    unit: "count",
    domain: "engagement",
    reasonableMin: 0,
    reasonableMax: 10_000,
    description: "Total de socios activos",
  },
  {
    names: ["eventos", "events"],
    path: "summary.operational.total_events",
    unit: "count",
    domain: "events",
    reasonableMin: 0,
    reasonableMax: 500,
    description: "Total de eventos",
  },
  {
    names: ["aprobaciones", "approvals", "pendientes", "pending"],
    path: "pendingApprovals",
    unit: "count",
    domain: "global",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Solicitudes pendientes de aprobación",
  },
  {
    names: ["riesgo", "risk", "riesgo sistémico", "riesgo sistemico"],
    path: "_computed.systemic_risk",
    unit: "pts",
    domain: "global",
    reasonableMin: 0,
    reasonableMax: 100,
    description: "Score de riesgo sistémico",
  },
  {
    names: ["gastos", "expenses", "costos", "costs"],
    path: "summary.financial.total_expenses",
    unit: "₡",
    domain: "financial",
    reasonableMin: 0,
    reasonableMax: 100_000_000,
    description: "Gastos totales del club",
  },
];

// Build fast lookup: accent-stripped name → MetricDefinition
const METRIC_LOOKUP = new Map<string, MetricDefinition>();
for (const metric of METRIC_DICTIONARY) {
  for (const name of metric.names) {
    METRIC_LOOKUP.set(stripAccents(name.toLowerCase()), metric);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — OPERATOR DICTIONARY
// ═══════════════════════════════════════════════════════════

const OPERATOR_MAP: Array<{ patterns: string[]; operator: NLCondition["operator"] }> = [
  { patterns: ["supere", "sea mayor a", "sea mayor que", "mayor a", "mayor que", "más de", "mas de", "pase de", "exceda", ">", "> que"], operator: ">" },
  { patterns: ["baje de", "sea menor a", "sea menor que", "menor a", "menor que", "menos de", "bajo", "<", "< que"], operator: "<" },
  { patterns: ["sea al menos", "sea mínimo", "sea minimo", "alcance", "mínimo", "minimo", ">="], operator: ">=" },
  { patterns: ["sea como máximo", "sea como maximo", "no supere", "máximo", "maximo", "<="], operator: "<=" },
  { patterns: ["sea igual a", "igual a", "llegue a", "alcance exactamente", "=="], operator: "==" },
  { patterns: ["no sea", "diferente de", "no alcance", "!="], operator: "!=" },
];

// Pre-flatten for fast lookup
const OPERATOR_LOOKUP = new Map<string, NLCondition["operator"]>();
for (const entry of OPERATOR_MAP) {
  for (const pattern of entry.patterns) {
    OPERATOR_LOOKUP.set(stripAccents(pattern.toLowerCase()), entry.operator);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — ACTION VERB DICTIONARY
// ═══════════════════════════════════════════════════════════

const ACTION_VERBS: Array<{
  verbs: string[];
  defaultServer: string;
  defaultTool: string;
  approvalLevel: "auto" | "semi" | "hitl";
  buildParams: (condition: NLCondition) => Record<string, unknown>;
}> = [
  {
    verbs: ["alertar", "alerta", "avisar", "notificar", "avisa"],
    defaultServer: "hitl",
    defaultTool: "approve_request",
    approvalLevel: "auto",
    buildParams: (c) => ({
      type: "nl_alert",
      metric: c.metric,
      operator: c.operator,
      threshold: c.threshold,
    }),
  },
  {
    verbs: ["crear", "crea", "generar", "genera", "producir"],
    defaultServer: "advisor_intelligence",
    defaultTool: "generate_action_plan",
    approvalLevel: "semi",
    buildParams: (c) => ({
      source: "nl_rule",
      metric: c.metric,
      operator: c.operator,
      threshold: c.threshold,
    }),
  },
  {
    verbs: ["reportar", "reporta", "informar", "informa"],
    defaultServer: "executive_dashboard",
    defaultTool: "export_report",
    approvalLevel: "semi",
    buildParams: (c) => ({
      report_type: "nl_rule_alert",
      metric: c.metric,
      threshold: c.threshold,
    }),
  },
  {
    verbs: ["restringir", "restringe", "bloquear", "bloquea", "suspender", "suspende"],
    defaultServer: "hitl",
    defaultTool: "approve_request",
    approvalLevel: "hitl",
    buildParams: (c) => ({
      type: "restriction",
      metric: c.metric,
      threshold: c.threshold,
    }),
  },
  {
    verbs: ["ajustar", "ajusta", "modificar", "modifica", "cambiar", "cambia"],
    defaultServer: "executive_dashboard",
    defaultTool: "export_report",
    approvalLevel: "semi",
    buildParams: (c) => ({
      type: "adjustment",
      metric: c.metric,
      threshold: c.threshold,
    }),
  },
];

// Flatten for fast lookup
const ACTION_VERB_LOOKUP = new Map<string, typeof ACTION_VERBS[number]>();
for (const entry of ACTION_VERBS) {
  for (const verb of entry.verbs) {
    ACTION_VERB_LOOKUP.set(stripAccents(verb.toLowerCase()), entry);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — PRIORITY DICTIONARY
// ═══════════════════════════════════════════════════════════

const PRIORITY_MAP: Array<{ patterns: string[]; impact: AdvisorImpactLevel }> = [
  { patterns: ["crítica", "critica", "crítico", "critico", "urgente", "emergencia"], impact: "high" },
  { patterns: ["alta", "alto", "importante", "grave"], impact: "high" },
  { patterns: ["media", "medio", "moderada", "moderado"], impact: "medium" },
  { patterns: ["baja", "bajo", "menor", "leve", "informativa"], impact: "low" },
];

const PRIORITY_LOOKUP = new Map<string, AdvisorImpactLevel>();
for (const entry of PRIORITY_MAP) {
  for (const pattern of entry.patterns) {
    PRIORITY_LOOKUP.set(stripAccents(pattern.toLowerCase()), entry.impact);
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — TRIGGER WORDS
// ═══════════════════════════════════════════════════════════

const TRIGGER_WORDS = ["cuando", "si ", "cada vez que", "en caso de que"];

// ═══════════════════════════════════════════════════════════
// SECTION 6 — MAIN PARSER
// ═══════════════════════════════════════════════════════════

/**
 * Parse a natural language rule into a structured ParsedNLRule.
 *
 * Returns null if the parser cannot confidently extract
 * a condition + action from the text. The caller should
 * then use LLM fallback.
 *
 * @param text — The NL rule text (Spanish)
 * @param createdBy — Who wrote this rule
 * @returns ParsedNLRule or null
 */
export function parseNLRule(
  text: string,
  _createdBy: string = "manager",
): ParsedNLRule | null {
  const normalized = stripAccents(text.toLowerCase().trim());

  // Step 1: Extract condition block
  const conditionText = extractConditionBlock(normalized, text);
  if (!conditionText) return null;

  // Step 2: Extract metric
  const metric = matchMetric(conditionText);
  if (!metric) return null;

  // Step 3: Extract operator
  const operator = matchOperator(conditionText);
  if (!operator) return null;

  // Step 4: Extract threshold number
  const threshold = extractNumber(conditionText);
  if (threshold === null) return null;

  // Step 5: Validate threshold is reasonable
  const parseConfidence = computeParseConfidence(metric, operator, threshold);

  // Step 6: Extract action block (everything after condition)
  const actionText = extractActionBlock(normalized, text);
  const action = actionText
    ? matchActionVerb(actionText)
    : getDefaultAction(metric.domain);

  // Step 7: Extract priority modifier
  const impact = extractPriority(text) ?? "medium";

  // Step 8: Build suggested title
  const operatorDisplay = reverseOperator(operator);
  const suggestedTitle = `${metric.names[0]} ${operatorDisplay} ${threshold}${metric.unit}`;

  // Step 9: Build condition
  const condition: NLCondition = {
    metric: metric.path,
    operator,
    threshold,
    unit: metric.unit,
    domain: metric.domain,
    parseConfidence,
  };

  return {
    originalText: text,
    strategy: "deterministic",
    conditions: [condition],
    action,
    parseConfidence,
    impact,
    suggestedTitle: capitalizeFirst(suggestedTitle),
    domain: metric.domain,
    canDeriveGoal: impact === "high" || impact === "medium",
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — RUNTIME METRIC RESOLVER
// ═══════════════════════════════════════════════════════════

/**
 * Resolve a metric value from an Advisor context at runtime.
 * Uses dot-notation path with safe navigation.
 *
 * Special paths prefixed with "_computed" are handled separately.
 *
 * @param ctx — The Advisor context (any domain's BaseContext)
 * @param metricPath — Dot-notation path (e.g., "summary.financial.total_revenue")
 * @returns The metric value or null if not found
 */
export const resolveMetric: MetricResolver = (
  ctx: Record<string, unknown>,
  metricPath: string,
): number | null => {
  // Handle computed metrics
  if (metricPath.startsWith("_computed.")) {
    return resolveComputedMetric(ctx, metricPath.replace("_computed.", ""));
  }

  // Navigate dot-notation path safely
  const parts = metricPath.split(".");
  let current: unknown = ctx;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "number" ? current : null;
};

/**
 * Get all metric definitions (for UI help/dropdown).
 */
export function getAllMetrics(): MetricDefinition[] {
  return [...METRIC_DICTIONARY];
}

/**
 * Search metrics by partial name.
 */
export function searchMetrics(query: string): MetricDefinition[] {
  const normalized = stripAccents(query.toLowerCase());
  return METRIC_DICTIONARY.filter((m) =>
    m.names.some((n) => stripAccents(n.toLowerCase()).includes(normalized)),
  );
}

/**
 * Get the metric definition for a path.
 */
export function getMetricByPath(path: string): MetricDefinition | undefined {
  return METRIC_DICTIONARY.find((m) => m.path === path);
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract the condition block from the text.
 * Looks for trigger word ("cuando", "si") and extracts until
 * the action separator (",", " entonces", " crear", etc.)
 */
function extractConditionBlock(
  normalized: string,
  _original: string,
): string | null {
  // Find trigger word
  let conditionStart = -1;
  for (const trigger of TRIGGER_WORDS) {
    const idx = normalized.indexOf(trigger);
    if (idx !== -1) {
      conditionStart = idx + trigger.length;
      break;
    }
  }

  if (conditionStart === -1) return null;

  // Extract until separator
  const afterTrigger = normalized.slice(conditionStart).trim();

  // Common separators between condition and action
  const separators = [
    ", entonces",
    ", crear",
    ", generar",
    ", alertar",
    ", notificar",
    ", reportar",
    ", informar",
    ", enviar",
    ", crear una",
    ", se debe",
    ", hay que",
    ", debería",
    ", deberia",
    ", entonces hay",
    " entonces ",
    ", ",
  ];

  let conditionBlock = afterTrigger;
  for (const sep of separators) {
    const idx = afterTrigger.indexOf(sep);
    if (idx > 0) {
      conditionBlock = afterTrigger.slice(0, idx).trim();
      break;
    }
  }

  return conditionBlock.length > 2 ? conditionBlock : null;
}

/**
 * Extract the action block (everything after condition separator).
 */
function extractActionBlock(
  normalized: string,
  _original: string,
): string | null {
  // Find common action starters
  const actionStarters = [
    "alertar", "notificar", "avisar", "crear", "generar",
    "reportar", "informar", "restringir", "ajustar", "enviar",
    "bloquear", "suspender", "modificar", "cambiar", "producir",
  ];

  for (const starter of actionStarters) {
    const idx = normalized.indexOf(starter);
    if (idx > 0) return normalized.slice(idx);
  }

  return null;
}

/**
 * Match a metric from the condition text.
 */
function matchMetric(text: string): MetricDefinition | null {
  // Try longest match first (more specific wins)
  const words = text.split(/\s+/);
  for (let len = words.length; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      const found = METRIC_LOOKUP.get(phrase);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Match an operator from the condition text.
 */
function matchOperator(text: string): NLCondition["operator"] | null {
  // Try longest match first
  for (const [, entry] of OPERATOR_MAP.entries()) {
    for (const pattern of entry.patterns) {
      if (text.includes(pattern)) return entry.operator;
    }
  }
  return null;
}

/**
 * Extract a number from text.
 * Handles: "8%", "₡5,000,000", "50 puntos", "3 eventos", plain "42"
 */
function extractNumber(text: string): number | null {
  // Remove currency symbols and thousand separators
  const cleaned = text
    .replace(/[₡$]/g, "")
    .replace(/,/g, "");

  // Match number patterns: "8", "8.5", "5000000"
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

/**
 * Match an action verb from the action text.
 */
function matchActionVerb(text: string): NLAction {
  const words = text.split(/\s+/);
  for (const word of words) {
    const entry = ACTION_VERB_LOOKUP.get(word);
    if (entry) {
      // Check if tool actually exists, try alternatives
      let server = entry.defaultServer;
      let tool = entry.defaultTool;
      if (!hasTool(server, tool)) {
        const alternatives = getToolsForIntent("global", "execute");
        if (alternatives.length > 0) {
          server = alternatives[0].server;
          tool = alternatives[0].tool;
        }
      }

      // Extract target (word after verb)
      const verbIdx = words.indexOf(word);
      const target = words.slice(verbIdx + 1).join(" ") || "sistema";

      return {
        verb: word,
        target,
        server,
        tool,
        approvalLevel: entry.approvalLevel,
        buildParams: entry.buildParams,
      };
    }
  }

  // Default action
  return getDefaultAction("global");
}

/**
 * Default action when no verb is detected.
 */
function getDefaultAction(_domain: AIDomain | "global"): NLAction {
  return {
    verb: "alertar",
    target: "sistema",
    server: "hitl",
    tool: "approve_request",
    approvalLevel: "auto",
    buildParams: (c) => ({
      type: "nl_default_alert",
      metric: c.metric,
      operator: c.operator,
      threshold: c.threshold,
    }),
  };
}

/**
 * Extract priority from text.
 */
function extractPriority(text: string): AdvisorImpactLevel | null {
  const normalized = stripAccents(text.toLowerCase());
  for (const entry of PRIORITY_MAP) {
    for (const pattern of entry.patterns) {
      if (normalized.includes(pattern)) return entry.impact;
    }
  }
  return null;
}

/**
 * Compute parse confidence based on how clearly
 * the metric, operator, and threshold were detected.
 */
function computeParseConfidence(
  metric: MetricDefinition,
  _operator: NLCondition["operator"],
  threshold: number,
): number {
  let confidence = 0.7; // Base: metric found

  // Metric is well-known
  if (metric.names.length > 2) confidence += 0.1;

  // Operator is clear
  confidence += 0.1;

  // Threshold is within reasonable range
  if (threshold >= metric.reasonableMin && threshold <= metric.reasonableMax) {
    confidence += 0.1;
  }

  return Math.min(1, confidence);
}

/**
 * Reverse operator for display.
 */
function reverseOperator(op: NLCondition["operator"]): string {
  const map: Record<NLCondition["operator"], string> = {
    ">": "supera",
    "<": "baja de",
    ">=": "al menos",
    "<=": "máximo",
    "==": "igual a",
    "!=": "diferente de",
  };
  return map[op] ?? op;
}

/**
 * Resolve computed metrics (not directly on context).
 */
function resolveComputedMetric(
  ctx: Record<string, unknown>,
  key: string,
): number | null {
  switch (key) {
    case "anomaly_count": {
      // Count active anomaly signals
      const signals = (ctx as { signals?: Array<{ type: string }> }).signals;
      if (!Array.isArray(signals)) return null;
      return signals.filter((s) => s.type?.includes("anomal")).length;
    }
    case "systemic_risk": {
      // Look for systemic risk in insights or compute from signals
      const signals = (ctx as { signals?: Array<{ type: string; severity: string }> }).signals;
      if (!Array.isArray(signals)) return 50;
      const highSeverity = signals.filter(
        (s) => s.severity === "high" || s.severity === "critical",
      ).length;
      return Math.min(100, 50 + highSeverity * 10);
    }
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — LLM FALLBACK (F57-B6)
// ═══════════════════════════════════════════════════════════

/** Structured JSON schema for LLM NL parsing response */
interface LLMNLParseResponse {
  metric: string | null;
  operator: string | null;
  threshold: number | null;
  action_verb: string | null;
  priority: string | null;
  domain: string | null;
  confidence: number;
}

/**
 * Parse a natural language rule with LLM fallback.
 *
 * Pipeline:
 *   1. Try deterministic parse (0 tokens, <1ms)
 *   2. If null → call ask_advisor with structured prompt
 *   3. Parse JSON response → convert to ParsedNLRule
 *
 * @param text — The NL rule text (Spanish)
 * @param createdBy — Who wrote this rule
 * @returns ParsedNLRule or null (both strategies failed)
 */
export async function parseNLRuleWithLLMFallback(
  text: string,
  createdBy: string = "manager",
): Promise<ParsedNLRule | null> {
  // Step 1: Deterministic (fast path)
  const deterministicResult = parseNLRule(text, createdBy);
  if (deterministicResult) return deterministicResult;

  // Step 2: LLM fallback
  try {
    const metricNames = METRIC_DICTIONARY.map((m) =>
      `  - ${m.names.join(", ")} → path: "${m.path}", unit: "${m.unit}", domain: "${m.domain}"`,
    ).join("\n");

    const prompt = `Analiza esta regla de negocio en español para un club privado de Costa Rica.
Extrae: metric, operator, threshold, action_verb, priority, domain.

Regla: "${text}"

Métricas conocidas:
${metricNames}

Operadores: >, <, >=, <=, ==, !=
Prioridades: high, medium, low
Dominios: financial, events, engagement, satisfaction, sports, communication, family, ml_intelligence, global

Responde SOLO con JSON (sin markdown, sin explicaciones):
{"metric":"path","operator":"op","threshold":number,"action_verb":"verb","priority":"level","domain":"domain","confidence":0.0-1.0}

Si no podés extraer algún campo, usá null.`;

    const response = await callMCPTool<{ answer?: string }>(
      "advisor_intelligence",
      "ask_advisor",
      {
        question: prompt,
        role: "system",
      },
    );

    if (!response?.answer) return null;

    // Parse JSON from response (handle ```json blocks)
    const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as LLMNLParseResponse;
    if (!parsed.metric || !parsed.operator || parsed.threshold === null) {
      return null;
    }

    // Resolve metric from dictionary
    const metric =
      METRIC_DICTIONARY.find((m) => m.path === parsed.metric) ??
      METRIC_DICTIONARY.find((m) =>
        m.names.some((n) => n.toLowerCase() === parsed.metric?.toLowerCase()),
      );
    if (!metric) return null;

    // Validate operator
    const validOperators = [">", "<", ">=", "<=", "==", "!="];
    const operator = validOperators.includes(parsed.operator)
      ? (parsed.operator as NLCondition["operator"])
      : ">";
    if (!operator) return null;

    // Build action
    const actionVerb = parsed.action_verb ?? "alertar";
    const actionEntry = ACTION_VERB_LOOKUP.get(stripAccents(actionVerb.toLowerCase()));
    const action: NLAction = actionEntry
      ? {
          verb: actionVerb,
          target: metric.names[0],
          server: actionEntry.defaultServer,
          tool: actionEntry.defaultTool,
          approvalLevel: actionEntry.approvalLevel,
          buildParams: actionEntry.buildParams,
        }
      : getDefaultAction(metric.domain);

    // Build condition
    const condition: NLCondition = {
      metric: metric.path,
      operator,
      threshold: parsed.threshold,
      unit: metric.unit,
      domain: metric.domain,
      parseConfidence: parsed.confidence ?? 0.6,
    };

    const impact: AdvisorImpactLevel =
      parsed.priority === "high" ? "high"
      : parsed.priority === "low" ? "low"
      : "medium";

    const operatorDisplay = reverseOperator(operator);
    const suggestedTitle = capitalizeFirst(
      `${metric.names[0]} ${operatorDisplay} ${parsed.threshold}${metric.unit}`,
    );

    if (import.meta.env.DEV) {
      console.log(
        `[NL Parser] LLM strategy used for: "${text}" → confidence: ${parsed.confidence}`,
      );
    }

    return {
      originalText: text,
      strategy: "llm",
      conditions: [condition],
      action,
      parseConfidence: parsed.confidence ?? 0.6,
      impact,
      suggestedTitle,
      domain: metric.domain,
      canDeriveGoal: impact === "high" || impact === "medium",
    };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[NL Parser] LLM fallback failed:", e);
    }
    return null;
  }
}