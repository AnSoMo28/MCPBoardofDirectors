// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Synthesis Engine (2027 NEW)
//
// Pure functions. No React. No side effects. Fully testable.
//
// Pipeline: Raw Data → Signal Detection → Correlation → Synthesis → Actions
//
// This is the cognitive core of the Recommendations domain.
// It takes 7 data sources and produces:
//   1. OpportunitySynthesis[] — cross-domain opportunities
//   2. ReasoningChain[] — AI inference paths (transparency)
//   3. AutonomousAction[] — ready-to-execute actions with dependency graph
//   4. CrossDomainSummary[] — lightweight signal summary for visualization
//
// Every output is derived from config predicates (Golden Rule).
// ═══════════════════════════════════════════════════════════════════════

import {
  type PricingOptimization,
  type ActivitySuggestion,
  type QuarterlyInsight,
  type Recommendation,
  type AttendancePrediction,
  type SchedulingConflict,
  type SocialCluster,
  type OpportunitySynthesis,
  type ReasoningChain,
  type ReasoningStep,
  type AutonomousAction,
  type ConflictResolution,
  RecommendationType,
  RecommendationPriority,
  ConflictSeverity,
  PricingStrategy,
  SuggestionStatus,
  ActionReadiness,
  ReasoningStepType,
  SignalSource,
  isHighPriority,
  isBlockingConflict,
  isUrgentConflict,
  isHighConfidence,
  isBlockingRisk,
  calculateOpportunityScore,
  classifyOpportunityLevel,
  RECOMMENDATION_TYPE_CONFIG,
  SIGNAL_SOURCE_CONFIG,
} from "../types";

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: INTERNAL TYPES — Signal Detection Layer
// ═══════════════════════════════════════════════════════════════════════

/** Detected signal from raw data — before correlation */
interface DetectedSignal {
  id: string;
  source: SignalSource;
  signalType: string;
  description: string;
  urgency: number;
  confidence: number;
  /** Related entity for cross-referencing */
  entityId: string;
  entityName: string;
  /** Tags for correlation matching */
  tags: string[];
}

/** Correlated finding — two or more signals that relate */
interface CorrelatedFinding {
  id: string;
  title: string;
  description: string;
  signals: DetectedSignal[];
  /** Which domains are involved */
  domains: SignalSource[];
  /** Correlation strength (0-100) */
  strength: number;
  /** Recommended action direction */
  actionDirection: string;
}

/** Data sources input for the synthesis pipeline */
export interface SynthesisInput {
  pricings: PricingOptimization[];
  suggestions: ActivitySuggestion[];
  insights: QuarterlyInsight[];
  recommendations: Recommendation[];
  predictions: AttendancePrediction[];
  conflicts: SchedulingConflict[];
  clusters: SocialCluster[];
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: SIGNAL DETECTION — Raw data → DetectedSignal[]
// ═══════════════════════════════════════════════════════════════════════

function detectPricingSignals(
  pricings: PricingOptimization[],
): DetectedSignal[] {
  return pricings
    .filter((p) => p.status === SuggestionStatus.Approved || p.status === SuggestionStatus.Proposed)
    .map((p) => {
      const revenueImpact = Math.abs(p.expected_revenue_change);
      const isHighImpact = revenueImpact > 5000;
      const isRiskBlocked = isBlockingRisk(p.risk_level);

      return {
        id: `pricing-${p.id}`,
        source: SignalSource.Finance,
        signalType: isHighImpact ? "high_impact_pricing" : "pricing_opportunity",
        description: isHighImpact
          ? `${p.service_name}: ${p.expected_revenue_change > 0 ? "+" : ""}$${revenueImpact.toLocaleString()} revenue ${isRiskBlocked ? "(risk-blocked)" : ""}`
          : `${p.service_name}: ${p.strategy} strategy adjustment available`,
        urgency: isHighImpact ? 70 : 30,
        confidence: isRiskBlocked ? 40 : 75,
        entityId: p.id,
        entityName: p.service_name,
        tags: [p.strategy, p.risk_level, isHighImpact ? "high_impact" : "standard"],
      };
    });
}

function detectConflictSignals(
  conflicts: SchedulingConflict[],
): DetectedSignal[] {
  return conflicts.map((c) => {
    const isBlocking = isBlockingConflict(c.severity);
    const isUrgent = isUrgentConflict(c.severity);

    return {
      id: `conflict-${c.id}`,
      source: SignalSource.Events,
      signalType: isBlocking ? "blocking_conflict" : "scheduling_tension",
      description: isBlocking
        ? `${c.event_a_name} ↔ ${c.event_b_name}: ${c.shared_resources.join(", ")} bloqueados`
        : `${c.event_a_name} ↔ ${c.event_b_name}: solapamiento ${c.conflict_type}`,
      urgency: isUrgent ? 90 : isBlocking ? 70 : 30,
      confidence: 90,
      entityId: c.id,
      entityName: `${c.event_a_name} ↔ ${c.event_b_name}`,
      tags: [c.severity, c.conflict_type, ...c.shared_resources],
    };
  });
}

function detectRecommendationSignals(
  recommendations: Recommendation[],
): DetectedSignal[] {
  return recommendations
    .filter((r) => isHighPriority(r.priority))
    .map((r) => {
      const typeConfig = RECOMMENDATION_TYPE_CONFIG[r.recommendation_type];
      return {
        id: `rec-${r.id}`,
        source: typeConfig?.signalSource ?? SignalSource.Internal,
        signalType: "urgent_recommendation",
        description: `${r.title}: ${r.reasoning.slice(0, 100)}`,
        urgency: r.priority === RecommendationPriority.Urgent ? 95 : 70,
        confidence: r.score,
        entityId: r.id,
        entityName: r.title,
        tags: [r.recommendation_type, r.priority, ...r.tags],
      };
    });
}

function detectPredictionSignals(
  predictions: AttendancePrediction[],
): DetectedSignal[] {
  return predictions.map((p) => {
    const isReliable = isHighConfidence(p.confidence);
    const deviation = Math.abs(p.predicted_attendance - p.similar_events_avg);
    const isAnomaly = deviation > p.similar_events_avg * 0.3;

    return {
      id: `pred-${p.id}`,
      source: SignalSource.Events,
      signalType: isAnomaly ? "attendance_anomaly" : "attendance_prediction",
      description: isAnomaly
        ? `${p.event_name}: ${p.predicted_attendance} predicted vs ${p.similar_events_avg} avg (${deviation > 0 ? "+" : ""}${Math.round(deviation)})`
        : `${p.event_name}: ${p.predicted_attendance} predicted (${p.confidence} confidence)`,
      urgency: isAnomaly ? 60 : 20,
      confidence: isReliable ? 85 : 45,
      entityId: p.id,
      entityName: p.event_name,
      tags: [p.confidence, isAnomaly ? "anomaly" : "normal"],
    };
  });
}

function detectClusterSignals(
  clusters: SocialCluster[],
): DetectedSignal[] {
  return clusters.map((c) => {
    const isFragmented = c.size < 5;
    const isHighEngagement = c.avg_engagement > 70;
    return {
      id: `cluster-${c.id}`,
      source: SignalSource.Families,
      signalType: isFragmented
        ? "fragment_cluster"
        : isHighEngagement
          ? "high_engagement_cluster"
          : "cluster_identified",
      description: isFragmented
        ? `${c.name}: fragmentado (${c.size} familias, engagement ${c.avg_engagement})`
        : `${c.name}: ${c.size} familias, ${c.shared_interests.slice(0, 3).join(", ")}`,
      urgency: isFragmented ? 40 : isHighEngagement ? 50 : 15,
      confidence: 70,
      entityId: c.id,
      entityName: c.name,
      tags: [c.cluster_type, isFragmented ? "fragmented" : "stable", ...c.shared_interests.slice(0, 3)],
    };
  });
}

/** Run all signal detectors — Stage 1 of pipeline */
function detectAllSignals(input: SynthesisInput): DetectedSignal[] {
  return [
    ...detectPricingSignals(input.pricings),
    ...detectConflictSignals(input.conflicts),
    ...detectRecommendationSignals(input.recommendations),
    ...detectPredictionSignals(input.predictions),
    ...detectClusterSignals(input.clusters),
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: CORRELATION — DetectedSignal[] → CorrelatedFinding[]
// ═══════════════════════════════════════════════════════════════════════

/** Find tag-based correlations between signals from different domains */
function correlateByTags(signals: DetectedSignal[]): CorrelatedFinding[] {
  const findings: CorrelatedFinding[] = [];
  const domainPairs = buildDomainPairIndex(signals);

  for (const [pairKey, pairSignals] of domainPairs) {
    if (pairSignals.length < 2) continue;

    // Find shared tags between signals from different domains
    const sharedTagGroups = findSharedTagGroups(pairSignals);
    for (const group of sharedTagGroups) {
      if (group.signals.length < 2) continue;

      const domains = [...new Set(group.signals.map((s) => s.source))];
      if (domains.length < 2) continue;

      findings.push({
        id: `corr-${pairKey}-${group.tag}`,
        title: `Correlación ${domains.map((d) => SIGNAL_SOURCE_CONFIG[d].label).join(" ↔ ")}`,
        description: `${group.signals.length} señales correlacionadas por "${group.tag}": ${group.signals.map((s) => s.entityName).join(", ")}`,
        signals: group.signals,
        domains,
        strength: Math.min(
          100,
          group.signals.reduce((sum, s) => sum + s.urgency, 0) / group.signals.length,
        ),
        actionDirection: deriveActionDirection(group.signals),
      });
    }
  }

  return findings;
}

/** Build index of signal pairs by domain combination */
function buildDomainPairIndex(
  signals: DetectedSignal[],
): Map<string, DetectedSignal[]> {
  const index = new Map<string, DetectedSignal[]>();
  for (const signal of signals) {
    index.set(signal.source, [...(index.get(signal.source) ?? []), signal]);
  }
  return index;
}

/** Find groups of signals that share tags */
function findSharedTagGroups(
  signals: DetectedSignal[],
): Array<{ tag: string; signals: DetectedSignal[] }> {
  const tagIndex = new Map<string, DetectedSignal[]>();
  for (const signal of signals) {
    for (const tag of signal.tags) {
      tagIndex.set(tag, [...(tagIndex.get(tag) ?? []), signal]);
    }
  }
  return [...tagIndex.entries()]
    .filter(([, sigs]) => sigs.length >= 2)
    .map(([tag, sigs]) => ({ tag, signals: sigs }));
}

/** Derive action direction from correlated signals */
function deriveActionDirection(signals: DetectedSignal[]): string {
  const hasBlocking = signals.some((s) => s.signalType === "blocking_conflict");
  const hasRevenue = signals.some((s) => s.signalType === "high_impact_pricing");
  const hasAnomaly = signals.some((s) => s.signalType === "attendance_anomaly");

  if (hasBlocking && hasRevenue) return "resolve_conflict_before_pricing_change";
  if (hasRevenue && hasAnomaly) return "validate_prediction_before_pricing";
  if (hasBlocking) return "prioritize_conflict_resolution";
  if (hasRevenue) return "evaluate_revenue_opportunity";
  return "monitor_and_analyze";
}

/** Explicit cross-domain correlation patterns — high-value known correlations */
function correlateKnownPatterns(
  input: SynthesisInput,
  signals: DetectedSignal[],
): CorrelatedFinding[] {
  const findings: CorrelatedFinding[] = [];

  // Pattern 1: Conflict + High-prediction event = Critical resolution needed
  const highPredEvents = input.predictions.filter(
    (p) => isHighConfidence(p.confidence) && p.predicted_attendance > p.similar_events_avg * 1.2,
  );
  const blockingConflicts = input.conflicts.filter(
    (c) => isBlockingConflict(c.severity),
  );
  if (highPredEvents.length > 0 && blockingConflicts.length > 0) {
    findings.push({
      id: "pattern-conflict-highpred",
      title: "Conflicto afecta evento de alta demanda",
      description: `${blockingConflicts.length} conflicto(s) bloqueando recursos que ${highPredEvents.length} evento(s) de alta asistencia necesitan`,
      signals: signals.filter(
        (s) =>
          s.signalType === "blocking_conflict" ||
          s.signalType === "attendance_anomaly",
      ),
      domains: [SignalSource.Events],
      strength: 85,
      actionDirection: "resolve_conflict_immediately",
    });
  }

  // Pattern 2: Pricing opportunity + Activity suggestion gap = Bundle opportunity
  const bundlePricings = input.pricings.filter(
    (p) =>
      p.strategy === PricingStrategy.Bundle &&
      p.expected_revenue_change > 0,
  );
  const highDemandSuggestions = input.suggestions.filter(
    (s) => (s.member_requests_count ?? 0) > 10 && s.status === SuggestionStatus.Proposed,
  );
  if (bundlePricings.length > 0 && highDemandSuggestions.length > 0) {
    findings.push({
      id: "pattern-pricing-suggestion",
      title: "Oportunidad de paquete: precios + nuevas actividades",
      description: `${bundlePricings.length} estrategia(s) de paquete disponibles + ${highDemandSuggestions.length} actividad(es) con alta demanda`,
      signals: signals.filter(
        (s) =>
          s.signalType === "high_impact_pricing" ||
          s.signalType === "pricing_opportunity",
      ),
      domains: [SignalSource.Finance, SignalSource.Internal],
      strength: 72,
      actionDirection: "propose_bundle_with_new_activity",
    });
  }

  // Pattern 3: Fragmented clusters + recommendations = Targeting opportunity
  const fragmentedClusters = input.clusters.filter((c) => c.size < 5);
  const familyRecs = input.recommendations.filter(
    (r) => r.recommendation_type === RecommendationType.Social,
  );
  if (fragmentedClusters.length > 2 && familyRecs.length > 0) {
    findings.push({
      id: "pattern-cluster-rec",
      title: "Fragmentación social: oportunidad de integración",
      description: `${fragmentedClusters.length} clusters fragmentados + ${familyRecs.length} recomendaciones sociales disponibles`,
      signals: signals.filter((s) => s.signalType === "fragment_cluster"),
      domains: [SignalSource.Families],
      strength: 60,
      actionDirection: "target_fragmented_clusters",
    });
  }

  // Pattern 4: Quarterly decline + pricing available = Satisfaction-revenue balance
  const latestInsight = input.insights
    .sort((a, b) => b.year - a.year)
    .find((i) => i.status !== SuggestionStatus.Rejected);
  if (
    latestInsight &&
    latestInsight.member_satisfaction_avg < 70 &&
    input.pricings.some((p) => p.expected_revenue_change > 0)
  ) {
    findings.push({
      id: "pattern-quarterly-pricing",
      title: "Satisfacción baja + oportunidad de revenue",
      description: `Satisfacción en ${latestInsight.member_satisfaction_avg}/100 — pricing changes podrían empeorar percepción`,
      signals: signals.filter((s) => s.source === SignalSource.Finance),
      domains: [SignalSource.Finance, SignalSource.Internal],
      strength: 65,
      actionDirection: "delay_pricing_until_satisfaction_improves",
    });
  }

  return findings;
}

/** Full correlation — Stage 2 of pipeline */
function correlateAll(
  input: SynthesisInput,
  signals: DetectedSignal[],
): CorrelatedFinding[] {
  return [
    ...correlateByTags(signals),
    ...correlateKnownPatterns(input, signals),
  ];
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: SYNTHESIS — CorrelatedFinding[] → OpportunitySynthesis[]
// ═══════════════════════════════════════════════════════════════════════

/** Build a reasoning chain from a correlated finding */
function buildReasoningChainFromFinding(
  finding: CorrelatedFinding,
): ReasoningChain {
  const steps: ReasoningStep[] = [];

  // Step 1: Data — what we observed
  for (const signal of finding.signals.slice(0, 3)) {
    steps.push({
      type: ReasoningStepType.Data,
      label: signal.entityName,
      description: signal.description,
      confidence: signal.confidence,
      source_domain: signal.source,
    });
  }

  // Step 2: Inference — what the correlation means
  steps.push({
    type: ReasoningStepType.Inference,
    label: finding.title,
    description: finding.description,
    confidence: finding.strength,
  });

  // Step 3: Action — what to do
  steps.push({
    type: ReasoningStepType.Action,
    label: actionDirectionToLabel(finding.actionDirection),
    description: `Basado en ${finding.signals.length} señales de ${finding.domains.length} dominio(s)`,
    confidence: finding.strength,
  });

  // Step 4: Outcome — expected result
  steps.push({
    type: ReasoningStepType.Outcome,
    label: "Impacto esperado",
    description: outcomeFromDirection(finding.actionDirection),
    confidence: Math.max(30, finding.strength - 15),
  });

  return {
    id: `chain-${finding.id}`,
    steps,
    overall_confidence: Math.round(
      steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length,
    ),
    summary: finding.description,
  };
}

function actionDirectionToLabel(direction: string): string {
  const map: Record<string, string> = {
    resolve_conflict_immediately: "Resolver conflicto de inmediato",
    resolve_conflict_before_pricing_change: "Resolver conflicto antes de cambiar precios",
    validate_prediction_before_pricing: "Validar predicción antes de ajustar precios",
    prioritize_conflict_resolution: "Priorizar resolución de conflictos",
    evaluate_revenue_opportunity: "Evaluar oportunidad de revenue",
    propose_bundle_with_new_activity: "Proponer paquete con nueva actividad",
    target_fragmented_clusters: "Segmentar clusters fragmentados",
    delay_pricing_until_satisfaction_improves: "Diferir pricing hasta mejorar satisfacción",
    monitor_and_analyze: "Monitorear y analizar",
  };
  return map[direction] ?? direction;
}

function outcomeFromDirection(direction: string): string {
  const map: Record<string, string> = {
    resolve_conflict_immediately: "Eliminación de bloqueo para evento de alta demanda",
    resolve_conflict_before_pricing_change: "Pricing change sin riesgo operativo",
    validate_prediction_before_pricing: "Decisión de pricing con datos verificados",
    prioritize_conflict_resolution: "Recursos liberados para eventos prioritarios",
    evaluate_revenue_opportunity: "Revenue incremental potencial identificado",
    propose_bundle_with_new_activity: "+$15K-25K revenue estimado en paquetes nuevos",
    target_fragmented_clusters: "+20% engagement en clusters fragmentados",
    delay_pricing_until_satisfaction_improves: "Protección de retención a largo plazo",
    monitor_and_analyze: "Visibilidad mejorada para decisiones futuras",
  };
  return map[direction] ?? "Impacto positivo esperado";
}

/** Synthesize opportunities — Stage 3 of pipeline */
function synthesizeFromCorrelations(
  findings: CorrelatedFinding[],
): OpportunitySynthesis[] {
  return findings
    .map((finding) => {
      const score = calculateOpportunityScore(
        finding.strength,
        Math.min(100, finding.signals.reduce((max, s) => Math.max(max, s.urgency), 0)),
        finding.domains.length * 25,
      );
      const level = classifyOpportunityLevel(score);
      const reasoningChain = buildReasoningChainFromFinding(finding);
      const suggestedActions = generateActionsForFinding(finding);

      return {
        id: `opp-${finding.id}`,
        title: finding.title,
        description: finding.description,
        level,
        score,
        source_domains: finding.domains,
        reasoning_chain: reasoningChain,
        suggested_actions: suggestedActions,
        window_expires_at: deriveWindowExpiry(finding),
        estimated_revenue_impact: estimateRevenueImpact(finding),
        estimated_member_impact: estimateMemberImpact(finding),
        synthesized_at: new Date().toISOString(),
      } satisfies OpportunitySynthesis;
    })
    .sort((a, b) => b.score - a.score);
}

/** Generate autonomous actions for a single finding */
function generateActionsForFinding(
  finding: CorrelatedFinding,
): AutonomousAction[] {
  const actions: AutonomousAction[] = [];
  const now = new Date().toISOString();

  // If conflict is involved, create resolution action
  const conflictSignals = finding.signals.filter(
    (s) => s.signalType === "blocking_conflict" || s.signalType === "scheduling_tension",
  );
  if (conflictSignals.length > 0) {
    actions.push({
      id: `act-conflict-${finding.id}`,
      title: "Resolver conflictos de calendario",
      description: `${conflictSignals.length} conflicto(s) detectado(s) — resolver antes de nuevas programaciones`,
      priority: isUrgentConflict(ConflictSeverity.High)
        ? RecommendationPriority.Urgent
        : RecommendationPriority.High,
      readiness: ActionReadiness.Ready,
      dependencies: [],
      estimated_impact: "Eliminación de bloqueos operativos",
      impact_score: 80,
      affected_domains: [SignalSource.Events],
      source_opportunity_id: `opp-${finding.id}`,
      created_at: now,
    });
  }

  // If revenue opportunity exists, create pricing action
  const pricingSignals = finding.signals.filter(
    (s) => s.signalType === "high_impact_pricing" || s.signalType === "pricing_opportunity",
  );
  if (pricingSignals.length > 0) {
    actions.push({
      id: `act-pricing-${finding.id}`,
      title: "Evaluar ajuste de precios",
      description: `${pricingSignals.length} oportunidad(es) de pricing con impacto en revenue`,
      priority: RecommendationPriority.High,
      readiness: conflictSignals.length > 0
        ? ActionReadiness.ConflictBlocked
        : ActionReadiness.AwaitingApproval,
      dependencies:
        conflictSignals.length > 0
          ? [`act-conflict-${finding.id}`]
          : [],
      approval_level: "elevated",
      estimated_impact: "Revenue incremental por optimización de precios",
      impact_score: 70,
      affected_domains: [SignalSource.Finance],
      source_opportunity_id: `opp-${finding.id}`,
      created_at: now,
    });
  }

  // If social fragmentation detected, create engagement action
  const clusterSignals = finding.signals.filter(
    (s) => s.signalType === "fragment_cluster",
  );
  if (clusterSignals.length > 0) {
    actions.push({
      id: `act-cluster-${finding.id}`,
      title: "Activar integración social",
      description: `${clusterSignals.length} cluster(es) fragmentado(s) — crear actividades integradoras`,
      priority: RecommendationPriority.Medium,
      readiness: ActionReadiness.Ready,
      dependencies: [],
      estimated_impact: "+20% engagement en segmentos fragmentados",
      impact_score: 55,
      affected_domains: [SignalSource.Families, SignalSource.Events],
      source_opportunity_id: `opp-${finding.id}`,
      created_at: now,
    });
  }

  return actions;
}

function deriveWindowExpiry(finding: CorrelatedFinding): string | undefined {
  const hasConflict = finding.signals.some(
    (s) => s.signalType === "blocking_conflict",
  );
  if (hasConflict) {
    // Conflicts expire in 48h
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 48);
    return expiry.toISOString();
  }
  // Non-conflict opportunities: 7 days
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry.toISOString();
}

function estimateRevenueImpact(finding: CorrelatedFinding): number | undefined {
  const pricingSignals = finding.signals.filter(
    (s) => s.source === SignalSource.Finance,
  );
  if (pricingSignals.length === 0) return undefined;
  // Estimate from urgency (urgency correlates with impact in pricing signals)
  return Math.round(
    pricingSignals.reduce((sum, s) => sum + s.urgency * 100, 0),
  );
}

function estimateMemberImpact(finding: CorrelatedFinding): number | undefined {
  const familySignals = finding.signals.filter(
    (s) => s.source === SignalSource.Families,
  );
  if (familySignals.length === 0) return undefined;
  // Estimate from signal count
  return familySignals.length * 8;
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: CROSS-DOMAIN SUMMARY — For Nexus visualization
// ═══════════════════════════════════════════════════════════════════════

export interface CrossDomainSummary {
  source: SignalSource;
  signalCount: number;
  topSignal: string;
  urgency: number;
}

function buildCrossDomainSummaries(
  signals: DetectedSignal[],
): CrossDomainSummary[] {
  const bySource = new Map<SignalSource, DetectedSignal[]>();
  for (const signal of signals) {
    bySource.set(signal.source, [
      ...(bySource.get(signal.source) ?? []),
      signal,
    ]);
  }

  return [...bySource.entries()].map(([source, sourceSignals]) => {
    const topSignal = sourceSignals.reduce((max, s) =>
      s.urgency > max.urgency ? s : max,
    );
    const avgUrgency = Math.round(
      sourceSignals.reduce((sum, s) => sum + s.urgency, 0) /
        sourceSignals.length,
    );

    return {
      source,
      signalCount: sourceSignals.length,
      topSignal: topSignal.description,
      urgency: avgUrgency,
    };
  }).sort((a, b) => b.urgency - a.urgency);
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: CONFLICT RESOLUTIONS — Decision tree generation
// ═══════════════════════════════════════════════════════════════════════

/** Generate resolution options for a scheduling conflict */
export function generateConflictResolutions(
  conflict: SchedulingConflict,
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = [];
  const isBlocking = isBlockingConflict(conflict.severity);

  // Option A: Reschedule event B
  resolutions.push({
    id: `res-${conflict.id}-a`,
    conflict_id: conflict.id,
    option_label: `Reprogramar ${conflict.event_b_name}`,
    description: `Mover ${conflict.event_b_name} fuera del horario de ${conflict.event_a_name}. Libera ${conflict.shared_resources.join(", ")}.`,
    feasibility_score: isBlocking ? 60 : 75,
    ai_recommended: isBlocking,
    tradeoffs: [
      `Posible reducción de asistencia en ${conflict.event_b_name}`,
      "Notificación a participantes requerida",
    ],
    satisfaction_impact: -10,
  });

  // Option B: Share resources
  resolutions.push({
    id: `res-${conflict.id}-b`,
    conflict_id: conflict.id,
    option_label: "Compartir recursos",
    description: `Ambos eventos comparten ${conflict.shared_resources.join(", ")} con turnos asignados.`,
    feasibility_score: conflict.shared_resources.length <= 2 ? 70 : 40,
    ai_recommended: !isBlocking && conflict.shared_resources.length <= 2,
    tradeoffs: [
      "Requiere coordinación logística adicional",
      "Posible calidad reducida para ambos eventos",
    ],
    satisfaction_impact: 5,
  });

  // Option C: Cancel lower-priority event
  if (isBlocking) {
    resolutions.push({
      id: `res-${conflict.id}-c`,
      conflict_id: conflict.id,
      option_label: `Cancelar ${conflict.event_b_name}`,
      description: `Cancelar ${conflict.event_b_name} para garantizar recursos completos para ${conflict.event_a_name}.`,
      feasibility_score: 90,
      ai_recommended: false,
      tradeoffs: [
        `Pérdida de asistencia esperada para ${conflict.event_b_name}`,
        "Posible insatisfacción de participantes",
      ],
      satisfaction_impact: -30,
    });
  }

  return resolutions.sort((a, b) => b.feasibility_score - a.feasibility_score);
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: PUBLIC API — Full Pipeline
// ═══════════════════════════════════════════════════════════════════════

/** Full synthesis pipeline — entry point */
export function runSynthesisPipeline(input: SynthesisInput): {
  opportunities: OpportunitySynthesis[];
  crossDomainSummaries: CrossDomainSummary[];
  totalSignals: number;
  totalCorrelations: number;
} {
  // Stage 1: Signal Detection
  const signals = detectAllSignals(input);

  // Stage 2: Correlation
  const correlations = correlateAll(input, signals);

  // Stage 3: Synthesis
  const opportunities = synthesizeFromCorrelations(correlations);

  // Stage 4: Cross-domain summary
  const crossDomainSummaries = buildCrossDomainSummaries(signals);

  return {
    opportunities,
    crossDomainSummaries,
    totalSignals: signals.length,
    totalCorrelations: correlations.length,
  };
}

/** Generate all autonomous actions from all opportunities */
export function generateAllAutonomousActions(
  opportunities: OpportunitySynthesis[],
): AutonomousAction[] {
  return opportunities
    .flatMap((opp) => opp.suggested_actions)
    .sort((a, b) => {
      // Sort by readiness (ready first), then by impact score
      const readinessOrder: Record<ActionReadiness, number> = {
        [ActionReadiness.Ready]: 0,
        [ActionReadiness.AwaitingApproval]: 1,
        [ActionReadiness.DataPending]: 2,
        [ActionReadiness.ConflictBlocked]: 3,
      };
      const readinessDiff =
        readinessOrder[a.readiness] - readinessOrder[b.readiness];
      if (readinessDiff !== 0) return readinessDiff;
      return b.impact_score - a.impact_score;
    });
}

/** Quick health check — is the synthesis pipeline producing meaningful output? */
export function assessSynthesisHealth(input: SynthesisInput): {
  score: number;
  label: "rich" | "moderate" | "sparse" | "empty";
  dataCoverage: number;
  signalStrength: number;
} {
  const signals = detectAllSignals(input);
  const totalSources = [
    input.pricings.length > 0,
    input.suggestions.length > 0,
    input.insights.length > 0,
    input.recommendations.length > 0,
    input.predictions.length > 0,
    input.conflicts.length > 0,
    input.clusters.length > 0,
  ].filter(Boolean).length;

  const dataCoverage = Math.round((totalSources / 7) * 100);
  const signalStrength =
    signals.length > 0
      ? Math.round(
          signals.reduce((sum, s) => sum + s.urgency, 0) / signals.length,
        )
      : 0;

  const score = Math.round(dataCoverage * 0.5 + signalStrength * 0.5);

  let label: "rich" | "moderate" | "sparse" | "empty";
  if (score >= 70) label = "rich";
  else if (score >= 45) label = "moderate";
  else if (score >= 20) label = "sparse";
  else label = "empty";

  return { score, label, dataCoverage, signalStrength };
}