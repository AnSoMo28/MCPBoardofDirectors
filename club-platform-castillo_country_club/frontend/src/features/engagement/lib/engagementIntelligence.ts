// src/features/engagement/lib/engagementIntelligence.ts
// ═══════════════════════════════════════════════════════════
// Engagement Intelligence Engine — Pure Functions
// Castillo Country Club — Phase 31 "The Voice"
//
// The cognitive brain of the engagement cortex.
// Takes raw MCP data → produces intelligence.
//
// ZERO hooks. ZERO state. ZERO side effects.
// Every function testable in isolation with mock data.
//
// Sections:
//   §1  computeEngagementVelocity — velocity from trend data
//   §2  computeEngagementHealthScore — 5-factor composite
//   §3  buildEngagementContext — full context builder
//   §4  buildEngagementEcosystem — 10-domain ecosystem model
//   §5  computeResonance — event impact echo detection
//   §6  detectDNAMutations — engagement profile shifts
//   §7  calculateGravitationalForce — retention physics
//   §8  identifyMomentsOfTruth — critical relationship moments
//   §9  decomposeDrivers — NPS → 5 satisfaction dimensions
//   §10 predictNPS — forward NPS with/without intervention
//   §11 buildStreamSignals — priority-sorted signal generation
//   §12 buildDecisionStage — contextual action panel data
//   §13 detectEmergentPatterns — cross-domain pattern discovery
//   §14 detectAnomalyFamilies — families deviating from baseline
//   §15 generateCalibrationFeedback — prediction accuracy tracking
//
// Rules: R61 (engine purity), R62 (type verification),
//        R63 (field access), R65 (intelligence minimum Level 3)
// ═══════════════════════════════════════════════════════════

import type {
  // Core dashboard types
  EngagementDashboardResponse,
  EngagementDashboardTrendPoint,
  EngagementDashboardTrendSummary,
  EngagementDashboardFamily,
  EngagementDashboardRiskFactor,

  // Velocity & health
  EngagementVelocity,
  HealthScoreFactor,

  // Intelligence types (Phase 31)
  ActivityDomain,
  EngagementDomainStatus,
  DomainSymbiosis,
  EngagementEcosystem,
  EngagementDNAMutation,
  GravitationalModel,
  ResonancePattern,
  MomentOfTruth,
  MomentOfTruthType,
  SatisfactionDimension,
  SatisfactionDimensionName,
  SatisfactionDriver,
  PredictiveNPS,
  NPSDriver,
  EngagementStreamSignal,
  DecisionScenario,
  EmergentPattern,
  AnomalyFamily,
  CalibrationDelta,
  EngagementDashboardMode,
  EngagementAmbientState,
  TrendDirection,
} from "../types";

import {
  ACTIVITY_DOMAINS,
  ECOSYSTEM_THRESHOLDS,
  GRAVITATIONAL_CONSTANTS,
  DNA_MUTATION_THRESHOLDS
} from "../types";

import {
  computeEngagementVelocity,
  computeEngagementHealthScore,
  deriveEngDashboardMode,
  deriveAmbientState,
  computeEcosystemDiversity,
  computeEcosystemHealth,
  detectExtinctDomains,
  detectEmergingDomains,
  identifyDominantDomain,
  computeTotalResonance,
  classifyMutationSeverity,
  computeDaysToEscape,
  classifyMomentImpact,
  classifyPatternSignificance,
  computeDiscoveryPriority,
  computeCalibrationDelta,
  computeSignalPriority,
  deriveDecisionScenario,
  clamp
} from "../config";

// Re-export for consumers that import from lib
export {
  computeEngagementVelocity,
  computeEngagementHealthScore,
  deriveEngDashboardMode,
  deriveAmbientState,
};


// ═══════════════════════════════════════════════════════════
// §1 — VELOCITY (extracted for testability, re-exported)
// ═══════════════════════════════════════════════════════════
// Already in config.ts — re-exported above.
// This keeps the engine as the single import surface.


// ═══════════════════════════════════════════════════════════
// §2 — HEALTH SCORE (extracted for testability, re-exported)
// ═══════════════════════════════════════════════════════════
// Already in config.ts — re-exported above.


// ═══════════════════════════════════════════════════════════
// §3 — ENGAGEMENT CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Engagement context — all derived metrics from raw dashboard data.
 * This is the "brain object" that the Neural Hub returns.
 * Every field is computed, never stored.
 */
export interface EngagementContext {
  // Raw data pass-through
  dashboard: EngagementDashboardResponse | null;
  families: EngagementDashboardFamily[];
  monthlyTrend: EngagementDashboardTrendPoint[];
  riskFactors: EngagementDashboardRiskFactor[];
  trendSummary: EngagementDashboardTrendSummary;

  // Computed: Health
  healthScore: number;
  healthGrade: string;
  healthFactors: HealthScoreFactor[];
  velocity: EngagementVelocity | null;

  // Computed: Core metrics
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

  // Computed: Velocity-derived
  velocityPerWeek: number;
  trajectory: "improving" | "stable" | "declining";
  projection90d: number;

  // Computed: Distribution
  atRiskPct: number;
  dormantPct: number;
  atRiskDormantPct: number;

  // Computed: Family-level aggregates
  hiddenDeclineCount: number;
  recoveringCount: number;
  wellnessGapCount: number;
  wellnessGapPct: number;

  // Computed: Dashboard mode
  dashboardMode: EngagementDashboardMode;
  ambientState: EngagementAmbientState;
}

/**
 * Build the full engagement context from raw dashboard data.
 * This is the single entry point for intelligence computation.
 * All downstream components consume this context.
 *
 * @param dashboard — raw MCP response from get_engagement_dashboard
 * @param satisfactionNps — optional cross-domain NPS signal
 * @param satisfactionTrend — optional cross-domain trend signal
 */
export function buildEngagementContext(
  dashboard: EngagementDashboardResponse | null,
  _satisfactionNps?: number,
  _satisfactionTrend?: "improving" | "stable" | "declining",
): EngagementContext {
  // Null-safe defaults
  if (!dashboard) {
    const mode: EngagementDashboardMode = "calm";
    return {
      dashboard: null,
      families: [],
      monthlyTrend: [],
      riskFactors: [],
      trendSummary: { improving: 0, stable: 0, declining: 0 },
      healthScore: 0,
      healthGrade: "F",
      healthFactors: [],
      velocity: null,
      totalFamilies: 0,
      totalMembers: 0,
      activeRatio30d: 0,
      activeRatio90d: 0,
      avgScore: 0,
      atRiskCount: 0,
      dormantCount: 0,
      improvingCount: 0,
      decliningCount: 0,
      npsScore: 0,
      wellnessPct: 0,
      referralPct: 0,
      velocityPerWeek: 0,
      trajectory: "stable",
      projection90d: 0,
      atRiskPct: 0,
      dormantPct: 0,
      atRiskDormantPct: 0,
      hiddenDeclineCount: 0,
      recoveringCount: 0,
      wellnessGapCount: 0,
      wellnessGapPct: 0,
      dashboardMode: mode,
      ambientState: deriveAmbientState(mode),
    };
  }

  const { summary, families, monthly_trend, risk_factors, trend_summary } = dashboard;
  const tf = summary.total_families || 1;

  // Health + velocity (delegated to config pure functions)
  const health = computeEngagementHealthScore(summary, trend_summary);
  const velocity = computeEngagementVelocity(monthly_trend);

  // Family-level aggregates
  const hiddenDecline = families.filter(
    (f: EngagementDashboardFamily) => f.engagement_score > 50 && f.trend_pct < -3,
  );
  const recovering = families.filter(
    (f: EngagementDashboardFamily) =>
      (f.engagement_level === "at_risk" || f.engagement_level === "dormant") &&
      f.trend === "improving",
  );
  const activeNoWellness = families.filter(
    (f: EngagementDashboardFamily) => f.engagement_score >= 60 && !f.wellness_active,
  );

  // Dashboard mode
  const velocityPerWeek = velocity?.velocity_per_week ?? 0;
  const mode = deriveEngDashboardMode(health.score, velocityPerWeek);

  return {
    dashboard,
    families,
    monthlyTrend: monthly_trend,
    riskFactors: risk_factors,
    trendSummary: trend_summary,
    healthScore: health.score,
    healthGrade: health.grade,
    healthFactors: health.factors,
    velocity,
    totalFamilies: tf,
    totalMembers: summary.total_members,
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
    velocityPerWeek,
    trajectory: velocity?.trajectory ?? "stable",
    projection90d: velocity?.projection_90d ?? Math.round(summary.avg_score),
    atRiskPct: summary.at_risk_count / tf,
    dormantPct: summary.dormant_count / tf,
    atRiskDormantPct: (summary.at_risk_count + summary.dormant_count) / tf,
    hiddenDeclineCount: hiddenDecline.length,
    recoveringCount: recovering.length,
    wellnessGapCount: activeNoWellness.length,
    wellnessGapPct: activeNoWellness.length / tf,
    dashboardMode: mode,
    ambientState: deriveAmbientState(mode),
  };
}


// ═══════════════════════════════════════════════════════════
// §4 — ECOSYSTEM BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the 10-domain engagement ecosystem model.
 * Each domain is an independent "organism" competing for family attention.
 * Computes vitality, symbioses, extinct/emerging domains, and health.
 *
 * Input: raw families data + domain activity signals.
 * Output: EngagementEcosystem with all computed intelligence.
 *
 * @param families — dashboard family data
 * @param domainSignals — per-domain activity data (from MCP or computed)
 * @param historicalSymbioses — previously detected symbioses (for continuity)
 */
export function buildEngagementEcosystem(
  families: EngagementDashboardFamily[],
  domainSignals: Record<ActivityDomain, {
    activeCount: number;
    totalCount: number;
    avgScore: number;
    trend: "improving" | "stable" | "declining";
    lastActivity: string;
  }>,
  historicalSymbioses?: DomainSymbiosis[],
): EngagementEcosystem {
  const tf = families.length || 1;

  // Build domain statuses
  const domains: EngagementDomainStatus[] = ACTIVITY_DOMAINS.map((domain) => {
    const signal = domainSignals[domain];
    if (!signal) {
      return {
        domain,
        vitality: 0,
        trend: "stable" as const,
        lastActivity: "",
        resonance: 0,
        competition: 0,
        membersActive: 0,
        membersTotal: tf,
      };
    }

    const vitality = clamp(
      (signal.activeCount / (signal.totalCount || 1)) * 100 * (signal.avgScore / 50),
      0,
      100,
    );

    // Competition: how much this domain competes with others
    const totalActiveAll = Object.values(domainSignals).reduce(
      (s, sig) => s + sig.activeCount, 0,
    );
    const competition = totalActiveAll > 0
      ? clamp((signal.activeCount / totalActiveAll) * 100, 0, 100)
      : 0;

    // Resonance: vitality × trend modifier
    const trendMod = signal.trend === "improving" ? 1.2 : signal.trend === "declining" ? 0.7 : 1.0;
    const resonance = clamp(vitality * trendMod, 0, 100);

    return {
      domain,
      vitality: Math.round(vitality),
      trend: signal.trend,
      lastActivity: signal.lastActivity,
      resonance: Math.round(resonance),
      competition: Math.round(competition),
      membersActive: signal.activeCount,
      membersTotal: signal.totalCount || tf,
    };
  });

  // Compute symbioses (domains that reinforce each other)
  const symbioses = computeDomainSymbioses(families, domainSignals, historicalSymbioses);

  // Compute ecosystem-level metrics
  const totalResonance = computeTotalResonance([]);
  const diversity = computeEcosystemDiversity(domains);
  const ecosystemHealth = computeEcosystemHealth(domains, symbioses);
  const extinctDomains = detectExtinctDomains(domains);
  const emergingDomains = detectEmergingDomains(domains);
  const dominantDomain = identifyDominantDomain(domains);

  // Mutations (empty at build time — populated by detectDNAMutations)
  const mutations: EngagementDNAMutation[] = [];

  return {
    domains,
    totalResonance,
    dominantDomain,
    extinctDomains,
    emergingDomains,
    symbioses,
    mutations,
    healthScore: ecosystemHealth,
    diversity,
  };
}

/**
 * Compute domain symbioses from family activity patterns.
 * A symbiosis exists when families active in domain A tend to also
 * be active in domain B at a rate higher than chance.
 *
 * @param families — dashboard family data
 * @param domainSignals — per-domain activity data
 * @param historical — previously detected symbioses for continuity
 */
export function computeDomainSymbioses(
  _families: EngagementDashboardFamily[],
  domainSignals: Record<ActivityDomain, { activeCount: number; totalCount: number }>,
  historical?: DomainSymbiosis[],
): DomainSymbiosis[] {
  const domains = ACTIVITY_DOMAINS;
  const result: DomainSymbiosis[] = [];

  // For each pair of domains, check if co-occurrence is above chance
  for (let i = 0; i < domains.length; i++) {
    for (let j = i + 1; j < domains.length; j++) {
      const d1 = domains[i];
      const d2 = domains[j];

      const sig1 = domainSignals[d1];
      const sig2 = domainSignals[d2];
      if (!sig1 || !sig2) continue;

      // Co-activity approximation: if both domains have similar
      // active counts and trends, they likely reinforce each other
      const activityRatio = Math.min(sig1.activeCount, sig2.activeCount) /
        Math.max(sig1.activeCount, sig2.activeCount, 1);

      // Trend alignment: both improving = strong symbiosis
      const trendAligned = (
        (sig1.activeCount > 0 && sig2.activeCount > 0) &&
        (sig1.totalCount > 0 && sig2.totalCount > 0)
      );

      if (activityRatio > 0.5 && trendAligned) {
        const strength = clamp(activityRatio * 0.7 + 0.3, 0, 1);

        // Check historical for continuity boost
        const historicalMatch = historical?.find(
          (h) =>
            (h.domain1 === d1 && h.domain2 === d2) ||
            (h.domain1 === d2 && h.domain2 === d1),
        );

        const adjustedStrength = historicalMatch
          ? clamp((strength + historicalMatch.strength) / 2 + 0.05, 0, 1)
          : strength;

        if (adjustedStrength >= ECOSYSTEM_THRESHOLDS.symbiosis_weak) {
          result.push({
            domain1: d1,
            domain2: d2,
            strength: Math.round(adjustedStrength * 100) / 100,
            direction: "bidirectional",
            examples: [],
          });
        }
      }
    }
  }

  // Sort by strength descending
  return result.sort((a, b) => b.strength - a.strength).slice(0, 15);
}


// ═══════════════════════════════════════════════════════════
// §5 — RESONANCE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Compute resonance pattern for a single event/experience.
 * Measures how long the emotional echo lasts, how many times
 * it's referenced, and whether it became part of identity.
 *
 * @param eventDomain — which domain the event belongs to
 * @param eventTitle — event name
 * @param eventDate — ISO date of event
 * @param feedbackData — post-event feedback signals
 * @param familyId — affected family
 */
export function computeResonance(
  eventDomain: ActivityDomain,
  eventTitle: string,
  eventDate: string,
  feedbackData: {
    daysSinceEvent: number;
    referenceCount: number;
    followUpVisits: number;
    socialShares: number;
    repeatRequests: number;
    sentimentScore: number;
  },
): ResonancePattern {
  const d = feedbackData;

  // Impact duration: how many days the effect is still felt
  const impactDuration = d.daysSinceEvent;

  // Echo count: how many times referenced in follow-up communications
  const echoCount = d.referenceCount;

  // Identity integration: high if they're still talking about it
  // and requesting repeats
  const identityIntegration = clamp(
    (d.repeatRequests * 25) + (d.referenceCount * 10) + (d.followUpVisits * 5),
    0,
    100,
  );

  // Repeat seeking: requesting the same or similar experience
  const repeatSeeking = d.repeatRequests > 0;

  // Expansion behavior: exploring variants of the experience
  const expansionBehavior = d.followUpVisits > 1;

  // Social amplification: told others about it
  const socialAmplification = clamp(d.socialShares * 20, 0, 100);

  return {
    eventDomain,
    eventTitle,
    impactDuration,
    echoCount,
    identityIntegration,
    repeatSeeking,
    expansionBehavior,
    socialAmplification,
    timestamp: eventDate,
  };
}

/**
 * Compute aggregate resonance score for multiple patterns.
 * Returns 0-100 representing overall ecosystem resonance.
 */
export function computeAggregateResonance(
  patterns: ResonancePattern[],
): number {
  return computeTotalResonance(patterns);
}


// ═══════════════════════════════════════════════════════════
// §6 — DNA MUTATION DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Detect engagement DNA mutations by comparing current domain
 * activity patterns against historical baseline.
 *
 * A "mutation" is a significant shift in how a family engages
 * with the club — e.g., stopping tennis but starting yoga.
 *
 * @param families — current family data
 * @param historicalActivity — per-family domain activity history
 * @param currentActivity — per-family domain activity current period
 */
export function detectDNAMutations(
  families: EngagementDashboardFamily[],
  historicalActivity: Record<string, Record<ActivityDomain, number>>,
  currentActivity: Record<string, Record<ActivityDomain, number>>,
): EngagementDNAMutation[] {
  const mutations: EngagementDNAMutation[] = [];
  const threshold = DNA_MUTATION_THRESHOLDS.domain_shift_pct / 100;

  for (const family of families) {
    const hist = historicalActivity[family.family_id];
    const curr = currentActivity[family.family_id];
    if (!hist || !curr) continue;

    // Find domains with significant shifts
    const shiftedDomains: ActivityDomain[] = [];
    let fromDesc = "";
    let toDesc = "";
    let trigger = "";

    for (const domain of ACTIVITY_DOMAINS) {
      const histVal = hist[domain] ?? 0;
      const currVal = curr[domain] ?? 0;
      const histTotal = Object.values(hist).reduce((s, v) => s + v, 0) || 1;
      const currTotal = Object.values(curr).reduce((s, v) => s + v, 0) || 1;

      const histShare = histVal / histTotal;
      const currShare = currVal / currTotal;
      const delta = currShare - histShare;

      if (Math.abs(delta) >= threshold) {
        shiftedDomains.push(domain);
        if (delta < 0) {
          fromDesc += (fromDesc ? ", " : "") + domain;
        } else {
          toDesc += (toDesc ? ", " : "") + domain;
        }
      }
    }

    if (shiftedDomains.length >= 2 && fromDesc && toDesc) {
      // Infer trigger from the domain that declined most
      trigger = `Shift from ${fromDesc} to ${toDesc}`;

      const confidence = clamp(
        shiftedDomains.length * 0.2 + 0.3,
        0,
        1,
      );

      mutations.push({
        familyId: family.family_id,
        familyName: family.family_name,
        from: fromDesc,
        to: toDesc,
        trigger,
        date: new Date().toISOString().split("T")[0],
        confidence: Math.round(confidence * 100) / 100,
        domains: shiftedDomains,
      });
    }
  }

  return mutations;
}


// ═══════════════════════════════════════════════════════════
// §7 — GRAVITATIONAL FORCE CALCULATION
// ═══════════════════════════════════════════════════════════

/**
 * Calculate gravitational retention model for a family.
 * The club creates 4 types of gravitational force:
 *   Club Gravity    — force from overall club experience
 *   Social Gravity  — force from social connections
 *   Experience Gravity — force from accumulated positive experiences
 *   Identity Gravity — force from club being part of identity
 *
 * When total gravity weakens, families drift. When exit velocity
 * exceeds the escape threshold, departure becomes inevitable.
 *
 * @param familyId — target family
 * @param metrics — family-specific retention metrics
 */
export function calculateGravitationalForce(
  _familyId: string,
  metrics: {
    engagementScore: number;
    monthsMember: number;
    socialConnections: number;
    eventAttendance: number;
    feedbackSentiment: number;  // -1 to 1
    referralsMade: number;
    wellnessActive: boolean;
    trendPct: number;
  },
): GravitationalModel {
  const m = metrics;
  const gc = GRAVITATIONAL_CONSTANTS;

  // Club Gravity: based on engagement score and membership tenure
  const tenureBonus = Math.min(m.monthsMember / 36, 1) * 20; // max 20 at 3 years
  const clubGravity = clamp(
    (m.engagementScore * gc.gravity_weights.club) + tenureBonus,
    0,
    100,
  );

  // Social Gravity: connections create gravitational pull
  const socialGravity = clamp(
    (m.socialConnections * 8) + (m.referralsMade * 12),
    0,
    100,
  );

  // Experience Gravity: accumulated positive experiences
  const experienceGravity = clamp(
    (m.eventAttendance * 3) +
    (m.feedbackSentiment + 1) * 25 +
    (m.wellnessActive ? 15 : 0),
    0,
    100,
  );

  // Identity Gravity: how much the club is part of who they are
  // High tenure + high social + high experience = identity integration
  const identityGravity = clamp(
    (clubGravity * gc.gravity_weights.identity) +
    (socialGravity * gc.gravity_weights.identity) +
    (experienceGravity * gc.gravity_weights.identity) +
    (m.referralsMade > 0 ? 15 : 0),
    0,
    100,
  );

  // Total Gravity: weighted sum
  const totalGravity = Math.round(
    clubGravity * gc.gravity_weights.club +
    socialGravity * gc.gravity_weights.social +
    experienceGravity * gc.gravity_weights.experience +
    identityGravity * gc.gravity_weights.identity,
  );

  // Exit Velocity: how fast they're moving away
  // Negative trend = increasing exit velocity
  const decayFactor = m.trendPct < 0 ? Math.abs(m.trendPct) * 2 : 0;
  const exitVelocity = clamp(
    (100 - totalGravity) * 0.5 + decayFactor * 3,
    0,
    100,
  );

  // Escape Threshold: point of no return
  const escapeThreshold = gc.escape_threshold_default;

  // Trend
  let trend: "attracting" | "stable" | "repelling" = "stable";
  if (exitVelocity > 60 && m.trendPct < -3) trend = "repelling";
  else if (totalGravity > 60 && m.trendPct > 0) trend = "attracting";

  return {
    clubGravity: Math.round(clamp(clubGravity, 0, 100)),
    socialGravity: Math.round(clamp(socialGravity, 0, 100)),
    experienceGravity: Math.round(clamp(experienceGravity, 0, 100)),
    identityGravity: Math.round(clamp(identityGravity, 0, 100)),
    exitVelocity: Math.round(exitVelocity),
    escapeThreshold,
    totalGravity: clamp(totalGravity, 0, 100),
    trend,
  };
}

/**
 * Compute aggregate gravitational model for the entire member base.
 * Returns the "club-wide" gravitational field strength.
 */
export function computeAggregateGravitationalField(
  models: GravitationalModel[],
): {
  avgGravity: number;
  avgExitVelocity: number;
  escapeTrajectoryCount: number;
  deepWellCount: number;
  overallTrend: "attracting" | "stable" | "repelling";
} {
  if (models.length === 0) {
    return {
      avgGravity: 0,
      avgExitVelocity: 0,
      escapeTrajectoryCount: 0,
      deepWellCount: 0,
      overallTrend: "stable",
    };
  }

  const avgGravity = Math.round(
    models.reduce((s, m) => s + m.totalGravity, 0) / models.length,
  );
  const avgExitVelocity = Math.round(
    models.reduce((s, m) => s + m.exitVelocity, 0) / models.length,
  );

  const escapeTrajectoryCount = models.filter(
    (m) => m.exitVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_critical,
  ).length;

  const deepWellCount = models.filter(
    (m) => m.totalGravity >= 70 && m.exitVelocity < 30,
  ).length;

  const repellingCount = models.filter((m) => m.trend === "repelling").length;
  const attractingCount = models.filter((m) => m.trend === "attracting").length;

  let overallTrend: "attracting" | "stable" | "repelling" = "stable";
  if (repellingCount > attractingCount * 1.5) overallTrend = "repelling";
  else if (attractingCount > repellingCount * 1.5) overallTrend = "attracting";

  return {
    avgGravity,
    avgExitVelocity,
    escapeTrajectoryCount,
    deepWellCount,
    overallTrend,
  };
}


// ═══════════════════════════════════════════════════════════
// §8 — MOMENTS OF TRUTH
// ═══════════════════════════════════════════════════════════

/**
 * Identify moments of truth from family activity data.
 * Moments of truth are critical instances where a family
 * decided if the club is part of their identity or just a service.
 *
 * @param familyId — target family
 * @param familyName — display name
 * @param activityHistory — chronological activity events
 */
export function identifyMomentsOfTruth(
  familyId: string,
  familyName: string,
  activityHistory: Array<{
    date: string;
    type: string;
    domain: ActivityDomain;
    description: string;
    sentiment: number;  // -1 to 1
    impact: number;     // -100 to 100
  }>,
): MomentOfTruth[] {
  const moments: MomentOfTruth[] = [];

  for (const event of activityHistory) {
    // Only significant events become moments of truth
    if (Math.abs(event.impact) < 25) continue;

    // Classify the moment type
    let type: MomentOfTruthType;
    if (event.type === "first_visit" || event.type === "onboarding") {
      type = "first_impression";
    } else if (event.type === "social_event" || event.type === "referral") {
      type = "social_bonding";
    } else if (event.type === "anniversary" || event.type === "milestone") {
      type = "milestone";
    } else if (event.type === "complaint_resolved" || event.type === "service_recovery") {
      type = "recovery";
    } else if (event.type === "complaint" || event.type === "negative_feedback") {
      type = "crisis";
    } else if (event.type === "celebration" || event.type === "award") {
      type = "celebration";
    } else if (event.impact > 50 && event.sentiment > 0.5) {
      type = "identity_integration";
    } else {
      // Not a moment of truth
      continue;
    }

    const outcome = event.impact > 20
      ? "positive" as const
      : event.impact < -20
        ? "negative" as const
        : "neutral" as const;

    moments.push({
      id: `mot_${familyId}_${event.date}`,
      date: event.date,
      type,
      description: event.description,
      outcome,
      impactOnRetention: event.impact,
      domain: event.domain,
      familyId,
      familyName,
      predicted: false,
    });
  }

  return moments.sort(
    (a, b) => Math.abs(b.impactOnRetention) - Math.abs(a.impactOnRetention),
  );
}

/**
 * Predict upcoming moments of truth based on patterns.
 * Returns predicted moments that haven't happened yet.
 */
export function predictUpcomingMoments(
  familyId: string,
  familyName: string,
  lifecycleStage: string,
  lastAnniversary: string,
  _currentMonth: number,
): MomentOfTruth[] {
  const predicted: MomentOfTruth[] = [];

  // Anniversary prediction
  if (lastAnniversary) {
    const lastDate = new Date(lastAnniversary);
    const nextAnniversary = new Date(lastDate);
    nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);

    if (nextAnniversary.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000) {
      predicted.push({
        id: `pred_mot_anniversary_${familyId}`,
        date: nextAnniversary.toISOString().split("T")[0],
        type: "milestone",
        description: `Aniversario de membresía próximo — oportunidad de reconocimiento`,
        outcome: "neutral",
        impactOnRetention: 0,
        domain: "events",
        familyId,
        familyName,
        predicted: true,
      });
    }
  }

  // Lifecycle transition prediction
  if (lifecycleStage === "plateau") {
    predicted.push({
      id: `pred_mot_lifecycle_${familyId}`,
      date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      type: "identity_integration",
      description: `Familia en meseta — momento decisivo de integración o declive`,
      outcome: "neutral",
      impactOnRetention: 0,
      domain: "social",
      familyId,
      familyName,
      predicted: true,
    });
  }

  return predicted;
}


// ═══════════════════════════════════════════════════════════
// §9 — SATISFACTION DRIVER DECOMPOSITION
// ═══════════════════════════════════════════════════════════

/**
 * Decompose NPS into 5 satisfaction dimensions with drivers, gaps,
 * and improvement ROI.
 *
 * The 5 dimensions:
 *   Facility — physical spaces, maintenance, ambiance
 *   Service  — staff quality, responsiveness, personalization
 *   Social   — community, events, connections
 *   Value    — price/quality ratio, perceived worth
 *   Experience — overall feeling, memories, identity
 *
 * @param categoryScores — per-category satisfaction scores (0-5 scale)
 * @param categoryTrends — per-category trend direction
 * @param _npsScore — current NPS
 * @param benchmarkScores — industry/club benchmark per category
 */
export function decomposeDrivers(
  categoryScores: Record<string, number>,
  categoryTrends: Record<string, TrendDirection>,
  _npsScore: number,
  benchmarkScores?: Record<string, number>,
): SatisfactionDimension[] {
  // Map fine-grained categories to 5 broad dimensions
  const dimensionMap: Record<SatisfactionDimensionName, string[]> = {
    facility: ["venue", "cleanliness", "ambiance"],
    service: ["service", "timing"],
    social: ["entertainment", "organization"],
    value: ["value", "food"],
    experience: ["overall"],
  };

  const dimensions: SatisfactionDimension[] = [];

  for (const [dimName, categories] of Object.entries(dimensionMap) as Array<[SatisfactionDimensionName, string[]]>) {
    // Average score across mapped categories (convert 0-5 to 0-100)
    const scores = categories
      .map((cat) => categoryScores[cat])
      .filter((s): s is number => s !== undefined);

    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 20)
      : 50;

    // Trend: take the worst trend among mapped categories
    const trends = categories
      .map((cat) => categoryTrends[cat])
      .filter(Boolean);
    const hasDeclining = trends.some((t) => t === "declining");
    const hasImproving = trends.some((t) => t === "improving");
    const trend: TrendDirection = hasDeclining
      ? "declining"
      : hasImproving
        ? "improving"
        : "stable";

    // Benchmark comparison
    const benchmark = benchmarkScores
      ? Math.round(
          (categories
            .map((cat) => benchmarkScores[cat])
            .filter((s): s is number => s !== undefined)
            .reduce((s, v) => s + v, 0) / categories.length) * 20,
        )
      : 70;

    // Drivers: individual category impacts
    const drivers: SatisfactionDriver[] = categories.map((cat) => ({
      name: cat,
      impact: categoryScores[cat] !== undefined
        ? Math.round((categoryScores[cat] / 5) * 100)
        : 50,
      currentScore: Math.round((categoryScores[cat] ?? 2.5) * 20),
      benchmark: benchmarkScores?.[cat]
        ? Math.round(benchmarkScores[cat] * 20)
        : 70,
      trend: categoryTrends[cat] ?? "stable",
    }));

    // Gap: expectation (benchmark) vs reality (score)
    const gap = benchmark - avgScore;

    // Improvement ROI: higher gap + declining trend = higher ROI
    const trendMultiplier = trend === "declining" ? 2 : trend === "stable" ? 1 : 0.5;
    const improvementROI = Math.round(Math.max(gap, 0) * trendMultiplier);

    dimensions.push({
      dimension: dimName,
      score: avgScore,
      trend,
      drivers,
      gaps: [{
        dimension: dimName,
        expectation: benchmark,
        reality: avgScore,
        gap,
        priority: gap > 20 ? 5 : gap > 10 ? 3 : 1,
      }],
      improvementROI,
    });
  }

  return dimensions;
}


// ═══════════════════════════════════════════════════════════
// §10 — PREDICTIVE NPS
// ═══════════════════════════════════════════════════════════

/**
 * Predict NPS 3 months forward, with and without intervention.
 * Uses velocity, trend direction, and satisfaction dimensions
 * to project the NPS trajectory.
 *
 * @param currentNPS — current NPS score
 * @param npsTrend — historical NPS trend points
 * @param dimensions — decomposed satisfaction dimensions
 * @param engagementVelocity — engagement velocity for cross-domain signal
 */
export function predictNPS(
  currentNPS: number,
  npsTrend: Array<{ period: string; nps: number }>,
  dimensions: SatisfactionDimension[],
  engagementVelocity?: EngagementVelocity | null,
): PredictiveNPS {
  // Compute NPS velocity from trend
  let npsVelocityPerMonth = 0;
  if (npsTrend.length >= 2) {
    const last = npsTrend[npsTrend.length - 1];
    const prev = npsTrend[npsTrend.length - 2];
    npsVelocityPerMonth = last.nps - prev.nps;
  }

  // Engagement velocity modifier: if engagement is declining,
  // NPS will likely follow (lagging indicator)
  let engagementModifier = 0;
  if (engagementVelocity) {
    if (engagementVelocity.trajectory === "declining") {
      engagementModifier = -3;
    } else if (engagementVelocity.trajectory === "improving") {
      engagementModifier = 2;
    }
  }

  // Predict 3 months forward
  const predicted3m = clamp(
    Math.round(currentNPS + (npsVelocityPerMonth * 3) + engagementModifier),
    -100,
    100,
  );

  // With intervention: improve by targeting worst dimensions
  const decliningDims = dimensions.filter((d) => d.trend === "declining");
  const interventionBoost = decliningDims.length > 0
    ? Math.round(decliningDims.reduce((s, d) => s + (100 - d.score) * 0.05, 0))
    : 3;

  const predictedWithIntervention = clamp(
    Math.round(predicted3m + interventionBoost),
    -100,
    100,
  );

  // NPS Drivers
  const drivers: NPSDriver[] = dimensions.map((d) => ({
    dimension: d.dimension,
    impact: d.score > 70 ? 1 : d.score > 50 ? 0 : -1,
    trend: d.trend,
    priority: d.improvementROI > 30 ? 5 : d.improvementROI > 15 ? 3 : 1,
  }));

  // Intervention window: based on how fast NPS is declining
  const interventionWindow = npsVelocityPerMonth < -3
    ? 30
    : npsVelocityPerMonth < -1
      ? 60
      : 90;

  // Confidence: based on data availability
  const confidence = clamp(
    50 +
    (npsTrend.length >= 6 ? 20 : npsTrend.length * 3) +
    (dimensions.length >= 5 ? 15 : dimensions.length * 3) +
    (engagementVelocity ? 15 : 0),
    30,
    95,
  );

  return {
    current: currentNPS,
    predicted3m,
    predictedWithIntervention,
    drivers,
    confidence,
    interventionWindow,
  };
}


// ═══════════════════════════════════════════════════════════
// §11 — STREAM SIGNAL BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build priority-sorted stream signals from all intelligence sources.
 * This is the "heartbeat" of the Intelligence Stream — the signals
 * that surface in priority order replace the old tab system.
 *
 * @param ctx — engagement context (from buildEngagementContext)
 * @param ecosystem — ecosystem model (from buildEngagementEcosystem)
 * @param gravitational — gravitational model (from calculateGravitationalForce)
 * @param resonance — resonance patterns (from computeResonance)
 * @param mutations — DNA mutations (from detectDNAMutations)
 * @param moments — moments of truth (from identifyMomentsOfTruth)
 * @param predictiveNps — NPS prediction (from predictNPS)
 * @param patterns — emergent patterns (from detectEmergentPatterns)
 */
export function buildStreamSignals(
  ctx: EngagementContext,
  ecosystem?: EngagementEcosystem | null,
  gravitational?: GravitationalModel | null,
  _resonance?: ResonancePattern[],
  mutations?: EngagementDNAMutation[],
  moments?: MomentOfTruth[],
  predictiveNps?: PredictiveNPS | null,
  patterns?: EmergentPattern[],
): EngagementStreamSignal[] {
  const signals: EngagementStreamSignal[] = [];
  const now = new Date().toISOString();

  // Health critical
  if (ctx.healthScore < 35) {
    signals.push({
      id: "sig_health_critical",
      priority: computeSignalPriority("health_critical", 92),
      category: "risk",
      title: `Health Score crítico: ${ctx.healthScore}/100`,
      description: `${ctx.atRiskCount} familias en riesgo, ${ctx.dormantCount} dormidas. Actividad 30d: ${(ctx.activeRatio30d * 100).toFixed(0)}%.`,
      source: "computeEngagementHealthScore",
      confidence: 92,
      actionable: true,
      timestamp: now,
    });
  }

  // Escape velocity
  if (gravitational && gravitational.exitVelocity >= GRAVITATIONAL_CONSTANTS.escape_velocity_critical) {
    signals.push({
      id: "sig_escape_velocity",
      priority: computeSignalPriority("escape_velocity_critical", 88),
      category: "risk",
      title: `Escape velocity: ${gravitational.exitVelocity}/100`,
      description: `Gravedad total: ${gravitational.totalGravity}/100. Fuerzas: club ${gravitational.clubGravity}, social ${gravitational.socialGravity}, experiencia ${gravitational.experienceGravity}.`,
      source: "calculateGravitationalForce",
      confidence: 88,
      actionable: true,
      timestamp: now,
    });
  }

  // Ecosystem health
  if (ecosystem && ecosystem.healthScore < 35) {
    signals.push({
      id: "sig_ecosystem_collapse",
      priority: computeSignalPriority("ecosystem_imbalance", 80),
      category: "risk",
      title: `Ecosistema debilitado: ${ecosystem.healthScore}/100`,
      description: `Diversidad: ${ecosystem.diversity}/100. Dominio: ${ecosystem.dominantDomain}. Extintos: ${ecosystem.extinctDomains.length}.`,
      source: "buildEngagementEcosystem",
      confidence: 80,
      actionable: true,
      timestamp: now,
    });
  }

  // DNA mutations
  if (mutations && mutations.length > 0) {
    const major = mutations.filter(
      (m) => classifyMutationSeverity(m) === "major" || classifyMutationSeverity(m) === "fundamental",
    );
    if (major.length > 0) {
      signals.push({
        id: "sig_dna_mutation",
        priority: computeSignalPriority("dna_mutation", 75),
        category: "anomaly",
        title: `${major.length} mutación(es) de engagement detectada(s)`,
        description: `${major[0].familyName}: ${major[0].from} → ${major[0].to}. Confianza: ${(major[0].confidence * 100).toFixed(0)}%.`,
        source: "detectDNAMutations",
        familyId: major[0].familyId,
        familyName: major[0].familyName,
        confidence: Math.round(major[0].confidence * 100),
        actionable: true,
        timestamp: now,
      });
    }
  }

  // Hidden decline
  if (ctx.hiddenDeclineCount > 3) {
    signals.push({
      id: "sig_hidden_decline",
      priority: computeSignalPriority("hidden_decline", 75),
      category: "risk",
      title: `${ctx.hiddenDeclineCount} familias con score decente pero en declive`,
      description: `Score >50 pero trend <-3%. Caerán a "at risk" en 4-8 semanas sin intervención.`,
      source: "buildEngagementContext",
      confidence: 75,
      actionable: true,
      timestamp: now,
    });
  }

  // Moments of truth
  if (moments && moments.length > 0) {
    const critical = moments.filter(
      (m) => classifyMomentImpact(m.impactOnRetention).level === "critical",
    );
    if (critical.length > 0) {
      signals.push({
        id: "sig_moment_of_truth",
        priority: computeSignalPriority("moment_of_truth", 70),
        category: "insight",
        title: `${critical.length} momento(s) de verdad crítico(s)`,
        description: `${critical[0].familyName}: ${critical[0].description} (impacto: ${critical[0].impactOnRetention}).`,
        source: "identifyMomentsOfTruth",
        familyId: critical[0].familyId,
        familyName: critical[0].familyName,
        confidence: 70,
        actionable: true,
        timestamp: now,
      });
    }
  }

  // NPS trajectory
  if (predictiveNps && predictiveNps.predicted3m < predictiveNps.current - 5) {
    signals.push({
      id: "sig_nps_trajectory",
      priority: computeSignalPriority("nps_trajectory_warning", 65),
      category: "prediction",
      title: `NPS en descenso: ${predictiveNps.current} → ${predictiveNps.predicted3m} (3m)`,
      description: `Con intervención: ${predictiveNps.predictedWithIntervention}. Ventana: ${predictiveNps.interventionWindow} días.`,
      source: "predictNPS",
      confidence: predictiveNps.confidence,
      actionable: true,
      timestamp: now,
    });
  }

  // Wellness gap
  if (ctx.wellnessGapPct > 0.30) {
    signals.push({
      id: "sig_wellness_gap",
      priority: computeSignalPriority("wellness_gap", 70),
      category: "opportunity",
      title: `${ctx.wellnessGapCount} familias activas sin wellness`,
      description: `${(ctx.wellnessGapPct * 100).toFixed(0)}% de la base activa no usa wellness. Cross-sell opportunity.`,
      source: "buildEngagementContext",
      confidence: 72,
      actionable: true,
      timestamp: now,
    });
  }

  // Positive momentum
  if (ctx.trajectory === "improving" && ctx.velocityPerWeek > 0.5) {
    signals.push({
      id: "sig_positive_momentum",
      priority: computeSignalPriority("positive_momentum", 50),
      category: "positive",
      title: `Momentum positivo: +${ctx.velocityPerWeek.toFixed(1)} pts/semana`,
      description: `Score: ${ctx.velocity?.current_score}. Proyección 90d: ${ctx.projection90d}. ${ctx.improvingCount} familias mejorando.`,
      source: "computeEngagementVelocity",
      confidence: 80,
      actionable: false,
      timestamp: now,
    });
  }

  // Emergent patterns
  if (patterns && patterns.length > 0) {
    const significant = patterns.filter(
      (p) => classifyPatternSignificance(p) === "significant" || classifyPatternSignificance(p) === "breakthrough",
    );
    for (const pattern of significant.slice(0, 2)) {
      signals.push({
        id: `sig_pattern_${pattern.id}`,
        priority: computeSignalPriority("emergent_pattern", pattern.confidence),
        category: "anomaly",
        title: pattern.title,
        description: pattern.description,
        source: "detectEmergentPatterns",
        confidence: pattern.confidence,
        actionable: pattern.actionable,
        timestamp: pattern.discoveredAt,
      });
    }
  }

  // Sort by priority descending
  return signals.sort((a, b) => b.priority - a.priority);
}


// ═══════════════════════════════════════════════════════════
// §12 — DECISION STAGE BUILDER
// ═══════════════════════════════════════════════════════════

/**
 * Build the contextual Decision Stage — the "what to do RIGHT NOW" panel.
 * Adapts to the dominant threat in the system.
 *
 * @param ctx — engagement context
 * @param gravitational — gravitational model (optional)
 * @param predictiveNps — NPS prediction (optional)
 */
export function buildDecisionStage(
  ctx: EngagementContext,
  gravitational?: GravitationalModel | null,
  _predictiveNps?: PredictiveNPS | null,
): DecisionScenario {
  // Determine scenario type
  const scenarioType = deriveDecisionScenario(
    ctx.healthScore,
    ctx.velocityPerWeek,
    gravitational?.exitVelocity ?? 0,
    ctx.atRiskCount,
    ctx.totalFamilies,
  );

  // Build scenario-specific content
  switch (scenarioType) {
    case "churn_prevention":
      return {
        type: "churn_prevention",
        urgency: "critical",
        title: "Prevención de Churn — Intervención Inmediata",
        description:
          `${ctx.atRiskCount} familias en riesgo. ` +
          `Exit velocity: ${gravitational?.exitVelocity ?? "N/A"}/100. ` +
          `Proyección 90d: ${ctx.projection90d}/100. ` +
          `Ventana de intervención: ${gravitational ? computeDaysToEscape(gravitational.exitVelocity, gravitational.escapeThreshold, gravitational.totalGravity) ?? "N/A" : "N/A"} días.`,
        suggestedActions: [
          {
            type: "mutate",
            server: "member_engagement",
            tool: "design_reactivation_campaign",
            params: { target_level: "at_risk", action: "create" },
            approval_level: "hitl",
            label: "Crear campaña de reactivación",
            confirm_message: `Se creará una campaña para ${ctx.atRiskCount} familias en riesgo.`,
            estimated_impact: `Recuperar ~${Math.round(ctx.atRiskCount * 0.3)} familias`,
          },
          {
            type: "mutate",
            server: "member_engagement",
            tool: "get_engagement_insights",
            params: { filter: "at_risk" },
            approval_level: "auto",
            label: "Identificar familias críticas",
          },
        ],
        estimatedImpact: `${ctx.atRiskCount} familias · ${(ctx.atRiskPct * 100).toFixed(0)}% de la base`,
        confidence: 85,
      };

    case "financial_exposure":
      return {
        type: "financial_exposure",
        urgency: "high",
        title: "Exposición Financiera — Riesgo de Revenue",
        description:
          `${(ctx.atRiskPct * 100).toFixed(0)}% de la base en riesgo. ` +
          `Cada familia perdida = ingresos recurrentes (cuotas, consumos, eventos). ` +
          `Churn tiene efecto cascada en el círculo social.`,
        suggestedActions: [
          {
            type: "mutate",
            server: "member_engagement",
            tool: "get_engagement_insights",
            params: { analysis: "financial_impact" },
            approval_level: "auto",
            label: "Ver impacto financiero detallado",
          },
        ],
        estimatedImpact: `${ctx.atRiskCount} familias en riesgo financiero`,
        confidence: 75,
      };

    case "engagement_boost":
      return {
        type: "engagement_boost",
        urgency: ctx.velocityPerWeek < -1 ? "high" : "medium",
        title: "Impulso de Engagement — Revertir la Tendencia",
        description:
          `Engagement cayendo a ${Math.abs(ctx.velocityPerWeek).toFixed(1)} pts/semana. ` +
          `Proyección 90d: ${ctx.projection90d}/100. ` +
          `${ctx.decliningCount} familias bajando vs ${ctx.improvingCount} mejorando.`,
        suggestedActions: [
          {
            type: "mutate",
            server: "member_engagement",
            tool: "generate_satisfaction_engagement_proposals",
            params: {},
            approval_level: "auto",
            label: "Ver propuestas de engagement",
          },
        ],
        estimatedImpact: `Revertir tendencia para ${ctx.decliningCount} familias`,
        confidence: 70,
      };

    case "lifecycle_transition":
    default:
      return {
        type: "lifecycle_transition",
        urgency: "medium",
        title: "Transición de Ciclo — Monitorear Evolución",
        description:
          `Health score: ${ctx.healthScore}/100 (${ctx.healthGrade}). ` +
          `Velocidad: ${ctx.velocityPerWeek.toFixed(1)} pts/semana. ` +
          `${ctx.recoveringCount} familias recuperándose. ` +
          `${ctx.wellnessGapCount} sin wellness.`,
        suggestedActions: [
          {
            type: "mutate",
            server: "member_engagement",
            tool: "get_engagement_dashboard",
            params: {},
            approval_level: "auto",
            label: "Ver dashboard completo",
          },
        ],
        estimatedImpact: "Monitoreo continuo",
        confidence: 65,
      };
  }
}


// ═══════════════════════════════════════════════════════════
// §13 — EMERGENT PATTERN DISCOVERY (Dimension 7)
// ═══════════════════════════════════════════════════════════

/**
 * Discover emergent patterns that nobody asked for.
 * Cross-domain correlations, anomalies, cascading effects.
 * The system finds patterns the user didn't know to look for.
 *
 * @param families — family data
 * @param domainSignals — per-domain activity
 * @param historicalTrend — monthly trend data
 * @param resonance — resonance patterns
 * @param mutations — DNA mutations
 */
export function detectEmergentPatterns(
  families: EngagementDashboardFamily[],
  domainSignals: Record<ActivityDomain, { activeCount: number; totalCount: number; avgScore: number; trend: string }>,
  historicalTrend: EngagementDashboardTrendPoint[],
  resonance?: ResonancePattern[],
  mutations?: EngagementDNAMutation[],
): EmergentPattern[] {
  const patterns: EmergentPattern[] = [];
  const now = new Date().toISOString();

  // Pattern 1: Domain correlation — if two domains move together
  const domains = ACTIVITY_DOMAINS;
  for (let i = 0; i < domains.length; i++) {
    for (let j = i + 1; j < domains.length; j++) {
      const d1 = domainSignals[domains[i]];
      const d2 = domainSignals[domains[j]];
      if (!d1 || !d2) continue;

      // Both improving or both declining = correlation
      if (d1.trend === d2.trend && d1.trend !== "stable") {
        const strength = Math.min(d1.avgScore, d2.avgScore) / Math.max(d1.avgScore, d2.avgScore, 1);
        if (strength > 0.7) {
          patterns.push({
            id: `emergent_corr_${domains[i]}_${domains[j]}`,
            type: "correlation",
            title: `Correlación: ${domains[i]} y ${domains[j]} ${d1.trend === "improving" ? "suben" : "bajan"} juntos`,
            description: `Ambos dominios ${d1.trend === "improving" ? "mejorando" : "declinando"} con fuerza ${(strength * 100).toFixed(0)}%. ${d1.trend === "declining" ? "Investigar causa común." : "Potenciar sinergia."}`,
            domains: [domains[i], domains[j]],
            affectedFamilies: Math.min(d1.activeCount, d2.activeCount),
            confidence: Math.round(strength * 85),
            novelty: 60,
            actionable: d1.trend === "declining",
            discoveredAt: now,
            evidence: [
              `${domains[i]}: ${d1.activeCount} activos, score ${d1.avgScore.toFixed(0)}`,
              `${domains[j]}: ${d2.activeCount} activos, score ${d2.avgScore.toFixed(0)}`,
            ],
          });
        }
      }
    }
  }

  // Pattern 2: Cascade — mutations spreading through social connections
  if (mutations && mutations.length >= 3) {
    // Check if mutations share common domains
    const domainCounts: Partial<Record<ActivityDomain, number>> = {};
    for (const m of mutations) {
      for (const d of m.domains) {
        domainCounts[d] = (domainCounts[d] ?? 0) + 1;
      }
    }

    const cascadingDomain = (Object.entries(domainCounts) as Array<[ActivityDomain, number]>)
      .find(([, count]) => count >= 3);

    if (cascadingDomain) {
      patterns.push({
        id: `emergent_cascade_${cascadingDomain[0]}`,
        type: "cascade",
        title: `Efecto cascada en dominio ${cascadingDomain[0]}`,
        description: `${cascadingDomain[1]} familias mutando en el mismo dominio. Posible contagio social o cambio sistémico.`,
        domains: [cascadingDomain[0]],
        affectedFamilies: cascadingDomain[1],
        confidence: 70,
        novelty: 80,
        actionable: true,
        discoveredAt: now,
        evidence: mutations
          .filter((m) => m.domains.includes(cascadingDomain[0]))
          .slice(0, 3)
          .map((m) => `${m.familyName}: ${m.from} → ${m.to}`),
      });
    }
  }

  // Pattern 3: Resonance cluster — multiple high-resonance events in same domain
  if (resonance && resonance.length >= 2) {
    const byDomain: Partial<Record<ActivityDomain, ResonancePattern[]>> = {};
    for (const r of resonance) {
      if (!byDomain[r.eventDomain]) byDomain[r.eventDomain] = [];
      byDomain[r.eventDomain]!.push(r);
    }

    for (const [domain, patterns_list] of Object.entries(byDomain) as Array<[ActivityDomain, ResonancePattern[]]>) {
      if (patterns_list.length >= 2) {
        const avgIdentity = patterns_list.reduce((s, p) => s + p.identityIntegration, 0) / patterns_list.length;
        if (avgIdentity > 50) {
          patterns.push({
            id: `emergent_resonance_${domain}`,
            type: "cluster",
            title: `Cluster de resonancia en ${domain}`,
            description: `${patterns_list.length} eventos con alta resonancia en ${domain}. Integración identitaria promedio: ${avgIdentity.toFixed(0)}%. Este dominio se está convirtiendo en parte de la identidad de las familias.`,
            domains: [domain],
            affectedFamilies: patterns_list.length,
            confidence: Math.round(avgIdentity),
            novelty: 75,
            actionable: true,
            discoveredAt: now,
            evidence: patterns_list.map((p) => `${p.eventTitle}: duración ${p.impactDuration}d, ecos ${p.echoCount}`),
          });
        }
      }
    }
  }

  // Pattern 4: Historical anomaly — trend deviates from 6-month average
  if (historicalTrend.length >= 6) {
    const last6 = historicalTrend.slice(-6);
    const avgScore = last6.reduce((s, t) => s + t.avg_score, 0) / last6.length;
    const latest = last6[last6.length - 1];
    const deviation = latest.avg_score - avgScore;

    if (Math.abs(deviation) > 5) {
      patterns.push({
        id: "emergent_trend_anomaly",
        type: "anomaly",
        title: deviation > 0
          ? `Anomalía positiva: score ${deviation.toFixed(1)} pts sobre promedio`
          : `Anomalía negativa: score ${Math.abs(deviation).toFixed(1)} pts bajo promedio`,
        description: `Promedio 6m: ${avgScore.toFixed(1)}. Último mes: ${latest.avg_score.toFixed(1)}. Desviación: ${deviation > 0 ? "+" : ""}${deviation.toFixed(1)} pts.`,
        domains: [],
        affectedFamilies: families.length,
        confidence: 75,
        novelty: 50,
        actionable: deviation < 0,
        discoveredAt: now,
        evidence: [`6-month average: ${avgScore.toFixed(1)}`, `Latest: ${latest.avg_score.toFixed(1)}`],
      });
    }
  }

  // Sort by discovery priority
  return patterns.sort(
    (a, b) => computeDiscoveryPriority(b) - computeDiscoveryPriority(a),
  );
}


// ═══════════════════════════════════════════════════════════
// §14 — ANOMALY FAMILY DETECTION (Dimension 7)
// ═══════════════════════════════════════════════════════════

/**
 * Detect families that deviate from expected patterns.
 * These are the "black swans" — families that don't behave
 * like their peers.
 *
 * @param families — all family data
 * @param avgScore — population average engagement score
 * @param avgTrend — population average trend percentage
 * @param stdDev — standard deviation of engagement scores
 */
export function detectAnomalyFamilies(
  families: EngagementDashboardFamily[],
  avgScore: number,
  avgTrend: number,
  stdDev: number,
): AnomalyFamily[] {
  if (stdDev === 0 || families.length === 0) return [];

  const anomalies: AnomalyFamily[] = [];

  for (const family of families) {
    const scoreDeviation = (family.engagement_score - avgScore) / stdDev;
    const trendDeviation = avgTrend !== 0
      ? (family.trend_pct - avgTrend) / Math.abs(avgTrend)
      : 0;

    // Positive surprise: much higher score than expected
    if (scoreDeviation > 2 && family.trend === "improving") {
      anomalies.push({
        familyId: family.family_id,
        familyName: family.family_name,
        anomalyType: "positive_surprise",
        deviation: Math.round(scoreDeviation * 10) / 10,
        description: `Score ${family.engagement_score.toFixed(0)} — ${(scoreDeviation * 100).toFixed(0)}% sobre el promedio. ¿Qué están haciendo bien?`,
        relatedFamilies: [],
        confidence: Math.round(Math.min(scoreDeviation * 30, 95)),
      });
    }

    // Negative surprise: much lower score than expected
    if (scoreDeviation < -2 && family.trend === "declining") {
      anomalies.push({
        familyId: family.family_id,
        familyName: family.family_name,
        anomalyType: "negative_surprise",
        deviation: Math.round(Math.abs(scoreDeviation) * 10) / 10,
        description: `Score ${family.engagement_score.toFixed(0)} — ${(Math.abs(scoreDeviation) * 100).toFixed(0)}% bajo el promedio. Intervención urgente.`,
        relatedFamilies: [],
        confidence: Math.round(Math.min(Math.abs(scoreDeviation) * 30, 95)),
      });
    }

    // Isolation: score near average but trend very different from peers
    if (Math.abs(scoreDeviation) < 0.5 && Math.abs(trendDeviation) > 2) {
      const type = trendDeviation > 0 ? "positive_surprise" : "isolation";
      anomalies.push({
        familyId: family.family_id,
        familyName: family.family_name,
        anomalyType: type as AnomalyFamily["anomalyType"],
        deviation: Math.round(Math.abs(trendDeviation) * 10) / 10,
        description: `Score normal pero trend ${family.trend_pct > 0 ? "+" : ""}${family.trend_pct.toFixed(1)}% — ${trendDeviation > 0 ? "separándose positivamente" : "aislándose del grupo"}.`,
        relatedFamilies: [],
        confidence: Math.round(Math.min(Math.abs(trendDeviation) * 25, 85)),
      });
    }
  }

  // Sort by deviation descending
  return anomalies
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 10);
}


// ═══════════════════════════════════════════════════════════
// §15 — CALIBRATION FEEDBACK (Dimension 6)
// ═══════════════════════════════════════════════════════════

/**
 * Generate calibration feedback by comparing predictions vs outcomes.
 * Tracks which advisor rules are well-calibrated and which need adjustment.
 *
 * @param predictions — array of past predictions with rule IDs
 * @param outcomes — actual observed outcomes
 */
export function generateCalibrationFeedback(
  predictions: Array<{
    ruleId: string;
    metric: string;
    predicted: number;
    timestamp: string;
  }>,
  outcomes: Array<{
    metric: string;
    actual: number;
    timestamp: string;
  }>,
): CalibrationDelta[] {
  const deltas: CalibrationDelta[] = [];

  for (const pred of predictions) {
    // Find matching outcome by metric and approximate timestamp
    const outcome = outcomes.find(
      (o) =>
        o.metric === pred.metric &&
        Math.abs(new Date(o.timestamp).getTime() - new Date(pred.timestamp).getTime()) <
          90 * 24 * 60 * 60 * 1000, // within 90 days
    );

    if (!outcome) continue;

    deltas.push(
      computeCalibrationDelta(pred.ruleId, pred.metric, pred.predicted, outcome.actual),
    );
  }

  return deltas;
}