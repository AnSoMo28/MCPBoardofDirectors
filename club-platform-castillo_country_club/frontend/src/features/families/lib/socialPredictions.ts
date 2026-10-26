// ═══════════════════════════════════════════════════════════
// src/features/families/lib/socialPredictions.ts
// Phase 34+ Migration — Social Predictions (§13 Integrated)
// Level 6+ Agency · Production Grade · 2027 Intelligence
//
// Predictive intelligence for social networks.
// Pure functions. No React, no DOM.
//
// PRE-WRITE VERIFICATION:
//   TOPOLOGY_THRESHOLDS → ../config.ts §28      ✅
//   TopologyGraph       → ./socialTopology.ts §1 ✅
//   TopologyAnalysis    → ./socialTopology.ts §1 ✅
//   StrengthSample      → ./socialTopology.ts §1 ✅
//   buildAdjacency      → ./socialTopology.ts §2 ✅
//   getEdge             → ./socialTopology.ts §2 ✅
//
// §13 ALGORITHMS INTEGRATED:
//   A4 — Decay prediction: Holt's EWMA (level + trend) with
//        confidence interval from residual variance.
//        Falls back to linear regression when data < MIN_POINTS.
//   A5 — Optimal introductions: Network-aware impact scoring.
//        Simulates edge addition, measures topology improvement
//        (triangles formed, path improvements, isolation reduction).
//   A6 — Churn risk: Resilience scoring with quality-weighted
//        connections (strength² entropy), community diversity,
//        recency decay, and velocity bonus/penalty.
//
// ANTI-PATTERNS REMOVED:
//   - TopoEdge/TopoNode imported but unused → removed
//   - CentralityResult/Community/IsolationState imported but unused → removed
//   - { date: string; value: number }[] → StrengthSample
//   - Manual adjacency → buildAdjacency + getEdge
//   - DecayAlert[][] → DecayAlert[] direct push
//   - Linear regression → EWMA with trend (Holt's method)
//   - Pairwise interest matching → network-aware impact scoring
//   - Linear factor summation → resilience scoring
//   - Mutable → readonly
//   - THRESH alias → TOPOLOGY_THRESHOLDS direct
//   - No § markers → 7 sections
//   - No JSDoc → all public exports documented
// ═══════════════════════════════════════════════════════════

import type {
  TopologyGraph,
  TopologyAnalysis,
  StrengthSample,
} from "./socialTopology";

import { buildAdjacency, getEdge } from "./socialTopology";

import { TOPOLOGY_THRESHOLDS } from "../config";

// ═══════════════════════════════════════════════════════════
// §1  Constants (local — move to config.ts §31)
// ═══════════════════════════════════════════════════════════

/** EWMA smoothing factor. λ=0.2 → half-life ~3 months of monthly data */
const EWMA_LAMBDA = 0.2;

/** EWMA trend smoothing. Lower = smoother trend */
const EWMA_TREND_BETA = 0.1;

/** Minimum data points for EWMA (otherwise falls back to linear) */
const EWMA_MIN_POINTS = 3;
/** Minimum data points for seasonal pattern detection */
const SEASONAL_MIN_POINTS = 12;
/** Strength exponent for quality weighting (higher = more quality-sensitive) */
const RESILIENCE_STRENGTH_EXP = 2;

// ═══════════════════════════════════════════════════════════
// §2  Types
// ═══════════════════════════════════════════════════════════

/** Alert for a bond predicted to decay below critical threshold */
export interface DecayAlert {
  readonly edgeId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly sourceName: string;
  readonly targetName: string;
  readonly currentStrength: number;
  readonly predictedStrength: number;
  readonly daysToCritical: number;
  readonly decayRate: number;
  readonly severity: "warning" | "critical";
  // §13 A4 additions
  /** 0-1 confidence in this prediction */
  readonly confidence: number;
  /** Which prediction method was used */
  readonly method: "ewma" | "linear" | "insufficient_data";
  /** Seasonal adjustment factor (1.0 = no adjustment) */
  readonly seasonalFactor: number;
  /** Days until intervention effectiveness drops significantly */
  readonly interventionWindow: number;
}

/** Suggested introduction between two unconnected families */
export interface OptimalIntroduction {
  readonly familyA: string;
  readonly familyAName: string;
  readonly familyB: string;
  readonly familyBName: string;
  readonly reason: string;
  readonly impactScore: number;
  readonly communitiesConnected: readonly string[];
  readonly suggestedContext: string;
  readonly sharedInterests: readonly string[];
  // §13 A5 additions
  /** 0-1 global topology improvement if this introduction happens */
  readonly networkImpactScore: number;
  /** Families that benefit indirectly from this introduction */
  readonly indirectBeneficiaries: readonly string[];
  /** Human-readable explanation of topology improvement */
  readonly topologyImprovement: string;
}

/** Impact of a hypothetical event on the social network */
export interface EventImpact {
  readonly eventName: string;
  readonly strengthenedFamilies: readonly Readonly<{
    id: string;
    name: string;
    predictedDelta: number;
  }>[];
  readonly improvedEdges: readonly Readonly<{
    from: string;
    to: string;
    currentStrength: number;
    predictedDelta: number;
  }>[];
  readonly healthDelta: number;
  readonly urgency: "immediate" | "this_month" | "next_quarter";
}

/** Social-network-based churn risk for a single family */
export interface ChurnSocialRisk {
  readonly familyId: string;
  readonly familyName: string;
  readonly riskScore: number;
  readonly factors: readonly Readonly<{ factor: string; weight: number }>[];
  readonly cascadeImpact: readonly Readonly<{
    affectedId: string;
    affectedName: string;
    impactSeverity: number;
  }>[];
  readonly intervention: string;
  // §13 A6 additions
  /** 0-1 resilience score (higher = more resilient to churn) */
  readonly resilienceScore: number;
  /** Qualitative assessment of connection quality */
  readonly connectionQuality: "strong" | "mixed" | "weak" | "critical";
}

/** Opportunity for a family to expand into new communities */
export interface GrowthOpportunity {
  readonly familyId: string;
  readonly familyName: string;
  readonly targetCommunities: readonly Readonly<{
    id: string;
    name: string;
    currentGap: number;
  }>[];
  readonly integrationDifficulty: "easy" | "moderate" | "hard";
  readonly fitReason: string;
  readonly suggestedFirstStep: string;
}

/** Complete social predictions output */
export interface SocialPredictions {
  readonly decayAlerts: readonly DecayAlert[];
  readonly optimalIntroductions: readonly OptimalIntroduction[];
  readonly eventImpact: EventImpact | null;
  readonly churnRisks: readonly ChurnSocialRisk[];
  readonly growthOpportunities: readonly GrowthOpportunity[];
}

// ═══════════════════════════════════════════════════════════
// §3  A4 — EWMA Decay Prediction
// ═══════════════════════════════════════════════════════════

/** Result of EWMA decay analysis on a single bond */
interface EWMAResult {
  readonly level: number;
  readonly trend: number;
  readonly residualStdErr: number;
  readonly dataPoints: number;
  readonly method: "ewma" | "linear";
}

/**
 * Compute Holt's EWMA (double exponential smoothing) on strength history.
 * Decomposes into level + trend, enabling directional forecasting.
 *
 * Level:  L_t = λ·x_t + (1-λ)·(L_{t-1} + T_{t-1})
 * Trend:  T_t = β·(L_t - L_{t-1}) + (1-β)·T_{t-1}
 * Forecast: F_{t+k} = L_t + k·T_t
 *
 * @param history - Strength samples, oldest first
 * @param lambda - Smoothing factor (0-1, higher = more reactive)
 * @param beta - Trend smoothing (0-1, higher = more reactive trend)
 */
function computeEWMA(
  history: readonly StrengthSample[],
  lambda = EWMA_LAMBDA,
  beta = EWMA_TREND_BETA,
): EWMAResult {
  if (history.length < EWMA_MIN_POINTS) {
    // Fall back to simple linear regression
    const slope = computeLinearSlope(history);
    return {
      level: history[history.length - 1]?.value ?? 0,
      trend: slope,
      residualStdErr: 0.3, // High uncertainty
      dataPoints: history.length,
      method: "linear",
    };
  }

  // Initialize: level = first value, trend = average of first differences
  let level = history[0].value;
  let trend = 0;
  const residuals: number[] = [];

  if (history.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < history.length; i++) {
      diffs.push(history[i].value - history[i - 1].value);
    }
    trend = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  }

  // Iterate through history
  for (let i = 1; i < history.length; i++) {
    const x = history[i].value;
    const forecast = level + trend;
    const residual = x - forecast;
    residuals.push(residual);

    const prevLevel = level;
    level = lambda * x + (1 - lambda) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Residual standard error (confidence proxy)
  const residualStdErr =
    residuals.length > 0
      ? Math.sqrt(
          residuals.reduce((s, r) => s + r * r, 0) / residuals.length,
        )
      : 0.3;

  return { level, trend, residualStdErr, dataPoints: history.length, method: "ewma" };
}

/**
 * Simple linear regression slope — fallback when data is insufficient for EWMA.
 */
function computeLinearSlope(history: readonly StrengthSample[]): number {
  if (history.length < 2) return 0;
  const n = history.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += history[i].value;
    sumXY += i * history[i].value;
    sumX2 += i * i;
  }
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

/**
 * Compute confidence from data quality.
 * High confidence = low residuals + many data points.
 */
function computeConfidence(
  residualStdErr: number,
  meanStrength: number,
  dataPoints: number,
): number {
  // Model fit: how small are residuals relative to signal?
  const fitScore =
    meanStrength > 0
      ? Math.max(0, 1 - residualStdErr / meanStrength)
      : 0.5;

  // Data depth: more points = more confidence, saturating at ~12
  const depthScore = Math.min(1, dataPoints / 12);

  return Math.max(0, Math.min(1, fitScore * 0.6 + depthScore * 0.4));
}

/**
 * Detect seasonal pattern from monthly averages.
 * Returns adjustment factor for current month.
 * 1.0 = no adjustment. >1 = historically stronger month.
 */
function computeSeasonalFactor(
  history: readonly StrengthSample[],
): number {
  if (history.length < SEASONAL_MIN_POINTS) return 1.0;

  // Group by month, compute average strength per month
  const monthTotals = new Map<number, { sum: number; count: number }>();
  let globalSum = 0;
  let globalCount = 0;

  for (const sample of history) {
    const month = new Date(sample.date).getMonth(); // 0-11
    if (isNaN(month)) continue;
    const existing = monthTotals.get(month) ?? { sum: 0, count: 0 };
    monthTotals.set(month, {
      sum: existing.sum + sample.value,
      count: existing.count + 1,
    });
    globalSum += sample.value;
    globalCount++;
  }

  if (globalCount === 0) return 1.0;

  const globalAvg = globalSum / globalCount;
  const currentMonth = new Date().getMonth();
  const monthData = monthTotals.get(currentMonth);

  if (!monthData || monthData.count === 0) return 1.0;

  const monthAvg = monthData.sum / monthData.count;
  // Factor: how this month compares to average
  return globalAvg > 0 ? monthAvg / globalAvg : 1.0;
}

/**
 * Estimate days until intervention effectiveness drops.
 * Based on the decay acceleration — faster decay = shorter window.
 */
function computeInterventionWindow(
  currentStrength: number,
  trend: number,
  _daysToCritical: number,
): number {
  if (trend >= 0) return 180; // Not decaying — wide window

  // Intervention is most effective while the bond is still meaningful (>0.2)
  const strengthAboveThreshold = currentStrength - 0.2;
  const decayPerDay = Math.abs(trend) / 30; // approximate

  if (decayPerDay <= 0) return 180;

  // Days until strength drops below 0.2 (where intervention becomes harder)
  const daysToThreshold = Math.max(0, strengthAboveThreshold / decayPerDay);

  // Intervention window is ~60% of time to threshold
  return Math.min(180, Math.max(7, Math.round(daysToThreshold * 0.6)));
}

// ═══════════════════════════════════════════════════════════
// §4  A5 — Network-Aware Impact Scoring
// ═══════════════════════════════════════════════════════════

/**
 * Score the network-level impact of adding edge A↔B.
 *
 * Measures 4 dimensions:
 *   1. Triangles formed (clustering improvement)
 *   2. Path improvements (shorter paths for other nodes)
 *   3. Community bridging (cross-community connection)
 *   4. Isolation reduction (helps isolated nodes)
 *
 * @returns 0-1 network impact score + list of indirect beneficiaries
 */
function scoreNetworkImpact(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
  familyAId: string,
  familyBId: string,
): { score: number; beneficiaries: string[]; improvement: string } {
  const adj = buildAdjacency(graph);

  // 1. Triangles formed: common neighbors of A and B
  const aNeighbors = new Set(
    (adj.neighbors.get(familyAId) ?? []).map((n) => n.targetId),
  );
  const bNeighbors = new Set(
    (adj.neighbors.get(familyBId) ?? []).map((n) => n.targetId),
  );
  const commonNeighbors = [...aNeighbors].filter((id) =>
    bNeighbors.has(id),
  );
  const trianglesFormed = commonNeighbors.length;

  // 2. Path improvements: nodes that get shorter paths through A↔B
  const aFriendsOfFriends = new Set<string>();
  for (const nId of aNeighbors) {
    for (const edge of graph.edges) {
      const other =
        edge.source === nId
          ? edge.target
          : edge.target === nId
            ? edge.source
            : null;
      if (other && other !== familyAId && !aNeighbors.has(other)) {
        aFriendsOfFriends.add(other);
      }
    }
  }

  const bReachable = new Set([...bNeighbors]);
  // Nodes reachable from B in 1 hop that A can now reach in 2 hops
  const pathImprovements = [...aFriendsOfFriends].filter((id) =>
    bReachable.has(id),
  );

  // Indirect beneficiaries: nodes that get better connectivity
  const beneficiaries = new Set<string>();
  for (const id of pathImprovements) {
    beneficiaries.add(id);
  }
  for (const id of commonNeighbors) {
    beneficiaries.add(id); // Triangle closure benefits them
  }

  // 3. Community bridge value
  const aCommunities = analysis.communities.filter((c) =>
    c.nodeIds.includes(familyAId),
  );
  const bCommunities = analysis.communities.filter((c) =>
    c.nodeIds.includes(familyBId),
  );
  const crossCommunity = !aCommunities.some((ac) =>
    bCommunities.some((bc) => bc.id === ac.id),
  );
  const bridgeValue = crossCommunity ? 1 : 0;

  // 4. Isolation reduction
  const aIsolation = analysis.isolations.get(familyAId)?.score ?? 0.5;
  const bIsolation = analysis.isolations.get(familyBId)?.score ?? 0.5;
  const isolationReduction = (aIsolation + bIsolation) / 2;

  // Composite score (normalized)
  const triangleScore = Math.min(1, trianglesFormed / 5);
  const pathScore = Math.min(1, pathImprovements.length / 8);

  const score = Math.min(
    1,
    0.3 * triangleScore +
      0.25 * pathScore +
      0.25 * bridgeValue +
      0.2 * isolationReduction,
  );

  // Build improvement description
  const parts: string[] = [];
  if (trianglesFormed > 0)
    parts.push(
      `forma ${trianglesFormed} triángulo${trianglesFormed > 1 ? "s" : ""} social${trianglesFormed > 1 ? "es" : ""}`,
    );
  if (pathImprovements.length > 0)
    parts.push(
      `reduce distancias para ${pathImprovements.length} familias`,
    );
  if (crossCommunity)
    parts.push("conecta comunidades separadas");
  if (isolationReduction > 0.5)
    parts.push("reduce aislamiento significativamente");

  const improvement =
    parts.length > 0
      ? parts.join(". ") + "."
      : "Impacto marginal en la topología.";

  return {
    score,
    beneficiaries: [...beneficiaries],
    improvement,
  };
}

// ═══════════════════════════════════════════════════════════
// §5  A6 — Resilience Scoring
// ═══════════════════════════════════════════════════════════

/** Result of resilience analysis for a single family */
interface ResilienceResult {
  readonly score: number;
  readonly quality: "strong" | "mixed" | "weak" | "critical";
}

/**
 * Compute resilience score for a family — how well they can
 * withstand the loss of any single connection.
 *
 * Uses quality-weighted approach instead of linear factor summation:
 *   - Effective strength: sum(strength²) favors few strong > many weak
 *   - Diversity: connections across multiple communities
 *   - Recency: recent interactions weighted more
 *   - Velocity: improving connections add resilience
 *
 * @param nodeId - The family to assess
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @param adj - Pre-built adjacency
 */
function computeResilience(
  nodeId: string,
  _graph: TopologyGraph,
  analysis: TopologyAnalysis,
  adj: ReturnType<typeof buildAdjacency>,
): ResilienceResult {
  const edges = (adj.neighbors.get(nodeId) ?? []).map((n) => n.edge);
  const isolation = analysis.isolations.get(nodeId);
  const velocity = analysis.velocities.get(nodeId);

  if (edges.length === 0) {
    return { score: 0.1, quality: "critical" };
  }

  // 1. Quality-weighted effective strength
  // sum(strength²) / sum(strength): favors concentrated strength
  const sumStrength = edges.reduce((s, e) => s + e.strength, 0);
  const sumStrengthSq = edges.reduce(
    (s, e) => s + e.strength ** RESILIENCE_STRENGTH_EXP,
    0,
  );
  const effectiveQuality =
    sumStrength > 0 ? sumStrengthSq / sumStrength : 0;

  // 2. Community diversity: fraction of communities this family touches
  const connectedNodeIds = edges.map((e) =>
    e.source === nodeId ? e.target : e.source,
  );
  const connectedCommunities = new Set<string>();
  for (const nId of connectedNodeIds) {
    for (const community of analysis.communities) {
      if (community.nodeIds.includes(nId)) {
        connectedCommunities.add(community.id);
      }
    }
  }
  // Also check if this node itself is in any community
  for (const community of analysis.communities) {
    if (community.nodeIds.includes(nodeId)) {
      connectedCommunities.add(community.id);
    }
  }
  const totalCommunities = Math.max(analysis.communities.length, 1);
  const diversityScore = connectedCommunities.size / totalCommunities;

  // 3. Recency: decay-weighted interaction recency
  const now = Date.now();
  let recencyScore = 0;
  let recencyCount = 0;
  for (const edge of edges) {
    if (edge.lastInteraction) {
      const days = Math.floor(
        (now - new Date(edge.lastInteraction).getTime()) / 86_400_000,
      );
      if (!isNaN(days)) {
        // Exponential decay: recent = 1, 90 days = 0.5, 180 days = 0.25
        recencyScore += Math.pow(2, -days / 90);
        recencyCount++;
      }
    }
  }
  const avgRecency =
    recencyCount > 0 ? recencyScore / recencyCount : 0.3;

  // 4. Velocity bonus/penalty
  const velocityValue = velocity?.delta30d ?? 0;
  const velocityBonus =
    velocityValue > 0.05
      ? 0.1
      : velocityValue < -0.05
        ? -0.1
        : 0;

  // 5. Isolation penalty (inverse of isolation)
  const isolationPenalty = isolation ? isolation.score * 0.15 : 0;

  // Composite resilience
  const rawScore =
    effectiveQuality * 0.3 +
    diversityScore * 0.25 +
    avgRecency * 0.25 +
    0.2 * (1 - (isolation?.score ?? 0.5)) +
    velocityBonus -
    isolationPenalty;

  const score = Math.max(0, Math.min(1, rawScore));

  const quality: ResilienceResult["quality"] =
    score >= 0.7
      ? "strong"
      : score >= 0.45
        ? "mixed"
        : score >= 0.25
          ? "weak"
          : "critical";

  return { score, quality };
}

// ═══════════════════════════════════════════════════════════
// §6  Decay Alerts (A4-integrated)
// ═══════════════════════════════════════════════════════════

/**
 * Predict which bonds are decaying toward critical threshold.
 *
 * §13 A4: Uses Holt's EWMA (level + trend) when data allows,
 * falls back to linear regression. Includes confidence interval,
 * seasonal adjustment, and intervention window.
 *
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @returns Alerts sorted by daysToCritical (most urgent first)
 */
export function predictDecayAlerts(
  graph: TopologyGraph,
  _analysis: TopologyAnalysis,
): readonly DecayAlert[] {
  const alerts: DecayAlert[] = [];

  for (const edge of graph.edges) {
    const history = edge.strengthHistory ?? [];
    if (history.length < 2) continue;

    // §13 A4: EWMA with trend
    const ewma = computeEWMA(history);
    const currentStrength = edge.strength;

    // Only alert on decaying bonds
    if (ewma.trend >= 0) continue;

    // Forecast: next period strength
    const predictedStrength = Math.max(
      0,
      ewma.level + ewma.trend,
    );

    // Days to critical threshold
    const decayPerDay = Math.abs(ewma.trend) / 30; // approximate
    const daysToCritical =
      decayPerDay > 0
        ? Math.max(
            0,
            Math.floor(
              (currentStrength - TOPOLOGY_THRESHOLDS.edgeCritical) /
                decayPerDay,
            ),
          )
        : 999;

    if (daysToCritical > TOPOLOGY_THRESHOLDS.decayPredictionDays) continue;

    // §13 A4: Confidence from residual analysis
    const meanStrength =
      history.reduce((s, h) => s + h.value, 0) / history.length;
    const confidence = computeConfidence(
      ewma.residualStdErr,
      meanStrength,
      ewma.dataPoints,
    );

    // §13 A4: Seasonal adjustment
    const seasonalFactor = computeSeasonalFactor(history);

    // §13 A4: Intervention window
    const interventionWindow = computeInterventionWindow(
      currentStrength,
      ewma.trend,
      daysToCritical,
    );

    const severity: DecayAlert["severity"] =
      daysToCritical <= 30 ? "critical" : "warning";

    const sourceNode = graph.nodes.find((n) => n.id === edge.source);
    const targetNode = graph.nodes.find((n) => n.id === edge.target);

    alerts.push({
      edgeId: `${edge.source}::${edge.target}`,
      sourceId: edge.source,
      targetId: edge.target,
      sourceName: sourceNode?.label ?? edge.source,
      targetName: targetNode?.label ?? edge.target,
      currentStrength,
      predictedStrength,
      daysToCritical: Math.min(daysToCritical, 999),
      decayRate: ewma.trend,
      severity,
      confidence,
      method: ewma.method,
      seasonalFactor,
      interventionWindow,
    });
  }

  return [...alerts].sort((a, b) => a.daysToCritical - b.daysToCritical);
}

// ═══════════════════════════════════════════════════════════
// §7  Optimal Introductions (A5-integrated)
// ═══════════════════════════════════════════════════════════

/**
 * Find the best families to introduce to each other.
 *
 * §13 A5: Network-aware impact scoring. Instead of just checking
 * shared interests, simulates the edge addition and measures:
 *   - Triangles formed (clustering improvement)
 *   - Path improvements (shorter paths for other nodes)
 *   - Community bridging (cross-community value)
 *   - Isolation reduction (helps isolated nodes)
 *
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @param maxResults - Maximum introductions to return
 * @returns Introductions sorted by impactScore (highest first)
 */
export function findOptimalIntroductions(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
  maxResults = 3,
): readonly OptimalIntroduction[] {
  const adj = buildAdjacency(graph);
  const candidates: OptimalIntroduction[] = [];

  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const a = graph.nodes[i];
      const b = graph.nodes[j];

      // Skip if already connected
      if (getEdge(adj, a.id, b.id)) continue;
      // Skip center node
      if (a.id === graph.centerId || b.id === graph.centerId) continue;

      // Find communities
      const aCommunities = analysis.communities.filter((c) =>
        c.nodeIds.includes(a.id),
      );
      const bCommunities = analysis.communities.filter((c) =>
        c.nodeIds.includes(b.id),
      );

      // Only suggest if they bridge different communities
      const bridgesDifferent =
        aCommunities.length > 0 &&
        bCommunities.length > 0 &&
        !aCommunities.some((ac) =>
          bCommunities.some((bc) => bc.id === ac.id),
        );

      if (!bridgesDifferent) continue;

      // Find mutual connections via adjacency
      const aNeighborIds = new Set(
        (adj.neighbors.get(a.id) ?? []).map((n) => n.targetId),
      );
      const bNeighborIds = new Set(
        (adj.neighbors.get(b.id) ?? []).map((n) => n.targetId),
      );
      const mutualIds = [...aNeighborIds].filter((id) =>
        bNeighborIds.has(id),
      );

      // Collect shared interests from mutual connections' edges
      const sharedInterests = new Set<string>();
      for (const mutualId of mutualIds) {
        const aEdge = getEdge(adj, a.id, mutualId);
        const bEdge = getEdge(adj, b.id, mutualId);
        for (const act of aEdge?.sharedActivities ?? [])
          sharedInterests.add(act);
        for (const act of bEdge?.sharedActivities ?? [])
          sharedInterests.add(act);
      }

      // §13 A5: Network-aware impact scoring
      const networkImpact = scoreNetworkImpact(
        graph,
        analysis,
        a.id,
        b.id,
      );

      // Traditional impact score (interest-based, kept for backward compat)
      const communityGap = 1 / (mutualIds.length + 1);
      const impactScore = Math.min(
        1,
        0.3 + communityGap * 0.4 + sharedInterests.size * 0.1,
      );

      // Suggest context
      let suggestedContext = "Evento social general";
      if (sharedInterests.has("tenis") || sharedInterests.has("pádel"))
        suggestedContext = "Torneo de pádel";
      else if (
        sharedInterests.has("vino") ||
        sharedInterests.has("gastronomía")
      )
        suggestedContext = "Cena de maridaje";
      else if (sharedInterests.has("natación"))
        suggestedContext = "Clase de natación familiar";

      candidates.push({
        familyA: a.id,
        familyAName: a.label,
        familyB: b.id,
        familyBName: b.label,
        reason:
          mutualIds.length > 0
            ? `Tienen ${mutualIds.length} amigo${mutualIds.length > 1 ? "s" : ""} en común`
            : "Conectaría comunidades separadas",
        impactScore,
        communitiesConnected: [
          ...aCommunities.map((c) => c.name || c.id),
          ...bCommunities.map((c) => c.name || c.id),
        ],
        suggestedContext,
        sharedInterests: [...sharedInterests].slice(0, 3),
        // §13 A5 additions
        networkImpactScore: networkImpact.score,
        indirectBeneficiaries: networkImpact.beneficiaries,
        topologyImprovement: networkImpact.improvement,
      });
    }
  }

  // Sort by composite: traditional impact × network impact
  return [...candidates]
    .sort(
      (a, b) =>
        b.impactScore * b.networkImpactScore -
        a.impactScore * a.networkImpactScore,
    )
    .slice(0, maxResults);
}

// ═══════════════════════════════════════════════════════════
// §8  Churn Risk (A6-integrated)
// ═══════════════════════════════════════════════════════════

/**
 * Assess social-network-based churn risk for each family.
 *
 * §13 A6: Resilience scoring replaces linear factor summation.
 * Uses quality-weighted effective strength (few strong > many weak),
 * community diversity, recency decay, and velocity trends.
 *
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 * @returns Risks sorted by riskScore (highest first), only >= 0.3
 */
export function assessChurnRisks(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
): readonly ChurnSocialRisk[] {
  const adj = buildAdjacency(graph);
  const risks: ChurnSocialRisk[] = [];

  for (const node of graph.nodes) {
    if (node.id === graph.centerId) continue;

    const isolation = analysis.isolations.get(node.id);
    const velocity = analysis.velocities.get(node.id);
    const centrality = analysis.centralities.get(node.id);

    if (!isolation || !velocity || !centrality) continue;

    // §13 A6: Compute resilience
    const resilience = computeResilience(
      node.id,
      graph,
      analysis,
      adj,
    );

    // Risk factors (for narrative — kept from original)
    const factors: Array<{ factor: string; weight: number }> = [];

    if (isolation.score > TOPOLOGY_THRESHOLDS.isolationHigh) {
      factors.push({
        factor: "Aislamiento social alto",
        weight: 0.3,
      });
    }
    if (isolation.trend === "worsening") {
      factors.push({
        factor: "Tendencia de aislamiento creciente",
        weight: 0.2,
      });
    }
    if (
      velocity.trend === "decelerating" ||
      velocity.trend === "reversing"
    ) {
      factors.push({
        factor: "Desaceleración en actividad social",
        weight: 0.2,
      });
    }
    if (centrality.score < 0.1) {
      factors.push({
        factor: "Baja centralidad en la red",
        weight: 0.15,
      });
    }
    if (isolation.daysSinceLastInteraction > 45) {
      factors.push({
        factor: `${isolation.daysSinceLastInteraction} días sin interacción`,
        weight: 0.15,
      });
    }

    // §13 A6: Risk is inverse of resilience
    // High resilience → low risk, regardless of individual factors
    const factorRisk = Math.min(
      1,
      factors.reduce((sum, f) => sum + f.weight, 0),
    );
    const riskScore = Math.min(
      1,
      factorRisk * (1 - resilience.score * 0.5),
    );

    if (riskScore < 0.3) continue; // Not at significant risk

    // Cascade impact
    const nodeEdges = graph.edges.filter(
      (e) => e.source === node.id || e.target === node.id,
    );

    const cascadeImpact = nodeEdges
      .map((edge) => {
        const otherId =
          edge.source === node.id ? edge.target : edge.source;
        const otherNode = graph.nodes.find((n) => n.id === otherId);
        const otherEdgesCount = graph.edges.filter(
          (e) => e.source === otherId || e.target === otherId,
        ).length;
        const impactSeverity =
          edge.strength * (1 / Math.max(otherEdgesCount, 1));

        return {
          affectedId: otherId,
          affectedName: otherNode?.label ?? otherId,
          impactSeverity,
        };
      })
      .sort((a, b) => b.impactSeverity - a.impactSeverity);

    // Intervention suggestion
    let intervention = "Contactar proactivamente";
    if (resilience.quality === "critical") {
      intervention =
        "Intervención urgente: reconexión personal con staff asignado";
    } else if (factors.some((f) => f.factor.includes("aislamiento"))) {
      intervention = "Invitar a evento grupal para reconectar";
    } else if (factors.some((f) => f.factor.includes("interacción"))) {
      intervention =
        "Activar engagement personal: llamada o visita del staff";
    }

    risks.push({
      familyId: node.id,
      familyName: node.label,
      riskScore,
      factors,
      cascadeImpact: cascadeImpact.slice(0, 3),
      intervention,
      // §13 A6 additions
      resilienceScore: resilience.score,
      connectionQuality: resilience.quality,
    });
  }

  return [...risks].sort((a, b) => b.riskScore - a.riskScore);
}

// ═══════════════════════════════════════════════════════════
// §9  Growth Opportunities (unchanged algorithm, readonly)
// ═══════════════════════════════════════════════════════════

/**
 * Find families that could expand into new communities.
 * Only considers families with positive or neutral social momentum.
 */
export function findGrowthOpportunities(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
): readonly GrowthOpportunity[] {
  const opportunities: GrowthOpportunity[] = [];

  for (const node of graph.nodes) {
    if (node.id === graph.centerId) continue;

    const velocity = analysis.velocities.get(node.id);
    const centrality = analysis.centralities.get(node.id);
    if (!velocity || !centrality) continue;

    if (velocity.trend === "reversing") continue;

    const currentCommunityIds = new Set(
      analysis.communities
        .filter((c) => c.nodeIds.includes(node.id))
        .map((c) => c.id),
    );

    const targetCommunities = analysis.communities
      .filter((c) => !currentCommunityIds.has(c.id))
      .filter((c) =>
        graph.edges.some((e) => {
          const isSource = e.source === node.id;
          const isTarget = e.target === node.id;
          if (!isSource && !isTarget) return false;
          const otherId = isSource ? e.target : e.source;
          return c.nodeIds.includes(otherId);
        }),
      )
      .map((c) => ({
        id: c.id,
        name: c.name || c.id,
        currentGap: 1 - c.cohesion,
      }));

    if (targetCommunities.length === 0) continue;

    const connectionStrength = graph.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .reduce((sum, e) => sum + e.strength, 0);

    const integrationDifficulty: GrowthOpportunity["integrationDifficulty"] =
      connectionStrength > 1.5
        ? "easy"
        : connectionStrength > 0.5
          ? "moderate"
          : "hard";

    const strongestEdge = graph.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .sort((a, b) => b.strength - a.strength)[0];

    const activities = strongestEdge?.sharedActivities ?? [];
    const suggestedFirstStep =
      activities.length > 0
        ? `Invitar al evento de ${activities[0]}`
        : "Introducir a través de una comida grupal";

    opportunities.push({
      familyId: node.id,
      familyName: node.label,
      targetCommunities,
      integrationDifficulty,
      fitReason: `Conexiones existentes con ${targetCommunities.length} comunidad${targetCommunities.length > 1 ? "es" : ""}`,
      suggestedFirstStep,
    });
  }

  return [...opportunities].sort((a, b) => {
    const order = { easy: 0, moderate: 1, hard: 2 };
    return order[a.integrationDifficulty] - order[b.integrationDifficulty];
  });
}

// ═══════════════════════════════════════════════════════════
// §10  Full Predictions — Orchestrate all algorithms
// ═══════════════════════════════════════════════════════════

/**
 * Run all social prediction algorithms.
 * Single entry point for hooks and components.
 *
 * §13 algorithms integrated:
 *   - A4: EWMA decay prediction with confidence + seasonality
 *   - A5: Network-aware impact scoring for introductions
 *   - A6: Resilience scoring for churn risk
 *
 * @param graph - The topology graph
 * @param analysis - Pre-computed topology analysis
 *
 * @example
 * const analysis = analyzeTopology(graph);
 * const predictions = generatePredictions(graph, analysis);
 *
 * // A4: Decay with confidence
 * predictions.decayAlerts[0]?.confidence; // 0-1
 * predictions.decayAlerts[0]?.method;     // "ewma" | "linear"
 * predictions.decayAlerts[0]?.interventionWindow; // days
 *
 * // A5: Network-aware introductions
 * predictions.optimalIntroductions[0]?.networkImpactScore; // 0-1
 * predictions.optimalIntroductions[0]?.indirectBeneficiaries; // ["fam-3", ...]
 * predictions.optimalIntroductions[0]?.topologyImprovement; // "forma 2 triángulos..."
 *
 * // A6: Resilience scoring
 * predictions.churnRisks[0]?.resilienceScore; // 0-1
 * predictions.churnRisks[0]?.connectionQuality; // "strong" | "mixed" | ...
 */
export function generatePredictions(
  graph: TopologyGraph,
  analysis: TopologyAnalysis,
): SocialPredictions {
  return {
    decayAlerts: predictDecayAlerts(graph, analysis),
    optimalIntroductions: findOptimalIntroductions(graph, analysis),
    eventImpact: null, // Requires specific event context — computed on demand
    churnRisks: assessChurnRisks(graph, analysis),
    growthOpportunities: findGrowthOpportunities(graph, analysis),
  };
}