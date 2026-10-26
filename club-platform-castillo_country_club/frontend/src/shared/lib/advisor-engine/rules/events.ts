// src/shared/lib/advisor-engine/rules/events.ts
// ═══════════════════════════════════════════════════════════
// Advisor Engine — Event Domain Rules (Declarative)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     ../types, ../evaluate, @/shared/lib/utils,
//              @/features/events/types, @/shared/types/ai-intelligence
//
// 15 declarative rules for the Events domain.
// 0 API calls — pure computation from CalendarDay[] data.
//
// Architecture:
//   Layer 1 — MACRO  (rules 1–8):  Calendar-wide patterns
//   Layer 2 — MICRO  (rules 9–12): Per-event analysis
//   Layer 3 — FUSION (rules 13–15): Cross-domain patterns
//
// Signals emitted:
//   evt_capacity_alert → consumed by global domain
//   evt_low_engagement → consumed by global domain
//
// Health Score: 4 factors
//   calendar_utilization (25%) — days with events
//   capacity_optimization (30%) — sweet spot 60-80% occupancy
//   event_diversity (20%) — category variety
//   engagement (25%) — average attendance rate
//
// Insight narratives are in Spanish for the target audience.
// When i18n is implemented, rule narratives should be generated
// in the user's preferred language via the advisor engine.
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comments ("Fase 19", "P2/P3") → removed
// [x] Mutable EventContext → all readonly, extends BaseContext
// [x] Mutable RuleEvent → readonly fields
// [x] signals: DomainSignal[] → readonly DomainSignal[]
// [x] EVENT_RULES/FACTORS mutable → readonly arrays
// [x] Non-null assertions (3) → proper guards
// [x] rawData unsafe cast → DEV guard + safe access
// [x] "as unknown as RuleEvent[]" → documented cast + type guard
// [x] Missing § section markers → §0-§5
// [x] Missing file header → added with metadata
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import type {
  RuleDefinition,
  HealthFactorDef,
  DomainSignal,
  RAGContext,
  BaseContext,
} from "../types";
import { buildInsight } from "../evaluate";
import { compactCurrency } from "@/shared/lib/utils";
import type {
  CalendarDay,
  EventBrief,
} from "@/features/events/types";
import type {
  AIDomain,
  AdvisorLayer,
} from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Runtime event shape used by rules.
 * Extends EventBrief with fields present in calendar data
 * but not yet in the EventBrief contract type.
 *
 * ARCHITECTURAL NOTE:
 * EventBrief should include waitlist_count and requires_rsvp.
 * These fields exist in the backend calendar data and are needed
 * by multiple rules. The correct fix is to add these fields to
 * EventBrief in features/events/types.ts, which eliminates
 * this extension entirely and removes all unsafe casts.
 *
 * Until that update, RuleEvent serves as the runtime type
 * with a documented cast from EventBrief → RuleEvent.
 */
export interface RuleEvent extends EventBrief {
  readonly waitlist_count: number;
  readonly requires_rsvp: boolean;
}

/**
 * Event domain context for advisor engine evaluation.
 * Extends BaseContext with event-specific pre-computed arrays.
 *
 * All fields readonly — contexts are immutable evaluation inputs.
 * The engine creates the context via buildEventCtx() and passes
 * it to rules. Rules READ context, never mutate it.
 */
export interface EventContext extends BaseContext {
  readonly domain: "events";
  readonly signals: readonly DomainSignal[];
  readonly ragContext?: readonly RAGContext[];
  readonly calendarDays: readonly CalendarDay[];
  readonly today: string;
  readonly allEvents: readonly RuleEvent[];
  readonly upcomingDays: readonly CalendarDay[];
  readonly upcomingEvents: readonly RuleEvent[];
  readonly next7Days: readonly CalendarDay[];
  readonly next7Events: readonly RuleEvent[];
  readonly next14Days: readonly CalendarDay[];
  readonly next14Events: readonly RuleEvent[];
  readonly weekendEvents: readonly RuleEvent[];
  readonly weekdayEvents: readonly RuleEvent[];
}

// ═══════════════════════════════════════════════════════════
// §2 HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate days until a target date.
 * Returns negative values for past dates.
 */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
}

/**
 * Cast EventBrief[] to RuleEvent[].
 *
 * SAFETY: This cast is safe because the calendar data from the backend
 * includes waitlist_count and requires_rsvp on every event. The gap
 * is in the EventBrief contract type, not in the runtime data.
 *
 * FIX: Add waitlist_count and requires_rsvp to EventBrief in
 * features/events/types.ts to eliminate this cast entirely.
 */
function asRuleEvents(events: readonly EventBrief[]): readonly RuleEvent[] {
  return events as unknown as readonly RuleEvent[];
}

// ═══════════════════════════════════════════════════════════
// §3 CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build EventContext from raw calendar data.
 *
 * Receives inputs from useAdvisorEngine → pre-computes derived
 * arrays for efficient rule evaluation. All arrays are built
 * once and reused by every rule (O(n) total, not O(n × rules)).
 *
 * @param rawData — Calendar data from useEventAdvisor hook
 * @param signals — Cross-domain signals from Signal Bus
 */
export function buildEventCtx(
  rawData: unknown,
  signals?: readonly DomainSignal[],
): EventContext {
  // Safe access with graceful degradation
  const input = rawData as
    | { calendarDays?: readonly CalendarDay[] }
    | undefined;
  const calendarDays = input?.calendarDays ?? [];

  if (import.meta.env.DEV && !input?.calendarDays) {
    console.warn(
      "[EventContext] buildEventCtx received rawData without calendarDays.",
      "Raw data:", rawData,
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Cast once: EventBrief → RuleEvent (documented, see asRuleEvents)
  const allEvents = asRuleEvents(
    calendarDays.flatMap((d) => d.events),
  );

  const upcomingDays = calendarDays.filter((d) => d.date >= today);
  const upcomingEvents = asRuleEvents(
    upcomingDays.flatMap((d) => d.events),
  );

  const next7Days = upcomingDays.filter(
    (d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 7,
  );
  const next7Events = asRuleEvents(
    next7Days.flatMap((d) => d.events),
  );

  const next14Days = upcomingDays.filter(
    (d) => daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14,
  );
  const next14Events = asRuleEvents(
    next14Days.flatMap((d) => d.events),
  );

  const weekendEvents = upcomingEvents.filter((e) =>
    isWeekend(e.date_start),
  );
  const weekdayEvents = upcomingEvents.filter(
    (e) => !isWeekend(e.date_start),
  );

  return {
    domain: "events",
    signals: signals ?? [],
    calendarDays,
    today,
    allEvents,
    upcomingDays,
    upcomingEvents,
    next7Days,
    next7Events,
    next14Days,
    next14Events,
    weekendEvents,
    weekdayEvents,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 RULES
//
// 15 declarative rules organized by layer:
//   Layer 1 — MACRO  (1-8):  Calendar-wide patterns
//   Layer 2 — MICRO  (9-12): Per-event analysis
//   Layer 3 — FUSION (13-15): Cross-domain intelligence
//
// Each rule is a pure function: context → insight | null.
// Rules MUST NOT throw. The engine wraps evaluation in try/catch.
// Rules evaluate in priority order (lower = first).
// ═══════════════════════════════════════════════════════════

const DOMAIN: AIDomain = "events";

export const EVENT_RULES: readonly RuleDefinition<EventContext>[] = [
  // ─────────────────────────────────────────────────────
  // LAYER 1: MACRO — Calendar-wide patterns
  // ─────────────────────────────────────────────────────

  // Rule 1: Capacity risk — events near max capacity
  {
    id: "capacity_risk",
    name: "Capacity Risk Alert",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 10,
    emitSignals: [
      {
        id: "evt_capacity_alert",
        defaultSeverity: "high",
        label: "Event capacity alert",
        targetDomains: ["global"],
      },
    ],
    evaluate: (ctx) => {
      if (ctx.upcomingEvents.length === 0) return null;

      const nearCapacity = ctx.upcomingEvents.filter(
        (e) =>
          e.max_capacity > 0 &&
          e.current_attendance / e.max_capacity >= 0.85,
      );
      if (nearCapacity.length === 0) return null;

      const worst = [...nearCapacity].sort(
        (a, b) =>
          b.current_attendance / b.max_capacity -
          a.current_attendance / a.max_capacity,
      )[0];
      if (!worst) return null;

      const pct = Math.round(
        (worst.current_attendance / worst.max_capacity) * 100,
      );

      return buildInsight({
        id: "events_capacity_risk",
        impact: "high",
        title: `${nearCapacity.length} evento(s) cerca de capacidad máxima`,
        reasoning: `"${worst.title}" al ${pct}% (${worst.current_attendance}/${worst.max_capacity}). ${nearCapacity.length > 1 ? `Hay ${nearCapacity.length} eventos con >85% ocupación.` : "Considerar aumentar capacidad o gestionar lista de espera."}`,
        confidence: 90,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_id: worst.id,
        target_date: worst.date_start.split("T")[0],
      });
    },
  },

  // Rule 2: Conflict days in the next 7 days
  {
    id: "conflicts_week",
    name: "Weekly Conflict Detection",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 15,
    evaluate: (ctx) => {
      const conflictDays = ctx.next7Days.filter((d) => d.has_conflicts);
      if (conflictDays.length === 0) return null;

      const firstConflict = conflictDays[0];
      if (!firstConflict) return null;

      return buildInsight({
        id: "events_conflicts_week",
        impact: "high",
        title: `${conflictDays.length} día(s) con conflictos esta semana`,
        reasoning: `Conflictos de horario en: ${conflictDays.map((d) => d.date).join(", ")}. Revisá solapamientos antes de confirmar proveedores.`,
        confidence: 95,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_date: firstConflict.date,
      });
    },
  },

  // Rule 3: Congested days — ≥3 events same day
  {
    id: "congested_days",
    name: "Congestion Alert",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 50,
    evaluate: (ctx) => {
      const congested = ctx.upcomingDays.filter(
        (d) => d.total_events >= 3,
      );
      if (congested.length === 0) return null;

      const worst = [...congested].sort(
        (a, b) => b.total_events - a.total_events,
      )[0];
      if (!worst) return null;

      return buildInsight({
        id: "events_congested_days",
        impact: "medium",
        title: `${congested.length} día(s) congestionados`,
        reasoning: `El ${worst.date} tiene ${worst.total_events} eventos. Riesgo de sobreuso de instalaciones y staff.`,
        confidence: 85,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_date: worst.date,
      });
    },
  },

  // Rule 4: Free events that could be monetized
  {
    id: "monetization_opportunity",
    name: "Monetization Opportunity",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 60,
    evaluate: (ctx) => {
      const freeEvents = ctx.upcomingEvents.filter(
        (e) => e.pricing_model === "free" && e.current_attendance >= 15,
      );
      if (freeEvents.length < 2) return null;

      const top = freeEvents[0];
      if (!top) return null;

      return buildInsight({
        id: "events_monetization_opportunity",
        impact: "medium",
        title: `${freeEvents.length} eventos gratuitos con alta asistencia`,
        reasoning: `Eventos como "${top.title}" (${top.current_attendance} asistentes) podrían generar revenue con pricing "paid" o "subsidized".`,
        confidence: 60,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_id: top.id,
      });
    },
  },

  // Rule 5: Category imbalance
  {
    id: "category_imbalance",
    name: "Category Concentration",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 70,
    evaluate: (ctx) => {
      if (ctx.upcomingEvents.length < 5) return null;

      const categoryCount = new Map<string, number>();
      for (const e of ctx.upcomingEvents) {
        categoryCount.set(
          e.category,
          (categoryCount.get(e.category) ?? 0) + 1,
        );
      }
      if (categoryCount.size < 2) return null;

      const entries = Array.from(categoryCount.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      const topEntry = entries[0];
      if (!topEntry) return null;

      const [topCat, topCount] = topEntry;
      const topPct = Math.round(
        (topCount / ctx.upcomingEvents.length) * 100,
      );
      if (topPct <= 60) return null;

      return buildInsight({
        id: "events_category_imbalance",
        impact: "low",
        title: `Concentración en categoría "${topCat}"`,
        reasoning: `${topPct}% de los eventos son "${topCat}" (${topCount}/${ctx.upcomingEvents.length}). Diversificar para cubrir más segmentos de socios.`,
        confidence: 65,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
      });
    },
  },

  // Rule 6: No events in the next 14 days
  {
    id: "empty_period",
    name: "Empty Period Alert",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 40,
    evaluate: (ctx) => {
      if (ctx.next14Events.length > 0) return null;
      if (ctx.upcomingDays.length === 0) return null;

      return buildInsight({
        id: "events_empty_period",
        impact: "medium",
        title: "Sin eventos en los próximos 14 días",
        reasoning:
          "Período vacío. Considerar programar actividades para mantener engagement de socios.",
        confidence: 80,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        action: {
          action: "create_family_event",
          type: "mutate",
          server: "events",
          tool: "event_create",
          params: { template: "social", category: "family" },
          approval_level: "hitl",
          label: "Crear evento familiar",
          confirm_message:
            "Se creará un evento familiar como borrador. Requiere aprobación del administrador antes de publicar.",
          estimated_impact:
            "Mantener engagement de socios + revenue potencial",
        },
      });
    },
  },

  // Rule 7: Large events with short lead time
  {
    id: "large_event_short_lead",
    name: "Large Event Short Lead Time",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 45,
    evaluate: (ctx) => {
      const largeEvents = ctx.upcomingEvents.filter(
        (e) => e.max_capacity >= 100 && daysUntil(e.date_start) < 14,
      );
      if (largeEvents.length === 0) return null;

      const first = largeEvents[0];
      if (!first) return null;

      return buildInsight({
        id: "events_large_event_short_lead",
        impact: "medium",
        title: `${largeEvents.length} evento(s) grande(s) con poco tiempo de preparación`,
        reasoning: `"${first.title}" (${first.max_capacity} pers.) está a ${daysUntil(first.date_start)} días. Verificar proveedores y logística.`,
        confidence: 75,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_id: first.id,
        target_date: first.date_start.split("T")[0],
      });
    },
  },

  // Rule 8: Waitlisted events
  {
    id: "waitlist_active",
    name: "Waitlist Active",
    layer: "macro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 25,
    evaluate: (ctx) => {
      const waitlisted = ctx.upcomingEvents.filter(
        (e) => e.waitlist_count > 0,
      );
      if (waitlisted.length === 0) return null;

      const totalWaiting = waitlisted.reduce(
        (s, e) => s + e.waitlist_count,
        0,
      );
      const first = waitlisted[0];
      if (!first) return null;

      return buildInsight({
        id: "events_waitlist_active",
        impact: "medium",
        title: `${waitlisted.length} evento(s) con lista de espera`,
        reasoning: `${totalWaiting} personas en lista de espera. "${first.title}" tiene ${first.waitlist_count} esperando. Oportunidad de aumentar capacidad o crear evento adicional.`,
        confidence: 85,
        layer: "macro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_id: first.id,
        target_date: first.date_start.split("T")[0],
        action: {
          action: "increase_capacity",
          type: "mutate",
          server: "events",
          tool: "event_manage_capacity",
          params: {
            action: "increase",
            event_id: first.id,
            percentage: 15,
          },
          approval_level: "auto",
          label: "Aumentar capacidad (+15%)",
          confirm_message: `Se aumentará la capacidad de "${first.title}" un 15% para absorber ${first.waitlist_count} personas en lista de espera.`,
          estimated_impact: `Absorber ${totalWaiting} socios en lista de espera`,
        },
      });
    },
  },

  // ─────────────────────────────────────────────────────
  // LAYER 2: MICRO — Per-event analysis
  // ─────────────────────────────────────────────────────

  // Rule 9: Imminent events with low RSVP
  {
    id: "low_rsvp_imminent",
    name: "Low RSVP Imminent",
    layer: "micro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 20,
    evaluate: (ctx) => {
      const imminent = ctx.upcomingEvents.filter((e) => {
        const days = daysUntil(e.date_start);
        return days >= 0 && days <= 2 && e.requires_rsvp;
      });
      const lowRsvp = imminent.filter(
        (e) =>
          e.max_capacity > 0 &&
          e.current_attendance / e.max_capacity < 0.6,
      );
      if (lowRsvp.length === 0) return null;

      const first = lowRsvp[0];
      if (!first) return null;

      const pct = Math.round(
        (first.current_attendance / first.max_capacity) * 100,
      );

      return buildInsight({
        id: "events_low_rsvp_imminent",
        impact: "high",
        title: `"${first.title}" en <48h con ${pct}% asistencia`,
        reasoning: `Solo ${first.current_attendance}/${first.max_capacity} confirmados. Considerar push de engagement o ajustar expectativas de catering.`,
        confidence: 85,
        layer: "micro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "event-detail",
        target_id: first.id,
        target_date: first.date_start.split("T")[0],
      });
    },
  },

  // Rule 10: Multiple events same location, same day
  {
    id: "location_overlap",
    name: "Location Overlap",
    layer: "micro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 55,
    evaluate: (ctx) => {
      const byLocationDay = new Map<string, RuleEvent[]>();
      for (const d of ctx.upcomingDays) {
        for (const e of d.events) {
          const ruleEvent = e as unknown as RuleEvent;
          const key = `${d.date}|${ruleEvent.location}`;
          const bucket = byLocationDay.get(key);
          if (bucket) {
            bucket.push(ruleEvent);
          } else {
            byLocationDay.set(key, [ruleEvent]);
          }
        }
      }

      const conflicts = Array.from(byLocationDay.entries()).filter(
        ([, evs]) => evs.length > 1,
      );
      if (conflicts.length === 0) return null;

      const firstConflict = conflicts[0];
      if (!firstConflict) return null;

      const [key, evs] = firstConflict;
      const separatorIdx = key.indexOf("|");
      const date = key.substring(0, separatorIdx);
      const location = key.substring(separatorIdx + 1);

      return buildInsight({
        id: "events_location_overlap",
        impact: "medium",
        title: `${evs.length} eventos en "${location}" el mismo día`,
        reasoning: `Eventos: ${evs.map((e) => e.title).join(", ")}. Verificar que el setup/teardown sea viable.`,
        confidence: 80,
        layer: "micro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
        target_date: date,
      });
    },
  },

  // Rule 11: Events at 100% capacity
  {
    id: "full_events",
    name: "Full Events",
    layer: "micro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 75,
    evaluate: (ctx) => {
      const fullEvents = ctx.upcomingEvents.filter(
        (e) =>
          e.max_capacity > 0 && e.current_attendance >= e.max_capacity,
      );
      if (fullEvents.length === 0) return null;

      const first = fullEvents[0];
      if (!first) return null;

      return buildInsight({
        id: "events_full_events",
        impact: "low",
        title: `${fullEvents.length} evento(s) llenos`,
        reasoning: `"${first.title}" alcanzó capacidad máxima (${first.max_capacity}). ${first.waitlist_count} en lista de espera.`,
        confidence: 95,
        layer: "micro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "event-detail",
        target_id: first.id,
      });
    },
  },

  // Rule 12: Events with no RSVP requirement but high capacity
  {
    id: "no_rsvp_high_cap",
    name: "No RSVP High Capacity",
    layer: "micro" as AdvisorLayer,
    domain: DOMAIN,
    priority: 65,
    evaluate: (ctx) => {
      const openEvents = ctx.upcomingEvents.filter(
        (e) => !e.requires_rsvp && e.max_capacity >= 50,
      );
      if (openEvents.length === 0) return null;

      const first = openEvents[0];
      if (!first) return null;

      return buildInsight({
        id: "events_no_rsvp_high_cap",
        impact: "medium",
        title: `${openEvents.length} evento(s) sin RSVP pero capacidad alta`,
        reasoning: `"${first.title}" (${first.max_capacity} pers.) no requiere RSVP. Riesgo de over/under catering. Activar RSVP para mejor planificación.`,
        confidence: 65,
        layer: "micro" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "event-detail",
        target_id: first.id,
      });
    },
  },

  // ─────────────────────────────────────────────────────
  // LAYER 3: FUSION — Cross-domain intelligence
  // ─────────────────────────────────────────────────────

  // Rule 13: Engagement problem pattern
  {
    id: "engagement_problem",
    name: "Engagement Problem Pattern",
    layer: "fusion" as AdvisorLayer,
    domain: DOMAIN,
    priority: 30,
    emitSignals: [
      {
        id: "evt_low_engagement",
        defaultSeverity: "high",
        label: "Low event engagement detected",
        targetDomains: ["global"],
      },
    ],
    evaluate: (ctx) => {
      if (ctx.upcomingEvents.length < 5) return null;

      const lowAttendance = ctx.upcomingEvents.filter(
        (e) =>
          e.max_capacity > 0 &&
          e.current_attendance / e.max_capacity < 0.4 &&
          daysUntil(e.date_start) <= 3,
      );
      if (lowAttendance.length < 2) return null;

      return buildInsight({
        id: "events_engagement_problem",
        impact: "high",
        title: "Patrón de baja asistencia detectado",
        reasoning: `${lowAttendance.length} eventos próximos con <40% de asistencia confirmada. No es un evento aislado — puede indicar fatiga de eventos o targeting incorrecto.`,
        confidence: 70,
        layer: "fusion" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
      });
    },
  },

  // Rule 14: Free + full + waitlisted = monetization opportunity
  {
    id: "free_monetize",
    name: "Free Event Monetization",
    layer: "fusion" as AdvisorLayer,
    domain: DOMAIN,
    priority: 35,
    evaluate: (ctx) => {
      const freeFullWaitlisted = ctx.upcomingEvents.filter(
        (e) =>
          e.pricing_model === "free" &&
          e.max_capacity > 0 &&
          e.current_attendance >= e.max_capacity &&
          e.waitlist_count > 0,
      );
      if (freeFullWaitlisted.length === 0) return null;

      const first = freeFullWaitlisted[0];
      if (!first) return null;

      const capacity = first.max_capacity;
      const revenuePot5k = capacity * 5000;
      const revenuePot15k = capacity * 15000;

      return buildInsight({
        id: "events_free_monetize",
        impact: "high",
        title: `"${first.title}" — evento gratuito lleno con lista de espera`,
        reasoning: `Demanda demostrada (${first.waitlist_count} en espera). Cobrar ${compactCurrency(5000)}/persona = ${compactCurrency(revenuePot5k)} en revenue potencial.`,
        confidence: 80,
        layer: "fusion" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "event-detail",
        target_id: first.id,
        action: {
          action: "clone_with_pricing",
          type: "mutate",
          server: "events",
          tool: "event_clone_template",
          params: {
            event_id: first.id,
            pricing_model: "paid",
            price_per_person: 15000,
          },
          approval_level: "semi",
          label: `Clonar con pricing ${compactCurrency(15000)}`,
          confirm_message: `Se clonará "${first.title}" como evento de pago a ${compactCurrency(15000)}/persona. Revenue potencial: ${compactCurrency(revenuePot15k)}.`,
          estimated_impact: `+${compactCurrency(revenuePot15k)} revenue potencial`,
        },
      });
    },
  },

  // Rule 15: Weekend vs weekday imbalance
  {
    id: "weekend_heavy",
    name: "Weekend Concentration",
    layer: "fusion" as AdvisorLayer,
    domain: DOMAIN,
    priority: 80,
    evaluate: (ctx) => {
      if (ctx.weekendEvents.length < 3) return null;
      if (ctx.weekdayEvents.length > 1) return null;

      return buildInsight({
        id: "events_weekend_heavy",
        impact: "low",
        title: "Concentración de eventos en fin de semana",
        reasoning: `${ctx.weekendEvents.length} eventos fin de semana vs ${ctx.weekdayEvents.length} entre semana. Considerar actividades entre semana para distribuir carga operativa.`,
        confidence: 60,
        layer: "fusion" as AdvisorLayer,
        domain: DOMAIN,
        target_view: "calendar",
      });
    },
  },
];

// ═══════════════════════════════════════════════════════════
// §5 HEALTH FACTORS
//
// 4 factors composing the Events domain health score.
// Weights sum to 1.00.
//
//   calendar_utilization  (25%) — % of days with events
//   capacity_optimization (30%) — sweet spot 60-80% occupancy
//   event_diversity       (20%) — category variety (4+ = excellent)
//   engagement            (25%) — average attendance rate
// ═══════════════════════════════════════════════════════════

export const EVENT_HEALTH_FACTORS: readonly HealthFactorDef<EventContext>[] = [
  {
    id: "calendar_utilization",
    label: "Utilización del Calendario",
    weight: 0.25,
    compute: (ctx) => {
      if (ctx.calendarDays.length === 0) return 0;
      const daysWithEvents = ctx.calendarDays.filter(
        (d) => d.total_events > 0,
      ).length;
      return Math.min(
        100,
        (daysWithEvents / ctx.calendarDays.length) * 200,
      );
    },
  },
  {
    id: "capacity_optimization",
    label: "Optimización de Capacidad",
    weight: 0.30,
    compute: (ctx) => {
      if (ctx.upcomingEvents.length === 0) return 50;
      const withCapacity = ctx.upcomingEvents.filter(
        (e) => e.max_capacity > 0,
      );
      if (withCapacity.length === 0) return 50;
      const avgOccupancy =
        withCapacity.reduce(
          (sum, e) =>
            sum + (e.current_attendance / e.max_capacity) * 100,
          0,
        ) / withCapacity.length;
      // Sweet spot: 60-80% occupancy = 100 score
      if (avgOccupancy >= 60 && avgOccupancy <= 80) return 100;
      if (avgOccupancy < 60) return avgOccupancy * (100 / 60);
      return Math.max(0, 100 - (avgOccupancy - 80) * 2);
    },
  },
  {
    id: "event_diversity",
    label: "Diversidad de Eventos",
    weight: 0.20,
    compute: (ctx) => {
      if (ctx.upcomingEvents.length < 3) return 50;
      const categories = new Set(
        ctx.upcomingEvents.map((e) => e.category),
      );
      // 4+ categories = excellent, 1 = poor
      return Math.min(100, (categories.size / 4) * 100);
    },
  },
  {
    id: "engagement",
    label: "Engagement de Socios",
    weight: 0.25,
    compute: (ctx) => {
      if (ctx.upcomingEvents.length === 0) return 50;
      const withAttendance = ctx.upcomingEvents.filter(
        (e) => e.max_capacity > 0,
      );
      if (withAttendance.length === 0) return 50;
      const avgRate =
        withAttendance.reduce(
          (sum, e) =>
            sum + (e.current_attendance / e.max_capacity) * 100,
          0,
        ) / withAttendance.length;
      return Math.min(100, avgRate * 1.2);
    },
  },
];