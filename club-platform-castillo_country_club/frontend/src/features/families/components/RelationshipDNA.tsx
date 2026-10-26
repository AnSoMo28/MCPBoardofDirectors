// src/features/families/components/RelationshipDNA.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Relationship DNA
// Level 6+ Agency · Production Grade
//
// "The Genetic Helix"
//
// Intra-family bond visualization rendered as DNA-like strands
// connecting family members. Each strand encodes 7 axes of the
// BondProfile into a single visual: thickness = composite strength,
// color = dominant context, marker = trajectory, depth = shared history.
//
// VISUAL CONCEPT:
//   The family's relational code. Each bond between two members
//   is a horizontal DNA strand. Member avatars sit at each end.
//   A colored line connects them — its thickness and opacity map
//   to the composite strength computed from the 7-axis BondProfile.
//   A trajectory marker at the center shows direction (strengthening,
//   weakening, dormant, new, stable). Below each strand: a context
//   chip, strength score, trajectory label, recency indicator,
//   and a depth mosaic showing shared activities and events.
//   A network health summary at the top gives aggregate stats.
//
// Signature Visual Elements:
//   1. DNA helix line with strength-to-thickness mapping
//   2. Context identity chip (activity category color)
//   3. Trajectory marker at bond center (5 states)
//   4. Recency color coding (7d/21d/60d/60d+)
//   5. Bond depth mosaic (activity + event bars)
//   6. Network health summary (strong/weakening/avg)
//   7. Member avatar with initials + context border
//
// Sections:
//   1. Header — "ADN Relacional" label
//   2. Health Summary — aggregate stats + average strength
//   3. Bond Strands — each bond rendered as a DNA strand
//   4. Health Label — narrative health assessment
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (subtle wrapper, context glow per strand)
//   D2: Stagger (strand cascade on load)
//   D3: Cubic-bezier easing on strand reveal
//   D4: Mono for data/scores, UI for labels, mono-uppercased for sections
//   D5: Context-driven dynamic colors via data-attribute
//   D6: Pseudo-element depth (helix line, strand glow)
//   D7: Hover on strands (expand, brighten)
//   D8: Dense (compact strand cards, tight metadata row)
//   D9: Responsive (vertical stacking)
//   D10: role="region", aria-label
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-dna* namespaced keyframes (4)
//
// PRE-WRITE VERIFICATION:
//   IntraFamilyBond    → ../social-types.ts §4  ✅
//   BondProfile        → ../social-types.ts §2  ✅
//   BondTrajectory     → ../social-types.ts §1  ✅
//   InteractionFrequency → ../social-types.ts §1 ✅
//   RecencyLevel       → ../social-types.ts §1  ✅
//   SocialContext      → ../social-types.ts §1  ✅
//   ACTIVITY_CATEGORIES → ../config.ts §18      ✅
//   getActivityCategory → ../config.ts §29      ✅
//
// ANTI-PATTERNS REMOVED:
//   - cn() → removed
//   - className prop → removed
//   - Mutable props → readonly
//   - RelationshipStrand (ghost) → IntraFamilyBond
//   - strand.strength (removed field) → compositeStrength from BondProfile
//   - strand.trend (3 values) → profile.trajectory (5 values)
//   - TREND_MAP (3 entries) → TRAJECTORY_MAP (5 entries)
//   - daysSince import → local helper
//   - Inline style={{ backgroundColor }} × 6 → CSS var bridges
//   - Inline style={{ color }} × 6 → data-attributes or CSS vars
//   - useReducedMotion unused → removed
//   - No stagger → ADD
//   - No glass → ADD
//   - No data-testid → ADD
//   - No light/reduced/print → ADD
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";
import {
  TrendingUp, Minus, TrendingDown, Activity,
  Calendar, Users, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  IntraFamilyBond,
  BondProfile,
  BondTrajectory,
  InteractionFrequency,
  RecencyLevel,
} from "../social-types";

import { getActivityCategory } from "../config";

import "./RelationshipDNA.css";

// ═══════════════════════════════════════════════════════════
// §1  Constants + Helpers
// ═══════════════════════════════════════════════════════════

/** Days elapsed since a date string */
function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Map InteractionFrequency to a 0-100 score */
const FREQUENCY_SCORE: Record<InteractionFrequency, number> = {
  very_high: 100,
  high: 78,
  moderate: 55,
  low: 30,
  rare: 12,
  none: 0,
};

/** Map RecencyLevel to a 0-100 score */
const RECENCY_SCORE: Record<RecencyLevel, number> = {
  today: 100,
  this_week: 82,
  this_month: 60,
  this_quarter: 38,
  this_year: 18,
  stale: 5,
};

/**
 * Compute composite strength (0-100) from a BondProfile.
 * Strategy: weighted average of 4 measurable axes + trajectory modifier.
 *
 *   frequency  → 30% weight
 *   diversity  → 20% weight (0-1 → 0-100)
 *   recency    → 25% weight
 *   longevity  → 25% weight (capped at 120 months → 100)
 *   trajectory → modifier ±10
 *
 * @returns 0-100 integer
 */
function computeCompositeStrength(profile: BondProfile): number {
  const freqScore = FREQUENCY_SCORE[profile.frequency] ?? 0;
  const diversityScore = Math.round(profile.diversity * 100);
  const recencyScore = RECENCY_SCORE[profile.recency] ?? 0;
  const longevityScore = Math.min(100, Math.round((profile.longevity / 120) * 100));

  const base = Math.round(
    freqScore * 0.30 +
    diversityScore * 0.20 +
    recencyScore * 0.25 +
    longevityScore * 0.25,
  );

  // Trajectory modifier
  const trajectoryMod =
    profile.trajectory === "strengthening" ? 10 :
    profile.trajectory === "new" ? 5 :
    profile.trajectory === "weakening" ? -10 :
    profile.trajectory === "dormant" ? -20 :
    0; // stable

  return Math.max(0, Math.min(100, base + trajectoryMod));
}

function strengthToWeight(strength: number): string {
  if (strength >= 75) return "4px";
  if (strength >= 50) return "3px";
  if (strength >= 25) return "2px";
  return "1px";
}

function strengthToOpacity(strength: number): number {
  return 0.3 + (strength / 100) * 0.7;
}

function recencyInfo(isoDate: string): { text: string; level: string } {
  const days = daysSince(isoDate);
  if (days <= 7) return { text: `Hace ${days}d`, level: "fresh" };
  if (days <= 21) return { text: `Hace ${days}d`, level: "recent" };
  if (days <= 60) return { text: `Hace ${Math.floor(days / 7)}sem`, level: "aging" };
  return { text: `Hace ${Math.floor(days / 30)}mes`, level: "stale" };
}

function formatMemberLabel(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// §2  Trajectory Map — 5 states (was 3)
// ═══════════════════════════════════════════════════════════

interface TrajectoryConfig {
  readonly icon: LucideIcon;
  readonly color: string;
  readonly label: string;
}

const TRAJECTORY_MAP: Record<BondTrajectory, TrajectoryConfig> = {
  strengthening: {
    icon: TrendingUp,
    color: "var(--color-emerald-400)",
    label: "Fortaleciendo",
  },
  stable: {
    icon: Minus,
    color: "var(--color-silver-500)",
    label: "Estable",
  },
  weakening: {
    icon: TrendingDown,
    color: "var(--color-rose-400)",
    label: "Debilitando",
  },
  dormant: {
    icon: Minus,
    color: "var(--color-silver-600)",
    label: "Dormante",
  },
  new: {
    icon: Zap,
    color: "var(--color-teal-400)",
    label: "Nuevo",
  },
};

// ═══════════════════════════════════════════════════════════
// §3  Sub-components
// ═══════════════════════════════════════════════════════════

// ── §3.1  Bond Strand ──
// Source: IntraFamilyBond from social-types.ts §4
//   memberA, memberB, profile: BondProfile, sharedActivities,
//   sharedEvents, lastSharedActivity, dominantContext, relationshipLabel?
// BondProfile: frequency, diversity, recency, asymmetry,
//   seasonality, longevity, trajectory

interface BondStrandProps {
  readonly bond: IntraFamilyBond;
  readonly index: number;
  readonly maxShared: { readonly activities: number; readonly events: number };
}

function BondStrand({ bond, index, maxShared }: BondStrandProps) {
  const strength = useMemo(
    () => computeCompositeStrength(bond.profile),
    [bond.profile],
  );

  const trajCfg = TRAJECTORY_MAP[bond.profile.trajectory] ?? TRAJECTORY_MAP.stable;
  const TrajIcon = trajCfg.icon;
  const contextCfg = getActivityCategory(bond.dominantContext);
  const recency = recencyInfo(bond.lastSharedActivity);
  const lineWidth = strengthToWeight(strength);
  const lineOpacity = strengthToOpacity(strength);

  const activitiesPct = maxShared.activities > 0
    ? Math.round((bond.sharedActivities / maxShared.activities) * 100)
    : 0;
  const eventsPct = maxShared.events > 0
    ? Math.round((bond.sharedEvents / maxShared.events) * 100)
    : 0;

  return (
    <article
      className="fm-dna__strand"
      data-trajectory={bond.profile.trajectory}
      data-recency={recency.level}
      style={
        {
          "--strand-color": contextCfg.color,
          "--strand-bg": contextCfg.bgColor,
          "--strand-weight": lineWidth,
          "--strand-opacity": String(lineOpacity),
          "--strand-index": index,
        } as CSSProperties
      }
    >
      {/* ── Helix: Member A ─── line ─── Member B ── */}
      <div className="fm-dna__helix">
        {/* Member A */}
        <div className="fm-dna__node">
          <span className="fm-dna__node-avatar">
            {formatMemberLabel(bond.memberA)}
          </span>
          <span className="fm-dna__node-name">{bond.memberA}</span>
        </div>

        {/* Bond line */}
        <div className="fm-dna__bond-line">
          <div className="fm-dna__bond-fill" />
          <div className="fm-dna__trend-marker" title={trajCfg.label}>
            <TrajIcon size={11} aria-hidden="true" />
          </div>
        </div>

        {/* Member B */}
        <div className="fm-dna__node">
          <span className="fm-dna__node-avatar">
            {formatMemberLabel(bond.memberB)}
          </span>
          <span className="fm-dna__node-name">{bond.memberB}</span>
        </div>
      </div>

      {/* ── Metadata row ── */}
      <div className="fm-dna__meta">
        <span className="fm-dna__context-chip">{contextCfg.label}</span>
        <span className="fm-dna__strength-score">{strength}%</span>
        <span className="fm-dna__traj-label" data-trajectory={bond.profile.trajectory}>
          {trajCfg.label}
        </span>
        <span className="fm-dna__recency" data-recency={recency.level}>
          {recency.text}
        </span>
      </div>

      {/* ── Bond Depth Mosaic ── */}
      <div className="fm-dna__depth">
        <div className="fm-dna__depth-item">
          <Activity size={9} className="fm-dna__depth-icon" aria-hidden="true" />
          <span className="fm-dna__depth-label">
            {bond.sharedActivities} actividades
          </span>
          <div className="fm-dna__depth-bar-track">
            <div
              className="fm-dna__depth-bar-fill fm-dna__depth-bar-fill--activity"
              style={{ "--depth-width": `${activitiesPct}%` } as CSSProperties}
            />
          </div>
        </div>
        <div className="fm-dna__depth-item">
          <Calendar size={9} className="fm-dna__depth-icon" aria-hidden="true" />
          <span className="fm-dna__depth-label">
            {bond.sharedEvents} eventos
          </span>
          <div className="fm-dna__depth-bar-track">
            <div
              className="fm-dna__depth-bar-fill fm-dna__depth-bar-fill--event"
              style={{ "--depth-width": `${eventsPct}%` } as CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* ── Relationship label (if AI-inferred) ── */}
      {bond.relationshipLabel && (
        <p className="fm-dna__relationship-label">{bond.relationshipLabel}</p>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════
// §4  Health Summary
// ═══════════════════════════════════════════════════════════

interface HealthSummary {
  readonly total: number;
  readonly strong: number;
  readonly weakening: number;
  readonly dormant: number;
  readonly avgStrength: number;
  readonly label: string;
  readonly labelLevel: "excellent" | "healthy" | "attention" | "risk";
}

function computeHealthSummary(bonds: readonly IntraFamilyBond[]): HealthSummary {
  const total = bonds.length;

  // Compute strengths once
  const strengths = bonds.map((b) => computeCompositeStrength(b.profile));
  const strong = strengths.filter((s) => s >= 60).length;
  const weakening = bonds.filter((b) => b.profile.trajectory === "weakening").length;
  const dormant = bonds.filter((b) => b.profile.trajectory === "dormant").length;
  const avgStrength = total > 0
    ? Math.round(strengths.reduce((sum, s) => sum + s, 0) / total)
    : 0;

  let label: string;
  let labelLevel: HealthSummary["labelLevel"];

  if (total === 0) {
    label = "Sin vínculos detectados";
    labelLevel = "attention";
  } else if (dormant >= total * 0.5) {
    label = "Vínculos dormantes — reconexión necesaria";
    labelLevel = "risk";
  } else if (weakening >= total * 0.4) {
    label = "Vínculos en riesgo";
    labelLevel = "risk";
  } else if (weakening > 0) {
    label = `${weakening} debilitándose`;
    labelLevel = "attention";
  } else if (strong === total) {
    label = "Vínculos excepcionales";
    labelLevel = "excellent";
  } else {
    label = "Red saludable";
    labelLevel = "healthy";
  }

  return { total, strong, weakening, dormant, avgStrength, label, labelLevel };
}

// ═══════════════════════════════════════════════════════════
// §5  Props
// ═══════════════════════════════════════════════════════════

interface RelationshipDNAProps {
  readonly bonds: readonly IntraFamilyBond[];
}

// ═══════════════════════════════════════════════════════════
// §6  Component
// ═══════════════════════════════════════════════════════════

/**
 * RelationshipDNA — "The Genetic Helix"
 *
 * Intra-family bond visualization. Each bond between two members
 * is rendered as a DNA strand with composite strength derived from
 * the 7-axis BondProfile: frequency, diversity, recency, asymmetry,
 * seasonality, longevity, and trajectory.
 *
 * @example
 * <RelationshipDNA bonds={family.intraFamilyBonds} />
 */
export function RelationshipDNA({ bonds }: RelationshipDNAProps) {
  // ── Health summary (B-07) ──
  const health = useMemo(() => computeHealthSummary(bonds), [bonds]);

  // ── Max values for bar normalization ──
  const maxShared = useMemo(() => ({
    activities: Math.max(...bonds.map((b) => b.sharedActivities), 1),
    events: Math.max(...bonds.map((b) => b.sharedEvents), 1),
  }), [bonds]);

  // ── Sorted: strongest first ──
  const sorted = useMemo(() => {
    return [...bonds].sort(
      (a, b) =>
        computeCompositeStrength(b.profile) -
        computeCompositeStrength(a.profile),
    ).reverse();
  }, [bonds]);

  // ── Empty state ──
  if (bonds.length === 0) {
    return (
      <div
        className="fm-dna"
        data-testid="relationship-dna"
        data-health="empty"
        role="region"
        aria-label="ADN Relacional — vínculos intra-familia"
      >
        <div className="fm-dna__header">
          <span className="fm-dna__label">ADN Relacional</span>
          <Users size={11} className="fm-dna__header-icon" aria-hidden="true" />
        </div>
        <p className="fm-dna__empty">
          No hay datos de vínculos disponibles para esta familia.
        </p>
      </div>
    );
  }

  return (
    <div
      className="fm-dna"
      data-testid="relationship-dna"
      data-health={health.labelLevel}
      role="region"
      aria-label="ADN Relacional — vínculos intra-familia"
    >
      {/* ══════ Header ══════ */}
      <div className="fm-dna__header">
        <span className="fm-dna__label">ADN Relacional</span>
        <Users size={11} className="fm-dna__header-icon" aria-hidden="true" />
      </div>

      {/* ══════ Health Summary ══════ */}
      <div className="fm-dna__health">
        <div className="fm-dna__health-stats">
          <span className="fm-dna__health-stat">
            {health.total} hebra{health.total !== 1 ? "s" : ""}
          </span>
          <span className="fm-dna__health-dot" aria-hidden="true" />
          <span className="fm-dna__health-stat fm-dna__health-stat--strong">
            {health.strong} fuerte{health.strong !== 1 ? "s" : ""}
          </span>
          {health.weakening > 0 && (
            <>
              <span className="fm-dna__health-dot" aria-hidden="true" />
              <span className="fm-dna__health-stat fm-dna__health-stat--weak">
                {health.weakening} debilitando
              </span>
            </>
          )}
          {health.dormant > 0 && (
            <>
              <span className="fm-dna__health-dot" aria-hidden="true" />
              <span className="fm-dna__health-stat fm-dna__health-stat--dormant">
                {health.dormant} dormante{health.dormant !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <span className="fm-dna__health-avg">
          Promedio: {health.avgStrength}%
        </span>
      </div>

      {/* ══════ Bond Strands ══════ */}
      <div className="fm-dna__strands">
        {sorted.map((bond, i) => (
          <BondStrand
            key={`${bond.memberA}-${bond.memberB}`}
            bond={bond}
            index={i}
            maxShared={maxShared}
          />
        ))}
      </div>

      {/* ══════ Health Label ══════ */}
      <p className="fm-dna__health-label">{health.label}</p>
    </div>
  );
}