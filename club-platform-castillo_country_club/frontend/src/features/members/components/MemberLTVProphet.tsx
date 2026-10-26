// ═══════════════════════════════════════════════════════════════════════
// Member360 — LTV Prophet
// Phase 30 — Block 3.5: The Forecast
// ═══════════════════════════════════════════════════════════════════════
//
// SVG chart showing LTV projection with Monte Carlo confidence bands.
// P50 is the solid line. P25-P75 is the mid-band. P10-P90 is the wide band.
// Historical revenue shown as solid, future as projection.
// The "today" line marks the boundary between real and predicted.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type {
  MemberLTVAnalysisResponse,
} from "../types";
import type {
  MemberPredictions
} from "../lib/memberPredictions";
import "./MemberLTVProphet.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberLTVProphetProps {
  ltvAnalysis: MemberLTVAnalysisResponse | null;
  predictions: MemberPredictions | null;
}

// ═══════════════════════════════════════════════════════════════════════
// CHART CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const W = 480;
const H = 240;
const PAD = { top: 20, right: 20, bottom: 35, left: 55 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const MONTHS = 24;

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Scale month index (0-24) to X pixel */
function scaleX(month: number): number {
  return PAD.left + (month / MONTHS) * CHART_W;
}

/** Scale currency value to Y pixel (inverted) */
function scaleY(value: number, maxY: number): number {
  return PAD.top + CHART_H - (value / maxY) * CHART_H;
}

/** Generate SVG path from array of [x, y] points */
function pointsToPath(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  return (
    `M ${points[0][0]},${points[0][1]}` +
    points
      .slice(1)
      .map((p) => ` L ${p[0]},${p[1]}`)
      .join("")
  );
}

/** Generate SVG area path (closed polygon for band) */
function pointsToAreaPath(
  topPoints: Array<[number, number]>,
  bottomPoints: Array<[number, number]>,
): string {
  if (topPoints.length === 0) return "";
  const forward = topPoints.map((p) => `L ${p[0]},${p[1]}`).join(" ");
  const backward = [...bottomPoints]
    .reverse()
    .map((p) => `L ${p[0]},${p[1]}`)
    .join(" ");
  return `M ${topPoints[0][0]},${topPoints[0][1]} ${forward} ${backward} Z`;
}

/** Format currency for axis labels */
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `₡${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₡${(value / 1_000).toFixed(0)}K`;
  return `₡${value}`;
}

/** Format month index for X axis */
function formatMonth(month: number): string {
  if (month === 0) return "Hoy";
  if (month === 12) return "12m";
  if (month === 24) return "24m";
  return `${month}`;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberLTVProphet({
  ltvAnalysis,
  predictions,
}: MemberLTVProphetProps) {
  const ltv = predictions?.ltvProjection ?? null;
  const currentLTV = ltv?.current ?? ltvAnalysis?.current_ltv ?? 0;

  // ── Y-axis scaling ───────────────────────────────────────────────
  const maxY = useMemo(() => {
    if (!ltv) return Math.max(currentLTV * 1.5, 100_000);
    const candidates = [
      ltv.projected12m.upper,
      ltv.projected24m.upper,
      ...ltv.monthlyTrajectory.map((m) => m.upper),
    ];
    const maxVal = Math.max(...candidates, currentLTV);
    return Math.ceil(maxVal / 50_000) * 50_000 || 100_000;
  }, [ltv, currentLTV]);

  // ── Monthly trajectory → SVG paths ───────────────────────────────
  const curves = useMemo(() => {
    if (!ltv) return null;

    const p50Points: Array<[number, number]> = [];
    const band25_75Top: Array<[number, number]> = [];
    const band25_75Bot: Array<[number, number]> = [];
    const band10_90Top: Array<[number, number]> = [];
    const band10_90Bot: Array<[number, number]> = [];

    // Start from current
    const startX: [number, number] = [scaleX(0), scaleY(currentLTV, maxY)];
    p50Points.push(startX);
    band25_75Top.push(startX);
    band25_75Bot.push(startX);
    band10_90Top.push(startX);
    band10_90Bot.push(startX);

    for (const m of ltv.monthlyTrajectory) {
      const x = scaleX(m.month);
      const predictedY: [number, number] = [x, scaleY(m.predicted, maxY)];
      const lowerY: [number, number] = [x, scaleY(m.lower, maxY)];
      const upperY: [number, number] = [x, scaleY(m.upper, maxY)];

      // Wider band (P10-P90 approximation: ±60% of the band)
      const wideFactor = 1.6;
      const wideLower: [number, number] = [
        x,
        scaleY(Math.max(0, m.predicted - (m.predicted - m.lower) * wideFactor), maxY),
      ];
      const wideUpper: [number, number] = [
        x,
        scaleY(m.predicted + (m.upper - m.predicted) * wideFactor, maxY),
      ];

      p50Points.push(predictedY);
      band25_75Top.push(upperY);
      band25_75Bot.push(lowerY);
      band10_90Top.push(wideUpper);
      band10_90Bot.push(wideLower);
    }

    return {
      p50: pointsToPath(p50Points),
      band25_75: pointsToAreaPath(band25_75Top, band25_75Bot),
      band10_90: pointsToAreaPath(band10_90Top, band10_90Bot),
    };
  }, [ltv, currentLTV, maxY]);

  // ── Y-axis grid lines ────────────────────────────────────────────
  const yTicks = useMemo(() => {
    const ticks: Array<{ y: number; label: string }> = [];
    const step = maxY <= 200_000 ? 50_000 : maxY <= 500_000 ? 100_000 : 200_000;
    for (let v = 0; v <= maxY; v += step) {
      ticks.push({ y: scaleY(v, maxY), label: formatCurrency(v) });
    }
    return ticks;
  }, [maxY]);

  // ── 12m / 24m projection markers ─────────────────────────────────
  const projectionMarkers = useMemo(() => {
    if (!ltv) return [];
    return [
      {
        month: 12,
        x: scaleX(12),
        band: ltv.projected12m,
        label: "12m",
      },
      {
        month: 24,
        x: scaleX(24),
        band: ltv.projected24m,
        label: "24m",
      },
    ];
  }, [ltv]);

  // ── Empty state ──────────────────────────────────────────────────
  if (!ltv && !ltvAnalysis) {
    return (
      <div className="glass-m360-ltv">
        <p className="glass-m360-ltv__empty">Sin datos LTV disponibles</p>
      </div>
    );
  }

  return (
    <div className="glass-m360-ltv">
      {/* ── Summary cards ── */}
      <div className="glass-m360-ltv__summary">
        <div className="glass-m360-ltv__summary-card">
          <span className="glass-m360-ltv__summary-label">LTV Actual</span>
          <span className="glass-m360-ltv__summary-value">
            {formatCurrency(currentLTV)}
          </span>
        </div>
        {ltv && (
          <>
            <div className="glass-m360-ltv__summary-card">
              <span className="glass-m360-ltv__summary-label">Proyección 12m</span>
              <span className="glass-m360-ltv__summary-value">
                {formatCurrency(ltv.projected12m.estimate)}
              </span>
              <span className="glass-m360-ltv__summary-band">
                {formatCurrency(ltv.projected12m.lower)} –{" "}
                {formatCurrency(ltv.projected12m.upper)}
              </span>
            </div>
            <div className="glass-m360-ltv__summary-card">
              <span className="glass-m360-ltv__summary-label">Proyección 24m</span>
              <span className="glass-m360-ltv__summary-value">
                {formatCurrency(ltv.projected24m.estimate)}
              </span>
              <span className="glass-m360-ltv__summary-band">
                {formatCurrency(ltv.projected24m.lower)} –{" "}
                {formatCurrency(ltv.projected24m.upper)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── SVG Chart ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="glass-m360-ltv__chart"
        role="img"
        aria-label="Proyección LTV con bandas de confianza"
      >
        <defs>
          {/* Gradient for P10-P90 band */}
          <linearGradient id="m360-ltv-band-wide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.08" />
            <stop offset="50%" stopColor="var(--color-gold-400)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0.08" />
          </linearGradient>
          {/* Gradient for P25-P75 band */}
          <linearGradient id="m360-ltv-band-narrow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.25" />
            <stop offset="50%" stopColor="var(--color-gold-400)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* ── Grid lines ── */}
        {yTicks.map((tick) => (
          <g key={tick.label}>
            <line
              x1={PAD.left}
              y1={tick.y}
              x2={W - PAD.right}
              y2={tick.y}
              stroke="var(--color-surface-3)"
              strokeWidth="0.5"
              opacity="0.5"
            />
            <text
              x={PAD.left - 6}
              y={tick.y + 3}
              textAnchor="end"
              fontSize="8"
              fill="var(--color-silver-600)"
              fontFamily="var(--font-mono)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* ── X-axis labels ── */}
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((m) => (
          <text
            key={m}
            x={scaleX(m)}
            y={H - 8}
            textAnchor="middle"
            fontSize="8"
            fill="var(--color-silver-600)"
            fontFamily="var(--font-mono)"
          >
            {formatMonth(m)}
          </text>
        ))}

        {/* ── Current LTV horizontal line ── */}
        <line
          x1={PAD.left}
          y1={scaleY(currentLTV, maxY)}
          x2={W - PAD.right}
          y2={scaleY(currentLTV, maxY)}
          stroke="var(--color-silver-500)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
          opacity="0.4"
        />

        {/* ── Today vertical line ── */}
        <line
          x1={scaleX(0)}
          y1={PAD.top}
          x2={scaleX(0)}
          y2={PAD.top + CHART_H}
          stroke="var(--color-silver-400)"
          strokeWidth="0.6"
          strokeDasharray="3 3"
          opacity="0.5"
        />
        <text
          x={scaleX(0)}
          y={PAD.top - 5}
          textAnchor="middle"
          fontSize="7"
          fill="var(--color-silver-400)"
          fontFamily="var(--font-mono)"
        >
          Hoy
        </text>

        {/* ── Confidence bands (only if predictions available) ── */}
        {curves && (
          <>
            {/* P10-P90 wide band */}
            <path
              d={curves.band10_90}
              fill="url(#m360-ltv-band-wide)"
              className="glass-m360-ltv__band-wide"
            />
            {/* P25-P75 narrow band */}
            <path
              d={curves.band25_75}
              fill="url(#m360-ltv-band-narrow)"
              className="glass-m360-ltv__band-narrow"
            />
            {/* P50 line */}
            <path
              d={curves.p50}
              fill="none"
              stroke="var(--color-gold-400)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="glass-m360-ltv__line-p50"
            />
          </>
        )}

        {/* ── Projection markers (12m, 24m dots) ── */}
        {projectionMarkers.map((marker) => {
          const y = scaleY(marker.band.estimate, maxY);
          return (
            <g key={marker.month}>
              <circle
                cx={marker.x}
                cy={y}
                r="4"
                fill="var(--color-gold-400)"
                stroke="var(--color-surface-1)"
                strokeWidth="1.5"
              />
              {/* Confidence range line */}
              <line
                x1={marker.x}
                y1={scaleY(marker.band.upper, maxY)}
                x2={marker.x}
                y2={scaleY(marker.band.lower, maxY)}
                stroke="var(--color-gold-400)"
                strokeWidth="1.5"
                opacity="0.3"
              />
              {/* Top cap */}
              <line
                x1={marker.x - 4}
                y1={scaleY(marker.band.upper, maxY)}
                x2={marker.x + 4}
                y2={scaleY(marker.band.upper, maxY)}
                stroke="var(--color-gold-400)"
                strokeWidth="1"
                opacity="0.4"
              />
              {/* Bottom cap */}
              <line
                x1={marker.x - 4}
                y1={scaleY(marker.band.lower, maxY)}
                x2={marker.x + 4}
                y2={scaleY(marker.band.lower, maxY)}
                stroke="var(--color-gold-400)"
                strokeWidth="1"
                opacity="0.4"
              />
              <text
                x={marker.x}
                y={y - 10}
                textAnchor="middle"
                fontSize="8"
                fill="var(--color-gold-400)"
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                {formatCurrency(marker.band.estimate)}
              </text>
            </g>
          );
        })}

        {/* ── No-prediction fallback: just show current dot ── */}
        {!curves && (
          <circle
            cx={scaleX(0)}
            cy={scaleY(currentLTV, maxY)}
            r="5"
            fill="var(--color-silver-300)"
            stroke="var(--color-surface-1)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* ── Risk factors ── */}
      {ltv && ltv.riskFactors.length > 0 && (
        <div className="glass-m360-ltv__risks">
          {ltv.riskFactors.map((risk, i) => (
            <span
              key={i}
              className="glass-m360-ltv__risk-badge"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              {risk}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}