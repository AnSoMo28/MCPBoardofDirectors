/**
 * src/features/sports/lib/classIntelligence.ts
 * ═══════════════════════════════════════════════════════════
 * §S6 — Class Intelligence Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Class Intelligence Engine analyzes class enrollment
 * patterns, predicts demand, balances skill groups, manages
 * waitlist priority, and identifies optimal scheduling slots
 * using venue utilization data from §S2.
 *
 * Functions:
 *   buildClassIntelligence()      — Full intelligence for a class
 *   buildClassIntelligenceSafe()  — Degraded wrapper, never throws
 *   predictEnrollmentNextWeek()   — Enrollment prediction
 *   balanceSkillGroups()          — Optimal skill-based grouping
 *   computeWaitlistPriority()     — Waitlist entry scoring
 *   computeClassRetention()       — Week-over-week retention
 *   findOptimalClassSlots()       — Venue-aware scheduling
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S6
 */

import type {
  ClassIntelligence,
  EnrollmentHistory,
  WaitlistEntry,
  SkillGroup,
  SportClass,
  SportSession,
  TrendDirection,
} from "../types";

import {
  SkillLevel
} from "../types";

import {
  CLASS_CONFIG,
} from "../config";

import {
  buildUsageHeatmap,
} from "./arenaIntelligence";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** All SkillLevel values for iteration */
const ALL_SKILL_LEVELS = Object.values(SkillLevel);

/** SkillLevel to numeric mapping for comparison */
const SKILL_LEVEL_NUMERIC: Record<SkillLevel, number> = {
  [SkillLevel.BEGINNER]: 1,
  [SkillLevel.INTERMEDIATE]: 2,
  [SkillLevel.ADVANCED]: 3,
  [SkillLevel.ALL_LEVELS]: 2,
};

/** Reasonable capacity bounds */
const MIN_CAPACITY = 4;
const MAX_CAPACITY = 30;

/** Class-appropriate hours */
const CLASS_HOURS_START = 6;
const CLASS_HOURS_END = 22;

/** Days in one day in ms */
const MS_PER_DAY = 86_400_000;

/** Optimal class slots to recommend */
const MAX_SLOT_RECOMMENDATIONS = 10;

/** Day of week labels */
const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

// ═══════════════════════════════════════════════════════════
// §1 — buildClassIntelligence
//
// Constructs complete ClassIntelligence from class entity,
// enrollment history, waitlist, and session data.
// ═══════════════════════════════════════════════════════════

/**
 * Build complete ClassIntelligence for a sport class.
 *
 * Algorithm:
 *   1. Predict next week enrollment from history
 *   2. Compute skill distribution from waitlist + member data
 *   3. Compute retention rate from session attendance
 *   4. Compute optimal capacity from fill rate + waitlist
 *   5. Compute demand trend from enrollment history
 *
 * @param sportClass — The class entity
 * @param enrollmentHistory — Historical enrollment data
 * @param waitlist — Current waitlist entries
 * @param sessions — Sessions associated with this class
 * @param memberSkillLevels — Optional map of memberId → SkillLevel
 * @returns ClassIntelligence
 */
export function buildClassIntelligence(
  sportClass: SportClass,
  enrollmentHistory: EnrollmentHistory[],
  waitlist: WaitlistEntry[],
  sessions: SportSession[],
  memberSkillLevels?: Record<string, SkillLevel>,
): ClassIntelligence {
  const predictedEnrollmentNextWeek = predictEnrollmentNextWeek(
    sportClass.classId,
    enrollmentHistory,
    sportClass.capacity,
  );

  const skillDistribution = computeSkillDistribution(
    waitlist,
    memberSkillLevels,
  );

  const retentionRate = computeClassRetention(
    sessions,
    CLASS_CONFIG.RETENTION_WINDOW_WEEKS,
  );

  const optimalCapacity = computeOptimalCapacity(
    sportClass.capacity,
    enrollmentHistory,
    waitlist.length,
  );

  const demandTrend = computeDemandTrend(enrollmentHistory);

  return {
    classId: sportClass.classId,
    className: sportClass.name,
    sport: sportClass.sport,
    enrollmentCurrent: sportClass.enrolled,
    enrollmentCapacity: sportClass.capacity,
    predictedEnrollmentNextWeek,
    waitlistCount: waitlist.length,
    skillDistribution,
    avgSatisfaction: sportClass.satisfactionAvg,
    retentionRate,
    optimalCapacity,
    demandTrend,
    revenuePerSession: sportClass.revenuePerSession,
  };
}

/**
 * Safe wrapper around buildClassIntelligence.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildClassIntelligenceSafe(
  sportClass: SportClass,
  enrollmentHistory: EnrollmentHistory[],
  waitlist: WaitlistEntry[],
  sessions: SportSession[],
  memberSkillLevels?: Record<string, SkillLevel>,
): ClassIntelligence {
  try {
    return buildClassIntelligence(
      sportClass,
      enrollmentHistory ?? [],
      waitlist ?? [],
      sessions ?? [],
      memberSkillLevels,
    );
  } catch {
    return createMinimalIntelligence(sportClass);
  }
}

function createMinimalIntelligence(sportClass: SportClass): ClassIntelligence {
  const skillDistribution = {} as Record<SkillLevel, number>;
  for (const level of ALL_SKILL_LEVELS) {
    skillDistribution[level] = 0;
  }

  return {
    classId: sportClass.classId,
    className: sportClass.name,
    sport: sportClass.sport,
    enrollmentCurrent: sportClass.enrolled,
    enrollmentCapacity: sportClass.capacity,
    predictedEnrollmentNextWeek: sportClass.enrolled,
    waitlistCount: 0,
    skillDistribution,
    avgSatisfaction: sportClass.satisfactionAvg,
    retentionRate: 0,
    optimalCapacity: sportClass.capacity,
    demandTrend: "stable" as TrendDirection,
    revenuePerSession: sportClass.revenuePerSession,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — predictEnrollmentNextWeek
//
// Predicts enrollment using linear regression on history.
// ═══════════════════════════════════════════════════════════

/**
 * Predict next week's enrollment for a class.
 *
 * Algorithm:
 *   1. Sort history by date ascending
 *   2. If insufficient data (< ENROLLMENT_PREDICTION_MIN_WEEKS):
 *      return latest enrolled value
 *   3. Linear regression on enrolled values
 *   4. Project one step forward
 *   5. Clamp to [0, maxCapacity]
 *
 * @param classId — Target class
 * @param history — Enrollment history
 * @param maxCapacity — Class capacity (upper bound)
 * @returns Predicted enrollment count
 */
export function predictEnrollmentNextWeek(
  classId: string,
  history: EnrollmentHistory[],
  maxCapacity: number,
): number {
  const classHistory = history
    .filter((h) => h.classId === classId)
    .sort((a, b) => parseDate(a.date) - parseDate(b.date));

  if (classHistory.length === 0) return 0;

  if (classHistory.length < CLASS_CONFIG.ENROLLMENT_PREDICTION_MIN_WEEKS) {
    return classHistory[classHistory.length - 1].enrolled;
  }

  const values = classHistory.map((h) => h.enrolled);
  const slope = computeSlope(values);
  const lastValue = values[values.length - 1];
  const predicted = Math.round(lastValue + slope);

  return clamp(predicted, 0, maxCapacity);
}

// ═══════════════════════════════════════════════════════════
// §3 — balanceSkillGroups
//
// Creates balanced skill groups for a class.
// ═══════════════════════════════════════════════════════════

/**
 * Create balanced skill groups for a class.
 *
 * Algorithm:
 *   1. Sort members by skill score ascending
 *   2. Greedily group: add member to current group if
 *      level difference <= SKILL_GROUP_MAX_DIFF and
 *      group size < SKILL_GROUP_OPTIMAL_SIZE
 *   3. Otherwise, finalize group and start new one
 *   4. Compute homogeneity per group
 *
 * @param classId — Target class
 * @param members — Members with skill data
 * @returns SkillGroup[] sorted by averageScore
 */
export function balanceSkillGroups(
  classId: string,
  members: Array<{ memberId: string; skillLevel: SkillLevel; skillScore: number }>,
): SkillGroup[] {
  if (members.length === 0) return [];

  const sorted = [...members].sort((a, b) => a.skillScore - b.skillScore);
  const groups: SkillGroup[] = [];
  let currentBatch: typeof sorted = [];

  for (const member of sorted) {
    if (currentBatch.length === 0) {
      currentBatch.push(member);
      continue;
    }

    const levelDiff = Math.abs(
      getSkillLevelNumeric(member.skillLevel) -
      getSkillLevelNumeric(currentBatch[0].skillLevel),
    );

    const fitsLevel = levelDiff <= CLASS_CONFIG.SKILL_GROUP_MAX_DIFF;
    const fitsSize = currentBatch.length < CLASS_CONFIG.SKILL_GROUP_OPTIMAL_SIZE;

    if (fitsLevel && fitsSize) {
      currentBatch.push(member);
    } else {
      groups.push(finalizeSkillGroup(classId, currentBatch, groups.length));
      currentBatch = [member];
    }
  }

  if (currentBatch.length > 0) {
    groups.push(finalizeSkillGroup(classId, currentBatch, groups.length));
  }

  return groups;
}

// ═══════════════════════════════════════════════════════════
// §4 — computeWaitlistPriority
//
//# ═══════════════════════════════════════════════════════════
// Scores a waitlist entry using configurable weights.
// ═══════════════════════════════════════════════════════════

/**
 * Compute priority score for a waitlist entry.
 *
 * Uses CLASS_CONFIG.WAITLIST_WEIGHTS:
 *   - skill_fit (0.4): how well member's level matches class
 *   - seniority (0.3): how long they've been waiting
 *   - registration_order (0.3): position in queue
 *
 * @param entry — Waitlist entry to score
 * @param classSkillLevel — The class's target skill level
 * @param totalWaitlistSize — Total entries in waitlist
 * @returns Priority score 0-100
 */
export function computeWaitlistPriority(
  entry: WaitlistEntry,
  classSkillLevel: SkillLevel,
  totalWaitlistSize: number,
): number {
  const weights = CLASS_CONFIG.WAITLIST_WEIGHTS;

  // Skill fit: 1.0 = perfect match, 0 = maximum mismatch
  const skillFit = computeSkillFit(entry.skillLevel, classSkillLevel);

  // Seniority: days since joined, normalized to 30-day window
  const daysWaiting = Math.max(
    0,
    (Date.now() - parseDate(entry.joinedDate)) / MS_PER_DAY,
  );
  const seniority = clamp(daysWaiting / 30, 0, 1);

  // Registration order: lower position = higher score
  const registrationOrder = totalWaitlistSize > 1
    ? 1 - (entry.position - 1) / (totalWaitlistSize - 1)
    : 1;

  const priority = Math.round(
    (skillFit * (weights.skill_fit ?? 0.4) +
    seniority * (weights.seniority ?? 0.3) +
    registrationOrder * (weights.registration_order ?? 0.3)) * 100,
  );

  return clamp(priority, 0, 100);
}

// ═══════════════════════════════════════════════════════════
// §5 — computeClassRetention
//
// Measures week-over-week member retention.
// ═══════════════════════════════════════════════════════════

/**
 * Compute class retention rate from session attendance.
 *
 * Algorithm:
 *   1. Split sessions into weekly buckets by memberId sets
 *   2. For each consecutive week pair, count returning members
 *   3. Average retention across all pairs
 *
 * @param sessions — Sessions associated with this class
 * @param windowWeeks — Number of weeks to analyze
 * @returns Retention rate 0-100
 */
export function computeClassRetention(
  sessions: SportSession[],
  windowWeeks: number,
): number {
  if (sessions.length === 0) return 0;

  const buckets = splitIntoWeeklyBuckets(sessions, windowWeeks);

  if (buckets.length < 2) return 0;

  let totalRetention = 0;
  let pairCount = 0;

  for (let i = 0; i < buckets.length - 1; i++) {
    const currentMembers = buckets[i];
    const nextMembers = buckets[i + 1];

    if (currentMembers.size === 0) continue;

    let returning = 0;
    for (const memberId of currentMembers) {
      if (nextMembers.has(memberId)) returning++;
    }

    totalRetention += returning / currentMembers.size;
    pairCount++;
  }

  return pairCount > 0
    ? Math.round((totalRetention / pairCount) * 100)
    : 0;
}

// ═══════════════════════════════════════════════════════════
// §6 — findOptimalClassSlots
//
// Uses §S2 heatmap data to find low-utilization venue slots.
// ═══════════════════════════════════════════════════════════

/** Local type for slot recommendations */
export interface ClassSlotRecommendation {
  readonly dayOfWeek: number;
  readonly hour: number;
  readonly utilizationScore: number;
  readonly label: string;
}

/**
 * Find optimal time slots for scheduling a class.
 *
 * Uses buildUsageHeatmap from §S2 to identify low-utilization
 * windows at the venue, filtered to class-appropriate hours.
 *
 * @param venueId — Target venue
 * @param sessions — Historical sessions for heatmap
 * @returns Top 10 lowest-utilization slots
 */
export function findOptimalClassSlots(
  venueId: string,
  sessions: SportSession[],
): ClassSlotRecommendation[] {
  const heatmap = buildUsageHeatmap(venueId, sessions, "month");

  // Filter to class-appropriate hours
  const eligible = heatmap.filter(
    (cell) => cell.hour >= CLASS_HOURS_START && cell.hour < CLASS_HOURS_END,
  );

  // Sort by utilization ascending (lowest first)
  eligible.sort((a, b) => a.value - b.value);

  return eligible.slice(0, MAX_SLOT_RECOMMENDATIONS).map((cell) => ({
    dayOfWeek: cell.day,
    hour: cell.hour,
    utilizationScore: cell.value,
    label: `${DAY_LABELS[cell.day] ?? ""} ${String(cell.hour).padStart(2, "0")}:00`,
  }));
}

// ═══════════════════════════════════════════════════════════
// §7 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/** Linear slope from indexed values */
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

/** Get numeric value for SkillLevel */
function getSkillLevelNumeric(level: SkillLevel): number {
  return SKILL_LEVEL_NUMERIC[level] ?? 2;
}

/** Compute how well a member's skill level fits the class level */
function computeSkillFit(
  memberLevel: SkillLevel,
  classLevel: SkillLevel,
): number {
  const memberNum = getSkillLevelNumeric(memberLevel);
  const classNum = getSkillLevelNumeric(classLevel);
  const maxDiff = 2; // max possible level difference
  const diff = Math.abs(memberNum - classNum);
  return clamp(1 - diff / maxDiff, 0, 1);
}

/** Compute skill distribution from waitlist and optional member data */
function computeSkillDistribution(
  waitlist: WaitlistEntry[],
  memberSkillLevels?: Record<string, SkillLevel>,
): Record<SkillLevel, number> {
  const distribution = {} as Record<SkillLevel, number>;
  for (const level of ALL_SKILL_LEVELS) {
    distribution[level] = 0;
  }

  // From waitlist entries
  for (const entry of waitlist) {
    if (distribution[entry.skillLevel] != null) {
      distribution[entry.skillLevel]++;
    }
  }

  // From explicit member data
  if (memberSkillLevels) {
    for (const level of Object.values(memberSkillLevels)) {
      if (distribution[level] != null) {
        distribution[level]++;
      }
    }
  }

  return distribution;
}

/** Compute optimal capacity based on fill rate and demand */
function computeOptimalCapacity(
  currentCapacity: number,
  history: EnrollmentHistory[],
  waitlistCount: number,
): number {
  if (history.length === 0) return currentCapacity;

  const avgFillRate =
    history.reduce((sum, h) => sum + h.fillRatePct, 0) / history.length;
  const hasWaitlist = waitlistCount > 0;

  let suggested: number;

  if (avgFillRate >= CLASS_CONFIG.FULL_THRESHOLD_PCT && hasWaitlist) {
    // High demand: increase capacity by 20%
    suggested = Math.round(currentCapacity * 1.2);
  } else if (avgFillRate < CLASS_CONFIG.CRITICAL_THRESHOLD_PCT) {
    // Critical: reduce to 60% of current
    suggested = Math.round(currentCapacity * 0.6);
  } else if (avgFillRate < CLASS_CONFIG.LOW_THRESHOLD_PCT) {
    // Low: reduce by 20%
    suggested = Math.round(currentCapacity * 0.8);
  } else {
    // Healthy: keep current
    suggested = currentCapacity;
  }

  return clamp(suggested, MIN_CAPACITY, MAX_CAPACITY);
}

/** Compute demand trend from enrollment history */
function computeDemandTrend(history: EnrollmentHistory[]): TrendDirection {
  if (history.length < 2) {
    return "stable" as TrendDirection;
  }

  const sorted = [...history].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date),
  );

  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst =
    firstHalf.reduce((s, h) => s + h.enrolled, 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((s, h) => s + h.enrolled, 0) / secondHalf.length;

  if (avgFirst === 0) return "stable" as TrendDirection;

  const deltaPct = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (deltaPct > 5) return "improving" as TrendDirection;
  if (deltaPct < -5) return "declining" as TrendDirection;
  return "stable" as TrendDirection;
}

/** Create a SkillGroup from a batch of members */
function finalizeSkillGroup(
  classId: string,
  batch: Array<{ memberId: string; skillLevel: SkillLevel; skillScore: number }>,
  groupIndex: number,
): SkillGroup {
  const memberIds = batch.map((m) => m.memberId);
  const scores = batch.map((m) => m.skillScore);
  const averageScore = Math.round(
    scores.reduce((s, v) => s + v, 0) / scores.length,
  );

  // Homogeneity: 100 when all scores identical, lower as they diverge
  const homogeneity = computeHomogeneity(scores);

  // Dominant skill level in the group
  const levelCounts = new Map<SkillLevel, number>();
  for (const m of batch) {
    levelCounts.set(m.skillLevel, (levelCounts.get(m.skillLevel) ?? 0) + 1);
  }
  let dominantLevel = SkillLevel.BEGINNER;
  let maxCount = 0;
  for (const [level, count] of levelCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantLevel = level;
    }
  }

  return {
    groupId: `group_${classId}_${groupIndex + 1}`,
    classId,
    skillLevel: dominantLevel,
    memberIds,
    averageScore,
    homogeneity,
  };
}

/** Compute homogeneity from score array (0-100) */
function computeHomogeneity(scores: number[]): number {
  if (scores.length <= 1) return 100;

  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance =
    scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Max possible stdDev for 0-100 range is 50
  const homogeneity = Math.round((1 - stdDev / 50) * 100);
  return clamp(homogeneity, 0, 100);
}

/** Split sessions into weekly buckets of unique memberIds */
function splitIntoWeeklyBuckets(
  sessions: SportSession[],
  maxWeeks: number,
): Array<Set<string>> {
  const sorted = [...sessions].sort(
    (a, b) => parseDate(a.startTime) - parseDate(b.startTime),
  );

  if (sorted.length === 0) return [];

  // Find the earliest session date as reference
  const earliest = parseDate(sorted[0].startTime);
  const buckets: Array<Set<string>> = [];

  for (const session of sorted) {
    const ts = parseDate(session.startTime);
    if (ts <= 0) continue;

    const weekIndex = Math.floor((ts - earliest) / (7 * MS_PER_DAY));

    // Only keep up to maxWeeks
    if (weekIndex >= maxWeeks) continue;

    // Ensure bucket exists
    while (buckets.length <= weekIndex) {
      buckets.push(new Set());
    }

    buckets[weekIndex].add(session.memberId);
  }

  return buckets;
}