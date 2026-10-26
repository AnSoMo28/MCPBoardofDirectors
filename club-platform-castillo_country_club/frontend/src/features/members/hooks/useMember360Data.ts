// ═══════════════════════════════════════════════════════════════════════
// Member360 — Data Orchestrator
// Phase 30 — Block 1.1: The Data Layer
// ═══════════════════════════════════════════════════════════════════════
//
// Single entry point for ALL Member360 data.
// Orchestrates: 10 MCP queries → aggregated loading state → readiness.
//
// Fetch priority order (config-driven):
//   1. profile         (warm — everything depends on this)
//   2. healthScore     (warm — vital signs source)
//   3. churnPrediction (hot — volatile, near-realtime)
//   4. journey         (stable — lifecycle context)
//   5. activitySummary (warm — activity patterns)
//   6. socialProfile   (stable — connections)
//   7. ltvAnalysis     (stable — financial context)
//   8. riskAssessment  (hot — on-demand, enabled=false)
//   9. engagementProposals (realtime — on-demand, enabled=false)
//   10. search          (warm — list view only)
//
// The orchestrator doesn't decide WHAT to show — that's the neural hub.
// It just makes sure data is available and tracks loading state.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";

import {
  useMember360Profile,
  useMemberHealthScore,
  useMemberJourney,
  useMemberChurnPrediction,
  useMemberLTVAnalysis,
  useMemberActivitySummary,
  useMemberSocialProfile,
  useMemberEngagementProposals,
  useMemberRiskAssessment
} from "./useMember360MCP";
// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface Member360DataState {
  /** Whether ANY query is currently fetching */
  isLoading: boolean;
  /** Whether ALL critical queries have errored */
  isError: boolean;
  /** Combined error from first failed query */
  error: Error | null;
  /** How many of the 8 critical sources have loaded */
  loadedSourceCount: number;
  /** Minimum data for dashboard to render (profile + healthScore) */
  hasMinimumData: boolean;
  /** Whether all primary sources are loaded */
  isFullyLoaded: boolean;
  /** Per-source loading status */
  sourceStatus: Record<string, "loading" | "loaded" | "error" | "idle">;
}

export interface UseMember360DataOptions {
  /** Member ID to fetch */
  memberId: string;
  /** Whether to enable all queries (default true) */
  enabled?: boolean;
  /** Override: enable on-demand queries */
  enableOnDemand?: {
    riskAssessment?: boolean;
    engagementProposals?: boolean;
  };
  /** Override: period days for activity summary */
  activityPeriodDays?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

/**
 * Data orchestrator for Member360.
 * Aggregates all 10 MCP queries into a unified data state.
 * Tracks loading, errors, and readiness for the neural hub.
 *
 * @param options - Member ID and configuration
 * @returns Aggregated data from all sources + unified loading state
 */
export function useMember360Data(options: UseMember360DataOptions) {
  const {
    memberId,
    enabled = true,
    enableOnDemand = {},
    activityPeriodDays = 90,
  } = options;

  const isEnabled = !!memberId && enabled;

  // ── Primary queries (always enabled when member is selected) ────────

  const profile = useMember360Profile(memberId, isEnabled);
  const healthScore = useMemberHealthScore(memberId, isEnabled);
  const churnPrediction = useMemberChurnPrediction(memberId, isEnabled);
  const journey = useMemberJourney(memberId, isEnabled);
  const activitySummary = useMemberActivitySummary(
    memberId,
    activityPeriodDays,
    isEnabled,
  );
  const socialProfile = useMemberSocialProfile(memberId, isEnabled);
  const ltvAnalysis = useMemberLTVAnalysis(memberId, isEnabled);

  // ── On-demand queries (disabled by default) ─────────────────────────

  const riskAssessment = useMemberRiskAssessment(
    memberId,
    isEnabled && (enableOnDemand.riskAssessment ?? false),
  );

  const engagementProposals = useMemberEngagementProposals(
    memberId,
    isEnabled && (enableOnDemand.engagementProposals ?? false),
  );

  // ── Search (separate — not member-specific) ─────────────────────────
  // Excluded from per-member data state

  // ── Unified loading state ───────────────────────────────────────────

  const dataState = useMemo<Member360DataState>(() => {
    const primaryQueries = [
      { name: "profile", query: profile },
      { name: "healthScore", query: healthScore },
      { name: "churnPrediction", query: churnPrediction },
      { name: "journey", query: journey },
      { name: "activitySummary", query: activitySummary },
      { name: "socialProfile", query: socialProfile },
      { name: "ltvAnalysis", query: ltvAnalysis },
    ];

    const onDemandQueries = [
      { name: "riskAssessment", query: riskAssessment },
      { name: "engagementProposals", query: engagementProposals },
    ];

    const allQueries = [...primaryQueries, ...onDemandQueries];

    // Per-source status
    const sourceStatus: Record<string, "loading" | "loaded" | "error" | "idle"> = {};
    for (const { name, query } of allQueries) {
      if (query.isLoading) sourceStatus[name] = "loading";
      else if (query.isError) sourceStatus[name] = "error";
      else if (query.data) sourceStatus[name] = "loaded";
      else sourceStatus[name] = "idle";
    }

    // Loading: any primary query still fetching
    const isLoading = primaryQueries.some((q) => q.query.isLoading);

    // Loaded count (primary only)
    const loadedSourceCount = primaryQueries.filter(
      (q) => q.query.data && !q.query.isLoading,
    ).length;

    // Error: all primary queries failed
    const errorQueries = primaryQueries.filter((q) => q.query.isError);
    const isError = errorQueries.length >= primaryQueries.length;
    const firstError = errorQueries[0]?.query.error ?? null;

    // Minimum data: profile + healthScore loaded
    const hasMinimumData =
      !!profile.data && !!healthScore.data && !isLoading;

    // Fully loaded: all 7 primary sources loaded
    const isFullyLoaded = loadedSourceCount >= primaryQueries.length;

    return {
      isLoading,
      isError,
      error: firstError,
      loadedSourceCount,
      hasMinimumData,
      isFullyLoaded,
      sourceStatus,
    };
  }, [
    profile,
    healthScore,
    churnPrediction,
    journey,
    activitySummary,
    socialProfile,
    ltvAnalysis,
    riskAssessment,
    engagementProposals,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // RETURN — All data sources + unified state
  // ═══════════════════════════════════════════════════════════════════

  return {
    // ── Unified state ─────────────────────────────────────────────────
    isLoading: dataState.isLoading,
    isError: dataState.isError,
    error: dataState.error,
    loadedSourceCount: dataState.loadedSourceCount,
    hasMinimumData: dataState.hasMinimumData,
    isFullyLoaded: dataState.isFullyLoaded,
    sourceStatus: dataState.sourceStatus,

    // ── Raw data (typed from MCP hooks) ───────────────────────────────
    profile: profile.data,
    healthScore: healthScore.data,
    churnPrediction: churnPrediction.data,
    journey: journey.data,
    activitySummary: activitySummary.data,
    socialProfile: socialProfile.data,
    ltvAnalysis: ltvAnalysis.data,
    riskAssessment: riskAssessment.data,
    engagementProposals: engagementProposals.data,

    // ── Refetch helpers (for manual refresh) ──────────────────────────
    refetch: {
      profile: profile.refetch,
      healthScore: healthScore.refetch,
      churnPrediction: churnPrediction.refetch,
      journey: journey.refetch,
      activitySummary: activitySummary.refetch,
      socialProfile: socialProfile.refetch,
      ltvAnalysis: ltvAnalysis.refetch,
      riskAssessment: riskAssessment.refetch,
      engagementProposals: engagementProposals.refetch,
    },

    // ── Enable on-demand queries ──────────────────────────────────────
    enableRiskAssessment: () => {
      // TanStack Query doesn't support dynamic enable — caller should
      // use enableOnDemand option or trigger manually via refetch
      riskAssessment.refetch();
    },
    enableEngagementProposals: () => {
      engagementProposals.refetch();
    },
  };
}