// src/shared/lib/advisor-engine/nl-rule-engine.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — NL Rule Engine (F52)
//
// Bridges custom NL rules into the Advisor Engine.
// Evaluates active rules against the current context,
// generates insights when conditions are met, and
// records evaluation/trigger counts for F50 calibration.
//
// Evaluation flow:
//   1. Load active rules for the domain
//   2. For each rule: resolve metric from context
//   3. Check condition (operator + threshold)
//   4. If met: generate insight, record trigger
//   5. Always: record evaluation
//
// Integration:
//   - Called from useDomainAdvisor hooks via evaluateCustomRules()
//   - Generated insights are merged with engine insights
//   - Custom rule confidence = parseConfidence × calibration factor
//
// Depends on:
//   ./nl-rule-types (ParsedNLRule, NLCondition, NLRuleTemplate)
//   ./nl-rule-parser (parseNLRule, resolveMetric, getMetricByPath)
//   ./nl-rule-validator (validateNLRule)
//   ./nl-rule-store (getActiveRules, recordEvaluation, recordTrigger)
//   ./intent-types (for goal derivation integration)
//   @/shared/types/ai-intelligence (AIDomain, AdvisorImpactLevel)
// ═══════════════════════════════════════════════════════════

import type {
  ParsedNLRule,
  NLRuleTemplate,
  NLCondition,
} from "./nl-rule-types";
import type { AdvisorInsightBase as BaseInsight } from "@/shared/types/ai-intelligence";
import { parseNLRule, resolveMetric, getMetricByPath } from "./nl-rule-parser";
import { validateNLRule } from "./nl-rule-validator";
import {
  getActiveRules,
  getRulesForDomain,
  recordEvaluation,
  recordTrigger,
  updateRuleStatus,
} from "./nl-rule-store";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — FULL PIPELINE: PARSE + VALIDATE
// ═══════════════════════════════════════════════════════════

/**
 * Parse and validate an NL rule in one call.
 * Returns the parsed rule + validation result.
 * If parse fails, returns null (caller should try LLM fallback).
 */
export function parseAndValidate(
  text: string,
  existingRules: NLRuleTemplate[] = [],
): {
  parsed: ParsedNLRule | null;
  validation: ReturnType<typeof validateNLRule> | null;
} {
  const parsed = parseNLRule(text);
  if (!parsed) return { parsed: null, validation: null };

  const validation = validateNLRule(parsed, existingRules);
  return { parsed, validation };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — EVALUATE CUSTOM RULES AGAINST CONTEXT
// ═══════════════════════════════════════════════════════════

/**
 * Evaluate all active custom rules for a domain against the current context.
 * Returns generated insights when conditions are met.
 *
 * This is the main integration point — called from advisor hooks.
 *
 * @param domain — Which domain's rules to evaluate
 * @param ctx — The advisor context (any domain's BaseContext)
 * @returns Array of insights generated from triggered custom rules
 */
export function evaluateCustomRules(
  domain: AIDomain | "global",
  ctx: Record<string, unknown>,
): BaseInsight[] {
  const rules = getRulesForDomain(domain);
  if (rules.length === 0) return [];

  const insights: BaseInsight[] = [];

  for (const rule of rules) {
    try {
      const insight = evaluateSingleRule(rule, ctx);
      recordEvaluation(rule.id);

      if (insight) {
        recordTrigger(rule.id);
        insights.push(insight);
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn(`[NLRuleEngine] Rule ${rule.id} evaluation error:`, e);
      }
      // Mark rule as errored if it consistently fails
      updateRuleStatus(rule.id, "errored");
    }
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — SINGLE RULE EVALUATION
// ═══════════════════════════════════════════════════════════

/**
 * Evaluate a single NL rule against a context.
 * Returns an insight if the condition is met, null otherwise.
 */
function evaluateSingleRule(
  rule: NLRuleTemplate,
  ctx: Record<string, unknown>,
): BaseInsight | null {
  // Re-parse the rule (cheap — deterministic, no I/O)
  const parsed = parseNLRule(rule.text, rule.createdBy);
  if (!parsed) return null;

  // Evaluate all conditions (AND logic)
  const allConditionsMet = parsed.conditions.every((condition) =>
    evaluateCondition(condition, ctx),
  );

  if (!allConditionsMet) return null;

  // Condition met — generate insight
  const metric = getMetricByPath(parsed.conditions[0].metric);
  const currentValue = resolveMetric(ctx, parsed.conditions[0].metric);

  const condition = parsed.conditions[0];
  const operatorDisplay = getOperatorDisplay(condition.operator);

  return {
    id: `nl_insight_${rule.id}`,
    title: parsed.suggestedTitle,
    impact: parsed.impact,
    confidence: Math.round(parsed.parseConfidence * 85),
    layer: parsed.impact === "high" ? "diagnostic" : "strategy",
    domain: rule.domain,
    description: `Regla custom: "${rule.text}". Condición cumplida: ${metric?.names[0] ?? condition.metric} ${operatorDisplay} ${condition.threshold}${condition.unit} (actual: ${currentValue ?? "N/A"})`,
    reasoning: `Regla NL creada por ${rule.createdBy}. Evaluada ${rule.evaluationCount} veces, activada ${rule.triggerCount} veces.`,
  };
}

/**
 * Evaluate a single condition against a context.
 */
function evaluateCondition(
  condition: NLCondition,
  ctx: Record<string, unknown>,
): boolean {
  const value = resolveMetric(ctx, condition.metric);
  if (value === null) return false;

  switch (condition.operator) {
    case ">":
      return value > condition.threshold;
    case "<":
      return value < condition.threshold;
    case ">=":
      return value >= condition.threshold;
    case "<=":
      return value <= condition.threshold;
    case "==":
      return value === condition.threshold;
    case "!=":
      return value !== condition.threshold;
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — GOAL DERIVATION FROM NL RULES
// ═══════════════════════════════════════════════════════════

/**
 * Check if any triggered NL rules should derive goals.
 * Called from goal-engine's deriveGoals().
 *
 * Returns goal-compatible data for rules with canDeriveGoal=true
 * and high/medium impact.
 */
export function getGoalCandidatesFromNLRules(
  domain: AIDomain | "global",
  ctx: Record<string, unknown>,
): Array<{
  ruleId: string;
  title: string;
  description: string;
  domain: AIDomain | "global";
  impact: AdvisorImpactLevel;
  metricName: string;
  currentValue: number;
  targetValue: number;
  unit: string;
}> {
  const rules = getRulesForDomain(domain);
  const candidates: Array<{
    ruleId: string;
    title: string;
    description: string;
    domain: AIDomain | "global";
    impact: AdvisorImpactLevel;
    metricName: string;
    currentValue: number;
    targetValue: number;
    unit: string;
  }> = [];

  for (const rule of rules) {
    const parsed = parseNLRule(rule.text);
    if (!parsed || !parsed.canDeriveGoal) continue;
    if (parsed.impact !== "high" && parsed.impact !== "medium") continue;

    // Check if condition is currently met
    const condition = parsed.conditions[0];
    if (!condition) continue;

    const currentValue = resolveMetric(ctx, condition.metric);
    if (currentValue === null) continue;

    const isMet = evaluateCondition(condition, ctx);
    if (!isMet) continue;

    // Derive target: for "churn > 8%", target is to bring it below 8%
    const metric = getMetricByPath(condition.metric);
    const targetValue =
      condition.operator === ">"
        ? condition.threshold * 0.8 // Reduce by 20% from threshold
        : condition.operator === "<"
          ? condition.threshold * 1.2 // Increase by 20% from threshold
          : condition.threshold;

    candidates.push({
      ruleId: rule.id,
      title: `NL: ${parsed.suggestedTitle}`,
      description: `Regla custom activada: "${rule.text}"`,
      domain: parsed.domain,
      impact: parsed.impact,
      metricName: metric?.names[0] ?? condition.metric,
      currentValue,
      targetValue: Math.round(targetValue * 100) / 100,
      unit: condition.unit,
    });
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — STATS & MONITORING
// ═══════════════════════════════════════════════════════════

/**
 * Get evaluation stats for all active rules.
 */
export function getNLEvaluationStats(): {
  totalRules: number;
  activeRules: number;
  totalEvaluations: number;
  totalTriggers: number;
  overallTriggerRate: number;
  mostTriggered: { id: string; text: string; triggerCount: number } | null;
  leastTriggered: { id: string; text: string; triggerCount: number } | null;
} {
  const rules = getActiveRules();
  const totalEvaluations = rules.reduce((s, r) => s + r.evaluationCount, 0);
  const totalTriggers = rules.reduce((s, r) => s + r.triggerCount, 0);

  const sorted = [...rules].sort((a, b) => b.triggerCount - a.triggerCount);

  return {
    totalRules: rules.length,
    activeRules: rules.filter((r) => r.status === "active").length,
    totalEvaluations,
    totalTriggers,
    overallTriggerRate:
      totalEvaluations > 0
        ? Math.round((totalTriggers / totalEvaluations) * 100) / 100
        : 0,
    mostTriggered: sorted.length > 0
      ? { id: sorted[0].id, text: sorted[0].text, triggerCount: sorted[0].triggerCount }
      : null,
    leastTriggered: sorted.length > 0
      ? {
          id: sorted[sorted.length - 1].id,
          text: sorted[sorted.length - 1].text,
          triggerCount: sorted[sorted.length - 1].triggerCount,
        }
      : null,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — HELPERS
// ═══════════════════════════════════════════════════════════

function getOperatorDisplay(op: NLCondition["operator"]): string {
  const map: Record<string, string> = {
    ">": "supera",
    "<": "baja de",
    ">=": "al menos",
    "<=": "máximo",
    "==": "igual a",
    "!=": "diferente de",
  };
  return map[op] ?? op;
}