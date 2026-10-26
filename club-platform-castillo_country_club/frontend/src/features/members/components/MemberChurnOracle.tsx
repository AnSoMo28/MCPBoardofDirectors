// ═══════════════════════════════════════════════════════════════════════
// Member360 — Churn Oracle
// Phase 30 — Block 3.7: The Eye
// ═══════════════════════════════════════════════════════════════════════
//
// Horizontal timeline showing churn probability over time with
// intervention windows. A central "eye" that blinks when the
// prediction is urgent.
//
// - Curve: churn probability rising from current
// - Bands: Monte Carlo P10/P50/P90
// - Windows: intervention zones colored by status
// - Eye: central SVG ellipse, blinks faster as urgency increases
// - Threshold line: 50% churn probable mark
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type {
  MemberTemperature
} from "../types";
import type {
  MemberChurnPredictionResponse,
} from "../types";
import type {
  MemberPredictions,
  ChurnForecast,
} from "../lib/memberPredictions";
import "./MemberChurnOracle.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberChurnOracleProps {
  churnPrediction: MemberChurnPredictionResponse | null;
  predictions: MemberPredictions | null;
  temperature: MemberTemperature;
}

// ═══════════════════════════════════════════════════════════════════════
// CHART CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const W = 480;
const H = 200;
const PAD = { top: 25, right: 20, bottom: 30, left: 45 };
const CHART_W = W - PAD.left - PAD.right;
const CHART_H = H - PAD.top - PAD.bottom;
const MAX_DAYS = 180;
const THRESHOLD_PCT = 50;

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Scale day (0-180) to X pixel */
function scaleX(day: number): number {
  return PAD.left + (day / MAX_DAYS) * CHART_W;
}

/** Scale probability (0-100) to Y pixel (inverted) */
function scaleY(pct: number): number {
  return PAD.top + CHART_H - (pct / 100) * CHART_H;
}

/** Generate smooth churn curve from current probability + forecast */
function buildChurnCurve(
  currentPct: number,
  forecast: ChurnForecast | null,
  churnPrediction: MemberChurnPredictionResponse | null,
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const horizon = forecast?.daysToLikelyChurn ?? 90;
  const targetPct = forecast
    ? forecast.predictedProbability.estimate * 100
    : churnPrediction?.churn_score ?? currentPct;

  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const day = t * MAX_DAYS;
    // Logistic growth curve
    const growth = currentPct + (targetPct - currentPct) * (1 / (1 + Math.exp(-0.06 * (day - horizon * 0.5))));
    const clamped = Math.max(0, Math.min(100, growth));
    points.push([scaleX(day), scaleY(clamped)]);
  }
  return points;
}

/** Generate Monte Carlo band curves */
function buildBands(
  currentPct: number,
  forecast: ChurnForecast | null,
): { p10: Array<[number, number]>; p50: Array<[number, number]>; p90: Array<[number, number]> } | null {
  if (!forecast) return null;

  const percentiles = forecast.simulations.percentiles;
  const p10Target = percentiles[0] * 100;
  const p50Target = percentiles[2] * 100;
  const p90Target = percentiles[4] * 100;
  const horizon = forecast.daysToLikelyChurn ?? 90;

  const buildLine = (target: number): Array<[number, number]> => {
    const pts: Array<[number, number]> = [];
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const day = t * MAX_DAYS;
      const growth = currentPct + (target - currentPct) * (1 / (1 + Math.exp(-0.06 * (day - horizon * 0.5))));
      pts.push([scaleX(day), scaleY(Math.max(0, Math.min(100, growth)))]);
    }
    return pts;
  };

  return {
    p10: buildLine(p10Target),
    p50: buildLine(p50Target),
    p90: buildLine(p90Target),
  };
}

/** Build SVG path from points */
function pointsToPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return "";
  return `M ${pts[0][0]},${pts[0][1]}` + pts.slice(1).map((p) => ` L ${p[0]},${p[1]}`).join("");
}

/** Build closed area between two point arrays */
function pointsToArea(
  top: Array<[number, number]>,
  bottom: Array<[number, number]>,
): string {
  if (top.length === 0) return "";
  const fwd = top.map((p) => `L ${p[0]},${p[1]}`).join(" ");
  const bwd = [...bottom].reverse().map((p) => `L ${p[0]},${p[1]}`).join(" ");
  return `M ${top[0][0]},${top[0][1]} ${fwd} ${bwd} Z`;
}

/** Format day number */
function formatDay(day: number): string {
  if (day === 0) return "Hoy";
  if (day === 30) return "30d";
  if (day === 60) return "60d";
  if (day === 90) return "90d";
  if (day === 120) return "120d";
  if (day === 150) return "150d";
  if (day === 180) return "180d";
  return `${day}`;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberChurnOracle({
  churnPrediction,
  predictions,
  temperature,
}: MemberChurnOracleProps) {
  const forecast = predictions?.churnForecast ?? null;
  const windows = predictions?.windows.filter((w) =>
    w.metric.toLowerCase().includes("churn"),
  ) ?? [];
  const currentPct = forecast
    ? forecast.currentProbability * 100
    : churnPrediction?.churn_score ?? Math.max(0, 100 - temperature.composite);

  // ── Build curves ──────────────────────────────────────────────────
  const churnCurve = useMemo(
    () => buildChurnCurve(currentPct, forecast, churnPrediction),
    [currentPct, forecast, churnPrediction],
  );

  const bands = useMemo(
    () => buildBands(currentPct, forecast),
    [currentPct, forecast],
  );

  // ── Eye state ─────────────────────────────────────────────────────
  const eyeState = useMemo(() => {
    const urgentWindow = windows.find(
      (w) => w.status === "imminent" || w.status === "closing",
    );
    if (urgentWindow?.status === "imminent") {
      return { blink: "fast", color: "var(--color-rose-400)" };
    }
    if (urgentWindow?.status === "closing") {
      return { blink: "slow", color: "var(--color-amber-400)" };
    }
    return { blink: "none", color: "var(--color-emerald-400)" };
  }, [windows]);

  // ── Empty state ───────────────────────────────────────────────────
  if (!churnPrediction && !forecast) {
    return (
      <div className="glass-m360-oracle">
        <p className="glass-m360-oracle__empty">
          Sin datos de predicción de churn
        </p>
      </div>
    );
  }

  return (
    <div className="glass-m360-oracle">
      {/* ── Oracle Eye ── */}
      <div className="glass-m360-oracle__eye-section">
        <svg
          viewBox="0 0 80 50"
          className="glass-m360-oracle__eye-svg"
          role="img"
          aria-label={`Oracle eye: ${eyeState.blink}`}
        >
          {/* Eye shape */}
          <ellipse
            cx="40"
            cy="25"
            rx="30"
            ry="16"
            fill="none"
            stroke={eyeState.color}
            strokeWidth="2"
            opacity="0.6"
            className={`glass-m360-oracle__eye-shape glass-m360-oracle__eye-shape--${eyeState.blink}`}
          />
          {/* Iris */}
          <circle
            cx="40"
            cy="25"
            r="8"
            fill={eyeState.color}
            opacity="0.5"
            className={`glass-m360-oracle__eye-iris glass-m360-oracle__eye-iris--${eyeState.blink}`}
          />
          {/* Pupil */}
          <circle
            cx="40"
            cy="25"
            r="3.5"
            fill={eyeState.color}
            opacity="0.9"
          />
          {/* Highlight */}
          <circle cx="42" cy="23" r="1.5" fill="var(--color-silver-100)" opacity="0.7" />
        </svg>
        <div className="glass-m360-oracle__eye-label">
          <span className="glass-m360-oracle__eye-state" style={{ color: eyeState.color }}>
            {eyeState.blink === "fast" ? "● Vigilancia" : eyeState.blink === "slow" ? "◇ Observando" : "◈ Calma"}
          </span>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="glass-m360-oracle__summary">
        <div className="glass-m360-oracle__summary-item">
          <span className="glass-m360-oracle__summary-label">Probabilidad actual</span>
          <span className="glass-m360-oracle__summary-value" style={{ color: eyeState.color }}>
            {Math.round(currentPct)}%
          </span>
        </div>
        {forecast && (
          <>
            <div className="glass-m360-oracle__summary-item">
              <span className="glass-m360-oracle__summary-label">Días a churn probable</span>
              <span className="glass-m360-oracle__summary-value">
                {forecast.daysToLikelyChurn !== null ? `${forecast.daysToLikelyChurn}d` : "—"}
              </span>
            </div>
            <div className="glass-m360-oracle__summary-item">
              <span className="glass-m360-oracle__summary-label">Aceleración</span>
              <span className="glass-m360-oracle__summary-value">
                {forecast.acceleration > 0 ? "↑" : forecast.acceleration < 0 ? "↓" : "→"}{" "}
                {Math.abs(forecast.acceleration).toFixed(2)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── SVG Timeline ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="glass-m360-oracle__chart"
        role="img"
        aria-label="Timeline de predicción de churn"
      >
        <defs>
          <linearGradient id="m360-oracle-band-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-rose-400)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-rose-400)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* ── Y grid lines ── */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              y1={scaleY(v)}
              x2={W - PAD.right}
              y2={scaleY(v)}
              stroke="var(--color-surface-3)"
              strokeWidth="0.4"
              opacity="0.5"
            />
            <text
              x={PAD.left - 5}
              y={scaleY(v) + 3}
              textAnchor="end"
              fontSize="7"
              fill="var(--color-silver-600)"
              fontFamily="var(--font-mono)"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* ── X axis labels ── */}
        {[0, 30, 60, 90, 120, 150, 180].map((d) => (
          <text
            key={d}
            x={scaleX(d)}
            y={H - 6}
            textAnchor="middle"
            fontSize="7"
            fill="var(--color-silver-600)"
            fontFamily="var(--font-mono)"
          >
            {formatDay(d)}
          </text>
        ))}

        {/* ── Threshold line (50%) ── */}
        <line
          x1={PAD.left}
          y1={scaleY(THRESHOLD_PCT)}
          x2={W - PAD.right}
          y2={scaleY(THRESHOLD_PCT)}
          stroke="var(--color-amber-400)"
          strokeWidth="0.6"
          strokeDasharray="4 3"
          opacity="0.5"
        />
        <text
          x={W - PAD.right + 2}
          y={scaleY(THRESHOLD_PCT) + 3}
          fontSize="6"
          fill="var(--color-amber-400)"
          fontFamily="var(--font-mono)"
        >
          50%
        </text>

        {/* ── Today line ── */}
        <line
          x1={scaleX(0)}
          y1={PAD.top}
          x2={scaleX(0)}
          y2={PAD.top + CHART_H}
          stroke="var(--color-silver-400)"
          strokeWidth="0.5"
          strokeDasharray="3 3"
          opacity="0.4"
        />

        {/* ── Intervention windows ── */}
        {windows.map((w, i) => {
          const startDay = 0;
          const endDay = w.daysRemaining ?? 30;
          const x1 = scaleX(startDay);
          const x2 = scaleX(Math.min(endDay, MAX_DAYS));
          const fillColor =
            w.status === "imminent"
              ? "color-mix(in srgb, var(--color-rose-400) 12%, transparent)"
              : w.status === "closing"
                ? "color-mix(in srgb, var(--color-amber-400) 10%, transparent)"
                : "color-mix(in srgb, var(--color-emerald-400) 6%, transparent)";
          const borderColor =
            w.status === "imminent"
              ? "var(--color-rose-400)"
              : w.status === "closing"
                ? "var(--color-amber-400)"
                : "var(--color-emerald-400)";

          return (
            <g key={`${w.metric}-${i}`}>
              <rect
                x={x1}
                y={PAD.top}
                width={x2 - x1}
                height={CHART_H}
                fill={fillColor}
                stroke={borderColor}
                strokeWidth="0.5"
                strokeDasharray={w.status === "imminent" ? "none" : "3 2"}
                opacity={w.status === "imminent" ? 0.8 : 0.5}
                rx="2"
              />
              <text
                x={x1 + 4}
                y={PAD.top + 10}
                fontSize="6"
                fill={borderColor}
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {w.metric} ({w.daysRemaining ?? "?"}d)
              </text>
            </g>
          );
        })}

        {/* ── Monte Carlo bands ── */}
        {bands && (
          <>
            <path
              d={pointsToArea(bands.p90, bands.p10)}
              fill="url(#m360-oracle-band-grad)"
              className="glass-m360-oracle__band-outer"
            />
            <path
              d={pointsToPath(bands.p90)}
              fill="none"
              stroke="var(--color-rose-400)"
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="2 2"
            />
            <path
              d={pointsToPath(bands.p10)}
              fill="none"
              stroke="var(--color-rose-400)"
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="2 2"
            />
            <path
              d={pointsToPath(bands.p50)}
              fill="none"
              stroke="var(--color-rose-400)"
              strokeWidth="0.8"
              opacity="0.5"
              strokeDasharray="3 2"
            />
          </>
        )}

        {/* ── Main churn curve ── */}
        <path
          d={pointsToPath(churnCurve)}
          fill="none"
          stroke="var(--color-rose-400)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="glass-m360-oracle__curve"
        />

        {/* ── Current point ── */}
        <circle
          cx={scaleX(0)}
          cy={scaleY(currentPct)}
          r="4"
          fill="var(--color-rose-400)"
          stroke="var(--color-surface-1)"
          strokeWidth="1.5"
        />
        <text
          x={scaleX(0) + 8}
          y={scaleY(currentPct) - 6}
          fontSize="8"
          fill="var(--color-rose-400)"
          fontFamily="var(--font-mono)"
          fontWeight="700"
        >
          {Math.round(currentPct)}%
        </text>
      </svg>

      {/* ── Risk factors (compact) ── */}
      {forecast && forecast.riskFactors.length > 0 && (
        <div className="glass-m360-oracle__factors">
          {forecast.riskFactors.slice(0, 3).map((rf, i) => (
            <div
              key={i}
              className="glass-m360-oracle__factor"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <span className="glass-m360-oracle__factor-name">
                {rf.factor}
              </span>
              <span className="glass-m360-oracle__factor-trend" data-trend={rf.trend}>
                {rf.trend === "worsening" ? "↑" : rf.trend === "improving" ? "↓" : "→"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}