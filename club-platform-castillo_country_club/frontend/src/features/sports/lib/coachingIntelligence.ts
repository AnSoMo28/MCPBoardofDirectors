/**
 * src/features/sports/lib/coachingIntelligence.ts
 * ═══════════════════════════════════════════════════════════
 * §S5 — Coaching Intelligence Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Coaching Intelligence Engine analyzes coaching
 * effectiveness, generates periodized training plans,
 * detects coaching-specific plateaus, matches coach styles
 * to member athletic levels, and measures coaching outcomes.
 *
 * Functions:
 *   buildCoachingProfile()         — Complete coach profile from sessions
 *   buildCoachingProfileSafe()     — Degraded wrapper, never throws
 *   buildTrainingPlan()            — Periodized plan with predicted outcome
 *   detectTrainingPlateau()        — Coaching-specific plateau detection
 *   matchCoachStyleCompatibility() — Coach style ↔ member level pairing
 *   computeCoachingOutcome()       — Before/after performance delta
 *   buildCoachingTimeline()        — Training phase visualization data
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S5
 */

import type {
  CoachingProfile,
  TrainingPlan,
  TrainingWeek,
  TrainingSessionPlan,
  PlateauDetection,
  CoachingOutcome,
  CrossSportBenefit,
  AthleticProfile,
  AthleticAxisRecord,
  SkillTrajectoryPoint,
  SportSession,
  Competition
} from "../types";

import {
  AthleticAxis,
  AthleticLevel,
  CoachingStyle,
  SportType,
  SPORT_CONFIG,
} from "../types";

import {
  COACHING_CONFIG,
  ATHLETIC_CONFIG,
} from "../config";


// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** All coaching styles for iteration */
const ALL_STYLES = Object.values(CoachingStyle);

/** All athletic axes for iteration */
const ALL_AXES = Object.values(AthleticAxis);

/** Days in one week in ms */
const MS_PER_WEEK = 7 * 86_400_000;

/** Days in one day in ms */
const MS_PER_DAY = 86_400_000;

/** Minimum sessions to build a coaching profile */
const MIN_SESSIONS_PROFILE = COACHING_CONFIG.MIN_SESSIONS_FOR_SUCCESS_RATE;

/** Default plan duration in weeks */
const DEFAULT_PLAN_WEEKS = COACHING_CONFIG.DEFAULT_PLAN_WEEKS;

/** Recovery week frequency */
const RECOVERY_WEEK_FREQ = COACHING_CONFIG.RECOVERY_WEEK_FREQUENCY;
/** Plateau intervention threshold in weeks */
const PLATEAU_INTERVENTION_WEEKS = COACHING_CONFIG.PLATEAU_INTERVENTION_WEEKS;
/** Abandonment risk weights */
const ABANDON_HIGH_INTENSITY = COACHING_CONFIG.ABANDONMENT_HIGH_INTENSITY_WEIGHT;
const ABANDON_LOW_COMPAT = COACHING_CONFIG.ABANDONMENT_LOW_COMPATIBILITY_WEIGHT;
const ABANDON_PLATEAU = COACHING_CONFIG.ABANDONMENT_PLATEAU_WEIGHT;

/** Style compatibility config */
const STYLE_COMPAT = COACHING_CONFIG.STYLE_COMPATIBILITY;

/** Training session days per sessions-per-week count */
const SESSION_DAYS_BY_COUNT: Record<number, readonly number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
};

/** Default session duration in minutes */
const DEFAULT_SESSION_DURATION = 60;

/** Session duration range */
const MIN_DURATION = 40;
/** Intensity labels for TrainingWeek */
type IntensityLabel = "recovery" | "moderate" | "intense" | "peak";

/**
 * Periodization model — local type since no enum exists in types.ts.
 * Controls how training load varies across the plan.
 */
type PeriodizationModel = "linear" | "undulating" | "block";

/**
 * Focus axis per drill suggestion.
 */
const AXIS_DRILLS: Record<AthleticAxis, readonly string[]> = {
  [AthleticAxis.POWER]: [
    "Ejercicios de potencia explosiva",
    "Pliometría adaptada al deporte",
    "Trabajo de fuerza funcional",
  ],
  [AthleticAxis.SPEED]: [
    "Sprints y aceleraciones cortas",
    "Drills de agilidad y cambio de dirección",
    "Ejercicios de tiempo de reacción",
  ],
  [AthleticAxis.ENDURANCE]: [
    "Intervalos de alta intensidad",
    "Circuito de resistencia deportiva",
    "Trabajo aeróbico continuo variado",
  ],
  [AthleticAxis.TECHNIQUE]: [
    "Drills técnicos específicos del deporte",
    "Repetición de movimientos clave",
    "Videoanálisis y corrección postural",
  ],
  [AthleticAxis.TACTICAL]: [
    "Simulación de juego real",
    "Análisis de patrones de competencia",
    "Juegos tácticos en espacio reducido",
  ],
  [AthleticAxis.MENTAL]: [
    "Ejercicios de visualización",
    "Entrenamiento bajo presión controlada",
    "Técnicas de concentración y mindfulness",
  ],
};

/**
 * Coaching style labels for UI display and narrative.
 */
const STYLE_LABELS: Record<CoachingStyle, string> = {
  [CoachingStyle.DRILL_SERGEANT]: "Exigente y disciplinado",
  [CoachingStyle.NURTURER]: "Empático y de apoyo",
  [CoachingStyle.TECHNICAL]: "Técnico y de precisión",
  [CoachingStyle.MOTIVATIONAL]: "Motivacional e inspirador",
  [CoachingStyle.ANALYTICAL]: "Analítico y basado en datos",
};

/**
 * Athletic level labels for compatibility matching.
 */
const LEVEL_LABELS: Record<AthleticLevel, string> = {
  [AthleticLevel.NOVICE]: "novice",
  [AthleticLevel.APPRENTICE]: "apprentice",
  [AthleticLevel.PRACTITIONER]: "practitioner",
  [AthleticLevel.EXPERT]: "expert",
  [AthleticLevel.MASTER]: "master",
  [AthleticLevel.LEGEND]: "legend",
};

// ═══════════════════════════════════════════════════════════
// §1 — buildCoachingProfile
//
// Constructs a complete coaching profile from session data.
// Computes success rate, average improvement, compatibility
// map, and derives the coaching style from session patterns.
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete CoachingProfile from session data.
 *
 * Algorithm:
 *   1. Filter sessions where coachId matches
 *   2. Compute athlete count and specializations
 *   3. Compute success rate (% athletes who improved)
 *   4. Compute average improvement rate per month
 *   5. Build compatibility map per athlete
 *   6. Derive coaching style from session patterns
 *
 * @param coachId — Target coach
 * @param sessions — All sport sessions
 * @param competitions — Competition data (unused but kept for API consistency)
 * @param allSessions — All sessions for computing athlete improvement baselines
 * @returns CoachingProfile
 */
export function buildCoachingProfile(
  coachId: string,
  sessions: SportSession[],
  _competitions: Competition[],
  allSessions?: SportSession[],
): CoachingProfile {
  const coachSessions = sessions.filter((s) => s.coachId === coachId);

  if (coachSessions.length < MIN_SESSIONS_PROFILE) {
    return createMinimalProfile(coachId);
  }

  // ── Unique athletes ──
  const athleteIds = new Set(coachSessions.map((s) => s.memberId));
  const athleteCount = athleteIds.size;

  // ── Specializations: sports with >= 3 sessions ──
  const sportCounts = new Map<SportType, number>();
  for (const session of coachSessions) {
    sportCounts.set(session.sport, (sportCounts.get(session.sport) ?? 0) + 1);
  }
  const specializations = Array.from(sportCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count >= 3)
    .map(([sport]) => sport);

  // ── Derive coaching style ──
  const style = deriveCoachingStyle(coachSessions);

  // ── Compute success rate and improvement ──
  const baselineSessions = allSessions ?? sessions;
  const { successRate, avgImprovementRate } = computeSuccessMetrics(
    coachSessions,
    baselineSessions,
    athleteIds,
  );

  // ── Build compatibility map ──
  const compatibilityMap = buildCompatibilityMap(
    coachSessions,
    athleteIds,
    style,
  );

  // ── Estimate years experience from session span ──
  const yearsExperience = computeYearsExperience(coachSessions);

  return {
    coachId,
    coachName: `Coach ${coachId}`,
    specializations,
    style,
    athleteCount,
    successRate,
    avgImprovementRate: Math.round(avgImprovementRate * 100) / 100,
    compatibilityMap,
    yearsExperience,
    certifications: [],
  };
}

/**
 * Safe wrapper around buildCoachingProfile.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildCoachingProfileSafe(
  coachId: string,
  sessions: SportSession[],
  competitions: Competition[],
  allSessions?: SportSession[],
): CoachingProfile {
  try {
    return buildCoachingProfile(
      coachId,
      sessions ?? [],
      competitions ?? [],
      allSessions,
    );
  } catch {
    return createMinimalProfile(coachId);
  }
}

function createMinimalProfile(coachId: string): CoachingProfile {
  return {
    coachId,
    coachName: `Coach ${coachId}`,
    specializations: [],
    style: CoachingStyle.NURTURER,
    athleteCount: 0,
    successRate: 0,
    avgImprovementRate: 0,
    compatibilityMap: {},
    yearsExperience: 0,
    certifications: [],
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — buildTrainingPlan
//
// Generates a periodized training plan for a member in a
// specific sport, with predicted trajectory and abandonment
// risk assessment.
// ═══════════════════════════════════════════════════════════

/**
 * Generate a periodized training plan.
 *
 * Algorithm:
 *   1. Determine weakest axes from member profile
 *   2. Build weeks with periodized intensity
 *   3. Generate sessions per week with drills
 *   4. Predict outcome trajectory
 *   5. Estimate total improvement
 *   6. Compute abandonment risk
 *   7. Identify cross-sport benefits
 *
 * @param memberId — Target member
 * @param coachId — Coach creating the plan
 * @param sport — Target sport
 * @param profile — Current athletic profile
 * @param weeks — Plan duration (default: COACHING_CONFIG.DEFAULT_PLAN_WEEKS)
 * @param model — Periodization model (default: "linear")
 * @returns TrainingPlan
 */
export function buildTrainingPlan(
  memberId: string,
  coachId: string,
  sport: SportType,
  profile: AthleticProfile,
  weeks: number = DEFAULT_PLAN_WEEKS,
  model: PeriodizationModel = "linear",
): TrainingPlan {
  // ── Determine focus axes from weakest areas ──
  const weakestAxes = findWeakestAxes(profile, sport);
  const strongestAxes = findStrongestAxes(profile, sport);

  // ── Build training weeks ──
  const trainingWeeks: TrainingWeek[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekSpec = computeWeekSpecification(w, weeks, model);

    // Focus axes rotate: weakest get more attention
    const focusAxes = selectWeekFocusAxes(w, weakestAxes, strongestAxes, model);

    // Generate sessions
    const sessionsPerWeek = computeSessionsPerWeek(weekSpec.intensity);
    const sessionDays = SESSION_DAYS_BY_COUNT[sessionsPerWeek] ?? SESSION_DAYS_BY_COUNT[3];
    const sessions: TrainingSessionPlan[] = [];

    for (let s = 0; s < sessionsPerWeek; s++) {
      const day = sessionDays[s] ?? 1;
      const sessionFocus = distributeSessionFocus(s, sessionsPerWeek, focusAxes);
      const duration = computeSessionDuration(weekSpec.intensity);
      const drills = generateDrills(sessionFocus, sport);
      const description = generateSessionDescription(
        sessionFocus,
        sport,
        weekSpec.intensity,
      );

      sessions.push({
        dayOfWeek: day,
        durationMinutes: duration,
        sport,
        focus: sessionFocus,
        description,
        drills,
      });
    }

    trainingWeeks.push({
      weekNumber: w + 1,
      sessions,
      focusAxes,
      intensity: weekSpec.intensity,
      predictedFatigue: weekSpec.predictedFatigue,
      predictedImprovement: weekSpec.predictedImprovement,
    });
  }

  // ── Predicted outcome trajectory ──
  const predictedOutcome = generatePredictedOutcome(
    profile,
    trainingWeeks,
    sport,
  );

  // ── Total improvement estimate ──
  const totalImprovementEstimate = trainingWeeks.reduce(
    (sum, w) => sum + w.predictedImprovement,
    0,
  );

  // ── Confidence ──
  const confidence = computePlanConfidence(profile);

  // ── Abandonment risk ──
  const abandonmentRisk = computeAbandonmentRisk(
    profile,
    trainingWeeks,
    coachId,
  );

  // ── Cross-sport benefits ──
  const crossSportBenefits = identifyCrossSportBenefits(profile, sport);

  return {
    planId: `plan_${memberId}_${sport}_${Date.now()}`,
    memberId,
    coachId,
    sport,
    weeks: trainingWeeks,
    predictedOutcome,
    totalImprovementEstimate,
    confidence,
    abandonmentRisk: Math.round(abandonmentRisk * 100) / 100,
    crossSportBenefits,
  };
}

// ═══════════════════════════════════════════════════════════
// §3 — detectTrainingPlateau
//
//# ═══════════════════════════════════════════════════════════
// Coaching-specific plateau detection focused on coached
// sessions only. Generates coaching-specific interventions.
// ═══════════════════════════════════════════════════════════

/**
 * Detect training plateau from coaching sessions.
 *
 * Algorithm:
 *   1. Split coached sessions into first half / second half
 *   2. Compute average axis scores per half
 *   3. Check stagnation per axis
 *   4. Determine plateau if majority of axes stagnated
 *   5. Generate coaching-specific interventions
 *
 * @param memberId — Target member
 * @param sport — Target sport
 * @param coachedSessions — Sessions with this member and any coach
 * @returns PlateauDetection
 */
export function detectTrainingPlateau(
  memberId: string,
  sport: SportType,
  coachedSessions: SportSession[],
): PlateauDetection {
  if (coachedSessions.length < PLATEAU_INTERVENTION_WEEKS * 2) {
    return createNoPlateau(memberId, sport);
  }

  // Sort by date ascending
  const sorted = [...coachedSessions].sort(
    (a, b) => parseDate(a.startTime) - parseDate(b.startTime),
  );

  // Split into halves
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstAxes = computeAverageAxes(firstHalf);
  const secondAxes = computeAverageAxes(secondHalf);

  // Check stagnation per axis
  const stagnationAxes: AthleticAxis[] = [];
  let totalDelta = 0;
  let axisCount = 0;

  for (const axis of ALL_AXES) {
    const firstVal = firstAxes[axis] ?? 0;
    const secondVal = secondAxes[axis] ?? 0;
    const delta = secondVal - firstVal;
    totalDelta += delta;
    axisCount++;

    // Axis is stagnant if improvement < 3 points
    if (Math.abs(delta) < 3) {
      stagnationAxes.push(axis);
    }
  }

  const avgDelta = axisCount > 0 ? totalDelta / axisCount : 0;
  const isPlateau =
    Math.abs(avgDelta) < 3 &&
    stagnationAxes.length >= Math.ceil(ALL_AXES.length * 0.5);

  // Estimate plateau duration
  let plateauWeeks = 0;
  if (isPlateau && sorted.length >= 6) {
    plateauWeeks = estimatePlateauDuration(sorted);
  }

  // Breakthrough probability
  const breakthroughProbability = isPlateau
    ? computeBreakthroughProbability(plateauWeeks, stagnationAxes)
    : 0;

  // Estimated breakthrough date
  const estimatedBreakthroughDate = isPlateau && breakthroughProbability > 30
    ? computeBreakthroughDate(plateauWeeks, breakthroughProbability)
    : null;

  // Interventions
  const recommendedInterventions = isPlateau
    ? generateCoachingInterventions(stagnationAxes, plateauWeeks)
    : [];

  return {
    memberId,
    sport,
    isPlateau,
    durationWeeks: plateauWeeks,
    stagnationAxes,
    recommendedInterventions,
    breakthroughProbability,
    estimatedBreakthroughDate,
  };
}

function createNoPlateau(memberId: string, sport: SportType): PlateauDetection {
  return {
    memberId,
    sport,
    isPlateau: false,
    durationWeeks: 0,
    stagnationAxes: [],
    recommendedInterventions: [],
    breakthroughProbability: 0,
    estimatedBreakthroughDate: null,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — matchCoachStyleCompatibility
//
// Evaluates how well a coach's style matches a member's
// athletic level using the STYLE_COMPATIBILITY config.
// ═══════════════════════════════════════════════════════════

/**
 * Match coach style to member athletic level.
 *
 * Uses COACHING_CONFIG.STYLE_COMPATIBILITY to determine
 * if the coach's style is well-suited for the member's level.
 *
 * @param coachStyle — Coach's derived style
 * @param memberLevel — Member's current athletic level
 * @returns { score, explanation, compatible }
 */
export function matchCoachStyleCompatibility(
  coachStyle: CoachingStyle,
  memberLevel: AthleticLevel,
): { score: number; explanation: string; compatible: boolean } {
  const styleConfig = STYLE_COMPAT[coachStyle];

  if (!styleConfig) {
    return {
      score: 50,
      explanation: "Estilo de coach no reconocido.",
      compatible: false,
    };
  }

  const memberLevelStr = LEVEL_LABELS[memberLevel] ?? memberLevel;
  const isBestMatch = styleConfig.best_with.includes(memberLevelStr);
  const baseWeight = styleConfig.weight;

  // Score: if member level is in best_with, use full weight; otherwise reduce
  const score = isBestMatch
    ? Math.round(baseWeight * 100)
    : Math.round(baseWeight * 50);

  const compatible = score >= 60;

  const explanation = generateCompatibilityExplanation(
    coachStyle,
    memberLevel,
    isBestMatch,
    score,
  );

  return { score, explanation, compatible };
}

// ═══════════════════════════════════════════════════════════
// §5 — computeCoachingOutcome
//
// Measures the before/after performance delta from coaching.
// ═══════════════════════════════════════════════════════════

/**
 * Compute the before/after performance delta from coaching.
 *
 * Algorithm:
 *   1. Build baseline profile (before coaching)
 *   2. Build current profile (during coaching)
 *   3. Compute score delta and axis improvements
 *   4. Compute plan adherence and satisfaction
 *
 * @param memberId — Target member
 * @param coachId — Target coach
 * @param sport — Target sport
 * @param sessionsBefore — Sessions before coaching started
 * @param sessionsAfter — Sessions during coaching
 * @returns CoachingOutcome
 */
export function computeCoachingOutcome(
  memberId: string,
  coachId: string,
  sport: SportType,
  sessionsBefore: SportSession[],
  sessionsAfter: SportSession[],
): CoachingOutcome {
  if (sessionsAfter.length < MIN_SESSIONS_PROFILE) {
    return createMinimalOutcome(memberId, coachId, sport);
  }

  // ── Baseline (before) ──
  const beforeAxes = sessionsBefore.length >= 3
    ? computeAverageAxes(sessionsBefore)
    : createDefaultAxes(40);

  // ── Current (after) ──
  const afterAxes = computeAverageAxes(sessionsAfter);

  // ── Scores ──
  const startScore = computeOverallScore(beforeAxes);
  const endScore = computeOverallScore(afterAxes);
  const improvement = endScore - startScore;

  // ── Axis improvements (only positive deltas) ──
  const axisImprovements: Partial<AthleticAxisRecord> = {};
  for (const axis of ALL_AXES) {
    const before = beforeAxes[axis] ?? 0;
    const after = afterAxes[axis] ?? 0;
    const delta = after - before;
    if (delta !== 0) {
      axisImprovements[axis] = Math.round(delta);
    }
  }

  // ── Date range ──
  const afterDates = sessionsAfter
    .map((s) => parseDate(s.startTime))
    .filter((t) => t > 0)
    .sort((a, b) => a - b);

  const startDate = afterDates.length > 0
    ? new Date(afterDates[0]).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const endDate = afterDates.length > 0
    ? new Date(afterDates[afterDates.length - 1]).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  // ── Plan adherence: % of sessions with satisfaction >= 60 ──
  const withSatisfaction = sessionsAfter.filter(
    (s) => s.satisfaction != null,
  );
  const adherenceSessions = withSatisfaction.filter(
    (s) => s.satisfaction! >= 60,
  );
  const planAdherence = withSatisfaction.length > 0
    ? Math.round((adherenceSessions.length / withSatisfaction.length) * 100)
    : 50;

  // ── Average satisfaction ──
  const satisfaction = withSatisfaction.length > 0
    ? Math.round(
        withSatisfaction.reduce((sum, s) => sum + s.satisfaction!, 0) /
        withSatisfaction.length,
      )
    : 50;

  return {
    coachId,
    memberId,
    sport,
    startDate,
    endDate,
    startScore,
    endScore,
    improvement,
    axisImprovements,
    planAdherence,
    satisfaction,
  };
}

function createMinimalOutcome(
  memberId: string,
  coachId: string,
  sport: SportType,
): CoachingOutcome {
  return {
    coachId,
    memberId,
    sport,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    startScore: 0,
    endScore: 0,
    improvement: 0,
    axisImprovements: {},
    planAdherence: 0,
    satisfaction: 0,
  };
}

// ═══════════════════════════════════════════════════════════
// §6 — buildCoachingTimeline
//
//# ═══════════════════════════════════════════════════════════
// Generates enriched timeline data for a training plan,
// mapping planned weeks to actual completed sessions.
// ═══════════════════════════════════════════════════════════

/** Timeline point — local type for visualization data */
export interface CoachingTimelinePoint {
  readonly weekNumber: number;
  readonly focusAxes: AthleticAxis[];
  readonly intensity: IntensityLabel;
  readonly plannedSessions: number;
  readonly completedSessions: number;
  readonly completionRate: number;
  readonly averageSatisfaction: number;
  readonly isCurrentWeek: boolean;
  readonly status: "completed" | "in_progress" | "upcoming";
}

/**
 * Build coaching timeline visualization data.
 *
 * Maps each TrainingWeek to actual completed sessions and
 * computes completion rate and satisfaction.
 *
 * @param plan — Training plan
 * @param startDate — Plan start date
 * @param completedSessions — Sessions that have occurred (memberId filtered)
 * @returns Array of CoachingTimelinePoint
 */
export function buildCoachingTimeline(
  plan: TrainingPlan,
  startDate: string,
  completedSessions: SportSession[],
): CoachingTimelinePoint[] {
  const planStart = parseDate(startDate);
  const now = Date.now();
  const timeline: CoachingTimelinePoint[] = [];

  for (const week of plan.weeks) {
    const weekStart = planStart + (week.weekNumber - 1) * MS_PER_WEEK;
    const weekEnd = weekStart + 7 * MS_PER_DAY;

    // Find completed sessions in this week window
    const weekSessions = completedSessions.filter((s) => {
      const ts = parseDate(s.startTime);
      return ts >= weekStart && ts < weekEnd;
    });

    const plannedCount = week.sessions.length;
    const completedCount = weekSessions.length;
    const completionRate = plannedCount > 0
      ? clamp(Math.round((completedCount / plannedCount) * 100), 0, 100)
      : 0;

    // Status
    let status: "completed" | "in_progress" | "upcoming";
    if (weekEnd < now) {
      status = "completed";
    } else if (weekStart <= now && weekEnd > now) {
      status = "in_progress";
    } else {
      status = "upcoming";
    }

    // Average satisfaction
    const withSatisfaction = weekSessions.filter(
      (s) => s.satisfaction != null && s.satisfaction > 0,
    );
    const averageSatisfaction = withSatisfaction.length > 0
      ? Math.round(
          withSatisfaction.reduce((sum, s) => sum + s.satisfaction!, 0) /
          withSatisfaction.length,
        )
      : 0;

    timeline.push({
      weekNumber: week.weekNumber,
      focusAxes: week.focusAxes,
      intensity: week.intensity,
      plannedSessions: plannedCount,
      completedSessions: completedCount,
      completionRate,
      averageSatisfaction,
      isCurrentWeek: status === "in_progress",
      status,
    });
  }

  return timeline;
}

// ═══════════════════════════════════════════════════════════
// §7 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

// ── Primitives ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

// ── Axes utilities ──

function computeAverageAxes(sessions: SportSession[]): AthleticAxisRecord {
  const totals = {} as Record<AthleticAxis, number>;
  const counts = {} as Record<AthleticAxis, number>;

  for (const axis of ALL_AXES) {
    totals[axis] = 0;
    counts[axis] = 0;
  }

  for (const session of sessions) {
    const axisScores = session.performance?.axisScores;
    if (!axisScores) continue;

    for (const axis of ALL_AXES) {
      const val = axisScores[axis];
      if (val != null) {
        totals[axis] += val;
        counts[axis] += 1;
      }
    }
  }

  const axes = {} as AthleticAxisRecord;
  for (const axis of ALL_AXES) {
    axes[axis] = counts[axis] > 0
      ? Math.round(totals[axis] / counts[axis])
      : 0;
  }

  return axes;
}

function createDefaultAxes(value: number): AthleticAxisRecord {
  const axes = {} as AthleticAxisRecord;
  for (const axis of ALL_AXES) {
    axes[axis] = value;
  }
  return axes;
}

function computeOverallScore(axes: AthleticAxisRecord): number {
  const weights = ATHLETIC_CONFIG.AXIS_WEIGHTS as Record<string, number>;
  let total = 0;
  let weightSum = 0;

  for (const axis of ALL_AXES) {
    const weight = weights[axis] ?? 0;
    total += (axes[axis] ?? 0) * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}

function findWeakestAxes(
  profile: AthleticProfile,
  sport: SportType,
): AthleticAxis[] {
  // Prefer sport-specific axes if available
  const sportProfile = profile.sportBreakdown[sport];
  const axesSource = sportProfile?.axisScores ?? profile.axes;

  const scored = ALL_AXES.map((axis) => ({
    axis,
    value: axesSource[axis] ?? 0,
  }));
  scored.sort((a, b) => a.value - b.value);

  return scored.slice(0, 2).map((s) => s.axis);
}

function findStrongestAxes(
  profile: AthleticProfile,
  sport: SportType,
): AthleticAxis[] {
  const sportProfile = profile.sportBreakdown[sport];
  const axesSource = sportProfile?.axisScores ?? profile.axes;

  const scored = ALL_AXES.map((axis) => ({
    axis,
    value: axesSource[axis] ?? 0,
  }));
  scored.sort((a, b) => b.value - a.value);

  return scored.slice(0, 2).map((s) => s.axis);
}

function getAxisLabel(axis: AthleticAxis): string {
  switch (axis) {
    case AthleticAxis.POWER: return "Potencia";
    case AthleticAxis.SPEED: return "Velocidad";
    case AthleticAxis.ENDURANCE: return "Resistencia";
    case AthleticAxis.TECHNIQUE: return "Técnica";
    case AthleticAxis.TACTICAL: return "Táctica";
    case AthleticAxis.MENTAL: return "Mental";
    default: return axis;
  }
}

// ── Style derivation ──

function deriveCoachingStyle(sessions: SportSession[]): CoachingStyle {
  const scores: Record<CoachingStyle, number> = {
    [CoachingStyle.DRILL_SERGEANT]: 0,
    [CoachingStyle.NURTURER]: 0,
    [CoachingStyle.TECHNICAL]: 0,
    [CoachingStyle.MOTIVATIONAL]: 0,
    [CoachingStyle.ANALYTICAL]: 0,
  };

  if (sessions.length === 0) return CoachingStyle.NURTURER;

  const withExertion = sessions.filter(
    (s) => s.performance?.perceivedExertion != null,
  );
  const avgExertion = withExertion.length > 0
    ? withExertion.reduce((s, ses) => s + ses.performance!.perceivedExertion!, 0) /
      withExertion.length / 10
    : 0.5;

  const withSatisfaction = sessions.filter(
    (s) => s.satisfaction != null && s.satisfaction > 0,
  );
  const avgSatisfaction = withSatisfaction.length > 0
    ? withSatisfaction.reduce((s, ses) => s + ses.satisfaction!, 0) /
      withSatisfaction.length / 100
    : 0.5;

  // DRILL_SERGEANT: high exertion
  scores[CoachingStyle.DRILL_SERGEANT] = Math.round(avgExertion * 80);

  // NURTURER: high satisfaction, lower exertion
  scores[CoachingStyle.NURTURER] = Math.round(
    avgSatisfaction * 50 + (1 - avgExertion) * 50,
  );

  // TECHNICAL: sessions with strong technique axis
  const technicalCount = sessions.filter((s) => {
    const t = s.performance?.axisScores?.[AthleticAxis.TECHNIQUE];
    return t != null && t > 50;
  }).length;
  scores[CoachingStyle.TECHNICAL] = Math.round(
    (technicalCount / sessions.length) * 100,
  );

  // MOTIVATIONAL: high satisfaction with moderate-high exertion
  scores[CoachingStyle.MOTIVATIONAL] = Math.round(
    avgSatisfaction * 40 + avgExertion * 40 + 20,
  );

  // ANALYTICAL: sessions with strong tactical axis
  const tacticalCount = sessions.filter((s) => {
    const t = s.performance?.axisScores?.[AthleticAxis.TACTICAL];
    return t != null && t > 50;
  }).length;
  scores[CoachingStyle.ANALYTICAL] = Math.round(
    (tacticalCount / sessions.length) * 100,
  );

  // Find dominant
  let dominant = CoachingStyle.NURTURER;
  let maxScore = 0;
  for (const style of ALL_STYLES) {
    if (scores[style] > maxScore) {
      maxScore = scores[style];
      dominant = style;
    }
  }

  return dominant;
}

// ── Success metrics ──

function computeSuccessMetrics(
  coachSessions: SportSession[],
  allSessions: SportSession[],
  athleteIds: Set<string>,
): { successRate: number; avgImprovementRate: number } {
  if (athleteIds.size === 0) {
    return { successRate: 0, avgImprovementRate: 0 };
  }

  let improvedCount = 0;
  let totalImprovement = 0;
  let measuredAthletes = 0;

  for (const athleteId of athleteIds) {
    const athleteCoachSessions = coachSessions.filter(
      (s) => s.memberId === athleteId,
    );

    if (athleteCoachSessions.length < MIN_SESSIONS_PROFILE) continue;

    // Get athlete's sessions without this coach (baseline)
    const athleteBaseline = allSessions.filter(
      (s) => s.memberId === athleteId && s.coachId == null,
    );

    if (athleteBaseline.length < 3) continue;

    const beforeAxes = computeAverageAxes(athleteBaseline);
    const afterAxes = computeAverageAxes(athleteCoachSessions);
    const beforeScore = computeOverallScore(beforeAxes);
    const afterScore = computeOverallScore(afterAxes);
    const delta = afterScore - beforeScore;

    measuredAthletes++;
    if (delta > 0) {
      improvedCount++;
      totalImprovement += delta;
    }
  }

  const successRate = measuredAthletes > 0
    ? Math.round((improvedCount / measuredAthletes) * 100)
    : 0;

  const avgImprovementRate = improvedCount > 0
    ? totalImprovement / improvedCount
    : 0;

  return { successRate, avgImprovementRate };
}

// ── Compatibility map ──

function buildCompatibilityMap(
  coachSessions: SportSession[],
  athleteIds: Set<string>,
  coachStyle: CoachingStyle,
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const athleteId of athleteIds) {
    const athleteSessions = coachSessions.filter(
      (s) => s.memberId === athleteId,
    );

    // Satisfaction-based compatibility
    const withSatisfaction = athleteSessions.filter(
      (s) => s.satisfaction != null && s.satisfaction > 0,
    );
    const avgSatisfaction = withSatisfaction.length > 0
      ? withSatisfaction.reduce((sum, s) => sum + s.satisfaction!, 0) /
        withSatisfaction.length
      : 50;

    // Style-level match bonus
    const styleConfig = STYLE_COMPAT[coachStyle];
    // Assume mid-level for athletes without explicit level data
    const levelMatchBonus = styleConfig ? styleConfig.weight * 20 : 10;

    map[athleteId] = clamp(
      Math.round(avgSatisfaction * 0.7 + levelMatchBonus),
      0,
      100,
    );
  }

  return map;
}

// ── Years experience ──

function computeYearsExperience(sessions: SportSession[]): number {
  if (sessions.length === 0) return 0;

  const dates = sessions
    .map((s) => parseDate(s.startTime))
    .filter((t) => t > 0)
    .sort((a, b) => a - b);

  if (dates.length < 2) return 1;

  const spanMs = dates[dates.length - 1] - dates[0];
  const spanYears = spanMs / (365.25 * MS_PER_DAY);

  return Math.max(1, Math.round(spanYears));
}

// ── Periodization ──

interface WeekSpec {
  intensity: IntensityLabel;
  predictedFatigue: number;
  predictedImprovement: number;
}

function computeWeekSpecification(
  weekIndex: number,
  totalWeeks: number,
  model: PeriodizationModel,
): WeekSpec {
  // Recovery week check
  const isRecovery = (weekIndex + 1) % RECOVERY_WEEK_FREQ === 0;

  switch (model) {
    case "linear":
      return linearWeekSpec(weekIndex, totalWeeks, isRecovery);
    case "undulating":
      return undulatingWeekSpec(weekIndex, isRecovery);
    case "block":
      return blockWeekSpec(weekIndex, totalWeeks, isRecovery);
    default:
      return linearWeekSpec(weekIndex, totalWeeks, isRecovery);
  }
}

function linearWeekSpec(
  weekIndex: number,
  totalWeeks: number,
  isRecovery: boolean,
): WeekSpec {
  if (isRecovery) {
    return { intensity: "recovery", predictedFatigue: 15, predictedImprovement: 0 };
  }

  const progress = weekIndex / Math.max(1, totalWeeks - 1);

  let intensity: IntensityLabel;
  let fatigue: number;
  let improvement: number;

  if (progress < 0.3) {
    intensity = "moderate";
    fatigue = 30;
    improvement = 1;
  } else if (progress < 0.6) {
    intensity = "intense";
    fatigue = 55;
    improvement = 2;
  } else if (progress < 0.85) {
    intensity = "peak";
    fatigue = 75;
    improvement = 2;
  } else {
    // Taper
    intensity = "moderate";
    fatigue = 25;
    improvement = 1;
  }

  return { intensity, predictedFatigue: fatigue, predictedImprovement: improvement };
}

function undulatingWeekSpec(
  weekIndex: number,
  isRecovery: boolean,
): WeekSpec {
  if (isRecovery) {
    return { intensity: "recovery", predictedFatigue: 15, predictedImprovement: 0 };
  }

  const pattern: IntensityLabel[] = ["intense", "moderate", "peak"];
  const intensity = pattern[weekIndex % pattern.length];

  const fatigueMap: Record<string, number> = {
    moderate: 35,
    intense: 55,
    peak: 75,
  };
  const improvementMap: Record<string, number> = {
    moderate: 1,
    intense: 2,
    peak: 2,
  };

  return {
    intensity,
    predictedFatigue: fatigueMap[intensity] ?? 40,
    predictedImprovement: improvementMap[intensity] ?? 1,
  };
}

function blockWeekSpec(
  weekIndex: number,
  totalWeeks: number,
  isRecovery: boolean,
): WeekSpec {
  if (isRecovery) {
    return { intensity: "recovery", predictedFatigue: 15, predictedImprovement: 0 };
  }

  const blockLength = Math.max(2, Math.floor(totalWeeks / 3));
  const blockIndex = Math.floor(weekIndex / blockLength);

  const blockSequence: IntensityLabel[] = ["moderate", "intense", "peak"];
  const intensity = blockSequence[Math.min(blockIndex, blockSequence.length - 1)];

  const fatigueMap: Record<string, number> = {
    moderate: 35,
    intense: 60,
    peak: 80,
  };
  const improvementMap: Record<string, number> = {
    moderate: 1,
    intense: 2,
    peak: 3,
  };

  return {
    intensity,
    predictedFatigue: fatigueMap[intensity] ?? 40,
    predictedImprovement: improvementMap[intensity] ?? 1,
  };
}

function selectWeekFocusAxes(
  weekIndex: number,
  weakest: AthleticAxis[],
  strongest: AthleticAxis[],
  model: PeriodizationModel,
): AthleticAxis[] {
  if (model === "block") {
    // Block: focus on weakest early, strongest later
    return weekIndex < 4 ? weakest : strongest;
  }

  // Linear and undulating: alternate
  return weekIndex % 2 === 0 ? weakest : strongest;
}

function computeSessionsPerWeek(intensity: IntensityLabel): number {
  switch (intensity) {
    case "recovery": return 2;
    case "moderate": return 3;
    case "intense": return 4;
    case "peak": return 5;
    default: return 3;
  }
}

function distributeSessionFocus(
  sessionIndex: number,
  _totalSessions: number,
  primaryFocus: AthleticAxis[],
): AthleticAxis[] {
  // First session gets primary focus, others get secondary + complementary
  if (sessionIndex === 0 && primaryFocus.length > 0) {
    return [primaryFocus[0]];
  }
  if (sessionIndex === 1 && primaryFocus.length > 1) {
    return [primaryFocus[1]];
  }
  // Remaining sessions get a mix
  const remaining = ALL_AXES.filter((a) => !primaryFocus.includes(a));
  const complementary = remaining[sessionIndex % remaining.length] ?? primaryFocus[0];
  return [complementary];
}

function computeSessionDuration(intensity: IntensityLabel): number {
  switch (intensity) {
    case "recovery": return MIN_DURATION;
    case "moderate": return DEFAULT_SESSION_DURATION;
    case "intense": return 75;
    case "peak": return 90;
    default: return DEFAULT_SESSION_DURATION;
  }
}

function generateDrills(axes: AthleticAxis[], sport: SportType): string[] {
  const drills: string[] = [];
  const sportLabel = SPORT_CONFIG[sport]?.label ?? sport;

  for (const axis of axes) {
    const axisDrills = AXIS_DRILLS[axis] ?? [];
    if (axisDrills.length > 0) {
      // Pick drill based on sport context
      const drill = axisDrills[0];
      drills.push(`${drill} (${sportLabel})`);
    }
  }

  if (drills.length === 0) {
    drills.push(`Calentamiento general y drills de ${sportLabel}`);
  }

  return drills;
}

function generateSessionDescription(
  focus: AthleticAxis[],
  sport: SportType,
  intensity: IntensityLabel,
): string {
  const sportLabel = SPORT_CONFIG[sport]?.label ?? sport;
  const focusLabels = focus.map(getAxisLabel).join(" + ");

  const intensityNote: Record<string, string> = {
    recovery: "Recuperación activa: movilidad y técnica suave",
    moderate: "Desarrollo progresivo de capacidades",
    intense: "Alta exigencia — registrar tiempos y marcas",
    peak: "Máxima intensidad deportiva — rendimiento competitivo",
  };

  return `${sportLabel} — ${focusLabels}. ${intensityNote[intensity] ?? ""}`;
}

// ── Plan predicted outcome ──

function generatePredictedOutcome(
  profile: AthleticProfile,
  weeks: TrainingWeek[],
  _sport: SportType,
): SkillTrajectoryPoint[] {
  const predictions: SkillTrajectoryPoint[] = [];
  let currentScore = profile.overallScore;
  const startDate = new Date();

  for (const week of weeks) {
    currentScore = clamp(currentScore + week.predictedImprovement, 0, 100);
    const weekDate = new Date(
      startDate.getTime() + (week.weekNumber - 1) * MS_PER_WEEK,
    );

    // Scale axes proportionally
    const ratio = profile.overallScore > 0
      ? currentScore / profile.overallScore
      : 1;
    const axes = {} as AthleticAxisRecord;
    for (const axis of ALL_AXES) {
      axes[axis] = clamp(
        Math.round((profile.axes[axis] ?? 0) * ratio),
        0,
        100,
      );
    }

    predictions.push({
      date: weekDate.toISOString().split("T")[0],
      overall: currentScore,
      axes,
      confidence: clamp(80 - week.weekNumber * 3, 40, 80),
    });
  }

  return predictions;
}

// ── Plan confidence ──

function computePlanConfidence(profile: AthleticProfile): number {
  let confidence = 40;

  if (profile.totalSessions >= 30) confidence += 25;
  else if (profile.totalSessions >= 15) confidence += 18;
  else if (profile.totalSessions >= 5) confidence += 10;

  if (profile.trajectory.length >= 4) confidence += 15;

  const sportCount = Object.keys(profile.sportBreakdown).length;
  if (sportCount >= 2) confidence += 10;

  if (profile.lastActiveDate) {
    const daysSince =
      (Date.now() - parseDate(profile.lastActiveDate)) / MS_PER_DAY;
    if (daysSince < 7) confidence += 10;
    else if (daysSince < 30) confidence += 5;
  }

  return clamp(confidence, 30, 90);
}

// ── Abandonment risk ──

function computeAbandonmentRisk(
  profile: AthleticProfile,
  weeks: TrainingWeek[],
  _coachId: string,
): number {
  let risk = 0;

  // High intensity fatigue accumulation
  const intenseWeeks = weeks.filter(
    (w) => w.intensity === "intense" || w.intensity === "peak",
  ).length;
  const intenseRatio = weeks.length > 0
    ? intenseWeeks / weeks.length
    : 0;
  risk += intenseRatio * ABANDON_HIGH_INTENSITY;

  // Plateau duration (already struggling → higher abandonment risk)
  if (profile.plateauDurationWeeks > PLATEAU_INTERVENTION_WEEKS) {
    risk += ABANDON_PLATEAU;
  }

  // Low recent activity → higher risk
  if (profile.lastActiveDate) {
    const daysSince =
      (Date.now() - parseDate(profile.lastActiveDate)) / MS_PER_DAY;
    if (daysSince > 14) {
      risk += 0.2;
    }
  }

  // Compatibility (if no compatibility data, moderate risk)
  // We don't have compatibility data here, so use neutral
  risk += 0.15 * ABANDON_LOW_COMPAT;

  return clamp(risk, 0.05, 0.95);
}

// ── Cross-sport benefits ──

function identifyCrossSportBenefits(
  profile: AthleticProfile,
  sport: SportType,
): CrossSportBenefit[] {
  const benefits: CrossSportBenefit[] = [];
  const sourceCategory = SPORT_CONFIG[sport]?.category;

  // Check transferable skills from profile
  for (const transfer of profile.transferableSkills) {
    if (transfer.fromSport === sport && transfer.transferRate >= 0.3) {
      benefits.push({
        fromSport: sport,
        toSport: transfer.toSport,
        benefitDescription: transfer.explanation,
        estimatedImprovementPct: Math.round(transfer.transferRate * 15),
        timeWeeks: 4,
      });
    }
  }

  // If no transfers found, suggest based on category
  if (benefits.length === 0 && sourceCategory) {
    // Suggest cross-training in same category
    const sameCategorySports = Object.entries(SPORT_CONFIG)
      .filter(([_, config]) => config.category === sourceCategory)
      .map(([sportType]) => sportType as SportType)
      .filter((s) => s !== sport);

    for (const suggestedSport of sameCategorySports.slice(0, 2)) {
      benefits.push({
        fromSport: sport,
        toSport: suggestedSport,
        benefitDescription: `Cross-training en ${SPORT_CONFIG[suggestedSport]?.label ?? suggestedSport} complementa ${SPORT_CONFIG[sport]?.label ?? sport}`,
        estimatedImprovementPct: 10,
        timeWeeks: 6,
      });
    }
  }

  return benefits;
}

// ── Plateau helpers ──

function estimatePlateauDuration(sortedSessions: SportSession[]): number {
  // Count consecutive stagnation pairs from the end
  let weeks = 0;
  const pairSize = 2;

  for (let i = sortedSessions.length - pairSize; i >= pairSize; i -= pairSize) {
    const recent = computeAverageAxes(
      sortedSessions.slice(i, i + pairSize),
    );
    const previous = computeAverageAxes(
      sortedSessions.slice(i - pairSize, i),
    );

    const recentAvg =
      ALL_AXES.reduce((s, a) => s + (recent[a] ?? 0), 0) / ALL_AXES.length;
    const previousAvg =
      ALL_AXES.reduce((s, a) => s + (previous[a] ?? 0), 0) / ALL_AXES.length;

    if (Math.abs(recentAvg - previousAvg) < 3) {
      weeks++;
    } else {
      break;
    }
  }

  return weeks;
}

function computeBreakthroughProbability(
  plateauWeeks: number,
  stagnationAxes: AthleticAxis[],
): number {
  let probability = 25; // base

  // Longer plateau → higher breakthrough pressure
  probability += plateauWeeks * 3;

  // Technique stagnation is most coachable
  if (stagnationAxes.includes(AthleticAxis.TECHNIQUE)) {
    probability += 15;
  }

  // Mental stagnation requires different intervention
  if (stagnationAxes.includes(AthleticAxis.MENTAL)) {
    probability += 10;
  }

  return clamp(probability, 5, 80);
}

function computeBreakthroughDate(
  plateauWeeks: number,
  probability: number,
): string {
  const weeksToBreakthrough = Math.ceil(
    (80 - probability) / 5 + plateauWeeks * 0.5,
  );
  const date = new Date();
  date.setDate(date.getDate() + weeksToBreakthrough * 7);
  return date.toISOString().split("T")[0];
}

function generateCoachingInterventions(
  stagnationAxes: AthleticAxis[],
  plateauWeeks: number,
): string[] {
  const interventions: string[] = [];

  for (const axis of stagnationAxes) {
    switch (axis) {
      case AthleticAxis.TECHNIQUE:
        interventions.push(
          "Cambiar enfoque técnico: drills con restricciones o variabilidad",
        );
        break;
      case AthleticAxis.POWER:
        interventions.push(
          "Introducir periodo de sobrecarga: reducir volumen, aumentar intensidad",
        );
        break;
      case AthleticAxis.ENDURANCE:
        interventions.push(
          "Variar estímulos de resistencia: intervalos vs continuo",
        );
        break;
      case AthleticAxis.SPEED:
        interventions.push(
          "Trabajo de velocidad específico: sprints cortos con recuperación completa",
        );
        break;
      case AthleticAxis.TACTICAL:
        interventions.push(
          "Incorporar análisis video y simulación de competencia",
        );
        break;
      case AthleticAxis.MENTAL:
        interventions.push(
          "Sesiones de visualización y preparación mental con el coach",
        );
        break;
    }
  }

  if (plateauWeeks > PLATEAU_INTERVENTION_WEEKS * 2) {
    interventions.push("Evaluar cambio de coach o estilo de entrenamiento");
    interventions.push("Considerar semana de descarga completa (5-7 días)");
  }

  if (interventions.length === 0) {
    interventions.push(
      "Mantener el enfoque actual con micro-variaciones en carga",
    );
  }

  return interventions;
}

// ── Compatibility explanation ──

function generateCompatibilityExplanation(
  coachStyle: CoachingStyle,
  memberLevel: AthleticLevel,
  isBestMatch: boolean,
  score: number,
): string {
  const styleLabel = STYLE_LABELS[coachStyle] ?? coachStyle;
  const levelLabel = LEVEL_LABELS[memberLevel] ?? memberLevel;

  if (isBestMatch && score >= 70) {
    return `Excelente compatibilidad. Coach ${styleLabel} es ideal para nivel ${levelLabel}.`;
  }
  if (isBestMatch) {
    return `Buena compatibilidad. El estilo ${styleLabel} encaja bien con ${levelLabel}.`;
  }
  if (score >= 40) {
    return `Compatibilidad moderada. Coach ${styleLabel} puede requerir adaptación para nivel ${levelLabel}.`;
  }
  return `Compatibilidad baja. Coach ${styleLabel} no es el perfil ideal para nivel ${levelLabel}.`;
}