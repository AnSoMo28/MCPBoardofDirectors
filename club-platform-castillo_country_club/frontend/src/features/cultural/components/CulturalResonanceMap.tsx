/**
 * CulturalResonanceMap — "The Resonance"
 *
 * An SVG bubble chart that visualizes how much each cultural event
 * REVERBERATED in a member. Not satisfaction — RESONANCE.
 *
 * Each bubble represents an event:
 * — Position X = date (temporal axis)
 * — Position Y = total resonance score (0-100)
 * — Size = echo count (how many times the event was referenced)
 * — Color = resonance level (transformative → negligible)
 * — Fill opacity = identity integration (deeper = more opaque)
 *
 * On hover: shows the 7-dimension breakdown (immediate, talkAboutIt,
 * recommend, seekRepeat, socialShare, identityIntegration, duration).
 *
 * This answers: "Which events CHANGED this person, and which ones
 * they forgot by Monday?"
 *
 * @module cultural/components/CulturalResonanceMap
 */

import { useMemo, useState } from 'react';

import type { ResonanceScore } from '../types';
import { CULTURAL_RESONANCE_THRESHOLDS } from '../config';
import {
  classifyResonanceLevel,
  computeAverageResonance,
  computeResonanceDrop,
} from '../lib/culturalResonance';
import './CulturalResonanceMap.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalResonanceMapProps {
  /** Array of resonance scores from the engine. */
  scores: ResonanceScore[];
  /** Width of the SVG viewport. Default 580. */
  width?: number;
  /** Height of the SVG viewport. Default 300. */
  height?: number;
  /** Animate on mount. Default true. */
  animate?: boolean;
  /** Callback when operator clicks a bubble. */
  onBubbleClick?: (score: ResonanceScore) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  RESONANCE LEVEL COLORS
// ══════════════════════════════════════════════════════════

const LEVEL_COLORS: Record<string, { fill: string; stroke: string }> = {
  transformative: { fill: 'rgba(251, 191, 36, 0.35)', stroke: '#fbbf24' },
  strong:         { fill: 'rgba(74, 222, 128, 0.30)', stroke: '#4ade80' },
  moderate:       { fill: 'rgba(96, 165, 250, 0.25)', stroke: '#60a5fa' },
  minimal:        { fill: 'rgba(107, 114, 128, 0.20)', stroke: '#6b7280' },
  negligible:     { fill: 'rgba(55, 65, 81, 0.15)',   stroke: '#374151' },
};

// ══════════════════════════════════════════════════════════
//  GEOMETRY CONSTANTS
// ══════════════════════════════════════════════════════════

const MARGIN = { top: 35, right: 30, bottom: 40, left: 45 };
const BUBBLE_MIN_R = 4;
const BUBBLE_MAX_R = 18;
const ECHO_MAX = 6;

// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalResonanceMap({
  scores,
  width = 580,
  height = 300,
  animate = true,
  onBubbleClick,
  className = '',
}: CulturalResonanceMapProps) {
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null);

  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  // Sort by date for temporal ordering
  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => a.eventId.localeCompare(b.eventId)),
    [scores],
  );

  // Compute aggregate stats
  const avgResonance = useMemo(
    () => computeAverageResonance(scores),
    [scores],
  );

  const resonanceDrop = useMemo(
    () => computeResonanceDrop(scores),
    [scores],
  );

  // Layout: X = index (temporal), Y = totalResonance
  const bubbles = useMemo(() => {
    if (sortedScores.length === 0) return [];

    return sortedScores.map((score, index) => {
      const xRatio = sortedScores.length > 1
        ? index / (sortedScores.length - 1)
        : 0.5;
      const x = MARGIN.left + xRatio * plotWidth;

      const yRatio = score.totalResonance / 100;
      const y = MARGIN.top + plotHeight * (1 - yRatio);

      const echoRatio = Math.min(1, score.echoCount / ECHO_MAX);
      const r = BUBBLE_MIN_R + (BUBBLE_MAX_R - BUBBLE_MIN_R) * echoRatio;

      const level = classifyResonanceLevel(score.totalResonance);
      const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.negligible;

      // Identity integration determines fill opacity
      const identityRatio = score.identityIntegration / 100;

      return {
        score,
        x,
        y,
        r,
        level,
        colors,
        identityRatio,
        index,
      };
    });
  }, [sortedScores, plotWidth, plotHeight]);

  // Y-axis gridlines
  const yGridLines = useMemo(() => {
    const lines = [];
    for (let val = 0; val <= 100; val += 25) {
      const y = MARGIN.top + plotHeight * (1 - val / 100);
      lines.push({ val, y });
    }
    return lines;
  }, [plotHeight]);

  // Threshold lines
  const thresholdLines = useMemo(() => {
    const T = CULTURAL_RESONANCE_THRESHOLDS;
    return [
      { label: 'Transform', value: T.TRANSFORMATIVE, color: '#fbbf24' },
      { label: 'Strong', value: T.STRONG, color: '#4ade80' },
      { label: 'Moderate', value: T.MODERATE, color: '#60a5fa' },
      { label: 'Minimal', value: T.MINIMAL, color: '#6b7280' },
    ].map((t) => ({
      ...t,
      y: MARGIN.top + plotHeight * (1 - t.value / 100),
    }));
  }, [plotHeight]);

  if (scores.length === 0) {
    return (
      <div className={`cultural-resonance-map ${className}`}>
        <p className="cultural-resonance-map__empty">
          Sin datos de resonancia
        </p>
      </div>
    );
  }

  return (
    <div className={`cultural-resonance-map ${className}`}>
      {/* Header */}
      <header className="cultural-resonance-map__header">
        <h3 className="cultural-resonance-map__title">Mapa de Resonancia</h3>
        <div className="cultural-resonance-map__stats">
          <span className="cultural-resonance-map__stat">
            Promedio: {avgResonance}
          </span>
          {resonanceDrop.drop > 0 && (
            <span className="cultural-resonance-map__stat cultural-resonance-map__stat--drop">
              Δ {resonanceDrop.drop.toFixed(0)}
            </span>
          )}
          <span className="cultural-resonance-map__stat">
            {scores.length} evento{scores.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* SVG Chart */}
      <svg
        className="cultural-resonance-map__svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Mapa de resonancia con ${scores.length} eventos`}
      >
        {/* Y-axis gridlines */}
        {yGridLines.map((line) => (
          <g key={`grid-${line.val}`}>
            <line
              className="cultural-resonance-map__gridline"
              x1={MARGIN.left}
              y1={line.y}
              x2={width - MARGIN.right}
              y2={line.y}
            />
            <text
              className="cultural-resonance-map__y-label"
              x={MARGIN.left - 8}
              y={line.y + 3}
              textAnchor="end"
            >
              {line.val}
            </text>
          </g>
        ))}

        {/* Threshold lines */}
        {thresholdLines.map((t) => (
          <line
            key={`threshold-${t.value}`}
            className="cultural-resonance-map__threshold"
            x1={MARGIN.left}
            y1={t.y}
            x2={width - MARGIN.right}
            y2={t.y}
            stroke={t.color}
          />
        ))}

        {/* Average resonance line */}
        <line
          className="cultural-resonance-map__avg-line"
          x1={MARGIN.left}
          y1={MARGIN.top + plotHeight * (1 - avgResonance / 100)}
          x2={width - MARGIN.right}
          y2={MARGIN.top + plotHeight * (1 - avgResonance / 100)}
        />
        <text
          className="cultural-resonance-map__avg-label"
          x={width - MARGIN.right + 4}
          y={MARGIN.top + plotHeight * (1 - avgResonance / 100) + 3}
        >
          avg {avgResonance}
        </text>

        {/* Bubbles */}
        {bubbles.map((bubble) => {
          const isHovered = hoveredBubble === bubble.score.eventId;

          return (
            <g
              key={`bubble-${bubble.score.eventId}`}
              className={`cultural-resonance-map__bubble-group ${isHovered ? 'cultural-resonance-map__bubble-group--hovered' : ''}`}
              style={{
                animationDelay: animate ? `${bubble.index * 60}ms` : '0ms',
              } as React.CSSProperties}
            >
              {/* Hover target */}
              <circle
                className="cultural-resonance-map__bubble-target"
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.r + 6}
                onMouseEnter={() => setHoveredBubble(bubble.score.eventId)}
                onMouseLeave={() => setHoveredBubble(null)}
                onClick={() => onBubbleClick?.(bubble.score)}
              />

              {/* Visible bubble */}
              <circle
                className="cultural-resonance-map__bubble"
                cx={bubble.x}
                cy={bubble.y}
                r={isHovered ? bubble.r + 2 : bubble.r}
                fill={bubble.colors.fill}
                stroke={bubble.colors.stroke}
                strokeWidth={isHovered ? 2 : 1}
                opacity={0.4 + bubble.identityRatio * 0.6}
              />

              {/* Center dot */}
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={2}
                fill={bubble.colors.stroke}
                opacity={isHovered ? 1 : 0.6}
              />

              {/* Tooltip on hover */}
              {isHovered && (
                <g className="cultural-resonance-map__tooltip">
                  {/* Tooltip background */}
                  <rect
                    x={Math.min(bubble.x - 75, width - MARGIN.right - 155)}
                    y={bubble.y - 95}
                    width={150}
                    height={85}
                    rx={5}
                    fill="rgba(0,0,0,0.92)"
                    stroke={bubble.colors.stroke}
                    strokeWidth={0.75}
                  />

                  {/* Event title */}
                  <text
                    x={Math.min(bubble.x - 70, width - MARGIN.right - 180) + 75}
                    y={bubble.y - 78}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.9)"
                    fontSize={9}
                    fontWeight={600}
                    fontFamily="'Cormorant Garamond', serif"
                  >
                    Evento {bubble.index + 1}
                  </text>

                  {/* Resonance score */}
                  <text
                    x={Math.min(bubble.x - 70, width - MARGIN.right - 180) + 75}
                    y={bubble.y - 64}
                    textAnchor="middle"
                    fill={bubble.colors.stroke}
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="'DM Mono', monospace"
                  >
                    {bubble.score.totalResonance}/100
                  </text>

                  {/* Level */}
                  <text
                    x={Math.min(bubble.x - 70, width - MARGIN.right - 180) + 75}
                    y={bubble.y - 51}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.45)"
                    fontSize={7}
                    fontFamily="'DM Mono', monospace"
                    transform="uppercase"
                  >
                    {bubble.level}
                  </text>

                  {/* Dimension mini-bars */}
                  {[
                    { label: 'Imm', value: bubble.score.immediateScore },
                    { label: 'Id', value: bubble.score.identityIntegration },
                    { label: 'Dur', value: bubble.score.resonanceDuration },
                    { label: 'Echo', value: Math.min(100, bubble.score.echoCount * 20) },
                  ].map((dim, dIdx) => {
                    const barX = Math.min(bubble.x - 70, width - MARGIN.right - 180) + 10;
                    const barY = bubble.y - 38 + dIdx * 11;
                    const barWidth = 90;

                    return (
                      <g key={dim.label}>
                        <text
                          x={barX}
                          y={barY + 3}
                          fill="rgba(255,255,255,0.35)"
                          fontSize={6}
                          fontFamily="'DM Mono', monospace"
                        >
                          {dim.label}
                        </text>
                        <rect
                          x={barX + 20}
                          y={barY - 3}
                          width={barWidth}
                          height={4}
                          rx={2}
                          fill="rgba(255,255,255,0.06)"
                        />
                        <rect
                          x={barX + 20}
                          y={barY - 3}
                          width={barWidth * (dim.value / 100)}
                          height={4}
                          rx={2}
                          fill={bubble.colors.stroke}
                          opacity={0.7}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}

        {/* X-axis labels (first, middle, last) */}
        {sortedScores.length > 0 && (
          <>
            <text
              className="cultural-resonance-map__x-label"
              x={MARGIN.left}
              y={height - 10}
              textAnchor="start"
            >
              {sortedScores[0].eventId.substring(0, 10)}
            </text>
            {sortedScores.length > 2 && (
              <text
                className="cultural-resonance-map__x-label"
                x={MARGIN.left + plotWidth / 2}
                y={height - 10}
                textAnchor="middle"
              >
                {sortedScores[Math.floor(sortedScores.length / 2)].eventId.substring(0, 10)}
              </text>
            )}
            <text
              className="cultural-resonance-map__x-label"
              x={width - MARGIN.right}
              y={height - 10}
              textAnchor="end"
            >
              {sortedScores[sortedScores.length - 1].eventId.substring(0, 10)}
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="cultural-resonance-map__legend">
        {Object.entries(LEVEL_COLORS).map(([level, colors]) => (
          <span key={level} className="cultural-resonance-map__legend-item">
            <span
              className="cultural-resonance-map__legend-dot"
              style={{
                background: colors.fill,
                borderColor: colors.stroke,
              }}
            />
            <span className="cultural-resonance-map__legend-label">
              {level}
            </span>
          </span>
        ))}
      </div>

      {/* Stats bar */}
      <footer className="cultural-resonance-map__footer">
        <span>Tamaño = echo count (frecuencia de referencia)</span>
        <span>Opacidad = identity integration</span>
        <span>Y = resonancia total (0-100)</span>
      </footer>
    </div>
  );
}