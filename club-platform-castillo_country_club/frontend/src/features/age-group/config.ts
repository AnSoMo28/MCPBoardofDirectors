// ═══════════════════════════════════════════════════════════
// src/features/age-group/config.ts
// Phase 34+ Migration — Age Group Config Maps & Utilities
// Level 6+ Agency · Production Grade
//
// Feature configuration: bracket definitions, thresholds,
// affinity matrix, seasonality, risk/growth configs,
// cohort identities, balance targets, and utility functions.
//
// Types → types.ts · Barrel → index.ts
//
// PRE-WRITE VERIFICATION:
//   All types imported from ./types ✅
//   All data values match original types.ts v36 ✅
//
// ANTI-PATTERNS REMOVED:
//   - Config data mixed with types → isolated here
//   - Utility functions mixed with types → isolated here
// ═══════════════════════════════════════════════════════════

import type {
  AgeBracketId,
  AgeBracket,
  AgeGroupLayer,
  RetentionRisk,
  HealthThreshold,
  ActivityAffinity,
  EngagementTier,
  SeasonalityEntry,
  AgeRiskLevel,
  GrowthIndicator,
  CohortIdentity,
  BalanceTarget,
} from "./types";

/* ────────────────────────────────────────
   §1  Layer Config
   ──────────────────────────────────────── */

export const AGE_GROUP_LAYER_LABELS: Record<AgeGroupLayer, string> = {
  balance:       "Balance",
  participation: "Participación",
  growth:        "Crecimiento",
  cross_domain:  "Cross-domain",
  engagement:    "Engagement",
  social:        "Social",
  financial:     "Financiero",
};

export const AGE_GROUP_LAYER_META: Record<
  AgeGroupLayer,
  { icon: string; color: string }
> = {
  balance:       { icon: "scale",       color: "#8b5cf6" },
  participation: { icon: "users",       color: "#3b82f6" },
  growth:        { icon: "trending-up", color: "#22c55e" },
  cross_domain:  { icon: "link",        color: "#e8c547" },
  engagement:    { icon: "activity",    color: "#f59e0b" },
  social:        { icon: "share-2",     color: "#ec4899" },
  financial:     { icon: "dollar-sign", color: "#14b8a6" },
};

/* ────────────────────────────────────────
   §2  Age Brackets
   ──────────────────────────────────────── */

export const AGE_BRACKETS: AgeBracket[] = [
  {
    id: "infant",
    label: "Infantes",
    range: [0, 5],
    icon: "baby",
    color: "#f472b6",
    gradient: ["#f9a8d4", "#ec4899"],
    resonance: 40,
    personality: "familiares, exploradores, tiempo de calidad",
  },
  {
    id: "child",
    label: "Niños",
    range: [6, 12],
    icon: "puzzle",
    color: "#fb923c",
    gradient: ["#fdba74", "#ea580c"],
    resonance: 55,
    personality: "activos, sociales, programas deportivos",
  },
  {
    id: "youth",
    label: "Adolescentes",
    range: [13, 17],
    icon: "zap",
    color: "#facc15",
    gradient: ["#fef08a", "#ca8a04"],
    resonance: 50,
    personality: "digitales, independientes, actividades grupales",
  },
  {
    id: "young_pro",
    label: "Jóvenes Profesionales",
    range: [18, 29],
    icon: "flame",
    color: "#4ade80",
    gradient: ["#bbf7d0", "#16a34a"],
    resonance: 80,
    personality: "networking, fitness, eventos sociales",
  },
  {
    id: "active",
    label: "Profesionales Activos",
    range: [30, 45],
    icon: "target",
    color: "#60a5fa",
    gradient: ["#bfdbfe", "#2563eb"],
    resonance: 95,
    personality: "leadership, familia, alto engagement, spend dominante",
  },
  {
    id: "mature",
    label: "Consolidados",
    range: [46, 60],
    icon: "trees",
    color: "#a78bfa",
    gradient: ["#ddd6fe", "#7c3aed"],
    resonance: 70,
    personality: "golf, gastronomía, eventos culturales",
  },
  {
    id: "senior",
    label: "Senior",
    range: [61, 120],
    icon: "heart-pulse",
    color: "#94a3b8",
    gradient: ["#cbd5e1", "#475569"],
    resonance: 45,
    personality: "tradición, bienestar, programas de salud",
  },
];

/* ────────────────────────────────────────
   §3  Health Thresholds
   ──────────────────────────────────────── */

export const AGE_HEALTH_THRESHOLDS: HealthThreshold[] = [
  { range: [0, 25],   level: "critical", label: "Crítico",    color: "#ef4444" },
  { range: [26, 50],  level: "warning",  label: "En riesgo",  color: "#f59e0b" },
  { range: [51, 75],  level: "healthy",  label: "Saludable",  color: "#22c55e" },
  { range: [76, 100], level: "optimal",  label: "Óptimo",     color: "#3b82f6" },
];

/* ────────────────────────────────────────
   §4  Activity Affinity Matrix
   ──────────────────────────────────────── */

export const AGE_ACTIVITY_MATRIX: ActivityAffinity[] = [
  { activity: "Piscina",             icon: "waves",          scores: { infant: 95, child: 90, youth: 70, young_pro: 60, active: 65, mature: 40, senior: 30 } },
  { activity: "Golf",                icon: "flag",           scores: { infant: 0,  child: 10, youth: 20, young_pro: 40, active: 65, mature: 90, senior: 85 } },
  { activity: "Tenis",               icon: "circle-dot",     scores: { infant: 0,  child: 40, youth: 65, young_pro: 80, active: 75, mature: 55, senior: 25 } },
  { activity: "Gimnasio",            icon: "dumbbell",       scores: { infant: 0,  child: 5,  youth: 40, young_pro: 95, active: 85, mature: 50, senior: 30 } },
  { activity: "Yoga",                icon: "flower-2",       scores: { infant: 0,  child: 5,  youth: 15, young_pro: 70, active: 60, mature: 55, senior: 45 } },
  { activity: "Eventos Sociales",    icon: "party-popper",   scores: { infant: 20, child: 30, youth: 45, young_pro: 90, active: 80, mature: 70, senior: 50 } },
  { activity: "Gastronomía",         icon: "utensils",       scores: { infant: 30, child: 40, youth: 35, young_pro: 65, active: 75, mature: 90, senior: 80 } },
  { activity: "Programas Juveniles", icon: "graduation-cap", scores: { infant: 80, child: 95, youth: 85, young_pro: 10, active: 0,  mature: 0,  senior: 0 } },
];

/* ────────────────────────────────────────
   §5  Engagement Tiers
   ──────────────────────────────────────── */

export const AGE_ENGAGEMENT_TIERS: EngagementTier[] = [
  { range: [0, 20],   tier: "dormant",  label: "Dormido",      color: "#6b7280" },
  { range: [21, 40],  tier: "passive",  label: "Pasivo",       color: "#f59e0b" },
  { range: [41, 60],  tier: "active",   label: "Activo",       color: "#3b82f6" },
  { range: [61, 80],  tier: "engaged",  label: "Comprometido", color: "#22c55e" },
  { range: [81, 100], tier: "champion", label: "Champion",     color: "#e8c547" },
];

/* ────────────────────────────────────────
   §6  Cohort Seasonality
   ──────────────────────────────────────── */

export const COHORT_SEASONALITY: Record<AgeBracketId, SeasonalityEntry> = {
  infant:    { peakMonths: [1, 7, 12],              label: "Vacaciones escolares" },
  child:     { peakMonths: [1, 4, 7, 12],           label: "Vacaciones + Semana Santa" },
  youth:     { peakMonths: [1, 6, 7, 12],           label: "Vacaciones largas" },
  young_pro: { peakMonths: [3, 6, 7, 11, 12],       label: "Temporada social" },
  active:    { peakMonths: [4, 10, 11],              label: "Corporate + cierre de año" },
  mature:    { peakMonths: [1, 2, 5, 8, 11],        label: "Golf + gastronomía" },
  senior:    { peakMonths: [1, 2, 3, 8, 9, 10, 11], label: "Year-round, pico invernal" },
};

/* ────────────────────────────────────────
   §7  Risk Config
   ──────────────────────────────────────── */

export const AGE_RISK_CONFIG: AgeRiskLevel[] = [
  { level: "low",      label: "Bajo",    color: "#22c55e", icon: "shield-check" },
  { level: "medium",   label: "Medio",   color: "#f59e0b", icon: "shield-alert" },
  { level: "high",     label: "Alto",    color: "#ef4444", icon: "shield-x" },
  { level: "critical", label: "Crítico", color: "#dc2626", icon: "circle-alert" },
];

/* ────────────────────────────────────────
   §8  Growth Indicators
   ──────────────────────────────────────── */

export const AGE_GROWTH_CONFIG: GrowthIndicator[] = [
  { direction: "declining", label: "En descenso",    color: "#ef4444", icon: "trending-down", threshold: -5 },
  { direction: "stable",    label: "Estable",        color: "#6b7280", icon: "minus",         threshold: 0 },
  { direction: "growing",   label: "En crecimiento", color: "#22c55e", icon: "trending-up",   threshold: 5 },
  { direction: "surging",   label: "En auge",        color: "#e8c547", icon: "rocket",        threshold: 15 },
];

/* ────────────────────────────────────────
   §9  Cohort Identities
   ──────────────────────────────────────── */

export const COHORT_IDENTITIES: CohortIdentity[] = [
  { bracketId: "infant",    icon: "baby",        color: "#f472b6", gradient: ["#f9a8d4", "#ec4899"], bgPattern: "dots",  energyAnimation: "breathe", energySpeed: 3 },
  { bracketId: "child",     icon: "puzzle",      color: "#fb923c", gradient: ["#fdba74", "#ea580c"], bgPattern: "waves", energyAnimation: "expand",  energySpeed: 2.5 },
  { bracketId: "youth",     icon: "zap",         color: "#facc15", gradient: ["#fef08a", "#ca8a04"], bgPattern: "pulse", energyAnimation: "expand",  energySpeed: 1.8 },
  { bracketId: "young_pro", icon: "flame",       color: "#4ade80", gradient: ["#bbf7d0", "#16a34a"], bgPattern: "rings", energyAnimation: "expand",  energySpeed: 2 },
  { bracketId: "active",    icon: "target",      color: "#60a5fa", gradient: ["#bfdbfe", "#2563eb"], bgPattern: "lines", energyAnimation: "breathe", energySpeed: 4 },
  { bracketId: "mature",    icon: "trees",       color: "#a78bfa", gradient: ["#ddd6fe", "#7c3aed"], bgPattern: "rings", energyAnimation: "breathe", energySpeed: 5 },
  { bracketId: "senior",    icon: "heart-pulse", color: "#94a3b8", gradient: ["#cbd5e1", "#475569"], bgPattern: "dots",  energyAnimation: "static",  energySpeed: 0 },
];

/* ────────────────────────────────────────
   §10  Balance Targets
   ──────────────────────────────────────── */

export const AGE_BALANCE_TARGETS: BalanceTarget[] = [
  { bracketId: "infant",    min: 2,  max: 8 },
  { bracketId: "child",     min: 8,  max: 18 },
  { bracketId: "youth",     min: 5,  max: 15 },
  { bracketId: "young_pro", min: 10, max: 25 },
  { bracketId: "active",    min: 20, max: 35 },
  { bracketId: "mature",    min: 10, max: 22 },
  { bracketId: "senior",    min: 5,  max: 18 },
];

/* ────────────────────────────────────────
   §11  Utility Functions
   ──────────────────────────────────────── */

/** Resolve a numeric age to its bracket definition. */
export function getAgeBracket(age: number): AgeBracket | undefined {
  return AGE_BRACKETS.find((b) => age >= b.range[0] && age <= b.range[1]);
}

/** Resolve a health score to its threshold definition. */
export function getHealthThreshold(score: number): HealthThreshold | undefined {
  return AGE_HEALTH_THRESHOLDS.find(
    (t) => score >= t.range[0] && score <= t.range[1],
  );
}

/** Resolve a growth rate to its indicator (highest matching threshold). */
export function getGrowthIndicator(rate: number): GrowthIndicator {
  const sorted = [...AGE_GROWTH_CONFIG].sort(
    (a, b) => b.threshold - a.threshold,
  );
  return sorted.find((g) => rate >= g.threshold) ?? sorted[sorted.length - 1];
}

/** Resolve an engagement score to its tier definition. */
export function getEngagementTier(score: number): EngagementTier | undefined {
  return AGE_ENGAGEMENT_TIERS.find(
    (t) => score >= t.range[0] && score <= t.range[1],
  );
}

/** Resolve a retention risk level to its config. */
export function getRiskConfig(level: RetentionRisk): AgeRiskLevel | undefined {
  return AGE_RISK_CONFIG.find((r) => r.level === level);
}

/** Resolve a bracket ID to its cohort identity. */
export function getCohortIdentity(
  bracketId: AgeBracketId,
): CohortIdentity | undefined {
  return COHORT_IDENTITIES.find((c) => c.bracketId === bracketId);
}

/**
 * Resolve an age_range string (from API data) to an AgeBracketId.
 * Handles: label match, ID match, and "NN-NN" range parse.
 */
export function resolveBracketId(ageRange: string): AgeBracketId | undefined {
  const byLabel = AGE_BRACKETS.find(
    (b) =>
      b.label.toLowerCase() === ageRange.toLowerCase() ||
      b.id === ageRange,
  );
  if (byLabel) return byLabel.id;

  const rangeMatch = ageRange.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    const mid = (Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2;
    return getAgeBracket(mid)?.id;
  }

  return undefined;
}

/**
 * Match a target_age_group string to its full bracket definition.
 * Used for cross-domain color rendering in proposals.
 * Delegates to resolveBracketId then returns the full AgeBracket.
 */
export function matchBracket(
  targetAgeGroup: string, 
): AgeBracket | undefined {
  const id = resolveBracketId(targetAgeGroup);
  if (!id) return undefined;
  return AGE_BRACKETS.find((b) => b.id === id);
}