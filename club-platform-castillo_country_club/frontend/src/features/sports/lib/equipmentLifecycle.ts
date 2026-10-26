/**
 * src/features/sports/lib/equipmentLifecycle.ts
 * ═══════════════════════════════════════════════════════════
 * §S7 — Equipment Lifecycle Engine
 * Level 5+ Production Grade · Phase 33 "The Arena"
 *
 * The Equipment Lifecycle Engine tracks the health, usage
 * patterns, and maintenance needs of every piece of sports
 * equipment. It predicts failures before they happen,
 * computes true cost-per-use, and builds replacement plans
 * that keep the club running without surprise breakdowns.
 *
 * Functions:
 *   buildEquipmentLifecycle()      — Full lifecycle for one equipment
 *   buildEquipmentLifecycleSafe()  — Degraded wrapper, never throws
 *   predictFailureDate()           — Failure prediction from usage
 *   computeReplacementUrgency()    — Urgency scoring
 *   buildReplacementPlan()         — Full replacement recommendation
 *   computeCostPerUse()            — Amortized cost per usage
 *   detectMaintenanceAnomalies()   — Maintenance gap detection
 *
 * All functions are pure. No side effects. No mutations.
 *
 * @version 2.0.0
 * @phase   33 — "The Arena"
 * @engine  §S7
 */

import type {
  EquipmentLifecycle,
  EquipmentMaintenanceEvent,
  UsageLog,
  ReplacementPlan,
  Equipment,
  TrendDirection,
} from "../types";

import {
  SportType,
  EquipmentCondition,
  SPORT_CONFIG,
} from "../types";

import {
  EQUIPMENT_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §0 — CONSTANTS
// ═══════════════════════════════════════════════════════════
const COND_FAIR = EQUIPMENT_CONFIG.CONDITION_FAIR;
const COND_POOR = EQUIPMENT_CONFIG.CONDITION_POOR;

/** Failure prediction minimum hours */
const FAILURE_MIN_HOURS = EQUIPMENT_CONFIG.FAILURE_PREDICTION_MIN_HOURS;

/** Urgency weights */
const URGENCY_W = EQUIPMENT_CONFIG.URGENCY_WEIGHTS;

/** Stale maintenance threshold in days */
const STALE_DAYS = EQUIPMENT_CONFIG.STALE_MAINTENANCE_DAYS;

/** Amortization period in months */
const AMORT_MONTHS = EQUIPMENT_CONFIG.AMORTIZATION_MONTHS;
/** EquipmentCondition to numeric condition score mapping */
const CONDITION_TO_SCORE: Record<EquipmentCondition, number> = {
  [EquipmentCondition.NEW]: 95,
  [EquipmentCondition.GOOD]: 75,
  [EquipmentCondition.FAIR]: 50,
  [EquipmentCondition.NEEDS_REPAIR]: 25,
  [EquipmentCondition.RETIRED]: 5,
};

/** Average useful life in hours by condition trajectory */
const ESTIMATED_USEFUL_LIFE_HOURS = 5000;

/** Hours per day of typical equipment use */
const TYPICAL_USAGE_HOURS_PER_DAY = 4;

/** Days in one day in ms */
const MS_PER_DAY = 86_400_000;
/** Days in one year */
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

/** Maximum anomalies to return */
const MAX_ANOMALIES = 20;

// ═══════════════════════════════════════════════════════════
// §1 — buildEquipmentLifecycle
//
// Constructs complete lifecycle data for a single piece
// of equipment from its entity, usage logs, and maintenance
// history.
// ═══════════════════════════════════════════════════════════

/**
 * Build complete EquipmentLifecycle for one equipment.
 *
 * Algorithm:
 *   1. Convert EquipmentCondition to conditionScore (0-100)
 *   2. Compute usage trend from usage logs
 *   3. Predict failure date from usage pattern
 *   4. Compute replacement urgency
 *   5. Compute cost per use (amortized)
 *   6. Estimate remaining useful hours
 *
 * @param equipment — Equipment entity
 * @param usageLogs — Historical usage logs
 * @param maintenanceHistory — Maintenance events
 * @returns EquipmentLifecycle
 */
export function buildEquipmentLifecycle(
  equipment: Equipment,
  usageLogs: UsageLog[],
  maintenanceHistory: EquipmentMaintenanceEvent[],
): EquipmentLifecycle {
  const conditionScore = CONDITION_TO_SCORE[equipment.condition] ?? 50;

  const usageTrend = computeUsageTrend(usageLogs);

  const predictedFailureDate = predictFailureDate(
    equipment.usageHours,
    conditionScore,
    usageLogs,
    equipment.purchaseDate,
  );

  const replacementUrgency = computeReplacementUrgency(
    conditionScore,
    equipment.usageHours,
    equipment.purchaseDate,
    equipment.daysSinceMaintenance,
  );

  const costPerUse = computeCostPerUse(
    equipment.replacementCost,
    usageLogs,
    equipment.purchaseDate,
  );

  const remainingUsefulHours = estimateRemainingHours(
    equipment.usageHours,
    conditionScore,
  );

  return {
    equipmentId: equipment.equipmentId,
    name: equipment.name,
    sport: equipment.sport,
    venueId: equipment.venueId,
    conditionScore,
    usageHours: equipment.usageHours,
    usageTrend,
    predictedFailureDate,
    replacementUrgency,
    costPerUse,
    remainingUsefulHours,
    maintenanceHistory,
  };
}

/**
 * Safe wrapper around buildEquipmentLifecycle.
 * Guarantees a valid return even with empty/invalid data.
 */
export function buildEquipmentLifecycleSafe(
  equipment: Equipment,
  usageLogs: UsageLog[],
  maintenanceHistory: EquipmentMaintenanceEvent[],
): EquipmentLifecycle {
  try {
    return buildEquipmentLifecycle(
      equipment,
      usageLogs ?? [],
      maintenanceHistory ?? [],
    );
  } catch {
    return createMinimalLifecycle(equipment, maintenanceHistory ?? []);
  }
}

function createMinimalLifecycle(
  equipment: Equipment,
  maintenanceHistory: EquipmentMaintenanceEvent[],
): EquipmentLifecycle {
  return {
    equipmentId: equipment.equipmentId,
    name: equipment.name,
    sport: equipment.sport,
    venueId: equipment.venueId,
    conditionScore: CONDITION_TO_SCORE[equipment.condition] ?? 50,
    usageHours: equipment.usageHours,
    usageTrend: "stable" as TrendDirection,
    predictedFailureDate: null,
    replacementUrgency: "none",
    costPerUse: 0,
    remainingUsefulHours: 0,
    maintenanceHistory,
  };
}

// ═══════════════════════════════════════════════════════════
// §2 — predictFailureDate
//
// Predicts when equipment is likely to fail based on usage
// patterns, condition score, and age.
// ═══════════════════════════════════════════════════════════

/**
 * Predict equipment failure date.
 *
 * Algorithm:
 *   1. If usageHours < FAILURE_MIN_HOURS, insufficient data → null
 *   2. Estimate daily usage rate from recent logs
 *   3. Estimate remaining hours from condition score
 *   4. Project failure date = today + (remainingHours / dailyRate)
 *   5. Cap at 3 years out (too uncertain beyond that)
 *
 * @param usageHours — Total accumulated usage hours
 * @param conditionScore — Current condition 0-100
 * @param usageLogs — Usage history for rate computation
 * @param purchaseDate — Equipment purchase date
 * @returns Predicted failure date string or null
 */
export function predictFailureDate(
  usageHours: number,
  conditionScore: number,
  usageLogs: UsageLog[],
  purchaseDate: string,
): string | null {
  if (usageHours < FAILURE_MIN_HOURS) return null;

  const dailyRate = computeDailyUsageRate(usageLogs, purchaseDate);
  if (dailyRate <= 0) return null;

  const remainingHours = estimateRemainingHours(usageHours, conditionScore);
  if (remainingHours <= 0) return null;

  const daysToFailure = remainingHours / dailyRate;

  // Cap at 3 years — too uncertain beyond
  if (daysToFailure > 3 * 365) return null;

  const failureDate = new Date();
  failureDate.setDate(failureDate.getDate() + Math.round(daysToFailure));

  return failureDate.toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════
// §3 — computeReplacementUrgency
//
//# ═══════════════════════════════════════════════════════════
// Scores replacement urgency from condition, usage, age,
// and maintenance gap using config weights.
// ═══════════════════════════════════════════════════════════

/**
 * Compute replacement urgency for equipment.
 *
 * Uses EQUIPMENT_CONFIG.URGENCY_WEIGHTS:
 *   - condition (0.35): lower condition = higher urgency
 *   - usage_intensity (0.25): higher hours/age = higher urgency
 *   - age (0.20): older equipment = higher urgency
 *   - maintenance_gap (0.20): no recent maintenance = higher urgency
 *
 * @param conditionScore — Current condition 0-100
 * @param usageHours — Total usage hours
 * @param purchaseDate — Equipment purchase date
 * @param daysSinceMaintenance — Days since last maintenance
 * @returns "immediate" | "soon" | "planned" | "none"
 */
export function computeReplacementUrgency(
  conditionScore: number,
  usageHours: number,
  purchaseDate: string,
  daysSinceMaintenance: number | null,
): "immediate" | "soon" | "planned" | "none" {
  // Condition factor: lower score = higher urgency (inverted)
  const conditionFactor = clamp(1 - conditionScore / 100, 0, 1);

  // Usage intensity: hours relative to expected useful life
  const usageFactor = clamp(usageHours / ESTIMATED_USEFUL_LIFE_HOURS, 0, 1);

  // Age factor: equipment age in years
  const ageMs = Date.now() - parseDate(purchaseDate);
  const ageYears = ageMs > 0 ? ageMs / MS_PER_YEAR : 0;
  const ageFactor = clamp(ageYears / (AMORT_MONTHS / 12), 0, 1);

  // Maintenance gap factor
  const maintenanceGapDays = daysSinceMaintenance ?? STALE_DAYS;
  const maintenanceFactor = clamp(maintenanceGapDays / STALE_DAYS, 0, 1);

  // Weighted composite score 0-100
  const urgencyScore = Math.round(
    (conditionFactor * (URGENCY_W.condition ?? 0.35) +
    usageFactor * (URGENCY_W.usage_intensity ?? 0.25) +
    ageFactor * (URGENCY_W.age ?? 0.20) +
    maintenanceFactor * (URGENCY_W.maintenance_gap ?? 0.20)) * 100,
  );

  if (urgencyScore >= 75) return "immediate";
  if (urgencyScore >= 50) return "soon";
  if (urgencyScore >= 25) return "planned";
  return "none";
}

// ═══════════════════════════════════════════════════════════
// §4 — buildReplacementPlan
//
//# ═══════════════════════════════════════════════════════════
// Builds a complete replacement recommendation for equipment.
// ═══════════════════════════════════════════════════════════

/**
 * Build a replacement plan for equipment.
 *
 * Algorithm:
 *   1. Compute current condition score
 *   2. Estimate replacement date from remaining hours + usage rate
 *   3. Estimate cost from entity's replacementCost
 *   4. Compute priority from urgency score
 *   5. Generate alternative options
 *
 * @param equipment — Equipment entity
 * @param usageLogs — Usage history
 * @returns ReplacementPlan
 */
export function buildReplacementPlan(
  equipment: Equipment,
  usageLogs: UsageLog[],
): ReplacementPlan {
  const conditionScore = CONDITION_TO_SCORE[equipment.condition] ?? 50;

  // Replacement date
  const failureDate = predictFailureDate(
    equipment.usageHours,
    conditionScore,
    usageLogs,
    equipment.purchaseDate,
  );

  const recommendedReplaceDate = failureDate ?? computeAgeBasedReplaceDate(
    equipment.purchaseDate,
    conditionScore,
  );

  // Estimated cost
  const estimatedCost = equipment.replacementCost > 0
    ? equipment.replacementCost
    : estimateReplacementCost(equipment.sport);

  // Priority: inverse of condition (lower condition = higher priority)
  const priority = clamp(Math.round(100 - conditionScore), 0, 100);

  // Alternatives
  const alternativeOptions = generateAlternativeOptions(
    equipment.sport,
    equipment.name,
    estimatedCost,
  );

  return {
    equipmentId: equipment.equipmentId,
    equipmentName: equipment.name,
    currentCondition: conditionScore,
    recommendedReplaceDate,
    estimatedCost,
    priority,
    alternativeOptions,
  };
}

// ═══════════════════════════════════════════════════════════
// §5 — computeCostPerUse
//
//# ═══════════════════════════════════════════════════════════
// Computes the true amortized cost per use of equipment.
// ═══════════════════════════════════════════════════════════

/**
 * Compute amortized cost per use of equipment.
 *
 * Algorithm:
 *   1. Count total usage sessions from logs
 *   2. If no logs, estimate from usage hours / average session (60 min)
 *   3. Add total maintenance costs
 *   4. Cost per use = (replacementCost + maintenanceCosts) / totalUses
 *
 * @param replacementCost — Equipment purchase/replacement cost (₡)
 * @param usageLogs — Usage history
 * @param purchaseDate — For estimating sessions when no logs
 * @returns Cost per use in ₡
 */
export function computeCostPerUse(
  replacementCost: number,
  usageLogs: UsageLog[],
  purchaseDate: string,
): number {
  const totalUses = usageLogs.length > 0
    ? usageLogs.length
    : estimateSessionsFromHours(replacementCost, purchaseDate);

  if (totalUses <= 0) return 0;

  return Math.round(replacementCost / totalUses);
}

// ═══════════════════════════════════════════════════════════
// §6 — detectMaintenanceAnomalies
//
//# ═══════════════════════════════════════════════════════════
// Detects equipment with maintenance gaps or anomalies.
// ═══════════════════════════════════════════════════════════

/** Local type for detected anomalies */
export interface MaintenanceAnomaly {
  readonly equipmentId: string;
  readonly equipmentName: string;
  readonly sport: SportType;
  readonly anomalyType: "stale_maintenance" | "excessive_usage" | "condition_drop" | "cost_spike";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly description: string;
  readonly daysSinceMaintenance: number | null;
}

/**
 * Detect maintenance anomalies across all equipment.
 *
 * Checks for:
 *   - Stale maintenance: no maintenance in STALE_MAINTENANCE_DAYS
 *   - Excessive usage without maintenance
 *   - Condition drops below FAIR threshold
 *   - Cost spikes in maintenance history
 *
 * @param equipmentList — All equipment entities
 * @param maintenanceHistory — All maintenance events
 * @returns MaintenanceAnomaly[] sorted by severity
 */
export function detectMaintenanceAnomalies(
  equipmentList: Equipment[],
  maintenanceHistory: EquipmentMaintenanceEvent[],
): MaintenanceAnomaly[] {
  const anomalies: MaintenanceAnomaly[] = [];

  for (const equipment of equipmentList) {
    // ── Stale maintenance ──
    if (
      equipment.daysSinceMaintenance != null &&
      equipment.daysSinceMaintenance > STALE_DAYS
    ) {
      anomalies.push({
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.name,
        sport: equipment.sport,
        anomalyType: "stale_maintenance",
        severity: equipment.daysSinceMaintenance > STALE_DAYS * 2
          ? "critical"
          : equipment.daysSinceMaintenance > STALE_DAYS * 1.5
            ? "high"
            : "medium",
        description: `Sin mantenimiento por ${equipment.daysSinceMaintenance} días (umbral: ${STALE_DAYS})`,
        daysSinceMaintenance: equipment.daysSinceMaintenance,
      });
    }

    // ── Condition below FAIR ──
    const conditionScore = CONDITION_TO_SCORE[equipment.condition] ?? 50;
    if (conditionScore < COND_FAIR) {
      anomalies.push({
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.name,
        sport: equipment.sport,
        anomalyType: "condition_drop",
        severity: conditionScore < COND_POOR ? "critical" : "high",
        description: `Condición ${equipment.condition} (score: ${conditionScore}/100)`,
        daysSinceMaintenance: equipment.daysSinceMaintenance,
      });
    }

    // ── Excessive usage without maintenance ──
    if (
      equipment.usageHours > FAILURE_MIN_HOURS &&
      equipment.needsAttention
    ) {
      anomalies.push({
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.name,
        sport: equipment.sport,
        anomalyType: "excessive_usage",
        severity: "high",
        description: `${equipment.usageHours}h de uso acumulado con atención requerida: ${equipment.recommendedAction}`,
        daysSinceMaintenance: equipment.daysSinceMaintenance,
      });
    }

    // ── Cost spike in maintenance ──
    const equipmentEvents = maintenanceHistory.filter(
      (e) => e.equipmentId === equipment.equipmentId,
    );
    if (equipmentEvents.length >= 2) {
      const costs = equipmentEvents.map((e) => e.cost).sort((a, b) => a - b);
      const latestCost = costs[costs.length - 1];
      const avgCost = costs.reduce((s, c) => s + c, 0) / costs.length;

      if (latestCost > avgCost * 2 && latestCost > 50000) {
        anomalies.push({
          equipmentId: equipment.equipmentId,
          equipmentName: equipment.name,
          sport: equipment.sport,
          anomalyType: "cost_spike",
          severity: latestCost > avgCost * 3 ? "high" : "medium",
          description: `Último mantenimiento: ₡${latestCost.toLocaleString()} (promedio: ₡${Math.round(avgCost).toLocaleString()})`,
          daysSinceMaintenance: equipment.daysSinceMaintenance,
        });
      }
    }
  }

  // Sort by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  anomalies.sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4),
  );

  return anomalies.slice(0, MAX_ANOMALIES);
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

/** Compute usage trend from logs */
function computeUsageTrend(logs: UsageLog[]): TrendDirection {
  if (logs.length < 2) return "stable" as TrendDirection;

  const sorted = [...logs].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date),
  );

  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst =
    firstHalf.reduce((s, l) => s + l.durationMinutes, 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((s, l) => s + l.durationMinutes, 0) / secondHalf.length;

  if (avgFirst === 0) return "stable" as TrendDirection;

  const deltaPct = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (deltaPct > 10) return "improving" as TrendDirection;
  if (deltaPct < -10) return "declining" as TrendDirection;
  return "stable" as TrendDirection;
}

/** Compute average daily usage rate from logs */
function computeDailyUsageRate(
  logs: UsageLog[],
  purchaseDate: string,
): number {
  if (logs.length >= 2) {
    const sorted = [...logs].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date),
    );
    const firstDate = parseDate(sorted[0].date);
    const lastDate = parseDate(sorted[sorted.length - 1].date);
    const spanDays = (lastDate - firstDate) / MS_PER_DAY;

    if (spanDays > 0) {
      const totalHours = sorted.reduce((s, l) => s + l.durationMinutes, 0) / 60;
      return totalHours / spanDays;
    }
  }

  // Fallback: estimate from purchase date and typical usage
  const purchaseTs = parseDate(purchaseDate);
  if (purchaseTs > 0) {
    Math.max(1, (Date.now() - purchaseTs) / MS_PER_DAY);
    // Estimate ~4 hours/day of typical use
    return TYPICAL_USAGE_HOURS_PER_DAY;
  }

  return TYPICAL_USAGE_HOURS_PER_DAY;
}

/** Estimate remaining useful hours from current usage and condition */
function estimateRemainingHours(
  usageHours: number,
  conditionScore: number,
): number {
  // Higher condition = more remaining life
  // Lower condition = less remaining life
  const conditionFactor = conditionScore / 100;
  const estimatedTotalLife = ESTIMATED_USEFUL_LIFE_HOURS;
  const remaining = (estimatedTotalLife * conditionFactor) - usageHours;

  return Math.max(0, Math.round(remaining));
}

/** Estimate sessions from hours when no logs exist */
function estimateSessionsFromHours(
  _replacementCost: number,
  purchaseDate: string,
): number {
  const purchaseTs = parseDate(purchaseDate);
  if (purchaseTs <= 0) return 1;

  const ageDays = Math.max(1, (Date.now() - purchaseTs) / MS_PER_DAY);
  // Estimate ~3 sessions per week
  const estimatedSessions = Math.round((ageDays / 7) * 3);
  return Math.max(1, estimatedSessions);
}

/** Compute age-based replacement date */
function computeAgeBasedReplaceDate(
  purchaseDate: string,
  conditionScore: number,
): string {
  const purchaseTs = parseDate(purchaseDate);
  if (purchaseTs <= 0) {
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split("T")[0];
  }

  // Lower condition → sooner replacement
  const monthsToAdd = Math.round((conditionScore / 100) * AMORT_MONTHS);
  const replaceDate = new Date(purchaseTs);
  replaceDate.setMonth(replaceDate.getMonth() + Math.max(1, monthsToAdd));

  // If already past, schedule 3 months from now
  if (replaceDate.getTime() < Date.now()) {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 3);
    return soon.toISOString().split("T")[0];
  }

  return replaceDate.toISOString().split("T")[0];
}

/** Estimate replacement cost by sport category */
function estimateReplacementCost(sport: SportType): number {
  // Rough CRC estimates by sport type
  const costEstimates: Partial<Record<SportType, number>> = {
    [SportType.GOLF]: 2_500_000,
    [SportType.TENNIS]: 800_000,
    [SportType.PADEL]: 800_000,
    [SportType.SQUASH]: 700_000,
    [SportType.SWIMMING]: 1_500_000,
    [SportType.FITNESS]: 2_000_000,
    [SportType.BASKETBALL]: 500_000,
    [SportType.VOLLEYBALL]: 500_000,
    [SportType.FOOTBALL]: 600_000,
    [SportType.YOGA]: 300_000,
    [SportType.PILATES]: 400_000,
  };

  return costEstimates[sport] ?? 500_000;
}

/** Generate alternative replacement options */
function generateAlternativeOptions(
  sport: SportType,
  _currentName: string,
  currentCost: number,
): string[] {
  const sportLabel = SPORT_CONFIG[sport]?.label ?? sport;
  const options: string[] = [];

  // Budget option (40-60% of cost)
  const budgetCost = Math.round(currentCost * 0.5);
  options.push(
    `Opción económica: equipamiento ${sportLabel} básico (~₡${(budgetCost / 1_000_000).toFixed(1)}M)`,
  );

  // Similar option (80-120% of cost)
  options.push(
    `Reemplazo directo: mismo modelo o equivalente (~₡${(currentCost / 1_000_000).toFixed(1)}M)`,
  );

  // Premium option (130-180% of cost)
  const premiumCost = Math.round(currentCost * 1.5);
  options.push(
    `Upgrade premium: equipamiento de mayor durabilidad (~₡${(premiumCost / 1_000_000).toFixed(1)}M)`,
  );

  // Refurbished option
  const refurbCost = Math.round(currentCost * 0.65);
  options.push(
    `Reacondicionado certificado (~₡${(refurbCost / 1_000_000).toFixed(1)}M)`,
  );

  return options;
}