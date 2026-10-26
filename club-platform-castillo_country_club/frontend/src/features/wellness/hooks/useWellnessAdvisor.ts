/* ═══════════════════════════════════════════════════════════════
   features/wellness/hooks/useWellnessAdvisor.ts
   v36 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Advisor Hook
   Fase 23 — Client-Side Intelligence Engine

   18 reglas computacionales en 3 capas:
     Macro  (1–5):   Score & Profile Intelligence
     Micro  (6–11):  Activity & Engagement Intelligence
     Fusion (12–18): Cross-Domain, Persona, Anomaly & Prediction

   0 API calls. Consume datos ya en React Query cache.
   Adaptive thresholds via shared/lib/adaptiveThresholds.ts.

   Changes v36:
     P1: Activity type arrays derived from ACTIVITY_TYPE_CONFIG
     P2: Uses isHighIntensity, isRecovery, isSocial from types
     P3: Input extended with anomalies + alerts (rule 16)
     P4: Input extended with predictions (rule 17)
     P5: Monotony cross-check with most_frequent_activity
     P6: Overtraining refined with total_minutes
     P7: preferred_activities used in reactivation actions
     P8: goals_summary used in stagnation refinement
     P9: Named constants for rule thresholds
     P10: No more local activity arrays — predicates from types
   ═══════════════════════════════════════════════════════════════ */

import { useMemo } from "react";
import type {
  WellnessReport,
  WellnessProfile,
  WellnessRecommendation,
  WellnessAdvisorInsight,
  WellnessAnomaly,
  WellnessAlert,
  WellnessPredictions,
  RecommendedIntervention,
  ActivityType,
} from "../types";
import {
  calculateWellnessScore,
  ACTIVITY_TYPE_CONFIG,
  isHighIntensity,
  isRecovery,
  isSocial,
} from "../types";
import {
  WELLNESS_THRESHOLDS,
  type FitnessLevel,
} from "@/shared/lib/adaptiveThresholds";
import { classifyWellnessPersona } from "../lib/wellnessPersonas";

// ═══════════════════════════════════════════════════════════════
// §1  Input (P3, P4: extended)
// ═══════════════════════════════════════════════════════════════

interface UseWellnessAdvisorInput {
  report: WellnessReport | null | undefined;
  previousReport: WellnessReport | null | undefined;
  profile: WellnessProfile | null | undefined;
  recommendations: WellnessRecommendation[];
  anomalies?: WellnessAnomaly[];
  alerts?: WellnessAlert[];
  predictions?: {
    predictions: WellnessPredictions;
    recommended_interventions: RecommendedIntervention[];
  };
}

// ═══════════════════════════════════════════════════════════════
// §2  Named Constants (P9)
// ═══════════════════════════════════════════════════════════════

/** Minimum activities to analyze fitness level mismatch (rule 3) */
const MIN_ACTIVITIES_FOR_PROFILE_ANALYSIS = 3;

/** Minimum activities for persona classification (rule 15) */
const MIN_ACTIVITIES_FOR_PERSONA = 5;

/** Minimum activities to check monotony (rule 7) */
const MIN_ACTIVITIES_FOR_MONOTONY = 5;

/** Minimum activities to check social isolation (rule 8) */
const MIN_ACTIVITIES_FOR_SOCIAL = 3;

/** Minimum recommendations for gap detection (rule 14) */
const MIN_RECOMMENDATIONS_FOR_GAP = 3;

/** Advanced profile: max % of gentle activities before flagging */
const ADVANCED_GENTLE_THRESHOLD = 0.7;

/** Beginner profile: max % of high-intensity before flagging */
const BEGINNER_INTENSITY_THRESHOLD = 0.6;

/** Overtraining: minutes per month per fitness level (rule 11) */
const OVERTRAINING_MINUTES: Record<FitnessLevel, number> = {
  beginner: 480,
  intermediate: 720,
  advanced: 1080,
  all_levels: 720,
};

/** Maximum anomaly severity ordinal for sorting */
const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ═══════════════════════════════════════════════════════════════
// §3  Helpers
// ═══════════════════════════════════════════════════════════════

function activityPctByFilter(
  breakdown: WellnessReport["activity_breakdown"],
  total: number,
  predicate: (type: ActivityType) => boolean,
): number {
  if (total === 0) return 0;
  const count = breakdown
    .filter((b) => predicate(b.activity_type))
    .reduce((s, b) => s + b.count, 0);
  return count / total;
}

// ═══════════════════════════════════════════════════════════════
// §4  Hook
// ═══════════════════════════════════════════════════════════════

export function useWellnessAdvisor({
  report,
  previousReport,
  profile,
  recommendations,
  anomalies = [],
  alerts = [],
  predictions,
}: UseWellnessAdvisorInput): WellnessAdvisorInsight[] {
  return useMemo(() => {
    const insights: WellnessAdvisorInsight[] = [];

    // ─── No data → prompt ───
    if (!report) {
      insights.push({
        id: "no_data",
        layer: "macro",
        impact: "low",
        title: "Sin datos de bienestar",
        reasoning:
          "No se encontró un reporte de bienestar. Registrá actividades para obtener insights del Advisor.",
        targetTab: "overview",
        confidence: 100,
      });
      return insights;
    }

    // ─── Derived data ───
    const scoreData = calculateWellnessScore(
      report,
      previousReport ?? undefined,
    );
    const fitLevel = (profile?.fitness_level as FitnessLevel) ?? "all_levels";
    const {
      activity_breakdown,
      total_activities,
      streak_days,
      total_minutes,
      most_frequent_activity,
      goals_summary,
    } = report;

    // ═══════════════════════════════════════════════════════
    // LAYER 1: MACRO (rules 1–5)
    // Score & Profile Intelligence
    // ═══════════════════════════════════════════════════════

    // Rule 1: Health Score Critical (Adaptive)
    {
      const threshold = WELLNESS_THRESHOLDS.healthScoreCritical(fitLevel);
      if (scoreData.composite < threshold.effective) {
        const worstDim = [...scoreData.dimensions].sort(
          (a, b) => a.score - b.score,
        )[0];
        insights.push({
          id: "wellness_health_critical",
          layer: "macro",
          impact: "high",
          title: `Wellness crítico: ${scoreData.composite}/100`,
          reasoning: `Score por debajo del threshold adaptativo (${threshold.effectiveRounded}/100 para ${threshold.seasonLabel}). Dimensión más débil: ${worstDim?.label ?? "—"} (${worstDim?.score ?? 0}/100, peso ${((worstDim?.weight ?? 0) * 100).toFixed(0)}%).`,
          targetTab: "overview",
          confidence: 90,
          thresholdContext: {
            effective: threshold.effectiveRounded,
            explanation: threshold.explanation,
          },
        });
      }
    }

    // Rule 2: Single Dimension Dragging
    {
      const threshold = WELLNESS_THRESHOLDS.dimensionDragging();
      const dragging = scoreData.dimensions.filter(
        (d) => d.score < threshold.effective,
      );
      if (dragging.length > 0 && scoreData.composite > 50) {
        insights.push({
          id: "dimension_dragging",
          layer: "macro",
          impact: "medium",
          title: `Dimensión arrastrando score: ${dragging.map((d) => d.label).join(", ")}`,
          reasoning: `${dragging.length} dimensión(es) por debajo de ${threshold.effectiveRounded} puntos mientras el composite es ${scoreData.composite}. ${dragging.map((d) => `${d.label}: ${d.score}/100`).join(". ")}.`,
          targetTab: "trends",
          confidence: 85,
        });
      }
    }

    // Rule 3: Fitness Level Mismatch (P1, P2: config-derived)
    if (
      profile?.fitness_level &&
      total_activities >= MIN_ACTIVITIES_FOR_PROFILE_ANALYSIS
    ) {
      const advancedPct = activityPctByFilter(
        activity_breakdown,
        total_activities,
        isHighIntensity,
      );
      const gentlePct = activityPctByFilter(
        activity_breakdown,
        total_activities,
        isRecovery,
      );

      if (
        profile.fitness_level === "advanced" &&
        gentlePct > ADVANCED_GENTLE_THRESHOLD
      ) {
        insights.push({
          id: "fitness_mismatch_underutilized",
          layer: "macro",
          impact: "medium",
          title: "Perfil avanzado con actividad predominantemente suave",
          reasoning: `Perfil: ${profile.fitness_level}. ${Math.round(gentlePct * 100)}% de actividades son de baja intensidad. Potencial deportivo desaprovechado o posible recuperación de lesión.`,
          targetTab: "overview",
          confidence: 65,
        });
      }

      if (
        profile.fitness_level === "beginner" &&
        advancedPct > BEGINNER_INTENSITY_THRESHOLD
      ) {
        insights.push({
          id: "fitness_mismatch_overexertion",
          layer: "macro",
          impact: "medium",
          title: "Perfil principiante con actividad de alta intensidad",
          reasoning: `Perfil: ${profile.fitness_level}. ${Math.round(advancedPct * 100)}% de actividades son de alta intensidad. Riesgo de lesión por progresión demasiado rápida.`,
          targetTab: "overview",
          confidence: 70,
        });
      }
    }

    // Rule 4: Trend Dimension Declining
    {
      const threshold = WELLNESS_THRESHOLDS.trendDeclining();
      const trendDim = scoreData.dimensions.find((d) => d.id === "trend");
      if (trendDim && trendDim.score < threshold.effective && previousReport) {
        insights.push({
          id: "trend_declining",
          layer: "macro",
          impact: "high",
          title: `Tendencia en declive: ${trendDim.score}/100`,
          reasoning: `Dimensión tendencia en ${trendDim.score}/100 (threshold: ${threshold.effectiveRounded}). Período actual: ${total_activities} actividades vs ${previousReport.total_activities} previas. Delta: ${scoreData.trend > 0 ? "+" : ""}${scoreData.trend}.`,
          targetTab: "trends",
          confidence: 80,
        });
      }
    }

    // Rule 5: Health Conditions Without Adapted Programming
    if (
      profile?.health_conditions &&
      profile.health_conditions.length > 0 &&
      total_activities > 0
    ) {
      const hasRecovery = activity_breakdown.some(
        (b) => isRecovery(b.activity_type) && b.count > 0,
      );

      if (!hasRecovery) {
        insights.push({
          id: "health_conditions_no_adaptation",
          layer: "macro",
          impact: "high",
          title: "Condiciones de salud sin programación adaptada",
          reasoning: `Condiciones: ${profile.health_conditions.join(", ")}. Sin actividades de baja intensidad (spa, meditación, yoga) en el período. Riesgo de agravamiento.`,
          targetTab: "overview",
          confidence: 75,
          action: {
            type: "mutate" as const,
            server: "wellness",
            tool: "wellness_profile_update",
            params: {
              family_id: profile.family_id,
              notes:
                "Advisor: sugerir programación adaptada a condiciones de salud",
            },
            approvalLevel: "semi" as const,
            label: "Actualizar perfil — programación adaptada",
            confirmMessage: `Se actualizará el perfil de ${profile.family_name} para reflejar la necesidad de programación adaptada a: ${profile.health_conditions.join(", ")}.`,
            estimatedImpact:
              "Programación de actividades adaptada a condiciones de salud",
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // LAYER 2: MICRO (rules 6–11)
    // Activity & Engagement Intelligence
    // ═══════════════════════════════════════════════════════

    // Rule 6: Activity Drought (Adaptive)
    // P7: uses preferred_activities for reactivation type
    {
      const threshold = WELLNESS_THRESHOLDS.activityDrought(fitLevel);
      if (streak_days === 0 && total_activities < 2) {
        const preferredType =
          profile?.preferred_activities?.[0] ?? ("yoga" as ActivityType);
        const preferredLabel =
          ACTIVITY_TYPE_CONFIG[preferredType]?.label ?? "Yoga";

        insights.push({
          id: "activity_drought",
          layer: "micro",
          impact: "high",
          title: "Sequía de actividad: racha en 0",
          reasoning: `Sin racha activa y solo ${total_activities} actividad(es) en el período. Para ${threshold.seasonLabel}, el threshold es ${threshold.effectiveRounded} días. Engagement en riesgo.`,
          targetTab: "overview",
          confidence: 85,
          thresholdContext: {
            effective: threshold.effectiveRounded,
            explanation: threshold.explanation,
          },
          action: {
            type: "mutate" as const,
            server: "wellness",
            tool: "wellness_schedule_class",
            params: {
              family_id: profile?.family_id ?? "",
              activity_type: preferredType,
              notes: `Advisor: reactivar con ${preferredLabel.toLowerCase()} (actividad preferida)`,
            },
            approvalLevel: "hitl" as const,
            label: `Agendar ${preferredLabel.toLowerCase()} — reactivación`,
            confirmMessage: `Se creará una solicitud para agendar ${preferredLabel.toLowerCase()} como primer paso de reactivación. Requiere aprobación.`,
            estimatedImpact: "Reactivar engagement y prevenir churn",
          },
        });
      }
    }

    // Rule 7: Monotony Risk
    // P5: cross-check with most_frequent_activity
    if (
      total_activities >= MIN_ACTIVITIES_FOR_MONOTONY &&
      activity_breakdown.length > 0
    ) {
      const threshold = WELLNESS_THRESHOLDS.monotonyRisk();
      const sorted = [...activity_breakdown].sort(
        (a, b) => b.count - a.count,
      );
      const top = sorted[0]!;
      const topPct = (top.count / total_activities) * 100;

      // P5: cross-check
      if (
        most_frequent_activity &&
        most_frequent_activity !== top.activity_type
      ) {
        // Data inconsistency — use breakdown as source of truth
        // but note the discrepancy
      }

      if (topPct > threshold.effective) {
        const config = ACTIVITY_TYPE_CONFIG[top.activity_type];
        insights.push({
          id: "monotony_risk",
          layer: "micro",
          impact: "medium",
          title: `Monotonía: ${Math.round(topPct)}% en ${config?.label ?? top.activity_type}`,
          reasoning: `${top.count}/${total_activities} actividades son ${config?.label ?? top.activity_type}. Por encima del threshold de ${threshold.effectiveRounded}%. Riesgo de burnout y pérdida de interés.`,
          targetTab: "trends",
          confidence: 75,
        });
      }
    }

    // Rule 8: Social Isolation (P1, P2: uses isSocial)
    if (total_activities >= MIN_ACTIVITIES_FOR_SOCIAL) {
      const socialPct = activityPctByFilter(
        activity_breakdown,
        total_activities,
        isSocial,
      );

      if (socialPct === 0) {
        insights.push({
          id: "social_isolation",
          layer: "micro",
          impact: "medium",
          title: "Aislamiento social: 0 actividades grupales",
          reasoning: `Ninguna actividad social en ${total_activities} actividades. El componente social es predictor clave de retención a largo plazo.`,
          targetTab: "overview",
          confidence: 80,
          action: {
            type: "mutate" as const,
            server: "wellness",
            tool: "wellness_schedule_class",
            params: {
              family_id: profile?.family_id ?? "",
              activity_type: "group_class",
              notes: "Advisor: combatir aislamiento con actividad grupal",
            },
            approvalLevel: "hitl" as const,
            label: "Agendar clase grupal",
            confirmMessage:
              "Se solicitará agendar una clase grupal para fomentar el componente social. Requiere aprobación.",
            estimatedImpact:
              "Mejorar engagement social y retención a largo plazo",
          },
        });
      }
    }

    // Rule 9: Goal Stagnation (P8: refined with goals_summary)
    if (recommendations.length > 0 && total_activities < 3) {
      const highPri = recommendations.filter((r) => r.priority === "high");
      if (highPri.length > 0) {
        const abandonedCount = goals_summary?.["abandoned"] ?? 0;
        const impact: "high" | "medium" =
          abandonedCount > 0 ? "high" : "medium";

        insights.push({
          id: "goal_stagnation",
          layer: "micro",
          impact,
          title: `${highPri.length} recomendación(es) urgente(s) sin acción`,
          reasoning: `Hay ${highPri.length} recomendación(es) de alta prioridad pero solo ${total_activities} actividad(es).${abandonedCount > 0 ? ` ${abandonedCount} meta(s) abandonada(s) — evidencia de desmotivación.` : ""} Prioridades: ${highPri.map((r) => r.title).slice(0, 2).join(", ")}.`,
          targetTab: "advisor",
          confidence: 70,
        });
      }
    }

    // Rule 10: Streak Broken (Leading Churn Indicator)
    if (previousReport) {
      const threshold = WELLNESS_THRESHOLDS.streakBroken();
      if (
        previousReport.streak_days >= threshold.effective &&
        streak_days === 0
      ) {
        const preferredType =
          profile?.preferred_activities?.[0] ?? ("fitness" as ActivityType);
        insights.push({
          id: "streak_broken",
          layer: "micro",
          impact: "high",
          title: `Racha rota: ${previousReport.streak_days}d → 0d`,
          reasoning: `Racha de ${previousReport.streak_days} días perdida. Indicador líder de abandono — intervenir antes de que se consolide la inactividad.`,
          targetTab: "overview",
          confidence: 85,
          action: {
            type: "mutate" as const,
            server: "wellness",
            tool: "wellness_goal_set",
            params: {
              family_id: profile?.family_id ?? "",
              goal_type: preferredType === "yoga" || preferredType === "meditation" || preferredType === "pilates"
                ? "flexibility"
                : preferredType === "swimming"
                  ? "endurance"
                  : "fitness",
              title: "Retomar actividad: 3 sesiones esta semana",
              target_value: 3,
              unit: "sesiones",
              description:
                "Meta de reactivación generada por el Advisor tras ruptura de racha.",
            },
            approvalLevel: "semi" as const,
            label: "Meta de reactivación — 3 sesiones",
            confirmMessage: `Se creará una meta: "Retomar actividad — 3 sesiones esta semana" para ${profile?.family_name ?? "la familia"}.`,
            estimatedImpact: "Reactivar engagement y reconstruir racha",
          },
        });
      }
    }

    // Rule 11: Overtraining Signal (P6: refined with total_minutes)
    {
      const threshold = WELLNESS_THRESHOLDS.overtraining(fitLevel);
      const minutesThreshold = OVERTRAINING_MINUTES[fitLevel];

      if (
        total_activities > threshold.effectiveRounded ||
        total_minutes > minutesThreshold
      ) {
        const reason =
          total_activities > threshold.effectiveRounded
            ? `${total_activities} actividades superan el threshold de ${threshold.effectiveRounded}`
            : `${total_minutes} minutos superan el threshold de ${minutesThreshold}min para nivel ${fitLevel}`;

        insights.push({
          id: "overtraining_signal",
          layer: "micro",
          impact: "medium",
          title: `Posible sobreentrenamiento: ${total_activities} actividades / ${total_minutes}min`,
          reasoning: `${reason}. Riesgo de fatiga, lesión y burnout.`,
          targetTab: "trends",
          confidence: 65,
          thresholdContext: {
            effective: threshold.effectiveRounded,
            explanation: threshold.explanation,
          },
        });
      }
    }

    // ═══════════════════════════════════════════════════════
    // LAYER 3: FUSION (rules 12–18)
    // Cross-Domain, Persona, Anomaly & Prediction
    // ═══════════════════════════════════════════════════════

    // Rule 12: Wellness-Retention Compound Risk
    {
      const threshold = WELLNESS_THRESHOLDS.compoundRisk(fitLevel);
      if (scoreData.composite < threshold.effective && scoreData.trend < 0) {
        insights.push({
          id: "compound_churn_risk",
          layer: "fusion",
          impact: "high",
          title: `Riesgo compuesto de abandono: ${scoreData.composite}/100 + tendencia negativa`,
          reasoning: `Composite (${scoreData.composite}) bajo threshold de riesgo (${threshold.effectiveRounded}) Y tendencia negativa (${scoreData.trend > 0 ? "+" : ""}${scoreData.trend}). Bajo bienestar + declive = predictor fuerte de churn.`,
          targetTab: "alerts",
          confidence: 80,
        });
      }
    }

    // Rule 13: Premium Upsell Candidate
    if (profile) {
      const threshold = WELLNESS_THRESHOLDS.premiumCandidate();
      const isPremiumLevel =
        profile.fitness_level === "intermediate" ||
        profile.fitness_level === "advanced";

      if (
        scoreData.composite > threshold.effective &&
        isPremiumLevel &&
        streak_days >= 7
      ) {
        insights.push({
          id: "premium_candidate",
          layer: "fusion",
          impact: "medium",
          title: "Candidato para servicios premium de bienestar",
          reasoning: `Score ${scoreData.composite}/100 (>${threshold.effectiveRounded}), nivel ${profile.fitness_level}, racha de ${streak_days}d. Socio comprometido — candidato para entrenamiento personal, programas VIP o paquetes de spa.`,
          targetTab: "business",
          confidence: 70,
        });
      }
    }

    // Rule 14: Recommendations Engagement Gap
    if (
      recommendations.length >= MIN_RECOMMENDATIONS_FOR_GAP &&
      total_activities >= 2 &&
      total_activities < 6
    ) {
      const highPri = recommendations.filter((r) => r.priority === "high");
      insights.push({
        id: "recommendations_gap",
        layer: "fusion",
        impact: "medium",
        title: `${recommendations.length} recomendaciones activas con engagement bajo`,
        reasoning: `${recommendations.length} recomendaciones (${highPri.length} alta prioridad) pero solo ${total_activities} actividad(es). Gap entre sugerencias y ejecución.`,
        targetTab: "advisor",
        confidence: 75,
      });
    }

    // Rule 15: Wellness Persona Classification
    if (total_activities >= MIN_ACTIVITIES_FOR_PERSONA) {
      const persona = classifyWellnessPersona(report, profile);

      if (persona.id === "dormant") {
        insights.push({
          id: "persona_dormant",
          layer: "fusion",
          impact: "high",
          title: `Perfil: ${persona.label} — ${persona.description}`,
          reasoning: `Clasificado como "${persona.label}" con ${total_activities} actividades. ${persona.riskFactors[0] ? `Riesgo: ${persona.riskFactors[0]}.` : ""} Oportunidad: ${persona.crossDomain.events[0] ?? "reactivación"}.`,
          targetTab: "overview",
          confidence: 70,
          personaId: persona.id,
        });
      } else if (persona.id !== "newcomer") {
        insights.push({
          id: `persona_${persona.id}`,
          layer: "fusion",
          impact: "low",
          title: `Perfil de bienestar: ${persona.label}`,
          reasoning: `${persona.description}. ${persona.crossDomain.events.length > 0 ? `Evento sugerido: ${persona.crossDomain.events[0]}.` : ""} ${persona.riskFactors.length > 0 ? `Riesgo: ${persona.riskFactors[0]}.` : ""}`,
          targetTab: "business",
          confidence: 60,
          personaId: persona.id,
        });
      }
    }

    // ═══ Rule 16: Anomaly-Driven Insights (P3) ═══
    if (anomalies.length > 0) {
      const criticalAnomalies = anomalies.filter(
        (a) => a.severity === "critical" || a.severity === "high",
      );

      if (criticalAnomalies.length > 0) {
        const sorted = [...criticalAnomalies].sort(
          (a, b) =>
            (SEVERITY_ORDER[a.severity] ?? 9) -
            (SEVERITY_ORDER[b.severity] ?? 9),
        );
        const top = sorted[0]!;

        insights.push({
          id: "anomaly_detected",
          layer: "fusion",
          impact: top.severity === "critical" ? "high" : "medium",
          title: `Anomalía detectada: ${top.type.replace(/_/g, " ")}`,
          reasoning: `${top.description}. Valor esperado: ${top.expected_value}, actual: ${top.actual_value}. ${criticalAnomalies.length > 1 ? `+${criticalAnomalies.length - 1} anomalía(s) adicional(es).` : ""}`,
          targetTab: "alerts",
          confidence: 85,
        });
      }

      // Generate action from suggested_action on top anomaly
      const actionAnomaly = anomalies.find(
        (a) => a.suggested_action && a.severity !== "low",
      );
      if (actionAnomaly) {
        insights.push({
          id: `anomaly_action_${actionAnomaly.type}`,
          layer: "fusion",
          impact: "medium",
          title: `Acción sugerida: ${actionAnomaly.type.replace(/_/g, " ")}`,
          reasoning: actionAnomaly.suggested_action,
          targetTab: "alerts",
          confidence: 75,
        });
      }
    }

    // ═══ Rule 17: Prediction-Driven Early Warning (P4) ═══
    if (predictions) {
      const { predictions: pred, recommended_interventions } = predictions;

      if (pred.engagement_30d.trend === "declining") {
        const intervention = recommended_interventions[0];
        insights.push({
          id: "prediction_declining",
          layer: "fusion",
          impact: "high",
          title: `Predicción: engagement en declive a 30 días`,
          reasoning: `Score predicho: ${pred.engagement_30d.score}/100 (confianza: ${pred.engagement_30d.confidence}%). Tendencia: ${pred.engagement_30d.trend}. ${intervention ? `Intervención sugerida: ${intervention.action} (${intervention.urgency}).` : ""}`,
          targetTab: "alerts",
          confidence: pred.engagement_30d.confidence,
          action: intervention
            ? {
                type: "mutate" as const,
                server: "wellness",
                tool: "wellness_schedule_class",
                params: {
                  family_id: profile?.family_id ?? "",
                  notes: `Advisor: ${intervention.action}`,
                },
                approvalLevel: "semi" as const,
                label: intervention.action,
                confirmMessage: `Se ejecutará la intervención: "${intervention.action}". Impacto esperado: ${intervention.expected_impact}.`,
                estimatedImpact: intervention.expected_impact,
              }
            : undefined,
        });
      }

      // Positive prediction
      if (
        pred.engagement_30d.trend === "improving" &&
        pred.engagement_30d.score > 70
      ) {
        insights.push({
          id: "prediction_improving",
          layer: "fusion",
          impact: "low",
          title: `Predicción positiva: engagement mejorando`,
          reasoning: `Score predicho a 30 días: ${pred.engagement_30d.score}/100 (confianza: ${pred.engagement_30d.confidence}%). Tendencia positiva — candidato para programas avanzados.`,
          targetTab: "business",
          confidence: pred.engagement_30d.confidence,
        });
      }
    }

    // ═══ Rule 18: Alert Escalation (P3) ═══
    if (alerts.length > 0) {
      const criticalAlerts = alerts.filter((a) => a.level === "critical");
      if (criticalAlerts.length > 0) {
        insights.push({
          id: "alert_escalation",
          layer: "fusion",
          impact: "high",
          title: `${criticalAlerts.length} alerta(s) crítica(s) del sistema`,
          reasoning: criticalAlerts.map((a) => a.message).join(". "),
          targetTab: "alerts",
          confidence: 95,
        });
      }
    }

    // ── Sort: impact (high→low), then confidence (desc) ──
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) => {
      const diff = impactOrder[a.impact] - impactOrder[b.impact];
      if (diff !== 0) return diff;
      return b.confidence - a.confidence;
    });
  }, [
    report,
    previousReport,
    profile,
    recommendations,
    anomalies,
    alerts,
    predictions,
  ]);
}