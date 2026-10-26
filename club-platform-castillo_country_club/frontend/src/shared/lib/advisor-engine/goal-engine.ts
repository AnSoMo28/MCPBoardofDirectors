// src/shared/lib/advisor-engine/goal-engine.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Goal Engine (F51)
//
// Derives measurable goals from insights, health scores,
// and causal chains. Prioritizes using calibrated confidence.
//
// Goal derivation sources:
//   1. High-impact insights with metrics → improvement goals
//   2. Critical health factors → remediation goals
//   3. Causal chains with high compound confidence → root cause goals
//
// Priority scoring:
//   impactWeight × urgencyWeight × achievability × calibratedConfidence
//
// Depends on:
//   ./intent-types (AdvisorGoal, GoalPriority, GoalStatus)
//   ./types (BaseInsight, HealthScoreResult, CausalChain)
//   ./calibration (CalibrationResult)
// ═══════════════════════════════════════════════════════════

import type {
  AdvisorGoal,
  GoalPriority,
} from "./intent-types";
import type { AdvisorInsightBase as BaseInsight } from "@/shared/types/ai-intelligence";
import type {
  HealthScoreResult,
  HealthFactorResult,
  CausalChain,
} from "./types";
import type { CalibrationResult } from "./calibration-types";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — GOAL DERIVATION
// ═══════════════════════════════════════════════════════════

/**
 * Derive all goals from available intelligence sources.
 *
 * Sources (in priority order):
 *   1. Critical health factors → immediate remediation
 *   2. High-impact insights with metrics → improvement targets
 *   3. Causal chains → root cause resolution
 *
 * @returns Goals sorted by priority (critical first)
 */
export function deriveGoals(params: {
  insights: BaseInsight[];
  healthScore?: HealthScoreResult;
  causalChains?: CausalChain[];
  calibrationMap?: Map<string, CalibrationResult>;
}): AdvisorGoal[] {
  const goals: AdvisorGoal[] = [];
  const seen = new Set<string>(); // Deduplicate by metric name

  // Source 1: Critical health factors
  if (params.healthScore) {
    const criticalFactors = params.healthScore.factors.filter(
      (f) => f.status === "critical" || f.status === "attention",
    );
    for (const factor of criticalFactors) {
      const goal = buildGoalFromHealthFactor(
        factor,
        params.healthScore,
        params.calibrationMap,
      );
      if (goal && !seen.has(goal.targetMetric.name)) {
        goals.push(goal);
        seen.add(goal.targetMetric.name);
      }
    }
  }

  // Source 2: Actionable insights with metrics
  for (const insight of params.insights) {
    if (!insight.metric || insight.impact === "low") continue;
    const goal = buildGoalFromInsight(insight, params.calibrationMap);
    if (goal && !seen.has(goal.targetMetric.name)) {
      goals.push(goal);
      seen.add(goal.targetMetric.name);
    }
  }

  // Source 3: Causal chains → root cause goals
  if (params.causalChains?.length) {
    for (const chain of params.causalChains) {
      if (chain.compoundConfidence < 0.6) continue;
      const goal = buildGoalFromChain(chain, params.calibrationMap);
      if (goal && !seen.has(goal.targetMetric.name)) {
        goals.push(goal);
        seen.add(goal.targetMetric.name);
      }
    }
  }

  return prioritizeGoals(goals);
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — GOAL BUILDERS (per source)
// ═══════════════════════════════════════════════════════════

/**
 * Build a goal from a critical/attention health factor.
 */
function buildGoalFromHealthFactor(
  factor: HealthFactorResult,
  healthScore: HealthScoreResult,
  calibrationMap?: Map<string, CalibrationResult>,
): AdvisorGoal | null {
  // Target: bring factor from "crítico" (<45) to "saludable" (≥65)
  // or from "atención" (<65) to "excepcional" (≥85)
  const targetValue = factor.status === "critical" ? 65 : 85;
  const currentValue = factor.normalizedValue;
  const gap = currentValue >= targetValue
    ? 0
    : Math.round(((targetValue - currentValue) / targetValue) * 100);

  if (gap === 0) return null;

  const priority: GoalPriority =
    factor.status === "critical" ? "critical" : "high";

  const domain = healthScore.level === "critical"
    ? inferDomainFromFactor(factor)
    : inferDomainFromFactor(factor);

  const calibratedConfidence = calibrationMap
    ? getCalibrationForDomain(domain, calibrationMap)
    : 70;

  return {
    id: `goal_health_${factor.id}`,
    title: `Mejorar ${factor.label}: ${currentValue} → ${targetValue}`,
    description: `Factor de salud "${factor.label}" en estado ${factor.status}. Objetivo: alcanzar nivel saludable.`,
    domain,
    priority,
    status: "pending",
    targetMetric: {
      name: factor.id,
      currentValue,
      targetValue,
      unit: "pts",
    },
    gap,
    calibratedConfidence,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Build a goal from an insight with a metric.
 */
function buildGoalFromInsight(
  insight: BaseInsight,
  calibrationMap?: Map<string, CalibrationResult>,
): AdvisorGoal | null {
  const metricValue = typeof insight.metricValue === "number"
    ? insight.metricValue
    : parseFloat(String(insight.metricValue ?? "0"));

  if (isNaN(metricValue) || metricValue === 0) return null;

  // Heuristic target: improve by 10-25% depending on impact
  const improvementPct =
    insight.impact === "high" ? 0.20 : insight.impact === "medium" ? 0.15 : 0.10;

  // Direction: most metrics should be improved (reduced churn, increased revenue)
  // Use insight severity as proxy: high/critical → reduce, low/medium → increase
  const shouldReduce =
    insight.metric?.toLowerCase().includes("churn") ||
    insight.metric?.toLowerCase().includes("anomal") ||
    insight.metric?.toLowerCase().includes("risk") ||
    insight.metric?.toLowerCase().includes("concentration");

  const targetValue = shouldReduce
    ? Math.round(metricValue * (1 - improvementPct) * 100) / 100
    : Math.round(metricValue * (1 + improvementPct) * 100) / 100;

  const gap = Math.round(
    Math.abs(metricValue - targetValue) / Math.abs(metricValue) * 100,
  );

  const priority = impactToPriority(insight.impact);

  const calibratedConfidence = calibrationMap
    ? getCalibrationForRule(insight.id, insight.confidence, calibrationMap)
    : insight.confidence;

  return {
    id: `goal_insight_${insight.id}`,
    title: `${shouldReduce ? "Reducir" : "Mejorar"} ${insight.metric}: ${metricValue}${insight.metricValue ? "" : "%"}`,
    description: insight.description ?? insight.reasoning,
    domain: (insight.domain ?? "global") as AIDomain,
    priority,
    status: "pending",
    sourceInsightId: insight.id,
    targetMetric: {
      name: insight.metric!,
      currentValue: metricValue,
      targetValue,
      unit: "",
    },
    gap,
    calibratedConfidence,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Build a goal from a causal chain (root cause resolution).
 */
function buildGoalFromChain(
  chain: CausalChain,
  calibrationMap?: Map<string, CalibrationResult>,
): AdvisorGoal | null {
  // The "root cause" is the first signal in the chain
  const rootSignal = chain.signals[0];
  if (!rootSignal) return null;

  const priority: GoalPriority =
    chain.compoundConfidence >= 0.75 ? "high" : "medium";

  const gap = Math.round((1 - chain.compoundConfidence) * 100);
  const calibratedConfidence = calibrationMap
    ? getCalibrationForDomain(rootSignal.sourceDomain as AIDomain, calibrationMap)
    : Math.round(chain.compoundConfidence * 100);

  return {
    id: `goal_chain_${chain.patternId}`,
    title: `Resolver cadena causal: ${chain.patternId.replace(/_/g, " ")}`,
    description: `Cadena detectada: ${chain.signals.map((s) => s.sourceDomain).join(" → ")}. Confianza compuesta: ${Math.round(chain.compoundConfidence * 100)}%.`,
    domain: rootSignal.sourceDomain as AIDomain,
    priority,
    status: "pending",
    sourceChainPatternId: chain.patternId,
    targetMetric: {
      name: `chain_${chain.patternId}`,
      currentValue: chain.compoundConfidence * 100,
      targetValue: 30, // Target: reduce chain confidence to <30% (break the chain)
      unit: "%",
    },
    gap,
    calibratedConfidence,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — GOAL GAP & PROGRESS
// ═══════════════════════════════════════════════════════════

/**
 * Recompute goal gap from current metric value.
 */
export function computeGoalGap(
  goal: AdvisorGoal,
  currentValue: number,
): number {
  const { targetValue } = goal.targetMetric;
  const range = Math.abs(goal.targetMetric.currentValue - targetValue);
  if (range === 0) return 0;

  const remaining = Math.abs(currentValue - targetValue);
  return Math.max(0, Math.min(100, Math.round((remaining / range) * 100)));
}

/**
 * Check if a goal is achieved (current meets or exceeds target).
 */
export function isGoalAchieved(goal: AdvisorGoal, currentValue: number): boolean {
  const { targetValue } = goal.targetMetric;

  // If target is lower (reduce metric), achieved when current <= target
  if (targetValue < goal.targetMetric.currentValue) {
    return currentValue <= targetValue;
  }
  // If target is higher (increase metric), achieved when current >= target
  return currentValue >= targetValue;
}

/**
 * Update goal progress with new data.
 */
export function updateGoalProgress(
  goal: AdvisorGoal,
  currentValue: number,
): AdvisorGoal {
  const newGap = computeGoalGap(goal, currentValue);
  const achieved = isGoalAchieved(goal, currentValue);

  return {
    ...goal,
    targetMetric: {
      ...goal.targetMetric,
      currentValue,
    },
    gap: newGap,
    status: achieved ? "achieved" : goal.status,
    updatedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — GOAL PRIORITIZATION
// ═══════════════════════════════════════════════════════════

const PRIORITY_WEIGHTS: Record<GoalPriority, number> = {
  critical: 1.0,
  high: 0.75,
  medium: 0.5,
  low: 0.25,
};

/**
 * Score and sort goals by priority.
 *
 * Score = priorityWeight × gap × (calibratedConfidence / 100)
 *
 * Higher score = more urgent and achievable.
 */
export function prioritizeGoals(goals: AdvisorGoal[]): AdvisorGoal[] {
  return [...goals].sort((a, b) => {
    const scoreA =
      PRIORITY_WEIGHTS[a.priority] * (a.gap / 100) * (a.calibratedConfidence / 100);
    const scoreB =
      PRIORITY_WEIGHTS[b.priority] * (b.gap / 100) * (b.calibratedConfidence / 100);
    return scoreB - scoreA; // Descending
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function impactToPriority(impact: AdvisorImpactLevel): GoalPriority {
  switch (impact) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    default:
      return "medium";
  }
}

function inferDomainFromFactor(factor: HealthFactorResult): AIDomain {
  // Heuristic: map factor IDs to domains
  const id = factor.id.toLowerCase();
  if (id.includes("revenue") || id.includes("margin") || id.includes("cash") || id.includes("dues"))
    return "financial";
  if (id.includes("event") || id.includes("capacity") || id.includes("utilization"))
    return "events";
  if (id.includes("comm") || id.includes("delivery") || id.includes("open_rate"))
    return "communication";
  if (id.includes("sport") || id.includes("court") || id.includes("coach"))
    return "sports";
  if (id.includes("satisfaction") || id.includes("nps") || id.includes("feedback"))
    return "satisfaction";
  if (id.includes("guest") || id.includes("visitor") || id.includes("pipeline"))
    return "engagement";
  if (id.includes("age") || id.includes("balance") || id.includes("gini"))
    return "family";
  if (id.includes("churn") || id.includes("retention") || id.includes("lifecycle"))
    return "engagement";
  return "global";
}

function getCalibrationForDomain(
  domain: AIDomain,
  calibrationMap: Map<string, CalibrationResult>,
): number {
  // Average calibration across all rules in this domain
  const domainResults = Array.from(calibrationMap.values()).filter(
    (r) => r.domain === domain,
  );
  if (domainResults.length === 0) return 70; // Default

  const avgAccuracy =
    domainResults.reduce((sum, r) => sum + r.accuracyRate, 0) /
    domainResults.length;

  return Math.round(avgAccuracy * 100);
}

function getCalibrationForRule(
  ruleId: string,
  originalConfidence: number,
  calibrationMap: Map<string, CalibrationResult>,
): number {
  const result = calibrationMap.get(ruleId);
  if (!result) return originalConfidence;
  return Math.round(originalConfidence * result.adjustmentFactor);
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — DEADLINE ENFORCEMENT (C3 Fix)
// ═══════════════════════════════════════════════════════════

/**
 * Check if a goal is past its deadline.
 */
export function isGoalOverdue(goal: AdvisorGoal): boolean {
  if (!goal.deadline) return false;
  return Date.now() > goal.deadline && goal.status !== "achieved" && goal.status !== "abandoned";
}

/**
 * Check if a goal is approaching its deadline.
 * @param warningDays — Days before deadline to start warning (default: 7)
 */
export function isGoalAtRisk(goal: AdvisorGoal, warningDays: number = 7): boolean {
  if (!goal.deadline) return false;
  if (goal.status === "achieved" || goal.status === "abandoned") return false;
  const msUntilDeadline = goal.deadline - Date.now();
  const msWarning = warningDays * 24 * 60 * 60 * 1000;
  return msUntilDeadline > 0 && msUntilDeadline <= msWarning;
}

/**
 * Get human-readable time remaining for a goal.
 */
export function getGoalTimeRemaining(goal: AdvisorGoal): string | null {
  if (!goal.deadline) return null;
  const ms = goal.deadline - Date.now();
  if (ms <= 0) return "Vencido";

  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 30) return `${Math.floor(days / 30)} meses`;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours} horas`;
  return "< 1 hora";
}

/**
 * Escalate priority when deadline is approaching.
 * Returns the effective priority (may be higher than original).
 */
export function getEffectivePriority(goal: AdvisorGoal): GoalPriority {
  if (isGoalOverdue(goal)) return "critical";
  if (isGoalAtRisk(goal, 3)) return goal.priority === "low" ? "medium" : "high";
  return goal.priority;
}
