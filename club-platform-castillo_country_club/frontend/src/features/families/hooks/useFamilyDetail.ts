// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useFamilyDetail.ts
// Phase 34+ Migration — Family Detail Orchestration Hook
// Level 6+ Agency · Production Grade
//
// Owns: query lifecycle, advisor evaluation, derived intelligence,
// tab state. Component becomes pure rendering.
//
// Architecture:
//   useMCPQuery       → raw data from MCP backend
//   useFamilyAdvisor  → deep intelligence (22 rules, signals, health)
//   familySignals     → quick card narratives (temperature, priority, insight)
//
// Both coexist: Advisor Engine for AdvisorBanner, signal utilities for cards.
//
// PRE-WRITE VERIFICATION:
//   useMCPQuery          → @/shared/hooks/useMCPQuery.ts ✅
//   useFamilyAdvisor     → ./useFamilyAdvisor.ts ✅ (props-based signature)
//   UseFamilyAdvisorProps→ ./useFamilyAdvisor.ts ✅ (exported interface)
//   BaseInsight          → @/shared/components/AdvisorBanner.tsx ✅
//   HealthScoreResult    → @/shared/lib/advisor-engine/types.ts ✅
//   RAGContext           → @/shared/lib/advisor-engine/types.ts ✅
//   FamilyDetailResponse → ../types.ts ✅ (exists from types audit)
//   EngagementTemperature, AdaptiveCardPriority → ../ai-types.ts ✅
//   EnrichmentState, FamilyEnrichmentData → ../ai-types.ts ✅
//   SocialBond           → ../social-types.ts ✅
//   deriveTemperature, deriveAdaptivePriority, deriveInsight
//     → ../lib/familySignals.ts ✅ (clean version from user)
//   DerivedInsight       → ../lib/familySignals.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - 9 positional params to useFamilyAdvisor → props object
//   - FamilyAdvisorInsight type (deprecated) → BaseInsight from engine
//   - Imports from ../types that moved to ../ai-types → correct paths
//   - DetailTabId inconsistency with FamilyDashboardTab → FamilyDetailTab superset
//   - error as Error | null → typed as unknown
//   - No readonly → readonly on all interfaces
//   - No § markers → 3 sections
//   - advisorRaw fields spread without memo → AdvisorState memo
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import { useParams } from "react-router";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type {
  HealthScoreResult,
  RAGContext,
} from "@/shared/lib/advisor-engine/types";

import type { FamilyDetailResponse } from "../types";

import type {
  EngagementTemperature,
  AdaptiveCardPriority,
} from "../ai-types";

import {
  deriveTemperature,
  deriveAdaptivePriority,
  deriveInsight,
} from "../lib/familySignals";

import type { DerivedInsight } from "../lib/familySignals";

import { useFamilyAdvisor } from "./useFamilyAdvisor";
import type { UseFamilyAdvisorProps } from "./useFamilyAdvisor";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/**
 * Detail view tab identifiers.
 * Superset of FamilyDashboardTab — adds "finances" and "preferences"
 * which only exist in the detail view, not the list/dashboard view.
 *
 * FamilyDashboardTab (list):  overview | members | intelligence | social | memories | activity | communication
 * FamilyDetailTab (detail):   overview | members | intelligence | social | memories | finances | communication | preferences
 */
export type FamilyDetailTab =
  | "overview"
  | "members"
  | "intelligence"
  | "social"
  | "memories"
  | "finances"
  | "communication"
  | "preferences";

/** Advisor Engine output shaped for detail view consumers */
export interface AdvisorState {
  readonly insights: BaseInsight[];
  readonly topInsights: BaseInsight[];
  readonly hasHighSeverity: boolean;
  readonly totalInsights: number;
  readonly healthScore: HealthScoreResult | null;
}

/** Tab badge counts derived from query data */
export interface TabCounts {
  readonly members: number;
  readonly social: number;
  readonly activity: number;
}

/** Complete return type for useFamilyDetail */
export interface UseFamilyDetailReturn {
  /** Family ID from URL params or override */
  readonly id: string | undefined;
  /** Raw MCP query response */
  readonly data: FamilyDetailResponse | undefined;
  /** Query loading state */
  readonly isLoading: boolean;
  /** Query error state */
  readonly isError: boolean;
  /** Query error (typed as unknown — narrow before accessing .message) */
  readonly error: unknown;
  /** Currently active detail tab */
  readonly activeTab: FamilyDetailTab;
  /** Set the active detail tab */
  readonly setActiveTab: (tab: FamilyDetailTab) => void;
  /** Advisor Engine output — use advisor.insights for AdvisorBanner */
  readonly advisor: AdvisorState;
  /** Client-derived temperature (fallback when enrichment unavailable) */
  readonly temperature: EngagementTemperature | null;
  /** Client-derived adaptive priority for card hero selection */
  readonly priority: AdaptiveCardPriority | null;
  /** Client-derived one-line insight for cards */
  readonly insight: DerivedInsight | null;
  /** Badge counts for tab navigation */
  readonly tabCounts: TabCounts;
}

// ═══════════════════════════════════════════════════════════
// §2  Hook
// ═══════════════════════════════════════════════════════════

/**
 * Family Detail orchestration hook.
 *
 * Owns the full data-to-render pipeline for the family detail view:
 *   1. MCP query → raw data
 *   2. Advisor Engine → deep intelligence (BaseInsight[], health score, signals)
 *   3. Signal utilities → quick card narratives (temperature, priority, insight)
 *   4. Tab state → navigation
 *
 * Components consuming this hook become pure rendering — zero logic.
 *
 * @param familyIdOverride - Optional family ID (defaults to `:id` URL param)
 * @param ragContext - Optional RAG context for enriched rule evaluation
 *
 * @example
 * const detail = useFamilyDetail();
 * <AdvisorBanner insights={detail.advisor.insights} />
 * <FamilyHeroCard priority={detail.priority} temperature={detail.temperature} />
 * <TabBar active={detail.activeTab} onChange={detail.setActiveTab} counts={detail.tabCounts} />
 */
export function useFamilyDetail(
  familyIdOverride?: string,
  ragContext?: RAGContext[],
): UseFamilyDetailReturn {
  // ── URL params ──
  const { id: paramId } = useParams<{ id: string }>();
  const id = familyIdOverride ?? paramId;

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<FamilyDetailTab>("overview");

  // ── Main MCP query ──
  const {
    data,
    isLoading,
    isError,
    error,
  } = useMCPQuery<FamilyDetailResponse>(
    "family_profile",
    "family_get_profile",
    { familyId: id },
    { enabled: !!id },
  );

  // ── Advisor Engine props (stable reference) ──
  const advisorProps = useMemo(
    (): UseFamilyAdvisorProps => ({
      family: data?.family ?? null,
      activity: data?.recentActivity ?? null,
      financial: data?.financialSummary ?? null,
      social: data?.socialConnections
        ? (data.socialConnections as NonNullable<UseFamilyAdvisorProps["social"]>)
        : null,
      preferences: data?.preferences ?? null,
      // TODO: Wire enrichment data when AI enrichment endpoint is connected.
      // When available: data?.enrichment ?? { status: "idle" as const }
      enrichment: { status: "idle" as const },
    }),
    [data],
  );

  // ── Advisor Engine evaluation (deep intelligence) ──
  const advisorRaw = useFamilyAdvisor(advisorProps, ragContext);

  /** Advisor output shaped for consumers — stable reference */
  const advisor = useMemo(
    (): AdvisorState => ({
      insights: advisorRaw.insights,
      topInsights: advisorRaw.topInsights,
      hasHighSeverity: advisorRaw.hasHighSeverity,
      totalInsights: advisorRaw.totalInsights,
      healthScore: advisorRaw.healthScore,
    }),
    [advisorRaw],
  );

  // ── Derived intelligence (quick card narratives — pure functions) ──

  const temperature = useMemo(
    () => (data?.family ? deriveTemperature(data.family) : null),
    [data?.family],
  );

  const priority = useMemo(
    () => (data?.family ? deriveAdaptivePriority(data.family) : null),
    [data?.family],
  );

  const insight = useMemo(
    () => (data?.family ? deriveInsight(data.family) : null),
    [data?.family],
  );

  // ── Tab badge counts ──
  const tabCounts = useMemo(
    (): TabCounts => ({
      members: data?.family?.members?.length ?? 0,
      social: data?.socialConnections?.length ?? 0,
      activity: data?.recentActivity?.length ?? 0,
    }),
    [data],
  );

  return {
    id,
    data,
    isLoading,
    isError,
    error,
    activeTab,
    setActiveTab,
    advisor,
    temperature,
    priority,
    insight,
    tabCounts,
  };
}