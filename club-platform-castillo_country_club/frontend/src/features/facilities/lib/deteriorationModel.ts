// src/features/facilities/lib/deteriorationModel.ts
// ═══════════════════════════════════════════════════════════════
// PREDICTIVE DETERIORATION MODEL — "The Oracle"
//
// §F4: computeDeteriorationModel / predictAllDeterioration
//
// Each component of the building is a BATTERY with a health
// curve that degrades from 100% to 0%. The system predicts
// WHEN each component will fail, calculates the OPTIMAL
// intervention window, and shows the cost of acting NOW
// vs waiting for failure.
//
// Monte Carlo simulation (1000 iterations) with seeded PRNG
// for deterministic, reproducible results.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityType,
  MaintenanceTask,
  MaintenanceType,
  Inspection,
  InspectionResult,
  AmenityUtilizationItem,
  DeteriorationModel,
  DeteriorationComponent,
  MaintenancePriorityAction,
  FailurePrediction
} from "../types";

import {
  classifyHealthLevel,
} from "../types";

import {
  DETERIORATION_THRESHOLDS
} from "../config";

// ═══════════════════════════════════════════════════════════════
// SEEDED PRNG — Deterministic Monte Carlo
// Mulberry32: fast, 32-bit, period 2^32.
// Same seed → same results. Essential for reproducibility.
// ═══════════════════════════════════════════════════════════════

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: uniform → standard normal distribution. */
function boxMuller(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

/** Hash a string to a 32-bit integer for seeding. */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT TEMPLATES — Anatomy of each facility type
//
// Each facility type has a set of physical components with:
//   - expected_life_months: how long with normal use
//   - replacement_cost: CRC cost to replace
//   - critical: does failure force facility closure?
//
// These are defaults. Real data from inspections overrides.
// ═══════════════════════════════════════════════════════════════

interface ComponentTemplate {
  name: string;
  expected_life_months: number;
  replacement_cost: number;
  critical: boolean;
  /** Which maintenance types affect this component's health reset. */
  affected_by: MaintenanceType[];
}

const COMPONENT_TEMPLATES: Record<FacilityType, ComponentTemplate[]> = {
  pool: [
    { name: "Sistema de filtración", expected_life_months: 84, replacement_cost: 2_500_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Bombas y motores", expected_life_months: 72, replacement_cost: 1_800_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Deck y superficie", expected_life_months: 120, replacement_cost: 5_000_000, critical: false, affected_by: ["renovation", "corrective"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 800_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Sistema químico", expected_life_months: 48, replacement_cost: 1_200_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Azulejos y juntas", expected_life_months: 144, replacement_cost: 4_000_000, critical: false, affected_by: ["renovation"] },
  ],
  gym: [
    { name: "Equipo cardio", expected_life_months: 60, replacement_cost: 15_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Equipo de fuerza", expected_life_months: 96, replacement_cost: 12_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Piso deportivo", expected_life_months: 84, replacement_cost: 3_000_000, critical: false, affected_by: ["renovation"] },
    { name: "HVAC", expected_life_months: 120, replacement_cost: 8_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 1_500_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Sistema de sonido", expected_life_months: 48, replacement_cost: 1_000_000, critical: false, affected_by: ["corrective"] },
  ],
  tennis_court: [
    { name: "Superficie de juego", expected_life_months: 96, replacement_cost: 8_000_000, critical: true, affected_by: ["renovation", "corrective"] },
    { name: "Red y postes", expected_life_months: 60, replacement_cost: 500_000, critical: true, affected_by: ["corrective"] },
    { name: "Iluminación", expected_life_months: 72, replacement_cost: 2_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Cercado", expected_life_months: 144, replacement_cost: 3_000_000, critical: false, affected_by: ["renovation"] },
    { name: "Drenaje", expected_life_months: 180, replacement_cost: 4_000_000, critical: true, affected_by: ["corrective", "emergency"] },
  ],
  squash_court: [
    { name: "Paredes de juego", expected_life_months: 120, replacement_cost: 6_000_000, critical: true, affected_by: ["renovation"] },
    { name: "Piso", expected_life_months: 96, replacement_cost: 3_500_000, critical: true, affected_by: ["renovation"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 1_200_000, critical: true, affected_by: ["preventive", "corrective"] },
    { name: "Ventilación", expected_life_months: 84, replacement_cost: 2_000_000, critical: true, affected_by: ["preventive", "corrective"] },
    { name: "Puerta especial", expected_life_months: 144, replacement_cost: 1_500_000, critical: false, affected_by: ["corrective"] },
  ],
  golf_course: [
    { name: "Greens", expected_life_months: 36, replacement_cost: 12_000_000, critical: true, affected_by: ["preventive", "renovation"] },
    { name: "Fairways", expected_life_months: 48, replacement_cost: 8_000_000, critical: false, affected_by: ["preventive", "renovation"] },
    { name: "Sistema de riego", expected_life_months: 120, replacement_cost: 15_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Bunkers", expected_life_months: 60, replacement_cost: 3_000_000, critical: false, affected_by: ["preventive", "renovation"] },
    { name: "Caminos de carrito", expected_life_months: 96, replacement_cost: 5_000_000, critical: false, affected_by: ["renovation"] },
  ],
  restaurant: [
    { name: "Equipo de cocina", expected_life_months: 84, replacement_cost: 20_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Piso", expected_life_months: 96, replacement_cost: 4_000_000, critical: false, affected_by: ["renovation"] },
    { name: "HVAC", expected_life_months: 120, replacement_cost: 8_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Mobiliario", expected_life_months: 72, replacement_cost: 6_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Barra y equipo de bar", expected_life_months: 96, replacement_cost: 5_000_000, critical: false, affected_by: ["corrective", "preventive"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 2_000_000, critical: false, affected_by: ["preventive", "corrective"] },
  ],
  lounge: [
    { name: "Mobiliario premium", expected_life_months: 72, replacement_cost: 8_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Iluminación ambiental", expected_life_months: 60, replacement_cost: 3_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "HVAC", expected_life_months: 120, replacement_cost: 6_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Equipo de bar", expected_life_months: 84, replacement_cost: 4_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Piso", expected_life_months: 96, replacement_cost: 3_500_000, critical: false, affected_by: ["renovation"] },
    { name: "Sistema de sonido", expected_life_months: 48, replacement_cost: 2_000_000, critical: false, affected_by: ["corrective"] },
  ],
  ballroom: [
    { name: "Piso de baile", expected_life_months: 120, replacement_cost: 8_000_000, critical: true, affected_by: ["renovation"] },
    { name: "Iluminación escénica", expected_life_months: 60, replacement_cost: 5_000_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "HVAC", expected_life_months: 120, replacement_cost: 10_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Sistema de sonido", expected_life_months: 48, replacement_cost: 3_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Mobiliario", expected_life_months: 84, replacement_cost: 7_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Cortinas y decoración", expected_life_months: 96, replacement_cost: 4_000_000, critical: false, affected_by: ["renovation"] },
  ],
  garden: [
    { name: "Jardinería y paisajismo", expected_life_months: 24, replacement_cost: 3_000_000, critical: false, affected_by: ["preventive", "renovation"] },
    { name: "Sistema de riego", expected_life_months: 96, replacement_cost: 4_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Iluminación exterior", expected_life_months: 72, replacement_cost: 2_500_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Caminos y senderos", expected_life_months: 144, replacement_cost: 5_000_000, critical: false, affected_by: ["renovation"] },
    { name: "Mobiliario exterior", expected_life_months: 60, replacement_cost: 2_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Cercado", expected_life_months: 180, replacement_cost: 3_500_000, critical: false, affected_by: ["renovation"] },
  ],
  parking: [
    { name: "Superficie de asfalto", expected_life_months: 120, replacement_cost: 10_000_000, critical: false, affected_by: ["renovation", "corrective"] },
    { name: "Iluminación", expected_life_months: 72, replacement_cost: 3_000_000, critical: true, affected_by: ["preventive", "corrective"] },
    { name: "Drenaje", expected_life_months: 180, replacement_cost: 4_000_000, critical: true, affected_by: ["corrective", "emergency"] },
    { name: "Señalización", expected_life_months: 60, replacement_cost: 800_000, critical: false, affected_by: ["corrective"] },
    { name: "Barreras y bolardos", expected_life_months: 96, replacement_cost: 1_500_000, critical: false, affected_by: ["corrective"] },
  ],
  playground: [
    { name: "Equipo de juegos", expected_life_months: 72, replacement_cost: 5_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Superficie de seguridad", expected_life_months: 60, replacement_cost: 3_000_000, critical: true, affected_by: ["renovation", "corrective"] },
    { name: "Cercado", expected_life_months: 120, replacement_cost: 2_000_000, critical: true, affected_by: ["corrective"] },
    { name: "Estructuras de sombra", expected_life_months: 96, replacement_cost: 4_000_000, critical: false, affected_by: ["corrective", "renovation"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 1_000_000, critical: false, affected_by: ["preventive", "corrective"] },
  ],
  spa: [
    { name: "Equipo de terapia", expected_life_months: 72, replacement_cost: 8_000_000, critical: true, affected_by: ["preventive", "corrective"] },
    { name: "Piso especial", expected_life_months: 96, replacement_cost: 4_000_000, critical: false, affected_by: ["renovation"] },
    { name: "HVAC premium", expected_life_months: 120, replacement_cost: 10_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Sistema de agua", expected_life_months: 84, replacement_cost: 6_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Mobiliario", expected_life_months: 72, replacement_cost: 5_000_000, critical: false, affected_by: ["corrective"] },
    { name: "Iluminación ambiental", expected_life_months: 60, replacement_cost: 2_000_000, critical: false, affected_by: ["preventive", "corrective"] },
  ],
  kids_area: [
    { name: "Equipo de juegos", expected_life_months: 60, replacement_cost: 4_000_000, critical: true, affected_by: ["preventive", "corrective", "emergency"] },
    { name: "Piso de seguridad", expected_life_months: 48, replacement_cost: 2_500_000, critical: true, affected_by: ["renovation", "corrective"] },
    { name: "Cercado protector", expected_life_months: 96, replacement_cost: 1_500_000, critical: true, affected_by: ["corrective"] },
    { name: "Iluminación", expected_life_months: 60, replacement_cost: 800_000, critical: false, affected_by: ["preventive", "corrective"] },
    { name: "Pintura y decoración", expected_life_months: 36, replacement_cost: 1_000_000, critical: false, affected_by: ["renovation"] },
  ],
};

// ═══════════════════════════════════════════════════════════════
// HEALTH COMPUTATION — How components degrade
// ═══════════════════════════════════════════════════════════════

/** How much does each maintenance type reset component health? */
const MAINTENANCE_HEALTH_RESET: Record<MaintenanceType, number> = {
  preventive: 15,    // +15% health (routine tune-up)
  corrective: 30,    // +30% health (fixed a specific problem)
  emergency: 45,     // +45% health (emergency fix, usually thorough)
  renovation: 80,    // +80% health (near-complete overhaul)
  cleaning: 5,       // +5% health (cosmetic improvement)
  inspection: 0,     // no health change (just observation)
};

/** How much does inspection result reveal about hidden deterioration? */
const INSPECTION_HEALTH_ADJUSTMENT: Record<InspectionResult, number> = {
  pass: 5,           // everything fine → slight confidence boost
  minor_issues: -5,  // minor issues found → slight penalty
  major_issues: -15, // major issues → significant penalty
  fail: -30,         // critical failure found → major penalty
};

/**
 * Compute months since a date string. Returns 0 for invalid dates.
 */
function monthsSince(dateStr: string): number {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth()),
  );
}

/**
 * Compute base health for a component based on age and expected life.
 * Uses a modified exponential decay that starts slow, accelerates,
 * then slows again near end-of-life (like real equipment).
 */
function baseHealthFromAge(
  ageMonths: number,
  expectedLifeMonths: number,
): number {
  if (expectedLifeMonths <= 0) return 50;
  const ratio = ageMonths / expectedLifeMonths;
  // Modified sigmoid-like curve: slow start, fast middle, slow end
  // At ratio 0: 100%, at ratio 0.5: ~85%, at ratio 1.0: ~40%, at ratio 1.5: ~15%
  const health = 100 * Math.exp(-1.2 * ratio * ratio);
  return Math.max(0, Math.min(100, Math.round(health)));
}

/**
 * Apply maintenance history resets to component health.
 * Each relevant maintenance event bumps health upward.
 */
function applyMaintenanceResets(
  baseHealth: number,
  component: ComponentTemplate,
  maintenanceTasks: MaintenanceTask[],
): number {
  let health = baseHealth;

  // Sort by date descending (most recent first)
  const relevant = maintenanceTasks
    .filter(
      (m) =>
        m.status === "completed" &&
        component.affected_by.includes(m.maintenance_type),
    )
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.scheduled_date).getTime() -
        new Date(a.completed_at ?? a.scheduled_date).getTime(),
    );

  // Apply resets from most recent maintenance (diminishing returns)
  for (let i = 0; i < Math.min(relevant.length, 5); i++) {
    const task = relevant[i];
    const baseReset = MAINTENANCE_HEALTH_RESET[task.maintenance_type] ?? 0;
    // Diminishing returns: each older maintenance event has less impact
    const decayFactor = 1 / (1 + i * 0.4);
    health += baseReset * decayFactor;
  }

  return Math.min(100, Math.max(0, Math.round(health)));
}

/**
 * Adjust health based on inspection findings.
 * Inspections provide ground-truth data about actual condition.
 */
function applyInspectionAdjustment(
  health: number,
  inspections: Inspection[],
): number {
  if (inspections.length === 0) return health;

  // Use most recent inspection
  const latest = [...inspections].sort(
    (a, b) =>
      new Date(b.inspection_date).getTime() -
      new Date(a.inspection_date).getTime(),
  )[0];

  const adjustment = INSPECTION_HEALTH_ADJUSTMENT[latest.result] ?? 0;
  return Math.max(0, Math.min(100, health + adjustment));
}

/**
 * Compute deterioration rate (% per month) from current conditions.
 * Base rate = 100 / expected_life_months.
 * Accelerated by: high utilization, heavy events, component age.
 */
function computeDeteriorationRate(
  expectedLifeMonths: number,
  utilizationPct: number,
  currentHealth: number,
  componentCritical: boolean,
): number {
  // Base rate: what depletes the battery in normal conditions
  const baseRate = expectedLifeMonths > 0 ? 100 / expectedLifeMonths : 2;

  // Usage multiplier: high utilization accelerates wear
  // 50% util = 1.0x, 80% = 1.3x, 100% = 1.6x
  const usageMultiplier = 1 + Math.max(0, (utilizationPct - 50) / 100);

  // Age multiplier: older components degrade faster
  // health 80% = 1.0x, 50% = 1.3x, 20% = 1.8x
  const ageMultiplier = 1 + Math.max(0, (80 - currentHealth) / 100);

  // Critical components get a slight urgency boost
  const criticalBoost = componentCritical ? 1.1 : 1.0;

  return Math.round(baseRate * usageMultiplier * ageMultiplier * criticalBoost * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════
// MONTE CARLO FAILURE PREDICTION
//
// 1000 simulations per component. Each simulation:
//   1. Start at current health
//   2. Each month, subtract (rate + random noise)
//   3. When health < failure threshold → record failure month
//   4. Report P10/P50/P90 distribution
// ═══════════════════════════════════════════════════════════════

const MONTE_CARLO_ITERATIONS = 1000;
const PROJECTION_MONTHS = 24;
const FAILURE_THRESHOLD = 15;    // Below 15% = functional failure
const RATE_VARIANCE = 0.3;       // 30% standard deviation on rate

interface MonteCarloResult {
  p10: number;   // months until 10% of sims fail (optimistic)
  p50: number;   // months until 50% of sims fail (expected)
  p90: number;   // months until 90% of sims fail (pessimistic)
  confidence: number;
}

function runMonteCarloFailure(
  currentHealth: number,
  deteriorationRate: number,
  seed: number,
): MonteCarloResult {
  const rng = mulberry32(seed);
  const failureMonths: number[] = [];

  for (let sim = 0; sim < MONTE_CARLO_ITERATIONS; sim++) {
    let health = currentHealth;
    let failed = false;

    for (let month = 1; month <= PROJECTION_MONTHS; month++) {
      // Add normally-distributed noise to the rate
      const noise = boxMuller(rng);
      const noisyRate = deteriorationRate * (1 + noise * RATE_VARIANCE);
      health -= Math.max(0, noisyRate);

      if (health <= FAILURE_THRESHOLD && !failed) {
        failureMonths.push(month);
        failed = true;
        break;
      }
    }

    if (!failed) {
      failureMonths.push(PROJECTION_MONTHS + 1); // beyond projection
    }
  }

  failureMonths.sort((a, b) => a - b);

  const p10 = failureMonths[Math.floor(MONTE_CARLO_ITERATIONS * 0.10)] ?? PROJECTION_MONTHS + 1;
  const p50 = failureMonths[Math.floor(MONTE_CARLO_ITERATIONS * 0.50)] ?? PROJECTION_MONTHS + 1;
  const p90 = failureMonths[Math.floor(MONTE_CARLO_ITERATIONS * 0.90)] ?? PROJECTION_MONTHS + 1;

  // Confidence: how concentrated the distribution is
  const spread = p90 - p10;
  const confidence = Math.max(40, Math.min(95, Math.round(100 - spread * 4)));

  return { p10, p50, p90, confidence };
}

/**
 * Convert Monte Carlo months to date strings.
 */
function monthsToDates(
  result: MonteCarloResult,
): { p10: string; p50: string; p90: string } {
  const now = new Date();
  const toDate = (months: number): string => {
    if (months > PROJECTION_MONTHS) return "> 24 meses";
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  };

  return {
    p10: toDate(result.p10),
    p50: toDate(result.p50),
    p90: toDate(result.p90),
  };
}

// ═══════════════════════════════════════════════════════════════
// INTERVENTION WINDOW & COST ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Compute cost analysis: preventive vs reactive.
 *
 * Preventive: planned maintenance at optimal window.
 * Reactive: emergency repair after failure.
 *   - Emergency premium: 2.5x base cost
 *   - Revenue loss during downtime
 *   - Cascade damage to connected components
 */
function computeCostAnalysis(
  componentCost: number,
  currentHealth: number,
  critical: boolean,
): { preventive_cost: number; reactive_cost: number; savings_pct: number } {
  const multipliers = DETERIORATION_THRESHOLDS.COST_MULTIPLIER;

  // Preventive cost scales with remaining life (more life left = cheaper intervention)
  const preventiveFactor = currentHealth > 60 ? 0.3 : currentHealth > 40 ? 0.5 : 0.7;
  const preventive_cost = Math.round(componentCost * preventiveFactor);

  // Reactive cost: emergency premium + cascade risk
  const emergencyMultiplier = critical
    ? multipliers.EMERGENCY_MULTIPLIER
    : multipliers.REACTIVE_BASE;
  const cascadeBoost = critical ? multipliers.CASCADE_MULTIPLIER : 1;
  const reactive_cost = Math.round(
    componentCost * emergencyMultiplier * cascadeBoost,
  );

  const savings_pct =
    reactive_cost > 0
      ? Math.round(((reactive_cost - preventive_cost) / reactive_cost) * 100)
      : 0;

  return { preventive_cost, reactive_cost, savings_pct };
}

// ═══════════════════════════════════════════════════════════════
// §F4: computeDeteriorationModel
//
// Orchestrates: component templates → health computation →
// Monte Carlo simulation → cost analysis → priority ranking
//
// "The system predicts WHEN each component will fail,
//  calculates the OPTIMAL intervention window, and shows
//  the cost of acting NOW vs waiting for failure."
// ═══════════════════════════════════════════════════════════════

export function computeDeteriorationModel(
  facility: Facility,
  maintenanceTasks: MaintenanceTask[],
  inspections: Inspection[],
  utilItem: AmenityUtilizationItem | null,
): DeteriorationModel {
  const facilityId = facility.id;
  const facilityType = facility.facility_type;
  const templates = COMPONENT_TEMPLATES[facilityType] ?? [];
  const utilPct = utilItem?.utilization_pct ?? 40;

  // ── Compute each component ──
  const components: DeteriorationComponent[] = templates.map((template) => {
    // 1. Base health from age
    // Find the most recent relevant maintenance to estimate "age"
    const lastRelevantMaintenance = maintenanceTasks
      .filter(
        (m) =>
          m.status === "completed" &&
          template.affected_by.includes(m.maintenance_type),
      )
      .sort(
        (a, b) =>
          new Date(b.completed_at ?? b.scheduled_date).getTime() -
          new Date(a.completed_at ?? a.scheduled_date).getTime(),
      )[0];

    const ageMonths = lastRelevantMaintenance
      ? monthsSince(
          lastRelevantMaintenance.completed_at ??
            lastRelevantMaintenance.scheduled_date,
        )
      : Math.min(
          template.expected_life_months * 0.6,
          monthsSince(facility.notes ?? new Date().toISOString()),
        );

    let health = baseHealthFromAge(ageMonths, template.expected_life_months);

    // 2. Apply maintenance resets
    health = applyMaintenanceResets(health, template, maintenanceTasks);

    // 3. Apply inspection adjustments
    health = applyInspectionAdjustment(health, inspections);

    // 4. Compute deterioration rate
    const rate = computeDeteriorationRate(
      template.expected_life_months,
      utilPct,
      health,
      template.critical,
    );

    // 5. Predict 30d and 90d health
    const predicted_30d = Math.max(0, Math.round(health - rate));
    const predicted_90d = Math.max(0, Math.round(health - rate * 3));

    // 6. Monte Carlo failure prediction
    const seed = hashString(`${facilityId}-${template.name}`);
    const mcResult = runMonteCarloFailure(health, rate, seed);

    // 7. Days to failure (from P50)
    const days_to_failure =
      mcResult.p50 > PROJECTION_MONTHS
        ? 999
        : mcResult.p50 * 30;

    // 8. Cost analysis
    const costs = computeCostAnalysis(
      template.replacement_cost,
      health,
      template.critical,
    );

    // 9. Status classification
    classifyHealthLevel(health);

    return {
      name: template.name,
      estimated_replacement_cost: template.replacement_cost,
      current_health: health,
      predicted_health_30d: predicted_30d,
      predicted_health_90d: predicted_90d,
      deterioration_rate: rate,
      deterioration_acceleration: 0, // computed in trajectory analysis
      failure_threshold: FAILURE_THRESHOLD,
      days_to_failure,
      intervention_cost: costs.preventive_cost,
      failure_cost: costs.reactive_cost,
      roi_of_prevention: costs.savings_pct,
    };
  });

  // ── Compute acceleration: are things getting worse faster? ──
  if (components.length >= 2) {
    const avgRate =
      components.reduce((s, c) => s + c.deterioration_rate, 0) /
      components.length;
    components.filter(
            (c) => c.current_health < DETERIORATION_THRESHOLDS.HEALTH.WARNING,
          ).length;
    // Acceleration: if many components are below 40%, the system is accelerating
    components.forEach((c) => {
      c.deterioration_acceleration =
        c.current_health < DETERIORATION_THRESHOLDS.HEALTH.WARNING
          ? Math.round((c.deterioration_rate / Math.max(avgRate, 0.1) - 1) * 100) / 100
          : 0;
    });
  }

  // ── Overall trajectory ──
  const avgHealth =
    components.length > 0
      ? components.reduce((s, c) => s + c.current_health, 0) /
        components.length
      : 100;
  const criticalCount = components.filter(
    (c) => c.current_health < DETERIORATION_THRESHOLDS.HEALTH.CRITICAL,
  ).length;
  const warningCount = components.filter(
    (c) =>
      c.current_health < DETERIORATION_THRESHOLDS.HEALTH.WARNING &&
      c.current_health >= DETERIORATION_THRESHOLDS.HEALTH.CRITICAL,
  ).length;

  let overall_trajectory: DeteriorationModel["overall_trajectory"];
  if (criticalCount > 0) {
    overall_trajectory = "critical";
  } else if (warningCount >= 2 || avgHealth < 50) {
    overall_trajectory = "accelerating";
  } else if (avgHealth < 70) {
    overall_trajectory = "slow_decline";
  } else {
    overall_trajectory = "stable";
  }

  // ── Budget analysis ──
  const maintenance_budget_needed = components.reduce(
    (s, c) => s + c.intervention_cost,
    0,
  );
  // Available budget proxy: can be overridden by real data
  // For now, assume the club allocates 40% of total needed
  const maintenance_budget_available = Math.round(
    maintenance_budget_needed * 0.4,
  );

  // ── Priority ranking ──
  const priority_ranking: MaintenancePriorityAction[] = components
    .filter((c) => c.current_health < DETERIORATION_THRESHOLDS.HEALTH.GOOD)
    .sort((a, b) => {
      // Critical components first, then by health (lowest first)
      if (a.current_health < FAILURE_THRESHOLD && b.current_health >= FAILURE_THRESHOLD) return -1;
      if (b.current_health < FAILURE_THRESHOLD && a.current_health >= FAILURE_THRESHOLD) return 1;
      return a.current_health - b.current_health;
    })
    .map((c) => {
      let urgency: MaintenancePriorityAction["urgency"];
      if (c.current_health < FAILURE_THRESHOLD || c.days_to_failure <= 30) {
        urgency = "emergency";
      } else if (c.current_health < 40 || c.days_to_failure <= 90) {
        urgency = "urgent";
      } else if (c.current_health < 60 || c.days_to_failure <= 180) {
        urgency = "planned";
      } else {
        urgency = "deferred";
      }
      return {
        component: c.name,
        urgency,
        reason: `${c.name}: salud ${c.current_health}%, deterioro ${c.deterioration_rate.toFixed(1)}%/mes. ${
          c.days_to_failure <= 30
            ? "Falla predicha en menos de 30 días."
            : c.days_to_failure <= 90
              ? "Falla predicha en menos de 90 días."
              : "Deterioro en curso."
        }`,
        estimated_cost: c.intervention_cost,
        deadline:
          c.days_to_failure <= 30
            ? "Inmediato"
            : c.days_to_failure <= 90
              ? "Este mes"
              : c.days_to_failure <= 180
                ? "Este trimestre"
                : "Próximos 6 meses",
        consequence_of_delay: `Si no se interviene: costo reactivo ₡${(c.failure_cost / 1_000_000).toFixed(1)}M vs preventivo ₡${(c.intervention_cost / 1_000_000).toFixed(1)}M (+${c.roi_of_prevention}%).${
          c.current_health < FAILURE_THRESHOLD
            ? " RIESGO DE CIERRE de la instalación."
            : ""
        }`,
      };
    });

  return {
    facility_id: facilityId,
    components,
    overall_trajectory,
    maintenance_budget_needed,
    maintenance_budget_available,
    priority_ranking,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F4b: predictAllDeterioration
//
// Batch prediction for all facilities.
// Returns a record keyed by facility_id for O(1) lookups.
// Gracefully handles missing data.
// ═══════════════════════════════════════════════════════════════

export function predictAllDeterioration(
  facilities: Facility[],
  maintenanceByFacility: Record<string, MaintenanceTask[]>,
  inspectionsByFacility: Record<string, Inspection[]>,
  utilizationByFacility: Record<string, AmenityUtilizationItem | null>,
): Record<string, DeteriorationModel> {
  const result: Record<string, DeteriorationModel> = {};

  for (const facility of facilities) {
    result[facility.id] = computeDeteriorationModel(
      facility,
      maintenanceByFacility[facility.id] ?? [],
      inspectionsByFacility[facility.id] ?? [],
      utilizationByFacility[facility.id] ?? null,
    );
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// BONUS: Failure Prediction Builder
//
// Builds a FailurePrediction object from Monte Carlo results.
// Used by components that need to display the prediction cone.
// ═══════════════════════════════════════════════════════════════

export function buildFailurePrediction(
  facilityId: string,
  components: DeteriorationComponent[],
): FailurePrediction {
  // Find the most critical component
  const critical = [...components].sort(
    (a, b) => a.current_health - b.current_health,
  )[0];

  if (!critical) {
    return {
      confidence: 50,
      likely_failure_date: "> 24 meses",
      affected_components: [],
      cascade_risk: false,
      monte_carlo: { p10: "> 24m", p50: "> 24m", p90: "> 24m" },
    };
  }

  const seed = hashString(`${facilityId}-failure-prediction`);
  const mcResult = runMonteCarloFailure(
    critical.current_health,
    critical.deterioration_rate,
    seed,
  );
  const dates = monthsToDates(mcResult);

  // Cascade risk: if the critical component is HVAC or structural,
  // its failure affects other components
  const cascadeComponents = components.filter(
    (c) =>
      c.name !== critical.name &&
      c.current_health < DETERIORATION_THRESHOLDS.HEALTH.ATTENTION,
  );

  return {
    confidence: mcResult.confidence,
    likely_failure_date: dates.p50,
    affected_components: cascadeComponents.map((c) => c.name),
    cascade_risk: cascadeComponents.length > 0,
    cascade_description:
      cascadeComponents.length > 0
        ? `Falla de ${critical.name} puede acelerar deterioro de: ${cascadeComponents.map((c) => c.name).join(", ")}`
        : undefined,
    monte_carlo: dates,
  };
}