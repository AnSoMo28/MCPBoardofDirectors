/**
 * Advisor Helpers — Cultural Domain
 *
 * Pure utility functions used by advisor rule modules.
 * No hooks, no state, no side effects, no React imports.
 *
 * Functions:
 * — Shannon entropy for distribution diversity measurement
 * — Insight sorting (severity → impact)
 * — Trigger factory for AI narrative generation
 * — Impact scoring standardization
 *
 * @module cultural/lib/advisor/helpers
 */

import { ADVISOR_TRIGGER_CONFIG } from '../../config';
import type {
  CulturalAdvisorInsight,
  AdvisorSeverity,
  InsightTrigger,
} from './types';
import { SEVERITY_ORDER } from './types';

// ══════════════════════════════════════════════════════════
//  1. MATHEMATICAL HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Shannon entropy for distribution diversity measurement.
 *
 * Returns 0 for maximally concentrated (all items in one bucket)
 * and log2(n) for perfectly uniform distribution across n buckets.
 *
 * Used by R1 (category diversity) and R12 (budget diversification).
 *
 * @param counts — Array of non-negative numbers representing distribution.
 * @returns Entropy value in bits.
 */
export function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return 0;

  return counts.reduce((entropy, count) => {
    if (count === 0) return entropy;
    const p = count / total;
    return entropy - p * Math.log2(p);
  }, 0);
}

/**
 * Normalizes Shannon entropy to a 0-100 scale.
 *
 * @param counts — Distribution array.
 * @param maxCategories — Maximum possible categories (determines max entropy).
 * @returns Score 0-100 where 100 = perfectly diverse.
 */
export function normalizedDiversityScore(
  counts: number[],
  maxCategories: number,
): number {
  const entropy = shannonEntropy(counts);
  const maxEntropy = Math.log2(maxCategories);
  if (maxEntropy === 0) return 0;
  return Math.min(100, Math.round((entropy / maxEntropy) * 100));
}

// ══════════════════════════════════════════════════════════
//  2. SORTING & FILTERING
// ══════════════════════════════════════════════════════════

/**
 * Sorts insights by severity (high → medium → low), then by impact (desc).
 *
 * This is the canonical sort order for the Intelligence Stream.
 * High-severity insights always appear first, regardless of impact.
 * Within the same severity, higher impact sorts first.
 *
 * @param insights — Array of insights to sort.
 * @returns New sorted array (does not mutate input).
 */
export function sortBySeverityImpact(
  insights: CulturalAdvisorInsight[],
): CulturalAdvisorInsight[] {
  return [...insights].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.impact - a.impact;
  });
}

/**
 * Filters insights by minimum severity.
 *
 * @param insights — Array of insights to filter.
 * @param minSeverity — Minimum severity to include.
 * @returns Filtered array (does not mutate input).
 */
export function filterByMinSeverity(
  insights: CulturalAdvisorInsight[],
  minSeverity: AdvisorSeverity,
): CulturalAdvisorInsight[] {
  const minOrder = SEVERITY_ORDER[minSeverity];
  return insights.filter((i) => SEVERITY_ORDER[i.severity] <= minOrder);
}

// ══════════════════════════════════════════════════════════
//  3. TRIGGER FACTORY
// ══════════════════════════════════════════════════════════

/**
 * Creates a standardized trigger for AI narrative generation.
 *
 * When an insight fires, the trigger tells the system how to
 * request a richer narrative from the advisor_intelligence server.
 *
 * Uses ADVISOR_TRIGGER_CONFIG from config.ts — no hardcoded values.
 *
 * @param ruleId — The rule identifier (e.g., 'cultural-r1-diversity').
 * @param data — Contextual data for the narrative engine.
 * @returns InsightTrigger or undefined if narrative generation is not configured.
 */
export function makeTrigger(
  ruleId: string,
  data: Record<string, unknown>,
): InsightTrigger {
  const cfg = ADVISOR_TRIGGER_CONFIG;
  return {
    server: cfg.server,
    tool: cfg.tool,
    params: {
      insight_data: { rule: ruleId, ...data },
      context: cfg.context,
      role: cfg.role,
    },
    insightData: { rule: ruleId, ...data },
  };
}

// ══════════════════════════════════════════════════════════
//  4. STANDARDIZED IMPACT SCORING
// ══════════════════════════════════════════════════════════

/**
 * Computes impact score from distance to a threshold.
 *
 * The further below the threshold, the higher the impact.
 * Used by rules that have a minimum acceptable value.
 *
 * Formula: impact = 100 - (value / threshold * 100), clamped to 0-100.
 *
 * @param value — Current metric value.
 * @param threshold — Minimum acceptable value.
 * @returns Impact score 0-100.
 */
export function impactFromThreshold(
  value: number,
  threshold: number,
): number {
  if (threshold <= 0) return 50;
  return Math.max(0, Math.min(100, Math.round(100 - (value / threshold) * 100)));
}

/**
 * Computes impact score from a declining trend.
 *
 * @param currentValue — Current metric value.
 * @param trendPct — Trend percentage (negative = declining).
 * @param baseImpact — Base impact when trend is flat.
 * @returns Impact score 0-100.
 */
export function impactFromTrend(
  _currentValue: number,
  trendPct: number,
  baseImpact: number = 40,
): number {
  const trendImpact = Math.abs(trendPct) * 5;
  return Math.min(100, Math.round(trendImpact + baseImpact));
}

/**
 * Computes impact from count relative to expected range.
 *
 * @param count — Current count.
 * @param optimalMin — Minimum of optimal range.
 * @param optimalMax — Maximum of optimal range.
 * @returns Impact score 0-100. Higher when further from optimal.
 */
export function impactFromRange(
  count: number,
  optimalMin: number,
  optimalMax: number,
): number {
  if (count >= optimalMin && count <= optimalMax) return 0;
  const mid = (optimalMin + optimalMax) / 2;
  const distance = Math.abs(count - mid);
  const rangeSize = (optimalMax - optimalMin) / 2;
  return Math.min(100, Math.round((distance / Math.max(1, rangeSize)) * 40));
}

/**
 * Severity escalation based on a metric crossing thresholds.
 *
 * @param value — The metric value.
 * @param highThreshold — Below this = 'high' severity.
 * @param mediumThreshold — Below this = 'medium' severity.
 * @returns Severity level.
 */
export function severityFromThresholds(
  value: number,
  highThreshold: number,
  mediumThreshold: number,
): AdvisorSeverity {
  if (value < highThreshold) return 'high';
  if (value < mediumThreshold) return 'medium';
  return 'low';
}

// ══════════════════════════════════════════════════════════
//  5. DESCRIPTION BUILDERS
// ══════════════════════════════════════════════════════════

/**
 * Builds a description for diversity-related insights.
 *
 * @param activeCount — Number of active categories.
 * @param totalCount — Total possible categories.
 * @param topNames — Names of the top-performing categories.
 * @param context — Additional context string.
 */
export function buildDiversityDescription(
  activeCount: number,
  totalCount: number,
  topNames: string[],
  context: string,
): string {
  const missing = totalCount - activeCount;
  const topList = topNames.length > 0
    ? ` Las categorías destacadas (${topNames.join(', ')}) concentran la mayor parte del engagement.`
    : '';
  return `Solo ${activeCount} de ${totalCount} ${context} están activas. ${missing} ${context === 'categorías culturales' ? 'categoría(s)' : 'tipo(s)'} sin presencia.${topList} Diversificar incrementa el engagement cruzado.`;
}

/**
 * Builds a description for utilization-related insights.
 *
 * @param avgUtil — Average utilization rate.
 * @param underusedNames — Names of underused items.
 * @param context — What is being underutilized.
 */
export function buildUtilizationDescription(
  avgUtil: number,
  underusedNames: string[],
  context: string,
): string {
  const underusedList = underusedNames.length > 0
    ? ` ${underusedNames.length} ${context}(s) con baja utilización (${underusedNames.join(', ')}).`
    : '';
  return `Utilización promedio: ${avgUtil.toFixed(0)}%.${underusedList} Cada espacio vacío es una oportunidad de engagement desperdiciada.`;
}

/**
 * Builds a description for trend-related insights.
 *
 * @param trend — Trend direction.
 * @param trendPct — Trend percentage.
 * @param metric — What metric is trending.
 */
export function buildTrendDescription(
  trend: 'up' | 'stable' | 'down',
  trendPct: number,
  metric: string,
): string {
  const direction = trend === 'up' ? 'creciente' : trend === 'down' ? 'a la baja' : 'estable';
  const absPct = Math.abs(trendPct).toFixed(1);
  return `La tendencia de ${metric} es ${direction} (${absPct}%). ${
    trend === 'down'
      ? 'Sin intervención, la relevancia cultural del club se erosiona.'
      : trend === 'stable'
        ? 'El nivel actual es bajo — hay oportunidad de crecimiento.'
        : 'La demanda existe — ampliar la oferta capturaría más engagement.'
  }`;
}