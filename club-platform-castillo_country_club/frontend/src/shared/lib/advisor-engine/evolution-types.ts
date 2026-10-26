// src/shared/lib/advisor-engine/evolution-types.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — System Evolution Types (F55)
//
// Types for the self-improving system — the highest layer
// of intelligence in the Castillo AI Platform.
//
// The system monitors its own health across 10 dimensions:
//   1. Rule Performance Scoring — per-rule composite score
//   2. Redundancy Detection — co-occurrence analysis
//   3. Gap Detection — uncovered signal sequences
//   4. Confidence Drift Detection — temporal accuracy changes
//   5. Coverage Matrix — metric × rule heatmap
//   6. Prediction Accuracy — simulation vs reality
//   7. Manager Behavior — command/feature usage patterns
//   8. Evolution History — audit trail of all changes
//   9. Self-Awareness Score — composite 0-100 health
//  10. Auto-Suppression — automatic rule lifecycle management
//
// Depends on:
//   ./calibration-types (CalibrationResult)
//   ./nl-rule-types (NLRuleTemplate)
//   ./causal-chain (CausalPattern)
//   ./intent-types (AdvisorGoal)
//   ./twin-types (TwinSimulationResult)
//   ./command-types (CommandType, ConversationTurn)
//   @/shared/types/ai-intelligence (AIDomain, AdvisorImpactLevel)
// ═══════════════════════════════════════════════════════════

import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — RULE PERFORMANCE SCORING
// ═══════════════════════════════════════════════════════════

/**
 * Composite performance score for a single rule.
 * Aggregates F50 calibration data + usage patterns + outcome success.
 *
 * Formula:
 *   compositeScore = (
 *     triggerRate × 0.25 +
 *     actionRate × 0.25 +
 *     successRate × 0.30 +
 *     calibratedConfidence × 0.20
 *   ) × 100
 *
 * Scores:
 *   80-100: Performing well
 *   50-79:  Acceptable
 *   25-49:  Underperforming
 *   0-24:   Critical — needs intervention
 */
export interface RulePerformanceScore {
  /** Rule identifier */
  ruleId: string;
  /** Human-readable rule title */
  ruleTitle: string;
  /** Which domain */
  domain: AIDomain | "global";
  /** Is this an engine rule or NL custom rule? */
  ruleType: "engine" | "custom_nl";

  // ── Raw metrics ──
  /** How many times the condition was evaluated */
  evaluationCount: number;
  /** How many times the condition was true (triggered) */
  triggerCount: number;
  /** How many times the user acted on the insight */
  actionCount: number;
  /** How many times the action led to positive outcome */
  successCount: number;

  // ── Rates (0-1) ──
  /** triggerCount / evaluationCount */
  triggerRate: number;
  /** actionCount / triggerCount (how actionable is this rule?) */
  actionRate: number;
  /** successCount / actionCount (how accurate is this rule?) */
  successRate: number;
  /** F50 calibrated confidence */
  calibratedConfidence: number;

  // ── Composite ──
  /** Weighted composite score (0-100) */
  compositeScore: number;
  /** Performance tier */
  tier: "excellent" | "good" | "acceptable" | "underperforming" | "critical";
  /** Trend vs last analysis period */
  trend: "improving" | "stable" | "degrading";
  /** How many analysis periods this rule has been tracked */
  trackedPeriods: number;
  /** Last time this rule was evaluated */
  lastEvaluatedAt: number;
  /** Last time this rule was triggered */
  lastTriggeredAt: number | null;
}

/**
 * Tier display configuration.
 */
export const TIER_CONFIG: Record<
  RulePerformanceScore["tier"],
  { label: string; color: string; bgColor: string; range: string }
> = {
  excellent: {
    label: "Excelente",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 10%, transparent)",
    range: "80-100",
  },
  good: {
    label: "Buena",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 8%, transparent)",
    range: "65-79",
  },
  acceptable: {
    label: "Aceptable",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 8%, transparent)",
    range: "45-64",
  },
  underperforming: {
    label: "Bajo rendimiento",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 12%, transparent)",
    range: "25-44",
  },
  critical: {
    label: "Crítica",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    range: "0-24",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 2 — REDUNDANCY DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * A pair of rules that frequently co-occur (both fire together).
 * High co-occurrence suggests redundancy — merge candidates.
 */
export interface RedundantPair {
  /** First rule */
  ruleIdA: string;
  ruleTitleA: string;
  /** Second rule */
  ruleIdB: string;
  ruleTitleB: string;
  /** Shared domain */
  domain: AIDomain | "global";
  /** How many times both fired together */
  coOccurrenceCount: number;
  /** Co-occurrence rate: fires_together / max(fires_a, fires_b) */
  coOccurrenceRate: number;
  /** Are they always firing together? (>80%) */
  isHighlyRedundant: boolean;
  /** Which rule has higher composite score (the one to keep) */
  strongerRuleId: string;
  /** Suggested merge description */
  mergeDescription: string;
  /** Confidence in this redundancy detection (0-100) */
  confidence: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — GAP DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * A detected gap — a signal sequence or metric pattern that
 * occurs repeatedly but has NO rule covering it.
 *
 * Example: "revenue drops → 2 weeks later → attendance drops"
 * If no rule watches for this delay pattern, it's a gap.
 */
export interface CoverageGap {
  /** Unique gap ID */
  id: string;
  /** What type of gap */
  gapType:
    | "uncovered_signal"       // A signal fires but no rule catches it
    | "uncovered_sequence"     // A sequence of signals with no cascade rule
    | "uncovered_metric"       // A metric has no rule watching it at all
    | "uncovered_domain"       // A domain has zero active rules
    | "threshold_blind_spot";  // A threshold is never crossed but should be monitored
  /** Description of the gap */
  description: string;
  /** Which domain(s) are affected */
  domains: Array<AIDomain | "global">;
  /** Evidence: how many times this pattern was observed */
  observationCount: number;
  /** How long has this gap existed (in days) */
  ageDays: number;
  /** Severity of leaving this gap open */
  severity: AdvisorImpactLevel;
  /** Suggested rule to fill the gap */
  suggestedRule?: {
    title: string;
    metricPath: string;
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    threshold: number;
    unit: string;
    action: string;
    domain: AIDomain | "global";
  };
  /** Confidence in this gap detection (0-100) */
  confidence: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — CONFIDENCE DRIFT DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Tracks how a rule's calibrated confidence changes over time.
 * A significant drop indicates the rule's assumptions may be outdated.
 */
export interface ConfidenceDrift {
  /** Rule identifier */
  ruleId: string;
  /** Rule title */
  ruleTitle: string;
  /** Domain */
  domain: AIDomain | "global";
  /** Current calibrated confidence */
  currentConfidence: number;
  /** Confidence 30 days ago */
  confidence30dAgo: number;
  /** Confidence 7 days ago */
  confidence7dAgo: number;
  /** Absolute drift (current - 30d ago) */
  driftAbsolute: number;
  /** Percentage drift */
  driftPct: number;
  /** Classification */
  driftType:
    | "stable"       // |drift| < 5%
    | "minor_drift"  // |drift| 5-15%
    | "major_drift"  // |drift| 15-30%
    | "critical_drift"; // |drift| > 30%
  /** Direction */
  direction: "improving" | "degrading";
  /** Is this rule still trustworthy? */
  isTrustworthy: boolean;
  /** Recommended action */
  recommendation:
    | "monitor"
    | "recalibrate"
    | "investigate"
    | "suppress";
  /** Explanation */
  explanation: string;
}

/**
 * Drift display config.
 */
export const DRIFT_TYPE_CONFIG: Record<
  ConfidenceDrift["driftType"],
  { label: string; color: string; threshold: string }
> = {
  stable: {
    label: "Estable",
    color: "var(--color-emerald-400)",
    threshold: "<5%",
  },
  minor_drift: {
    label: "Deriva menor",
    color: "var(--color-amber-400)",
    threshold: "5-15%",
  },
  major_drift: {
    label: "Deriva mayor",
    color: "var(--color-amber-400)",
    threshold: "15-30%",
  },
  critical_drift: {
    label: "Deriva crítica",
    color: "var(--color-rose-400)",
    threshold: ">30%",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — COVERAGE MATRIX
// ═══════════════════════════════════════════════════════════

/**
 * How well a metric is covered by active rules.
 */
export interface MetricCoverage {
  /** Metric path */
  metricPath: string;
  /** Metric display name */
  metricName: string;
  /** Domain */
  domain: AIDomain | "global";
  /** Number of rules watching this metric */
  ruleCount: number;
  /** Rule IDs watching this metric */
  ruleIds: string[];
  /** Coverage level */
  coverageLevel:
    | "well_covered"   // 3+ rules
    | "covered"        // 1-2 rules
    | "thin"           // 1 rule only
    | "uncovered";     // 0 rules
  /** Are there thresholds being monitored? */
  thresholdsMonitored: number;
  /** Suggested improvement if thin/uncovered */
  suggestion?: string;
}

/**
 * Domain coverage summary.
 */
export interface DomainCoverage {
  /** Domain */
  domain: AIDomain | "global";
  /** Total metrics in this domain */
  totalMetrics: number;
  /** Metrics with at least 1 rule */
  coveredMetrics: number;
  /** Coverage percentage */
  coveragePct: number;
  /** Total rules in this domain */
  totalRules: number;
  /** Active rules */
  activeRules: number;
  /** Coverage level */
  level: "full" | "good" | "partial" | "sparse" | "empty";
}

/**
 * Full coverage matrix.
 */
export interface CoverageMatrix {
  /** Per-metric coverage */
  metrics: MetricCoverage[];
  /** Per-domain summary */
  domains: DomainCoverage[];
  /** Overall coverage percentage */
  overallCoveragePct: number;
  /** Total uncovered metrics */
  uncoveredCount: number;
  /** Most critical gaps (uncovered metrics with high impact potential) */
  criticalGaps: string[];
  /** When this analysis was computed */
  computedAt: number;
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — PREDICTION ACCURACY TRACKING
// ═══════════════════════════════════════════════════════════

/**
 * Tracks how accurate a simulation prediction was compared
 * to what actually happened.
 */
export interface PredictionAccuracy {
  /** Unique tracking ID */
  id: string;
  /** Which simulation produced this prediction */
  simulationId: string;
  /** Scenario name */
  scenarioName: string;
  /** Metric that was predicted */
  metricPath: string;
  /** Metric display name */
  metricName: string;
  /** What the simulation predicted */
  predictedValue: number;
  /** What actually happened */
  actualValue: number | null; // null = not yet measured
  /** Prediction error (absolute) */
  error: number | null;
  /** Prediction error (percentage) */
  errorPct: number | null;
  /** Was the prediction within the calibrated confidence interval? */
  withinConfidenceInterval: boolean | null;
  /** Calibrated confidence at time of prediction */
  confidenceAtPrediction: number;
  /** When the prediction was made */
  predictedAt: number;
  /** When the actual value was measured */
  measuredAt: number | null;
  /** How many days between prediction and measurement */
  measurementLagDays: number | null;
  /** Classification */
  accuracy:
    | "accurate"       // error < 10%
    | "close"          // error 10-25%
    | "off"            // error 25-50%
    | "way_off"        // error > 50%
    | "pending";       // not yet measured
}

/**
 * Aggregated prediction accuracy metrics.
 */
export interface PredictionAccuracySummary {
  /** Total predictions tracked */
  totalPredictions: number;
  /** Predictions that have been measured */
  measuredCount: number;
  /** Predictions still pending */
  pendingCount: number;
  /** Breakdown by accuracy level */
  byAccuracy: Record<PredictionAccuracy["accuracy"], number>;
  /** Mean absolute percentage error (MAPE) */
  meanAbsolutePctError: number | null;
  /** Accuracy trend over time */
  trend: "improving" | "stable" | "degrading" | "insufficient_data";
  /** Best predicted metric (lowest MAPE) */
  bestPredictedMetric: { metricPath: string; mape: number } | null;
  /** Worst predicted metric (highest MAPE) */
  worstPredictedMetric: { metricPath: string; mape: number } | null;
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — MANAGER BEHAVIOR ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Usage pattern for a specific feature/command type.
 */
export interface FeatureUsage {
  /** Feature identifier (command type, dashboard section, etc.) */
  featureId: string;
  /** Display name */
  featureName: string;
  /** Category */
  category: "command" | "dashboard" | "rule_authoring" | "simulation" | "goal" | "report";
  /** How many times used in analysis period */
  usageCount: number;
  /** Usage trend vs previous period */
  usageTrend: "increasing" | "stable" | "decreasing" | "new";
  /** Average time spent (seconds) */
  avgTimeSpentSec: number | null;
  /** Completion rate (did the user finish the action?) */
  completionRate: number | null;
  /** User satisfaction signals (did they follow up? repeat?) */
  satisfactionSignal: "positive" | "neutral" | "negative" | "unknown";
}

/**
 * Aggregated manager behavior analysis.
 */
export interface ManagerBehaviorAnalysis {
  /** Analysis period (days) */
  periodDays: number;
  /** When this analysis was computed */
  computedAt: number;
  /** Total commands issued */
  totalCommands: number;
  /** Commands by type */
  commandsByType: Record<string, number>;
  /** Most used features */
  topFeatures: FeatureUsage[];
  /** Least used features (potential dead weight) */
  bottomFeatures: FeatureUsage[];
  /** Most queried metrics */
  topQueriedMetrics: Array<{ metric: string; count: number }>;
  /** Simulation usage */
  simulationCount: number;
  /** NL rule creation count */
  rulesCreatedCount: number;
  /** Goal creation count */
  goalsCreatedCount: number;
  /** Average session depth (commands per session) */
  avgSessionDepth: number;
  /** Feature adoption score (0-100): how much of the platform is being used */
  adoptionScore: number;
  /** Features that are NEVER used */
  unusedFeatures: string[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — EVOLUTION HISTORY (audit trail)
// ═══════════════════════════════════════════════════════════

/**
 * The type of evolution action.
 */
export type EvolutionActionType =
  | "rule_suppressed"      // Auto-paused due to low performance
  | "rule_merged"          // Two redundant rules merged
  | "rule_created"         // New rule created to fill a gap
  | "rule_reactivated"     // Previously suppressed rule reactivated
  | "threshold_adjusted"   // Rule threshold recalibrated
  | "coverage_improved"    // New rule added for uncovered metric
  | "drift_corrected"      // Drift detected and addressed
  | "prediction_logged"    // Simulation prediction logged for tracking
  | "goal_completed"       // Goal auto-completed by system
  | "system_health_check"; // Periodic health analysis completed

/**
 * A single evolution event in the audit trail.
 */
export interface EvolutionEvent {
  /** Event ID */
  id: string;
  /** When this happened */
  timestamp: number;
  /** Type of action */
  actionType: EvolutionActionType;
  /** Was this automatic or human-initiated? */
  trigger: "auto" | "human" | "system";
  /** Who/what triggered it */
  triggeredBy: string;
  /** Description of what happened */
  description: string;
  /** Which rule(s) were affected */
  affectedRules: string[];
  /** Which domain(s) were affected */
  affectedDomains: Array<AIDomain | "global">;
  /** Confidence in this action (0-100) */
  confidence: number;
  /** Was this action beneficial? (measured after the fact) */
  outcome?: "positive" | "neutral" | "negative" | "pending";
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * Display config for evolution action types.
 */
export const EVOLUTION_ACTION_CONFIG: Record<
  EvolutionActionType,
  { label: string; color: string; icon: string }
> = {
  rule_suppressed: { label: "Regla suprimida", color: "var(--color-rose-400)", icon: "Pause" },
  rule_merged: { label: "Reglas fusionadas", color: "var(--color-amber-400)", icon: "Merge" },
  rule_created: { label: "Regla creada", color: "var(--color-emerald-400)", icon: "Plus" },
  rule_reactivated: { label: "Regla reactivada", color: "var(--color-teal-400)", icon: "Play" },
  threshold_adjusted: { label: "Umbral ajustado", color: "var(--color-amber-400)", icon: "Sliders" },
  coverage_improved: { label: "Cobertura mejorada", color: "var(--color-emerald-400)", icon: "Shield" },
  drift_corrected: { label: "Deriva corregida", color: "var(--color-teal-400)", icon: "TrendingUp" },
  prediction_logged: { label: "Predicción registrada", color: "var(--color-silver-400)", icon: "Target" },
  goal_completed: { label: "Meta completada", color: "var(--color-emerald-400)", icon: "CheckCircle" },
  system_health_check: { label: "Health check", color: "var(--color-silver-300)", icon: "Activity" },
};

// ═══════════════════════════════════════════════════════════
// SECTION 9 — SELF-AWARENESS SCORE
// ═══════════════════════════════════════════════════════════

/**
 * The system's self-awareness score — a single number (0-100)
 * that represents how healthy and effective the advisor system is.
 *
 * Computed from 6 sub-scores:
 *   1. Rule Health (0-100) — average compositeScore across all rules
 *   2. Coverage (0-100) — coveragePct from CoverageMatrix
 *   3. Calibration Quality (0-100) — % of rules with "calibrated" status
 *   4. Prediction Accuracy (0-100) — 100 - MAPE
 *   5. User Adoption (0-100) — adoptionScore from behavior analysis
 *   6. Evolution Activity (0-100) — rate of positive evolution events
 *
 * Weights:
 *   ruleHealth: 0.25
 *   coverage: 0.20
 *   calibrationQuality: 0.20
 *   predictionAccuracy: 0.15
 *   userAdoption: 0.10
 *   evolutionActivity: 0.10
 */
export interface SelfAwarenessScore {
  /** Overall score (0-100) */
  overall: number;
  /** When this was computed */
  computedAt: number;
  /** Sub-scores */
  subScores: {
    ruleHealth: { value: number; weight: 0.25; description: string };
    coverage: { value: number; weight: 0.20; description: string };
    calibrationQuality: { value: number; weight: 0.20; description: string };
    predictionAccuracy: { value: number; weight: 0.15; description: string };
    userAdoption: { value: number; weight: 0.10; description: string };
    evolutionActivity: { value: number; weight: 0.10; description: string };
  };
  /** Overall status */
  status:
    | "thriving"       // 80-100
    | "healthy"        // 65-79
    | "needs_attention" // 45-64
    | "struggling"     // 25-44
    | "critical";      // 0-24
  /** Top 3 improvements the system should make */
  topImprovements: Array<{
    area: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: "low" | "medium" | "high";
  }>;
  /** Historical scores (last 10 measurements) */
  history: Array<{ score: number; timestamp: number }>;
}

/**
 * Self-awareness status display config.
 */
export const AWARENESS_STATUS_CONFIG: Record<
  SelfAwarenessScore["status"],
  { label: string; color: string; bgColor: string; range: string }
> = {
  thriving: {
    label: "Próspero",
    color: "var(--color-emerald-400)",
    bgColor: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
    range: "80-100",
  },
  healthy: {
    label: "Saludable",
    color: "var(--color-teal-400)",
    bgColor: "color-mix(in srgb, var(--color-teal-400) 10%, transparent)",
    range: "65-79",
  },
  needs_attention: {
    label: "Necesita atención",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 10%, transparent)",
    range: "45-64",
  },
  struggling: {
    label: "Luchando",
    color: "var(--color-amber-400)",
    bgColor: "color-mix(in srgb, var(--color-amber-400) 14%, transparent)",
    range: "25-44",
  },
  critical: {
    label: "Crítico",
    color: "var(--color-rose-400)",
    bgColor: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
    range: "0-24",
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 10 — AUTO-SUPPRESSION
// ═══════════════════════════════════════════════════════════

/**
 * An auto-suppression decision.
 * The system decides to pause a rule that's consistently
 * underperforming or being ignored.
 */
export interface SuppressionDecision {
  /** Rule to suppress */
  ruleId: string;
  /** Rule title */
  ruleTitle: string;
  /** Domain */
  domain: AIDomain | "global";
  /** Reason for suppression */
  reason:
    | "never_triggered"       // 0 triggers in 20+ evaluations
    | "always_ignored"        // Triggered but never acted on (>15 times)
    | "low_success_rate"      // Actions taken but rarely successful (<20%)
    | "confidence_collapse"   // Calibrated confidence dropped below 20%
    | "redundant"             // Merged with another rule
    | "manager_paused";       // Manager explicitly paused via NL command
  /** Evidence supporting this decision */
  evidence: {
    evaluationCount: number;
    triggerCount: number;
    actionCount: number;
    successCount: number;
    currentConfidence: number;
  };
  /** Confidence in this suppression decision (0-100) */
  confidence: number;
  /** Should this be auto-executed or presented for approval? */
  executionMode: "auto" | "propose_for_approval";
  /** Was this suppression executed? */
  executed: boolean;
  /** When it was executed (if applicable) */
  executedAt?: number;
  /** Can this rule be reactivated? */
  reactivationCondition?: string;
}

// ═══════════════════════════════════════════════════════════
// SECTION 11 — EVOLUTION PROPOSAL
// ═══════════════════════════════════════════════════════════

/**
 * The type of proposed change.
 */
export type ProposalType =
  | "suppress_rule"
  | "merge_rules"
  | "create_rule"
  | "adjust_threshold"
  | "reactivate_rule"
  | "improve_coverage"
  | "recalibrate_rule";

/**
 * A proposed evolution — the system's suggestion for self-improvement.
 * These are NOT auto-executed. They're presented to the manager for approval.
 */
export interface EvolutionProposal {
  /** Proposal ID */
  id: string;
  /** When this was proposed */
  proposedAt: number;
  /** Type of change */
  type: ProposalType;
  /** Priority (how important is this?) */
  priority: "high" | "medium" | "low";
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Evidence supporting this proposal */
  evidence: string[];
  /** Expected impact if implemented */
  expectedImpact: {
    area: string;
    description: string;
    metric?: string;
    expectedChange?: string;
  };
  /** Which rules are affected */
  affectedRules: string[];
  /** Which domains are affected */
  affectedDomains: Array<AIDomain | "global">;
  /** Confidence that this proposal is correct (0-100) */
  confidence: number;
  /** Effort to implement */
  effort: "low" | "medium" | "high";
  /** Status */
  status:
    | "pending"      // Just proposed, awaiting review
    | "approved"     // Manager approved, ready to implement
    | "implemented"  // Change was made
    | "rejected"     // Manager rejected
    | "expired";     // Not acted on within 30 days
  /** Manager's response (if any) */
  managerResponse?: {
    response: "approved" | "rejected";
    reason?: string;
    respondedAt: number;
  };
  /** Implementation details (what to change) */
  implementationDetails?: {
    /** For suppress: which rule to pause */
    suppressRuleId?: string;
    /** For merge: which rules to merge + new rule text */
    mergeRuleIds?: string[];
    mergedRuleText?: string;
    /** For create: the new rule to create */
    newRule?: {
      title: string;
      metricPath: string;
      operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
      threshold: number;
      unit: string;
      action: string;
      domain: AIDomain | "global";
    };
    /** For adjust: new threshold value */
    newThreshold?: number;
    /** For coverage: which metric to cover */
    targetMetric?: string;
  };
}

/**
 * Proposal status display config.
 */
export const PROPOSAL_STATUS_CONFIG: Record<
  EvolutionProposal["status"],
  { label: string; color: string }
> = {
  pending: { label: "Pendiente", color: "var(--color-amber-400)" },
  approved: { label: "Aprobada", color: "var(--color-teal-400)" },
  implemented: { label: "Implementada", color: "var(--color-emerald-400)" },
  rejected: { label: "Rechazada", color: "var(--color-rose-400)" },
  expired: { label: "Expirada", color: "var(--color-silver-500)" },
};

// ═══════════════════════════════════════════════════════════
// SECTION 12 — FULL SYSTEM HEALTH REPORT
// ═══════════════════════════════════════════════════════════

/**
 * The complete system health report — produced by the analyzer.
 * This is what the SystemHealthDashboard renders.
 */
export interface SystemHealthReport {
  /** Report ID */
  id: string;
  /** When this report was generated */
  computedAt: number;
  /** Analysis execution time in ms */
  executionMs: number;

  // ── The 10 dimensions ──

  /** 1. Rule performance scores */
  ruleScores: RulePerformanceScore[];
  /** Rules performing well (>65) */
  rulesPerformingWell: number;
  /** Rules underperforming (<45) */
  rulesUnderperforming: number;
  /** Rules critical (<25) */
  rulesCritical: number;

  /** 2. Redundancy pairs */
  redundantPairs: RedundantPair[];

  /** 3. Coverage gaps */
  coverageGaps: CoverageGap[];

  /** 4. Confidence drifts */
  confidenceDrifts: ConfidenceDrift[];
  /** Rules with major+ drift */
  driftAlertCount: number;

  /** 5. Coverage matrix */
  coverageMatrix: CoverageMatrix;

  /** 6. Prediction accuracy */
  predictionAccuracy: PredictionAccuracySummary;

  /** 7. Manager behavior */
  managerBehavior: ManagerBehaviorAnalysis;

  /** 8. Recent evolution events */
  recentEvents: EvolutionEvent[];

  /** 9. Self-awareness score */
  selfAwarenessScore: SelfAwarenessScore;

  /** 10. Auto-suppression decisions */
  suppressionDecisions: SuppressionDecision[];

  /** Active proposals */
  proposals: EvolutionProposal[];

  // ── Summary ──

  /** One-line summary */
  summary: string;
  /** Top 3 actions the system recommends */
  topActions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    description: string;
  }>;
}

// ═══════════════════════════════════════════════════════════
// SECTION 13 — EVOLUTION STATE (for hook)
// ═══════════════════════════════════════════════════════════

/**
 * State of the evolution hook.
 */
export interface EvolutionState {
  /** Latest health report */
  latestReport: SystemHealthReport | null;
  /** Is the analyzer running? */
  isAnalyzing: boolean;
  /** Report history (last 10) */
  reportHistory: SystemHealthReport[];
  /** Active proposals awaiting review */
  pendingProposals: EvolutionProposal[];
  /** Recent evolution events */
  recentEvents: EvolutionEvent[];
  /** Error if analysis failed */
  error: string | null;
}

// ═══════════════════════════════════════════════════════════
// SECTION 14 — ANALYSIS OPTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Options for running the system analysis.
 */
export interface AnalysisOptions {
  /** Analysis period in days (default: 30) */
  periodDays: number;
  /** Include redundancy detection? (can be slow with many rules) */
  includeRedundancy: boolean;
  /** Include gap detection? */
  includeGaps: boolean;
  /** Include prediction accuracy? */
  includePredictions: boolean;
  /** Include behavior analysis? */
  includeBehavior: boolean;
  /** Auto-suppress underperforming rules? */
  autoSuppress: boolean;
  /** Auto-suppression threshold: composite score below this → propose suppression */
  suppressionThreshold: number;
  /** Minimum evaluations before suppression is considered */
  minEvaluationsForSuppression: number;
}

/**
 * Default analysis options.
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  periodDays: 30,
  includeRedundancy: true,
  includeGaps: true,
  includePredictions: true,
  includeBehavior: true,
  autoSuppress: false, // Conservative: propose, don't auto-execute
  suppressionThreshold: 25,
  minEvaluationsForSuppression: 20,
};