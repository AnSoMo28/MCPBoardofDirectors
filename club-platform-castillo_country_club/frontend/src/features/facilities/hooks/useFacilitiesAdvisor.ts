// src/features/facilities/hooks/useFacilitiesAdvisor.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR HOOK — Level 5+ (Advisor Engine v2 Integration)
//
// Thin wrapper over the generic Advisor Engine that connects
// Facilities as domain #11 to the cross-domain ecosystem.
//
// V3 architecture:
//   - useAdvisorEngine (streaming eval, dirty flags, causal chains)
//   - useSignalBus (consume cross-domain signals from Financial, etc.)
//   - signalBus.emit (emit Facilities signals to Global, Engagement, etc.)
//   - HealthScoreResult with 5 factors (utilization, comfort, maintenance, revenue, inspection)
//   - Causal chain detection (multi-domain cascade patterns)
//
// V2 → V3 migration:
//   - Old: 14 individual params → New: 1 rawData object
//   - Old: FacilitiesAdvisorResult → New: FacilitiesAdvisorOutput (extends AdvisorResult)
//   - Old: evaluateAllRules (single module) → New: AdvisorEngine (cross-domain)
//   - Old: no signal bus → New: full cross-domain communication
//
// Usage:
//   const advisor = useFacilitiesAdvisor(dashboardData);
//   // advisor.insights, advisor.healthScore, advisor.signals, advisor.causalChains
//
//   // Or with the full dashboard:
//   const dashboard = useFacilitiesDashboard();
//   const advisor = useFacilitiesAdvisor({
//     facilities: dashboard.facilities,
//     maintenance: dashboard.maintenanceTasks,
//     ...dashboard (intelligence fields)
//   });
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo } from "react";

import type {
  AdvisorInsightBase,
} from "@/shared/types/ai-intelligence";

import type {
  AdvisorResult,
  CausalChain,
} from "@/shared/lib/advisor-engine";

import {
  useAdvisorEngine,
  useSignalBus,
  signalBus,
} from "@/shared/lib/advisor-engine";

import { FACILITIES_ADVISOR_CONFIG } from "../lib/advisor/facilitiesAdvisorConfig";

import type {
  Facility,
  MaintenanceTask,
  FacilityReservation,
  Inspection,
  FacilityAnalyticsResponse,
  AmenityUtilizationResponse,
  FacilityHealthResponse,
  SpaceOptimizationResponse,
  ComfortScore,
  OccupancyPrediction,
  DeteriorationModel,
  RevenueModel,
  WhatIfScenario,
  EventRipple,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — INPUT TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Raw data shape expected by the Facilities advisor.
 * Constructed from useFacilitiesData (MCP) + useFacilitiesDashboard (engines).
 */
export interface FacilitiesAdvisorInput {
  // MCP data
  facilities: Facility[];
  maintenance: MaintenanceTask[];
  reservations: FacilityReservation[];
  inspections: Inspection[];
  analytics: FacilityAnalyticsResponse | null;
  utilization: AmenityUtilizationResponse | null;
  health: FacilityHealthResponse | null;
  optimization: SpaceOptimizationResponse | null;

  // Intelligence data (from engines)
  comfortScores: Record<string, ComfortScore>;
  occupancyPredictions: Record<string, OccupancyPrediction>;
  deteriorationModels: Record<string, DeteriorationModel>;
  revenueModels: Record<string, RevenueModel>;
  whatIfScenarios: WhatIfScenario[];
  eventRipples: EventRipple[];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — OUTPUT TYPE
// ═══════════════════════════════════════════════════════════════

/**
 * Extended AdvisorResult with Facilities-specific convenience fields.
 * The standard AdvisorResult fields (insights, healthScore, signals,
 * causalChains, meta) are all available.
 */
export interface FacilitiesAdvisorOutput extends AdvisorResult {
  /** Engagement score (0-100) — Facilities-specific composite metric */
  engagementScore: number;

  /** Shortcut: high-impact insights only */
  criticalInsights: AdvisorInsightBase[];

  /** Shortcut: insights with executable actions */
  actionableInsights: AdvisorInsightBase[];

  /** Whether any causal chains were detected */
  hasCascade: boolean;

  /** Strongest causal chain (if any) */
  strongestChain: CausalChain | null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — ENGAGEMENT SCORE
// Config-derived weights from FACILITIES_ADVISOR_THRESHOLDS.
// ═══════════════════════════════════════════════════════════════

const ENGAGEMENT_WEIGHTS = {
  utilization: 0.40,
  health: 0.30,
  reservation_activity: 0.20,
  inspection_compliance: 0.10,
} as const;

function computeEngagementScore(
  health: FacilityHealthResponse | null,
  utilization: AmenityUtilizationResponse | null,
  reservations: FacilityReservation[],
  inspections: Inspection[],
): number {
  let score = 0;

  // Utilization (40%)
  if (utilization) {
    const utilScore = Math.min(100, (utilization.overall_utilization_pct / 70) * 100);
    score += utilScore * ENGAGEMENT_WEIGHTS.utilization;
  }

  // Health (30%)
  if (health) {
    score += health.score * ENGAGEMENT_WEIGHTS.health;
  }

  // Reservation activity (20%)
  if (reservations.length > 0) {
    const confirmed = reservations.filter((r) => r.status === "confirmed").length;
    const activityScore = Math.min(100, (confirmed / 8) * 100);
    score += activityScore * ENGAGEMENT_WEIGHTS.reservation_activity;
  }

  // Inspection compliance (10%)
  if (inspections.length > 0) {
    const passing = inspections.filter(
      (i) => i.result === "pass" || i.result === "minor_issues",
    ).length;
    const complianceScore = Math.round((passing / inspections.length) * 100);
    score += complianceScore * ENGAGEMENT_WEIGHTS.inspection_compliance;
  }

  return Math.round(Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — MAIN HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Facilities Advisor Hook — Level 5+ integration.
 *
 * Wraps the generic Advisor Engine with:
 *   - Cross-domain signal consumption (from Financial, Satisfaction, etc.)
 *   - Signal emission (to Global, Engagement, Communication, Financial)
 *   - Causal chain detection
 *   - Streaming evaluation with dirty flags
 *
 * @param input — Raw data (MCP + engine computed)
 * @param enabled — Whether to evaluate (default: true)
 */
export function useFacilitiesAdvisor(
  input: FacilitiesAdvisorInput | null,
  enabled: boolean = true,
): FacilitiesAdvisorOutput | null {
  // ── Cross-domain signals ──
  const crossSignals = useSignalBus("facilities");

  // ── Memoize raw data for AdvisorEngine ──
  const rawData = useMemo(() => {
    if (!input) return null;
    return {
      ...input,
      crossDomainSignals: [],
    };
  }, [input]);

  // ── Advisor Engine evaluation (streaming + dirty flags) ──
  const result = useAdvisorEngine(
    FACILITIES_ADVISOR_CONFIG,
    rawData,
    crossSignals,
    enabled && rawData !== null,
  );

  // ── Emit signals to the bus (side effect, after render) ──
  useEffect(() => {
    if (result?.signals && result.signals.length > 0) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // ── Build output ──
  return useMemo(() => {
    if (!result || !input) return null;

    // Engagement score (Facilities-specific)
    const engagementScore = computeEngagementScore(
      input.health,
      input.utilization,
      input.reservations,
      input.inspections,
    );

    // Convenience filters
    const criticalInsights = result.insights.filter(
      (i) => i.impact === "high",
    );
    const actionableInsights = result.insights.filter(
      (i) => i.action != null,
    );

    // Cascade detection
    const causalChains = result.causalChains ?? [];
    const hasCascade = causalChains.length > 0;
    const strongestChain = causalChains.length > 0
      ? causalChains.reduce((a, b) =>
          a.compoundConfidence > b.compoundConfidence ? a : b,
        )
      : null;

    return {
      ...result,
      engagementScore,
      criticalInsights,
      actionableInsights,
      hasCascade,
      strongestChain,
    };
  }, [result, input]);
}