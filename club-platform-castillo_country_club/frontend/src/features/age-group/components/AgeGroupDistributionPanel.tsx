// ═══════════════════════════════════════════════════════════
// src/features/age-group/components/AgeGroupDistributionPanel.tsx
// Phase 34+ Migration — Distribution Panel
// Level 6+ Agency · Production Grade
//
// "The Generational Canvas" — Full 7-bracket spectrum with
// intelligence overlays. Resonance-weighted balance, gap
// bridges, target zones, metronome, and stacked spectrum.
//
// Original: cn() + 5 namespaces + inline colors + className
//   → BEM .ag-dist__* + data-* + CSS var bridge + ARIA
//
// PRE-WRITE VERIFICATION:
//   AgeDistributionEntry → @/shared/mocks/contracts ✅
//   AgeBracketId → ../types ✅
//   GenerationalRipple → ../types ✅
//   AgingOutRisk → ../types ✅
//   CohortHealthEntry → ./hooks/useAgeGroupAdvisor ✅
//   AGE_BRACKETS → ../config ✅
//   AGE_BALANCE_TARGETS → ../config ✅
//   COHORT_IDENTITIES → ../config ✅
//   resolveBracketId → ../config ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() × 4 → data-hotspot, data-ripple, data-urgency, data-pattern, data-status
//   - 5 namespaces → .ag-dist__* unified BEM
//   - Inline color styles → CSS var bridge (--balance-color, --status-color)
//   - className prop → removed
//   - Props → AgeGroupDistributionPanelProps Readonly
//   - ../types for constants → ../config
//
// CHECKLIST: TSX-1-39 ✅
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Scale } from "lucide-react";

import type { AgeDistributionEntry } from "@/shared/mocks/contracts";

import {
  AGE_BRACKETS,
  AGE_BALANCE_TARGETS,
  COHORT_IDENTITIES,
  resolveBracketId,
} from "../config";
import type {
  AgeBracketId,
  GenerationalRipple,
  AgingOutRisk,
} from "../types";
import type { CohortHealthEntry } from "../hooks/useAgeGroupAdvisor";

import "./AgeGroupDistributionPanel.css";

/* ── §0  Local Types ──────────────────────────────────────── */

interface BracketSegment {
  readonly bracketId: AgeBracketId;
  readonly label: string;
  readonly color: string;
  readonly gradient: readonly [string, string];
  readonly bgPattern: string;
  readonly count: number;
  readonly pct: number;
  readonly targetMin: number;
  readonly targetMax: number;
  readonly inTarget: boolean;
  readonly health?: CohortHealthEntry;
  readonly rippleActive: boolean;
  readonly agingOut?: AgingOutRisk;
  readonly staggerIndex: number;
}

interface GapBridge {
  readonly left: AgeBracketId;
  readonly right: AgeBracketId;
  readonly severity: number;
  readonly leftPct: number;
  readonly rightPct: number;
}

interface AgeGroupDistributionPanelProps {
  /** Age distribution entries from analytics */
  readonly ageDistribution: AgeDistributionEntry[];
  /** Family participation rate (0-100) */
  readonly familyParticipationRate: number;
  /** Per-bracket health from advisor */
  readonly cohortHealth: CohortHealthEntry[];
  /** Active ripple propagations */
  readonly ripples: GenerationalRipple[];
  /** Aging-out risk per bracket */
  readonly agingOutRisks: AgingOutRisk[];
}

/* ── §1  Helpers ──────────────────────────────────────────── */

/**
 * Resonance-weighted balance score.
 * Brackets with higher resonance contribute more.
 */
function computeResonanceBalance(segments: BracketSegment[]): number {
  let weightedDeviation = 0;
  let totalWeight = 0;

  for (const seg of segments) {
    const bracket = AGE_BRACKETS.find((b) => b.id === seg.bracketId);
    if (!bracket) continue;

    const idealMid = (seg.targetMin + seg.targetMax) / 2;
    const deviation = Math.abs(seg.pct - idealMid);
    const weight = bracket.resonance;

    weightedDeviation += deviation * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 50;
  const avgDeviation = weightedDeviation / totalWeight;
  return Math.max(0, Math.min(100, Math.round(100 - avgDeviation * 2)));
}

/**
 * Skew direction for metronome.
 * Positive = too many young, negative = too many old.
 */
function computeSkew(segments: BracketSegment[]): number {
  const bracketOrder = AGE_BRACKETS.map((b) => b.id);
  let skew = 0;
  const halfLen = Math.floor(bracketOrder.length / 2);

  for (const seg of segments) {
    const idx = bracketOrder.indexOf(seg.bracketId);
    if (idx < 0) continue;
    const target = AGE_BALANCE_TARGETS.find(
      (t) => t.bracketId === seg.bracketId,
    );
    if (!target) continue;

    const idealMid = (target.min + target.max) / 2;
    const excess = seg.pct - idealMid;

    if (idx < halfLen) skew += excess;
    else skew -= excess;
  }

  return Math.max(-50, Math.min(50, skew));
}

/* ── §2  Status helper ───────────────────────────────────── */

function getSegmentStatus(seg: BracketSegment): {
  label: string;
  level: "balanced" | "attention" | "imbalanced";
} {
  if (seg.inTarget) return { label: "Balanceado", level: "balanced" };
  if (seg.pct < seg.targetMin * 0.5 || seg.pct > seg.targetMax * 1.5)
    return { label: "Desbalanceado", level: "imbalanced" };
  return { label: "Atención", level: "attention" };
}

/* ── §3  Component ────────────────────────────────────────── */

/**
 * AgeGroupDistributionPanel — "The Generational Canvas"
 *
 * Renders 7-bracket demographic distribution with:
 * - Metronome balance indicator
 * - Stacked spectrum bar
 * - Individual bracket bars with target zones
 * - Gap bridges between adjacent brackets
 * - Family participation footer
 */
export function AgeGroupDistributionPanel({
  ageDistribution,
  familyParticipationRate,
  cohortHealth,
  ripples,
  agingOutRisks,
}: AgeGroupDistributionPanelProps) {
  /* ── Map distribution → bracket segments ── */
  const segments = useMemo((): BracketSegment[] => {
    const totalMembers = ageDistribution.reduce(
      (s, e) => s + (e.count ?? 0),
      0,
    );

    return AGE_BRACKETS.map((bracket, idx) => {
      const entries = ageDistribution.filter(
        (d) => resolveBracketId(d.age_range) === bracket.id,
      );
      const count = entries.reduce((s, e) => s + (e.count ?? 0), 0);
      const pct = totalMembers > 0 ? (count / totalMembers) * 100 : 0;

      const target = AGE_BALANCE_TARGETS.find(
        (t) => t.bracketId === bracket.id,
      );
      const identity = COHORT_IDENTITIES.find(
        (c) => c.bracketId === bracket.id,
      );
      const health = cohortHealth.find(
        (c) => c.bracketId === bracket.id,
      );
      const rippleActive = ripples.some(
        (r) => r.source === bracket.id,
      );
      const agingOut = agingOutRisks.find(
        (r) => r.bracketId === bracket.id,
      );

      return {
        bracketId: bracket.id,
        label: bracket.label,
        color: identity?.color ?? bracket.color,
        gradient: identity?.gradient ?? bracket.gradient,
        bgPattern: identity?.bgPattern ?? "dots",
        count,
        pct,
        targetMin: target?.min ?? 0,
        targetMax: target?.max ?? 100,
        inTarget:
          pct >= (target?.min ?? 0) && pct <= (target?.max ?? 100),
        health,
        rippleActive,
        agingOut,
        staggerIndex: idx,
      };
    });
  }, [ageDistribution, cohortHealth, ripples, agingOutRisks]);

  /* ── Balance (P2) ── */
  const balanceScore = useMemo(
    () => computeResonanceBalance(segments),
    [segments],
  );

  const skew = useMemo(() => computeSkew(segments), [segments]);

  const balanceLevel = useMemo(() => {
    if (balanceScore >= 70) return "healthy";
    if (balanceScore >= 50) return "warning";
    return "critical";
  }, [balanceScore]);

  /* ── Gap Bridges (P4) ── */
  const gaps = useMemo((): GapBridge[] => {
    const result: GapBridge[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i];
      const b = segments[i + 1];
      const diff = Math.abs(a.pct - b.pct);
      if (diff > 15) {
        result.push({
          left: a.bracketId,
          right: b.bracketId,
          severity: Math.min(100, diff * 2),
          leftPct: a.pct,
          rightPct: b.pct,
        });
      }
    }
    return result;
  }, [segments]);

  /* ── Metronome position ── */
  const metronomePos = 50 + skew;

  const totalMembers = ageDistribution.reduce(
    (s, e) => s + (e.count ?? 0),
    0,
  );

  return (
    <div
      className="ag-dist"
      role="region"
      aria-label="Distribución etaria del club"
      data-testid="ag-dist"
    >
      {/* § Header */}
      <div className="ag-dist__header">
        <div className="ag-dist__header-left">
          <Scale size={16} className="ag-dist__header-icon" aria-hidden="true" />
          <h3 className="ag-dist__title">Distribución Etaria</h3>
          <span className="ag-dist__total">{totalMembers} total</span>
        </div>
        <div className="ag-dist__balance" data-level={balanceLevel}>
          <span className="ag-dist__balance-label">Balance:</span>
          <span className="ag-dist__balance-score">{balanceScore}</span>
        </div>
      </div>

      {/* § Metronome Balance (P2) */}
      <div
        className="ag-dist__metronome"
        role="img"
        aria-label={`Balance demográfico: desviación ${skew > 0 ? "joven" : skew < 0 ? "madura" : "equilibrada"}`}
        data-testid="ag-dist-metronome"
      >
        <div className="ag-dist__metronome-track">
          <div className="ag-dist__metronome-zones" aria-hidden="true">
            <div className="ag-dist__metronome-zone" data-zone="danger" />
            <div className="ag-dist__metronome-zone" data-zone="warning" />
            <div className="ag-dist__metronome-zone" data-zone="ideal" />
            <div className="ag-dist__metronome-zone" data-zone="warning" />
            <div className="ag-dist__metronome-zone" data-zone="danger" />
          </div>
          <div
            className="ag-dist__metronome-indicator"
            style={{ left: `${metronomePos}%` }}
            aria-hidden="true"
          >
            <div className="ag-dist__metronome-needle" />
          </div>
        </div>
        <div className="ag-dist__metronome-labels" aria-hidden="true">
          <span>Jóvenes</span>
          <span>Ideal</span>
          <span>Maduros</span>
        </div>
      </div>

      {/* § Stacked Spectrum (P7) */}
      <div
        className="ag-dist__spectrum"
        role="img"
        aria-label="Espectro distribucional"
        data-testid="ag-dist-spectrum"
      >
        {segments.map((seg) => (
          <div
            key={seg.bracketId}
            className="ag-dist__spectrum-seg"
            data-hotspot={seg.health?.hotspot || undefined}
            data-ripple={seg.rippleActive || undefined}
            style={
              {
                "--seg-width": `${Math.max(seg.pct, 1)}%`,
                "--seg-color": seg.color,
                "--seg-grad-start": seg.gradient[0],
                "--seg-grad-end": seg.gradient[1],
                "--stagger-i": seg.staggerIndex,
              } as CSSProperties
            }
            title={`${seg.label}: ${seg.count} (${seg.pct.toFixed(1)}%)`}
          >
            {seg.pct > 5 && (
              <span className="ag-dist__spectrum-pct">
                {seg.pct.toFixed(0)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* § Individual Bracket Bars (P1, P3, P5, P6) */}
      <div
        className="ag-dist__bars"
        role="list"
        aria-label="Grupos etarios con detalle"
        data-testid="ag-dist-bars"
      >
        {segments.map((seg) => {
          const status = getSegmentStatus(seg);

          return (
            <div
              key={seg.bracketId}
              className="ag-dist__bar"
              role="listitem"
              aria-label={`${seg.label}: ${seg.count} miembros, ${seg.pct.toFixed(1)}%, ${status.label}`}
              data-hotspot={seg.health?.hotspot || undefined}
              data-ripple={seg.rippleActive || undefined}
              data-status={status.level}
              style={
                {
                  "--bar-color": seg.color,
                  "--bar-grad-start": seg.gradient[0],
                  "--bar-grad-end": seg.gradient[1],
                  "--stagger-i": seg.staggerIndex,
                } as CSSProperties
              }
            >
              {/* Label row */}
              <div className="ag-dist__bar-label-row">
                <span className="ag-dist__bar-name">{seg.label}</span>
                <div className="ag-dist__bar-meta">
                  <span className="ag-dist__bar-count">{seg.count}</span>
                  <span className="ag-dist__bar-pct">
                    ({seg.pct.toFixed(1)}%)
                  </span>
                  <span className="ag-dist__bar-status-dot" aria-hidden="true" />
                </div>
              </div>

              {/* Bar track with target zone (P6) */}
              <div
                className="ag-dist__bar-track"
                role="progressbar"
                aria-valuenow={Math.round(seg.pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${seg.label}: ${seg.pct.toFixed(1)}%`}
              >
                {/* Target zone */}
                <div
                  className="ag-dist__bar-target-zone"
                  style={
                    {
                      "--tz-left": `${seg.targetMin}%`,
                      "--tz-width": `${seg.targetMax - seg.targetMin}%`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
                {/* Fill */}
                <div
                  className="ag-dist__bar-fill"
                  style={{ width: `${Math.min(100, seg.pct)}%` }}
                >
                  {/* bgPattern overlay (P9) */}
                  <div
                    className="ag-dist__bar-pattern"
                    data-pattern={seg.bgPattern}
                    aria-hidden="true"
                  />
                  {/* Ripple flash (P3) */}
                  {seg.rippleActive && (
                    <div className="ag-dist__bar-ripple-flash" aria-hidden="true" />
                  )}
                </div>
                {/* Aging-out badge (P3) */}
                {seg.agingOut && (
                  <div
                    className="ag-dist__bar-aging-badge"
                    data-urgency={seg.agingOut.urgency}
                    aria-label={`Aging-out: ~${seg.agingOut.avgYearsRemaining.toFixed(1)} años, urgencia ${seg.agingOut.urgency}`}
                  >
                    ~{seg.agingOut.avgYearsRemaining.toFixed(1)}a
                  </div>
                )}
              </div>

              {/* Target + Status footer */}
              <div className="ag-dist__bar-footer">
                <span className="ag-dist__bar-target-text">
                  Target: {seg.targetMin}-{seg.targetMax}%
                </span>
                <span className="ag-dist__bar-status-text">
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* § Gap Bridges (P4) */}
      {gaps.length > 0 && (
        <div
          className="ag-dist__gaps"
          role="list"
          aria-label="Grietas generacionales"
          data-testid="ag-dist-gaps"
        >
          {gaps.map((gap) => {
            const leftBracket = AGE_BRACKETS.find(
              (b) => b.id === gap.left,
            );
            const rightBracket = AGE_BRACKETS.find(
              (b) => b.id === gap.right,
            );
            return (
              <div
                key={`${gap.left}-${gap.right}`}
                className="ag-dist__gap"
                role="listitem"
                aria-label={`Grieta entre ${leftBracket?.label} y ${rightBracket?.label}`}
                style={
                  { "--gap-severity": `${gap.severity}%` } as CSSProperties
                }
              >
                <div className="ag-dist__gap-visual" aria-hidden="true">
                  <div className="ag-dist__gap-rift" />
                  <div className="ag-dist__gap-bridge" />
                </div>
                <span className="ag-dist__gap-label">
                  Grieta {leftBracket?.label} → {rightBracket?.label}
                  <span className="ag-dist__gap-detail">
                    {" "}
                    ({gap.leftPct.toFixed(0)}% vs {gap.rightPct.toFixed(0)}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* § Family Participation Footer */}
      <div
        className="ag-dist__footer"
        data-testid="ag-dist-footer"
      >
        <span className="ag-dist__footer-label">
          Participación familiar
        </span>
        <span className="ag-dist__footer-value">
          {familyParticipationRate.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}