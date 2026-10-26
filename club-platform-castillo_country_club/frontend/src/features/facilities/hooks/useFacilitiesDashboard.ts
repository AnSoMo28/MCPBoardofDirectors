// src/features/facilities/hooks/useFacilitiesDashboard.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES DASHBOARD — Neural Hub (Hook 2 of Two-Hook Pattern)
//
// Consumes useFacilitiesData (Hook 1) + 12 engines + 15 rules.
// Computes ALL intelligence in a single useMemo to avoid
// redundant calculations across components.
//
// Returns FacilitiesDashboardReturn — the single source of truth
// for the entire Facilities dashboard.
//
// 5 Intelligence Layers:
//   1. Spatial      — graph, personality, comfort, occupancy
//   2. Predictive   — deterioration, failure, maintenance
//   3. Optimization — revenue, what-if, spatial optimization
//   4. Temporal     — storytelling, memory, resonance
//   5. System       — advisor, ambient state, cross-domain
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";

import { useFacilitiesData } from "./useFacilitiesData";
import {
  type FacilitiesDashboardReturn,
  type FacilitiesDashboardMode,
  type FacilitiesAmbientState,
  type SpatialGraph,
  type FacilityPersonality,
  type ComfortScore,
  type EnhancedComfortScore,
  type DeteriorationModel,
  type OccupancyPrediction,
  type RevenueModel,
  type FacilityMemory,
  type TemporalGraphFrame,
  type WhatIfScenario,
  type FacilityNarrative,
  type EventRipple,
  type ResonancePattern,
  type FacilitiesAdvisorInsight,
  type CrossDomainSignal,
  deriveFacilitiesDashboardMode,
} from "../types";

import {
  FACILITIES_ADVISOR_THRESHOLDS,
  FACILITIES_DASHBOARD_THRESHOLDS,
} from "../config";

// ── Engines ──
import { buildSpatialGraph } from "../lib/spatialGraph";
import { predictAllOccupancy } from "../lib/occupancyPrediction";
import { predictAllDeterioration } from "../lib/deteriorationModel";
import { computeAllComfortScores, computeAllEnhancedComfortScores } from "../lib/comfortScore";
import { buildAllRevenueModels } from "../lib/revenueModel";
import { scheduleOptimalMaintenance } from "../lib/maintenancePrediction";
import { buildTemporalGraphSequence } from "../lib/spatialStorytelling";
import { autoDetectScenarios } from "../lib/whatIfPlanner";
import { buildAllFacilityMemories, buildAllFacilityNarratives } from "../lib/spatialMemory";
import { traceAllEventRipples, detectResonancePatterns } from "../lib/temporalResonance";

// ── Advisor Engine (Level 5+) ──
import { AdvisorEngine, signalBus } from "@/shared/lib/advisor-engine";
import { FACILITIES_ADVISOR_CONFIG } from "../lib/advisor/facilitiesAdvisorConfig";

// ═══════════════════════════════════════════════════════════════
// AGGREGATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Group maintenance tasks by facility_id for engine consumption.
 */
function groupMaintenanceByFacility(
  tasks: import("../types").MaintenanceTask[],
): Record<string, import("../types").MaintenanceTask[]> {
  const grouped: Record<string, import("../types").MaintenanceTask[]> = {};
  for (const task of tasks) {
    const list = grouped[task.facility_id] ?? [];
    list.push(task);
    grouped[task.facility_id] = list;
  }
  return grouped;
}

/**
 * Group inspections by facility_id for engine consumption.
 */
function groupInspectionsByFacility(
  inspections: import("../types").Inspection[],
): Record<string, import("../types").Inspection[]> {
  const grouped: Record<string, import("../types").Inspection[]> = {};
  for (const insp of inspections) {
    const list = grouped[insp.facility_id] ?? [];
    list.push(insp);
    grouped[insp.facility_id] = list;
  }
  return grouped;
}

/**
 * Group reservations by facility_id for engine consumption.
 */
function groupReservationsByFacility(
  reservations: import("../types").FacilityReservation[],
): Record<string, import("../types").FacilityReservation[]> {
  const grouped: Record<string, import("../types").FacilityReservation[]> = {};
  for (const res of reservations) {
    const list = grouped[res.facility_id] ?? [];
    list.push(res);
    grouped[res.facility_id] = list;
  }
  return grouped;
}

/**
 * Build utilization lookup by facility_id.
 */
function buildUtilizationLookup(
  utilization: import("../types").AmenityUtilizationResponse | null,
): Record<string, import("../types").AmenityUtilizationItem | null> {
  const lookup: Record<string, import("../types").AmenityUtilizationItem | null> = {};
  if (!utilization) return lookup;
  for (const item of utilization.facilities) {
    lookup[item.facility_id] = item;
  }
  return lookup;
}

// ═══════════════════════════════════════════════════════════════
// AMBIENT STATE BUILDER
//
// Derives dashboard mode and ambient state from system alerts.
// ═══════════════════════════════════════════════════════════════

function buildAmbientState(
  advisorInsights: import("@/shared/types/ai-intelligence").AdvisorInsightBase[],
  facilitiesAtRiskPct: number,
): { mode: FacilitiesDashboardMode; ambient: FacilitiesAmbientState } {
  // Map Advisor Engine impact levels to Facilities severity counts
  // impact: "high" ≈ critical, "medium" ≈ warning
  const criticalAlerts = advisorInsights.filter(
    (i) => i.impact === "high",
  ).length;
  const warningAlerts = advisorInsights.filter(
    (i) => i.impact === "medium",
  ).length;

  const mode = deriveFacilitiesDashboardMode(
    criticalAlerts,
    warningAlerts,
    facilitiesAtRiskPct,
  );

  const t = FACILITIES_DASHBOARD_THRESHOLDS;

  const intensity =
    mode === "critical"
      ? t.INTENSITY.CRITICAL_MIN + criticalAlerts * 5
      : mode === "alert"
        ? t.INTENSITY.ALERT_MIN + warningAlerts * 5
        : t.INTENSITY.CALM_MAX;

  return {
    mode,
    ambient: {
      mode,
      intensity: Math.min(100, intensity),
      accent_color: t.ACCENT_COLOR[mode],
      pulse_rate: t.PULSE_RATE[mode],
      active_alerts: criticalAlerts + warningAlerts,
      facilities_at_risk: Math.round(facilitiesAtRiskPct),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CROSS-DOMAIN SIGNALS AGGREGATOR
// ═══════════════════════════════════════════════════════════════

function aggregateCrossDomainSignals(
  analytics: import("../types").FacilityAnalyticsResponse | null,
  eventRipples: EventRipple[],
  resonancePatterns: ResonancePattern[],
): CrossDomainSignal[] {
  const signals: CrossDomainSignal[] = [];

  // From analytics
  if (analytics?.cross_domain_signals) {
    signals.push(...analytics.cross_domain_signals);
  }

  // From severe ripples
  for (const ripple of eventRipples.slice(0, 3)) {
    if (ripple.cascade_severity > 40) {
      signals.push({
        domain: "facilities",
        signal: `Evento "${ripple.source_event.event_name}" generó cascada severa (${ripple.cascade_severity}/100) afectando ${ripple.total_affected_facilities} espacio(s)`,
        impact: `₡${Math.round(ripple.cascade_severity * 15_000).toLocaleString("es-CR")} en costos ocultos estimados`,
        severity: ripple.cascade_severity > 60 ? "high" : "medium",
        confidence: Math.min(0.99, ripple.cascade_severity / 100),
      });
    }
  }

  // From resonance patterns
  for (const pattern of resonancePatterns.slice(0, 2)) {
    signals.push({
      domain: "facilities",
      signal: `Patrón recurrente: "${pattern.trigger}" — observado ${pattern.times_observed} veces`,
      impact: `₡${Math.round(pattern.hidden_cost_avg).toLocaleString("es-CR")} costo oculto promedio por ocurrencia`,
        severity: "medium",
        confidence: Math.min(0.9, pattern.times_observed / 10),
    });
  }

  return signals.slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════

export function useFacilitiesDashboard(options?: {
  enabled?: boolean;
  analyticsEnabled?: boolean;
  optimizationEnabled?: boolean;
  utilizationEnabled?: boolean;
}): FacilitiesDashboardReturn {
  // ── Hook 1: Data Orchestrator ──
  const data = useFacilitiesData(options);

  // ── Intelligence computation (single useMemo) ──
  const intelligence = useMemo(() => {
    if (!data.isReady || data.facilities.length === 0) {
      return buildEmptyIntelligence();
    }

    // ═══ LAYER 1: SPATIAL ═══════════════════════════════════

    // §F1 + §F2: Spatial Graph + Personality
    const spatialGraph: SpatialGraph = buildSpatialGraph(
      data.facilities,
      data.reservations,
      data.amenityUtilization,
      data.healthResponse,
    );

    // Personality lookup
    const facilityPersonalities: Record<string, FacilityPersonality> = {};
    for (const node of spatialGraph.nodes) {
      facilityPersonalities[node.facility_id] = node.personality;
    }

    // §F5 + Prop 12: Comfort Scores (basic — consumed by other engines)
    const comfortScores: Record<string, ComfortScore> = computeAllComfortScores(
      data.facilities,
      data.amenityUtilization,
    );

    // §F5 + Prop 12: Enhanced Comfort (technical + psychological — consumed by UI)
    const enhancedComfortScores: Record<string, EnhancedComfortScore> =
      computeAllEnhancedComfortScores(
        data.facilities,
        data.amenityUtilization,
      );

    // §F3: Occupancy Predictions
    const occupancyPredictions: Record<string, OccupancyPrediction> =
      predictAllOccupancy(data.amenityUtilization, data.reservations);

    // ═══ LAYER 2: PREDICTIVE ════════════════════════════════

    // §F4: Deterioration Models
    const maintenanceByFacility = groupMaintenanceByFacility(data.maintenanceTasks);
    const inspectionsByFacility = groupInspectionsByFacility(data.inspections);
    const utilizationLookup = buildUtilizationLookup(data.amenityUtilization);

    const deteriorationModels: Record<string, DeteriorationModel> = predictAllDeterioration(
      data.facilities,
      maintenanceByFacility,
      inspectionsByFacility,
      utilizationLookup,
    );

    // §F8: Maintenance Prediction
    const maintenanceResult = scheduleOptimalMaintenance(
      data.facilities,
      deteriorationModels,
      data.reservations,
      maintenanceByFacility,
      FACILITIES_ADVISOR_THRESHOLDS.MAINTENANCE_BUDGET_DEFAULT,
    );

    const maintenancePrediction: import("../types").MaintenancePrediction =
      "priority_actions" in maintenanceResult
        ? (maintenanceResult as import("../types").MaintenancePrediction)
        : { priority_actions: [] };
    // ═══ LAYER 3: OPTIMIZATION ══════════════════════════════

    // §F7: Revenue Models
    const revenueModels: Record<string, RevenueModel> = buildAllRevenueModels(
      data.facilities,
      data.reservations,
      data.amenityUtilization,
      comfortScores,
    );

    // Prop 10: Auto-generated What-If Scenarios
    const whatIfScenarios: WhatIfScenario[] = autoDetectScenarios(
      data.facilities,
      spatialGraph,
      deteriorationModels,
      occupancyPredictions,
      revenueModels,
      comfortScores,
    );

    // ═══ LAYER 4: TEMPORAL ══════════════════════════════════

    // §F9: Spatial Storytelling
    const temporalGraphSequence: TemporalGraphFrame[] = buildTemporalGraphSequence(
      data.facilities,
      data.reservations,
      data.amenityUtilization,
      data.healthResponse,
    );

    // §F11: Memory Journal
    const reservationsByFacility = groupReservationsByFacility(data.reservations);
    const facilityMemories: Record<string, FacilityMemory> = buildAllFacilityMemories(
      data.facilities,
      reservationsByFacility,
    );

    const facilityNames: Record<string, string> = {};
    for (const f of data.facilities) {
      facilityNames[f.id] = f.name;
    }
    const facilityNarratives: Record<string, FacilityNarrative> = buildAllFacilityNarratives(
      facilityMemories,
      facilityNames,
    );

    // §F12: Temporal Resonance (Ripple Effect)
    const eventRipples: EventRipple[] = traceAllEventRipples(
      data.reservations,
      data.facilities,
      data.amenityUtilization,
      15,
    );
    const resonancePatterns: ResonancePattern[] = detectResonancePatterns(eventRipples);

    // ═══ LAYER 5: SYSTEM ════════════════════════════════════

    // Cross-Domain Signals
    const crossDomainSignals = aggregateCrossDomainSignals(
      data.analytics as import("../types").FacilityAnalyticsResponse | null,
      eventRipples,
      resonancePatterns,
    );

    // Facilities at risk %
    const facilitiesAtRisk = Object.values(deteriorationModels).filter(
      (m) =>
        m.components.some(
          (c) =>
            c.current_health < 40,
        ),
    ).length;
    const facilitiesAtRiskPct =
      data.facilities.length > 0
        ? (facilitiesAtRisk / data.facilities.length) * 100
        : 0;

    // Advisor Engine v2 — single-pass evaluation (no double eval)
    const advisorEngine = new AdvisorEngine(FACILITIES_ADVISOR_CONFIG);
    const advisorRawData = {
      facilities: data.facilities,
      maintenance: data.maintenanceTasks,
      reservations: data.reservations,
      inspections: data.inspections,
      analytics: data.analytics,
      utilization: data.amenityUtilization,
      health: data.healthResponse,
      optimization: data.spaceOptimization,
      comfortScores,
      occupancyPredictions,
      deteriorationModels,
      revenueModels,
      whatIfScenarios,
      eventRipples,
      crossDomainSignals: [],
    };

    // Consume cross-domain signals from the bus
    const crossSignals = signalBus.getSignalsFor("facilities");

    // Single evaluation — AdvisorEngine handles health score + signal collection
    const advisorResult = advisorEngine.evaluate(advisorRawData, crossSignals);
    const advisorInsights = advisorResult.insights;

    // Emit signals to bus (for other domains to consume)
    if (advisorResult.signals.length > 0) {
      signalBus.emit(advisorResult.signals);
    }

    // Ambient State
    const { mode, ambient } = buildAmbientState(
      advisorInsights,
      facilitiesAtRiskPct,
    );

    return {
      enhancedComfortScores,
      spatialGraph,
      facilityPersonalities,
      comfortScores,
      deteriorationModels,
      occupancyPredictions,
      revenueModels,
      maintenancePrediction,
      facilityMemories,
      temporalGraphSequence,
      whatIfScenarios,
      facilityNarratives,
      eventRipples,
      resonancePatterns,
      advisorInsights: advisorInsights as FacilitiesAdvisorInsight[],
      crossDomainSignals,
      dashboardMode: mode,
      ambientState: ambient,
    };
  }, [
    data.isReady,
    data.facilities,
    data.reservations,
    data.maintenanceTasks,
    data.inspections,
    data.analytics,
    data.amenityUtilization,
    data.spaceOptimization,
    data.healthResponse,
  ]);

  // ═══ RETURN — FacilitiesDashboardReturn ════════════════════

  return {
    // ── Data Layer ──
    facilities: data.facilities,
    reservations: data.reservations,
    maintenanceTasks: data.maintenanceTasks,
    inspections: data.inspections,
    eventSetups: [],
    analytics: data.analytics,
    amenityUtilization: data.amenityUtilization,
    healthResponse: data.healthResponse,
    spaceOptimization: data.spaceOptimization,
    isLoading: data.isLoading,
    isReady: data.isReady,
    error: data.error,
    refetchAll: data.refetchAll,

    // ── Intelligence Layer (from useMemo) ──
    spatialGraph: intelligence.spatialGraph,
    facilityPersonalities: intelligence.facilityPersonalities,
    comfortScores: intelligence.comfortScores,
    enhancedComfortScores: intelligence.enhancedComfortScores,
    deteriorationModels: intelligence.deteriorationModels,
    occupancyPredictions: intelligence.occupancyPredictions,
    revenueModels: intelligence.revenueModels,
    facilityMemories: intelligence.facilityMemories,
    maintenancePrediction: intelligence.maintenancePrediction,

    // ── New Intelligence Layer (Props 9-13) ──
    temporalGraphSequence: intelligence.temporalGraphSequence,
    whatIfScenarios: intelligence.whatIfScenarios,
    facilityNarratives: intelligence.facilityNarratives,
    eventRipples: intelligence.eventRipples,
    resonancePatterns: intelligence.resonancePatterns,

    // ── System Layer ──
    dashboardMode: intelligence.dashboardMode,
    ambientState: intelligence.ambientState,
    advisorInsights: intelligence.advisorInsights,
    crossDomainSignals: intelligence.crossDomainSignals,
  };
}

// ═══════════════════════════════════════════════════════════════
// EMPTY INTELLIGENCE — Loading state fallback
// ═══════════════════════════════════════════════════════════════

function buildEmptyIntelligence() {
  const emptyGraph: SpatialGraph = {
    nodes: [],
    edges: [],
    clusters: [],
    bottlenecks: [],
    optimization_opportunities: [],
  };

  return {
    spatialGraph: emptyGraph,
    facilityPersonalities: {},
    comfortScores: {},
    enhancedComfortScores: {},
    deteriorationModels: {},
    occupancyPredictions: {},
    revenueModels: {},
    facilityMemories: {},
    temporalGraphSequence: [],
    whatIfScenarios: [],
    facilityNarratives: {},
    eventRipples: [],
    resonancePatterns: [],
    advisorInsights: [],
    crossDomainSignals: [],
    maintenancePrediction: { priority_actions: [] },
    dashboardMode: "calm" as FacilitiesDashboardMode,
    ambientState: {
      mode: "calm" as FacilitiesDashboardMode,
      intensity: 10,
      accent_color: "var(--color-teal-400)",
      pulse_rate: "dormant" as const,
      active_alerts: 0,
      facilities_at_risk: 0,
    },
  };
}