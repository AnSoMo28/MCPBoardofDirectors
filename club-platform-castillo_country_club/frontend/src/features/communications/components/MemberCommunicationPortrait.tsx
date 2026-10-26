// src/features/communications/components/MemberCommunicationPortrait.tsx
// ═══════════════════════════════════════════════════════════
// Member Communication Portrait — The Psycho-Linguistic Profile
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a member card. Not a data sheet. A PORTRAIT.
//
// This component paints a complete picture of a member
// as a COMMUNICATOR — how they prefer to be contacted,
// when they respond, what tone resonates, what topics
// engage them, and how their emotional baseline looks.
//
// Visualizations:
//   1. Communication DNA Helix — channels as intertwined strands
//   2. Emotional Baseline Strip — ECG-style emotional band
//   3. Psycho-Linguistic Radar — 4-axis personality profile
//   4. Response Heatmap — 7×24 receptivity grid
//   5. Memory Preview — last 5 conversation nodes
//
// Pure SVG + React. Zero external dependencies.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  CommunicationFingerprint,
  EmotionalTrajectory,
  ConversationMemoryNode,
  MessageFatigue,
  NotificationChannel,
  ResonantTone,
  MessageLength,
  EmotionalZone,
} from "../types";

import {
  getChannelLabel,
  deriveEmotionalZone,
  deriveFatigueLevel
} from "../types";

import {
  buildReceptivityHeatmap,
} from "../config";

import "./MemberCommunicationPortrait.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface MemberCommunicationPortraitProps {
  fingerprint: CommunicationFingerprint | null;
  trajectory: EmotionalTrajectory | null;
  memoryNodes: ConversationMemoryNode[];
  fatigue: MessageFatigue | null;
  memberName?: string;
}

// ═══════════════════════════════════════════════════════════
// PRIVATE HELPERS — Profile Derivation
// ═══════════════════════════════════════════════════════════

/** Map resonant tone to formality score (0-100). */
function toneToFormality(tone: ResonantTone): number {
  const map: Record<ResonantTone, number> = {
    formal: 85,
    direct: 60,
    narrative: 50,
    warm: 25,
  };
  return map[tone] ?? 50;
}

/** Map preferred length to detail score (0-100). */
function lengthToDetail(length: MessageLength): number {
  const map: Record<MessageLength, number> = {
    brief: 20,
    moderate: 55,
    detailed: 85,
  };
  return map[length] ?? 55;
}

/** Derive initiative score from response rate (0-100). */
function deriveInitiative(responseRate: number): number {
  return Math.round(Math.min(100, responseRate * 120));
}

/** Derive depth score from topic diversity (0-100). */
function deriveDepth(topicCount: number): number {
  if (topicCount <= 0) return 20;
  if (topicCount <= 2) return 35;
  if (topicCount <= 4) return 55;
  if (topicCount <= 6) return 75;
  return 90;
}

/** Channel color tokens. */
const CHANNEL_COLORS: Record<NotificationChannel, string> = {
  whatsapp: "var(--color-emerald-400)",
  push: "var(--color-amber-400)",
  sms: "var(--color-gold-400)",
  email: "var(--color-teal-400)",
  in_app: "var(--color-silver-400)",
};
/** Day names for heatmap. */
const DAY_NAMES = ["D", "L", "M", "X", "J", "V", "S"];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function MemberCommunicationPortrait({
  fingerprint,
  trajectory,
  memoryNodes,
  fatigue,
  memberName,
}: MemberCommunicationPortraitProps) {

  // ── Derived profiles ──────────────────────────────────

  const psychoProfile = useMemo(() => {
    if (!fingerprint) return null;
    return {
      formality: toneToFormality(fingerprint.resonant_tone),
      detail: lengthToDetail(fingerprint.preferred_length),
      initiative: deriveInitiative(fingerprint.response_pattern.response_rate),
      depth: deriveDepth(fingerprint.topic_sensitivity.length),
    };
  }, [fingerprint]);

  // ── DNA helix data ────────────────────────────────────

  const helixChannels = useMemo(() => {
    if (!fingerprint) return [];
    const channels = Object.entries(fingerprint.channel_scores) as [
      NotificationChannel,
      number,
    ][];
    return channels
      .filter(([, score]: [NotificationChannel, number]) => score > 0)
      .sort(
        ([, a]: [NotificationChannel, number], [, b]: [NotificationChannel, number]) =>
          b - a,
      )
      .map(([channel, score]: [NotificationChannel, number]) => ({
        channel,
        score,
        label: getChannelLabel(channel),
        color: CHANNEL_COLORS[channel],
        isPreferred: channel === fingerprint.preferred_channel,
      }));
  }, [fingerprint]);

  // ── Heatmap data ──────────────────────────────────────

  const heatmap = useMemo(() => {
    if (!fingerprint) return [];
    return buildReceptivityHeatmap(fingerprint.receptive_hours);
  }, [fingerprint]);

  // ── Emotional baseline ────────────────────────────────

  const baseline = trajectory?.baseline.score ?? 65;
  const currentScore = trajectory?.current.score ?? 50;
  const currentZone: EmotionalZone = trajectory
    ? deriveEmotionalZone(trajectory.current.score)
    : "stable";

  // ── Memory preview (last 5 nodes) ─────────────────────

  const recentMemory = useMemo(() => {
    if (memoryNodes.length === 0) return [];
    const sorted = [...memoryNodes].sort(
      (a: ConversationMemoryNode, b: ConversationMemoryNode) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sorted.slice(0, 5);
  }, [memoryNodes]);

  // ── Fatigue level ─────────────────────────────────────

  const fatigueLevel = fatigue ? deriveFatigueLevel(fatigue.current_level) : "fresh";

  // ── Empty state ───────────────────────────────────────

  if (!fingerprint) {
    return (
      <div className="glass-comm-portrait" data-has-data="false">
        <div className="portrait__header">
          <span className="portrait__title">Retrato Comunicacional</span>
        </div>
        <div className="portrait__empty">
          <span>Sin datos de fingerprint — seleccioná un socio</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-portrait"
      data-has-data="true"
      data-zone={currentZone}
      data-fatigue={fatigueLevel}
      data-tone={fingerprint.resonant_tone}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="portrait__header">
        <span className="portrait__title">Retrato Comunicacional</span>
        <div className="portrait__confidence">
          <span className="portrait__confidence-value">
            {Math.round(fingerprint.confidence * 100)}%
          </span>
          <span className="portrait__confidence-label">Confianza</span>
        </div>
      </div>

      {/* ── Member name + channel summary ───────────── */}
      <div className="portrait__identity">
        <span className="portrait__name">
          {memberName ?? fingerprint.member_id}
        </span>
        <span className="portrait__channel-summary">
          {getChannelLabel(fingerprint.preferred_channel)} · {fingerprint.resonant_tone} ·
          {" "}cada {fingerprint.optimal_frequency_days}d
        </span>
      </div>

      {/* ── Section 1: Communication DNA Helix ──────── */}
      <div className="portrait__section">
        <span className="portrait__section-title">DNA de Comunicación</span>
        <svg
          viewBox="0 0 320 100"
          className="portrait__helix-svg"
          role="img"
          aria-label="Communication DNA helix showing channel engagement patterns"
        >
          <defs>
            <linearGradient id="portrait-helix-bg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" className="portrait__helix-bg-start" stopOpacity="0.1" />
              <stop offset="50%" className="portrait__helix-bg-mid" stopOpacity="0.04" />
              <stop offset="100%" className="portrait__helix-bg-end" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Helix backbone — two intertwined sine curves */}
          <path
            d={Array.from({ length: 320 }, (_, x) => {
              const y1 = 50 + Math.sin((x / 320) * Math.PI * 6) * 30;
              return x === 0 ? `M ${x} ${y1}` : `L ${x} ${y1}`;
            }).join(" ")}
            className="portrait__helix-backbone"
            fill="none"
            strokeDasharray="3 5"
          />
          <path
            d={Array.from({ length: 320 }, (_, x) => {
              const y2 = 50 + Math.sin((x / 320) * Math.PI * 6 + Math.PI) * 30;
              return x === 0 ? `M ${x} ${y2}` : `L ${x} ${y2}`;
            }).join(" ")}
            className="portrait__helix-backbone"
            fill="none"
            strokeDasharray="3 5"
          />

          {/* Channel segments along the helix */}
          {helixChannels.map(
            (
              ch: { channel: NotificationChannel; score: number; label: string; color: string; isPreferred: boolean },
              i: number,
            ) => {
              const segmentWidth = 320 / Math.max(helixChannels.length, 1);
              const x = i * segmentWidth + segmentWidth * 0.1;
              const w = segmentWidth * 0.8;
              const thickness = 3 + ch.score * 12;
              const yTop = 50 - thickness / 2;

              return (
                <g key={ch.channel} portrait-channel={ch.channel}>
                  {/* Channel bar along helix */}
                  <rect
                    x={x}
                    y={yTop}
                    width={w}
                    height={thickness}
                    rx={thickness / 2}
                    className="portrait__helix-segment"
                    style={{ "--ch-color": ch.color } as React.CSSProperties}
                    data-preferred={ch.isPreferred}
                  />
                  {/* Label */}
                  <text
                    x={x + w / 2}
                    y={90}
                    className="portrait__helix-label"
                    textAnchor="middle"
                    data-preferred={ch.isPreferred}
                  >
                    {ch.label}
                  </text>
                  {/* Score */}
                  <text
                    x={x + w / 2}
                    y={yTop - 4}
                    className="portrait__helix-score"
                    textAnchor="middle"
                  >
                    {Math.round(ch.score * 100)}%
                  </text>
                </g>
              );
            },
          )}
        </svg>
      </div>

      {/* ── Section 2: Emotional Baseline Strip ────── */}
      <div className="portrait__section">
        <span className="portrait__section-title">Línea Base Emocional</span>
        <div className="portrait__baseline-strip" data-zone={currentZone}>
          <div className="portrait__baseline-bar">
            {/* Baseline marker */}
            <div
              className="portrait__baseline-marker"
              style={{ left: `${baseline}%` } as React.CSSProperties}
            >
              <span className="portrait__baseline-label">Base: {baseline}</span>
            </div>
            {/* Current marker */}
            <div
              className="portrait__current-marker"
              style={{ left: `${currentScore}%` } as React.CSSProperties}
              data-zone={currentZone}
            >
              <span className="portrait__current-label">Actual: {currentScore}</span>
            </div>
            {/* Fill bar */}
            <div
              className="portrait__baseline-fill"
              style={{ width: `${currentScore}%` } as React.CSSProperties}
              data-zone={currentZone}
            />
          </div>
          <div className="portrait__baseline-zones">
            <span data-zone="thriving">75+</span>
            <span data-zone="stable">55</span>
            <span data-zone="concerned">40</span>
            <span data-zone="at_risk">25</span>
            <span data-zone="crisis">0</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Psycho-Linguistic Radar ─────── */}
      {psychoProfile && (
        <div className="portrait__section">
          <span className="portrait__section-title">Perfil Psicolingüístico</span>
          <div className="portrait__radar-container">
            <svg
              viewBox="0 0 200 200"
              className="portrait__radar-svg"
              role="img"
              aria-label={`Psycho-linguistic profile: formality ${psychoProfile.formality}%, detail ${psychoProfile.detail}%, initiative ${psychoProfile.initiative}%, depth ${psychoProfile.depth}%`}
            >
              {/* Radar grid rings */}
              {[25, 50, 75, 100].map((ring: number) => (
                <circle
                  key={ring}
                  cx="100"
                  cy="100"
                  r={ring * 0.7}
                  className="portrait__radar-ring"
                  fill="none"
                />
              ))}

              {/* Radar axes */}
              {(["formality", "detail", "initiative", "depth"] as const).map(
                (axis, i) => {
                  const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
                  const x = 100 + Math.cos(angle) * 75;
                  const y = 100 + Math.sin(angle) * 75;
                  const labelX = 100 + Math.cos(angle) * 88;
                  const labelY = 100 + Math.sin(angle) * 88;
                  const labels = {
                    formality: "Formalidad",
                    detail: "Detalle",
                    initiative: "Iniciativa",
                    depth: "Profundidad",
                  };
                  return (
                    <g key={axis}>
                      <line
                        x1="100"
                        y1="100"
                        x2={x}
                        y2={y}
                        className="portrait__radar-axis"
                      />
                      <text
                        x={labelX}
                        y={labelY + 3}
                        className="portrait__radar-label"
                        textAnchor="middle"
                      >
                        {labels[axis]}
                      </text>
                    </g>
                  );
                },
              )}

              {/* Radar polygon (the profile shape) */}
              <polygon
                points={(["formality", "detail", "initiative", "depth"] as const)
                  .map((axis, i) => {
                    const value = psychoProfile[axis] / 100;
                    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
                    const x = 100 + Math.cos(angle) * 70 * value;
                    const y = 100 + Math.sin(angle) * 70 * value;
                    return `${x},${y}`;
                  })
                  .join(" ")}
                className="portrait__radar-polygon"
              />

              {/* Radar dots */}
              {(["formality", "detail", "initiative", "depth"] as const).map(
                (axis, i) => {
                  const value = psychoProfile[axis] / 100;
                  const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
                  const x = 100 + Math.cos(angle) * 70 * value;
                  const y = 100 + Math.sin(angle) * 70 * value;
                  return (
                    <circle
                      key={`dot-${axis}`}
                      cx={x}
                      cy={y}
                      r="3.5"
                      className="portrait__radar-dot"
                    />
                  );
                },
              )}
            </svg>

            {/* Values list */}
            <div className="portrait__radar-values">
              {(["formality", "detail", "initiative", "depth"] as const).map(
                (axis) => (
                  <div key={axis} className="portrait__radar-value-row">
                    <span className="portrait__radar-value-label">
                      {axis === "formality" ? "Formalidad" :
                       axis === "detail" ? "Detalle" :
                       axis === "initiative" ? "Iniciativa" : "Profundidad"}
                    </span>
                    <span className="portrait__radar-value-number">
                      {psychoProfile[axis]}%
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: Response Heatmap ────────────── */}
      {heatmap.length > 0 && (
        <div className="portrait__section">
          <span className="portrait__section-title">Mapa de Receptividad</span>
          <div className="portrait__heatmap">
            {/* Hour labels */}
            <div className="portrait__heatmap-hours">
              {["0", "6", "12", "18", "23"].map((h: string) => (
                <span key={h} className="portrait__heatmap-hour-label">{h}h</span>
              ))}
            </div>
            {/* Grid */}
            <svg
              viewBox="0 0 240 70"
              className="portrait__heatmap-svg"
              role="img"
              aria-label="7×24 receptivity heatmap showing when the member is most responsive"
            >
              {heatmap.map((dayRow: number[], day: number) =>
                dayRow.map((score: number, hour: number) => {
                  const cellW = 240 / 24;
                  const cellH = 70 / 7;
                  return (
                    <rect
                      key={`${day}-${hour}`}
                      x={hour * cellW}
                      y={day * cellH}
                      width={cellW - 0.5}
                      height={cellH - 0.5}
                      rx="1"
                      className="portrait__heatmap-cell"
                      style={{
                        opacity: 0.15 + score * 0.85,
                      } as React.CSSProperties}
                      data-hot={score >= 0.7}
                    />
                  );
                }),
              )}
            </svg>
            {/* Day labels */}
            <div className="portrait__heatmap-days">
              {DAY_NAMES.map((d: string) => (
                <span key={d} className="portrait__heatmap-day-label">{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 5: Memory Preview ──────────────── */}
      {recentMemory.length > 0 && (
        <div className="portrait__section">
          <span className="portrait__section-title">Memoria Conversacional</span>
          <div className="portrait__memory">
            {recentMemory.map((node: ConversationMemoryNode, i: number) => (
              <div
                key={node.id}
                className="portrait__memory-node"
                data-sentiment={node.sentiment}
                data-outcome={node.outcome}
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                <div
                  className="portrait__memory-dot"
                  data-sentiment={node.sentiment}
                />
                <div className="portrait__memory-content">
                  <span className="portrait__memory-topic">{node.topic}</span>
                  <span className="portrait__memory-summary">{node.summary}</span>
                  <span className="portrait__memory-meta">
                    {node.channel} · {node.direction === "outbound" ? "→" : "←"}{" "}
                    {new Date(node.date).toLocaleDateString("es-CR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}