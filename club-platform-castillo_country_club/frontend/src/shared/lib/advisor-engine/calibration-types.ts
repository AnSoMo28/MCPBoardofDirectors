// src/shared/lib/advisor-engine/calibration-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Calibration Type Definitions (F50)
//
// Types for the Learning Loop: outcome tracking, rule
// calibration, and confidence adjustment based on
// historical accuracy.
//
// Architecture:
//   RuleOutcome     → tracked per insight execution
//   CalibrationResult → per-rule accuracy analysis
//   CalibrationReport → aggregate system-wide report
//   CausalChainOutcome → chain validation tracking
//
// Storage: localStorage (MVP) → backend (production)
// Depends on: ./types (DomainSignal, CausalChain)
// ═══════════════════════════════════════════════════════════

import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — OUTCOME TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * Status of an insight outcome after execution.
 *
 * Determined by:
 *   - "success": Action had the expected positive effect
 *   - "partial":  Action helped but didn't fully resolve
 *   - "failed":   Action had no effect or made things worse
 *   - "unknown":  Outcome couldn't be determined (timeout, no data)
 */
export type OutcomeStatus = "success" | "partial" | "failed" | "unknown";

/**
 * A tracked outcome for an insight that was executed.
 * Stored in localStorage, keyed by ruleId for calibration lookup.
 */
export interface RuleOutcome {
  /** Unique outcome ID */
  id: string;

  /** Rule that produced the insight (e.g., "global_systemic_risk") */
  ruleId: string;

  /** Domain that owns the rule */
  domain: AIDomain;

  /** Impact level the insight declared */
  impact: AdvisorImpactLevel;

  /** Confidence score the insight declared (0-100) */
  originalConfidence: number;

  /** What happened after execution */
  outcome: OutcomeStatus;

  /** When the insight was executed */
  executedAt: number;

  /** When the outcome was recorded (may differ from executedAt) */
  recordedAt: number;

  /** Optional: human feedback on the outcome */
  feedback?: string;

  /** Optional: measured metric delta after action */
  metricDelta?: number;

  /** Optional: additional context */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — CALIBRATION RESULTS
// ═══════════════════════════════════════════════════════════

/**
 * Calibration result for a single rule.
 * Computed from historical outcomes of that rule.
 */
export interface CalibrationResult {
  /** Rule ID */
  ruleId: string;

  /** Domain that owns the rule */
  domain: AIDomain;

  /** Total outcomes tracked for this rule */
  totalOutcomes: number;

  /** Count by status */
  successCount: number;
  partialCount: number;
  failedCount: number;
  unknownCount: number;

  /** Accuracy rate: (successes + partials * 0.5) / total known */
  accuracyRate: number;

  /**
   * Calibration readiness:
   *   "cold"     — < 3 outcomes (not enough data)
   *   "warming"  — 3-10 outcomes (partial calibration)
   *   "calibrated" — 10+ outcomes (full calibration)
   */
  readiness: "cold" | "warming" | "calibrated";

  /**
   * Recommended confidence adjustment factor (0-1).
   * Multiply original confidence by this to get calibrated value.
   */
  adjustmentFactor: number;

  /** Average original confidence of all outcomes */
  avgOriginalConfidence: number;

  /** Trend: is the rule getting more or less accurate? */
  trend: "improving" | "stable" | "declining" | "insufficient_data";

  /** Timestamp of last calibration */
  calibratedAt: number;
}

/**
 * Aggregate calibration report across all tracked rules.
 */
export interface CalibrationReport {
  /** Total outcomes across all rules */
  totalOutcomes: number;

  /** Number of unique rules with outcomes */
  rulesTracked: number;

  /** Rules that are fully calibrated (10+ outcomes) */
  calibratedRules: number;

  /** Rules warming up (3-10 outcomes) */
  warmingRules: number;

  /** Rules still cold (< 3 outcomes) */
  coldRules: number;

  /** System-wide accuracy rate */
  overallAccuracy: number;

  /** Per-rule calibration results */
  results: CalibrationResult[];

  /** Top 5 most accurate rules */
  topRules: CalibrationResult[];

  /** Bottom 5 least accurate rules (needs attention) */
  bottomRules: CalibrationResult[];

  /** Timestamp of report generation */
  generatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — CAUSAL CHAIN VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Tracks whether a detected causal chain actually led
 * to the predicted outcome. Used to validate the 8
 * causal patterns defined in causal-chain.ts.
 */
export interface CausalChainOutcome {
  /** Unique outcome ID */
  id: string;

  /** Pattern ID (from CAUSAL_PATTERNS, e.g., "revenue_events_engagement") */
  patternId: string;

  /** Signal sequence that triggered the detection */
  signalSequence: string[];

  /** Compound confidence at detection time */
  detectedConfidence: number;

  /** Did the predicted cascade actually happen? */
  validated: boolean;

  /** When the chain was detected */
  detectedAt: number;

  /** When the validation was performed (minimum 7 days after detection) */
  validatedAt?: number;

  /** Optional notes */
  notes?: string;
}