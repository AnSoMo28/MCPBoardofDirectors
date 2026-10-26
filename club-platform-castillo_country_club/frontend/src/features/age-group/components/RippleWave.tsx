// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/RippleWave.tsx
// Phase 34+ Migration — Ripple Wave Sub-Component
// Level 6+ Agency · Production Grade
//
// "The Seismic Reading" — Horizontal visualization of
// GenerationalRipple propagation. 7 bracket nodes as
// seismic measurement points with animated wave pulses.
//
// Original: cn() + no ARIA + no CSS import
//   → BEM .ag-ripple + data-* + ARIA + CSS co-located
//
// PRE-WRITE VERIFICATION:
//   GenerationalRipple → ../types ✅
//   AgeBracketId → ../types ✅
//   AGE_BRACKETS → ../config ✅
//   BaseInsight → not used here ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-source attribute
//   - Missing ARIA → role, aria-label
//   - Missing data-testid → added
//   - Missing .css import → co-located
//   - Inline style cursor → CSS
//   - Import ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import type { CSSProperties } from "react";
import {
  Baby,
  Puzzle,
  Zap,
  Flame,
  Target,
  Trees,
  HeartPulse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AGE_BRACKETS } from "../config";
import type { AgeBracketId, GenerationalRipple } from "../types";

import "./RippleWave.css";

/* ── §0  Constants ────────────────────────────────────────── */

const ICONS: Record<string, LucideIcon> = {
  baby: Baby,
  puzzle: Puzzle,
  zap: Zap,
  flame: Flame,
  target: Target,
  trees: Trees,
  "heart-pulse": HeartPulse,
};

/* ── §1  Props ────────────────────────────────────────────── */

interface RippleWaveProps {
  /** Ripples from advisor hook — one per affected bracket */
  readonly ripples: GenerationalRipple[];
}

/* ── §2  Component ────────────────────────────────────────── */

/**
 * RippleWave — "The Seismic Reading"
 *
 * Renders 7 bracket nodes in a horizontal line with an SVG
 * wave overlay showing how generational impact propagates.
 * Source nodes pulse; wave animation speed matches velocity.
 */
export function RippleWave({ ripples }: RippleWaveProps) {
  if (ripples.length === 0) return null;

  // Build affected set for node styling
  const affectedMap = new Map<
    AgeBracketId,
    { velocity: string; direction: string }
  >();
  for (const r of ripples) {
    affectedMap.set(r.source, {
      velocity: r.velocity,
      direction: r.direction,
    });
  }

  return (
    <div
      className="ag-ripple"
      role="region"
      aria-label="Propagación inter-generacional"
      data-testid="ag-ripple"
    >
      {/* ── Track: 7 bracket nodes ── */}
      <div
        className="ag-ripple__track"
        role="list"
        aria-label="Grupos etarios"
      >
        {AGE_BRACKETS.map((bracket, i) => {
          const Icon = ICONS[bracket.icon] ?? HeartPulse;
          const affected = affectedMap.get(bracket.id);
          const isSource = !!affected;

          return (
            <div
              key={bracket.id}
              className="ag-ripple__node"
              role="listitem"
              aria-label={`${bracket.label}${isSource ? " — afectado" : ""}`}
              data-source={isSource || undefined}
              style={
                {
                  "--node-color": bracket.color,
                  "--node-gradient-start": bracket.gradient[0],
                  "--node-gradient-end": bracket.gradient[1],
                  "--stagger-i": i,
                } as CSSProperties
              }
            >
              {isSource && (
                <div className="ag-ripple__node-pulse" aria-hidden="true" />
              )}
              <div className="ag-ripple__node-icon">
                <Icon size={14} aria-hidden="true" />
              </div>
              <span className="ag-ripple__node-label">
                {bracket.label.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── SVG Wave Overlay ── */}
      <svg
        className="ag-ripple__wave-svg"
        viewBox="0 0 700 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {ripples.map((ripple) => {
          const sourceIdx = AGE_BRACKETS.findIndex(
            (b) => b.id === ripple.source,
          );
          if (sourceIdx < 0) return null;

          const direction = ripple.direction === "older" ? 1 : -1;
          const waveLen =
            ripple.velocity === "fast"
              ? 3
              : ripple.velocity === "moderate"
                ? 2
                : 1;

          const startX = (sourceIdx + 0.5) * 100;
          const endX = startX + direction * waveLen * 100;

          return (
            <line
              key={`${ripple.source}-${ripple.direction}`}
              x1={startX}
              y1={12}
              x2={Math.max(50, Math.min(650, endX))}
              y2={12}
              className="ag-ripple__wave-path"
              data-velocity={ripple.velocity}
              style={
                {
                  "--wave-speed":
                    ripple.velocity === "fast"
                      ? "0.6s"
                      : ripple.velocity === "moderate"
                        ? "1s"
                        : "1.5s",
                } as CSSProperties
              }
            />
          );
        })}
      </svg>

      {/* ── Descriptions ── */}
      <div
        className="ag-ripple__descriptions"
        role="list"
        aria-label="Descripciones de propagación"
      >
        {ripples.slice(0, 2).map((r) => (
          <span
            key={`${r.source}-${r.direction}`}
            className="ag-ripple__desc"
            role="listitem"
          >
            {r.description}
          </span>
        ))}
      </div>
    </div>
  );
}