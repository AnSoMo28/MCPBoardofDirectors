/**
 * src/features/sports/lib/athleticProfile.ts
 * ═══════════════════════════════════════════════════════════
 * §S1 — Athletic Profile Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Athletic Profile Engine is the foundation of Sports Intelligence.
 * It transforms raw session data and competition history into a
 * multi-dimensional portrait of each member's athletic capability.
 *
 * Functions:
 *   buildAthleticProfile()      — Full profile from sessions + competitions
 *   buildAthleticProfileSafe()  — Degraded wrapper, never throws
 *   predictSkillProgression()   — Future trajectory with confidence bands
 *   detectPlateau()             — Stagnation detection + intervention suggestions
 *   findPeakWindows()           — Temporal performance patterns
 *   computeCrossSportTransfers()— Cross-sport skill transfer analysis
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S1
 */

import type {
  AthleticProfile,
  SportSpecificProfile,
  SkillTrajectoryPoint,
  CrossSportTransfer,
  PeakWindow,
  FatigueCycle,
  AthleticAxisRecord,
  SportSession,
  Competition,
  PlateauDetection,
  TrendDirection,
} from "../types";

import {
  AthleticAxis,
  AthleticLevel,
  SportCategory,
  SportType,
  SPORT_CONFIG,
  ATHLETIC_AXIS_CONFIG,
} from "../types";

import {
  ATHLETIC_CONFIG,
  classifyAthleticLevel,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — BASE AXIS PROFILES BY SPORT CATEGORY
//
// Domain knowledge: each sport category emphasizes different
// athletic axes. These represent a "trained athlete" baseline.
// Actual member scores are computed by scaling with session
// frequency, duration, performance data, and competition results.
//
// Rationale:
//   RACQUET:    High technique + speed (racket mechanics, court coverage)
//   WATER:      High endurance + technique (stroke efficiency, sustained effort)
//   FITNESS:    High power + endurance (strength work, cardio capacity)
//   TEAM:       High tactical + speed (positioning, transition play)
//   INDIVIDUAL: High endurance + mental (solo discipline, focus)
//   WELLNESS:   High mental + technique (mind-body, flexibility, form)
// ═══════════════════════════════════════════════════════════

const CATEGORY_AXIS_PROFILES: Record<SportCategory, AthleticAxisRecord> = {
  [SportCategory.RACQUET]:    { power: 50, speed: 72, endurance: 55, technique: 78, tactical: 68, mental: 58 },
  [SportCategory.WATER]:      { power: 42, speed: 58, endurance: 82, technique: 72, tactical: 28, mental: 52 },
  [SportCategory.FITNESS]:    { power: 78, speed: 52, endurance: 72, technique: 38, tactical: 25, mental: 42 },
  [SportCategory.TEAM]:       { power: 62, speed: 72, endurance: 58, technique: 52, tactical: 78, mental: 62 },
  [SportCategory.INDIVIDUAL]: { power: 48, speed: 55, endurance: 78, technique: 72, tactical: 38, mental: 68 },
  [SportCategory.WELLNESS]:   { power: 22, speed: 18, endurance: 48, technique: 62, tactical: 25, mental: 82 },
};

/** Cross-sport transfer rate matrix — how much skill transfers between categories */
const CATEGORY_TRANSFER_RATES: Record<string, number> = {
  [`${SportCategory.RACQUET}-${SportCategory.RACQUET}`]:     0.80,
  [`${SportCategory.RACQUET}-${SportCategory.TEAM}`]:        0.40,
  [`${SportCategory.RACQUET}-${SportCategory.FITNESS}`]:     0.35,
  [`${SportCategory.RACQUET}-${SportCategory.INDIVIDUAL}`]:  0.45,
  [`${SportCategory.WATER}-${SportCategory.FITNESS}`]:       0.50,
  [`${SportCategory.WATER}-${SportCategory.INDIVIDUAL}`]:    0.40,
  [`${SportCategory.FITNESS}-${SportCategory.TEAM}`]:        0.45,
  [`${SportCategory.FITNESS}-${SportCategory.RACQUET}`]:     0.35,
  [`${SportCategory.FITNESS}-${SportCategory.WATER}`]:       0.50,
  [`${SportCategory.FITNESS}-${SportCategory.WELLNESS}`]:    0.30,
  [`${SportCategory.FITNESS}-${SportCategory.INDIVIDUAL}`]:  0.40,
  [`${SportCategory.TEAM}-${SportCategory.RACQUET}`]:        0.40,
  [`${SportCategory.TEAM}-${SportCategory.TEAM}`]:           0.60,
  [`${SportCategory.TEAM}-${SportCategory.FITNESS}`]:        0.45,
  [`${SportCategory.INDIVIDUAL}-${SportCategory.RACQUET}`]:  0.45,
  [`${SportCategory.INDIVIDUAL}-${SportCategory.WATER}`]:    0.40,
  [`${SportCategory.INDIVIDUAL}-${SportCategory.FITNESS}`]:  0.40,
  [`${SportCategory.INDIVIDUAL}-${SportCategory.WELLNESS}`]: 0.35,
  [`${SportCategory.WELLNESS}-${SportCategory.FITNESS}`]:    0.30,
  [`${SportCategory.WELLNESS}-${SportCategory.INDIVIDUAL}`]: 0.35,
};

/** Minimum sessions required for a category pair to consider transfer */
const TRANSFER_MIN_SESSIONS = 3;

/** Minimum transfer rate to include in results */
const TRANSFER_MIN_RATE = 0.30;

// ═══════════════════════════════════════════════════════════
// §1 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

const ALL_AXES = Object.values(AthleticAxis);

/** Create a zeroed axis record */
function createEmptyAxes(): AthleticAxisRecord {
  const axes = {} as AthleticAxisRecord;
  for (const axis of ALL_AXES) {
    axes[axis] = 0;
  }
  return axes;
}

/** Create a copy of an axis record */
function cloneAxes(source: AthleticAxisRecord): AthleticAxisRecord {
  const axes = {} as AthleticAxisRecord;
  for (const axis of ALL_AXES) {
    axes[axis] = source[axis];
  }
  return axes;
}

/** Weighted average of axis values using AXIS_WEIGHTS from config */
function computeOverallScore(axes: AthleticAxisRecord): number {
  let total = 0;
  let weightSum = 0;
  for (const axis of ALL_AXES) {
    const weight = ATHLETIC_CONFIG.AXIS_WEIGHTS[axis] ?? 0;
    total += axes[axis] * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}

/** Find axis with highest value */
function findStrongestAxis(axes: AthleticAxisRecord): AthleticAxis {
  let best = ALL_AXES[0];
  let bestVal = -1;
  for (const axis of ALL_AXES) {
    if (axes[axis] > bestVal) {
      bestVal = axes[axis];
      best = axis;
    }
  }
  return best;
}

/** Find axis with lowest value */
function findWeakestAxis(axes: AthleticAxisRecord): AthleticAxis {
  let worst = ALL_AXES[0];
  let worstVal = Infinity;
  for (const axis of ALL_AXES) {
    if (axes[axis] < worstVal) {
      worstVal = axes[axis];
      worst = axis;
    }
  }
  return worst;
}

/** Get human-readable axis label */
function axisLabel(axis: AthleticAxis): string {
  return ATHLETIC_AXIS_CONFIG[axis]?.label ?? axis;
}

/** Clamp a number to [min, max] */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute linear slope from a series of values. Returns improvement per unit. */
function computeSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

/** Parse date string to timestamp (ms). Returns 0 on invalid. */
function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/** Get ISO week number from date */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Get a week-key string for grouping: "YYYY-WW" */
function getWeekKey(date: Date): string {
  return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, "0")}`;
}

// ═══════════════════════════════════════════════════════════
// §2 — buildAthleticProfile
//
// Main builder. Transforms raw sessions + competitions into
// a complete athletic profile with trajectory, fatigue,
// breakthrough probability, and cross-sport analysis.
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete AthleticProfile from session history and competition data.
 *
 * Algorithm:
 *   1. Group sessions by sport for the target member
 *   2. For each sport, compute SportSpecificProfile:
 *      a. If session has performance.axisScores → weighted average across sessions
 *      b. If not → derive from CATEGORY_AXIS_PROFILES × session count × duration × intensity
 *   3. Aggregate across all sports for overall axes and score
 *   4. Build weekly trajectory from session history
 *   5. Compute fatigue cycle from recent sessions
 *   6. Predict future trajectory
 *   7. Compute breakthrough probability
 *   8. Detect plateau
 *   9. Find peak performance windows
 *  10. Compute cross-sport transfers
 *
 * @param memberId — Target member
 * @param sessions — All sessions for this member
 * @param competitions — All competitions involving this member
 * @returns Complete AthleticProfile
 */
export function buildAthleticProfile(
  memberId: string,
  sessions: SportSession[],
  competitions: Competition[],
): AthleticProfile {
  // ── Filter to this member ──
  const memberSessions = sessions.filter((s) => s.memberId === memberId);
  const memberCompetitions = competitions.filter(
    (c) => c.player1Id === memberId || c.player2Id === memberId,
  );

  // ── Group by sport ──
  const sessionsBySport = new Map<SportType, SportSession[]>();
  for (const session of memberSessions) {
    const existing = sessionsBySport.get(session.sport) ?? [];
    existing.push(session);
    sessionsBySport.set(session.sport, existing);
  }

  // ── Compute per-sport profiles ──
  const sportBreakdown = {} as Record<SportType, SportSpecificProfile>;
  let aggregateAxes = createEmptyAxes();
  let totalSessionsForWeighting = 0;

  for (const [sport, sportSessions] of sessionsBySport) {
    const profile = computeSportProfile(sport, sportSessions, memberCompetitions);
    sportBreakdown[sport] = profile;

    // Weight aggregation by session count
    const weight = sportSessions.length;
    for (const axis of ALL_AXES) {
      aggregateAxes[axis] += profile.axisScores[axis] * weight;
    }
    totalSessionsForWeighting += weight;
  }

  // ── Normalize aggregate axes ──
  if (totalSessionsForWeighting > 0) {
    for (const axis of ALL_AXES) {
      aggregateAxes[axis] = Math.round(aggregateAxes[axis] / totalSessionsForWeighting);
    }
  }

  const overallScore = computeOverallScore(aggregateAxes);
  const athleticLevel = classifyAthleticLevel(overallScore);

  // ── Build weekly trajectory ──
  const trajectory = buildWeeklyTrajectory(memberSessions);

  // ── Compute fatigue cycle ──
  const fatigueCycle = computeFatigueCycle(memberSessions);

  // ── Predict future trajectory ──
  const predictedTrajectory = predictSkillProgression(
    { trajectory, axes: aggregateAxes, overallScore },
    ATHLETIC_CONFIG.TRAJECTORY_PREDICTION_WEEKS,
  );

  // ── Compute breakthrough probability ──
  const breakthroughProbability = computeBreakthroughProbability(
    trajectory,
    memberSessions,
    memberCompetitions,
  );

  // ── Plateau detection ──
  const plateau = detectPlateau(memberId, SportType.TENNIS, trajectory);
  const plateauDurationWeeks = plateau.isPlateau ? plateau.durationWeeks : 0;

  // ── Find peak windows ──
  const peakWindows = findPeakWindows(memberSessions);

  // ── Cross-sport transfers ──
  const transferableSkills = computeCrossSportTransfers({
    memberId,
    sportBreakdown,
    totalSessions: memberSessions.length,
  });

  // ── Last active date ──
  const sortedSessions = [...memberSessions].sort(
    (a, b) => parseDate(b.startTime) - parseDate(a.startTime),
  );
  const lastActiveDate = sortedSessions.length > 0 ? sortedSessions[0].startTime : null;

  return {
    memberId,
    axes: aggregateAxes,
    overallScore,
    athleticLevel,
    sportBreakdown,
    peakWindows,
    fatigueCycle,
    trajectory,
    predictedTrajectory,
    breakthroughProbability,
    plateauDurationWeeks,
    transferableSkills,
    totalSessions: memberSessions.length,
    lastActiveDate,
  };
}

// ── Internal: compute per-sport profile ──

function computeSportProfile(
  sport: SportType,
  sessions: SportSession[],
  competitions: Competition[],
): SportSpecificProfile {
  const category = SPORT_CONFIG[sport]?.category ?? SportCategory.INDIVIDUAL;
  const baseAxes = CATEGORY_AXIS_PROFILES[category] ?? createEmptyAxes();

  // ── Axis scoring ──
  let axes: AthleticAxisRecord;
  const sessionsWithPerformance = sessions.filter(
    (s) => s.performance?.axisScores && Object.keys(s.performance.axisScores).length > 0,
  );

  if (sessionsWithPerformance.length >= ATHLETIC_CONFIG.MIN_SESSIONS_FOR_PROFILE) {
    // Data-driven: weighted average of actual axis scores
    axes = computeAxesFromPerformanceData(sessionsWithPerformance);
  } else {
    // Derived: base profile × session factors
    axes = computeAxesFromDerived(sessions, baseAxes, competitions);
  }

  const overallScore = computeOverallScore(axes);
  const level = classifyAthleticLevel(overallScore);

  // ── Progression rate ──
  const sortedByDate = [...sessions].sort(
    (a, b) => parseDate(a.startTime) - parseDate(b.startTime),
  );
  const progressionRate = computeSportProgressionRate(sortedByDate);

  // ── Total hours ──
  const totalHours = sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / 60;

  return {
    sport,
    level,
    sessionsCount: sessions.length,
    totalHours: Math.round(totalHours),
    progressionRate: Math.round(progressionRate * 100) / 100,
    bestDiscipline: axisLabel(findStrongestAxis(axes)),
    weakestDiscipline: axisLabel(findWeakestAxis(axes)),
    axisScores: axes,
  };
}

// ── Internal: compute axes from performance data ──

function computeAxesFromPerformanceData(
  sessions: SportSession[],
): AthleticAxisRecord {
  const totals = createEmptyAxes();
  const counts = createEmptyAxes();

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

  const axes = createEmptyAxes();
  for (const axis of ALL_AXES) {
    axes[axis] = counts[axis] > 0
      ? Math.round(totals[axis] / counts[axis])
      : 0;
  }

  return axes;
}

// ── Internal: compute axes from derived factors ──

function computeAxesFromDerived(
  sessions: SportSession[],
  baseAxes: AthleticAxisRecord,
  competitions: Competition[],
): AthleticAxisRecord {
  const sessionCount = sessions.length;
  // Session factor: more sessions → higher scores, with diminishing returns
  // log2(sessions + 1) / log2(MAX_SESSIONS_FOR_FULL_SCORE)
  const SESSION_FULL_SCORE = 50;
  const sessionFactor = Math.min(1, Math.log2(sessionCount + 1) / Math.log2(SESSION_FULL_SCORE + 1));

  // Duration factor: average session duration vs sport average
  const avgDuration = sessionCount > 0
    ? sessions.reduce((s, ses) => s + ses.durationMinutes, 0) / sessionCount
    : 0;
  const durationFactor = clamp(avgDuration / 60, 0.3, 1.5);

  // Competition factor: tactical/mental boost from competitive play
  const competitionCount = competitions.length;
  const competitionFactor = clamp(competitionCount / 10, 0, 1);

  // Coaching factor: sessions with a coach improve technique faster
  const coachedSessions = sessions.filter((s) => s.coachId != null);
  const coachingFactor = sessionCount > 0
    ? clamp(coachedSessions.length / sessionCount, 0, 1)
    : 0;

  // Recency factor: active members score higher
  const now = Date.now();
  const mostRecent = sessions.reduce(
    (latest, s) => Math.max(latest, parseDate(s.startTime)),
    0,
  );
  const daysSinceLastSession = mostRecent > 0 ? (now - mostRecent) / 86_400_000 : 999;
  const recencyFactor = clamp(1 - daysSinceLastSession / 30, 0.3, 1);

  // Compute axes
  const axes = createEmptyAxes();
  for (const axis of ALL_AXES) {
    let score = baseAxes[axis];

    // Apply session factor (all axes benefit from more sessions)
    score *= (0.4 + 0.6 * sessionFactor);

    // Apply duration factor (endurance benefits most)
    if (axis === AthleticAxis.ENDURANCE) {
      score *= (0.6 + 0.4 * durationFactor);
    } else {
      score *= (0.8 + 0.2 * durationFactor);
    }

    // Apply competition factor (tactical + mental benefit most)
    if (axis === AthleticAxis.TACTICAL) {
      score *= (0.7 + 0.3 * competitionFactor);
    } else if (axis === AthleticAxis.MENTAL) {
      score *= (0.75 + 0.25 * competitionFactor);
    }

    // Apply coaching factor (technique benefits most)
    if (axis === AthleticAxis.TECHNIQUE) {
      score *= (0.7 + 0.3 * coachingFactor);
    } else {
      score *= (0.85 + 0.15 * coachingFactor);
    }

    // Apply recency factor
    score *= recencyFactor;

    axes[axis] = clamp(Math.round(score), 0, 100);
  }

  return axes;
}

// ── Internal: compute progression rate for a sport ──

function computeSportProgressionRate(sortedSessions: SportSession[]): number {
  if (sortedSessions.length < 2) return 0;

  // Split sessions into first half and second half
  const mid = Math.floor(sortedSessions.length / 2);
  const firstHalf = sortedSessions.slice(0, mid);
  const secondHalf = sortedSessions.slice(mid);

  const avgFirst = firstHalf.reduce((s, ses) => s + (ses.satisfaction ?? 50), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, ses) => s + (ses.satisfaction ?? 50), 0) / secondHalf.length;

  // Improvement per month approximation
  const firstDate = parseDate(sortedSessions[0].startTime);
  const lastDate = parseDate(sortedSessions[sortedSessions.length - 1].startTime);
  const months = Math.max(1, (lastDate - firstDate) / (30 * 86_400_000));

  return (avgSecond - avgFirst) / months;
}

// ═══════════════════════════════════════════════════════════
// §3 — buildAthleticProfileSafe (DEGRADED WRAPPER)
//
// Never throws. Returns a valid profile even with 0 sessions.
// Gracefully handles all edge cases.
// ═══════════════════════════════════════════════════════════

/**
 * Safe wrapper around buildAthleticProfile.
 * Guarantees a valid return even with empty/invalid data.
 * Use this in hooks and components where data may be loading.
 */
export function buildAthleticProfileSafe(
  memberId: string,
  sessions: SportSession[],
  competitions: Competition[],
): AthleticProfile {
  try {
    if (!memberId) {
      return createEmptyProfile("unknown");
    }
    return buildAthleticProfile(memberId, sessions ?? [], competitions ?? []);
  } catch {
    return createEmptyProfile(memberId);
  }
}

function createEmptyProfile(memberId: string): AthleticProfile {
  return {
    memberId,
    axes: createEmptyAxes(),
    overallScore: 0,
    athleticLevel: AthleticLevel.NOVICE,
    sportBreakdown: {} as Record<SportType, SportSpecificProfile>,
    peakWindows: [],
    fatigueCycle: {
      currentFatigue: 0,
      recommendedRestDays: 0,
      hoursToRecovery: 0,
      isOvertraining: false,
      weeklyTrend: "stable" as TrendDirection,
    },
    trajectory: [],
    predictedTrajectory: [],
    breakthroughProbability: 0,
    plateauDurationWeeks: 0,
    transferableSkills: [],
    totalSessions: 0,
    lastActiveDate: null,
  };
}

// ═══════════════════════════════════════════════════════════
// §4 — predictSkillProgression
//
// Projects future skill trajectory using linear regression
// on recent data + exponential smoothing + confidence decay.
// ═══════════════════════════════════════════════════════════

/**
 * Predict future skill trajectory from current profile state.
 *
 * Algorithm:
 *   1. Extract recent trajectory slope (linear regression on last N points)
 *   2. Apply exponential smoothing (alpha = 0.3) for stability
 *   3. Project forward with diminishing returns (log curve)
 *   4. Expand confidence bands per week (±3% per week from last known)
 *   5. If plateau detected, reduce projected improvement
 *
 * @param params.trajectory — Historical trajectory points
 * @param params.axes — Current axis scores
 * @param params.overallScore — Current overall score
 * @param targetWeeks — How many weeks to project
 * @returns Array of predicted SkillTrajectoryPoint
 */
export function predictSkillProgression(
  params: {
    trajectory: SkillTrajectoryPoint[];
    axes: AthleticAxisRecord;
    overallScore: number;
  },
  targetWeeks: number = ATHLETIC_CONFIG.TRAJECTORY_PREDICTION_WEEKS,
): SkillTrajectoryPoint[] {
  const { trajectory, axes: currentAxes, overallScore } = params;

  if (trajectory.length < 2 || targetWeeks <= 0) {
    return [];
  }

  // ── Step 1: Compute slope from recent trajectory ──
  const recentPoints = trajectory.slice(-Math.min(trajectory.length, 12));
  const overallValues = recentPoints.map((p) => p.overall);
  const rawSlope = computeSlope(overallValues);

  // ── Step 2: Exponential smoothing ──
  const ALPHA = 0.3;
  let smoothedSlope = rawSlope;
  if (trajectory.length >= 3) {
    const prevSlopes: number[] = [];
    for (let i = 1; i < recentPoints.length; i++) {
      prevSlopes.push(recentPoints[i].overall - recentPoints[i - 1].overall);
    }
    smoothedSlope = prevSlopes.reduce(
      (acc, s) => ALPHA * s + (1 - ALPHA) * acc,
      prevSlopes[0],
    );
  }

  // ── Step 3: Plateau adjustment ──
  const isPlateau = detectPlateauFromValues(overallValues);
  const effectiveSlope = isPlateau ? smoothedSlope * 0.3 : smoothedSlope;

  // ── Step 4: Generate predictions ──
  const predictions: SkillTrajectoryPoint[] = [];
  const lastScore = overallScore;
  const lastDate = new Date(trajectory[trajectory.length - 1].date);
  const baseConfidence = trajectory[trajectory.length - 1].confidence ?? 70;
  const confidenceDecay = ATHLETIC_CONFIG.TRAJECTORY_CONFIDENCE_DECAY;

  for (let week = 1; week <= targetWeeks; week++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + week * 7);

    // Diminishing returns: improvement slows as score approaches 100
    const headroom = 100 - lastScore;
    const diminishingFactor = clamp(headroom / 100, 0.2, 1);

    // Projected score with diminishing returns
    const projectedDelta = effectiveSlope * week * diminishingFactor;
    const projectedScore = clamp(
      Math.round(lastScore + projectedDelta),
      0,
      100,
    );

    // Confidence band: expands with time
    const weekConfidence = clamp(
      baseConfidence * (1 - confidenceDecay * week),
      20,
      95,
    );
    // Axis prediction: scale current axes proportionally
    const predictedAxes = cloneAxes(currentAxes);
    const scoreRatio = projectedScore / Math.max(1, lastScore);
    for (const axis of ALL_AXES) {
      predictedAxes[axis] = clamp(
        Math.round(currentAxes[axis] * scoreRatio),
        0,
        100,
      );
    }

    predictions.push({
      date: futureDate.toISOString().split("T")[0],
      overall: projectedScore,
      axes: predictedAxes,
      confidence: Math.round(weekConfidence),
    });
  }

  return predictions;
}

// ═══════════════════════════════════════════════════════════
// §5 — detectPlateau
//
// Analyzes trajectory for stagnation patterns and suggests
// interventions to break through.
// ═══════════════════════════════════════════════════════════

/**
 * Detect if a member is in a skill plateau for a specific sport.
 *
 * Plateau criteria:
 *   - Improvement over last N weeks < PLATEAU_IMPROVEMENT_THRESHOLD
 *   - Duration >= PLATEAU_MIN_WEEKS
 *
 * @param memberId — Target member
 * @param sport — Sport to analyze
 * @param trajectory — Historical trajectory points
 * @returns PlateauDetection with intervention suggestions
 */
export function detectPlateau(
  memberId: string,
  sport: SportType,
  trajectory: SkillTrajectoryPoint[],
): PlateauDetection {
  const config = ATHLETIC_CONFIG;
  const minWeeks = config.PLATEAU_MIN_WEEKS;
  const threshold = config.PLATEAU_IMPROVEMENT_THRESHOLD;

  if (trajectory.length < minWeeks + 1) {
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

  // ── Analyze recent trajectory ──
  const recentPoints = trajectory.slice(-(minWeeks + 1));
  const overallValues = recentPoints.map((p) => p.overall);
  const totalImprovement = overallValues[overallValues.length - 1] - overallValues[0];

  const isPlateau = Math.abs(totalImprovement) < threshold;

  // ── Find stagnating axes ──
  const stagnationAxes: AthleticAxis[] = [];
  for (const axis of ALL_AXES) {
    const axisValues = recentPoints.map((p) => p.axes[axis]);
    const axisImprovement = axisValues[axisValues.length - 1] - axisValues[0];
    if (Math.abs(axisImprovement) < threshold) {
      stagnationAxes.push(axis);
    }
  }

  // ── Compute plateau duration ──
  let plateauWeeks = 0;
  if (isPlateau) {
    // Count backwards from most recent point
    for (let i = trajectory.length - 1; i >= 1; i--) {
      const delta = Math.abs(trajectory[i].overall - trajectory[i - 1].overall);
      if (delta < threshold) {
        plateauWeeks++;
      } else {
        break;
      }
    }
  }

  // ── Breakthrough probability ──
  let breakthroughProbability = 0;
  if (isPlateau) {
    // Base: longer plateau → higher breakthrough pressure
    breakthroughProbability = config.BREAKTHROUGH_BASE_RATE + plateauWeeks * 2;

    // Boost if stagnation is in technique (coaching can fix)
    if (stagnationAxes.includes(AthleticAxis.TECHNIQUE)) {
      breakthroughProbability += 15;
    }

    // Reduce if overtraining (need rest, not more training)
    // This would need fatigue data, so we cap conservatively
    breakthroughProbability = clamp(breakthroughProbability, 5, 80);
  }

  // ── Estimated breakthrough date ──
  let estimatedBreakthroughDate: string | null = null;
  if (isPlateau && breakthroughProbability > 30) {
    const weeksToBreakthrough = Math.ceil(
      (80 - breakthroughProbability) / 5 + plateauWeeks * 0.5,
    );
    const date = new Date();
    date.setDate(date.getDate() + weeksToBreakthrough * 7);
    estimatedBreakthroughDate = date.toISOString().split("T")[0];
  }

  // ── Intervention suggestions ──
  const interventions: string[] = [];
  if (isPlateau) {
    if (stagnationAxes.includes(AthleticAxis.TECHNIQUE)) {
      interventions.push("Solicitar sesión de coaching enfocada en técnica");
    }
    if (stagnationAxes.includes(AthleticAxis.POWER) || stagnationAxes.includes(AthleticAxis.ENDURANCE)) {
      interventions.push("Incorporar cross-training: natación o fitness complementario");
    }
    if (stagnationAxes.includes(AthleticAxis.TACTICAL)) {
      interventions.push("Participar en torneo para estimular crecimiento táctico");
    }
    if (stagnationAxes.includes(AthleticAxis.MENTAL)) {
      interventions.push("Reducir intensidad 1 semana: recuperación mental activa");
    }
    if (interventions.length === 0) {
      interventions.push("Variar rutina de entrenamiento: nuevo drills o formato");
    }
    if (plateauWeeks > config.PLATEAU_MIN_WEEKS * 2) {
      interventions.push("Considerar pausa activa de 5-7 días para reset fisiológico");
    }
  }

  return {
    memberId,
    sport,
    isPlateau,
    durationWeeks: plateauWeeks,
    stagnationAxes,
    recommendedInterventions: interventions,
    breakthroughProbability: Math.round(breakthroughProbability),
    estimatedBreakthroughDate,
  };
}

/** Quick plateau check from values array (no full detection needed) */
function detectPlateauFromValues(values: number[]): boolean {
  if (values.length < 4) return false;
  const recent = values.slice(-4);
  const improvement = Math.abs(recent[recent.length - 1] - recent[0]);
  return improvement < ATHLETIC_CONFIG.PLATEAU_IMPROVEMENT_THRESHOLD;
}

// ═══════════════════════════════════════════════════════════
// §6 — findPeakWindows
//
// Analyzes session history to find temporal patterns:
// which days and hours the member performs best.
// ═══════════════════════════════════════════════════════════

/**
 * Find peak performance windows from session history.
 *
 * Algorithm:
 *   1. Group sessions by (dayOfWeek, hour)
 *   2. For each group, compute average satisfaction + performance
 *   3. Identify groups above the 75th percentile
 *   4. Merge adjacent windows
 *
 * @param sessions — Member's session history
 * @returns Array of PeakWindow with performance multiplier
 */
export function findPeakWindows(sessions: SportSession[]): PeakWindow[] {
  if (sessions.length < ATHLETIC_CONFIG.PEAK_WINDOW_MIN_SESSIONS) {
    return [];
  }

  // ── Group by (dayOfWeek, startHour) ──
  const windowMap = new Map<string, { scores: number[]; count: number }>();

  for (const session of sessions) {
    const date = new Date(session.startTime);
    if (Number.isNaN(date.getTime())) continue;

    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${dayOfWeek}-${hour}`;

    // Performance score: prefer axis scores, fallback to satisfaction, fallback to 50
    let score = 50;
    if (session.performance?.axisScores) {
      const vals = Object.values(session.performance.axisScores).filter(
        (v): v is number => v != null,
      );
      score = vals.length > 0
        ? vals.reduce((s, v) => s + v, 0) / vals.length
        : 50;
    } else if (session.satisfaction != null) {
      score = session.satisfaction;
    }

    const existing = windowMap.get(key);
    if (existing) {
      existing.scores.push(score);
      existing.count++;
    } else {
      windowMap.set(key, { scores: [score], count: 1 });
    }
  }

  // ── Compute averages and find threshold ──
  const windowScores: Array<{ day: number; hour: number; avgScore: number; count: number }> = [];

  for (const [key, data] of windowMap) {
    const [dayStr, hourStr] = key.split("-");
    const avgScore = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
    windowScores.push({
      day: parseInt(dayStr, 10),
      hour: parseInt(hourStr, 10),
      avgScore: Math.round(avgScore),
      count: data.count,
    });
  }

  if (windowScores.length === 0) return [];

  // Sort by score descending
  windowScores.sort((a, b) => b.avgScore - a.avgScore);

  // 75th percentile threshold
  const p75Index = Math.floor(windowScores.length * 0.25);
  const threshold = windowScores[Math.min(p75Index, windowScores.length - 1)].avgScore;

  // Overall average for computing multiplier
  const overallAvg = windowScores.reduce((s, w) => s + w.avgScore, 0) / windowScores.length;

  // ── Build PeakWindows for above-threshold entries ──
  const peaks: PeakWindow[] = [];

  for (const w of windowScores) {
    if (w.avgScore < threshold || w.count < 2) continue;

    // Merge with existing window if adjacent
    const existing = peaks.find(
      (p) => p.dayOfWeek === w.day && Math.abs(p.startHour - w.hour) <= 1,
    );

    if (existing) {
      existing.startHour = Math.min(existing.startHour, w.hour);
      existing.endHour = Math.max(existing.endHour, w.hour + 1);
      existing.performanceMultiplier = Math.max(
        existing.performanceMultiplier,
        overallAvg > 0 ? Math.round((w.avgScore / overallAvg) * 100) / 100 : 1,
      );
    } else {
      peaks.push({
        dayOfWeek: w.day,
        startHour: w.hour,
        endHour: w.hour + 1,
        performanceMultiplier: overallAvg > 0
          ? Math.round((w.avgScore / overallAvg) * 100) / 100
          : 1,
      });
    }
  }

  // Sort by day then hour
  peaks.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour);

  return peaks.slice(0, 10); // Max 10 windows
}

// ═══════════════════════════════════════════════════════════
// §7 — computeCrossSportTransfers
//
// Analyzes which athletic skills transfer between sports
// the member plays. Uses category similarity + shared axes.
// ═══════════════════════════════════════════════════════════

/**
 * Compute cross-sport skill transfers for a member.
 *
 * Algorithm:
 *   1. For each pair of sports the member plays:
 *      a. Look up category transfer rate from CATEGORY_TRANSFER_RATES
 *      b. Identify which axes are strong in both sports (>50)
 *      c. Adjust rate by shared axis count
 *      d. If adjusted rate >= threshold, include in results
 *   2. Sort by transfer rate descending
 *
 * @param params.memberId — Target member
 * @param params.sportBreakdown — Per-sport profiles
 * @param params.totalSessions — Total sessions across all sports
 * @returns Array of CrossSportTransfer
 */
export function computeCrossSportTransfers(params: {
  memberId: string;
  sportBreakdown: Record<SportType, SportSpecificProfile>;
  totalSessions: number;
}): CrossSportTransfer[] {
  const { sportBreakdown, totalSessions } = params;

  const sports = Object.keys(sportBreakdown) as SportType[];
  if (sports.length < 2 || totalSessions < TRANSFER_MIN_SESSIONS * 2) {
    return [];
  }

  const transfers: CrossSportTransfer[] = [];

  for (let i = 0; i < sports.length; i++) {
    for (let j = 0; j < sports.length; j++) {
      if (i === j) continue;

      const fromSport = sports[i];
      const toSport = sports[j];
      const fromProfile = sportBreakdown[fromSport];
      const toProfile = sportBreakdown[toSport];

      if (!fromProfile || !toProfile) continue;
      if (fromProfile.sessionsCount < TRANSFER_MIN_SESSIONS) continue;

      // Category-based transfer rate
      const fromCategory = SPORT_CONFIG[fromSport]?.category ?? SportCategory.INDIVIDUAL;
      const toCategory = SPORT_CONFIG[toSport]?.category ?? SportCategory.INDIVIDUAL;
      const categoryKey = `${fromCategory}-${toCategory}`;
      const baseRate = CATEGORY_TRANSFER_RATES[categoryKey] ?? 0;

      if (baseRate < TRANSFER_MIN_RATE) continue;

      // Identify transferred axes: strong in BOTH sports (>50)
      const transferredAxes: AthleticAxis[] = [];
      for (const axis of ALL_AXES) {
        if (
          fromProfile.axisScores[axis] >= 50 &&
          toProfile.axisScores[axis] >= 40
        ) {
          transferredAxes.push(axis);
        }
      }

      if (transferredAxes.length === 0) continue;

      // Adjust rate by axis overlap
      const axisBonus = transferredAxes.length / ALL_AXES.length;
      const adjustedRate = clamp(
        baseRate * (0.7 + 0.3 * axisBonus),
        0,
        1,
      );

      if (adjustedRate < TRANSFER_MIN_RATE) continue;

      // Generate explanation
      transferredAxes.map((a) => axisLabel(a)).join(", ");
      const explanation = generateTransferExplanation(
        fromSport,
        toSport,
        transferredAxes,
        adjustedRate,
      );

      transfers.push({
        fromSport,
        toSport,
        transferRate: Math.round(adjustedRate * 100) / 100,
        transferredAxes,
        explanation,
      });
    }
  }

  // Sort by transfer rate descending, deduplicate by sport pair
  transfers.sort((a, b) => b.transferRate - a.transferRate);

  // Keep only unique from→to pairs (highest rate)
  const seen = new Set<string>();
  return transfers.filter((t) => {
    const key = `${t.fromSport}-${t.toSport}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Generate human-readable transfer explanation */
function generateTransferExplanation(
  fromSport: SportType,
  toSport: SportType,
  axes: AthleticAxis[],
  rate: number,
): string {
  const fromLabel = SPORT_CONFIG[fromSport]?.label ?? fromSport;
  const toLabel = SPORT_CONFIG[toSport]?.label ?? toSport;
  const pct = Math.round(rate * 100);
  const axisNames = axes.map((a) => axisLabel(a).toLowerCase()).join(" y ");

  return `Tu ${axisNames} de ${fromLabel} se transfiere un ${pct}% a ${toLabel}.`;
}

// ═══════════════════════════════════════════════════════════
// §8 — INTERNAL: Trajectory & Fatigue Builders
// ═══════════════════════════════════════════════════════════

/** Build weekly trajectory from session history */
function buildWeeklyTrajectory(sessions: SportSession[]): SkillTrajectoryPoint[] {
  if (sessions.length === 0) return [];

  // Group sessions by week
  const weekMap = new Map<string, SportSession[]>();
  for (const session of sessions) {
    const date = new Date(session.startTime);
    if (Number.isNaN(date.getTime())) continue;
    const key = getWeekKey(date);
    const existing = weekMap.get(key) ?? [];
    existing.push(session);
    weekMap.set(key, existing);
  }

  // Sort weeks chronologically
  const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // Build trajectory points
  const trajectory: SkillTrajectoryPoint[] = [];
  let previousOverall = 0;

  for (const [weekKey, weekSessions] of sortedWeeks) {
    // Compute axes for this week
    const weekAxes = createEmptyAxes();
    let scoredSessions = 0;

    for (const session of weekSessions) {
      if (session.performance?.axisScores) {
        for (const axis of ALL_AXES) {
          const val = session.performance.axisScores[axis];
          if (val != null) {
            weekAxes[axis] += val;
          }
        }
        scoredSessions++;
      }
    }

    if (scoredSessions > 0) {
      for (const axis of ALL_AXES) {
        weekAxes[axis] = Math.round(weekAxes[axis] / scoredSessions);
      }
    } else {
      // No performance data this week — use satisfaction as proxy
      const avgSatisfaction = weekSessions.reduce(
        (s, ses) => s + (ses.satisfaction ?? 50),
        0,
      ) / weekSessions.length;

      for (const axis of ALL_AXES) {
        weekAxes[axis] = Math.round(avgSatisfaction * 0.7 + previousOverall * 0.3);
      }
    }

    const overall = computeOverallScore(weekAxes);
    const confidence = clamp(40 + scoredSessions * 10, 40, 95);

    // Detect event markers
    let event: SkillTrajectoryPoint["event"];
    const delta = overall - previousOverall;
    if (trajectory.length > 0 && delta > 5) {
      event = "breakthrough";
    } else if (trajectory.length > 2) {
      const recentDeltas = trajectory.slice(-3).map((p, i, arr) =>
        i > 0 ? p.overall - arr[i - 1].overall : 0,
      );
      if (recentDeltas.every((d) => Math.abs(d) < 2)) {
        event = "plateau_start";
      }
    }

    // Parse week start date
    const [yearStr, weekNumStr] = weekKey.split("-W");
    const weekDate = new Date(parseInt(yearStr, 10), 0, 1 + (parseInt(weekNumStr, 10) - 1) * 7);

    trajectory.push({
      date: weekDate.toISOString().split("T")[0],
      overall,
      axes: cloneAxes(weekAxes),
      confidence,
      event,
    });

    previousOverall = overall;
  }

  return trajectory;
}

/** Compute current fatigue cycle from recent sessions */
function computeFatigueCycle(sessions: SportSession[]): FatigueCycle {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 86_400_000;

  // Sessions in last 7 days
  const recentSessions = sessions.filter((s) => {
    const ts = parseDate(s.startTime);
    return ts > 0 && now - ts <= SEVEN_DAYS;
  });

  const config = ATHLETIC_CONFIG;

  // Compute cumulative fatigue
  let cumulativeFatigue = 0;
  for (const session of recentSessions) {
    const sport = session.sport;
    const sportConfig = SPORT_CONFIG[sport];
    const intensity = sportConfig?.intensityLevel ?? 0.5;
    const durationHours = session.durationMinutes / 60;
    const perceivedExertion = session.performance?.perceivedExertion
      ? session.performance.perceivedExertion / 10
      : intensity;

    // Fatigue = intensity × duration × perceived exertion
    cumulativeFatigue += intensity * durationHours * perceivedExertion * 15;
  }

  const currentFatigue = clamp(Math.round(cumulativeFatigue), 0, 100);

  // Recovery calculation
  const isOvertraining = recentSessions.length >= config.FATIGUE_OVERTRAINING_SESSIONS;

  let recoveryHours: number;
  if (currentFatigue > 80) {
    recoveryHours = config.RECOVERY_HOURS_PEAK;
  } else if (currentFatigue > 60) {
    recoveryHours = config.RECOVERY_HOURS_INTENSE;
  } else if (currentFatigue > 30) {
    recoveryHours = config.RECOVERY_HOURS_MODERATE;
  } else {
    recoveryHours = config.RECOVERY_HOURS_LOW;
  }

  // Weekly trend: compare first 3 days vs last 4 days
  const threeDaysAgo = now - 3 * 86_400_000;
  const earlySessions = recentSessions.filter((s) => parseDate(s.startTime) < threeDaysAgo);
  const lateSessions = recentSessions.filter((s) => parseDate(s.startTime) >= threeDaysAgo);

  const earlyFatigue = earlySessions.length * 15;
  const lateFatigue = lateSessions.length * 15;
  const trend: TrendDirection = lateFatigue > earlyFatigue + 10
    ? "declining"
    : lateFatigue < earlyFatigue - 10
      ? "improving"
      : "stable";

  // Recommended rest days
  let recommendedRestDays: number;
  if (isOvertraining) {
    recommendedRestDays = 3;
  } else if (currentFatigue > 70) {
    recommendedRestDays = 2;
  } else if (currentFatigue > 40) {
    recommendedRestDays = 1;
  } else {
    recommendedRestDays = 0;
  }

  return {
    currentFatigue,
    recommendedRestDays,
    hoursToRecovery: recoveryHours,
    isOvertraining,
    weeklyTrend: trend,
  };
}

// ── Internal: breakthrough probability ──

function computeBreakthroughProbability(
  trajectory: SkillTrajectoryPoint[],
  sessions: SportSession[],
  competitions: Competition[],
): number {
  if (trajectory.length < 3) return ATHLETIC_CONFIG.BREAKTHROUGH_BASE_RATE;

  let probability = ATHLETIC_CONFIG.BREAKTHROUGH_BASE_RATE;

  // Plateau pressure: longer plateau → higher pressure
  const isPlateau = detectPlateauFromValues(trajectory.map((p) => p.overall));
  if (isPlateau) {
    const recentImprovement = Math.abs(
      trajectory[trajectory.length - 1].overall - trajectory[Math.max(0, trajectory.length - 5)].overall,
    );
    probability += (ATHLETIC_CONFIG.PLATEAU_IMPROVEMENT_THRESHOLD - recentImprovement) * 3;
  }

  // Coaching recently started → boost
  const recentCoaching = sessions.filter(
    (s) =>
      s.coachId != null &&
      parseDate(s.startTime) > Date.now() - 30 * 86_400_000,
  );
  if (recentCoaching.length > 0) {
    probability += 10;
  }

  // Competition participation → boost
  const recentCompetitions = competitions.filter(
    (c) => parseDate(c.scheduledDate) > Date.now() - 30 * 86_400_000,
  );
  if (recentCompetitions.length > 0) {
    probability += 8;
  }

  // High variety → boost
  const uniqueSports = new Set(sessions.map((s) => s.sport));
  if (uniqueSports.size >= 3) {
    probability += 5;
  }

  // Overtraining → penalty
  const fatigue = computeFatigueCycle(sessions);
  if (fatigue.isOvertraining) {
    probability -= 15;
  }

  return clamp(Math.round(probability), 5, 85);
}