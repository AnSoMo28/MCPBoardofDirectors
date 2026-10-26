// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Smoke Tests
//
// Verifies core engine functionality before domain migration.
// Uses synthetic rules and context — no domain dependencies.
//
// Run: pnpm test engine.test
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import type { BaseContext, RuleDefinition, HealthFactorDef } from "../types";
import {
  evaluateRules,
  sortInsights,
  deduplicateInsights,
  buildInsight,
  runPipeline,
} from "../evaluate";
import { computeHealthScore } from "../health-score";
import { computeConfidence, CONFIDENCE_PRESETS } from "../confidence";

// ── Test fixtures ──

interface TestContext extends BaseContext {
  domain: "executive";
  revenue: number;
  memberCount: number;
  satisfaction: number;
}

function createTestCtx(overrides?: Partial<TestContext>): TestContext {
  return {
    domain: "executive",
    revenue: 50000,
    memberCount: 200,
    satisfaction: 75,
    signals: [],
    ...overrides,
  };
}

function createTestRule(
  id: string,
  opts?: {
    impact?: "high" | "medium" | "low";
    condition?: (ctx: TestContext) => boolean;
    priority?: number;
  },
): RuleDefinition<TestContext> {
  return {
    id,
    name: `Test Rule ${id}`,
    layer: "macro",
    domain: "executive",
    priority: opts?.priority ?? 100,
    evaluate: (ctx) => {
      const shouldFire = opts?.condition ? opts.condition(ctx) : true;
      if (!shouldFire) return null;
      return buildInsight({
        id: `executive_${id}`,
        impact: opts?.impact ?? "medium",
        title: `Insight from ${id}`,
        reasoning: `Rule ${id} fired because conditions met`,
        confidence: 80,
      });
    },
  };
}

const HEALTH_FACTORS: HealthFactorDef<TestContext>[] = [
  { id: "revenue", label: "Revenue", compute: (ctx) => ctx.revenue / 1000, weight: 0.5 },
  { id: "members", label: "Members", compute: (ctx) => ctx.memberCount, weight: 0.3 },
  { id: "satisfaction", label: "Satisfaction", compute: (ctx) => ctx.satisfaction, weight: 0.2 },
];

// ═══════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════

describe("evaluateRules", () => {
  it("fires rules that meet conditions", () => {
    const rules = [
      createTestRule("R1"),
      createTestRule("R2"),
    ];
    const { insights, errors } = evaluateRules(createTestCtx(), rules);

    expect(insights).toHaveLength(2);
    expect(errors).toBe(0);
  });

  it("skips rules that return null", () => {
    const rules = [
      createTestRule("R1"),
      createTestRule("R2", { condition: () => false }),
    ];
    const { insights } = evaluateRules(createTestCtx(), rules);

    expect(insights).toHaveLength(1);
    expect(insights[0].id).toBe("executive_R1");
  });

  it("evaluates in priority order", () => {
    const rules = [
      createTestRule("LOW", { priority: 200 }),
      createTestRule("HIGH", { priority: 10 }),
      createTestRule("MED", { priority: 100 }),
    ];
    const { insights } = evaluateRules(createTestCtx(), rules);

    expect(insights[0].id).toBe("executive_HIGH");
    expect(insights[1].id).toBe("executive_MED");
    expect(insights[2].id).toBe("executive_LOW");
  });

  it("handles rule exceptions without crashing", () => {
    const badRule: RuleDefinition<TestContext> = {
      id: "BAD",
      name: "Broken Rule",
      layer: "macro",
      domain: "executive",
      evaluate: () => {
        throw new Error("Intentional test error");
      },
    };
    const { insights, errors } = evaluateRules(createTestCtx(), [badRule]);

    expect(insights).toHaveLength(0);
    expect(errors).toBe(1);
  });

  it("handles empty rules array", () => {
    const { insights, errors } = evaluateRules(createTestCtx(), []);

    expect(insights).toHaveLength(0);
    expect(errors).toBe(0);
  });
});

describe("sortInsights", () => {
  it("sorts by impact descending, then confidence descending", () => {
    const insights = [
      buildInsight({ id: "a", impact: "low", title: "Low", reasoning: "", confidence: 90 }),
      buildInsight({ id: "b", impact: "high", title: "High", reasoning: "", confidence: 70 }),
      buildInsight({ id: "c", impact: "high", title: "High2", reasoning: "", confidence: 95 }),
      buildInsight({ id: "d", impact: "medium", title: "Med", reasoning: "", confidence: 80 }),
    ];
    const sorted = sortInsights(insights);

    expect(sorted[0].id).toBe("c"); // high + 95
    expect(sorted[1].id).toBe("b"); // high + 70
    expect(sorted[2].id).toBe("d"); // medium + 80
    expect(sorted[3].id).toBe("a"); // low + 90
  });

  it("does not mutate the original array", () => {
    const insights = [
      buildInsight({ id: "a", impact: "low", title: "A", reasoning: "", confidence: 50 }),
      buildInsight({ id: "b", impact: "high", title: "B", reasoning: "", confidence: 80 }),
    ];
    const original = [...insights];
    sortInsights(insights);

    expect(insights[0].id).toBe(original[0].id);
  });
});

describe("deduplicateInsights", () => {
  it("removes duplicate IDs, keeps first occurrence", () => {
    const insights = [
      buildInsight({ id: "dup", impact: "high", title: "First", reasoning: "", confidence: 90 }),
      buildInsight({ id: "unique", impact: "medium", title: "Unique", reasoning: "", confidence: 80 }),
      buildInsight({ id: "dup", impact: "low", title: "Duplicate", reasoning: "", confidence: 50 }),
    ];
    const result = deduplicateInsights(insights);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("First"); // Kept first
    expect(result[1].id).toBe("unique");
  });

  it("returns empty array for empty input", () => {
    expect(deduplicateInsights([])).toHaveLength(0);
  });
});

describe("computeHealthScore", () => {
  it("computes score from factors", () => {
    const ctx = createTestCtx({ revenue: 80000, memberCount: 300, satisfaction: 90 });
    const result = computeHealthScore(ctx, HEALTH_FACTORS);

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D"]).toContain(result.grade);
    expect(result.factors).toHaveLength(3);
  });

  it("normalizes weights that don't sum to 1", () => {
    const unbalanced: HealthFactorDef<TestContext>[] = [
      { id: "a", label: "A", compute: () => 80, weight: 0.8 },
      { id: "b", label: "B", compute: () => 60, weight: 0.8 },
    ];
    const result = computeHealthScore(createTestCtx(), unbalanced);

    expect(result.score).toBeGreaterThan(0);
    expect(result.factors[0].weight + result.factors[1].weight).toBeCloseTo(1, 1);
  });

  it("handles empty factors with warning", () => {
    const result = computeHealthScore(createTestCtx(), []);

    expect(result.score).toBe(0);
    expect(result.grade).toBe("D");
    expect(result.hasCritical).toBe(true);
  });

  it("handles factor compute errors gracefully", () => {
    const badFactors: HealthFactorDef<TestContext>[] = [
      { id: "good", label: "Good", compute: () => 80, weight: 0.5 },
      { id: "bad", label: "Bad", compute: () => { throw new Error("boom"); }, weight: 0.5 },
    ];
    const result = computeHealthScore(createTestCtx(), badFactors);

    expect(result.factors).toHaveLength(2);
    expect(result.factors[1].rawValue).toBe(0); // Failed = 0
  });
});

describe("computeConfidence", () => {
  it("computes from dataDriven preset", () => {
    const factors = CONFIDENCE_PRESETS.dataDriven(1, 100); // 1 day old, 100 records
    const result = computeConfidence(factors);

    expect(result.score).toBeGreaterThan(70); // Fresh data + large sample = high
    expect(result.level).toBe("high");
  });

  it("computes from ragGrounded preset", () => {
    const factors = CONFIDENCE_PRESETS.ragGrounded(85, 3);
    const result = computeConfidence(factors);

    expect(result.score).toBeGreaterThan(70);
    expect(result.level).toBe("high");
  });

  it("computes from conservative preset", () => {
    const factors = CONFIDENCE_PRESETS.conservative(70);
    const result = computeConfidence(factors);

    expect(result.score).toBeGreaterThan(50);
    expect(result.factors).toHaveLength(3);
  });

  it("returns medium for empty factors", () => {
    const result = computeConfidence([]);

    expect(result.score).toBe(50);
    expect(result.level).toBe("medium");
  });

  it("normalizes weights", () => {
    const factors = [
      { name: "a", value: 80, weight: 0.6, detail: "A" },
      { name: "b", value: 60, weight: 0.6, detail: "B" },
    ];
    const result = computeConfidence(factors);

    expect(result.score).toBeGreaterThan(0);
  });
});

describe("runPipeline (integration)", () => {
  it("runs full pipeline: evaluate → sort → dedupe → signals → health", () => {
    const rules = [
      createTestRule("R1", { impact: "high", priority: 10 }),
      createTestRule("R2", { impact: "medium", priority: 100 }),
      createTestRule("R3", { impact: "low", priority: 200, condition: () => false }),
    ];
    const ctx = createTestCtx();
    const result = runPipeline(ctx, rules, HEALTH_FACTORS);

    expect(result.insights).toHaveLength(2); // R3 didn't fire
    expect(result.insights[0].id).toBe("executive_R1"); // Sorted by impact
    expect(result.healthScore).toBeDefined();
    expect(result.healthScore!.factors).toHaveLength(3);
    expect(result.meta.rulesEvaluated).toBe(3);
    expect(result.meta.rulesFired).toBe(2);
    expect(result.meta.evaluationTime).toBeGreaterThanOrEqual(0);
    expect(result.signals).toBeDefined();
  });

  it("works without health factors", () => {
    const rules = [createTestRule("R1")];
    const result = runPipeline(createTestCtx(), rules);

    expect(result.insights).toHaveLength(1);
    expect(result.healthScore).toBeUndefined();
  });
});