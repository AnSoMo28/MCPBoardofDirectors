// src/features/facilities/components/FacilitiesHealthScore.tsx
// ═══════════════════════════════════════════════════════════
// FACILITIES HEALTH SCORE — "El Pulso Vital"
//
// Ring gauge + factor breakdown + trend + alerts.
//
// Living Component Protocol (7/7):
//   ✅ SENSE 1: RESPIRACIÓN — ring fill, bar fill stagger
//   ✅ SENSE 2: REACCIÓN — factor rows hover, ring hover scale
//   ✅ SENSE 3: MEMORIA — score + trend + factor details
//   ✅ SENSE 4: INTENCIÓN — alerts as urgency indicators
//   ✅ SENSE 5: SINIESTRÍA — critical score = pulse border
//   ✅ SENSE 6: EMPATÍA — data-mode responsive
//   ✅ SENSE 7: NARRATIVA — health summary sentence
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";

import type {
  FacilityHealthResponse,
  HealthFactor,
  FacilitiesDashboardMode,
  FacilitiesAdvisorInsight,
} from "../types";

import "./FacilitiesHealthScore.css";

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function scoreToStatus(score: number): "good" | "warning" | "critical" {
  if (score >= 70) return "good";
  if (score >= 40) return "warning";
  return "critical";
}

function trendToDir(trend: string): "up" | "down" | "stable" {
  if (trend === "improving") return "up";
  if (trend === "declining") return "down";
  return "stable";
}

function trendLabel(trend: string): string {
  if (trend === "improving") return "Mejorando";
  if (trend === "declining") return "Descendiendo";
  return "Estable";
}

// ═══════════════════════════════════════════════════════════
// NARRATIVE — Sense 7
// ═══════════════════════════════════════════════════════════

function buildNarrative(
  health: FacilityHealthResponse,
  criticalCount: number,
): string {
  const parts: string[] = [];
  parts.push(`Health Score: ${health.score}/100 (${health.grade}).`);

  if (health.trend === "improving") {
    parts.push("Tendencia: mejorando.");
  } else if (health.trend === "declining") {
    parts.push("Tendencia: descendiendo — requiere atención.");
  } else {
    parts.push("Tendencia: estable.");
  }

  parts.push(`${health.factors.length} factores evaluados.`);

  if (health.alerts.length > 0) {
    parts.push(`${health.alerts.length} alerta${health.alerts.length > 1 ? "s" : ""} activa${health.alerts.length > 1 ? "s" : ""}.`);
  }

  if (criticalCount > 0) {
    parts.push(`${criticalCount} insight${criticalCount > 1 ? "s" : ""} crítico${criticalCount > 1 ? "s" : ""} del advisor.`);
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

export interface FacilitiesHealthScoreProps {
  health: FacilityHealthResponse;
  ambientMode?: FacilitiesDashboardMode;
  advisorInsights?: FacilitiesAdvisorInsight[];
}

// ═══════════════════════════════════════════════════════════
// SUB-COMPONENT: Factor Row
// ═══════════════════════════════════════════════════════════

function FactorRow({
  factor,
  index,
  prefersReduced,
}: {
  factor: HealthFactor;
  index: number;
  prefersReduced: boolean;
}) {
  const status = scoreToStatus(factor.score);

  return (
    <div
      className="fac-health__factor"
      data-status={status}
      style={
        prefersReduced
          ? undefined
          : ({
              "--stagger-i": index,
              "--factor-pct": `${factor.score}%`,
            } as React.CSSProperties)
      }
    >
      <span className="fac-health__factor-name">{factor.name}</span>
      <div className="fac-health__factor-bar">
        <div className="fac-health__factor-fill" data-status={status} />
      </div>
      <span className="fac-health__factor-value" data-status={status}>
        {factor.score}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function FacilitiesHealthScore({
  health,
  ambientMode = "calm",
  advisorInsights = [],
}: FacilitiesHealthScoreProps) {
  const prefersReduced = useReducedMotion();

  const status = scoreToStatus(health.score);
  const trend = trendToDir(health.trend);
  const ringOffset = RING_CIRCUMFERENCE - (health.score / 100) * RING_CIRCUMFERENCE;

  const criticalCount = useMemo(
    () => advisorInsights.filter((i) => i.severity === "critical").length,
    [advisorInsights],
  );

  const narrative = buildNarrative(health, criticalCount);

  return (
    <div
      className="fac-health"
      data-mode={ambientMode}
      data-status={status}
      data-prefers-reduced={prefersReduced ? "true" : undefined}
    >
      {/* Narrative */}
      <p className="fac-health__narrative">{narrative}</p>

      {/* Ring + Meta */}
      <div className="fac-health__top">
        {/* Ring Gauge */}
        <div className="fac-health__ring-wrap">
          <svg
            width={88}
            height={88}
            viewBox="0 0 88 88"
            className="fac-health__ring-svg"
            role="img"
            aria-label={`Health score: ${health.score} de 100`}
          >
            <circle
              cx={44}
              cy={44}
              r={RING_RADIUS}
              fill="none"
              className="fac-health__ring-bg"
            />
            <circle
              cx={44}
              cy={44}
              r={RING_RADIUS}
              fill="none"
              className="fac-health__ring-fill"
              data-status={status}
              style={{ "--ring-offset": ringOffset } as React.CSSProperties}
            />
          </svg>
          <div className="fac-health__ring-center">
            <span className="fac-health__ring-score" data-status={status}>
              {health.score}
            </span>
            <span className="fac-health__ring-label">Health</span>
          </div>
        </div>

        {/* Meta */}
        <div className="fac-health__meta">
          <div className="fac-health__grade-row">
            <span className="fac-health__grade" data-status={status}>
              {health.grade}
            </span>
            <span className="fac-health__level">{health.level}</span>
          </div>

          <div className="fac-health__trend" data-trend={trend}>
            <span className="fac-health__trend-icon">
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
            {trendLabel(health.trend)}
          </div>

          {health.alerts.length > 0 && (
            <div className="fac-health__alerts">
              {health.alerts.slice(0, 2).map((alert, i) => (
                <div key={i} className="fac-health__alert">
                  <span className="fac-health__alert-dot" />
                  {alert}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Factors */}
      <div className="fac-health__factors">
        {health.factors.map((factor, i) => (
          <FactorRow
            key={factor.name}
            factor={factor}
            index={i}
            prefersReduced={prefersReduced}
          />
        ))}
      </div>
    </div>
  );
}