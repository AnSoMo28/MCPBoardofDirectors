// ═══════════════════════════════════════════════════════════
// ML Intelligence Advisor — Thin wrapper (F47 B5.6)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits ml_model_degradation + ml_prediction_confidence_drop signals.
//
// TRANSVERSAL advisor — consumes data from ALL domains
// via the ML Intelligence agent.
//
// Domain: "ml_intelligence" (exact match in AIDomain)
// Layer mapping: model_health→health, predictions→prediction,
//                insights→micro
//
// Replaced: ~340 lines inline rules + evaluateRules (F35)
// Now: ~155 lines + 10 rules in rules/ml.ts
//
// Rules: #27, #28, #29, P40, P42, P51, P54
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

import type {
  DataQualityReport,
  AnomalyReport,
  DemandForecast,
  RevenueForecast,
  ChurnMLReport,
  MemberSegmentation,
  ModelHealthReport,
} from "@/shared/mocks/contracts";

import {
  ML_RULES,
  ML_HEALTH_FACTORS,
  buildMLCtx,
} from "@/shared/lib/advisor-engine/rules/ml";
import type { MLContext } from "@/shared/lib/advisor-engine/rules/ml";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";
// ═══════════════════════════════════════════════════════════
// ADAPTER — AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

const LAYER_MAP = new Map<string, string>(
  ML_RULES.map((r) => [
    generateInsightId("ml_intelligence", r.id),
    r.layer,
  ]),
);

function deriveSeverity(
  impact: string,
  confidence: number,
): AdvisorSeverity {
  if (impact === "high" && confidence >= 90) return "critical";
  if (impact === "high") return "high";
  if (impact === "medium") return "medium";
  if (impact === "low") return "info";
  return "low";
}

/** Metric display data by rule ID — preserves original UX */
const METRIC_DISPLAY: Record<
  string,
  (ctx: MLContext) => { metric?: string; metricValue?: string | number }
> = {
  R1_DATA_QUALITY_LOW: (ctx) => ({
    metric: "Data Quality",
    metricValue: `${ctx.dataQualityScore}/100`,
  }),
  R2_MODEL_DRIFT: (ctx) => ({
    metric: "Modelos con drift",
    metricValue: ctx.driftedModels.length,
  }),
  R3_RETRAIN_NEEDED: (ctx) => ({
    metric: "Reentrenar",
    metricValue: ctx.retrainNeeded,
  }),
  R4_ALL_HEALTHY: (ctx) => ({
    metric: "Accuracy promedio",
    metricValue: `${ctx.avgAccuracy.toFixed(0)}%`,
  }),
  R5_REVENUE_VARIANCE: (ctx) => ({
    metric: "Vs Budget",
    metricValue: `${ctx.revenueVsBudgetPct > 0 ? "+" : ""}${ctx.revenueVsBudgetPct.toFixed(1)}%`,
  }),
  R6_CHURN_DISCREPANCY: (ctx) => ({
    metric: "Discrepancias",
    metricValue: ctx.significantDiscrepancies,
  }),
  R7_DEMAND_SPIKE: (ctx) => {
    const demandF = ctx.demandForecasts.find(
      (f) => f.target === "facility_occupancy",
    );
    const next = demandF?.forecast_points[0];
    return {
      metric: "Forecast ocupación",
      metricValue: next
        ? `${next.predicted_value.toFixed(0)}%`
        : "N/A",
    };
  },
  R8_CROSS_DOMAIN_ANOMALY: (ctx) => ({
    metric: "Riesgo sistémico",
    metricValue: `${ctx.systemicRisk}/100`,
  }),
  R9_HIGH_VALUE_AT_RISK: (ctx) => ({
    metric: "Revenue en riesgo",
    metricValue: `${ctx.atRiskRevenuePct}%`,
  }),
  R10_DORMANT_GROWING: (ctx) => ({
    metric: "Durmientes",
    metricValue: `${ctx.dormantPct.toFixed(0)}%`,
  }),
};

function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: MLContext,
): BaseInsight {
  const ruleId = insight.id.split("_").slice(2).join("_");
  const metricData = METRIC_DISPLAY[ruleId]?.(ctx) ?? {};

  return {
    id: insight.id,
    layer: LAYER_MAP.get(insight.id) ?? "health",
    severity: deriveSeverity(insight.impact, insight.confidence),
    title: insight.title,
    description: insight.reasoning,
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: "ml_intelligence",
    action: insight.action
      ? {
          label: insight.action.label,
          tool: insight.action.tool,
          server: insight.action.server,
          params: insight.action.params,
          approval: insight.action.approval_level,
          route: insight.target_view,
        }
      : undefined,
    metric: metricData.metric,
    metricValue: metricData.metricValue,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════

export function useMLAdvisor(
  dataQuality: DataQualityReport | null,
  anomalies: AnomalyReport | null,
  demandForecasts: DemandForecast[],
  revenueForecast: RevenueForecast | null,
  churnReport: ChurnMLReport | null,
  segmentation: MemberSegmentation | null,
  modelHealth: ModelHealthReport | null,
  ragContext?: RAGContext[],
) {
  const rawData = useMemo(
    () => ({
      dataQuality,
      anomalies,
      demandForecasts,
      revenueForecast,
      churnReport,
      segmentation,
      modelHealth,
    }),
    [
      dataQuality,
      anomalies,
      demandForecasts,
      revenueForecast,
      churnReport,
      segmentation,
      modelHealth,
    ],
  );

  const config = useMemo(
    () => ({
      domain: "ml_intelligence" as const,
      buildCtx: buildMLCtx,
      rules: ML_RULES,
      healthFactors: ML_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<MLContext>(config, rawData, undefined, true, ragContext);

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Adapt to BaseInsight for generic AdvisorBanner
  const insights = useMemo(() => {
    if (!result) return [];
    const ctx = buildMLCtx(rawData);
    return result.insights.map((i) => toBaseInsight(i, ctx));
  }, [result, rawData]);

  const topInsights = useMemo(() => insights.slice(0, 3), [insights]);

  const hasHighSeverity = useMemo(
    () =>
      insights.some(
        (i) => i.severity === "high" || i.severity === "critical",
      ),
    [insights],
  );

  return {
    insights,
    topInsights,
    hasHighSeverity,
    totalInsights: insights.length,
  };
}