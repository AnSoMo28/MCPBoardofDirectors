// src/features/engagement/components/EngagementHealthScore.tsx
// ═══════════════════════════════════════════════════════════
// Engagement Health Score — 5-Factor Composite Gauge
// Castillo Country Club — Phase 31 "The Voice"
//
// CLEAN REWRITE of V1. Changes:
//   - framer-motion → CSS keyframes
//   - Tailwind inline classes → CSS file
//   - useReducedMotion hook → CSS @media (prefers-reduced-motion)
//   - useBreakpoint hook → CSS @media queries
//   - cn() utility → plain class names
//   - score-utils import → inlined logic
//   - className prop → glass namespace
//
// Verified against types.ts:
//   HealthScoreFactor: { label, value, weight, contribution }
//   EngagementVelocity: { current_score, score_30d, score_60d,
//     velocity_per_week, acceleration, trajectory, projection_90d,
//     projection_range }
//
// Glass namespace: glass-eng-vitals
// Data attributes: data-score-level, data-trajectory
// Rules: R34, R35, R38, #1 (tokens), #18 (reduced motion),
//        #62 (type verification)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target
} from "lucide-react";
import type { HealthScoreFactor, EngagementVelocity } from "../types";
import "./EngagementHealthScore.css";

// ── Score level classification (inlined) ───────────────────

type ScoreLevel = "excellent" | "good" | "attention" | "critical";

function classifyScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 45) return "attention";
  return "critical";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "var(--color-emerald-400)";
  if (score >= 60) return "var(--color-teal-400)";
  if (score >= 45) return "var(--color-amber-400)";
  return "var(--color-rose-400)";
}

function getGradientStops(score: number): [string, string] {
  if (score >= 80) return ["var(--color-gold-400)", "var(--color-emerald-300)"];
  if (score >= 60) return ["var(--color-gold-400)", "var(--color-teal-300)"];
  if (score >= 45) return ["var(--color-gold-400)", "var(--color-amber-400)"];
  return ["var(--color-gold-400)", "var(--color-rose-400)"];
}

function getTrajectoryLabel(trajectory: string): string {
  if (trajectory === "improving") return "Mejorando";
  if (trajectory === "declining") return "En descenso";
  return "Estable";
}

function getProjectionLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excepcional", color: "var(--color-emerald-400)" };
  if (score >= 65) return { label: "Saludable", color: "var(--color-teal-400)" };
  if (score >= 45) return { label: "Atención", color: "var(--color-amber-400)" };
  return { label: "Crítico", color: "var(--color-rose-400)" };
}

// ── Animated Counter (pure JS, no framer-motion) ───────────

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const duration = 600;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }, [value]);

  return <>{display}</>;
}

// ── Component ──────────────────────────────────────────────

interface EngagementHealthScoreProps {
  score: number;
  grade: string;
  factors: HealthScoreFactor[];
  velocity: EngagementVelocity | null;
}

/**
 * 5-factor composite health gauge with velocity tracking,
 * trajectory classification, and 90-day projection.
 */
export function EngagementHealthScore({
  score,
  grade,
  factors,
  velocity,
}: EngagementHealthScoreProps) {
  const [alertDismissed, setAlertDismissed] = useState(false);

  // ── Derived ─────────────────────────────────────────────
  const scoreLevel = classifyScoreLevel(score);
  const color = getScoreColor(score);
  const [gradStart, gradEnd] = getGradientStops(score);
  const projLevel = getProjectionLevel(velocity?.projection_90d ?? score);

  const trajectoryType = velocity?.trajectory ?? "stable";

  const TrendIcon = useMemo(() => {
    if (!velocity) return Minus;
    if (velocity.trajectory === "improving") return TrendingUp;
    if (velocity.trajectory === "declining") return TrendingDown;
    return Minus;
  }, [velocity]);

  // ── SVG arc params ──────────────────────────────────────
  const cx = 100;
  const cy = 90;
  const r = 65;
  const strokeW = 10;
  const circumference = Math.PI * r;
  const dashLength = circumference * (score / 100);
  const dashOffset = circumference - dashLength;

  const gradientId = "eng-vitals-gradient";

  // ── Dismiss alert ───────────────────────────────────────
  const handleDismissAlert = useCallback(() => {
    setAlertDismissed(true);
  }, []);

  const showAlert = velocity?.trajectory === "declining" && !alertDismissed;

  return (
    <div
      data-glass-eng-vitals=""
      data-score-level={scoreLevel}
      data-trajectory={trajectoryType}
      className="eng-vitals"
    >
      {/* ── Main layout: gauge + details ──────────────────── */}
      <div className="eng-vitals__layout">
        {/* Gauge SVG */}
        <div className="eng-vitals__gauge">
          <svg
            viewBox="0 0 200 110"
            className="eng-vitals__gauge-svg"
            aria-label={`Engagement Health Score: ${score} de 100, grado ${grade}`}
            role="img"
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={gradStart} />
                <stop offset="100%" stopColor={gradEnd} />
              </linearGradient>
            </defs>

            {/* Background arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeW}
              strokeLinecap="round"
            />

            {/* Foreground arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="eng-vitals__gauge-arc"
            />

            {/* Score counter */}
            <text
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              fill="var(--color-silver-100)"
              fontSize="32"
              fontWeight="bold"
              fontFamily="var(--font-display, 'Italiana', serif)"
            >
              <AnimatedCounter value={score} />
            </text>

            {/* Grade */}
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              fill={color}
              fontSize="14"
              fontWeight="bold"
              fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
            >
              {grade}
            </text>

            {/* Label */}
            <text
              x={cx}
              y={cy + 24}
              textAnchor="middle"
              fill="var(--color-silver-400)"
              fontSize="9"
              fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
            >
              Engagement Health
            </text>
          </svg>
        </div>

        {/* Details: metrics + factors */}
        <div className="eng-vitals__details">
          {/* Velocity / Trajectory / Projection cards */}
          <div className="eng-vitals__metrics">
            {/* Velocity */}
            <div className="eng-vitals__metric-card">
              <p className="eng-vitals__metric-label">Velocidad</p>
              <div className="eng-vitals__metric-row">
                <TrendIcon
                  size={16}
                  className="eng-vitals__metric-trend-icon"
                  style={{ color }}
                />
                <span className="eng-vitals__metric-value">
                  {velocity
                    ? `${velocity.velocity_per_week >= 0 ? "+" : ""}${velocity.velocity_per_week.toFixed(1)}`
                    : "—"}
                </span>
                <span className="eng-vitals__metric-unit">/sem</span>
              </div>
            </div>

            {/* Trajectory */}
            <div className="eng-vitals__metric-card">
              <p className="eng-vitals__metric-label">Trayectoria</p>
              <span
                className="eng-vitals__trajectory-badge"
                data-trajectory={trajectoryType}
              >
                {getTrajectoryLabel(trajectoryType)}
              </span>
            </div>

            {/* 90d Projection */}
            <div className="eng-vitals__metric-card">
              <p className="eng-vitals__metric-label">Proyección 90d</p>
              <div className="eng-vitals__metric-row">
                <Target
                  size={16}
                  className="eng-vitals__metric-trend-icon"
                  style={{ color: projLevel.color }}
                />
                <span className="eng-vitals__metric-value">
                  {velocity?.projection_90d ?? "—"}
                </span>
                <span className="eng-vitals__metric-unit">
                  ({projLevel.label})
                </span>
              </div>
            </div>
          </div>

          {/* Factor grid */}
          <div className="eng-vitals__factors">
            {factors.map((f: HealthScoreFactor) => (
              <div key={f.label} className="eng-vitals__factor-card">
                <div className="eng-vitals__factor-header">
                  <p className="eng-vitals__factor-name">{f.label}</p>
                  <span className="eng-vitals__factor-weight">
                    {f.weight}%
                  </span>
                </div>
                <p className="eng-vitals__factor-value">
                  {f.contribution.toFixed(1)}
                </p>
                <div className="eng-vitals__factor-bar">
                  <div
                    className="eng-vitals__factor-fill"
                    style={{
                      width: `${Math.min(100, f.value * 100)}%`,
                      background: `linear-gradient(90deg, ${gradStart}, ${color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alert (declining trajectory) ──────────────────── */}
      {showAlert && velocity && (
        <div
          className="eng-vitals__alert"
          role="alert"
        >
          <AlertTriangle size={16} className="eng-vitals__alert-icon" />
          <div className="eng-vitals__alert-body">
            <p className="eng-vitals__alert-text">
              <span className="eng-vitals__alert-bold">
                Velocity {velocity.velocity_per_week.toFixed(1)}/sem:
              </span>{" "}
              si la tendencia continúa, el score cae a{" "}
              <span className="eng-vitals__alert-projection" style={{ color: projLevel.color }}>
                {projLevel.label} ({velocity.projection_90d})
              </span>{" "}
              en ~90 días.
              {velocity.acceleration < 0 &&
                " El descenso se está acelerando."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissAlert}
            className="eng-vitals__alert-dismiss"
            aria-label="Cerrar alerta"
          >
            <span>✕</span>
          </button>
        </div>
      )}
    </div>
  );
}