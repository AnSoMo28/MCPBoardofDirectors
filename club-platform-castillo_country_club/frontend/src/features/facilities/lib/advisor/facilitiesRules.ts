// src/features/facilities/lib/advisor/facilitiesRules.ts
// ═══════════════════════════════════════════════════════════════
// FACILITIES ADVISOR — 18 Rules × 5 Layers (Advisor Engine v2)
//
// Adapted from the original 15 rules (rules.ts) to the generic
// Advisor Engine pattern. Plus 3 new cross-domain rules.
//
// FR1-FR4, FR14   → health       (component health + comfort)
// FR5, FR15, FR16 → engagement   (maintenance + guest + cross-domain response)
// FR6-FR8         → strategy     (revenue + utilization + personality)
// FR9-FR11, FR17  → prediction   (failure + budget + cross-domain + cascade)
// FR12-FR13, FR18 → innovation   (hidden revenue + spatial + what-if)
//
// Pattern: identical to Financial (financial.ts §4).
//   - RuleDefinition<FacilitiesContext> — declarative, testable
//   - Pure functions: ctx in → AdvisorInsightBase | null out
//   - All thresholds from config.ts (0 magic numbers)
//   - Signals emitted/consumed for cross-domain orchestration
//   - dataDependencies for streaming evaluation (F49)
//
// Created: Phase 32 — Facilities Advisor Integration
// ═══════════════════════════════════════════════════════════════

import type {
  AIDomain,
  AdvisorImpactLevel,
  AdvisorLayer,
} from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";

import type {
  RuleDefinition
} from "@/shared/lib/advisor-engine";
import { buildInsight } from "@/shared/lib/advisor-engine";

import type { FacilitiesContext } from "./facilitiesContext";
import type {
  FacilitiesAdvisorSeverity,
} from "../../types";

import {
  FACILITIES_ADVISOR_THRESHOLDS as T,
} from "../../config";

import {
  makeTrigger,
  formatPercentage,
  formatCurrency,
  formatDaysToFailure,
} from "./helpers";

import {
  FAC_COMPONENT_FAILURE,
  FAC_COMFORT_CASCADE,
  FAC_REVENUE_DECLINE,
  FAC_OCCUPANCY_CRITICAL,
  FAC_CROSS_DOMAIN_IMPACT,
} from "./facilitiesAdvisorConfig";

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Map Facilities severity to AdvisorInsightBase impact. */
function toImpact(severity: FacilitiesAdvisorSeverity): AdvisorImpactLevel {
  switch (severity) {
    case "critical": return "high";
    case "warning": return "medium";
    case "info": return "low";
    case "opportunity": return "low";
  }
}

// ═══════════════════════════════════════════════════════════════
// LAYER 1: HEALTH (FR1, FR2, FR3, FR4, FR14)
// ═══════════════════════════════════════════════════════════════

const FR1_LOW_OCCUPANCY: RuleDefinition<FacilitiesContext> = {
  id: "FR1",
  name: "Low Occupancy Alert",
  layer: "health",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["utilization"],
  evaluate: (ctx) => {
    if (!ctx.utilization) return null;

    const critical = ctx.utilization.facilities.filter(
      (f) => f.utilization_pct < T.OCCUPANCY_LOW_THRESHOLD && f.status === "operational",
    );
    if (critical.length === 0) return null;

    const worst = [...critical].sort((a, b) => a.utilization_pct - b.utilization_pct)[0];
    const severity: FacilitiesAdvisorSeverity =
      worst.utilization_pct < T.OCCUPANCY_LOW_THRESHOLD * 0.5 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR1"),
        impact: toImpact(severity),
        title: `${critical.length} espacio(s) con utilización crítica (<${T.OCCUPANCY_LOW_THRESHOLD}%)`,
        reasoning: critical
          .map((f) => `${f.facility_name}: ${formatPercentage(f.utilization_pct)}`)
          .join(", "),
        confidence: 88,
        target_view: "intelligence",
        action: makeTrigger("facility-update", {
          facility_id: worst.facility_id,
          new_status: "maintenance",
        }),
      }),
      layer: "health" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR2_OVERCROWDING: RuleDefinition<FacilitiesContext> = {
  id: "FR2",
  name: "Overcrowding Alert",
  layer: "health",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_OCCUPANCY_CRITICAL],
  dataDependencies: ["utilization"],
  evaluate: (ctx) => {
    if (!ctx.utilization) return null;

    const overcrowded = ctx.utilization.facilities.filter(
      (f) => f.utilization_pct >= T.OCCUPANCY_HIGH_THRESHOLD && f.status === "operational",
    );
    if (overcrowded.length === 0) return null;

    const worst = [...overcrowded].sort((a, b) => b.utilization_pct - a.utilization_pct)[0];
    const severity: FacilitiesAdvisorSeverity =
      worst.utilization_pct >= T.OCCUPANCY_CRITICAL_THRESHOLD ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR2"),
        impact: toImpact(severity),
        title: `${overcrowded.length} espacio(s) con sobrecarga (>${T.OCCUPANCY_HIGH_THRESHOLD}%)`,
        reasoning: overcrowded
          .map((f) => `${f.facility_name}: ${formatPercentage(f.utilization_pct)} — redistribuir`)
          .join("; "),
        confidence: 85,
        target_view: "intelligence",
      }),
      layer: "health" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR3_COMFORT_DEGRADATION: RuleDefinition<FacilitiesContext> = {
  id: "FR3",
  name: "Comfort Degradation",
  layer: "health",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_COMFORT_CASCADE],
  dataDependencies: ["comfortScores"],
  evaluate: (ctx) => {
    const entries = Object.entries(ctx.comfortScores);
    if (entries.length === 0) return null;

    const degraded = entries.filter(
      ([, score]) => score.overall < T.COMFORT_LOW_THRESHOLD && score.intervention_needed,
    );
    if (degraded.length === 0) return null;

    const worst = degraded.sort((a, b) => a[1].overall - b[1].overall)[0];
    const [, worstScore] = worst;
    const severity: FacilitiesAdvisorSeverity =
      worstScore.overall < T.COMFORT_CRITICAL_THRESHOLD ? "critical" : "warning";

    // Find worst dimension
    const dimEntries = Object.entries(worstScore.dimensions) as Array<
      [string, { value: number; status: string; recommendation?: string }]
    >;
    const worstDim = dimEntries.sort((a, b) => a[1].value - b[1].value)[0];

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR3"),
        impact: toImpact(severity),
        title: `Confort degradado en ${degraded.length} espacio(s) (<${T.COMFORT_LOW_THRESHOLD}/100)`,
        reasoning: `${worst[0]}: ${worstScore.overall}/100 (${worstScore.intervention_urgency}). Causa primaria: ${worstDim[0]} = ${worstDim[1].value}/100. ${worstDim[1].recommendation ?? ""}`,
        confidence: 82,
        target_view: "intelligence",
      }),
      layer: "health" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR4_DETERIORATION: RuleDefinition<FacilitiesContext> = {
  id: "FR4",
  name: "Component Deterioration",
  layer: "health",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_COMPONENT_FAILURE],
  dataDependencies: ["deteriorationModels", "health"],
  evaluate: (ctx) => {
    const entries = Object.entries(ctx.deteriorationModels);
    if (entries.length === 0) return null;

    const alerts: Array<{
      facilityId: string;
      facilityName: string;
      component: string;
      health: number;
      daysToFailure: number;
    }> = [];

    for (const [facilityId, model] of entries) {
      const facility = ctx.facilities.find((f) => f.id === facilityId);
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
    const severity: FacilitiesAdvisorSeverity =
      worst.health < T.HEALTH_CRITICAL_THRESHOLD ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR4"),
        impact: toImpact(severity),
        title: `${alerts.length} componente(s) con salud crítica`,
        reasoning: alerts
          .slice(0, 3)
          .map(
            (a) =>
              `${a.facilityName} — ${a.component}: ${a.health}%, fallo en ${formatDaysToFailure(a.daysToFailure)}`,
          )
          .join("; "),
        confidence: 90,
        target_view: "intelligence",
        action: makeTrigger("maint-schedule", {
          facility_id: worst.facilityId,
          facility_name: worst.facilityName,
          maintenance_type: "corrective",
          priority: "high",
          description: `${worst.component}: salud ${worst.health}%`,
          scheduled_date: new Date().toISOString().split("T")[0],
        }),
      }),
      layer: "health" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR14_COMFORT_CASCADE: RuleDefinition<FacilitiesContext> = {
  id: "FR14",
  name: "Comfort Cascade Risk",
  layer: "health",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_COMFORT_CASCADE],
  dataDependencies: ["comfortScores"],
  evaluate: (ctx) => {
    if (ctx.lowComfortFacilityCount < T.COMFORT_CASCADE_THRESHOLD) return null;

    const severity: FacilitiesAdvisorSeverity =
      ctx.lowComfortFacilityCount >= T.COMFORT_CASCADE_THRESHOLD + 1 ? "critical" : "warning";

    const degradedIds = Object.entries(ctx.comfortScores)
      .filter(([, s]) => s.overall < T.COMFORT_LOW_THRESHOLD)
      .map(([id]) => id);

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR14"),
        impact: toImpact(severity),
        title: `Cascada de confort: ${ctx.lowComfortFacilityCount} espacio(s) por debajo de ${T.COMFORT_LOW_THRESHOLD}/100`,
        reasoning: `Posible causa sistémica: ${degradedIds.join(", ")}. Verificar HVAC central, ventilación y capacidad operativa.`,
        confidence: 78,
        target_view: "intelligence",
        action: makeTrigger("issue-report", {
          facility_id: degradedIds[0],
          description: `Cascada de confort detectada en ${ctx.lowComfortFacilityCount} espacios — posible fallo de HVAC o ventilación central`,
          priority: "high",
        }),
      }),
      layer: "health" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// LAYER 2: ENGAGEMENT (FR5, FR15, FR16)
// ═══════════════════════════════════════════════════════════════

const FR5_MAINTENANCE_OVERDUE: RuleDefinition<FacilitiesContext> = {
  id: "FR5",
  name: "Maintenance Overdue",
  layer: "engagement",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["maintenance"],
  evaluate: (ctx) => {
    if (ctx.overdueMaintenanceCount === 0) return null;

    const today = new Date().toISOString().split("T")[0];
    const overdue = ctx.maintenance.filter(
      (m) => m.status === "scheduled" && m.scheduled_date < today,
    );

    const daysOverdueMax = overdue.reduce((max, m) => {
      const days = Math.floor(
        (new Date(today).getTime() - new Date(m.scheduled_date).getTime()) / 86_400_000,
      );
      return Math.max(max, days);
    }, 0);

    const severity: FacilitiesAdvisorSeverity =
      daysOverdueMax >= T.MAINTENANCE_OVERDUE_DAYS * 2 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR5"),
        impact: toImpact(severity),
        title: `${overdue.length} mantenimiento(s) atrasado(s) — máximo ${daysOverdueMax} días`,
        reasoning: overdue
          .slice(0, 3)
          .map(
            (m) =>
              `${m.facility_name}: ${m.description} (${m.scheduled_date}) — ${formatCurrency(m.cost)}`,
          )
          .join("; "),
        confidence: 95,
        target_view: "intelligence",
        action: makeTrigger("maint-schedule", {
          facility_id: overdue[0].facility_id,
          facility_name: overdue[0].facility_name,
          maintenance_type: overdue[0].maintenance_type,
          priority: overdue[0].priority,
          description: overdue[0].description,
          scheduled_date: today,
        }),
      }),
      layer: "engagement" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR15_GUEST_IMPACT: RuleDefinition<FacilitiesContext> = {
  id: "FR15",
  name: "Guest Journey Impact",
  layer: "engagement",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["comfortScores", "utilization"],
  evaluate: (ctx) => {
    if (ctx.guestFacingWithLowComfort === 0) return null;

    const severity: FacilitiesAdvisorSeverity =
      ctx.guestFacingWithLowComfort >= 3 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR15"),
        impact: toImpact(severity),
        title: `${ctx.guestFacingWithLowComfort} espacio(s) de alto tráfico de invitados con confort degradado`,
        reasoning:
          "Estos espacios son el primer contacto de invitados potenciales — impacto directo en conversión de nuevos socios.",
        confidence: 75,
        target_view: "intelligence",
      }),
      layer: "engagement" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

/** FR16 — NEW: React to financial revenue decline signal.
 *  When Finance detects revenue decline, Facilities adjusts pricing strategy. */
const FR16_FINANCIAL_SIGNAL_RESPONSE: RuleDefinition<FacilitiesContext> = {
  id: "FR16",
  name: "Financial Revenue Signal Response",
  layer: "engagement",
  domain: "facilities",
  priority: 150,
  consumeSignals: ["fin_revenue_decline"],
  dataDependencies: ["revenueModels"],
  evaluate: (ctx) => {
    const revenueSignal = ctx.signals?.find(
      (s) => s.signalDefId === "fin_revenue_decline",
    );
    if (!revenueSignal) return null;

    // Check if Facilities can help: facilities with high elasticity
    const adjustable = Object.entries(ctx.revenueModels).filter(
      ([, m]) => Math.abs(m.demand_elasticity) < 0.5,
    );
    if (adjustable.length === 0) return null;

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR16"),
        impact: "medium",
        title: "Respuesta a señal financiera: ajustar pricing de espacios",
        reasoning: `Declive de revenue detectado en módulo financiero. ${adjustable.length} espacio(s) con baja elasticidad de demanda pueden ajustar precios sin perder volumen.`,
        confidence: 70,
        target_view: "intelligence",
        action: {
          action: "execute",
          type: "mutate",
          server: "facility_management",
          tool: "get_space_optimization",
          params: { focus: "pricing" },
          approval_level: "semi",
          label: "Analizar optimización de precios",
          confirm_message: "Se generará un análisis de optimización de precios para espacios con baja elasticidad.",
          estimated_impact: "Identificar oportunidades de pricing sin perder demanda",
        },
      }),
      layer: "engagement" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// LAYER 3: STRATEGY (FR6, FR7, FR8)
// ═══════════════════════════════════════════════════════════════

const FR6_REVENUE_DECLINE: RuleDefinition<FacilitiesContext> = {
  id: "FR6",
  name: "Revenue Decline",
  layer: "strategy",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_REVENUE_DECLINE],
  dataDependencies: ["revenueModels"],
  evaluate: (ctx) => {
    if (ctx.decliningRevenueCount === 0) return null;

    const declining: Array<{
      name: string;
      current: number;
      projected: number;
      declinePct: number;
    }> = [];

    for (const [facilityId, model] of Object.entries(ctx.revenueModels)) {
      const current = model.current.revenue_per_month;
      const projected = model.optimization.monte_carlo.p50;
      if (current <= 0) continue;
      const declinePct = ((current - projected) / current) * 100;
      if (declinePct > T.REVENUE_DECLINE_PCT) {
        const fac = ctx.facilities.find((f) => f.id === facilityId);
        declining.push({
          name: fac?.name ?? facilityId,
          current,
          projected,
          declinePct,
        });
      }
    }

    if (declining.length === 0) return null;

    const worst = [...declining].sort((a, b) => b.declinePct - a.declinePct)[0];
    const severity: FacilitiesAdvisorSeverity =
      worst.declinePct > T.REVENUE_DECLINE_PCT * 2 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR6"),
        impact: toImpact(severity),
        title: `${declining.length} espacio(s) con declive de revenue (>${T.REVENUE_DECLINE_PCT}%)`,
        reasoning: declining
          .map(
            (d) =>
              `${d.name}: ${formatCurrency(d.current)} actual → ${formatCurrency(d.projected)} proyectado (-${formatPercentage(d.declinePct)})`,
          )
          .join("; "),
        confidence: 78,
        target_view: "intelligence",
      }),
      layer: "strategy" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR7_SPACE_UNDERUTILIZED: RuleDefinition<FacilitiesContext> = {
  id: "FR7",
  name: "Space Underutilization",
  layer: "strategy",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["optimization"],
  evaluate: (ctx) => {
    if (!ctx.optimization || ctx.optimization.underutilized_count === 0) return null;

    const positiveSuggestions = ctx.optimization.suggestions.filter(
      (s) => s.estimated_impact.includes("+"),
    );
    if (positiveSuggestions.length === 0) return null;

    const severity: FacilitiesAdvisorSeverity =
      ctx.optimization.underutilized_count >= 3 ? "warning" : "info";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR7"),
        impact: toImpact(severity),
        title: `${ctx.optimization.underutilized_count} espacio(s) subutilizado(s) por 30+ días`,
        reasoning:
          positiveSuggestions
            .slice(0, 3)
            .map((s) => `${s.facility_name}: ${s.suggested_use} (impacto: ${s.estimated_impact})`)
            .join("; ") +
          `. Ahorro potencial: ${formatCurrency(ctx.optimization.total_potential_savings)}.`,
        confidence: 70,
        target_view: "intelligence",
      }),
      layer: "strategy" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR8_PERSONALITY_MISMATCH: RuleDefinition<FacilitiesContext> = {
  id: "FR8",
  name: "Personality Mismatch",
  layer: "strategy",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["utilization", "reservations"],
  evaluate: (ctx) => {
    if (!ctx.utilization || ctx.reservations.length === 0) return null;

    const mismatches: Array<{
      facilityName: string;
      designed: string;
      actual: string;
      gap: number;
    }> = [];

    for (const facility of ctx.facilities) {
      const facilityRes = ctx.reservations.filter(
        (r) => r.facility_id === facility.id && r.status === "completed",
      );
      if (facilityRes.length < 3) continue;

      const purposeCounts: Record<string, number> = {};
      for (const r of facilityRes) {
        purposeCounts[r.purpose] = (purposeCounts[r.purpose] ?? 0) + 1;
      }

      const topPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0];
      if (!topPurpose) continue;

      const purposeShare = topPurpose[1] / facilityRes.length;
      const designedPurpose = facility.description?.split(" ")[0]?.toLowerCase() ?? "";
      const actualPurpose = topPurpose[0].toLowerCase();

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

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR8"),
        impact: "low",
        title: `${mismatches.length} espacio(s) con desalineación diseño vs uso real`,
        reasoning:
          mismatches
            .map(
              (m) =>
                `${m.facilityName}: diseñado para "${m.designed}" pero uso dominante es "${m.actual}"`,
            )
            .join("; ") + ". Considerar reposicionamiento alineado con el uso real.",
        confidence: 65,
        target_view: "intelligence",
      }),
      layer: "strategy" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// LAYER 4: PREDICTION (FR9, FR10, FR11, FR17)
// ═══════════════════════════════════════════════════════════════

const FR9_CROSS_DOMAIN: RuleDefinition<FacilitiesContext> = {
  id: "FR9",
  name: "Cross-Domain Impact",
  layer: "prediction",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_CROSS_DOMAIN_IMPACT],
  dataDependencies: ["analytics", "eventRipples"],
  evaluate: (ctx) => {
    // Check analytics cross-domain signals
    const negativeSignals = (ctx.analytics?.cross_domain_signals ?? []).filter(
      (s) => s.severity === "negative" || s.severity === "high",
    );

    // Fallback: check event ripples with high severity
    if (negativeSignals.length === 0 && ctx.severeRippleCount === 0) return null;

    if (negativeSignals.length > 0) {
      return {
        ...buildInsight({
          id: generateInsightId("facilities", "FR9"),
          impact: "medium",
          title: `${negativeSignals.length} señal(es) cross-domain negativa(s)`,
          reasoning: negativeSignals
            .map((s) => `[${s.domain}] ${s.signal} — impacto: ${s.impact}`)
            .join("; "),
          confidence: 75,
          target_view: "intelligence",
        }),
        layer: "prediction" as AdvisorLayer,
        domain: "facilities" as AIDomain,
      };
    }

    // Severe ripples
    const worst = [...ctx.eventRipples]
      .filter((r) => r.cascade_severity > 50)
      .sort((a, b) => b.cascade_severity - a.cascade_severity)[0];

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR9"),
        impact: "medium",
        title: `${ctx.severeRippleCount} evento(s) con cascada cross-domain severa`,
        reasoning: `Evento "${worst.source_event.event_name}" afectó ${worst.total_affected_facilities} espacio(s) durante ${worst.total_duration_hours}h. Severidad: ${worst.cascade_severity}/100.`,
        confidence: 72,
        target_view: "intelligence",
      }),
      layer: "prediction" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR10_FAILURE_PREDICTION: RuleDefinition<FacilitiesContext> = {
  id: "FR10",
  name: "Failure Prediction",
  layer: "prediction",
  domain: "facilities",
  priority: 100,
  emitSignals: [FAC_COMPONENT_FAILURE],
  dataDependencies: ["deteriorationModels"],
  evaluate: (ctx) => {
    if (ctx.nearestFailureDays < 0 || ctx.nearestFailureDays > T.FAILURE_DAYS_WARNING) {
      return null;
    }

    const severity: FacilitiesAdvisorSeverity =
      ctx.nearestFailureDays <= 14 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR10"),
        impact: toImpact(severity),
        title: `Falla predicha en ${formatDaysToFailure(ctx.nearestFailureDays)}`,
        reasoning: `${ctx.nearestFailureFacility} — ${ctx.nearestFailureComponent}: fallo en ${formatDaysToFailure(ctx.nearestFailureDays)}. Componentes críticos: ${ctx.criticalComponentCount}.`,
        confidence: 80,
        target_view: "intelligence",
        action: makeTrigger("maint-schedule", {
          facility_id: ctx.facilities.find(
            (f) => f.name === ctx.nearestFailureFacility,
          )?.id ?? "",
          facility_name: ctx.nearestFailureFacility,
          maintenance_type: "corrective",
          priority: ctx.nearestFailureDays <= 14 ? "critical" : "high",
          description: `Falla predicha: ${ctx.nearestFailureComponent} en ${formatDaysToFailure(ctx.nearestFailureDays)}`,
          scheduled_date: new Date().toISOString().split("T")[0],
        }),
      }),
      layer: "prediction" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR11_BUDGET_TRAJECTORY: RuleDefinition<FacilitiesContext> = {
  id: "FR11",
  name: "Budget Trajectory",
  layer: "prediction",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["deteriorationModels"],
  evaluate: (ctx) => {
    let totalNeeded = 0;
    let totalAvailable = 0;

    for (const model of Object.values(ctx.deteriorationModels)) {
      totalNeeded += model.maintenance_budget_needed;
      totalAvailable += model.maintenance_budget_available;
    }

    if (totalNeeded <= 0) return null;

    const overrunPct = ((totalNeeded - totalAvailable) / totalNeeded) * 100;
    if (overrunPct <= T.BUDGET_OVERRUN_PCT) return null;

    const severity: FacilitiesAdvisorSeverity =
      overrunPct > T.BUDGET_OVERRUN_PCT * 2 ? "critical" : "warning";

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR11"),
        impact: toImpact(severity),
        title: `Presupuesto de mantenimiento insuficiente: ${formatPercentage(overrunPct)} de déficit`,
        reasoning: `Necesario: ${formatCurrency(totalNeeded)}. Disponible: ${formatCurrency(totalAvailable)}. Déficit: ${formatCurrency(totalNeeded - totalAvailable)}. Proyectando ${T.BUDGET_TRAJECTORY_MONTHS} meses, el gap se amplía.`,
        confidence: 82,
        target_view: "intelligence",
      }),
      layer: "prediction" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

/** FR17 — NEW: Cascade risk detection.
 *  When multiple signals fire simultaneously, detect cascade pattern. */
const FR17_CASCADE_RISK: RuleDefinition<FacilitiesContext> = {
  id: "FR17",
  name: "Multi-Signal Cascade Risk",
  layer: "prediction",
  domain: "facilities",
  priority: 200,
  evaluate: (ctx) => {
    // Count simultaneous conditions
    let riskFactors = 0;
    if (ctx.criticalComponentCount > 0) riskFactors++;
    if (ctx.overdueMaintenanceCount > 0) riskFactors++;
    if (ctx.lowComfortFacilityCount > 1) riskFactors++;
    if (ctx.decliningRevenueCount > 0) riskFactors++;
    if (ctx.severeRippleCount > 0) riskFactors++;

    if (riskFactors < 3) return null;

    const activeFactors: string[] = [];
    if (ctx.criticalComponentCount > 0)
      activeFactors.push(`${ctx.criticalComponentCount} componente(s) crítico(s)`);
    if (ctx.overdueMaintenanceCount > 0)
      activeFactors.push(`${ctx.overdueMaintenanceCount} mantenimiento(s) atrasado(s)`);
    if (ctx.lowComfortFacilityCount > 1)
      activeFactors.push(`${ctx.lowComfortFacilityCount} espacio(s) con confort bajo`);
    if (ctx.decliningRevenueCount > 0)
      activeFactors.push(`${ctx.decliningRevenueCount} espacio(s) con revenue en declive`);
    if (ctx.severeRippleCount > 0)
      activeFactors.push(`${ctx.severeRippleCount} ripple(s) severo(s)`);

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR17"),
        impact: "high",
        title: `Riesgo en cascada: ${riskFactors} factores de riesgo simultáneos`,
        reasoning: `Factores activos: ${activeFactors.join("; ")}. Cuando múltiples factores de estrés coinciden, el riesgo de cascada aumenta exponencialmente. Priorizar intervención en el factor de mayor impacto.`,
        confidence: 85,
        target_view: "intelligence",
      }),
      layer: "prediction" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// LAYER 5: INNOVATION (FR12, FR13, FR18)
// ═══════════════════════════════════════════════════════════════

const FR12_HIDDEN_REVENUE: RuleDefinition<FacilitiesContext> = {
  id: "FR12",
  name: "Hidden Revenue Opportunity",
  layer: "innovation",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["revenueModels"],
  evaluate: (ctx) => {
    const opportunities: Array<{
      name: string;
      current: number;
      potential: number;
      scenario: string;
    }> = [];

    for (const [facilityId, model] of Object.entries(ctx.revenueModels)) {
      const current = model.current.revenue_per_month;
      const bestScenario = model.optimization.scenarios.reduce(
        (best, s) =>
          s.revenue_delta > best.revenue_delta && s.confidence >= 60 ? s : best,
        model.optimization.scenarios[0],
      );

      if (bestScenario && bestScenario.revenue_delta > current * 0.1) {
        const fac = ctx.facilities.find((f) => f.id === facilityId);
        opportunities.push({
          name: fac?.name ?? facilityId,
          current,
          potential: current + bestScenario.revenue_delta,
          scenario: bestScenario.name,
        });
      }
    }

    if (opportunities.length === 0) return null;

    const totalPotential = opportunities.reduce(
      (s, o) => s + (o.potential - o.current),
      0,
    );

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR12"),
        impact: "low",
        title: `${opportunities.length} oportunidad(es) de revenue oculto detectada(s)`,
        reasoning:
          opportunities
            .map(
              (o) =>
                `${o.name}: ${formatCurrency(o.current)} → ${formatCurrency(o.potential)} vía "${o.scenario}"`,
            )
            .join("; ") +
          `. Revenue adicional potencial: ${formatCurrency(totalPotential)}/mes.`,
        confidence: 68,
        target_view: "intelligence",
      }),
      layer: "innovation" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

const FR13_SPATIAL_OPTIMIZATION: RuleDefinition<FacilitiesContext> = {
  id: "FR13",
  name: "Spatial Optimization",
  layer: "innovation",
  domain: "facilities",
  priority: 100,
  dataDependencies: ["whatIfScenarios"],
  evaluate: (ctx) => {
    const viable = ctx.whatIfScenarios.filter(
      (s) => s.auto_generated && s.mitigation.expected_recovery_pct > 50,
    );
    if (viable.length === 0) return null;

    const best = viable[0];

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR13"),
        impact: "low",
        title: `${viable.length} optimización(es) espacial(es) detectada(s) por el sistema`,
        reasoning:
          viable
            .slice(0, 3)
            .map(
              (s) =>
                `${s.action.description} — recuperación esperada: ${s.mitigation.expected_recovery_pct}%`,
            )
            .join("; ") +
          `. Mejor escenario: "${best.action.description}" con Monte Carlo P50 = ${formatCurrency(best.monte_carlo.p50)}.`,
        confidence: 65,
        target_view: "intelligence",
      }),
      layer: "innovation" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

/** FR18 — NEW: React to satisfaction decline signal.
 *  When Satisfaction detects critical decline, check if comfort is a factor. */
const FR18_SATISFACTION_COMFORT_LINK: RuleDefinition<FacilitiesContext> = {
  id: "FR18",
  name: "Satisfaction-Comfort Correlation",
  layer: "innovation",
  domain: "facilities",
  priority: 200,
  consumeSignals: ["sat_critical_decline"],
  dataDependencies: ["comfortScores"],
  evaluate: (ctx) => {
    const satSignal = ctx.signals?.find(
      (s) => s.signalDefId === "sat_critical_decline",
    );
    if (!satSignal) return null;

    // Check if comfort might be contributing
    if (ctx.lowComfortFacilityCount === 0) return null;

    return {
      ...buildInsight({
        id: generateInsightId("facilities", "FR18"),
        impact: "high",
        title: "Posible correlación: satisfacción en declive + confort degradado",
        reasoning: `El módulo de satisfacción detectó una caída crítica. Simultáneamente, ${ctx.lowComfortFacilityCount} espacio(s) tienen confort por debajo de ${T.COMFORT_LOW_THRESHOLD}/100. Investigar si la degradación de confort está contribuyendo a la caída de satisfacción.`,
        confidence: 70,
        target_view: "intelligence",
      }),
      layer: "innovation" as AdvisorLayer,
      domain: "facilities" as AIDomain,
    };
  },
};

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY
// 18 rules in evaluation order (by layer priority).
// ═══════════════════════════════════════════════════════════════

export const FACILITIES_RULES: RuleDefinition<FacilitiesContext>[] = [
  // Layer 1: Health (5 rules)
  FR1_LOW_OCCUPANCY,
  FR2_OVERCROWDING,
  FR3_COMFORT_DEGRADATION,
  FR4_DETERIORATION,
  FR14_COMFORT_CASCADE,

  // Layer 2: Engagement (3 rules — +1 cross-domain)
  FR5_MAINTENANCE_OVERDUE,
  FR15_GUEST_IMPACT,
  FR16_FINANCIAL_SIGNAL_RESPONSE,

  // Layer 3: Strategy (3 rules)
  FR6_REVENUE_DECLINE,
  FR7_SPACE_UNDERUTILIZED,
  FR8_PERSONALITY_MISMATCH,

  // Layer 4: Prediction (4 rules — +1 cascade)
  FR9_CROSS_DOMAIN,
  FR10_FAILURE_PREDICTION,
  FR11_BUDGET_TRAJECTORY,
  FR17_CASCADE_RISK,

  // Layer 5: Innovation (3 rules — +1 satisfaction link)
  FR12_HIDDEN_REVENUE,
  FR13_SPATIAL_OPTIMIZATION,
  FR18_SATISFACTION_COMFORT_LINK,
];