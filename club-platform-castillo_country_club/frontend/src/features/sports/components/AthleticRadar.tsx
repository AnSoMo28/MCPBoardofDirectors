// ═══════════════════════════════════════════════════════════
// src/features/sports/components/AthleticRadar.tsx
// §B3.7 — Athletic Radar
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// SVG hexagonal radar: 6 athletic axes as a living polygon.
// Each axis is a vertex. The polygon shape reveals the
// athlete's profile at a glance. Level halo pulses.
// Low axes pulse red. Hover reveals detail.
// Living Protocol: 7/7
//
// Aha Moment: "¿Dónde destaca este socio?"
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component AthleticRadar
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type {
  AthleticProfile,
  AthleticAxis,
  SportsDashboardMode,
} from "../types";
import {
  ATHLETIC_AXIS_CONFIG,
  ATHLETIC_LEVEL_CONFIG,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import "./AthleticRadar.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface AthleticRadarProps {
  profile: AthleticProfile | null;
  ambientMode?: SportsDashboardMode;
  onSelect?: (axis: AthleticAxis) => void;
  reducedMotion?: boolean;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Axes in clockwise order starting from top (12 o'clock) */
const AXIS_ORDER: AthleticAxis[] = [
  "power",
  "speed",
  "endurance",
  "technique",
  "tactical",
  "mental",
] as AthleticAxis[];

const SVG_SIZE = 300;
const CENTER = SVG_SIZE / 2;
const MAX_RADIUS = 100;
const GRID_LEVELS = [0.2, 0.4, 0.6, 0.8, 1.0];
const LOW_AXIS_THRESHOLD = 40;
/** Label position offsets per axis index */
const LABEL_CONFIG: Array<{
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
}> = [
  { dx: 0, dy: -10, anchor: "middle" },   // top
  { dx: 12, dy: 4, anchor: "start" },     // top-right
  { dx: 12, dy: 4, anchor: "start" },     // bottom-right
  { dx: 0, dy: 18, anchor: "middle" },     // bottom
  { dx: -12, dy: 4, anchor: "end" },      // bottom-left
  { dx: -12, dy: 4, anchor: "end" },      // top-left
];

// ═══════════════════════════════════════════════════════════
// §3 — SVG MATH HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Compute (x, y) for an axis at a given normalized distance.
 * @param axisIndex - 0-5, clockwise from top
 * @param normalized - 0-1 (0 = center, 1 = max radius)
 */
function getPoint(
  axisIndex: number,
  normalized: number,
): { x: number; y: number } {
  const angleDeg = axisIndex * 60 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const radius = normalized * MAX_RADIUS;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

/**
 * Build SVG polygon `points` string for a hexagon at given radius.
 */
function buildHexPoints(normalizedRadius: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = getPoint(i, normalizedRadius);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

// ═══════════════════════════════════════════════════════════
// §4 — NARRATIVE HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Compute data confidence from session count.
 */
function computeConfidence(totalSessions: number): number {
  if (totalSessions === 0) return 0;
  if (totalSessions <= 3) return 30;
  if (totalSessions <= 10) return 60;
  if (totalSessions <= 20) return 75;
  return 85;
}

/**
 * Find the weakest axis (lowest score).
 */
function findWeakestAxis(
  axes: Record<AthleticAxis, number>,
): { axis: AthleticAxis; value: number } | null {
  let weakest: AthleticAxis | null = null;
  let lowest = Infinity;

  for (const axis of AXIS_ORDER) {
    if (axes[axis] < lowest) {
      lowest = axes[axis];
      weakest = axis;
    }
  }

  return weakest != null ? { axis: weakest, value: lowest } : null;
}

/**
 * Find the strongest axis (highest score).
 */
function findStrongestAxis(
  axes: Record<AthleticAxis, number>,
): { axis: AthleticAxis; value: number } | null {
  let strongest: AthleticAxis | null = null;
  let highest = -1;

  for (const axis of AXIS_ORDER) {
    if (axes[axis] > highest) {
      highest = axes[axis];
      strongest = axis;
    }
  }

  return strongest != null ? { axis: strongest, value: highest } : null;
}

/**
 * Build human-readable narrative from profile data.
 * Living Protocol 7: Narrativa
 */
function buildNarrative(profile: AthleticProfile): string {
  const levelConfig = ATHLETIC_LEVEL_CONFIG[profile.athleticLevel];
  const strongest = findStrongestAxis(profile.axes);
  const weakest = findWeakestAxis(profile.axes);

  const strongPart = strongest
    ? `Fortaleza: ${ATHLETIC_AXIS_CONFIG[strongest.axis].label} (${strongest.value}/100)`
    : "Sin datos de fortalezas";

  const weakPart =
    weakest && weakest.value < LOW_AXIS_THRESHOLD
      ? `Área de mejora: ${ATHLETIC_AXIS_CONFIG[weakest.axis].label} (${weakest.value}/100) — por debajo del nivel saludable.`
      : "Todas las áreas en nivel saludable.";

  const plateauPart =
    profile.plateauDurationWeeks > 0
      ? ` Plateau detectado hace ${profile.plateauDurationWeeks} semana(s).`
      : "";

  return `Nivel ${levelConfig.label}. ${strongPart}. ${weakPart}${plateauPart}`;
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function AthleticRadar({
  profile,
  ambientMode = "calm",
  onSelect,
  reducedMotion = false,
}: AthleticRadarProps) {
  // ── §5.1 — Degraded: no data ──────────────────────────
  if (!profile || profile.totalSessions === 0) {
    return (
      <section className="spt-radar" data-mode={ambientMode}>
        <EmptyState
          icon={<span className="spt-radar__empty-icon">🎯</span>}
          title="Sin perfil atlético"
          description="Necesitamos al menos 3 sesiones para calcular tu perfil atlético. ¡Agenda tu primera clase!"
          compact
        />
      </section>
    );
  }

  // ── §5.2 — Narrative ──────────────────────────────────
  const narrative = useMemo(
    () => buildNarrative(profile),
    [profile],
  );

  // ── §5.3 — Confidence ─────────────────────────────────
  const confidence = useMemo(
    () => computeConfidence(profile.totalSessions),
    [profile.totalSessions],
  );

  const computedAxes = useMemo(
    () => Object.values(profile.axes).filter((v) => v > 0).length,
    [profile.axes],
  );

  // ── §5.4 — Weakest axis (for suggestion) ──────────────
  const weakest = useMemo(
    () => findWeakestAxis(profile.axes),
    [profile.axes],
  );

  // ── §5.5 — SVG computations ───────────────────────────
  const gridHexes = useMemo(
    () => GRID_LEVELS.map((level) => buildHexPoints(level)),
    [],
  );

  const axisEndpoints = useMemo(
    () => AXIS_ORDER.map((_, i) => getPoint(i, 1)),
    [],
  );

  const dataPoints = useMemo(
    () =>
      AXIS_ORDER.map((axis, i) => {
        const normalized = profile.axes[axis] / 100;
        return { ...getPoint(i, normalized), axis, value: profile.axes[axis] };
      }),
    [profile.axes],
  );

  const dataPolygonStr = useMemo(
    () => dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    [dataPoints],
  );

  const labels = useMemo(
    () =>
      AXIS_ORDER.map((axis, i) => {
        const edge = getPoint(i, 1);
        const cfg = LABEL_CONFIG[i];
        return {
          x: edge.x + cfg.dx,
          y: edge.y + cfg.dy,
          anchor: cfg.anchor,
          label: ATHLETIC_AXIS_CONFIG[axis].label,
          axis,
        };
      }),
    [],
  );

  const haloRadius = useMemo(
    () => (profile.overallScore / 100) * MAX_RADIUS,
    [profile.overallScore],
  );

  // ── §5.6 — Render ─────────────────────────────────────
  return (
    <section
      className="spt-radar"
      data-mode={ambientMode}
      data-skill-level={profile.athleticLevel}
      data-prefers-reduced={reducedMotion}
      role="region"
      aria-label={`Perfil atlético: ${narrative}`}
    >
      {/* ── Header ── */}
      <div className="spt-radar__header">
        <h3 className="spt-radar__title">Perfil Atlético</h3>
        <span
          className="spt-radar__level"
          data-skill-level={profile.athleticLevel}
        >
          {ATHLETIC_LEVEL_CONFIG[profile.athleticLevel].label}
        </span>
        <span className="spt-radar__confidence">
          ⚑ {confidence}% · {computedAxes}/6 ejes
        </span>
      </div>

      {/* ── SVG Radar ── */}
      <svg
        className="spt-radar__svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        role="img"
        aria-label={narrative}
      >
        {/* Grid hexagons */}
        <g className="spt-radar__grid">
          {gridHexes.map((points, i) => (
            <polygon
              key={`grid-${i}`}
              className="spt-radar__grid-hex"
              points={points}
              fill="none"
            />
          ))}
        </g>

        {/* Axis lines (center to edge) */}
        <g className="spt-radar__axis-lines">
          {axisEndpoints.map((ep, i) => (
            <line
              key={`line-${i}`}
              className="spt-radar__axis-line"
              x1={CENTER}
              y1={CENTER}
              x2={ep.x.toFixed(1)}
              y2={ep.y.toFixed(1)}
            />
          ))}
        </g>

        {/* Level halo */}
        <circle
          className="spt-radar__halo"
          data-skill-level={profile.athleticLevel}
          cx={CENTER}
          cy={CENTER}
          r={haloRadius.toFixed(1)}
          fill="none"
        />

        {/* Data polygon */}
        <polygon
          className="spt-radar__data"
          points={dataPolygonStr}
        />

        {/* Data points (dots + values) */}
        <g className="spt-radar__points">
          {dataPoints.map((pt, i) => {
            const axis = pt.axis;
            const value = pt.value;
            const isLow = value < LOW_AXIS_THRESHOLD;

            return (
              <g
                key={axis}
                className="spt-radar__point-group"
                data-axis={axis}
                data-axis-low={isLow}
                style={{ "--stagger-i": i } as React.CSSProperties}
                onClick={() => onSelect?.(axis)}
                tabIndex={0}
                role="button"
                aria-label={`${ATHLETIC_AXIS_CONFIG[axis].label}: ${value}/100`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(axis);
                  }
                }}
              >
                {/* Alert ring for low axes */}
                {isLow && (
                  <circle
                    className="spt-radar__dot-alert"
                    cx={pt.x.toFixed(1)}
                    cy={pt.y.toFixed(1)}
                    r={8}
                    fill="none"
                    data-axis={axis}
                  />
                )}

                {/* Dot */}
                <circle
                  className="spt-radar__dot"
                  cx={pt.x.toFixed(1)}
                  cy={pt.y.toFixed(1)}
                  r={4}
                  data-axis={axis}
                />

                {/* Value near dot */}
                <text
                  className="spt-radar__value"
                  x={pt.x.toFixed(1)}
                  y={(pt.y - 10).toFixed(1)}
                  textAnchor="middle"
                  data-axis={axis}
                >
                  {value}
                </text>

                {/* Native tooltip */}
                <title>
                  {`${ATHLETIC_AXIS_CONFIG[axis].label}: ${value}/100 — ${ATHLETIC_AXIS_CONFIG[axis].description}`}
                </title>
              </g>
            );
          })}
        </g>

        {/* Axis labels (outside radar) */}
        <g className="spt-radar__labels">
          {labels.map((lbl, i) => (
            <text
              key={`lbl-${i}`}
              className="spt-radar__label"
              x={lbl.x.toFixed(1)}
              y={lbl.y.toFixed(1)}
              textAnchor={lbl.anchor}
              data-axis={lbl.axis}
            >
              {lbl.label}
            </text>
          ))}
        </g>
      </svg>

      {/* ── Footer: Narrative + Suggestion ── */}
      <div className="spt-radar__footer">
        <p className="spt-radar__narrative">{narrative}</p>
        {weakest && weakest.value < LOW_AXIS_THRESHOLD && (
          <p className="spt-radar__suggestion">
            💡 Área de mejora:{" "}
            <strong>{ATHLETIC_AXIS_CONFIG[weakest.axis].label}</strong>{" "}
            ({weakest.value}/100) — considerar entrenamiento específico.
          </p>
        )}
        {profile.plateauDurationWeeks > 0 && (
          <p className="spt-radar__plateau">
            ⏳ Plateau de {profile.plateauDurationWeeks} semana(s) — sugerir
            variación de rutina o nuevo deporte complementario.
          </p>
        )}
      </div>
    </section>
  );
}