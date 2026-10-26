// ═══════════════════════════════════════════════════════════════════════
// Member360 — Ambient Canvas
// Phase 30 — Block 2.3: The Atmosphere
// ═══════════════════════════════════════════════════════════════════════
//
// Background breathing layer. Pure CSS — no canvas, no WebGL.
// Temperature drives hue. Mode drives speed. State drives intensity.
//
// The room BREATHES with the member. A thriving member's room is warm,
// slow, meditative. A disengaging member's room is cool, fast, urgent.
// ═══════════════════════════════════════════════════════════════════════

import type { MemberState, DashboardMode } from "../types";
import "./MemberAmbientCanvas.css";

interface MemberAmbientCanvasProps {
  temperature: number;
  mode: DashboardMode;
  state: MemberState;
}

/**
 * CSS-only atmospheric background.
 * Sets data attributes that CSS reads for colors and animation speeds.
 */
export function MemberAmbientCanvas({
  temperature,
  mode,
  state,
}: MemberAmbientCanvasProps) {
  return (
    <div
      className="glass-m360-ambient"
      data-mode={mode}
      data-member-state={state}
      style={
        {
          "--ambient-temperature": temperature,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {/* Primary glow — center-right, large, slow */}
      <div className="glass-m360-ambient__orb glass-m360-ambient__orb--primary" />

      {/* Secondary glow — top-left, smaller, counter-rotating */}
      <div className="glass-m360-ambient__orb glass-m360-ambient__orb--secondary" />

      {/* Scan line — only visible in alert/critical modes */}
      <div className="glass-m360-ambient__scan" />

      {/* Noise overlay — subtle grain texture */}
      <div className="glass-m360-ambient__noise" />
    </div>
  );
}