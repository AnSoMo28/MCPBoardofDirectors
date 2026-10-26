// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useIntelligenceEngine.ts
// Phase 34+ Migration — Intelligence Engine Hook
// Level 6+ Agency · Production Grade
//
// 7-layer orchestration hook that drives the intelligence panel:
//   1. Orchestrator — sequences MCP calls
//   2. Correlator — cross-references results
//   3. Narrator — generates briefing
//   4. ActionChain — builds action sequences
//   5. Memory — localStorage persistence + deltas
//   6. PeerComparison — synthetic peer context
//   7. Constellation — derives visualization data
//
// Components consuming this hook become pure rendering.
//
// PRE-WRITE VERIFICATION:
//   FamilyChurnPrediction  → ../ai-types.ts §10 ✅
//   ActivityRecommendation → ../ai-types.ts §11 ✅
//   SocialMatch            → ../social-types.ts §3 ✅
//   FamilyEngagementPlan   → ../ai-types.ts §11 ✅
//   LifecycleProjection    → ../ai-types.ts §6  ✅
//   FamilyIntelligenceState→ ../ai-types.ts §13 ✅
//   IntelligenceResults, IntelligenceCorrelation, DimensionScore
//     → ../lib/intelligenceCorrelator.ts ✅
//   IntelligenceNarrative → ../lib/intelligenceNarrator.ts ✅
//   ActionChain           → ../lib/actionChainBuilder.ts ✅
//   useMCPQuery           → @/shared/hooks/useMCPQuery.ts ✅
//   useQueryClient        → @tanstack/react-query ✅
//
// ANTI-PATTERNS REMOVED:
//   - 6 types from "../types" (3 eliminated) → 4 from ai-types + 1 from social-types
//   - useMemo for saveMemory (side effect) → useEffect
//   - unstable queries[] array in refetchAll → queryClient.invalidateQueries
//   - results.family360 → results.intelligence
//   - dimensionStatuses.family360 → maps to config ID "family360" but reads results.intelligence
//   - Mutable interfaces → readonly
//   - No § markers → 4 sections
//   - No PRE-WRITE VERIFICATION → header block
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";

import type {
  FamilyChurnPrediction,
  ActivityRecommendation,
  FamilyEngagementPlan,
  LifecycleProjection,
  FamilyIntelligenceState,
} from "../ai-types";

import type { SocialMatch } from "../social-types";

import {
  findCorrelations,
  deriveDimensionScores,
  computeCompositeScore,
  deriveUrgencyLevel,
  type IntelligenceResults,
  type IntelligenceCorrelation,
  type DimensionScore,
} from "../lib/intelligenceCorrelator";

import {
  generateNarrative,
  type IntelligenceNarrative,
} from "../lib/intelligenceNarrator";

import {
  buildActionChain,
  type ActionChain,
} from "../lib/actionChainBuilder";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Persistence key prefix for localStorage */
const MEMORY_PREFIX = "intelligence-";

/** Persisted intelligence memory — used for delta computation */
export interface IntelligenceMemory {
  readonly familyId: string;
  readonly timestamp: number;
  readonly compositeScore: number;
  readonly urgency: string;
  readonly dimensionScores: Readonly<Record<string, number>>;
}

/** Synthetic peer comparison — derived from tier + engagement */
export interface PeerInsight {
  readonly recoveryRate: number;
  readonly avgTimeToRecover: string;
  readonly similarFamilies: number;
  readonly successStory: string;
}

/** Intelligence engine processing phase */
export type StreamPhase = "idle" | "analyzing" | "correlating" | "complete";

/** Options for useIntelligenceEngine */
export interface UseIntelligenceEngineOptions {
  readonly familyId: string;
  readonly familyTier?: string;
  readonly familyEngagement?: number;
  readonly familyName?: string;
}

/** Return type for useIntelligenceEngine */
export interface UseIntelligenceEngineReturn {
  // State
  readonly phase: StreamPhase;
  readonly isAnyLoading: boolean;
  readonly resolvedCount: number;

  // Results
  readonly results: IntelligenceResults;
  readonly dimensionScores: readonly DimensionScore[];
  readonly compositeScore: number;
  readonly urgencyLevel: string;

  // Intelligence outputs
  readonly correlations: readonly IntelligenceCorrelation[];
  readonly narrative: IntelligenceNarrative | null;
  readonly actionChain: ActionChain | null;
  readonly peerInsight: PeerInsight | null;

  // Memory
  readonly memory: IntelligenceMemory | null;
  readonly hasMemory: boolean;
  readonly deltas: Readonly<Record<string, number>>;

  // Actions
  readonly analyze: () => void;
  readonly refetchAll: () => void;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers — Memory + Peer Comparison
// ═══════════════════════════════════════════════════════════

/** Load persisted memory for a family */
function loadMemory(familyId: string): IntelligenceMemory | null {
  try {
    const raw = localStorage.getItem(`${MEMORY_PREFIX}${familyId}`);
    if (!raw) return null;
    return JSON.parse(raw) as IntelligenceMemory;
  } catch {
    return null;
  }
}

/** Persist memory to localStorage */
function saveMemory(memory: IntelligenceMemory): void {
  try {
    localStorage.setItem(
      `${MEMORY_PREFIX}${memory.familyId}`,
      JSON.stringify(memory),
    );
  } catch {
    // Silent fail — localStorage may be full or unavailable
  }
}

/**
 * Compute synthetic peer comparison based on tier + engagement.
 * Used to contextualize the family's situation against similar families.
 */
function computePeerInsight(
  tier: string | undefined,
  engagement: number | undefined,
  churnLevel: string | undefined,
): PeerInsight {
  // Tier multiplier: higher tier = higher recovery potential
  const tierMultiplier =
    tier === "platino" ? 1.25 :
    tier === "oro" ? 1.0 :
    tier === "plata" ? 0.85 : 0.7;

  // Base recovery rate from churn risk
  const baseRecovery =
    churnLevel === "critical" ? 30 :
    churnLevel === "high" ? 50 :
    churnLevel === "medium" ? 72 : 88;

  // Engagement bonus/penalty
  const eng = engagement ?? 50;
  const engagementBonus = eng >= 60 ? 8 : eng < 35 ? -12 : 0;

  const recoveryRate = Math.min(
    95,
    Math.max(15, Math.round(baseRecovery * tierMultiplier + engagementBonus)),
  );

  const timeframe =
    recoveryRate >= 80 ? "2-3 meses" :
    recoveryRate >= 60 ? "3-4 meses" :
    recoveryRate >= 40 ? "4-6 meses" : "6+ meses";

  const similarCount = Math.round(
    (tier === "platino" ? 6 : tier === "oro" ? 12 : tier === "plata" ? 20 : 25) *
      tierMultiplier,
  );

  return {
    recoveryRate,
    avgTimeToRecover: timeframe,
    similarFamilies: similarCount,
    successStory:
      `Familias ${tier ?? "del club"} con perfil similar: ${recoveryRate}% se recuperaron en promedio en ${timeframe} con un plan de engagement activo.`,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  MCP Tool Names
// ═══════════════════════════════════════════════════════════

const INTELLIGENCE_TOOLS = [
  "family_predict_churn",
  "family_recommend_activities",
  "family_social_match",
  "family_engagement_plan",
  "family_lifecycle_analysis",
  "family_360_insight",
] as const;

// ═══════════════════════════════════════════════════════════
// §4  Hook
// ═══════════════════════════════════════════════════════════

/**
 * 7-layer Intelligence Engine hook.
 *
 * Orchestrates 6 MCP queries, correlates results across domains,
 * generates executive narratives, builds action chains, tracks
 * memory deltas, and computes peer comparisons.
 *
 * @example
 * const engine = useIntelligenceEngine({
 *   familyId: family.id,
 *   familyTier: family.tier,
 *   familyEngagement: family.engagementScore,
 *   familyName: family.familyName,
 * });
 *
 * if (engine.phase === "idle") {
 *   <button onClick={engine.analyze}>Analizar familia</button>
 * }
 *
 * if (engine.phase === "complete") {
 *   <IntelligencePanel
 *     dimensions={engine.dimensionScores}
 *     narrative={engine.narrative}
 *     actionChain={engine.actionChain}
 *   />
 * }
 */
export function useIntelligenceEngine({
  familyId,
  familyTier,
  familyEngagement,
  familyName,
}: UseIntelligenceEngineOptions): UseIntelligenceEngineReturn {
  const queryClient = useQueryClient();

  // ── State ──
  const [enabled, setEnabled] = useState(false);
  const [memory] = useState<IntelligenceMemory | null>(() =>
    loadMemory(familyId),
  );

  // ── Layer 1: Orchestrator — MCP Queries ──

  const churnQuery = useMCPQuery<{ data: FamilyChurnPrediction }>(
    "family_profile",
    "family_predict_churn",
    { familyId },
    { enabled, staleTime: 0 },
  );

  const activitiesQuery = useMCPQuery<{
    data: ActivityRecommendation[];
  }>(
    "family_profile",
    "family_recommend_activities",
    { familyId },
    { enabled, staleTime: 0 },
  );

  const socialQuery = useMCPQuery<{ data: SocialMatch[] }>(
    "family_profile",
    "family_social_match",
    { familyId },
    { enabled, staleTime: 0 },
  );

  const engagementQuery = useMCPQuery<{ data: FamilyEngagementPlan }>(
    "family_profile",
    "family_engagement_plan",
    { familyId },
    { enabled, staleTime: 0 },
  );

  const lifecycleQuery = useMCPQuery<{ data: LifecycleProjection }>(
    "family_profile",
    "family_lifecycle_analysis",
    { familyId },
    { enabled, staleTime: 0 },
  );

  const intelligenceQuery = useMCPQuery<{
    data: FamilyIntelligenceState;
  }>(
    "family_profile",
    "family_360_insight",
    { familyId },
    { enabled, staleTime: 0 },
  );

  // ── Query status ──
  const queries = useMemo(
    () => [
      churnQuery,
      activitiesQuery,
      socialQuery,
      engagementQuery,
      lifecycleQuery,
      intelligenceQuery,
    ],
    [
      churnQuery,
      activitiesQuery,
      socialQuery,
      engagementQuery,
      lifecycleQuery,
      intelligenceQuery,
    ],
  );

  const isAnyLoading = queries.some((q) => q.isLoading);
  const resolvedCount = queries.filter((q) => q.data !== undefined).length;

  // ── Extract results ──
  const results = useMemo(
    (): IntelligenceResults => ({
      churn: churnQuery.data?.data ?? null,
      activities: activitiesQuery.data?.data ?? null,
      social: socialQuery.data?.data ?? null,
      engagement: engagementQuery.data?.data ?? null,
      lifecycle: lifecycleQuery.data?.data ?? null,
      intelligence: intelligenceQuery.data?.data ?? null,
    }),
    [
      churnQuery.data,
      activitiesQuery.data,
      socialQuery.data,
      engagementQuery.data,
      lifecycleQuery.data,
      intelligenceQuery.data,
    ],
  );

  // ── Dimension statuses (for constellation loading states) ──
  const dimensionStatuses = useMemo(
    (): Record<string, "idle" | "thinking" | "loaded"> => {
      if (!enabled) return {};
      return {
        churn: results.churn ? "loaded" : "thinking",
        engagement: results.engagement ? "loaded" : "thinking",
        social: results.social ? "loaded" : "thinking",
        lifecycle: results.lifecycle ? "loaded" : "thinking",
        activities: results.activities ? "loaded" : "thinking",
        // Config ID "family360" maps to results key "intelligence"
        family360: results.intelligence ? "loaded" : "thinking",
      };
    },
    [enabled, results],
  );

  // ── Layer 7: Constellation — Dimension scores ──
  const dimensionScores = useMemo(
    () => deriveDimensionScores(results, dimensionStatuses),
    [results, dimensionStatuses],
  );

  const compositeScore = useMemo(
    () => computeCompositeScore(dimensionScores),
    [dimensionScores],
  );

  const urgencyLevel = useMemo(
    () => deriveUrgencyLevel(compositeScore, dimensionScores),
    [compositeScore, dimensionScores],
  );

  // ── Layer 2: Correlator ──
  const correlations = useMemo(
    () => (resolvedCount >= 2 ? findCorrelations(results) : []),
    [results, resolvedCount],
  );

  // ── Layer 3: Narrator ──
  const narrative = useMemo(
    () =>
      resolvedCount >= 2
        ? generateNarrative(
            results,
            correlations,
            compositeScore,
            urgencyLevel,
            dimensionScores,
            familyName,
          )
        : null,
    [
      results,
      correlations,
      compositeScore,
      urgencyLevel,
      dimensionScores,
      familyName,
      resolvedCount,
    ],
  );

  // ── Layer 4: Action Chain ──
  const actionChain = useMemo(
    () =>
      resolvedCount >= 2
        ? buildActionChain(results, correlations)
        : null,
    [results, correlations, resolvedCount],
  );

  // ── Layer 5: Memory — Deltas from previous analysis ──
  const deltas = useMemo((): Readonly<Record<string, number>> => {
    if (!memory) return {};
    const current: Record<string, number> = {};
    for (const dim of dimensionScores) {
      if (dim.status === "loaded") current[dim.id] = dim.score;
    }
    const result: Record<string, number> = {};
    for (const [key, val] of Object.entries(current)) {
      if (memory.dimensionScores[key] !== undefined) {
        result[key] = val - memory.dimensionScores[key];
      }
    }
    return result;
  }, [memory, dimensionScores]);

  // ── Layer 6: Peer Comparison ──
  const peerInsight = useMemo(
    () =>
      resolvedCount >= 2
        ? computePeerInsight(
            familyTier,
            familyEngagement,
            results.churn?.riskLevel,
          )
        : null,
    [resolvedCount, familyTier, familyEngagement, results.churn],
  );

  // ── Phase ──
  const phase = useMemo((): StreamPhase => {
    if (!enabled) return "idle";
    if (resolvedCount < 6 && isAnyLoading) return "analyzing";
    if (resolvedCount >= 2 && (!narrative || !actionChain))
      return "correlating";
    return "complete";
  }, [enabled, resolvedCount, isAnyLoading, narrative, actionChain]);

  // ── Actions ──
  const analyze = useCallback(() => {
    setEnabled(true);
  }, []);

  /** Refetch all intelligence queries (stable reference) */
  const refetchAll = useCallback(() => {
    for (const tool of INTELLIGENCE_TOOLS) {
      queryClient.invalidateQueries({
        queryKey: ["family_profile", tool],
      });
    }
  }, [queryClient]);

  // ── Layer 5: Save memory on complete (side effect) ──
  useEffect(() => {
    if (phase !== "complete") return;

    const dimScores: Record<string, number> = {};
    for (const dim of dimensionScores) {
      if (dim.status === "loaded") dimScores[dim.id] = dim.score;
    }

    saveMemory({
      familyId,
      timestamp: Date.now(),
      compositeScore,
      urgency: urgencyLevel,
      dimensionScores: dimScores,
    });
  }, [phase, dimensionScores, compositeScore, urgencyLevel, familyId]);

  return {
    phase,
    isAnyLoading,
    resolvedCount,
    results,
    dimensionScores,
    compositeScore,
    urgencyLevel,
    correlations,
    narrative,
    actionChain,
    peerInsight,
    memory,
    hasMemory: memory !== null,
    deltas,
    analyze,
    refetchAll,
  };
}