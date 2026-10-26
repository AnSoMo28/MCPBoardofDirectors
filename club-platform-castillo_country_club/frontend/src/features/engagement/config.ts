// src/features/engagement/config.ts
// ═══════════════════════════════════════════════════════════
// Engagement Intelligence — Configuration & Derived Functions
// Castillo Country Club — Phase 31 "The Voice"
//
// All configuration constants, thresholds, defaults, and
// derived classification functions for the engagement
// intelligence layer.
//
// Zero hardcoded values — everything from tokens or config.
// Pure functions only — no side effects.
//
// Sections:
//   1. Re-exports from types (constants)
//   2. Dashboard Mode derivation
//   3. Ecosystem Intelligence
//   4. Gravitational Retention
//   5. Resonance Detection
//   6. DNA Mutation
//   7. Satisfaction Intelligence
//   8. Calibration (Dimension 6)
//   9. Discovery (Dimension 7)
//  10. Stream Priority
//  11. Ambient State
//  12. Utility Helpers
// ═══════════════════════════════════════════════════════════

import type {
  ActivityDomain,
  EngagementDashboardMode,
  EngagementAmbientState,
  EngagementDomainStatus,
  DomainSymbiosis,
  ResonancePattern,
  MomentOfTruthType,
  EngagementDNAMutation,
  SatisfactionDimension,
  CalibrationDelta,
  CalibrationReport,
  EmergentPattern,
  AnomalyFamily,
  EngagementDashboardSummary,
  EngagementDashboardTrendSummary,
  EngagementDashboardTrendPoint,
  EngagementVelocity,
  HealthScoreFactor,
  EngagementStreamSignal,
  DecisionScenarioType
} from "./types";

import {
  ECOSYSTEM_THRESHOLDS,
  GRAVITATIONAL_CONSTANTS,
  RESONANCE_THRESHOLDS,
  DNA_MUTATION_THRESHOLDS,
  CALIBRATION_THRESHOLDS,
  ENGAGEMENT_STREAM_PRIORITIES,
  ENGAGEMENT_AMBIENT_CONFIG,
  ACTIVITY_DOMAINS,
  ACTIVITY_DOMAIN_DISPLAY,
} from "./types";

// Re-export for consumers
export {
  ECOSYSTEM_THRESHOLDS,
  GRAVITATIONAL_CONSTANTS,
  RESONANCE_THRESHOLDS,
  DNA_MUTATION_THRESHOLDS,
  CALIBRATION_THRESHOLDS,
  ENGAGEMENT_STREAM_PRIORITIES,
  ENGAGEMENT_AMBIENT_CONFIG,
  ACTIVITY_DOMAINS,
  ACTIVITY_DOMAIN_DISPLAY,
};


// ═══════════════════════════════════════════════════════════
// 1. DASHBOARD MODE — Adaptive Morphism
// ═══════════════════════════════════════════════════════════

export const ENGAGEMENT_DASHBOARD_MODES = {
  calm: {
    label: "Serenidad",
    columns: 4,
    portraitVisible: true,
    streamCollapsed: false,
    description: "Engagement saludable — vista panorámica",
  },
  alert: {
    label: "Atención",
    columns: 3,
    portraitVisible: true,
    streamCollapsed: false,
    description: "Señales detectadas — vista densa",
  },
  critical: {
    label: "Intervención",
    columns: 1,
    portraitVisible: false,
    streamCollapsed: false,
    description: "Engagement en riesgo — vista enfocada",
  },
} as const;

/**
 * Derive dashboard mode from composite engagement state.
 * Considers health score, velocity, ecosystem health, and
 * gravitational escape velocity.
 *
 * @param healthScore 0-100 composite health score
 * @param velocityPerWeek engagement velocity per week (negative = declining)
 * @param ecosystemHealth 0-100 ecosystem health (optional)
 * @param escapeVelocity 0-100 gravitational escape velocity (optional)
 */
export function deriveEngDashboardMode(
  healthScore: number,
  velocityPerWeek: number,
  ecosystemHealth?: number,
  escapeVelocity?: number,
): EngagementDashboardMode {
  // Critical: health critical OR escape velocity imminent
  if (
    healthScore < 35 ||
    velocityPerWeek < -1.5 ||
    (escapeVelocity !== undefined && escapeVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_critical) ||
    (ecosystemHealth !== undefined && ecosystemHealth < 25)
  ) {
    return "critical";
  }

  // Alert: health warning OR declining velocity OR ecosystem stressed
  if (
    healthScore < 55 ||
    velocityPerWeek < -0.5 ||
    (escapeVelocity !== undefined && escapeVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_warning) ||
    (ecosystemHealth !== undefined && ecosystemHealth < 45)
  ) {
    return "alert";
  }

  return "calm";
}


// ═══════════════════════════════════════════════════════════
// 2. ECOSYSTEM INTELLIGENCE
// ═══════════════════════════════════════════════════════════

/**
 * Classify domain vitality into a discrete level.
 */
export function classifyDomainVitality(
  vitality: number,
): "thriving" | "healthy" | "stressed" | "critical" | "extinct" {
  if (vitality >= ECOSYSTEM_THRESHOLDS.vitality_thriving) return "thriving";
  if (vitality >= ECOSYSTEM_THRESHOLDS.vitality_healthy) return "healthy";
  if (vitality >= ECOSYSTEM_THRESHOLDS.vitality_warning) return "stressed";
  if (vitality >= ECOSYSTEM_THRESHOLDS.vitality_critical) return "critical";
  return "extinct";
}

/**
 * Get display color for domain vitality level.
 */
export function getVitalityColor(vitality: number): string {
  const level = classifyDomainVitality(vitality);
  const colors: Record<string, string> = {
    thriving: "var(--color-emerald-400)",
    healthy: "var(--color-teal-400)",
    stressed: "var(--color-amber-400)",
    critical: "var(--color-rose-400)",
    extinct: "var(--color-silver-500)",
  };
  return colors[level];
}

/**
 * Compute ecosystem diversity score (0-100).
 * Uses inverse Herfindahl-Hirschman Index (HHI).
 * 100 = perfectly even distribution. 0 = one domain has everything.
 */
export function computeEcosystemDiversity(
  domains: EngagementDomainStatus[],
): number {
  if (domains.length === 0) return 0;

  const totalVitality = domains.reduce((s, d) => s + d.vitality, 0);
  if (totalVitality === 0) return 0;

  // HHI = sum of squared market shares
  let hhi = 0;
  for (const d of domains) {
    const share = d.vitality / totalVitality;
    hhi += share * share;
  }

  // Normalize: HHI ranges from 1/N (perfectly even) to 1 (monopoly)
  // diversity = 100 * (1 - normalized HHI)
  const n = domains.length;
  const minHHI = 1 / n;
  const normalized = (hhi - minHHI) / (1 - minHHI);

  return Math.round(Math.max(0, Math.min(100, (1 - normalized) * 100)));
}

/**
 * Compute overall ecosystem health score (0-100).
 * Combines average vitality (40%), diversity (30%), and
 * symbiosis strength (30%).
 */
export function computeEcosystemHealth(
  domains: EngagementDomainStatus[],
  symbioses: DomainSymbiosis[],
): number {
  if (domains.length === 0) return 0;

  // Average vitality (0-100)
  const avgVitality = domains.reduce((s, d) => s + d.vitality, 0) / domains.length;

  // Diversity (0-100)
  const diversity = computeEcosystemDiversity(domains);

  // Average symbiosis strength (0-100)
  const avgSymbiosis = symbioses.length > 0
    ? (symbioses.reduce((s, sy) => s + sy.strength, 0) / symbioses.length) * 100
    : 30; // default: moderate

  return Math.round(avgVitality * 0.4 + diversity * 0.3 + avgSymbiosis * 0.3);
}

/**
 * Detect which domains are going extinct.
 */
export function detectExtinctDomains(
  domains: EngagementDomainStatus[],
): ActivityDomain[] {
  return domains
    .filter((d) => d.vitality <= ECOSYSTEM_THRESHOLDS.extinction_threshold)
    .map((d) => d.domain);
}

/**
 * Detect which domains are emerging (new or rapidly growing).
 */
export function detectEmergingDomains(
  domains: EngagementDomainStatus[],
): ActivityDomain[] {
  return domains
    .filter(
      (d) =>
        d.trend === "improving" &&
        d.vitality >= ECOSYSTEM_THRESHOLDS.emerging_threshold &&
        d.vitality < ECOSYSTEM_THRESHOLDS.vitality_healthy,
    )
    .map((d) => d.domain);
}

/**
 * Identify the dominant domain (highest vitality).
 */
export function identifyDominantDomain(
  domains: EngagementDomainStatus[],
): ActivityDomain {
  if (domains.length === 0) return "events";
  let max = domains[0];
  for (const d of domains) {
    if (d.vitality > max.vitality) max = d;
  }
  return max.domain;
}

/**
 * Check if ecosystem has dangerous dominance (single domain > threshold).
 */
export function hasDangerousDominance(
  domains: EngagementDomainStatus[],
): boolean {
  const totalVitality = domains.reduce((s, d) => s + d.vitality, 0);
  if (totalVitality === 0) return false;

  return domains.some(
    (d) => (d.vitality / totalVitality) * 100 > ECOSYSTEM_THRESHOLDS.dominance_danger,
  );
}


// ═══════════════════════════════════════════════════════════
// 3. GRAVITATIONAL RETENTION
// ═══════════════════════════════════════════════════════════

/**
 * Classify gravitational trend into a discrete state.
 */
export function classifyGravitationalState(
  totalGravity: number,
  exitVelocity: number,
): "deep_well" | "stable_orbit" | "drifting" | "escape_trajectory" {
  if (exitVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_critical) {
    return "escape_trajectory";
  }
  if (totalGravity >= 70 && exitVelocity < 30) return "deep_well";
  if (totalGravity >= 40) return "stable_orbit";
  return "drifting";
}

/**
 * Compute days until a family crosses the escape threshold.
 * Returns null if not approaching escape.
 */
export function computeDaysToEscape(
  exitVelocity: number,
  escapeThreshold: number,
  currentGravity: number,
): number | null {
  if (exitVelocity <= 0 || currentGravity >= escapeThreshold) return null;

  const gravityDeficit = escapeThreshold - currentGravity;
  if (gravityDeficit <= 0) return null;

  // Velocity is points per week, we want days
  // exitVelocity represents speed of gravity loss
  const weeksToEscape = gravityDeficit / Math.max(exitVelocity, 0.1);
  const daysToEscape = Math.round(weeksToEscape * 7);

  return daysToEscape > 0 && daysToEscape < 365 ? daysToEscape : null;
}

/**
 * Get display color for gravitational state.
 */
export function getGravityStateColor(state: string): string {
  const colors: Record<string, string> = {
    deep_well: "var(--color-emerald-400)",
    stable_orbit: "var(--color-teal-400)",
    drifting: "var(--color-amber-400)",
    escape_trajectory: "var(--color-rose-400)",
  };
  return colors[state] ?? "var(--color-silver-400)";
}


// ═══════════════════════════════════════════════════════════
// 4. RESONANCE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Classify resonance intensity from a pattern.
 */
export function classifyResonanceIntensity(
  pattern: ResonancePattern,
): "fading" | "moderate" | "amplified" | "identity_level" {
  const score =
    (pattern.impactDuration >= RESONANCE_THRESHOLDS.impact_duration_long ? 25 : pattern.impactDuration >= RESONANCE_THRESHOLDS.impact_duration_medium ? 15 : 5) +
    (pattern.echoCount >= RESONANCE_THRESHOLDS.echo_count_amplified ? 25 : pattern.echoCount >= 2 ? 15 : 5) +
    (pattern.identityIntegration >= RESONANCE_THRESHOLDS.identity_integration_high ? 30 : pattern.identityIntegration >= 40 ? 15 : 5) +
    (pattern.socialAmplification >= RESONANCE_THRESHOLDS.social_amplification_high ? 20 : 10);

  if (score >= 80) return "identity_level";
  if (score >= 60) return "amplified";
  if (score >= 35) return "moderate";
  return "fading";
}

/**
 * Compute total resonance score for the ecosystem (0-100).
 * Averages all patterns' resonance intensity.
 */
export function computeTotalResonance(
  patterns: ResonancePattern[],
): number {
  if (patterns.length === 0) return 30; // baseline

  const intensities = patterns.map((p) => {
    const level = classifyResonanceIntensity(p);
    const scores: Record<string, number> = {
      fading: 15,
      moderate: 45,
      amplified: 70,
      identity_level: 95,
    };
    return scores[level];
  });

  return Math.round(
    intensities.reduce((s, v) => s + v, 0) / intensities.length,
  );
}


// ═══════════════════════════════════════════════════════════
// 5. DNA MUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Classify mutation severity based on domains affected and confidence.
 */
export function classifyMutationSeverity(
  mutation: EngagementDNAMutation,
): "minor" | "moderate" | "major" | "fundamental" {
  const domainCount = mutation.domains.length;
  if (domainCount >= 4 && mutation.confidence >= 0.8) return "fundamental";
  if (domainCount >= 3 || mutation.confidence >= 0.7) return "major";
  if (domainCount >= 2 || mutation.confidence >= 0.6) return "moderate";
  return "minor";
}

/**
 * Get display color for mutation severity.
 */
export function getMutationSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    minor: "var(--color-silver-400)",
    moderate: "var(--color-amber-400)",
    major: "var(--color-terracotta-400)",
    fundamental: "var(--color-rose-400)",
  };
  return colors[severity] ?? "var(--color-silver-400)";
}


// ═══════════════════════════════════════════════════════════
// 6. SATISFACTION INTELLIGENCE
// ═══════════════════════════════════════════════════════════

/**
 * Compute a composite satisfaction score (0-100) from dimensions.
 * Weighted by improvement ROI — higher ROI dimensions matter more
 * because they represent the biggest leverage point.
 */
export function computeCompositeSatisfaction(
  dimensions: SatisfactionDimension[],
): number {
  if (dimensions.length === 0) return 50;

  const totalROI = dimensions.reduce((s, d) => s + Math.max(d.improvementROI, 0.1), 0);

  const weightedSum = dimensions.reduce(
    (s, d) => s + d.score * (Math.max(d.improvementROI, 0.1) / totalROI),
    0,
  );

  return Math.round(Math.min(100, Math.max(0, weightedSum)));
}

/**
 * Identify the highest-priority improvement dimension.
 */
export function identifyPriorityDimension(
  dimensions: SatisfactionDimension[],
): SatisfactionDimension | null {
  if (dimensions.length === 0) return null;

  // Priority = low score + high ROI + declining trend
  let best = dimensions[0];
  let bestPriority = -Infinity;

  for (const d of dimensions) {
    const trendPenalty = d.trend === "declining" ? 20 : d.trend === "stable" ? 0 : -10;
    const priority = (100 - d.score) + (d.improvementROI * 10) + trendPenalty;

    if (priority > bestPriority) {
      bestPriority = priority;
      best = d;
    }
  }

  return best;
}

/**
 * Classify NPS into a segment.
 */
export function classifyNPSSegment(
  nps: number,
): { segment: "promoter" | "passive" | "detractor"; color: string; label: string } {
  if (nps >= 9) return { segment: "promoter", color: "var(--color-emerald-400)", label: "Promotor" };
  if (nps >= 7) return { segment: "passive", color: "var(--color-amber-400)", label: "Pasivo" };
  return { segment: "detractor", color: "var(--color-rose-400)", label: "Detractor" };
}

/**
 * Compute NPS from promoter/detractor percentages.
 */
export function computeNPS(
  promoterPct: number,
  detractorPct: number,
): number {
  return Math.round(promoterPct - detractorPct);
}

/**
 * Get display color for NPS value.
 */
export function getNPSColor(nps: number): string {
  if (nps >= 50) return "var(--color-emerald-400)";
  if (nps >= 20) return "var(--color-teal-400)";
  if (nps >= 0) return "var(--color-amber-400)";
  if (nps >= -20) return "var(--color-terracotta-400)";
  return "var(--color-rose-400)";
}


// ═══════════════════════════════════════════════════════════
// 7. CALIBRATION (Dimension 6: Auto-correction)
// ═══════════════════════════════════════════════════════════

/**
 * Compute calibration delta for a single prediction.
 */
export function computeCalibrationDelta(
  ruleId: string,
  metric: string,
  predicted: number,
  actual: number,
): CalibrationDelta {
  const error = actual - predicted;
  const errorPct = predicted !== 0 ? (error / Math.abs(predicted)) * 100 : 0;

  const direction: CalibrationDelta["direction"] =
    Math.abs(errorPct) <= CALIBRATION_THRESHOLDS.accurate_tolerance_pct
      ? "accurate"
      : error > 0
        ? "underestimate"
        : "overestimate";

  let suggestedAdjustment = "No change needed";
  if (direction === "overestimate") {
    suggestedAdjustment = `Reduce threshold by ~${Math.abs(errorPct).toFixed(0)}%`;
  } else if (direction === "underestimate") {
    suggestedAdjustment = `Increase threshold by ~${Math.abs(errorPct).toFixed(0)}%`;
  }

  return {
    ruleId,
    metric,
    predicted,
    actual,
    error: Math.round(error * 100) / 100,
    errorPct: Math.round(errorPct * 100) / 100,
    direction,
    suggestedAdjustment,
  };
}

/**
 * Generate a calibration report from a set of deltas.
 */
export function generateCalibrationReport(
  deltas: CalibrationDelta[],
): CalibrationReport {
  const accurate = deltas.filter((d) => d.direction === "accurate").length;
  const total = deltas.length;
  const accuracyRate = total > 0 ? accurate / total : 0;

  const recommendations: string[] = [];
  const overestimates = deltas.filter((d) => d.direction === "overestimate");
  const underestimates = deltas.filter((d) => d.direction === "underestimate");

  if (overestimates.length > total * 0.3) {
    recommendations.push(
      `${overestimates.length} predictions overestimated — consider raising thresholds`,
    );
  }
  if (underestimates.length > total * 0.3) {
    recommendations.push(
      `${underestimates.length} predictions underestimated — consider lowering thresholds`,
    );
  }
  if (accuracyRate >= 0.8) {
    recommendations.push("Overall calibration is healthy (>80% accurate)");
  }

  return {
    timestamp: new Date().toISOString(),
    totalPredictions: total,
    accuratePredictions: accurate,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    deltas,
    overallReliability: Math.round(accuracyRate * 100),
    recommendedChanges: recommendations,
  };
}

/**
 * Should we recalibrate? True if we have enough data and accuracy is low.
 */
export function shouldRecalibrate(report: CalibrationReport): boolean {
  return (
    report.totalPredictions >= CALIBRATION_THRESHOLDS.minimum_predictions &&
    report.accuracyRate < 0.7
  );
}


// ═══════════════════════════════════════════════════════════
// 8. DISCOVERY (Dimension 7: Emergent Patterns)
// ═══════════════════════════════════════════════════════════

/**
 * Classify emergent pattern significance.
 */
export function classifyPatternSignificance(
  pattern: EmergentPattern,
): "noise" | "interesting" | "significant" | "breakthrough" {
  const score = pattern.confidence * 0.4 + pattern.novelty * 0.3 + (pattern.affectedFamilies > 5 ? 30 : pattern.affectedFamilies * 6);

  if (score >= 80) return "breakthrough";
  if (score >= 60) return "significant";
  if (score >= 40) return "interesting";
  return "noise";
}

/**
 * Compute discovery priority for sorting.
 * Higher = more important to surface.
 */
export function computeDiscoveryPriority(pattern: EmergentPattern): number {
  const significance = classifyPatternSignificance(pattern);
  const sigScores: Record<string, number> = {
    breakthrough: 100,
    significant: 70,
    interesting: 40,
    noise: 10,
  };

  return (
    sigScores[significance] +
    (pattern.actionable ? 15 : 0) +
    (pattern.domains.length >= 3 ? 10 : 0)
  );
}

/**
 * Classify anomaly family type into a display-friendly category.
 */
export function classifyAnomalyType(
  anomaly: AnomalyFamily,
): { label: string; color: string; icon: string } {
  const types: Record<string, { label: string; color: string; icon: string }> = {
    positive_surprise: {
      label: "Sorpresa Positiva",
      color: "var(--color-emerald-400)",
      icon: "Sparkles",
    },
    negative_surprise: {
      label: "Sorpresa Negativa",
      color: "var(--color-rose-400)",
      icon: "AlertTriangle",
    },
    contagion: {
      label: "Efecto Contagio",
      color: "var(--color-amber-400)",
      icon: "GitBranch",
    },
    isolation: {
      label: "Aislamiento",
      color: "var(--color-silver-400)",
      icon: "UserX",
    },
  };
  return types[anomaly.anomalyType] ?? types.positive_surprise;
}


// ═══════════════════════════════════════════════════════════
// 9. STREAM PRIORITY
// ═══════════════════════════════════════════════════════════

/**
 * Compute priority score for a stream signal.
 * Combines base weight from config with confidence modifier.
 */
export function computeSignalPriority(
  signalType: string,
  confidence: number,
): number {
  const base = ENGAGEMENT_STREAM_PRIORITIES[signalType]?.weight ?? 20;
  // Confidence modifies priority: high confidence = full weight,
  // low confidence = 60% weight
  const confidenceMod = 0.6 + (confidence / 100) * 0.4;
  return Math.round(base * confidenceMod);
}

/**
 * Sort stream signals by priority (descending).
 */
export function sortStreamSignals(
  signals: EngagementStreamSignal[],
): EngagementStreamSignal[] {
  return [...signals].sort((a, b) => b.priority - a.priority);
}

/**
 * Filter stream signals to only show actionable + high priority.
 */
export function filterActionableSignals(
  signals: EngagementStreamSignal[],
  minPriority: number = 30,
): EngagementStreamSignal[] {
  return signals.filter((s) => s.priority >= minPriority && s.actionable);
}

/**
 * Derive the decision scenario type from the current system state.
 */
export function deriveDecisionScenario(
  healthScore: number,
  velocityPerWeek: number,
  escapeVelocity: number,
  atRiskCount: number,
  totalFamilies: number,
): DecisionScenarioType {
  const atRiskPct = totalFamilies > 0 ? atRiskCount / totalFamilies : 0;

  // Escape velocity is the most urgent
  if (escapeVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_critical) {
    return "churn_prevention";
  }

  // High at-risk percentage
  if (atRiskPct > 0.15) {
    return "financial_exposure";
  }

  // Declining velocity but still above critical
  if (velocityPerWeek < -0.5 && healthScore >= 35) {
    return "engagement_boost";
  }

  // Health declining
  if (healthScore < 50) {
    return "lifecycle_transition";
  }

  return "engagement_boost";
}


// ═══════════════════════════════════════════════════════════
// 10. AMBIENT STATE
// ═══════════════════════════════════════════════════════════

/**
 * Derive ambient state from dashboard mode.
 * Returns the full ambient configuration for the breathing background.
 */
export function deriveAmbientState(
  mode: EngagementDashboardMode,
): EngagementAmbientState {
  const config = ENGAGEMENT_AMBIENT_CONFIG[mode];
  return {
    mode,
    pulseSpeed: config.pulseSpeed,
    intensity: config.intensity,
    color: config.color,
    gradient: config.gradient,
  };
}


// ═══════════════════════════════════════════════════════════
// 11. HEALTH SCORE
// ═══════════════════════════════════════════════════════════

/**
 * 5-factor composite health score (0-100).
 * Extracted from useMemberEngagementAdvisor for testability.
 *
 * 1. Activity Pulse (25%)  — active_30d / total
 * 2. Engagement Depth (25%) — avg_score / 100
 * 3. Risk Balance (20%)    — 1 - at_risk/total
 * 4. NPS Signal (15%)      — (nps+100)/200
 * 5. Growth Vector (15%)   — (improving-declining)/total
 */
export function computeEngagementHealthScore(
  summary: EngagementDashboardSummary,
  trendSummary: EngagementDashboardTrendSummary,
): { score: number; grade: string; factors: HealthScoreFactor[] } {
  const tf = summary.total_families || 1;

  const activityPulse = Math.min(1, summary.active_30d / tf);
  const engagementDepth = Math.min(1, summary.avg_score / 100);
  const riskBalance = 1 - Math.min(1, summary.at_risk_count / tf);
  const npsSignal = Math.max(0, Math.min(1, (summary.nps_score + 100) / 200));
  const netGrowth = (trendSummary.improving - trendSummary.declining) / tf;
  const growthVector = Math.max(0, Math.min(1, (netGrowth + 1) / 2));

  const raw =
    activityPulse * 25 +
    engagementDepth * 25 +
    riskBalance * 20 +
    npsSignal * 15 +
    growthVector * 15;

  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const grade =
    score >= 90 ? "A" :
    score >= 80 ? "B+" :
    score >= 70 ? "B" :
    score >= 60 ? "C" :
    score >= 45 ? "D" : "F";

  const r = (v: number, w: number) => Math.round(v * w * 10) / 10;
  const factors: HealthScoreFactor[] = [
    { label: "Activity Pulse", value: activityPulse, weight: 25, contribution: r(activityPulse, 25) },
    { label: "Engagement Depth", value: engagementDepth, weight: 25, contribution: r(engagementDepth, 25) },
    { label: "Risk Balance", value: riskBalance, weight: 20, contribution: r(riskBalance, 20) },
    { label: "NPS Signal", value: npsSignal, weight: 15, contribution: r(npsSignal, 15) },
    { label: "Growth Vector", value: growthVector, weight: 15, contribution: r(growthVector, 15) },
  ];

  return { score, grade, factors };
}

/**
 * Get display color for health grade.
 */
export function getHealthGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    A: "var(--color-emerald-400)",
    "B+": "var(--color-teal-400)",
    B: "var(--color-teal-300)",
    C: "var(--color-amber-400)",
    D: "var(--color-terracotta-400)",
    F: "var(--color-rose-400)",
  };
  return colors[grade] ?? "var(--color-silver-400)";
}

/**
 * Get display color for health score (continuous 0-100).
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return "var(--color-emerald-400)";
  if (score >= 60) return "var(--color-teal-400)";
  if (score >= 40) return "var(--color-amber-400)";
  if (score >= 25) return "var(--color-terracotta-400)";
  return "var(--color-rose-400)";
}


// ═══════════════════════════════════════════════════════════
// 12. VELOCITY
// ═══════════════════════════════════════════════════════════

/**
 * Compute engagement velocity from monthly trend data.
 * Extracted from useMemberEngagementAdvisor for testability.
 * Pure mathematical derivation — no backend calls.
 */
export function computeEngagementVelocity(
  trend: EngagementDashboardTrendPoint[],
): EngagementVelocity | null {
  if (trend.length < 2) return null;

  const current = trend[trend.length - 1];
  const oneMonthAgo = trend[trend.length - 2];
  const twoMonthsAgo = trend.length >= 3 ? trend[trend.length - 3] : oneMonthAgo;

  const currentScore = current.avg_score;
  const score30d = oneMonthAgo.avg_score;
  const score60d = twoMonthsAgo.avg_score;

  // Velocity: points change per week (4.33 weeks/month)
  const velocityPerWeek = (currentScore - score30d) / 4.33;
  const prevVelocityPerWeek = (score30d - score60d) / 4.33;
  const acceleration = velocityPerWeek - prevVelocityPerWeek;

  // Trajectory: consistent direction over available months
  let traj: "improving" | "stable" | "declining" = "stable";
  if (trend.length >= 3) {
    const last3 = trend.slice(-3);
    const deltas = last3.slice(1).map((t, i) => t.avg_score - last3[i].avg_score);
    const allUp = deltas.every((d) => d > 0.3);
    const allDown = deltas.every((d) => d < -0.3);
    if (allUp) traj = "improving";
    else if (allDown) traj = "declining";
  } else if (trend.length === 2) {
    const delta = currentScore - score30d;
    if (delta > 1) traj = "improving";
    else if (delta < -1) traj = "declining";
  }

  // 90d projection (12.86 weeks in 90 days)
  const rawProjection = currentScore + velocityPerWeek * 12.86;
  const projection90d = Math.max(0, Math.min(100, Math.round(rawProjection)));

  // Range: +/- 2x acceleration magnitude over 13 weeks
  const rangeWidth = Math.abs(acceleration) * 13 * 2;
  const projectionRange: [number, number] = [
    Math.max(0, Math.round(projection90d - rangeWidth)),
    Math.min(100, Math.round(projection90d + rangeWidth)),
  ];

  return {
    current_score: Math.round(currentScore * 10) / 10,
    score_30d: Math.round(score30d * 10) / 10,
    score_60d: Math.round(score60d * 10) / 10,
    velocity_per_week: Math.round(velocityPerWeek * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    trajectory: traj,
    projection_90d: projection90d,
    projection_range: projectionRange,
  };
}


// ═══════════════════════════════════════════════════════════
// 13. MOMENTS OF TRUTH
// ═══════════════════════════════════════════════════════════

/**
 * Classify a moment of truth's impact on retention.
 */
export function classifyMomentImpact(
  impact: number,
): { level: "critical" | "significant" | "moderate" | "minor"; color: string } {
  const abs = Math.abs(impact);
  if (abs >= 70) return { level: "critical", color: impact > 0 ? "var(--color-emerald-400)" : "var(--color-rose-400)" };
  if (abs >= 40) return { level: "significant", color: impact > 0 ? "var(--color-teal-400)" : "var(--color-terracotta-400)" };
  if (abs >= 20) return { level: "moderate", color: impact > 0 ? "var(--color-sage-400)" : "var(--color-amber-400)" };
  return { level: "minor", color: "var(--color-silver-400)" };
}

/**
 * Get display icon name for moment type.
 */
export function getMomentIcon(type: MomentOfTruthType): string {
  const icons: Record<MomentOfTruthType, string> = {
    first_impression: "Sparkles",
    social_bonding: "Users",
    identity_integration: "Crown",
    milestone: "Award",
    recovery: "ShieldCheck",
    crisis: "AlertTriangle",
    celebration: "PartyPopper",
  };
  return icons[type] ?? "Circle";
}


// ═══════════════════════════════════════════════════════════
// 14. CROSS-DOMAIN HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Compute engagement-to-satisfaction divergence.
 * Returns true if engagement is stable/improving but satisfaction declining.
 */
export function detectSatisfactionDivergence(
  engagementTrajectory: "improving" | "stable" | "declining",
  satisfactionTrend: "improving" | "stable" | "declining",
): boolean {
  const engOk = engagementTrajectory === "improving" || engagementTrajectory === "stable";
  return satisfactionTrend === "declining" && engOk;
}

/**
 * Compute NPS-engagement disconnect.
 * Returns true if high engagement score but negative NPS.
 */
export function detectNPSDisconnect(
  avgScore: number,
  npsScore: number,
): boolean {
  return avgScore > 60 && npsScore < 0;
}

/**
 * Compute financial exposure from at-risk families.
 * Returns percentage of base at risk and estimated revenue impact.
 */
export function computeFinancialExposure(
  atRiskCount: number,
  totalFamilies: number,
): {
  exposurePct: number;
  severity: "low" | "medium" | "high" | "critical";
} {
  const tf = totalFamilies || 1;
  const exposurePct = atRiskCount / tf;

  let severity: "low" | "medium" | "high" | "critical" = "low";
  if (exposurePct > 0.20) severity = "critical";
  else if (exposurePct > 0.15) severity = "high";
  else if (exposurePct > 0.10) severity = "medium";

  return { exposurePct, severity };
}


// ═══════════════════════════════════════════════════════════
// 15. UTILITY HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Map legacy engagement level to master EngagementLevel.
 * Handles both old (5-level) and new (7-level) systems.
 */
export function mapEngagementLevel(
  level: string,
): string {
  const legacyMap: Record<string, string> = {
    thriving: "champion",
    active: "active",
    moderate: "warm",
    at_risk: "at_risk",
    dormant: "inactive",
  };
  return legacyMap[level] ?? level;
}

/**
 * Format a number as a percentage string.
 */
export function formatPct(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute a 0-100 score from a ratio (0-1).
 */
export function ratioToScore(ratio: number): number {
  return Math.round(clamp(ratio * 100, 0, 100));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Get trend direction icon name for Lucide.
 */
export function getTrendIcon(trend: string): string {
  const icons: Record<string, string> = {
    improving: "TrendingUp",
    stable: "Minus",
    declining: "TrendingDown",
    attracting: "TrendingUp",
    repelling: "TrendingDown",
  };
  return icons[trend] ?? "Minus";
}

/**
 * Get trend direction color.
 */
export function getTrendColor(trend: string): string {
  const colors: Record<string, string> = {
    improving: "var(--color-emerald-400)",
    stable: "var(--color-silver-400)",
    declining: "var(--color-rose-400)",
    attracting: "var(--color-emerald-400)",
    repelling: "var(--color-rose-400)",
  };
  return colors[trend] ?? "var(--color-silver-400)";
}

/**
 * Get severity color for display.
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: "var(--color-silver-400)",
    medium: "var(--color-amber-400)",
    high: "var(--color-terracotta-400)",
    critical: "var(--color-rose-400)",
    info: "var(--color-teal-400)",
  };
  return colors[severity] ?? "var(--color-silver-400)";
}