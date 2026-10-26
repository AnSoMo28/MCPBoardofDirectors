// ═══════════════════════════════════════════════════════════
// Age Group Advisor — Intelligence Hook
// Castillo Country Club — Silver Tide Glass UI (Fase 27)
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits age_group signal post-evaluate.
//
// Proposals implemented:
//   P1  Resonance-Weighted Insight Ranking
//   P2  Generational Ripple Propagation
//   P3  Aging-Out Risk Pipeline
//   P4  Cohort Health Heatmap Signal
//   P5  Bracket-Enriched Metric Display
//   P6  Seasonal Urgency Modifier
//   P7  Cross-Domain Thread Emission
//   P8  Engagement Tier Context
//   P9  Typed Rule IDs
//   P10 Shared Severity Derivation Pattern
//
// Domain: "family" (AIDomain — age_group is a sub-domain)
// Layer mapping: balance→social, participation→engagement,
//                growth→lifecycle, cross_domain→cross_domain
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";
import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";

import type {
  AgeGroupHealthScore,
  AgeGroupAnalyticsEnhanced,
  AgeRecommendationEnhanced,
  AgeGroupEngagementProposalList,
} from "@/shared/mocks/contracts";

import {
  AGE_GROUP_RULES,
  AGE_GROUP_HEALTH_FACTORS,
  buildAgeGroupCtx,
} from "@/shared/lib/advisor-engine/rules/age-group";
import type { AgeGroupContext } from "@/shared/lib/advisor-engine/rules/age-group";
import type { RAGContext } from "@/shared/lib/advisor-engine/types";

import type {
  AgeBracketId,
  GenerationalRipple,
  AgingOutRisk,
  CrossDomainThread,
  EngagementTier,
  ThreadTargetDomain,
} from "../types";

import {
  AGE_BRACKETS,
  AGE_ACTIVITY_MATRIX,
  COHORT_SEASONALITY,
  getEngagementTier,
  getHealthThreshold,
  resolveBracketId,
} from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

/** Bracket visual metadata for enriched display (P5) */
export interface BracketMeta {
  id: AgeBracketId;
  label: string;
  color: string;
  icon: string;
  gradient: [string, string];
}

/** Cohort health entry for heatmap visualization (P4) */
export interface CohortHealthEntry {
  bracketId: AgeBracketId;
  label: string;
  healthScore: number;
  trend: "up" | "down" | "stable";
  color: string;
  hotspot: boolean;
}

/** Seasonal context with next peak countdown (P6) */
export interface SeasonalContext {
  currentMonth: number;
  nextPeak?: {
    bracketId: AgeBracketId;
    label: string;
    month: number;
    daysUntil: number;
  };
  activePeaks: AgeBracketId[];
}

// ═══════════════════════════════════════════════════════════
// §2  Typed Rule IDs (P9)
// ═══════════════════════════════════════════════════════════

const AGE_GROUP_RULE_ID = {
  R1_TEEN_CRITICAL: "R1_TEEN_CRITICAL",
  R2_DEMOGRAPHIC_IMBALANCE: "R2_DEMOGRAPHIC_IMBALANCE",
  R3_INSUFFICIENT_ACTIVITIES: "R3_INSUFFICIENT_ACTIVITIES",
  R4_ALL_BALANCED: "R4_ALL_BALANCED",
  R5_TEENS_DECLINING: "R5_TEENS_DECLINING",
  R6_LOW_SATISFACTION: "R6_LOW_SATISFACTION",
  R7_LOW_RETENTION: "R7_LOW_RETENTION",
  R8_RETENTION_EXCELLENT: "R8_RETENTION_EXCELLENT",
  R9_KIDS_GROWING: "R9_KIDS_GROWING",
  R10_CROSS_SELL_SENIORS: "R10_CROSS_SELL_SENIORS",
  R11_SEASONAL_PREP: "R11_SEASONAL_PREP",
  R12_FAMILY_RECOMMENDATIONS: "R12_FAMILY_RECOMMENDATIONS",
  R13_EVENTS_YOUTH_ENGAGEMENT: "R13_EVENTS_YOUTH_ENGAGEMENT",
  R14_SPORTS_TEEN_DECLINE: "R14_SPORTS_TEEN_DECLINE",
  R15_SATISFACTION_CRITICAL: "R15_SATISFACTION_CRITICAL",
} as const;
// ═══════════════════════════════════════════════════════════
// §3  Rule → Bracket Map (P1, P2)
// ═══════════════════════════════════════════════════════════

const ALL_BRACKET_IDS: AgeBracketId[] = AGE_BRACKETS.map((b) => b.id);

const RULE_BRACKET_MAP: Record<string, AgeBracketId[]> = {
  [AGE_GROUP_RULE_ID.R1_TEEN_CRITICAL]: ["youth"],
  [AGE_GROUP_RULE_ID.R5_TEENS_DECLINING]: ["youth"],
  [AGE_GROUP_RULE_ID.R9_KIDS_GROWING]: ["child", "infant"],
  [AGE_GROUP_RULE_ID.R10_CROSS_SELL_SENIORS]: ["senior"],
  [AGE_GROUP_RULE_ID.R13_EVENTS_YOUTH_ENGAGEMENT]: ["youth"],
  [AGE_GROUP_RULE_ID.R14_SPORTS_TEEN_DECLINE]: ["youth"],
  // R15_SATISFACTION_CRITICAL affects all brackets — fallback to ALL_BRACKET_IDS
};

function getAffectedBrackets(ruleId: string): AgeBracketId[] {
  return RULE_BRACKET_MAP[ruleId] ?? ALL_BRACKET_IDS;
}

// ═══════════════════════════════════════════════════════════
// §4  Layer Map (existing pattern)
// ═══════════════════════════════════════════════════════════

const LAYER_MAP = new Map<string, string>(
  AGE_GROUP_RULES.map((r) => [
    generateInsightId("family", r.id),
    r.layer,
  ]),
);

// ═══════════════════════════════════════════════════════════
// §5  Bracket Resolution Helper
// ═══════════════════════════════════════════════════════════

// resolveBracketId — imported from ../types (shared utility)

// ═══════════════════════════════════════════════════════════
// §6  Seasonal Helpers (P6)
// ═══════════════════════════════════════════════════════════

function monthsUntil(currentMonth: number, targetMonth: number): number {
  const diff = targetMonth - currentMonth;
  if (diff === 0) return 0;
  return diff < 0 ? diff + 12 : diff;
}

function getNearestPeak(bracketId: AgeBracketId, currentMonth: number): number {
  const entry = COHORT_SEASONALITY[bracketId];
  if (!entry) return 12;
  let min = 12;
  for (const m of entry.peakMonths) {
    const d = monthsUntil(currentMonth, m);
    if (d < min) min = d;
  }
  return min;
}

function isSeasonallyBoosted(bracketId: AgeBracketId, currentMonth: number): boolean {
  return getNearestPeak(bracketId, currentMonth) <= 1;
}

// ═══════════════════════════════════════════════════════════
// §7  Severity Derivation (P10 — extractable to shared)
// ═══════════════════════════════════════════════════════════

const SEVERITY_LADDER: AdvisorSeverity[] = [
  "low", "info", "medium", "high", "critical",
];

/**
 * Derive display severity from impact + confidence.
 * Optional seasonalBoost bumps severity one level up.
 *
 * TODO: Extract to @/shared/lib/advisor-engine/severity.ts
 * when Events advisor also needs seasonal support.
 */
function deriveSeverity(
  impact: string,
  confidence: number,
  seasonalBoost?: boolean,
): AdvisorSeverity {
  let severity: AdvisorSeverity;
  if (impact === "high" && confidence >= 90) severity = "critical";
  else if (impact === "high") severity = "high";
  else if (impact === "medium") severity = "medium";
  else if (impact === "low") severity = "info";
  else severity = "low";

  if (seasonalBoost) {
    const idx = SEVERITY_LADDER.indexOf(severity);
    if (idx < SEVERITY_LADDER.length - 1) severity = SEVERITY_LADDER[idx + 1];
  }

  return severity;
}

// ═══════════════════════════════════════════════════════════
// §8  Bracket Meta Helper (P5)
// ═══════════════════════════════════════════════════════════

function toBracketMeta(bracketId: AgeBracketId): BracketMeta | undefined {
  const bracket = AGE_BRACKETS.find((b) => b.id === bracketId);
  if (!bracket) return undefined;
  return {
    id: bracket.id,
    label: bracket.label,
    color: bracket.color,
    icon: bracket.icon,
    gradient: bracket.gradient,
  };
}

// ═══════════════════════════════════════════════════════════
// §9  Enriched METRIC_DISPLAY (P5, P9)
// ═══════════════════════════════════════════════════════════

interface MetricDisplayData {
  metric?: string;
  metricValue?: string | number;
  bracketMeta?: BracketMeta;
}

const METRIC_DISPLAY: Record<
  string,
  (ctx: AgeGroupContext) => MetricDisplayData
> = {
  [AGE_GROUP_RULE_ID.R1_TEEN_CRITICAL]: (ctx) => ({
    metric: "Teens %",
    metricValue: `${ctx.teensPct.toFixed(1)}%`,
    bracketMeta: toBracketMeta("youth"),
  }),
  [AGE_GROUP_RULE_ID.R2_DEMOGRAPHIC_IMBALANCE]: (ctx) => ({
    metric: "Máximo grupo",
    metricValue: `${ctx.maxGroupPct.toFixed(0)}%`,
  }),
  [AGE_GROUP_RULE_ID.R3_INSUFFICIENT_ACTIVITIES]: (ctx) => ({
    metric: "Actividades",
    metricValue: ctx.totalActivities,
  }),
  [AGE_GROUP_RULE_ID.R4_ALL_BALANCED]: (ctx) => ({
    metric: "Grupos balanceados",
    metricValue: ctx.analytics?.age_distribution?.length ?? 0,
  }),
  [AGE_GROUP_RULE_ID.R5_TEENS_DECLINING]: (ctx) => ({
    metric: "Grupos en declive",
    metricValue: ctx.decliningGroups.join(", "),
    bracketMeta: toBracketMeta("youth"),
  }),
  [AGE_GROUP_RULE_ID.R6_LOW_SATISFACTION]: (ctx) => ({
    metric: ctx.worstProgramName ?? "Programa",
    metricValue:
      ctx.worstProgramSat > 0 ? ctx.worstProgramSat.toFixed(1) : "N/A",
  }),
  [AGE_GROUP_RULE_ID.R7_LOW_RETENTION]: (ctx) => ({
    metric: "Actividades bajas",
    metricValue: ctx.lowRetentionPrograms,
  }),
  [AGE_GROUP_RULE_ID.R8_RETENTION_EXCELLENT]: (ctx) => ({
    metric: "Retención",
    metricValue: `${ctx.retentionRate}%`,
  }),
  [AGE_GROUP_RULE_ID.R9_KIDS_GROWING]: (ctx) => ({
    metric: "Actividades actuales",
    metricValue: ctx.totalActivities,
    bracketMeta: toBracketMeta("child"),
  }),
  [AGE_GROUP_RULE_ID.R10_CROSS_SELL_SENIORS]: (ctx) => ({
    metric: "Seniors activos",
    metricValue: ctx.seniorsEnrolled,
    bracketMeta: toBracketMeta("senior"),
  }),
  [AGE_GROUP_RULE_ID.R11_SEASONAL_PREP]: (ctx) => ({
    metric: "Mes actual",
    metricValue: ctx.currentMonth,
  }),
  [AGE_GROUP_RULE_ID.R12_FAMILY_RECOMMENDATIONS]: (ctx) => ({
    metric: "Recomendaciones pendientes",
    metricValue: ctx.pendingRecommendations,
  }),
  [AGE_GROUP_RULE_ID.R13_EVENTS_YOUTH_ENGAGEMENT]: () => ({
    metric: "Events engagement",
    metricValue: "Signal externo",
  }),
  [AGE_GROUP_RULE_ID.R14_SPORTS_TEEN_DECLINE]: () => ({
    metric: "Sports participation",
    metricValue: "Signal externo",
  }),
  [AGE_GROUP_RULE_ID.R15_SATISFACTION_CRITICAL]: (ctx) => ({
    metric: "Satisfacción",
    metricValue:
      ctx.worstProgramSat > 0
        ? ctx.worstProgramSat.toFixed(1)
        : "N/A",
  }),
};

// ═══════════════════════════════════════════════════════════
// §9.5  Activity → Cross-Domain Target Mapping (Phase 34+)
// ═══════════════════════════════════════════════════════════

/** Maps each club activity to its natural cross-domain targets. */
const ACTIVITY_DOMAIN_MAP: Record<string, ThreadTargetDomain[]> = {
  "Piscina":             ["sports", "wellness"],
  "Golf":                ["sports", "cultural"],
  "Tenis":               ["sports"],
  "Gimnasio":            ["sports", "wellness"],
  "Yoga":                ["wellness"],
  "Eventos Sociales":    ["events", "communications"],
  "Gastronomía":         ["cultural", "events"],
  "Programas Juveniles": ["families"],
};

// ═══════════════════════════════════════════════════════════
// §10  toBaseInsight Adapter (existing + P6 seasonal)
// ═══════════════════════════════════════════════════════════

function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: AgeGroupContext,
  currentMonth: number,
): BaseInsight {
  const ruleId = insight.id.split("_").slice(2).join("_");
  const metricData = METRIC_DISPLAY[ruleId]?.(ctx) ?? {};

  // P6: Seasonal boost if affected brackets are near their peak
  const affectedBrackets = getAffectedBrackets(ruleId);
  const isBracketSpecific = affectedBrackets.length < ALL_BRACKET_IDS.length;
  const seasonalBoost =
    isBracketSpecific &&
    affectedBrackets.some((id) => isSeasonallyBoosted(id, currentMonth));

  return {
    id: insight.id,
    layer: LAYER_MAP.get(insight.id) ?? "social",
    severity: deriveSeverity(insight.impact, insight.confidence, seasonalBoost),
    title: insight.title,
    description: insight.reasoning,
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: "age_group",
    action: insight.action
      ? {
          label: insight.action.label,
          tool: insight.action.tool,
          server: insight.action.server,
          params: insight.action.params,
          approval: insight.action.approval_level,
          route: insight.target_view,
        }
      : undefined,
    metric: metricData.metric,
    metricValue: metricData.metricValue,
  };
}

// ═══════════════════════════════════════════════════════════
// §11  Hook
// ═══════════════════════════════════════════════════════════

export function useAgeGroupAdvisor(
  healthScore: AgeGroupHealthScore | null,
  analytics: AgeGroupAnalyticsEnhanced | null,
  recommendations: AgeRecommendationEnhanced[],
  proposals: AgeGroupEngagementProposalList | null,
  ragContext?: RAGContext[],
) {
  const rawData = useMemo(
    () => ({ healthScore, analytics, recommendations, proposals }),
    [healthScore, analytics, recommendations, proposals],
  );

  const config = useMemo(
    () => ({
      domain: "family" as const,
      buildCtx: buildAgeGroupCtx,
      rules: AGE_GROUP_RULES,
      healthFactors: AGE_GROUP_HEALTH_FACTORS,
    }),
    [],
  );

  const result = useAdvisorEngine<AgeGroupContext>(
    config,
    rawData,
    undefined,
    true,
    ragContext,
  );

  // Shared context for downstream memos
  const ctx = useMemo(() => buildAgeGroupCtx(rawData), [rawData]);

  // ── Emit cross-domain signals post-evaluate ──
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // ── P6: Seasonal Context ──
  const seasonalContext = useMemo((): SeasonalContext => {
    const month = new Date().getMonth() + 1;
    const activePeaks: AgeBracketId[] = [];
    let nextPeak: SeasonalContext["nextPeak"];

    for (const bracket of AGE_BRACKETS) {
      const entry = COHORT_SEASONALITY[bracket.id];
      if (!entry) continue;

      if (entry.peakMonths.includes(month)) {
        activePeaks.push(bracket.id);
      }

      const near = getNearestPeak(bracket.id, month);
      if (
        near >= 1 &&
        near <= 3 &&
        (!nextPeak || near < (nextPeak.daysUntil / 30))
      ) {
        const peakMonth = entry.peakMonths.reduce((best, m) => {
          const d = monthsUntil(month, m);
          const bestD = monthsUntil(month, best);
          return d < bestD ? m : best;
        });
        nextPeak = {
          bracketId: bracket.id,
          label: bracket.label,
          month: peakMonth,
          daysUntil: near * 30,
        };
      }
    }

    return { currentMonth: month, nextPeak, activePeaks };
  }, []);

  // ── P4: Cohort Health Heatmap ──
  const cohortHealth = useMemo((): CohortHealthEntry[] => {
    const dist = rawData.analytics?.age_distribution;

    return AGE_BRACKETS.map((bracket) => {
      let score = 50;

      if (dist) {
        const entries = dist.filter(
          (d) => resolveBracketId(d.age_range) === bracket.id,
        );
        const pct = entries.reduce((sum, e) => sum + (e.percentage ?? 0), 0);
        const count = entries.reduce((sum, e) => sum + (e.count ?? 0), 0);

        // Balance heuristics
        if (pct > 35) score -= 15;
        if (pct > 50) score -= 15;
        if (pct >= 10 && pct <= 30) score += 20;
        if (pct < 3 && count > 0) score -= 10;

        // High-resonance brackets being populated = bonus
        if (bracket.resonance >= 70 && pct >= 10) score += 10;
      }

      // Declining groups penalty
      const isDeclining =
        ctx.decliningGroups.includes(bracket.id) ||
        ctx.decliningGroups.includes(bracket.label);
      if (isDeclining) score -= 15;

      score = Math.max(0, Math.min(100, score));
      const threshold = getHealthThreshold(score);

      return {
        bracketId: bracket.id,
        label: bracket.label,
        healthScore: score,
        trend: isDeclining
          ? ("down" as const)
          : score >= 60
            ? ("up" as const)
            : ("stable" as const),
        color: threshold?.color ?? "#6b7280",
        hotspot: score < 30,
      };
    });
  }, [rawData.analytics, ctx]);

  // ── P3: Aging-Out Risk Pipeline ──
  const agingOutRisks = useMemo((): AgingOutRisk[] => {
    const dist = rawData.analytics?.age_distribution;
    if (!dist) return [];

    const risks: AgingOutRisk[] = [];

    for (const bracket of AGE_BRACKETS) {
      const [min, max] = bracket.range;
      if (max >= 120) continue; // "senior" has no aging-out ceiling

      const rangeSize = max - min;
      const boundarySize = rangeSize * 0.2; // last 20% of bracket
      const bracketEntries = dist.filter(
        (d) => resolveBracketId(d.age_range) === bracket.id,
      );
      const totalInBracket = bracketEntries.reduce(
        (s, e) => s + (e.count ?? 0),
        0,
      );

      // Proportional estimate of members near upper boundary
      const estimatedAtRisk = Math.round(
        totalInBracket * (boundarySize / Math.max(rangeSize, 1)),
      );

      if (estimatedAtRisk <= 0) continue;

      // Next bracket = natural replacement source
      const idx = AGE_BRACKETS.findIndex((b) => b.id === bracket.id);
      const nextBracket = AGE_BRACKETS[idx + 1];
      const replacementCount = nextBracket
        ? dist
            .filter((d) => resolveBracketId(d.age_range) === nextBracket.id)
            .reduce((s, e) => s + (e.count ?? 0), 0)
        : 0;

      const avgYearsRemaining =
        Math.round((boundarySize / 2) * 10) / 10;
      const netChange = replacementCount - estimatedAtRisk;

      let urgency: AgingOutRisk["urgency"] = "monitor";
      if (netChange < -5) urgency = "act";
      else if (netChange < 0) urgency = "plan";

      risks.push({
        bracketId: bracket.id,
        membersAtRisk: estimatedAtRisk,
        avgYearsRemaining,
        replacementRate: replacementCount,
        netChange,
        urgency,
      });
    }

    return risks;
  }, [rawData.analytics]);

  // ── P2: Generational Ripple Propagation ──
  const ripples = useMemo((): GenerationalRipple[] => {
    if (!result) return [];
    const generated: GenerationalRipple[] = [];

    for (const insight of result.insights) {
      const ruleId = insight.id.split("_").slice(2).join("_");
      const affectedBrackets = getAffectedBrackets(ruleId);
      if (affectedBrackets.length >= ALL_BRACKET_IDS.length) continue;

      const isNegative = insight.impact === "high";
      const isPositive = insight.impact === "low" && insight.confidence >= 70;

      for (const bracketId of affectedBrackets) {
        const bracket = AGE_BRACKETS.find((b) => b.id === bracketId);
        if (!bracket) continue;
        const idx = AGE_BRACKETS.findIndex((b) => b.id === bracketId);

        // Negative impact ripples toward older brackets
        if (isNegative && idx < AGE_BRACKETS.length - 1) {
          const target = AGE_BRACKETS[idx + 1];
          generated.push({
            source: bracketId,
            direction: "older",
            velocity:
              bracket.resonance >= 70
                ? "fast"
                : bracket.resonance >= 40
                  ? "moderate"
                  : "slow",
            description: `Impacto en ${bracket.label} se propaga hacia ${target.label}`,
            evidence: [insight.title],
          });
        }

        // Positive impact ripples toward younger brackets
        if (isPositive && idx > 0) {
          const target = AGE_BRACKETS[idx - 1];
          generated.push({
            source: bracketId,
            direction: "younger",
            velocity:
              bracket.resonance >= 70
                ? "fast"
                : bracket.resonance >= 40
                  ? "moderate"
                  : "slow",
            description: `Crecimiento en ${bracket.label} inspira a ${target.label}`,
            evidence: [insight.title],
          });
        }
      }
    }

    return generated;
  }, [result]);

  // ── P7: Cross-Domain Thread Emission (Phase 34+ enhanced) ──
  const crossDomainThreads = useMemo((): CrossDomainThread[] => {
    const dist = rawData.analytics?.age_distribution;
    if (!dist) return [];

    const threads: CrossDomainThread[] = [];

    // Top 3 brackets by member count
    const topEntries = [...dist]
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
      .slice(0, 3);

    for (const entry of topEntries) {
      const bracketId = resolveBracketId(entry.age_range);
      if (!bracketId) continue;

      // Top 2 activities with affinity >= 60
      const topActivities = AGE_ACTIVITY_MATRIX.map((a) => ({
        activity: a.activity,
        score: a.scores[bracketId],
      }))
        .filter((a) => a.score >= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);

      for (const act of topActivities) {
        // Map activity to natural cross-domain targets
        const domains = ACTIVITY_DOMAIN_MAP[act.activity] ?? ["events"];
        for (const targetDomain of domains) {
          threads.push({
            sourceDomain: "age_group",
            targetDomain,
            tension: Math.min(act.score, 100),
            insight: `${entry.age_range} con alta afinidad a ${act.activity}`,
            dataPoints: entry.count ?? 0,
            direction: "positive",
          });
        }
      }
    }

    // Deduplicate by targetDomain (keep highest tension per domain)
    const deduped = new Map<string, CrossDomainThread>();
    for (const thread of threads) {
      const key = thread.targetDomain;
      const existing = deduped.get(key);
      if (!existing || thread.tension > existing.tension) {
        deduped.set(key, thread);
      }
    }

    return [...deduped.values()].sort((a, b) => b.tension - a.tension);
  }, [rawData.analytics]);

  // ── P1: Resonance-Weighted Insight Ranking ──
  const insights = useMemo(() => {
    if (!result) return [];
    const currentMonth = seasonalContext.currentMonth;

    const adapted = result.insights.map((i) =>
      toBaseInsight(i, ctx, currentMonth),
    );

    // Re-rank: severity weight × max resonance of affected brackets
    const severityWeight: Record<string, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      info: 2,
      low: 1,
    };

    return adapted.sort((a, b) => {
      const ruleA = a.id.split("_").slice(2).join("_");
      const ruleB = b.id.split("_").slice(2).join("_");

      const resonanceA = Math.max(
        ...getAffectedBrackets(ruleA).map(
          (id) => AGE_BRACKETS.find((b) => b.id === id)?.resonance ?? 0,
        ),
        0,
      );
      const resonanceB = Math.max(
        ...getAffectedBrackets(ruleB).map(
          (id) => AGE_BRACKETS.find((b) => b.id === id)?.resonance ?? 0,
        ),
        0,
      );

      const scoreA = (severityWeight[a.severity] ?? 0) * resonanceA;
      const scoreB = (severityWeight[b.severity] ?? 0) * resonanceB;

      return scoreB - scoreA;
    });
  }, [result, ctx, seasonalContext]);

  // ── P5: Insight bracket metadata map ──
  const insightBrackets = useMemo(() => {
    const map = new Map<string, BracketMeta>();
    if (!result) return map;

    for (const insight of result.insights) {
      const ruleId = insight.id.split("_").slice(2).join("_");
      const meta = METRIC_DISPLAY[ruleId]?.(ctx)?.bracketMeta;
      if (meta) map.set(insight.id, meta);
    }
    return map;
  }, [result, ctx]);

  // ── P8: Insight engagement tier map ──
  const insightTiers = useMemo(() => {
    const map = new Map<string, EngagementTier>();
    if (!result || !rawData.analytics?.age_distribution) return map;

    for (const insight of result.insights) {
      const ruleId = insight.id.split("_").slice(2).join("_");
      const brackets = getAffectedBrackets(ruleId);
      if (brackets.length >= ALL_BRACKET_IDS.length) continue;

      // First affected bracket's engagement
      const bracketId = brackets[0];
      const entry = rawData.analytics.age_distribution.find(
        (d) => resolveBracketId(d.age_range) === bracketId,
      );
      if (!entry) continue;

      // Estimate engagement from distribution percentage
      const engagementEstimate = Math.min(
        100,
        Math.max(0, (entry.percentage ?? 0) * 2),
      );
      const tier = getEngagementTier(engagementEstimate);
      if (tier) map.set(insight.id, tier);
    }
    return map;
  }, [result, rawData.analytics]);

  // ── Derived values ──
  const topInsights = useMemo(() => insights.slice(0, 3), [insights]);

  const hasHighSeverity = useMemo(
    () =>
      insights.some(
        (i) => i.severity === "high" || i.severity === "critical",
      ),
    [insights],
  );

  return {
    // Core
    insights,
    topInsights,
    hasHighSeverity,
    totalInsights: insights.length,
    // Intelligence outputs
    ripples,
    agingOutRisks,
    cohortHealth,
    crossDomainThreads,
    seasonalContext,
    // Enrichment maps
    insightBrackets,
    insightTiers,
  };
}