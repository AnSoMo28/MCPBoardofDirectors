// src/features/facilities/config.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES INTELLIGENCE CONFIG — Castillo Country Club
//
// SOURCE OF TRUTH for:
//   - MCP server & tool names
//   - Data freshness tiers
//   - Facility type metadata (category, comfort weights, icons)
//   - Comfort, deterioration, occupancy, revenue thresholds
//   - Dashboard mode thresholds
//   - Advisor thresholds (all magic numbers centralized)
//   - Advisor rule metadata (FR1-FR15, 5 layers)
//   - Domain color mapping
//
// RULE: NEVER hardcode thresholds in engine/component code.
//       Import from here. This file is the single source of truth.
// ═══════════════════════════════════════════════════════════════

import type {
  FacilityType,
  CrowdLevel,
  FacilitiesDashboardMode,
} from "./types";

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — MCP SERVER & TOOLS
// Aligned 1:1 with useFacilitiesMCP.ts V1 (13 tools)
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_MCP_SERVER = "facility_management" as const;

export const FACILITIES_MCP_TOOLS = {
  // ── Query tools (9) ──
  MANAGE_FACILITIES: "manage_facilities",
  GET_FACILITY_OCCUPANCY: "get_facility_occupancy",
  GET_MAINTENANCE_SCHEDULE: "get_maintenance_schedule",
  MANAGE_INSPECTIONS: "manage_inspections",
  GET_FACILITY_RESERVATIONS: "get_facility_reservations",
  GET_FACILITY_ANALYTICS: "get_facility_analytics",
  GET_AMENITY_UTILIZATION: "get_amenity_utilization",
  GET_SPACE_OPTIMIZATION: "get_space_optimization",
  GET_FACILITY_HEALTH: "get_facility_health",

  // ── Mutation tools (4) ──
  SCHEDULE_MAINTENANCE: "schedule_maintenance",
  CREATE_FACILITY_RESERVATION: "create_facility_reservation",
  REPORT_FACILITY_ISSUE: "report_facility_issue",
  COORDINATE_EVENT_SETUP: "coordinate_event_setup",
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — DATA FRESHNESS TIERS
// Each MCP tool maps to a tier. Derived from V1 staleTimes.
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_FRESHNESS_TIERS = {
  LIVE: 30_000,              // 30s — reservations (real-time booking state)
  NEAR_REAL_TIME: 60_000,    // 1m  — occupancy, maintenance, utilization
  DASHBOARD: 120_000,        // 2m  — facilities list, inspections, health
  ENTITIES: 300_000,         // 5m  — analytics, optimization (expensive compute)
  HISTORICAL: 600_000,       // 10m — maintenance history, inspection logs
  STATIC: 3_600_000,         // 1h  — config-like data
} as const;

/** Map each MCP tool to its freshness tier. */
export const FACILITIES_TOOL_FRESHNESS: Record<
  string,
  number
> = {
  [FACILITIES_MCP_TOOLS.GET_FACILITY_RESERVATIONS]: FACILITIES_FRESHNESS_TIERS.LIVE,
  [FACILITIES_MCP_TOOLS.GET_FACILITY_OCCUPANCY]: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
  [FACILITIES_MCP_TOOLS.GET_MAINTENANCE_SCHEDULE]: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
  [FACILITIES_MCP_TOOLS.GET_AMENITY_UTILIZATION]: FACILITIES_FRESHNESS_TIERS.NEAR_REAL_TIME,
  [FACILITIES_MCP_TOOLS.MANAGE_FACILITIES]: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
  [FACILITIES_MCP_TOOLS.MANAGE_INSPECTIONS]: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
  [FACILITIES_MCP_TOOLS.GET_FACILITY_HEALTH]: FACILITIES_FRESHNESS_TIERS.DASHBOARD,
  [FACILITIES_MCP_TOOLS.GET_FACILITY_ANALYTICS]: FACILITIES_FRESHNESS_TIERS.ENTITIES,
  [FACILITIES_MCP_TOOLS.GET_SPACE_OPTIMIZATION]: FACILITIES_FRESHNESS_TIERS.ENTITIES,
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — FACILITY TYPE CONFIG
// 13 backend-aligned types with category, comfort weights, icon.
// ═══════════════════════════════════════════════════════════════

export type FacilityCategory =
  | "social"
  | "wellness"
  | "sport"
  | "service"
  | "admin";

export interface FacilityTypeMeta {
  label: string;
  icon: string;
  category: FacilityCategory;
  default_capacity: number;
  default_area_sqm: number;
  comfort_weight: {
    temperature: number;
    lighting: number;
    noise: number;
    air_quality: number;
    crowding: number;
  };
  peak_hours: string[];
  seasonal_factor: "summer_boost" | "winter_boost" | "stable";
}

export const FACILITY_TYPE_CONFIG: Record<FacilityType, FacilityTypeMeta> = {
  pool: {
    label: "Piscina",
    icon: "Waves",
    category: "wellness",
    default_capacity: 60,
    default_area_sqm: 800,
    comfort_weight: { temperature: 0.35, lighting: 0.15, noise: 0.10, air_quality: 0.15, crowding: 0.25 },
    peak_hours: ["10:00-14:00", "15:00-18:00"],
    seasonal_factor: "summer_boost",
  },
  gym: {
    label: "Gimnasio",
    icon: "Dumbbell",
    category: "wellness",
    default_capacity: 40,
    default_area_sqm: 500,
    comfort_weight: { temperature: 0.30, lighting: 0.15, noise: 0.25, air_quality: 0.20, crowding: 0.10 },
    peak_hours: ["06:00-09:00", "17:00-20:00"],
    seasonal_factor: "stable",
  },
  tennis_court: {
    label: "Cancha de Tenis",
    icon: "Trophy",
    category: "sport",
    default_capacity: 8,
    default_area_sqm: 670,
    comfort_weight: { temperature: 0.30, lighting: 0.25, noise: 0.10, air_quality: 0.15, crowding: 0.20 },
    peak_hours: ["07:00-10:00", "16:00-19:00"],
    seasonal_factor: "summer_boost",
  },
  squash_court: {
    label: "Cancha de Squash",
    icon: "Target",
    category: "sport",
    default_capacity: 4,
    default_area_sqm: 100,
    comfort_weight: { temperature: 0.35, lighting: 0.20, noise: 0.20, air_quality: 0.20, crowding: 0.05 },
    peak_hours: ["07:00-09:00", "17:00-19:00"],
    seasonal_factor: "stable",
  },
  golf_course: {
    label: "Campo de Golf",
    icon: "Flag",
    category: "sport",
    default_capacity: 40,
    default_area_sqm: 50_000,
    comfort_weight: { temperature: 0.20, lighting: 0.15, noise: 0.05, air_quality: 0.10, crowding: 0.50 },
    peak_hours: ["07:00-11:00", "14:00-17:00"],
    seasonal_factor: "summer_boost",
  },
  restaurant: {
    label: "Restaurante",
    icon: "UtensilsCrossed",
    category: "social",
    default_capacity: 80,
    default_area_sqm: 400,
    comfort_weight: { temperature: 0.25, lighting: 0.20, noise: 0.25, air_quality: 0.15, crowding: 0.15 },
    peak_hours: ["12:00-14:00", "19:00-22:00"],
    seasonal_factor: "stable",
  },
  lounge: {
    label: "Lounge",
    icon: "Wine",
    category: "social",
    default_capacity: 30,
    default_area_sqm: 200,
    comfort_weight: { temperature: 0.20, lighting: 0.25, noise: 0.25, air_quality: 0.10, crowding: 0.20 },
    peak_hours: ["18:00-23:00"],
    seasonal_factor: "stable",
  },
  ballroom: {
    label: "Salón de Eventos",
    icon: "Crown",
    category: "social",
    default_capacity: 150,
    default_area_sqm: 600,
    comfort_weight: { temperature: 0.25, lighting: 0.20, noise: 0.20, air_quality: 0.20, crowding: 0.15 },
    peak_hours: ["18:00-23:00"],
    seasonal_factor: "stable",
  },
  garden: {
    label: "Jardín",
    icon: "Flower2",
    category: "social",
    default_capacity: 100,
    default_area_sqm: 2_000,
    comfort_weight: { temperature: 0.15, lighting: 0.20, noise: 0.10, air_quality: 0.05, crowding: 0.50 },
    peak_hours: ["10:00-14:00", "16:00-20:00"],
    seasonal_factor: "summer_boost",
  },
  parking: {
    label: "Estacionamiento",
    icon: "Car",
    category: "service",
    default_capacity: 120,
    default_area_sqm: 3_000,
    comfort_weight: { temperature: 0.05, lighting: 0.20, noise: 0.05, air_quality: 0.05, crowding: 0.65 },
    peak_hours: ["11:00-14:00", "18:00-22:00"],
    seasonal_factor: "stable",
  },
  playground: {
    label: "Área de Juegos",
    icon: "Smile",
    category: "service",
    default_capacity: 25,
    default_area_sqm: 300,
    comfort_weight: { temperature: 0.20, lighting: 0.20, noise: 0.15, air_quality: 0.15, crowding: 0.30 },
    peak_hours: ["09:00-12:00", "15:00-18:00"],
    seasonal_factor: "summer_boost",
  },
  spa: {
    label: "Spa & Wellness",
    icon: "Sparkles",
    category: "wellness",
    default_capacity: 15,
    default_area_sqm: 250,
    comfort_weight: { temperature: 0.35, lighting: 0.20, noise: 0.25, air_quality: 0.15, crowding: 0.05 },
    peak_hours: ["10:00-14:00", "16:00-20:00"],
    seasonal_factor: "winter_boost",
  },
  kids_area: {
    label: "Área Infantil",
    icon: "Baby",
    category: "service",
    default_capacity: 20,
    default_area_sqm: 200,
    comfort_weight: { temperature: 0.25, lighting: 0.20, noise: 0.15, air_quality: 0.20, crowding: 0.20 },
    peak_hours: ["09:00-12:00", "14:00-17:00"],
    seasonal_factor: "summer_boost",
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — COMFORT THRESHOLDS
// §F5 + Prop 12: 5 technical dimensions + psychological.
// Weights are defaults; per-facility overrides from TYPE_CONFIG.
// ═══════════════════════════════════════════════════════════════

export const COMFORT_THRESHOLDS = {
  // Overall score bands
  EXCELLENT: 85,
  GOOD: 70,
  ACCEPTABLE: 55,
  POOR: 40,
  CRITICAL: 25,

  // Default dimension weights (sum = 1.0)
  // Per-facility overrides in FACILITY_TYPE_CONFIG.comfort_weight
  DEFAULT_WEIGHTS: {
    temperature: 0.30,
    lighting: 0.20,
    noise: 0.20,
    air_quality: 0.20,
    crowding: 0.10,
  },

  // Temperature (°C)
  TEMPERATURE: {
    OPTIMAL: 21,
    TOLERANCE: 2,
    ABSOLUTE_MIN: 16,
    ABSOLUTE_MAX: 30,
  },

  // CO2 (ppm) — air quality proxy
  CO2: {
    EXCELLENT: 600,
    GOOD: 800,
    ACCEPTABLE: 1000,
    POOR: 1500,
  },

  // Noise (dB)
  NOISE: {
    SILENT: 30,
    INTIMATE: 38,
    CONVERSATIONAL: 45,
    SOCIAL: 60,
    LOUD: 75,
  },

  // Lighting (lux)
  LIGHTING: {
    DIM: 100,
    WARM: 250,
    NATURAL: 400,
    BRIGHT: 600,
    INTENSE: 800,
  },

  // Psychological comfort (Prop 12) — perception gap threshold
  PSYCHOLOGICAL: {
    PERCEPTION_GAP_ALERT: 15,  // |technical - psychological| > 15 → flag
    PERCEPTION_GAP_CRITICAL: 25,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — DETERIORATION THRESHOLDS
// §F6 + §F4: Health curves, failure prediction, intervention windows.
// ═══════════════════════════════════════════════════════════════

export const DETERIORATION_THRESHOLDS = {
  // Health percentage bands
  HEALTH: {
    EXCELLENT: 90,
    GOOD: 75,
    ATTENTION: 60,
    WARNING: 40,
    CRITICAL: 20,
  },

  // Deterioration rate (% per month)
  RATE: {
    NORMAL: 1.5,
    ELEVATED: 3.0,
    ACCELERATED: 5.0,
    CRITICAL: 8.0,
  },

  // Intervention windows (days before failure)
  INTERVENTION_WINDOW_DAYS: {
    EARLY: 90,
    OPTIMAL: 60,
    URGENT: 30,
    EMERGENCY: 7,
  },

  // Monte Carlo simulation
  MONTE_CARLO: {
    ITERATIONS: 1000,
    CONFIDENCE_THRESHOLD: 0.70,
  },

  // Cost multipliers: reactive vs preventive
  COST_MULTIPLIER: {
    REACTIVE_BASE: 2.5,     // reactive costs 2.5x preventive on average
    EMERGENCY_MULTIPLIER: 4.0,
    CASCADE_MULTIPLIER: 1.5, // each cascade step adds 50%
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — OCCUPANCY & CROWD LEVELS
// §F3: Occupancy as Field Physics.
// ═══════════════════════════════════════════════════════════════

export const OCCUPANCY_THRESHOLDS = {
  // Crowd level boundaries (% of capacity)
  CROWD_LEVELS: {
    EMPTY_MAX: 10,
    QUIET_MAX: 30,
    NORMAL_MAX: 60,
    BUSY_MAX: 80,
    CROWDED_MAX: 95,
    // > 95 = overloaded
  },

  // Congestion risk thresholds
  CONGESTION: {
    LOW: 20,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90,
  },

  // Prediction confidence bands
  PREDICTION: {
    MIN_CONFIDENCE: 0.60,
    HIGH_CONFIDENCE: 0.80,
    DECAY_HALF_LIFE_HOURS: 2,     // exponential decay for time-series
    WEATHER_INDOOR_BOOST_PCT: 15, // rain → +15% indoor
    SUMMER_POOL_BOOST_PCT: 20,    // summer → +20% pool
    EVENT_SPIKE_BASE_PCT: 25,     // special event → +25% base
  },
} as const;

/** Map CrowdLevel to its percentage range boundary. */
export const CROWD_LEVEL_BOUNDARIES: Record<
  CrowdLevel,
  { min_pct: number; max_pct: number }
> = {
  empty:    { min_pct: 0,  max_pct: 10 },
  quiet:    { min_pct: 10, max_pct: 30 },
  normal:   { min_pct: 30, max_pct: 60 },
  busy:     { min_pct: 60, max_pct: 80 },
  crowded:  { min_pct: 80, max_pct: 95 },
  overloaded: { min_pct: 95, max_pct: 200 },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — MAINTENANCE THRESHOLDS
// §F8: Predictive maintenance scheduling.
// ═══════════════════════════════════════════════════════════════

export const MAINTENANCE_THRESHOLDS = {
  // Overdue detection
  OVERDUE_DAYS_ALERT: 3,
  OVERDUE_DAYS_CRITICAL: 14,

  // Cost spike detection (multiplier of average)
  COST_SPIKE_MULTIPLIER: 2.0,

  // Budget thresholds
  BUDGET_OVERRUN_WARNING_PCT: 15,
  BUDGET_OVERRUN_CRITICAL_PCT: 30,

  // Urgency score weights (for computeMaintenanceUrgency)
  URGENCY_WEIGHTS: {
    PRIORITY: { critical: 40, high: 30, medium: 20, low: 10 },
    TYPE: { emergency: 30, corrective: 20, renovation: 15, preventive: 10, cleaning: 5, inspection: 10 },
    OVERDUE_DAILY: 3,        // points per day overdue
    OVERDUE_CAP: 30,         // max overdue contribution
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — REVENUE THRESHOLDS
// §F7: Revenue optimization per space.
// ═══════════════════════════════════════════════════════════════

export const REVENUE_THRESHOLDS = {
  // Decline detection
  DECLINE_PCT_WARNING: 10,
  DECLINE_PCT_CRITICAL: 20,

  // Utilization vs revenue
  UTILIZATION_LOW_THRESHOLD: 30,    // below this → underutilized
  UTILIZATION_HIGH_THRESHOLD: 85,   // above this → overcrowding risk

  // ROI
  ROI_NEGATIVE_THRESHOLD: -10,      // below this → negative ROI alert
  ROI_EXCELLENT_THRESHOLD: 200,     // above this → excellent

  // Monte Carlo
  MONTE_CARLO_ITERATIONS: 1000,
  CONFIDENCE_BAND: {
    P10: 0.10,
    P25: 0.25,
    P50: 0.50,
    P75: 0.75,
    P90: 0.90,
  },

  // Demand elasticity defaults by facility category
  DEMAND_ELASTICITY: {
    social: -0.8,      // 10% price increase → 8% demand drop
    wellness: -0.5,    // less elastic (committed members)
    sport: -0.6,
    service: -0.3,     // least elastic (essential)
    admin: 0,          // not applicable
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — DASHBOARD MODE THRESHOLDS
// Ambient state: calm → alert → critical.
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_DASHBOARD_THRESHOLDS = {
  // Critical mode triggers
  CRITICAL_ALERTS_COUNT: 3,          // N+ critical alerts → critical mode
  FACILITIES_AT_RISK_PCT: 20,        // % facilities with health < 40 → critical

  // Alert mode triggers
  WARNING_ALERTS_COUNT: 5,           // N+ warning alerts → alert mode
  OVERDUE_MAINTENANCE_COUNT: 2,      // N+ overdue tasks → alert mode

  // Ambient intensity ranges
  INTENSITY: {
    CALM_MAX: 25,
    ALERT_MIN: 26,
    ALERT_MAX: 65,
    CRITICAL_MIN: 66,
  },

  // Pulse rates per mode
  PULSE_RATE: {
    calm: "dormant" as const,
    alert: "flowing" as const,
    critical: "critical" as const,
  },

  // Accent colors per mode
  ACCENT_COLOR: {
    calm: "var(--color-teal-400)",
    alert: "var(--color-amber-400)",
    critical: "var(--color-rose-400)",
  },
} as const;

/**
 * Derive dashboard mode from current system state.
 * Config-derived: uses thresholds above, never magic numbers.
 */
export function deriveFacilitiesDashboardMode(
  criticalAlerts: number,
  warningAlerts: number,
  facilitiesAtRiskPct: number,
): FacilitiesDashboardMode {
  const t = FACILITIES_DASHBOARD_THRESHOLDS;

  if (
    criticalAlerts >= t.CRITICAL_ALERTS_COUNT ||
    facilitiesAtRiskPct >= t.FACILITIES_AT_RISK_PCT
  ) {
    return "critical";
  }

  if (
    criticalAlerts >= 1 ||
    warningAlerts >= t.WARNING_ALERTS_COUNT
  ) {
    return "alert";
  }

  return "calm";
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — ADVISOR THRESHOLDS
// All magic numbers from useFacilitiesAdvisor.ts V1 centralized.
// 15 rules × 5 layers.
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_ADVISOR_THRESHOLDS = {
  // ── Occupancy rules (FR1, FR2) ──
  OCCUPANCY_LOW_THRESHOLD: 20,         // < 20% → underutilized alert
  OCCUPANCY_HIGH_THRESHOLD: 85,        // > 85% → overcrowding risk
  OCCUPANCY_CRITICAL_THRESHOLD: 95,    // > 95% → saturation emergency

  // ── Comfort rules (FR3, FR14) ──
  COMFORT_LOW_THRESHOLD: 55,           // < 55 → comfort alert
  COMFORT_CRITICAL_THRESHOLD: 35,      // < 35 → critical comfort failure
  COMFORT_CASCADE_THRESHOLD: 2,        // N+ facilities with comfort < 55 → cascade

  // ── Deterioration rules (FR4, FR10) ──
  HEALTH_LOW_THRESHOLD: 50,            // < 50% health → deterioration alert
  HEALTH_CRITICAL_THRESHOLD: 25,       // < 25% health → critical failure risk
  RATE_ACCELERATED_THRESHOLD: 5.0,     // > 5%/month → accelerated deterioration
  FAILURE_DAYS_WARNING: 30,            // failure within 30 days → urgent

  // ── Maintenance rules (FR5) ──
  MAINTENANCE_OVERDUE_DAYS: 3,         // > 3 days overdue → alert
  MAINTENANCE_COST_SPIKE_MULTIPLIER: 2.0, // cost > 2x avg → spike

  // ── Revenue rules (FR6, FR12) ──
  REVENUE_DECLINE_PCT: 15,             // > 15% decline → alert
  UTILIZATION_LOW_THRESHOLD: 30,       // < 30% → underutilized
  ROI_NEGATIVE_THRESHOLD: -10,         // < -10% → negative ROI

  // ── Space rules (FR7, FR8, FR13) ──
  SPACE_UNDERUTILIZED_DAYS: 30,        // < 30% for 30+ days → repurpose
  PERSONALITY_MISMATCH_THRESHOLD: 30,  // gap > 30 points → mismatch

  // ── Cross-domain rules (FR9, FR15) ──
  CROSS_DOMAIN_IMPACT_THRESHOLD: 15,   // impact > 15% → signal
  SATISFACTION_DROP_THRESHOLD: 10,     // > 10pt drop → alert

  // ── Budget rules (FR11) ──
  BUDGET_OVERRUN_PCT: 20,              // > 20% overrun → alert
  BUDGET_TRAJECTORY_MONTHS: 3,         // project 3 months ahead

  // ── Engagement score weights ──
  ENGAGEMENT_WEIGHTS: {
    utilization: 0.40,
    health: 0.30,
    reservation_activity: 0.20,
    inspection_compliance: 0.10,
  },

  // ── Seasonal detection (FR10) ──
  SEASONAL_TRANSITION_MONTHS: [2, 3, 10], // Mar, Apr, Nov (CR transitions)

  // ── Confidence thresholds ──
  CONFIDENCE_HIGH: 85,
  CONFIDENCE_MEDIUM: 70,
  CONFIDENCE_LOW: 55,

  // ── Budget defaults (used when backend config unavailable) ──
  MAINTENANCE_BUDGET_DEFAULT: 50_000_000, // ₡50M default annual maintenance budget
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 11 — ADVISOR RULE METADATA
// 15 rules in 5 layers, aligned with Cultural module pattern.
// Layer: health → engagement → strategy → prediction → innovation
// Severity calc: threshold | trend | range
// ═══════════════════════════════════════════════════════════════

export type FacilitiesAdvisorLayerType =
  | "health"
  | "engagement"
  | "strategy"
  | "prediction"
  | "innovation";

export type SeverityCalcMethod = "threshold" | "trend" | "range";

export interface FacilitiesAdvisorRuleMeta {
  id: string;
  name: string;
  layer: FacilitiesAdvisorLayerType;
  severity_calc: SeverityCalcMethod;
  description: string;
  threshold_key?: string;  // which FACILITIES_ADVISOR_THRESHOLDS key to use
}

export const FACILITIES_ADVISOR_RULES: Record<
  string,
  FacilitiesAdvisorRuleMeta
> = {
  FR1: {
    id: "FR1",
    name: "Low Occupancy Alert",
    layer: "health",
    severity_calc: "threshold",
    description: "Facility occupancy drops below threshold — underutilization risk",
    threshold_key: "OCCUPANCY_LOW_THRESHOLD",
  },
  FR2: {
    id: "FR2",
    name: "Overcrowding Alert",
    layer: "health",
    severity_calc: "threshold",
    description: "Facility occupancy exceeds threshold — saturation and comfort risk",
    threshold_key: "OCCUPANCY_HIGH_THRESHOLD",
  },
  FR3: {
    id: "FR3",
    name: "Comfort Degradation",
    layer: "health",
    severity_calc: "threshold",
    description: "Comfort score drops below acceptable — member experience at risk",
    threshold_key: "COMFORT_LOW_THRESHOLD",
  },
  FR4: {
    id: "FR4",
    name: "Component Deterioration",
    layer: "health",
    severity_calc: "threshold",
    description: "Facility component health critical — failure predicted",
    threshold_key: "HEALTH_LOW_THRESHOLD",
  },
  FR5: {
    id: "FR5",
    name: "Maintenance Overdue",
    layer: "engagement",
    severity_calc: "threshold",
    description: "Scheduled maintenance tasks past deadline",
    threshold_key: "MAINTENANCE_OVERDUE_DAYS",
  },
  FR6: {
    id: "FR6",
    name: "Revenue Decline",
    layer: "strategy",
    severity_calc: "trend",
    description: "Facility revenue declining vs baseline period",
    threshold_key: "REVENUE_DECLINE_PCT",
  },
  FR7: {
    id: "FR7",
    name: "Space Underutilization",
    layer: "strategy",
    severity_calc: "threshold",
    description: "Space consistently underutilized — repurpose candidate",
    threshold_key: "SPACE_UNDERUTILIZED_DAYS",
  },
  FR8: {
    id: "FR8",
    name: "Personality Mismatch",
    layer: "strategy",
    severity_calc: "range",
    description: "Facility actual use diverges from designed purpose",
    threshold_key: "PERSONALITY_MISMATCH_THRESHOLD",
  },
  FR9: {
    id: "FR9",
    name: "Cross-Domain Impact",
    layer: "prediction",
    severity_calc: "threshold",
    description: "Facility state impacts other domains (cultural, financial, engagement)",
    threshold_key: "CROSS_DOMAIN_IMPACT_THRESHOLD",
  },
  FR10: {
    id: "FR10",
    name: "Failure Prediction",
    layer: "prediction",
    severity_calc: "trend",
    description: "Component failure predicted within warning window",
    threshold_key: "FAILURE_DAYS_WARNING",
  },
  FR11: {
    id: "FR11",
    name: "Budget Trajectory",
    layer: "prediction",
    severity_calc: "trend",
    description: "Maintenance budget trajectory exceeds planned allocation",
    threshold_key: "BUDGET_OVERRUN_PCT",
  },
  FR12: {
    id: "FR12",
    name: "Hidden Revenue Opportunity",
    layer: "innovation",
    severity_calc: "range",
    description: "System-detected revenue opportunity not being captured",
    threshold_key: "ROI_NEGATIVE_THRESHOLD",
  },
  FR13: {
    id: "FR13",
    name: "Spatial Optimization",
    layer: "innovation",
    severity_calc: "range",
    description: "Spatial graph analysis reveals layout or flow optimization",
  },
  FR14: {
    id: "FR14",
    name: "Comfort Cascade Risk",
    layer: "health",
    severity_calc: "threshold",
    description: "Multiple facilities with degraded comfort — systemic issue",
    threshold_key: "COMFORT_CASCADE_THRESHOLD",
  },
  FR15: {
    id: "FR15",
    name: "Guest Journey Impact",
    layer: "engagement",
    severity_calc: "range",
    description: "Facility state negatively affects guest conversion journey",
    threshold_key: "SATISFACTION_DROP_THRESHOLD",
  },
};

/** Ordered rule IDs for deterministic execution. */
export const FACILITIES_ADVISOR_RULE_ORDER = [
  "FR1", "FR2", "FR3", "FR4", "FR14",  // health
  "FR5", "FR15",                         // engagement
  "FR6", "FR7", "FR8",                   // strategy
  "FR9", "FR10", "FR11",                 // prediction
  "FR12", "FR13",                        // innovation
] as const;

/** Group rules by layer for layer-scoped evaluation. */
export const FACILITIES_ADVISOR_RULES_BY_LAYER: Record<
  FacilitiesAdvisorLayerType,
  string[]
> = {
  health: ["FR1", "FR2", "FR3", "FR4", "FR14"],
  engagement: ["FR5", "FR15"],
  strategy: ["FR6", "FR7", "FR8"],
  prediction: ["FR9", "FR10", "FR11"],
  innovation: ["FR12", "FR13"],
};

// ═══════════════════════════════════════════════════════════════
// SECTION 12 — DOMAIN COLORS
// Facility category → Silver Tide color token.
// Used by components for data-* attributes.
// ═══════════════════════════════════════════════════════════════

export const FACILITY_CATEGORY_COLORS: Record<
  FacilityCategory,
  { color: string; bgColor: string; label: string }
> = {
  social: {
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
    label: "Social",
  },
  wellness: {
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    label: "Bienestar",
  },
  sport: {
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
    label: "Deportes",
  },
  service: {
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
    label: "Servicios",
  },
  admin: {
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    label: "Admin",
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 13 — ACTION DEFINITIONS (ADVISOR COMMANDS)
// Config-derived actions for advisor insights.
// Replaces inline ACTIONS object from useFacilitiesAdvisor V1.
// ═══════════════════════════════════════════════════════════════

import type { AdvisorCommand } from "@/shared/types/ai-intelligence";

export function buildAdvisorCommand(
  actionType: "maint-schedule" | "issue-report" | "inspection-create" | "facility-update",
  params: Record<string, unknown>,
): AdvisorCommand {
  const server = FACILITIES_MCP_SERVER;

  switch (actionType) {
    case "maint-schedule":
      return {
        action: actionType,
        type: "mutate",
        server,
        tool: FACILITIES_MCP_TOOLS.SCHEDULE_MAINTENANCE,
        params,
        approval_level: "hitl",
        label: "Programar mantenimiento",
        confirm_message: "Se programará una tarea de mantenimiento que requiere aprobación.",
        estimated_impact: "Prevención de cierre temporal y daños mayores",
        risk_summary: "Posible cierre temporal de la instalación durante el mantenimiento",
      };
    case "issue-report":
      return {
        action: actionType,
        type: "mutate",
        server,
        tool: FACILITIES_MCP_TOOLS.REPORT_FACILITY_ISSUE,
        params,
        approval_level: "auto",
        label: "Reportar problema",
        confirm_message: "Se creará una tarea de mantenimiento correctivo.",
        estimated_impact: "Resolución proactiva antes de que escale",
        risk_summary: "Sin riesgo — crea tarea de mantenimiento correctivo",
      };
    case "inspection-create":
      return {
        action: actionType,
        type: "mutate",
        server,
        tool: FACILITIES_MCP_TOOLS.MANAGE_INSPECTIONS,
        params: { action: "create", ...params },
        approval_level: "auto",
        label: "Registrar inspección",
        confirm_message: "Se registrará una nueva inspección.",
        estimated_impact: "Cumplimiento normativo actualizado",
        risk_summary: "Sin riesgo — solo registro",
      };
    case "facility-update":
      return {
        action: actionType,
        type: "mutate",
        server,
        tool: FACILITIES_MCP_TOOLS.MANAGE_FACILITIES,
        params: { action: "update_status", ...params },
        approval_level: "auto",
        label: "Actualizar estado",
        confirm_message: "Se actualizará el estado de la instalación.",
        estimated_impact: "Reflejar estado real en el sistema",
        risk_summary: "Sin riesgo — actualización de estado",
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 14 — CROSS-DOMAIN FUSION CONFIG
// Prop 8 + Prop 13: Temporal resonance, ripple effect detection.
// ═══════════════════════════════════════════════════════════════

export const CROSS_DOMAIN_CONFIG = {
  // Ripple effect detection
  RIPPLE_MAX_DURATION_HOURS: 168,       // trace effects up to 7 days
  RIPPLE_MIN_MAGNITUDE: 5,              // ignore effects < 5% impact
  RIPPLE_CASCADE_SEVERITY_THRESHOLD: 50, // above this → cascade alert

  // Hidden cost detection
  HIDDEN_COST_RATIO_ALERT: 0.15,        // hidden costs > 15% of revenue → flag
  WEAR_ACCELERATION_ALERT_DAYS: 7,      // > 7 days extra wear → flag

  // Domain signal mapping
  AFFECTED_DOMAINS: [
    "cultural",
    "financial",
    "engagement",
    "guest",
    "sports",
    "membership",
  ] as const,

  // Resonance pattern detection
  PATTERN_MIN_OBSERVATIONS: 3,          // need 3+ occurrences to detect pattern
  PATTERN_CONFIDENCE_THRESHOLD: 0.70,
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 15 — WHAT-IF PLANNER CONFIG
// Prop 10: Proactive scenario design.
// ═══════════════════════════════════════════════════════════════

export const WHAT_IF_CONFIG = {
  // Auto-detection triggers
  AUTO_DETECT_HEALTH_THRESHOLD: 40,     // health < 40% → auto-generate renovation scenario
  AUTO_DETECT_OCCUPANCY_GAP: 50,        // occupancy < 50% for 30+ days → repurpose scenario
  AUTO_DETECT_REVENUE_DECLINE: 20,      // revenue -20% → auto-generate optimization

  // Scenario simulation
  SIMULATION_DURATION_WEEKS: 12,        // project 12 weeks ahead
  MONTE_CARLO_ITERATIONS: 1000,

  // Mitigation
  MAX_MITIGATION_ACTIONS: 5,
  MITIGATION_RECOVERY_TARGET: 0.80,     // target 80% recovery
} as const;

// ═══════════════════════════════════════════════════════════════
// SECTION 16 — SPATIAL STORYTELLING CONFIG
// Prop 9: Temporal graph animation.
// ═══════════════════════════════════════════════════════════════

export const SPATIAL_STORY_CONFIG = {
  // Timeline resolution options
  RESOLUTIONS: ["hourly", "3h_blocks", "daily"] as const,
  DEFAULT_RESOLUTION: "hourly" as const,

  // Energy level thresholds (0-100)
  ENERGY: {
    DORMANT: 15,
    QUIET: 35,
    ACTIVE: 60,
    VIBRANT: 80,
    PEAK: 95,
  },

  // Flow pattern detection
  FLOW_MIN_VOLUME: 5,                   // minimum people to detect flow
  FLOW_MIN_CORRELATION: 0.4,            // minimum co-occurrence correlation
  FLOW_STRONG_CORRELATION: 0.7,         // strong flow threshold

  // Animation timing (ms)
  FRAME_TRANSITION_DURATION: 800,
  NARRATIVE_DISPLAY_DURATION: 5000,
} as const;