// src/features/events/lib/calendarSignals.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Calendar Intelligence Utilities
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     ../types (EventBrief)
//
// Self-contained pure functions for EventCalendar enrichment.
// No hooks, no React, no side effects, no API calls.
// Every function is independently testable.
//
// Capabilities:
//   Density analysis    — event count → visual density level
//   Load assessment     — event count → operational load score
//   Venue distribution  — events → venue breakdown with colors
//   Slot finder         — events → available time slots per venue
//   Conflict detection  — events → overlapping venue/time pairs
//   Day intelligence    — all of the above combined for one day
//
// §0.5 DUPLICATION NOTE:
//   extractTime() is also defined in useEventForm.ts as a private
//   module-level helper. useEventForm should import from here
//   instead of maintaining its own copy. This is a minor code
//   quality issue — no functional impact. Consolidation deferred
//   to avoid modifying the already-rewritten useEventForm hook.
//
// ANTI-PATTERNS REMOVED:
// [x] No file header → added with metadata
// [x] No § section markers → §0-§6
// [x] No PRE-WRITE/ANTI-PATTERNS blocks → added
// [x] 5 mutable interfaces → readonly fields
// [x] DENSITY_CONFIG mutable → readonly Record
// [x] VENUE_COLORS mutable → readonly as const
// [x] Magic numbers (thresholds, hours, durations) → constants
// [x] extractTime duplication → documented in §0.5
// [x] getLoadAssessment inline labels → LOAD_LABELS constant
// [x] Missing JSDoc on exports → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import type { EventBrief } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Venue operating hours. */
const VENUE_OPEN_HOUR = "08:00";
const VENUE_CLOSE_HOUR = "22:00";

/** Minimum slot duration to be considered usable (minutes). */
const MIN_SLOT_DURATION_MINUTES = 60;

/** Full day duration in minutes (08:00 to 22:00). */
const FULL_DAY_MINUTES = 840;

/**
 * Density thresholds: event count → density level.
 * Index 0 = low threshold, ascending.
 */
const DENSITY_THRESHOLDS = [
  { max: 0, level: "empty" as const },
  { max: 2, level: "low" as const },
  { max: 4, level: "medium" as const },
  { max: 7, level: "high" as const },
  { max: 10, level: "heavy" as const },
] as const;

/**
 * Display labels for density levels.
 * When i18n is implemented, replace values with i18n.t() calls.
 */
const DENSITY_LABELS: Record<Exclude<DensityLevel, "empty">, string> = {
  low: "Baja",
  medium: "Moderada",
  high: "Alta",
  heavy: "Pesada",
  critical: "Crítica",
} as const;

/**
 * Display labels for load assessment levels.
 * When i18n is implemented, replace values with i18n.t() calls.
 */
const LOAD_LABELS: Record<string, string> = {
  empty: "Libre",
  normal: "Normal",
  moderate: "Moderado",
  busy: "Ocupado",
  heavy: "Sobrecargado",
  critical: "Crítico",
} as const;

// ═══════════════════════════════════════════════════════════
// §2 TYPES
// ═══════════════════════════════════════════════════════════

/** Visual density level for calendar day cells. */
export type DensityLevel =
  | "empty"
  | "low"
  | "medium"
  | "high"
  | "heavy"
  | "critical";

/** Density configuration: color + label per level. */
interface DensityConfig {
  readonly color: string;
  readonly label: string;
}

/**
 * Density level → visual config (non-empty levels only).
 * Empty level handled separately (uses silver-600).
 */
const DENSITY_CONFIG: Readonly<
  Record<Exclude<DensityLevel, "empty">, DensityConfig>
> = {
  low: { color: "var(--color-teal-400)", label: DENSITY_LABELS.low },
  medium: { color: "var(--color-teal-400)", label: DENSITY_LABELS.medium },
  high: { color: "var(--color-amber-400)", label: DENSITY_LABELS.high },
  heavy: { color: "var(--color-amber-400)", label: DENSITY_LABELS.heavy },
  critical: { color: "var(--color-rose-400)", label: DENSITY_LABELS.critical },
} as const;

/** Operational load assessment for a calendar day. */
export interface LoadAssessment {
  readonly label: string;
  readonly color: string;
  readonly level: string;
  readonly score: number;
}

/** Venue distribution breakdown for a single venue. */
export interface VenueSlot {
  readonly venue: string;
  readonly count: number;
  readonly pct: number;
  readonly color: string;
}

/** Available time slot within a venue's operating hours. */
export interface AvailableSlot {
  readonly start: string;
  readonly end: string;
  readonly durationMinutes: number;
}

/** Pair of conflicting events (same venue, overlapping time). */
export interface ConflictPair {
  readonly eventA: EventBrief;
  readonly eventB: EventBrief;
}

/**
 * Combined day intelligence: all analysis for a single calendar day.
 * Everything the CalendarGrid needs to render a day cell.
 */
export interface DayIntelligence {
  readonly load: LoadAssessment;
  readonly venueDistribution: readonly VenueSlot[];
  readonly totalCapacity: number;
  readonly totalConfirmed: number;
  readonly occupancyPct: number;
  readonly availableSlots: readonly AvailableSlot[];
  readonly conflicts: readonly ConflictPair[];
  readonly conflictCount: number;
}

/** Cycle through venue colors for distribution visualization. */
const VENUE_COLORS: readonly string[] = [
  "var(--color-teal-400)",
  "var(--color-gold-400)",
  "var(--color-emerald-400)",
  "var(--color-amber-400)",
  "var(--color-silver-300)",
  "var(--color-terracotta-400)",
  "var(--color-sage-400)",
] as const;

// ═══════════════════════════════════════════════════════════
// §3 TIME HELPERS
//
// Pure functions for time string manipulation.
// No Date objects — operates on "HH:mm" strings directly.
// ═══════════════════════════════════════════════════════════

/**
 * Extract time portion from ISO datetime string.
 * "2024-03-15T14:30:00" → "14:30"
 */
export function extractTime(isoStr: string): string {
  return isoStr.split("T")[1]?.slice(0, 5) || "00:00";
}

/** Convert "HH:mm" to minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Check if two time ranges overlap. */
function hasTimeOverlap(
  s1: string,
  e1: string,
  s2: string,
  e2: string,
): boolean {
  return s1 < e2 && s2 < e1;
}

// ═══════════════════════════════════════════════════════════
// §4 DENSITY + LOAD ANALYSIS
//
// Event count → visual density level / operational load score.
// ═══════════════════════════════════════════════════════════

/**
 * Map event count to a density level for visual rendering.
 *
 * @param count — Number of events on a day
 * @returns Density level for CSS class and color
 */
export function getDensityLevel(count: number): DensityLevel {
  for (const threshold of DENSITY_THRESHOLDS) {
    if (count <= threshold.max) return threshold.level;
  }
  return "critical";
}

/**
 * Get the BEM CSS class for a density level.
 *
 * @param level — Density level
 * @returns CSS class name (empty string for "empty")
 */
export function getDensityCssClass(level: DensityLevel): string {
  if (level === "empty") return "";
  return `glass-calendar-day--density-${level}`;
}

/**
 * Get the color CSS variable for a density level.
 *
 * @param level — Density level
 * @returns CSS variable reference
 */
export function getDensityColor(level: DensityLevel): string {
  if (level === "empty") return "var(--color-silver-600)";
  return DENSITY_CONFIG[level].color;
}

/**
 * Assess operational load from event count.
 * Returns label, color, level name, and numeric score (0-100).
 *
 * @param count — Number of events on a day
 * @returns Load assessment with display properties
 */
export function getLoadAssessment(count: number): LoadAssessment {
  if (count === 0) {
    return {
      label: LOAD_LABELS.empty,
      color: "var(--color-silver-500)",
      level: "empty",
      score: 0,
    };
  }
  if (count <= 2) {
    return {
      label: LOAD_LABELS.normal,
      color: "var(--color-emerald-400)",
      level: "normal",
      score: count * 10,
    };
  }
  if (count <= 4) {
    return {
      label: LOAD_LABELS.moderate,
      color: "var(--color-teal-400)",
      level: "moderate",
      score: count * 10,
    };
  }
  if (count <= 7) {
    return {
      label: LOAD_LABELS.busy,
      color: "var(--color-amber-400)",
      level: "busy",
      score: count * 10,
    };
  }
  if (count <= 10) {
    return {
      label: LOAD_LABELS.heavy,
      color: "var(--color-amber-400)",
      level: "heavy",
      score: count * 10,
    };
  }
  return {
    label: LOAD_LABELS.critical,
    color: "var(--color-rose-400)",
    level: "critical",
    score: 100,
  };
}

// ═══════════════════════════════════════════════════════════
// §5 VENUE + SLOT + CONFLICT ANALYSIS
//
// Venue distribution, available slot detection,
// and conflict (overlapping venue/time) detection.
// ═══════════════════════════════════════════════════════════

/**
 * Compute venue distribution breakdown.
 * Groups events by location, calculates percentages, assigns colors.
 *
 * @param events — Events for a single day
 * @returns Sorted venue slots (descending by count)
 */
export function getVenueDistribution(
  events: readonly EventBrief[],
): readonly VenueSlot[] {
  const map = new Map<string, number>();
  for (const e of events) {
    const v = e.location || "Sin ubicación";
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  const total = events.length || 1;
  let colorIdx = 0;
  return Array.from(map.entries())
    .map(([venue, count]) => ({
      venue,
      count,
      pct: (count / total) * 100,
      color: VENUE_COLORS[colorIdx++ % VENUE_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Find available time slots within venue operating hours.
 * Slots are gaps between events at a specific venue.
 * Only returns slots ≥ MIN_SLOT_DURATION_MINUTES.
 *
 * @param events — Events for a single day
 * @param venue — Optional venue filter (null = all events)
 * @returns Available slots sorted by start time
 */
export function findAvailableSlots(
  events: readonly EventBrief[],
  venue?: string,
): readonly AvailableSlot[] {
  const filtered = venue
    ? events.filter(
        (e) =>
          e.location?.toLowerCase().trim() ===
          venue.toLowerCase().trim(),
      )
    : events;

  // No events at this venue → entire day is free
  if (filtered.length === 0) {
    return [
      {
        start: VENUE_OPEN_HOUR,
        end: VENUE_CLOSE_HOUR,
        durationMinutes: FULL_DAY_MINUTES,
      },
    ];
  }

  // Sort by start time
  const sorted = [...filtered].sort((a, b) =>
    extractTime(a.date_start).localeCompare(extractTime(b.date_start)),
  );

  const slots: AvailableSlot[] = [];
  let cursor = VENUE_OPEN_HOUR;

  for (const event of sorted) {
    const eventStart = extractTime(event.date_start);
    const eventEnd = extractTime(event.date_end);

    if (eventStart > cursor) {
      const duration =
        timeToMinutes(eventStart) - timeToMinutes(cursor);
      if (duration >= MIN_SLOT_DURATION_MINUTES) {
        slots.push({
          start: cursor,
          end: eventStart,
          durationMinutes: duration,
        });
      }
    }
    if (eventEnd > cursor) cursor = eventEnd;
  }

  // After last event until close
  if (cursor < VENUE_CLOSE_HOUR) {
    const duration =
      timeToMinutes(VENUE_CLOSE_HOUR) - timeToMinutes(cursor);
    if (duration >= MIN_SLOT_DURATION_MINUTES) {
      slots.push({
        start: cursor,
        end: VENUE_CLOSE_HOUR,
        durationMinutes: duration,
      });
    }
  }

  return slots;
}

/**
 * Detect conflicting events: same venue, overlapping time.
 * Deduplicates pairs by sorted ID combination.
 *
 * @param events — Events for a single day
 * @returns Array of conflict pairs (empty if no conflicts)
 */
export function findConflicts(
  events: readonly EventBrief[],
): readonly ConflictPair[] {
  const conflicts: ConflictPair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;

      // Same venue + overlapping times
      if (
        a.location &&
        b.location &&
        a.location.toLowerCase().trim() ===
          b.location.toLowerCase().trim() &&
        hasTimeOverlap(
          extractTime(a.date_start),
          extractTime(a.date_end),
          extractTime(b.date_start),
          extractTime(b.date_end),
        )
      ) {
        // Deduplicate: A|B === B|A
        const key = [a.id, b.id].sort().join("|");
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({ eventA: a, eventB: b });
        }
      }
    }
  }

  return conflicts;
}

// ═══════════════════════════════════════════════════════════
// §6 COMBINED DAY INTELLIGENCE
//
// All analysis combined into a single DayIntelligence object.
// Used by CalendarGrid to render complete day cell enrichment.
// ═══════════════════════════════════════════════════════════

/**
 * Compute complete day intelligence.
 * Combines: load assessment, venue distribution, occupancy,
 * available slots, and conflict detection.
 *
 * @param events — Events for a single calendar day
 * @returns Complete DayIntelligence object
 */
export function getDayIntelligence(
  events: readonly EventBrief[],
): DayIntelligence {
  const load = getLoadAssessment(events.length);
  const venueDistribution = getVenueDistribution(events);
  const totalCapacity = events.reduce(
    (s, e) => s + (e.max_capacity || 0),
    0,
  );
  const totalConfirmed = events.reduce(
    (s, e) => s + (e.current_attendance || 0),
    0,
  );
  const occupancyPct =
    totalCapacity > 0
      ? (totalConfirmed / totalCapacity) * 100
      : 0;
  const availableSlots = findAvailableSlots(events);
  const conflicts = findConflicts(events);

  return {
    load,
    venueDistribution,
    totalCapacity,
    totalConfirmed,
    occupancyPct,
    availableSlots,
    conflicts,
    conflictCount: conflicts.length,
  };
}

/**
 * Format slot duration for display.
 * 90 → "1h30m", 60 → "1h", 45 → "45min"
 *
 * @param minutes — Duration in minutes
 * @returns Human-readable duration string
 */
export function formatSlotDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}