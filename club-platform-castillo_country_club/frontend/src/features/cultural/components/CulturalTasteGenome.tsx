/**
 * CulturalTasteGenome — "The Genome"
 *
 * A 6-axis SVG radar that visualizes a member's CulturalDNA:
 * openness, depth, sociality, adventurousness, ritualism, aesthetic_sensitivity.
 *
 * Renders as a hexagonal radar with:
 * — Background grid (3 concentric hexagons at 33%, 66%, 100%)
 * — 6 axis labels with values
 * — Filled polygon for the member's DNA profile
 * — Animated reveal on mount
 * — Hover tooltips per dimension
 * — Composite scores (cultural_maturity, engagement_intensity) as inner dots
 *
 * This is the SIGNATURE visualization of the Cultural domain.
 * When someone opens the Cultural Intelligence Panel, THIS is what
 * they remember. It answers: "What does culture MEAN to this person?"
 *
 * @module cultural/components/CulturalTasteGenome
 */

import { useMemo, useState, useCallback } from 'react';

import type {
  TasteProfile,
  CulturalDNA,
  GenreAffinity,
} from '../types';
import './CulturalTasteGenome.css';
import { Button } from "@/shared/components/ui/Button";

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalTasteGenomeProps {
  /** Member's full taste profile. */
  tasteProfile: TasteProfile;
  /** Override DNA (uses tasteProfile.culturalDNA if not provided). */
  culturalDNA?: CulturalDNA;
  /** Size of the SVG viewport. Default 320. */
  size?: number;
  /** Show genre affinities as secondary layer. Default false. */
  showGenres?: boolean;
  /** Animate polygon reveal on mount. Default true. */
  animate?: boolean;
  /** Click handler for a dimension axis. */
  onDimensionClick?: (dimension: keyof CulturalDNA) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  DIMENSION CONFIGURATION
// ══════════════════════════════════════════════════════════

interface DimensionConfig {
  key: keyof CulturalDNA;
  label: string;
  shortLabel: string;
  angle: number;       // degrees from top (0 = 12 o'clock)
  color: string;
  description: string;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: 'openness',
    label: 'Apertura',
    shortLabel: 'APE',
    angle: 0,
    color: '#60a5fa',
    description: 'Diversidad de géneros culturales explorados',
  },
  {
    key: 'depth',
    label: 'Profundidad',
    shortLabel: 'PRO',
    angle: 60,
    color: '#a78bfa',
    description: 'Nivel de inmersión en las experiencias culturales',
  },
  {
    key: 'sociality',
    label: 'Socialidad',
    shortLabel: 'SOC',
    angle: 120,
    color: '#4ade80',
    description: 'Preferencia por experiencias culturales grupales',
  },
  {
    key: 'adventurousness',
    label: 'Aventura',
    shortLabel: 'ADV',
    angle: 180,
    color: '#fbbf24',
    description: 'Búsqueda de novedad y géneros no explorados',
  },
  {
    key: 'ritualism',
    label: 'Ritual',
    shortLabel: 'RIT',
    angle: 240,
    color: '#fb923c',
    description: 'Patrones recurrentes y tradiciones culturales',
  },
  {
    key: 'aesthetic_sensitivity',
    label: 'Estética',
    shortLabel: 'EST',
    angle: 300,
    color: '#f472b6',
    description: 'Sensibilidad al detalle y calidad experiencial',
  },
];

// ══════════════════════════════════════════════════════════
//  GEOMETRY HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Converts polar coordinates (angle in degrees, radius) to
 * SVG cartesian coordinates centered at (cx, cy).
 */
function polarToCartesian(
  angleDeg: number,
  radius: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  // 0° = top (12 o'clock), clockwise
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Generates SVG points string for a regular polygon (hexagon)
 * at a given radius ratio (0-1).
 */
function hexagonPoints(
  cx: number,
  cy: number,
  maxRadius: number,
  ratio: number,
): string {
  const radius = maxRadius * ratio;
  return DIMENSIONS.map((dim) => {
    const { x, y } = polarToCartesian(dim.angle, radius, cx, cy);
    return `${x},${y}`;
  }).join(' ');
}

/**
 * Generates SVG points string for the DNA profile polygon.
 */
function dnaPolygonPoints(
  dna: CulturalDNA,
  cx: number,
  cy: number,
  maxRadius: number,
): string {
  return DIMENSIONS.map((dim) => {
    const value = (dna[dim.key] as number) ?? 0;
    const ratio = Math.max(0, Math.min(1, value / 100));
    const radius = maxRadius * ratio;
    const { x, y } = polarToCartesian(dim.angle, radius, cx, cy);
    return `${x},${y}`;
  }).join(' ');
}

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalTasteGenome({
  tasteProfile,
  culturalDNA: dnaOverride,
  size = 320,
  showGenres = false,
  animate = true,
  onDimensionClick,
  className = '',
}: CulturalTasteGenomeProps) {
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);

  const dna = dnaOverride ?? tasteProfile.culturalDNA;

  // SVG geometry
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = (size / 2) - 40; // margin for labels
  const labelRadius = maxRadius + 28;

  // Grid hexagons at 33%, 66%, 100%
  const gridRatios = [0.33, 0.66, 1.0];

  // DNA polygon points
  const dnaPoints = useMemo(
    () => dnaPolygonPoints(dna, cx, cy, maxRadius),
    [dna, cx, cy, maxRadius],
  );

  // Composite score positions (inner dots)
  const maturityRadius = maxRadius * 0.15;
  const engagementRadius = maxRadius * 0.08;

  // Hover handler
  const handleDimensionHover = useCallback((key: string | null) => {
    setHoveredDimension(key);
  }, []);

  // Top genres for secondary layer
  const topGenres = useMemo(() => {
    if (!showGenres) return [];
    return Object.values(tasteProfile.genrePreferences)
      .filter((g: GenreAffinity) => g.eventCount > 0)
      .sort((a, b) => b.affinityScore - a.affinityScore)
      .slice(0, 6);
  }, [tasteProfile.genrePreferences, showGenres]);

  // Profile confidence
  const confidence = tasteProfile.profileConfidence;

  return (
    <div
      className={`cultural-taste-genome ${className}`}
      style={{ '--genome-size': `${size}px` } as React.CSSProperties}
    >
      {/* Header */}
      <header className="cultural-taste-genome__header">
        <h3 className="cultural-taste-genome__title">Genoma Cultural</h3>
        <span className="cultural-taste-genome__confidence">
          Confianza: {(confidence * 100).toFixed(0)}% · {tasteProfile.dataPoints} pts
        </span>
      </header>

      {/* SVG Radar */}
      <svg
        className="cultural-taste-genome__svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={`Genoma Cultural: ${DIMENSIONS.map((d) => `${d.label} ${(dna[d.key] as number)}`).join(', ')}`}
      >
        {/* Grid hexagons */}
        {gridRatios.map((ratio) => (
          <polygon
            key={ratio}
            className="cultural-taste-genome__grid"
            points={hexagonPoints(cx, cy, maxRadius, ratio)}
            data-ratio={ratio}
          />
        ))}

        {/* Axis lines */}
        {DIMENSIONS.map((dim) => {
          const { x, y } = polarToCartesian(dim.angle, maxRadius, cx, cy);
          return (
            <line
              key={dim.key}
              className="cultural-taste-genome__axis"
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
            />
          );
        })}

        {/* DNA polygon — the filled profile */}
        <polygon
          className={`cultural-taste-genome__dna ${animate ? 'cultural-taste-genome__dna--animated' : ''}`}
          points={dnaPoints}
        />

        {/* DNA vertices — interactive dots */}
        {DIMENSIONS.map((dim) => {
          const value = (dna[dim.key] as number) ?? 0;
          const ratio = Math.max(0, Math.min(1, value / 100));
          const radius = maxRadius * ratio;
          const { x, y } = polarToCartesian(dim.angle, radius, cx, cy);
          const isHovered = hoveredDimension === dim.key;

          return (
            <g key={`vertex-${dim.key}`}>
              {/* Hover target (larger invisible circle) */}
              <circle
                className="cultural-taste-genome__vertex-target"
                cx={x}
                cy={y}
                r={14}
                onMouseEnter={() => handleDimensionHover(dim.key)}
                onMouseLeave={() => handleDimensionHover(null)}
                onClick={() => onDimensionClick?.(dim.key)}
              />

              {/* Visible dot */}
              <circle
                className={`cultural-taste-genome__vertex ${isHovered ? 'cultural-taste-genome__vertex--hovered' : ''}`}
                cx={x}
                cy={y}
                r={isHovered ? 5 : 3.5}
                style={{ fill: dim.color }}
              />

              {/* Value tooltip on hover */}
              {isHovered && (
                <g className="cultural-taste-genome__tooltip">
                  <rect
                    x={x - 28}
                    y={y - 24}
                    width={56}
                    height={20}
                    rx={4}
                    fill="rgba(0,0,0,0.85)"
                    stroke={dim.color}
                    strokeWidth={0.5}
                  />
                  <text
                    x={x}
                    y={y - 11}
                    textAnchor="middle"
                    fill={dim.color}
                    fontSize={11}
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
        {DIMENSIONS.map((dim) => {
          const { x, y } = polarToCartesian(dim.angle, labelRadius, cx, cy);
          const value = (dna[dim.key] as number) ?? 0;
          const isHovered = hoveredDimension === dim.key;

          return (
            <g key={`label-${dim.key}`}>
              <text
                className={`cultural-taste-genome__label ${isHovered ? 'cultural-taste-genome__label--hovered' : ''}`}
                x={x}
                y={y - 4}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: isHovered ? dim.color : undefined }}
              >
                {dim.shortLabel}
              </text>
              <text
                className="cultural-taste-genome__label-value"
                x={x}
                y={y + 10}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Composite scores — inner ring */}
        <g>
          <circle
            className="cultural-taste-genome__maturity-dot"
            cx={cx}
            cy={cy - maturityRadius}
            r={4}
          />
          <title>{`Madurez cultural: ${dna.cultural_maturity}`}</title>
        </g>
        <text
          className="cultural-taste-genome__composite-label"
          x={cx}
          y={cy - maturityRadius - 8}
          textAnchor="middle"
        >
          MC {dna.cultural_maturity}
        </text>

        <g>
          <circle
            className="cultural-taste-genome__engagement-dot"
            cx={cx}
            cy={cy + engagementRadius}
            r={3}
          />
          <title>{`Intensidad de engagement: ${dna.engagement_intensity}`}</title>
        </g>
        <text
          className="cultural-taste-genome__composite-label"
          x={cx}
          y={cy + engagementRadius + 10}
          textAnchor="middle"
        >
          IE {dna.engagement_intensity}
        </text>
      </svg>

      {/* Dimension legend (below SVG) */}
      <div className="cultural-taste-genome__legend">
        {DIMENSIONS.map((dim) => {
          const value = (dna[dim.key] as number) ?? 0;
          const isHovered = hoveredDimension === dim.key;

          return (
            <Button
              variant="unstyled"
              key={dim.key}
              className={`cultural-taste-genome__legend-item ${isHovered ? 'cultural-taste-genome__legend-item--hovered' : ''}`}
              onMouseEnter={() => handleDimensionHover(dim.key)}
              onMouseLeave={() => handleDimensionHover(null)}
              onClick={() => onDimensionClick?.(dim.key)}
              title={dim.description}
            >
              <span
                className="cultural-taste-genome__legend-dot"
                style={{ background: dim.color }}
              />
              <span className="cultural-taste-genome__legend-label">
                {dim.label}
              </span>
              <span className="cultural-taste-genome__legend-value">
                {value}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Top genres (optional secondary layer) */}
      {showGenres && topGenres.length > 0 && (
        <div className="cultural-taste-genome__genres">
          <span className="cultural-taste-genome__genres-title">
            Top géneros
          </span>
          <div className="cultural-taste-genome__genres-list">
            {topGenres.map((genre) => (
              <div
                key={genre.genre}
                className="cultural-taste-genome__genre-chip"
              >
                <span className="cultural-taste-genome__genre-name">
                  {genre.genre}
                </span>
                <span className="cultural-taste-genome__genre-score">
                  {genre.affinityScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taste metadata */}
      <footer className="cultural-taste-genome__meta">
        <span>
          Velocidad: {tasteProfile.tasteVelocity > 0 ? '+' : ''}
          {tasteProfile.tasteVelocity}
        </span>
        <span>Exploración: {tasteProfile.explorationIndex}/100</span>
        <span>
          {tasteProfile.depthVsBreadth < 40
            ? 'Especialista'
            : tasteProfile.depthVsBreadth > 60
              ? 'Generalista'
              : 'Equilibrado'}
        </span>
      </footer>
    </div>
  );
}