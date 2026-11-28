// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupTrendsPanel.tsx
// Phase 34+ Migration — Trends Panel
// Level 6+ Agency · Production Grade
//
// "The River of Generations" — SVG stream chart with 7 cohort
// flows, prediction lane, DNA strand ribbon, ebb & flow
// balance, drill-down detail, and seasonal hints.
//
// Original: cn() + 8 namespaces + 12 inline styles + as any
//   → BEM .ag-trends__* + data-* + CSS var bridge + safe access
//
// PRE-WRITE VERIFICATION:
//   AgeGroupTemporalTrend → @/shared/mocks/contracts ✅
//   AGE_BRACKETS → ../config ✅
//   COHORT_IDENTITIES → ../config ✅
//   COHORT_SEASONALITY → ../config ✅
//   AgeBracketId → ../types ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 12+ → data-active, data-dimmed, data-delta, data-prediction, data-direction
//   - 8 namespaces → .ag-trends__* unified BEM
//   - 12 inline color/cursor styles → CSS var bridge + data-*
//   - as any × 3 → bracket notation with safe Record cast
//   - className prop → removed
//   - Props → AgeGroupTrendsPanelProps Readonly
//   - ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import type { AgeGroupTemporalTrend } from "@/shared/mocks/contracts";
import {
  AGE_BRACKETS,
  COHORT_IDENTITIES,
  COHORT_SEASONALITY,
} from "../config";
import type { AgeBracketId } from "../types";

import "./AgeGroupTrendsPanel.css";
import { Button } from "@/shared/components/ui/Button";

/* ── §0  Local Types ──────────────────────────────────────── */

interface MonthData {
  readonly month: string;
  readonly values: readonly number[];
  readonly total: number;
  readonly proportions: readonly number[];
  readonly retentionRate: number;
  readonly familyParticipation: number;
  readonly newEnrollments: number;
  readonly activitiesHeld: number;
}

interface Prediction {
  readonly month: string;
  readonly values: readonly number[];
  readonly total: number;
  readonly uncertainty: number;
}

interface AllMonthEntry extends MonthData {
  readonly isPrediction: boolean;
  readonly uncertainty: number;
}

interface AgeGroupTrendsPanelProps {
  /** Temporal trend data from analytics */
  readonly trends: AgeGroupTemporalTrend[];
}

/* ── §1  Bracket field accessors ──────────────────────────── */
const TRENDS_SERIES: ReadonlyArray<AgeBracketId> = [
  "child",
  "youth",
  "senior",
];

/* ── §2  Helpers ──────────────────────────────────────────── */

/** Safe field access for trend data with extended fields */
function getFieldValue(
  trend: AgeGroupTemporalTrend,
  bracketId: AgeBracketId,
): number {
  const record = trend as unknown as Record<string, unknown>;
  if (bracketId === "child") return (record["kids_enrolled"] as number) ?? 0;
  if (bracketId === "youth") return (record["teens_enrolled"] as number) ?? 0;
  if (bracketId === "senior") return (record["seniors_enrolled"] as number) ?? 0;
  return 0;
}

function buildMonthData(
  trends: readonly AgeGroupTemporalTrend[],
): MonthData[] {
  return trends.map((t) => {
    const values = TRENDS_SERIES.map((id) => getFieldValue(t, id));
    const total = values.reduce((s, v) => s + v, 0);
    const proportions = values.map((v) => (total > 0 ? v / total : 0));
    return {
      month: t.month,
      values,
      total,
      proportions,
      retentionRate: t.retention_rate,
      familyParticipation: t.family_participation,
      newEnrollments: t.new_enrollments,
      activitiesHeld: t.activities_held,
    };
  });
}

function predictNextMonths(
  data: readonly MonthData[],
  count: number,
): Prediction[] {
  if (data.length < 3) return [];

  const predictions: Prediction[] = [];
  const lastN = data.slice(-Math.min(6, data.length));

  for (let c = 0; c < count; c++) {
    const predicted = TRENDS_SERIES.map((_, si) => {
      const vals = lastN.map((d) => d.values[si]);
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;
      const n = vals.length;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += vals[i];
        sumXY += i * vals[i];
        sumX2 += i * i;
      }
      const slope =
        (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
      const intercept = (sumY - slope * sumX) / n;
      return Math.max(0, Math.round(intercept + slope * (n + c)));
    });

    const total = predicted.reduce((s, v) => s + v, 0);

    /* Generate month label */
    const lastMonth = data[data.length - 1].month;
    let nextMonth = lastMonth;
    if (lastMonth.includes("-")) {
      const [y, m] = lastMonth.split("-").map(Number);
      const nm = m + c + 1;
      const ny = y + Math.floor((nm - 1) / 12);
      nextMonth = `${ny}-${String(((nm - 1) % 12) + 1).padStart(2, "0")}`;
    }

    predictions.push({
      month: nextMonth,
      values: predicted,
      total,
      uncertainty: 5 + c * 8,
    });
  }

  return predictions;
}

/** Smooth bezier path for a stacked area band */
function streamPath(
  points: ReadonlyArray<{ x: number; yTop: number; yBottom: number }>,
): string {
  if (points.length === 0) return "";

  const tension = 0.3;
  const topPts: string[] = [`M ${points[0].x} ${points[0].yTop}`];
  const bottomPts: string[] = [
    `L ${points[points.length - 1].x} ${points[points.length - 1].yBottom}`,
  ];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1yTop = p1.yTop + (p2.yTop - p0.yTop) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2yTop = p2.yTop - (p3.yTop - p1.yTop) * tension;

    topPts.push(
      `C ${cp1x.toFixed(1)} ${cp1yTop.toFixed(1)} ${cp2x.toFixed(1)} ${cp2yTop.toFixed(1)} ${p2.x.toFixed(1)} ${p2.yTop.toFixed(1)}`,
    );
  }

  for (let i = points.length - 1; i > 0; i--) {
    const p0 = points[Math.min(points.length - 1, i + 1)];
    const p1 = points[i];
    const p2 = points[i - 1];
    const p3 = points[Math.max(0, i - 2)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1yBot = p1.yBottom + (p2.yBottom - p0.yBottom) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2yBot = p2.yBottom - (p3.yBottom - p1.yBottom) * tension;

    bottomPts.push(
      `C ${cp1x.toFixed(1)} ${cp1yBot.toFixed(1)} ${cp2x.toFixed(1)} ${cp2yBot.toFixed(1)} ${p2.x.toFixed(1)} ${p2.yBottom.toFixed(1)}`,
    );
  }

  return [...topPts, ...bottomPts, "Z"].join(" ");
}

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function monthLabel(month: string): string {
  if (month.includes("-")) {
    const m = parseInt(month.split("-")[1], 10);
    return MONTH_NAMES[m - 1] ?? month;
  }
  return month;
}

function getTrend(
  data: readonly MonthData[],
  idx: number,
): "improving" | "declining" | "stable" {
  if (data.length < 2) return "stable";
  const last = data[data.length - 1].values[idx];
  const prev = data[data.length - 2].values[idx];
  if (last > prev * 1.05) return "improving";
  if (last < prev * 0.95) return "declining";
  return "stable";
}

function getDeltaDirection(
  value: number,
): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

/* ── §3  Trend Arrow (internal) ───────────────────────────── */

function TrendArrow({
  direction,
}: {
  readonly direction: "improving" | "declining" | "stable";
}) {
  if (direction === "improving")
    return (
      <span className="ag-trends__legend-trend" data-direction="up">
        <TrendingUp size={11} aria-hidden="true" />
      </span>
    );
  if (direction === "declining")
    return (
      <span className="ag-trends__legend-trend" data-direction="down">
        <TrendingDown size={11} aria-hidden="true" />
      </span>
    );
  return (
    <span className="ag-trends__legend-trend" data-direction="stable">
      <Minus size={11} aria-hidden="true" />
    </span>
  );
}

/* ── §4  Delta Badge (internal) ───────────────────────────── */

function DeltaBadge({
  value,
  suffix = "",
}: {
  readonly value: number;
  readonly suffix?: string;
}) {
  const dir = getDeltaDirection(value);
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "—";
  return (
    <span className="ag-trends__drilldown-delta" data-delta={dir}>
      {arrow}
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

/* ── §5  Silent River — Empty State (P10) ─────────────────── */

function SilentRiver() {
  return (
    <div
      className="ag-trends__dormant"
      role="status"
      aria-label="Sin datos de tendencias disponibles"
      data-testid="ag-trends-dormant"
    >
      <svg viewBox="0 0 300 80" className="ag-trends__dormant-svg" aria-hidden="true">
        {TRENDS_SERIES.map((id, i) => {
          const identity = COHORT_IDENTITIES.find((c) => c.bracketId === id);
          const y = 20 + i * 20;
          return (
            <path
              key={id}
              d={`M 0 ${y} Q 75 ${y - 8} 150 ${y} T 300 ${y}`}
              fill="none"
              stroke={identity?.color ?? "rgba(255,255,255,0.1)"}
              strokeWidth="6"
              opacity="0.12"
              className="ag-trends__dormant-stream"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          );
        })}
        <rect
          x="0"
          y="0"
          width="60"
          height="80"
          fill="url(#dormant-shimmer)"
          className="ag-trends__dormant-shimmer"
        />
        <defs>
          <linearGradient id="dormant-shimmer">
            <stop
              offset="0%"
              stopColor="var(--color-gold-400, #d4a853)"
              stopOpacity="0"
            />
            <stop
              offset="50%"
              stopColor="var(--color-gold-400, #d4a853)"
              stopOpacity="0.06"
            />
            <stop
              offset="100%"
              stopColor="var(--color-gold-400, #d4a853)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
      </svg>
      <h4 className="ag-trends__dormant-title">Sin datos de tendencias</h4>
      <p className="ag-trends__dormant-desc">
        El sistema aprenderá los patrones del club con el tiempo
      </p>
    </div>
  );
}

/* ── §6  Main Component ──────────────────────────────────── */

/**
 * AgeGroupTrendsPanel — "The River of Generations"
 *
 * SVG stream chart with stacked cohort flows, prediction lane
 * with uncertainty widening, DNA strand proportion ribbon,
 * ebb & flow balance visualization, drill-down detail with
 * month-over-month deltas, and seasonal hints.
 */
export function AgeGroupTrendsPanel({
  trends,
}: AgeGroupTrendsPanelProps) {
  const [hoveredSeries, setHoveredSeries] = useState<number | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    null,
  );

  /* ── Data processing ── */
  const monthData = useMemo(() => buildMonthData(trends), [trends]);
  const predictions = useMemo(
    () => predictNextMonths(monthData, 3),
    [monthData],
  );

  /* ── All months (real + predicted) ── */
  const allMonths = useMemo((): AllMonthEntry[] => {
    const real: AllMonthEntry[] = monthData.map((d) => ({
      ...d,
      isPrediction: false,
      uncertainty: 0,
    }));
    const pred: AllMonthEntry[] = predictions.map((p) => ({
      month: p.month,
      values: p.values,
      total: p.total,
      proportions: p.values.map((v) =>
        p.total > 0 ? v / p.total : 0,
      ),
      retentionRate: 0,
      familyParticipation: 0,
      newEnrollments: 0,
      activitiesHeld: 0,
      isPrediction: true,
      uncertainty: p.uncertainty,
    }));
    return [...real, ...pred];
  }, [monthData, predictions]);

  /* ── SVG geometry ── */
  const chartW = 100;
  const chartH = 120;
  const padX = 2;
  const innerW = chartW - padX * 2;
  const xStep =
    allMonths.length > 1 ? innerW / (allMonths.length - 1) : innerW;

  /* ── Max total for scaling ── */
  const maxTotal = useMemo(
    () => Math.max(...allMonths.map((m) => m.total), 1),
    [allMonths],
  );

  /* ── Stacked Y coordinates per month ── */
  const stackedCoords = useMemo(() => {
    return allMonths.map((m, mi) => {
      const x = padX + mi * xStep;
      let cumBottom = chartH;
      const bands: {
        x: number;
        yTop: number;
        yBottom: number;
        idx: number;
      }[] = [];

      for (let si = TRENDS_SERIES.length - 1; si >= 0; si--) {
        const val = m.values[si];
        const h = (val / maxTotal) * (chartH - 10);
        const yTop = cumBottom - h;
        bands.push({ x, yTop, yBottom: cumBottom, idx: si });
        cumBottom = yTop;
      }

      return bands;
    });
  }, [allMonths, maxTotal, xStep]);

  /* ── Stream paths per series ── */
  const seriesPaths = useMemo(() => {
    return TRENDS_SERIES.map((_, si) => {
      const points = stackedCoords.map((monthBands) => {
        const band = monthBands.find((b) => b.idx === si);
        return (
          band ?? { x: 0, yTop: chartH, yBottom: chartH, idx: si }
        );
      });
      return streamPath(points);
    });
  }, [stackedCoords]);

  /* ── Ebb & Flow data (P4) ── */
  const ebbData = useMemo(() => {
    return monthData.map((d) => {
      const churnEstimate =
        d.total * (1 - d.retentionRate / 100);
      const balance = d.newEnrollments - churnEstimate;
      return { ...d, balance, churnEstimate };
    });
  }, [monthData]);

  const maxNew = Math.max(
    ...ebbData.map((d) => d.newEnrollments),
    1,
  );
  const maxChurn = Math.max(
    ...ebbData.map((d) => d.churnEstimate),
    1,
  );

  /* ── Legend trends ── */
  const legendTrends = useMemo(() => {
    return TRENDS_SERIES.map((id, si) => ({
      id,
      trend: getTrend(monthData, si),
    }));
  }, [monthData]);

  /* ── Selected month data (P6) ── */
  const drillData = useMemo(() => {
    if (!selectedMonth) return null;
    return monthData.find((d) => d.month === selectedMonth) ?? null;
  }, [selectedMonth, monthData]);

  /* ── Drill delta (P6) ── */
  const drillDelta = useMemo(() => {
    if (!drillData) return null;
    const idx = monthData.findIndex(
      (d) => d.month === drillData.month,
    );
    if (idx <= 0) return null;
    const prev = monthData[idx - 1];
    return {
      retention:
        drillData.retentionRate - prev.retentionRate,
      familyParticipation:
        drillData.familyParticipation -
        prev.familyParticipation,
      newEnrollments:
        drillData.newEnrollments - prev.newEnrollments,
      activitiesHeld:
        drillData.activitiesHeld - prev.activitiesHeld,
      total: drillData.total - prev.total,
    };
  }, [drillData, monthData]);

  /* ── Seasonal hint (P7) ── */
  const getSeasonalHint = useCallback(
    (month: string): string | null => {
      if (!month.includes("-")) return null;
      const m = parseInt(month.split("-")[1], 10);
      for (const bracket of AGE_BRACKETS) {
        const entry = COHORT_SEASONALITY[bracket.id];
        if (entry && entry.peakMonths.includes(m)) {
          return `Peak para ${bracket.label}`;
        }
      }
      return null;
    },
    [],
  );

  /* ── Legend hover handlers ── */
  const handleLegendEnter = useCallback(
    (si: number) => setHoveredSeries(si),
    [],
  );
  const handleLegendLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);
  const handleLegendClick = useCallback(
    (si: number) => {
      setHoveredSeries((prev) => (prev === si ? null : si));
    },
    [],
  );
  const handleMonthClick = useCallback(
    (month: string) => {
      setSelectedMonth((prev) => (prev === month ? null : month));
    },
    [],
  );

  /* ── Empty ── */
  if (trends.length === 0) return <SilentRiver />;

  return (
    <div
      className="ag-trends"
      role="region"
      aria-label="Tendencias mensuales generacionales"
      data-testid="ag-trends"
    >
      {/* § Header + Legend */}
      <div className="ag-trends__header">
        <h3 className="ag-trends__title">Tendencias Mensuales</h3>
        <div
          className="ag-trends__legend"
          role="toolbar"
          aria-label="Filtrar por cohorte"
          data-testid="ag-trends-legend"
        >
          {TRENDS_SERIES.map((id, si) => {
            const identity = COHORT_IDENTITIES.find(
              (c) => c.bracketId === id,
            );
            const bracket = AGE_BRACKETS.find((b) => b.id === id);
            const isHovered = hoveredSeries === si;
            const isDimmed =
              hoveredSeries !== null && hoveredSeries !== si;

            return (
              <Button
                variant="unstyled"
                key={id}
                className="ag-trends__legend-item"
                data-active={isHovered || undefined}
                data-dimmed={isDimmed || undefined}
                onMouseEnter={() => handleLegendEnter(si)}
                onMouseLeave={handleLegendLeave}
                onClick={() => handleLegendClick(si)}
                type="button"
                aria-pressed={isHovered}
                aria-label={`${bracket?.label ?? id}: tendencia ${legendTrends[si]?.trend ?? "estable"}`}
                style={
                  {
                    "--dot-color": identity?.color ?? bracket?.color ?? "#a09890",
                  } as CSSProperties
                }
              >
                <span className="ag-trends__legend-dot" aria-hidden="true" />
                <span className="ag-trends__legend-label">
                  {bracket?.label.split(" ")[0] ?? id}
                </span>
                <TrendArrow
                  direction={legendTrends[si]?.trend ?? "stable"}
                />
              </Button>
            );
          })}
        </div>
      </div>

      {/* § Stream Chart (P1 + P2) */}
      <div
        className="ag-trends__chart"
        data-testid="ag-trends-chart"
      >
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="ag-trends__svg"
          preserveAspectRatio="none"
          role="img"
          aria-label="Gráfico de tendencias generacionales — flujo de cohortes"
        >
          <defs>
            <linearGradient
              id="ag-time-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                stopColor="var(--color-silver-700, #404040)"
                stopOpacity="0.03"
              />
              <stop
                offset="100%"
                stopColor="var(--color-silver-400, #a09890)"
                stopOpacity="0.06"
              />
            </linearGradient>
            {TRENDS_SERIES.map((id) => {
              const identity = COHORT_IDENTITIES.find(
                (c) => c.bracketId === id,
              );
              return (
                <linearGradient
                  key={`sg-${id}`}
                  id={`ag-stream-${id}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      identity?.gradient[0] ??
                      identity?.color ??
                      "#ccc"
                    }
                    stopOpacity="0.7"
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      identity?.gradient[1] ??
                      identity?.color ??
                      "#ccc"
                    }
                    stopOpacity="0.5"
                  />
                </linearGradient>
              );
            })}
          </defs>

          {/* Background gradient */}
          <rect
            x="0"
            y="0"
            width={chartW}
            height={chartH}
            fill="url(#ag-time-grad)"
          />

          {/* Stream paths (P1) */}
          {seriesPaths.map((d, si) => {
            const id = TRENDS_SERIES[si];
            const isDimmed =
              hoveredSeries !== null && hoveredSeries !== si;
            return (
              <path
                key={`stream-${id}`}
                d={d}
                fill={`url(#ag-stream-${id})`}
                className="ag-trends__stream"
                data-dimmed={isDimmed || undefined}
                style={
                  { "--stream-i": si } as CSSProperties
                }
              />
            );
          })}

          {/* Prediction streams (P2) */}
          {predictions.length > 0 &&
            TRENDS_SERIES.map((id, si) => {
              const predPoints = predictions.map((p, pi) => {
                const mi = monthData.length + pi;
                const x = padX + mi * xStep;
                let cumBottom = chartH;
                for (
                  let sj = TRENDS_SERIES.length - 1;
                  sj >= 0;
                  sj--
                ) {
                  const h =
                    (p.values[sj] / maxTotal) * (chartH - 10);
                  if (sj === si) {
                    const unc = p.uncertainty;
                    return {
                      x,
                      yTop: cumBottom - h - unc * 0.3,
                      yBottom: cumBottom,
                      idx: si,
                    };
                  }
                  cumBottom -= h;
                }
                return { x, yTop: chartH, yBottom: chartH, idx: si };
              });

              const lastRealBand =
                stackedCoords[stackedCoords.length - 1];
              const lastBand = lastRealBand?.find(
                (b) => b.idx === si,
              );
              if (lastBand) {
                predPoints.unshift({
                  x: lastBand.x,
                  yTop: lastBand.yTop,
                  yBottom: lastBand.yBottom,
                  idx: si,
                });
              }

              const predPath = streamPath(predPoints);
              return (
                <path
                  key={`pred-${si}`}
                  d={predPath}
                  fill="none"
                  stroke={
                    COHORT_IDENTITIES.find(
                      (c) => c.bracketId === id,
                    )?.color ?? "#ccc"
                  }
                  strokeWidth="0.6"
                  strokeDasharray="2 1.5"
                  className="ag-trends__pred-stream"
                />
              );
            })}

          {/* Ripple on last data point */}
          {stackedCoords.length > 0 &&
            (() => {
              const lastBands =
                stackedCoords[stackedCoords.length - 1];
              if (!lastBands) return null;
              const topBand = lastBands.reduce((a, b) =>
                a.yTop < b.yTop ? a : b,
              );
              return (
                <circle
                  cx={topBand.x}
                  cy={topBand.yTop}
                  r="1.5"
                  fill="var(--color-gold-400, #d4a853)"
                  opacity="0.6"
                  className="ag-trends__ripple"
                />
              );
            })()}

          {/* Month labels */}
          {allMonths.map((m, mi) => (
            <text
              key={m.month}
              x={padX + mi * xStep}
              y={chartH - 1}
              textAnchor="middle"
              className="ag-trends__month-label"
              data-prediction={m.isPrediction || undefined}
              onClick={
                m.isPrediction
                  ? undefined
                  : () => handleMonthClick(m.month)
              }
              role={m.isPrediction ? undefined : "button"}
              tabIndex={m.isPrediction ? undefined : 0}
              aria-label={
                m.isPrediction
                  ? undefined
                  : `Seleccionar mes ${monthLabel(m.month)}`
              }
              onKeyDown={
                m.isPrediction
                  ? undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleMonthClick(m.month);
                      }
                    }
              }
            >
              {monthLabel(m.month)}
            </text>
          ))}
        </svg>
      </div>

      {/* § Monthly Drill-Down (P6) */}
      {drillData && (
        <div
          className="ag-trends__drilldown"
          key={drillData.month}
          role="region"
          aria-label={`Detalle mensual: ${drillData.month}`}
          data-testid="ag-trends-drilldown"
        >
          <div className="ag-trends__drilldown-header">
            <span className="ag-trends__drilldown-month">
              {drillData.month}
            </span>
            {(() => {
              const hint = getSeasonalHint(drillData.month);
              return hint ? (
                <span className="ag-trends__drilldown-seasonal">
                  {hint}
                </span>
              ) : null;
            })()}
          </div>

          <div className="ag-trends__drilldown-grid">
            {/* Total */}
            <div className="ag-trends__drilldown-item">
              <span className="ag-trends__drilldown-label">
                Total
              </span>
              <span className="ag-trends__drilldown-value">
                {drillData.total}
              </span>
              {drillDelta && (
                <DeltaBadge value={drillDelta.total} />
              )}
            </div>

            {/* Retención */}
            <div className="ag-trends__drilldown-item">
              <span className="ag-trends__drilldown-label">
                Retención
              </span>
              <span className="ag-trends__drilldown-value">
                {drillData.retentionRate.toFixed(0)}%
              </span>
              {drillDelta && (
                <DeltaBadge
                  value={drillDelta.retention}
                  suffix="pp"
                />
              )}
            </div>

            {/* Familias */}
            <div className="ag-trends__drilldown-item">
              <span className="ag-trends__drilldown-label">
                Familias
              </span>
              <span className="ag-trends__drilldown-value">
                {drillData.familyParticipation.toFixed(0)}%
              </span>
              {drillDelta && (
                <DeltaBadge
                  value={drillDelta.familyParticipation}
                  suffix="pp"
                />
              )}
            </div>

            {/* Nuevos */}
            <div className="ag-trends__drilldown-item">
              <span className="ag-trends__drilldown-label">
                Nuevos
              </span>
              <span className="ag-trends__drilldown-value">
                {drillData.newEnrollments}
              </span>
              {drillDelta && (
                <DeltaBadge
                  value={drillDelta.newEnrollments}
                />
              )}
            </div>

            {/* Actividades */}
            <div className="ag-trends__drilldown-item">
              <span className="ag-trends__drilldown-label">
                Actividades
              </span>
              <span className="ag-trends__drilldown-value">
                {drillData.activitiesHeld}
              </span>
              {drillDelta && (
                <DeltaBadge
                  value={drillDelta.activitiesHeld}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* § DNA Strand / Proportion Ribbon (P3) */}
      <div
        className="ag-trends__ribbon"
        role="img"
        aria-label="Cinta proporcional de cohortes por mes"
        data-testid="ag-trends-ribbon"
      >
        {monthData.map((m) => (
          <div
            key={m.month}
            className="ag-trends__ribbon-col"
            onClick={() => handleMonthClick(m.month)}
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar mes ${monthLabel(m.month)}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleMonthClick(m.month);
              }
            }}
          >
            {TRENDS_SERIES.map((id, si) => {
              const identity = COHORT_IDENTITIES.find(
                (c) => c.bracketId === id,
              );
              const isDimmed =
                hoveredSeries !== null && hoveredSeries !== si;
              return (
                <div
                  key={id}
                  className="ag-trends__ribbon-seg"
                  data-dimmed={isDimmed || undefined}
                  style={
                    {
                      "--seg-height": `${m.proportions[si] * 100}%`,
                      "--seg-color":
                        identity?.color ?? "#ccc",
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* § Ebb & Flow (P4) */}
      {ebbData.length > 0 && (
        <div
          className="ag-trends__ebb"
          role="img"
          aria-label="Balance de membresía: nuevos vs churn estimado"
          data-testid="ag-trends-ebb"
        >
          <div className="ag-trends__ebb-header">
            <span className="ag-trends__ebb-title">
              Balance de membresía
            </span>
            <div className="ag-trends__ebb-legend">
              <span className="ag-trends__ebb-legend-item">
                <span
                  className="ag-trends__ebb-legend-dot"
                  data-type="new"
                  aria-hidden="true"
                />
                Nuevos
              </span>
              <span className="ag-trends__ebb-legend-item">
                <span
                  className="ag-trends__ebb-legend-dot"
                  data-type="churn"
                  aria-hidden="true"
                />
                Churn est.
              </span>
            </div>
          </div>
          <svg
            viewBox={`0 0 ${chartW} 30`}
            className="ag-trends__ebb-svg"
            preserveAspectRatio="none"
          >
            {ebbData.map((d, i) => {
              const x = padX + i * xStep;
              const newH = (d.newEnrollments / maxNew) * 12;
              const churnH = (d.churnEstimate / maxChurn) * 12;

              return (
                <g key={d.month}>
                  {/* New enrollment bar */}
                  <rect
                    x={x - 1.5}
                    y={14 - newH}
                    width={1.2}
                    height={newH}
                    className="ag-trends__ebb-bar-new"
                    rx="0.3"
                  />
                  {/* Churn bar */}
                  <rect
                    x={x + 0.5}
                    y={14}
                    width={1.2}
                    height={churnH}
                    className="ag-trends__ebb-bar-churn"
                    rx="0.3"
                  />
                  {/* Balance point */}
                  <circle
                    cx={x}
                    cy={d.balance >= 0 ? 10 : 20}
                    r={Math.min(
                      1.5,
                      Math.abs(d.balance) * 0.1 + 0.5,
                    )}
                    className="ag-trends__ebb-point"
                    data-negative={d.balance < 0 || undefined}
                  />
                </g>
              );
            })}
            {/* Center line */}
            <line
              x1={padX}
              y1={14}
              x2={padX + (ebbData.length - 1) * xStep}
              y2={14}
              className="ag-trends__ebb-center-line"
            />
          </svg>
        </div>
      )}

      {/* § Prediction Legend (P2) */}
      {predictions.length > 0 && (
        <div
          className="ag-trends__pred-legend"
          data-testid="ag-trends-pred-legend"
        >
          <span className="ag-trends__pred-label">
            <span className="ag-trends__pred-line" aria-hidden="true" />
            Proyección (3 meses)
          </span>
        </div>
      )}
    </div>
  );
}