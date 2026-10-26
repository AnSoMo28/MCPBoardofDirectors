// ═══════════════════════════════════════════════════════════
// src/features/guests/hooks/useGuestAdvisor.ts
// Phase 34 "The Gateway" — Guest Advisor Hook
// Level 6+ Agency · Production Grade
//
// Thin wrapper around the Advisor Engine.
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits cross-domain signals post-evaluate.
//
// Changes from original:
//   - EXTRACTED: METRIC_DISPLAY → guestMetricDisplay.ts
//   - EXTRACTED: LAYER_MAP → guestMetricDisplay.ts
//   - EXTRACTED: deriveSeverity → guestMetricDisplay.ts
//   - ADDED: GuestEngineEnrichment parameter
//   - ADDED: healthScoreResult + signals in return
//   - FIXED: metric lookup uses resolveMetricDisplay (was broken in original)
//   - KEPT: useAdvisorEngine integration
//   - KEPT: signal emission via useEffect
//
// Domain: "engagement" (AIDomain)
//
// Checklist: M1-15, M2-12, M4-15
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";

import {
  GUEST_RULES,
  GUEST_HEALTH_FACTORS,
  buildGuestCtx,
  type GuestContext,
  type GuestEngineEnrichment,
} from "@/shared/lib/advisor-engine/rules/guest";

import type {
  RAGContext,
  HealthScoreResult,
  DomainSignal,
} from "@/shared/lib/advisor-engine/types";

import {
  resolveMetricDisplay,
  resolveLayer,
  deriveSeverity,
} from "../advisor/guestMetricDisplay";

// ═══════════════════════════════════════════════════════════
// §1 — ADAPTER: AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════

/**
 * Transform a raw advisor insight into a display-ready BaseInsight.
 * Uses resolveMetricDisplay for correct metric extraction,
 * resolveLayer for layer routing, and deriveSeverity for severity.
 */
function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: GuestContext,
): BaseInsight {
  const metricData = resolveMetricDisplay(insight.id, ctx);
  const hasMetric = metricData.metric !== "";

  return {
    id: insight.id,
    layer: resolveLayer(insight.id),
    severity: deriveSeverity(insight.impact, insight.confidence),
    title: insight.title,
    description: insight.reasoning,
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: "guest_management",
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
    metric: hasMetric ? metricData.metric : undefined,
    metricValue: hasMetric ? metricData.metricValue : undefined,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — RETURN TYPE
// ═══════════════════════════════════════════════════════════

export interface UseGuestAdvisorReturn {
  /** Adapted insights for AdvisorBanner display. */
  readonly insights: readonly BaseInsight[];
  /** Top 3 highest-severity insights. */
  readonly topInsights: readonly BaseInsight[];
  /** Whether any insight is high or critical severity. */
  readonly hasHighSeverity: boolean;
  /** Total number of active insights. */
  readonly totalInsights: number;
  /** Health score result from advisor engine (null if not computed). */
  readonly healthScoreResult: HealthScoreResult | null;
  /** Cross-domain signals to emit. */
  readonly signals: readonly DomainSignal[];
}

// ═══════════════════════════════════════════════════════════
// §3 — HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Guest advisor hook — evaluates 20 rules against guest data.
 *
 * Accepts optional engine enrichment for Phase 34 engine-based rules.
 * Without enrichment, only R1-R14 fire (original behavior preserved).
 * With enrichment, R15-R20 also evaluate.
 *
 * @param healthScore - MCP health score data
 * @param funnel - MCP conversion funnel data
 * @param analytics - MCP analytics data
 * @param forecast - MCP forecast data
 * @param proposals - MCP engagement proposals
 * @param ragContext - Optional RAG context for enriched evaluation
 * @param enrichment - Optional engine-computed values for R15-R20
 *
 * @example
 * const advisor = useGuestAdvisor(
 *   healthScore, funnel, analytics, forecast, proposals,
 *   undefined, // ragContext
 *   enrichment, // from engine outputs
 * );
 * if (advisor.hasHighSeverity) renderAlert(advisor.topInsights);
 */
export function useGuestAdvisor(
  healthScore: GuestHealthScore | null,
  funnel: ConversionFunnel | null,
  analytics: GuestAnalyticsEnhanced | null,
  forecast: GuestDemandForecast | null,
  proposals: GuestEngagementProposalList | null,
  ragContext?: RAGContext[],
  enrichment?: GuestEngineEnrichment,
): UseGuestAdvisorReturn {
  // ── Raw data bundle ──
  const rawData = useMemo(
    () => ({
      healthScore,
      funnel,
      analytics,
      forecast,
      proposals,
    }),
    [healthScore, funnel, analytics, forecast, proposals],
  );

  // ── Advisor config with enrichment closure ──
  // The closure captures `enrichment` and passes it to buildGuestCtx.
  // useAdvisorEngine calls config.buildCtx(rawData, signals) internally.
  // Our closure forwards enrichment as the 3rd parameter.
  const config = useMemo(
    () => ({
      domain: "engagement" as const,
      buildCtx: (raw: unknown, signals?: readonly DomainSignal[]) =>
        buildGuestCtx(raw, signals, enrichment),
      rules: GUEST_RULES,
      healthFactors: GUEST_HEALTH_FACTORS,
    }),
    [enrichment],
  );

  // ── Engine evaluation ──
  const result = useAdvisorEngine<GuestContext>(
    config,
    rawData,
    undefined,
    true,
    ragContext,
  );

  // ── Signal emission ──
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // ── Insight adaptation ──
  const insights = useMemo(() => {
    if (!result) return [];
    const ctx = buildGuestCtx(rawData, undefined, enrichment);
    return result.insights.map((i) => toBaseInsight(i, ctx));
  }, [result, rawData, enrichment]);

  const topInsights = useMemo(
    () => insights.slice(0, 3),
    [insights],
  );

  const hasHighSeverity = useMemo(
    () =>
      insights.some(
        (i) => i.severity === "high" || i.severity === "critical",
      ),
    [insights],
  );

  const healthScoreResult = result?.healthScore ?? null;
  const signals = result?.signals ?? [];

  return {
    insights,
    topInsights,
    hasHighSeverity,
    totalInsights: insights.length,
    healthScoreResult,
    signals,
  };
}