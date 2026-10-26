// src/features/communications/components/GravityObservatory.tsx
// ═══════════════════════════════════════════════════════════
// Gravity Observatory — Retention Physics Visualization
// Castillo Country Club — Phase 31 "The Voice"
//
// Not a risk score. Not a gauge. An OBSERVATORY.
//
// The member's retention is visualized as gravitational
// physics: the club pulls the member inward, while
// disengagement pushes them outward. The visualization
// shows:
//   - The member as a central point
//   - Communication gravity as field distortion
//   - Silence as expanding darkness
//   - Escape velocity as a speedometer
//   - Cascade risk as social contagion
//
// Pure SVG. Zero dependencies beyond React + types.
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  SilenceProfile,
  MessageFatigue,
  EmotionalTrajectory,
} from "../types";

import {
  deriveSilenceLevel
} from "../types";

import {
  interpolateDecayCurve,
} from "../config";

import type { SilenceTimeline } from "../lib/silenceIntelligence";

import {
  buildSilenceTimeline,
  computeCascadeRisk,
} from "../lib/silenceIntelligence";

import "./GravityObservatory.css";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface GravityObservatoryProps {
  silence: SilenceProfile | null;
  fatigue: MessageFatigue | null;
  trajectory: EmotionalTrajectory | null;
  disengagementRisk: number;
  history?: import("../types").HistoryItem[];
  socialConnectionsCount?: number;
  socialInfluenceScore?: number;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function GravityObservatory({ silence, fatigue, disengagementRisk, history = [], socialConnectionsCount = 0, socialInfluenceScore = 0 }: GravityObservatoryProps) {
  // ── Derived data ──────────────────────────────────────
  const silenceLevel = silence
    ? deriveSilenceLevel(silence.current_silence_days)
    : "normal";
  const retention = silenceDays > 0 ? interpolateDecayCurve(silenceDays) : 1;
  const retentionPct = Math.round(retention * 100);

  // Escape risk classification
  const escapeRisk: "safe" | "drifting" | "approaching" | "critical" =
    disengagementRisk > 0.8
      ? "critical"
      : disengagementRisk > 0.5
        ? "approaching"
        : disengagementRisk > 0.25
          ? "drifting"
          : "safe";

  // Escape velocity: how fast they're leaving (0-100)
  const escapeVelocity = Math.round(disengagementRisk * 100);

  // Distance from center: inverse of retention (100 = at center, 0 = escaped)
  // Timeline
  const timeline: SilenceTimeline | null = useMemo(() => {
    if (history.length === 0) return null;
    return buildSilenceTimeline(history);
  }, [history]);

  // Cascade risk
  const cascade = useMemo(() => {
    if (!silence) return null;
    return computeCascadeRisk(
      silence.member_id,
      silenceDays,
      socialConnectionsCount,
      socialInfluenceScore,
    );
  }, [silence, silenceDays, socialConnectionsCount, socialInfluenceScore]);

  // SVG constants
  const cx = 120;
  const cy = 120;
  const maxR = 100;

  // Gravity ring radii (inner to outer)
  const retentionR = maxR * retention;
  const thresholdR = maxR * 0.2; // Escape threshold line

  return (
    <div
      className="glass-comm-observatory"
      data-escape-risk={escapeRisk}
      data-silence={silenceLevel}
    >
      {/* Header */}
      <div className="observatory__header">
        <span className="observatory__title">Observatorio de Retención</span>
        <div className="observatory__escape-badge" data-risk={escapeRisk}>
          {escapeRisk === "safe" ? "Seguro" :
           escapeRisk === "drifting" ? "Deriva" :
           escapeRisk === "approaching" ? "Acercándose" : "Crítico"}
        </div>
      </div>

      {/* Gravity visualization */}
      <div className="observatory__visual">
        <svg
          viewBox="0 0 240 240"
          className="observatory__svg"
          role="img"
          aria-label={`Retención: ${retentionPct}%, riesgo de escape: ${escapeRisk}`}
        >
          <defs>
            <radialGradient id="obs-gravity-field" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="observatory__field-inner" stopOpacity="0.2" />
              <stop offset={`${retention * 100}%`} className="observatory__field-mid" stopOpacity="0.08" />
              <stop offset="100%" className="observatory__field-outer" stopOpacity="0" />
            </radialGradient>

            <filter id="obs-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Gravity field background */}
          <circle cx={cx} cy={cy} r={maxR} fill="url(#obs-gravity-field)" />

          {/* Concentric gravity rings */}
          {[0.9, 0.75, 0.5, 0.25].map((fraction: number, i: number) => (
            <circle
              key={`ring-${i}`}
              cx={cx}
              cy={cy}
              r={maxR * fraction}
              className="observatory__gravity-ring"
              fill="none"
              strokeDasharray="3 6"
              opacity={0.15 + i * 0.05}
            />
          ))}

          {/* Escape threshold line (red boundary) */}
          <circle
            cx={cx}
            cy={cy}
            r={thresholdR}
            className="observatory__escape-threshold"
            fill="none"
            data-active={disengagementRisk > 0.5}
          />

          {/* Retention zone (filled area) */}
          <circle
            cx={cx}
            cy={cy}
            r={retentionR}
            className="observatory__retention-zone"
            data-risk={escapeRisk}
          />

          {/* Member point (center) */}
          <g className="observatory__member-group">
            <circle
              cx={cx}
              cy={cy}
              r={6}
              className="observatory__member-dot"
              data-risk={escapeRisk}
              filter="url(#obs-glow)"
            />
            <circle
              cx={cx}
              cy={cy}
              r={3}
              className="observatory__member-core"
              data-risk={escapeRisk}
            />
          </g>

          {/* Social connections (if any) */}
          {socialConnectionsCount > 0 && (
            <g className="observatory__connections">
              {Array.from({ length: Math.min(socialConnectionsCount, 6) }).map(
                (_: unknown, i: number) => {
                  const angle = (i / Math.min(socialConnectionsCount, 6)) * Math.PI * 2 - Math.PI / 2;
                  const dist = maxR * 0.6;
                  const px = cx + Math.cos(angle) * dist;
                  const py = cy + Math.sin(angle) * dist;
                  return (
                    <g key={`conn-${i}`}>
                      <line
                        x1={cx}
                        y1={cy}
                        x2={px}
                        y2={py}
                        className="observatory__connection-line"
                        data-risk={escapeRisk}
                      />
                      <circle
                        cx={px}
                        cy={py}
                        r={2.5}
                        className="observatory__connection-dot"
                      />
                    </g>
                  );
                },
              )}
            </g>
          )}

          {/* Retention percentage label */}
          <text
            x={cx}
            y={cy + maxR + 14}
            className="observatory__retention-label"
            textAnchor="middle"
          >
            Retención: {retentionPct}%
          </text>
        </svg>

        {/* Escape velocity gauge */}
        <div className="observatory__velocity">
          <span className="observatory__velocity-label">Velocidad de Escape</span>
          <div className="observatory__velocity-bar">
            <div
              className="observatory__velocity-fill"
              data-risk={escapeRisk}
              style={{ width: `${escapeVelocity}%` } as React.CSSProperties}
            />
            <div
              className="observatory__velocity-threshold"
              style={{ left: "50%" } as React.CSSProperties}
            />
          </div>
          <span className="observatory__velocity-value" data-risk={escapeRisk}>
            {escapeVelocity}%
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="observatory__stats">
        <div className="observatory__stat">
          <span className="observatory__stat-value" data-silence={silenceLevel}>
            {silenceDays}d
          </span>
          <span className="observatory__stat-label">Silencio</span>
        </div>
        <div className="observatory__stat">
          <span className="observatory__stat-value">
            {retentionPct}%
          </span>
          <span className="observatory__stat-label">Retención</span>
        </div>
        <div className="observatory__stat">
          <span className="observatory__stat-value" data-risk={escapeRisk}>
            {Math.round(disengagementRisk * 100)}%
          </span>
          <span className="observatory__stat-label">Riesgo</span>
        </div>
        <div className="observatory__stat">
          <span className="observatory__stat-value">
            {cascade?.affectedConnections ?? 0}
          </span>
          <span className="observatory__stat-label">Conexiones en Riesgo</span>
        </div>
      </div>

      {/* Cascade risk detail */}
      {cascade && cascade.riskScore > 0.3 && (
        <div className="observatory__cascade" data-mechanism={cascade.mechanism}>
          <span className="observatory__cascade-label">Riesgo de Cascada</span>
          <span className="observatory__cascade-text">{cascade.description}</span>
        </div>
      )}

      {/* Silence timeline mini */}
      {timeline && timeline.entries.length > 0 && (
        <div className="observatory__timeline">
          <span className="observatory__timeline-label">Línea de Silencio</span>
          <div className="observatory__timeline-strip">
            {timeline.entries
              .filter((_: unknown, i: number) => i < 20)
              .map((entry: import("../lib/silenceIntelligence").SilenceTimelineEntry, i: number) => (
                <div
                  key={`tl-${i}`}
                  className="observatory__timeline-block"
                  data-type={entry.type}
                  title={
                    entry.type === "silence"
                      ? `${entry.durationDays}d silencio — retención: ${Math.round(entry.retentionAtEnd * 100)}%`
                      : `Actividad`
                  }
                  style={{
                    flex: entry.type === "silence" ? Math.max(1, entry.durationDays) : 1,
                    "--stagger-i": i,
                  } as React.CSSProperties}
                />
              ))}
          </div>
          <div className="observatory__timeline-stats">
            <span>
              {Math.round(timeline.silenceRatio * 100)}% silencio
            </span>
            <span>
              Máximo: {timeline.longestSilenceDays}d
            </span>
          </div>
        </div>
      )}
    </div>
  );
}