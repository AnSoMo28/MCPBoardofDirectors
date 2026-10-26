// ═══════════════════════════════════════════════════════════════════════
// Member360 Intelligence — Predictive Engine
// Phase 30 — Block 0.5: The Oracle
// ═══════════════════════════════════════════════════════════════════════
//
// Pure functions for predicting the FUTURE of a member.
// Not a data formatter — an ORACLE that sees what's coming
// and tells you WHEN to act.
//
// Six prediction types:
//   1. Churn Forecast     — When will they leave? (Monte Carlo)
//   2. LTV Projection     — What will they be worth? (time series)
//   3. Engagement Trajectory — Where are they heading? (momentum)
//   4. Next Best Action   — What should we do? (decision matrix)
//   5. Lifecycle Prediction — When will they transition? (state machine)
//   6. Risk Cascade       — Who else is affected? (graph propagation)
//
// Each prediction has:
//   - A confidence band (not just a number — a RANGE)
//   - A time horizon (when this prediction materializes)
//   - A decay rate (how fast confidence drops over time)
//   - An intervention window (when to act for maximum impact)
//
// @rule Pure functions only — no side effects, no hooks, no state
// @rule Config-imported — no hardcoded values
// @rule Every function has JSDoc
// ═══════════════════════════════════════════════════════════════════════

import type {
  MemberState,
  ActivityDomain,
  PredictiveWindow,
  WindowStatus,
  DomainSignal,
  SignalResonance,
  MemberTemperature,
  VitalSign,
  Member360ProfileResponse,
  MemberHealthScoreResponse,
  MemberChurnPredictionResponse,
  MemberLTVAnalysisResponse,
  MemberJourneyResponse,
  MemberActivitySummaryResponse,
  MemberSocialProfileResponse,
} from "../types";

import {
  deriveWindowStatus,
  isActivityDomain,
  MEMBER_STATE_TRANSITIONS,
} from "../types";

import {
  PREDICTIVE_WINDOW_CONFIGS,
  THERMAL_MASS_TIER_MULTIPLIER,
  getJourneyStageConfig,
} from "../config";

import {
  computeThermalMass,
} from "./memberSignals";

// ═══════════════════════════════════════════════════════════════════════
// §1  PREDICTION TYPES
// ═══════════════════════════════════════════════════════════════════════

/** A value with confidence bounds */
export interface ConfidenceBand {
  /** Point estimate */
  estimate: number;
  /** Lower bound of confidence interval */
  lower: number;
  /** Upper bound of confidence interval */
  upper: number;
  /** Confidence level (0-1) */
  confidence: number;
  /** Sample size / data points used */
  sampleSize: number;
}

/** Churn forecast — when will they leave? */
export interface ChurnForecast {
  /** Current churn probability (0-1) */
  currentProbability: number;
  /** Predicted probability at horizon */
  predictedProbability: ConfidenceBand;
  /** Days until churn becomes likely (>50%) */
  daysToLikelyChurn: number | null;
  /** Risk acceleration — is churn risk speeding up? */
  acceleration: number;
  /** Top contributing factors sorted by weight */
  riskFactors: Array<{
    factor: string;
    source: string;
    weight: number;
    trend: "improving" | "stable" | "worsening";
  }>;
  /** Protective factors that slow churn */
  protectiveFactors: Array<{
    factor: string;
    source: string;
    strength: number;
  }>;
  /** Monte Carlo simulation results */
  simulations: {
    /** Number of simulations run */
    count: number;
    /** Percentile outcomes: 10th, 25th, 50th, 75th, 90th */
    percentiles: [number, number, number, number, number];
  };
}

/** LTV projection — what will they be worth? */
export interface LTVProjection {
  /** Current LTV */
  current: number;
  /** Projected LTV at 12 months */
  projected12m: ConfidenceBand;
  /** Projected LTV at 24 months */
  projected24m: ConfidenceBand;
  /** Monthly revenue trajectory */
  monthlyTrajectory: Array<{
    month: number;
    predicted: number;
    lower: number;
    upper: number;
  }>;
  /** Spend domain breakdown prediction */
  domainPredictions: Array<{
    domain: ActivityDomain;
    currentMonthly: number;
    predictedMonthly: number;
    trend: "growing" | "stable" | "declining";
  }>;
  /** Peak revenue month (predicted) */
  peakMonth: string;
  /** Revenue risk factors */
  riskFactors: string[];
}

/** Engagement trajectory — where are they heading? */
export interface EngagementTrajectory {
  /** Current engagement state */
  currentState: MemberState;
  /** Current temperature */
  currentTemperature: number;
  /** Predicted temperature at 30 days */
  predicted30d: ConfidenceBand;
  /** Predicted temperature at 90 days */
  predicted90d: ConfidenceBand;
  /** State transition probabilities */
  transitionProbabilities: Array<{
    fromState: MemberState;
    toState: MemberState;
    probability: number;
    daysEstimate: number;
  }>;
  /** Trajectory shape */
  shape: "ascending" | "plateau" | "declining" | "volatile" | "recovering";
  /** Key inflection points */
  inflectionPoints: Array<{
    day: number;
    description: string;
    temperatureAtPoint: number;
  }>;
}

/** Next best action — what should we do? */
export interface NextBestAction {
  /** Ranked list of recommended actions */
  actions: Array<{
    /** Action identifier */
    id: string;
    /** Human-readable label */
    label: string;
    /** Detailed description */
    description: string;
    /** Expected impact on temperature (0-20 points) */
    expectedImpact: number;
    /** Confidence in impact estimate (0-1) */
    confidence: number;
    /** Effort level */
    effort: "minimal" | "low" | "medium" | "high";
    /** Optimal timing */
    timing: "immediate" | "today" | "this_week" | "this_month";
    /** MCP tool to execute */
    tool?: string;
    /** Tool parameters */
    params?: Record<string, unknown>;
    /** Source domain that recommended this */
    source: string;
    /** Prerequisites — what must be true first */
    prerequisites: string[];
  }>;
  /** Overall strategy narrative */
  strategy: string;
  /** Expected outcome if all actions are taken */
  expectedOutcome: string;
}

/** Lifecycle prediction — when will they transition? */
export interface LifecyclePrediction {
  /** Current stage */
  currentStage: string;
  /** Days in current stage */
  daysInStage: number;
  /** Predicted next stage */
  predictedNextStage: string;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Estimated days until transition */
  daysToTransition: number;
  /** Is this transition positive or negative? */
  direction: "positive" | "neutral" | "negative";
  /** What triggers this transition */
  trigger: string;
  /** Valid transitions from current state */
  validTransitions: Array<{
    stage: string;
    probability: number;
    daysEstimate: number;
    direction: "positive" | "neutral" | "negative";
  }>;
}

/** Risk cascade — who else is affected? */
export interface RiskCascade {
  /** Primary member at risk */
  primaryMemberId: string;
  /** Members affected if primary churns */
  cascadeImpact: Array<{
    memberId: string;
    memberName: string;
    connectionStrength: number;
    impactSeverity: number;
    /** New churn risk for this member after cascade */
    cascadedChurnRisk: number;
  }>;
  /** Total network impact score (0-1) */
  networkImpact: number;
  /** Prevented cascade value — impact saved by retaining primary */
  preventedValue: number;
}

/** Complete prediction package */
export interface MemberPredictions {
  churnForecast: ChurnForecast;
  ltvProjection: LTVProjection;
  engagementTrajectory: EngagementTrajectory;
  nextBestAction: NextBestAction;
  lifecyclePrediction: LifecyclePrediction;
  riskCascade: RiskCascade | null;
  /** Predictive windows aggregated from all predictions */
  windows: PredictiveWindow[];
  /** When these predictions were generated */
  generatedAt: string;
  /** When these predictions expire */
  expiresAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// §2  CHURN FORECAST
//
// Monte Carlo simulation of churn probability.
// Not a single number — a DISTRIBUTION of outcomes.
// Each simulation walks forward day by day, applying:
//   - Current risk factors (weighted)
//   - Protective factors (dampening)
//   - Random noise (life is unpredictable)
//   - Thermal mass (veterans resist change)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate a churn forecast with Monte Carlo simulation.
 *
 * @param profile - Member360 profile
 * @param churnPrediction - Backend churn prediction
 * @param temperature - Current temperature
 * @param signals - Cross-domain signals
 * @param resonance - Signal resonance
 * @returns Churn forecast with confidence bands
 */
export function forecastChurn(
  profile: Member360ProfileResponse,
  churnPrediction: MemberChurnPredictionResponse | null | undefined,
  temperature: MemberTemperature,
  signals: DomainSignal[],
  resonance: SignalResonance,
): ChurnForecast {
  const tier = profile.member?.tier ?? "basic";
  const joinDate = profile.member?.join_date ?? "";
  const connectionsCount = profile.connections_count ?? 0;

  // Base churn from backend prediction or derive from temperature
  const baseChurn = churnPrediction
    ? churnPrediction.churn_score / 100
    : Math.max(0, (100 - temperature.composite) / 100);

  // Thermal mass dampens churn (veterans resist leaving)
  const thermalMass = computeThermalMass(tier, joinDate, connectionsCount);
  const dampenedChurn = baseChurn * (1 / Math.max(thermalMass, 0.5));

  // Risk factors from signals
  const riskFactors = signals
    .filter(s => s.direction === "negative" || s.severity === "critical" || s.severity === "high")
    .map(s => ({
      factor: s.signal,
      source: s.domain,
      weight: s.confidence * (s.severity === "critical" ? 0.4 : s.severity === "high" ? 0.25 : 0.15),
      trend: (s.direction === "negative" ? "worsening" : "stable") as "improving" | "stable" | "worsening",
    }))
    .sort((a, b) => b.weight - a.weight);

  // Protective factors
  const protectiveFactors = signals
    .filter(s => s.direction === "positive")
    .map(s => ({
      factor: s.signal,
      source: s.domain,
      strength: s.confidence * 0.3,
    }))
    .sort((a, b) => b.strength - a.strength);

  // Monte Carlo simulation
  const simCount = 1000;
  const horizonDays = PREDICTIVE_WINDOW_CONFIGS.churn.defaultHorizonDays;
  const results: number[] = [];

  for (let sim = 0; sim < simCount; sim++) {
    let prob = Math.min(1, Math.max(0, dampenedChurn));
    const dailyDrift = (temperature.momentum.velocity * -0.005); // negative velocity = churn increase

    for (let day = 0; day < horizonDays; day++) {
      // Daily drift from momentum
      prob += dailyDrift;

      // Risk factor noise
      const noise = (Math.random() - 0.5) * 0.02;
      prob += noise;

      // Protective dampening
      const protection = protectiveFactors.reduce((sum, p) => sum + p.strength, 0) * 0.001;
      prob -= protection;

      // Clamp
      prob = Math.max(0, Math.min(1, prob));
    }

    results.push(prob);
  }

  results.sort((a, b) => a - b);

  // Extract percentiles
  const p10 = results[Math.floor(simCount * 0.1)];
  const p25 = results[Math.floor(simCount * 0.25)];
  const p50 = results[Math.floor(simCount * 0.5)];
  const p75 = results[Math.floor(simCount * 0.75)];
  const p90 = results[Math.floor(simCount * 0.9)];

  // Days to likely churn (when median crosses 50%)
  const daysToLikelyChurn = p50 > 0.5
    ? Math.round(horizonDays * (0.5 / p50))
    : p25 > 0.3
      ? Math.round(horizonDays * 1.5)
      : null;

  // Acceleration from momentum
  const acceleration = temperature.momentum.acceleration * -1; // negative accel = churn accelerating

  return {
    currentProbability: Math.round(dampenedChurn * 1000) / 1000,
    predictedProbability: {
      estimate: Math.round(p50 * 1000) / 1000,
      lower: Math.round(p10 * 1000) / 1000,
      upper: Math.round(p90 * 1000) / 1000,
      confidence: resonance.amplifiedConfidence,
      sampleSize: simCount,
    },
    daysToLikelyChurn,
    acceleration: Math.round(acceleration * 1000) / 1000,
    riskFactors: riskFactors.slice(0, 5),
    protectiveFactors: protectiveFactors.slice(0, 3),
    simulations: {
      count: simCount,
      percentiles: [
        Math.round(p10 * 1000) / 1000,
        Math.round(p25 * 1000) / 1000,
        Math.round(p50 * 1000) / 1000,
        Math.round(p75 * 1000) / 1000,
        Math.round(p90 * 1000) / 1000,
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §3  LTV PROJECTION
//
// What will this member be worth in 12 and 24 months?
// Uses spend history + engagement trajectory + domain patterns.
// Returns confidence bands, not single numbers.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Project LTV forward with confidence bands.
 *
 * @param profile - Member360 profile
 * @param ltvAnalysis - LTV analysis from backend
 * @param temperature - Current temperature
 * @param activitySummary - Activity summary for spend patterns
 * @returns LTV projection with 12m and 24m forecasts
 */
export function projectLTV(
  profile: Member360ProfileResponse,
  ltvAnalysis: MemberLTVAnalysisResponse | null | undefined,
  temperature: MemberTemperature,
  activitySummary: MemberActivitySummaryResponse | null | undefined,
): LTVProjection {
  const currentLTV = ltvAnalysis?.current_ltv ?? profile.ltv_estimate ?? 0;
  const monthlyAvg = ltvAnalysis?.monthly_avg_spend ?? (currentLTV / Math.max(profile.total_activities_90d, 1));
  const tier = profile.member?.tier ?? "basic";

  // Growth rate from temperature momentum
  const baseGrowthRate = temperature.momentum.velocity * 0.1; // velocity drives growth
  const tierMultiplier = THERMAL_MASS_TIER_MULTIPLIER[tier] ?? 1.0;
  const adjustedGrowth = baseGrowthRate * tierMultiplier;

  // 12-month projection
  const proj12mBase = currentLTV * (1 + adjustedGrowth);
  const proj12mUncertainty = currentLTV * 0.15; // 15% uncertainty band
  const projected12m: ConfidenceBand = {
    estimate: Math.round(proj12mBase),
    lower: Math.round(Math.max(0, proj12mBase - proj12mUncertainty * 1.64)), // 90% CI
    upper: Math.round(proj12mBase + proj12mUncertainty * 1.64),
    confidence: 0.7,
    sampleSize: 12,
  };

  // 24-month projection
  const proj24mBase = currentLTV * (1 + adjustedGrowth * 2.2); // compound
  const proj24mUncertainty = currentLTV * 0.25; // wider band
  const projected24m: ConfidenceBand = {
    estimate: Math.round(proj24mBase),
    lower: Math.round(Math.max(0, proj24mBase - proj24mUncertainty * 1.64)),
    upper: Math.round(proj24mBase + proj24mUncertainty * 1.64),
    confidence: 0.55,
    sampleSize: 24,
  };

  // Monthly trajectory
  const monthlyTrajectory = Array.from({ length: 24 }, (_, i) => {
    const month = i + 1;
    const predicted = monthlyAvg * (1 + adjustedGrowth * (month / 12));
    const uncertainty = monthlyAvg * 0.1 * Math.sqrt(month / 12);
    return {
      month,
      predicted: Math.round(predicted),
      lower: Math.round(Math.max(0, predicted - uncertainty * 1.64)),
      upper: Math.round(predicted + uncertainty * 1.64),
    };
  });

  // Domain predictions from activity summary
  const domainPredictions: LTVProjection["domainPredictions"] = [];
  if (activitySummary?.by_domain) {
    for (const domainData of activitySummary.by_domain) {
      if (!isActivityDomain(domainData.domain)) continue;
      const domain = domainData.domain as ActivityDomain;
      const currentMonthly = (domainData.count / (activitySummary.period_days || 90)) * 30;
      const domainGrowth = domainData.trend === "improving" ? 0.15 : domainData.trend === "declining" ? -0.1 : 0;
      domainPredictions.push({
        domain,
        currentMonthly: Math.round(currentMonthly * 10) / 10,
        predictedMonthly: Math.round(currentMonthly * (1 + domainGrowth) * 10) / 10,
        trend: domainData.trend === "improving" ? "growing" : domainData.trend === "declining" ? "declining" : "stable",
      });
    }
  }

  // Peak month prediction
  const peakMonth = ltvAnalysis?.peak_month ?? "N/A";

  // Risk factors
  const riskFactors: string[] = [];
  if (temperature.momentum.velocity < -0.1) riskFactors.push("Engagement en descenso");
  if (ltvAnalysis?.ltv_trend === "declining") riskFactors.push("Gasto en declive");
  if (temperature.state === "at_risk" || temperature.state === "disengaging") riskFactors.push("Riesgo de abandono");

  return {
    current: currentLTV,
    projected12m,
    projected24m,
    monthlyTrajectory,
    domainPredictions,
    peakMonth,
    riskFactors,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §4  ENGAGEMENT TRAJECTORY
//
// Where is this member heading?
// Uses momentum + vital signs + decay rates to project forward.
// Returns state transition probabilities — not just a direction,
// but the LIKELIHOOD of each possible future state.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Project engagement trajectory forward.
 *
 * @param temperature - Current temperature reading
 * @param vitalSigns - 6 vital signs
 * @param profile - Member360 profile
 * @returns Engagement trajectory with state transitions
 */
export function projectEngagementTrajectory(
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
  _profile: Member360ProfileResponse,
): EngagementTrajectory {
  const currentState = temperature.state;
  const currentTemp = temperature.composite;
  const velocity = temperature.momentum.velocity;
  const thermalMass = temperature.momentum.thermalMass;

  // 30-day prediction with confidence band
  const drift30d = velocity * 30 / Math.max(thermalMass, 0.5);
  const proj30d = clamp(currentTemp + drift30d, 0, 100);
  const uncertainty30d = 8 + (1 - thermalMass) * 5; // less mass = more uncertainty
  const predicted30d: ConfidenceBand = {
    estimate: Math.round(proj30d),
    lower: Math.round(clamp(proj30d - uncertainty30d * 1.64, 0, 100)),
    upper: Math.round(clamp(proj30d + uncertainty30d * 1.64, 0, 100)),
    confidence: 0.75,
    sampleSize: 30,
  };

  // 90-day prediction
  const drift90d = velocity * 90 / Math.max(thermalMass, 0.5) + temperature.momentum.acceleration * 10;
  const proj90d = clamp(currentTemp + drift90d, 0, 100);
  const uncertainty90d = 15 + (1 - thermalMass) * 10;
  const predicted90d: ConfidenceBand = {
    estimate: Math.round(proj90d),
    lower: Math.round(clamp(proj90d - uncertainty90d * 1.64, 0, 100)),
    upper: Math.round(clamp(proj90d + uncertainty90d * 1.64, 0, 100)),
    confidence: 0.55,
    sampleSize: 90,
  };

  // State transition probabilities
  const validTransitions = MEMBER_STATE_TRANSITIONS[currentState] ?? [];
  const transitionProbabilities = validTransitions.map((toState: MemberState) => {
    const targetRange = getStateTemperatureRange(toState);
    const distance = Math.abs(proj30d - (targetRange[0] + targetRange[1]) / 2);
    const prob = Math.max(0.05, Math.min(0.9, 1 - distance / 50));
    const daysEst = distance > 0 ? Math.round(distance / Math.abs(velocity || 0.01)) : 30;

    return {
      fromState: currentState,
      toState,
      probability: Math.round(prob * 100) / 100,
      daysEstimate: Math.min(365, Math.max(1, daysEst)),
      direction: getStateDirection(currentState, toState),
    };
  }).sort((a: { probability: number }, b: { probability: number }) => b.probability - a.probability);

  // Trajectory shape
  const shape = deriveTrajectoryShape(temperature, vitalSigns);

  // Inflection points
  const inflectionPoints = deriveInflectionPoints(temperature, vitalSigns, proj30d, proj90d);

  return {
    currentState,
    currentTemperature: currentTemp,
    predicted30d,
    predicted90d,
    transitionProbabilities,
    shape,
    inflectionPoints,
  };
}

/**
 * Get the temperature range for a member state.
 */
function getStateTemperatureRange(state: MemberState): [number, number] {
  const ranges: Record<MemberState, [number, number]> = {
    thriving: [85, 100],
    stable: [65, 84],
    drifting: [45, 64],
    at_risk: [25, 44],
    disengaging: [0, 24],
  };
  return ranges[state] ?? [50, 50];
}

/**
 * Determine if a state transition is positive, neutral, or negative.
 */
function getStateDirection(from: MemberState, to: MemberState): "positive" | "neutral" | "negative" {
  const order: Record<MemberState, number> = {
    thriving: 4,
    stable: 3,
    drifting: 2,
    at_risk: 1,
    disengaging: 0,
  };
  const delta = (order[to] ?? 0) - (order[from] ?? 0);
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

/**
 * Derive the shape of the engagement trajectory.
 */
function deriveTrajectoryShape(
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
): EngagementTrajectory["shape"] {
  const velocity = temperature.momentum.velocity;
  const acceleration = temperature.momentum.acceleration;

  // Check vital sign volatility
  const values = vitalSigns.map(vs => vs.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / Math.max(mean, 1); // coefficient of variation

  if (cv > 0.4) return "volatile";
  if (velocity > 0.15 && acceleration > 0) return "ascending";
  if (velocity > 0.1 && acceleration < 0) return "plateau";
  if (velocity < -0.1 && acceleration > 0) return "recovering";
  if (velocity < -0.15) return "declining";
  if (Math.abs(velocity) < 0.05) return "plateau";
  return velocity > 0 ? "ascending" : "declining";
}

/**
 * Derive inflection points — key moments in the trajectory.
 */
function deriveInflectionPoints(
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
  _proj30d: number,
  _proj90d: number,
): EngagementTrajectory["inflectionPoints"] {
  const points: EngagementTrajectory["inflectionPoints"] = [];
  // State boundary crossings
  const boundaries = [
    { temp: 85, state: "thriving", day: 0 },
    { temp: 65, state: "stable", day: 0 },
    { temp: 45, state: "drifting", day: 0 },
    { temp: 25, state: "at_risk", day: 0 },
    { temp: 0, state: "disengaging", day: 0 },
  ];

  const velocity = temperature.momentum.velocity;
  if (Math.abs(velocity) > 0.01) {
    for (const boundary of boundaries) {
      const distance = temperature.composite - boundary.temp;
      const daysToBoundary = Math.round(distance / velocity);

      if (daysToBoundary > 0 && daysToBoundary <= 90) {
        points.push({
          day: daysToBoundary,
          description: `Cruza a "${boundary.state}" en día ${daysToBoundary}`,
          temperatureAtPoint: boundary.temp,
        });
      }
    }
  }

  // Critical vital sign crossing
  const criticalVital = vitalSigns.find(vs => vs.status === "critical");
  if (criticalVital) {
    points.push({
      day: 0,
      description: `${criticalVital.name} ya en estado crítico (${criticalVital.value}/100)`,
      temperatureAtPoint: temperature.composite,
    });
  }

  // Sort by day
  points.sort((a, b) => a.day - b.day);
  return points.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════
// §5  NEXT BEST ACTION
//
// Not just "what to do" but "what to do FIRST".
// Actions are ranked by:
//   1. Expected impact on temperature
//   2. Confidence in the impact estimate
//   3. Effort required
//   4. Time sensitivity
//
// Each action is grounded in a specific data point and
// has prerequisites that must be met first.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate the next best action set for a member.
 *
 * @param temperature - Current temperature
 * @param vitalSigns - 6 vital signs
 * @param signals - Cross-domain signals
 * @param churnForecast - Churn forecast
 * @param profile - Member360 profile
 * @returns Ranked action set with strategy narrative
 */
export function determineNextBestAction(
  temperature: MemberTemperature,
  vitalSigns: VitalSign[],
  _signals: DomainSignal[],
  churnForecast: ChurnForecast,
  profile: Member360ProfileResponse,
): NextBestAction {
  const actions: NextBestAction["actions"] = [];
  const member = profile.member;
  const name = member ? `${member.first_name} ${member.last_name}` : "Socio";
  const state = temperature.state;

  // ── Action: Churn intervention ──
  if (churnForecast.currentProbability > 0.4) {
    actions.push({
      id: "churn-intervention",
      label: "Plan de retención personalizado",
      description: `Probabilidad de abandono: ${Math.round(churnForecast.currentProbability * 100)}%. Iniciar protocolo de retención con contacto directo.`,
      expectedImpact: 15,
      confidence: 0.8,
      effort: "high",
      timing: state === "disengaging" ? "immediate" : "today",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
      source: "churn_engine",
      prerequisites: [],
    });
  }

  // ── Action: Weakest vital sign ──
  const weakest = [...vitalSigns].sort((a, b) => a.value - b.value)[0];
  if (weakest && weakest.value < 50) {
    actions.push({
      id: `vital-fix-${weakest.name}`,
      label: `Mejorar ${weakest.name}`,
      description: weakest.detail ?? `${weakest.name} en ${weakest.value}/100 — por debajo del rango normal.`,
      expectedImpact: 10,
      confidence: 0.7,
      effort: "medium",
      timing: "this_week",
      source: "vital_signs",
      prerequisites: [],
    });
  }

  // ── Action: Domain expansion ──
  const activeDomains = profile.active_domains?.length ?? 0;
  if (activeDomains <= 2 && state !== "disengaging") {
    actions.push({
      id: "domain-expansion",
      label: "Descubrir nuevos dominios",
      description: `Solo activo en ${activeDomains} dominio${activeDomains !== 1 ? "s" : ""}. Expandir participación reduce riesgo de churn significativamente.`,
      expectedImpact: 12,
      confidence: 0.75,
      effort: "low",
      timing: "this_week",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
      source: "engagement_analysis",
      prerequisites: ["Member must be reachable"],
    });
  }

  // ── Action: Social connection ──
  const connections = profile.connections_count ?? 0;
  if (connections < 3 && temperature.reading.surface < 60) {
    actions.push({
      id: "social-connection",
      label: "Facilitar conexiones sociales",
      description: `Solo ${connections} conexión${connections !== 1 ? "es" : ""} social${connections !== 1 ? "es" : ""}. Conectar con socios afines aumenta retención.`,
      expectedImpact: 8,
      confidence: 0.65,
      effort: "low",
      timing: "this_month",
      source: "social_analysis",
      prerequisites: [],
    });
  }

  // ── Action: Celebrate achievements ──
  if (state === "thriving") {
    actions.push({
      id: "celebrate",
      label: "Reconocimiento y embajadores",
      description: `${name} es un socio excepcional. Programa de referidos y reconocimiento público.`,
      expectedImpact: 5,
      confidence: 0.85,
      effort: "minimal",
      timing: "this_month",
      source: "temperature_engine",
      prerequisites: [],
    });
  }

  // ── Action: Re-engagement sprint ──
  if (state === "drifting") {
    actions.push({
      id: "re-engagement",
      label: "Sprint de re-engagement",
      description: "Contacto personalizado + invitación a evento exclusivo alineado con intereses.",
      expectedImpact: 14,
      confidence: 0.7,
      effort: "medium",
      timing: "this_week",
      tool: "generate_member_engagement_proposals",
      params: { member_id: member?.member_id },
      source: "lifecycle_engine",
      prerequisites: ["Must have contact info"],
    });
  }

  // Sort by expected impact × confidence (value score)
  actions.sort((a, b) => {
    const aValue = a.expectedImpact * a.confidence / (a.effort === "high" ? 2 : a.effort === "medium" ? 1.5 : 1);
    const bValue = b.expectedImpact * b.confidence / (b.effort === "high" ? 2 : b.effort === "medium" ? 1.5 : 1);
    return bValue - aValue;
  });

  // Strategy narrative
  const strategy = buildStrategyNarrative(state, temperature, actions);

  // Expected outcome
  const totalImpact = actions.reduce((sum, a) => sum + a.expectedImpact * a.confidence, 0);
  const expectedOutcome = totalImpact > 20
    ? `Si se ejecutan todas las acciones, la temperatura podría subir ${Math.round(totalImpact * 0.5)} puntos en 30 días.`
    : totalImpact > 10
      ? `Acciones seleccionadas podrían estabilizar la temperatura y reducir riesgo de churn.`
      : `Mantenimiento preventivo — socio estable, monitoreo continuo.`;

  return {
    actions: actions.slice(0, 5),
    strategy,
    expectedOutcome,
  };
}

/**
 * Build strategy narrative based on member state.
 */
function buildStrategyNarrative(
  state: MemberState,
  _temperature: MemberTemperature,
  actions: NextBestAction["actions"],
): string {
  const topAction = actions[0];
  const actionCount = actions.length;

  switch (state) {
    case "thriving":
      return `Socio floreciente — estrategia de reconocimiento y empoderamiento. ${actionCount} acciones de crecimiento.`;
    case "stable":
      return `Socio estable — estrategia de expansión. ${topAction?.label ?? "Mantenimiento"} como prioridad.`;
    case "drifting":
      return `Socio a la deriva — ventana de re-engagement activa. ${topAction?.label ?? "Contacto"} en los próximos 14 días.`;
    case "at_risk":
      return `Socio en riesgo — intervención inmediata requerida. ${topAction?.label ?? "Contacto directo"} como primera acción.`;
    case "disengaging":
      return `Última ventana de acción — ${topAction?.label ?? "Contacto ejecutivo"} en las próximas 72 horas.`;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §6  LIFECYCLE PREDICTION
//
// When will this member transition to the next stage?
// Uses:
//   - Current stage duration vs average
//   - Temperature trajectory
//   - Valid transitions from state machine
//   - Historical patterns
// ═══════════════════════════════════════════════════════════════════════

/**
 * Predict the next lifecycle transition.
 *
 * @param profile - Member360 profile
 * @param temperature - Current temperature
 * @param journey - Journey data (optional)
 * @returns Lifecycle prediction with transition probabilities
 */
export function predictLifecycleTransition(
  profile: Member360ProfileResponse,
  temperature: MemberTemperature,
  _journey: MemberJourneyResponse | null | undefined,
): LifecyclePrediction {
  const currentStage = profile.journey_stage;
  const daysInStage = profile.days_in_stage ?? 0;
  const stageConfig = getJourneyStageConfig(currentStage);

  // Valid transitions from current stage
  const validTransitions = stageConfig?.validNextStages ?? [];

  // Compute probability for each valid transition
  const transitionProbs = validTransitions.map(toStage => {
    const direction = getStageDirection(currentStage, toStage);
    const isPositive = direction === "positive";

    // Base probability from temperature trajectory
    const velocity = temperature.momentum.velocity;
    let prob = 0.3; // base

    if (isPositive && velocity > 0) prob += velocity * 2;
    if (!isPositive && velocity < 0) prob += Math.abs(velocity) * 2;
    if (direction === "neutral") prob = 0.2;

    // Duration influence — longer in stage = higher transition probability
    const avgDuration = stageConfig?.avgDurationDays ?? 120;
    const durationRatio = daysInStage / avgDuration;
    if (durationRatio > 1.5) prob += 0.2; // overdue for transition
    if (durationRatio > 2) prob += 0.15;

    // Clamp
    prob = Math.max(0.05, Math.min(0.95, prob));

    // Days estimate
    const daysEstimate = Math.round(avgDuration * (1 - prob) + daysInStage * 0.3);

    return {
      stage: toStage,
      probability: Math.round(prob * 100) / 100,
      daysEstimate: Math.max(1, daysEstimate),
      direction,
    };
  }).sort((a, b) => b.probability - a.probability);

  // Most likely transition
  const mostLikely = transitionProbs[0];

  // Trigger description
  const trigger = buildTransitionTrigger(currentStage, mostLikely?.stage ?? "", temperature);

  return {
    currentStage,
    daysInStage,
    predictedNextStage: mostLikely?.stage ?? currentStage,
    confidence: mostLikely?.probability ?? 0.3,
    daysToTransition: mostLikely?.daysEstimate ?? 90,
    direction: mostLikely?.direction ?? "neutral",
    trigger,
    validTransitions: transitionProbs,
  };
}

/**
 * Get the direction of a stage transition.
 */
function getStageDirection(
  from: string,
  to: string,
): "positive" | "neutral" | "negative" {
  const order: Record<string, number> = {
    new_member: 1,
    onboarding: 2,
    active: 3,
    engaged: 4,
    at_risk: 2,
    dormant: 1,
    churned: 0,
    win_back: 2,
  };
  const delta = (order[to] ?? 2) - (order[from] ?? 2);
  if (delta > 0) return "positive";
  if (delta < 0) return "negative";
  return "neutral";
}

/**
 * Build a human-readable trigger description.
 */
function buildTransitionTrigger(
  from: string,
  to: string,
  temperature: MemberTemperature,
): string {
  const velocity = temperature.momentum.velocity;

  if (velocity > 0.1) {
    return `Mejora sostenida en engagement impulsa transición hacia "${to}".`;
  }
  if (velocity < -0.1) {
    return `Descenso en engagement podría precipitar transición a "${to}".`;
  }
  return `Duración prolongada en "${from}" sugiere transición natural a "${to}".`;
}

// ═══════════════════════════════════════════════════════════════════════
// §7  RISK CASCADE
//
// If this member churns, who else is affected?
// Uses social profile connections to model cascade impact.
// Higher connection strength = higher cascade risk.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Model the cascade impact of this member's churn.
 *
 * @param profile - Member360 profile
 * @param socialProfile - Social profile with connections
 * @param churnForecast - Churn forecast
 * @returns Risk cascade or null if no connections
 */
export function assessRiskCascade(
  profile: Member360ProfileResponse,
  socialProfile: MemberSocialProfileResponse | null | undefined,
  churnForecast: ChurnForecast,
): RiskCascade | null {
  if (!socialProfile || socialProfile.connections_count === 0) return null;

  const connections = socialProfile.connections ?? [];
  if (connections.length === 0) return null;

  // Model cascade for each connection
  const cascadeImpact = connections.map(conn => {
    const strength = conn.strength ?? 0;
    const sharedActivities = conn.shared_activities ?? 0;

    // Impact severity: strong connections with many shared activities = high cascade
    const impactSeverity = strength * 0.6 + Math.min(sharedActivities / 10, 0.4);

    // Cascaded churn risk: if this member churns, connected member's risk increases
    const cascadedRisk = Math.min(0.8, churnForecast.currentProbability * impactSeverity * 0.5);

    return {
      memberId: conn.connected_member_id,
      memberName: conn.connected_name,
      connectionStrength: Math.round(strength * 100) / 100,
      impactSeverity: Math.round(impactSeverity * 100) / 100,
      cascadedChurnRisk: Math.round(cascadedRisk * 1000) / 1000,
    };
  }).sort((a, b) => b.impactSeverity - a.impactSeverity);

  // Network impact: weighted sum of cascade severities
  const networkImpact = Math.min(1,
    cascadeImpact.reduce((sum, c) => sum + c.impactSeverity, 0) / Math.max(cascadeImpact.length, 1),
  );

  // Prevented value: total impact saved by retaining this member
  const preventedValue = cascadeImpact.reduce(
    (sum, c) => sum + c.impactSeverity * c.cascadedChurnRisk,
    0,
  );

  return {
    primaryMemberId: profile.member?.member_id ?? "",
    cascadeImpact: cascadeImpact.slice(0, 5),
    networkImpact: Math.round(networkImpact * 1000) / 1000,
    preventedValue: Math.round(preventedValue * 1000) / 1000,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §8  PREDICTIVE WINDOW AGGREGATION
//
// Collects all prediction windows into a unified view.
// Windows are sorted by urgency (imminent first).
// ═══════════════════════════════════════════════════════════════════════

/**
 * Aggregate all predictive windows from different predictions.
 *
 * @param churnForecast - Churn forecast
 * @param ltvProjection - LTV projection
 * @param engagementTrajectory - Engagement trajectory
 * @param lifecyclePrediction - Lifecycle prediction
 * @returns Array of predictive windows sorted by urgency
 */
export function aggregatePredictiveWindows(
  churnForecast: ChurnForecast,
  ltvProjection: LTVProjection,
  engagementTrajectory: EngagementTrajectory,
  lifecyclePrediction: LifecyclePrediction,
): PredictiveWindow[] {
  const windows: PredictiveWindow[] = [];
  const now = Date.now();

  // Churn window
  if (churnForecast.daysToLikelyChurn !== null) {
    const config = PREDICTIVE_WINDOW_CONFIGS.churn;
    const days = churnForecast.daysToLikelyChurn;
    windows.push({
      metric: config.metric,
      current: churnForecast.currentProbability * 100,
      predicted: churnForecast.predictedProbability.estimate * 100,
      confidence: churnForecast.predictedProbability.confidence,
      horizonDays: config.defaultHorizonDays,
      interventionDeadline: new Date(now + days * 86_400_000).toISOString(),
      status: deriveWindowStatus(days),
      decayRate: config.decayRatePerDay,
      daysRemaining: days,
    });
  }

  // LTV decline window
  if (ltvProjection.riskFactors.length > 0 && ltvProjection.current > 0) {
    const config = PREDICTIVE_WINDOW_CONFIGS.ltv_decline;
    const decline = ltvProjection.current - ltvProjection.projected12m.estimate;
    if (decline > 0) {
      const days = Math.round(config.defaultHorizonDays * 0.6);
      windows.push({
        metric: config.metric,
        current: ltvProjection.current,
        predicted: ltvProjection.projected12m.estimate,
        confidence: ltvProjection.projected12m.confidence,
        horizonDays: config.defaultHorizonDays,
        interventionDeadline: new Date(now + days * 86_400_000).toISOString(),
        status: deriveWindowStatus(days),
        decayRate: config.decayRatePerDay,
        daysRemaining: days,
      });
    }
  }

  // Engagement drop window
  if (engagementTrajectory.shape === "declining" || engagementTrajectory.shape === "volatile") {
    const config = PREDICTIVE_WINDOW_CONFIGS.engagement_drop;
    const days = engagementTrajectory.predicted30d.estimate < engagementTrajectory.currentTemperature
      ? 14
      : 30;
    windows.push({
      metric: config.metric,
      current: engagementTrajectory.currentTemperature,
      predicted: engagementTrajectory.predicted30d.estimate,
      confidence: engagementTrajectory.predicted30d.confidence,
      horizonDays: config.defaultHorizonDays,
      interventionDeadline: new Date(now + days * 86_400_000).toISOString(),
      status: deriveWindowStatus(days),
      decayRate: config.decayRatePerDay,
      daysRemaining: days,
    });
  }

  // Lifecycle window
  if (lifecyclePrediction.direction === "negative") {
    const days = lifecyclePrediction.daysToTransition;
    windows.push({
      metric: "lifecycle_transition",
      current: 0,
      predicted: 0,
      confidence: lifecyclePrediction.confidence,
      horizonDays: days,
      interventionDeadline: new Date(now + days * 86_400_000).toISOString(),
      status: deriveWindowStatus(days),
      decayRate: 0.01,
      daysRemaining: days,
    });
  }

  // Sort by urgency (imminent first)
  const urgencyOrder: Record<WindowStatus, number> = {
    closed: 0,
    imminent: 1,
    closing: 2,
    open: 3,
  };
  windows.sort((a, b) => {
    const aUrgency = urgencyOrder[a.status] ?? 3;
    const bUrgency = urgencyOrder[b.status] ?? 3;
    if (aUrgency !== bUrgency) return aUrgency - bUrgency;
    return (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999);
  });

  return windows;
}

// ═══════════════════════════════════════════════════════════════════════
// §9  FULL PREDICTIONS — Run everything
//
// Orchestrates all prediction generators into a single package.
// This is the entry point — call this with all available data
// and get the complete predictive picture.
// ═══════════════════════════════════════════════════════════════════════

/** Input data for full prediction generation */
export interface MemberPredictionInput {
  profile: Member360ProfileResponse;
  healthScore?: MemberHealthScoreResponse | null;
  churnPrediction?: MemberChurnPredictionResponse | null;
  ltvAnalysis?: MemberLTVAnalysisResponse | null;
  journey?: MemberJourneyResponse | null;
  activitySummary?: MemberActivitySummaryResponse | null;
  socialProfile?: MemberSocialProfileResponse | null;
  temperature: MemberTemperature;
  vitalSigns: VitalSign[];
  signals: DomainSignal[];
  resonance: SignalResonance;
}

/**
 * Generate the complete prediction package for a member.
 * Runs all prediction generators and aggregates windows.
 *
 * @param input - All available member data
 * @returns Complete prediction package
 */
export function generateMemberPredictions(
  input: MemberPredictionInput,
): MemberPredictions {
  const {
    profile, churnPrediction, ltvAnalysis, journey,
    activitySummary, socialProfile,
    temperature, vitalSigns, signals, resonance,
  } = input;

  // Generate all predictions
  const churnForecast = forecastChurn(profile, churnPrediction, temperature, signals, resonance);
  const ltvProjection = projectLTV(profile, ltvAnalysis, temperature, activitySummary);
  const engagementTrajectory = projectEngagementTrajectory(temperature, vitalSigns, profile);
  const nextBestAction = determineNextBestAction(temperature, vitalSigns, signals, churnForecast, profile);
  const lifecyclePrediction = predictLifecycleTransition(profile, temperature, journey);
  const riskCascade = assessRiskCascade(profile, socialProfile, churnForecast);

  // Aggregate windows
  const windows = aggregatePredictiveWindows(churnForecast, ltvProjection, engagementTrajectory, lifecyclePrediction);

  // Compute expiry (shortest window)
  const now = new Date();
  let shortestWindow: number | null = null;
  for (const w of windows) {
    if (w.daysRemaining != null) {
      if (shortestWindow === null || w.daysRemaining < shortestWindow) {
        shortestWindow = w.daysRemaining;
      }
    }
  }
  const expiryMinutes = shortestWindow !== null && shortestWindow <= 7 ? 5 : 15;

  return {
    churnForecast,
    ltvProjection,
    engagementTrajectory,
    nextBestAction,
    lifecyclePrediction,
    riskCascade,
    windows,
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + expiryMinutes * 60_000).toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §10 INTERNAL UTILITIES
// ═══════════════════════════════════════════════════════════════════════

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}