// src/features/engagement/components/EngagementResonanceField.tsx
// ═══════════════════════════════════════════════════════════
// "The Resonance Field" — Event Echo Visualization
// Castillo Country Club — Phase 31 "The Voice"
//
// REWRITE: Original assumed fields that don't exist on
// ResonancePattern. This version uses ONLY real fields:
//   eventDomain, eventTitle, impactDuration, echoCount,
//   identityIntegration, repeatSeeking, expansionBehavior,
//   socialAmplification, timestamp
//
// All derived values (status, intensity, ripple) are computed
// inline using RESONANCE_THRESHOLDS from types.ts.
// NO config.ts imports — zero broken dependency risk.
//
// Glass namespace: glass-eng-resonance
// Data attributes: data-status, data-domain
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import {
  Activity,
  Radio,
} from "lucide-react";
import type {
  ResonancePattern,
} from "../types";
import {
  ACTIVITY_DOMAIN_DISPLAY,
  RESONANCE_THRESHOLDS,
} from "../types";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementResonanceField.css";

// ── Layout constants ───────────────────────────────────────

const SVG_WIDTH = 480;
const SVG_HEIGHT = 340;
const PADDING = 40;

// ── Derive stable key (no id field on ResonancePattern) ────

function patternKey(rp: ResonancePattern, idx: number): string {
  return `${rp.timestamp}-${rp.eventTitle}-${idx}`;
}

// ── Derive persistence status from impactDuration ──────────

function deriveStatus(rp: ResonancePattern): "persistent" | "active" | "fading" | "ephemeral" {
  if (rp.impactDuration >= RESONANCE_THRESHOLDS.impact_duration_long) return "persistent";
  if (rp.impactDuration >= RESONANCE_THRESHOLDS.impact_duration_medium) return "active";
  if (rp.impactDuration >= RESONANCE_THRESHOLDS.impact_duration_short) return "fading";
  return "ephemeral";
}

// ── Derive intensity from echoCount + socialAmplification ──

function deriveIntensity(rp: ResonancePattern): number {
  const echoScore = Math.min(1, rp.echoCount / RESONANCE_THRESHOLDS.echo_count_amplified) * 40;
  const socialScore = (rp.socialAmplification / 100) * 60;
  return Math.min(100, Math.round(echoScore + socialScore));
}

// ── Derive ripple radius from impactDuration ───────────────

function deriveRippleRadius(rp: ResonancePattern): number {
  return Math.min(100, (rp.impactDuration / RESONANCE_THRESHOLDS.impact_duration_long) * 100);
}

// ── Status display config ──────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; pulseSpeed: string }
> = {
  persistent: {
    label: "Persistente",
    color: "var(--color-gold-400)",
    pulseSpeed: "3s",
  },
  active: {
    label: "Activa",
    color: "var(--color-emerald-400)",
    pulseSpeed: "2s",
  },
  fading: {
    label: "Desvaneciendo",
    color: "var(--color-amber-400)",
    pulseSpeed: "4s",
  },
  ephemeral: {
    label: "Efímera",
    color: "var(--color-silver-500)",
    pulseSpeed: "8s",
  },
};

// ── Position generator (spiral layout) ─────────────────────

function computeOriginPositions(
  count: number,
): Array<{ x: number; y: number }> {
  if (count === 0) return [];
  const positions: Array<{ x: number; y: number }> = [];
  const centerX = SVG_WIDTH / 2;
  const centerY = SVG_HEIGHT / 2;

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      positions.push({ x: centerX, y: centerY });
    } else {
      const angle = i * 2.399;
      const radius = 60 + i * 30;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      positions.push({
        x: Math.max(PADDING, Math.min(SVG_WIDTH - PADDING, x)),
        y: Math.max(PADDING, Math.min(SVG_HEIGHT - PADDING, y)),
      });
    }
  }
  return positions;
}

// ── Component ──────────────────────────────────────────────

interface EngagementResonanceFieldProps {
  resonance: ResonancePattern[];
  onPatternClick?: (pattern: ResonancePattern) => void;
}

/**
 * "The Resonance Field" — event echo visualization.
 * Shows how events create emotional echoes that persist
 * over time. Each echo has a domain, duration, echo count,
 * identity integration, and social amplification.
 */
export function EngagementResonanceField({
  resonance,
  onPatternClick,
}: EngagementResonanceFieldProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const originPositions = useMemo(
    () => computeOriginPositions(resonance.length),
    [resonance.length],
  );

  // Build display data (NO hoveredKey in deps — handled in render)
  const patternData = useMemo(() => {
    return resonance.map((rp, idx) => {
      const pos = originPositions[idx];
      if (!pos) return null;

      const key = patternKey(rp, idx);
      const status = deriveStatus(rp);
      const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ephemeral;
      const intensity = deriveIntensity(rp);
      const rippleRadius = deriveRippleRadius(rp);
      const display = ACTIVITY_DOMAIN_DISPLAY[rp.eventDomain];
      const domainColor = display?.color ?? "var(--color-silver-400)";
      const maxRippleR = 20 + (rippleRadius / 100) * 100;
      const originR = 6 + intensity * 0.08;

      return {
        pattern: rp,
        key,
        x: pos.x,
        y: pos.y,
        status,
        statusCfg,
        intensity,
        domainColor,
        display,
        maxRippleR,
        originR,
        idx,
      };
    }).filter(Boolean);
  }, [resonance, originPositions]);

  // Summary stats
  const persistentCount = resonance.filter(
    (rp: ResonancePattern) => deriveStatus(rp) === "persistent",
  ).length;
  const highIdentityCount = resonance.filter(
    (rp: ResonancePattern) => rp.identityIntegration >= RESONANCE_THRESHOLDS.identity_integration_high,
  ).length;

  if (resonance.length === 0) {
    return (
      <div data-glass-eng-resonance="" data-status="empty" className="eng-resonance">
        <div className="eng-resonance__header">
          <h3 className="eng-resonance__title">Campo de Resonancia</h3>
        </div>
        <EmptyState
          title="Sin patrones de resonancia"
          description="El campo de resonancia se activará cuando se detecten eventos con eco emocional."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Analizar campo
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-glass-eng-resonance=""
      data-status={persistentCount > 2 ? "amplified" : resonance.length > 0 ? "active" : "quiet"}
      className="eng-resonance"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-resonance__header">
        <h3 className="eng-resonance__title">Campo de Resonancia</h3>
        <div className="eng-resonance__header-stats">
          <span className="eng-resonance__stat">
            <Radio size={10} />
            {resonance.length} ecos
          </span>
          <span className="eng-resonance__stat">
            <Activity size={10} />
            {persistentCount} persistentes
          </span>
          {highIdentityCount > 0 && (
            <span className="eng-resonance__stat eng-resonance__stat--identity">
              {highIdentityCount} identitarios
            </span>
          )}
        </div>
      </div>

      {/* ── SVG Field ────────────────────────────────────────── */}
      <div className="eng-resonance__canvas">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={`Campo de resonancia con ${resonance.length} ecos de eventos`}
        >
          <defs>
            <filter id="eng-res-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Background grid ───────────────────────────────── */}
          <g className="eng-resonance__grid" opacity={0.04}>
            {Array.from({ length: Math.floor(SVG_WIDTH / 40) }).map((_, i) => (
              <line
                key={`vg-${i}`}
                x1={i * 40} y1={0} x2={i * 40} y2={SVG_HEIGHT}
                stroke="var(--color-silver-400)" strokeWidth={0.5}
              />
            ))}
            {Array.from({ length: Math.floor(SVG_HEIGHT / 40) }).map((_, i) => (
              <line
                key={`hg-${i}`}
                x1={0} y1={i * 40} x2={SVG_WIDTH} y2={i * 40}
                stroke="var(--color-silver-400)" strokeWidth={0.5}
              />
            ))}
          </g>

          {/* ── Resonance Patterns ────────────────────────────── */}
          {patternData.map((pd) => {
            if (!pd) return null;
            const { pattern, key, x, y, status, statusCfg, domainColor, maxRippleR, originR, display, idx } = pd;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={key}
                className="eng-resonance__pattern"
                data-status={status}
                data-domain={pattern.eventDomain}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onPatternClick?.(pattern)}
                style={{ cursor: "pointer" }}
              >
                {/* ── Ripple rings ─────────────────────────────── */}
                {status !== "ephemeral" && (
                  <g className="eng-resonance__ripples">
                    <circle
                      cx={x} cy={y} r={maxRippleR * 0.4}
                      fill="none" stroke={domainColor}
                      strokeWidth={isHovered ? 1.5 : 0.8}
                      opacity={0.4}
                      className="eng-resonance__ripple"
                      style={{ animationDuration: statusCfg.pulseSpeed }}
                    />
                    <circle
                      cx={x} cy={y} r={maxRippleR * 0.7}
                      fill="none" stroke={domainColor}
                      strokeWidth={isHovered ? 1.2 : 0.6}
                      opacity={0.25}
                      className="eng-resonance__ripple"
                      style={{ animationDuration: statusCfg.pulseSpeed, animationDelay: "0.5s" }}
                    />
                    <circle
                      cx={x} cy={y} r={maxRippleR}
                      fill="none" stroke={domainColor}
                      strokeWidth={isHovered ? 1 : 0.4}
                      opacity={0.12}
                      className="eng-resonance__ripple"
                      style={{ animationDuration: statusCfg.pulseSpeed, animationDelay: "1s" }}
                    />
                  </g>
                )}

                {/* ── Origin circle ────────────────────────────── */}
                <circle
                  cx={x} cy={y} r={originR}
                  fill={domainColor}
                  fillOpacity={isHovered ? 0.4 : 0.25}
                  stroke={domainColor}
                  strokeWidth={isHovered ? 2 : 1.5}
                  filter={
                    pattern.identityIntegration >= RESONANCE_THRESHOLDS.identity_integration_high
                      ? "url(#eng-res-glow)"
                      : undefined
                  }
                  className="eng-resonance__origin"
                />

                {/* ── Event title label ────────────────────────── */}
                <text
                  x={x} y={y - originR - 6}
                  textAnchor="middle"
                  fontSize={isHovered ? 10 : 8}
                  fill={domainColor}
                  fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                  fontWeight="600"
                  className="eng-resonance__origin-label"
                >
                  {pattern.eventTitle.length > 18
                    ? pattern.eventTitle.slice(0, 18) + "…"
                    : pattern.eventTitle}
                </text>

                {/* ── Domain label ─────────────────────────────── */}
                <text
                  x={x} y={y + originR + 12}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--color-silver-500)"
                  fontFamily="var(--font-mono, 'DM Mono', monospace)"
                  className="eng-resonance__domain-label"
                >
                  {display?.label ?? pattern.eventDomain}
                </text>

                {/* ── Behavioral badges ────────────────────────── */}
                {(pattern.repeatSeeking || pattern.expansionBehavior) && (
                  <g className="eng-resonance__badges">
                    {pattern.repeatSeeking && (
                      <text
                        x={x + originR + 4} y={y - 4}
                        fontSize={7}
                        fill="var(--color-teal-400)"
                        fontFamily="var(--font-mono, 'DM Mono', monospace)"
                      >
                        ↻ repeat
                      </text>
                    )}
                    {pattern.expansionBehavior && (
                      <text
                        x={x + originR + 4} y={y + 6}
                        fontSize={7}
                        fill="var(--color-emerald-400)"
                        fontFamily="var(--font-mono, 'DM Mono', monospace)"
                      >
                        ⟐ expand
                      </text>
                    )}
                  </g>
                )}

                {/* ── Hover tooltip ────────────────────────────── */}
                {isHovered && (
                  <g className="eng-resonance__tooltip">
                    <rect
                      x={x - 95} y={y - originR - 62}
                      width={190} height={52}
                      rx={8}
                      fill="var(--color-surface-1)"
                      fillOpacity={0.95}
                      stroke={domainColor}
                      strokeWidth={1} strokeOpacity={0.3}
                    />
                    <text
                      x={x} y={y - originR - 46}
                      textAnchor="middle" fontSize={9}
                      fill="var(--color-silver-200)"
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                    >
                      {pattern.eventTitle} · {display?.label ?? pattern.eventDomain}
                    </text>
                    <text
                      x={x} y={y - originR - 32}
                      textAnchor="middle" fontSize={8}
                      fill={domainColor}
                      fontFamily="var(--font-mono, 'DM Mono', monospace)"
                    >
                      Eco: {pattern.echoCount} · Social: {pattern.socialAmplification}% · Identidad: {pattern.identityIntegration}%
                    </text>
                    <text
                      x={x} y={y - originR - 20}
                      textAnchor="middle" fontSize={8}
                      fill="var(--color-silver-400)"
                      fontFamily="var(--font-mono, 'DM Mono', monospace)"
                    >
                      Duración: {pattern.impactDuration}d · {new Date(pattern.timestamp).toLocaleDateString("es")}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="eng-resonance__legend">
        <div className="eng-resonance__legend-item">
          <span className="eng-resonance__legend-dot eng-resonance__legend-dot--persistent" />
          <span>Persistente (&gt;30d)</span>
        </div>
        <div className="eng-resonance__legend-item">
          <span className="eng-resonance__legend-dot eng-resonance__legend-dot--active" />
          <span>Activa (14-30d)</span>
        </div>
        <div className="eng-resonance__legend-item">
          <span className="eng-resonance__legend-dot eng-resonance__legend-dot--fading" />
          <span>Desvaneciendo (3-14d)</span>
        </div>
        <div className="eng-resonance__legend-item">
          <span className="eng-resonance__legend-dot eng-resonance__legend-dot--ephemeral" />
          <span>Efímera (&lt;3d)</span>
        </div>
      </div>

      {/* ── Pattern list ─────────────────────────────────────── */}
      <div className="eng-resonance__list">
        {[...resonance]
          .sort((a: ResonancePattern, b: ResonancePattern) => deriveIntensity(b) - deriveIntensity(a))
          .slice(0, 5)
          .map((rp: ResonancePattern, _listIdx: number) => {
            const origIdx = resonance.indexOf(rp);
            const key = patternKey(rp, origIdx);
            const status = deriveStatus(rp);
            const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ephemeral;
            const display = ACTIVITY_DOMAIN_DISPLAY[rp.eventDomain];
            const intensity = deriveIntensity(rp);

            return (
              <Button
                variant="unstyled"
                key={key}
                type="button"
                className="eng-resonance__list-item"
                onClick={() => onPatternClick?.(rp)}
                onMouseEnter={() => setHoveredIdx(origIdx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span
                  className="eng-resonance__list-status"
                  style={{
                    color: statusCfg.color,
                    backgroundColor: `color-mix(in srgb, ${statusCfg.color} 12%, transparent)`,
                  }}
                >
                  {statusCfg.label}
                </span>
                <div className="eng-resonance__list-body">
                  <span className="eng-resonance__list-type">{rp.eventTitle}</span>
                  <span className="eng-resonance__list-meta">
                    {display?.label ?? rp.eventDomain} · {rp.echoCount} ecos · {rp.impactDuration}d
                  </span>
                </div>
                <span className="eng-resonance__list-intensity">
                  {intensity}%
                </span>
              </Button>
            );
          })}
      </div>
    </div>
  );
}