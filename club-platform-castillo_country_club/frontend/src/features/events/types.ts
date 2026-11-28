// src/features/events/types.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Types & Configs
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.0
// @namespace   ev-* (events domain)
// @keyframes   0 (type definitions only)
// @depends     @/shared/types/domain-enums, @/shared/types/ai-intelligence
//
// SOURCE OF TRUTH:
//   backend/src/club_mcp/models/event.py
//   backend/src/club_mcp/agents/event_orchestrator.py
//
// Type architecture:
//
//   shared/types/domain-enums.ts
//     └─ EventCategory, EventStatus, RsvpStatus (master enums)
//
//   shared/types/ai-intelligence.ts
//     └─ AdvisorInsightBase, AdvisorLayer, AIFactor (AI base types)
//
//   THIS FILE (events/types.ts)
//     ├─ Domain-specific enums (EventAccessType, Recurrence, etc.)
//     ├─ Sub-models (ProgramItem, RsvpRecord, VendorRecord)
//     ├─ Response types (EventResponse, CalendarMonth, etc.)
//     ├─ Analytics types (CapacityInfo, EventAnalytics, EventReport)
//     ├─ AI types (AttendancePrediction, OptimizationRecommendations, etc.)
//     ├─ Advisor types (EventAdvisorInsight extends AdvisorInsightBase)
//     └─ Config maps (EVENT_CATEGORY_CONFIG, EVENT_STATUS_CONFIG, etc.)
//
// Display label convention:
//   domain-enums.ts → English enum KEYS (type safety)
//   THIS FILE       → Spanish display LABELS (UI rendering)
//   These are NOT duplicates — they serve different purposes.
//   When i18n is implemented, config labels → i18n.t() calls.
//
// ANTI-PATTERNS REMOVED (v1):
// [x] Patch comment ("Fase 30a — REWRITE: eliminated...") → removed
// [x] All response/data interfaces: mutable → readonly fields
// [x] EventFilters: intentionally MUTABLE (form state, documented)
// [x] EventAdvisorInsightLayer → EventAdvisorLayer extends AdvisorLayer
// [x] Nested AI types inline → extracted (RecommendationItem, etc.)
// [x] Config objects not typed → as const assertions
// [x] Missing § section markers → §1-§8
// [x] Missing file header → added with metadata
// [x] Missing PRE-WRITE/ANTI-PATTERNS blocks → added
//
// FIXES APPLIED (v2):
// [x] EVT-01: 3 unused *_DISPLAY imports removed (noUnusedLocals crash)
// [x] EVT-02: EventAdvisorInsight uses Omit<> & intersection (type-safe
//             regardless of whether AdvisorInsightBase has layer/domain)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 SHARED IMPORTS
// ═══════════════════════════════════════════════════════════

import type {
  EventCategory,
  EventStatus,
  RsvpStatus,
} from "@shared/types/domain-enums";

import type {
  AIFactor,
  AdvisorInsightBase,
  AdvisorLayer,
} from "@shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// §1 DOMAIN-SPECIFIC ENUMS
//
// Event-only types. Cross-domain enums (EventCategory, EventStatus,
// RsvpStatus) live in shared/types/domain-enums.ts.
// ═══════════════════════════════════════════════════════════

export type EventAccessType = "open" | "private" | "semi_private";

export type RecurrencePattern =
  | "none"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly";

export type EventPricingModel =
  | "free"
  | "subsidized"
  | "paid"
  | "premium";

export type VendorContractStatus =
  | "pending"
  | "quoted"
  | "negotiating"
  | "approved"
  | "contracted"
  | "completed"
  | "cancelled";

// ═══════════════════════════════════════════════════════════
// §2 SUB-MODELS
//
// Reusable structures nested within EventResponse.
// All fields readonly — events are immutable data objects.
// ═══════════════════════════════════════════════════════════

export interface ProgramItem {
  readonly id: string;
  readonly event_id: string;
  readonly time_start: string;
  readonly time_end: string;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly responsible: string;
  readonly notes: string;
  readonly order: number;
}

export interface RsvpRecord {
  readonly id: string;
  readonly event_id: string;
  readonly family_id: string;
  readonly family_name: string;
  readonly member_ids: readonly string[];
  readonly status: RsvpStatus;
  readonly guests_count: number;
  readonly dietary_restrictions: string;
  readonly notes: string;
  readonly total_cost: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface VendorRecord {
  readonly id: string;
  readonly event_id: string;
  readonly name: string;
  readonly service_type: string;
  readonly contact_name: string;
  readonly contact_phone: string;
  readonly contact_email: string;
  readonly quoted_cost: number;
  readonly final_cost: number | null;
  readonly contract_status: VendorContractStatus;
  readonly notes: string;
  readonly created_at: string;
  readonly updated_at: string;
}

// ═══════════════════════════════════════════════════════════
// §3 CORE RESPONSE TYPES
//
// Backend-aligned response interfaces.
// EventResponse = full event with relations (programs, rsvps, vendors).
// EventBrief = lightweight for list/calendar views.
// ═══════════════════════════════════════════════════════════

export interface EventResponse {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: EventCategory;
  readonly event_type: EventAccessType;
  readonly status: EventStatus;
  readonly date_start: string;
  readonly date_end: string;
  readonly location: string;
  readonly facility_ids: readonly string[];
  readonly age_groups: readonly string[];
  readonly max_capacity: number;
  readonly current_attendance: number;
  readonly waitlist_count: number;
  readonly pricing_model: EventPricingModel;
  readonly price_per_person: number;
  readonly is_members_only: boolean;
  readonly allow_guests: boolean;
  readonly max_guests_per_family: number;
  readonly recurrence: RecurrencePattern;
  readonly requires_rsvp: boolean;
  readonly dress_code: string;
  readonly notes: string;
  readonly tags: readonly string[];
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly programs: readonly ProgramItem[];
  readonly rsvps: readonly RsvpRecord[];
  readonly vendors: readonly VendorRecord[];
}

export interface EventBrief {
  readonly id: string;
  readonly title: string;
  readonly category: EventCategory;
  readonly status: EventStatus;
  readonly date_start: string;
  readonly date_end: string;
  readonly location: string;
  readonly current_attendance: number;
  readonly max_capacity: number;
  readonly pricing_model: EventPricingModel;
}

// ═══════════════════════════════════════════════════════════
// §4 LIST + CALENDAR RESPONSES
// ═══════════════════════════════════════════════════════════

export interface EventListResponse {
  readonly events: readonly EventBrief[];
  readonly total: number;
  readonly page: number;
  readonly total_pages: number;
}

export interface CalendarDay {
  readonly date: string;
  readonly events: readonly EventBrief[];
  readonly total_events: number;
  readonly has_conflicts: boolean;
}

export interface CalendarMonth {
  readonly year: number;
  readonly month: number;
  readonly days: readonly CalendarDay[];
}

/**
 * Event filters for list/calendar queries.
 * INTENTIONALLY MUTABLE — used as form state where fields
 * are reassigned by user interaction (dropdowns, pagination).
 *
 * R-14 EXEMPTION: Form state must be mutable.
 * Documented exception per architecture rules.
 */
export interface EventFilters {
  category: EventCategory | "";
  status: EventStatus | "";
  date_from?: string;
  date_to?: string;
  search?: string;
  page: number;
  limit: number;
}

// ═══════════════════════════════════════════════════════════
// §5 ANALYTICS & CAPACITY
// ═══════════════════════════════════════════════════════════

export interface CapacityInfo {
  readonly event_id: string;
  readonly event_title: string;
  readonly max_capacity: number;
  readonly current_attendance: number;
  readonly waitlist_count: number;
  readonly available_spots: number;
  readonly occupancy_pct: number;
  readonly is_full: boolean;
  readonly is_waitlist_active: boolean;
}

export interface EventAnalytics {
  readonly event_id: string;
  readonly event_title: string;
  readonly total_rsvps: number;
  readonly confirmed_attendance: number;
  readonly declined_count: number;
  readonly no_shows: number;
  readonly waitlisted_count: number;
  readonly attendance_rate: number;
  readonly cancellation_rate: number;
  readonly revenue: number;
  readonly average_guests_per_family: number;
  readonly age_distribution: Readonly<Record<string, number>>;
  readonly peak_rsvp_date: string | null;
  readonly days_until_event: number | null;
}

export interface EventReport {
  readonly report_type: string;
  readonly period_start: string;
  readonly period_end: string;
  readonly total_events: number;
  readonly completed_events: number;
  readonly cancelled_events: number;
  readonly upcoming_events: number;
  readonly total_attendance: number;
  readonly average_attendance: number;
  readonly total_revenue: number;
  readonly top_categories: ReadonlyArray<{ readonly category: string; readonly count: number }>;
  readonly top_events: readonly EventBrief[];
  readonly recommendations: readonly string[];
  readonly generated_at: string;
}

// ═══════════════════════════════════════════════════════════
// §6 AI INTELLIGENCE
//
// AI-generated predictions, recommendations, and analysis.
// These types are populated by MCP agent tools.
// Nested structures extracted to named interfaces for reuse.
// ═══════════════════════════════════════════════════════════

/** AI-generated attendance prediction for an event. */
export interface AttendancePrediction {
  readonly predicted_attendance: number;
  readonly confidence: number;
  readonly factors: readonly AIFactor[];
  readonly capacity_risk: "low" | "medium" | "high" | "critical";
  readonly recommendation: string;
}

/** Individual optimization recommendation from AI. */
export interface RecommendationItem {
  readonly id: string;
  readonly area: "pricing" | "timing" | "capacity" | "promotion" | "venue";
  readonly suggestion: string;
  readonly estimated_impact: string;
  readonly priority: "high" | "medium" | "low";
  readonly effort: "low" | "medium" | "high";
}

/** AI-generated optimization recommendations for an event. */
export interface OptimizationRecommendations {
  readonly recommendations: readonly RecommendationItem[];
  readonly overall_score: number;
  readonly ai_summary: string;
}

/** Individual scheduling conflict detected by AI. */
export interface ConflictItem {
  readonly event_id: string;
  readonly event_title: string;
  readonly conflict_type: "time_overlap" | "resource_overlap" | "audience_overlap";
  readonly severity: "high" | "medium" | "low";
  readonly detail: string;
  readonly resolution_suggestion: string;
}

/** AI-generated conflict analysis for event scheduling. */
export interface ConflictAnalysis {
  readonly conflicts: readonly ConflictItem[];
  readonly total_conflicts: number;
  readonly risk_level: "low" | "medium" | "high";
  readonly ai_summary: string;
}

/** Individual engagement strategy from AI. */
export interface StrategyItem {
  readonly id: string;
  readonly channel: "email" | "push" | "whatsapp" | "in_app" | "phone";
  readonly action: string;
  readonly target_audience: string;
  readonly timing: string;
  readonly expected_rsvp_increase: string;
  readonly priority: "high" | "medium" | "low";
}

/** AI-generated engagement boost strategy. */
export interface EngagementBoostStrategy {
  readonly strategies: readonly StrategyItem[];
  readonly current_engagement_score: number;
  readonly projected_engagement_score: number;
  readonly ai_summary: string;
  readonly estimatedROI: string;
}

// ═══════════════════════════════════════════════════════════
// §7 ADVISOR INTEGRATION
//
// Event-specific advisor layer extends the base AdvisorLayer.
// The 15 event layers enable fine-grained UI rendering:
//   diagnostic → amber (data issues)
//   prediction → gold (forecasting)
//   financial  → emerald (cost/revenue)
//   execution  → sky (operational)
//   etc.
//
// EVT-02 FIX: EventAdvisorInsight uses Omit<> & intersection
// instead of interface extends, because EventAdvisorLayer is
// WIDER than AdvisorLayer (adds 15 event-specific values).
// Interface extension requires child props to be SUBTYPES
// (narrower), not supertypes (wider). The Omit pattern is
// safe regardless of whether AdvisorInsightBase declares
// layer/domain fields — it removes them if present, and the
// intersection adds the event-specific versions.
// ═══════════════════════════════════════════════════════════

/**
 * Event-specific advisor layers.
 * Extends AdvisorLayer with event-domain layers for granular UI rendering.
 *
 * Base layers (from AdvisorLayer): "operational" | "tactical" | "strategic"
 * Event layers enable per-section rendering in EventDashboard.
 */
export type EventAdvisorLayer =
  | AdvisorLayer
  | "diagnostic"
  | "strategy"
  | "prediction"
  | "innovation"
  | "execution"
  | "engagement"
  | "social"
  | "financial"
  | "lifecycle"
  | "health"
  | "space"
  | "macro"
  | "micro"
  | "fusion"
  | "event_readiness";

/**
 * Event-specific advisor insight.
 *
 * Uses Omit<> & intersection instead of interface extends because
 * EventAdvisorLayer is a WIDER union than AdvisorLayer (adds 15
 * event-specific values). TypeScript interface extension requires
 * child property types to be assignable to parent property types
 * (covariance), which a wider union violates.
 *
 * The Omit pattern:
 *   1. Removes `layer` and `domain` from AdvisorInsightBase (if present)
 *   2. Adds event-specific `layer: EventAdvisorLayer`
 *   3. Narrows `domain` to the "events" literal
 *
 * This is safe whether or not AdvisorInsightBase declares these fields.
 *
 * @example
 * const insight: EventAdvisorInsight = {
 *   id: "EVT-001",
 *   title: "Capacity alert",
 *   layer: "diagnostic",
 *   domain: "events",
 *   // ... AdvisorInsightBase fields
 * };
 */
export type EventAdvisorInsight = Omit<
  AdvisorInsightBase,
  "layer" | "domain"
> & {
  readonly layer: EventAdvisorLayer;
  readonly domain: "events";
};

// ═══════════════════════════════════════════════════════════
// §8 CONFIG MAPS
//
// Domain-specific display configuration.
// Each map provides: label (Spanish), color (CSS var), icon (emoji).
//
// Display label convention:
//   domain-enums.ts → English KEYS for type safety (e.g., "sports")
//   THIS FILE       → Spanish LABELS for UI display (e.g., "Deportes")
//   These serve different purposes and are NOT duplicates.
//
// When i18n is implemented:
//   - Remove label fields from config maps
//   - Use i18n.t(`events.category.${key}`) in components
//   - Keep color/icon fields in config maps (they're not translatable)
//
// NOTE: `bgColor` uses CSS color-mix() for translucency.
// Baseline: Chrome 111+, Firefox 113+, Safari 16.2+ (2023).
// Acceptable for 2027 target. No @supports fallback needed.
// ═══════════════════════════════════════════════════════════

export const EVENT_CATEGORY_CONFIG: Record<
  EventCategory,
  { readonly label: string; readonly color: string; readonly bgColor: string; readonly icon: string }
> = {
  sports: {
    label: "Deportes",
    icon: "🏆",
    color: "var(--color-gold-400)",
    bgColor: "color-mix(in srgb, var(--color-gold-400) 12%, transparent)",
  },
  cultural: {
    label: "Cultural",
    icon: "🎭",
    color: "var(--color-terracotta-400)",
    bgColor: "color-mix(in srgb, var(--color-terracotta-400) 12%, transparent)",
  },
  social: {
    label: "Social",
    icon: "🎉",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  private: {
    label: "Privado",
    icon: "🔒",
    color: "var(--color-silver-400)",
    bgColor: "color-mix(in srgb, var(--color-silver-400) 12%, transparent)",
  },
  festive: {
    label: "Festivo",
    icon: "🎊",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
  },
  children: {
    label: "Infantil",
    icon: "🎈",
    color: "var(--color-sage-400)",
    bgColor: "color-mix(in srgb, var(--color-sage-400) 12%, transparent)",
  },
  family: {
    label: "Familiar",
    icon: "👨‍👩‍👧‍👦",
    // EVT-03 NOTE: Previously shared teal-400 with "social".
    // Kept as-is — design decision pending.
    // If differentiation needed: consider var(--color-gold-300).
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 12%, transparent)",
  },
  corporate: {
    label: "Corporativo",
    icon: "💼",
    color: "var(--color-silver-200)",
    bgColor: "color-mix(in srgb, var(--color-silver-200) 12%, transparent)",
  },
} as const;

export const EVENT_STATUS_CONFIG: Record<
  EventStatus,
  { readonly label: string; readonly color: string }
> = {
  draft: { label: "Borrador", color: "var(--color-silver-400)" },
  pending_approval: {
    label: "Pendiente aprobación",
    color: "var(--color-amber-400)",
  },
  approved: { label: "Aprobado", color: "var(--color-teal-400)" },
  published: { label: "Publicado", color: "var(--color-emerald-400)" },
  in_progress: { label: "En curso", color: "var(--color-gold-400)" },
  completed: { label: "Finalizado", color: "var(--color-teal-400)" },
  cancelled: { label: "Cancelado", color: "var(--color-rose-400)" },
} as const;

export const RSVP_STATUS_CONFIG: Record<
  RsvpStatus,
  { readonly label: string; readonly color: string }
> = {
  pending: { label: "Pendiente", color: "var(--color-amber-400)" },
  confirmed: { label: "Confirmado", color: "var(--color-emerald-400)" },
  declined: { label: "Declinado", color: "var(--color-rose-400)" },
  waitlisted: { label: "Lista espera", color: "var(--color-teal-400)" },
  no_show: { label: "No asistió", color: "var(--color-silver-500)" },
} as const;

export const PRICING_MODEL_CONFIG: Record<
  EventPricingModel,
  { readonly label: string; readonly color: string; readonly icon: string }
> = {
  free: {
    label: "Gratuito",
    color: "var(--color-emerald-400)",
    icon: "🆓",
  },
  subsidized: {
    label: "Subsidiado",
    color: "var(--color-teal-400)",
    icon: "🏷️",
  },
  paid: { label: "Pago", color: "var(--color-gold-400)", icon: "💰" },
  premium: {
    label: "Premium",
    color: "var(--color-amber-400)",
    icon: "⭐",
  },
} as const;

export const RECURRENCE_CONFIG: Record<
  RecurrencePattern,
  { readonly label: string }
> = {
  none: { label: "Sin recurrencia" },
  weekly: { label: "Semanal" },
  biweekly: { label: "Quincenal" },
  monthly: { label: "Mensual" },
  yearly: { label: "Anual" },
} as const;

export const VENDOR_STATUS_CONFIG: Record<
  VendorContractStatus,
  { readonly label: string; readonly color: string }
> = {
  pending: { label: "Pendiente", color: "var(--color-silver-400)" },
  quoted: { label: "Cotizado", color: "var(--color-teal-400)" },
  negotiating: { label: "Negociando", color: "var(--color-amber-400)" },
  approved: { label: "Aprobado", color: "var(--color-emerald-400)" },
  contracted: { label: "Contratado", color: "var(--color-gold-400)" },
  completed: { label: "Completado", color: "var(--color-teal-400)" },
  cancelled: { label: "Cancelado", color: "var(--color-rose-400)" },
} as const;

export const ACCESS_TYPE_CONFIG: Record<
  EventAccessType,
  { readonly label: string; readonly color: string }
> = {
  open: { label: "Abierto", color: "var(--color-emerald-400)" },
  private: { label: "Privado", color: "var(--color-silver-400)" },
  semi_private: { label: "Semi-privado", color: "var(--color-amber-400)" },
} as const;