// src/features/facilities/lib/advisor/types.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — Type Definitions
//
// 5 layers aligned with Cultural module pattern:
//   health → engagement → strategy → prediction → innovation
//
// 15 rules (FR1-FR15) evaluate facilities data and produce
// actionable insights with commands for the operator.
// ═══════════════════════════════════════════════════════════════

import { type ReactNode } from "react";
import type {
  FacilitiesAdvisorInsight,
  FacilitiesAdvisorLayer,
  FacilitiesAdvisorSeverity,
} from "../../types";
// ═══════════════════════════════════════════════════════════════
// RULE FUNCTION SIGNATURE
//
// Each rule is a pure function that receives the current
// facilities data and returns either an insight or null.
// Null = rule conditions not met → no insight produced.
// ═══════════════════════════════════════════════════════════════

/** Input data available to all advisor rules. */
export interface FacilitiesAdvisorInput {
  // Backend data
  facilities: import("../../types").Facility[];
  maintenance: import("../../types").MaintenanceTask[];
  reservations: import("../../types").FacilityReservation[];
  inspections: import("../../types").Inspection[];
  analytics: import("../../types").FacilityAnalyticsResponse | null;
  utilization: import("../../types").AmenityUtilizationResponse | null;
  health: import("../../types").FacilityHealthResponse | null;
  optimization: import("../../types").SpaceOptimizationResponse | null;

  // Intelligence layer (from engines)
  comfortScores: Record<string, import("../../types").ComfortScore>;
  occupancyPredictions: Record<string, import("../../types").OccupancyPrediction>;
  deteriorationModels: Record<string, import("../../types").DeteriorationModel>;
  revenueModels: Record<string, import("../../types").RevenueModel>;
  whatIfScenarios: import("../../types").WhatIfScenario[];
  eventRipples: import("../../types").EventRipple[];

  // Computed aggregates
  criticalAlerts: number;
  warningAlerts: number;
  facilitiesAtRiskPct: number;
}

/** A rule function: receives data, returns insight or null. */
export type FacilitiesRuleFn = (
  input: FacilitiesAdvisorInput,
) => FacilitiesAdvisorInsight | null;

/** Layer metadata for UI rendering. */
export interface FacilitiesAdvisorLayerMeta {
  icon: ReactNode;
  id: FacilitiesAdvisorLayer;
  label: string;
  description: string;
  sortOrder: number;
  color: string;
}

/** Severity metadata for UI rendering. */
export interface FacilitiesAdvisorSeverityMeta {
  id: FacilitiesAdvisorSeverity;
  label: string;
  sortOrder: number;
  color: string;
  icon: string;
}

// ═══════════════════════════════════════════════════════════════
// LAYER METADATA — 5 layers
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_ADVISOR_LAYER_META: Record<
  FacilitiesAdvisorLayer,
  FacilitiesAdvisorLayerMeta
> = {
  health: {
    id: "health",
    label: "Salud",
    description: "Estado físico de las instalaciones y confort",
    sortOrder: 0,
    color: "var(--color-emerald-400)",
    icon: "HeartPulse",
  },
  engagement: {
    id: "engagement",
    label: "Engagement",
    description: "Mantenimiento, inspecciones e impacto en socios",
    sortOrder: 1,
    color: "var(--color-teal-400)",
    icon: "Users",
  },
  strategy: {
    id: "strategy",
    label: "Estrategia",
    description: "Revenue, utilización y posicionamiento de espacios",
    sortOrder: 2,
    color: "var(--color-gold-400)",
    icon: "Compass",
  },
  prediction: {
    id: "prediction",
    label: "Predicción",
    description: "Fallas, presupuesto y efectos cross-domain",
    sortOrder: 3,
    color: "var(--color-amber-400)",
    icon: "Activity",
  },
  innovation: {
    id: "innovation",
    label: "Innovación",
    description: "Oportunidades ocultas y optimización espacial",
    sortOrder: 4,
    color: "var(--color-rose-300)",
    icon: "Sparkles",
  },
};

// ═══════════════════════════════════════════════════════════════
// SEVERITY METADATA — 4 levels
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_ADVISOR_SEVERITY_META: Record<
  FacilitiesAdvisorSeverity,
  FacilitiesAdvisorSeverityMeta
> = {
  critical: {
    id: "critical",
    label: "Crítico",
    sortOrder: 0,
    color: "var(--color-rose-400)",
    icon: "AlertTriangle",
  },
  warning: {
    id: "warning",
    label: "Advertencia",
    sortOrder: 1,
    color: "var(--color-amber-400)",
    icon: "AlertCircle",
  },
  info: {
    id: "info",
    label: "Info",
    sortOrder: 2,
    color: "var(--color-teal-400)",
    icon: "Info",
  },
  opportunity: {
    id: "opportunity",
    label: "Oportunidad",
    sortOrder: 3,
    color: "var(--color-emerald-400)",
    icon: "Lightbulb",
  },
};

