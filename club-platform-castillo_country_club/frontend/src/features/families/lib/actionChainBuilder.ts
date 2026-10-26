// ═══════════════════════════════════════════════════════════
// src/features/families/lib/actionChainBuilder.ts
// Phase 34+ Migration — Action Chain Builder
// Level 6+ Agency · Production Grade
//
// Takes all AI results and builds a sequential action plan
// where each step compounds on the previous. Not siloed
// recommendations — a STRATEGY.
//
// PRE-WRITE VERIFICATION:
//   IntelligenceResults, IntelligenceCorrelation
//     → ./intelligenceCorrelator.ts §1 ✅
//   LifecycleProjection → ../ai-types.ts §6 ✅
//   FamilyEngagementPlan, EngagementPlanAction → ../ai-types.ts §11 ✅
//   LIFECYCLE_STAGES → ../config.ts §12 ✅
//
// ANTI-PATTERNS REMOVED:
//   - FamilyActivityRecommendations wrapper → ActivityRecommendation[]
//   - lifecycle.recommendations → lifecycle.interventionWindow.suggestedActions
//   - lifecycle.nextTransition → lifecycle.projectedStage
//   - lifecycle.daysAtStage → lifecycle.daysAtCurrentStage
//   - Priority cast `as ActionStep["priority"]` → explicit mapping
//   - Mutable interfaces → readonly
//   - No § markers → 3 sections
// ═══════════════════════════════════════════════════════════

import type {
  IntelligenceResults,
  IntelligenceCorrelation,
} from "./intelligenceCorrelator";

import { LIFECYCLE_STAGES } from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Types
// ═══════════════════════════════════════════════════════════

/** Expected impact of a single action step */
export interface ActionImpact {
  readonly metric: string;
  readonly current: number | string;
  readonly predicted: number | string;
  readonly unit: string;
}

/** A single step in the action chain */
export interface ActionStep {
  readonly id: number;
  readonly timing: string;
  readonly action: string;
  readonly category: string;
  readonly source: string;
  readonly priority: "critical" | "high" | "medium" | "low";
  readonly impacts: readonly ActionImpact[];
  readonly context: string;
}

/** Complete sequential action plan with projected outcome */
export interface ActionChain {
  readonly steps: readonly ActionStep[];
  readonly outcome: Readonly<{
    metrics: readonly ActionImpact[];
    timeframe: string;
    summary: string;
  }>;
}

// ═══════════════════════════════════════════════════════════
// §2  Builder
// ═══════════════════════════════════════════════════════════

/**
 * Build a sequential action plan from intelligence results.
 *
 * Strategy: 6 steps ordered by time and compounding effect:
 *   1. Crisis management (churn-critical families)
 *   2. Engagement activation
 *   3. Social connection
 *   4. Activity recommendation
 *   5. Lifecycle intervention
 *   6. Upgrade/recognition (healthy families)
 *
 * Each step projects metric improvements that compound.
 * Returns null if insufficient data to build a meaningful chain.
 */
export function buildActionChain(
  results: IntelligenceResults,
  _correlations: readonly IntelligenceCorrelation[],
): ActionChain | null {
  const steps: ActionStep[] = [];
  let stepId = 1;

  const churnRisk = results.churn?.riskScore ?? 0;
  const churnLevel = results.churn?.riskLevel ?? "low";
  const engageScore = results.engagement?.currentScore ?? 50;
  const timeframe = results.engagement?.timeframe ?? "90 días";
  const socialSuggestions = results.social ?? [];
  const stage = results.lifecycle?.currentStage ?? "";
  const activities = results.activities ?? [];

  // Skip if no meaningful data
  if (!results.churn && !results.engagement) return null;

  // Step 1: Crisis management (if needed)
  if (churnLevel === "critical" || churnLevel === "high") {
    steps.push({
      id: stepId++,
      timing: "Esta semana",
      action: "Llamada proactiva de reconexión",
      category: "crisis",
      source: "Predicción de Churn",
      priority: churnLevel === "critical" ? "critical" : "high",
      impacts: [
        {
          metric: "Churn Risk",
          current: `${churnRisk}%`,
          predicted: `${Math.max(10, churnRisk - 15)}%`,
          unit: "%",
        },
      ],
      context:
        results.churn?.factors[0]?.detail ??
        "Contacto directo para entender la situación",
    });
  }

  // Step 2: Engagement activation
  if (engageScore < 60 && results.engagement) {
    const planActions = results.engagement.actions.slice(0, 2);
    steps.push({
      id: stepId++,
      timing: churnLevel === "critical" ? "Semana 1-2" : "Esta semana",
      action:
        planActions.length > 0
          ? planActions[0].action
          : "Activar plan de engagement personalizado",
      category:
        planActions.length > 0 ? planActions[0].category : "activity",
      source: "Plan de Engagement",
      priority: engageScore < 35 ? "high" : "medium",
      impacts: [
        {
          metric: "Engagement",
          current: engageScore,
          predicted: Math.min(100, engageScore + 12),
          unit: "pts",
        },
      ],
      context:
        planActions.length > 0
          ? `Timing sugerido: ${planActions[0].timing}`
          : "Actividad de alto impacto para reconectar",
    });
  }

  // Step 3: Social connection
  if (socialSuggestions.length > 0) {
    const top = socialSuggestions[0];
    steps.push({
      id: stepId++,
      timing: churnLevel === "critical" ? "Semana 2-3" : "Semana 1-2",
      action: `Conectar con familia ${top.familyName}`,
      category: "social",
      source: "Coincidencias Sociales",
      priority: "medium",
      impacts: [
        {
          metric: "Conexiones fuertes",
          current: socialSuggestions.length > 3 ? socialSuggestions.length : "< 3",
          predicted: socialSuggestions.length + 1,
          unit: "",
        },
        {
          metric: "Match",
          current: `${top.matchScore}%`,
          predicted: "—",
          unit: "",
        },
      ],
      context: `Actividad sugerida: ${top.suggestedActivity}. Intereses: ${top.commonInterests.slice(0, 2).join(", ")}`,
    });
  }

  // Step 4: Activity recommendation
  if (activities.length > 0) {
    const top = activities[0];
    steps.push({
      id: stepId++,
      timing: "Semana 2-4",
      action: `Inscribir en: ${top.activityName}`,
      category: "activity",
      source: "Actividades Recomendadas",
      priority: "medium",
      impacts: [
        {
          metric: "Match Score",
          current: `${top.matchScore}%`,
          predicted: "—",
          unit: "",
        },
      ],
      context: `Para: ${top.targetMembers.join(", ")}. ${top.schedulingSuggestion}`,
    });
  }

  // Step 5: Lifecycle intervention (if needed)
  if (
    stage === "plateau" ||
    stage === "at_risk" ||
    stage === "onboarding"
  ) {
    const suggestedActions =
      results.lifecycle?.interventionWindow?.suggestedActions ?? [];
    if (suggestedActions.length > 0) {
      const stageLabel = LIFECYCLE_STAGES[stage as keyof typeof LIFECYCLE_STAGES]?.label ?? stage;
      const projectedStage = results.lifecycle?.projectedStage;
      const projectedLabel = projectedStage
        ? LIFECYCLE_STAGES[projectedStage]?.label ?? projectedStage
        : "progreso";

      steps.push({
        id: stepId++,
        timing: "Semana 3-4",
        action: suggestedActions[0],
        category: "activity",
        source: "Análisis de Ciclo de Vida",
        priority: stage === "at_risk" ? "high" : "medium",
        impacts: [
          {
            metric: "Etapa del ciclo",
            current: stageLabel,
            predicted: projectedLabel,
            unit: "",
          },
        ],
        context: `Ventana de intervención: ${suggestedActions.length} acciones sugeridas`,
      });
    }
  }

  // Step 6: Upgrade/Recognition (if good state)
  if (churnLevel === "low" && engageScore >= 70) {
    steps.push({
      id: stepId++,
      timing: "Mes 2-3",
      action: "Reconocimiento y exploración de upgrade",
      category: "upgrade",
      source: "Análisis Integral",
      priority: "low",
      impacts: [
        {
          metric: "Valor del socio",
          current: "Actual",
          predicted: "Incremento potencial",
          unit: "",
        },
      ],
      context:
        "Familia saludable — oportunidad de fortalecer lealtad y explorar tier superior",
    });
  }

  if (steps.length === 0) return null;

  // ── Projected Outcome ──
  const outcomeMetrics: ActionImpact[] = [];

  if (results.churn) {
    const predicted = Math.max(
      10,
      churnRisk - (steps.length >= 3 ? 35 : steps.length * 12),
    );
    outcomeMetrics.push({
      metric: "Churn Risk",
      current: `${churnRisk}%`,
      predicted: `~${predicted}%`,
      unit: "%",
    });
  }

  if (results.engagement) {
    const predicted = Math.min(100, engageScore + steps.length * 8);
    outcomeMetrics.push({
      metric: "Engagement",
      current: engageScore,
      predicted: `~${predicted}`,
      unit: "pts",
    });
  }

  if (socialSuggestions.length > 0) {
    outcomeMetrics.push({
      metric: "Conexiones",
      current: socialSuggestions.length,
      predicted:
        socialSuggestions.length +
        Math.min(
          2,
          steps.filter((s) => s.category === "social").length,
        ),
      unit: "",
    });
  }

  const summary =
    `Ejecutando ${steps.length} pasos en ${timeframe}: se proyecta ` +
    outcomeMetrics
      .map((m) => `${m.metric}: ${m.current} → ${m.predicted}`)
      .join(", ") +
    ".";

  return {
    steps,
    outcome: {
      metrics: outcomeMetrics,
      timeframe,
      summary,
    },
  };
}