// src/features/communications/components/EmotionalField.tsx
// ═══════════════════════════════════════════════════════════
// Emotional Field — The Electromagnetic Field of Emotion
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a chart. Not a line graph. A FIELD.
//
// The member's emotional state is visualized as a
// three-dimensional field where:
//   - The baseline is a surface
//   - Events create ripples that propagate outward
//   - Triggers are epicenters of impact
//   - The forecast is a cone of possibility
//   - Resonance echoes appear as concentric waves
//   - Velocity is a vector arrow
//
// Pure SVG. Zero dependencies beyond React + types.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  EmotionalTrajectory,
  EmotionalDataPoint,
  EmotionalTrigger,
  EmotionalZone,
} from "../types";

import {
  deriveEmotionalZone,
  EMOTIONAL_ZONE_CONFIG,
} from "../types";

import "./EmotionalField.css";

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ═══════════════════════════════════════════════════════════

/** Normalize a 0-100 score to SVG Y coordinate (inverted: high score = low Y). */
function scoreToY(score: number, baseY: number, amplitude: number): number {
  return baseY - (score / 100) * amplitude;
}

/** Build smooth SVG path from data points using cardinal spline. */
function buildCurvePath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
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
// INTERFACES
// ═══════════════════════════════════════════════════════════

interface EmotionalFieldProps {
  trajectory: EmotionalTrajectory | null;
}

interface FieldPoint {
  x: number;
  y: number;
  score: number;
  date: string;
  zone: EmotionalZone;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function EmotionalField({ trajectory }: EmotionalFieldProps) {
  // ── SVG constants ─────────────────────────────────────
  const width = 600;
  const height = 220;
  const padX = 40;
  const padTop = 30;
  const padBottom = 40;
  const baseY = height - padBottom;
  const amplitude = height - padTop - padBottom;

  // ── Build field points from history ───────────────────
  const fieldPoints: FieldPoint[] = useMemo(() => {
    if (!trajectory || trajectory.history.length === 0) return [];

    const sorted = [...trajectory.history].sort(
      (a: EmotionalDataPoint, b: EmotionalDataPoint) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const usableWidth = width - padX * 2;
    const step = sorted.length > 1 ? usableWidth / (sorted.length - 1) : 0;

    return sorted.map((dp: EmotionalDataPoint, i: number) => ({
      x: padX + i * step,
      y: scoreToY(dp.score, baseY, amplitude),
      score: dp.score,
      date: dp.date,
      zone: deriveEmotionalZone(dp.score),
    }));
  }, [trajectory]);

  // ── Curve path ────────────────────────────────────────
  const curvePath = useMemo(
    () => buildCurvePath(fieldPoints.map((p: FieldPoint) => ({ x: p.x, y: p.y }))),
    [fieldPoints],
  );

  // ── Baseline Y ────────────────────────────────────────
  const baselineScore = trajectory?.baseline.score ?? 65;
  const baselineY = scoreToY(baselineScore, baseY, amplitude);

  // ── Current point ─────────────────────────────────────
  const currentPoint = fieldPoints[fieldPoints.length - 1];
  const currentZone = trajectory
    ? deriveEmotionalZone(trajectory.current.score)
    : "stable";

  // ── Forecast cone ─────────────────────────────────────
  const forecast7d = trajectory?.forecast.predicted_score_7d ?? 50;
  const forecast30d = trajectory?.forecast.predicted_score_30d ?? 50;
  const forecastY7d = scoreToY(forecast7d, baseY, amplitude);
  const forecastY30d = scoreToY(forecast30d, baseY, amplitude);
  const forecastConeWidth = 20;

  // ── Velocity vector ───────────────────────────────────
  const velocity = trajectory?.velocity ?? 0;
  const vectorLength = Math.min(40, Math.abs(velocity) * 4);
  const vectorDirection = velocity >= 0 ? -1 : 1;

  // ── Triggers as epicenters ────────────────────────────
  const triggerPoints = useMemo(() => {
    if (!trajectory || fieldPoints.length === 0) return [];

    return trajectory.triggers
      .map((trigger: EmotionalTrigger, i: number) => {
        // Map trigger to nearest field point by index
        const pointIndex = Math.min(
          fieldPoints.length - 1,
          Math.max(0, Math.floor((i / trajectory.triggers.length) * fieldPoints.length)),
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
      .filter(Boolean) as Array<{
        x: number;
        y: number;
        impact: number;
        description: string;
        isPositive: boolean;
      }>;
  }, [trajectory, fieldPoints]);

  // ── Empty state ───────────────────────────────────────
  if (!trajectory || fieldPoints.length === 0) {
    return (
      <div className="glass-comm-emotional" data-zone="stable">
        <div className="emotional-field__header">
          <span className="emotional-field__title">Campo Emocional</span>
          <span className="emotional-field__subtitle">Sin datos de trayectoria</span>
        </div>
        <div className="emotional-field__empty">
          <svg viewBox={`0 0 ${width} ${height}`} className="emotional-field__svg">
            <line
              x1={padX}
              y1={baseY}
              x2={width - padX}
              y2={baseY}
              className="emotional-field__baseline-empty"
            />
            <text
              x={width / 2}
              y={height / 2}
              className="emotional-field__empty-text"
              textAnchor="middle"
            >
              Sin trayectoria emocional registrada
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-emotional"
      data-zone={currentZone}
      data-velocity={velocity > 2 ? "ascending" : velocity < -2 ? "descending" : "stable"}
    >
      {/* Header */}
      <div className="emotional-field__header">
        <span className="emotional-field__title">Campo Emocional</span>
        <div className="emotional-field__zone-badge" data-zone={currentZone}>
          <span>{EMOTIONAL_ZONE_CONFIG[currentZone].label}</span>
          <span className="emotional-field__score">
            {trajectory.current.score}/100
          </span>
        </div>
      </div>

      {/* SVG Field */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="emotional-field__svg"
        role="img"
        aria-label={`Emotional field showing ${trajectory.history.length} data points, currently ${EMOTIONAL_ZONE_CONFIG[currentZone].label}`}
      >
        <defs>
          {/* Area gradient — fills below the curve */}
          <linearGradient id="emo-field-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="emotional-field__fill-top" stopOpacity="0.25" />
            <stop offset="100%" className="emotional-field__fill-bottom" stopOpacity="0.02" />
          </linearGradient>

          {/* Forecast cone gradient */}
          <linearGradient id="emo-forecast-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" className="emotional-field__forecast-fill" stopOpacity="0.12" />
            <stop offset="100%" className="emotional-field__forecast-fill" stopOpacity="0.02" />
          </linearGradient>

          {/* Trigger ripple filter */}
          <filter id="emo-ripple-blur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Zone bands (horizontal) */}
        <rect
          x={padX}
          y={scoreToY(100, baseY, amplitude)}
          width={width - padX * 2}
          height={scoreToY(75, baseY, amplitude) - scoreToY(100, baseY, amplitude)}
          className="emotional-field__zone-band"
          data-zone="thriving"
          opacity="0.06"
        />
        <rect
          x={padX}
          y={scoreToY(74, baseY, amplitude)}
          width={width - padX * 2}
          height={scoreToY(55, baseY, amplitude) - scoreToY(74, baseY, amplitude)}
          className="emotional-field__zone-band"
          data-zone="stable"
          opacity="0.05"
        />
        <rect
          x={padX}
          y={scoreToY(39, baseY, amplitude)}
          width={width - padX * 2}
          height={scoreToY(25, baseY, amplitude) - scoreToY(39, baseY, amplitude)}
          className="emotional-field__zone-band"
          data-zone="at_risk"
          opacity="0.05"
        />
        <rect
          x={padX}
          y={scoreToY(24, baseY, amplitude)}
          width={width - padX * 2}
          height={scoreToY(0, baseY, amplitude) - scoreToY(24, baseY, amplitude)}
          className="emotional-field__zone-band"
          data-zone="crisis"
          opacity="0.06"
        />

        {/* Baseline surface */}
        <line
          x1={padX}
          y1={baselineY}
          x2={width - padX}
          y2={baselineY}
          className="emotional-field__baseline"
          strokeDasharray="6 4"
        />
        <text
          x={padX - 4}
          y={baselineY + 3}
          className="emotional-field__baseline-label"
          textAnchor="end"
        >
          Base
        </text>

        {/* Forecast cone */}
        <polygon
          points={`
            ${currentPoint?.x ?? width - padX},${currentPoint?.y ?? baseY}
            ${width - padX + 15},${forecastY7d - forecastConeWidth}
            ${width - padX + 15},${forecastY7d + forecastConeWidth}
          `}
          fill="url(#emo-forecast-fill)"
          className="emotional-field__forecast-cone"
          data-intervention={trajectory.forecast.intervention_window}
        />

        {/* 30-day forecast extension */}
        <line
          x1={width - padX + 15}
          y1={forecastY7d}
          x2={width - padX + 35}
          y2={forecastY30d}
          className="emotional-field__forecast-line"
          strokeDasharray="4 3"
          data-intervention={trajectory.forecast.intervention_window}
        />
        <text
          x={width - padX + 37}
          y={forecastY30d + 3}
          className="emotional-field__forecast-label"
        >
          30d: {forecast30d}
        </text>

        {/* Area fill under curve */}
        {fieldPoints.length > 1 && (
          <path
            d={`${curvePath} L ${fieldPoints[fieldPoints.length - 1].x} ${baseY} L ${fieldPoints[0].x} ${baseY} Z`}
            fill="url(#emo-field-fill)"
          />
        )}

        {/* Main curve */}
        <path
          d={curvePath}
          className="emotional-field__curve"
          fill="none"
          data-zone={currentZone}
        />

        {/* Trigger epicenters (ripple circles) */}
        {triggerPoints.map(
          (
            tp: { x: number; y: number; impact: number; description: string; isPositive: boolean },
            i: number,
          ) => (
            <g key={`trigger-${i}`} className="emotional-field__trigger">
              {/* Outer ripple */}
              <circle
                cx={tp.x}
                cy={tp.y}
                r={12}
                className="emotional-field__trigger-ripple"
                data-positive={tp.isPositive}
                filter="url(#emo-ripple-blur)"
              />
              {/* Inner epicenter */}
              <circle
                cx={tp.x}
                cy={tp.y}
                r={4}
                className="emotional-field__trigger-dot"
                data-positive={tp.isPositive}
              />
            </g>
          ),
        )}

        {/* Velocity vector (from current point) */}
        {currentPoint && Math.abs(velocity) > 0.5 && (
          <line
            x1={currentPoint.x}
            y1={currentPoint.y}
            x2={currentPoint.x}
            y2={currentPoint.y + vectorDirection * vectorLength}
            className="emotional-field__velocity-vector"
            data-direction={velocity > 0 ? "up" : "down"}
            markerEnd="url(#emo-arrow)"
          />
        )}

        {/* Current point indicator */}
        {currentPoint && (
          <g className="emotional-field__current-marker">
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={7}
              className="emotional-field__current-ring"
              data-zone={currentZone}
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r={3}
              className="emotional-field__current-dot"
              data-zone={currentZone}
            />
          </g>
        )}

        {/* X-axis labels */}
        {fieldPoints.length > 0 && (
          <>
            <text
              x={fieldPoints[0].x}
              y={baseY + 16}
              className="emotional-field__axis-label"
              textAnchor="start"
            >
              {new Date(fieldPoints[0].date).toLocaleDateString("es-CR", {
                day: "numeric",
                month: "short",
              })}
            </text>
            <text
              x={fieldPoints[fieldPoints.length - 1].x}
              y={baseY + 16}
              className="emotional-field__axis-label"
              textAnchor="end"
            >
              Hoy
            </text>
          </>
        )}
      </svg>

      {/* Trajectory stats strip */}
      <div className="emotional-field__stats">
        <div className="emotional-field__stat">
          <span className="emotional-field__stat-value">
            {velocity > 0 ? "+" : ""}
            {velocity.toFixed(1)}
          </span>
          <span className="emotional-field__stat-label">Velocidad /sem</span>
        </div>
        <div className="emotional-field__stat">
          <span className="emotional-field__stat-value">
            {trajectory.forecast.predicted_score_7d}
          </span>
          <span className="emotional-field__stat-label">Proyección 7d</span>
        </div>
        <div className="emotional-field__stat">
          <span className="emotional-field__stat-value">
            {trajectory.triggers.length}
          </span>
          <span className="emotional-field__stat-label">Triggers</span>
        </div>
        <div className="emotional-field__stat">
          <span className="emotional-field__stat-value">
            {trajectory.resonance_events.length}
          </span>
          <span className="emotional-field__stat-label">Resonancias</span>
        </div>
      </div>
    </div>
  );
}