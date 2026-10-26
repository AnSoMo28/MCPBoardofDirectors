// ═══════════════════════════════════════════════════════════
// src/features/families/lib/intelligenceCorrelator.ts
// Phase 34+ Migration — Intelligence Correlator
// Level 6+ Agency · Production Grade
//
// Cross-domain pattern detection. Receives results from all
// 6 AI tools and detects correlations that no single tool
// can produce alone. This is the BRAIN.
//
// PRE-WRITE VERIFICATION:
//   FamilyChurnPrediction  → ../ai-types.ts §10 ✅
//   ActivityRecommendation → ../ai-types.ts §11 ✅ (replaces FamilyActivityRecommendations)
//   SocialMatch            → ../social-types.ts §3 ✅ (replaces SocialMatchSuggestion)
//   FamilyEngagementPlan   → ../ai-types.ts §11 ✅
//   LifecycleProjection    → ../ai-types.ts §6  ✅ (replaces FamilyLifecycleAnalysis)
//   FamilyIntelligenceState→ ../ai-types.ts §13 ✅ (replaces Family360Insight)
//   INTELLIGENCE_DIMENSIONS, LIFECYCLE_STAGES → ../config.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - FamilyActivityRecommendations (wrapper) → ActivityRecommendation[] (direct)
//   - SocialMatchSuggestion → SocialMatch (unified type)
//   - FamilyLifecycleAnalysis → LifecycleProjection (merged)
//   - Family360Insight → FamilyIntelligenceState (replaced)
//   - analysis.daysAtStage → projection.daysAtCurrentStage
//   - insight.overallScore → state.healthScore.overall
//   - insight.crossDomainCorrelations → state.crossDomainThreads
//   - corr.impact === "high" → thread.tension >= 0.7
//   - corr.correlation → thread.description
//   - Mutable interfaces → readonly
//   - No § markers → 4 sections
// ═══════════════════════════════════════════════════════════

import type {
  FamilyChurnPrediction,
  ActivityRecommendation,
  FamilyEngagementPlan,
  LifecycleProjection,
  FamilyIntelligenceState,
} from "../ai-types";

import type { SocialMatch } from "../social-types";

import {
  INTELLIGENCE_DIMENSIONS,
  LIFECYCLE_STAGES,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Raw results from all 6 intelligence MCP tools */
export interface IntelligenceResults {
  readonly churn: FamilyChurnPrediction | null;
  readonly activities: readonly ActivityRecommendation[] | null;
  readonly social: readonly SocialMatch[] | null;
  readonly engagement: FamilyEngagementPlan | null;
  readonly lifecycle: LifecycleProjection | null;
  readonly intelligence: FamilyIntelligenceState | null;
}

/** A correlation between two intelligence dimensions */
export interface IntelligenceCorrelation {
  readonly id: string;
  readonly dimensions: readonly [string, string];
  readonly strength: number;
  readonly insight: string;
  readonly impact: "amplifying" | "mitigating" | "neutral";
  readonly recommendation: string;
}

/** Normalized score for a single intelligence dimension */
export interface DimensionScore {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: string;
  readonly color: string;
  /** 0-100 health score (higher = healthier) */
  readonly score: number;
  readonly urgency: string;
  readonly status: "idle" | "thinking" | "loaded";
  readonly detail: string;
}

// ═══════════════════════════════════════════════════════════
// §2  Score Extraction — Normalize each tool's output to 0-100
// ═══════════════════════════════════════════════════════════

function churnToHealth(
  prediction: FamilyChurnPrediction | null,
): { readonly score: number; readonly detail: string } {
  if (!prediction) return { score: 50, detail: "Sin datos" };
  const health = Math.round(100 - prediction.riskScore);
  return {
    score: health,
    detail: `Riesgo ${prediction.riskLevel} (${prediction.riskScore}%)`,
  };
}

function socialToHealth(
  suggestions: readonly SocialMatch[] | null,
): { readonly score: number; readonly detail: string } {
  if (!suggestions) return { score: 50, detail: "Sin datos" };
  const count = suggestions.length;
  const avgMatch =
    count > 0
      ? suggestions.reduce((s, m) => s + m.matchScore, 0) / count
      : 0;
  const score = Math.min(100, Math.round(count * 18 + avgMatch * 0.3));
  return {
    score,
    detail: `${count} conexión${count !== 1 ? "es" : ""} sugerida${count !== 1 ? "s" : ""}`,
  };
}

function activitiesToHealth(
  recs: readonly ActivityRecommendation[] | null,
): { readonly score: number; readonly detail: string } {
  if (!recs || recs.length === 0) return { score: 50, detail: "Sin datos" };
  const count = recs.length;
  const avgMatch = recs.reduce((s, r) => s + r.matchScore, 0) / count;
  return {
    score: Math.round(avgMatch),
    detail: `${count} actividad${count !== 1 ? "es" : ""} · match promedio ${Math.round(avgMatch)}%`,
  };
}

function engagementToHealth(
  plan: FamilyEngagementPlan | null,
): { readonly score: number; readonly detail: string } {
  if (!plan) return { score: 50, detail: "Sin datos" };
  return {
    score: Math.round(plan.currentScore),
    detail: `Score actual: ${plan.currentScore} → objetivo: ${plan.targetScore}`,
  };
}

function lifecycleToHealth(
  projection: LifecycleProjection | null,
): { readonly score: number; readonly detail: string } {
  if (!projection) return { score: 50, detail: "Sin datos" };
  const stageCfg = LIFECYCLE_STAGES[projection.currentStage];
  return {
    score: stageCfg?.healthScore ?? 50,
    detail: `${stageCfg?.label ?? projection.currentStage} · ${projection.daysAtCurrentStage} días`,
  };
}

function intelligenceToHealth(
  state: FamilyIntelligenceState | null,
): { readonly score: number; readonly detail: string } {
  if (!state) return { score: 50, detail: "Sin datos" };
  return {
    score: Math.round(state.healthScore.overall),
    detail: `Score 360°: ${state.healthScore.overall}/100`,
  };
}

// ═══════════════════════════════════════════════════════════
// §3  Dimension Scoring + Composite + Urgency
// ═══════════════════════════════════════════════════════════

/** Derive urgency from a dimension score. Churn is inverted. */
function deriveDimensionUrgency(score: number, dimId: string): string {
  if (dimId === "churn") {
    // LOW score = HIGH urgency (inverted)
    if (score <= 20) return "critical";
    if (score <= 40) return "high";
    if (score <= 60) return "medium";
    if (score <= 80) return "low";
    return "good";
  }
  // All others: HIGH score = LOW urgency
  if (score >= 70) return "good";
  if (score >= 50) return "low";
  if (score >= 35) return "medium";
  if (score >= 20) return "high";
  return "critical";
}

/**
 * Derive normalized dimension scores from raw intelligence results.
 * Maps each tool output to a 0-100 health score.
 */
export function deriveDimensionScores(
  results: IntelligenceResults,
  statuses: Record<string, "idle" | "thinking" | "loaded">,
): readonly DimensionScore[] {
  const extractors: Record<
    string,
    (r: IntelligenceResults) => { readonly score: number; readonly detail: string }
  > = {
    churn: (r) => churnToHealth(r.churn),
    engagement: (r) => engagementToHealth(r.engagement),
    social: (r) => socialToHealth(r.social),
    lifecycle: (r) => lifecycleToHealth(r.lifecycle),
    activities: (r) => activitiesToHealth(r.activities),
    // Config ID "family360" maps to results key "intelligence"
    family360: (r) => intelligenceToHealth(r.intelligence),
  };

  return INTELLIGENCE_DIMENSIONS.map((dim) => {
    const { score, detail } = extractors[dim.id]?.(results) ?? {
      score: 50,
      detail: "",
    };
    return {
      id: dim.id,
      label: dim.label,
      shortLabel: dim.shortLabel,
      icon: dim.icon,
      color: dim.color,
      score,
      urgency: deriveDimensionUrgency(score, dim.id),
      status: statuses[dim.id] ?? "idle",
      detail,
    };
  });
}

/**
 * Compute composite score as weighted average of loaded dimensions.
 */
export function computeCompositeScore(
  dimensions: readonly DimensionScore[],
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of dimensions) {
    if (dim.status !== "loaded") continue;
    const config = INTELLIGENCE_DIMENSIONS.find((d) => d.id === dim.id);
    const weight = config?.weight ?? 0.15;
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

/**
 * Derive overall urgency level from composite score and dimension urgencies.
 */
export function deriveUrgencyLevel(
  compositeScore: number,
  dimensions: readonly DimensionScore[],
): string {
  const hasCritical = dimensions.some(
    (d) => d.urgency === "critical" && d.status === "loaded",
  );
  const hasHigh = dimensions.some(
    (d) => d.urgency === "high" && d.status === "loaded",
  );

  if (hasCritical) return "critical";
  if (hasHigh || compositeScore < 35) return "high";
  if (compositeScore < 55) return "medium";
  if (compositeScore < 75) return "low";
  return "good";
}

// ═══════════════════════════════════════════════════════════
// §4  Correlation Rules — Cross-domain pattern detection
// ═══════════════════════════════════════════════════════════

/**
 * Detect cross-domain correlations from intelligence results.
 * Returns sorted by strength (highest first).
 *
 * 10 correlation rules covering:
 *   - Isolation-driven churn
 *   - Engagement-churn decay
 *   - Dormancy risk
 *   - Upgrade opportunity
 *   - Activity gap
 *   - Social-activity synergy
 *   - Onboarding failure
 *   - Cross-domain amplification
 *   - Social decay + lifecycle risk
 *   - Holistic health
 */
export function findCorrelations(
  results: IntelligenceResults,
): readonly IntelligenceCorrelation[] {
  const correlations: IntelligenceCorrelation[] = [];
  let idx = 0;
  const churnLevel = results.churn?.riskLevel ?? "low";
  const socialCount = results.social?.length ?? -1;
  const engageScore = results.engagement?.currentScore ?? 50;
  const stage = results.lifecycle?.currentStage ?? "";
  const score360 = results.intelligence?.healthScore.overall ?? 50;
  const activityMatch =
    results.activities && results.activities.length > 0
      ? results.activities.reduce((s, r) => s + r.matchScore, 0) /
        results.activities.length
      : 50;

  // Rule 1: Isolation-Driven Churn
  if (
    (churnLevel === "high" || churnLevel === "critical") &&
    socialCount >= 0 &&
    socialCount < 3
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["churn", "social"],
      strength: 0.85,
      insight:
        "El aislamiento social está impulsando el riesgo de churn. Sin conexiones fuertes, el vínculo con el club se debilita.",
      impact: "amplifying",
      recommendation:
        "Introducir a familias compatibles urgentemente para fortalecer la red social.",
    });
  }

  // Rule 2: Engagement-Churn Decay
  if (
    (churnLevel === "high" || churnLevel === "critical") &&
    engageScore < 50
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["churn", "engagement"],
      strength: 0.75,
      insight:
        "El engagement bajo correlaciona directamente con el riesgo de churn. La familia está desconectándose.",
      impact: "amplifying",
      recommendation:
        "Activar plan de engagement urgente con actividades de alto impacto.",
    });
  }

  // Rule 3: Dormancy Risk
  if (
    (stage === "plateau" || stage === "at_risk") &&
    engageScore < 55
  ) {
    const stageLabel = LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES]?.label ?? stage;
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["lifecycle", "engagement"],
      strength: 0.65,
      insight: `La etapa "${stageLabel}" combinada con engagement bajo puede derivar en dormancia.`,
      impact: "amplifying",
      recommendation:
        "Intervención inmediata con actividad personalizada para romper la meseta.",
    });
  }

  // Rule 4: Upgrade Opportunity
  if (
    churnLevel === "low" &&
    engageScore >= 75 &&
    (stage === "peak" || stage === "growing")
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["churn", "engagement"],
      strength: 0.55,
      insight:
        "Familia en momento óptimo para upgrade de tier — engagement alto, riesgo bajo, ciclo positivo.",
      impact: "mitigating",
      recommendation:
        "Ofrecer beneficios exclusivos del siguiente tier y una experiencia de reconocimiento.",
    });
  }

  // Rule 5: Activity Gap
  if (activityMatch < 45 && engageScore < 60) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["activities", "engagement"],
      strength: 0.5,
      insight:
        "No hay actividades adecuadas para los intereses de la familia, lo que alimenta el decay de engagement.",
      impact: "amplifying",
      recommendation:
        "Considerar actividades personalizadas o eventos a medida para esta familia.",
    });
  }

  // Rule 6: Social-Activity Synergy
  if (
    socialCount > 0 &&
    results.activities &&
    results.activities.length > 0
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["social", "activities"],
      strength: 0.5,
      insight:
        "Hay oportunidad de integrar conexiones sociales a través de actividades grupales.",
      impact: "mitigating",
      recommendation:
        "Organizar actividad conjunta con familias sugeridas para fortalecer vínculos.",
    });
  }

  // Rule 7: Onboarding Failure
  if (stage === "onboarding" && engageScore < 40) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["lifecycle", "engagement"],
      strength: 0.7,
      insight:
        "El onboarding no está generando engagement suficiente. Riesgo de abandono temprano.",
      impact: "amplifying",
      recommendation:
        "Intensificar el acompañamiento personalizado en las primeras semanas.",
    });
  }

  // Rule 8: Cross-Domain Amplification
  const highTensionThreads =
    results.intelligence?.crossDomainThreads?.filter(
      (t) => t.tension >= 0.7,
    ) ?? [];
  if (highTensionThreads.length > 0) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["family360", "churn"],
      strength: 0.6,
      insight: `Correlaciones de alto impacto detectadas entre dominios: ${highTensionThreads[0].description}`,
      impact: "amplifying",
      recommendation:
        "Abordar múltiples dominios simultáneamente para maximizar el efecto combinado.",
    });
  }

  // Rule 9: Social Decay + Lifecycle Risk
  if (
    socialCount >= 0 &&
    socialCount < 2 &&
    (stage === "plateau" || stage === "at_risk" || stage === "dormant")
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["social", "lifecycle"],
      strength: 0.6,
      insight:
        "Pocas conexiones sociales en una etapa vulnerable del ciclo de vida. Riesgo de desconexión total.",
      impact: "amplifying",
      recommendation:
        "Activar red de apoyo social como prioridad para frenar la espiral descendente.",
    });
  }

  // Rule 10: Holistic Health
  if (
    churnLevel === "low" &&
    engageScore >= 70 &&
    score360 >= 70 &&
    (stage === "growing" || stage === "peak")
  ) {
    correlations.push({
      id: `corr-${idx++}`,
      dimensions: ["churn", "family360"],
      strength: 0.4,
      insight:
        "Todos los indicadores saludables. Familia en plena forma — oportunidad de maximizar valor.",
      impact: "mitigating",
      recommendation:
        "Reconocer, retener y explorar oportunidades de upgrade o referidos.",
    });
  }

  return [...correlations].sort((a, b) => b.strength - a.strength);
}