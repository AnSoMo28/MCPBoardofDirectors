// src/features/facilities/lib/maintenancePrediction.ts
// ═══════════════════════════════════════════════════════════════
// PREDICTIVE MAINTENANCE SCHEDULING ENGINE — "The Scheduler"
//
// §F8: predictMaintenanceNeeds / scheduleOptimalMaintenance
//
// Maintenance is NOT a calendar. It's a PREDICTION that balances:
//   - Component health (from deterioration model)
//   - Budget constraints (what can we afford?)
//   - Upcoming events (what can we NOT interrupt?)
//   - Seasonal patterns (when is demand lowest?)
//   - Resource availability (who can do it?)
//
// The system generates an OPTIMAL SCHEDULE that minimizes
// total cost while maximizing facility availability during
// peak periods.
//
// Pure functions. Zero side effects. Zero API calls.
// ═══════════════════════════════════════════════════════════════

import type {
  Facility,
  FacilityReservation,
  DeteriorationModel,
  MaintenanceTask,
  MaintenanceType,
  MaintenancePriority as MaintenancePriorityLevel,
  MaintenancePriorityAction
} from "../types";

import {
  DETERIORATION_THRESHOLDS,
} from "../config";

// ═══════════════════════════════════════════════════════════════
// TYPES — Maintenance Prediction Domain
// ═══════════════════════════════════════════════════════════════

/** A single maintenance job recommended by the prediction engine. */
export interface PredictedMaintenanceJob {
  id: string;
  facility_id: string;
  facility_name: string;
  component: string;
  maintenance_type: MaintenanceType;
  priority: MaintenancePriorityLevel;
  urgency: MaintenancePriorityAction["urgency"];
  description: string;
  estimated_cost: number;
  estimated_duration_hours: number;
  optimal_window_start: string;
  optimal_window_end: string;
  deadline: string;
  reason: string;
  consequence_of_delay: string;
  health_at_scheduling: number;
  predicted_health_after: number;
  conflicts_with_events: boolean;
  alternative_window: string | null;
}

/** The complete maintenance prediction output for one facility. */
export interface FacilityMaintenancePrediction {
  facility_id: string;
  facility_name: string;
  jobs: PredictedMaintenanceJob[];
  total_estimated_cost: number;
  budget_coverage_pct: number;
  next_inspection_due: string;
  overall_urgency: "none" | "routine" | "elevated" | "critical";
  narrative: string;
}

/** Portfolio-level maintenance summary. */
export interface MaintenancePortfolioSummary {
  total_jobs: number;
  emergency_jobs: number;
  urgent_jobs: number;
  planned_jobs: number;
  total_cost: number;
  avg_budget_coverage_pct: number;
  facilities_needing_attention: number;
  worst_facility: { id: string; name: string; urgency: string } | null;
  recommended_budget: number;
  schedule: PredictedMaintenanceJob[];
}

/** Optimization constraints for scheduling. */
export interface SchedulingConstraints {
  available_budget: number;
  max_concurrent_closures: number;
  blackout_dates: string[];
  preferred_maintenance_days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  resource_capacity_hours_per_week: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS — Maintenance Type Mapping
// ═══════════════════════════════════════════════════════════════

/** Map component health status to recommended maintenance type. */
function inferMaintenanceType(
  currentHealth: number,
  deteriorationRate: number,
  daysToFailure: number,
): MaintenanceType {
  if (daysToFailure <= 14 || currentHealth < 20) {
    return "emergency";
  }
  if (daysToFailure <= 60 || currentHealth < 40) {
    return "corrective";
  }
  if (deteriorationRate > DETERIORATION_THRESHOLDS.RATE.ELEVATED) {
    return "corrective";
  }
  return "preventive";
}

/** Map urgency to priority level for the backend. */
function urgencyToPriority(
  urgency: MaintenancePriorityAction["urgency"],
): MaintenancePriorityLevel {
  switch (urgency) {
    case "emergency":
      return "critical";
    case "urgent":
      return "high";
    case "planned":
      return "medium";
    case "deferred":
      return "low";
  }
}

/** Estimate maintenance duration based on type and component complexity. */
function estimateDuration(
  maintenanceType: MaintenanceType,
  componentName: string,
): number {
  // Base hours by maintenance type
  const baseHours: Record<MaintenanceType, number> = {
    emergency: 8,
    corrective: 4,
    preventive: 2,
    renovation: 40,
    cleaning: 1,
    inspection: 2,
  };

  const base = baseHours[maintenanceType] ?? 4;

  // Complex components take longer
  const complexKeywords = ["sistema", "HVAC", "equipo", "filtración", "bomba", "riego"];
  const isComplex = complexKeywords.some((kw) =>
    componentName.toLowerCase().includes(kw.toLowerCase()),
  );

  return isComplex ? Math.round(base * 1.5) : base;
}

/** Generate a human-readable description for the maintenance job. */
function buildJobDescription(
  component: string,
  health: number,
  maintenanceType: MaintenanceType,
  facilityName: string,
): string {
  const healthLabel =
    health < 20
      ? "crítico"
      : health < 40
        ? "degradado"
        : health < 60
          ? "deteriorándose"
          : "preventivo";

  const typeLabel: Record<MaintenanceType, string> = {
    emergency: "Reparación de emergencia",
    corrective: "Mantenimiento correctivo",
    preventive: "Mantenimiento preventivo",
    renovation: "Renovación",
    cleaning: "Limpieza profunda",
    inspection: "Inspección técnica",
  };

  return `${typeLabel[maintenanceType]} de ${component} en ${facilityName} — estado ${healthLabel} (${health}%).`;
}

/** Generate consequence of delay text. */
function buildConsequenceText(
  _component: string,
  _currentHealth: number,
  interventionCost: number,
  failureCost: number,
  daysToFailure: number,
): string {
  const savingsPct =
    failureCost > 0
      ? Math.round(((failureCost - interventionCost) / failureCost) * 100)
      : 0;

  let urgency = "";
  if (daysToFailure <= 14) {
    urgency = "RIESGO DE FALLA INMINENTE. Posible cierre de instalación.";
  } else if (daysToFailure <= 30) {
    urgency = "Alta probabilidad de falla en los próximos 30 días.";
  } else if (daysToFailure <= 90) {
    urgency = "Deterioro acelerado detectado. Ventana de intervención se cierra.";
  } else {
    urgency = "Deterioro progresivo. Intervención temprana maximiza ahorro.";
  }

  return `${urgency} Si no se interviene: costo reactivo ₡${(failureCost / 1_000_000).toFixed(1)}M vs preventivo ₡${(interventionCost / 1_000_000).toFixed(1)}M (${savingsPct}% de ahorro).`;
}

// ═══════════════════════════════════════════════════════════════
// EVENT CONFLICT DETECTION
//
// Maintenance should NOT happen when the facility has
// upcoming events. The system detects conflicts and
// suggests alternative windows.
// ═══════════════════════════════════════════════════════════════

interface EventWindow {
  date: string;
  facility_id: string;
  event_name: string;
  start_time: string;
  end_time: string;
}

/**
 * Extract event windows from reservations.
 * Only confirmed or pending reservations count as conflicts.
 */
function extractEventWindows(
  reservations: FacilityReservation[],
  facilityId: string,
  daysAhead: number,
): EventWindow[] {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + daysAhead);

  return reservations
    .filter(
      (r) =>
        r.facility_id === facilityId &&
        (r.status === "confirmed" || r.status === "pending") &&
        new Date(r.date) >= now &&
        new Date(r.date) <= endDate,
    )
    .map((r) => ({
      date: r.date,
      facility_id: r.facility_id,
      event_name: r.purpose,
      start_time: r.start_time,
      end_time: r.end_time,
    }));
}

/**
 * Check if a maintenance window overlaps with any event.
 */
function hasEventConflict(
  maintenanceStart: Date,
  maintenanceEnd: Date,
  eventWindows: EventWindow[],
): boolean {
  return eventWindows.some((event) => {
    const eventDate = event.date;
    const eventStart = new Date(`${eventDate}T${event.start_time}`);
    const eventEnd = new Date(`${eventDate}T${event.end_time}`);
    return maintenanceStart < eventEnd && maintenanceEnd > eventStart;
  });
}

/**
 * Find the next available window without event conflicts.
 * Searches up to 30 days ahead.
 */
function findAlternativeWindow(
  preferredStart: Date,
  durationHours: number,
  eventWindows: EventWindow[],
): string | null {
  const searchEnd = new Date(preferredStart);
  searchEnd.setDate(searchEnd.getDate() + 30);

  let candidate = new Date(preferredStart);

  while (candidate < searchEnd) {
    const candidateEnd = new Date(candidate);
    candidateEnd.setHours(candidateEnd.getHours() + durationHours);

    if (!hasEventConflict(candidate, candidateEnd, eventWindows)) {
      return candidate.toISOString().split("T")[0];
    }

    // Try next day
    candidate.setDate(candidate.getDate() + 1);
    // Schedule for early morning (6 AM)
    candidate.setHours(6, 0, 0, 0);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// SEASONAL SCHEDULING
//
// Costa Rica seasonal patterns for maintenance:
//   - Dry season (Dec-Apr): HIGH demand → minimize maintenance
//   - Rainy season (May-Nov): LOWER demand → optimal for major work
//   - Transition (Nov, Apr): moderate → good for preventive
//
// The system avoids scheduling major maintenance during
// peak season and exploits low-demand windows.
// ═══════════════════════════════════════════════════════════════

interface SeasonalInfo {
  isPeakSeason: boolean;
  demandMultiplier: number;
  maintenanceFeasibility: "ideal" | "good" | "difficult" | "avoid";
  seasonLabel: string;
}

function getSeasonalInfo(month: number): SeasonalInfo {
  // month is 0-indexed (0 = January)
  if (month >= 11 || month <= 2) {
    // Dec-Feb: peak dry season
    return {
      isPeakSeason: true,
      demandMultiplier: 1.3,
      maintenanceFeasibility: "avoid",
      seasonLabel: "Temporada alta (seca)",
    };
  }
  if (month >= 3 && month <= 4) {
    // Mar-Apr: transition to rainy
    return {
      isPeakSeason: false,
      demandMultiplier: 1.1,
      maintenanceFeasibility: "good",
      seasonLabel: "Transición a lluvias",
    };
  }
  if (month >= 5 && month <= 8) {
    // May-Aug: rainy season core
    return {
      isPeakSeason: false,
      demandMultiplier: 0.8,
      maintenanceFeasibility: "ideal",
      seasonLabel: "Temporada baja (lluviosa)",
    };
  }
  // Sep-Nov: late rainy / transition to dry
  return {
    isPeakSeason: false,
    demandMultiplier: 0.9,
    maintenanceFeasibility: "good",
    seasonLabel: "Transición a seca",
  };
}

/**
 * Find the best month to schedule major maintenance.
 * Considers demand patterns and seasonal feasibility.
 */
function findOptimalMaintenanceMonth(
  currentMonth: number,
  urgency: MaintenancePriorityAction["urgency"],
): number {
  // Emergency/urgent: ASAP regardless of season
  if (urgency === "emergency" || urgency === "urgent") {
    return currentMonth;
  }

  // Planned/deferred: find the next low-demand month
  // Look up to 6 months ahead
  for (let offset = 1; offset <= 6; offset++) {
    const candidateMonth = (currentMonth + offset) % 12;
    const seasonal = getSeasonalInfo(candidateMonth);
    if (seasonal.maintenanceFeasibility === "ideal") {
      return candidateMonth;
    }
  }

  // Fallback: next month
  return (currentMonth + 1) % 12;
}

// ═══════════════════════════════════════════════════════════════
// §F8: predictMaintenanceNeeds
//
// For a single facility:
//   1. Read deterioration model components
//   2. Filter components needing attention
//   3. For each: determine maintenance type, urgency, timing
//   4. Check event conflicts and suggest alternatives
//   5. Apply seasonal optimization
//   6. Generate narrative summary
// ═══════════════════════════════════════════════════════════════

export function predictMaintenanceNeeds(
  facility: Facility,
  deterioration: DeteriorationModel,
  reservations: FacilityReservation[],
  existingTasks: MaintenanceTask[],
): FacilityMaintenancePrediction {
  const now = new Date();
  const currentMonth = now.getMonth();

  // Extract event windows for conflict detection
  const eventWindows = extractEventWindows(reservations, facility.id, 90);

  // Filter existing scheduled/active tasks to avoid duplicates
  const activeTaskDescriptions = new Set(
    existingTasks
      .filter((t) => t.status === "scheduled" || t.status === "in_progress")
      .map((t) => t.description.toLowerCase()),
  );

  // ── Generate jobs from components needing attention ──
  const jobs: PredictedMaintenanceJob[] = [];

  for (const priority of deterioration.priority_ranking) {
    // Skip if already scheduled
    if (activeTaskDescriptions.has(priority.component.toLowerCase())) {
      continue;
    }

    const component = deterioration.components.find(
      (c) => c.name === priority.component,
    );
    if (!component) continue;

    // ── Determine maintenance parameters ──
    const maintenanceType = inferMaintenanceType(
      component.current_health,
      component.deterioration_rate,
      component.days_to_failure,
    );

    const urgency = priority.urgency;
    const priorityLevel = urgencyToPriority(urgency);
    const durationHours = estimateDuration(maintenanceType, component.name);
    const description = buildJobDescription(
      component.name,
      component.current_health,
      maintenanceType,
      facility.name,
    );

    // ── Compute optimal scheduling window ──
    const deadlineDate = new Date(now);
    deadlineDate.setDate(
      deadlineDate.getDate() + Math.min(component.days_to_failure, 180),
    );

    // For non-urgent work, prefer low-demand windows
    let optimalStart: Date;
    if (urgency === "emergency" || urgency === "urgent") {
      optimalStart = new Date(now);
      // ASAP, but try to avoid today's events
      if (hasEventConflict(now, new Date(now.getTime() + durationHours * 3_600_000), eventWindows)) {
        optimalStart.setDate(optimalStart.getDate() + 1);
        optimalStart.setHours(6, 0, 0, 0);
      }
    } else {
      // Find the best month
      const bestMonth = findOptimalMaintenanceMonth(currentMonth, urgency);
      const monthOffset =
        bestMonth > currentMonth
          ? bestMonth - currentMonth
          : 12 - currentMonth + bestMonth;
      optimalStart = new Date(now);
      optimalStart.setMonth(optimalStart.getMonth() + Math.max(1, monthOffset));
      // First Monday of that month
      while (optimalStart.getDay() !== 1) {
        optimalStart.setDate(optimalStart.getDate() + 1);
      }
      optimalStart.setHours(6, 0, 0, 0);
    }

    const optimalEnd = new Date(optimalStart);
    optimalEnd.setHours(optimalEnd.getHours() + durationHours);

    // ── Check event conflicts ──
    const conflicts = hasEventConflict(optimalStart, optimalEnd, eventWindows);
    let alternativeWindow: string | null = null;
    if (conflicts) {
      alternativeWindow = findAlternativeWindow(
        optimalStart,
        durationHours,
        eventWindows,
      );
    }

    // ── Health predictions ──
    const predictedHealthAfter = Math.min(
      100,
      component.current_health +
        (maintenanceType === "renovation"
          ? 80
          : maintenanceType === "emergency"
            ? 45
            : maintenanceType === "corrective"
              ? 30
              : 15),
    );

    // ── Build the job ──
    jobs.push({
      id: `pred-${facility.id}-${component.name.replace(/\s+/g, "-").toLowerCase()}`,
      facility_id: facility.id,
      facility_name: facility.name,
      component: component.name,
      maintenance_type: maintenanceType,
      priority: priorityLevel,
      urgency,
      description,
      estimated_cost: component.intervention_cost,
      estimated_duration_hours: durationHours,
      optimal_window_start: optimalStart.toISOString().split("T")[0],
      optimal_window_end: optimalEnd.toISOString().split("T")[0],
      deadline: deadlineDate.toISOString().split("T")[0],
      reason: priority.reason,
      consequence_of_delay: buildConsequenceText(
        component.name,
        component.current_health,
        component.intervention_cost,
        component.failure_cost,
        component.days_to_failure,
      ),
      health_at_scheduling: component.current_health,
      predicted_health_after: predictedHealthAfter,
      conflicts_with_events: conflicts,
      alternative_window: alternativeWindow,
    });
  }

  // ── Sort by urgency then by health (worst first) ──
  const urgencyOrder: Record<string, number> = {
    emergency: 0,
    urgent: 1,
    planned: 2,
    deferred: 3,
  };
  jobs.sort((a, b) => {
    const urgencyDiff =
      (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9);
    if (urgencyDiff !== 0) return urgencyDiff;
    return a.health_at_scheduling - b.health_at_scheduling;
  });

  // ── Summary computations ──
  const totalCost = jobs.reduce((s, j) => s + j.estimated_cost, 0);
  const budgetAvailable = deterioration.maintenance_budget_available;
  const budgetCoverage =
    totalCost > 0
      ? Math.round((budgetAvailable / totalCost) * 100)
      : 100;

  // Next inspection: 90 days from now or sooner if critical
  const nextInspectionDays =
    deterioration.overall_trajectory === "critical"
      ? 14
      : deterioration.overall_trajectory === "accelerating"
        ? 30
        : 90;
  const nextInspectionDate = new Date(now);
  nextInspectionDate.setDate(nextInspectionDate.getDate() + nextInspectionDays);

  // Overall urgency
  const hasEmergency = jobs.some((j) => j.urgency === "emergency");
  const hasUrgent = jobs.some((j) => j.urgency === "urgent");
  const hasPlanned = jobs.some((j) => j.urgency === "planned");

  const overallUrgency: FacilityMaintenancePrediction["overall_urgency"] =
    hasEmergency
      ? "critical"
      : hasUrgent
        ? "elevated"
        : hasPlanned
          ? "routine"
          : "none";

  // ── Narrative ──
  const narrative = buildFacilityNarrative(
    facility.name,
    jobs,
    deterioration.overall_trajectory,
    budgetCoverage,
    nextInspectionDate.toISOString().split("T")[0],
  );

  return {
    facility_id: facility.id,
    facility_name: facility.name,
    jobs,
    total_estimated_cost: totalCost,
    budget_coverage_pct: budgetCoverage,
    next_inspection_due: nextInspectionDate.toISOString().split("T")[0],
    overall_urgency: overallUrgency,
    narrative,
  };
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE GENERATION
//
// The system tells a STORY about the facility's maintenance
// state — not just data points.
// ═══════════════════════════════════════════════════════════════

function buildFacilityNarrative(
  facilityName: string,
  jobs: PredictedMaintenanceJob[],
  trajectory: string,
  budgetCoverage: number,
  nextInspection: string,
): string {
  if (jobs.length === 0) {
    return `${facilityName}: Todos los componentes en buen estado. Próxima inspección recomendada: ${nextInspection}. Sin acciones pendientes.`;
  }

  const emergencyCount = jobs.filter((j) => j.urgency === "emergency").length;
  const urgentCount = jobs.filter((j) => j.urgency === "urgent").length;
  const totalCost = jobs.reduce((s, j) => s + j.estimated_cost, 0);

  let narrative = `${facilityName}: ${jobs.length} acción(es) de mantenimiento requerida(s). `;

  if (emergencyCount > 0) {
    narrative += `ALERTA: ${emergencyCount} componente(s) en estado de emergencia. `;
  }
  if (urgentCount > 0) {
    narrative += `${urgentCount} componente(s) requieren atención urgente. `;
  }

  narrative += `Trayectoria general: ${trajectory}. `;
  narrative += `Costo total estimado: ₡${(totalCost / 1_000_000).toFixed(1)}M. `;
  narrative += `Cobertura presupuestaria: ${budgetCoverage}%. `;

  if (budgetCoverage < 60) {
    narrative += "Presupuesto insuficiente — priorizar acciones de emergencia y urgente. ";
  }

  const conflictCount = jobs.filter((j) => j.conflicts_with_events).length;
  if (conflictCount > 0) {
    narrative += `${conflictCount} trabajo(s) tienen conflicto con eventos programados — se recomendaron ventanas alternativas.`;
  }

  return narrative;
}

// ═══════════════════════════════════════════════════════════════
// BUDGET OPTIMIZATION — Knapsack Problem
//
// Given a fixed budget, which maintenance jobs should we
// schedule NOW vs defer? This is a variant of the knapsack
// problem optimized for urgency × savings.
//
// Score = urgency_weight × savings_ratio × (1 / days_to_failure)
//   urgency_weight: emergency=10, urgent=6, planned=3, deferred=1
//   savings_ratio: (failure_cost - intervention_cost) / failure_cost
//   days_to_failure: shorter = higher priority
//
// Jobs are selected greedily by score until budget is exhausted.
// Emergency jobs are ALWAYS included regardless of budget.
// ═══════════════════════════════════════════════════════════════

interface BudgetOptimizationResult {
  selected: PredictedMaintenanceJob[];
  deferred: PredictedMaintenanceJob[];
  total_selected_cost: number;
  total_deferred_cost: number;
  budget_remaining: number;
  optimization_score: number;
}

export function optimizeMaintenanceBudget(
  jobs: PredictedMaintenanceJob[],
  availableBudget: number,
): BudgetOptimizationResult {
  if (jobs.length === 0) {
    return {
      selected: [],
      deferred: [],
      total_selected_cost: 0,
      total_deferred_cost: 0,
      budget_remaining: availableBudget,
      optimization_score: 0,
    };
  }

  // Score each job
  const urgencyWeights: Record<string, number> = {
    emergency: 10,
    urgent: 6,
    planned: 3,
    deferred: 1,
  };

  const scoredJobs = jobs.map((job) => {
    const urgencyWeight = urgencyWeights[job.urgency] ?? 1;
    const healthFactor = Math.max(1, (100 - job.health_at_scheduling) / 10);
    const score = urgencyWeight * healthFactor;
    return { job, score };
  });

  // Sort by score descending
  scoredJobs.sort((a, b) => b.score - a.score);

  // Greedy selection
  const selected: PredictedMaintenanceJob[] = [];
  const deferred: PredictedMaintenanceJob[] = [];
  let remaining = availableBudget;

  for (const { job } of scoredJobs) {
    // Emergency jobs are ALWAYS included
    if (job.urgency === "emergency") {
      selected.push(job);
      remaining -= job.estimated_cost;
      continue;
    }

    // If budget allows, include it
    if (job.estimated_cost <= remaining) {
      selected.push(job);
      remaining -= job.estimated_cost;
    } else {
      deferred.push(job);
    }
  }

  const totalSelectedCost = selected.reduce(
    (s, j) => s + j.estimated_cost,
    0,
  );
  const totalDeferredCost = deferred.reduce(
    (s, j) => s + j.estimated_cost,
    0,
  );

  // Optimization score: what % of total urgency-weighted savings we captured
  const totalScore = scoredJobs.reduce((s, { score }) => s + score, 0);
  const selectedScore = selected.reduce((s, job) => {
    const scored = scoredJobs.find((sj) => sj.job.id === job.id);
    return s + (scored?.score ?? 0);
  }, 0);

  const optimizationScore =
    totalScore > 0 ? Math.round((selectedScore / totalScore) * 100) : 100;

  return {
    selected,
    deferred,
    total_selected_cost: totalSelectedCost,
    total_deferred_cost: totalDeferredCost,
    budget_remaining: Math.max(0, remaining),
    optimization_score: optimizationScore,
  };
}

// ═══════════════════════════════════════════════════════════════
// §F8b: scheduleOptimalMaintenance
//
// Portfolio-level: runs predictions for ALL facilities,
// aggregates into a single prioritized schedule,
// applies budget optimization, and generates a summary.
// ═══════════════════════════════════════════════════════════════

export function scheduleOptimalMaintenance(
  facilities: Facility[],
  deteriorationModels: Record<string, DeteriorationModel>,
  reservations: FacilityReservation[],
  maintenanceByFacility: Record<string, MaintenanceTask[]>,
  totalBudget: number,
): MaintenancePortfolioSummary {
  // ── Predict for each facility ──
  const predictions: FacilityMaintenancePrediction[] = [];

  for (const facility of facilities) {
    const deterioration = deteriorationModels[facility.id];
    if (!deterioration) continue;

    const prediction = predictMaintenanceNeeds(
      facility,
      deterioration,
      reservations,
      maintenanceByFacility[facility.id] ?? [],
    );

    predictions.push(prediction);
  }

  // ── Aggregate all jobs ──
  const allJobs = predictions.flatMap((p) => p.jobs);

  // ── Budget optimization ──
  const optimization = optimizeMaintenanceBudget(allJobs, totalBudget);

  // ── Aggregate stats ──
  const emergencyJobs = allJobs.filter((j) => j.urgency === "emergency").length;
  const urgentJobs = allJobs.filter((j) => j.urgency === "urgent").length;
  const plannedJobs = allJobs.filter(
    (j) => j.urgency === "planned" || j.urgency === "deferred",
  ).length;

  const avgBudgetCoverage =
    predictions.length > 0
      ? Math.round(
          predictions.reduce((s, p) => s + p.budget_coverage_pct, 0) /
            predictions.length,
        )
      : 100;

  const facilitiesNeedingAttention = predictions.filter(
    (p) => p.overall_urgency === "critical" || p.overall_urgency === "elevated",
  ).length;

  // Find worst facility
  const worstPrediction = [...predictions]
    .sort((a, b) => {
      const urgencyOrder: Record<string, number> = {
        critical: 0,
        elevated: 1,
        routine: 2,
        none: 3,
      };
      return (
        (urgencyOrder[a.overall_urgency] ?? 9) -
        (urgencyOrder[b.overall_urgency] ?? 9)
      );
    })[0] ?? null;

  // Recommended budget: total needed + 15% buffer
  const recommendedBudget = Math.round(
    allJobs.reduce((s, j) => s + j.estimated_cost, 0) * 1.15,
  );

  return {
    total_jobs: allJobs.length,
    emergency_jobs: emergencyJobs,
    urgent_jobs: urgentJobs,
    planned_jobs: plannedJobs,
    total_cost: allJobs.reduce((s, j) => s + j.estimated_cost, 0),
    avg_budget_coverage_pct: avgBudgetCoverage,
    facilities_needing_attention: facilitiesNeedingAttention,
    worst_facility: worstPrediction
      ? {
          id: worstPrediction.facility_id,
          name: worstPrediction.facility_name,
          urgency: worstPrediction.overall_urgency,
        }
      : null,
    recommended_budget: recommendedBudget,
    schedule: optimization.selected,
  };
}