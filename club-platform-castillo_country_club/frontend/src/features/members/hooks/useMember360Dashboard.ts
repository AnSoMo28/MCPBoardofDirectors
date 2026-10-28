// ═══════════════════════════════════════════════════════════════════════
// Member360 — Neural Hub (Dashboard Orchestrator)
// Phase 30 — Block 1.2: The Brain
// ═══════════════════════════════════════════════════════════════════════
//
// Single entry point for Member360Dashboard.
// Orchestrates: data → temperature → vital signs → signals →
//               narrative → predictions → advisor → mode → state.
//
// Adaptive Morphism: 3 modes driven by member state, not user choice.
//   - calm:     Portrait centered, exploration mode. No urgency.
//   - alert:    Intelligence Stream top. Actions elevated.
//   - critical: Single focus — THE action. Minimal context.
//
// The neural hub doesn't render anything — it computes the complete
// state that the dashboard component needs to render intelligently.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

import type {
  MemberState,
  DashboardMode,
  MemberTemperature,
  VitalSign,
  DomainSignal,
  SignalResonance,
  EngagementDNAChannel
} from "../types";

import type { PortraitRingProps, AmbientState } from "../lib/memberSignals";

import { deriveDashboardMode } from "../config";

import {
  deriveTemperature,
  deriveVitalSigns,
  buildDomainSignals,
  aggregateSignals,
  deriveEngagementDNA,
  buildChurnWindow,
  buildLTVWindow,
  sortInsightsByPriority,
  filterActionableSignals,
  computePortraitRings,
  deriveAmbientState,
} from "../lib/memberSignals";

import {
  generateMemberBriefing,
  type MemberBriefingPackage,
} from "../lib/memberNarrative";

import {
  generateMemberPredictions,
  type MemberPredictions,
} from "../lib/memberPredictions";

import { useMember360Data, type UseMember360DataOptions } from "./useMember360Data";
import { useMember360Advisor } from "./useMember360Advisor";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type FocusPanelId =
  | "portrait"
  | "vitals"
  | "journey"
  | "signals"
  | "financial"
  | "social"
  | "dna"
  | "timeline"
  | "risks"
  | "brief"
  | "actions";

export interface MemberDashboardState {
  /** Current adaptive mode */
  mode: DashboardMode;
  /** Member emotional state */
  memberState: MemberState;
  /** Temperature composite */
  temperature: number;
  /** Temperature zone */
  zone: string;
  /** Number of critical alerts */
  criticalAlertCount: number;
  /** Number of actionable signals */
  actionableSignalCount: number;
  /** Number of active predictive windows */
  activeWindowCount: number;
  /** Whether intelligence is computing */
  isComputing: boolean;
  /** Last computation timestamp */
  lastComputedAt: string | null;
}

export interface UseMember360DashboardOptions extends UseMember360DataOptions {
  /** Override automatic mode derivation */
  modeOverride?: DashboardMode;
  /** Club average temperature for benchmarking */
  clubAvgTemperature?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════

/**
 * Neural hub for Member360 dashboard.
 * Orchestrates all intelligence layers into a single return value.
 *
 * @param options - Configuration options
 * @returns Complete dashboard state: data + intelligence + navigation
 */
export function useMember360Dashboard(
  options: UseMember360DashboardOptions,
) {
  const { modeOverride, clubAvgTemperature = 55, ...dataOptions } = options;

  // ── Focus panel state ───────────────────────────────────────────────
  const [activeFocus, setActiveFocus] = useState<FocusPanelId>("portrait");

  // ── Intelligence computation tracking ───────────────────────────────
  const [isComputing, setIsComputing] = useState(false);
  const lastComputedAtRef = useRef<string | undefined>(undefined);
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null);

  // ── Data layer (all 10 MCP sources) ─────────────────────────────────
  const data = useMember360Data(dataOptions);

  // ── Advisor intelligence (18 rules × 6 layers) ──────────────────────
  const advisorInsights = useMember360Advisor({
    profile: data.profile ?? null,
    healthScore: data.healthScore ?? null,
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTELLIGENCE COMPUTATION
  // All pure functions, computed via useMemo for performance.
  // Each layer depends on data availability — gracefully degrades.
  // ═══════════════════════════════════════════════════════════════════

  // ── Layer 1: Vital Signs (6 dimensions) ─────────────────────────────
  const vitalSigns = useMemo<VitalSign[]>(() => {
    if (!data.profile) return [];
    return deriveVitalSigns(
      data.profile,
      data.healthScore,
      data.activitySummary,
      data.socialProfile,
      data.ltvAnalysis,
      data.profile.member?.tier,
    );
  }, [
    data.profile,
    data.healthScore,
    data.activitySummary,
    data.socialProfile,
    data.ltvAnalysis,
  ]);

  // ── Layer 2: Temperature (THE number) ───────────────────────────────
  const temperature = useMemo<MemberTemperature>(() => {
    if (!data.profile) {
      return {
        composite: 50,
        dimensions: {} as Record<string, number>,
        reading: { core: 50, surface: 50, ambient: clubAvgTemperature, relative: 0 },
        state: "stable",
        zone: "neutral",
        momentum: { velocity: 0, acceleration: 0, thermalMass: 1, trajectory30d: "stable", trajectory90d: "stable" },
        trend: "stable",
        computedAt: new Date().toISOString(),
      };
    }
    return deriveTemperature(data.profile, data.healthScore, vitalSigns, clubAvgTemperature);
  }, [data.profile, data.healthScore, vitalSigns, clubAvgTemperature]);

  // ── Layer 3: Cross-Domain Signals ───────────────────────────────────
  const signals = useMemo<DomainSignal[]>(() => {
    if (!data.profile) return [];
    return buildDomainSignals(
      data.profile,
      data.healthScore,
      data.churnPrediction,
      data.activitySummary,
      data.socialProfile,
      data.ltvAnalysis,
    );
  }, [
    data.profile,
    data.healthScore,
    data.churnPrediction,
    data.activitySummary,
    data.socialProfile,
    data.ltvAnalysis,
  ]);

  // ── Layer 4: Signal Resonance ───────────────────────────────────────
  const resonance = useMemo<SignalResonance>(() => {
    return aggregateSignals(signals);
  }, [signals]);

  // ── Layer 5: Engagement DNA ─────────────────────────────────────────
  const dna = useMemo<EngagementDNAChannel[]>(() => {
    return deriveEngagementDNA(data.activitySummary, data.socialProfile);
  }, [data.activitySummary, data.socialProfile]);

  // ── Layer 6: Predictive Windows ─────────────────────────────────────
  const churnWindow = useMemo(() => {
    if (!data.churnPrediction) return null;
    return buildChurnWindow(data.churnPrediction);
  }, [data.churnPrediction]);

  const ltvWindow = useMemo(() => {
    if (!data.ltvAnalysis) return null;
    return buildLTVWindow(data.ltvAnalysis);
  }, [data.ltvAnalysis]);

  // ── Layer 7: Predictions (full package) ─────────────────────────────
  const predictions = useMemo<MemberPredictions | null>(() => {
    if (!data.profile || vitalSigns.length === 0) return null;
    return generateMemberPredictions({
      profile: data.profile,
      healthScore: data.healthScore,
      churnPrediction: data.churnPrediction,
      ltvAnalysis: data.ltvAnalysis,
      journey: data.journey,
      activitySummary: data.activitySummary,
      socialProfile: data.socialProfile,
      temperature,
      vitalSigns,
      signals,
      resonance,
    });
  }, [
    data.profile,
    data.healthScore,
    data.churnPrediction,
    data.ltvAnalysis,
    data.journey,
    data.activitySummary,
    data.socialProfile,
    temperature,
    vitalSigns,
    signals,
    resonance,
  ]);

  // ── Layer 8: Narrative (AI briefing) ────────────────────────────────
  const narrative = useMemo<MemberBriefingPackage | null>(() => {
    if (!data.profile || vitalSigns.length === 0) return null;
    return generateMemberBriefing({
      profile: data.profile,
      healthScore: data.healthScore,
      churnPrediction: data.churnPrediction,
      journey: data.journey,
      temperature,
      vitalSigns,
      signals,
      resonance,
      dna,
      churnWindow,
      ltvWindow,
    });
  }, [
    data.profile,
    data.healthScore,
    data.churnPrediction,
    data.journey,
    temperature,
    vitalSigns,
    signals,
    resonance,
    dna,
    churnWindow,
    ltvWindow,
  ]);

  // ── Layer 9: Portrait Rings (SVG props) ─────────────────────────────
  const portraitRings = useMemo<PortraitRingProps[]>(() => {
    if (vitalSigns.length === 0) return [];
    return computePortraitRings(vitalSigns);
  }, [vitalSigns]);

  // ── Layer 10: Advisor with resonance + windows ──────────────────────
  const enhancedInsights = useMemo(() => {
    return sortInsightsByPriority(
      advisorInsights.map((insight) => ({
        ...insight,
        resonance,
        window: churnWindow ?? undefined,
      })),
    );
  }, [advisorInsights, resonance, churnWindow]);

  // ── Layer 11: Actionable signals ────────────────────────────────────
  const actionableSignals = useMemo(() => {
    return filterActionableSignals(signals, "medium");
  }, [signals]);

  // ═══════════════════════════════════════════════════════════════════
  // ADAPTIVE MORPHISM — Mode derivation
  // ═══════════════════════════════════════════════════════════════════

  const derivedMode = useMemo<DashboardMode>(() => {
    if (modeOverride) return modeOverride;
    return deriveDashboardMode(temperature.state, temperature.composite);
  }, [modeOverride, temperature.state, temperature.composite]);

  // ── Ambient state (CSS custom properties) ───────────────────────────
  const ambientState = useMemo<AmbientState>(() => {
    return deriveAmbientState(derivedMode);
  }, [derivedMode]);

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD STATE OBJECT
  // ═══════════════════════════════════════════════════════════════════

  const dashboardState = useMemo<MemberDashboardState>(() => {
    const criticalSignals = signals.filter(
      (s) => s.severity === "critical",
    );
    const windows = predictions?.windows ?? [];

    return {
      mode: derivedMode,
      memberState: temperature.state,
      temperature: temperature.composite,
      zone: temperature.zone,
      criticalAlertCount: criticalSignals.length,
      actionableSignalCount: actionableSignals.length,
      activeWindowCount: windows.filter((w) => w.status !== "closed").length,
      isComputing,
      lastComputedAt,
    };
  }, [
    derivedMode,
    temperature,
    signals,
    predictions,
    actionableSignals,
    isComputing,
    lastComputedAt,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // INTELLIGENCE SCORE — Single number for system health
  // ═══════════════════════════════════════════════════════════════════

  const intelligenceScore = useMemo(() => {
    if (!data.hasMinimumData) return 0;

    const advisorWeight = Math.min(enhancedInsights.length * 5, 30);
    const healthWeight = temperature.composite * 0.3;
    const penalty =
      (dashboardState.criticalAlertCount * 10) +
      (dashboardState.activeWindowCount > 3 ? 10 : 0);
    const bonus = resonance.agreement === "unanimous" ? 10 :
      resonance.agreement === "majority" ? 5 : 0;

    return Math.max(0, Math.min(100,
      Math.round(advisorWeight + healthWeight - penalty + bonus)
    ));
  }, [
    data.hasMinimumData,
    enhancedInsights,
    temperature,
    dashboardState,
    resonance,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // NARRATIVE TAB ORDERING
  // Tabs reorder by insight severity × keyword match
  // ═══════════════════════════════════════════════════════════════════

  const tabOrder = useMemo<FocusPanelId[]>(() => {
    const base: FocusPanelId[] = [
      "portrait", "vitals", "journey", "signals",
      "financial", "social", "dna", "timeline",
      "risks", "brief", "actions",
    ];

    if (derivedMode === "calm") return base;

    // In alert/critical: reorder to prioritize what needs attention
    const priority: FocusPanelId[] = [];

    // Critical mode: brief + actions + risks first
    if (derivedMode === "critical") {
      priority.push("brief", "actions", "risks");
    }

    // Alert mode: brief first, then risks
    if (derivedMode === "alert") {
      priority.push("brief");
      if (dashboardState.criticalAlertCount > 0) priority.push("risks");
      if (actionableSignals.length > 0) priority.push("actions");
    }

    // Add remaining panels in original order
    for (const panel of base) {
      if (!priority.includes(panel)) {
        priority.push(panel);
      }
    }

    return priority;
  }, [derivedMode, dashboardState.criticalAlertCount, actionableSignals]);

  // ═══════════════════════════════════════════════════════════════════
  // COMPUTATION TRACKING
  // ═══════════════════════════════════════════════════════════════════

  // Track when intelligence computation completes
  const hasComputed = useRef(false);
  useEffect(() => {
    if (!hasComputed.current && data.hasMinimumData && !data.isLoading) {
      setIsComputing(true);
      // Intelligence computation is synchronous (pure functions)
      // but we track the state for UI feedback
      const timeout = setTimeout(() => {
        const now = new Date().toISOString();
        lastComputedAtRef.current = now;
        setLastComputedAt(now);
        setIsComputing(false);
        hasComputed.current = true;
      }, 100); // Brief delay for UI feedback

      return () => clearTimeout(timeout);
    }
  }, [data.hasMinimumData, data.isLoading]);

  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const navigateToFocus = useCallback(
    (panel: FocusPanelId) => {
      setActiveFocus(panel);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  const navigateToRisks = useCallback(
    () => navigateToFocus("risks"),
    [navigateToFocus],
  );

  const navigateToActions = useCallback(
    () => navigateToFocus("actions"),
    [navigateToFocus],
  );

  const navigateToBrief = useCallback(
    () => navigateToFocus("brief"),
    [navigateToFocus],
  );

  // ═══════════════════════════════════════════════════════════════════
  // RETURN — Everything the dashboard needs
  // ═══════════════════════════════════════════════════════════════════

  return {
    // ── Adaptive Morphism ─────────────────────────────────────────────
    mode: derivedMode,
    ambientState,
    dashboardState,
    intelligenceScore,

    // ── Temperature (THE number) ──────────────────────────────────────
    temperature,
    vitalSigns,
    portraitRings,

    // ── Cross-Domain Intelligence ─────────────────────────────────────
    signals,
    resonance,
    actionableSignals,
    dna,

    // ── Predictions ───────────────────────────────────────────────────
    predictions,
    churnWindow,
    ltvWindow,

    // ── Narrative (AI Briefing) ───────────────────────────────────────
    narrative,

    // ── Advisor ───────────────────────────────────────────────────────
    advisorInsights: enhancedInsights,

    // ── Focus management ──────────────────────────────────────────────
    activeFocus,
    setActiveFocus,
    navigateToFocus,
    navigateToRisks,
    navigateToActions,
    navigateToBrief,
    tabOrder,

    // ── Raw data access ───────────────────────────────────────────────
    profile: data.profile,
    healthScore: data.healthScore,
    churnPrediction: data.churnPrediction,
    journey: data.journey,
    activitySummary: data.activitySummary,
    socialProfile: data.socialProfile,
    ltvAnalysis: data.ltvAnalysis,

    // ── Status ────────────────────────────────────────────────────────
    isLoading: data.isLoading,
    isError: data.isError,
    error: data.error,
    loadedSourceCount: data.loadedSourceCount,
    hasMinimumData: data.hasMinimumData,
    isFullyLoaded: data.isFullyLoaded,
    sourceStatus: data.sourceStatus,

    // ── Refetch ───────────────────────────────────────────────────────
    refetch: data.refetch,
  };
}