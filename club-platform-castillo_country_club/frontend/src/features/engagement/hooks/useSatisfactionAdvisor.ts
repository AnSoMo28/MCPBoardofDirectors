// ═══════════════════════════════════════════════════════════
// Satisfaction Advisor — Thin wrapper (F47 B5.5)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits sat_critical_decline signal post-evaluate.
//
// Domain: "satisfaction" (exact match in AIDomain)
// Layer mapping: health→health, trends→prediction,
//                insights→micro, cross_domain→cross_domain
//
// Replaced: ~310 lines inline rules + evaluateRules (F33)
// Now: ~145 lines + 12 rules in rules/satisfaction.ts
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
  SatisfactionHealthScore,
  SatisfactionIntelligence,
  SatisfactionBenchmarkReport,
  SatisfactionEngagementProposalList,
} from "@/shared/mocks/contracts";

import {
  SATISFACTION_RULES,
  SATISFACTION_HEALTH_FACTORS,
  buildSatisfactionCtx,
} from "@/shared/lib/advisor-engine/rules/satisfaction";
import type { SatisfactionContext } from "@/shared/lib/advisor-engine/rules/satisfaction";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// ADAPTER — AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

const LAYER_MAP = new Map<string, string>(
  SATISFACTION_RULES.map((r) => [
    generateInsightId("satisfaction", r.id),
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
  (
    ctx: SatisfactionContext,
  ) => { metric?: string; metricValue?: string | number }
> = {
  R1_OVERALL_CRITICAL: (ctx) => ({
    metric: "Overall",
    metricValue: ctx.overallAvg.toFixed(1),
  }),
  R2_CATEGORY_SYSTEMIC: (ctx) => ({
    metric: ctx.lowestCategory,
    metricValue: ctx.lowestCategoryScore.toFixed(1),
  }),
  R3_NEGATIVE_SENTIMENT: (ctx) => ({
    metric: "Detractores",
    metricValue: `${ctx.detractorPct.toFixed(0)}%`,
  }),
  R4_ALL_EXCELLENT: () => ({
    metric: "Categorías > 4.0",
    metricValue: "Todas",
  }),
  R5_DECLINING_3MONTHS: (ctx) => ({
    metric: "Meses en declive",
    metricValue: ctx.monthsDeclining,
  }),
  R6_LOW_RESPONSE_RATE: (ctx) => ({
    metric: "Response rate",
    metricValue: `${ctx.responseRate.toFixed(0)}%`,
  }),
  R7_WORST_EVENT_TYPE: (ctx) => ({
    metric: ctx.worstEventType,
    metricValue: ctx.worstEventTypeScore.toFixed(1),
  }),
  R8_IMPROVING: () => ({
    metric: "Tendencia",
    metricValue: "Mejorando",
  }),
  R9_NPS_CRITICAL: (ctx) => ({
    metric: "NPS",
    metricValue: ctx.npsScore,
  }),
  R10_VALUE_QUALITY_GAP: (ctx) => {
    const cats = ctx.intelligence?.category_scores ?? [];
    const value = cats.find((c) => c.category === "value");
    const service = cats.find((c) => c.category === "service");
    const gap =
      service && value
        ? (service.avg_score - value.avg_score).toFixed(1)
        : "N/A";
    return { metric: "Gap", metricValue: `${gap} pts` };
  },
  R11_EVENTS_WITHOUT_SURVEYS: (ctx) => ({
    metric: "Sin encuesta",
    metricValue: ctx.eventsWithoutSurveys,
  }),
  R12_REPLICATE_BEST_FORMAT: (ctx) => {
    const gap = (
      ctx.bestEventTypeScore - ctx.worstEventTypeScore
    ).toFixed(1);
    return { metric: "Brecha", metricValue: `${gap} pts` };
  },
};

function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: SatisfactionContext,
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
    domain: "satisfaction",
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

export function useSatisfactionAdvisor(
  healthScore: SatisfactionHealthScore | null,
  intelligence: SatisfactionIntelligence | null,
  benchmarks: SatisfactionBenchmarkReport | null,
  proposals: SatisfactionEngagementProposalList | null,
  ragContext?: RAGContext[],
) {
  const rawData = useMemo(
    () => ({ healthScore, intelligence, benchmarks, proposals }),
    [healthScore, intelligence, benchmarks, proposals],
  );

  const config = useMemo(
    () => ({
      domain: "satisfaction" as const,
      buildCtx: buildSatisfactionCtx,
      rules: SATISFACTION_RULES,
      healthFactors: SATISFACTION_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<SatisfactionContext>(config, rawData, undefined, true, ragContext);

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Adapt to BaseInsight for generic AdvisorBanner
  const insights = useMemo(() => {
    if (!result) return [];
    const ctx = buildSatisfactionCtx(rawData);
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