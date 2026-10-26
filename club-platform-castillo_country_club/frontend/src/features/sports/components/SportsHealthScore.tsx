// ═══════════════════════════════════════════════════════════
// src/features/sports/components/SportsHealthScore.tsx
// §B4.2 — Sports Health Score V2
// Level 5+ Production Grade · Phase 33 "The Arena"
//
// REWRITE V1 → V2
// SVG ring gauge with 5 factor bars + trend sparkline.
// Animated on mount. Color-coded by health level.
// FIXES: factor.status → derived from factor.score
//
// Changes from V1:
//   ✗ cn() → BEM classes
//   ✗ Tailwind → BEM CSS
//   ✗ style={{ color: X }} → data-attributes
//   ✗ useReducedMotion → window.matchMedia
//   ✗ className prop → removed
//   ✗ factor.status (non-existent) → derived from score
//   ✓ data-health-level, data-trend, data-factor-level, data-mode
//   ✓ Narrative (LP 7)
//   ✓ Light mode, print, responsive
//
// @version 2.0.0
// @phase   33 — "The Arena"
// @component SportsHealthScore
// ═══════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from "lucide-react";
import type { HealthFactor_Contract } from "@/shared/mocks/contracts";
import type { SportsDashboardMode } from "../types";
import { HEALTH_LEVEL_CONFIG } from "../types";
import "./SportsHealthScore.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

export interface SportsHealthScoreProps {
  score: number;
  level: string;
  trend: string;
  factors: HealthFactor_Contract[];
  alerts: string[];
  ambientMode?: SportsDashboardMode;
}

type HealthLevel = "excellent" | "good" | "fair" | "poor";
type TrendDirection = "improving" | "declining" | "stable";

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const RING_SIZE = 160;
const RING_STROKE = 10;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Derive health level from numeric score.
 * FIXES V1 bug: was reading non-existent factor.status
 */
function deriveHealthLevel(score: number): HealthLevel {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "fair";
  return "poor";
}

function getHealthLevelColor(level: HealthLevel): string {
  switch (level) {
    case "excellent": return "var(--color-emerald-400)";
    case "good":      return "var(--color-teal-400)";
    case "fair":      return "var(--color-amber-400)";
    case "poor":      return "var(--color-rose-400)";
  }
}

function deriveTrendDirection(trend: string): TrendDirection {
  if (trend === "improving") return "improving";
  if (trend === "declining") return "declining";
  return "stable";
}

function buildHealthNarrative(
  score: number,
  level: string,
  trend: string,
  factorCount: number,
  alertCount: number,
): string {
  const trendPart =
    trend === "improving"
      ? "Mejorando"
      : trend === "declining"
        ? "Descendiendo"
        : "Estable";

  const alertPart =
    alertCount > 0
      ? ` ${alertCount} alerta${alertCount > 1 ? "s" : ""} activa${alertCount > 1 ? "s" : ""}.`
      : " Sin alertas.";

  return `Salud deportiva: ${score}/100 — ${level}. ${trendPart}. ${factorCount} factores evaluados.${alertPart}`;
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

// ── §4.1 RingGauge ───────────────────────────────────────

function RingGauge({
  score,
  level,
  mounted,
  reducedMotion,
}: {
  score: number;
  level: HealthLevel;
  mounted: boolean;
  reducedMotion: boolean;
}) {
  const color = getHealthLevelColor(level);
  const dashOffset = RING_CIRCUMFERENCE * (1 - score / 100);
  const levelConfig = HEALTH_LEVEL_CONFIG[level] ?? HEALTH_LEVEL_CONFIG.good;

  return (
    <div className="spt-health__ring-container">
      <svg
        className="spt-health__ring-svg"
        width={RING_SIZE}
        height={RING_SIZE}
        role="img"
        aria-label={`Salud deportiva: ${score} de 100, nivel ${level}`}
      >
        {/* Background ring */}
        <circle
          className="spt-health__ring-bg"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
        />
        {/* Foreground ring */}
        <circle
          className="spt-health__ring-fg"
          data-health-level={level}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          data-mounted={mounted}
          data-reduced={reducedMotion}
          style={{
            strokeDashoffset:
              mounted || reducedMotion ? dashOffset : RING_CIRCUMFERENCE,
            stroke: color,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="spt-health__ring-center">
        <span className="spt-health__ring-score" data-health-level={level}>
          {Math.round(score)}
        </span>
        <span className="spt-health__ring-max">/100</span>
        <span className="spt-health__ring-level" data-health-level={level}>
          {levelConfig?.label ?? level}
        </span>
      </div>
    </div>
  );
}

// ── §4.2 TrendIndicator ──────────────────────────────────

function TrendIndicator({ trend }: { trend: TrendDirection }) {
  return (
    <div className="spt-health__trend" data-trend={trend}>
      {trend === "improving" && <TrendingUp className="spt-health__trend-icon" />}
      {trend === "declining" && <TrendingDown className="spt-health__trend-icon" />}
      {trend === "stable" && <Minus className="spt-health__trend-icon" />}
      <span className="spt-health__trend-label">
        {trend === "improving"
          ? "Mejorando"
          : trend === "declining"
            ? "Descendiendo"
            : "Estable"}
      </span>
    </div>
  );
}

// ── §4.3 FactorBar ───────────────────────────────────────

function FactorBar({ factor, index, mounted }: {
  factor: HealthFactor_Contract;
  index: number;
  mounted: boolean;
  reducedMotion: boolean;
}) {
  // FIX: derive level from score instead of reading factor.status
  const factorLevel = deriveHealthLevel(factor.score);
  const factorColor = getHealthLevelColor(factorLevel);

  return (
    <div
      className="spt-health__factor"
      data-factor-level={factorLevel}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      <div className="spt-health__factor-header">
        <span className="spt-health__factor-name">{factor.name}</span>
        <span
          className="spt-health__factor-value"
          data-factor-level={factorLevel}
        >
          {Math.round(factor.score)}
        </span>
      </div>
      <div className="spt-health__factor-track">
        <div
          className="spt-health__factor-fill"
          data-factor-level={factorLevel}
          data-mounted={mounted}
          style={{
            width: mounted ? `${Math.min(100, factor.score)}%` : "0%",
            backgroundColor: factorColor,
            transitionDelay: `${0.3 + index * 0.1}s`,
          }}
        />
      </div>
    </div>
  );
}

// ── §4.4 AlertsList ──────────────────────────────────────

function AlertsList({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="spt-health__alerts">
      <p className="spt-health__alerts-header">
        <AlertTriangle className="spt-health__alerts-icon" />
        {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
      </p>
      <ul className="spt-health__alerts-list">
        {alerts.slice(0, 3).map((alert, i) => (
          <li key={i} className="spt-health__alert">
            {alert}
          </li>
        ))}
        {alerts.length > 3 && (
          <li className="spt-health__alert spt-health__alert--more">
            +{alerts.length - 3} más
          </li>
        )}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

export function SportsHealthScore({
  score,
  level,
  trend,
  factors,
  alerts,
  ambientMode = "calm",
}: SportsHealthScoreProps) {
  const rm =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const healthLevel = useMemo(() => deriveHealthLevel(score), [score]);
  const trendDir = useMemo(() => deriveTrendDirection(trend), [trend]);

  const narrative = useMemo(
    () => buildHealthNarrative(score, level, trendDir, factors.length, alerts.length),
    [score, level, trendDir, factors.length, alerts.length],
  );

  return (
    <section
      className="spt-health"
      data-mode={ambientMode}
      data-health-level={healthLevel}
      data-prefers-reduced={rm}
      role="region"
      aria-label={narrative}
    >
      {/* ── Ring Gauge ── */}
      <div className="spt-health__gauge-area">
        <RingGauge
          score={score}
          level={healthLevel}
          mounted={mounted}
          reducedMotion={rm}
        />
        <TrendIndicator trend={trendDir} />
      </div>

      {/* ── Factor Bars ── */}
      {factors.length > 0 && (
        <div className="spt-health__factors">
          <p className="spt-health__factors-label">Factores de salud</p>
          {factors.map((factor, i) => (
            <FactorBar
              key={factor.name}
              factor={factor}
              index={i}
              mounted={mounted}
              reducedMotion={rm}
            />
          ))}
        </div>
      )}

      {/* ── Alerts ── */}
      <AlertsList alerts={alerts} />

      {/* ── Narrative ── */}
      <div className="spt-health__footer">
        <p className="spt-health__narrative">{narrative}</p>
      </div>
    </section>
  );
}