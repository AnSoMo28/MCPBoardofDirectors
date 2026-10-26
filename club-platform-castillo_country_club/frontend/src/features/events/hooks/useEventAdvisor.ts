// src/features/events/hooks/useEventAdvisor.ts
// ═══════════════════════════════════════════════════════════
// Events Domain — Advisor Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @namespace   ev-* (events domain)
// @keyframes   0
// @depends     @/shared/lib/advisor-engine, ../types,
//              @/shared/lib/advisor-engine/rules/events
//
// Thin wrapper around AdvisorEngine for the Events domain.
//
// Architecture:
//   Rules:      15 declarative rules (rules/events.ts)
//   Health:     4 factors (utilization, capacity, diversity, engagement)
//   Signals:    evt_capacity_alert, evt_low_engagement → signal bus
//   Data:       0 API calls — consumes calendar data from React Query cache
//
// Signal emission:
//   The AdvisorEngine collects signals in result.signals.
//   This hook emits them to the shared SignalBus via useEffect
//   (post-render, dependency-tracked). This ensures cross-domain
//   signals flow automatically whenever the hook evaluates.
//   This is an INTENTIONAL architecture choice — not a side effect bug.
//
// ANTI-PATTERNS REMOVED:
// [x] Patch comment ("Fase 19 → F47 Rewrite") → removed
// [x] EventAdvisorInsightLayer → EventAdvisorLayer (types.ts rename)
// [x] CalendarDay[] → readonly CalendarDay[]
// [x] Return type → readonly EventAdvisorInsight[]
// [x] rawData new object every render → memoized with stable empty ref
// [x] Spanish hardcoded string → constant with JSDoc i18n note
// [x] signalBus.emit() undocumented → documented as intentional
// [x] Missing § section markers → §0-§4
// [x] Missing JSDoc → added
// [x] Missing file header → added
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import {
  useAdvisorEngine,
  signalBus,
} from "@/shared/lib/advisor-engine";
import type {
  AdvisorConfig,
} from "@/shared/lib/advisor-engine";
import type {
  EventContext,
} from "@/shared/lib/advisor-engine/rules/events";
import {
  buildEventCtx,
  EVENT_RULES,
  EVENT_HEALTH_FACTORS,
} from "@/shared/lib/advisor-engine/rules/events";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

import type {
  CalendarDay,
  EventAdvisorInsight,
  EventAdvisorLayer,
} from "../types";

// ═══════════════════════════════════════════════════════════
// §1 CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Module-level empty array — stable reference for when calendarDays
 * is null/undefined. Prevents creating a new [] on every render.
 */
const EMPTY_CALENDAR: readonly CalendarDay[] = [];

/**
 * Fallback insight displayed when no calendar data is available.
 * i18n note: title and reasoning should use i18n.t() when implemented.
 */
const NO_DATA_INSIGHT: EventAdvisorInsight = {
  id: "no_data",
  layer: "macro",
  domain: "events",
  impact: "low",
  title: "Sin datos de calendario",
  reasoning:
    "No hay eventos en el período actual. Navegá a otro mes o creá nuevos eventos.",
  target_view: "calendar",
  confidence: 100,
};

/**
 * Build ruleId → layer map once at module level.
 * Maps engine rule IDs (prefixed with "events_") to their
 * EventAdvisorLayer for enriched insight rendering.
 */
const RULE_LAYER_MAP = new Map<string, EventAdvisorLayer>(
  EVENT_RULES.map((r) => [`events_${r.id}`, r.layer as EventAdvisorLayer]),
);

// ═══════════════════════════════════════════════════════════
// §2 HOOK
// ═══════════════════════════════════════════════════════════

/**
 * Event domain advisor hook.
 *
 * Wraps useAdvisorEngine with event-specific configuration.
 * Returns enriched EventAdvisorInsight[] with layer metadata
 * for granular dashboard rendering.
 *
 * Side effects:
 *   - Emits cross-domain signals to SignalBus (post-render via useEffect)
 *     This is intentional — ensures signals flow whenever the hook evaluates.
 *
 * @param calendarDays — Calendar data from React Query cache (or null/undefined)
 * @param ragContext   — Optional RAG context for enriched evaluation
 * @returns Enriched advisor insights with event-specific layer metadata
 */
export function useEventAdvisor(
  calendarDays: readonly CalendarDay[] | null | undefined,
  ragContext?: readonly RAGContext[],
): readonly EventAdvisorInsight[] {
  // Stable reference for rules (module-level imports, never change)
  const config = useMemo<AdvisorConfig<EventContext>>(
    () => ({
      domain: "events",
      buildCtx: buildEventCtx,
      rules: EVENT_RULES,
      healthFactors: EVENT_HEALTH_FACTORS,
    }),
    [],
  );

  // Memoize rawData — prevents new object on every render
  // which would cause useAdvisorEngine to re-evaluate unnecessarily
  const rawData = useMemo(
    () => ({ calendarDays: calendarDays ?? EMPTY_CALENDAR }),
    [calendarDays],
  );

  // Engine always called (React hook rules — cannot be conditional)
  const result = useAdvisorEngine<EventContext>(
    config,
    rawData,
    undefined,
    true,
    ragContext,
  );

  // Emit cross-domain signals post-render.
  // INTENTIONAL: ensures signals flow to other domain hooks automatically.
  // The SignalBus deduplicates and manages TTL internally.
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // Build enriched insights with event-specific layer metadata
  return useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) {
      return [NO_DATA_INSIGHT];
    }

    if (!result) return [];

    return result.insights.map((insight) => ({
      ...insight,
      layer: (RULE_LAYER_MAP.get(insight.id) ??
        insight.layer ??
        "macro") as EventAdvisorLayer,
      domain: "events" as const,
    }));
  }, [calendarDays, result]);
}