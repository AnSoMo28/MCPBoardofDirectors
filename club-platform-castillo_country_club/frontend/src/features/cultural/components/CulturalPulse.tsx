/**
 * CulturalPulse — Heartbeat indicator of the Cultural domain
 *
 * Renders a pulsing SVG circle that reflects the current state
 * of cultural programming. Replaces CulturalAdvisorBanner V1
 * with a more visceral, visual representation.
 *
 * Pulse behavior by mode:
 * — pulse:    steady, confident beat (green)
 * — flowing:  smooth, rhythmic wave (blue)
 * — deep:     slow, contemplative breath (purple)
 * — critical: urgent, rapid alert (red)
 * — dormant:  faint, barely-there flicker (gray)
 *
 * @module cultural/components/CulturalPulse
 */

import { useMemo } from 'react';

import type {
  CulturalAmbientState,
  CulturalDashboardMode,
} from '../types';
import type {
  CulturalAdvisorInsight,
  AdvisorSeverity,
} from '../lib/advisor/types';
import './CulturalPulse.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalPulseProps {
  ambientState: CulturalAmbientState;
  advisorInsights: CulturalAdvisorInsight[];
  /** Click handler — opens full advisor panel. */
  onExpand?: () => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  MODE CONFIGURATION
// ══════════════════════════════════════════════════════════

interface PulseConfig {
  color: string;
  glowColor: string;
  speed: number;
  scale: [number, number];
  label: string;
  description: string;
}

type CulturalPulseMode = CulturalDashboardMode | 'pulse' | 'flowing' | 'deep' | 'critical' | 'dormant';

const PULSE_CONFIGS: Record<CulturalPulseMode, PulseConfig> = {
  pulse: {
    color: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.3)',
    speed: 1.5,
    scale: [1, 1.12],
    label: 'Latido',
    description: 'Programación cultural activa y saludable',
  },
  flowing: {
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.25)',
    speed: 2.5,
    scale: [1, 1.08],
    label: 'Flujo',
    description: 'Engagement cultural en movimiento',
  },
  deep: {
    color: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.2)',
    speed: 3.5,
    scale: [1, 1.05],
    label: 'Profundo',
    description: 'Experiencias culturales de alta resonancia',
  },
  critical: {
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.35)',
    speed: 0.8,
    scale: [1, 1.18],
    label: 'Crítico',
    description: 'Atención inmediata requerida',
  },
  calm: {
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.25)',
    speed: 2,
    scale: [1, 1.06],
    label: 'Calma',
    description: 'Ambiente cultural estable',
  },
  alert: {
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.3)',
    speed: 1.2,
    scale: [1, 1.14],
    label: 'Alerta',
    description: 'Se requiere atención cultural',
  },
  dormant: {
    color: '#6b7280',
    glowColor: 'rgba(107, 114, 128, 0.15)',
    speed: 4,
    scale: [1, 1.03],
    label: 'Inactivo',
    description: 'Sin actividad cultural reciente',
  },
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalPulse({
  ambientState,
  advisorInsights,
  onExpand,
  className = '',
}: CulturalPulseProps) {
  const mode = ambientState.mode as CulturalDashboardMode || 'dormant';
  const config = PULSE_CONFIGS[mode] ?? PULSE_CONFIGS.dormant;

  // Count insights by severity
  const severityCounts = useMemo(() => {
    const counts: Record<AdvisorSeverity, number> = { high: 0, medium: 0, low: 0 };
    for (const insight of advisorInsights) {
      counts[insight.severity] = (counts[insight.severity] ?? 0) + 1;
    }
    return counts;
  }, [advisorInsights]);

  const hasUrgent = severityCounts.high > 0;

  const pulseStyle = useMemo(
    () => ({
      '--pulse-color': config.color,
      '--pulse-glow': config.glowColor,
      '--pulse-speed': `${config.speed}s`,
      '--pulse-scale-min': config.scale[0],
      '--pulse-scale-max': config.scale[1],
    }) as React.CSSProperties,
    [config],
  );

  return (
    <Button
      variant="unstyled"
      className={`cultural-pulse ${hasUrgent ? 'cultural-pulse--urgent' : ''} ${className}`}
      style={pulseStyle}
      onClick={onExpand}
      aria-label={`${config.label}: ${config.description}. ${severityCounts.high} críticos, ${severityCounts.medium} atención, ${severityCounts.low} oportunidades.`}
    >
      {/* SVG Heartbeat */}
      <svg
        className="cultural-pulse__svg"
        viewBox="0 0 48 48"
        width="48"
        height="48"
        aria-hidden="true"
      >
        {/* Outer glow ring */}
        <circle
          className="cultural-pulse__glow-ring"
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke={config.color}
          strokeWidth="0.5"
          opacity="0.3"
        />

        {/* Main pulse circle */}
        <circle
          className="cultural-pulse__circle"
          cx="24"
          cy="24"
          r="14"
          fill={config.color}
          opacity="0.15"
        />

        {/* Core dot */}
        <circle
          className="cultural-pulse__core"
          cx="24"
          cy="24"
          r="4"
          fill={config.color}
        />

        {/* ECG line (heartbeat trace) */}
        <polyline
          className="cultural-pulse__ecg"
          points="8,24 14,24 16,18 18,30 20,20 22,28 24,24 30,24 32,20 34,28 36,24 40,24"
          fill="none"
          stroke={config.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>

      {/* Label + counts */}
      <div className="cultural-pulse__info">
        <span className="cultural-pulse__label">{config.label}</span>
        <div className="cultural-pulse__counts">
          {severityCounts.high > 0 && (
            <span className="cultural-pulse__count cultural-pulse__count--high">
              {severityCounts.high}
            </span>
          )}
          {severityCounts.medium > 0 && (
            <span className="cultural-pulse__count cultural-pulse__count--medium">
              {severityCounts.medium}
            </span>
          )}
          {severityCounts.low > 0 && (
            <span className="cultural-pulse__count cultural-pulse__count--low">
              {severityCounts.low}
            </span>
          )}
        </div>
      </div>
    </Button>
  );
}