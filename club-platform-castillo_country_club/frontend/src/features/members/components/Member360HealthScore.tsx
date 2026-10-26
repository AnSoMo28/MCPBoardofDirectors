/**
 * Member360HealthScore — Vital Signs Monitor
 * Phase 30 — Block 4.2: How They're Doing
 *
 * Central gauge with animated glow. Each health factor becomes
 * a mini circular gauge (not a horizontal bar). Trend arrows
 * inline. Benchmark indicator at the bottom.
 *
 * The "medical monitor" aesthetic — clean, precise, alive.
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";
import type { MemberHealthScoreResponse } from "../types";
import { buildFactorRows, getHealthLevelColor } from "../types";
import {
  MEMBER_HEALTH_LEVEL_DISPLAY,
  type MemberHealthLevel,
} from "@/shared/types/domain-enums";

import "./Member360HealthScore.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface Member360HealthScoreProps {
  data: MemberHealthScoreResponse;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SVG CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const CENTRAL_R = 38;
const CENTRAL_STROKE = 6;
const CENTRAL_CIRC = 2 * Math.PI * CENTRAL_R;
const CENTRAL_CX = 50;

const FACTOR_R = 16;
const FACTOR_STROKE = 3;
const FACTOR_CIRC = 2 * Math.PI * FACTOR_R;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function Member360HealthScore({
  data,
  className,
}: Member360HealthScoreProps) {
  const reduced = useReducedMotion();
  const levelDisplay =
    MEMBER_HEALTH_LEVEL_DISPLAY[data.health_level as MemberHealthLevel];
  const factors = useMemo(
    () => buildFactorRows(data.factors),
    [data.factors],
  );
  const centralOffset =
    CENTRAL_CIRC - (data.composite_score / 100) * CENTRAL_CIRC;
  const ringColor = getHealthLevelColor(data.health_level);

  const TrendIcon =
    data.trend === "improving"
      ? TrendingUp
      : data.trend === "declining"
        ? TrendingDown
        : Minus;

  return (
    <div
      className={cn("glass-m360-health", className)}
      data-health-level={data.health_level}
    >
      {/* ── Ambient glow behind central gauge ── */}
      <div
        className="glass-m360-health__glow"
        style={{ background: `radial-gradient(circle, ${ringColor} 0%, transparent 70%)` }}
      />

      <div className="glass-m360-health__content">
        {/* ── Central gauge ── */}
        <div className="glass-m360-health__central">
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            className="glass-m360-health__central-svg"
          >
            {/* Track */}
            <circle
              cx={CENTRAL_CX}
              cy={CENTRAL_CX}
              r={CENTRAL_R}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={CENTRAL_STROKE}
            />
            {/* Value arc */}
            <circle
              cx={CENTRAL_CX}
              cy={CENTRAL_CX}
              r={CENTRAL_R}
              fill="none"
              stroke={ringColor}
              strokeWidth={CENTRAL_STROKE}
              strokeLinecap="round"
              strokeDasharray={CENTRAL_CIRC}
              strokeDashoffset={reduced ? centralOffset : CENTRAL_CIRC}
              transform={`rotate(-90 ${CENTRAL_CX} ${CENTRAL_CX})`}
              className={
                reduced
                  ? ""
                  : "glass-m360-health__central-arc"
              }
              style={
                reduced ? { strokeDashoffset: centralOffset } : undefined
              }
            />
            {/* Score text */}
            <text
              x={CENTRAL_CX}
              y={CENTRAL_CX - 4}
              textAnchor="middle"
              fill="var(--color-silver-100)"
              fontSize="20"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {Math.round(data.composite_score)}
            </text>
            {/* Level label */}
            <text
              x={CENTRAL_CX}
              y={CENTRAL_CX + 10}
              textAnchor="middle"
              fill="var(--color-silver-400)"
              fontSize="8"
            >
              {levelDisplay?.label ?? data.health_level}
            </text>
          </svg>
        </div>

        {/* ── Factor gauges grid ── */}
        <div className="glass-m360-health__factors">
          {factors.map((f, i) => {
            const factorOffset =
              FACTOR_CIRC - (f.score / 100) * FACTOR_CIRC;

            return (
              <div
                key={f.name}
                className="glass-m360-health__factor"
                style={
                  {
                    "--stagger-i": i,
                    "--factor-color": f.color,
                  } as React.CSSProperties
                }
              >
                {/* Mini ring */}
                <div className="glass-m360-health__factor-ring-wrap">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                  >
                    <circle
                      cx="20"
                      cy="20"
                      r={FACTOR_R}
                      fill="none"
                      stroke="var(--color-surface-3)"
                      strokeWidth={FACTOR_STROKE}
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={FACTOR_R}
                      fill="none"
                      stroke={f.color}
                      strokeWidth={FACTOR_STROKE}
                      strokeLinecap="round"
                      strokeDasharray={FACTOR_CIRC}
                      strokeDashoffset={
                        reduced ? factorOffset : FACTOR_CIRC
                      }
                      transform="rotate(-90 20 20)"
                      className={
                        reduced
                          ? ""
                          : "glass-m360-health__factor-arc"
                      }
                      style={
                        reduced
                          ? { strokeDashoffset: factorOffset }
                          : undefined
                      }
                    />
                    <text
                      x="20"
                      y="21"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--color-silver-200)"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                    >
                      {Math.round(f.score)}
                    </text>
                  </svg>
                </div>

                {/* Label + trend */}
                <div className="glass-m360-health__factor-info">
                  <span className="glass-m360-health__factor-icon">
                    {f.icon}
                  </span>
                  <span className="glass-m360-health__factor-name">
                    {f.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Trend footer ── */}
      <div className="glass-m360-health__footer">
        <div className="glass-m360-health__trend">
          <TrendIcon
            className="w-3.5 h-3.5"
            style={{ color: ringColor }}
          />
          <span>
            {data.trend_detail ?? `Tendencia: ${data.trend}`}
          </span>
        </div>

        {/* Benchmark percentile bar */}
        {data.benchmark_percentile != null && (
          <div className="glass-m360-health__benchmark">
            <span className="glass-m360-health__benchmark-label">
              Percentil
            </span>
            <div className="glass-m360-health__benchmark-bar-wrap">
              <div
                className="glass-m360-health__benchmark-bar"
                style={{
                  width: `${Math.round(data.benchmark_percentile)}%`,
                  background: ringColor,
                }}
              />
            </div>
            <span className="glass-m360-health__benchmark-value">
              {Math.round(data.benchmark_percentile)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}