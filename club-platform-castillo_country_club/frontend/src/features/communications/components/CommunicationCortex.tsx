// src/features/communications/components/CommunicationCortex.tsx
// ═══════════════════════════════════════════════════════════
// Communication Cortex — The Neural Sphere
// Castillo Country Club — Phase 31 "The Voice"
//
// A living visualization of communication intelligence.
// 6 orbital dimensions orbit a pulsing center sphere.
// Each orbit represents a dimension of communication health.
// The sphere breathes with the heartbeat of the ecosystem.
//
// Below the sphere: Pulse Vitals (4 key metrics)
// Below vitals: Thinking Stream (AI thoughts in natural language)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import {
  Brain, Heart, Clock, BookOpen, Bell, Zap, Eye,
  TrendingUp, TrendingDown, Activity, AlertTriangle,
  CheckCircle, Radio,
} from "lucide-react";
import type { CommDashboardState } from "../hooks/useCommunicationDashboard";

import {
  EMOTIONAL_ZONE_CONFIG,
  SILENCE_LEVEL_CONFIG,
  FATIGUE_LEVEL_CONFIG,
  STORY_HEALTH_CONFIG
} from "../types";

import type {
  StoryHealth,
} from "../types";

import "./CommunicationCortex.css";

// ═══════════════════════════════════════════════════════════
// EXPORTED TYPES
// ═══════════════════════════════════════════════════════════

/**
 * A single thinking entry — the AI articulates its reasoning.
 * This is what makes the cortex feel ALIVE: the AI doesn't
 * just compute, it NARRATES its thought process.
 */
export interface ThinkingEntry {
  id: string;
  timestamp: string;
  type:
    | "observation"
    | "analysis"
    | "evaluation"
    | "prediction"
    | "decision"
    | "action";
  text: string;
  icon: string;
  confidence?: number;
}

/**
 * An orbital dimension — one ring of the neural sphere.
 */
interface OrbitDimension {
  id: string;
  label: string;
  radius: number;
  speed: number;
  reverse: boolean;
  dasharray: string;
  statusKey: string;
  statusValue: string;
  statusLabel: string;
  value: number;
}

// ═══════════════════════════════════════════════════════════
// ICON MAPPER
// ═══════════════════════════════════════════════════════════

function getThinkingIcon(iconName: string): typeof Brain {
  const map: Record<string, typeof Brain> = {
    brain: Brain,
    heart: Heart,
    clock: Clock,
    "book-open": BookOpen,
    bell: Bell,
    zap: Zap,
    eye: Eye,
    "trending-up": TrendingUp,
    "trending-down": TrendingDown,
    activity: Activity,
    "alert-triangle": AlertTriangle,
    "check-circle": CheckCircle,
    radio: Radio,
  };
  return map[iconName] ?? Brain;
}

/**
 * Map thinking type to a border color token.
 * Each type has a distinct semantic color.
 */
function getThinkingTypeColor(type: ThinkingEntry["type"]): string {
  const map: Record<ThinkingEntry["type"], string> = {
    observation: "var(--color-teal-400)",
    analysis: "var(--color-gold-400)",
    evaluation: "var(--color-amber-400)",
    prediction: "var(--color-emerald-400)",
    decision: "var(--color-rose-400)",
    action: "var(--color-teal-400)",
  };
  return map[type] ?? "var(--color-silver-500)";
}

// ═══════════════════════════════════════════════════════════
// ORBIT BUILDER
// ═══════════════════════════════════════════════════════════

function buildOrbits(state: CommDashboardState): OrbitDimension[] {
  // Orbit 1: Sentimiento
  const emotionZone = state.emotionalZone;
  const emotionScore = state.trajectory?.current.score ?? 50;

  // Orbit 2: Silencio
  const silenceLevel = state.silenceLevel;
  const silenceDays = state.silence?.current_silence_days ?? 0;
  const silenceRetention = state.silence
    ? Math.round((1 - state.silence.disengagement_risk) * 100)
    : 100;

  // Orbit 3: Narrativa
  const storyHealth = state.narrative?.story_health ?? "strong";
  const narrativeMomentum = state.narrative
    ? state.narrative.chapters.length * 10
    : 0;

  // Orbit 4: Fatiga
  const fatigueLevel = state.fatigueLevel;
  const fatigueScore = state.fatigue
    ? Math.round((1 - state.fatigue.current_level) * 100)
    : 100;

  // Orbit 5: Resonancia
  const resonanceCount = state.trajectory?.resonance_events.length ?? 0;
  const resonanceScore = Math.min(100, resonanceCount * 25);

  // Orbit 6: Gravedad (retention)
  const gravityScore = Math.round((1 - state.disengagementRiskScore) * 100);
  const escapeRisk: "safe" | "drifting" | "approaching" | "critical" =
    state.disengagementRiskScore > 0.8
      ? "critical"
      : state.disengagementRiskScore > 0.5
        ? "approaching"
        : state.disengagementRiskScore > 0.25
          ? "drifting"
          : "safe";

  return [
    {
      id: "emotion",
      label: "Sentimiento",
      radius: 65,
      speed: 18,
      reverse: false,
      dasharray: "8 4",
      statusKey: "data-zone",
      statusValue: emotionZone,
      statusLabel: `${EMOTIONAL_ZONE_CONFIG[emotionZone].label} (${emotionScore})`,
      value: emotionScore,
    },
    {
      id: "silence",
      label: "Silencio",
      radius: 95,
      speed: 26,
      reverse: true,
      dasharray: "12 6",
      statusKey: "data-silence",
      statusValue: silenceLevel,
      statusLabel: `${SILENCE_LEVEL_CONFIG[silenceLevel].label} (${silenceDays}d)`,
      value: silenceRetention,
    },
    {
      id: "narrative",
      label: "Narrativa",
      radius: 125,
      speed: 35,
      reverse: false,
      dasharray: "4 8",
      statusKey: "data-story",
      statusValue: storyHealth,
      statusLabel: `${STORY_HEALTH_CONFIG[storyHealth as StoryHealth].label} (${narrativeMomentum}%)`,
      value: Math.min(100, narrativeMomentum),
    },
    {
      id: "fatigue",
      label: "Fatiga",
      radius: 155,
      speed: 45,
      reverse: true,
      dasharray: "16 4 4 4",
      statusKey: "data-fatigue",
      statusValue: fatigueLevel,
      statusLabel: `${FATIGUE_LEVEL_CONFIG[fatigueLevel].label} (${fatigueScore}%)`,
      value: fatigueScore,
    },
    {
      id: "resonance",
      label: "Resonancia",
      radius: 185,
      speed: 55,
      reverse: false,
      dasharray: "6 10",
      statusKey: "data-resonance",
      statusValue: resonanceCount > 0 ? "active" : "quiet",
      statusLabel: `${resonanceCount} evento(s)`,
      value: resonanceScore,
    },
    {
      id: "gravity",
      label: "Gravedad",
      radius: 215,
      speed: 70,
      reverse: true,
      dasharray: "20 6",
      statusKey: "data-gravity",
      statusValue: escapeRisk,
      statusLabel: `Retención: ${gravityScore}%`,
      value: gravityScore,
    },
  ];
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface CommunicationCortexProps {
  state: CommDashboardState;
  thinkingEntries: ThinkingEntry[];
  compositeScore: number;
}

export function CommunicationCortex({
  state,
  thinkingEntries,
  compositeScore,
}: CommunicationCortexProps) {
  const orbits = useMemo(() => buildOrbits(state), [state]);

  const cx = 250;
  const cy = 250;

  return (
    <div
      className="glass-comm-cortex"
      data-mode={state.dashboardMode}
    >
      {/* ── Neural Sphere SVG ──────────────────────────── */}
      <div className="cortex-visual">
        <svg
          viewBox="0 0 500 500"
          className="cortex-svg"
          role="img"
          aria-label="Communication Cortex — neural sphere showing 6 dimensions of communication health"
        >
          <defs>
            {/* Center glow gradient */}
            <radialGradient id="cortex-center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="cortex-glow-inner" stopOpacity="0.35" />
              <stop offset="100%" className="cortex-glow-outer" stopOpacity="0" />
            </radialGradient>

            {/* Soft blur for glow effect */}
            <filter id="cortex-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Ambient background glow */}
          <circle
            cx={cx}
            cy={cy}
            r="240"
            fill="url(#cortex-center-glow)"
            className="cortex-ambient-glow"
          />

          {/* Orbital rings */}
          {orbits.map((orbit, i) => (
            <g
              key={orbit.id}
              className="cortex-orbit-track"
              data-index={i}
            >
              {/* Orbit path (the ring itself) */}
              <circle
                cx={cx}
                cy={cy}
                r={orbit.radius}
                className="cortex-orbit-path"
                fill="none"
                strokeWidth="1.2"
                strokeDasharray={orbit.dasharray}
                {...{ [orbit.statusKey]: orbit.statusValue }}
              />

              {/* Orbiting dot (animated via CSS transform) */}
              <g
                className="cortex-orbit-rotator"
                style={{
                  "--orbit-speed": `${orbit.speed}s`,
                  "--orbit-dir": orbit.reverse ? "reverse" : "normal",
                  "--orbit-cx": `${cx}px`,
                  "--orbit-cy": `${cy}px`,
                } as React.CSSProperties}
              >
                <circle
                  cx={cx + orbit.radius}
                  cy={cy}
                  r="5"
                  className="cortex-orbit-dot"
                  {...{ [orbit.statusKey]: orbit.statusValue }}
                />
              </g>

              {/* Orbit label (positioned at top of ring) */}
              <text
                x={cx}
                y={cy - orbit.radius - 8}
                className="cortex-orbit-label"
                textAnchor="middle"
                {...{ [orbit.statusKey]: orbit.statusValue }}
              >
                {orbit.label}
              </text>

              {/* Status sublabel */}
              <text
                x={cx}
                y={cy - orbit.radius + 4}
                className="cortex-orbit-sublabel"
                textAnchor="middle"
              >
                {orbit.statusLabel}
              </text>
            </g>
          ))}

          {/* Center sphere group */}
          <g className="cortex-center-group" data-mode={state.dashboardMode}>
            {/* Glow behind sphere */}
            <circle
              cx={cx}
              cy={cy}
              r="52"
              className="cortex-center-glow-circle"
              filter="url(#cortex-blur)"
            />

            {/* Main sphere */}
            <circle
              cx={cx}
              cy={cy}
              r="42"
              className="cortex-center-sphere"
            />

            {/* Score text */}
            <text
              x={cx}
              y={cy - 6}
              className="cortex-center-score"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {compositeScore}
            </text>

            {/* Label text */}
            <text
              x={cx}
              y={cy + 14}
              className="cortex-center-label"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              Communication
            </text>
          </g>
        </svg>
      </div>

      {/* ── Pulse Vitals ───────────────────────────────── */}
      <div className="cortex-vitals">
        <div className="cortex-vital" data-type="score">
          <span className="cortex-vital__value">{compositeScore}</span>
          <span className="cortex-vital__label">Score</span>
        </div>
        <div className="cortex-vital" data-type="silence">
          <span className="cortex-vital__value">
            {state.silence?.current_silence_days ?? "—"}
          </span>
          <span className="cortex-vital__label">Silencio (días)</span>
        </div>
        <div className="cortex-vital" data-type="narrative">
          <span className="cortex-vital__value">
            {state.narrative?.chapters.length ?? "—"}
          </span>
          <span className="cortex-vital__label">Capítulos</span>
        </div>
        <div className="cortex-vital" data-type="urgency">
          <span className="cortex-vital__value" data-urgency={state.interventionUrgency}>
            {state.interventionUrgency === "none" ? "—" : state.interventionUrgency}
          </span>
          <span className="cortex-vital__label">Urgencia</span>
        </div>
      </div>

      {/* ── Thinking Stream ────────────────────────────── */}
      <div className="cortex-thinking">
        <div className="cortex-thinking__header">
          <Brain size={14} />
          <span>Pensamiento del Cortex</span>
        </div>
        <div className="cortex-thinking__stream">
          {thinkingEntries.map((entry, i) => {
            const Icon = getThinkingIcon(entry.icon);
            return (
              <div
                key={entry.id}
                className="cortex-thinking__entry"
                style={{
                  "--stagger-i": i,
                  "--type-color": getThinkingTypeColor(entry.type),
                } as React.CSSProperties}
              >
                <Icon size={14} className="cortex-thinking__icon" />
                <span className="cortex-thinking__text">
                  {entry.text}
                </span>
                {entry.confidence !== undefined && (
                  <span className="cortex-thinking__confidence">
                    {entry.confidence}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}