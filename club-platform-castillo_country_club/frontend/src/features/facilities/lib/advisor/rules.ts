// src/features/facilities/lib/advisor/rules.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — 15 Rules × 5 Layers
//
// FR1-FR4, FR14  → health
// FR5, FR15      → engagement
// FR6-FR8        → strategy
// FR9-FR11       → prediction
// FR12-FR13      → innovation
//
// Each rule is a pure function: FacilitiesAdvisorInput → Insight | null
// Zero side effects. All thresholds from config.ts.
// ═══════════════════════════════════════════════════════════════

import type { FacilitiesAdvisorInsight } from "../../types";

import {
  FACILITIES_ADVISOR_THRESHOLDS as T,
  FACILITIES_ADVISOR_RULES,
} from "../../config";

import type { FacilitiesAdvisorInput, FacilitiesRuleFn } from "./types";

import {
  buildInsight,
  makeTrigger,
  severityFromThreshold,
  severityFromTrend,
  formatPercentage,
  formatCurrency,
  formatDaysToFailure,
} from "./helpers";

// ═══════════════════════════════════════════════════════════════
// LAYER 1: HEALTH (FR1, FR2, FR3, FR4, FR14)
// ═══════════════════════════════════════════════════════════════

/**
 * FR1 — Low Occupancy Alert
 * "Facility occupancy drops below threshold — underutilization risk."
 */
export const rule_FR1_LowOccupancy: FacilitiesRuleFn = (input) => {
  if (!input.utilization) return null;

  const critical = input.utilization.facilities.filter(
    (f) => f.utilization_pct < T.OCCUPANCY_LOW_THRESHOLD && f.status === "operational",
  );
  if (critical.length === 0) return null;

  const worst = [...critical].sort((a, b) => a.utilization_pct - b.utilization_pct)[0];
  const severity = severityFromThreshold(worst.utilization_pct, T.OCCUPANCY_LOW_THRESHOLD, "below");

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR1.id,
    `${critical.length} espacio(s) con utilización crítica (<${T.OCCUPANCY_LOW_THRESHOLD}%)`,
    critical
      .map((f) => `${f.facility_name}: ${formatPercentage(f.utilization_pct)}`)
      .join(", "),
    "health",
    severity,
    88,
    makeTrigger("facility-update", {
      facility_id: worst.facility_id,
      new_status: "maintenance",
    }),
  );
};

/**
 * FR2 — Overcrowding Alert
 * "Facility occupancy exceeds threshold — saturation and comfort risk."
 */
export const rule_FR2_Overcrowding: FacilitiesRuleFn = (input) => {
  if (!input.utilization) return null;

  const overcrowded = input.utilization.facilities.filter(
    (f) => f.utilization_pct >= T.OCCUPANCY_HIGH_THRESHOLD && f.status === "operational",
  );
  if (overcrowded.length === 0) return null;

  const worst = [...overcrowded].sort((a, b) => b.utilization_pct - a.utilization_pct)[0];
  const severity =
    worst.utilization_pct >= T.OCCUPANCY_CRITICAL_THRESHOLD ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR2.id,
    `${overcrowded.length} espacio(s) con sobrecarga (>${T.OCCUPANCY_HIGH_THRESHOLD}%)`,
    overcrowded
      .map((f) => `${f.facility_name}: ${formatPercentage(f.utilization_pct)} — redistribuir`)
      .join("; "),
    "health",
    severity,
    85,
    undefined,
    "intelligence",
  );
};

/**
 * FR3 — Comfort Degradation
 * "Comfort score drops below acceptable — member experience at risk."
 */
export const rule_FR3_ComfortDegradation: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.comfortScores);
  if (entries.length === 0) return null;

  const degraded = entries.filter(
    ([, score]) => score.overall < T.COMFORT_LOW_THRESHOLD && score.intervention_needed,
  );
  if (degraded.length === 0) return null;

  const worst = degraded.sort((a, b) => a[1].overall - b[1].overall)[0];
  const [, worstScore] = worst;
  const severity =
    worstScore.overall < T.COMFORT_CRITICAL_THRESHOLD ? "critical" : "warning";

  // Build reasoning with the primary deficient dimension
  const dimEntries = Object.entries(worstScore.dimensions) as Array<
    [string, { value: number; status: string; recommendation?: string }]
  >;
  const worstDim = dimEntries.sort((a, b) => a[1].value - b[1].value)[0];

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR3.id,
    `Confort degradado en ${degraded.length} espacio(s) (<${T.COMFORT_LOW_THRESHOLD}/100)`,
    `${worst[0]}: ${worstScore.overall}/100 (${worstScore.intervention_urgency}). Causa primaria: ${worstDim[0]} = ${worstDim[1].value}/100. ${worstDim[1].recommendation ?? ""}`,
    "health",
    severity,
    82,
  );
};

/**
 * FR4 — Component Deterioration
 * "Facility component health critical — failure predicted."
 */
export const rule_FR4_Deterioration: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.deteriorationModels);
  if (entries.length === 0) return null;

  const alerts: Array<{
    facilityId: string;
    facilityName: string;
    component: string;
    health: number;
    daysToFailure: number;
  }> = [];

  for (const [facilityId, model] of entries) {
    const facility = input.facilities.find((f) => f.id === facilityId);
    for (const comp of model.components) {
      if (
        comp.current_health < T.HEALTH_LOW_THRESHOLD ||
        comp.days_to_failure <= T.FAILURE_DAYS_WARNING
      ) {
        alerts.push({
          facilityId,
          facilityName: facility?.name ?? facilityId,
          component: comp.name,
          health: comp.current_health,
          daysToFailure: comp.days_to_failure,
        });
      }
    }
  }

  if (alerts.length === 0) return null;

  const worst = [...alerts].sort((a, b) => a.health - b.health)[0];
  const severity = worst.health < T.HEALTH_CRITICAL_THRESHOLD ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR4.id,
    `${alerts.length} componente(s) con salud crítica`,
    alerts
      .slice(0, 3)
      .map(
        (a) =>
          `${a.facilityName} — ${a.component}: ${a.health}%, fallo en ${formatDaysToFailure(a.daysToFailure)}`,
      )
      .join("; "),
    "health",
    severity,
    90,
    makeTrigger("maint-schedule", {
      facility_id: worst.facilityId,
      facility_name: worst.facilityName,
      maintenance_type: "corrective",
      priority: "high",
      description: `${worst.component}: salud ${worst.health}%`,
      scheduled_date: new Date().toISOString().split("T")[0],
    }),
  );
};

/**
 * FR14 — Comfort Cascade Risk
 * "Multiple facilities with degraded comfort — systemic issue."
 */
export const rule_FR14_ComfortCascade: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.comfortScores);
  if (entries.length < 2) return null;

  const degraded = entries.filter(
    ([, score]) => score.overall < T.COMFORT_LOW_THRESHOLD,
  );

  if (degraded.length < T.COMFORT_CASCADE_THRESHOLD) return null;

  const severity = degraded.length >= T.COMFORT_CASCADE_THRESHOLD + 1 ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR14.id,
    `Cascada de confort: ${degraded.length} espacio(s) por debajo de ${T.COMFORT_LOW_THRESHOLD}/100`,
    `Posible causa sistémica: ${degraded.map(([id]) => id).join(", ")}. Verificar HVAC central, ventilación y capacidad operativa.`,
    "health",
    severity,
    78,
    makeTrigger("issue-report", {
      facility_id: degraded[0][0],
      description: `Cascada de confort detectada en ${degraded.length} espacios — posible fallo de HVAC o ventilación central`,
      priority: "high",
    }),
  );
};

// ═══════════════════════════════════════════════════════════════
// LAYER 2: ENGAGEMENT (FR5, FR15)
// ═══════════════════════════════════════════════════════════════

/**
 * FR5 — Maintenance Overdue
 * "Scheduled maintenance tasks past deadline."
 */
export const rule_FR5_MaintenanceOverdue: FacilitiesRuleFn = (input) => {
  if (!input.maintenance || input.maintenance.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const overdue = input.maintenance.filter(
    (m) => m.status === "scheduled" && m.scheduled_date < today,
  );
  if (overdue.length === 0) return null;

  const daysOverdueMax = overdue.reduce((max, m) => {
    const days = Math.floor(
      (new Date(today).getTime() - new Date(m.scheduled_date).getTime()) / 86_400_000,
    );
    return Math.max(max, days);
  }, 0);

  const severity =
    daysOverdueMax >= T.MAINTENANCE_OVERDUE_DAYS * 2 ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR5.id,
    `${overdue.length} mantenimiento(s) atrasado(s) — máximo ${daysOverdueMax} días`,
    overdue
      .slice(0, 3)
      .map(
        (m) =>
          `${m.facility_name}: ${m.description} (${m.scheduled_date}) — ₡${m.cost.toLocaleString("es-CR")}`,
      )
      .join("; "),
    "engagement",
    severity,
    95,
    makeTrigger("maint-schedule", {
      facility_id: overdue[0].facility_id,
      facility_name: overdue[0].facility_name,
      maintenance_type: overdue[0].maintenance_type,
      priority: overdue[0].priority,
      description: overdue[0].description,
      scheduled_date: today,
    }),
  );
};

/**
 * FR15 — Guest Journey Impact
 * "Facility state negatively affects guest conversion journey."
 */
export const rule_FR15_GuestImpact: FacilitiesRuleFn = (input) => {
  // Check if any facility has both low comfort AND high guest traffic
  const entries = Object.entries(input.comfortScores);
  if (entries.length === 0) return null;

  // Find facilities that guests commonly visit first
  const guestFacingTypes = ["restaurant", "lounge", "ballroom", "pool", "garden"] as const;
  const guestFacilities = input.utilization?.facilities.filter((f) =>
    guestFacingTypes.includes(f.facility_type as typeof guestFacingTypes[number]),
  ) ?? [];

  const impacted = guestFacilities.filter((f) => {
    const comfort = input.comfortScores[f.facility_id];
    return comfort && comfort.overall < T.COMFORT_LOW_THRESHOLD && f.utilization_pct > 30;
  });

  if (impacted.length === 0) return null;

  const severity = impacted.some((f) => {
    const c = input.comfortScores[f.facility_id];
    return c && c.overall < T.COMFORT_CRITICAL_THRESHOLD;
  })
    ? "critical"
    : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR15.id,
    `${impacted.length} espacio(s) de alto tráfico de invitados con confort degradado`,
    impacted
      .map((f) => {
        const c = input.comfortScores[f.facility_id];
        return `${f.facility_name}: confort ${c?.overall ?? "?"}/100 con ${formatPercentage(f.utilization_pct)} de ocupación`;
      })
      .join("; ") +
      ". Estos espacios son el primer contacto de invitados potenciales — impacto directo en conversión.",
    "engagement",
    severity,
    75,
  );
};

// ═══════════════════════════════════════════════════════════════
// LAYER 3: STRATEGY (FR6, FR7, FR8)
// ═══════════════════════════════════════════════════════════════

/**
 * FR6 — Revenue Decline
 * "Facility revenue declining vs baseline period."
 */
export const rule_FR6_RevenueDecline: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.revenueModels);
  if (entries.length === 0) return null;

  const declining: Array<{
    facilityId: string;
    facilityName: string;
    currentRevenue: number;
    projectedRevenue: number;
    declinePct: number;
  }> = [];

  for (const [facilityId, model] of entries) {
    const current = model.current.revenue_per_month;
    const projected = model.optimization.monte_carlo.p50;
    if (current <= 0) continue;

    const declinePct = ((current - projected) / current) * 100;
    if (declinePct > T.REVENUE_DECLINE_PCT) {
      const facility = input.facilities.find((f) => f.id === facilityId);
      declining.push({
        facilityId,
        facilityName: facility?.name ?? facilityId,
        currentRevenue: current,
        projectedRevenue: projected,
        declinePct,
      });
    }
  }

  if (declining.length === 0) return null;

  const worst = [...declining].sort((a, b) => b.declinePct - a.declinePct)[0];
  const severity = severityFromTrend(
    100,
    worst.declinePct,
    T.REVENUE_DECLINE_PCT,
    T.REVENUE_DECLINE_PCT * 2,
  );

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR6.id,
    `${declining.length} espacio(s) con declive de revenue (>${T.REVENUE_DECLINE_PCT}%)`,
    declining
      .map(
        (d) =>
          `${d.facilityName}: ${formatCurrency(d.currentRevenue)} actual → ${formatCurrency(d.projectedRevenue)} proyectado (-${formatPercentage(d.declinePct)})`,
      )
      .join("; "),
    "strategy",
    severity,
    78,
    undefined,
    "intelligence",
  );
};

/**
 * FR7 — Space Underutilization
 * "Space consistently underutilized — repurpose candidate."
 */
export const rule_FR7_SpaceUnderutilized: FacilitiesRuleFn = (input) => {
  if (!input.optimization) return null;

  if (input.optimization.underutilized_count === 0) return null;

  const positiveSuggestions = input.optimization.suggestions.filter(
    (s) => s.estimated_impact.includes("+"),
  );

  if (positiveSuggestions.length === 0) return null;

  const severity: "warning" | "info" =
    input.optimization.underutilized_count >= 3 ? "warning" : "info";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR7.id,
    `${input.optimization.underutilized_count} espacio(s) subutilizado(s) por 30+ días`,
    positiveSuggestions
      .slice(0, 3)
      .map((s) => `${s.facility_name}: ${s.suggested_use} (impacto: ${s.estimated_impact})`)
      .join("; ") +
      ". Ahorro potencial: " +
      formatCurrency(input.optimization.total_potential_savings),
    "strategy",
    severity,
    70,
    undefined,
    "intelligence",
  );
};

/**
 * FR8 — Personality Mismatch
 * "Facility actual use diverges from designed purpose."
 */
export const rule_FR8_PersonalityMismatch: FacilitiesRuleFn = (input) => {
  // This rule requires intelligence from spatialGraph engine
  // For now, use reservation purpose analysis as proxy
  if (!input.utilization || input.reservations.length === 0) return null;

  const mismatches: Array<{
    facilityName: string;
    designed: string;
    actual: string;
    gap: number;
  }> = [];

  for (const facility of input.facilities) {
    const facilityRes = input.reservations.filter(
      (r) => r.facility_id === facility.id && r.status === "completed",
    );
    if (facilityRes.length < 3) continue;

    // Count purposes
    const purposeCounts = new Map<string, number>();
    for (const r of facilityRes) {
      purposeCounts.set(r.purpose, (purposeCounts.get(r.purpose) ?? 0) + 1);
    }

    const topPurpose = [...purposeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!topPurpose) continue;

    const purposeShare = topPurpose[1] / facilityRes.length;
    const designedPurpose = facility.description?.split(" ")[0]?.toLowerCase() ?? "";
    const actualPurpose = topPurpose[0].toLowerCase();

    // Mismatch: dominant purpose doesn't match description keywords
    const isMismatch =
      purposeShare > 0.6 &&
      designedPurpose.length > 3 &&
      !actualPurpose.includes(designedPurpose) &&
      !designedPurpose.includes(actualPurpose.slice(0, 5));

    if (isMismatch) {
      mismatches.push({
        facilityName: facility.name,
        designed: facility.description?.slice(0, 50) ?? "N/A",
        actual: `${topPurpose[0]} (${formatPercentage(purposeShare * 100)} de uso)`,
        gap: Math.round(purposeShare * 100),
      });
    }
  }

  if (mismatches.length === 0) return null;

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR8.id,
    `${mismatches.length} espacio(s) con desalineación diseño vs uso real`,
    mismatches
      .map(
        (m) =>
          `${m.facilityName}: diseñado para "${m.designed}" pero uso dominante es "${m.actual}"`,
      )
      .join("; ") +
      ". Considerar reposicionamiento alineado con el uso real.",
    "strategy",
    "opportunity",
    65,
    undefined,
    "intelligence",
  );
};

// ═══════════════════════════════════════════════════════════════
// LAYER 4: PREDICTION (FR9, FR10, FR11)
// ═══════════════════════════════════════════════════════════════

/**
 * FR9 — Cross-Domain Impact
 * "Facility state impacts other domains."
 */
export const rule_FR9_CrossDomain: FacilitiesRuleFn = (input) => {
  // Check analytics cross-domain signals
  if (!input.analytics || input.analytics.cross_domain_signals.length === 0) {
    // Fallback: check event ripples with high severity
    const severeRipples = input.eventRipples.filter(
      (r) => r.cascade_severity > 50,
    );
    if (severeRipples.length === 0) return null;

    const worst = [...severeRipples].sort(
      (a, b) => b.cascade_severity - a.cascade_severity,
    )[0];

    return buildInsight(
      FACILITIES_ADVISOR_RULES.FR9.id,
      `${severeRipples.length} evento(s) con cascada cross-domain severa`,
      `Evento "${worst.source_event.event_name}" afectó ${worst.total_affected_facilities} espacio(s) durante ${worst.total_duration_hours}h. Severidad: ${worst.cascade_severity}/100.`,
      "prediction",
      "warning",
      72,
      undefined,
      "intelligence",
    );
  }

  // Use analytics cross-domain signals
  const negativeSignals = input.analytics.cross_domain_signals.filter(
    (s) => s.severity === "negative" || s.severity === "high",
  );
  if (negativeSignals.length === 0) return null;

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR9.id,
    `${negativeSignals.length} señal(es) cross-domain negativa(s)`,
    negativeSignals
      .map((s) => `[${s.domain}] ${s.signal} — impacto: ${s.impact}`)
      .join("; "),
    "prediction",
    "warning",
    75,
    undefined,
    "intelligence",
  );
};

/**
 * FR10 — Failure Prediction
 * "Component failure predicted within warning window."
 */
export const rule_FR10_FailurePrediction: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.deteriorationModels);
  if (entries.length === 0) return null;

  const imminent: Array<{
    facilityName: string;
    component: string;
    daysToFailure: number;
    confidence: number;
  }> = [];

  for (const [facilityId, model] of entries) {
    const facility = input.facilities.find((f) => f.id === facilityId);
    for (const comp of model.components) {
      if (comp.days_to_failure <= T.FAILURE_DAYS_WARNING) {
        imminent.push({
          facilityName: facility?.name ?? facilityId,
          component: comp.name,
          daysToFailure: comp.days_to_failure,
          confidence: 75,
        });
      }
    }
  }

  if (imminent.length === 0) return null;

  const worst = [...imminent].sort(
    (a, b) => a.daysToFailure - b.daysToFailure,
  )[0];
  const severity =
    worst.daysToFailure <= 14 ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR10.id,
    `${imminent.length} falla(s) predicha(s) en los próximos ${T.FAILURE_DAYS_WARNING} días`,
    imminent
      .slice(0, 3)
      .map(
        (i) =>
          `${i.facilityName} — ${i.component}: fallo en ${formatDaysToFailure(i.daysToFailure)}`,
      )
      .join("; "),
    "prediction",
    severity,
    80,
    makeTrigger("maint-schedule", {
      facility_id: input.facilities.find(
        (f) => f.name === worst.facilityName,
      )?.id ?? "",
      facility_name: worst.facilityName,
      maintenance_type: "corrective",
      priority: worst.daysToFailure <= 14 ? "critical" : "high",
      description: `Falla predicha: ${worst.component} en ${formatDaysToFailure(worst.daysToFailure)}`,
      scheduled_date: new Date().toISOString().split("T")[0],
    }),
  );
};

/**
 * FR11 — Budget Trajectory
 * "Maintenance budget trajectory exceeds planned allocation."
 */
export const rule_FR11_BudgetTrajectory: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.deteriorationModels);
  if (entries.length === 0) return null;

  let totalNeeded = 0;
  let totalAvailable = 0;

  for (const [, model] of entries) {
    totalNeeded += model.maintenance_budget_needed;
    totalAvailable += model.maintenance_budget_available;
  }

  if (totalNeeded <= 0) return null;

  const overrunPct = ((totalNeeded - totalAvailable) / totalNeeded) * 100;

  if (overrunPct <= T.BUDGET_OVERRUN_PCT) return null;

  const severity =
    overrunPct > T.BUDGET_OVERRUN_PCT * 2 ? "critical" : "warning";

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR11.id,
    `Presupuesto de mantenimiento insuficiente: ${formatPercentage(overrunPct)} de déficit`,
    `Necesario: ${formatCurrency(totalNeeded)}. Disponible: ${formatCurrency(totalAvailable)}. Déficit: ${formatCurrency(totalNeeded - totalAvailable)}. Proyectando ${T.BUDGET_TRAJECTORY_MONTHS} meses, el gap se amplía.`,
    "prediction",
    severity,
    82,
  );
};

// ═══════════════════════════════════════════════════════════════
// LAYER 5: INNOVATION (FR12, FR13)
// ═══════════════════════════════════════════════════════════════

/**
 * FR12 — Hidden Revenue Opportunity
 * "System-detected revenue opportunity not being captured."
 */
export const rule_FR12_HiddenRevenue: FacilitiesRuleFn = (input) => {
  const entries = Object.entries(input.revenueModels);
  if (entries.length === 0) return null;

  const opportunities: Array<{
    facilityName: string;
    currentRevenue: number;
    potentialRevenue: number;
    scenario: string;
  }> = [];

  for (const [facilityId, model] of entries) {
    const facility = input.facilities.find((f) => f.id === facilityId);
    const current = model.current.revenue_per_month;
    const bestScenario = model.optimization.scenarios.reduce(
      (best, s) =>
        s.revenue_delta > best.revenue_delta &&
        s.confidence >= 60
          ? s
          : best,
      model.optimization.scenarios[0],
    );

    if (bestScenario && bestScenario.revenue_delta > current * 0.1) {
      opportunities.push({
        facilityName: facility?.name ?? facilityId,
        currentRevenue: current,
        potentialRevenue: current + bestScenario.revenue_delta,
        scenario: bestScenario.name,
      });
    }
  }

  if (opportunities.length === 0) return null;

  const totalPotential = opportunities.reduce(
    (s, o) => s + (o.potentialRevenue - o.currentRevenue),
    0,
  );

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR12.id,
    `${opportunities.length} oportunidad(es) de revenue oculto detectada(s)`,
    opportunities
      .map(
        (o) =>
          `${o.facilityName}: ${formatCurrency(o.currentRevenue)} → ${formatCurrency(o.potentialRevenue)} vía "${o.scenario}"`,
      )
      .join("; ") +
      `. Revenue adicional potencial: ${formatCurrency(totalPotential)}/mes.`,
    "innovation",
    "opportunity",
    68,
    undefined,
    "intelligence",
  );
};

/**
 * FR13 — Spatial Optimization
 * "Spatial graph analysis reveals layout or flow optimization."
 */
export const rule_FR13_SpatialOptimization: FacilitiesRuleFn = (input) => {
  // Check what-if scenarios generated by the system
  const autoScenarios = input.whatIfScenarios.filter((s) => s.auto_generated);
  if (autoScenarios.length === 0) return null;

  // Only show high-confidence scenarios with positive mitigation
  const viable = autoScenarios.filter(
    (s) => s.mitigation.expected_recovery_pct > 50,
  );
  if (viable.length === 0) return null;

  const best = viable[0];

  return buildInsight(
    FACILITIES_ADVISOR_RULES.FR13.id,
    `${viable.length} optimización(es) espacial(es) detectada(s) por el sistema`,
    viable
      .slice(0, 3)
      .map(
        (s) =>
          `${s.action.description} — recuperación esperada: ${s.mitigation.expected_recovery_pct}%`,
      )
      .join("; ") +
      `. Mejor escenario: "${best.action.description}" con Monte Carlo P50 = ${formatCurrency(best.monte_carlo.p50)}.`,
    "innovation",
    "opportunity",
    65,
    undefined,
    "intelligence",
  );
};

// ═══════════════════════════════════════════════════════════════
// RULE REGISTRY — All 15 rules in execution order
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_ADVISOR_RULES_EXEC: FacilitiesRuleFn[] = [
  // Layer 1: Health (5 rules)
  rule_FR1_LowOccupancy,
  rule_FR2_Overcrowding,
  rule_FR3_ComfortDegradation,
  rule_FR4_Deterioration,
  rule_FR14_ComfortCascade,

  // Layer 2: Engagement (2 rules)
  rule_FR5_MaintenanceOverdue,
  rule_FR15_GuestImpact,

  // Layer 3: Strategy (3 rules)
  rule_FR6_RevenueDecline,
  rule_FR7_SpaceUnderutilized,
  rule_FR8_PersonalityMismatch,

  // Layer 4: Prediction (3 rules)
  rule_FR9_CrossDomain,
  rule_FR10_FailurePrediction,
  rule_FR11_BudgetTrajectory,

  // Layer 5: Innovation (2 rules)
  rule_FR12_HiddenRevenue,
  rule_FR13_SpatialOptimization,
];

/**
 * Run all advisor rules against the current input.
 * Returns sorted insights (critical first, then by confidence).
 */
export function evaluateAllRules(
  input: FacilitiesAdvisorInput,
): FacilitiesAdvisorInsight[] {
  const rawInsights = FACILITIES_ADVISOR_RULES_EXEC.map((rule) =>
    rule(input),
  ).filter((i): i is FacilitiesAdvisorInsight => i !== null);

  // Sort: critical first, then by confidence descending
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    opportunity: 3,
  };

  return rawInsights.sort((a, b) => {
    const sevDiff =
      (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
    if (sevDiff !== 0) return sevDiff;
    return b.confidence - a.confidence;
  });
}