/**
 * src/features/sports/lib/sportWellness.ts
 * ═══════════════════════════════════════════════════════════
 * §S9 — Sport Wellness Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Sport Wellness Engine monitors the intersection of
 * athletic performance and physical wellbeing. It detects
 * overtraining before burnout, computes injury risk per
 * sport, recommends recovery schedules, correlates wellness
 * data with participation patterns, and ensures age-
 * appropriate training intensity.
 *
 * Functions:
 *   buildSportWellnessProfile()     — Full wellness profile
 *   buildSportWellnessProfileSafe() — Degraded wrapper, never throws
 *   computeInjuryRisk()             — Per-sport injury risk
 *   detectOvertraining()            — Overtraining syndrome detection
 *   computeWellnessCorrelation()    — Wellness ↔ participation link
 *   recommendRecoverySchedule()     — Rest days recommendation
 *   getAgeAppropriateSports()       — Age-filtered sport list
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S9
 */

import type {
  SportWellnessProfile,
  SportRisk,
  WellnessCorrelation,
  WellnessScore,
  SportSession,
  MemberSportsProfile,
  FatigueCycle,
} from "../types";

import {
  SportType,
  RecoveryStatus
} from "../types";

import {
  WELLNESS_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Injury risk thresholds */
const INJURY_HIGH = WELLNESS_CONFIG.INJURY_RISK_HIGH;
const INJURY_CRITICAL = WELLNESS_CONFIG.INJURY_RISK_CRITICAL;

/** Overtraining threshold */
const OVERTRAINING_THRESHOLD = WELLNESS_CONFIG.OVERTRAINING_THRESHOLD;
const OVERTRAINING_SESSIONS_WEEK = WELLNESS_CONFIG.OVERTRAINING_SESSIONS_WEEK;
/** Minimum age for high-intensity sports */
const HIGH_INTENSITY_MIN_AGE = WELLNESS_CONFIG.HIGH_INTENSITY_MIN_AGE;

/** Correlation thresholds */
const CORRELATION_MIN_DATA = WELLNESS_CONFIG.CORRELATION_MIN_DATA_POINTS;
const CORRELATION_SIGNIFICANT = WELLNESS_CONFIG.CORRELATION_SIGNIFICANT;

/** Sport risk multipliers */
const SPORT_RISK = WELLNESS_CONFIG.SPORT_RISK_MULTIPLIERS;

/** Days in one week in ms */
const MS_PER_WEEK = 7 * 86_400_000;
/** High-intensity sport categories */
const HIGH_INTENSITY_CATEGORIES = new Set([
  "basketball",
  "football",
  "squash",
]);

/** Sport → risk type mapping */
const SPORT_RISK_TYPES: Partial<Record<SportType, SportRisk["riskType"]>> = {
  [SportType.TENNIS]: "overuse",
  [SportType.GOLF]: "postural",
  [SportType.SWIMMING]: "overuse",
  [SportType.FITNESS]: "overuse",
  [SportType.BASKETBALL]: "acute",
  [SportType.VOLLEYBALL]: "acute",
  [SportType.FOOTBALL]: "acute",
  [SportType.SQUASH]: "overuse",
  [SportType.PADEL]: "overuse",
  [SportType.YOGA]: "postural",
  [SportType.PILATES]: "postural",
};

/** Prevention tips per risk type */
const RISK_PREVENTIONS: Record<string, string> = {
  overuse: "Alternar deportes. Calentar 15min. Estiramientos post-sesión.",
  acute: "Fortalecer articulaciones. Usar equipamiento adecuado. Respetar límites.",
  postural: "Ejercicios de movilidad. Ergonomía en vida diaria. Pilates complementario.",
  cardiovascular: "Monitorear frecuencia cardíaca. Exámenes médicos regulares. Hidratación constante.",
};
// ═══════════════════════════════════════════════════════════
// §1 — buildSportWellnessProfile
//
// Constructs a complete wellness profile from session data,
// wellness scores, and member information.
// ═══════════════════════════════════════════════════════════

/**
 * Build a complete SportWellnessProfile.
 *
 * Algorithm:
 *   1. Compute injury risk from session intensity + frequency
 *   2. Compute overtraining score from weekly session count
 *   3. Determine recovery status from risk + overtraining
 *   4. Compute sport-specific risks
 *   5. Determine age-appropriate sports
 *   6. Compute wellness-participation correlation
 *
 * @param memberId — Target member
 * @param member — Member profile (for age, sports)
 * @param sessions — Member's sport sessions
 * @param wellnessScores — Historical wellness scores
 * @param fatigueCycle — Optional fatigue data from §S1
 * @returns SportWellnessProfile
 */
export function buildSportWellnessProfile(
  memberId: string,
  member: MemberSportsProfile,
  sessions: SportSession[],
  wellnessScores: WellnessScore[],
  fatigueCycle?: FatigueCycle,
): SportWellnessProfile {
  const memberSessions = sessions.filter(
    (s) => s.memberId === memberId,
  );

  const injuryRiskScore = computeInjuryRisk(memberSessions, member.age);
  const overtrainingResult = detectOvertraining(memberSessions, wellnessScores);

  const recoveryStatus = deriveRecoveryStatus(
    injuryRiskScore,
    overtrainingResult.score,
  );

  const recommendedRestDays = recommendRecoverySchedule(
    injuryRiskScore,
    overtrainingResult.score,
    fatigueCycle,
  );

  const sportSpecificRisks = computeSportSpecificRisks(
    member.sports,
    memberSessions,
    member.age,
  );

  const ageAppropriateSports = getAgeAppropriateSports(member.age);

  const wellnessCorrelation = computeWellnessCorrelation(
    wellnessScores,
    memberSessions,
  );

  return {
    memberId,
    injuryRiskScore,
    overtrainingScore: overtrainingResult.score,
    recoveryStatus,
    recommendedRestDays,
    sportSpecificRisks,
    ageAppropriateSports,
    wellnessCorrelation,
  };
}

/**
 * Safe wrapper around buildSportWellnessProfile.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildSportWellnessProfileSafe(
  memberId: string,
  member: MemberSportsProfile,
  sessions: SportSession[],
  wellnessScores: WellnessScore[],
  fatigueCycle?: FatigueCycle,
): SportWellnessProfile {
  try {
    return buildSportWellnessProfile(
      memberId,
      member,
      sessions ?? [],
      wellnessScores ?? [],
      fatigueCycle,
    );
  } catch {
    return createMinimalWellnessProfile(memberId);
  }
}

function createMinimalWellnessProfile(memberId: string): SportWellnessProfile {
  return {
    memberId,
    injuryRiskScore: 0,
    overtrainingScore: 0,
    recoveryStatus: RecoveryStatus.FULLY_RECOVERED,
    recommendedRestDays: 0,
    sportSpecificRisks: [],
    ageAppropriateSports: [],
    wellnessCorrelation: {
      wellnessScore: 0,
      sportParticipation: 0,
      correlation: 0,
      insight: "Datos insuficientes para análisis de bienestar.",
    },
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — computeInjuryRisk
//
// Calculates injury risk from session intensity, frequency,
// and age factors.
// ═══════════════════════════════════════════════════════════

/**
 * Compute injury risk score for a member.
 *
 * Algorithm:
 *   1. Count sessions in last 7 days (frequency risk)
 *   2. Average perceived exertion (intensity risk)
 *   3. Compute sport-specific risk multiplier
 *   4. Age factor: younger and older both increase risk
 *   5. Composite score 0-100
 *
 * @param sessions — Member's sessions (filtered to this member)
 * @param age — Member's age (optional)
 * @returns Injury risk score 0-100
 */
export function computeInjuryRisk(
  sessions: SportSession[],
  age?: number,
): number {
  if (sessions.length === 0) return 0;

  const now = Date.now();
  const weekAgo = now - MS_PER_WEEK;

  // ── Frequency risk: sessions in last 7 days ──
  const recentSessions = sessions.filter(
    (s) => parseDate(s.startTime) > weekAgo,
  );
  const weeklyCount = recentSessions.length;
  const frequencyRisk = clamp(
    Math.round((weeklyCount / OVERTRAINING_SESSIONS_WEEK) * 100),
    0,
    100,
  );

  // ── Intensity risk: average perceived exertion ──
  const withExertion = sessions.filter(
    (s) => s.performance?.perceivedExertion != null,
  );
  const avgExertion = withExertion.length > 0
    ? withExertion.reduce(
        (sum, s) => sum + s.performance!.perceivedExertion!,
        0,
      ) / withExertion.length / 10
    : 0.5;
  const intensityRisk = Math.round(avgExertion * 100);

  // ── Sport-specific risk ──
  const sportMultipliers = recentSessions.map(
    (s) => SPORT_RISK[s.sport] ?? 1.0,
  );
  const avgSportMultiplier = sportMultipliers.length > 0
    ? sportMultipliers.reduce((s, m) => s + m, 0) / sportMultipliers.length
    : 1.0;
  const sportRisk = Math.round(clamp(avgSportMultiplier - 0.5, 0, 1) * 100);

  // ── Age factor ──
  let ageFactor = 0;
  if (age != null) {
    if (age < 18) ageFactor = 15; // Growing bodies
    else if (age > 50) ageFactor = 20; // Recovery slower
    else if (age > 40) ageFactor = 10;
  }

  // ── Composite ──
  const score = Math.round(
    frequencyRisk * 0.30 +
    intensityRisk * 0.35 +
    sportRisk * 0.20 +
    ageFactor * 0.15,
  );

  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════════
// §3 — detectOvertraining
//
// Detects overtraining syndrome from session patterns and
// wellness data trends.
// ═══════════════════════════════════════════════════════════

/**
 * Detect overtraining syndrome.
 *
 * Algorithm:
 *   1. Count sessions per week (frequency)
 *   2. Check wellness score trends (declining = overtraining)
 *   3. Check for session quality decline
 *   4. Composite overtraining score 0-100
 *
 * @param sessions — Member's sessions
 * @param wellnessScores — Historical wellness scores
 * @returns { score, isOvertraining }
 */
export function detectOvertraining(
  sessions: SportSession[],
  wellnessScores: WellnessScore[],
): { score: number; isOvertraining: boolean } {
  if (sessions.length === 0) {
    return { score: 0, isOvertraining: false };
  }

  // ── Frequency factor ──
  Date.now();
  const recentWeeks = countSessionsPerWeek(sessions, 4);
  const avgSessionsPerWeek =
    recentWeeks.reduce((s, c) => s + c, 0) / Math.max(1, recentWeeks.length);
  const frequencyFactor = clamp(
    Math.round((avgSessionsPerWeek / OVERTRAINING_SESSIONS_WEEK) * 100),
    0,
    100,
  );

  // ── Wellness trend factor ──
  let wellnessFactor = 0;
  if (wellnessScores.length >= 3) {
    const sorted = [...wellnessScores].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date),
    );
    const recent = sorted.slice(-3);
    const older = sorted.slice(0, Math.max(1, sorted.length - 3));

    const recentAvg =
      recent.reduce((s, w) => s + w.overallScore, 0) / recent.length;
    const olderAvg =
      older.reduce((s, w) => s + w.overallScore, 0) / older.length;

    if (olderAvg > 0) {
      const decline = (olderAvg - recentAvg) / olderAvg;
      wellnessFactor = clamp(Math.round(decline * 200), 0, 100);
    }
  }

  // ── Session quality factor ──
  const withSatisfaction = sessions.filter(
    (s) => s.satisfaction != null,
  );
  let qualityFactor = 0;
  if (withSatisfaction.length >= 4) {
    const sortedByDate = [...withSatisfaction].sort(
      (a, b) => parseDate(a.startTime) - parseDate(b.startTime),
    );
    const mid = Math.floor(sortedByDate.length / 2);
    const firstHalf = sortedByDate.slice(0, mid);
    const secondHalf = sortedByDate.slice(mid);

    const avgFirst =
      firstHalf.reduce((s, ses) => s + ses.satisfaction!, 0) /
      firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s, ses) => s + ses.satisfaction!, 0) /
      secondHalf.length;

    if (avgFirst > 0) {
      const decline = (avgFirst - avgSecond) / avgFirst;
      qualityFactor = clamp(Math.round(decline * 200), 0, 100);
    }
  }

  // ── Composite ──
  const score = Math.round(
    frequencyFactor * 0.40 +
    wellnessFactor * 0.35 +
    qualityFactor * 0.25,
  );

  const isOvertraining = score >= OVERTRAINING_THRESHOLD;

  return { score: clamp(score, 0, 100), isOvertraining };
}

// ═══════════════════════════════════════════════════════════
// §4 — computeWellnessCorrelation
//
// Measures the correlation between wellness scores and
// sports participation frequency.
// ═══════════════════════════════════════════════════════════

/**
 * Compute correlation between wellness and sports participation.
 *
 * Algorithm:
 *   1. Split data into weekly buckets: wellness avg + session count
 *   2. If < CORRELATION_MIN_DATA_POINTS weeks, return low-confidence result
 *   3. Compute Pearson correlation coefficient
 *   4. Generate insight text
 *
 * @param wellnessScores — Historical wellness data
 * @param sessions — Member's sessions
 * @returns WellnessCorrelation
 */
export function computeWellnessCorrelation(
  wellnessScores: WellnessScore[],
  sessions: SportSession[],
): WellnessCorrelation {
  if (
    wellnessScores.length < CORRELATION_MIN_DATA ||
    sessions.length < CORRELATION_MIN_DATA
  ) {
    return {
      wellnessScore: wellnessScores.length > 0
        ? Math.round(
            wellnessScores.reduce((s, w) => s + w.overallScore, 0) /
            wellnessScores.length,
          )
        : 0,
      sportParticipation: sessions.length,
      correlation: 0,
      insight: "Datos insuficientes para correlación significativa.",
    };
  }

  // ── Build weekly pairs ──
  const pairs = buildWeeklyWellnessParticipationPairs(
    wellnessScores,
    sessions,
  );

  if (pairs.length < CORRELATION_MIN_DATA) {
    return {
      wellnessScore: Math.round(
        wellnessScores.reduce((s, w) => s + w.overallScore, 0) /
        wellnessScores.length,
      ),
      sportParticipation: sessions.length,
      correlation: 0,
      insight: "Período de datos insuficiente para correlación semanal.",
    };
  }

  // ── Pearson correlation ──
  const correlation = computePearsonCorrelation(
    pairs.map((p) => p.wellness),
    pairs.map((p) => p.participation),
  );

  // ── Insight ──
  const insight = generateCorrelationInsight(
    correlation,
    pairs.length,
  );

  const avgWellness = Math.round(
    pairs.reduce((s, p) => s + p.wellness, 0) / pairs.length,
  );

  return {
    wellnessScore: avgWellness,
    sportParticipation: sessions.length,
    correlation: Math.round(correlation * 100) / 100,
    insight,
  };
}

// ═══════════════════════════════════════════════════════════
// §5 — recommendRecoverySchedule
//
//# ═══════════════════════════════════════════════════════════
// Recommends rest days based on risk scores and fatigue.
// ═══════════════════════════════════════════════════════════

/**
 * Recommend recovery schedule (rest days).
 *
 * Algorithm:
 *   1. Base rest from injury risk score
 *   2. Add rest from overtraining score
 *   3. Factor in fatigue cycle if available
 *   4. Clamp to 0-7 days
 *
 * @param injuryRisk — Injury risk score 0-100
 * @param overtraining — Overtraining score 0-100
 * @param fatigueCycle — Optional fatigue data from §S1
 * @returns Recommended rest days (0-7)
 */
export function recommendRecoverySchedule(
  injuryRisk: number,
  overtraining: number,
  fatigueCycle?: FatigueCycle,
): number {
  let restDays = 0;

  // Injury risk contribution
  if (injuryRisk >= INJURY_CRITICAL) restDays += 3;
  else if (injuryRisk >= INJURY_HIGH) restDays += 2;
  else if (injuryRisk >= 50) restDays += 1;

  // Overtraining contribution
  if (overtraining >= OVERTRAINING_THRESHOLD) restDays += 2;
  else if (overtraining >= 50) restDays += 1;

  // Fatigue cycle contribution
  if (fatigueCycle) {
    if (fatigueCycle.isOvertraining) restDays += 2;
    else if (fatigueCycle.currentFatigue >= 70) restDays += 1;
    else if (fatigueCycle.currentFatigue >= 50) restDays += 0;
    // Use recommended rest if higher
    restDays = Math.max(restDays, fatigueCycle.recommendedRestDays);
  }

  return clamp(restDays, 0, 7);
}

// ═══════════════════════════════════════════════════════════
// §6 — getAgeAppropriateSports
//
//# ═══════════════════════════════════════════════════════════
// Filters available sports by age appropriateness.
// ═══════════════════════════════════════════════════════════

/**
 * Get age-appropriate sports for a member.
 *
 * Algorithm:
 *   1. If no age, return all sports
 *   2. Under HIGH_INTENSITY_MIN_AGE: exclude high-intensity sports
 *   3. Over 65: exclude high-impact sports
 *   4. Otherwise: all sports appropriate
 *
 * @param age — Member's age (optional)
 * @returns SportType[] of appropriate sports
 */
export function getAgeAppropriateSports(age?: number): SportType[] {
  const allSports = Object.values(SportType);

  if (age == null) return allSports;

  if (age < HIGH_INTENSITY_MIN_AGE) {
    // Exclude high-intensity sports for minors
    return allSports.filter(
      (s) => !HIGH_INTENSITY_CATEGORIES.has(s),
    );
  }

  if (age > 65) {
    // Exclude high-impact for seniors
    return allSports.filter(
      (s) => !HIGH_INTENSITY_CATEGORIES.has(s),
    );
  }

  return allSports;
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

/** Count sessions per week over the last N weeks */
function countSessionsPerWeek(
  sessions: SportSession[],
  weeks: number,
): number[] {
  const now = Date.now();
  const cutoff = now - weeks * MS_PER_WEEK;

  const recentSessions = sessions.filter(
    (s) => parseDate(s.startTime) > cutoff,
  );

  const counts: number[] = new Array(weeks).fill(0);

  for (const session of recentSessions) {
    const ts = parseDate(session.startTime);
    const weeksAgo = Math.floor((now - ts) / MS_PER_WEEK);
    const idx = weeks - 1 - weeksAgo;
    if (idx >= 0 && idx < weeks) {
      counts[idx]++;
    }
  }

  return counts;
}

/** Derive recovery status from risk scores */
function deriveRecoveryStatus(
  injuryRisk: number,
  overtraining: number,
): RecoveryStatus {
  const combined = Math.max(injuryRisk, overtraining);

  if (combined >= INJURY_CRITICAL) return RecoveryStatus.INJURED;
  if (combined >= INJURY_HIGH) return RecoveryStatus.AT_RISK;
  if (combined >= 40) return RecoveryStatus.RECOVERING;
  return RecoveryStatus.FULLY_RECOVERED;
}

/** Compute sport-specific risks */
function computeSportSpecificRisks(
  sports: SportType[],
  sessions: SportSession[],
  age?: number,
): SportRisk[] {
  const risks: SportRisk[] = [];

  for (const sport of sports) {
    const sportSessions = sessions.filter((s) => s.sport === sport);
    const multiplier = SPORT_RISK[sport] ?? 1.0;

    // Base risk from sport multiplier
    let riskLevel = Math.round(clamp((multiplier - 0.3) / 1.0 * 100, 0, 100));

    // Age adjustment
    if (age != null) {
      if (age < HIGH_INTENSITY_MIN_AGE && HIGH_INTENSITY_CATEGORIES.has(sport)) {
        riskLevel = Math.min(100, riskLevel + 20);
      }
      if (age > 50) {
        riskLevel = Math.min(100, riskLevel + 10);
      }
    }

    // High frequency adjustment
    const weeklyCount = countSessionsPerWeek(sportSessions, 1)[0] ?? 0;
    if (weeklyCount > 5) {
      riskLevel = Math.min(100, riskLevel + 15);
    }

    const riskType = SPORT_RISK_TYPES[sport] ?? "overuse";
    const prevention = RISK_PREVENTIONS[riskType] ?? RISK_PREVENTIONS.overuse;

    risks.push({
      sport,
      riskType,
      riskLevel: clamp(riskLevel, 0, 100),
      prevention,
    });
  }

  return risks;
}

/** Build weekly wellness-participation pairs */
function buildWeeklyWellnessParticipationPairs(
  wellnessScores: WellnessScore[],
  sessions: SportSession[],
): Array<{ wellness: number; participation: number }> {
  const now = Date.now();
  const pairs: Array<{ wellness: number; participation: number }> = [];

  // Group wellness scores by week
  const wellnessByWeek = new Map<number, number[]>();
  for (const score of wellnessScores) {
    const ts = parseDate(score.date);
    if (ts <= 0) continue;
    const weekOffset = Math.floor((now - ts) / MS_PER_WEEK);
    const existing = wellnessByWeek.get(weekOffset) ?? [];
    existing.push(score.overallScore);
    wellnessByWeek.set(weekOffset, existing);
  }

  // Group sessions by week
  const sessionsByWeek = new Map<number, number>();
  for (const session of sessions) {
    const ts = parseDate(session.startTime);
    if (ts <= 0) continue;
    const weekOffset = Math.floor((now - ts) / MS_PER_WEEK);
    sessionsByWeek.set(
      weekOffset,
      (sessionsByWeek.get(weekOffset) ?? 0) + 1,
    );
  }

  // Build pairs for weeks that have both wellness and session data
  const allWeeks = new Set([
    ...wellnessByWeek.keys(),
    ...sessionsByWeek.keys(),
  ]);

  for (const week of allWeeks) {
    const weekWellness = wellnessByWeek.get(week);
    const weekSessions = sessionsByWeek.get(week);

    if (weekWellness && weekSessions != null) {
      const avgWellness =
        weekWellness.reduce((s, v) => s + v, 0) / weekWellness.length;
      pairs.push({
        wellness: Math.round(avgWellness),
        participation: weekSessions,
      });
    }
  }

  return pairs;
}

/** Compute Pearson correlation coefficient */
function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  if (den === 0) return 0;

  return clamp(num / den, -1, 1);
}

/** Generate correlation insight text */
function generateCorrelationInsight(
  correlation: number,
  dataPoints: number,
): string {
  const abs = Math.abs(correlation);

  if (abs < CORRELATION_SIGNIFICANT) {
    return `No se detecta correlación significativa entre bienestar y participación deportiva (${dataPoints} semanas analizadas).`;
  }

  const strength = abs >= 0.7 ? "fuerte" : abs >= 0.5 ? "moderada" : "débil";
  if (correlation > 0) {
    return `Correlación ${strength} positiva: a mayor participación deportiva, mejor bienestar percibido (${dataPoints} semanas).`;
  }

  return `Correlación ${strength} negativa: la participación alta puede estar afectando el bienestar. Evaluar sobrecarga (${dataPoints} semanas).`;
}