/**
 * Taste Profile Engine — Cultural Domain
 *
 * Builds the Cultural Taste Genome for a member: a multidimensional
 * model of how they experience, prefer, and evolve culturally.
 *
 * This engine answers: "What does culture MEAN to this person?"
 * Not just "what events do they attend" but "how do they experience
 * culture — deeply or superficially, socially or solo, ritually or
 * spontaneously?"
 *
 * Pure functions only — no hooks, no state, no side effects.
 * All thresholds from config.ts. All types from types.ts.
 *
 * Engines:
 * §C1 buildTasteProfile    — Constructs complete taste genome from history
 * §C2 deriveCulturalDNA    — Extracts 6 psychographic dimensions
 *
 * @module cultural/lib/tasteProfile
 */

import type {
  CulturalCategory
} from '../types';
import type {
  TasteProfile,
  CulturalDNA,
  GenreAffinity,
  CulturalGenreExtended,
  CulturalTemporalPattern,
  SensoryPreferences,
} from '../types';
import {
  CULTURAL_GENRE_EXTENDED,
  CULTURAL_MUTATION_THRESHOLDS,
} from '../config';

// ══════════════════════════════════════════════════════════
//  RAW INPUT TYPES (from MCP backend)
// ══════════════════════════════════════════════════════════

/**
 * Raw member cultural attendance record from MCP.
 * Matches get_member_cultural_history response shape.
 */
export interface MemberAttendanceRecord {
  event_id: string;
  event_name: string;
  event_type: string;
  category: CulturalCategory;
  venue: string;
  date: string;
  start_time: string;
  end_time: string;
  formality: string;
  satisfaction_score?: number;  // 0-100, optional feedback
  attended_with?: string[];     // companion member IDs
  was_solo?: boolean;
}

/**
 * Raw member cultural preferences from MCP.
 * Matches get_member_cultural_preferences response shape.
 */
export interface MemberCulturalPreferences {
  preferred_categories?: CulturalCategory[];
  preferred_formality?: string;
  preferred_venues?: string[];
  preferred_time_of_day?: string;
  preferred_group_size?: string;
  notes?: string;
}

/**
 * Raw event feedback from MCP.
 * Used to compute satisfaction signals.
 */
export interface MemberEventFeedback {
  event_id: string;
  rating: number;               // 1-5 or 0-100
  comment?: string;
  would_recommend?: boolean;
  would_attend_again?: boolean;
  date: string;
}

// ══════════════════════════════════════════════════════════
//  §C1: BUILD TASTE PROFILE
// ══════════════════════════════════════════════════════════

/**
 * §C1 — Builds the complete Cultural Taste Profile for a member.
 *
 * Analyzes attendance history, feedback, and explicit preferences
 * to construct a multidimensional taste genome. The profile includes:
 * — Genre affinities (which cultural genres resonate)
 * — CulturalDNA (psychographic dimensions)
 * — Temporal patterns (when they prefer cultural experiences)
 * — Social preferences (solo vs group)
 * — Taste velocity (how fast their taste is evolving)
 * — Exploration index (comfort zone vs explorer)
 *
 * @param memberId — Target member ID.
 * @param attendanceHistory — Raw attendance records from MCP.
 * @param feedback — Event feedback/satisfaction data from MCP.
 * @param preferences — Explicit preferences from MCP (optional).
 * @returns Complete TasteProfile with all dimensions computed.
 */
export function buildTasteProfile(
  memberId: string,
  attendanceHistory: MemberAttendanceRecord[],
  feedback: MemberEventFeedback[],
  preferences?: MemberCulturalPreferences,
): TasteProfile {
  // 1. Build feedback lookup for quick access
  const feedbackByEvent = new Map<string, MemberEventFeedback>();
  for (const fb of feedback) {
    feedbackByEvent.set(fb.event_id, fb);
  }

  // 2. Compute genre affinities from attendance + feedback
  const genrePreferences = buildGenreAffinities(
    attendanceHistory,
    feedbackByEvent,
  );

  // 3. Derive CulturalDNA
  const culturalDNA = deriveCulturalDNA(
    attendanceHistory,
    feedback,
    genrePreferences,
  );

  // 4. Detect temporal patterns
  const temporalPatterns = buildTemporalPatterns(attendanceHistory);

  // 5. Determine social preference
  const socialPreference = inferSocialPreference(attendanceHistory);

  // 6. Calculate taste velocity (expansion rate over time)
  const tasteVelocity = computeTasteVelocity(attendanceHistory);

  // 7. Calculate exploration index
  const explorationIndex = computeExplorationIndex(
    genrePreferences,
    attendanceHistory,
  );

  // 8. Calculate depth vs breadth
  const depthVsBreadth = computeDepthVsBreadth(genrePreferences);

  // 9. Infer sensory preferences from venue correlation
  const sensoryPreferences = inferSensoryPreferences(
    attendanceHistory,
    preferences,
  );

  // 10. Compute profile confidence based on data volume
  const dataPoints = attendanceHistory.length;
  const profileConfidence = computeProfileConfidence(dataPoints, feedback.length);

  return {
    memberId,
    genrePreferences,
    culturalDNA,
    temporalPatterns,
    socialPreference,
    tasteVelocity,
    explorationIndex,
    depthVsBreadth,
    sensoryPreferences,
    profileConfidence,
    dataPoints,
  };
}

// ══════════════════════════════════════════════════════════
//  §C2: DERIVE CULTURAL DNA
// ══════════════════════════════════════════════════════════

/**
 * §C2 — Extracts the 6-dimension CulturalDNA from behavioral signals.
 *
 * Each dimension is a composite of multiple behavioral indicators:
 *
 * openness:         diversity of genres attended + new genre acceptance
 * depth:            repeat attendance + workshop participation + feedback richness
 * sociality:        group vs solo attendance ratio
 * adventurousness:  genre expansion over time + stretch event acceptance
 * ritualism:        recurring events + seasonal traditions + routine patterns
 * aesthetic_sensitivity: venue preference strength + feedback detail richness
 *
 * @param attendanceHistory — Raw attendance records.
 * @param feedback — Event feedback records.
 * @param genrePreferences — Pre-computed genre affinities.
 * @returns CulturalDNA with 6 dimensions + composite scores.
 */
export function deriveCulturalDNA(
  attendanceHistory: MemberAttendanceRecord[],
  feedback: MemberEventFeedback[],
  genrePreferences: Record<CulturalGenreExtended, GenreAffinity>,
): CulturalDNA {
  const activeGenres = Object.values(genrePreferences).filter(
    (g) => g.eventCount > 0,
  );

  // ── Openness: diversity of genres + willingness to try new ──
  const totalGenres = Object.keys(CULTURAL_GENRE_EXTENDED).length;
  const activeCount = activeGenres.length;
  const genreDiversity = totalGenres > 0
    ? Math.round((activeCount / totalGenres) * 100)
    : 0;

  const growingGenres = activeGenres.filter(
    (g) => g.trend === 'growing',
  ).length;
  const opennessSignal = activeGenres.length > 0
    ? Math.round((growingGenres / activeGenres.length) * 100)
    : 0;

  const openness = Math.round(
    genreDiversity * 0.6 + opennessSignal * 0.4,
  );

  // ── Depth: how deeply they engage when they attend ──
  const deepExperts = activeGenres.filter(
    (g) => g.depth === 'deep' || g.depth === 'expert',
  ).length;
  const depthRatio = activeGenres.length > 0
    ? Math.round((deepExperts / activeGenres.length) * 100)
    : 0;

  const repeatAttendee = attendanceHistory.length > 10 ? 100
    : attendanceHistory.length > 5 ? 70
    : attendanceHistory.length > 2 ? 40
    : 15;

  const feedbackRichness = feedback.filter(
    (f) => f.comment && f.comment.length > 20,
  ).length;
  const feedbackDepth = feedback.length > 0
    ? Math.min(100, Math.round((feedbackRichness / feedback.length) * 100 + 30))
    : 0;

  const depth = Math.round(
    depthRatio * 0.4 + repeatAttendee * 0.3 + feedbackDepth * 0.3,
  );

  // ── Sociality: social vs solo cultural engagement ──
  const groupEvents = attendanceHistory.filter(
    (a) => !a.was_solo && (a.attended_with?.length ?? 0) > 0,
  ).length;
  const soloEvents = attendanceHistory.filter(
    (a) => a.was_solo,
  ).length;
  const totalSocial = groupEvents + soloEvents;

  const socialRatio = totalSocial > 0
    ? Math.round((groupEvents / totalSocial) * 100)
    : 50; // default neutral

  const sociality = clamp(
    socialRatio + (attendanceHistory.length > 10 ? 10 : 0),
    0,
    100,
  );

  // ── Adventurousness: novelty seeking vs comfort ──
  const recentEvents = getRecentEvents(attendanceHistory, 90);
  const recentGenres = new Set(recentEvents.map((e) => e.category));
  const olderEvents = attendanceHistory.filter(
    (e) => !recentEvents.includes(e),
  );
  const olderGenres = new Set(olderEvents.map((e) => e.category));

  // New genres in recent period that weren't in older period
  let newGenreCount = 0;
  for (const genre of recentGenres) {
    if (!olderGenres.has(genre)) newGenreCount++;
  }

  const adventurousness = recentGenres.size > 0
    ? clamp(
        Math.round((newGenreCount / recentGenres.size) * 100 + 20),
        0,
        100,
      )
    : 30;

  // ── Ritualism: routine and tradition patterns ──
  const recurringEvents = countRecurringPatterns(attendanceHistory);
  const ritualism = clamp(
    Math.round(recurringEvents * 20 + 20),
    0,
    100,
  );

  // ── Aesthetic Sensitivity: venue consistency + feedback detail ──
  const uniqueVenues = new Set(attendanceHistory.map((a) => a.venue)).size;
  const venueConsistency = attendanceHistory.length > 0
    ? Math.round(
        (1 - (uniqueVenues / attendanceHistory.length)) * 100 + 50,
      )
    : 50;

  const detailedFeedback = feedback.filter(
    (f) => f.comment && f.comment.length > 50,
  ).length;
  const aestheticSignal = feedback.length > 0
    ? Math.round((detailedFeedback / feedback.length) * 100 + 20)
    : 30;

  const aesthetic_sensitivity = clamp(
    Math.round(venueConsistency * 0.5 + aestheticSignal * 0.5),
    0,
    100,
  );

  // ── Composite scores ──
  const cultural_maturity = Math.round(
    openness * 0.2 +
    depth * 0.25 +
    adventurousness * 0.2 +
    aesthetic_sensitivity * 0.2 +
    ritualism * 0.15,
  );

  const engagement_intensity = Math.round(
    depth * 0.4 + sociality * 0.3 + aesthetic_sensitivity * 0.3,
  );

  return {
    openness: clamp(openness, 0, 100),
    depth: clamp(depth, 0, 100),
    sociality: clamp(sociality, 0, 100),
    adventurousness: clamp(adventurousness, 0, 100),
    ritualism: clamp(ritualism, 0, 100),
    aesthetic_sensitivity: clamp(aesthetic_sensitivity, 0, 100),
    cultural_maturity: clamp(cultural_maturity, 0, 100),
    engagement_intensity: clamp(engagement_intensity, 0, 100),
  };
}

// ══════════════════════════════════════════════════════════
//  INTERNAL HELPERS (not exported)
// ══════════════════════════════════════════════════════════

/**
 * Maps backend CulturalCategory to extended genre taxonomy.
 * Returns the category itself if it's already in the extended set,
 * or the first matching extended genre via backendMapping.
 */
function categoryToGenre(category: CulturalCategory): CulturalGenreExtended {
  const config = CULTURAL_GENRE_EXTENDED[category];
  if (config?.isBackendCategory) return category;
  return category;
}

/**
 * Builds genre affinity data from attendance history and feedback.
 */
function buildGenreAffinities(
  attendance: MemberAttendanceRecord[],
  feedbackByEvent: Map<string, MemberEventFeedback>,
): Record<CulturalGenreExtended, GenreAffinity> {
  // Initialize all genres with zero affinity
  const affinities: Record<string, GenreAffinity> = {};
  for (const [genreKey, ] of Object.entries(CULTURAL_GENRE_EXTENDED)) {
    affinities[genreKey] = {
      genre: genreKey as CulturalGenreExtended,
      affinityScore: 0,
      eventCount: 0,
      avgSatisfaction: 0,
      lastAttended: '',
      trend: 'stable',
      depth: 'surface',
      subGenres: {},
    };
  }

  // Accumulate attendance data per genre
  const genreSatisfactionAccum: Record<string, number[]> = {};
  const genreDates: Record<string, string[]> = {};

  for (const record of attendance) {
    const genre = categoryToGenre(record.category);
    const aff = affinities[genre];
    if (!aff) continue;

    aff.eventCount += 1;

    // Track satisfaction
    const fb = feedbackByEvent.get(record.event_id);
    const satisfaction = fb?.rating ?? record.satisfaction_score;
    if (satisfaction !== undefined) {
      if (!genreSatisfactionAccum[genre]) genreSatisfactionAccum[genre] = [];
      genreSatisfactionAccum[genre].push(
        satisfaction > 5 ? satisfaction : satisfaction * 20, // normalize 1-5 → 0-100
      );
    }

    // Track dates for recency and trend
    if (!genreDates[genre]) genreDates[genre] = [];
    genreDates[genre].push(record.date);

    // Track last attended
    if (!aff.lastAttended || record.date > aff.lastAttended) {
      aff.lastAttended = record.date;
    }

    // Track event types as sub-genres
    const subGenre = record.event_type;
    aff.subGenres[subGenre] = (aff.subGenres[subGenre] ?? 0) + 1;
  }

  // Compute derived fields per genre
  for (const [genreKey, aff] of Object.entries(affinities)) {
    const affTyped = aff as GenreAffinity;

    // Average satisfaction
    const satAccum = genreSatisfactionAccum[genreKey];
    if (satAccum && satAccum.length > 0) {
      affTyped.avgSatisfaction = Math.round(
        satAccum.reduce((s, v) => s + v, 0) / satAccum.length,
      );
    }

    // Affinity score (weighted composite)
    if (affTyped.eventCount > 0) {
      const recencyBonus = computeRecencyBonus(affTyped.lastAttended);
      affTyped.affinityScore = Math.min(
        100,
        Math.round(
          Math.min(60, affTyped.eventCount * 8) +        // volume (max 60)
          affTyped.avgSatisfaction * 0.3 +                // satisfaction (max 30)
          recencyBonus * 0.1                              // recency (max 10)
        ),
      );
    }

    // Trend: compare recent vs older attendance
    const dates = genreDates[genreKey];
    if (dates && dates.length >= CULTURAL_MUTATION_THRESHOLDS.MIN_EVENTS_FOR_BASELINE) {
      affTyped.trend = computeGenreTrend(dates);
    }

    // Depth classification
    affTyped.depth = classifyGenreDepth(
      affTyped.eventCount,
      affTyped.avgSatisfaction,
    );
  }

  return affinities as Record<CulturalGenreExtended, GenreAffinity>;
}

/**
 * Builds temporal patterns from attendance history.
 * Detects preferred day of week, time of day, frequency, and seasonality.
 */
function buildTemporalPatterns(
  attendance: MemberAttendanceRecord[],
): CulturalTemporalPattern[] {
  if (attendance.length === 0) return [];

  // Count events by day of week
  const dayCounts: Record<number, number> = {};
  const timeCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  const monthCounts: Record<string, number> = {};

  for (const record of attendance) {
    const date = new Date(record.date);
    const day = date.getDay();
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;

    // Classify time of day from start_time
    const hour = parseInt(record.start_time?.split(':')[0] ?? '12', 10);
    if (hour < 12) timeCounts.morning += 1;
    else if (hour < 17) timeCounts.afternoon += 1;
    else if (hour < 21) timeCounts.evening += 1;
    else timeCounts.night += 1;

    // Monthly for seasonal tendency
    const month = String(date.getMonth() + 1);
    monthCounts[month] = (monthCounts[month] ?? 0) + 1;
  }

  // Find dominant day
  const dominantDay = Object.entries(dayCounts).reduce(
    (max, [day, count]) => (count > (max[1] ?? 0) ? [day, count] : max),
    ['0', 0],
  );

  // Find dominant time
  const dominantTime = Object.entries(timeCounts).reduce(
    (max, [time, count]) => (count > (max[1] ?? 0) ? [time, count] : max),
    ['evening', 0],
  );

  // Estimate frequency
  const totalDays = attendance.length > 1
    ? Math.abs(
        new Date(attendance[attendance.length - 1].date).getTime() -
        new Date(attendance[0].date).getTime(),
      ) / (1000 * 60 * 60 * 24)
    : 30;
  const eventsPerMonth = attendance.length / Math.max(1, totalDays / 30);

  const frequency: CulturalTemporalPattern['frequency'] =
    eventsPerMonth >= 3 ? 'weekly' :
    eventsPerMonth >= 1.5 ? 'biweekly' :
    eventsPerMonth >= 0.5 ? 'monthly' :
    'occasional';

  // Compute advance booking days (estimate from data gaps)
  const advanceBookingDays = Math.round(eventsPerMonth > 0
    ? 30 / eventsPerMonth / 2
    : 14);

  return [{
    dayOfWeek: parseInt(dominantDay[0], 10),
    timeOfDay: dominantTime[0] as CulturalTemporalPattern['timeOfDay'],
    frequency,
    seasonalTendency: monthCounts,
    advanceBookingDays,
  }];
}

/**
 * Infers social preference from attendance patterns.
 */
function inferSocialPreference(
  attendance: MemberAttendanceRecord[],
): TasteProfile['socialPreference'] {
  if (attendance.length === 0) return 'varies';

  const solo = attendance.filter((a) => a.was_solo).length;
  const couple = attendance.filter(
    (a) => (a.attended_with?.length ?? 0) === 1,
  ).length;
  const smallGroup = attendance.filter(
    (a) => {
      const size = a.attended_with?.length ?? 0;
      return size >= 2 && size <= 4;
    },
  ).length;
  const largeGroup = attendance.filter(
    (a) => (a.attended_with?.length ?? 0) > 4,
  ).length;

  const max = Math.max(solo, couple, smallGroup, largeGroup);
  if (max === solo) return 'solo';
  if (max === couple) return 'couple';
  if (max === smallGroup) return 'small_group';
  if (max === largeGroup) return 'large_group';
  return 'varies';
}

/**
 * Computes taste velocity: how fast the member's taste is expanding
 * or contracting over time.
 *
 * Positive = expanding (trying new genres).
 * Negative = contracting (sticking to fewer genres).
 * Range: -100 to +100.
 */
function computeTasteVelocity(
  attendance: MemberAttendanceRecord[],
): number {
  if (attendance.length < 4) return 0;

  const midpoint = Math.floor(attendance.length / 2);
  const olderHalf = attendance.slice(0, midpoint);
  const recentHalf = attendance.slice(midpoint);

  const olderGenres = new Set(olderHalf.map((a) => a.category)).size;
  const recentGenres = new Set(recentHalf.map((a) => a.category)).size;

  const diff = recentGenres - olderGenres;
  const maxPossible = Object.keys(CULTURAL_GENRE_EXTENDED).length;

  return clamp(
    Math.round((diff / Math.max(1, maxPossible)) * 200),
    -100,
    100,
  );
}

/**
 * Computes exploration index: how far from comfort zone the member ventures.
 *
 * 0   = pure comfort zone (only attends familiar genres)
 * 100 = true explorer (constantly trying new things)
 */
function computeExplorationIndex(
  genrePreferences: Record<CulturalGenreExtended, GenreAffinity>,
  attendance: MemberAttendanceRecord[],
): number {
  const activeGenres = Object.values(genrePreferences).filter(
    (g) => g.eventCount > 0,
  );

  if (activeGenres.length === 0) return 0;

  // Growing genres = exploration signal
  const growingCount = activeGenres.filter((g) => g.trend === 'growing').length;
  const growingRatio = growingCount / activeGenres.length;

  // Genre diversity
  const totalPossible = Object.keys(CULTURAL_GENRE_EXTENDED).length;
  const diversityRatio = activeGenres.length / totalPossible;

  // Recent new genres
  const recentEvents = getRecentEvents(attendance, 90);
  const recentGenres = new Set(recentEvents.map((e) => e.category));
  new Set(attendance.map((a) => a.category));
  let newRecentCount = 0;
  for (const g of recentGenres) {
    const olderWithGenre = attendance.filter(
      (a) => a.category === g && !recentEvents.includes(a),
    );
    if (olderWithGenre.length === 0) newRecentCount++;
  }
  const newGenreRatio = recentGenres.size > 0
    ? newRecentCount / recentGenres.size
    : 0;

  return clamp(
    Math.round(
      growingRatio * 35 +
      diversityRatio * 35 +
      newGenreRatio * 30
    ),
    0,
    100,
  );
}

/**
 * Computes depth vs breadth preference.
 *
 * 0   = deep specialist (few genres, high depth)
 * 100 = broad generalist (many genres, surface level)
 */
function computeDepthVsBreadth(
  genrePreferences: Record<CulturalGenreExtended, GenreAffinity>,
): number {
  const active = Object.values(genrePreferences).filter(
    (g) => g.eventCount > 0,
  );

  if (active.length === 0) return 50;

  const totalPossible = Object.keys(CULTURAL_GENRE_EXTENDED).length;
  const breadthScore = Math.round((active.length / totalPossible) * 100);

  const deepCount = active.filter(
    (g) => g.depth === 'deep' || g.depth === 'expert',
  ).length;
  const depthScore = active.length > 0
    ? Math.round((deepCount / active.length) * 100)
    : 0;

  // High breadth + low depth = generalist
  // Low breadth + high depth = specialist
  return clamp(
    Math.round(breadthScore * 0.6 + (100 - depthScore) * 0.4),
    0,
    100,
  );
}

/**
 * Infers sensory preferences from venue attendance patterns
 * and explicit preferences.
 */
function inferSensoryPreferences(
  attendance: MemberAttendanceRecord[],
  preferences?: MemberCulturalPreferences,
): SensoryPreferences {
  // Default neutral preferences
  const defaults: SensoryPreferences = {
    lightingMood: 'ambient',
    noiseLevel: 'conversational',
    spaceFeeling: 'cozy',
    formalityLevel: 'smart_casual',
  };

  if (attendance.length === 0) return defaults;

  // Infer formality from attendance
  const formalEvents = attendance.filter(
    (a) => a.formality === 'formal' || a.formality === 'black_tie',
  ).length;
  attendance.filter(
        (a) => a.formality === 'casual',
      ).length;

  const formalityRatio = attendance.length > 0
    ? formalEvents / attendance.length
    : 0.5;

  const formalityLevel: SensoryPreferences['formalityLevel'] =
    formalityRatio > 0.7 ? 'formal' :
    formalityRatio > 0.4 ? 'smart_casual' :
    formalityRatio > 0.2 ? 'casual' :
    'casual';

  // Infer space feeling from venue patterns
  const venueCounts: Record<string, number> = {};
  for (const a of attendance) {
    venueCounts[a.venue] = (venueCounts[a.venue] ?? 0) + 1;
  }
  Object.entries(venueCounts).reduce(
        (max, [venue, count]) => (count > (max[1] ?? 0) ? [venue, count] : max),
        ['', 0],
      );

  // Override with explicit preferences if available
  const preferredFormality = preferences?.preferred_formality;
  const explicitFormality = preferredFormality
    ? (preferredFormality as SensoryPreferences['formalityLevel'])
    : formalityLevel;

  return {
    lightingMood: defaults.lightingMood,
    noiseLevel: defaults.noiseLevel,
    spaceFeeling: defaults.spaceFeeling,
    formalityLevel: explicitFormality,
  };
}

/**
 * Computes profile confidence based on data volume.
 *
 * More data points = higher confidence. Feedback adds more signal
 * than raw attendance alone.
 *
 * @param attendanceCount — Total attendance records.
 * @param feedbackCount — Total feedback records.
 * @returns Confidence 0-1.
 */
function computeProfileConfidence(
  attendanceCount: number,
  feedbackCount: number,
): number {
  // Sigmoid-like curve: confidence grows quickly then plateaus
  const dataSignal = Math.min(1, attendanceCount / 20);  // caps at 20 events
  const feedbackSignal = Math.min(1, feedbackCount / 10); // caps at 10 feedbacks

  return Math.round(
    (dataSignal * 0.6 + feedbackSignal * 0.4) * 100,
  ) / 100;
}

// ══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════

/** Clamps a number between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Gets events from the last N days. */
function getRecentEvents(
  attendance: MemberAttendanceRecord[],
  days: number,
): MemberAttendanceRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return attendance.filter((a) => a.date >= cutoffStr);
}

/**
 * Computes recency bonus for an event date.
 * Recent events get higher bonus.
 */
function computeRecencyBonus(lastAttended: string): number {
  if (!lastAttended) return 0;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastAttended).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSince < 7) return 100;
  if (daysSince < 30) return 70;
  if (daysSince < 90) return 40;
  return 10;
}

/**
 * Computes genre trend from date array.
 * Compares recent half vs older half attendance in this genre.
 */
function computeGenreTrend(
  dates: string[],
): 'growing' | 'stable' | 'declining' {
  if (dates.length < 2) return 'stable';

  const sorted = [...dates].sort();
  const midpoint = Math.floor(sorted.length / 2);
  const olderCount = midpoint;
  const recentCount = sorted.length - midpoint;

  if (recentCount > olderCount * 1.3) return 'growing';
  if (recentCount < olderCount * 0.7) return 'declining';
  return 'stable';
}

/**
 * Classifies genre depth based on event count and satisfaction.
 */
function classifyGenreDepth(
  eventCount: number,
  avgSatisfaction: number,
): 'surface' | 'moderate' | 'deep' | 'expert' {
  if (eventCount >= 10 && avgSatisfaction >= 70) return 'expert';
  if (eventCount >= 5 && avgSatisfaction >= 60) return 'deep';
  if (eventCount >= 3) return 'moderate';
  return 'surface';
}

/**
 * Counts recurring attendance patterns (same day/time, same venue).
 * Higher count = more ritualistic behavior.
 */
function countRecurringPatterns(
  attendance: MemberAttendanceRecord[],
): number {
  if (attendance.length < 3) return 0;

  const patternCounts: Record<string, number> = {};

  for (const record of attendance) {
    const date = new Date(record.date);
    const day = date.getDay();
    const hour = parseInt(record.start_time?.split(':')[0] ?? '0', 10);
    const key = `${day}-${Math.floor(hour / 4)}-${record.venue}`;
    patternCounts[key] = (patternCounts[key] ?? 0) + 1;
  }

  // Count patterns that repeat 3+ times
  return Object.values(patternCounts).filter((count) => count >= 3).length;
}