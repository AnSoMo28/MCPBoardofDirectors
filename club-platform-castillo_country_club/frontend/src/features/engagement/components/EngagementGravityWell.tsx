// src/features/engagement/components/EngagementGravityWell.tsx
// ═══════════════════════════════════════════════════════════
// "The Gravity Well" — Retention Physics Visualization
// Castillo Country Club — Phase 31 "The Voice"
//
// SVG gravitational field. Family/club at center.
// Club forces as concentric rings radiating outward.
// Arrow trajectory = exit velocity. Red zone = escape threshold.
//
// Retention is not a "risk score" — it's physics.
// Some families are in deep wells (impossible to leave).
// Others are on the rim (one bad experience away).
//
// Glass namespace: glass-eng-gravity
// Data attributes: data-state, data-trend
// Rules: R34, R35, R38
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  GravitationalModel,
  EngagementDashboardFamily,
} from "../types";
import {
  classifyGravitationalState,
  computeDaysToEscape,
  getGravityStateColor,
} from "../config";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementGravityWell.css";

// ── Layout constants ───────────────────────────────────────

const SVG_SIZE = 420;
const CENTER = SVG_SIZE / 2;
const MAX_RING_RADIUS = 170;
const CORE_RADIUS = 28;

// ── Ring configuration ─────────────────────────────────────

interface RingConfig {
  label: string;
  key: keyof Pick<GravitationalModel, "clubGravity" | "socialGravity" | "experienceGravity" | "identityGravity">;
  color: string;
  baseRadius: number;
}

const RING_CONFIGS: RingConfig[] = [
  {
    label: "Identidad",
    key: "identityGravity",
    color: "var(--color-gold-400)",
    baseRadius: 55,
  },
  {
    label: "Experiencia",
    key: "experienceGravity",
    color: "var(--color-emerald-400)",
    baseRadius: 90,
  },
  {
    label: "Social",
    key: "socialGravity",
    color: "var(--color-teal-400)",
    baseRadius: 125,
  },
  {
    label: "Club",
    key: "clubGravity",
    color: "var(--color-sage-400)",
    baseRadius: 160,
  },
];

// ── Helpers ────────────────────────────────────────────────

/**
 * Map a gravity value (0-100) to a ring radius.
 * Higher gravity = ring closer to center (deeper well).
 * Lower gravity = ring farther from center (shallow well).
 */
function gravityToRadius(gravity: number, baseRadius: number): number {
  // Invert: high gravity → small radius (deep well)
  const normalized = 1 - gravity / 100;
  return baseRadius + normalized * (MAX_RING_RADIUS - baseRadius) * 0.6;
}

/**
 * Compute exit velocity arrow endpoint.
 * Arrow points outward from center, length proportional to velocity.
 */
function computeExitArrow(
  exitVelocity: number,
  angle: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const innerR = CORE_RADIUS + 4;
  const arrowLength = (exitVelocity / 100) * (MAX_RING_RADIUS - CORE_RADIUS) * 0.8;
  const outerR = innerR + arrowLength;

  return {
    x1: CENTER + Math.cos(angle) * innerR,
    y1: CENTER + Math.sin(angle) * innerR,
    x2: CENTER + Math.cos(angle) * outerR,
    y2: CENTER + Math.sin(angle) * outerR,
  };
}

// ── Component ──────────────────────────────────────────────

interface EngagementGravityWellProps {
  gravitational: GravitationalModel | null;
  aggregateGravity: {
    avgGravity: number;
    avgExitVelocity: number;
    escapeTrajectoryCount: number;
    deepWellCount: number;
    overallTrend: "attracting" | "stable" | "repelling";
  } | null;
  topAtRiskFamilies?: EngagementDashboardFamily[];
  onFamilyClick?: (familyId: string) => void;
}

/**
 * "The Gravity Well" — retention physics visualization.
 * Shows the gravitational field that holds families in the club.
 * When gravity weakens, families drift. When exit velocity exceeds
 * the escape threshold, departure becomes inevitable.
 */
export function EngagementGravityWell({ gravitational, aggregateGravity }: EngagementGravityWellProps) {
  const [hoveredRing, setHoveredRing] = useState<string | null>(null);

  // Escape zone radius
  const escapeZoneR = useMemo(() => {
    if (!gravitational) return MAX_RING_RADIUS;
    return gravityToRadius(
      100 - gravitational.escapeThreshold,
      MAX_RING_RADIUS,
    );
  }, [gravitational]);

  // Exit velocity arrow
  const exitArrow = useMemo(() => {
    if (!gravitational || gravitational.exitVelocity < 10) return null;
    // Arrow points at 45 degrees (top-right)
    return computeExitArrow(gravitational.exitVelocity, -Math.PI / 4);
  }, [gravitational]);

  // Days to escape
  const daysToEscape = useMemo(() => {
    if (!gravitational) return null;
    return computeDaysToEscape(
      gravitational.exitVelocity,
      gravitational.escapeThreshold,
      gravitational.totalGravity,
    );
  }, [gravitational]);

  // Gravitational state
  const gravState = useMemo(() => {
    if (!gravitational) return null;
    return classifyGravitationalState(
      gravitational.totalGravity,
      gravitational.exitVelocity,
    );
  }, [gravitational]);

  // Perturbation waves (recent events affecting gravity)
  const perturbationCount = useMemo(() => {
    if (!gravitational) return 0;
    return gravitational.exitVelocity > 50 ? 3 :
           gravitational.exitVelocity > 30 ? 2 :
           gravitational.exitVelocity > 15 ? 1 : 0;
  }, [gravitational]);

  if (!gravitational || !aggregateGravity) {
    return (
      <div data-glass-eng-gravity="" data-state="none" className="eng-gravity">
        <div className="eng-gravity__header">
          <h3 className="eng-gravity__title">Campo Gravitacional</h3>
        </div>
        <EmptyState
          title="Sin datos gravitacionales"
          description="El modelo gravitacional se computará cuando haya datos de familias."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Calcular campo
            </Button>
          }
        />
      </div>
    );
  }

  const stateColor = getGravityStateColor(gravState ?? "stable_orbit");

  return (
    <div
      data-glass-eng-gravity=""
      data-state={gravState}
      data-trend={gravitational.trend}
      className="eng-gravity"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-gravity__header">
        <h3 className="eng-gravity__title">Campo Gravitacional</h3>
        <div className="eng-gravity__header-stats">
          <span
            className="eng-gravity__state-badge"
            style={{ color: stateColor, backgroundColor: `color-mix(in srgb, ${stateColor} 12%, transparent)` }}
          >
            {gravState === "deep_well" ? "Pozo Profundo" :
             gravState === "stable_orbit" ? "Órbita Estable" :
             gravState === "drifting" ? "A la Deriva" : "Trayectoria de Escape"}
          </span>
          {daysToEscape !== null && (
            <span className="eng-gravity__days-badge">
              {daysToEscape} días al umbral
            </span>
          )}
        </div>
      </div>

      {/* ── SVG Visualization ────────────────────────────────── */}
      <div className="eng-gravity__canvas">
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="Campo gravitacional de retención"
        >
          <defs>
            {/* Gradient for well depth effect */}
            <radialGradient id="eng-grav-well" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={stateColor} stopOpacity={0.15} />
              <stop offset="40%" stopColor={stateColor} stopOpacity={0.06} />
              <stop offset="100%" stopColor={stateColor} stopOpacity={0} />
            </radialGradient>

            {/* Escape zone gradient */}
            <radialGradient id="eng-grav-escape" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="var(--color-rose-400)" stopOpacity={0} />
              <stop offset="95%" stopColor="var(--color-rose-400)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--color-rose-400)" stopOpacity={0.15} />
            </radialGradient>

            {/* Arrow marker */}
            <marker
              id="eng-grav-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-rose-400)" />
            </marker>

            {/* Glow for core */}
            <filter id="eng-grav-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Well depth background ─────────────────────────── */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={MAX_RING_RADIUS + 10}
            fill="url(#eng-grav-well)"
            className="eng-gravity__well-bg"
          />

          {/* ── Escape zone (outer red ring) ──────────────────── */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={escapeZoneR}
            fill="none"
            stroke="var(--color-rose-400)"
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.3}
            className="eng-gravity__escape-zone"
          />
          <text
            x={CENTER + escapeZoneR + 4}
            y={CENTER - 4}
            fontSize={8}
            fill="var(--color-rose-400)"
            fontFamily="var(--font-mono, 'DM Mono', monospace)"
            opacity={0.6}
          >
            escape
          </text>

          {/* ── Force rings ───────────────────────────────────── */}
          <g className="eng-gravity__rings">
            {RING_CONFIGS.map((ring) => {
              const gravityValue = gravitational[ring.key];
              const radius = gravityToRadius(gravityValue, ring.baseRadius);
              const isHovered = hoveredRing === ring.key;
              const strength = gravityValue / 100;

              return (
                <g
                  key={ring.key}
                  className="eng-gravity__ring"
                  onMouseEnter={() => setHoveredRing(ring.key)}
                  onMouseLeave={() => setHoveredRing(null)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Ring stroke */}
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={radius}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={isHovered ? 2.5 : 1 + strength * 1.5}
                    strokeOpacity={isHovered ? 0.7 : 0.15 + strength * 0.3}
                    strokeDasharray={strength < 0.3 ? "4 4" : "none"}
                    className="eng-gravity__ring-circle"
                  />

                  {/* Ring glow (only if strong) */}
                  {strength > 0.6 && (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={radius}
                      fill="none"
                      stroke={ring.color}
                      strokeWidth={4}
                      strokeOpacity={0.06}
                      className="eng-gravity__ring-glow"
                    />
                  )}

                  {/* Label */}
                  <text
                    x={CENTER + radius + 6}
                    y={CENTER + 3}
                    fontSize={isHovered ? 10 : 8}
                    fill={isHovered ? ring.color : "var(--color-silver-500)"}
                    fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                    fontWeight={isHovered ? "600" : "400"}
                    className="eng-gravity__ring-label"
                  >
                    {ring.label}
                  </text>

                  {/* Value on hover */}
                  {isHovered && (
                    <text
                      x={CENTER + radius + 6}
                      y={CENTER + 15}
                      fontSize={9}
                      fill={ring.color}
                      fontFamily="var(--font-mono, 'DM Mono', monospace)"
                      fontWeight="600"
                    >
                      {gravityValue}/100
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* ── Perturbation waves ────────────────────────────── */}
          <g className="eng-gravity__perturbations">
            {Array.from({ length: perturbationCount }).map((_, i) => {
              const delay = i * 0.8;
              const startR = CORE_RADIUS + 10 + i * 20;
              return (
                <circle
                  key={`pert-${i}`}
                  cx={CENTER}
                  cy={CENTER}
                  r={startR}
                  fill="none"
                  stroke="var(--color-rose-400)"
                  strokeWidth={1}
                  className="eng-gravity__perturbation"
                  style={{ animationDelay: `${delay}s` }}
                />
              );
            })}
          </g>

          {/* ── Exit velocity arrow ───────────────────────────── */}
          {exitArrow && (
            <g className="eng-gravity__exit-arrow">
              <line
                x1={exitArrow.x1}
                y1={exitArrow.y1}
                x2={exitArrow.x2}
                y2={exitArrow.y2}
                stroke="var(--color-rose-400)"
                strokeWidth={2.5}
                markerEnd="url(#eng-grav-arrow)"
                opacity={0.8}
                className="eng-gravity__arrow-line"
              />
              {/* Arrow label */}
              <text
                x={exitArrow.x2 + 8}
                y={exitArrow.y2 - 4}
                fontSize={9}
                fill="var(--color-rose-400)"
                fontFamily="var(--font-mono, 'DM Mono', monospace)"
                fontWeight="600"
              >
                EV: {gravitational.exitVelocity}
              </text>
            </g>
          )}

          {/* ── Core (the club/family) ────────────────────────── */}
          <g className="eng-gravity__core" filter="url(#eng-grav-glow)">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={CORE_RADIUS}
              fill={stateColor}
              fillOpacity={0.2}
              stroke={stateColor}
              strokeWidth={2}
              strokeOpacity={0.6}
              className="eng-gravity__core-circle"
            />
            <text
              x={CENTER}
              y={CENTER - 6}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fill="var(--color-silver-200)"
              fontFamily="var(--font-display, 'Italiana', serif)"
              fontWeight="700"
            >
              {gravitational.totalGravity}
            </text>
            <text
              x={CENTER}
              y={CENTER + 10}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fill="var(--color-silver-400)"
              fontFamily="var(--font-mono, 'DM Mono', monospace)"
            >
              gravedad
            </text>
          </g>
        </svg>
      </div>

      {/* ── Metrics Strip ────────────────────────────────────── */}
      <div className="eng-gravity__metrics">
        <div className="eng-gravity__metric">
          <span className="eng-gravity__metric-label">Gravedad Total</span>
          <span className="eng-gravity__metric-value">{gravitational.totalGravity}</span>
          <div className="eng-gravity__metric-bar">
            <div
              className="eng-gravity__metric-fill"
              style={{
                width: `${gravitational.totalGravity}%`,
                backgroundColor: stateColor,
              }}
            />
          </div>
        </div>
        <div className="eng-gravity__metric">
          <span className="eng-gravity__metric-label">Exit Velocity</span>
          <span className="eng-gravity__metric-value eng-gravity__metric-value--danger">
            {gravitational.exitVelocity}
          </span>
          <div className="eng-gravity__metric-bar">
            <div
              className="eng-gravity__metric-fill"
              style={{
                width: `${gravitational.exitVelocity}%`,
                backgroundColor: "var(--color-rose-400)",
              }}
            />
          </div>
        </div>
        <div className="eng-gravity__metric">
          <span className="eng-gravity__metric-label">Escape Trajectory</span>
          <span className="eng-gravity__metric-value eng-gravity__metric-value--danger">
            {aggregateGravity.escapeTrajectoryCount}
          </span>
          <span className="eng-gravity__metric-sub">familias</span>
        </div>
        <div className="eng-gravity__metric">
          <span className="eng-gravity__metric-label">Deep Well</span>
          <span className="eng-gravity__metric-value eng-gravity__metric-value--safe">
            {aggregateGravity.deepWellCount}
          </span>
          <span className="eng-gravity__metric-sub">familias</span>
        </div>
      </div>
    </div>
  );
}