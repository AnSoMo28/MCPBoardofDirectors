// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/CohortVitals.tsx
// Phase 34+ Migration — Cohort Vitals
// Level 6+ Agency · Production Grade
//
// "The ICU Ward" — 7 vital sign cards (one per cohort bracket).
// Each: icon, count, health bar, heartbeat sparkline,
// trend arrow, aging-out badge.
//
// Original: cn() + Tailwind inline + no ARIA + no CSS
//   → BEM .ag-vital + data-* + ARIA + CSS co-located
//
// PRE-WRITE VERIFICATION:
//   PrismSegment → ./hooks/useAgeGroupDashboard ✅
//   AgeBracketId → ../types ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → data-hotspot, data-ripple, data-trend, data-health-level
//   - Tailwind text-[ var(--...) ] → CSS [data-trend] selectors
//   - .glass-cohort-vitals + .cv-* → .ag-vital__*
//   - Inline props → named interfaces
//   - Missing ARIA → role, aria-label
//   - Missing CSS import → co-located
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  Baby,
  Puzzle,
  Zap,
  Flame,
  Target,
  Trees,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PrismSegment } from "../hooks/useAgeGroupDashboard";

import "./CohortVitals.css";

/* ── §0  Constants ────────────────────────────────────────── */

const BRACKET_ICONS: Record<string, LucideIcon> = {
  baby: Baby,
  puzzle: Puzzle,
  zap: Zap,
  flame: Flame,
  target: Target,
  trees: Trees,
  "heart-pulse": HeartPulse,
};

/* ── §1  Heartbeat Generator (deterministic) ──────────────── */

function seededPhase(seed: number, i: number): number {
  return ((Math.sin(seed * 127.1 + i * 311.7) * 43758.5453) % 1 + 1) % 1;
}

function generateHeartbeat(
  width: number,
  height: number,
  beats: number,
  health: number,
  seed: number,
): string {
  const n = 60;
  const amp = (health / 100) * (height * 0.38);
  const mid = height / 2;
  const pts: string[] = [];

  for (let i = 0; i <= n; i++) {
    const x = (i / n) * width;
    const phase = ((i / n) * beats) % 1;

    let spike = 0;
    if (phase < 0.06) {
      spike = Math.sin((phase / 0.06) * Math.PI) * amp;
    } else if (phase < 0.12) {
      spike = -Math.sin(((phase - 0.06) / 0.06) * Math.PI) * amp * 0.35;
    } else if (phase < 0.22) {
      spike = Math.sin(((phase - 0.12) / 0.1) * Math.PI) * amp * 0.2;
    }

    const drift = Math.sin((i / n) * Math.PI * 0.7) * amp * 0.08;
    const noise =
      (seededPhase(seed, i) - 0.5) * (1 - health / 100) * 2.5;

    const y = mid - spike - drift + noise;
    pts.push(
      `${x.toFixed(1)},${Math.max(1, Math.min(height - 1, y)).toFixed(1)}`,
    );
  }

  return pts.join(" ");
}

/* ── §2  Sub-component Props ──────────────────────────────── */

interface TrendArrowProps {
  readonly trend: "up" | "down" | "stable";
}

interface AgingBadgeProps {
  readonly years: number;
  readonly urgency: "monitor" | "plan" | "act";
}

interface VitalCardProps {
  readonly segment: PrismSegment;
  readonly index: number;
}

interface CohortVitalsProps {
  /** Prism segments from useAgeGroupDashboard */
  readonly segments: PrismSegment[];
}

/* ── §3  TrendArrow ───────────────────────────────────────── */

function TrendArrow({ trend }: TrendArrowProps) {
  const Icon: LucideIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <span className="ag-vital__trend" data-trend={trend}>
      <Icon size={12} aria-hidden="true" />
    </span>
  );
}

/* ── §4  AgingBadge ───────────────────────────────────────── */

function AgingBadge({ years, urgency }: AgingBadgeProps) {
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const urgencyPct = urgency === "act" ? 100 : urgency === "plan" ? 50 : 15;
  const offset = circumference * (1 - urgencyPct / 100);

  return (
    <div
      className="ag-vital__aging"
      data-urgency={urgency}
      aria-label={`Aging-out: ~${years.toFixed(1)} años, urgencia ${urgency}`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 26 26"
        aria-hidden="true"
      >
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2.5"
        />
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="ag-vital__aging-ring"
        />
      </svg>
      <span className="ag-vital__aging-label">
        ~{years.toFixed(1)}a
      </span>
    </div>
  );
}

/* ── §5  VitalCard ────────────────────────────────────────── */

function VitalCard({ segment, index }: VitalCardProps) {
  const IconComponent = BRACKET_ICONS[segment.icon] ?? HeartPulse;

  const sparkline = useMemo(
    () =>
      generateHeartbeat(
        80,
        24,
        Math.max(1, Math.round(segment.energySpeed)),
        segment.healthScore,
        index * 137 + 42,
      ),
    [segment.energySpeed, segment.healthScore, index],
  );

  const healthLevel = useMemo(() => {
    if (segment.healthScore >= 70) return "healthy";
    if (segment.healthScore >= 40) return "warning";
    return "critical";
  }, [segment.healthScore]);

  return (
    <div
      className="ag-vital__card"
      role="listitem"
      aria-label={`${segment.label}: ${segment.memberCount} miembros, salud ${segment.healthScore}%`}
      data-hotspot={segment.hotspot || undefined}
      data-ripple={segment.rippleActive || undefined}
      data-health-level={healthLevel}
      style={
        {
          "--vital-color": segment.color,
          "--stagger-i": index,
        } as CSSProperties
      }
    >
      {/* Top: Icon + Label + Trend */}
      <div className="ag-vital__header">
        <span className="ag-vital__icon" aria-hidden="true">
          <IconComponent size={16} />
        </span>
        <span className="ag-vital__label">{segment.label}</span>
        <TrendArrow trend={segment.trend} />
      </div>

      {/* Count */}
      <p className="ag-vital__count">{segment.memberCount}</p>
      <p className="ag-vital__range">
        {segment.percentage.toFixed(1)}% del total
      </p>

      {/* Health bar */}
      <div
        className="ag-vital__health-track"
        role="progressbar"
        aria-valuenow={segment.healthScore}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Salud de ${segment.label}`}
      >
        <div
          className="ag-vital__health-fill"
          style={{ width: `${segment.healthScore}%` }}
        />
      </div>

      {/* Heartbeat sparkline */}
      <svg
        viewBox="0 0 80 24"
        className="ag-vital__sparkline"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={sparkline}
          fill="none"
          stroke={segment.color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      </svg>

      {/* Aging-out badge */}
      {segment.agingOut && (
        <AgingBadge
          years={segment.agingOut.avgYearsRemaining}
          urgency={segment.agingOut.urgency}
        />
      )}
    </div>
  );
}

/* ── §6  Container ────────────────────────────────────────── */

/**
 * CohortVitals — "The ICU Ward"
 *
 * Renders 7 vital sign cards in a responsive grid.
 * Each card shows: bracket icon, member count, health bar,
 * heartbeat sparkline, trend arrow, and optional aging badge.
 */
export function CohortVitals({ segments }: CohortVitalsProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className="ag-vital"
      role="region"
      aria-label="Signos vitales por cohorte"
      data-testid="ag-vital"
    >
      <div
        className="ag-vital__grid"
        role="list"
        aria-label="Cohortes demográficas"
      >
        {segments.map((seg, i) => (
          <VitalCard key={seg.bracketId} segment={seg} index={i} />
        ))}
      </div>
    </div>
  );
}