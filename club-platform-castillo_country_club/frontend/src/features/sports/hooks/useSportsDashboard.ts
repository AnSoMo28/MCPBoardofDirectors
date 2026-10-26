// ═══════════════════════════════════════════════════════════
// src/features/sports/hooks/useSportsDashboard.ts
// §B2.3 — Sports Dashboard Orchestrator
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// Single entry point for SportsDashboard.tsx.
// Combines data layer (useSportsData) with dashboard
// intelligence: mode derivation, ambient state, stage
// selection, and intelligence summary.
//
// Pipeline:
//   useSportsData()        → MCP + Advisor (integrated)
//   + deriveDashboardMode  → calm / alert / critical
//   + deriveAmbientState   → intensity, accent, pulse
//   + deriveContextualStage → auto-select best stage
//   + stage override       → user-driven stage selection
//   + intelligenceSummary  → aggregated counts
//
// Gate 4 checks: 11/11
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @hook    useSportsDashboard
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSportsData } from "./useSportsData";
import type {
  SportsDashboardMode,
  SportsAmbientState,
  SportsDecisionStageMode,
  SportsIntelligenceSummary,
} from "../types";
import {
  deriveSportsDashboardMode,
  deriveSportsAmbientState,
  deriveContextualStage,
} from "../config";
import { CR_WEATHER_RISK } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 — INSIGHT → DECISION STAGE MODE MAPPING
//
// Static map: rule ID → which DecisionStageMode owns it.
// When a new rule is added to SPORTS_RULES, add it here.
//
// This map drives:
//   - Contextual tab auto-selection (Behavior 1)
//   - Cross-tab awareness (Behavior 4)
//   - Intelligence summary byMode counts
// ═══════════════════════════════════════════════════════════

const RULE_MODE_MAP: Record<string, SportsDecisionStageMode> = {
  // ── Original rules (R1-R15) ─────────────────────────────
  R1_COURTS_STATUS: "arena",
  R2_ACTIVE_TOURNAMENTS: "competition",
  R3_CLASSES_SUMMARY: "trajectory",
  R4_LOW_COURT_UTIL: "arena",
  R5_TOURNAMENT_REG_LOW: "competition",
  R6_CLASS_LOW_ENROLLMENT: "trajectory",
  R7_EQUIPMENT_REPAIR: "business",
  R8_NO_TOURNAMENTS: "competition",
  R9_COACHING_GAP: "arena",
  R10_SEASONAL_MISMATCH: "trajectory",
  R11_PEAK_HOUR_SATURATION: "arena",
  R12_SPORT_IMBALANCE: "business",
  R13_EQUIPMENT_STALE: "business",
  R14_TOURNAMENT_OPPORTUNITY: "competition",
  R15_ENGAGEMENT_LOW: "business",
  // ── Phase 33 "The Arena" (SR16-SR22) ────────────────────
  SR16_ATHLETIC_PLATEAU: "trajectory",
  SR17_INJURY_RISK_CLUSTER: "trajectory",
  SR18_SOCIAL_ISOLATION: "team",
  SR19_OVERTRAINING_DETECTED: "trajectory",
  SR20_CROSS_DOMAIN_VENUE: "arena",
  SR21_CROSS_DOMAIN_FINANCIAL: "business",
  SR22_FACILITY_REASSIGNMENT: "arena",
};

/** Neutral starting counts — all zeros */
const ZERO_BY_MODE: Record<SportsDecisionStageMode, number> = {
  arena: 0,
  trajectory: 0,
  competition: 0,
  team: 0,
  business: 0,
};

/** Derive season from current month using CR weather patterns */
function deriveSeason(): { label: string; isPeak: boolean; icon: string } {
  const month = new Date().getMonth() + 1;
  const risk = CR_WEATHER_RISK[month];
  if (!risk) return { label: "N/A", isPeak: false, icon: "☀️" };
  return {
    label: risk.label,
    isPeak: risk.level === "high" || risk.level === "medium",
    icon:
      risk.level === "high"
        ? "🌧️"
        : risk.level === "medium"
          ? "⛅"
          : "☀️",
  };
}

/** Derive greeting from current hour */
function deriveGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

// ═══════════════════════════════════════════════════════════
// §2 — PURE HELPERS (outside component, 0 re-creation)
// ═══════════════════════════════════════════════════════════

/**
 * Extract rule ID from insight ID.
 *
 * insight ID format: "insight_sports_R1_COURTS_STATUS"
 * rule ID:           "R1_COURTS_STATUS"
 *
 * @param insightId - Full insight ID string
 * @returns Rule ID portion
 */
function extractRuleId(insightId: string): string {
  return insightId.split("_").slice(2).join("_");
}

/**
 * Compute insight distribution across DecisionStage modes.
 *
 * Iterates all insights once, maps each to its owning mode
 * via RULE_MODE_MAP. Unknown rule IDs are silently ignored
 * (prevents crashes from rules not yet in the map).
 *
 * @param insightIds - Array of full insight ID strings
 * @returns Count per DecisionStageMode
 */
function computeByMode(insightIds: string[]): Record<SportsDecisionStageMode, number> {
  if (insightIds.length === 0) return ZERO_BY_MODE;

  const counts: Record<SportsDecisionStageMode, number> = {
    arena: 0,
    trajectory: 0,
    competition: 0,
    team: 0,
    business: 0,
  };

  for (const id of insightIds) {
    const ruleId = extractRuleId(id);
    const mode = RULE_MODE_MAP[ruleId];
    if (mode) counts[mode]++;
  }

  return counts;
}

// ═══════════════════════════════════════════════════════════
// §3 — HOOK
// ═══════════════════════════════════════════════════════════

export function useSportsDashboard() {
  // ── §3.1 — Data layer ──────────────────────────────────
  //
  // useSportsData already calls useSportsAdvisor internally.
  // This is the single data entry point — never call
  // useMCPQuery or useSportsAdvisor directly.
  //
  const {
    insights: advisorResult,
    analytics,
    health,
    calendar,
    isLoading,
    isError,
    error,
    analyticsQuery,
    healthQuery,
    calendarQuery,
  } = useSportsData();

  // Unwrap advisor result
  const insights = advisorResult.insights;

  // ── §3.2 — Derived insight arrays ──────────────────────
  //
  // These are pure derivations from the same insights array.
  // Each filter runs once per change to `insights`.
  //
  const criticalInsights = useMemo(
    () => insights.filter((i) => i.severity === "critical"),
    [insights],
  );

  const highSeverityInsights = useMemo(
    () => insights.filter((i) => i.severity === "high"),
    [insights],
  );

  const actionableInsights = useMemo(
    () => insights.filter((i) => i.action != null),
    [insights],
  );
  const season = useMemo(() => deriveSeason(), []);
  const greeting = useMemo(() => deriveGreeting(), []);

  // ── §3.3 — DecisionStage mode distribution ─────────────
  //
  // Counts how many insights belong to each of the 5 modes.
  // Drives: contextual stage selection + cross-tab awareness.
  //
  const byMode = useMemo(
    () => computeByMode(insights.map((i) => i.id)),
    [insights],
  );

  // ── §3.4 — Dashboard mode ──────────────────────────────
  //
  // 3-state adaptive morphism: calm / alert / critical.
  // Derived from critical + high insight counts.
  // Drives: grid density, ambient canvas, pulse speed.
  //
  const dashboardMode = useMemo<SportsDashboardMode>(
    () =>
      deriveSportsDashboardMode(
        criticalInsights.length,
        highSeverityInsights.length,
      ),
    [criticalInsights.length, highSeverityInsights.length],
  );

  // ── §3.5 — Previous mode ref for escalation detection ──
  //
  // Tracks the previous dashboard mode so we can detect
  // escalation (calm→alert, alert→critical) and auto-reset
  // the user's stage override when the system needs to
  // re-contextualize.
  //
  const [prevMode, setPrevMode] = useState<SportsDashboardMode>(dashboardMode);

  useEffect(() => {
    if (dashboardMode !== prevMode) {
      // Mode changed — check if it's an escalation
      const severity: Record<SportsDashboardMode, number> = {
        calm: 0,
        alert: 1,
        critical: 2,
      };

      const escalated = severity[dashboardMode] > severity[prevMode];

      if (escalated) {
        // Clear stage override — let system re-select best stage
        setStageOverride(null);
      }

      setPrevMode(dashboardMode);
    }
  }, [dashboardMode, prevMode]);

  // ── §3.6 — Ambient state ───────────────────────────────
  //
  // Feeds SportsAmbientCanvas and SportsPulse.
  // Includes trigger: the title of the most severe insight,
  // which explains WHY the mode is what it is.
  //
  const ambientState = useMemo<SportsAmbientState>(() => {
    const base = deriveSportsAmbientState(dashboardMode);

    let trigger: string | undefined;
    if (criticalInsights.length > 0) {
      trigger = criticalInsights[0].title;
    } else if (highSeverityInsights.length > 0) {
      trigger = highSeverityInsights[0].title;
    }

    return { ...base, trigger };
  }, [dashboardMode, criticalInsights, highSeverityInsights]);

  // ── §3.7 — Contextual stage (auto-select) ──────────────
  //
  // The mode with the most insights becomes the default
  // stage. This implements Agency Behavior 1: Contextual
  // Tab Auto-Selection.
  //
  const contextualStage = useMemo<SportsDecisionStageMode>(
    () => deriveContextualStage(byMode),
    [byMode],
  );

  // ── §3.8 — Stage mode state ────────────────────────────
  //
  // User can override the auto-selected stage via
  // setStageMode. Override persists until:
  //   - User explicitly sets a new stage
  //   - Dashboard mode escalates (auto-reset in §3.5)
  //
  const [stageOverride, setStageOverride] =
    useState<SportsDecisionStageMode | null>(null);

  const stageMode: SportsDecisionStageMode =
    stageOverride ?? contextualStage;

  const setStageMode = useCallback(
    (mode: SportsDecisionStageMode) => {
      setStageOverride(mode);
    },
    [],
  );

  // ── §3.9 — Intelligence summary ────────────────────────
  //
  // Aggregated dashboard metrics consumed by:
  //   - SportsPulse (alert counts)
  //   - BriefingOverlay (summary text)
  //   - CrossTabSuggestion (byMode distribution)
  //   - SportsIntelligenceStream (priority ordering)
  //
  const intelligenceSummary = useMemo<SportsIntelligenceSummary>(
    () => ({
      totalInsights: insights.length,
      criticalCount: criticalInsights.length,
      highCount: highSeverityInsights.length,
      actionableCount: actionableInsights.length,
      byMode,
      // TODO: expose healthScore from useSportsAdvisor
      // when AdvisorEngine returns it via the hook
      healthScore: health?.health_score ?? 0,
      // TODO: expose crossDomainSignalCount from useSportsAdvisor
      // when signalBus.emit count is observable from the hook
      crossDomainSignalCount: 0,
    }),
    [
      insights,
      criticalInsights,
      highSeverityInsights,
      actionableInsights,
      byMode,
    ],
  );

  // ── §3.10 — Refetch all queries ────────────────────────
  //
  // Exposes a single refetch for the error state retry button.
  // Re-fetches all 3 MCP queries in parallel.
  //
  const refetch = useCallback(
    () =>
      Promise.all([
        analyticsQuery.refetch(),
        healthQuery.refetch(),
        calendarQuery.refetch(),
      ]),
    [analyticsQuery, healthQuery, calendarQuery],
  );

  // ── §3.11 — Return ─────────────────────────────────────
  //
  // Single unified interface for SportsDashboard.tsx.
  // Organized in layers: data → insights → state → status.
  //
  return {
    // ── Data layer ──
    analytics,
    health,
    calendar,

    // ── Insight layer ──
    insights,
    criticalInsights,
    highSeverityInsights,
    actionableInsights,

    // ── Dashboard state layer ──
    dashboardMode,
    ambientState,
    stageMode,
    setStageMode,
    contextualStage,
    intelligenceSummary,
    byMode,
    season,
    greeting,

    // ── Status layer ──
    isLoading,
    isError,
    error,

    // ── Actions layer ──
    refetch,
  };
}