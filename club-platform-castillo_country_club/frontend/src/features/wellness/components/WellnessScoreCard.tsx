/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessScoreCard.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Score Card
   Composite wellness score: radial gauge + pentagon constellation
   + dimension bars + trend sparkline + milestone achievements.

   Proposals: P1 Wellness Orb · P2 Pentagon · P3 Halo ·
     P4 Ambient Level · P5 Focus · P6 Achievement ·
     P7 Pulse History · P8 Compliance · P9 Glass · P10 Motion
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { cn } from "@/shared/lib/utils";

import {
  calculateWellnessScore,
  WELLNESS_LEVEL_CONFIG,
} from "../types";
import type {
  WellnessReport,
  WellnessScoreData,
  WellnessMode,
} from "../types";
import "./WellnessScoreCard.css";

// ═══════════════════════════════════════════════════════════════
// §1  SVG Constants
// ═══════════════════════════════════════════════════════════════

const SVG_SIZE = 200;
const CENTER = SVG_SIZE / 2;
const RADIUS = 70;
const STROKE_WIDTH = 12;
const GLOW_STROKE_WIDTH = 28;
const ARC_DEG = 270;
const GAP_DEG = 90;
const ROTATION = 135;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VISIBLE_LENGTH = CIRCUMFERENCE * (ARC_DEG / 360);
const GAP_LENGTH = CIRCUMFERENCE * (GAP_DEG / 360);

const DASHARRAY = `${VISIBLE_LENGTH} ${GAP_LENGTH}`;
const EASE_CURVE = "cubic-bezier(0.16, 1, 0.3, 1)";
const GAUGE_DURATION = "1.8s";
const BAR_DURATION = "0.8s";

// Pentagon constants (P2)
const PENT_SIZE = 120;
const PENT_CX = PENT_SIZE / 2;
const PENT_CY = PENT_SIZE / 2;
const PENT_R = 44;

// Threshold milestones (P6)
const MILESTONES = [30, 50, 70, 85];

// ═══════════════════════════════════════════════════════════════
// §2  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessScoreCardProps {
  report: WellnessReport;
  previousReport?: WellnessReport;
  familyName?: string;
  onViewDetails?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// §3  Helpers
// ═══════════════════════════════════════════════════════════════

function pentagonVertex(index: number, score: number): { x: number; y: number } {
  const angle = (index / 5) * 2 * Math.PI - Math.PI / 2;
  const r = (score / 100) * PENT_R;
  return {
    x: PENT_CX + r * Math.cos(angle),
    y: PENT_CY + r * Math.sin(angle),
  };
}

function generateSparklinePts(
  composite: number,
  trend: number,
): number[] {
  const dir = trend > 0 ? 1 : trend < 0 ? -1 : 0;
  const v = Math.abs(trend) > 3 ? 8 : 4;
  const pts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const base = composite - dir * (4 - i) * (v / 4);
    const noise = Math.sin(i * 2.1) * 2;
    pts.push(Math.max(5, Math.min(95, base + noise)));
  }
  pts.push(composite);
  return pts;
}

function computeGhostPt(composite: number, trend: number): number {
  if (trend > 0) return Math.min(95, composite + 4);
  if (trend < 0) return Math.max(5, composite - 4);
  return composite;
}

// ═══════════════════════════════════════════════════════════════
// §4  Sub-components
// ═══════════════════════════════════════════════════════════════

function TrendBadge({ direction, value }: {
  direction: "up" | "down" | "flat";
  value: number;
  reduced: boolean;
}) {
  const cfg = {
    up: {
      icon: TrendingUp,
      color: "var(--color-emerald-400)",
      bg: "color-mix(in srgb, var(--color-emerald-400) 12%, transparent)",
      label: `+${value}`,
    },
    down: {
      icon: TrendingDown,
      color: "var(--color-rose-400)",
      bg: "color-mix(in srgb, var(--color-rose-400) 12%, transparent)",
      label: `${value}`,
    },
    flat: {
      icon: Minus,
      color: "var(--color-silver-400)",
      bg: "color-mix(in srgb, var(--color-silver-400) 8%, transparent)",
      label: "0",
    },
  }[direction];

  const Icon = cfg.icon;

  return (
    <div
      className="wsc__trend-badge"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
      aria-label={`Tendencia: ${direction === "up" ? "mejorando" : direction === "down" ? "bajando" : "estable"}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{cfg.label} vs. mes anterior</span>
    </div>
  );
}

function DimensionBar({
  label,
  score,
  color,
  description,
  isRevealed,
  delay,
  reduced,
  isFocused,
  onHover,
  onLeave,
}: {
  label: string;
  score: number;
  color: string;
  description: string;
  isRevealed: boolean;
  delay: number;
  reduced: boolean;
  isFocused: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={cn("wsc__dim", isFocused && "wsc__dim--focused")}
      title={description}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="wsc__dim-header">
        <span className="wsc__dim-label">{label}</span>
        <span className="wsc__dim-score" style={{ color }}>
          {score}
        </span>
      </div>
      <div
        className="wsc__dim-bar"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${score}%`}
      >
        <div
          className="wsc__dim-fill"
          style={{
            width: isRevealed ? `${score}%` : "0%",
            backgroundColor: color,
            transition: reduced
              ? "none"
              : `width ${BAR_DURATION} ${EASE_CURVE} ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

function PentagonConstellation({
  scoreData,
  hoveredIdx,
}: {
  scoreData: WellnessScoreData;
  hoveredIdx: number | null;
}) {
  const vertices = scoreData.dimensions.map((dim, i) => ({
    ...pentagonVertex(i, dim.score),
    dim,
    idx: i,
  }));

  const polygonStr = vertices
    .map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${PENT_SIZE} ${PENT_SIZE}`}
      className="wsc__pentagon"
      role="img"
      aria-label="Constelación de dimensiones"
    >
      {/* Background rings */}
      {[0.33, 0.66, 1].map((s) => (
        <circle
          key={s}
          cx={PENT_CX}
          cy={PENT_CY}
          r={PENT_R * s}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="0.5"
        />
      ))}

      {/* Spokes to center */}
      {vertices.map((v, i) => (
        <line
          key={`spoke-${i}`}
          x1={PENT_CX}
          y1={PENT_CY}
          x2={v.x}
          y2={v.y}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.4"
        />
      ))}

      {/* Polygon fill */}
      <polygon
        points={polygonStr}
        fill="var(--color-gold-400)"
        opacity="0.08"
        className="wsc__pent-fill"
      />

      {/* Polygon stroke */}
      <polygon
        points={polygonStr}
        fill="none"
        stroke="var(--color-gold-400)"
        strokeWidth="0.8"
        opacity="0.3"
      />

      {/* Vertices */}
      {vertices.map((v) => {
        const isHovered = hoveredIdx === v.idx;
        const isWeak = v.dim.score < 40;
        return (
          <circle
            key={v.idx}
            cx={v.x}
            cy={v.y}
            r={isHovered ? 4 : 3}
            fill={v.dim.color}
            opacity={isHovered ? 1 : isWeak ? 0.5 : 0.7}
            className={isWeak ? "wsc__vertex--weak" : ""}
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </svg>
  );
}

function TrendSparkline({
  composite,
  trend,
}: {
  composite: number;
  trend: number;
}) {
  const pts = generateSparklinePts(composite, trend);
  const ghost = computeGhostPt(composite, trend);
  const w = 60;
  const h = 16;

  const polyline = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (p / 100) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const ghostX = w;
  const ghostY = h - (ghost / 100) * h;
  const lastX = ((pts.length - 1) / (pts.length - 1)) * w;
  const lastY = h - (pts[pts.length - 1] / 100) * h;

  const dir = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
  const color =
    dir === "up"
      ? "var(--color-emerald-400)"
      : dir === "down"
        ? "var(--color-rose-400)"
        : "var(--color-silver-400)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="wsc__sparkline">
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle
        cx={lastX}
        cy={lastY}
        r="2"
        fill={color}
        className="wsc__spark-dot"
      />
      <circle
        cx={ghostX}
        cy={ghostY}
        r="1.5"
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        strokeDasharray="1.5 1.5"
        opacity="0.4"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessScoreCard({
  report,
  previousReport,
  familyName,
  onViewDetails,
  className,
}: WellnessScoreCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const rafRef = useRef<number>(0);
  const [hoveredDim, setHoveredDim] = useState<number | null>(null);

  // ── Score calculation ──
  const scoreData: WellnessScoreData = useMemo(
    () => calculateWellnessScore(report, previousReport),
    [report, previousReport],
  );

  const hasData = report.total_activities > 0;

  // ── Animation state ──
  const [isRevealed, setIsRevealed] = useState(prefersReducedMotion);
  const [displayScore, setDisplayScore] = useState(
    prefersReducedMotion ? scoreData.composite : 0,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsRevealed(true);
      return;
    }
    const timer = setTimeout(() => setIsRevealed(true), 150);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || !hasData) {
      setDisplayScore(scoreData.composite);
      return;
    }
    const target = scoreData.composite;
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scoreData.composite, prefersReducedMotion, hasData]);

  // ── Derived ──
  const levelConfig = WELLNESS_LEVEL_CONFIG[scoreData.level];
  const scoreColor = levelConfig.color;
  const dashOffset = VISIBLE_LENGTH * (1 - scoreData.composite / 100);
  const isLowScore =
    scoreData.level === "critical" || scoreData.level === "low";
  const mode: WellnessMode =
    scoreData.composite < 30
      ? "critical"
      : scoreData.composite < 70
        ? "alert"
        : "calm";

  const trendDir: "up" | "down" | "flat" =
    scoreData.trend > 0 ? "up" : scoreData.trend < 0 ? "down" : "flat";

  // ── Milestones (P6) ──
  const prevComposite = previousReport
    ? calculateWellnessScore(previousReport).composite
    : 0;
  const crossedMilestone = MILESTONES.find(
    (m) => prevComposite < m && scoreData.composite >= m,
  );

  // ── Handlers ──
  const handleDimHover = useCallback((idx: number) => setHoveredDim(idx), []);
  const handleDimLeave = useCallback(() => setHoveredDim(null), []);

  // ── Empty ──
  if (!hasData) {
    return (
      <div className={cn("glass-wsc", className)} data-level={scoreData.level}>
        <EmptyState
          icon={<Activity size={28} />}
          title="Sin datos de bienestar"
          description="Registre actividades para comenzar a ver su score de bienestar."
        />
      </div>
    );
  }

  // ── Summary ──
  const summaryParts = [
    `${report.total_activities} actividades`,
    `${Math.round((new Date(report.period_end).getTime() - new Date(report.period_start).getTime()) / 86_400_000)} días`,
    report.streak_days > 0 ? `Racha ${report.streak_days}d` : null,
    report.total_calories > 0
      ? `${(report.total_calories / 1000).toFixed(1)}k cal`
      : null,
  ].filter(Boolean);

  return (
    <div
      className={cn("glass-wsc", className)}
      data-level={scoreData.level}
      data-mode={mode}
    >
      {/* ── Header ── */}
      <div className="wsc__header">
        <div className="wsc__header-left">
          <div
            className="wsc__header-icon"
            style={{
              backgroundColor: `color-mix(in srgb, ${scoreColor} 15%, transparent)`,
            }}
          >
            <span style={{ color: scoreColor }}>
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h3 className="wsc__header-title">Score de Bienestar</h3>
            {familyName && (
              <p className="wsc__header-family">{familyName}</p>
            )}
          </div>
        </div>
        <div className="wsc__header-right">
          <TrendSparkline composite={scoreData.composite} trend={scoreData.trend} />
          <TrendBadge
            direction={trendDir}
            value={scoreData.trend}
            reduced={prefersReducedMotion}
          />
        </div>
      </div>

      {/* ── Body: Gauge + Pentagon + Dimensions ── */}
      <div className="wsc__body">
        {/* ── SVG Radial Gauge ── */}
        <div
          className="wsc__gauge-wrap"
          role="meter"
          aria-valuenow={scoreData.composite}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Score de bienestar: ${scoreData.composite} de 100, nivel ${levelConfig.label}`}
        >
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="wsc__gauge-svg"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="var(--color-surface-3)"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={DASHARRAY}
              strokeLinecap="round"
              transform={`rotate(${ROTATION} ${CENTER} ${CENTER})`}
            />

            {/* Glow layer (P3: Halo + shimmer) */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={scoreColor}
              strokeWidth={GLOW_STROKE_WIDTH}
              strokeDasharray={DASHARRAY}
              strokeDashoffset={isRevealed ? dashOffset : VISIBLE_LENGTH}
              strokeLinecap="round"
              transform={`rotate(${ROTATION} ${CENTER} ${CENTER})`}
              className={cn(
                "wsc__gauge-glow",
                isLowScore && !prefersReducedMotion && "wsc__gauge-glow--alert",
              )}
              style={{
                opacity: isLowScore && !prefersReducedMotion ? undefined : 0.12,
                transition: prefersReducedMotion
                  ? "none"
                  : `stroke-dashoffset ${GAUGE_DURATION} ${EASE_CURVE} 0.2s`,
              }}
            />

            {/* Main arc */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={scoreColor}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={DASHARRAY}
              strokeDashoffset={isRevealed ? dashOffset : VISIBLE_LENGTH}
              strokeLinecap="round"
              transform={`rotate(${ROTATION} ${CENTER} ${CENTER})`}
              style={{
                transition: prefersReducedMotion
                  ? "none"
                  : `stroke-dashoffset ${GAUGE_DURATION} ${EASE_CURVE} 0.2s`,
              }}
            />

            {/* Threshold markers */}
            {MILESTONES.map((threshold) => {
              const angle = ROTATION + (threshold / 100) * ARC_DEG;
              const rad = ((angle - 90) * Math.PI) / 180;
              const x = CENTER + RADIUS * Math.cos(rad);
              const y = CENTER + RADIUS * Math.sin(rad);
              const isCrossed = scoreData.composite >= threshold;
              return (
                <circle
                  key={threshold}
                  cx={x}
                  cy={y}
                  r={2}
                  fill={isCrossed ? "var(--color-gold-400)" : "var(--color-silver-600)"}
                  opacity={isCrossed ? 0.9 : 0.4}
                  className={isCrossed && crossedMilestone === threshold ? "wsc__milestone-burst" : ""}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="wsc__gauge-center">
            <span className="wsc__gauge-score" style={{ color: scoreColor }}>
              {displayScore}
            </span>
            <span className="wsc__gauge-level" style={{ color: scoreColor }}>
              {levelConfig.label}
            </span>
          </div>

          {/* Milestone badge (P6) */}
          {crossedMilestone && !prefersReducedMotion && (
            <div className="wsc__achievement" data-burst="">
              <Sparkles size={12} />
              <span>Nivel alcanzado</span>
            </div>
          )}
        </div>

        {/* ── Pentagon (P2) ── */}
        <PentagonConstellation
          scoreData={scoreData}
          hoveredIdx={hoveredDim}
        />

        {/* ── Dimension Bars (P5) ── */}
        <div className="wsc__dimensions">
          {scoreData.dimensions.map((dim, index) => (
            <DimensionBar
              key={dim.id}
              label={dim.label}
              score={dim.score}
              color={dim.color}
              description={dim.description}
              isRevealed={isRevealed}
              delay={300 + index * 100}
              reduced={prefersReducedMotion}
              isFocused={hoveredDim === index}
              onHover={() => handleDimHover(index)}
              onLeave={handleDimLeave}
            />
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="wsc__footer">
        <p className="wsc__footer-text">
          Basado en {summaryParts.join(" · ")}
        </p>
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="wsc__footer-btn"
          >
            Ver Análisis Detallado
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}