// src/shared/lib/advisor-engine/mcp-tool-registry.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — MCP Tool Registry (C1 Fix)
//
// The autonomous advisor's brain for tool awareness.
// Before building a plan, the system checks what tools
// actually exist. Before executing a step, it validates
// the tool is available.
//
// Each tool is tagged with:
//   - domain: which advisor domain it belongs to
//   - intents: what it can do (diagnose/analyze/recommend/execute/verify)
//   - confirmed: is it actually used in the codebase?
//
// The plan builder uses this registry to create plans
// that reference REAL tools, not fictitious ones.
//
// Depends on: nothing (pure data + pure functions)
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — TYPES
// ═══════════════════════════════════════════════════════════

/**
 * What a tool can do. Plans are built as
 * diagnose → analyze → recommend → execute → verify.
 */
export type ToolIntent =
  | "diagnose"   // Get current state
  | "analyze"    // Deep analysis, patterns, predictions
  | "recommend"  // Generate recommendations or plans
  | "execute"    // Take action (create, send, modify)
  | "verify";    // Check results, measure impact

/**
 * Definition of an available MCP tool.
 */
export interface MCPToolDef {
  /** MCP server (agent) name */
  server: string;
  /** Tool name within the server */
  tool: string;
  /** Human-readable description */
  description: string;
  /** Primary domain this tool serves */
  domain: AIDomain | "global";
  /** What intents this tool fulfills */
  intents: ToolIntent[];
  /** Build params from a goal context */
  buildParams: (context: {
    goalTitle?: string;
    metricName?: string;
    currentValue?: number;
    targetValue?: number;
    gap?: number;
    period?: string;
  }) => Record<string, unknown>;
  /** Default approval level for this tool */
  approvalLevel: "auto" | "semi" | "hitl";
  /** Estimated impact of calling this tool */
  estimatedImpact: "low" | "medium" | "high";
  /** Confirmed in codebase vs estimated */
  confirmed: boolean;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — TOOL CATALOG
// ═══════════════════════════════════════════════════════════

/**
 * ALL available MCP tools, confirmed from codebase usage.
 * Tools marked `confirmed: false` are estimated — verify before production.
 */
const TOOL_CATALOG: MCPToolDef[] = [
  // ── Executive Dashboard ──
  {
    server: "executive_dashboard",
    tool: "get_executive_summary",
    description: "Obtener resumen ejecutivo completo del club",
    domain: "global",
    intents: ["diagnose", "verify"],
    buildParams: (ctx) => ({ period: ctx.period ?? "current_quarter" }),
    approvalLevel: "auto",
    estimatedImpact: "low",
    confirmed: true,
  },
  {
    server: "executive_dashboard",
    tool: "detect_anomalies",
    description: "Detectar anomalías operativas automáticamente",
    domain: "global",
    intents: ["analyze"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "medium",
    confirmed: true,
  },
  {
    server: "executive_dashboard",
    tool: "get_age_group_balance",
    description: "Analizar distribución demográfica del club",
    domain: "family",
    intents: ["diagnose", "analyze"],
    buildParams: (ctx) => ({ period: ctx.period ?? "current_quarter" }),
    approvalLevel: "auto",
    estimatedImpact: "low",
    confirmed: true,
  },
  {
    server: "executive_dashboard",
    tool: "generate_quarterly_board_report",
    description: "Generar informe trimestral para la junta directiva",
    domain: "global",
    intents: ["execute"],
    buildParams: () => ({
      year: new Date().getFullYear(),
      quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
      requested_by: "autonomous_advisor",
    }),
    approvalLevel: "hitl",
    estimatedImpact: "high",
    confirmed: true,
  },
  {
    server: "executive_dashboard",
    tool: "export_report",
    description: "Exportar reporte ejecutivo en PDF/Excel/CSV",
    domain: "global",
    intents: ["execute"],
    buildParams: (_ctx) => ({
      report_type: "executive_summary",
      export_format: "pdf",
      audience: "internal",
    }),
    approvalLevel: "semi",
    estimatedImpact: "medium",
    confirmed: true,
  },

  // ── Finance ──
  {
    server: "finance",
    tool: "generate_ai_analysis",
    description: "Generar análisis financiero con IA",
    domain: "financial",
    intents: ["diagnose", "analyze"],
    buildParams: () => ({ scope: "financial" }),
    approvalLevel: "auto",
    estimatedImpact: "medium",
    confirmed: true,
  },

  // ── Events ──
  {
    server: "events",
    tool: "event_get_calendar",
    description: "Obtener calendario de eventos",
    domain: "events",
    intents: ["diagnose"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "low",
    confirmed: true,
  },

  // ── HITL ──
  {
    server: "hitl",
    tool: "get_pending_approvals",
    description: "Obtener solicitudes pendientes de aprobación",
    domain: "global",
    intents: ["diagnose"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "low",
    confirmed: true,
  },
  {
    server: "hitl",
    tool: "approve_request",
    description: "Aprobar solicitud pendiente",
    domain: "global",
    intents: ["execute"],
    buildParams: (ctx) => ({
      goal: ctx.goalTitle,
      metric: ctx.metricName,
      gap: ctx.gap,
    }),
    approvalLevel: "hitl",
    estimatedImpact: "high",
    confirmed: true,
  },

  // ── Advisor Intelligence ──
  {
    server: "advisor_intelligence",
    tool: "generate_action_plan",
    description: "Generar plan de acción basado en insights",
    domain: "global",
    intents: ["recommend"],
    buildParams: (_ctx) => ({
      insights: [],
      role: "admin",
      timeframe: "week",
    }),
    approvalLevel: "semi",
    estimatedImpact: "high",
    confirmed: true,
  },
  {
    server: "advisor_intelligence",
    tool: "generate_board_brief",
    description: "Generar briefing ejecutivo para la junta",
    domain: "global",
    intents: ["recommend", "execute"],
    buildParams: () => ({}),
    approvalLevel: "semi",
    estimatedImpact: "high",
    confirmed: true,
  },

  // ── ML Intelligence ──
  {
    server: "ml_intelligence",
    tool: "get_churn_ml_scores",
    description: "Obtener scores de riesgo de churn con ML",
    domain: "engagement",
    intents: ["analyze"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "medium",
    confirmed: true,
  },
  {
    server: "ml_intelligence",
    tool: "get_revenue_forecast",
    description: "Obtener pronóstico de revenue con ML",
    domain: "financial",
    intents: ["analyze"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "medium",
    confirmed: true,
  },
  {
    server: "ml_intelligence",
    tool: "get_anomaly_report",
    description: "Obtener reporte de anomalías detectadas por ML",
    domain: "global",
    intents: ["analyze"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "medium",
    confirmed: true,
  },
  {
    server: "ml_intelligence",
    tool: "get_data_quality_report",
    description: "Obtener reporte de calidad de datos",
    domain: "global",
    intents: ["verify"],
    buildParams: () => ({}),
    approvalLevel: "auto",
    estimatedImpact: "low",
    confirmed: true,
  },
];

// ═══════════════════════════════════════════════════════════
// SECTION 3 — LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════

/** Build a lookup key for fast access. */
function toolKey(server: string, tool: string): string {
  return `${server}::${tool}`;
}

/** Index: "server::tool" → MCPToolDef */
const TOOL_INDEX = new Map<string, MCPToolDef>(
  TOOL_CATALOG.map((t) => [toolKey(t.server, t.tool), t]),
);

/** Check if a tool exists in the registry. */
export function hasTool(server: string, tool: string): boolean {
  return TOOL_INDEX.has(toolKey(server, tool));
}

/** Get a tool definition. */
export function getToolDef(
  server: string,
  tool: string,
): MCPToolDef | undefined {
  return TOOL_INDEX.get(toolKey(server, tool));
}

/** Get all tools for a domain. */
export function getToolsForDomain(domain: AIDomain | "global"): MCPToolDef[] {
  return TOOL_CATALOG.filter((t) => t.domain === domain || t.domain === "global");
}

/** Get tools that match a specific intent within a domain. */
export function getToolsForIntent(
  domain: AIDomain | "global",
  intent: ToolIntent,
): MCPToolDef[] {
  return TOOL_CATALOG.filter(
    (t) =>
      (t.domain === domain || t.domain === "global") &&
      t.intents.includes(intent),
  ).sort((a, b) => (a.confirmed === b.confirmed ? 0 : a.confirmed ? -1 : 1));
}

/** Find the best tool for a domain + intent combo. Prefers confirmed tools. */
export function findBestTool(
  domain: AIDomain | "global",
  intent: ToolIntent,
): MCPToolDef | null {
  const tools = getToolsForIntent(domain, intent);
  if (tools.length > 0) return tools[0];

  // Fallback to "global" domain
  if (domain !== "global") {
    const globalTools = getToolsForIntent("global", intent);
    if (globalTools.length > 0) return globalTools[0];
  }

  return null;
}

/**
 * Find an alternative tool when the requested one doesn't exist.
 * Strategy: same domain + any intent, or global fallback.
 */
export function findAlternativeTool(
  _server: string,
  _tool: string,
  domain: AIDomain | "global",
): MCPToolDef | null {
  // Same domain, any confirmed tool
  const domainTools = getToolsForDomain(domain).filter((t) => t.confirmed);
  if (domainTools.length > 0) return domainTools[0];

  // Global fallback
  const globalTools = getToolsForDomain("global").filter((t) => t.confirmed);
  if (globalTools.length > 0) return globalTools[0];

  return null;
}

/** Get total count of registered tools. */
export function getToolCount(): number {
  return TOOL_CATALOG.length;
}

/** Get count of confirmed tools. */
export function getConfirmedToolCount(): number {
  return TOOL_CATALOG.filter((t) => t.confirmed).length;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — PLAN STEP RESOLUTION
// ═══════════════════════════════════════════════════════════

/**
 * The plan intent sequence. Every goal goes through these phases.
 * The system finds the best tool for each phase given the goal's domain.
 */
const PLAN_INTENT_SEQUENCE: ToolIntent[] = [
  "diagnose",
  "analyze",
  "recommend",
  "execute",
];

/**
 * Resolve plan steps for a goal using the tool registry.
 * This REPLACES hardcoded domain templates with intelligent tool selection.
 *
 * @returns Array of step definitions (not yet PlanSteps — needs goalId)
 */
export function resolvePlanTools(
  domain: AIDomain | "global",
  goalContext: {
    goalTitle?: string;
    metricName?: string;
    currentValue?: number;
    targetValue?: number;
    gap?: number;
    period?: string;
  },
): Array<{
  tool: MCPToolDef;
  intent: ToolIntent;
  label: string;
  description: string;
}> {
  const steps: Array<{
    tool: MCPToolDef;
    intent: ToolIntent;
    label: string;
    description: string;
  }> = [];

  const intentLabels: Record<ToolIntent, string> = {
    diagnose: "Diagnosticar",
    analyze: "Analizar",
    recommend: "Recomendar",
    execute: "Ejecutar",
    verify: "Verificar",
  };

  for (const intent of PLAN_INTENT_SEQUENCE) {
    const tool = findBestTool(domain, intent);
    if (!tool) continue;

    steps.push({
      tool,
      intent,
      label: `${intentLabels[intent]}: ${goalContext.metricName ?? domain}`,
      description: tool.description,
    });
  }

  // If we couldn't find any tools, use global fallback
  if (steps.length === 0) {
    const fallback = findBestTool("global", "diagnose");
    if (fallback) {
      steps.push({
        tool: fallback,
        intent: "diagnose",
        label: `Diagnosticar: ${goalContext.metricName ?? domain}`,
        description: fallback.description,
      });
    }
  }

  return steps;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — TOOL VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate that all steps in a plan reference real tools.
 * Returns warnings for any steps with unconfirmed tools.
 */
export function validatePlanTools(
  steps: Array<{ server: string; tool: string }>,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  for (const step of steps) {
    const def = getToolDef(step.server, step.tool);
    if (!def) {
      warnings.push(
        `Tool ${step.server}.${step.tool} no está en el registry. Puede fallar en runtime.`,
      );
    } else if (!def.confirmed) {
      warnings.push(
        `Tool ${step.server}.${step.tool} no está confirmada en el codebase.`,
      );
    }
  }

  return { valid: warnings.length === 0, warnings };
}