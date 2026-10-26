// src/shared/lib/advisor-engine/calibration.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Calibration Engine (F50)
//
// Statistical analysis of rule accuracy based on historical
// outcomes. Computes adjustment factors that scale confidence
// scores based on how reliable each rule has been.
//
// Calibration Formula:
//   calibratedConfidence = originalConfidence × adjustmentFactor
//
//   adjustmentFactor:
//     - < 3 outcomes:  1.0 (no data → don't adjust)
//     - 3-10 outcomes: 0.7 × accuracy + 0.3 × 1.0 (blend with prior)
//     - 10+ outcomes:  accuracy rate (fully data-driven)
//
// Accuracy Rate:
//   (successes + partials × 0.5) / totalKnown
//   where totalKnown = total - unknowns
//
// Depends on:
//   ./calibration-types (RuleOutcome, CalibrationResult, etc.)
//   ./calibration-storage (getAllOutcomes, getChainOutcomes)
// ═══════════════════════════════════════════════════════════

import type {
  RuleOutcome,
  CalibrationResult,
  CalibrationReport,
  CausalChainOutcome,
} from "./calibration-types";
import { getAllOutcomes, getOutcomesForRule, getChainOutcomes } from "./calibration-storage";
import type { AIDomain } from "@/shared/types/ai-intelligence";
import { ENGINE_RULES } from "./rule-registry";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — SINGLE RULE CALIBRATION
// ═══════════════════════════════════════════════════════════

/**
 * Calibrate a single rule based on its historical outcomes.
 *
 * @param ruleId — The rule to calibrate
 * @param domain — Domain that owns the rule
 * @returns CalibrationResult with adjustment factor
 */
export function calibrateRule(
  ruleId: string,
  domain: AIDomain,
): CalibrationResult {
  const outcomes = getOutcomesForRule(ruleId);

  const successCount = outcomes.filter((o) => o.outcome === "success").length;
  const partialCount = outcomes.filter((o) => o.outcome === "partial").length;
  const failedCount = outcomes.filter((o) => o.outcome === "failed").length;
  const unknownCount = outcomes.filter((o) => o.outcome === "unknown").length;

  const totalKnown = outcomes.length - unknownCount;
  const accuracyRate =
    totalKnown > 0
      ? (successCount + partialCount * 0.5) / totalKnown
      : 0;

  const totalOutcomes = outcomes.length;
  const readiness: CalibrationResult["readiness"] =
    totalOutcomes < 3 ? "cold" : totalOutcomes < 10 ? "warming" : "calibrated";

  const adjustmentFactor = computeAdjustmentFactor(accuracyRate, totalOutcomes);

  const avgOriginalConfidence =
    totalOutcomes > 0
      ? Math.round(
          outcomes.reduce((sum, o) => sum + o.originalConfidence, 0) /
            totalOutcomes,
        )
      : 0;

  const trend = computeTrend(outcomes);

  return {
    ruleId,
    domain,
    totalOutcomes,
    successCount,
    partialCount,
    failedCount,
    unknownCount,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    readiness,
    adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
    avgOriginalConfidence,
    trend,
    calibratedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — BATCH CALIBRATION
// ═══════════════════════════════════════════════════════════

/**
 * Calibrate all rules that have outcomes.
 * Returns a map of ruleId → CalibrationResult for quick lookup.
 */
export function calibrateAllRules(): Map<string, CalibrationResult> {
  const outcomes = getAllOutcomes();
  const ruleIds = new Set(outcomes.map((o) => o.ruleId));
  const results = new Map<string, CalibrationResult>();

  // 1. Calibrate rules that have real outcomes
  for (const ruleId of ruleIds) {
    const domain = outcomes.find((o) => o.ruleId === ruleId)?.domain ?? "global" as AIDomain;
    results.set(ruleId, calibrateRule(ruleId, domain));
  }

  // 2. F57-B4: Register all known global rules from registry (25 rules)
  // Rules with 0 outcomes get "cold" status — visible in dashboard,
  // ready for real outcome accumulation.
  for (const rule of ENGINE_RULES) {
    if (!results.has(rule.id)) {
      results.set(rule.id, {
        ruleId: rule.id,
        domain: rule.domain as AIDomain,
        totalOutcomes: 0,
        successCount: 0,
        partialCount: 0,
        failedCount: 0,
        unknownCount: 0,
        accuracyRate: 0,
        readiness: "cold",
        adjustmentFactor: 1.0,
        avgOriginalConfidence: 0,
        trend: "insufficient_data" as const,
        calibratedAt: Date.now(),
      });
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — CONFIDENCE ADJUSTMENT
// ═══════════════════════════════════════════════════════════

/**
 * Apply calibration to a confidence score.
 *
 * @param originalConfidence — The rule's computed confidence (0-100)
 * @param ruleId — Rule ID to look up calibration
 * @param calibrationCache — Pre-computed calibration results (optional, for performance)
 * @returns Calibrated confidence (0-100)
 */
export function computeCalibratedConfidence(
  originalConfidence: number,
  ruleId: string,
  calibrationCache?: Map<string, CalibrationResult>,
): number {
  const cache = calibrationCache ?? calibrateAllRules();
  const calibration = cache.get(ruleId);

  if (!calibration) return originalConfidence;

  const calibrated = Math.round(
    Math.max(0, Math.min(100, originalConfidence * calibration.adjustmentFactor)),
  );

  return calibrated;
}

/**
 * Get the delta between original and calibrated confidence.
 * Positive = system is overconfident (should reduce).
 * Negative = system is underconfident (should increase).
 */
export function getConfidenceDelta(
  originalConfidence: number,
  ruleId: string,
  calibrationCache?: Map<string, CalibrationResult>,
): { delta: number; direction: "overconfident" | "underconfident" | "accurate" } {
  const calibrated = computeCalibratedConfidence(
    originalConfidence,
    ruleId,
    calibrationCache,
  );
  const delta = originalConfidence - calibrated;

  return {
    delta: Math.abs(delta),
    direction:
      delta > 2
        ? "overconfident"
        : delta < -2
          ? "underconfident"
          : "accurate",
  };
}

/**
 * Check if there's enough calibration data to be useful.
 */
export function isCalibrationReady(
  ruleId: string,
  calibrationCache?: Map<string, CalibrationResult>,
): boolean {
  const cache = calibrationCache ?? calibrateAllRules();
  const calibration = cache.get(ruleId);
  return (calibration?.totalOutcomes ?? 0) >= 3;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CAUSAL CHAIN VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Compute accuracy of causal chain patterns.
 * For each pattern, checks validated outcomes to see if
 * the predicted cascade actually happened.
 */
export function computeCausalChainAccuracy(): Array<{
  patternId: string;
  detections: number;
  validated: number;
  confirmed: number;
  accuracy: number;
}> {
  const outcomes = getChainOutcomes();
  const byPattern = new Map<string, CausalChainOutcome[]>();

  for (const outcome of outcomes) {
    const existing = byPattern.get(outcome.patternId) ?? [];
    existing.push(outcome);
    byPattern.set(outcome.patternId, existing);
  }

  const results: Array<{
    patternId: string;
    detections: number;
    validated: number;
    confirmed: number;
    accuracy: number;
  }> = [];

  for (const [patternId, chainOutcomes] of byPattern) {
    const validated = chainOutcomes.filter((o) => o.validated);
    const confirmed = validated.filter((o) => o.validated === true);
    const accuracy =
      validated.length > 0 ? confirmed.length / validated.length : 0;

    results.push({
      patternId,
      detections: chainOutcomes.length,
      validated: validated.length,
      confirmed: confirmed.length,
      accuracy: Math.round(accuracy * 100) / 100,
    });
  }

  return results.sort((a, b) => b.accuracy - a.accuracy);
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — AGGREGATE REPORT
// ═══════════════════════════════════════════════════════════

/**
 * Generate a full calibration report across all tracked rules.
 */
export function getCalibrationReport(): CalibrationReport {
  const allOutcomes = getAllOutcomes();
  const calibrationMap = calibrateAllRules();
  const results = Array.from(calibrationMap.values());

  const totalOutcomes = allOutcomes.length;
  const rulesTracked = results.length;
  const calibratedRules = results.filter((r) => r.readiness === "calibrated").length;
  const warmingRules = results.filter((r) => r.readiness === "warming").length;
  const coldRules = results.filter((r) => r.readiness === "cold").length;

  const totalKnown = allOutcomes.filter((o) => o.outcome !== "unknown").length;
  const totalSuccesses = allOutcomes.filter((o) => o.outcome === "success").length;
  const totalPartials = allOutcomes.filter((o) => o.outcome === "partial").length;
  const overallAccuracy =
    totalKnown > 0
      ? Math.round(((totalSuccesses + totalPartials * 0.5) / totalKnown) * 100) / 100
      : 0;

  const sorted = [...results].sort((a, b) => b.accuracyRate - a.accuracyRate);

  return {
    totalOutcomes,
    rulesTracked,
    calibratedRules,
    warmingRules,
    coldRules,
    overallAccuracy,
    results: sorted,
    topRules: sorted.slice(0, 5),
    bottomRules: sorted.slice(-5).reverse(),
    generatedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Compute the adjustment factor based on accuracy and sample size.
 *
 * < 3 outcomes:  1.0 (no adjustment — not enough data)
 * 3-10 outcomes: 70% accuracy + 30% prior (blend with default)
 * 10+ outcomes:  fully data-driven accuracy rate
 */
function computeAdjustmentFactor(
  accuracyRate: number,
  totalOutcomes: number,
): number {
  if (totalOutcomes < 3) return 1.0;
  if (totalOutcomes < 10) return 0.7 * accuracyRate + 0.3;
  return accuracyRate;
}

/**
 * Compute trend from recent outcomes.
 * Compares last 30% of outcomes vs first 70%.
 */
function computeTrend(
  outcomes: RuleOutcome[],
): CalibrationResult["trend"] {
  if (outcomes.length < 6) return "insufficient_data";

  const splitIdx = Math.floor(outcomes.length * 0.7);
  const early = outcomes.slice(0, splitIdx);
  const recent = outcomes.slice(splitIdx);

  const earlyAccuracy = computeRawAccuracy(early);
  const recentAccuracy = computeRawAccuracy(recent);

  const delta = recentAccuracy - earlyAccuracy;

  if (delta > 0.1) return "improving";
  if (delta < -0.1) return "declining";
  return "stable";
}

/**
 * Raw accuracy for a set of outcomes.
 */
function computeRawAccuracy(outcomes: RuleOutcome[]): number {
  const known = outcomes.filter((o) => o.outcome !== "unknown");
  if (known.length === 0) return 0;
  const successes = known.filter((o) => o.outcome === "success").length;
  const partials = known.filter((o) => o.outcome === "partial").length;
  return (successes + partials * 0.5) / known.length;
}