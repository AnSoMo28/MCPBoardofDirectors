// src/shared/hooks/useInsightCounts.ts
/**
 * useInsightCounts — Sidebar badge counts derived from domain health scores.
 *
 * Reads TanStack Query cache (non-blocking — returns 0 if data not cached).
 * Updates reactively when cache changes via QueryCache subscription.
 *
 * Severity mapping:
 *   <45 = 3 badges (critical)
 *   <65 = 2 badges (high)
 *   <85 = 1 badge (medium)
 *   ≥85 = 0 (healthy, no badge)
 */

import { useMemo, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface DomainInsightCount {
  count: number;
  color: string;
}

const COUNT_CONFIG = [
  { threshold: 45, count: 3, color: "var(--color-rose-400)" },
  { threshold: 65, count: 2, color: "var(--color-amber-400)" },
  { threshold: 85, count: 1, color: "var(--color-teal-400)" },
] as const;

function deriveCount(score: number | null | undefined): { count: number; color: string } | null {
  if (score == null) return null;
  for (const cfg of COUNT_CONFIG) {
    if (score < cfg.threshold) return { count: cfg.count, color: cfg.color };
  }
  return null; // ≥85 = healthy, no badge
}

export function useInsightCounts(): Record<string, DomainInsightCount> {
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0);

  // Subscribe to cache updates — triggers re-computation
  // Filter: only react to successful data fetches, not internal setOptions/setState
  // which fires during render cycle and causes infinite re-render loop
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action?.type === "success") {
        setTick((t) => t + 1);
      }
    });
  }, [queryClient]);


  return useMemo(() => {
    const result: Record<string, DomainInsightCount> = {};

    const check = (
      route: string,
      queryKey: unknown[],
      accessor: (data: unknown) => number | undefined,
    ) => {
      const data = queryClient.getQueryData(queryKey);
      const entry = deriveCount(accessor(data));
      if (entry) result[route] = entry;
    };

    // Age Group health
    check(
      "/admin/age-groups",
      ["age_group", "get_activity_health_score", {}],
      (d) => (d as { health_score?: { score?: number } } | undefined)?.health_score?.score,
    );

    // Guest health
    check(
      "/admin/guests",
      ["guest_management", "get_guest_health_score", {}],
      (d) => (d as { health_score?: { score?: number } } | undefined)?.health_score?.score,
    );

    // ML data quality
    check(
      "/admin/ml",
      ["ml_intelligence", "get_data_quality_report", {}],
      (d) => (d as { report?: { overall_score?: number } } | undefined)?.report?.overall_score,
    );

    // Satisfaction health
    check(
      "/admin/engagement",
      ["satisfaction", "get_satisfaction_health_score", {}],
      (d) => (d as { health_score?: { score?: number } } | undefined)?.health_score?.score,
    );

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, tick]);
}
