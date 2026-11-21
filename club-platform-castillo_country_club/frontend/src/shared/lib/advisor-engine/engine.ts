// src/shared/lib/advisor-engine/engine.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Core Engine Class + React Hook
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @version     v2.1  (G10-MC04: alineado a VERSION_SYNC 2.1.0 — drift v2.0↔2.1.0 desde G8 detectado por verify-master-consistency)
// @namespace   N/A — engine class + hook
// @keyframes   0
// @depends     ./types, ./health-score, ./causal-chain, ./evaluate
//
// The single generic engine that replaces 10 independent
// advisor hooks with:
//   - 1 engine class (streaming evaluation + causal detection)
//   - 1 React hook (memoized, tracks previous data)
//   - 10+ thin domain wrappers (~40 lines each)
//
// Evaluation architecture:
//
//   evaluate(rawData, crossSignals, previousData?)
//     │
//     ├─ previousData undefined? → fullEvaluate (cold start)
//     │     Evaluates ALL rules → caches per-rule results
//     │
//     ├─ rawData === previousData? → buildCachedResult (no-op)
//     │     Returns cached insights + fresh causal chains
//     │
//     └─ rawData !== previousData? → selectiveEvaluate
//           Dirty flags → only affected rules re-evaluate
//           Clean rules → cached per-rule results reused
//
// ANTI-PATTERNS REMOVED (v1):
// [x] Side effect (ref mutation) inside useMemo → separate useEffect
// [x] Magic number 184 → removed (was wrong comparison target)
// [x] eslint-disable without justification → comment added
// [x] `as Record<string, unknown>` without guard → runtime check
//
// FIXES APPLIED (v2):
// [x] E-01: ragContext injected via object spread, not readonly mutation
// [x] E-02: getEvaluationStats takes domainTotalRules (was global count bug)
// [x] E-03: buildCachedResult null check replaces non-null assertion
// [x] E-04: Dead evaluationTime===0 check removed
// [x] E-05: Hook ragContext fallback preserves config.ragContext
// [x] E-06: Magic numbers extracted to named constants
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef } from "react";
import {
  sortInsightsByPriority,
  type AdvisorInsightBase,
} from "../../types/ai-intelligence";
import type {
  BaseContext,
  AdvisorConfig,
  AdvisorResult,
  DomainSignal,
  CausalChain,
  AdvisorEngineEventListener,
  RAGContext,
  DirtyFlagSet,
  HealthScoreResult,
} from "./types";
import { createSignal } from "./types";
import { computeHealthScore as computeHealthRaw } from "./health-score";
import {
  detectCausalChains,
  applyDecayToSignals,
} from "./causal-chain";

// ═══════════════════════════════════════════════════════════
// §0 CONSTANTS
// ═══════════════════════════════════════════════════════════

/**
 * Default signal value used when an insight has no confidence score.
 * 50 = neutral midpoint on the 0-100 confidence scale.
 */
const DEFAULT_SIGNAL_VALUE = 50;

/**
 * If more than this fraction of rules need re-evaluation,
 * the engine falls back to a full evaluation instead of selective.
 * At 0.8: if >80% of rules are dirty, full evaluation is cheaper
 * than the selective path's bookkeeping overhead.
 */
const SELECTIVE_EVALUATION_THRESHOLD = 0.8;

// ═══════════════════════════════════════════════════════════
// §1 ADVISOR ENGINE CLASS
// ═══════════════════════════════════════════════════════════

/**
 * Generic Advisor Engine — evaluates declarative rules against
 * domain-specific context with streaming evaluation support.
 *
 * @template T — Domain-specific context extending BaseContext
 */
export class AdvisorEngine<T extends BaseContext> {
  private config: AdvisorConfig<T>;
  private listener?: AdvisorEngineEventListener;

  // ── Streaming evaluation state ──
  private ruleInsightCache: Map<string, AdvisorInsightBase | null> = new Map();
  private cachedResult: AdvisorResult | null = null;
  private evaluationCount = 0;

  constructor(
    config: AdvisorConfig<T>,
    listener?: AdvisorEngineEventListener,
  ) {
    this.config = config;
    this.listener = listener;

    if (import.meta.env.DEV) {
      this.validateConfig();
    }
  }

  /**
   * Evaluate rules against raw data.
   *
   * Routing:
   *   - No previousData → full evaluation (cold start)
   *   - No changes detected → cached result with fresh causal chains (O(1))
   *   - Changes detected → selective re-evaluation of dirty rules only
   */
  evaluate(
    rawData: unknown,
    crossSignals?: readonly DomainSignal[],
    previousData?: unknown,
  ): AdvisorResult {
    // Build domain context from raw MCP data
    const baseCtx = this.config.buildCtx(rawData, crossSignals);

    // E-01: Inject RAG context via immutable spread (no readonly mutation)
    const ctx: T = this.config.ragContext?.length
      ? { ...baseCtx, ragContext: this.config.ragContext } as T
      : baseCtx;

    // Route to the correct evaluation strategy
    if (previousData === undefined || this.evaluationCount === 0) {
      return this.fullEvaluate(ctx, crossSignals);
    }

    const dirtyFlags = this.computeDirtyFlags(rawData, previousData);

    if (dirtyFlags.size === 0) {
      return this.buildCachedResult(crossSignals);
    }

    return this.selectiveEvaluate(ctx, dirtyFlags, crossSignals);
  }

  get domain(): string {
    return this.config.domain;
  }

  get ruleCount(): number {
    return this.config.rules.length;
  }

  // ── Evaluation Strategies ──

  /**
   * Full evaluation: evaluate ALL rules, cache every result.
   * Used on cold start (first call or new engine instance).
   */
  private fullEvaluate(
    ctx: T,
    crossSignals?: readonly DomainSignal[],
  ): AdvisorResult {
    const start = performance.now();

    this.listener?.({
      type: "evaluation_start",
      domain: this.config.domain,
      ruleCount: this.config.rules.length,
    });

    const firedInsights: AdvisorInsightBase[] = [];
    let rulesFired = 0;
    let rulesErrored = 0;

    this.ruleInsightCache.clear();

    for (const rule of this.config.rules) {
      try {
        const insight = rule.evaluate(ctx);
        if (insight) {
          firedInsights.push(insight);
          this.ruleInsightCache.set(rule.id, insight);
          rulesFired++;

          this.listener?.({
            type: "rule_fired",
            domain: this.config.domain,
            ruleId: rule.id,
            impact: insight.impact,
          });
        } else {
          this.ruleInsightCache.set(rule.id, null);
        }
      } catch (e) {
        rulesErrored++;
        this.ruleInsightCache.delete(rule.id);

        if (import.meta.env.DEV) {
          console.error(
            `[AdvisorEngine:${this.config.domain}] Rule "${rule.id}" failed:`,
            e,
          );
        }

        this.listener?.({
          type: "rule_error",
          domain: this.config.domain,
          ruleId: rule.id,
          error: String(e),
        });
      }
    }

    const sorted = this.sortInsights(firedInsights);
    const deduped = this.deduplicateInsights(sorted);
    const healthScore = this.computeHealthScore(ctx);
    const signals = this.collectSignals();
    const decayedSignals = applyDecayToSignals(signals);
    const causalChains = this.detectChains(decayedSignals, crossSignals);

    const evaluationTime = performance.now() - start;

    const result: AdvisorResult = {
      insights: deduped,
      healthScore,
      signals: decayedSignals,
      causalChains,
      meta: {
        domain: this.config.domain,
        rulesEvaluated: this.config.rules.length,
        rulesFired,
        rulesErrored,
        evaluationTime,
        timestamp: Date.now(),
      },
    };

    this.listener?.({
      type: "evaluation_complete",
      domain: this.config.domain,
      insightsCount: deduped.length,
      time: evaluationTime,
    });

    this.cachedResult = result;
    this.evaluationCount++;

    return result;
  }

  /**
   * Selective evaluation: re-evaluate only dirty rules,
   * reuse cached results for clean rules.
   *
   * Falls back to fullEvaluate when >80% of rules are dirty.
   */
  private selectiveEvaluate(
    ctx: T,
    dirtyFlags: DirtyFlagSet,
    crossSignals?: readonly DomainSignal[],
  ): AdvisorResult {
    const start = performance.now();

    const rulesToEvaluate: Array<(typeof this.config.rules)[number]> = [];
    const rulesClean: Array<(typeof this.config.rules)[number]> = [];

    for (const rule of this.config.rules) {
      if (
        !rule.dataDependencies?.length ||
        rule.dataDependencies.some((dep) => dirtyFlags.has(dep))
      ) {
        rulesToEvaluate.push(rule);
      } else {
        rulesClean.push(rule);
      }
    }

    // E-06: Named constant replaces magic number 0.8
    if (
      rulesToEvaluate.length >
      this.config.rules.length * SELECTIVE_EVALUATION_THRESHOLD
    ) {
      return this.fullEvaluate(ctx, crossSignals);
    }

    this.listener?.({
      type: "evaluation_start",
      domain: this.config.domain,
      ruleCount: rulesToEvaluate.length,
    });

    const freshInsights: AdvisorInsightBase[] = [];
    let rulesFired = 0;
    let rulesErrored = 0;

    for (const rule of rulesToEvaluate) {
      try {
        const insight = rule.evaluate(ctx);
        if (insight) {
          freshInsights.push(insight);
          this.ruleInsightCache.set(rule.id, insight);
          rulesFired++;

          this.listener?.({
            type: "rule_fired",
            domain: this.config.domain,
            ruleId: rule.id,
            impact: insight.impact,
          });
        } else {
          this.ruleInsightCache.set(rule.id, null);
        }
      } catch (e) {
        rulesErrored++;
        this.ruleInsightCache.delete(rule.id);

        if (import.meta.env.DEV) {
          console.error(
            `[AdvisorEngine:${this.config.domain}] Rule "${rule.id}" failed:`,
            e,
          );
        }

        this.listener?.({
          type: "rule_error",
          domain: this.config.domain,
          ruleId: rule.id,
          error: String(e),
        });
      }
    }

    // Reuse cached results for clean rules
    const cachedCleanInsights: AdvisorInsightBase[] = [];
    for (const rule of rulesClean) {
      const cached = this.ruleInsightCache.get(rule.id);
      if (cached) {
        cachedCleanInsights.push(cached);
      }
    }

    const merged = [...freshInsights, ...cachedCleanInsights];
    const sorted = this.sortInsights(merged);
    const deduped = this.deduplicateInsights(sorted);
    const healthScore = this.computeHealthScore(ctx);
    const signals = this.collectSignals();
    const decayedSignals = applyDecayToSignals(signals);
    const causalChains = this.detectChains(decayedSignals, crossSignals);

    const evaluationTime = performance.now() - start;

    const result: AdvisorResult = {
      insights: deduped,
      healthScore,
      signals: decayedSignals,
      causalChains,
      meta: {
        domain: this.config.domain,
        rulesEvaluated: rulesToEvaluate.length,
        rulesFired,
        rulesErrored,
        evaluationTime,
        timestamp: Date.now(),
      },
    };

    this.listener?.({
      type: "evaluation_complete",
      domain: this.config.domain,
      insightsCount: deduped.length,
      time: evaluationTime,
    });

    this.cachedResult = result;
    this.evaluationCount++;

    return result;
  }

  /**
   * Build result from cache when no data changes detected.
   * Returns cached insights + freshly decayed signals + fresh causal chains.
   */
  private buildCachedResult(
    crossSignals?: readonly DomainSignal[],
  ): AdvisorResult {
    // E-03: Explicit null check replaces non-null assertion
    const cached = this.cachedResult;
    if (!cached) {
      throw new Error(
        `[AdvisorEngine:${this.config.domain}] Internal error: ` +
          `buildCachedResult called with empty cache. ` +
          `This should never happen — report as a bug.`,
      );
    }

    const decayedSignals = applyDecayToSignals([...cached.signals]);
    const causalChains = this.detectChains(decayedSignals, crossSignals);

    return {
      ...cached,
      signals: decayedSignals,
      causalChains,
      meta: {
        ...cached.meta,
        timestamp: Date.now(),
      },
    };
  }

  // ── Dirty Flag Computation ──

  /**
   * Shallow comparison of current vs previous raw data.
   * Returns the set of top-level keys whose values changed.
   */
  private computeDirtyFlags(
    current: unknown,
    previous: unknown,
  ): DirtyFlagSet {
    const flags: DirtyFlagSet = new Set();

    if (current == null || previous == null) {
      if (current != null && previous == null && typeof current === "object") {
        for (const key of Object.keys(current as Record<string, unknown>)) {
          flags.add(key);
        }
      }
      return flags;
    }

    if (typeof current !== "object" || typeof previous !== "object") {
      return flags;
    }

    const currentObj = current as Record<string, unknown>;
    const previousObj = previous as Record<string, unknown>;

    const allKeys = new Set([
      ...Object.keys(currentObj),
      ...Object.keys(previousObj),
    ]);

    for (const key of allKeys) {
      if (currentObj[key] !== previousObj[key]) {
        flags.add(key);
      }
    }

    return flags;
  }

  // ── Health Score ──

  private computeHealthScore(ctx: T): HealthScoreResult | undefined {
    if (!this.config.healthFactors?.length) return undefined;

    const result = computeHealthRaw(ctx, [...this.config.healthFactors]);

    this.listener?.({
      type: "health_computed",
      domain: this.config.domain,
      score: result.score,
      grade: result.grade,
    });

    return result;
  }

  // ── Signal Collection ──

  /**
   * Collect signals from all rules that fired and have emitSignals defined.
   * Signals are created fresh each evaluation (they have TTL).
   */
  private collectSignals(): DomainSignal[] {
    const signals: DomainSignal[] = [];

    for (const rule of this.config.rules) {
      if (!rule.emitSignals?.length) continue;

      const insight = this.ruleInsightCache.get(rule.id);
      if (!insight) continue;

      for (const sigDef of rule.emitSignals) {
        signals.push(
          createSignal(
            sigDef,
            this.config.domain,
            insight.confidence ?? DEFAULT_SIGNAL_VALUE,
            sigDef.defaultSeverity,
            insight.id,
          ),
        );

        this.listener?.({
          type: "signal_emitted",
          signalId: sigDef.id,
          sourceDomain: this.config.domain,
        });
      }
    }

    return signals;
  }

  // ── Causal Chain Detection ──

  private detectChains(
    emittedSignals: DomainSignal[],
    crossSignals?: readonly DomainSignal[],
  ): CausalChain[] {
    const allSignals = [...(crossSignals ?? []), ...emittedSignals];
    const result = detectCausalChains(allSignals);
    return [...(result.chains ?? [])];
  }

  // ── Insight Processing ──

  private sortInsights(insights: AdvisorInsightBase[]): AdvisorInsightBase[] {
    return sortInsightsByPriority(insights);
  }

  private deduplicateInsights(
    insights: AdvisorInsightBase[],
  ): AdvisorInsightBase[] {
    const seen = new Set<string>();
    return insights.filter((insight) => {
      if (seen.has(insight.id)) return false;
      seen.add(insight.id);
      return true;
    });
  }

  // ── Validation (DEV only) ──

  private validateConfig(): void {
    const { rules, healthFactors, domain } = this.config;

    const ids = new Set<string>();
    for (const rule of rules) {
      if (ids.has(rule.id)) {
        console.error(
          `[AdvisorEngine:${domain}] DUPLICATE RULE ID: "${rule.id}". ` +
            `Each rule must have a unique ID.`,
        );
      }
      ids.add(rule.id);

      if (rule.domain !== domain) {
        console.warn(
          `[AdvisorEngine:${domain}] Rule "${rule.id}" has domain "${rule.domain}" ` +
            `but engine domain is "${domain}". May be intentional for cross-domain rules.`,
        );
      }

      if (rule.dataDependencies?.length) {
        for (const dep of rule.dataDependencies) {
          if (typeof dep !== "string" || dep.length === 0) {
            console.warn(
              `[AdvisorEngine:${domain}] Rule "${rule.id}" has invalid dataDependency: "${dep}"`,
            );
          }
        }
      }
    }

    if (healthFactors?.length) {
      const totalWeight = healthFactors.reduce((sum, f) => sum + f.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.05) {
        console.warn(
          `[AdvisorEngine:${domain}] Health factor weights sum to ${totalWeight.toFixed(2)}, ` +
            `expected ~1.00. Weights will be auto-normalized.`,
        );
      }
    }

    for (const rule of rules) {
      if (rule.consumeSignals?.length) {
        const emittedSignals = new Set(
          rules.flatMap((r) => r.emitSignals?.map((s) => s.id) ?? []),
        );
        for (const signalId of rule.consumeSignals) {
          if (!emittedSignals.has(signalId)) {
            console.warn(
              `[AdvisorEngine:${domain}] Rule "${rule.id}" consumes signal "${signalId}" ` +
                `but no rule in this engine emits it. Cross-domain signals must be ` +
                `injected via crossSignals parameter.`,
            );
          }
        }
      }
    }

    if (rules.length === 0) {
      console.warn(
        `[AdvisorEngine:${domain}] No rules configured. Engine will always return empty results.`,
      );
    }
  }
}

// ═══════════════════════════════════════════════════════════
// §2 REACT HOOK
// ═══════════════════════════════════════════════════════════

/**
 * React hook that wraps AdvisorEngine with streaming evaluation.
 *
 * Tracks previous rawData via useRef for dirty flag computation.
 * First render: cold start (full evaluation).
 * Subsequent renders with new data: selective re-evaluation.
 * Subsequent renders with same data: no-op fast path.
 *
 * @param config — Engine configuration (stable reference or memoized)
 * @param rawData — Raw data from React Query cache
 * @param crossSignals — Cross-domain signals from Signal Bus
 * @param enabled — Whether to evaluate (use false for on-demand)
 * @param ragContext — Optional RAG context for enriched evaluation
 *   Falls back to config.ragContext if not provided.
 */
export function useAdvisorEngine<T extends BaseContext>(
  config: AdvisorConfig<T>,
  rawData: unknown,
  crossSignals?: readonly DomainSignal[],
  enabled: boolean = true,
  ragContext?: readonly RAGContext[],
): AdvisorResult | null {
  const previousDataRef = useRef<unknown>(undefined);

  // Memoize engine — only recreate if domain/rules/ragContext change
  const engine = useMemo(
    () =>
      new AdvisorEngine<T>({
        ...config,
        // E-05: Preserve config.ragContext when hook param is undefined
        ragContext: ragContext ?? config.ragContext,
      }),
    // config object identity changes on every render from parent.
    // We depend on domain (stable), rules.length (proxy for structural change),
    // and ragContext. If rule CONTENT changes without count change,
    // the domain wrapper must memoize config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.domain, config.rules.length, ragContext],
  );

  // Pure evaluation — no side effects
  const result = useMemo(() => {
    if (!enabled || rawData == null) return null;

    try {
      return engine.evaluate(rawData, crossSignals, previousDataRef.current);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(
          `[useAdvisorEngine:${config.domain}] Evaluation failed:`,
          error,
        );
      }
      return null;
    }
  }, [engine, rawData, crossSignals, enabled, config.domain]);

  // Track previous data AFTER render (safe — no side effect in useMemo)
  useEffect(() => {
    previousDataRef.current = rawData;
  }, [rawData]);

  return result;
}

// ═══════════════════════════════════════════════════════════
// §3 CONVENIENCE HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Get insights from an AdvisorResult with a minimum impact level.
 */
export function getInsightsAboveImpact(
  result: AdvisorResult | null,
  minImpact: "high" | "medium" | "low" = "low",
): AdvisorInsightBase[] {
  if (!result) return [];

  const threshold: Record<string, number> = { high: 2, medium: 1, low: 0 };
  return result.insights.filter(
    (i) => (threshold[i.impact] ?? 0) >= (threshold[minImpact] ?? 0),
  );
}

/**
 * Check if an AdvisorResult has any high-impact insights.
 */
export function hasHighSeverity(result: AdvisorResult | null): boolean {
  if (!result) return false;
  return result.insights.some((i) => i.impact === "high");
}

/**
 * Get the top N insights from a result.
 */
export function getTopInsights(
  result: AdvisorResult | null,
  limit: number = 3,
): AdvisorInsightBase[] {
  if (!result) return [];
  return result.insights.slice(0, limit);
}

/**
 * Extract actionable insights (those with an action attached).
 */
export function getActionableInsights(
  result: AdvisorResult | null,
): AdvisorInsightBase[] {
  if (!result) return [];
  return result.insights.filter((i) => i.action != null);
}

/**
 * Get evaluation statistics from the last evaluation.
 * Useful for debugging streaming evaluation performance.
 *
 * @param result — The AdvisorResult to inspect
 * @param domainTotalRules — Total rules configured for THIS domain.
 *   Use `engine.ruleCount` or `config.rules.length`.
 *   NOT the global total across all domains (that was the v1 bug).
 *
 * @example
 * const stats = getEvaluationStats(result, engine.ruleCount);
 * // stats.mode === "streaming" → only dirty rules re-evaluated
 * // stats.mode === "full"      → all rules re-evaluated
 */
export function getEvaluationStats(
  result: AdvisorResult | null,
  domainTotalRules: number,
): {
  readonly evaluated: number;
  readonly fired: number;
  readonly errored: number;
  readonly mode: "streaming" | "full";
} | null {
  if (!result) return null;
  return {
    evaluated: result.meta.rulesEvaluated,
    fired: result.meta.rulesFired,
    errored: result.meta.rulesErrored,
    // E-02: Compare against DOMAIN rule count, not global total
    mode:
      result.meta.rulesEvaluated < domainTotalRules
        ? ("streaming" as const)
        : ("full" as const),
  };
}