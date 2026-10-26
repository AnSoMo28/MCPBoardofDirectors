// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Recommendation Domain Rules
//
// 7 declarative rules migrated from useRecommendationAdvisor (F10→F47).
// 4 layers: macro/actions (R1-R2-R7), prediction/reporting (R3-R4),
//           health/alerts (R5), lifecycle/backlog (R6).
//
// Architecture:
//   RuleDefinition<RecommendationContext> — pure functions, testable
//   buildRecommendationCtx() — derives metrics from raw MCP data
//   RECOMMENDATION_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: rec_pending_actions (P54)
//
// Domain mapping: AIDomain = "engagement" (recommendations is a
//                 sub-domain of engagement/proactive intelligence)
//
// Data source: PricingOptimization[], ActivitySuggestion[],
//              QuarterlyInsight[] from ../types
//
// Created: F47 B5.7 — Recommendation Rules Migration
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

import {
  SuggestionStatus,
  type PricingOptimization,
  type ActivitySuggestion,
  type QuarterlyInsight,
} from "@/features/recommendations/types";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface RecommendationContext extends BaseContext {
  domain: "engagement";

  // Raw inputs
  pricings: PricingOptimization[];
  suggestions: ActivitySuggestion[];
  insights: QuarterlyInsight[];

  // Derived — pricing
  pendingPricings: PricingOptimization[];
  pendingHighRiskPricings: PricingOptimization[];
  totalPricingDelta: number;
  implementedPricings: number;

  // Derived — suggestions
  pendingSuggestions: ActivitySuggestion[];
  highInterestSuggestions: ActivitySuggestion[];
  implementedSuggestions: number;
  totalSuggestions: number;

  // Derived — insights
  latestInsight: QuarterlyInsight | null;
  daysSinceLastInsight: number;
  totalInsights: number;
  latestSatisfactionAvg: number;
  latestRecommendationsCount: number;
  latestAreasForImprovement: string[];
}

function isPending(status: SuggestionStatus): boolean {
  return (
    status === SuggestionStatus.Proposed ||
    status === SuggestionStatus.UnderReview
  );
}

function fmtColones(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}₡${Math.abs(n).toLocaleString("es-CR")}`;
}

export function buildRecommendationCtx(
  rawData: unknown,
  signals?: DomainSignal[],
): RecommendationContext {
  const { pricings, suggestions, insights } = rawData as {
    pricings: PricingOptimization[];
    suggestions: ActivitySuggestion[];
    insights: QuarterlyInsight[];
  };

  // Pricing
  const pendingPricings = pricings.filter((p) => isPending(p.status));
  const pendingHighRiskPricings = pendingPricings.filter(
    (p) => p.risk_level === "high",
  );
  const totalPricingDelta = pendingPricings.reduce(
    (sum, p) => sum + p.expected_revenue_change,
    0,
  );
  const implementedPricings = pricings.filter(
    (p) => p.status === SuggestionStatus.Implemented,
  ).length;

  // Suggestions
  const pendingSuggestions = suggestions.filter((s) =>
    isPending(s.status),
  );
  const highInterestSuggestions = pendingSuggestions.filter(
    (s) =>
      s.estimated_interest >= 70 && s.member_requests_count >= 20,
  );
  const implementedSuggestions = suggestions.filter(
    (s) => s.status === SuggestionStatus.Implemented,
  ).length;

  // Insights
  const sortedInsights = [...insights].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  );
  const latestInsight = sortedInsights[0] ?? null;
  const daysSinceLastInsight = latestInsight
    ? Math.floor(
        (Date.now() - new Date(latestInsight.created_at).getTime()) /
          86_400_000,
      )
    : Infinity;

  return {
    domain: "engagement",
    signals: signals ?? [],
    pricings,
    suggestions,
    insights,
    pendingPricings,
    pendingHighRiskPricings,
    totalPricingDelta,
    implementedPricings,
    pendingSuggestions,
    highInterestSuggestions,
    implementedSuggestions,
    totalSuggestions: suggestions.length,
    latestInsight,
    daysSinceLastInsight,
    totalInsights: insights.length,
    latestSatisfactionAvg: latestInsight?.member_satisfaction_avg ?? 0,
    latestRecommendationsCount:
      latestInsight?.recommendations?.length ?? 0,
    latestAreasForImprovement:
      latestInsight?.areas_for_improvement ?? [],
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

const REC_PENDING_ACTIONS: SignalDefinition = {
  id: "rec_pending_actions",
  targetDomains: ["global", "engagement"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Recommendation actions pending — pricing, suggestions, or reports overdue",
  ttl: 300_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  HIGH_INTEREST_PCT: 70,
  HIGH_INTEREST_REQUESTS: 20,
  SATISFACTION_LOW: 4.0,
  STALE_INSIGHT_DAYS: 90,
  SUGGESTION_BACKLOG: 5,
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (7 rules × 4 layers)
//
// Layer mapping (F10 custom → AdvisorLayer):
//   actions   → "macro"
//   reporting → "prediction"
//   alerts    → "health"
//   backlog   → "lifecycle"
// ═══════════════════════════════════════════════════════════

// ── Layer 1: Actions (macro) ──────────────────────────────

const R1_PENDING_PRICING: RuleDefinition<RecommendationContext> = {
  id: "R1_PENDING_PRICING",
  name: "Optimizaciones de precio pendientes",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  emitSignals: [REC_PENDING_ACTIONS],
  evaluate: (ctx) => {
    if (ctx.pendingPricings.length === 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R1_PENDING_PRICING"),
      impact: ctx.pendingHighRiskPricings.length > 0 ? "high" : "medium",
      title: `${ctx.pendingPricings.length} optimización(es) de precio pendiente(s)`,
      reasoning:
        ctx.pendingHighRiskPricings.length > 0
          ? `${ctx.pendingHighRiskPricings.length} de alto riesgo. Impacto estimado: ${fmtColones(ctx.totalPricingDelta)}`
          : `Impacto total estimado en revenue: ${fmtColones(ctx.totalPricingDelta)}`,
      confidence: 90,
      target_view: "intelligence",
    });
  },
};

const R2_HIGH_INTEREST_SUGGESTIONS: RuleDefinition<RecommendationContext> = {
  id: "R2_HIGH_INTEREST_SUGGESTIONS",
  name: "Sugerencias de alta demanda",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.highInterestSuggestions.length === 0) return null;
    const topNames = ctx.highInterestSuggestions
      .slice(0, 3)
      .map((s) => s.name)
      .join(", ");
    return buildInsight({
      id: generateInsightId(
        "engagement",
        "R2_HIGH_INTEREST_SUGGESTIONS",
      ),
      impact: "high",
      title: `${ctx.highInterestSuggestions.length} sugerencia(s) de alta demanda`,
      reasoning: `${topNames} superan el umbral de interés (≥${THRESHOLDS.HIGH_INTEREST_PCT}%) con solicitudes significativas de socios.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R7_PENDING_RECOMMENDATIONS: RuleDefinition<RecommendationContext> = {
  id: "R7_PENDING_RECOMMENDATIONS",
  name: "Recomendaciones sin implementar",
  layer: "macro",
  domain: "engagement",
  priority: 100,
  emitSignals: [REC_PENDING_ACTIONS],
  evaluate: (ctx) => {
    if (!ctx.latestInsight || ctx.latestRecommendationsCount === 0)
      return null;
    const top = ctx.latestInsight.recommendations
      .slice(0, 2)
      .join("; ");
    return buildInsight({
      id: generateInsightId(
        "engagement",
        "R7_PENDING_RECOMMENDATIONS",
      ),
      impact: "medium",
      title: `${ctx.latestRecommendationsCount} recomendación(es) del último informe sin implementar`,
      reasoning: `${ctx.latestInsight.period} ${ctx.latestInsight.year} sugiere: ${top}`,
      confidence: 75,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2: Reporting (prediction) ───────────────────────

const R3_NO_INSIGHTS: RuleDefinition<RecommendationContext> = {
  id: "R3_NO_INSIGHTS",
  name: "Sin informes trimestrales",
  layer: "prediction",
  domain: "engagement",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.totalInsights > 0) return null;
    return buildInsight({
      id: generateInsightId("engagement", "R3_NO_INSIGHTS"),
      impact: "medium",
      title: "Sin informes trimestrales",
      reasoning:
        "No se ha generado ningún informe. Generar uno proporcionará visibilidad del rendimiento del club y áreas de mejora.",
      confidence: 95,
      target_view: "intelligence",
    });
  },
};

const R4_STALE_INSIGHTS: RuleDefinition<RecommendationContext> = {
  id: "R4_STALE_INSIGHTS",
  name: "Informe desactualizado",
  layer: "prediction",
  domain: "engagement",
  priority: 200,
  evaluate: (ctx) => {
    if (
      ctx.daysSinceLastInsight <= THRESHOLDS.STALE_INSIGHT_DAYS ||
      ctx.daysSinceLastInsight === Infinity
    )
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R4_STALE_INSIGHTS"),
      impact: "medium",
      title: `Último informe hace ${ctx.daysSinceLastInsight} días`,
      reasoning: `${ctx.latestInsight!.period} ${ctx.latestInsight!.year} fue generado hace más de 3 meses. Un informe actualizado capturaría la actividad reciente.`,
      confidence: 88,
      target_view: "intelligence",
    });
  },
};

// ── Layer 3: Alerts (health) ──────────────────────────────

const R5_LOW_SATISFACTION: RuleDefinition<RecommendationContext> = {
  id: "R5_LOW_SATISFACTION",
  name: "Satisfacción baja",
  layer: "health",
  domain: "engagement",
  priority: 300,
  evaluate: (ctx) => {
    if (
      !ctx.latestInsight ||
      ctx.latestSatisfactionAvg >= THRESHOLDS.SATISFACTION_LOW
    )
      return null;
    const areas = ctx.latestAreasForImprovement
      .slice(0, 2)
      .join("; ");
    return buildInsight({
      id: generateInsightId("engagement", "R5_LOW_SATISFACTION"),
      impact: "high",
      title: "Satisfacción del socio por debajo del objetivo",
      reasoning: `${ctx.latestInsight.period} ${ctx.latestInsight.year}: ${ctx.latestSatisfactionAvg.toFixed(1)}/5.0. Áreas críticas: ${areas || "por definir"}`,
      confidence: 88,
      target_view: "intelligence",
    });
  },
};

// ── Layer 4: Backlog (lifecycle) ──────────────────────────

const R6_SUGGESTION_BACKLOG: RuleDefinition<RecommendationContext> = {
  id: "R6_SUGGESTION_BACKLOG",
  name: "Backlog de sugerencias",
  layer: "lifecycle",
  domain: "engagement",
  priority: 400,
  emitSignals: [REC_PENDING_ACTIONS],
  evaluate: (ctx) => {
    if (ctx.pendingSuggestions.length < THRESHOLDS.SUGGESTION_BACKLOG)
      return null;
    return buildInsight({
      id: generateInsightId("engagement", "R6_SUGGESTION_BACKLOG"),
      impact: "medium",
      title: `${ctx.pendingSuggestions.length} sugerencias acumuladas sin revisar`,
      reasoning:
        "Hay un backlog significativo de sugerencias pendientes. Revisarlas demuestra compromiso con la comunidad de socios.",
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const RECOMMENDATION_RULES: RuleDefinition<RecommendationContext>[] = [
  R1_PENDING_PRICING,
  R2_HIGH_INTEREST_SUGGESTIONS,
  R3_NO_INSIGHTS,
  R4_STALE_INSIGHTS,
  R5_LOW_SATISFACTION,
  R6_SUGGESTION_BACKLOG,
  R7_PENDING_RECOMMENDATIONS,
];

export const RECOMMENDATION_HEALTH_FACTORS: HealthFactorDef<RecommendationContext>[] =
  [
    {
      id: "pricing_pipeline",
      label: "Pipeline de pricing",
      compute: (ctx) => {
        if (ctx.pricings.length === 0) return 50;
        const total = ctx.pendingPricings.length + ctx.implementedPricings;
        if (total === 0) return 50;
        return Math.round(
          (ctx.implementedPricings /
            Math.max(ctx.pricings.length, 1)) *
            100,
        );
      },
      weight: 0.25,
    },
    {
      id: "suggestion_pipeline",
      label: "Pipeline de sugerencias",
      compute: (ctx) => {
        if (ctx.totalSuggestions === 0) return 50;
        return Math.round(
          (ctx.implementedSuggestions / ctx.totalSuggestions) * 100,
        );
      },
      weight: 0.20,
    },
    {
      id: "report_freshness",
      label: "Frescura de informes",
      compute: (ctx) => {
        if (ctx.daysSinceLastInsight === Infinity) return 10;
        if (ctx.daysSinceLastInsight <= 30) return 100;
        if (ctx.daysSinceLastInsight <= 60) return 70;
        if (ctx.daysSinceLastInsight <= 90) return 40;
        return 15;
      },
      weight: 0.25,
    },
    {
      id: "satisfaction_health",
      label: "Satisfacción",
      compute: (ctx) => {
        if (ctx.latestSatisfactionAvg === 0) return 50;
        return Math.round(
          (ctx.latestSatisfactionAvg / 5) * 100,
        );
      },
      weight: 0.20,
    },
    {
      id: "recommendation_implementation",
      label: "Implementación de recomendaciones",
      compute: (ctx) => {
        if (ctx.latestRecommendationsCount === 0) return 70;
        // Heuristic: fewer pending recommendations = better implementation
        return Math.max(
          20,
          100 - ctx.latestRecommendationsCount * 15,
        );
      },
      weight: 0.10,
    },
  ];