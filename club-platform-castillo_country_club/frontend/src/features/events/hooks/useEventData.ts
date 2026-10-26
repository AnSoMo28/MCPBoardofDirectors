// src/features/events/hooks/useEventData.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Data Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/hooks/useMCPQuery, ./useEventAdvisor,
//              @/shared/mocks/normalizeEnums, ../types,
//              @/shared/lib/advisor-engine/types
//
// Primary data hook for the Events domain.
// Fetches calendar data via MCP, runs advisor evaluation,
// and returns everything the Events UI needs.
//
// Data flow:
//   useMCPQuery("events", "event_get_calendar")
//     → EventCalendarMCPResponse.data (CalendarDay[])
//     → normalizeEnums (format normalization)
//     → useEventAdvisor (15 rules, health score, signals)
//     → { calendarDays, insights, isLoading, isError, ... }
//
// Key: .data (verified: backend returns { data: CalendarDay[] })
//
// §0.5 ARCHITECTURAL CONCERN:
//   normalizeEnums is imported from @/shared/mocks/.
//   This utility normalizes enum casing from backend responses.
//   Its location in mocks/ is misleading — it's a production
//   utility that handles real backend response formatting.
//   TODO: Move to @/shared/lib/normalizeEnums.ts when touching
//   the shared/ reorganization (FASE 22+).
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("F47-B — Event Data Hook") → removed
// [x] Mutable Options interface → readonly fields
// [x] Mutable return object → readonly interface
// [x] RAGContext[] → readonly RAGContext[]
// [x] Missing § section markers → §0-§3
// [x] Missing file header → added with metadata
// [x] Missing JSDoc → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { normalizeEnums } from "@/shared/mocks/normalizeEnums";
import { useEventAdvisor } from "./useEventAdvisor";
import type { CalendarDay } from "../types";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";
import type { EventAdvisorInsight } from "../types";

// ═══════════════════════════════════════════════════════════
// §1 TYPES
// ═══════════════════════════════════════════════════════════

/**
 * Raw MCP response shape from the events agent.
 * Backend: event_get_calendar tool.
 */
interface EventCalendarMCPResponse {
  readonly status: string;
  readonly message: string;
  readonly data: readonly CalendarDay[];
  readonly total_events: number;
  readonly conflict_days: number;
}

/**
 * Options for useEventData hook.
 * All fields optional with sensible defaults.
 */
export interface UseEventDataOptions {
  /** Whether to enable the query. Default: true */
  readonly enabled?: boolean;

  /** React Query staleTime in ms. Default: 60_000 (1 min) */
  readonly staleTime?: number;

  /** RAG context for enriched advisor evaluation */
  readonly ragContext?: readonly RAGContext[];
}

/**
 * Return type for useEventData hook.
 * Everything the Events UI needs from a single hook call.
 */
export interface UseEventDataReturn {
  /** Advisor-evaluated insights (enriched with event layers) */
  readonly insights: readonly EventAdvisorInsight[];

  /** Parsed calendar days from MCP (null while loading) */
  readonly calendarDays: readonly CalendarDay[] | null;

  /** Whether the initial query is loading */
  readonly isLoading: boolean;

  /** Whether the query errored */
  readonly isError: boolean;

  /** Error object (null if no error) */
  readonly error: Error | null;

  /** Raw React Query result for advanced consumers */
  readonly calendarQuery: ReturnType<typeof useMCPQuery<EventCalendarMCPResponse>>;
}

// ═══════════════════════════════════════════════════════════
// §2 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Primary data hook for the Events domain.
 *
 * Fetches calendar data via MCP, normalizes enums,
 * runs advisor evaluation (15 rules), and returns
 * everything the Events UI needs.
 *
 * @param options — Query options (enabled, staleTime, ragContext)
 * @returns Calendar days, advisor insights, loading/error states
 *
 * @example
 * const { calendarDays, insights, isLoading } = useEventData();
 * if (isLoading) return <Skeleton />;
 * return <EventCalendar days={calendarDays} insights={insights} />;
 */
export function useEventData(
  options: UseEventDataOptions = {},
): UseEventDataReturn {
  const { enabled = true, staleTime = 60_000, ragContext } = options;

  // ── MCP Query ──
  const calendarQuery = useMCPQuery<EventCalendarMCPResponse>(
    "events",
    "event_get_calendar",
    {},
    { staleTime, enabled },
  );

  // ── Normalize response ──
  const calendarDays: readonly CalendarDay[] | null = useMemo(() => {
    if (!calendarQuery.data?.data) return null;
    // normalizeEnums handles backend casing inconsistencies.
    // See §0.5 — this should live in shared/lib/, not shared/mocks/.
    return normalizeEnums(
      calendarQuery.data.data,
      "events.event_get_calendar",
    ) as CalendarDay[];
  }, [calendarQuery.data]);

  // ── Advisor evaluation ──
  // useEventAdvisor wraps useAdvisorEngine with 15 event rules.
  // It handles: insight evaluation, signal emission, health score.
  const insights = useEventAdvisor(calendarDays, ragContext);

  // ── Return ──
  return {
    insights,
    calendarDays,
    isLoading: calendarQuery.isLoading,
    isError: calendarQuery.isError,
    error: calendarQuery.error ?? null,
    calendarQuery,
  };
}