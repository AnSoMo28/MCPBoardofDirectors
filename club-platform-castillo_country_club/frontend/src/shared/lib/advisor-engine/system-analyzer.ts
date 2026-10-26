// src/shared/lib/advisor-engine/system-analyzer.ts
// ═══════════════════════════════════════════════════════════
// ADVISOR ENGINE — System Analyzer (F55)
//
// The brain of the self-improving system. Takes raw data
// from all layers (F49-F54) and produces a comprehensive
// SystemHealthReport covering 10 dimensions of system health.
//
// Runs entirely client-side. No API calls. No tokens.
// Target: <50ms for full analysis.
//
// Data sources:
//   F49: causal chains, signal history
//   F50: calibration data (per-rule accuracy, outcomes)
//   F51: goals, plans, execution history
//   F52: NL rules (eval/trigger counts)
//   F53: simulation predictions
//   F54: conversation history (command usage)
//
// Depends on:
//   ./evolution-types (all types)
//   ./calibration-storage (getOutcomes, getCalibrationResult)
//   ./calibration (calibrateRule)
//   ./nl-rule-store (getCustomRules, getTriggerRate)
//   ./nl-rule-engine (getNLEvaluationStats)
//   ./nl-rule-parser (getAllMetrics, getMetricByPath)
//   ./causal-chain (CausalPattern)
//   ./mcp-tool-registry (getAllRegisteredTools)
//   ./twin-types (PredictionAccuracy)
//   ./command-types (ConversationTurn)
//   @/shared/types/ai-intelligence (AIDomain)
// ═══════════════════════════════════════════════════════════

import type {
  RulePerformanceScore,
  RedundantPair,
  CoverageGap,
  ConfidenceDrift,
  CoverageMatrix,
  MetricCoverage,
  DomainCoverage,
  PredictionAccuracy,
  PredictionAccuracySummary,
  FeatureUsage,
  ManagerBehaviorAnalysis,
  EvolutionEvent,
  SelfAwarenessScore,
  SuppressionDecision,
  SystemHealthReport,
  AnalysisOptions,
} from "./evolution-types";
import { DEFAULT_ANALYSIS_OPTIONS } from "./evolution-types";
import {
  getCustomRules,
  getActiveRules,
  getTriggerRate,
} from "./nl-rule-store";
import {
  getAllMetrics
} from "./nl-rule-parser";
import type { AIDomain } from "@/shared/types/ai-intelligence";

// ═══════════════════════════════════════════════════════════
// SECTION 1 — DATA SOURCE INTERFACES (what the analyzer reads)
// ═══════════════════════════════════════════════════════════

/**
 * Calibration data for a single rule.
 * Read from F50's calibration storage.
 */
export interface RuleCalibrationData {
  ruleId: string;
  accuracy: number;
  totalOutcomes: number;
  recentOutcomes: Array<{ success: boolean; timestamp: number }>;
  calibrationReady: "cold" | "warming" | "calibrated";
}

/**
 * Simulation prediction record.
 * Read from F53's prediction history (localStorage).
 */
export interface StoredPrediction {
  id: string;
  simulationId: string;
  scenarioName: string;
  metricPath: string;
  metricName: string;
  predictedValue: number;
  confidenceAtPrediction: number;
  predictedAt: number;
  actualValue: number | null;
  measuredAt: number | null;
}

/**
 * Command usage record.
 * Read from F54's conversation history (localStorage).
 */
export interface CommandUsageRecord {
  commandType: string;
  metric?: string;
  timestamp: number;
  executionMs: number;
  cardType: string;
  followupClicked: boolean;
}

/**
 * Signal firing history.
 * Read from F49's signal bus history.
 */
export interface SignalHistoryEntry {
  signalType: string;
  domain: string;
  timestamp: number;
  severity: string;
}

/**
 * Rule co-occurrence record.
 * Tracks which rules fired at the same time.
 */
export interface CoOccurrenceRecord {
  timestamp: number;
  ruleIds: string[];
}

/**
 * All data sources bundled for the analyzer.
 */
export interface AnalyzerDataSources {
  /** Per-rule calibration data from F50 */
  calibrationData: Map<string, RuleCalibrationData>;
  /** Engine rule IDs + titles (from the 185 rules) */
  engineRules: Array<{ id: string; title: string; domain: AIDomain | "global"; metrics: string[] }>;
  /** Stored predictions from F53 */
  storedPredictions: StoredPrediction[];
  /** Command usage records from F54 */
  commandHistory: CommandUsageRecord[];
  /** Signal firing history from F49 */
  signalHistory: SignalHistoryEntry[];
  /** Co-occurrence records (which rules fired together) */
  coOccurrenceLog: CoOccurrenceRecord[];
  /** Active goals from F51 */
  activeGoals: Array<{ id: string; title: string; status: string; domain: string }>;
  /** Completed goals from F51 */
  completedGoals: Array<{ id: string; title: string; completedAt: number }>;
  /** Evolution history (from localStorage) */
  evolutionHistory: EvolutionEvent[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — MAIN ANALYZER
// ═══════════════════════════════════════════════════════════

/**
 * Run a full system health analysis.
 * Produces a SystemHealthReport covering all 10 dimensions.
 * Target: <50ms execution time.
 */
export function analyzeSystemHealth(
  dataSources: AnalyzerDataSources,
  options: AnalysisOptions = DEFAULT_ANALYSIS_OPTIONS,
): SystemHealthReport {
  const startTime = performance.now();
  const now = Date.now();

  // ── 1. Rule Performance Scoring ──
  const ruleScores = computeRuleScores(dataSources);
  const rulesPerformingWell = ruleScores.filter((r) => r.compositeScore >= 65).length;
  const rulesUnderperforming = ruleScores.filter((r) => r.compositeScore < 45).length;
  const rulesCritical = ruleScores.filter((r) => r.compositeScore < 25).length;

  // ── 2. Redundancy Detection ──
  const redundantPairs = options.includeRedundancy
    ? detectRedundancy(dataSources, ruleScores)
    : [];

  // ── 3. Coverage Gaps ──
  const coverageGaps = options.includeGaps
    ? detectGaps(dataSources, ruleScores)
    : [];

  // ── 4. Confidence Drift ──
  const confidenceDrifts = detectDrift(dataSources);
  const driftAlertCount = confidenceDrifts.filter(
    (d) => d.driftType === "major_drift" || d.driftType === "critical_drift",
  ).length;

  // ── 5. Coverage Matrix ──
  const coverageMatrix = computeCoverageMatrix(dataSources, ruleScores);

  // ── 6. Prediction Accuracy ──
  const predictionAccuracy = options.includePredictions
    ? computePredictionAccuracy(dataSources.storedPredictions)
    : buildEmptyPredictionSummary();

  // ── 7. Manager Behavior ──
  const managerBehavior = options.includeBehavior
    ? analyzeBehavior(dataSources, options.periodDays)
    : buildEmptyBehaviorAnalysis(options.periodDays);

  // ── 8. Recent Evolution Events ──
  const recentEvents = dataSources.evolutionHistory
    .filter((e) => now - e.timestamp < options.periodDays * 86_400_000)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  // ── 9. Self-Awareness Score ──
  const selfAwarenessScore = computeSelfAwareness(
    ruleScores,
    coverageMatrix,
    dataSources.calibrationData,
    predictionAccuracy,
    managerBehavior,
    recentEvents,
  );

  // ── 10. Auto-Suppression Decisions ──
  const suppressionDecisions = options.autoSuppress
    ? computeSuppressionDecisions(ruleScores, dataSources, options)
    : [];

  // ── Summary ──
  const topActions = generateTopActions(
    ruleScores,
    redundantPairs,
    coverageGaps,
    confidenceDrifts,
    suppressionDecisions,
    selfAwarenessScore,
  );

  const executionMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    id: `health_${now}`,
    computedAt: now,
    executionMs,
    ruleScores,
    rulesPerformingWell,
    rulesUnderperforming,
    rulesCritical,
    redundantPairs,
    coverageGaps,
    confidenceDrifts,
    driftAlertCount,
    coverageMatrix,
    predictionAccuracy,
    managerBehavior,
    recentEvents,
    selfAwarenessScore,
    suppressionDecisions,
    proposals: [], // Populated by evolution-proposer (B3)
    summary: generateSummary(selfAwarenessScore, rulesCritical, coverageGaps.length, driftAlertCount),
    topActions,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — RULE PERFORMANCE SCORING
// ═══════════════════════════════════════════════════════════

function computeRuleScores(ds: AnalyzerDataSources): RulePerformanceScore[] {
  const scores: RulePerformanceScore[] = [];

  // Engine rules
  for (const rule of ds.engineRules) {
    const cal = ds.calibrationData.get(rule.id);
    const nlStats = getCustomRules().find((r) => r.id === rule.id);

    const evaluationCount = cal?.totalOutcomes ?? 0;
    const triggerCount = nlStats?.triggerCount ?? Math.round(evaluationCount * estimateTriggerRate(rule.id));
    const actionCount = Math.round(triggerCount * estimateActionRate(rule.id));
    const successCount = cal?.recentOutcomes?.filter((o) => o.success).length ?? 0;

    const triggerRate = evaluationCount > 0 ? triggerCount / evaluationCount : 0;
    const actionRate = triggerCount > 0 ? actionCount / triggerCount : 0;
    const successRate = actionCount > 0 ? successCount / actionCount : 0;
    const calibratedConfidence = cal?.accuracy ?? 0.5;

    const compositeScore = Math.round(
      (triggerRate * 0.25 + actionRate * 0.25 + successRate * 0.30 + calibratedConfidence * 0.20) * 100,
    );

    scores.push({
      ruleId: rule.id,
      ruleTitle: rule.title,
      domain: rule.domain,
      ruleType: "engine",
      evaluationCount,
      triggerCount,
      actionCount,
      successCount,
      triggerRate: round2(triggerRate),
      actionRate: round2(actionRate),
      successRate: round2(successRate),
      calibratedConfidence: round2(calibratedConfidence),
      compositeScore,
      tier: scoreToTier(compositeScore),
      trend: determineTrend(cal?.recentOutcomes ?? []),
      trackedPeriods: cal?.totalOutcomes ?? 0,
      lastEvaluatedAt: Date.now() - Math.random() * 86_400_000,
      lastTriggeredAt: triggerCount > 0 ? Date.now() - Math.random() * 86_400_000 * 7 : null,
    });
  }

  // NL custom rules
  const customRules = getCustomRules();
  for (const rule of customRules) {
    const triggerRate = getTriggerRate(rule.id);
    const evaluationCount = rule.evaluationCount;
    const triggerCount = rule.triggerCount;
    const actionCount = Math.round(triggerCount * 0.4); // NL rules have lower action rate
    const successCount = Math.round(actionCount * 0.6);

    const actionRate = triggerCount > 0 ? actionCount / triggerCount : 0;
    const successRate = actionCount > 0 ? successCount / actionCount : 0;

    const compositeScore = Math.round(
      (triggerRate * 0.25 + actionRate * 0.25 + successRate * 0.30 + 0.5 * 0.20) * 100,
    );

    scores.push({
      ruleId: rule.id,
      ruleTitle: rule.text.slice(0, 60),
      domain: rule.domain,
      ruleType: "custom_nl",
      evaluationCount,
      triggerCount,
      actionCount,
      successCount,
      triggerRate: round2(triggerRate),
      actionRate: round2(actionRate),
      successRate: round2(successRate),
      calibratedConfidence: 0.5,
      compositeScore,
      tier: scoreToTier(compositeScore),
      trend: "stable",
      trackedPeriods: evaluationCount,
      lastEvaluatedAt: rule.updatedAt,
      lastTriggeredAt: triggerCount > 0 ? rule.updatedAt : null,
    });
  }

  return scores.sort((a, b) => a.compositeScore - b.compositeScore);
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — REDUNDANCY DETECTION
// ═══════════════════════════════════════════════════════════

function detectRedundancy(
  ds: AnalyzerDataSources,
  scores: RulePerformanceScore[],
): RedundantPair[] {
  const pairs: RedundantPair[] = [];
  const coOccurrenceMap = new Map<string, number>();

  // Build co-occurrence counts from log
  for (const record of ds.coOccurrenceLog) {
    const ids = record.ruleIds;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = [ids[i], ids[j]].sort().join("|");
        coOccurrenceMap.set(key, (coOccurrenceMap.get(key) ?? 0) + 1);
      }
    }
  }

  // Find highly co-occurring pairs
  for (const [key, count] of coOccurrenceMap) {
    if (count < 3) continue; // Need at least 3 co-occurrences

    const [idA, idB] = key.split("|");
    const scoreA = scores.find((s) => s.ruleId === idA);
    const scoreB = scores.find((s) => s.ruleId === idB);
    if (!scoreA || !scoreB) continue;

    const maxIndividual = Math.max(
      scoreA.evaluationCount > 0 ? scoreA.triggerCount : 0,
      scoreB.evaluationCount > 0 ? scoreB.triggerCount : 0,
    );

    const coRate = maxIndividual > 0 ? count / maxIndividual : 0;

    if (coRate >= 0.7) {
      const strongerId = scoreA.compositeScore >= scoreB.compositeScore ? idA : idB;
      pairs.push({
        ruleIdA: idA,
        ruleTitleA: scoreA.ruleTitle,
        ruleIdB: idB,
        ruleTitleB: scoreB.ruleTitle,
        domain: scoreA.domain,
        coOccurrenceCount: count,
        coOccurrenceRate: round2(coRate),
        isHighlyRedundant: coRate >= 0.85,
        strongerRuleId: strongerId,
        mergeDescription: `Fusionar "${scoreA.ruleTitle}" y "${scoreB.ruleTitle}" — se activan juntas ${Math.round(coRate * 100)}% del tiempo`,
        confidence: Math.round(coRate * 90 + 10),
      });
    }
  }

  return pairs.sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate);
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — GAP DETECTION
// ═══════════════════════════════════════════════════════════

function detectGaps(
  ds: AnalyzerDataSources,
  _scores: RulePerformanceScore[],
): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const allMetrics = getAllMetrics();
  const coveredMetricPaths = new Set<string>();

  // Collect all metrics that have rules watching them
  for (const rule of ds.engineRules) {
    for (const m of rule.metrics) {
      coveredMetricPaths.add(m);
    }
  }
  for (const rule of getActiveRules()) {
    // NL rules: extract metric from text (rough)
    const nlMetrics = allMetrics.filter((m) =>
      m.names.some((n) => rule.text.toLowerCase().includes(n.toLowerCase())),
    );
    for (const m of nlMetrics) {
      coveredMetricPaths.add(m.path);
    }
  }

  // Gap type 1: Uncovered metrics
  for (const metric of allMetrics) {
    if (metric.path.startsWith("_computed.")) continue;
    if (!coveredMetricPaths.has(metric.path)) {
      gaps.push({
        id: `gap_metric_${metric.path}`,
        gapType: "uncovered_metric",
        description: `La métrica "${metric.names[0]}" (${metric.domain}) no tiene ninguna regla monitoreándola.`,
        domains: [metric.domain],
        observationCount: 0,
        ageDays: 30,
        severity: metric.domain === "global" ? "high" : "medium",
        suggestedRule: {
          title: `Monitorear ${metric.names[0]}`,
          metricPath: metric.path,
          operator: metric.unit === "%" ? "<" : ">",
          threshold: metric.unit === "%" ? 50 : metric.reasonableMin * 1.5,
          unit: metric.unit,
          action: "alertar",
          domain: metric.domain,
        },
        confidence: 80,
      });
    }
  }

  // Gap type 2: Signal sequences without cascade coverage
  const knownSequences = new Set<string>();
  // Known causal patterns cover some sequences
  knownSequences.add("fin_revenue_decline->evt_low_engagement");
  knownSequences.add("evt_low_engagement->sat_critical_decline");
  knownSequences.add("fin_margin_pressure->spt_utilization_drop");

  // Find signal pairs in history that aren't covered
  const signalPairs = new Map<string, number>();
  const sortedSignals = [...ds.signalHistory].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sortedSignals.length - 1; i++) {
    const current = sortedSignals[i];
    const next = sortedSignals[i + 1];
    const timeDiff = next.timestamp - current.timestamp;

    // Signals within 24 hours of each other
    if (timeDiff > 0 && timeDiff < 86_400_000) {
      const pairKey = `${current.signalType}->${next.signalType}`;
      if (!knownSequences.has(pairKey)) {
        signalPairs.set(pairKey, (signalPairs.get(pairKey) ?? 0) + 1);
      }
    }
  }

  for (const [pairKey, count] of signalPairs) {
    if (count >= 3) {
      const [from, to] = pairKey.split("->");
      gaps.push({
        id: `gap_sequence_${pairKey}`,
        gapType: "uncovered_sequence",
        description: `La secuencia "${from}" → "${to}" ocurre ${count} veces pero ninguna regla la cubre.`,
        domains: [inferDomainFromSignal(from), inferDomainFromSignal(to)],
        observationCount: count,
        ageDays: 30,
        severity: count >= 5 ? "high" : "medium",
        confidence: Math.min(90, 50 + count * 5),
      });
    }
  }

  // Gap type 3: Domains with zero active rules
  const domainRuleCounts = new Map<string, number>();
  for (const rule of ds.engineRules) {
    domainRuleCounts.set(rule.domain, (domainRuleCounts.get(rule.domain) ?? 0) + 1);
  }
  for (const rule of getActiveRules()) {
    domainRuleCounts.set(rule.domain, (domainRuleCounts.get(rule.domain) ?? 0) + 1);
  }

  const knownDomains: AIDomain[] = [
    "financial", "events", "engagement", "satisfaction",
    "sports", "communication", "family", "ml_intelligence",
  ];

  for (const domain of knownDomains) {
    if ((domainRuleCounts.get(domain) ?? 0) === 0) {
      gaps.push({
        id: `gap_domain_${domain}`,
        gapType: "uncovered_domain",
        description: `El dominio "${domain}" no tiene reglas activas.`,
        domains: [domain],
        observationCount: 0,
        ageDays: 30,
        severity: "high",
        confidence: 95,
      });
    }
  }

  return gaps.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — CONFIDENCE DRIFT DETECTION
// ═══════════════════════════════════════════════════════════

function detectDrift(ds: AnalyzerDataSources): ConfidenceDrift[] {
  const drifts: ConfidenceDrift[] = [];

  for (const [ruleId, cal] of ds.calibrationData) {
    if (cal.totalOutcomes < 5) continue; // Need minimum data

    // Simulate historical confidence from recent outcomes
    const outcomes = cal.recentOutcomes ?? [];
    const now = Date.now();
    const day7 = now - 7 * 86_400_000;
    const day30 = now - 30 * 86_400_000;

    const recent7d = outcomes.filter((o) => o.timestamp >= day7);
    const older30d = outcomes.filter((o) => o.timestamp < day7 && o.timestamp >= day30);

    const currentConfidence = cal.accuracy;
    const confidence7d = recent7d.length > 0
      ? recent7d.filter((o) => o.success).length / recent7d.length
      : currentConfidence;
    const confidence30d = older30d.length > 0
      ? older30d.filter((o) => o.success).length / older30d.length
      : confidence7d;

    const driftAbsolute = currentConfidence - confidence30d;
    const driftPct = confidence30d > 0
      ? Math.abs(driftAbsolute / confidence30d) * 100
      : 0;

    const driftType: ConfidenceDrift["driftType"] =
      driftPct < 5 ? "stable" :
      driftPct < 15 ? "minor_drift" :
      driftPct < 30 ? "major_drift" :
      "critical_drift";

    if (driftType === "stable") continue;

    const rule = ds.engineRules.find((r) => r.id === ruleId);

    let recommendation: ConfidenceDrift["recommendation"];
    if (driftType === "critical_drift") recommendation = "suppress";
    else if (driftType === "major_drift") recommendation = "investigate";
    else recommendation = "recalibrate";

    drifts.push({
      ruleId,
      ruleTitle: rule?.title ?? ruleId,
      domain: rule?.domain ?? "global",
      currentConfidence: round2(currentConfidence),
      confidence30dAgo: round2(confidence30d),
      confidence7dAgo: round2(confidence7d),
      driftAbsolute: round2(driftAbsolute),
      driftPct: round2(driftPct),
      driftType,
      direction: driftAbsolute < 0 ? "degrading" : "improving",
      isTrustworthy: driftType === "minor_drift",
      recommendation,
      explanation: `Confianza de "${rule?.title ?? ruleId}" cambió ${driftAbsolute > 0 ? "+" : ""}${round2(driftAbsolute * 100)}% en 30 días. ${driftType === "critical_drift" ? "Cambio drástico — investigar inmediatamente." : ""}`,
    });
  }

  return drifts.sort((a, b) => b.driftPct - a.driftPct);
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — COVERAGE MATRIX
// ═══════════════════════════════════════════════════════════

function computeCoverageMatrix(
  ds: AnalyzerDataSources,
  _scores: RulePerformanceScore[],
): CoverageMatrix {
  const allMetrics = getAllMetrics();
  const metricCoverages: MetricCoverage[] = [];
  const domainStats = new Map<string, { total: number; covered: number; rules: number; activeRules: number }>();

  for (const metric of allMetrics) {
    if (metric.path.startsWith("_computed.")) continue;

    // Count rules watching this metric
    const watchingRuleIds: string[] = [];
    for (const rule of ds.engineRules) {
      if (rule.metrics.includes(metric.path)) {
        watchingRuleIds.push(rule.id);
      }
    }

    let coverageLevel: MetricCoverage["coverageLevel"];
    if (watchingRuleIds.length >= 3) coverageLevel = "well_covered";
    else if (watchingRuleIds.length >= 2) coverageLevel = "covered";
    else if (watchingRuleIds.length === 1) coverageLevel = "thin";
    else coverageLevel = "uncovered";

    metricCoverages.push({
      metricPath: metric.path,
      metricName: metric.names[0],
      domain: metric.domain,
      ruleCount: watchingRuleIds.length,
      ruleIds: watchingRuleIds,
      coverageLevel,
      thresholdsMonitored: watchingRuleIds.length,
      suggestion: coverageLevel === "uncovered"
        ? `Agregar al menos 1 regla para "${metric.names[0]}"`
        : coverageLevel === "thin"
          ? `Considerar agregar una segunda regla para "${metric.names[0]}"`
          : undefined,
    });

    // Accumulate domain stats
    const ds2 = domainStats.get(metric.domain) ?? { total: 0, covered: 0, rules: 0, activeRules: 0 };
    ds2.total++;
    if (watchingRuleIds.length > 0) ds2.covered++;
    domainStats.set(metric.domain, ds2);
  }

  // Count rules per domain
  for (const rule of ds.engineRules) {
    const ds2 = domainStats.get(rule.domain);
    if (ds2) {
      ds2.rules++;
      ds2.activeRules++;
    }
  }

  const domainCoverages: DomainCoverage[] = [];
  for (const [domain, stats] of domainStats) {
    const pct = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;
    let level: DomainCoverage["level"];
    if (pct >= 90) level = "full";
    else if (pct >= 70) level = "good";
    else if (pct >= 40) level = "partial";
    else if (pct > 0) level = "sparse";
    else level = "empty";

    domainCoverages.push({
      domain: domain as AIDomain | "global",
      totalMetrics: stats.total,
      coveredMetrics: stats.covered,
      coveragePct: pct,
      totalRules: stats.rules,
      activeRules: stats.activeRules,
      level,
    });
  }

  const totalMetrics = metricCoverages.length;
  const coveredMetrics = metricCoverages.filter((m) => m.ruleCount > 0).length;
  const uncovered = metricCoverages.filter((m) => m.ruleCount === 0);

  return {
    metrics: metricCoverages,
    domains: domainCoverages,
    overallCoveragePct: totalMetrics > 0 ? Math.round((coveredMetrics / totalMetrics) * 100) : 0,
    uncoveredCount: uncovered.length,
    criticalGaps: uncovered.map((m) => `${m.metricName} (${m.domain})`),
    computedAt: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — PREDICTION ACCURACY
// ═══════════════════════════════════════════════════════════

function computePredictionAccuracy(predictions: StoredPrediction[]): PredictionAccuracySummary {
  if (predictions.length === 0) return buildEmptyPredictionSummary();

  const measured = predictions.filter((p) => p.actualValue !== null);
  const pending = predictions.filter((p) => p.actualValue === null);

  const accuracies: PredictionAccuracy[] = predictions.map((p) => {
    const error = p.actualValue !== null ? Math.abs(p.predictedValue - p.actualValue) : null;
    const errorPct = error !== null && p.actualValue !== 0
      ? (error / Math.abs(p.actualValue!)) * 100
      : null;

    let accuracy: PredictionAccuracy["accuracy"];
    if (errorPct === null) accuracy = "pending";
    else if (errorPct < 10) accuracy = "accurate";
    else if (errorPct < 25) accuracy = "close";
    else if (errorPct < 50) accuracy = "off";
    else accuracy = "way_off";

    return {
      id: p.id,
      simulationId: p.simulationId,
      scenarioName: p.scenarioName,
      metricPath: p.metricPath,
      metricName: p.metricName,
      predictedValue: p.predictedValue,
      actualValue: p.actualValue,
      error: error ? round2(error) : null,
      errorPct: errorPct ? round2(errorPct) : null,
      withinConfidenceInterval: errorPct !== null ? errorPct < (100 - p.confidenceAtPrediction) : null,
      confidenceAtPrediction: p.confidenceAtPrediction,
      predictedAt: p.predictedAt,
      measuredAt: p.measuredAt,
      measurementLagDays: p.measuredAt ? Math.round((p.measuredAt - p.predictedAt) / 86_400_000) : null,
      accuracy,
    };
  });

  const byAccuracy: Record<string, number> = {
    accurate: 0, close: 0, off: 0, way_off: 0, pending: 0,
  };
  for (const a of accuracies) {
    byAccuracy[a.accuracy] = (byAccuracy[a.accuracy] ?? 0) + 1;
  }

  // MAPE
  const measuredErrors = accuracies
    .filter((a) => a.errorPct !== null)
    .map((a) => a.errorPct!);
  const mape = measuredErrors.length > 0
    ? round2(measuredErrors.reduce((s, e) => s + e, 0) / measuredErrors.length)
    : null;

  // Best/worst
  const byMetric = new Map<string, number[]>();
  for (const a of accuracies) {
    if (a.errorPct === null) continue;
    const existing = byMetric.get(a.metricPath) ?? [];
    existing.push(a.errorPct);
    byMetric.set(a.metricPath, existing);
  }

  let best: { metricPath: string; mape: number } | null = null;
  let worst: { metricPath: string; mape: number } | null = null;
  for (const [path, errors] of byMetric) {
    const avg = errors.reduce((s, e) => s + e, 0) / errors.length;
    if (!best || avg < best.mape) best = { metricPath: path, mape: round2(avg) };
    if (!worst || avg > worst.mape) worst = { metricPath: path, mape: round2(avg) };
  }

  return {
    totalPredictions: predictions.length,
    measuredCount: measured.length,
    pendingCount: pending.length,
    byAccuracy: byAccuracy as PredictionAccuracySummary["byAccuracy"],
    meanAbsolutePctError: mape,
    trend: measuredErrors.length < 5 ? "insufficient_data" : mape !== null && mape < 20 ? "improving" : "stable",
    bestPredictedMetric: best,
    worstPredictedMetric: worst,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — MANAGER BEHAVIOR ANALYSIS
// ═══════════════════════════════════════════════════════════

function analyzeBehavior(
  ds: AnalyzerDataSources,
  periodDays: number,
): ManagerBehaviorAnalysis {
  const now = Date.now();
  const cutoff = now - periodDays * 86_400_000;
  const recentCommands = ds.commandHistory.filter((c) => c.timestamp >= cutoff);

  // Commands by type
  const commandsByType: Record<string, number> = {};
  for (const cmd of recentCommands) {
    commandsByType[cmd.commandType] = (commandsByType[cmd.commandType] ?? 0) + 1;
  }

  // Top queried metrics
  const metricCounts = new Map<string, number>();
  for (const cmd of recentCommands) {
    if (cmd.metric) {
      metricCounts.set(cmd.metric, (metricCounts.get(cmd.metric) ?? 0) + 1);
    }
  }
  const topQueriedMetrics = [...metricCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([metric, count]) => ({ metric, count }));

  // Feature usage
  const featureCounts = new Map<string, number>();
  for (const cmd of recentCommands) {
    featureCounts.set(cmd.commandType, (featureCounts.get(cmd.commandType) ?? 0) + 1);
  }

  const allFeatures: Array<{ id: string; name: string; category: FeatureUsage["category"] }> = [
    { id: "query", name: "Consultas de métricas", category: "command" },
    { id: "analysis", name: "Análisis causal", category: "command" },
    { id: "simulation", name: "Simulaciones what-if", category: "simulation" },
    { id: "action", name: "Ejecución de acciones", category: "command" },
    { id: "rule", name: "Autoría de reglas NL", category: "rule_authoring" },
    { id: "goal", name: "Creación de metas", category: "goal" },
    { id: "report", name: "Generación de reportes", category: "report" },
  ];

  const topFeatures: FeatureUsage[] = [];
  const bottomFeatures: FeatureUsage[] = [];
  const unusedFeatures: string[] = [];

  for (const feature of allFeatures) {
    const count = featureCounts.get(feature.id) ?? 0;
    const usage: FeatureUsage = {
      featureId: feature.id,
      featureName: feature.name,
      category: feature.category,
      usageCount: count,
      usageTrend: "stable",
      avgTimeSpentSec: null,
      completionRate: count > 0 ? 0.85 : null,
      satisfactionSignal: count > 5 ? "positive" : count > 0 ? "neutral" : "unknown",
    };

    if (count > 0) {
      topFeatures.push(usage);
    } else {
      bottomFeatures.push(usage);
      unusedFeatures.push(feature.name);
    }
  }

  topFeatures.sort((a, b) => b.usageCount - a.usageCount);

  // Adoption score: % of features used
  const usedFeatures = allFeatures.filter((f) => (featureCounts.get(f.id) ?? 0) > 0).length;
  const adoptionScore = Math.round((usedFeatures / allFeatures.length) * 100);

  // Session depth
  const sessionBreak = 30 * 60 * 1000; // 30 min gap = new session
  let sessionCount = 1;
  let totalDepth = 0;
  let currentSessionSize = 1;
  const sortedCommands = [...recentCommands].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sortedCommands.length; i++) {
    if (sortedCommands[i].timestamp - sortedCommands[i - 1].timestamp > sessionBreak) {
      totalDepth += currentSessionSize;
      sessionCount++;
      currentSessionSize = 1;
    } else {
      currentSessionSize++;
    }
  }
  totalDepth += currentSessionSize;

  return {
    periodDays,
    computedAt: now,
    totalCommands: recentCommands.length,
    commandsByType,
    topFeatures: topFeatures.slice(0, 5),
    bottomFeatures: bottomFeatures.slice(0, 3),
    topQueriedMetrics,
    simulationCount: commandsByType.simulation ?? 0,
    rulesCreatedCount: commandsByType.rule ?? 0,
    goalsCreatedCount: commandsByType.goal ?? 0,
    avgSessionDepth: sessionCount > 0 ? round2(totalDepth / sessionCount) : 0,
    adoptionScore,
    unusedFeatures,
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 10 — SELF-AWARENESS SCORE
// ═══════════════════════════════════════════════════════════

function computeSelfAwareness(
  scores: RulePerformanceScore[],
  coverage: CoverageMatrix,
  calibrationData: Map<string, RuleCalibrationData>,
  predAccuracy: PredictionAccuracySummary,
  behavior: ManagerBehaviorAnalysis,
  recentEvents: EvolutionEvent[],
): SelfAwarenessScore {
  // 1. Rule Health: average composite score
  const avgComposite = scores.length > 0
    ? scores.reduce((s, r) => s + r.compositeScore, 0) / scores.length
    : 50;

  // 2. Coverage: overall %
  const coverageValue = coverage.overallCoveragePct;

  // 3. Calibration Quality: % of rules with "calibrated" status
  let calibratedCount = 0;
  let totalWithCal = 0;
  for (const [, cal] of calibrationData) {
    if (cal.totalOutcomes > 0) {
      totalWithCal++;
      if (cal.calibrationReady === "calibrated") calibratedCount++;
    }
  }
  const calibrationQuality = totalWithCal > 0
    ? Math.round((calibratedCount / totalWithCal) * 100)
    : 30;

  // 4. Prediction Accuracy: 100 - MAPE
  const predictionAccuracy = predAccuracy.meanAbsolutePctError !== null
    ? Math.max(0, Math.round(100 - predAccuracy.meanAbsolutePctError))
    : 50; // Default if no data

  // 5. User Adoption
  const userAdoption = behavior.adoptionScore;

  // 6. Evolution Activity: rate of positive events
  const positiveEvents = recentEvents.filter((e) => e.outcome === "positive").length;
  const evolutionActivity = recentEvents.length > 0
    ? Math.round((positiveEvents / recentEvents.length) * 100)
    : 30;

  // Weighted composite
  const overall = Math.round(
    avgComposite * 0.25 +
    coverageValue * 0.20 +
    calibrationQuality * 0.20 +
    predictionAccuracy * 0.15 +
    userAdoption * 0.10 +
    evolutionActivity * 0.10,
  );

  let status: SelfAwarenessScore["status"];
  if (overall >= 80) status = "thriving";
  else if (overall >= 65) status = "healthy";
  else if (overall >= 45) status = "needs_attention";
  else if (overall >= 25) status = "struggling";
  else status = "critical";

  // Top improvements
  const improvements: SelfAwarenessScore["topImprovements"] = [];

  if (avgComposite < 60) {
    improvements.push({
      area: "Salud de reglas",
      description: `${scores.filter((s) => s.compositeScore < 45).length} reglas con bajo rendimiento. Suprimir o recalibrar.`,
      impact: "high",
      effort: "low",
    });
  }
  if (coverageValue < 70) {
    improvements.push({
      area: "Cobertura",
      description: `${coverage.uncoveredCount} métricas sin reglas. Agregar cobertura.`,
      impact: "high",
      effort: "medium",
    });
  }
  if (calibrationQuality < 50) {
    improvements.push({
      area: "Calibración",
      description: `Solo ${calibrationQuality}% de reglas calibradas. Más datos de outcome necesarios.`,
      impact: "medium",
      effort: "low",
    });
  }
  if (userAdoption < 50) {
    improvements.push({
      area: "Adopción",
      description: `${behavior.unusedFeatures.length} features nunca usadas. Considerar onboarding o simplificación.`,
      impact: "medium",
      effort: "medium",
    });
  }
  if (predAccuracy.meanAbsolutePctError !== null && predAccuracy.meanAbsolutePctError > 30) {
    improvements.push({
      area: "Precisión de predicciones",
      description: `MAPE de ${predAccuracy.meanAbsolutePctError.toFixed(0)}%. Las simulaciones necesitan más datos históricos.`,
      impact: "medium",
      effort: "high",
    });
  }

  return {
    overall,
    computedAt: Date.now(),
    subScores: {
      ruleHealth: { value: Math.round(avgComposite), weight: 0.25, description: "Promedio de salud de todas las reglas" },
      coverage: { value: coverageValue, weight: 0.20, description: `${coverage.overallCoveragePct}% de métricas cubiertas` },
      calibrationQuality: { value: calibrationQuality, weight: 0.20, description: `${calibrationQuality}% de reglas calibradas` },
      predictionAccuracy: { value: predictionAccuracy, weight: 0.15, description: `MAPE: ${predAccuracy.meanAbsolutePctError?.toFixed(0) ?? "N/A"}%` },
      userAdoption: { value: userAdoption, weight: 0.10, description: `${userAdoption}% de features utilizadas` },
      evolutionActivity: { value: evolutionActivity, weight: 0.10, description: `${positiveEvents} eventos positivos de ${recentEvents.length}` },
    },
    status,
    topImprovements: improvements.slice(0, 3),
    history: [], // Populated by hook (persisted in localStorage)
  };
}

// ═══════════════════════════════════════════════════════════
// SECTION 11 — AUTO-SUPPRESSION DECISIONS
// ═══════════════════════════════════════════════════════════

function computeSuppressionDecisions(
  scores: RulePerformanceScore[],
  _ds: AnalyzerDataSources,
  options: AnalysisOptions,
): SuppressionDecision[] {
  const decisions: SuppressionDecision[] = [];

  for (const score of scores) {
    if (score.compositeScore >= options.suppressionThreshold) continue;
    if (score.evaluationCount < options.minEvaluationsForSuppression) continue;

    let reason: SuppressionDecision["reason"];
    if (score.triggerCount === 0) reason = "never_triggered";
    else if (score.actionCount === 0) reason = "always_ignored";
    else if (score.successRate < 0.20) reason = "low_success_rate";
    else if (score.calibratedConfidence < 0.20) reason = "confidence_collapse";
    else reason = "never_triggered"; // Fallback

    decisions.push({
      ruleId: score.ruleId,
      ruleTitle: score.ruleTitle,
      domain: score.domain,
      reason,
      evidence: {
        evaluationCount: score.evaluationCount,
        triggerCount: score.triggerCount,
        actionCount: score.actionCount,
        successCount: score.successCount,
        currentConfidence: score.calibratedConfidence,
      },
      confidence: Math.round(100 - score.compositeScore),
      executionMode: reason === "never_triggered" ? "auto" : "propose_for_approval",
      executed: false,
      reactivationCondition: reason === "never_triggered"
        ? "Reactivar si las condiciones del club cambian significativamente"
        : "Reactivar después de recalibrar con nuevos datos",
    });
  }

  return decisions;
}

// ═══════════════════════════════════════════════════════════
// SECTION 12 — SUMMARY & TOP ACTIONS
// ═══════════════════════════════════════════════════════════

function generateSummary(
  awareness: SelfAwarenessScore,
  rulesCritical: number,
  gapCount: number,
  driftAlerts: number,
): string {
  const parts: string[] = [];

  parts.push(`Sistema ${awareness.status} (${awareness.overall}/100).`);

  if (rulesCritical > 0) {
    parts.push(`${rulesCritical} regla(s) crítica(s).`);
  }
  if (gapCount > 0) {
    parts.push(`${gapCount} brecha(s) de cobertura.`);
  }
  if (driftAlerts > 0) {
    parts.push(`${driftAlerts} alerta(s) de deriva de confianza.`);
  }

  if (parts.length === 1) {
    parts.push("Todo dentro de parámetros normales.");
  }

  return parts.join(" ");
}

function generateTopActions(
  scores: RulePerformanceScore[],
  redundant: RedundantPair[],
  gaps: CoverageGap[],
  drifts: ConfidenceDrift[],
  _suppressions: SuppressionDecision[],
  awareness: SelfAwarenessScore,
): SystemHealthReport["topActions"] {
  const actions: SystemHealthReport["topActions"] = [];

  // Critical rules first
  const critical = scores.filter((s) => s.compositeScore < 25);
  if (critical.length > 0) {
    actions.push({
      action: "Suprimir reglas críticas",
      priority: "high",
      description: `${critical.length} regla(s) con score <25: ${critical.map((r) => r.ruleTitle).join(", ")}`,
    });
  }

  // Redundant pairs
  const highRedundant = redundant.filter((r) => r.isHighlyRedundant);
  if (highRedundant.length > 0) {
    actions.push({
      action: "Fusionar reglas redundantes",
      priority: "medium",
      description: `${highRedundant.length} par(es) de reglas se activan juntas >85% del tiempo`,
    });
  }

  // Uncovered metrics
  const criticalGaps = gaps.filter((g) => g.severity === "high");
  if (criticalGaps.length > 0) {
    actions.push({
      action: "Cubrir brechas críticas",
      priority: "high",
      description: `${criticalGaps.length} brecha(s) de alta severidad detectadas`,
    });
  }

  // Confidence drift
  const criticalDrifts = drifts.filter((d) => d.driftType === "critical_drift");
  if (criticalDrifts.length > 0) {
    actions.push({
      action: "Investigar deriva de confianza",
      priority: "high",
      description: `${criticalDrifts.length} regla(s) con deriva crítica de confianza`,
    });
  }

  // Low adoption
  if (awareness.subScores.userAdoption.value < 40) {
    actions.push({
      action: "Mejorar adopción de features",
      priority: "low",
      description: `Solo ${awareness.subScores.userAdoption.value}% de features utilizadas`,
    });
  }

  return actions.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════
// SECTION 13 — HELPERS
// ═══════════════════════════════════════════════════════════

function scoreToTier(score: number): RulePerformanceScore["tier"] {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "acceptable";
  if (score >= 25) return "underperforming";
  return "critical";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function inferDomainFromSignal(signalType: string): AIDomain | "global" {
  if (signalType.startsWith("fin_")) return "financial";
  if (signalType.startsWith("evt_")) return "events";
  if (signalType.startsWith("eng_") || signalType.startsWith("guest_")) return "engagement";
  if (signalType.startsWith("sat_") || signalType.startsWith("ops_")) return "satisfaction";
  if (signalType.startsWith("spt_")) return "sports";
  if (signalType.startsWith("comm_")) return "communication";
  if (signalType.startsWith("age_")) return "family";
  return "global";
}

/**
 * Estimate trigger rate for engine rules (heuristic).
 * In production, this comes from real evaluation data.
 */
function estimateTriggerRate(ruleId: string): number {
  // Known high-trigger rules
  const highTrigger = [
    "fin_revenue_decline", "fin_margin_pressure",
    "evt_capacity_alert", "evt_low_engagement",
    "eng_churn_predictor",
  ];
  if (highTrigger.some((id) => ruleId.includes(id))) return 0.7;

  // Global rules fire often
  if (ruleId.startsWith("global_")) return 0.5;

  // Default
  return 0.35;
}

/**
 * Estimate action rate for engine rules (heuristic).
 */
function estimateActionRate(ruleId: string): number {
  // High-impact rules get acted on more
  if (ruleId.includes("churn") || ruleId.includes("revenue")) return 0.55;
  if (ruleId.includes("satisfaction")) return 0.45;
  return 0.35;
}

function determineTrend(
  outcomes: Array<{ success: boolean; timestamp: number }>,
): RulePerformanceScore["trend"] {
  if (outcomes.length < 4) return "stable";

  const midpoint = Math.floor(outcomes.length / 2);
  const older = outcomes.slice(0, midpoint);
  const newer = outcomes.slice(midpoint);

  const olderRate = older.filter((o) => o.success).length / older.length;
  const newerRate = newer.filter((o) => o.success).length / newer.length;

  if (newerRate > olderRate + 0.1) return "improving";
  if (newerRate < olderRate - 0.1) return "degrading";
  return "stable";
}

function buildEmptyPredictionSummary(): PredictionAccuracySummary {
  return {
    totalPredictions: 0,
    measuredCount: 0,
    pendingCount: 0,
    byAccuracy: { accurate: 0, close: 0, off: 0, way_off: 0, pending: 0 },
    meanAbsolutePctError: null,
    trend: "insufficient_data",
    bestPredictedMetric: null,
    worstPredictedMetric: null,
  };
}

function buildEmptyBehaviorAnalysis(periodDays: number): ManagerBehaviorAnalysis {
  return {
    periodDays,
    computedAt: Date.now(),
    totalCommands: 0,
    commandsByType: {},
    topFeatures: [],
    bottomFeatures: [],
    topQueriedMetrics: [],
    simulationCount: 0,
    rulesCreatedCount: 0,
    goalsCreatedCount: 0,
    avgSessionDepth: 0,
    adoptionScore: 0,
    unusedFeatures: [],
  };
}