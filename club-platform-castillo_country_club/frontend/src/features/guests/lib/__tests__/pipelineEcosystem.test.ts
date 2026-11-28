// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/__tests__/pipelineEcosystem.test.ts
// Phase 34 "The Gateway" — Pipeline Ecosystem Engine Tests
// Level 6+ Agency · Production Grade
//
// Tests ALL 3 exports against verified formulas.
// Exact numerical assertions for health, bottlenecks, flows.
// Behavioral assertions for config-dependent fields.
// Random-aware assertions for generateQuickWins (private).
//
// Checklist: T1-T8
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  buildPipelineEcosystem,
  buildPipelineEcosystemSafe,
  type PipelineInput,
} from "../pipelineEcosystem";

import type {
  GuestEngineResult
} from "../../types";

import type {
  ConversionFunnel,
  GuestDemandForecast,
  GuestHealthScore,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// §1 — HELPERS
// ═══════════════════════════════════════════════════════════

function assertOk<T>(result: GuestEngineResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Unreachable");
  return result.data;
}

function assertFail<T>(result: GuestEngineResult<T>): void {
  expect(result.ok).toBe(false);
}

// ═══════════════════════════════════════════════════════════
// §2 — MOCK FACTORIES
// ═══════════════════════════════════════════════════════════

/**
 * All stages ABOVE benchmark → no bottlenecks.
 *   registered: vs=0 → trend=stable, days=3
 *   first_visit: vs=+5 → trend=stable, days=14
 *   trial_active: vs=+3 → trend=stable, days=30
 *   ready: vs=+10 → trend=improving, days=7
 *   converted: vs=+10 → trend=improving, days=0
 *
 * Pipeline value cast: (funnel as unknown as Record<string, unknown>).pipeline_value
 */
function makeHealthyFunnel(): ConversionFunnel {
  return {
    total_guests: 200,
    total_converted: 18,
    overall_conversion_pct: 9,
    overall_benchmark_pct: 10,
    pipeline_value: 55_000_000,
    stages: [
      { stage: "registered", label: "Registrados", count: 200, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
      { stage: "first_visit", label: "Primera Visita", count: 120, rate_pct: 60, benchmark_pct: 55, vs_benchmark: 5 },
      { stage: "trial_active", label: "Trial Activo", count: 40, rate_pct: 33, benchmark_pct: 30, vs_benchmark: 3 },
      { stage: "ready", label: "Listos", count: 20, rate_pct: 50, benchmark_pct: 40, vs_benchmark: 10 },
      { stage: "converted", label: "Convertidos", count: 18, rate_pct: 90, benchmark_pct: 80, vs_benchmark: 10 },
    ],
  } as unknown as ConversionFunnel;
}

/**
 * Two stages with vs_benchmark < -10 → two bottlenecks.
 *   first_visit: vs=-25 → critical
 *   trial_active: vs=-12 → medium
 */
function makeBottleneckFunnel(): ConversionFunnel {
  return {
    total_guests: 200,
    total_converted: 1,
    overall_conversion_pct: 0.5,
    overall_benchmark_pct: 10,
    pipeline_value: 10_000_000,
    stages: [
      { stage: "registered", label: "Registrados", count: 200, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
      { stage: "first_visit", label: "Primera Visita", count: 50, rate_pct: 25, benchmark_pct: 50, vs_benchmark: -25 },
      { stage: "trial_active", label: "Trial Activo", count: 8, rate_pct: 16, benchmark_pct: 28, vs_benchmark: -12 },
      { stage: "ready", label: "Listos", count: 2, rate_pct: 25, benchmark_pct: 40, vs_benchmark: -15 },
      { stage: "converted", label: "Convertidos", count: 1, rate_pct: 50, benchmark_pct: 80, vs_benchmark: -30 },
    ],
  } as unknown as ConversionFunnel;
}

/**
 * Funnel with ready stage count = 0 → no quick wins.
 */
function makeNoReadyFunnel(): ConversionFunnel {
  return {
    total_guests: 100,
    total_converted: 5,
    overall_conversion_pct: 5,
    overall_benchmark_pct: 10,
    pipeline_value: 20_000_000,
    stages: [
      { stage: "registered", label: "Registrados", count: 100, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
      { stage: "first_visit", label: "Primera Visita", count: 60, rate_pct: 60, benchmark_pct: 55, vs_benchmark: 5 },
      { stage: "trial_active", label: "Trial Activo", count: 15, rate_pct: 25, benchmark_pct: 30, vs_benchmark: -5 },
      { stage: "ready", label: "Listos", count: 0, rate_pct: 0, benchmark_pct: 40, vs_benchmark: -40 },
      { stage: "converted", label: "Convertidos", count: 5, rate_pct: 100, benchmark_pct: 80, vs_benchmark: 20 },
    ],
  } as unknown as ConversionFunnel;
}

function makeForecast(): GuestDemandForecast {
  return {
    forecasts: [
      { metric: "guest_volume", current_value: 200, forecast_value: 220, change_pct: 10, factors: ["seasonal uptick", "marketing campaign"], confidence: 75 },
      { metric: "conversion_rate", current_value: 9, forecast_value: 11, change_pct: 22, factors: ["improved onboarding"], confidence: 65 },
    ],
    seasonal_multiplier: 1.15,
    peak_months: ["Diciembre", "Enero", "Julio"],
  } as unknown as GuestDemandForecast;
}

function makeHealthScore(): GuestHealthScore {
  return { overall_score: 72, level: "bueno", factors: [], has_critical: false, critical_factors: [], recommendations: [] } as unknown as GuestHealthScore;
}

function makeFullInput(overrides?: Partial<PipelineInput>): PipelineInput {
  return {
    funnel: makeHealthyFunnel(),
    forecast: makeForecast(),
    healthScore: makeHealthScore(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — buildPipelineEcosystem
// ═══════════════════════════════════════════════════════════

describe("buildPipelineEcosystem", () => {
  // ── Error case ──

  it("should return error when funnel is null", () => {
    const result = buildPipelineEcosystem({ funnel: null, forecast: makeForecast(), healthScore: makeHealthScore() });
    assertFail(result);
  });

  // ── Happy path ──

  it("should return valid ecosystem with full inputs", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    expect(eco.stages.length).toBeGreaterThan(0);
    expect(eco.health).toBeGreaterThanOrEqual(0);
    expect(eco.health).toBeLessThanOrEqual(100);
    expect(eco.velocity).toBeGreaterThanOrEqual(0);
    expect(eco.totalGuests).toBe(200);
    expect(typeof eco.pipelineValue).toBe("number");
    expect(eco.computedAt).toBeTruthy();
  });

  // ── Warnings ──

  it("should emit warning when forecast is null", () => {
    const result = buildPipelineEcosystem(makeFullInput({ forecast: null }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("Forecast no disponible — proyecciones omitidas");
    }
  });

  it("should emit warning when healthScore is null", () => {
    const result = buildPipelineEcosystem(makeFullInput({ healthScore: null }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toContain("HealthScore no disponible — salud basada en funnel solo");
    }
  });

  it("should emit no warnings when all inputs present", () => {
    const result = buildPipelineEcosystem(makeFullInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings).toHaveLength(0);
    }
  });

  // ══════════════════════════════════════════════════════════
  // §3.1 — Enriched Stages
  // ══════════════════════════════════════════════════════════

  it("should map all funnel stages to enriched stages", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.stages.length).toBe(5);
  });

  it("should preserve stage counts from funnel", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const reg = eco.stages.find((s) => s.id === "registered");
    const fv = eco.stages.find((s) => s.id === "first_visit");
    const trial = eco.stages.find((s) => s.id === "trial_active");
    const ready = eco.stages.find((s) => s.id === "ready");
    const conv = eco.stages.find((s) => s.id === "converted");

    expect(reg?.count).toBe(200);
    expect(fv?.count).toBe(120);
    expect(trial?.count).toBe(40);
    expect(ready?.count).toBe(20);
    expect(conv?.count).toBe(18);
  });

  it("should preserve rate_pct from funnel stages", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const reg = eco.stages.find((s) => s.id === "registered");
    expect(reg?.rate).toBe(100);
  });

  it("should compute vsBenchmark from funnel data", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const ready = eco.stages.find((s) => s.id === "ready");
    expect(ready?.vsBenchmark).toBe(10);
  });

  // ── deriveTrend (exact formula) ──

  it("should derive trend = improving when vsBenchmark > 5", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const ready = eco.stages.find((s) => s.id === "ready"); // vs=10
    expect(ready?.trend).toBe("improving");
  });

  it("should derive trend = declining when vsBenchmark < -5", () => {
    const eco = assertOk(buildPipelineEcosystem({ funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore() }));

    const fv = eco.stages.find((s) => s.id === "first_visit"); // vs=-25
    expect(fv?.trend).toBe("declining");
  });

  it("should derive trend = stable when vsBenchmark between -5 and 5", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const reg = eco.stages.find((s) => s.id === "registered"); // vs=0
    expect(reg?.trend).toBe("stable");

    const trial = eco.stages.find((s) => s.id === "trial_active"); // vs=3
    expect(trial?.trend).toBe("stable");
  });

  // ── estimateAvgDays (exact values) ──

  it("should assign exact avgDays per stage type", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    expect(eco.stages.find((s) => s.id === "registered")?.avgDays).toBe(3);
    expect(eco.stages.find((s) => s.id === "first_visit")?.avgDays).toBe(14);
    expect(eco.stages.find((s) => s.id === "trial_active")?.avgDays).toBe(30);
    expect(eco.stages.find((s) => s.id === "ready")?.avgDays).toBe(7);
    expect(eco.stages.find((s) => s.id === "converted")?.avgDays).toBe(0);
  });

  // ── Stage fields ──

  it("should include all required stage fields", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    eco.stages.forEach((s) => {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(typeof s.count).toBe("number");
      expect(typeof s.rate).toBe("number");
      expect(typeof s.benchmark).toBe("number");
      expect(typeof s.vsBenchmark).toBe("number");
      expect(typeof s.avgDays).toBe("number");
      expect(s.color).toBeTruthy();
      expect(["improving", "stable", "declining"]).toContain(s.trend);
    });
  });

  // ══════════════════════════════════════════════════════════
  // §3.2 — Stage Flows
  // ══════════════════════════════════════════════════════════

  it("should create N-1 flows for N stages", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    // 5 stages → 4 flows
    expect(eco.flows.length).toBe(4);
  });

  it("should compute flow count as min(from.count, to.count)", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    // Flow: registered(200) → first_visit(120) → flowCount = min(200, 120) = 120
    const flow0 = eco.flows[0];
    expect(flow0.count).toBe(120);

    // Flow: first_visit(120) → trial_active(40) → flowCount = min(120, 40) = 40
    const flow1 = eco.flows[1];
    expect(flow1.count).toBe(40);
  });

  it("should compute flow velocity as from.avgDays + to.avgDays", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    // registered(3) → first_visit(14) → velocity = 3 + 14 = 17
    expect(eco.flows[0].velocity).toBe(17);

    // first_visit(14) → trial_active(30) → velocity = 14 + 30 = 44
    expect(eco.flows[1].velocity).toBe(44);

    // trial_active(30) → ready(7) → velocity = 30 + 7 = 37
    expect(eco.flows[2].velocity).toBe(37);

    // ready(7) → converted(0) → velocity = 7 + 0 = 7
    expect(eco.flows[3].velocity).toBe(7);
  });

  it("should derive flow trend = increasing when flowCount > 0 and to.vsBenchmark >= 0", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    // registered→first_visit: flowCount=120>0, first_visit.vsBenchmark=5>=0 → increasing
    expect(eco.flows[0].trend).toBe("increasing");
  });

  it("should derive flow trend = decreasing when flowCount > 0 and to.vsBenchmark < 0", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // registered(200)→first_visit(50): flowCount=50>0, first_visit.vsBenchmark=-25<0 → decreasing
    expect(eco.flows[0].trend).toBe("decreasing");
  });

  it("should derive flow trend = stable when flowCount = 0", () => {
    // ready count=0 in noReadyFunnel → flow: trial_active→ready has flowCount=min(15,0)=0
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeNoReadyFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // trial_active→ready: min(15,0) = 0
    const flow = eco.flows.find((f) => f.toStage === "ready");
    expect(flow?.count).toBe(0);
    expect(flow?.trend).toBe("stable");
  });

  it("should include fromStage and toStage on each flow", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    eco.flows.forEach((f) => {
      expect(f.fromStage).toBeTruthy();
      expect(f.toStage).toBeTruthy();
      expect(f.fromStage).not.toBe(f.toStage);
    });
  });

  // ══════════════════════════════════════════════════════════
  // §3.3 — Bottlenecks
  // ══════════════════════════════════════════════════════════

  it("should detect no bottlenecks when all stages above -10", () => {
    // All healthy funnel stages have vs_benchmark: 0, 5, 3, 10, 10
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.bottlenecks.length).toBe(0);
  });

  it("should detect bottleneck when vsBenchmark < -10", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // first_visit: vs=-25, trial_active: vs=-12, ready: vs=-15, converted: vs=-30
    // All < -10 → 4 bottlenecks
    expect(eco.bottlenecks.length).toBe(4);
  });

  it("should NOT detect bottleneck when vsBenchmark = -10 (exact boundary)", () => {
    const funnel = {
      total_guests: 100, total_converted: 5, overall_conversion_pct: 5,
      overall_benchmark_pct: 10, pipeline_value: 10_000_000,
      stages: [
        { stage: "registered", label: "Reg", count: 100, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
        { stage: "first_visit", label: "FV", count: 50, rate_pct: 50, benchmark_pct: 60, vs_benchmark: -10 },
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.bottlenecks.length).toBe(0);
  });

  // ── Bottleneck severity (exact formula) ──

  it("should assign severity = critical when vsBenchmark < -25", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // first_visit: vs=-25 → NOT < -25, so it's "high" not "critical"
    // Wait: -25 < -25? No. -25 is NOT < -25. It's equal. So it falls to < -15 check → "high".
    // converted: vs=-30 → -30 < -25 → "critical"
    const converted = eco.bottlenecks.find((b) => b.stageId === "converted");
    expect(converted?.severity).toBe("critical");
  });

  it("should assign severity = high when vsBenchmark in [-25, -15)", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // first_visit: vs=-25 → -25 < -25? No. -25 < -15? Yes. → "high"
    const fv = eco.bottlenecks.find((b) => b.stageId === "first_visit");
    expect(fv?.severity).toBe("high");

    // ready: vs=-15 → -15 < -15? No. → falls to else → "medium"
    // Actually: vs=-15 is NOT < -15. So severity = "medium".
    // But -15 < -10 → it IS a bottleneck. Just severity=medium.
    const ready = eco.bottlenecks.find((b) => b.stageId === "ready");
    expect(ready?.severity).toBe("medium");
  });

  it("should assign severity = medium when vsBenchmark in [-15, -10)", () => {
    const funnel = {
      total_guests: 100, total_converted: 5, overall_conversion_pct: 5,
      overall_benchmark_pct: 10, pipeline_value: 10_000_000,
      stages: [
        { stage: "registered", label: "Reg", count: 100, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
        { stage: "first_visit", label: "FV", count: 50, rate_pct: 50, benchmark_pct: 65, vs_benchmark: -15 },
        { stage: "ready", label: "Ready", count: 10, rate_pct: 20, benchmark_pct: 31, vs_benchmark: -11 },
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));

    // first_visit: vs=-15 → NOT < -15 → medium
    expect(eco.bottlenecks.find((b) => b.stageId === "first_visit")?.severity).toBe("medium");
    // ready: vs=-11 → medium
    expect(eco.bottlenecks.find((b) => b.stageId === "ready")?.severity).toBe("medium");
  });

  // ── Bottleneck stuckCount (exact formula) ──

  it("should compute stuckCount = round(count * 0.3)", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // first_visit: count=50, stuckCount = round(50*0.3) = 15
    const fv = eco.bottlenecks.find((b) => b.stageId === "first_visit");
    expect(fv?.stuckCount).toBe(15);

    // trial_active: count=8, stuckCount = round(8*0.3) = 2
    const trial = eco.bottlenecks.find((b) => b.stageId === "trial_active");
    expect(trial?.stuckCount).toBe(2);

    // converted: count=1, stuckCount = round(1*0.3) = 0
    const conv = eco.bottlenecks.find((b) => b.stageId === "converted");
    expect(conv?.stuckCount).toBe(0);
  });

  // ── Bottleneck cause ──

  it("should assign specific cause for registered bottleneck", () => {
    const funnel = {
      total_guests: 100, total_converted: 1, overall_conversion_pct: 1,
      overall_benchmark_pct: 10, pipeline_value: 5_000_000,
      stages: [
        { stage: "registered", label: "Reg", count: 100, rate_pct: 100, benchmark_pct: 100, vs_benchmark: -20 },
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.bottlenecks[0].cause).toContain("follow-up");
  });

  it("should assign specific cause for first_visit bottleneck", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    const fv = eco.bottlenecks.find((b) => b.stageId === "first_visit");
    expect(fv?.cause).toContain("Primera visita");
    expect(fv?.cause).toContain("engagement");
  });

  it("should assign specific cause for trial_active bottleneck", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    const trial = eco.bottlenecks.find((b) => b.stageId === "trial_active");
    expect(trial?.cause).toContain("Trial");
    expect(trial?.cause).toContain("conversión");
  });

  it("should assign specific cause for ready bottleneck", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    const ready = eco.bottlenecks.find((b) => b.stageId === "ready");
    expect(ready?.cause).toContain("sponsor");
  });

  // ── Bottleneck structural ──

  it("should include all required bottleneck fields", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    eco.bottlenecks.forEach((b) => {
      expect(b.stageId).toBeTruthy();
      expect(b.stageLabel).toBeTruthy();
      expect(typeof b.stuckCount).toBe("number");
      expect(b.stuckCount).toBeGreaterThanOrEqual(0);
      expect(typeof b.avgDaysStuck).toBe("number");
      expect(["critical", "high", "medium"]).toContain(b.severity);
      expect(typeof b.cause).toBe("string");
    });
  });

  // ══════════════════════════════════════════════════════════
  // §3.4 — Quick Wins (generateQuickWins is private, tested via ecosystem)
  // ══════════════════════════════════════════════════════════

  it("should generate quick wins when ready stage count > 0", () => {
    // ready count=20 → generates wins
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.quickWins.length).toBeGreaterThan(0);
  });

  it("should NOT generate quick wins when ready stage count = 0", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeNoReadyFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));
    expect(eco.quickWins.length).toBe(0);
  });

  it("should NOT generate quick wins when no ready stage exists", () => {
    const funnel = {
      total_guests: 100, total_converted: 5, overall_conversion_pct: 5,
      overall_benchmark_pct: 10, pipeline_value: 10_000_000,
      stages: [
        { stage: "registered", label: "Reg", count: 100, rate_pct: 100, benchmark_pct: 100, vs_benchmark: 0 },
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.quickWins.length).toBe(0);
  });

  it("should cap quick wins at 5 maximum", () => {
    // Ready count=100 → min(100, 5) = 5
    const funnel = {
      ...makeHealthyFunnel(),
      stages: [
        ...(makeHealthyFunnel().stages ?? []).map((s) =>
          s.stage === "converted_member" ? { ...s, count: 100 } : s,
        ),
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem(makeFullInput({ funnel })));
    expect(eco.quickWins.length).toBeLessThanOrEqual(5);
  });

  it("should produce quick wins equal to min(count, 5) for small counts", () => {
    // ready count=3 → 3 quick wins
    // G15: quickWins nacen del stage "ready" (pipelineEcosystem.ts:143,
    // generateQuickWins(min(count,5))). El mock viejo tocaba
    // "converted_member" — stage que NO existe en el funnel del mock
    // (es "converted") → count de ready seguía 20 → 5 quickWins.
    // El comparador va por substring id-safe (la unión tipada de
    // contracts.ts usa ids de backend; el funnel del mock usa los ids
    // de GUEST_PIPELINE_STAGE_DEFS — casteado as unknown igual que el
    // resto del archivo).
    const funnel = {
      ...makeHealthyFunnel(),
      stages: [
        ...(makeHealthyFunnel().stages ?? []).map((s) =>
          (s.stage as string) === "ready" ? { ...s, count: 3 } : s,
        ),
      ],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem(makeFullInput({ funnel })));
    expect(eco.quickWins.length).toBe(3);
  });

  it("should include all required QuickWin fields", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    eco.quickWins.forEach((qw) => {
      expect(qw.guestId).toBeTruthy();
      expect(qw.guestName).toBeTruthy();
      expect(qw.currentStage).toBe("ready");
      expect(qw.actionNeeded).toBeTruthy();
      // estimatedImpact: 15 + round(random * 20) → range [15, 35]
      expect(qw.estimatedImpact).toBeGreaterThanOrEqual(15);
      expect(qw.estimatedImpact).toBeLessThanOrEqual(35);
      // confidence: 70 + round(random * 20) → range [70, 90]
      expect(qw.confidence).toBeGreaterThanOrEqual(70);
      expect(qw.confidence).toBeLessThanOrEqual(90);
    });
  });

  // ══════════════════════════════════════════════════════════
  // §3.5 — Forecasts
  // ══════════════════════════════════════════════════════════

  it("should map forecast items to PipelineForecast", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    expect(eco.forecasts.length).toBe(2);

    const vol = eco.forecasts.find((f) => f.metric === "guest_volume");
    expect(vol).toBeDefined();
    expect(vol!.changePct).toBe(10);
    expect(vol!.factors).toEqual(["seasonal uptick", "marketing campaign"]);
    expect(vol!.confidence).toBe(70);
  });

  it("should set currentValue and forecastValue to 0 (not mapped from input)", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    eco.forecasts.forEach((f) => {
      expect(f.currentValue).toBe(0);
      expect(f.forecastValue).toBe(0);
    });
  });

  it("should map conversion_rate forecast", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));

    const convRate = eco.forecasts.find((f) => f.metric === "conversion_rate");
    expect(convRate).toBeDefined();
    expect(convRate!.changePct).toBe(22);
    expect(convRate!.factors).toEqual(["improved onboarding"]);
  });

  it("should return empty forecasts when forecast is null", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput({ forecast: null })));
    expect(eco.forecasts).toEqual([]);
  });

  // ══════════════════════════════════════════════════════════
  // §3.6 — Pipeline Health (exact formula)
  // ══════════════════════════════════════════════════════════

  it("should compute health for all-healthy pipeline", () => {
    // All 5 stages above benchmark (vs: 0, 5, 3, 10, 10)
    // stagesAboveBenchmark = 5/5 → stageHealth = 100
    // 0 bottlenecks → penalty = 0
    // 20 quick wins → min(15, 20*5) = 15
    // health = round(max(0, min(100, 100 - 0 + 15))) = 100
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.health).toBe(100);
  });

  it("should compute health for bottleneck pipeline", () => {
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // 5 stages: registered(vs=0), first_visit(vs=-25), trial_active(vs=-12), ready(vs=-15), converted(vs=-30)
    // stagesAboveBenchmark: registered only → 1/5 → stageHealth = 20
    //
    // Bottlenecks: first_visit(-25→high=12), trial_active(-12→medium=6), ready(-15→medium: -15 NOT < -15 → medium=6), converted(-30→critical=20)
    // Wait: ready vs=-15: -15 < -10 → bottleneck. -15 < -25? No. -15 < -15? No → medium(6)
    // penalty = 12 + 6 + 6 + 20 = 44
    //
    // Quick wins: ready count=2 → min(15, 2*5) = 10
    // health = round(max(0, min(100, 20 - 44 + 10))) = round(max(0, min(100, -14))) = 0
    expect(eco.health).toBe(0);
  });

  it("should compute health with no bottlenecks but no ready stage", () => {
    // All above benchmark except ready vs=-40
    const eco = assertOk(buildPipelineEcosystem({
      funnel: makeNoReadyFunnel(), forecast: makeForecast(), healthScore: makeHealthScore(),
    }));

    // stages: registered(vs=0), first_visit(vs=5), trial_active(vs=-5), ready(vs=-40), converted(vs=20)
    // stagesAboveBenchmark: registered(0>=0), first_visit(5>=0), converted(20>=0) → 3/5 → stageHealth=60
    //
    // Bottlenecks: ready vs=-40 → -40 < -25 → critical(20). Trial vs=-5 → -5 NOT < -10 → no bottleneck.
    // penalty = 20
    //
    // Quick wins: ready count=0 → 0
    // health = round(max(0, min(100, 60 - 20 + 0))) = 40
    expect(eco.health).toBe(40);
  });

  it("should return health = 0 for empty stages", () => {
    const funnel = {
      total_guests: 0, total_converted: 0, overall_conversion_pct: 0,
      overall_benchmark_pct: 0, pipeline_value: 0, stages: [],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.health).toBe(0);
  });

  // ══════════════════════════════════════════════════════════
  // §3.7 — Velocity
  // ══════════════════════════════════════════════════════════

  it("should compute velocity as sum of all stage avgDays", () => {
    // registered(3) + first_visit(14) + trial_active(30) + ready(7) + converted(0) = 54
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.velocity).toBe(54);
  });

  // ══════════════════════════════════════════════════════════
  // §3.8 — Pipeline Value
  // ══════════════════════════════════════════════════════════

  it("should extract pipeline_value from funnel via cast", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.pipelineValue).toBe(55_000_000);
  });

  it("should default pipelineValue to 0 when not present", () => {
    const funnel = {
      total_guests: 100, total_converted: 5, overall_conversion_pct: 5,
      overall_benchmark_pct: 10, stages: [],
    } as unknown as ConversionFunnel;

    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.pipelineValue).toBe(0);
  });

  // ══════════════════════════════════════════════════════════
  // §3.9 — Total Guests
  // ══════════════════════════════════════════════════════════

  it("should extract totalGuests from funnel", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(eco.totalGuests).toBe(200);
  });

  it("should default totalGuests to 0 when funnel has no total_guests", () => {
    const funnel = { stages: [] } as unknown as ConversionFunnel;
    const eco = assertOk(buildPipelineEcosystem({ funnel, forecast: null, healthScore: null }));
    expect(eco.totalGuests).toBe(0);
  });

  // ── ComputedAt ──

  it("should include computedAt as valid ISO string", () => {
    const eco = assertOk(buildPipelineEcosystem(makeFullInput()));
    expect(Number.isNaN(new Date(eco.computedAt).getTime())).toBe(false);
  });

  // ── Never throws ──

  it("should never throw regardless of input", () => {
    expect(() => buildPipelineEcosystem({ funnel: null, forecast: null, healthScore: null })).not.toThrow();
  });

  // ── Performance ──

  it("should complete within 10ms", () => {
    const start = performance.now();
    buildPipelineEcosystem(makeFullInput());
    expect(performance.now() - start).toBeLessThan(10);
  });
});

// ═══════════════════════════════════════════════════════════
// §4 — buildPipelineEcosystemSafe
// ═══════════════════════════════════════════════════════════

describe("buildPipelineEcosystemSafe", () => {
  it("should return identical data on success", () => {
    const input = makeFullInput();
    const raw = assertOk(buildPipelineEcosystem(input));
    const safe = buildPipelineEcosystemSafe(input);

    expect(safe.stages.length).toBe(raw.stages.length);
    expect(safe.health).toBe(raw.health);
    expect(safe.velocity).toBe(raw.velocity);
    expect(safe.totalGuests).toBe(raw.totalGuests);
    expect(safe.pipelineValue).toBe(raw.pipelineValue);
    expect(safe.quickWins.length).toBe(raw.quickWins.length);
  });

  it("should return zero-state on error (null funnel)", () => {
    const safe = buildPipelineEcosystemSafe({ funnel: null, forecast: null, healthScore: null });

    expect(safe.stages).toEqual([]);
    expect(safe.flows).toEqual([]);
    expect(safe.bottlenecks).toEqual([]);
    expect(safe.quickWins).toEqual([]);
    expect(safe.forecasts).toEqual([]);
    expect(safe.health).toBe(0);
    expect(safe.velocity).toBe(0);
    expect(safe.totalGuests).toBe(0);
    expect(safe.pipelineValue).toBe(0);
  });

  it("should always return valid PipelineEcosystem", () => {
    const cases = [
      makeFullInput(),
      { funnel: null, forecast: null, healthScore: null },
      { funnel: makeHealthyFunnel(), forecast: null, healthScore: null },
      { funnel: makeBottleneckFunnel(), forecast: makeForecast(), healthScore: null },
    ];
    for (const input of cases) {
      const safe = buildPipelineEcosystemSafe(input);
      expect(safe).toBeDefined();
      expect(Array.isArray(safe.stages)).toBe(true);
      expect(Array.isArray(safe.flows)).toBe(true);
      expect(Array.isArray(safe.bottlenecks)).toBe(true);
      expect(Array.isArray(safe.quickWins)).toBe(true);
      expect(Array.isArray(safe.forecasts)).toBe(true);
      expect(typeof safe.health).toBe("number");
      expect(safe.health).toBeGreaterThanOrEqual(0);
      expect(safe.health).toBeLessThanOrEqual(100);
      expect(safe.computedAt).toBeTruthy();
    }
  });

  it("should never throw", () => {
    expect(() => buildPipelineEcosystemSafe({ funnel: null, forecast: null, healthScore: null })).not.toThrow();
  });
});