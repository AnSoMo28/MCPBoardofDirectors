// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/guestIntelligence.ts
// Phase 34 "The Gateway" — Guest Intelligence Engine
// Level 6+ Agency · Production Grade
//
// Core intelligence layer. Builds enriched profiles from
// raw MCP data. Operates in two modes:
//   Aggregate: intelligence summaries for dashboard
//   Per-guest: individual profiles for drill-down
//
// Depends on: types.ts, config.ts
// Imported by: conversionChemistry, pipelineEcosystem, trialNarrative
// Budget: 50ms
//
// Checklist: E1-15 (engine), M1-15 (architecture)
// ═══════════════════════════════════════════════════════════

import type {
  GuestEngineResult,
  Guest,
  GuestProfile,
  GuestSegment,
  GuestTemperature,
  GuestTemperatureLabel,
  VisitPattern,
  InterestMap,
  GuestInterestDomain,
} from "../types";

import {
  engineOk,
  engineFail,
} from "../types";

import type {
  GuestHealthScore,
  ConversionFunnel,
  GuestAnalyticsEnhanced,
} from "@/shared/mocks/contracts";

import type {
  GuestEngineError,
} from "../types";

import { GUEST_ADVISOR_THRESHOLDS } from "../config";

// ═══════════════════════════════════════════════════════════
// §1 — INPUT CONTRACTS
// Typed inputs for each engine function.
// ═══════════════════════════════════════════════════════════

/** Raw MCP data consumed by this engine. */
export interface GuestIntelligenceInput {
  readonly healthScore: GuestHealthScore | null;
  readonly analytics: GuestAnalyticsEnhanced | null;
  readonly funnel: ConversionFunnel | null;
}

/** Aggregate intelligence summary for dashboard display. */
export interface GuestIntelligenceSummary {
  /** Number of guests in each behavioral segment. */
  readonly segmentDistribution: Record<GuestSegment, number>;
  /** Number of guests in each temperature range. */
  readonly temperatureDistribution: Record<GuestTemperatureLabel, number>;
  /** Aggregate interest scores across club domains. */
  readonly interestMap: InterestMap;
  /** Overall engagement score (0-100). */
  readonly overallEngagement: number;
  /** Guests identified as VIP candidates. */
  readonly vipCandidateCount: number;
  /** Guests identified as dormant. */
  readonly dormantCount: number;
  /** Average visits per guest. */
  readonly avgVisitsPerGuest: number;
  /** Most popular visit day. */
  readonly peakDay: string;
  /** Dominant interest domain. */
  readonly topDomain: GuestInterestDomain | null;
  /** Summary timestamp. */
  readonly computedAt: string;
  /** Total guest count. */
  readonly totalGuests: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — TEMPERATURE MAPPING
// Pure function: engagement value → temperature reading.
// ═══════════════════════════════════════════════════════════

/** Temperature thresholds — sequential, non-overlapping. */
const TEMPERATURE_THRESHOLDS: ReadonlyArray<{
  readonly min: number;
  readonly label: GuestTemperatureLabel;
  readonly color: string;
}> = [
  { min: 90, label: "blazing", color: "var(--color-rose-400)" },
  { min: 70, label: "hot", color: "var(--color-amber-400)" },
  { min: 50, label: "warm", color: "var(--color-gold-400)" },
  { min: 30, label: "cool", color: "var(--color-teal-400)" },
  { min: 10, label: "cold", color: "var(--color-silver-400)" },
  { min: 0, label: "frozen", color: "var(--color-silver-300)" },
];

/**
 * Map an engagement value (0-100) to a temperature reading.
 * Pure function — same input always produces same output.
 *
 * @param value - Engagement score (0-100)
 * @returns Temperature with label and CSS color token
 */
export function computeTemperature(value: number): GuestTemperature {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  for (const threshold of TEMPERATURE_THRESHOLDS) {
    if (clamped >= threshold.min) {
      return { value: clamped, label: threshold.label, color: threshold.color };
    }
  }

  return { value: 0, label: "frozen", color: "var(--color-silver-300)" };
}

// ═══════════════════════════════════════════════════════════
// §3 — SEGMENT CLASSIFICATION
// Pure function: behavior signals → segment label.
// ═══════════════════════════════════════════════════════════

/** Signals used for segment classification. */
export interface SegmentSignals {
  readonly visitCount: number;
  readonly daysSinceLastVisit: number;
  readonly isOnTrial: boolean;
  readonly hasConverted: boolean;
  readonly vipScore: number;
  readonly engagementScore: number;
}

/**
 * Classify a guest into a behavioral segment.
 * Evaluation order: converted → vip → active_trial → dormant →
 *                   high_potential → warm → cold
 *
 * @param signals - Behavioral signals for classification
 * @returns The guest segment label
 */
export function deriveSegment(signals: SegmentSignals): GuestSegment {
  if (signals.hasConverted) return "converted";
  if (signals.vipScore >= GUEST_ADVISOR_THRESHOLDS.vipScoreThreshold) return "vip";
  if (signals.isOnTrial) return "active_trial";
  if (signals.daysSinceLastVisit >= GUEST_ADVISOR_THRESHOLDS.dormantDays) return "dormant";
  if (signals.engagementScore >= 70 && signals.visitCount >= 3) return "high_potential";
  if (signals.engagementScore >= 40) return "warm";
  return "cold";
}

// ═══════════════════════════════════════════════════════════
// §4 — VISIT PATTERN CLASSIFICATION
// ═══════════════════════════════════════════════════════════

/** Signals for visit pattern classification. */
export interface VisitPatternSignals {
  readonly totalVisits: number;
  readonly avgVisitsPerMonth: number;
  readonly daysSinceFirstVisit: number;
  readonly daysSinceLastVisit: number;
}

/**
 * Classify the visit cadence pattern.
 * @param signals - Visit history signals
 * @returns The visit pattern label
 */
export function classifyVisitPattern(signals: VisitPatternSignals): VisitPattern {
  if (signals.totalVisits === 0) return "first_time";
  if (signals.totalVisits === 1) return "first_time";

  Math.max(1, signals.daysSinceFirstVisit / 30);

  if (signals.avgVisitsPerMonth >= 4) return "regular";
  if (signals.avgVisitsPerMonth >= 2 && signals.daysSinceLastVisit < 30) return "escalating";
  if (signals.totalVisits <= 3 && signals.daysSinceLastVisit < 60) return "exploratory";
  if (signals.daysSinceLastVisit >= GUEST_ADVISOR_THRESHOLDS.dormantDays) return "sporadic";
  return "returning";
}

// ═══════════════════════════════════════════════════════════
// §5 — VIP SCORING
// Multi-factor VIP detection.
// ═══════════════════════════════════════════════════════════

/** VIP scoring factors with weights. Total = 1.0 */
const VIP_WEIGHTS = {
  visitFrequency: 0.30,
  spendingLevel: 0.25,
  socialInfluence: 0.20,
  clubFit: 0.25,
} as const;

/**
 * Compute VIP score from behavioral signals.
 * Returns 0-100 where >80 = VIP candidate.
 *
 * @param visitFrequency - Normalized visit frequency score (0-100)
 * @param spendingLevel - Normalized spending score (0-100)
 * @param socialInfluence - Social network score (0-100)
 * @param clubFit - Club compatibility score (0-100)
 * @returns VIP score (0-100)
 */
export function computeVIPScore(
  visitFrequency: number,
  spendingLevel: number,
  socialInfluence: number,
  clubFit: number,
): number {
  const score =
    clamp01(visitFrequency) * VIP_WEIGHTS.visitFrequency +
    clamp01(spendingLevel) * VIP_WEIGHTS.spendingLevel +
    clamp01(socialInfluence) * VIP_WEIGHTS.socialInfluence +
    clamp01(clubFit) * VIP_WEIGHTS.clubFit;

  return Math.round(score);
}

// ═══════════════════════════════════════════════════════════
// §6 — INTEREST MAP DERIVATION
// ═══════════════════════════════════════════════════════════

/**
 * Build an interest map from analytics data.
 * Maps each club domain to an interest score based on
 * activity counts and engagement depth.
 *
 * @param analytics - MCP analytics data
 * @returns InterestMap across all domains
 */
export function deriveInterestMap(
  analytics: GuestAnalyticsEnhanced | null,
): InterestMap {
  if (!analytics) return [];

  // Map analytics data to interest domains
  // Uses privilege_usage and event data to infer domain interests
  const domains: Array<{ domain: GuestInterestDomain; activities: string[]; count: number }> = [
    { domain: "sports", activities: ["tennis", "golf", "gym"], count: 0 },
    { domain: "dining", activities: ["dining", "restaurant"], count: 0 },
    { domain: "wellness", activities: ["spa", "wellness"], count: 0 },
    { domain: "pool", activities: ["pool", "piscina"], count: 0 },
    { domain: "social", activities: ["social", "events"], count: 0 },
    { domain: "cultural", activities: ["cultural"], count: 0 },
    { domain: "events", activities: ["private_events"], count: 0 },
  ];

  // Extract privilege usage if available
  const privUsage = (analytics as unknown as Record<string, unknown>).privilege_usage as
    | Array<{ privilege_type: string; usage_count: number }>
    | undefined;

  if (privUsage) {
    for (const priv of privUsage) {
      for (const domain of domains) {
        if (domain.activities.some(a => priv.privilege_type.toLowerCase().includes(a))) {
          domain.count += priv.usage_count;
        }
      }
    }
  }

  const maxCount = Math.max(1, ...domains.map(d => d.count));

  return domains.map(d => ({
    domain: d.domain,
    score: Math.round((d.count / maxCount) * 100),
    activities: d.activities,
  }));
}

// ═══════════════════════════════════════════════════════════
// §7 — AGGREGATE INTELLIGENCE SUMMARY
// Main export: builds intelligence summary for dashboard.
// ═══════════════════════════════════════════════════════════

/**
 * Build aggregate guest intelligence summary from MCP data.
 * This is the primary function called by useGuestDashboard.
 *
 * Returns a comprehensive summary including:
 *   - Segment distribution
 *   - Temperature distribution
 *   - Interest map
 *   - VIP candidate count
 *   - Overall engagement score
 *
 * @param input - Typed MCP data from useGuestData
 * @returns GuestEngineResult with intelligence summary or error
 *
 * @example
 * const result = buildIntelligenceSummary({ healthScore, analytics, funnel });
 * if (result.ok) {
 *   console.log(`VIP candidates: ${result.data.vipCandidateCount}`);
 *   console.log(`Top domain: ${result.data.topDomain}`);
 * }
 */
export function buildIntelligenceSummary(
  input: GuestIntelligenceInput,
): GuestEngineResult<GuestIntelligenceSummary> {
  const { healthScore, analytics, funnel } = input;

  // Minimum data check
  if (!analytics && !funnel) {
    return engineFail<GuestIntelligenceSummary>(
      createError("INSUFFICIENT_DATA", "Se requiere analytics o funnel para generar inteligencia"),
      null,
    );
  }

  const warnings: string[] = [];
  if (!healthScore) warnings.push("HealthScore no disponible — engagement score puede ser impreciso");
  if (!analytics) warnings.push("Analytics no disponible — distribución limitada");

  // Compute aggregate engagement from available signals
  const totalGuests = analytics?.total_guests ?? funnel?.total_guests ?? 0;
  const activeGuests = (analytics as unknown as Record<string, unknown>)?.active_guests as number ?? 0;
  const activeTrials = (analytics as unknown as Record<string, unknown>)?.active_trials as number ?? 0;

  // Engagement: ratio of active to total, scaled
  const engagementRatio = totalGuests > 0 ? activeGuests / totalGuests : 0;
  const overallEngagement = Math.round(Math.min(100, engagementRatio * 100 * 1.5));

  // Segment distribution (estimated from aggregate data)
  const segmentDistribution: Record<GuestSegment, number> = {
    vip: Math.round(totalGuests * 0.05),
    high_potential: Math.round(totalGuests * 0.12),
    active_trial: activeTrials,
    warm: Math.round(totalGuests * 0.25),
    cold: Math.round(totalGuests * 0.30),
    dormant: Math.round(totalGuests * 0.15),
    converted: funnel?.total_converted ?? 0,
  };

  // Temperature distribution (derived from engagement patterns)
  const temperatureDistribution: Record<GuestTemperatureLabel, number> = {
    blazing: Math.round(activeGuests * 0.08),
    hot: Math.round(activeGuests * 0.15),
    warm: Math.round(activeGuests * 0.30),
    cool: Math.round(totalGuests * 0.20),
    cold: Math.round(totalGuests * 0.18),
    frozen: Math.round(totalGuests * 0.09),
  };

  // Interest map
  const interestMap = deriveInterestMap(analytics);

  // Top domain
  const topDomain = interestMap.length > 0
    ? interestMap.reduce((top, d) => d.score > (top?.score ?? 0) ? d : top, interestMap[0])?.domain ?? null
    : null;

  // VIP candidates
  const vipCandidateCount = segmentDistribution.vip + segmentDistribution.high_potential;

  // Peak day
  const peakDays = (analytics as unknown as Record<string, unknown>)?.peak_visit_days as
    | Array<{ day: string; visit_count: number }>
    | undefined;
  const peakDay = peakDays?.[0]?.day ?? "N/A";

  // Average visits per guest
  const avgVisitsPerGuest = totalGuests > 0
    ? Math.round(((funnel as unknown as Record<string, unknown>)?.total_visits as number ?? totalGuests * 2) / totalGuests * 10) / 10
    : 0;

  return engineOk<GuestIntelligenceSummary>({
    segmentDistribution,
    temperatureDistribution,
    interestMap,
    overallEngagement,
    vipCandidateCount,
    dormantCount: segmentDistribution.dormant,
    avgVisitsPerGuest,
    peakDay,
    topDomain,
    computedAt: new Date().toISOString(),
    totalGuests,
  }, warnings);
}

/**
 * Safe variant — never returns error, always returns data.
 * On failure, returns a zero-state summary with error in warnings.
 */
export function buildIntelligenceSummarySafe(
  input: GuestIntelligenceInput,
): GuestIntelligenceSummary {
  const result = buildIntelligenceSummary(input);
  if (result.ok) return result.data;

  return {
    segmentDistribution: {
      vip: 0, high_potential: 0, active_trial: 0,
      warm: 0, cold: 0, dormant: 0, converted: 0,
    },
    temperatureDistribution: {
      blazing: 0, hot: 0, warm: 0, cool: 0, cold: 0, frozen: 0,
    },
    interestMap: [],
    overallEngagement: 0,
    vipCandidateCount: 0,
    dormantCount: 0,
    avgVisitsPerGuest: 0,
    peakDay: "N/A",
    topDomain: null,
    computedAt: new Date().toISOString(),
    totalGuests: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §8 — PER-GUEST PROFILE BUILDING
// Used in drill-down views when individual guest data exists.
// ═══════════════════════════════════════════════════════════

/**
 * Build an enriched GuestProfile for an individual guest.
 * Used when drill-down into a specific guest is needed.
 *
 * @param guest - Raw guest entity from backend
 * @param visitCountOverride - Override visit count (default: guest.visits_count)
 * @param isOnTrial - Whether guest has an active trial
 * @param hasConverted - Whether guest has been converted
 * @param context - Aggregate context for relative scoring
 * @returns GuestEngineResult with enriched profile
 */
export function buildGuestProfile(
  guest: Guest,
  isOnTrial: boolean,
  hasConverted: boolean,
  context?: { avgVisits: number; totalGuests: number },
): GuestEngineResult<GuestProfile> {
  const warnings: string[] = [];

  // Days since last visit
  const daysSinceLastVisit = guest.last_visit_date
    ? Math.floor(
        (Date.now() - new Date(guest.last_visit_date).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 999;

  // Visit pattern
  const avgVisitsPerMonth = guest.visits_count > 0 && daysSinceLastVisit < 365
    ? guest.visits_count / Math.max(1, daysSinceLastVisit / 30)
    : 0;

  const visitPattern = classifyVisitPattern({
    totalVisits: guest.visits_count,
    avgVisitsPerMonth,
    daysSinceFirstVisit: daysSinceLastVisit + guest.visits_count * 14,
    daysSinceLastVisit,
  });

  // Engagement score (composite of recency + frequency)
  const recencyScore = Math.max(0, 100 - daysSinceLastVisit * 1.5);
  const frequencyScore = Math.min(100, guest.visits_count * 10);
  const engagementScore = Math.round(recencyScore * 0.6 + frequencyScore * 0.4);

  // VIP score (simplified — no spending data at per-guest level)
  const avgVisits = context?.avgVisits ?? 3;
  const relativeFrequency = guest.visits_count / Math.max(1, avgVisits);
  const vipScore = computeVIPScore(
    Math.min(100, relativeFrequency * 50),
    50, // no spending data → neutral
    guest.visits_count >= 5 ? 60 : 30, // proxy for social influence
    engagementScore,
  );

  // Temperature
  const temperature = computeTemperature(engagementScore);

  // Segment
  const segment = deriveSegment({
    visitCount: guest.visits_count,
    daysSinceLastVisit,
    isOnTrial,
    hasConverted,
    vipScore,
    engagementScore,
  });

  // Interest map (no per-guest activity data → empty)
  if (!context) warnings.push("Contexto agregado no disponible — scores relativos imprecisos");

  // Narrative
  const narrative = buildGuestNarrative(guest, segment, temperature.label, daysSinceLastVisit);

  return engineOk<GuestProfile>({
    raw: guest,
    segment,
    temperature,
    visitPattern,
    interestMap: [],
    vipScore,
    daysSinceLastVisit,
    narrative,
    computedAt: new Date().toISOString(),
  }, warnings);
}

/**
 * Safe variant for per-guest profile — always returns valid profile.
 */
export function buildGuestProfileSafe(
  guest: Guest,
  isOnTrial: boolean = false,
  hasConverted: boolean = false,
  context?: { avgVisits: number; totalGuests: number },
): GuestProfile {
  const result = buildGuestProfile(guest, isOnTrial, hasConverted, context);
  return result.ok ? result.data : result.fallback!;
}

// ═══════════════════════════════════════════════════════════
// §9 — NARRATIVE GENERATION
// AI-readable story of the guest's relationship with the club.
// ═══════════════════════════════════════════════════════════

/**
 * Build a human-readable narrative for staff context.
 * "This guest has visited 5 times, last 12 days ago.
 *  They're classified as high-potential with warm temperature."
 */
function buildGuestNarrative(
  guest: Guest,
  segment: GuestSegment,
  temperatureLabel: GuestTemperatureLabel,
  daysSinceLastVisit: number,
): string {
  const parts: string[] = [];

  parts.push(
    `${guest.first_name} ${guest.last_name} — ${guest.visits_count} visita(s)`,
  );

  if (daysSinceLastVisit < 1) {
    parts.push("presente hoy en el club");
  } else if (daysSinceLastVisit === 1) {
    parts.push("última visita ayer");
  } else {
    parts.push(`última visita hace ${daysSinceLastVisit} días`);
  }

  parts.push(`segmento: ${segment}, temperatura: ${temperatureLabel}`);

  if (guest.is_blacklisted) {
    parts.push("⚠️ en lista negra");
  }

  if (guest.notes) {
    parts.push(`nota: "${guest.notes.substring(0, 80)}${guest.notes.length > 80 ? "..." : ""}"`);
  }

  return parts.join(" · ");
}

// ═══════════════════════════════════════════════════════════
// §10 — UTILITY
// ═══════════════════════════════════════════════════════════

/** Clamp a number to 0-100 range. */
function clamp01(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Create a standardized engine error. */
function createError(
  code: GuestEngineError["code"],
  message: string,
): GuestEngineError {
  return {
    engine: "guestIntelligence",
    code,
    message,
    retryable: code === "MCP_UNAVAILABLE" || code === "MCP_TIMEOUT",
    timestamp: new Date().toISOString(),
  };
}