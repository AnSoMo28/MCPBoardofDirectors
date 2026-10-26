/**
 * @component PulseRadar (Fase 25 — REWRITE)
 * @namespace .glass-radar
 * @depends usePulseRadar, RadarLabel, PulseRadar.css, config/radar
 * @note Radar visualization: partial arcs (~270°), drops that travel
 *       from center generating arcs, connectors to labels.
 *       Timeline narrativa: hub → arcs → drops travel → labels.
 *       Backward-compatible: same props interface.
 * @import import '../PulseRadar.css';
 */

import { useState } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { usePulseRadar } from "../hooks/usePulseRadar";
import { getRingColor, getRingHex, RADAR_TIMELINE as T, RADAR_ARC } from "../config/radar";
import { RadarLabel } from "./RadarLabel";
import type { RadarRingData } from "../config/radar";
import "../PulseRadar.css";

/* ═══════════════════════════════════════
   Props
   ═══════════════════════════════════════ */

interface PulseRadarProps {
  rings: RadarRingData[];
  centerScore: number | null;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function PulseRadar({ rings, centerScore }: PulseRadarProps) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const radar = usePulseRadar(rings, centerScore);
  const { geometry, rings: renderRings } = radar;
  const { size, cx, cy } = geometry;
  const centerColor = getRingColor(centerScore);

  /* Count rings from outer to inner for stagger reversal */
  const totalRings = renderRings.length;

  return (
    <div className="glass-radar">
      <div className="glass-radar__body">
        {/* ═══ SVG Radar ═══ */}
        <div
          className="glass-radar__svg-wrap"
          style={{ width: size, height: size }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <svg
            className="glass-radar__svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={`Radar del club: score global ${centerScore ?? "sin datos"}`}
          >
            {/* Gooey filter (active during reveal) */}
            <defs>
              <filter id="glass-radar-goo" colorInterpolationFilters="sRGB">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  result="goo"
                />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>

            {/* ── Per-ring rendering ── */}
            {renderRings.map((ring) => {
              const outerIndex = totalRings - 1 - ring.index;
              const isCritical = ring.score != null && ring.score < 45;
              const isHealthy = ring.score != null && ring.score >= 80;
              const colorHex = getRingHex(ring.score);

              /* Timeline delays */
              const baseDelay = T.baseArcDelay + outerIndex * T.baseArcStagger;
              const travelDelay = T.travelDelay + ring.index * T.travelStagger;
              const breatheDelay = T.breatheDelay;
              const breatheDur = isCritical ? T.breatheFast : isHealthy ? T.breatheSlow : T.breatheNormal;

              /* Rotation: arcs start at 225° (bottom-left), we rotate to align */
              const rotDeg = RADAR_ARC.startDeg;

              return (
                <g
                  key={ring.id}
                  transform={`rotate(${rotDeg} ${cx} ${cy})`}
                >
                  {/* Layer 1: Base arc (structure, faint) */}
                  <circle
                    className="glass-radar__base-arc"
                    cx={cx}
                    cy={cy}
                    r={ring.r}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={ring.strokeW}
                    strokeLinecap="round"
                    style={{
                      "--arc-length": ring.arcLength,
                      "--arc-gap": ring.circumference - ring.arcLength,
                      "--draw-delay": `${baseDelay}s`,
                    } as React.CSSProperties}
                  />

                  {/* Layer 2: Score arc (colored, draws to score %) */}
                  <circle
                    className="glass-radar__score-arc"
                    cx={cx}
                    cy={cy}
                    r={ring.r}
                    fill="none"
                    stroke={colorHex}
                    strokeWidth={ring.strokeW}
                    strokeLinecap="round"
                    style={{
                      "--arc-length": ring.arcLength,
                      "--arc-gap": ring.circumference - ring.arcLength,
                      "--score-offset": ring.dashOffsetForScore,
                      "--travel-dur": `${T.travelDuration}s`,
                      "--travel-delay": `${travelDelay}s`,
                    } as React.CSSProperties}
                  />

                  {/* Layer 3: Glow arc (breathing) */}
                  {!reduced && ring.score != null && ring.score > 0 && (
                    <circle
                      className="glass-radar__arc-glow"
                      cx={cx}
                      cy={cy}
                      r={ring.r}
                      fill="none"
                      stroke={colorHex}
                      strokeWidth={ring.strokeW + 6}
                      strokeLinecap="round"
                      filter="url(#glass-radar-goo)"
                      style={{
                        "--arc-length": ring.arcLength,
                        "--arc-gap": ring.circumference - ring.arcLength,
                        "--score-offset": ring.dashOffsetForScore,
                        "--travel-dur": `${T.travelDuration}s`,
                        "--travel-delay": `${travelDelay}s`,
                        "--breathe-dur": `${breatheDur}s`,
                        "--breathe-delay": `${breatheDelay}s`,
                      } as React.CSSProperties}
                    />
                  )}
                </g>
              );
            })}

            {/* ── Drops (gooey group during reveal) ── */}
            <g filter={!reduced ? "url(#glass-radar-goo)" : undefined}>
              {renderRings.map((ring) => {
                const colorHex = getRingHex(ring.score);
                const emergeDelay = T.dropEmergeDelay + ring.index * T.dropEmergeStagger;
                const travelDelay = T.travelDelay + ring.index * T.travelStagger;
                const scorePct = Math.max(0, Math.min(100, ring.score ?? 0));
                const isCritical = ring.score != null && ring.score < 45;
                const breatheDur = isCritical ? T.breatheFast : T.breatheNormal;
                const rotDeg = RADAR_ARC.startDeg;

                if (!ring.score || ring.score === 0) return null;

                return (
                  <g
                    key={`drop-${ring.id}`}
                    transform={`rotate(${rotDeg} ${cx} ${cy})`}
                  >
                    {/* Drop node */}
                    <circle
                      className="glass-radar__drop glass-radar__drop--traveled"
                      cx={cx}
                      cy={cy - ring.r}
                      r={7}
                      fill={colorHex}
                      style={{
                        "--emerge-delay": `${emergeDelay}s`,
                        "--travel-dur": `${T.travelDuration}s`,
                        "--travel-delay": `${travelDelay}s`,
                        "--score-pct": `${scorePct}%`,
                        offsetPath: `path('${ring.arcPath}')`,
                        offsetRotate: "0deg",
                      } as React.CSSProperties}
                    />

                    {/* Drop glow (breathing) */}
                    {!reduced && (
                      <circle
                        className="glass-radar__drop-glow"
                        cx={cx}
                        cy={cy - ring.r}
                        r={7}
                        fill="none"
                        stroke={colorHex}
                        strokeWidth={4}
                        filter="url(#glass-radar-goo)"
                        style={{
                          "--emerge-delay": `${emergeDelay}s`,
                          "--travel-dur": `${T.travelDuration}s`,
                          "--travel-delay": `${travelDelay}s`,
                          "--score-pct": `${scorePct}%`,
                          "--breathe-delay": `${T.breatheDelay}s`,
                          "--breathe-dur": `${breatheDur}s`,
                          offsetPath: `path('${ring.arcPath}')`,
                          offsetRotate: "0deg",
                        } as React.CSSProperties}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* ── Connectors (horizontal lines to labels) ── */}
            {renderRings.map((ring) => {
              const connDelay = T.connectorDelay + ring.index * T.connectorStagger;
              const connLength = ring.connectorEnd.x - ring.connectorStart.x;

              if (!ring.score || ring.score === 0) return null;

              return (
                <line
                  key={`conn-${ring.id}`}
                  className="glass-radar__connector"
                  x1={ring.connectorStart.x}
                  y1={ring.connectorStart.y}
                  x2={ring.connectorEnd.x}
                  y2={ring.connectorEnd.y}
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  style={{
                    "--conn-length": connLength,
                    "--conn-delay": `${connDelay}s`,
                  } as React.CSSProperties}
                />
              );
            })}
          </svg>

          {/* ═══ Center score (DOM overlay) ═══ */}
          <div className="glass-radar__center">
            <span
              className={`glass-radar__center-tooltip ${hovered ? "glass-radar__center-tooltip--visible" : ""}`}
            >
              Promedio general
            </span>
            <span
              className="glass-radar__center-score"
              style={{
                fontSize: size > 260 ? 44 : 34,
                color: centerColor,
              }}
            >
              <span className="glass-radar__center-score-breathe">
                {centerScore ?? "\u2014"}
              </span>
            </span>
          </div>
        </div>

        {/* ═══ Labels (desktop: right of radar, tablet/mobile: below) ═══ */}
        <div className="glass-radar__labels">
          {renderRings.map((ring) => (
            <RadarLabel
              key={`label-${ring.id}`}
              label={ring.label}
              score={ring.score}
              delay={T.labelDelay + ring.index * T.labelStagger}
            />
          ))}
        </div>
      </div>
    </div>
  );
}