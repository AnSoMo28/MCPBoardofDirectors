// ═══════════════════════════════════════════════════════════
// src/features/families/hooks/useFamilyAdvisor.ts
// Phase 34+ Migration — Families Advisor Engine Integration
// Level 6+ Agency · Production Grade
//
// Delegates to Advisor Engine v2 via useAdvisorEngine().
// Maps AdvisorInsightBase → BaseInsight for generic AdvisorBanner.
// Emits fm_* signals post-evaluate via signalBus.
//
// Replaces: 30 inline rules in useMemo with 22 declarative
// RuleDefinition<FamilyContext> evaluated by the engine.
//
// Domain: "family" (AIDomain)
// Rules: 22 (from ../rules/family.ts)
// Health factors: 5 (engagement, activity, social, financial, lifecycle)
// Signals emitted: 6 (fm_*)
// Signals consumed: 5 (spt_*, evt_*, sat_*, age_group_*)
//
// PRE-WRITE VERIFICATION:
//   useAdvisorEngine      → @/shared/lib/advisor-engine/engine.ts ✅
//   signalBus             → @/shared/lib/advisor-engine/signal-bus.ts ✅
//   BaseInsight           → @/shared/components/AdvisorBanner.tsx ✅
//   AdvisorInsightBase    → @/shared/types/ai-intelligence.ts ✅
//   generateInsightId     → @/shared/types/ai-intelligence.ts ✅
//   buildFamilyContext    → @/shared/lib/advisor-engine/rules/family.ts ✅
//   FAMILY_ADVISOR_CONFIG → @/shared/lib/advisor-engine/rules/family.ts ✅
//   FamilyContext         → @/shared/lib/advisor-engine/rules/family.ts ✅
//   SocialBond            → @/features/families/social-types.ts ✅
//   EnrichmentState       → @/features/families/ai-types.ts ✅
//   IntraFamilyBond       → @/features/families/social-types.ts ✅ (NOT RelationshipStrand)
//   animationClass        → @/features/families/config.ts ✅ (NOT cssClass)
//
// ANTI-PATTERNS REMOVED:
//   - 30 inline rules in useMemo        → 22 declarative RuleDefinition via engine
//   - 9 positional parameters           → 1 props object
//   - as unknown Record<string, unknown> → typed SocialBond
//   - daysSince from lib                → local daysBetween
//   - confidence 0-100 vs 0-1 mix       → consistent 0-100
//   - No signal emission                → signalBus.emit post-evaluate
//   - No signal consumption             → crossSignals from signal bus
//   - No health score                   → engine computes health score
//   - No causal chain detection         → engine detects chains
//   - useReducedMotion hook             → removed (E-07)
//
// ═══════════════════════════════════════════════════════════

import { useMemo, useEffect } from "react";

import type { BaseInsight } from "@/shared/components/AdvisorBanner";
import type { AdvisorInsightBase } from "@/shared/types/ai-intelligence";
import { generateInsightId } from "@/shared/types/ai-intelligence";
import { useAdvisorEngine } from "@/shared/lib/advisor-engine/engine";
import { signalBus } from "@/shared/lib/advisor-engine/signal-bus";
import type {
  AdvisorConfig,
  DomainSignal,
  RAGContext,
} from "@/shared/lib/advisor-engine/types";

import type {
  Family,
  ActivityRecord,
  FinancialSummary,
  FamilyPreferences,
} from "../types";

import type {
  EnrichmentState,
  FamilyEnrichmentData,
} from "../ai-types";

import type { SocialBond } from "../social-types";

import {
  buildFamilyContext,
  FAMILY_HEALTH_FACTORS,
  FAMILY_RULES,
} from "@/shared/lib/advisor-engine/rules/family";

import type { FamilyContext } from "@/shared/lib/advisor-engine/rules/family";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

type AdvisorSeverity = "info" | "low" | "medium" | "high" | "critical";

/** Props for useFamilyAdvisor — single object, no positional params */
export interface UseFamilyAdvisorProps {
  readonly family: Family | null | undefined;
  readonly activity: readonly ActivityRecord[] | null | undefined;
  readonly financial: FinancialSummary | null | undefined;
  readonly social: readonly SocialBond[] | null | undefined;
  readonly preferences: FamilyPreferences | null | undefined;
  readonly enrichment: EnrichmentState<FamilyEnrichmentData> | null | undefined;
}

// ═══════════════════════════════════════════════════════════
// §2  Layer Map — rule ID → advisor layer
// ═══════════════════════════════════════════════════════════

const LAYER_MAP = new Map<string, string>(
  FAMILY_RULES.map((r) => [
    generateInsightId("family", r.id),
    r.layer,
  ]),
);

// ═══════════════════════════════════════════════════════════
// §3  Severity Derivation
// ═══════════════════════════════════════════════════════════

/**
 * Derive display severity from impact + confidence.
 * Mirrors the pattern from useAgeGroupAdvisor.
 */
function deriveSeverity(
  impact: string,
  confidence: number,
): AdvisorSeverity {
  if (impact === "high" && confidence >= 90) return "critical";
  if (impact === "high") return "high";
  if (impact === "medium") return "medium";
  if (impact === "low") return "info";
  return "low";
}

// ═══════════════════════════════════════════════════════════
// §4  Metric Display — per-rule metric data for AdvisorBanner
// ═══════════════════════════════════════════════════════════

interface MetricDisplayData {
  metric?: string;
  metricValue?: string | number;
}

const METRIC_DISPLAY: Record<
  string,
  (ctx: FamilyContext) => MetricDisplayData
> = {
  "FM_HEALTH_ENGAGEMENT": (ctx) => ({
    metric: "Engagement",
    metricValue: `${ctx.engagementScore}/100`,
  }),
  "FM_HEALTH_ACTIVITY": (ctx) => ({
    metric: "Actividad 30d",
    metricValue: ctx.recentActivityCount,
  }),
  "FM_HEALTH_FINANCIAL": (ctx) => ({
    metric: "Saldo",
    metricValue: `₡${ctx.balance.toLocaleString("es-CR")}`,
  }),
  "FM_HEALTH_SOCIAL": (ctx) => ({
    metric: "Conexiones",
    metricValue: ctx.connectionCount,
  }),
  "FM_HEALTH_TIER_MISMATCH": (ctx) => ({
    metric: "Miembros / Tier",
    metricValue: `${ctx.memberCount} / ${ctx.family.tier}`,
  }),
  "FM_LIFECYCLE_ONBOARDING": (ctx) => ({
    metric: "Días",
    metricValue: ctx.tenure,
  }),
  "FM_LIFECYCLE_PLATEAU": (ctx) => ({
    metric: "Engagement",
    metricValue: `${ctx.engagementScore}/100`,
  }),
  "FM_LIFECYCLE_PEAK_RISK": (ctx) => ({
    metric: "Engagement",
    metricValue: `${ctx.engagementScore}/100`,
  }),
  "FM_LIFECYCLE_REACTIVATION": (ctx) => ({
    metric: "Antigüedad",
    metricValue: `${Math.floor(ctx.tenure / 365)} años`,
  }),
  "FM_LIFECYCLE_LEGACY": (ctx) => ({
    metric: "Antigüedad",
    metricValue: `${Math.floor(ctx.tenure / 365)} años`,
  }),
  "FM_LIFECYCLE_PROJECTION": (ctx) => ({
    metric: "Etapa actual",
    metricValue: ctx.lifecycle?.currentStage ?? "—",
  }),
  "FM_SOCIAL_REFERRAL": (ctx) => ({
    metric: "Conexiones",
    metricValue: ctx.connectionCount,
  }),
  "FM_SOCIAL_CHILDREN": (ctx) => ({
    metric: "Hijos",
    metricValue: ctx.hasChildren ? "Sí" : "No",
  }),
  "FM_FINANCIAL_TIER_UPGRADE": (ctx) => ({
    metric: "Tier actual",
    metricValue: ctx.family.tier,
  }),
  "FM_FINANCIAL_CONCENTRATION": (ctx) => ({
    metric: "Actividades",
    metricValue: ctx.totalActivityCount,
  }),
  "FM_FINANCIAL_LTV": (ctx) => ({
    metric: "Tenure",
    metricValue: `${Math.floor(ctx.tenure / 365)} años`,
  }),
  "FM_FINANCIAL_HEALTH_RISK": (ctx) => ({
    metric: "Saldo",
    metricValue: `₡${ctx.balance.toLocaleString("es-CR")}`,
  }),
  "FM_ENGAGEMENT_ACTIVITY_GAP": (ctx) => ({
    metric: "Intereses",
    metricValue: ctx.interests.length,
  }),
  "FM_ENGAGEMENT_MILESTONE": (ctx) => ({
    metric: "Aniversario",
    metricValue: new Date(ctx.family.since).toLocaleDateString("es-CR", {
      month: "long",
      day: "numeric",
    }),
  }),
  "FM_ENGAGEMENT_WELLNESS": () => ({
    metric: "Wellness",
    metricValue: "Sin uso",
  }),
  "FM_ENGAGEMENT_COMMS": () => ({
    metric: "Open rate",
    metricValue: "Bajo",
  }),
  "FM_ENGAGEMENT_CROSS_SELL": (ctx) => ({
    metric: "Categorías",
    metricValue: new Set(ctx.activity.map((a) => a.type)).size,
  }),
};

// ═══════════════════════════════════════════════════════════
// §5  toBaseInsight Adapter — AdvisorInsightBase → BaseInsight
// ═══════════════════════════════════════════════════════════

function toBaseInsight(
  insight: AdvisorInsightBase,
  ctx: FamilyContext,
): BaseInsight {
  const ruleId = insight.id.split("-").slice(1).join("_").toUpperCase();
  const metricData = METRIC_DISPLAY[ruleId]?.(ctx) ?? {};

  return {
    id: insight.id,
    layer: LAYER_MAP.get(insight.id) ?? "health",
    severity: deriveSeverity(insight.impact, insight.confidence),
    title: insight.title,
    description: insight.reasoning,
    suggestedAction: insight.action?.label ?? "",
    impact: insight.impact as "low" | "medium" | "high",
    confidence: insight.confidence,
    domain: "family",
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
// §6  Hook
// ═══════════════════════════════════════════════════════════

/**
 * Family Advisor Hook — Advisor Engine integration for the Families domain.
 *
 * Delegates evaluation to the Advisor Engine v2 via useAdvisorEngine().
 * Produces BaseInsight[] for the generic AdvisorBanner component.
 * Emits fm_* signals post-evaluate for cross-domain intelligence.
 *
 * @param props — Single object with all family data
 * @param ragContext — Optional RAG context for enriched evaluation
 *
 * @example
 * const advisor = useFamilyAdvisor({ family, activity, financial, social, preferences, enrichment });
 * <AdvisorBanner insights={advisor.insights} />
 */
export function useFamilyAdvisor(
  props: UseFamilyAdvisorProps,
  ragContext?: RAGContext[],
) {
  const {
    family,
    activity,
    financial,
    social,
    preferences,
    enrichment,
  } = props;

  // ── Build raw data object for engine ──
  const rawData = useMemo(() => {
    if (!family) return null;
    return {
      family,
      activity: activity ?? [],
      financial: financial ?? null,
      social: social ?? [],
      preferences: preferences ?? null,
      enrichment: enrichment ?? { status: "idle" as const },
    };
  }, [family, activity, financial, social, preferences, enrichment]);

  // ── Stable config reference ──
  const config = useMemo<AdvisorConfig<FamilyContext>>(
    () => ({
      domain: "family" as const,
      buildCtx: (rawData: unknown, signals?: readonly DomainSignal[]) =>
        buildFamilyContext(rawData as Parameters<typeof buildFamilyContext>[0], signals),
      rules: FAMILY_RULES,
      healthFactors: FAMILY_HEALTH_FACTORS,
    }),
    [],
  );

  // ── Advisor Engine evaluation ──
  const result = useAdvisorEngine<FamilyContext>(
    config,
    rawData,
    undefined, // crossSignals — injected by signal bus externally
    family != null,
    ragContext,
  );

  // ── Build context for downstream memos ──
  const ctx = useMemo(
    () => (rawData ? buildFamilyContext(rawData) : null),
    [rawData],
  );

  // ── Emit cross-domain signals post-evaluate ──
  useEffect(() => {
    if (result?.signals?.length) {
      signalBus.emit(result.signals);
    }
  }, [result?.signals]);

  // ── Map insights to BaseInsight for AdvisorBanner ──
  const insights = useMemo((): BaseInsight[] => {
    if (!result || !ctx) return [];

    const adapted = result.insights.map((i) => toBaseInsight(i, ctx));

    // Rank by severity weight × confidence
    const severityWeight: Record<string, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      info: 2,
      low: 1,
    };

    return adapted.sort((a, b) => {
      const scoreA = (severityWeight[a.severity] ?? 0) * a.confidence;
      const scoreB = (severityWeight[b.severity] ?? 0) * b.confidence;
      return scoreB - scoreA;
    });
  }, [result, ctx]);

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
    // Core — for AdvisorBanner
    insights,
    topInsights,
    hasHighSeverity,
    totalInsights: insights.length,

    // Health score — from engine computation
    healthScore: result?.healthScore ?? null,

    // Raw engine result — for advanced consumers
    result,
  };
}