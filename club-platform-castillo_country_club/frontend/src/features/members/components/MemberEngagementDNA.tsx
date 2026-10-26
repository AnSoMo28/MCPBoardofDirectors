// ═══════════════════════════════════════════════════════════════════════
// Member360 — Engagement DNA Double Helix
// Phase 30 — Block 3.6: The Helix
// ═══════════════════════════════════════════════════════════════════════
//
// Double helix horizontal where each "rung" is an engagement domain.
// Frequency determines rung width. Color comes from domain.
// Preferred domain has a diamond marker.
// Strand A = frequency. Strand B = recency score.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import type {
  ActivityDomain,
  EngagementDNAChannel,
  MemberTemperature,
} from "../types";
import {
  getDomainColor,
  getDomainLabel,
  getDomainIcon,
} from "../types";
import "./MemberEngagementDNA.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MemberEngagementDNAProps {
  dna: EngagementDNAChannel[];
  temperature: MemberTemperature;
}

interface Rung {
  channel: EngagementDNAChannel;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  midX: number;
  midY: number;
  rungWidth: number;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CHART CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const W = 480;
const H = 220;
const PAD_X = 120;
const STRAND_AMPLITUDE = 35;
const MIN_RUNG_W = 2;
const MAX_RUNG_W = 8;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function MemberEngagementDNA({ dna }: MemberEngagementDNAProps) {
  // ── Sort by frequency (strongest first) ───────────────────────────
  const sortedDna = useMemo(
    () => [...dna].sort((a, b) => b.frequency - a.frequency),
    [dna],
  );

  // ── Compute rung positions ────────────────────────────────────────
  const rungs = useMemo<Rung[]>(() => {
    const count = sortedDna.length;
    if (count === 0) return [];

    const maxFreq = Math.max(...sortedDna.map((d) => d.frequency), 1);
    const chartW = W - PAD_X * 2;
    const centerY = H / 2;

    return sortedDna.map((channel, i) => {
      // X position: evenly spaced
      const x = PAD_X + (i / Math.max(count - 1, 1)) * chartW;

      // Strand A Y (frequency-driven)
      const freqRatio = channel.frequency / maxFreq;
      const phaseA = (i / count) * Math.PI * 4;
      const yA = centerY + Math.sin(phaseA) * STRAND_AMPLITUDE * freqRatio;

      // Strand B Y (recency-driven)
      const recencyRatio = channel.recencyScore / 100;
      const phaseB = phaseA + Math.PI; // opposite phase
      const yB =
        centerY + Math.sin(phaseB) * STRAND_AMPLITUDE * recencyRatio;

      // Rung width: proportional to frequency
      const rungW =
        MIN_RUNG_W +
        (channel.frequency / maxFreq) * (MAX_RUNG_W - MIN_RUNG_W);

      return {
        channel,
        x1: x,
        y1: yA,
        x2: x,
        y2: yB,
        midX: x,
        midY: (yA + yB) / 2,
        rungWidth: rungW,
        color: getDomainColor(channel.domain as ActivityDomain),
      };
    });
  }, [sortedDna]);

  // ── Strand paths (smooth curves connecting rung endpoints) ────────
  const strandPaths = useMemo(() => {
    if (rungs.length < 2) return { strandA: "", strandB: "" };

    const pointsA: Array<[number, number]> = rungs.map((r) => [r.x1, r.y1]);
    const pointsB: Array<[number, number]> = rungs.map((r) => [r.x2, r.y2]);

    const buildSmooth = (pts: Array<[number, number]>) => {
      if (pts.length < 2) return "";
      let d = `M ${pts[0][0]},${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpx1 = prev[0] + (curr[0] - prev[0]) * 0.4;
        const cpx2 = curr[0] - (curr[0] - prev[0]) * 0.4;
        d += ` C ${cpx1},${prev[1]} ${cpx2},${curr[1]} ${curr[0]},${curr[1]}`;
      }
      return d;
    };

    return {
      strandA: buildSmooth(pointsA),
      strandB: buildSmooth(pointsB),
    };
  }, [rungs]);

  // ── Empty state ───────────────────────────────────────────────────
  if (dna.length === 0) {
    return (
      <div className="glass-m360-dna">
        <p className="glass-m360-dna__empty">
          Sin datos de engagement DNA
        </p>
      </div>
    );
  }

  return (
    <div className="glass-m360-dna">
      {/* ── SVG Helix ── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="glass-m360-dna__svg"
        role="img"
        aria-label="Doble hélice de engagement DNA"
      >
        {/* ── Strand lines ── */}
        <path
          d={strandPaths.strandA}
          fill="none"
          stroke="var(--color-silver-400)"
          strokeWidth="1.5"
          opacity="0.4"
          className="glass-m360-dna__strand"
        />
        <path
          d={strandPaths.strandB}
          fill="none"
          stroke="var(--color-silver-500)"
          strokeWidth="1.5"
          opacity="0.35"
          className="glass-m360-dna__strand glass-m360-dna__strand--b"
        />

        {/* ── Rungs ── */}
        {rungs.map((rung, i) => {
          const isPreferred = rung.channel.preferred;
          const isImproving = rung.channel.trend === "improving";
          const isDeclining = rung.channel.trend === "declining";

          return (
            <g
              key={rung.channel.domain}
              className={`glass-m360-dna__rung-group ${isPreferred ? "glass-m360-dna__rung-group--preferred" : ""}`}
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              {/* Rung line */}
              <line
                x1={rung.x1}
                y1={rung.y1}
                x2={rung.x2}
                y2={rung.y2}
                stroke={rung.color}
                strokeWidth={rung.rungWidth}
                strokeLinecap="round"
                opacity={
                  isPreferred ? 1 : isImproving ? 0.85 : isDeclining ? 0.55 : 0.7
                }
                className={`glass-m360-dna__rung ${isImproving ? "glass-m360-dna__rung--improving" : ""} ${isDeclining ? "glass-m360-dna__rung--declining" : ""}`}
              />

              {/* Preferred diamond marker */}
              {isPreferred && (
                <polygon
                  points={`${rung.midX},${rung.midY - 5} ${rung.midX + 4},${rung.midY} ${rung.midX},${rung.midY + 5} ${rung.midX - 4},${rung.midY}`}
                  fill="var(--color-gold-400)"
                  stroke="var(--color-surface-1)"
                  strokeWidth="0.8"
                  className="glass-m360-dna__diamond"
                />
              )}
            </g>
          );
        })}

        {/* ── Labels ── */}
        {rungs.map((rung) => (
          <text
            key={rung.channel.domain}
            x={rung.midX}
            y={H - 8}
            textAnchor="middle"
            fontSize="7"
            fill={rung.color}
            fontWeight={rung.channel.preferred ? "700" : "400"}
            transform={`rotate(-45, ${rung.midX}, ${H - 8})`}
          >
            {getDomainLabel(rung.channel.domain as ActivityDomain)}
          </text>
        ))}
      </svg>

      {/* ── Legend ── */}
      <div className="glass-m360-dna__legend">
        {rungs.map((rung) => (
          <div
            key={rung.channel.domain}
            className="glass-m360-dna__legend-row"
            data-preferred={rung.channel.preferred || undefined}
            data-trend={rung.channel.trend}
          >
            <span
              className="glass-m360-dna__legend-dot"
              style={{ background: rung.color }}
            />
            <span className="glass-m360-dna__legend-label">
              {getDomainIcon(rung.channel.domain as ActivityDomain)}{" "}
              {getDomainLabel(rung.channel.domain as ActivityDomain)}
            </span>
            <span className="glass-m360-dna__legend-freq">
              {rung.channel.frequency}/mes
            </span>
            <span className="glass-m360-dna__legend-strength">
              {Math.round(rung.channel.strength * 100)}%
            </span>
            <span
              className="glass-m360-dna__legend-trend"
              data-trend={rung.channel.trend}
            >
              {rung.channel.trend === "improving"
                ? "↑"
                : rung.channel.trend === "declining"
                  ? "↓"
                  : "→"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}