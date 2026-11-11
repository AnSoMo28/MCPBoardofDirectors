// src/features/engagement/components/EngagementTrajectoryNavigator.tsx
// ═══════════════════════════════════════════════════════════
// "Trajectory Navigator" — Scatter Plot 4-Quadrant View
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE of V1. Eliminates:
//   - recharts (ScatterChart, ResponsiveContainer, etc.)
//   - framer-motion (motion)
//   - Tailwind inline classes
//   - cn() utility
//   - useReducedMotion hook
//   - useBreakpoint hook
//   - chartTheme imports (CHART, TOOLTIP_STYLE, AXIS_TICK, CHART_PALETTE)
//
// Replaces with:
//   - Pure SVG scatter plot
//   - CSS keyframes
//   - CSS @media queries
//   - Co-located CSS file
//   - CSS custom properties for colors
//
// Verified against types.ts:
//   EngagementDashboardFamily: { family_id, family_name, engagement_score,
//     engagement_level, trend, trend_pct, last_activity_label, visits_30d,
//     wellness_active, nps_contribution }
//   EngagementVelocity: { current_score, score_30d, score_60d,
//     velocity_per_week, acceleration, trajectory, projection_90d,
//     projection_range }
//   AnomalyFamily: { familyId, familyName, anomalyType, deviation,
//     description, relatedFamilies, confidence }
//
// Glass namespace: glass-eng-trajectory
// Data attributes: data-mode (scatter | list)
// Rules: R34, R35, R38, #1 (tokens), #3 (chartTheme equivalent),
//        #18 (reduced motion), #62 (type verification)
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Radar,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type {
  EngagementDashboardFamily,
  EngagementVelocity,
  AnomalyFamily,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementTrajectoryNavigator.css";


// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const SVG_W = 500;
const SVG_H = 320;
const PLOT = { left: 55, top: 15, right: 490, bottom: 295 };
const PLOT_W = PLOT.right - PLOT.left;
const PLOT_H = PLOT.bottom - PLOT.top;
const X_DIVIDER = 50;  // score threshold

const X_TICKS = [0, 25, 50, 75, 100];

type Quadrant = "champion" | "recovering" | "at_risk" | "dormant";

const QUADRANT_CONFIG: Record<
  Quadrant,
  { label: string; color: string; bgColor: string }
> = {
  champion: {
    label: "Champions",
    color: "var(--color-emerald-400)",
    bgColor: "rgba(61,170,112,0.06)",
  },
  recovering: {
    label: "Recuperando",
    color: "var(--color-teal-400)",
    bgColor: "rgba(42,154,181,0.06)",
  },
  at_risk: {
    label: "En Riesgo",
    color: "var(--color-amber-400)",
    bgColor: "rgba(212,168,64,0.06)",
  },
  dormant: {
    label: "Dormidos",
    color: "var(--color-silver-500)",
    bgColor: "rgba(92,105,120,0.06)",
  },
};

const QUADRANT_ORDER: Quadrant[] = ["at_risk", "recovering", "dormant", "champion"];


// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function getLevelColor(level: string): string {
  const map: Record<string, string> = {
    champion: "var(--color-emerald-400)",
    loyal: "var(--color-sage-400)",
    active: "var(--color-teal-400)",
    warm: "var(--color-gold-400)",
    cooling: "var(--color-amber-400)",
    at_risk: "var(--color-terracotta-400)",
    inactive: "var(--color-silver-500)",
    thriving: "var(--color-emerald-400)",
    moderate: "var(--color-gold-400)",
    dormant: "var(--color-silver-500)",
  };
  return (map as Record<string, string>)[level] ?? "var(--color-silver-400)";
}

function classifyQuadrant(score: number, vel: number): Quadrant {
  if (score >= X_DIVIDER && vel >= 0) return "champion";
  if (score < X_DIVIDER && vel > 0) return "recovering";
  if (score >= X_DIVIDER && vel < 0) return "at_risk";
  return "dormant";
}

interface TrajectoryPoint {
  family_id: string;
  family_name: string;
  score: number;
  velocity: number;
  quadrant: Quadrant;
  level: string;
  trend_pct: number;
  isAnomaly: boolean;
}

function buildPoints(
  families: EngagementDashboardFamily[],
  anomalySet: Set<string>,
): TrajectoryPoint[] {
  return families.map((f: EngagementDashboardFamily) => {
    const velocityWk = Math.round((f.trend_pct / 4.33) * 100) / 100;
    return {
      family_id: f.family_id,
      family_name: f.family_name,
      score: f.engagement_score,
      velocity: velocityWk,
      quadrant: classifyQuadrant(f.engagement_score, velocityWk),
      level: f.engagement_level,
      trend_pct: f.trend_pct,
      isAnomaly: anomalySet.has(f.family_id),
    };
  });
}

/** Scale chart X (0–100) to SVG X */
function scaleX(score: number): number {
  return PLOT.left + (score / 100) * PLOT_W;
}

/** Scale chart Y (velocity) to SVG Y (inverted) */
function scaleY(vel: number, yMin: number, yMax: number): number {
  if (yMax === yMin) return PLOT.top + PLOT_H / 2;
  const norm = (vel - yMin) / (yMax - yMin);
  return PLOT.bottom - norm * PLOT_H;
}

/** Generate ~5 evenly-spaced Y axis ticks */
function computeYTicks(yMin: number, yMax: number): number[] {
  const count = 5;
  const ticks: number[] = [];
  for (let i = 0; i <= count; i++) {
    ticks.push(
      Math.round((yMin + (i / count) * (yMax - yMin)) * 10) / 10,
    );
  }
  return ticks;
}


// ══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Scatter Tooltip
// ══════════════════════════════════════════════════════════════

function ScatterTooltip({
  point,
  svgX,
  svgY,
}: {
  point: TrajectoryPoint;
  svgX: number;
  svgY: number;
}) {
  const leftPct = (svgX / SVG_W) * 100;
  const topPct = (svgY / SVG_H) * 100;
  const qCfg = QUADRANT_CONFIG[point.quadrant];
  const dotColor = getLevelColor(point.level);
  const TrajIcon =
    point.velocity > 0 ? TrendingUp : point.velocity < 0 ? TrendingDown : Minus;

  return (
    <div
      className="eng-traj__tooltip"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
      }}
    >
      <p className="eng-traj__tooltip-name">{point.family_name}</p>
      <div className="eng-traj__tooltip-rows">
        <div className="eng-traj__tooltip-row">
          <span>Score</span>
          <span className="eng-traj__tooltip-mono">{point.score}</span>
        </div>
        <div className="eng-traj__tooltip-row">
          <span>Velocity</span>
          <span className="eng-traj__tooltip-mono" style={{ color: dotColor }}>
            <TrajIcon size={10} />
            {point.velocity >= 0 ? "+" : ""}
            {point.velocity}/sem
          </span>
        </div>
        <div className="eng-traj__tooltip-row">
          <span>Cuadrante</span>
          <span style={{ color: qCfg.color }}>{qCfg.label}</span>
        </div>
        {point.isAnomaly && (
          <div className="eng-traj__tooltip-row">
            <span>Anomalía</span>
            <span className="eng-traj__tooltip-anomaly">detectada</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// SUB-COMPONENT: Mobile Quadrant List
// ══════════════════════════════════════════════════════════════

function MobileQuadrantList({
  points,
  onNavigate,
}: {
  points: TrajectoryPoint[];
  onNavigate?: (familyId: string) => void;
}) {
  const grouped = useMemo(() => {
    const groups: Record<Quadrant, TrajectoryPoint[]> = {
      at_risk: [],
      recovering: [],
      dormant: [],
      champion: [],
    };
    for (const p of points) {
      groups[p.quadrant].push(p);
    }
    // Sort each group by score descending
    for (const q of QUADRANT_ORDER) {
      groups[q].sort(
        (a: TrajectoryPoint, b: TrajectoryPoint) => b.score - a.score,
      );
    }
    return groups;
  }, [points]);

  return (
    <div className="eng-traj__mobile-list">
      {QUADRANT_ORDER.map((q: Quadrant) => {
        const families = grouped[q];
        if (families.length === 0) return null;
        const cfg = QUADRANT_CONFIG[q];

        return (
          <div key={q} className="eng-traj__mobile-group">
            <div className="eng-traj__mobile-group-header">
              <span
                className="eng-traj__mobile-group-dot"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="eng-traj__mobile-group-label">{cfg.label}</span>
              <span className="eng-traj__mobile-group-count">
                ({families.length})
              </span>
            </div>
            <div className="eng-traj__mobile-group-items">
              {families.slice(0, 5).map((p: TrajectoryPoint) => {
                const dotColor = getLevelColor(p.level);
                const TrajIcon =
                  p.velocity > 0
                    ? TrendingUp
                    : p.velocity < 0
                      ? TrendingDown
                      : Minus;

                return (
                  <Button
                    variant="unstyled"
                    key={p.family_id}
                    type="button"
                    className="eng-traj__mobile-item"
                    onClick={() => onNavigate?.(p.family_id)}
                  >
                    <div className="eng-traj__mobile-item-body">
                      <p className="eng-traj__mobile-item-name">
                        {p.family_name}
                      </p>
                      <p className="eng-traj__mobile-item-meta">
                        Score {p.score} ·{" "}
                        <TrajIcon size={10} style={{ color: dotColor }} />{" "}
                        {p.velocity >= 0 ? "+" : ""}
                        {p.velocity}/sem
                        {p.isAnomaly && " · ⚠ anomalía"}
                      </p>
                    </div>
                    <ChevronRight
                      size={14}
                      className="eng-traj__mobile-item-arrow"
                    />
                  </Button>
                );
              })}
              {families.length > 5 && (
                <p className="eng-traj__mobile-more">
                  +{families.length - 5} más
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════

interface EngagementTrajectoryNavigatorProps {
  families: EngagementDashboardFamily[];
  velocity: EngagementVelocity | null;
  anomalyFamilies?: AnomalyFamily[];
  onNavigate?: (familyId: string) => void;
}

/**
 * "Trajectory Navigator" — scatter plot 4-quadrant view.
 *
 * X = engagement score (0-100), Y = velocity per week.
 * 4 quadrants: Champion, Recovering, At Risk, Dormant.
 * Anomaly families rendered as diamond markers with glow.
 * Mobile: ranked list grouped by quadrant.
 */
export function EngagementTrajectoryNavigator({ families, anomalyFamilies, onNavigate }: EngagementTrajectoryNavigatorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 640px)").matches
      : false,
  );

  // Listen for breakpoint changes
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Anomaly lookup set
  const anomalySet = useMemo(() => {
    const s = new Set<string>();
    if (anomalyFamilies) {
      for (const a of anomalyFamilies) s.add(a.familyId);
    }
    return s;
  }, [anomalyFamilies]);

  // Build trajectory points
  const points = useMemo(
    () => buildPoints(families, anomalySet),
    [families, anomalySet],
  );

  // Y axis range (always includes 0)
  const yRange = useMemo(() => {
    if (points.length === 0) return { min: -5, max: 5 };
    const velocities = points.map((p: TrajectoryPoint) => p.velocity);
    let min = Math.min(...velocities, 0);
    let max = Math.max(...velocities, 0);
    const padding = Math.max((max - min) * 0.15, 1);
    return {
      min: Math.round((min - padding) * 10) / 10,
      max: Math.round((max + padding) * 10) / 10,
    };
  }, [points]);

  // Y axis ticks
  const yTicks = useMemo(
    () => computeYTicks(yRange.min, yRange.max),
    [yRange],
  );

  // Quadrant counts
  const quadrantCounts = useMemo(() => {
    const counts: Record<Quadrant, number> = {
      champion: 0,
      recovering: 0,
      at_risk: 0,
      dormant: 0,
    };
    for (const p of points) counts[p.quadrant]++;
    return counts;
  }, [points]);

  // Hovered point data
  const hoveredPoint = useMemo(
    () => points.find((p: TrajectoryPoint) => p.family_id === hoveredId) ?? null,
    [points, hoveredId],
  );

  // SVG coords of hovered point (for tooltip positioning)
  const hoveredSvg = useMemo(() => {
    if (!hoveredPoint) return null;
    return {
      x: scaleX(hoveredPoint.score),
      y: scaleY(hoveredPoint.velocity, yRange.min, yRange.max),
    };
  }, [hoveredPoint, yRange]);

  // Quadrant fill rectangles
  const xDividerSvg = scaleX(X_DIVIDER);
  const yZeroSvg = scaleY(0, yRange.min, yRange.max);

  // Click handler
  const handleClick = useCallback(
    (familyId: string) => {
      onNavigate?.(familyId);
    },
    [onNavigate],
  );

  // Empty state
  if (families.length === 0) {
    return (
      <div data-glass-eng-trajectory="" className="eng-traj">
        <div className="eng-traj__header">
          <Radar size={16} className="eng-traj__header-icon" />
          <h3 className="eng-traj__title">Mapa de Trayectoria</h3>
        </div>
        <EmptyState
          title="Sin datos de trayectoria"
          description="El mapa se renderizará cuando haya familias con datos de engagement."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Actualizar
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-glass-eng-trajectory=""
      data-mode={isMobile ? "list" : "scatter"}
      className="eng-traj"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-traj__header">
        <Radar size={16} className="eng-traj__header-icon" />
        <h3 className="eng-traj__title">Mapa de Trayectoria</h3>
        <span className="eng-traj__subtitle">
          Score vs velocidad · {points.length} familias
        </span>
      </div>

      {/* ── Scatter View (desktop) ───────────────────────────── */}
      {!isMobile && (
        <div className="eng-traj__scatter-view">
          <div className="eng-traj__chart-container">
            {/* Quadrant background fills */}
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width="100%"
              height="100%"
              className="eng-traj__chart-svg"
              role="img"
              aria-label={`Mapa de trayectoria con ${points.length} familias en 4 cuadrantes`}
            >
              <defs>
                <filter
                  id="eng-traj-glow"
                  x="-100%"
                  y="-100%"
                  width="300%"
                  height="300%"
                >
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ── Quadrant fills ────────────────────────────── */}
              {/* Champion: right, above zero */}
              <rect
                x={xDividerSvg}
                y={PLOT.top}
                width={PLOT.right - xDividerSvg}
                height={Math.max(0, yZeroSvg - PLOT.top)}
                fill={QUADRANT_CONFIG.champion.bgColor}
              />
              {/* Recovering: left, above zero */}
              <rect
                x={PLOT.left}
                y={PLOT.top}
                width={xDividerSvg - PLOT.left}
                height={Math.max(0, yZeroSvg - PLOT.top)}
                fill={QUADRANT_CONFIG.recovering.bgColor}
              />
              {/* At Risk: right, below zero */}
              <rect
                x={xDividerSvg}
                y={yZeroSvg}
                width={PLOT.right - xDividerSvg}
                height={Math.max(0, PLOT.bottom - yZeroSvg)}
                fill={QUADRANT_CONFIG.at_risk.bgColor}
              />
              {/* Dormant: left, below zero */}
              <rect
                x={PLOT.left}
                y={yZeroSvg}
                width={xDividerSvg - PLOT.left}
                height={Math.max(0, PLOT.bottom - yZeroSvg)}
                fill={QUADRANT_CONFIG.dormant.bgColor}
              />

              {/* ── Grid lines ────────────────────────────────── */}
              {X_TICKS.map((tick: number) => {
                const x = scaleX(tick);
                return (
                  <line
                    key={`xg-${tick}`}
                    x1={x}
                    y1={PLOT.top}
                    x2={x}
                    y2={PLOT.bottom}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={0.5}
                  />
                );
              })}
              {yTicks.map((tick: number) => {
                const y = scaleY(tick, yRange.min, yRange.max);
                return (
                  <line
                    key={`yg-${tick}`}
                    x1={PLOT.left}
                    y1={y}
                    x2={PLOT.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth={0.5}
                  />
                );
              })}

              {/* ── Reference lines ───────────────────────────── */}
              {/* X = 50 divider */}
              <line
                x1={xDividerSvg}
                y1={PLOT.top}
                x2={xDividerSvg}
                y2={PLOT.bottom}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="6 3"
              />
              {/* Y = 0 line */}
              <line
                x1={PLOT.left}
                y1={yZeroSvg}
                x2={PLOT.right}
                y2={yZeroSvg}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="6 3"
              />

              {/* ── X Axis ticks + labels ─────────────────────── */}
              {X_TICKS.map((tick: number) => {
                const x = scaleX(tick);
                return (
                  <text
                    key={`xl-${tick}`}
                    x={x}
                    y={PLOT.bottom + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--color-silver-500)"
                    fontFamily="var(--font-mono, 'DM Mono', monospace)"
                  >
                    {tick}
                  </text>
                );
              })}
              {/* X Axis label */}
              <text
                x={PLOT.left + PLOT_W / 2}
                y={PLOT.bottom + 30}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-silver-400)"
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
              >
                Engagement Score
              </text>

              {/* ── Y Axis ticks + labels ─────────────────────── */}
              {yTicks.map((tick: number) => {
                const y = scaleY(tick, yRange.min, yRange.max);
                return (
                  <text
                    key={`yl-${tick}`}
                    x={PLOT.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={9}
                    fill="var(--color-silver-500)"
                    fontFamily="var(--font-mono, 'DM Mono', monospace)"
                  >
                    {tick}
                  </text>
                );
              })}
              {/* Y Axis label (rotated) */}
              <text
                x={14}
                y={PLOT.top + PLOT_H / 2}
                textAnchor="middle"
                fontSize={10}
                fill="var(--color-silver-400)"
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                transform={`rotate(-90, 14, ${PLOT.top + PLOT_H / 2})`}
              >
                Velocity/sem
              </text>

              {/* ── Quadrant labels ───────────────────────────── */}
              <text
                x={xDividerSvg + (PLOT.right - xDividerSvg) / 2}
                y={PLOT.top + 16}
                textAnchor="middle"
                fontSize={9}
                fill={QUADRANT_CONFIG.champion.color}
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                fontWeight="600"
                opacity={0.5}
              >
                Champions
              </text>
              <text
                x={PLOT.left + (xDividerSvg - PLOT.left) / 2}
                y={PLOT.top + 16}
                textAnchor="middle"
                fontSize={9}
                fill={QUADRANT_CONFIG.recovering.color}
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                fontWeight="600"
                opacity={0.5}
              >
                Recuperando
              </text>
              <text
                x={xDividerSvg + (PLOT.right - xDividerSvg) / 2}
                y={PLOT.bottom - 8}
                textAnchor="middle"
                fontSize={9}
                fill={QUADRANT_CONFIG.at_risk.color}
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                fontWeight="600"
                opacity={0.5}
              >
                En Riesgo
              </text>
              <text
                x={PLOT.left + (xDividerSvg - PLOT.left) / 2}
                y={PLOT.bottom - 8}
                textAnchor="middle"
                fontSize={9}
                fill={QUADRANT_CONFIG.dormant.color}
                fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                fontWeight="600"
                opacity={0.5}
              >
                Dormidos
              </text>

              {/* ── Data points ───────────────────────────────── */}
              {points.map((p: TrajectoryPoint) => {
                const cx = scaleX(p.score);
                const cy = scaleY(p.velocity, yRange.min, yRange.max);
                const isHovered = hoveredId === p.family_id;
                const dotColor = getLevelColor(p.level);
                const r = isHovered ? 7 : 5;

                if (p.isAnomaly) {
                  // Diamond marker for anomalies
                  const s = isHovered ? 9 : 7;
                  return (
                    <polygon
                      key={p.family_id}
                      points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                      fill={dotColor}
                      fillOpacity={isHovered ? 0.9 : 0.7}
                      stroke="var(--color-rose-400)"
                      strokeWidth={isHovered ? 2 : 1.5}
                      filter="url(#eng-traj-glow)"
                      className="eng-traj__dot"
                      onMouseEnter={() => setHoveredId(p.family_id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleClick(p.family_id)}
                    />
                  );
                }

                return (
                  <circle
                    key={p.family_id}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={dotColor}
                    fillOpacity={isHovered ? 0.9 : 0.55}
                    stroke={isHovered ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}
                    strokeWidth={isHovered ? 2 : 1}
                    className="eng-traj__dot"
                    onMouseEnter={() => setHoveredId(p.family_id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleClick(p.family_id)}
                  />
                );
              })}
            </svg>

            {/* ── Tooltip (HTML overlay) ──────────────────────── */}
            {hoveredPoint && hoveredSvg && (
              <ScatterTooltip
                point={hoveredPoint}
                svgX={hoveredSvg.x}
                svgY={hoveredSvg.y}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Mobile List View ─────────────────────────────────── */}
      {isMobile && (
        <MobileQuadrantList points={points} onNavigate={onNavigate} />
      )}

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="eng-traj__legend">
        {QUADRANT_ORDER.map((q: Quadrant) => {
          const cfg = QUADRANT_CONFIG[q];
          const count = quadrantCounts[q];
          return (
            <div key={q} className="eng-traj__legend-item">
              <span
                className="eng-traj__legend-dot"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="eng-traj__legend-label">{cfg.label}:</span>
              <span className="eng-traj__legend-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}