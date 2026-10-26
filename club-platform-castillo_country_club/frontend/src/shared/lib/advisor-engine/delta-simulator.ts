// src/shared/lib/advisor-engine/delta-simulator.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — Context Delta Simulator (F53)
//
// The core of the Digital Twin. Clones the real club context,
// applies metric deltas, and re-evaluates the advisor engine
// to predict cascading impacts — all client-side in <10ms.
//
// Pipeline:
//   1. Clone context with deltas → simulated context
//   2. Resolve metrics in both contexts → identify changes
//   3. Check threshold crossings → generate simulated signals
//   4. Detect causal chains on simulated signals → cascade predictions
//   5. Compute health score deltas per domain
//   6. Derive goal candidates from simulated context
//   7. Generate verdict (positive/neutral/negative/mixed)
//
// Integration points:
//   F49: detectCausalChains() for cascade propagation
//   F50: calibrationMap for calibrated confidence
//   F52: evaluateCustomRules() + getGoalCandidatesFromNLRules()
//   F52: resolveMetric() for safe metric access
//
// Depends on:
//   ./twin-types (all simulation types)
//   ./causal-chain (detectCausalChains, CausalChain)
//   ./calibration-types (CalibrationResult)
//   ./nl-rule-parser (resolveMetric, getAllMetrics, getMetricByPath)
//   ./nl-rule-engine (evaluateCustomRules, getGoalCandidatesFromNLRules)
//   ./types (DomainSignal, BaseInsight)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  DeltaScenario,
  MetricDelta,
  TwinSimulationResult,
  RuleActivationDelta,
  CascadePrediction,
  CascadeStep,
  TwinPrediction,
  HealthScoreDelta,
  SimulatedGoalCandidate,
  TwinVerdict,
} from "./twin-types";
import type { CausalChain } from "@/shared/lib/advisor-engine/types";
import type { CalibrationResult } from "./calibration-types";
import type { DomainSignal } from "./types";
import { detectCausalChains } from "./causal-chain";
import {
  resolveMetric,
  getAllMetrics,
  getMetricByPath,
} from "./nl-rule-parser";
import {
  getGoalCandidatesFromNLRules,
} from "./nl-rule-engine";
import type { AIDomain, AdvisorImpactLevel } from "@/shared/types/ai-intelligence";
import { SCENARIO_TEMPLATES } from "./twin-types";
// ═══════════════════════════════════════════════════════════
// SECTION 1 — THRESHOLD REGISTRY (derived from 185 engine rules)
// ═══════════════════════════════════════════════════════════

/**
 * Key thresholds from the engine rules.
 * When a metric crosses one of these, a rule activates/deactivates.
 * Derived from the 185 rules across 10 domains.
 */
interface ThresholdEntry {
  metricPath: string;
  operator: ">" | "<" | ">=" | "<=";
  threshold: number;
  ruleId: string;
  ruleTitle: string;
  domain: AIDomain | "global";
  impact: AdvisorImpactLevel;
  signalType: string;
}

const THRESHOLD_REGISTRY: ThresholdEntry[] = [
  // Financial
  { metricPath: "summary.financial.total_revenue", operator: "<", threshold: 0, ruleId: "fin_revenue_decline", ruleTitle: "Revenue decline detected", domain: "financial", impact: "high", signalType: "fin_revenue_decline" },
  { metricPath: "summary.financial.margin_pct", operator: "<", threshold: 15, ruleId: "fin_margin_pressure", ruleTitle: "Margin pressure detected", domain: "financial", impact: "medium", signalType: "fin_margin_pressure" },
  // Membership
  { metricPath: "summary.membership.churn_rate", operator: ">", threshold: 5, ruleId: "eng_churn_predictor", ruleTitle: "Churn rate above safe threshold", domain: "engagement", impact: "high", signalType: "eng_churn_alert" },
  { metricPath: "summary.membership.churn_rate", operator: ">", threshold: 10, ruleId: "eng_churn_critical", ruleTitle: "Churn rate critical", domain: "engagement", impact: "high", signalType: "eng_churn_alert" },
  { metricPath: "summary.membership.retention_rate", operator: "<", threshold: 80, ruleId: "eng_retention_warning", ruleTitle: "Retention below target", domain: "engagement", impact: "medium", signalType: "eng_retention_warning" },
  // Events
  { metricPath: "summary.operational.occupancy_rate", operator: "<", threshold: 40, ruleId: "evt_capacity_alert", ruleTitle: "Low event occupancy", domain: "events", impact: "medium", signalType: "evt_capacity_alert" },
  { metricPath: "summary.operational.attendance_rate", operator: "<", threshold: 50, ruleId: "evt_low_engagement", ruleTitle: "Low event attendance", domain: "events", impact: "medium", signalType: "evt_low_engagement" },
  // Satisfaction
  { metricPath: "summary.operational.satisfaction_score", operator: "<", threshold: 60, ruleId: "sat_critical_decline", ruleTitle: "Satisfaction critically low", domain: "satisfaction", impact: "high", signalType: "sat_critical_decline" },
  { metricPath: "summary.operational.satisfaction_score", operator: "<", threshold: 75, ruleId: "sat_below_target", ruleTitle: "Satisfaction below target", domain: "satisfaction", impact: "medium", signalType: "sat_below_target" },
  // Wellness
  { metricPath: "summary.operational.wellness_score", operator: "<", threshold: 65, ruleId: "ops_wellness_alert", ruleTitle: "Wellness score low", domain: "satisfaction", impact: "medium", signalType: "ops_wellness_alert" },

  // ── Engagement (expanded) — F57-B3 ──
  { metricPath: "summary.membership.retention_rate", operator: "<", threshold: 70, ruleId: "eng_member_inactive", ruleTitle: "Members going inactive", domain: "engagement", impact: "medium", signalType: "eng_member_inactive" },
  { metricPath: "summary.membership.churn_rate", operator: ">", threshold: 15, ruleId: "eng_churn_extreme", ruleTitle: "Churn rate extreme", domain: "engagement", impact: "high", signalType: "eng_churn_alert" },
  { metricPath: "summary.membership.guest_visits", operator: "<", threshold: 50, ruleId: "guest_visits_low", ruleTitle: "Guest visits critically low", domain: "engagement", impact: "medium", signalType: "guest_pipeline_weak" },

  // ── Financial (expanded) — F57-B3 ──
  { metricPath: "summary.financial.margin_pct", operator: "<", threshold: 5, ruleId: "fin_margin_critical", ruleTitle: "Margin critically low", domain: "financial", impact: "high", signalType: "fin_margin_pressure" },

  // ── Events (expanded) — F57-B3 ──
  { metricPath: "summary.operational.attendance_rate", operator: "<", threshold: 30, ruleId: "evt_low_rsvp", ruleTitle: "RSVP rate critically low", domain: "events", impact: "medium", signalType: "evt_low_engagement" },
  { metricPath: "summary.operational.total_events", operator: "<", threshold: 5, ruleId: "events_too_few", ruleTitle: "Very few events scheduled", domain: "events", impact: "medium", signalType: "evt_capacity_alert" },

  // ── Sports — F57-B3 ──
  { metricPath: "summary.operational.occupancy_rate", operator: "<", threshold: 25, ruleId: "spt_utilization_low", ruleTitle: "Sports facility utilization critical", domain: "sports", impact: "medium", signalType: "spt_utilization_drop" },
  { metricPath: "summary.operational.attendance_rate", operator: "<", threshold: 35, ruleId: "spt_class_underfill", ruleTitle: "Sports classes critically underfilled", domain: "sports", impact: "medium", signalType: "spt_class_underfill" },

  // ── Satisfaction (expanded) — F57-B3 ──
  { metricPath: "summary.operational.satisfaction_score", operator: "<", threshold: 50, ruleId: "sat_service_quality", ruleTitle: "Service quality critically low", domain: "satisfaction", impact: "high", signalType: "sat_critical_decline" },
  { metricPath: "summary.operational.satisfaction_score", operator: "<", threshold: 40, ruleId: "sat_very_critical", ruleTitle: "Satisfaction emergency level", domain: "satisfaction", impact: "high", signalType: "sat_critical_decline" },
  { metricPath: "summary.operational.wellness_score", operator: "<", threshold: 50, ruleId: "wellness_very_low", ruleTitle: "Wellness critically low", domain: "satisfaction", impact: "high", signalType: "ops_wellness_alert" },

  // ── Global — F57-B3 ──
  { metricPath: "_computed.systemic_risk", operator: ">", threshold: 70, ruleId: "global_systemic_risk_high", ruleTitle: "Systemic risk high", domain: "global", impact: "high", signalType: "global_systemic_risk" },
  { metricPath: "_computed.anomaly_count", operator: ">", threshold: 5, ruleId: "global_anomaly_cluster", ruleTitle: "Anomaly cluster detected", domain: "global", impact: "high", signalType: "global_anomaly_cluster" },
  { metricPath: "pendingApprovals", operator: ">", threshold: 10, ruleId: "global_approval_backlog", ruleTitle: "Approval backlog critical", domain: "global", impact: "medium", signalType: "global_approval_backlog" },
  { metricPath: "summary.membership.total_members", operator: "<", threshold: 50, ruleId: "members_decline_critical", ruleTitle: "Membership critically low", domain: "engagement", impact: "high", signalType: "eng_member_inactive" },
];

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MAIN SIMULATION ENTRY POINT
// ═══════════════════════════════════════════════════════════

/**
 * Run a full Digital Twin simulation.
 *
 * Takes the real club context and a scenario with metric deltas.
 * Returns a comprehensive TwinSimulationResult with:
 *   - Rule activation changes (which rules newly fire/stop)
 *   - Cascade predictions (cross-domain impact propagation)
 *   - Metric predictions with calibrated confidence
 *   - Health score deltas per domain
 *   - Goal candidates that would be derived
 *   - Overall verdict with recommendation
 *
 * Execution time target: <10ms (no I/O, no API calls)
 */
export function simulateScenario(
  baselineCtx: Record<string, unknown>,
  scenario: DeltaScenario,
  options?: {
    calibrationMap?: Map<string, CalibrationResult>;
    activeCausalChains?: CausalChain[];
    customRuleDomains?: Array<AIDomain | "global">;
    baselineHealthScores?: Map<string, number>;
  },
): TwinSimulationResult {
  const startTime = performance.now();

  // Step 1: Apply deltas → simulated context
  const { simulatedCtx, appliedDeltas } = applyDeltas(baselineCtx, scenario.deltas);

  // Step 2: Identify threshold crossings
  const ruleDeltas = computeRuleDeltas(baselineCtx, simulatedCtx);

  // Step 3: Generate simulated signals from threshold crossings
  const baselineSignals = extractSignalsFromContext(baselineCtx);
  const simulatedSignals = generateSimulatedSignals(ruleDeltas);

  // Step 4: Detect cascades
  const baselineResult = detectCausalChains(baselineSignals);
  const baselineCascades = baselineResult.chains ?? [];
  const simulatedResult = detectCausalChains(simulatedSignals);
  const simulatedCascades = simulatedResult.chains ?? [];
  const cascadePredictions = compareCascades(
    [...baselineCascades],
    [...simulatedCascades],
    options?.activeCausalChains,
  );

  // Step 5: Generate predictions with calibrated confidence
  const predictions = generatePredictions(
    baselineCtx,
    simulatedCtx,
    scenario.deltas,
    cascadePredictions,
    options?.calibrationMap,
  );

  // Step 6: Compute health score deltas
  const healthDeltas = computeHealthDeltas(
    baselineCtx,
    simulatedCtx,
    options?.baselineHealthScores,
  );

  // Step 7: Derive goal candidates
  const goalCandidates = deriveGoalCandidates(
    simulatedCtx,
    options?.customRuleDomains ?? ["global"],
  );

  // Step 8: Generate verdict
  const verdict = generateVerdict(
    ruleDeltas,
    cascadePredictions,
    predictions,
    healthDeltas,
  );

  const executionMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    id: `twin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    scenario,
    simulatedAt: Date.now(),
    executionMs,
    snapshot: {
      id: `snap_${Date.now()}`,
      scenarioId: scenario.id,
      simulatedAt: Date.now(),
      baselineContext: baselineCtx,
      simulatedContext: simulatedCtx,
      appliedDeltas,
    },
    ruleDeltas,
    cascades: cascadePredictions,
    predictions,
    healthDeltas,
    goalCandidates,
    verdict,
  };
}

/**
 * Quick simulation from a DeltaScenario template.
 * Resolves relative changes against the current context.
 */
export function simulateFromTemplate(
  baselineCtx: Record<string, unknown>,
  templateId: string,
  options?: Parameters<typeof simulateScenario>[2],
): TwinSimulationResult | null {
  const template = SCENARIO_TEMPLATES.find(
    (t: { id: string }) => t.id === templateId,
  );
  if (!template) return null;

  const metrics = getAllMetrics();
  const deltas: MetricDelta[] = [];

  for (const td of template.deltas) {
    const metric = metrics.find((m) => m.path === td.metricPath);
    if (!metric) continue;

    const currentValue = resolveMetric(baselineCtx, td.metricPath);
    if (currentValue === null) continue;

    const simulatedValue = currentValue * (1 + td.relativeChange);
    deltas.push({
      metricPath: td.metricPath,
      metricName: metric.names[0],
      currentValue,
      simulatedValue: Math.round(simulatedValue * 100) / 100,
      delta: Math.round((simulatedValue - currentValue) * 100) / 100,
      deltaPct: Math.round(td.relativeChange * 10000) / 100,
      unit: metric.unit,
      domain: metric.domain,
    });
  }

  const scenario: DeltaScenario = {
    id: `scenario_${templateId}_${Date.now()}`,
    name: template.name,
    description: template.description,
    deltas,
    createdAt: Date.now(),
    createdBy: "template",
  };

  return simulateScenario(baselineCtx, scenario, options);
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — CONTEXT CLONING WITH DELTAS
// ═══════════════════════════════════════════════════════════

/**
 * Apply metric deltas to a cloned context.
 * Uses shallow clone + deep path mutation for changed metrics only.
 * Returns the simulated context and the applied deltas with units.
 */
function applyDeltas(
  baselineCtx: Record<string, unknown>,
  deltas: MetricDelta[],
): {
  simulatedCtx: Record<string, unknown>;
  appliedDeltas: MetricDelta[];
} {
  // Shallow clone — sufficient since we only mutate specific paths
  const simulatedCtx = JSON.parse(JSON.stringify(baselineCtx));
  const appliedDeltas: MetricDelta[] = [];

  for (const delta of deltas) {
    const success = setNestedValue(simulatedCtx, delta.metricPath, delta.simulatedValue);
    if (success) {
      appliedDeltas.push(delta);
    }
  }

  return { simulatedCtx, appliedDeltas };
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — THRESHOLD CROSSING DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Compare baseline and simulated contexts against the threshold registry.
 * Returns which rules change activation status.
 */
function computeRuleDeltas(
  baselineCtx: Record<string, unknown>,
  simulatedCtx: Record<string, unknown>,
): RuleActivationDelta[] {
  const deltas: RuleActivationDelta[] = [];

  for (const entry of THRESHOLD_REGISTRY) {
    const baselineValue = resolveMetric(baselineCtx, entry.metricPath);
    const simulatedValue = resolveMetric(simulatedCtx, entry.metricPath);

    if (baselineValue === null && simulatedValue === null) continue;

    const baselineFires = evaluateThreshold(
      baselineValue ?? 0,
      entry.operator,
      entry.threshold,
    );
    const simulatedFires = evaluateThreshold(
      simulatedValue ?? 0,
      entry.operator,
      entry.threshold,
    );

    let changeType: RuleActivationDelta["changeType"] = "unchanged";
    if (!baselineFires && simulatedFires) changeType = "newly_activated";
    else if (baselineFires && !simulatedFires) changeType = "newly_deactivated";
    else if (baselineFires && simulatedFires) {
      // Both fire — check if severity intensified
      const baselineExcess = computeExcess(baselineValue ?? 0, entry.operator, entry.threshold);
      const simulatedExcess = computeExcess(simulatedValue ?? 0, entry.operator, entry.threshold);
      if (simulatedExcess > baselineExcess * 1.3) changeType = "intensified";
    }

    if (changeType !== "unchanged") {
      deltas.push({
        ruleId: entry.ruleId,
        ruleTitle: entry.ruleTitle,
        domain: entry.domain,
        firesInBaseline: baselineFires,
        firesInSimulation: simulatedFires,
        changeType,
        triggerMetric: entry.metricPath,
        baselineValue: baselineValue ?? 0,
        simulatedValue: simulatedValue ?? 0,
      });
    }
  }

  return deltas;
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — SIGNAL GENERATION FOR CASCADE DETECTION
// ═══════════════════════════════════════════════════════════

/**
 * Extract existing signals from a context.
 * Looks for signals array on the context (from Signal Bus).
 */
function extractSignalsFromContext(ctx: Record<string, unknown>): DomainSignal[] {
  const signals = (ctx as { signals?: DomainSignal[] }).signals;
  return Array.isArray(signals) ? signals : [];
}

/**
 * Generate simulated signals from rule activation deltas.
 * These are the signals that WOULD be emitted in the simulated scenario.
 */
function generateSimulatedSignals(
  ruleDeltas: RuleActivationDelta[],
): DomainSignal[] {
  const signals: DomainSignal[] = [];

  for (const delta of ruleDeltas) {
    if (delta.changeType === "newly_activated" || delta.changeType === "intensified") {
      // Find the threshold entry for this rule to get the signal type
      const entry = THRESHOLD_REGISTRY.find((t) => t.ruleId === delta.ruleId);
      if (!entry) continue;

      signals.push({
        id: `sim_signal_${delta.ruleId}_${Date.now()}`,
        signalDefId: entry.signalType as import("./types").SignalName,
        sourceDomain: delta.domain,
        targetDomains: getTargetDomains(delta.domain),
        severity: delta.changeType === "newly_activated" ? "high" : "medium",
        value: delta.simulatedValue - delta.baselineValue,
        label: `Simulated: ${delta.triggerMetric} ${delta.changeType}`,
        timestamp: Date.now(),
        ttl: 300000,
      } as import("./types").DomainSignal);
    }
  }

  // Also include existing baseline signals for context
  return signals;
}

/**
 * Get target domains for cascade propagation.
 */
function getTargetDomains(sourceDomain: AIDomain | "global"): Array<AIDomain | "global"> {
  const propagationMap: Record<string, Array<AIDomain | "global">> = {
    financial: ["events", "engagement", "global"],
    events: ["satisfaction", "engagement", "global"],
    engagement: ["financial", "events", "global"],
    satisfaction: ["engagement", "global"],
    sports: ["events", "satisfaction", "global"],
    global: ["financial", "events", "engagement", "satisfaction"],
  };
  return propagationMap[sourceDomain] ?? ["global"];
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — CASCADE COMPARISON
// ═══════════════════════════════════════════════════════════

/**
 * Compare baseline and simulated cascades.
 * Identifies NEW cascades that wouldn't happen without the delta.
 */
function compareCascades(
  baselineCascades: CausalChain[],
  simulatedCascades: CausalChain[],
  _activeCausalChains?: CausalChain[],
): CascadePrediction[] {
  const predictions: CascadePrediction[] = [];
  const baselinePatternIds = new Set(baselineCascades.map((c) => c.patternId));

  for (const chain of simulatedCascades) {
    const isNew = !baselinePatternIds.has(chain.patternId);

    const cascadeSteps: CascadeStep[] = chain.signals.map(
      (signal: DomainSignal, idx: number) => ({
        order: idx,
        domain: inferDomainFromSignal(signal.signalDefId),
        signalType: signal.signalDefId,
        affectedMetric: inferMetricFromSignal(signal.signalDefId),
        baselineValue: 0,
        predictedValue: signal.value,
        stepConfidence: chain.compoundConfidence,
        severity: (idx === chain.signals.length - 1
          ? (chain.compoundConfidence > 0.7 ? "high" : "medium")
          : "low") as AdvisorImpactLevel,
      }),
    );

    const finalStep = cascadeSteps[cascadeSteps.length - 1];

    predictions.push({
      patternId: chain.patternId,
      cascadeSteps,
      cascadeConfidence: chain.compoundConfidence,
      isNewCascade: isNew,
      finalImpactDomain: finalStep?.domain ?? "global",
      finalImpactSeverity: finalStep?.severity ?? "medium",
    });
  }

  return predictions;
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — PREDICTION GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate metric predictions with calibrated confidence.
 * Covers direct deltas + cascade-predicted impacts.
 */
function generatePredictions(
  baselineCtx: Record<string, unknown>,
  _simulatedCtx: Record<string, unknown>,
  deltas: MetricDelta[],
  cascades: CascadePrediction[],
  calibrationMap?: Map<string, CalibrationResult>,
): TwinPrediction[] {
  const predictions: TwinPrediction[] = [];

  // Direct predictions from deltas
  for (const delta of deltas) {
    const confidence = getCalibratedConfidence(
      delta.metricPath,
      calibrationMap,
    );

    predictions.push({
      id: `pred_direct_${delta.metricPath}`,
      metricPath: delta.metricPath,
      metricName: delta.metricName,
      currentValue: delta.currentValue,
      predictedValue: delta.simulatedValue,
      delta: delta.delta,
      deltaPct: delta.deltaPct,
      unit: delta.unit,
      domain: delta.domain,
      confidence: confidence.value,
      calibrationStatus: confidence.status,
      reasoning: `Cambio directo: ${delta.metricName} ${delta.delta >= 0 ? "+" : ""}${delta.delta}${delta.unit}`,
      source: "direct_delta",
    });
  }

  // Cascade predictions (derived impacts)
  for (const cascade of cascades) {
    if (!cascade.isNewCascade) continue;

    for (const step of cascade.cascadeSteps) {
      // Skip if already covered by direct delta
      if (deltas.some((d) => d.metricPath === step.affectedMetric)) continue;

      const metric = getMetricByPath(step.affectedMetric);
      const currentValue = resolveMetric(baselineCtx, step.affectedMetric);

      if (currentValue === null || !metric) continue;

      // Estimate cascade impact (conservative: 10-30% of original delta magnitude)
      const cascadeImpactPct = cascade.cascadeConfidence * 0.2;
      const sourceDelta = deltas.find((d) => d.domain !== step.domain);
      const predictedDelta = sourceDelta
        ? sourceDelta.delta * cascadeImpactPct
        : currentValue * cascadeImpactPct * (step.severity === "high" ? -0.1 : 0.05);
      const predictedValue = currentValue + predictedDelta;

      const confidence = getCalibratedConfidence(
        step.affectedMetric,
        calibrationMap,
      );

      predictions.push({
        id: `pred_cascade_${cascade.patternId}_${step.order}`,
        metricPath: step.affectedMetric,
        metricName: metric.names[0],
        currentValue,
        predictedValue: Math.round(predictedValue * 100) / 100,
        delta: Math.round(predictedDelta * 100) / 100,
        deltaPct: currentValue !== 0
          ? Math.round((predictedDelta / currentValue) * 10000) / 100
          : 0,
        unit: metric.unit,
        domain: step.domain,
        confidence: Math.round(confidence.value * cascade.cascadeConfidence),
        calibrationStatus: confidence.status,
        reasoning: `Cascada ${cascade.patternId}: paso ${step.order + 1} → ${metric.names[0]}`,
        source: "causal_chain",
      });
    }
  }

  return predictions;
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — HEALTH SCORE DELTAS
// ═══════════════════════════════════════════════════════════

/**
 * Compute health score changes per domain.
 * Uses metric-threshold-based scoring (simplified from 185 rules).
 */
function computeHealthDeltas(
  baselineCtx: Record<string, unknown>,
  simulatedCtx: Record<string, unknown>,
  baselineHealthScores?: Map<string, number>,
): HealthScoreDelta[] {
  const domainMetrics = groupMetricsByDomain();
  const deltas: HealthScoreDelta[] = [];

  for (const [domain, metrics] of domainMetrics) {
    const factorChanges: HealthScoreDelta["factorChanges"] = [];
    let baselineTotal = 0;
    let simulatedTotal = 0;
    let count = 0;

    for (const metric of metrics) {
      const baselineVal = resolveMetric(baselineCtx, metric.path);
      const simulatedVal = resolveMetric(simulatedCtx, metric.path);

      if (baselineVal === null || simulatedVal === null) continue;

      const baselineHealth = metricToHealth(baselineVal, metric);
      const simulatedHealth = metricToHealth(simulatedVal, metric);

      baselineTotal += baselineHealth;
      simulatedTotal += simulatedHealth;
      count++;

      if (baselineHealth !== simulatedHealth) {
        factorChanges.push({
          factorName: metric.names[0],
          baseline: Math.round(baselineHealth),
          simulated: Math.round(simulatedHealth),
          delta: Math.round(simulatedHealth - baselineHealth),
        });
      }
    }

    if (count === 0) continue;

    const baselineScore = baselineHealthScores?.get(domain) ??
      Math.round(baselineTotal / count);
    const simulatedScore = Math.round(simulatedTotal / count);
    const delta = simulatedScore - baselineScore;

    deltas.push({
      domain,
      baselineScore,
      simulatedScore,
      delta,
      trend: delta > 2 ? "improved" : delta < -2 ? "degraded" : "stable",
      factorChanges,
    });
  }

  return deltas;
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — GOAL CANDIDATE DERIVATION
// ═══════════════════════════════════════════════════════════

/**
 * Derive goals from the simulated context.
 * Uses F52's NL rule engine goal candidates.
 */
function deriveGoalCandidates(
  simulatedCtx: Record<string, unknown>,
  domains: Array<AIDomain | "global">,
): SimulatedGoalCandidate[] {
  const candidates: SimulatedGoalCandidate[] = [];

  for (const domain of domains) {
    const nlCandidates = getGoalCandidatesFromNLRules(domain, simulatedCtx);

    for (const c of nlCandidates) {
      candidates.push({
        title: c.title,
        description: c.description,
        domain: c.domain,
        impact: c.impact,
        metricPath: `metric_${c.metricName}`,
        currentValue: c.currentValue,
        targetValue: c.targetValue,
        unit: c.unit,
        confidence: 70, // Base confidence for NL-derived goals
        alreadyExists: false, // Would need to check against real goals
      });
    }
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════
// SECTION 10 — VERDICT GENERATION
// ═══════════════════════════════════════════════════════════

/**
 * Generate the overall simulation verdict.
 */
function generateVerdict(
  ruleDeltas: RuleActivationDelta[],
  cascades: CascadePrediction[],
  predictions: TwinPrediction[],
  healthDeltas: HealthScoreDelta[],
): TwinVerdict {
  const benefits: string[] = [];
  const risks: string[] = [];

  // Analyze rule changes
  const newlyActivated = ruleDeltas.filter((d) => d.changeType === "newly_activated");
  const newlyDeactivated = ruleDeltas.filter((d) => d.changeType === "newly_deactivated");

  // Analyze cascades
  const newCascades = cascades.filter((c) => c.isNewCascade);
  const highRiskCascades = newCascades.filter((c) => c.cascadeConfidence > 0.7);

  // Analyze health
  const improvedDomains = healthDeltas.filter((h) => h.trend === "improved");
  const degradedDomains = healthDeltas.filter((h) => h.trend === "degraded");

  // Build benefits
  if (improvedDomains.length > 0) {
    benefits.push(
      `Mejora en ${improvedDomains.map((d) => d.domain).join(", ")}: +${improvedDomains.reduce((s, d) => s + d.delta, 0)}pts`,
    );
  }
  if (newlyDeactivated.length > 0) {
    benefits.push(
      `${newlyDeactivated.length} alerta(s) se resolverían: ${newlyDeactivated.map((d) => d.ruleTitle).join(", ")}`,
    );
  }

  // Build risks
  if (degradedDomains.length > 0) {
    risks.push(
      `Degradación en ${degradedDomains.map((d) => d.domain).join(", ")}: ${degradedDomains.reduce((s, d) => s + d.delta, 0)}pts`,
    );
  }
  if (highRiskCascades.length > 0) {
    risks.push(
      `${highRiskCascades.length} cascada(s) de alto riesgo: ${highRiskCascades.map((c) => c.patternId).join(", ")}`,
    );
  }
  if (newlyActivated.length > 0) {
    risks.push(
      `${newlyActivated.length} nueva(s) alerta(s): ${newlyActivated.map((d) => d.ruleTitle).join(", ")}`,
    );
  }

  // Compute average confidence
  const avgConfidence = predictions.length > 0
    ? Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length)
    : 0;

  // Determine assessment
  const positiveScore = improvedDomains.length * 2 + newlyDeactivated.length;
  const negativeScore = degradedDomains.length * 2 + newlyActivated.length + highRiskCascades.length;

  let assessment: TwinVerdict["assessment"];
  if (positiveScore > negativeScore * 1.5) assessment = "positive";
  else if (negativeScore > positiveScore * 1.5) assessment = "negative";
  else if (positiveScore > 0 && negativeScore > 0) assessment = "mixed";
  else assessment = "neutral";

  // Determine recommendation
  let recommendation: TwinVerdict["recommendation"];
  if (assessment === "positive" && highRiskCascades.length === 0) {
    recommendation = "execute";
  } else if (assessment === "positive" || assessment === "mixed") {
    recommendation = "execute_with_monitoring";
  } else if (assessment === "negative" && degradedDomains.length > 2) {
    recommendation = "reject";
  } else {
    recommendation = "reconsider";
  }

  // Generate summary
  const summary = generateSummaryText(
    assessment,
    improvedDomains.length,
    degradedDomains.length,
    newCascades.length,
    newlyActivated.length,
  );

  return {
    assessment,
    summary,
    benefits,
    risks,
    recommendation,
    averageConfidence: avgConfidence,
    cascadeRiskCount: newCascades.length,
    newRuleCount: newlyActivated.length,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 11 — HELPERS
// ═══════════════════════════════════════════════════════════

function evaluateThreshold(
  value: number,
  operator: string,
  threshold: number,
): boolean {
  switch (operator) {
    case ">": return value > threshold;
    case "<": return value < threshold;
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    default: return false;
  }
}

function computeExcess(
  value: number,
  operator: string,
  threshold: number,
): number {
  switch (operator) {
    case ">": return value - threshold;
    case "<": return threshold - value;
    case ">=": return value - threshold;
    case "<=": return threshold - value;
    default: return 0;
  }
}

function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: number,
): boolean {
  const parts = path.split(".");
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (current === null || current === undefined || typeof current !== "object") {
      return false;
    }
    current = (current as Record<string, unknown>)[parts[i]];
  }

  if (current === null || current === undefined || typeof current !== "object") {
    return false;
  }

  (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
  return true;
}

function inferDomainFromSignal(signalType: string): AIDomain | "global" {
  if (signalType.startsWith("fin_")) return "financial";
  if (signalType.startsWith("evt_")) return "events";
  if (signalType.startsWith("eng_") || signalType.startsWith("guest_")) return "engagement";
  if (signalType.startsWith("sat_") || signalType.startsWith("ops_")) return "satisfaction";
  if (signalType.startsWith("spt_")) return "sports";
  if (signalType.startsWith("comm_")) return "communication";
  if (signalType.startsWith("age_")) return "family";
  if (signalType.startsWith("ml_")) return "ml_intelligence";
  return "global";
}

function inferMetricFromSignal(signalType: string): string {
  const map: Record<string, string> = {
    fin_revenue_decline: "summary.financial.total_revenue",
    fin_margin_pressure: "summary.financial.margin_pct",
    evt_capacity_alert: "summary.operational.occupancy_rate",
    evt_low_engagement: "summary.operational.attendance_rate",
    eng_churn_alert: "summary.membership.churn_rate",
    eng_retention_warning: "summary.membership.retention_rate",
    sat_critical_decline: "summary.operational.satisfaction_score",
    sat_below_target: "summary.operational.satisfaction_score",
    ops_wellness_alert: "summary.operational.wellness_score",
  };
  // F57-B3: Expanded signal → metric mapping
  map.eng_member_inactive = "summary.membership.retention_rate";
  map.guest_pipeline_weak = "summary.membership.guest_visits";
  map.spt_utilization_drop = "summary.operational.occupancy_rate";
  map.spt_class_underfill = "summary.operational.attendance_rate";
  map.global_systemic_risk = "_computed.systemic_risk";
  map.global_anomaly_cluster = "_computed.anomaly_count";
  map.global_approval_backlog = "pendingApprovals";
  return map[signalType] ?? "unknown";
}

function getCalibratedConfidence(
  metricPath: string,
  calibrationMap?: Map<string, CalibrationResult>,
): { value: number; status: "cold" | "warming" | "calibrated" } {
  if (!calibrationMap) return { value: 70, status: "cold" };

  // Find calibration for rules related to this metric
  const ruleId = THRESHOLD_REGISTRY.find(
    (t) => t.metricPath === metricPath,
  )?.ruleId;

  if (!ruleId) return { value: 70, status: "cold" };

  const calibration = calibrationMap.get(ruleId);
  if (!calibration) return { value: 70, status: "cold" };

  return {
    value: Math.round(calibration.accuracyRate * 100),
    status: calibration.readiness,
  };
}

function groupMetricsByDomain(): Map<AIDomain | "global", Array<ReturnType<typeof getAllMetrics>[number]>> {
  const metrics = getAllMetrics();
  const grouped = new Map<AIDomain | "global", Array<typeof metrics[number]>>();

  for (const metric of metrics) {
    if (metric.path.startsWith("_computed.")) continue; // Skip computed metrics
    const existing = grouped.get(metric.domain) ?? [];
    existing.push(metric);
    grouped.set(metric.domain, existing);
  }

  return grouped;
}

/**
 * Convert a metric value to a 0-100 health score.
 * Uses the metric's reasonable range to normalize.
 */
function metricToHealth(
  value: number,
  metric: { reasonableMin: number; reasonableMax: number; unit: string },
): number {
  // Percentage metrics: directly interpretable
  if (metric.unit === "%") {
    return Math.max(0, Math.min(100, value));
  }

  // Normalize to 0-100 based on reasonable range
  const range = metric.reasonableMax - metric.reasonableMin;
  if (range === 0) return 50;

  const normalized = ((value - metric.reasonableMin) / range) * 100;
  return Math.max(0, Math.min(100, normalized));
}

function generateSummaryText(
  assessment: TwinVerdict["assessment"],
  improvedCount: number,
  degradedCount: number,
  cascadeCount: number,
  newAlertCount: number,
): string {
  switch (assessment) {
    case "positive":
      return `Impacto positivo: ${improvedCount} dominio(s) mejora(n)` +
        (cascadeCount > 0 ? `, ${cascadeCount} cascada(s) detectada(s)` : "") +
        ". Recomendado ejecutar.";
    case "negative":
      return `Impacto negativo: ${degradedCount} dominio(s) degrada(n)` +
        (newAlertCount > 0 ? `, ${newAlertCount} nueva(s) alerta(s)` : "") +
        ". No recomendado.";
    case "mixed":
      return `Impacto mixto: ${improvedCount} mejora(s), ${degradedCount} degradación(es)` +
        (cascadeCount > 0 ? `, ${cascadeCount} cascada(s)` : "") +
        ". Ejecutar con monitoreo.";
    default:
      return "Impacto mínimo detectado. Sin cambios significativos en el club.";
  }
}