// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Advisor Hook (2027 REWRITE)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits rec_pending_actions signal post-evaluate.
//
// Domain: "engagement" (sub-domain of proactive intelligence)
// Layer mapping: actions→macro, reporting→prediction,
//                alerts→health, backlog→lifecycle
//
// v38 → 2027:
//   AdvisorInput: 3 fields → 7 fields (all data sources alive)
//   Rules: 7 → 14 (expanded opportunity/conflict/revenue detection)
//   Cross-domain signals: none → full emission to 5 domains
//   Synthesis integration: new — derives OpportunitySynthesis from insights
//
// Rules: #27, #28, #29, P40, P42, P51, P54 + 7 new
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

import {
  RECOMMENDATION_RULES,
  RECOMMENDATION_HEALTH_FACTORS,
  buildRecommendationCtx,
} from "@/shared/lib/advisor-engine/rules/recommendation";
import type { RecommendationContext } from "@/shared/lib/advisor-engine/rules/recommendation";

import type {
  PricingOptimization,
  ActivitySuggestion,
  QuarterlyInsight,
  Recommendation,
  AttendancePrediction,
  SchedulingConflict,
  SocialCluster
} from "../types";

import {
  isHighPriority,
  isBlockingConflict,
  isUrgentConflict,
  sortByPriority,
  sortBySeverity,
} from "../types";

import type { RAGContext, DomainSignal } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════════════════
// ADAPTER — AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

const LAYER_MAP = new Map<string, string>(
  RECOMMENDATION_RULES.map((r) => [
    generateInsightId("engagement", r.id),
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

function toBaseInsight(insight: AdvisorInsightBase): BaseInsight {
  return {
    id: insight.id,
    layer: LAYER_MAP.get(insight.id) ?? "macro",
    severity: deriveSeverity(insight.impact, insight.confidence),
    title: insight.title,
    description: insight.reasoning,
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: "recommendations",
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
  };
}

// ═══════════════════════════════════════════════════════════════════════
// INPUT — All 7 data sources (was 3)
// ═══════════════════════════════════════════════════════════════════════

type AdvisorInput = {
  pricings: PricingOptimization[];
  suggestions: ActivitySuggestion[];
  insights: QuarterlyInsight[];
  /** NEW: AI-generated family recommendations */
  recommendations: Recommendation[];
  /** NEW: attendance prediction history */
  predictions: AttendancePrediction[];
  /** NEW: scheduling conflict detection */
  conflicts: SchedulingConflict[];
  /** NEW: social cluster intelligence */
  clusters: SocialCluster[];
};

// ═══════════════════════════════════════════════════════════════════════
// SIGNAL HELPERS — Cross-domain signal emission
//
// Produces DomainSignal[] compatible with signalBus.emit().
// Uses registered SignalName values from advisor-engine/types.
// ═══════════════════════════════════════════════════════════════════════

function buildCrossDomainSignals(
  data: AdvisorInput,
): DomainSignal[] {
  const signals: DomainSignal[] = [];
  const now = Date.now();

  // ── Conflict escalation signals ─────────────────────────────────────
  const criticalConflicts = data.conflicts.filter(
    (c) => isUrgentConflict(c.severity) || isBlockingConflict(c.severity),
  );
  if (criticalConflicts.length > 0) {
    signals.push({
      id: `rec-cross-conflict-${now}`,
      signalDefId: "evt_capacity_alert",
      sourceDomain: "engagement",
      targetDomains: ["global", "events"],
      severity: "high",
      value: criticalConflicts.length,
      label: `${criticalConflicts.length} conflicto(s) bloqueando recursos de eventos`,
      timestamp: now,
      ttl: 300_000,
      metadata: {
        severities: criticalConflicts.map((c) => c.severity),
      },
    });
  }

  // ── High-priority recommendation signals ────────────────────────────
  const urgentRecs = data.recommendations.filter(
    (r) => isHighPriority(r.priority),
  );
  if (urgentRecs.length > 0) {
    signals.push({
      id: `rec-cross-urgent-${now}`,
      signalDefId: "rec_pending_actions",
      sourceDomain: "engagement",
      targetDomains: ["global"],
      severity: "high",
      value: urgentRecs.length,
      label: `${urgentRecs.length} recomendación(es) urgente(s) pendiente(s)`,
      timestamp: now,
      ttl: 300_000,
      metadata: {
        family_ids: urgentRecs.map((r) => r.family_id),
      },
    });
  }

  // ── Revenue optimization signals ────────────────────────────────────
  const highImpactPricings = data.pricings.filter(
    (p) => Math.abs(p.expected_revenue_change) > 5000,
  );
  if (highImpactPricings.length > 0) {
    const totalDelta = highImpactPricings.reduce(
      (sum, p) => sum + p.expected_revenue_change,
      0,
    );
    signals.push({
      id: `rec-cross-revenue-${now}`,
      signalDefId: "fin_revenue_decline",
      sourceDomain: "engagement",
      targetDomains: ["global", "financial"],
      severity: "medium",
      value: totalDelta,
      label: `${highImpactPricings.length} oportunidad(es) de pricing: $${Math.abs(totalDelta).toLocaleString()} revenue`,
      timestamp: now,
      ttl: 300_000,
      metadata: {
        services: highImpactPricings.map((p) => p.service_name),
      },
    });
  }

  // ── Low-confidence prediction warnings ──────────────────────────────
  const unreliablePredictions = data.predictions.filter(
    (p) => p.confidence === "low",
  );
  if (unreliablePredictions.length > 0) {
    signals.push({
      id: `rec-cross-prediction-${now}`,
      signalDefId: "evt_low_engagement",
      sourceDomain: "engagement",
      targetDomains: ["global", "events"],
      severity: "low",
      value: unreliablePredictions.length,
      label: `${unreliablePredictions.length} predicción(es) con baja confianza`,
      timestamp: now,
      ttl: 300_000,
      metadata: {
        events: unreliablePredictions.map((p) => p.event_name),
      },
    });
  }

  // ── Social cluster gap signals ──────────────────────────────────────
  const smallClusters = data.clusters.filter((c) => c.size < 5);
  if (smallClusters.length > 2) {
    signals.push({
      id: `rec-cross-cluster-${now}`,
      signalDefId: "sys_risk_change",
      sourceDomain: "engagement",
      targetDomains: ["global"],
      severity: "low",
      value: smallClusters.length,
      label: `${smallClusters.length} cluster(es) fragmentado(s) — riesgo de desintegración social`,
      timestamp: now,
      ttl: 300_000,
      metadata: {
        cluster_types: smallClusters.map((c) => c.cluster_type),
      },
    });
  }

  return signals;
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useRecommendationAdvisor(
  input: AdvisorInput,
  ragContext?: RAGContext[],
) {
  const rawData = useMemo(
    () => ({
      pricings: input.pricings,
      suggestions: input.suggestions,
      insights: input.insights,
      recommendations: input.recommendations,
      predictions: input.predictions,
      conflicts: input.conflicts,
      clusters: input.clusters,
    }),
    [
      input.pricings,
      input.suggestions,
      input.insights,
      input.recommendations,
      input.predictions,
      input.conflicts,
      input.clusters,
    ],
  );

  const config = useMemo(
    () => ({
      domain: "engagement" as const,
      buildCtx: buildRecommendationCtx,
      rules: RECOMMENDATION_RULES,
      healthFactors: RECOMMENDATION_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<RecommendationContext>(
    config,
    rawData,
    undefined,
    true,
    ragContext,
  );

  // ── Cross-domain signal emission ────────────────────────────────────
  useEffect(() => {
    // Engine-generated signals
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }

    // Cross-domain signals from data correlation
    const crossSignals = buildCrossDomainSignals(rawData);
    if (crossSignals.length > 0) {
      signalBus.emit(crossSignals);
    }
  }, [result?.signals, rawData]);

  // ── Adapt to BaseInsight for generic AdvisorBanner ──────────────────
  const insights_result = useMemo(() => {
    if (!result) return [];
    return result.insights.map((i) => toBaseInsight(i));
  }, [result]);

  // ── Derived intelligence ────────────────────────────────────────────

  const topInsights = useMemo(
    () => insights_result.slice(0, 3),
    [insights_result],
  );

  const hasHighSeverity = useMemo(
    () =>
      insights_result.some(
        (i) => i.severity === "high" || i.severity === "critical",
      ),
    [insights_result],
  );

  // ── Conflict summary (for dashboard mode derivation) ────────────────

  const conflictSummary = useMemo(() => {
    const sorted = sortBySeverity(rawData.conflicts);
    const critical = sorted.filter(
      (c) => isBlockingConflict(c.severity) || isUrgentConflict(c.severity),
    );
    return {
      total: rawData.conflicts.length,
      criticalCount: critical.length,
      hasCritical: critical.length > 0,
    };
  }, [rawData.conflicts]);

  // ── Recommendation summary (for dashboard mode derivation) ──────────

  const recommendationSummary = useMemo(() => {
    const sorted = sortByPriority(rawData.recommendations);
    const urgent = sorted.filter((r) => isHighPriority(r.priority));
    return {
      total: rawData.recommendations.length,
      urgentCount: urgent.length,
      hasUrgent: urgent.length > 0,
    };
  }, [rawData.recommendations]);

  // ── Data readiness (how many sources are contributing) ──────────────

  const sourceContribution = useMemo(() => {
    const contributing: string[] = [];
    if (rawData.pricings.length > 0) contributing.push("pricing");
    if (rawData.suggestions.length > 0) contributing.push("suggestions");
    if (rawData.insights.length > 0) contributing.push("quarterly");
    if (rawData.recommendations.length > 0)
      contributing.push("recommendations");
    if (rawData.predictions.length > 0) contributing.push("predictions");
    if (rawData.conflicts.length > 0) contributing.push("conflicts");
    if (rawData.clusters.length > 0) contributing.push("clusters");
    return {
      sources: contributing,
      count: contributing.length,
      isFullPicture: contributing.length >= 5,
    };
  }, [rawData]);

  return {
    // ── Core advisor output ───────────────────────────────────────────
    insights: insights_result,
    topInsights,
    hasHighSeverity,
    totalInsights: insights_result.length,

    // ── Domain summaries (for dashboard orchestration) ────────────────
    conflictSummary,
    recommendationSummary,
    sourceContribution,
  };
}