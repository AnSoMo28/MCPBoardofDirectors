/**
 * CulturalJourneyComposer — "The Journey"
 *
 * An SVG timeline that visualizes a member's cultural journey:
 * phases of exploration, key moments of transformation, and the
 * trajectory horizon.
 *
 * Renders as a horizontal timeline with:
 * — Phases as colored segments (each phase = a chapter in their cultural story)
 * — Events as dots within each phase (size = match score)
 * — Key moments as highlighted diamonds (identity shifts)
 * — Horizon indicator showing where the journey is heading
 * — Phase transitions with connecting arcs
 *
 * This answers: "WHERE has this member been culturally, and
 * WHERE are they going?"
 *
 * @module cultural/components/CulturalJourneyComposer
 */

import { useMemo, useState } from 'react';

import type {
  CulturalJourney,
  CulturalDNA
} from '../types';
import './CulturalJourneyComposer.css';

// ══════════════════════════════════════════════════════════
//  PROPS
// ══════════════════════════════════════════════════════════

export interface CulturalJourneyComposerProps {
  /** Member's cultural journey from engine output. */
  journey: CulturalJourney;
  /** CulturalDNA for context overlay. */
  culturalDNA?: CulturalDNA;
  /** Width of the SVG viewport. Default 640. */
  width?: number;
  /** Height of the SVG viewport. Default 280. */
  height?: number;
  /** Animate on mount. Default true. */
  animate?: boolean;
  /** Callback when operator clicks a phase. */
  onPhaseClick?: (phaseIndex: number) => void;
  /** Callback when operator clicks a key moment. */
  onKeyMomentClick?: (momentIndex: number) => void;
  className?: string;
}

// ══════════════════════════════════════════════════════════
//  PHASE COLOR MAPPING
// ══════════════════════════════════════════════════════════

const PHASE_COLORS: Record<string, string> = {
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

function getPhaseColor(theme: string): string {
  return PHASE_COLORS[theme] ?? '#6b7280';
}

// ══════════════════════════════════════════════════════════
//  GEOMETRY CONSTANTS
// ══════════════════════════════════════════════════════════

const TIMELINE_Y = 120;          // vertical center of timeline
const PHASE_HEIGHT = 50;         // height of phase segment
const EVENT_DOT_MIN = 3;         // min radius of event dots
const EVENT_DOT_MAX = 7;         // max radius of event dots
const KEY_MOMENT_SIZE = 8;       // diamond size for key moments
const MARGIN_X = 50;             // horizontal margin
// ══════════════════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════════════════

export function CulturalJourneyComposer({ journey, width = 640, height = 280, animate = true, onPhaseClick, onKeyMomentClick, className = '' }: CulturalJourneyComposerProps) {
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Layout computations
  const layout = useMemo(() => {
    const phases = journey.phases;
    if (phases.length === 0) return null;

    const usableWidth = width - MARGIN_X * 2;
    const phaseGap = 12;
    const totalGaps = (phases.length - 1) * phaseGap;
    const phaseWidth = (usableWidth - totalGaps) / phases.length;

    return {
      usableWidth,
      phaseGap,
      phaseWidth,
      phases,
    };
  }, [journey.phases, width]);

  if (!layout || journey.phases.length === 0) {
    return (
      <div className={`cultural-journey-composer ${className}`}>
        <p className="cultural-journey-composer__empty">
          Sin datos de journey cultural
        </p>
      </div>
    );
  }

  const { phaseWidth, phaseGap, phases } = layout;
  return (
    <div className={`cultural-journey-composer ${className}`}>
      {/* Header */}
      <header className="cultural-journey-composer__header">
        <h3 className="cultural-journey-composer__title">Journey Cultural</h3>
        <div className="cultural-journey-composer__meta">
          <span className="cultural-journey-composer__horizon">
            Horizonte: {journey.horizon}
          </span>
          <span className="cultural-journey-composer__exploration">
            Exploración: {journey.expansionRate}%
          </span>
          <span className="cultural-journey-composer__dates">
            {typeof journey.startDate === 'string' ? journey.startDate : journey.startDate?.toString()} → {typeof journey.endDate === 'string' ? journey.endDate : journey.endDate?.toString()}
          </span>
        </div>
      </header>

      {/* SVG Timeline */}
      <svg
        className="cultural-journey-composer__svg"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`Journey cultural con ${phases.length} fases`}
      >
        {/* Timeline base line */}
        <line
          className="cultural-journey-composer__baseline"
          x1={MARGIN_X}
          y1={TIMELINE_Y}
          x2={width - MARGIN_X}
          y2={TIMELINE_Y}
        />

        {/* Phases */}
        {phases.map((phase, index) => {
          const x = MARGIN_X + index * (phaseWidth + phaseGap);
          const color = getPhaseColor(phase.theme);
          const isHovered = hoveredPhase === index;
          const eventCount = phase.events.length;
          const avgMatch = eventCount > 0
            ? Math.round(
                phase.events.reduce((s, e) => s + e.matchScore, 0) / eventCount,
              )
            : 50;

          return (
            <g
              key={`phase-${index}`}
              className={`cultural-journey-composer__phase ${isHovered ? 'cultural-journey-composer__phase--hovered' : ''}`}
              onMouseEnter={() => setHoveredPhase(index)}
              onMouseLeave={() => setHoveredPhase(null)}
              onClick={() => onPhaseClick?.(index)}
              style={{
                animationDelay: animate ? `${index * 150}ms` : '0ms',
              } as React.CSSProperties}
            >
              {/* Phase segment (rounded rect) */}
              <rect
                className="cultural-journey-composer__phase-bar"
                x={x}
                y={TIMELINE_Y - PHASE_HEIGHT / 2}
                width={phaseWidth}
                height={PHASE_HEIGHT}
                rx={6}
                fill={color}
                opacity={isHovered ? 0.25 : 0.12}
                stroke={color}
                strokeWidth={isHovered ? 1.5 : 0.75}
                strokeOpacity={isHovered ? 0.6 : 0.25}
              />

              {/* Phase label (top) */}
              <text
                className="cultural-journey-composer__phase-label"
                x={x + phaseWidth / 2}
                y={TIMELINE_Y - PHASE_HEIGHT / 2 - 10}
                textAnchor="middle"
                fill={isHovered ? color : undefined}
              >
                {phase.theme}
              </text>

              {/* Phase metadata (bottom) */}
              <text
                className="cultural-journey-composer__phase-meta"
                x={x + phaseWidth / 2}
                y={TIMELINE_Y + PHASE_HEIGHT / 2 + 14}
                textAnchor="middle"
              >
                {eventCount} evento{eventCount !== 1 ? 's' : ''} · match {avgMatch}
              </text>

              {/* Phase dates */}
              <text
                className="cultural-journey-composer__phase-dates"
                x={x + phaseWidth / 2}
                y={TIMELINE_Y + PHASE_HEIGHT / 2 + 28}
                textAnchor="middle"
              >
                {phase.startDate}
              </text>

              {/* Event dots within phase */}
              {phase.events.map((event, eIdx) => {
                const dotSpacing = phaseWidth / (phase.events.length + 1);
                const dotX = x + dotSpacing * (eIdx + 1);
                const matchRatio = event.matchScore / 100;
                const dotR = EVENT_DOT_MIN + (EVENT_DOT_MAX - EVENT_DOT_MIN) * matchRatio;
                const isEventHovered = hoveredEvent === event.eventId;

                return (
                  <g key={`event-${event.eventId}`}>
                    {/* Hover target */}
                    <circle
                      className="cultural-journey-composer__event-target"
                      cx={dotX}
                      cy={TIMELINE_Y}
                      r={12}
                      onMouseEnter={() => setHoveredEvent(event.eventId)}
                      onMouseLeave={() => setHoveredEvent(null)}
                    />

                    {/* Visible dot */}
                    <circle
                      className={`cultural-journey-composer__event-dot ${isEventHovered ? 'cultural-journey-composer__event-dot--hovered' : ''}`}
                      cx={dotX}
                      cy={TIMELINE_Y}
                      r={isEventHovered ? dotR + 1.5 : dotR}
                      fill={color}
                      opacity={isEventHovered ? 0.9 : 0.6}
                    />

                    {/* Event tooltip */}
                    {isEventHovered && (
                      <g className="cultural-journey-composer__tooltip">
                        <rect
                          x={dotX - 60}
                          y={TIMELINE_Y - 42}
                          width={120}
                          height={28}
                          rx={4}
                          fill="rgba(0,0,0,0.9)"
                          stroke={color}
                          strokeWidth={0.5}
                        />
                        <text
                          x={dotX}
                          y={TIMELINE_Y - 30}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.85)"
                          fontSize={9}
                          fontFamily="'DM Mono', monospace"
                        >
                          {event.title}
                        </text>
                        <text
                          x={dotX}
                          y={TIMELINE_Y - 19}
                          textAnchor="middle"
                          fill={color}
                          fontSize={8}
                          fontFamily="'DM Mono', monospace"
                        >
                          match {event.matchScore} · {event.date}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Phase transition arc (connecting line to next phase) */}
              {index < phases.length - 1 && (
                <line
                  className="cultural-journey-composer__transition"
                  x1={x + phaseWidth}
                  y1={TIMELINE_Y}
                  x2={x + phaseWidth + phaseGap}
                  y2={TIMELINE_Y}
                  stroke={color}
                  strokeOpacity={0.3}
                  strokeDasharray="3 2"
                />
              )}
            </g>
          );
        })}

        {/* Key moments — diamonds above timeline */}
        {journey.keyMoments.map((moment, mIdx) => {
          // Position key moment at its corresponding date
          const momentDate = new Date(moment.date);
          const startDate = new Date(journey.startDate);
          const endDate = new Date(journey.endDate);
          const totalDuration = endDate.getTime() - startDate.getTime();
          const momentProgress = totalDuration > 0
            ? (momentDate.getTime() - startDate.getTime()) / totalDuration
            : 0;

          const momentX = MARGIN_X + momentProgress * layout.usableWidth;
          const momentY = TIMELINE_Y - PHASE_HEIGHT / 2 - 30;

          return (
            <g
              key={`moment-${mIdx}`}
              className="cultural-journey-composer__moment"
              onClick={() => onKeyMomentClick?.(mIdx)}
            >
              {/* Diamond shape */}
              <polygon
                className="cultural-journey-composer__moment-diamond"
                points={`
                  ${momentX},${momentY - KEY_MOMENT_SIZE}
                  ${momentX + KEY_MOMENT_SIZE},${momentY}
                  ${momentX},${momentY + KEY_MOMENT_SIZE}
                  ${momentX - KEY_MOMENT_SIZE},${momentY}
                `}
              />

              {/* Connection line to timeline */}
              <line
                className="cultural-journey-composer__moment-line"
                x1={momentX}
                y1={momentY + KEY_MOMENT_SIZE}
                x2={momentX}
                y2={TIMELINE_Y - PHASE_HEIGHT / 2}
              />

              {/* Label */}
              <text
                className="cultural-journey-composer__moment-label"
                x={momentX}
                y={momentY - KEY_MOMENT_SIZE - 5}
                textAnchor="middle"
              >
                {moment.description?.substring(0, 20) ?? moment.significance}
              </text>
            </g>
          );
        })}

        {/* Horizon indicator (right edge) */}
        <g className="cultural-journey-composer__horizon-indicator">
          <line
            x1={width - MARGIN_X + 5}
            y1={TIMELINE_Y - 30}
            x2={width - MARGIN_X + 5}
            y2={TIMELINE_Y + 30}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            className="cultural-journey-composer__horizon-label"
            x={width - MARGIN_X + 15}
            y={TIMELINE_Y - 18}
          >
            → {journey.horizon}
          </text>
        </g>
      </svg>

      {/* Journey summary bar */}
      <footer className="cultural-journey-composer__footer">
        <div className="cultural-journey-composer__summary-item">
          <span className="cultural-journey-composer__summary-label">Fases</span>
          <span className="cultural-journey-composer__summary-value">
            {phases.length}
          </span>
        </div>
        <div className="cultural-journey-composer__summary-item">
          <span className="cultural-journey-composer__summary-label">Eventos</span>
          <span className="cultural-journey-composer__summary-value">
            {phases.reduce((s, p) => s + p.events.length, 0)}
          </span>
        </div>
        <div className="cultural-journey-composer__summary-item">
          <span className="cultural-journey-composer__summary-label">Momentos clave</span>
          <span className="cultural-journey-composer__summary-value">
            {journey.keyMoments.length}
          </span>
        </div>
        <div className="cultural-journey-composer__summary-item">
          <span className="cultural-journey-composer__summary-label">Propósito</span>
          <span className="cultural-journey-composer__summary-value">
            {journey.purpose}
          </span>
        </div>
      </footer>
    </div>
  );
}