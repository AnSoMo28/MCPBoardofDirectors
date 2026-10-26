/**
 * CulturalHealthScore — F31
 *
 * SVG ring gauge showing the Cultural Health Score (0-100).
 * 5-factor composite: diversity × density × enrollment × portfolio × exhibitions.
 * Animated with useReducedMotion guard.
 *
 * Standalone component — can be used in dashboard, banner, or reports.
 */

import { useMemo } from 'react';
import { cn } from '@/shared/lib/utils';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { getHealthColor } from '../types';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

interface CulturalHealthScoreProps {
  score: number;                // 0-100
  level?: string;               // "excepcional" | "saludable" | "atención" | "crítico"
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
}

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════

const SIZE_CONFIG = {
  sm: { viewBox: 80,  radius: 32, strokeWidth: 6, textSize: 'text-lg',  labelSize: 'text-[9px]', container: 'w-20 h-20' },
  md: { viewBox: 120, radius: 48, strokeWidth: 8, textSize: 'text-2xl', labelSize: 'text-[10px]', container: 'w-28 h-28' },
  lg: { viewBox: 160, radius: 64, strokeWidth: 10, textSize: 'text-3xl', labelSize: 'text-xs', container: 'w-36 h-36' },
} as const;

const LEVEL_LABELS: Record<string, string> = {
  excepcional: 'Excepcional',
  saludable: 'Saludable',
  atención: 'Atención',
  crítico: 'Crítico',
  unknown: 'Sin datos',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export default function CulturalHealthScore({
  score,
  level = 'unknown',
  size = 'md',
  showLabel = true,
  animated = true,
}: CulturalHealthScoreProps) {
  const prefersReduced = useReducedMotion();
  const config = SIZE_CONFIG[size];

  const { circumference, offset, color, center } = useMemo(() => {
    const circ = 2 * Math.PI * config.radius;
    const clampedScore = Math.max(0, Math.min(100, score));
    const off = circ * (1 - clampedScore / 100);
    return {
      circumference: circ,
      offset: off,
      color: getHealthColor(score),
      center: config.viewBox / 2,
    };
  }, [score, config]);

  const shouldAnimate = animated && !prefersReduced;

  return (
    <div className={cn('flex flex-col items-center gap-1', config.container)}>
      <svg
        viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
        className="h-full w-full"
        role="img"
        aria-label={`Health Score: ${score} de 100 — ${LEVEL_LABELS[level] ?? level}`}
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={config.radius}
          fill="none"
          stroke="var(--color-silver-600)"
          strokeWidth={config.strokeWidth}
          opacity={0.15}
        />

        {/* Foreground ring — score indicator */}
        <circle
          cx={center}
          cy={center}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className={shouldAnimate ? 'transition-[stroke-dashoffset] duration-1000 ease-out' : ''}
        />

        {/* Score number */}
        <text
          x={center}
          y={center - (size === 'sm' ? 2 : 4)}
          textAnchor="middle"
          dominantBaseline="central"
          className={cn('font-[family-name:var(--font-mono)] font-bold', config.textSize)}
          style={{ fill: color }}
        >
          {score}
        </text>

        {/* Level label */}
        {showLabel && (
          <text
            x={center}
            y={center + (size === 'sm' ? 10 : 16)}
            textAnchor="middle"
            dominantBaseline="central"
            className={cn('font-[family-name:var(--font-ui)]', config.labelSize)}
            style={{ fill: 'var(--color-silver-400)' }}
          >
            {LEVEL_LABELS[level] ?? level}
          </text>
        )}
      </svg>
    </div>
  );
}
