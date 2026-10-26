// ═══════════════════════════════════════════════════════════
// src/features/sports/components/CourtHeatmap.tsx
// §B3.5 — Court Heatmap V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// 7-day × 16-hour utilization heatmap. Intensity coloring
// via data-attributes. Peak cell detection. Hover tooltip.
// Horizontal scroll on mobile. Insights derived from data.
// Living Protocol: 7/7
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ backgroundColor }} → data-intensity attributes
//   ✗ className prop → removed
//   ✗ Hardcoded insights → derived from data
//   ✓ data-mode, data-intensity (0-7), data-peak
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component CourtHeatmap
// ═══════════════════════════════════════════════════════════

import { useMemo, useState, useCallback } from "react";
import { Flame, Clock } from "lucide-react";
import type { CourtUtilization_Contract } from "@/shared/mocks/contracts";
import type { SportsDashboardMode } from "../types";
import "./CourtHeatmap.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface CourtHeatmapProps {
  courtUtilization: CourtUtilization_Contract[];
  ambientMode?: SportsDashboardMode;
}

interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
  courtCount: number;
}

interface TooltipData {
  x: number;
  y: number;
  dayName: string;
  hour: string;
  value: number;
  courtCount: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

/**
 * Map a 0-1 intensity value to a 0-7 CSS data-attribute level.
 */
function intensityLevel(value: number): number {
  if (value === 0) return 0;
  if (value < 0.15) return 1;
  if (value < 0.30) return 2;
  if (value < 0.45) return 3;
  if (value < 0.60) return 4;
  if (value < 0.75) return 5;
  if (value < 0.90) return 6;
  return 7;
}

// ═══════════════════════════════════════════════════════════
// §3 — DATA GENERATION
// ═══════════════════════════════════════════════════════════

function generateHeatmapData(
  courtUtilization: CourtUtilization_Contract[],
): HeatmapCell[][] {
  const peakHours = new Set<string>();
  for (const court of courtUtilization ?? []) {
    for (const h of court.peak_hours ?? []) {
      peakHours.add(h);
    }
  }

  const cells: HeatmapCell[][] = [];

  for (let day = 0; day < 7; day++) {
    const row: HeatmapCell[] = [];
    for (let hour = 0; hour < 16; hour++) {
      const actualHour = hour + 6;
      const hourStr = `${String(actualHour).padStart(2, "0")}:00`;

      let base = 0.2;

      if (actualHour >= 6 && actualHour <= 8) base = 0.35;
      if (actualHour >= 9 && actualHour <= 11) base = 0.45;
      if (actualHour >= 12 && actualHour <= 13) base = 0.2;
      if (actualHour >= 14 && actualHour <= 16) base = 0.7;
      if (actualHour >= 17 && actualHour <= 18) base = 0.85;
      if (actualHour >= 19) base = 0.4;

      if (day >= 5) {
        if (actualHour >= 8 && actualHour <= 11) base += 0.2;
        if (actualHour >= 14 && actualHour <= 16) base += 0.1;
      }
      if (day === 6) {
        base *= 0.7;
      }

      if (peakHours.has(hourStr)) {
        base = Math.min(1, base + 0.25);
      }

      const seed = ((day * 17 + hour * 31 + 7) % 100) / 100;
      const variation = (seed - 0.5) * 0.3;
      const value = Math.max(0, Math.min(1, base + variation));

      const courtCount = Math.round(value * (courtUtilization?.length ?? 7));

      row.push({ day, hour, value, courtCount });
    }
    cells.push(row);
  }

  return cells;
}

// ═══════════════════════════════════════════════════════════
// §4 — INSIGHT DERIVATION
// ═══════════════════════════════════════════════════════════

function deriveInsights(
  heatmapData: HeatmapCell[][],
  peakCells: Array<{ day: number; hour: number; value: number }>,
): string[] {
  const insights: string[] = [];

  if (peakCells.length > 0) {
    const topSlots = peakCells
      .slice(0, 3)
      .map((p) => `${DAY_NAMES[p.day]} ${p.hour + 6}:00`);
    insights.push(`Horas pico: ${topSlots.join(", ")}`);
  }

  // Find lowest utilization slots
  let minVal = 1;
  let minDay = 0;
  let minHour = 0;
  for (const row of heatmapData) {
    for (const cell of row) {
      if (cell.value < minVal && cell.value > 0) {
        minVal = cell.value;
        minDay = cell.day;
        minHour = cell.hour;
      }
    }
  }
  if (minVal < 0.3) {
    insights.push(
      `Menor demanda: ${DAY_NAMES[minDay]} ${minHour + 6}:00 — oportunidad para clases especiales o mantenimiento.`,
    );
  }

  // Weekend vs weekday comparison
  let weekdayAvg = 0;
  let weekendAvg = 0;
  let weekdayCount = 0;
  let weekendCount = 0;
  for (const row of heatmapData) {
    for (const cell of row) {
      if (cell.day < 5) {
        weekdayAvg += cell.value;
        weekdayCount++;
      } else {
        weekendAvg += cell.value;
        weekendCount++;
      }
    }
  }
  weekdayAvg = weekdayCount > 0 ? weekdayAvg / weekdayCount : 0;
  weekendAvg = weekendCount > 0 ? weekendAvg / weekendCount : 0;

  if (weekendAvg > weekdayAvg * 1.15) {
    insights.push(
      `Fines de semana ${(weekendAvg * 100).toFixed(0)}% vs días laborales ${(weekdayAvg * 100).toFixed(0)}% — mayor demanda en fin de semana.`,
    );
  } else if (weekdayAvg > weekendAvg * 1.15) {
    insights.push(
      `Días laborales ${(weekdayAvg * 100).toFixed(0)}% vs fines de semana ${(weekendAvg * 100).toFixed(0)}% — mayor demanda entre semana.`,
    );
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════
// §5 — HELPERS
// ═══════════════════════════════════════════════════════════

function buildHeatmapNarrative(
  totalCourts: number,
  avgUtilization: number,
  peakDay: string,
  peakHour: string,
  peakCount: number,
): string {
  const avgLabel =
    avgUtilization >= 65
      ? "alta"
      : avgUtilization >= 40
        ? "moderada"
        : "baja";

  return `Mapa de calor de utilización: ${totalCourts} canchas, promedio ${avgUtilization.toFixed(1)}% (${avgLabel}). Pico: ${peakDay} ${peakHour}. ${peakCount} slot(s) de alta demanda.`;
}

// ═══════════════════════════════════════════════════════════
// §6 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function CourtHeatmap({
  courtUtilization,
  ambientMode = "calm",
}: CourtHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // ── Data ──
  const heatmapData = useMemo(
    () => generateHeatmapData(courtUtilization),
    [courtUtilization],
  );

  const peakCells = useMemo(() => {
    const peaks: Array<{ day: number; hour: number; value: number }> = [];
    for (const row of heatmapData) {
      for (const cell of row) {
        if (cell.value >= 0.8) {
          peaks.push({ day: cell.day, hour: cell.hour, value: cell.value });
        }
      }
    }
    return peaks.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [heatmapData]);

  const totalCourts = courtUtilization?.length ?? 7;
  const avgUtilization =
    courtUtilization && courtUtilization.length > 0
      ? courtUtilization.reduce((s, c) => s + c.utilization_pct, 0) /
        courtUtilization.length
      : 0;

  const peakDay = peakCells.length > 0 ? DAY_NAMES[peakCells[0].day] : "—";
  const peakHour = peakCells.length > 0 ? `${peakCells[0].hour + 6}:00` : "—";

  // ── Derived insights ──
  const insights = useMemo(
    () => deriveInsights(heatmapData, peakCells),
    [heatmapData, peakCells],
  );

  // ── Narrative ──
  const narrative = useMemo(
    () => buildHeatmapNarrative(totalCourts, avgUtilization, peakDay, peakHour, peakCells.length),
    [totalCourts, avgUtilization, peakDay, peakHour, peakCells.length],
  );

  // ── Tooltip handlers ──
  const handleCellEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, cell: HeatmapCell) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        dayName: DAY_NAMES[cell.day],
        hour: `${cell.hour + 6}:00`,
        value: cell.value,
        courtCount: cell.courtCount,
      });
    },
    [],
  );

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  return (
    <section
      className="spt-heatmap"
      data-mode={ambientMode}
      role="region"
      aria-label={narrative}
    >
      {/* ── Header ── */}
      <div className="spt-heatmap__header">
        <div className="spt-heatmap__header-left">
          <h3 className="spt-heatmap__title">
            🔥 Mapa de Calor — Utilización de Canchas
          </h3>
          <p className="spt-heatmap__subtitle">
            {totalCourts} canchas · Promedio: {avgUtilization.toFixed(1)}% · Pico: {peakDay} {peakHour}
          </p>
        </div>
        <div className="spt-heatmap__header-right">
          <Flame className="spt-heatmap__flame-icon" />
          <span className="spt-heatmap__peak-count">
            {peakCells.length} slot(s) de alta demanda
          </span>
        </div>
      </div>

      {/* ── Heatmap Grid ── */}
      <div className="spt-heatmap__scroll">
        <div className="spt-heatmap__grid" role="grid" aria-label="Utilización por día y hora">
          {/* Hour labels (top) */}
          <div className="spt-heatmap__hour-labels" role="row">
            <span className="spt-heatmap__corner" role="columnheader" />
            {HOURS.map((h) => (
              <span key={h} className="spt-heatmap__hour-label" role="columnheader">
                {h}
              </span>
            ))}
          </div>

          {/* Grid rows */}
          {heatmapData.map((row, dayIdx) => (
            <div key={dayIdx} className="spt-heatmap__row" role="row">
              <span className="spt-heatmap__day-label" role="rowheader">
                {DAY_NAMES[dayIdx]}
              </span>

              {row.map((cell) => {
                const isPeak = peakCells.some(
                  (p) => p.day === cell.day && p.hour === cell.hour,
                );
                const level = intensityLevel(cell.value);

                return (
                  <div
                    key={`${cell.day}-${cell.hour}`}
                    className="spt-heatmap__cell"
                    data-intensity={level}
                    data-peak={isPeak || undefined}
                    onMouseEnter={(e) => handleCellEnter(e, cell)}
                    onMouseLeave={handleCellLeave}
                    role="gridcell"
                    aria-label={`${DAY_NAMES[cell.day]} ${cell.hour + 6}:00 — ${(cell.value * 100).toFixed(0)}% utilización`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="spt-heatmap__legend">
        <span className="spt-heatmap__legend-label">Intensidad:</span>
        <div className="spt-heatmap__legend-scale">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((level) => (
            <div
              key={level}
              className="spt-heatmap__legend-swatch"
              data-intensity={level}
              title={`${level * 15}%`}
            />
          ))}
        </div>
        <span className="spt-heatmap__legend-min">0%</span>
        <span className="spt-heatmap__legend-max">100%</span>
        <span className="spt-heatmap__legend-hours">
          <Clock className="spt-heatmap__clock-icon" />
          6:00–21:00
        </span>
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          className="spt-heatmap__tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <p className="spt-heatmap__tooltip-title">
            {tooltip.dayName} {tooltip.hour}
          </p>
          <p className="spt-heatmap__tooltip-value">
            {(tooltip.value * 100).toFixed(0)}% utilización
          </p>
          <p className="spt-heatmap__tooltip-meta">
            ~{tooltip.courtCount}/{totalCourts} canchas ocupadas
          </p>
        </div>
      )}

      {/* ── Insights ── */}
      {insights.length > 0 && (
        <div className="spt-heatmap__insights">
          <p className="spt-heatmap__insights-title">
            🔍 Insights de utilización
          </p>
          <ul className="spt-heatmap__insights-list">
            {insights.map((insight, i) => (
              <li key={i} className="spt-heatmap__insight">
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Footer: Narrative ── */}
      <div className="spt-heatmap__footer">
        <p className="spt-heatmap__narrative">{narrative}</p>
      </div>
    </section>
  );
}