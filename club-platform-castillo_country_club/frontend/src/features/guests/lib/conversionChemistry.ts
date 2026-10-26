// ═══════════════════════════════════════════════════════════
// src/features/guests/lib/conversionChemistry.ts
// Phase 34 "The Gateway" — Conversion Chemistry Engine
// Level 6+ Agency · Production Grade
//
// Measures compatibility between guest, club, and sponsor.
// Multi-dimensional scoring — not a single number, a vector
// that reveals WHY chemistry exists or doesn't.
//
// Depends on: types.ts, config.ts
// Budget: 40ms
// ═══════════════════════════════════════════════════════════

import type {
  GuestEngineResult,
  GuestId,
  ChemistryScore,
  ChemistryDimensions,
  SponsorMatch,
  SponsorEffectiveness,
  FirstImpressionAnalysis,
  FirstImpressionAxes,
  ConversionPrediction,
  ConversionFactor,
  GuestInterestDomain,
} from "../types";

import {
  engineOk
} from "../types";
import {
  CHEMISTRY_WEIGHTS,
  FIRST_IMPRESSION_WEIGHTS,
  GUEST_ADVISOR_THRESHOLDS,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1 — INPUT CONTRACTS
// ═══════════════════════════════════════════════════════════

/** Signals from a guest for chemistry computation. */
export interface GuestChemistrySignals {
  readonly guestId: GuestId;
  readonly interests: readonly GuestInterestDomain[];
  readonly visitCount: number;
  readonly avgDurationHours: number;
  readonly preferredTime: "morning" | "afternoon" | "evening" | "weekend";
  readonly socialConnections: number;
  readonly feedbackScore: number | null;
}

/** Signals from a potential sponsor for matching. */
export interface SponsorSignals {
  readonly memberId: string;
  readonly memberName: string;
  readonly interests: readonly GuestInterestDomain[];
  readonly availability: "morning" | "afternoon" | "evening" | "weekend" | "flexible";
  readonly pastGuestsSponsored: number;
  readonly pastConversions: number;
  readonly avgGuestSatisfaction: number;
}

/** Club personality profile for chemistry computation. */
export interface ClubPersonality {
  readonly strengths: readonly GuestInterestDomain[];
  readonly atmosphere: "formal" | "relaxed" | "mixed";
  readonly peakHours: "morning" | "afternoon" | "evening" | "weekend";
  readonly avgGuestSatisfaction: number;
}

/** First impression data from a specific visit. */
export interface FirstImpressionInput {
  readonly guestId: GuestId;
  readonly visitId: string;
  /** Minutes until first staff interaction (lower is better). */
  readonly welcomeMinutes: number;
  /** Whether the assigned activity matched guest interests (0-100). */
  readonly activityMatchScore: number;
  /** Social interactions during visit (count). */
  readonly socialInteractionCount: number;
  /** Environmental comfort score from feedback (0-100). */
  readonly environmentScore: number;
  /** Departure feedback score (0-100). */
  readonly departureScore: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — CHEMISTRY COMPUTATION
// ═══════════════════════════════════════════════════════════

/**
 * Compute multi-dimensional chemistry between guest and club.
 * Each dimension is scored 0-100, then weighted into overall.
 *
 * @param guest - Guest behavioral signals
 * @param club - Club personality profile
 * @returns GuestEngineResult with ChemistryScore
 *
 * @example
 * const result = computeChemistry(guestSignals, clubProfile);
 * if (result.ok && result.data.overall > 80) {
 *   console.log(`Exceptional chemistry: ${result.data.overall}`);
 *   console.log(`Best dimension: ${getBestDimension(result.data.dimensions)}`);
 * }
 */
export function computeChemistry(
  guest: GuestChemistrySignals,
  club: ClubPersonality,
): GuestEngineResult<ChemistryScore> {
  const warnings: string[] = [];
  if (guest.feedbackScore === null) warnings.push("Sin feedback del guest — temporalFit estimado");

  // Dimension 1: Guest-Club Fit
  // How well the club's strengths match the guest's interests
  const sharedDomains = guest.interests.filter(i => club.strengths.includes(i));
  const guestClubFit = guest.interests.length > 0
    ? Math.round((sharedDomains.length / guest.interests.length) * 100)
    : 50;

  // Dimension 2: Guest-Sponsor Fit
  // Computed separately via matchSponsors — placeholder here
  const guestSponsorFit = 50; // Default until sponsor is matched

  // Dimension 3: Activity Alignment
  // How much the guest engages with club activities
  const activityAlignment = Math.min(100, Math.round(
    guest.visitCount * 12 + guest.avgDurationHours * 8,
  ));

  // Dimension 4: Social Resonance
  // How well the guest integrates socially
  const socialResonance = Math.min(100, Math.round(
    guest.socialConnections * 15 +
    (guest.visitCount >= 3 ? 30 : 0) +
    (club.atmosphere === "relaxed" ? 15 : 5),
  ));

  // Dimension 5: Temporal Fit
  // Is this the right moment in the guest's life?
  const temporalFit = guest.feedbackScore !== null
    ? Math.min(100, Math.round(guest.feedbackScore * 18 + guest.visitCount * 5))
    : Math.min(100, Math.round(30 + guest.visitCount * 8));

  const dimensions: ChemistryDimensions = {
    guestClubFit,
    guestSponsorFit,
    activityAlignment,
    socialResonance,
    temporalFit,
  };

  // Weighted overall
  const overall = Math.round(
    guestClubFit * CHEMISTRY_WEIGHTS.guestClubFit +
    guestSponsorFit * CHEMISTRY_WEIGHTS.guestSponsorFit +
    activityAlignment * CHEMISTRY_WEIGHTS.activityAlignment +
    socialResonance * CHEMISTRY_WEIGHTS.socialResonance +
    temporalFit * CHEMISTRY_WEIGHTS.temporalFit,
  );

  // Confidence: based on data completeness
  let confidence = 60; // base
  if (guest.visitCount >= 3) confidence += 10;
  if (guest.feedbackScore !== null) confidence += 15;
  if (guest.socialConnections > 0) confidence += 10;
  if (guest.interests.length >= 2) confidence += 5;

  return engineOk<ChemistryScore>({
    guestId: guest.guestId,
    overall: clamp(overall, 0, 100),
    dimensions,
    topSponsor: null,
    confidence: clamp(confidence, 0, 100),
    computedAt: new Date().toISOString(),
  }, warnings);
}

/**
 * Safe variant — always returns a valid ChemistryScore.
 */
export function computeChemistrySafe(
  guest: GuestChemistrySignals,
  club: ClubPersonality,
): ChemistryScore {
  const result = computeChemistry(guest, club);
  if (result.ok) return result.data;

  // Degraded: all dimensions at 50 (neutral)
  return {
    guestId: guest.guestId,
    overall: 50,
    dimensions: {
      guestClubFit: 50, guestSponsorFit: 50,
      activityAlignment: 50, socialResonance: 50, temporalFit: 50,
    },
    topSponsor: null,
    confidence: 0,
    computedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — SPONSOR MATCHING
// ═══════════════════════════════════════════════════════════

/**
 * Find the best sponsor matches for a guest.
 * Returns top N sponsors ranked by compatibility.
 *
 * @param guest - Guest behavioral signals
 * @param candidates - Available sponsor candidates
 * @param topN - Number of matches to return (default: 3)
 * @returns GuestEngineResult with sorted SponsorMatch[]
 */
export function matchSponsors(
  guest: GuestChemistrySignals,
  candidates: readonly SponsorSignals[],
  topN: number = 3,
): GuestEngineResult<readonly SponsorMatch[]> {
  if (candidates.length === 0) {
    return engineOk<readonly SponsorMatch[]>([], ["No hay sponsors candidatos disponibles"]);
  }

  const matches: SponsorMatch[] = [];

  for (const sponsor of candidates) {
    // Interest overlap
    const sharedInterests = guest.interests.filter(i =>
      sponsor.interests.includes(i),
    );
    const interestScore = guest.interests.length > 0
      ? (sharedInterests.length / guest.interests.length) * 100
      : 0;

    // Schedule alignment
    const scheduleAlignment = computeScheduleAlignment(
      guest.preferredTime,
      sponsor.availability,
    );

    // Sponsor effectiveness
    const effectiveness: SponsorEffectiveness | null = sponsor.pastGuestsSponsored > 0
      ? {
          totalGuestsSponsored: sponsor.pastGuestsSponsored,
          conversions: sponsor.pastConversions,
          conversionRate: Math.round(
            (sponsor.pastConversions / sponsor.pastGuestsSponsored) * 100,
          ),
          avgGuestSatisfaction: sponsor.avgGuestSatisfaction,
        }
      : null;

    // Weighted compatibility
    const compatibility = Math.round(
      interestScore * 0.40 +
      scheduleAlignment * 0.25 +
      (effectiveness ? effectiveness.conversionRate * 0.25 : 25) +
      (sponsor.avgGuestSatisfaction * 20 * 0.10),
    );

    matches.push({
      memberId: sponsor.memberId as any, // Branded in production
      memberName: sponsor.memberName,
      compatibility: clamp(compatibility, 0, 100),
      sharedInterests: sharedInterests as string[],
      scheduleAlignment: clamp(scheduleAlignment, 0, 100),
      effectiveness,
    });
  }

  // Sort by compatibility descending, return top N
  matches.sort((a, b) => b.compatibility - a.compatibility);

  return engineOk<readonly SponsorMatch[]>(
    matches.slice(0, topN),
  );
}

/**
 * Safe variant — returns empty array on failure.
 */
export function matchSponsorsSafe(
  guest: GuestChemistrySignals,
  candidates: readonly SponsorSignals[],
  topN: number = 3,
): readonly SponsorMatch[] {
  const result = matchSponsors(guest, candidates, topN);
  return result.ok ? result.data : [];
}

// ═══════════════════════════════════════════════════════════
// §4 — FIRST IMPRESSION ANALYSIS
// ═══════════════════════════════════════════════════════════

/**
 * Analyze first impression from visit data.
 * The first 30 seconds determine 80% of conversion probability.
 * Score below 40 triggers real-time service recovery alert.
 *
 * @param input - First impression data from the visit
 * @returns GuestEngineResult with FirstImpressionAnalysis
 */
export function analyzeFirstImpression(
  input: FirstImpressionInput,
): GuestEngineResult<FirstImpressionAnalysis> {
  const axes: FirstImpressionAxes = {
    welcomeLatency: computeWelcomeScore(input.welcomeMinutes),
    activityMatch: clamp(input.activityMatchScore, 0, 100),
    socialTemperature: computeSocialScore(input.socialInteractionCount),
    environmentalComfort: clamp(input.environmentScore, 0, 100),
    departureSentiment: clamp(input.departureScore, 0, 100),
  };

  const overall = Math.round(
    axes.welcomeLatency * FIRST_IMPRESSION_WEIGHTS.welcomeLatency +
    axes.activityMatch * FIRST_IMPRESSION_WEIGHTS.activityMatch +
    axes.socialTemperature * FIRST_IMPRESSION_WEIGHTS.socialTemperature +
    axes.environmentalComfort * FIRST_IMPRESSION_WEIGHTS.environmentalComfort +
    axes.departureSentiment * FIRST_IMPRESSION_WEIGHTS.departureSentiment,
  );

  const alertRequired = overall < GUEST_ADVISOR_THRESHOLDS.firstImpressionAlertThreshold;

  return engineOk<FirstImpressionAnalysis>({
    guestId: input.guestId,
    visitId: input.visitId as any,
    overall: clamp(overall, 0, 100),
    axes,
    alertRequired,
    alertMessage: alertRequired
      ? `Primera impresión crítica (${overall}/100). Bienvenida tardó ${input.welcomeMinutes}min. Recuperación de servicio requerida.`
      : null,
    computedAt: new Date().toISOString(),
  });
}

/**
 * Safe variant — always returns valid analysis.
 */
export function analyzeFirstImpressionSafe(
  input: FirstImpressionInput,
): FirstImpressionAnalysis {
  const result = analyzeFirstImpression(input);
  return result.ok ? result.data : result.fallback!;
}

// ═══════════════════════════════════════════════════════════
// §5 — CONVERSION PREDICTION
// ═══════════════════════════════════════════════════════════

/**
 * Predict conversion probability with explainability.
 * Not a black-box number — includes key factors and confidence interval.
 *
 * @param chemistry - Chemistry score for this guest
 * @param firstImpression - First impression analysis (null if no visit yet)
 * @param visitCount - Total visits
 * @param daysSinceFirstVisit - Days since first visit
 * @returns GuestEngineResult with ConversionPrediction
 */
export function predictConversion(
  chemistry: ChemistryScore,
  firstImpression: FirstImpressionAnalysis | null,
  visitCount: number,
  daysSinceFirstVisit: number,
): GuestEngineResult<ConversionPrediction> {
  const factors: ConversionFactor[] = [];

  // Chemistry factor
  const chemistryImpact = chemistry.overall >= 70 ? "positive" : chemistry.overall >= 40 ? "neutral" : "negative";
  factors.push({
    factor: "Química con el club",
    impact: chemistryImpact,
    weight: 0.35,
    description: `Score de química: ${chemistry.overall}/100`,
  });

  // First impression factor
  if (firstImpression) {
    const impressionImpact = firstImpression.overall >= 70 ? "positive" : firstImpression.overall >= 40 ? "neutral" : "negative";
    factors.push({
      factor: "Primera impresión",
      impact: impressionImpact,
      weight: 0.25,
      description: `Score de primera impresión: ${firstImpression.overall}/100`,
    });
  } else {
    factors.push({
      factor: "Primera impresión",
      impact: "neutral",
      weight: 0.25,
      description: "Sin datos de primera impresión",
    });
  }

  // Visit frequency factor
  const visitImpact = visitCount >= 5 ? "positive" : visitCount >= 2 ? "neutral" : "negative";
  factors.push({
    factor: "Frecuencia de visitas",
    impact: visitImpact,
    weight: 0.20,
    description: `${visitCount} visitas realizadas`,
  });

  // Recency factor
  const recencyImpact = daysSinceFirstVisit <= 30 ? "positive" : daysSinceFirstVisit <= 90 ? "neutral" : "negative";
  factors.push({
    factor: "Recencia",
    impact: recencyImpact,
    weight: 0.20,
    description: `Primera visita hace ${daysSinceFirstVisit} días`,
  });

  // Compute probability
  let probability = 0;
  probability += chemistry.overall * 0.35;
  probability += (firstImpression?.overall ?? 50) * 0.25;
  probability += Math.min(100, visitCount * 15) * 0.20;
  probability += Math.max(0, 100 - daysSinceFirstVisit * 0.5) * 0.20;

  probability = clamp(Math.round(probability), 0, 100);

  // Confidence interval (wider with less data)
  const dataPoints = (firstImpression ? 1 : 0) + (visitCount > 0 ? 1 : 0) + (chemistry.confidence > 50 ? 1 : 0);
  const intervalWidth = dataPoints >= 3 ? 10 : dataPoints >= 2 ? 20 : 30;

  // Estimated LTV (rough: avg membership ₡420,000/year × probability)
  const estimatedLTV = Math.round(420_000 * (probability / 100) * 3); // 3-year LTV

  // Recommended action
  let recommendedAction = "Continuar nurturing";
  if (probability >= 80) recommendedAction = "Programar propuesta de membresía inmediata";
  else if (probability >= 60) recommendedAction = "Agendar visita personalizada con sponsor asignado";
  else if (probability >= 40) recommendedAction = "Enviar invitación a evento exclusivo";
  else recommendedAction = "Mantener contacto con contenido de valor";

  return engineOk<ConversionPrediction>({
    guestId: chemistry.guestId,
    probability,
    confidenceInterval: [
      clamp(probability - intervalWidth, 0, 100),
      clamp(probability + intervalWidth, 0, 100),
    ],
    keyFactors: factors,
    recommendedAction,
    estimatedLTV,
    computedAt: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════
// §6 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

/** Convert welcome minutes to score. <2min = 90+, >10min = 20. */
function computeWelcomeScore(minutes: number): number {
  if (minutes <= 1) return 95;
  if (minutes <= 2) return 85;
  if (minutes <= 3) return 70;
  if (minutes <= 5) return 55;
  if (minutes <= 8) return 35;
  return 20;
}

/** Convert social interaction count to score. */
function computeSocialScore(count: number): number {
  if (count >= 5) return 90;
  if (count >= 3) return 75;
  if (count >= 1) return 55;
  return 25;
}

/** Compute schedule alignment between guest and sponsor. */
function computeScheduleAlignment(
  guest: GuestChemistrySignals["preferredTime"],
  sponsor: SponsorSignals["availability"],
): number {
  if (sponsor === "flexible") return 90;
  if (guest === sponsor) return 100;
  // Adjacent times get partial match
  const adjacency: Record<string, string[]> = {
    morning: ["afternoon"],
    afternoon: ["morning", "evening"],
    evening: ["afternoon", "weekend"],
    weekend: ["evening"],
  };
  if (adjacency[guest]?.includes(sponsor)) return 50;
  return 20;
}

/** Clamp number to range. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}