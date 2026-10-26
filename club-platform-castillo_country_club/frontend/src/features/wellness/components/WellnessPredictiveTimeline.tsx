/* ═══════════════════════════════════════════════════════════════
   Wellness Predictive Timeline — "Horizon" (P4)
   Past → Present → Future with confidence cones.
   ═══════════════════════════════════════════════════════════════ */

import { cn } from "@/shared/lib/utils";
import type { WellnessPredictions, WellnessMode } from "../types";
import "./WellnessPredictiveTimeline.css";

interface Props {
  predictions: WellnessPredictions | null;
  mode: WellnessMode;
  className?: string;
}

const HORIZONS = [
  { key: "engagement_30d" as const, label: "30d", days: 30 },
  { key: "engagement_60d" as const, label: "60d", days: 60 },
  { key: "engagement_90d" as const, label: "90d", days: 90 },
];
const TREND_COLOR = {
  improving: "var(--color-emerald-400)",
  stable: "var(--color-silver-400)",
  declining: "var(--color-red-400)",
};

export function WellnessPredictiveTimeline({
  predictions,
  mode,
  className,
}: Props) {
  if (!predictions) return null;

  return (
    <div className={cn("glass-wh", className)} data-mode={mode}>
      <span className="wh__title">Horizonte predictivo</span>
      <svg
        viewBox="0 0 300 60"
        className="wh__svg"
        preserveAspectRatio="none"
      >
        {/* Timeline base */}
        <line
          x1="10" y1="30" x2="290" y2="30"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />

        {/* Present marker */}
        <circle cx="80" cy="30" r="5" fill="var(--color-gold-400)" className="wh__now" />
        <text x="80" y="48" textAnchor="middle" className="wh__label-now">Hoy</text>

        {/* Past zone */}
        <rect x="10" y="15" width="70" height="30" rx="4" fill="rgba(255,255,255,0.02)" />
        <text x="45" y="34" textAnchor="middle" className="wh__label-past">Pasado</text>

        {/* Future zones (P4: confidence cones) */}
        {HORIZONS.map((h, i) => {
          const pred = predictions[h.key];
          const x = 140 + i * 55;
          const coneW = 15 + i * 8; // widens with distance
          const color = TREND_COLOR[pred.trend];
          const scoreY = 30 - ((pred.score - 50) / 50) * 15;

          return (
            <g key={h.key}>
              {/* Confidence cone */}
              <polygon
                points={`${x - coneW},45 ${x + coneW},45 ${x},${scoreY - 8}`}
                fill={color}
                opacity="0.06"
              />

              {/* Prediction point */}
              <circle cx={x} cy={scoreY} r="4" fill={color} opacity="0.8" />
              <text x={x} y={scoreY - 10} textAnchor="middle" className="wh__score-text" fill={color}>
                {pred.score}
              </text>
              <text x={x} y="52" textAnchor="middle" className="wh__label-horizon">
                {h.label}
              </text>
              <text x={x} y="58" textAnchor="middle" className="wh__conf-text">
                {pred.confidence}%
              </text>
            </g>
          );
        })}

        {/* Shimmer overlay (P4) */}
        <rect x="120" y="0" width="60" height="60" fill="url(#wh-shimmer)" className="wh__shimmer" />
        <defs>
          <linearGradient id="wh-shimmer">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-gold-400)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}