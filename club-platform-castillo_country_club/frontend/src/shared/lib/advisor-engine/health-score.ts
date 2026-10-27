// src/shared/lib/advisor-engine/health-score.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Health Score Composer
//
// Unified health score computation that replaces 6+ independent
// implementations across domains.
//
// Previously:
//   - Financial: 5 factors, custom weights, custom levels
//   - Wellness: 4 factors, different scale
//   - Communication: 5 factors, different thresholds
//   - Sports: score composite with different logic
//   - Facilities: maintenance scoring separate
//   - Satisfaction: satisfaction health separate
//
// Now: One composer, configurable per domain via HealthFactorDef[].
//
// Created: F45 — Architecture Consolidation
// ═══════════════════════════════════════════════════════════

import type {
  BaseContext,
  HealthFactorDef,
  HealthFactorResult,
  HealthFactorStatus,
  HealthScoreResult,
} from "./types";
import type { TrendDirection } from "@/shared/types/domain-enums";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — NORMALIZATION
// ═══════════════════════════════════════════════════════════

/**
 * Normalize a value to 0-100 range.
 * For normal factors: higher raw = higher score.
 */
function normalizeNormal(value: number, min: number, max: number): number {
  if (max === min) return 50; // Avoid division by zero
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/**
 * Normalize an inverse value to 0-100 range.
 * For inverse factors: lower raw = higher score.
 * Example: churn rate 2% is better than churn rate 10%.
 */
function normalizeInverse(value: number, min: number, max: number): number {
  if (max === min) return 50;
  const clamped = Math.max(min, Math.min(max, value));
  return ((max - clamped) / (max - min)) * 100;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — HEALTH LEVELS
// ═══════════════════════════════════════════════════════════

interface HealthLevelConfig {
  grade: "A" | "B" | "C" | "D";
  level: HealthFactorStatus;
  color: string;
  bgColor: string;
  minScore: number;
}

/**
 * Health level thresholds. Uniform across ALL domains.
 *
 * ≥85: A — Excepcional (emerald)
 * ≥65: B — Saludable  (teal)
 * ≥45: C — Atención   (amber)
 * <45: D — Crítico     (rose)
 */
const HEALTH_LEVELS: HealthLevelConfig[] = [
  {
    grade: "A",
    level: "exceptional",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    minScore: 85,
  },
  {
    grade: "B",
    level: "healthy",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    minScore: 65,
  },
  {
    grade: "C",
    level: "attention",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    minScore: 45,
  },
  {
    grade: "D",
    level: "critical",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    minScore: 0,
  },
];

/**
 * Get health level config for a score.
 */
function getHealthLevel(score: number): HealthLevelConfig {
  for (const config of HEALTH_LEVELS) {
    if (score >= config.minScore) return config;
  }
  return HEALTH_LEVELS[HEALTH_LEVELS.length - 1]; // Fallback: D
}

/**
 * Get status for a single factor's normalized value.
 */
function getFactorStatus(normalizedValue: number): HealthFactorStatus {
  if (normalizedValue >= 85) return "exceptional";
  if (normalizedValue >= 65) return "healthy";
  if (normalizedValue >= 45) return "attention";
  return "critical";
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — COMPOSER
// ═══════════════════════════════════════════════════════════

/**
 * Compute a unified health score from domain-specific factors.
 *
 * This is THE single source of truth for health scoring across ALL domains.
 * Each domain provides its own HealthFactorDef[] with compute functions.
 *
 * @param ctx — Domain context (passed to each factor's compute function)
 * @param factors — Array of health factor definitions
 * @returns Complete health score result with per-factor breakdown
 *
 * @example
 * // In useFinancialAdvisor:
 * const healthScore = computeHealthScore(ctx, [
 *   { id: "revenue", label: "Revenue Health", compute: (ctx) => ctx.revenueHealth, weight: 0.3 },
 *   { id: "margin", label: "Margin Health", compute: (ctx) => ctx.marginHealth, weight: 0.25 },
 *   { id: "cashflow", label: "Cash Flow", compute: (ctx) => ctx.cashflowHealth, weight: 0.2 },
 *   { id: "dues", label: "Dues Collection", compute: (ctx) => ctx.duesCollectionRate, weight: 0.15 },
 *   { id: "concentration", label: "Revenue Diversification", compute: (ctx) => ctx.diversification, weight: 0.1, inverse: true },
 * ]);
 */
export function computeHealthScore<T extends BaseContext>(
  ctx: T,
  factors: HealthFactorDef<T>[],
): HealthScoreResult {
  if (!factors || factors.length === 0) {
    if (import.meta.env.DEV) {
      console.warn(
        `[HealthScore] No factors provided for domain "${ctx.domain}". Returning score 0.`
      );
    }
    const level = getHealthLevel(0);
    return {
      score: 0,
      grade: level.grade,
      level: level.level,
      color: level.color,
      bgColor: level.bgColor,
      factors: [],
      hasCritical: true,
      computedAt: Date.now(),
    };
  }

  // Normalize weights (ensure they sum to 1)
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightScale = totalWeight > 0 ? 1 / totalWeight : 1 / factors.length;

  // Compute each factor
  const factorResults: HealthFactorResult[] = factors.map((def) => {
    let rawValue: number;
    try {
      rawValue = def.compute(ctx);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error(`[HealthScore] Factor ${def.id} compute failed:`, e);
      }
      rawValue = 0; // Failed factor = 0
    }

    // Clamp raw value
    const clamped = Math.max(def.min ?? 0, Math.min(def.max ?? 100, rawValue));

    // Normalize
    const normalizedValue = def.inverse
      ? normalizeInverse(clamped, def.min ?? 0, def.max ?? 100)
      : normalizeNormal(clamped, def.min ?? 0, def.max ?? 100);

    const effectiveWeight = def.weight * weightScale;
    const contribution = normalizedValue * effectiveWeight;
    const status = getFactorStatus(normalizedValue);

    return {
      id: def.id,
      label: def.label,
      rawValue: clamped,
      normalizedValue: Math.round(normalizedValue),
      weight: effectiveWeight,
      contribution: Math.round(contribution),
      status,
      benchmark: def.benchmark,
      benchmarkDelta: def.benchmark != null
        ? Math.round(normalizedValue - normalizeNormal(def.benchmark, def.min ?? 0, def.max ?? 100))
        : undefined,
    };
  });

  // Composite score
  const rawScore = factorResults.reduce((sum, f) => sum + f.contribution, 0);
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Level
  const levelConfig = getHealthLevel(score);
  const hasCritical = factorResults.some((f) => f.status === "critical");

  return {
    score,
    grade: levelConfig.grade,
    level: levelConfig.level,
    color: levelConfig.color,
    bgColor: levelConfig.bgColor,
    factors: factorResults,
    hasCritical,
    computedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — HEALTH SCORE UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Get a short summary string for a health score.
 * Useful for logs, toasts, and debug output.
 *
 * @example
 * formatHealthSummary({ score: 72, grade: "B", level: "saludable", ... })
 * // → "B — Saludable (72/100)"
 */
export function formatHealthSummary(result: HealthScoreResult): string {
  const levelLabel = result.level.charAt(0).toUpperCase() + result.level.slice(1);
  return `${result.grade} — ${levelLabel} (${result.score}/100)`;
}

/**
 * Compare two health scores and describe the change.
 *
 * @returns Human-readable change description
 *
 * @example
 * compareHealthScores(72, 65)
 * // → { delta: 7, direction: "improving", label: "Mejoró 7 pts" }
 */
export function compareHealthScores(
  current: number,
  previous: number,
): {
  delta: number;
  direction: TrendDirection;
  label: string;
  color: string;
} {
  const delta = current - previous;
  const absDelta = Math.abs(delta);

  if (absDelta <= 2) {
    return {
      delta,
      direction: "stable",
      label: "Estable",
      color: "var(--color-silver-400)",
    };
  }

  if (delta > 0) {
    return {
      delta,
      direction: "improving",
      label: `Mejoró ${delta} pts`,
      color: "var(--color-emerald-400)",
    };
  }

  return {
    delta,
    direction: "declining",
    label: `Cayó ${absDelta} pts`,
    color: "var(--color-rose-400)",
  };
}

/**
 * Get the most critical factors from a health score result.
 * Useful for "what to fix first" prioritization.
 *
 * @param result — Health score result
 * @param limit — Max factors to return (default: 3)
 * @returns Critical and attention factors, sorted by normalized value ASC
 */
export function getCriticalFactors(
  result: HealthScoreResult,
  limit: number = 3,
): HealthFactorResult[] {
  return result.factors
    .filter((f) => f.status === "critical" || f.status === "attention")
    .sort((a, b) => a.normalizedValue - b.normalizedValue)
    .slice(0, limit);
}
