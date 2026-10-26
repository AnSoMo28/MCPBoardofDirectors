// src/features/communications/components/EmotionalTrajectory.tsx
// ═══════════════════════════════════════════════════════════
// Emotional Trajectory — The Arc of Feeling
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a line chart. A TRAJECTORY — the arc of a member's
// emotional journey, rendered as a standalone compact
// visualization that can embed in any panel.
//
// Visualizations:
//   1. Trajectory Arc — cardinal spline from history
//   2. Forecast Cone — 7d/30d projection with confidence
//   3. Trigger Markers — epicenter dots at impact points
//   4. Resonance Echoes — concentric rings at peak moments
//   5. Velocity Vector — directional arrow
//   6. Zone Bands — horizontal emotional zones
//
// Compact version of EmotionalField. Designed for embedding.
// Pure SVG + React. Zero external dependencies.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  EmotionalTrajectory as TrajectoryType,
  EmotionalDataPoint,
  EmotionalTrigger,
  EmotionalZone,
} from "../types";

import {
  deriveEmotionalZone,
  EMOTIONAL_ZONE_CONFIG,
} from "../types";

import "./EmotionalTrajectory.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface EmotionalTrajectoryProps {
  trajectory: TrajectoryType | null;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Normalize a 0-100 score to SVG Y coordinate. */
function scoreToY(
  score: number,
  baseY: number,
  amplitude: number,
): number {
  return baseY - (score / 100) * amplitude;
}

/** Build smooth SVG path from data points using cardinal spline. */
function buildCurvePath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function EmotionalTrajectory({
  trajectory,
  compact = false,
}: EmotionalTrajectoryProps) {

  // ── SVG dimensions ────────────────────────────────────
  const width = compact ? 280 : 480;
  const height = compact ? 120 : 200;
  const padX = compact ? 20 : 40;
  const padTop = compact ? 15 : 30;
  const padBottom = compact ? 25 : 40;
  const baseY = height - padBottom;
  const amplitude = height - padTop - padBottom;

  // ── Build points from history ─────────────────────────
  const fieldPoints = useMemo(() => {
    if (!trajectory || trajectory.history.length === 0) return [];

    const sorted = [...trajectory.history].sort(
      (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const usableWidth = width - padX * 2;
    const step = sorted.length > 1
      ? usableWidth / (sorted.length - 1)
      : 0;

    return sorted.map((dp: EmotionalDataPoint, i: number) => ({
      x: padX + i * step,
      y: scoreToY(dp.score, baseY, amplitude),
      score: dp.score,
      date: dp.date,
      zone: deriveEmotionalZone(dp.score),
    }));
  }, [trajectory, width, padX, baseY, amplitude]);

  // ── Curve path ────────────────────────────────────────
  const curvePath = useMemo(
    () =>
      buildCurvePath(
        fieldPoints.map((p: { x: number; y: number }) => ({
          x: p.x,
          y: p.y,
        })),
      ),
    [fieldPoints],
  );

  // ── Current point ─────────────────────────────────────
  const currentPoint = fieldPoints[fieldPoints.length - 1];
  const currentZone: EmotionalZone = trajectory
    ? deriveEmotionalZone(trajectory.current.score)
    : "stable";

  // ── Baseline ──────────────────────────────────────────
  const baselineScore = trajectory?.baseline.score ?? 65;
  const baselineY = scoreToY(baselineScore, baseY, amplitude);

  // ── Forecast ──────────────────────────────────────────
  const forecast7d = trajectory?.forecast.predicted_score_7d ?? 50;
  const forecast30d = trajectory?.forecast.predicted_score_30d ?? 50;
  const forecastY7d = scoreToY(forecast7d, baseY, amplitude);
  const forecastY30d = scoreToY(forecast30d, baseY, amplitude);
  const interventionWindow = trajectory?.forecast.intervention_window ?? false;
  const forecastConeWidth = compact ? 12 : 20;

  // ── Velocity ──────────────────────────────────────────
  const velocity = trajectory?.velocity ?? 0;
  const vectorLength = Math.min(
    compact ? 25 : 40,
    Math.abs(velocity) * 4,
  );
  const vectorDirection = velocity >= 0 ? -1 : 1;

  // ── Triggers ──────────────────────────────────────────
  const triggerPoints = useMemo(() => {
    if (!trajectory || fieldPoints.length === 0) return [];
    return trajectory.triggers
      .map((trigger: EmotionalTrigger, i: number) => {
        const pointIndex = Math.min(
          fieldPoints.length - 1,
          Math.max(
            0,
            Math.floor(
              (i / trajectory.triggers.length) * fieldPoints.length,
            ),
          ),
        );
        const point = fieldPoints[pointIndex];
        if (!point) return null;
        return {
          x: point.x,
          y: point.y,
          impact: trigger.impact,
          description: trigger.description,
          isPositive: trigger.impact >= 0,
        };
      })
      .filter(
        (
          tp: { x: number; y: number; impact: number; description: string; isPositive: boolean } | null,
        ): tp is {
          x: number;
          y: number;
          impact: number;
          description: string;
          isPositive: boolean;
        } => tp !== null,
      );
  }, [trajectory, fieldPoints]);

  // ── Resonance echoes ──────────────────────────────────
  const resonanceCount = trajectory?.resonance_events.length ?? 0;

  // ── Empty state ───────────────────────────────────────
  if (!trajectory || fieldPoints.length === 0) {
    return (
      <div
        className="glass-comm-trajectory"
        data-zone="stable"
        data-compact={compact}
      >
        <div className="trajectory__header">
          <span className="trajectory__title">Trayectoria Emocional</span>
        </div>
        <div className="trajectory__empty">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="trajectory__svg"
          >
            <line
              x1={padX}
              y1={baseY}
              x2={width - padX}
              y2={baseY}
              className="trajectory__baseline-empty"
            />
            <text
              x={width / 2}
              y={height / 2}
              className="trajectory__empty-text"
              textAnchor="middle"
            >
              Sin datos de trayectoria
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-trajectory"
      data-zone={currentZone}
      data-compact={compact}
      data-velocity={
        velocity > 2
          ? "ascending"
          : velocity < -2
            ? "descending"
            : "stable"
      }
      data-intervention={interventionWindow}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="trajectory__header">
        <span className="trajectory__title">Trayectoria Emocional</span>
        <div
          className="trajectory__zone-badge"
          data-zone={currentZone}
        >
          <span>{EMOTIONAL_ZONE_CONFIG[currentZone].label}</span>
          <span className="trajectory__score">
            {trajectory.current.score}/100
          </span>
        </div>
      </div>

      {/* ── SVG Trajectory ──────────────────────────── */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="trajectory__svg"
        role="img"
        aria-label={`Emotional trajectory: ${trajectory.history.length} points, currently ${EMOTIONAL_ZONE_CONFIG[currentZone].label}`}
      >
        <defs>
          {/* Area fill gradient */}
          <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              className="trajectory__fill-top"
              stopOpacity="0.2"
            />
            <stop
              offset="100%"
              className="trajectory__fill-bottom"
              stopOpacity="0.01"
            />
          </linearGradient>

          {/* Forecast cone gradient */}
          <linearGradient
            id="traj-forecast-fill"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop
              offset="0%"
              className="trajectory__forecast-stop"
              stopOpacity="0.1"
            />
            <stop
              offset="100%"
              className="trajectory__forecast-stop"
              stopOpacity="0.02"
            />
          </linearGradient>
        </defs>

        {/* Zone bands */}
        <rect
          x={padX}
          y={scoreToY(100, baseY, amplitude)}
          width={width - padX * 2}
          height={
            scoreToY(75, baseY, amplitude) -
            scoreToY(100, baseY, amplitude)
          }
          className="trajectory__zone-band"
          data-zone="thriving"
          opacity="0.05"
        />
        <rect
          x={padX}
          y={scoreToY(39, baseY, amplitude)}
          width={width - padX * 2}
          height={
            scoreToY(25, baseY, amplitude) -
            scoreToY(39, baseY, amplitude)
          }
          className="trajectory__zone-band"
          data-zone="at_risk"
          opacity="0.05"
        />
        <rect
          x={padX}
          y={scoreToY(24, baseY, amplitude)}
          width={width - padX * 2}
          height={
            scoreToY(0, baseY, amplitude) -
            scoreToY(24, baseY, amplitude)
          }
          className="trajectory__zone-band"
          data-zone="crisis"
          opacity="0.05"
        />

        {/* Baseline */}
        <line
          x1={padX}
          y1={baselineY}
          x2={width - padX}
          y2={baselineY}
          className="trajectory__baseline"
          strokeDasharray="6 4"
        />
        {!compact && (
          <text
            x={padX - 4}
            y={baselineY + 3}
            className="trajectory__baseline-label"
            textAnchor="end"
          >
            Base
          </text>
        )}

        {/* Forecast cone */}
        {currentPoint && (
          <polygon
            points={`
              ${currentPoint.x},${currentPoint.y}
              ${width - padX + (compact ? 8 : 15)},${forecastY7d - forecastConeWidth}
              ${width - padX + (compact ? 8 : 15)},${forecastY7d + forecastConeWidth}
            `}
            fill="url(#traj-forecast-fill)"
            className="trajectory__forecast-cone"
            data-intervention={interventionWindow}
          />
        )}

        {/* 30d forecast extension */}
        <line
          x1={width - padX + (compact ? 8 : 15)}
          y1={forecastY7d}
          x2={width - padX + (compact ? 18 : 35)}
          y2={forecastY30d}
          className="trajectory__forecast-line"
          strokeDasharray="4 3"
          data-intervention={interventionWindow}
        />
        {!compact && (
          <text
            x={width - padX + 37}
            y={forecastY30d + 3}
            className="trajectory__forecast-label"
          >
            30d
          </text>
        )}

        {/* Area fill under curve */}
        {fieldPoints.length > 1 && (
          <path
            d={`${curvePath} L ${fieldPoints[fieldPoints.length - 1].x} ${baseY} L ${fieldPoints[0].x} ${baseY} Z`}
            fill="url(#traj-fill)"
          />
        )}

        {/* Main curve */}
        <path
          d={curvePath}
          className="trajectory__curve"
          fill="none"
          data-zone={currentZone}
        />

        {/* Trigger epicenters */}
        {triggerPoints.map(
          (
            tp: {
              x: number;
              y: number;
              impact: number;
              description: string;
              isPositive: boolean;
            },
            i: number,
          ) => (
            <g key={`trigger-${i}`} className="trajectory__trigger">
              <circle
                cx={tp.x}
                cy={tp.y}
                r={compact ? 8 : 12}
                className="trajectory__trigger-ripple"
                data-positive={tp.isPositive}
              />
              <circle
                cx={tp.x}
                cy={tp.y}
                r={compact ? 2.5 : 4}
                className="trajectory__trigger-dot"
                data-positive={tp.isPositive}
              />
            </g>
          ),
        )}

        {/* Velocity vector */}
        {currentPoint && Math.abs(velocity) > 0.5 && (
          <line
            x1={currentPoint.x}
            y1={currentPoint.y}
            x2={currentPoint.x}
            y2={currentPoint.y + vectorDirection * vectorLength}
            className="trajectory__velocity"
            data-direction={velocity > 0 ? "up" : "down"}
            strokeLinecap="round"
          />
        )}

        {/* Current point */}
        {currentPoint && (
          <g className="trajectory__current-marker">
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={compact ? 5 : 7}
              className="trajectory__current-ring"
              data-zone={currentZone}
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={compact ? 2 : 3}
              className="trajectory__current-dot"
              data-zone={currentZone}
            />
          </g>
        )}

        {/* X-axis labels */}
        {fieldPoints.length > 0 && (
          <>
            <text
              x={fieldPoints[0].x}
              y={baseY + (compact ? 12 : 16)}
              className="trajectory__axis-label"
              textAnchor="start"
            >
              {new Date(fieldPoints[0].date).toLocaleDateString(
                "es-CR",
                { day: "numeric", month: "short" },
              )}
            </text>
            <text
              x={fieldPoints[fieldPoints.length - 1].x}
              y={baseY + (compact ? 12 : 16)}
              className="trajectory__axis-label"
              textAnchor="end"
            >
              Hoy
            </text>
          </>
        )}
      </svg>

      {/* ── Stats strip ─────────────────────────────── */}
      {!compact && (
        <div className="trajectory__stats">
          <div className="trajectory__stat">
            <span className="trajectory__stat-value">
              {velocity > 0 ? "+" : ""}
              {velocity.toFixed(1)}
            </span>
            <span className="trajectory__stat-label">
              Velocidad /sem
            </span>
          </div>
          <div className="trajectory__stat">
            <span className="trajectory__stat-value">
              {trajectory.forecast.predicted_score_7d}
            </span>
            <span className="trajectory__stat-label">
              Proyección 7d
            </span>
          </div>
          <div className="trajectory__stat">
            <span className="trajectory__stat-value">
              {trajectory.triggers.length}
            </span>
            <span className="trajectory__stat-label">Triggers</span>
          </div>
          <div className="trajectory__stat">
            <span className="trajectory__stat-value">
              {resonanceCount}
            </span>
            <span className="trajectory__stat-label">
              Resonancias
            </span>
          </div>
        </div>
      )}
    </div>
  );
}