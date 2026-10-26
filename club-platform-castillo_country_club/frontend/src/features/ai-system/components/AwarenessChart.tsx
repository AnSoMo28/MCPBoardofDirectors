/**
 * @component AwarenessChart (Fase 25)
 * @namespace .glass-ai__awareness
 * @depends AISystemPage.css
 * @note Interactive SVG chart with health zones, tooltips, unique gradient IDs.
 *       ARIA accessible. Responsive via viewBox.
 * @import import './AISystemPage.css';
 */

import { useState, useId, useMemo } from "react";
import { cn } from "@/shared/lib/utils";
import {
  AWARENESS_CHART,
  SYSTEM_HEALTH_THRESHOLDS,
  getHealthLevel,
} from "../config";
import type { AwarenessDataPoint } from "../types";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface AwarenessChartProps {
  history: AwarenessDataPoint[];
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function AwarenessChart({ history }: AwarenessChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(
    null,
  );
  const gradientId = useId();

  const { width, height, padding, zones } = AWARENESS_CHART;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  /* ── Data processing ── */
  const { points, latest, oldest, minScore, maxScore, range } =
    useMemo(() => {
      const reversed = [...history].reverse(); /* oldest first */
      const scores = reversed.map((h) => h.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const r = Math.max(max - min, 10);

      const pts = reversed.map((h, i) => ({
        x:
          padding.left +
          (i / Math.max(reversed.length - 1, 1)) * chartW,
        y:
          padding.top +
          chartH -
          ((h.score - min + 5) / (r + 10)) * chartH,
        score: h.score,
        timestamp: h.timestamp,
      }));

      return {
        points: pts,
        latest: reversed[reversed.length - 1],
        oldest: reversed[0],
        minScore: min,
        maxScore: max,
        range: r,
      };
    }, [history, padding, chartW, chartH]);

  /* ── SVG paths ── */
  const lineD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${lineD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const latestLevel = getHealthLevel(latest.score);
  const strokeColor =
    SYSTEM_HEALTH_THRESHOLDS[latestLevel].color;

  const delta = latest.score - oldest.score;

  /* ── Score to Y mapping (for zones) ── */
  const scoreToY = (score: number) =>
    padding.top +
    chartH -
    ((score - minScore + 5) / (range + 10)) * chartH;

  /* ── Date formatting ── */
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("es-CR", {
      month: "short",
      day: "numeric",
    });

  /* ── ARIA description ── */
  const ariaDescription = `Gráfico de evolución de auto-conciencia del sistema. Score actual: ${latest.score}. Score más bajo: ${minScore}. Score más alto: ${maxScore}. ${delta >= 0 ? "Mejoró" : "Bajó"} ${Math.abs(delta)} puntos en el período.`;

  return (
    <div
      className="glass-ai__awareness"
      role="figure"
      aria-label={ariaDescription}
    >
      {/* Header */}
      <div className="glass-ai__awareness-header">
        <span className="glass-ai__awareness-title">
          Evolución de auto-conciencia
        </span>
        <div className="glass-ai__awareness-score-wrap">
          <span
            className="glass-ai__awareness-score"
            style={{
              color: strokeColor,
            }}
          >
            {latest.score}
          </span>
          {delta !== 0 && (
            <span
              className={cn(
                "glass-ai__awareness-delta",
                delta > 0
                  ? "glass-ai__awareness-delta--positive"
                  : "glass-ai__awareness-delta--negative",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-ai__awareness-chart">
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-hidden="true"
        >
          {/* Health zones */}
          {zones.map((z) => {
            const y1 = Math.max(
              padding.top,
              scoreToY(Math.min(z.to, maxScore + 10)),
            );
            const y2 = Math.min(
              padding.top + chartH,
              scoreToY(Math.max(z.from, minScore - 5)),
            );
            const h = y2 - y1;
            if (h <= 0) return null;
            return (
              <rect
                key={z.level}
                x={padding.left}
                y={y1}
                width={chartW}
                height={h}
                className={`glass-ai__awareness-zone--${z.level}`}
                rx={2}
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient
              id={`${gradientId}-area`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={strokeColor}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={strokeColor}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={areaD}
            fill={`url(#${gradientId}-area)`}
            className="glass-ai__awareness-area"
          />

          {/* Line */}
          <path
            d={lineD}
            stroke={strokeColor}
            className="glass-ai__awareness-line"
          />

          {/* Dots */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? 5 : 3}
              fill={SYSTEM_HEALTH_THRESHOLDS[getHealthLevel(p.score)].color}
              stroke="var(--color-surface-2, #0e121a)"
              strokeWidth={1.5}
              className={cn(
                "glass-ai__awareness-dot",
                hoveredIndex === i &&
                  "glass-ai__awareness-dot--active",
              )}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${formatDate(p.timestamp)}: Score ${p.score}`}
            />
          ))}
        </svg>

        {/* Tooltip (HTML overlay) */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="glass-ai__awareness-tooltip"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
            }}
          >
            <span className="glass-ai__awareness-tooltip-date">
              {formatDate(points[hoveredIndex].timestamp)}
            </span>
            <span className="glass-ai__awareness-tooltip-score">
              Score: {points[hoveredIndex].score}
            </span>
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="glass-ai__awareness-axis">
        <span className="glass-ai__awareness-axis-label">
          {formatDate(oldest.timestamp)}
        </span>
        <span className="glass-ai__awareness-axis-label">
          {formatDate(latest.timestamp)}
        </span>
      </div>
    </div>
  );
}