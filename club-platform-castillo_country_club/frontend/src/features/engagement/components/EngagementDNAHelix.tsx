// src/features/engagement/components/EngagementDNAHelix.tsx
// ═══════════════════════════════════════════════════════════
// "The DNA Helix" — Engagement Profile Evolution
// Castillo Country Club — Phase 31 "The Voice"
//
// SVG double helix showing how engagement DNA evolves.
// Left strand = activity pattern (what they DO).
// Right strand = preference pattern (what they LIKE).
// Color shifts = mutations. Gaps = dormant periods.
// Mutation markers = diamond shapes at shift points.
//
// Glass namespace: glass-eng-dna
// Data attributes: data-trend, data-mutations
// Rules: R34, R35, R38
// ═══════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import type {
  EngagementDNAMutation,
  EngagementDashboardFamily,
} from "../types";
import {
  classifyMutationSeverity,
  getMutationSeverityColor,
} from "../config";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Button } from "@/shared/components/ui";
import "./EngagementDNAHelix.css";

// ── Layout constants ───────────────────────────────────────

const SVG_WIDTH = 500;
const SVG_HEIGHT = 360;
const HELIX_PADDING_X = 50;
const HELIX_USABLE_WIDTH = SVG_WIDTH - HELIX_PADDING_X * 2;
const HELIX_AMPLITUDE = 50;
const HELIX_CENTER_Y = SVG_HEIGHT / 2;

// ── Domain color helper ────────────────────────────────────
// ── Helix path generator ───────────────────────────────────

/**
 * Generate a sinusoidal helix path.
 * @param points — number of sample points
 * @param phaseOffset — phase offset for second strand (PI for opposite)
 * @param amplitudes — per-point amplitude modulation (engagement strength)
 */
function generateHelixPath(
  points: number,
  phaseOffset: number,
  amplitudes: number[],
): string {
  const segments: string[] = [];

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = HELIX_PADDING_X + t * HELIX_USABLE_WIDTH;
    const amp = (amplitudes[i] ?? 0.5) * HELIX_AMPLITUDE;
    const phase = t * Math.PI * 4 + phaseOffset;
    const y = HELIX_CENTER_Y + Math.sin(phase) * amp;

    if (i === 0) {
      segments.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else {
      segments.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }

  return segments.join(" ");
}

/**
 * Generate backbone connector positions between the two strands.
 */
function generateBackbonePositions(
  points: number,
  activityAmplitudes: number[],
  preferenceAmplitudes: number[],
): Array<{ x: number; y1: number; y2: number }> {
  const positions: Array<{ x: number; y1: number; y2: number }> = [];

  for (let i = 0; i <= points; i += 2) {
    const t = i / points;
    const x = HELIX_PADDING_X + t * HELIX_USABLE_WIDTH;
    const ampA = (activityAmplitudes[i] ?? 0.5) * HELIX_AMPLITUDE;
    const ampP = (preferenceAmplitudes[i] ?? 0.5) * HELIX_AMPLITUDE;
    const phaseA = t * Math.PI * 4;
    const phaseP = t * Math.PI * 4 + Math.PI;
    const y1 = HELIX_CENTER_Y + Math.sin(phaseA) * ampA;
    const y2 = HELIX_CENTER_Y + Math.sin(phaseP) * ampP;

    positions.push({ x, y1, y2 });
  }

  return positions;
}

// ── Month labels ───────────────────────────────────────────

function generateMonthLabels(count: number): string[] {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const now = new Date();
  const labels: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(months[d.getMonth()]);
  }

  return labels;
}

// ── Component ──────────────────────────────────────────────

interface EngagementDNAHelixProps {
  mutations: EngagementDNAMutation[];
  families: EngagementDashboardFamily[];
  onMutationClick?: (mutation: EngagementDNAMutation) => void;
  onFamilyClick?: (familyId: string) => void;
}

/**
 * "The DNA Helix" — engagement profile evolution.
 * Shows how the club's collective engagement DNA evolves over time.
 * Two strands: activity pattern + preference pattern.
 * Mutations appear as diamond markers at shift points.
 */
export function EngagementDNAHelix({
  mutations,
  families,
  onMutationClick,
}: EngagementDNAHelixProps) {
  const [hoveredMutation, setHoveredMutation] = useState<string | null>(null);

  // Points along the helix (one per month, 12 months)
  const helixPoints = 60;
  const monthCount = 12;
  const monthLabels = useMemo(() => generateMonthLabels(monthCount), []);

  // Compute amplitudes from family engagement data
  // In a real system, this comes from historical per-domain data
  const activityAmplitudes = useMemo(() => {
    const amps: number[] = [];
    for (let i = 0; i <= helixPoints; i++) {
      // Base amplitude modulated by aggregate family health
      const avgScore = families.length > 0
        ? families.reduce((s: number, f: EngagementDashboardFamily) => s + f.engagement_score, 0) / families.length / 100
        : 0.5;
      // Add slight variation per position
      const variation = Math.sin(i * 0.3) * 0.15 + Math.cos(i * 0.7) * 0.1;
      amps.push(Math.max(0.2, Math.min(1, avgScore + variation)));
    }
    return amps;
  }, [families]);

  const preferenceAmplitudes = useMemo(() => {
    const amps: number[] = [];
    for (let i = 0; i <= helixPoints; i++) {
      const avgScore = families.length > 0
        ? families.reduce((s: number, f: EngagementDashboardFamily) => s + f.engagement_score, 0) / families.length / 100
        : 0.5;
      // Slightly different variation pattern
      const variation = Math.cos(i * 0.25) * 0.12 + Math.sin(i * 0.6) * 0.13;
      amps.push(Math.max(0.2, Math.min(1, avgScore + variation + 0.05)));
    }
    return amps;
  }, [families]);

  // Generate helix paths
  const activityPath = useMemo(
    () => generateHelixPath(helixPoints, 0, activityAmplitudes),
    [activityAmplitudes],
  );

  const preferencePath = useMemo(
    () => generateHelixPath(helixPoints, Math.PI, preferenceAmplitudes),
    [preferenceAmplitudes],
  );

  // Generate backbone connectors
  const backbonePositions = useMemo(
    () => generateBackbonePositions(helixPoints, activityAmplitudes, preferenceAmplitudes),
    [activityAmplitudes, preferenceAmplitudes],
  );

  // Map mutations to helix positions
  const mutationMarkers = useMemo(() => {
    return mutations.map((m, idx) => {
      // Position along the helix based on date
      const date = new Date(m.date);
      const now = new Date();
      const monthsAgo = Math.max(0, Math.min(11,
        (now.getFullYear() - date.getFullYear()) * 12 +
        (now.getMonth() - date.getMonth()),
      ));
      const t = 1 - monthsAgo / monthCount;
      const x = HELIX_PADDING_X + t * HELIX_USABLE_WIDTH;

      // Y position between the two strands
      const amp = (activityAmplitudes[Math.round(t * helixPoints)] ?? 0.5) * HELIX_AMPLITUDE;
      const phase = t * Math.PI * 4;
      const yActivity = HELIX_CENTER_Y + Math.sin(phase) * amp;
      const yPreference = HELIX_CENTER_Y + Math.sin(phase + Math.PI) * amp;
      const y = (yActivity + yPreference) / 2;

      const severity = classifyMutationSeverity(m);
      const color = getMutationSeverityColor(severity);
      const isHovered = hoveredMutation === m.id;

      return {
        mutation: m,
        x,
        y,
        color,
        severity,
        isHovered,
        idx,
      };
    });
  }, [mutations, activityAmplitudes, hoveredMutation]);

  if (families.length === 0) {
    return (
      <div data-glass-eng-dna="" data-trend="stable" data-mutations="0" className="eng-dna">
        <div className="eng-dna__header">
          <h3 className="eng-dna__title">ADN de Engagement</h3>
        </div>
        <EmptyState
          title="Sin datos de evolución"
          description="El ADN de engagement se computará cuando haya historial de familias."
          action={
            <Button variant="ghost" size="sm" onClick={() => {}}>
              Ver evolución
            </Button>
          }
        />
      </div>
    );
  }

  const activeMutationCount = mutations.filter(
    (m) => classifyMutationSeverity(m) === "major" || classifyMutationSeverity(m) === "fundamental",
  ).length;

  return (
    <div
      data-glass-eng-dna=""
      data-trend={activeMutationCount > 0 ? "mutating" : "stable"}
      data-mutations={mutations.length}
      className="eng-dna"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="eng-dna__header">
        <h3 className="eng-dna__title">ADN de Engagement</h3>
        <div className="eng-dna__header-stats">
          {mutations.length > 0 && (
            <span className="eng-dna__mutation-count">
              {mutations.length} mutación{mutations.length !== 1 ? "es" : ""}
            </span>
          )}
          {activeMutationCount > 0 && (
            <span className="eng-dna__mutation-alert">
              {activeMutationCount} mayor{activeMutationCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── SVG Visualization ────────────────────────────────── */}
      <div className="eng-dna__canvas">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          height="100%"
          role="img"
          aria-label="Evolución del ADN de engagement"
        >
          <defs>
            {/* Activity strand gradient */}
            <linearGradient id="eng-dna-activity-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-teal-400)" stopOpacity={0.6} />
              <stop offset="50%" stopColor="var(--color-emerald-400)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--color-teal-400)" stopOpacity={0.6} />
            </linearGradient>

            {/* Preference strand gradient */}
            <linearGradient id="eng-dna-preference-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity={0.6} />
              <stop offset="50%" stopColor="var(--color-amber-400)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity={0.6} />
            </linearGradient>

            {/* Glow filter for mutations */}
            <filter id="eng-dna-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Month labels (X axis) ─────────────────────────── */}
          <g className="eng-dna__labels">
            {monthLabels.map((label, i) => {
              const t = i / (monthCount - 1);
              const x = HELIX_PADDING_X + t * HELIX_USABLE_WIDTH;
              return (
                <text
                  key={`label-${i}`}
                  x={x}
                  y={SVG_HEIGHT - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-silver-500)"
                  fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                >
                  {label}
                </text>
              );
            })}
          </g>

          {/* ── Backbone connectors ───────────────────────────── */}
          <g className="eng-dna__backbone">
            {backbonePositions.map((bp, i) => (
              <line
                key={`bb-${i}`}
                x1={bp.x}
                y1={bp.y1}
                x2={bp.x}
                y2={bp.y2}
                stroke="var(--color-silver-500)"
                strokeWidth={0.5}
                opacity={0.2}
              />
            ))}
          </g>

          {/* ── Activity Strand (left/first) ──────────────────── */}
          <path
            d={activityPath}
            fill="none"
            stroke="url(#eng-dna-activity-grad)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="eng-dna__strand eng-dna__strand--activity"
          />

          {/* ── Preference Strand (right/second) ──────────────── */}
          <path
            d={preferencePath}
            fill="none"
            stroke="url(#eng-dna-preference-grad)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="eng-dna__strand eng-dna__strand--preference"
          />

          {/* ── Mutation Markers ──────────────────────────────── */}
          <g className="eng-dna__mutations">
            {mutationMarkers.map((marker) => (
              <g
                key={marker.mutation.id}
                className="eng-dna__mutation"
                data-severity={marker.severity}
                onMouseEnter={() => setHoveredMutation(marker.mutation.id)}
                onMouseLeave={() => setHoveredMutation(null)}
                onClick={() => onMutationClick?.(marker.mutation)}
                style={{ cursor: "pointer" }}
              >
                {/* Diamond marker */}
                <polygon
                  points={`${marker.x},${marker.y - 8} ${marker.x + 6},${marker.y} ${marker.x},${marker.y + 8} ${marker.x - 6},${marker.y}`}
                  fill={marker.color}
                  fillOpacity={marker.isHovered ? 0.9 : 0.6}
                  stroke={marker.color}
                  strokeWidth={marker.isHovered ? 2 : 1}
                  filter={marker.isHovered ? "url(#eng-dna-glow)" : undefined}
                  className="eng-dna__diamond"
                />

                {/* Hover tooltip */}
                {marker.isHovered && (
                  <g className="eng-dna__tooltip">
                    <rect
                      x={marker.x - 80}
                      y={marker.y - 50}
                      width={160}
                      height={38}
                      rx={8}
                      fill="var(--color-surface-1)"
                      fillOpacity={0.95}
                      stroke={marker.color}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                    />
                    <text
                      x={marker.x}
                      y={marker.y - 36}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--color-silver-200)"
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                      fontWeight="600"
                    >
                      {marker.mutation.familyName}
                    </text>
                    <text
                      x={marker.x}
                      y={marker.y - 22}
                      textAnchor="middle"
                      fontSize={8}
                      fill={marker.color}
                      fontFamily="var(--font-ui, 'DM Sans', sans-serif)"
                    >
                      {marker.mutation.from} → {marker.mutation.to}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* ── Legend ────────────────────────────────────────────── */}
      <div className="eng-dna__legend">
        <div className="eng-dna__legend-item">
          <span className="eng-dna__legend-strand eng-dna__legend-strand--activity" />
          <span>Actividad (lo que hacen)</span>
        </div>
        <div className="eng-dna__legend-item">
          <span className="eng-dna__legend-strand eng-dna__legend-strand--preference" />
          <span>Preferencias (lo que les gusta)</span>
        </div>
        <div className="eng-dna__legend-item">
          <span className="eng-dna__legend-diamond" />
          <span>Mutación detectada</span>
        </div>
      </div>

      {/* ── Mutation List ────────────────────────────────────── */}
      {mutations.length > 0 && (
        <div className="eng-dna__mutation-list">
          <h4 className="eng-dna__mutation-list-title">Mutaciones Recientes</h4>
          {mutations.slice(0, 5).map((m) => {
            const severity = classifyMutationSeverity(m);
            const color = getMutationSeverityColor(severity);
            return (
              <button
                key={m.id}
                type="button"
                className="eng-dna__mutation-item"
                onClick={() => onMutationClick?.(m)}
                onMouseEnter={() => setHoveredMutation(m.id)}
                onMouseLeave={() => setHoveredMutation(null)}
              >
                <span
                  className="eng-dna__mutation-severity"
                  style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  {severity}
                </span>
                <div className="eng-dna__mutation-body">
                  <span className="eng-dna__mutation-family">{m.familyName}</span>
                  <span className="eng-dna__mutation-shift">
                    {m.from} → {m.to}
                  </span>
                </div>
                <span className="eng-dna__mutation-confidence">
                  {(m.confidence * 100).toFixed(0)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}