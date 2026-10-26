/**
 * useMemberEngagementAdvisor — 12 rules × 4 layers
 *
 * Layer 0: Diagnostic (3) — health critical, velocity declining, distribution skew
 * Layer 1: Predictive (3) — churn wave, hidden decline, active erosion
 * Layer 2: Prescriptive (3) — reactivation opportunity, wellness gap, referral underperformance
 * Layer 3: Cross-domain (3) — satisfaction divergence, NPS disconnect, financial exposure
 *
 * 0 tokens API, 0ms latency, 100% client-side compute.
 * Consumes cached data from TanStack Query (pre-warmed by shell).
 *
 * Additionally computes:
 * - Health Score (5-factor weighted composite, 0-100)
 * - Engagement Velocity (from monthly_trend, 6 months of data)
 *
 * Reglas aplicadas: #1 tokens (N/A — hook sin UI), #5 production-grade,
 * #9 defensive rendering, #29 check before creating
 */

import { useMemo } from "react";
import type {
  EngagementDashboardResponse,
  EngagementDashboardTrendPoint,
  EngagementDashboardFamily,
  EngagementDashboardRiskFactor,
  EngagementDashboardTrendSummary,
  HealthScoreFactor,
} from "../types";
import type { EngagementVelocity } from "../types";

// ═══ TYPES ═════════════════════════════════════════════════════════════════

type EngLayer = "diagnostic" | "predictive" | "prescriptive" | "cross_domain";
type EngSeverity = "info" | "low" | "medium" | "high" | "critical";
type EngImpact = "low" | "medium" | "high";

export interface EngAction {
  label: string;
  tool: string;
  server: string;
  params?: Record<string, unknown>;
  approval: "AUTO" | "SEMI" | "HITL";
}

export interface EngInsight {
  id: string;
  layer: EngLayer;
  severity: EngSeverity;
  title: string;
  description: string;
  impact: EngImpact;
  confidence: number;
  domain: string;
  action?: EngAction;
  metric?: string;
  metricValue?: string | number;
}

// ═══ INTERNAL CONTEXT ══════════════════════════════════════════════════════

interface EngCtx {
  // Raw
  dashboard: EngagementDashboardResponse | null;
  families: EngagementDashboardFamily[];
  monthlyTrend: EngagementDashboardTrendPoint[];
  riskFactors: EngagementDashboardRiskFactor[];
  trendSummary: EngagementDashboardTrendSummary;

  // Health Score
  healthScore: number;
  healthGrade: string;
  healthFactors: HealthScoreFactor[];
  velocity: EngagementVelocity | null;

  // Core metrics
  totalFamilies: number;
  totalMembers: number;
  activeRatio30d: number;
  activeRatio90d: number;
  avgScore: number;
  atRiskCount: number;
  dormantCount: number;
  improvingCount: number;
  decliningCount: number;
  npsScore: number;
  wellnessPct: number;
  referralPct: number;

  // Velocity-derived
  velocityPerWeek: number;
  trajectory: "improving" | "stable" | "declining";
  projection90d: number;

  // Distribution
  atRiskPct: number;
  dormantPct: number;
  atRiskDormantPct: number;

  // Family-level aggregates
  hiddenDeclineCount: number;
  recoveringCount: number;
  wellnessGapCount: number;
  wellnessGapPct: number;

  // Cross-domain (optional)
  satisfactionNps?: number;
  satisfactionTrend?: string;
}

// ═══ VELOCITY COMPUTATION ══════════════════════════════════════════════════

/**
 * Compute engagement velocity from monthly trend data.
 * Uses last 3 months to derive velocity, acceleration, and trajectory.
 * Pure mathematical derivation — no backend calls.
 */
function computeVelocity(
  trend: EngagementDashboardTrendPoint[],
): EngagementVelocity | null {
  if (trend.length < 2) return null;

  const current = trend[trend.length - 1];
  const oneMonthAgo = trend[trend.length - 2];
  const twoMonthsAgo = trend.length >= 3 ? trend[trend.length - 3] : oneMonthAgo;

  const currentScore = current.avg_score;
  const score30d = oneMonthAgo.avg_score;
  const score60d = twoMonthsAgo.avg_score;

  // Velocity: points change per week (4.33 weeks/month)
  const velocityPerWeek = (currentScore - score30d) / 4.33;
  const prevVelocityPerWeek = (score30d - score60d) / 4.33;
  const acceleration = velocityPerWeek - prevVelocityPerWeek;

  // Trajectory: consistent direction over available months
  let traj: "improving" | "stable" | "declining" = "stable";
  if (trend.length >= 3) {
    const last3 = trend.slice(-3);
    const deltas = last3.slice(1).map((t, i) => t.avg_score - last3[i].avg_score);
    const allUp = deltas.every((d) => d > 0.3);
    const allDown = deltas.every((d) => d < -0.3);
    if (allUp) traj = "improving";
    else if (allDown) traj = "declining";
  } else if (trend.length === 2) {
    const delta = currentScore - score30d;
    if (delta > 1) traj = "improving";
    else if (delta < -1) traj = "declining";
  }

  // 90d projection (12.86 weeks in 90 days)
  const rawProjection = currentScore + velocityPerWeek * 12.86;
  const projection90d = Math.max(0, Math.min(100, Math.round(rawProjection)));

  // Range: ± 2× acceleration magnitude over 13 weeks
  const rangeWidth = Math.abs(acceleration) * 13 * 2;
  const projectionRange: [number, number] = [
    Math.max(0, Math.round(projection90d - rangeWidth)),
    Math.min(100, Math.round(projection90d + rangeWidth)),
  ];

  return {
    current_score: Math.round(currentScore * 10) / 10,
    score_30d: Math.round(score30d * 10) / 10,
    score_60d: Math.round(score60d * 10) / 10,
    velocity_per_week: Math.round(velocityPerWeek * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    trajectory: traj,
    projection_90d: projection90d,
    projection_range: projectionRange,
  };
}

// ═══ HEALTH SCORE COMPUTATION ══════════════════════════════════════════════

/**
 * 5-factor composite health score (0-100).
 *
 * 1. Activity Pulse (25%)  — active_30d / total  — "¿Vienen?"
 * 2. Engagement Depth (25%) — avg_score / 100    — "¿Participan?"
 * 3. Risk Balance (20%)    — 1 - at_risk/total   — "¿Cuántos en riesgo?"
 * 4. NPS Signal (15%)      — (nps+100)/200       — "¿Recomiendan?"
 * 5. Growth Vector (15%)   — (improving-declining)/total — "¿Dirección neta?"
 */
function computeHealthScore(
  summary: EngagementDashboardResponse["summary"],
  trendSummary: EngagementDashboardTrendSummary,
): { score: number; grade: string; factors: HealthScoreFactor[] } {
  const tf = summary.total_families || 1;

  const activityPulse = Math.min(1, summary.active_30d / tf);
  const engagementDepth = Math.min(1, summary.avg_score / 100);
  const riskBalance = 1 - Math.min(1, summary.at_risk_count / tf);
  const npsSignal = Math.max(0, Math.min(1, (summary.nps_score + 100) / 200));
  const netGrowth = (trendSummary.improving - trendSummary.declining) / tf;
  const growthVector = Math.max(0, Math.min(1, (netGrowth + 1) / 2));

  const raw =
    activityPulse * 25 +
    engagementDepth * 25 +
    riskBalance * 20 +
    npsSignal * 15 +
    growthVector * 15;

  const score = Math.round(Math.min(100, Math.max(0, raw)));
  const grade =
    score >= 90 ? "A" :
    score >= 80 ? "B+" :
    score >= 70 ? "B" :
    score >= 60 ? "C" :
    score >= 45 ? "D" : "F";

  const r = (v: number, w: number) => Math.round(v * w * 10) / 10;
  const factors: HealthScoreFactor[] = [
    { label: "Activity Pulse", value: activityPulse, weight: 25, contribution: r(activityPulse, 25) },
    { label: "Engagement Depth", value: engagementDepth, weight: 25, contribution: r(engagementDepth, 25) },
    { label: "Risk Balance", value: riskBalance, weight: 20, contribution: r(riskBalance, 20) },
    { label: "NPS Signal", value: npsSignal, weight: 15, contribution: r(npsSignal, 15) },
    { label: "Growth Vector", value: growthVector, weight: 15, contribution: r(growthVector, 15) },
  ];

  return { score, grade, factors };
}

// ═══ CONTEXT BUILDER ═══════════════════════════════════════════════════════

function buildCtx(
  dashboard: EngagementDashboardResponse | null,
  satisfactionNps?: number,
  satisfactionTrend?: "improving" | "stable" | "declining",
): EngCtx {
  if (!dashboard) {
    return {
      dashboard: null, families: [], monthlyTrend: [], riskFactors: [],
      trendSummary: { improving: 0, stable: 0, declining: 0 },
      healthScore: 0, healthGrade: "F", healthFactors: [], velocity: null,
      totalFamilies: 0, totalMembers: 0,
      activeRatio30d: 0, activeRatio90d: 0, avgScore: 0,
      atRiskCount: 0, dormantCount: 0, improvingCount: 0, decliningCount: 0,
      npsScore: 0, wellnessPct: 0, referralPct: 0,
      velocityPerWeek: 0, trajectory: "stable", projection90d: 0,
      atRiskPct: 0, dormantPct: 0, atRiskDormantPct: 0,
      hiddenDeclineCount: 0, recoveringCount: 0,
      wellnessGapCount: 0, wellnessGapPct: 0,
      satisfactionNps, satisfactionTrend,
    };
  }

  const { summary, families, monthly_trend, risk_factors, trend_summary } = dashboard;
  const tf = summary.total_families || 1;

  // Health + velocity
  const health = computeHealthScore(summary, trend_summary);
  const velocity = computeVelocity(monthly_trend);

  // Family-level aggregates
  const hiddenDecline = families.filter(
    (f) => f.engagement_score > 50 && f.trend_pct < -3,
  );
  const recovering = families.filter(
    (f) =>
      (f.engagement_level === "at_risk" || f.engagement_level === "dormant") &&
      f.trend === "improving",
  );
  const activeNoWellness = families.filter(
    (f) => f.engagement_score >= 60 && !f.wellness_active,
  );

  return {
    dashboard, families, monthlyTrend: monthly_trend,
    riskFactors: risk_factors, trendSummary: trend_summary,
    healthScore: health.score, healthGrade: health.grade,
    healthFactors: health.factors, velocity,
    totalFamilies: tf, totalMembers: summary.total_members,
    activeRatio30d: summary.active_30d / tf,
    activeRatio90d: summary.active_90d / tf,
    avgScore: summary.avg_score,
    atRiskCount: summary.at_risk_count,
    dormantCount: summary.dormant_count,
    improvingCount: summary.improving_count,
    decliningCount: summary.declining_count,
    npsScore: summary.nps_score,
    wellnessPct: summary.wellness_participation_pct,
    referralPct: summary.referral_rate_pct,
    velocityPerWeek: velocity?.velocity_per_week ?? 0,
    trajectory: velocity?.trajectory ?? "stable",
    projection90d: velocity?.projection_90d ?? Math.round(summary.avg_score),
    atRiskPct: summary.at_risk_count / tf,
    dormantPct: summary.dormant_count / tf,
    atRiskDormantPct: (summary.at_risk_count + summary.dormant_count) / tf,
    hiddenDeclineCount: hiddenDecline.length,
    recoveringCount: recovering.length,
    wellnessGapCount: activeNoWellness.length,
    wellnessGapPct: activeNoWellness.length / tf,
    satisfactionNps, satisfactionTrend,
  };
}

// ═══ RULES ══════════════════════════════════════════════════════════════════

interface Rule {
  id: string;
  layer: EngLayer;
  evaluate: (ctx: EngCtx) => EngInsight | null;
}

const SEV_ORDER: Record<EngSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const RULES: Rule[] = [
  // ── Layer 0: Diagnostic ──────────────────────────────────────────────────

  {
    id: "eng_health_critical",
    layer: "diagnostic",
    evaluate: (ctx) => {
      if (ctx.totalFamilies === 0 || ctx.healthScore >= 45) return null;
      const sev: EngSeverity = ctx.healthScore < 30 ? "critical" : "high";
      return {
        id: "eng_health_critical",
        layer: "diagnostic",
        severity: sev,
        title: `Health Score: ${ctx.healthScore}/100 — ${sev === "critical" ? "Crítico" : "Bajo"}`,
        description:
          `El engagement health score de ${ctx.healthScore} indica una base de socios ` +
          `${sev === "critical" ? "en estado crítico" : "con problemas serios"}. ` +
          `${ctx.atRiskCount} familias en riesgo, ${ctx.dormantCount} dormidas. ` +
          `Actividad 30d: ${ctx.activeRatio30d < 0.5 ? "baja" : "moderada"}, ` +
          `NPS: ${ctx.npsScore}. Requiere atención inmediata.`,
        impact: "high",
        confidence: 92,
        domain: "engagement",
        action: {
          label: "Ver detalles del dashboard",
          tool: "get_engagement_dashboard",
          server: "member_engagement",
          approval: "AUTO",
        },
        metric: "Health Score",
        metricValue: ctx.healthScore,
      };
    },
  },

  {
    id: "eng_velocity_declining",
    layer: "diagnostic",
    evaluate: (ctx) => {
      if (!ctx.velocity || ctx.velocity.velocity_per_week >= -0.5) return null;
      const sev: EngSeverity = ctx.velocity.velocity_per_week < -1.0 ? "high" : "medium";
      return {
        id: "eng_velocity_declining",
        layer: "diagnostic",
        severity: sev,
        title: `Engagement cayendo: ${ctx.velocity.velocity_per_week.toFixed(1)}/semana`,
        description:
          `El engagement score baja a ${Math.abs(ctx.velocity.velocity_per_week).toFixed(1)} pts/semana. ` +
          `Score actual: ${ctx.velocity.current_score}, hace 30d: ${ctx.velocity.score_30d}. ` +
          `Proyección 90d: ${ctx.velocity.projection_90d}/100 ` +
          `(${ctx.velocity.projection_90d < 45 ? "zona crítica" : "en descenso"}). ` +
          `Aceleración ${ctx.velocity.acceleration < 0 ? "negativa — el descenso se acelera" : "estable"}.`,
        impact: sev === "high" ? "high" : "medium",
        confidence: 85,
        domain: "engagement",
        metric: "Velocity",
        metricValue: `${ctx.velocity.velocity_per_week.toFixed(1)}/wk`,
      };
    },
  },

  {
    id: "eng_distribution_skew",
    layer: "diagnostic",
    evaluate: (ctx) => {
      if (ctx.totalFamilies === 0 || ctx.atRiskDormantPct <= 0.40) return null;
      const sev: EngSeverity = ctx.atRiskDormantPct > 0.50 ? "high" : "medium";
      return {
        id: "eng_distribution_skew",
        layer: "diagnostic",
        severity: sev,
        title: `Distribución sesgada: ${(ctx.atRiskDormantPct * 100).toFixed(0)}% en riesgo o dormido`,
        description:
          `${ctx.atRiskCount} en riesgo + ${ctx.dormantCount} dormidas = ` +
          `${(ctx.atRiskDormantPct * 100).toFixed(0)}% de la base. ` +
          `Problema estructural de engagement — no casos aislados. ` +
          `Revisar: onboarding, propuesta de valor, competencia local.`,
        impact: "high",
        confidence: 90,
        domain: "engagement",
        metric: "At Risk + Dormant",
        metricValue: `${(ctx.atRiskDormantPct * 100).toFixed(0)}%`,
      };
    },
  },

  // ── Layer 1: Predictive ──────────────────────────────────────────────────

  {
    id: "eng_churn_wave",
    layer: "predictive",
    evaluate: (ctx) => {
      if (ctx.totalFamilies === 0) return null;
      if (ctx.decliningCount <= ctx.improvingCount * 2 || ctx.decliningCount <= 5) return null;
      const ratio = ctx.decliningCount / Math.max(1, ctx.improvingCount);
      return {
        id: "eng_churn_wave",
        layer: "predictive",
        severity: "high",
        title: `Ola de churn: ${ctx.decliningCount} familias bajando vs ${ctx.improvingCount} mejorando`,
        description:
          `Ratio declive/mejora: ${ratio.toFixed(1)}:1 — esto no es churn individual, es una ola. ` +
          `Las causas probables son sistémicas: insatisfacción con servicios, competencia, ` +
          `o cambio demográfico. Diagnóstico profundo de las top ${Math.min(5, ctx.decliningCount)} familias.`,
        impact: "high",
        confidence: 80,
        domain: "engagement",
        action: {
          label: "Identificar familias en declive",
          tool: "get_engagement_insights",
          server: "member_engagement",
          approval: "AUTO",
        },
        metric: "Ratio declive/mejora",
        metricValue: `${ratio.toFixed(1)}:1`,
      };
    },
  },

  {
    id: "eng_hidden_decline",
    layer: "predictive",
    evaluate: (ctx) => {
      if (ctx.hiddenDeclineCount <= 3) return null;
      const examples = ctx.families
        .filter((f) => f.engagement_score > 50 && f.trend_pct < -3)
        .slice(0, 3)
        .map((f) => f.family_name);
      return {
        id: "eng_hidden_decline",
        layer: "predictive",
        severity: "medium",
        title: `${ctx.hiddenDeclineCount} familias con score decente pero en declive acelerado`,
        description:
          `${ctx.hiddenDeclineCount} familias con score >50 pero trend < -3% — no flagged como "en riesgo" ` +
          `pero cayendo rápido. Ejemplos: ${examples.join(", ")}. ` +
          `Caerán a "at risk" en 4-8 semanas si no se interviene. ` +
          `La ventana de intervención es AHORA.`,
        impact: "medium",
        confidence: 75,
        domain: "engagement",
        metric: "Hidden decline",
        metricValue: ctx.hiddenDeclineCount,
      };
    },
  },

  {
    id: "eng_active_erosion",
    layer: "predictive",
    evaluate: (ctx) => {
      if (ctx.totalFamilies === 0 || ctx.activeRatio90d === 0) return null;
      const erosionRate = ctx.activeRatio30d / ctx.activeRatio90d;
      if (erosionRate >= 0.70) return null;
      const sev: EngSeverity = erosionRate < 0.55 ? "high" : "medium";
      return {
        id: "eng_active_erosion",
        layer: "predictive",
        severity: sev,
        title: `Erosión de actividad: ratio 30d/90d = ${(erosionRate * 100).toFixed(0)}%`,
        description:
          `De ${Math.round(ctx.activeRatio90d * ctx.totalFamilies)} activos en 90d, ` +
          `solo ${Math.round(ctx.activeRatio30d * ctx.totalFamilies)} en 30d. ` +
          `Ratio ${(erosionRate * 100).toFixed(0)}% — ` +
          `${erosionRate < 0.55 ? "caída dramática" : "erosión significativa"}. ` +
          `Esto precede al churn: primero dejan de visitar, luego cancelan.`,
        impact: sev === "high" ? "high" : "medium",
        confidence: 88,
        domain: "engagement",
        metric: "Erosion ratio",
        metricValue: `${(erosionRate * 100).toFixed(0)}%`,
      };
    },
  },

  // ── Layer 2: Prescriptive ────────────────────────────────────────────────

  {
    id: "eng_reactivation_opportunity",
    layer: "prescriptive",
    evaluate: (ctx) => {
      if (ctx.recoveringCount === 0) return null;
      const names = ctx.families
        .filter(
          (f) =>
            (f.engagement_level === "at_risk" || f.engagement_level === "dormant") &&
            f.trend === "improving",
        )
        .slice(0, 3)
        .map((f) => f.family_name);
      return {
        id: "eng_reactivation_opportunity",
        layer: "prescriptive",
        severity: "low",
        title: `${ctx.recoveringCount} familias en riesgo pero mejorando — oportunidad de reactivación`,
        description:
          `${ctx.recoveringCount} familias at_risk/dormant con trend positivo. ` +
          `Ejemplos: ${names.join(", ")}. ` +
          `En punto de inflexión: una intervención oportuna (llamada, invitación a evento) ` +
          `consolida la mejora. Costo mínimo vs LTV recuperado.`,
        impact: "medium",
        confidence: 78,
        domain: "engagement",
        action: {
          label: "Diseñar campaña de reactivación",
          tool: "design_reactivation_campaign",
          server: "member_engagement",
          params: { target_level: "at_risk", action: "create" },
          approval: "HITL",
        },
        metric: "Recovering",
        metricValue: ctx.recoveringCount,
      };
    },
  },

  {
    id: "eng_wellness_gap",
    layer: "prescriptive",
    evaluate: (ctx) => {
      if (ctx.totalFamilies === 0 || ctx.wellnessGapPct <= 0.30) return null;
      return {
        id: "eng_wellness_gap",
        layer: "prescriptive",
        severity: "medium",
        title: `${ctx.wellnessGapCount} familias activas sin wellness — ${(ctx.wellnessGapPct * 100).toFixed(0)}%`,
        description:
          `De las familias con score ≥60, ${ctx.wellnessGapCount} ` +
          `(${(ctx.wellnessGapPct * 100).toFixed(0)}%) no usan wellness. ` +
          `Cross-sell: ya comprometidas pero sin descubrir wellness. ` +
          `Targeted communication con trial personalizado.`,
        impact: "medium",
        confidence: 72,
        domain: "engagement",
        action: {
          label: "Ver familias sin wellness",
          tool: "get_engagement_insights",
          server: "member_engagement",
          approval: "AUTO",
        },
        metric: "Wellness gap",
        metricValue: `${(ctx.wellnessGapPct * 100).toFixed(0)}%`,
      };
    },
  },

  {
    id: "eng_referral_opportunity",
    layer: "prescriptive",
    evaluate: (ctx) => {
      if (ctx.referralPct >= 5 || ctx.avgScore <= 65 || ctx.totalFamilies === 0) return null;
      return {
        id: "eng_referral_opportunity",
        layer: "prescriptive",
        severity: "medium",
        title: `Score alto (${ctx.avgScore.toFixed(0)}) pero referidos bajos (${ctx.referralPct.toFixed(1)}%)`,
        description:
          `Socios satisfechos (score ${ctx.avgScore.toFixed(0)}/100) pero tasa de referidos ` +
          `${ctx.referralPct.toFixed(1)}% — bajo el 5% esperado para clubes premium. ` +
          `Los socios contentos son el mejor canal de adquisición. ` +
          `Implementar: programa de referidos con incentivos (puntos, VIP).`,
        impact: "medium",
        confidence: 78,
        domain: "engagement",
        action: {
          label: "Gestionar referidos",
          tool: "manage_referrals",
          server: "member_engagement",
          params: { action: "list" },
          approval: "AUTO",
        },
        metric: "Referral rate",
        metricValue: `${ctx.referralPct.toFixed(1)}%`,
      };
    },
  },

  // ── Layer 3: Cross-domain ────────────────────────────────────────────────

  {
    id: "eng_satisfaction_divergence",
    layer: "cross_domain",
    evaluate: (ctx) => {
      if (!ctx.satisfactionTrend) return null;
      const engOk = ctx.trajectory === "improving" || ctx.trajectory === "stable";
      if (ctx.satisfactionTrend !== "declining" || !engOk) return null;
      return {
        id: "eng_satisfaction_divergence",
        layer: "cross_domain",
        severity: "medium",
        title: "Divergencia: satisfaction bajando pero engagement estable",
        description:
          `La satisfacción está en declive pero el engagement se mantiene. ` +
          `Señal temprana: socios siguen viniendo pero no contentos. ` +
          `Si no se atiende la causa, el engagement caerá en 4-8 semanas. ` +
          `El engagement es indicador rezagado — actuar sobre satisfaction AHORA.`,
        impact: "medium",
        confidence: 70,
        domain: "engagement × satisfaction",
        metric: "Divergencia",
        metricValue: "SAT ↓ / ENG →",
      };
    },
  },

  {
    id: "eng_nps_disconnect",
    layer: "cross_domain",
    evaluate: (ctx) => {
      if (ctx.npsScore >= 0 || ctx.avgScore <= 60 || ctx.totalFamilies === 0) return null;
      return {
        id: "eng_nps_disconnect",
        layer: "cross_domain",
        severity: "medium",
        title: `Desconexión NPS: engagement ${ctx.avgScore.toFixed(0)} pero NPS ${ctx.npsScore}`,
        description:
          `Score sugiere socios comprometidos (${ctx.avgScore.toFixed(0)}/100) ` +
          `pero NPS es ${ctx.npsScore} — detractores entre los "engaged". ` +
          `Ocurre cuando socios participan por inercia o exclusividad, ` +
          `no por satisfacción real. Revisar encuestas para identificar ` +
          `qué molesta a los socios más activos.`,
        impact: "medium",
        confidence: 75,
        domain: "engagement × satisfaction",
        action: {
          label: "Ver análisis de satisfacción",
          tool: "get_satisfaction_intelligence",
          server: "satisfaction",
          approval: "AUTO",
        },
        metric: "NPS vs Score",
        metricValue: `${ctx.npsScore} vs ${ctx.avgScore.toFixed(0)}`,
      };
    },
  },

  {
    id: "eng_financial_exposure",
    layer: "cross_domain",
    evaluate: (ctx) => {
      if (ctx.atRiskCount === 0 || ctx.totalFamilies === 0) return null;
      const exposurePct = ctx.atRiskCount / ctx.totalFamilies;
      const sev: EngSeverity = exposurePct > 0.15 ? "high" : "medium";
      return {
        id: "eng_financial_exposure",
        layer: "cross_domain",
        severity: sev,
        title: `${ctx.atRiskCount} familias en riesgo = ${(exposurePct * 100).toFixed(0)}% de la base`,
        description:
          `${ctx.atRiskCount} de ${ctx.totalFamilies} familias en riesgo de churn. ` +
          `${(exposurePct * 100).toFixed(0)}% de la base activa. ` +
          `Cada familia = ingresos recurrentes (cuotas, consumos, eventos). ` +
          `Pérdida no es solo financiera — churn tiene efecto cascada ` +
          `en el círculo social del socio.`,
        impact: sev === "high" ? "high" : "medium",
        confidence: 65,
        domain: "engagement × finance",
        action: {
          label: "Ver familias en riesgo",
          tool: "get_engagement_insights",
          server: "member_engagement",
          approval: "AUTO",
        },
        metric: "Financial exposure",
        metricValue: `${(exposurePct * 100).toFixed(0)}%`,
      };
    },
  },
];

// ═══ EVALUATION ENGINE ══════════════════════════════════════════════════════

function evaluateRules(rules: Rule[], ctx: EngCtx): EngInsight[] {
  const insights: EngInsight[] = [];
  for (const rule of rules) {
    try {
      const insight = rule.evaluate(ctx);
      if (insight) insights.push(insight);
    } catch {
      // Defensive — skip malformed data
    }
  }
  return insights.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
}

// ═══ HOOK ═══════════════════════════════════════════════════════════════════

/**
 * Engagement Intelligence Advisor — 12 rules × 4 layers.
 *
 * Computes Health Score (5 factors), Velocity (from trend), and
 * 12 advisor insights. All client-side, 0 API tokens, 0ms.
 *
 * @param dashboard — from useMCPQuery("member_engagement", "get_engagement_dashboard")
 * @param satisfactionNps — optional cross-domain NPS from satisfaction domain
 * @param satisfactionTrend — optional cross-domain trend signal
 */
export function useMemberEngagementAdvisor(
  dashboard: EngagementDashboardResponse | null,
  satisfactionNps?: number,
  satisfactionTrend?: "improving" | "stable" | "declining",
) {
  const context = useMemo(
    () => buildCtx(dashboard, satisfactionNps, satisfactionTrend),
    [dashboard, satisfactionNps, satisfactionTrend],
  );

  const insights = useMemo(() => evaluateRules(RULES, context), [context]);
  const topInsights = useMemo(() => insights.slice(0, 3), [insights]);
  const hasHighSeverity = useMemo(
    () => insights.some((i) => i.severity === "high" || i.severity === "critical"),
    [insights],
  );
  const layerCounts = useMemo(() => {
    const counts: Record<EngLayer, number> = {
      diagnostic: 0, predictive: 0, prescriptive: 0, cross_domain: 0,
    };
    for (const i of insights) counts[i.layer]++;
    return counts;
  }, [insights]);

  return {
    // Health score (for EngagementHealthScore component)
    healthScore: context.healthScore,
    healthGrade: context.healthGrade,
    healthFactors: context.healthFactors,
    velocity: context.velocity,

    // Advisor insights (for EngagementAdvisorBanner)
    insights,
    topInsights,
    hasHighSeverity,
    layerCounts,
    totalInsights: insights.length,

    // Trajectory data (for EngagementTrajectoryNavigator)
    families: context.families,
    dashboard: context.dashboard,
  };
}
