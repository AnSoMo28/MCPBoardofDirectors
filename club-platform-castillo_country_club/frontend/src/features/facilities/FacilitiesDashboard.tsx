// src/features/facilities/FacilitiesDashboard.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITIES DASHBOARD — "LA JOYA DE LA CORONA"
//
// SIEMPRE PRODUCTION GRADE NIVEL 5+ (AGENCIA)
// SIEMPRE PRODUCTION GRADE NIVEL 5+ (AGENCIA)
// SIEMPRE PRODUCTION GRADE NIVEL 5+ (AGENCIA)
//
// 5 Agency Behaviors:
//   1. CONTEXTUAL TAB AUTO-SELECTION
//      The dashboard opens in the right tab for THIS moment.
//      7am → "El Pulso" (gym starting). 8pm → "La Memoria" (review day).
//      Critical mode → tab with the most severe alert.
//
//   2. BRIEFING OVERLAY
//      A 3-second dissolve: "Good morning. 2 alerts. The gym needs
//      urgent attention." The operator feels informed before interacting.
//
//   3. HERO INSIGHT
//      The #1 priority insight, visually elevated above the stream.
//      With a CTA that jumps to the relevant tab.
//
//   4. CROSS-TAB AWARENESS
//      Contextual suggestions at the bottom of each tab:
//      "In 'El Negocio': 2 pending maintenances affect this revenue
//      → see 'El Futuro'". The system CONNECTS the dots.
//
//   5. ADAPTIVE DENSITY
//      calm: generous whitespace, editorial feel
//      alert: tighter layout, more data visible
//      critical: maximum density, stream wider, nothing hidden
//
// The dashboard is an ORCHESTRATOR. Zero business logic.
// Zero queries. It consumes useFacilitiesDashboard (Hook 2)
// and renders the 11 sub-components from Bloques 1A + 1B.
// ═══════════════════════════════════════════════════════════════

// ═══ IMPORTS CORREGIDOS ═══════════════════════════════════════
// Dashboard vive en: src/features/facilities/FacilitiesDashboard.tsx
// Todos los paths relativos desde la RAÍZ del feature.
// ═══════════════════════════════════════════════════════════════

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";

// ── Shared ──
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { EmptyState } from "@/shared/components/ui/EmptyState";
// ── Feature types ──
import type {
  FacilitiesDashboardMode,
  FacilitiesAdvisorInsight,
} from "./types";

// ── Feature config ──
// (no se importa directamente — los sub-componentes ya la usan)

// ── Hook 2: Neural Hub ──
import { useFacilitiesDashboard } from "./hooks/useFacilitiesDashboard";

// ── Bloque 1A: Infrastructure UI ──
import { FacilityAmbientCanvas } from "./components/FacilityAmbientCanvas";
import { FacilityPulse } from "./components/FacilityPulse";
import { FacilityDecisionStage } from "./components/FacilityDecisionStage";
import type { StageMode } from "./components/FacilityDecisionStage";
import { FacilityIntelligenceStream } from "./components/FacilityIntelligenceStream";

// ── Bloque 1B: Signature Innovations ──
import { SpatialGraphView } from "./components/SpatialGraphView";
import { OccupancyField } from "./components/OccupancyField";
import { MaintenanceOracle } from "./components/MaintenanceOracle";
import { WhatIfPlannerPanel } from "./components/WhatIfPlannerPanel";
import { SpatialStoryView } from "./components/SpatialStoryView";
import { MemoryJournalView } from "./components/MemoryJournalView";

// ── Comfort Intelligence (I1) ──
import { ComfortDashboard } from "./components/ComfortDashboard";

// ── CSS co-located ──
import "./FacilitiesDashboard.css";

// ═══════════════════════════════════════════════════════════════
// §1: CONTEXTUAL TAB AUTO-SELECTION
//
// "The dashboard opens in the right tab for THIS moment."
//
// Logic:
//   - If mode === "critical" → open the tab with the most
//     severe insight (health issues → "El Futuro", etc.)
//   - If morning (5-11) → "El Pulso" (daily rhythm starting)
//   - If midday (11-15) → "El Negocio" (peak activity, revenue)
//   - If afternoon (15-19) → "El Espacio" (spatial patterns)
//   - If evening (19-23) → "La Memoria" (review the day)
//   - If night (23-5) → "El Futuro" (planning ahead)
// ═══════════════════════════════════════════════════════════════

const SEVERITY_TO_TAB: Record<string, StageMode> = {
  health: "future",
  engagement: "pulse",
  strategy: "business",
  prediction: "future",
  innovation: "business",
};

function selectContextualTab(
  mode: FacilitiesDashboardMode,
  insights: FacilitiesAdvisorInsight[],
  referenceHour?: number,
): StageMode {
  // Critical mode → tab with most severe insight
  if (mode === "critical") {
    const criticalInsights = insights.filter(
      (i) => i.severity === "critical",
    );
    if (criticalInsights.length > 0) {
      // Find which tab has the most critical insights
      const tabCounts = new Map<StageMode, number>();
      for (const insight of criticalInsights) {
        const tab = SEVERITY_TO_TAB[insight.layer] ?? "pulse";
        tabCounts.set(tab, (tabCounts.get(tab) ?? 0) + 1);
      }
      let bestTab: StageMode = "future";
      let bestCount = 0;
      tabCounts.forEach((count, tab) => {
        if (count > bestCount) {
          bestCount = count;
          bestTab = tab;
        }
      });
      return bestTab;
    }
  }

  // Time-based selection
  const hour = referenceHour ?? new Date().getHours();

  if (hour >= 5 && hour < 11) return "pulse";     // morning rhythm
  if (hour >= 11 && hour < 15) return "business";  // peak activity
  if (hour >= 15 && hour < 19) return "space";     // spatial patterns
  if (hour >= 19 && hour < 23) return "memory";    // review day
  return "future";                                  // night: planning
}

// ═══════════════════════════════════════════════════════════════
// §2: BRIEFING BUILDER
//
// "Good morning. 2 alerts. The gym needs urgent attention."
//
// Builds a human-readable briefing from current state.
// ═══════════════════════════════════════════════════════════════

interface BriefingData {
  greeting: string;
  summary: string;
  alerts: Array<{ type: "critical" | "warning" | "ok"; text: string }>;
}

function buildBriefing(
  mode: FacilitiesDashboardMode,
  insights: FacilitiesAdvisorInsight[],
  totalFacilities: number,
): BriefingData {
  const hour = new Date().getHours();
  const criticals = insights.filter((i) => i.severity === "critical");
  const warnings = insights.filter((i) => i.severity === "warning");

  // Greeting
  let greeting = "Buenos días";
  if (hour >= 12 && hour < 18) greeting = "Buenas tardes";
  if (hour >= 18 || hour < 5) greeting = "Buenas noches";

  // Summary
  let summary = `${totalFacilities} espacios operando normalmente.`;
  if (mode === "critical") {
    summary = `${criticals.length} alerta${criticals.length > 1 ? "s" : ""} crítica${criticals.length > 1 ? "s" : ""} requiere${criticals.length === 1 ? "" : "n"} atención inmediata.`;
  } else if (mode === "alert") {
    summary = `${warnings.length} advertencia${warnings.length > 1 ? "s" : ""} activa${warnings.length > 1 ? "s" : ""}.`;
  }

  // Alerts
  const alerts: BriefingData["alerts"] = [];

  for (const c of criticals.slice(0, 2)) {
    alerts.push({ type: "critical", text: c.title });
  }
  for (const w of warnings.slice(0, 2 - alerts.length)) {
    alerts.push({ type: "warning", text: w.title });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "ok",
      text: "Sin alertas activas. El club opera dentro de parámetros.",
    });
  }

  return { greeting, summary, alerts };
}

// ═══════════════════════════════════════════════════════════════
// §3: HERO INSIGHT SELECTOR
//
// "Tu prioridad #1: Piscina salud 28%, falla en 14 días."
//
// Picks the single most important insight and elevates it.
// Criteria: critical > warning > opportunity, then by confidence.
// ═══════════════════════════════════════════════════════════════

function selectHeroInsight(
  insights: FacilitiesAdvisorInsight[],
): FacilitiesAdvisorInsight | null {
  if (insights.length === 0) return null;

  // Prioritize: critical with action > critical > warning with action > warning > opportunity
  const scored = insights.map((i) => {
    let score = 0;
    if (i.severity === "critical") score += 100;
    if (i.severity === "warning") score += 60;
    if (i.severity === "opportunity") score += 30;
    if (i.severity === "info") score += 10;
    if (i.action) score += 20;
    score += i.confidence * 0.3;
    return { insight: i, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.insight ?? null;
}

// ═══════════════════════════════════════════════════════════════
// §4: CROSS-TAB SUGGESTIONS BUILDER
//
// "In 'El Negocio': 2 pending maintenances affect this revenue
//  → see 'El Futuro'"
//
// Analyzes the current tab + available insights to suggest
// relevant content in other tabs.
// ═══════════════════════════════════════════════════════════════

interface CrossTabSuggestion {
  targetTab: StageMode;
  label: string;
  count: number;
}

function buildCrossTabSuggestions(
  activeTab: StageMode,
  insights: FacilitiesAdvisorInsight[],
  whatIfCount: number,
  rippleCount: number,
  memoryCount: number,
): CrossTabSuggestion[] {
  const suggestions: CrossTabSuggestion[] = [];

  // Group insights by tab
  const insightsByTab = new Map<StageMode, number>();
  for (const insight of insights) {
    const tab = SEVERITY_TO_TAB[insight.layer] ?? "pulse";
    insightsByTab.set(tab, (insightsByTab.get(tab) ?? 0) + 1);
  }

  // Suggest tabs with insights that aren't the active one
  insightsByTab.forEach((count, tab) => {
    if (tab !== activeTab && count > 0) {
      const tabLabels: Record<StageMode, string> = {
        space: "El Espacio",
        pulse: "El Pulso",
        future: "El Futuro",
        business: "El Negocio",
        memory: "La Memoria",
      };
      suggestions.push({
        targetTab: tab,
        label: `${count} insight${count > 1 ? "s" : ""} en "${tabLabels[tab]}"`,
        count,
      });
    }
  });

  // Contextual cross-suggestions based on active tab
  if (activeTab === "business" && whatIfCount > 0) {
    // Already in business, but suggest memory for historical context
    if (memoryCount > 0) {
      suggestions.push({
        targetTab: "memory",
        label: `${memoryCount} memorias relevantes para contexto histórico`,
        count: memoryCount,
      });
    }
  }

  if (activeTab === "pulse" && rippleCount > 0) {
    suggestions.push({
      targetTab: "memory",
      label: `${rippleCount} ripple effects detectados hoy`,
      count: rippleCount,
    });
  }

  if (activeTab === "future") {
    if (whatIfCount > 0) {
      suggestions.push({
        targetTab: "business",
        label: `${whatIfCount} escenarios what-if generados`,
        count: whatIfCount,
      });
    }
  }

  if (activeTab === "space") {
    // After exploring spatial graph, suggest pulse for live data
    const pulseInsights = insightsByTab.get("pulse") ?? 0;
    if (pulseInsights > 0) {
      suggestions.push({
        targetTab: "pulse",
        label: `${pulseInsights} alerta${pulseInsights > 1 ? "s" : ""} de ocupación/confort`,
        count: pulseInsights,
      });
    }
  }

  if (activeTab === "memory") {
    if (whatIfCount > 0) {
      suggestions.push({
        targetTab: "business",
        label: `${whatIfCount} escenarios proactivos disponibles`,
        count: whatIfCount,
      });
    }
  }

  // Deduplicate and limit
  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      if (seen.has(s.targetTab)) return false;
      seen.add(s.targetTab);
      return true;
    })
    .slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════
// TAB → INSIGHT COUNT MAPPING
// ═══════════════════════════════════════════════════════════════

function computeInsightCountsByTab(
  insights: FacilitiesAdvisorInsight[],
): Partial<Record<StageMode, number>> {
  const counts: Partial<Record<StageMode, number>> = {};
  for (const insight of insights) {
    const tab = SEVERITY_TO_TAB[insight.layer] ?? "pulse";
    counts[tab] = (counts[tab] ?? 0) + 1;
  }
  return counts;
}

// ═══════════════════════════════════════════════════════════════
// HERO TAB MAPPING — Which tab does a hero CTA lead to?
// ═══════════════════════════════════════════════════════════════

function heroInsightToTab(
  insight: FacilitiesAdvisorInsight,
): StageMode {
  return SEVERITY_TO_TAB[insight.layer] ?? "pulse";
}

function heroCtaLabel(
  insight: FacilitiesAdvisorInsight,
): string {
  if (insight.severity === "critical") return "Ver ahora";
  if (insight.severity === "warning") return "Investigar";
  if (insight.severity === "opportunity") return "Explorar";
  return "Ver detalles";
}

function normalizeAmbientPulseRate(
  rate: string | undefined,
): "dormant" | "slow" | "elevated" | "rapid" | undefined {
  switch (rate) {
    case "dormant":
      return "dormant";
    case "flowing":
      return "slow";
    case "deep":
      return "elevated";
    case "critical":
      return "rapid";
    default:
      return undefined;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface FacilitiesDashboardProps {
  /** No props — fully autonomous. */
}

export function FacilitiesDashboard(_props: FacilitiesDashboardProps) {
  const prefersReduced = useReducedMotion();

  // ── Hook 2: Neural Hub — ALL intelligence computed here ──
  const dashboard = useFacilitiesDashboard({
    enabled: true,
    utilizationEnabled: true,
    analyticsEnabled: false,
    optimizationEnabled: false,
  });

  // ── §1: Briefing state ──
  const [briefingDismissed, setBriefingDismissed] = useState(false);
  const [briefingExiting, setBriefingExiting] = useState(false);
  const briefingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss briefing after 3.5s
  useEffect(() => {
    if (dashboard.isReady && !briefingDismissed && !prefersReduced) {
      briefingTimerRef.current = setTimeout(() => {
        setBriefingExiting(true);
        setTimeout(() => setBriefingDismissed(true), 800);
      }, 3500);
    }
    return () => {
      if (briefingTimerRef.current) clearTimeout(briefingTimerRef.current);
    };
  }, [dashboard.isReady, briefingDismissed, prefersReduced]);

  const handleDismissBriefing = useCallback(() => {
    setBriefingExiting(true);
    setTimeout(() => setBriefingDismissed(true), 800);
  }, []);

  // Skip briefing entirely if reduced motion
  const showBriefing =
    !briefingDismissed &&
    dashboard.isReady &&
    !prefersReduced &&
    dashboard.advisorInsights.length > 0;

  // ── §1: Auto-select tab ──
  const autoTab = useMemo(
    () =>
      selectContextualTab(
        dashboard.dashboardMode,
        dashboard.advisorInsights,
      ),
    [dashboard.dashboardMode, dashboard.advisorInsights],
  );

  const [activeTab, setActiveTab] = useState<StageMode>(autoTab);

  // Re-select tab when mode changes to critical
  useEffect(() => {
    if (dashboard.dashboardMode === "critical") {
      setActiveTab(
        selectContextualTab("critical", dashboard.advisorInsights),
      );
    }
  }, [dashboard.dashboardMode, dashboard.advisorInsights]);

  // ── §3: Hero insight ──
  const heroInsight = useMemo(
    () => selectHeroInsight(dashboard.advisorInsights),
    [dashboard.advisorInsights],
  );

  const [heroDismissed, setHeroDismissed] = useState(false);

  const handleHeroCta = useCallback(() => {
    if (heroInsight) {
      const tab = heroInsightToTab(heroInsight);
      setActiveTab(tab);
      setHeroDismissed(true);
    }
  }, [heroInsight]);

  const handleHeroDismiss = useCallback(() => {
    setHeroDismissed(true);
  }, []);

  // Reset hero when insights change
  useEffect(() => {
    setHeroDismissed(false);
  }, [dashboard.advisorInsights.length]);

  // ── §4: Cross-tab suggestions ──
  const crossTabSuggestions = useMemo(
    () =>
      buildCrossTabSuggestions(
        activeTab,
        dashboard.advisorInsights,
        dashboard.whatIfScenarios.length,
        dashboard.eventRipples.length,
        Object.keys(dashboard.facilityNarratives).length,
      ),
    [
      activeTab,
      dashboard.advisorInsights,
      dashboard.whatIfScenarios.length,
      dashboard.eventRipples.length,
      dashboard.facilityNarratives,
    ],
  );

  // ── §2: Briefing data ──
  const briefing = useMemo(
    () =>
      buildBriefing(
        dashboard.dashboardMode,
        dashboard.advisorInsights,
        dashboard.facilities.length,
      ),
    [dashboard.dashboardMode, dashboard.advisorInsights, dashboard.facilities.length],
  );

  // ── Insight counts per tab ──
  const insightCounts = useMemo(
    () => computeInsightCountsByTab(dashboard.advisorInsights),
    [dashboard.advisorInsights],
  );

  // ── Action executor ──
  const handleExecuteAction = useCallback(
    async (command: import("@/shared/types/ai-intelligence").AdvisorCommand) => {
      // Route action based on command type
      try {
        if (command.action === "schedule_maintenance") {
          await dashboard.refetchAll();
        } else if (command.action === "create_issue") {
          await dashboard.refetchAll();
        }
      } catch {
        // Silently handle — the stream will show the error
      }
    },
    [dashboard],
  );

  const handleSelectFacility = useCallback((_id: string) => {
    // Cross-component selection: could be used to filter stream
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RENDER: LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (dashboard.isLoading) {
    return (
      <div className="fac-dashboard" data-mode="calm">
        <FacilityAmbientCanvas
          mode="calm"
          intensity={15}
          pulseRate="dormant"
        />
        <div className="fac-dashboard__skeleton">
          <div className="fac-dashboard__skeleton-bar" />
          <div className="fac-dashboard__skeleton-content">
            <div className="fac-dashboard__skeleton-main" />
            <div className="fac-dashboard__skeleton-sidebar" />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ERROR STATE
  // ═══════════════════════════════════════════════════════════════

  if (dashboard.error) {
    return (
      <div className="fac-dashboard" data-mode="calm">
        <FacilityAmbientCanvas
          mode="calm"
          intensity={10}
          pulseRate="dormant"
        />
        <EmptyState
          title="Error al cargar datos"
          description={dashboard.error}
          secondaryAction={
            <button type="button" onClick={dashboard.refetchAll}>
              Reintentar
            </button>
          }
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: EMPTY STATE
  // ═══════════════════════════════════════════════════════════════

  if (dashboard.isReady && dashboard.facilities.length === 0) {
    return (
      <div className="fac-dashboard" data-mode="calm">
        <FacilityAmbientCanvas
          mode="calm"
          intensity={10}
          pulseRate="dormant"
        />
        <EmptyState
          title="Sin instalaciones registradas"
          description="Registra tu primera instalación para comenzar a monitorear el club."
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: FULL DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  const mode = dashboard.dashboardMode;
  const { ambientState } = dashboard;

  return (
    <div
      className="fac-dashboard"
      data-mode={mode}
      data-density={mode === "critical" ? "compact" : mode === "alert" ? "normal" : "relaxed"}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* ── Ambient Canvas (fixed behind everything) ── */}
      <FacilityAmbientCanvas
        mode={ambientState.mode}
        intensity={ambientState.intensity}
        accentColor={ambientState.accent_color}
        pulseRate={normalizeAmbientPulseRate(ambientState.pulse_rate)}
      />

      {/* ── §2: Briefing Overlay ── */}
      {showBriefing && (
        <div
          className="fac-dashboard__briefing"
          data-dismissing={briefingExiting ? "true" : undefined}
          onClick={handleDismissBriefing}
          role="dialog"
          aria-label="Daily briefing"
        >
          <div className="fac-dashboard__briefing-greeting">
            {briefing.greeting}
          </div>
          <div className="fac-dashboard__briefing-summary">
            {briefing.summary}
          </div>
          <div className="fac-dashboard__briefing-alerts">
            {briefing.alerts.map((alert, i) => (
              <div
                key={i}
                className="fac-dashboard__briefing-alert"
                data-type={alert.type}
              >
                <span className="fac-dashboard__briefing-dot" data-type={alert.type} />
                {" "}{alert.text}
              </div>
            ))}
          </div>
          <div className="fac-dashboard__briefing-dismiss">
            Click para continuar
          </div>
        </div>
      )}

      {/* ── Main Body ── */}
      <div className="fac-dashboard__body">
        {/* Pulse Bar */}
        <FacilityPulse
          ambientState={ambientState}
          totalFacilities={dashboard.facilities.length}
          activeAlerts={ambientState.active_alerts}
          facilitiesAtRiskPct={ambientState.facilities_at_risk}
          crossDomainSignal={dashboard.crossDomainSignals[0]}
          utilizationPct={dashboard.amenityUtilization?.overall_utilization_pct}
        />

        {/* Content: Stage + Stream */}
        <div className="fac-dashboard__content">
          {/* Stage */}
          <div className="fac-dashboard__stage-wrap">
            <FacilityDecisionStage
              activeTab={activeTab}
              onTabChange={setActiveTab}
              insightCounts={insightCounts}
              ambientMode={mode}
              accentColor={ambientState.accent_color}
            >
              {{
                space: (
                  <div className="fac-dashboard__stage-inner">
                    <SpatialGraphView
                      graph={dashboard.spatialGraph}
                      personalities={dashboard.facilityPersonalities}
                      comfortScores={dashboard.comfortScores}
                      occupancyPredictions={dashboard.occupancyPredictions}
                      onSelectFacility={handleSelectFacility}
                    />
                  </div>
                ),

                pulse: (
                  <div className="fac-dashboard__stage-inner">
                    <OccupancyField
                      predictions={dashboard.occupancyPredictions}
                      comfortScores={dashboard.comfortScores}
                      graph={dashboard.spatialGraph}
                      onSelectFacility={handleSelectFacility}
                    />
                    <ComfortDashboard
                      enhancedComfortScores={dashboard.enhancedComfortScores}
                      comfortScores={dashboard.comfortScores}
                      facilities={dashboard.facilities}
                      ambientMode={mode}
                    />
                  </div>
                ),

                future: (
                  <div className="fac-dashboard__stage-inner">
                    <MaintenanceOracle
                      deteriorationModels={dashboard.deteriorationModels}
                      maintenancePrediction={dashboard.maintenancePrediction as any}
                      selectedFacilityId={undefined}
                      onScheduleMaintenance={undefined}
                    />
                  </div>
                ),

                business: (
                  <div className="fac-dashboard__stage-inner">
                    <WhatIfPlannerPanel
                      autoScenarios={dashboard.whatIfScenarios}
                      facilities={dashboard.facilities}
                      graph={dashboard.spatialGraph}
                      revenueModels={dashboard.revenueModels}
                      comfortScores={dashboard.comfortScores}
                    />
                  </div>
                ),

                memory: (
                  <div className="fac-dashboard__stage-inner">
                    <SpatialStoryView
                      frames={dashboard.temporalGraphSequence}
                      ripples={dashboard.eventRipples}
                      resonancePatterns={dashboard.resonancePatterns}
                    />
                    <div className="fac-dashboard__memory-journal-wrap">
                      <MemoryJournalView
                        narratives={dashboard.facilityNarratives}
                        memories={dashboard.facilityMemories}
                        facilities={dashboard.facilities}
                      />
                    </div>
                  </div>
                ),
              }}
            </FacilityDecisionStage>

            {/* §4: Cross-Tab Suggestions */}
            {crossTabSuggestions.length > 0 && (
              <div className="fac-dashboard__suggestions">
                {crossTabSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.targetTab}
                    className="fac-dashboard__suggest"
                    onClick={() => setActiveTab(suggestion.targetTab)}
                  >
                    {suggestion.label}
                    <span className="fac-dashboard__suggest-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Intelligence Stream (sidebar) */}
          <div className="fac-dashboard__stream-wrap">
            {/* §3: Hero Insight */}
            {heroInsight && !heroDismissed && (
              <div
                className="fac-dashboard__hero"
                data-severity={heroInsight.severity}
              >
                <div className="fac-dashboard__hero-label">
                  Prioridad #{heroInsight.severity === "critical" ? "1 — Crítico" : "1"}
                </div>
                <div className="fac-dashboard__hero-title">
                  {heroInsight.title}
                </div>
                <div className="fac-dashboard__hero-reasoning">
                  {heroInsight.reasoning.length > 150
                    ? heroInsight.reasoning.slice(0, 147) + "…"
                    : heroInsight.reasoning}
                </div>
                <div className="fac-dashboard__hero-actions">
                  <button
                    className="fac-dashboard__hero-cta fac-dashboard__hero-cta--primary"
                    onClick={handleHeroCta}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    {heroCtaLabel(heroInsight)}
                  </button>
                  <button
                    className="fac-dashboard__hero-cta fac-dashboard__hero-cta--dismiss"
                    onClick={handleHeroDismiss}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {/* Intelligence Stream */}
            <FacilityIntelligenceStream
              insights={dashboard.advisorInsights}
              crossDomainSignals={dashboard.crossDomainSignals}
              ambientMode={mode}
              onExecuteAction={handleExecuteAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}