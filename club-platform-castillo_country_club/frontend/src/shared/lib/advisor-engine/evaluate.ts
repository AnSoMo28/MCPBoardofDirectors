// src/shared/lib/advisor-engine/evaluate.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Evaluation Primitives
//
// Core functions for rule evaluation, insight sorting,
// deduplication, and insight construction.
//
// These replace the duplicated logic in 10 advisor hooks:
//   - evaluateRules() replaces each hook's inline evaluation
//   - sortInsights() replaces each hook's sortByImpactConfidence
//   - deduplicateInsights() prevents duplicate rule fires
//   - buildInsight() provides defaults for partial insights
//
// Created: F45 — Architecture Consolidation
// ═══════════════════════════════════════════════════════════

import type {
  AdvisorInsightBase,
  AdvisorImpactLevel,
  AIDomain,
} from "@/shared/types/ai-intelligence";
import {
  generateInsightId,
} from "@/shared/types/ai-intelligence";
import type {
  BaseContext,
  RuleDefinition,
  DomainSignal,
  AdvisorResult,
  AdvisorEngineEventListener,
} from "./types";
import { createSignal, isSignalExpired } from "./types";
import { computeHealthScore } from "./health-score";
import { computeEffectiveSeverity, applyDecayToSignals, detectCausalChains } from "./causal-chain";


// ═══════════════════════════════════════════════════════════
// SECTION 1 — RULE EVALUATION
// ═══════════════════════════════════════════════════════════

/**
 * Evaluate a single rule against a context.
 * Returns the insight if the rule fires, null otherwise.
 * NEVER throws — errors are caught and reported.
 */
export function evaluateRule<T extends BaseContext>(
  rule: RuleDefinition<T>,
  ctx: T,
  emitEvent?: AdvisorEngineEventListener,
): { insight: AdvisorInsightBase | null; error: boolean } {
  try {
    const result = rule.evaluate(ctx);

    if (result === null || result === undefined) {
      return { insight: null, error: false };
    }

    // Validate minimum shape
    if (!result.id || !result.title || !result.impact) {
      if (import.meta.env.DEV) {
        console.warn(
          `[AdvisorEngine] Rule ${rule.id} returned malformed insight — missing id/title/impact. Discarding.`
        );
      }
      emitEvent?.({
        type: "rule_error",
        domain: rule.domain,
        ruleId: rule.id,
        error: "Malformed insight: missing id, title, or impact",
      });
      return { insight: null, error: true };
    }

    emitEvent?.({
      type: "rule_fired",
      domain: rule.domain,
      ruleId: rule.id,
      impact: result.impact,
    });

    return { insight: result, error: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (import.meta.env.DEV) {
      console.error(
        `[AdvisorEngine] Rule ${rule.id} (${rule.name}) threw:`,
        error
      );
    }

    emitEvent?.({
      type: "rule_error",
      domain: rule.domain,
      ruleId: rule.id,
      error: message,
    });

    return { insight: null, error: true }; // One broken rule doesn't crash the engine
  }
}

/**
 * Evaluate all rules against a context.
 * Rules are evaluated in priority order (lower priority number = first).
 * Returns all fired insights (unsorted, may contain duplicates).
 */
export function evaluateRules<T extends BaseContext>(
  ctx: T,
  rules: RuleDefinition<T>[],
  emitEvent?: AdvisorEngineEventListener,
): { insights: AdvisorInsightBase[]; errors: number } {
  emitEvent?.({
    type: "evaluation_start",
    domain: ctx.domain,
    ruleCount: rules.length,
  });

  // Sort rules by priority (lower = first). Default priority: 100.
  const sorted = [...rules].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100)
  );

  const insights: AdvisorInsightBase[] = [];
  let errors = 0;

  for (const rule of sorted) {
    const { insight, error } = evaluateRule(rule, ctx, emitEvent);
    if (error) {
      errors++;
    }
    if (insight !== null) {
      insights.push(insight);
    }
  }

  // Count rules that returned null (condition not met — not errors)
  // Errors are counted by evaluateRule via emitEvent

  return { insights, errors };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — INSIGHT SORTING
// ═══════════════════════════════════════════════════════════

/**
 * Impact sort order — high impact first.
 */
const IMPACT_ORDER: Record<AdvisorImpactLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Sort insights by impact (DESC) then confidence (DESC).
 * This is the canonical sort order used across ALL advisor banners.
 *
 * Replaces the duplicated sort logic in each advisor hook.
 */
export function sortInsights<T extends AdvisorInsightBase>(
  insights: T[],
): T[] {
  return [...insights].sort((a, b) => {
    // Primary: impact descending
    const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
    if (impactDiff !== 0) return impactDiff;

    // Secondary: confidence descending
    return b.confidence - a.confidence;
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — INSIGHT DEDUPLICATION
// ═══════════════════════════════════════════════════════════

/**
 * Remove duplicate insights (same rule ID).
 * Keeps the FIRST occurrence (highest priority / impact).
 *
 * A rule should only fire once per evaluation cycle.
 * If two rules produce the same insight ID, something is wrong.
 */
export function deduplicateInsights<T extends AdvisorInsightBase>(
  insights: T[],
  _emitEvent?: AdvisorEngineEventListener,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const insight of insights) {
    if (seen.has(insight.id)) {
      if (import.meta.env.DEV) {
        console.warn(
          `[AdvisorEngine] Duplicate insight ID: ${insight.id}. Keeping first occurrence.`
        );
      }
      continue;
    }
    seen.add(insight.id);
    result.push(insight);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — SIGNAL PROCESSING
// ═══════════════════════════════════════════════════════════

/**
 * Extract signals from fired insights that have emitSignals defined.
 * Creates DomainSignal instances from SignalDefinitions.
 */
export function extractSignals<T extends BaseContext>(
  insights: AdvisorInsightBase[],
  rules: RuleDefinition<T>[],
  emitEvent?: AdvisorEngineEventListener,
): DomainSignal[] {
  const signals: DomainSignal[] = [];
  new Set(insights.map((i) => i.id));

  for (const rule of rules) {
    if (!rule.emitSignals?.length) continue;

    // Find the insight that this rule produced
    const insight = insights.find(
      (i) => i.id === generateInsightId(rule.domain, rule.id)
    );
    if (!insight) continue;

    for (const sigDef of rule.emitSignals) {
      const signal = createSignal(
        sigDef,
        rule.domain,
        insight.confidence, // Use confidence as signal value
        undefined,
        insight.id,
      );

      signals.push(signal);

      emitEvent?.({
        type: "signal_emitted",
        signalId: signal.id,
        sourceDomain: rule.domain,
      });
    }
  }

  return signals;
}

/**
 * Filter and enrich context signals for a specific domain.
 * Removes expired signals and returns only those targeting this domain.
 */
export function consumeSignals(
  signals: DomainSignal[],
  domain: AIDomain,
): DomainSignal[] {
  return signals
    .filter(
      (s) =>
        s.targetDomains.includes(domain) && !isSignalExpired(s)
    )
    .map((s) => ({
      ...s,
      effectiveSeverity: computeEffectiveSeverity(s),
    }));
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — INSIGHT BUILDER (defaults + validation)
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete AdvisorInsightBase from partial data.
 * Provides sensible defaults for optional fields.
 *
 * Use this in rule evaluate() functions to avoid repetition:
 *   return buildInsight({
 *     id: generateInsightId("financial", "FIN_HEALTH"),
 *     impact: "high",
 *     title: "Health score critical",
 *     reasoning: "Score dropped below 45",
 *     confidence: 85,
 *   });
 */
export function buildInsight(
  partial: Partial<AdvisorInsightBase> &
    Pick<AdvisorInsightBase, "id" | "impact" | "title" | "reasoning" | "confidence">,
): AdvisorInsightBase {
  return {
    id: partial.id,
    impact: partial.impact,
    title: partial.title,
    reasoning: partial.reasoning,
    confidence: Math.max(0, Math.min(100, partial.confidence)), // Clamp 0-100
    action: partial.action,
    target_view: partial.target_view,
    target_id: partial.target_id,
    target_date: partial.target_date,
    citations: partial.citations,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — FULL PIPELINE
// Single function that runs the complete evaluation pipeline.
// This is what AdvisorEngine.evaluate() calls internally.
// ═══════════════════════════════════════════════════════════

/**
 * Run the complete evaluation pipeline for a domain.
 *
 * Pipeline:
 *   1. Evaluate all rules (priority order, error-safe)
 *   2. Sort by impact + confidence
 *   3. Deduplicate by rule ID
 *   4. Extract cross-domain signals
 *   5. Compute health score (if factors defined)
 *   6. Return standardized result
 *
 * @param ctx — Domain context (already built + signal-enriched)
 * @param rules — Rules to evaluate
 * @param healthFactors — Optional health factor definitions
 * @param emitEvent — Optional event listener for observability
 */
export function runPipeline<T extends BaseContext>(
  ctx: T,
  rules: RuleDefinition<T>[],
  healthFactors?: import("./types").HealthFactorDef<T>[],
  emitEvent?: AdvisorEngineEventListener,
  crossSignals?: DomainSignal[],
): AdvisorResult {
  const startTime = performance.now();

  // Step 1: Evaluate rules
  const { insights: rawInsights, errors } = evaluateRules(ctx, rules, emitEvent);

  // Step 2: Sort
  const sorted = sortInsights(rawInsights);

  // Step 3: Deduplicate
  const deduplicated = deduplicateInsights(sorted, emitEvent);

  // Step 4: Extract signals
  const signals = extractSignals(deduplicated, rules, emitEvent);

  // Step 5: Health score (optional)
  let healthScore = undefined;
  if (healthFactors?.length) {
    healthScore = computeHealthScore(ctx, healthFactors);
    emitEvent?.({
      type: "health_computed",
      domain: ctx.domain,
      score: healthScore.score,
      grade: healthScore.grade,
    });
  }

  const evaluationTime = performance.now() - startTime;

  // Step 6: Emit completion event
  emitEvent?.({
    type: "evaluation_complete",
    domain: ctx.domain,
    insightsCount: deduplicated.length,
    time: evaluationTime,
  });

  // Step 4b: Apply signal decay (F49)
  const decayedSignals = applyDecayToSignals(signals);

  // Step 4c: Detect causal chains (F49)
  const allSignals = [...(crossSignals ?? []), ...decayedSignals];
  const causalResult = detectCausalChains(allSignals);

  // DEV logging
  if (import.meta.env.DEV) {
    const chainInfo = causalResult.chains.length
      ? `, ${causalResult.chains.length} causal chains`
      : "";
    console.log(
      `[AdvisorEngine] ${ctx.domain}: ${deduplicated.length}/${rules.length} rules fired, ${signals.length} signals${chainInfo}, ${evaluationTime.toFixed(1)}ms`
    );
  }

  return {
    insights: deduplicated,
    healthScore,
    signals: decayedSignals,
    causalChains: causalResult.chains.length ? causalResult.chains : undefined,
    meta: {
      domain: ctx.domain,
      rulesEvaluated: rules.length,
      rulesFired: deduplicated.length,
      rulesErrored: errors,
      evaluationTime,
      timestamp: Date.now(),
    },
  };
}


