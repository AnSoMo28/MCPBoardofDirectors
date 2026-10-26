/**
 * src/features/sports/lib/sportFinancial.ts
 * ═══════════════════════════════════════════════════════════
 * §S10 — Sport Financial Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Sport Financial Engine reveals the economic story of
 * every sport in the club. It computes ROI per sport,
 * identifies optimization opportunities, forecasts revenue,
 * and quantifies growth potential so decision-makers can
 * allocate resources where they generate the most value.
 *
 * Functions:
 *   buildSportFinancialProfile()      — Full financial profile per sport
 *   buildSportFinancialProfileSafe()  — Degraded wrapper, never throws
 *   forecastRevenue()                 — Monte Carlo revenue prediction
 *   computeGrowthPotential()          — Growth potential scoring
 *   generateOptimizationSuggestions() — AI optimization recommendations
 *   analyzeRevenueBySource()          — Revenue breakdown by source
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S10
 */

import type {
  SportFinancialProfile,
  OptimizationSuggestion,
  RevenueHistory,
  SportSession,
  SportClass,
  Tournament,
  Equipment,
  CoachingSession,
  TrendDirection,
} from "../types";

import {
  SportType,
  SPORT_CONFIG,
} from "../types";

import {
  SPORT_FINANCIAL_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════

/** Config aliases for readability */
const FIN = SPORT_FINANCIAL_CONFIG;

/** Minimum improvement % to suggest */
const MIN_IMPROVEMENT = FIN.MIN_IMPROVEMENT_PCT;

/** Minimum optimization confidence */
const MIN_CONFIDENCE = FIN.MIN_OPTIMIZATION_CONFIDENCE;

/** Forecast months */
const FORECAST_MONTHS = FIN.FORECAST_MONTHS;

/** Minimum data points for forecast */
const FORECAST_MIN_DATA = FIN.FORECAST_MIN_DATA_POINTS;

/** Growth potential weights */
const GROWTH_W = FIN.GROWTH_WEIGHTS;
/** Coaching average price per session (CRC) */
const COACHING_PRICE = FIN.COACHING_AVG_PRICE_PER_SESSION;

/** Class viability minimum sessions per month */
const CLASS_VIABILITY = FIN.CLASS_VIABILITY_MIN_SESSIONS;

/** Monte Carlo iterations */
const MC_ITERATIONS = FIN.MONTE_CARLO_ITERATIONS;

/** Days in one month (approximate) */
const MS_PER_MONTH = 30 * 86_400_000;
/** Revenue source labels */
const SOURCE_LABELS: Record<string, string> = {
  reservations: "Reservaciones",
  classes: "Clases",
  tournaments: "Torneos",
  coaching: "Coaching",
  equipment: "Equipamiento",
};
// ═══════════════════════════════════════════════════════════
// §1 — buildSportFinancialProfile
//
// Constructs a complete financial profile for a single sport
// from revenue history, sessions, classes, tournaments,
// coaching data, and equipment costs.
// ═══════════════════════════════════════════════════════════

/**
 * Build complete SportFinancialProfile for a sport.
 *
 * Algorithm:
 *   1. Aggregate revenue from RevenueHistory
 *   2. Break down by venue, class, tournament, coaching
 *   3. Compute equipment costs
 *   4. Compute ROI = (revenue - costs) / costs
 *   5. Compute revenue trend
 *   6. Compute growth potential
 *   7. Generate optimization suggestions
 *
 * @param sport — Target sport
 * @param revenueHistory — Historical revenue data
 * @param sessions — Sport sessions
 * @param classes — Sport classes
 * @param tournaments — Sport tournaments
 * @param coachingSessions — Coaching sessions
 * @param equipment — Sport equipment
 * @returns SportFinancialProfile
 */
export function buildSportFinancialProfile(
  sport: SportType,
  revenueHistory: RevenueHistory[],
  sessions: SportSession[],
  classes: SportClass[],
  tournaments: Tournament[],
  coachingSessions: CoachingSession[],
  equipment: Equipment[],
): SportFinancialProfile {
  const sportRevenue = revenueHistory.filter((r) => r.sport === sport);

  // ── Aggregate monthly revenue ──
  const revenuePerMonth = computeMonthlyRevenue(sportRevenue);

  // ── Revenue by venue ──
  const revenuePerVenue = computeRevenueByVenue(sportRevenue, sessions);

  // ── Revenue by class ──
  const revenuePerClass = computeRevenueByClass(classes);

  // ── Tournament revenue ──
  const sportTournaments = tournaments.filter((t) => t.sport === sport);
  const tournamentRevenue = sportTournaments.reduce(
    (sum, t) => sum + t.totalRevenue,
    0,
  );

  // ── Coaching revenue ──
  const sportCoaching = coachingSessions.filter((c) => c.sport === sport);
  const coachingRevenue = sportCoaching.length * COACHING_PRICE;

  // ── Equipment costs ──
  const sportEquipment = equipment.filter((e) => e.sport === sport);
  const equipmentCosts = computeEquipmentCosts(sportEquipment);

  // ── ROI ──
  const totalRevenue =
    revenuePerMonth * 12 + tournamentRevenue + coachingRevenue;
  const totalCosts = equipmentCosts;
  const roi = totalCosts > 0
    ? Math.round(((totalRevenue - totalCosts) / totalCosts) * 100)
    : totalRevenue > 0
      ? 100
      : 0;

  // ── Revenue trend ──
  const revenueTrend = computeRevenueTrend(sportRevenue);

  // ── Growth potential ──
  const growthPotential = computeGrowthPotential({
    revenueHistory: sportRevenue,
    sessions,
    classes,
  });

  // ── Optimization suggestions ──
  const optimizationSuggestions = generateOptimizationSuggestions({
    sport,
    revenuePerMonth,
    classes,
    tournaments: sportTournaments,
    equipment: sportEquipment,
    sessions,
  });

  return {
    sport,
    revenuePerMonth,
    revenuePerVenue,
    revenuePerClass,
    tournamentRevenue,
    coachingRevenue,
    equipmentCosts,
    roi,
    revenueTrend,
    growthPotential,
    optimizationSuggestions,
  };
}

/**
 * Safe wrapper around buildSportFinancialProfile.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildSportFinancialProfileSafe(
  sport: SportType,
  revenueHistory: RevenueHistory[],
  sessions: SportSession[],
  classes: SportClass[],
  tournaments: Tournament[],
  coachingSessions: CoachingSession[],
  equipment: Equipment[],
): SportFinancialProfile {
  try {
    return buildSportFinancialProfile(
      sport,
      revenueHistory ?? [],
      sessions ?? [],
      classes ?? [],
      tournaments ?? [],
      coachingSessions ?? [],
      equipment ?? [],
    );
  } catch {
    return createMinimalFinancialProfile(sport);
  }
}

function createMinimalFinancialProfile(sport: SportType): SportFinancialProfile {
  return {
    sport,
    revenuePerMonth: 0,
    revenuePerVenue: {},
    revenuePerClass: {},
    tournamentRevenue: 0,
    coachingRevenue: 0,
    equipmentCosts: 0,
    roi: 0,
    revenueTrend: "stable" as TrendDirection,
    growthPotential: 0,
    optimizationSuggestions: [],
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — forecastRevenue
//
//# ═══════════════════════════════════════════════════════════
// Monte Carlo revenue forecast for N months ahead.
// ═══════════════════════════════════════════════════════════

/** Local type for forecast points */
export interface RevenueForecastPoint {
  readonly month: string;
  readonly predictedRevenue: number;
  readonly confidenceLow: number;
  readonly confidenceHigh: number;
  readonly confidence: number;
}

/**
 * Forecast revenue using Monte Carlo simulation.
 *
 * Algorithm:
 *   1. Compute historical monthly revenue mean and stdDev
 *   2. Apply trend adjustment (slope from history)
 *   3. For each future month, simulate MC_ITERATIONS samples
 *   4. Compute mean, 10th and 90th percentiles
 *   5. Confidence decays with forecast distance
 *
 * @param revenueHistory — Historical revenue for this sport
 * @param months — Months to forecast (default: FORECAST_MONTHS)
 * @returns RevenueForecastPoint[]
 */
export function forecastRevenue(
  revenueHistory: RevenueHistory[],
  months: number = FORECAST_MONTHS,
): RevenueForecastPoint[] {
  // Group by month
  const monthlyData = groupRevenueByMonth(revenueHistory);
  const values = Array.from(monthlyData.values());

  if (values.length < FORECAST_MIN_DATA) {
    return generateFlatForecast(months, values.length > 0 ? values[values.length - 1] : 0);
  }

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const stdDev = computeStdDev(values);
  const slope = computeSlope(values);

  const forecast: RevenueForecastPoint[] = [];
  const startDate = new Date();

  for (let m = 1; m <= months; m++) {
    const futureDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + m,
      1,
    );

    // Trend-adjusted mean
    const adjustedMean = Math.max(0, mean + slope * m);

    // Monte Carlo simulation
    const samples: number[] = [];
    for (let i = 0; i < MC_ITERATIONS; i++) {
      // Box-Muller for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
      const sample = Math.max(0, adjustedMean + z * stdDev);
      samples.push(Math.round(sample));
    }

    samples.sort((a, b) => a - b);

    const predictedRevenue = Math.round(adjustedMean);
    const confidenceLow = samples[Math.floor(MC_ITERATIONS * 0.1)];
    const confidenceHigh = samples[Math.floor(MC_ITERATIONS * 0.9)];
    const confidence = clamp(
      Math.round(85 - m * 3),
      30,
      85,
    );

    forecast.push({
      month: futureDate.toISOString().slice(0, 7),
      predictedRevenue,
      confidenceLow,
      confidenceHigh,
      confidence,
    });
  }

  return forecast;
}

// ═══════════════════════════════════════════════════════════
// §3 — computeGrowthPotential
//
//# ═══════════════════════════════════════════════════════════
// Scores the growth potential for a sport from multiple
// factors using config weights.
// ═══════════════════════════════════════════════════════════

/**
 * Compute growth potential score for a sport.
 *
 * Uses SPORT_FINANCIAL_CONFIG.GROWTH_WEIGHTS:
 *   - enrollment_trend (0.25)
 *   - satisfaction (0.20)
 *   - utilization (0.20)
 *   - revenue_trend (0.20)
 *   - new_member_rate (0.15)
 *
 * @param params.revenueHistory — Revenue data for this sport
 * @param params.sessions — Sessions for this sport
 * @param params.classes — Classes for this sport
 * @returns Growth potential 0-100
 */
export function computeGrowthPotential(params: {
  revenueHistory: RevenueHistory[];
  sessions: SportSession[];
  classes: SportClass[];
}): number {
  const { revenueHistory, sessions, classes } = params;

  // ── Enrollment trend (from class fill rates) ──
  let enrollmentScore = 50;
  if (classes.length > 0) {
    const avgFillRate =
      classes.reduce((s, c) => s + c.fillRatePct, 0) / classes.length;
    enrollmentScore = clamp(Math.round(avgFillRate), 0, 100);
  }

  // ── Satisfaction ──
  let satisfactionScore = 50;
  const withSatisfaction = sessions.filter(
    (s) => s.satisfaction != null && s.satisfaction > 0,
  );
  if (withSatisfaction.length > 0) {
    satisfactionScore = Math.round(
      withSatisfaction.reduce((s, ses) => s + ses.satisfaction!, 0) /
      withSatisfaction.length,
    );
  }

  // ── Utilization (session frequency trend) ──
  let utilizationScore = 50;
  if (sessions.length >= 4) {
    const sorted = [...sessions].sort(
      (a, b) => parseDate(a.startTime) - parseDate(b.startTime),
    );
    const mid = Math.floor(sorted.length / 2);
    const firstCount = mid;
    const secondCount = sorted.length - mid;
    if (firstCount > 0) {
      const growth = (secondCount - firstCount) / firstCount;
      utilizationScore = clamp(Math.round(50 + growth * 100), 0, 100);
    }
  }

  // ── Revenue trend ──
  let revenueScore = 50;
  if (revenueHistory.length >= 3) {
    const trend = computeRevenueTrend(revenueHistory);
    if (trend === "improving") revenueScore = 75;
    else if (trend === "declining") revenueScore = 25;
  }

  // ── New member rate (sessions with first-time patterns) ──
  const memberIds = new Set(sessions.map((s) => s.memberId));
  const newMemberScore = clamp(memberIds.size * 3, 0, 100);

  // ── Weighted composite ──
  const score = Math.round(
    enrollmentScore * (GROWTH_W.enrollment_trend ?? 0.25) +
    satisfactionScore * (GROWTH_W.satisfaction ?? 0.20) +
    utilizationScore * (GROWTH_W.utilization ?? 0.20) +
    revenueScore * (GROWTH_W.revenue_trend ?? 0.20) +
    newMemberScore * (GROWTH_W.new_member_rate ?? 0.15),
  );

  return clamp(score, 0, 100);
}

// ═══════════════════════════════════════════════════════════
// §4 — generateOptimizationSuggestions
//
//# ═══════════════════════════════════════════════════════════
// Identifies revenue optimization opportunities for a sport.
// ═══════════════════════════════════════════════════════════

/**
 * Generate optimization suggestions for a sport.
 *
 * Checks for:
 *   1. Underutilized classes (fill rate < 60%)
 *   2. Pricing optimization (low revenue per session)
 *   3. Tournament revenue opportunities
 *   4. Equipment cost reduction
 *   5. Peak-hour pricing opportunities
 *
 * @param params — Sport financial data
 * @returns OptimizationSuggestion[] sorted by improvementPct
 */
export function generateOptimizationSuggestions(params: {
  sport: SportType;
  revenuePerMonth: number;
  classes: SportClass[];
  tournaments: Tournament[];
  equipment: Equipment[];
  sessions: SportSession[];
}): OptimizationSuggestion[] {
  const {
    sport,
    revenuePerMonth,
    classes,
    tournaments,
    equipment,
    sessions,
  } = params;

  const suggestions: OptimizationSuggestion[] = [];

  // ── 1. Underperforming classes ──
  const underperforming = classes.filter((c) => c.isUnderperforming);
  if (underperforming.length > 0) {
    const lostRevenue = underperforming.reduce(
      (sum, c) => sum + c.revenuePerSession * (CLASS_VIABILITY - c.enrolled),
      0,
    );
    const currentRevenue = underperforming.reduce(
      (sum, c) => sum + c.revenuePerSession * c.enrolled,
      0,
    );
    const optimizedRevenue = currentRevenue + Math.max(0, lostRevenue);

    if (optimizedRevenue > currentRevenue) {
      const improvementPct = currentRevenue > 0
        ? Math.round(((optimizedRevenue - currentRevenue) / currentRevenue) * 100)
        : 0;

      if (improvementPct >= MIN_IMPROVEMENT) {
        suggestions.push({
          area: "Clases con baja inscripción",
          currentValue: currentRevenue,
          optimizedValue: optimizedRevenue,
          improvementPct,
          action: `Optimizar ${underperforming.length} clase(s): ajustar horario, reducir capacidad o promocionar`,
          confidence: clamp(70 + underperforming.length * 5, 60, 90),
        });
      }
    }
  }

  // ── 2. Tournament revenue opportunity ──
  if (tournaments.length === 0 && sessions.length >= 20) {
    const potentialRevenue = sessions.length * 15_000; // Estimate entry fee
    suggestions.push({
      area: "Sin torneos activos",
      currentValue: 0,
      optimizedValue: potentialRevenue,
      improvementPct: revenuePerMonth > 0
        ? Math.round((potentialRevenue / revenuePerMonth) * 100)
        : 100,
      action: `Crear torneo de ${SPORT_CONFIG[sport]?.label ?? sport}: ${sessions.length} jugadores activos = demanda potencial`,
      confidence: 65,
    });
  }

  // ── 3. Equipment cost reduction ──
  const needsRepair = equipment.filter(
    (e) => e.condition === "needs_repair" || e.needsAttention,
  );
  if (needsRepair.length > 0) {
    const repairCost = needsRepair.reduce(
      (sum, e) => sum + e.urgencyScore * 1000,
      0,
    );
    const replacementCost = needsRepair.reduce(
      (sum, e) => sum + e.replacementCost,
      0,
    );

    if (repairCost < replacementCost * 0.5) {
      suggestions.push({
        area: "Mantenimiento preventivo",
        currentValue: replacementCost,
        optimizedValue: repairCost,
        improvementPct: Math.round(
          ((replacementCost - repairCost) / replacementCost) * 100,
        ),
        action: `Reparar ${needsRepair.length} equipo(s) ahora evita reemplazo costoso`,
        confidence: 80,
      });
    }
  }

  // ── 4. Peak-hour pricing ──
  const peakSessions = sessions.filter((s) => {
    const hour = new Date(s.startTime).getHours();
    return hour >= 17 && hour <= 20;
  });
  const peakRatio = sessions.length > 0
    ? peakSessions.length / sessions.length
    : 0;

  if (peakRatio > 0.4 && revenuePerMonth > 0) {
    const priceIncrease = Math.round(revenuePerMonth * 0.15);
    suggestions.push({
      area: "Precio en hora pico",
      currentValue: revenuePerMonth,
      optimizedValue: revenuePerMonth + priceIncrease,
      improvementPct: 15,
      action: `${Math.round(peakRatio * 100)}% de sesiones en hora pico (17-20h). Aumentar tarifa 15% en este bloque.`,
      confidence: 70,
    });
  }

  // ── 5. Cross-sell coaching ──
  const uniqueMembers = new Set(sessions.map((s) => s.memberId));
  const coachedMembers = new Set(
    sessions.filter((s) => s.coachId != null).map((s) => s.memberId),
  );
  const uncoachedCount = uniqueMembers.size - coachedMembers.size;

  if (uncoachedCount > 5) {
    const potentialRevenue = uncoachedCount * COACHING_PRICE * 2; // 2 sessions each
    suggestions.push({
      area: "Coaching no aprovechado",
      currentValue: 0,
      optimizedValue: potentialRevenue,
      improvementPct: revenuePerMonth > 0
        ? Math.round((potentialRevenue / revenuePerMonth) * 100)
        : 50,
      action: `${uncoachedCount} miembros activos sin coaching. Ofrecer paquete introductorio.`,
      confidence: 55,
    });
  }

  // Sort by improvement percentage descending
  suggestions.sort((a, b) => b.improvementPct - a.improvementPct);

  // Filter by minimum confidence
  return suggestions.filter((s) => s.confidence >= MIN_CONFIDENCE);
}

// ═══════════════════════════════════════════════════════════
// §5 — analyzeRevenueBySource
//
//# ═══════════════════════════════════════════════════════════
// Breaks down revenue by source for a sport.
// ═══════════════════════════════════════════════════════════

/** Local type for source breakdown */
export interface RevenueSourceBreakdown {
  readonly source: string;
  readonly label: string;
  readonly amount: number;
  readonly percentage: number;
  readonly trend: TrendDirection;
}

/**
 * Analyze revenue breakdown by source for a sport.
 *
 * @param revenueHistory — Revenue data for this sport
 * @returns RevenueSourceBreakdown[] sorted by amount
 */
export function analyzeRevenueBySource(
  revenueHistory: RevenueHistory[],
): RevenueSourceBreakdown[] {
  if (revenueHistory.length === 0) return [];

  // Group by source
  const sourceTotals = new Map<string, number>();
  for (const entry of revenueHistory) {
    sourceTotals.set(
      entry.source,
      (sourceTotals.get(entry.source) ?? 0) + entry.revenue,
    );
  }

  const totalRevenue = Array.from(sourceTotals.values()).reduce(
    (s, v) => s + v,
    0,
  );

  if (totalRevenue === 0) return [];

  // Compute trend per source
  const sourceTrends = new Map<string, TrendDirection>();
  const sources = [...new Set(revenueHistory.map((r) => r.source))];

  for (const source of sources) {
    const sourceEntries = revenueHistory
      .filter((r) => r.source === source)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date));

    if (sourceEntries.length >= 3) {
      const mid = Math.floor(sourceEntries.length / 2);
      const firstHalf = sourceEntries.slice(0, mid);
      const secondHalf = sourceEntries.slice(mid);

      const avgFirst =
        firstHalf.reduce((s, e) => s + e.revenue, 0) / firstHalf.length;
      const avgSecond =
        secondHalf.reduce((s, e) => s + e.revenue, 0) / secondHalf.length;

      if (avgFirst > 0) {
        const deltaPct = ((avgSecond - avgFirst) / avgFirst) * 100;
        if (deltaPct > 5) sourceTrends.set(source, "improving" as TrendDirection);
        else if (deltaPct < -5) sourceTrends.set(source, "declining" as TrendDirection);
        else sourceTrends.set(source, "stable" as TrendDirection);
      } else {
        sourceTrends.set(source, "stable" as TrendDirection);
      }
    } else {
      sourceTrends.set(source, "stable" as TrendDirection);
    }
  }

  // Build breakdown
  const breakdown: RevenueSourceBreakdown[] = [];

  for (const [source, amount] of sourceTotals) {
    breakdown.push({
      source,
      label: SOURCE_LABELS[source] ?? source,
      amount: Math.round(amount),
      percentage: Math.round((amount / totalRevenue) * 100),
      trend: sourceTrends.get(source) ?? ("stable" as TrendDirection),
    });
  }

  // Sort by amount descending
  breakdown.sort((a, b) => b.amount - a.amount);

  return breakdown;
}

// ═══════════════════════════════════════════════════════════
// §6 — INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDate(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const ts = new Date(dateStr).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

/** Compute monthly revenue average from history */
function computeMonthlyRevenue(history: RevenueHistory[]): number {
  if (history.length === 0) return 0;

  const monthlyMap = groupRevenueByMonth(history);
  const values = Array.from(monthlyMap.values());

  if (values.length === 0) return 0;

  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

/** Group revenue entries by month key (YYYY-MM) */
function groupRevenueByMonth(history: RevenueHistory[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of history) {
    const ts = parseDate(entry.date);
    if (ts <= 0) continue;

    const monthKey = new Date(ts).toISOString().slice(0, 7);
    map.set(monthKey, (map.get(monthKey) ?? 0) + entry.revenue);
  }

  return map;
}

/** Compute revenue by venue from sessions */
function computeRevenueByVenue(
  history: RevenueHistory[],
  sessions: SportSession[],
): Record<string, number> {
  const venueRevenue: Record<string, number> = {};

  // Estimate venue revenue from session distribution
  const venueSessions = new Map<string, number>();
  for (const session of sessions) {
    venueSessions.set(
      session.venueId,
      (venueSessions.get(session.venueId) ?? 0) + 1,
    );
  }

  const totalSessions = sessions.length;
  const totalRevenue = history.reduce((s, r) => s + r.revenue, 0);

  if (totalSessions === 0 || totalRevenue === 0) return {};

  for (const [venueId, count] of venueSessions) {
    venueRevenue[venueId] = Math.round(
      (count / totalSessions) * totalRevenue,
    );
  }

  return venueRevenue;
}

/** Compute revenue by class */
function computeRevenueByClass(classes: SportClass[]): Record<string, number> {
  const classRevenue: Record<string, number> = {};

  for (const cls of classes) {
    // Monthly revenue per class = revenuePerSession × sessions per month
    classRevenue[cls.classId] = Math.round(
      cls.revenuePerSession * CLASS_VIABILITY,
    );
  }

  return classRevenue;
}

/** Compute equipment-related costs */
function computeEquipmentCosts(equipment: Equipment[]): number {
  let totalCosts = 0;

  for (const eq of equipment) {
    // Maintenance cost: urgency-based estimation
    if (eq.needsAttention) {
      totalCosts += eq.urgencyScore * 1_000;
    }

    // Depreciation: replacement cost / amortization period (monthly)
    if (eq.replacementCost > 0) {
      Math.max(
                1,
                (Date.now() - parseDate(eq.purchaseDate)) / MS_PER_MONTH,
              );
      const amortMonths = FIN.FORECAST_MONTHS * 3; // 3-year amortization
      const monthlyDepreciation = eq.replacementCost / amortMonths;
      totalCosts += Math.round(monthlyDepreciation);
    }
  }

  return totalCosts;
}

/** Compute revenue trend from history */
function computeRevenueTrend(history: RevenueHistory[]): TrendDirection {
  if (history.length < 3) return "stable" as TrendDirection;

  const monthly = groupRevenueByMonth(history);
  const values = Array.from(monthly.values());

  if (values.length < 2) return "stable" as TrendDirection;

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);

  const avgFirst =
    firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

  if (avgFirst === 0) return "stable" as TrendDirection;

  const deltaPct = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (deltaPct > 5) return "improving" as TrendDirection;
  if (deltaPct < -5) return "declining" as TrendDirection;
  return "stable" as TrendDirection;
}

/** Compute standard deviation */
function computeStdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;

  return Math.sqrt(variance);
}

/** Compute linear slope from indexed values */
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

/** Generate flat forecast when insufficient data */
function generateFlatForecast(
  months: number,
  lastValue: number,
): RevenueForecastPoint[] {
  const forecast: RevenueForecastPoint[] = [];
  const startDate = new Date();

  for (let m = 1; m <= months; m++) {
    const futureDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + m,
      1,
    );

    forecast.push({
      month: futureDate.toISOString().slice(0, 7),
      predictedRevenue: lastValue,
      confidenceLow: Math.round(lastValue * 0.5),
      confidenceHigh: Math.round(lastValue * 1.5),
      confidence: 20,
    });
  }

  return forecast;
}