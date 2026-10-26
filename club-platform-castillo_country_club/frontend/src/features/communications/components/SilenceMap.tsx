// src/features/communications/components/SilenceMap.tsx
// ═══════════════════════════════════════════════════════════
// Silence Map — The Geography of Absence
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a notification log. Not a last-contact date.
// A MAP — where silence is visible as expanding darkness
// and each renewal event is a point of light.
//
// Visualizations:
//   1. Silence Timeline — activity blocks vs silence gaps
//   2. Attention Decay Curve — retention dropping over time
//   3. Current Silence Gauge — how long NOW
//   4. Renewal Strategy — when and how to break the silence
//   5. Cascade Warning — social contagion risk
//
// Pure SVG + React. Zero external dependencies.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  SilenceProfile,
  EmotionalTrajectory,
  MessageFatigue,
  HistoryItem,
  CommunicationFingerprint,
  NarrativeArc,
} from "../types";

import {
  deriveSilenceLevel,
  SILENCE_LEVEL_CONFIG,
} from "../types";

import {
  interpolateDecayCurve,
} from "../config";

import type {
  SilenceTimeline,
  SilenceTimelineEntry,
  RenewalStrategy,
  RenewalAction,
} from "../lib/silenceIntelligence";

import {
  buildSilenceTimeline,
  buildRenewalStrategy,
  computeCascadeRisk,
} from "../lib/silenceIntelligence";

import "./SilenceMap.css";

// ═══════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════

interface SilenceMapProps {
  silence: SilenceProfile | null;
  trajectory: EmotionalTrajectory | null;
  fatigue: MessageFatigue | null;
  history: HistoryItem[];
  fingerprint?: CommunicationFingerprint | null;
  narrative?: NarrativeArc | null;
  socialConnectionsCount?: number;
  socialInfluenceScore?: number;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Build SVG decay curve path from 0 to maxDays. */
function buildDecayPath(
  maxDays: number,
  width: number,
  height: number,
  padX: number,
  padY: number,
): string {
  const steps = 60;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;
  const stepW = usableW / steps;

  const points = Array.from({ length: steps + 1 }, (_, i: number) => {
    const day = (i / steps) * maxDays;
    const retention = interpolateDecayCurve(day);
    return {
      x: padX + i * stepW,
      y: padY + (1 - retention) * usableH,
    };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

/** Get current retention value (0-1). */
function getCurrentRetention(silenceDays: number): number {
  return interpolateDecayCurve(silenceDays);
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function SilenceMap({
  silence,
  trajectory,
  fatigue,
  history,
  fingerprint = null,
  narrative = null,
  socialConnectionsCount = 0,
  socialInfluenceScore = 0,
}: SilenceMapProps) {

  // ── Derived data ──────────────────────────────────────
  const silenceDays = silence?.current_silence_days ?? 0;
  const silenceLevel = silence
    ? deriveSilenceLevel(silenceDays)
    : "normal";
  const silenceConfig = SILENCE_LEVEL_CONFIG[silenceLevel];

  const retention = getCurrentRetention(silenceDays);
  const retentionPct = Math.round(retention * 100);

  const decay = useMemo(
    () => (silence ? 1 - interpolateDecayCurve(silenceDays) : 0),
    [silence, silenceDays],
  );

  // ── Timeline ──────────────────────────────────────────
  const timeline: SilenceTimeline | null = useMemo(() => {
    if (history.length === 0) return null;
    return buildSilenceTimeline(history);
  }, [history]);

  // ── Cascade risk ──────────────────────────────────────
  const cascade = useMemo(() => {
    if (!silence) return null;
    return computeCascadeRisk(
      silence.member_id,
      silenceDays,
      socialConnectionsCount,
      socialInfluenceScore,
    );
  }, [silence, silenceDays, socialConnectionsCount, socialInfluenceScore]);

  // ── Renewal strategy ──────────────────────────────────
  const renewalStrategy: RenewalStrategy | null = useMemo(() => {
    if (!silence || !fingerprint || !trajectory || !fatigue || !narrative) return null;
    if (history.length === 0) return null;
    return buildRenewalStrategy(silence, fingerprint, trajectory, fatigue, history, narrative);
  }, [silence, fingerprint, trajectory, fatigue, history, narrative]);

  // ── SVG constants ─────────────────────────────────────
  const timelineW = 400;
  const timelineH = 60;
  const timelinePadX = 15;

  const decayW = 320;
  const decayH = 100;
  const decayPadX = 25;
  const decayPadY = 15;
  const maxDecayDays = 90;

  // ── Decay curve path ──────────────────────────────────
  const decayPath = useMemo(
    () => buildDecayPath(maxDecayDays, decayW, decayH, decayPadX, decayPadY),
    [],
  );

  // ── Current position on decay curve ───────────────────
  const currentDecayX = decayPadX + (Math.min(silenceDays, maxDecayDays) / maxDecayDays) * (decayW - decayPadX * 2);
  const currentDecayY = decayPadY + (1 - retention) * (decayH - decayPadY * 2);

  // ── Empty state ───────────────────────────────────────
  if (!silence) {
    return (
      <div className="glass-comm-silence" data-level="normal">
        <div className="silence__header">
          <span className="silence__title">Mapa de Silencio</span>
        </div>
        <div className="silence__empty">
          <span>Sin datos de silencio — seleccioná un socio</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-comm-silence"
      data-level={silenceLevel}
    >
      {/* ── Header ──────────────────────────────────── */}
      <div className="silence__header">
        <span className="silence__title">Mapa de Silencio</span>
        <div className="silence__level-badge" data-level={silenceLevel}>
          {silenceConfig.label}
        </div>
      </div>

      {/* ── Current Silence Gauge ───────────────────── */}
      <div className="silence__gauge">
        <div className="silence__gauge-number" data-level={silenceLevel}>
          {silenceDays}
          <span className="silence__gauge-unit">días</span>
        </div>
        <div className="silence__gauge-bar">
          <div
            className="silence__gauge-fill"
            data-level={silenceLevel}
            style={{ width: `${Math.min(100, (silenceDays / 60) * 100)}%` } as React.CSSProperties}
          />
          {/* Threshold markers */}
          <div
            className="silence__gauge-threshold"
            style={{ left: `${(7 / 60) * 100}%` } as React.CSSProperties}
          >
            <span>7d</span>
          </div>
          <div
            className="silence__gauge-threshold"
            style={{ left: `${(14 / 60) * 100}%` } as React.CSSProperties}
          >
            <span>14d</span>
          </div>
          <div
            className="silence__gauge-threshold"
            style={{ left: `${(30 / 60) * 100}%` } as React.CSSProperties}
          >
            <span>30d</span>
          </div>
        </div>
        <div className="silence__gauge-meta">
          <span>Retención: {retentionPct}%</span>
          <span>Decaimiento: {Math.round(decay * 100)}%</span>
        </div>
      </div>

      {/* ── Section 1: Silence Timeline ─────────────── */}
      {timeline && timeline.entries.length > 0 && (
        <div className="silence__section">
          <span className="silence__section-title">
            Línea de Silencio
            <span className="silence__section-stat">
              {Math.round(timeline.silenceRatio * 100)}% silencio
            </span>
          </span>
          <svg
            viewBox={`0 0 ${timelineW} ${timelineH}`}
            className="silence__timeline-svg"
            role="img"
            aria-label={`Silence timeline: ${Math.round(timeline.silenceRatio * 100)}% silence ratio, longest silence ${timeline.longestSilenceDays} days`}
          >
            {/* Background track */}
            <rect
              x={timelinePadX}
              y={15}
              width={timelineW - timelinePadX * 2}
              height={30}
              rx="4"
              className="silence__timeline-track"
            />

            {/* Timeline blocks */}
            {(() => {
              const usableW = timelineW - timelinePadX * 2;
              const blockGap = 1;

              // Calculate proportional widths
              const totalDuration = timeline.entries.reduce(
                (sum: number, e: SilenceTimelineEntry) => sum + Math.max(1, e.durationDays),
                0,
              );

              let currentX = timelinePadX;
              return timeline.entries.map(
                (entry: SilenceTimelineEntry, i: number) => {
                  const proportional = Math.max(1, entry.durationDays) / Math.max(1, totalDuration);
                  const blockW = Math.max(3, proportional * usableW - blockGap);
                  const x = currentX;
                  currentX += blockW + blockGap;

                  if (entry.type === "silence") {
                    return (
                      <rect
                        key={`tl-${i}`}
                        x={x}
                        y={15}
                        width={blockW}
                        height={30}
                        rx="2"
                        className="silence__timeline-silence"
                        data-severity={
                          entry.durationDays >= 14
                            ? "severe"
                            : entry.durationDays >= 7
                              ? "moderate"
                              : "mild"
                        }
                      >
                        <title>
                          {entry.durationDays}d silencio — retención:{" "}
                          {Math.round(entry.retentionAtEnd * 100)}%
                        </title>
                      </rect>
                    );
                  }

                  return (
                    <rect
                      key={`tl-${i}`}
                      x={x}
                      y={15}
                      width={blockW}
                      height={30}
                      rx="2"
                      className="silence__timeline-activity"
                    >
                      <title>Actividad</title>
                    </rect>
                  );
                },
              );
            })()}
          </svg>

          {/* Timeline stats */}
          <div className="silence__timeline-stats">
            <span>Silencio más largo: {timeline.longestSilenceDays}d</span>
            <span>Total silencio: {timeline.totalSilenceDays}d</span>
            <span>Total actividad: {timeline.totalActivityDays}d</span>
            <span>{timeline.entries.filter((e: SilenceTimelineEntry) => e.type === "silence").length} periodos</span>
          </div>
        </div>
      )}

      {/* ── Section 2: Attention Decay Curve ────────── */}
      <div className="silence__section">
        <span className="silence__section-title">Curva de Decaimiento</span>
        <svg
          viewBox={`0 0 ${decayW} ${decayH}`}
          className="silence__decay-svg"
          role="img"
          aria-label={`Attention decay curve: ${retentionPct}% retention at ${silenceDays} days`}
        >
          <defs>
            <linearGradient id="silence-decay-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="silence__decay-fill-top" stopOpacity="0.15" />
              <stop offset="100%" className="silence__decay-fill-bottom" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines at 25% retention intervals */}
          {[0.25, 0.5, 0.75].map((fraction: number) => {
            const y = decayPadY + (1 - fraction) * (decayH - decayPadY * 2);
            return (
              <line
                key={fraction}
                x1={decayPadX}
                y1={y}
                x2={decayW - decayPadX}
                y2={y}
                className="silence__decay-grid"
              />
            );
          })}

          {/* Day markers at 7, 14, 30, 60 */}
          {[7, 14, 30, 60].map((day: number) => {
            const x = decayPadX + (day / maxDecayDays) * (decayW - decayPadX * 2);
            return (
              <g key={`day-${day}`}>
                <line
                  x1={x}
                  y1={decayPadY}
                  x2={x}
                  y2={decayH - decayPadY}
                  className="silence__decay-day-line"
                />
                <text
                  x={x}
                  y={decayH - 2}
                  className="silence__decay-day-label"
                  textAnchor="middle"
                >
                  {day}d
                </text>
              </g>
            );
          })}

          {/* Area fill under curve */}
          <path
            d={`${decayPath} L ${decayW - decayPadX} ${decayH - decayPadY} L ${decayPadX} ${decayH - decayPadY} Z`}
            fill="url(#silence-decay-fill)"
          />

          {/* Decay curve */}
          <path
            d={decayPath}
            className="silence__decay-curve"
            fill="none"
          />

          {/* Current position marker */}
          <g className="silence__decay-current">
            <line
              x1={currentDecayX}
              y1={decayPadY}
              x2={currentDecayX}
              y2={decayH - decayPadY}
              className="silence__decay-current-line"
              strokeDasharray="3 3"
            />
            <circle
              cx={currentDecayX}
              cy={currentDecayY}
              r="5"
              className="silence__decay-current-dot"
              data-level={silenceLevel}
            />
            <text
              x={currentDecayX}
              y={currentDecayY - 10}
              className="silence__decay-current-label"
              textAnchor="middle"
              data-level={silenceLevel}
            >
              {retentionPct}%
            </text>
          </g>

          {/* Retention labels */}
          <text
            x={decayPadX - 4}
            y={decayPadY + 3}
            className="silence__decay-retention-label"
            textAnchor="end"
          >
            100%
          </text>
          <text
            x={decayPadX - 4}
            y={decayH - decayPadY + 3}
            className="silence__decay-retention-label"
            textAnchor="end"
          >
            0%
          </text>
        </svg>
      </div>

      {/* ── Section 3: Cascade Warning ─────────────── */}
      {cascade && cascade.riskScore > 0.2 && (
        <div className="silence__section">
          <span className="silence__section-title">Riesgo de Cascada</span>
          <div
            className="silence__cascade"
            data-mechanism={cascade.mechanism}
            data-severity={
              cascade.riskScore >= 0.7
                ? "high"
                : cascade.riskScore >= 0.4
                  ? "medium"
                  : "low"
            }
          >
            <div className="silence__cascade-header">
              <span className="silence__cascade-score">
                {Math.round(cascade.riskScore * 100)}%
              </span>
              <span className="silence__cascade-mechanism">
                {cascade.mechanism === "social_influence"
                  ? "Influencia social"
                  : "Retirada progresiva"}
              </span>
            </div>
            <p className="silence__cascade-desc">{cascade.description}</p>
            {cascade.affectedConnections > 0 && (
              <span className="silence__cascade-connections">
                {cascade.affectedConnections} conexión(es) en riesgo
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Section 4: Renewal Strategy ─────────────── */}
      {renewalStrategy && (
        <div className="silence__section">
          <span className="silence__section-title">Estrategia de Renovación</span>
          <div className="silence__renewal">
            <div className="silence__renewal-header">
              <span className="silence__renewal-stage">
                {renewalStrategy.disengagementStage}
              </span>
              <span className="silence__renewal-estimate">
                {Math.round(renewalStrategy.overallSuccessEstimate * 100)}% éxito
              </span>
            </div>
            <p className="silence__renewal-narrative">{renewalStrategy.narrative}</p>
            <div className="silence__renewal-meta">
              <span>Ventana: {renewalStrategy.timeWindowDays}d</span>
              <span>{renewalStrategy.steps.length} acciones</span>
            </div>
            {renewalStrategy.steps.length > 0 && (
              <div className="silence__renewal-steps">
                {renewalStrategy.steps.map(
                  (step: RenewalAction, i: number) => (
                    <div
                      key={`step-${i}`}
                      className="silence__renewal-step"
                      data-urgency={step.urgency}
                    >
                      <span className="silence__renewal-step-num">{i + 1}</span>
                      <div className="silence__renewal-step-content">
                        <span className="silence__renewal-step-type">{step.actionType}</span>
                        <span className="silence__renewal-step-msg">{step.suggestedMessage}</span>
                        <span className="silence__renewal-step-timing">{step.timing}</span>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Summary Strip ───────────────────────────── */}
      <div className="silence__summary">
        <div className="silence__summary-item">
          <span className="silence__summary-value" data-level={silenceLevel}>
            {silenceDays}d
          </span>
          <span className="silence__summary-label">Silencio Actual</span>
        </div>
        <div className="silence__summary-item">
          <span className="silence__summary-value">
            {retentionPct}%
          </span>
          <span className="silence__summary-label">Retención</span>
        </div>
        <div className="silence__summary-item">
          <span className="silence__summary-value">
            {timeline ? Math.round(timeline.silenceRatio * 100) : "—"}%
          </span>
          <span className="silence__summary-label">Ratio Silencio</span>
        </div>
        <div className="silence__summary-item">
          <span className="silence__summary-value">
            {cascade ? Math.round(cascade.riskScore * 100) : 0}%
          </span>
          <span className="silence__summary-label">Riesgo Cascada</span>
        </div>
      </div>
    </div>
  );
}