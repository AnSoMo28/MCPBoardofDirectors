// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — ML Intelligence Domain Rules
//
// 10 declarative rules migrated from useMLAdvisor (F35→F47).
// 3 layers: health/model_health (1-4), prediction/predictions (5-7),
//           micro/insights (8-10).
//
// Architecture:
//   RuleDefinition<MLContext> — pure functions, testable
//   buildMLCtx() — derives metrics from raw MCP data
//   ML_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: ml_model_degradation, ml_prediction_confidence_drop (P54)
//
// TRANSVERSAL advisor — consumes data from ALL domains
// via the ML Intelligence agent.
//
// Created: F47 B5.6 — ML Rules Migration
// ═══════════════════════════════════════════════════════════

import type { AIDomain } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import type { SeverityLevel } from "@/shared/types/domain-enums";
import type {
  BaseContext,
  RuleDefinition,
  SignalDefinition,
  HealthFactorDef,
  DomainSignal,
} from "../types";
import { buildInsight } from "../evaluate";

import type {
  DataQualityReport,
  AnomalyReport,
  DemandForecast,
  RevenueForecast,
  ChurnMLReport,
  MemberSegmentation,
  ModelHealthReport,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface MLContext extends BaseContext {
  domain: "ml_intelligence";

  // Raw inputs
  dataQuality: DataQualityReport | null;
  anomalies: AnomalyReport | null;
  demandForecasts: DemandForecast[];
  revenueForecast: RevenueForecast | null;
  churnReport: ChurnMLReport | null;
  segmentation: MemberSegmentation | null;
  modelHealth: ModelHealthReport | null;

  // Data quality
  dataQualityScore: number;
  domainsReadyForML: number;
  totalDomains: number;
  criticalGaps: string[];

  // Anomalies
  totalAnomalies: number;
  criticalAnomalies: number;
  highAnomalies: number;
  domainsAffected: string[];
  systemicRisk: number;
  crossDomainAnomalies: number;

  // Revenue
  currentRevenue: number;
  budgetRevenue: number;
  baseScenarioTotal: number;
  revenueVsBudgetPct: number;
  revenueConfidence: number;

  // Churn
  totalAtRisk: number;
  totalAnalyzed: number;
  avgMLScore: number;
  avgRuleScore: number;
  significantDiscrepancies: number;

  // Segments
  totalSegments: number;
  silhouette: number;
  dormantPct: number;
  championPct: number;
  atRiskSegmentMembers: number;
  atRiskRevenuePct: number;
  atRiskChurnPct: number;

  // Models
  totalModels: number;
  healthyModels: number;
  degradedModels: number;
  retrainNeeded: number;
  avgAccuracy: number;
  anyDrift: boolean;
  driftedModels: { display_name: string; drift_magnitude: number }[];
}

export function buildMLCtx(
  rawData: unknown,
  signals?: DomainSignal[],
): MLContext {
  const {
    dataQuality,
    anomalies,
    demandForecasts,
    revenueForecast,
    churnReport,
    segmentation,
    modelHealth,
  } = rawData as {
    dataQuality: DataQualityReport | null;
    anomalies: AnomalyReport | null;
    demandForecasts: DemandForecast[];
    revenueForecast: RevenueForecast | null;
    churnReport: ChurnMLReport | null;
    segmentation: MemberSegmentation | null;
    modelHealth: ModelHealthReport | null;
  };

  // Revenue
  const scenarios = revenueForecast?.scenarios ?? [];
  const baseScenario = scenarios.find(
    (s) => s.scenario_type === "base",
  );
  const budget = revenueForecast?.budget_monthly ?? 0;
  const current = revenueForecast?.current_monthly_revenue ?? 0;
  const baseTotal = baseScenario?.quarterly_total ?? 0;
  const vsBudget = baseScenario?.vs_budget_pct ?? 0;
  const revConfidence = revenueForecast?.confidence ?? 0;

  // Segments
  const segments = segmentation?.segments ?? [];
  const dormant = segments.find((s) => s.label === "dormant");
  const champion = segments.find((s) => s.label === "champion");
  const atRisk = segments.find((s) => s.label === "at_risk");

  // Anomalies
  const allAnomalies = anomalies?.anomalies ?? [];
  const crossDomain = allAnomalies.filter(
    (a) => a.affected_domains.length > 1,
  );

  // Models
  const allModels = modelHealth?.models ?? [];
  const drifted = allModels.filter((m) => m.drift_detected);

  return {
    domain: "ml_intelligence",
    signals: signals ?? [],
    dataQuality,
    anomalies,
    demandForecasts,
    revenueForecast,
    churnReport,
    segmentation,
    modelHealth,
    dataQualityScore: dataQuality?.overall_score ?? 0,
    domainsReadyForML: dataQuality?.domains_ready_for_ml ?? 0,
    totalDomains: dataQuality?.total_domains ?? 0,
    criticalGaps: dataQuality?.critical_gaps ?? [],
    totalAnomalies: anomalies?.total_anomalies ?? 0,
    criticalAnomalies: anomalies?.critical_count ?? 0,
    highAnomalies: anomalies?.high_count ?? 0,
    domainsAffected: anomalies?.domains_affected ?? [],
    systemicRisk: anomalies?.systemic_risk_score ?? 0,
    crossDomainAnomalies: crossDomain.length,
    currentRevenue: current,
    budgetRevenue: budget,
    baseScenarioTotal: baseTotal,
    revenueVsBudgetPct: vsBudget,
    revenueConfidence: Math.round(revConfidence * 100),
    totalAtRisk: churnReport?.total_at_risk ?? 0,
    totalAnalyzed: churnReport?.total_analyzed ?? 0,
    avgMLScore: churnReport?.avg_ml_score ?? 0,
    avgRuleScore: churnReport?.avg_rule_score ?? 0,
    significantDiscrepancies:
      churnReport?.significant_discrepancies ?? 0,
    totalSegments: segments.length,
    silhouette: segmentation?.silhouette_score ?? 0,
    dormantPct: dormant?.percentage ?? 0,
    championPct: champion?.percentage ?? 0,
    atRiskSegmentMembers: atRisk?.member_count ?? 0,
    atRiskRevenuePct: atRisk?.revenue_contribution_pct ?? 0,
    atRiskChurnPct: atRisk?.churn_risk_pct ?? 0,
    totalModels: modelHealth?.total_models ?? 0,
    healthyModels: modelHealth?.healthy_count ?? 0,
    degradedModels: modelHealth?.degraded_count ?? 0,
    retrainNeeded: modelHealth?.retrain_needed_count ?? 0,
    avgAccuracy: modelHealth?.avg_accuracy ?? 0,
    anyDrift: modelHealth?.any_drift ?? false,
    driftedModels: drifted.map((m) => ({
      display_name: m.display_name,
      drift_magnitude: m.drift_magnitude,
    })),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

const ML_MODEL_DEGRADATION: SignalDefinition = {
  id: "ml_model_degradation",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "ML model degradation detected — accuracy or drift issues",
  ttl: 300_000,
};

const ML_PREDICTION_CONFIDENCE_DROP: SignalDefinition = {
  id: "ml_prediction_confidence_drop",
  targetDomains: ["global"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "ML prediction confidence low — data quality issues",
  ttl: 300_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  DATA_QUALITY_LOW: 60,
  DATA_QUALITY_HEALTHY: 80,
  REVENUE_VARIANCE_PCT: 10,
  DEMAND_SPIKE_PCT: 75,
  DORMANT_PCT: 15,
  AT_RISK_REVENUE_MIN_PCT: 10,
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (10 rules × 3 layers)
//
// Layer mapping (F35 custom → AdvisorLayer):
//   model_health → "health"
//   predictions  → "prediction"
//   insights     → "micro"
// ═══════════════════════════════════════════════════════════

// ── Layer 1: Model Health (health) ────────────────────────

const R1_DATA_QUALITY_LOW: RuleDefinition<MLContext> = {
  id: "R1_DATA_QUALITY_LOW",
  name: "Data quality baja",
  layer: "health",
  domain: "ml_intelligence",
  priority: 100,
  emitSignals: [ML_PREDICTION_CONFIDENCE_DROP],
  evaluate: (ctx) => {
    if (ctx.dataQualityScore >= THRESHOLDS.DATA_QUALITY_LOW) return null;
    return buildInsight({
      id: generateInsightId("ml_intelligence", "R1_DATA_QUALITY_LOW"),
      impact: "high",
      title: `Data quality: ${ctx.dataQualityScore}/100 — predicciones poco confiables`,
      reasoning:
        `Solo ${ctx.domainsReadyForML} de ${ctx.totalDomains} dominios tienen calidad suficiente para ML. ` +
        `Gaps críticos: ${ctx.criticalGaps.join("; ")}. ` +
        `Las predicciones con data de baja calidad pueden ser engañosas.`,
      confidence: 90,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "ml_intelligence",
        tool: "get_data_quality_report",
        params: {},
        approval_level: "auto",
        label: "Ver reporte de calidad",
      },
    });
  },
};

const R2_MODEL_DRIFT: RuleDefinition<MLContext> = {
  id: "R2_MODEL_DRIFT",
  name: "Drift detectado en modelos",
  layer: "health",
  domain: "ml_intelligence",
  priority: 100,
  emitSignals: [ML_MODEL_DEGRADATION],
  evaluate: (ctx) => {
    if (!ctx.anyDrift) return null;
    return buildInsight({
      id: generateInsightId("ml_intelligence", "R2_MODEL_DRIFT"),
      impact: "medium",
      title: `${ctx.driftedModels.length} modelo(s) con drift detectado`,
      reasoning:
        `${ctx.driftedModels.map((m) => m.display_name).join(", ")}: los patrones han cambiado desde el entrenamiento. ` +
        `Drift magnitude: ${ctx.driftedModels.map((m) => m.drift_magnitude.toFixed(2)).join(", ")}. ` +
        `Reentrenar con data reciente para mantener precisión.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R3_RETRAIN_NEEDED: RuleDefinition<MLContext> = {
  id: "R3_RETRAIN_NEEDED",
  name: "Modelos necesitan reentrenamiento",
  layer: "health",
  domain: "ml_intelligence",
  priority: 100,
  emitSignals: [ML_MODEL_DEGRADATION],
  evaluate: (ctx) => {
    if (ctx.retrainNeeded === 0) return null;
    return buildInsight({
      id: generateInsightId("ml_intelligence", "R3_RETRAIN_NEEDED"),
      impact: "medium",
      title: `${ctx.retrainNeeded} modelo(s) necesitan reentrenamiento`,
      reasoning:
        `${ctx.retrainNeeded} modelo(s) marcados como 'retrain_needed'. ` +
        `Accuracy promedio del sistema: ${ctx.avgAccuracy.toFixed(1)}%. ` +
        `Sin reentrenamiento, la precisión degradará progresivamente.`,
      confidence: 88,
      target_view: "intelligence",
    });
  },
};

const R4_ALL_HEALTHY: RuleDefinition<MLContext> = {
  id: "R4_ALL_HEALTHY",
  name: "Todos los modelos saludables",
  layer: "health",
  domain: "ml_intelligence",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.totalModels === 0) return null;
    if (ctx.degradedModels > 0 || ctx.retrainNeeded > 0) return null;
    if (ctx.dataQualityScore < THRESHOLDS.DATA_QUALITY_HEALTHY) return null;
    return buildInsight({
      id: generateInsightId("ml_intelligence", "R4_ALL_HEALTHY"),
      impact: "low",
      title: `Todos los modelos saludables — accuracy ${ctx.avgAccuracy.toFixed(0)}%`,
      reasoning:
        `${ctx.totalModels} modelos activos, todos healthy. ` +
        `Data quality: ${ctx.dataQualityScore}/100. Sin drift. Sin reentrenamiento necesario. ` +
        `El sistema de inteligencia está operando en condiciones óptimas.`,
      confidence: 95,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2: Predictions (prediction) ─────────────────────

const R5_REVENUE_VARIANCE: RuleDefinition<MLContext> = {
  id: "R5_REVENUE_VARIANCE",
  name: "Varianza significativa en forecast de revenue",
  layer: "prediction",
  domain: "ml_intelligence",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.revenueForecast === null) return null;
    const absVar = Math.abs(ctx.revenueVsBudgetPct);
    if (absVar <= THRESHOLDS.REVENUE_VARIANCE_PCT) return null;
    const direction =
      ctx.revenueVsBudgetPct > 0 ? "superior" : "inferior";
    return buildInsight({
      id: generateInsightId(
        "ml_intelligence",
        "R5_REVENUE_VARIANCE",
      ),
      impact: ctx.revenueVsBudgetPct < -10 ? "high" : "medium",
      title: `Revenue Q3: ${direction} al budget por ${absVar.toFixed(1)}%`,
      reasoning:
        `El forecast base muestra ₡${(ctx.baseScenarioTotal / 1_000_000).toFixed(1)}M para Q3, ` +
        `${direction} al budget por ${absVar.toFixed(1)}%. ` +
        `Revenue actual: ₡${(ctx.currentRevenue / 1_000_000).toFixed(1)}M/mes vs budget ₡${(ctx.budgetRevenue / 1_000_000).toFixed(1)}M/mes. ` +
        `${ctx.revenueVsBudgetPct < -10 ? "Acción correctiva necesaria." : "Oportunidad de inversión adicional."}`,
      confidence: ctx.revenueConfidence,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "ml_intelligence",
        tool: "get_revenue_forecast",
        params: {},
        approval_level: "auto",
        label: "Ver 3 escenarios",
      },
    });
  },
};

const R6_CHURN_DISCREPANCY: RuleDefinition<MLContext> = {
  id: "R6_CHURN_DISCREPANCY",
  name: "Discrepancia ML vs reglas en churn",
  layer: "prediction",
  domain: "ml_intelligence",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.significantDiscrepancies === 0) return null;
    return buildInsight({
      id: generateInsightId(
        "ml_intelligence",
        "R6_CHURN_DISCREPANCY",
      ),
      impact: "medium",
      title: `${ctx.significantDiscrepancies} discrepancia(s) significativa(s) ML vs Reglas`,
      reasoning:
        `El modelo ML y las reglas difieren por >15 puntos en ${ctx.significantDiscrepancies} miembro(s). ` +
        `ML promedio: ${ctx.avgMLScore.toFixed(0)}%, Reglas: ${ctx.avgRuleScore.toFixed(0)}%. ` +
        `ML detecta patrones que las reglas no capturan (ej: communication drop como leading indicator). ` +
        `Revisar los casos discrepantes — ML podría estar viendo algo real.`,
      confidence: 82,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "ml_intelligence",
        tool: "get_churn_ml_scores",
        params: {},
        approval_level: "auto",
        label: "Ver discrepancias",
      },
    });
  },
};

const R7_DEMAND_SPIKE: RuleDefinition<MLContext> = {
  id: "R7_DEMAND_SPIKE",
  name: "Spike de demanda forecast",
  layer: "prediction",
  domain: "ml_intelligence",
  priority: 200,
  evaluate: (ctx) => {
    const demandF = ctx.demandForecasts.find(
      (f) => f.target === "facility_occupancy",
    );
    if (!demandF) return null;
    const nextPoint = demandF.forecast_points[0];
    if (!nextPoint || nextPoint.predicted_value <= THRESHOLDS.DEMAND_SPIKE_PCT)
      return null;
    return buildInsight({
      id: generateInsightId("ml_intelligence", "R7_DEMAND_SPIKE"),
      impact: "high",
      title: `Ocupación forecast: ${nextPoint.predicted_value.toFixed(0)}% — capacidad límite`,
      reasoning:
        `El forecast de ocupación muestra ${nextPoint.predicted_value.toFixed(0)}% para ${nextPoint.period}. ` +
        `Con intervalo de confianza hasta ${nextPoint.upper_bound.toFixed(0)}%. ` +
        `Si la demanda supera el 80%, habrá rechazos de reserva y mala experiencia. ` +
        `Preparar: horarios extendidos, gestión de demanda, pricing dinámico.`,
      confidence: Math.round(nextPoint.confidence * 100),
      target_view: "intelligence",
    });
  },
};

// ── Layer 3: Insights (micro) ─────────────────────────────

const R8_CROSS_DOMAIN_ANOMALY: RuleDefinition<MLContext> = {
  id: "R8_CROSS_DOMAIN_ANOMALY",
  name: "Anomalía cross-domain",
  layer: "micro",
  domain: "ml_intelligence",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.crossDomainAnomalies === 0) return null;
    const allAnomalies = ctx.anomalies?.anomalies ?? [];
    const crossDomain = allAnomalies.filter(
      (a) => a.affected_domains.length > 1,
    );
    const worst = crossDomain.reduce(
      (w, a) =>
        a.severity === "high" || a.severity === "critical" ? a : w,
      crossDomain[0],
    );
    return buildInsight({
      id: generateInsightId(
        "ml_intelligence",
        "R8_CROSS_DOMAIN_ANOMALY",
      ),
      impact: "high",
      title: `Anomalía cross-domain: ${worst.metric} (${worst.domain})`,
      reasoning:
        `${worst.explanation} ` +
        `Afecta ${worst.affected_domains.length} dominios: ${worst.affected_domains.join(", ")}. ` +
        `Riesgo sistémico: ${ctx.systemicRisk}/100.`,
      confidence: Math.round(worst.confidence * 100),
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "ml_intelligence",
        tool: "get_anomaly_report",
        params: {},
        approval_level: "auto",
        label: "Ver anomalías",
      },
    });
  },
};

const R9_HIGH_VALUE_AT_RISK: RuleDefinition<MLContext> = {
  id: "R9_HIGH_VALUE_AT_RISK",
  name: "Segmento alto valor en riesgo",
  layer: "micro",
  domain: "ml_intelligence",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.totalSegments === 0) return null;
    if (ctx.atRiskRevenuePct < THRESHOLDS.AT_RISK_REVENUE_MIN_PCT)
      return null;
    return buildInsight({
      id: generateInsightId(
        "ml_intelligence",
        "R9_HIGH_VALUE_AT_RISK",
      ),
      impact: "high",
      title: `Segmento 'En Riesgo': ${ctx.atRiskSegmentMembers} miembros, ${ctx.atRiskRevenuePct}% del revenue`,
      reasoning:
        `${ctx.atRiskSegmentMembers} miembros en el segmento at_risk. ` +
        `Contribuyen ${ctx.atRiskRevenuePct}% del revenue. ` +
        `Churn risk: ${ctx.atRiskChurnPct}%. ` +
        `Si ${ctx.atRiskChurnPct}% se van, pérdida estimada: ₡${((ctx.atRiskRevenuePct / 100) * ctx.currentRevenue * 3 / 1_000_000).toFixed(1)}M/trimestre.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "ml_intelligence",
        tool: "get_member_segments",
        params: {},
        approval_level: "auto",
        label: "Ver segmentación",
      },
    });
  },
};

const R10_DORMANT_GROWING: RuleDefinition<MLContext> = {
  id: "R10_DORMANT_GROWING",
  name: "Segmento dormiente creciente",
  layer: "micro",
  domain: "ml_intelligence",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.dormantPct < THRESHOLDS.DORMANT_PCT) return null;
    return buildInsight({
      id: generateInsightId(
        "ml_intelligence",
        "R10_DORMANT_GROWING",
      ),
      impact: "medium",
      title: `Segmento dormiente: ${ctx.dormantPct.toFixed(0)}% de miembros`,
      reasoning:
        `${ctx.dormantPct.toFixed(0)}% de los miembros están dormientes (0 o casi 0 actividad). ` +
        `Para estos socios, evaluar: ¿vale la pena retenerlos? ` +
        `Si sí: programa de reactivación agresivo. Si no: plan de offboarding elegante.`,
      confidence: 78,
      target_view: "intelligence",
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const ML_RULES: RuleDefinition<MLContext>[] = [
  R1_DATA_QUALITY_LOW,
  R2_MODEL_DRIFT,
  R3_RETRAIN_NEEDED,
  R4_ALL_HEALTHY,
  R5_REVENUE_VARIANCE,
  R6_CHURN_DISCREPANCY,
  R7_DEMAND_SPIKE,
  R8_CROSS_DOMAIN_ANOMALY,
  R9_HIGH_VALUE_AT_RISK,
  R10_DORMANT_GROWING,
];

export const ML_HEALTH_FACTORS: HealthFactorDef<MLContext>[] = [
  {
    id: "data_quality",
    label: "Calidad de datos",
    compute: (ctx) => ctx.dataQualityScore,
    weight: 0.30,
  },
  {
    id: "model_accuracy",
    label: "Precisión de modelos",
    compute: (ctx) => Math.min(100, Math.round(ctx.avgAccuracy)),
    weight: 0.25,
  },
  {
    id: "model_health",
    label: "Salud del ecosistema",
    compute: (ctx) => {
      if (ctx.totalModels === 0) return 50;
      const healthy = ctx.totalModels - ctx.degradedModels;
      return Math.round((healthy / ctx.totalModels) * 100);
    },
    weight: 0.20,
  },
  {
    id: "anomaly_burden",
    label: "Carga de anomalías",
    compute: (ctx) => {
      // Inverse: more anomalies = lower score
      return Math.max(0, 100 - ctx.criticalAnomalies * 20 - ctx.highAnomalies * 10);
    },
    weight: 0.15,
  },
  {
    id: "prediction_alignment",
    label: "Alineación de predicciones",
    compute: (ctx) => {
      // ML vs rules agreement
      if (ctx.totalAnalyzed === 0) return 50;
      const agreementPct =
        ((ctx.totalAnalyzed - ctx.significantDiscrepancies) /
          ctx.totalAnalyzed) *
        100;
      return Math.round(agreementPct);
    },
    weight: 0.10,
  },
];