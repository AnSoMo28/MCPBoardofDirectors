// ═══════════════════════════════════════════════════════════
// src/shared/lib/advisor-engine/rules/age-group.ts
// Phase 34+ Migration — Age Group Domain Rules
// Level 6+ Agency · Production Grade
//
// 15 declarative rules × 4 layers.
// 8 signal definitions (1 existing + 7 new).
// Cross-domain reactive rules (R13-R15) consume signals
// from events, sports, and satisfaction domains.
//
// Architecture:
//   RuleDefinition<AgeGroupContext> — pure functions, testable
//   buildAgeGroupCtx() — derives metrics from raw MCP data
//   AGE_GROUP_HEALTH_FACTORS — unified health score
//   Signals: 8 emitted (age_group_*) · 3 consumed (evt_*, spt_*, sat_*)
//
// Domain mapping: AIDomain = "family"
//   (age_group is a sub-domain of family)
//
// PRE-WRITE VERIFICATION:
//   AgeGroupHealthScore → @/shared/mocks/contracts ✅
//   AgeGroupAnalyticsEnhanced → @/shared/mocks/contracts ✅
//   AgeRecommendationEnhanced → @/shared/mocks/contracts ✅
//   AgeGroupEngagementProposalList → @/shared/mocks/contracts ✅
//   BaseContext → ../types ✅
//   RuleDefinition → ../types ✅
//   SignalDefinition → ../types ✅
//   SignalName → ../types ✅
//   HealthFactorDef → ../types ✅
//   DomainSignal → ../types ✅
//   buildInsight → ../evaluate ✅
//   generateInsightId → @/shared/types/ai-intelligence ✅
//
// ANTI-PATTERNS REMOVED:
//   - rawData as cast without protection → nullish coalescing defaults
//   - R11 hardcoded months 9-11 → uses seasonal peaks data
//   - Health factor enrollment: linear cap at 200 → asymptotic curve
//   - Health factor diversity: 5 activities = 100 → realistic scale
//   - 1 signal for entire domain → 8 signals
//   - 0 reactive rules → 3 reactive rules consuming cross-domain signals
//
// CHANGES FROM v36:
//   §1  +seasonalPeaks, +isPreSeason in context
//   §2  +7 signal definitions
//   §3  +SEASONAL_PEAKS inline, +HEALTH_SCALE constants
//   §4  R5/R7/R9/R10/R11/R12 +emitSignals, R11 rewrite
//   §4  +R13 events, +R14 sports, +R15 satisfaction (reactive)
//   §5  Health factors: enrollment + diversity real scales
//
// TODO[Hook]: Add R13-R15 to AGE_GROUP_RULE_ID, METRIC_DISPLAY,
//   and RULE_BRACKET_MAP in useAgeGroupAdvisor.ts
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
  AgeGroupHealthScore,
  AgeGroupAnalyticsEnhanced,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposalList,
} from "@/shared/mocks/contracts";

/* ═══════════════════════════════════════════════════════════
   §1  CONTEXT
   ═══════════════════════════════════════════════════════════ */

export interface AgeGroupContext extends BaseContext {
  domain: "family";

  // Raw inputs
  health: AgeGroupHealthScore | null;
  analytics: AgeGroupAnalyticsEnhanced | null;
  recommendations: AgeRecommendationEnhanced[];
  proposals: AgeGroupEngagementProposalList | null;

  // Derived — enrollment
  totalEnrolled: number;
  teensEnrolled: number;
  kidsEnrolled: number;
  seniorsEnrolled: number;
  teensPct: number;
  kidsPct: number;
  seniorsPct: number;

  // Derived — distribution
  maxGroupPct: number;
  maxGroupName: string;

  // Derived — participation
  familyParticipation: number;
  retentionRate: number;
  avgSatisfaction: number;

  // Derived — programs
  totalActivities: number;
  lowSatisfactionPrograms: number;
  worstProgramName: string | undefined;
  worstProgramSat: number;
  worstProgramRetention: number;
  lowRetentionPrograms: number;

  // Derived — trends
  decliningGroups: string[];
  growingKids: boolean;

  // Derived — proposals
  pendingRecommendations: number;
  highPriorityRecommendations: number;
  crossDomainProposals: number;

  // Seasonal
  currentMonth: number;
  activePeakBrackets: string[];
  isPreSeason: boolean;
}

/**
 * Seasonality data — mirrors COHORT_SEASONALITY from
 * features/age-group/config.ts. Kept inline here to avoid
 * shared → features dependency inversion.
 */
const SEASONAL_PEAKS: Record<string, number[]> = {
  infant:    [1, 7, 12],
  child:     [1, 4, 7, 12],
  youth:     [1, 6, 7, 12],
  young_pro: [3, 6, 7, 11, 12],
  active:    [4, 10, 11],
  mature:    [1, 2, 5, 8, 11],
  senior:    [1, 2, 3, 8, 9, 10, 11],
};

/**
 * Months before a peak to consider "pre-season".
 * Used for seasonal preparation rules.
 */
const PRE_SEASON_MONTHS = 2;

function monthsUntil(currentMonth: number, targetMonth: number): number {
  const diff = targetMonth - currentMonth;
  return diff <= 0 ? diff + 12 : diff;
}

export function buildAgeGroupCtx(
  rawData: unknown,
  signals?: DomainSignal[],
): AgeGroupContext {
  // ── Type-safe destructuring with defaults ──
  const raw = (typeof rawData === "object" && rawData !== null
    ? rawData
    : {}) as Record<string, unknown>;

  const health = (raw.healthScore ?? null) as AgeGroupHealthScore | null;
  const analytics = (raw.analytics ?? null) as AgeGroupAnalyticsEnhanced | null;
  const recommendations = (Array.isArray(raw.recommendations)
    ? raw.recommendations
    : []) as AgeRecommendationEnhanced[];
  const proposals = (raw.proposals ?? null) as AgeGroupEngagementProposalList | null;

  // ── Enrollment ──
  const dist = analytics?.age_distribution ?? [];
  const totalEnrolled =
    (analytics?.total_children_enrolled ?? 0) +
    (analytics?.total_seniors_enrolled ?? 0);
  const teensEnrolled = analytics?.teens_enrolled ?? 0;
  const kidsEnrolled = analytics?.kids_enrolled ?? 0;
  const seniorsEnrolled = analytics?.total_seniors_enrolled ?? 0;

  const teensPct =
    totalEnrolled > 0 ? (teensEnrolled / totalEnrolled) * 100 : 0;
  const kidsPct =
    totalEnrolled > 0 ? (kidsEnrolled / totalEnrolled) * 100 : 0;
  const seniorsPct =
    totalEnrolled > 0 ? (seniorsEnrolled / totalEnrolled) * 100 : 0;

  // ── Distribution ──
  const maxGroup = dist.reduce(
    (max, d) => (d.percentage > (max?.percentage ?? 0) ? d : max),
    dist[0] ?? { age_range: "N/A", percentage: 0, count: 0 },
  );

  // ── Programs ──
  const programs = analytics?.program_popularity ?? [];
  const lowSatPrograms = programs.filter((p) => p.satisfaction_avg < 3.5);
  const lowRetPrograms = programs.filter((p) => p.retention_rate < 50);

  const worst = [...lowSatPrograms].sort(
    (a, b) => a.satisfaction_avg - b.satisfaction_avg,
  )[0];

  // ── Trends ──
  const trends = analytics?.monthly_trends ?? [];
  const declining: string[] = [];
  let growingKids = false;
  if (trends.length >= 2) {
    const last = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    if (last.teens_enrolled < prev.teens_enrolled * 0.85) declining.push("teens");
    if (last.kids_enrolled < prev.kids_enrolled * 0.85) declining.push("kids");
    if (last.seniors_enrolled < prev.seniors_enrolled * 0.85) declining.push("seniors");

    if (trends.length >= 3) {
      const recent = trends.slice(-3);
      growingKids = recent.every(
        (t, i) => i === 0 || t.kids_enrolled >= recent[i - 1].kids_enrolled,
      );
    }
  }

  // ── Proposals ──
  const highPri =
    proposals?.proposals.filter((p) => p.priority === "high").length ?? 0;
  const crossDom = proposals?.cross_domain_count ?? 0;

  // ── Seasonal (uses SEASONAL_PEAKS inline data) ──
  const currentMonth = new Date().getMonth() + 1;
  const activePeakBrackets: string[] = [];
  let isPreSeason = false;

  for (const [bracketId, peakMonths] of Object.entries(SEASONAL_PEAKS)) {
    if (peakMonths.includes(currentMonth)) {
      activePeakBrackets.push(bracketId);
    }
    for (const pm of peakMonths) {
      if (monthsUntil(currentMonth, pm) <= PRE_SEASON_MONTHS) {
        isPreSeason = true;
      }
    }
  }

  return {
    domain: "family",
    signals: signals ?? [],
    health,
    analytics,
    recommendations,
    proposals,
    totalEnrolled,
    teensEnrolled,
    kidsEnrolled,
    seniorsEnrolled,
    teensPct,
    kidsPct,
    seniorsPct,
    maxGroupPct: maxGroup.percentage,
    maxGroupName: maxGroup.age_range,
    familyParticipation: analytics?.family_participation_rate ?? 0,
    retentionRate: analytics?.retention_rate ?? 0,
    avgSatisfaction: analytics?.avg_satisfaction ?? 0,
    totalActivities: programs.length,
    lowSatisfactionPrograms: lowSatPrograms.length,
    worstProgramName: worst?.program,
    worstProgramSat: worst?.satisfaction_avg ?? 0,
    worstProgramRetention: worst?.retention_rate ?? 0,
    lowRetentionPrograms: lowRetPrograms.length,
    decliningGroups: declining,
    growingKids,
    pendingRecommendations: recommendations.length,
    highPriorityRecommendations: highPri,
    crossDomainProposals: crossDom,
    currentMonth,
    activePeakBrackets,
    isPreSeason,
  };
}

/* ═══════════════════════════════════════════════════════════
   §2  SIGNALS (8 definitions)
   ═══════════════════════════════════════════════════════════ */

// ── §2.1  Existing ──

const AGE_GROUP_IMBALANCE: SignalDefinition = {
  id: "age_group_imbalance",
  targetDomains: ["global", "family"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Demographic imbalance detected in age groups",
  ttl: 300_000,
};

// ── §2.2  Phase 34+ — Emit signals ──

const AGE_GROUP_TEEN_DECLINE: SignalDefinition = {
  id: "age_group_teen_decline",
  targetDomains: ["events", "sports", "communication"] as AIDomain[],  defaultSeverity: "high" as SeverityLevel,
  label: "Teen enrollment declining — cross-domain coordination needed",
  ttl: 300_000,
};

const AGE_GROUP_SENIOR_OPPORTUNITY: SignalDefinition = {
  id: "age_group_senior_opportunity",
  targetDomains: ["wellness", "cultural_social"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Senior cohort active — cross-sell opportunity for wellness and cultural",
  ttl: 600_000,
};

const AGE_GROUP_KIDS_GROWTH: SignalDefinition = {
  id: "age_group_kids_growth",
  targetDomains: ["events", "family"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Kids enrollment growing — activity demand increasing",
  ttl: 300_000,
};

const AGE_GROUP_RETENTION_RISK: SignalDefinition = {
  id: "age_group_retention_risk",
  targetDomains: ["engagement", "satisfaction"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Program retention below threshold — intervention needed",
  ttl: 300_000,
};

const AGE_GROUP_SEASONAL_SURGE: SignalDefinition = {
  id: "age_group_seasonal_surge",
  targetDomains: ["events", "facilities"] as AIDomain[],
  defaultSeverity: "medium" as SeverityLevel,
  label: "Seasonal peak approaching — prepare infrastructure and events",
  ttl: 600_000,
};

const AGE_GROUP_PROGRAM_DEMAND: SignalDefinition = {
  id: "age_group_program_demand",
  targetDomains: ["engagement"] as AIDomain[],
  defaultSeverity: "high" as SeverityLevel,
  label: "Activity supply insufficient for enrollment demand",
  ttl: 300_000,
};

const AGE_GROUP_CROSS_SELL_READY: SignalDefinition = {
  id: "age_group_cross_sell_ready",
  targetDomains: ["engagement", "wellness"] as AIDomain[],  defaultSeverity: "medium" as SeverityLevel,
  label: "Cross-sell conditions met for senior/wellness programs",
  ttl: 600_000,
};

/* ═══════════════════════════════════════════════════════════
   §3  THRESHOLDS (named, testable, tunable)
   ═══════════════════════════════════════════════════════════ */

const THRESHOLDS = {
  TEENS_CRITICAL_PCT: 15,
  TEENS_IDEAL_LOW_PCT: 15,
  TEENS_IDEAL_HIGH_PCT: 20,
  DEMOGRAPHIC_IMBALANCE_PCT: 40,
  MIN_ACTIVITIES: 3,
  SATISFACTION_LOW: 3.5,
  RETENTION_LOW_PCT: 50,
  RETENTION_EXCELLENT_PCT: 80,
  DECLINE_THRESHOLD: 0.85,
  MIN_KIDS_GROWING_ACTIVITIES: 5,
  MIN_SENIORS_CROSS_SELL: 5,
  MIN_RECOMMENDATIONS_PENDING: 3,
  BALANCED_MIN_PCT: 10,
  BALANCED_MAX_PCT: 25,
  PRE_SEASON_MONTHS: 2,
  SIGNAL_SEVERITY_BUMP: 1.5,
} as const;

/* ═══════════════════════════════════════════════════════════
   §4  RULES (15 rules × 4 layers)
   ═══════════════════════════════════════════════════════════ */

// ── Layer 1: Balance & Coverage (social) ──────────────────

const R1_TEEN_CRITICAL: RuleDefinition<AgeGroupContext> = {
  id: "R1_TEEN_CRITICAL",
  name: "Participación teen crítica",
  layer: "social",
  domain: "family",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.totalEnrolled === 0 || ctx.teensPct >= THRESHOLDS.TEENS_CRITICAL_PCT)
      return null;
    return buildInsight({
      id: generateInsightId("family", "R1_TEEN_CRITICAL"),
      impact: "high",
      title: `Participación teen: ${ctx.teensPct.toFixed(1)}% (crítico)`,
      reasoning:
        `Solo ${ctx.teensEnrolled} adolescentes inscritos de ${ctx.totalEnrolled} participantes. ` +
        `Los teens representan ${ctx.teensPct.toFixed(1)}% — muy por debajo del balance ideal (${THRESHOLDS.TEENS_IDEAL_LOW_PCT}-${THRESHOLDS.TEENS_IDEAL_HIGH_PCT}%). ` +
        `Sin programas atractivos, esta generación se pierde del club.`,
      confidence: 90,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "generate_age_group_engagement_proposals",
        params: { target_age_group: "teens" },
        approval_level: "auto",
        label: "Crear programa teen",
      },
    });
  },
};

const R2_DEMOGRAPHIC_IMBALANCE: RuleDefinition<AgeGroupContext> = {
  id: "R2_DEMOGRAPHIC_IMBALANCE",
  name: "Desbalance demográfico",
  layer: "social",
  domain: "family",
  priority: 100,
  emitSignals: [AGE_GROUP_IMBALANCE],
  evaluate: (ctx) => {
    if (
      ctx.totalEnrolled === 0 ||
      ctx.maxGroupPct <= THRESHOLDS.DEMOGRAPHIC_IMBALANCE_PCT
    )
      return null;
    return buildInsight({
      id: generateInsightId("family", "R2_DEMOGRAPHIC_IMBALANCE"),
      impact: "medium",
      title: `Desbalance: ${ctx.maxGroupName} concentra ${ctx.maxGroupPct.toFixed(0)}%`,
      reasoning:
        `El grupo ${ctx.maxGroupName} concentra ${ctx.maxGroupPct.toFixed(1)}% del total. ` +
        `Un club saludable distribuye entre ${THRESHOLDS.BALANCED_MIN_PCT}-${THRESHOLDS.BALANCED_MAX_PCT}% por grupo. ` +
        `Diversificar programas para grupos sub-representados.`,
      confidence: 85,
      target_view: "intelligence",
    });
  },
};

const R3_INSUFFICIENT_ACTIVITIES: RuleDefinition<AgeGroupContext> = {
  id: "R3_INSUFFICIENT_ACTIVITIES",
  name: "Actividades insuficientes",
  layer: "social",
  domain: "family",
  priority: 100,
  emitSignals: [AGE_GROUP_PROGRAM_DEMAND],
  evaluate: (ctx) => {
    if (ctx.totalActivities >= THRESHOLDS.MIN_ACTIVITIES) return null;
    if (ctx.totalEnrolled === 0) return null;
    return buildInsight({
      id: generateInsightId("family", "R3_INSUFFICIENT_ACTIVITIES"),
      impact: "high",
      title: "Actividades insuficientes para la demanda",
      reasoning:
        `Solo ${ctx.totalActivities} actividades activas para ${ctx.totalEnrolled} participantes. ` +
        `Los grupos sin oferta adecuada migran a competidores.`,
      confidence: 88,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "suggest_program",
        params: {},
        approval_level: "semi",
        label: "Sugerir programas",
      },
    });
  },
};

const R4_ALL_BALANCED: RuleDefinition<AgeGroupContext> = {
  id: "R4_ALL_BALANCED",
  name: "Distribución equilibrada",
  layer: "social",
  domain: "family",
  priority: 100,
  evaluate: (ctx) => {
    if (ctx.totalEnrolled === 0) return null;
    const dist = ctx.analytics?.age_distribution ?? [];
    if (dist.length < 3) return null;
    const allBalanced = dist.every(
      (d) =>
        d.percentage >= THRESHOLDS.BALANCED_MIN_PCT &&
        d.percentage <= THRESHOLDS.BALANCED_MAX_PCT,
    );
    if (!allBalanced) return null;
    return buildInsight({
      id: generateInsightId("family", "R4_ALL_BALANCED"),
      impact: "low",
      title: "Distribución demográfica equilibrada",
      reasoning:
        `Todos los grupos etarios están entre ${THRESHOLDS.BALANCED_MIN_PCT}-${THRESHOLDS.BALANCED_MAX_PCT}%. ` +
        `Esto indica una oferta diversa que atiende a toda la familia.`,
      confidence: 92,
      target_view: "intelligence",
    });
  },
};

// ── Layer 2: Participation (engagement) ───────────────────

const R5_TEENS_DECLINING: RuleDefinition<AgeGroupContext> = {
  id: "R5_TEENS_DECLINING",
  name: "Participación teen en declive",
  layer: "engagement",
  domain: "family",
  priority: 200,
  emitSignals: [AGE_GROUP_TEEN_DECLINE],
  evaluate: (ctx) => {
    if (!ctx.decliningGroups.includes("teens")) return null;
    return buildInsight({
      id: generateInsightId("family", "R5_TEENS_DECLINING"),
      impact: "high",
      title: "Participación teen en declive",
      reasoning:
        `La inscripción de adolescentes bajó >${((1 - THRESHOLDS.DECLINE_THRESHOLD) * 100).toFixed(0)}% en el último mes. ` +
        `Sin intervención, los teens abandonan el club antes de los 18. ` +
        `Proponer: torneo gaming + deportes, actividades de alto contenido social.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "generate_age_group_engagement_proposals",
        params: { target: "teens" },
        approval_level: "auto",
        label: "Generar propuestas teen",
      },
    });
  },
};

const R6_LOW_SATISFACTION: RuleDefinition<AgeGroupContext> = {
  id: "R6_LOW_SATISFACTION",
  name: "Satisfacción baja en programa",
  layer: "engagement",
  domain: "family",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.lowSatisfactionPrograms === 0) return null;
    return buildInsight({
      id: generateInsightId("family", "R6_LOW_SATISFACTION"),
      impact: "high",
      title: `Satisfacción baja: ${ctx.worstProgramName ?? "programa"}`,
      reasoning:
        `${ctx.worstProgramName ?? "Programa"} tiene satisfacción de ${ctx.worstProgramSat.toFixed(1)}/5 ` +
        `con ${ctx.worstProgramRetention}% de retención. Revisar contenido, instructor, o cronograma.`,
      confidence: 82,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "get_age_group_reports",
        params: {},
        approval_level: "auto",
        label: "Revisar programa",
      },
    });
  },
};

const R7_LOW_RETENTION: RuleDefinition<AgeGroupContext> = {
  id: "R7_LOW_RETENTION",
  name: "Retención baja en actividades",
  layer: "engagement",
  domain: "family",
  priority: 200,
  emitSignals: [AGE_GROUP_RETENTION_RISK],
  evaluate: (ctx) => {
    if (ctx.lowRetentionPrograms === 0) return null;
    return buildInsight({
      id: generateInsightId("family", "R7_LOW_RETENTION"),
      impact: "medium",
      title: `${ctx.lowRetentionPrograms} actividad(es) con retención <${THRESHOLDS.RETENTION_LOW_PCT}%`,
      reasoning:
        `Retención por debajo del ${THRESHOLDS.RETENTION_LOW_PCT}%. Los socios prueban pero no continúan. Evaluar experiencia, precios, o alternativas.`,
      confidence: 80,
      target_view: "intelligence",
    });
  },
};

const R8_RETENTION_EXCELLENT: RuleDefinition<AgeGroupContext> = {
  id: "R8_RETENTION_EXCELLENT",
  name: "Retención excepcional",
  layer: "engagement",
  domain: "family",
  priority: 200,
  evaluate: (ctx) => {
    if (ctx.retentionRate < THRESHOLDS.RETENTION_EXCELLENT_PCT) return null;
    return buildInsight({
      id: generateInsightId("family", "R8_RETENTION_EXCELLENT"),
      impact: "low",
      title: `Retención excepcional: ${ctx.retentionRate}%`,
      reasoning:
        `La tasa de retención de ${ctx.retentionRate}% indica programas exitosos. ` +
        `Evaluar si hay capacidad para expandir o crear grupos adicionales.`,
      confidence: 90,
      target_view: "intelligence",
    });
  },
};

// ── Layer 3: Growth (lifecycle) ───────────────────────────

const R9_KIDS_GROWING: RuleDefinition<AgeGroupContext> = {
  id: "R9_KIDS_GROWING",
  name: "Kids creciendo sin nuevas actividades",
  layer: "lifecycle",
  domain: "family",
  priority: 300,
  emitSignals: [AGE_GROUP_KIDS_GROWTH],
  evaluate: (ctx) => {
    if (
      !ctx.growingKids ||
      ctx.totalActivities >= THRESHOLDS.MIN_KIDS_GROWING_ACTIVITIES
    )
      return null;
    return buildInsight({
      id: generateInsightId("family", "R9_KIDS_GROWING"),
      impact: "medium",
      title: "Kids creciendo pero sin nuevas actividades",
      reasoning:
        `La participación de niños crece pero la oferta de actividades no. ` +
        `Sin programas nuevos, el crecimiento se estancará. ` +
        `Considerar: campamentos, talleres STEM, artes.`,
      confidence: 78,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "suggest_program",
        params: { target_age_group: "kids" },
        approval_level: "semi",
        label: "Sugerir programa kids",
      },
    });
  },
};

const R10_CROSS_SELL_SENIORS: RuleDefinition<AgeGroupContext> = {
  id: "R10_CROSS_SELL_SENIORS",
  name: "Cross-sell seniors → wellness/cultural",
  layer: "lifecycle",
  domain: "family",
  priority: 300,
  emitSignals: [AGE_GROUP_SENIOR_OPPORTUNITY, AGE_GROUP_CROSS_SELL_READY],
  evaluate: (ctx) => {
    if (ctx.seniorsEnrolled < THRESHOLDS.MIN_SENIORS_CROSS_SELL) return null;
    return buildInsight({
      id: generateInsightId("family", "R10_CROSS_SELL_SENIORS"),
      impact: "medium",
      title: "Cross-sell: seniors → wellness y cultural",
      reasoning:
        `${ctx.seniorsEnrolled} seniors activos con alto engagement familiar. ` +
        `Los programas de wellness (yoga, tai chi) y cultural (pintura, música) ` +
        `tienen alta afinidad con este grupo. Revenue premium: +₡150K/socio/mes estimado.`,
      confidence: 72,
      target_view: "intelligence",
    });
  },
};

const R11_SEASONAL_PREP: RuleDefinition<AgeGroupContext> = {
  id: "R11_SEASONAL_PREP",
  name: "Preparar actividades de temporada alta",
  layer: "lifecycle",
  domain: "family",
  priority: 300,
  emitSignals: [AGE_GROUP_SEASONAL_SURGE],
  evaluate: (ctx) => {
    // Pre-season: within PRE_SEASON_MONTHS of any bracket's peak
    if (!ctx.isPreSeason && ctx.activePeakBrackets.length === 0) return null;

    const bracketLabels = ctx.activePeakBrackets
      .map((id) => {
        const names: Record<string, string> = {
          infant: "infantes",
          child: "niños",
          youth: "adolescentes",
          young_pro: "jóvenes profesionales",
          active: "profesionales activos",
          mature: "consolidados",
          senior: "seniors",
        };
        return names[id] ?? id;
      })
      .join(", ");

    const isCurrentlyPeaking = ctx.activePeakBrackets.length > 0;

    return buildInsight({
      id: generateInsightId("family", "R11_SEASONAL_PREP"),
      impact: "medium",
      title: isCurrentlyPeaking
        ? `Temporada alta activa: ${bracketLabels}`
        : "Preparar actividades de temporada alta",
      reasoning: isCurrentlyPeaking
        ? `Los grupos ${bracketLabels} están en su pico estacional. ` +
          `Maximizar oferta de actividades y eventos para capturar demanda. ` +
          `Los clubes que responden al pico tienen 2x más inscripciones.`
        : `Se acerca la temporada alta para ${bracketLabels}. ` +
          `Programar actividades con 60 días de anticipación. ` +
          `Los clubes que planifican antes del pico tienen 2x más inscripciones.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "suggest_program",
        params: { seasonal: "peak" },
        approval_level: "auto",
        label: "Planificar temporada",
      },
    });
  },
};

// ── Layer 4: Cross-domain ─────────────────────────────────

const R12_FAMILY_RECOMMENDATIONS: RuleDefinition<AgeGroupContext> = {
  id: "R12_FAMILY_RECOMMENDATIONS",
  name: "Recomendaciones familiares pendientes",
  layer: "cross_domain",
  domain: "family",
  priority: 400,
  emitSignals: [AGE_GROUP_PROGRAM_DEMAND],
  evaluate: (ctx) => {
    if (
      ctx.pendingRecommendations < THRESHOLDS.MIN_RECOMMENDATIONS_PENDING
    )
      return null;
    return buildInsight({
      id: generateInsightId("family", "R12_FAMILY_RECOMMENDATIONS"),
      impact: ctx.highPriorityRecommendations > 0 ? "high" : "medium",
      title: `${ctx.pendingRecommendations} recomendaciones familiares pendientes`,
      reasoning:
        `${ctx.pendingRecommendations} familias tienen recomendaciones de actividades para sus hijos. ` +
        `${ctx.highPriorityRecommendations} de alta prioridad. Cross-sell: ${ctx.crossDomainProposals} con señales de otros dominios.`,
      confidence: 80,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "get_age_recommendation_enhanced",
        params: {},
        approval_level: "auto",
        label: "Ver recomendaciones",
      },
    });
  },
};

// ── Layer 4: Cross-domain REACTIVE (consume signals) ──────

const R13_EVENTS_YOUTH_ENGAGEMENT: RuleDefinition<AgeGroupContext> = {
  id: "R13_EVENTS_YOUTH_ENGAGEMENT",
  name: "Events domain: baja asistencia juvenil",
  layer: "cross_domain",
  domain: "family",
  priority: 500,
  consumeSignals: ["evt_low_engagement"],
  evaluate: (ctx) => {
    const signal = ctx.signals?.find(
      (s) => s.signalDefId === "evt_low_engagement",
    );
    if (!signal) return null;

    return buildInsight({
      id: generateInsightId("family", "R13_EVENTS_YOUTH_ENGAGEMENT"),
      impact: "medium",
      title: "Events reporta baja asistencia juvenil",
      reasoning:
        `El dominio de eventos detectó engagement juvenil bajo (severidad: ${signal.severity}). ` +
        `Los programas etarios deben priorizar actividades que conecten con eventos: ` +
        `torneos sociales, workshops, eventos temáticos para teens.`,
      confidence: 75,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "generate_age_group_engagement_proposals",
        params: { target_age_group: "teens", trigger: "events_low_engagement" },
        approval_level: "auto",
        label: "Coordinar teen events",
      },
    });
  },
};

const R14_SPORTS_TEEN_DECLINE: RuleDefinition<AgeGroupContext> = {
  id: "R14_SPORTS_TEEN_DECLINE",
  name: "Sports domain: participación teen en declive",
  layer: "cross_domain",
  domain: "family",
  priority: 500,
  consumeSignals: ["spt_participation_decline"],
  evaluate: (ctx) => {
    const signal = ctx.signals?.find(
      (s) => s.signalDefId === "spt_participation_decline",
    );
    if (!signal) return null;

    return buildInsight({
      id: generateInsightId("family", "R14_SPORTS_TEEN_DECLINE"),
      impact: "medium",
      title: "Deportes reporta caída en participación teen",
      reasoning:
        `El dominio deportivo reporta participación teen en declive (severidad: ${signal.severity}). ` +
        `Oportunidad: programas combinados deporte + social que capturen teens ` +
        `antes de que abandonen ambos dominios. Coordinar con sports advisor.`,
      confidence: 72,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "generate_age_group_engagement_proposals",
        params: { target_age_group: "teens", trigger: "sports_decline" },
        approval_level: "auto",
        label: "Coordinar teen sports",
      },
    });
  },
};

const R15_SATISFACTION_CRITICAL: RuleDefinition<AgeGroupContext> = {
  id: "R15_SATISFACTION_CRITICAL",
  name: "Satisfaction domain: descenso crítico",
  layer: "cross_domain",
  domain: "family",
  priority: 500,
  consumeSignals: ["sat_critical_decline"],
  evaluate: (ctx) => {
    const signal = ctx.signals?.find(
      (s) => s.signalDefId === "sat_critical_decline",
    );
    if (!signal) return null;

    const worstProgram = ctx.worstProgramName
      ? ` Programa más afectado: ${ctx.worstProgramName} (${ctx.worstProgramSat.toFixed(1)}/5).`
      : "";

    return buildInsight({
      id: generateInsightId("family", "R15_SATISFACTION_CRITICAL"),
      impact: "high",
      title: "Satisfacción general en descenso crítico",
      reasoning:
        `El dominio de satisfacción reporta descenso crítico (severidad: ${signal.severity}). ` +
        `Priorizar revisión de programas etarios con peor rendimiento.${worstProgram} ` +
        `Acción inmediata: encuesta focalizada a participantes de programas con retención <${THRESHOLDS.RETENTION_LOW_PCT}%.`,
      confidence: 85,
      target_view: "intelligence",
      action: {
        action: "True",
        type: "mutate",
        server: "age_group",
        tool: "get_age_group_reports",
        params: { focus: "low_satisfaction" },
        approval_level: "auto",
        label: "Revisar programas críticos",
      },
    });
  },
};

/* ═══════════════════════════════════════════════════════════
   §5  HEALTH FACTORS (realistic scales)
   ═══════════════════════════════════════════════════════════ */

export const AGE_GROUP_HEALTH_FACTORS: HealthFactorDef<AgeGroupContext>[] = [
  {
    id: "balance_health",
    label: "Balance demográfico",
    compute: (ctx) => {
      if (ctx.totalEnrolled === 0) return 50;
      const dist = ctx.analytics?.age_distribution ?? [];
      if (dist.length === 0) return 50;
      // Gini-like: lower max = better balance
      return Math.max(0, Math.round(100 - (ctx.maxGroupPct - 25) * 2));
    },
    weight: 0.25,
  },
  {
    id: "enrollment_health",
    label: "Cobertura de inscripción",
    // Asymptotic scale — approaches 100 as enrollment grows
    // 100→22, 200→39, 400→63, 600→78, 1000→92, 1500→98
    compute: (ctx) => {
      if (ctx.totalEnrolled <= 0) return 0;
      return Math.round(100 * (1 - Math.exp(-ctx.totalEnrolled / 400)));
    },
    weight: 0.25,
  },
  {
    id: "satisfaction_health",
    label: "Satisfacción promedio",
    compute: (ctx) => Math.round((ctx.avgSatisfaction / 5) * 100),
    weight: 0.20,
  },
  {
    id: "retention_health",
    label: "Retención",
    compute: (ctx) => ctx.retentionRate,
    weight: 0.15,
  },
  {
    id: "diversity_health",
    label: "Diversidad de actividades",
    // Asymptotic scale — approaches 100 as activities grow
    // 2→28, 4→49, 6→63, 8→74, 10→81, 15→92, 20→96
    compute: (ctx) => {
      if (ctx.totalActivities <= 0) return 0;
      return Math.round(100 * (1 - Math.exp(-ctx.totalActivities / 6)));
    },
    weight: 0.15,
  },
];

/* ═══════════════════════════════════════════════════════════
   §6  EXPORTS
   ═══════════════════════════════════════════════════════════ */

export const AGE_GROUP_RULES: RuleDefinition<AgeGroupContext>[] = [
  // Layer 1: Balance & Coverage (social)
  R1_TEEN_CRITICAL,
  R2_DEMOGRAPHIC_IMBALANCE,
  R3_INSUFFICIENT_ACTIVITIES,
  R4_ALL_BALANCED,
  // Layer 2: Participation (engagement)
  R5_TEENS_DECLINING,
  R6_LOW_SATISFACTION,
  R7_LOW_RETENTION,
  R8_RETENTION_EXCELLENT,
  // Layer 3: Growth (lifecycle)
  R9_KIDS_GROWING,
  R10_CROSS_SELL_SENIORS,
  R11_SEASONAL_PREP,
  // Layer 4: Cross-domain
  R12_FAMILY_RECOMMENDATIONS,
  // Layer 4: Cross-domain reactive (consume signals from other domains)
  R13_EVENTS_YOUTH_ENGAGEMENT,
  R14_SPORTS_TEEN_DECLINE,
  R15_SATISFACTION_CRITICAL,
];

