// src/features/communications/components/CommunicationFingerprint.tsx
// ═══════════════════════════════════════════════════════════
// Communication Fingerprint — The Identity of Contact
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a preferences form. Not a settings page.
// A FINGERPRINT — the unique communication signature
// of each member, rendered as a multi-dimensional
// visualization that reveals how they prefer to be
// contacted, when they respond, and what resonates.
//
// Five visualizations in one component:
//   1. Channel Radar — 5-axis SVG pentagon
//   2. Receptivity Curve — 24h response probability
//   3. Frequency Wave — optimal contact cadence
//   4. Tone Spectrum — formal ↔ warm distribution
//   5. Topic Sensitivity — per-topic engagement bars
//
// Each section is independently useful.
// Together they form the complete FINGERPRINT.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  CommunicationFingerprint as FingerprintType,
  MessageLength,
  NotificationChannel,
  ResonantTone,
  TopicSensitivity,
} from "../types";

import {
  getChannelLabel,
} from "../types";

import {
  buildReceptivityHeatmap
} from "../config";

import "./CommunicationFingerprint.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface CommunicationFingerprintProps {
  fingerprint: FingerprintType | null;
  memberName?: string;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Radar axis labels and their channel mapping. */
const RADAR_AXES: Array<{
  channel: NotificationChannel;
  label: string;
  shortLabel: string;
}> = [
  { channel: "whatsapp", label: "WhatsApp", shortLabel: "WA" },
  { channel: "email", label: "Email", shortLabel: "@" },
  { channel: "push", label: "Push", shortLabel: "P" },
  { channel: "sms", label: "SMS", shortLabel: "S" },
  { channel: "in_app", label: "In-App", shortLabel: "A" },
];

/** Tone spectrum positions (0=formal, 100=warm). */
const TONE_POSITIONS: Record<ResonantTone, number> = {
  formal: 10,
  direct: 35,
  narrative: 60,
  warm: 90,
};

const TONE_LABELS: Record<ResonantTone, string> = {
  formal: "Formal",
  direct: "Directo",
  narrative: "Narrativo",
  warm: "Cálido",
};
const MESSAGE_LENGTH_LABELS: Record<MessageLength, string> = {
  brief: "Breve",
  moderate: "Moderado",
  detailed: "Detallado",
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Build SVG pentagon radar points from channel scores. */
function buildRadarPolygon(
  scores: Record<string, number>,
  cx: number,
  cy: number,
  radius: number,
): string {
  return RADAR_AXES.map((axis: typeof RADAR_AXES[number], i: number) => {
    const value = scores[axis.channel] ?? 0;
    const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius * value;
    const y = cy + Math.sin(angle) * radius * value;
    return `${x},${y}`;
  }).join(" ");
}

/** Build SVG pentagon grid points at a given fraction. */
function buildRadarGrid(
  cx: number,
  cy: number,
  radius: number,
  fraction: number,
): string {
  return RADAR_AXES.map((_axis: typeof RADAR_AXES[number], i: number) => {
    const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius * fraction;
    const y = cy + Math.sin(angle) * radius * fraction;
    return `${x},${y}`;
  }).join(" ");
}

/** Build SVG path for 24h receptivity curve. */
function buildReceptivityPath(
  hourlyData: number[],
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  if (hourlyData.length === 0) return "";

  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const step = usableW / (hourlyData.length - 1);

  const points = hourlyData.map((value: number, i: number) => ({
    x: padX + i * step,
    y: padY + (1 - value) * usableH,
  }));

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

/** Build frequency wave SVG path — sine wave with amplitude = frequency. */
function buildFrequencyWave(
  frequencyDays: number,
  width: number,
  height: number,
  padX: number,
): string {
  const usableW = width - padX * 2;
  const cycles = Math.max(1, Math.round(30 / frequencyDays));
  const amplitude = height * 0.3;
  const midY = height / 2;

  let path = `M ${padX} ${midY}`;
  for (let x = 0; x <= usableW; x += 2) {
    const progress = x / usableW;
    const y = midY + Math.sin(progress * Math.PI * 2 * cycles) * amplitude;
    path += ` L ${padX + x} ${y}`;
  }
  return path;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CommunicationFingerprint({
  fingerprint,
  memberName,
}: CommunicationFingerprintProps) {

  // ── Radar polygon ─────────────────────────────────────
  const radarCx = 100;
  const radarCy = 100;
  const radarR = 70;

  const radarPolygon = useMemo(
    () =>
      fingerprint
        ? buildRadarPolygon(fingerprint.channel_scores, radarCx, radarCy, radarR)
        : "",
    [fingerprint],
  );

  // ── Receptivity curve (24h) ───────────────────────────
  const receptivityW = 320;
  const receptivityH = 80;
  const receptivityPadX = 15;
  const receptivityPadY = 10;

  const hourlyReceptivity = useMemo(() => {
    if (!fingerprint) return [];
    const heatmap = buildReceptivityHeatmap(fingerprint.receptive_hours);
    // Average across all 7 days for each hour
    const hourlyAvg: number[] = [];
    for (let h = 0; h < 24; h++) {
      let sum = 0;
      for (let d = 0; d < 7; d++) {
        sum += heatmap[d]?.[h] ?? 0;
      }
      hourlyAvg.push(sum / 7);
    }
    // Normalize to 0-1
    const max = Math.max(...hourlyAvg, 1);
    return hourlyAvg.map((v: number) => v / max);
  }, [fingerprint]);

  const receptivityPath = useMemo(
    () =>
      buildReceptivityPath(
        hourlyReceptivity,
        receptivityW,
        receptivityH,
        receptivityPadX,
        receptivityPadY
      ),
    [hourlyReceptivity],
  );

  // ── Frequency wave ────────────────────────────────────
  const freqW = 260;
  const freqH = 50;
  const freqPadX = 15;

  const frequencyPath = useMemo(
    () =>
      fingerprint
        ? buildFrequencyWave(fingerprint.optimal_frequency_days, freqW, freqH, freqPadX)
        : "",
    [fingerprint],
  );

  // ── Tone position ─────────────────────────────────────
  const tonePosition = fingerprint
    ? TONE_POSITIONS[fingerprint.resonant_tone] ?? 50
    : 50;

  // ── Topic sensitivities (sorted by score desc) ────────
  const sortedTopics = useMemo(() => {
    if (!fingerprint) return [];
    return [...fingerprint.topic_sensitivity].sort(
      (a: TopicSensitivity, b: TopicSensitivity) => b.engagement_score - a.engagement_score,
    );
  }, [fingerprint]);

  // ── Channel ranking ───────────────────────────────────
  const channelRanking = useMemo(() => {
    if (!fingerprint) return [];
    const entries = Object.entries(fingerprint.channel_scores) as [
      NotificationChannel,
      number,
    ][];
    return entries
      .filter(([, score]: [NotificationChannel, number]) => score > 0)
      .sort(
        ([, a]: [NotificationChannel, number], [, b]: [NotificationChannel, number]) =>
          b - a,
      )
      .map(([channel, score]: [NotificationChannel, number], i: number) => ({
        channel,
        score,
        label: getChannelLabel(channel),
        rank: i + 1,
        isPreferred: channel === fingerprint.preferred_channel,
      }));
  }, [fingerprint]);

  // ── Empty state ───────────────────────────────────────
  if (!fingerprint) {
    return (
      <div className="glass-comm-fingerprint" data-has-data="false">
        <div className="fingerprint__header">
          <span className="fingerprint__title">Huella Digital</span>
        </div>
        <div className="fingerprint__empty">
          <span>Sin datos de fingerprint — seleccioná un socio</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-fingerprint"
      data-has-data="true"
      data-tone={fingerprint.resonant_tone}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="fingerprint__header">
        <span className="fingerprint__title">Huella Digital</span>
        <div className="fingerprint__confidence">
          <span className="fingerprint__confidence-value">
            {Math.round(fingerprint.confidence * 100)}%
          </span>
          <span className="fingerprint__confidence-label">Confianza</span>
        </div>
      </div>

      {/* ── Identity strip ──────────────────────────── */}
      {memberName && (
        <div className="fingerprint__identity">
          <span className="fingerprint__name">{memberName}</span>
          <span className="fingerprint__summary">
            {getChannelLabel(fingerprint.preferred_channel)} · {TONE_LABELS[fingerprint.resonant_tone]} ·{" "}
            {MESSAGE_LENGTH_LABELS[fingerprint.preferred_length]} · cada {fingerprint.optimal_frequency_days}d
          </span>
        </div>
      )}

      {/* ── Section 1: Channel Radar ────────────────── */}
      <div className="fingerprint__section">
        <span className="fingerprint__section-title">Radar de Canales</span>
        <div className="fingerprint__radar-container">
          <svg
            viewBox="0 0 200 200"
            className="fingerprint__radar-svg"
            role="img"
            aria-label={`Channel radar: preferred channel is ${getChannelLabel(fingerprint.preferred_channel)}`}
          >
            {/* Grid rings */}
            {[0.25, 0.5, 0.75, 1].map((fraction: number) => (
              <polygon
                key={fraction}
                points={buildRadarGrid(radarCx, radarCy, radarR, fraction)}
                className="fingerprint__radar-grid"
                fill="none"
              />
            ))}

            {/* Axes */}
            {RADAR_AXES.map((axis: typeof RADAR_AXES[number], i: number) => {
              const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
              const endX = radarCx + Math.cos(angle) * radarR;
              const endY = radarCy + Math.sin(angle) * radarR;
              const labelX = radarCx + Math.cos(angle) * (radarR + 18);
              const labelY = radarCy + Math.sin(angle) * (radarR + 18);
              return (
                <g key={axis.channel}>
                  <line
                    x1={radarCx}
                    y1={radarCy}
                    x2={endX}
                    y2={endY}
                    className="fingerprint__radar-axis"
                  />
                  <text
                    x={labelX}
                    y={labelY + 3}
                    className="fingerprint__radar-label"
                    textAnchor="middle"
                    data-preferred={axis.channel === fingerprint.preferred_channel}
                  >
                    {axis.shortLabel}
                  </text>
                </g>
              );
            })}

            {/* Data polygon */}
            <polygon
              points={radarPolygon}
              className="fingerprint__radar-polygon"
            />

            {/* Data dots */}
            {RADAR_AXES.map((axis: typeof RADAR_AXES[number], i: number) => {
              const value = fingerprint.channel_scores[axis.channel] ?? 0;
              const angle = (i / RADAR_AXES.length) * Math.PI * 2 - Math.PI / 2;
              const x = radarCx + Math.cos(angle) * radarR * value;
              const y = radarCy + Math.sin(angle) * radarR * value;
              return (
                <circle
                  key={`dot-${axis.channel}`}
                  cx={x}
                  cy={y}
                  r="3.5"
                  className="fingerprint__radar-dot"
                  data-preferred={axis.channel === fingerprint.preferred_channel}
                />
              );
            })}
          </svg>

          {/* Channel ranking list */}
          <div className="fingerprint__radar-ranking">
            {channelRanking.map(
              (ch: {
                channel: NotificationChannel;
                score: number;
                label: string;
                rank: number;
                isPreferred: boolean;
              }) => (
                <div
                  key={ch.channel}
                  className="fingerprint__rank-row"
                  data-preferred={ch.isPreferred}
                >
                  <span className="fingerprint__rank-pos">#{ch.rank}</span>
                  <span className="fingerprint__rank-label">{ch.label}</span>
                  <span className="fingerprint__rank-score">
                    {Math.round(ch.score * 100)}%
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Receptivity Curve (24h) ──────── */}
      {hourlyReceptivity.length > 0 && (
        <div className="fingerprint__section">
          <span className="fingerprint__section-title">Curva de Receptividad (24h)</span>
          <svg
            viewBox={`0 0 ${receptivityW} ${receptivityH}`}
            className="fingerprint__receptivity-svg"
            role="img"
            aria-label="24-hour receptivity curve showing optimal contact times"
          >
            <defs>
              <linearGradient id="fp-receptivity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="fingerprint__receptivity-fill-top" stopOpacity="0.2" />
                <stop offset="100%" className="fingerprint__receptivity-fill-bottom" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid lines at 6h intervals */}
            {[6, 12, 18].map((h: number) => {
              const x = receptivityPadX + (h / 23) * (receptivityW - receptivityPadX * 2);
              return (
                <line
                  key={h}
                  x1={x}
                  y1={receptivityPadY}
                  x2={x}
                  y2={receptivityH - receptivityPadY}
                  className="fingerprint__receptivity-grid"
                />
              );
            })}

            {/* Area fill */}
            {receptivityPath && (
              <path
                d={`${receptivityPath} L ${receptivityW - receptivityPadX} ${receptivityH - receptivityPadY} L ${receptivityPadX} ${receptivityH - receptivityPadY} Z`}
                fill="url(#fp-receptivity-fill)"
              />
            )}

            {/* Curve */}
            {receptivityPath && (
              <path
                d={receptivityPath}
                className="fingerprint__receptivity-curve"
                fill="none"
              />
            )}

            {/* Peak hour marker */}
            {hourlyReceptivity.length > 0 && (() => {
              const peakHour = hourlyReceptivity.indexOf(Math.max(...hourlyReceptivity));
              const peakX = receptivityPadX + (peakHour / 23) * (receptivityW - receptivityPadX * 2);
              const peakY = receptivityPadY + (1 - hourlyReceptivity[peakHour]) * (receptivityH - receptivityPadY * 2);
              return (
                <g className="fingerprint__peak-marker">
                  <circle cx={peakX} cy={peakY} r="4" className="fingerprint__peak-dot" />
                  <text
                    x={peakX}
                    y={peakY - 8}
                    className="fingerprint__peak-label"
                    textAnchor="middle"
                  >
                    {peakHour}h
                  </text>
                </g>
              );
            })()}

            {/* Hour labels */}
            {[0, 6, 12, 18, 23].map((h: number) => {
              const x = receptivityPadX + (h / 23) * (receptivityW - receptivityPadX * 2);
              return (
                <text
                  key={h}
                  x={x}
                  y={receptivityH - 1}
                  className="fingerprint__hour-label"
                  textAnchor="middle"
                >
                  {h}h
                </text>
              );
            })}
          </svg>
        </div>
      )}

      {/* ── Section 3: Frequency Wave ───────────────── */}
      <div className="fingerprint__section">
        <span className="fingerprint__section-title">
          Onda de Frecuencia — cada {fingerprint.optimal_frequency_days} días
        </span>
        <svg
          viewBox={`0 0 ${freqW} ${freqH}`}
          className="fingerprint__frequency-svg"
          role="img"
          aria-label={`Optimal contact frequency: every ${fingerprint.optimal_frequency_days} days`}
        >
          {/* Center line */}
          <line
            x1={freqPadX}
            y1={freqH / 2}
            x2={freqW - freqPadX}
            y2={freqH / 2}
            className="fingerprint__frequency-center"
          />

          {/* Wave */}
          {frequencyPath && (
            <path
              d={frequencyPath}
              className="fingerprint__frequency-wave"
              fill="none"
            />
          )}

          {/* Frequency markers (every cycle) */}
          {Array.from({ length: Math.round(30 / fingerprint.optimal_frequency_days) }).map(
            (_: unknown, i: number) => {
              const usableW = freqW - freqPadX * 2;
              const cycles = Math.max(1, Math.round(30 / fingerprint.optimal_frequency_days));
              const x = freqPadX + ((i + 1) / cycles) * usableW;
              return (
                <line
                  key={`marker-${i}`}
                  x1={x}
                  y1={freqH * 0.15}
                  x2={x}
                  y2={freqH * 0.85}
                  className="fingerprint__frequency-marker"
                  strokeDasharray="2 3"
                />
              );
            },
          )}

          {/* Label */}
          <text
            x={freqW / 2}
            y={freqH - 2}
            className="fingerprint__frequency-label"
            textAnchor="middle"
          >
            30 días
          </text>
        </svg>
      </div>

      {/* ── Section 4: Tone Spectrum ────────────────── */}
      <div className="fingerprint__section">
        <span className="fingerprint__section-title">Espectro de Tono</span>
        <div className="fingerprint__tone-spectrum">
          {/* Spectrum bar */}
          <div className="fingerprint__tone-bar">
            {/* Gradient background */}
            <div className="fingerprint__tone-gradient" />
            {/* Tone marker */}
            <div
              className="fingerprint__tone-marker"
              style={{ left: `${tonePosition}%` } as React.CSSProperties}
              data-tone={fingerprint.resonant_tone}
            >
              <div className="fingerprint__tone-marker-label" data-tone={fingerprint.resonant_tone}>
                {TONE_LABELS[fingerprint.resonant_tone]}
              </div>
            </div>
          </div>
          {/* Spectrum labels */}
          <div className="fingerprint__tone-labels">
            <span>Formal</span>
            <span>Directo</span>
            <span>Narrativo</span>
            <span>Cálido</span>
          </div>
        </div>
      </div>

      {/* ── Section 5: Topic Sensitivity ────────────── */}
      {sortedTopics.length > 0 && (
        <div className="fingerprint__section">
          <span className="fingerprint__section-title">Sensibilidad Temática</span>
          <div className="fingerprint__topics">
            {sortedTopics.map((topic: TopicSensitivity, i: number) => (
              <div
                key={topic.topic}
                className="fingerprint__topic-row"
                data-high={topic.engagement_score >= 0.7}
                data-low={topic.engagement_score < 0.3}
                style={{ "--stagger-i": i } as React.CSSProperties}
              >
                <span className="fingerprint__topic-name">{topic.topic}</span>
                <div className="fingerprint__topic-bar-track">
                  <div
                    className="fingerprint__topic-bar-fill"
                    style={{ width: `${Math.round(topic.engagement_score * 100)}%` } as React.CSSProperties}
                    data-high={topic.engagement_score >= 0.7}
                    data-low={topic.engagement_score < 0.3}
                  />
                </div>
                <span className="fingerprint__topic-score">
                  {Math.round(topic.engagement_score * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary strip ───────────────────────────── */}
      <div className="fingerprint__summary-strip">
        <div className="fingerprint__summary-item">
          <span className="fingerprint__summary-value">
            {fingerprint.response_pattern.response_rate.toFixed(0)}%
          </span>
          <span className="fingerprint__summary-label">Tasa Respuesta</span>
        </div>
        <div className="fingerprint__summary-item">
          <span className="fingerprint__summary-value">
            {fingerprint.response_pattern.avg_response_time_hours.toFixed(0)}h
          </span>
          <span className="fingerprint__summary-label">Tiempo Respuesta</span>
        </div>
        <div className="fingerprint__summary-item">
          <span className="fingerprint__summary-value">
            {fingerprint.optimal_frequency_days}d
          </span>
          <span className="fingerprint__summary-label">Frecuencia</span>
        </div>
        <div className="fingerprint__summary-item">
          <span className="fingerprint__summary-value">
            {sortedTopics.length}
          </span>
          <span className="fingerprint__summary-label">Topics</span>
        </div>
      </div>
    </div>
  );
}