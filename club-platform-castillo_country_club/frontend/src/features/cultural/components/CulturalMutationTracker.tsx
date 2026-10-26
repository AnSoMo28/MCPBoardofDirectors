/**
 * CulturalMutationTracker — "The Mutations"
 *
 * An SVG timeline that visualizes taste mutations — discontinuities
 * in a member's cultural preferences. When someone who loved jazz
 * suddenly discovers visual arts, that's a MUTATION. It's not a
 * gradual drift — it's a phase transition in their identity.
 *
 * Renders as:
 * — Horizontal timeline with genre affinity streams (stacked areas)
 * — Mutation events marked as lightning bolt indicators
 * — Confidence and magnitude encoded in size and opacity
 * — Direction arrows showing from → to genre
 * — Stability prediction as a fading trail
 *
 * This answers: "How is this person's cultural identity EVOLVING,
 * and where are the discontinuities?"
 *
 * @module cultural/components/CulturalMutationTracker
 */

import { useMemo, useState } from 'react';

import type {
  TasteMutation,
  TasteProfile,
  GenreAffinity,
} from '../types';
import './CulturalMutationTracker.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalMutationTrackerProps {
  /** Detected taste mutations from the engine. */
  mutations: TasteMutation[];
  /** Member's taste profile for context. */
  tasteProfile?: TasteProfile;
  /** Width of the SVG viewport. Default 560. */
  width?: number;
  /** Height of the SVG viewport. Default 240. */
  height?: number;
  /** Animate on mount. Default true. */
  animate?: boolean;
  /** Callback when operator clicks a mutation. */
  onMutationClick?: (mutation: TasteMutation) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  MUTATION TYPE CONFIG
// ══════════════════════════════════════════════════════════

interface MutationTypeConfig {
  color: string;
  icon: string;
  label: string;
  description: string;
}

const MUTATION_TYPE_CONFIG: Record<string, MutationTypeConfig> = {
  discovery: {
    color: '#4ade80',
    icon: '✦',
    label: 'Descubrimiento',
    description: 'Nuevo género emergente en el perfil',
  },
  abandonment: {
    color: '#ef4444',
    icon: '✧',
    label: 'Abandono',
    description: 'Género previamente activo ahora ignorado',
  },
  shift: {
    color: '#60a5fa',
    icon: '◈',
    label: 'Cambio',
    description: 'Redirección de un género hacia otro',
  },
  deepening: {
    color: '#a78bfa',
    icon: '◆',
    label: 'Profundización',
    description: 'Inmersión más profunda en un género existente',
  },
  broadening: {
    color: '#fbbf24',
    icon: '◇',
    label: 'Expansión',
    description: 'Ampliación del repertorio cultural',
  },
};

// ══════════════════════════════════════════════════════════
//  GEOMETRY CONSTANTS
// ══════════════════════════════════════════════════════════

const MARGIN = { top: 30, right: 25, bottom: 35, left: 25 };
const STREAM_HEIGHT = 80;
const STREAM_Y = 90;
const MUTATION_MARKER_SIZE = 12;

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalMutationTracker({
  mutations,
  tasteProfile,
  width = 560,
  height = 240,
  animate = true,
  onMutationClick,
  className = '',
}: CulturalMutationTrackerProps) {
  const [hoveredMutation, setHoveredMutation] = useState<string | null>(null);

  const plotWidth = width - MARGIN.left - MARGIN.right;
  // Sort mutations by detectedAt
  const sortedMutations = useMemo(
    () => [...mutations].sort((a, b) => a.detectedDate.localeCompare(b.detectedDate)),
    [mutations],
  );

  // Genre affinities for stream context
  const topGenres = useMemo(() => {
    if (!tasteProfile) return [];
    return Object.values(tasteProfile.genrePreferences)
      .filter((g: GenreAffinity) => g.eventCount > 0)
      .sort((a, b) => b.affinityScore - a.affinityScore)
      .slice(0, 5);
  }, [tasteProfile]);

  // Position mutations along X axis
  const mutationPositions = useMemo(() => {
    if (sortedMutations.length === 0) return [];

    return sortedMutations.map((mutation, index) => {
      const xRatio = sortedMutations.length > 1
        ? index / (sortedMutations.length - 1)
        : 0.5;
      const x = MARGIN.left + xRatio * plotWidth;

      // Y position based on magnitude (higher magnitude = higher on chart)
      const yRatio = mutation.magnitude / 100;
      const y = STREAM_Y - yRatio * 30;

      // Marker size based on confidence
      const markerSize = MUTATION_MARKER_SIZE * (0.5 + mutation.confidence * 0.5);

      const config = MUTATION_TYPE_CONFIG[mutation.type] ?? MUTATION_TYPE_CONFIG.shift;

      return {
        mutation,
        x,
        y,
        markerSize,
        config,
        index,
      };
    });
  }, [sortedMutations, plotWidth]);

  // Build genre stream data (simplified stacked representation)
  const genreStreams = useMemo(() => {
    if (topGenres.length === 0) return [];

    return topGenres.map((genre, gIdx) => {
      const baseY = STREAM_Y + 15;
      const streamY = baseY + gIdx * (STREAM_HEIGHT / topGenres.length);
      const streamH = STREAM_HEIGHT / topGenres.length - 2;
      const color = getGenreColor(genre.genre);

      // Simple bar representing affinity
      const affinityWidth = (genre.affinityScore / 100) * plotWidth * 0.6;

      return {
        genre: genre.genre,
        y: streamY,
        height: streamH,
        width: affinityWidth,
        color,
        affinity: genre.affinityScore,
        trend: genre.trend,
      };
    });
  }, [topGenres, plotWidth]);

  if (mutations.length === 0) {
    return (
      <div className={`cultural-mutation-tracker ${className}`}>
        <p className="cultural-mutation-tracker__empty">
          Sin mutaciones de gusto detectadas
        </p>
      </div>
    );
  }

  return (
    <div className={`cultural-mutation-tracker ${className}`}>
      {/* Header */}
      <header className="cultural-mutation-tracker__header">
        <h3 className="cultural-mutation-tracker__title">Mutaciones de Gusto</h3>
        <div className="cultural-mutation-tracker__stats">
          <span className="cultural-mutation-tracker__stat">
            {mutations.length} mutación{mutations.length !== 1 ? 'es' : ''}
          </span>
          {sortedMutations.length > 0 && (
            <span className="cultural-mutation-tracker__stat">
              Confianza max: {(Math.max(...mutations.map((m) => m.confidence)) * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </header>

      {/* SVG Timeline */}
      <svg
        className="cultural-mutation-tracker__svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`${mutations.length} mutaciones de gusto detectadas`}
      >
        {/* Section label: Mutations */}
        <text
          className="cultural-mutation-tracker__section-label"
          x={MARGIN.left}
          y={MARGIN.top - 5}
        >
          MUTACIONES
        </text>

        {/* Section label: Genre streams */}
        <text
          className="cultural-mutation-tracker__section-label"
          x={MARGIN.left}
          y={STREAM_Y + 8}
        >
          FLUJO DE GÉNEROS
        </text>

        {/* Baseline for mutations */}
        <line
          className="cultural-mutation-tracker__baseline"
          x1={MARGIN.left}
          y1={STREAM_Y}
          x2={width - MARGIN.right}
          y2={STREAM_Y}
        />

        {/* Mutation markers */}
        {mutationPositions.map((pos) => {
          const { mutation, x, y, markerSize, config, index } = pos;
          const isHovered = hoveredMutation === `${mutation.type}-${index}`;
          // predictedStability comes from engine and may use domain-specific
          // tokens. Map known tokens to opacity fallbacks.
          const stabilityOpacity = (
            mutation.predictedStability === 'permanent_shift' ? 1 :
            mutation.predictedStability === 'emerging_interest' ? 0.6 :
            mutation.predictedStability === 'fad' ? 0.3 :
            0.5
          );

          return (
            <g
              key={`mutation-${mutation.type}-${index}`}
              className={`cultural-mutation-tracker__mutation ${isHovered ? 'cultural-mutation-tracker__mutation--hovered' : ''}`}
              style={{
                animationDelay: animate ? `${index * 120}ms` : '0ms',
              } as React.CSSProperties}
              onMouseEnter={() => setHoveredMutation(`${mutation.type}-${index}`)}
              onMouseLeave={() => setHoveredMutation(null)}
              onClick={() => onMutationClick?.(mutation)}
            >
              {/* Vertical connection line to baseline */}
              <line
                className="cultural-mutation-tracker__mutation-line"
                x1={x}
                y1={y}
                x2={x}
                y2={STREAM_Y}
                stroke={config.color}
                strokeOpacity={0.3}
                strokeDasharray="2 2"
              />

              {/* Lightning bolt marker (rotated diamond) */}
              <polygon
                className="cultural-mutation-tracker__marker"
                points={`
                  ${x},${y - markerSize}
                  ${x + markerSize * 0.6},${y}
                  ${x},${y + markerSize * 0.3}
                  ${x - markerSize * 0.6},${y}
                `}
                fill={config.color}
                fillOpacity={0.25 * stabilityOpacity}
                stroke={config.color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isHovered ? 0.9 : 0.5 * stabilityOpacity}
              />

              {/* Icon */}
              <text
                x={x}
                y={y + 2}
                textAnchor="middle"
                fill={config.color}
                fontSize={8}
                opacity={isHovered ? 1 : 0.7}
              >
                {config.icon}
              </text>

              {/* Direction arrow (from → to genre) */}
              {mutation.fromGenre && mutation.toGenre && (
                <g className="cultural-mutation-tracker__arrow">
                  <text
                    x={x - 20}
                    y={y - markerSize - 5}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.3)"
                    fontSize={6}
                    fontFamily="'DM Mono', monospace"
                  >
                    {mutation.fromGenre.substring(0, 6)}
                  </text>
                  <text
                    x={x}
                    y={y - markerSize - 5}
                    textAnchor="middle"
                    fill={config.color}
                    fontSize={7}
                    fontFamily="'DM Mono', monospace"
                  >
                    →
                  </text>
                  <text
                    x={x + 20}
                    y={y - markerSize - 5}
                    textAnchor="start"
                    fill="rgba(255,255,255,0.5)"
                    fontSize={6}
                    fontFamily="'DM Mono', monospace"
                    fontWeight={600}
                  >
                    {mutation.toGenre.substring(0, 6)}
                  </text>
                </g>
              )}

              {/* Tooltip on hover */}
              {isHovered && (
                <g className="cultural-mutation-tracker__tooltip">
                  <rect
                    x={x - 70}
                    y={y - 70}
                    width={140}
                    height={48}
                    rx={4}
                    fill="rgba(0,0,0,0.9)"
                    stroke={config.color}
                    strokeWidth={0.5}
                  />
                  <text
                    x={x}
                    y={y - 53}
                    textAnchor="middle"
                    fill={config.color}
                    fontSize={9}
                    fontWeight={600}
                    fontFamily="'DM Mono', monospace"
                  >
                    {config.label}
                  </text>
                  <text
                    x={x}
                    y={y - 40}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontSize={7}
                    fontFamily="'DM Mono', monospace"
                  >
                    Magnitud: {mutation.magnitude} · Confianza: {(mutation.confidence * 100).toFixed(0)}%
                  </text>
                  <text
                    x={x}
                    y={y - 28}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.4)"
                    fontSize={6}
                    fontFamily="'DM Mono', monospace"
                  >
                    Estabilidad: {mutation.predictedStability} · {mutation.detectedDate.substring(0, 10)}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Genre affinity streams */}
        {genreStreams.map((stream, _sIdx) => (
          <g key={`stream-${stream.genre}`}>
            {/* Stream bar */}
            <rect
              className="cultural-mutation-tracker__stream-bar"
              x={MARGIN.left}
              y={stream.y}
              width={stream.width}
              height={stream.height}
              rx={3}
              fill={stream.color}
              opacity={0.15}
              stroke={stream.color}
              strokeWidth={0.5}
              strokeOpacity={0.25}
            />

            {/* Genre label */}
            <text
              className="cultural-mutation-tracker__stream-label"
              x={MARGIN.left + stream.width + 8}
              y={stream.y + stream.height / 2 + 3}
            >
              {stream.genre} ({stream.affinity})
            </text>

            {/* Trend indicator */}
            {stream.trend === 'growing' && (
              <text
                x={MARGIN.left + stream.width + stream.genre.length * 5 + 50}
                y={stream.y + stream.height / 2 + 3}
                fill="#4ade80"
                fontSize={7}
              >
                ↑
              </text>
            )}
            {stream.trend === 'declining' && (
              <text
                x={MARGIN.left + stream.width + stream.genre.length * 5 + 50}
                y={stream.y + stream.height / 2 + 3}
                fill="#ef4444"
                fontSize={7}
              >
                ↓
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Type legend */}
      <div className="cultural-mutation-tracker__legend">
        {Object.entries(MUTATION_TYPE_CONFIG).map(([type, config]) => {
          const count = mutations.filter((m) => m.type === type).length;
          if (count === 0) return null;

          return (
            <span key={type} className="cultural-mutation-tracker__legend-item">
              <span
                className="cultural-mutation-tracker__legend-icon"
                style={{ color: config.color }}
              >
                {config.icon}
              </span>
              <span className="cultural-mutation-tracker__legend-label">
                {config.label}
              </span>
              <span className="cultural-mutation-tracker__legend-count">
                {count}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════

const GENRE_COLORS: Record<string, string> = {
  music:            '#60a5fa',
  visual_arts:      '#a78bfa',
  theater:          '#f472b6',
  dance:            '#fb923c',
  literature:       '#fbbf24',
  gastronomy:       '#4ade80',
  heritage:         '#f59e0b',
  wine_spirits:     '#c084fc',
  lectures:         '#818cf8',
  workshops:        '#34d399',
  contemporary:     '#e879f9',
  family:           '#a3e635',
  seasonal:         '#fb7185',
  wellness_cultural:'#2dd4bf',
};

function getGenreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? '#6b7280';
}