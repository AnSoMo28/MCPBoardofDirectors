/**
 * CulturalHealthGauge — V2 of CulturalHealthScore (F31)
 *
 * NOT a static number. A living gauge that shows:
 * — Main ring gauge (composite health score 0-100)
 * — 6 sub-dimension bars (engagement, diversity, venue, budget, attendance, innovation)
 * — Level-based coloring via data-* attributes
 * — Mode-aware accent (responds to dashboard mode)
 *
 * Data: receives score + dimensions as props from CulturalDashboard.
 * Pattern: Named export, namespace `.cultural-health-gauge-*`.
 *
 * @module cultural/components/CulturalHealthGauge
 */

import { useMemo } from 'react';
import { cn } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import './CulturalHealthGauge.css';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

export interface HealthDimension {
  label: string;
  score: number;         // 0-100
  icon: string;          // emoji
}

export interface CulturalHealthGaugeProps {
  /** Composite health score (0-100). */
  score: number;
  /** 6 sub-dimension breakdowns. */
  dimensions?: HealthDimension[];
  /** Size preset. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Animate on mount. Default true. */
  animated?: boolean;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════

const SIZE_CONFIG = {
  sm: { viewBox: 100, radius: 38, strokeWidth: 7, textSize: 14, labelSize: 7 },
  md: { viewBox: 140, radius: 54, strokeWidth: 9, textSize: 20, labelSize: 9 },
  lg: { viewBox: 180, radius: 72, strokeWidth: 11, textSize: 28, labelSize: 11 },
} as const;

/** Map score range to level key for CSS coloring. */
function scoreToLevel(score: number): string {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

const LEVEL_LABELS: Record<string, string> = {
  excellent: 'Excepcional',
  good: 'Saludable',
  warning: 'Atención',
  critical: 'Crítico',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalHealthGauge({
  score,
  dimensions = [],
  size = 'md',
  animated = true,
  className = '',
}: CulturalHealthGaugeProps) {
  const prefersReduced = useReducedMotion();
  const config = SIZE_CONFIG[size];
  const clampedScore = Math.max(0, Math.min(100, score));
  const level = scoreToLevel(clampedScore);
  const shouldAnimate = animated && !prefersReduced;

  const { circumference, offset, center } = useMemo(() => {
    const circ = 2 * Math.PI * config.radius;
    const off = circ * (1 - clampedScore / 100);
    return {
      circumference: circ,
      offset: off,
      center: config.viewBox / 2,
    };
  }, [clampedScore, config]);

  return (
    <div
      className={cn('cultural-health-gauge', `cultural-health-gauge--${size}`, className)}
      data-level={level}
      data-prefers-reduced={prefersReduced ? 'true' : undefined}
    >
      {/* ── Main Ring Gauge ── */}
      <div className="cultural-health-gauge__ring-wrap">
        <svg
          viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
          className="cultural-health-gauge__svg"
          role="img"
          aria-label={`Health Score: ${clampedScore} de 100 — ${LEVEL_LABELS[level] ?? level}`}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            className="cultural-health-gauge__ring-bg"
            strokeWidth={config.strokeWidth}
          />

          {/* Foreground ring — score indicator */}
          <circle
            cx={center}
            cy={center}
            r={config.radius}
            fill="none"
            className={cn(
              'cultural-health-gauge__ring-fill',
              shouldAnimate && 'cultural-health-gauge__ring-fill--animated',
            )}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />

          {/* Score number */}
          <text
            x={center}
            y={center - (size === 'sm' ? 2 : 4)}
            textAnchor="middle"
            dominantBaseline="central"
            className="cultural-health-gauge__score-text"
            fontSize={config.textSize}
          >
            {clampedScore}
          </text>

          {/* Level label */}
          <text
            x={center}
            y={center + (size === 'sm' ? 12 : 18)}
            textAnchor="middle"
            dominantBaseline="central"
            className="cultural-health-gauge__level-text"
            fontSize={config.labelSize}
          >
            {LEVEL_LABELS[level] ?? level}
          </text>
        </svg>
      </div>

      {/* ── Dimension Bars ── */}
      {dimensions.length > 0 && (
        <div className="cultural-health-gauge__dimensions">
          {dimensions.map((dim, i) => {
            const dimLevel = scoreToLevel(dim.score);
            const pct = Math.max(0, Math.min(100, dim.score));

            return (
              <div
                key={dim.label}
                className="cultural-health-gauge__dimension"
                data-level={dimLevel}
                style={{ '--stagger-i': i } as React.CSSProperties}
              >
                <div className="cultural-health-gauge__dim-header">
                  <span className="cultural-health-gauge__dim-icon" role="img" aria-label={dim.label}>
                    {dim.icon}
                  </span>
                  <span className="cultural-health-gauge__dim-label">{dim.label}</span>
                  <span className="cultural-health-gauge__dim-score">{dim.score}</span>
                </div>
                <div className="cultural-health-gauge__dim-bar">
                  <div
                    className={cn(
                      'cultural-health-gauge__dim-fill',
                      shouldAnimate && 'cultural-health-gauge__dim-fill--animated',
                    )}
                    style={{ '--dim-width': `${pct}%` } as React.CSSProperties}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}