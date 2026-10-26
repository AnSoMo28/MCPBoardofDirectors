// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Migration Adapter
//
// Converts legacy domain-specific insight shapes to the
// standardized AdvisorInsightBase shape.
//
// During F47 migration, hooks produce AdvisorInsightBase[]
// directly via the engine. This adapter handles any legacy
// shapes that might still exist during the transition.
//
// Post-F47, this file can be removed once all domains
// are migrated to the engine.
//
// Usage:
//   import { legacyToEngineResult } from "@/shared/lib/advisor-engine/migration";
//
//   // In a banner that might receive either shape:
//   const normalized = legacyToEngineResult(rawInsights);
//
// Created: F47 — Migration Support
// ═══════════════════════════════════════════════════════════

import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";

/**
 * Convert legacy domain-specific insights to the base shape.
 *
 * Legacy hooks produced extended types like:
 *   - FinancialAdvisorInsight extends AdvisorInsightBase
 *   - EventAdvisorInsight extends AdvisorInsightBase
 *   - GlobalAdvisorInsight extends AdvisorInsightBase
 *
 * The engine produces AdvisorInsightBase directly.
 * This adapter extracts only the base fields, dropping
 * any domain-specific extensions.
 *
 * @param legacyInsights — Array of legacy insights (any shape extending AdvisorInsightBase)
 * @returns Clean AdvisorInsightBase[] with clamped confidence
 *
 * @example
 * // In a banner during migration:
 * const insights = legacyToEngineResult(
 *   data?.legacy_insights ?? []
 * );
 */
export function legacyToEngineResult<T extends Partial<AdvisorInsightBase>>(
  legacyInsights: T[],
): AdvisorInsightBase[] {
  if (!Array.isArray(legacyInsights)) return [];

  return legacyInsights
    .filter((i) => i != null && i.id && i.title && i.impact)
    .map((insight) => ({
      id: String(insight.id),
      impact: insight.impact ?? "medium",
      title: String(insight.title),
      reasoning: String(insight.reasoning ?? ""),
      confidence: Math.max(0, Math.min(100, insight.confidence ?? 50)),
      action: insight.action,
      target_view: insight.target_view,
      target_id: insight.target_id,
      target_date: insight.target_date,
    }));
}

/**
 * Check if a value looks like an AdvisorResult (engine output)
 * rather than a legacy insight array.
 *
 * Used by banners to detect which shape they received.
 *
 * @param value — Unknown data from hook
 * @returns true if value is an AdvisorResult with .insights array
 *
 * @example
 * if (isEngineResult(data)) {
 *   // New engine shape: { insights, healthScore, signals, meta }
 *   renderEngineBanner(data);
 * } else {
 *   // Legacy shape: AdvisorInsightBase[]
 *   const normalized = legacyToEngineResult(data);
 *   renderLegacyBanner(normalized);
 * }
 */
export function isEngineResult(
  value: unknown,
): value is { insights: AdvisorInsightBase[]; meta: Record<string, unknown> } {
  return (
    value != null &&
    typeof value === "object" &&
    "insights" in value &&
    Array.isArray((value as { insights: unknown }).insights) &&
    "meta" in value
  );
}