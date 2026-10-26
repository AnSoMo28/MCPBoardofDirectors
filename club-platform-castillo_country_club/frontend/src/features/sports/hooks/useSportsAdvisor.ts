// ═══════════════════════════════════════════════════════════
// Sports Advisor — Thin wrapper (F47 B5.2)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits spt_utilization_drop + spt_capacity_warning signals.
//
// Replaced: ~310 lines inline rules + evaluateRules (F32)
// Now: ~150 lines + 22 rules in rules/sports.ts
//
// Rules: R1-R15 (original) + SR16-SR22 (Phase 33 "The Arena")
// METRIC_DISPLAY: 22 entries (15 original + 7 Phase 33)
//
// Updated: Phase 33 "The Arena" — +7 METRIC_DISPLAY entries
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

import type {
  SportsAnalytics_Contract,
  SportsHealthSummary_Contract,
  SportsCalendarItem_Contract,
} from "@/shared/mocks/contracts";

import {
  SPORTS_RULES,
  SPORTS_HEALTH_FACTORS,
  buildSportsCtx,
} from "@/shared/lib/advisor-engine/rules/sports";
import type { SportsContext } from "@/shared/lib/advisor-engine/rules/sports";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// ADAPTER — AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

const LAYER_MAP = new Map<string, string>(
  SPORTS_RULES.map((r) => [
    generateInsightId("sports", r.id),
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
  (ctx: SportsContext) => { metric?: string; metricValue?: string | number }
> = {
  // ── Original rules (R1-R15) ─────────────────────────────
  R1_COURTS_STATUS: (ctx) => ({
    metric: "Utilización promedio",
    metricValue: `${ctx.avgUtilization.toFixed(1)}%`,
  }),
  R2_ACTIVE_TOURNAMENTS: (ctx) => ({
    metric: "Participación promedio",
    metricValue: `${ctx.avgParticipationRate}%`,
  }),
  R3_CLASSES_SUMMARY: (ctx) => ({
    metric: "Clases activas",
    metricValue: ctx.activeClasses,
  }),
  R4_LOW_COURT_UTIL: (ctx) => ({
    metric: "Canchas bajo 30%",
    metricValue: ctx.underusedCourts.length,
  }),
  R5_TOURNAMENT_REG_LOW: (ctx) => ({
    metric: "Participación promedio",
    metricValue: `${ctx.avgParticipationRate}%`,
  }),
  R6_CLASS_LOW_ENROLLMENT: (ctx) => {
    const worst = ctx.underperformingClasses[0];
    return worst
      ? { metric: worst.name, metricValue: `${worst.fill_rate_pct}%` }
      : {};
  },
  R7_EQUIPMENT_REPAIR: (ctx) => ({
    metric: "Items dañados",
    metricValue: ctx.damagedEquipment.length,
  }),
  R8_NO_TOURNAMENTS: () => ({
    metric: "Torneos próximos",
    metricValue: 0,
  }),
  R9_COACHING_GAP: (ctx) => ({
    metric: "Sesiones de coaching",
    metricValue: ctx.totalCoachingSessions,
  }),
  R10_SEASONAL_MISMATCH: (ctx) => {
    const outdoorActivity = ctx.sportPopularity
      .filter((p) =>
        ["tennis", "golf", "swimming", "volleyball", "football"].includes(
          p.sport,
        ),
      )
      .reduce((s, p) => s + p.total_activity, 0);
    const pct =
      ctx.totalActivity > 0
        ? ((outdoorActivity / ctx.totalActivity) * 100).toFixed(0)
        : "0";
    return { metric: "Actividad outdoor", metricValue: `${pct}%` };
  },
  R11_PEAK_HOUR_SATURATION: (ctx) => ({
    metric: `Reservas a las ${ctx.busiestHour}`,
    metricValue: ctx.busiestHourCount,
  }),
  R12_SPORT_IMBALANCE: (ctx) => ({
    metric: "Concentración",
    metricValue: `${ctx.sportConcentrationPct}%`,
  }),
  R13_EQUIPMENT_STALE: (ctx) => ({
    metric: "Items sin mantenimiento",
    metricValue: ctx.staleEquipment.length,
  }),
  R14_TOURNAMENT_OPPORTUNITY: (ctx) => {
    const outdoorCourts =
      ctx.analytics?.court_utilization?.filter((c) =>
        ["tennis", "golf", "padel", "swimming"].includes(c.sport),
      ) ?? [];
    return {
      metric: "Canchas disponibles",
      metricValue: outdoorCourts.filter((c) => c.utilization_pct < 70)
        .length,
    };
  },
  R15_ENGAGEMENT_LOW: (ctx) => ({
    metric: "Engagement Score",
    metricValue: ctx.engagementScore,
  }),

  // ── Phase 33 "The Arena" — Innovation rules (SR16-SR22) ──
  SR16_ATHLETIC_PLATEAU: (ctx) => ({
    metric: "Socios en plateau",
    metricValue: ctx.athleticPlateauCount,
  }),
  SR17_INJURY_RISK_CLUSTER: (ctx) => ({
    metric: "Socios en riesgo",
    metricValue: ctx.injuryRiskMembers,
  }),
  SR18_SOCIAL_ISOLATION: (ctx) => ({
    metric: "Socios aislados",
    metricValue: ctx.isolatedMembers,
  }),
  SR19_OVERTRAINING_DETECTED: (ctx) => ({
    metric: "Alertas overtraining",
    metricValue: ctx.overtrainingFlags,
  }),
  SR20_CROSS_DOMAIN_VENUE: (ctx) => ({
    metric: "Alertas de capacidad",
    metricValue: ctx.eventCapacityAlerts,
  }),
  SR21_CROSS_DOMAIN_FINANCIAL: (ctx) => ({
    metric: "Revenue en declive",
    metricValue: ctx.clubRevenueDeclining ? "Sí" : "No",
  }),
  SR22_FACILITY_REASSIGNMENT: (ctx) => ({
    metric: "Eventos de sobrecapacidad",
    metricValue: ctx.facOvercapacityEvents,
  }),
};

function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: SportsContext,
): BaseInsight {
  const ruleId = insight.id.split("_").slice(2).join("_");
  const metricData = METRIC_DISPLAY[ruleId]?.(ctx) ?? {};

  return {
    id: insight.id,
    layer: LAYER_MAP.get(insight.id) ?? "context",
    severity: deriveSeverity(insight.impact, insight.confidence),
    title: insight.title,
    description: insight.reasoning,
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: insight.domain ?? "sports",
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

export function useSportsAdvisor(
  analytics: SportsAnalytics_Contract | null,
  healthSummary: SportsHealthSummary_Contract | null,
  calendar: SportsCalendarItem_Contract[],
  ragContext?: RAGContext[],
) {
  const rawData = useMemo(
    () => ({ analytics, health: healthSummary, calendar }),
    [analytics, healthSummary, calendar],
  );

  const config = useMemo(
    () => ({
      domain: "sports" as const,
      buildCtx: buildSportsCtx,
      rules: SPORTS_RULES,
      healthFactors: SPORTS_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<SportsContext>(
    config,
    rawData,
    undefined,
    true,
    ragContext,
  );

  // Emit cross-domain signals post-evaluate
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Adapt to BaseInsight for generic AdvisorBanner
  const insights = useMemo(() => {
    if (!result) return [];
    const ctx = buildSportsCtx(rawData);
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