// src/shared/lib/advisor-engine/confidence.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Confidence Scoring
//
// Unified confidence computation for ALL advisor domains.
//
// CRITICAL DISTINCTION:
//   - IMPACT = "how significant is this finding?" (high/medium/low)
//   - CONFIDENCE = "how sure are we about this finding?" (0-100)
//
// These are INDEPENDENT dimensions. A finding can be:
//   - High impact + high confidence = act now
//   - High impact + low confidence = investigate first
//   - Low impact + high confidence = note for tracking
//   - Low impact + low confidence = ignore
//
// Previously, getConfidenceDisplay() reused ADVISOR_IMPACT_DISPLAY
// which mapped confidence 75% → rose-400 (same as high impact).
// This was WRONG. Confidence has its own color scale.
//
// Created: F45 — Architecture Consolidation
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONFIDENCE LEVELS
// ═══════════════════════════════════════════════════════════
import type {  ConfidenceLevel } from "@/shared/types/domain-enums";
// Re-export for backward compatibility — source of truth is domain-enums.ts
export type { ConfidenceLevel };

/**
 * Thresholds for confidence levels.
 *
 * High (≥75):   Strong evidence, data-backed, high sample size
 * Medium (50-74): Moderate evidence, some uncertainty
 * Low (<50):    Weak evidence, estimated, low sample size
 */
const CONFIDENCE_THRESHOLDS = {
  high: 75,
  medium: 50,
} as const;

/**
 * Derive confidence level from numeric score.
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — CONFIDENCE DISPLAY (separate from impact)
// ═══════════════════════════════════════════════════════════

/**
 * Confidence display configuration.
 *
 * COLOR LOGIC (different from impact!):
 *   High confidence   → Teal-400  (#2A9AB5) — "reliable data/info"
 *   Medium confidence → Amber-400 (#D4A840) — "verify before acting"
 *   Low confidence    → Rose-400  (#C46470) — "unreliable/uncertain"
 *
 * Impact uses:  Rose (high), Amber (medium), Silver (low)
 * Confidence uses: Teal (high), Amber (medium), Rose (low)
 *
 * They're INVERTED because:
 *   - High impact = dangerous → warm/warning colors
 *   - High confidence = trustworthy → cool/data colors
 */
export const CONFIDENCE_DISPLAY: Record<
  ConfidenceLevel,
  {
    label: string;
    labelShort: string;
    color: string;
    bgColor: string;
    description: string;
  }
> = {
  high: {
    label: "Alta confianza",
    labelShort: "Alta",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    description: "Fuerte evidencia respaldada por datos",
  },
  medium: {
    label: "Media confianza",
    labelShort: "Media",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    description: "Evidencia moderada con algo de incertidumbre",
  },
  low: {
    label: "Baja confianza",
    labelShort: "Baja",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 8%, transparent)",
    description: "Evidencia débil — verificar antes de actuar",
  },
};

/**
 * Get full confidence display for a numeric score.
 */
export function getConfidenceDisplay(score: number): {
  level: ConfidenceLevel;
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
  description: string;
} {
  const level = getConfidenceLevel(score);
  return {
    level,
    ...CONFIDENCE_DISPLAY[level],
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — CONFIDENCE COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Individual factor contributing to a confidence score.
 */
export interface ConfidenceFactor {
  /** Factor name */
  name: string;

  /** Raw value (0-100) */
  value: number;

  /** Weight in the composite score (0-1) */
  weight: number;

  /** Human-readable explanation */
  detail: string;
}

/**
 * Detailed breakdown of a confidence computation.
 */
export interface ConfidenceBreakdown {
  /** Final confidence score (0-100) */
  score: number;

  /** Derived level */
  level: ConfidenceLevel;

  /** Per-factor breakdown */
  factors: Array<ConfidenceFactor & {
    /** Contribution to final score */
    contribution: number;
  }>;

  /** Human-readable summary */
  summary: string;
}

/**
 * Compute a composite confidence score from multiple factors.
 *
 * Standard factors for Advisor rules:
 *   - dataFreshness:   How recent is the data? (0-100)
 *   - sampleSize:      How much data do we have? (0-100)
 *   - consistency:     Is the data consistent across sources? (0-100)
 *   - benchmark:       Does this match known benchmarks? (0-100)
 *   - historical:      Has this pattern been accurate before? (0-100)
 *
 * @param factors — Array of confidence factors with weights
 * @returns Composite confidence score (0-100) clamped
 */
export function computeConfidence(factors: ConfidenceFactor[]): ConfidenceBreakdown {
  if (factors.length === 0) {
    return {
      score: 50, // Default: medium confidence when no data
      level: "medium",
      factors: [],
      summary: "Sin factores de confianza — usando valor por defecto (50)",
    };
  }

  // Validate weights sum (allow small floating point errors)
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (Math.abs(totalWeight - 1) > 0.01) {
    if (import.meta.env.DEV) {
      console.warn(
        `[Confidence] Factor weights sum to ${totalWeight.toFixed(2)}, expected 1.00. Normalizing.`
      );
    }
  }

  // Normalize weights
  const normalizedFactors = factors.map((f) => ({
    ...f,
    normalizedWeight: totalWeight > 0 ? f.weight / totalWeight : 1 / factors.length,
  }));

  // Weighted sum
  const rawScore = normalizedFactors.reduce(
    (sum, f) => sum + f.value * f.normalizedWeight,
    0
  );

  // Clamp to 0-100
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const level = getConfidenceLevel(score);

  // Build breakdown
  const breakdown = normalizedFactors.map((f) => ({
    name: f.name,
    value: f.value,
    weight: f.weight,
    detail: f.detail,
    contribution: Math.round(f.value * f.normalizedWeight),
  }));

  // Generate summary
  const highFactors = breakdown.filter((f) => f.value >= 75);
  const lowFactors = breakdown.filter((f) => f.value < 50);

  let summary: string;
  if (level === "high") {
    summary = `Alta confianza (${score}%) — ${highFactors.length} factores fuertes`;
    if (lowFactors.length > 0) {
      summary += `. Precaución: ${lowFactors.map((f) => f.name).join(", ")} débil(es)`;
    }
  } else if (level === "medium") {
    summary = `Confianza media (${score}%) — evidencia moderada`;
    if (lowFactors.length > 0) {
      summary += `. Riesgo: ${lowFactors.map((f) => f.name).join(", ")} necesita verificación`;
    }
  } else {
    summary = `Baja confianza (${score}%) — verificar antes de actuar`;
    if (lowFactors.length > 0) {
      summary += `. Factores débiles: ${lowFactors.map((f) => f.name).join(", ")}`;
    }
  }

  return { score, level, factors: breakdown, summary };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CONFIDENCE COMBINATION
// Merge confidence from multiple sources (e.g., rule + RAG + signals).
// ═══════════════════════════════════════════════════════════

/**
 * Combine multiple confidence scores using weighted average.
 *
 * Use cases:
 *   - Rule confidence + RAG grounding confidence
 *   - Client-side compute + server-side validation
 *   - Multiple data source agreement
 *
 * @param scores — Array of {score, weight, source}
 * @returns Combined confidence (0-100)
 */
export function combineConfidences(
  scores: Array<{ score: number; weight: number; source: string }>
): number {
  if (scores.length === 0) return 50;

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 50;

  const combined = scores.reduce(
    (sum, s) => sum + (s.score * s.weight) / totalWeight,
    0
  );

  return Math.round(Math.max(0, Math.min(100, combined)));
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — CONFIDENCE PRESETS
// Pre-built factor sets for common advisor scenarios.
// ═══════════════════════════════════════════════════════════

/**
 * Pre-built confidence factor presets for common scenarios.
 * Advisors can use these as starting points instead of building
 * factors from scratch.
 */
export const CONFIDENCE_PRESETS = {
  /**
   * Standard preset for data-backed rules.
   * Use when: rule depends on fresh, complete data.
   */
  dataDriven: (dataAge: number, sampleSize: number): ConfidenceFactor[] => [
    {
      name: "data_freshness",
      value: dataAge < 1 ? 95 : dataAge < 7 ? 80 : dataAge < 30 ? 60 : 30,
      weight: 0.4,
      detail: `Datos de hace ${dataAge} día(s)`,
    },
    {
      name: "sample_size",
      value: sampleSize >= 100 ? 95 : sampleSize >= 30 ? 75 : sampleSize >= 10 ? 55 : 25,
      weight: 0.35,
      detail: `${sampleSize} registros`,
    },
    {
      name: "consistency",
      value: 75, // Default — override if multi-source
      weight: 0.25,
      detail: "Consistencia asumida (single source)",
    },
  ],

  /**
   * RAG-grounded preset.
   * Use when: rule is enriched with document retrieval.
   */
  ragGrounded: (ragScore: number, citationCount: number): ConfidenceFactor[] => [
    {
      name: "rag_relevance",
      value: ragScore,
      weight: 0.5,
      detail: `Relevancia RAG: ${ragScore}%`,
    },
    {
      name: "citation_coverage",
      value: citationCount >= 3 ? 90 : citationCount >= 2 ? 70 : citationCount >= 1 ? 50 : 20,
      weight: 0.3,
      detail: `${citationCount} citation(es)`,
    },
    {
      name: "data_freshness",
      value: 75,
      weight: 0.2,
      detail: "Datos de documentos indexados",
    },
  ],

  /**
   * Conservative preset — for high-stakes rules.
   * Use when: rule triggers HITL actions, financial decisions.
   */
  conservative: (baseConfidence: number): ConfidenceFactor[] => [
    {
      name: "rule_confidence",
      value: baseConfidence,
      weight: 0.5,
      detail: `Confianza base de la regla: ${baseConfidence}%`,
    },
    {
      name: "data_freshness",
      value: 70,
      weight: 0.2,
      detail: "Conservative: penaliza datos > 7 días",
    },
    {
      name: "benchmark_validation",
      value: 65,
      weight: 0.3,
      detail: "Validación contra benchmarks CR",
    },
  ],

  /**
   * Calibrated preset — uses historical accuracy (F50).
   * Use when: rule has enough outcomes to be statistically meaningful.
   *
   * @param baseConfidence — Original rule confidence
   * @param accuracyRate — Historical accuracy (0-1) from CalibrationResult
   * @param sampleSize — Number of tracked outcomes
   */
  calibrated: (
    baseConfidence: number,
    accuracyRate: number,
    sampleSize: number,
  ): ConfidenceFactor[] => [
    {
      name: "rule_confidence",
      value: baseConfidence,
      weight: sampleSize >= 10 ? 0.3 : 0.6,
      detail: `Confianza base: ${baseConfidence}%`,
    },
    {
      name: "historical_accuracy",
      value: Math.round(accuracyRate * 100),
      weight: sampleSize >= 10 ? 0.5 : 0.25,
      detail: `Precisión histórica: ${Math.round(accuracyRate * 100)}% (${sampleSize} outcomes)`,
    },
    {
      name: "sample_size",
      value: sampleSize >= 20 ? 95 : sampleSize >= 10 ? 75 : sampleSize >= 5 ? 50 : 25,
      weight: sampleSize >= 10 ? 0.2 : 0.15,
      detail: `${sampleSize} outcomes registrados`,
    },
  ],
};

// ═══════════════════════════════════════════════════════════
// SECTION 6 — QUICK REFERENCE
//
// Usage in a rule:
//   const conf = computeConfidence(CONFIDENCE_PRESETS.dataDriven(1, 50));
//   return buildInsight({
//     id: generateInsightId("financial", "FIN_HEALTH"),
//     impact: "high",
//     title: "...",
//     reasoning: "...",
//     confidence: conf.score,
//   });
//
// Usage in banner:
//   const display = getConfidenceDisplay(insight.confidence);
//   <span style={{ color: display.color }}>{display.labelShort}</span>
//
// Display vs Impact:
//   Impact:     rose (high) → amber (medium) → silver (low)  ← danger scale
//   Confidence: teal (high) → amber (medium) → rose (low)    ← reliability scale
// ═══════════════════════════════════════════════════════════
