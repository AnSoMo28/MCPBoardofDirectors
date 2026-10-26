/**
 * VenueBrain — "The Venue"
 *
 * A dual visualization that shows:
 * 1. SVG hexagonal radar — venue personality (6 axes)
 * 2. SVG abstract floor plan — sensory configuration overlay
 *
 * The radar answers: "What IS this venue?"
 * The floor plan answers: "How should this venue FEEL for an event?"
 *
 * 6 personality axes:
 * — Energy (calm → vibrant)
 * — Sociality (intimate → social)
 * — Formality (casual → formal)
 * — Exclusivity (open → exclusive)
 * — Versatility (specialist → generalist)
 * — Utilization (underused → saturated)
 *
 * @module cultural/components/VenueBrain
 */

import { useMemo, useState, useCallback } from 'react';

import type {
  VenuePersonality,
  SensoryProfile
} from '../types';
import './VenueBrain.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface VenueBrainProps {
  /** Venue personality from the engine. */
  personality: VenuePersonality;
  /** Radar size. Default 260. */
  radarSize?: number;
  /** Show sensory overlay. Default true. */
  showSensory?: boolean;
  /** Animate on mount. Default true. */
  animate?: boolean;
  /** Click handler for a personality axis. */
  onAxisClick?: (axis: string) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  AXIS CONFIGURATION
// ══════════════════════════════════════════════════════════

interface AxisConfig {
  key: keyof Pick<
    VenuePersonality,
    'energy' | 'sociality' | 'formality' | 'versatility' | 'avgOccupancy' | 'avgSatisfaction'
  >;
  label: string;
  shortLabel: string;
  angle: number;
  color: string;
}

const AXES: AxisConfig[] = [
  { key: 'energy',          label: 'Energía',      shortLabel: 'ENG', angle: 0,   color: '#f472b6' },
  { key: 'sociality',       label: 'Socialidad',   shortLabel: 'SOC', angle: 60,  color: '#4ade80' },
  { key: 'formality',       label: 'Formalidad',   shortLabel: 'FRM', angle: 120, color: '#a78bfa' },
  { key: 'versatility',     label: 'Versatilidad', shortLabel: 'VRS', angle: 180, color: '#60a5fa' },
  { key: 'avgOccupancy',    label: 'Ocupación',    shortLabel: 'OCP', angle: 240, color: '#fbbf24' },
  { key: 'avgSatisfaction', label: 'Satisfacción', shortLabel: 'SAT', angle: 300, color: '#fb923c' },
];

// ══════════════════════════════════════════════════════════
//  SENSORY ICON MAPPING
// ══════════════════════════════════════════════════════════

interface SensoryIcon {
  label: string;
  value: string;
  icon: string;
}

function buildSensoryIcons(profile: SensoryProfile): SensoryIcon[] {
  return [
    {
      label: 'Luz',
      value: `${profile.lighting.mood} · ${profile.lighting.baseLevel}%`,
      icon: profile.lighting.mood === 'intimate' ? '🔅' :
            profile.lighting.mood === 'dramatic' ? '🔆' :
            profile.lighting.mood === 'bright' ? '☀️' : '💡',
    },
    {
      label: 'Acústica',
      value: `${profile.acoustics.reverberation} · ${profile.acoustics.ambientNoise}`,
      icon: profile.acoustics.reverberation === 'intimate' ? '🤫' :
            profile.acoustics.reverberation === 'cathedral' ? '🔊' : '🔉',
    },
    {
      label: 'Temperatura',
      value: `${profile.temperature.base}°C`,
      icon: '🌡',
    },
    {
      label: 'Aroma',
      value: profile.aroma,
      icon: profile.aroma === 'luxury' ? '✨' :
            profile.aroma === 'aromatic' ? '🌿' :
            profile.aroma === 'fresh' ? '🍃' : '◻',
    },
    {
      label: 'Layout',
      value: `${profile.layout.flowPattern} · max ${profile.layout.maxCapacity}`,
      icon: profile.layout.stagePresence ? '🎭' : '📐',
    },
    {
      label: 'Ventilación',
      value: profile.temperature.ventilation,
      icon: profile.temperature.ventilation === 'natural' ? '🌬' :
            profile.temperature.ventilation === 'controlled' ? '❄' : '🔄',
    },
  ];
}

// ══════════════════════════════════════════════════════════
//  GEOMETRY HELPERS
// ══════════════════════════════════════════════════════════

function polarToCartesian(
  angleDeg: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function hexagonPoints(cx: number, cy: number, maxRadius: number, ratio: number): string {
  const radius = maxRadius * ratio;
  return AXES.map((axis) => {
    const { x, y } = polarToCartesian(axis.angle, radius, cx, cy);
    return `${x},${y}`;
  }).join(' ');
}

function personalityPolygonPoints(
  personality: VenuePersonality,
  cx: number,
  cy: number,
  maxRadius: number,
): string {
  return AXES.map((axis) => {
    const value = (personality[axis.key] as number) ?? 0;
    const ratio = Math.max(0, Math.min(1, value / 100));
    const { x, y } = polarToCartesian(axis.angle, maxRadius * ratio, cx, cy);
    return `${x},${y}`;
  }).join(' ');
}

// ══════════════════════════════════════════════════════════
//  TREND INDICATOR
// ══════════════════════════════════════════════════════════

function trendSymbol(trend: 'increasing' | 'stable' | 'declining'): { symbol: string; color: string } {
  switch (trend) {
    case 'increasing': return { symbol: '↑', color: '#4ade80' };
    case 'declining':  return { symbol: '↓', color: '#ef4444' };
    default:           return { symbol: '→', color: '#6b7280' };
  }
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function VenueBrain({
  personality,
  radarSize = 260,
  showSensory = true,
  animate = true,
  onAxisClick,
  className = '',
}: VenueBrainProps) {
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const cx = radarSize / 2;
  const cy = radarSize / 2;
  const maxRadius = (radarSize / 2) - 35;
  const labelRadius = maxRadius + 24;

  const gridRatios = [0.33, 0.66, 1.0];

  const polygonPoints = useMemo(
    () => personalityPolygonPoints(personality, cx, cy, maxRadius),
    [personality, cx, cy, maxRadius],
  );

  const sensoryIcons = useMemo(
    () => (showSensory ? buildSensoryIcons(personality.sensoryProfile) : []),
    [personality.sensoryProfile, showSensory],
  );

  const trend = trendSymbol(personality.utilizationTrend);

  const handleAxisHover = useCallback((key: string | null) => {
    setHoveredAxis(key);
  }, []);

  return (
    <div className={`venue-brain ${className}`}>
      {/* Header */}
      <header className="venue-brain__header">
        <div className="venue-brain__header-left">
          <h3 className="venue-brain__title">{personality.venueName}</h3>
          <span className="venue-brain__trend" style={{ color: trend.color }}>
            {trend.symbol} {personality.utilizationTrend}
          </span>
        </div>
        <div className="venue-brain__header-right">
          <span className="venue-brain__stat">
            Cap. óptima: {personality.optimalCapacity}
          </span>
          <span className="venue-brain__stat">
            Mejor hora: {personality.bestTimeOfDay}
          </span>
        </div>
      </header>

      {/* SVG Radar */}
      <svg
        className="venue-brain__radar"
        viewBox={`0 0 ${radarSize} ${radarSize}`}
        width={radarSize}
        height={radarSize}
        role="img"
        aria-label={`Personalidad de ${personality.venueName}: ${AXES.map((a) => `${a.label} ${personality[a.key]}`).join(', ')}`}
      >
        {/* Grid hexagons */}
        {gridRatios.map((ratio) => (
          <polygon
            key={ratio}
            className="venue-brain__grid"
            points={hexagonPoints(cx, cy, maxRadius, ratio)}
          />
        ))}

        {/* Axis lines */}
        {AXES.map((axis) => {
          const { x, y } = polarToCartesian(axis.angle, maxRadius, cx, cy);
          return (
            <line
              key={axis.key}
              className="venue-brain__axis-line"
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
            />
          );
        })}

        {/* Personality polygon */}
        <polygon
          className={`venue-brain__polygon ${animate ? 'venue-brain__polygon--animated' : ''}`}
          points={polygonPoints}
        />

        {/* Vertices */}
        {AXES.map((axis) => {
          const value = (personality[axis.key] as number) ?? 0;
          const ratio = Math.max(0, Math.min(1, value / 100));
          const { x, y } = polarToCartesian(axis.angle, maxRadius * ratio, cx, cy);
          const isHovered = hoveredAxis === axis.key;

          return (
            <g key={`vertex-${axis.key}`}>
              <circle
                className="venue-brain__vertex-target"
                cx={x}
                cy={y}
                r={14}
                onMouseEnter={() => handleAxisHover(axis.key)}
                onMouseLeave={() => handleAxisHover(null)}
                onClick={() => onAxisClick?.(axis.key)}
              />
              <circle
                className={`venue-brain__vertex ${isHovered ? 'venue-brain__vertex--hovered' : ''}`}
                cx={x}
                cy={y}
                r={isHovered ? 5 : 3.5}
                style={{ fill: axis.color }}
              />

              {isHovered && (
                <g className="venue-brain__tooltip">
                  <rect
                    x={x - 26}
                    y={y - 22}
                    width={52}
                    height={18}
                    rx={3}
                    fill="rgba(0,0,0,0.88)"
                    stroke={axis.color}
                    strokeWidth={0.5}
                  />
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    fill={axis.color}
                    fontSize={10}
                    fontWeight={600}
                    fontFamily="'DM Mono', monospace"
                  >
                    {value}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Axis labels */}
        {AXES.map((axis) => {
          const { x, y } = polarToCartesian(axis.angle, labelRadius, cx, cy);
          const value = (personality[axis.key] as number) ?? 0;
          const isHovered = hoveredAxis === axis.key;

          return (
            <g key={`label-${axis.key}`}>
              <text
                className={`venue-brain__label ${isHovered ? 'venue-brain__label--hovered' : ''}`}
                x={x}
                y={y - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: isHovered ? axis.color : undefined }}
              >
                {axis.shortLabel}
              </text>
              <text
                className="venue-brain__label-value"
                x={x}
                y={y + 9}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {value}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Best genres */}
      {personality.bestGenres.length > 0 && (
        <div className="venue-brain__genres">
          <span className="venue-brain__section-label">Mejores géneros</span>
          <div className="venue-brain__genre-chips">
            {personality.bestGenres.map((genre) => (
              <span key={genre} className="venue-brain__genre-chip">
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sensory profile overlay */}
      {showSensory && sensoryIcons.length > 0 && (
        <div className="venue-brain__sensory">
          <span className="venue-brain__section-label">Perfil sensorial</span>
          <div className="venue-brain__sensory-grid">
            {sensoryIcons.map((s) => (
              <div key={s.label} className="venue-brain__sensory-item">
                <span className="venue-brain__sensory-icon">{s.icon}</span>
                <div className="venue-brain__sensory-info">
                  <span className="venue-brain__sensory-label">{s.label}</span>
                  <span className="venue-brain__sensory-value">{s.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="venue-brain__footer">
        <span className="venue-brain__footer-stat">
          Intimidad: {personality.intimacy}
        </span>
        <span className="venue-brain__footer-stat">
          Exclusividad: {personality.exclusivity}
        </span>
        <span className="venue-brain__footer-stat">
          Satisfacción avg: {personality.avgSatisfaction}
        </span>
      </footer>
    </div>
  );
}