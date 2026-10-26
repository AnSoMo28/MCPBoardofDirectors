/**
 * CulturalAmbientCanvas — The "sky" of the Cultural Dashboard
 *
 * A full-viewport background canvas that sets the atmospheric mood.
 * Renders a layered composition:
 * — Gradient mesh that shifts with dashboard mode
 * — Grain noise overlay for texture
 * — Subtle particle field (CSS-only, no JS animation loop)
 *
 * This component is pure atmosphere — no data, no logic, no interactions.
 * It reads CulturalAmbientState and responds to mode changes.
 *
 * @module cultural/components/CulturalAmbientCanvas
 */

import { useMemo } from 'react';

import type { CulturalAmbientState } from '../types';
import './CulturalAmbientCanvas.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalAmbientCanvasProps {
  ambientState: CulturalAmbientState;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  MODE → GRADIENT MAPPING
// ══════════════════════════════════════════════════════════

const MODE_GRADIENTS: Record<string, string> = {
  pulse: `
    radial-gradient(ellipse at 20% 50%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.05) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 80%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)
  `,
  flowing: `
    radial-gradient(ellipse at 30% 40%, rgba(96, 165, 250, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 70%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 20%, rgba(37, 99, 235, 0.04) 0%, transparent 60%)
  `,
  deep: `
    radial-gradient(ellipse at 25% 60%, rgba(167, 139, 250, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 75% 30%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 90%, rgba(124, 58, 237, 0.04) 0%, transparent 60%)
  `,
  critical: `
    radial-gradient(ellipse at 30% 30%, rgba(239, 68, 68, 0.10) 0%, transparent 45%),
    radial-gradient(ellipse at 70% 70%, rgba(220, 38, 38, 0.06) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 50%, rgba(185, 28, 28, 0.04) 0%, transparent 55%)
  `,
  dormant: `
    radial-gradient(ellipse at 50% 50%, rgba(107, 114, 128, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 30% 70%, rgba(75, 85, 99, 0.04) 0%, transparent 40%)
  `,
};

const MODE_BG_COLORS: Record<string, string> = {
  pulse: '#0a0f0d',
  flowing: '#0a0d12',
  deep: '#0d0a14',
  critical: '#120a0a',
  dormant: '#0d0d0d',
};

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalAmbientCanvas({
  ambientState,
  className = '',
}: CulturalAmbientCanvasProps) {
  const { mode } = ambientState;
  const ambientIntensity = ((ambientState as any).ambientIntensity as number) ?? 1;
  const pulseColor = ((ambientState as any).pulseColor as string) ?? '#ffffff';

  const gradient = MODE_GRADIENTS[mode] ?? MODE_GRADIENTS.dormant;
  const bgColor = MODE_BG_COLORS[mode] ?? MODE_BG_COLORS.dormant;

  const canvasStyle = useMemo(
    () => ({
      '--ambient-bg': bgColor,
      '--ambient-gradient': gradient,
      '--ambient-pulse-color': pulseColor,
      '--ambient-intensity': ambientIntensity,
      '--ambient-opacity': Math.max(0.3, ambientIntensity * 0.6),
    }) as React.CSSProperties,
    [bgColor, gradient, pulseColor, ambientIntensity],
  );

  return (
    <div
      className={`cultural-ambient-canvas ${className}`}
      style={canvasStyle}
      aria-hidden="true"
    >
      {/* Layer 1: Base gradient mesh */}
      <div className="cultural-ambient-canvas__mesh" />

      {/* Layer 2: Grain noise texture */}
      <div className="cultural-ambient-canvas__grain" />

      {/* Layer 3: Subtle glow at pulse color */}
      <div className="cultural-ambient-canvas__glow" />
    </div>
  );
}