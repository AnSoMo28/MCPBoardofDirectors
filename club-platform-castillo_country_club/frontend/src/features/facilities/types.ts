// src/features/facilities/types.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES DOMAIN TYPES — Castillo Country Club
//
// SOURCE OF TRUTH for facility management domain.
// Backend alignment: 1:1 with models/facility_management.py
//
// RULES:
//   1. Cross-domain enums → imported from domain-enums.ts
//   2. AI base types → imported from ai-intelligence.ts
//   3. Domain-specific enums → defined here
//   4. NEVER hardcode colors — use Silver Tide tokens
//   5. NEVER re-define shared enums
//
// V2: Living Spaces Intelligence — Phase 32
// Sections 1-9: Backend-aligned domain types (PRESERVED)
// Sections 10-22: Spatial Intelligence types (NEW)
// ═══════════════════════════════════════════════════════════════

import type {
  DisplayConfig,
  TrendDirection
} from "@/shared/types/domain-enums";
// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS — Shared types consumed by facilities engines
// ═══════════════════════════════════════════════════════════════
export type { TrendDirection, SeverityLevel, DisplayConfig } from "@/shared/types/domain-enums";
export { TREND_DISPLAY, SEVERITY_DISPLAY } from "@/shared/types/domain-enums";
export type { AdvisorInsightBase, AdvisorCommand, AIHealthScore, AIFactor } from "@/shared/types/ai-intelligence";
import type {
  AdvisorInsightBase
} from "@/shared/types/ai-intelligence";
import { type ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — DOMAIN-SPECIFIC ENUMS
// Aligned 1:1 with backend models/facility_management.py
// ═══════════════════════════════════════════════════════════════

export const FACILITY_TYPES = [
  "pool", "gym", "tennis_court", "squash_court", "golf_course",
  "restaurant", "lounge", "ballroom", "garden", "parking",
  "playground", "spa", "kids_area",
] as const;
export type FacilityType = typeof FACILITY_TYPES[number];

export const FACILITY_STATUSES = [
  "operational", "maintenance", "closed", "reserved", "renovation",
] as const;
export type FacilityStatus = typeof FACILITY_STATUSES[number];

export const MAINTENANCE_TYPES = [
  "preventive", "corrective", "emergency", "renovation", "cleaning", "inspection",
] as const;
export type MaintenanceType = typeof MAINTENANCE_TYPES[number];
// Cerca de los otros types de mantenimiento
export interface MaintenancePrediction {
  priority_actions: MaintenancePriorityAction[];
}
export const MAINTENANCE_STATUSES = [
  "scheduled", "in_progress", "completed", "cancelled", "on_hold",
] as const;
export type MaintenanceStatus = typeof MAINTENANCE_STATUSES[number];

export const MAINTENANCE_PRIORITIES = [
  "low", "medium", "high", "critical",
] as const;
export type MaintenancePriority = typeof MAINTENANCE_PRIORITIES[number];

export const SETUP_STATUSES = [
  "requested", "planned", "in_progress", "completed", "cancelled",
] as const;
export type SetupStatus = typeof SETUP_STATUSES[number];

export const INSPECTION_RESULTS = [
  "pass", "minor_issues", "major_issues", "fail",
] as const;
export type InspectionResult = typeof INSPECTION_RESULTS[number];

export const RESERVATION_STATUSES = [
  "pending", "confirmed", "cancelled", "completed", "no_show",
] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

// ── §F4: Crowd Level (Occupancy Field Physics) ────────────────

export const CROWD_LEVELS = [
  "empty", "quiet", "normal", "busy", "crowded", "overloaded",
] as const;
export type CrowdLevel = typeof CROWD_LEVELS[number];

// ── §F5: Comfort Status ────────────────────────────────────────

export const COMFORT_STATUSES = [
  "optimal", "acceptable", "suboptimal", "poor",
] as const;
export type ComfortStatus = typeof COMFORT_STATUSES[number];

// ── §F6: Health Status ─────────────────────────────────────────

export const HEALTH_STATUSES = [
  "healthy", "attention", "warning", "critical",
] as const;
export type HealthStatus = typeof HEALTH_STATUSES[number];

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — DISPLAY CONFIGS
// All colors use Silver Tide tokens. NEVER hardcode.
// ═══════════════════════════════════════════════════════════════

export const FACILITY_TYPE_DISPLAY: Record<
  FacilityType,
  DisplayConfig & { icon: string }
> = {
  pool: {
    label: "Piscina", icon: "Waves",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  gym: {
    label: "Gimnasio", icon: "Dumbbell",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
  },
  tennis_court: {
    label: "Cancha de Tenis", icon: "Trophy",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  squash_court: {
    label: "Cancha de Squash", icon: "Target",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
  },
  golf_course: {
    label: "Campo de Golf", icon: "Flag",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  restaurant: {
    label: "Restaurante", icon: "UtensilsCrossed",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  lounge: {
    label: "Lounge", icon: "Wine",
    color: "var(--color-gold-300)",
    bgColor: "color-mix(in srgb, var(--color-gold-300) 12%, transparent)",
  },
  ballroom: {
    label: "Salón de Eventos", icon: "Crown",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 14%, transparent)",
  },
  garden: {
    label: "Jardín", icon: "Flower2",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
  },
  parking: {
    label: "Estacionamiento", icon: "Car",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  playground: {
    label: "Área de Juegos", icon: "Smile",
    color: "var(--color-teal-300)",
    bgColor: "color-mix(in srgb, var(--color-teal-300) 12%, transparent)",
  },
  spa: {
    label: "Spa & Wellness", icon: "Sparkles",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
  },
  kids_area: {
    label: "Área Infantil", icon: "Baby",
    color: "var(--color-sage-300)",
    bgColor: "color-mix(in srgb, var(--color-sage-300) 12%, transparent)",
  },
};

export const FACILITY_STATUS_DISPLAY: Record<FacilityStatus, DisplayConfig & { icon: string }> = {
  operational: {
    label: "Operativo", icon: "CheckCircle2",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  maintenance: {
    label: "Mantenimiento", icon: "Wrench",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  closed: {
    label: "Cerrado", icon: "XCircle",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  reserved: {
    label: "Reservado", icon: "Calendar",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  renovation: {
    label: "Renovación", icon: "Hammer",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
};

/** Response shape for manage_facilities action:"list". Aligned with ManageFacilities_Contract. */
export interface FacilityListResponse {
  status: string;
  message?: string;
  facilities: Facility[];
}

export const MAINTENANCE_TYPE_DISPLAY: Record<MaintenanceType, DisplayConfig> = {
  preventive: {
    label: "Preventivo",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  corrective: {
    label: "Correctivo",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  emergency: {
    label: "Emergencia",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  renovation: {
    label: "Renovación",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 10%, transparent)",
  },
  cleaning: {
    label: "Limpieza",
    color: "var(--color-silver-300)",
    bgColor: "color-mix(in srgb, var(--color-silver-300) 10%, transparent)",
  },
  inspection: {
    label: "Inspección",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
};

export const MAINTENANCE_STATUS_DISPLAY: Record<MaintenanceStatus, DisplayConfig> = {
  scheduled: {
    label: "Programado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  in_progress: {
    label: "En progreso",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  completed: {
    label: "Completado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  on_hold: {
    label: "En espera",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

export const MAINTENANCE_PRIORITY_DISPLAY: Record<
  MaintenancePriority,
  DisplayConfig & { sortOrder: number }
> = {
  critical: {
    label: "Crítico", sortOrder: 0,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
  },
  high: {
    label: "Alto", sortOrder: 1,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  medium: {
    label: "Medio", sortOrder: 2,
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  low: {
    label: "Bajo", sortOrder: 3,
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
};

export const SETUP_STATUS_DISPLAY: Record<SetupStatus, DisplayConfig> = {
  requested: {
    label: "Solicitado",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
  },
  planned: {
    label: "Planificado",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  in_progress: {
    label: "En curso",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  completed: {
    label: "Completado",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
};

export const INSPECTION_RESULT_DISPLAY: Record<
  InspectionResult,
  DisplayConfig & { sortOrder: number }
> = {
  pass: {
    label: "Aprobado", sortOrder: 0,
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  minor_issues: {
    label: "Issues menores", sortOrder: 1,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  major_issues: {
    label: "Issues mayores", sortOrder: 2,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  fail: {
    label: "Falla", sortOrder: 3,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 15%, transparent)",
  },
};

export const RESERVATION_STATUS_DISPLAY: Record<ReservationStatus, DisplayConfig> = {
  pending: {
    label: "Pendiente",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
  },
  confirmed: {
    label: "Confirmada",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
  },
  cancelled: {
    label: "Cancelada",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 10%, transparent)",
  },
  completed: {
    label: "Completada",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
  },
  no_show: {
    label: "No asistió",
    color: "var(--color-silver-500)",
    bgColor: "color-mix(in srgb, var(--color-silver-500) 10%, transparent)",
  },
};

// ── §F4: Crowd Level Display ──────────────────────────────────

export const CROWD_LEVEL_DISPLAY: Record<
  CrowdLevel,
  DisplayConfig & { icon: string; sortOrder: number; action: string }
> = {
  empty: {
    label: "Vacío", icon: "Circle", sortOrder: 0,
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 10%, transparent)",
    action: "Oportunidad de uso",
  },
  quiet: {
    label: "Tranquilo", icon: "CircleDot", sortOrder: 1,
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    action: "Capacidad disponible",
  },
  normal: {
    label: "Normal", icon: "CheckCircle2", sortOrder: 2,
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    action: "Óptimo",
  },
  busy: {
    label: "Ocupado", icon: "Zap", sortOrder: 3,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    action: "Monitorear",
  },
  crowded: {
    label: "Lleno", icon: "AlertTriangle", sortOrder: 4,
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 14%, transparent)",
    action: "Redistribuir flujo",
  },
  overloaded: {
    label: "Saturado", icon: "AlertCircle", sortOrder: 5,
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 14%, transparent)",
    action: "Intervención inmediata",
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — ENTITY INTERFACES
// Aligned 1:1 with backend Pydantic models
// ═══════════════════════════════════════════════════════════════

export interface Facility {
  id: string;
  name: string;
  facility_type: FacilityType;
  status: FacilityStatus;
  location: string;
  capacity: number;
  description: string;
  amenities: string[];
  opening_time: string;
  closing_time: string;
  responsible_member_id: string;
  base_rate: number;
  notes: string | null;
}

export interface MaintenanceTask {
  id: string;
  facility_id: string;
  facility_name: string;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  description: string;
  scheduled_date: string;
  scheduled_time: string;
  estimated_duration_hours: number;
  assigned_to: string;
  cost: number;
  completed_at: string | null;
  notes: string | null;
}

export interface EventSetup {
  id: string;
  event_id: string;
  event_name: string;
  facility_id: string;
  facility_name: string;
  status: SetupStatus;
  setup_date: string;
  setup_time: string;
  event_start: string;
  event_end: string;
  requirements: string[];
  assigned_to: string;
  coordinator_member_id: string;
  notes: string | null;
}

export interface Inspection {
  id: string;
  facility_id: string;
  facility_name: string;
  result: InspectionResult;
  inspector_member_id: string;
  inspection_date: string;
  findings: string;
  corrective_actions: string[];
  next_inspection_date: string | null;
  notes: string | null;
}

export interface FacilityReservation {
  id: string;
  facility_id: string;
  facility_name: string;
  family_id: string;
  family_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  guest_count: number;
  purpose: string;
  notes: string | null;
  created_by: string;
  created_at: string | null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — ANALYTICS INTERFACES
// Aligned 1:1 with backend response models
// ═══════════════════════════════════════════════════════════════

export interface CrossDomainSignal {
  confidence: number;
  domain: string;
  signal: string;
  impact: string;
  severity: string;
}

export interface AnalyticsDimension {
  dimension_id: string;
  name: string;
  score: number;
  status: string;
  findings: string[];
  recommendations: string[];
  data: Record<string, unknown>;
}

export interface FacilityAnalyticsResponse {
  overall_score: number;
  overall_grade: string;
  overall_level: string;
  trend: TrendDirection;
  dimensions: AnalyticsDimension[];
  cross_domain_signals: CrossDomainSignal[];
  generated_at: string;
}

export interface AmenityUtilizationItem {
  name: string;
  facility_id: string;
  facility_name: string;
  facility_type: string;
  status: string;
  current_occupancy: number;
  capacity: number;
  utilization_pct: number;
  peak_hours: string[];
  trend: TrendDirection;
  forecast_pct: number;
  time_series: Array<{ date: string; utilization: number; reservations: number }>;
  base_rate: number;
  estimated_monthly_revenue: number;
}

export interface AmenityUtilizationResponse {
  overall_utilization_pct: number;
  facilities: AmenityUtilizationItem[];
  total_capacity: number;
  total_occupancy: number;
  peak_facility: string;
  lowest_facility: string;
  generated_at: string;
}

export interface SpaceOptimizationSuggestion {
  facility_id: string;
  facility_name: string;
  suggestion_type: string;
  current_use: string;
  suggested_use: string;
  estimated_impact: string;
  priority: string;
  roi_estimate: string | null;
}

export interface SpaceOptimizationResponse {
  suggestions: SpaceOptimizationSuggestion[];
  underutilized_count: number;
  overutilized_count: number;
  total_potential_savings: number;
  generated_at: string;
}

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
  contribution: number;
}

export interface FacilityHealthResponse {
  score: number;
  grade: string;
  level: string;
  trend: TrendDirection;
  factors: HealthFactor[];
  alerts: string[];
  generated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — ADVISOR TYPES
// 5 layers aligned with Cultural module pattern:
//   health → engagement → strategy → prediction → innovation
// ═══════════════════════════════════════════════════════════════

export type FacilitiesAdvisorLayer =
  | "health"
  | "engagement"
  | "strategy"
  | "prediction"
  | "innovation";

export type FacilitiesAdvisorSeverity = "critical" | "warning" | "info" | "opportunity";

export interface FacilitiesAdvisorInsight extends AdvisorInsightBase {
  actionable: any;
  threshold: undefined;
  command: any;
  layer: FacilitiesAdvisorLayer;
  domain: "facilities";
  severity: FacilitiesAdvisorSeverity;
}

export interface FacilitiesAdvisorResult {
  insights: FacilitiesAdvisorInsight[];
  healthScore: number;
  engagementScore: number;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — FRONTEND-ONLY TYPES
// Calendar grid rendering, UI helpers
// ═══════════════════════════════════════════════════════════════

export interface TimeSlot {
  hour: number;
  label: string;
  available: boolean;
  reservation?: FacilityReservation;
}

export interface DaySchedule {
  date: string;
  dayLabel: string;
  slots: TimeSlot[];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — TRANSFORM HELPERS
// Convert backend data → UI-ready shapes
// ═══════════════════════════════════════════════════════════════

export interface FacilityKPI {
  label: string;
  value: string | number;
  sub: string;
  color: string;
  trend?: TrendDirection;
}

export function healthToKPIs(health: FacilityHealthResponse): FacilityKPI[] {
  return [
    {
      label: "Health Score",
      value: health.score,
      sub: `${health.grade} — ${health.level}`,
      color: health.score >= 70
        ? "var(--color-emerald-400)"
        : health.score >= 50
          ? "var(--color-amber-400)"
          : "var(--color-rose-400)",
      trend: health.trend,
    },
    ...health.factors.map((f) => ({
      label: f.name,
      value: f.score,
      sub: `${Math.round(f.contribution)} pts · ${Math.round(f.weight * 100)}%`,
      color: f.score >= 70
        ? "var(--color-emerald-400)"
        : f.score >= 50
          ? "var(--color-amber-400)"
          : "var(--color-rose-400)",
    })),
  ];
}

export function utilizationToKPIs(util: AmenityUtilizationResponse): FacilityKPI[] {
  return [
    {
      label: "Utilización Prom.",
      value: `${util.overall_utilization_pct.toFixed(1)}%`,
      sub: `${util.total_occupancy} / ${util.total_capacity} capacidad`,
      color: util.overall_utilization_pct >= 70
        ? "var(--color-amber-400)"
        : util.overall_utilization_pct >= 40
          ? "var(--color-teal-400)"
          : "var(--color-emerald-400)",
    },
    {
      label: "Más usado",
      value: util.peak_facility || "—",
      sub: "Demanda más alta",
      color: "var(--color-gold-400)",
    },
    {
      label: "Menos usado",
      value: util.lowest_facility || "—",
      sub: "Oportunidad de optimización",
      color: "var(--color-silver-400)",
    },
  ];
}

export function maintenanceToKPIs(tasks: MaintenanceTask[]): FacilityKPI[] {
  const today = new Date().toISOString().split("T")[0];
  const overdue = tasks.filter(
    (t) => t.status === "scheduled" && t.scheduled_date < today,
  );
  const active = tasks.filter((t) => t.status === "in_progress");
  const totalCost = tasks.reduce((s, t) => s + t.cost, 0);

  return [
    {
      label: "Atrasadas",
      value: overdue.length,
      sub: overdue.length > 0 ? "Requieren atención" : "Al día",
      color: overdue.length > 0
        ? "var(--color-rose-400)"
        : "var(--color-emerald-400)",
    },
    {
      label: "En progreso",
      value: active.length,
      sub: "Activas ahora",
      color: active.length > 0
        ? "var(--color-amber-400)"
        : "var(--color-silver-400)",
    },
    {
      label: "Costo total",
      value: `₡${(totalCost / 1_000_000).toFixed(1)}M`,
      sub: "Mantenimiento pendiente",
      color: "var(--color-gold-400)",
    },
  ];
}

export function reservationsToKPIs(reservations: FacilityReservation[]): FacilityKPI[] {
  const confirmed = reservations.filter((r) => r.status === "confirmed");
  const pending = reservations.filter((r) => r.status === "pending");
  const totalGuests = reservations.reduce((s, r) => s + r.guest_count, 0);

  return [
    {
      label: "Confirmadas",
      value: confirmed.length,
      sub: `${totalGuests} personas total`,
      color: "var(--color-emerald-400)",
    },
    {
      label: "Pendientes",
      value: pending.length,
      sub: "Esperan aprobación",
      color: pending.length > 0
        ? "var(--color-amber-400)"
        : "var(--color-silver-400)",
    },
  ];
}

/** Compute maintenance urgency score (0-100). M2: Predictive Maintenance. */
export function computeMaintenanceUrgency(task: MaintenanceTask): number {
  const today = new Date();
  const scheduled = new Date(task.scheduled_date);
  const daysOverdue = Math.max(
    0,
    Math.floor((today.getTime() - scheduled.getTime()) / 86_400_000),
  );

  const priorityWeight: Record<MaintenancePriority, number> = {
    critical: 40, high: 30, medium: 20, low: 10,
  };
  const typeWeight: Record<MaintenanceType, number> = {
    emergency: 30, corrective: 20, renovation: 15,
    preventive: 10, cleaning: 5, inspection: 10,
  };

  const priorityScore = priorityWeight[task.priority] ?? 20;
  const typeScore = typeWeight[task.maintenance_type] ?? 10;
  const overdueScore = Math.min(30, daysOverdue * 3);

  return Math.min(100, priorityScore + typeScore + overdueScore);
}

/** Determine utilization level for color coding. */
export function getUtilizationLevel(
  pct: number,
): "low" | "medium" | "high" | "critical" {
  if (pct >= 90) return "critical";
  if (pct >= 70) return "high";
  if (pct >= 40) return "medium";
  return "low";
}

export function getUtilizationLevelColor(level: ReturnType<typeof getUtilizationLevel>): string {
  const map: Record<string, string> = {
    low: "var(--color-emerald-400)",
    medium: "var(--color-teal-400)",
    high: "var(--color-amber-400)",
    critical: "var(--color-rose-400)",
  };
  return map[level] ?? "var(--color-silver-400)";
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — TYPE GUARDS
// ═══════════════════════════════════════════════════════════════

export function isFacilityType(value: string): value is FacilityType {
  return (FACILITY_TYPES as readonly string[]).includes(value);
}

export function isFacilityStatus(value: string): value is FacilityStatus {
  return (FACILITY_STATUSES as readonly string[]).includes(value);
}

export function isMaintenancePriority(value: string): value is MaintenancePriority {
  return (MAINTENANCE_PRIORITIES as readonly string[]).includes(value);
}

export function isCrowdLevel(value: string): value is CrowdLevel {
  return (CROWD_LEVELS as readonly string[]).includes(value);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — CAMELCASE LEGACY TYPES + CONVERTERS
//
// These interfaces exist because some components were written
// with camelCase conventions before the snake_case standard
// was enforced. New code MUST use the snake_case interfaces
// from Section 3. These are kept for backward compatibility
// and will be removed when all V1→V2 rewrites are complete.
//
// @deprecated Use FacilityReservation (snake_case)
// ═══════════════════════════════════════════════════════════════

/** @deprecated Use FacilityReservation — camelCase legacy wrapper */
export interface Reservation {
  id: string;
  facilityId: string;
  facilityName: string;
  familyId: string;
  familyName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  guestCount: number;
  purpose: string;
  notes: string | null;
  createdBy: string;
  createdAt: string | null;
}

/** @deprecated Use snake_case contract types — camelCase legacy wrapper */
export interface ReservationListResponse {
  status: string;
  message?: string;
  reservations: Reservation[];
  total: number;
}

/** @deprecated Use MaintenanceTask — camelCase legacy wrapper */
export interface MaintenanceRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDurationHours: number;
  performedBy: string;
  performedAt: string | null;
  cost: number;
  notes: string | null;
}

/** @deprecated CamelCase legacy wrapper for facility detail response */
export interface FacilityDetailResponse {
  status: string;
  facility: FacilityDetail;
  upcomingReservations: Reservation[];
  utilizationHistory: { date: string; utilization: number }[];
  maintenanceLog: MaintenanceRecord[];
}

/** @deprecated CamelCase legacy wrapper for facility with UI fields */
export interface FacilityDetail {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  location: string;
  capacity: number;
  description: string;
  amenities: string[];
  operatingHours: { open: string; close: string };
  utilizationRate: number;
  hourlyRate?: number;
  requiresFacilityReservation: boolean;
}

// ── Converters: snake_case ↔ camelCase ─────────────────────────

/** Convert FacilityReservation (snake_case) → Reservation (camelCase) */
export function toReservation(r: FacilityReservation): Reservation {
  return {
    id: r.id,
    facilityId: r.facility_id,
    facilityName: r.facility_name,
    familyId: r.family_id,
    familyName: r.family_name,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    guestCount: r.guest_count,
    purpose: r.purpose,
    notes: r.notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

/** Convert MaintenanceTask (snake_case) → MaintenanceRecord (camelCase) */
export function toMaintenanceRecord(t: MaintenanceTask): MaintenanceRecord {
  return {
    id: t.id,
    facilityId: t.facility_id,
    facilityName: t.facility_name,
    type: t.maintenance_type,
    status: t.status,
    priority: t.priority,
    description: t.description,
    scheduledDate: t.scheduled_date,
    scheduledTime: t.scheduled_time,
    estimatedDurationHours: t.estimated_duration_hours,
    performedBy: t.assigned_to,
    performedAt: t.completed_at,
    cost: t.cost,
    notes: t.notes,
  };
}

/** Convert Facility (snake_case) → FacilityDetail (camelCase) */
export function toFacilityDetail(f: Facility): FacilityDetail {
  return {
    id: f.id,
    name: f.name,
    type: f.facility_type,
    status: f.status,
    location: f.location,
    capacity: f.capacity,
    description: f.description,
    amenities: f.amenities,
    operatingHours: { open: f.opening_time, close: f.closing_time },
    utilizationRate: 0,
    hourlyRate: f.base_rate,
    requiresFacilityReservation: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
//
//   ██╗███╗   ██╗████████╗███████╗██╗     ██╗     ██╗ ██████╗
//   ██║████╗  ██║╚══██╔══╝██╔════╝██║     ██║     ██║██╔════╝
//   ██║██╔██╗ ██║   ██║   █████╗  ██║     ██║     ██║██║
//   ██║██║╚██╗██║   ██║   ██╔══╝  ██║     ██║     ██║██║
//   ██║██║ ╚████║   ██║   ███████╗███████╗███████╗██║╚██████╗
//   ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝
//
//   SPATIAL INTELLIGENCE TYPES — "THE LIVING BUILDING"
//   Phase 32: Facilities Intelligence System
//   12 Engines (§F1-§F12) + Dashboard System
//
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — §F1 + §F9: SPATIAL INTELLIGENCE
// The club as a living graph of interconnected spaces.
// ═══════════════════════════════════════════════════════════════

export interface SpatialNode {
  facility_id: string;
  facility_name: string;
  facility_type: FacilityType;
  area_sqm: number;
  max_capacity: number;
  position: { x: number; y: number };
  personality: FacilityPersonality;
  health: number;
  current_occupancy: number;
  comfort_score: number;
  crowd_level: CrowdLevel;
}

export interface SpatialEdge {
  from_id: string;
  to_id: string;
  correlation_score: number;
  edge_type: "flow" | "synergy" | "dependency";
  avg_transfer_time_min: number;
  transfer_volume: number;
}

export interface SpatialGraph {
  nodes: SpatialNode[];
  edges: SpatialEdge[];
  clusters: SpatialCluster[];
  bottlenecks: SpatialBottleneck[];
  optimization_opportunities: SpatialOptimization[];
}

export interface SpatialCluster {
  cluster_id: any;
  id: string;
  facility_ids: string[];
  theme: string;
  avg_utilization: number;
  cross_sell_potential: number;
}

export interface SpatialBottleneck {
  facility_id: string;
  bottleneck_type: "capacity" | "flow" | "maintenance";
  severity: number;
  affected_facilities: string[];
  recommendation: string;
}

export interface SpatialOptimization {
  id: string;
  type: "relocate" | "resize" | "repurpose" | "connect" | "split";
  description: string;
  affected_facilities: string[];
  expected_impact: {
    utilization_change: number;
    revenue_change: number;
    comfort_change: number;
  };
  confidence: number;
  implementation_cost: number;
  roi_months: number;
}

// ── §F9: Spatial Storytelling — Temporal Animation ─────────────

export interface TemporalGraphFrame {
  timestamp: string;
  graph: SpatialGraph;
  dominant_flow: FlowPattern | null;
  energy_level: number;
  narrative: string;
}

export interface FlowPattern {
  id: string;
  name: string;
  from_facilities: string[];
  to_facilities: string[];
  trigger: string;
  volume: number;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11 — §F2: FACILITY PERSONALITY
// Each space has a personality built from actual usage data,
// not from how it was designed.
// ═══════════════════════════════════════════════════════════════

export interface SensorySignature {
  lighting: {
    type: "natural" | "warm" | "cool" | "dramatic" | "ambient";
    intensity: number;
    color_temp_k: number;
  };
  acoustics: {
    type: "silent" | "intimate" | "conversational" | "social" | "energetic";
    target_db: number;
    absorption_rating: number;
  };
  temperature: {
    target_celsius: number;
    humidity_pct: number;
    airflow: "still" | "gentle" | "moderate" | "strong";
  };
  aroma: {
    category: "neutral" | "fresh" | "luxury" | "natural" | "culinary";
    intensity: number;
  };
  texture: {
    primary: "smooth" | "natural" | "luxury" | "industrial" | "organic";
    comfort_rating: number;
  };
}

export interface FacilityPersonality {
  overall_score: any;
  vitality_trend: any;
  versatility_index: any;
  comfort_contribution: any;
  efficiency_rating: any;
  popularity_score: any;
  activity_level: any;
  personality_type: string;
  facility_id: string;
  facility_name: string;
  energy: number;
  sociality: number;
  formality: number;
  exclusivity: number;
  versatility: number;
  intimacy: number;
  best_genres: string[];
  optimal_capacity: number;
  optimal_time_of_day: "morning" | "afternoon" | "evening" | "night";
  sensory_signature: SensorySignature;
  trend: TrendDirection;
  designed_for: string;
  actual_primary_use: string;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12 — §F3 + §F6: HEALTH & DETERIORATION
// Each component is a battery with a degradation curve.
// Monte Carlo failure prediction.
// ═══════════════════════════════════════════════════════════════

export interface HealthComponent {
  name: string;
  health_pct: number;
  deterioration_rate: number;
  age_months: number;
  expected_life_months: number;
  replacement_cost: number;
  intervention_window: { start: string; end: string };
  status: HealthStatus;
}

export interface FailurePrediction {
  confidence: number;
  likely_failure_date: string;
  affected_components: string[];
  cascade_risk: boolean;
  cascade_description?: string;
  monte_carlo: {
    p10: string;
    p50: string;
    p90: string;
  };
}

export interface FacilityHealthIntelligence {
  facility_id: string;
  overall_pct: number;
  components: HealthComponent[];
  deterioration_rate: number;
  last_maintenance: string;
  next_maintenance_window: { start: string; end: string; optimal: string };
  failure_prediction: FailurePrediction;
  cost_analysis: {
    preventive_cost: number;
    reactive_cost: number;
    savings_pct: number;
  };
}

export interface DeteriorationComponent {
  estimated_replacement_cost: number;
  name: string;
  current_health: number;
  predicted_health_30d: number;
  predicted_health_90d: number;
  deterioration_rate: number;
  deterioration_acceleration: number;
  failure_threshold: number;
  days_to_failure: number;
  intervention_cost: number;
  failure_cost: number;
  roi_of_prevention: number;
}

export interface DeteriorationModel {
  facility_id: string;
  components: DeteriorationComponent[];
  overall_trajectory: "stable" | "slow_decline" | "accelerating" | "critical";
  maintenance_budget_needed: number;
  maintenance_budget_available: number;
  priority_ranking: MaintenancePriorityAction[];
}

export interface MaintenancePriorityAction {
  component: string;
  urgency: "emergency" | "urgent" | "planned" | "deferred";
  reason: string;
  estimated_cost: number;
  deadline: string;
  consequence_of_delay: string;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 13 — §F4: OCCUPANCY PREDICTION
// Occupancy as field physics — not a percentage, a gravitational field.
// ═══════════════════════════════════════════════════════════════

export interface OccupancyFactor {
  name: string;
  impact: number;
  direction: "up" | "down" | "neutral";
  confidence: number;
}

export interface OccupancyPrediction {
  trend: ReactNode;
  name: ReactNode;
  facility_id: string;
  current_pct: number;
  current_crowd_level: CrowdLevel;
  predicted_1h: number;
  predicted_3h: number;
  predicted_peak: number;
  peak_time: string;
  confidence: number;
  flow_direction: { x: number; y: number };
  congestion_risk: number;
  factors: OccupancyFactor[];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 14 — §F5 + PROP 12: COMFORT INTELLIGENCE
// 5 technical dimensions + 5 psychological dimensions.
// Sensors vs perception gap.
// ═══════════════════════════════════════════════════════════════

export interface ComfortDimension {
  gap: number;
  score: number;
  sensor: string;
  perception: string;
  value: number;
  target: number;
  unit: string;
  status: ComfortStatus;
  recommendation?: string;
}

export interface ComfortScore {
  factors: string[];
  narrative: string;
  dominant_deficiency: string;
  perception_gap?: number;
  facility_id: string;
  overall: number;
  dimensions: {
    temperature: ComfortDimension;
    lighting: ComfortDimension;
    noise: ComfortDimension;
    air_quality: ComfortDimension;
    crowding: ComfortDimension;
  };
  trend: TrendDirection;
  intervention_needed: boolean;
  intervention_urgency: "low" | "medium" | "high" | "critical";
  intervention_recommendation: string;
}

/** Prop 12: 6th dimension — what sensors can't measure. */
export interface PsychologicalDimension {
  value: number;
  factors: string[];
  improvement: string;
}

export interface PsychologicalComfort {
  perceived_space: PsychologicalDimension;
  aesthetic_warmth: PsychologicalDimension;
  sense_of_control: PsychologicalDimension;
  social_density_feel: PsychologicalDimension;
  prestige_perception: PsychologicalDimension;
}

export interface EnhancedComfortScore extends ComfortScore {
  technical_overall: number;
  psychological: PsychologicalComfort;
  perception_gap: number;
  perception_gap_description: string;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 15 — §F7: REVENUE MODEL
// Revenue per square meter with Monte Carlo optimization.
// ═══════════════════════════════════════════════════════════════

export interface PricingTier {
  name: string;
  price: number;
  includes: string[];
  target_capacity: number;
  demand: number;
  revenue_contribution: number;
}

export interface RevenueScenario {
  name: string;
  description: string;
  changes: string[];
  revenue_delta: number;
  comfort_delta: number;
  utilization_delta: number;
  confidence: number;
  risk_factors: string[];
}

export interface ConfidenceBand {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  confidence: number;
  iterations: number;
}

export interface RevenueModel {
  facility_id: string;
  current: {
    revenue_per_month: number;
    events_per_month: number;
    revenue_per_sqm: number;
    revenue_per_event: number;
  };
  optimization: {
    scenarios: RevenueScenario[];
    recommended_scenario: string;
    monte_carlo: ConfidenceBand;
  };
  pricing_tiers: PricingTier[];
  demand_elasticity: number;
  cross_domain_impact: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 16 — §F8 + PROP 11: FACILITY MEMORY
// Each space remembers what happened and learns from it.
// ═══════════════════════════════════════════════════════════════

export interface FacilityMemoryNode {
  event_id: string;
  event_type: string;
  date: string;
  attendance: number;
  satisfaction_score: number;
  revenue: number;
  incidents: string[];
  maintenance_triggered: boolean;
  comfort_during_event: ComfortScore | null;
  notable_patterns: string[];
}

export interface FacilityAnomaly {
  date: string;
  description: string;
  severity: "info" | "warning" | "critical";
  resolution?: string;
}

export interface FacilityMemory {
  facility_id: string;
  total_events: number;
  memory_nodes: FacilityMemoryNode[];
  anomaly_detection: FacilityAnomaly[];
  pattern_insights: string[];
}

// ── Prop 11: Spatial Memory Journal — Narrative ────────────────

export interface NarrativeChapter {
  id: string;
  title: string;
  date: string;
  type: "anomaly" | "milestone" | "pattern" | "learning";
  story: string;
  data: FacilityMemoryNode;
  impact: string;
}

export interface NarrativeInsight {
  pattern: string;
  confidence: number;
  recommendation: string;
  evidence_count: number;
}

export interface FacilityNarrative {
  facility_id: string;
  chapters: NarrativeChapter[];
  insights: NarrativeInsight[];
  lessons_learned: string[];
  personality_evolution: string;
}

export interface MemoryQuery {
  text: string;
  parsed: {
    entity: string;
    question_type: "last_event" | "pattern" | "anomaly" | "comparison";
    parameters: Record<string, unknown>;
  };
}

export interface MemoryAnswer {
  answer: string;
  supporting_data: FacilityMemoryNode[];
  confidence: number;
}

export interface MemoryPattern {
  id: string;
  description: string;
  trigger: string;
  frequency: number;
  confidence: number;
  impact: string;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 17 — PROP 10: WHAT-IF SPATIAL PLANNER
// The system designs scenarios proactively, not just reactively.
// ═══════════════════════════════════════════════════════════════

export interface WhatIfAction {
  type: "close" | "renovate" | "resize" | "repurpose" | "connect" | "split";
  target_facility_id: string;
  duration_weeks: number;
  description: string;
}

export interface SpatialSnapshot {
  timestamp: string;
  facilities: Array<{
    facility_id: string;
    occupancy_pct: number;
    comfort_score: number;
    crowd_level: CrowdLevel;
    revenue_impact: number;
  }>;
  total_revenue_impact: number;
  avg_comfort: number;
}

export interface MitigationAction {
  description: string;
  target_facility: string;
  expected_impact: string;
  cost: number;
}

export interface MitigationPlan {
  actions: MitigationAction[];
  expected_recovery_pct: number;
  total_cost: number;
  implementation_time_weeks: number;
}

export interface WhatIfScenario {
  id: string;
  action: WhatIfAction;
  before: SpatialSnapshot;
  during: SpatialSnapshot;
  after: SpatialSnapshot;
  impact: {
    revenue_delta_monthly: number;
    comfort_delta: Record<string, number>;
    occupancy_shift: Record<string, number>;
    affected_members: number;
    cascade_risks: string[];
  };
  mitigation: MitigationPlan;
  monte_carlo: ConfidenceBand;
  auto_generated: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 18 — PROP 13: TEMPORAL RESONANCE (RIPPLE EFFECT)
// Every event creates a cascade of hidden costs across
// facilities and time.
// ═══════════════════════════════════════════════════════════════

export interface RippleEffect {
  timestamp: string;
  facility_id: string;
  effect_type:
    | "occupancy_spike"
    | "occupancy_drop"
    | "comfort_drop"
    | "maintenance_triggered"
    | "revenue_impact"
    | "flow_redirect";
  magnitude: number;
  description: string;
  is_predictable: boolean;
}

export interface EventRipple {
  source_event: {
    event_id: string;
    event_name: string;
    facility_id: string;
    date: string;
    attendance: number;
  };
  effects: RippleEffect[];
  total_duration_hours: number;
  total_affected_facilities: number;
  cascade_severity: number;
}

export interface HiddenCosts {
  maintenance_extra: number;
  energy_extra: number;
  wear_acceleration_days: number;
  opportunity_cost: number;
  total_hidden: number;
  ratio_to_revenue: number;
  breakdown: string[];
}

export interface ResonancePattern {
  id: string;
  trigger: string;
  typical_ripple: EventRipple;
  hidden_cost_avg: number;
  times_observed: number;
  prediction_confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 19 — CROSS-DOMAIN FUSION
// Facilities don't exist in isolation. Every spatial decision
// ripples through cultural, financial, engagement, and guest domains.
// ═══════════════════════════════════════════════════════════════

export interface VenueMatch {
  facility_id: string;
  facility_name: string;
  match_score: number;
  personality_fit: number;
  comfort_prediction: number;
  revenue_impact: number;
  sensory_profile: SensorySignature;
  warnings: string[];
  price_estimate: number;
}

// ── I2: Booking Intelligence ───────────────────────────────────

export interface OptimalSlot {
  facility_id: string;
  facility_name: string;
  date: string;
  start_time: string;
  end_time: string;
  crowd_pct: number;
  crowd_level: CrowdLevel;
  revenue_delta: number;
  reason: string;
  is_recommended: boolean;
}

export interface MaintenanceConflict {
  has_conflict: boolean;
  task_count: number;
  task_descriptions: string[];
  earliest_available_date: string;
}

export interface ExperienceContext {
  venue: FacilityPersonality;
  sensory_profile: SensorySignature;
  comfort_forecast: EnhancedComfortScore;
  cross_domain_signals: CrossDomainSignal[];
  narrative: string;
}

export interface DomainSignal {
  domain: string;
  signal_type: string;
  magnitude: number;
  timestamp: string;
  description: string;
}

export interface CrossDomainResonance {
  score: number;
  signals: DomainSignal[];
  recommendations: string[];
  affected_domains: string[];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 20 — DASHBOARD & SYSTEM TYPES
// Ambient state, dashboard mode, full return type.
// ═══════════════════════════════════════════════════════════════

export type FacilitiesDashboardMode = "calm" | "alert" | "critical";

export interface FacilitiesAmbientState {
  mode: FacilitiesDashboardMode;
  intensity: number;
  accent_color: string;
  pulse_rate: "dormant" | "flowing" | "deep" | "critical";
  active_alerts: number;
  facilities_at_risk: number;
}

export interface FacilitiesDashboardReturn {
  // ── Data Layer ──
  facilities: Facility[];
  reservations: FacilityReservation[];
  maintenanceTasks: MaintenanceTask[];
  inspections: Inspection[];
  eventSetups: EventSetup[];
  analytics: FacilityAnalyticsResponse | null;
  amenityUtilization: AmenityUtilizationResponse | null;
  healthResponse: FacilityHealthResponse | null;
  spaceOptimization: SpaceOptimizationResponse | null;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  refetchAll: () => void;

  // ── Intelligence Layer ──
  spatialGraph: SpatialGraph;
  facilityPersonalities: Record<string, FacilityPersonality>;
  comfortScores: Record<string, ComfortScore>;
  enhancedComfortScores: Record<string, EnhancedComfortScore>;
  deteriorationModels: Record<string, DeteriorationModel>;
  occupancyPredictions: Record<string, OccupancyPrediction>;
  revenueModels: Record<string, RevenueModel>;
  facilityMemories: Record<string, FacilityMemory>;
  // ── Predictive Layer ──
  maintenancePrediction: MaintenancePrediction;
  // ── New Intelligence Layer (Props 9-13) ──
  temporalGraphSequence: TemporalGraphFrame[];
  whatIfScenarios: WhatIfScenario[];
  facilityNarratives: Record<string, FacilityNarrative>;
  eventRipples: EventRipple[];
  resonancePatterns: ResonancePattern[];

  // ── System Layer ──
  dashboardMode: FacilitiesDashboardMode;
  ambientState: FacilitiesAmbientState;
  advisorInsights: FacilitiesAdvisorInsight[];
  crossDomainSignals: CrossDomainSignal[];
}

// ═══════════════════════════════════════════════════════════════
// SECTION 21 — INTELLIGENCE HELPER FUNCTIONS
// Classify, compute, derive — pure functions for the UI layer.
// ═══════════════════════════════════════════════════════════════

/** Classify occupancy percentage into crowd level. */
export function classifyCrowdLevel(pct: number): CrowdLevel {
  if (pct >= 95) return "overloaded";
  if (pct >= 80) return "crowded";
  if (pct >= 60) return "busy";
  if (pct >= 30) return "normal";
  if (pct >= 10) return "quiet";
  return "empty";
}

/** Classify comfort score into human-readable level. */
export function classifyComfortLevel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bueno";
  if (score >= 55) return "Aceptable";
  if (score >= 40) return "Deficiente";
  return "Crítico";
}

/** Classify health percentage into status label. */
export function classifyHealthLevel(pct: number): HealthStatus {
  if (pct >= 90) return "healthy";
  if (pct >= 75) return "attention";
  if (pct >= 40) return "warning";
  return "critical";
}

/** Compute revenue per square meter. */
export function computeSpaceROI(revenue: number, area_sqm: number): number {
  if (area_sqm <= 0) return 0;
  return revenue / area_sqm;
}

/** Derive sensory adjustments based on facility type and event context. */
export function deriveSensoryAdjustments(
  facilityType: FacilityType,
  eventType: string,
): Partial<SensorySignature> {
  const base: Partial<SensorySignature> = {};

  if (facilityType === "ballroom" && eventType === "gala") {
    base.lighting = { type: "dramatic", intensity: 70, color_temp_k: 2700 };
    base.acoustics = { type: "intimate", target_db: 40, absorption_rating: 80 };
    base.aroma = { category: "luxury", intensity: 60 };
  } else if (facilityType === "garden") {
    base.lighting = { type: "natural", intensity: 90, color_temp_k: 5500 };
    base.acoustics = { type: "social", target_db: 55, absorption_rating: 30 };
    base.aroma = { category: "natural", intensity: 40 };
  } else if (facilityType === "spa") {
    base.lighting = { type: "ambient", intensity: 30, color_temp_k: 2700 };
    base.acoustics = { type: "silent", target_db: 30, absorption_rating: 90 };
    base.aroma = { category: "fresh", intensity: 50 };
  } else if (facilityType === "gym") {
    base.lighting = { type: "cool", intensity: 85, color_temp_k: 5000 };
    base.acoustics = { type: "energetic", target_db: 65, absorption_rating: 40 };
  } else if (facilityType === "restaurant") {
    base.lighting = { type: "warm", intensity: 60, color_temp_k: 3000 };
    base.acoustics = { type: "conversational", target_db: 45, absorption_rating: 65 };
    base.aroma = { category: "culinary", intensity: 70 };
  }

  return base;
}

/** Get color for a health percentage value. */
export function getHealthColor(pct: number): string {
  if (pct >= 90) return "var(--color-emerald-400)";
  if (pct >= 75) return "var(--color-teal-400)";
  if (pct >= 50) return "var(--color-amber-400)";
  if (pct >= 25) return "var(--color-rose-400)";
  return "var(--color-rose-400)";
}

/** Get color for a comfort score value. */
export function getComfortColor(score: number): string {
  if (score >= 85) return "var(--color-emerald-400)";
  if (score >= 70) return "var(--color-teal-400)";
  if (score >= 55) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

/** Get color for a crowd level. */
export function getCrowdLevelColor(level: CrowdLevel): string {
  const map: Record<CrowdLevel, string> = {
    empty: "var(--color-silver-400)",
    quiet: "var(--color-teal-400)",
    normal: "var(--color-emerald-400)",
    busy: "var(--color-amber-400)",
    crowded: "var(--color-amber-400)",
    overloaded: "var(--color-rose-400)",
  };
  return map[level];
}

/** Derive dashboard mode from current alerts and risks. */
export function deriveFacilitiesDashboardMode(
  criticalAlerts: number,
  warningAlerts: number,
  facilitiesAtRiskPct: number,
): FacilitiesDashboardMode {
  if (criticalAlerts >= 3 || facilitiesAtRiskPct >= 20) return "critical";
  if (criticalAlerts >= 1 || warningAlerts >= 5) return "alert";
  return "calm";
}
