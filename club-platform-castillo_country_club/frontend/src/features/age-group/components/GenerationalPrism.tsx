// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/GenerationalPrism.tsx
// Phase 34+ Migration — Generational Prism
// Level 6+ Agency · Production Grade
//
// "The Living Genome" — Hero SVG donut with 7 segments
// (one per cohort). Proportional to member count, colored
// by COHORT_IDENTITIES, animated by energy state.
// Center: aura circle reflecting global intelligence score.
//
// Original: cn() + dual namespace + no keyboard + no CSS
//   → BEM .ag-genome + data-* + ARIA + CSS co-located
//
// PRE-WRITE VERIFICATION:
//   PrismSegment → ./hooks/useAgeGroupDashboard ✅
//     {bracketId, label, icon, memberCount, percentage,
//      color, gradient, healthScore, hotspot, trend,
//      energyAnimation, energySpeed, agingOut?, rippleActive}
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-hotspot, data-ripple, data-energy
//   - .glass-generational-prism + .gp-* → .ag-genome__*
//   - Missing CSS import → co-located
//   - Missing data-testid → added
//   - Missing ARIA on segments → role="listitem"
//   - Missing keyboard → tabIndex + onKeyDown
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";
import type { PrismSegment } from "../hooks/useAgeGroupDashboard";
import "./GenerationalPrism.css";

/* ── §0  SVG Arc Math ─────────────────────────────────────── */

function polarToXY(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const os = polarToXY(cx, cy, outerR, startDeg);
  const oe = polarToXY(cx, cy, outerR, endDeg);
  const ie = polarToXY(cx, cy, innerR, endDeg);
  const is_ = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y}`,
    "Z",
  ].join(" ");
}

/* ── §1  Props ────────────────────────────────────────────── */

interface GenerationalPrismProps {
  /** Segment data from useAgeGroupDashboard — one per bracket */
  readonly segments: PrismSegment[];
  /** Global intelligence score (0-100) — drives center aura */
  readonly intelligenceScore: number;
}

/* ── §2  Component ────────────────────────────────────────── */

/**
 * GenerationalPrism — "The Living Genome"
 *
 * Hero visualization showing 7-cohort distribution as a donut.
 * Each segment is proportional to member count, animated by
 * the cohort's energy state. Hotspots pulse; ripples glow.
 * Center aura color/intensity reflects intelligence score.
 */
export function GenerationalPrism({
  segments,
  intelligenceScore,
}: GenerationalPrismProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  /* ── SVG geometry ── */
  const cx = 150;
  const cy = 150;
  const outerR = 128;
  const innerR = 82;
  const gapDeg = 2.5;
  const totalGap = gapDeg * segments.length;
  const availableDeg = 360 - totalGap;

  /* ── Computed ── */
  const totalMembers = useMemo(
    () => segments.reduce((s, seg) => s + seg.memberCount, 0),
    [segments],
  );

  const arcs = useMemo(() => {
    let cursor = 0;
    return segments.map((seg) => {
      const proportion =
        totalMembers > 0
          ? seg.memberCount / totalMembers
          : 1 / Math.max(segments.length, 1);
      const arcDeg = proportion * availableDeg;
      const start = cursor;
      const end = start + arcDeg;
      cursor = end + gapDeg;
      return { ...seg, startDeg: start, endDeg: end, arcDeg };
    });
  }, [segments, totalMembers, availableDeg]);

  /* ── Aura computation ── */
  const auraLevel = useMemo(() => {
    if (intelligenceScore >= 70) return "high";
    if (intelligenceScore >= 40) return "medium";
    return "low";
  }, [intelligenceScore]);

  /* ── Keyboard handler for segments ── */
  const handleSegmentKey = useCallback(
    (i: number, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHoveredIdx((prev) => (prev === i ? null : i));
      }
    },
    [],
  );

  return (
    <div
      className="ag-genome"
      role="region"
      aria-label="Prism de distribución generacional"
      data-testid="ag-genome"
    >
      <svg
        viewBox="0 0 300 300"
        className="ag-genome__svg"
        aria-hidden="true"
      >
        {/* ── Gradient definitions ── */}
        <defs>
          {arcs.map((arc) => (
            <linearGradient
              key={`grad-${arc.bracketId}`}
              id={`ag-gen-grad-${arc.bracketId}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={arc.gradient[0]} />
              <stop offset="100%" stopColor={arc.gradient[1]} />
            </linearGradient>
          ))}
          <filter id="ag-gen-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Center aura ── */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR - 8}
          className="ag-genome__aura"
          data-level={auraLevel}
        />

        {/* ── Donut segments ── */}
        {arcs.map((arc, i) => {
          const path = donutArc(
            cx,
            cy,
            innerR,
            outerR,
            arc.startDeg,
            arc.endDeg,
          );
          const isHovered = hoveredIdx === i;

          return (
            <g key={arc.bracketId}>
              <path
                d={path}
                fill={`url(#ag-gen-grad-${arc.bracketId})`}
                className="ag-genome__seg"
                data-energy={arc.energyAnimation}
                data-hotspot={arc.hotspot || undefined}
                data-ripple={arc.rippleActive || undefined}
                data-hovered={isHovered || undefined}
                tabIndex={0}
                role="listitem"
                aria-label={`${arc.label}: ${arc.memberCount} miembros, ${arc.percentage.toFixed(1)}%`}
                style={
                  {
                    "--energy-speed": `${arc.energySpeed}s`,
                    "--seg-color": arc.color,
                  } as CSSProperties
                }
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                onKeyDown={(e) => handleSegmentKey(i, e)}
              />

              {/* Hotspot ring overlay */}
              {arc.hotspot && (
                <path
                  d={path}
                  fill="none"
                  stroke="var(--color-red-400, #f87171)"
                  strokeWidth="3"
                  className="ag-genome__hotspot-ring"
                />
              )}
            </g>
          );
        })}

        {/* ── Center score ── */}
        <text
          x={cx}
          y={cy - 4}
          className="ag-genome__score"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {intelligenceScore}
        </text>
        <text
          x={cx}
          y={cy + 16}
          className="ag-genome__subtitle"
          textAnchor="middle"
        >
          Inteligencia
        </text>
      </svg>

      {/* ── Accessible data table (screen readers) ── */}
      <div className="sr-only">
        <table>
          <caption>Distribución generacional</caption>
          <thead>
            <tr><th>Grupo</th><th>Miembros</th><th>Porcentaje</th><th>Salud</th></tr>
          </thead>
          <tbody>
            {arcs.map((arc) => (
              <tr key={arc.bracketId}>
                <td>{arc.label}</td>
                <td>{arc.memberCount}</td>
                <td>{arc.percentage.toFixed(1)}%</td>
                <td>{arc.healthScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Hover tooltip — HTML overlay ── */}
      {hoveredIdx !== null && arcs[hoveredIdx] && (
        <div
          className="ag-genome__tooltip"
          role="tooltip"
          aria-live="polite"
          data-visible="true"
        >
          <div
            className="ag-genome__tooltip-swatch"
            style={{ background: arcs[hoveredIdx].color }}
          />
          <div className="ag-genome__tooltip-body">
            <span className="ag-genome__tooltip-label">
              {arcs[hoveredIdx].label}
            </span>
            <span className="ag-genome__tooltip-count">
              {arcs[hoveredIdx].memberCount} miembros
              <span className="ag-genome__tooltip-pct">
                {" "}({arcs[hoveredIdx].percentage.toFixed(1)}%)
              </span>
            </span>
            <span className="ag-genome__tooltip-health">
              Salud: {arcs[hoveredIdx].healthScore}%
            </span>
            {arcs[hoveredIdx].agingOut && (
              <span className="ag-genome__tooltip-risk">
                Aging-out: ~{arcs[hoveredIdx].agingOut!.avgYearsRemaining} años
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}