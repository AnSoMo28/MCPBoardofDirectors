// src/features/facilities/lib/advisor/facilitiesContext.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — Context Definition + Builder
//
// Transforms raw MCP + engine data into a typed FacilitiesContext
// that extends the Advisor Engine's BaseContext.
//
// Pattern: identical to Financial (financial.ts §1).
//   - FacilitiesContext extends BaseContext
//   - buildFacilitiesCtx(rawData, signals) → typed context
//   - Pre-computed metrics for rule conditions (0 magic numbers)
//
// Created: Phase 32 — Facilities Advisor Integration
// ═══════════════════════════════════════════════════════════════

import type {
  DomainSignal,
  BaseContext
} from "@/shared/lib/advisor-engine";

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
  CrossDomainSignal,
  FacilityType,
} from "../../types";

import {
  FACILITIES_ADVISOR_THRESHOLDS as T,
} from "../../config";

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT INTERFACE
//
// Extends BaseContext with all data fields the 18 rules need.
// Organized in 3 layers: raw inputs, intelligence, computed.
// ═══════════════════════════════════════════════════════════════

export interface FacilitiesContext extends BaseContext {
  domain: "facilities";

  // ── Raw MCP inputs ──
  facilities: Facility[];
  maintenance: MaintenanceTask[];
  reservations: FacilityReservation[];
  inspections: Inspection[];
  analytics: FacilityAnalyticsResponse | null;
  utilization: AmenityUtilizationResponse | null;
  healthResponse: FacilityHealthResponse | null;
  optimization: SpaceOptimizationResponse | null;

  // ── Intelligence layer (from lib/ engines) ──
  comfortScores: Record<string, ComfortScore>;
  occupancyPredictions: Record<string, OccupancyPrediction>;
  deteriorationModels: Record<string, DeteriorationModel>;
  revenueModels: Record<string, RevenueModel>;
  whatIfScenarios: WhatIfScenario[];
  eventRipples: EventRipple[];

  // ── Cross-domain signals from external modules ──
  crossDomainSignals: CrossDomainSignal[];

  // ── Computed aggregates (pre-computed for rule conditions) ──
  criticalAlerts: number;
  warningAlerts: number;
  facilitiesAtRiskPct: number;

  // ── Derived metrics (computed in buildFacilitiesCtx) ──
  avgComfortScore: number;
  avgOccupancyPct: number;
  totalMaintenanceCost: number;
  overdueMaintenanceCount: number;
  criticalComponentCount: number;
  nearestFailureDays: number;
  nearestFailureComponent: string;
  nearestFailureFacility: string;
  totalRevenuePerMonth: number;
  decliningRevenueCount: number;
  lowComfortFacilityCount: number;
  guestFacingWithLowComfort: number;
  autoWhatIfCount: number;
  severeRippleCount: number;
  facilityTypeDistribution: Record<FacilityType, number>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — CONTEXT BUILDER
//
// Transforms raw data into FacilitiesContext with derived metrics.
// Pattern: identical to buildFinancialCtx.
//
// rawData shape = output of useFacilitiesDashboard() merge:
//   { ...mcpData, ...engineData }
// ═══════════════════════════════════════════════════════════════

interface FacilitiesRawData {
  healthResponse: any;
  facilities: Facility[];
  maintenance: MaintenanceTask[];
  reservations: FacilityReservation[];
  inspections: Inspection[];
  analytics: FacilityAnalyticsResponse | null;
  utilization: AmenityUtilizationResponse | null;
  health: FacilityHealthResponse | null;
  optimization: SpaceOptimizationResponse | null;
  comfortScores: Record<string, ComfortScore>;
  occupancyPredictions: Record<string, OccupancyPrediction>;
  deteriorationModels: Record<string, DeteriorationModel>;
  revenueModels: Record<string, RevenueModel>;
  whatIfScenarios: WhatIfScenario[];
  eventRipples: EventRipple[];
  crossDomainSignals?: CrossDomainSignal[];
}

export function buildFacilitiesCtx(
  rawData: unknown,
  signals?: DomainSignal[],
): FacilitiesContext {
  const d = rawData as FacilitiesRawData;

  const facilities = d.facilities ?? [];
  const maintenance = d.maintenance ?? [];
  const utilization = d.utilization;
  const deterioration = d.deteriorationModels ?? {};
  const comfort = d.comfortScores ?? {};
  const occupancy = d.occupancyPredictions ?? {};
  const revenue = d.revenueModels ?? {};
  const whatIf = d.whatIfScenarios ?? [];
  const ripples = d.eventRipples ?? [];

  // ── Average comfort ──
  const comfortEntries = Object.values(comfort);
  const avgComfortScore =
    comfortEntries.length > 0
      ? comfortEntries.reduce((s, c) => s + c.overall, 0) / comfortEntries.length
      : 0;

  // ── Average occupancy ──
  const occupancyEntries = Object.values(occupancy);
  const avgOccupancyPct =
    occupancyEntries.length > 0
      ? occupancyEntries.reduce((s, o) => s + o.current_pct, 0) / occupancyEntries.length
      : 0;

  // ── Maintenance aggregates ──
  const today = new Date().toISOString().split("T")[0];
  const overdue = maintenance.filter(
    (m) => m.status === "scheduled" && m.scheduled_date < today,
  );
  const totalMaintenanceCost = maintenance
    .filter((m) => m.status !== "completed" && m.status !== "cancelled")
    .reduce((s, m) => s + m.cost, 0);

  // ── Deterioration aggregates ──
  let criticalComponentCount = 0;
  let nearestFailureDays = Infinity;
  let nearestFailureComponent = "";
  let nearestFailureFacility = "";

  for (const [facilityId, model] of Object.entries(deterioration)) {
    for (const comp of model.components) {
      if (comp.current_health < T.HEALTH_CRITICAL_THRESHOLD) {
        criticalComponentCount++;
      }
      if (comp.days_to_failure < nearestFailureDays) {
        nearestFailureDays = comp.days_to_failure;
        nearestFailureComponent = comp.name;
        const fac = facilities.find((f) => f.id === facilityId);
        nearestFailureFacility = fac?.name ?? facilityId;
      }
    }
  }
  if (nearestFailureDays === Infinity) {
    nearestFailureDays = -1;
  }

  // ── Revenue aggregates ──
  const revenueEntries = Object.entries(revenue);
  const totalRevenuePerMonth = revenueEntries.reduce(
    (s, [, m]) => s + m.current.revenue_per_month,
    0,
  );
  const decliningRevenueCount = revenueEntries.filter(([, m]) => {
    const current = m.current.revenue_per_month;
    const projected = m.optimization.monte_carlo.p50;
    return current > 0 && ((current - projected) / current) * 100 > T.REVENUE_DECLINE_PCT;
  }).length;

  // ── Comfort aggregates ──
  const lowComfortFacilityCount = comfortEntries.filter(
    (c) => c.overall < T.COMFORT_LOW_THRESHOLD,
  ).length;

  // ── Guest-facing with low comfort (FR15) ──
  const guestFacingTypes: FacilityType[] = [
    "restaurant", "lounge", "ballroom", "pool", "garden",
  ];
  const guestFacilities = (utilization?.facilities ?? []).filter((f) =>
    guestFacingTypes.includes(f.facility_type as FacilityType),
  );
  const guestFacingWithLowComfort = guestFacilities.filter((f) => {
    const c = comfort[f.facility_id];
    return c && c.overall < T.COMFORT_LOW_THRESHOLD && f.utilization_pct > 30;
  }).length;

  // ── What-if aggregates ──
  const autoWhatIfCount = whatIf.filter((s) => s.auto_generated).length;

  // ── Ripple aggregates ──
  const severeRippleCount = ripples.filter(
    (r) => r.cascade_severity > 50,
  ).length;

  // ── Facility type distribution ──
  const facilityTypeDistribution: Record<string, number> = {};
  for (const f of facilities) {
    facilityTypeDistribution[f.facility_type] =
      (facilityTypeDistribution[f.facility_type] ?? 0) + 1;
  }

  // ── Critical/warning alerts from health response ──
  const healthAlerts: string[] = d.healthResponse?.alerts ?? [];
  const criticalAlerts =
    healthAlerts.filter((a: string) => a.toLowerCase().includes("crític")).length +
    criticalComponentCount;
  const warningAlerts = healthAlerts.length - criticalAlerts + overdue.length;

  // ── Facilities at risk ──
  const facilitiesAtRiskPct =
    facilities.length > 0
      ? (Object.values(deterioration).filter(
          (m) => m.overall_trajectory === "critical" || m.overall_trajectory === "accelerating",
        ).length /
          facilities.length) *
        100
      : 0;

  return {
    domain: "facilities",
    signals: signals ?? [],

    facilities,
    maintenance,
    reservations: d.reservations ?? [],
    inspections: d.inspections ?? [],
    analytics: d.analytics ?? null,
    utilization: utilization ?? null,
    healthResponse: d.healthResponse ?? null,
    optimization: d.optimization ?? null,

    comfortScores: comfort,
    occupancyPredictions: occupancy,
    deteriorationModels: deterioration,
    revenueModels: revenue,
    whatIfScenarios: whatIf,
    eventRipples: ripples,

    crossDomainSignals: d.crossDomainSignals ?? [],

    criticalAlerts: Math.max(0, criticalAlerts),
    warningAlerts: Math.max(0, warningAlerts),
    facilitiesAtRiskPct: Math.min(100, Math.max(0, facilitiesAtRiskPct)),

    avgComfortScore: Math.round(avgComfortScore * 10) / 10,
    avgOccupancyPct: Math.round(avgOccupancyPct * 10) / 10,
    totalMaintenanceCost,
    overdueMaintenanceCount: overdue.length,
    criticalComponentCount,
    nearestFailureDays,
    nearestFailureComponent,
    nearestFailureFacility,
    totalRevenuePerMonth,
    decliningRevenueCount,
    lowComfortFacilityCount,
    guestFacingWithLowComfort,
    autoWhatIfCount,
    severeRippleCount,
    facilityTypeDistribution: facilityTypeDistribution as Record<FacilityType, number>,
  };
}