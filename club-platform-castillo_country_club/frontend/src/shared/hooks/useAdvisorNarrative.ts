// src/shared/hooks/useAdvisorNarrative.ts
// ═══════════════════════════════════════════════════════════
// Castillo Country Club — Advisor Narrative Hook
// Fase 21b — AI-powered narrative for Advisor insights
//
// On-demand query: fires only when `enabled` is true.
// Consumer controls when to enable (user clicks "Análisis Profundo").
// Returns cached narrative on re-mount (staleTime: 10min).
// ═══════════════════════════════════════════════════════════

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { AdvisorInsightNarrativeResponse } from "@/shared/mocks/contracts";
// ── Predictive Pre-fetch (Propuesta C — F22c) ──

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callMCPTool } from "@/shared/lib/api";
import { useAuthStore } from "@/stores/auth.store";

interface UseAdvisorNarrativeOptions {
  insightData: Record<string, unknown> | null;
  financialContext?: unknown | null;
  eventsContext?: unknown | null;
  role?: string;
  enabled?: boolean;
}

export function useAdvisorNarrative({
  insightData,
  financialContext = null,
  eventsContext = null,
  role = "admin",
  enabled = true,
}: UseAdvisorNarrativeOptions) {
  return useMCPQuery<AdvisorInsightNarrativeResponse>(
    "advisor_intelligence",
    "generate_insight_narrative",
    {
      insight_data: insightData,
      financial_context: financialContext,
      events_context: eventsContext,
      role,
    },
    {
      enabled: enabled && !!insightData,
      staleTime: 600_000, // 10 min — narratives are expensive to generate
    },
  );
}
interface PrefetchableInsight {
  id: string;
  impact: string;
  confidence: number;
}

/**
 * Pre-fetches AI narratives for the top-3 most critical insights
 * when the user is ADMIN or JUNTA.
 *
 * Uses TanStack Query's prefetchQuery to warm the cache.
 * When the user clicks "Análisis Profundo", data renders from cache
 * with 0ms perceived latency. Cached for 10 minutes (staleTime).
 */
export function usePrefetchTopNarratives(
  insights: PrefetchableInsight[],
  financialContext?: unknown | null,
  eventsContext?: unknown | null,
) {
  const queryClient = useQueryClient();
  const userRole = useAuthStore((s) => s.user?.role?.toLowerCase() ?? "socio");

  useEffect(() => {
    if (userRole !== "admin" && userRole !== "junta") return;
    if (insights.length === 0) return;

    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const top3 = [...insights]
      .sort((a, b) => {
        const ia = impactOrder[a.impact] ?? 9;
        const ib = impactOrder[b.impact] ?? 9;
        if (ia !== ib) return ia - ib;
        return b.confidence - a.confidence;
      })
      .slice(0, 3);

    const role = "admin";

    top3.forEach((insight) => {
      queryClient.prefetchQuery({
        queryKey: [
          "advisor_intelligence",
          "generate_insight_narrative",
          {
            insight_data: insight,
            financial_context: financialContext ?? null,
            events_context: eventsContext ?? null,
            role,
          },
        ],
        queryFn: () =>
          callMCPTool<AdvisorInsightNarrativeResponse>(
            "advisor_intelligence",
            "generate_insight_narrative",
            {
              insight_data: insight,
              financial_context: financialContext ?? null,
              events_context: eventsContext ?? null,
              role,
            },
          ),
        staleTime: 600_000,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.length, userRole]);
}
