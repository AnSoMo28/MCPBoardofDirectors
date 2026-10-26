/**
 * Venue Intelligence Engine — §C4 + §C5
 *
 * Derives the "personality" of each venue from its usage history,
 * and designs optimal sensory profiles for event-venue combinations.
 *
 * §C4 buildVenuePersonality — Each venue has emergent characteristics
 * derived from HOW it's been used: intimate vs grand, serene vs
 * energetic, formal vs casual. Not a static label — a living
 * characterization that evolves as the venue hosts different events.
 *
 * §C5 deriveSensoryProfile — Designs the concrete sensory "recipe"
 * for a specific event in a specific venue: lighting, acoustics,
 * temperature, aroma, layout. Takes the venue's default sensory
 * profile and adjusts it based on event type, formality, and
 * aggregated member preferences.
 *
 * Pure functions only — no hooks, no state, no side effects.
 *
 * @module cultural/lib/venueIntelligence
 */

import type {
  VenueType,
  CulturalCategory,
  FormalityLevel
} from '../types';
import type {
  VenuePersonality,
  SensoryProfile,
  SensoryPreferences,
  CulturalGenreExtended,
} from '../types';
import {
  SENSORY_DEFAULTS,
  CULTURAL_GENRE_EXTENDED,
  type VenueSensoryDefaults,
} from '../config';

// ══════════════════════════════════════════════════════════
//  RAW INPUT TYPES (from MCP backend)
// ══════════════════════════════════════════════════════════

/**
 * Raw venue usage record from MCP.
 * Matches a single entry from get_cultural_analytics venue_utilization.
 */
export interface VenueUsageRecord {
  venue: string;
  venue_type: string;
  total_bookings: number;
  total_guests: number;
  avg_guests: number;
  total_budget: number;
  utilization_rate: number;
}

/**
 * Raw venue feedback from MCP.
 * Derived from event feedback grouped by venue.
 */
export interface VenueFeedbackRecord {
  venue: string;
  event_id: string;
  satisfaction_score: number;    // 0-100
  event_type: string;
  category: CulturalCategory;
  formality: FormalityLevel;
  date: string;
  guest_count: number;
}

/**
 * Event template for sensory profile derivation.
 * Used when designing a new event in a specific venue.
 */
export interface EventTemplate {
  category: CulturalGenreExtended;
  formality: FormalityLevel;
  expectedAttendance: number;
  /** Optional: specific member sensory preferences to optimize for. */
  memberPreferences?: SensoryPreferences[];
}

// ══════════════════════════════════════════════════════════
//  §C4: BUILD VENUE PERSONALITY
// ══════════════════════════════════════════════════════════

/**
 * §C4 — Derives the "personality" of a venue from its usage history.
 *
 * Each venue has emergent characteristics based on:
 * — What types of events it has hosted (formality, category)
 * — Who uses it (satisfaction patterns, guest counts)
 * — When it's used (time patterns, peak utilization)
 * — How well it performs (satisfaction, utilization trend)
 *
 * The personality is NOT a static label. It evolves as the venue
 * hosts more events. A ballroom that starts hosting casual brunches
 * will see its "formality" dimension decrease over time.
 *
 * @param venueId — Venue identifier.
 * @param venueName — Human-readable venue name.
 * @param venueType — Backend venue type (for sensory defaults).
 * @param usageHistory — Historical utilization data from MCP.
 * @param feedback — Event feedback records for events in this venue.
 * @returns VenuePersonality with derived characteristics.
 */
export function buildVenuePersonality(
  venueId: string,
  venueName: string,
  venueType: VenueType,
  usageHistory: VenueUsageRecord[],
  feedback: VenueFeedbackRecord[],
): VenuePersonality {
  // Filter feedback for this specific venue
  const venueFeedback = feedback.filter((f) => f.venue === venueName || f.venue === venueId);

  // ── Energy: derived from activity types hosted ──
  const energy = computeVenueEnergy(venueFeedback, venueType);

  // ── Sociality: solo vs group usage ratio ──
  const sociality = computeVenueSociality(venueFeedback, usageHistory, venueId);

  // ── Formality: weighted average of event formality levels ──
  const formality = computeVenueFormality(venueFeedback, venueType);

  // ── Exclusivity: access restriction + usage patterns ──
  const exclusivity = computeVenueExclusivity(usageHistory, venueId);

  // ── Versatility: how many different event types it hosts ──
  const versatility = computeVenueVersatility(venueFeedback);

  // ── Best genres: which cultural genres work best here ──
  const bestGenres = identifyBestGenres(venueFeedback);

  // ── Optimal capacity: sweet spot for guest count ──
  const optimalCapacity = computeOptimalCapacity(venueFeedback, usageHistory, venueId);

  // ── Best time of day ──
  const bestTimeOfDay = inferBestTimeOfDay(venueFeedback);

  // ── Utilization metrics ──
  const venueUsage = usageHistory.find(
    (u) => u.venue === venueName || u.venue === venueId,
  );
  const avgOccupancy = venueUsage?.utilization_rate ?? 0;
  const avgSatisfaction = venueFeedback.length > 0
    ? Math.round(
        venueFeedback.reduce((s, f) => s + f.satisfaction_score, 0) /
        venueFeedback.length,
      )
    : 50;

  // ── Utilization trend ──
  const utilizationTrend = computeUtilizationTrend(venueFeedback);

  // ── Sensory profile (from defaults for this venue type) ──
  const sensoryProfile = buildDefaultSensoryProfile(venueType);

  return {
    venueId,
    venueName,
    intimacy: 0,
    energy: clamp(energy, 0, 100),
    sociality: clamp(sociality, 0, 100),
    formality: clamp(formality, 0, 100),
    exclusivity: clamp(exclusivity, 0, 100),
    versatility: clamp(versatility, 0, 100),
    bestGenres,
    optimalCapacity,
    bestTimeOfDay,
    avgOccupancy: clamp(avgOccupancy, 0, 100),
    avgSatisfaction: clamp(avgSatisfaction, 0, 100),
    utilizationTrend,
    sensoryProfile,
  };
}

// ══════════════════════════════════════════════════════════
//  §C5: DERIVE SENSORY PROFILE
// ══════════════════════════════════════════════════════════

/**
 * §C5 — Designs the optimal sensory profile for an event + venue combo.
 *
 * Starts from the venue's default sensory profile (from SENSORY_DEFAULTS
 * in config.ts) and adjusts based on:
 * — Event type and formality
 * — Expected attendance vs venue capacity
 * — Aggregated sensory preferences of expected attendees
 *
 * Returns a complete SensoryProfile that the event setup system
 * can use to configure the physical space.
 *
 * @param venueType — Type of venue being used.
 * @param event — Event template with category, formality, attendance.
 * @returns SensoryProfile optimized for this specific event.
 */
export function deriveSensoryProfile(
  venueType: VenueType,
  event: EventTemplate,
): SensoryProfile {
  const defaults = SENSORY_DEFAULTS[venueType];

  // Start from defaults
  let lighting = { ...defaults.lighting };
  let acoustics = { ...defaults.acoustics };
  let temperature = { ...defaults.temperature };
  let aroma = deriveAroma(event.category);
  let flowPattern = defaults.flowPattern;

  // ── Adjust lighting based on event formality ──
  lighting = adjustLighting(lighting, event.formality, venueType);

  // ── Adjust acoustics based on event category ──
  acoustics = adjustAcoustics(acoustics, event.category);

  // ── Adjust temperature based on attendance density ──
  temperature = adjustTemperature(temperature, event.expectedAttendance, venueType);

  // ── Adjust flow pattern based on event type ──
  flowPattern = adjustFlowPattern(flowPattern, event.category, event.formality);

  // ── Override with member preferences if provided ──
  if (event.memberPreferences && event.memberPreferences.length > 0) {
    const aggregated = aggregateMemberPreferences(event.memberPreferences);
    lighting = applyPreferenceOverrides(lighting, aggregated);
  }

  return {
    lighting: {
      baseLevel: lighting.baseLevel,
      mood: lighting.mood,
      colorTemperature: lighting.colorTemperature,
      dynamicRange: canDynamicLighting(event.category),
    },
    acoustics: {
      ambientNoise: acoustics.ambientNoise,
      reverberation: acoustics.reverberation,
      soundIsolation: computeSoundIsolation(venueType),
      musicCapability: acoustics.musicCapability,
    },
    temperature: {
      base: temperature.ideal,
      variability: temperature.range,
      ventilation: inferVentilation(venueType),
    },
    aroma,
    layout: {
      maxCapacity: computeLayoutCapacity(venueType, event.expectedAttendance),
      configurations: suggestConfigurations(event.category, event.formality),
      flexibility: computeLayoutFlexibility(venueType),
      stagePresence: needsStage(event.category),
      flowPattern,
    },
  };
}

// ══════════════════════════════════════════════════════════
//  BATCH PROCESSING
// ══════════════════════════════════════════════════════════

/**
 * Builds venue personalities for all venues at once.
 * Used by useCulturalDashboard to populate the brain object.
 *
 * @param usageRecords — All venue utilization records from MCP.
 * @param feedback — All venue feedback records from MCP.
 * @param venueTypes — Map of venue name → VenueType.
 * @returns Array of VenuePersonality, sorted by avgSatisfaction desc.
 */
export function buildAllVenuePersonalities(
  usageRecords: VenueUsageRecord[],
  feedback: VenueFeedbackRecord[],
  venueTypes: Record<string, VenueType>,
): VenuePersonality[] {
  const personalities: VenuePersonality[] = [];

  for (const record of usageRecords) {
    const venueType = venueTypes[record.venue] ?? venueTypes[record.venue_type] ?? 'lounge';

    const personality = buildVenuePersonality(
      record.venue,
      record.venue,
      venueType,
      usageRecords,
      feedback,
    );

    personalities.push(personality);
  }

  return [...personalities].sort(
    (a, b) => b.avgSatisfaction - a.avgSatisfaction,
  );
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS — VENUE PERSONALITY (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Computes energy level from event types hosted and venue type.
 * High-energy events (live bands, themed parties) boost energy.
 * Low-energy events (literature, lectures) reduce it.
 */
function computeVenueEnergy(
  feedback: VenueFeedbackRecord[],
  venueType: VenueType,
): number {
  // Base energy from venue type
  const baseEnergy: Record<string, number> = {
    ballroom: 60,
    garden: 45,
    terrace: 50,
    lounge: 30,
    auditorium: 55,
    poolside: 70,
  };
  const base = baseEnergy[venueType] ?? 50;

  if (feedback.length === 0) return base;

  // Adjust based on event categories hosted
  const highEnergyCategories: CulturalCategory[] = ['music', 'dance', 'gastronomy'];
  const lowEnergyCategories: CulturalCategory[] = ['literature', 'heritage'];

  let energyShift = 0;
  for (const fb of feedback) {
    if (highEnergyCategories.includes(fb.category)) energyShift += 2;
    if (lowEnergyCategories.includes(fb.category)) energyShift -= 1;
  }

  const avgShift = energyShift / feedback.length;
  return clamp(base + avgShift * 5, 10, 100);
}

/**
 * Computes sociality from guest counts and group patterns.
 */
function computeVenueSociality(
  feedback: VenueFeedbackRecord[],
  usageHistory: VenueUsageRecord[],
  venueId: string,
): number {
  const venueUsage = usageHistory.find(
    (u) => u.venue === venueId,
  );

  if (!venueUsage && feedback.length === 0) return 50;

  // Average guest count as sociality signal
  const avgGuests = venueUsage?.avg_guests ?? 0;
  const guestSociality = avgGuests > 100 ? 90
    : avgGuests > 50 ? 70
    : avgGuests > 20 ? 50
    : avgGuests > 10 ? 35
    : 20;

  // Feedback-based: event types that are inherently social
  const socialCategories: CulturalCategory[] = ['gastronomy', 'dance', 'music'];
  let socialEvents = 0;
  for (const fb of feedback) {
    if (socialCategories.includes(fb.category)) socialEvents++;
  }
  const socialRatio = feedback.length > 0
    ? socialEvents / feedback.length
    : 0.5;

  return clamp(
    Math.round(guestSociality * 0.6 + socialRatio * 100 * 0.4),
    10,
    100,
  );
}

/**
 * Computes formality from event formality levels hosted.
 */
function computeVenueFormality(
  feedback: VenueFeedbackRecord[],
  venueType: VenueType,
): number {
  const formalityScores: Record<string, number> = {
    casual: 20,
    semi_formal: 40,
    formal: 65,
    black_tie: 85,
    white_tie: 100,
  };

  // Base formality from venue type
  const baseFormality: Record<string, number> = {
    ballroom: 75,
    garden: 25,
    terrace: 40,
    lounge: 30,
    auditorium: 60,
    poolside: 15,
  };
  const base = baseFormality[venueType] ?? 40;

  if (feedback.length === 0) return base;

  // Weighted average of event formality
  let totalScore = 0;
  let count = 0;
  for (const fb of feedback) {
    const score = formalityScores[fb.formality] ?? 40;
    totalScore += score;
    count++;
  }

  const avgFormality = count > 0 ? totalScore / count : base;
  return clamp(Math.round(avgFormality), 10, 100);
}

/**
 * Computes exclusivity from usage patterns.
 * Low utilization + high satisfaction = exclusive.
 * High utilization + low satisfaction = overcrowded, not exclusive.
 */
function computeVenueExclusivity(
  usageHistory: VenueUsageRecord[],
  venueId: string,
): number {
  const venue = usageHistory.find((u) => u.venue === venueId);
  if (!venue) return 50;

  const util = venue.utilization_rate;
  const avgGuests = venue.avg_guests;

  // Low usage = more exclusive
  const usageFactor = util < 30 ? 80
    : util < 50 ? 60
    : util < 70 ? 40
    : 20;

  // Small events = more exclusive
  const sizeFactor = avgGuests < 20 ? 85
    : avgGuests < 50 ? 65
    : avgGuests < 100 ? 45
    : 25;

  return clamp(Math.round(usageFactor * 0.5 + sizeFactor * 0.5), 10, 100);
}

/**
 * Computes versatility: how many distinct event types the venue hosts.
 * High versatility = the venue works for many different types of events.
 */
function computeVenueVersatility(feedback: VenueFeedbackRecord[]): number {
  if (feedback.length === 0) return 50;

  const uniqueCategories = new Set(feedback.map((f) => f.category)).size;
  const uniqueTypes = new Set(feedback.map((f) => f.event_type)).size;
  const uniqueFormalities = new Set(feedback.map((f) => f.formality)).size;

  const totalPossible = Object.keys(CULTURAL_GENRE_EXTENDED).length;
  const categoryScore = Math.round((uniqueCategories / totalPossible) * 100);

  // More distinct types + formalities = more versatile
  const typeScore = Math.min(100, uniqueTypes * 20);
  const formalityScore = Math.min(100, uniqueFormalities * 25);

  return clamp(
    Math.round(categoryScore * 0.4 + typeScore * 0.3 + formalityScore * 0.3),
    10,
    100,
  );
}

/**
 * Identifies the best genres for a venue based on satisfaction scores.
 * Returns top genres sorted by average satisfaction.
 */
function identifyBestGenres(
  feedback: VenueFeedbackRecord[],
): CulturalGenreExtended[] {
  if (feedback.length === 0) return [];

  // Group satisfaction by category
  const categoryScores: Record<string, number[]> = {};
  for (const fb of feedback) {
    if (!categoryScores[fb.category]) categoryScores[fb.category] = [];
    categoryScores[fb.category].push(fb.satisfaction_score);
  }

  // Compute average per category
  const categoryAvg: Array<{ category: string; avg: number }> = [];
  for (const [cat, scores] of Object.entries(categoryScores)) {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    categoryAvg.push({ category: cat, avg });
  }

  // Sort by satisfaction descending, take top 3
  categoryAvg.sort((a, b) => b.avg - a.avg);

  return categoryAvg
    .slice(0, 3)
    .map((c) => c.category as CulturalGenreExtended);
}

/**
 * Computes optimal capacity — the "sweet spot" where the venue
 * performs best (highest satisfaction + reasonable utilization).
 */
function computeOptimalCapacity(
  feedback: VenueFeedbackRecord[],
  usageHistory: VenueUsageRecord[],
  venueId: string,
): number {
  if (feedback.length === 0) {
    const venue = usageHistory.find((u) => u.venue === venueId);
    return venue ? Math.round(venue.avg_guests * 1.2) : 50;
  }

  // Find guest count ranges with highest satisfaction
  const sorted = [...feedback].sort(
    (a, b) => b.satisfaction_score - a.satisfaction_score,
  );

  // Top quartile events
  const topQuartile = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.25)));
  const avgTopGuests = Math.round(
    topQuartile.reduce((s, f) => s + f.guest_count, 0) / topQuartile.length,
  );

  return Math.max(10, avgTopGuests);
}

/**
 * Infers best time of day from feedback timestamps.
 */
function inferBestTimeOfDay(feedback: VenueFeedbackRecord[]): string {
  if (feedback.length === 0) return 'evening';

  const timeSlots: Record<string, number[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  for (const fb of feedback) {
    // Use date to approximate — events are tagged with date
    // Default distribution based on event types
    const hour = inferHourFromCategory(fb.category);
    if (hour < 12) timeSlots.morning.push(fb.satisfaction_score);
    else if (hour < 17) timeSlots.afternoon.push(fb.satisfaction_score);
    else if (hour < 21) timeSlots.evening.push(fb.satisfaction_score);
    else timeSlots.night.push(fb.satisfaction_score);
  }

  // Find time slot with highest average satisfaction
  let bestSlot = 'evening';
  let bestAvg = 0;

  for (const [slot, scores] of Object.entries(timeSlots)) {
    if (scores.length === 0) continue;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestSlot = slot;
    }
  }

  return bestSlot;
}

/**
 * Infers typical hour from cultural category.
 * Used when exact time data isn't available.
 */
function inferHourFromCategory(category: CulturalCategory): number {
  const hourMap: Record<string, number> = {
    visual_arts: 14,  // afternoon exhibitions
    literature: 11,   // morning book events
    music: 20,        // evening concerts
    theater: 19,      // evening performances
    dance: 20,        // evening dance events
    gastronomy: 20,   // dinner events
    heritage: 15,     // afternoon heritage tours
  };
  return hourMap[category] ?? 19;
}

/**
 * Computes utilization trend from feedback temporal patterns.
 */
function computeUtilizationTrend(
  feedback: VenueFeedbackRecord[],
): 'increasing' | 'stable' | 'declining' {
  if (feedback.length < 4) return 'stable';

  const sorted = [...feedback].sort((a, b) => a.date.localeCompare(b.date));
  const midpoint = Math.floor(sorted.length / 2);
  const olderCount = midpoint;
  const recentCount = sorted.length - midpoint;

  if (recentCount > olderCount * 1.3) return 'increasing';
  if (recentCount < olderCount * 0.7) return 'declining';
  return 'stable';
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS — SENSORY PROFILE (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Builds a SensoryProfile from the venue type defaults.
 * Returns a full SensoryProfile object ready for override.
 */
function buildDefaultSensoryProfile(venueType: VenueType): SensoryProfile {
  const defaults = SENSORY_DEFAULTS[venueType];

  return {
    lighting: {
      baseLevel: defaults.lighting.baseLevel,
      mood: defaults.lighting.mood,
      colorTemperature: defaults.lighting.colorTemperature,
      dynamicRange: false,
    },
    acoustics: {
      ambientNoise: defaults.acoustics.ambientNoise,
      reverberation: defaults.acoustics.reverberation,
      soundIsolation: computeSoundIsolation(venueType),
      musicCapability: defaults.acoustics.musicCapability,
    },
    temperature: {
      base: defaults.temperature.ideal,
      variability: defaults.temperature.range,
      ventilation: inferVentilation(venueType),
    },
    aroma: 'neutral',
    layout: {
      maxCapacity: inferMaxCapacity(venueType),
      configurations: suggestConfigurations('music', defaults.formality),
      flexibility: computeLayoutFlexibility(venueType),
      stagePresence: venueType === 'auditorium' || venueType === 'ballroom',
      flowPattern: defaults.flowPattern,
    },
  };
}

/**
 * Adjusts lighting based on event formality and venue type.
 */
function adjustLighting(
  lighting: VenueSensoryDefaults['lighting'],
  formality: FormalityLevel,
  venueType: VenueType,
): VenueSensoryDefaults['lighting'] {
  const formalLevels: FormalityLevel[] = ['formal', 'black_tie', 'white_tie'];

  if (formalLevels.includes(formality)) {
    return {
      ...lighting,
      mood: 'dramatic',
      baseLevel: Math.min(80, lighting.baseLevel + 15),
      colorTemperature: 'warm',
    };
  }

  if (formality === 'casual' && venueType !== 'poolside') {
    return {
      ...lighting,
      mood: 'ambient',
      baseLevel: Math.max(30, lighting.baseLevel - 10),
    };
  }

  return lighting;
}

/**
 * Adjusts acoustics based on event category.
 */
function adjustAcoustics(
  acoustics: VenueSensoryDefaults['acoustics'],
  category: CulturalGenreExtended,
): VenueSensoryDefaults['acoustics'] {
  const musicCategories: CulturalGenreExtended[] = ['music', 'dance'];
  const quietCategories: CulturalGenreExtended[] = ['literature', 'heritage', 'visual_arts'];

  if (musicCategories.includes(category)) {
    return {
      ...acoustics,
      musicCapability: true,
      reverberation: 'moderate',
      ambientNoise: Math.min(60, acoustics.ambientNoise + 15),
    };
  }

  if (quietCategories.includes(category)) {
    return {
      ...acoustics,
      reverberation: 'intimate',
      ambientNoise: Math.max(10, acoustics.ambientNoise - 15),
    };
  }

  return acoustics;
}

/**
 * Adjusts temperature based on expected attendance density.
 * More people = more body heat = lower thermostat needed.
 */
function adjustTemperature(
  temperature: VenueSensoryDefaults['temperature'],
  expectedAttendance: number,
  venueType: VenueType,
): VenueSensoryDefaults['temperature'] {
  const maxCapacity = inferMaxCapacity(venueType);
  const density = maxCapacity > 0 ? expectedAttendance / maxCapacity : 0.5;

  // Higher density → lower temperature
  const adjustment = density > 0.8 ? -1.5
    : density > 0.6 ? -0.5
    : density < 0.3 ? 0.5
    : 0;

  return {
    ideal: Math.round((temperature.ideal + adjustment) * 10) / 10,
    range: temperature.range,
  };
}

/**
 * Adjusts flow pattern based on event category and formality.
 */
function adjustFlowPattern(
  defaultPattern: 'linear' | 'circular' | 'open' | 'tiered',
  category: CulturalGenreExtended,
  formality: FormalityLevel,
): 'linear' | 'circular' | 'open' | 'tiered' {
  // Theater/performance → tiered
  if (['theater', 'dance'].includes(category)) return 'tiered';

  // Formal dinners → circular (round tables)
  if (['formal', 'black_tie', 'white_tie'].includes(formality)) return 'circular';

  // Casual social → open
  if (formality === 'casual') return 'open';

  return defaultPattern;
}

/**
 * Derives an aroma suggestion based on event category.
 */
function deriveAroma(category: CulturalGenreExtended): string {
  const aromaMap: Record<string, string> = {
    gastronomy: 'luxury',
    wine_spirits: 'aromatic',
    music: 'neutral',
    theater: 'neutral',
    dance: 'neutral',
    visual_arts: 'fresh',
    literature: 'fresh',
    heritage: 'aromatic',
    wellness_cultural: 'aromatic',
    lectures: 'neutral',
    workshops: 'neutral',
    family: 'fresh',
    seasonal: 'aromatic',
    contemporary: 'neutral',
  };
  return aromaMap[category] ?? 'neutral';
}

/**
 * Whether the event category needs dynamic lighting capability.
 */
function canDynamicLighting(category: CulturalGenreExtended): boolean {
  const dynamicCategories: CulturalGenreExtended[] = [
    'music', 'dance', 'theater', 'contemporary',
  ];
  return dynamicCategories.includes(category);
}

/**
 * Computes sound isolation score for a venue type.
 */
function computeSoundIsolation(venueType: VenueType): number {
  const isolation: Record<string, number> = {
    auditorium: 90,
    ballroom: 70,
    lounge: 80,
    garden: 20,
    terrace: 25,
    poolside: 15,
  };
  return isolation[venueType] ?? 50;
}

/**
 * Infers ventilation type from venue type.
 */
function inferVentilation(
  venueType: VenueType,
): 'natural' | 'mixed' | 'controlled' {
  const outdoor: VenueType[] = ['garden', 'terrace', 'poolside'];
  if (outdoor.includes(venueType)) return 'natural';
  if (venueType === 'auditorium') return 'controlled';
  return 'mixed';
}

/**
 * Infers max capacity from venue type.
 */
function inferMaxCapacity(venueType: VenueType): number {
  const capacities: Record<string, number> = {
    ballroom: 200,
    garden: 150,
    terrace: 80,
    lounge: 40,
    auditorium: 300,
    poolside: 100,
  };
  return capacities[venueType] ?? 100;
}

/**
 * Suggests layout configurations based on event category and formality.
 */
function suggestConfigurations(
  category: CulturalGenreExtended,
  formality: FormalityLevel,
): string[] {
  const configs: string[] = [];

  // Theater/performance events
  if (['theater', 'dance', 'music'].includes(category)) {
    configs.push('theater');
  }

  // Formal events
  if (['formal', 'black_tie', 'white_tie'].includes(formality)) {
    configs.push('banquet');
  }

  // Social events
  if (['gastronomy', 'wine_spirits', 'family'].includes(category)) {
    configs.push('cocktail', 'banquet');
  }

  // Educational events
  if (['literature', 'lectures', 'workshops', 'heritage'].includes(category)) {
    configs.push('classroom');
  }

  // Always include cocktail as fallback
  if (configs.length === 0) {
    configs.push('cocktail');
  }

  // Remove duplicates
  return [...new Set(configs)];
}

/**
 * Computes layout flexibility score for a venue type.
 */
function computeLayoutFlexibility(venueType: VenueType): number {
  const flexibility: Record<string, number> = {
    ballroom: 85,
    garden: 90,
    terrace: 70,
    lounge: 40,
    auditorium: 20,
    poolside: 50,
  };
  return flexibility[venueType] ?? 50;
}

/**
 * Computes layout capacity adjusted for event attendance.
 */
function computeLayoutCapacity(
  venueType: VenueType,
  expectedAttendance: number,
): number {
  const maxCap = inferMaxCapacity(venueType);
  // Don't exceed max, but allow up to 90% comfortably
  return Math.min(maxCap, Math.round(expectedAttendance * 1.1));
}

/**
 * Whether the event category needs a stage.
 */
function needsStage(category: CulturalGenreExtended): boolean {
  const stageCategories: CulturalGenreExtended[] = [
    'music', 'theater', 'dance', 'lectures',
  ];
  return stageCategories.includes(category);
}

/**
 * Aggregates multiple member sensory preferences into a single profile.
 * Uses majority vote for categorical preferences.
 */
function aggregateMemberPreferences(
  preferences: SensoryPreferences[],
): SensoryPreferences {
  if (preferences.length === 0) {
    return {
      lightingMood: 'ambient',
      noiseLevel: 'conversational',
      spaceFeeling: 'cozy',
      formalityLevel: 'smart_casual',
    };
  }

  // Majority vote for each dimension
  return {
    lightingMood: majorityVote(preferences.map((p) => p.lightingMood)) as SensoryPreferences['lightingMood'],
    noiseLevel: majorityVote(preferences.map((p) => p.noiseLevel)) as SensoryPreferences['noiseLevel'],
    spaceFeeling: majorityVote(preferences.map((p) => p.spaceFeeling)) as SensoryPreferences['spaceFeeling'],
    formalityLevel: majorityVote(preferences.map((p) => p.formalityLevel)) as SensoryPreferences['formalityLevel'],
  };
}

/**
 * Applies member preference overrides to lighting.
 * Only overrides mood if members strongly prefer something different.
 */
function applyPreferenceOverrides(
  lighting: VenueSensoryDefaults['lighting'],
  preferences: SensoryPreferences,
): VenueSensoryDefaults['lighting'] {
  const moodMap: Record<string, VenueSensoryDefaults['lighting']['mood']> = {
    bright: 'bright',
    ambient: 'ambient',
    dim: 'intimate',
    dramatic: 'dramatic',
  };

  const preferredMood = moodMap[preferences.lightingMood];
  if (preferredMood && preferredMood !== lighting.mood) {
    return {
      ...lighting,
      mood: preferredMood,
    };
  }

  return lighting;
}

// ══════════════════════════════════════════════════════════
//  SHARED UTILITIES
// ══════════════════════════════════════════════════════════

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Majority vote for categorical values.
 * Returns the most common value in the array.
 */
function majorityVote(values: string[]): string {
  if (values.length === 0) return '';

  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] ?? 0) + 1;
  }

  return Object.entries(counts).reduce(
    (max, [val, count]) => (count > (max[1] ?? 0) ? [val, count] : max),
    ['', 0],
  )[0];
}