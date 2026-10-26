// ═══════════════════════════════════════════════════════════════════════
// Member360 Intelligence — Signal Engine
// Phase 30 — Block 0.3: The Pulse
// ═══════════════════════════════════════════════════════════════════════
//
// Pure functions for deriving intelligence from member data.
// This is the BRAIN of Member360 — it takes raw data and produces:
//   - Temperature (the single number the director sees)
//   - Vital Signs (6 dimensions of member health)
//   - Domain Signals (cross-domain intelligence)
//   - Momentum (physics of engagement change)
//   - Narrative (AI briefing in 3 acts)
//   - DNA (behavioral engagement channels)
//
// Config values live in ../config.ts — this file only contains logic.
//
// @rule Pure functions only — no side effects, no hooks, no state
// @rule Config-imported — no hardcoded values
// @rule Every function has JSDoc
// ═══════════════════════════════════════════════════════════════════════

import type {
  ActivityDomain,
  VitalSignName,
  DashboardMode,
  MemberMomentum,
  MemberTemperature,
  VitalSign,
  DomainSignal,
  SignalResonance,
  EngagementDNAChannel,
  MemberNarrative,
  NarrativeSection,
  PredictiveWindow,
  WindowStatus,
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  MemberChurnPredictionResponse,
  MemberLTVAnalysisResponse,
  MemberActivitySummaryResponse,
  MemberSocialProfileResponse
} from "../types";

import {
  temperatureToState,
  temperatureToZone,
  deriveWindowStatus,
  computeSignalResonance,
  isActivityDomain,
} from "../types";

import {
  TEMPERATURE_BASE_WEIGHTS,
  TEMPERATURE_STAGE_WEIGHTS,
  THERMAL_MASS_TIER_MULTIPLIER,
  THERMAL_MASS_CURVE,
  VITAL_SIGN_THRESHOLDS,
  TIER_THRESHOLD_ADJUSTMENT,
  ENGAGEMENT_DECAY_RATES,
  DOMAIN_INFLUENCE_MATRIX,
  PREDICTIVE_WINDOW_CONFIGS,
  NARRATIVE_ACT_CONFIG,
  DASHBOARD_MODES,
  PORTRAIT_ORBITAL_RINGS,
  getJourneyStageConfig,
  deriveDashboardMode,
  AMBIENT_CONFIG,
} from "../config";

// ═══════════════════════════════════════════════════════════════════════
// §1  TEMPORAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate days elapsed since a date string.
 * Returns 999 for invalid/missing dates (safe fallback for comparisons).
 *
 * @param dateStr - ISO date string
 * @returns Number of days, or 999 if invalid
 */
export function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate days until a future date.
 * Returns -1 for past dates or invalid input.
 *
 * @param dateStr - ISO date string (future)
 * @returns Number of days, or -1 if past/invalid
 */
export function daysUntil(dateStr: string | undefined | null): number {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return -1;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════
// §2  TEMPERATURE COMPOSITION ENGINE
//
// Temperature is THE number. It has physics:
//   Core    — long-term, derived from vital signs (slow-moving)
//   Surface — short-term, last 7 days activity (reactive)
//   Ambient — club average (baseline for comparison)
//   Relative — surface minus ambient (how far from average)
//
// Weights SHIFT based on lifecycle stage:
//   New member  → engagement + activity matter most
//   Veteran     → satisfaction + social matter most
//   At-risk     → engagement + satisfaction override everything
//
// The central orb in the Portrait shows core as steady glow.
// Surface is the reactive halo around it.
// A ghost ring shows ambient for comparison.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Derive the temperature weights for a specific lifecycle stage.
 * Merges base weights with stage-specific overrides.
 *
 * @param stage - Current journey stage
 * @returns Final weight distribution summing to 1.0
 */
export function deriveTemperatureWeights(
  stage: string,
): Record<VitalSignName, number> {
  const base = { ...TEMPERATURE_BASE_WEIGHTS };
  const overrides = TEMPERATURE_STAGE_WEIGHTS[stage];

  if (!overrides) return base;

  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    base[key as VitalSignName] = value;
  }

  // Normalize to sum = 1.0
  const sum = Object.values(base).reduce((a, b) => a + b, 0);
  if (sum === 0) return TEMPERATURE_BASE_WEIGHTS;

  for (const key of Object.keys(base) as VitalSignName[]) {
    base[key] = base[key] / sum;
  }

  return base;
}

/**
 * Compute thermal mass — resistance to temperature change.
 * Higher mass = member is more stable, temperature moves slowly.
 *
 * Formula: tierMultiplier × tenureCoefficient × (1 + connections / 20)
 *
 * @param tier - Member tier
 * @param joinDate - Member join date (ISO)
 * @param connectionsCount - Number of social connections
 * @returns Thermal mass coefficient (typically 0.2 to 2.5)
 */
export function computeThermalMass(
  tier: string,
  joinDate: string,
  connectionsCount: number,
): number {
  const tierMultiplier = THERMAL_MASS_TIER_MULTIPLIER[tier] ?? 1.0;
  const tenureDays = daysSince(joinDate);
  const tenureCoeff = THERMAL_MASS_CURVE.find(
    (c) => tenureDays <= c.maxDays,
  )?.coefficient ?? 0.3;
  const connectionBoost = 1 + Math.min(connectionsCount / 20, 0.5);

  return Math.round(tierMultiplier * tenureCoeff * connectionBoost * 100) / 100;
}

/**
 * Derive a complete MemberTemperature reading from all available data.
 * This is the core function — it produces THE number.
 *
 * @param profile - Member360 profile response
 * @param healthScore - Health score response
 * @param vitalSigns - Pre-computed vital signs (6 dimensions)
 * @param clubAvgTemperature - Club average temperature (default 55)
 * @returns Full temperature reading with layers, momentum, state
 */
export function deriveTemperature(
  profile: Member360ProfileResponse,
  healthScore: MemberHealthScoreResponse | null | undefined,
  vitalSigns: VitalSign[],
  clubAvgTemperature: number = 55,
): MemberTemperature {
  const stage = profile.journey_stage;
  const tier = profile.member?.tier ?? "basic";
  const joinDate = profile.member?.join_date ?? "";
  const connectionsCount = profile.connections_count ?? 0;

  // Get stage-adjusted weights
  const weights = deriveTemperatureWeights(stage);

  // Build vital sign value lookup
  const vitalLookup: Partial<Record<VitalSignName, number>> = {};
  for (const vs of vitalSigns) {
    vitalLookup[vs.name] = vs.value;
  }

  // Compute core temperature — weighted composite of vital signs
  let coreRaw = 0;
  let totalWeight = 0;
  for (const [name, weight] of Object.entries(weights) as Array<[VitalSignName, number]>) {
    const value = vitalLookup[name] ?? 50; // default 50 if missing
    coreRaw += value * weight;
    totalWeight += weight;
  }
  const core = totalWeight > 0 ? Math.round(coreRaw / totalWeight) : 50;

  // Surface — blend of core and recent engagement/activity signals
  const recentEngagement = profile.engagement_score ?? core;
  const recentActivity = profile.total_activities_90d > 0
    ? Math.min(100, profile.total_activities_90d * 5)
    : 30;
  const surface = Math.round(core * 0.4 + recentEngagement * 0.35 + recentActivity * 0.25);

  // Ambient — club average
  const ambient = clubAvgTemperature;

  // Relative — how far above/below average
  const relative = Math.round((surface - ambient) * 10) / 10;

  // Composite — final blend: 60% core + 40% surface
  const composite = Math.round(core * 0.6 + surface * 0.4);

  // Derive state and zone from composite
  const state = temperatureToState(composite);
  const zone = temperatureToZone(composite);

  // Compute momentum
  const momentum = computeMomentum(
    profile,
    healthScore,
    tier,
    joinDate,
    connectionsCount,
    composite,
  );

  // Derive trend from momentum
  const trend: MemberTemperature["trend"] =
    momentum.velocity > 0.1 ? "improving" :
    momentum.velocity < -0.1 ? "declining" :
    "stable";

  // Build dimension map
  const dimensions: Record<VitalSignName, number> = {} as Record<VitalSignName, number>;
  for (const vs of vitalSigns) {
    dimensions[vs.name] = vs.value;
  }

  return {
    composite,
    dimensions,
    reading: { core, surface, ambient, relative },
    state,
    zone,
    momentum,
    trend,
    computedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §3  VITAL SIGNS DERIVATION
//
// Each dimension of the Portrait ring is a vital sign.
// Like a patient monitor: value, normal range, status, trend.
// Sub-factors enable drill-down without leaving the visualization.
//
// Data sources per dimension:
//   engagement   ← profile.engagement_score + activity diversity
//   financial    ← profile.ltv_estimate + ltv_trend + spend patterns
//   social       ← profile.connections_count + social_influence_score
//   satisfaction ← profile.satisfaction_nps + health trend
//   activity     ← profile.total_activities_90d + activity_streak
//   wellness     ← health score factors (if available)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Derive all 6 vital signs from member data.
 * Each vital sign includes value, normal range, status, trend, and sub-factors.
 *
 * @param profile - Member360 profile response
 * @param healthScore - Health score response (optional)
 * @param activitySummary - Activity summary (optional)
 * @param socialProfile - Social profile (optional)
 * @param ltvAnalysis - LTV analysis (optional)
 * @param tier - Member tier for threshold adjustment
 * @returns Array of 6 vital signs
 */
export function deriveVitalSigns(
  profile: Member360ProfileResponse,
  healthScore?: MemberHealthScoreResponse | null,
  activitySummary?: MemberActivitySummaryResponse | null,
  socialProfile?: MemberSocialProfileResponse | null,
  _ltvAnalysis?: MemberLTVAnalysisResponse | null,
  tier?: string,
): VitalSign[] {
  const tierAdj = TIER_THRESHOLD_ADJUSTMENT[tier ?? "basic"] ?? 0;
  const now = new Date().toISOString();

  const signs: VitalSign[] = [];

  // ── Engagement ──
  const engScore = profile.engagement_score ?? 50;
  const activeDomainCount = profile.active_domains?.length ?? 0;
  const engBonus = Math.min(activeDomainCount * 3, 15); // diversity bonus
  const engValue = Math.min(100, Math.round(engScore + engBonus));
  signs.push({
    name: "engagement",
    value: engValue,
    weight: 0.25,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.engagement.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.engagement.normal[1],
    ],
    status: deriveVitalStatus(engValue, "engagement", tierAdj),
    trend: deriveVitalTrend(engValue, healthScore?.factors?.find(f => f.name === "engagement")?.score),
    lastReading: now,
    detail: `Activo en ${activeDomainCount} dominios — engagement score ${engScore}`,
    subFactors: [
      { name: "domain_diversity", value: Math.min(100, activeDomainCount * 12.5), weight: 0.4 },
      { name: "frequency", value: engScore, weight: 0.6 },
    ],
  });

  // ── Financial ──
  const ltvEstimate = profile.ltv_estimate ?? 0;
  const ltvTrend = profile.ltv_trend ?? "stable";
  const financialFactor = healthScore?.factors?.find(f => f.name === "financial");
  const finBase = financialFactor?.score ?? 50;
  const ltvBonus = ltvTrend === "improving" ? 10 : ltvTrend === "declining" ? -15 : 0;
  const finValue = clamp(finBase + ltvBonus, 0, 100);
  signs.push({
    name: "financial",
    value: finValue,
    weight: 0.20,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.financial.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.financial.normal[1],
    ],
    status: deriveVitalStatus(finValue, "financial", tierAdj),
    trend: ltvTrend === "improving" ? "improving" : ltvTrend === "declining" ? "declining" : "stable",
    lastReading: now,
    detail: `LTV estimado ₡${ltvEstimate.toLocaleString()} — tendencia ${ltvTrend}`,
    subFactors: [
      { name: "ltv_trend", value: ltvTrend === "improving" ? 80 : ltvTrend === "declining" ? 25 : 50, weight: 0.5 },
      { name: "payment_health", value: finBase, weight: 0.5 },
    ],
  });

  // ── Social ──
  const connections = profile.connections_count ?? 0;
  const socialFactor = healthScore?.factors?.find(f => f.name === "social");
  const socialBase = socialFactor?.score ?? 50;
  const influenceScore = socialProfile?.social_influence_score ?? 0;
  const clusterCount = socialProfile?.cluster_membership?.length ?? 0;
  const socialBonus = Math.min(influenceScore * 0.3 + clusterCount * 5, 20);
  const socialValue = clamp(Math.round(socialBase + socialBonus), 0, 100);
  signs.push({
    name: "social",
    value: socialValue,
    weight: 0.18,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.social.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.social.normal[1],
    ],
    status: deriveVitalStatus(socialValue, "social", tierAdj),
    trend: deriveVitalTrend(socialValue, socialBase),
    lastReading: now,
    detail: `${connections} conexiones — influencia ${influenceScore} — ${clusterCount} clusters`,
    subFactors: [
      { name: "connections", value: Math.min(100, connections * 5), weight: 0.35 },
      { name: "influence", value: influenceScore, weight: 0.35 },
      { name: "cluster_cohesion", value: Math.min(100, clusterCount * 25), weight: 0.30 },
    ],
  });

  // ── Satisfaction ──
  const nps = profile.satisfaction_nps ?? 50;
  const satFactor = healthScore?.factors?.find(f => f.name === "satisfaction");
  const satBase = satFactor?.score ?? 50;
  // NPS: 0-10 scale → 0-100
  const npsNormalized = Math.min(100, Math.max(0, nps * 10));
  const satValue = clamp(Math.round(satBase * 0.6 + npsNormalized * 0.4), 0, 100);
  signs.push({
    name: "satisfaction",
    value: satValue,
    weight: 0.17,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.satisfaction.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.satisfaction.normal[1],
    ],
    status: deriveVitalStatus(satValue, "satisfaction", tierAdj),
    trend: deriveVitalTrend(satValue, satBase),
    lastReading: now,
    detail: `NPS ${nps} — satisfaction factor ${satBase}/100`,
    subFactors: [
      { name: "nps_score", value: npsNormalized, weight: 0.4 },
      { name: "satisfaction_factor", value: satBase, weight: 0.6 },
    ],
  });

  // ── Activity ──
  const totalActivities = profile.total_activities_90d ?? 0;
  const actFactor = healthScore?.factors?.find(f => f.name === "activity");
  const actBase = actFactor?.score ?? 50;
  const streak = activitySummary?.activity_streak_current ?? 0;
  const streakBonus = Math.min(streak * 2, 15);
  const activityDensity = Math.min(100, totalActivities * 3); // ~33 activities = 100
  const actValue = clamp(Math.round(actBase * 0.5 + activityDensity * 0.3 + streakBonus * 0.2), 0, 100);
  signs.push({
    name: "activity",
    value: actValue,
    weight: 0.12,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.activity.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.activity.normal[1],
    ],
    status: deriveVitalStatus(actValue, "activity", tierAdj),
    trend: deriveVitalTrend(actValue, actBase),
    lastReading: now,
    detail: `${totalActivities} actividades en 90d — racha ${streak} días`,
    subFactors: [
      { name: "frequency", value: activityDensity, weight: 0.5 },
      { name: "consistency", value: Math.min(100, streak * 7), weight: 0.3 },
      { name: "recency", value: daysSince(profile.last_activity_date) < 3 ? 90 : daysSince(profile.last_activity_date) < 7 ? 60 : 30, weight: 0.2 },
    ],
  });

  // ── Wellness ──
  // Wellness is inferred from health score factors + engagement patterns
  const wellnessFactors = healthScore?.factors?.filter(
    f => f.name === "activity" || f.name === "engagement" || f.name === "satisfaction"
  ) ?? [];
  const wellnessBase = wellnessFactors.length > 0
    ? wellnessFactors.reduce((sum, f) => sum + f.score, 0) / wellnessFactors.length
    : 50;
  const wellnessValue = clamp(Math.round(wellnessBase * 0.8 + (profile.health_score ?? 50) * 0.2), 0, 100);
  signs.push({
    name: "wellness",
    value: wellnessValue,
    weight: 0.10,
    normalRange: [
      VITAL_SIGN_THRESHOLDS.wellness.normal[0] + tierAdj,
      VITAL_SIGN_THRESHOLDS.wellness.normal[1],
    ],
    status: deriveVitalStatus(wellnessValue, "wellness", tierAdj),
    trend: deriveVitalTrend(wellnessValue, wellnessBase),
    lastReading: now,
    detail: `Indicador compuesto de bienestar basado en actividad, engagement y satisfacción`,
    subFactors: [
      { name: "physical_activity", value: wellnessFactors.find(f => f.name === "activity")?.score ?? 50, weight: 0.4 },
      { name: "engagement_wellness", value: wellnessFactors.find(f => f.name === "engagement")?.score ?? 50, weight: 0.3 },
      { name: "life_satisfaction", value: wellnessFactors.find(f => f.name === "satisfaction")?.score ?? 50, weight: 0.3 },
    ],
  });

  return signs;
}

/**
 * Derive vital sign status from value and thresholds.
 */
function deriveVitalStatus(
  value: number,
  dimension: VitalSignName,
  tierAdj: number,
): VitalSign["status"] {
  const t = VITAL_SIGN_THRESHOLDS[dimension];
  if (value >= t.thriving[0] + tierAdj) return "thriving";
  if (value >= t.normal[0] + tierAdj) return "normal";
  if (value >= t.elevated[0] + tierAdj) return "elevated";
  return "critical";
}

/**
 * Derive vital sign trend from current vs previous values.
 */
function deriveVitalTrend(
  current: number,
  previous?: number | null,
): "improving" | "stable" | "declining" {
  if (previous === undefined || previous === null) return "stable";
  const delta = current - previous;
  if (delta > 5) return "improving";
  if (delta < -5) return "declining";
  return "stable";
}

// ═══════════════════════════════════════════════════════════════════════
// §4  MOMENTUM COMPUTATION
//
// The physics of engagement change:
//   velocity     — rate of temperature change (-1 to +1)
//   acceleration — is change speeding up or slowing down?
//   thermalMass  — resistance to change (tenure, tier, connections)
//   trajectory   — predicted state at 30d and 90d
//
// High thermal mass + low velocity = stable (good)
// Low thermal mass + high negative velocity = freefall (danger)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Compute engagement momentum for a member.
 *
 * @param profile - Member360 profile
 * @param healthScore - Health score (for trend)
 * @param tier - Member tier
 * @param joinDate - Join date
 * @param connectionsCount - Number of connections
 * @param currentTemperature - Current composite temperature
 * @returns Momentum with velocity, acceleration, thermal mass, trajectories
 */
export function computeMomentum(
  profile: Member360ProfileResponse,
  healthScore: MemberHealthScoreResponse | null | undefined,
  tier: string,
  joinDate: string,
  connectionsCount: number,
  currentTemperature: number,
): MemberMomentum {
  // Thermal mass — how resistant to change
  const thermalMass = computeThermalMass(tier, joinDate, connectionsCount);

  // Velocity — derived from health score trend and churn score
  const churnScore = profile.churn_score ?? 50;
  const engScore = profile.engagement_score ?? 50;
  const healthTrend = healthScore?.trend ?? "stable";

  let velocity = 0;
  if (healthTrend === "improving") velocity += 0.3;
  else if (healthTrend === "declining") velocity -= 0.3;

  // Churn score influence (inverse: high churn = negative velocity)
  velocity += (50 - churnScore) / 100;

  // Engagement influence
  velocity += (engScore - 50) / 200;

  // Dampen by thermal mass (high mass = slower change)
  velocity = velocity / Math.max(thermalMass, 0.5);
  velocity = Math.max(-1, Math.min(1, velocity));

  // Acceleration — derived from engagement score vs churn score tension
  const tension = (engScore - churnScore) / 100;
  const acceleration = Math.max(-1, Math.min(1, tension * 0.5));

  // Trajectory projections
  const proj30d = clamp(currentTemperature + velocity * 30 * (1 / thermalMass), 0, 100);
  const proj90d = clamp(currentTemperature + velocity * 90 * (1 / thermalMass) + acceleration * 10, 0, 100);

  return {
    velocity: Math.round(velocity * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    thermalMass: Math.round(thermalMass * 100) / 100,
    trajectory30d: temperatureToState(Math.round(proj30d)),
    trajectory90d: temperatureToState(Math.round(proj90d)),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §5  CROSS-DOMAIN SIGNAL AGGREGATION
//
// Each domain emits signals about a member. This section:
//   1. Builds DomainSignal objects from raw data
//   2. Aggregates signals into a unified picture
//   3. Computes SignalResonance (do domains agree?)
//
// When 5 domains all say "this member is declining" → high resonance.
// When some say "declining" and some say "improving" → low resonance.
// High resonance = high confidence in the assessment.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build domain signals from all available member data.
 * Each data source contributes one or more signals.
 *
 * @param profile - Member360 profile
 * @param healthScore - Health score
 * @param churnPrediction - Churn prediction
 * @param activitySummary - Activity summary
 * @param socialProfile - Social profile
 * @param ltvAnalysis - LTV analysis
 * @returns Array of domain signals ready for resonance analysis
 */
export function buildDomainSignals(
  profile: Member360ProfileResponse,
  healthScore?: MemberHealthScoreResponse | null,
  churnPrediction?: MemberChurnPredictionResponse | null,
  activitySummary?: MemberActivitySummaryResponse | null,
  socialProfile?: MemberSocialProfileResponse | null,
  ltvAnalysis?: MemberLTVAnalysisResponse | null,
): DomainSignal[] {
  const signals: DomainSignal[] = [];
  const now = new Date().toISOString();

  // ── Engagement domain ──
  const engScore = profile.engagement_score ?? 50;
  signals.push({
    domain: "events", // engagement is tracked via events
    signal: `Engagement score: ${engScore}/100`,
    value: engScore,
    direction: engScore >= 70 ? "positive" : engScore >= 40 ? "neutral" : "negative",
    severity: engScore >= 70 ? "low" : engScore >= 40 ? "medium" : "high",
    timestamp: now,
    confidence: 0.9,
    actionable: engScore < 40,
    tool: engScore < 40 ? "generate_member_engagement_proposals" : undefined,
  });

  // ── Health domain ──
  if (healthScore) {
    const composite = healthScore.composite_score ?? 50;
    signals.push({
      domain: "wellness",
      signal: `Health score: ${composite}/100 (${healthScore.health_level})`,
      value: composite,
      direction: composite >= 70 ? "positive" : composite >= 40 ? "neutral" : "negative",
      severity: healthScore.trend === "declining" ? "high" : composite < 40 ? "critical" : "low",
      timestamp: healthScore.generated_at ?? now,
      confidence: 0.85,
      actionable: healthScore.trend === "declining",
    });
  }

  // ── Churn domain ──
  if (churnPrediction) {
    const churnScore = churnPrediction.churn_score ?? 50;
    signals.push({
      domain: "recommendations",
      signal: `Churn risk: ${churnPrediction.churn_risk} (${churnScore}/100)`,
      value: 100 - churnScore, // invert: low churn = positive
      direction: churnScore < 30 ? "positive" : churnScore < 60 ? "neutral" : "negative",
      severity: churnScore >= 70 ? "critical" : churnScore >= 40 ? "high" : "low",
      timestamp: churnPrediction.generated_at ?? now,
      confidence: churnPrediction.confidence / 100,
      actionable: churnScore >= 40,
      tool: churnScore >= 40 ? "generate_member_engagement_proposals" : undefined,
    });
  }

  // ── Activity domain ──
  if (activitySummary) {
    const total = activitySummary.total_activities ?? 0;
    const activeDomains = activitySummary.by_domain?.filter(d => d.count > 0).length ?? 0;
    const streak = activitySummary.activity_streak_current ?? 0;

    signals.push({
      domain: "sports", // activity tracked via sports/activities
      signal: `${total} actividades en ${activitySummary.period_days}d — ${activeDomains} dominios — racha ${streak}`,
      value: Math.min(100, total * 3),
      direction: total >= 15 ? "positive" : total >= 5 ? "neutral" : "negative",
      severity: total < 3 ? "high" : total < 8 ? "medium" : "low",
      timestamp: activitySummary.generated_at ?? now,
      confidence: 0.8,
      actionable: total < 5,
    });
  }

  // ── Social domain ──
  if (socialProfile) {
    const connections = socialProfile.connections_count ?? 0;
    const influence = socialProfile.social_influence_score ?? 0;
    const referrals = socialProfile.referrals_made ?? 0;

    signals.push({
      domain: "social",
      signal: `${connections} conexiones — influencia ${influence} — ${referrals} referidos`,
      value: Math.min(100, influence + connections * 2),
      direction: influence >= 60 ? "positive" : influence >= 30 ? "neutral" : "negative",
      severity: connections < 3 ? "high" : influence < 20 ? "medium" : "low",
      timestamp: socialProfile.generated_at ?? now,
      confidence: 0.75,
      actionable: connections < 5 && influence < 40,
    });
  }

  // ── Financial domain ──
  if (ltvAnalysis) {
    const ltv = ltvAnalysis.current_ltv ?? 0;
    const trend = ltvAnalysis.ltv_trend ?? "stable";

    signals.push({
      domain: "families", // financial tracked via families
      signal: `LTV ₡${ltv.toLocaleString()} — tendencia ${trend}`,
      value: trend === "improving" ? 80 : trend === "declining" ? 30 : 55,
      direction: trend === "improving" ? "positive" : trend === "declining" ? "negative" : "neutral",
      severity: trend === "declining" ? "high" : "low",
      timestamp: ltvAnalysis.generated_at ?? now,
      confidence: 0.7,
      actionable: trend === "declining",
    });
  }

  // ── Lifecycle domain ──
  const stage = profile.journey_stage;
  const stageConfig = getJourneyStageConfig(stage);
  if (stageConfig) {
    const daysInStage = profile.days_in_stage ?? 0;
    const isStuck = daysInStage > stageConfig.avgDurationDays * stageConfig.alertMultiplier;

    signals.push({
      domain: "communications",
      signal: `Stage: ${stage} — ${daysInStage} días (avg: ${stageConfig.avgDurationDays})`,
      value: isStuck ? 25 : stage === "engaged" ? 85 : stage === "dormant" ? 15 : 50,
      direction: isStuck || stage === "dormant" || stage === "churned" ? "negative" : stage === "engaged" ? "positive" : "neutral",
      severity: isStuck ? "high" : stage === "churned" ? "critical" : "low",
      timestamp: profile.generated_at ?? now,
      confidence: 0.85,
      actionable: isStuck,
    });
  }

  return signals;
}

/**
 * Aggregate signals into a temperature-adjusted resonance score.
 * High resonance = multiple domains agree = high confidence.
 *
 * @param signals - Array of domain signals
 * @returns Signal resonance with amplified confidence
 */
export function aggregateSignals(signals: DomainSignal[]): SignalResonance {
  return computeSignalResonance(signals);
}

/**
 * Compute the domain temperature contribution.
 * Each domain's signal value is weighted by the influence matrix
 * to determine how much it affects each vital sign dimension.
 *
 * @param signal - A single domain signal
 * @returns Record of dimension contributions (0-100 weighted)
 */
export function signalToDimensionContributions(
  signal: DomainSignal,
): Partial<Record<VitalSignName, number>> {
  const influence = DOMAIN_INFLUENCE_MATRIX[signal.domain];
  if (!influence) return {};

  const contributions: Partial<Record<VitalSignName, number>> = {};
  for (const [dim, factor] of Object.entries(influence) as Array<[VitalSignName, number]>) {
    contributions[dim] = Math.round(signal.value * factor * signal.confidence);
  }
  return contributions;
}

// ═══════════════════════════════════════════════════════════════════════
// §6  ENGAGEMENT DNA DERIVATION
//
// Each member has a behavioral "genetic code":
// - Which channels they engage through (and how strongly)
// - Recency-weighted scores that decay over time
// - Preferred channels (high frequency + high strength)
//
// Decay rates vary by domain (configurable in config.ts):
// - Events decay fast (ephemeral)
// - Social connections decay slowly (persistent)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Derive engagement DNA channels from activity data.
 * Each channel shows frequency, strength, recency, and trend.
 *
 * @param activitySummary - Activity summary with by_domain breakdown
 * @param socialProfile - Social profile for social channel
 * @returns Array of engagement DNA channels (one per active domain)
 */
export function deriveEngagementDNA(
  activitySummary: MemberActivitySummaryResponse | null | undefined,
  socialProfile: MemberSocialProfileResponse | null | undefined,
): EngagementDNAChannel[] {
  const channels: EngagementDNAChannel[] = [];
  Date.now();

  // ── Build from activity domains ──
  if (activitySummary?.by_domain) {
    for (const domainData of activitySummary.by_domain) {
      const domain = domainData.domain;
      if (!isActivityDomain(domain)) continue;

      const decayRate = ENGAGEMENT_DECAY_RATES[domain as ActivityDomain] ?? 0.98;
      const daysSinceLastActivity = domainData.last_activity
        ? daysSince(domainData.last_activity)
        : 999;

      // Recency score: base score × decay^days
      const recencyScore = Math.round(
        Math.min(100, domainData.count * 10) * Math.pow(decayRate, daysSinceLastActivity),
      );

      // Frequency: interactions per month (count / period * 30)
      const periodDays = activitySummary.period_days || 90;
      const frequency = Math.round((domainData.count / periodDays) * 30 * 10) / 10;

      // Strength: based on percentage + trend
      const trendBoost = domainData.trend === "improving" ? 0.15 : domainData.trend === "declining" ? -0.15 : 0;
      const strength = Math.max(0, Math.min(1, (domainData.percentage / 100) + trendBoost));

      channels.push({
        domain: domain as ActivityDomain,
        frequency,
        strength: Math.round(strength * 100) / 100,
        lastActive: domainData.last_activity ?? "",
        preferred: frequency >= 4 && strength >= 0.5,
        trend: domainData.trend === "improving" ? "improving" : domainData.trend === "declining" ? "declining" : "stable",
        nextPredicted: predictNextInteraction(frequency, daysSinceLastActivity),
        recencyScore,
      });
    }
  }

  // ── Social channel from social profile ──
  if (socialProfile && socialProfile.connections_count > 0) {
    const existingSocial = channels.find(c => c.domain === "social");
    if (!existingSocial) {
      const connections = socialProfile.connections_count ?? 0;
      const influence = socialProfile.social_influence_score ?? 0;
      const lastInteraction = socialProfile.connections?.[0]?.last_interaction;

      channels.push({
        domain: "social",
        frequency: Math.round(connections * 0.5 * 10) / 10,
        strength: Math.min(1, influence / 100),
        lastActive: lastInteraction ?? "",
        preferred: connections >= 5 && influence >= 50,
        trend: influence >= 60 ? "improving" : influence < 30 ? "declining" : "stable",
        recencyScore: Math.round(influence * Math.pow(0.995, daysSince(lastInteraction))),
      });
    }
  }

  // Sort by recency score (most active first)
  channels.sort((a, b) => b.recencyScore - a.recencyScore);

  return channels;
}

/**
 * Predict next interaction date based on frequency pattern.
 *
 * @param frequencyPerMonth - Average interactions per month
 * @param daysSinceLast - Days since last interaction
 * @returns ISO date string of predicted next interaction
 */
function predictNextInteraction(
  frequencyPerMonth: number,
  daysSinceLast: number,
): string {
  if (frequencyPerMonth <= 0) return "";

  const avgDaysBetween = 30 / frequencyPerMonth;
  const expectedNext = Math.max(0, avgDaysBetween - daysSinceLast);
  const predicted = new Date(Date.now() + expectedNext * 24 * 60 * 60 * 1000);

  return predicted.toISOString();
}

// ═══════════════════════════════════════════════════════════════════════
// §7  MEMBER NARRATIVE BUILDER
//
// The AI briefing follows dramatic structure:
//   Act I  — Context: What's happening (measured, 40cps)
//   Act II — Tension: What's at risk (urgent, 55cps)
//   Act III — Resolution: What to do (decisive, 45cps)
//
// Each act is sourced from domain signals.
// The typing engine renders each act at different speeds
// (configured in NARRATIVE_ACT_CONFIG).
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a 3-act AI narrative for a member.
 * Each act draws from different data sources and has different urgency.
 *
 * @param profile - Member360 profile
 * @param temperature - Computed temperature
 * @param vitalSigns - 6 vital signs
 * @param signals - Cross-domain signals
 * @param resonance - Signal resonance
 * @returns Complete narrative with 3 acts
 */
export function buildMemberNarrative(
  profile: Member360ProfileResponse,
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
  signals: DomainSignal[],
  resonance: SignalResonance,
): MemberNarrative {
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";
  const sections: NarrativeSection[] = [];

  // ── Act I: Context ──
  sections.push(buildContextAct(name, profile, temperature, vitalSigns));

  // ── Act II: Tension ──
  const tensionAct = buildTensionAct(name, profile, temperature, signals, resonance);
  if (tensionAct) sections.push(tensionAct);

  // ── Act III: Resolution ──
  sections.push(buildResolutionAct(name, profile, temperature, signals, resonance));

  // Compute expiry (narrative is valid for 15 min in calm, 5 min in critical)
  const mode = deriveDashboardMode(temperature.state, temperature.composite);
  const expiryMs = mode === "critical" ? 5 * 60 * 1000 : mode === "alert" ? 10 * 60 * 1000 : 15 * 60 * 1000;

  return {
    sections,
    temperature: temperature.composite,
    state: temperature.state,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryMs).toISOString(),
    confidence: resonance.amplifiedConfidence,
  };
}

/**
 * Build Act I: Context — what's happening with this member.
 */
function buildContextAct(
  name: string,
  profile: Member360ProfileResponse,
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
): NarrativeSection {
  const tier = profile.member?.tier ?? "básico";
  const stage = profile.journey_stage;
  const daysInStage = profile.days_in_stage ?? 0;
  const activeDomains = profile.active_domains?.length ?? 0;

  // Find strongest and weakest vital signs
  const sorted = [...vitalSigns].sort((a, b) => b.value - a.value);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const stateLabel = temperature.state === "thriving" ? "floreciente" :
    temperature.state === "stable" ? "estable" :
    temperature.state === "drifting" ? "a la deriva" :
    temperature.state === "at_risk" ? "en riesgo" : "desvinculándose";

  let text = `${name} — socio ${tier} en estado ${stateLabel}. `;
  text += `Temperatura ${temperature.composite}/100 (${temperature.zone}). `;
  text += `${daysInStage} días en etapa "${stage}". `;
  text += `Activo en ${activeDomains} dominios. `;

  if (strongest && weakest && strongest.name !== weakest.name) {
    text += `Punto fuerte: ${strongest.name} (${strongest.value}). `;
    text += `Área de atención: ${weakest.name} (${weakest.value}).`;
  }

  return {
    act: "context",
    text: text.trim(),
    confidence: 0.9,
    source: "events",
    signals: [`${temperature.composite}°`, `${activeDomains} dominios`, `${daysInStage}d en stage`],
    typingSpeed: NARRATIVE_ACT_CONFIG.context.typingSpeedCPS,
  };
}

/**
 * Build Act II: Tension — what's at risk.
 * Returns null if there's no tension (thriving member with high temperature).
 */
function buildTensionAct(
  name: string,
  profile: Member360ProfileResponse,
  temperature: MemberTemperature,
  signals: DomainSignal[],
  resonance: SignalResonance,
): NarrativeSection | null {
  // Skip tension for thriving members with positive resonance
  if (temperature.state === "thriving" && resonance.sharedDirection === "positive") {
    return null;
  }

  const negativeSignals = signals.filter(s => s.direction === "negative" || s.severity === "critical" || s.severity === "high");

  if (negativeSignals.length === 0 && temperature.state === "stable") {
    return null;
  }

  let text = "";

  if (temperature.state === "disengaging" || temperature.state === "at_risk") {
    const churnScore = profile.churn_score ?? 0;
    text = `Alerta: ${name} muestra señales de desvinculación. `;
    text += `Score de abandono: ${churnScore}/100. `;
    if (resonance.agreement !== "conflicting") {
      text += `${resonance.agreementCount} dominios confirman la tendencia negativa. `;
    }
    if (negativeSignals.length > 0) {
      text += `Señales: ${negativeSignals.slice(0, 3).map(s => s.signal).join(". ")}.`;
    }
  } else if (temperature.state === "drifting") {
    text = `${name} está a la deriva — participación en descenso. `;
    const weakestDomain = negativeSignals[0];
    if (weakestDomain) {
      text += `Dominio más afectado: ${weakestDomain.domain} — ${weakestDomain.signal}.`;
    }
  } else {
    // Mild tension for stable members with some concerns
    const concerns = negativeSignals.slice(0, 2);
    if (concerns.length > 0) {
      text = `Puntos de atención: ${concerns.map(s => s.signal).join(". ")}.`;
    } else {
      return null;
    }
  }

  return {
    act: "tension",
    text: text.trim(),
    confidence: resonance.amplifiedConfidence,
    source: negativeSignals[0]?.domain ?? "events",
    signals: negativeSignals.slice(0, 3).map(s => s.signal),
    typingSpeed: NARRATIVE_ACT_CONFIG.tension.typingSpeedCPS,
  };
}

/**
 * Build Act III: Resolution — what to do.
 * Always present — even thriving members have recommended actions.
 */
function buildResolutionAct(
  name: string,
  _profile: Member360ProfileResponse,
  temperature: MemberTemperature,
  signals: DomainSignal[],
  resonance: SignalResonance,
): NarrativeSection {
  let text = "";

  switch (temperature.state) {
    case "thriving":
      text = `${name} es un activo valioso del club. `;
      text += `Recomendación: reconocer su compromiso, explorar programa de embajadores y evaluar upgrade de tier.`;
      break;
    case "stable":
      text = `Mantener el ritmo de engagement. `;
      text += `Sugerencia: presentar nuevas actividades alineadas con sus intereses para expandir participación.`;
      break;
    case "drifting":
      text = `Ventana de re-engagement activa — actuar en los próximos 14 días. `;
      text += `Contacto personalizado con oferta relevante puede revertir la tendencia.`;
      break;
    case "at_risk":
      text = `Intervención prioritaria: contacto directo esta semana. `;
      text += `Plan de retención personalizado con seguimiento semanal.`;
      break;
    case "disengaging":
      text = `Última ventana de acción — intervenir en los próximos 3 días o preparar estrategia win-back. `;
      text += `Contacto ejecutivo + experiencia transformadora.`;
      break;
  }

  // Add actionable signal context
  const actionable = signals.filter(s => s.actionable);
  if (actionable.length > 0) {
    text += ` ${actionable.length} acciones específicas disponibles.`;
  }

  return {
    act: "resolution",
    text: text.trim(),
    confidence: resonance.amplifiedConfidence,
    source: "recommendations",
    signals: actionable.slice(0, 2).map(s => s.signal),
    typingSpeed: NARRATIVE_ACT_CONFIG.resolution.typingSpeedCPS,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §8  PREDICTIVE WINDOW DERIVATION
//
// Each prediction has a shelf life. This section builds
// PredictiveWindow objects from raw prediction data,
// applying decay rates and computing window status.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Build a predictive window from churn prediction data.
 *
 * @param churnPrediction - Churn prediction response
 * @returns Predictive window with status and intervention deadline
 */
export function buildChurnWindow(
  churnPrediction: MemberChurnPredictionResponse,
): PredictiveWindow {
  const config = PREDICTIVE_WINDOW_CONFIGS.churn;
  const churnScore = churnPrediction.churn_score ?? 50;
  const horizonDays = churnPrediction.time_horizon_days ?? config.defaultHorizonDays;

  // Intervention deadline: sooner for higher churn
  const urgencyFactor = churnScore / 100;
  const daysToDeadline = Math.round(horizonDays * (1 - urgencyFactor * 0.7));
  const deadline = new Date(Date.now() + daysToDeadline * 24 * 60 * 60 * 1000);

  const status = deriveWindowStatus(daysToDeadline);

  return {
    metric: config.metric,
    current: churnScore,
    predicted: Math.min(100, churnScore + churnScore * 0.2), // projected increase
    confidence: churnPrediction.confidence / 100,
    horizonDays,
    interventionDeadline: deadline.toISOString(),
    status,
    decayRate: config.decayRatePerDay,
    daysRemaining: daysToDeadline,
  };
}

/**
 * Build a predictive window from LTV analysis data.
 *
 * @param ltvAnalysis - LTV analysis response
 * @returns Predictive window for LTV trajectory
 */
export function buildLTVWindow(
  ltvAnalysis: MemberLTVAnalysisResponse,
): PredictiveWindow {
  const config = PREDICTIVE_WINDOW_CONFIGS.ltv_decline;
  const current = ltvAnalysis.current_ltv ?? 0;
  const projected = ltvAnalysis.projection_12m ?? current;
  const confidence = ltvAnalysis.projection_confidence ?? 50;

  const isDeclining = projected < current;
  const horizonDays = config.defaultHorizonDays;

  // Only create intervention window for declining LTV
  const daysToDeadline = isDeclining
    ? Math.round(horizonDays * 0.6) // 60% of horizon
    : undefined;

  return {
    metric: config.metric,
    current,
    predicted: projected,
    confidence: confidence / 100,
    horizonDays,
    interventionDeadline: daysToDeadline
      ? new Date(Date.now() + daysToDeadline * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    status: daysToDeadline ? deriveWindowStatus(daysToDeadline) : "open",
    decayRate: config.decayRatePerDay,
    daysRemaining: daysToDeadline,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §9  INSIGHT SORTING & FILTERING
//
// Utilities for ordering and filtering advisor insights
// by impact, resonance, and window urgency.
// ═══════════════════════════════════════════════════════════════════════

/** Impact priority order for sorting */
const IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Sort insights by composite priority:
 *   1. Impact severity (critical first)
 *   2. Window urgency (imminent first)
 *   3. Resonance (high agreement first)
 *   4. Confidence (highest first)
 *
 * @param insights - Array of advisor insights (any type with required fields)
 * @returns Sorted copy of insights
 */
export function sortInsightsByPriority<
  T extends {
    impact: string;
    confidence: number;
    resonance?: { amplifiedConfidence: number; agreementCount: number };
    window?: { status: WindowStatus; daysRemaining?: number };
  },
>(insights: T[]): T[] {
  const windowUrgency: Record<WindowStatus, number> = {
    closed: 0,
    imminent: 1,
    closing: 2,
    open: 3,
  };

  return [...insights].sort((a, b) => {
    // 1. Impact
    const impactDiff = (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4);
    if (impactDiff !== 0) return impactDiff;

    // 2. Window urgency
    const aWindow = a.window ? windowUrgency[a.window.status] ?? 3 : 3;
    const bWindow = b.window ? windowUrgency[b.window.status] ?? 3 : 3;
    if (aWindow !== bWindow) return aWindow - bWindow;

    // 3. Resonance
    const aResonance = a.resonance?.amplifiedConfidence ?? 0;
    const bResonance = b.resonance?.amplifiedConfidence ?? 0;
    if (Math.abs(aResonance - bResonance) > 0.1) return bResonance - aResonance;

    // 4. Confidence
    return b.confidence - a.confidence;
  });
}

/**
 * Filter signals to only actionable ones with a minimum severity.
 *
 * @param signals - All domain signals
 * @param minSeverity - Minimum severity to include
 * @returns Filtered actionable signals
 */
export function filterActionableSignals(
  signals: DomainSignal[],
  minSeverity: "low" | "medium" | "high" | "critical" = "medium",
): DomainSignal[] {
  const severityOrder: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const minLevel = severityOrder[minSeverity] ?? 2;

  return signals.filter(
    s => s.actionable && (severityOrder[s.severity] ?? 3) <= minLevel,
  );
}

// ═══════════════════════════════════════════════════════════════════════
// §10 PORTRAIT RING RENDERING HELPERS
//
// Compute SVG properties for each orbital ring based on
// current vital sign values. The Portrait component uses
// these to render the 6 concentric rings.
// ═══════════════════════════════════════════════════════════════════════

/** Computed ring properties for SVG rendering */
export interface PortraitRingProps {
  dimension: VitalSignName;
  color: string;
  radius: number;
  strokeWidth: number;
  opacity: number;
  dashArray: string;
  orbitDurationSec: number;
  value: number;
  status: VitalSign["status"];
}

/**
 * Compute SVG ring properties for the Member Portrait.
 * Each ring's appearance reflects the vital sign's current state.
 *
 * @param vitalSigns - Array of 6 vital signs
 * @returns Array of ring props for SVG rendering
 */
export function computePortraitRings(
  vitalSigns: VitalSign[],
): PortraitRingProps[] {
  return PORTRAIT_ORBITAL_RINGS.map((ringConfig) => {
    const sign = vitalSigns.find(vs => vs.name === ringConfig.dimension);
    const value = sign?.value ?? 50;
    const normalizedValue = value / 100;

    // Opacity: map value to opacity range
    const [minOp, maxOp] = ringConfig.opacityRange;
    const opacity = minOp + normalizedValue * (maxOp - minOp);

    // Dash array: "solid" = "0", "dashed" = "8 4", "dotted" = "2 3"
    const dashMap: Record<string, string> = {
      solid: "0",
      dashed: "8 4",
      dotted: "2 3",
    };

    // Stroke color: from VITAL_SIGN_DISPLAY
    const color = sign?.name
      ? getVitalSignColor(sign.name)
      : "var(--color-silver-400)";

    return {
      dimension: ringConfig.dimension,
      color,
      radius: ringConfig.radiusPct,
      strokeWidth: ringConfig.strokeWidth,
      opacity: Math.round(opacity * 100) / 100,
      dashArray: dashMap[ringConfig.dashPattern] ?? "0",
      orbitDurationSec: ringConfig.orbitDurationSec,
      value,
      status: sign?.status ?? "normal",
    };
  });
}

/**
 * Get the color for a vital sign dimension.
 */
function getVitalSignColor(name: VitalSignName): string {
  const colorMap: Record<VitalSignName, string> = {
    engagement: "var(--color-gold-400)",
    financial: "var(--color-emerald-400)",
    social: "var(--color-teal-400)",
    satisfaction: "var(--color-amber-400)",
    activity: "var(--color-terracotta-400)",
    wellness: "var(--color-sage-400)",
  };
  return colorMap[name] ?? "var(--color-silver-400)";
}

// ═══════════════════════════════════════════════════════════════════════
// §11 DASHBOARD AMBIENT STATE
//
// Derive the ambient CSS custom properties for the current dashboard mode.
// These are set as data attributes on the dashboard container
// and read by CSS for animation speeds, glow intensities, etc.
// ═══════════════════════════════════════════════════════════════════════

/** CSS custom properties for ambient rendering */
export interface AmbientState {
  mode: DashboardMode;
  orbRotationSec: number;
  glowPulseSec: number;
  staggerMs: number;
  scanLineRotationSec: number;
  breathMin: number;
  breathMax: number;
  hueShiftPerSec: number;
  animationSpeed: number;
  ambientIntensity: number;
}

/**
 * Derive ambient CSS custom properties from dashboard mode.
 *
 * @param mode - Current dashboard mode
 * @returns Ambient state for CSS custom property injection
 */
export function deriveAmbientState(mode: DashboardMode): AmbientState {
  const ambient = AMBIENT_CONFIG[mode];
  const modeConfig = DASHBOARD_MODES[mode];

  return {
    mode,
    orbRotationSec: ambient.orbRotationSec,
    glowPulseSec: ambient.glowPulseSec,
    staggerMs: ambient.staggerMs,
    scanLineRotationSec: ambient.scanLineRotationSec,
    breathMin: ambient.breathRange[0],
    breathMax: ambient.breathRange[1],
    hueShiftPerSec: ambient.hueShiftPerSec,
    animationSpeed: modeConfig.animationSpeed,
    ambientIntensity: modeConfig.ambientIntensity,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §12 INTERNAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Clamp a number between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}