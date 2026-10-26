/**
 * @component RadarLabel (Fase 25)
 * @namespace .glass-radar__label
 * @depends PulseRadar.css
 * @note Right-side label for a radar ring.
 *       Desktop: absolutely positioned vertically with its ring.
 *       Tablet/Mobile: grid item.
 * @import import '../PulseRadar.css';
 */

import { getRingColor } from "../config/radar";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface RadarLabelProps {
  label: string;
  score: number | null;
  /** CSS animation delay (staggered) */
  delay: number;
  /** Desktop: absolute vertical position (from connector Y) */
  topPx?: number;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function RadarLabel({
  label,
  score,
  delay,
  topPx,
}: RadarLabelProps) {
  const color = getRingColor(score);

  return (
    <div
      className="glass-radar__label"
      style={{
        "--label-delay": `${delay}s`,
        ...(topPx !== undefined && { top: `${topPx}px` }),
      } as React.CSSProperties}
    >
      <span
        className="glass-radar__label-dot"
        style={{ backgroundColor: color }}
      />
      <span className="glass-radar__label-name">{label}</span>
      <span
        className="glass-radar__label-score"
        style={{ color }}
      >
        {score ?? "\u2014"}
      </span>
    </div>
  );
}