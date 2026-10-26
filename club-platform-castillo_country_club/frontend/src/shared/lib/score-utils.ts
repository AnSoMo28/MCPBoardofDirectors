// src/shared/lib/score-utils.ts
// ═══════════════════════════════════════════════════════════
// Score Color Utility — Unified implementation
// Handles all score-to-color mappings across domains
// ═══════════════════════════════════════════════════════════

/**
 * Score color configuration
 */
export interface ScoreColorConfig {
  thresholds: number[];  // [excellent, good, fair] or [critical, high, medium]
  colors: string[];      // Corresponding colors
  invert?: boolean;      // For urgency (higher score = worse)
}

/**
 * Default configurations by domain
 */
export const SCORE_PRESETS = {
  // Standard 0-100 (health, satisfaction, etc.)
  standard: {
    thresholds: [80, 60, 40],
    colors: [
      "var(--color-emerald-400)",  // Excellent
      "var(--color-teal-400)",     // Good
      "var(--color-amber-400)",    // Fair
      "var(--color-rose-400)",     // Poor
    ]
  },

  // Standard with gold accent (finance, facilities)
  goldStandard: {
    thresholds: [80, 60, 40],
    colors: [
      "var(--color-emerald-400)",  // Excellent
      "var(--color-gold-400)",     // Good
      "var(--color-amber-400)",    // Fair
      "var(--color-rose-400)",     // Poor
    ]
  },

  // Sentiment analysis (75/50/25)
  sentiment: {
    thresholds: [75, 50, 25],
    colors: [
      "var(--color-emerald-400)",  // Positive
      "var(--color-gold-400)",     // Neutral
      "var(--color-amber-400)",    // Mixed
      "var(--color-rose-400)",     // Negative
    ]
  },

  // Compliance (90/70/50)
  compliance: {
    thresholds: [90, 70, 50],
    colors: [
      "var(--color-emerald-400)",  // Excellent
      "var(--color-teal-400)",     // Good
      "var(--color-amber-400)",    // Needs improvement
      "var(--color-rose-400)",     // Non-compliant
    ]
  },

  // Two-tier (75/50)
  twoTier: {
    thresholds: [75, 50],
    colors: [
      "var(--color-emerald-400)",  // High
      "var(--color-gold-400)",     // Medium
      "var(--color-rose-400)",     // Low
    ]
  },

  // Urgency/inverted (higher = worse)
  urgency: {
    thresholds: [75, 50, 25],
    colors: [
      "var(--color-rose-400)",     // Critical
      "var(--color-amber-400)",    // High
      "var(--color-gold-400)",     // Medium
      "var(--color-teal-400)",     // Low
    ],
    invert: true
  },

  // Simple sentiment (75/60 two-tier)
  sentimentSimple: {
    thresholds: [75, 60],
    colors: [
      "var(--color-emerald-400)",  // Positive
      "var(--color-amber-400)",    // Neutral
      "var(--color-rose-400)",     // Negative
    ]
  },

  // Maintenance urgency (inverted, different colors than urgency)
  maintenanceUrgency: {
    thresholds: [75, 50, 25],
    colors: [
      "var(--color-rose-400)",     // Critical
      "var(--color-amber-400)",    // High
      "var(--color-teal-400)",     // Medium
      "var(--color-emerald-400)",  // Low
    ],
    invert: true
  },

  // Four-tier health (75/50/30) - families
  fourTier: {
    thresholds: [75, 50, 30],
    colors: [
      "var(--color-emerald-400)",  // Excellent
      "var(--color-gold-400)",     // Good
      "var(--color-amber-400)",    // Fair
      "var(--color-rose-400)",     // Poor
    ]
  },

  // Recommendation score (75/50) - gold neutral
  recommendationGold: {
    thresholds: [75, 50],
    colors: [
      "var(--color-emerald-400)",  // High
      "var(--color-gold-400)",     // Medium
      "var(--color-silver-400)",   // Low
    ]
  },

  // Recommendation score (75/50) - amber warning
  recommendation: {
    thresholds: [75, 50],
    colors: [
      "var(--color-emerald-400)",  // High
      "var(--color-amber-400)",    // Medium
      "var(--color-rose-400)",     // Low
    ]
  },

  // Compliance simple (90/70) — facilities, operations
  complianceSimple: {
    thresholds: [90, 70],
    colors: [
      "var(--color-emerald-400)",  // Compliant
      "var(--color-amber-400)",    // Needs improvement
      "var(--color-rose-400)",     // Non-compliant
    ]
  },

  // Five-tier (80/60/45/30) — engagement
  fiveTier: {
    thresholds: [80, 60, 45, 30],
    colors: [
      "var(--color-emerald-400)",  // Excellent
      "var(--color-teal-400)",     // Good
      "var(--color-gold-400)",     // Fair
      "var(--color-amber-400)",    // Needs attention
      "var(--color-rose-400)",     // Critical
    ]
  }
};

/**
 * Get color for a score value
 */
export function getScoreColor(
  score: number,
  config: ScoreColorConfig = SCORE_PRESETS.standard
): string {
  if (config.invert) {
    // For urgency: higher score = worse
    for (let i = 0; i < config.thresholds.length; i++) {
      if (score >= config.thresholds[i]) {
        return config.colors[i];
      }
    }
    return config.colors[config.colors.length - 1];
  } else {
    // Standard: higher score = better
    for (let i = 0; i < config.thresholds.length; i++) {
      if (score >= config.thresholds[i]) {
        return config.colors[i];
      }
    }
    return config.colors[config.colors.length - 1];
  }
}

/**
 * Get color for a score with null/undefined handling
 */
export function getScoreColorSafe(
  score: number | null | undefined,
  config: ScoreColorConfig = SCORE_PRESETS.standard
): string {
  if (score === null || score === undefined) {
    return "var(--color-silver-600)";
  }
  return getScoreColor(score, config);
}

/**
 * Get hex color for Recharts (SVG doesn't support CSS variables)
 */
export function getScoreColorHex(
  score: number,
  config: ScoreColorConfig
): string {
  // Map CSS variables to hex for SVG compatibility
  const cssToHexMap: Record<string, string> = {
    "var(--color-emerald-400)": "#3DAA70",
    "var(--color-teal-400)": "#2A9AB5",
    "var(--color-gold-400)": "#C9A96E",
    "var(--color-amber-400)": "#D4A840",
    "var(--color-rose-400)": "#C46470",
    "var(--color-silver-600)": "#8A95A5",
  };

  const cssColor = getScoreColor(score, config);
  return cssToHexMap[cssColor] ?? cssColor;
}