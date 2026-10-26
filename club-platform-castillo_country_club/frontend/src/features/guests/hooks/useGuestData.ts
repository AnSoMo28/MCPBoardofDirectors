// ═══════════════════════════════════════════════════════════
// src/features/guests/hooks/useGuestData.ts
// Phase 34 "The Gateway" — Guest Data Hook
// Level 6+ Agency · Production Grade
//
// Pure data fetching layer. 5 MCP queries + normalizeEnums.
// Returns raw data + loading/error states.
// Advisor integration moved to useGuestAdvisor (called by useGuestDashboard).
//
// Changes from original:
//   - REMOVED: useGuestAdvisor call (moved to useGuestDashboard)
//   - REMOVED: insights from return (use useGuestDashboard instead)
//   - KEPT: All 5 MCP queries with normalizeEnums
//   - KEPT: Aggregated loading/error states
//   - KEPT: Direct query access for refetching
//
// Checklist: M1-15, M7-10
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
  GuestDemandForecast,
  GuestEngagementProposalList,
} from "@/shared/mocks/contracts";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// §1 — MCP RESPONSE SHAPES
// ═══════════════════════════════════════════════════════════

interface HealthScoreMCPResponse {
  status: string;
  message: string;
  health_score: GuestHealthScore;
}

interface FunnelMCPResponse {
  status: string;
  message: string;
  funnel: ConversionFunnel;
}

interface AnalyticsMCPResponse {
  status: string;
  message: string;
  analytics: GuestAnalyticsEnhanced;
}

interface ForecastMCPResponse {
  status: string;
  message: string;
  forecast: GuestDemandForecast;
}

interface ProposalsMCPResponse {
  status: string;
  message: string;
  proposals: GuestEngagementProposalList;
}

// ═══════════════════════════════════════════════════════════
// §2 — OPTIONS & RETURN TYPE
// ═══════════════════════════════════════════════════════════

export interface UseGuestDataOptions {
  enabled?: boolean;
  staleTime?: number;
  /** RAG context — passed through to useGuestAdvisor by useGuestDashboard. */
  ragContext?: RAGContext[];
}

export interface UseGuestDataReturn {
  // ── Normalized MCP data ──
  readonly healthScore: GuestHealthScore | null;
  readonly funnel: ConversionFunnel | null;
  readonly analytics: GuestAnalyticsEnhanced | null;
  readonly forecast: GuestDemandForecast | null;
  readonly proposals: GuestEngagementProposalList | null;
  // ── Aggregate states ──
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
  // ── Direct query access (for refetching) ──
  readonly healthQuery: ReturnType<typeof useMCPQuery<HealthScoreMCPResponse>>;
  readonly funnelQuery: ReturnType<typeof useMCPQuery<FunnelMCPResponse>>;
  readonly analyticsQuery: ReturnType<typeof useMCPQuery<AnalyticsMCPResponse>>;
  readonly forecastQuery: ReturnType<typeof useMCPQuery<ForecastMCPResponse>>;
  readonly proposalsQuery: ReturnType<typeof useMCPQuery<ProposalsMCPResponse>>;
}

// ═══════════════════════════════════════════════════════════
// §3 — HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Pure data fetching hook for guest management.
 * Returns normalized MCP data + loading/error states.
 *
 * Does NOT compute insights — use useGuestDashboard for that.
 * useGuestDashboard calls this hook + engines + useGuestAdvisor.
 *
 * @example
 * const data = useGuestData();
 * if (data.isLoading) return <Skeleton />;
 * if (data.isError) return <ErrorState error={data.error} />;
 * // data.healthScore, data.funnel, etc. are available
 */
export function useGuestData(options: UseGuestDataOptions = {}): UseGuestDataReturn {
  const { enabled = true, staleTime = 120_000 } = options;

  // ── MCP Queries ──
  const healthQuery = useMCPQuery<HealthScoreMCPResponse>(
    "guest_management",
    "get_guest_health_score",
    {},
    { staleTime, enabled },
  );

  const funnelQuery = useMCPQuery<FunnelMCPResponse>(
    "guest_management",
    "get_conversion_funnel",
    {},
    { staleTime, enabled },
  );

  const analyticsQuery = useMCPQuery<AnalyticsMCPResponse>(
    "guest_management",
    "get_guest_analytics_enhanced",
    {},
    { staleTime, enabled },
  );

  const forecastQuery = useMCPQuery<ForecastMCPResponse>(
    "guest_management",
    "get_guest_forecast",
    {},
    { staleTime: 300_000, enabled },
  );

  const proposalsQuery = useMCPQuery<ProposalsMCPResponse>(
    "guest_management",
    "generate_guest_engagement_proposals",
    {},
    { staleTime: 300_000, enabled },
  );

  // ── Normalized selectors ──
  const healthScore: GuestHealthScore | null = useMemo(() => {
    if (!healthQuery.data?.health_score) return null;
    return normalizeEnums(
      healthQuery.data.health_score,
      "guest_management.get_guest_health_score",
    ) as GuestHealthScore;
  }, [healthQuery.data]);

  const funnel: ConversionFunnel | null = useMemo(() => {
    if (!funnelQuery.data?.funnel) return null;
    return normalizeEnums(
      funnelQuery.data.funnel,
      "guest_management.get_conversion_funnel",
    ) as ConversionFunnel;
  }, [funnelQuery.data]);

  const analytics: GuestAnalyticsEnhanced | null = useMemo(() => {
    if (!analyticsQuery.data?.analytics) return null;
    return normalizeEnums(
      analyticsQuery.data.analytics,
      "guest_management.get_guest_analytics_enhanced",
    ) as GuestAnalyticsEnhanced;
  }, [analyticsQuery.data]);

  const forecast: GuestDemandForecast | null = useMemo(() => {
    if (!forecastQuery.data?.forecast) return null;
    return normalizeEnums(
      forecastQuery.data.forecast,
      "guest_management.get_guest_forecast",
    ) as GuestDemandForecast;
  }, [forecastQuery.data]);

  const proposals: GuestEngagementProposalList | null = useMemo(() => {
    if (!proposalsQuery.data?.proposals) return null;
    return normalizeEnums(
      proposalsQuery.data.proposals,
      "guest_management.generate_guest_engagement_proposals",
    ) as GuestEngagementProposalList;
  }, [proposalsQuery.data]);

  // ── Aggregate states ──
  const queries = [healthQuery, funnelQuery, analyticsQuery, forecastQuery, proposalsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  return {
    healthScore,
    funnel,
    analytics,
    forecast,
    proposals,
    isLoading,
    isError,
    error,
    healthQuery,
    funnelQuery,
    analyticsQuery,
    forecastQuery,
    proposalsQuery,
  };
}