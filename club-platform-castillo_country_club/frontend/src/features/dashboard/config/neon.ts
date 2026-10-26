/**
 * @module features/dashboard/config/neon (Fase 25)
 * @note Neon border constants, animation presets, agent color mapping.
 *       All magic numbers extracted and named.
 */

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type NeonMode = "travel" | "pulse" | "breathe";

export interface NeonConfig {
  speed: number;
  thickness: number;
  glowSize: number;
  borderRadius: number;
  maxFps: number;
  mode: NeonMode;
}

export type NeonPreset = "finance" | "events" | "engagement" | "operations" | "wellness";

/* ═══════════════════════════════════════
   Animation Defaults
   ═══════════════════════════════════════ */

export const NEON_DEFAULTS: NeonConfig = {
  speed: 1,
  thickness: 3,
  glowSize: 16,
  borderRadius: 16,
  maxFps: 60,
  mode: "travel",
};

/* ═══════════════════════════════════════
   Drawing Constants (previously magic numbers)
   ═══════════════════════════════════════ */

export const NEON_DRAW = {
  /** Padding from canvas edge to prevent glow clipping */
  pad: 2,
  /** Base position increment per frame (speed-multiplied externally) */
  baseIncrement: 0.004,
  /** Line length as fraction of perimeter */
  linePercent: 0.22,
  /** Tail length as fraction of main line */
  tailLengthFactor: 0.5,
  /** Tail offset as fraction of main line */
  tailOffsetFactor: 0.8,
  /** White center thickness as fraction of main thickness */
  whiteCenterFactor: 0.35,
  /** How many frames to aggressively sync size on mount */
  syncFrames: 20,
} as const;

/* ═══════════════════════════════════════
   Agent Presets
   ═══════════════════════════════════════ */

export const NEON_PRESETS: Record<
  NeonPreset,
  { color: string; speed: number; mode: NeonMode }
> = {
  finance: {
    color: "var(--color-gold-400)",
    speed: 0.8,
    mode: "travel",
  },
  events: {
    color: "var(--color-teal-400)",
    speed: 1.2,
    mode: "travel",
  },
  engagement: {
    color: "var(--color-rose-400)",
    speed: 1.0,
    mode: "travel",
  },
  operations: {
    color: "var(--color-silver-400)",
    speed: 0.6,
    mode: "breathe",
  },
  wellness: {
    color: "var(--color-emerald-400)",
    speed: 0.9,
    mode: "pulse",
  },
};