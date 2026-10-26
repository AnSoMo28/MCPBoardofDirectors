// ═══════════════════════════════════════════════════════════════════════
// Member360 — Portrait Orbital Rings
// Phase 30 — Block 3.1: The Visual Anchor
// ═══════════════════════════════════════════════════════════════════════
//
// The iconic visualization: 6 orbital rings around a central temperature
// orb. Each ring = one vital sign dimension. Inner rings spin faster
// because what matters most moves first.
//
// The orb IS the member — its color, its pulse, its warmth.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  MemberTemperature,
  MemberState,
  VitalSign,
} from "../types";

import { MEMBER_STATE_DISPLAY, VITAL_SIGN_DISPLAY } from "../types";
import type { PortraitRingProps } from "../lib/memberSignals";
import "./MemberPortrait.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberPortraitProps {
  temperature: MemberTemperature;
  vitalSigns: VitalSign[];
  portraitRings: PortraitRingProps[];
  memberName: string;
  tier: string;
  state: MemberState;
  size?: "sm" | "md" | "lg";
}

interface RingWithVital extends PortraitRingProps {
  vitalSign: VitalSign | undefined;
  display: { icon: string; label: string; color: string } | undefined;
}

// ═══════════════════════════════════════════════════════════════════════
// SIZE MAP
// ═══════════════════════════════════════════════════════════════════════

const SIZE_MAP = {
  sm: { svg: 120, label: "sm" },
  md: { svg: 160, label: "md" },
  lg: { svg: 200, label: "lg" },
} as const;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberPortrait({
  temperature,
  vitalSigns,
  portraitRings,
  memberName,
  tier,
  state,
  size = "lg",
}: MemberPortraitProps) {
  const [hoveredRing, setHoveredRing] = useState<string | null>(null);

  const stateDisplay = MEMBER_STATE_DISPLAY[state];
  const sizeConfig = SIZE_MAP[size];
  const center = 50;

  // Merge rings with vital sign data
  const ringsWithVital = useMemo<RingWithVital[]>(() => {
    return portraitRings.map((ring) => ({
      ...ring,
      vitalSign: vitalSigns.find((vs) => vs.name === ring.dimension),
      display: VITAL_SIGN_DISPLAY[ring.dimension as keyof typeof VITAL_SIGN_DISPLAY],
    }));
  }, [portraitRings, vitalSigns]);

  // Orb radii by size
  const orbGlowR = size === "lg" ? 14 : size === "md" ? 11 : 9;
  const orbCoreR = size === "lg" ? 10 : size === "md" ? 8 : 6;
  const fontSize = size === "lg" ? 8 : size === "md" ? 7 : 6;

  return (
    <div
      className="glass-m360-portrait"
      data-size={sizeConfig.label}
      data-member-state={state}
    >
      {/* SVG — Orbital rings + central orb */}
      <svg
        viewBox="0 0 100 100"
        className="glass-m360-portrait__svg"
        role="img"
        aria-label={`Retrato de ${memberName}: temperatura ${temperature.composite}, estado ${stateDisplay.label}`}
      >
        {/* Definitions — filters and gradients */}
        <defs>
          {/* Glow filter for orb */}
          <filter id="m360-orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>

          {/* Glow filter for rings */}
          <filter id="m360-ring-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
          </filter>
        </defs>

        {/* ── Orbital rings ── */}
        {ringsWithVital.map((ring, i) => {
          const isHovered = hoveredRing === ring.dimension;
          return (
            <g key={ring.dimension}>
              {/* Track (background) */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke="var(--color-surface-3)"
                strokeWidth={ring.strokeWidth * 0.5}
                opacity={0.3}
              />

              {/* Active arc */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={isHovered ? ring.strokeWidth * 1.3 : ring.strokeWidth}
                strokeLinecap="round"
                strokeDasharray={ring.dashArray}
                opacity={isHovered ? 0.95 : ring.opacity}
                filter={isHovered ? "url(#m360-ring-glow)" : undefined}
                className="glass-m360-portrait__ring"
                style={
                  {
                    "--ring-index": i,
                    "--ring-duration": `${ring.orbitDurationSec}s`,
                  } as React.CSSProperties
                }
                onMouseEnter={() => setHoveredRing(ring.dimension)}
                onMouseLeave={() => setHoveredRing(null)}
                cursor="pointer"
              />
            </g>
          );
        })}

        {/* ── Central orb ── */}

        {/* Outer glow layer */}
        <circle
          cx={center}
          cy={center}
          r={orbGlowR}
          fill={stateDisplay.color}
          opacity={0.15}
          filter="url(#m360-orb-glow)"
          className="glass-m360-portrait__orb-glow"
        />

        {/* Mid glow */}
        <circle
          cx={center}
          cy={center}
          r={orbGlowR * 0.75}
          fill={stateDisplay.color}
          opacity={0.25}
          className="glass-m360-portrait__orb-mid"
        />

        {/* Core */}
        <circle
          cx={center}
          cy={center}
          r={orbCoreR}
          fill={stateDisplay.color}
          opacity={0.85}
          className="glass-m360-portrait__orb-core"
        />

        {/* Temperature text */}
        <text
          x={center}
          y={center + 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-silver-100)"
          fontSize={fontSize}
          fontWeight="700"
          fontFamily="var(--font-mono)"
          className="glass-m360-portrait__temp-text"
        >
          {temperature.composite}
        </text>

        {/* Trend arrow — tiny, above temperature */}
        <text
          x={center}
          y={center - fontSize * 0.9}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-silver-300)"
          fontSize={fontSize * 0.7}
          fontFamily="var(--font-mono)"
        >
          {temperature.momentum.velocity > 0.1
            ? "↑"
            : temperature.momentum.velocity < -0.1
              ? "↓"
              : "→"}
        </text>
      </svg>

      {/* ── Hover tooltip for ring ── */}
      {hoveredRing && (
        <RingTooltip
          ring={ringsWithVital.find((r) => r.dimension === hoveredRing)!}
          state={state}
        />
      )}

      {/* ── Labels below portrait ── */}
      <div className="glass-m360-portrait__labels">
        <span className="glass-m360-portrait__name">{memberName}</span>
        <span
          className="glass-m360-portrait__state"
          style={{ color: stateDisplay.color }}
        >
          {stateDisplay.icon} {stateDisplay.label}
        </span>
        <span className="glass-m360-portrait__tier">{tier}</span>
      </div>

      {/* ── Ring legend (only in lg) ── */}
      {size === "lg" && (
        <div className="glass-m360-portrait__legend">
          {ringsWithVital.map((ring) => (
            <div
              key={ring.dimension}
              className="glass-m360-portrait__legend-item"
              data-highlighted={hoveredRing === ring.dimension || undefined}
              onMouseEnter={() => setHoveredRing(ring.dimension)}
              onMouseLeave={() => setHoveredRing(null)}
            >
              <span
                className="glass-m360-portrait__legend-dot"
                style={{ background: ring.color }}
              />
              <span className="glass-m360-portrait__legend-name">
                {ring.display?.label ?? ring.dimension}
              </span>
              <span className="glass-m360-portrait__legend-value">
                {ring.vitalSign?.value ?? "—"}
              </span>
              <span
                className="glass-m360-portrait__legend-trend"
                data-trend={ring.vitalSign?.trend ?? "stable"}
              >
                {ring.vitalSign?.trend === "improving"
                  ? "↑"
                  : ring.vitalSign?.trend === "declining"
                    ? "↓"
                    : "→"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RING TOOLTIP — Appears on ring hover
// ═══════════════════════════════════════════════════════════════════════

function RingTooltip({
  ring,
  state,
}: {
  ring: RingWithVital;
  state: MemberState;
}) {
  const vital = ring.vitalSign;
  const display = ring.display;

  return (
    <div
      className="glass-m360-portrait__tooltip"
      data-member-state={state}
    >
      <div className="glass-m360-portrait__tooltip-header">
        <span
          className="glass-m360-portrait__tooltip-dot"
          style={{ background: ring.color }}
        />
        <span className="glass-m360-portrait__tooltip-name">
          {display?.icon} {display?.label ?? ring.dimension}
        </span>
      </div>

      {vital && (
        <div className="glass-m360-portrait__tooltip-body">
          <div className="glass-m360-portrait__tooltip-row">
            <span>Valor</span>
            <span className="glass-m360-portrait__tooltip-value">
              {vital.value}/100
            </span>
          </div>
          <div className="glass-m360-portrait__tooltip-row">
            <span>Estado</span>
            <span data-status={vital.status}>{vital.status}</span>
          </div>
          <div className="glass-m360-portrait__tooltip-row">
            <span>Tendencia</span>
            <span data-trend={vital.trend}>
              {vital.trend === "improving"
                ? "↑ Mejorando"
                : vital.trend === "declining"
                  ? "↓ Cayendo"
                  : "→ Estable"}
            </span>
          </div>
          <div className="glass-m360-portrait__tooltip-row">
            <span>Peso</span>
            <span>{Math.round(vital.weight * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}