/* ═══════════════════════════════════════════════════════════════
   shared/lib/adaptiveThresholds.ts

   Castillo Country Club — Adaptive Thresholds Engine
   Fase 23 — Context-aware intelligence thresholds

   Thresholds that adapt to:
   - Costa Rica seasonality (high: Dic-Abr, low: May-Nov)
   - Member fitness level (beginner → advanced)
   - Custom overrides (future: club-specific settings)

   Single source of truth for all Advisor threshold logic.
   Replaces hardcoded magic numbers in domain-specific hooks.

   0 API calls. Pure computation.
   ═══════════════════════════════════════════════════════════════ */

// ── Types ────────────────────────────────────────────────

export type Season = "high" | "low" | "transition";

/**
 * Matches ClassLevel from wellness/types.ts.
 * Defined here to avoid circular dependency
 * (shared → feature → shared).
 */
export type FitnessLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all_levels";

export interface AdaptiveThresholdResult {
  /** Base threshold before adjustments */
  base: number;
  /** Effective threshold after all adjustments */
  effective: number;
  /** Rounded effective for display and comparison */
  effectiveRounded: number;
  /** Adjustment factors applied */
  adjustments: {
    seasonal: number;
    fitnessMultiplier: number;
  };
  /** Human-readable explanation for AI narratives */
  explanation: string;
  /** Current season label in Spanish */
  seasonLabel: string;
}

export interface ThresholdConfig {
  /** Base threshold value */
  base: number;
  /** Seasonal adjustments: additive delta per season */
  seasonal?: {
    high?: number;
    low?: number;
    transition?: number;
  };
  /** Fitness level adjustments: multiplicative factor */
  fitnessMultiplier?: Partial<Record<FitnessLevel, number>>;
  /** Custom override (future: from club settings) */
  customOverride?: number;
  /** Unit label for explanation (e.g., "/100", "%") */
  unit?: string;
  /** Context descriptor (e.g., "puntos", "días", "actividades/mes") */
  descriptor?: string;
}

// ── Season Detection ─────────────────────────────────────

/**
 * Costa Rica season configuration.
 * Moved from finance/types.ts to eliminate shared → feature dependency.
 * Re-export from here: import { SEASON_CONFIG } from "@/shared/lib/adaptiveThresholds"
 */
export const SEASON_CONFIG = {
  high: { months: [12, 1, 2, 3, 4], label: "Dic-Abr" },
  low: { months: [5, 6, 7, 8, 9, 10, 11], label: "May-Nov" },
} as const;

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if ((SEASON_CONFIG.high.months as readonly number[]).includes(month)) return "high";
  if ((SEASON_CONFIG.low.months as readonly number[]).includes(month)) return "low";
  return "transition";
}

export function getSeasonLabel(season: Season): string {
  const labels: Record<Season, string> = {
    high: "temporada alta (Dic-Abr)",
    low: "temporada baja (May-Nov)",
    transition: "transición",
  };
  return labels[season];
}

// ── Core Engine ──────────────────────────────────────────

/**
 * Computes an adaptive threshold that adjusts to context.
 *
 * Formula: effective = (base + seasonalDelta) × fitnessMultiplier
 *
 * - seasonalDelta: additive — adjusts for CR season patterns
 * - fitnessMultiplier: multiplicative — scales by member fitness level
 * - customOverride: takes full precedence when set
 *
 * @example
 * // Activity drought for advanced member in high season:
 * // base=7, seasonal=-2 (high expects more), fitness×0.7 (advanced stricter)
 * // effective = (7 - 2) × 0.7 = 3.5 → drought after 3-4 days
 *
 * // Health score critical for beginner in low season:
 * // base=40, seasonal=-5 (low more lenient), fitness×0.85 (beginner lenient)
 * // effective = (40 - 5) × 0.85 = 29.75 → critical if < 30
 */
export function computeThreshold(
  config: ThresholdConfig,
  fitnessLevel?: FitnessLevel,
): AdaptiveThresholdResult {
  const season = getCurrentSeason();
  const seasonalDelta = config.seasonal?.[season] ?? 0;
  const fitLevel = fitnessLevel ?? "all_levels";
  const fitMult = config.fitnessMultiplier?.[fitLevel] ?? 1.0;

  let effective = (config.base + seasonalDelta) * fitMult;

  if (config.customOverride !== undefined) {
    effective = config.customOverride;
  }

  effective = Math.max(0, effective);

  // ── Build explanation ──
  const parts: string[] = [`Base: ${config.base}`];

  if (seasonalDelta !== 0) {
    const sign = seasonalDelta > 0 ? "+" : "";
    parts.push(`${getSeasonLabel(season)}: ${sign}${seasonalDelta}`);
  }

  if (fitMult !== 1.0) {
    parts.push(`Nivel ${fitLevel}: ×${fitMult.toFixed(2)}`);
  }

  if (config.customOverride !== undefined) {
    parts.push("Override manual");
  }

  const descriptor = config.descriptor ?? "";
  const unit = config.unit ?? "";
  const rounded = Math.round(effective * 10) / 10;

  parts.push(`${rounded}${unit} ${descriptor}`.trim());

  return {
    base: config.base,
    effective,
    effectiveRounded: Math.round(effective),
    adjustments: {
      seasonal: seasonalDelta,
      fitnessMultiplier: fitMult,
    },
    explanation: parts.join(" → "),
    seasonLabel: getSeasonLabel(season),
  };
}

// ── Pre-built Wellness Thresholds ────────────────────────
// Factory functions. Each returns AdaptiveThresholdResult
// for the given fitness level, using domain-specific configs.

export const WELLNESS_THRESHOLDS = {
  /** Composite score below this = critical wellness */
  healthScoreCritical: (fit?: FitnessLevel) =>
    computeThreshold(
      {
        base: 40,
        seasonal: { high: +5, low: -5, transition: 0 },
        fitnessMultiplier: {
          beginner: 0.85,
          intermediate: 1.0,
          advanced: 1.15,
          all_levels: 1.0,
        },
        unit: "/100",
        descriptor: "es crítico",
      },
      fit,
    ),

  /** Any dimension score below this drags the composite */
  dimensionDragging: () =>
    computeThreshold({
      base: 25,
      descriptor: "de dimensión",
    }),

  /** Days without any registered activity */
  activityDrought: (fit?: FitnessLevel) =>
    computeThreshold(
      {
        base: 7,
        seasonal: { high: -2, low: +3, transition: 0 },
        fitnessMultiplier: {
          beginner: 1.3,
          intermediate: 1.0,
          advanced: 0.7,
          all_levels: 1.0,
        },
        descriptor: "días sin actividad",
      },
      fit,
    ),

  /** Single activity type dominance percentage */
  monotonyRisk: () =>
    computeThreshold({
      base: 75,
      unit: "%",
      descriptor: "de una sola actividad",
    }),

  /** Monthly activities above this = overtraining risk */
  overtraining: (fit?: FitnessLevel) =>
    computeThreshold(
      {
        base: 20,
        seasonal: { high: +5, low: -5, transition: 0 },
        fitnessMultiplier: {
          beginner: 0.7,
          intermediate: 1.0,
          advanced: 1.4,
          all_levels: 1.0,
        },
        descriptor: "actividades/mes",
      },
      fit,
    ),

  /** Trend dimension score below this = sustained decline */
  trendDeclining: () =>
    computeThreshold({
      base: 35,
      descriptor: "de tendencia",
    }),

  /** Previous streak must be at least this to count as "broken" */
  streakBroken: () =>
    computeThreshold({
      base: 7,
      descriptor: "días de racha previa",
    }),

  /** Composite below this + declining = compound churn risk */
  compoundRisk: (fit?: FitnessLevel) =>
    computeThreshold(
      {
        base: 30,
        seasonal: { high: +5, low: -5, transition: 0 },
        fitnessMultiplier: {
          beginner: 0.85,
          intermediate: 1.0,
          advanced: 1.15,
          all_levels: 1.0,
        },
        descriptor: "de wellness composite",
      },
      fit,
    ),

  /** Composite above this = premium upsell candidate */
  premiumCandidate: () =>
    computeThreshold({
      base: 75,
      descriptor: "de wellness composite",
    }),
} as const;
