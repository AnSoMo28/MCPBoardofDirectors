// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE v2 — Satisfaction Domain Rules
//
// 12 declarative rules migrated from useSatisfactionAdvisor (F33→F47).
// 3 layers: health/prediction/trends (1-8), micro/insights (9-12),
//           (no explicit cross_domain rule — 12 total as documented)
//
// Architecture:
//   RuleDefinition<SatisfactionContext> — pure functions, testable
//   buildSatisfactionCtx() — derives metrics from raw MCP data
//   SATISFACTION_HEALTH_FACTORS — unified health score (P5, P53)
//   Signals: sat_critical_decline (P54)
//
// Data source: SatisfactionIntelligence + SatisfactionBenchmarkReport
//              + SatisfactionEngagementProposalList
//
// Created: F47 B5.5 — Satisfaction Rules Migration
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
  SatisfactionHealthScore,
  SatisfactionIntelligence,
  SatisfactionBenchmarkReport,
  SatisfactionEngagementProposalList,
} from "@/shared/mocks/contracts";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — CONTEXT
// ═══════════════════════════════════════════════════════════

export interface SatisfactionContext extends BaseContext {
  domain: "satisfaction";

  // Raw inputs
  health: SatisfactionHealthScore | null;
  intelligence: SatisfactionIntelligence | null;
  benchmarks: SatisfactionBenchmarkReport | null;
  proposals: SatisfactionEngagementProposalList | null;

  // Core metrics
  overallAvg: number;
  totalSurveys: number;
  responseRate: number;

  // NPS
  npsScore: number;
  promoterPct: number;
  detractorPct: number;
  npsClassification: string;

  // Categories
  lowestCategory: string;
  lowestCategoryScore: number;
  highestCategory: string;
  highestCategoryScore: number;
  categoriesBelow3: number;
  allAbove4: boolean;

  // Event types
  bestEventType: string;
  bestEventTypeScore: number;
  worstEventType: string;
  worstEventTypeScore: number;

  // Trends
  trendDirection: string;
  monthsDeclining: number;

  // Benchmarks
  overallVsBenchmark: number;
  criticalBenchmarks: number;

  // Proposals
  highPriorityProposals: number;
  crossDomainProposals: number;
  eventsWithoutSurveys: number;
}

export function buildSatisfactionCtx(
  rawData: unknown,
  signals?: readonly DomainSignal[],
): SatisfactionContext {
  const {
    healthScore: health,
    intelligence: intel,
    benchmarks,
    proposals,
  } = rawData as {
    healthScore: SatisfactionHealthScore | null;
    intelligence: SatisfactionIntelligence | null;
    benchmarks: SatisfactionBenchmarkReport | null;
    proposals: SatisfactionEngagementProposalList | null;
  };

  // Core
  const overallAvg = intel?.overall_avg ?? 0;
  const totalSurveys = intel?.total_surveys ?? 0;
  const responseRate = intel?.response_rate_pct ?? 0;
  const nps = intel?.nps;
  const npsScore = nps?.nps_score ?? 0;
  const promoterPct = nps?.promoter_pct ?? 0;
  const detractorPct = nps?.detractor_pct ?? 0;

  // Categories
  const cats = intel?.category_scores ?? [];
  const sorted = [...cats].sort((a, b) => a.avg_score - b.avg_score);
  const lowestCat = sorted[0];
  const highestCat = sorted[sorted.length - 1];
  const below3 = cats.filter((c) => c.avg_score < 3.0).length;
  const allAbove =
    cats.length > 0 && cats.every((c) => c.avg_score >= 4.0);

  // Event types
  const eventTypes = intel?.event_type_comparisons ?? [];
  const sortedET = [...eventTypes].sort(
    (a, b) => a.avg_score - b.avg_score,
  );
  const bestET = sortedET[sortedET.length - 1];
  const worstET = sortedET[0];

  // Trends
  const flow = intel?.sentiment_flow ?? [];
  let monthsDecl = 0;
  for (let i = flow.length - 1; i > 0; i--) {
    if (flow[i].avg_score < flow[i - 1].avg_score) monthsDecl++;
    else break;
  }
  const trendDir = health?.trend ?? "stable";

  // Benchmarks
  const overallBench = benchmarks?.overall_benchmarks ?? [];
  const vsBenchmark = overallBench[0]?.vs_benchmark ?? 0;
  const criticalBench =
    overallBench.filter((b) => b.status === "critical").length +
    (benchmarks?.category_benchmarks ?? []).filter(
      (b) => b.status === "critical",
    ).length;

  // Proposals
  const surveyFollowUps =
    proposals?.proposals.filter(
      (p) => p.proposal_type === "survey_follow_up",
    ) ?? [];

  return {
    domain: "satisfaction",
    signals: signals ?? [],
    health,
    intelligence: intel,
    benchmarks,
    proposals,
    overallAvg,
    totalSurveys,
    responseRate,
    npsScore,
    promoterPct,
    detractorPct,
    npsClassification: nps?.classification ?? "neutral",
    lowestCategory:
      lowestCat?.display_name ?? lowestCat?.category ?? "N/A",
    lowestCategoryScore: lowestCat?.avg_score ?? 0,
    highestCategory:
      highestCat?.display_name ?? highestCat?.category ?? "N/A",
    highestCategoryScore: highestCat?.avg_score ?? 0,
    categoriesBelow3: below3,
    allAbove4: allAbove,
    bestEventType:
      bestET?.display_name ?? bestET?.event_type ?? "N/A",
    bestEventTypeScore: bestET?.avg_score ?? 0,
    worstEventType:
      worstET?.display_name ?? worstET?.event_type ?? "N/A",
    worstEventTypeScore: worstET?.avg_score ?? 0,
    trendDirection: trendDir,
    monthsDeclining: monthsDecl,
    overallVsBenchmark: vsBenchmark,
    criticalBenchmarks: criticalBench,
    highPriorityProposals: proposals?.high_priority_count ?? 0,
    crossDomainProposals: proposals?.cross_domain_count ?? 0,
    eventsWithoutSurveys: surveyFollowUps.length,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — SIGNALS
// ═══════════════════════════════════════════════════════════

const SAT_CRITICAL_DECLINE: SignalDefinition = {
  id: "sat_critical_decline",
  targetDomains: ["global", "satisfaction"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Satisfaction critically declining — intervention needed",
  ttl: 300_000,
};

// ═══════════════════════════════════════════════════════════
// SECTION 3 — THRESHOLDS (named, testable, tunable)
// ═══════════════════════════════════════════════════════════

const THRESHOLDS = {
  OVERALL_CRITICAL: 3.0,
  CATEGORY_CRITICAL: 3.0,
  CATEGORY_EXCELLENT: 4.0,
  DETRACTOR_HIGH_PCT: 20,
  DECLINE_MONTHS_CRITICAL: 3,
  RESPONSE_RATE_LOW_PCT: 30,
  NPS_CRITICAL: -10,
  BEST_EVENT_MIN: 4.3,
  EVENT_TYPE_GAP_MIN: 0.5,
  WORST_EVENT_CEILING: 4.0,
  VALUE_CRITICAL: 3.8,
} as const;

// ═══════════════════════════════════════════════════════════
// SECTION 4 — RULES (12 rules × 3 layers)
//
// Layer mapping (F33 custom → AdvisorLayer):
//   health      → "health" (exact match ✅)
//   trends      → "prediction"
//   insights    → "micro"
//   cross_domain → "cross_domain" (not used — 12 total as documented)
// ═══════════════════════════════════════════════════════════

// ── Layer 1: Health (health) ──────────────────────────────

const R1_OVERALL_CRITICAL: RuleDefinition<SatisfactionContext> = {
  id: "R1_OVERALL_CRITICAL",
  name: "Satisfacción general crítica",
  layer: "health",
  domain: "satisfaction",
  priority: 100,
  emitSignals: [SAT_CRITICAL_DECLINE],
  evaluate: (ctx) => {
    if (
      ctx.totalSurveys === 0 ||
      ctx.overallAvg >= THRESHOLDS.OVERALL_CRITICAL
    )
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R1_OVERALL_CRITICAL"),
      impact: "high",
      title: `Satisfacción general: ${ctx.overallAvg.toFixed(1)}/5 (crítico)`,
      reasoning:
        `Overall satisfaction de ${ctx.overallAvg.toFixed(1)} está por debajo de ${THRESHOLDS.OVERALL_CRITICAL} — zona crítica. ` +
        `Basado en ${ctx.totalSurveys} encuestas. La satisfacción baja impacta retención y referidos. ` +
        `Acción inmediata: identificar las categorías más bajas y actuar.`,
      confidence: 92,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "get_satisfaction_intelligence",
        params: {},
        approval_level: "auto",
        label: "Ver análisis detallado",
      },
    });
  },
};

const R2_CATEGORY_SYSTEMIC: RuleDefinition<SatisfactionContext> = {
  id: "R2_CATEGORY_SYSTEMIC",
  name: "Categoría sistémicamente baja",
  layer: "health",
  domain: "satisfaction",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.categoriesBelow3 === 0) return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R2_CATEGORY_SYSTEMIC"),
      impact: "high",
      title: `${ctx.categoriesBelow3} categoría(s) bajo ${THRESHOLDS.CATEGORY_CRITICAL} — "${ctx.lowestCategory}" (${ctx.lowestCategoryScore.toFixed(1)})`,
      reasoning:
        `La categoría '${ctx.lowestCategory}' tiene ${ctx.lowestCategoryScore.toFixed(1)}/5 — zona roja. ` +
        `Esto no es un outlier: afecta a múltiples eventos. ` +
        `Requiere revisión operativa del área correspondiente.`,
      confidence: 88,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "get_satisfaction_benchmark",
        params: {},
        approval_level: "auto",
        label: "Revisar categoría",
      },
    });
  },
};

const R3_NEGATIVE_SENTIMENT: RuleDefinition<SatisfactionContext> = {
  id: "R3_NEGATIVE_SENTIMENT",
  name: "Sentimiento negativo alto",
  layer: "health",
  domain: "satisfaction",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.detractorPct <= THRESHOLDS.DETRACTOR_HIGH_PCT) return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R3_NEGATIVE_SENTIMENT"),
      impact: "high",
      title: `Sentimiento negativo: ${ctx.detractorPct.toFixed(0)}%`,
      reasoning:
        `${ctx.detractorPct.toFixed(0)}% de encuestados clasificados como detractores (score <${THRESHOLDS.OVERALL_CRITICAL}). ` +
        `Esto impacta el word-of-mouth y la retención. ` +
        `Programa de recuperación de detractores: contacto personalizado dentro de 48h.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R4_ALL_EXCELLENT: RuleDefinition<SatisfactionContext> = {
  id: "R4_ALL_EXCELLENT",
  name: "Todas las categorías excelentes",
  layer: "health",
  domain: "satisfaction",
  priority: 100,
  evaluate: (ctx) => {
    if (!ctx.allAbove4) return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R4_ALL_EXCELLENT"),
      impact: "low",
      title: `Todas las categorías sobre ${THRESHOLDS.CATEGORY_EXCELLENT} — excelencia consistente`,
      reasoning:
        `Cada una de las categorías de satisfacción promedia más de ${THRESHOLDS.CATEGORY_EXCELLENT}/5. ` +
        `Esto indica operaciones de alta calidad en todas las áreas. ` +
        `Mantener estándares y usar como benchmark interno.`,
      confidence: 95,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2: Trends (prediction) ──────────────────────────

const R5_DECLINING_3MONTHS: RuleDefinition<SatisfactionContext> = {
  id: "R5_DECLINING_3MONTHS",
  name: "Satisfacción en declive 3+ meses",
  layer: "prediction",
  domain: "satisfaction",
  priority: 200,
  emitSignals: [SAT_CRITICAL_DECLINE],
  evaluate: (ctx) => {
    if (
      ctx.monthsDeclining < THRESHOLDS.DECLINE_MONTHS_CRITICAL
    )
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R5_DECLINING_3MONTHS"),
      impact: "high",
      title: `Satisfacción en declive: ${ctx.monthsDeclining} meses consecutivos`,
      reasoning:
        `La satisfacción ha bajado ${ctx.monthsDeclining} meses seguidos. ` +
        `Sin intervención, el declive se acelera — los socios empiezan a hablar entre ellos. ` +
        `Identificar la causa raíz (¿food? ¿value? ¿service?) y actuar.`,
      confidence: 88,
      target_view: "intelligence",
    });
  },
};

const R6_LOW_RESPONSE_RATE: RuleDefinition<SatisfactionContext> = {
  id: "R6_LOW_RESPONSE_RATE",
  name: "Response rate insuficiente",
  layer: "prediction",
  domain: "satisfaction",
  priority: 200,
  evaluate: (ctx) => {
    if (
      ctx.responseRate >= THRESHOLDS.RESPONSE_RATE_LOW_PCT ||
      ctx.totalSurveys === 0
    )
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R6_LOW_RESPONSE_RATE"),
      impact: "medium",
      title: `Response rate: ${ctx.responseRate.toFixed(0)}% (insuficiente)`,
      reasoning:
        `Solo ${ctx.responseRate.toFixed(0)}% de asistentes completan la encuesta. ` +
        `Con menos del ${THRESHOLDS.RESPONSE_RATE_LOW_PCT}%, los datos no son estadísticamente confiables. ` +
        `Implementar: encuesta automática 24h post-evento.`,
      confidence: 82,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "generate_satisfaction_engagement_proposals",
        params: { proposal_type: "survey_follow_up" },
        approval_level: "auto",
        label: "Activar auto-survey",
      },
    });
  },
};

const R7_WORST_EVENT_TYPE: RuleDefinition<SatisfactionContext> = {
  id: "R7_WORST_EVENT_TYPE",
  name: "Tipo de evento con peor satisfacción",
  layer: "prediction",
  domain: "satisfaction",
  priority: 200,
  evaluate: (ctx) => {
    if (
      ctx.worstEventTypeScore >= THRESHOLDS.WORST_EVENT_CEILING ||
      ctx.worstEventTypeScore === 0
    )
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R7_WORST_EVENT_TYPE"),
      impact: "medium",
      title: `${ctx.worstEventType}: ${ctx.worstEventTypeScore.toFixed(1)}/5 — tipo de evento más bajo`,
      reasoning:
        `Los eventos de tipo '${ctx.worstEventType}' promedian ${ctx.worstEventTypeScore.toFixed(1)}/5. ` +
        `Comparado con '${ctx.bestEventType}' (${ctx.bestEventTypeScore.toFixed(1)}), hay una brecha de ` +
        `${(ctx.bestEventTypeScore - ctx.worstEventTypeScore).toFixed(1)} puntos. ` +
        `Replicar elementos del formato exitoso.`,
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

const R8_IMPROVING: RuleDefinition<SatisfactionContext> = {
  id: "R8_IMPROVING",
  name: "Satisfacción mejorando",
  layer: "prediction",
  domain: "satisfaction",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.trendDirection !== "improving") return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R8_IMPROVING"),
      impact: "low",
      title: "Satisfacción en tendencia positiva",
      reasoning:
        `La satisfacción está mejorando. Reforzar las acciones que están funcionando ` +
        `y documentar qué cambió para mantener el momentum.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

// ── Layer 3: Insights (micro) ─────────────────────────────

const R9_NPS_CRITICAL: RuleDefinition<SatisfactionContext> = {
  id: "R9_NPS_CRITICAL",
  name: "NPS crítico",
  layer: "micro",
  domain: "satisfaction",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.npsScore >= THRESHOLDS.NPS_CRITICAL || ctx.totalSurveys === 0)
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R9_NPS_CRITICAL"),
      impact: "high",
      title: `NPS estimado: ${ctx.npsScore} (${ctx.npsClassification})`,
      reasoning:
        `NPS de ${ctx.npsScore}: ${ctx.promoterPct.toFixed(0)}% promoters vs ${ctx.detractorPct.toFixed(0)}% detractors. ` +
        `Un NPS bajo ${THRESHOLDS.NPS_CRITICAL} indica que los detractores dominan. ` +
        `Recuperar detractores es 5x más barato que adquirir nuevos socios.`,
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

const R10_VALUE_QUALITY_GAP: RuleDefinition<SatisfactionContext> = {
  id: "R10_VALUE_QUALITY_GAP",
  name: "Brecha calidad vs valor",
  layer: "micro",
  domain: "satisfaction",
  priority: 300,
  evaluate: (ctx) => {
    const cats = ctx.intelligence?.category_scores ?? [];
    const value = cats.find((c) => c.category === "value");
    const service = cats.find((c) => c.category === "service");
    if (!value || !service) return null;
    if (
      value.avg_score >= THRESHOLDS.VALUE_CRITICAL ||
      service.avg_score <= value.avg_score
    )
      return null;
    return buildInsight({
      id: generateInsightId("satisfaction", "R10_VALUE_QUALITY_GAP"),
      impact: "medium",
      title: `Gap calidad vs valor: service ${service.avg_score.toFixed(1)} — value ${value.avg_score.toFixed(1)}`,
      reasoning:
        `Los socios valoran el servicio (${service.avg_score.toFixed(1)}/5) pero sienten que ` +
        `el precio no refleja el valor (${value.avg_score.toFixed(1)}/5). ` +
        `Brecha de ${(service.avg_score - value.avg_score).toFixed(1)} puntos. ` +
        `Oportunidad: agregar beneficios tangibles o comunicar mejor el valor.`,
      confidence: 78,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "get_satisfaction_benchmark",
        params: {},
        approval_level: "auto",
        label: "Ver benchmarks",
      },
    });
  },
};

const R11_EVENTS_WITHOUT_SURVEYS: RuleDefinition<SatisfactionContext> = {
  id: "R11_EVENTS_WITHOUT_SURVEYS",
  name: "Eventos sin encuesta",
  layer: "micro",
  domain: "satisfaction",
  priority: 300,
  evaluate: (ctx) => {
    if (ctx.eventsWithoutSurveys === 0) return null;
    return buildInsight({
      id: generateInsightId(
        "satisfaction",
        "R11_EVENTS_WITHOUT_SURVEYS",
      ),
      impact: "medium",
      title: `${ctx.eventsWithoutSurveys} evento(s) sin encuesta enviada`,
      reasoning:
        `${ctx.eventsWithoutSurveys} eventos completados sin survey. Esto crea puntos ciegos ` +
        `en el análisis y reduce la confianza estadística. ` +
        `Implementar envío automático post-evento.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "generate_satisfaction_engagement_proposals",
        params: { proposal_type: "survey_follow_up" },
        approval_level: "auto",
        label: "Enviar encuestas",
      },
    });
  },
};

const R12_REPLICATE_BEST_FORMAT: RuleDefinition<SatisfactionContext> = {
  id: "R12_REPLICATE_BEST_FORMAT",
  name: "Replicar formato exitoso",
  layer: "micro",
  domain: "satisfaction",
  priority: 300,
  evaluate: (ctx) => {
    if (
      ctx.bestEventTypeScore < THRESHOLDS.BEST_EVENT_MIN ||
      ctx.worstEventTypeScore === 0
    )
      return null;
    const gap = ctx.bestEventTypeScore - ctx.worstEventTypeScore;
    if (gap < THRESHOLDS.EVENT_TYPE_GAP_MIN) return null;
    return buildInsight({
      id: generateInsightId(
        "satisfaction",
        "R12_REPLICATE_BEST_FORMAT",
      ),
      impact: "high",
      title: `Replicar formato '${ctx.bestEventType}' (${ctx.bestEventTypeScore.toFixed(1)}) para '${ctx.worstEventType}'`,
      reasoning:
        `'${ctx.bestEventType}' tiene ${ctx.bestEventTypeScore.toFixed(1)}/5 — el más alto. ` +
        `'${ctx.worstEventType}' tiene ${ctx.worstEventTypeScore.toFixed(1)}/5. ` +
        `Los elementos diferenciadores del formato exitoso pueden cerrar la brecha de ${gap.toFixed(1)} puntos.`,
      confidence: 82,
      target_view: "intelligence",
      action: {
        type: "mutate",
        server: "satisfaction",
        tool: "generate_satisfaction_engagement_proposals",
        params: { proposal_type: "format_replication" },
        approval_level: "auto",
        label: "Ver propuestas",
      },
    });
  },
};

// ═══════════════════════════════════════════════════════════
// SECTION 5 — RULES ARRAY + HEALTH FACTORS
// ═══════════════════════════════════════════════════════════

export const SATISFACTION_RULES: RuleDefinition<SatisfactionContext>[] = [
  R1_OVERALL_CRITICAL,
  R2_CATEGORY_SYSTEMIC,
  R3_NEGATIVE_SENTIMENT,
  R4_ALL_EXCELLENT,
  R5_DECLINING_3MONTHS,
  R6_LOW_RESPONSE_RATE,
  R7_WORST_EVENT_TYPE,
  R8_IMPROVING,
  R9_NPS_CRITICAL,
  R10_VALUE_QUALITY_GAP,
  R11_EVENTS_WITHOUT_SURVEYS,
  R12_REPLICATE_BEST_FORMAT,
];

export const SATISFACTION_HEALTH_FACTORS: HealthFactorDef<SatisfactionContext>[] =
  [
    {
      id: "overall_score",
      label: "Satisfacción general",
      compute: (ctx) => Math.min(100, Math.round(ctx.overallAvg * 20)),
      weight: 0.30,
    },
    {
      id: "nps_health",
      label: "NPS Health",
      compute: (ctx) => {
        // NPS ranges from -100 to +100 → map to 0-100
        return Math.max(0, Math.min(100, Math.round(ctx.npsScore + 50)));
      },
      weight: 0.25,
    },
    {
      id: "response_rate",
      label: "Response rate",
      compute: (ctx) =>
        Math.min(100, Math.round(ctx.responseRate)),
      weight: 0.20,
    },
    {
      id: "category_balance",
      label: "Balance de categorías",
      compute: (ctx) => {
        if (ctx.allAbove4) return 100;
        // Penalize categories below 3.0
        const penalty = ctx.categoriesBelow3 * 20;
        return Math.max(0, 100 - penalty);
      },
      weight: 0.15,
    },
    {
      id: "trend_direction",
      label: "Tendencia",
      compute: (ctx) => {
        if (ctx.trendDirection === "improving") return 90;
        if (ctx.trendDirection === "stable") return 60;
        return Math.max(
          10,
          60 - ctx.monthsDeclining * 15,
        );
      },
      weight: 0.10,
    },
  ];