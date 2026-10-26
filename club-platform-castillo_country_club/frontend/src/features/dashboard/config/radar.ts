/**
 * @module features/dashboard/config/radar (Fase 25)
 * @note Radar visualization config: geometry, arc angles, colors,
 *       timeline sequence, responsive breakpoints.
 */

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export type RadarRingData = {
  id: string;
  label: string;
  score: number | null;
};

export interface RadarGeometry {
  size: number;
  cx: number;
  cy: number;
  rings: Array<{
    r: number;
    stroke: number;
  }>;
}

/* ═══════════════════════════════════════
   Arc Angles
   ═══════════════════════════════════════ */

/**
 * Arc spans from `arcStart` to `arcEnd` (degrees, 0° = 12 o'clock, CW).
 * The gap (arcEnd → arcStart) is where connectors + labels live.
 * Default: 270° arc, 90° gap (bottom-right quadrant).
 */
export const RADAR_ARC = {
  startDeg: 225,
  endDeg: 315,
  /** Fraction of circle that is arc (270/360 = 0.75) */
  arcFraction: 0.75,
  /** Fraction of circle that is gap (90/360 = 0.25) */
  gapFraction: 0.25,
} as const;

/* ═══════════════════════════════════════
   Responsive Geometry
   ═══════════════════════════════════════ */

export const RADAR_DESKTOP: RadarGeometry = {
  size: 320,
  cx: 160,
  cy: 160,
  rings: [
    { r: 140, stroke: 5 },
    { r: 112, stroke: 4.5 },
    { r: 84, stroke: 4 },
    { r: 58, stroke: 3.5 },
  ],
};

export const RADAR_TABLET: RadarGeometry = {
  size: 280,
  cx: 140,
  cy: 140,
  rings: [
    { r: 120, stroke: 4.5 },
    { r: 96, stroke: 4 },
    { r: 72, stroke: 3.5 },
    { r: 50, stroke: 3 },
  ],
};

export const RADAR_MOBILE: RadarGeometry = {
  size: 220,
  cx: 110,
  cy: 110,
  rings: [
    { r: 94, stroke: 4 },
    { r: 75, stroke: 3.5 },
    { r: 56, stroke: 3 },
    { r: 38, stroke: 2.5 },
  ],
};

/* ═══════════════════════════════════════
   Color Thresholds
   ═══════════════════════════════════════ */

export function getRingColor(score: number | null): string {
  if (score == null) return "var(--color-silver-600)";
  if (score >= 80) return "var(--color-emerald-400)";
  if (score >= 65) return "var(--color-teal-400)";
  if (score >= 45) return "var(--color-gold-400)";
  return "var(--color-rose-400)";
}

export function getRingHex(score: number | null): string {
  if (score == null) return "#5C5853";
  if (score >= 80) return "#34D399";
  if (score >= 65) return "#2DD4BF";
  if (score >= 45) return "#C9A96E";
  return "#FB7185";
}

/* ═══════════════════════════════════════
   Timeline Sequence (delays in seconds)
   ═══════════════════════════════════════ */

export const RADAR_TIMELINE = {
  /** Step 1: Hub center elastic scale-in */
  hubDelay: 0,
  hubDuration: 0.6,
  /** Step 2: Score number fade-in */
  scoreDelay: 0.4,
  scoreDuration: 0.3,
  /** Step 3: Base arcs draw (structure, faint) */
  baseArcDelay: 0.6,
  baseArcDuration: 0.5,
  baseArcStagger: 0.12,
  /** Step 4: Drops emerge from center, rise to arc start */
  dropEmergeDelay: 0.9,
  dropEmergeDuration: 0.35,
  dropEmergeStagger: 0.1,
  /** Step 5: Arcs draw + drops travel in parallel (the magic) */
  travelDelay: 1.25,
  travelDuration: 1.4,
  travelStagger: 0.15,
  /** Arc draws just ahead of drop (ms) */
  arcLeadMs: 60,
  /** Step 6: Connectors extend */
  connectorDelay: 2.2,
  connectorDuration: 0.25,
  connectorStagger: 0.08,
  /** Step 7: Labels appear */
  labelDelay: 2.5,
  labelDuration: 0.3,
  labelStagger: 0.08,
  /** Step 8: Breathing idle */
  breatheDelay: 3.2,
  breatheFast: 1.8,
  breatheNormal: 3.0,
  breatheSlow: 3.5,
} as const;

/* ═══════════════════════════════════════
   Hub
   ═══════════════════════════════════════ */

export const RADAR_HUB = {
  radius: 28,
  glowRadius: 42,
} as const;

/* ═══════════════════════════════════════
   Drop (traveling node)
   ═══════════════════════════════════════ */

export const RADAR_DROP = {
  radius: 7,
  glowBlur: 10,
} as const;

/* ═══════════════════════════════════════
   Connector
   ═══════════════════════════════════════ */

export const RADAR_CONNECTOR = {
  /** How far past the arc the connector extends (px) */
  extension: 24,
  strokeWidth: 1.5,
} as const;