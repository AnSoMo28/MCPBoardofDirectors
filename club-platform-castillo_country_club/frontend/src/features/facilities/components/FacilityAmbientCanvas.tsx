// src/features/facilities/components/FacilityAmbientCanvas.tsx
// ═══════════════════════════════════════════════════════════════
// FACILITY AMBIENT CANVAS — "The Breathing Background"
//
// A fixed-position atmospheric background that makes the operator
// FEEL the state of the club before reading any data.
//
// MERGED: Their palette + layers + pulse ring
//         + Our CSS-driven reactivity + light mode + transitions.
//
// Modes:
//   calm     — slow teal drift, barely perceptible
//   alert    — faster amber drift, pulse ring fades in
//   critical — rapid red drift, pulse ring fully visible
//
// 5 layers:
//   1. Primary gradient   — main atmospheric color
//   2. Secondary gradient  — depth accent
//   3. Tertiary glow       — breathing center glow with blur
//   4. Grain overlay       — SVG noise texture
//   5. Pulse ring          — alert/critical ring effect
//
// Living Component Protocol:
//   ✅ SENSE 1: RESPIRACIÓN — glow breathes, speed by pulse-rate
//   ✅ SENSE 6: EMPATÍA — palette + animation respond to mode
// ═══════════════════════════════════════════════════════════════

import type { FacilitiesDashboardMode } from "../types";
import "./FacilityAmbientCanvas.css";

// ═══════════════════════════════════════════════════════════════
// MODE PALETTE
//
// Explicit color mapping per mode.
// Passed as CSS custom properties so CSS handles ALL animation.
// Colors use project tokens (never hardcoded hex).
// ═══════════════════════════════════════════════════════════════

interface ModePalette {
  accent: string;
  secondary: string;
  glow: string;
}

const MODE_PALETTES: Record<FacilitiesDashboardMode, ModePalette> = {
  calm: {
    accent: "var(--color-teal-500)",
    secondary: "var(--color-cyan-500)",
    glow: "var(--color-teal-400)",
  },
  alert: {
    accent: "var(--color-amber-500)",
    secondary: "var(--color-orange-500)",
    glow: "var(--color-amber-400)",
  },
  critical: {
    accent: "var(--color-rose-500)",
    secondary: "var(--color-red-600)",
    glow: "var(--color-rose-400)",
  },
};

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface FacilityAmbientCanvasProps {
  mode: FacilitiesDashboardMode;
  /** 0-100: controls glow opacity and blur radius */
  intensity?: number;
  /** Override accent color (e.g., from ambientState.accent_color) */
  accentColor?: string;
  /** Breathing speed: dormant (6s) → slow (4s) → elevated (2.5s) → rapid (1.5s) */
  pulseRate?: "dormant" | "slow" | "elevated" | "rapid";
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function FacilityAmbientCanvas({
  mode,
  intensity = 30,
  accentColor,
  pulseRate = "dormant",
}: FacilityAmbientCanvasProps) {
  // Palette: mode-based + accent override
  const palette = MODE_PALETTES[mode] ?? MODE_PALETTES.calm;
  const resolvedAccent = accentColor ?? palette.accent;

  // Scaled opacity: 0-100 → 0.05-0.35 (their formula, tighter range)
  const clampedIntensity = Math.max(0, Math.min(100, intensity));
  const glowOpacity = Math.max(0.05, Math.min(0.35, clampedIntensity / 285));
  const glowBlur = `${Math.round((clampedIntensity / 100) * 40)}px`;

  // CSS custom properties — CSS does ALL animation
  const cssVars = {
    "--fac-ambient-accent": resolvedAccent,
    "--fac-ambient-secondary": palette.secondary,
    "--fac-ambient-glow": palette.glow,
    "--fac-ambient-opacity": glowOpacity,
    "--fac-ambient-blur": glowBlur,
  } as React.CSSProperties;

  return (
    <div
      className="glass-fac-ambient"
      data-mode={mode}
      data-pulse-rate={pulseRate}
      style={cssVars}
      aria-hidden="true"
    >
      {/* Layer 1: Primary gradient — main atmospheric color */}
      <div className="glass-fac-ambient__primary" />

      {/* Layer 2: Secondary gradient — depth accent */}
      <div className="glass-fac-ambient__secondary" />

      {/* Layer 3: Tertiary glow — breathing center with blur */}
      <div className="glass-fac-ambient__glow" />

      {/* Layer 4: Grain overlay — SVG noise texture */}
      <div className="glass-fac-ambient__grain" />

      {/* Layer 5: Pulse ring — alert/critical ring effect */}
      <div className="glass-fac-ambient__pulse-ring" />
    </div>
  );
}