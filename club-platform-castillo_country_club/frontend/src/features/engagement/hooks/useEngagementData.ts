// src/features/engagement/hooks/useEngagementData.ts
// ═══════════════════════════════════════════════════════════
// Engagement Data Orchestrator — Two-Hook Pattern (Hook 1/2)
// Castillo Country Club — Phase 31 "The Voice"
//
// Aggregates ALL MCP queries for the engagement domain.
// Adaptive freshness per query tier:
//   realtime  (60s)  — critical signals
//   standard  (120s) — normal dashboard data
//   reference (300s) — benchmarks, proposals
//   historical (600s) — trends, clusters
//
// Resilient query lattice: each query independent.
// One failing query doesn't block others.
//
// ZERO JSX. ZERO rendering logic. Only data + loading states.
// Rules: R60 (Two-Hook Pattern), R61 (no hooks in engines)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { ENGAGEMENT_FRESHNESS_TIERS } from "../types";

import type {
  EngagementDashboardResponse,
  WellnessTabData,
  SatisfactionTabData,
  SocialClusterItem,
  QuarterlyInsightsData,
  SchedulingConflictItem,
} from "../types";

import type {
  SatisfactionHealthScore,
  SatisfactionIntelligence,
  SatisfactionBenchmarkReport,
  SatisfactionEngagementProposalList,
} from "@/shared/mocks/contracts";

// ── MCP Response Wrappers ────────────────────────────────────

interface EngagementDashboardMCPResponse {
  status: string;
  message: string;
  data: EngagementDashboardResponse;
}

interface WellnessMCPResponse {
  status: string;
  message: string;
  data: WellnessTabData;
}

interface SatisfactionTrendsMCPResponse {
  status: string;
  message: string;
  data: SatisfactionTabData;
}

interface SocialClustersMCPResponse {
  status: string;
  message: string;
  data: SocialClusterItem[];
}

interface SatisfactionHealthMCPResponse {
  status: string;
  message: string;
  health_score: SatisfactionHealthScore;
}

interface SatisfactionIntelligenceMCPResponse {
  status: string;
  message: string;
  intelligence: SatisfactionIntelligence;
}

interface SatisfactionBenchmarkMCPResponse {
  status: string;
  message: string;
  benchmark: SatisfactionBenchmarkReport;
}

interface SatisfactionProposalsMCPResponse {
  status: string;
  message: string;
  proposals: SatisfactionEngagementProposalList;
}

interface QuarterlyInsightsMCPResponse {
  status: string;
  message: string;
  data: QuarterlyInsightsData;
}

interface SchedulingConflictsMCPResponse {
  status: string;
  message: string;
  data: SchedulingConflictItem[];
}

// ── Hook Options ─────────────────────────────────────────────

export interface UseEngagementDataOptions {
  /** Enable/disable all queries (default: true) */
  enabled?: boolean;

  /** Enable deep-dive queries (wellness, satisfaction, innovation) */
  deepDiveEnabled?: boolean;

  /** Override freshness tiers */
  staleTimeOverrides?: Partial<Record<string, number>>;
}

// ── Hook Return Type ─────────────────────────────────────────

export interface UseEngagementDataReturn {
  // Core (always loaded)
  dashboard: EngagementDashboardResponse | null;
  dashboardLoading: boolean;
  dashboardError: Error | null;
  dashboardRefetch: () => void;

  // Deep-dive: Wellness
  wellness: WellnessTabData | null;
  wellnessLoading: boolean;

  // Deep-dive: Satisfaction
  satisfactionTrends: SatisfactionTabData | null;
  socialClusters: SocialClusterItem[] | null;
  satisfactionHealth: SatisfactionHealthScore | null;
  satisfactionIntelligence: SatisfactionIntelligence | null;
  satisfactionBenchmark: SatisfactionBenchmarkReport | null;
  satisfactionProposals: SatisfactionEngagementProposalList | null;
  satisfactionLoading: boolean;

  // Deep-dive: Innovation
  quarterlyInsights: QuarterlyInsightsData | null;
  schedulingConflicts: SchedulingConflictItem[] | null;
  innovationLoading: boolean;

  // Aggregate states
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

// ══════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════

/**
 * Engagement Data Orchestrator — aggregates all MCP queries.
 *
 * Follows the Two-Hook Pattern:
 *   Hook 1 (this file): Data Orchestrator — all queries
 *   Hook 2 (useEngagementDashboard): Neural Hub — all intelligence
 *
 * @param options — enable/disable, freshness overrides
 */
export function useEngagementData(
  options: UseEngagementDataOptions = {},
): UseEngagementDataReturn {
  const {
    enabled = true,
    deepDiveEnabled = true,
    staleTimeOverrides,
  } = options;

  const ft = ENGAGEMENT_FRESHNESS_TIERS;

  // ── Core: Engagement Dashboard (always loaded, realtime tier) ──

  const dashboardQ = useMCPQuery<EngagementDashboardMCPResponse>(
    "member_engagement",
    "get_engagement_dashboard",
    {},
    {
      staleTime: staleTimeOverrides?.dashboard ?? ft.standard,
      enabled,
    },
  );

  // ── Deep-dive: Wellness (reference tier) ─────────────────────

  const wellnessQ = useMCPQuery<WellnessMCPResponse>(
    "wellness",
    "wellness_report",
    { period: "current_quarter" },
    {
      staleTime: staleTimeOverrides?.wellness ?? ft.reference,
      enabled: enabled && deepDiveEnabled,
    },
  );

  // ── Deep-dive: Satisfaction (standard tier) ──────────────────

  const satisfactionTrendsQ = useMCPQuery<SatisfactionTrendsMCPResponse>(
    "satisfaction",
    "get_satisfaction_trends",
    {},
    {
      staleTime: staleTimeOverrides?.satisfactionTrends ?? ft.standard,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const socialClustersQ = useMCPQuery<SocialClustersMCPResponse>(
    "proactive_recommendation",
    "identify_social_clusters",
    {},
    {
      staleTime: staleTimeOverrides?.socialClusters ?? ft.reference,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const satisfactionHealthQ = useMCPQuery<SatisfactionHealthMCPResponse>(
    "satisfaction",
    "get_satisfaction_health_score",
    {},
    {
      staleTime: staleTimeOverrides?.satisfactionHealth ?? ft.standard,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const satisfactionIntelligenceQ = useMCPQuery<SatisfactionIntelligenceMCPResponse>(
    "satisfaction",
    "get_satisfaction_intelligence",
    { lookback_months: 6 },
    {
      staleTime: staleTimeOverrides?.satisfactionIntelligence ?? ft.standard,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const satisfactionBenchmarkQ = useMCPQuery<SatisfactionBenchmarkMCPResponse>(
    "satisfaction",
    "get_satisfaction_benchmark",
    {},
    {
      staleTime: staleTimeOverrides?.satisfactionBenchmark ?? ft.reference,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const satisfactionProposalsQ = useMCPQuery<SatisfactionProposalsMCPResponse>(
    "satisfaction",
    "generate_satisfaction_engagement_proposals",
    {},
    {
      staleTime: staleTimeOverrides?.satisfactionProposals ?? ft.reference,
      enabled: enabled && deepDiveEnabled,
    },
  );

  // ── Deep-dive: Innovation (historical tier) ──────────────────

  const quarterlyInsightsQ = useMCPQuery<QuarterlyInsightsMCPResponse>(
    "proactive_recommendation",
    "generate_quarterly_insights",
    {},
    {
      staleTime: staleTimeOverrides?.quarterlyInsights ?? ft.historical,
      enabled: enabled && deepDiveEnabled,
    },
  );

  const schedulingConflictsQ = useMCPQuery<SchedulingConflictsMCPResponse>(
    "proactive_recommendation",
    "detect_scheduling_conflicts",
    {},
    {
      staleTime: staleTimeOverrides?.schedulingConflicts ?? ft.realtime,
      enabled: enabled && deepDiveEnabled,
    },
  );

  // ── Normalize enums ──────────────────────────────────────────

  const dashboard: EngagementDashboardResponse | null = useMemo(() => {
    const raw = dashboardQ.data?.data ?? dashboardQ.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "member_engagement.get_engagement_dashboard",
    ) as EngagementDashboardResponse;
  }, [dashboardQ.data]);

  const wellness: WellnessTabData | null = useMemo(() => {
    const raw = wellnessQ.data?.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "wellness.wellness_report",
    ) as WellnessTabData;
  }, [wellnessQ.data]);

  const satisfactionTrends: SatisfactionTabData | null = useMemo(() => {
    const raw = satisfactionTrendsQ.data?.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "satisfaction.get_satisfaction_trends",
    ) as SatisfactionTabData;
  }, [satisfactionTrendsQ.data]);

  const socialClusters: SocialClusterItem[] | null = useMemo(() => {
    const raw = socialClustersQ.data?.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "proactive_recommendation.identify_social_clusters",
    ) as SocialClusterItem[];
  }, [socialClustersQ.data]);

  const satisfactionHealth: SatisfactionHealthScore | null = useMemo(() => {
    if (!satisfactionHealthQ.data?.health_score) return null;
    return normalizeEnums(
      satisfactionHealthQ.data.health_score,
      "satisfaction.get_satisfaction_health_score",
    ) as SatisfactionHealthScore;
  }, [satisfactionHealthQ.data]);

  const satisfactionIntelligence: SatisfactionIntelligence | null = useMemo(() => {
    if (!satisfactionIntelligenceQ.data?.intelligence) return null;
    return normalizeEnums(
      satisfactionIntelligenceQ.data.intelligence,
      "satisfaction.get_satisfaction_intelligence",
    ) as SatisfactionIntelligence;
  }, [satisfactionIntelligenceQ.data]);

  const satisfactionBenchmark: SatisfactionBenchmarkReport | null = useMemo(() => {
    if (!satisfactionBenchmarkQ.data?.benchmark) return null;
    return normalizeEnums(
      satisfactionBenchmarkQ.data.benchmark,
      "satisfaction.get_satisfaction_benchmark",
    ) as SatisfactionBenchmarkReport;
  }, [satisfactionBenchmarkQ.data]);

  const satisfactionProposals: SatisfactionEngagementProposalList | null = useMemo(() => {
    if (!satisfactionProposalsQ.data?.proposals) return null;
    return normalizeEnums(
      satisfactionProposalsQ.data.proposals,
      "satisfaction.generate_satisfaction_engagement_proposals",
    ) as SatisfactionEngagementProposalList;
  }, [satisfactionProposalsQ.data]);

  const quarterlyInsights: QuarterlyInsightsData | null = useMemo(() => {
    const raw = quarterlyInsightsQ.data?.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "proactive_recommendation.generate_quarterly_insights",
    ) as QuarterlyInsightsData;
  }, [quarterlyInsightsQ.data]);

  const schedulingConflicts: SchedulingConflictItem[] | null = useMemo(() => {
    const raw = schedulingConflictsQ.data?.data;
    if (!raw) return null;
    return normalizeEnums(
      raw,
      "proactive_recommendation.detect_scheduling_conflicts",
    ) as SchedulingConflictItem[];
  }, [schedulingConflictsQ.data]);

  // ── Aggregate states ─────────────────────────────────────────

  const coreQueries = [dashboardQ];
  const deepDiveQueries = [
    wellnessQ,
    satisfactionTrendsQ,
    socialClustersQ,
    satisfactionHealthQ,
    satisfactionIntelligenceQ,
    satisfactionBenchmarkQ,
    satisfactionProposalsQ,
    quarterlyInsightsQ,
    schedulingConflictsQ,
  ];

  const activeQueries = deepDiveEnabled
    ? [...coreQueries, ...deepDiveQueries]
    : coreQueries;

  const isLoading = activeQueries.some(
    (q: { isLoading: boolean }) => q.isLoading,
  );
  const isReady = dashboard !== null;
  const error =
    activeQueries.find((q: { isError: boolean; error: Error | null }) => q.isError)?.error ?? null;

  // ── Satisfaction sub-loading ─────────────────────────────────

  const satisfactionLoading =
    satisfactionTrendsQ.isLoading ||
    socialClustersQ.isLoading ||
    satisfactionHealthQ.isLoading ||
    satisfactionIntelligenceQ.isLoading ||
    satisfactionBenchmarkQ.isLoading ||
    satisfactionProposalsQ.isLoading;

  const innovationLoading =
    quarterlyInsightsQ.isLoading ||
    schedulingConflictsQ.isLoading;

  return {
    // Core
    dashboard,
    dashboardLoading: dashboardQ.isLoading,
    dashboardError: dashboardQ.error ?? null,
    dashboardRefetch: () => { dashboardQ.refetch(); },

    // Wellness
    wellness,
    wellnessLoading: wellnessQ.isLoading,

    // Satisfaction
    satisfactionTrends,
    socialClusters,
    satisfactionHealth,
    satisfactionIntelligence,
    satisfactionBenchmark,
    satisfactionProposals,
    satisfactionLoading,

    // Innovation
    quarterlyInsights,
    schedulingConflicts,
    innovationLoading,

    // Aggregate
    isLoading,
    isReady,
    error,
  };
}