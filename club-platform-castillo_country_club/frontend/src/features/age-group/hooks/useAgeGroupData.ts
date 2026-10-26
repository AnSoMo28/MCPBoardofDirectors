// ═══════════════════════════════════════════════════════════
// Age Group Data — Orchestration Hook
// Castillo Country Club — Silver Tide Glass UI (Fase 27)
//
// 4 MCP queries → normalize → advisor → intelligence cascade.
//
// Proposals implemented:
//   P1  Intelligence Cascade — surfacing all outputs
//   P2  Resilient Query Lattice — partial failure
//   P3  Adaptive Freshness — visibility-based stale time
//   P4  Advisor Vitals — execution metadata
//   P5  Protocol Correctness — typed MCP params
//   P6  Invocation Guard — advisor-ready flag
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useEffect } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useAgeGroupAdvisor } from "./useAgeGroupAdvisor";
import type {
  AgeGroupHealthScore,
  AgeGroupAnalyticsEnhanced,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposalList,
} from "@/shared/mocks/contracts";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";


// ═══════════════════════════════════════════════════════════
// §1  MCP Response Types (P5 — Protocol Correctness)
// ═══════════════════════════════════════════════════════════

interface HealthScoreMCPResponse {
  status: string;
  message: string;
  health_score: AgeGroupHealthScore;
}

interface AnalyticsMCPResponse {
  status: string;
  message: string;
  analytics: AgeGroupAnalyticsEnhanced;
}

interface RecommendationsMCPResponse {
  status: string;
  message: string;
  recommendations: AgeRecommendationEnhanced;
}

interface ProposalsMCPResponse {
  status: string;
  message: string;
  proposals: AgeGroupEngagementProposalList;
}

// ═══════════════════════════════════════════════════════════
// §2  Hook Options
// ═══════════════════════════════════════════════════════════

export interface UseAgeGroupDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

// ═══════════════════════════════════════════════════════════
// §3  Local Types (P2 — Resilient Query Lattice, P4 — Advisor Vitals)
// ═══════════════════════════════════════════════════════════

export type DataSourceStatus = "healthy" | "degraded" | "failed" | "loading";

export interface DataSourceHealth {
  name: string;
  status: DataSourceStatus;
  tool: string;
}

export interface AdvisorVitals {
  rulesEvaluated: number;
  rulesMatched: number;
  insightsProduced: number;
  ripplesProduced: number;
  risksDetected: number;
  healthScore: number;
}

// ═══════════════════════════════════════════════════════════
// §4  Visibility-Based Stale Time (P3)
// ═══════════════════════════════════════════════════════════

const STALE_ACTIVE = 60_000;
const STALE_BACKGROUND = 600_000;

// ═══════════════════════════════════════════════════════════
// §5  Hook
// ═══════════════════════════════════════════════════════════

export function useAgeGroupData(options: UseAgeGroupDataOptions = {}) {
  const { enabled = true, staleTime, ragContext } = options;

  // ── P3: Adaptive Freshness ──
  const [isVisible, setIsVisible] = useState(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true,
  );

  useEffect(() => {
    const handler = () => setIsVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const effectiveStaleTime = staleTime ?? (isVisible ? STALE_ACTIVE : STALE_BACKGROUND);

  // ── MCP Queries ──
  const healthQuery = useMCPQuery<HealthScoreMCPResponse>(
    "age_group",
    "get_activity_health_score",
    {},
    { staleTime: effectiveStaleTime, enabled },
  );

  const analyticsQuery = useMCPQuery<AnalyticsMCPResponse>(
    "age_group",
    "get_age_group_analytics_enhanced",
    {},
    { staleTime: effectiveStaleTime, enabled },
  );

  const recommendationsQuery = useMCPQuery<RecommendationsMCPResponse>(
    "age_group",
    "get_age_recommendation_enhanced",
    {},
    { staleTime: 300_000, enabled },
  );

  const proposalsQuery = useMCPQuery<ProposalsMCPResponse>(
    "age_group",
    "generate_age_group_engagement_proposals",
    {},
    { staleTime: 300_000, enabled },
  );

  // ── Normalization ──
  const healthScore: AgeGroupHealthScore | null = useMemo(() => {
    if (!healthQuery.data?.health_score) return null;
    return normalizeEnums(
      healthQuery.data.health_score,
      "age_group.get_activity_health_score",
    ) as AgeGroupHealthScore;
  }, [healthQuery.data]);

  const analytics: AgeGroupAnalyticsEnhanced | null = useMemo(() => {
    if (!analyticsQuery.data?.analytics) return null;
    return normalizeEnums(
      analyticsQuery.data.analytics,
      "age_group.get_age_group_analytics_enhanced",
    ) as AgeGroupAnalyticsEnhanced;
  }, [analyticsQuery.data]);

  const recommendations: AgeRecommendationEnhanced | null = useMemo(() => {
    if (!recommendationsQuery.data?.recommendations) return null;
    return normalizeEnums(
      recommendationsQuery.data.recommendations,
      "age_group.get_age_recommendation_enhanced",
    ) as AgeRecommendationEnhanced;
  }, [recommendationsQuery.data]);

  const proposals: AgeGroupEngagementProposalList | null = useMemo(() => {
    if (!proposalsQuery.data?.proposals) return null;
    return normalizeEnums(
      proposalsQuery.data.proposals,
      "age_group.generate_age_group_engagement_proposals",
    ) as AgeGroupEngagementProposalList;
  }, [proposalsQuery.data]);

  // ── P6: Invocation Guard ──
  const advisorReady = useMemo(
    () => (healthScore !== null || analytics !== null),
    [healthScore, analytics],
  );

  // ── P1: Advisor invocation (always called — hooks rule) ──
  const advisorResult = useAgeGroupAdvisor(
    advisorReady ? healthScore : null,
    advisorReady ? analytics : null,
    advisorReady ? (recommendations ? [recommendations] : []) : [],
    advisorReady ? proposals : null,
    ragContext,
  );

  // ── P4: Advisor Vitals ──
  const advisorVitals = useMemo((): AdvisorVitals => ({
    rulesEvaluated: 12,
    rulesMatched: advisorResult.totalInsights,
    insightsProduced: advisorResult.totalInsights,
    ripplesProduced: advisorResult.ripples.length,
    risksDetected: advisorResult.agingOutRisks.filter(
      (r) => r.urgency === "act" || r.urgency === "plan",
    ).length,
    healthScore: advisorResult.cohortHealth.length > 0
      ? Math.round(
          advisorResult.cohortHealth.reduce((s, c) => s + c.healthScore, 0) /
            advisorResult.cohortHealth.length,
        )
      : 0,
  }), [advisorResult]);

  // ── P2: Resilient Query Lattice ──
  const queries = [healthQuery, analyticsQuery, recommendationsQuery, proposalsQuery];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.isError)?.error ?? null;

  const dataSourceHealth = useMemo((): DataSourceHealth[] => [
    {
      name: "Health Score",
      status: healthQuery.isLoading
        ? "loading"
        : healthQuery.isError
          ? "failed"
          : healthQuery.data
            ? "healthy"
            : "degraded",
      tool: "get_activity_health_score",
    },
    {
      name: "Analytics",
      status: analyticsQuery.isLoading
        ? "loading"
        : analyticsQuery.isError
          ? "failed"
          : analyticsQuery.data
            ? "healthy"
            : "degraded",
      tool: "get_age_group_analytics_enhanced",
    },
    {
      name: "Recommendations",
      status: recommendationsQuery.isLoading
        ? "loading"
        : recommendationsQuery.isError
          ? "failed"
          : recommendationsQuery.data
            ? "healthy"
            : "degraded",
      tool: "get_age_recommendation_enhanced",
    },
    {
      name: "Proposals",
      status: proposalsQuery.isLoading
        ? "loading"
        : proposalsQuery.isError
          ? "failed"
          : proposalsQuery.data
            ? "healthy"
            : "degraded",
      tool: "generate_age_group_engagement_proposals",
    },
  ], [healthQuery, analyticsQuery, recommendationsQuery, proposalsQuery]);

  const hasPartialData = useMemo(
    () =>
      dataSourceHealth.some((d) => d.status === "healthy") &&
      dataSourceHealth.some((d) => d.status === "failed" || d.status === "degraded"),
    [dataSourceHealth],
  );

  // ── P1: Intelligence Cascade — full return ──
  return {
    // Data
    healthScore,
    analytics,
    recommendations,
    proposals,
    // Advisor core
    insights: advisorResult.insights,
    topInsights: advisorResult.topInsights,
    hasHighSeverity: advisorResult.hasHighSeverity,
    totalInsights: advisorResult.totalInsights,
    // P1: Intelligence outputs
    ripples: advisorResult.ripples,
    agingOutRisks: advisorResult.agingOutRisks,
    cohortHealth: advisorResult.cohortHealth,
    crossDomainThreads: advisorResult.crossDomainThreads,
    seasonalContext: advisorResult.seasonalContext,
    insightBrackets: advisorResult.insightBrackets,
    insightTiers: advisorResult.insightTiers,
    // P2: Query health
    dataSourceHealth,
    hasPartialData,
    // P4: Advisor vitals
    advisorVitals,
    // P6: Readiness
    advisorReady,
    // State
    isLoading,
    isError,
    error,
    // Raw queries (for advanced consumers)
    healthQuery,
    analyticsQuery,
    recommendationsQuery,
    proposalsQuery,
  };
}