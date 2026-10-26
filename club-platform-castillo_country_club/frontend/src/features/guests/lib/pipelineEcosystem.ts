// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/pipelineEcosystem.ts
// Phase 34 "The Gateway" — Pipeline Ecosystem Engine
// Level 6+ Agency · Production Grade
//
// The pipeline is not a funnel. It's a living ecosystem.
// Wraps the backend ConversionFunnel with flow analysis,
// bottleneck detection, quick-win identification, and
// velocity computation.
//
// Depends on: types.ts, config.ts
// Budget: 50ms
// ═══════════════════════════════════════════════════════════

import type {
  GuestEngineResult,
  PipelineEcosystem,
  EnrichedPipelineStage,
  GuestPipelineStage,
  StageFlow,
  Bottleneck,
  QuickWin,
  PipelineForecast,
} from "../types";

import {
  engineOk,
  engineFail,
} from "../types";

import type { GuestEngineError } from "../types";

import type {
  ConversionFunnel,
  GuestDemandForecast,
  GuestHealthScore,
} from "@/shared/mocks/contracts";

import {
  GUEST_PIPELINE_STAGE_DEFS
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1 — INPUT CONTRACTS
// ═══════════════════════════════════════════════════════════

export interface PipelineInput {
  readonly funnel: ConversionFunnel | null;
  readonly forecast: GuestDemandForecast | null;
  readonly healthScore: GuestHealthScore | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — PIPELINE ECOSYSTEM CONSTRUCTION
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete pipeline ecosystem from MCP data.
 * Wraps the backend ConversionFunnel with:
 *   - Enriched stages with trend and flow data
 *   - Bottleneck detection
 *   - Quick-win identification
 *   - Velocity computation
 *   - Forecast overlay
 *
 * @param input - MCP funnel + forecast + health data
 * @returns GuestEngineResult with PipelineEcosystem
 */
export function buildPipelineEcosystem(
  input: PipelineInput,
): GuestEngineResult<PipelineEcosystem> {
  const { funnel, forecast, healthScore } = input;
  const warnings: string[] = [];

  if (!funnel) {
    return engineFail<PipelineEcosystem>(
      createError("INSUFFICIENT_DATA", "ConversionFunnel requerido para construir pipeline"),
      null,
    );
  }

  if (!forecast) warnings.push("Forecast no disponible — proyecciones omitidas");
  if (!healthScore) warnings.push("HealthScore no disponible — salud basada en funnel solo");

  // ── Enriched Stages ──
  const rawStages = funnel.stages ?? [];
  const stages: EnrichedPipelineStage[] = rawStages.map(raw => {
    const def = GUEST_PIPELINE_STAGE_DEFS.find(d => d.id === raw.stage);
    const trend = deriveTrend(raw.vs_benchmark);

    return {
      id: (raw.stage as GuestPipelineStage) ?? "registered",
      label: def?.label ?? raw.label ?? raw.stage,
      count: raw.count ?? 0,
      rate: raw.rate_pct ?? 0,
      benchmark: raw.rate_pct + (raw.vs_benchmark ?? 0),
      vsBenchmark: raw.vs_benchmark ?? 0,
      avgDays: estimateAvgDays(raw.stage),
      color: def?.color ?? "var(--color-silver-400)",
      trend,
    };
  });

  // ── Stage Flows ──
  const flows: StageFlow[] = [];
  const orderedStages = [...stages].sort((a, b) => {
    const aDef = GUEST_PIPELINE_STAGE_DEFS.find(d => d.id === a.id);
    const bDef = GUEST_PIPELINE_STAGE_DEFS.find(d => d.id === b.id);
    return (aDef?.step ?? 0) - (bDef?.step ?? 0);
  });

  for (let i = 0; i < orderedStages.length - 1; i++) {
    const from = orderedStages[i];
    const to = orderedStages[i + 1];
    const flowCount = Math.min(from.count, to.count);
    const velocity = from.avgDays + to.avgDays;

    flows.push({
      fromStage: from.id,
      toStage: to.id,
      count: flowCount,
      velocity: Math.round(velocity),
      trend: flowCount > 0 ? (to.vsBenchmark >= 0 ? "increasing" : "decreasing") : "stable",
    });
  }

  // ── Bottlenecks ──
  const bottlenecks: Bottleneck[] = [];
  for (const stage of stages) {
    if (stage.vsBenchmark < -10) {
      bottlenecks.push({
        stageId: stage.id,
        stageLabel: stage.label,
        stuckCount: Math.round(stage.count * 0.3),
        avgDaysStuck: stage.avgDays,
        severity: stage.vsBenchmark < -25 ? "critical" : stage.vsBenchmark < -15 ? "high" : "medium",
        cause: deriveBottleneckCause(stage),
      });
    }
  }

  // ── Quick Wins ──
  const readyStage = stages.find(s => s.id === "ready");
  const quickWins: readonly QuickWin[] = readyStage && readyStage.count > 0  
    ? generateQuickWins(readyStage.count)
    : [];

  // ── Forecasts ──
  const forecasts: PipelineForecast[] = [];
  if (forecast?.forecasts) {
    for (const f of forecast.forecasts) {
      forecasts.push({
        metric: f.metric,
        currentValue: 0,
        forecastValue: 0,
        changePct: f.change_pct ?? 0,
        factors: f.factors ?? [],
        confidence: 70,
      });
    }
  }

  // ── Health ──
  const health = computePipelineHealth(stages, bottlenecks, quickWins.length);

  // ── Velocity ──
  const totalDays = stages.reduce((sum, s) => sum + s.avgDays, 0);
  const velocity = Math.round(totalDays);

  // ── Pipeline Value ──
  const pipelineValue = (funnel as unknown as Record<string, unknown>)?.pipeline_value as number ?? 0;

  return engineOk<PipelineEcosystem>({
    stages,
    flows,
    bottlenecks,
    quickWins,
    forecasts,
    health,
    velocity,
    totalGuests: funnel.total_guests ?? 0,
    pipelineValue,
    computedAt: new Date().toISOString(),
  }, warnings);
}

/**
 * Safe variant — never returns error.
 */
export function buildPipelineEcosystemSafe(
  input: PipelineInput,
): PipelineEcosystem {
  const result = buildPipelineEcosystem(input);
  if (result.ok) return result.data;

  return {
    stages: [],
    flows: [],
    bottlenecks: [],
    quickWins: [],
    forecasts: [],
    health: 0,
    velocity: 0,
    totalGuests: 0,
    pipelineValue: 0,
    computedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — PIPELINE HEALTH COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Composite pipeline health score.
 * Based on: stage performance, bottleneck severity, quick wins.
 */
function computePipelineHealth(
  stages: readonly EnrichedPipelineStage[],
  bottlenecks: readonly Bottleneck[],
  quickWinCount: number,
): number {
  if (stages.length === 0) return 0;

  // Stage health: avg vs benchmark
  const stagesAboveBenchmark = stages.filter(s => s.vsBenchmark >= 0).length;
  const stageHealth = (stagesAboveBenchmark / stages.length) * 100;

  // Bottleneck penalty
  const bottleneckPenalty = bottlenecks.reduce((penalty, b) => {
    if (b.severity === "critical") return penalty + 20;
    if (b.severity === "high") return penalty + 12;
    if (b.severity === "medium") return penalty + 6;
    return penalty + 2;
  }, 0);

  // Quick win bonus
  const quickWinBonus = Math.min(15, quickWinCount * 5);

  const health = Math.round(Math.max(0, Math.min(100,
    stageHealth - bottleneckPenalty + quickWinBonus,
  )));

  return health;
}

// ═══════════════════════════════════════════════════════════
// §4 — HELPERS
// ═══════════════════════════════════════════════════════════

function deriveTrend(vsBenchmark: number): "improving" | "stable" | "declining" {
  if (vsBenchmark > 5) return "improving";
  if (vsBenchmark < -5) return "declining";
  return "stable";
}

function estimateAvgDays(stageId: string): number {
  const days: Record<string, number> = {
    registered: 3,
    first_visit: 14,
    trial_active: 30,
    ready: 7,
    converted: 0,
    dormant: 60,
  };
  return days[stageId] ?? 14;
}

function deriveBottleneckCause(stage: EnrichedPipelineStage): string {
  switch (stage.id) {
    case "registered":
      return "Guests registrados sin follow-up para primera visita";
    case "first_visit":
      return "Primera visita no genera suficiente engagement para trial";
    case "trial_active":
      return "Trial activo sin plan de conversión claro";
    case "ready":
      return "Guest listo pero sin sponsor ni propuesta programada";
    default:
      return `Etapa ${stage.label} por debajo del benchmark en ${Math.abs(stage.vsBenchmark)} puntos`;
  }
}

function generateQuickWins(count: number): readonly QuickWin[] {
  // Generate placeholder quick wins from count
  // In production, these come from actual guest data
  const wins: QuickWin[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    wins.push({
      guestId: `quick_win_${i}` as any,
      guestName: `Guest listo ${i + 1}`,
      currentStage: "ready",
      actionNeeded: "Programar reunión con sponsor asignado",
      estimatedImpact: 15 + Math.round(Math.random() * 20),
      confidence: 70 + Math.round(Math.random() * 20),
    });
  }
  return wins;
}

function createError(
  code: GuestEngineError["code"],
  message: string,
): GuestEngineError {
  return {
    engine: "pipelineEcosystem",
    code,
    message,
    retryable: code === "MCP_UNAVAILABLE" || code === "MCP_TIMEOUT",
    timestamp: new Date().toISOString(),
  };
}