// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Financial Domain Rules
//
// 18 declarative rules migrated from useFinancialAdvisor (F18→F47).
// Organized in 3 layers: macro (1-12), micro (13-16), fusion (17-18).
//
// Architecture:
//   RuleDefinition<FinancialContext> — pure functions, testable
//   buildFinancialCtx() — derives metrics from raw MCP data
//   FINANCIAL_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: fin_revenue_decline, fin_margin_pressure (P54)
//
// Data source annotations preserved from F18:
//   Macro (1-12):  BACKEND REAL ✅ (generate_ai_analysis)
//   Micro (13-16): MOCK-ONLY ⚠️ (get_financial_summary)
//   Fusion (17-18): MIXED
//
// Created: F47 — Financial Rules Migration
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";
import type { BaseContext, RuleDefinition, SignalDefinition, HealthFactorDef } from "../types";
import { buildInsight } from "../evaluate";
// confidence presets available if needed: import { computeConfidence, CONFIDENCE_PRESETS } from "../confidence";

import type {
  AiFinancialReport,
  FinancialSummary,
} from "@/features/finance/types";
import { SEASON_CONFIG } from "@/features/finance/types";
import { compactCurrency, getCurrentSeason } from "@/shared/lib/utils";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface FinancialContext extends BaseContext {
  domain: "financial";

  // ── Raw inputs ──
  aiReport: AiFinancialReport | null | undefined;
  summary: FinancialSummary | null | undefined;

  // ── Computed metrics (pre-computed for rule conditions) ──
  healthScore: number | undefined;
  healthGrade: string | undefined;
  worstFactorName: string | undefined;
  worstFactorScore: number | undefined;
  worstFactorDetail: string | undefined;
  marginPct: number;
  negCFPeriod: { label: string; cumulative_cash: number } | undefined;
  confidenceBandPct: number | undefined;
  criticalAnomalyCount: number;
  criticalAnomalyImpact: number;
  criticalAnomalyFirstAction: string | undefined;
  diversificationIndex: number | undefined;
  hhi: number | undefined;
  topSourceLabel: string | undefined;
  topSourceSharePct: number | undefined;
  quickWinCount: number;
  quickWinImpact: number;
  quickWinFirstAction: string | undefined;
  season: ReturnType<typeof getCurrentSeason>;
  currentMonthName: string;
  ltvCacRatio: number;
  ltvEstimate: number;
  cacEstimate: number;
  budgetAnomalyCount: number;
  budgetAnomalyTotalOverrun: number;
  budgetAnomalyTitles: string[];
  positiveTrendCount: number;
  positiveTrendFirstTitle: string | undefined;
  positiveTrendFirstDetail: string | undefined;
  safeAnomalyCount: number;
  safeRecCount: number;
  safeTrendCount: number;
  safeAlertCount: number;
  criticalAlertCount: number;
  criticalAlertFirstTitle: string | undefined;
  criticalAlertFirstDetail: string | undefined;
  decliningSourceCount: number;
  decliningSourcesLabel: string;
  marginTrend: number[];
  netIncomeTrend: number[];
  hasBudgetAnomalies: boolean;
  overBudgetFusionCount: number;
  overBudgetFusionLabels: string;
  overBudgetFusionOverlap: Array<{ label: string }>;
  hasNegCF: boolean;
  hasNegNetTrend: boolean;
}

export function buildFinancialCtx(
  rawData: unknown,
  signals?: readonly import("../types").DomainSignal[],
): FinancialContext {
  const { aiReport, summary } = rawData as {
    aiReport: AiFinancialReport | null | undefined;
    summary: FinancialSummary | null | undefined;
  };

  const health = aiReport?.health_score;
  const cf = aiReport?.cash_flow_forecast;
  const conc = aiReport?.revenue_concentration;
  const anomalies = aiReport?.financial_anomalies ?? [];
  const recs = aiReport?.recommendations ?? [];
  const trends = aiReport?.positive_trends ?? [];
  const alerts = aiReport?.alert_signals ?? [];
  const cfPeriods = cf?.periods ?? [];
  const sources = conc?.sources ?? [];
  const healthFactors = health?.factors ?? [];
  const mbr = aiReport?.member_economics;

  // ── Derived metrics ──
  const revenue = mbr?.avg_revenue_per_member ?? 0;
  const marginAbs = mbr?.avg_margin_per_member ?? 0;
  const marginPct = revenue > 0 ? (marginAbs / revenue) * 100 : 0;

  const negPeriods = cfPeriods.filter((p) => p.cumulative_cash < 0);

  const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");

  const budgetAnomalies = anomalies.filter((a) => a.domain === "budget");

  const quickWins = recs.filter(
    (r) =>
      r.implementation_effort === "low" &&
      (r.priority === "high" || r.priority === "critical"),
  );

  const criticalAlerts = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "high",
  );

  const decliningSources = (summary?.revenue_by_category ?? []).filter(
    (c) => c.trend_pct < -5,
  );

  const MONTH_NAMES = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  // ── Trend data for micro + fusion rules ──
  const expCats = summary?.expense_by_category ?? [];
  const monthlyTrend = summary?.monthly_trend ?? [];
  const last3 = monthlyTrend.slice(-3);

  const marginTrend = last3.map((m) =>
    m.revenue > 0 ? (m.net / m.revenue) * 100 : 0,
  );
  const netIncomeTrend = last3.map((m) => m.net);

  // ── Fusion rule 17: overlap detection ──
  const overBudgetFusion = expCats.filter((c) => c.variance_pct > 15);
  const overBudgetFusionOverlap = overBudgetFusion.filter((c) =>
    budgetAnomalies.some(
      (a) =>
        a.title.toLowerCase().includes(c.category?.toLowerCase() ?? "") ||
        a.title.toLowerCase().includes(c.label.toLowerCase()),
    ),
  );

  // ── Worst health factor ──
  const sortedFactors = [...healthFactors].sort(
    (a, b) => a.score - b.score,
  );
  const worst = sortedFactors[0];

  return {
    domain: "financial",
    signals: signals ?? [],

    aiReport,
    summary,

    healthScore: health?.total,
    healthGrade: health?.grade,
    worstFactorName: worst?.name,
    worstFactorScore: worst?.score,
    worstFactorDetail: worst?.detail,

    marginPct,
    negCFPeriod: negPeriods[0],
    confidenceBandPct: cf?.confidence_band_pct,

    criticalAnomalyCount: criticalAnomalies.length,
    criticalAnomalyImpact: criticalAnomalies.reduce(
      (s, a) => s + (a.estimated_annual_impact ?? 0),
      0,
    ),
    criticalAnomalyFirstAction: criticalAnomalies[0]?.suggested_action,

    diversificationIndex: conc?.diversification_index,
    hhi: conc?.herfindahl_index,
    topSourceLabel: sources.length > 0
      ? [...sources].sort((a, b) => b.share_pct - a.share_pct)[0]?.label
      : undefined,
    topSourceSharePct: sources.length > 0
      ? [...sources].sort((a, b) => b.share_pct - a.share_pct)[0]?.share_pct
      : undefined,

    quickWinCount: quickWins.length,
    quickWinImpact: quickWins.reduce(
      (s, r) => s + (r.estimated_impact_annual ?? 0),
      0,
    ),
    quickWinFirstAction: quickWins[0]?.action,

    season: getCurrentSeason(),
    currentMonthName: MONTH_NAMES[new Date().getMonth()] ?? "",

    ltvCacRatio: mbr?.ltv_cac_ratio ?? 0,
    ltvEstimate: mbr?.ltv_estimate ?? 0,
    cacEstimate: mbr?.cac_estimate ?? 0,

    budgetAnomalyCount: budgetAnomalies.length,
    budgetAnomalyTotalOverrun: budgetAnomalies.reduce(
      (s, a) => s + Math.abs(a.estimated_annual_impact ?? 0),
      0,
    ),
    budgetAnomalyTitles: budgetAnomalies.map((a) =>
      a.title.replace("Sobrepresupuesto: ", ""),
    ),

    positiveTrendCount: trends.length,
    positiveTrendFirstTitle: trends[0]?.title,
    positiveTrendFirstDetail: trends[0]?.detail,

    safeAnomalyCount: anomalies.length,
    safeRecCount: recs.length,
    safeTrendCount: trends.length,
    safeAlertCount: alerts.length,

    criticalAlertCount: criticalAlerts.length,
    criticalAlertFirstTitle: criticalAlerts[0]?.title,
    criticalAlertFirstDetail: criticalAlerts[0]?.detail,

    decliningSourceCount: decliningSources.length,
    decliningSourcesLabel: decliningSources
      .map((c) => `${c.label} (${c.trend_pct > 0 ? "+" : ""}${c.trend_pct.toFixed(0)}%)`)
      .join(", "),

    marginTrend,
    netIncomeTrend,

    hasBudgetAnomalies: budgetAnomalies.length > 0,
    overBudgetFusionCount: overBudgetFusion.length,
    overBudgetFusionLabels: overBudgetFusion.map((c) => c.label).join(", "),
    overBudgetFusionOverlap,
    hasNegCF: cfPeriods.some((p) => p.cumulative_cash < 0),
    hasNegNetTrend: netIncomeTrend.length >= 3 && isStrictlyDescending(netIncomeTrend),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

const FIN_REVENUE_DECLINE: SignalDefinition = {
  id: "fin_revenue_decline",
  targetDomains: ["global", "communication"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Revenue decline detected in financial analysis",
  ttl: 300_000,
};

const FIN_MARGIN_PRESSURE: SignalDefinition = {
  id: "fin_margin_pressure",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Margin pressure — below private club benchmark",
  ttl: 300_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  HEALTH_CRITICAL: 55,
  MARGIN_LOW_PCT: 15,
  DIVERSIFICATION_LOW: 0.5,
  LTV_CAC_LOW: 3.0,
  VARIANCE_OVER_BUDGET_PCT: 10,
  VARIANCE_FUSION_PCT: 15,
  REVENUE_DECLINE_PCT: -5,
  CONSECUTIVE_MONTHS: 3,
} as const;

// ── Helpers ──

function isStrictlyDescending(values: number[]): boolean {
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    if (prev == null || curr == null || curr >= prev) return false;
  }
  return values.length >= 2;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (18 rules × 3 layers)
//
// Priority order: macro (100) < micro (200) < fusion (300)
// Each rule is a pure function: FinancialContext → AdvisorInsightBase | null
// ═══════════════════════════════════════════════════════════

const R1_HEALTH_CRITICAL: RuleDefinition<FinancialContext> = {
  id: "R1_HEALTH_CRITICAL",
  name: "Health Score crítico",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.healthScore == null || ctx.healthScore >= THRESHOLDS.HEALTH_CRITICAL) return null;
    return buildInsight({
      id: generateInsightId("financial", "R1_HEALTH_CRITICAL"),
      impact: "high",
      title: `Salud financiera: ${ctx.healthGrade ?? "?"} (${Math.round(ctx.healthScore)}/100)`,
      reasoning: `Factor más débil: ${ctx.worstFactorName ?? "—"} (${ctx.worstFactorScore?.toFixed(0) ?? "—"}/100). ${ctx.worstFactorDetail ?? ""}`,
      confidence: 95,
      target_view: "analytics",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "current_quarter", focus: "health" },
        approval_level: "semi",
        label: "Generar reporte de salud financiera",
        confirm_message: `Se generará un reporte detallado. Score actual: ${Math.round(ctx.healthScore)}/100, grado: ${ctx.healthGrade ?? "?"}.`,
        estimated_impact: `Claridad sobre salud financiera (${ctx.healthGrade ?? "?"})`,
      },
    });
  },
};

const R2_MARGIN_LOW: RuleDefinition<FinancialContext> = {
  id: "R2_MARGIN_LOW",
  name: "Margen bajo benchmark",
  layer: "macro",
  domain: "financial",
  priority: 100,
  emitSignals: [FIN_MARGIN_PRESSURE],
  evaluate: (ctx) => {
    if (ctx.marginPct <= 0 || ctx.marginPct >= THRESHOLDS.MARGIN_LOW_PCT) return null;
    return buildInsight({
      id: generateInsightId("financial", "R2_MARGIN_LOW"),
      impact: "high",
      title: `Margen operativo ${ctx.marginPct.toFixed(1)}%`,
      reasoning: `Por debajo del benchmark de club privado (15–25%).`,
      confidence: 90,
      target_view: "analytics",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "current_quarter", focus: "margins" },
        approval_level: "semi",
        label: "Analizar estructura de costos",
        confirm_message: `Margen de ${ctx.marginPct.toFixed(1)}% por debajo del benchmark (15–25%). Se generará análisis de estructura de costos.`,
        estimated_impact: "Identificar oportunidades de mejora de margen",
      },
    });
  },
};

const R3_CASHFLOW_NEGATIVE: RuleDefinition<FinancialContext> = {
  id: "R3_CASHFLOW_NEGATIVE",
  name: "Cash flow negativo proyectado",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (!ctx.negCFPeriod) return null;
    return buildInsight({
      id: generateInsightId("financial", "R3_CASHFLOW_NEGATIVE"),
      impact: "high",
      title: `Cash flow negativo en ${ctx.negCFPeriod.label}`,
      reasoning: `Déficit acumulado proyectado: ${compactCurrency(ctx.negCFPeriod.cumulative_cash)}. Banda de confianza: ${ctx.confidenceBandPct ?? "—"}%.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
          action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "next_quarter", focus: "cash_flow" },
        approval_level: "semi",
        label: "Generar plan de flujo de caja",
        confirm_message: `Se proyecta cash flow negativo en ${ctx.negCFPeriod.label}. Se generará plan de mitigación.`,
        estimated_impact: `Prevenir déficit de ${compactCurrency(ctx.negCFPeriod.cumulative_cash)}`,
      },
    });
  },
};

const R4_ANOMALIES_CRITICAL: RuleDefinition<FinancialContext> = {
  id: "R4_ANOMALIES_CRITICAL",
  name: "Anomalías críticas",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.criticalAnomalyCount === 0) return null;
    return buildInsight({
      id: generateInsightId("financial", "R4_ANOMALIES_CRITICAL"),
      impact: "high",
      title: `${ctx.criticalAnomalyCount} anomalía(s) crítica(s)`,
      reasoning: `Impacto anual estimado: ${compactCurrency(ctx.criticalAnomalyImpact)}. ${ctx.criticalAnomalyFirstAction ?? ""}`,
      confidence: 90,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "current_quarter", focus: "anomalies" },
        approval_level: "semi",
        label: "Generar reporte de anomalías",
        confirm_message: `Se generará un reporte detallado de ${ctx.criticalAnomalyCount} anomalías críticas con impacto de ${compactCurrency(ctx.criticalAnomalyImpact)}/año.`,
        estimated_impact: `Claridad sobre ${compactCurrency(ctx.criticalAnomalyImpact)} en anomalías`,
      },
    });
  },
};

const R5_CONCENTRATION_RISK: RuleDefinition<FinancialContext> = {
  id: "R5_CONCENTRATION_RISK",
  name: "Concentración de riesgo",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (
      ctx.diversificationIndex == null ||
      ctx.diversificationIndex <= 0 ||
      ctx.diversificationIndex >= THRESHOLDS.DIVERSIFICATION_LOW
    )
      return null;
    return buildInsight({
      id: generateInsightId("financial", "R5_CONCENTRATION_RISK"),
      impact: "medium",
      title: "Ingresos altamente concentrados",
      reasoning: `HHI: ${ctx.hhi?.toFixed(0) ?? "—"}. Diversificación: ${(ctx.diversificationIndex * 100).toFixed(0)}%. Fuente principal: ${ctx.topSourceLabel ?? "—"} (${ctx.topSourceSharePct ?? 0}%).`,
      confidence: 80,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "current_quarter", focus: "revenue_diversification" },
        approval_level: "semi",
        label: "Analizar diversificación de ingresos",
        confirm_message: `Ingresos concentrados (HHI: ${ctx.hhi?.toFixed(0) ?? "?"}). Se generará análisis de diversificación.`,
        estimated_impact: "Identificar oportunidades de diversificación de ingresos",
      },
    });
  },
};

const R6_QUICK_WINS: RuleDefinition<FinancialContext> = {
  id: "R6_QUICK_WINS",
  name: "Quick wins disponibles",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.quickWinCount === 0) return null;
    return buildInsight({
      id: generateInsightId("financial", "R6_QUICK_WINS"),
      impact: "medium",
      title: `${ctx.quickWinCount} quick win(s) disponibles`,
      reasoning: `Acciones de bajo esfuerzo y alto impacto. Impacto combinado: ${compactCurrency(ctx.quickWinImpact)}/año. ${ctx.quickWinFirstAction ?? ""}`,
      confidence: 75,
      target_view: "intelligence",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_report_generate",
        params: { period: "current_quarter", focus: "quick_wins" },
        approval_level: "semi",
        label: "Generar reporte de quick wins",
        confirm_message: `Se generará un reporte enfocado en ${ctx.quickWinCount} quick wins con impacto combinado de ${compactCurrency(ctx.quickWinImpact)}/año.`,
        estimated_impact: `${compactCurrency(ctx.quickWinImpact)}/año en quick wins identificados`,
      },
    });
  },
};

const R7_SEASONAL: RuleDefinition<FinancialContext> = {
  id: "R7_SEASONAL",
  name: "Estacionalidad",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.season !== "transition") return null;
    const seasonCfg = SEASON_CONFIG[ctx.season];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return buildInsight({
      id: generateInsightId("financial", "R7_SEASONAL"),
      impact: "low",
      title: `Transición estacional — ${ctx.currentMonthName}`,
      reasoning: `Factor estacional: ${seasonCfg.factor > 1 ? "+" : ""}${((seasonCfg.factor - 1) * 100).toFixed(0)}%. Meses de la próxima temporada: ${seasonCfg.months.map((m) => monthNames[m - 1]).join(", ")}.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R8_LTV_CAC: RuleDefinition<FinancialContext> = {
  id: "R8_LTV_CAC",
  name: "LTV/CAC bajo",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.ltvCacRatio <= 0 || ctx.ltvCacRatio >= THRESHOLDS.LTV_CAC_LOW) return null;
    return buildInsight({
      id: generateInsightId("financial", "R8_LTV_CAC"),
      impact: "medium",
      title: `LTV/CAC: ${ctx.ltvCacRatio.toFixed(1)}x`,
      reasoning: `Por debajo del benchmark saludable (3.0x+). LTV: ${compactCurrency(ctx.ltvEstimate)}, CAC: ${compactCurrency(ctx.cacEstimate)}. Revisar estrategia de adquisición y retención.`,
      confidence: 70,
      target_view: "intelligence",
    });
  },
};

const R9_BUDGET_OVERRUN: RuleDefinition<FinancialContext> = {
  id: "R9_BUDGET_OVERRUN",
  name: "Budget overrun múltiple",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.budgetAnomalyCount < 2) return null;
    return buildInsight({
      id: generateInsightId("financial", "R9_BUDGET_OVERRUN"),
      impact: "medium",
      title: `${ctx.budgetAnomalyCount} categorías sobre presupuesto`,
      reasoning: `Impacto combinado: ${compactCurrency(ctx.budgetAnomalyTotalOverrun)}/año. Categorías: ${ctx.budgetAnomalyTitles.join(", ")}.`,
      confidence: 85,
      target_view: "tools",
      action: {
        action: "execute",
        type: "mutate",
        server: "finance",
        tool: "finance_category_update",
        params: { review: true, categories: ctx.budgetAnomalyTitles },
        approval_level: "semi",
        label: "Revisar categorías presupuestarias",
        confirm_message: `Se abrirá la revisión de ${ctx.budgetAnomalyCount} categorías presupuestarias excedidas. Impacto: ${compactCurrency(ctx.budgetAnomalyTotalOverrun)}/año.`,
        estimated_impact: `Reducir sobregiro de ${compactCurrency(ctx.budgetAnomalyTotalOverrun)}/año`,
      },
    });
  },
};

const R10_POSITIVE_TRENDS: RuleDefinition<FinancialContext> = {
  id: "R10_POSITIVE_TRENDS",
  name: "Tendencias positivas",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.positiveTrendCount < 2) return null;
    return buildInsight({
      id: generateInsightId("financial", "R10_POSITIVE_TRENDS"),
      impact: "low",
      title: `${ctx.positiveTrendCount} tendencias positivas activas`,
      reasoning: `Momentum favorable: ${ctx.positiveTrendFirstTitle ?? ""}. ${ctx.positiveTrendFirstDetail ?? ""}`,
      confidence: 65,
      target_view: "overview",
    });
  },
};

const R11_STALE_ANALYSIS: RuleDefinition<FinancialContext> = {
  id: "R11_STALE_ANALYSIS",
  name: "Análisis sin datos significativos",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (
      ctx.safeAnomalyCount > 0 ||
      ctx.safeRecCount > 0 ||
      ctx.safeTrendCount > 0 ||
      ctx.safeAlertCount > 0
    )
      return null;
    return buildInsight({
      id: generateInsightId("financial", "R11_STALE_ANALYSIS"),
      impact: "medium",
      title: "Análisis sin datos significativos",
      reasoning:
        "El análisis no detectó anomalías, recomendaciones ni tendencias. Regenerá para datos frescos.",
      confidence: 60,
      target_view: "intelligence",
    });
  },
};

const R12_ALERTS: RuleDefinition<FinancialContext> = {
  id: "R12_ALERTS",
  name: "Alert signals activos",
  layer: "macro",
  domain: "financial",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.criticalAlertCount === 0) return null;
    return buildInsight({
      id: generateInsightId("financial", "R12_ALERTS"),
      impact: "high",
      title: `${ctx.criticalAlertCount} señal(es) de alerta activa(s)`,
      reasoning: `${ctx.criticalAlertFirstTitle ?? ""}: ${ctx.criticalAlertFirstDetail ?? ""}`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R13_EXPENSE_OVERRUN: RuleDefinition<FinancialContext> = {
  id: "R13_EXPENSE_OVERRUN",
  name: "Múltiples rubros exceden presupuesto",
  layer: "micro",
  domain: "financial",
  priority: 200,
  evaluate: (ctx) => {
    if (!ctx.summary) return null;
    const overBudget = (ctx.summary.expense_by_category ?? []).filter(
      (c) => c.variance_pct > THRESHOLDS.VARIANCE_OVER_BUDGET_PCT,
    );
    if (overBudget.length < 2) return null;
    const totalOverrun = overBudget.reduce((s, c) => s + (c.variance ?? 0), 0);
    return buildInsight({
      id: generateInsightId("financial", "R13_EXPENSE_OVERRUN"),
      impact: "medium",
      title: `${overBudget.length} rubros exceden presupuesto por >${THRESHOLDS.VARIANCE_OVER_BUDGET_PCT}%`,
      reasoning: `Sobregiro total: ${compactCurrency(totalOverrun)}. Rubros: ${overBudget.map((c) => c.label).join(", ")}.`,
      confidence: 80,
    });
  },
};

const R14_REVENUE_DECLINING: RuleDefinition<FinancialContext> = {
  id: "R14_REVENUE_DECLINING",
  name: "Fuentes de ingreso en declive",
  layer: "micro",
  domain: "financial",
  priority: 200,
  emitSignals: [FIN_REVENUE_DECLINE],
  evaluate: (ctx) => {
    if (ctx.decliningSourceCount === 0) return null;
    return buildInsight({
      id: generateInsightId("financial", "R14_REVENUE_DECLINING"),
      impact: "high",
      title: `${ctx.decliningSourceCount} fuente(s) de ingreso en declive`,
      reasoning: `Declive: ${ctx.decliningSourcesLabel}. Evaluar causa raíz y plan de acción.`,
      confidence: 75,
      target_view: "analytics",
    });
  },
};

const R15_MARGIN_EROSION: RuleDefinition<FinancialContext> = {
  id: "R15_MARGIN_EROSION",
  name: "Erosión de margen",
  layer: "micro",
  domain: "financial",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.marginTrend.length < THRESHOLDS.CONSECUTIVE_MONTHS) return null;
    if (!isStrictlyDescending(ctx.marginTrend)) return null;
    return buildInsight({
      id: generateInsightId("financial", "R15_MARGIN_EROSION"),
      impact: "high",
      title: `Margen erosivo ${THRESHOLDS.CONSECUTIVE_MONTHS} meses consecutivos`,
      reasoning: `Margen: ${ctx.marginTrend.map((m) => `${m.toFixed(1)}%`).join(" → ")}. Tendencia descendente sostenida requiere intervención.`,
      confidence: 80,
      target_view: "analytics",
    });
  },
};

const R16_NET_INCOME_DECLINING: RuleDefinition<FinancialContext> = {
  id: "R16_NET_INCOME_DECLINING",
  name: "Ingreso neto descendente",
  layer: "micro",
  domain: "financial",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.netIncomeTrend.length < THRESHOLDS.CONSECUTIVE_MONTHS) return null;
    if (!isStrictlyDescending(ctx.netIncomeTrend)) return null;
    return buildInsight({
      id: generateInsightId("financial", "R16_NET_INCOME_DECLINING"),
      impact: "high",
      title: `Ingreso neto descendente ${THRESHOLDS.CONSECUTIVE_MONTHS} meses`,
      reasoning: `Neto: ${ctx.netIncomeTrend.map((v) => compactCurrency(v)).join(" → ")}. Patrón de deterioro financiero progresivo.`,
      confidence: 75,
      target_view: "analytics",
    });
  },
};

const R17_BUDGET_EXPENSE_FUSION: RuleDefinition<FinancialContext> = {
  id: "R17_BUDGET_EXPENSE_FUSION",
  name: "Sobregiro: ¿gasto o cobranza?",
  layer: "fusion",
  domain: "financial",
  priority: 300,
  evaluate: (ctx) => {
    if (!ctx.hasBudgetAnomalies) return null;
    if (ctx.overBudgetFusionCount === 0) return null;
    if (ctx.overBudgetFusionOverlap.length === 0) return null;
    return buildInsight({
      id: generateInsightId("financial", "R17_BUDGET_EXPENSE_FUSION"),
      impact: "high",
      title: "Sobregiro presupuestario: ¿gasto excesivo o cobranza?",
      reasoning: `${ctx.overBudgetFusionOverlap.length} categoría(s) con anomalía de presupuesto Y gasto excedido: ${ctx.overBudgetFusionOverlap.map((c) => c.label).join(", ")}. Analizar si el problema es control de gasto o recuperación de ingresos pendientes.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R18_CASHFLOW_TREND_FUSION: RuleDefinition<FinancialContext> = {
  id: "R18_CASHFLOW_TREND_FUSION",
  name: "Riesgo estructural: tendencia + proyección negativa",
  layer: "fusion",
  domain: "financial",
  priority: 300,
  evaluate: (ctx) => {
    if (!ctx.hasNegCF) return null;
    if (!ctx.hasNegNetTrend) return null;
    return buildInsight({
      id: generateInsightId("financial", "R18_CASHFLOW_TREND_FUSION"),
      impact: "high",
      title: "Riesgo estructural: tendencia + proyección negativa",
      reasoning:
        "La tendencia descendente del ingreso neto se combina con proyección de cash flow negativo. No es estacional — requiere acción inmediata. Revisar estructura de costos y fuentes de ingreso.",
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const FINANCIAL_RULES: RuleDefinition<FinancialContext>[] = [
  R1_HEALTH_CRITICAL,
  R2_MARGIN_LOW,
  R3_CASHFLOW_NEGATIVE,
  R4_ANOMALIES_CRITICAL,
  R5_CONCENTRATION_RISK,
  R6_QUICK_WINS,
  R7_SEASONAL,
  R8_LTV_CAC,
  R9_BUDGET_OVERRUN,
  R10_POSITIVE_TRENDS,
  R11_STALE_ANALYSIS,
  R12_ALERTS,
  R13_EXPENSE_OVERRUN,
  R14_REVENUE_DECLINING,
  R15_MARGIN_EROSION,
  R16_NET_INCOME_DECLINING,
  R17_BUDGET_EXPENSE_FUSION,
  R18_CASHFLOW_TREND_FUSION,
];

export const FINANCIAL_HEALTH_FACTORS: HealthFactorDef<FinancialContext>[] = [
  {
    id: "revenue_health",
    label: "Salud de ingresos",
    compute: (ctx) => {
      if (!ctx.summary) return 50;
      const change = ctx.summary.revenue_change_pct;
      return Math.max(0, Math.min(100, 50 + change * 2));
    },
    weight: 0.25,
  },
  {
    id: "margin_health",
    label: "Margen operativo",
    compute: (ctx) => Math.max(0, Math.min(100, ctx.marginPct * 4)),
    weight: 0.25,
  },
  {
    id: "cashflow_health",
    label: "Flujo de caja",
    compute: (ctx) => (ctx.hasNegCF ? 30 : 80),
    weight: 0.2,
  },
  {
    id: "anomaly_health",
    label: "Anomalías",
    compute: (ctx) => Math.max(0, 100 - ctx.criticalAnomalyCount * 20),
    weight: 0.15,
    inverse: true,
  },
  {
    id: "diversification",
    label: "Diversificación",
    compute: (ctx) => {
      if (ctx.diversificationIndex == null) return 50;
      return ctx.diversificationIndex * 100;
    },
    weight: 0.15,
  },
];