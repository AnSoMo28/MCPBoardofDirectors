/**
 * Event Matcher Engine — §C6
 *
 * Matches events to venues based on personality alignment,
 * capacity fit, genre compatibility, and sensory suitability.
 *
 * This engine answers: "Given this event concept, which venue
 * is the BEST fit — and WHY?"
 *
 * The matching algorithm evaluates 4 dimensions:
 * 1. Formality alignment (35%) — event formality vs venue formality
 * 2. Capacity fit (30%) — expected attendance vs venue sweet spot
 * 3. Genre alignment (20%) — event genre vs venue's best genres
 * 4. Sensory fit (15%) — event needs vs venue's sensory defaults
 *
 * Pure functions only — no hooks, no state, no side effects.
 *
 * Engine: §C6 matchEventToVenue
 *
 * @module cultural/lib/eventMatcher
 */

import type {
  FormalityLevel,
  CulturalCategory,
  SensoryProfile,
} from '../types';
import type {
  VenuePersonality,
  CulturalGenreExtended,
  SensoryPreferences,
} from '../types';
import {
  EVENT_DESIGNER_CONFIG,
  type VenueSensoryDefaults,
} from '../config';

// ══════════════════════════════════════════════════════════
//  TYPES
// ══════════════════════════════════════════════════════════

/**
 * Requirements for an event that needs a venue.
 * What the event NEEDS from a space.
 */
export interface EventVenueRequirements {
  /** Cultural genre of the event. */
  genre: CulturalGenreExtended;
  /** Backend category (for config lookup). */
  category: CulturalCategory;
  /** Required formality level. */
  formality: FormalityLevel;
  /** Expected number of attendees. */
  expectedAttendance: number;
  /** Whether the event needs a stage or performance area. */
  needsStage?: boolean;
  /** Whether the event needs music/sound capability. */
  needsMusic?: boolean;
  /** Preferred sensory environment (optional — from taste profiles). */
  preferredSensory?: SensoryPreferences;
  /** Preferred time of day (optional). */
  preferredTimeOfDay?: string;
}

/**
 * A single venue match result with score and reasoning.
 */
export interface VenueMatch {
  /** Venue identifier. */
  venueId: string;
  /** Human-readable venue name. */
  venueName: string;
  /** Overall match score 0-100. */
  matchScore: number;
  /** Per-dimension breakdown. */
  dimensions: VenueMatchDimensions;
  /** AI-generated reason why this venue is a good/bad fit. */
  reasoning: string;
  /** Whether this match triggers any warnings. */
  warnings: string[];
  /** Suggested sensory adjustments for this venue-event combo. */
  sensoryAdjustments: Partial<VenueSensoryDefaults>;
}

/**
 * Per-dimension match scores for transparency.
 */
export interface VenueMatchDimensions {
  /** How well the venue's formality matches the event. */
  formalityScore: number;
  /** How well the venue's capacity fits the expected attendance. */
  capacityScore: number;
  /** How well the event genre aligns with the venue's best genres. */
  genreScore: number;
  /** How well the venue's sensory defaults suit the event. */
  sensoryScore: number;
}

/**
 * Result of matching an event to all available venues.
 */
export interface EventMatchResult {
  /** Best match (highest score). */
  bestMatch: VenueMatch | null;
  /** All matches sorted by score descending. */
  allMatches: VenueMatch[];
  /** Whether any match exceeded the warning threshold. */
  hasWarnings: boolean;
  /** Whether all matches are below the block threshold. */
  allBlocked: boolean;
}

// ══════════════════════════════════════════════════════════
//  §C6: MATCH EVENT TO VENUE
// ══════════════════════════════════════════════════════════

/**
 * §C6 — Matches an event to all available venues.
 *
 * Evaluates every venue against the event requirements and returns
 * all matches sorted by score, with the best match first.
 *
 * @param requirements — What the event needs from a venue.
 * @param venuePersonalities — Pre-computed venue personalities (§C4 output).
 * @returns EventMatchResult with best match, all matches, and warnings.
 */
export function matchEventToVenue(
  requirements: EventVenueRequirements,
  venuePersonalities: VenuePersonality[],
): EventMatchResult {
  const W = EVENT_DESIGNER_CONFIG;

  if (venuePersonalities.length === 0) {
    return {
      bestMatch: null,
      allMatches: [],
      hasWarnings: false,
      allBlocked: true,
    };
  }

  const matches: VenueMatch[] = venuePersonalities.map((personality) =>
    scoreVenueMatch(requirements, personality),
  );

  // Sort by match score descending
  const sorted = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = sorted[0] ?? null;
  const hasWarnings = sorted.some(
    (m) => m.matchScore < W.VENUE_MATCH_WARNING,
  );
  const allBlocked = sorted.every(
    (m) => m.matchScore < W.VENUE_MATCH_BLOCK,
  );

  return {
    bestMatch,
    allMatches: sorted,
    hasWarnings,
    allBlocked,
  };
}

/**
 * Matches an event to a single venue and returns detailed scoring.
 *
 * @param requirements — Event requirements.
 * @param personality — Single venue personality.
 * @returns VenueMatch with score, dimensions, reasoning, warnings.
 */
export function scoreVenueMatch(
  requirements: EventVenueRequirements,
  personality: VenuePersonality,
): VenueMatch {
  const W = EVENT_DESIGNER_CONFIG;

  // ── Dimension 1: Formality alignment (35%) ──
  const formalityScore = computeFormalityAlignment(
    requirements.formality,
    personality.formality,
  );

  // ── Dimension 2: Capacity fit (30%) ──
  const capacityScore = computeCapacityFit(
    requirements.expectedAttendance,
    personality.optimalCapacity,
    personality.avgOccupancy,
  );

  // ── Dimension 3: Genre alignment (20%) ──
  const genreScore = computeGenreAlignment(
    requirements.genre,
    personality.bestGenres,
  );

  // ── Dimension 4: Sensory fit (15%) ──
  const sensoryScore = computeSensoryFit(
    requirements,
    personality.sensoryProfile,
  );

  // ── Weighted composite ──
  const matchScore = Math.round(
    formalityScore * 0.35 +
    capacityScore  * 0.30 +
    genreScore     * 0.20 +
    sensoryScore   * 0.15,
  );

  // ── Warnings ──
  const warnings: string[] = [];

  if (matchScore < W.VENUE_MATCH_WARNING) {
    warnings.push(
      `Match bajo (${matchScore}/100) — el venue "${personality.venueName}" no es ideal para este tipo de evento.`,
    );
  }
  if (capacityScore < 40) {
    const ratio = requirements.expectedAttendance / Math.max(1, personality.optimalCapacity);
    if (ratio > 1) {
      warnings.push(
        `Capacidad insuficiente: ${requirements.expectedAttendance} asistentes esperados vs capacidad óptima de ${personality.optimalCapacity}.`,
      );
    } else {
      warnings.push(
        `Venue sobredimensionado: solo ${requirements.expectedAttendance} asistentes para un espacio de ${personality.optimalCapacity} óptimo.`,
      );
    }
  }
  if (requirements.needsStage && !personality.sensoryProfile.layout.stagePresence) {
    warnings.push(
      'El evento requiere escenario pero el venue no tiene infraestructura de stage.',
    );
  }
  if (requirements.needsMusic && !personality.sensoryProfile.acoustics.musicCapability) {
    warnings.push(
      'El evento requiere música pero el venue tiene capacidad acústica limitada.',
    );
  }

  // ── Reasoning ──
  const reasoning = buildMatchReasoning(
    personality,
    requirements,
    { formalityScore, capacityScore, genreScore, sensoryScore },
    matchScore,
  );

  // ── Sensory adjustments ──
  const sensoryAdjustments = deriveSensoryAdjustmentsForMatch(
    requirements,
    personality,
  );

  return {
    venueId: personality.venueId,
    venueName: personality.venueName,
    matchScore: clamp(matchScore, 0, 100),
    dimensions: { formalityScore, capacityScore, genreScore, sensoryScore },
    reasoning,
    warnings,
    sensoryAdjustments,
  };
}

// ══════════════════════════════════════════════════════════
//  BATCH PROCESSING
// ══════════════════════════════════════════════════════════

/**
 * Ranks venues for multiple event requirements at once.
 * Used by the AI Event Designer to suggest venues for proposals.
 *
 * @param requirementsList — Array of event requirements.
 * @param venuePersonalities — All available venue personalities.
 * @returns Map of requirements index → match result.
 */
export function batchMatchEventsToVenues(
  requirementsList: EventVenueRequirements[],
  venuePersonalities: VenuePersonality[],
): EventMatchResult[] {
  return requirementsList.map((req) =>
    matchEventToVenue(req, venuePersonalities),
  );
}

/**
 * Finds the single best venue for a given event.
 * Convenience wrapper that returns just the best match.
 *
 * @param requirements — Event requirements.
 * @param venuePersonalities — All available venues.
 * @returns Best VenueMatch or null if no venues available.
 */
export function findBestVenue(
  requirements: EventVenueRequirements,
  venuePersonalities: VenuePersonality[],
): VenueMatch | null {
  const result = matchEventToVenue(requirements, venuePersonalities);
  return result.bestMatch;
}

// ══════════════════════════════════════════════════════════
//  DIMENSION SCORING FUNCTIONS (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Computes formality alignment between event and venue.
 *
 * Uses ordinal distance on the formality scale:
 * casual(0) → semi_formal(1) → formal(2) → black_tie(3) → white_tie(4)
 *
 * Same formality = 100. Adjacent = 75. Two apart = 50. Three+ = 25.
 */
function computeFormalityAlignment(
  eventFormality: FormalityLevel,
  venueFormalityScore: number,
): number {
  const formalityScale: Record<FormalityLevel, number> = {
    casual: 0,
    semi_formal: 25,
    formal: 50,
    black_tie: 75,
    white_tie: 100,
  };

  const eventScore = formalityScale[eventFormality] ?? 50;
  const delta = Math.abs(eventScore - venueFormalityScore);

  // Closer = better. Max delta is 100.
  return Math.max(0, 100 - delta);
}

/**
 * Computes capacity fit between expected attendance and venue sweet spot.
 *
 * Ideal: expected attendance is 70-90% of optimal capacity.
 * Too low: venue feels empty (low sociality).
 * Too high: venue feels cramped (low comfort).
 */
function computeCapacityFit(
  expectedAttendance: number,
  optimalCapacity: number,
  _avgOccupancy: number,
): number {
  if (optimalCapacity <= 0) return 50;

  const ratio = expectedAttendance / optimalCapacity;
  const C = EVENT_DESIGNER_CONFIG;

  // Sweet spot: 70-90% of optimal capacity
  if (ratio >= C.OPTIMAL_CAPACITY_RATIO && ratio <= C.OVERCROWDING_RATIO) {
    return 100;
  }

  // Under-filled
  if (ratio < C.OPTIMAL_CAPACITY_RATIO) {
    return Math.round((ratio / C.OPTIMAL_CAPACITY_RATIO) * 100);
  }

  // Over-filled
  if (ratio > C.OVERCROWDING_RATIO) {
    const overRatio = (ratio - C.OVERCROWDING_RATIO) / C.OVERCROWDING_RATIO;
    return Math.max(0, Math.round(100 - overRatio * 200));
  }

  return 50;
}

/**
 * Computes genre alignment between event genre and venue's best genres.
 *
 * If the event genre is in the venue's top 3 genres = 100.
 * Partial match via category overlap = 60.
 * No match = 30 (some venues are versatile enough).
 */
function computeGenreAlignment(
  eventGenre: CulturalGenreExtended,
  venueBestGenres: CulturalGenreExtended[],
): number {
  if (venueBestGenres.length === 0) return 50;

  // Direct match
  if (venueBestGenres.includes(eventGenre)) return 100;

  // Category overlap (same backend category)
  const eventCategory = getBackendCategory(eventGenre);
  for (const bestGenre of venueBestGenres) {
    if (getBackendCategory(bestGenre) === eventCategory) return 70;
  }

  // No match but venue might be versatile
  return 30;
}

/**
 * Computes sensory fit between event requirements and venue defaults.
 *
 * Checks lighting mood, noise level, space feeling, and stage needs.
 */
function computeSensoryFit(
  requirements: EventVenueRequirements,
  venueSensory: SensoryProfile,
): number {
  let score = 0;
  let dimensions = 0;

  // Stage need vs venue capability
  if (requirements.needsStage !== undefined) {
    dimensions++;
    if (requirements.needsStage === venueSensory.layout.stagePresence) {
      score += 100;
    } else if (requirements.needsStage) {
      score += 20; // Needs stage but venue doesn't have one
    } else {
      score += 80; // Doesn't need stage, venue has one — acceptable
    }
  }

  // Music need vs venue capability
  if (requirements.needsMusic !== undefined) {
    dimensions++;
    if (requirements.needsMusic === venueSensory.acoustics.musicCapability) {
      score += 100;
    } else if (requirements.needsMusic) {
      score += 20;
    } else {
      score += 80;
    }
  }

  // Preferred sensory vs venue defaults
  if (requirements.preferredSensory) {
    dimensions++;
    const pref = requirements.preferredSensory;
    let prefScore = 0;

    // Lighting mood match
    if (pref.lightingMood === venueSensory.lighting.mood) prefScore += 25;
    else prefScore += 10;

    // Noise level approximation
    const noiseMap: Record<string, number> = {
      quiet: 20, conversational: 40, energetic: 65, loud: 85,
    };
    const prefNoise = noiseMap[pref.noiseLevel] ?? 40;
    const venueNoise = venueSensory.acoustics.ambientNoise;
    prefScore += Math.max(0, 25 - Math.abs(prefNoise - venueNoise) * 0.5);

    // Space feeling approximation
    const spaceMap: Record<string, number> = {
      intimate: 25, cozy: 45, spacious: 70, grand: 90,
    };
    const prefSpace = spaceMap[pref.spaceFeeling] ?? 50;
    // Use maxCapacity as proxy for space feeling
    const venueSpace = venueSensory.layout.maxCapacity > 150 ? 85
      : venueSensory.layout.maxCapacity > 80 ? 65
      : venueSensory.layout.maxCapacity > 40 ? 40
      : 20;
    prefScore += Math.max(0, 25 - Math.abs(prefSpace - venueSpace) * 0.5);

    score += prefScore;
  }

  // If no specific requirements, default to 70 (most venues are acceptable)
  if (dimensions === 0) return 70;

  return Math.round(score / dimensions);
}

// ══════════════════════════════════════════════════════════
//  REASONING BUILDER (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Builds a human-readable reasoning string explaining why a venue
 * is a good or bad match for an event.
 */
function buildMatchReasoning(
  personality: VenuePersonality,
  requirements: EventVenueRequirements,
  dimensions: VenueMatchDimensions,
  totalScore: number,
): string {
  const parts: string[] = [];

  // Overall assessment
  if (totalScore >= 80) {
    parts.push(`"${personality.venueName}" es un excelente match para este evento.`);
  } else if (totalScore >= 60) {
    parts.push(`"${personality.venueName}" es un buen match, con ajustes menores.`);
  } else if (totalScore >= 40) {
    parts.push(`"${personality.venueName}" es aceptable pero no ideal.`);
  } else {
    parts.push(`"${personality.venueName}" no es recomendado para este tipo de evento.`);
  }

  // Strongest dimension
  const dimEntries = Object.entries(dimensions) as Array<[keyof VenueMatchDimensions, number]>;
  dimEntries.sort((a, b) => b[1] - a[1]);
  const strongest = dimEntries[0];
  const weakest = dimEntries[dimEntries.length - 1];

  const dimLabels: Record<string, string> = {
    formalityScore: 'formalidad',
    capacityScore: 'capacidad',
    genreScore: 'género',
    sensoryScore: 'sensorial',
  };

  if (strongest && strongest[1] >= 80) {
    parts.push(`Fuerte en ${dimLabels[strongest[0]]} (${strongest[1]}/100).`);
  }
  if (weakest && weakest[1] < 50) {
    parts.push(`Debilidad en ${dimLabels[weakest[0]]} (${weakest[1]}/100).`);
  }

  // Venue personality insight
  if (personality.formality >= 70 && requirements.formality === 'casual') {
    parts.push('El venue es más formal que lo que el evento requiere — puede intimidar al público casual.');
  }
  if (personality.formality <= 30 && ['black_tie', 'white_tie'].includes(requirements.formality)) {
    parts.push('El venue es demasiado casual para la formalidad requerida.');
  }

  if (personality.bestGenres.length > 0) {
    parts.push(
      `Mejores géneros del venue: ${personality.bestGenres.slice(0, 2).join(', ')}.`,
    );
  }

  return parts.join(' ');
}

/**
 * Derives sensory adjustments needed when this venue is selected.
 */
function deriveSensoryAdjustmentsForMatch(
  requirements: EventVenueRequirements,
  personality: VenuePersonality,
): Partial<VenueSensoryDefaults> {
  const adjustments: Partial<VenueSensoryDefaults> = {};

  // Stage need
  if (requirements.needsStage && !personality.sensoryProfile.layout.stagePresence) {
    // Venue doesn't have a stage — note that temporary setup is needed
    // (This is a configuration hint, not a code change)
  }

  // Music need
  if (requirements.needsMusic && !personality.sensoryProfile.acoustics.musicCapability) {
    adjustments.acoustics = {
      ambientNoise: personality.sensoryProfile.acoustics.ambientNoise,
      reverberation: 'moderate',
      musicCapability: true,
    };
  }

  // Formality mismatch — adjust lighting
  const formalLevels: FormalityLevel[] = ['formal', 'black_tie', 'white_tie'];
  if (formalLevels.includes(requirements.formality) && personality.formality < 40) {
    adjustments.lighting = {
      baseLevel: Math.min(80, (personality.sensoryProfile.lighting.baseLevel ?? 50) + 20),
      mood: 'dramatic',
      colorTemperature: 'warm',
    };
  }

  return adjustments;
}

// ══════════════════════════════════════════════════════════
//  UTILITIES (not exported)
// ══════════════════════════════════════════════════════════

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Maps an extended genre to its backend CulturalCategory.
 * Used for fuzzy matching when direct genre match fails.
 */
function getBackendCategory(genre: CulturalGenreExtended): CulturalCategory | null {
  const backendCategories: CulturalCategory[] = [
    'music', 'visual_arts', 'theater', 'dance', 'literature', 'gastronomy', 'heritage',
  ];

  // Direct backend category
  if (backendCategories.includes(genre as CulturalCategory)) {
    return genre as CulturalCategory;
  }

  // Extended genre → backend mapping
  const mappings: Record<string, CulturalCategory> = {
    wine_spirits: 'gastronomy',
    lectures: 'literature',
    workshops: 'visual_arts',
    contemporary: 'visual_arts',
    family: 'gastronomy',     // family events often revolve around dining
    seasonal: 'heritage',     // seasonal events connect to tradition
    wellness_cultural: 'dance', // wellness has movement component
  };

  return mappings[genre] ?? null;
}