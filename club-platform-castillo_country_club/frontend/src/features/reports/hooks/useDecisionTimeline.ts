/**
 * @hook useDecisionTimeline (Fase 25)
 * @module features/reports/hooks
 * @exports useDecisionTimeline, type OutcomeFilter, type TimeRange
 * @note Decision timeline data, filtering (outcome + domain + time range),
 *       pagination, derived stats with accuracy.
 */

import { useState, useMemo, useCallback } from "react";
import {
  getAllOutcomes,
} from "@/shared/lib/advisor-engine/calibration-storage";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type OutcomeFilter = "all" | "success" | "partial" | "failed";
export type TimeRange = "all" | "7d" | "30d" | "90d";

export interface TimelineEntry {
  id: string;
  ruleId: string;
  domain: string;
  impact: "high" | "medium" | "low";   // ← era "string"
  outcome: "success" | "partial" | "failed" | "unknown";  // ← era "string"
  originalConfidence: number;
  executedAt: number;
  metricDelta?: number;
  feedback?: string;
}

export interface TimelineStats {
  total: number;
  success: number;
  partial: number;
  failed: number;
  accuracy: number;
}

export interface UseDecisionTimelineReturn {
  /* Entries */
  entries: TimelineEntry[];
  filtered: TimelineEntry[];
  displayEntries: TimelineEntry[];
  hasMore: boolean;
  showAll: boolean;
  toggleShowAll: () => void;
  /* Filters */
  outcomeFilter: OutcomeFilter;
  setOutcomeFilter: (f: OutcomeFilter) => void;
  domainFilter: string;
  setDomainFilter: (d: string) => void;
  availableDomains: string[];
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  /* Stats */
  stats: TimelineStats;
  /* Refresh */
  refresh: () => void;
}

/* ═══════════════════════════════════════
   Time Range Thresholds
   ═══════════════════════════════════════ */

const TIME_MS: Record<TimeRange, number> = {
  all: 0,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

const PAGE_SIZE = 10;

export function useDecisionTimeline(): UseDecisionTimelineReturn {
  /* ── Raw data (re-read on refresh) ── */
  const [refreshKey, setRefreshKey] = useState(0);

  const entries = useMemo<TimelineEntry[]>(() => {
    void refreshKey;
    const outcomes = getAllOutcomes();
    return outcomes
      .map((o) => ({
        id: o.id,
        ruleId: o.ruleId,
        domain: o.domain,
        impact: o.impact as "high" | "medium" | "low",
        outcome: o.outcome as "success" | "partial" | "failed" | "unknown",
        originalConfidence: o.originalConfidence,
        executedAt: o.executedAt,
        metricDelta: o.metricDelta,
        feedback: o.feedback,
      }))
      .sort((a, b) => b.executedAt - a.executedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  /* ── Available domains ── */
  const availableDomains = useMemo(
    () => [...new Set(entries.map((e) => e.domain))].sort(),
    [entries],
  );

  /* ── Filters ── */
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [showAll, setShowAll] = useState(false);

  /* ── Filtered entries ── */
  const filtered = useMemo(() => {
    let result = entries;

    /* Outcome filter */
    if (outcomeFilter !== "all") {
      result = result.filter((e) => e.outcome === outcomeFilter);
    }

    /* Domain filter */
    if (domainFilter !== "all") {
      result = result.filter((e) => e.domain === domainFilter);
    }

    /* Time range filter */
    if (timeRange !== "all") {
      const threshold = Date.now() - TIME_MS[timeRange];
      result = result.filter((e) => e.executedAt >= threshold);
    }

    return result;
  }, [entries, outcomeFilter, domainFilter, timeRange]);

  /* ── Pagination ── */
  const displayEntries = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const hasMore = filtered.length > PAGE_SIZE;

  const toggleShowAll = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  /* ── Stats (from ALL entries, not filtered) ── */
  const stats = useMemo<TimelineStats>(() => {
    const success = entries.filter((e) => e.outcome === "success").length;
    const partial = entries.filter((e) => e.outcome === "partial").length;
    const failed = entries.filter((e) => e.outcome === "failed").length;
    const total = entries.length;
    const accuracy =
      total > 0 ? Math.round(((success + partial * 0.5) / total) * 100) : 0;
    return { total, success, partial, failed, accuracy };
  }, [entries]);

  /* ── Refresh ── */
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    entries,
    filtered,
    displayEntries,
    hasMore,
    showAll,
    toggleShowAll,
    outcomeFilter,
    setOutcomeFilter,
    domainFilter,
    setDomainFilter,
    availableDomains,
    timeRange,
    setTimeRange,
    stats,
    refresh,
  };
}