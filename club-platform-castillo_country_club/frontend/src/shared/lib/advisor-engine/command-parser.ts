// src/shared/lib/advisor-engine/command-parser.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Command Parser (F54)
//
// Deterministic parser for NL commands from club managers.
// Maps Spanish natural language to structured CommandIntents.
//
// Pipeline:
//   1. Normalize text (lowercase, strip accents, trim)
//   2. Resolve follow-ups from conversation context
//   3. Try pattern matching against 30 command patterns
//   4. Extract metrics (reuses F52 dictionary)
//   5. Extract numbers, time ranges, domain hints
//   6. Build CommandIntent
//   7. If no match → return null (caller uses LLM fallback)
//
// 7 command types × ~4-5 patterns each = ~30 patterns.
// Coverage target: ~90% of real manager commands.
//
// Depends on:
//   ./command-types (CommandIntent, CommandType, ConversationState, etc.)
//   ./nl-rule-parser (stripAccents, getAllMetrics, resolveMetric, getMetricByPath)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  CommandIntent,
  CommandParseResult,
  CommandPattern,
  ConversationState,
  TimeRange,
} from "./command-types";
import type { DeltaScenario } from "./twin-types";
import {
  getAllMetrics,
  getMetricByPath,
} from "./nl-rule-parser";
import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — COMMAND PATTERNS (30 patterns)
// ═══════════════════════════════════════════════════════════

const COMMAND_PATTERNS: CommandPattern[] = [
  // ── QUERY patterns (5) ──────────────────────────────────
  {
    id: "q_metric_value",
    type: "query",
    triggers: [
      "cual es el", "cuál es el", "cuanto es el", "cuánto es el",
      "dime el", "decime el", "mostrar el", "mostrame el",
      "valor de", "nivel de", "como va el", "cómo va el",
      "estado de", "situacion de", "situación de",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: true,
    requiresNumber: false,
    resolve: (_t, _n, metrics) => ({
      type: "query",
      metrics,
    }),
  },
  {
    id: "q_metric_trend",
    type: "query",
    triggers: [
      "como cambio el", "como varió el", "como evolucionó el",
      "tendencia de", "evolucion de", "evolución de",
      "variacion de", "variación de",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: true,
    requiresNumber: false,
    resolve: (_t, _n, metrics) => ({
      type: "query",
      metrics,
      comparisonTarget: "previous_period",
    }),
  },
  {
    id: "q_status",
    type: "query",
    triggers: [
      "como estamos", "cómo estamos", "como estamos hoy",
      "estado del club", "resumen rápido", "resumen rapido",
    ],
    confidence: "medium",
    confidenceScore: 75,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "query",
      domain: "global",
      metrics: ["all"],
    }),
  },
  {
    id: "q_domain_status",
    type: "query",
    triggers: [
      "como van los", "cómo van los", "como va la",
      "cómo va la", "estado de los", "situación de los",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "query",
      domain: detectDomain(normalized) ?? "global",
    }),
  },
  {
    id: "q_comparison",
    type: "query",
    triggers: [
      "comparar", "comparación", "comparacion", "versus", " vs ",
      "diferencia entre", "contra",
    ],
    confidence: "medium",
    confidenceScore: 70,
    requiresMetric: true,
    requiresNumber: false,
    resolve: (_t, normalized, metrics) => ({
      type: "query",
      metrics,
      comparisonTarget: extractComparisonTarget(normalized),
    }),
  },

  // ── ANALYSIS patterns (5) ───────────────────────────────
  {
    id: "a_why",
    type: "analysis",
    triggers: [
      "por que", "por qué", "porqué", "porque subio",
      "porque bajó", "porque bajo", "causa de", "razón de",
      "razon de", "motivo de",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, _n, metrics) => ({
      type: "analysis",
      metrics,
      domain: metrics.length > 0
        ? (getMetricByPath(metrics[0])?.domain ?? "global")
        : "global",
    }),
  },
  {
    id: "a_explain",
    type: "analysis",
    triggers: [
      "explica", "explicame", "explícame", "analiza",
      "analizá", "por qué pasa", "que está pasando",
      "que esta pasando", "qué está pasando", "ayuda a entender",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, _n, metrics) => ({
      type: "analysis",
      metrics,
      domain: metrics.length > 0
        ? (getMetricByPath(metrics[0])?.domain ?? "global")
        : "global",
    }),
  },
  {
    id: "a_anomaly",
    type: "analysis",
    triggers: [
      "anomalías", "anomalias", "anomalies", "algo raro",
      "algo anormal", "alertas", "problemas", "riesgos",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "analysis",
      domain: detectDomain(normalized) ?? "global",
      metrics: ["_computed.anomaly_count"],
    }),
  },
  {
    id: "a_cascade",
    type: "analysis",
    triggers: [
      "cascada", "cadena de impacto", "impacto en cadena",
      "efecto dominó", "efecto domino", "cómo afecta",
      "como afecta", "qué puede pasar", "que puede pasar",
    ],
    confidence: "high",
    confidenceScore: 80,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, _n, metrics) => ({
      type: "analysis",
      metrics,
      domain: "global",
    }),
  },
  {
    id: "a_insights",
    type: "analysis",
    triggers: [
      "insights", "recomendaciones", "acciones sugeridas",
      "qué me recomendás", "que me recomendás", "qué sugiere",
      "que sugiere", "qué debería hacer", "que deberia hacer",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "analysis",
      domain: detectDomain(normalized) ?? "global",
    }),
  },

  // ── SIMULATION patterns (5) ─────────────────────────────
  {
    id: "s_what_if",
    type: "simulation",
    triggers: [
      "qué pasa si", "que pasa si", "qué pasaría si", "que pasaria si",
      "y si", "simula", "simulá", "simular",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "simulation",
      metrics,
      domain: metrics.length > 0
        ? (getMetricByPath(metrics[0])?.domain ?? "global")
        : detectDomain(normalized) ?? "global",
      scenario: buildScenarioFromText(normalized, metrics, numbers),
    }),
  },
  {
    id: "s_template",
    type: "simulation",
    triggers: [
      "escenario de", "simular aumento", "simular caída",
      "simular caida", "simular reducción", "simular reduccion",
      "escenario predefinido", "test de estrés", "test de estres",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized, metrics, _numbers) => ({
      type: "simulation",
      metrics,
      scenario: matchTemplate(normalized),
    }),
  },
  {
    id: "s_increase",
    type: "simulation",
    triggers: [
      "aumentar", "aumento de", "subir", "incrementar",
      "incremento de", "subida de",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: true,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "simulation",
      metrics,
      scenario: buildDeltaScenario(normalized, metrics, numbers, "increase"),
    }),
  },
  {
    id: "s_decrease",
    type: "simulation",
    triggers: [
      "reducir", "reducción de", "reduccion de", "bajar",
      "disminuir", "bajada de", "caída de", "caida de",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: true,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "simulation",
      metrics,
      scenario: buildDeltaScenario(normalized, metrics, numbers, "decrease"),
    }),
  },
  {
    id: "s_stress",
    type: "simulation",
    triggers: [
      "peor escenario", "worst case", "stress test",
      "qué tan mal", "que tan mal", "riesgo máximo", "riesgo maximo",
    ],
    confidence: "high",
    confidenceScore: 80,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "simulation",
      domain: "global",
      scenario: { id: "worst_case", name: "Peor escenario" },
    }),
  },

  // ── ACTION patterns (4) ─────────────────────────────────
  {
    id: "act_generate",
    type: "action",
    triggers: [
      "generar reporte", "generar informe", "generar análisis",
      "generar analisis", "crear reporte", "crear informe",
      "exportar", "descargar",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "action",
      domain: detectDomain(normalized) ?? "global",
      mcpAction: {
        server: "executive_dashboard",
        tool: "export_report",
        params: { type: detectReportType(normalized) },
      },
    }),
  },
  {
    id: "act_notify",
    type: "action",
    triggers: [
      "notificar", "enviar alerta", "avisar", "mandar alerta",
      "alertar", "comunicar",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "action",
      domain: detectDomain(normalized) ?? "global",
      mcpAction: {
        server: "hitl",
        tool: "approve_request",
        params: { type: "nl_notification", text: normalized },
      },
    }),
  },
  {
    id: "act_approve",
    type: "action",
    triggers: [
      "aprobar", "aprobar solicitud", "aprobar pendiente",
      "confirmar", "ejecutar acción", "ejecutar accion",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, _normalized, _m, numbers) => ({
      type: "action",
      mcpAction: {
        server: "hitl",
        tool: "approve_request",
        params: { requestId: numbers.length > 0 ? numbers[0] : undefined },
      },
    }),
  },
  {
    id: "act_board_brief",
    type: "action",
    triggers: [
      "brief del board", "briefing", "resumen ejecutivo",
      "resumen para el board", "preparar junta", "preparar board",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "action",
      domain: "global",
      mcpAction: {
        server: "advisor_intelligence",
        tool: "generate_board_brief",
        params: {},
      },
    }),
  },

  // ── RULE patterns (3) ───────────────────────────────────
  {
    id: "r_create",
    type: "rule",
    triggers: [
      "cuando", "crear regla", "nueva regla", "agregar regla",
      "crear alerta cuando", "notificarme cuando",
      "avisarme cuando", "alertarme cuando",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, original) => ({
      type: "rule",
      ruleText: original.trim(),
    }),
  },
  {
    id: "r_manage",
    type: "rule",
    triggers: [
      "mis reglas", "ver reglas", "listar reglas",
      "reglas activas", "reglas guardadas",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "rule",
    }),
  },
  {
    id: "r_pause",
    type: "rule",
    triggers: [
      "pausar regla", "desactivar regla", "detener regla",
      "suspender regla",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "rule",
    }),
  },

  // ── GOAL patterns (4) ───────────────────────────────────
  {
    id: "g_create",
    type: "goal",
    triggers: [
      "objetivo de", "meta de", "quiero reducir", "quiero aumentar",
      "quiero lograr", "necesito llegar a", "target de",
      "goal de", "plan para",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: true,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "goal",
      metrics,
      goalTarget: buildGoalTarget(normalized, metrics, numbers),
    }),
  },
  {
    id: "g_reduce_to",
    type: "goal",
    triggers: [
      "reducir a", "bajar a", "llevar a", "alcanzar",
      "llegar a", "mejorar a",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: true,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "goal",
      metrics,
      goalTarget: buildGoalTarget(normalized, metrics, numbers),
    }),
  },
  {
    id: "g_list",
    type: "goal",
    triggers: [
      "mis metas", "mis objetivos", "ver metas", "ver objetivos",
      "metas activas", "objetivos activos", "goals activos",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({ type: "goal" }),
  },
  {
    id: "g_deadline",
    type: "goal",
    triggers: [
      "en 30 días", "en 60 días", "en 90 días", "en 30 dias",
      "en 60 dias", "en 90 dias", "este trimestre", "este mes",
      "este año", "este ano",
    ],
    confidence: "medium",
    confidenceScore: 75,
    requiresMetric: true,
    requiresNumber: true,
    resolve: (_t, normalized, metrics, numbers) => ({
      type: "goal",
      metrics,
      goalTarget: buildGoalTarget(normalized, metrics, numbers),
    }),
  },

  // ── REPORT patterns (4) ─────────────────────────────────
  {
    id: "rp_summary",
    type: "report",
    triggers: [
      "resumen del", "resumen de", "reporte de", "reporte del",
      "informe de", "informe del",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: (_t, normalized) => ({
      type: "report",
      domain: detectDomain(normalized) ?? "global",
      reportType: detectReportType(normalized),
    }),
  },
  {
    id: "rp_executive",
    type: "report",
    triggers: [
      "reporte ejecutivo", "informe ejecutivo", "dashboard ejecutivo",
      "resumen ejecutivo", "board report",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "report",
      domain: "global",
      reportType: "executive",
      mcpAction: {
        server: "executive_dashboard",
        tool: "generate_quarterly_board_report",
        params: {},
      },
    }),
  },
  {
    id: "rp_financial",
    type: "report",
    triggers: [
      "reporte financiero", "informe financiero", "estado financiero",
      "situación financiera", "situacion financiera",
      "análisis financiero", "analisis financiero",
    ],
    confidence: "high",
    confidenceScore: 90,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "report",
      domain: "financial",
      reportType: "financial",
      mcpAction: {
        server: "finance",
        tool: "generate_ai_analysis",
        params: {},
      },
    }),
  },
  {
    id: "rp_anomaly",
    type: "report",
    triggers: [
      "reporte de anomalías", "reporte de anomalias",
      "reporte de alertas", "análisis de riesgos",
      "analisis de riesgos",
    ],
    confidence: "high",
    confidenceScore: 85,
    requiresMetric: false,
    requiresNumber: false,
    resolve: () => ({
      type: "report",
      domain: "global",
      reportType: "anomaly",
      mcpAction: {
        server: "ml_intelligence",
        tool: "get_anomaly_report",
        params: {},
      },
    }),
  },
];

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MAIN PARSER
// ═══════════════════════════════════════════════════════════

/**
 * Parse a command string into a CommandIntent.
 *
 * Pipeline:
 *   1. Normalize text
 *   2. Check for follow-up resolution (conversation context)
 *   3. Pattern match against COMMAND_PATTERNS
 *   4. Extract metrics, numbers, domain
 *   5. Build intent
 *
 * Returns null if no pattern matches — caller uses LLM fallback.
 */
export function parseCommand(
  text: string,
  conversation?: ConversationState,
): CommandParseResult {
  const original = text.trim();
  const normalized = stripAccents(original.toLowerCase());

  // Too short to parse
  if (normalized.length < 3) {
    return {
      intent: null,
      strategy: "deterministic",
      confidence: 0,
      success: false,
      error: "Comando muy corto. Probá algo como: \"¿Cuál es el churn?\"",
    };
  }

  // Step 1: Try follow-up resolution from conversation context
  const followupIntent = resolveFollowup(normalized, conversation);
  if (followupIntent) {
    return {
      intent: followupIntent,
      strategy: "deterministic",
      confidence: followupIntent.confidenceScore,
      success: true,
    };
  }

  // Step 2: Extract metrics and numbers from text
  const extractedMetrics = extractMetrics(normalized);
  const extractedNumbers = extractNumbers(original);

  // Step 3: Pattern matching
  let bestMatch: {
    pattern: CommandPattern;
    score: number;
  } | null = null;

  for (const pattern of COMMAND_PATTERNS) {
    const matchScore = scorePatternMatch(normalized, pattern);
    if (matchScore > 0) {
      if (!bestMatch || matchScore > bestMatch.score) {
        bestMatch = { pattern, score: matchScore };
      }
    }
  }

  if (!bestMatch) {
    return {
      intent: null,
      strategy: "deterministic",
      confidence: 0,
      success: false,
      error: "No pude entender el comando.",
      suggestions: [
        'Probá: "¿Cuál es el churn?"',
        'Probá: "¿Qué pasa si aumento las cuotas 10%?"',
        'Probá: "Generar reporte ejecutivo"',
        'Probá: "Cuando churn > 8%, alertar"',
      ],
    };
  }

  const { pattern } = bestMatch;

  // Step 4: Validate requirements
  if (pattern.requiresMetric && extractedMetrics.length === 0) {
    return {
      intent: null,
      strategy: "deterministic",
      confidence: 40,
      success: false,
      error: `El comando "${pattern.type}" necesita una métrica.`,
      suggestions: getMetricSuggestions(normalized),
    };
  }

  if (pattern.requiresNumber && extractedNumbers.length === 0) {
    return {
      intent: null,
      strategy: "deterministic",
      confidence: 40,
      success: false,
      error: `El comando necesita un número. Ejemplo: "10%", "₡5,000,000", "5 puntos"`,
    };
  }

  // Step 5: Build intent
  const partialIntent = pattern.resolve(original, normalized, extractedMetrics, extractedNumbers);

  const intent: CommandIntent = {
    type: pattern.type,
    confidence: pattern.confidence,
    confidenceScore: pattern.confidenceScore,
    domain: partialIntent.domain
      ?? (extractedMetrics.length > 0
        ? (getMetricByPath(extractedMetrics[0])?.domain ?? "global")
        : "global"),
    metrics: extractedMetrics.length > 0 ? extractedMetrics : (partialIntent.metrics ?? []),
    timeRange: partialIntent.timeRange ?? extractTimeRange(normalized),
    comparisonTarget: partialIntent.comparisonTarget,
    scenario: partialIntent.scenario,
    ruleText: partialIntent.ruleText,
    goalTarget: partialIntent.goalTarget,
    mcpAction: partialIntent.mcpAction,
    reportType: partialIntent.reportType,
  };

  return {
    intent,
    strategy: "deterministic",
    confidence: pattern.confidenceScore,
    success: true,
  };
}

/**
 * Quick check: is this text likely a command?
 * Used for UI hints before full parse.
 */
export function isLikelyCommand(text: string): boolean {
  const normalized = stripAccents(text.toLowerCase().trim());
  if (normalized.length < 3) return false;

  return COMMAND_PATTERNS.some((p) =>
    p.triggers.some((t) => normalized.includes(t)),
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — FOLLOW-UP RESOLUTION
// ═══════════════════════════════════════════════════════════

/**
 * Resolve follow-up commands using conversation context.
 * "¿Por qué?" → analysis on activeMetric
 * "Y si sube más?" → simulation on activeMetric with increased delta
 * "Simula eso" → simulation using lastSimulation
 */
function resolveFollowup(
  normalized: string,
  conversation?: ConversationState,
): CommandIntent | null {
  if (!conversation || conversation.turns.length === 0) return null;

  const { activeMetric, activeDomain, lastSimulation } = conversation;

  // "¿Por qué?" / "por qué?" → analysis on active metric
  if (
    (normalized === "por que" || normalized === "por qué" || normalized === "porque") &&
    activeMetric
  ) {
    return {
      type: "analysis",
      confidence: "high",
      confidenceScore: 85,
      domain: activeDomain ?? (getMetricByPath(activeMetric)?.domain ?? "global"),
      metrics: [activeMetric],
    };
  }

  // "Y si sube más?" / "y si aumenta?" → simulation with bigger delta
  if (
    (normalized.startsWith("y si") || normalized === "y ahora" || normalized === "y despues") &&
    activeMetric
  ) {
    const metric = getMetricByPath(activeMetric);
    return {
      type: "simulation",
      confidence: "medium",
      confidenceScore: 70,
      domain: activeDomain ?? (metric?.domain ?? "global"),
      metrics: [activeMetric],
      scenario: {
        name: `Seguimiento: ${metric?.names[0] ?? activeMetric}`,
      },
    };
  }

  // "Más detalles" / "expande" → analysis on last topic
  if (
    normalized.includes("mas detalle") ||
    normalized.includes("expand") ||
    normalized.includes("más info") ||
    normalized.includes("mas info")
  ) {
    const lastTurn = conversation.turns[0];
    if (lastTurn?.intent) {
      return {
        ...lastTurn.intent,
        confidenceScore: lastTurn.intent.confidenceScore - 5,
      };
    }
  }

  // "Simula eso" → use last simulation context
  if (
    (normalized.includes("simula eso") || normalized === "simular eso") &&
    lastSimulation
  ) {
    return {
      type: "simulation",
      confidence: "high",
      confidenceScore: 80,
      domain: "global",
      metrics: lastSimulation.deltas.map((d) => d.metricPath),
      scenario: lastSimulation,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — METRIC EXTRACTION (reuses F52 dictionary)
// ═══════════════════════════════════════════════════════════

function extractMetrics(normalized: string): string[] {
  const allMetrics = getAllMetrics();
  const found: Array<{ path: string; priority: number }> = [];

  for (const metric of allMetrics) {
    for (const name of metric.names) {
      const stripped = stripAccents(name.toLowerCase());
      if (normalized.includes(stripped)) {
        // Longer names get higher priority (more specific)
        found.push({ path: metric.path, priority: stripped.length });
        break; // Only count each metric once
      }
    }
  }

  // Sort by priority (longest match first), return paths
  return found
    .sort((a, b) => b.priority - a.priority)
    .map((f) => f.path);
}

function getMetricSuggestions(normalized: string): string[] {
  const allMetrics = getAllMetrics();
  const suggestions: string[] = [];

  // Find closest matching metric names
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    for (const metric of allMetrics) {
      for (const name of metric.names) {
        if (stripAccents(name.toLowerCase()).includes(word)) {
          suggestions.push(`¿Querías decir "${name}"? (${metric.description})`);
        }
      }
    }
  }

  // Generic suggestions if no close matches
  if (suggestions.length === 0) {
    suggestions.push(
      "Métricas disponibles: churn, ingresos, satisfacción, ocupación, retención, margen",
    );
  }

  return [...new Set(suggestions)].slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — NUMBER EXTRACTION
// ═══════════════════════════════════════════════════════════

function extractNumbers(text: string): number[] {
  const cleaned = text.replace(/[₡$]/g, "").replace(/,/g, "");
  const matches = cleaned.match(/(\d+(?:\.\d+)?)/g);
  return matches ? matches.map((m) => parseFloat(m)) : [];
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — DOMAIN DETECTION
// ═══════════════════════════════════════════════════════════

function detectDomain(normalized: string): AIDomain | null {
  const domainKeywords: Array<{ keywords: string[]; domain: AIDomain }> = [
    { keywords: ["financiero", "ingreso", "revenue", "gasto", "margen", "cuota"], domain: "financial" },
    { keywords: ["evento", "actividad", "calendario", "ocupacion", "asistencia"], domain: "events" },
    { keywords: ["socio", "membresia", "churn", "abandono", "retencion", "invitado", "visita"], domain: "engagement" },
    { keywords: ["satisfaccion", "experiencia", "wellness", "bienestar", "servicio"], domain: "satisfaction" },
    { keywords: ["deporte", "cancha", "gimnasio", "tenis", "piscina"], domain: "sports" },
    { keywords: ["comunicacion", "email", "notificacion", "campaña", "campana"], domain: "communication" },
    { keywords: ["familia", "edad", "niño", "nino", "junior", "adulto mayor"], domain: "family" },
  ];

  for (const entry of domainKeywords) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return entry.domain;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — TIME RANGE EXTRACTION
// ═══════════════════════════════════════════════════════════

function extractTimeRange(normalized: string): TimeRange | undefined {
  const now = new Date();

  if (normalized.includes("hoy") || normalized.includes("dia de hoy")) {
    return {
      from: now.toISOString().split("T")[0],
      to: "today",
      label: "Hoy",
    };
  }

  if (normalized.includes("esta semana")) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: "Esta semana",
    };
  }

  if (normalized.includes("este mes")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: "Este mes",
    };
  }

  if (normalized.includes("este trimestre")) {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), quarterMonth, 1);
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: "Este trimestre",
    };
  }

  if (normalized.includes("este año") || normalized.includes("este ano")) {
    const start = new Date(now.getFullYear(), 0, 1);
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: "Este año",
    };
  }

  if (normalized.includes("ultimo mes") || normalized.includes("pasado")) {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 1);
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: "Último mes",
    };
  }

  // Specific day counts: "últimos 30 días", "últimos 7 días"
  const dayMatch = normalized.match(/ultimo[s]?\s+(\d+)\s+dia/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const start = new Date(now);
    start.setDate(now.getDate() - days);
    return {
      from: start.toISOString().split("T")[0],
      to: "today",
      label: `Últimos ${days} días`,
    };
  }

  return undefined;
}

function extractDeadline(normalized: string): string | undefined {
  const now = new Date();

  const dayMatch = normalized.match(/en\s+(\d+)\s+dia/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + days);
    return deadline.toISOString().split("T")[0];
  }

  if (normalized.includes("este mes")) {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  }

  if (normalized.includes("este trimestre")) {
    const quarterEnd = Math.floor(now.getMonth() / 3) * 3 + 2;
    return new Date(now.getFullYear(), quarterEnd + 1, 0).toISOString().split("T")[0];
  }

  return undefined;
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — SCENARIO BUILDERS
// ═══════════════════════════════════════════════════════════

function buildScenarioFromText(
  normalized: string,
  metrics: string[],
  numbers: number[],
): Partial<DeltaScenario> | undefined {
  if (metrics.length === 0 || numbers.length === 0) return undefined;

  const isDecrease =
    normalized.includes("reduc") ||
    normalized.includes("baj") ||
    normalized.includes("disminu") ||
    normalized.includes("caid");

  const metric = getMetricByPath(metrics[0]);
  const deltaPct = numbers[0];

  return {
    name: `${isDecrease ? "Reducción" : "Aumento"} de ${metric?.names[0] ?? metrics[0]} ${deltaPct}%`,
    deltas: [
      {
        metricPath: metrics[0],
        metricName: metric?.names[0] ?? metrics[0],
        currentValue: 0, // Will be resolved by simulator
        simulatedValue: 0,
        delta: 0,
        deltaPct: isDecrease ? -deltaPct : deltaPct,
        unit: metric?.unit ?? "%",
        domain: metric?.domain ?? "global",
      },
    ],
  };
}

function buildDeltaScenario(
  _normalized: string,
  metrics: string[],
  numbers: number[],
  direction: "increase" | "decrease",
): Partial<DeltaScenario> | undefined {
  if (metrics.length === 0 || numbers.length === 0) return undefined;

  const metric = getMetricByPath(metrics[0]);
  const deltaPct = direction === "decrease" ? -numbers[0] : numbers[0];

  return {
    name: `${direction === "increase" ? "Aumento" : "Reducción"} de ${metric?.names[0] ?? metrics[0]} ${Math.abs(deltaPct)}%`,
    deltas: [
      {
        metricPath: metrics[0],
        metricName: metric?.names[0] ?? metrics[0],
        currentValue: 0,
        simulatedValue: 0,
        delta: 0,
        deltaPct,
        unit: metric?.unit ?? "%",
        domain: metric?.domain ?? "global",
      },
    ],
  };
}

function matchTemplate(normalized: string): Partial<DeltaScenario> | undefined {
  if (normalized.includes("aumento") && normalized.includes("10")) {
    return { id: "fee_increase_10", name: "Aumento de cuotas 10%" };
  }
  if (normalized.includes("aumento") && normalized.includes("20")) {
    return { id: "fee_increase_20", name: "Aumento de cuotas 20%" };
  }
  if (normalized.includes("abandono") || normalized.includes("churn")) {
    return { id: "churn_spike", name: "Pico de abandono" };
  }
  if (normalized.includes("satisfaccion") || normalized.includes("satisfaction")) {
    return { id: "satisfaction_drop", name: "Caída de satisfacción" };
  }
  if (normalized.includes("evento") || normalized.includes("event")) {
    return { id: "event_boom", name: "Boom de eventos" };
  }
  if (normalized.includes("costo") || normalized.includes("gasto")) {
    return { id: "cost_reduction", name: "Reducción de costos" };
  }
  if (normalized.includes("invitado") || normalized.includes("visita")) {
    return { id: "guest_growth", name: "Crecimiento de invitados" };
  }
  if (normalized.includes("peor") || normalized.includes("worst") || normalized.includes("stress")) {
    return { id: "worst_case", name: "Peor escenario" };
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — GOAL TARGET BUILDER
// ═══════════════════════════════════════════════════════════

function buildGoalTarget(
  normalized: string,
  metrics: string[],
  numbers: number[],
): CommandIntent["goalTarget"] {
  if (metrics.length === 0 || numbers.length === 0) return undefined;

  const metric = getMetricByPath(metrics[0]);
  const deadline = extractDeadline(normalized);

  return {
    metric: metrics[0],
    value: numbers[0],
    unit: metric?.unit ?? "%",
    ...(deadline && { deadline }),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 10 — REPORT TYPE DETECTION
// ═══════════════════════════════════════════════════════════

function detectReportType(normalized: string): string {
  if (normalized.includes("financiero") || normalized.includes("financial")) return "financial";
  if (normalized.includes("evento") || normalized.includes("event")) return "events";
  if (normalized.includes("socio") || normalized.includes("member")) return "membership";
  if (normalized.includes("anomali") || normalized.includes("alert")) return "anomaly";
  if (normalized.includes("ejecutivo") || normalized.includes("executive")) return "executive";
  if (normalized.includes("bienestar") || normalized.includes("wellness")) return "wellness";
  return "general";
}

function extractComparisonTarget(normalized: string): string {
  if (normalized.includes("año pasado") || normalized.includes("ano pasado")) return "year_ago";
  if (normalized.includes("mes pasado")) return "month_ago";
  if (normalized.includes("trimestre pasado")) return "quarter_ago";
  if (normalized.includes("semana pasada")) return "week_ago";
  return "previous_period";
}

// ═══════════════════════════════════════════════════════════
// SECTION 11 — PATTERN SCORING
// ═══════════════════════════════════════════════════════════

function scorePatternMatch(normalized: string, pattern: CommandPattern): number {
  let bestScore = 0;

  for (const trigger of pattern.triggers) {
    if (normalized.includes(trigger)) {
      // Longer triggers score higher (more specific)
      const score = trigger.length * 10 + pattern.confidenceScore;
      if (score > bestScore) bestScore = score;
    }
  }

  return bestScore;
}

// ═══════════════════════════════════════════════════════════
// SECTION 12 — UTILITY
// ═══════════════════════════════════════════════════════════

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ═══════════════════════════════════════════════════════════
// SECTION 13 — LLM FALLBACK (F57-B6)
// ═══════════════════════════════════════════════════════════

import { callMCPTool } from "@/shared/lib/api";

/** JSON schema for LLM command parse response */
interface LLMCommandParseResponse {
  type: "query" | "analysis" | "simulation" | "action" | "rule" | "goal" | "report";
  domain: string | null;
  metric: string | null;
  number: number | null;
  action_label: string | null;
  report_type: string | null;
  confidence: number;
}

/**
 * Parse a command with LLM fallback.
 *
 * Pipeline:
 *   1. Try deterministic parseCommand() (0 tokens, <5ms)
 *   2. If success=false → call ask_advisor with structured prompt
 *   3. Parse JSON response → build CommandIntent
 *
 * @param text — The command text
 * @param conversation — Optional conversation context
 * @returns CommandParseResult (success may still be false if both strategies fail)
 */
export async function parseCommandWithLLMFallback(
  text: string,
  conversation?: ConversationState,
): Promise<CommandParseResult> {
  // Step 1: Deterministic (fast path)
  const deterministicResult = parseCommand(text, conversation);
  if (deterministicResult.success) return deterministicResult;

  // Step 2: LLM fallback
  try {
    const metricNames = getAllMetrics().map((m) =>
      `  - ${m.names[0]} (path: "${m.path}", domain: "${m.domain}")`,
    ).join("\n");

    const prompt = `Sos un asistente de inteligencia para un club privado de Costa Rica.
El gerente escribió este comando en español: "${text}"

Extraé:
- type: query | analysis | simulation | action | rule | goal | report
- domain: financial | events | engagement | satisfaction | sports | communication | family | ml_intelligence | global | null
- metric: la métrica más relevante (el path exacto) o null
- number: un número mencionado o null
- action_label: descripción corta de la acción (o null)
- report_type: financial | events | membership | anomaly | executive | wellness | general | null
- confidence: 0.0 a 1.0

Métricas disponibles:
${metricNames}

Responde SOLO con JSON (sin markdown, sin explicaciones):
{"type":"...","domain":"...","metric":"...","number":...,"action_label":"...","report_type":"...","confidence":0.0}`;

    const response = await callMCPTool<{ answer?: string }>(
      "advisor_intelligence",
      "ask_advisor",
      { question: prompt, role: "system" },
    );

    if (!response?.answer) return deterministicResult;

    const jsonMatch = response.answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return deterministicResult;

    const parsed = JSON.parse(jsonMatch[0]) as LLMCommandParseResponse;

    // Validate type
    const validTypes = ["query", "analysis", "simulation", "action", "rule", "goal", "report"];
    if (!validTypes.includes(parsed.type)) return deterministicResult;

    // Resolve metric
    const metricPath = parsed.metric ?? undefined;
    const resolvedDomain = (parsed.domain as AIDomain | null) ?? undefined;

    // Build intent
    const intent: CommandIntent = {
      type: parsed.type as CommandIntent["type"],
      confidence: parsed.confidence >= 0.7 ? "high" : parsed.confidence >= 0.4 ? "medium" : "low",
      confidenceScore: Math.round(parsed.confidence * 100),
      domain: resolvedDomain ?? (metricPath ? (getMetricByPath(metricPath)?.domain ?? "global") : "global"),
      metrics: metricPath ? [metricPath] : [],
    };

    // Add type-specific fields
    if (parsed.type === "simulation" && metricPath && parsed.number) {
      const metric = getMetricByPath(metricPath);
      intent.scenario = {
        name: `${metric?.names[0] ?? metricPath} ${parsed.number}%`,
        deltas: [{
          metricPath,
          metricName: metric?.names[0] ?? metricPath,
          currentValue: 0,
          simulatedValue: 0,
          delta: 0,
          deltaPct: parsed.number,
          unit: metric?.unit ?? "%",
          domain: metric?.domain ?? "global",
        }],
      };
    }

    if (parsed.type === "action" && parsed.action_label) {
      intent.mcpAction = {
        server: "advisor_intelligence",
        tool: "ask_advisor",
        params: { question: parsed.action_label },
      };
    }

    if (parsed.type === "report") {
      intent.reportType = parsed.report_type ?? "general";
    }

    if (parsed.type === "goal" && metricPath && parsed.number) {
      intent.goalTarget = {
        metric: metricPath,
        value: parsed.number,
        unit: getMetricByPath(metricPath)?.unit ?? "%",
      };
    }

    if (parsed.type === "rule") {
      intent.ruleText = text.trim();
    }

    if (import.meta.env.DEV) {
      console.log(
        `[Command Parser] LLM strategy used for: "${text}" → type: ${parsed.type}, confidence: ${parsed.confidence}`,
      );
    }

    return {
      intent,
      strategy: "llm",
      confidence: Math.round(parsed.confidence * 100),
      success: true,
    };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.error("[Command Parser] LLM fallback failed:", e);
    }
    return deterministicResult;
  }
}