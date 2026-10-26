// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Dashboard Orchestrator (2027 NEW)
//
// Single entry point for the RecommendationsDashboard.
// Orchestrates: data (7 sources) → advisor → synthesis → mode → state.
//
// Adaptive Morphism: 3 modes driven by system state, not user choice.
//   - Observe: spacious, overview-first. No urgency.
//   - Analyze: data-dense. Insights need attention.
//   - Act: action queue dominant. Critical items.
//
// Synthesis orchestration: tracks cross-domain opportunity computation.
// Focus management: what the user is currently examining.
//
// Pattern: same as useWellnessDashboard.ts (Phase 28)
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import {
  useRecommendationData,
  type UseRecommendationDataOptions,
} from "./useRecommendationData";

import {
  deriveRecommendationMode,
  isHighPriority,
  isBlockingConflict,
  isUrgentConflict,
  isHighConfidence,
  sortByPriority,
  sortBySeverity,
  type RecommendationMode,
  type RecommendationDashboardState,
  type SignalSource,
} from "../types";

// ═══════════════════════════════════════════════════════════════════════
// FOCUS PANEL — What the user is currently examining
// ═══════════════════════════════════════════════════════════════════════

export type FocusPanelId =
  | "overview"
  | "opportunities"
  | "conflicts"
  | "pricing"
  | "clusters"
  | "predictions"
  | "quarterly"
  | "actions";

// ═══════════════════════════════════════════════════════════════════════
// CROSS-DOMAIN SUMMARY — Lightweight bridge type for Nexus
// ═══════════════════════════════════════════════════════════════════════

export interface CrossDomainSummary {
  source: SignalSource;
  signalCount: number;
  topSignal: string;
  urgency: number;
}

// ═══════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════

export interface UseRecommendationDashboardOptions
  extends UseRecommendationDataOptions {
  /** Override automatic mode derivation */
  modeOverride?: RecommendationMode;
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useRecommendationDashboard(
  options: UseRecommendationDashboardOptions = {},
) {
  const { modeOverride, ...dataOptions } = options;

  // ── Focus panel state ───────────────────────────────────────────────
  const [activeFocus, setActiveFocus] = useState<FocusPanelId>("overview");

  // ── Synthesis tracking ──────────────────────────────────────────────
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const lastSynthesisAtRef = useRef<string | undefined>(undefined);
  const [lastSynthesisAt, setLastSynthesisAt] = useState<string | null>(null);

  // ── Data (all 7 sources + advisor) ──────────────────────────────────
  const data = useRecommendationData(dataOptions);

  // ── Derive mode from system state ───────────────────────────────────
  const derivedMode = useMemo<RecommendationMode>(() => {
    if (modeOverride) return modeOverride;

    const criticalConflicts =
      data.conflicts?.filter(
        (c) => isBlockingConflict(c.severity) || isUrgentConflict(c.severity),
      ).length ?? 0;

    const urgentRecs =
      data.recommendations?.filter((r) => isHighPriority(r.priority))
        .length ?? 0;

    const highImpactPricings =
      data.pricings?.filter(
        (p) => Math.abs(p.expected_revenue_change) > 5000,
      ).length ?? 0;

    const pendingActionCount =
      urgentRecs + (criticalConflicts > 0 ? criticalConflicts : 0);

    return deriveRecommendationMode({
      criticalConflictCount: criticalConflicts,
      highOpportunityCount:
        highImpactPricings +
        (data.advisor?.hasHighSeverity ? 1 : 0),
      pendingActionCount,
    });
  }, [
    modeOverride,
    data.conflicts,
    data.recommendations,
    data.pricings,
    data.advisor,
  ]);

  // ── Synthesis orchestration ─────────────────────────────────────────

  /** Trigger synthesis — simulates cross-domain correlation computation */
  const triggerSynthesis = useCallback(() => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);

    // In production, this would call the synthesis engine.
    // For now, track the state transition for UI feedback.
    const timeout = setTimeout(() => {
      const now = new Date().toISOString();
      lastSynthesisAtRef.current = now;
      setLastSynthesisAt(now);
      setIsSynthesizing(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [isSynthesizing]);

  // Auto-synthesize when data first loads with minimum sources
  const hasAutoSynthesized = useRef(false);
  useEffect(() => {
    if (
      !hasAutoSynthesized.current &&
      data.hasMinimumData &&
      !data.isLoading
    ) {
      hasAutoSynthesized.current = true;
      triggerSynthesis();
    }
  }, [data.hasMinimumData, data.isLoading, triggerSynthesis]);

  // ── Dashboard state object ──────────────────────────────────────────

  const dashboardState = useMemo<RecommendationDashboardState>(() => {
    const criticalConflicts =
      data.conflicts?.filter(
        (c) => isBlockingConflict(c.severity) || isUrgentConflict(c.severity),
      ).length ?? 0;

    const urgentRecs =
      data.recommendations?.filter((r) => isHighPriority(r.priority))
        .length ?? 0;

    const highImpactPricings =
      data.pricings?.filter(
        (p) => Math.abs(p.expected_revenue_change) > 5000,
      ).length ?? 0;

    return {
      mode: derivedMode,
      pendingActionCount: urgentRecs,
      criticalConflictCount: criticalConflicts,
      highOpportunityCount:
        highImpactPricings +
        (data.advisor?.hasHighSeverity ? 1 : 0),
      crossDomainSignalCount:
        data.advisor?.sourceContribution.count ?? 0,
      isSynthesizing,
      lastSynthesisAt,
    };
  }, [
    derivedMode,
    data.conflicts,
    data.recommendations,
    data.pricings,
    data.advisor,
    isSynthesizing,
    lastSynthesisAt,
  ]);

  // ── Sorted / filtered data for components ───────────────────────────

  const sortedData = useMemo(() => {
    const sortedConflicts = sortBySeverity(data.conflicts ?? []);
    const sortedRecommendations = sortByPriority(
      data.recommendations ?? [],
    );
    const sortedPricings = [...(data.pricings ?? [])].sort(
      (a, b) =>
        Math.abs(b.expected_revenue_change) -
        Math.abs(a.expected_revenue_change),
    );
    const sortedPredictions = [...(data.predictions ?? [])].sort(
      (a, b) => {
        const confidenceOrder = { high: 2, medium: 1, low: 0 };
        return (
          (confidenceOrder[b.confidence] ?? 0) -
          (confidenceOrder[a.confidence] ?? 0)
        );
      },
    );

    return {
      conflicts: sortedConflicts,
      recommendations: sortedRecommendations,
      pricings: sortedPricings,
      predictions: sortedPredictions,
      clusters: data.clusters ?? [],
      suggestions: data.suggestions ?? [],
      quarterlyInsights: data.quarterlyInsights ?? [],
    };
  }, [
    data.conflicts,
    data.recommendations,
    data.pricings,
    data.predictions,
    data.clusters,
    data.suggestions,
    data.quarterlyInsights,
  ]);

  // ── Critical items (for action queue / urgent display) ──────────────

  const criticalItems = useMemo(() => {
    const criticalConflicts = sortedData.conflicts.filter(
      (c) => isBlockingConflict(c.severity) || isUrgentConflict(c.severity),
    );

    const urgentRecs = sortedData.recommendations.filter((r) =>
      isHighPriority(r.priority),
    );

    const highConfidencePredictions = sortedData.predictions.filter((p) =>
      isHighConfidence(p.confidence),
    );

    const highImpactPricings = sortedData.pricings.filter(
      (p) => Math.abs(p.expected_revenue_change) > 5000,
    );

    return {
      criticalConflicts,
      urgentRecommendations: urgentRecs,
      highConfidencePredictions,
      highImpactPricings,
      totalCriticalCount:
        criticalConflicts.length +
        urgentRecs.length +
        highImpactPricings.length,
    };
  }, [sortedData]);

  // ── Navigation helpers ──────────────────────────────────────────────

  const navigateToFocus = useCallback(
    (panel: FocusPanelId) => {
      setActiveFocus(panel);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  const navigateToConflicts = useCallback(
    () => navigateToFocus("conflicts"),
    [navigateToFocus],
  );

  const navigateToOpportunities = useCallback(
    () => navigateToFocus("opportunities"),
    [navigateToFocus],
  );

  const navigateToActions = useCallback(
    () => navigateToFocus("actions"),
    [navigateToFocus],
  );

  // ═══════════════════════════════════════════════════════════════════
  // RETURN — Everything the dashboard needs
  // ═══════════════════════════════════════════════════════════════════

  return {
    // ── Adaptive Morphism ─────────────────────────────────────────────
    mode: derivedMode,
    dashboardState,

    // ── Focus management ──────────────────────────────────────────────
    activeFocus,
    setActiveFocus,
    navigateToFocus,
    navigateToConflicts,
    navigateToOpportunities,
    navigateToActions,

    // ── All data (sorted/filtered) ────────────────────────────────────
    sortedData,
    criticalItems,

    // ── Raw data access (for components that need unsorted) ───────────
    pricings: data.pricings,
    suggestions: data.suggestions,
    quarterlyInsights: data.quarterlyInsights,
    recommendations: data.recommendations,
    predictions: data.predictions,
    conflicts: data.conflicts,
    clusters: data.clusters,

    // ── Advisor intelligence ──────────────────────────────────────────
    advisor: data.advisor,

    // ── Synthesis orchestration ───────────────────────────────────────
    isSynthesizing,
    lastSynthesisAt,
    triggerSynthesis,

    // ── Status ────────────────────────────────────────────────────────
    isLoading: data.isLoading,
    isError: data.isError,
    error: data.error,
    loadedSourceCount: data.loadedSourceCount,
    hasMinimumData: data.hasMinimumData,

    // ── On-demand generation ──────────────────────────────────────────
    generatePrediction: data.generatePrediction,
    generateCommunication: data.generateCommunication,

    // ── Granular query access (refetch/invalidate) ────────────────────
    queries: data.queries,
  };
}