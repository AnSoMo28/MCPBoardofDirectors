/**
 * @hook useAdvisorBanner (Fase 24)
 * @module shared/hooks
 * @exports useAdvisorBanner, type ActionState, type UseAdvisorBannerReturn
 * @note Advisor banner state: expand/collapse, per-insight expand,
 *       action execution with retry + auto-reset, derived computations.
 */

import { useState, useCallback, useEffect } from "react";
import type { BaseInsight, LayerConfig } from "@/shared/components/AdvisorBanner";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type ActionState = "idle" | "executing" | "done" | "error";

export interface UseAdvisorBannerReturn<T extends BaseInsight> {
  expanded: boolean;
  expandedInsight: string | null;
  actionStates: Record<string, ActionState>;
  visibleInsights: T[];
  hiddenCount: number;
  activeLayers: string[];
  toggleBanner: () => void;
  toggleInsight: (id: string) => void;
  executeAction: (insight: T) => void;
  retryAction: (insight: T) => void;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function useAdvisorBanner<T extends BaseInsight>(
  insights: T[],
  topInsights: T[],
  layerConfig: Record<string, LayerConfig>,
  onExecute?: (insight: T) => void,
): UseAdvisorBannerReturn<T> {
  /* ── State ── */
  const [expanded, setExpanded] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [actionStates, setActionStates] = useState<
    Record<string, ActionState>
  >({});

  /* ── Derived ── */
  const visibleInsights = expanded ? insights : topInsights;
  const hiddenCount = Math.max(0, insights.length - topInsights.length);

  const activeLayers = Object.keys(layerConfig).filter((layer) =>
    insights.some((i) => i.layer === layer),
  );

  /* ── Banner expand/collapse ── */
  const toggleBanner = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  /* ── Per-insight expand/collapse ── */
  const toggleInsight = useCallback((id: string) => {
    setExpandedInsight((prev) => (prev === id ? null : id));
  }, []);

/* ── Action execution ── */
  const executeAction = useCallback(
    (insight: T) => {
      if (!insight.action || !onExecute) return;

      setActionStates((prev) => ({ ...prev, [insight.id]: "executing" }));

      /* Promise.resolve() normalizes void → resolved Promise */
      Promise.resolve(onExecute(insight))
        .then(() => {
          setActionStates((prev) => ({ ...prev, [insight.id]: "done" }));
        })
        .catch(() => {
          setActionStates((prev) => ({ ...prev, [insight.id]: "error" }));
          if (import.meta.env.DEV) {
            console.error(
              `[AdvisorBanner] Action failed for insight ${insight.id}`,
            );
          }
        });
    },
    [onExecute],
  );

  /* ── Retry (reset to idle, then re-execute) ── */
  const retryAction = useCallback(
    (insight: T) => {
      setActionStates((prev) => ({ ...prev, [insight.id]: "idle" }));
      /* Defer to next tick so state updates before re-execute */
      setTimeout(() => executeAction(insight), 0);
    },
    [executeAction],
  );

  /* ── Auto-reset "done" state after 3s ── */
  useEffect(() => {
    const doneIds = Object.entries(actionStates)
      .filter(([, state]) => state === "done")
      .map(([id]) => id);

    if (doneIds.length === 0) return;

    const timer = setTimeout(() => {
      setActionStates((prev) => {
        const next = { ...prev };
        doneIds.forEach((id) => {
          if (next[id] === "done") next[id] = "idle";
        });
        return next;
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [actionStates]);

  return {
    expanded,
    expandedInsight,
    actionStates,
    visibleInsights,
    hiddenCount,
    activeLayers,
    toggleBanner,
    toggleInsight,
    executeAction,
    retryAction,
  };
}