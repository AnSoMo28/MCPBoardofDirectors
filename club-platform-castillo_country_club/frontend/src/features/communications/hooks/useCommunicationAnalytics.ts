// src/features/communications/hooks/useCommunicationAnalytics.ts
// ═══════════════════════════════════════════════════════════
// Analytics Intelligence Hook
// Fetches data + computes all derived state
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type {
  CommunicationAnalyticsData,
  CommunicationAnalyticsResponse,
} from "../types";
import {
  detectAnomalies,
  computeDiversification,
  computeTrend,
  computeVelocity,
  computePeriodDeltas,
  computeRadarScores,
  buildReachSuggestions,
  buildKPIs,
  CHANNEL_LABELS,
  type Anomaly,
  type VelocityData,
  type TrendData,
  type PeriodDelta,
  type Suggestion,
  type RadarResult,
  type KPIData,
} from "../lib/analyticsIntelligence";

/* ── Return type ── */

export interface UseCommunicationAnalyticsReturn {
  period: string;
  setPeriod: (p: string) => void;
  analytics: CommunicationAnalyticsData | undefined;
  isLoading: boolean;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
  anomalies: Anomaly[];
  diversification: number;
  trend: TrendData;
  velocity: VelocityData;
  deltas: PeriodDelta | null;
  radar: RadarResult;
  suggestions: Suggestion[];
  dominantChannel: { label: string; pct: number };
  kpis: KPIData[];
}

/* ── Hook ── */

export function useCommunicationAnalytics(): UseCommunicationAnalyticsReturn {
  const [period, setPeriod] = useState<string>("current_month");

  /* ── Data Fetching ── */
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period },
    { staleTime: 120_000 },
  );

  const analytics = analyticsQ.data?.analytics;

  /* ── Derived State ── */

  const anomalies = useMemo(
    () => (analytics ? detectAnomalies(analytics) : []),
    [analytics],
  );

  const diversification = useMemo(
    () => (analytics ? computeDiversification(analytics.channel_breakdown) : 0),
    [analytics],
  );

  const trend = useMemo(
    () => (analytics ? computeTrend(analytics.daily_volume) : { direction: "stable" as const, slope: 0, forecast: [] }),
    [analytics],
  );

  const velocity = useMemo(
    () => (analytics ? computeVelocity(analytics.daily_volume) : { current: 0, average: 0, ratio: 0, level: "normal" as const }),
    [analytics],
  );

  const deltas = useMemo(
    () => (analytics ? computePeriodDeltas(analytics.daily_volume) : null),
    [analytics],
  );

  const radar = useMemo(
    () => (analytics ? computeRadarScores(analytics, diversification) : { scores: [], labels: [] }),
    [analytics, diversification],
  );

  const suggestions = useMemo(
    () => (analytics ? buildReachSuggestions(analytics, diversification, velocity) : []),
    [analytics, diversification, velocity],
  );

  const dominantChannel = useMemo(() => {
    if (!analytics || analytics.channel_breakdown.length === 0) return { label: "N/A", pct: 0 };
    const max = analytics.channel_breakdown.reduce(
      (m, c) => (c.percentage > m.percentage ? c : m),
      analytics.channel_breakdown[0],
    );
    return { label: CHANNEL_LABELS[max.channel] ?? max.channel, pct: max.percentage };
  }, [analytics]);

  const kpis = useMemo(
    () => (analytics ? buildKPIs(analytics) : []),
    [analytics],
  );

  return {
    period,
    setPeriod,
    analytics,
    isLoading: analyticsQ.isLoading,
    isError: analyticsQ.isError,
    dataUpdatedAt: analyticsQ.dataUpdatedAt ?? Date.now(),
    refetch: () => analyticsQ.refetch(),
    anomalies,
    diversification,
    trend,
    velocity,
    deltas,
    radar,
    suggestions,
    dominantChannel,
    kpis,
  };
}