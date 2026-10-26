// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Data Hook (2027 REWRITE)
//
// Activates ALL 8 MCP tools (was 3 → now 8).
// 7 passive queries + 2 on-demand generation functions.
// Normalizes all data. Feeds complete picture to advisor.
//
// MCP Server: "proactive_recommendation"
//   Passive queries:
//     1. optimize_pricing        → PricingOptimization[]
//     2. suggest_new_activities  → ActivitySuggestion[]
//     3. generate_quarterly_insights → QuarterlyInsight[]
//     4. get_recommendations     → Recommendation[]
//     5. get_scheduling_conflicts → SchedulingConflict[]
//     6. get_social_clusters     → SocialCluster[]
//     7. predict_attendance      → AttendancePrediction[]
//   On-demand generation:
//     8. predict_attendance      → single AttendancePrediction
//     9. personalize_communication → CommunicationDraft
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { callMCPTool } from "@/shared/lib/api";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useRecommendationAdvisor } from "./useRecommendationAdvisor";

import type {
  PricingOptimization,
  ActivitySuggestion,
  QuarterlyInsight,
  Recommendation,
  AttendancePrediction,
  SchedulingConflict,
  SocialCluster,
  CommunicationDraft,
} from "../types";

import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════════════════
// MCP RESPONSE TYPES — Matches backend contract
// ═══════════════════════════════════════════════════════════════════════

interface PricingsListResponse {
  status: string;
  message: string;
  pricings: PricingOptimization[];
}

interface SuggestionsListResponse {
  status: string;
  message: string;
  suggestions: ActivitySuggestion[];
}

interface QuarterlyInsightsListResponse {
  status: string;
  message: string;
  insights: QuarterlyInsight[];
}

interface RecommendationsListResponse {
  status: string;
  message: string;
  recommendations: Recommendation[];
}

interface PredictionsListResponse {
  status: string;
  message: string;
  predictions: AttendancePrediction[];
}

interface ConflictsListResponse {
  status: string;
  message: string;
  conflicts: SchedulingConflict[];
  total_conflicts: number;
}

interface ClustersListResponse {
  status: string;
  message: string;
  clusters: SocialCluster[];
  total_clusters: number;
}

interface CommunicationDraftResponse {
  status: string;
  message: string;
  draft: CommunicationDraft;
}

interface PredictionSingleResponse {
  status: string;
  message: string;
  prediction: AttendancePrediction;
}

// ═══════════════════════════════════════════════════════════════════════
// NORMALIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════

const MCP_SERVER = "proactive_recommendation";

function normalize<T>(
  data: unknown,
  toolKey: string,
): T {
  return normalizeEnums(data, `${MCP_SERVER}.${toolKey}`) as T;
}

// ═══════════════════════════════════════════════════════════════════════
// STALE TIMES — Per-query freshness policy
// ═══════════════════════════════════════════════════════════════════════

const STALE_TIME = {
  /** Pricing is demand-driven, needs freshness */
  pricings: 60_000,
  /** Activity suggestions moderate volatility */
  suggestions: 120_000,
  /** Quarterly data is very stable */
  quarterlyInsights: 300_000,
  /** AI-generated recommendations, dynamic */
  recommendations: 60_000,
  /** Scheduling conflicts need quick detection */
  conflicts: 30_000,
  /** Attendance predictions moderate freshness */
  predictions: 120_000,
  /** Social clusters change slowly */
  clusters: 300_000,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// OPTIONS
// ═══════════════════════════════════════════════════════════════════════

export interface UseRecommendationDataOptions {
  enabled?: boolean;
  staleTime?: number;
  ragContext?: RAGContext[];
}

// ═══════════════════════════════════════════════════════════════════════
// ON-DEMAND GENERATION PARAMS
// ═══════════════════════════════════════════════════════════════════════

export interface PredictAttendanceParams {
  event_id: string;
  factors?: string[];
}

export interface PersonalizeCommunicationParams {
  family_id: string;
  channel: string;
  tone?: string;
  context?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

export function useRecommendationData(
  options: UseRecommendationDataOptions = {},
) {
  const { enabled = true, staleTime, ragContext } = options;

  // ── 1. Pricings ─────────────────────────────────────────────────────

  const pricingsQuery = useMCPQuery<PricingsListResponse>(
    MCP_SERVER,
    "optimize_pricing",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.pricings, enabled },
  );

  // ── 2. Activity Suggestions ─────────────────────────────────────────

  const suggestionsQuery = useMCPQuery<SuggestionsListResponse>(
    MCP_SERVER,
    "suggest_new_activities",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.suggestions, enabled },
  );

  // ── 3. Quarterly Insights ───────────────────────────────────────────

  const quarterlyInsightsQuery = useMCPQuery<QuarterlyInsightsListResponse>(
    MCP_SERVER,
    "generate_quarterly_insights",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.quarterlyInsights, enabled },
  );

  // ── 4. Family Recommendations (NEW — was dead) ─────────────────────

  const recommendationsQuery = useMCPQuery<RecommendationsListResponse>(
    MCP_SERVER,
    "get_recommendations",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.recommendations, enabled },
  );

  // ── 5. Scheduling Conflicts (NEW — was dead) ───────────────────────

  const conflictsQuery = useMCPQuery<ConflictsListResponse>(
    MCP_SERVER,
    "get_scheduling_conflicts",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.conflicts, enabled },
  );

  // ── 6. Attendance Predictions (NEW — was dead) ─────────────────────

  const predictionsQuery = useMCPQuery<PredictionsListResponse>(
    MCP_SERVER,
    "predict_attendance",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.predictions, enabled },
  );

  // ── 7. Social Clusters (NEW — was dead) ────────────────────────────

  const clustersQuery = useMCPQuery<ClustersListResponse>(
    MCP_SERVER,
    "get_social_clusters",
    { action: "list" },
    { staleTime: staleTime ?? STALE_TIME.clusters, enabled },
  );

  // ═══════════════════════════════════════════════════════════════════
  // NORMALIZATION — All data sources
  // ═══════════════════════════════════════════════════════════════════

  const pricings: PricingOptimization[] | null = useMemo(() => {
    if (!pricingsQuery.data?.pricings) return null;
    return normalize<PricingOptimization[]>(
      pricingsQuery.data.pricings,
      "optimize_pricing",
    );
  }, [pricingsQuery.data]);

  const suggestions: ActivitySuggestion[] | null = useMemo(() => {
    if (!suggestionsQuery.data?.suggestions) return null;
    return normalize<ActivitySuggestion[]>(
      suggestionsQuery.data.suggestions,
      "suggest_new_activities",
    );
  }, [suggestionsQuery.data]);

  const quarterlyInsights: QuarterlyInsight[] | null = useMemo(() => {
    if (!quarterlyInsightsQuery.data?.insights) return null;
    return normalize<QuarterlyInsight[]>(
      quarterlyInsightsQuery.data.insights,
      "generate_quarterly_insights",
    );
  }, [quarterlyInsightsQuery.data]);

  const recommendations: Recommendation[] | null = useMemo(() => {
    if (!recommendationsQuery.data?.recommendations) return null;
    return normalize<Recommendation[]>(
      recommendationsQuery.data.recommendations,
      "get_recommendations",
    );
  }, [recommendationsQuery.data]);

  const conflicts: SchedulingConflict[] | null = useMemo(() => {
    if (!conflictsQuery.data?.conflicts) return null;
    return normalize<SchedulingConflict[]>(
      conflictsQuery.data.conflicts,
      "get_scheduling_conflicts",
    );
  }, [conflictsQuery.data]);

  const predictions: AttendancePrediction[] | null = useMemo(() => {
    if (!predictionsQuery.data?.predictions) return null;
    return normalize<AttendancePrediction[]>(
      predictionsQuery.data.predictions,
      "predict_attendance",
    );
  }, [predictionsQuery.data]);

  const clusters: SocialCluster[] | null = useMemo(() => {
    if (!clustersQuery.data?.clusters) return null;
    return normalize<SocialCluster[]>(
      clustersQuery.data.clusters,
      "get_social_clusters",
    );
  }, [clustersQuery.data]);

  // ═══════════════════════════════════════════════════════════════════
  // ADVISOR — Computed intelligence from all 7 data sources
  // ═══════════════════════════════════════════════════════════════════

  const advisor = useRecommendationAdvisor(
    {
      pricings: pricings ?? [],
      suggestions: suggestions ?? [],
      insights: quarterlyInsights ?? [],
      recommendations: recommendations ?? [],
      predictions: predictions ?? [],
      conflicts: conflicts ?? [],
      clusters: clusters ?? [],
    },
    ragContext,
  );

  // ═══════════════════════════════════════════════════════════════════
  // ON-DEMAND GENERATION — Active tool invocations
  // ═══════════════════════════════════════════════════════════════════

  /** Generate a single attendance prediction for a specific event */
  const generatePrediction = useCallback(
    async (params: PredictAttendanceParams): Promise<AttendancePrediction | null> => {
      try {
        const response = await callMCPTool<PredictionSingleResponse>(
          MCP_SERVER,
          "predict_attendance",
          { event_id: params.event_id, factors: params.factors },
        );
        return response.prediction ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  /** Generate a personalized communication draft for a specific family */
  const generateCommunication = useCallback(
    async (params: PersonalizeCommunicationParams): Promise<CommunicationDraft | null> => {
      try {
        const response = await callMCPTool<CommunicationDraftResponse>(
          MCP_SERVER,
          "personalize_communication",
          {
            family_id: params.family_id,
            channel: params.channel,
            tone: params.tone ?? "formal",
            context: params.context ?? {},
          },
        );
        return response.draft ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════════
  // AGGREGATE STATUS
  // ═══════════════════════════════════════════════════════════════════

  const allQueries = [
    pricingsQuery,
    suggestionsQuery,
    quarterlyInsightsQuery,
    recommendationsQuery,
    conflictsQuery,
    predictionsQuery,
    clustersQuery,
  ];

  const isLoading = allQueries.some((q) => q.isLoading);
  const isError = allQueries.some((q) => q.isError);
  const error = allQueries.find((q) => q.isError)?.error ?? null;

  /** Count of successfully loaded data sources (0-7) */
  const loadedSourceCount = allQueries.filter(
    (q) => q.data && !q.isLoading && !q.isError,
  ).length;

  /** Whether enough data is loaded for the advisor to be meaningful (≥3 sources) */
  const hasMinimumData = loadedSourceCount >= 3;

  // ═══════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════

  return {
    // ── All data sources ──────────────────────────────────────────────
    pricings,
    suggestions,
    quarterlyInsights,
    recommendations,
    predictions,
    conflicts,
    clusters,

    // ── Advisor intelligence ──────────────────────────────────────────
    advisor,

    // ── Aggregate status ──────────────────────────────────────────────
    isLoading,
    isError,
    error,
    loadedSourceCount,
    hasMinimumData,

    // ── On-demand generation ──────────────────────────────────────────
    generatePrediction,
    generateCommunication,

    // ── Individual queries (for granular refetch/invalidate) ──────────
    queries: {
      pricings: pricingsQuery,
      suggestions: suggestionsQuery,
      quarterlyInsights: quarterlyInsightsQuery,
      recommendations: recommendationsQuery,
      predictions: predictionsQuery,
      conflicts: conflictsQuery,
      clusters: clustersQuery,
    },
  };
}