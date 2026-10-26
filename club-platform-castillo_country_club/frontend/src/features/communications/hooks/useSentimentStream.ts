// src/features/communications/hooks/useSentimentStream.ts
// ═══════════════════════════════════════════════════════════
// Sentiment Stream — Real-time Emotional Intelligence
// Castillo Country Club — Phase 31 "The Voice"
//
// The emotional pulse of a member — continuously monitored,
// adaptively polled, and projected into the future.
//
// When emotional velocity is high (rapid change), polling
// accelerates. When stable, polling relaxes. This prevents
// both stale data and unnecessary API calls.
//
// The stream provides: current state, trajectory arcs,
// trigger events, and forecast — everything the
// EmotionalTrajectory and SentimentMonitor components need.
// ═══════════════════════════════════════════════════════════

import { useMemo, useCallback, useEffect, useState } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

import type {
  EmotionalTrajectory,
  EmotionalDataPoint,
  EmotionalTrigger,
  EmotionalForecast,
  SentimentDataPoint,
  SatisfactionTrendsData,
  EmotionalZone,
} from "../types";

import {
  deriveEmotionalZone
} from "../types";

import {
  COMMUNICATION_MCP_TOOLS,
  COMMUNICATION_FRESHNESS_TIERS,
  EMOTIONAL_BASELINE_DEFAULTS,
} from "../config";

import {
  deriveEmotionalTrajectory
} from "../lib/communicationIntelligence";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * A point on the trajectory arc — used by visualizations
 * to draw the emotional curve over time.
 */
export interface TrajectoryArcPoint {
  date: string;
  score: number;
  zone: EmotionalZone;
  isInflection: boolean;
  triggerDescription: string | null;
}

/**
 * Stream state — the complete real-time emotional snapshot.
 */
export interface SentimentStreamState {
  trajectory: EmotionalTrajectory | null;
  arcPoints: TrajectoryArcPoint[];
  triggers: EmotionalTrigger[];
  forecast: EmotionalForecast | null;
  currentZone: EmotionalZone;
  currentScore: number;
  velocity: number;
  acceleration: number;
  resonanceCount: number;
  isLoading: boolean;
  error: string | null;
  pollingIntervalMs: number;
}

// ═══════════════════════════════════════════════════════════
// ADAPTIVE POLLING — Interval calculation
// ═══════════════════════════════════════════════════════════

/** Polling tiers based on emotional velocity magnitude. */
const POLLING_TIERS = {
  stable: 300_000,       // 5 min  — emotional state calm
  moving: 120_000,       // 2 min  — moderate velocity
  volatile: 60_000,      // 1 min  — high velocity
  crisis: 30_000,        // 30s    — crisis zone
} as const;

/**
 * Derive the optimal polling interval based on emotional velocity
 * and current zone. Faster polling during crises, slower when stable.
 */
function derivePollingInterval(
  velocity: number,
  zone: EmotionalZone,
): number {
  const absVelocity = Math.abs(velocity);

  // Crisis zone always polls fast
  if (zone === "crisis") return POLLING_TIERS.crisis;

  // High velocity — volatile
  if (absVelocity > 8) return POLLING_TIERS.volatile;

  // Moderate velocity — moving
  if (absVelocity > 3) return POLLING_TIERS.moving;

  // Stable
  return POLLING_TIERS.stable;
}

// ═══════════════════════════════════════════════════════════
// ARC POINTS — Visualization helpers
// ═══════════════════════════════════════════════════════════

/**
 * Convert EmotionalDataPoint[] into TrajectoryArcPoint[]
 * for visualization. Marks inflection points where triggers occurred.
 */
function buildArcPoints(
  history: EmotionalDataPoint[],
  triggers: EmotionalTrigger[],
): TrajectoryArcPoint[] {
  if (history.length === 0) return [];

  // Build a set of trigger dates for inflection marking
  new Set<string>();
  new Map<string, string>();
  for (const _t of triggers) {
    // Triggers don't have a direct date — we match by impact
    // Inflection detection is done by score change magnitude
  }

  const points: TrajectoryArcPoint[] = [];

  for (let i = 0; i < history.length; i++) {
    const dp = history[i];
    const zone = deriveEmotionalZone(dp.score);

    // Inflection: score changed ≥ 15 from previous point
    let isInflection = false;
    let triggerDescription: string | null = null;
    if (i > 0) {
      const change = dp.score - history[i - 1].score;
      if (Math.abs(change) >= 15) {
        isInflection = true;
        triggerDescription =
          change > 0
            ? `Mejora de +${Math.round(change)} puntos`
            : `Descenso de ${Math.round(change)} puntos`;
      }
    }

    points.push({
      date: dp.date,
      score: dp.score,
      zone,
      isInflection,
      triggerDescription,
    });
  }

  return points;
}

// ═══════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Real-time Sentiment Stream hook.
 *
 * Provides continuous emotional intelligence for a member:
 * - Emotional trajectory (baseline → current → forecast)
 * - Trajectory arc points (for SVG visualization)
 * - Trigger events (what shifted emotion)
 * - Resonance events (lasting emotional echoes)
 * - Adaptive polling (faster when emotion is volatile)
 *
 * @param memberId The member to monitor. When undefined,
 *   the hook returns an empty state.
 */
export function useSentimentStream(memberId?: string) {
  // ── Adaptive polling state ─────────────────────────────
  const [pollingIntervalMs, setPollingIntervalMs] = useState<number>(
    POLLING_TIERS.stable,
  );

  // ── Data fetching ──────────────────────────────────────

  const sentimentQuery = useMCPQuery(
    COMMUNICATION_MCP_TOOLS.GET_SENTIMENT_DATA,
    memberId ?? "",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.realtime.maxAge,
      refetchInterval: memberId ? pollingIntervalMs : false,
      enabled: !!memberId,
    },
  );

  const satisfactionQuery = useMCPQuery(
    COMMUNICATION_MCP_TOOLS.GET_SENTIMENT_TRENDS,
    memberId ?? "",
    {
      staleTime: COMMUNICATION_FRESHNESS_TIERS.warm.maxAge,
      enabled: !!memberId,
    },
  );

  // ── Raw data extraction ────────────────────────────────

  const sentimentData: SentimentDataPoint[] = useMemo(() => {
    const raw = sentimentQuery.data as
      | { data_points?: SentimentDataPoint[] }
      | undefined;
    return raw?.data_points ?? [];
  }, [sentimentQuery.data]);

  const satisfaction: SatisfactionTrendsData | null = useMemo(() => {
    const raw = satisfactionQuery.data as
      | { trends?: SatisfactionTrendsData }
      | undefined;
    return raw?.trends ?? null;
  }, [satisfactionQuery.data]);

  // ── Intelligence computation ───────────────────────────

  const trajectory: EmotionalTrajectory | null = useMemo(() => {
    if (!memberId) return null;
    return deriveEmotionalTrajectory(memberId, sentimentData, satisfaction);
  }, [memberId, sentimentData, satisfaction]);

  const triggers: EmotionalTrigger[] = useMemo(
    () => trajectory?.triggers ?? [],
    [trajectory],
  );

  const forecast: EmotionalForecast | null = useMemo(
    () => trajectory?.forecast ?? null,
    [trajectory],
  );

  const currentZone: EmotionalZone = useMemo(
    () =>
      trajectory
        ? deriveEmotionalZone(trajectory.current.score)
        : "stable",
    [trajectory],
  );

  const currentScore = useMemo(
    () => trajectory?.current.score ?? EMOTIONAL_BASELINE_DEFAULTS.baseline_score,
    [trajectory],
  );

  const velocity = useMemo(
    () => trajectory?.velocity ?? 0,
    [trajectory],
  );

  const acceleration = useMemo(
    () => trajectory?.acceleration ?? 0,
    [trajectory],
  );

  const resonanceCount = useMemo(
    () => trajectory?.resonance_events.length ?? 0,
    [trajectory],
  );

  // ── Arc points for visualization ───────────────────────

  const arcPoints: TrajectoryArcPoint[] = useMemo(() => {
    if (!trajectory) return [];
    return buildArcPoints(trajectory.history, triggers);
  }, [trajectory, triggers]);

  // ── Adaptive polling adjustment ────────────────────────

  useEffect(() => {
    if (!trajectory) return;

    const newInterval = derivePollingInterval(velocity, currentZone);
    setPollingIntervalMs((prev: number) =>
      prev !== newInterval ? newInterval : prev,
    );
  }, [velocity, currentZone, trajectory]);

  // ── Loading / error ────────────────────────────────────

  const isLoading = useMemo(
    () => sentimentQuery.isLoading || (!!memberId && satisfactionQuery.isLoading),
    [sentimentQuery.isLoading, satisfactionQuery.isLoading, memberId],
  );

  const error = useMemo(
    () => sentimentQuery.error?.message ?? null,
    [sentimentQuery.error],
  );

  // ── Force refresh ──────────────────────────────────────

  const refresh = useCallback(() => {
    sentimentQuery.refetch();
    satisfactionQuery.refetch();
  }, [sentimentQuery.refetch, satisfactionQuery.refetch]);

  // ── Assemble state ─────────────────────────────────────

  return useMemo<SentimentStreamState>(
    () => ({
      trajectory,
      arcPoints,
      triggers,
      forecast,
      currentZone,
      currentScore,
      velocity,
      acceleration,
      resonanceCount,
      isLoading,
      error,
      pollingIntervalMs,
    }),
    [
      trajectory,
      arcPoints,
      triggers,
      forecast,
      currentZone,
      currentScore,
      velocity,
      acceleration,
      resonanceCount,
      isLoading,
      error,
      pollingIntervalMs,
      refresh,
    ],
  );
}