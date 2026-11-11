// ═══════════════════════════════════════════════════════════
// src/features/guests/components/ConversionPipeline.tsx
// Phase 34 "The Gateway" — Signature Component: Conversion Pipeline
// Level 6+ Agency · Production Grade
//
// Vertical pipeline stage progression view.
// Complementary to GuestPipelineRiver (horizontal flow).
// Shows each stage as a proportional bar with conversion
// rates, bottleneck indicators, and quick win badges.
//
// Depends on: PipelineEcosystem (types.ts §9)
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   PipelineEcosystem { stages, flows, bottlenecks, quickWins,
//     forecasts, health(number), velocity, totalGuests,
//     pipelineValue, computedAt }                         ← types.ts §9 ✅
//   EnrichedPipelineStage { id(GuestPipelineStage), label,
//     count, rate, benchmark, vsBenchmark, avgDays, color,
//     trend }                                              ← types.ts §9 ✅
//   Bottleneck { stageId, stageLabel, stuckCount,
//     avgDaysStuck, severity, cause }                     ← types.ts §9 ✅
//   QuickWin { guestId, guestName, currentStage,
//     actionNeeded, estimatedImpact, confidence }         ← types.ts §9 ✅
//   StageFlow { fromStage, toStage, count, velocity,
//     trend }                                              ← types.ts §9 ✅
//   GuestPipelineStage = "registered"|"first_visit"|
//     "trial_active"|"ready"|"converted"|"dormant"        ← types.ts §9 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";

import type {
  PipelineEcosystem,
  EnrichedPipelineStage,
  GuestPipelineStage,
  Bottleneck,
  QuickWin,
} from "../types";

import "./ConversionPipeline.css";
import { Button } from "@/shared/components/ui/Button";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface ConversionPipelineProps {
  /** Pipeline ecosystem from the engine. null → empty state. */
  readonly pipeline: PipelineEcosystem | null;
  /** Called when user clicks a stage row. */
  readonly onStageClick?: (stageId: GuestPipelineStage) => void;
  /** Called when user clicks a quick win action. */
  readonly onQuickWinClick?: (quickWin: QuickWin) => void;
}

interface StageDisplayData {
  readonly stage: EnrichedPipelineStage;
  readonly bottleneck: Bottleneck | null;
  readonly quickWins: readonly QuickWin[];
  readonly widthPercent: number;
  readonly conversionFromPrev: number | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Ordered stage IDs for main flow (excludes dormant). */
const MAIN_FLOW_ORDER: readonly GuestPipelineStage[] = [
  "registered",
  "first_visit",
  "trial_active",
  "ready",
  "converted",
];

/** Sort and filter stages into main flow order. */
function orderStages(
  stages: readonly EnrichedPipelineStage[],
): readonly EnrichedPipelineStage[] {
  return MAIN_FLOW_ORDER
    .map((id) => stages.find((s) => s.id === id))
    .filter((s): s is EnrichedPipelineStage => s !== undefined);
}

/** Derive health level string from numeric health. */
function deriveHealthLevel(health: number): string {
  if (health >= 85) return "excellent";
  if (health >= 70) return "good";
  if (health >= 50) return "attention";
  if (health >= 30) return "warning";
  return "critical";
}

/** Trend symbol for display. */
function trendSymbol(trend: EnrichedPipelineStage["trend"]): string {
  switch (trend) {
    case "improving": return "↑";
    case "declining": return "↓";
    case "stable": return "→";
    default: {
      const _exhaustive: never = trend;
      return _exhaustive;
    }
  }
}

/** Trend label for accessibility. */
function trendLabel(trend: EnrichedPipelineStage["trend"]): string {
  switch (trend) {
    case "improving": return "Mejorando";
    case "declining": return "Bajando";
    case "stable": return "Estable";
    default: {
      const _exhaustive: never = trend;
      return _exhaustive;
    }
  }
}

/** Compute conversion rate between consecutive stages. */
function conversionBetween(
  from: EnrichedPipelineStage,
  to: EnrichedPipelineStage,
): number {
  if (from.count === 0) return 0;
  return Math.round((to.count / from.count) * 100);
}

// ═══════════════════════════════════════════════════════════
// §3 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Conversion Pipeline — vertical stage progression visualization.
 * Shows guest flow through pipeline stages as proportional bars
 * with conversion rates, bottleneck indicators, and quick wins.
 *
 * @example
 * <ConversionPipeline
 *   pipeline={dashboard.engines.pipeline}
 *   onStageClick={(id) => setActiveStage(id)}
 * />
 */
export function ConversionPipeline({
  pipeline,
  onStageClick,
  onQuickWinClick,
}: ConversionPipelineProps) {
  const [expandedStage, setExpandedStage] = useState<GuestPipelineStage | null>(null);

  // ── Build display data ──
  const stageData: readonly StageDisplayData[] = useMemo(() => {
    if (!pipeline) return [];

    const ordered = orderStages(pipeline.stages);
    const maxCount = Math.max(...ordered.map((s) => s.count), 1);

    return ordered.map((stage, i) => {
      const bottleneck = pipeline.bottlenecks.find((b) => b.stageId === stage.id) ?? null;
      const quickWins = pipeline.quickWins.filter((qw) => qw.currentStage === stage.id);
      const widthPercent = Math.round((stage.count / maxCount) * 100);
      const conversionFromPrev = i > 0 ? conversionBetween(ordered[i - 1], stage) : null;

      return { stage, bottleneck, quickWins, widthPercent, conversionFromPrev };
    });
  }, [pipeline]);

  const healthLevel = useMemo(
    () => deriveHealthLevel(pipeline?.health ?? 0),
    [pipeline?.health],
  );

  const handleStageClick = useCallback(
    (stageId: GuestPipelineStage) => {
      setExpandedStage((prev) => (prev === stageId ? null : stageId));
      onStageClick?.(stageId);
    },
    [onStageClick],
  );

  // ── Empty state ──
  if (!pipeline || stageData.length === 0) {
    return (
      <div
        className="gst-pipeline"
        data-state="empty"
        role="region"
        aria-label="Pipeline de conversión"
        data-testid="conversion-pipeline"
      >
        <p className="gst-pipeline__empty-text">
          No hay datos del pipeline disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      className="gst-pipeline"
      data-state="data"
      role="region"
      aria-label="Pipeline de conversión"
      data-testid="conversion-pipeline"
    >
      {/* ── Header ── */}
      <div className="gst-pipeline__header">
        <h3 className="gst-pipeline__title">Pipeline de Conversión</h3>
        <div className="gst-pipeline__header-stats">
          <span className="gst-pipeline__stat" data-level={healthLevel}>
            Salud: {pipeline.health}/100
          </span>
          <span className="gst-pipeline__stat">
            {pipeline.totalGuests} invitados
          </span>
          <span className="gst-pipeline__stat">
            {pipeline.velocity} días promedio
          </span>
        </div>
      </div>

      {/* ── Stage Rows ── */}
      <div className="gst-pipeline__stages" role="list" aria-label="Etapas del pipeline">
        {stageData.map((data) => {
          const { stage, bottleneck, quickWins, widthPercent, conversionFromPrev } = data;
          const isExpanded = expandedStage === stage.id;

          return (
            <div key={stage.id} className="gst-pipeline__stage-wrapper">
              {/* ── Conversion connector between stages ── */}
              {conversionFromPrev !== null && (
                <div className="gst-pipeline__connector">
                  <div className="gst-pipeline__connector-line" />
                  <span className="gst-pipeline__connector-rate">
                    {conversionFromPrev}%
                  </span>
                </div>
              )}

              {/* ── Stage Row ── */}
              <Button
                variant="unstyled"
                className="gst-pipeline__stage"
                data-trend={stage.trend}
                data-bottleneck={bottleneck !== null}
                data-severity={bottleneck?.severity}
                data-expanded={isExpanded}
                onClick={() => handleStageClick(stage.id)}
                role="listitem"
                aria-label={`${stage.label}: ${stage.count} invitados, ${stage.rate.toFixed(1)}% conversión, tendencia ${trendLabel(stage.trend)}`}
                data-testid={`pipeline-stage-${stage.id}`}
              >
                {/* ── Stage Label ── */}
                <div className="gst-pipeline__stage-label">
                  <span className="gst-pipeline__stage-name">{stage.label}</span>
                  <span className="gst-pipeline__stage-trend" aria-hidden="true">
                    {trendSymbol(stage.trend)}
                  </span>
                </div>

                {/* ── Stage Bar ── */}
                <div className="gst-pipeline__stage-bar-container">
                  <div
                    className="gst-pipeline__stage-bar"
                    style={{ width: `${widthPercent}%` }}
                    data-color={stage.id}
                  />
                </div>

                {/* ── Stage Metrics ── */}
                <div className="gst-pipeline__stage-metrics">
                  <span className="gst-pipeline__stage-count">{stage.count}</span>
                  <span className="gst-pipeline__stage-rate">
                    {stage.rate.toFixed(1)}%
                  </span>
                  <span className="gst-pipeline__stage-vs" data-positive={stage.vsBenchmark >= 0}>
                    {stage.vsBenchmark >= 0 ? "+" : ""}{stage.vsBenchmark.toFixed(1)}
                  </span>
                </div>

                {/* ── Badges ── */}
                <div className="gst-pipeline__stage-badges">
                  {bottleneck && (
                    <span
                      className="gst-pipeline__badge"
                      data-type="bottleneck"
                      title={bottleneck.cause}
                    >
                      Bloqueo
                    </span>
                  )}
                  {quickWins.length > 0 && (
                    <span className="gst-pipeline__badge" data-type="quickwin">
                      {quickWins.length} quick win{quickWins.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Button>

              {/* ── Expanded Detail ── */}
              {isExpanded && (
                <div
                  className="gst-pipeline__detail"
                  role="region"
                  aria-label={`Detalle de ${stage.label}`}
                >
                  <div className="gst-pipeline__detail-grid">
                    <div className="gst-pipeline__detail-item">
                      <span className="gst-pipeline__detail-label">Benchmark</span>
                      <span className="gst-pipeline__detail-value">{stage.benchmark.toFixed(1)}%</span>
                    </div>
                    <div className="gst-pipeline__detail-item">
                      <span className="gst-pipeline__detail-label">Días promedio</span>
                      <span className="gst-pipeline__detail-value">{stage.avgDays}</span>
                    </div>
                  </div>

                  {/* Bottleneck detail */}
                  {bottleneck && (
                    <div className="gst-pipeline__detail-bottleneck">
                      <p className="gst-pipeline__detail-bottleneck-cause">
                        <strong>Causa:</strong> {bottleneck.cause}
                      </p>
                      <p className="gst-pipeline__detail-bottleneck-stats">
                        {bottleneck.stuckCount} atascados — {bottleneck.avgDaysStuck} días — Severidad: {bottleneck.severity}
                      </p>
                    </div>
                  )}

                  {/* Quick wins */}
                  {quickWins.length > 0 && (
                    <div className="gst-pipeline__detail-quickwins">
                      {quickWins.map((qw) => (
                        <Button
                          variant="unstyled"
                          key={qw.guestId as string}
                          className="gst-pipeline__quickwin"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickWinClick?.(qw);
                          }}
                          aria-label={`Quick win: ${qw.guestName} — ${qw.actionNeeded}`}
                        >
                          <span className="gst-pipeline__quickwin-name">{qw.guestName}</span>
                          <span className="gst-pipeline__quickwin-action">{qw.actionNeeded}</span>
                          <span className="gst-pipeline__quickwin-impact">
                            +{qw.estimatedImpact}% impacto
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}