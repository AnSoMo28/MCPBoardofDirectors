/**
 * @component NeonBorder (Fase 25 — REWRITE)
 * @namespace .glass-neon
 * @depends useNeonCanvas, config/neon, NeonBorder.css
 * @note Canvas neon border with 6-layer glow stack.
 *       3 modes: travel, pulse, breathe.
 *       IntersectionObserver pause, FPS budget, static glow fallback.
 *       Backward-compatible: same props interface, same default export.
 * @import import '../NeonBorder.css';
 */

import { useRef } from "react";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useNeonCanvas } from "../hooks/useNeonCanvas";
import {
  NEON_PRESETS,
  type NeonMode,
  type NeonPreset,
} from "../config/neon";
import "../NeonBorder.css";

/* ═══════════════════════════════════════
   Props
   ═══════════════════════════════════════ */

interface NeonBorderProps {
  /** Direct color value (CSS color or var). */
  color?: string;
  /** Agent preset — sets color, speed, and mode automatically. */
  preset?: NeonPreset;
  /** Override speed (default: 1, or preset value). */
  speed?: number;
  /** Override mode (default: "travel", or preset value). */
  mode?: NeonMode;
  /** Neon line thickness in px (default: 3). */
  thickness?: number;
  /** Glow blur radius in px (default: 16). */
  glowSize?: number;
  /** Card border radius in px (default: 16). */
  borderRadius?: number;
  /** Max FPS budget (default: 60). Use 30 for secondary cards. */
  maxFps?: number;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function NeonBorder({
  color: colorProp,
  preset,
  speed,
  mode,
  thickness,
  glowSize,
  borderRadius,
  maxFps,
}: NeonBorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* ── Resolve preset ── */
  const presetConfig = preset ? NEON_PRESETS[preset] : undefined;
  const resolvedColor =
    presetConfig?.color || colorProp || "var(--color-gold-400)";

  useNeonCanvas({
    canvasRef,
    containerRef,
    color: resolvedColor,
    config: {
      ...(speed !== undefined && { speed }),
      ...(mode !== undefined && { mode }),
      ...(thickness !== undefined && { thickness }),
      ...(glowSize !== undefined && { glowSize }),
      ...(borderRadius !== undefined && { borderRadius }),
      ...(maxFps !== undefined && { maxFps }),
      ...(presetConfig?.speed !== undefined &&
        speed === undefined && { speed: presetConfig.speed }),
      ...(presetConfig?.mode !== undefined &&
        mode === undefined && { mode: presetConfig.mode }),
    },
  });

  /* ── Reduced motion: static glow fallback ── */
  if (reduced) {
    return (
      <div
        className="glass-neon glass-neon--static"
        style={
          {
            "--neon-color": resolvedColor,
            borderRadius,
          } as React.CSSProperties
        }
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="glass-neon"
      style={{ borderRadius }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="glass-neon__canvas" />
    </div>
  );
}