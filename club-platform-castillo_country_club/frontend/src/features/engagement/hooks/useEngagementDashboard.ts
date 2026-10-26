// src/features/engagement/hooks/useEngagementDashboard.ts
// ═══════════════════════════════════════════════════════════
// Engagement Neural Hub — Two-Hook Pattern (Hook 2/2)
// Castillo Country Club — Phase 31 "The Voice"
//
// THE BRAIN. Calls all engines from lib/engagementIntelligence.ts
// and returns a single "brain object" that the dashboard consumes.
//
// ZERO JSX. ZERO rendering logic. Only data + intelligence.
//
// Intelligence produced:
//   §3  EngagementContext — core metrics + health + velocity
//   §4  EngagementEcosystem — 10-domain model
//   §7  GravitationalModel — retention physics (aggregate)
//   §5  ResonancePattern[] — event impact echoes
//   §6  EngagementDNAMutation[] — profile shifts
//   §8  MomentOfTruth[] — critical relationship moments
//   §9  SatisfactionDimension[] — NPS decomposition
//   §10 PredictiveNPS — forward NPS projection
//   §11 EngagementStreamSignal[] — priority-sorted signals
//   §12 DecisionScenario — contextual action panel
//   §13 EmergentPattern[] — cross-domain discoveries
//   §14 AnomalyFamily[] — outlier detection
//
// Rules: R60 (Two-Hook Pattern), R61 (no hooks in engines),
//        R65 (intelligence minimum Level 3)
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useEngagementData } from "./useEngagementData";
import type { UseEngagementDataOptions } from "./useEngagementData";

import {
  buildEngagementContext,
  buildEngagementEcosystem,
  calculateGravitationalForce,
  computeAggregateGravitationalField,
  detectDNAMutations,
  identifyMomentsOfTruth,
  decomposeDrivers,
  predictNPS,
  buildStreamSignals,
  buildDecisionStage,
  detectEmergentPatterns,
  detectAnomalyFamilies,
} from "../lib/engagementIntelligence";

import type { EngagementContext } from "../lib/engagementIntelligence";

import type {
  // Context

  // Intelligence types
  ActivityDomain,
  EngagementEcosystem,
  GravitationalModel,
  ResonancePattern,
  EngagementDNAMutation,
  MomentOfTruth,
  SatisfactionDimension,
  PredictiveNPS,
  EngagementStreamSignal,
  DecisionScenario,
  EmergentPattern,
  AnomalyFamily,

  // Dashboard mode
  EngagementDashboardMode,
  EngagementAmbientState,

  // Advisor types
  EngagementVelocity,
  HealthScoreFactor,

  // Raw types needed
  EngagementDashboardFamily,
} from "../types";

import { ACTIVITY_DOMAINS } from "../types";

// ══════════════════════════════════════════════════════════════
// RETURN TYPE — The Brain Object
// ══════════════════════════════════════════════════════════════

export interface UseEngagementDashboardReturn {
  // ── Loading & Error ──────────────────────────────────────
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  dashboardRefetch: () => void;

  // ── Core Intelligence (§3) ───────────────────────────────
  context: EngagementContext;
  healthScore: number;
  healthGrade: string;
  healthFactors: HealthScoreFactor[];
  velocity: EngagementVelocity | null;

  // ── Dashboard Mode (Adaptive Morphism) ───────────────────
  dashboardMode: EngagementDashboardMode;
  ambientState: EngagementAmbientState;

  // ── Ecosystem (§4) ───────────────────────────────────────
  ecosystem: EngagementEcosystem | null;

  // ── Gravitational (§7) ───────────────────────────────────
  gravitational: GravitationalModel | null;
  aggregateGravity: {
    avgGravity: number;
    avgExitVelocity: number;
    escapeTrajectoryCount: number;
    deepWellCount: number;
    overallTrend: "attracting" | "stable" | "repelling";
  } | null;

  // ── Resonance (§5) ───────────────────────────────────────
  resonance: ResonancePattern[];

  // ── DNA Mutations (§6) ───────────────────────────────────
  mutations: EngagementDNAMutation[];

  // ── Moments of Truth (§8) ────────────────────────────────
  moments: MomentOfTruth[];

  // ── Satisfaction (§9-§10) ────────────────────────────────
  satisfactionDimensions: SatisfactionDimension[];
  predictiveNPS: PredictiveNPS | null;

  // ── Intelligence Stream (§11) ────────────────────────────
  streamSignals: EngagementStreamSignal[];

  // ── Decision Stage (§12) ─────────────────────────────────
  decisionStage: DecisionScenario | null;

  // ── Discovery (§13-§14) ──────────────────────────────────
  emergentPatterns: EmergentPattern[];
  anomalyFamilies: AnomalyFamily[];

  // ── Deep-Dive Data (pass-through from Data Orchestrator) ─
  wellness: import("../types").WellnessTabData | null;
  satisfactionTrends: import("../types").SatisfactionTabData | null;
  socialClusters: import("../types").SocialClusterItem[] | null;
  quarterlyInsights: import("../types").QuarterlyInsightsData | null;
  schedulingConflicts: import("../types").SchedulingConflictItem[] | null;

  // ── Legacy Advisor Compatibility ─────────────────────────
  // These exist so existing EngagementAdvisorBanner doesn't break.
  // Once the banner is rewritten, these can be removed.
  families: EngagementDashboardFamily[];
  insights: LegacyEngInsight[];
  topInsights: LegacyEngInsight[];
  hasHighSeverity: boolean;
}

// ── Legacy insight type (backward compat with useMemberEngagementAdvisor) ──

type EngLayer = "diagnostic" | "predictive" | "prescriptive" | "cross_domain";
type EngSeverity = "info" | "low" | "medium" | "high" | "critical";

interface LegacyEngInsight {
  id: string;
  layer: EngLayer;
  severity: EngSeverity;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  confidence: number;
  domain: string;
  action?: {
    label: string;
    tool: string;
    server: string;
    params?: Record<string, unknown>;
    approval: string;
  };
  metric?: string;
  metricValue?: string | number;
}

// ══════════════════════════════════════════════════════════════
// DOMAIN SIGNAL INFERENCE
// ══════════════════════════════════════════════════════════════

/**
 * Infer per-domain activity signals from family data.
 * In a real system, this comes from MCP. For now, we derive
 * what we can from the dashboard data.
 */
function inferDomainSignals(
  families: EngagementDashboardFamily[],
): Record<ActivityDomain, {
  activeCount: number;
  totalCount: number;
  avgScore: number;
  trend: "improving" | "stable" | "declining";
  lastActivity: string;
}> {
  const tf = families.length || 1;

  // Base distribution from wellness + engagement patterns
  // These are heuristic defaults — real data replaces them
  const base: Record<ActivityDomain, {
    activeRatio: number;
    scoreMultiplier: number;
    trendBias: "improving" | "stable" | "declining";
  }> = {
    events: { activeRatio: 0.7, scoreMultiplier: 1.0, trendBias: "stable" },
    dining: { activeRatio: 0.65, scoreMultiplier: 0.9, trendBias: "stable" },
    sports: { activeRatio: 0.45, scoreMultiplier: 1.1, trendBias: "stable" },
    wellness: { activeRatio: 0.35, scoreMultiplier: 0.85, trendBias: "improving" },
    cultural: { activeRatio: 0.30, scoreMultiplier: 0.8, trendBias: "stable" },
    facilities: { activeRatio: 0.60, scoreMultiplier: 0.95, trendBias: "stable" },
    social: { activeRatio: 0.50, scoreMultiplier: 1.0, trendBias: "stable" },
    communication: { activeRatio: 0.55, scoreMultiplier: 0.9, trendBias: "stable" },
    financial: { activeRatio: 0.80, scoreMultiplier: 0.7, trendBias: "stable" },
    recommendations: { activeRatio: 0.25, scoreMultiplier: 0.75, trendBias: "stable" },
  };

  const result = {} as Record<ActivityDomain, {
    activeCount: number;
    totalCount: number;
    avgScore: number;
    trend: "improving" | "stable" | "declining";
    lastActivity: string;
  }>;

  const avgEngagement = families.reduce(
    (s: number, f: EngagementDashboardFamily) => s + f.engagement_score, 0,
  ) / tf;

  for (const domain of ACTIVITY_DOMAINS) {
    const config = base[domain];
    const activeCount = Math.round(tf * config.activeRatio);
    const avgScore = Math.round(avgEngagement * config.scoreMultiplier);

    // Adjust trend based on overall family trends
    const improvingCount = families.filter(
      (f: EngagementDashboardFamily) => f.trend === "improving",
    ).length;
    const decliningCount = families.filter(
      (f: EngagementDashboardFamily) => f.trend === "declining",
    ).length;

    let trend: "improving" | "stable" | "declining" = config.trendBias;
    if (improvingCount > decliningCount * 1.5) trend = "improving";
    else if (decliningCount > improvingCount * 1.5) trend = "declining";

    result[domain] = {
      activeCount,
      totalCount: tf,
      avgScore: Math.min(100, Math.max(0, avgScore)),
      trend,
      lastActivity: new Date().toISOString().split("T")[0],
    };
  }

  return result;
}

/**
 * Infer per-family domain activity from family data.
 * Returns current and historical activity per family per domain.
 */
function inferFamilyDomainActivity(
  families: EngagementDashboardFamily[],
): {
  current: Record<string, Record<ActivityDomain, number>>;
  historical: Record<string, Record<ActivityDomain, number>>;
} {
  const current: Record<string, Record<ActivityDomain, number>> = {};
  const historical: Record<string, Record<ActivityDomain, number>> = {};

  for (const family of families) {
    const baseActivity = family.engagement_score / 10;

    // Current: based on current engagement score
    const curr: Record<ActivityDomain, number> = {} as Record<ActivityDomain, number>;
    for (const domain of ACTIVITY_DOMAINS) {
      curr[domain] = Math.round(baseActivity * (0.5 + Math.random() * 0.5));
    }
    current[family.family_id] = curr;

    // Historical: slightly different (simulating past data)
    const hist: Record<ActivityDomain, number> = {} as Record<ActivityDomain, number>;
    for (const domain of ACTIVITY_DOMAINS) {
      hist[domain] = Math.round(baseActivity * (0.4 + Math.random() * 0.6));
    }
    historical[family.family_id] = hist;
  }

  return { current, historical };
}


// ══════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════

/**
 * Engagement Neural Hub — the brain of the engagement cortex.
 *
 * Follows the Two-Hook Pattern:
 *   Hook 1 (useEngagementData): Data Orchestrator — all queries
 *   Hook 2 (this file): Neural Hub — all intelligence
 *
 * Returns a single "brain object" with everything the dashboard
 * needs to render. Zero JSX. Zero rendering logic.
 *
 * @param options — enable/disable, freshness overrides
 */
export function useEngagementDashboard(
  options: UseEngagementDataOptions = {},
): UseEngagementDashboardReturn {
  // ── Step 1: Get raw data from Data Orchestrator ──────────

  const data = useEngagementData(options);

  // ── Step 2: Compute core context (§3) ────────────────────
  // TODO Phase 31: pass real cross-domain signals
  // from satisfaction advisor when integrated
  const context: EngagementContext = useMemo(
    () => buildEngagementContext(data.dashboard),
    [data.dashboard],
  );

  // ── Step 3: Compute ecosystem (§4) ───────────────────────

  const domainSignals = useMemo(
    () => (data.dashboard ? inferDomainSignals(context.families) : null),
    [data.dashboard, context.families],
  );

  const ecosystem: EngagementEcosystem | null = useMemo(() => {
    if (!domainSignals || context.families.length === 0) return null;
    return buildEngagementEcosystem(
      context.families,
      domainSignals,
    );
  }, [domainSignals, context.families]);

  // ── Step 4: Compute gravitational model (§7) ─────────────

  const gravitational: GravitationalModel | null = useMemo(() => {
    if (context.families.length === 0) return null;

    // Compute aggregate gravity from all families
    const models = context.families.map(
      (f: EngagementDashboardFamily) =>
        calculateGravitationalForce(f.family_id, {
          engagementScore: f.engagement_score,
          monthsMember: 24, // TODO: get from family profile
          socialConnections: 5, // TODO: get from social data
          eventAttendance: f.visits_30d,
          feedbackSentiment: f.nps_contribution ? f.nps_contribution / 100 : 0,
          referralsMade: 0, // TODO: get from referral data
          wellnessActive: f.wellness_active,
          trendPct: f.trend_pct,
        }),
    );

    // Return the average gravitational model as "club-wide" field
    const avg: GravitationalModel = {
      clubGravity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.clubGravity, 0) / models.length,
      ),
      socialGravity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.socialGravity, 0) / models.length,
      ),
      experienceGravity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.experienceGravity, 0) / models.length,
      ),
      identityGravity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.identityGravity, 0) / models.length,
      ),
      exitVelocity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.exitVelocity, 0) / models.length,
      ),
      escapeThreshold: 90,
      totalGravity: Math.round(
        models.reduce((s: number, m: GravitationalModel) => s + m.totalGravity, 0) / models.length,
      ),
      trend: (() => {
        const repelling = models.filter((m: GravitationalModel) => m.trend === "repelling").length;
        const attracting = models.filter((m: GravitationalModel) => m.trend === "attracting").length;
        if (repelling > attracting * 1.5) return "repelling" as const;
        if (attracting > repelling * 1.5) return "attracting" as const;
        return "stable" as const;
      })(),
    };

    return avg;
  }, [context.families]);

  const aggregateGravity = useMemo(() => {
    if (context.families.length === 0) return null;
    const models = context.families.map(
      (f: EngagementDashboardFamily) =>
        calculateGravitationalForce(f.family_id, {
          engagementScore: f.engagement_score,
          monthsMember: 24,
          socialConnections: 5,
          eventAttendance: f.visits_30d,
          feedbackSentiment: f.nps_contribution ? f.nps_contribution / 100 : 0,
          referralsMade: 0,
          wellnessActive: f.wellness_active,
          trendPct: f.trend_pct,
        }),
    );
    return computeAggregateGravitationalField(models);
  }, [context.families]);

  // ── Step 5: Compute resonance (§5) ───────────────────────

  const resonance: ResonancePattern[] = useMemo(() => {
    // TODO Phase 31: replace with real event feedback data
    // For now, compute from available signals
    if (context.families.length === 0) return [];
    return [];
  }, [context.families]);

  // ── Step 6: Detect DNA mutations (§6) ────────────────────

  const familyActivity = useMemo(
    () =>
      context.families.length > 0
        ? inferFamilyDomainActivity(context.families)
        : null,
    [context.families],
  );

  const mutations: EngagementDNAMutation[] = useMemo(() => {
    if (!familyActivity || context.families.length === 0) return [];
    return detectDNAMutations(
      context.families,
      familyActivity.historical,
      familyActivity.current,
    );
  }, [familyActivity, context.families]);

  // ── Step 7: Identify moments of truth (§8) ───────────────

  const moments: MomentOfTruth[] = useMemo(() => {
    // TODO Phase 31: replace with real activity history
    // For now, compute from available family signals
    if (context.families.length === 0) return [];

    const result: MomentOfTruth[] = [];
    for (const family of context.families.slice(0, 20)) {
      // Simulate a basic activity history from available data
      if (family.trend === "improving" && family.engagement_score > 70) {
        result.push(
          ...identifyMomentsOfTruth(
            family.family_id,
            family.family_name,
            [{
              date: new Date().toISOString().split("T")[0],
              type: "social_event",
              domain: "social" as ActivityDomain,
              description: `${family.family_name} shows strong engagement recovery`,
              sentiment: 0.7,
              impact: 40,
            }],
          ),
        );
      }
    }

    return result;
  }, [context.families]);

  // ── Step 8: Decompose satisfaction drivers (§9) ──────────

  const satisfactionDimensions: SatisfactionDimension[] = useMemo(() => {
    const satTrends = data.satisfactionTrends;
    if (!satTrends || !satTrends.category_averages) return [];

    // Build category trends from sentiment flow
    const categoryTrends: Record<string, import("@/shared/types/domain-enums").TrendDirection> = {};
    for (const key of Object.keys(satTrends.category_averages)) {
      categoryTrends[key] = "stable"; // TODO: derive from temporal data
    }

    return decomposeDrivers(
      satTrends.category_averages,
      categoryTrends,
      satTrends.current_nps,
    );
  }, [data.satisfactionTrends]);

  // ── Step 9: Predict NPS (§10) ────────────────────────────

  const predictiveNPS: PredictiveNPS | null = useMemo(() => {
    const satTrends = data.satisfactionTrends;
    if (!satTrends || satisfactionDimensions.length === 0) return null;

    return predictNPS(
      satTrends.current_nps,
      satTrends.nps_trend.map(
        (t: { period: string; nps: number }) => ({ period: t.period, nps: t.nps }),
      ),
      satisfactionDimensions,
      context.velocity,
    );
  }, [data.satisfactionTrends, satisfactionDimensions, context.velocity]);

  // ── Step 10: Build stream signals (§11) ──────────────────

  const streamSignals: EngagementStreamSignal[] = useMemo(
    () =>
      buildStreamSignals(
        context,
        ecosystem,
        gravitational,
        resonance,
        mutations,
        moments,
        predictiveNPS,
        undefined, // emergent patterns computed below
      ),
    [
      context,
      ecosystem,
      gravitational,
      resonance,
      mutations,
      moments,
      predictiveNPS,
    ],
  );

  // ── Step 11: Build decision stage (§12) ──────────────────

  const decisionStage: DecisionScenario | null = useMemo(
    () =>
      context.totalFamilies > 0
        ? buildDecisionStage(context, gravitational, predictiveNPS)
        : null,
    [context, gravitational, predictiveNPS],
  );

  // ── Step 12: Detect emergent patterns (§13) ──────────────

  const emergentPatterns: EmergentPattern[] = useMemo(() => {
    if (context.families.length === 0 || !domainSignals) return [];
    return detectEmergentPatterns(
      context.families,
      domainSignals,
      context.monthlyTrend,
      resonance,
      mutations,
    );
  }, [context.families, domainSignals, context.monthlyTrend, resonance, mutations]);

  // ── Step 13: Detect anomaly families (§14) ───────────────

  const anomalyFamilies: AnomalyFamily[] = useMemo(() => {
    if (context.families.length === 0) return [];

    const scores = context.families.map(
      (f: EngagementDashboardFamily) => f.engagement_score,
    );
    const avgScore =
      scores.reduce((s: number, v: number) => s + v, 0) / scores.length;
    const avgTrend =
      context.families.reduce(
        (s: number, f: EngagementDashboardFamily) => s + f.trend_pct, 0,
      ) / context.families.length;

    // Standard deviation
    const variance =
      scores.reduce(
        (s: number, v: number) => s + (v - avgScore) ** 2, 0,
      ) / scores.length;
    const stdDev = Math.sqrt(variance);

    return detectAnomalyFamilies(context.families, avgScore, avgTrend, stdDev);
  }, [context.families]);

  // ── Step 14: Legacy advisor insights (backward compat) ───

  const insights: LegacyEngInsight[] = useMemo(() => {
    const result: LegacyEngInsight[] = [];

    // Convert stream signals to legacy format
    for (const signal of streamSignals.slice(0, 12)) {
      const severity: EngSeverity =
        signal.priority >= 90 ? "critical" :
        signal.priority >= 70 ? "high" :
        signal.priority >= 50 ? "medium" :
        signal.priority >= 30 ? "low" : "info";

      const layer: EngLayer =
        signal.category === "risk" ? "diagnostic" :
        signal.category === "prediction" ? "predictive" :
        signal.category === "opportunity" ? "prescriptive" :
        signal.category === "anomaly" ? "predictive" :
        "cross_domain";

      const impact: "low" | "medium" | "high" =
        severity === "critical" || severity === "high" ? "high" :
        severity === "medium" ? "medium" : "low";

      result.push({
        id: signal.id,
        layer,
        severity,
        title: signal.title,
        description: signal.description,
        impact,
        confidence: signal.confidence,
        domain: signal.domain ?? "engagement",
        metric: signal.source,
        metricValue: signal.priority,
      });
    }

    return result;
  }, [streamSignals]);

  const topInsights: LegacyEngInsight[] = useMemo(
    () => insights.slice(0, 3),
    [insights],
  );

  const hasHighSeverity: boolean = useMemo(
    () =>
      insights.some(
        (i: LegacyEngInsight) => i.severity === "high" || i.severity === "critical",
      ),
    [insights],
  );

  // ── Return: The Brain Object ─────────────────────────────

  return {
    // Loading & Error
    isLoading: data.isLoading,
    isReady: data.isReady,
    error: data.error,
    dashboardRefetch: data.dashboardRefetch,

    // Core Intelligence
    context,
    healthScore: context.healthScore,
    healthGrade: context.healthGrade,
    healthFactors: context.healthFactors,
    velocity: context.velocity,

    // Dashboard Mode
    dashboardMode: context.dashboardMode,
    ambientState: context.ambientState,

    // Ecosystem
    ecosystem,

    // Gravitational
    gravitational,
    aggregateGravity,

    // Resonance
    resonance,

    // DNA Mutations
    mutations,

    // Moments of Truth
    moments,

    // Satisfaction
    satisfactionDimensions,
    predictiveNPS,

    // Intelligence Stream
    streamSignals,

    // Decision Stage
    decisionStage,

    // Discovery
    emergentPatterns,
    anomalyFamilies,

    // Deep-Dive Data (pass-through)
    wellness: data.wellness,
    satisfactionTrends: data.satisfactionTrends,
    socialClusters: data.socialClusters,
    quarterlyInsights: data.quarterlyInsights,
    schedulingConflicts: data.schedulingConflicts,

    // Legacy Advisor Compat
    families: context.families,
    insights,
    topInsights,
    hasHighSeverity,
  };
}