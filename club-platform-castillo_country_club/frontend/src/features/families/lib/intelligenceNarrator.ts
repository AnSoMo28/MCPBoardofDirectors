// ═══════════════════════════════════════════════════════════
// src/features/families/lib/intelligenceNarrator.ts
// Phase 34+ Migration — Intelligence Narrator
// Level 6+ Agency · Production Grade
//
// Takes correlated results and generates a human-readable
// executive briefing. Not a data dump — a STORY.
//
// PRE-WRITE VERIFICATION:
//   IntelligenceResults, IntelligenceCorrelation, DimensionScore
//     → ./intelligenceCorrelator.ts §1 ✅
//   URGENCY_LEVELS, LIFECYCLE_STAGES → ../config.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - lifecycle.daysAtStage → lifecycle.daysAtCurrentStage
//   - lifecycle.nextTransition → lifecycle.projectedStage
//   - Mutable interfaces → readonly
//   - No § markers → 3 sections
// ═══════════════════════════════════════════════════════════

import type {
  IntelligenceResults,
  IntelligenceCorrelation,
  DimensionScore,
} from "./intelligenceCorrelator";

import {
  URGENCY_LEVELS,
  LIFECYCLE_STAGES,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** AI-generated executive briefing about a family */
export interface IntelligenceNarrative {
  readonly headline: string;
  readonly briefing: string;
  readonly keyInsight: string;
  readonly immediateAction: string;
  readonly projectedOutcome: string;
  readonly urgency: string;
  /** 0-100 confidence based on data availability */
  readonly confidence: number;
}

// ═══════════════════════════════════════════════════════════
// §2  Helpers
// ═══════════════════════════════════════════════════════════

function loadedCount(results: IntelligenceResults): number {
  return [
    results.churn,
    results.activities,
    results.social,
    results.engagement,
    results.lifecycle,
    results.intelligence,
  ].filter(Boolean).length;
}

function confidenceFromResults(results: IntelligenceResults): number {
  return Math.round((loadedCount(results) / 6) * 100);
}

// ═══════════════════════════════════════════════════════════
// §3  Narrative Generator
// ═══════════════════════════════════════════════════════════

/**
 * Generate an executive briefing from intelligence results.
 *
 * Produces 5 outputs:
 *   - headline: one-line urgency summary
 *   - briefing: multi-sentence executive narrative
 *   - keyInsight: the single most important finding
 *   - immediateAction: what to do right now
 *   - projectedOutcome: what happens if action is taken
 *
 * @param results - Raw intelligence from all 6 tools
 * @param correlations - Cross-domain correlations
 * @param compositeScore - 0-100 weighted composite
 * @param urgency - Urgency level string
 * @param dimensions - Normalized dimension scores
 * @param familyName - Optional family name for personalization
 */
export function generateNarrative(
  results: IntelligenceResults,
  correlations: readonly IntelligenceCorrelation[],
  compositeScore: number,
  urgency: string,
  _dimensions: readonly DimensionScore[],
  familyName?: string,
): IntelligenceNarrative {
  const urgencyCfg = URGENCY_LEVELS[urgency] ?? URGENCY_LEVELS.medium;
  const nameRef = familyName ? `familia ${familyName}` : "la familia";
  const confidence = confidenceFromResults(results);

  // ── Headline ──
  const headline =
    urgency === "critical"
      ? `Situación crítica — ${nameRef}`
      : urgency === "high"
        ? `Atención prioritaria — ${nameRef}`
        : urgency === "medium"
          ? `Áreas de mejora — ${nameRef}`
          : urgency === "low"
            ? `Monitoreo regular — ${nameRef}`
            : `Familia saludable — ${nameRef}`;

  // ── Briefing (assembled from available data) ──
  const sentences: string[] = [];

  sentences.push(
    `Score compuesto: ${compositeScore}/100. ${urgencyCfg.label}.`,
  );

  if (results.churn) {
    const { riskScore, riskLevel, factors } = results.churn;
    if (riskLevel === "high" || riskLevel === "critical") {
      sentences.push(
        `Riesgo de churn ${riskLevel} (${riskScore}%). ${factors[0]?.detail ?? ""}`,
      );
    }
  }

  if (results.lifecycle) {
    const { currentStage, daysAtCurrentStage, projectedStage } = results.lifecycle;
    const stageLabel =
      LIFECYCLE_STAGES[currentStage]?.label ?? currentStage;
    const projectedLabel =
      LIFECYCLE_STAGES[projectedStage]?.label ?? projectedStage;
    sentences.push(
      `Etapa del ciclo: ${stageLabel} (${daysAtCurrentStage} días). Proyectado: ${projectedLabel}.`,
    );
  }

  if (correlations.length > 0) {
    sentences.push(correlations[0].insight);
  }

  if (results.engagement) {
    const { currentScore, targetScore, timeframe } = results.engagement;
    sentences.push(
      `Engagement actual: ${currentScore} → objetivo: ${targetScore} (${timeframe}).`,
    );
  }

  if (results.social && results.social.length > 0) {
    sentences.push(
      `${results.social.length} conexión${results.social.length !== 1 ? "es" : ""} social${results.social.length !== 1 ? "es" : ""} sugerida${results.social.length !== 1 ? "s" : ""}.`,
    );
  }

  const briefing = sentences.join(" ");

  // ── Key Insight ──
  const keyInsight =
    correlations.length > 0
      ? correlations[0].insight
      : urgency === "good"
        ? "Todos los indicadores dentro de rangos saludables."
        : "Se requiere análisis más profundo con datos adicionales.";

  // ── Immediate Action ──
  const immediateAction =
    correlations.length > 0
      ? correlations[0].recommendation
      : urgency === "critical" || urgency === "high"
        ? "Contactar proactivamente y evaluar situación."
        : "Continuar monitoreo regular.";

  // ── Projected Outcome ──
  const outcomeParts: string[] = [];

  if (results.engagement) {
    const { currentScore, targetScore, timeframe } = results.engagement;
    outcomeParts.push(
      `Con el plan ejecutado: engagement ${currentScore} → ${targetScore} en ${timeframe}.`,
    );
  }

  if (
    results.churn &&
    (results.churn.riskLevel === "high" ||
      results.churn.riskLevel === "critical")
  ) {
    const reducedRisk = Math.max(10, results.churn.riskScore - 30);
    outcomeParts.push(
      `Churn: ${results.churn.riskScore}% → ~${reducedRisk}%.`,
    );
  }

  const projectedOutcome = outcomeParts.join(" ");

  return {
    headline,
    briefing,
    keyInsight,
    immediateAction,
    projectedOutcome,
    urgency,
    confidence,
  };
}