// ═══════════════════════════════════════════════════════════
// src/features/guests/hooks/useGuestDashboard.ts
// Phase 34 "The Gateway" — Dashboard Orchestrator Hook
// Level 6+ Agency · Production Grade
//
// Single orchestrator for the guest dashboard.
// Coordinates: MCP data → engines → advisor → dashboard state.
//
// Flow:
//   1. useGuestData() → 5 MCP data sources
//   2. Engine layer → intelligence summary, pipeline, dormant, proposals
//   3. GuestEngineEnrichment → built from engine outputs
//   4. useGuestAdvisor() → 20 rules with enrichment
//   5. Dashboard state → mode, contextual stage, intelligence summary
//   6. Returns GuestEnrichedData (single source of truth for all components)
//
// Checklist: M1-15, M4-15, H1-8
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useGuestData } from "./useGuestData";
import { useGuestAdvisor } from "./useGuestAdvisor";
import { buildIntelligenceSummarySafe } from "../lib/guestIntelligence";
import { buildPipelineEcosystemSafe } from "../lib/pipelineEcosystem";
import { detectDormantGuestsSafe } from "../lib/guestMemory";
import { enrichProposalsSafe } from "../lib/trialNarrative";

import type {
  GuestEnrichedData,
  GuestDashboardMode,
  GuestContextualStage,
  GuestIntelligenceSummary,
  GuestEngineOutputs,
} from "../types";

import type { GuestEngineEnrichment } from "@/shared/lib/advisor-engine/rules/guest";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

// ═══════════════════════════════════════════════════════════
// §1 — OPTIONS & RETURN TYPE
// ═══════════════════════════════════════════════════════════

export interface UseGuestDashboardOptions {
  enabled?: boolean;
  ragContext?: RAGContext[];
}

export interface UseGuestDashboardReturn extends GuestEnrichedData {
  // ── Loading states ──
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly error: unknown;
}

// ═══════════════════════════════════════════════════════════
// §2 — DASHBOARD MODE DERIVATION
// Pure function: health + insights → dashboard mode.
// ═══════════════════════════════════════════════════════════

function deriveDashboardMode(
  healthLevel: string | undefined,
  hasCritical: boolean,
  criticalCount: number,
  healthScore: number,
): GuestDashboardMode {
  if (hasCritical || criticalCount >= 2) return "critical";
  if (healthLevel === "crítico") return "critical";
  if (healthLevel === "atención") return "alert";
  if (healthScore >= 85 && !hasCritical) return "celebration";
  return "calm";
}

// ═══════════════════════════════════════════════════════════
// §3 — CONTEXTUAL STAGE DERIVATION
// Pure function: top insight layer → best default view.
// ═══════════════════════════════════════════════════════════

const LAYER_TO_STAGE: Record<string, GuestContextualStage> = {
  macro: "overview",
  lifecycle: "journey",
  utilization: "optimization",
  cross_domain: "intelligence",
};

function deriveContextualStage(
  topInsightLayer: string | undefined,
): GuestContextualStage {
  if (!topInsightLayer) return "overview";
  return LAYER_TO_STAGE[topInsightLayer] ?? "overview";
}

// ═══════════════════════════════════════════════════════════
// §4 — HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Dashboard orchestrator — single hook that provides everything
 * the guest dashboard needs.
 *
 * Coordinates the full data pipeline:
 *   MCP → Engines → Advisor → Dashboard State
 *
 * Returns GuestEnrichedData which is the single source of truth
 * for all guest dashboard components.
 *
 * @example
 * const dashboard = useGuestDashboard();
 * if (dashboard.isLoading) return <Skeleton />;
 * return (
 *   <GuestManagementDashboard
 *     data={dashboard}
 *     mode={dashboard.dashboardMode}
 *     stage={dashboard.contextualStage}
 *   />
 * );
 */
export function useGuestDashboard(
  options: UseGuestDashboardOptions = {},
): UseGuestDashboardReturn {
  const { enabled = true, ragContext } = options;

  // ── Step 1: MCP Data ──
  const data = useGuestData({ enabled, ragContext });
  const { healthScore, funnel, analytics, forecast, proposals } = data;

  // ── Step 2: Engine Layer (memoized) ──
  const engineSummary = useMemo(() => {
    if (!analytics && !funnel) return null;
    return buildIntelligenceSummarySafe({ healthScore, analytics, funnel });
  }, [healthScore, analytics, funnel]);

  const pipeline = useMemo(() => {
    if (!funnel) return null;
    return buildPipelineEcosystemSafe({ funnel, forecast, healthScore });
  }, [funnel, forecast, healthScore]);

  const dormantGuests = useMemo(() => {
    // No per-guest data in aggregate mode — empty result
    return detectDormantGuestsSafe([]);
  }, []);

  const enrichedProposals = useMemo(() => {
    return enrichProposalsSafe({
      proposals,
      chemistryScores: [],
      memoryGraphs: [],
      sponsorMatches: [],
    });
  }, [proposals]);

  // ── Step 3: GuestEngineEnrichment ──
  const enrichment: GuestEngineEnrichment = useMemo(() => ({
    vipCount: engineSummary?.vipCandidateCount ?? 0,
    dormantCount: engineSummary?.dormantCount ?? 0,
    quickWinCount: pipeline?.quickWins.length ?? 0,
    avgChemistryScore: 0, // No per-guest data in aggregate mode
    avgMemoryStrength: 0, // No per-guest data in aggregate mode
    pipelineHealth: pipeline?.health ?? 0,
    pipelineVelocity: pipeline?.velocity ?? 0,
    pipelineBottleneck: pipeline?.bottlenecks[0]?.stageLabel ?? null,
    firstImpressionAlertCount: 0, // No per-guest data in aggregate mode
    topSponsorMismatchCount: 0, // No per-guest data in aggregate mode
  }), [engineSummary, pipeline]);

  // ── Step 4: Advisor Layer ──
  const advisor = useGuestAdvisor(
    healthScore,
    funnel,
    analytics,
    forecast,
    proposals,
    ragContext,
    enrichment,
  );

  // ── Step 5: Dashboard State (derived) ──
  const dashboardMode = useMemo<GuestDashboardMode>(() =>
    deriveDashboardMode(
      advisor.healthScoreResult?.level,
      advisor.healthScoreResult?.hasCritical ?? false,
      advisor.insights.filter(i => i.severity === "critical").length,
      advisor.healthScoreResult?.score ?? 0,
    ),
  [advisor.healthScoreResult, advisor.insights]);

  const contextualStage = useMemo<GuestContextualStage>(() =>
    deriveContextualStage(advisor.topInsights[0]?.layer),
  [advisor.topInsights]);

  const intelligenceSummary = useMemo<GuestIntelligenceSummary | null>(() => {
    if (!data.isLoading && advisor.totalInsights === 0 && !pipeline) return null;
    return {
      totalInsights: advisor.totalInsights,
      criticalCount: advisor.insights.filter(i => i.severity === "critical").length,
      highCount: advisor.insights.filter(i => i.severity === "high").length,
      topInsight: advisor.topInsights[0]
        ? { title: advisor.topInsights[0].title, severity: advisor.topInsights[0].severity }
        : null,
      pipelineHealth: pipeline?.health ?? 0,
      quickWinCount: pipeline?.quickWins.length ?? 0,
      vipCount: engineSummary?.vipCandidateCount ?? 0,
      dormantCount: engineSummary?.dormantCount ?? 0,
    };
  }, [advisor, pipeline, engineSummary, data.isLoading]);

  // ── Step 6: Engine Outputs ──
  const engines = useMemo<GuestEngineOutputs | null>(() => {
    if (!engineSummary && !pipeline) return null;
    return {
      profiles: [],
      topVipGuests: [],
      chemistryScores: [],
      firstImpressions: [],
      memoryGraphs: [],
      dormantGuests,
      pipeline,
      quickWins: pipeline?.quickWins ?? [],
      enrichedProposals,
      trialPlans: [],
    };
  }, [engineSummary, pipeline, dormantGuests, enrichedProposals]);

  // ── Return: unified enriched data ──
  return {
    // MCP raw data
    healthScore,
    funnel,
    analytics,
    forecast,
    proposals,
    // Engine outputs
    engines,
    // Dashboard state
    dashboardMode,
    contextualStage,
    intelligenceSummary,
    // Advisor layer
    insights: advisor.insights,
    healthScoreResult: advisor.healthScoreResult,
    signals: advisor.signals,
    // Loading states
    isLoading: data.isLoading,
    isError: data.isError,
    error: data.error,
  };
}