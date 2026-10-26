// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestPipelineRiver.tsx
// Phase 34 "The Gateway" — Capa 3: Organic Pipeline
// Level 6+ Agency · Production Grade
//
// SVG river visualization of the guest pipeline.
// Width at each stage = proportional to guest count.
// River narrows where guests drop off.
//
// Depends on: PipelineEcosystem (types.ts §9)
// Budget: <150 SVG DOM nodes
// Checklist: TSX-1-39, CSS-1-40, D3.13, D4.1-13
//
// PRE-WRITURE VERIFICATION:
//   PipelineEcosystem { stages, flows, bottlenecks, quickWins,
//     forecasts, health(number), velocity, totalGuests,
//     pipelineValue, computedAt } — types.ts §9 ✅
//   EnrichedPipelineStage { id, label, count, rate, benchmark,
//     vsBenchmark, avgDays, color, trend } — types.ts §9 ✅
//   Bottleneck { stageId, stageLabel, stuckCount, avgDaysStuck,
//     severity, cause } — types.ts §9 ✅
//   QuickWin { guestId, guestName, currentStage, actionNeeded,
//     estimatedImpact, confidence } — types.ts §9 ✅
//   StageFlow { fromStage, toStage, count, velocity,
//     trend } — types.ts §9 ✅
//   GuestPipelineStage = "registered"|"first_visit"|"trial_active"|
//     "ready"|"converted"|"dormant" — types.ts §9 ✅
//   PipelineStageDef { id, label, labelKey, step, color,
//     description, ariaLabel } — config.ts §5 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useId } from "react";

import type {
  PipelineEcosystem,
  EnrichedPipelineStage,
  GuestPipelineStage,
  Bottleneck,
} from "../types";
import "./GuestPipelineRiver.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestPipelineRiverProps {
  /** Pipeline ecosystem from the engine. null → empty state. */
  readonly pipeline: PipelineEcosystem | null;
  /** Called when user clicks a stage node. */
  readonly onStageClick?: (stageId: GuestPipelineStage) => void;
}

interface StagePosition {
  readonly x: number;
  readonly topY: number;
  readonly bottomY: number;
  readonly nodeR: number;
}

interface LayoutData {
  readonly positions: readonly StagePosition[];
  readonly riverPath: string;
  readonly centerPath: string;
  readonly maxCount: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — LAYOUT CONSTANTS
// ═══════════════════════════════════════════════════════════

const VIEWBOX_W = 900;
const VIEWBOX_H = 260;
const PADDING = 64;
const CENTER_Y = VIEWBOX_H / 2;
const MAX_RIVER_HALF = VIEWBOX_H * 0.34;
const MIN_RIVER_HALF = VIEWBOX_H * 0.06;
const NODE_R_MIN = 16;
const NODE_R_MAX = 30;

// ═══════════════════════════════════════════════════════════
// §3 — DERIVED HELPERS
// Pure functions that derive display data from pipeline types.
// All field accesses verified against types.ts §9.
// ═══════════════════════════════════════════════════════════

/** Derive health level string from numeric health score. */
function deriveHealthLevel(health: number): string {
  if (health >= 85) return "excellent";
  if (health >= 70) return "good";
  if (health >= 50) return "attention";
  if (health >= 30) return "warning";
  return "critical";
}

/** Build a Set of stage IDs that are bottlenecks. */
function buildBottleneckSet(bottlenecks: readonly Bottleneck[]): Set<GuestPipelineStage> {
  return new Set(bottlenecks.map((b) => b.stageId));
}

/** Count quick wins at a specific stage. */
function countQuickWinsAtStage(
  stageId: GuestPipelineStage,
  pipeline: PipelineEcosystem,
): number {
  return pipeline.quickWins.filter((qw) => qw.currentStage === stageId).length;
}

/** Get trend symbol for display. */
function trendSymbol(trend: EnrichedPipelineStage["trend"]): string {
  switch (trend) {
    case "improving":
      return "↑";
    case "declining":
      return "↓";
    case "stable":
      return "→";
    default: {
      const _exhaustive: never = trend;
      return _exhaustive;
    }
  }
}

/** Get human-readable trend label. */
function trendLabel(trend: EnrichedPipelineStage["trend"]): string {
  switch (trend) {
    case "improving":
      return "Mejorando";
    case "declining":
      return "Bajando";
    case "stable":
      return "Estable";
    default: {
      const _exhaustive: never = trend;
      return _exhaustive;
    }
  }
}

/** Filter and sort stages for main flow (excludes dormant with step=-1). */
function getFlowStages(
  stages: readonly EnrichedPipelineStage[],
): readonly EnrichedPipelineStage[] {
  const orderedIds: GuestPipelineStage[] = [
    "registered",
    "first_visit",
    "trial_active",
    "ready",
    "converted",
  ];

  return orderedIds
    .map((id) => stages.find((s) => s.id === id))
    .filter((s): s is EnrichedPipelineStage => s !== undefined);
}

// ═══════════════════════════════════════════════════════════
// §4 — PATH COMPUTATION
// Builds SVG path data for the river shape and center flow line.
// River uses cubic bezier curves for smooth organic transitions.
//
// Field accesses:
//   stage.count → EnrichedPipelineStage.count (number) ✅
// ═══════════════════════════════════════════════════════════

function computeLayout(
  stages: readonly EnrichedPipelineStage[],
): LayoutData | null {
  const n = stages.length;
  if (n === 0) return null;

  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const stepX = (VIEWBOX_W - 2 * PADDING) / Math.max(n - 1, 1);

  const positions: StagePosition[] = stages.map((stage, i) => {
    const x = PADDING + i * stepX;
    const ratio = stage.count / maxCount;
    const halfH = MIN_RIVER_HALF + ratio * (MAX_RIVER_HALF - MIN_RIVER_HALF);
    const nodeR = NODE_R_MIN + ratio * (NODE_R_MAX - NODE_R_MIN);
    return { x, topY: CENTER_Y - halfH, bottomY: CENTER_Y + halfH, nodeR };
  });

  // ── Top edge (left → right, smooth cubic bezier) ──
  let top = `M ${positions[0].x} ${positions[0].topY}`;
  for (let i = 1; i < n; i++) {
    const cpX = (positions[i - 1].x + positions[i].x) / 2;
    top += ` C ${cpX} ${positions[i - 1].topY} ${cpX} ${positions[i].topY} ${positions[i].x} ${positions[i].topY}`;
  }

  // ── Bottom edge (right → left, smooth cubic bezier) ──
  let bottom = `L ${positions[n - 1].x} ${positions[n - 1].bottomY}`;
  for (let i = n - 2; i >= 0; i--) {
    const cpX = (positions[i].x + positions[i + 1].x) / 2;
    bottom += ` C ${cpX} ${positions[i + 1].bottomY} ${cpX} ${positions[i].bottomY} ${positions[i].x} ${positions[i].bottomY}`;
  }

  const riverPath = `${top} ${bottom} Z`;

  // ── Center flow line ──
  const centerParts = positions.map((p, i) =>
    i === 0 ? `M ${p.x} ${CENTER_Y}` : `L ${p.x} ${CENTER_Y}`,
  );
  const centerPath = centerParts.join(" ");

  return { positions, riverPath, centerPath, maxCount };
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Organic pipeline river visualization.
 * Shows guest flow through pipeline stages as a river
 * that narrows where guests drop off.
 *
 * Field accesses verified:
 *   pipeline.health → number ✅
 *   pipeline.velocity → number ✅
 *   pipeline.totalGuests → number ✅
 *   pipeline.stages → readonly EnrichedPipelineStage[] ✅
 *   pipeline.flows → readonly StageFlow[] ✅
 *   pipeline.bottlenecks → readonly Bottleneck[] ✅
 *   pipeline.quickWins → readonly QuickWin[] ✅
 *   stage.id → GuestPipelineStage ✅
 *   stage.label → string ✅
 *   stage.count → number ✅
 *   stage.rate → number (conversion rate 0-100) ✅
 *   stage.vsBenchmark → number ✅
 *   stage.avgDays → number ✅
 *   stage.trend → "improving"|"stable"|"declining" ✅
 *   bottleneck.stageId → GuestPipelineStage ✅
 *   bottleneck.stageLabel → string ✅
 *   bottleneck.severity → "critical"|"high"|"medium"|"low" ✅
 *   bottleneck.cause → string ✅
 *   bottleneck.stuckCount → number ✅
 *   bottleneck.avgDaysStuck → number ✅
 *
 * @example
 * <GuestPipelineRiver
 *   pipeline={dashboard.engines.pipeline}
 *   onStageClick={(id) => navigateToStage(id)}
 * />
 */
export function GuestPipelineRiver({
  pipeline,
  onStageClick,
}: GuestPipelineRiverProps) {
  const [hoveredStageId, setHoveredStageId] = useState<GuestPipelineStage | null>(null);
  const gradientId = useId();

  // ── Filter to main flow stages (exclude dormant) and compute layout ──
  const flowStages = useMemo(
    () => (pipeline ? getFlowStages(pipeline.stages) : []),
    [pipeline],
  );

  const layout = useMemo(
    () => (flowStages.length > 0 ? computeLayout(flowStages) : null),
    [flowStages],
  );

  // ── Derived lookups ──
  const bottleneckSet = useMemo(
    () => (pipeline ? buildBottleneckSet(pipeline.bottlenecks) : new Set<GuestPipelineStage>()),
    [pipeline],
  );

  const healthLevel = useMemo(
    () => deriveHealthLevel(pipeline?.health ?? 0),
    [pipeline?.health],
  );

  // ── Hovered stage data (from pipeline.stages, not flowStages, to include all) ──
  const hoveredStage: EnrichedPipelineStage | null = useMemo(
    () => {
      if (!hoveredStageId || !pipeline) return null;
      return pipeline.stages.find((s) => s.id === hoveredStageId) ?? null;
    },
    [hoveredStageId, pipeline],
  );

  // ── Bottleneck detail for hovered stage ──
  const bottleneckDetail: Bottleneck | null = useMemo(
    () => {
      if (!hoveredStageId || !pipeline) return null;
      return pipeline.bottlenecks.find((b) => b.stageId === hoveredStageId) ?? null;
    },
    [hoveredStageId, pipeline],
  );

  // ── Quick win count for hovered stage ──
  const quickWinCount = useMemo(
    () => {
      if (!hoveredStageId || !pipeline) return 0;
      return countQuickWinsAtStage(hoveredStageId, pipeline);
    },
    [hoveredStageId, pipeline],
  );

  // ── Converted stage count (for "Conversiones" metric) ──
  const convertedCount = useMemo(
    () => {
      if (!pipeline) return 0;
      const converted = pipeline.stages.find((s) => s.id === "converted");
      return converted?.count ?? 0;
    },
    [pipeline],
  );

  // ── Empty state ──
  if (!pipeline || !layout || flowStages.length === 0) {
    return (
      <div
        className="gst-river"
        data-state="empty"
        role="region"
        aria-label="Pipeline de invitados"
      >
        <p className="gst-river__empty-text">
          No hay datos del pipeline disponibles.
        </p>
      </div>
    );
  }

  const { positions, riverPath, centerPath } = layout;

  return (
    <div
      className="gst-river"
      data-state="data"
      role="region"
      aria-label="Pipeline de invitados"
      data-testid="guest-pipeline-river"
    >
      {/* ── Header: Health Score + Flow Metrics ── */}
      <div className="gst-river__header">
        <div className="gst-river__health" data-level={healthLevel}>
          <span className="gst-river__health-score">{pipeline.health}</span>
          <span className="gst-river__health-label">Salud del pipeline</span>
        </div>

        <div className="gst-river__metrics">
          <div className="gst-river__metric">
            <span className="gst-river__metric-value">{pipeline.totalGuests}</span>
            <span className="gst-river__metric-label">Invitados</span>
          </div>
          <div className="gst-river__metric">
            <span className="gst-river__metric-value">{convertedCount}</span>
            <span className="gst-river__metric-label">Conversiones</span>
          </div>
          <div className="gst-river__metric">
            <span className="gst-river__metric-value">{pipeline.velocity}</span>
            <span className="gst-river__metric-label">Velocidad (días)</span>
          </div>
        </div>
      </div>

      {/* ── SVG River ── */}
      <svg
        className="gst-river__svg"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Pipeline con ${flowStages.length} etapas. ${
          pipeline.bottlenecks.length > 0
            ? `${pipeline.bottlenecks.length} bloqueo(s) detectado(s).`
            : "Sin bloqueos."
        }`}
      >
        {/* Gradient definitions — unique ID via useId() */}
        <defs>
          <linearGradient id={`${gradientId}-fill`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="gst-river__grad-start" />
            <stop offset="100%" className="gst-river__grad-end" />
          </linearGradient>
        </defs>

        {/* River body */}
        <path
          d={riverPath}
          className="gst-river__fill"
          fill={`url(#${gradientId}-fill)`}
        />

        {/* Center flow line with dash animation */}
        <path
          d={centerPath}
          className="gst-river__flow-line"
          fill="none"
        />

        {/* Stage nodes */}
        {flowStages.map((stage) => {
          const pos = positions[flowStages.indexOf(stage)];
          if (!pos) return null;

          const isBottleneck = bottleneckSet.has(stage.id);
          const qwCount = countQuickWinsAtStage(stage.id, pipeline);

          return (
            <g
              key={stage.id}
              className="gst-river__node"
              data-bottleneck={isBottleneck}
              data-quickwin={qwCount > 0}
              data-trend={stage.trend}
              onMouseEnter={() => setHoveredStageId(stage.id)}
              onMouseLeave={() => setHoveredStageId(null)}
              onClick={() => onStageClick?.(stage.id)}
              tabIndex={0}
              role="button"
              aria-label={`${stage.label}: ${stage.count} invitados, tendencia ${trendLabel(stage.trend)}`}
              data-testid={`pipeline-stage-${stage.id}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStageClick?.(stage.id);
                }
              }}
            >
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={CENTER_Y}
                r={pos.nodeR}
                className="gst-river__node-circle"
              />

              {/* Count */}
              <text
                x={pos.x}
                y={CENTER_Y}
                className="gst-river__node-count"
                textAnchor="middle"
                dy="-2"
              >
                {stage.count}
              </text>

              {/* Label */}
              <text
                x={pos.x}
                y={CENTER_Y}
                className="gst-river__node-label"
                textAnchor="middle"
                dy="14"
              >
                {stage.label}
              </text>

              {/* Trend arrow */}
              <text
                x={pos.x + pos.nodeR + 4}
                y={CENTER_Y - pos.nodeR + 6}
                className="gst-river__node-trend"
                aria-hidden="true"
              >
                {trendSymbol(stage.trend)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Stage Detail Panel (on hover) ── */}
      {hoveredStage && (
        <div
          className="gst-river__detail"
          data-bottleneck={bottleneckDetail !== null}
          data-quickwin={quickWinCount > 0}
          role="region"
          aria-label={`Detalle de ${hoveredStage.label}`}
          data-testid="pipeline-stage-detail"
        >
          <div className="gst-river__detail-header">
            <h4 className="gst-river__detail-title">{hoveredStage.label}</h4>
            <span className="gst-river__detail-count">
              {hoveredStage.count} invitados
            </span>
          </div>

          <div className="gst-river__detail-stats">
            <div className="gst-river__detail-stat">
              <span className="gst-river__detail-stat-label">Conversión</span>
              <span className="gst-river__detail-stat-value">
                {hoveredStage.rate.toFixed(1)}%
              </span>
            </div>
            <div className="gst-river__detail-stat">
              <span className="gst-river__detail-stat-label">vs Benchmark</span>
              <span
                className="gst-river__detail-stat-value"
                data-positive={hoveredStage.vsBenchmark >= 0}
              >
                {hoveredStage.vsBenchmark >= 0 ? "+" : ""}
                {hoveredStage.vsBenchmark.toFixed(1)}%
              </span>
            </div>
            <div className="gst-river__detail-stat">
              <span className="gst-river__detail-stat-label">Días promedio</span>
              <span className="gst-river__detail-stat-value">
                {hoveredStage.avgDays}
              </span>
            </div>
            <div className="gst-river__detail-stat">
              <span className="gst-river__detail-stat-label">Tendencia</span>
              <span
                className="gst-river__detail-stat-value"
                data-trend={hoveredStage.trend}
              >
                {trendLabel(hoveredStage.trend)} {trendSymbol(hoveredStage.trend)}
              </span>
            </div>
          </div>

          {/* Bottleneck info */}
          {bottleneckDetail && (
            <div className="gst-river__detail-bottleneck">
              <p className="gst-river__detail-bottleneck-cause">
                <strong>Causa:</strong> {bottleneckDetail.cause}
              </p>
              <p className="gst-river__detail-bottleneck-stats">
                <strong>{bottleneckDetail.stuckCount}</strong> invitados atascados
                — <strong>{bottleneckDetail.avgDaysStuck}</strong> días promedio
                — Severidad: <strong>{bottleneckDetail.severity}</strong>
              </p>
            </div>
          )}

          {/* Quick win info */}
          {quickWinCount > 0 && (
            <p className="gst-river__detail-quickwin">
              {quickWinCount} quick win(s) en esta etapa — invitados a un paso de
              convertirse.
            </p>
          )}
        </div>
      )}
    </div>
  );
}