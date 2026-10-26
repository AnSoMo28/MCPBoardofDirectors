// src/shared/lib/advisor-engine/command-executor.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Command Executor (F54)
//
// Takes a parsed CommandIntent and executes it against the
// real advisor context, producing a rich CommandResponse.
//
// 7 handlers — one per CommandType:
//   QUERY      → resolveMetric + trend computation
//   ANALYSIS   → causal chains + insights from advisor result
//   SIMULATION → F53 delta-simulator
//   ACTION     → MCP Tool Registry execution
//   RULE       → F52 NL rule parser + store
//   GOAL       → F51 goal engine derivation
//   REPORT     → MCP tool reference (deferred execution)
//
// All client-side. 0 tokens. <5ms per command (except simulation ~10ms).
//
// Depends on:
//   ./command-types (CommandIntent, CommandResponse, all data types)
//   ./nl-rule-parser (resolveMetric, getMetricByPath, getAllMetrics)
//   ./nl-rule-parser (parseNLRule)
//   ./nl-rule-validator (validateNLRule)
//   ./nl-rule-store (saveCustomRule, getActiveRules)
//   ./nl-rule-engine (evaluateCustomRules)
//   ./delta-simulator (simulateScenario, simulateFromTemplate)
//   ./twin-types (DeltaScenario, SCENARIO_TEMPLATES)
//   ./causal-chain (CausalChain)
//   ./mcp-tool-registry (hasTool, getToolDef)
//   ./goal-engine (deriveGoals)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  CommandIntent,
  CommandResponse,
  MetricValueData,
  InsightListData,
  SimulationResultData,
  ActionConfirmationData,
  RuleCreatedData,
  GoalCreatedData,
  ReportPreviewData,
  ErrorData,
  ConversationState,
} from "./command-types";
import {
  resolveMetric,
  getMetricByPath
} from "./nl-rule-parser";
import { parseNLRule } from "./nl-rule-parser";
import { validateNLRule } from "./nl-rule-validator";
import {
  saveCustomRule,
  getActiveRules,
  getCustomRules,
} from "./nl-rule-store";
import {
  simulateScenario,
  simulateFromTemplate,
} from "./delta-simulator";
import {
  SCENARIO_TEMPLATES,
} from "./twin-types";
import type { DeltaScenario, MetricDelta } from "./twin-types";
import type { CausalChain } from "./types";
import { hasTool, getToolDef } from "./mcp-tool-registry";
import type { DomainSignal } from "./types";
import type { AdvisorInsightBase as BaseInsight, AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — EXECUTION OPTIONS
// ═══════════════════════════════════════════════════════════

export interface CommandExecutionContext {
  /** Real advisor context (any domain's BaseContext) */
  advisorContext: Record<string, unknown>;
  /** Active insights from the advisor engine */
  insights?: BaseInsight[];
  /** Active causal chains from F49 */
  causalChains?: CausalChain[];
  /** Active signals from Signal Bus */
  signals?: DomainSignal[];
  /** Calibration map from F50 */
  calibrationMap?: Map<string, unknown>;
  /** Baseline health scores per domain */
  healthScores?: Map<string, number>;
  /** Current conversation state for follow-up context */
  conversation?: ConversationState;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MAIN EXECUTOR
// ═══════════════════════════════════════════════════════════

/**
 * Execute a parsed command intent against the advisor context.
 * Returns a rich CommandResponse with card data.
 *
 * Dispatches to type-specific handlers based on intent.type.
 */
export function executeCommand(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  const startTime = performance.now();
  let response: CommandResponse;

  try {
    switch (intent.type) {
      case "query":
        response = handleQuery(intent, execCtx);
        break;
      case "analysis":
        response = handleAnalysis(intent, execCtx);
        break;
      case "simulation":
        response = handleSimulation(intent, execCtx);
        break;
      case "action":
        response = handleAction(intent, execCtx);
        break;
      case "rule":
        response = handleRule(intent, execCtx);
        break;
      case "goal":
        response = handleGoal(intent, execCtx);
        break;
      case "report":
        response = handleReport(intent, execCtx);
        break;
      default:
        response = buildErrorResponse(intent, "unknown", "Tipo de comando no reconocido.");
    }
  } catch (e) {
    response = buildErrorResponse(
      intent,
      "unknown",
      e instanceof Error ? e.message : "Error inesperado al ejecutar el comando.",
    );
  }

  response.executionMs = Math.round((performance.now() - startTime) * 100) / 100;
  return response;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — QUERY HANDLER
// ═══════════════════════════════════════════════════════════

function handleQuery(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  // "all" metrics → quick status summary
  if (intent.metrics.includes("all")) {
    return handleQueryStatus(intent, execCtx);
  }

  const metricPath = intent.metrics[0];
  if (!metricPath) {
    return buildErrorResponse(intent, "metric_not_found", "No se especificó una métrica.");
  }

  const metric = getMetricByPath(metricPath);
  if (!metric) {
    return buildErrorResponse(
      intent,
      "metric_not_found",
      `No conozco la métrica "${metricPath}".`,
      ["Métricas disponibles: churn, ingresos, satisfacción, retención, margen"],
    );
  }

  const value = resolveMetric(execCtx.advisorContext, metricPath);
  if (value === null) {
    return buildErrorResponse(
      intent,
      "metric_not_found",
      `No pude obtener el valor de "${metric.names[0]}". Verificá que los datos estén cargados.`,
    );
  }

  // Compute trend if comparison requested
  let trend: MetricValueData["trend"];
  if (intent.comparisonTarget) {
    // Simulated trend: in real system this would compare against historical data
    const prevValue = resolveMetric(execCtx.advisorContext, `${metricPath}_previous`);
    if (prevValue !== null) {
      const delta = value - prevValue;
      trend = {
        direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
        delta: Math.round(delta * 100) / 100,
        deltaPct: prevValue !== 0
          ? Math.round((delta / prevValue) * 10000) / 100
          : 0,
      };
    }
  }

  const data: MetricValueData = {
    type: "metric_value",
    metricName: metric.names[0],
    metricPath,
    value: Math.round(value * 100) / 100,
    unit: metric.unit,
    domain: metric.domain,
    trend,
  };

  const unitDisplay = metric.unit === "₡"
    ? `₡${value.toLocaleString("es-CR")}`
    : metric.unit === "%"
      ? `${value.toFixed(1)}%`
      : `${value.toLocaleString("es-CR")} ${metric.unit}`;

  return {
    id: `resp_${Date.now()}`,
    cardType: "metric_value",
    intent,
    textSummary: `${metric.names[0]}: ${unitDisplay}${trend ? ` (${trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} ${Math.abs(trend.deltaPct)}%)` : ""}`,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: false,
    suggestedFollowups: [
      `¿Por qué ${trend?.direction === "up" ? "subió" : trend?.direction === "down" ? "bajó" : "se mantuvo"}?`,
      `¿Qué pasa si ${metric.names[0]} cambia 10%?`,
      `Crear regla cuando ${metric.names[0]} supere ${Math.round(value * 1.2)}`,
    ],
    timestamp: Date.now(),
  };
}

/**
 * Handle "status" query — quick summary of key metrics.
 */
function handleQueryStatus(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  const keyMetrics = [
    "summary.membership.churn_rate",
    "summary.financial.total_revenue",
    "summary.operational.satisfaction_score",
    "summary.membership.retention_rate",
    "summary.operational.occupancy_rate",
  ];

  const metricValues = keyMetrics
    .map((path) => {
      const metric = getMetricByPath(path);
      const value = resolveMetric(execCtx.advisorContext, path);
      if (!metric || value === null) return null;
      return {
        name: metric.names[0],
        value: metric.unit === "₡"
          ? `₡${value.toLocaleString("es-CR")}`
          : metric.unit === "%"
            ? `${value.toFixed(1)}%`
            : `${Math.round(value)} ${metric.unit}`,
        trend: undefined as string | undefined,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return {
    id: `resp_${Date.now()}`,
    cardType: "report_preview",
    intent,
    textSummary: `Resumen: ${metricValues.map((m) => `${m.name} ${m.value}`).join(" · ")}`,
    data: {
      type: "report_preview",
      reportType: "status",
      title: "Estado del Club",
      keyMetrics: metricValues,
      hasFullReport: true,
      toolServer: "executive_dashboard",
      toolName: "get_executive_summary",
    },
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: true,
    suggestedFollowups: [
      "¿Qué me recomendás?",
      "¿Hay anomalías?",
      "Generar reporte ejecutivo",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — ANALYSIS HANDLER
// ═══════════════════════════════════════════════════════════

function handleAnalysis(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  const domain = intent.domain;
  const insights = (execCtx.insights ?? []).filter(
    (i) => i.domain === domain || i.domain === "global" || domain === "global",
  );

  const causalChains = (execCtx.causalChains ?? []).filter((c) => {
    const domains = c.signals.map((s) => inferDomainFromSignal(s.signalDefId));
    return domains.includes(domain) || domain === "global";
  });

  // If specific metric requested, filter insights to that metric
  const metricFiltered = intent.metrics.length > 0
    ? insights.filter((i) =>
        intent.metrics.some((m) => (i.description ?? i.reasoning)?.toLowerCase().includes(m.split(".").pop() ?? "")),
      )
    : insights;

  const displayInsights = metricFiltered.slice(0, 5);

  if (displayInsights.length === 0 && causalChains.length === 0) {
    return {
      id: `resp_${Date.now()}`,
      cardType: "insight_list",
      intent,
      textSummary: `No encontré análisis relevante para ${domain}. Todo parece estable.`,
      data: {
        type: "insight_list",
        domain,
        insights: [],
        totalCount: 0,
      },
      parseStrategy: "deterministic",
      executionMs: 0,
      actionable: false,
      suggestedFollowups: [
        "¿Qué me recomendás?",
        "Simula un escenario de crisis",
        "Ver anomalías",
      ],
      timestamp: Date.now(),
    };
  }

  const data: InsightListData = {
    type: "insight_list",
    domain,
    insights: displayInsights.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description ?? i.reasoning,
      impact: i.impact as AdvisorImpactLevel,
      confidence: i.confidence,
    })),
    totalCount: metricFiltered.length,
    causalChains: causalChains.slice(0, 3).map((c) => ({
      name: c.patternId,
      description: `Cadena: ${c.signals.map((s) => s.signalDefId).join(" → ")} (${Math.round(c.compoundConfidence * 100)}% confianza)`,
      confidence: c.compoundConfidence,
    })),
  };

  const metricContext = intent.metrics.length > 0
    ? getMetricByPath(intent.metrics[0])?.names[0] ?? intent.metrics[0]
    : domain;

  return {
    id: `resp_${Date.now()}`,
    cardType: "insight_list",
    intent,
    textSummary: `${displayInsights.length} insight(s) para ${metricContext}. ${causalChains.length > 0 ? `${causalChains.length} cascada(s) detectada(s).` : ""}`,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: true,
    suggestedFollowups: [
      `Simula un escenario para ${metricContext}`,
      displayInsights.length > 0 ? `Crear regla: "${displayInsights[0].title}"` : "Crear regla de alerta",
      "Generar plan de acción",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — SIMULATION HANDLER
// ═══════════════════════════════════════════════════════════

function handleSimulation(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  let simulationResult;

  // Check if it's a template-based simulation
  if (intent.scenario?.id && !intent.scenario?.deltas) {
    // Template ID — use simulateFromTemplate
    simulationResult = simulateFromTemplate(
      execCtx.advisorContext,
      intent.scenario.id,
      {
        calibrationMap: undefined,
        baselineHealthScores: execCtx.healthScores,
      },
    );
  } else if (intent.scenario?.deltas && intent.scenario.deltas.length > 0) {
    // Manual deltas — resolve current values and build full scenario
    const deltas: MetricDelta[] = intent.scenario.deltas.map((d) => {
      const metric = getMetricByPath(d.metricPath);
      const currentValue = resolveMetric(execCtx.advisorContext, d.metricPath) ?? 0;
      const simulatedValue = currentValue * (1 + d.deltaPct / 100);

      return {
        metricPath: d.metricPath,
        metricName: metric?.names[0] ?? d.metricPath.split(".").pop() ?? d.metricPath,
        currentValue: Math.round(currentValue * 100) / 100,
        simulatedValue: Math.round(simulatedValue * 100) / 100,
        delta: Math.round((simulatedValue - currentValue) * 100) / 100,
        deltaPct: d.deltaPct,
        unit: metric?.unit ?? "%",
        domain: metric?.domain ?? "global",
      };
    });

    const scenario: DeltaScenario = {
      id: intent.scenario?.id ?? `cmd_scenario_${Date.now()}`,
      name: intent.scenario?.name ?? "Escenario desde comando",
      description: intent.scenario?.description ?? "",
      deltas,
      createdAt: Date.now(),
      createdBy: "command",
    };

    simulationResult = simulateScenario(
      execCtx.advisorContext,
      scenario,
      {
        calibrationMap: undefined,
        baselineHealthScores: execCtx.healthScores,
      },
    );
  } else {
    // Try template name matching
    const templateMatch = SCENARIO_TEMPLATES.find(
      (t) => intent.scenario?.name?.toLowerCase().includes(t.name.toLowerCase().split(" ")[0]),
    );

    if (templateMatch) {
      simulationResult = simulateFromTemplate(
        execCtx.advisorContext,
        templateMatch.id,
        {
          calibrationMap: undefined,
          baselineHealthScores: execCtx.healthScores,
        },
      );
    } else {
      return buildErrorResponse(
        intent,
        "parse_failed",
        "No pude determinar qué simular. Especificá una métrica y un cambio.",
        [
          'Probá: "¿Qué pasa si aumento las cuotas 10%?"',
          'Probá: "Simular pico de abandono"',
          'Probá: "¿Qué pasa si el churn sube 5%?"',
        ],
      );
    }
  }

  if (!simulationResult) {
    return buildErrorResponse(intent, "unknown", "La simulación no pudo ejecutarse.");
  }

  const { verdict, predictions, cascades } = simulationResult;

  const data: SimulationResultData = {
    type: "simulation_result",
    scenarioName: simulationResult.scenario.name,
    verdict: verdict.summary,
    verdictAssessment: verdict.assessment,
    predictions: predictions.slice(0, 5).map((p) => ({
      metricName: p.metricName,
      current: p.currentValue,
      predicted: p.predictedValue,
      delta: p.delta,
      unit: p.unit,
      confidence: p.confidence,
    })),
    recommendation: verdict.recommendation,
    hasFullResult: true,
  };

  return {
    id: `resp_${Date.now()}`,
    cardType: "simulation_result",
    intent,
    textSummary: `${verdict.summary} (${simulationResult.executionMs}ms)`,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: verdict.recommendation !== "reject",
    suggestedFollowups: [
      verdict.assessment === "positive" ? "Ejecutar este plan" : "Reconsiderar parámetros",
      cascades.length > 0 ? `¿Cómo afecta la cascada ${cascades[0].patternId}?` : "Simular otro escenario",
      `Crear meta basada en esta simulación`,
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — ACTION HANDLER
// ═══════════════════════════════════════════════════════════

function handleAction(
  intent: CommandIntent,
  _execCtx: CommandExecutionContext,
): CommandResponse {
  if (!intent.mcpAction) {
    return buildErrorResponse(intent, "parse_failed", "No se detectó una acción para ejecutar.");
  }

  const { server, tool, params: _params } = intent.mcpAction;

  // Validate tool exists
  if (!hasTool(server, tool)) {
    return buildErrorResponse(
      intent,
      "tool_unavailable",
      `La herramienta ${server}.${tool} no está disponible.`,
    );
  }

  const toolDef = getToolDef(server, tool);

  const data: ActionConfirmationData = {
    type: "action_confirmation",
    actionDescription: `${toolDef?.description ?? tool} (${server})`,
    server,
    tool,
    approvalLevel: toolDef?.approvalLevel ?? "auto",
    status: toolDef?.approvalLevel === "hitl" || toolDef?.approvalLevel === "semi"
      ? "pending_approval"
      : "awaiting_confirmation",
  };

  return {
    id: `resp_${Date.now()}`,
    cardType: "action_confirmation",
    intent,
    textSummary: `Acción: ${data.actionDescription} — ${data.status === "pending_approval" ? "Pendiente de aprobación" : "Lista para ejecutar"}`,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: true,
    suggestedFollowups: [
      data.status === "pending_approval" ? "Aprobar solicitud" : "Confirmar ejecución",
      "Cancelar acción",
      "Verificar resultado",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — RULE HANDLER
// ═══════════════════════════════════════════════════════════

function handleRule(
  intent: CommandIntent,
  _execCtx: CommandExecutionContext,
): CommandResponse {
  // If ruleText is provided → create/validate a new rule
  if (intent.ruleText) {
    const parsed = parseNLRule(intent.ruleText);
    if (!parsed) {
      return buildErrorResponse(
        intent,
        "parse_failed",
        "No pude entender la regla. Usá la estructura: \"Cuando [métrica] [operador] [número], [acción]\"",
        [
          'Ejemplo: "Cuando churn supere 8%, alertar al gerente"',
          'Ejemplo: "Si satisfacción baja de 60, crear alerta"',
        ],
      );
    }

    const existingRules = getCustomRules();
    const validation = validateNLRule(parsed, existingRules);

    let ruleId: string | undefined;
    if (validation.valid) {
      try {
        const saved = saveCustomRule({
          text: intent.ruleText,
          domain: parsed.domain,
          createdBy: "command",
          parseStrategy: parsed.strategy,
        });
        ruleId = saved.id;
      } catch (e) {
        return buildErrorResponse(
          intent,
          "unknown",
          e instanceof Error ? e.message : "Error al guardar la regla.",
        );
      }
    }

    const data: RuleCreatedData = {
      type: "rule_created",
      ruleText: intent.ruleText,
      valid: validation.valid,
      issues: validation.issues.map((i) => ({
        severity: i.severity,
        message: i.message,
      })),
      ruleId,
    };

    return {
      id: `resp_${Date.now()}`,
      cardType: "rule_created",
      intent,
      textSummary: validation.valid
        ? `Regla creada: "${parsed.suggestedTitle}". ${ruleId ? "Guardada y activa." : ""}`
        : `Regla con ${validation.errorCount} error(es). Revisá los problemas.`,
      data,
      parseStrategy: "deterministic",
      executionMs: 0,
      actionable: validation.valid,
      suggestedFollowups: validation.valid
        ? ["Ver mis reglas", "Crear otra regla", `Simular cuándo se activaría`]
        : ["Corregir la regla", "Ver ejemplos de reglas"],
      timestamp: Date.now(),
    };
  }

  // No rule text → list or manage rules
  const activeRules = getActiveRules();
  const allRules = getCustomRules();

  return {
    id: `resp_${Date.now()}`,
    cardType: "rule_created",
    intent,
    textSummary: `${allRules.length} regla(s) guardada(s), ${activeRules.length} activa(s).`,
    data: {
      type: "rule_created",
      ruleText: activeRules.map((r) => `• ${r.text}`).join("\n") || "Sin reglas guardadas.",
      valid: true,
      issues: [],
    },
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: false,
    suggestedFollowups: [
      'Crear regla: "Cuando churn > 8%, alertar"',
      "Ver reglas pausadas",
      "Exportar mis reglas",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — GOAL HANDLER
// ═══════════════════════════════════════════════════════════

function handleGoal(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  // If goalTarget provided → create/suggest a goal
  if (intent.goalTarget) {
    const metric = getMetricByPath(intent.goalTarget.metric);
    const currentValue = resolveMetric(execCtx.advisorContext, intent.goalTarget.metric);

    const title = `Reducir ${metric?.names[0] ?? intent.goalTarget.metric} a ${intent.goalTarget.value}${intent.goalTarget.unit}`;

    const data: GoalCreatedData = {
      type: "goal_created",
      title,
      metricName: metric?.names[0] ?? intent.goalTarget.metric,
      currentValue: currentValue ?? 0,
      targetValue: intent.goalTarget.value,
      unit: intent.goalTarget.unit,
      deadline: intent.goalTarget.deadline,
      status: "suggested",
    };

    return {
      id: `resp_${Date.now()}`,
      cardType: "goal_created",
      intent,
      textSummary: `Meta sugerida: ${title}. ${intent.goalTarget.deadline ? `Plazo: ${intent.goalTarget.deadline}` : "Sin plazo definido."}`,
      data,
      parseStrategy: "deterministic",
      executionMs: 0,
      actionable: true,
      suggestedFollowups: [
        "Derivar esta meta",
        `Simular impacto de alcanzar ${intent.goalTarget.value}${intent.goalTarget.unit}`,
        "Crear plan de acción para esta meta",
      ],
      timestamp: Date.now(),
    };
  }

  // No goal target → show existing goals
  return {
    id: `resp_${Date.now()}`,
    cardType: "goal_created",
    intent,
    textSummary: "Para crear una meta, especificá una métrica y un valor objetivo.",
    data: {
      type: "goal_created",
      title: "Sin meta definida",
      metricName: "",
      currentValue: 0,
      targetValue: 0,
      unit: "",
      status: "suggested",
    },
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: false,
    suggestedFollowups: [
      'Ejemplo: "Reducir churn a 3% en 90 días"',
      'Ejemplo: "Meta de satisfacción 85 puntos"',
      "Ver metas activas",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — REPORT HANDLER
// ═══════════════════════════════════════════════════════════

function handleReport(
  intent: CommandIntent,
  execCtx: CommandExecutionContext,
): CommandResponse {
  const reportType = intent.reportType ?? "general";
  const domain = intent.domain ?? "global";

  // Gather key metrics for the report preview
  const previewMetrics = getReportPreviewMetrics(domain, execCtx);

  // Determine which MCP tool generates this report
  const toolInfo = intent.mcpAction ?? getReportTool(reportType);

  const data: ReportPreviewData = {
    type: "report_preview",
    reportType,
    title: getReportTitle(reportType, domain),
    keyMetrics: previewMetrics,
    hasFullReport: !!toolInfo,
    toolServer: toolInfo?.server,
    toolName: toolInfo?.tool,
  };

  return {
    id: `resp_${Date.now()}`,
    cardType: "report_preview",
    intent,
    textSummary: `${data.title}: ${previewMetrics.length} métrica(s) clave(s). ${toolInfo ? `Generable con ${toolInfo.server}.${toolInfo.tool}.` : ""}`,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: !!toolInfo,
    suggestedFollowups: [
      toolInfo ? "Generar reporte completo" : "Ver más detalles",
      `Analizar ${domain === "global" ? "todo el club" : domain}`,
      "Exportar datos",
    ],
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 10 — HELPERS
// ═══════════════════════════════════════════════════════════

function buildErrorResponse(
  intent: CommandIntent,
  errorCode: "parse_failed" | "metric_not_found" | "tool_unavailable" | "permission_denied" | "unknown",
  errorMessage: string,
  suggestions?: string[],
): CommandResponse {
  const data: ErrorData = {
    type: "error",
    errorMessage,
    errorCode,
    suggestion: suggestions?.[0] ?? "Intentá reformular el comando.",
  };

  return {
    id: `resp_${Date.now()}`,
    cardType: "error",
    intent,
    textSummary: errorMessage,
    data,
    parseStrategy: "deterministic",
    executionMs: 0,
    actionable: false,
    suggestedFollowups: suggestions ?? [
      'Probá: "¿Cuál es el churn?"',
      'Probá: "Simula aumento de cuotas 10%"',
      'Probá: "Generar reporte ejecutivo"',
    ],
    timestamp: Date.now(),
  };
}

function getReportPreviewMetrics(
  domain: AIDomain | "global",
  execCtx: CommandExecutionContext,
): Array<{ name: string; value: string; trend?: string }> {
  const metricPaths = getDomainMetricPaths(domain);
  return metricPaths
    .map((path) => {
      const metric = getMetricByPath(path);
      const value = resolveMetric(execCtx.advisorContext, path);
      if (!metric || value === null) return null;
      return {
        name: metric.names[0],
        value: metric.unit === "₡"
          ? `₡${value.toLocaleString("es-CR")}`
          : metric.unit === "%"
            ? `${value.toFixed(1)}%`
            : `${Math.round(value)} ${metric.unit}`,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .slice(0, 5);
}

function getDomainMetricPaths(domain: AIDomain | "global"): string[] {
  const map: Record<string, string[]> = {
    financial: [
      "summary.financial.total_revenue",
      "summary.financial.total_expenses",
      "summary.financial.margin_pct",
    ],
    engagement: [
      "summary.membership.churn_rate",
      "summary.membership.retention_rate",
      "summary.membership.total_members",
      "summary.membership.guest_visits",
    ],
    events: [
      "summary.operational.total_events",
      "summary.operational.occupancy_rate",
      "summary.operational.attendance_rate",
    ],
    satisfaction: [
      "summary.operational.satisfaction_score",
      "summary.operational.wellness_score",
    ],
    global: [
      "summary.membership.churn_rate",
      "summary.financial.total_revenue",
      "summary.operational.satisfaction_score",
      "summary.membership.retention_rate",
      "summary.operational.occupancy_rate",
    ],
  };
  return map[domain] ?? map.global;
}

function getReportTool(reportType: string): { server: string; tool: string } | undefined {
  const map: Record<string, { server: string; tool: string }> = {
    executive: { server: "executive_dashboard", tool: "generate_quarterly_board_report" },
    financial: { server: "finance", tool: "generate_ai_analysis" },
    anomaly: { server: "ml_intelligence", tool: "get_anomaly_report" },
    general: { server: "executive_dashboard", tool: "export_report" },
  };
  return map[reportType] ?? map.general;
}

function getReportTitle(reportType: string, domain: string): string {
  const map: Record<string, string> = {
    executive: "Reporte Ejecutivo",
    financial: "Reporte Financiero",
    events: "Reporte de Eventos",
    membership: "Reporte de Membresía",
    anomaly: "Reporte de Anomalías",
    wellness: "Reporte de Bienestar",
    general: `Reporte General${domain !== "global" ? ` — ${domain}` : ""}`,
  };
  return map[reportType] ?? `Reporte — ${domain}`;
}

function inferDomainFromSignal(signalType: string): AIDomain | "global" {
  if (signalType.startsWith("fin_")) return "financial";
  if (signalType.startsWith("evt_")) return "events";
  if (signalType.startsWith("eng_") || signalType.startsWith("guest_")) return "engagement";
  if (signalType.startsWith("sat_") || signalType.startsWith("ops_")) return "satisfaction";
  if (signalType.startsWith("spt_")) return "sports";
  if (signalType.startsWith("comm_")) return "communication";
  if (signalType.startsWith("age_")) return "family";
  return "global";
}